(function () {
  "use strict";

  var ROUND_ATTR = "data-cl-round-005";
  var LAST_TX_KEY = "cl_round_003_last_tx";
  var cache = {};
  var pending = {};
  var timer = null;
  var historyPatched = false;
  var compactPreference = localStorage.getItem("cl_round_005_filters") || "";

  function html(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char];
    });
  }

  function money(value) {
    var number = Number(value || 0);
    return number.toLocaleString("zh-CN", { maximumFractionDigits: 2 }).replace(/\\.00$/, "");
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

  function normalizeTx(item) {
    var amount = Number(item.amount || 0);
    var type = item.type || (amount < 0 ? "expense" : "expense");
    return {
      id: item.id || "",
      type: type,
      amount: Math.abs(amount),
      category: item.category || item.category_name || "未分类",
      note: item.note || item.description || "",
      account_id: item.account_id || "",
      account_name: item.account_name || item.account || "",
      tx_date: item.tx_date || item.date || item.created_at || "",
      paid_by: item.paid_by || "",
      split_type: item.split_type || ""
    };
  }

  function isIncome(tx) {
    return tx.type === "income";
  }

  function dayKey(tx) {
    return String(tx.tx_date || "").slice(0, 10);
  }

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function dayLabel(date) {
    var text = String(date || "");
    var parts = text.slice(5, 10).split("-");
    return parts.length === 2 ? Number(parts[0]) + "月" + Number(parts[1]) + "日" : text;
  }

  function listAnchor() {
    return document.querySelector(".day-group") || document.querySelector(".empty") || document.querySelector(".ledger-sticky");
  }

  function scanPanel() {
    var existing = document.querySelector("[" + ROUND_ATTR + '="scan"]');
    var anchor = listAnchor();
    var node = existing || document.createElement("section");
    if (!existing) {
      node.setAttribute(ROUND_ATTR, "scan");
      node.className = "cl-ledger-scan";
    }
    if (anchor && anchor.parentNode && (node.parentNode !== anchor.parentNode || node.nextElementSibling !== anchor)) {
      anchor.parentNode.insertBefore(node, anchor);
    }
    return node;
  }

  function removeEnhancements() {
    var panel = document.querySelector("[" + ROUND_ATTR + '="scan"]');
    if (panel) panel.remove();
    document.querySelectorAll(".cl-tx-repeat, .cl-ledger-badges, .cl-ledger-day-tags").forEach(function (node) { node.remove(); });
    document.querySelectorAll(".cl-ledger-large, .cl-ledger-income, .cl-ledger-hidden").forEach(function (node) {
      node.classList.remove("cl-ledger-large", "cl-ledger-income", "cl-ledger-hidden");
    });
    var sticky = document.querySelector(".ledger-sticky");
    if (sticky) sticky.classList.remove("cl-ledger-filters-collapsed");
  }

  function summarize(transactions) {
    var totalExpense = 0;
    var totalIncome = 0;
    var largestExpense = null;
    var todayExpense = 0;
    var groups = {};
    transactions.forEach(function (tx) {
      if (isIncome(tx)) totalIncome += tx.amount;
      else {
        totalExpense += tx.amount;
        if (!largestExpense || tx.amount > largestExpense.amount) largestExpense = tx;
        if (dayKey(tx) === todayKey()) todayExpense += tx.amount;
      }
      var key = dayKey(tx);
      if (!groups[key]) groups[key] = { income: 0, expense: 0, count: 0, hasLarge: false };
      groups[key].count += 1;
      if (isIncome(tx)) groups[key].income += tx.amount;
      else groups[key].expense += tx.amount;
      if (!isIncome(tx) && tx.amount >= 500) groups[key].hasLarge = true;
    });
    return { totalExpense: totalExpense, totalIncome: totalIncome, largestExpense: largestExpense, todayExpense: todayExpense, groups: groups };
  }

  function setPanelContent(node, content) {
    if (node.__round005Content === content) return;
    node.__round005Content = content;
    node.innerHTML = content;
  }

  function metric(label, value, tone) {
    return '<div class="cl-ledger-metric ' + (tone || "") + '"><span>' + html(label) + '</span><strong>' + html(value) + '</strong></div>';
  }

  function setCompactFilters(force) {
    var sticky = document.querySelector(".ledger-sticky");
    if (!sticky) return;
    var shouldCompact = force != null ? force : (compactPreference ? compactPreference === "collapsed" : window.matchMedia("(max-width: 680px)").matches);
    sticky.classList.toggle("cl-ledger-filters-collapsed", shouldCompact);
    var button = document.querySelector("[data-cl-ledger-toggle]");
    if (button) button.textContent = shouldCompact ? "展开筛选" : "收起筛选";
  }

  function applyLargeNativeFilter() {
    var buttons = Array.prototype.slice.call(document.querySelectorAll(".ledger-sticky .chip"));
    var target = buttons.find(function (button) { return button.textContent.trim() === "≥500"; });
    if (target) target.click();
  }

  function scrollToday() {
    var group = Array.prototype.slice.call(document.querySelectorAll(".day-group")).find(function (node) {
      return node.textContent.indexOf(dayLabel(todayKey())) !== -1;
    }) || document.querySelector(".day-group");
    if (group) group.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function copyDigest(summary, transactions) {
    var largest = summary.largestExpense ? summary.largestExpense.category + " ¥" + money(summary.largestExpense.amount) : "暂无";
    var text = [
      "本月账本 " + transactions.length + " 笔",
      "收入 ¥" + money(summary.totalIncome),
      "支出 ¥" + money(summary.totalExpense),
      "最大支出 " + largest,
      "今日支出 ¥" + money(summary.todayExpense)
    ].join(" · ");
    if (navigator.clipboard) navigator.clipboard.writeText(text);
  }

  function renderPanel(transactions) {
    if (!transactions.length) return;
    var summary = summarize(transactions);
    var largest = summary.largestExpense;
    var node = scanPanel();
    var copy = largest ? largest.category + " ¥" + money(largest.amount) : "暂无大额支出";
    setPanelContent(node,
      '<div class="cl-ledger-scan-head"><div class="cl-ledger-scan-title"><span>Round 005</span><strong>账本扫描</strong><small>' + html(transactions.length + " 笔 · 最大支出 " + copy) + '</small></div><div class="cl-ledger-scan-actions"><button type="button" data-cl-ledger-toggle>收起筛选</button><button type="button" data-cl-ledger-large>看大额</button><button type="button" class="primary" data-cl-ledger-copy>复制摘要</button></div></div>' +
      '<div class="cl-ledger-metrics">' +
        metric("今日支出", "¥" + money(summary.todayExpense), summary.todayExpense >= 500 ? "warn" : "expense") +
        metric("本月支出", "¥" + money(summary.totalExpense), "expense") +
        metric("本月收入", "¥" + money(summary.totalIncome), "income") +
      '</div>');
    setCompactFilters();
    node.querySelector("[data-cl-ledger-toggle]").onclick = function () {
      var sticky = document.querySelector(".ledger-sticky");
      var next = !(sticky && sticky.classList.contains("cl-ledger-filters-collapsed"));
      compactPreference = next ? "collapsed" : "expanded";
      localStorage.setItem("cl_round_005_filters", compactPreference);
      setCompactFilters(next);
    };
    node.querySelector("[data-cl-ledger-large]").onclick = applyLargeNativeFilter;
    node.querySelector("[data-cl-ledger-copy]").onclick = function () {
      copyDigest(summary, transactions);
      this.textContent = "已复制";
      var button = this;
      window.setTimeout(function () { button.textContent = "复制摘要"; }, 1200);
    };
  }

  function storeForRepeat(tx) {
    localStorage.setItem(LAST_TX_KEY, JSON.stringify({
      type: tx.type || "expense",
      category: tx.category || "",
      note: tx.note || "",
      account_id: tx.account_id || "",
      paid_by: tx.paid_by || "",
      split_type: tx.split_type || "",
      saved_at: Date.now()
    }));
    window.dispatchEvent(new CustomEvent("cl:open-tx-editor"));
  }

  function annotateTransactions(transactions) {
    var rows = Array.prototype.slice.call(document.querySelectorAll(".tx"));
    rows.forEach(function (row, index) {
      var tx = transactions[index];
      if (!tx) return;
      row.classList.toggle("cl-ledger-large", !isIncome(tx) && tx.amount >= 500);
      row.classList.toggle("cl-ledger-income", isIncome(tx));
      if (!row.querySelector(".cl-ledger-badges")) {
        var main = row.querySelector(".tx-main") || row;
        var badges = document.createElement("div");
        badges.className = "cl-ledger-badges";
        main.appendChild(badges);
      }
      var badgesNode = row.querySelector(".cl-ledger-badges");
      var badges = [];
      if (isIncome(tx)) badges.push('<span class="cl-ledger-badge income">收入</span>');
      if (!isIncome(tx) && tx.amount >= 500) badges.push('<span class="cl-ledger-badge large">大额</span>');
      if (dayKey(tx) === todayKey()) badges.push('<span class="cl-ledger-badge">今天</span>');
      if (tx.account_name) badges.push('<span class="cl-ledger-badge">' + html(tx.account_name) + '</span>');
      var badgeHtml = badges.join("");
      if (badgesNode.__round005Content !== badgeHtml) {
        badgesNode.__round005Content = badgeHtml;
        badgesNode.innerHTML = badgeHtml;
      }
      if (!row.querySelector(".cl-tx-repeat")) {
        var repeat = document.createElement("button");
        repeat.type = "button";
        repeat.className = "cl-tx-repeat";
        repeat.textContent = "复记";
        repeat.addEventListener("click", function (event) {
          event.stopPropagation();
          storeForRepeat(tx);
        });
        row.appendChild(repeat);
      }
    });
  }

  function annotateDayGroups(transactions) {
    var summary = summarize(transactions);
    document.querySelectorAll(".day-group").forEach(function (group) {
      if (group.querySelector(".cl-ledger-day-tags")) return;
      var text = group.textContent;
      var key = Object.keys(summary.groups).find(function (date) { return text.indexOf(dayLabel(date)) !== -1; });
      if (!key) return;
      var data = summary.groups[key];
      var tags = document.createElement("div");
      tags.className = "cl-ledger-day-tags";
      var parts = [];
      if (data.hasLarge) parts.push('<span class="cl-ledger-day-tag warn">含大额</span>');
      if (data.income) parts.push('<span class="cl-ledger-day-tag income">有收入</span>');
      if (data.count >= 3) parts.push('<span class="cl-ledger-day-tag">高频日</span>');
      tags.innerHTML = parts.join("");
      var head = group.querySelector(".day-head") || group.firstElementChild;
      if (head && parts.length) head.appendChild(tags);
    });
  }

  async function loadLedger() {
    if (location.pathname !== "/ledger") {
      removeEnhancements();
      return;
    }
    var key = "ledger:" + scopeKey() + ":" + monthKey();
    if (cache[key]) {
      renderLedger(cache[key]);
      return;
    }
    if (pending[key]) return;
    pending[key] = true;
    try {
      var data = await api("/api/transactions?scope=" + scopeKey() + "&month=" + monthKey() + "&limit=30&offset=0");
      var list = Array.isArray(data) ? data : data.items || [];
      cache[key] = list.map(normalizeTx);
      renderLedger(cache[key]);
    } catch (error) {
      cache[key] = [];
    } finally {
      pending[key] = false;
    }
  }

  function renderLedger(transactions) {
    if (location.pathname !== "/ledger") return;
    if (!transactions.length || !document.querySelector(".day-group")) {
      removeEnhancements();
      return;
    }
    renderPanel(transactions);
    annotateTransactions(transactions);
    annotateDayGroups(transactions);
  }

  function schedule() {
    window.clearTimeout(timer);
    timer = window.setTimeout(loadLedger, 160);
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
    document.addEventListener("click", schedule, true);
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
