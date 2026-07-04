"""Unified AI agent: data-grounded replies for chat, parse, and reports."""

from __future__ import annotations

import json
import re
from datetime import date, timedelta
from typing import Any

import httpx
from fastapi import HTTPException

from app.config import settings
from app.db import get_db, local_today
from app.routers.transactions import _validate_scope_access

# Keywords that indicate the user wants factual ledger data.
_DATA_QUERY_RE = re.compile(
    r"(多少|花了|支出|收入|结余|预算|超支|账单|记账|分类|占比|排行|最大|最小|"
    r"账户|余额|净资产|查询|统计|对比|上周|上月|本月|昨天|最近|明细|搜索|找|"
    r"看看|查|数据|信息|花了|用了|还剩|多少錢|多少钱|消费|开销|流水|账本|平台)",
    re.I,
)

_AMOUNT_RE = re.compile(r"¥?\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)")

JELLY_PERSONA = """你是情侣记账 App 里的 AI 成员「果冻」。
人设：轻松、会接梗，但对数字必须严谨。
规则：
- 只能读取 App 内账本（个人/情侣），不能联网搜索。
- 用户问花费/预算/分类/账户时：先报准确数字（两位小数），再补一句简短点评或吐槽。
- 账本无数据就说「这边账本里还没有记录」，不要编造。
- 闲聊可以活泼，但涉及金额时禁止开玩笑改数字。
- 2-4 句为宜。"""

FACTUAL_SYSTEM = """你是情侣记账 App 的财务 AI 助手。回答简洁、温暖、实用。
规则：只能使用提供的真实数据；金额保留两位小数；没有数据就说明没有。"""

TOOLS = [
    {
        "name": "query_stats",
        "description": "查询指定月份的收支统计汇总",
        "parameters": {
            "type": "object",
            "properties": {
                "month": {"type": "string", "description": "YYYY-MM"},
                "year": {"type": "string", "description": "YYYY，查全年时用"},
            },
        },
    },
    {
        "name": "query_category_breakdown",
        "description": "查询分类支出排行与占比",
        "parameters": {
            "type": "object",
            "properties": {
                "month": {"type": "string"},
                "limit": {"type": "integer"},
            },
        },
    },
    {
        "name": "query_transactions",
        "description": "查询账目明细列表",
        "parameters": {
            "type": "object",
            "properties": {
                "month": {"type": "string"},
                "category": {"type": "string"},
                "type": {"type": "string", "enum": ["income", "expense"]},
                "keyword": {"type": "string"},
                "limit": {"type": "integer"},
            },
        },
    },
    {
        "name": "query_budget_status",
        "description": "查询预算使用与超支情况",
        "parameters": {
            "type": "object",
            "properties": {"month": {"type": "string"}},
        },
    },
    {
        "name": "query_accounts",
        "description": "查询各账户余额与净资产",
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "search_transactions",
        "description": "按日期范围、关键词、金额搜索账单",
        "parameters": {
            "type": "object",
            "properties": {
                "start_date": {"type": "string", "description": "YYYY-MM-DD"},
                "end_date": {"type": "string", "description": "YYYY-MM-DD"},
                "keyword": {"type": "string"},
                "min_amount": {"type": "number"},
                "max_amount": {"type": "number"},
                "limit": {"type": "integer"},
            },
        },
    },
]


def is_data_query(message: str) -> bool:
    return bool(_DATA_QUERY_RE.search(message))


