from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import admin_email_set, settings
from app.db import get_db, new_id, row_to_dict, utcnow

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expire_hours)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_alg)


def create_refresh_token(user_id: str, device_name: str | None = None) -> str:
    raw = secrets.token_urlsafe(48)
    token_hash = _hash_token(raw)
    expires = datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_days)
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO refresh_tokens (id, user_id, token_hash, device_name, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (new_id(), user_id, token_hash, device_name, expires.isoformat(), utcnow()),
        )
    return raw


def verify_refresh_token(token: str) -> dict[str, Any]:
    token_hash = _hash_token(token)
    now = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM refresh_tokens WHERE token_hash = ? AND expires_at > ?",
            (token_hash, now),
        ).fetchone()
    session = row_to_dict(row)
    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    return session


def revoke_refresh_token(token: str) -> None:
    token_hash = _hash_token(token)
    with get_db() as conn:
        conn.execute("DELETE FROM refresh_tokens WHERE token_hash = ?", (token_hash,))


def revoke_session_by_id(session_id: str, user_id: str) -> None:
    with get_db() as conn:
        conn.execute("DELETE FROM refresh_tokens WHERE id = ? AND user_id = ?", (session_id, user_id))


def decode_token(token: str) -> str:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_alg])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return str(user_id)
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict[str, Any]:
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    user_id = decode_token(credentials.credentials)
    with get_db() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    user = row_to_dict(row)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def is_admin_user(user: dict[str, Any]) -> bool:
    admins = admin_email_set()
    if not admins:
        return False
    return user["email"].lower() in admins


def require_admin(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    if not is_admin_user(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


def public_user(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": user["id"],
        "email": user["email"],
        "nickname": user["nickname"],
        "avatar_url": user.get("avatar_url"),
        "couple_id": user.get("couple_id"),
        "created_at": user["created_at"],
        "is_admin": is_admin_user(user),
    }


def issue_tokens(user: dict[str, Any], device_name: str | None = None) -> dict[str, Any]:
    return {
        "access_token": create_access_token(user["id"]),
        "refresh_token": create_refresh_token(user["id"], device_name),
        "token_type": "bearer",
        "user": public_user(user),
    }
