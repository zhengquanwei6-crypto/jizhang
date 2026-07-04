from __future__ import annotations

import base64
import json
import re
from calendar import monthrange
from datetime import date, timedelta
from typing import Any

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile

from app.auth import get_current_user
from app.config import settings
from app.db import get_db, local_today, new_id, row_to_dict, utcnow
from app.feature_flags import require_feature
from app.routers.transactions import _validate_scope_access
from app.schemas import AiChatRequest, AiMoneyActionRequest
from app.services.ai_agent import (
    build_context_snapshot,
    execute_tool,
    generate_couple_ai_reply,
    generate_reply,
    run_query_accounts,
    run_query_budget_status,
    run_query_category_breakdown,
    run_query_stats,
)

router = APIRouter(
    prefix="/api/ai-extra",
    tags=["ai-extra"],
    dependencies=[Depends(require_feature("ai_enabled"))],
)

OCR_SYSTEM = """你是票据OCR助手。从收据/截图文字中提取记账信息，返回JSON:
{"amount":数字,"category":"中文分类","type":"income或expense","note":"商户或备注","tx_date":"YYYY-MM-DD"}
只返回JSON。"""


async def _openai_request(payload: dict[str, Any]) -> dict[str, Any]:
    if not settings.openai_api_key:
        raise HTTPException(status_code=503, detail="AI not configured")
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            f"{settings.openai_base_url.rstrip('/')}/chat/completions",
            headers={"Authorization": f"Bearer {settings.openai_api_key}", "Content-Type": "application/json"},
            json=payload,
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="AI service unavailable")
    return resp.json()


# Re-export for backward compatibility
_run_query_stats = run_query_stats
_run_budget_status = run_query_budget_status
_execute_function = execute_tool


@router.post("/ocr")
async def ocr_receipt(
    file: UploadFile = File(...),
    scope: str = Query("personal"),
    current_user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    _validate_scope_access(current_user, scope)
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large")

    today = local_today()
    if not settings.openai_api_key:
        text = data.decode("utf-8", errors="ignore")[:500]
        amount_match = re.search(r"(\d+\.\d{2}|\d+)", text)
        return {
            "amount": float(amount_match.group(1)) if amount_match else 0,
            "category": "其他支出",
            "type": "expense",
            "note": file.filename or "票据",
            "tx_date": today,
            "scope": scope,
            "confidence": "low",
        }

    b64 = base64.b64encode(data).decode()
    mime = file.content_type or "image/jpeg"
    payload = {
        "model": settings.openai_model,
        "messages": [
            {"role": "system", "content": OCR_SYSTEM + f" 今天: {today}"},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "解析这张票据/截图中的记账信息"},
                    {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
                ],
            },
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.2,
    }
    try:
        result = await _openai_request(payload)
        parsed = json.loads(result["choices"][0]["message"]["content"])
        parsed.setdefault("tx_date", today)
        parsed["scope"] = scope
        parsed["confidence"] = "high"
        return parsed
    except Exception:
        return {
            "amount": 0,
            "category": "其他支出",
            "type": "expense",
            "note": "解析失败，请手动确认",
            "tx_date": today,
            "scope": scope,
            "confidence": "low",
        }


@router.post("/chat-query")
async def chat_query(body: AiChatRequest, current_user: dict = Depends(get_current_user)) -> dict[str, Any]:
    return await generate_reply(current_user, body.message, body.scope, persona="factual")


ASSISTANT_NAME = "钱小参"
_AMOUNT_TOKEN_RE = re.compile(r"(?P<num>\d[\d,]*(?:\.\d+)?)(?P<unit>\s*(?:万|千|w|W|k|K)?)")
_BUDGET_WORDS = ("预算", "限额", "每月花", "支出控制", "消费上限", "花费上限")
_SAVING_WORDS = ("攒", "存", "存钱", "攒钱", "储蓄", "留存", "每月留")
_MEAL_WORDS = ("吃", "餐", "饭", "外卖", "做饭", "菜")