def resolve_date_range(text: str) -> dict[str, str]:
    """Resolve relative Chinese date phrases to ISO dates."""
    today = date.fromisoformat(local_today())
    text_l = text.lower()

    if "昨天" in text:
        d = today - timedelta(days=1)
        return {"start_date": d.isoformat(), "end_date": d.isoformat(), "month": d.strftime("%Y-%m")}
    if "上周" in text or "上一周" in text:
        start = today - timedelta(days=today.weekday() + 7)
        end = start + timedelta(days=6)
        return {"start_date": start.isoformat(), "end_date": end.isoformat(), "month": today.strftime("%Y-%m")}
    if "上月" in text or "上个月" in text:
        first = today.replace(day=1)
        last_month_end = first - timedelta(days=1)
        start = last_month_end.replace(day=1)
        return {
            "start_date": start.isoformat(),
            "end_date": last_month_end.isoformat(),
            "month": start.strftime("%Y-%m"),
        }
    if "最近7天" in text or "近7天" in text or "最近七天" in text:
        start = today - timedelta(days=6)
        return {"start_date": start.isoformat(), "end_date": today.isoformat(), "month": today.strftime("%Y-%m")}
    if "本月" in text or "这个月" in text:
        m = today.strftime("%Y-%m")
        return {"start_date": f"{m}-01", "end_date": today.isoformat(), "month": m}

    m = today.strftime("%Y-%m")
    return {"start_date": f"{m}-01", "end_date": today.isoformat(), "month": m}


def _scope_clause(scope: str, user: dict) -> tuple[str, list[Any]]:
    if scope == "personal":
        return "scope='personal' AND user_id=?", [user["id"]]
    return "scope='couple' AND couple_id=?", [user["couple_id"]]


def run_query_stats(user: dict, scope: str, args: dict) -> dict[str, Any]:
    prefix = args.get("month") or args.get("year") or local_today()[:7]
    where, params = _scope_clause(scope, user)
    query = (
        f"SELECT type, SUM(amount) AS total, COUNT(*) AS cnt FROM transactions "
        f"WHERE {where} AND tx_date LIKE ? AND (tx_kind IS NULL OR tx_kind='normal') GROUP BY type"
    )
    params = params + [f"{prefix}%"]
    with get_db() as conn:
        rows = [dict(r) for r in conn.execute(query, params).fetchall()]
    result: dict[str, Any] = {"income": 0.0, "expense": 0.0, "period": prefix, "scope": scope}
    for r in rows:
        result[r["type"]] = float(r["total"])
    result["balance"] = result["income"] - result["expense"]
    return result


def run_query_category_breakdown(user: dict, scope: str, args: dict) -> dict[str, Any]:
    month = args.get("month") or local_today()[:7]
    limit = min(args.get("limit", 10), 20)
    where, params = _scope_clause(scope, user)
    with get_db() as conn:
        rows = conn.execute(
            f"""
            SELECT category, SUM(amount) AS total, COUNT(*) AS cnt FROM transactions
            WHERE {where} AND tx_date LIKE ? AND type='expense'
            AND (tx_kind IS NULL OR tx_kind='normal')
            GROUP BY category ORDER BY total DESC LIMIT ?
            """,
            params + [f"{month}%", limit],
        ).fetchall()
    cats = [dict(r) for r in rows]
    total = sum(c["total"] for c in cats) or 1.0
    for c in cats:
        c["pct"] = round(c["total"] / total * 100, 1)
    return {"month": month, "categories": cats, "total_expense": total if cats else 0.0}


def run_query_transactions(user: dict, scope: str, args: dict) -> dict[str, Any]:
    where, params = _scope_clause(scope, user)
    query = f"SELECT amount, category, type, note, tx_date FROM transactions WHERE {where}"
    if args.get("month"):
        query += " AND tx_date LIKE ?"
        params.append(f"{args['month']}%")
    if args.get("category"):
        query += " AND category=?"
        params.append(args["category"])
    if args.get("type"):
        query += " AND type=?"
        params.append(args["type"])
    if args.get("keyword"):
        query += " AND (note LIKE ? OR category LIKE ?)"
        kw = f"%{args['keyword']}%"
        params.extend([kw, kw])
    query += " AND (tx_kind IS NULL OR tx_kind='normal') ORDER BY tx_date DESC LIMIT ?"
    params.append(min(args.get("limit", 20), 50))
    with get_db() as conn:
        rows = [dict(r) for r in conn.execute(query, params).fetchall()]
    return {
        "transactions": rows,
        "count": len(rows),
        "total_expense": sum(r["amount"] for r in rows if r["type"] == "expense"),
        "total_income": sum(r["amount"] for r in rows if r["type"] == "income"),
    }


