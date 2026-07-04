from __future__ import annotations



import json

from typing import Any



from fastapi import WebSocket, WebSocketDisconnect



from app.auth import decode_token

from app.db import get_db, row_to_dict





class ConnectionManager:

    def __init__(self) -> None:

        self.active: dict[str, dict[str, WebSocket]] = {}



    async def connect(self, couple_id: str, user_id: str, websocket: WebSocket) -> None:

        await websocket.accept()

        bucket = self.active.setdefault(couple_id, {})

        old = bucket.get(user_id)

        if old is not None and old is not websocket:

            try:

                await old.close(code=4000, reason="replaced")

            except Exception:

                pass

        bucket[user_id] = websocket

        await self.broadcast_couple(

            couple_id,

            {"event": "presence", "data": {"user_id": user_id, "status": "online"}},

            exclude_user=user_id,

        )



    def disconnect(self, couple_id: str, user_id: str) -> None:

        if couple_id in self.active:

            self.active[couple_id].pop(user_id, None)

            if not self.active[couple_id]:

                del self.active[couple_id]



    async def broadcast_couple(

        self, couple_id: str, payload: dict[str, Any], exclude_user: str | None = None

    ) -> None:

        if couple_id not in self.active:

            return

        message = json.dumps(payload, ensure_ascii=False)

        dead: list[str] = []

        for uid, ws in list(self.active[couple_id].items()):

            if exclude_user and uid == exclude_user:

                continue

            try:

                await ws.send_text(message)

            except Exception:

                dead.append(uid)

        for uid in dead:

            self.disconnect(couple_id, uid)



    async def send_to_user(self, couple_id: str, user_id: str, payload: dict[str, Any]) -> None:

        ws = self.active.get(couple_id, {}).get(user_id)

        if ws:

            try:

                await ws.send_text(json.dumps(payload, ensure_ascii=False))

            except Exception:

                self.disconnect(couple_id, user_id)



    async def disconnect_user(self, couple_id: str, user_id: str) -> None:

        bucket = self.active.get(couple_id, {})

        ws = bucket.pop(user_id, None)

        if ws:

            try:

                await ws.close(code=4403, reason="left couple")

            except Exception:

                pass

        if couple_id in self.active and not self.active[couple_id]:

            del self.active[couple_id]



    async def _validate_session(self, user_id: str, couple_id: str) -> bool:

        with get_db() as conn:

            user = row_to_dict(conn.execute("SELECT couple_id FROM users WHERE id = ?", (user_id,)).fetchone())

            flag = conn.execute(

                "SELECT enabled FROM feature_flags WHERE key = ?", ("chat_enabled",)

            ).fetchone()

        if flag is not None and not flag["enabled"]:

            return False

        if not user or user.get("couple_id") != couple_id:

            return False

        return True



    async def handle(self, websocket: WebSocket, token: str) -> None:

        try:

            user_id = decode_token(token)

        except Exception:

            await websocket.close(code=4401, reason="unauthorized")

            return

        with get_db() as conn:

            user = row_to_dict(conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone())

            flag = conn.execute(

                "SELECT enabled FROM feature_flags WHERE key = ?", ("chat_enabled",)

            ).fetchone()

        if flag is not None and not flag["enabled"]:

            await websocket.close(code=4403, reason="chat disabled")

            return

        if not user or not user.get("couple_id"):

            await websocket.close(code=4403)

            return



        couple_id = user["couple_id"]

        await self.connect(couple_id, user_id, websocket)

        try:

            while True:

                raw = await websocket.receive_text()

                try:

                    msg = json.loads(raw)

                except json.JSONDecodeError:

                    continue

                event = msg.get("event")

                if event == "typing":

                    if not await self._validate_session(user_id, couple_id):

                        await websocket.close(code=4403, reason="membership changed")

                        break

                    await self.broadcast_couple(

                        couple_id,

                        {"event": "typing", "data": {"user_id": user_id, "typing": msg.get("typing", True)}},

                        exclude_user=user_id,

                    )

                elif event == "ping":

                    if not await self._validate_session(user_id, couple_id):

                        await websocket.close(code=4403, reason="membership changed")

                        break

                    await websocket.send_text(json.dumps({"event": "pong"}))

        except WebSocketDisconnect:

            self.disconnect(couple_id, user_id)

            await self.broadcast_couple(

                couple_id,

                {"event": "presence", "data": {"user_id": user_id, "status": "offline"}},

            )

manager = ConnectionManager()
