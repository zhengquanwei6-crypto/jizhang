(function () {
  "use strict";

  var ATTR = "data-cl-round-020";
  var timer = 0;

  function isMine() {
    return location.pathname === "/mine";
  }

  function doneNode() {
    return document.querySelector(".cl-r11-done");
  }

  function clearImport() {
    var clear = document.querySelector("[data-cl-r11-clear]");
    if (clear) clear.click();
    var file = document.querySelector("[data-cl-r11-file]");
    if (file) {
      window.setTimeout(function () { file.focus(); }, 80);
    }
  }

  function insertActions() {
    if (!isMine()) return;
    var done = doneNode();
    if (!done) {
      var stale = document.querySelector("[" + ATTR + "]");
      if (stale) stale.remove();
      return;
    }
    if (document.querySelector("[" + ATTR + "]")) return;

    var node = document.createElement("div");
    node.setAttribute(ATTR, "import-next");
    node.className = "cl-r20-import-next";
    node.innerHTML =
      '<p class="cl-r20-import-title">\u63a5\u4e0b\u6765\u53ef\u4ee5\u8fd9\u6837\u770b</p>' +
      '<p class="cl-r20-import-desc">\u5bfc\u5165\u5b8c\u6210\u540e\uff0c\u76f4\u63a5\u68c0\u67e5\u8d26\u672c\u548c\u7edf\u8ba1\uff0c\u6216\u7ee7\u7eed\u5bfc\u5165\u4e0b\u4e00\u4e2a\u6587\u4ef6\u3002</p>' +
      '<div class="cl-r20-import-actions">' +
        '<a class="cl-r20-import-action primary" href="/ledger">\u67e5\u770b\u8d26\u672c</a>' +
        '<a class="cl-r20-import-action" href="/stats">\u770b\u7edf\u8ba1</a>' +
        '<button type="button" class="cl-r20-import-action" data-cl-r20-clear>\u7ee7\u7eed\u5bfc\u5165</button>' +
      "</div>";
    done.insertAdjacentElement("afterend", node);
  }

  function schedule() {
    window.clearTimeout(timer);
    timer = window.setTimeout(insertActions, 180);
  }

  function boot() {
    schedule();
    document.addEventListener("click", function (event) {
      if (event.target.closest("[data-cl-r20-clear]")) {
        clearImport();
        schedule();
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