def run_query_budget_status(user: dict, scope: str, args: dict) -> dict[str, Any]:
    month = args.get("month") or local_today()[:7]
    owner_id = user["couple_id"] if scope == "couple" else user["id"]
    with get_db() as conn:
        budget = conn.execute(
            "SELECT amount FROM budgets WHERE scope=? AND owner_id=? AND month=?",
            (scope, owner_id, month),
        ).fetchone()
        spent = conn.execute(
            f"""
            SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
            WHERE scope=? AND {'user_id' if scope == 'personal' else 'couple_id'}=?
            AND tx_date LIKE ? AND type='expense'
            AND (tx_kind IS NULL OR tx_kind='normal')
            """,
            (scope, owner_id, f"{month}%"),
        ).fetchone()["total"]
    budget_amt = float(budget["amount"]) if budget else 0.0
    spent_f = float(spent)
    return {
        "month": month,
        "budget": budget_amt,
        "spent": spent_f,
        "remaining": budget_amt - spent_f,
        "over_budget": spent_f > budget_amt if budget_amt > 0 else False,
    }


def run_query_accounts(user: dict, scope: str, _args: dict) -> dict[str, Any]:
    where, params = _scope_clause(scope, user)
    with get_db() as conn:
        rows = conn.execute(
            f"SELECT name, kind, balance, currency FROM accounts WHERE {where} AND is_archived=0 ORDER BY balance DESC",
            params,
        ).fetchall()
    accounts = [dict(r) for r in rows]
    net = sum(a["balance"] for a in accounts)
    return {"accounts": accounts, "net_worth": net, "count": len(accounts)}


def run_search_transactions(user: dict, scope: str, args: dict) -> dict[str, Any]:
    where, params = _scope_clause(scope, user)
    query = f"SELECT amount, category, type, note, tx_date FROM transactions WHERE {where}"
    if args.get("start_date"):
        query += " AND tx_date >= ?"
        params.append(args["start_date"])
    if args.get("end_date"):
        query += " AND tx_date <= ?"
        params.append(args["end_date"])
    if args.get("keyword"):
        query += " AND (note LIKE ? OR category LIKE ?)"
        kw = f"%{args['keyword']}%"
        params.extend([kw, kw])
    if args.get("min_amount") is not None:
        query += " AND amount >= ?"
        params.append(args["min_amount"])
    if args.get("max_amount") is not None:
        query += " AND amount <= ?"
        params.append(args["max_amount"])
    query += " AND (tx_kind IS NULL OR tx_kind='normal') ORDER BY tx_date DESC LIMIT ?"
    params.append(min(args.get("limit", 20), 50))
    with get_db() as conn:
        rows = [dict(r) for r in conn.execute(query, params).fetchall()]
    return {"transactions": rows, "count": len(rows)}


def execute_tool(name: str, args: dict, user: dict, scope: str) -> Any:
    runners = {
        "query_stats": run_query_stats,
        "query_category_breakdown": run_query_category_breakdown,
        "query_transactions": run_query_transactions,
        "query_budget_status": run_query_budget_status,
        "query_accounts": run_query_accounts,
        "search_transactions": run_search_transactions,
    }
    fn = runners.get(name)
    if not fn:
        return {"error": f"unknown function: {name}"}
    return fn(user, scope, args)


def build_context_snapshot(user: dict, scope: str) -> dict[str, Any]:
    month = local_today()[:7]
    stats = run_query_stats(user, scope, {"month": month})
    budget = run_query_budget_status(user, scope, {"month": month})
    cats = run_query_category_breakdown(user, scope, {"month": month, "limit": 5})
    scope_label = "情侣账本" if scope == "couple" else "个人账本"
    return {
        "scope": scope,
        "scope_label": scope_label,
        "month": month,
        "stats": stats,
        "budget": budget,
        "top_categories": cats.get("categories", []),
    }


