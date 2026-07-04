from __future__ import annotations

from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.auth import get_current_user, public_user
from app.db import get_db, local_today, new_id, row_to_dict, utcnow
from app.feature_flags import require_feature
from app.intimacy import compute_intimacy_score
from app.schemas import (
    AnniversaryCreate,
    AnniversaryUpdate,
    CheckInCreate,
    GoalCreate,
    GoalUpdate,
    IntimacyLogCreate,
    SharedNoteUpdate,
    WishlistCreate,
    WishlistSortItem,
    WishlistUpdate,
)

router = APIRouter(
    prefix="/api/couple-social",
    tags=["couple-social"],
    dependencies=[Depends(require_feature("couple_pairing"))],
)


def _require_couple(user: dict) -> str:
    if not user.get("couple_id"):
        raise HTTPException(status_code=400, detail="Couple pairing required")
    return user["couple_id"]


@router.get("/anniversaries")
def list_anniversaries(current_user: dict = Depends(get_current_user)) -> list[dict[str, Any]]:
    couple_id = _require_couple(current_user)
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM anniversaries WHERE couple_id = ? ORDER BY anniversary_date ASC",
            (couple_id,),
        ).fetchall()
    return [dict(r) for r in rows]


@router.post("/anniversaries", status_code=201)
def create_anniversary(body: AnniversaryCreate, current_user: dict = Depends(get_current_user)) -> dict[str, Any]:
    couple_id = _require_couple(current_user)
    aid = new_id()
    now = utcnow()
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO anniversaries (id, couple_id, title, anniversary_date, note, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (aid, couple_id, body.title.strip(), body.anniversary_date, body.note, current_user["id"], now),
        )
        row = row_to_dict(conn.execute("SELECT * FROM anniversaries WHERE id = ?", (aid,)).fetchone())
    return row


@router.put("/anniversaries/{ann_id}")
def update_anniversary(
    ann_id: str, body: AnniversaryUpdate, current_user: dict = Depends(get_current_user)
) -> dict[str, Any]:
    couple_id = _require_couple(current_user)
    with get_db() as conn:
        row = row_to_dict(conn.execute("SELECT * FROM anniversaries WHERE id = ?", (ann_id,)).fetchone())
        if not row or row["couple_id"] != couple_id:
            raise HTTPException(status_code=404, detail="Anniversary not found")
        fields, values = [], []
        for key in ("title", "anniversary_date", "note"):
            val = getattr(body, key)
            if val is not None:
                fields.append(f"{key} = ?")
                values.append(val.strip() if key == "title" else val)
        if fields:
            values.append(ann_id)
            conn.execute(f"UPDATE anniversaries SET {', '.join(fields)} WHERE id = ?", values)
        updated = row_to_dict(conn.execute("SELECT * FROM anniversaries WHERE id = ?", (ann_id,)).fetchone())
    return updated


@router.delete("/anniversaries/{ann_id}", status_code=204, response_class=Response)
def delete_anniversary(ann_id: str, current_user: dict = Depends(get_current_user)) -> Response:
    couple_id = _require_couple(current_user)
    with get_db() as conn:
        row = conn.execute("SELECT couple_id FROM anniversaries WHERE id = ?", (ann_id,)).fetchone()
        if not row or row["couple_id"] != couple_id:
            raise HTTPException(status_code=404, detail="Anniversary not found")
        conn.execute("DELETE FROM anniversaries WHERE id = ?", (ann_id,))
    return Response(status_code=204)


@router.get("/goals")
def list_goals(
    scope: str = "couple",
    current_user: dict = Depends(get_current_user),
) -> list[dict[str, Any]]:
    owner_id = current_user["couple_id"] if scope == "couple" else current_user["id"]
    if scope == "couple":
        _require_couple(current_user)
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM goals WHERE scope = ? AND owner_id = ? ORDER BY created_at DESC",
            (scope, owner_id),
        ).fetchall()
    return [dict(r) for r in rows]


