from __future__ import annotations

import re
from datetime import datetime, timedelta
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from app.auth import get_current_user
from app.db import (
    apply_balance_delta,
    balance_delta_for_tx,
    get_db,
    local_today,
    new_id,
    row_to_dict,
    utcnow,
)
from app.schemas import (
    CategoryCreate,
    CategorySortItem,
    CategoryUpdate,
    RecurringBillCreate,
    RecurringBillUpdate,
    TransactionCreate,
    TransactionUpdate,
)
from app.ws import manager

router = APIRouter(prefix="/api/transactions", tags=["transactions"])

_NORMAL = "(tx_kind IS NULL OR tx_kind != 'transfer')"


def _escape_like(keyword: str) -> str:
    return keyword.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _couple_member_ids(conn, couple_id: str | None) -> set[str]:
    if not couple_id:
        return set()
    couple = row_to_dict(conn.execute("SELECT user_a_id, user_b_id FROM couples WHERE id = ?", (couple_id,)).fetchone())
    if not couple:
        return set()
    ids = {couple["user_a_id"]}
    if couple.get("user_b_id"):
        ids.add(couple["user_b_id"])
    return ids


def _validate_split_fields(
    conn,
    user: dict,
    scope: str,
    couple_id: str | None,
    paid_by: str | None,
    attributed_to: str | None,
    split_type: str | None,
) -> tuple[str, str | None, str]:
    st = split_type or "none"
    if st not in ("none", "aa", "payer", "partner"):
        st = "none"
    if scope != "couple":
        return user["id"], attributed_to, "none"
    members = _couple_member_ids(conn, couple_id)
    pb = paid_by or user["id"]
    if pb not in members:
        raise HTTPException(status_code=400, detail="付款人必须是情侣成员")
    if attributed_to and attributed_to not in members:
        raise HTTPException(status_code=400, detail="归属人必须是情侣成员")
    if st == "partner" and (not attributed_to or attributed_to not in members):
        raise HTTPException(status_code=400, detail="对方付模式需指定归属人")
    if st != "partner":
        attributed_to = None
    return pb, attributed_to, st


async def _broadcast_categories(user: dict) -> None:
    if user.get("couple_id"):
        await manager.broadcast_couple(user["couple_id"], {"event": "categories_updated", "data": {}})


def _serialize_tx(row: dict) -> dict[str, Any]:
    return {
        "id": row["id"],
        "scope": row["scope"],
        "user_id": row["user_id"],
        "couple_id": row.get("couple_id"),
        "amount": row["amount"],
        "category": row["category"],
        "type": row["type"],
        "tx_kind": row.get("tx_kind") or "normal",
        "note": row.get("note") or "",
        "tx_date": row["tx_date"],
        "account_id": row.get("account_id"),
        "transfer_to_account_id": row.get("transfer_to_account_id"),
        "paid_by": row.get("paid_by"),
        "split_type": row.get("split_type") or "none",
        "attributed_to": row.get("attributed_to"),
        "created_by": row["created_by"],
        "created_at": row["created_at"],
    }


def _validate_scope_access(user: dict, scope: str) -> None:
    if scope == "couple" and not user.get("couple_id"):
        raise HTTPException(status_code=400, detail="Couple mode requires pairing first")


