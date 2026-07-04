from __future__ import annotations

import random
import string
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth import get_current_user, public_user
from app.db import get_db, new_id, row_to_dict, utcnow
from app.feature_flags import require_feature
from app.schemas import CoupleJoinRequest
from app.ws import manager

router = APIRouter(
    prefix="/api/couple",
    tags=["couple"],
    dependencies=[Depends(require_feature("couple_pairing"))],
)

_NORMAL = "(tx_kind IS NULL OR tx_kind != 'transfer')"


def _generate_invite_code(conn) -> str:
    for _ in range(20):
        code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        exists = conn.execute("SELECT id FROM couples WHERE invite_code = ?", (code,)).fetchone()
        if not exists:
            return code
    raise HTTPException(status_code=500, detail="Failed to generate invite code")


def _upsert_membership(conn, user_id: str, couple_id: str) -> None:
    now = utcnow()
    existing = conn.execute(
        "SELECT joined_at FROM couple_memberships WHERE user_id = ? AND couple_id = ?",
        (user_id, couple_id),
    ).fetchone()
    if existing:
        conn.execute(
            "UPDATE couple_memberships SET left_at = NULL, joined_at = ? WHERE user_id = ? AND couple_id = ?",
            (now, user_id, couple_id),
        )
    else:
        conn.execute(
            "INSERT INTO couple_memberships (user_id, couple_id, joined_at, left_at) VALUES (?, ?, ?, NULL)",
            (user_id, couple_id, now),
        )


def _mark_left(conn, user_id: str, couple_id: str) -> None:
    now = utcnow()
    row = conn.execute(
        "SELECT joined_at FROM couple_memberships WHERE user_id = ? AND couple_id = ?",
        (user_id, couple_id),
    ).fetchone()
    if row:
        conn.execute(
            "UPDATE couple_memberships SET left_at = ? WHERE user_id = ? AND couple_id = ?",
            (now, user_id, couple_id),
        )
    else:
        conn.execute(
            "INSERT INTO couple_memberships (user_id, couple_id, joined_at, left_at) VALUES (?, ?, ?, ?)",
            (user_id, couple_id, now, now),
        )


def _assert_archive_access(conn, user_id: str, couple_id: str) -> None:
    row = conn.execute(
        """
        SELECT left_at FROM couple_memberships
        WHERE user_id = ? AND couple_id = ? AND left_at IS NOT NULL
        """,
        (user_id, couple_id),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=403, detail="No access to this couple archive")


def _couple_payload(couple_row: dict, current_user_id: str, conn) -> dict[str, Any]:
    partner_id = couple_row["user_b_id"] if couple_row["user_a_id"] == current_user_id else couple_row["user_a_id"]
    partner = None
    if partner_id:
        partner_row = conn.execute("SELECT * FROM users WHERE id = ?", (partner_id,)).fetchone()
        if partner_row:
            partner = public_user(row_to_dict(partner_row))
    return {
        "id": couple_row["id"],
        "invite_code": couple_row["invite_code"],
        "user_a_id": couple_row["user_a_id"],
        "user_b_id": couple_row["user_b_id"],
        "partner": partner,
        "created_at": couple_row["created_at"],
        "is_paired": couple_row["user_b_id"] is not None,
    }


@router.post("/create")
def create_couple(current_user: dict = Depends(get_current_user)) -> dict[str, Any]:
    if current_user.get("couple_id"):
        raise HTTPException(status_code=400, detail="Already in a couple")

    with get_db() as conn:
        couple_id = new_id()
        invite_code = _generate_invite_code(conn)
        now = utcnow()
        conn.execute(
            "INSERT INTO couples (id, invite_code, user_a_id, user_b_id, created_at) VALUES (?, ?, ?, NULL, ?)",
            (couple_id, invite_code, current_user["id"], now),
        )
        conn.execute("UPDATE users SET couple_id = ? WHERE id = ?", (couple_id, current_user["id"]))
        _upsert_membership(conn, current_user["id"], couple_id)
        couple = row_to_dict(conn.execute("SELECT * FROM couples WHERE id = ?", (couple_id,)).fetchone())
        return _couple_payload(couple, current_user["id"], conn)


@router.post("/join")
async def join_couple(body: CoupleJoinRequest, current_user: dict = Depends(get_current_user)) -> dict[str, Any]:
    if current_user.get("couple_id"):
        raise HTTPException(status_code=400, detail="Already in a couple")

    code = body.invite_code.strip().upper()
    with get_db() as conn:
        couple_row = conn.execute("SELECT * FROM couples WHERE invite_code = ?", (code,)).fetchone()
        couple = row_to_dict(couple_row)
        if not couple:
            raise HTTPException(status_code=404, detail="Invite code not found")
        if couple["user_a_id"] == current_user["id"]:
            raise HTTPException(status_code=400, detail="Cannot join your own invite")
        if couple["user_b_id"]:
            raise HTTPException(status_code=400, detail="Couple already paired")
        if not couple["user_a_id"]:
            raise HTTPException(status_code=400, detail="Invite code expired")
        creator = conn.execute(
            "SELECT couple_id FROM users WHERE id = ?", (couple["user_a_id"],)
        ).fetchone()
        if not creator or creator["couple_id"] != couple["id"]:
            raise HTTPException(status_code=400, detail="Invite code expired")

        cur = conn.execute(
            "UPDATE couples SET user_b_id = ? WHERE id = ? AND user_b_id IS NULL",
            (current_user["id"], couple["id"]),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=400, detail="Couple already paired")
        cur = conn.execute(
            "UPDATE users SET couple_id = ? WHERE id = ? AND couple_id IS NULL",
            (couple["id"], current_user["id"]),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=400, detail="Already in a couple")
        _upsert_membership(conn, current_user["id"], couple["id"])
        _upsert_membership(conn, couple["user_a_id"], couple["id"])
        couple = row_to_dict(conn.execute("SELECT * FROM couples WHERE id = ?", (couple["id"],)).fetchone())
        payload = _couple_payload(couple, current_user["id"], conn)

    await manager.broadcast_couple(
        couple["id"],
        {
            "event": "couple_paired",
            "data": {
                "user_id": current_user["id"],
                "nickname": current_user["nickname"],
                "couple_id": couple["id"],
            },
        },
    )
    return payload


