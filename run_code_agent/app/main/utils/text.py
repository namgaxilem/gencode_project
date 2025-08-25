# app/main/utils/text.py
from __future__ import annotations

def looks_text(data: bytes) -> bool:
    if b"\x00" in data:
        return False
    if not data:
        return True
    ctrl = sum(b < 9 or (13 < b < 32) for b in data)
    return (ctrl / len(data)) < 0.05