def _normalize_month(month: str | None) -> str:
    value = month or local_today()[:7]
    if not re.fullmatch(r"\d{4}-\d{2}", value):
        raise HTTPException(status_code=400, detail="month must be YYYY-MM")
    year, mon = map(int, value.split("-"))
    if mon < 1 or mon > 12:
        raise HTTPException(status_code=400, detail="month must be YYYY-MM")
    return f"{year:04d}-{mon:02d}"


def _owner_id(user: dict, scope: str) -> str:
    _validate_scope_access(user, scope)
    return user["couple_id"] if scope == "couple" else user["id"]


def _round_money(value: float, step: int = 10) -> float:
    if value <= 0:
        return 0.0
    if value < step:
        return round(value, 2)
    return round(round(value / step) * step, 2)


def _month_meta(month: str) -> dict[str, Any]:
    year, mon = map(int, month.split("-"))
    last_day = monthrange(year, mon)[1]
    start = date(year, mon, 1)
    end = date(year, mon, last_day)
    today = date.fromisoformat(local_today())
    if start <= today <= end:
        elapsed = today.day
        remaining = (end - today).days + 1
    elif today < start:
        elapsed = 0
        remaining = last_day
    else:
        elapsed = last_day
        remaining = 1
    return {
        "days": last_day,
        "elapsed_days": elapsed,
        "remaining_days": max(remaining, 1),
        "start": start,
        "end": end,
        "today": today,
    }


def _amount_value(match: re.Match[str]) -> float:
    raw = match.group("num").replace(",", "")
    unit = (match.group("unit") or "").strip().lower()
    value = float(raw)
    if unit in ("万", "w"):
        value *= 10000
    elif unit in ("千", "k"):
        value *= 1000
    return round(value, 2)


def _amount_candidates(text: str) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for match in _AMOUNT_TOKEN_RE.finditer(text):
        value = _amount_value(match)
        if value <= 0:
            continue
        result.append({"value": value, "start": match.start(), "end": match.end()})
    return result


def _keyword_positions(text: str, words: tuple[str, ...]) -> list[int]:
    positions: list[int] = []
    for word in words:
        positions.extend(m.start() for m in re.finditer(re.escape(word), text))
    return positions


def _nearest_amount(text: str, words: tuple[str, ...]) -> float | None:
    amounts = _amount_candidates(text)
    positions = _keyword_positions(text, words)
    if not amounts or not positions:
        return None
    scored = []
    for item in amounts:
        distance = min(abs(item["start"] - pos) for pos in positions)
        window = text[max(0, item["start"] - 14): min(len(text), item["end"] + 14)]
        if any(word in window for word in words):
            scored.append((distance, item["value"]))
    if not scored:
        return None
    scored.sort(key=lambda pair: pair[0])
    return scored[0][1]


def _parse_money_intents(message: str) -> dict[str, Any]:
    text = message.strip()
    amounts = [item["value"] for item in _amount_candidates(text)]
    budget_amount = _nearest_amount(text, _BUDGET_WORDS)
    saving_amount = _nearest_amount(text, _SAVING_WORDS)
    if budget_amount is None and any(word in text for word in _BUDGET_WORDS) and amounts:
        budget_amount = amounts[0]
    if saving_amount is None and any(word in text for word in _SAVING_WORDS) and amounts:
        saving_amount = amounts[1] if budget_amount is not None and len(amounts) > 1 else amounts[0]
    if budget_amount is not None and saving_amount == budget_amount and len(amounts) > 1:
        saving_amount = amounts[1] if amounts[0] == budget_amount else amounts[0]
    intents = []
    if budget_amount is not None or any(word in text for word in _BUDGET_WORDS):
        intents.append("budget")
    if saving_amount is not None or any(word in text for word in _SAVING_WORDS):
        intents.append("saving")
    intents.append("spending_plan")
    if any(word in text for word in _MEAL_WORDS):
        intents.append("meal_plan")
    return {"budget_amount": budget_amount, "saving_amount": saving_amount, "intents": intents}


