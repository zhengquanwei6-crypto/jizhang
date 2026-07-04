"""Couple pet nurturing — v1 inspired by 茶茶记账 / 胖胖记账 / 念爱记."""

from __future__ import annotations

import sqlite3
from datetime import date, datetime, timedelta
from typing import Any

from app.db import get_db, new_id, row_to_dict, utcnow
from app.feature_flags import is_feature_enabled

# Cumulative EXP thresholds: index = level (1-based level uses LEVEL_EXP[level-1])
LEVEL_EXP = [0, 0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200]
MAX_LEVEL = 10

ACTION_EXP: dict[str, int] = {
    "feed": 15,
    "pet": 8,
    "daily_check": 20,
    "transaction": 12,
    "chat": 3,
    "goal_check_in": 10,
}

# Per-user limits (feed, pet) or per-couple (others), per calendar day
DAILY_LIMITS: dict[str, int] = {
    "feed": 1,
    "pet": 1,
    "daily_check": 1,
    "transaction": 3,
    "chat": 8,
    "goal_check_in": 3,
}

PER_USER_ACTIONS = frozenset({"feed", "pet"})

STAGE_LABELS = {
    "egg": "果冻蛋",
    "baby": "幼果冻",
    "teen": "少年果冻",
    "adult": "果冻仔",
}

MOOD_LABELS = {
    "happy": "开心",
    "hungry": "饿了",
    "loved": "幸福",
    "normal": "平常",
}


def level_from_exp(exp: int) -> int:
    lvl = 1
    for i in range(1, len(LEVEL_EXP)):
        if exp >= LEVEL_EXP[i]:
            lvl = i
    return min(lvl, MAX_LEVEL)


def stage_from_level(level: int) -> str:
    if level < 2:
        return "egg"
    if level < 5:
        return "baby"
    if level < 10:
        return "teen"
    return "adult"


def exp_to_next_level(exp: int, level: int) -> tuple[int, int]:
    if level >= MAX_LEVEL:
        return 0, 0
    current_floor = LEVEL_EXP[level]
    next_ceil = LEVEL_EXP[level + 1]
    return exp - current_floor, next_ceil - current_floor


def _today() -> str:
    return date.today().isoformat()


def _count_actions_today(
    conn: sqlite3.Connection,
    couple_id: str,
    action_type: str,
    user_id: str | None = None,
) -> int:
    today = _today()
    if action_type in PER_USER_ACTIONS and user_id:
        row = conn.execute(
            """
            SELECT COUNT(*) AS c FROM pet_actions
            WHERE couple_id = ? AND action_type = ? AND action_date = ? AND user_id = ?
            """,
            (couple_id, action_type, today, user_id),
        ).fetchone()
    else:
        row = conn.execute(
            """
            SELECT COUNT(*) AS c FROM pet_actions
            WHERE couple_id = ? AND action_type = ? AND action_date = ?
            """,
            (couple_id, action_type, today),
        ).fetchone()
    return int(row["c"])


def _compute_hunger(conn: sqlite3.Connection, pet: dict[str, Any]) -> int:
    today = date.today()
    last_fed = pet.get("last_fed_date")
    base = int(pet.get("hunger") or 50)
    if last_fed == today.isoformat():
        return max(0, min(100, base))
    if not last_fed:
        return min(100, base + 20)
    try:
        last = datetime.strptime(last_fed[:10], "%Y-%m-%d").date()
    except ValueError:
        return min(100, base + 20)
    days = (today - last).days
    return min(100, 30 + days * 18)


def _compute_mood(conn: sqlite3.Connection, couple_id: str, hunger: int) -> str:
    today = _today()
    fed_today = conn.execute(
        """
        SELECT COUNT(*) AS c FROM pet_actions
        WHERE couple_id = ? AND action_type = 'feed' AND action_date = ?
        """,
        (couple_id, today),
    ).fetchone()["c"]
    petters = conn.execute(
        """
        SELECT COUNT(DISTINCT user_id) AS c FROM pet_actions
        WHERE couple_id = ? AND action_type = 'pet' AND action_date = ?
        """,
        (couple_id, today),
    ).fetchone()["c"]
    if hunger >= 75 and not fed_today:
        return "hungry"
    if petters >= 2:
        return "loved"
    if fed_today and hunger < 45:
        return "happy"
    return "normal"


