from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from app.auth import get_current_user
from app.db import (
    _tx_total_for_account,
    apply_balance_delta,
    get_db,
    new_id,
    recompute_account_balances,
    row_to_dict,
    utcnow,
)
from app.schemas import AccountCreate, AccountUpdate, TransferCreate
from app.ws import manager

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


def _serialize(row: dict) -> dict[str, Any]:
    return {
        "id": row["id"],
        "scope": row["scope"],
        "user_id": row["user_id"],
        "couple_id": row.get("couple_id"),
        "name": row["name"],
        "kind": row["kind"],
        "balance": round(row["balance"], 2),
        "opening_balance": round(row.get("opening_balance") or 0.0, 2),
        "currency": row["currency"],
        "is_archived": bool(row["is_archived"]),
        "created_at": row["created_at"],
    }


def _scope_owner(user: dict, scope: str) -> str:
    if scope == "couple":
        if not user.get("couple_id"):
            raise HTTPException(status_code=400, detail="Couple mode requires pairing first")
        return user["couple_id"]
    return user["id"]


def _fetch_account(conn, account_id: str, user: dict, scope: str | None = None) -> dict:
    row = row_to_dict(conn.execute("SELECT * FROM accounts WHERE id = ?", (account_id,)).fetchone())
    if not row:
        raise HTTPException(status_code=404, detail="Account not found")
    owns = row["scope"] == "personal" and row["user_id"] == user["id"]
    shared = row["scope"] == "couple" and row.get("couple_id") == user.get("couple_id")
    if not owns and not shared:
        raise HTTPException(status_code=403, detail="Forbidden")
    if scope is not None and row["scope"] != scope:
        raise HTTPException(status_code=400, detail="Account scope mismatch")
    return row


