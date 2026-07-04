from __future__ import annotations

import base64
import json
import random
import re
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import httpx
from fastapi import APIRouter, Depends, File, Header, HTTPException, Query, UploadFile

from app.auth import decode_token, get_current_user
from app.config import settings
from app.db import get_db, local_today, new_id, row_to_dict, utcnow
from app.feature_flags import is_feature_enabled, require_feature
from app.services.ai_agent import generate_couple_ai_reply
from app.schemas import ChatMessageCreate, ChatReaction
from app.ws import manager

router = APIRouter(
    prefix="/api/chat",
    tags=["chat"],
    dependencies=[Depends(require_feature("chat_enabled"))],
)

UPLOAD_DIR = Path(settings.db_path).parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_IMAGE_EXT = frozenset({"jpg", "jpeg", "png", "webp", "gif"})
AI_ALIASES = ("@ai", "@AI", "@果冻")
ALLOWED_REACTIONS = frozenset({"❤️", "👍", "😂", "😮", "😢", "🎉"})
AI_TYPING_LINES = [
    "果冻正在噼里啪啦码字中",
    "果冻正在翻你们账本找梗",
    "果冻正在冲浪归来组织语言",
    "果冻正在一本正经地胡说八道",
    "果冻正在抱着计算器蹦迪",
]


def _parse_read_by(raw: str | None) -> list[str]:
    try:
        return json.loads(raw or "[]")
    except json.JSONDecodeError:
        return []


def _serialize_message(row: dict, sender_nickname: str | None = None) -> dict[str, Any]:
    read_by = _parse_read_by(row.get("read_by"))
    recalled = row.get("recalled_at")
    content = row["content"] if not recalled else "[消息已撤回]"
    kind = row.get("sender_kind") or "user"
    extra = None
    if row.get("extra_json"):
        try:
            extra = json.loads(row["extra_json"])
        except json.JSONDecodeError:
            extra = None
    return {
        "id": row["id"],
        "couple_id": row["couple_id"],
        "sender_id": row["sender_id"],
        "sender_nickname": row.get("sender_label") or sender_nickname,
        "sender_kind": kind,
        "sender_avatar_url": None if kind == "ai" else row.get("sender_avatar_url"),
        "content": content,
        "message_type": row["message_type"],
        "image_url": row.get("image_url"),
        "read_by": read_by,
        "recalled_at": recalled,
        "created_at": row["created_at"],
        "is_recalled": bool(recalled),
        "ai_citation": extra.get("citation") if extra else None,
        "reply_to": extra.get("reply_to") if extra else None,
        "reactions": extra.get("reactions") if extra and isinstance(extra.get("reactions"), dict) else {},
    }


def _is_ai_mention(content: str) -> bool:
    text = content.strip()
    return any(text.startswith(alias) for alias in AI_ALIASES)


def _extract_ai_prompt(content: str) -> str:
    text = content.strip()
    for alias in AI_ALIASES:
        if text.startswith(alias):
            return text[len(alias):].strip(" ：:，,")
    return text


def _insert_message(
    conn,
    *,
    couple_id: str,
    sender_id: str,
    content: str,
    message_type: str,
    sender_kind: str = "user",
    sender_label: str | None = None,
    image_url: str | None = None,
    extra_json: str | None = None,
) -> dict[str, Any]:
    msg_id = new_id()
    now = utcnow()
    conn.execute(
        """
        INSERT INTO chat_messages
        (id, couple_id, sender_id, content, message_type, created_at, read_by, image_url, sender_kind, sender_label, extra_json)
        VALUES (?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, ?)
        """,
        (msg_id, couple_id, sender_id, content, message_type, now, image_url, sender_kind, sender_label, extra_json),
    )
    return row_to_dict(conn.execute("SELECT * FROM chat_messages WHERE id = ?", (msg_id,)).fetchone())


