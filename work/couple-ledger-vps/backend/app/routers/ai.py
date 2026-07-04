from __future__ import annotations

import json
import re
from datetime import datetime, timedelta
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user
from app.config import settings
from app.db import local_today
from app.feature_flags import require_feature
from app.schemas import AiChatRequest, AiParseRequest, AiQuickTransactionBatchRequest, AiQuickTransactionRequest
from app.services.ai_agent import generate_reply

router = APIRouter(
    prefix="/api/ai",
    tags=["ai"],
    dependencies=[Depends(require_feature("ai_enabled"))],
)

PARSE_SYSTEM = """你是记账助手。将用户自然语言转为 JSON，字段:
- amount: 数字金额(正数)
- category: 中文分类(餐饮/交通/购物/娱乐/居住/医疗/教育/礼物/旅行/工资/奖金/理财/兼职/其他支出/其他收入)
- type: income 或 expense
- note: 简短备注
- tx_date: YYYY-MM-DD 格式，默认今天
只返回 JSON，无其他文字。"""

CHAT_SYSTEM = """你是情侣记账 App 的财务 AI 助手。回答简洁、温暖、实用。
可分析收支、给省钱建议、解释消费习惯。用中文，金额保留两位小数。"""  # kept for parse context reference

QUICK_PARSE_SYSTEM = """你是情侣记账 App 的一句话记账解析器。
把用户输入解析成单笔交易草稿，只返回 JSON：
{
  "draft": {"amount": 28.5, "category": "餐饮", "type": "expense", "note": "午餐", "tx_date": "YYYY-MM-DD"},
  "confidence": "high|medium|low",
  "summary": "一句简短确认文案",
  "reason": "为什么这样解析",
  "needs_review": true,
  "alternatives": []
}
分类只能优先使用：餐饮、交通、购物、娱乐、居住、医疗、教育、礼物、旅行、工资、奖金、理财、兼职、其他支出、其他收入。
如果用户写了多笔账、AA、转账、预算或攒钱计划，请只给最可能的一笔交易草稿，并把 needs_review 设为 true。"""

CATEGORY_KEYWORDS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("工资", ("工资", "薪水", "薪资", "发薪")),
    ("奖金", ("奖金", "年终奖", "绩效")),
    ("兼职", ("兼职", "外快", "副业")),
    ("理财", ("利息", "理财", "分红", "基金", "股票", "收益")),
    ("餐饮", ("早餐", "早饭", "午餐", "中饭", "晚餐", "宵夜", "夜宵", "饭", "餐", "吃", "外卖", "咖啡", "奶茶", "饮料", "水果", "零食", "买菜")),
    ("交通", ("打车", "滴滴", "出租", "地铁", "公交", "高铁", "火车", "机票", "油费", "加油", "停车", "高速")),
    ("购物", ("淘宝", "京东", "拼多多", "购物", "买衣", "衣服", "鞋", "超市", "日用品", "数码")),
    ("娱乐", ("电影", "游戏", "演唱会", "娱乐", "会员", "音乐", "ktv", "KTV")),
    ("居住", ("房租", "房贷", "水电", "电费", "水费", "燃气", "物业", "宽带")),
    ("医疗", ("医院", "药", "挂号", "体检", "医疗", "牙")),
    ("教育", ("课程", "学习", "书", "培训", "学费")),
    ("礼物", ("礼物", "送礼", "红包", "请客")),
    ("旅行", ("旅行", "旅游", "酒店", "住宿", "景点")),
)
INCOME_CATEGORIES = {"工资", "奖金", "理财", "兼职", "其他收入"}
INCOME_KEYWORDS = ("工资", "奖金", "收入", "到账", "红包", "退款", "报销", "兼职", "利息", "理财", "收款", "分红")
COMPLEX_MARKERS = ("分别", "各", "每人", "aa", "AA", "转账", "还款", "借", "预算", "攒", "存钱", "计划", "固定", "每月", "下个月", "以后", "其中")
CN_DIGITS = {"零": 0, "〇": 0, "一": 1, "二": 2, "两": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9}
CN_UNITS = {"十": 10, "百": 100, "千": 1000}