def build_citation(snapshot: dict, tool_data: list[dict]) -> str:
    parts = [f"{snapshot['scope_label']} · {snapshot['month']}"]
    s = snapshot.get("stats", {})
    if s:
        parts.append(f"收入 ¥{s.get('income', 0):.2f} / 支出 ¥{s.get('expense', 0):.2f}")
    if tool_data:
        names = {t["function"] for t in tool_data}
        parts.append(f"查询: {', '.join(sorted(names))}")
    return " · ".join(parts)


def _extract_amounts(text: str) -> list[float]:
    amounts: list[float] = []
    for m in _AMOUNT_RE.finditer(text):
        end = m.end()
        if end < len(text) and text[end] == "%":
            continue
        amounts.append(float(m.group(1).replace(",", "")))
    return amounts


def _collect_allowed_amounts(snapshot: dict, tool_data: list[dict]) -> set[float]:
    allowed: set[float] = set()
    s = snapshot.get("stats", {})
    for key in ("income", "expense", "balance"):
        if key in s:
            allowed.add(round(float(s[key]), 2))
    b = snapshot.get("budget", {})
    for key in ("budget", "spent", "remaining"):
        if key in b:
            allowed.add(round(float(b[key]), 2))
    for item in tool_data:
        result = item.get("result", {})
        if isinstance(result, dict):
            for key in ("income", "expense", "balance", "budget", "spent", "remaining", "net_worth", "total_expense", "total_income"):
                if key in result:
                    allowed.add(round(float(result[key]), 2))
            for tx in result.get("transactions", []):
                allowed.add(round(float(tx.get("amount", 0)), 2))
            for cat in result.get("categories", []):
                allowed.add(round(float(cat.get("total", 0)), 2))
            for acc in result.get("accounts", []):
                allowed.add(round(float(acc.get("balance", 0)), 2))
    return allowed


def validate_reply_amounts(reply: str, snapshot: dict, tool_data: list[dict], tolerance: float = 0.02) -> bool:
    amounts = _extract_amounts(reply)
    if not amounts:
        return True
    allowed = _collect_allowed_amounts(snapshot, tool_data)
    if not allowed:
        return False
    for amt in amounts:
        if not any(abs(amt - a) <= tolerance for a in allowed):
            return False
    return True


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
        raise HTTPException(status_code=502, detail=f"AI error: {resp.text[:200]}")
    return resp.json()


def _fallback_reply(user: dict, scope: str, message: str, persona: str) -> dict[str, Any]:
    dr = resolve_date_range(message)
    month = dr["month"]
    snapshot = build_context_snapshot(user, scope)
    stats = run_query_stats(user, scope, {"month": month})
    budget = run_query_budget_status(user, scope, {"month": month})
    scope_label = snapshot["scope_label"]
    if persona == "jelly":
        reply = (
            f"果冻离线翻账本模式：{scope_label} {month} 收入 ¥{stats['income']:.2f}，"
            f"支出 ¥{stats['expense']:.2f}，结余 ¥{stats['balance']:.2f}。"
        )
        if budget["budget"] > 0:
            reply += f" 预算用了 ¥{budget['spent']:.2f}/{budget['budget']:.2f}。"
    else:
        reply = (
            f"{scope_label} {month}：收入 ¥{stats['income']:.2f}，"
            f"支出 ¥{stats['expense']:.2f}，结余 ¥{stats['balance']:.2f}。"
        )
    citation = build_citation(snapshot, [])
    return {"reply": reply, "data": [], "citation": citation, "snapshot": snapshot}


