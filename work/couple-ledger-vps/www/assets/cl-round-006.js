(function () {
  "use strict";

  var ROUND_ATTR = "data-cl-round-006";
  var HISTORY_KEY = "cl_round_006_route_history";
  var PENDING_KEY = "cl_round_001_pending_action";
  var STATS_EMPTY_TEXT = "\u8fd9\u4e2a\u5468\u671f\u8fd8\u6ca1\u6709\u6570\u636e";
  var timer = null;
  var historyPatched = false;

  var publicPaths = ["/login", "/register", "/reset-password", "/legal"];

  var routeLabels = {
    "/home": "首页",
    "/ledger": "账本",
    "/stats": "统计",
    "/budgets": "预算",
    "/recurring": "周期",
    "/couple": "空间",
    "/pet": "果冻",
    "/mine": "我的",
    "/accounts": "账户",
    "/categories": "分类",
    "/jelly": "AI"
  };

  var routeConfig = {
    "/home": {
      title: "首页",
      hint: "从总览直接进入记录、账本和预算。",
      actions: ["openTx", "ledger", "budget"]
    },
    "/ledger": {
      title: "账本",
      hint: "查账、补记和复盘大额支出。",
      actions: ["openTx", "searchLedger", "stats"]
    },
    "/stats": {
      title: "统计",
      hint: "看完趋势后回到账本定位原因。",
      actions: ["ledger", "budget", "openTx"]
    },
    "/budgets": {
      title: "预算",
      hint: "看剩余额度，补记会影响预算的账。",
      actions: ["ledger", "openTx", "recurring"]
    },
    "/recurring": {
      title: "周期账单",
      hint: "处理固定收支和下一次入账。",
      actions: ["addRecurring", "ledger", "budget"]
    },
    "/couple": {
      title: "情侣空间",
      hint: "绑定或复制邀请码后再同步账本。",
      actions: ["copyInvite", "ledger", "openTx"]
    },
    "/pet": {
      title: "果冻",
      hint: "养成、绑定和 AI 对话都在这里串起来。",
      actions: ["couple", "jelly", "openTx"]
    },
    "/mine": {
      title: "我的",
      hint: "管理账户、分类、备份和个人设置。",
      actions: ["accounts", "categories", "exportData"]
    },
    "/accounts": {
      title: "账户",
      hint: "管理现金、银行卡和余额入口。",
      actions: ["ledger", "openTx", "mine"]
    },
    "/categories": {
      title: "分类",
      hint: "维护收入和支出的分类默认项。",
      actions: ["ledger", "openTx", "mine"]
    },
    "/jelly": {
      title: "Jelly AI",
      hint: "围绕真实账本提问和复盘。",
      actions: ["ledger", "stats", "openTx"]
    }
  };

  var actions = {
    openTx: { label: "记一笔", icon: "plus", primary: true },
    searchLedger: { label: "查账本", icon: "search", primary: true },
    ledger: { label: "看账本", icon: "list", path: "/ledger", primary: true },
    stats: { label: "看统计", icon: "chart", path: "/stats" },
    budget: { label: "看预算", icon: "pie", path: "/budgets" },
    recurring: { label: "周期账单", icon: "repeat", path: "/recurring" },
    addRecurring: { label: "添加周期", icon: "plus", primary: true },
    copyInvite: { label: "复制邀请码", icon: "copy", primary: true },
    couple: { label: "去绑定", icon: "heart", path: "/couple", primary: true },
    jelly: { label: "问 Jelly", icon: "sparkles", path: "/jelly" },
    accounts: { label: "账户", icon: "wallet", path: "/accounts", primary: true },
    categories: { label: "分类", icon: "tag", path: "/categories" },
    mine: { label: "我的", icon: "user", path: "/mine" },
    exportData: { label: "导出备份", icon: "download", primary: true }
  };

  function html(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char];
    });
  }

  function icon(name) {
    var paths = {
      plus: '<path d="M12 5v14M5 12h14"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
      book: '<path d="M4 5a2 2 0 0 1 2-2h14v18H6a2 2 0 0 0-2 2z"/><path d="M4 5v16"/>',
      list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
      chart: '<path d="M4 19V9"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M22 19H2"/>',
      pie: '<path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M12 3v9h9"/>',
      repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
      copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
      heart: '<path d="M12 20C5 14 3 11 3 8.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 9 2.5C21 11 19 14 12 20z"/>',
      sparkles: '<path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/><path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9z"/>',
      wallet: '<path d="M3 7a2 2 0 0 1 2-2h14v4"/><path d="M3 7v10a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2z"/><circle cx="16" cy="14" r="1"/>',
      tag: '<path d="M20 10 12 2H4v8l8 8z"/><path d="M7 7h.01"/>',
      user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
      download: '<path d="M12 3v12"/><path d="M8 11l4 4 4-4"/><path d="M4 21h16"/>',
      up: '<path d="M12 19V5"/><path d="M5 12l7-7 7 7"/>'
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.sparkles) + "</svg>";
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

  function navigate(path) {
    if (!path || location.pathname === path) return;
    location.href = path;
  }

  function readHistory() {
    try {
      var list = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      return Array.isArray(list) ? list : [];
    } catch (error) {
      return [];
    }
  }

  function rememberRoute() {
    var path = location.pathname;
    if (!routeLabels[path]) return readHistory();
    var list = readHistory().filter(function (item) { return item !== path; });
    list.unshift(path);
    list = list.slice(0, 6);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
    return list;
  }

  function pageRoot() {
    return document.querySelector(".app-shell .page") || document.querySelector(".app-shell") || document.querySelector("#app") || document.body;
  }

  function anchorForPage(root) {
    if (!root) return null;
    var children = Array.prototype.slice.call(root.children || []);
    return children.find(function (node) {
      return node.tagName === "HEADER" || node.classList.contains("profile-hero");
    }) || null;
  }

  function setContent(node, content) {
    if (node.__round006Content === content) return;
    node.__round006Content = content;
    node.innerHTML = content;
  }

  function compassNode(anchor) {
    var existing = document.querySelector("[" + ROUND_ATTR + '="compass"]');
    var node = existing || document.createElement("section");
    if (!existing) {
      node.className = "cl-route-compass";
      node.setAttribute(ROUND_ATTR, "compass");
    }
    if (anchor && anchor.parentNode && (node.parentNode !== anchor.parentNode || node.previousElementSibling !== anchor)) {
      anchor.parentNode.insertBefore(node, anchor.nextSibling);
    }
    return node;
  }

  function removeCompass() {
    var node = document.querySelector("[" + ROUND_ATTR + '="compass"]');
    if (node) node.remove();
  }

  function actionButton(id, isFirst) {
    var action = actions[id];
    if (!action) return "";
    return '<button type="button" class="cl-route-action ' + (isFirst ? "primary" : "") + '" data-cl-route-action="' + html(id) + '">' + icon(action.icon) + '<span>' + html(action.label) + "</span></button>";
  }

  function renderCompass() {
    if (!isAuthed() || isPublicPath()) {
      removeCompass();
      return;
    }
    var config = routeConfig[location.pathname];
    if (!config) {
      removeCompass();
      return;
    }
    var root = pageRoot();
    var anchor = anchorForPage(root);
    if (!anchor) return;
    var history = rememberRoute();
    var recent = history.find(function (path) { return path !== location.pathname && routeLabels[path]; });
    var recentHtml = recent ? '<button type="button" class="cl-route-recent" data-cl-route-path="' + html(recent) + '">上次 · ' + html(routeLabels[recent]) + "</button>" : "";
    var content = '<div class="cl-route-head"><div class="cl-route-copy"><span>Round 006</span><strong>' + html(config.title) + '罗盘</strong><small>' + html(config.hint) + '</small></div>' + recentHtml + '</div><div class="cl-route-actions">' + config.actions.map(function (id, index) { return actionButton(id, index === 0); }).join("") + '</div>';
    var node = compassNode(anchor);
    setContent(node, content);
  }

  function visibleNode(node) {
    if (!node) return false;
    var rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function findStatsEmptyAnchor() {
    var selectors = [".empty", ".card", ".stack", "section"];
    for (var index = 0; index < selectors.length; index += 1) {
      var nodes = Array.prototype.slice.call(document.querySelectorAll(selectors[index]));
      var found = nodes.find(function (node) {
        if (node.closest(".cl-empty-boost")) return false;
        var text = node.textContent || "";
        return text.indexOf(STATS_EMPTY_TEXT) !== -1 && visibleNode(node);
      });
      if (found) return found;
    }
    return null;
  }

  function ensureStatsEmptyFallback() {
    var own = document.querySelector("[" + ROUND_ATTR + '="stats-empty-fallback"]');
    var bodyText = document.body ? document.body.textContent || "" : "";
    if (location.pathname !== "/stats" || !isAuthed() || isPublicPath() || bodyText.indexOf(STATS_EMPTY_TEXT) === -1) {
      if (own) own.remove();
      return;
    }

    var round002 = document.querySelector('[data-cl-round-002="stats-empty"]');
    if (round002 && round002 !== own) {
      if (own) own.remove();
      return;
    }

    var anchor = findStatsEmptyAnchor();
    if (!anchor) return;

    var node = own || document.createElement("section");
    if (!own) {
      node.className = "cl-empty-boost cl-route-empty-fallback";
      node.setAttribute("data-cl-round-002", "stats-empty");
      node.setAttribute(ROUND_ATTR, "stats-empty-fallback");
      node.addEventListener("click", function (event) {
        var button = event.target.closest("[data-cl-stats-empty-action]");
        if (!button) return;
        if (button.getAttribute("data-cl-stats-empty-action") === "openTx") openTransaction();
        if (button.getAttribute("data-cl-stats-empty-action") === "ledger") navigate("/ledger");
      });
    }

    setContent(node, [
      '<span class="cl-empty-kicker">' + icon("chart") + "<span>\u7edf\u8ba1\u51c6\u5907\u4e2d</span></span>",
      '<h3 class="cl-empty-title">\u7edf\u8ba1\u9875\u9700\u8981\u51e0\u7b14\u771f\u5b9e\u8d26\u5355</h3>',
      '<p class="cl-empty-copy">\u8bb0\u4e0b\u6536\u5165\u3001\u652f\u51fa\u548c\u5206\u7c7b\u540e\uff0c\u8fd9\u91cc\u4f1a\u663e\u793a\u8d8b\u52bf\u3001\u7ed3\u6784\u548c\u9884\u7b97\u538b\u529b\u3002</p>',
      '<div class="cl-empty-mini-grid"><div class="cl-empty-mini"><strong>\u652f\u51fa\u7ed3\u6784</strong><span>\u770b\u94b1\u82b1\u5728\u54ea\u91cc</span></div><div class="cl-empty-mini"><strong>\u5468\u671f\u8d8b\u52bf</strong><span>\u770b\u672c\u5468\u548c\u672c\u6708</span></div><div class="cl-empty-mini"><strong>\u9884\u7b97\u538b\u529b</strong><span>\u770b\u662f\u5426\u8d85\u989d</span></div></div>',
      '<div class="cl-empty-actions"><button type="button" class="cl-empty-action primary" data-cl-stats-empty-action="openTx">' + icon("plus") + "<span>\u53bb\u8bb0\u4e00\u7b14</span></button><button type=\"button\" class=\"cl-empty-action\" data-cl-stats-empty-action=\"ledger\">" + icon("wallet") + "<span>\u770b\u8d26\u672c</span></button></div>"
    ].join(""));

    if (anchor.nextElementSibling !== node) {
      anchor.insertAdjacentElement("afterend", node);
    }
  }

  function focusLedgerSearch() {
    var sticky = document.querySelector(".ledger-sticky");
    if (sticky && sticky.classList.contains("cl-ledger-filters-collapsed")) {
      var toggle = document.querySelector("[data-cl-ledger-toggle]");
      if (toggle) toggle.click();
      else {
        localStorage.setItem("cl_round_005_filters", "expanded");
        sticky.classList.remove("cl-ledger-filters-collapsed");
      }
    }
    if (!document.querySelector(".search-input")) {
      localStorage.setItem(PENDING_KEY, "focus-ledger-search");
      navigate("/ledger");
      return;
    }
    var started = Date.now();
    var focusTimer = window.setInterval(function () {
      var input = document.querySelector(".search-input");
      if (!input) return;
      var rect = input.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        if (Date.now() - started > 2200) window.clearInterval(focusTimer);
        return;
      }
      window.clearInterval(focusTimer);
      input.scrollIntoView({ block: "center", behavior: "smooth" });
      window.setTimeout(function () {
        input.focus({ preventScroll: true });
        input.classList.add("cl-pending-focus");
        window.setTimeout(function () { input.classList.remove("cl-pending-focus"); }, 1300);
      }, 160);
    }, 100);
  }

  function openTransaction() {
    localStorage.setItem(PENDING_KEY, "open-transaction");
    if (location.pathname === "/home" || location.pathname === "/ledger") {
      window.dispatchEvent(new CustomEvent("cl:open-tx-editor"));
      localStorage.removeItem(PENDING_KEY);
      return;
    }
    navigate("/ledger");
  }

  function clickButtonByText(pattern) {
    var regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
    var button = Array.prototype.slice.call(document.querySelectorAll("button")).find(function (item) {
      var rect = item.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && regex.test(item.textContent.trim());
    });
    if (button) {
      button.click();
      return true;
    }
    return false;
  }

  function performAction(id) {
    var action = actions[id];
    if (!action) return;
    if (id === "openTx") return openTransaction();
    if (id === "searchLedger") return focusLedgerSearch();
    if (id === "addRecurring") {
      if (location.pathname !== "/recurring") return navigate("/recurring");
      if (!clickButtonByText(/添加|房租|视频会员|工资/)) {
        var fab = document.querySelector(".fab");
        if (fab) fab.click();
      }
      return;
    }
    if (id === "copyInvite") {
      if (location.pathname !== "/couple") return navigate("/couple");
      clickButtonByText(/复制邀请码/);
      return;
    }
    if (id === "exportData") {
      if (location.pathname !== "/mine") return navigate("/mine");
      clickButtonByText(/导出 CSV|立即导出/);
      return;
    }
    navigate(action.path);
  }

  function ensureTopButton() {
    if (document.querySelector(".cl-route-top")) return;
    var button = document.createElement("button");
    button.type = "button";
    button.className = "cl-route-top";
    button.innerHTML = icon("up") + "<span>顶部</span>";
    button.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    document.body.appendChild(button);
  }

  function updateTopButton() {
    var button = document.querySelector(".cl-route-top");
    if (!button) return;
    var show = isAuthed() && !isPublicPath() && window.scrollY > 520 && !document.body.classList.contains("cl-tx-sheet-open") && !hasActiveOverlay();
    button.classList.toggle("is-visible", show);
  }

  function hasActiveOverlay() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll(".overlay, .sheet-overlay, .sheet"));
    return nodes.some(function (node) {
      if (node.closest(".cl-quick-dock")) return false;
      return visibleNode(node);
    });
  }

  function schedule() {
    window.clearTimeout(timer);
    timer = window.setTimeout(function () {
      renderCompass();
      ensureStatsEmptyFallback();
      ensureTopButton();
      updateTopButton();
    }, 120);
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
    document.addEventListener("click", function (event) {
      var action = event.target.closest("[data-cl-route-action]");
      if (action) {
        performAction(action.getAttribute("data-cl-route-action"));
        return;
      }
      var path = event.target.closest("[data-cl-route-path]");
      if (path) navigate(path.getAttribute("data-cl-route-path"));
    });
    window.addEventListener("scroll", updateTopButton, { passive: true });
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
