from __future__ import annotations

import sqlite3
from datetime import date, datetime, timedelta
from typing import Any

from app.db import local_today


def compute_intimacy_score(conn: sqlite3.Connection, couple_id: str) -> dict[str, Any]:
    """Intimacy algorithm aligned with CoupleSpace Android architecture.

    Score 0-100 from weighted recent activity:
    - Base warmth: 50
    - Check-ins (7d): +3 each, max 21
    - Chat messages (7d): +0.5 each, max 10
    - Shared transactions (7d): +1 each, max 10
    - Goal progress: up to +10
    - Intimacy logs avg (30d): (avg/10)*15
    - Upcoming anniversary (7d): +5 bonus
    """
    today = date.fromisoformat(local_today())
    week_ago = (today - timedelta(days=7)).isoformat()
    month_ago = (today - timedelta(days=30)).isoformat()

    check_ins = conn.execute(
        """
        SELECT COUNT(*) AS c FROM check_ins ci
        JOIN goals g ON g.id = ci.goal_id
        WHERE g.scope = 'couple' AND g.owner_id = ? AND ci.check_in_date >= ?
        """,
        (couple_id, week_ago),
    ).fetchone()["c"]

    chats = conn.execute(
        "SELECT COUNT(*) AS c FROM chat_messages WHERE couple_id = ? AND created_at >= ? AND recalled_at IS NULL",
        (couple_id, week_ago),
    ).fetchone()["c"]

    txs = conn.execute(
        """
        SELECT COUNT(*) AS c FROM transactions
        WHERE scope = 'couple' AND couple_id = ? AND tx_date >= ?
        """,
        (couple_id, week_ago),
    ).fetchone()["c"]

    goals = conn.execute(
        "SELECT target_value, current_value FROM goals WHERE scope = 'couple' AND owner_id = ?",
        (couple_id,),
    ).fetchall()
    goal_bonus = 0.0
    for g in goals:
        if g["target_value"] and g["target_value"] > 0:
            goal_bonus += min(10, (g["current_value"] / g["target_value"]) * 10)
    goal_bonus = min(10, goal_bonus)

    logs = conn.execute(
        "SELECT AVG(score) AS avg_score FROM intimacy_logs WHERE couple_id = ? AND log_date >= ?",
        (couple_id, month_ago),
    ).fetchone()
    log_avg = float(logs["avg_score"] or 0)
    log_bonus = (log_avg / 10) * 15

    ann_bonus = 0
    anniversaries = conn.execute(
        "SELECT anniversary_date FROM anniversaries WHERE couple_id = ?",
        (couple_id,),
    ).fetchall()
    for a in anniversaries:
        try:
            ad = datetime.strptime(a["anniversary_date"][:10], "%Y-%m-%d").date()
            this_year = ad.replace(year=today.year)
            if this_year < today:
                this_year = this_year.replace(year=today.year + 1)
            days_until = (this_year - today).days
            if 0 <= days_until <= 7:
                ann_bonus = 5
                break
        except ValueError:
            continue

    score = min(
        100,
        round(
            50
            + min(21, check_ins * 3)
            + min(10, chats * 0.5)
            + min(10, txs * 1)
            + goal_bonus
            + log_bonus
            + ann_bonus
        ),
    )

    level = "冷淡"
    if score >= 85:
        level = "热恋"
    elif score >= 70:
        level = "甜蜜"
    elif score >= 55:
        level = "温馨"
    elif score >= 40:
        level = "平淡"

    return {
        "score": int(score),
        "level": level,
        "breakdown": {
            "check_ins_7d": check_ins,
            "chats_7d": chats,
            "transactions_7d": txs,
            "goal_bonus": round(goal_bonus, 1),
            "intimacy_log_bonus": round(log_bonus, 1),
            "anniversary_bonus": ann_bonus,
        },
    }
