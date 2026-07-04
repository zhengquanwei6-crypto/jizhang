from __future__ import annotations

from collections import defaultdict
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from app.auth import get_current_user
from app.db import get_db, new_id, row_to_dict, utcnow
from app.schemas import BudgetUpsert, CategoryBudgetUpsert
from app.ws import manager

router = APIRouter(prefix="/api/budgets", tags=["budgets"])


def _owner_id(user: dict, scope: str) -> str:
    if scope == "couple":
        if not user.get("couple_id"):
            raise HTTPException(status_code=400, detail="Couple mode requires pairing first")
        return user["couple_id"]
    return user["id"]


def _spent_by_category(conn, scope: str, user: dict, month: str) -> dict[str, float]:
    if scope == "personal":
        where = "scope = 'personal' AND user_id = ?"
        param = user["id"]
    else:
        where = "scope = 'couple' AND couple_id = ?"
        param = user["couple_id"]
    rows = conn.execute(
        f"SELECT category, amount FROM transactions "
        f"WHERE {where} AND type = 'expense' AND (tx_kind IS NULL OR tx_kind != 'transfer') "
        f"AND tx_date LIKE ?",
        (param, f"{month}%"),
    ).fetchall()
    spent: dict[str, float] = defaultdict(float)
    for r in rows:
        spent[r["category"]] += r["amount"]
    return spent


@router.get("")
def get_budget_overview(
    scope: Literal["personal", "couple"] = Query("personal"),
    month: str = Query(...),
    current_user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    owner_id = _owner_id(current_user, scope)
    with get_db() as conn:
        total_row = conn.execute(
            "SELECT amount FROM budgets WHERE scope = ? AND owner_id = ? AND month = ?",
            (scope, owner_id, month),
        ).fetchone()
        cat_rows = conn.execute(
            "SELECT category, amount FROM category_budgets WHERE scope = ? AND owner_id = ? AND month = ?",
            (scope, owner_id, month),
        ).fetchall()
        spent = _spent_by_category(conn, scope, current_user, month)

    total_spent = round(sum(spent.values()), 2)
    total_budget = total_row["amount"] if total_row else None
    categories = []
    for r in cat_rows:
        used = round(spent.get(r["category"], 0.0), 2)
        ratio = (used / r["amount"]) if r["amount"] else 0
        categories.append(
            {
                "category": r["category"],
                "amount": r["amount"],
                "spent": used,
                "remaining": round(r["amount"] - used, 2),
                "progress": round(ratio, 4),
                # progress_capped is clamped to [0,1] for progress bars; progress keeps
                # the true ratio so the UI can show "120%" overspend explicitly.
                "progress_capped": round(min(ratio, 1.0), 4),
                "overspent": used > r["amount"],
            }
        )
    categories.sort(key=lambda c: c["progress"], reverse=True)

    return {
        "scope": scope,
        "month": month,
        "total": {
            "amount": total_budget,
            "spent": total_spent,
            "remaining": round(total_budget - total_spent, 2) if total_budget is not None else None,
            "progress": round(total_spent / total_budget, 4) if total_budget else None,
            "progress_capped": round(min(total_spent / total_budget, 1.0), 4) if total_budget else None,
            "overspent": total_budget is not None and total_spent > total_budget,
        },
        "categories": categories,
    }


@router.put("/total")
async def upsert_total_budget(body: BudgetUpsert, current_user: dict = Depends(get_current_user)) -> dict[str, Any]:
    owner_id = _owner_id(current_user, body.scope)
    with get_db() as conn:
        existing = conn.execute(
            "SELECT id FROM budgets WHERE scope = ? AND owner_id = ? AND month = ?",
            (body.scope, owner_id, body.month),
        ).fetchone()
        if existing:
            conn.execute("UPDATE budgets SET amount = ? WHERE id = ?", (body.amount, existing["id"]))
        else:
            conn.execute(
                "INSERT INTO budgets (id, scope, owner_id, month, amount, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (new_id(), body.scope, owner_id, body.month, body.amount, utcnow()),
            )
    if body.scope == "couple" and current_user.get("couple_id"):
        await manager.broadcast_couple(
            current_user["couple_id"],
            {"event": "budget_updated", "data": {"month": body.month}},
        )
    return {"scope": body.scope, "month": body.month, "amount": body.amount}


@router.put("/category")
async def upsert_category_budget(
    body: CategoryBudgetUpsert, current_user: dict = Depends(get_current_user)
) -> dict[str, Any]:
    owner_id = _owner_id(current_user, body.scope)
    with get_db() as conn:
        existing = conn.execute(
            "SELECT id FROM category_budgets WHERE scope = ? AND owner_id = ? AND month = ? AND category = ?",
            (body.scope, owner_id, body.month, body.category),
        ).fetchone()
        if existing:
            conn.execute("UPDATE category_budgets SET amount = ? WHERE id = ?", (body.amount, existing["id"]))
        else:
            conn.execute(
                "INSERT INTO category_budgets (id, scope, owner_id, month, category, amount, created_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (new_id(), body.scope, owner_id, body.month, body.category, body.amount, utcnow()),
            )
    if body.scope == "couple" and current_user.get("couple_id"):
        await manager.broadcast_couple(
            current_user["couple_id"],
            {"event": "budget_updated", "data": {"month": body.month, "category": body.category}},
        )
    return {"scope": body.scope, "month": body.month, "category": body.category, "amount": body.amount}


@router.delete("/category", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_category_budget(
    scope: Literal["personal", "couple"] = Query(...),
    month: str = Query(...),
    category: str = Query(...),
    current_user: dict = Depends(get_current_user),
) -> Response:
    owner_id = _owner_id(current_user, scope)
    with get_db() as conn:
        conn.execute(
            "DELETE FROM category_budgets WHERE scope = ? AND owner_id = ? AND month = ? AND category = ?",
            (scope, owner_id, month, category),
        )
    if scope == "couple" and current_user.get("couple_id"):
        await manager.broadcast_couple(
            current_user["couple_id"],
            {"event": "budget_updated", "data": {"month": month, "category": category, "deleted": True}},
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