def _try_direct_answer(message: str, prefetch: list[dict], snapshot: dict, persona: str) -> str | None:
    """Answer common ledger questions directly from DB prefetch — zero hallucination."""
    stats = next((t["result"] for t in prefetch if t["function"] == "query_stats"), None)
    budget = next((t["result"] for t in prefetch if t["function"] == "query_budget_status"), None)
    cats = next((t["result"] for t in prefetch if t["function"] == "query_category_breakdown"), None)
    if not stats:
        return None

    label = snapshot.get("scope_label", "账本")
    month = snapshot.get("month", stats.get("period", ""))
    expense = float(stats.get("expense", 0))
    income = float(stats.get("income", 0))
    balance = float(stats.get("balance", 0))

    def wrap(factual: str) -> str:
        if persona != "jelly":
            return factual
        if expense == 0 and income == 0:
            return f"{factual} 账本空空如也，果冻都快饿瘦了——先去记一笔？"
        if expense > income and expense > 0:
            return f"{factual} 支出压过收入了，该省省了。"
        return f"{factual} 数据来自你们的{label}，准得很。"

    m = message
    if any(k in m for k in ("花了多少", "支出多少", "消费多少", "花了多少钱", "用掉多少", "支出情况")):
        return wrap(f"{label} {month}：支出 ¥{expense:.2f}，收入 ¥{income:.2f}，结余 ¥{balance:.2f}。")

    if any(k in m for k in ("收入多少", "赚了多少", "入账")):
        return wrap(f"{label} {month} 收入 ¥{income:.2f}，支出 ¥{expense:.2f}，结余 ¥{balance:.2f}。")

    if any(k in m for k in ("结余", "剩多少", "余额多少")) and "账户" not in m:
        return wrap(f"{label} {month} 结余 ¥{balance:.2f}（收入 ¥{income:.2f} − 支出 ¥{expense:.2f}）。")

    if budget and any(k in m for k in ("预算", "超支", "还剩多少预算")):
        b = float(budget.get("budget", 0))
        spent = float(budget.get("spent", 0))
        if b <= 0:
            return wrap(f"{label} {month} 还没设月度预算。当前支出 ¥{spent:.2f}。")
        remain = float(budget.get("remaining", 0))
        if budget.get("over_budget"):
            return wrap(f"{label} {month} 预算 ¥{b:.2f}，已花 ¥{spent:.2f}，超支 ¥{spent - b:.2f}。")
        return wrap(f"{label} {month} 预算 ¥{b:.2f}，已用 ¥{spent:.2f}，剩余 ¥{remain:.2f}。")

    if cats and any(k in m for k in ("分类", "占比", "排行", "最多", "哪类", "什么花")):
        top = cats.get("categories") or []
        if not top:
            return wrap(f"{label} {month} 还没有支出分类记录。")
        lead = top[0]
        parts = "、".join(f"「{c['category']}」¥{c['total']:.2f}" for c in top[:3])
        return wrap(f"{label} {month} 支出 Top：{parts}。最多的是「{lead['category']}」¥{lead['total']:.2f}。")

    return None


def _prefetch_ledger_tools(user: dict, scope: str, dr: dict) -> list[dict]:
    """Always query DB before LLM so jelly has real numbers even if tools are skipped."""
    month = dr.get("month") or local_today()[:7]
    return [
        {"function": "query_stats", "args": {"month": month}, "result": run_query_stats(user, scope, {"month": month})},
        {"function": "query_budget_status", "args": {"month": month}, "result": run_query_budget_status(user, scope, {"month": month})},
        {"function": "query_category_breakdown", "args": {"month": month, "limit": 8}, "result": run_query_category_breakdown(user, scope, {"month": month, "limit": 8})},
        {"function": "query_accounts", "args": {}, "result": run_query_accounts(user, scope, {})},
    ]


