(function () {
  "use strict";

  var ATTR = "data-cl-round-019";
  var PANEL_SELECTOR = "[" + ATTR + '="ledger-search"]';
  var NATIVE_SELECTOR = 'input[placeholder*="\u641c\u7d22\u5907\u6ce8"]';
  var timer = 0;
  var historyPatched = false;

  function isLedger() {
    return location.pathname === "/ledger";
  }

  function html(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char];
    });
  }

  function icon(name) {
    var paths = {
      search: '<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
      x: '<path d="M6 6l12 12M18 6 6 18"/>'
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths[name] + "</svg>";
  }

  function nativeInput() {
    return Array.prototype.slice.call(document.querySelectorAll(NATIVE_SELECTOR)).find(function (input) {
      return !input.matches("[data-cl-r19-input]");
    }) || null;
  }

  function panel() {
    return document.querySelector(PANEL_SELECTOR);
  }

  function pageRoot() {
    return document.querySelector(".app-shell .page") || document.querySelector(".app-shell") || document.querySelector("#app") || document.body;
  }

  function insertAfter(anchor, node) {
    if (anchor && anchor.parentNode) {
      if (anchor.nextSibling !== node) anchor.parentNode.insertBefore(node, anchor.nextSibling);
      return;
    }
    var root = pageRoot();
    if (node.parentNode !== root) root.appendChild(node);
  }

  function findAnchor() {
    return document.querySelector('[data-cl-round-006="compass"]') ||
      document.querySelector(".ledger-page .ph") ||
      document.querySelector(".page-header") ||
      document.querySelector("header");
  }

  function setNativeValue(value) {
    var native = nativeInput();
    if (!native) return false;
    var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(native, value);
    native.dispatchEvent(new Event("input", { bubbles: true }));
    native.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function clickFilterToggle() {
    var buttons = Array.prototype.slice.call(document.querySelectorAll("button"));
    var toggle = buttons.find(function (button) {
      var text = (button.textContent || "").replace(/\s+/g, "");
      return text === "\u5c55\u5f00\u7b5b\u9009" || text === "\u6536\u8d77\u7b5b\u9009";
    });
    if (toggle) toggle.click();
  }

  function statusText(value) {
    if (value) return "\u6b63\u5728\u641c\u7d22\uff1a" + value;
    return "\u53ef\u4ee5\u641c\u7d22\u5907\u6ce8\u3001\u5206\u7c7b\u6216\u91d1\u989d";
  }

  function syncStatus() {
    var node = panel();
    if (!node) return;
    var input = node.querySelector("[data-cl-r19-input]");
    var status = node.querySelector("[data-cl-r19-status]");
    if (!input || !status) return;
    var value = input.value.trim();
    status.textContent = statusText(value);
    status.classList.toggle("is-active", !!value);
  }

  function ensurePanel() {
    if (!isLedger()) {
      var stale = panel();
      if (stale) stale.remove();
      return;
    }

    var native = nativeInput();
    if (!native) return;

    var node = panel();
    if (!node) {
      node = document.createElement("section");
      node.setAttribute(ATTR, "ledger-search");
      node.className = "cl-r19-ledger-search";
      node.innerHTML =
        '<div class="cl-r19-head"><div><span class="cl-r19-kicker">Round 019</span><p class="cl-r19-title">\u641c\u7d22\u8d26\u5355</p></div><button type="button" class="cl-r19-filter" data-cl-r19-filter>\u7b5b\u9009</button></div>' +
        '<div class="cl-r19-row"><label class="cl-r19-input-wrap">' +
          '<span class="cl-r19-icon">' + icon("search") + "</span>" +
          '<input class="cl-r19-input" data-cl-r19-input type="search" autocomplete="off" inputmode="search" aria-label="\u641c\u7d22\u8d26\u5355" placeholder="\u641c\u7d22\u5907\u6ce8 / \u5206\u7c7b / \u91d1\u989d">' +
        '</label><button type="button" class="cl-r19-clear" data-cl-r19-clear aria-label="\u6e05\u7a7a\u641c\u7d22">' + icon("x") + '</button></div>' +
        '<div class="cl-r19-status" data-cl-r19-status></div>';
    }

    insertAfter(findAnchor(), node);
    var ownInput = node.querySelector("[data-cl-r19-input]");
    if (ownInput && document.activeElement !== ownInput && ownInput.value !== native.value) {
      ownInput.value = native.value || "";
    }
    syncStatus();
  }

  function schedule(delay) {
    if (timer) return;
    timer = window.setTimeout(function () {
      timer = 0;
      ensurePanel();
    }, delay == null ? 180 : delay);
  }

  function patchHistory() {
    if (historyPatched) return;
    historyPatched = true;
    ["pushState", "replaceState"].forEach(function (name) {
      var original = history[name];
      history[name] = function () {
        var result = original.apply(this, arguments);
        schedule(220);
        return result;
      };
    });
    window.addEventListener("popstate", function () { schedule(220); });
  }

  function boot() {
    patchHistory();
    schedule(240);

    document.addEventListener("input", function (event) {
      if (!event.target.matches("[data-cl-r19-input]")) return;
      setNativeValue(event.target.value);
      syncStatus();
    });

    document.addEventListener("click", function (event) {
      var clear = event.target.closest("[data-cl-r19-clear]");
      if (clear) {
        var node = panel();
        var input = node && node.querySelector("[data-cl-r19-input]");
        if (input) {
          input.value = "";
          setNativeValue("");
          input.focus();
          syncStatus();
        }
        return;
      }

      if (event.target.closest("[data-cl-r19-filter]")) {
        clickFilterToggle();
        window.setTimeout(function () {
          var input = panel() && panel().querySelector("[data-cl-r19-input]");
          if (input) input.focus();
        }, 80);
      }
    });

    new MutationObserver(function () { schedule(220); }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
