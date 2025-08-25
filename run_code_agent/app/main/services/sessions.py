# app/main/services/sessions.py
from __future__ import annotations
from . import _singleton

# simple module-level singleton of Sessions
from ..models.session import Sessions

SESSIONS = _singleton.get("sessions", Sessions())
