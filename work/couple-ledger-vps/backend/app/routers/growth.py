from __future__ import annotations

from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth import get_current_user
from app.db import get_db, local_now, local_today, new_id, row_to_dict, utcnow
from app.feature_flags import require_feature
from app.schemas import GrowthInteractRequest

router = APIRouter(
    prefix="/api/growth",
    tags=["growth"],
    dependencies=[Depends(require_feature("couple_pairing"))],
)

EXP_RULES = {
    "feed": 15,
    "pet": 8,
    "play": 10,
    "care": 20,
}

DAILY_TASKS = (
    {"key": "feed", "label": "喂食果冻仔", "target": 1, "exp_hint": 15},
    {"key": "pet", "label": "摸摸头", "target": 1, "exp_hint": 8},
    {"key": "care", "label": "日常照料", "target": 1, "exp_hint": 20},
    {"key": "ledger", "label": "情侣账本记一笔", "target": 3, "exp_hint": 5},
    {"key": "chat", "label": "和 TA 聊天", "target": 8, "exp_hint": 3},
)


def _require_couple(user: dict) -> str:
    if not user.get("couple_id"):
        raise HTTPException(status_code=400, detail="Couple pairing required")
    return user["couple_id"]


def _stage_label(level: int) -> str:
    if level >= 10:
        return "果冻王"
    if level >= 5:
        return "果冻团"
    if level >= 3:
        return "果冻仔"
    return "果冻蛋"


def _status_label(mood: int, energy: int) -> str:
    if energy < 25:
        return "饿了"
    if mood < 35:
        return "想你了"
    if energy < 50:
        return "有点累"
    if mood >= 75:
        return "超开心"
    return "元气满满"


def _serialize_pet(row: dict[str, Any]) -> dict[str, Any]:
    exp_needed = row["level"] * 100
    mood = int(row["mood"])
    energy = int(row["energy"])
    return {
        "id": row["id"],
        "name": row["name"],
        "level": row["level"],
        "stage": _stage_label(int(row["level"])),
        "status": _status_label(mood, energy),
        "exp": row["exp"],
        "exp_needed": exp_needed,
        "mood": mood,
        "energy": energy,
        "created_at": row["created_at"],
    }


def _get_or_create_pet(conn, couple_id: str) -> dict[str, Any]:
    row = conn.execute("SELECT * FROM growth_pets WHERE couple_id = ?", (couple_id,)).fetchone()
    if row:
        return row_to_dict(row)
    pet_id = new_id()
    now = utcnow()
    conn.execute(
        """
        INSERT INTO growth_pets (id, couple_id, name, level, exp, mood, energy, created_at)
        VALUES (?, ?, '蜜糖', 1, 0, 80, 100, ?)
        """,
        (pet_id, couple_id, now),
    )
    return row_to_dict(conn.execute("SELECT * FROM growth_pets WHERE id = ?", (pet_id,)).fetchone())


def _apply_interact(pet: dict[str, Any], action: str) -> dict[str, Any]:
    delta = EXP_RULES.get(action, 0)
    pet = dict(pet)
    pet["exp"] = int(pet["exp"]) + delta
    pet["mood"] = min(100, int(pet["mood"]) + (10 if action == "pet" else 5))
    if action == "feed":
        pet["energy"] = min(100, int(pet["energy"]) + 15)
    elif action == "play":
        pet["energy"] = max(0, int(pet["energy"]) - 5)
    elif action == "care":
        pet["energy"] = min(100, int(pet["energy"]) + 8)
    while pet["exp"] >= pet["level"] * 100:
        pet["exp"] -= pet["level"] * 100
        pet["level"] += 1
    return pet


