(function () {
  "use strict";

  var ROUND_ATTR = "data-cl-round-014";
  var publicPaths = ["/login", "/register", "/reset-password", "/legal"];
  var state = {
    text: "",
    loading: false,
    saving: false,
    error: "",
    notice: "",
    rows: [],
    summary: null,
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
      list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
      wand: '<path d="M15 4l5 5"/><path d="M14 5l-9 9a2 2 0 0 0 0 3l2 2a2 2 0 0 0 3 0l9-9"/><path d="M6 2v4"/><path d="M4 4h4"/><path d="M19 14v4"/><path d="M17 16h4"/>',
      check: '<path d="M5 12l5 5L20 7"/>',
      x: '<path d="M6 6l12 12M18 6 6 18"/>',
      alert: '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.list) + "</svg>";
  }

  function parseAuth() {
    try {
      return JSON.parse(localStorage.getItem("cl_auth") || "{}");
    } catch (error) {
      return {};
    }
  }

  function authHeaders(json) {
    var token = parseAuth().accessToken;
    var headers = token ? { Authorization: "Bearer " + token } : {};
    if (json !== false) headers["Content-Type"] = "application/json";
    return headers;
  }

  function isAuthed() {
    return !!parseAuth().accessToken;
  }

  function isPublicPath() {
    return publicPaths.some(function (path) {
      return location.pathname === path || location.pathname.indexOf(path + "/") === 0;
    });
  }

  function isHomePath() {
    return location.pathname === "/home" || location.pathname === "/";
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
    var body = opts.body;
    if (body && opts.json !== false) body = JSON.stringify(body);
    return fetch(path, {
      method: opts.method || "GET",
      headers: Object.assign(authHeaders(opts.json), opts.headers || {}),
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

  function anchorNode() {
    return document.querySelector('[data-cl-round-013="panel"]') ||
      document.querySelector('[data-cl-round-012="panel"]');
  }

  function removePanel() {
    var node = document.querySelector("[" + ROUND_ATTR + '="panel"]');
    if (node) node.remove();
  }

  function panelNode(anchor) {
    var existing = document.querySelector("[" + ROUND_ATTR + '="panel"]');
    var node = existing || document.createElement("section");
    if (!existing) {
      node.className = "cl-r14-batch";
      node.setAttribute(ROUND_ATTR, "panel");
    }
    if (anchor && anchor.parentNode && (node.parentNode !== anchor.parentNode || node.previousElementSibling !== anchor)) {
      anchor.parentNode.insertBefore(node, anchor.nextSibling);
    }
    return node;
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
      state.accounts = Array.isArray(values[0]) ? values[0].filter(function (item) { return !item.is_archived; }) : [];
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
    state.accounts.forEach(function (item) {
      options.push('<option value="' + html(item.id) + '"' + (item.id === state.selectedAccountId ? " selected" : "") + ">" + html(item.name || "账户") + "</option>");
    });
    return options.join("");
  }

  function samples() {
    return [
      { label: "三笔日常", text: "早餐12\n午餐28\n打车36" },
      { label: "一张小票", text: "水果18\n零食15\n晚餐42" },
      { label: "收入支出", text: "工资8000到账\n房租2000\n咖啡18" },
    ].map(function (item) {
      return '<button type="button" data-cl-r14-sample="' + html(item.text) + '">' + html(item.label) + "</button>";
    }).join("");
  }

  function syncRows() {
    Array.prototype.slice.call(document.querySelectorAll("[data-cl-r14-row]")).forEach(function (node) {
      var index = Number(node.getAttribute("data-cl-r14-row"));
      var row = state.rows[index];
      if (!row) return;
      row.include = !!node.querySelector("[data-cl-r14-include]")?.checked;
      row.draft.amount = Number(node.querySelector('[data-cl-r14-field="amount"]')?.value || 0);
      row.draft.category = node.querySelector('[data-cl-r14-field="category"]')?.value || row.draft.category;
      row.draft.tx_date = node.querySelector('[data-cl-r14-field="tx_date"]')?.value || row.draft.tx_date;
      row.draft.note = node.querySelector('[data-cl-r14-field="note"]')?.value || "";
    });
  }

  function selectedRows() {
    return state.rows.filter(function (row) {
      return row.include !== false && row.status !== "saved" && Number(row.draft.amount || 0) > 0;
    });
  }

  function computedSummary() {
    var selected = state.rows.filter(function (row) { return row.include !== false; });
    return selected.reduce(function (sum, row) {
      var amount = Number(row.draft.amount || 0);
      if (row.draft.type === "income") sum.income += amount;
      else sum.expense += amount;
      if (row.needs_review || !amount) sum.review += 1;
      return sum;
    }, { count: selected.length, income: 0, expense: 0, review: 0 });
  }

  function renderMetrics() {
    var summary = computedSummary();
    return '<div class="cl-r14-metrics">' +
      metric("待入账", summary.count + " 行", "gold") +
      metric("支出", money(summary.expense), "blue") +
      metric("收入", money(summary.income), "sage") +
      metric("需复核", String(summary.review), summary.review ? "bad" : "") +
    "</div>";
  }

  function metric(label, value, tone) {
    return '<div class="cl-r14-metric ' + html(tone || "") + '"><span>' + html(label) + '</span><strong>' + html(value) + "</strong></div>";
  }

  function renderRows() {
    if (!state.rows.length) {
      return '<div class="cl-r14-empty"><strong>还没有批量草稿</strong><span>一行一笔，例如“早餐12”“打车36”。</span></div>';
    }
    return '<div class="cl-r14-rows">' + state.rows.map(function (row, index) {
      var draft = row.draft || {};
      var type = draft.type === "income" ? "income" : "expense";
      return '<article class="cl-r14-row ' + html(row.status || "") + '" data-cl-r14-row="' + index + '">' +
        '<label class="cl-r14-check"><input type="checkbox" data-cl-r14-include ' + (row.include === false ? "" : "checked") + '><span></span></label>' +
        '<div class="cl-r14-row-main"><div class="cl-r14-source"><strong>' + html(row.source || "第 " + (index + 1) + " 行") + '</strong>' + (row.needs_review ? '<em>需复核</em>' : "") + (row.status === "saved" ? '<em class="saved">已入账</em>' : "") + '</div>' +
          '<div class="cl-r14-grid">' +
            '<label><span>金额</span><input type="number" min="0.01" step="0.01" data-cl-r14-field="amount" value="' + html(draft.amount || "") + '"></label>' +
            '<div class="cl-r14-type" role="group"><button type="button" class="' + (type === "expense" ? "active" : "") + '" data-cl-r14-type="expense" data-index="' + index + '">支出</button><button type="button" class="' + (type === "income" ? "active" : "") + '" data-cl-r14-type="income" data-index="' + index + '">收入</button></div>' +
            '<label><span>分类</span><select data-cl-r14-field="category">' + categoryOptions(type, draft.category) + '</select></label>' +
            '<label><span>日期</span><input type="date" data-cl-r14-field="tx_date" value="' + html(draft.tx_date || today()) + '"></label>' +
            '<label class="wide"><span>备注</span><input type="text" data-cl-r14-field="note" value="' + html(draft.note || row.source || "") + '"></label>' +
          "</div></div>" +
      "</article>";
    }).join("") + "</div>";
  }

  function render() {
    if (!isHomePath() || !isAuthed() || isPublicPath()) {
      removePanel();
      return;
    }
    var anchor = anchorNode();
    if (!anchor) return;
    var node = panelNode(anchor);
    node.innerHTML =
      '<div class="cl-r14-head"><div><span>Round 014</span><strong>批量记账</strong><small>' + html(scopeLabel()) + ' · 多行一次生成草稿</small></div><label><span>默认账户</span><select data-cl-r14-account>' + accountOptions() + '</select></label></div>' +
      '<label class="cl-r14-input"><span>多行账单</span><textarea data-cl-r14-text rows="3" placeholder="早餐12&#10;午餐28&#10;打车36">' + html(state.text) + "</textarea></label>" +
      '<div class="cl-r14-samples">' + samples() + "</div>" +
      '<div class="cl-r14-actions"><button type="button" class="cl-r14-action primary" data-cl-r14-parse ' + (state.loading ? "disabled" : "") + '>' + icon("wand") + '<span>' + (state.loading ? "生成中" : "生成草稿") + '</span></button><button type="button" class="cl-r14-action" data-cl-r14-save ' + (!selectedRows().length || state.saving ? "disabled" : "") + '>' + icon("check") + '<span>' + (state.saving ? "入账中" : "确认全部") + '</span></button><button type="button" class="cl-r14-action ghost" data-cl-r14-clear>' + icon("x") + '<span>清空</span></button></div>' +
      (state.rows.length ? renderMetrics() : "") +
      renderRows() +
      (state.error ? '<div class="cl-r14-alert">' + icon("alert") + '<span>' + html(state.error) + "</span></div>" : "") +
      (state.notice ? '<div class="cl-r14-notice">' + icon("plus") + '<span>' + html(state.notice) + "</span></div>" : "");
  }

  function parseBatch() {
    var input = document.querySelector("[data-cl-r14-text]");
    if (input) state.text = input.value;
    state.error = "";
    state.notice = "";
    if (!state.text.trim()) {
      state.error = "先粘贴几行账单。";
      render();
      return;
    }
    state.loading = true;
    render();
    api("/api/ai/quick-transactions", {
      method: "POST",
      body: {
        text: state.text,
        scope: currentScope(),
        ai_enabled: localStorage.getItem("cl_r12_ai_enabled") !== "0",
      },
    }).then(function (data) {
      state.summary = data;
      state.rows = (data.items || []).map(function (item) {
        return {
          source: item.source,
          needs_review: !!item.needs_review,
          include: true,
          status: "",
          draft: Object.assign({ scope: currentScope(), amount: 0, category: "其他支出", type: "expense", note: "", tx_date: today() }, item.draft || {}),
        };
      });
      state.notice = "已生成 " + state.rows.length + " 行草稿。";
    }).catch(function (error) {
      state.error = error.message || "批量解析失败";
    }).finally(function () {
      state.loading = false;
      render();
    });
  }

  function saveAll() {
    syncRows();
    var rows = selectedRows();
    if (!rows.length) {
      state.error = "没有可入账的草稿。";
      render();
      return;
    }
    state.saving = true;
    state.error = "";
    state.notice = "";
    render();
    var done = 0;
    var failed = 0;
    rows.reduce(function (chain, row) {
      return chain.then(function () {
        var draft = row.draft;
        return api("/api/transactions", {
          method: "POST",
          body: {
            scope: currentScope(),
            amount: Number(draft.amount || 0),
            category: draft.category || (draft.type === "income" ? "其他收入" : "其他支出"),
            type: draft.type === "income" ? "income" : "expense",
            note: draft.note || row.source || "",
            tx_date: draft.tx_date || today(),
            account_id: state.selectedAccountId || null,
          },
        }).then(function (tx) {
          row.status = "saved";
          row.include = false;
          done += 1;
          window.dispatchEvent(new CustomEvent("cl-r12-saved", { detail: { tx: tx, sourceText: row.source, draft: draft, account_id: state.selectedAccountId || "" } }));
        }).catch(function () {
          failed += 1;
          row.status = "failed";
        });
      });
    }, Promise.resolve()).then(function () {
      state.notice = failed ? "已入账 " + done + " 行，" + failed + " 行失败。" : "已批量入账 " + done + " 行。";
      window.dispatchEvent(new Event("cl-round-route-change"));
    }).finally(function () {
      state.saving = false;
      render();
    });
  }

  function clearAll() {
    state.text = "";
    state.rows = [];
    state.summary = null;
    state.error = "";
    state.notice = "";
    render();
  }

  function onClick(event) {
    var sample = event.target.closest("[data-cl-r14-sample]");
    if (sample) {
      state.text = sample.getAttribute("data-cl-r14-sample") || "";
      state.error = "";
      state.notice = "已填入示例，可直接生成草稿。";
      render();
      return;
    }
    var type = event.target.closest("[data-cl-r14-type]");
    if (type) {
      syncRows();
      var index = Number(type.getAttribute("data-index"));
      var row = state.rows[index];
      if (row) {
        row.draft.type = type.getAttribute("data-cl-r14-type") || "expense";
        if (row.draft.type === "income" && ["餐饮", "交通", "购物", "娱乐", "居住", "医疗", "教育", "礼物", "旅行", "其他支出"].indexOf(row.draft.category) >= 0) row.draft.category = "其他收入";
        if (row.draft.type === "expense" && ["工资", "奖金", "兼职", "理财", "其他收入"].indexOf(row.draft.category) >= 0) row.draft.category = "其他支出";
        render();
      }
      return;
    }
    if (event.target.closest("[data-cl-r14-parse]")) parseBatch();
    if (event.target.closest("[data-cl-r14-save]")) saveAll();
    if (event.target.closest("[data-cl-r14-clear]")) clearAll();
  }

  function onInput(event) {
    if (event.target.matches("[data-cl-r14-text]")) state.text = event.target.value;
    if (event.target.matches("[data-cl-r14-account]")) state.selectedAccountId = event.target.value;
    if (event.target.closest("[data-cl-r14-row]")) syncRows();
  }

  function refresh() {
    if (!anchorNode()) {
      setTimeout(refresh, 160);
      return;
    }
    render();
    ensureLoaded(false);
  }

  function boot() {
    refresh();
    window.addEventListener("cl-round-route-change", function () {
      setTimeout(refresh, 120);
    });
    document.addEventListener("click", onClick);
    document.addEventListener("input", onInput);
    setTimeout(refresh, 700);
    setTimeout(refresh, 1500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
