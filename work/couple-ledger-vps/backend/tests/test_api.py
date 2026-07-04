"""Regression tests for the optimized backend behaviors.

Covers: account balances & opening balance, transfers, balance recompute (drift
repair), transaction pagination, category rename propagation & delete guard,
recurring-bill atomic confirm, budget progress capping, and stats SQL aggregation.
"""


def _make_account(client, headers, name="现金", balance=100, scope="personal"):
    r = client.post("/api/accounts", json={"name": name, "kind": "cash", "balance": balance, "scope": scope}, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


def _add_tx(client, headers, account_id, amount, type_, category, date="2026-06-15", note=""):
    r = client.post(
        "/api/transactions",
        json={
            "scope": "personal",
            "amount": amount,
            "category": category,
            "type": type_,
            "tx_date": date,
            "account_id": account_id,
            "note": note,
        },
        headers=headers,
    )
    assert r.status_code == 201, r.text
    return r.json()


def test_account_opening_balance_and_delta(client, auth):
    headers, _ = auth
    acc = _make_account(client, headers, balance=100)
    assert acc["opening_balance"] == 100

    _add_tx(client, headers, acc["id"], 30, "expense", "餐饮")
    bal = client.get("/api/accounts?scope=personal", headers=headers).json()[0]["balance"]
    assert bal == 70

    _add_tx(client, headers, acc["id"], 50, "income", "工资")
    bal = client.get("/api/accounts?scope=personal", headers=headers).json()[0]["balance"]
    assert bal == 120


def test_manual_balance_edit_then_recompute(client, auth):
    headers, _ = auth
    acc = _make_account(client, headers, balance=200)
    _add_tx(client, headers, acc["id"], 40, "expense", "餐饮")  # -> 160

    # Manual edit is authoritative; recompute must keep it (opening re-derived).
    client.put(f"/api/accounts/{acc['id']}", json={"balance": 500}, headers=headers)
    rec = client.post("/api/accounts/recompute?scope=personal", headers=headers)
    assert rec.status_code == 200
    assert rec.json()[0]["balance"] == 500


def test_transfer_settles_both_accounts(client, auth):
    headers, _ = auth
    a = _make_account(client, headers, name="A", balance=300)
    b = _make_account(client, headers, name="B", balance=0)
    r = client.post(
        "/api/accounts/transfer",
        json={"scope": "personal", "from_account_id": a["id"], "to_account_id": b["id"], "amount": 120, "tx_date": "2026-06-16"},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    accounts = {x["name"]: x["balance"] for x in client.get("/api/accounts?scope=personal", headers=headers).json()}
    assert accounts["A"] == 180 and accounts["B"] == 120


def test_pagination(client, auth):
    headers, _ = auth
    acc = _make_account(client, headers)
    for i in range(5):
        _add_tx(client, headers, acc["id"], i + 1, "expense", "餐饮", date=f"2026-06-{10+i:02d}")
    page1 = client.get("/api/transactions?scope=personal&limit=2&offset=0", headers=headers).json()
    page2 = client.get("/api/transactions?scope=personal&limit=2&offset=2", headers=headers).json()
    assert len(page1) == 2 and len(page2) == 2
    assert {t["id"] for t in page1}.isdisjoint({t["id"] for t in page2})


def test_category_rename_propagates_and_delete_guard(client, auth):
    headers, _ = auth
    acc = _make_account(client, headers)
    cat = client.post("/api/transactions/categories", json={"name": "宵夜", "icon": "utensils", "type": "expense"}, headers=headers).json()
    _add_tx(client, headers, acc["id"], 25, "expense", "宵夜")

    # rename -> history updated
    r = client.put(f"/api/transactions/categories/{cat['id']}", json={"name": "夜宵"}, headers=headers)
    assert r.status_code == 200
    txs = client.get("/api/transactions?scope=personal", headers=headers).json()
    assert any(t["category"] == "夜宵" for t in txs)
    assert not any(t["category"] == "宵夜" for t in txs)

    # delete while referenced -> blocked
    d = client.delete(f"/api/transactions/categories/{cat['id']}", headers=headers)
    assert d.status_code == 400


def test_recurring_confirm_is_atomic(client, auth):
    headers, _ = auth
    acc = _make_account(client, headers, balance=1000)
    bill = client.post(
        "/api/transactions/recurring",
        json={"scope": "personal", "title": "房租", "amount": 200, "category": "居住", "type": "expense",
              "frequency": "monthly", "next_due_date": "2026-06-01", "account_id": acc["id"]},
        headers=headers,
    )
    assert bill.status_code == 201, bill.text
    bill_id = bill.json()["id"]
    r = client.post(f"/api/transactions/recurring/{bill_id}/confirm", headers=headers)
    assert r.status_code == 200, r.text
    # balance reduced by the bill amount, and a transaction was created
    bal = client.get("/api/accounts?scope=personal", headers=headers).json()[0]["balance"]
    assert bal == 800
    assert r.json()["next_due_date"] != "2026-06-01"


def test_budget_progress_capped(client, auth):
    headers, _ = auth
    acc = _make_account(client, headers, balance=1000)
    client.put("/api/budgets/category", json={"scope": "personal", "month": "2026-06", "category": "餐饮", "amount": 100}, headers=headers)
    _add_tx(client, headers, acc["id"], 150, "expense", "餐饮", date="2026-06-20")  # overspent 150%
    data = client.get("/api/budgets?scope=personal&month=2026-06", headers=headers).json()
    cat = next(c for c in data["categories"] if c["category"] == "餐饮")
    assert cat["overspent"] is True
    assert cat["progress"] > 1 and cat["progress_capped"] == 1.0


def test_stats_summary_aggregation(client, auth):
    headers, _ = auth
    acc = _make_account(client, headers)
    _add_tx(client, headers, acc["id"], 100, "income", "工资", date="2026-06-05")
    _add_tx(client, headers, acc["id"], 40, "expense", "餐饮", date="2026-06-06")
    _add_tx(client, headers, acc["id"], 60, "expense", "交通", date="2026-06-07")
    s = client.get("/api/stats/summary?scope=personal&month=2026-06", headers=headers).json()
    assert s["income"] == 100 and s["expense"] == 100 and s["balance"] == 0
    assert s["transaction_count"] == 3
    cats = {c["category"]: c["amount"] for c in s["category_breakdown"]}
    assert cats["餐饮"] == 40 and cats["交通"] == 60


def test_ai_agent_stats_and_date_resolve(client, auth):
    from app.services.ai_agent import is_data_query, resolve_date_range, run_query_stats

    headers, user = auth
    acc = _make_account(client, headers)
    _add_tx(client, headers, acc["id"], 88, "expense", "餐饮", date="2026-06-10")

    assert is_data_query("本月花了多少") is True
    assert is_data_query("你好呀") is False
    dr = resolve_date_range("上月花了多少")
    assert "start_date" in dr and "month" in dr

    stats = run_query_stats(user, "personal", {"month": "2026-06"})
    assert stats["expense"] == 88


def test_ai_chat_query_fallback(client, auth):
    headers, _ = auth
    acc = _make_account(client, headers)
    _add_tx(client, headers, acc["id"], 50, "expense", "餐饮", date="2026-07-03")
    r = client.post("/api/ai-extra/chat-query", json={"message": "本月支出多少", "scope": "personal"}, headers=headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "reply" in body
    assert "50" in body["reply"] or "50.00" in body["reply"]


def test_ai_quick_transaction_local_and_manual_modes(client, auth):
    from datetime import datetime, timedelta

    from app.db import local_today

    headers, _ = auth
    expected_yesterday = (datetime.strptime(local_today(), "%Y-%m-%d") - timedelta(days=1)).date().isoformat()

    manual = client.post(
        "/api/ai/quick-transaction",
        json={"text": "昨天午餐28.5", "scope": "personal", "ai_enabled": False},
        headers=headers,
    )
    assert manual.status_code == 200, manual.text
    body = manual.json()
    assert body["mode"] == "manual"
    assert body["draft"]["amount"] == 28.5
    assert body["draft"]["type"] == "expense"
    assert body["draft"]["category"] == "餐饮"
    assert body["draft"]["tx_date"] == expected_yesterday

    local = client.post(
        "/api/ai/quick-transaction",
        json={"text": "本月工资8000到账", "scope": "personal", "ai_enabled": True},
        headers=headers,
    )
    assert local.status_code == 200, local.text
    local_body = local.json()
    assert local_body["mode"] == "local"
    assert local_body["draft"]["type"] == "income"
    assert local_body["draft"]["category"] == "工资"
    assert local_body["draft"]["amount"] == 8000

    complex_body = client.post(
        "/api/ai/quick-transaction",
        json={"text": "午餐28，奶茶15，先记一笔", "scope": "personal", "ai_enabled": True},
        headers=headers,
    ).json()
    assert complex_body["complex"] is True
    assert complex_body["needs_review"] is True
    assert complex_body["draft"]["amount"] in (28, 15)


def test_ai_quick_transactions_batch_summary(client, auth):
    headers, _ = auth

    batch = client.post(
        "/api/ai/quick-transactions",
        json={"text": "午餐28\n打车36\n工资8000到账", "scope": "personal", "ai_enabled": False},
        headers=headers,
    )
    assert batch.status_code == 200, batch.text
    body = batch.json()
    assert body["count"] == 3
    assert body["ready"] == 3
    assert body["needs_review"] == 0
    assert body["expense"] == 64
    assert body["income"] == 8000
    assert [item["source"] for item in body["items"]] == ["午餐28", "打车36", "工资8000到账"]
    assert body["items"][0]["mode"] == "manual"
    assert body["items"][0]["draft"]["category"] == "餐饮"
    assert body["items"][1]["draft"]["category"] == "交通"
    assert body["items"][2]["draft"]["type"] == "income"

    empty = client.post(
        "/api/ai/quick-transactions",
        json={"text": "\n  \n", "scope": "personal", "ai_enabled": False},
        headers=headers,
    )
    assert empty.status_code == 400


def test_ai_money_action_plan_and_apply(client, auth):
    headers, _ = auth
    acc = _make_account(client, headers, balance=10000)
    _add_tx(client, headers, acc["id"], 8000, "income", "工资", date="2026-07-01")
    _add_tx(client, headers, acc["id"], 700, "expense", "餐饮", date="2026-07-02")
    _add_tx(client, headers, acc["id"], 300, "expense", "交通", date="2026-07-03")
    bill = client.post(
        "/api/transactions/recurring",
        json={
            "scope": "personal",
            "title": "房租",
            "amount": 2000,
            "category": "居住",
            "type": "expense",
            "frequency": "monthly",
            "next_due_date": "2026-07-20",
            "account_id": acc["id"],
        },
        headers=headers,
    )
    assert bill.status_code == 201, bill.text

    payload = {"message": "帮我把本月预算设为5000，每月攒2000，并给我每天吃什么", "scope": "personal", "month": "2026-07"}
    planned = client.post("/api/ai-extra/money-action", json=payload, headers=headers)
    assert planned.status_code == 200, planned.text
    data = planned.json()
    assert data["assistant_name"] == "钱小参"
    assert data["drafts"]["budget_total"]["amount"] == 5000
    assert data["drafts"]["savings_plan"]["monthly_amount"] == 2000
    assert data["context"]["recurring_expense"] >= 2000
    assert len(data["meal_plan"]) == 7
    assert data["applied"]["budget_total"] is False

    applied = client.post("/api/ai-extra/money-action", json={**payload, "apply": True}, headers=headers)
    assert applied.status_code == 200, applied.text
    applied_body = applied.json()
    assert applied_body["applied"]["budget_total"] is True
    assert applied_body["applied"]["savings_plan"] is True
    assert applied_body["applied"]["category_budgets"] >= 1

    budget = client.get("/api/budgets?scope=personal&month=2026-07", headers=headers).json()
    assert budget["total"]["amount"] == 5000
    savings = client.get("/api/savings-plan?scope=personal", headers=headers)
    assert savings.status_code == 200, savings.text
    assert savings.json()["monthly_amount"] == 2000


def test_excel_bill_import_preview_commit_and_duplicate_skip(client, auth):
    from datetime import date
    from io import BytesIO

    from openpyxl import Workbook

    headers, _ = auth

    def excel_bytes():
        wb = Workbook()
        ws = wb.active
        ws.title = "Bills"
        ws.append(["日期", "分类", "类型", "金额", "备注"])
        ws.append([date(2026, 7, 4), "Food", "expense", 88.5, "Lunch"])
        ws.append(["2026/07/05", "Salary", "income", 3000, "Part-time"])
        buf = BytesIO()
        wb.save(buf)
        return buf.getvalue()

    files = {
        "file": (
            "bills.xlsx",
            excel_bytes(),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    }
    preview = client.post("/api/data/import/excel?scope=personal&dry_run=true", files=files, headers=headers)
    assert preview.status_code == 200, preview.text
    preview_body = preview.json()
    assert preview_body["format"] == "excel"
    assert preview_body["count"] == 2
    assert preview_body["imported"] == 0
    assert preview_body["preview"][0]["tx_date"] == "2026-07-04"
    assert preview_body["preview"][0]["type"] == "expense"
    assert preview_body["preview"][1]["type"] == "income"

    files = {
        "file": (
            "bills.xlsx",
            excel_bytes(),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    }
    committed = client.post("/api/data/import/excel?scope=personal", files=files, headers=headers)
    assert committed.status_code == 200, committed.text
    body = committed.json()
    assert body["imported"] == 2
    assert body["skipped"] == 0

    txs = client.get("/api/transactions?scope=personal&limit=20", headers=headers).json()
    imported = {(tx["tx_date"], tx["category"], tx["type"], float(tx["amount"]), tx["note"]) for tx in txs}
    assert ("2026-07-04", "Food", "expense", 88.5, "Lunch") in imported
    assert ("2026-07-05", "Salary", "income", 3000.0, "Part-time") in imported

    accounts = client.get("/api/accounts?scope=personal", headers=headers).json()
    import_account = next(acc for acc in accounts if acc["name"] == "账单导入")
    assert import_account["balance"] == 2911.5

    files = {
        "file": (
            "bills.xlsx",
            excel_bytes(),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    }
    duplicate = client.post("/api/data/import/excel?scope=personal", files=files, headers=headers)
    assert duplicate.status_code == 200, duplicate.text
    assert duplicate.json()["imported"] == 0
    assert duplicate.json()["skipped"] == 2


def test_duplicate_candidates_and_cleanup_path(client, auth):
    headers, _ = auth
    acc = _make_account(client, headers, balance=500)
    first = _add_tx(client, headers, acc["id"], 88.5, "expense", "餐饮", date="2026-07-04", note="Lunch")
    second = _add_tx(client, headers, acc["id"], 88.5, "expense", "外食", date="2026-07-04", note="Lunch")
    _add_tx(client, headers, acc["id"], 88.5, "expense", "餐饮", date="2026-07-05", note="Lunch")

    found = client.get("/api/transactions/duplicates?scope=personal&month=2026-07", headers=headers)
    assert found.status_code == 200, found.text
    body = found.json()
    assert body["total_groups"] == 1
    assert body["total_duplicates"] == 1
    group = body["groups"][0]
    assert group["key"] == {"tx_date": "2026-07-04", "type": "expense", "amount": 88.5, "note": "Lunch"}
    assert group["categories"] == ["外食", "餐饮"]
    assert group["recommended_keep_id"] == first["id"]
    assert group["removable_ids"] == [second["id"]]

    deleted = client.delete(f"/api/transactions/{second['id']}", headers=headers)
    assert deleted.status_code == 204
    empty = client.get("/api/transactions/duplicates?scope=personal&month=2026-07", headers=headers)
    assert empty.status_code == 200
    assert empty.json()["total_groups"] == 0
    balance = client.get("/api/accounts?scope=personal", headers=headers).json()[0]["balance"]
    assert balance == 323.0


def test_feedback_submit(client, auth):
    headers, _ = auth
    r = client.post("/api/feedback", data={"category": "bug", "content": "测试反馈"}, headers=headers)
    assert r.status_code == 201, r.text
    mine = client.get("/api/feedback/mine", headers=headers).json()
    assert len(mine) >= 1
    assert mine[0]["content"] == "测试反馈"


def test_announcements_public(client):
    r = client.get("/api/announcements/active")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_couple_leave_preserves_ledger(client, auth):
    import uuid
    headers, _ = auth
    c1 = client.post("/api/couple/create", headers=headers).json()
    email = f"partner_{uuid.uuid4().hex[:8]}@test.com"
    r2 = client.post("/api/auth/register", json={"email": email, "password": "secret123", "nickname": "P"})
    assert r2.status_code in (200, 201), r2.text
    h2 = {"Authorization": f"Bearer {r2.json()['access_token']}"}
    client.post("/api/couple/join", json={"invite_code": c1["invite_code"]}, headers=h2)

    cacc = _make_account(client, headers, name="共同", balance=200, scope="couple")
    client.post(
        "/api/transactions",
        json={"scope": "couple", "amount": 30, "category": "餐饮", "type": "expense", "tx_date": "2026-06-12", "account_id": cacc["id"]},
        headers=headers,
    )

    leave = client.post("/api/couple/leave", headers=headers)
    assert leave.status_code == 200, leave.text
    assert client.get("/api/auth/me", headers=headers).json().get("couple_id") is None

    from app.db import get_db
    with get_db() as conn:
        cnt = conn.execute(
            "SELECT COUNT(*) AS c FROM transactions WHERE scope='couple' AND couple_id=?",
            (c1["id"],),
        ).fetchone()["c"]
    assert cnt >= 1


def test_transfer_rejects_scope_mismatch(client, auth):
    headers, _ = auth
    personal = _make_account(client, headers, name="Cash", balance=100)
    client.post("/api/couple/create", headers=headers)
    couple = _make_account(client, headers, name="Shared", balance=100, scope="couple")
    r = client.post(
        "/api/accounts/transfer",
        json={
            "scope": "personal",
            "from_account_id": personal["id"],
            "to_account_id": couple["id"],
            "amount": 10,
            "tx_date": "2026-06-20",
        },
        headers=headers,
    )
    assert r.status_code == 400, r.text