def _monthly_bill_value(amount: float, frequency: str, days: int) -> float:
    if frequency == "daily":
        return amount * days
    if frequency == "weekly":
        return amount * 52 / 12
    if frequency == "yearly":
        return amount / 12
    return amount


def _remaining_bill_value(row: dict[str, Any], meta: dict[str, Any]) -> float:
    amount = float(row.get("amount") or 0)
    freq = row.get("frequency") or "monthly"
    if freq == "daily":
        return amount * meta["remaining_days"]
    if freq == "weekly":
        try:
            due = date.fromisoformat(str(row.get("next_due_date", ""))[:10])
        except ValueError:
            return amount * max(meta["remaining_days"] / 7, 1)
        while due < meta["today"]:
            due += timedelta(days=7)
        count = 0
        while due <= meta["end"]:
            count += 1
            due += timedelta(days=7)
        return amount * count
    try:
        due = date.fromisoformat(str(row.get("next_due_date", ""))[:10])
    except ValueError:
        return amount if freq == "monthly" else 0.0
    return amount if meta["today"] <= due <= meta["end"] else 0.0


def _fetch_money_context(user: dict, scope: str, month: str) -> dict[str, Any]:
    owner_id = _owner_id(user, scope)
    meta = _month_meta(month)
    stats = run_query_stats(user, scope, {"month": month})
    budget = run_query_budget_status(user, scope, {"month": month})
    categories = run_query_category_breakdown(user, scope, {"month": month, "limit": 8}).get("categories", [])
    accounts = run_query_accounts(user, scope, {})
    owner_col = "user_id" if scope == "personal" else "couple_id"

    with get_db() as conn:
        recurring_rows = [
            row_to_dict(row)
            for row in conn.execute(
                f"""
                SELECT title, amount, category, type, frequency, next_due_date, is_active
                FROM recurring_bills
                WHERE scope = ? AND {owner_col} = ? AND is_active = 1
                ORDER BY next_due_date ASC
                """,
                (scope, owner_id),
            ).fetchall()
        ]
        category_budgets = [
            dict(row)
            for row in conn.execute(
                "SELECT category, amount FROM category_budgets WHERE scope = ? AND owner_id = ? AND month = ?",
                (scope, owner_id, month),
            ).fetchall()
        ]
        savings_row = row_to_dict(
            conn.execute(
                "SELECT * FROM savings_plans WHERE scope = ? AND owner_id = ?",
                (scope, owner_id),
            ).fetchone()
        )

    recurring = []
    monthly_income = 0.0
    monthly_expense = 0.0
    remaining_income = 0.0
    remaining_expense = 0.0
    for row in recurring_rows:
        monthly_value = round(_monthly_bill_value(float(row["amount"]), row["frequency"], meta["days"]), 2)
        remaining_value = round(_remaining_bill_value(row, meta), 2)
        item = {**row, "monthly_value": monthly_value, "remaining_value": remaining_value}
        recurring.append(item)
        if row["type"] == "income":
            monthly_income += monthly_value
            remaining_income += remaining_value
        else:
            monthly_expense += monthly_value
            remaining_expense += remaining_value

    category_spent = {c["category"]: float(c["total"]) for c in categories}
    return {
        "scope": scope,
        "owner_id": owner_id,
        "month": month,
        "meta": {k: v for k, v in meta.items() if k not in ("start", "end", "today")},
        "stats": stats,
        "budget": budget,
        "categories": categories,
        "category_spent": category_spent,
        "category_budgets": category_budgets,
        "accounts": accounts,
        "savings_plan": savings_row,
        "recurring": {
            "items": recurring,
            "monthly_income": round(monthly_income, 2),
            "monthly_expense": round(monthly_expense, 2),
            "remaining_income": round(remaining_income, 2),
            "remaining_expense": round(remaining_expense, 2),
        },
    }


