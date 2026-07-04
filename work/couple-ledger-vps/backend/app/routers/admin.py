from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import require_admin
from app.db import get_db, row_to_dict, utcnow
from app.schemas import FeatureFlagUpdate

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _week_ago() -> str:
    return (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()


@router.get("/dashboard")
def dashboard(_: dict = Depends(require_admin)) -> dict[str, Any]:
    week_ago = _week_ago()
    with get_db() as conn:
        users = conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"]
        couples = conn.execute("SELECT COUNT(*) AS c FROM couples WHERE user_b_id IS NOT NULL").fetchone()["c"]
        transactions = conn.execute("SELECT COUNT(*) AS c FROM transactions").fetchone()["c"]
        active_users = conn.execute(
            "SELECT COUNT(DISTINCT user_id) AS c FROM transactions WHERE created_at >= ?",
            (week_ago,),
        ).fetchone()["c"]
        open_feedback = conn.execute(
            "SELECT COUNT(*) AS c FROM feedback WHERE status IN ('open', 'in_progress')"
        ).fetchone()["c"]
        active_announcements = conn.execute(
            "SELECT COUNT(*) AS c FROM announcements WHERE is_active = 1"
        ).fetchone()["c"]

        recent_users = conn.execute(
            "SELECT id, email, nickname, couple_id, created_at FROM users ORDER BY created_at DESC LIMIT 10"
        ).fetchall()

        income = conn.execute(
            "SELECT COALESCE(SUM(amount), 0) AS s FROM transactions WHERE type = 'income'"
        ).fetchone()["s"]
        expense = conn.execute(
            "SELECT COALESCE(SUM(amount), 0) AS s FROM transactions WHERE type = 'expense'"
        ).fetchone()["s"]

    return {
        "stats": {
            "users": users,
            "couples": couples,
            "transactions": transactions,
            "active_users_7d": active_users,
            "open_feedback": open_feedback,
            "active_announcements": active_announcements,
            "total_income": float(income),
            "total_expense": float(expense),
        },
        "recent_users": [dict(r) for r in recent_users],
    }


@router.get("/users")
def list_users(limit: int = 50, offset: int = 0, _: dict = Depends(require_admin)) -> dict[str, Any]:
    limit = min(max(limit, 1), 200)
    offset = max(offset, 0)
    with get_db() as conn:
        total = conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"]
        rows = conn.execute(
            """SELECT u.id, u.email, u.nickname, u.couple_id, u.created_at,
                      (SELECT COUNT(*) FROM transactions t WHERE t.user_id = u.id) AS tx_count
               FROM users u
               ORDER BY u.created_at DESC
               LIMIT ? OFFSET ?""",
            (limit, offset),
        ).fetchall()
    return {"total": total, "items": [dict(r) for r in rows]}


@router.get("/feature-flags")
def list_feature_flags(_: dict = Depends(require_admin)) -> list[dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM feature_flags ORDER BY key").fetchall()
    return [
        {
            "key": r["key"],
            "enabled": bool(r["enabled"]),
            "description": r["description"],
            "updated_at": r["updated_at"],
        }
        for r in rows
    ]


@router.put("/feature-flags/{key}")
def update_feature_flag(key: str, body: FeatureFlagUpdate, _: dict = Depends(require_admin)) -> dict[str, Any]:
    now = utcnow()
    with get_db() as conn:
        existing = conn.execute("SELECT key FROM feature_flags WHERE key = ?", (key,)).fetchone()
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feature flag not found")

        if body.description is not None:
            conn.execute(
                "UPDATE feature_flags SET enabled = ?, description = ?, updated_at = ? WHERE key = ?",
                (int(body.enabled), body.description.strip(), now, key),
            )
        else:
            conn.execute(
                "UPDATE feature_flags SET enabled = ?, updated_at = ? WHERE key = ?",
                (int(body.enabled), now, key),
            )
        row = row_to_dict(conn.execute("SELECT * FROM feature_flags WHERE key = ?", (key,)).fetchone())

    return {
        "key": row["key"],
        "enabled": bool(row["enabled"]),
        "description": row["description"],
        "updated_at": row["updated_at"],
    }
