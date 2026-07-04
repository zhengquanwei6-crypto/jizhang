(function () {
  "use strict";

  var LAST_TX_KEY = "cl_round_003_last_tx";
  var observerTimer = null;
  var fetchPatched = false;

  function patchFetchForLastTransaction() {
    if (fetchPatched || !window.fetch) return;
    fetchPatched = true;
    var originalFetch = window.fetch;
    window.fetch = async function () {
      var args = Array.prototype.slice.call(arguments);
      var input = args[0];
      var init = args[1] || {};
      var url = typeof input === "string" ? input : input && input.url;
      var method = (init.method || (input && input.method) || "GET").toUpperCase();
      var response = await originalFetch.apply(this, args);
      try {
        if (method === "POST" && /\/api\/transactions(?:\?|$)/.test(String(url || "")) && response.ok && init.body) {
          var body = typeof init.body === "string" ? JSON.parse(init.body) : null;
          if (body) {
            localStorage.setItem(LAST_TX_KEY, JSON.stringify({
              type: body.type || "expense",
              category: body.category || "",
              note: body.note || "",
              account_id: body.account_id || "",
              paid_by: body.paid_by || "",
              split_type: body.split_type || "",
              saved_at: Date.now()
            }));
          }
        }
      } catch (error) {
        // Best-effort memory only.
      }
      return response;
    };
  }

  function getSheet() {
    return document.querySelector(".sheet-overlay .sheet") || document.querySelector(".sheet");
  }

  function getTransactionSheet() {
    var sheet = getSheet();
    if (!sheet) return null;
    var hasAmountKeys = sheet.querySelector("button.key");
    var hasCategoryGrid = sheet.querySelector(".cat-cell");
    var hasNote = sheet.querySelector(".input.note");
    var hasSave = sheet.querySelector(".save");
    return hasAmountKeys && hasCategoryGrid && hasNote && hasSave ? sheet : null;
  }

  function visibleControls(sheet, selector) {
    return Array.prototype.slice.call(sheet.querySelectorAll(selector)).filter(function (el) {
      var rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
  }

  function icon(name) {
    var paths = {
      check: '<path d="M5 12l5 5L20 7"/>',
      info: '<circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 8h.01"/>'
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.info) + "</svg>";
  }

  function readLastTx() {
    try {
      var parsed = JSON.parse(localStorage.getItem(LAST_TX_KEY) || "null");
      if (!parsed || Date.now() - parsed.saved_at > 1000 * 60 * 60 * 24 * 14) return null;
      return parsed;
    } catch (error) {
      return null;
    }
  }

  function getAmount(sheet) {
    var text = sheet.innerText || "";
    var match = text.match(/¥\s*([0-9]+(?:\.[0-9]{1,2})?)/);
    return match ? Number(match[1]) : 0;
  }

  function getType(sheet) {
    var active = visibleControls(sheet, "button").find(function (btn) {
      var text = btn.textContent.trim();
      return (text === "支出" || text === "收入") && btn.className.indexOf("on") !== -1;
    });
    return active ? active.textContent.trim() : "支出";
  }

  function getCategory(sheet) {
    var active = visibleControls(sheet, ".cat-cell").find(function (btn) {
      return String(btn.className).indexOf("on") !== -1;
    });
    return active ? active.textContent.trim() : "";
  }

  function getNote(sheet) {
    var input = sheet.querySelector(".input.note");
    return input ? input.value.trim() : "";
  }

  function setInputValue(input, value) {
    if (!input) return;
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function clickButtonText(sheet, text) {
    var btn = visibleControls(sheet, "button").find(function (item) {
      return item.textContent.trim() === text;
    });
    if (btn) btn.click();
  }

  function clickCategory(sheet, category) {
    if (!category) return;
    var btn = visibleControls(sheet, ".cat-cell").find(function (item) {
      return item.textContent.trim() === category;
    });
    if (btn) btn.click();
  }

  function setSelectValue(select, value) {
    if (!select || !value) return;
    var option = Array.prototype.find.call(select.options, function (item) {
      return item.value === value || item.textContent.trim() === value;
    });
    if (!option) return;
    select.value = option.value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function ensureHelper(sheet) {
    if (sheet.querySelector(".cl-tx-form-helper")) return;
    var head = sheet.querySelector(".sheet-head");
    var helper = document.createElement("div");
    helper.className = "cl-tx-form-helper";
    helper.innerHTML = "<strong>快速记账</strong><span>先输入金额，确认分类和日期，备注可以稍后补。</span>";
    if (head) head.insertAdjacentElement("afterend", helper);
  }

  function ensureLastReuse(sheet) {
    var last = readLastTx();
    var existing = sheet.querySelector(".cl-tx-last");
    if (!existing) {
      existing = document.createElement("div");
      existing.className = "cl-tx-last";
      existing.innerHTML = '<div class="cl-tx-last-copy"><strong>复用上一笔</strong><span></span></div><button type="button">套用</button>';
      var after = sheet.querySelector(".cl-tx-form-helper") || sheet.querySelector(".sheet-head");
      if (after) after.insertAdjacentElement("afterend", existing);
      existing.querySelector("button").addEventListener("click", function () {
        var saved = readLastTx();
        if (!saved) return;
        clickButtonText(sheet, saved.type === "income" ? "收入" : "支出");
        window.setTimeout(function () {
          clickCategory(sheet, saved.category);
          setSelectValue(sheet.querySelector("select"), saved.account_id);
          if (saved.note) setInputValue(sheet.querySelector(".input.note"), saved.note);
          updateAssist(sheet);
        }, 80);
      });
    }
    if (!last) {
      existing.classList.remove("is-visible");
      return;
    }
    existing.querySelector("span").textContent = [last.type === "income" ? "收入" : "支出", last.category, last.note || "无备注"].filter(Boolean).join(" · ");
    existing.classList.add("is-visible");
  }

  function ensureNoteSuggestions(sheet) {
    if (sheet.querySelector(".cl-note-suggestions")) return;
    var note = sheet.querySelector(".input.note");
    if (!note) return;
    var wrap = document.createElement("div");
    wrap.className = "cl-note-suggestions";
    ["午餐", "晚餐", "通勤", "咖啡", "日用品", "房租", "会员"].forEach(function (label) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "cl-note-chip";
      chip.textContent = label;
      chip.addEventListener("click", function () {
        var current = note.value.trim();
        setInputValue(note, current ? current + " " + label : label);
        note.focus();
        updateAssist(sheet);
      });
      wrap.appendChild(chip);
    });
    note.insertAdjacentElement("afterend", wrap);
  }

  function ensureAssist(sheet) {
    if (document.querySelector(".cl-tx-assist")) return;
    var assist = document.createElement("div");
    assist.className = "cl-tx-assist";
    assist.innerHTML = '<div class="cl-tx-assist-text"><strong>先输入金额</strong><span>分类和日期已在表单里确认</span></div><button type="button">完成</button>';
    assist.querySelector("button").addEventListener("click", function () {
      var amount = getAmount(sheet);
      if (!amount) {
        assist.classList.remove("cl-tx-nudge");
        void assist.offsetWidth;
        assist.classList.add("cl-tx-nudge");
        updateAssist(sheet, "先输入金额，再保存");
        return;
      }
      var save = sheet.querySelector(".save");
      if (save) save.click();
    });
    document.body.appendChild(assist);
  }

  function updateAssist(sheet, override) {
    var assist = document.querySelector(".cl-tx-assist");
    if (!assist) return;
    var amount = getAmount(sheet);
    var type = getType(sheet);
    var category = getCategory(sheet) || "未选分类";
    var note = getNote(sheet);
    var title = assist.querySelector("strong");
    var sub = assist.querySelector("span");
    var btn = assist.querySelector("button");
    assist.classList.toggle("cl-needs-input", !amount);
    btn.classList.toggle("is-disabled", !amount);
    title.textContent = override || (amount ? type + " ¥" + amount.toFixed(2) : "先输入金额");
    sub.textContent = amount ? category + (note ? " · " + note : " · 备注可选") : "确认金额后即可完成记账";
  }

  function cleanupIfClosed(sheet) {
    if (sheet) return;
    document.body.classList.remove("cl-tx-sheet-open");
    var assist = document.querySelector(".cl-tx-assist");
    if (assist) assist.remove();
  }

  function enhanceSheet() {
    var sheet = getTransactionSheet();
    cleanupIfClosed(sheet);
    if (!sheet) return;
    document.body.classList.add("cl-tx-sheet-open");
    var dock = document.querySelector(".cl-quick-dock");
    if (dock) dock.classList.remove("is-open");
    ensureHelper(sheet);
    ensureLastReuse(sheet);
    ensureNoteSuggestions(sheet);
    ensureAssist(sheet);
    updateAssist(sheet);
  }

  function scheduleEnhance() {
    window.clearTimeout(observerTimer);
    observerTimer = window.setTimeout(enhanceSheet, 80);
  }

  function boot() {
    patchFetchForLastTransaction();
    scheduleEnhance();
    document.addEventListener("click", scheduleEnhance, true);
    document.addEventListener("input", scheduleEnhance, true);
    document.addEventListener("change", scheduleEnhance, true);
    new MutationObserver(scheduleEnhance).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