def get_or_create_pet(conn: sqlite3.Connection, couple_id: str) -> dict[str, Any]:
    row = conn.execute("SELECT * FROM pets WHERE couple_id = ?", (couple_id,)).fetchone()
    if row:
        return dict(row)
    now = utcnow()
    pid = new_id()
    conn.execute(
        """
        INSERT INTO pets
        (id, couple_id, name, stage, level, exp, mood, hunger, total_feeds, last_fed_date, created_at, updated_at)
        VALUES (?, ?, '果冻仔', 'egg', 1, 0, 'normal', 50, 0, NULL, ?, ?)
        """,
        (pid, couple_id, now, now),
    )
    return dict(conn.execute("SELECT * FROM pets WHERE id = ?", (pid,)).fetchone())


def _apply_exp(conn: sqlite3.Connection, pet: dict[str, Any], gained: int) -> dict[str, Any]:
    new_exp = int(pet["exp"]) + gained
    new_level = level_from_exp(new_exp)
    new_stage = stage_from_level(new_level)
    now = utcnow()
    conn.execute(
        """
        UPDATE pets SET exp = ?, level = ?, stage = ?, updated_at = ?
        WHERE id = ?
        """,
        (new_exp, new_level, new_stage, now, pet["id"]),
    )
    return dict(conn.execute("SELECT * FROM pets WHERE id = ?", (pet["id"],)).fetchone())


