(function () {
  "use strict";

  var RESTORE_WINDOW_MS = 6000;
  var RESTORE_SELECTOR = [
    "[data-cl-r12-input]",
    "[data-cl-r14-text]",
    "[data-cl-r10-input]",
    ".search-input",
    ".pin-search-input",
    ".msg-input",
    ".input",
    ".textarea",
    "input",
    "textarea",
    "select"
  ].join(",");

  var tracked = null;
  var restoreTimer = 0;
  var lastScrollY = window.scrollY || 0;
  var lastScrollIntent = { direction: "", at: 0, y: 0 };
  var touchStartY = null;

  function now() {
    return Date.now();
  }

  function isEditable(node) {
    return !!(node && node.matches && node.matches(RESTORE_SELECTOR) && !node.disabled && !node.readOnly);
  }

  function selectorFor(node) {
    if (!node || !node.matches) return "";
    var attrs = [
      "data-cl-r12-input",
      "data-cl-r14-text",
      "data-cl-r10-input",
      "data-cl-r12-draft",
      "data-cl-r14-field",
      "data-cl-r14-account",
      "data-cl-r12-account"
    ];

    for (var i = 0; i < attrs.length; i += 1) {
      if (node.hasAttribute(attrs[i])) {
        var value = node.getAttribute(attrs[i]);
        return value ? "[" + attrs[i] + "=\"" + cssEscape(value) + "\"]" : "[" + attrs[i] + "]";
      }
    }

    if (node.name) return node.tagName.toLowerCase() + "[name=\"" + cssEscape(node.name) + "\"]";
    if (node.placeholder) return node.tagName.toLowerCase() + "[placeholder=\"" + cssEscape(node.placeholder) + "\"]";
    if (node.classList && node.classList.length) {
      return node.tagName.toLowerCase() + "." + Array.prototype.slice.call(node.classList).map(cssEscape).join(".");
    }
    return "";
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(String(value));
    return String(value).replace(/["\\]/g, "\\$&");
  }

  function remember(node, composing) {
    if (!isEditable(node)) return;
    tracked = {
      node: node,
      selector: selectorFor(node),
      value: "value" in node ? node.value : "",
      start: typeof node.selectionStart === "number" ? node.selectionStart : null,
      end: typeof node.selectionEnd === "number" ? node.selectionEnd : null,
      path: location.pathname,
      scrollY: window.scrollY || 0,
      at: now(),
      composing: !!composing
    };
  }

  function refreshTracked(event, composing) {
    var target = event && event.target;
    if (!isEditable(target)) return;
    remember(target, composing || (tracked && tracked.composing));
  }

  function findReplacement() {
    if (!tracked || !tracked.selector) return null;
    try {
      return document.querySelector(tracked.selector);
    } catch (error) {
      return null;
    }
  }

  function shouldRestoreFocus() {
    if (!tracked || now() - tracked.at > RESTORE_WINDOW_MS) return false;
    if (location.pathname !== tracked.path) return false;
    if (tracked.node && document.contains(tracked.node)) return false;
    var active = document.activeElement;
    return !active || active === document.body || active === document.documentElement || tracked.composing;
  }

  function restoreFocus() {
    restoreTimer = 0;
    if (!shouldRestoreFocus()) return;
    var node = findReplacement();
    if (!isEditable(node)) return;

    if ("value" in node && tracked.value && node.value !== tracked.value) {
      node.value = tracked.value;
      node.dispatchEvent(new Event("input", { bubbles: true }));
    }

    try {
      node.focus({ preventScroll: true });
    } catch (error) {
      node.focus();
    }

    if (tracked.start !== null && typeof node.setSelectionRange === "function") {
      try {
        node.setSelectionRange(tracked.start, tracked.end == null ? tracked.start : tracked.end);
      } catch (error) {
        // Some input types, such as date/month, do not support selection ranges.
      }
    }

    if (Math.abs((window.scrollY || 0) - tracked.scrollY) > 6) {
      window.scrollTo(0, tracked.scrollY);
    }

    tracked.node = node;
    tracked.at = now();
  }

  function scheduleRestore() {
    if (restoreTimer) return;
    restoreTimer = window.setTimeout(restoreFocus, 0);
  }

  function dismissBlockingTour() {
    var overlay = document.querySelector(".overlay[data-v-c8822885]");
    if (!overlay || overlay.__clRound015Dismissed) return;
    var buttons = Array.prototype.slice.call(overlay.querySelectorAll("button"));
    var skip = buttons.find(function (button) {
      return /\bbtn-ghost\b/.test(button.className || "");
    });
    if (!skip) return;
    overlay.__clRound015Dismissed = true;
    window.setTimeout(function () {
      if (document.contains(skip)) skip.click();
    }, 40);
  }

  function guardScrollAfterMutation(beforeY) {
    window.requestAnimationFrame(function () {
      var current = window.scrollY || 0;
      var intentIsUp = lastScrollIntent.direction === "up" && now() - lastScrollIntent.at < 450;
      if (intentIsUp && current > beforeY + 24) {
        window.scrollTo(0, beforeY);
      }
    });
  }

  function onMutation() {
    var beforeY = window.scrollY || 0;
    dismissBlockingTour();
    scheduleRestore();
    guardScrollAfterMutation(beforeY);
  }

  function installObserver() {
    if (!document.body) return;
    dismissBlockingTour();
    new MutationObserver(onMutation).observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener("focusin", function (event) {
    refreshTracked(event, false);
  }, true);

  document.addEventListener("input", function (event) {
    refreshTracked(event, false);
  }, true);

  document.addEventListener("compositionstart", function (event) {
    refreshTracked(event, true);
  }, true);

  document.addEventListener("compositionupdate", function (event) {
    refreshTracked(event, true);
  }, true);

  document.addEventListener("compositionend", function (event) {
    refreshTracked(event, false);
    if (tracked) tracked.composing = false;
  }, true);

  window.addEventListener("wheel", function (event) {
    lastScrollIntent = {
      direction: event.deltaY < 0 ? "up" : "down",
      at: now(),
      y: window.scrollY || 0
    };
  }, { passive: true });

  window.addEventListener("touchstart", function (event) {
    touchStartY = event.touches && event.touches[0] ? event.touches[0].clientY : null;
  }, { passive: true });

  window.addEventListener("touchmove", function (event) {
    if (touchStartY == null || !event.touches || !event.touches[0]) return;
    var y = event.touches[0].clientY;
    lastScrollIntent = {
      direction: y > touchStartY ? "up" : "down",
      at: now(),
      y: window.scrollY || 0
    };
  }, { passive: true });

  window.addEventListener("scroll", function () {
    lastScrollY = window.scrollY || 0;
  }, { passive: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installObserver);
  } else {
    installObserver();
  }
})();
