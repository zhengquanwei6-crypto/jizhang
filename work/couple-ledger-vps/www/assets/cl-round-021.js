(function () {
  "use strict";

  var ATTR = "data-cl-round-021";
  var timer = 0;

  function isLedger() {
    return location.pathname === "/ledger";
  }

  function clean(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function ownSearch() {
    return document.querySelector("[data-cl-r19-input]");
  }

  function nativeSearch() {
    return Array.prototype.slice.call(document.querySelectorAll('input[placeholder*="\u641c\u7d22\u5907\u6ce8"]')).find(function (input) {
      return !input.matches("[data-cl-r19-input]");
    }) || null;
  }

  function nativeSearchWrap() {
    var input = nativeSearch();
    return input && input.closest(".search-wrap");
  }

  function globalSearchFilters() {
    return document.querySelector(".global-search-filters");
  }

  function activeFilterBox() {
    return document.querySelector(".global-active-filters") || document.querySelector(".active-filters");
  }

  function searchHint() {
    return Array.prototype.slice.call(document.querySelectorAll(".search-hint, .muted.text-sm")).find(function (node) {
      return clean(node.textContent).indexOf("\u5168\u8d26\u672c\u641c\u7d22") >= 0;
    }) || null;
  }

  function summaryPanel() {
    var node = document.querySelector("[" + ATTR + "]");
    if (!node) {
      node = document.createElement("section");
      node.setAttribute(ATTR, "filter-summary");
      node.className = "cl-r21-filter-summary";
      node.innerHTML =
        '<div class="cl-r21-summary-row">' +
          '<span class="cl-r21-summary-text" data-cl-r21-text></span>' +
          '<button type="button" class="cl-r21-clear" data-cl-r21-clear>\u6e05\u7a7a</button>' +
        "</div>" +
        '<div class="cl-r21-chip-row" data-cl-r21-chips></div>';
    }
    return node;
  }

  function insertAfter(anchor, node) {
    if (anchor && anchor.parentNode) {
      if (anchor.nextSibling !== node) anchor.parentNode.insertBefore(node, anchor.nextSibling);
      return;
    }
    var root = document.querySelector(".app-shell .page") || document.querySelector(".app-shell") || document.querySelector("#app") || document.body;
    if (node.parentNode !== root) root.appendChild(node);
  }

  function filterLabels() {
    var box = activeFilterBox();
    if (!box) return [];
    return Array.prototype.slice.call(box.querySelectorAll(".active-filter-chip")).map(function (chip) {
      return clean(chip.textContent);
    }).filter(Boolean);
  }

  function setInputValue(input, value) {
    if (!input) return;
    var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function clearFilters() {
    setInputValue(ownSearch(), "");
    setInputValue(nativeSearch(), "");

    var box = activeFilterBox();
    var clear = box && box.querySelector(".active-filters-clear");
    if (clear) {
      window.setTimeout(function () { clear.click(); }, 0);
    }
  }

  function renderSummary(active) {
    var node = summaryPanel();
    if (!active) {
      node.hidden = true;
      return;
    }

    var own = ownSearch();
    var keyword = own ? clean(own.value) : "";
    var hint = searchHint();
    var hintText = hint ? clean(hint.textContent) : "\u5168\u8d26\u672c\u641c\u7d22";
    var labels = filterLabels();
    var text = node.querySelector("[data-cl-r21-text]");
    var chips = node.querySelector("[data-cl-r21-chips]");

    text.innerHTML = "\u5f53\u524d\u7b5b\u9009\uff1a<strong>" + (keyword ? "\u641c\u7d22\u300c" + keyword + "\u300d" : hintText) + "</strong>";
    chips.innerHTML = labels.length ? labels.map(function (label) {
      return '<span class="cl-r21-chip">' + label.replace(/[&<>"']/g, function (char) {
        return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char];
      }) + "</span>";
    }).join("") : '<span class="cl-r21-chip">' + hintText + "</span>";
    node.hidden = false;

    insertAfter(document.querySelector('[data-cl-round-019="ledger-search"]') || own, node);
  }

  function sync() {
    if (!isLedger()) {
      var panel = document.querySelector("[" + ATTR + "]");
      if (panel) panel.remove();
      return;
    }

    var own = ownSearch();
    var active = !!(own && clean(own.value));
    var wrap = nativeSearchWrap();
    var filters = globalSearchFilters();

    if (wrap) wrap.classList.toggle("cl-r21-hide-native-search", active);
    if (filters) filters.classList.toggle("cl-r21-hide-native-search", active);
    renderSummary(active);
  }

  function schedule() {
    window.clearTimeout(timer);
    timer = window.setTimeout(sync, 120);
  }

  function boot() {
    schedule();
    document.addEventListener("input", schedule);
    document.addEventListener("click", function (event) {
      if (event.target.closest("[data-cl-r21-clear]")) {
        clearFilters();
      }
      schedule();
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
