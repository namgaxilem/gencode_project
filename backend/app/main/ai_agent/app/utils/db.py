"""
Agent DB util: dùng lại SQLAlchemy engine/session của backend.
Vị trí file: backend/app/ai_agent/app/utils/db.py
"""

from __future__ import annotations

import asyncio
from typing import Optional

# Dùng lại cấu hình ORM của backend
from app.db.database import SessionLocal  # sessionmaker đã gắn engine & pool
from app.models.generated_project import GeneratedProject

# (Tuỳ chọn) session dùng chung cho agent để tái sử dụng kết nối
AGENT_DB_SESSION = None  # type: Optional[object]


def init_agent_db() -> None:
    """
    Khởi tạo 1 session dùng chung cho agent (nếu bạn muốn reuse).
    Gọi 1 lần khi khởi chạy agent (ví dụ ở node init hoặc app startup).
    """
    global AGENT_DB_SESSION
    if AGENT_DB_SESSION is None:
        AGENT_DB_SESSION = SessionLocal()


def close_agent_db() -> None:
    """
    Đóng session dùng chung khi tắt agent.
    """
    global AGENT_DB_SESSION
    if AGENT_DB_SESSION is not None:
        try:
            AGENT_DB_SESSION.close()
        finally:
            AGENT_DB_SESSION = None


# =============== Core sync (chạy trong thread) ===============
def _insert_generated_project_sync(
    *,
    name: str,
    resource_path: str,
    created_by: Optional[str] = None,
    updated_by: Optional[str] = None,
) -> int:
    """
    Tạo 1 bản ghi GeneratedProject và trả về id.
    Nếu đã gọi init_agent_db() thì tái dùng session đó, ngược lại tạo session tạm.
    """
    global AGENT_DB_SESSION
    session = AGENT_DB_SESSION or SessionLocal()
    is_temp = AGENT_DB_SESSION is None

    try:
        obj = GeneratedProject(
            name=name,
            resource_path=resource_path,
            created_by=created_by,
            updated_by=updated_by,
        )
        session.add(obj)
        session.commit()
        session.refresh(obj)
        return obj.id
    except Exception:
        session.rollback()
        raise
    finally:
        if is_temp:
            session.close()


# =============== Async wrapper (không block event loop) ===============
async def insert_generated_project(
    *,
    name: str,
    resource_path: str,
    created_by: Optional[str] = None,
    updated_by: Optional[str] = None,
) -> int:
    return await asyncio.to_thread(
        _insert_generated_project_sync,
        name=name,
        resource_path=resource_path,
        created_by=created_by,
        updated_by=updated_by,
    )
