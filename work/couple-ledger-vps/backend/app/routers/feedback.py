from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse

from app.auth import decode_token, get_current_user, require_admin
from app.config import settings
from app.db import get_db, new_id, row_to_dict, utcnow
from app.schemas import FeedbackBulkStatus, FeedbackReply

router = APIRouter(prefix="/api/feedback", tags=["feedback"])

UPLOAD_DIR = Path(settings.db_path).parent / "feedback_uploads"
ALLOWED_IMAGE_EXT = {"jpg", "jpeg", "png", "gif", "webp"}


def _serialize(row: dict[str, Any], include_user: bool = False) -> dict[str, Any]:
    out = {
        "id": row["id"],
        "user_id": row["user_id"],
        "category": row["category"],
        "content": row["content"],
        "status": row["status"],
        "admin_reply": row.get("admin_reply"),
        "screenshot_url": row.get("screenshot_url"),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }
    if include_user and row.get("nickname"):
        out["user_nickname"] = row["nickname"]
        out["user_email"] = row["email"]
    return out


async def _save_screenshot(file: UploadFile) -> str:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="截图仅支持图片格式")
    data = await file.read()
    if len(data) > 3 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="截图不能超过 3MB")
    ext = (file.filename or "shot.jpg").rsplit(".", 1)[-1].lower()[:4]
    if ext not in ALLOWED_IMAGE_EXT:
        ext = "jpg"
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    fname = f"{new_id()}.{ext}"
    (UPLOAD_DIR / fname).write_bytes(data)
    return f"/api/feedback/screenshots/{fname}"


@router.post("", status_code=status.HTTP_201_CREATED)
async def submit(
    category: str = Form(default="general"),
    content: str = Form(...),
    screenshot: UploadFile | None = File(None),
    current_user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    text = content.strip()
    if len(text) < 1:
        raise HTTPException(status_code=400, detail="反馈内容不能为空")
    if len(text) > 2000:
        raise HTTPException(status_code=400, detail="反馈内容过长")

    with get_db() as conn:
        flag = conn.execute("SELECT enabled FROM feature_flags WHERE key = 'feedback_enabled'").fetchone()
        if flag and not flag["enabled"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Feedback is disabled")

    screenshot_url = None
    if screenshot and screenshot.filename:
        screenshot_url = await _save_screenshot(screenshot)

    ticket_id = new_id()
    now = utcnow()
    with get_db() as conn:
        conn.execute(
            """INSERT INTO feedback (id, user_id, category, content, status, admin_reply, screenshot_url, created_at, updated_at)
               VALUES (?, ?, ?, ?, 'open', NULL, ?, ?, ?)""",
            (ticket_id, current_user["id"], category.strip(), text, screenshot_url, now, now),
        )
        row = row_to_dict(conn.execute("SELECT * FROM feedback WHERE id = ?", (ticket_id,)).fetchone())
    return _serialize(row)


@router.get("/screenshots/{filename}")
def serve_screenshot(
    filename: str,
    token: str | None = Query(None),
    authorization: str | None = Header(None, alias="Authorization"),
):
    if ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    raw_token = token
    if not raw_token and authorization and authorization.lower().startswith("bearer "):
        raw_token = authorization[7:].strip()
    if not raw_token:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        user_id = decode_token(raw_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    path = UPLOAD_DIR / filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Not found")

    url_suffix = f"/api/feedback/screenshots/{filename}"
    with get_db() as conn:
        row = conn.execute(
            "SELECT user_id FROM feedback WHERE screenshot_url LIKE ? LIMIT 1",
            (f"%{url_suffix}",),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Not found")
        user = row_to_dict(conn.execute("SELECT is_admin FROM users WHERE id = ?", (user_id,)).fetchone())
        is_admin = bool(user and user.get("is_admin"))
        if not is_admin and row["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Forbidden")

    return FileResponse(path)


@router.get("/mine")
def my_feedback(current_user: dict = Depends(get_current_user)) -> list[dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM feedback WHERE user_id = ? ORDER BY created_at DESC",
            (current_user["id"],),
        ).fetchall()
    return [_serialize(row_to_dict(r)) for r in rows]


@router.get("")
def list_all(status_filter: str | None = None, _: dict = Depends(require_admin)) -> list[dict[str, Any]]:
    query = """
        SELECT f.*, u.nickname, u.email
        FROM feedback f
        JOIN users u ON u.id = f.user_id
    """
    params: list[Any] = []
    if status_filter:
        query += " WHERE f.status = ?"
        params.append(status_filter)
    query += " ORDER BY f.created_at DESC"

    with get_db() as conn:
        rows = conn.execute(query, params).fetchall()
    return [_serialize(row_to_dict(r), include_user=True) for r in rows]


@router.patch("/bulk-status")
def bulk_status(body: FeedbackBulkStatus, _: dict = Depends(require_admin)) -> dict[str, Any]:
    now = utcnow()
    with get_db() as conn:
        updated = 0
        for ticket_id in body.ids:
            existing = conn.execute("SELECT id FROM feedback WHERE id = ?", (ticket_id,)).fetchone()
            if not existing:
                continue
            conn.execute(
                "UPDATE feedback SET status = ?, updated_at = ? WHERE id = ?",
                (body.status, now, ticket_id),
            )
            updated += 1
    return {"updated": updated}


@router.put("/{ticket_id}")
def reply(ticket_id: str, body: FeedbackReply, _: dict = Depends(require_admin)) -> dict[str, Any]:
    now = utcnow()
    with get_db() as conn:
        existing = row_to_dict(conn.execute("SELECT * FROM feedback WHERE id = ?", (ticket_id,)).fetchone())
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

        conn.execute(
            "UPDATE feedback SET status = ?, admin_reply = ?, updated_at = ? WHERE id = ?",
            (body.status, body.admin_reply.strip(), now, ticket_id),
        )
        row = row_to_dict(conn.execute("SELECT * FROM feedback WHERE id = ?", (ticket_id,)).fetchone())
    return _serialize(row)
