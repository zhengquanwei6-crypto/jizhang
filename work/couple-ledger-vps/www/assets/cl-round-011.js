(function () {
  "use strict";

  var ROUND_ATTR = "data-cl-round-011";
  var publicPaths = ["/login", "/register", "/reset-password", "/legal"];
  var selectedFile = null;
  var timer = null;
  var historyPatched = false;
  var state = {
    preview: null,
    result: null,
    loading: false,
    importing: false,
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
      upload: '<path d="M12 21V9"/><path d="M8 13l4-4 4 4"/><path d="M4 3h16"/>',
      table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M9 4v16"/><path d="M15 4v16"/>',
      eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
      check: '<path d="M5 12l5 5L20 7"/>',
      copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
      alert: '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>'
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.table) + "</svg>";
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

  function money(value) {
    var num = Number(value || 0);
    return "¥" + num.toLocaleString("zh-CN", { maximumFractionDigits: num % 1 ? 2 : 0 });
  }

  function fileSize(file) {
    if (!file) return "";
    if (file.size >= 1024 * 1024) return (file.size / 1024 / 1024).toFixed(1) + " MB";
    return Math.max(Math.round(file.size / 1024), 1) + " KB";
  }

  function summarize(items) {
    var list = items || [];
    var income = 0;
    var expense = 0;
    var dates = [];
    list.forEach(function (item) {
      var amount = Number(item.amount || 0);
      if (item.type === "income") income += amount;
      else expense += amount;
      if (item.tx_date) dates.push(String(item.tx_date).slice(0, 10));
    });
    dates.sort();
    return {
      income: income,
      expense: expense,
      start: dates[0] || "",
      end: dates[dates.length - 1] || ""
    };
  }

  function pageRoot() {
    return document.querySelector(".app-shell .page") || document.querySelector(".app-shell") || document.querySelector("#app") || document.body;
  }

  function panelAnchor() {
    return document.querySelector('[data-cl-round-009="backup-panel"]') ||
      document.querySelector('[data-cl-round-006="compass"]') ||
      document.querySelector(".profile-hero") ||
      pageRoot();
  }

  function removePanel() {
    var node = document.querySelector("[" + ROUND_ATTR + '="panel"]');
    if (node) node.remove();
  }

  function panelNode(anchor) {
    var existing = document.querySelector("[" + ROUND_ATTR + '="panel"]');
    var node = existing || document.createElement("section");
    if (!existing) {
      node.className = "cl-r11-import";
      node.setAttribute(ROUND_ATTR, "panel");
    }
    if (anchor && anchor.parentNode && (node.parentNode !== anchor.parentNode || node.previousElementSibling !== anchor)) {
      anchor.parentNode.insertBefore(node, anchor.nextSibling);
    }
    return node;
  }

  function metric(label, value, tone) {
    return '<div class="cl-r11-metric ' + html(tone || "") + '"><span>' + html(label) + '</span><strong>' + html(value) + "</strong></div>";
  }

  function previewMetrics(data) {
    if (!data) return "";
    var summary = summarize(data.preview || []);
    var range = summary.start && summary.end ? summary.start + " ~ " + summary.end : "待识别";
    return '<div class="cl-r11-metrics">' +
      metric("可导入", String(data.count || 0) + " 笔", "gold") +
      metric("收入", money(summary.income), "sage") +
      metric("支出", money(summary.expense), "blue") +
      metric("日期范围", range, "ink") +
      "</div>";
  }

  function previewList(data) {
    var rows = (data && data.preview) || [];
    if (!rows.length) {
      return '<div class="cl-r11-empty"><strong>等待预览</strong><span>选择 CSV 或 XLSX 后先查看识别结果。</span></div>';
    }
    return '<div class="cl-r11-preview-list">' + rows.slice(0, 6).map(function (item) {
      var typeText = item.type === "income" ? "收入" : "支出";
      return '<div class="cl-r11-row"><strong>' + html(item.tx_date || "") + '</strong><span>' + html(item.category || "") + '</span><em class="' + html(item.type || "expense") + '">' + html(typeText) + " " + html(money(item.amount)) + '</em><small>' + html(item.note || "无备注") + "</small></div>";
    }).join("") + "</div>";
  }

  function renderResult() {
    var data = state.preview || state.result;
    var result = state.result;
    return '<div class="cl-r11-result">' +
      previewMetrics(data) +
      (result ? '<div class="cl-r11-done">' + icon("check") + '<span>已导入 ' + html(result.imported || 0) + ' 笔，跳过重复 ' + html(result.skipped || 0) + ' 笔。</span></div>' : "") +
      previewList(data) +
      "</div>";
  }

  function render() {
    if (location.pathname !== "/mine" || !isAuthed() || isPublicPath()) {
      removePanel();
      return;
    }
    var anchor = panelAnchor();
    if (!anchor) return;
    var node = panelNode(anchor);
    var fileText = selectedFile ? selectedFile.name + " · " + fileSize(selectedFile) : "选择 CSV / XLSX 文件";
    var canPreview = !!selectedFile && !state.loading && !state.importing;
    var canImport = !!selectedFile && !!state.preview && !state.loading && !state.importing;
    node.innerHTML =
      '<div class="cl-r11-head"><div class="cl-r11-title"><span>Round 011</span><strong>Excel 导入助手</strong><small>' + html(scopeLabel()) + ' · 先预览，再落账</small></div><span class="cl-r11-format">' + icon("table") + "CSV / XLSX</span></div>" +
      '<label class="cl-r11-file"><input type="file" data-cl-r11-file accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"><span>' + icon("upload") + '</span><strong>' + html(fileText) + '</strong><small>支持本系统导出表、通用 Excel、支付宝/微信 CSV</small></label>' +
      '<div class="cl-r11-actions"><button type="button" class="cl-r11-action primary" data-cl-r11-preview ' + (!canPreview ? "disabled" : "") + ">" + icon("eye") + '<span>' + (state.loading ? "预览中" : "预览识别") + '</span></button><button type="button" class="cl-r11-action" data-cl-r11-import ' + (!canImport ? "disabled" : "") + ">" + icon("check") + '<span>' + (state.importing ? "导入中" : "确认导入") + '</span></button><button type="button" class="cl-r11-action ghost" data-cl-r11-template>' + icon("copy") + '<span>复制表头</span></button><button type="button" class="cl-r11-action ghost" data-cl-r11-clear><span>清空</span></button></div>' +
      (state.error ? '<div class="cl-r11-alert">' + icon("alert") + '<span>' + html(state.error) + "</span></div>" : "") +
      (state.notice ? '<div class="cl-r11-notice">' + html(state.notice) + "</div>" : "") +
      renderResult();
  }

  function upload(dryRun) {
    if (!selectedFile) {
      state.error = "请先选择 CSV 或 XLSX 文件。";
      render();
      return;
    }
    state.error = "";
    state.notice = "";
    state.loading = !!dryRun;
    state.importing = !dryRun;
    render();
    var form = new FormData();
    form.append("file", selectedFile);
    fetch("/api/data/import/bills?scope=" + encodeURIComponent(currentScope()) + "&dry_run=" + (dryRun ? "true" : "false"), {
      method: "POST",
      headers: authHeaders(),
      body: form
    }).then(function (response) {
      if (!response.ok) {
        return response.json().catch(function () { return {}; }).then(function (body) {
          throw new Error(body.detail || "导入文件解析失败");
        });
      }
      return response.json();
    }).then(function (data) {
      if (dryRun) {
        state.preview = data;
        state.result = null;
        state.notice = "预览完成，确认无误后再导入。";
      } else {
        state.result = data;
        state.preview = data;
        state.notice = "导入完成，可到统计或账本页查看。";
      }
    }).catch(function (error) {
      state.error = error.message || "导入失败，请检查文件格式。";
    }).finally(function () {
      state.loading = false;
      state.importing = false;
      render();
    });
  }

  function copyHeaders() {
    var text = "日期,分类,类型,金额,备注\n2026-07-03,餐饮,expense,35,午餐";
    var done = function () {
      state.notice = "表头已复制。";
      render();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(done);
    } else {
      done();
    }
  }

  function scrollToPanel() {
    var node = document.querySelector("[" + ROUND_ATTR + '="panel"]');
    if (node) node.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  function clearAll() {
    selectedFile = null;
    state.preview = null;
    state.result = null;
    state.error = "";
    state.notice = "";
    render();
  }

  function onClick(event) {
    if (event.target.closest("[data-cl-r11-preview]")) {
      upload(true);
      return;
    }
    if (event.target.closest("[data-cl-r11-import]")) {
      upload(false);
      return;
    }
    if (event.target.closest("[data-cl-r11-template]")) {
      copyHeaders();
      return;
    }
    if (event.target.closest("[data-cl-r11-clear]")) {
      clearAll();
      return;
    }
    if (event.target.closest('[data-cl-r9-action="import"]')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      state.notice = "已打开 Excel 导入助手。";
      render();
      window.setTimeout(scrollToPanel, 80);
    }
  }

  function onChange(event) {
    if (!event.target.matches("[data-cl-r11-file]")) return;
    selectedFile = event.target.files && event.target.files[0] ? event.target.files[0] : null;
    state.preview = null;
    state.result = null;
    state.error = "";
    state.notice = selectedFile ? "文件已选择，可以先预览。" : "";
    render();
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
    patchHistory();
    document.addEventListener("click", onClick, true);
    document.addEventListener("change", onChange);
    schedule();
    setInterval(schedule, 1400);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
