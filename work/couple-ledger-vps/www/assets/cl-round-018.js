(function () {
  "use strict";

  var OWN_ATTR = "data-cl-round-018";
  var OWN_SELECTOR = "[" + OWN_ATTR + '="budget"]';
  var OLD_SELECTOR = '[data-cl-round-004="budget"]';
  var timer = 0;
  var pending = false;
  var queued = false;
  var lastPath = location.pathname;

  function html(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char];
    });
  }

  function isBudgets() {
    return location.pathname === "/budgets";
  }

  function authHeaders() {
    try {
      var auth = JSON.parse(localStorage.getItem("cl_auth") || "{}");
      return auth.accessToken ? { Authorization: "Bearer " + auth.accessToken } : {};
    } catch (error) {
      return {};
    }
  }

  function currentScope() {
    return localStorage.getItem("cl_scope") || "personal";
  }

  function currentMonth() {
    var monthInput = document.querySelector('.budgets-page input[type="month"], input[type="month"]');
    if (monthInput && monthInput.value) return monthInput.value;
    var now = new Date();
    return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
  }

  function money(value) {
    var number = Number(value || 0);
    return number.toLocaleString("zh-CN", {
      minimumFractionDigits: number % 1 ? 2 : 0,
      maximumFractionDigits: 2
    });
  }

  function pct(value) {
    var number = Number(value || 0);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.min(100, Math.round(number)));
  }

  function daysLeft(month) {
    var now = new Date();
    var current = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    var parts = String(month || current).split("-");
    var year = Number(parts[0]) || now.getFullYear();
    var monthNumber = Number(parts[1]) || now.getMonth() + 1;
    var daysInMonth = new Date(year, monthNumber, 0).getDate();
    if (month === current) return Math.max(1, daysInMonth - now.getDate() + 1);
    return daysInMonth;
  }

  function pageRoot() {
    return document.querySelector(".app-shell .page") || document.querySelector(".app-shell") || document.querySelector("#app") || document.body;
  }

  function insertAfter(anchor, node) {
    if (anchor && anchor.parentNode) {
      if (anchor.nextSibling !== node) anchor.parentNode.insertBefore(node, anchor.nextSibling);
      return;
    }
    var root = pageRoot();
    if (node.parentNode !== root) root.appendChild(node);
  }

  function ensurePanel() {
    var old = document.querySelector(OLD_SELECTOR);
    if (old) old.classList.add("cl-r18-hidden-budget");

    var node = document.querySelector(OWN_SELECTOR);
    if (!node) {
      node = document.createElement("section");
      node.setAttribute(OWN_ATTR, "budget");
      node.className = "cl-viz-panel cl-viz-budget cl-r18-budget";
    }
    insertAfter(old || document.querySelector(".ph") || document.querySelector(".page-header"), node);
    return node;
  }

  function removePanel() {
    var node = document.querySelector(OWN_SELECTOR);
    if (node) node.remove();
    var old = document.querySelector(OLD_SELECTOR);
    if (old) old.classList.remove("cl-r18-hidden-budget");
  }

  function metric(label, value, tone) {
    return '<div class="cl-viz-metric ' + (tone || "") + '"><span>' + html(label) + "</span><strong>" + html(value) + "</strong></div>";
  }

  function normalize(data) {
    var total = data && data.total ? data.total : {};
    var amountSet = total.amount !== null && total.amount !== undefined && total.amount !== "";
    var amount = amountSet ? Number(total.amount || 0) : null;
    var spent = Number(total.spent || 0);
    var remaining = amountSet ? (total.remaining !== null && total.remaining !== undefined ? Number(total.remaining) : amount - spent) : null;
    var progressRaw = amountSet && amount ? (total.progress_capped !== null && total.progress_capped !== undefined ? Number(total.progress_capped) : spent / amount) : 0;
    var progress = progressRaw <= 1 ? progressRaw * 100 : progressRaw;
    var categories = (Array.isArray(data && data.categories) ? data.categories : []).map(function (item) {
      var catAmount = Number(item.amount || 0);
      var catSpent = Number(item.spent || 0);
      var catRemaining = item.remaining !== null && item.remaining !== undefined ? Number(item.remaining) : catAmount - catSpent;
      var catProgressRaw = item.progress_capped !== null && item.progress_capped !== undefined ? Number(item.progress_capped) : (catAmount ? catSpent / catAmount : 0);
      return {
        category: item.category || item.name || "\u672a\u5206\u7c7b",
        amount: catAmount,
        spent: catSpent,
        remaining: catRemaining,
        progress: pct(catProgressRaw <= 1 ? catProgressRaw * 100 : catProgressRaw),
        overspent: item.overspent !== null && item.overspent !== undefined ? !!item.overspent : catRemaining < 0
      };
    }).filter(function (item) { return item.amount || item.spent; }).sort(function (a, b) {
      if (a.overspent !== b.overspent) return a.overspent ? -1 : 1;
      return b.progress - a.progress;
    });
    return {
      amountSet: amountSet,
      amount: amount || 0,
      spent: spent,
      remaining: remaining,
      progress: pct(progress),
      overspent: !!(amountSet && (total.overspent || remaining < 0)),
      categories: categories
    };
  }

  function riskText(item) {
    if (item.overspent) return "\u8d85\u652f \u00a5" + money(Math.abs(item.remaining));
    if (item.progress >= 85) return "\u5feb\u7528\u5b8c \u00b7 \u5269\u4f59 \u00a5" + money(item.remaining);
    return "\u5269\u4f59 \u00a5" + money(item.remaining);
  }

  function renderBudget(data, month) {
    var node = ensurePanel();
    var budget = normalize(data);
    var remainingValue = budget.amountSet ? "\u00a5" + money(Math.abs(budget.remaining || 0)) : "\u5f85\u8bbe\u7f6e";
    var remainingLabel = budget.overspent ? "\u5df2\u8d85\u652f" : "\u5269\u4f59";
    var daily = budget.amountSet && budget.remaining > 0 ? budget.remaining / daysLeft(month) : null;
    var ringColor = budget.overspent ? "var(--cl-viz-bad)" : budget.progress >= 85 ? "var(--cl-viz-warn)" : "var(--gold)";
    var ring = budget.amountSet ?
      '<div class="cl-viz-ring" style="--pct:' + budget.progress + '%;--ring-color:' + ringColor + '"><div><strong>' + budget.progress + '%</strong><span>' + (budget.overspent ? "\u8d85\u652f" : "\u5df2\u7528") + "</span></div></div>" :
      '<div class="cl-r18-ring-empty">\u672a\u8bbe\u7f6e<br>\u9884\u7b97</div>';
    var riskRows = budget.categories.length ? budget.categories.slice(0, 5).map(function (item) {
      var tone = item.overspent ? " over" : item.progress >= 85 ? " warn" : "";
      return '<div class="cl-viz-bar-line"><div class="cl-viz-label-line"><span class="cl-viz-bar-label">' + html(item.category) + '</span><span class="cl-viz-bar-value ' + (item.overspent ? "expense" : "") + '">' + html(riskText(item)) + '</span></div><div class="cl-viz-track' + tone + '" style="--bar:' + item.progress + '%"><i></i></div></div>';
    }).join("") : '<div class="cl-viz-empty"><p>\u8fd8\u6ca1\u6709\u5206\u7c7b\u9884\u7b97\uff0c\u53ef\u4ee5\u5148\u7ed9\u9910\u996e\u3001\u4ea4\u901a\u8fd9\u7c7b\u9ad8\u9891\u5206\u7c7b\u8bbe\u4e0a\u9650\u3002</p></div>';

    node.innerHTML = '<div class="cl-viz-head"><div><span class="cl-viz-kicker">Round 018</span><h2>\u5b9e\u65f6\u9884\u7b97\u4f53\u6e29\u8ba1</h2><p>' + (budget.amountSet ? "\u5df2\u540c\u6b65\u6700\u65b0\u603b\u9884\u7b97\u548c\u672c\u6708\u652f\u51fa\u3002" : "\u5c1a\u672a\u8bbe\u7f6e\u603b\u9884\u7b97\uff0c\u5148\u4e0d\u663e\u793a\u5047\u7684\u5269\u4f59\u989d\u3002") + '</p><div class="cl-r18-sync-note"><span class="cl-r18-live">\u5b9e\u65f6\u8bfb\u53d6</span> \u8bbe\u7f6e\u9884\u7b97\u6216\u5206\u7c7b\u9650\u989d\u540e\u4f1a\u81ea\u52a8\u66f4\u65b0\u3002</div></div><div class="cl-viz-actions"><a class="cl-viz-link" href="/ledger">\u770b\u652f\u51fa</a><a class="cl-viz-link primary" href="/budgets">\u8c03\u9884\u7b97</a></div></div>' +
      '<div class="cl-viz-budget-main"><div class="cl-viz-metrics">' +
        metric("\u603b\u9884\u7b97", budget.amountSet ? "\u00a5" + money(budget.amount) : "\u672a\u8bbe\u7f6e", budget.amountSet ? "" : "warn") +
        metric("\u5df2\u7528", "\u00a5" + money(budget.spent), budget.overspent ? "expense" : "") +
        metric(remainingLabel, remainingValue, budget.overspent ? "expense" : budget.amountSet ? "income" : "warn") +
        metric("\u65e5\u5747\u53ef\u82b1", daily !== null ? "\u00a5" + money(daily) : "\u5f85\u8bbe\u7f6e", daily === null ? "warn" : "") +
      "</div>" + ring + "</div>" +
      '<div class="cl-viz-block"><h3>\u5206\u7c7b\u9884\u7b97\u98ce\u9669</h3><p>\u4f18\u5148\u663e\u793a\u8d85\u652f\u548c\u5feb\u7528\u5b8c\u7684\u5206\u7c7b\u3002</p><div class="cl-viz-risk">' + riskRows + "</div></div>";
  }

  function renderStatus(message, error) {
    var node = ensurePanel();
    node.innerHTML = '<div class="' + (error ? "cl-r18-error" : "cl-r18-loading") + '">' + html(message) + "</div>";
  }

  function refresh() {
    if (!isBudgets()) {
      removePanel();
      return;
    }
    if (pending) {
      queued = true;
      return;
    }
    pending = true;
    queued = false;
    var month = currentMonth();
    renderStatus("\u6b63\u5728\u540c\u6b65\u6700\u65b0\u9884\u7b97\u2026", false);
    fetch("/api/budgets?scope=" + encodeURIComponent(currentScope()) + "&month=" + encodeURIComponent(month), { headers: authHeaders() })
      .then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .then(function (data) {
        renderBudget(data, month);
      })
      .catch(function () {
        renderStatus("\u9884\u7b97\u6570\u636e\u540c\u6b65\u5931\u8d25\uff0c\u70b9\u51fb\u9875\u9762\u91cc\u7684\u5237\u65b0\u540e\u53ef\u91cd\u8bd5\u3002", true);
      })
      .finally(function () {
        pending = false;
        if (queued) schedule(180);
      });
  }

  function schedule(delay) {
    window.clearTimeout(timer);
    timer = window.setTimeout(refresh, delay == null ? 180 : delay);
  }

  function patchHistory() {
    if (window.__clRound018HistoryPatched) return;
    window.__clRound018HistoryPatched = true;
    ["pushState", "replaceState"].forEach(function (name) {
      var original = history[name];
      history[name] = function () {
        var result = original.apply(this, arguments);
        schedule(220);
        return result;
      };
    });
    window.addEventListener("popstate", function () { schedule(220); });
  }

  function patchFetch() {
    if (window.__clRound018FetchPatched) return;
    window.__clRound018FetchPatched = true;
    var original = window.fetch;
    window.fetch = function () {
      var input = arguments[0];
      var init = arguments[1] || {};
      var url = typeof input === "string" ? input : input && input.url || "";
      var method = String(init.method || input && input.method || "GET").toUpperCase();
      return original.apply(this, arguments).then(function (response) {
        if (isBudgets() && method !== "GET" && (url.indexOf("/api/budgets") >= 0 || url.indexOf("/api/ai-extra") >= 0)) {
          schedule(700);
          window.setTimeout(function () { schedule(0); }, 1600);
        }
        return response;
      });
    };
  }

  function boot() {
    patchHistory();
    patchFetch();
    schedule(240);
    document.addEventListener("click", function (event) {
      if (!isBudgets()) return;
      var button = event.target.closest("button");
      if (!button) return;
      var text = (button.textContent || "").replace(/\s+/g, "");
      if (/保存|应用草案|复制上月|刷新/.test(text)) {
        schedule(900);
        window.setTimeout(function () { schedule(0); }, 1800);
      }
    });
    document.addEventListener("change", function (event) {
      if (isBudgets() && event.target && event.target.matches('input[type="month"]')) schedule(180);
    });
    window.setInterval(function () {
      if (location.pathname !== lastPath) {
        lastPath = location.pathname;
        schedule(220);
      }
    }, 700);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
