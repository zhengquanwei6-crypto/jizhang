from __future__ import annotations

import calendar
import re
from collections import defaultdict
from datetime import date as date_cls, timedelta
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth import get_current_user
from app.db import get_db, local_now, row_to_dict
from app.routers.transactions import _validate_scope_access

router = APIRouter(prefix="/api/stats", tags=["stats"])


def _scope_filter(scope: str, user: dict) -> tuple[str, list[Any]]:
    if scope == "personal":
        return "scope = 'personal' AND user_id = ?", [user["id"]]
    return "scope = 'couple' AND couple_id = ?", [user["couple_id"]]


_NORMAL = "(tx_kind IS NULL OR tx_kind != 'transfer')"


def _compute_streak(dates: set[str]) -> int:
    if not dates:
        return 0
    streak = 0
    day = local_now().date()
    # Allow the streak to "start" yesterday if today has no entry yet, so the count
    # does not reset to 0 every morning before the first transaction.
    if day.isoformat() not in dates:
        day -= timedelta(days=1)
    while day.isoformat() in dates:
        streak += 1
        day -= timedelta(days=1)
    return streak


@router.get("/summary")
def stats_summary(
    scope: Literal["personal", "couple"] = Query("personal"),
    month: Optional[str] = Query(None),
    year: Optional[str] = Query(None),
    week: Optional[str] = Query(None, description="Week start date YYYY-MM-DD (Monday)"),
    quarter: Optional[str] = Query(None, description="Quarter like 2026-Q1"),
    current_user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    _validate_scope_access(current_user, scope)

    date_prefix = year if year else month
    where, base_params = _scope_filter(scope, current_user)
    date_clause = ""
    date_params: list[Any] = []
    week_start = None
    week_end = None
    if week:
        try:
            week_start = date_cls.fromisoformat(week)
            week_end = week_start + timedelta(days=6)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid week date") from exc
        date_clause = " AND tx_date >= ? AND tx_date <= ?"
        date_params = [week_start.isoformat(), week_end.isoformat()]
    elif quarter:
        m = re.fullmatch(r"(\d{4})-Q([1-4])", quarter.strip())
        if not m:
            raise HTTPException(status_code=400, detail="Invalid quarter format, use YYYY-Q1..Q4")
        y, qn = int(m.group(1)), int(m.group(2))
        start_month = (qn - 1) * 3 + 1
        end_month = start_month + 2
        q_start = date_cls(y, start_month, 1)
        q_end = date_cls(y, end_month, calendar.monthrange(y, end_month)[1])
        date_clause = " AND tx_date >= ? AND tx_date <= ?"
        date_params = [q_start.isoformat(), q_end.isoformat()]
    elif date_prefix:
        date_clause = " AND tx_date LIKE ?"
        date_params = [f"{date_prefix}%"]

    # group trend by month when viewing a whole year or quarter, otherwise by day
    trend_len = 7 if ((year and not month and not week) or quarter) else 10

    with get_db() as conn:
        owner_id = current_user["couple_id"] if scope == "couple" else current_user["id"]

        # Income / expense totals (aggregated in SQL).
        totals = {
            r["type"]: float(r["total"])
            for r in conn.execute(
                f"SELECT type, SUM(amount) AS total FROM transactions "
                f"WHERE {where}{date_clause} AND {_NORMAL} GROUP BY type",
                (*base_params, *date_params),
            ).fetchall()
        }

        count_row = conn.execute(
            f"SELECT COUNT(*) AS c FROM transactions WHERE {where}{date_clause} AND {_NORMAL}",
            (*base_params, *date_params),
        ).fetchone()
        transaction_count = count_row["c"] if count_row else 0

        cat_rows = conn.execute(
            f"SELECT category, SUM(amount) AS total FROM transactions "
            f"WHERE {where}{date_clause} AND type = 'expense' AND {_NORMAL} "
            f"GROUP BY category ORDER BY total DESC",
            (*base_params, *date_params),
        ).fetchall()

        income_cat_rows = conn.execute(
            f"SELECT category, SUM(amount) AS total FROM transactions "
            f"WHERE {where}{date_clause} AND type = 'income' AND {_NORMAL} "
            f"GROUP BY category ORDER BY total DESC",
            (*base_params, *date_params),
        ).fetchall()

        note_rows = conn.execute(
            f"SELECT TRIM(note) AS note, SUM(amount) AS total, COUNT(*) AS cnt FROM transactions "
            f"WHERE {where}{date_clause} AND type = 'expense' AND {_NORMAL} "
            f"AND note IS NOT NULL AND TRIM(note) != '' "
            f"GROUP BY TRIM(note) ORDER BY total DESC LIMIT 10",
            (*base_params, *date_params),
        ).fetchall()

        trend_rows = conn.execute(
            f"SELECT substr(tx_date, 1, ?) AS d, type, SUM(amount) AS total FROM transactions "
            f"WHERE {where}{date_clause} AND {_NORMAL} GROUP BY d, type ORDER BY d",
            (trend_len, *base_params, *date_params),
        ).fetchall()

        budget = None
        if month:
            b = conn.execute(
                "SELECT amount FROM budgets WHERE scope = ? AND owner_id = ? AND month = ?",
                (scope, owner_id, month),
            ).fetchone()
            if b:
                budget = b["amount"]

        acc_rows = conn.execute(
            """
            SELECT id, name, kind, balance, currency FROM accounts
            WHERE scope = ? AND is_archived = 0 AND {}
            """.format("user_id = ?" if scope == "personal" else "couple_id = ?"),
            (scope, owner_id),
        ).fetchall()

        all_dates_rows = conn.execute(
            f"SELECT DISTINCT substr(tx_date, 1, 10) AS d FROM transactions WHERE {where} AND {_NORMAL} ORDER BY d DESC",
            base_params,
        ).fetchall()

        trend_date_keys = sorted({r["d"] for r in trend_rows})
        category_trends: list[dict[str, Any]] = []
        for cat in [r["category"] for r in cat_rows[:6]]:
            cat_daily = conn.execute(
                f"SELECT substr(tx_date, 1, ?) AS d, SUM(amount) AS total FROM transactions "
                f"WHERE {where}{date_clause} AND type = 'expense' AND category = ? AND {_NORMAL} "
                f"GROUP BY d",
                (trend_len, *base_params, *date_params, cat),
            ).fetchall()
            amap = {r["d"]: round(float(r["total"]), 2) for r in cat_daily}
            category_trends.append({"category": cat, "points": [amap.get(d, 0.0) for d in trend_date_keys]})

    income = totals.get("income", 0.0)
    expense = totals.get("expense", 0.0)
    balance = income - expense

    trend_map: dict[str, dict[str, float]] = defaultdict(lambda: {"income": 0.0, "expense": 0.0})
    for r in trend_rows:
        trend_map[r["d"]][r["type"]] = float(r["total"])
    trend_list = [
        {"date": d, "income": round(v["income"], 2), "expense": round(v["expense"], 2)}
        for d, v in sorted(trend_map.items())
    ]

    category_breakdown = [
        {"category": r["category"], "amount": round(float(r["total"]), 2)} for r in cat_rows
    ]

    category_ranking = [
        {"rank": i + 1, "category": item["category"], "amount": item["amount"]}
        for i, item in enumerate(category_breakdown)
    ]

    income_breakdown = [
        {"category": r["category"], "amount": round(float(r["total"]), 2)} for r in income_cat_rows
    ]
    income_ranking = [
        {"rank": i + 1, "category": item["category"], "amount": item["amount"]}
        for i, item in enumerate(income_breakdown)
    ]

    note_ranking = [
        {
            "rank": i + 1,
            "note": r["note"],
            "amount": round(float(r["total"]), 2),
            "count": int(r["cnt"]),
        }
        for i, r in enumerate(note_rows)
    ]

    accounts = [
        {
            "id": r["id"],
            "name": r["name"],
            "kind": r["kind"],
            "balance": round(float(r["balance"]), 2),
            "currency": r["currency"],
        }
        for r in acc_rows
    ]
    net_worth = round(sum(a["balance"] for a in accounts), 2)

    date_set = {r["d"] for r in all_dates_rows}
    streak = _compute_streak(date_set)

    return {
        "scope": scope,
        "month": month,
        "year": year,
        "week": week,
        "week_start": week_start.isoformat() if week_start else None,
        "week_end": week_end.isoformat() if week_end else None,
        "income": round(income, 2),
        "expense": round(expense, 2),
        "balance": round(balance, 2),
        "budget": budget,
        "category_breakdown": category_breakdown,
        "category_ranking": category_ranking,
        "income_ranking": income_ranking,
        "note_ranking": note_ranking,
        "trend": trend_list,
        "category_trends": category_trends,
        "transaction_count": transaction_count,
        "net_worth": net_worth,
        "accounts": accounts,
        "bookkeeping_streak": streak,
    }


@router.get("/net-worth-trend")
def net_worth_trend(
    scope: Literal["personal", "couple"] = Query("personal"),
    months: int = Query(6, ge=2, le=12),
    current_user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    """Net worth at end of each recent month (current month = as of today)."""
    _validate_scope_access(current_user, scope)
    where, base_params = _scope_filter(scope, current_user)
    owner_id = current_user["couple_id"] if scope == "couple" else current_user["id"]
    today = local_now().date()

    with get_db() as conn:
        acc_rows = conn.execute(
            """
            SELECT balance FROM accounts
            WHERE scope = ? AND is_archived = 0 AND {}
            """.format("user_id = ?" if scope == "personal" else "couple_id = ?"),
            (scope, owner_id),
        ).fetchall()
        current_net = round(sum(float(r["balance"]) for r in acc_rows), 2)

        month_keys: list[tuple[int, int]] = []
        y, m = today.year, today.month
        for _ in range(months):
            month_keys.append((y, m))
            m -= 1
            if m == 0:
                m = 12
                y -= 1
        month_keys.reverse()

        points: list[dict[str, Any]] = []
        for y, mo in month_keys:
            if y == today.year and mo == today.month:
                cut = today.isoformat()
            else:
                last = calendar.monthrange(y, mo)[1]
                cut = f"{y}-{mo:02d}-{last:02d}"
            delta_row = conn.execute(
                f"""
                SELECT COALESCE(SUM(
                    CASE WHEN type = 'income' THEN amount WHEN type = 'expense' THEN -amount ELSE 0 END
                ), 0) AS delta
                FROM transactions
                WHERE {where} AND {_NORMAL} AND tx_date > ?
                """,
                (*base_params, cut),
            ).fetchone()
            delta = float(delta_row["delta"]) if delta_row else 0.0
            points.append({
                "month": f"{y}-{mo:02d}",
                "net_worth": round(current_net - delta, 2),
            })

    return {"scope": scope, "current": current_net, "points": points}


@router.get("/settlement")
def couple_settlement(
    scope: Literal["personal", "couple"] = Query("couple"),
    month: str = Query(...),
    current_user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    """Who paid vs fair share for couple expense settlement (AA / payer / partner splits)."""
    if scope != "couple":
        raise HTTPException(status_code=400, detail="Settlement is only available for couple scope")
    _validate_scope_access(current_user, scope)
    couple_id = current_user["couple_id"]

    with get_db() as conn:
        couple = row_to_dict(conn.execute("SELECT user_a_id, user_b_id FROM couples WHERE id = ?", (couple_id,)).fetchone())
        if not couple:
            raise HTTPException(status_code=400, detail="Couple not found")
        member_ids = [couple["user_a_id"]]
        if couple.get("user_b_id"):
            member_ids.append(couple["user_b_id"])
        nicknames: dict[str, str] = {}
        for uid in member_ids:
            u = conn.execute("SELECT nickname FROM users WHERE id = ?", (uid,)).fetchone()
            nicknames[uid] = u["nickname"] if u else "用户"

        rows = conn.execute(
            f"""
            SELECT amount, paid_by, created_by, split_type, attributed_to, type
            FROM transactions
            WHERE scope = 'couple' AND couple_id = ? AND tx_date LIKE ?
              AND type = 'expense' AND {_NORMAL}
            """,
            (couple_id, f"{month}%"),
        ).fetchall()

    paid: dict[str, float] = {uid: 0.0 for uid in member_ids}
    share: dict[str, float] = {uid: 0.0 for uid in member_ids}

    for r in rows:
        amt = float(r["amount"])
        pb = r["paid_by"] or r["created_by"]
        if pb in paid:
            paid[pb] += amt
        st = r["split_type"] or "none"
        if st == "aa" and len(member_ids) == 2:
            half = amt / 2
            share[member_ids[0]] += half
            share[member_ids[1]] += half
        elif st == "payer" and pb in share:
            share[pb] += amt
        elif st == "partner" and r["attributed_to"] in share:
            share[r["attributed_to"]] += amt
        elif st in ("none", "") and len(member_ids) == 2:
            half = amt / 2
            share[member_ids[0]] += half
            share[member_ids[1]] += half

    members = []
    for uid in member_ids:
        net = round(paid[uid] - share[uid], 2)
        members.append({
            "user_id": uid,
            "nickname": nicknames.get(uid, "用户"),
            "paid": round(paid[uid], 2),
            "fair_share": round(share[uid], 2),
            "net": net,
            "status": "应收" if net > 0.01 else ("应付" if net < -0.01 else "平衡"),
        })

    if len(member_ids) == 2:
        a, b = member_ids
        diff = round(paid[a] - share[a], 2)
        if diff > 0.01:
            hint = f"{nicknames.get(b, 'TA')} 应向 {nicknames.get(a, '你')} 补 ¥{abs(diff):.2f}"
        elif diff < -0.01:
            hint = f"{nicknames.get(a, '你')} 应向 {nicknames.get(b, 'TA')} 补 ¥{abs(diff):.2f}"
        else:
            hint = "本月分摊已平衡"
    else:
        hint = ""

    return {
        "scope": scope,
        "month": month,
        "members": members,
        "hint": hint,
        "expense_total": round(sum(paid.values()), 2),
    }
