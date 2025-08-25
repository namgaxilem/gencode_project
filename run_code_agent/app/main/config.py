# app/main/config.py
from __future__ import annotations
import os
from pathlib import Path

WORKSPACE_ROOT = Path(os.getenv("WORKSPACE_ROOT", "/tmp/workspaces")).resolve()
WORKSPACE_ROOT.mkdir(parents=True, exist_ok=True)

# Command to start a user's dev server
DEV_CMD = os.getenv("DEV_CMD") or "npm install && npm run dev"

DEFAULT_EXCLUDES = {".git", "node_modules", ".next", "dist", "build", "__pycache__"}

# I/O limits (bytes)
MAX_READ_BYTES = int(os.getenv("MAX_READ_BYTES", "1048576"))   # 1 MiB
MAX_WRITE_BYTES = int(os.getenv("MAX_WRITE_BYTES", "2097152")) # 2 MiB

# Optional: filesystem watcher (watchfiles)
WATCH_ENABLED = True
try:
    from watchfiles import awatch, Change  # type: ignore  # noqa:F401
except Exception:
    WATCH_ENABLED = False

DEFAULT_CLONE_URL = os.getenv(
    "DEFAULT_CLONE_URL",
    "https://github.com/namgaxilem/wedding-car.git",
)