from __future__ import annotations

import json
import re
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.auth import get_current_user, public_user
from app.db import get_db, new_id, row_to_dict, utcnow
from app.routers.transactions import _check_tx_access
from app.schemas import CommentCreate
from app.ws import manager

router = APIRouter(prefix="/api/comments", tags=["comments"])


def _extract_mentions(content: str, members: list[dict]) -> list[str]:
    mentioned: list[str] = []
    for m in members:
        nick = m.get("nickname", "")
        if nick and f"@{nick}" in content:
            mentioned.append(m["id"])
    return mentioned


@router.get("/transaction/{tx_id}")
def list_comments(tx_id: str, current_user: dict = Depends(get_current_user)) -> list[dict[str, Any]]:
    with get_db() as conn:
        tx = row_to_dict(conn.execute("SELECT * FROM transactions WHERE id = ?", (tx_id,)).fetchone())
        if not tx:
            raise HTTPException(status_code=404, detail="Transaction not found")
        _check_tx_access(tx, current_user)

        rows = conn.execute(
            """
            SELECT c.*, u.nickname AS user_nickname, u.avatar_url AS user_avatar
            FROM tx_comments c JOIN users u ON u.id = c.user_id
            WHERE c.transaction_id = ? ORDER BY c.created_at ASC
            """,
            (tx_id,),
        ).fetchall()

    result = []
    for r in rows:
        d = dict(r)
        d["mentions"] = json.loads(d.get("mentions") or "[]")
        result.append(d)
    return result


@router.post("/transaction/{tx_id}", status_code=status.HTTP_201_CREATED)
async def create_comment(
    tx_id: str, body: CommentCreate, current_user: dict = Depends(get_current_user)
) -> dict[str, Any]:
    with get_db() as conn:
        tx = row_to_dict(conn.execute("SELECT * FROM transactions WHERE id = ?", (tx_id,)).fetchone())
        if not tx:
            raise HTTPException(status_code=404, detail="Transaction not found")
        _check_tx_access(tx, current_user)

        members: list[dict] = []
        if tx["scope"] == "couple" and tx.get("couple_id"):
            couple = row_to_dict(conn.execute("SELECT * FROM couples WHERE id = ?", (tx["couple_id"],)).fetchone())
            if couple:
                for uid in (couple["user_a_id"], couple.get("user_b_id")):
                    if uid:
                        u = row_to_dict(conn.execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone())
                        if u:
                            members.append(public_user(u))

        mentions = _extract_mentions(body.content, members)
        cid = new_id()
        now = utcnow()
        conn.execute(
            """
            INSERT INTO tx_comments (id, transaction_id, user_id, content, mentions, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (cid, tx_id, current_user["id"], body.content.strip(), json.dumps(mentions), now),
        )
        row = row_to_dict(conn.execute("SELECT * FROM tx_comments WHERE id = ?", (cid,)).fetchone())

    comment = {
        **row,
        "user_nickname": current_user["nickname"],
        "user_avatar": current_user.get("avatar_url"),
        "mentions": mentions,
    }

    if tx["scope"] == "couple" and tx.get("couple_id"):
        await manager.broadcast_couple(
            tx["couple_id"],
            {"event": "tx_comment", "data": {"transaction_id": tx_id, "comment": comment, "mentions": mentions}},
        )
        for uid in mentions:
            if uid != current_user["id"]:
                await manager.send_to_user(
                    tx["couple_id"],
                    uid,
                    {
                        "event": "mention",
                        "data": {
                            "user_id": uid,
                            "transaction_id": tx_id,
                            "from_nickname": current_user["nickname"],
                            "content": body.content[:100],
                        },
                    },
                )

    return comment


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_comment(comment_id: str, current_user: dict = Depends(get_current_user)) -> Response:
    couple_id = None
    tx_id = None
    with get_db() as conn:
        row = row_to_dict(conn.execute("SELECT * FROM tx_comments WHERE id = ?", (comment_id,)).fetchone())
        if not row:
            raise HTTPException(status_code=404, detail="Comment not found")
        if row["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Forbidden")
        tx = row_to_dict(conn.execute("SELECT * FROM transactions WHERE id = ?", (row["transaction_id"],)).fetchone())
        if tx:
            _check_tx_access(tx, current_user)
        tx_id = row["transaction_id"]
        couple_id = tx.get("couple_id") if tx else None
        conn.execute("DELETE FROM tx_comments WHERE id = ?", (comment_id,))
    if couple_id:
        await manager.broadcast_couple(
            couple_id,
            {"event": "comment_deleted", "data": {"comment_id": comment_id, "transaction_id": tx_id}},
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