def _category_budget_drafts(total_budget: float, context: dict[str, Any]) -> list[dict[str, Any]]:
    recurring_expense = float(context["recurring"]["monthly_expense"])
    variable_budget = max(total_budget - recurring_expense, total_budget * 0.55, 0)
    categories = context.get("categories") or []
    drafts: list[dict[str, Any]] = []
    if categories:
        top = categories[:5]
        top_total = sum(float(c["total"]) for c in top) or 1
        for cat in top:
            amount = _round_money(variable_budget * float(cat["total"]) / top_total)
            if amount > 0:
                drafts.append({"category": cat["category"], "amount": amount})
    else:
        defaults = [("餐饮", 0.35), ("交通", 0.12), ("购物", 0.18), ("娱乐", 0.10), ("其他支出", 0.25)]
        drafts = [{"category": name, "amount": _round_money(variable_budget * weight)} for name, weight in defaults]

    if not any(item["category"] == "餐饮" for item in drafts):
        drafts.append({"category": "餐饮", "amount": _round_money(variable_budget * 0.32)})
    return [item for item in drafts if item["amount"] > 0][:6]


def _meal_cycle(daily_food_budget: float) -> list[dict[str, Any]]:
    days = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
    if daily_food_budget >= 90:
        meals = [
            ("酸奶燕麦+鸡蛋", "盖饭/粉面+青菜", "家常小炒+米饭"),
            ("豆浆包子", "轻食饭/拌饭", "番茄牛腩面"),
            ("三明治+牛奶", "快餐套餐", "虾仁炒饭+水果"),
            ("粥+鸡蛋", "麻辣烫少油版", "鸡胸/牛肉饭"),
            ("玉米+酸奶", "日式便当", "两菜一汤"),
            ("早餐店套餐", "简餐+汤", "火锅/烤肉小份"),
            ("水果麦片", "粉面+蛋白质", "清蒸鱼/炖菜"),
        ]
    elif daily_food_budget >= 55:
        meals = [
            ("鸡蛋豆浆", "盖浇饭", "青菜肉丝面"),
            ("燕麦牛奶", "粉面+卤蛋", "番茄炒蛋+米饭"),
            ("包子+粥", "社区食堂两菜", "鸡腿饭"),
            ("玉米+酸奶", "拌饭", "炒青菜+豆腐"),
            ("三明治", "简餐套餐", "番茄鸡蛋面"),
            ("豆浆油条少量", "饺子/馄饨", "家常炒饭"),
            ("鸡蛋馒头", "米粉+青菜", "土豆牛肉盖饭"),
        ]
    else:
        meals = [
            ("鸡蛋+馒头", "自带饭/食堂", "青菜面"),
            ("豆浆+包子", "米饭+一荤一素", "番茄鸡蛋面"),
            ("粥+鸡蛋", "炒饭小份", "豆腐青菜"),
            ("玉米/红薯", "粉面少加料", "家常炖菜"),
            ("燕麦", "社区食堂", "鸡蛋挂面"),
            ("馒头+牛奶", "饺子小份", "土豆丝+米饭"),
            ("鸡蛋面", "便当自带", "粥+青菜+蛋"),
        ]
    estimate = round(max(min(daily_food_budget, 95), 0), 2)
    return [
        {"day": day, "breakfast": meal[0], "lunch": meal[1], "dinner": meal[2], "estimated_total": estimate}
        for day, meal in zip(days, meals)
    ]


