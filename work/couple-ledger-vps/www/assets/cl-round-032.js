(function () {
  "use strict";

  var BODY_CLASS = "cl-r32-density";
  var ROUTE_PREFIX = "cl-r32-route-";
  var COLLAPSED = "cl-r32-collapsed";
  var ENHANCED = "data-cl-r32-enhanced";
  var composing = false;

  function routeName() {
    var path = location.pathname === "/" ? "/home" : location.pathname;
    return path.replace(/^\//, "").replace(/[^a-z0-9-]/gi, "-") || "home";
  }

  function routePath() {
    return location.pathname === "/" ? "/home" : location.pathname;
  }

  function textOf(node) {
    return ((node && node.textContent) || "").replace(/\s+/g, " ").trim();
  }

  function isEditable(node) {
    if (!node || !node.matches) return false;
    return node.matches("input, textarea, select, [contenteditable='true']");
  }

  function isQuickLedgerInput(node) {
    return !!node && node.matches && node.matches("[data-cl-r12-input]");
  }

  function keepCaretAtEnd(input) {
    if (!isQuickLedgerInput(input) || composing) return;
    window.setTimeout(function () {
      try {
        var end = input.value.length;
        input.setSelectionRange(end, end);
      } catch (_) {}
    }, 0);
  }

  function installQuickCaretGuard() {
    if (document.__clR32QuickCaretGuard) return;
    document.__clR32QuickCaretGuard = true;
    document.addEventListener("compositionstart", function (event) {
      if (isQuickLedgerInput(event.target)) composing = true;
    }, true);
    document.addEventListener("compositionend", function (event) {
      if (isQuickLedgerInput(event.target)) {
        composing = false;
        keepCaretAtEnd(event.target);
      }
    }, true);
    document.addEventListener("focusin", function (event) { keepCaretAtEnd(event.target); }, true);
    document.addEventListener("click", function (event) { keepCaretAtEnd(event.target); }, true);
    document.addEventListener("keydown", function (event) {
      if (event.key && event.key.length === 1) keepCaretAtEnd(event.target);
    }, true);
    document.addEventListener("input", function (event) { keepCaretAtEnd(event.target); }, true);
  }

  function setRouteClasses() {
    Array.prototype.slice.call(document.body.classList).forEach(function (name) {
      if (name.indexOf(ROUTE_PREFIX) === 0) document.body.classList.remove(name);
    });
    document.body.classList.add(ROUTE_PREFIX + routeName());
  }

  function storageKey(label) {
    return "cl_r32_open_" + routeName() + "_" + label.replace(/\s+/g, "_");
  }

  function candidateNodes() {
    return Array.prototype.slice.call(document.querySelectorAll([
      ".card",
      ".panel",
      "section",
      "article",
      ".ai-card",
      ".cl-money-ai",
      ".cl-ledger-scan",
      ".cl-route-compass",
      ".recent-wrap",
      ".quick",
      ".report",
      ".settle",
      ".goals-home",
      ".mini-stats-wrap",
      ".tiles",
      "[class*='card']",
      "[class*='panel']"
    ].join(","))).filter(function (node) {
      if (!node || node.nodeType !== 1) return false;
      if (node.closest(".cl-r30-bottom-nav, .bottom-nav, .nav, .cl-r32-toggle")) return false;
      if (node.matches("main, body, #app, .app-shell, .page, .with-nav")) return false;
      return textOf(node).length > 0;
    }).sort(function (a, b) {
      return textOf(a).length - textOf(b).length;
    });
  }

  function addToggleFor(node, label, detail) {
    if (!node || node.getAttribute(ENHANCED) === "1") return false;
    if (node.closest(".cl-r30-bottom-nav, .bottom-nav, .nav")) return false;
    node.setAttribute(ENHANCED, "1");
    node.classList.add("cl-r32-collapsible");

    var key = storageKey(label);
    var isOpen = localStorage.getItem(key) === "1";
    if (!isOpen) node.classList.add(COLLAPSED);

    var button = document.createElement("button");
    button.type = "button";
    button.className = "cl-r32-toggle";
    button.setAttribute("aria-expanded", String(isOpen));
    button.innerHTML = "<span>" + label + "</span>" + (detail ? "<small>" + detail + "</small>" : "");
    button.addEventListener("click", function () {
      var open = node.classList.toggle(COLLAPSED) === false;
      button.setAttribute("aria-expanded", String(open));
      localStorage.setItem(key, open ? "1" : "0");
    });

    node.parentNode.insertBefore(button, node);
    return true;
  }

  function collapseByText(parts, label, detail) {
    var found = candidateNodes().find(function (node) {
      var text = textOf(node);
      return parts.every(function (part) { return text.indexOf(part) !== -1; });
    });
    return addToggleFor(found, label, detail);
  }

  function collapseAfterHeading(headingText, label, detail) {
    var headings = Array.prototype.slice.call(document.querySelectorAll(".menu-section, .tiles-label, p, h2, h3"));
    var heading = headings.find(function (node) {
      return textOf(node) === headingText || textOf(node).indexOf(headingText) === 0;
    });
    if (!heading) return false;
    var target = heading.nextElementSibling;
    while (target && (textOf(target).length === 0 || target.matches("script, style"))) {
      target = target.nextElementSibling;
    }
    if (!target) return false;
    heading.classList.add("cl-r32-heading-muted");
    return addToggleFor(target, label, detail);
  }

  function setActionClass(button, className) {
    if (!button || button.classList.contains(className)) return;
    button.classList.add(className);
  }

  function addBodyToggle(className, label, detail, afterNode) {
    var attr = "data-" + className;
    if (document.querySelector("[" + attr + "]")) return;
    var key = "cl_r32_" + className;
    var open = localStorage.getItem(key) === "1";
    document.body.classList.toggle(className, open);

    var button = document.createElement("button");
    button.type = "button";
    button.className = "cl-r32-toggle cl-r32-line-toggle";
    button.setAttribute(attr, "1");
    button.setAttribute("aria-expanded", String(open));
    button.innerHTML = "<span>" + label + "</span>" + (detail ? "<small>" + detail + "</small>" : "");
    button.addEventListener("click", function () {
      var next = !document.body.classList.contains(className);
      document.body.classList.toggle(className, next);
      button.setAttribute("aria-expanded", String(next));
      localStorage.setItem(key, next ? "1" : "0");
    });

    var anchor = afterNode || document.querySelector(".page, main, #app");
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(button, anchor.nextSibling);
  }

  function compactHome() {
    addToggleFor(document.querySelector(".mini-stats-wrap"), "展开本月概览", "本月笔数、日均和储蓄率");
    addToggleFor(document.querySelector(".quick"), "展开快捷入口", "账户、预算、统计和聊天");
    collapseByText(["本月概览", "账户", "预算", "统计"], "展开本月概览", "账户、预算、周期等入口");
    collapseByText(["最近账单", "点击账单查看详情"], "展开最近账单", "需要查明细时再打开");
    collapseByText(["本月洞察", "详情"], "展开本月洞察", "省钱建议与复盘");
    collapseByText(["情侣分摊", "应收"], "展开情侣分摊", "AA 结算说明");
  }

  function compactLedger() {
    collapseByText(["账本罗盘", "记一笔", "看统计"], "展开账本工具", "记一笔、查账本、看统计");
    collapseByText(["账本扫描", "展开筛选", "复制摘要"], "展开账本扫描", "大额、筛选和摘要");

    Array.prototype.forEach.call(document.querySelectorAll("button"), function (button) {
      var text = textOf(button);
      var parent = button.closest(".tx, article, .card, .panel, li, .list-item");
      var area = textOf(parent || button.parentNode);
      if (text === "复记" || (area.match(/餐饮|交通|工资|购物|转账/) && area.match(/微信|支付宝|储蓄卡|收入|大额/))) {
        setActionClass(button, "cl-r32-ledger-row-action");
      }
    });

    var listAnchor = Array.prototype.slice.call(document.querySelectorAll(".card, .panel, section, article")).find(function (node) {
      var text = textOf(node);
      return text.indexOf("今日支出") !== -1 || text.indexOf("5 笔") !== -1;
    });
    addBodyToggle("cl-r32-ledger-row-actions-open", "显示账单行操作", "复记和编辑按钮默认收起", listAnchor);
  }

  function compactStats() {
    collapseByText(["统计罗盘", "看账本", "看预算"], "展开统计工具", "返回账本、预算和记账");
    collapseByText(["钱小参", "一句话指令", "生成计划"], "展开钱小参", "AI 计划需要时再打开");
    collapseByText(["情侣分摊结算", "待结算"], "展开分摊结算", "本月双方应收应付");
    Array.prototype.forEach.call(document.querySelectorAll("button"), function (button) {
      var text = textOf(button);
      if (["复制摘要", "保存", "看明细"].indexOf(text) !== -1) {
        setActionClass(button, "cl-r32-secondary-action");
      }
      if (/^(周|月|季|年)$/.test(text)) {
        setActionClass(button, "cl-r32-stats-period-action");
      }
    });
    var periodAnchor = Array.prototype.slice.call(document.querySelectorAll("button")).find(function (button) {
      return /^(周|月|季|年)$/.test(textOf(button));
    });
    addBodyToggle("cl-r32-stats-period-open", "显示统计周期切换", "周/月/季/年默认收起", periodAnchor && periodAnchor.parentElement);
  }

  function compactMine() {
    collapseByText(["我的罗盘", "账户", "分类", "导出备份"], "展开我的罗盘", "账户、分类和备份入口");
    collapseByText(["数据备份台", "导出 CSV", "导入账单", "复制清单"], "展开数据备份", "导出、导入和清单复制");
    collapseByText(["CSV / XLSX", "预览识别"], "展开导入识别", "CSV 与微信/支付宝账单");
    collapseByText(["快捷入口", "记一笔", "统计", "预算", "周期"], "展开快捷入口", "常用入口已在底部导航");
    collapseAfterHeading("情侣互动", "展开情侣互动", "空间、养成、存钱和聊天");
    collapseAfterHeading("提醒偏好", "展开提醒偏好", "预算、聊天、周期和纪念日提醒");
    collapseAfterHeading("数据与设置", "展开数据与设置", "导入导出、主题和账号操作");
    collapseByText(["预算超支提醒", "聊天未读角标", "浏览器系统通知"], "展开提醒开关", "所有提醒开关集中管理");
    collapseByText(["切换导入/导出范围", "导入 CSV", "导出 CSV 数据"], "展开导入导出", "范围、导入、导出和后台");
    collapseByText(["主题强调色", "深色模式", "退出登录", "注销账号"], "展开外观和账号", "主题、登录和账号安全");
    collapseByText(["建议定期备份数据", "立即导出"], "展开备份提醒", "公测期数据保护");
    collapseByText(["我的设置", "个人资料"], "展开设置说明", "说明文字和反馈入口");
  }

  function compactBudgets() {
    collapseByText(["钱小参", "生成计划", "应用草案"], "展开预算 AI 计划", "一句话生成预算草案");
    collapseByText(["分类预算", "交通", "餐饮", "购物", "居住"], "展开分类预算", "查看和调整每个分类");
    collapseByText(["预算建议", "去记一笔", "查看账本"], "展开预算建议", "下月可执行上限");

    Array.prototype.forEach.call(document.querySelectorAll("button"), function (button) {
      var parent = button.closest(".card, .panel, article, li, section");
      var area = textOf(parent);
      if (area.match(/交通|餐饮|购物|居住/) && area.match(/已用|剩余|超支/) && textOf(button).length <= 4) {
        setActionClass(button, "cl-r32-budget-row-action");
      }
    });
    addBodyToggle("cl-r32-budget-actions-open", "显示分类预算操作", "复制、编辑、删除默认收起", document.querySelector(".cl-r32-toggle"));
  }

  function compactAccounts() {
    collapseByText(["默认记账账户", "用默认记一笔"], "展开默认账户", "设置新账单默认账户");
    collapseByText(["最近转账", "转给TA"], "展开最近转账", "查看账户间移动记录");
    Array.prototype.forEach.call(document.querySelectorAll("button"), function (button) {
      var parent = button.closest(".card, .panel, article, li, section");
      var area = textOf(parent);
      if (area.indexOf("净资产合计") !== -1 && textOf(button).length <= 4) {
        setActionClass(button, "cl-r32-account-row-action");
      }
    });
    addBodyToggle("cl-r32-account-actions-open", "显示账户操作", "复制、隐藏、新建和转账", document.querySelector(".cl-r32-toggle"));
  }

  function compactCouple() {
    collapseByText(["情侣空间罗盘", "复制邀请码", "记一笔"], "展开空间工具", "邀请码、账本和记账入口");
    collapseByText(["纪念日", "添加", "删除"], "展开纪念日", "生日、纪念日和倒计时");
    collapseByText(["我们的纪念日", "她的生日"], "展开纪念日列表", "生日和倒计时详情");
    collapseByText(["共同目标", "打卡", "删除"], "展开共同目标", "旅行基金和打卡目标");
    collapseByText(["旅行基金", "每周运动打卡"], "展开目标列表", "旅行基金和每周打卡");
    collapseByText(["共享清单", "添加", "复制清单"], "展开共享清单", "心愿单和便签");
    collapseByText(["心愿单", "便签", "想一起做"], "展开清单明细", "心愿、便签和排序");
    Array.prototype.forEach.call(document.querySelectorAll("button"), function (button) {
      var parent = button.closest(".card, .panel, article, li, section");
      var area = textOf(parent);
      if (area.match(/纪念日|共同目标|共享清单/) && textOf(button).match(/删|删除|打卡/)) {
        setActionClass(button, "cl-r32-couple-row-action");
      }
      if (["养成", "存钱", "聊天", "分享"].indexOf(textOf(button)) !== -1) {
        setActionClass(button, "cl-r32-couple-row-action");
      }
    });
    addBodyToggle("cl-r32-couple-actions-open", "显示情侣空间操作", "快捷、删除和打卡默认收起", document.querySelector(".cl-r32-toggle"));
  }

  function compactRecurring() {
    collapseByText(["周期账单罗盘", "添加周期", "看账本"], "展开周期工具", "添加、预算和账本入口");
    collapseByText(["固定收支", "把重复发生的账单"], "展开固定收支说明", "示例和添加入口");
  }

  function compactJelly() {
    collapseByText(["Jelly AI罗盘", "看账本", "看统计"], "展开 Jelly 工具", "账本、统计和记账入口");
  }

  function apply() {
    if (!document.body) return;
    installQuickCaretGuard();
    if (isEditable(document.activeElement)) return;
    document.body.classList.add(BODY_CLASS);
    setRouteClasses();

    var path = routePath();
    if (path === "/home") compactHome();
    if (path === "/ledger") compactLedger();
    if (path === "/stats") compactStats();
    if (path === "/mine") compactMine();
    if (path === "/budgets") compactBudgets();
    if (path === "/accounts") compactAccounts();
    if (path === "/couple") compactCouple();
    if (path === "/recurring") compactRecurring();
    if (path === "/jelly") compactJelly();
  }

  function schedule() {
    if (schedule.pending) return;
    schedule.pending = true;
    window.setTimeout(function () {
      schedule.pending = false;
      apply();
    }, 120);
  }

  schedule();
  document.addEventListener("click", function () { window.setTimeout(schedule, 80); }, true);
  window.addEventListener("popstate", schedule);
  ["pushState", "replaceState"].forEach(function (method) {
    var original = history[method];
    if (!original || history["__clR32_" + method]) return;
    history["__clR32_" + method] = true;
    history[method] = function () {
      var result = original.apply(this, arguments);
      schedule();
      return result;
    };
  });
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
})();
