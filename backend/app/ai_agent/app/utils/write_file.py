import os

async def write_file(path: str, content: str) -> str:
    """
    Ghi nội dung vào file. Tự động tạo thư mục nếu chưa tồn tại.
    (ĐÃ BỎ logic insert DB)
    """
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return f"File created at: {path}"
    except Exception as e:
        return f"Error writing file {path}: {str(e)}"