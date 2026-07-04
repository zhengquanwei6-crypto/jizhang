(function () {
  "use strict";

  var quickSyncTimer = 0;

  function visible(node) {
    if (!node) return false;
    var style = getComputedStyle(node);
    var rect = node.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  }

  function buttonText(button) {
    return (button && button.textContent || "").replace(/\s+/g, " ").trim();
  }

  function recurringAddButton() {
    var buttons = Array.prototype.slice.call(document.querySelectorAll("button"));
    return buttons.find(function (button) {
      return visible(button) &&
        !button.closest(".cl-route-compass") &&
        buttonText(button) === "添加" &&
        String(button.className || "").indexOf("btn-primary") >= 0;
    }) || buttons.find(function (button) {
      return visible(button) &&
        !button.closest(".cl-route-compass") &&
        buttonText(button) === "添加周期账单";
    }) || document.querySelector(".fab");
  }

  function openRecurringAdd() {
    if (location.pathname !== "/recurring") return false;
    var button = recurringAddButton();
    if (!button || !visible(button)) return false;
    button.click();
    return true;
  }

  function syncQuickDock() {
    quickSyncTimer = 0;
    var dock = document.querySelector(".cl-quick-dock");
    if (!dock) return;
    var panel = dock.querySelector(".cl-quick-panel");
    var main = dock.querySelector(".cl-quick-main");
    var open = dock.classList.contains("is-open") && !dock.hidden;

    if (main) {
      main.setAttribute("aria-expanded", open ? "true" : "false");
      main.setAttribute("aria-label", open ? "收起快捷操作" : "打开快捷操作");
      if (panel) {
        if (!panel.id) panel.id = "cl-quick-panel";
        main.setAttribute("aria-controls", panel.id);
      }
    }

    if (!panel) return;
    panel.setAttribute("role", "menu");

    Array.prototype.slice.call(panel.querySelectorAll("button")).forEach(function (button) {
      if (open) {
        if (button.__clRound016TabIndex === null) button.removeAttribute("tabindex");
        else if (button.__clRound016TabIndex !== undefined) button.tabIndex = button.__clRound016TabIndex;
        button.removeAttribute("aria-hidden");
      } else {
        if (button.__clRound016TabIndex === undefined) {
          button.__clRound016TabIndex = button.hasAttribute("tabindex") ? button.tabIndex : null;
        }
        button.tabIndex = -1;
        button.setAttribute("aria-hidden", "true");
      }
    });

    if (open) {
      panel.removeAttribute("inert");
      panel.removeAttribute("aria-hidden");
    } else {
      panel.setAttribute("inert", "");
      panel.setAttribute("aria-hidden", "true");
    }
  }

  function scheduleQuickSync() {
    if (quickSyncTimer) return;
    quickSyncTimer = window.setTimeout(syncQuickDock, 0);
  }

  function labelRecurringSheet() {
    if (location.pathname !== "/recurring") return;
    var sheet = document.querySelector(".sheet-overlay");
    if (!sheet) return;
    Array.prototype.slice.call(sheet.querySelectorAll("input, select, textarea")).forEach(function (field) {
      if (field.getAttribute("aria-label")) return;
      var placeholder = field.getAttribute("placeholder");
      if (placeholder) field.setAttribute("aria-label", placeholder);
    });
  }

  document.addEventListener("click", function (event) {
    var routeAction = event.target && event.target.closest ? event.target.closest('[data-cl-route-action="addRecurring"]') : null;
    if (routeAction && location.pathname === "/recurring") {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.setTimeout(openRecurringAdd, 0);
      return;
    }
    window.setTimeout(function () {
      syncQuickDock();
      labelRecurringSheet();
    }, 0);
  }, true);

  document.addEventListener("keydown", function (event) {
    var routeAction = event.target.closest && event.target.closest('[data-cl-route-action="addRecurring"]');
    if (!routeAction || location.pathname !== "/recurring") return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.setTimeout(openRecurringAdd, 0);
  }, true);

  function installObserver() {
    if (!document.body) return;
    syncQuickDock();
    labelRecurringSheet();
    new MutationObserver(function () {
      scheduleQuickSync();
      window.setTimeout(labelRecurringSheet, 0);
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "hidden"] });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installObserver);
  } else {
    installObserver();
  }
})();