@router.get("")
def list_accounts(
    scope: Literal["personal", "couple"] = Query("personal"),
    include_archived: bool = Query(False),
    current_user: dict = Depends(get_current_user),
) -> list[dict[str, Any]]:
    owner = _scope_owner(current_user, scope)
    owner_col = "user_id" if scope == "personal" else "couple_id"
    query = f"SELECT * FROM accounts WHERE scope = ? AND {owner_col} = ?"
    params: list[Any] = [scope, owner]
    if not include_archived:
        query += " AND is_archived = 0"
    query += " ORDER BY is_archived, created_at"
    with get_db() as conn:
        rows = conn.execute(query, params).fetchall()
    return [_serialize(row_to_dict(r)) for r in rows]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_account(body: AccountCreate, current_user: dict = Depends(get_current_user)) -> dict[str, Any]:
    couple_id = _scope_owner(current_user, body.scope) if body.scope == "couple" else None
    account_id = new_id()
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO accounts (id, scope, user_id, couple_id, name, kind, balance, opening_balance, currency, is_archived, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
            """,
            (
                account_id,
                body.scope,
                current_user["id"],
                couple_id,
                body.name,
                body.kind,
                body.balance,
                body.balance,
                body.currency,
                utcnow(),
            ),
        )
        row = row_to_dict(conn.execute("SELECT * FROM accounts WHERE id = ?", (account_id,)).fetchone())
    if body.scope == "couple" and couple_id:
        await manager.broadcast_couple(couple_id, {"event": "accounts_updated", "data": {"action": "create"}})
    return _serialize(row)


@router.put("/{account_id}")
async def update_account(
    account_id: str,
    body: AccountUpdate,
    current_user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    couple_id = None
    with get_db() as conn:
        existing = _fetch_account(conn, account_id, current_user)
        couple_id = existing.get("couple_id") if existing.get("scope") == "couple" else None
        fields: list[str] = []
        values: list[Any] = []
        for key in ("name", "kind", "currency"):
            val = getattr(body, key)
            if val is not None:
                fields.append(f"{key} = ?")
                values.append(val)
        if body.balance is not None:
            tx_total = _tx_total_for_account(conn, account_id)
            fields.append("balance = ?")
            values.append(round(body.balance, 2))
            fields.append("opening_balance = ?")
            values.append(round(body.balance - tx_total, 2))
        if body.is_archived is not None:
            fields.append("is_archived = ?")
            values.append(1 if body.is_archived else 0)
        if fields:
            values.append(account_id)
            conn.execute(f"UPDATE accounts SET {', '.join(fields)} WHERE id = ?", values)
        row = row_to_dict(conn.execute("SELECT * FROM accounts WHERE id = ?", (account_id,)).fetchone())
    if couple_id:
        await manager.broadcast_couple(couple_id, {"event": "accounts_updated", "data": {"action": "update"}})
    return _serialize(row)


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_account(account_id: str, current_user: dict = Depends(get_current_user)) -> Response:
    couple_id = None
    with get_db() as conn:
        existing = _fetch_account(conn, account_id, current_user)
        couple_id = existing.get("couple_id") if existing.get("scope") == "couple" else None
        linked = conn.execute(
            "SELECT COUNT(*) AS c FROM transactions WHERE account_id = ? OR transfer_to_account_id = ?",
            (account_id, account_id),
        ).fetchone()["c"]
        if linked:
            conn.execute("UPDATE accounts SET is_archived = 1 WHERE id = ?", (account_id,))
        else:
            conn.execute("DELETE FROM accounts WHERE id = ?", (account_id,))
    if couple_id:
        await manager.broadcast_couple(couple_id, {"event": "accounts_updated", "data": {"action": "delete"}})
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/transfer", status_code=status.HTTP_201_CREATED)
async def create_transfer(body: TransferCreate, current_user: dict = Depends(get_current_user)) -> dict[str, Any]:
    if body.from_account_id == body.to_account_id:
        raise HTTPException(status_code=400, detail="Cannot transfer to the same account")
    couple_id = _scope_owner(current_user, body.scope) if body.scope == "couple" else None
    tx_id = new_id()
    now = utcnow()
    with get_db() as conn:
        _fetch_account(conn, body.from_account_id, current_user, body.scope)
        _fetch_account(conn, body.to_account_id, current_user, body.scope)
        conn.execute(
            """
            INSERT INTO transactions
            (id, scope, user_id, couple_id, amount, category, type, note, tx_date,
             created_by, created_at, account_id, transfer_to_account_id, tx_kind)
            VALUES (?, ?, ?, ?, ?, '转账', 'expense', ?, ?, ?, ?, ?, ?, 'transfer')
            """,
            (
                tx_id,
                body.scope,
                current_user["id"],
                couple_id,
                body.amount,
                body.note,
                body.tx_date,
                current_user["id"],
                now,
                body.from_account_id,
                body.to_account_id,
            ),
        )
        apply_balance_delta(conn, body.from_account_id, -body.amount)
        apply_balance_delta(conn, body.to_account_id, body.amount)
        row = row_to_dict(conn.execute("SELECT * FROM transactions WHERE id = ?", (tx_id,)).fetchone())

    if body.scope == "couple" and couple_id:
        from app.routers.transactions import _serialize_tx

        await manager.broadcast_couple(couple_id, {"event": "transaction_created", "data": _serialize_tx(row)})
    return dict(row)


@router.post("/recompute")
async def recompute_balances(
    scope: Literal["personal", "couple"] = Query("personal"),
    current_user: dict = Depends(get_current_user),
) -> list[dict[str, Any]]:
    """Recalculate every account balance in scope from its transactions (drift repair)."""
    owner = _scope_owner(current_user, scope)
    owner_col = "user_id" if scope == "personal" else "couple_id"
    couple_id = owner if scope == "couple" else None
    with get_db() as conn:
        ids = [
            r["id"]
            for r in conn.execute(
                f"SELECT id FROM accounts WHERE scope = ? AND {owner_col} = ?", (scope, owner)
            ).fetchall()
        ]
        recompute_account_balances(conn, ids)
        rows = conn.execute(
            f"SELECT * FROM accounts WHERE scope = ? AND {owner_col} = ? ORDER BY is_archived, created_at",
            (scope, owner),
        ).fetchall()
    if couple_id:
        await manager.broadcast_couple(couple_id, {"event": "accounts_updated", "data": {"action": "recompute"}})
    return [_serialize(row_to_dict(r)) for r in rows]