def grant_pet_reward(
    couple_id: str,
    user_id: str,
    action_type: str,
) -> dict[str, Any] | None:
    """Grant EXP if daily limit allows. Returns pet snapshot or None if skipped."""
    if action_type not in ACTION_EXP:
        return None
    exp_gain = ACTION_EXP[action_type]
    limit = DAILY_LIMITS.get(action_type, 1)

    with get_db() as conn:
        if not is_feature_enabled("pet_enabled"):
            return None

        count = _count_actions_today(conn, couple_id, action_type, user_id)
        if count >= limit:
            return None

        pet = get_or_create_pet(conn, couple_id)
        now = utcnow()
        conn.execute(
            """
            INSERT INTO pet_actions (id, pet_id, couple_id, user_id, action_type, exp_gained, action_date, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (new_id(), pet["id"], couple_id, user_id, action_type, exp_gain, _today(), now),
        )
        pet = _apply_exp(conn, pet, exp_gain)

        if action_type == "feed":
            conn.execute(
                "UPDATE pets SET hunger = ?, last_fed_date = ?, total_feeds = total_feeds + 1, updated_at = ? WHERE id = ?",
                (max(0, int(pet.get("hunger") or 50) - 35), _today(), now, pet["id"]),
            )
            pet = dict(conn.execute("SELECT * FROM pets WHERE id = ?", (pet["id"],)).fetchone())

        snapshot = build_pet_payload(conn, couple_id, user_id)

    return snapshot


def perform_pet_action(
    couple_id: str,
    user_id: str,
    action_type: str,
) -> dict[str, Any]:
    """Manual feed / pet / daily_check."""
    if action_type not in ("feed", "pet", "daily_check"):
        raise ValueError("Invalid manual action")

    with get_db() as conn:
        if not is_feature_enabled("pet_enabled"):
            raise PermissionError("Pet feature disabled")

        limit = DAILY_LIMITS[action_type]
        count = _count_actions_today(conn, couple_id, action_type, user_id)
        if count >= limit:
            raise ValueError("Daily limit reached")

        pet = get_or_create_pet(conn, couple_id)
        exp_gain = ACTION_EXP[action_type]
        now = utcnow()
        conn.execute(
            """
            INSERT INTO pet_actions (id, pet_id, couple_id, user_id, action_type, exp_gained, action_date, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (new_id(), pet["id"], couple_id, user_id, action_type, exp_gain, _today(), now),
        )
        pet = _apply_exp(conn, pet, exp_gain)

        if action_type == "feed":
            hunger = max(0, _compute_hunger(conn, pet) - 40)
            conn.execute(
                "UPDATE pets SET hunger = ?, last_fed_date = ?, total_feeds = total_feeds + 1, updated_at = ? WHERE id = ?",
                (hunger, _today(), now, pet["id"]),
            )

        snapshot = build_pet_payload(conn, couple_id, user_id)

    return snapshot


def build_pet_payload(conn: sqlite3.Connection, couple_id: str, user_id: str) -> dict[str, Any]:
    pet = get_or_create_pet(conn, couple_id)
    hunger = _compute_hunger(conn, pet)
    mood = _compute_mood(conn, couple_id, hunger)
    conn.execute("UPDATE pets SET hunger = ?, mood = ?, updated_at = ? WHERE id = ?", (hunger, mood, utcnow(), pet["id"]))
    pet = dict(conn.execute("SELECT * FROM pets WHERE id = ?", (pet["id"],)).fetchone())

    level = int(pet["level"])
    exp_cur, exp_need = exp_to_next_level(int(pet["exp"]), level)
    stage = pet["stage"]

    today = _today()
    tasks = [
        {
            "id": "feed",
            "title": "喂食果冻仔",
            "hint": "每人每日 1 次",
            "exp": ACTION_EXP["feed"],
            "done": _count_actions_today(conn, couple_id, "feed", user_id) >= 1,
            "progress": f"{min(1, _count_actions_today(conn, couple_id, 'feed', user_id))}/1",
        },
        {
            "id": "pet",
            "title": "摸摸头",
            "hint": "每人每日 1 次",
            "exp": ACTION_EXP["pet"],
            "done": _count_actions_today(conn, couple_id, "pet", user_id) >= 1,
            "progress": f"{min(1, _count_actions_today(conn, couple_id, 'pet', user_id))}/1",
        },
        {
            "id": "daily_check",
            "title": "每日照料",
            "hint": "情侣每日 1 次",
            "exp": ACTION_EXP["daily_check"],
            "done": _count_actions_today(conn, couple_id, "daily_check") >= 1,
            "progress": f"{min(1, _count_actions_today(conn, couple_id, 'daily_check'))}/1",
        },
        {
            "id": "transaction",
            "title": "情侣账本记一笔",
            "hint": "记账得成长值",
            "exp": ACTION_EXP["transaction"],
            "done": _count_actions_today(conn, couple_id, "transaction") >= DAILY_LIMITS["transaction"],
            "progress": f"{_count_actions_today(conn, couple_id, 'transaction')}/{DAILY_LIMITS['transaction']}",
        },
        {
            "id": "chat",
            "title": "和 TA 聊聊天",
            "hint": "聊天得成长值",
            "exp": ACTION_EXP["chat"],
            "done": _count_actions_today(conn, couple_id, "chat") >= DAILY_LIMITS["chat"],
            "progress": f"{_count_actions_today(conn, couple_id, 'chat')}/{DAILY_LIMITS['chat']}",
        },
    ]

    logs = conn.execute(
        """
        SELECT pa.*, u.nickname AS user_nickname
        FROM pet_actions pa
        JOIN users u ON u.id = pa.user_id
        WHERE pa.couple_id = ?
        ORDER BY pa.created_at DESC
        LIMIT 12
        """,
        (couple_id,),
    ).fetchall()

    partner_fed = conn.execute(
        """
        SELECT COUNT(*) AS c FROM pet_actions
        WHERE couple_id = ? AND action_type = 'feed' AND action_date = ? AND user_id != ?
        """,
        (couple_id, today, user_id),
    ).fetchone()["c"]

    return {
        "pet": {
            "id": pet["id"],
            "name": pet["name"],
            "stage": stage,
            "stage_label": STAGE_LABELS.get(stage, stage),
            "level": level,
            "exp": int(pet["exp"]),
            "exp_current": exp_cur,
            "exp_needed": exp_need,
            "mood": mood,
            "mood_label": MOOD_LABELS.get(mood, mood),
            "hunger": hunger,
            "total_feeds": int(pet["total_feeds"] or 0),
            "last_fed_date": pet.get("last_fed_date"),
        },
        "tasks": tasks,
        "recent_logs": [
            {
                "id": r["id"],
                "action_type": r["action_type"],
                "exp_gained": r["exp_gained"],
                "user_nickname": r["user_nickname"],
                "created_at": r["created_at"],
            }
            for r in logs
        ],
        "partner_fed_today": partner_fed > 0,
    }



async def broadcast_pet_update_async(couple_id: str, snapshot: dict[str, Any]) -> None:
    from app.ws import manager

    await manager.broadcast_couple(couple_id, {"event": "pet_update", "data": snapshot})
