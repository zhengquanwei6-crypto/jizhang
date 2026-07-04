from __future__ import annotations

from fastapi import Depends, HTTPException, status

from app.auth import get_current_user
from app.db import get_db


def is_feature_enabled(key: str) -> bool:
    with get_db() as conn:
        row = conn.execute("SELECT enabled FROM feature_flags WHERE key = ?", (key,)).fetchone()
    if row is None:
        return True
    return bool(row["enabled"])


def require_feature(key: str):
    """Dependency factory: block route when a feature flag is disabled."""

    def _check(_: dict = Depends(get_current_user)) -> None:
        if not is_feature_enabled(key):
            labels = {
                "ai_enabled": "AI 功能",
                "chat_enabled": "聊天",
                "couple_pairing": "情侣绑定",
            }
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"{labels.get(key, key)} 暂时关闭，请稍后再试",
            )

    return _check
