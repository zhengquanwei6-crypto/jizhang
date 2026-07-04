from __future__ import annotations

from calendar import monthrange
from datetime import date, datetime
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth import get_current_user
from app.db import get_db, new_id, row_to_dict, utcnow
from app.schemas import SavingsPlanUpsert

router = APIRouter(prefix="/api/savings-plan", tags=["savings-plan"])


def _owner_id(user: dict, scope: str) -> str:
    if scope == "couple":
        if not user.get("couple_id"):
            raise HTTPException(status_code=400, detail="Couple mode requires pairing first")
        return user["couple_id"]
    return user["id"]


def _total_balance(conn, scope: str, user: dict) -> float:
    if scope == "personal":
        row = conn.execute(
            "SELECT COALESCE(SUM(balance), 0) AS total FROM accounts "
            "WHERE scope = 'personal' AND user_id = ? AND is_archived = 0",
            (user["id"],),
        ).fetchone()
    else:
        row = conn.execute(
            "SELECT COALESCE(SUM(balance), 0) AS total FROM accounts "
            "WHERE scope = 'couple' AND couple_id = ? AND is_archived = 0",
            (user["couple_id"],),
        ).fetchone()
    return round(float(row["total"] or 0), 2)


def _current_month() -> str:
    return date.today().strftime("%Y-%m")


def _months_between(start_month: str | None, end_month: str) -> int:
    if not start_month:
        return 0
    start_y, start_m = map(int, start_month.split("-"))
    end_y, end_m = map(int, end_month.split("-"))
    return max((end_y - start_y) * 12 + (end_m - start_m), 0)


def _days_left_in_month(today: date | None = None) -> int:
    today = today or date.today()
    return monthrange(today.year, today.month)[1] - today.day + 1


def _months_until(target_date: str | None) -> int | None:
    if not target_date:
        return None
    try:
        target = datetime.fromisoformat(target_date).date()
    except ValueError:
        return None
    today = date.today()
    if target < today:
        return 0
    return max((target.year - today.year) * 12 + (target.month - today.month) + 1, 1)


def _month_expense(conn, scope: str, user: dict, month: str) -> float:
    if scope == "personal":
        row = conn.execute(
            """
            SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
            WHERE scope = 'personal' AND user_id = ? AND tx_date LIKE ? AND type = 'expense'
            AND (tx_kind IS NULL OR tx_kind = 'normal')
            """,
            (user["id"], f"{month}%"),
        ).fetchone()
    else:
        row = conn.execute(
            """
            SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
            WHERE scope = 'couple' AND couple_id = ? AND tx_date LIKE ? AND type = 'expense'
            AND (tx_kind IS NULL OR tx_kind = 'normal')
            """,
            (user["couple_id"], f"{month}%"),
        ).fetchone()
    return round(float(row["total"] or 0), 2)


def _sync_monthly_reserve(conn, plan: dict | None) -> dict | None:
    if not plan or not plan.get("enabled"):
        return plan
    monthly_amount = round(float(plan.get("monthly_amount") or 0), 2)
    if monthly_amount <= 0:
        return plan

    current_month = _current_month()
    last_reserved_month = plan.get("last_reserved_month") or current_month
    months_elapsed = _months_between(last_reserved_month, current_month)
    if months_elapsed <= 0:
        return plan

    next_fixed = round(float(plan.get("fixed_amount") or 0) + monthly_amount * months_elapsed, 2)
    now = utcnow()
    conn.execute(
        "UPDATE savings_plans SET fixed_amount = ?, last_reserved_month = ?, updated_at = ? WHERE id = ?",
        (next_fixed, current_month, now, plan["id"]),
    )
    plan["fixed_amount"] = next_fixed
    plan["last_reserved_month"] = current_month
    plan["updated_at"] = now
    return plan


