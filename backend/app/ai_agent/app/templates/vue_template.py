import json
from pathlib import Path
import tempfile
from datetime import datetime

from app.ai_agent.app.utils.write_file import write_file
from app.ai_agent.app.utils.db import insert_generated_project


def _timestamp():
    now = datetime.now()
    return now.strftime("%Y%m%d_%H%M%S") + f"_{int(now.microsecond/1000):03d}"


async def generate_vue_project(instruction: str) -> str:
    """
    Sinh project Vue, ghi vào:
    <temp>/vue_project/vue_project_<YYYYMMDD_HHMMSS_mmm>/
    """
    prompt = f"""
Bạn là một generator code Vue 3 + Vite.
Hãy tạo một project Vue hoàn chỉnh dựa trên yêu cầu sau:
"{instruction}"

Yêu cầu:
- Trả về JSON, dạng mảng các file:
[
  {{"path": "package.json", "content": "..." }},
  {{"path": "index.html", "content": "..." }},
  {{"path": "vite.config.js", "content": "..." }},
  {{"path": "src/main.js", "content": "..." }},
  {{"path": "src/App.vue", "content": "..." }}
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

    base_dir = Path(tempfile.gettempdir()) / "vue_project"
    base_dir.mkdir(exist_ok=True)
    project_dir = base_dir / f"vue_project_{_timestamp()}"
    project_dir.mkdir(parents=True, exist_ok=True)

    # lấy tên từ package.json nếu có
    project_name = None
    for f in files:
        if f.get("path") == "package.json":
            try:
                pkg = json.loads(f.get("content", "{}"))
                name = pkg.get("name")
                if isinstance(name, str) and name.strip():
                    project_name = name.strip()
            except Exception:
                pass

    for f in files:
        path = project_dir / f["path"]
        path.parent.mkdir(parents=True, exist_ok=True)
        await write_file(path=str(path), content=f["content"])

    final_name = project_name or project_dir.name
    record_id = await insert_generated_project(
        name=final_name,
        resource_path=str(project_dir),
        created_by="agent"
    )

    return f"Vue project generated at {project_dir} with {len(files)} files. DB record id={record_id}"
