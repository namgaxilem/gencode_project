from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# Đường dẫn file SQLite
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "app.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

# Kết nối engine
# connect_args={"check_same_thread": False} bắt buộc cho SQLite dùng nhiều thread
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)

# Tạo SessionLocal để query
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class cho models
Base = declarative_base()
