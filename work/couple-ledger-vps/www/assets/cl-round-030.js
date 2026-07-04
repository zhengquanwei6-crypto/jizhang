(function () {
  "use strict";

  var BODY_CLASS = "cl-r30-reference";
  var ROUTE_PREFIX = "cl-r30-route-";
  var running = false;
  var lastPath = "";

  var titles = {
    "/home": "\u9996\u9875",
    "/ledger": "\u8d26\u672c",
    "/stats": "\u7edf\u8ba1",
    "/chat": "\u804a\u5929",
    "/mine": "\u6211\u7684",
    "/accounts": "\u8d26\u6237",
    "/budgets": "\u9884\u7b97",
    "/categories": "\u5206\u7c7b",
    "/couple": "\u60c5\u4fa3\u7a7a\u95f4",
    "/pet": "\u679c\u51bb",
    "/savings": "\u5b58\u94b1",
    "/archives": "\u5386\u53f2\u8d26\u672c",
    "/recurring": "\u5468\u671f\u8d26\u5355",
    "/jelly": "Jelly AI",
    "/feedback": "\u610f\u89c1\u53cd\u9988",
    "/login": "\u767b\u5f55",
    "/register": "\u6ce8\u518c",
    "/reset-password": "\u91cd\u7f6e\u5bc6\u7801",
    "/legal": "\u670d\u52a1\u6761\u6b3e"
  };

  var navItems = [
    { path: "/home", label: "\u9996\u9875", icon: "home" },
    { path: "/ledger", label: "\u8d26\u672c", icon: "book" },
    { path: "/couple", label: "\u7a7a\u95f4", icon: "heart" },
    { path: "/jelly", label: "\u679c\u51bb", icon: "spark" },
    { path: "/mine", label: "\u6211\u7684", icon: "user" }
  ];

  function routeName() {
    var name = location.pathname.replace(/^\/+/, "") || "home";
    return name.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  }

  function isPublicPath() {
    return /^(\/login|\/register|\/reset-password|\/legal)/.test(location.pathname);
  }

  function hasAuth() {
    try {
      return !!localStorage.getItem("cl_auth");
    } catch (error) {
      return !isPublicPath();
    }
  }

  function setMeta(name, content) {
    var node = document.querySelector('meta[name="' + name + '"]');
    if (!node) {
      node = document.createElement("meta");
      node.setAttribute("name", name);
      document.head.appendChild(node);
    }
    node.setAttribute("content", content);
  }

  function fixHead() {
    document.documentElement.lang = "zh-CN";
    document.title = (titles[location.pathname] || "\u60c5\u4fa3\u8bb0\u8d26") + " \u00b7 \u60c5\u4fa3\u8bb0\u8d26";
    setMeta("theme-color", "#f0527f");
    setMeta("description", "\u60c5\u4fa3\u8bb0\u8d26 \u00b7 \u7cbe\u81f4\u8bb0\u8d26\uff0c\u6e29\u67d4\u966a\u4f34\u6bcf\u4e00\u7b14\u6536\u652f");
    setMeta("apple-mobile-web-app-title", "\u60c5\u4fa3\u8bb0\u8d26");
  }

  function navigate(path) {
    if (!path || location.pathname === path) {
      window.dispatchEvent(new Event("cl-round-route-change"));
      schedule();
      return;
    }
    history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
    window.dispatchEvent(new Event("cl-round-route-change"));
    schedule();
  }

  function svg(name) {
    var common = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.15" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
    var paths = {
      home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
      book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v18H6.5A2.5 2.5 0 0 1 4 18.5z"/><path d="M8 7h8"/><path d="M8 11h7"/>',
      heart: '<path d="M20.8 4.6a5.2 5.2 0 0 0-7.4 0L12 6l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4L12 21l8.8-9a5.2 5.2 0 0 0 0-7.4z"/>',
      spark: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
      user: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="8" r="4"/>'
    };
    return "<svg " + common + ">" + (paths[name] || paths.home) + "</svg>";
  }

  function activeFor(item) {
    var path = location.pathname;
    if (item.path === "/home") return path === "/" || path === "/home" || path === "/stats" || path === "/savings";
    if (item.path === "/ledger") return path === "/ledger" || path === "/budgets" || path === "/accounts" || path === "/categories" || path === "/duplicates" || path === "/recurring" || path === "/archives";
    if (item.path === "/couple") return path === "/couple" || path === "/chat";
    if (item.path === "/jelly") return path === "/jelly" || path === "/pet";
    if (item.path === "/mine") return path === "/mine" || path === "/feedback" || path === "/admin";
    return path === item.path;
  }

  function ensureSecondaryNav() {
    var existing = document.querySelector(".cl-r30-bottom-nav");
    var nativeNav = document.querySelector(".bottom-nav, .nav");
    var shouldShow = hasAuth() && !isPublicPath() && !nativeNav;
    if (!shouldShow) {
      if (existing) existing.remove();
      return;
    }
    if (!existing) {
      existing = document.createElement("nav");
      existing.className = "cl-r30-bottom-nav";
      existing.setAttribute("aria-label", "\u4e3b\u5bfc\u822a");
      document.body.appendChild(existing);
      existing.addEventListener("click", function (event) {
        var button = event.target.closest("[data-cl-r30-path]");
        if (!button) return;
        navigate(button.getAttribute("data-cl-r30-path"));
      });
    }
    existing.innerHTML = navItems.map(function (item) {
      return '<button type="button" class="' + (activeFor(item) ? "is-active" : "") + '" data-cl-r30-path="' + item.path + '" aria-label="' + item.label + '">' +
        svg(item.icon) + "<span>" + item.label + "</span></button>";
    }).join("");
  }

  function enhanceAuth() {
    var card = document.querySelector(".auth-card");
    if (!card) return;
    if (!card.querySelector(".cl-r30-auth-product")) {
      var product = document.createElement("p");
      product.className = "cl-r30-auth-product";
      product.textContent = "Couple Ledger / \u60c5\u4fa3\u8bb0\u8d26";
      var brand = card.querySelector(".auth-brand");
      if (brand && brand.nextSibling) card.insertBefore(product, brand.nextSibling);
      else card.insertBefore(product, card.firstChild);
    }
    var tabs = card.querySelector(".cl-r30-auth-tabs");
    var onRegister = location.pathname === "/register";
    if (!tabs) {
      tabs = document.createElement("div");
      tabs.className = "cl-r30-auth-tabs";
      tabs.innerHTML =
        '<a href="/login" data-cl-r30-auth-link="/login">\u767b\u5f55</a>' +
        '<a href="/register" data-cl-r30-auth-link="/register">\u6ce8\u518c</a>';
      var form = card.querySelector("form");
      if (form && form !== card) card.insertBefore(tabs, form);
      else {
        var anchor = card.querySelector(".cl-r30-auth-product");
        card.insertBefore(tabs, anchor ? anchor.nextSibling : card.firstChild);
      }
    }
    Array.prototype.forEach.call(tabs.querySelectorAll("a"), function (link) {
      var active = link.getAttribute("data-cl-r30-auth-link") === (onRegister ? "/register" : "/login");
      link.classList.toggle("is-active", active);
    });
  }

  function patchInputs(root) {
    Array.prototype.forEach.call((root || document).querySelectorAll("input, textarea, select"), function (field) {
      if (field.disabled || field.readOnly) return;
      field.style.webkitUserSelect = "text";
      field.style.userSelect = "text";
      field.setAttribute("autocomplete", field.getAttribute("autocomplete") || (field.type === "password" ? "current-password" : "on"));
      if (field.matches('input[type="number"]')) field.setAttribute("inputmode", "decimal");
      if (field.tagName === "TEXTAREA") {
        field.setAttribute("enterkeyhint", "done");
        field.style.webkitOverflowScrolling = "touch";
      }
    });
  }

  function focusEditable(target) {
    if (!target || !target.matches || !target.matches("input, textarea, select")) return;
    if (target.disabled || target.readOnly) return;
    window.setTimeout(function () {
      try {
        target.focus({ preventScroll: true });
      } catch (error) {
        target.focus();
      }
    }, 0);
    window.setTimeout(function () {
      if (document.activeElement !== target) {
        try {
          target.focus({ preventScroll: true });
        } catch (error) {
          target.focus();
        }
      }
    }, 90);
  }

  function applyRouteClasses() {
    Array.prototype.slice.call(document.body.classList).forEach(function (name) {
      if (name.indexOf(ROUTE_PREFIX) === 0) document.body.classList.remove(name);
    });
    document.body.classList.add(ROUTE_PREFIX + routeName());
  }

  function apply() {
    running = false;
    if (!document.body) return;
    document.body.classList.add(BODY_CLASS);
    applyRouteClasses();
    fixHead();
    patchInputs(document);
    enhanceAuth();
    ensureSecondaryNav();
    lastPath = location.pathname;
  }

  function schedule() {
    if (running) return;
    running = true;
    window.requestAnimationFrame(apply);
  }

  function installWatchers() {
    if (window.__clRound030Installed) return;
    window.__clRound030Installed = true;
    ["pushState", "replaceState"].forEach(function (method) {
      var original = history[method];
      history[method] = function () {
        var result = original.apply(this, arguments);
        window.setTimeout(schedule, 30);
        return result;
      };
    });
    document.addEventListener("pointerdown", function (event) { focusEditable(event.target); }, true);
    document.addEventListener("touchstart", function (event) { focusEditable(event.target); }, true);
    document.addEventListener("focusin", function (event) {
      patchInputs(event.target && event.target.parentNode ? event.target.parentNode : document);
      focusEditable(event.target);
    }, true);
    document.addEventListener("click", function (event) {
      var authLink = event.target.closest("[data-cl-r30-auth-link]");
      if (authLink) {
        event.preventDefault();
        navigate(authLink.getAttribute("data-cl-r30-auth-link"));
      }
    }, true);
    window.addEventListener("popstate", schedule);
    window.addEventListener("pageshow", schedule);
    window.addEventListener("resize", schedule);
    window.addEventListener("cl-round-route-change", schedule);
    window.setInterval(function () {
      if (lastPath !== location.pathname) schedule();
    }, 400);
    new MutationObserver(schedule).observe(document.body || document.documentElement, { childList: true, subtree: true });
  }

  function boot() {
    installWatchers();
    schedule();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
