# app/main/utils/paths.py
from __future__ import annotations
import re
from pathlib import Path
from fastapi import HTTPException

SAFE_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-@]")  # allow @

def email_to_folder(email: str) -> str:
    e = (email or "").strip()
    e = "".join(ch for ch in e if SAFE_EMAIL_RE.match(ch))
    e = e.replace("..", ".").strip(".")
    if not e:
        e = "user"
    e = e.replace("/", "_").replace("\\", "_")
    return e[:128]

def safe_join(root: Path, rel: str | None) -> Path:
    rel = (rel or "").lstrip("/\\")
    p = (root / rel).resolve()
    if not str(p).startswith(str(root)):
        raise HTTPException(status_code=400, detail="E_PATH_TRAVERSAL")
    if p.is_symlink():
        raise HTTPException(status_code=400, detail="E_SYMLINK_FORBIDDEN")
    return p

def require_init(sess) -> None:
    from ..config import WORKSPACE_ROOT
    if not sess.email or sess.cwd == WORKSPACE_ROOT:
        raise HTTPException(status_code=400, detail="E_NOT_INIT")

def find_free_port(start=5100, end=5999) -> int:
    import socket
    for p in range(start, end):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                s.bind(("127.0.0.1", p))
                return p
            except OSError:
                continue
    raise RuntimeError("No free port in range 5100-5999")
