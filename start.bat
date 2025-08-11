@echo off
setlocal enabledelayedexpansion

echo === Step 1: Install backend requirements ===
python -m pip install -r backend\requirements.txt

echo === Step 2: Install frontend packages ===
pushd frontend
call npm install
popd

echo === Step 3: Start FastAPI backend ===
start "backend" cmd /k "cd /d backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

echo === Step 4: Start frontend dev server ===
start "frontend" cmd /k "cd /d frontend && npm run dev"

echo === All services started. ===
pause
