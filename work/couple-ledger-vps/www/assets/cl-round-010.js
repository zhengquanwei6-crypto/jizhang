(function () {
  "use strict";

  var ROUND_ATTR = "data-cl-round-010";
  var PLAN_KEY = "cl_round_010_last_plan";
  var publicPaths = ["/login", "/register", "/reset-password", "/legal"];
  var activePaths = ["/jelly", "/budgets", "/stats"];
  var timer = null;
  var historyPatched = false;
  var state = {
    message: "",
    month: "",
    plan: readJson(PLAN_KEY, null),
    loading: false,
    applying: false,
    error: "",
    notice: ""
  };

  function html(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char];
    });
  }

  function icon(name) {
    var paths = {
      sparkles: '<path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/><path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9z"/>',
      wand: '<path d="M15 4l5 5"/><path d="M14 5l-9 9a2 2 0 0 0 0 3l2 2a2 2 0 0 0 3 0l9-9"/><path d="M5 3v4"/><path d="M3 5h4"/><path d="M19 16v4"/><path d="M17 18h4"/>',
      check: '<path d="M5 12l5 5L20 7"/>',
      wallet: '<path d="M3 7a2 2 0 0 1 2-2h14v4"/><path d="M3 7v10a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2z"/><circle cx="16" cy="14" r="1"/>',
      target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3"/><path d="M12 19v3"/><path d="M2 12h3"/><path d="M19 12h3"/>',
      calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M3 11h18"/>',
      utensils: '<path d="M4 3v8"/><path d="M8 3v8"/><path d="M4 7h4"/><path d="M6 11v10"/><path d="M15 3v18"/><path d="M15 3c3 2 5 5 5 9h-5"/>',
      alert: '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>'
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.sparkles) + "</svg>";
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

  function isPublicPath() {
    return publicPaths.some(function (path) {
      return location.pathname === path || location.pathname.indexOf(path + "/") === 0;
    });
  }

  function isActivePath() {
    return activePaths.indexOf(location.pathname) >= 0;
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
      return token ? { "Content-Type": "application/json", Authorization: "Bearer " + token } : { "Content-Type": "application/json" };
    } catch (error) {
      return { "Content-Type": "application/json" };
    }
  }

  function currentScope() {
    return localStorage.getItem("cl_scope") || "personal";
  }

  function scopeLabel(scope) {
    return scope === "couple" ? "情侣账本" : "个人账本";
  }

  function currentMonth() {
    var now = new Date();
    return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
  }

  function money(value) {
    var num = Number(value || 0);
    return "¥" + num.toLocaleString("zh-CN", { maximumFractionDigits: num % 1 ? 2 : 0 });
  }

  function pageRoot() {
    return document.querySelector(".app-shell .page") || document.querySelector(".app-shell") || document.querySelector("#app") || document.body;
  }

  function headerAnchor(root) {
    if (!root) return null;
    var children = Array.prototype.slice.call(root.children || []);
    return children.find(function (node) {
      return node.tagName === "HEADER" || node.classList.contains("profile-hero");
    }) || null;
  }

  function panelAnchor() {
    var compass = document.querySelector('[data-cl-round-006="compass"]');
    if (compass && compass.parentNode) return compass;
    return headerAnchor(pageRoot());
  }

  function removePanel() {
    var node = document.querySelector("[" + ROUND_ATTR + '="panel"]');
    if (node) node.remove();
  }

  function panelNode(anchor) {
    var existing = document.querySelector("[" + ROUND_ATTR + '="panel"]');
    var node = existing || document.createElement("section");
    if (!existing) {
      node.className = "cl-money-ai";
      node.setAttribute(ROUND_ATTR, "panel");
    }
    if (anchor && anchor.parentNode && (node.parentNode !== anchor.parentNode || node.previousElementSibling !== anchor)) {
      anchor.parentNode.insertBefore(node, anchor.nextSibling);
    }
    return node;
  }

  function chips() {
    return [
      "本月预算5000，每月攒2000",
      "按固定账单安排下半月",
      "在预算内告诉我每天吃什么"
    ].map(function (text) {
      return '<button type="button" class="cl-r10-chip" data-cl-r10-chip="' + html(text) + '">' + html(text) + "</button>";
    }).join("");
  }

  function metric(label, value, tone) {
    return '<div class="cl-r10-metric ' + html(tone || "") + '"><span>' + html(label) + '</span><strong>' + html(value) + "</strong></div>";
  }

  function renderMetrics(plan) {
    if (!plan) return "";
    var context = plan.context || {};
    var budget = plan.drafts && plan.drafts.budget_total ? plan.drafts.budget_total.amount : 0;
    var saving = plan.drafts && plan.drafts.savings_plan ? plan.drafts.savings_plan.monthly_amount : 0;
    var daily = plan.spending_plan && plan.spending_plan[1] ? plan.spending_plan[1].note.match(/约 ([\d.]+) 元/) : null;
    return '<div class="cl-r10-metrics">' +
      metric("月限额", money(budget), "gold") +
      metric("每月攒", money(saving), "sage") +
      metric("固定账单", money(context.recurring_remaining_expense || context.recurring_expense), "blue") +
      metric("日均可花", daily ? "¥" + daily[1] : money(0), "ink") +
      "</div>";
  }

  function renderSpendingPlan(plan) {
    var list = (plan && plan.spending_plan) || [];
    if (!list.length) return "";
    return '<div class="cl-r10-block"><div class="cl-r10-block-title">' + icon("target") + '<span>消费计划</span></div><div class="cl-r10-lines">' +
      list.map(function (item) {
        return '<div class="cl-r10-line"><strong>' + html(item.title) + '</strong><span>' + html(money(item.amount)) + '</span><small>' + html(item.note) + "</small></div>";
      }).join("") + "</div></div>";
  }

  function renderMeals(plan) {
    var list = (plan && plan.meal_plan) || [];
    if (!list.length) return "";
    return '<div class="cl-r10-block"><div class="cl-r10-block-title">' + icon("utensils") + '<span>7 天吃饭建议</span></div><div class="cl-r10-meals">' +
      list.map(function (item) {
        return '<div class="cl-r10-meal"><strong>' + html(item.day) + '</strong><span>' + html(item.breakfast) + '</span><span>' + html(item.lunch) + '</span><span>' + html(item.dinner) + '</span><em>' + html(money(item.estimated_total)) + "</em></div>";
      }).join("") + "</div></div>";
  }

  function renderSuggestions(plan) {
    var list = (plan && plan.suggestions) || [];
    if (!list.length) return "";
    return '<div class="cl-r10-block compact"><div class="cl-r10-block-title">' + icon("sparkles") + '<span>延伸建议</span></div><ul class="cl-r10-suggestions">' +
      list.slice(0, 4).map(function (item) { return "<li>" + html(item) + "</li>"; }).join("") + "</ul></div>";
  }

  function renderResult(plan) {
    if (!plan) {
      return '<div class="cl-r10-empty"><strong>等待一句话指令</strong><span>钱小参会结合账单、预算、固定扣款和收入生成草案。</span></div>';
    }
    var applied = plan.applied || {};
    var appliedText = applied.budget_total || applied.savings_plan ? '<span class="cl-r10-applied">' + icon("check") + "已应用到预算和攒钱计划</span>" : "";
    return '<div class="cl-r10-result"><div class="cl-r10-summary"><strong>' + html(plan.assistant_name || "钱小参") + '</strong><span>' + html(plan.summary || "") + "</span>" + appliedText + "</div>" +
      renderMetrics(plan) + renderSpendingPlan(plan) + renderMeals(plan) + renderSuggestions(plan) + "</div>";
  }

  function render() {
    if (!isAuthed() || isPublicPath() || !isActivePath()) {
      removePanel();
      return;
    }
    if (!state.month) state.month = currentMonth();
    var anchor = panelAnchor();
    if (!anchor) return;
    var node = panelNode(anchor);
    var plan = state.plan && state.plan.scope === currentScope() ? state.plan : null;
    var canApply = !!plan && !state.loading && !state.applying && !(plan.applied && (plan.applied.budget_total || plan.applied.savings_plan));
    node.innerHTML =
      '<div class="cl-r10-head"><div class="cl-r10-title"><span>Round 010</span><strong>钱小参</strong><small>' + html(scopeLabel(currentScope())) + ' · 一句话理财参谋</small></div><div class="cl-r10-month">' + icon("calendar") + '<label><span>月份</span><input type="month" data-cl-r10-month value="' + html(state.month) + '"></label></div></div>' +
      '<label class="cl-r10-command"><span>一句话指令</span><textarea data-cl-r10-input rows="2" placeholder="例如：本月预算5000，每月攒2000，帮我安排以后怎么花和每天吃什么">' + html(state.message) + "</textarea></label>" +
      '<div class="cl-r10-chips">' + chips() + "</div>" +
      '<div class="cl-r10-actions"><button type="button" class="cl-r10-action primary" data-cl-r10-generate ' + (state.loading ? "disabled" : "") + ">" + icon("wand") + '<span>' + (state.loading ? "生成中" : "生成计划") + '</span></button><button type="button" class="cl-r10-action" data-cl-r10-apply ' + (!canApply ? "disabled" : "") + ">" + icon("check") + '<span>' + (state.applying ? "应用中" : "应用草案") + '</span></button><button type="button" class="cl-r10-action ghost" data-cl-r10-clear><span>清空</span></button></div>' +
      (state.error ? '<div class="cl-r10-alert">' + icon("alert") + '<span>' + html(state.error) + "</span></div>" : "") +
      (state.notice ? '<div class="cl-r10-notice">' + html(state.notice) + "</div>" : "") +
      renderResult(plan);
  }

  function syncInputs() {
    var input = document.querySelector("[data-cl-r10-input]");
    var month = document.querySelector("[data-cl-r10-month]");
    if (input) state.message = input.value;
    if (month) state.month = month.value || currentMonth();
  }

  function requestPlan(apply) {
    syncInputs();
    state.error = "";
    state.notice = "";
    if (!state.message.trim()) {
      state.error = "先写一句话，比如“本月预算5000，每月攒2000”。";
      render();
      return;
    }
    if (apply && !state.plan) {
      state.error = "先生成草案，再应用到预算和攒钱计划。";
      render();
      return;
    }
    state.loading = !apply;
    state.applying = !!apply;
    render();
    fetch("/api/ai-extra/money-action", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        message: state.message.trim(),
        scope: currentScope(),
        month: state.month || currentMonth(),
        apply: !!apply
      })
    }).then(function (response) {
      if (!response.ok) {
        return response.json().catch(function () { return {}; }).then(function (body) {
          throw new Error(body.detail || "钱小参暂时没有生成成功");
        });
      }
      return response.json();
    }).then(function (data) {
      state.plan = data;
      state.notice = apply ? "预算和攒钱计划已更新。" : "草案已生成，确认后可应用。";
      writeJson(PLAN_KEY, data);
    }).catch(function (error) {
      state.error = error.message || "钱小参暂时不可用，请稍后再试。";
    }).finally(function () {
      state.loading = false;
      state.applying = false;
      render();
    });
  }

  function clearPanel() {
    state.message = "";
    state.error = "";
    state.notice = "";
    state.plan = null;
    try {
      localStorage.removeItem(PLAN_KEY);
    } catch (error) {
      return;
    }
    render();
  }

  function onClick(event) {
    var chip = event.target.closest("[data-cl-r10-chip]");
    if (chip) {
      state.message = chip.getAttribute("data-cl-r10-chip") || "";
      state.error = "";
      state.notice = "";
      render();
      return;
    }
    if (event.target.closest("[data-cl-r10-generate]")) {
      requestPlan(false);
      return;
    }
    if (event.target.closest("[data-cl-r10-apply]")) {
      requestPlan(true);
      return;
    }
    if (event.target.closest("[data-cl-r10-clear]")) {
      clearPanel();
    }
  }

  function onInput(event) {
    if (event.target.matches("[data-cl-r10-input]")) {
      state.message = event.target.value;
    }
    if (event.target.matches("[data-cl-r10-month]")) {
      state.month = event.target.value || currentMonth();
      if (state.plan && state.plan.month !== state.month) state.plan = null;
      render();
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(render, 120);
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

  function init() {
    state.month = currentMonth();
    patchHistory();
    document.addEventListener("click", onClick);
    document.addEventListener("input", onInput);
    schedule();
    setInterval(schedule, 1400);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