def _compute_care_streak(conn, couple_id: str, user_id: str | None = None) -> int:
    if user_id:
        rows = conn.execute(
            """
            SELECT DISTINCT date(created_at) AS d FROM growth_events
            WHERE couple_id = ? AND user_id = ? ORDER BY d DESC LIMIT 366
            """,
            (couple_id, user_id),
        ).fetchall()
    else:
        rows = conn.execute(
            """
            SELECT DISTINCT date(created_at) AS d FROM growth_events
            WHERE couple_id = ? ORDER BY d DESC LIMIT 366
            """,
            (couple_id,),
        ).fetchall()
    dates = {r["d"] for r in rows}
    if not dates:
        return 0
    streak = 0
    day = local_now().date()
    if day.isoformat() not in dates:
        day -= timedelta(days=1)
    while day.isoformat() in dates:
        streak += 1
        day -= timedelta(days=1)
    return streak


def _compute_achievements(
    conn,
    couple_id: str,
    pet: dict[str, Any],
    care_streak: int,
    progress: dict[str, int],
) -> list[dict[str, Any]]:
    level = int(pet["level"])
    total_events = int(
        conn.execute(
            "SELECT COUNT(*) AS c FROM growth_events WHERE couple_id = ?",
            (couple_id,),
        ).fetchone()["c"]
    )
    tasks_all_done = all(progress.get(spec["key"], 0) >= spec["target"] for spec in DAILY_TASKS)
    defs = [
        {"id": "first_feed", "label": "初次投喂", "emoji": "🍼", "desc": "完成首次互动", "unlocked": total_events >= 1},
        {"id": "level3", "label": "果冻仔", "emoji": "🥚", "desc": "达到 Lv.3", "unlocked": level >= 3},
        {"id": "level5", "label": "果冻团", "emoji": "⭐", "desc": "达到 Lv.5", "unlocked": level >= 5},
        {"id": "level10", "label": "果冻王", "emoji": "👑", "desc": "达到 Lv.10", "unlocked": level >= 10},
        {"id": "streak3", "label": "三日相伴", "emoji": "🔥", "desc": "连续照料 3 天", "unlocked": care_streak >= 3},
        {"id": "streak7", "label": "一周守护", "emoji": "💫", "desc": "连续照料 7 天", "unlocked": care_streak >= 7},
        {"id": "streak30", "label": "月度达人", "emoji": "🏆", "desc": "连续照料 30 天", "unlocked": care_streak >= 30},
        {"id": "daily_all", "label": "今日全勤", "emoji": "✅", "desc": "完成全部今日任务", "unlocked": tasks_all_done},
        {"id": "interact50", "label": "互动达人", "emoji": "💕", "desc": "累计互动 50 次", "unlocked": total_events >= 50},
    ]
    return defs


def _daily_progress(conn, couple_id: str, user_id: str) -> dict[str, int]:
    today = local_today()
    interact_rows = conn.execute(
        """
        SELECT event_type, COUNT(*) AS c FROM growth_events
        WHERE couple_id = ? AND date(created_at) = date(?)
        GROUP BY event_type
        """,
        (couple_id, today),
    ).fetchall()
    interact = {r["event_type"]: int(r["c"]) for r in interact_rows}
    tx_count = conn.execute(
        """
        SELECT COUNT(*) AS c FROM transactions
        WHERE couple_id = ? AND scope = 'couple' AND tx_date = ?
        """,
        (couple_id, today),
    ).fetchone()["c"]
    chat_count = conn.execute(
        """
        SELECT COUNT(*) AS c FROM chat_messages
        WHERE couple_id = ? AND date(created_at) = date(?) AND sender_kind = 'user'
        """,
        (couple_id, today),
    ).fetchone()["c"]
    return {
        "feed": interact.get("feed", 0),
        "pet": interact.get("pet", 0),
        "care": interact.get("care", 0) + interact.get("play", 0),
        "ledger": int(tx_count),
        "chat": int(chat_count),
    }


@router.get("/tasks")
def daily_tasks(current_user: dict = Depends(get_current_user)) -> dict[str, Any]:
    couple_id = _require_couple(current_user)
    with get_db() as conn:
        progress = _daily_progress(conn, couple_id, current_user["id"])
    tasks = []
    for spec in DAILY_TASKS:
        current = progress.get(spec["key"], 0)
        tasks.append({**spec, "current": min(current, spec["target"]), "done": current >= spec["target"]})
    return {"date": local_today(), "tasks": tasks}


