import json
from pathlib import Path
import tempfile
from datetime import datetime

from app.ai_agent.app.utils.write_file import write_file
from app.ai_agent.app.utils.db import insert_generated_project  # ⬅️ thêm import


async def generate_react_project(instruction: str) -> str:
    print("[DEBUG] Generating React project with instruction:", instruction)
    """
    Tạo project React dựa trên yêu cầu user,
    nhờ OpenAI sinh nội dung file và ghi ra thư mục:
    <temp>/react_project/react_project_<YYYYMMDD_HHMMSS_mmm>/
    """

    prompt = f"""
Bạn là một generator code React.
Hãy tạo một project React hoàn chỉnh dựa trên yêu cầu sau:
"{instruction}"

Yêu cầu:
- Trả về JSON, dạng:
[
  {{"path": "package.json", "content": "..." }},
  {{"path": "src/App.jsx", "content": "..." }},
  {{"path": "src/main.jsx", "content": "..." }},
  ...
]
- Mỗi file phải có content code đầy đủ.
- Không giải thích gì thêm.
"""

    from openai import OpenAI
    client = OpenAI()

    response = client.responses.create(
        model="gpt-4.1",
        input=prompt,
        temperature=0
    )

    try:
        files = json.loads(response.output_text)
    except Exception as e:
        return f"Lỗi parse JSON từ OpenAI: {e}"

    # 1) Tạo container folder + subfolder theo timestamp (ms)
    base_dir = Path(tempfile.gettempdir()) / "react_project"
    base_dir.mkdir(exist_ok=True)

    now = datetime.now()
    timestamp = now.strftime("%Y%m%d_%H%M%S") + f"_{int(now.microsecond/1000):03d}"
    project_dir = base_dir / f"react_project_{timestamp}"
    project_dir.mkdir(parents=True, exist_ok=True)

    # 2) (tuỳ chọn) lấy tên project từ package.json trước khi ghi
    project_name = None
    for f in files:
        if f.get("path") == "package.json":
            try:
                pkg = json.loads(f.get("content", "{}"))
                if isinstance(pkg, dict) and isinstance(pkg.get("name"), str):
                    project_name = pkg["name"].strip() or None
            except Exception:
                pass

    # 3) Ghi từng file vào subfolder
    for file in files:
        path = project_dir / file["path"]
        path.parent.mkdir(parents=True, exist_ok=True)
        await write_file(path=str(path), content=file["content"])

    # 4) Insert DB sau khi ghi xong
    final_name = project_name or project_dir.name
    record_id = await insert_generated_project(
        name=final_name,
        resource_path=str(project_dir),
        created_by="agent",
    )

    return (
        f"React project generated at {project_dir} with {len(files)} files. "
        f"DB record id={record_id}"
    )