def _build_money_plan(message: str, context: dict[str, Any]) -> dict[str, Any]:
    parsed = _parse_money_intents(message)
    stats = context["stats"]
    budget = context["budget"]
    accounts = context["accounts"]
    meta = context["meta"]
    recurring = context["recurring"]
    income_base = max(float(stats.get("income") or 0), float(recurring["monthly_income"] or 0))
    current_expense = float(stats.get("expense") or 0)
    requested_budget = parsed["budget_amount"]
    requested_saving = parsed["saving_amount"]

    if requested_budget is not None:
        total_budget = requested_budget
    elif budget.get("budget", 0) > 0:
        total_budget = float(budget["budget"])
    elif income_base > 0:
        total_budget = max(income_base - float(recurring["monthly_expense"]) - float(requested_saving or 0), current_expense)
    else:
        total_budget = max(current_expense * 1.1, 1000)
    total_budget = _round_money(total_budget)

    if requested_saving is not None:
        monthly_saving = requested_saving
    else:
        surplus = income_base - float(recurring["monthly_expense"]) - total_budget
        monthly_saving = max(surplus, income_base * 0.08 if income_base > 0 else 0)
    monthly_saving = _round_money(monthly_saving)

    category_drafts = _category_budget_drafts(total_budget, context)
    food_budget = next((item["amount"] for item in category_drafts if item["category"] == "餐饮"), total_budget * 0.25)
    food_spent = float(context["category_spent"].get("餐饮", 0))
    daily_food_budget = round(max(food_budget - food_spent, 0) / meta["remaining_days"], 2)

    future_fixed = float(recurring["remaining_expense"])
    remaining_total = round(total_budget - current_expense, 2)
    flexible_left = round(max(remaining_total - future_fixed, 0), 2)
    daily_available = round(flexible_left / meta["remaining_days"], 2)
    total_balance = round(float(accounts.get("net_worth") or 0), 2)
    fixed_amount = round(min(max(monthly_saving, 0), max(total_balance, 0)), 2)
    reserve_floor = round(min(max(monthly_saving, float(recurring["monthly_expense"]) * 0.5), max(total_balance, 0)), 2)

    savings_draft = {
        "scope": context["scope"],
        "enabled": monthly_saving > 0,
        "fixed_amount": fixed_amount,
        "monthly_amount": monthly_saving,
        "reserve_floor": reserve_floor,
        "goal_name": "钱小参每月攒钱计划",
        "target_date": None,
    }

    spending_plan = [
        {
            "title": "先预留固定账单",
            "amount": round(future_fixed, 2),
            "note": "把本月还没扣的房租、会员、分期或固定收入先放进计划里。",
        },
        {
            "title": "日常可支配",
            "amount": flexible_left,
            "note": f"接下来 {meta['remaining_days']} 天，日均约 {daily_available:.2f} 元。",
        },
        {
            "title": "餐饮节奏",
            "amount": round(food_budget, 2),
            "note": f"餐饮本月建议控制在 {food_budget:.2f} 元内，剩余日均约 {daily_food_budget:.2f} 元。",
        },
    ]

    suggestions = []
    if income_base <= 0:
        suggestions.append("先补一笔本月收入或把工资设成固定收入，后续计划会更准。")
    if not context["recurring"]["items"]:
        suggestions.append("把房租、会员、工资等设为固定账单，钱小参会自动预留未来扣款。")
    if remaining_total < 0:
        suggestions.append("本月已经超过建议限额，接下来优先暂停非必要大额消费。")
    elif daily_available < 50:
        suggestions.append("日均可支配偏紧，外卖和临时购物建议合并到隔天再决定。")
    else:
        suggestions.append("预算节奏还可控，大额消费建议先放进愿望清单等月底复盘。")
    if monthly_saving > 0:
        suggestions.append(f"每月先留出 {monthly_saving:.2f} 元，再安排可变支出，会比月底剩多少存多少更稳。")

    summary = (
        f"我建议把 {context['month']} 总支出限额设为 {total_budget:.2f} 元，"
        f"每月留存 {monthly_saving:.2f} 元；扣除已花和待扣固定账单后，"
        f"接下来日均可支配约 {daily_available:.2f} 元。"
    )
    return {
        "assistant_name": ASSISTANT_NAME,
        "scope": context["scope"],
        "month": context["month"],
        "intents": parsed["intents"],
        "summary": summary,
        "context": {
            "income": round(float(stats.get("income") or 0), 2),
            "expense": round(current_expense, 2),
            "balance": round(float(stats.get("balance") or 0), 2),
            "account_balance": total_balance,
            "budget": round(float(budget.get("budget") or 0), 2),
            "budget_spent": round(float(budget.get("spent") or 0), 2),
            "recurring_income": round(float(recurring["monthly_income"]), 2),
            "recurring_expense": round(float(recurring["monthly_expense"]), 2),
            "recurring_remaining_expense": round(future_fixed, 2),
            "remaining_days": meta["remaining_days"],
        },
        "drafts": {
            "budget_total": {"scope": context["scope"], "month": context["month"], "amount": total_budget},
            "category_budgets": category_drafts,
            "savings_plan": savings_draft,
        },
        "spending_plan": spending_plan,
        "meal_plan": _meal_cycle(daily_food_budget),
        "suggestions": suggestions,
        "recurring_bills": recurring["items"][:6],
        "applied": {"budget_total": False, "category_budgets": 0, "savings_plan": False},
    }


