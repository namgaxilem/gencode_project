from __future__ import annotations
from datetime import datetime
from pydantic import BaseModel

class GeneratedProjectOut(BaseModel):
    id: int
    name: str
    resource_path: str
    created_at: datetime | None = None
    updated_at: datetime | None = None
    created_by: str | None = None
    updated_by: str | None = None

    class Config:
        orm_mode = True