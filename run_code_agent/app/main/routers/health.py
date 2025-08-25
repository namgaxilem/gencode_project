# app/main/routers/health.py
from __future__ import annotations
from fastapi import APIRouter
from ..config import WORKSPACE_ROOT, WATCH_ENABLED, MAX_READ_BYTES, MAX_WRITE_BYTES

router = APIRouter()

@router.get("/healthz")
async def health():
    return {
        "ok": True,
        "workspace_root": str(WORKSPACE_ROOT),
        "watch_enabled": WATCH_ENABLED,
        "limits": {"read": MAX_READ_BYTES, "write": MAX_WRITE_BYTES},
    }
