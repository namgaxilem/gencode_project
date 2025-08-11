import os
from app.ai_agent.app.utils.db import insert_generated_project


async def write_file(path: str, content: str) -> str:
    """
    Ghi nội dung vào file. Tự động tạo thư mục nếu chưa tồn tại.
    Sau khi ghi thành công, insert vào DB với project_name là tên folder cha cuối cùng.

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

        # Lấy tên thư mục cha cuối cùng làm project name
        project_dir = os.path.basename(os.path.dirname(path))

        # Insert vào DB
        await insert_generated_project(
            name=project_dir,
            resource_path=os.path.dirname(path),
            created_by="agent"
        )

        return f"File created at: {path} (DB record for project '{project_dir}' inserted)"
    except Exception as e:
        return f"Error writing file {path}: {str(e)}"
