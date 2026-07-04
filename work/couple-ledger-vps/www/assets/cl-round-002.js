(function () {
  "use strict";

  var AUTH_KEY = "cl_auth";
  var ROUND_ATTR = "data-cl-round-002";
  var publicPaths = ["/login", "/register", "/reset-password", "/legal"];
  var routeTimer = null;

  function icon(name) {
    var paths = {
      plus: '<path d="M12 5v14M5 12h14"/>',
      wallet: '<path d="M3 7a2 2 0 0 1 2-2h14v4"/><path d="M3 7v10a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2z"/><circle cx="16" cy="14" r="1"/>',
      chart: '<path d="M4 19V9"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M22 19H2"/>',
      refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
      calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>',
      heart: '<path d="M12 20C5 14 3 11 3 8.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 9 2.5C21 11 19 14 12 20z"/>',
      info: '<circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 8h.01"/>',
      spark: '<path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/>'
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.spark) + "</svg>";
  }

  function isAuthed() {
    try {
      return !!JSON.parse(localStorage.getItem(AUTH_KEY) || "{}").accessToken;
    } catch (error) {
      return false;
    }
  }

  function isPublicPath() {
    return publicPaths.some(function (path) {
      return location.pathname === path || location.pathname.indexOf(path + "/") === 0;
    });
  }

  function button(label, iconName, action, primary) {
    var el = document.createElement("button");
    el.type = "button";
    el.className = "cl-empty-action" + (primary ? " primary" : "");
    el.innerHTML = icon(iconName) + "<span>" + label + "</span>";
    el.addEventListener("click", action);
    return el;
  }

  function panel(options) {
    var wrap = document.createElement("section");
    wrap.className = "cl-empty-boost" + (options.compact ? " is-compact" : "");
    wrap.setAttribute(ROUND_ATTR, options.id);
    wrap.innerHTML = [
      '<span class="cl-empty-kicker">' + icon(options.kickerIcon || "spark") + "<span>" + options.kicker + "</span></span>",
      '<h3 class="cl-empty-title">' + options.title + "</h3>",
      '<p class="cl-empty-copy">' + options.copy + "</p>"
    ].join("");
    if (options.minis) {
      var grid = document.createElement("div");
      grid.className = "cl-empty-mini-grid";
      options.minis.forEach(function (item) {
        var mini = document.createElement("div");
        mini.className = "cl-empty-mini";
        mini.innerHTML = "<strong>" + item.title + "</strong><span>" + item.copy + "</span>";
        grid.appendChild(mini);
      });
      wrap.appendChild(grid);
    }
    if (options.actions) {
      var actions = document.createElement("div");
      actions.className = "cl-empty-actions";
      options.actions.forEach(function (item) {
        actions.appendChild(button(item.label, item.icon, item.onClick, item.primary));
      });
      wrap.appendChild(actions);
    }
    if (options.tip) {
      var tip = document.createElement("div");
      tip.className = "cl-empty-tip";
      tip.innerHTML = icon("info") + "<span>" + options.tip + "</span>";
      wrap.appendChild(tip);
    }
    return wrap;
  }

  function navigate(path) {
    if (location.pathname === path) {
      window.dispatchEvent(new Event("cl-round-route-change"));
      window.dispatchEvent(new Event("cl-round-002-route-change"));
      return;
    }
    location.href = path;
  }

  function openTransaction() {
    localStorage.setItem("cl_round_001_pending_action", "open-transaction");
    if (location.pathname !== "/home" && location.pathname !== "/ledger") {
      navigate("/ledger");
      return;
    }
    window.dispatchEvent(new CustomEvent("cl:open-tx-editor"));
  }

  function focusLedgerSearch() {
    localStorage.setItem("cl_round_001_pending_action", "focus-ledger-search");
    if (location.pathname !== "/ledger") {
      navigate("/ledger");
      return;
    }
    var input = Array.prototype.find.call(document.querySelectorAll(".search-input"), function (el) {
      var rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    if (input) input.focus();
  }

  function textIncludes(value) {
    return document.body && document.body.innerText.indexOf(value) !== -1;
  }

  function findByText(selector, needles) {
    var nodes = Array.prototype.slice.call(document.querySelectorAll(selector));
    return nodes.find(function (node) {
      var text = node.innerText || node.textContent || "";
      return needles.some(function (needle) {
        return text.indexOf(needle) !== -1;
      });
    });
  }

  function findTextElement(needles) {
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      var text = node.nodeValue || "";
      if (!needles.some(function (needle) { return text.indexOf(needle) !== -1; })) continue;
      var el = node.parentElement;
      if (!el || el.closest(".cl-empty-boost")) continue;
      var rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      while (el.parentElement && !["BODY", "HTML"].includes(el.parentElement.tagName)) {
        var parent = el.parentElement;
        if (parent.id === "app" || parent.classList.contains("page") || parent.classList.contains("app-shell")) break;
        var parentText = parent.innerText || parent.textContent || "";
        var parentRect = parent.getBoundingClientRect();
        if (parentText.length > 180 || parentRect.height > 260) break;
        el = parent;
      }
      return el;
    }
    return null;
  }

  function mountNear(target, id, node) {
    if (!target || document.querySelector("[" + ROUND_ATTR + '="' + id + '"]')) return;
    target.insertAdjacentElement("afterend", node);
  }

  function enhanceLedger() {
    var emptyTarget = findTextElement(["本月还没有账单", "没有找到匹配的账单"]) || findByText(".card, .stack, div", ["本月还没有账单", "没有找到匹配的账单"]);
    if (textIncludes("没有找到匹配的账单")) {
      mountFilterHelper();
      mountNear(emptyTarget, "ledger-no-results", panel({
        id: "ledger-no-results",
        compact: true,
        kicker: "筛选无结果",
        kickerIcon: "search",
        title: "换个条件，可能就找到了",
        copy: "清空关键词或回到账本总览，再按日期、账户或金额继续缩小范围。",
        actions: [
          { label: "清空搜索", icon: "search", primary: true, onClick: clearLedgerFilters },
          { label: "回到账本", icon: "wallet", onClick: function () { navigate("/ledger"); } }
        ]
      }));
      return;
    }
    if (textIncludes("本月还没有账单")) {
      mountNear(emptyTarget, "ledger-empty", panel({
        id: "ledger-empty",
        kicker: "第一笔账",
        kickerIcon: "wallet",
        title: "从今天最确定的一笔开始",
        copy: "先记一笔支出或收入，预算、统计和月度节奏就会自动变得有用。",
        minis: [
          { title: "30秒", copy: "金额 + 分类 + 日期" },
          { title: "可补记", copy: "先粗记，之后再改" },
          { title: "会联动", copy: "统计和预算同步更新" }
        ],
        actions: [
          { label: "记第一笔", icon: "plus", primary: true, onClick: openTransaction },
          { label: "设置预算", icon: "chart", onClick: function () { navigate("/budgets"); } },
          { label: "固定账单", icon: "calendar", onClick: function () { navigate("/recurring"); } }
        ],
        tip: "想补以前的账，可以先切到对应月份，再点「记第一笔」。"
      }));
    }
  }

  function mountFilterHelper() {
    if (document.querySelector(".cl-empty-filter-bar")) return;
    var search = document.querySelector(".search-wrap");
    if (!search) return;
    var bar = document.createElement("div");
    bar.className = "cl-empty-filter-bar";
    bar.innerHTML = "<span>当前筛选没有结果，可以一键清空后重新查。</span><button type=\"button\">清空</button>";
    bar.querySelector("button").addEventListener("click", clearLedgerFilters);
    search.insertAdjacentElement("afterend", bar);
    updateFilterHelper();
  }

  function updateFilterHelper() {
    var bar = document.querySelector(".cl-empty-filter-bar");
    if (!bar) return;
    var input = document.querySelector(".search-input");
    var active = !!(input && input.value.trim()) || textIncludes("筛选中");
    bar.classList.toggle("is-visible", active && textIncludes("没有找到匹配的账单"));
  }

  function clearLedgerFilters() {
    var input = document.querySelector(".search-input");
    if (input) {
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    navigate("/ledger");
  }

  function enhanceStats() {
    if (!textIncludes("这个周期还没有数据")) return;
    var target = findTextElement(["这个周期还没有数据"]) || findByText(".card, .stack, div", ["这个周期还没有数据"]);
    mountNear(target, "stats-empty", panel({
      id: "stats-empty",
      kicker: "统计准备中",
      kickerIcon: "chart",
      title: "统计页需要几笔真实账单",
      copy: "记下收入、支出和分类后，这里会显示趋势、结构和预算压力。",
      minis: [
        { title: "支出结构", copy: "看钱花在哪里" },
        { title: "周期趋势", copy: "看本周和本月" },
        { title: "预算压力", copy: "看是否超速" }
      ],
      actions: [
        { label: "去记一笔", icon: "plus", primary: true, onClick: openTransaction },
        { label: "看账本", icon: "wallet", onClick: function () { navigate("/ledger"); } }
      ]
    }));
  }

  function enhanceRecurring() {
    if (!textIncludes("还没有周期账单")) return;
    var target = findTextElement(["还没有周期账单"]) || findByText(".card, .stack, div", ["还没有周期账单"]);
    mountNear(target, "recurring-empty", panel({
      id: "recurring-empty",
      kicker: "固定收支",
      kickerIcon: "calendar",
      title: "把重复发生的账单交给自动入账",
      copy: "房租、会员、工资这类固定项目建一次，以后每月少漏记一笔。",
      minis: [
        { title: "房租", copy: "每月固定支出" },
        { title: "会员", copy: "订阅续费提醒" },
        { title: "工资", copy: "固定收入入账" }
      ],
      actions: [
        { label: "添加周期账单", icon: "plus", primary: true, onClick: clickFirstAddButton },
        { label: "先记普通账", icon: "wallet", onClick: openTransaction }
      ]
    }));
  }

  function clickFirstAddButton() {
    var buttons = Array.prototype.slice.call(document.querySelectorAll("button"));
    var add = buttons.find(function (item) {
      var text = item.textContent.trim();
      return text === "添加" || text.indexOf("+ 房租") !== -1 || text.indexOf("+ 视频会员") !== -1 || text.indexOf("+ 工资") !== -1;
    });
    if (add) add.click();
  }

  function enhanceBudgetRescue() {
    if (location.pathname !== "/budgets") return;
    var app = document.querySelector("#app");
    var visibleText = document.body.innerText.replace(/\s+/g, " ").trim();
    var onlyShell = visibleText.length < 90 || visibleText === "刷新 记一笔 直接打开新增账单 查账本 跳到账本并聚焦搜索 预算 查看本月预算余量 统计 查看收支趋势 周期账单 处理固定收支";
    if (!onlyShell && !textIncludes("加载失败") && !textIncludes("暂无预算")) return;
    if (document.querySelector("[" + ROUND_ATTR + '="budget-rescue"]')) return;
    var holder = document.createElement("div");
    holder.className = "cl-budget-rescue";
    holder.appendChild(panel({
      id: "budget-rescue",
      kicker: "预算起步",
      kickerIcon: "chart",
      title: "先给本月一个可执行的上限",
      copy: "预算页暂时没有可展示的数据。可以先记一笔，再回到这里设置总预算和分类限额。",
      minis: [
        { title: "总预算", copy: "控制本月花费" },
        { title: "分类限额", copy: "餐饮交通分开看" },
        { title: "剩余额度", copy: "每天知道还剩多少" }
      ],
      actions: [
        { label: "去记一笔", icon: "plus", primary: true, onClick: openTransaction },
        { label: "查看账本", icon: "wallet", onClick: function () { navigate("/ledger"); } },
        { label: "刷新预算", icon: "refresh", onClick: function () { location.reload(); } }
      ]
    }));
    app.appendChild(holder);
  }

  function enhanceCouple() {
    if (location.pathname !== "/couple") return;
    if (!textIncludes("复制邀请码") || document.querySelector("[" + ROUND_ATTR + '="couple-benefits"]')) return;
    var target = findByText(".card, .stack, div", ["复制邀请码", "绑定"]);
    if (!target) return;
    var wrap = panel({
      id: "couple-benefits",
      compact: true,
      kicker: "绑定后可用",
      kickerIcon: "heart",
      title: "情侣账本会把两个人的日常合在一起看",
      copy: "绑定后再使用情侣范围，账本、统计、聊天和提醒会更完整。",
      actions: [
        { label: "复制邀请码", icon: "heart", primary: true, onClick: clickCopyInvite },
        { label: "先记个人账", icon: "wallet", onClick: openTransaction }
      ]
    });
    var benefits = document.createElement("div");
    benefits.className = "cl-couple-benefits";
    [
      ["1", "共享账本", "两个人的收入支出可按个人或情侣范围查看。"],
      ["2", "同步提醒", "聊天、预算和固定账单能围绕同一份数据工作。"],
      ["3", "共同复盘", "统计页会更容易回答本月钱花在哪里。"]
    ].forEach(function (item) {
      var row = document.createElement("div");
      row.className = "cl-couple-benefit";
      row.innerHTML = "<i>" + item[0] + "</i><div><strong>" + item[1] + "</strong><span>" + item[2] + "</span></div>";
      benefits.appendChild(row);
    });
    wrap.appendChild(benefits);
    target.insertAdjacentElement("afterend", wrap);
  }

  function clickCopyInvite() {
    var btn = Array.prototype.find.call(document.querySelectorAll("button"), function (item) {
      return item.textContent.trim().indexOf("复制邀请码") !== -1;
    });
    if (btn) btn.click();
  }

  function enhanceCurrentRoute() {
    if (!isAuthed() || isPublicPath()) return;
    enhanceLedger();
    enhanceStats();
    enhanceRecurring();
    enhanceBudgetRescue();
    enhanceCouple();
    updateFilterHelper();
  }

  function scheduleEnhance(delay) {
    window.clearTimeout(routeTimer);
    routeTimer = window.setTimeout(enhanceCurrentRoute, delay || 120);
  }

  function installRouteObserver() {
    if (window.__clRound002RouteObserver) return;
    window.__clRound002RouteObserver = true;
    ["pushState", "replaceState"].forEach(function (method) {
      var original = history[method];
      history[method] = function () {
        var result = original.apply(this, arguments);
        window.dispatchEvent(new Event("cl-round-002-route-change"));
        return result;
      };
    });
    window.addEventListener("popstate", function () {
      window.dispatchEvent(new Event("cl-round-002-route-change"));
    });
  }

  function boot() {
    installRouteObserver();
    scheduleEnhance(300);
    window.addEventListener("cl-round-route-change", function () { scheduleEnhance(180); });
    window.addEventListener("cl-round-002-route-change", function () { scheduleEnhance(180); });
    document.addEventListener("input", function (event) {
      if (event.target && event.target.classList && event.target.classList.contains("search-input")) {
        window.setTimeout(updateFilterHelper, 80);
      }
    });
    var observer = new MutationObserver(function () {
      scheduleEnhance(160);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
