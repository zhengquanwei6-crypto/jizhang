import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("../frontend/node_modules/playwright");

const baseUrl = process.env.CL_AUDIT_URL || "http://127.0.0.1:4180";
const outDir = process.env.CL_AUDIT_OUT || path.resolve("work/couple-ledger-vps/.ui-audit");

fs.mkdirSync(outDir, { recursive: true });

const categories = [
  { id: "cat-food", name: "餐饮", type: "expense", icon: "utensils" },
  { id: "cat-car", name: "交通", type: "expense", icon: "car" },
  { id: "cat-shop", name: "购物", type: "expense", icon: "shopping-bag" },
  { id: "cat-home", name: "居住", type: "expense", icon: "home" },
  { id: "cat-fun", name: "娱乐", type: "expense", icon: "gamepad-2" },
  { id: "cat-salary", name: "工资", type: "income", icon: "briefcase" }
];

const accounts = [
  { id: "acc-wechat", name: "微信", type: "电子钱包", balance: 5386.2, initial_balance: 3200 },
  { id: "acc-alipay", name: "支付宝", type: "电子钱包", balance: 3247.8, initial_balance: 2800 },
  { id: "acc-card", name: "储蓄卡（2）", type: "银行卡", balance: 82650, initial_balance: 60000 },
  { id: "acc-credit", name: "信用卡（1）", type: "信用卡", balance: -2450.3, initial_balance: -5000 },
  { id: "acc-cash", name: "现金", type: "现金", balance: 1066, initial_balance: 1000 }
];

const transactions = [
  tx("tx-1", "expense", "餐饮", 28, "午餐", "公司附近简餐", "微信", "2026-07-12T12:30:00"),
  tx("tx-2", "expense", "交通", 36, "打车", "去机场打车费", "支付宝", "2026-07-12T08:15:00"),
  tx("tx-3", "income", "工资", 8000, "7月工资到账", "工资到账", "储蓄卡（2）", "2026-07-10T09:00:00"),
  tx("tx-4", "expense", "购物", 126.5, "超市", "周末生活采购", "微信", "2026-07-09T18:45:00"),
  tx("tx-5", "transfer", "转账", 500, "转给TA-房租分摊", "房租分摊", "微信", "2026-07-08T20:10:00")
];

function tx(id, tx_kind, category, amount, note, description, account_name, created_at) {
  return {
    id,
    tx_kind,
    type: tx_kind,
    category,
    amount,
    note,
    description,
    account_name,
    account_id: "acc-wechat",
    created_at,
    date: created_at.slice(0, 10),
    paid_by: "u1",
    split_type: "equal"
  };
}

function json(route, value, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify(value)
  });
}

