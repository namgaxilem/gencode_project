from typing import Any
import httpx

import os
from server import mcp


@mcp.tool("write_file")
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