def _build_response(plan: dict | None, total_balance: float) -> dict[str, Any]:
    enabled = bool(plan and plan.get("enabled"))
    target = round(float(plan["fixed_amount"]), 2) if plan else 0.0
    monthly_amount = round(float((plan or {}).get("monthly_amount") or 0), 2)
    reserve_floor = round(float((plan or {}).get("reserve_floor") or 0), 2)
    goal_name = (plan or {}).get("goal_name") or ""
    target_date = (plan or {}).get("target_date")
    current_month = _current_month()
    effective_target = max(target, reserve_floor)
    months_to_target = _months_until(target_date)
    recommended_monthly = round(max(effective_target - total_balance, 0) / months_to_target, 2) if months_to_target else 0.0

    if not enabled:
        return {
            "enabled": False,
            "goal_name": goal_name,
            "fixed_amount": target,
            "monthly_amount": monthly_amount,
            "reserve_floor": reserve_floor,
            "target_date": target_date,
            "monthly_mode_enabled": monthly_amount > 0,
            "last_reserved_month": (plan or {}).get("last_reserved_month"),
            "total_balance": total_balance,
            "fixed_funds": 0.0,
            "liquid_funds": total_balance,
            "shortfall": 0.0,
            "goal_reached": False,
            "progress": None,
            "current_month": current_month,
            "this_month_reserved": 0.0,
            "next_reserve_month": None,
            "effective_target": effective_target,
            "months_to_target": months_to_target,
            "recommended_monthly_amount": recommended_monthly,
        }

    fixed_funds = round(min(effective_target, total_balance), 2)
    liquid_funds = round(max(total_balance - fixed_funds, 0), 2)
    shortfall = round(max(effective_target - total_balance, 0), 2)
    goal_reached = total_balance >= effective_target and effective_target > 0
    progress = round(fixed_funds / effective_target, 4) if effective_target > 0 else None
    next_reserve_month = None
    if monthly_amount > 0:
        y, m = map(int, current_month.split("-"))
        if m == 12:
            next_reserve_month = f"{y + 1}-01"
        else:
            next_reserve_month = f"{y}-{m + 1:02d}"

    return {
        "enabled": True,
        "goal_name": goal_name,
        "fixed_amount": target,
        "monthly_amount": monthly_amount,
        "reserve_floor": reserve_floor,
        "target_date": target_date,
        "monthly_mode_enabled": monthly_amount > 0,
        "last_reserved_month": plan.get("last_reserved_month"),
        "total_balance": total_balance,
        "fixed_funds": fixed_funds,
        "liquid_funds": liquid_funds,
        "shortfall": shortfall,
        "goal_reached": goal_reached,
        "progress": progress,
        "current_month": current_month,
        "this_month_reserved": monthly_amount if monthly_amount > 0 and plan.get("last_reserved_month") == current_month else 0.0,
        "next_reserve_month": next_reserve_month,
        "effective_target": effective_target,
        "months_to_target": months_to_target,
        "recommended_monthly_amount": recommended_monthly,
    }


@router.get("")
def get_savings_plan(
    scope: Literal["personal", "couple"] = Query("personal"),
    current_user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    owner_id = _owner_id(current_user, scope)
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM savings_plans WHERE scope = ? AND owner_id = ?",
            (scope, owner_id),
        ).fetchone()
        plan = _sync_monthly_reserve(conn, row_to_dict(row) if row else None)
        total = _total_balance(conn, scope, current_user)
    return _build_response(plan, total)


