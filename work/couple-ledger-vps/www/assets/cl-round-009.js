(function () {
  "use strict";

  var ROUND_ATTR = "data-cl-round-009";
  var SNAPSHOT_KEY = "cl_round_009_snapshot";
  var LAST_BACKUP_KEY = "cl_round_009_last_backup";
  var timer = null;
  var fetchPatched = false;
  var historyPatched = false;
  var loadingPromise = null;

  var publicPaths = ["/login", "/register", "/reset-password", "/legal"];

  function html(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char];
    });
  }

  function icon(name) {
    var paths = {
      download: '<path d="M12 3v12"/><path d="M8 11l4 4 4-4"/><path d="M4 21h16"/>',
      upload: '<path d="M12 21V9"/><path d="M8 13l4-4 4 4"/><path d="M4 3h16"/>',
      copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
      refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
      database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
      check: '<path d="M5 12l5 5L20 7"/>'
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.database) + "</svg>";
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

  function authHeaders() {
    try {
      var token = JSON.parse(localStorage.getItem("cl_auth") || "{}").accessToken;
      return token ? { Authorization: "Bearer " + token } : {};
    } catch (error) {
      return {};
    }
  }

  function currentScope() {
    return localStorage.getItem("cl_scope") || "personal";
  }

  function scopeLabel() {
    return currentScope() === "couple" ? "情侣账本" : "个人账本";
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

  function sourceArray(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data && data.items)) return data.items;
    if (Array.isArray(data && data.transactions)) return data.transactions;
    if (Array.isArray(data && data.accounts)) return data.accounts;
    if (Array.isArray(data && data.categories)) return data.categories;
    if (Array.isArray(data && data.recurring)) return data.recurring;
    if (Array.isArray(data && data.data)) return data.data;
    return [];
  }

  function totalCount(data) {
    if (data && typeof data.total === "number") return data.total;
    if (data && typeof data.count === "number") return data.count;
    return sourceArray(data).length;
  }

  function requestPath(input) {
    try {
      var raw = typeof input === "string" ? input : input && input.url;
      return new URL(raw || "", location.origin).pathname;
    } catch (error) {
      return "";
    }
  }

  function requestMethod(input, init) {
    return String((init && init.method) || (input && input.method) || "GET").toUpperCase();
  }

  function saveSnapshotPatch(key, data) {
    var snapshot = readSnapshot();
    snapshot.scope = currentScope();
    snapshot.updatedAt = Date.now();
    if (key === "transactions") {
      snapshot.transactions = totalCount(data);
      snapshot.oldestDate = oldestTxDate(data) || snapshot.oldestDate || "";
    }
    if (key === "accounts") snapshot.accounts = totalCount(data);
    if (key === "categories") snapshot.categories = totalCount(data);
    if (key === "recurring") snapshot.recurring = totalCount(data);
    writeJson(SNAPSHOT_KEY, snapshot);
  }

  function patchFetch() {
    if (fetchPatched || !window.fetch) return;
    fetchPatched = true;
    var original = window.fetch;
    window.fetch = function (input, init) {
      var path = requestPath(input);
      var method = requestMethod(input, init);
      return original.apply(this, arguments).then(function (response) {
        if (response && response.ok && method === "GET") {
          if (path === "/api/transactions") {
            response.clone().json().then(function (data) { saveSnapshotPatch("transactions", data); schedule(); }).catch(function () {});
          }
          if (path === "/api/accounts") {
            response.clone().json().then(function (data) { saveSnapshotPatch("accounts", data); schedule(); }).catch(function () {});
          }
          if (path === "/api/transactions/categories/list") {
            response.clone().json().then(function (data) { saveSnapshotPatch("categories", data); schedule(); }).catch(function () {});
          }
          if (path === "/api/transactions/recurring") {
            response.clone().json().then(function (data) { saveSnapshotPatch("recurring", data); schedule(); }).catch(function () {});
          }
        }
        return response;
      });
    };
  }

  function oldestTxDate(data) {
    var dates = sourceArray(data).map(function (item) {
      return String(item.tx_date || item.date || item.created_at || "").slice(0, 10);
    }).filter(Boolean).sort();
    return dates[0] || "";
  }

  function readSnapshot() {
    var snapshot = readJson(SNAPSHOT_KEY, null);
    if (!snapshot || snapshot.scope !== currentScope()) {
      return {
        scope: currentScope(),
        transactions: null,
        accounts: null,
        categories: null,
        recurring: null,
        oldestDate: "",
        updatedAt: 0
      };
    }
    return snapshot;
  }

  function loadSnapshot(force) {
    if (location.pathname !== "/mine" || !isAuthed()) return Promise.resolve(readSnapshot());
    var snapshot = readSnapshot();
    var complete = snapshot.transactions != null && snapshot.accounts != null && snapshot.categories != null && snapshot.recurring != null;
    if (!force && complete) return Promise.resolve(snapshot);
    if (loadingPromise) return loadingPromise;
    var query = "?scope=" + encodeURIComponent(currentScope()) + "&limit=200";
    var options = { headers: authHeaders() };
    loadingPromise = Promise.all([
      fetch("/api/transactions" + query, options).then(function (response) {
        if (!response.ok) throw new Error("transactions");
        return response.json();
      }).then(function (data) { saveSnapshotPatch("transactions", data); }).catch(function () {}),
      fetch("/api/accounts", options).then(function (response) {
        if (!response.ok) throw new Error("accounts");
        return response.json();
      }).then(function (data) { saveSnapshotPatch("accounts", data); }).catch(function () {}),
      fetch("/api/transactions/categories/list", options).then(function (response) {
        if (!response.ok) throw new Error("categories");
        return response.json();
      }).then(function (data) { saveSnapshotPatch("categories", data); }).catch(function () {}),
      fetch("/api/transactions/recurring?scope=" + encodeURIComponent(currentScope()), options).then(function (response) {
        if (!response.ok) throw new Error("recurring");
        return response.json();
      }).then(function (data) { saveSnapshotPatch("recurring", data); }).catch(function () {})
    ]).finally(function () {
      loadingPromise = null;
      schedule();
    }).then(readSnapshot);
    return loadingPromise;
  }

  function formatCount(value) {
    if (value == null) return "—";
    return Number(value || 0).toLocaleString("zh-CN");
  }

  function formatDateTime(value) {
    if (!value) return "";
    var date = new Date(value);
    if (isNaN(date.getTime())) return "";
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");
    var hour = String(date.getHours()).padStart(2, "0");
    var minute = String(date.getMinutes()).padStart(2, "0");
    return month + "-" + day + " " + hour + ":" + minute;
  }

  function lastBackup() {
    var payload = readJson(LAST_BACKUP_KEY, null);
    return payload && payload.scope === currentScope() ? payload : null;
  }

  function markBackup(reason) {
    writeJson(LAST_BACKUP_KEY, {
      scope: currentScope(),
      at: new Date().toISOString(),
      reason: reason || "export"
    });
    schedule();
  }

  function panelAnchor() {
    return document.querySelector('[data-cl-round-006="compass"]') ||
      document.querySelector(".profile-hero") ||
      document.querySelector(".page-header") ||
      document.querySelector(".app-shell .page") ||
      document.querySelector("#app");
  }

  function panelNode(anchor) {
    var existing = document.querySelector("[" + ROUND_ATTR + '="backup-panel"]');
    var node = existing || document.createElement("section");
    if (!existing) {
      node.className = "cl-backup-panel";
      node.setAttribute(ROUND_ATTR, "backup-panel");
    }
    if (anchor && anchor.parentNode && node.previousElementSibling !== anchor) {
      anchor.insertAdjacentElement("afterend", node);
    }
    return node;
  }

  function setContent(node, content) {
    if (node.__round009Content === content) return;
    node.__round009Content = content;
    node.innerHTML = content;
  }

  function metric(value, label, attr) {
    return '<div class="cl-r9-metric"><strong ' + (attr ? 'data-cl-r9-metric="' + html(attr) + '"' : "") + ">" + html(formatCount(value)) + "</strong><span>" + html(label) + "</span></div>";
  }

  function check(label) {
    return '<div class="cl-r9-check"><i>✓</i><span>' + html(label) + "</span></div>";
  }

  function action(label, id, iconName, primary) {
    return '<button type="button" class="cl-r9-action ' + (primary ? "primary" : "") + '" data-cl-r9-action="' + html(id) + '">' + icon(iconName) + '<span>' + html(label) + "</span></button>";
  }

  function renderPanel() {
    if (location.pathname !== "/mine" || !isAuthed() || isPublicPath()) {
      var old = document.querySelector("[" + ROUND_ATTR + '="backup-panel"]');
      if (old) old.remove();
      return;
    }

    if (!loadingPromise) loadSnapshot(false);

    var snapshot = readSnapshot();
    var backup = lastBackup();
    var status = backup ? "已备份 " + formatDateTime(backup.at) : "未记录备份";
    var statusClass = backup ? " is-fresh" : "";
    var coverage = [
      check("账单记录 CSV"),
      check("账户与余额"),
      check("分类与图标"),
      check("周期账单")
    ].join("");
    var note = backup ?
      "当前范围：" + scopeLabel() + "。上次导出已记录，更新账单后可再次导出归档。" :
      "当前范围：" + scopeLabel() + "。建议先导出 CSV，再导入外部账单或清理缓存。";

    var content = [
      '<div class="cl-r9-head"><div class="cl-r9-copy"><span>Round 009</span><strong>数据备份台</strong><small>导出前先看范围、数量和最近一次备份记录。</small></div><span class="cl-r9-status' + statusClass + '">' + html(status) + "</span></div>",
      '<div class="cl-r9-metrics">' + [
        metric(snapshot.transactions, "账单", "transactions"),
        metric(snapshot.accounts, "账户", "accounts"),
        metric(snapshot.categories, "分类", "categories"),
        metric(snapshot.recurring, "周期", "recurring")
      ].join("") + "</div>",
      '<div class="cl-r9-checks">' + coverage + "</div>",
      '<div class="cl-r9-actions">' + [
        action("导出 CSV", "export", "download", true),
        action("导入账单", "import", "upload", false),
        action("复制清单", "copy", "copy", false),
        action("刷新状态", "refresh", "refresh", false)
      ].join("") + "</div>",
      '<p class="cl-r9-note">' + html(note) + (snapshot.oldestDate ? " 最早记录：" + html(snapshot.oldestDate) + "。" : "") + "</p>"
    ].join("");

    setContent(panelNode(panelAnchor()), content);
  }

  function textOf(node) {
    return (node && (node.innerText || node.textContent) || "").replace(/\s+/g, " ").trim();
  }

  function visible(node) {
    if (!node) return false;
    var rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function visibleButtons() {
    return Array.prototype.slice.call(document.querySelectorAll("button")).filter(visible);
  }

  function clickButtonByText(pattern) {
    var regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
    var button = visibleButtons().find(function (item) {
      if (item.closest("[data-cl-r9-action]")) return false;
      return regex.test(textOf(item));
    });
    if (button) {
      button.scrollIntoView({ block: "center", behavior: "smooth" });
      window.setTimeout(function () { button.click(); }, 120);
      return true;
    }
    return false;
  }

  function findSectionByText(pattern) {
    var regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
    var nodes = Array.prototype.slice.call(document.querySelectorAll(".card, section"));
    return nodes.find(function (node) {
      return visible(node) && regex.test(textOf(node));
    }) || null;
  }

  function tagNative(node, text) {
    if (!node) return;
    node.classList.add("cl-r9-native");
    var tag = node.querySelector("[data-cl-r9-native-tag]");
    if (!tag) {
      tag = document.createElement("span");
      tag.className = "cl-r9-native-tag";
      tag.setAttribute("data-cl-r9-native-tag", "");
      node.insertBefore(tag, node.firstChild);
    }
    if (tag.textContent !== text) tag.textContent = text;
  }

  function decorateNativeAreas() {
    if (location.pathname !== "/mine") return;
    tagNative(document.querySelector(".account-summary"), "备份范围概览");
    tagNative(document.querySelector(".backup-reminder"), "建议导出后再清理缓存");
    tagNative(document.querySelector(".data-tip"), "导入导出说明");
    var exportMenu = findSectionByText(/导入 CSV|导出 CSV|导入 \/ 导出|切换导入/);
    if (exportMenu) exportMenu.classList.add("cl-r9-native");
  }

  function hasActiveSurface() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll(".overlay, .sheet-overlay, .sheet"));
    return nodes.some(function (node) {
      if (node.closest(".cl-quick-dock")) return false;
      return visible(node);
    });
  }

  function updateSurfaceState() {
    document.body.classList.toggle("cl-modal-surface-open", hasActiveSurface());
  }

  function backupText() {
    var snapshot = readSnapshot();
    var backup = lastBackup();
    return [
      "情侣记账备份清单",
      "范围：" + scopeLabel(),
      "账单：" + formatCount(snapshot.transactions),
      "账户：" + formatCount(snapshot.accounts),
      "分类：" + formatCount(snapshot.categories),
      "周期账单：" + formatCount(snapshot.recurring),
      "最早记录：" + (snapshot.oldestDate || "未读取"),
      "上次导出：" + (backup ? formatDateTime(backup.at) : "未记录"),
      "建议：导出 CSV 后保存到常用备份位置。"
    ].join("\n");
  }

  function copyText(value) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(value).then(function () { return true; }).catch(function () {
        return fallbackCopy(value);
      });
    }
    return Promise.resolve(fallbackCopy(value));
  }

  function fallbackCopy(value) {
    var input = document.createElement("textarea");
    input.value = typeof value === "string" ? value : backupText();
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.left = "-9999px";
    document.body.appendChild(input);
    input.select();
    var ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (error) {
      ok = false;
    }
    input.remove();
    return ok;
  }

  function flash(message) {
    var old = document.querySelector(".cl-r9-flash");
    if (old) old.remove();
    var node = document.createElement("div");
    node.className = "cl-r9-flash";
    node.textContent = message;
    document.body.appendChild(node);
    window.setTimeout(function () {
      if (node.parentNode) node.remove();
    }, 1900);
  }

  function handleAction(name) {
    if (name === "export") {
      markBackup("export");
      if (!clickButtonByText(/导出 CSV 数据|立即导出|导出 CSV/)) {
        var native = findSectionByText(/导出 CSV|导入 \/ 导出/);
        if (native) native.scrollIntoView({ block: "center", behavior: "smooth" });
      }
      flash("已记录本次导出，正在打开原生导出入口");
      return;
    }
    if (name === "import") {
      if (!clickButtonByText(/导入 CSV|支付宝|微信账单/)) {
        var section = findSectionByText(/导入 CSV|导入 \/ 导出/);
        if (section) section.scrollIntoView({ block: "center", behavior: "smooth" });
      }
      flash("已定位导入入口");
      return;
    }
    if (name === "copy") {
      copyText(backupText()).then(function () {
        flash("备份清单已复制");
      });
      return;
    }
    if (name === "refresh") {
      writeJson(SNAPSHOT_KEY, null);
      loadSnapshot(true).then(function () {
        flash("备份状态已刷新");
      });
    }
  }

  function handleNativeExportClick(event) {
    var button = event.target.closest && event.target.closest("button");
    if (!button || location.pathname !== "/mine") return;
    if (/导出 CSV 数据|立即导出|导出 CSV/.test(textOf(button))) {
      markBackup("native-export");
      window.setTimeout(function () {
        flash("已记录导出时间");
      }, 180);
    }
  }

  function renderAll() {
    updateSurfaceState();
    renderPanel();
    decorateNativeAreas();
  }

  function schedule() {
    if (timer) return;
    timer = window.setTimeout(function () {
      timer = null;
      renderAll();
    }, 140);
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
    patchFetch();
    patchHistory();
    loadSnapshot(false);
    schedule();
    document.addEventListener("click", function (event) {
      var action = event.target.closest && event.target.closest("[data-cl-r9-action]");
      if (action) {
        handleAction(action.getAttribute("data-cl-r9-action"));
        return;
      }
      handleNativeExportClick(event);
      window.setTimeout(schedule, 80);
    });
    window.addEventListener("storage", schedule);
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