function mockApi(route) {
  const request = route.request();
  const url = new URL(request.url());
  const p = url.pathname.replace(/^\/api/, "");

  if (p === "/auth/me") {
    return json(route, {
      id: "u1",
      email: "demo@example.com",
      nickname: "小郑",
      couple_id: "couple-1",
      is_admin: true
    });
  }
  if (p === "/auth/login" || p === "/auth/register" || p === "/auth/refresh") {
    return json(route, {
      access_token: "demo-token",
      refresh_token: "demo-refresh",
      user: { id: "u1", email: "demo@example.com", nickname: "小郑", couple_id: "couple-1", is_admin: true }
    });
  }
  if (p === "/transactions/categories/list") return json(route, categories);
  if (p === "/transactions" || p.startsWith("/transactions?")) {
    return json(route, { items: transactions, total: transactions.length, income: 8000, expense: 1452.5 });
  }
  if (p.startsWith("/transactions/recurring/due")) {
    return json(route, [
      { id: "rec-rent", title: "房租", amount: 3000, next_due_date: "2026-07-05", is_active: true },
      { id: "rec-sub", title: "音乐会员", amount: 18, next_due_date: "2026-07-06", is_active: true }
    ]);
  }
  if (p.startsWith("/transactions/recurring")) return json(route, []);
  if (p.startsWith("/stats/summary")) {
    return json(route, {
      income: 12680,
      expense: 6842.5,
      balance: 5837.5,
      net_worth: 128350.8,
      transaction_count: 28,
      tx_count: 28,
      bookkeeping_streak: 12,
      category_breakdown: [
        { category: "餐饮", amount: 2138.4, pct: 31.3 },
        { category: "购物", amount: 1256.3, pct: 18.4 },
        { category: "交通", amount: 852.6, pct: 12.5 },
        { category: "娱乐", amount: 742.2, pct: 10.8 },
        { category: "居住", amount: 628.9, pct: 9.2 }
      ],
      category_ranking: [
        { category: "餐饮", amount: 2138.4 },
        { category: "购物", amount: 1256.3 },
        { category: "交通", amount: 852.6 }
      ]
    });
  }
  if (p.startsWith("/stats/settlement")) {
    return json(route, {
      hint: "本月情侣分摊整体平衡，小美需补给小郑 ¥128.00。",
      members: [
        { user_id: "u1", nickname: "小郑", net: 128, status: "应收" },
        { user_id: "u2", nickname: "小美", net: -128, status: "应付" }
      ]
    });
  }
  if (p.startsWith("/accounts")) return json(route, accounts);
  if (p.startsWith("/budgets")) {
    return json(route, {
      total: { amount: 18000, spent: 18720.5, remaining: -720.5, overspent: true },
      categories: [
        { category: "餐饮", amount: 4000, spent: 3680, remaining: 320, usage_pct: 92, overspent: false },
        { category: "购物", amount: 3000, spent: 2850, remaining: 150, usage_pct: 95, overspent: false },
        { category: "交通", amount: 2000, spent: 2504, remaining: -504, usage_pct: 125.2, overspent: true },
        { category: "居住", amount: 6000, spent: 5100, remaining: 900, usage_pct: 85, overspent: false }
      ]
    });
  }
  if (p === "/couple") {
    return json(route, {
      id: "couple-1",
      is_paired: true,
      invite_code: "LOVE2026",
      created_at: "2026-03-01T00:00:00",
      me: { id: "u1", nickname: "小郑" },
      partner: { id: "u2", nickname: "小美" }
    });
  }
  if (p.startsWith("/couple-social/members")) {
    return json(route, [
      { id: "u1", user_id: "u1", nickname: "小郑", avatar_url: "" },
      { id: "u2", user_id: "u2", nickname: "小美", avatar_url: "" }
    ]);
  }
  if (p.startsWith("/couple-social/goals")) {
    return json(route, [
      { id: "goal-1", title: "旅行基金", goal_type: "savings", target_value: 10000, current_value: 6240, unit: "元" },
      { id: "goal-2", title: "每周运动打卡", target_value: 3, current_value: 2, unit: "次" }
    ]);
  }
  if (p.startsWith("/couple-social/anniversaries")) {
    return json(route, [
      { id: "ann-1", title: "我们的纪念日", anniversary_date: "2026-07-12", note: "一起庆祝" },
      { id: "ann-2", title: "她的生日", anniversary_date: "2026-08-20", note: "" }
    ]);
  }
  if (p.startsWith("/couple-social/intimacy")) {
    return json(route, { score: { score: 85, level: "甜蜜稳定", breakdown: { chats_7d: 16, transactions_7d: 7, goal_bonus: 6 } }, recent_logs: [] });
  }
  if (p.startsWith("/couple-social/shared-note")) return json(route, { note: "周末去超市采购食材，晚上一起做饭。" });
  if (p.startsWith("/couple-social/wishlist")) {
    return json(route, [
      { id: "wish-1", text: "一起去看极光", done: false, sort_order: 0 },
      { id: "wish-2", text: "养一只小猫", done: true, sort_order: 1 }
    ]);
  }
  if (p.startsWith("/ai-extra/alerts")) return json(route, [{ severity: "warning", message: "交通预算已超出 25.2%" }]);
  if (p.startsWith("/ai-extra/report/monthly")) return json(route, { insight: "本月餐饮占比较高，若每周少 1-2 次外食，预计可节省 ¥400 - ¥600。" });
  if (p.startsWith("/ai-extra/chat-query")) {
    return json(route, { reply: "本月支出 **¥6,842.50**，餐饮是最高分类。建议先把交通和餐饮预算调细一点。" });
  }
  if (p.startsWith("/announcements/active")) return json(route, []);
  if (p.startsWith("/growth/pet")) {
    return json(route, {
      pet: { id: "pet-1", name: "果冻仔", stage: "幼年期", level: 4, exp: 180, exp_needed: 240, energy: 72, mood: 86, status: "超开心" },
      recent_events: [],
      daily_tasks: [],
      achievements: []
    });
  }
  if (p.startsWith("/chat/unread-count")) return json(route, { count: 2 });
  if (p.startsWith("/chat")) return json(route, { items: [] });
  if (p.startsWith("/savings")) return json(route, []);
  if (p.startsWith("/archives")) return json(route, []);
  if (p.startsWith("/feedback")) return json(route, []);
  if (p.startsWith("/admin")) return json(route, { stats: { users: 3, couples: 1, transactions: 28, active_users_7d: 2, open_feedback: 0 } });

  return json(route, {});
}