def _upsert_total_budget(conn, scope: str, owner_id: str, month: str, amount: float) -> None:
    existing = conn.execute(
        "SELECT id FROM budgets WHERE scope = ? AND owner_id = ? AND month = ?",
        (scope, owner_id, month),
    ).fetchone()
    if existing:
        conn.execute("UPDATE budgets SET amount = ? WHERE id = ?", (amount, existing["id"]))
    else:
        conn.execute(
            "INSERT INTO budgets (id, scope, owner_id, month, amount, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (new_id(), scope, owner_id, month, amount, utcnow()),
        )


def _upsert_category_budget(conn, scope: str, owner_id: str, month: str, category: str, amount: float) -> None:
    existing = conn.execute(
        "SELECT id FROM category_budgets WHERE scope = ? AND owner_id = ? AND month = ? AND category = ?",
        (scope, owner_id, month, category),
    ).fetchone()
    if existing:
        conn.execute("UPDATE category_budgets SET amount = ? WHERE id = ?", (amount, existing["id"]))
    else:
        conn.execute(
            "INSERT INTO category_budgets (id, scope, owner_id, month, category, amount, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (new_id(), scope, owner_id, month, category, amount, utcnow()),
        )


def _upsert_savings_plan(conn, scope: str, owner_id: str, draft: dict[str, Any], month: str) -> None:
    now = utcnow()
    existing = conn.execute(
        "SELECT id, last_reserved_month FROM savings_plans WHERE scope = ? AND owner_id = ?",
        (scope, owner_id),
    ).fetchone()
    last_reserved_month = month if draft.get("monthly_amount", 0) > 0 else None
    if existing:
        conn.execute(
            """
            UPDATE savings_plans
            SET enabled = ?, fixed_amount = ?, monthly_amount = ?, reserve_floor = ?,
                goal_name = ?, target_date = ?, last_reserved_month = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                int(bool(draft.get("enabled"))),
                float(draft.get("fixed_amount") or 0),
                float(draft.get("monthly_amount") or 0),
                float(draft.get("reserve_floor") or 0),
                draft.get("goal_name") or "",
                draft.get("target_date"),
                last_reserved_month or existing["last_reserved_month"],
                now,
                existing["id"],
            ),
        )
    else:
        conn.execute(
            """
            INSERT INTO savings_plans
            (id, scope, owner_id, enabled, fixed_amount, monthly_amount, reserve_floor,
             goal_name, target_date, last_reserved_month, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                new_id(),
                scope,
                owner_id,
                int(bool(draft.get("enabled"))),
                float(draft.get("fixed_amount") or 0),
                float(draft.get("monthly_amount") or 0),
                float(draft.get("reserve_floor") or 0),
                draft.get("goal_name") or "",
                draft.get("target_date"),
                last_reserved_month,
                now,
                now,
            ),
        )