def _fallback_parse(text: str) -> dict[str, Any]:
    today = local_today()
    amount_match = re.search(r"(\d+(?:\.\d+)?)", text)
    amount = float(amount_match.group(1)) if amount_match else 0.0
    income_keywords = ("工资", "奖金", "收入", "到账", "红包", "退款")
    tx_type = "income" if any(k in text for k in income_keywords) else "expense"
    category = "餐饮" if any(k in text for k in ("饭", "餐", "吃", "咖啡", "奶茶")) else "其他支出"
    if tx_type == "income":
        category = "其他收入"
    return {
        "amount": amount,
        "category": category,
        "type": tx_type,
        "note": text[:50],
        "tx_date": today,
    }


def _cn_number_to_float(raw: str) -> float | None:
    raw = raw.strip()
    if not raw:
        return None
    if "点" in raw:
        int_part, decimal_part = raw.split("点", 1)
    else:
        int_part, decimal_part = raw, ""

    total = 0
    section = 0
    number = 0
    for char in int_part:
        if char in CN_DIGITS:
            number = CN_DIGITS[char]
        elif char in CN_UNITS:
            unit = CN_UNITS[char]
            section += (number or 1) * unit
            number = 0
        elif char == "万":
            total = (total + section + number) * 10000
            section = 0
            number = 0
        else:
            return None
    value = total + section + number
    if decimal_part:
        decimals = []
        for char in decimal_part:
            if char not in CN_DIGITS:
                return None
            decimals.append(str(CN_DIGITS[char]))
        return float(f"{value}.{''.join(decimals)}")
    return float(value)


def _strip_date_text(text: str) -> str:
    text = re.sub(r"\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日号]?", " ", text)
    text = re.sub(r"\d{1,2}月\d{1,2}[日号]?", " ", text)
    return re.sub(r"(今天|昨天|前天|明天)", " ", text)


def _amount_candidates(text: str) -> list[float]:
    scan = _strip_date_text(text)
    values: list[float] = []
    for match in re.finditer(r"(?<!\d)([-+]?\d+(?:\.\d+)?)(?!\d)", scan):
        try:
            values.append(float(match.group(1)))
        except ValueError:
            continue
    for match in re.finditer(r"([零〇一二两三四五六七八九十百千万点]+)\s*(?:元|块钱|块)", scan):
        amount = _cn_number_to_float(match.group(1))
        if amount is not None:
            values.append(amount)
    return values


def _resolve_tx_date(text: str) -> str:
    today = datetime.strptime(local_today(), "%Y-%m-%d")
    if "前天" in text:
        return (today - timedelta(days=2)).date().isoformat()
    if "昨天" in text:
        return (today - timedelta(days=1)).date().isoformat()
    if "明天" in text:
        return (today + timedelta(days=1)).date().isoformat()

    full = re.search(r"(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})", text)
    if full:
        try:
            return datetime(int(full.group(1)), int(full.group(2)), int(full.group(3))).date().isoformat()
        except ValueError:
            return today.date().isoformat()

    md = re.search(r"(\d{1,2})月(\d{1,2})[日号]?", text)
    if md:
        try:
            return datetime(today.year, int(md.group(1)), int(md.group(2))).date().isoformat()
        except ValueError:
            return today.date().isoformat()
    return today.date().isoformat()


def _guess_type(text: str, values: list[float]) -> str:
    if any(value < 0 for value in values):
        return "expense"
    return "income" if any(keyword in text for keyword in INCOME_KEYWORDS) else "expense"


def _guess_category(text: str, tx_type: str) -> str:
    for category, keywords in CATEGORY_KEYWORDS:
        if any(keyword in text for keyword in keywords):
            if tx_type == "income" and category not in INCOME_CATEGORIES:
                return "其他收入"
            return category
    return "其他收入" if tx_type == "income" else "其他支出"


def _clean_note(text: str) -> str:
    note = _strip_date_text(text)
    note = re.sub(r"[￥¥]?\s*[-+]?\d+(?:\.\d+)?\s*(?:元|块钱|块|rmb|RMB)?", " ", note)
    note = re.sub(r"[零〇一二两三四五六七八九十百千万点]+\s*(?:元|块钱|块)", " ", note)
    note = re.sub(r"\s+", " ", note).strip(" ，,。.;；、")
    return (note or text.strip())[:60]


def _is_multi_amount(values: list[float]) -> bool:
    if len(values) <= 1:
        return False
    absolutes = sorted(abs(v) for v in values)
    return not (absolutes[-1] >= 10 and all(v <= 4 for v in absolutes[:-1]))