const pages = [
  ["/login", "login"],
  ["/home", "home"],
  ["/ledger", "ledger"],
  ["/budgets", "budgets"],
  ["/accounts", "accounts"],
  ["/couple", "couple"],
  ["/savings", "savings"],
  ["/jelly", "jelly"]
];

const browser = await chromium.launch({ headless: true });
async function makeContext({ authed }) {
  const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: "zh-CN"
  });

  await context.addInitScript((isAuthed) => {
    if (isAuthed) {
      localStorage.setItem("cl_auth", JSON.stringify({
        accessToken: "demo-token",
        refreshToken: "demo-refresh",
        user: { id: "u1", email: "demo@example.com", nickname: "小郑", couple_id: "couple-1", is_admin: true }
      }));
      localStorage.setItem("cl_onboarded", "1");
      localStorage.setItem("cl_scope", "couple");
    } else {
      localStorage.removeItem("cl_auth");
      localStorage.removeItem("cl_onboarded");
    }
  }, authed);

  await context.route("**/api/**", mockApi);
  return context;
}

const errors = [];
const results = [];

for (const [routePath, name] of pages) {
  const context = await makeContext({ authed: routePath !== "/login" });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) {
      errors.push({ page: name, type: msg.type(), text: msg.text() });
    }
  });
  page.on("pageerror", (error) => errors.push({ page: name, type: "pageerror", text: error.message }));

  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle", timeout: 30000 });
  if (routePath !== "/home") {
    await page.evaluate((targetPath) => {
      history.pushState({}, "", targetPath);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }, routePath);
  }
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });

  const title = await page.title();
  const h1 = await page.locator("h1, .display, .page-title").first().textContent().catch(() => "");
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  const visibleInputs = await page.locator("input:visible, textarea:visible, select:visible").count();
  const visibleButtons = await page.locator("button:visible").count();

  results.push({ path: routePath, name, title, h1: (h1 || "").trim(), horizontalOverflow, visibleInputs, visibleButtons });
  await page.close();
  await context.close();
}

const context = await makeContext({ authed: true });
const page = await context.newPage();
await page.goto(`${baseUrl}/`, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(900);
const quickField = page.locator("[data-cl-r12-input]:visible").first();
await quickField.click();
await page.waitForTimeout(250);
const focusedEditable = await page.evaluate(() => {
  const el = document.activeElement;
  return !!el && el.matches && el.matches("[data-cl-r12-input]");
});
await quickField.fill("午餐28");
const filled = await quickField.inputValue().catch(() => "");
results.push({ path: "/home", name: "quick-ledger-input", focusedEditable, filled });
await page.screenshot({ path: path.join(outDir, "ledger-input.png"), fullPage: true });
await page.close();
await context.close();

await browser.close();

const report = { baseUrl, outDir, results, errors };
fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify(report, null, 2));