def _apply_money_plan(plan: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
    applied = {"budget_total": False, "category_budgets": 0, "savings_plan": False}
    drafts = plan["drafts"]
    with get_db() as conn:
        budget_total = drafts["budget_total"]
        if float(budget_total["amount"]) > 0:
            _upsert_total_budget(
                conn,
                context["scope"],
                context["owner_id"],
                context["month"],
                float(budget_total["amount"]),
            )
            applied["budget_total"] = True
        for item in drafts.get("category_budgets", []):
            if float(item.get("amount") or 0) <= 0:
                continue
            _upsert_category_budget(
                conn,
                context["scope"],
                context["owner_id"],
                context["month"],
                item["category"],
                float(item["amount"]),
            )
            applied["category_budgets"] += 1
        savings = drafts.get("savings_plan") or {}
        if float(savings.get("monthly_amount") or 0) > 0 or float(savings.get("reserve_floor") or 0) > 0:
            _upsert_savings_plan(conn, context["scope"], context["owner_id"], savings, context["month"])
            applied["savings_plan"] = True
    return applied


@router.post("/money-action")
async def money_action(body: AiMoneyActionRequest, current_user: dict = Depends(get_current_user)) -> dict[str, Any]:
    month = _normalize_month(body.month)
    context = _fetch_money_context(current_user, body.scope, month)
    plan = _build_money_plan(body.message, context)
    if body.apply:
        plan["applied"] = _apply_money_plan(plan, context)
        plan["summary"] = "已应用：" + plan["summary"]
    return plan


@router.get("/report/weekly")
async def weekly_report(
    scope: str = Query("personal"),
    current_user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    _validate_scope_access(current_user, scope)
    end = date.fromisoformat(local_today())
    start = end - timedelta(days=6)

    where = "scope=? AND user_id=?" if scope == "personal" else "scope=? AND couple_id=?"
    oid = current_user["id"] if scope == "personal" else current_user["couple_id"]
    start_s, end_s = start.isoformat(), end.isoformat()

    with get_db() as conn:
        totals = {
            r["type"]: float(r["total"])
            for r in conn.execute(
                f"""
                SELECT type, SUM(amount) AS total FROM transactions
                WHERE {where} AND tx_date >= ? AND tx_date <= ?
                AND (tx_kind IS NULL OR tx_kind='normal')
                GROUP BY type
                """,
                (scope, oid, start_s, end_s),
            ).fetchall()
        }
        cats = conn.execute(
            f"""
            SELECT category, SUM(amount) AS total FROM transactions
            WHERE {where} AND tx_date >= ? AND tx_date <= ? AND type='expense'
            AND (tx_kind IS NULL OR tx_kind='normal')
            GROUP BY category ORDER BY total DESC LIMIT 5
            """,
            (scope, oid, start_s, end_s),
        ).fetchall()

    income = totals.get("income", 0.0)
    expense = totals.get("expense", 0.0)
    top_cats = [dict(c) for c in cats]
    summary = {
        "period": f"{start_s} ~ {end_s}",
        "income": round(income, 2),
        "expense": round(expense, 2),
        "balance": round(income - expense, 2),
        "top_categories": top_cats,
    }

    insight = f"本周支出 ¥{expense:.2f}"
    if top_cats:
        insight += f"，最大开销在「{top_cats[0]['category']}」¥{top_cats[0]['total']:.2f}"

    if settings.openai_api_key:
        try:
            result = await _openai_request({
                "model": settings.openai_model,
                "messages": [
                    {"role": "system", "content": "你是财务顾问，根据数据写2-3句温暖实用的周报洞察。"},
                    {"role": "user", "content": json.dumps(summary, ensure_ascii=False)},
                ],
                "temperature": 0.5,
            })
            insight = result["choices"][0]["message"]["content"].strip()
        except Exception:
            pass

    return {"summary": summary, "insight": insight}


@router.get("/report/monthly")
async def monthly_report(
    month: str = Query(None),
    scope: str = Query("personal"),
    current_user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    _validate_scope_access(current_user, scope)
    month = month or local_today()[:7]
    stats = run_query_stats(current_user, scope, {"month": month})
    budget = run_query_budget_status(current_user, scope, {"month": month})
    snapshot = build_context_snapshot(current_user, scope)

    with get_db() as conn:
        where = "scope=? AND user_id=?" if scope == "personal" else "scope=? AND couple_id=?"
        oid = current_user["id"] if scope == "personal" else current_user["couple_id"]
        cats = conn.execute(
            f"""
            SELECT category, SUM(amount) AS total FROM transactions
            WHERE {where} AND tx_date LIKE ? AND type='expense'
            AND (tx_kind IS NULL OR tx_kind='normal')
            GROUP BY category ORDER BY total DESC
            """,
            (scope, oid, f"{month}%"),
        ).fetchall()

    summary = {
        "month": month,
        "income": stats["income"],
        "expense": stats["expense"],
        "balance": stats["balance"],
        "budget": budget,
        "categories": [dict(c) for c in cats],
    }

    insight = f"{month} 收入 ¥{stats['income']:.2f}，支出 ¥{stats['expense']:.2f}"
    if budget["over_budget"]:
        insight += f"，已超预算 ¥{budget['spent'] - budget['budget']:.2f}"

    if settings.openai_api_key:
        try:
            result = await _openai_request({
                "model": settings.openai_model,
                "messages": [
                    {"role": "system", "content": "你是财务顾问，根据月报数据写3-4句洞察与建议。"},
                    {"role": "user", "content": json.dumps({**summary, "snapshot": snapshot}, ensure_ascii=False, default=str)},
                ],
                "temperature": 0.5,
            })
            insight = result["choices"][0]["message"]["content"].strip()
        except Exception:
            pass

    return {"summary": summary, "insight": insight}


@router.get("/alerts")
def spending_alerts(
    scope: str = Query("personal"),
    current_user: dict = Depends(get_current_user),
) -> list[dict[str, Any]]:
    _validate_scope_access(current_user, scope)
    month = local_today()[:7]
    alerts: list[dict[str, Any]] = []
    budget = run_query_budget_status(current_user, scope, {"month": month})

    if budget["budget"] > 0:
        pct = budget["spent"] / budget["budget"] * 100
        if budget["over_budget"]:
            alerts.append({
                "type": "budget_over",
                "severity": "high",
                "message": f"本月已超预算 ¥{budget['spent'] - budget['budget']:.2f}",
            })
        elif pct >= 80:
            alerts.append({
                "type": "budget_warning",
                "severity": "medium",
                "message": f"本月预算已用 {pct:.0f}%，剩余 ¥{budget['remaining']:.2f}",
            })

    owner_id = current_user["couple_id"] if scope == "couple" else current_user["id"]
    with get_db() as conn:
        cat_budgets = conn.execute(
            "SELECT category, amount FROM category_budgets WHERE scope=? AND owner_id=? AND month=?",
            (scope, owner_id, month),
        ).fetchall()
        for cb in cat_budgets:
            spent = conn.execute(
                f"""
                SELECT COALESCE(SUM(amount),0) AS t FROM transactions
                WHERE scope=? AND {'user_id' if scope == 'personal' else 'couple_id'}=?
                AND category=? AND tx_date LIKE ? AND type='expense'
                AND (tx_kind IS NULL OR tx_kind='normal')
                """,
                (scope, owner_id, cb["category"], f"{month}%"),
            ).fetchone()["t"]
            if cb["amount"] > 0 and spent > cb["amount"]:
                alerts.append({
                    "type": "category_over",
                    "severity": "medium",
                    "message": f"「{cb['category']}」分类超支 ¥{spent - cb['amount']:.2f}",
                    "category": cb["category"],
                })

    return alerts
