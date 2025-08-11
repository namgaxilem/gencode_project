import os
from langchain_mcp_adapters.client import MultiServerMCPClient
import json

def write_file(path: str, content: str) -> str:
    """
    Ghi nội dung vào file. Tự động tạo thư mục nếu chưa tồn tại.

    Args:
        path: Đường dẫn file (tuyệt đối hoặc tương đối)
        content: Nội dung cần ghi vào file

    Returns:
        Thông báo kết quả hoặc lỗi
    """
    try:
        # Tạo thư mục nếu chưa có
        os.makedirs(os.path.dirname(path), exist_ok=True)

        # Ghi nội dung vào file
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)

        return f"File created at: {path}"
    except Exception as e:
        return f"Error writing file {path}: {str(e)}"

async def generate_react_project(instruction: str) -> str:
    print("[DEBUG] Generating React project with instruction:", instruction)
    """
    Tạo project React dựa trên yêu cầu user,
    nhờ OpenAI sinh nội dung file và dùng MCP tool write_file để ghi ra.
    """
    # 1. Tạo prompt yêu cầu OpenAI trả về JSON file structure + content
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

    # 2. Gọi OpenAI
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

    # 4. Ghi từng file ra (ở thư mục temp)
    from pathlib import Path
    import tempfile
    temp_dir = Path(tempfile.gettempdir()) / "react_project"
    temp_dir.mkdir(exist_ok=True)

    for file in files:
        path = temp_dir / file["path"]
        path.parent.mkdir(parents=True, exist_ok=True)

        write_file(path=str(path), content=file["content"])

    return f"React project generated at {temp_dir} with {len(files)} files."