def _check_tx_access(row: dict, user: dict) -> None:
    if row["scope"] == "personal" and row["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    if row["scope"] == "couple" and row["couple_id"] != user.get("couple_id"):
        raise HTTPException(status_code=403, detail="Forbidden")


def _validate_account(conn, account_id: str | None, user: dict, scope: str) -> None:
    if not account_id:
        return
    acc = row_to_dict(conn.execute("SELECT * FROM accounts WHERE id = ?", (account_id,)).fetchone())
    if not acc:
        raise HTTPException(status_code=400, detail="Account not found")
    if acc["scope"] != scope:
        raise HTTPException(status_code=400, detail="Account scope mismatch")
    if scope == "personal" and acc["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden account")
    if scope == "couple" and acc["couple_id"] != user.get("couple_id"):
        raise HTTPException(status_code=403, detail="Forbidden account")


def _next_due_date(current: str, frequency: str) -> str:
    dt = datetime.strptime(current[:10], "%Y-%m-%d")
    if frequency == "daily":
        dt += timedelta(days=1)
    elif frequency == "weekly":
        dt += timedelta(weeks=1)
    elif frequency == "monthly":
        month = dt.month + 1
        year = dt.year
        if month > 12:
            month = 1
            year += 1
        day = min(dt.day, 28)
        dt = dt.replace(year=year, month=month, day=day)
    elif frequency == "yearly":
        dt = dt.replace(year=dt.year + 1)
    return dt.strftime("%Y-%m-%d")


@router.get("")
def list_transactions(
    scope: Literal["personal", "couple"] = Query("personal"),
    month: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    account_id: Optional[str] = Query(None),
    tx_type: Optional[Literal["income", "expense"]] = Query(None, alias="type"),
    keyword: Optional[str] = Query(None),
    min_amount: Optional[float] = Query(None, ge=0),
    max_amount: Optional[float] = Query(None, ge=0),
    tx_date: Optional[str] = Query(None),
    all_months: bool = Query(False, description="Search across all months when keyword is set"),
    include_total: bool = Query(False),
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
) -> list[dict[str, Any]] | dict[str, Any]:
    _validate_scope_access(current_user, scope)

    base = "SELECT * FROM transactions WHERE "
    count_base = "SELECT COUNT(*) AS c FROM transactions WHERE "
    params: list[Any] = []

    if scope == "personal":
        base += "scope = 'personal' AND user_id = ?"
        count_base += "scope = 'personal' AND user_id = ?"
        params.append(current_user["id"])
    else:
        base += "scope = 'couple' AND couple_id = ?"
        count_base += "scope = 'couple' AND couple_id = ?"
        params.append(current_user["couple_id"])

    filters = ""
    filter_params: list[Any] = []
    if month and not (keyword and all_months):
        filters += " AND tx_date LIKE ?"
        filter_params.append(f"{month}%")
    if tx_date:
        filters += " AND tx_date LIKE ?"
        filter_params.append(f"{tx_date}%")
    if category:
        filters += " AND category = ?"
        filter_params.append(category)
    if account_id:
        filters += " AND (account_id = ? OR transfer_to_account_id = ?)"
        filter_params.extend([account_id, account_id])
    if tx_type:
        filters += " AND type = ? AND (tx_kind IS NULL OR tx_kind = 'normal')"
        filter_params.append(tx_type)
    if keyword:
        kw = keyword.strip()
        if re.fullmatch(r"\d+\.?\d*", kw):
            filters += " AND CAST(amount AS TEXT) LIKE ?"
            filter_params.append(f"%{kw}%")
        else:
            esc = _escape_like(kw)
            filters += " AND (note LIKE ? ESCAPE '\\' OR category LIKE ? ESCAPE '\\')"
            filter_params.extend([f"%{esc}%", f"%{esc}%"])

    if min_amount is not None:
        filters += " AND amount >= ?"
        filter_params.append(min_amount)
    if max_amount is not None:
        filters += " AND amount <= ?"
        filter_params.append(max_amount)

    with get_db() as conn:
        total = None
        if include_total:
            total = conn.execute(count_base + filters, params + filter_params).fetchone()["c"]
        query = base + filters + " ORDER BY tx_date DESC, created_at DESC LIMIT ? OFFSET ?"
        rows = conn.execute(query, params + filter_params + [limit, offset]).fetchall()

    items = [_serialize_tx(row_to_dict(r)) for r in rows]
    if include_total:
        return {"items": items, "total": total, "limit": limit, "offset": offset}
    return items


@router.get("/duplicates")
def duplicate_candidates(
    scope: Literal["personal", "couple"] = Query("personal"),
    month: Optional[str] = Query(None, description="Month filter like YYYY-MM"),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    _validate_scope_access(current_user, scope)

    owner_col = "user_id" if scope == "personal" else "couple_id"
    owner_id = current_user["id"] if scope == "personal" else current_user["couple_id"]
    filters = f"scope = ? AND {owner_col} = ? AND {_NORMAL}"
    params: list[Any] = [scope, owner_id]
    if month:
        filters += " AND tx_date LIKE ?"
        params.append(f"{month}%")

    groups: list[dict[str, Any]] = []
    total_duplicates = 0
    with get_db() as conn:
        group_rows = conn.execute(
            f"""
            SELECT tx_date, type, ROUND(amount, 2) AS amount_key, COALESCE(note, '') AS note_key,
                   COUNT(*) AS count, MAX(created_at) AS newest_created
            FROM transactions
            WHERE {filters}
            GROUP BY tx_date, type, ROUND(amount, 2), COALESCE(note, '')
            HAVING COUNT(*) > 1
            ORDER BY count DESC, tx_date DESC, newest_created DESC
            LIMIT ?
            """,
            (*params, limit),
        ).fetchall()

        for group in group_rows:
            amount_key = float(group["amount_key"])
            rows = conn.execute(
                f"""
                SELECT * FROM transactions
                WHERE {filters}
                  AND tx_date = ? AND type = ?
                  AND ABS(ROUND(amount, 2) - ?) < 0.001
                  AND COALESCE(note, '') = ?
                ORDER BY created_at ASC, id ASC
                """,
                (*params, group["tx_date"], group["type"], amount_key, group["note_key"]),
            ).fetchall()
            txs = [_serialize_tx(row_to_dict(row)) for row in rows]
            if len(txs) < 2:
                continue

            duplicate_count = len(txs) - 1
            note = group["note_key"] or ""
            total_duplicates += duplicate_count
            groups.append(
                {
                    "key": {
                        "tx_date": group["tx_date"],
                        "type": group["type"],
                        "amount": round(amount_key, 2),
                        "note": note,
                    },
                    "count": len(txs),
                    "duplicate_count": duplicate_count,
                    "duplicate_amount": round(amount_key * duplicate_count, 2),
                    "categories": sorted({tx["category"] for tx in txs if tx.get("category")}),
                    "confidence": "high" if note.strip() else "medium",
                    "reason": "日期、类型、金额、备注完全一致" if note.strip() else "日期、类型、金额一致，但备注为空，建议人工确认",
                    "recommended_keep_id": txs[0]["id"],
                    "removable_ids": [tx["id"] for tx in txs[1:]],
                    "transactions": txs,
                }
            )

    return {
        "scope": scope,
        "month": month,
        "total_groups": len(groups),
        "total_duplicates": total_duplicates,
        "groups": groups,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_transaction(
    body: TransactionCreate,
    current_user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    _validate_scope_access(current_user, body.scope)

    if body.tx_kind == "transfer":
        if not body.account_id or not body.transfer_to_account_id:
            raise HTTPException(status_code=400, detail="Transfer requires from and to accounts")
        if body.account_id == body.transfer_to_account_id:
            raise HTTPException(status_code=400, detail="Cannot transfer to the same account")

    tx_id = new_id()
    now = utcnow()
    couple_id = current_user.get("couple_id") if body.scope == "couple" else None

    with get_db() as conn:
        _validate_account(conn, body.account_id, current_user, body.scope)
        if body.transfer_to_account_id:
            _validate_account(conn, body.transfer_to_account_id, current_user, body.scope)
        paid_by, attributed_to, split_type = _validate_split_fields(
            conn, current_user, body.scope, couple_id,
            body.paid_by, body.attributed_to, body.split_type,
        )

        conn.execute(
            """
            INSERT INTO transactions
            (id, scope, user_id, couple_id, amount, category, type, note, tx_date,
             created_by, created_at, account_id, transfer_to_account_id, tx_kind,
             paid_by, split_type, attributed_to)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                tx_id,
                body.scope,
                current_user["id"],
                couple_id,
                body.amount,
                body.category,
                body.type,
                body.note,
                body.tx_date,
                current_user["id"],
                now,
                body.account_id,
                body.transfer_to_account_id,
                body.tx_kind,
                paid_by,
                split_type,
                attributed_to,
            ),
        )
        row = row_to_dict(conn.execute("SELECT * FROM transactions WHERE id = ?", (tx_id,)).fetchone())
        for acc_id, delta in balance_delta_for_tx(row):
            apply_balance_delta(conn, acc_id, delta)

    tx = _serialize_tx(row)
    if body.scope == "couple" and couple_id:
        await manager.broadcast_couple(couple_id, {"event": "transaction_created", "data": tx})
    return tx


@router.get("/categories/list")
def list_categories(current_user: dict = Depends(get_current_user)) -> list[dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT * FROM categories
            WHERE owner_user_id IS NULL OR owner_user_id = ?
            ORDER BY type, sort_order, name
            """,
            (current_user["id"],),
        ).fetchall()
    return [
        {
            "id": r["id"],
            "name": r["name"],
            "icon": r["icon"],
            "type": r["type"],
            "sort_order": r["sort_order"] if "sort_order" in r.keys() else 0,
            "is_custom": r["owner_user_id"] is not None,
        }
        for r in rows
    ]


@router.post("/categories", status_code=status.HTTP_201_CREATED)
async def create_category(
    body: CategoryCreate,
    current_user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    cat_id = new_id()
    now = utcnow()
    with get_db() as conn:
        max_order = conn.execute(
            "SELECT COALESCE(MAX(sort_order), 0) AS m FROM categories WHERE type = ? AND (owner_user_id IS NULL OR owner_user_id = ?)",
            (body.type, current_user["id"]),
        ).fetchone()["m"]
        conn.execute(
            "INSERT INTO categories (id, owner_user_id, name, icon, type, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (cat_id, current_user["id"], body.name.strip(), body.icon, body.type, max_order + 1, now),
        )
        row = row_to_dict(conn.execute("SELECT * FROM categories WHERE id = ?", (cat_id,)).fetchone())
    result = {
        "id": row["id"],
        "name": row["name"],
        "icon": row["icon"],
        "type": row["type"],
        "sort_order": row.get("sort_order", 0),
        "is_custom": True,
    }
    await _broadcast_categories(current_user)
    return result


@router.put("/categories/{cat_id}")
async def update_category(
    cat_id: str,
    body: CategoryUpdate,
    current_user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    with get_db() as conn:
        row = row_to_dict(conn.execute("SELECT * FROM categories WHERE id = ?", (cat_id,)).fetchone())
        if not row:
            raise HTTPException(status_code=404, detail="Category not found")
        if row["owner_user_id"] is None:
            raise HTTPException(status_code=403, detail="Cannot edit system categories")
        if row["owner_user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Forbidden")

        old_name = row["name"]
        fields = []
        values: list[Any] = []
        for key in ("name", "icon", "type", "sort_order"):
            val = getattr(body, key)
            if val is not None:
                fields.append(f"{key} = ?")
                values.append(val.strip() if key == "name" else val)
        if fields:
            values.append(cat_id)
            conn.execute(f"UPDATE categories SET {', '.join(fields)} WHERE id = ?", values)

        # Category is referenced by name across history; propagate a rename so existing
        # transactions / budgets / recurring bills keep pointing at the same category.
        new_name = body.name.strip() if body.name is not None else None
        if new_name and new_name != old_name:
            scope_filter = "(user_id = ? OR couple_id = ?)"
            scope_params = (current_user["id"], current_user.get("couple_id"))
            conn.execute(
                f"UPDATE transactions SET category = ? WHERE category = ? AND {scope_filter}",
                (new_name, old_name, *scope_params),
            )
            conn.execute(
                f"UPDATE recurring_bills SET category = ? WHERE category = ? AND {scope_filter}",
                (new_name, old_name, *scope_params),
            )
            conn.execute(
                "UPDATE category_budgets SET category = ? WHERE category = ? AND owner_id IN (?, ?)",
                (new_name, old_name, current_user["id"], current_user.get("couple_id")),
            )

        updated = row_to_dict(conn.execute("SELECT * FROM categories WHERE id = ?", (cat_id,)).fetchone())

    result = {
        "id": updated["id"],
        "name": updated["name"],
        "icon": updated["icon"],
        "type": updated["type"],
        "sort_order": updated.get("sort_order", 0),
        "is_custom": True,
    }
    await _broadcast_categories(current_user)
    return result


@router.delete("/categories/{cat_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_category(cat_id: str, current_user: dict = Depends(get_current_user)) -> Response:
    with get_db() as conn:
        row = row_to_dict(conn.execute("SELECT * FROM categories WHERE id = ?", (cat_id,)).fetchone())
        if not row:
            raise HTTPException(status_code=404, detail="Category not found")
        if row["owner_user_id"] is None:
            raise HTTPException(status_code=403, detail="Cannot delete system categories")
        if row["owner_user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Forbidden")

        # Refuse to delete a category that still has transactions, so history is never
        # left pointing at a category name that no longer exists.
        in_use = conn.execute(
            "SELECT COUNT(*) AS c FROM transactions WHERE category = ? AND (user_id = ? OR couple_id = ?)",
            (row["name"], current_user["id"], current_user.get("couple_id")),
        ).fetchone()["c"]
        if in_use:
            raise HTTPException(
                status_code=400,
                detail=f"该分类下还有 {in_use} 笔账单，请先修改这些账单的分类后再删除",
            )
        conn.execute("DELETE FROM categories WHERE id = ?", (cat_id,))
    await _broadcast_categories(current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/categories/sort")
async def sort_categories(
    items: list[CategorySortItem],
    current_user: dict = Depends(get_current_user),
) -> list[dict[str, Any]]:
    with get_db() as conn:
        for item in items:
            row = row_to_dict(conn.execute("SELECT * FROM categories WHERE id = ?", (item.id,)).fetchone())
            if not row:
                continue
            if row["owner_user_id"] is None:
                raise HTTPException(status_code=403, detail="Cannot reorder system categories")
            if row["owner_user_id"] != current_user["id"]:
                raise HTTPException(status_code=403, detail="Forbidden")
            conn.execute("UPDATE categories SET sort_order = ? WHERE id = ?", (item.sort_order, item.id))
    result = list_categories(current_user)
    await _broadcast_categories(current_user)
    return result


@router.get("/recurring")
def list_recurring_bills(
    scope: Literal["personal", "couple"] = Query("personal"),
    current_user: dict = Depends(get_current_user),
) -> list[dict[str, Any]]:
    _validate_scope_access(current_user, scope)

    query = "SELECT * FROM recurring_bills WHERE scope = ?"
    params: list[Any] = [scope]
    if scope == "personal":
        query += " AND user_id = ?"
        params.append(current_user["id"])
    else:
        query += " AND couple_id = ?"
        params.append(current_user["couple_id"])
    query += " ORDER BY next_due_date ASC"

    with get_db() as conn:
        rows = conn.execute(query, params).fetchall()
        dict_rows = [row_to_dict(r) for r in rows]
        _auto_resume_paused_bills(conn, dict_rows)

    return [_recurring_payload(r) for r in dict_rows]


def _auto_resume_paused_bills(conn, rows: list[dict]) -> None:
    today = local_today()
    for row in rows:
        pu = row.get("paused_until")
        if row["is_active"] or not pu or pu > today:
            continue
        conn.execute(
            "UPDATE recurring_bills SET is_active = 1, paused_until = NULL WHERE id = ?",
            (row["id"],),
        )
        row["is_active"] = 1
        row["paused_until"] = None


def _recurring_payload(row: dict) -> dict[str, Any]:
    return {
        "id": row["id"],
        "scope": row["scope"],
        "title": row["title"],
        "amount": row["amount"],
        "category": row["category"],
        "type": row["type"],
        "account_id": row["account_id"],
        "frequency": row["frequency"],
        "next_due_date": row["next_due_date"],
        "note": row["note"] or "",
        "is_active": bool(row["is_active"]),
        "paused_until": row.get("paused_until"),
        "created_at": row["created_at"],
        "paid_by": row.get("paid_by"),
        "split_type": row.get("split_type") or "none",
        "attributed_to": row.get("attributed_to"),
    }


@router.get("/recurring/due")
def due_recurring_bills(
    scope: Literal["personal", "couple"] = Query("personal"),
    current_user: dict = Depends(get_current_user),
) -> list[dict[str, Any]]:
    today = local_today()
    bills = list_recurring_bills(scope=scope, current_user=current_user)
    return [b for b in bills if b["is_active"] and b["next_due_date"] <= today]


@router.post("/recurring", status_code=status.HTTP_201_CREATED)
async def create_recurring_bill(
    body: RecurringBillCreate,
    current_user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    _validate_scope_access(current_user, body.scope)
    bill_id = new_id()
    now = utcnow()
    couple_id = current_user.get("couple_id") if body.scope == "couple" else None

    with get_db() as conn:
        if body.account_id:
            _validate_account(conn, body.account_id, current_user, body.scope)
        paid_by, attributed_to, split_type = _validate_split_fields(
            conn, current_user, body.scope, couple_id,
            body.paid_by, body.attributed_to, body.split_type,
        )
        conn.execute(
            """
            INSERT INTO recurring_bills
            (id, scope, user_id, couple_id, title, amount, category, type, account_id,
             frequency, next_due_date, note, is_active, created_at, paid_by, split_type, attributed_to)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
            """,
            (
                bill_id, body.scope, current_user["id"], couple_id,
                body.title.strip(), body.amount, body.category, body.type,
                body.account_id, body.frequency, body.next_due_date, body.note, now,
                paid_by, split_type, attributed_to,
            ),
        )
        row = row_to_dict(conn.execute("SELECT * FROM recurring_bills WHERE id = ?", (bill_id,)).fetchone())

    result = _recurring_payload(row)
    if body.scope == "couple" and couple_id:
        await manager.broadcast_couple(couple_id, {"event": "recurring_updated", "data": {"action": "create"}})
    return result


@router.put("/recurring/{bill_id}")
async def update_recurring_bill(
    bill_id: str,
    body: RecurringBillUpdate,
    current_user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    with get_db() as conn:
        row = row_to_dict(conn.execute("SELECT * FROM recurring_bills WHERE id = ?", (bill_id,)).fetchone())
        if not row:
            raise HTTPException(status_code=404, detail="Recurring bill not found")
        if row["scope"] == "personal" and row["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Forbidden")
        if row["scope"] == "couple" and row["couple_id"] != current_user.get("couple_id"):
            raise HTTPException(status_code=403, detail="Forbidden")

        if body.account_id is not None:
            _validate_account(conn, body.account_id, current_user, row["scope"])

        fields = []
        values: list[Any] = []
        for key in ("title", "amount", "category", "type", "account_id", "frequency", "next_due_date", "note"):
            val = getattr(body, key)
            if val is not None:
                fields.append(f"{key} = ?")
                values.append(val.strip() if key == "title" else val)
        if body.is_active is not None:
            fields.append("is_active = ?")
            values.append(1 if body.is_active else 0)
            if body.is_active:
                fields.append("paused_until = ?")
                values.append(None)
        if body.paused_until is not None:
            fields.append("paused_until = ?")
            values.append(body.paused_until or None)

        couple_id = row.get("couple_id") if row["scope"] == "couple" else None
        if any(getattr(body, k) is not None for k in ("paid_by", "split_type", "attributed_to")):
            pb = body.paid_by if body.paid_by is not None else row.get("paid_by")
            at = body.attributed_to if body.attributed_to is not None else row.get("attributed_to")
            st = body.split_type if body.split_type is not None else row.get("split_type")
            pb, at, st = _validate_split_fields(conn, current_user, row["scope"], couple_id, pb, at, st)
            fields.extend(["paid_by = ?", "split_type = ?", "attributed_to = ?"])
            values.extend([pb, st, at])

        if fields:
            values.append(bill_id)
            conn.execute(f"UPDATE recurring_bills SET {', '.join(fields)} WHERE id = ?", values)

        updated = row_to_dict(conn.execute("SELECT * FROM recurring_bills WHERE id = ?", (bill_id,)).fetchone())

    result = _recurring_payload(updated)
    if updated["scope"] == "couple" and updated.get("couple_id"):
        await manager.broadcast_couple(updated["couple_id"], {"event": "recurring_updated", "data": {"action": "update"}})
    return result


@router.post("/recurring/{bill_id}/confirm")
async def confirm_recurring_bill(
    bill_id: str,
    current_user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    # Create the transaction, settle balances and advance the due date in one
    # transaction so a partial failure can neither double-confirm nor lose the update.
    with get_db() as conn:
        conn.execute("BEGIN IMMEDIATE")
        row = row_to_dict(conn.execute("SELECT * FROM recurring_bills WHERE id = ?", (bill_id,)).fetchone())
        if not row:
            raise HTTPException(status_code=404, detail="Recurring bill not found")
        if row["scope"] == "personal" and row["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Forbidden")
        if row["scope"] == "couple" and row["couple_id"] != current_user.get("couple_id"):
            raise HTTPException(status_code=403, detail="Forbidden")
        if not row["is_active"]:
            raise HTTPException(status_code=400, detail="Recurring bill is inactive")
        if row["next_due_date"][:10] > local_today():
            raise HTTPException(status_code=400, detail="Bill is not due yet")

        couple_id = current_user.get("couple_id") if row["scope"] == "couple" else None
        prev_due = row["next_due_date"]
        tx_id = new_id()
        now = utcnow()
        paid_by, attributed_to, split_type = _validate_split_fields(
            conn, current_user, row["scope"], couple_id,
            row.get("paid_by"), row.get("attributed_to"), row.get("split_type"),
        )
        conn.execute(
            """
            INSERT INTO transactions
            (id, scope, user_id, couple_id, amount, category, type, note, tx_date,
             created_by, created_at, account_id, tx_kind, paid_by, split_type, attributed_to)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'normal', ?, ?, ?)
            """,
            (
                tx_id, row["scope"], current_user["id"], couple_id, row["amount"],
                row["category"], row["type"], row["note"] or row["title"],
                row["next_due_date"][:10], current_user["id"], now, row["account_id"],
                paid_by, split_type, attributed_to,
            ),
        )
        tx_row = row_to_dict(conn.execute("SELECT * FROM transactions WHERE id = ?", (tx_id,)).fetchone())
        for acc_id, delta in balance_delta_for_tx(tx_row):
            apply_balance_delta(conn, acc_id, delta)

        next_due = _next_due_date(prev_due, row["frequency"])
        updated = conn.execute(
            "UPDATE recurring_bills SET next_due_date = ? WHERE id = ? AND next_due_date = ?",
            (next_due, bill_id, prev_due),
        )
        if updated.rowcount == 0:
            raise HTTPException(status_code=409, detail="Bill already confirmed")

    tx = _serialize_tx(tx_row)
    if row["scope"] == "couple" and couple_id:
        await manager.broadcast_couple(couple_id, {"event": "transaction_created", "data": tx})

    return {"transaction": tx, "next_due_date": next_due}


@router.delete("/recurring/{bill_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_recurring_bill(bill_id: str, current_user: dict = Depends(get_current_user)) -> Response:
    couple_id = None
    with get_db() as conn:
        row = row_to_dict(conn.execute("SELECT * FROM recurring_bills WHERE id = ?", (bill_id,)).fetchone())
        if not row:
            raise HTTPException(status_code=404, detail="Recurring bill not found")
        if row["scope"] == "personal" and row["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Forbidden")
        if row["scope"] == "couple" and row["couple_id"] != current_user.get("couple_id"):
            raise HTTPException(status_code=403, detail="Forbidden")
        couple_id = row.get("couple_id") if row["scope"] == "couple" else None
        conn.execute("DELETE FROM recurring_bills WHERE id = ?", (bill_id,))
    if couple_id:
        await manager.broadcast_couple(couple_id, {"event": "recurring_updated", "data": {"action": "delete"}})
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/{tx_id}")
async def update_transaction(
    tx_id: str,
    body: TransactionUpdate,
    current_user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    with get_db() as conn:
        row = row_to_dict(conn.execute("SELECT * FROM transactions WHERE id = ?", (tx_id,)).fetchone())
        if not row:
            raise HTTPException(status_code=404, detail="Transaction not found")
        _check_tx_access(row, current_user)

        for acc_id, delta in balance_delta_for_tx(row, sign=-1):
            apply_balance_delta(conn, acc_id, delta)

        scope = row["scope"]
        couple_id = row.get("couple_id")
        new_account_id = body.account_id if body.account_id is not None else row.get("account_id")
        new_transfer_to = body.transfer_to_account_id if body.transfer_to_account_id is not None else row.get("transfer_to_account_id")
        _validate_account(conn, new_account_id, current_user, scope)
        if new_transfer_to:
            _validate_account(conn, new_transfer_to, current_user, scope)

        paid_by = body.paid_by if body.paid_by is not None else row.get("paid_by")
        attributed_to = body.attributed_to if body.attributed_to is not None else row.get("attributed_to")
        split_type = body.split_type if body.split_type is not None else row.get("split_type")
        paid_by, attributed_to, split_type = _validate_split_fields(
            conn, current_user, scope, couple_id, paid_by, attributed_to, split_type,
        )

        fields = []
        values: list[Any] = []
        for key in ("amount", "category", "type", "note", "tx_date", "account_id", "transfer_to_account_id"):
            val = getattr(body, key)
            if val is not None:
                fields.append(f"{key} = ?")
                values.append(val)
        fields.extend(["paid_by = ?", "split_type = ?", "attributed_to = ?"])
        values.extend([paid_by, split_type, attributed_to])

        if not fields:
            updated = row
        else:
            values.append(tx_id)
            conn.execute(f"UPDATE transactions SET {', '.join(fields)} WHERE id = ?", values)
            updated = row_to_dict(conn.execute("SELECT * FROM transactions WHERE id = ?", (tx_id,)).fetchone())

        for acc_id, delta in balance_delta_for_tx(updated, sign=1):
            apply_balance_delta(conn, acc_id, delta)

    tx = _serialize_tx(updated)
    if row["scope"] == "couple" and row.get("couple_id"):
        await manager.broadcast_couple(row["couple_id"], {"event": "transaction_updated", "data": tx})
    return tx


@router.delete("/{tx_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_transaction(tx_id: str, current_user: dict = Depends(get_current_user)) -> Response:
    with get_db() as conn:
        row = row_to_dict(conn.execute("SELECT * FROM transactions WHERE id = ?", (tx_id,)).fetchone())
        if not row:
            raise HTTPException(status_code=404, detail="Transaction not found")
        _check_tx_access(row, current_user)

        for acc_id, delta in balance_delta_for_tx(row, sign=-1):
            apply_balance_delta(conn, acc_id, delta)

        conn.execute("DELETE FROM transactions WHERE id = ?", (tx_id,))

    if row["scope"] == "couple" and row.get("couple_id"):
        await manager.broadcast_couple(row["couple_id"], {"event": "transaction_deleted", "data": {"id": tx_id}})
    return Response(status_code=status.HTTP_204_NO_CONTENT)
