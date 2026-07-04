(function () {
  "use strict";

  var AUTH_KEY = "cl_auth";
  var LAST_EMAIL_KEY = "cl_last_email";
  var PENDING_KEY = "cl_round_001_pending_action";
  var publicPaths = ["/login", "/register", "/reset-password", "/legal"];
  var routeTitles = {
    "/home": "首页",
    "/ledger": "账本",
    "/stats": "统计",
    "/chat": "聊天",
    "/mine": "我的",
    "/accounts": "账户",
    "/budgets": "预算",
    "/categories": "分类",
    "/couple": "情侣空间",
    "/pet": "爱情养成",
    "/savings": "存钱计划",
    "/archives": "历史账本",
    "/recurring": "周期账单",
    "/jelly": "Jelly AI",
    "/feedback": "意见反馈"
  };

  function icon(name) {
    var paths = {
      plus: '<path d="M12 5v14M5 12h14"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
      pie: '<path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M12 3v9h9"/>',
      chart: '<path d="M4 19V9"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M22 19H2"/>',
      refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
      chevron: '<path d="m9 6 6 6-6 6"/>',
      bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
      mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.bolt) + "</svg>";
  }

  function parseAuth() {
    try {
      return JSON.parse(localStorage.getItem(AUTH_KEY) || "{}");
    } catch (error) {
      return {};
    }
  }

  function isAuthed() {
    return !!parseAuth().accessToken;
  }

  function isPublicPath() {
    return publicPaths.some(function (path) {
      return location.pathname === path || location.pathname.indexOf(path + "/") === 0;
    });
  }

  function waitFor(selector, callback, timeout) {
    var started = Date.now();
    var timer = window.setInterval(function () {
      var node = document.querySelector(selector);
      if (node) {
        window.clearInterval(timer);
        callback(node);
        return;
      }
      if (Date.now() - started > (timeout || 5000)) {
        window.clearInterval(timer);
      }
    }, 120);
  }

  function waitForVisible(selector, callback, timeout) {
    var started = Date.now();
    var timer = window.setInterval(function () {
      var nodes = Array.prototype.slice.call(document.querySelectorAll(selector));
      var node = nodes.find(function (item) {
        var rect = item.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      if (node) {
        window.clearInterval(timer);
        callback(node);
        return;
      }
      if (Date.now() - started > (timeout || 5000)) {
        window.clearInterval(timer);
      }
    }, 120);
  }

  function setTitle() {
    var title = routeTitles[location.pathname];
    document.title = title ? title + " · 情侣记账" : "情侣记账 · Couple Ledger";
  }

  function navigate(path) {
    if (location.pathname === path) {
      window.dispatchEvent(new Event("cl-round-route-change"));
      return;
    }
    location.href = path;
  }

  function requestOpenTransaction() {
    localStorage.setItem(PENDING_KEY, "open-transaction");
    if (location.pathname === "/home" || location.pathname === "/ledger") {
      runPendingAction();
      return;
    }
    navigate("/ledger");
  }

  function requestLedgerSearch() {
    localStorage.setItem(PENDING_KEY, "focus-ledger-search");
    if (location.pathname !== "/ledger") {
      navigate("/ledger");
      return;
    }
    runPendingAction();
  }

  function runPendingAction() {
    var action = localStorage.getItem(PENDING_KEY);
    if (!action) return;
    if (action === "open-transaction") {
      if (location.pathname !== "/home" && location.pathname !== "/ledger") return;
      window.setTimeout(function () {
        window.dispatchEvent(new CustomEvent("cl:open-tx-editor"));
        localStorage.removeItem(PENDING_KEY);
      }, 280);
      return;
    }
    if (action === "focus-ledger-search") {
      if (location.pathname !== "/ledger") return;
      waitForVisible(".search-input", function (input) {
        input.scrollIntoView({ block: "center", behavior: "smooth" });
        input.focus({ preventScroll: true });
        window.setTimeout(function () {
          input.focus({ preventScroll: true });
        }, 180);
        input.classList.add("cl-pending-focus");
        window.setTimeout(function () {
          input.classList.remove("cl-pending-focus");
        }, 1400);
        localStorage.removeItem(PENDING_KEY);
      }, 7000);
    }
  }

  function createAction(config) {
    var button = document.createElement("button");
    button.className = "cl-quick-action";
    button.type = "button";
    button.dataset.tone = config.tone || "gold";
    button.innerHTML = [
      '<span class="cl-quick-icon">' + icon(config.icon) + "</span>",
      '<span class="cl-quick-copy"><strong>' + config.title + "</strong><span>" + config.caption + "</span></span>",
      '<span class="cl-quick-arrow">' + icon("chevron") + "</span>"
    ].join("");
    button.addEventListener("click", function () {
      config.onClick();
      closeQuickDock();
    });
    return button;
  }

  function closeQuickDock() {
    var dock = document.querySelector(".cl-quick-dock");
    var main = document.querySelector(".cl-quick-main");
    if (!dock || !main) return;
    dock.classList.remove("is-open");
    main.setAttribute("aria-expanded", "false");
  }

  function mountQuickDock() {
    var existing = document.querySelector(".cl-quick-dock");
    if (existing) existing.hidden = !isAuthed() || isPublicPath();
    if (existing) return;

    var dock = document.createElement("div");
    dock.className = "cl-quick-dock";
    dock.hidden = !isAuthed() || isPublicPath();

    var panel = document.createElement("div");
    panel.className = "cl-quick-panel";
    panel.setAttribute("role", "menu");
    panel.appendChild(createAction({
      icon: "plus",
      title: "记一笔",
      caption: "直接打开新增账单",
      onClick: requestOpenTransaction
    }));
    panel.appendChild(createAction({
      icon: "search",
      title: "查账本",
      caption: "跳到账本并聚焦搜索",
      tone: "blue",
      onClick: requestLedgerSearch
    }));
    panel.appendChild(createAction({
      icon: "pie",
      title: "预算",
      caption: "查看本月预算余量",
      tone: "sage",
      onClick: function () { navigate("/budgets"); }
    }));
    panel.appendChild(createAction({
      icon: "chart",
      title: "统计",
      caption: "查看收支趋势",
      tone: "rose",
      onClick: function () { navigate("/stats"); }
    }));
    panel.appendChild(createAction({
      icon: "refresh",
      title: "周期账单",
      caption: "处理固定收支",
      onClick: function () { navigate("/recurring"); }
    }));

    var main = document.createElement("button");
    main.className = "cl-quick-main";
    main.type = "button";
    main.setAttribute("aria-label", "打开快捷操作");
    main.setAttribute("aria-expanded", "false");
    main.innerHTML = icon("bolt");
    main.addEventListener("click", function () {
      var open = !dock.classList.contains("is-open");
      dock.classList.toggle("is-open", open);
      main.setAttribute("aria-expanded", String(open));
    });

    dock.appendChild(panel);
    dock.appendChild(main);
    document.body.appendChild(dock);
  }

  function mountStatusStrip() {
    if (document.querySelector(".cl-status-strip")) return;
    var strip = document.createElement("div");
    strip.className = "cl-status-strip";
    strip.setAttribute("role", "status");
    strip.setAttribute("aria-live", "polite");
    strip.innerHTML = [
      '<span class="cl-status-dot"></span>',
      '<span class="cl-status-text"></span>',
      '<button class="cl-status-button" type="button">' + icon("refresh") + "<span>刷新</span></button>"
    ].join("");
    strip.querySelector("button").addEventListener("click", function () {
      location.reload();
    });
    document.body.appendChild(strip);
    updateStatusStrip();
  }

  function updateStatusStrip(temporaryOnline) {
    var strip = document.querySelector(".cl-status-strip");
    if (!strip) return;
    var text = strip.querySelector(".cl-status-text");
    if (!navigator.onLine) {
      strip.dataset.state = "offline";
      text.textContent = "网络已断开，已保留当前页面状态。";
      strip.classList.add("is-visible");
      return;
    }
    if (temporaryOnline) {
      strip.dataset.state = "online";
      text.textContent = "网络已恢复，可以刷新同步最新数据。";
      strip.classList.add("is-visible");
      window.setTimeout(function () {
        strip.classList.remove("is-visible");
      }, 3600);
      return;
    }
    strip.classList.remove("is-visible");
  }

  function maskEmail(email) {
    var parts = String(email || "").split("@");
    if (parts.length !== 2) return email;
    var name = parts[0];
    var masked = name.length <= 2 ? name.charAt(0) + "*" : name.charAt(0) + "***" + name.charAt(name.length - 1);
    return masked + "@" + parts[1];
  }

  function mountAuthRecentEmail() {
    if (document.querySelector(".cl-auth-recent")) return;
    if (location.pathname !== "/login") return;
    var lastEmail = localStorage.getItem(LAST_EMAIL_KEY);
    if (!lastEmail) return;
    waitFor(".auth-card", function (card) {
      if (document.querySelector(".cl-auth-recent")) return;
      var button = document.createElement("button");
      button.type = "button";
      button.className = "cl-auth-recent";
      button.innerHTML = icon("mail") + "<span>最近登录</span><b>" + maskEmail(lastEmail) + "</b>";
      button.addEventListener("click", function () {
        var email = card.querySelector('input[type="email"]');
        var password = card.querySelector('input[type="password"], .pwd-input');
        if (email) {
          email.value = lastEmail;
          email.dispatchEvent(new Event("input", { bubbles: true }));
        }
        if (password) password.focus();
      });
      card.insertBefore(button, card.firstChild);
    }, 5000);
  }

  function installRouteObserver() {
    if (window.__clRound001RouteObserver) return;
    window.__clRound001RouteObserver = true;
    ["pushState", "replaceState"].forEach(function (method) {
      var original = history[method];
      history[method] = function () {
        var result = original.apply(this, arguments);
        window.dispatchEvent(new Event("cl-round-route-change"));
        return result;
      };
    });
    window.addEventListener("popstate", function () {
      window.dispatchEvent(new Event("cl-round-route-change"));
    });
  }

  function refreshEnhancements() {
    setTitle();
    mountQuickDock();
    mountAuthRecentEmail();
    runPendingAction();
  }

  function boot() {
    installRouteObserver();
    mountStatusStrip();
    refreshEnhancements();
    window.addEventListener("cl-round-route-change", function () {
      window.setTimeout(refreshEnhancements, 80);
    });
    window.addEventListener("online", function () {
      updateStatusStrip(true);
    });
    window.addEventListener("offline", function () {
      updateStatusStrip(false);
    });
    document.addEventListener("click", function (event) {
      var dock = document.querySelector(".cl-quick-dock");
      if (!dock || dock.contains(event.target)) return;
      closeQuickDock();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeQuickDock();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