def _quick_local_parse(text: str, scope: str) -> dict[str, Any]:
    raw = text.strip()
    values = _amount_candidates(raw)
    chosen = max(values, key=lambda value: abs(value)) if values else 0.0
    amount = round(abs(float(chosen)), 2)
    tx_type = _guess_type(raw, values)
    category = _guess_category(raw, tx_type)
    default_category = category in {"其他支出", "其他收入"}
    multi_amount = _is_multi_amount(values)
    marker_hit = any(marker in raw for marker in COMPLEX_MARKERS)
    needs_llm = (not amount) or multi_amount or marker_hit or len(raw) > 80
    if not amount:
        confidence = "low"
    elif needs_llm or default_category:
        confidence = "medium"
    else:
        confidence = "high"
    draft = {
        "scope": scope,
        "amount": amount,
        "category": category,
        "type": tx_type,
        "note": _clean_note(raw),
        "tx_date": _resolve_tx_date(raw),
    }
    summary = f"{'收入' if tx_type == 'income' else '支出'} {amount:.2f} 元 · {category}" if amount else "还没识别到金额"
    return {
        "mode": "local",
        "complex": bool(needs_llm),
        "confidence": confidence,
        "needs_review": bool(needs_llm or not amount),
        "summary": summary,
        "reason": "本地规则已识别金额、日期、收支方向和分类。",
        "draft": draft,
        "alternatives": [],
        "_should_use_llm": bool(needs_llm),
    }


def _normalize_quick_response(parsed: dict[str, Any], local: dict[str, Any], scope: str) -> dict[str, Any]:
    draft = parsed.get("draft") if isinstance(parsed.get("draft"), dict) else parsed
    local_draft = local["draft"]
    try:
        amount = round(abs(float(draft.get("amount") or local_draft["amount"] or 0)), 2)
    except (TypeError, ValueError):
        amount = local_draft["amount"]
    tx_type = draft.get("type") if draft.get("type") in {"income", "expense"} else local_draft["type"]
    category = str(draft.get("category") or local_draft["category"]).strip()[:30]
    if not category:
        category = "其他收入" if tx_type == "income" else "其他支出"
    tx_date = str(draft.get("tx_date") or local_draft["tx_date"])[:10]
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", tx_date):
        tx_date = local_draft["tx_date"]
    response = {
        "mode": "llm",
        "complex": True,
        "confidence": parsed.get("confidence") if parsed.get("confidence") in {"high", "medium", "low"} else "medium",
        "needs_review": bool(parsed.get("needs_review", True)),
        "summary": str(parsed.get("summary") or f"{'收入' if tx_type == 'income' else '支出'} {amount:.2f} 元 · {category}")[:80],
        "reason": str(parsed.get("reason") or "复杂内容已由 AI 复核，生成单笔记账草稿。")[:120],
        "draft": {
            "scope": scope,
            "amount": amount,
            "category": category,
            "type": tx_type,
            "note": str(draft.get("note") or local_draft["note"])[:60],
            "tx_date": tx_date,
        },
        "alternatives": parsed.get("alternatives") if isinstance(parsed.get("alternatives"), list) else [],
    }
    return response


def _public_quick_result(result: dict[str, Any]) -> dict[str, Any]:
    result.pop("_should_use_llm", None)
    return result


async def _resolve_quick_transaction(text: str, scope: str, ai_enabled: bool) -> dict[str, Any]:
    local = _quick_local_parse(text, scope)
    if not ai_enabled:
        local["mode"] = "manual"
        local["reason"] = "AI 开关已关闭，使用本地规则生成快捷记账草稿。"
        return _public_quick_result(local)

    if not local.get("_should_use_llm"):
        return _public_quick_result(local)

    if not settings.openai_api_key:
        local["needs_review"] = True
        local["reason"] = "内容较复杂，当前未配置 LLM，已先用本地规则生成可编辑草稿。"
        return _public_quick_result(local)

    try:
        content = await _openai_chat(
            [
                {"role": "system", "content": QUICK_PARSE_SYSTEM + f"\n今天日期：{local_today()}"},
                {"role": "user", "content": text},
            ],
            json_mode=True,
        )
        parsed = json.loads(content)
        return _normalize_quick_response(parsed, local, scope)
    except Exception:
        local["needs_review"] = True
        local["reason"] = "AI 复核暂时不可用，已保留本地规则草稿，确认前可以手动修改。"
        return _public_quick_result(local)


