(function () {
  "use strict";

  var ROUND_ATTR = "data-cl-round-004";
  var cache = {};
  var pending = {};
  var timer = null;
  var historyPatched = false;
  var CACHE_TTL_MS = 1500;

  function html(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char];
    });
  }

  function money(value) {
    var number = Number(value || 0);
    return number.toLocaleString("zh-CN", { maximumFractionDigits: 0 });
  }

  function pct(value) {
    var number = Number(value || 0);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.min(100, Math.round(number)));
  }

  function monthKey(date) {
    var d = date || new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  }

  function scopeKey() {
    var active = Array.prototype.slice.call(document.querySelectorAll(".opt.on, button.on")).find(function (button) {
      var text = button.textContent.trim();
      return text === "个人" || text === "情侣";
    });
    return active && active.textContent.indexOf("情侣") !== -1 ? "couple" : "personal";
  }

  function dayLabel(date) {
    var text = String(date || "");
    var parts = text.slice(5, 10).split("-");
    return parts.length === 2 ? Number(parts[0]) + "/" + Number(parts[1]) : text.slice(0, 5);
  }

  function authHeaders() {
    try {
      var auth = JSON.parse(localStorage.getItem("cl_auth") || "{}");
      if (auth.accessToken) return { Authorization: "Bearer " + auth.accessToken };
    } catch (error) {
      return {};
    }
    return {};
  }

  async function api(path) {
    var response = await fetch(path, { headers: authHeaders() });
    if (!response.ok) throw new Error("HTTP " + response.status);
    return response.json();
  }

  function appPage() {
    return document.querySelector(".app-shell .page") || document.querySelector(".app-shell") || document.querySelector("#app") || document.body;
  }

  function insertAfter(anchor, node) {
    if (anchor && anchor.parentNode) {
      if (anchor.nextSibling !== node) anchor.parentNode.insertBefore(node, anchor.nextSibling);
      return;
    }
    var root = appPage();
    var dock = document.querySelector(".cl-quick-dock");
    if (dock && dock.parentNode === root) {
      if (dock.previousSibling !== node) root.insertBefore(node, dock);
    } else if (node.parentNode !== root || node.nextSibling) {
      root.appendChild(node);
    }
  }

  function panel(id, className, anchor) {
    var selector = "[" + ROUND_ATTR + '="' + id + '"]';
    var existing = document.querySelector(selector);
    var node = existing || document.createElement("section");
    if (!existing) {
      node.setAttribute(ROUND_ATTR, id);
      node.className = "cl-viz-panel " + className;
    }
    insertAfter(anchor, node);
    return node;
  }

  function removePanel(id) {
    var node = document.querySelector("[" + ROUND_ATTR + '="' + id + '"]');
    if (node) node.remove();
  }

  function setPanelContent(node, content) {
    if (node.__clVizContent === content) return;
    node.__clVizContent = content;
    node.innerHTML = content;
  }

  function readCache(key) {
    var entry = cache[key];
    if (!entry) return null;
    if (Date.now() - entry.at < CACHE_TTL_MS) return entry.data;
    delete cache[key];
    return null;
  }

  function writeCache(key, data) {
    cache[key] = { at: Date.now(), data: data };
  }

  function clearCache(prefix) {
    Object.keys(cache).forEach(function (key) {
      if (!prefix || key.indexOf(prefix) === 0) delete cache[key];
    });
  }

  function bust(path) {
    return path + (path.indexOf("?") === -1 ? "?" : "&") + "_clv=" + Date.now();
  }

  function normalizeCategories(list, total) {
    return (Array.isArray(list) ? list : []).map(function (item, index) {
      var amount = Number(item.amount || item.spent || item.value || 0);
      return {
        category: item.category || item.name || "未分类",
        amount: amount,
        ratio: total ? pct(amount / total * 100) : pct(item.ratio || item.percent || 0),
        rank: item.rank || index + 1
      };
    }).filter(function (item) { return item.amount > 0; }).sort(function (a, b) { return b.amount - a.amount; });
  }

  function normalizeStats(data) {
    var income = Number(data.income || 0);
    var expense = Number(data.expense || 0);
    var balance = Number(data.balance || income - expense);
    var count = Number(data.transaction_count || data.count || 0);
    var cats = normalizeCategories(data.category_ranking || data.category_breakdown || [], expense);
    var daily = (Array.isArray(data.daily) ? data.daily : data.daily_trend || data.trend || []).map(function (item) {
      return {
        date: item.date || item.day || "",
        expense: Number(item.expense || item.amount || 0),
        income: Number(item.income || 0)
      };
    }).filter(function (item) { return item.expense || item.income; }).slice(-7);
    return {
      income: income,
      expense: expense,
      balance: balance,
      count: count,
      savingsRate: income ? Math.round(balance / income * 100) : null,
      categories: cats,
      daily: daily
    };
  }

  function normalizeBudget(data) {
    var total = data.total || {};
    var amount = Number(total.amount || data.total_budget || data.amount || 0);
    var spent = Number(total.spent || data.total_spent || data.spent || 0);
    var remaining = total.remaining != null ? Number(total.remaining) : amount - spent;
    var progressRaw = total.progress_capped != null ? Number(total.progress_capped) : (amount ? spent / amount : 0);
    var progress = progressRaw <= 1 ? progressRaw * 100 : progressRaw;
    var categories = (Array.isArray(data.categories) ? data.categories : []).map(function (item) {
      var catAmount = Number(item.amount || item.budget || item.limit_amount || item.limit || 0);
      var catSpent = Number(item.spent || 0);
      var catRemaining = item.remaining != null ? Number(item.remaining) : catAmount - catSpent;
      var catProgressRaw = item.progress_capped != null ? Number(item.progress_capped) : (catAmount ? catSpent / catAmount : 0);
      var catProgress = catProgressRaw <= 1 ? catProgressRaw * 100 : catProgressRaw;
      return {
        category: item.category || item.name || "未分类",
        amount: catAmount,
        spent: catSpent,
        remaining: catRemaining,
        progress: pct(catProgress),
        overspent: item.overspent != null ? !!item.overspent : catRemaining < 0
      };
    }).filter(function (item) { return item.amount || item.spent; }).sort(function (a, b) {
      if (a.overspent !== b.overspent) return a.overspent ? -1 : 1;
      return b.progress - a.progress;
    });
    return {
      amount: amount,
      spent: spent,
      remaining: remaining,
      progress: pct(progress),
      overspent: total.overspent != null ? !!total.overspent : remaining < 0,
      categories: categories
    };
  }

  function metric(label, value, tone) {
    return '<div class="cl-viz-metric ' + (tone || "") + '"><span>' + html(label) + "</span><strong>" + html(value) + "</strong></div>";
  }

  function bars(items, total) {
    if (!items.length) return '<div class="cl-viz-empty"><p>分类数据还不够，继续记几笔就能看到排行。</p></div>';
    return '<div class="cl-viz-bars">' + items.slice(0, 5).map(function (item) {
      var width = total ? pct(item.amount / total * 100) : item.ratio;
      return '<div class="cl-viz-bar-line"><div class="cl-viz-label-line"><span class="cl-viz-bar-label">' + html(item.category) + '</span><span class="cl-viz-bar-value expense">¥' + money(item.amount) + '</span></div><div class="cl-viz-track" style="--bar:' + width + '%"><i></i></div></div>';
    }).join("") + "</div>";
  }

  function trend(days) {
    if (!days.length) return '<div class="cl-viz-empty"><p>还没有连续日期数据。</p></div>';
    var max = Math.max.apply(null, days.map(function (item) { return item.expense || item.income || 1; }));
    return '<div class="cl-viz-trend" style="--count:' + days.length + '">' + days.map(function (item) {
      var height = Math.max(8, Math.round((item.expense || item.income || 0) / max * 100));
      return '<div class="cl-viz-day"><span style="--h:' + height + '%"></span><small>' + html(dayLabel(item.date)) + "</small></div>";
    }).join("") + "</div>";
  }

  function renderStats(data) {
    var anchor = document.querySelector('[data-cl-round-006="compass"]') || document.querySelector(".ph") || document.querySelector(".controls");
    var node = panel("stats", "cl-viz-stats", anchor);
    var hasData = data.count || data.income || data.expense || data.categories.length || data.daily.length;
    node.classList.toggle("is-empty", !hasData);
    var subtitle = hasData ? "回答本月钱从哪里来、花到哪里去。" : "还差几笔真实账单，就能生成趋势和分类结构。";
    var copy = [
      "本月收入 ¥" + money(data.income),
      "支出 ¥" + money(data.expense),
      "结余 ¥" + money(data.balance),
      data.savingsRate != null ? "储蓄率 " + data.savingsRate + "%" : ""
    ].filter(Boolean).join(" · ");
    setPanelContent(node, '<div class="cl-viz-head"><div><span class="cl-viz-kicker">本月统计</span><h2>收支快读</h2><p>' + html(subtitle) + '</p></div><div class="cl-viz-actions"><button type="button" class="cl-viz-button" data-cl-viz-copy="' + html(copy) + '">复制摘要</button><a class="cl-viz-link primary" href="/ledger">看明细</a></div></div>' +
      '<div class="cl-viz-empty"><p>先记 3 笔支出和 1 笔收入，统计页会开始显示排行、趋势和储蓄率。</p></div>' +
      '<div class="cl-viz-metrics">' +
        metric("收入", "+¥" + money(data.income), "income") +
        metric("支出", "-¥" + money(data.expense), "expense") +
        metric("结余", "¥" + money(data.balance), data.balance < 0 ? "expense" : "income") +
        metric("储蓄率", data.savingsRate == null ? "待计算" : data.savingsRate + "%", data.savingsRate != null && data.savingsRate < 15 ? "warn" : "") +
      '</div>' +
      '<div class="cl-viz-split"><div class="cl-viz-block"><h3>分类花费排行</h3><p>按金额排序，直接看最大支出。</p>' + bars(data.categories, data.expense) + '</div><div class="cl-viz-block"><h3>近几日支出</h3><p>短趋势比总数更容易判断节奏。</p>' + trend(data.daily) + '</div></div>');
  }

  function budgetRiskText(item) {
    if (item.overspent) return "超支 ¥" + money(Math.abs(item.remaining));
    if (item.progress >= 85) return "快用完 · 剩余 ¥" + money(item.remaining);
    return "剩余 ¥" + money(item.remaining);
  }

  function renderBudget(data) {
    var anchor = document.querySelector(".ph") || document.querySelector(".card.sum");
    var node = panel("budget", "cl-viz-budget", anchor);
    var hasData = data.amount || data.spent || data.categories.length;
    node.classList.toggle("is-empty", !hasData);
    var ringColor = data.overspent ? "var(--cl-viz-bad)" : data.progress >= 85 ? "var(--cl-viz-warn)" : "var(--gold)";
    var daysLeft = Math.max(1, new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate() + 1);
    var daily = data.remaining > 0 ? data.remaining / daysLeft : 0;
    var riskRows = data.categories.length ? data.categories.slice(0, 5).map(function (item) {
      var tone = item.overspent ? " over" : item.progress >= 85 ? " warn" : "";
      return '<div class="cl-viz-bar-line"><div class="cl-viz-label-line"><span class="cl-viz-bar-label">' + html(item.category) + '</span><span class="cl-viz-bar-value ' + (item.overspent ? "expense" : "") + '">' + html(budgetRiskText(item)) + '</span></div><div class="cl-viz-track' + tone + '" style="--bar:' + item.progress + '%"><i></i></div></div>';
    }).join("") : '<div class="cl-viz-empty"><p>还没有分类预算，可以先给餐饮、交通这类高频分类设上限。</p></div>';
    setPanelContent(node, '<div class="cl-viz-head"><div><span class="cl-viz-kicker">实时预算</span><h2>预算体温计</h2><p>把总预算、剩余额度和风险分类放在一眼能看到的位置。</p></div><div class="cl-viz-actions"><a class="cl-viz-link" href="/ledger">看支出</a><a class="cl-viz-link primary" href="/budgets">调预算</a></div></div>' +
      '<div class="cl-viz-empty"><p>设置一个月度总预算后，这里会显示已用比例、日均可花和风险分类。</p></div>' +
      '<div class="cl-viz-budget-main"><div class="cl-viz-metrics">' +
        metric("总预算", "¥" + money(data.amount), "") +
        metric("已用", "¥" + money(data.spent), data.overspent ? "expense" : "") +
        metric(data.overspent ? "已超支" : "剩余", "¥" + money(Math.abs(data.remaining)), data.overspent ? "expense" : "income") +
        metric("日均可花", "¥" + money(daily), data.remaining <= 0 ? "expense" : "") +
      '</div><div class="cl-viz-ring" style="--pct:' + data.progress + '%;--ring-color:' + ringColor + '"><div><strong>' + data.progress + '%</strong><span>' + (data.overspent ? "超支" : "已用") + '</span></div></div></div>' +
      '<div class="cl-viz-block"><h3>分类预算风险</h3><p>优先显示超支和快用完的分类。</p><div class="cl-viz-risk">' + riskRows + '</div></div>');
  }

  async function loadStats() {
    var scope = scopeKey();
    var key = "stats:" + scope + ":" + monthKey();
    var cached = readCache(key);
    if (cached) return renderStats(cached);
    if (pending[key]) return;
    pending[key] = true;
    try {
      var data = normalizeStats(await api(bust("/api/stats/summary?scope=" + scope + "&month=" + monthKey())));
      writeCache(key, data);
      renderStats(data);
    } catch (error) {
      renderStats(normalizeStats({}));
    } finally {
      pending[key] = false;
    }
  }

  async function loadBudget() {
    var scope = scopeKey();
    var key = "budget:" + scope + ":" + monthKey();
    var cached = readCache(key);
    if (cached) return renderBudget(cached);
    if (pending[key]) return;
    pending[key] = true;
    try {
      var data = normalizeBudget(await api(bust("/api/budgets?scope=" + scope + "&month=" + monthKey())));
      writeCache(key, data);
      renderBudget(data);
    } catch (error) {
      renderBudget(normalizeBudget({}));
    } finally {
      pending[key] = false;
    }
  }

  function render() {
    var path = location.pathname;
    if (path !== "/stats") removePanel("stats");
    if (path !== "/budgets") removePanel("budget");
    if (path === "/stats") loadStats();
    if (path === "/budgets") loadBudget();
  }

  function schedule() {
    window.clearTimeout(timer);
    timer = window.setTimeout(render, 120);
  }

  function patchHistory() {
    if (historyPatched) return;
    historyPatched = true;
    ["pushState", "replaceState"].forEach(function (name) {
      var original = history[name];
      history[name] = function () {
        var result = original.apply(this, arguments);
        schedule();
        return result;
      };
    });
    window.addEventListener("popstate", schedule);
  }

  function boot() {
    patchHistory();
    schedule();
    window.addEventListener("cl-r12-saved", function () {
      clearCache("stats:");
      schedule();
    });
    window.addEventListener("focus", function () {
      clearCache();
      schedule();
    });
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) {
        clearCache();
        schedule();
      }
    });
    document.addEventListener("click", function (event) {
      var copy = event.target.closest("[data-cl-viz-copy]");
      if (!copy) return;
      var text = copy.getAttribute("data-cl-viz-copy") || "";
      if (navigator.clipboard && text) navigator.clipboard.writeText(text);
      copy.textContent = "已复制";
      window.setTimeout(function () { copy.textContent = "复制摘要"; }, 1200);
    });
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
