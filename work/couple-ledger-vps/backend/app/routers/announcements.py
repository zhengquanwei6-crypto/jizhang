from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.auth import get_current_user, require_admin
from app.config import settings
from app.db import get_db, new_id, row_to_dict, utcnow
from app.schemas import AnnouncementAiDraftRequest, AnnouncementCreate, AnnouncementUpdate

router = APIRouter(prefix="/api/announcements", tags=["announcements"])

MAX_ACTIVE = 5


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _serialize(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "title": row["title"],
        "content": row["content"],
        "is_active": bool(row["is_active"]),
        "priority": row["priority"],
        "starts_at": row.get("starts_at"),
        "ends_at": row.get("ends_at"),
        "display_mode": row.get("display_mode") or "once",
        "closable": bool(row.get("closable", 1)),
        "created_at": row["created_at"],
    }


def _is_visible(row: dict[str, Any], now: str) -> bool:
    if not row.get("is_active"):
        return False
    if row.get("starts_at") and row["starts_at"] > now:
        return False
    if row.get("ends_at") and row["ends_at"] < now:
        return False
    return True


@router.get("/active")
def list_active() -> list[dict[str, Any]]:
    now = _now_iso()
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM announcements WHERE is_active = 1 ORDER BY priority DESC, created_at DESC LIMIT ?",
            (MAX_ACTIVE,),
        ).fetchall()
    items = [_serialize(row_to_dict(r)) for r in rows]
    return [a for a in items if _is_visible(a, now)]


@router.get("")
def list_all(_: dict = Depends(require_admin)) -> list[dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM announcements ORDER BY priority DESC, created_at DESC").fetchall()
    return [_serialize(row_to_dict(r)) for r in rows]


@router.post("/ai-draft")
async def ai_draft(body: AnnouncementAiDraftRequest, _: dict = Depends(require_admin)) -> dict[str, str]:
    tone_map = {"warm": "温暖亲切", "formal": "正式简洁", "playful": "轻松活泼"}
    html_hint = "可使用 <a href> 链接和 <strong> 强调。" if body.include_html else "纯文本，不要 HTML。"
    system = (
        "你是情侣记账 App 的运营文案助手。根据主题生成公告标题和正文。"
        f"语气：{tone_map[body.tone]}。{html_hint}"
        '返回 JSON: {"title":"...", "content":"..."}'
    )
    if not settings.openai_api_key:
        return {
            "title": body.topic[:40],
            "content": f"<p>亲爱的用户，{body.topic}。感谢使用情侣记账！</p>",
        }
    payload = {
        "model": settings.openai_model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": body.topic},
        ],
        "temperature": 0.6,
        "response_format": {"type": "json_object"},
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{settings.openai_base_url.rstrip('/')}/chat/completions",
            headers={"Authorization": f"Bearer {settings.openai_api_key}", "Content-Type": "application/json"},
            json=payload,
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="AI service unavailable")
    raw = resp.json()["choices"][0]["message"]["content"]
    try:
        data = json.loads(raw)
        return {"title": str(data.get("title", body.topic))[:120], "content": str(data.get("content", ""))[:4000]}
    except json.JSONDecodeError:
        return {"title": body.topic[:40], "content": raw[:4000]}


@router.post("", status_code=status.HTTP_201_CREATED)
def create(body: AnnouncementCreate, _: dict = Depends(require_admin)) -> dict[str, Any]:
    ann_id = new_id()
    now = utcnow()
    with get_db() as conn:
        active_count = conn.execute("SELECT COUNT(*) AS c FROM announcements WHERE is_active = 1").fetchone()["c"]
        if body.is_active and active_count >= MAX_ACTIVE:
            raise HTTPException(status_code=400, detail=f"最多同时上线 {MAX_ACTIVE} 条公告")
        conn.execute(
            """INSERT INTO announcements
               (id, title, content, is_active, priority, starts_at, ends_at, display_mode, closable, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                ann_id,
                body.title.strip(),
                body.content.strip(),
                int(body.is_active),
                body.priority,
                body.starts_at,
                body.ends_at,
                body.display_mode,
                int(body.closable),
                now,
            ),
        )
        row = row_to_dict(conn.execute("SELECT * FROM announcements WHERE id = ?", (ann_id,)).fetchone())
    return _serialize(row)


@router.put("/{announcement_id}")
def update(announcement_id: str, body: AnnouncementUpdate, _: dict = Depends(require_admin)) -> dict[str, Any]:
    with get_db() as conn:
        existing = row_to_dict(conn.execute("SELECT * FROM announcements WHERE id = ?", (announcement_id,)).fetchone())
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")

        if body.is_active is True and not existing.get("is_active"):
            active_count = conn.execute(
                "SELECT COUNT(*) AS c FROM announcements WHERE is_active = 1 AND id != ?",
                (announcement_id,),
            ).fetchone()["c"]
            if active_count >= MAX_ACTIVE:
                raise HTTPException(status_code=400, detail=f"最多同时上线 {MAX_ACTIVE} 条公告")

        fields: list[str] = []
        values: list[Any] = []
        for key, val in body.model_dump(exclude_unset=True).items():
            if key in ("is_active", "closable"):
                fields.append(f"{key} = ?")
                values.append(int(val))
            elif isinstance(val, str):
                fields.append(f"{key} = ?")
                values.append(val.strip())
            else:
                fields.append(f"{key} = ?")
                values.append(val)

        if fields:
            values.append(announcement_id)
            conn.execute(f"UPDATE announcements SET {', '.join(fields)} WHERE id = ?", values)

        row = row_to_dict(conn.execute("SELECT * FROM announcements WHERE id = ?", (announcement_id,)).fetchone())
    return _serialize(row)


@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def delete(announcement_id: str, _: dict = Depends(require_admin)) -> Response:
    with get_db() as conn:
        cur = conn.execute("DELETE FROM announcements WHERE id = ?", (announcement_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
