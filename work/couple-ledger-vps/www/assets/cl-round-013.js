(function () {
  "use strict";

  var ROUND_ATTR = "data-cl-round-013";
  var STORE_KEY = "cl_r13_quick_history";
  var publicPaths = ["/login", "/register", "/reset-password", "/legal"];
  var timers = [];
  var state = {
    loading: false,
    error: "",
    notice: "",
    recent: [],
    loadedKey: "",
  };

  function html(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char];
    });
  }

  function icon(name) {
    var paths = {
      repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      sparkles: '<path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/><path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9z"/>',
      refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
      alert: '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.repeat) + "</svg>";
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

  function authHeaders() {
    var token = parseAuth().accessToken;
    return token ? { Authorization: "Bearer " + token } : {};
  }

  function currentScope() {
    return localStorage.getItem("cl_scope") || "personal";
  }

  function scopeLabel() {
    return currentScope() === "couple" ? "情侣账本" : "个人账本";
  }

  function money(value) {
    var num = Number(value || 0);
    return "¥" + num.toLocaleString("zh-CN", { maximumFractionDigits: num % 1 ? 2 : 0 });
  }

  function api(path) {
    return fetch(path, { headers: authHeaders() }).then(function (response) {
      if (!response.ok) {
        return response.json().catch(function () { return {}; }).then(function (payload) {
          throw new Error(payload.detail || "请求失败");
        });
      }
      return response.json();
    });
  }

  function localItems() {
    try {
      var data = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return [];
    }
  }

  function storeLocal(items) {
    localStorage.setItem(STORE_KEY, JSON.stringify(items.slice(0, 10)));
  }

  function normalizeList(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.items)) return data.items;
    return [];
  }

  function stableKey(tx) {
    return [
      tx.id || "",
      tx.type || "",
      tx.category || "",
      tx.amount || "",
      tx.note || "",
      tx.tx_date || "",
    ].join("|");
  }

  function mergeRecent(remoteItems) {
    var seen = {};
    var merged = [];
    localItems().concat(remoteItems || []).forEach(function (item) {
      if (!item || !item.amount) return;
      if (item.tx_kind && item.tx_kind !== "normal") return;
      var key = stableKey(item);
      if (seen[key]) return;
      seen[key] = true;
      merged.push(item);
    });
    merged.sort(function (a, b) {
      return String(b.tx_date || "").localeCompare(String(a.tx_date || "")) || String(b.created_at || "").localeCompare(String(a.created_at || ""));
    });
    return merged.slice(0, 8);
  }

  function phraseBase(tx) {
    var note = String(tx.note || "").trim();
    if (note && note.length <= 16 && !/^\d+(\.\d+)?$/.test(note)) return note;
    return tx.category || (tx.type === "income" ? "收入" : "支出");
  }

  function amountText(value) {
    var num = Number(value || 0);
    return String(num % 1 ? Number(num.toFixed(2)) : Math.round(num));
  }

  function sentenceFor(tx) {
    var base = phraseBase(tx);
    var amount = amountText(tx.amount);
    if (tx.type === "income") return base + amount + "到账";
    return base + amount;
  }

  function txTone(tx) {
    return tx.type === "income" ? "income" : "expense";
  }

  function templates() {
    var buckets = {};
    state.recent.forEach(function (tx) {
      var text = sentenceFor(tx);
      var key = tx.type + "|" + tx.category + "|" + phraseBase(tx) + "|" + amountText(tx.amount);
      if (!buckets[key]) buckets[key] = { text: text, count: 0, tx: tx };
      buckets[key].count += 1;
    });
    return Object.keys(buckets).map(function (key) {
      return buckets[key];
    }).sort(function (a, b) {
      return b.count - a.count || Number(b.tx.amount || 0) - Number(a.tx.amount || 0);
    }).slice(0, 4);
  }

  function pageAnchor() {
    return document.querySelector('[data-cl-round-012="panel"]');
  }

  function removePanel() {
    var node = document.querySelector("[" + ROUND_ATTR + '="panel"]');
    if (node) node.remove();
  }

  function panelNode(anchor) {
    var existing = document.querySelector("[" + ROUND_ATTR + '="panel"]');
    var node = existing || document.createElement("section");
    if (!existing) {
      node.className = "cl-r13-repeat";
      node.setAttribute(ROUND_ATTR, "panel");
    }
    if (anchor && anchor.parentNode && (node.parentNode !== anchor.parentNode || node.previousElementSibling !== anchor)) {
      anchor.parentNode.insertBefore(node, anchor.nextSibling);
    }
    return node;
  }

  function renderTemplates() {
    var list = templates();
    if (!list.length) return "";
    return '<div class="cl-r13-templates"><span>常用模板</span>' + list.map(function (item) {
      return '<button type="button" data-cl-r13-fill="' + html(item.text) + '">' + html(item.text) + (item.count > 1 ? '<em>' + item.count + "次</em>" : "") + "</button>";
    }).join("") + "</div>";
  }

  function renderRecent() {
    if (state.loading) {
      return '<div class="cl-r13-empty"><strong>正在读取最近账单</strong><span>稍等一下，复用建议马上出现。</span></div>';
    }
    if (!state.recent.length) {
      return '<div class="cl-r13-empty"><strong>还没有可复用账单</strong><span>先用上面的一句话记一笔，之后这里会出现“再记一次”。</span></div>';
    }
    return '<div class="cl-r13-list">' + state.recent.slice(0, 5).map(function (tx, index) {
      var text = sentenceFor(tx);
      return '<article class="cl-r13-item ' + txTone(tx) + '">' +
        '<button type="button" class="cl-r13-repeat-btn" data-cl-r13-fill="' + html(text) + '" aria-label="复用这笔账单">' + icon("repeat") + "</button>" +
        '<div class="cl-r13-item-main"><strong>' + html(phraseBase(tx)) + '</strong><span>' + html(tx.category || "") + " · " + html(tx.tx_date || "") + "</span></div>" +
        '<div class="cl-r13-amount">' + (tx.type === "income" ? "+" : "-") + html(money(tx.amount)) + "</div>" +
        (index === 0 ? '<span class="cl-r13-latest">上一笔</span>' : "") +
      "</article>";
    }).join("") + "</div>";
  }

  function render() {
    if (!isHomePath() || !isAuthed() || isPublicPath()) {
      removePanel();
      return;
    }
    var anchor = pageAnchor();
    if (!anchor) return;
    var node = panelNode(anchor);
    node.innerHTML =
      '<div class="cl-r13-head"><div><span>Round 013</span><strong>快捷复用</strong><small>' + html(scopeLabel()) + ' · 少打一遍重复账</small></div><button type="button" data-cl-r13-refresh>' + icon("refresh") + '<span>刷新</span></button></div>' +
      renderTemplates() +
      renderRecent() +
      (state.error ? '<div class="cl-r13-alert">' + icon("alert") + '<span>' + html(state.error) + "</span></div>" : "") +
      (state.notice ? '<div class="cl-r13-notice">' + icon("sparkles") + '<span>' + html(state.notice) + "</span></div>" : "");
  }

  function loadRecent(force) {
    if (!isHomePath() || !isAuthed() || isPublicPath()) return;
    var key = currentScope();
    if (!force && state.loadedKey === key && state.recent.length) return;
    state.loadedKey = key;
    state.loading = true;
    state.error = "";
    render();
    api("/api/transactions?scope=" + encodeURIComponent(key) + "&limit=12").then(function (data) {
      state.recent = mergeRecent(normalizeList(data));
    }).catch(function (error) {
      state.recent = mergeRecent([]);
      state.error = error.message || "最近账单读取失败";
    }).finally(function () {
      state.loading = false;
      render();
    });
  }

  function fillQuickEntry(text) {
    window.dispatchEvent(new CustomEvent("cl-r12-fill", {
      detail: {
        text: text,
        parse: true,
        notice: "已带入复用账单，可确认后入账。",
      },
    }));
    state.notice = "已带入：" + text;
    render();
  }

  function onClick(event) {
    var fill = event.target.closest("[data-cl-r13-fill]");
    if (fill) {
      fillQuickEntry(fill.getAttribute("data-cl-r13-fill") || "");
      return;
    }
    if (event.target.closest("[data-cl-r13-refresh]")) {
      state.notice = "已刷新最近账单。";
      loadRecent(true);
    }
  }

  function onSaved(event) {
    var detail = event.detail || {};
    var tx = detail.tx || detail.draft;
    if (!tx || !tx.amount) return;
    var item = Object.assign({}, tx, {
      note: tx.note || detail.sourceText || "",
      account_id: tx.account_id || detail.account_id || "",
      tx_date: tx.tx_date || new Date().toISOString().slice(0, 10),
      created_at: new Date().toISOString(),
    });
    var items = mergeRecent([item]);
    state.recent = items;
    storeLocal(items);
    state.notice = "上一笔已加入复用列表。";
    render();
  }

  function refresh() {
    render();
    loadRecent(false);
  }

  function scheduleRefresh() {
    timers.forEach(function (timer) { clearTimeout(timer); });
    timers = [0, 160, 500, 1000].map(function (delay) {
      return setTimeout(refresh, delay);
    });
  }

  function boot() {
    scheduleRefresh();
    window.addEventListener("cl-round-route-change", scheduleRefresh);
    window.addEventListener("cl-r12-saved", onSaved);
    document.addEventListener("click", onClick);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
