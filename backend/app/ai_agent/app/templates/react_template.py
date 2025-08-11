import json
from pathlib import Path
import tempfile
from datetime import datetime

from app.ai_agent.app.utils.write_file import write_file


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

    # 4) Tạo container folder + subfolder theo timestamp (ms)
    base_dir = Path(tempfile.gettempdir()) / "react_project"
    base_dir.mkdir(exist_ok=True)

    now = datetime.now()
    timestamp = now.strftime("%Y%m%d_%H%M%S") + f"_{int(now.microsecond/1000):03d}"
    project_dir = base_dir / f"react_project_{timestamp}"
    project_dir.mkdir(parents=True, exist_ok=True)

    # Ghi từng file vào subfolder
    for file in files:
        path = project_dir / file["path"]
        path.parent.mkdir(parents=True, exist_ok=True)

        # Nếu write_file là async -> dùng await; nếu là sync -> bỏ await
        await write_file(path=str(path), content=file["content"])

    return f"React project generated at {project_dir} with {len(files)} files."
