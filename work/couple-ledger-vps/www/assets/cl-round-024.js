(function () {
  "use strict";

  var BODY_CLASS = "cl-r24-polish";
  var running = false;
  var lastPath = "";

  var titles = {
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
    "/feedback": "意见反馈",
    "/login": "登录",
    "/register": "注册",
    "/reset-password": "重置密码",
    "/legal": "服务条款"
  };

  function currentTitle() {
    return (titles[location.pathname] || "情侣记账") + " · 情侣记账";
  }

  function ensureMeta(name, content) {
    var node = document.querySelector('meta[name="' + name + '"]');
    if (!node) {
      node = document.createElement("meta");
      node.setAttribute("name", name);
      document.head.appendChild(node);
    }
    if (node.getAttribute("content") !== content) node.setAttribute("content", content);
  }

  function fixDocumentCopy() {
    if (document.documentElement.lang !== "zh-CN") document.documentElement.lang = "zh-CN";
    var title = currentTitle();
    if (document.title !== title) document.title = title;
    ensureMeta("description", "情侣记账 · 精致记账，温柔陪伴每一笔收支");
    ensureMeta("apple-mobile-web-app-title", "情侣记账");
  }

  function textOf(node) {
    return String(node && node.textContent ? node.textContent : "").replace(/\s+/g, " ").trim();
  }

  function hideInternalRoundLabels() {
    if (!document.body) return;
    Array.prototype.forEach.call(document.body.querySelectorAll("*"), function (node) {
      if (!node || node.classList.contains("cl-r24-internal-label")) return;
      if (/^Round\s+\d{3}$/i.test(textOf(node))) {
        node.classList.add("cl-r24-internal-label");
        node.setAttribute("aria-hidden", "true");
      }
    });
  }

  function disableGlobalQuickDock() {
    Array.prototype.forEach.call(document.querySelectorAll(".cl-quick-dock"), function (dock) {
      if (!dock.hidden) dock.hidden = true;
      if (dock.classList.contains("is-open")) dock.classList.remove("is-open");
      if (dock.getAttribute("aria-hidden") !== "true") dock.setAttribute("aria-hidden", "true");
      Array.prototype.forEach.call(dock.querySelectorAll("button, a, input, select, textarea"), function (control) {
        if (control.tabIndex !== -1) control.tabIndex = -1;
      });
      var main = dock.querySelector(".cl-quick-main");
      if (main && main.getAttribute("aria-expanded") !== "false") main.setAttribute("aria-expanded", "false");
    });
  }

  function labelEmptyControls() {
    Array.prototype.forEach.call(document.querySelectorAll("button"), function (button) {
      if (textOf(button) || button.getAttribute("aria-label") || button.title) return;
      button.setAttribute("aria-label", "操作");
    });

    Array.prototype.forEach.call(document.querySelectorAll("input, textarea, select"), function (field) {
      if (field.getAttribute("aria-label") || field.getAttribute("aria-labelledby") || field.title || field.placeholder) return;
      var type = (field.getAttribute("type") || field.tagName || "").toLowerCase();
      var label = "输入内容";
      if (type === "month") label = "选择月份";
      else if (type === "date") label = "选择日期";
      else if (type === "file") label = "选择文件";
      else if (field.tagName === "SELECT") label = "选择选项";
      field.setAttribute("aria-label", label);
    });
  }

  function apply() {
    running = false;
    if (!document.body) return;
    document.body.classList.add(BODY_CLASS);
    fixDocumentCopy();
    hideInternalRoundLabels();
    disableGlobalQuickDock();
    labelEmptyControls();
    lastPath = location.pathname;
  }

  function schedule() {
    if (running) return;
    running = true;
    window.requestAnimationFrame(apply);
  }

  function installRouteWatcher() {
    if (window.__clRound024RouteWatcher) return;
    window.__clRound024RouteWatcher = true;
    ["pushState", "replaceState"].forEach(function (method) {
      var original = history[method];
      history[method] = function () {
        var result = original.apply(this, arguments);
        window.setTimeout(schedule, 60);
        return result;
      };
    });
    window.addEventListener("popstate", schedule);
    window.addEventListener("cl-round-route-change", schedule);
    window.setInterval(function () {
      if (lastPath !== location.pathname) schedule();
    }, 500);
  }

  function boot() {
    installRouteWatcher();
    schedule();
    var observer = new MutationObserver(schedule);
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
