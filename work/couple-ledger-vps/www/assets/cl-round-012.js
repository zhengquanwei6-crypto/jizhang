(function () {
  "use strict";

  var ROUND_ATTR = "data-cl-round-012";
  var AI_KEY = "cl_r12_ai_enabled";
  var publicPaths = ["/login", "/register", "/reset-password", "/legal"];
  var timers = [];
  var historyPatched = false;
  var orderObserver = null;
  var state = {
    text: "",
    aiEnabled: localStorage.getItem(AI_KEY) !== "0",
    loading: false,
    saving: false,
    error: "",
    notice: "",
    result: null,
    draft: null,
    accounts: [],
    categories: [],
    selectedAccountId: "",
    loadedScope: "",
  };

  function html(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char];
    });
  }

  function icon(name) {
    var paths = {
      sparkles: '<path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/><path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9z"/>',
      bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
      check: '<path d="M5 12l5 5L20 7"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
      edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
      wallet: '<path d="M3 7a2 2 0 0 1 2-2h14v4"/><path d="M3 7v10a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2z"/><circle cx="16" cy="14" r="1"/>',
      calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>',
      alert: '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
      x: '<path d="M6 6l12 12M18 6 6 18"/>',
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.sparkles) + "</svg>";
  }

  function isHomePath() {
    return location.pathname === "/home" || location.pathname === "/";
  }

  function isPublicPath() {
    return publicPaths.some(function (path) {
      return location.pathname === path || location.pathname.indexOf(path + "/") === 0;
    });
  }

  function parseAuth() {
    try {
      return JSON.parse(localStorage.getItem("cl_auth") || "{}");
    } catch (error) {
      return {};
    }
  }

  function isAuthed() {
    return !!parseAuth().accessToken;
  }

  function authHeaders(json) {
    var headers = {};
    var token = parseAuth().accessToken;
    if (token) headers.Authorization = "Bearer " + token;
    if (json !== false) headers["Content-Type"] = "application/json";
    return headers;
  }

  function currentScope() {
    return localStorage.getItem("cl_scope") || "personal";
  }

  function scopeLabel() {
    return currentScope() === "couple" ? "情侣账本" : "个人账本";
  }

  function today() {
    var now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 10);
  }

  function money(value) {
    var num = Number(value || 0);
    return "¥" + num.toLocaleString("zh-CN", { maximumFractionDigits: num % 1 ? 2 : 0 });
  }

  function api(path, options) {
    var opts = options || {};
    var headers = Object.assign(authHeaders(opts.json !== false), opts.headers || {});
    var body = opts.body;
    if (body && opts.json !== false) body = JSON.stringify(body);
    return fetch(path, {
      method: opts.method || "GET",
      headers: headers,
      body: body,
    }).then(function (response) {
      if (!response.ok) {
        return response.json().catch(function () { return {}; }).then(function (payload) {
          throw new Error(payload.detail || "请求失败");
        });
      }
      if (response.status === 204) return {};
      return response.json();
    });
  }

  function pageRoot() {
    return document.querySelector(".app-shell .page") || document.querySelector(".app-shell") || document.querySelector("#app") || document.body;
  }

  function panelAnchor(root) {
    if (!root) return null;
    var children = Array.prototype.slice.call(root.children || []);
    return children.find(function (node) {
      return node.tagName === "HEADER" || node.classList.contains("page-header") || node.classList.contains("home-header") || node.classList.contains("ph");
    }) || root;
  }

  function removePanel() {
    var node = document.querySelector("[" + ROUND_ATTR + '="panel"]');
    if (node) node.remove();
  }

  function panelNode(anchor, root) {
    var existing = document.querySelector("[" + ROUND_ATTR + '="panel"]');
    var node = existing || document.createElement("section");
    if (!existing) {
      node.className = "cl-r12-quick-entry";
      node.setAttribute(ROUND_ATTR, "panel");
    }
    var compass = document.querySelector('[data-cl-round-006="compass"]');
    if (compass && compass.parentNode && (node.parentNode !== compass.parentNode || node.nextElementSibling !== compass)) {
      compass.parentNode.insertBefore(node, compass);
      return node;
    }
    if (anchor === root) {
      if (node.parentNode !== root || root.firstElementChild !== node) {
        root.insertBefore(node, root.firstChild);
      }
    } else if (anchor && anchor.parentNode && (node.parentNode !== anchor.parentNode || node.previousElementSibling !== anchor)) {
      anchor.parentNode.insertBefore(node, anchor.nextSibling);
    }
    return node;
  }

  function ensurePriorityOrder() {
    var node = document.querySelector("[" + ROUND_ATTR + '="panel"]');
    var compass = document.querySelector('[data-cl-round-006="compass"]');
    var repeat = document.querySelector('[data-cl-round-013="panel"]');
    var batch = document.querySelector('[data-cl-round-014="panel"]');
    if (node && compass && node.parentNode === compass.parentNode && !(node.compareDocumentPosition(compass) & Node.DOCUMENT_POSITION_FOLLOWING)) {
      compass.parentNode.insertBefore(node, compass);
    }
    if (node && repeat && node.parentNode === repeat.parentNode && repeat.previousElementSibling !== node) {
      node.parentNode.insertBefore(repeat, node.nextSibling);
    }
    if (repeat && batch && repeat.parentNode === batch.parentNode && batch.previousElementSibling !== repeat) {
      repeat.parentNode.insertBefore(batch, repeat.nextSibling);
    }
    if (batch && compass && batch.parentNode === compass.parentNode && !(batch.compareDocumentPosition(compass) & Node.DOCUMENT_POSITION_FOLLOWING)) {
      compass.parentNode.insertBefore(batch, compass);
    }
  }

  function installOrderObserver() {
    if (orderObserver || !document.body) return;
    orderObserver = new MutationObserver(function () {
      ensurePriorityOrder();
    });
    orderObserver.observe(document.body, { childList: true, subtree: true });
  }

  function ensureLoaded(force) {
    if (!isHomePath() || !isAuthed() || isPublicPath()) return;
    var scope = currentScope();
    if (!force && state.loadedScope === scope && state.categories.length) return;
    state.loadedScope = scope;
    Promise.all([
      api("/api/accounts?scope=" + encodeURIComponent(scope)).catch(function () { return []; }),
      api("/api/transactions/categories/list").catch(function () { return []; }),
    ]).then(function (values) {
      state.accounts = Array.isArray(values[0]) ? values[0].filter(function (account) { return !account.is_archived; }) : [];
      state.categories = Array.isArray(values[1]) ? values[1] : [];
      if (!state.selectedAccountId && state.accounts.length) state.selectedAccountId = state.accounts[0].id;
      render();
    });
  }

  function categoryOptions(type, selected) {
    var names = [];
    state.categories.forEach(function (item) {
      if ((item.type || type) === type && names.indexOf(item.name) < 0) names.push(item.name);
    });
    if (selected && names.indexOf(selected) < 0) names.unshift(selected);
    if (!names.length) names = type === "income" ? ["工资", "奖金", "兼职", "理财", "其他收入"] : ["餐饮", "交通", "购物", "娱乐", "居住", "其他支出"];
    return names.map(function (name) {
      return '<option value="' + html(name) + '"' + (name === selected ? " selected" : "") + ">" + html(name) + "</option>";
    }).join("");
  }

  function accountOptions() {
    var options = ['<option value="">不选账户</option>'];
    state.accounts.forEach(function (account) {
      options.push('<option value="' + html(account.id) + '"' + (account.id === state.selectedAccountId ? " selected" : "") + ">" + html(account.name || "账户") + "</option>");
    });
    return options.join("");
  }

  function chips() {
    return ["午餐28", "昨天打车36", "工资8000到账", "奶茶18"].map(function (text) {
      return '<button type="button" class="cl-r12-chip" data-cl-r12-chip="' + html(text) + '">' + html(text) + "</button>";
    }).join("");
  }

  function modeBadge() {
    if (!state.result) return "";
    var label = state.result.mode === "llm" ? "AI复核" : state.result.mode === "manual" ? "手动" : "本地";
    return '<span class="cl-r12-mode ' + html(state.result.mode || "local") + '">' + html(label) + "</span>";
  }

  function renderDraft() {
    var draft = state.draft;
    if (!draft) {
      return '<div class="cl-r12-empty"><strong>一句话就能先成草稿</strong><span>例如“午餐28”或“昨天打车36”。</span></div>';
    }
    var type = draft.type === "income" ? "income" : "expense";
    return '<div class="cl-r12-draft">' +
      '<div class="cl-r12-draft-head"><strong>待确认草稿</strong>' + modeBadge() + '</div>' +
      '<div class="cl-r12-fields">' +
        '<label><span>金额</span><input type="number" min="0.01" step="0.01" data-cl-r12-draft="amount" value="' + html(draft.amount || "") + '"></label>' +
        '<div class="cl-r12-type" role="group" aria-label="收支类型">' +
          '<button type="button" class="' + (type === "expense" ? "active" : "") + '" data-cl-r12-type="expense">支出</button>' +
          '<button type="button" class="' + (type === "income" ? "active" : "") + '" data-cl-r12-type="income">收入</button>' +
        '</div>' +
        '<label><span>分类</span><select data-cl-r12-draft="category">' + categoryOptions(type, draft.category) + '</select></label>' +
        '<label><span>日期</span><input type="date" data-cl-r12-draft="tx_date" value="' + html(draft.tx_date || today()) + '"></label>' +
        '<label class="cl-r12-wide"><span>账户</span><select data-cl-r12-account>' + accountOptions() + '</select></label>' +
        '<label class="cl-r12-wide"><span>备注</span><input type="text" data-cl-r12-draft="note" value="' + html(draft.note || "") + '"></label>' +
      "</div>" +
      (state.result && state.result.needs_review ? '<div class="cl-r12-review">' + icon("edit") + '<span>' + html(state.result.reason || "请确认草稿后再入账。") + "</span></div>" : "") +
    "</div>";
  }

  function render() {
    if (!isHomePath() || !isAuthed() || isPublicPath()) {
      removePanel();
      return;
    }
    var root = pageRoot();
    var anchor = panelAnchor(root);
    if (!root || !anchor) return;
    var node = panelNode(anchor, root);
    var active = document.activeElement;
    if (active && node.contains(active) && active.matches && active.matches("[data-cl-r12-input]") && !state.loading && !state.saving && !state.draft) {
      return;
    }
    node.innerHTML =
      '<div class="cl-r12-head"><div class="cl-r12-title"><span>Round 012</span><strong>一句话记账</strong><small>' + html(scopeLabel()) + ' · ' + html(today()) + '</small></div>' +
        '<button type="button" class="cl-r12-switch ' + (state.aiEnabled ? "on" : "") + '" data-cl-r12-ai-toggle aria-pressed="' + (state.aiEnabled ? "true" : "false") + '"><span>AI</span><i></i></button></div>' +
      '<div class="cl-r12-command"><div class="cl-r12-input-wrap">' + icon(state.aiEnabled ? "sparkles" : "bolt") + '<input data-cl-r12-input type="text" value="' + html(state.text) + '" placeholder="午餐28 / 昨天打车36 / 工资8000到账"></div>' +
        '<button type="button" class="cl-r12-action primary" data-cl-r12-parse ' + (state.loading ? "disabled" : "") + '>' + icon(state.aiEnabled ? "sparkles" : "bolt") + '<span>' + (state.loading ? "解析中" : "解析草稿") + '</span></button></div>' +
      '<div class="cl-r12-chips">' + chips() + "</div>" +
      renderDraft() +
      '<div class="cl-r12-actions"><button type="button" class="cl-r12-action primary" data-cl-r12-save ' + (!state.draft || state.saving ? "disabled" : "") + '>' + icon("check") + '<span>' + (state.saving ? "入账中" : "确认记一笔") + '</span></button><button type="button" class="cl-r12-action" data-cl-r12-clear>' + icon("x") + '<span>清空</span></button></div>' +
      (state.error ? '<div class="cl-r12-alert">' + icon("alert") + '<span>' + html(state.error) + "</span></div>" : "") +
      (state.notice ? '<div class="cl-r12-notice">' + icon("check") + '<span>' + html(state.notice) + "</span></div>" : "");
    ensurePriorityOrder();
  }

  function syncDraft() {
    var input = document.querySelector("[data-cl-r12-input]");
    if (input) state.text = input.value;
    if (!state.draft) return;
    Array.prototype.slice.call(document.querySelectorAll("[data-cl-r12-draft]")).forEach(function (field) {
      var key = field.getAttribute("data-cl-r12-draft");
      state.draft[key] = key === "amount" ? Number(field.value || 0) : field.value;
    });
    var account = document.querySelector("[data-cl-r12-account]");
    if (account) state.selectedAccountId = account.value;
  }

  function parseDraft() {
    syncDraft();
    state.error = "";
    state.notice = "";
    if (!state.text.trim()) {
      state.error = "先写一句账，比如“午餐28”。";
      render();
      return;
    }
    state.loading = true;
    render();
    api("/api/ai/quick-transaction", {
      method: "POST",
      body: {
        text: state.text.trim(),
        scope: currentScope(),
        ai_enabled: state.aiEnabled,
      },
    }).then(function (result) {
      state.result = result;
      state.draft = Object.assign({ scope: currentScope(), tx_date: today(), type: "expense", category: "其他支出", note: "" }, result.draft || {});
      if (!state.selectedAccountId && state.accounts.length) state.selectedAccountId = state.accounts[0].id;
      state.notice = result.summary || "草稿已生成。";
    }).catch(function (error) {
      state.error = error.message || "解析失败";
    }).finally(function () {
      state.loading = false;
      render();
    });
  }

  function saveDraft() {
    syncDraft();
    state.error = "";
    state.notice = "";
    if (!state.draft) return;
    var amount = Number(state.draft.amount || 0);
    if (!amount || amount <= 0) {
      state.error = "金额需要大于 0。";
      render();
      return;
    }
    var sourceText = state.text.trim();
    var sourceDraft = Object.assign({}, state.draft);
    var sourceAccountId = state.selectedAccountId || "";
    state.saving = true;
    render();
    api("/api/transactions", {
      method: "POST",
      body: {
        scope: currentScope(),
        amount: amount,
        category: state.draft.category || (state.draft.type === "income" ? "其他收入" : "其他支出"),
        type: state.draft.type === "income" ? "income" : "expense",
        note: state.draft.note || state.text.trim(),
        tx_date: state.draft.tx_date || today(),
        account_id: state.selectedAccountId || null,
      },
    }).then(function (tx) {
      state.notice = "已记入账本：" + money(tx.amount || amount) + " · " + (tx.category || state.draft.category);
      window.dispatchEvent(new CustomEvent("cl-r12-saved", {
        detail: {
          tx: tx,
          sourceText: sourceText,
          draft: sourceDraft,
          account_id: sourceAccountId,
        },
      }));
      state.text = "";
      state.result = null;
      state.draft = null;
      window.dispatchEvent(new Event("cl-round-route-change"));
    }).catch(function (error) {
      state.error = error.message || "入账失败";
    }).finally(function () {
      state.saving = false;
      render();
    });
  }

  function fillFromExternal(detail) {
    var payload = detail || {};
    var text = String(payload.text || "").trim();
    if (!text) return;
    state.text = text;
    state.result = null;
    state.draft = null;
    state.error = "";
    state.notice = payload.notice || "已带入一句话记账。";
    render();
    ensureLoaded(false);
    setTimeout(function () {
      var input = document.querySelector("[data-cl-r12-input]");
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
      if (payload.parse) parseDraft();
    }, 60);
  }

  function clearAll() {
    state.text = "";
    state.result = null;
    state.draft = null;
    state.error = "";
    state.notice = "";
    render();
  }

  function onClick(event) {
    var toggle = event.target.closest("[data-cl-r12-ai-toggle]");
    if (toggle) {
      state.aiEnabled = !state.aiEnabled;
      localStorage.setItem(AI_KEY, state.aiEnabled ? "1" : "0");
      state.notice = state.aiEnabled ? "AI 已开启" : "AI 已关闭";
      render();
      return;
    }
    var chip = event.target.closest("[data-cl-r12-chip]");
    if (chip) {
      state.text = chip.getAttribute("data-cl-r12-chip") || "";
      state.error = "";
      state.notice = "";
      render();
      var input = document.querySelector("[data-cl-r12-input]");
      if (input) input.focus();
      return;
    }
    if (event.target.closest("[data-cl-r12-parse]")) {
      parseDraft();
      return;
    }
    var typeButton = event.target.closest("[data-cl-r12-type]");
    if (typeButton && state.draft) {
      syncDraft();
      state.draft.type = typeButton.getAttribute("data-cl-r12-type") || "expense";
      if (state.draft.type === "income" && ["餐饮", "交通", "购物", "娱乐", "居住", "医疗", "教育", "礼物", "旅行", "其他支出"].indexOf(state.draft.category) >= 0) state.draft.category = "其他收入";
      if (state.draft.type === "expense" && ["工资", "奖金", "兼职", "理财", "其他收入"].indexOf(state.draft.category) >= 0) state.draft.category = "其他支出";
      render();
      return;
    }
    if (event.target.closest("[data-cl-r12-save]")) {
      saveDraft();
      return;
    }
    if (event.target.closest("[data-cl-r12-clear]")) {
      clearAll();
    }
  }

  function onInput(event) {
    var target = event.target;
    if (target.matches("[data-cl-r12-input]")) {
      state.text = target.value;
      return;
    }
    if (target.matches("[data-cl-r12-account]")) {
      state.selectedAccountId = target.value;
      return;
    }
    if (target.matches("[data-cl-r12-draft]") && state.draft) {
      var key = target.getAttribute("data-cl-r12-draft");
      state.draft[key] = key === "amount" ? Number(target.value || 0) : target.value;
    }
  }

  function refresh() {
    render();
    ensureLoaded(false);
  }

  function scheduleRefresh() {
    timers.forEach(function (timer) { clearTimeout(timer); });
    timers = [0, 120, 360, 900, 1600].map(function (delay) {
      return setTimeout(refresh, delay);
    });
  }

  function installRouteObserver() {
    if (historyPatched || window.__clRound012RouteObserver) return;
    historyPatched = true;
    window.__clRound012RouteObserver = true;
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

  function boot() {
    installRouteObserver();
    installOrderObserver();
    scheduleRefresh();
    window.addEventListener("cl-round-route-change", scheduleRefresh);
    window.addEventListener("cl-r12-fill", function (event) {
      fillFromExternal(event.detail);
    });
    document.addEventListener("click", onClick);
    document.addEventListener("input", onInput);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
