from fastapi import WebSocket
from typing import Dict, List

class NotificationManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        
    async def broadcast(self, message: dict, user_ids: List[str]):
        for user_id in user_ids:
            if user_id in self.active_connections:
                for connection in self.active_connections[user_id]:
                    await connection.send_json(message) 