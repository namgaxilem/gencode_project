@echo off
REM Run FastAPI with auto-reload
uvicorn app.main.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir app
pause