# app/api/routers/chat_controller.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import sys
import os


from app.ai_agent.app.graph import run_agent  # noqa: E402

router = APIRouter()


@router.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            try:
                reply = await run_agent(data)  # LangGraph agent (async)
            except Exception as ex:
                print("[ERROR]", ex)
                # Không đóng socket, trả thông báo thân thiện
                reply = "Không thể xử lý request lúc này. Vui lòng thử lại."
            await websocket.send_text(reply)
    except WebSocketDisconnect:
        print("Client disconnected")
