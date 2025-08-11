from __future__ import annotations
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.generated_project import GeneratedProject
from app.schemas.generated_project import GeneratedProjectOut

import os
import tempfile
import zipfile
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/api/projects", response_model=List[GeneratedProjectOut])
def list_projects(
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    q: Optional[str] = Query(
        None, description="Search by name or resource_path"),
):
    query = db.query(GeneratedProject)
    if q:
        like = f"%{q}%"
        query = query.filter(
            (GeneratedProject.name.ilike(like)) |
            (GeneratedProject.resource_path.ilike(like))
        )
    items = (query
             .order_by(GeneratedProject.created_at.desc().nullslast())
             .offset(offset)
             .limit(limit)
             .all())
    return items


def _is_subpath(child: Path, parent: Path) -> bool:
    child_r = child.resolve()
    parent_r = parent.resolve()
    try:
        return child_r.is_relative_to(parent_r)  # py>=3.9
    except Exception:
        return str(child_r).startswith(str(parent_r) + os.sep) or child_r == parent_r


def _find_project_root(start: Path, max_up: int = 5) -> Path:
    """
    Leo lên tối đa max_up cấp để tìm thư mục có package.json.
    Nếu không thấy, trả lại start.
    """
    cur = start
    for _ in range(max_up + 1):
        if (cur / "package.json").exists():
            return cur
        if cur.parent == cur:
            break
        cur = cur.parent
    return start


@router.get("/api/projects/{project_id}/download")
def download_project_zip(
    project_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    use_root: bool = Query(
        True, description="Tự tìm thư mục gốc có package.json để zip"),
):
    # 1) Lấy record
    obj: Optional[GeneratedProject] = db.get(GeneratedProject, project_id)
    if not obj:
        logger.warning("Download 404: project_id=%s not found", project_id)
        raise HTTPException(status_code=404, detail="Project not found")

    resource_path = Path(obj.resource_path)
    if use_root:
        resource_path = _find_project_root(resource_path)

    if not resource_path.exists():
        logger.warning(
            "Download 404: path does not exist %s (id=%s)", resource_path, project_id)
        raise HTTPException(
            status_code=404, detail=f"Resource path not found: {resource_path}")
    if not resource_path.is_dir():
        logger.warning("Download 404: path is not dir %s (id=%s)",
                       resource_path, project_id)
        raise HTTPException(
            status_code=404, detail=f"Resource path is not a directory: {resource_path}")

    # 2) (Khuyến nghị) Giới hạn vùng cho phép nén
    projects_base_env = os.getenv("PROJECTS_BASE_DIR")
    if projects_base_env:
        projects_base = Path(projects_base_env).resolve()
    else:
        # Mặc định: thư mục temp (nếu bạn đang generate vào %TEMP%\react_project\...)
        projects_base = Path(tempfile.gettempdir()).resolve()

    if not _is_subpath(resource_path, projects_base):
        logger.warning("Download 403: %s outside %s",
                       resource_path, projects_base)
        raise HTTPException(
            status_code=403, detail="Path is outside allowed directory")

    # 3) Tạo zip tạm
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
    tmp_zip_path = Path(tmp.name)
    tmp.close()

    # 4) Ghi zip: bao gồm tên folder gốc trong zip
    with zipfile.ZipFile(tmp_zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for root, _, files in os.walk(resource_path):
            for fname in files:
                fpath = Path(root) / fname
                arcname = Path(resource_path.name) / \
                    fpath.relative_to(resource_path)
                zf.write(fpath, arcname)

    # 5) Trả file + xóa sau khi gửi xong
    def _cleanup(p: str):
        try:
            os.remove(p)
        except OSError:
            pass

    background_tasks.add_task(_cleanup, str(tmp_zip_path))
    filename = f"{resource_path.name}.zip"
    logger.info("Download OK: id=%s -> %s", project_id, filename)
    return FileResponse(
        path=str(tmp_zip_path),
        media_type="application/zip",
        filename=filename,
        background=background_tasks,
    )