@router.get("/messages")
def list_messages(
    limit: int = Query(50, ge=1, le=100),
    before_id: str | None = Query(None, description="Load messages older than this message id"),
    current_user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    if not current_user.get("couple_id"):
        return {"items": [], "has_more": False}

    couple_id = current_user["couple_id"]
    with get_db() as conn:
        before_clause = ""
        params: list[Any] = [couple_id]
        if before_id:
            anchor = conn.execute(
                "SELECT created_at, rowid FROM chat_messages WHERE id = ? AND couple_id = ?",
                (before_id, couple_id),
            ).fetchone()
            if anchor:
                before_clause = " AND (m.created_at < ? OR (m.created_at = ? AND m.rowid < ?))"
                params.extend([anchor["created_at"], anchor["created_at"], anchor["rowid"]])
        params.append(limit + 1)
        rows = conn.execute(
            f"""
            SELECT * FROM (
                SELECT m.*, u.nickname AS sender_nickname, u.avatar_url AS sender_avatar_url, m.rowid AS _rid
                FROM chat_messages m
                LEFT JOIN users u ON u.id = m.sender_id
                WHERE m.couple_id = ?{before_clause}
                ORDER BY m.created_at DESC, m.rowid DESC
                LIMIT ?
            ) ORDER BY created_at ASC, _rid ASC
            """,
            params,
        ).fetchall()

    has_more = len(rows) > limit
    if has_more:
        rows = rows[1:]  # ASC order: drop oldest extra row
    items = [_serialize_message(row_to_dict(r), r["sender_nickname"] or "已注销用户") for r in rows]
    return {"items": items, "has_more": has_more}


@router.get("/unread-count")
def unread_count(current_user: dict = Depends(get_current_user)) -> dict[str, int]:
    if not current_user.get("couple_id"):
        return {"count": 0}
    uid = current_user["id"]
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT read_by FROM chat_messages
            WHERE couple_id = ?
              AND NOT (sender_id = ? AND COALESCE(sender_kind, 'user') = 'user')
            """,
            (current_user["couple_id"], uid),
        ).fetchall()
    count = sum(1 for r in rows if uid not in _parse_read_by(r["read_by"]))
    return {"count": count}


@router.post("/messages", status_code=201)
async def send_message(
    body: ChatMessageCreate,
    current_user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    if not current_user.get("couple_id"):
        raise HTTPException(status_code=400, detail="Couple pairing required")

    content = body.content.strip()
    if body.message_type == "emoji" and not re.match(r"^[\U0001F300-\U0001FAFF\u2600-\u27BF]+$", content):
        pass  # allow any short emoji string

    extra_json = None
    with get_db() as conn:
        if body.reply_to_id:
            orig = conn.execute(
                """
                SELECT cm.*, u.nickname AS sender_nickname
                FROM chat_messages cm
                LEFT JOIN users u ON u.id = cm.sender_id
                WHERE cm.id = ? AND cm.couple_id = ? AND cm.recalled_at IS NULL
                """,
                (body.reply_to_id, current_user["couple_id"]),
            ).fetchone()
            if orig:
                orig_d = row_to_dict(orig)
                kind = orig_d.get("sender_kind") or "user"
                sender = orig_d.get("sender_label") or orig_d.get("sender_nickname") or ("果冻" if kind == "ai" else "对方")
                snippet = (orig_d.get("content") or "[图片]")[:120]
                extra_json = json.dumps({
                    "reply_to": {
                        "id": orig_d["id"],
                        "content": snippet,
                        "sender": sender,
                        "sender_kind": kind,
                    },
                })
        row = _insert_message(
            conn,
            couple_id=current_user["couple_id"],
            sender_id=current_user["id"],
            content=content,
            message_type=body.message_type,
            extra_json=extra_json,
        )
        row["sender_avatar_url"] = current_user.get("avatar_url")

    msg = _serialize_message(row, current_user["nickname"])
    await manager.broadcast_couple(current_user["couple_id"], {"event": "chat_message", "data": msg})

    ai_reply_msg = None
    if body.message_type == "text" and _is_ai_mention(content):
        prompt = _extract_ai_prompt(content)
        if prompt:
            if not is_feature_enabled("ai_enabled"):
                ai_off = "果冻暂时下线维护中，稍后再 @我 吧～"
                with get_db() as conn:
                    ai_row = _insert_message(
                        conn,
                        couple_id=current_user["couple_id"],
                        sender_id=current_user["id"],
                        content=ai_off,
                        message_type="text",
                        sender_kind="ai",
                        sender_label="果冻",
                    )
                ai_reply_msg = _serialize_message(ai_row, "果冻")
                await manager.broadcast_couple(current_user["couple_id"], {"event": "chat_message", "data": ai_reply_msg})
                msg["ai_reply"] = ai_reply_msg
                return msg
            await manager.broadcast_couple(
                current_user["couple_id"],
                {
                    "event": "ai_typing",
                    "data": {"typing": True, "label": random.choice(AI_TYPING_LINES)},
                },
            )
            try:
                ai_scope = body.scope
                if ai_scope == "couple" and not current_user.get("couple_id"):
                    ai_scope = "personal"
                ai_result = await generate_couple_ai_reply(current_user, prompt, ai_scope)
                ai_text = ai_result["reply"] or "果冻刚刚大脑宕机了一秒，你再戳我一下。"
                ai_extra = json.dumps({"citation": ai_result.get("citation")}, ensure_ascii=False)
            except Exception:
                ai_text = "果冻刚刚冲浪冲掉线了，等我缓一下再回来。"
                ai_extra = None

            try:
                with get_db() as conn:
                    ai_row = _insert_message(
                        conn,
                        couple_id=current_user["couple_id"],
                        sender_id=current_user["id"],
                        content=ai_text,
                        message_type="text",
                        sender_kind="ai",
                        sender_label="果冻",
                        extra_json=ai_extra,
                    )
                    ai_row["sender_avatar_url"] = None
                ai_reply_msg = _serialize_message(ai_row, "果冻")
            finally:
                await manager.broadcast_couple(
                    current_user["couple_id"],
                    {"event": "ai_typing", "data": {"typing": False, "label": ""}},
                )
            if ai_reply_msg:
                await manager.broadcast_couple(
                    current_user["couple_id"],
                    {"event": "chat_message", "data": ai_reply_msg},
                )
        else:
            hint = "嘿～想让我查什么？试试：@果冻 本月花了多少"
            with get_db() as conn:
                ai_row = _insert_message(
                    conn,
                    couple_id=current_user["couple_id"],
                    sender_id=current_user["id"],
                    content=hint,
                    message_type="text",
                    sender_kind="ai",
                    sender_label="果冻",
                )
            ai_reply_msg = _serialize_message(ai_row, "果冻")
            await manager.broadcast_couple(
                current_user["couple_id"],
                {"event": "chat_message", "data": ai_reply_msg},
            )
            await manager.broadcast_couple(
                current_user["couple_id"],
                {"event": "ai_typing", "data": {"typing": False, "label": ""}},
            )

    if ai_reply_msg:
        msg["ai_reply"] = ai_reply_msg
    return msg


@router.post("/upload-image", status_code=201)
async def upload_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    if not current_user.get("couple_id"):
        raise HTTPException(status_code=400, detail="Couple pairing required")

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files allowed")

    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 5MB)")

    ext = (file.filename or "img.jpg").rsplit(".", 1)[-1].lower()[:4]
    if ext not in ALLOWED_IMAGE_EXT:
        ext = "jpg"
    fname = f"{new_id()}.{ext}"
    path = UPLOAD_DIR / fname
    path.write_bytes(data)

    image_url = f"/api/chat/uploads/{fname}"
    with get_db() as conn:
        row = _insert_message(
            conn,
            couple_id=current_user["couple_id"],
            sender_id=current_user["id"],
            content=file.filename or "image",
            message_type="image",
            image_url=image_url,
        )
        row["sender_avatar_url"] = current_user.get("avatar_url")

    msg = _serialize_message(row, current_user["nickname"])
    await manager.broadcast_couple(current_user["couple_id"], {"event": "chat_message", "data": msg})
    return msg


@router.get("/uploads/{filename}")
def serve_upload(
    filename: str,
    token: str | None = Query(None),
    authorization: str | None = Header(None, alias="Authorization"),
):
    from fastapi.responses import FileResponse

    raw_token = token
    if not raw_token and authorization and authorization.lower().startswith("bearer "):
        raw_token = authorization[7:].strip()
    if not raw_token:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        user_id = decode_token(raw_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    safe_name = Path(filename).name
    path = UPLOAD_DIR / safe_name
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="Not found")

    with get_db() as conn:
        msg = conn.execute(
            "SELECT couple_id FROM chat_messages WHERE image_url LIKE ? LIMIT 1",
            (f"%/{safe_name}",),
        ).fetchone()
        if not msg:
            raise HTTPException(status_code=404, detail="Not found")
        user = conn.execute("SELECT couple_id FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user or user["couple_id"] != msg["couple_id"]:
            raise HTTPException(status_code=403, detail="Forbidden")

    return FileResponse(path)


@router.post("/messages/{msg_id}/read")
async def mark_read(msg_id: str, current_user: dict = Depends(get_current_user)) -> dict[str, Any]:
    if not current_user.get("couple_id"):
        raise HTTPException(status_code=400, detail="Couple pairing required")

    with get_db() as conn:
        row = row_to_dict(conn.execute("SELECT * FROM chat_messages WHERE id = ?", (msg_id,)).fetchone())
        if not row or row["couple_id"] != current_user["couple_id"]:
            raise HTTPException(status_code=404, detail="Message not found")

        read_by = _parse_read_by(row.get("read_by"))
        if current_user["id"] not in read_by:
            read_by.append(current_user["id"])
            conn.execute("UPDATE chat_messages SET read_by = ? WHERE id = ?", (json.dumps(read_by), msg_id))

    await manager.broadcast_couple(
        current_user["couple_id"],
        {"event": "message_read", "data": {"message_id": msg_id, "user_id": current_user["id"]}},
    )
    return {"message_id": msg_id, "read_by": read_by}


@router.post("/messages/read-all")
async def mark_all_read(current_user: dict = Depends(get_current_user)) -> dict[str, int]:
    if not current_user.get("couple_id"):
        return {"updated": 0}

    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT id, read_by FROM chat_messages
            WHERE couple_id = ?
              AND NOT (sender_id = ? AND COALESCE(sender_kind, 'user') = 'user')
            """,
            (current_user["couple_id"], current_user["id"]),
        ).fetchall()
        pending: list[tuple[str, str]] = []
        for r in rows:
            read_by = _parse_read_by(r["read_by"])
            if current_user["id"] not in read_by:
                read_by.append(current_user["id"])
                pending.append((json.dumps(read_by), r["id"]))
        if pending:
            conn.executemany("UPDATE chat_messages SET read_by = ? WHERE id = ?", pending)
        updated = len(pending)

    if updated:
        await manager.broadcast_couple(
            current_user["couple_id"],
            {"event": "messages_read_all", "data": {"user_id": current_user["id"]}},
        )
    return {"updated": updated}


