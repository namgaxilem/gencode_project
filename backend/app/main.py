# main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import asyncio

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from ai_agent.app.graph import run_agent

app = FastAPI()

@app.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            try:
                # Call LangGraph agent (async)
                reply = await run_agent(data)
            except Exception as e:
                # Don't close the socket; return a friendly error
                # (Log e if you want)
                reply = "Không thể xử lý request lúc này. Vui lòng thử lại."

            # Send response back to client
            await websocket.send_text(reply)

    except WebSocketDisconnect:
        print("Client disconnected")