@router.post("/goals", status_code=201)
def create_goal(body: GoalCreate, current_user: dict = Depends(get_current_user)) -> dict[str, Any]:
    owner_id = current_user["couple_id"] if body.scope == "couple" else current_user["id"]
    if body.scope == "couple":
        _require_couple(current_user)
    gid = new_id()
    now = utcnow()
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO goals (id, scope, owner_id, title, target_value, current_value, unit, deadline, goal_type, note, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
            """,
            (
                gid, body.scope, owner_id, body.title.strip(), body.target_value, body.unit,
                body.deadline, body.goal_type, body.note, current_user["id"], now,
            ),
        )
        row = row_to_dict(conn.execute("SELECT * FROM goals WHERE id = ?", (gid,)).fetchone())
    return row


@router.put("/goals/{goal_id}")
def update_goal(goal_id: str, body: GoalUpdate, current_user: dict = Depends(get_current_user)) -> dict[str, Any]:
    with get_db() as conn:
        row = row_to_dict(conn.execute("SELECT * FROM goals WHERE id = ?", (goal_id,)).fetchone())
        if not row:
            raise HTTPException(status_code=404, detail="Goal not found")
        if row["scope"] == "couple" and row["owner_id"] != current_user.get("couple_id"):
            raise HTTPException(status_code=403, detail="Forbidden")
        if row["scope"] == "personal" and row["owner_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Forbidden")

        fields, values = [], []
        for key in ("title", "target_value", "current_value", "unit", "deadline", "goal_type", "note"):
            val = getattr(body, key)
            if val is not None:
                fields.append(f"{key} = ?")
                values.append(val.strip() if key in ("title", "note") else val)
        if fields:
            values.append(goal_id)
            conn.execute(f"UPDATE goals SET {', '.join(fields)} WHERE id = ?", values)
        updated = row_to_dict(conn.execute("SELECT * FROM goals WHERE id = ?", (goal_id,)).fetchone())
    return updated


@router.delete("/goals/{goal_id}", status_code=204, response_class=Response)
def delete_goal(goal_id: str, current_user: dict = Depends(get_current_user)) -> Response:
    with get_db() as conn:
        row = row_to_dict(conn.execute("SELECT * FROM goals WHERE id = ?", (goal_id,)).fetchone())
        if not row:
            raise HTTPException(status_code=404, detail="Goal not found")
        if row["scope"] == "couple" and row["owner_id"] != current_user.get("couple_id"):
            raise HTTPException(status_code=403, detail="Forbidden")
        if row["scope"] == "personal" and row["owner_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Forbidden")
        conn.execute("DELETE FROM goals WHERE id = ?", (goal_id,))
    return Response(status_code=204)


@router.post("/goals/{goal_id}/check-in", status_code=201)
def check_in(goal_id: str, body: CheckInCreate, current_user: dict = Depends(get_current_user)) -> dict[str, Any]:
    with get_db() as conn:
        goal = row_to_dict(conn.execute("SELECT * FROM goals WHERE id = ?", (goal_id,)).fetchone())
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        if goal["scope"] == "couple" and goal["owner_id"] != current_user.get("couple_id"):
            raise HTTPException(status_code=403, detail="Forbidden")
        if goal["scope"] == "personal" and goal["owner_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Forbidden")

        cid = new_id()
        now = utcnow()
        check_date = body.check_in_date or local_today()
        conn.execute(
            """
            INSERT INTO check_ins (id, goal_id, user_id, value, note, check_in_date, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (cid, goal_id, current_user["id"], body.value, body.note, check_date, now),
        )
        conn.execute(
            "UPDATE goals SET current_value = current_value + ? WHERE id = ?",
            (body.value, goal_id),
        )
        row = row_to_dict(conn.execute("SELECT * FROM check_ins WHERE id = ?", (cid,)).fetchone())
    return row


@router.get("/goals/{goal_id}/check-ins")
def list_check_ins(goal_id: str, current_user: dict = Depends(get_current_user)) -> list[dict[str, Any]]:
    with get_db() as conn:
        goal = row_to_dict(conn.execute("SELECT * FROM goals WHERE id = ?", (goal_id,)).fetchone())
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        if goal["scope"] == "couple" and goal["owner_id"] != current_user.get("couple_id"):
            raise HTTPException(status_code=403, detail="Forbidden")
        if goal["scope"] == "personal" and goal["owner_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Forbidden")
        rows = conn.execute(
            """
            SELECT c.*, u.nickname AS user_nickname
            FROM check_ins c JOIN users u ON u.id = c.user_id
            WHERE c.goal_id = ? ORDER BY c.check_in_date DESC
            """,
            (goal_id,),
        ).fetchall()
    return [dict(r) for r in rows]


@router.get("/intimacy")
def get_intimacy(current_user: dict = Depends(get_current_user)) -> dict[str, Any]:
    couple_id = _require_couple(current_user)
    with get_db() as conn:
        score = compute_intimacy_score(conn, couple_id)
        logs = conn.execute(
            """
            SELECT l.*, u.nickname AS user_nickname
            FROM intimacy_logs l JOIN users u ON u.id = l.user_id
            WHERE l.couple_id = ? ORDER BY l.log_date DESC LIMIT 30
            """,
            (couple_id,),
        ).fetchall()
    return {**score, "recent_logs": [dict(r) for r in logs]}


@router.post("/intimacy", status_code=201)
def log_intimacy(body: IntimacyLogCreate, current_user: dict = Depends(get_current_user)) -> dict[str, Any]:
    couple_id = _require_couple(current_user)
    lid = new_id()
    now = utcnow()
    log_date = body.log_date or local_today()
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO intimacy_logs (id, couple_id, user_id, score, note, log_date, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (lid, couple_id, current_user["id"], body.score, body.note, log_date, now),
        )
        row = row_to_dict(conn.execute("SELECT * FROM intimacy_logs WHERE id = ?", (lid,)).fetchone())
        score = compute_intimacy_score(conn, couple_id)
    return {"log": row, **score}


@router.get("/members")
def couple_members(current_user: dict = Depends(get_current_user)) -> list[dict[str, Any]]:
    couple_id = _require_couple(current_user)
    with get_db() as conn:
        couple = row_to_dict(conn.execute("SELECT * FROM couples WHERE id = ?", (couple_id,)).fetchone())
        members = []
        for uid in (couple["user_a_id"], couple.get("user_b_id")):
            if uid:
                u = row_to_dict(conn.execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone())
                if u:
                    members.append(public_user(u))
    return members


def _serialize_wish(row: dict) -> dict[str, Any]:
    return {
        "id": row["id"],
        "text": row["text"],
        "done": bool(row["done"]),
        "sort_order": row["sort_order"],
        "created_by": row["created_by"],
        "created_at": row["created_at"],
    }


@router.get("/wishlist")
def list_wishlist(current_user: dict = Depends(get_current_user)) -> list[dict[str, Any]]:
    couple_id = _require_couple(current_user)
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM couple_wishlist WHERE couple_id = ? ORDER BY sort_order ASC, created_at DESC",
            (couple_id,),
        ).fetchall()
    return [_serialize_wish(dict(r)) for r in rows]


