from __future__ import annotations

import json
import sqlite3
from typing import Any

from app.db import get_db, new_id, utcnow


def log_admin_action(
    admin: dict[str, Any],
    action: str,
    *,
    target_type: str | None = None,
    target_id: str | None = None,
    details: dict[str, Any] | str | None = None,
    conn: sqlite3.Connection | None = None,
) -> None:
    detail_str: str | None
    if details is None:
        detail_str = None
    elif isinstance(details, str):
        detail_str = details
    else:
        detail_str = json.dumps(details, ensure_ascii=False)

    sql = """
        INSERT INTO admin_audit_log (id, admin_id, admin_email, action, target_type, target_id, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """
    params = (
        new_id(),
        admin["id"],
        admin["email"],
        action,
        target_type,
        target_id,
        detail_str,
        utcnow(),
    )

    if conn is not None:
        conn.execute(sql, params)
        return

    with get_db() as c:
        c.execute(sql, params)
