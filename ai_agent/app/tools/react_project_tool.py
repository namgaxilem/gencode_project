# tools/react_project_tool.py
import os
import tempfile
import json
from server import mcp
from openai import OpenAI

client = OpenAI()

@mcp.tool("create_react_project")
def create_react_project(instruction: str) -> str:
    """
    Tạo React project theo yêu cầu bằng OpenAI và lưu vào thư mục tạm.
    """
    # 1. Prompt yêu cầu OpenAI trả về JSON với file + content
    prompt = f"""
    Bạn là một AI code generator. Hãy tạo project React theo yêu cầu:
    {instruction}

    Hãy trả về dưới dạng JSON:
    {{
      "files": [
        {{"path": "public/index.html", "content": "<html>...</html>"}},
        {{"path": "src/App.jsx", "content": "export default function App() {{...}}"}}
      ]
    }}
    """

    response = client.responses.create(
        model="gpt-4.1",
        input=prompt,
        temperature=0
    )

    # 2. Parse JSON
    text_output = response.output_text
    project_data = json.loads(text_output)

    # 3. Tạo thư mục tạm và ghi file
    base_dir = tempfile.mkdtemp(prefix="react_project_")
    for file_info in project_data["files"]:
        file_path = os.path.join(base_dir, file_info["path"])
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(file_info["content"])

    return base_dir