@router.post("/wishlist", status_code=201)
def create_wish(body: WishlistCreate, current_user: dict = Depends(get_current_user)) -> dict[str, Any]:
    couple_id = _require_couple(current_user)
    wid = new_id()
    now = utcnow()
    with get_db() as conn:
        min_order = conn.execute(
            "SELECT COALESCE(MIN(sort_order), 0) AS m FROM couple_wishlist WHERE couple_id = ?",
            (couple_id,),
        ).fetchone()["m"]
        conn.execute(
            """
            INSERT INTO couple_wishlist (id, couple_id, text, done, sort_order, created_by, created_at)
            VALUES (?, ?, ?, 0, ?, ?, ?)
            """,
            (wid, couple_id, body.text.strip(), min_order - 1, current_user["id"], now),
        )
        row = row_to_dict(conn.execute("SELECT * FROM couple_wishlist WHERE id = ?", (wid,)).fetchone())
    return _serialize_wish(row)


@router.put("/wishlist/{wish_id}")
def update_wish(
    wish_id: str, body: WishlistUpdate, current_user: dict = Depends(get_current_user)
) -> dict[str, Any]:
    couple_id = _require_couple(current_user)
    with get_db() as conn:
        row = row_to_dict(conn.execute("SELECT * FROM couple_wishlist WHERE id = ?", (wish_id,)).fetchone())
        if not row or row["couple_id"] != couple_id:
            raise HTTPException(status_code=404, detail="Wish not found")
        fields, values = [], []
        if body.text is not None:
            fields.append("text = ?")
            values.append(body.text.strip())
        if body.done is not None:
            fields.append("done = ?")
            values.append(1 if body.done else 0)
        if fields:
            values.append(wish_id)
            conn.execute(f"UPDATE couple_wishlist SET {', '.join(fields)} WHERE id = ?", values)
        updated = row_to_dict(conn.execute("SELECT * FROM couple_wishlist WHERE id = ?", (wish_id,)).fetchone())
    return _serialize_wish(updated)