@router.get("/pet")
def get_pet(current_user: dict = Depends(get_current_user)) -> dict[str, Any]:
    couple_id = _require_couple(current_user)
    with get_db() as conn:
        pet = _get_or_create_pet(conn, couple_id)
        events = conn.execute(
            """
            SELECT ge.event_type, ge.description, ge.exp_delta, ge.created_at, u.nickname
            FROM growth_events ge
            LEFT JOIN users u ON u.id = ge.user_id
            WHERE ge.couple_id = ? ORDER BY ge.created_at DESC LIMIT 15
            """,
            (couple_id,),
        ).fetchall()
        progress = _daily_progress(conn, couple_id, current_user["id"])
        care_streak = _compute_care_streak(conn, couple_id)
        couple = row_to_dict(conn.execute("SELECT * FROM couples WHERE id = ?", (couple_id,)).fetchone())
        partner_id = None
        partner_name = "TA"
        for uid in (couple["user_a_id"], couple.get("user_b_id")):
            if uid and uid != current_user["id"]:
                partner_id = uid
                prow = conn.execute("SELECT nickname FROM users WHERE id = ?", (uid,)).fetchone()
                if prow and prow["nickname"]:
                    partner_name = prow["nickname"]
                break
        my_care_streak = _compute_care_streak(conn, couple_id, current_user["id"])
        partner_care_streak = _compute_care_streak(conn, couple_id, partner_id) if partner_id else 0
        achievements = _compute_achievements(conn, couple_id, pet, care_streak, progress)
    tasks = []
    for spec in DAILY_TASKS:
        current = progress.get(spec["key"], 0)
        tasks.append({**spec, "current": min(current, spec["target"]), "done": current >= spec["target"]})
    unlocked = [a for a in achievements if a["unlocked"]]
    return {
        "pet": _serialize_pet(pet),
        "recent_events": [dict(e) for e in events],
        "daily_tasks": tasks,
        "task_date": local_today(),
        "care_streak": care_streak,
        "my_care_streak": my_care_streak,
        "partner_care_streak": partner_care_streak,
        "partner_name": partner_name,
        "achievements": achievements,
        "achievement_count": len(unlocked),
        "achievement_total": len(achievements),
    }


@router.post("/interact")
def interact(body: GrowthInteractRequest, current_user: dict = Depends(get_current_user)) -> dict[str, Any]:
    couple_id = _require_couple(current_user)
    now = utcnow()
    with get_db() as conn:
        pet = _get_or_create_pet(conn, couple_id)
        updated = _apply_interact(pet, body.action)
        conn.execute(
            """
            UPDATE growth_pets SET level = ?, exp = ?, mood = ?, energy = ? WHERE id = ?
            """,
            (updated["level"], updated["exp"], updated["mood"], updated["energy"], updated["id"]),
        )
        event_id = new_id()
        conn.execute(
            """
            INSERT INTO growth_events (id, couple_id, user_id, event_type, exp_delta, description, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                event_id,
                couple_id,
                current_user["id"],
                body.action,
                EXP_RULES.get(body.action, 0),
                body.note or body.action,
                now,
            ),
        )
    return {"pet": _serialize_pet(updated), "exp_gained": EXP_RULES.get(body.action, 0)}


@router.patch("/pet/name")
def rename_pet(name: str = Query(..., min_length=1, max_length=20), current_user: dict = Depends(get_current_user)) -> dict[str, Any]:
    couple_id = _require_couple(current_user)
    clean = name.strip()
    if not clean or len(clean) > 20:
        raise HTTPException(status_code=400, detail="Invalid pet name")
    with get_db() as conn:
        pet = _get_or_create_pet(conn, couple_id)
        conn.execute("UPDATE growth_pets SET name = ? WHERE id = ?", (clean, pet["id"]))
        pet = row_to_dict(conn.execute("SELECT * FROM growth_pets WHERE id = ?", (pet["id"],)).fetchone())
    return _serialize_pet(pet)