@router.post("/messages/{msg_id}/react")
async def react_message(
    msg_id: str,
    body: ChatReaction,
    current_user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    if not current_user.get("couple_id"):
        raise HTTPException(status_code=400, detail="Couple pairing required")

    emoji = body.emoji.strip()
    if emoji not in ALLOWED_REACTIONS:
        raise HTTPException(status_code=400, detail="Reaction not allowed")

    with get_db() as conn:
        row = row_to_dict(conn.execute("SELECT * FROM chat_messages WHERE id = ?", (msg_id,)).fetchone())
        if not row or row["couple_id"] != current_user["couple_id"]:
            raise HTTPException(status_code=404, detail="Message not found")
        if row.get("recalled_at"):
            raise HTTPException(status_code=400, detail="Cannot react to recalled message")

        extra: dict[str, Any] = {}
        if row.get("extra_json"):
            try:
                extra = json.loads(row["extra_json"])
            except json.JSONDecodeError:
                extra = {}

        reactions: dict[str, list[str]] = dict(extra.get("reactions") or {})
        users = list(reactions.get(emoji) or [])
        uid = current_user["id"]
        if uid in users:
            users.remove(uid)
            if users:
                reactions[emoji] = users
            else:
                reactions.pop(emoji, None)
        else:
            reactions[emoji] = users + [uid]
        extra["reactions"] = reactions
        conn.execute(
            "UPDATE chat_messages SET extra_json = ? WHERE id = ?",
            (json.dumps(extra, ensure_ascii=False), msg_id),
        )

    payload = {"message_id": msg_id, "reactions": reactions}
    await manager.broadcast_couple(
        current_user["couple_id"],
        {"event": "message_reacted", "data": payload},
    )
    return payload


@router.post("/messages/{msg_id}/recall")
async def recall_message(msg_id: str, current_user: dict = Depends(get_current_user)) -> dict[str, Any]:
    if not current_user.get("couple_id"):
        raise HTTPException(status_code=400, detail="Couple pairing required")

    with get_db() as conn:
        row = row_to_dict(conn.execute("SELECT * FROM chat_messages WHERE id = ?", (msg_id,)).fetchone())
        if not row or row["couple_id"] != current_user["couple_id"]:
            raise HTTPException(status_code=404, detail="Message not found")
        if (row.get("sender_kind") or "user") != "user":
            raise HTTPException(status_code=400, detail="AI messages cannot be recalled")
        if row["sender_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Can only recall own messages")

        created = datetime.fromisoformat(row["created_at"].replace("Z", "+00:00"))
        if datetime.now(timezone.utc) - created.astimezone(timezone.utc) > timedelta(minutes=2):
            raise HTTPException(status_code=400, detail="Recall window expired (2 min)")

        now = utcnow()
        conn.execute("UPDATE chat_messages SET recalled_at = ? WHERE id = ?", (now, msg_id))

    await manager.broadcast_couple(
        current_user["couple_id"],
        {"event": "message_recalled", "data": {"message_id": msg_id}},
    )
    return {"message_id": msg_id, "recalled_at": now}