@router.put("/wishlist/sort")
def sort_wishlist(
    items: list[WishlistSortItem], current_user: dict = Depends(get_current_user)
) -> list[dict[str, Any]]:
    couple_id = _require_couple(current_user)
    with get_db() as conn:
        for item in items:
            row = conn.execute(
                "SELECT couple_id FROM couple_wishlist WHERE id = ?", (item.id,)
            ).fetchone()
            if not row or row["couple_id"] != couple_id:
                continue
            conn.execute(
                "UPDATE couple_wishlist SET sort_order = ? WHERE id = ?",
                (item.sort_order, item.id),
            )
    return list_wishlist(current_user)


@router.delete("/wishlist/{wish_id}", status_code=204, response_class=Response)
def delete_wish(wish_id: str, current_user: dict = Depends(get_current_user)) -> Response:
    couple_id = _require_couple(current_user)
    with get_db() as conn:
        row = conn.execute("SELECT couple_id FROM couple_wishlist WHERE id = ?", (wish_id,)).fetchone()
        if not row or row["couple_id"] != couple_id:
            raise HTTPException(status_code=404, detail="Wish not found")
        conn.execute("DELETE FROM couple_wishlist WHERE id = ?", (wish_id,))
    return Response(status_code=204)


@router.get("/shared-note")
def get_shared_note(current_user: dict = Depends(get_current_user)) -> dict[str, Any]:
    couple_id = _require_couple(current_user)
    with get_db() as conn:
        row = row_to_dict(conn.execute("SELECT shared_note, shared_note_updated_at, shared_note_updated_by FROM couples WHERE id = ?", (couple_id,)).fetchone())
    if not row:
        raise HTTPException(status_code=404, detail="Couple not found")
    return {
        "note": row.get("shared_note") or "",
        "updated_at": row.get("shared_note_updated_at"),
        "updated_by": row.get("shared_note_updated_by"),
    }


@router.put("/shared-note")
def update_shared_note(body: SharedNoteUpdate, current_user: dict = Depends(get_current_user)) -> dict[str, Any]:
    couple_id = _require_couple(current_user)
    now = utcnow()
    note = body.note.strip()[:500]
    with get_db() as conn:
        conn.execute(
            "UPDATE couples SET shared_note = ?, shared_note_updated_at = ?, shared_note_updated_by = ? WHERE id = ?",
            (note, now, current_user["id"], couple_id),
        )
    return {"note": note, "updated_at": now, "updated_by": current_user["id"]}