@router.get("/advice")
def get_savings_advice(
    scope: Literal["personal", "couple"] = Query("personal"),
    month: str | None = Query(None),
    current_user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    owner_id = _owner_id(current_user, scope)
    month = month or _current_month()
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM savings_plans WHERE scope = ? AND owner_id = ?",
            (scope, owner_id),
        ).fetchone()
        plan = _sync_monthly_reserve(conn, row_to_dict(row) if row else None)
        total = _total_balance(conn, scope, current_user)
        month_expense = _month_expense(conn, scope, current_user, month)

    summary = _build_response(plan, total)
    liquid_funds = round(float(summary["liquid_funds"]), 2)
    remaining_days = _days_left_in_month()
    daily_budget = round(liquid_funds / remaining_days, 2) if remaining_days > 0 else liquid_funds
    monthly_amount = round(float(summary.get("monthly_amount") or 0), 2)
    reserve_floor = round(float(summary.get("reserve_floor") or 0), 2)
    recommended_monthly = round(float(summary.get("recommended_monthly_amount") or 0), 2)

    if liquid_funds <= 0:
        tone = "freeze"
        note = "本月流动资金已经见底，建议暂停非必要消费，优先保住固定资金。"
    elif daily_budget <= 30:
        tone = "tight"
        note = f"接下来每天尽量控制在 ¥{daily_budget:.2f} 内，先保住本月计划。"
    elif daily_budget <= 100:
        tone = "steady"
        note = f"接下来每天可支配约 ¥{daily_budget:.2f}，按日均节奏花更稳。"
    else:
        tone = "relaxed"
        note = f"接下来每天大约可花 ¥{daily_budget:.2f}，当前流动资金还算充裕。"

    return {
        "scope": scope,
        "month": month,
        "remaining_days": remaining_days,
        "month_expense": month_expense,
        "daily_budget": daily_budget,
        "suggested_weekly_budget": round(daily_budget * 7, 2),
        "liquid_funds": liquid_funds,
        "fixed_funds": summary["fixed_funds"],
        "monthly_amount": monthly_amount,
        "reserve_floor": reserve_floor,
        "recommended_monthly_amount": recommended_monthly,
        "summary": summary,
        "tone": tone,
        "note": note,
    }


@router.put("")
def upsert_savings_plan(body: SavingsPlanUpsert, current_user: dict = Depends(get_current_user)) -> dict[str, Any]:
    owner_id = _owner_id(current_user, body.scope)
    now = utcnow()
    current_month = _current_month()
    goal_name = body.goal_name.strip()
    monthly_amount = round(float(body.monthly_amount or 0), 2)
    fixed_amount = round(float(body.fixed_amount or 0), 2)
    reserve_floor = round(float(body.reserve_floor or 0), 2)
    target_date = body.target_date

    with get_db() as conn:
        existing_row = conn.execute(
            "SELECT * FROM savings_plans WHERE scope = ? AND owner_id = ?",
            (body.scope, owner_id),
        ).fetchone()
        existing = _sync_monthly_reserve(conn, row_to_dict(existing_row) if existing_row else None)
        total = _total_balance(conn, body.scope, current_user)
        if body.enabled and fixed_amount > total:
            raise HTTPException(
                status_code=400,
                detail=f"存钱目标不能超过当前全部余额（¥{total:.2f}）",
            )
        if body.enabled and reserve_floor > total:
            raise HTTPException(status_code=400, detail=f"保底余额不能超过当前全部余额（¥{total:.2f}）")
        if body.enabled and monthly_amount > 0 and fixed_amount < monthly_amount and total < monthly_amount:
            raise HTTPException(status_code=400, detail="已锁定资金不能小于每月自动留存金额")

        if existing:
            conn.execute(
                """
                UPDATE savings_plans
                SET enabled = ?, fixed_amount = ?, monthly_amount = ?, reserve_floor = ?, goal_name = ?, target_date = ?, last_reserved_month = ?, updated_at = ?
                WHERE id = ?
                """,
                (
                    int(body.enabled),
                    fixed_amount,
                    monthly_amount,
                    reserve_floor,
                    goal_name,
                    target_date,
                    current_month if body.enabled and monthly_amount > 0 else existing.get("last_reserved_month"),
                    now,
                    existing["id"],
                ),
            )
        else:
            conn.execute(
                """
                INSERT INTO savings_plans
                (id, scope, owner_id, enabled, fixed_amount, monthly_amount, reserve_floor, goal_name, target_date, last_reserved_month, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    new_id(),
                    body.scope,
                    owner_id,
                    int(body.enabled),
                    fixed_amount,
                    monthly_amount,
                    reserve_floor,
                    goal_name,
                    target_date,
                    current_month if body.enabled and monthly_amount > 0 else None,
                    now,
                    now,
                ),
            )

        row = conn.execute(
            "SELECT * FROM savings_plans WHERE scope = ? AND owner_id = ?",
            (body.scope, owner_id),
        ).fetchone()
        plan = row_to_dict(row)

    return _build_response(plan, total)
