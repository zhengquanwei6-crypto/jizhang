(function () {
  "use strict";

  var ROUND_ATTR = "data-cl-round-008";
  var RECURRING_KEY = "cl_round_008_recurring";
  var DUE_KEY = "cl_round_008_due";
  var FILTER_KEY = "cl_round_008_filter";
  var timer = null;
  var fetchPatched = false;
  var historyPatched = false;
  var loadingPromise = null;
  var filterMode = readJson(FILTER_KEY, "all") || "all";

  var publicPaths = ["/login", "/register", "/reset-password", "/legal"];

  function html(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char];
    });
  }

  function icon(name) {
    var paths = {
      plus: '<path d="M12 5v14M5 12h14"/>',
      check: '<path d="M5 12l5 5L20 7"/>',
      calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>',
      list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
      repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
      alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>'
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.repeat) + "</svg>";
  }

  function isPublicPath() {
    return publicPaths.some(function (path) {
      return location.pathname === path || location.pathname.indexOf(path + "/") === 0;
    });
  }

  function isAuthed() {
    try {
      return !!JSON.parse(localStorage.getItem("cl_auth") || "{}").accessToken;
    } catch (error) {
      return false;
    }
  }

  function authHeaders() {
    try {
      var token = JSON.parse(localStorage.getItem("cl_auth") || "{}").accessToken;
      return token ? { Authorization: "Bearer " + token } : {};
    } catch (error) {
      return {};
    }
  }

  function scope() {
    return localStorage.getItem("cl_scope") || "personal";
  }

  function readJson(key, fallback) {
    try {
      var value = JSON.parse(localStorage.getItem(key) || "null");
      return value == null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      return;
    }
  }

  function requestPath(input) {
    try {
      var raw = typeof input === "string" ? input : input && input.url;
      return new URL(raw || "", location.origin).pathname;
    } catch (error) {
      return "";
    }
  }

  function requestMethod(input, init) {
    return String((init && init.method) || (input && input.method) || "GET").toUpperCase();
  }

  function sourceArray(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data && data.items)) return data.items;
    if (Array.isArray(data && data.recurring)) return data.recurring;
    if (Array.isArray(data && data.bills)) return data.bills;
    if (Array.isArray(data && data.data)) return data.data;
    return [];
  }

  function normalizeType(value, amount) {
    var raw = String(value || "").toLowerCase();
    if (raw === "income" || raw.indexOf("收入") !== -1) return "income";
    if (raw === "expense" || raw.indexOf("支出") !== -1) return "expense";
    return Number(amount || 0) < 0 ? "expense" : "expense";
  }

  function normalizeBills(data) {
    return sourceArray(data).map(function (item, index) {
      var amount = item.amount != null ? Number(item.amount) : item.value != null ? Number(item.value) : item.money != null ? Number(item.money) : 0;
      var nextDate = item.next_due_date || item.nextDueDate || item.due_date || item.date || item.next_date || "";
      var active = item.active !== false && item.enabled !== false && item.status !== "paused" && item.status !== "inactive";
      return {
        id: String(item.id || item.recurring_id || item.uid || "recurring-" + index),
        title: item.title || item.name || item.note || item.category || "周期账单",
        amount: amount,
        type: normalizeType(item.type || item.kind, amount),
        category: item.category || item.category_name || "",
        account: item.account_name || item.account || "",
        nextDate: String(nextDate || ""),
        active: active,
        frequency: item.frequency || item.freq || "",
        note: item.note || item.memo || ""
      };
    });
  }

  function writeList(key, data) {
    writeJson(key, {
      scope: scope(),
      items: normalizeBills(data),
      at: Date.now()
    });
  }

  function readList(key) {
    var payload = readJson(key, null);
    if (Array.isArray(payload)) return payload;
    if (!payload || payload.scope !== scope() || !Array.isArray(payload.items)) return null;
    return payload.items;
  }

  function patchFetch() {
    if (fetchPatched || !window.fetch) return;
    fetchPatched = true;
    var original = window.fetch;
    window.fetch = function (input, init) {
      var path = requestPath(input);
      var method = requestMethod(input, init);
      return original.apply(this, arguments).then(function (response) {
        if (response && response.ok && method === "GET") {
          if (path === "/api/transactions/recurring") {
            response.clone().json().then(function (data) {
              writeList(RECURRING_KEY, data);
              schedule();
            }).catch(function () {});
          }
          if (path === "/api/transactions/recurring/due") {
            response.clone().json().then(function (data) {
              writeList(DUE_KEY, data);
              schedule();
            }).catch(function () {});
          }
        }
        return response;
      });
    };
  }

  function loadRecurringData(force) {
    if (location.pathname !== "/recurring" || !isAuthed()) return Promise.resolve();
    var hasRecurring = readList(RECURRING_KEY) !== null;
    var hasDue = readList(DUE_KEY) !== null;
    if (!force && hasRecurring && hasDue) return Promise.resolve();
    if (loadingPromise) return loadingPromise;
    var query = "?scope=" + encodeURIComponent(scope());
    var options = { headers: authHeaders() };
    loadingPromise = Promise.all([
      fetch("/api/transactions/recurring" + query, options).then(function (response) {
        if (!response.ok) throw new Error("recurring");
        return response.json();
      }).then(function (data) { writeList(RECURRING_KEY, data); }).catch(function () {}),
      fetch("/api/transactions/recurring/due" + query, options).then(function (response) {
        if (!response.ok) throw new Error("due");
        return response.json();
      }).then(function (data) { writeList(DUE_KEY, data); }).catch(function () {})
    ]).finally(function () {
      loadingPromise = null;
      schedule();
    });
    return loadingPromise;
  }

  function parseDate(value) {
    if (!value) return null;
    var match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    var date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  function todayStart() {
    var date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function daysUntil(value) {
    var date = parseDate(value);
    if (!date) return 9999;
    date.setHours(0, 0, 0, 0);
    return Math.round((date.getTime() - todayStart().getTime()) / 86400000);
  }

  function statusFor(item) {
    if (!item || !item.active) return "paused";
    var days = daysUntil(item.nextDate);
    if (days < 0) return "overdue";
    if (days === 0) return "today";
    if (days <= 7) return "week";
    return "future";
  }

  function statusText(item) {
    if (!item || !item.active) return "已暂停";
    var days = daysUntil(item.nextDate);
    if (days < 0) return "逾期 " + Math.abs(days) + " 天";
    if (days === 0) return "今天";
    if (days <= 7) return days + " 天后";
    if (days < 9999) return days + " 天后";
    return "待排期";
  }

  function dateText(item) {
    if (!item || !item.nextDate) return "未设置日期";
    return item.nextDate.slice(0, 10);
  }

  function money(value) {
    var number = Math.abs(Number(value || 0));
    return "¥" + number.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function itemKey(item) {
    return item ? String(item.id || item.title + "|" + item.nextDate) : "";
  }

  function enrichItems(items, dueItems) {
    var dueMap = {};
    dueItems.forEach(function (item) { dueMap[itemKey(item)] = true; });
    return items.map(function (item) {
      var copy = Object.assign({}, item);
      copy.days = daysUntil(copy.nextDate);
      copy.status = statusFor(copy);
      copy.pending = !!dueMap[itemKey(copy)] || copy.days <= 0;
      return copy;
    });
  }

  function sortedActive(items) {
    return items.slice().sort(function (a, b) {
      var aPaused = a.active ? 0 : 1;
      var bPaused = b.active ? 0 : 1;
      if (aPaused !== bPaused) return aPaused - bPaused;
      return daysUntil(a.nextDate) - daysUntil(b.nextDate);
    });
  }

  function readData() {
    var recurring = readList(RECURRING_KEY);
    var due = readList(DUE_KEY);
    return {
      recurring: recurring || [],
      due: due || [],
      recurringKnown: recurring !== null,
      dueKnown: due !== null
    };
  }

  function panelAnchor() {
    return document.querySelector('[data-cl-round-006="compass"]') ||
      document.querySelector(".page-header") ||
      document.querySelector("header") ||
      document.querySelector(".app-shell .page") ||
      document.querySelector("#app");
  }

  function panelNode(anchor) {
    var existing = document.querySelector("[" + ROUND_ATTR + '="due-panel"]');
    var node = existing || document.createElement("section");
    if (!existing) {
      node.className = "cl-due-panel";
      node.setAttribute(ROUND_ATTR, "due-panel");
    }
    if (anchor && anchor.parentNode && node.previousElementSibling !== anchor) {
      anchor.insertAdjacentElement("afterend", node);
    }
    return node;
  }

  function setContent(node, content) {
    if (node.__round008Content === content) return;
    node.__round008Content = content;
    node.innerHTML = content;
  }

  function button(label, mode, count) {
    return '<button type="button" class="cl-r8-filter ' + (filterMode === mode ? "is-active" : "") + '" data-cl-r8-filter="' + html(mode) + '">' + html(label) + (count != null ? " " + html(count) : "") + "</button>";
  }

  function action(label, id, iconName, primary) {
    return '<button type="button" class="cl-r8-action ' + (primary ? "primary" : "") + '" data-cl-r8-action="' + html(id) + '">' + icon(iconName) + '<span>' + html(label) + "</span></button>";
  }

  function renderPanel() {
    if (location.pathname !== "/recurring" || !isAuthed() || isPublicPath()) {
      var old = document.querySelector("[" + ROUND_ATTR + '="due-panel"]');
      if (old) old.remove();
      return;
    }

    var data = readData();
    if ((!data.recurringKnown || !data.dueKnown) && !loadingPromise) {
      loadRecurringData(false);
    }

    var items = enrichItems(data.recurring, data.due);
    var dueItems = data.due.length ? enrichItems(data.due, data.due) : items.filter(function (item) { return item.pending || item.status === "week"; });
    var sortedDue = sortedActive(dueItems);
    var next = sortedDue[0] || sortedActive(items)[0] || null;
    var overdueCount = dueItems.filter(function (item) { return item.status === "overdue"; }).length;
    var weekCount = items.filter(function (item) { return item.active && item.days >= 0 && item.days <= 7; }).length;
    var incomeCount = items.filter(function (item) { return item.type === "income"; }).length;
    var expenseCount = items.filter(function (item) { return item.type !== "income"; }).length;
    var pendingAmount = dueItems.reduce(function (total, item) { return total + Math.abs(Number(item.amount || 0)); }, 0);
    var loading = (!data.recurringKnown || !data.dueKnown) && loadingPromise;
    var alertText = overdueCount ? overdueCount + " 笔逾期" : dueItems.length ? dueItems.length + " 笔待处理" : "暂无待处理";
    var nextMeta = next ? [statusText(next), dateText(next), next.category || next.account].filter(Boolean).join(" · ") : "固定收支会在这里按到期顺序排好";
    var note = loading ? "正在读取周期账单数据。" :
      dueItems.length ? "先处理最紧急的一笔，再用筛选查看本周、收入或支出周期账单。" :
      items.length ? "当前没有待确认入账，仍可查看未来 7 天的固定收支。" :
      "还没有周期账单，可以先添加房租、工资或会员订阅。";

    var content = [
      '<div class="cl-r8-head"><div class="cl-r8-copy"><span>Round 008</span><strong>到期处理台</strong><small>把待入账、逾期和本周固定收支放到一个地方处理。</small></div><span class="cl-r8-alert">' + html(alertText) + "</span></div>",
      '<div class="cl-r8-metrics">',
      '<div class="cl-r8-metric"><strong data-cl-r8-metric="pending">' + dueItems.length + '</strong><span>待处理</span></div>',
      '<div class="cl-r8-metric"><strong>' + overdueCount + '</strong><span>逾期</span></div>',
      '<div class="cl-r8-metric"><strong>' + weekCount + '</strong><span>本周</span></div>',
      '<div class="cl-r8-metric"><strong>' + html(money(pendingAmount)) + '</strong><span>待入账金额</span></div>',
      "</div>",
      '<div class="cl-r8-next"><div><span class="cl-r8-next-title">' + html(next ? next.title : "还没有待入账账单") + '</span><span class="cl-r8-next-meta">' + html(nextMeta) + '</span></div><strong class="cl-r8-next-amount">' + html(next ? money(next.amount) : "¥0.00") + "</strong></div>",
      '<div class="cl-r8-filters">' + [
        button("全部", "all", items.length),
        button("待确认", "due", dueItems.length),
        button("逾期", "overdue", overdueCount),
        button("本周", "week", weekCount),
        button("收入", "income", incomeCount),
        button("支出", "expense", expenseCount)
      ].join("") + "</div>",
      '<div class="cl-r8-actions">' + [
        action("处理第一笔", "process-first", "check", true),
        action("本周入账", "week", "calendar", false),
        action("添加周期", "add", "plus", false),
        action("看账本", "ledger", "list", false)
      ].join("") + "</div>",
      '<p class="cl-r8-note">' + html(note) + "</p>"
    ].join("");

    setContent(panelNode(panelAnchor()), content);
  }

  function textOf(node) {
    return (node && (node.innerText || node.textContent) || "").replace(/\s+/g, " ").trim();
  }

  function visible(node) {
    if (!node) return false;
    var rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function matchItem(card, index, items, used) {
    var text = textOf(card);
    var found = items.find(function (item) {
      return !used[itemKey(item)] && item.title && text.indexOf(item.title) !== -1;
    });
    if (!found) found = items[index];
    if (found) used[itemKey(found)] = true;
    return found || null;
  }

  function badge(text, className) {
    return '<span class="cl-r8-badge ' + html(className || "") + '">' + html(text) + "</span>";
  }

  function decorateBillRows() {
    if (location.pathname !== "/recurring") return;
    var data = readData();
    var items = enrichItems(data.recurring, data.due);
    var cards = Array.prototype.slice.call(document.querySelectorAll(".card.bill"));
    var used = {};
    cards.forEach(function (card, index) {
      var item = matchItem(card, index, items, used);
      if (!item) return;
      card.setAttribute("data-cl-r8-state", item.status);
      card.setAttribute("data-cl-r8-type", item.type);
      card.setAttribute("data-cl-r8-pending", item.pending ? "1" : "0");
      card.setAttribute("data-cl-r8-week", item.active && item.days >= 0 && item.days <= 7 ? "1" : "0");
      card.classList.toggle("cl-r8-highlight", item.pending || item.status === "overdue" || item.status === "today");

      var node = card.querySelector("[data-cl-r8-badges]");
      if (!node) {
        node = document.createElement("div");
        node.className = "cl-r8-row-badges";
        node.setAttribute("data-cl-r8-badges", "");
      }
      var badges = [
        badge(statusText(item), "status-" + item.status),
        badge(item.type === "income" ? "收入" : "支出", "type-" + item.type)
      ];
      if (item.category) badges.push(badge(item.category, ""));
      if (item.account) badges.push(badge(item.account, ""));
      var content = badges.join("");
      if (node.__round008Badges !== content) {
        node.__round008Badges = content;
        node.innerHTML = content;
      }
      if (card.firstElementChild !== node) card.insertBefore(node, card.firstChild);
    });
  }

  function decorateDueCard() {
    if (location.pathname !== "/recurring") return;
    var card = document.querySelector(".card.due");
    if (!card) return;
    var data = readData();
    var dueItems = data.due.length ? enrichItems(data.due, data.due) : [];
    var next = sortedActive(dueItems)[0];
    var node = card.querySelector("[data-cl-r8-due-note]");
    if (!next && node) {
      node.remove();
      return;
    }
    if (!next) return;
    if (!node) {
      node = document.createElement("p");
      node.className = "cl-r8-due-note";
      node.setAttribute("data-cl-r8-due-note", "");
    }
    var content = "最紧急：" + next.title + " · " + statusText(next) + " · " + money(next.amount);
    if (node.textContent !== content) node.textContent = content;
    var anchor = card.querySelector(".due-head") || card.firstElementChild;
    if (anchor && anchor.nextElementSibling !== node) anchor.insertAdjacentElement("afterend", node);
  }

  function applyFilter(mode) {
    filterMode = mode || "all";
    writeJson(FILTER_KEY, filterMode);
    var cards = Array.prototype.slice.call(document.querySelectorAll(".card.bill"));
    cards.forEach(function (card) {
      var state = card.getAttribute("data-cl-r8-state");
      var type = card.getAttribute("data-cl-r8-type");
      var pending = card.getAttribute("data-cl-r8-pending") === "1";
      var week = card.getAttribute("data-cl-r8-week") === "1";
      var show = filterMode === "all" ||
        (filterMode === "due" && pending) ||
        (filterMode === "overdue" && state === "overdue") ||
        (filterMode === "week" && week) ||
        (filterMode === "income" && type === "income") ||
        (filterMode === "expense" && type === "expense");
      card.hidden = !show;
      card.classList.toggle("cl-r8-filter-hidden", !show);
    });
    renderPanel();
  }

  function visibleButtons() {
    return Array.prototype.slice.call(document.querySelectorAll("button")).filter(visible);
  }

  function clickButtonByText(pattern, root) {
    var regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
    var buttons = Array.prototype.slice.call((root || document).querySelectorAll("button")).filter(visible);
    var found = buttons.find(function (button) {
      return regex.test(textOf(button));
    });
    if (found) {
      found.click();
      return true;
    }
    return false;
  }

  function clickFirstConfirmButton(root) {
    var buttons = Array.prototype.slice.call((root || document).querySelectorAll("button")).filter(visible);
    var found = buttons.find(function (button) {
      var text = textOf(button);
      return text.indexOf("确认入账") !== -1 && text.indexOf("本周") === -1 && text.indexOf("全部") === -1;
    });
    if (found) {
      found.click();
      return true;
    }
    return false;
  }

  function flash(message) {
    var old = document.querySelector(".cl-r8-flash");
    if (old) old.remove();
    var node = document.createElement("div");
    node.className = "cl-r8-flash";
    node.textContent = message;
    document.body.appendChild(node);
    window.setTimeout(function () {
      if (node.parentNode) node.remove();
    }, 1900);
  }

  function focusDueCard() {
    var due = document.querySelector(".card.due");
    if (!due) return false;
    due.scrollIntoView({ block: "center", behavior: "smooth" });
    due.classList.add("cl-r8-highlight");
    window.setTimeout(function () { due.classList.remove("cl-r8-highlight"); }, 1400);
    return true;
  }

  function handleAction(name) {
    if (name === "process-first") {
      var due = document.querySelector(".card.due");
      if (due && clickFirstConfirmButton(due)) {
        flash("已定位第一笔待确认账单");
        return;
      }
      if (focusDueCard()) {
        flash("已定位待确认区域");
        return;
      }
      applyFilter("due");
      flash("当前没有待确认账单");
      return;
    }
    if (name === "week") {
      applyFilter("week");
      focusDueCard();
      flash("已筛到本周周期账单");
      return;
    }
    if (name === "add") {
      var fab = document.querySelector(".fab");
      if (fab && visible(fab)) {
        fab.click();
        flash("已打开添加周期入口");
        return;
      }
      if (clickButtonByText(/添加周期|添加|房租|视频会员|工资/)) {
        flash("已打开添加周期入口");
        return;
      }
      flash("没有找到添加入口");
      return;
    }
    if (name === "ledger") {
      location.href = "/ledger";
    }
  }

  function renderAll() {
    renderPanel();
    if (location.pathname !== "/recurring") return;
    decorateBillRows();
    decorateDueCard();
    applyFilter(filterMode);
  }

  function schedule() {
    if (timer) return;
    timer = window.setTimeout(function () {
      timer = null;
      renderAll();
    }, 140);
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
    patchFetch();
    patchHistory();
    loadRecurringData(false);
    schedule();
    document.addEventListener("click", function (event) {
      var filter = event.target.closest && event.target.closest("[data-cl-r8-filter]");
      if (filter) {
        applyFilter(filter.getAttribute("data-cl-r8-filter"));
        return;
      }
      var action = event.target.closest && event.target.closest("[data-cl-r8-action]");
      if (action) {
        handleAction(action.getAttribute("data-cl-r8-action"));
        return;
      }
      window.setTimeout(schedule, 80);
    });
    window.addEventListener("storage", schedule);
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
