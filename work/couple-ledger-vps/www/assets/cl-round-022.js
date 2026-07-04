(function () {
  "use strict";

  var ATTR = "data-cl-round-022";
  var HEADER = "date,amount,category,type,note";
  var timer = 0;

  function isMine() {
    return location.pathname === "/mine";
  }

  function clean(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function importPanel() {
    return document.querySelector(".cl-r11-import");
  }

  function importAlert() {
    var panel = importPanel();
    return panel && panel.querySelector(".cl-r11-alert");
  }

  function hasImportError() {
    var alert = importAlert();
    if (!alert) return false;
    var text = clean(alert.textContent);
    return /No valid transactions|valid transactions|import file|HTTP 400|\u91d1\u989d|\u6709\u6548/.test(text);
  }

  function copyHeader(button) {
    var done = function () {
      button.textContent = "\u5df2\u590d\u5236";
      window.setTimeout(function () { button.textContent = "\u590d\u5236\u6807\u51c6\u8868\u5934"; }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(HEADER).then(done).catch(function () { done(); });
    } else {
      done();
    }
  }

  function clearFile() {
    var clear = document.querySelector("[data-cl-r11-clear]");
    if (clear) clear.click();
    window.setTimeout(function () {
      var file = document.querySelector("[data-cl-r11-file]");
      if (file) file.focus();
    }, 80);
  }

  function ensureHelp() {
    if (!isMine()) return;
    var alert = importAlert();
    var existing = document.querySelector("[" + ATTR + "]");
    if (!alert || !hasImportError()) {
      if (existing) existing.hidden = true;
      return;
    }

    var node = existing || document.createElement("div");
    if (!existing) {
      node.setAttribute(ATTR, "import-help");
      node.className = "cl-r22-import-help";
      node.innerHTML =
        '<p class="cl-r22-title">\u8fd9\u4e2a\u6587\u4ef6\u6ca1\u6709\u8bc6\u522b\u5230\u6709\u6548\u8d26\u5355</p>' +
        '<p class="cl-r22-desc">\u5e38\u89c1\u539f\u56e0\u662f\u7a7a\u6587\u4ef6\u3001\u7f3a\u5c11\u91d1\u989d\u5217\uff0c\u6216\u91d1\u989d\u5168\u662f 0\u3002\u53ef\u4ee5\u6309\u4e0b\u9762\u683c\u5f0f\u6539\u4e00\u4e0b\u518d\u9884\u89c8\u3002</p>' +
        '<ul class="cl-r22-list">' +
          '<li>\u5fc5\u586b\u5217\uff1adate\u3001amount\u3001category\u3001type\u3001note</li>' +
          '<li>type \u53ef\u586b expense \u6216 income</li>' +
          '<li>\u793a\u4f8b\uff1a2026-07-03,28,\u9910\u996e,expense,\u5348\u9910</li>' +
        "</ul>" +
        '<div class="cl-r22-actions">' +
          '<button type="button" class="cl-r22-action primary" data-cl-r22-copy>\u590d\u5236\u6807\u51c6\u8868\u5934</button>' +
          '<button type="button" class="cl-r22-action" data-cl-r22-clear>\u91cd\u65b0\u9009\u6587\u4ef6</button>' +
        "</div>";
    }
    node.hidden = false;
    alert.insertAdjacentElement("afterend", node);
  }

  function schedule() {
    window.clearTimeout(timer);
    timer = window.setTimeout(ensureHelp, 120);
  }

  function boot() {
    schedule();
    document.addEventListener("click", function (event) {
      var copy = event.target.closest("[data-cl-r22-copy]");
      if (copy) {
        copyHeader(copy);
        return;
      }
      if (event.target.closest("[data-cl-r22-clear]")) {
        clearFile();
      }
    });
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
