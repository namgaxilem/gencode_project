# app/main/models/ws_protocol.py
from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel

class WSBase(BaseModel):
    type: str
    req_id: Optional[str] = None

class InitReq(WSBase):
    type: Literal["init"]
    email: str

class ListTreeReq(WSBase):
    type: Literal["list_tree"]
    path: Optional[str] = ""
    max_depth: int = 2

class ReadFileReq(WSBase):
    type: Literal["read_file"]
    path: str

class WriteFileReq(WSBase):
    type: Literal["write_file"]
    path: str
    content: str
    create_if_missing: bool = True

class ChatReq(WSBase):
    type: Literal["chat"]
    message: str

class StartDevReq(WSBase):
    type: Literal["start_dev"]

class StopDevReq(WSBase):
    type: Literal["stop_dev"]

class SetCwdReq(WSBase):
    type: Literal["set_cwd"]
    cwd: str  # relative to WORKSPACE_ROOT

AllowedReq = InitReq | ListTreeReq | ReadFileReq | WriteFileReq | ChatReq | StartDevReq | StopDevReq | SetCwdReq