async def generate_reply(
    user: dict,
    message: str,
    scope: str = "personal",
    *,
    persona: str = "jelly",
) -> dict[str, Any]:
    """Generate a data-grounded AI reply."""
    _validate_scope_access(user, scope)
    snapshot = build_context_snapshot(user, scope)
    dr = resolve_date_range(message)
    data_query = is_data_query(message)
    prefetch = _prefetch_ledger_tools(user, scope, dr)

    if not settings.openai_api_key:
        return _fallback_reply(user, scope, message, persona)

    # Common ledger questions: answer straight from DB, LLM only adds flavor for complex ones.
    if data_query or persona == "jelly":
        direct = _try_direct_answer(message, prefetch, snapshot, persona)
        if direct:
            citation = build_citation(snapshot, prefetch)
            return {"reply": direct, "data": prefetch, "citation": citation, "snapshot": snapshot}

    system = JELLY_PERSONA if persona == "jelly" else FACTUAL_SYSTEM
    context_block = (
        f"当前账本: {snapshot['scope_label']}\n"
        f"日期解析: {json.dumps(dr, ensure_ascii=False)}\n"
        f"数据快照:\n{json.dumps(snapshot, ensure_ascii=False, default=str)}\n"
        f"已预查数据库结果:\n{json.dumps(prefetch, ensure_ascii=False, default=str)}\n"
        "你只能引用上述数据或工具返回的数据。没有联网搜索。禁止编造金额。"
    )
    messages: list[dict[str, Any]] = [
        {"role": "system", "content": system + "\n\n" + context_block},
        {"role": "user", "content": message},
    ]

    temp_factual = 0.3
    temp_persona = 0.5 if persona == "jelly" else 0.3

    # Jelly always must consult ledger tools; factual assistant when user asks data.
    force_tools = persona == "jelly" or data_query

    payload: dict[str, Any] = {
        "model": settings.openai_model,
        "messages": messages,
        "tools": [{"type": "function", "function": f} for f in TOOLS],
        "temperature": temp_factual if force_tools else temp_persona,
    }
    if force_tools:
        payload["tool_choice"] = "required"
    else:
        payload["tool_choice"] = "auto"

    tool_data: list[dict] = list(prefetch)
    try:
        result = await _openai_request(payload)
        choice = result["choices"][0]["message"]

        if choice.get("tool_calls"):
            messages.append(choice)
            for tc in choice["tool_calls"]:
                fn = tc["function"]["name"]
                args = json.loads(tc["function"]["arguments"] or "{}")
                if not args.get("month") and dr.get("month") and fn in (
                    "query_stats", "query_category_breakdown", "query_transactions", "query_budget_status",
                ):
                    args.setdefault("month", dr["month"])
                if fn == "search_transactions":
                    args.setdefault("start_date", dr.get("start_date"))
                    args.setdefault("end_date", dr.get("end_date"))
                output = execute_tool(fn, args, user, scope)
                tool_data.append({"function": fn, "args": args, "result": output})
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc["id"],
                    "content": json.dumps(output, ensure_ascii=False, default=str),
                })

            final = await _openai_request({
                "model": settings.openai_model,
                "messages": messages,
                "temperature": temp_factual if force_tools else temp_persona,
            })
            reply = (final["choices"][0]["message"].get("content") or "").strip()
        else:
            reply = (choice.get("content") or "").strip()

        if not reply:
            reply = "本果冻刚刚走神了，你再戳我一下。" if persona == "jelly" else "暂时无法回答，请稍后再试。"

        if data_query and not validate_reply_amounts(reply, snapshot, tool_data):
            strict = await _openai_request({
                "model": settings.openai_model,
                "messages": [
                    {"role": "system", "content": "你只能使用以下 JSON 数据回答，金额必须完全一致，用中文简洁回答。"},
                    {"role": "user", "content": json.dumps({"question": message, "data": tool_data, "snapshot": snapshot}, ensure_ascii=False, default=str)},
                ],
                "temperature": 0.1,
            })
            reply = strict["choices"][0]["message"]["content"].strip()
            if not validate_reply_amounts(reply, snapshot, tool_data):
                return _fallback_reply(user, scope, message, persona)

        citation = build_citation(snapshot, tool_data)
        return {"reply": reply, "data": tool_data, "citation": citation, "snapshot": snapshot}

    except HTTPException:
        raise
    except Exception:
        return _fallback_reply(user, scope, message, persona)


async def generate_couple_ai_reply(user: dict, message: str, scope: str = "couple") -> dict[str, Any]:
    """Jelly chat: always ledger-grounded, no web search."""
    return await generate_reply(user, message, scope, persona="jelly")
