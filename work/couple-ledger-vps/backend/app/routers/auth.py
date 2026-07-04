from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status

from app.auth import (
    create_access_token,
    create_refresh_token,
    get_current_user,
    hash_password,
    issue_tokens,
    public_user,
    revoke_refresh_token,
    revoke_session_by_id,
    verify_password,
    verify_refresh_token,
)
from app.config import settings
from app.db import get_db, new_id, row_to_dict, utcnow
from app.email_util import send_email
from app.schemas import (
    DeleteAccountRequest,
    ForgotPasswordRequest,
    LoginRequest,
    ProfileUpdate,
    RefreshTokenRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

AVATAR_DIR = Path(settings.db_path).parent / "avatars"
AVATAR_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/register", response_model=TokenResponse)
def register(body: RegisterRequest) -> dict[str, Any]:
    with get_db() as conn:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (body.email.lower(),)).fetchone()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

        user_id = new_id()
        now = utcnow()
        conn.execute(
            "INSERT INTO users (id, email, password_hash, nickname, avatar_url, couple_id, created_at) VALUES (?, ?, ?, ?, NULL, NULL, ?)",
            (user_id, body.email.lower(), hash_password(body.password), body.nickname.strip(), now),
        )
        user = row_to_dict(conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone())

    return issue_tokens(user, "Web")


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest) -> dict[str, Any]:
    with get_db() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (body.email.lower(),)).fetchone()
    user = row_to_dict(row)
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    return issue_tokens(user, body.device_name)


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(body: RefreshTokenRequest) -> dict[str, Any]:
    session = verify_refresh_token(body.refresh_token)
    revoke_refresh_token(body.refresh_token)
    with get_db() as conn:
        user = row_to_dict(conn.execute("SELECT * FROM users WHERE id = ?", (session["user_id"],)).fetchone())
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return issue_tokens(user, session.get("device_name"))


@router.get("/sessions")
def list_sessions(current_user: dict = Depends(get_current_user)) -> list[dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, device_name, created_at, expires_at FROM refresh_tokens WHERE user_id = ? ORDER BY created_at DESC",
            (current_user["id"],),
        ).fetchall()
    return [dict(r) for r in rows]


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def revoke_session(session_id: str, current_user: dict = Depends(get_current_user)) -> Response:
    revoke_session_by_id(session_id, current_user["id"])
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordRequest) -> dict[str, str]:
    token = secrets.token_urlsafe(32)
    expires = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    email = body.email.lower()

    with get_db() as conn:
        row = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if row:
            conn.execute(
                "UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE email = ?",
                (token, expires, email),
            )

    reset_url = f"{settings.app_base_url}/reset-password?token={token}"
    body_text = f"点击链接重置密码（1小时内有效）：\n{reset_url}\n\n如非本人操作请忽略。"
    sent = send_email(email, "情侣记账 - 重置密码", body_text)

    result: dict[str, str] = {"message": "如果邮箱已注册，将收到重置链接"}
    if not sent and row and settings.dev_mode:
        result["dev_token"] = token
    return result


@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest) -> dict[str, str]:
    now = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        user = row_to_dict(
            conn.execute(
                "SELECT * FROM users WHERE password_reset_token = ? AND password_reset_expires > ?",
                (body.token, now),
            ).fetchone()
        )
        if not user:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        conn.execute(
            "UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?",
            (hash_password(body.new_password), user["id"]),
        )
        conn.execute("DELETE FROM refresh_tokens WHERE user_id = ?", (user["id"],))
    return {"message": "密码已重置，请重新登录"}


@router.patch("/profile")
def update_profile(body: ProfileUpdate, current_user: dict = Depends(get_current_user)) -> dict[str, Any]:
    fields = []
    values: list[Any] = []
    if body.nickname is not None:
        fields.append("nickname = ?")
        values.append(body.nickname.strip())
    if body.avatar_url is not None:
        fields.append("avatar_url = ?")
        values.append(body.avatar_url.strip() or None)
    if not fields:
        return public_user(current_user)

    values.append(current_user["id"])
    with get_db() as conn:
        conn.execute(f"UPDATE users SET {', '.join(fields)} WHERE id = ?", values)
        user = row_to_dict(conn.execute("SELECT * FROM users WHERE id = ?", (current_user["id"],)).fetchone())
    return public_user(user)


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="仅支持图片文件")

    data = await file.read()
    if len(data) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="头像不能超过 2MB")

    ext = (file.filename or "avatar.jpg").rsplit(".", 1)[-1].lower()[:4]
    if ext not in ("jpg", "jpeg", "png", "webp", "gif"):
        ext = "jpg"
    fname = f"{current_user['id']}.{ext}"
    path = AVATAR_DIR / fname
    path.write_bytes(data)
    avatar_url = f"/api/auth/avatars/{fname}"

    with get_db() as conn:
        conn.execute("UPDATE users SET avatar_url = ? WHERE id = ?", (avatar_url, current_user["id"]))
        user = row_to_dict(conn.execute("SELECT * FROM users WHERE id = ?", (current_user["id"],)).fetchone())
    return public_user(user)


@router.get("/avatars/{filename}")
def serve_avatar(filename: str):
    # Public so <img src="..."> works without Authorization (filenames are user-id based).
    from fastapi.responses import FileResponse

    safe_name = Path(filename).name
    path = AVATAR_DIR / safe_name
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(path)


@router.delete("/account")
def delete_account(body: DeleteAccountRequest, current_user: dict = Depends(get_current_user)) -> dict[str, str]:
    if not verify_password(body.password, current_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Incorrect password")

    user_id = current_user["id"]
    if current_user.get("couple_id"):
        raise HTTPException(status_code=400, detail="请先退出情侣空间后再注销账号")

    with get_db() as conn:
        shared_tx = conn.execute(
            """
            SELECT COUNT(*) AS c FROM transactions
            WHERE scope = 'couple' AND (user_id = ? OR created_by = ?)
            """,
            (user_id, user_id),
        ).fetchone()["c"]
        if shared_tx:
            raise HTTPException(
                status_code=400,
                detail="你在情侣账本中仍有历史记录，无法直接注销。请先导出数据或联系另一半。",
            )
        conn.execute("DELETE FROM refresh_tokens WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))

    return {"message": "账号已注销，所有数据已清除"}


@router.get("/me")
def me(current_user: dict = Depends(get_current_user)) -> dict[str, Any]:
    return public_user(current_user)
