(function () {
  "use strict";

  var ATTR = "data-cl-round-023";
  var OPEN_KEY = "cl_r23_home_drawer_open";
  var timer = 0;

  function isHome() {
    return location.pathname === "/home" || location.pathname === "/";
  }

  function isOpen() {
    return localStorage.getItem(OPEN_KEY) === "1";
  }

  function quickPanel() {
    return document.querySelector('[data-cl-round-012="panel"]');
  }

  function hasDraft(panel) {
    return !!(panel && panel.querySelector(".cl-r12-draft"));
  }

  function hasText(panel) {
    var input = panel && panel.querySelector("[data-cl-r12-input]");
    return !!(input && input.value.trim());
  }

  function homeRoot() {
    return document.querySelector(".app-shell .page") || document.querySelector(".page") || document.querySelector("#app") || document.body;
  }

  function navigate(path) {
    if (location.pathname === path) {
      window.dispatchEvent(new Event("cl-round-route-change"));
    } else {
      location.href = path;
    }
  }

  function ensureDrawer(panel) {
    var existing = document.querySelector("[" + ATTR + '="home-drawer"]');
    var node = existing || document.createElement("section");
    if (!existing) {
      node.className = "cl-r23-home-drawer";
      node.setAttribute(ATTR, "home-drawer");
      node.innerHTML =
        '<button type="button" class="cl-r23-drawer-toggle" data-cl-r23-toggle aria-expanded="false"><span></span><i aria-hidden="true"></i></button>' +
        '<div class="cl-r23-mini-tools" aria-label="\u5e38\u7528\u5165\u53e3">' +
          '<button type="button" data-cl-r23-go="/ledger">\u8d26\u672c</button>' +
          '<button type="button" data-cl-r23-go="/budgets">\u9884\u7b97</button>' +
          '<button type="button" data-cl-r23-go="/stats">\u7edf\u8ba1</button>' +
        "</div>";
    }
    if (panel && panel.parentNode && node.previousElementSibling !== panel) {
      panel.parentNode.insertBefore(node, panel.nextSibling);
    } else if (!panel && !existing) {
      homeRoot().appendChild(node);
    }
    return node;
  }

  function apply() {
    var home = isHome();
    document.body.classList.toggle("cl-r23-home", home);
    if (!home) {
      document.body.classList.remove("cl-r23-home-collapsed", "cl-r23-home-expanded");
      return;
    }

    var panel = quickPanel();
    var open = isOpen();
    var compact = panel && !open && !hasDraft(panel) && !hasText(panel);
    document.body.classList.toggle("cl-r23-home-collapsed", !open);
    document.body.classList.toggle("cl-r23-home-expanded", open);
    if (panel) panel.classList.toggle("cl-r23-quick-collapsed", !!compact);

    var drawer = ensureDrawer(panel);
    var toggle = drawer.querySelector("[data-cl-r23-toggle]");
    var label = toggle && toggle.querySelector("span");
    if (toggle) toggle.setAttribute("aria-expanded", String(open));
    if (label) label.textContent = open ? "\u6536\u8d77\u9996\u9875\u5de5\u5177" : "\u5c55\u5f00\u66f4\u591a\u9996\u9875\u5de5\u5177";
  }

  function schedule() {
    window.clearTimeout(timer);
    timer = window.setTimeout(apply, 80);
  }

  function boot() {
    schedule();
    document.addEventListener("click", function (event) {
      if (event.target.closest("[data-cl-r23-toggle]")) {
        localStorage.setItem(OPEN_KEY, isOpen() ? "0" : "1");
        schedule();
        return;
      }
      var go = event.target.closest("[data-cl-r23-go]");
      if (go) navigate(go.getAttribute("data-cl-r23-go"));
    });
    document.addEventListener("input", function (event) {
      if (event.target.matches && event.target.matches("[data-cl-r12-input]")) schedule();
    }, true);
    ["focusin", "focusout"].forEach(function (name) {
      document.addEventListener(name, function (event) {
        if (event.target.matches && event.target.matches("[data-cl-r12-input]")) schedule();
      }, true);
    });
    ["pushState", "replaceState"].forEach(function (name) {
      var original = history[name];
      history[name] = function () {
        var result = original.apply(this, arguments);
        schedule();
        return result;
      };
    });
    window.addEventListener("popstate", schedule);
    window.addEventListener("cl-round-route-change", schedule);
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
