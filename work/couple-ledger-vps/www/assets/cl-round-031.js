(function () {
  "use strict";

  var BODY_CLASS = "cl-r31-sweep";
  var ROUTE_PREFIX = "cl-r31-route-";
  var typing = false;
  var composing = false;
  var lastInput = null;
  var inputMemory = {};
  var initialPath = window.__clInitialPath || location.pathname;
  var forcedRoute = initialPath === "/duplicates" ? "/duplicates" : "";
  var standaloneRoot = null;

  var featureCopy = {
    "/stats": {
      title: "统计怎么用",
      body: "先看本月结余，再看分类排行和趋势，适合每周复盘一次。",
      actions: [["看账本", "/ledger"], ["看预算", "/budgets"]]
    },
    "/chat": {
      title: "聊天与账本协作",
      body: "把沟通和账本问题放在一起，复杂问题可以去 Jelly AI 深问。",
      actions: [["问 Jelly", "/jelly"], ["回空间", "/couple"]]
    },
    "/mine": {
      title: "我的设置",
      body: "个人资料、导入导出和反馈入口放在这里，常用操作优先展示。",
      actions: [["意见反馈", "/feedback"], ["看账户", "/accounts"]]
    },
    "/categories": {
      title: "分类整理",
      body: "先维护常用分类，再回到账本录入；分类越清楚，统计越好读。",
      actions: [["回账本", "/ledger"], ["看统计", "/stats"]]
    },
    "/archives": {
      title: "历史账本",
      body: "这里只读查看旧情侣账本，避免和当前账本混在一起。",
      actions: [["回首页", "/home"], ["看账本", "/ledger"]]
    },
    "/recurring": {
      title: "周期账单",
      body: "房租、会员、工资这类固定收支在这里处理，到期后再确认入账。",
      actions: [["处理账单", "/ledger"], ["看预算", "/budgets"]]
    },
    "/jelly": {
      title: "Jelly AI 分工",
      body: "首页只保留快速记账，复杂提问集中到这里，避免多个页面重复放 AI 入口。",
      actions: [["快速记账", "/home"], ["看统计", "/stats"]]
    },
    "/feedback": {
      title: "反馈处理",
      body: "描述问题、补充截图、查看工单状态都在这一页完成。",
      actions: [["回我的", "/mine"], ["回首页", "/home"]]
    },
    "/admin": {
      title: "管理看板",
      body: "只保留运营需要的用户、反馈和功能开关信息，避免普通页面混入管理动作。",
      actions: [["回首页", "/home"], ["看反馈", "/feedback"]]
    },
    "/reset-password": {
      title: "找回账户",
      body: "输入注册邮箱后再查看邮件，避免反复提交。",
      actions: [["返回登录", "/login"]]
    },
    "/legal": {
      title: "条款说明",
      body: "协议、隐私和公测说明分开查看，减少一次性阅读压力。",
      actions: [["返回登录", "/login"]]
    }
  };

  function routeName() {
    var name = (forcedRoute || location.pathname).replace(/^\/+/, "") || "home";
    return name.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  }

  function textOf(node) {
    return String(node && node.textContent ? node.textContent : "").replace(/\s+/g, " ").trim();
  }

  function navigate(path) {
    if (!path) return;
    forcedRoute = path === "/duplicates" ? "/duplicates" : "";
    if (location.pathname === path) {
      window.dispatchEvent(new Event("cl-round-route-change"));
      return;
    }
    history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
    window.dispatchEvent(new Event("cl-round-route-change"));
  }

  function isEditable(node) {
    return !!(node && node.matches && node.matches("input:not([type='checkbox']):not([type='radio']):not([type='file']), textarea, select"));
  }

  function canSelectText(node) {
    if (!node || !node.setSelectionRange || node.tagName === "SELECT") return false;
    var type = String(node.getAttribute("type") || "text").toLowerCase();
    return node.tagName === "TEXTAREA" || ["", "text", "search", "tel", "url", "password"].includes(type);
  }

  function inputKey(node) {
    if (!node) return "";
    return [
      node.getAttribute("data-cl-r12-input") != null ? "quick" : "",
      node.getAttribute("aria-label") || "",
      node.getAttribute("placeholder") || "",
      node.name || "",
      node.id || "",
      node.tagName || "",
      node.getAttribute("type") || ""
    ].join("|");
  }

  function rememberInput(node) {
    if (!isEditable(node) || node.disabled || node.readOnly || node.tagName === "SELECT") return;
    var key = inputKey(node);
    if (!key) return;
    var start = null;
    var end = null;
    if (canSelectText(node)) {
      try {
        start = node.selectionStart;
        end = node.selectionEnd;
      } catch (error) {
        start = null;
        end = null;
      }
    }
    inputMemory[key] = {
      value: node.value,
      start: start,
      end: end,
      time: Date.now()
    };
    lastInput = { key: key, node: node };
  }

  function restoreSelection(node, snapshot) {
    if (!canSelectText(node) || !snapshot) return;
    var length = String(node.value || "").length;
    var end = Number.isFinite(snapshot.end) ? Math.min(snapshot.end, length) : length;
    var start = Number.isFinite(snapshot.start) ? Math.min(snapshot.start, end) : end;
    try {
      node.setSelectionRange(start, end);
    } catch (error) {
      return;
    }
  }

  function restoreActiveInput() {
    if (!lastInput || composing) return;
    var snapshot = inputMemory[lastInput.key];
    if (!snapshot || Date.now() - snapshot.time > 4000) return;
    var active = document.activeElement;
    if (active && inputKey(active) === lastInput.key) {
      restoreSelection(active, snapshot);
      return;
    }
    if (typing && active && isEditable(active) && inputKey(active) !== lastInput.key) return;
    var match = lastInput.node && lastInput.node.isConnected ? lastInput.node : null;
    if (!match) {
      var candidates = Array.prototype.slice.call(document.querySelectorAll("input, textarea, select"));
      match = candidates.find(function (node) { return inputKey(node) === lastInput.key && !node.disabled && !node.readOnly; });
    }
    if (!match) return;
    if (typeof snapshot.value === "string" && match.value !== snapshot.value && match.tagName !== "SELECT") {
      match.value = snapshot.value;
      match.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (document.activeElement !== match) {
      try {
        match.focus({ preventScroll: true });
      } catch (error) {
        match.focus();
      }
    }
    restoreSelection(match, snapshot);
  }

  function strengthenInputs(root) {
    Array.prototype.forEach.call((root || document).querySelectorAll("input, textarea, select"), function (field) {
      if (field.disabled || field.readOnly) return;
      field.style.webkitUserSelect = "text";
      field.style.userSelect = "text";
      if (!field.getAttribute("autocomplete") && field.tagName !== "TEXTAREA") field.setAttribute("autocomplete", "on");
      if (field.matches("input[type='number']")) field.setAttribute("inputmode", "decimal");
      if (field.matches("input[type='search']")) field.setAttribute("enterkeyhint", "search");
      if (field.tagName === "TEXTAREA") field.setAttribute("enterkeyhint", "done");
    });
  }

  function installFocusGuard() {
    if (window.__clR31FocusGuard) return;
    window.__clR31FocusGuard = true;
    ["HTMLInputElement", "HTMLTextAreaElement"].forEach(function (name) {
      var ctor = window[name];
      if (!ctor || !ctor.prototype || !ctor.prototype.focus) return;
      var original = ctor.prototype.focus;
      ctor.prototype.focus = function () {
        var key = inputKey(this);
        var snapshot = key ? inputMemory[key] : null;
        var result = original.apply(this, arguments);
        if (snapshot && isEditable(this)) {
          var node = this;
          window.setTimeout(function () {
            if (document.activeElement === node) restoreSelection(node, snapshot);
          }, 0);
          window.setTimeout(function () {
            if (document.activeElement === node) restoreSelection(node, snapshot);
          }, 120);
        }
        return result;
      };
    });
  }

  function enhanceToolbars() {
    Array.prototype.forEach.call(document.querySelectorAll(".page-header .toolbar"), function (toolbar) {
      if (toolbar.__clR31Enhanced) return;
      var controls = Array.prototype.filter.call(toolbar.children, function (child) {
        return !child.classList.contains("cl-r31-more-actions");
      });
      if (controls.length <= 2) return;
      toolbar.__clR31Enhanced = true;
      toolbar.classList.add("cl-r31-toolbar-collapsed");
      var button = document.createElement("button");
      button.type = "button";
      button.className = "cl-r31-more-actions";
      button.textContent = "更多";
      button.setAttribute("aria-expanded", "false");
      button.addEventListener("click", function () {
        var collapsed = toolbar.classList.toggle("cl-r31-toolbar-collapsed");
        button.textContent = collapsed ? "更多" : "收起";
        button.setAttribute("aria-expanded", String(!collapsed));
      });
      toolbar.appendChild(button);
    });
  }

  function markHomeDuplicates() {
    if (location.pathname !== "/home" && location.pathname !== "/") return;
    Array.prototype.forEach.call(document.querySelectorAll(".card, .panel, article"), function (node) {
      var text = textOf(node);
      if (text.includes("Jelly AI") && (text.includes("完整对话") || text.includes("智能问答") || text.includes("本月花了多少"))) node.classList.add("cl-r31-home-ai-card");
      if (text.includes("本月概览") && text.includes("账户") && text.includes("预算") && text.includes("统计")) node.classList.add("cl-r31-home-utility-grid");
    });
  }

  function markLedgerDuplicates() {
    if (location.pathname !== "/ledger") return;
    Array.prototype.forEach.call(document.querySelectorAll(".card, .panel, article"), function (node) {
      var text = textOf(node);
      if (text.includes("账本罗盘") && text.includes("记一笔") && text.includes("看统计")) node.classList.add("cl-r31-ledger-compass");
    });
  }

  function simplifyFeaturePages() {
    var copy = featureCopy[location.pathname];
    if (!copy) return;
    var page = document.querySelector(".page") || document.querySelector("#app");
    if (!page) return;
    Array.prototype.forEach.call(page.querySelectorAll(".metric-card, .card, .panel, section, article, .stack"), function (node) {
      var text = textOf(node);
      if (/待接入|Round 017|`\/api`|迁移顺序|验证标准|线上构建|静态检查/.test(text)) {
        node.classList.add("cl-r31-dev-copy");
      }
    });
    if (page.querySelector(".cl-r31-feature-summary")) return;
    var summary = document.createElement("section");
    summary.className = "cl-r31-feature-summary";
    summary.innerHTML =
      '<div class="cl-r31-feature-card">' +
      "<strong>" + copy.title + "</strong>" +
      "<span>" + copy.body + "</span>" +
      '<div class="cl-r31-feature-actions">' +
      copy.actions.map(function (item) {
        return '<a href="' + item[1] + '" data-cl-r31-nav="' + item[1] + '">' + item[0] + "</a>";
      }).join("") +
      "</div></div>";
    var grid = page.querySelector(".grid");
    if (grid && grid.parentNode) grid.parentNode.insertBefore(summary, grid);
    else page.appendChild(summary);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatMoney(value) {
    var amount = Number(value || 0);
    if (!Number.isFinite(amount)) amount = 0;
    return "¥" + amount.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function readAuthToken() {
    try {
      var session = JSON.parse(localStorage.getItem("cl_auth") || "{}");
      return session.accessToken || session.access_token || "";
    } catch (error) {
      return "";
    }
  }

  function readScope() {
    try {
      return localStorage.getItem("cl_scope") || "couple";
    } catch (error) {
      return "couple";
    }
  }

  function duplicateFallback() {
    return {
      scope: readScope(),
      month: new Date().toISOString().slice(0, 7),
      total_groups: 0,
      total_duplicates: 0,
      groups: []
    };
  }

  function duplicateStat(label, value) {
    return '<div class="cl-r31-dup-stat"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + "</strong></div>";
  }

  function duplicateGroup(group, index) {
    var transactions = Array.isArray(group.transactions) ? group.transactions : [];
    var rows = transactions.map(function (tx) {
      var title = tx.note || tx.description || tx.category || "未命名账单";
      var date = tx.tx_date || tx.date || String(tx.created_at || "").slice(0, 10);
      return '<div class="cl-r31-dup-row"><span><strong>' + escapeHtml(title) + '</strong><small class="cl-r31-dup-meta">' +
        escapeHtml([date, tx.category, tx.account_name].filter(Boolean).join(" · ")) +
        '</small></span><b>' + escapeHtml(formatMoney(tx.amount)) + "</b></div>";
    }).join("");
    return '<article class="cl-r31-dup-card">' +
      "<h2>重复组 " + (index + 1) + "</h2>" +
      '<p class="cl-r31-dup-meta">' + escapeHtml(group.reason || "金额、日期或备注高度相似，建议人工复核后再删除。") + "</p>" +
      (rows || '<p class="cl-r31-dup-empty">这一组暂无明细。</p>') +
      "</article>";
  }

  function renderDuplicateData(data) {
    if (!standaloneRoot) return;
    var groups = Array.isArray(data.groups) ? data.groups : [];
    standaloneRoot.innerHTML =
      '<main class="cl-r31-standalone-page">' +
      '<header class="cl-r31-standalone-head">' +
      "<h1>查重复账单</h1>" +
      '<p>把导入、批量记账后可能重复的流水集中放在这里，先看清楚再处理。</p>' +
      '<div class="cl-r31-dup-actions">' +
      '<button type="button" class="primary" data-cl-r31-refresh-duplicates>刷新</button>' +
      '<a href="/ledger" data-cl-r31-nav="/ledger">回账本</a>' +
      '<a href="/home" data-cl-r31-nav="/home">回首页</a>' +
      "</div>" +
      "</header>" +
      '<section class="cl-r31-dup-stats">' +
      duplicateStat("重复组", data.total_groups || groups.length || 0) +
      duplicateStat("建议复核", data.total_duplicates || 0) +
      duplicateStat("月份", data.month || new Date().toISOString().slice(0, 7)) +
      "</section>" +
      '<section class="cl-r31-dup-list">' +
      (groups.length ? groups.map(duplicateGroup).join("") : '<div class="cl-r31-dup-card"><h2>没有发现明显重复</h2><p class="cl-r31-dup-empty">当前月份没有需要优先处理的重复账单，可以放心回到账本继续记账。</p></div>') +
      "</section>" +
      '<nav class="cl-r31-dup-nav" aria-label="底部导航">' +
      '<a href="/home" data-cl-r31-nav="/home">首页</a>' +
      '<a href="/ledger" data-cl-r31-nav="/ledger">账本</a>' +
      '<a href="/stats" data-cl-r31-nav="/stats">统计</a>' +
      '<a href="/mine" data-cl-r31-nav="/mine">我的</a>' +
      "</nav>" +
      "</main>";
  }

  function loadDuplicateData() {
    if (!standaloneRoot || standaloneRoot.__clR31Loading) return;
    standaloneRoot.__clR31Loading = true;
    var month = new Date().toISOString().slice(0, 7);
    var token = readAuthToken();
    var headers = token ? { Authorization: "Bearer " + token } : {};
    standaloneRoot.innerHTML = '<main class="cl-r31-standalone-page"><header class="cl-r31-standalone-head"><h1>查重复账单</h1><p>正在读取重复账单...</p></header></main>';
    fetch("/api/transactions/duplicates?scope=" + encodeURIComponent(readScope()) + "&month=" + encodeURIComponent(month), { headers: headers })
      .then(function (response) { return response.ok ? response.json() : duplicateFallback(); })
      .then(renderDuplicateData)
      .catch(function () { renderDuplicateData(duplicateFallback()); })
      .finally(function () { if (standaloneRoot) standaloneRoot.__clR31Loading = false; });
  }

  function renderStandaloneRoutes() {
    var wantsDuplicates = forcedRoute === "/duplicates" || location.pathname === "/duplicates";
    if (!wantsDuplicates) {
      document.body.classList.remove("cl-r31-standalone", "cl-r31-standalone-duplicates");
      if (standaloneRoot) standaloneRoot.remove();
      standaloneRoot = null;
      return;
    }
    forcedRoute = "/duplicates";
    if (location.pathname !== "/duplicates") {
      history.replaceState({}, "", "/duplicates");
    }
    document.body.classList.add("cl-r31-standalone", "cl-r31-standalone-duplicates");
    if (!standaloneRoot) {
      standaloneRoot = document.createElement("div");
      standaloneRoot.className = "cl-r31-standalone-root";
      document.body.appendChild(standaloneRoot);
      standaloneRoot.addEventListener("click", function (event) {
        if (event.target.closest("[data-cl-r31-refresh-duplicates]")) {
          standaloneRoot.__clR31Loading = false;
          loadDuplicateData();
        }
      });
    }
    if (!standaloneRoot.childElementCount) loadDuplicateData();
  }

  function routeClasses() {
    Array.prototype.slice.call(document.body.classList).forEach(function (name) {
      if (name.indexOf(ROUTE_PREFIX) === 0) document.body.classList.remove(name);
    });
    document.body.classList.add(ROUTE_PREFIX + routeName());
  }

  function apply() {
    if (!document.body) return;
    document.body.classList.add(BODY_CLASS);
    routeClasses();
    installFocusGuard();
    strengthenInputs(document);
    enhanceToolbars();
    markHomeDuplicates();
    markLedgerDuplicates();
    simplifyFeaturePages();
    renderStandaloneRoutes();
  }

  function schedule() {
    if (schedule.pending) return;
    schedule.pending = true;
    schedule.timer = window.setTimeout(function () {
      schedule.pending = false;
      apply();
    }, 80);
  }

  schedule();

  document.addEventListener("compositionstart", function () { composing = true; }, true);
  document.addEventListener("compositionend", function (event) {
    composing = false;
    if (isEditable(event.target)) rememberInput(event.target);
    window.setTimeout(restoreActiveInput, 30);
  }, true);
  document.addEventListener("focusin", function (event) {
    if (!isEditable(event.target)) return;
    event.target.classList.add("cl-r31-input-active");
    rememberInput(event.target);
    var target = event.target;
    var key = inputKey(target);
    window.setTimeout(function () {
      if (document.activeElement === target) restoreSelection(target, inputMemory[key]);
    }, 140);
  }, true);
  document.addEventListener("focusout", function (event) {
    if (isEditable(event.target)) event.target.classList.remove("cl-r31-input-active");
  }, true);
  document.addEventListener("input", function (event) {
    if (!isEditable(event.target)) return;
    typing = true;
    rememberInput(event.target);
    var target = event.target;
    var key = inputKey(target);
    window.clearTimeout(document.__clR31TypingTimer);
    document.__clR31TypingTimer = window.setTimeout(function () { typing = false; }, 300);
    window.setTimeout(function () {
      if (document.activeElement === target && !composing) restoreSelection(target, inputMemory[key]);
    }, 120);
  }, true);
  document.addEventListener("click", function (event) {
    var duplicateLink = event.target.closest('a[href="/duplicates"], button[data-cl-r31-duplicates]');
    if (duplicateLink) {
      event.preventDefault();
      navigate("/duplicates");
      schedule();
      return;
    }
    var link = event.target.closest("[data-cl-r31-nav]");
    if (!link) return;
    event.preventDefault();
    navigate(link.getAttribute("data-cl-r31-nav"));
    schedule();
  }, true);

  ["pushState", "replaceState"].forEach(function (method) {
    if (history["__clR31_" + method]) return;
    history["__clR31_" + method] = true;
    var original = history[method];
    history[method] = function () {
      var result = original.apply(this, arguments);
      schedule();
      return result;
    };
  });

  window.addEventListener("popstate", schedule);
  window.addEventListener("cl-round-route-change", schedule);
  try {
    new MutationObserver(function () {
      schedule();
      if (lastInput) {
        var snapshot = inputMemory[lastInput.key];
        var active = document.activeElement;
        var recentlyTyped = snapshot && Date.now() - snapshot.time < 1200;
        var lostToPage = recentlyTyped && (!active || active === document.body || !isEditable(active));
        if (!lastInput.node || !lastInput.node.isConnected || (typing && lostToPage)) {
          window.setTimeout(restoreActiveInput, 35);
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  } catch (error) {
    window.setInterval(schedule, 1600);
  }

  schedule();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule, { once: true });
  }
  window.setTimeout(schedule, 240);
  window.setTimeout(schedule, 900);
  window.setInterval(schedule, 1600);
})();