def _batch_lines(body: AiQuickTransactionBatchRequest) -> list[str]:
    raw_lines = body.lines or re.split(r"[\n\r;；]+", body.text or "")
    lines = [line.strip(" \t-•、，,。") for line in raw_lines if line and line.strip(" \t-•、，,。")]
    return lines


async def _openai_chat(messages: list[dict[str, str]], json_mode: bool = False) -> str:
    if not settings.openai_api_key:
        raise HTTPException(status_code=503, detail="OpenAI API key not configured")

    payload: dict[str, Any] = {
        "model": settings.openai_model,
        "messages": messages,
        "temperature": 0.3,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    url = f"{settings.openai_base_url.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.openai_api_key}",
        "Content-Type": "application/json",
    }

    # Retry transient failures (timeouts / 5xx) once before giving up.
    last_error = "AI 服务暂时不可用，请稍后再试"
    async with httpx.AsyncClient(timeout=30.0) as client:
        for attempt in range(2):
            try:
                resp = await client.post(url, headers=headers, json=payload)
            except httpx.TimeoutException:
                last_error = "AI 响应超时，请稍后再试"
                continue
            except httpx.HTTPError:
                last_error = "AI 服务连接失败，请稍后再试"
                continue
            if resp.status_code == 200:
                return resp.json()["choices"][0]["message"]["content"]
            if resp.status_code >= 500 and attempt == 0:
                last_error = "AI 服务繁忙，请稍后再试"
                continue
            # Do not leak upstream error text to clients.
            raise HTTPException(status_code=502, detail="AI 服务返回异常，请稍后再试")

    raise HTTPException(status_code=504, detail=last_error)


@router.post("/parse")
async def ai_parse(body: AiParseRequest, current_user: dict = Depends(get_current_user)) -> dict[str, Any]:
    today = local_today()
    if not settings.openai_api_key:
        result = _fallback_parse(body.text)
        result["scope"] = body.scope
        return result

    try:
        content = await _openai_chat(
            [
                {"role": "system", "content": PARSE_SYSTEM + f" 今天日期: {today}"},
                {"role": "user", "content": body.text},
            ],
            json_mode=True,
        )
        parsed = json.loads(content)
        parsed.setdefault("tx_date", today)
        parsed.setdefault("note", body.text[:50])
        parsed["scope"] = body.scope
        return parsed
    except HTTPException:
        raise
    except Exception:
        result = _fallback_parse(body.text)
        result["scope"] = body.scope
        return result


@router.post("/quick-transaction")
async def ai_quick_transaction(body: AiQuickTransactionRequest, current_user: dict = Depends(get_current_user)) -> dict[str, Any]:
    return await _resolve_quick_transaction(body.text, body.scope, body.ai_enabled)


@router.post("/quick-transactions")
async def ai_quick_transactions(body: AiQuickTransactionBatchRequest, current_user: dict = Depends(get_current_user)) -> dict[str, Any]:
    lines = _batch_lines(body)
    if not lines:
        raise HTTPException(status_code=400, detail="请输入至少一行账单")
    if len(lines) > 20:
        raise HTTPException(status_code=400, detail="一次最多解析 20 行")

    items = []
    income = 0.0
    expense = 0.0
    needs_review = 0
    for index, line in enumerate(lines):
        result = await _resolve_quick_transaction(line[:500], body.scope, body.ai_enabled)
        result["index"] = index
        result["source"] = line
        draft = result.get("draft") or {}
        amount = float(draft.get("amount") or 0)
        if draft.get("type") == "income":
            income += amount
        else:
            expense += amount
        if result.get("needs_review") or not amount:
            needs_review += 1
        items.append(result)

    return {
        "scope": body.scope,
        "count": len(items),
        "ready": len(items) - needs_review,
        "needs_review": needs_review,
        "income": round(income, 2),
        "expense": round(expense, 2),
        "items": items,
    }


@router.post("/chat")
async def ai_chat(body: AiChatRequest, current_user: dict = Depends(get_current_user)) -> dict[str, Any]:
    result = await generate_reply(current_user, body.message, body.scope, persona="factual")
    return {
        "reply": result["reply"],
        "citation": result.get("citation"),
        "data": result.get("data"),
    }
