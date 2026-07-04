from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from app.config import settings
from app.db import get_db

router = APIRouter(prefix="/api/meta", tags=["meta"])


@router.get("")
def get_meta() -> dict[str, Any]:
    """Public metadata for client version checks (Android/Web)."""
    with get_db() as conn:
        rows = conn.execute("SELECT key, enabled FROM feature_flags").fetchall()
    feature_flags = {r["key"]: bool(r["enabled"]) for r in rows}

    return {
        "api_version": settings.api_version,
        "min_android_version": settings.min_android_version,
        "min_android_build": settings.min_android_build,
        "feature_flags": feature_flags,
        "auth": {
            "token_type": "bearer",
            "access_token_ttl_hours": settings.jwt_expire_hours,
            "refresh_token_ttl_days": settings.jwt_refresh_days,
        },
        "endpoints": {
            "health": "/api/health",
            "meta": "/api/meta",
            "websocket": "/ws",
        },
    }