@router.post("/leave")
async def leave_couple(current_user: dict = Depends(get_current_user)) -> dict[str, str]:
    couple_id = current_user.get("couple_id")
    if not couple_id:
        raise HTTPException(status_code=400, detail="Not in a couple")

    leaver_id = current_user["id"]

    with get_db() as conn:
        couple = row_to_dict(conn.execute("SELECT * FROM couples WHERE id = ?", (couple_id,)).fetchone())
        if not couple:
            conn.execute("UPDATE users SET couple_id = NULL WHERE id = ?", (leaver_id,))
            await manager.disconnect_user(couple_id, leaver_id)
            return {"message": "已解除绑定"}

        partner_id = couple["user_b_id"] if couple["user_a_id"] == leaver_id else couple["user_a_id"]
        conn.execute("UPDATE users SET couple_id = NULL WHERE id = ?", (leaver_id,))
        _mark_left(conn, leaver_id, couple_id)

        if couple["user_a_id"] == leaver_id:
            if partner_id:
                conn.execute(
                    "UPDATE couples SET user_a_id = ?, user_b_id = NULL WHERE id = ?",
                    (partner_id, couple_id),
                )
                _upsert_membership(conn, partner_id, couple_id)
            else:
                tx_count = conn.execute(
                    "SELECT COUNT(*) AS c FROM transactions WHERE couple_id = ?", (couple_id,)
                ).fetchone()["c"]
                if tx_count == 0:
                    conn.execute("DELETE FROM couples WHERE id = ?", (couple_id,))
                else:
                    conn.execute(
                        "UPDATE couples SET user_a_id = NULL, user_b_id = NULL, invite_code = ? WHERE id = ?",
                        (_generate_invite_code(conn), couple_id),
                    )
        else:
            conn.execute("UPDATE couples SET user_b_id = NULL WHERE id = ?", (couple_id,))

    await manager.broadcast_couple(
        couple_id,
        {"event": "couple_left", "data": {"user_id": leaver_id}},
        exclude_user=leaver_id,
    )
    await manager.disconnect_user(couple_id, leaver_id)
    return {"message": "你已退出情侣空间，可在「历史情侣账本」中只读查看"}


@router.get("")
def get_couple(current_user: dict = Depends(get_current_user)) -> dict[str, Any] | None:
    if not current_user.get("couple_id"):
        return None
    with get_db() as conn:
        couple = row_to_dict(conn.execute("SELECT * FROM couples WHERE id = ?", (current_user["couple_id"],)).fetchone())
        if not couple:
            return None
        return _couple_payload(couple, current_user["id"], conn)


@router.get("/archives")
def list_archives(current_user: dict = Depends(get_current_user)) -> list[dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT cm.couple_id, cm.left_at, cm.joined_at,
                   (SELECT COUNT(*) FROM transactions WHERE couple_id = cm.couple_id) AS tx_count
            FROM couple_memberships cm
            WHERE cm.user_id = ? AND cm.left_at IS NOT NULL
            ORDER BY cm.left_at DESC
            """,
            (current_user["id"],),
        ).fetchall()
    return [
        {
            "couple_id": r["couple_id"],
            "left_at": r["left_at"],
            "joined_at": r["joined_at"],
            "tx_count": r["tx_count"],
        }
        for r in rows
    ]


@router.get("/archives/{couple_id}/summary")
def archive_summary(
    couple_id: str,
    month: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    with get_db() as conn:
        _assert_archive_access(conn, current_user["id"], couple_id)
        date_clause = ""
        params: list[Any] = [couple_id]
        if month:
            date_clause = " AND tx_date LIKE ?"
            params.append(f"{month}%")
        totals = {
            r["type"]: float(r["total"])
            for r in conn.execute(
                f"""
                SELECT type, SUM(amount) AS total FROM transactions
                WHERE scope = 'couple' AND couple_id = ? AND {_NORMAL}{date_clause}
                GROUP BY type
                """,
                params,
            ).fetchall()
        }
    income = totals.get("income", 0.0)
    expense = totals.get("expense", 0.0)
    return {
        "couple_id": couple_id,
        "month": month,
        "income": round(income, 2),
        "expense": round(expense, 2),
        "balance": round(income - expense, 2),
        "read_only": True,
    }


@router.get("/archives/{couple_id}/transactions")
def archive_transactions(
    couple_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    with get_db() as conn:
        _assert_archive_access(conn, current_user["id"], couple_id)
        total = conn.execute(
            f"SELECT COUNT(*) AS c FROM transactions WHERE scope='couple' AND couple_id=? AND {_NORMAL}",
            (couple_id,),
        ).fetchone()["c"]
        rows = conn.execute(
            f"""
            SELECT * FROM transactions
            WHERE scope = 'couple' AND couple_id = ? AND {_NORMAL}
            ORDER BY tx_date DESC, created_at DESC
            LIMIT ? OFFSET ?
            """,
            (couple_id, limit, offset),
        ).fetchall()
    from app.routers.transactions import _serialize_tx

    items = [_serialize_tx(row_to_dict(r)) for r in rows]
    return {"items": items, "total": total, "limit": limit, "offset": offset, "read_only": True}
