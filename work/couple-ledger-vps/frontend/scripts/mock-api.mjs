import http from "node:http";

const port = Number(process.env.MOCK_API_PORT || 18080);

const user = {
  id: "u1",
  nickname: "测试用户",
  couple_id: null,
  is_admin: false
};

const accounts = [
  {
    id: "a1",
    name: "日常银行卡",
    kind: "debit_card",
    balance: 2688.5,
    opening_balance: 1000,
    currency: "CNY",
    scope: "personal",
    is_archived: false,
    created_at: "2026-07-01T08:00:00Z"
  },
  {
    id: "a2",
    name: "微信零钱",
    kind: "wechat",
    balance: 320.12,
    opening_balance: 0,
    currency: "CNY",
    scope: "personal",
    is_archived: false,
    created_at: "2026-07-02T08:00:00Z"
  },
  {
    id: "a3",
    name: "旧现金账户",
    kind: "cash",
    balance: -12,
    opening_balance: 0,
    currency: "CNY",
    scope: "personal",
    is_archived: true,
    created_at: "2026-06-01T08:00:00Z"
  }
];

let transactions = [
  {
    id: "t1",
    scope: "personal",
    amount: 88.5,
    category: "餐饮",
    type: "expense",
    note: "Lunch",
    tx_date: "2026-07-04",
    account_id: "a1",
    tx_kind: "normal",
    split_type: "none",
    created_at: "2026-07-04T08:00:00Z"
  },
  {
    id: "t2",
    scope: "personal",
    amount: 88.5,
    category: "外食",
    type: "expense",
    note: "Lunch",
    tx_date: "2026-07-04",
    account_id: "a1",
    tx_kind: "normal",
    split_type: "none",
    created_at: "2026-07-04T08:10:00Z"
  },
  {
    id: "t3",
    scope: "personal",
    amount: 36,
    category: "交通",
    type: "expense",
    note: "Taxi",
    tx_date: "2026-07-05",
    account_id: "a2",
    tx_kind: "normal",
    split_type: "none",
    created_at: "2026-07-05T09:00:00Z"
  }
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function quickDraft(text) {
  const raw = String(text || "").trim();
  const amountMatch = raw.match(/(\d+(?:\.\d+)?)/);
  const amount = amountMatch ? Number(amountMatch[1]) : 0;
  const isIncome = /工资|收入|到账|奖金|报销/.test(raw);
  let category = isIncome ? "工资" : "其他";
  if (/餐|饭|午|晚|早|奶茶|咖啡/.test(raw)) category = "餐饮";
  if (/车|地铁|公交|交通|打车/.test(raw)) category = "交通";
  if (/房租|水电|物业/.test(raw)) category = "居住";
  return {
    mode: "mock",
    complex: false,
    reason: "mock",
    needs_review: !amount,
    draft: {
      amount,
      category,
      type: isIncome ? "income" : "expense",
      note: raw,
      tx_date: today()
    }
  };
}

function json(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(body));
}

function duplicateGroups(scope, month) {
  const map = new Map();
  for (const tx of transactions) {
    if (tx.scope !== scope) continue;
    if (month && !tx.tx_date.startsWith(month)) continue;
    const key = `${tx.tx_date}|${tx.type}|${tx.amount.toFixed(2)}|${tx.note || ""}`;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(tx);
  }

  const groups = [];
  let totalDuplicates = 0;
  for (const txs of map.values()) {
    if (txs.length < 2) continue;
    txs.sort((a, b) => a.created_at.localeCompare(b.created_at));
    const first = txs[0];
    const duplicateCount = txs.length - 1;
    totalDuplicates += duplicateCount;
    groups.push({
      key: {
        tx_date: first.tx_date,
        type: first.type,
        amount: first.amount,
        note: first.note || ""
      },
      count: txs.length,
      duplicate_count: duplicateCount,
      duplicate_amount: Number((first.amount * duplicateCount).toFixed(2)),
      categories: [...new Set(txs.map((tx) => tx.category))].sort(),
      confidence: first.note ? "high" : "medium",
      reason: first.note ? "日期、类型、金额、备注完全一致" : "日期、类型、金额一致，但备注为空，建议人工确认",
      recommended_keep_id: first.id,
      removable_ids: txs.slice(1).map((tx) => tx.id),
      transactions: txs
    });
  }
  return {
    scope,
    month: month || null,
    total_groups: groups.length,
    total_duplicates: totalDuplicates,
    groups
  };
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);
  const chunks = [];

  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    const bodyText = Buffer.concat(chunks).toString("utf8");
    let body = {};
    if (bodyText) {
      try {
        body = JSON.parse(bodyText);
      } catch {
        body = {};
      }
    }

    if (url.pathname === "/api/health") {
      json(res, 200, { status: "ok" });
      return;
    }

    if (url.pathname === "/api/auth/me") {
      json(res, 200, user);
      return;
    }

    if (url.pathname === "/api/accounts") {
      const includeArchived = url.searchParams.get("include_archived") === "true";
      json(res, 200, includeArchived ? accounts : accounts.filter((account) => !account.is_archived));
      return;
    }

    if (url.pathname === "/api/accounts/recompute" && req.method === "POST") {
      json(res, 200, accounts);
      return;
    }

    if (url.pathname === "/api/ai/quick-transaction" && req.method === "POST") {
      json(res, 200, quickDraft(body.text));
      return;
    }

    if (url.pathname === "/api/ai/quick-transactions" && req.method === "POST") {
      const lines = String(body.text || "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
      const items = lines.map((line, index) => ({ ...quickDraft(line), source: line, index }));
      const income = items.reduce((sum, item) => sum + (item.draft.type === "income" ? item.draft.amount : 0), 0);
      const expense = items.reduce((sum, item) => sum + (item.draft.type === "expense" ? item.draft.amount : 0), 0);
      const needsReview = items.filter((item) => item.needs_review).length;
      json(res, 200, {
        scope: body.scope || "personal",
        count: items.length,
        ready: items.length - needsReview,
        needs_review: needsReview,
        income,
        expense,
        items
      });
      return;
    }

    if (url.pathname === "/api/transactions" && req.method === "POST") {
      const tx = {
        id: `t${Date.now()}`,
        scope: body.scope || "personal",
        amount: Number(body.amount || 0),
        category: body.category || "其他",
        type: body.type === "income" ? "income" : "expense",
        note: body.note || "",
        tx_date: body.tx_date || today(),
        account_id: body.account_id || null,
        tx_kind: "normal",
        split_type: "none",
        created_at: new Date().toISOString()
      };
      transactions.push(tx);
      json(res, 201, tx);
      return;
    }

    if (url.pathname === "/api/transactions/duplicates") {
      json(res, 200, duplicateGroups(url.searchParams.get("scope") || "personal", url.searchParams.get("month") || ""));
      return;
    }

    if (url.pathname.startsWith("/api/transactions/") && req.method === "DELETE") {
      const txId = url.pathname.split("/").pop();
      transactions = transactions.filter((tx) => tx.id !== txId);
      res.writeHead(204);
      res.end();
      return;
    }

    json(res, 404, { detail: "Mock endpoint not found" });
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Mock API listening on http://127.0.0.1:${port}`);
});
