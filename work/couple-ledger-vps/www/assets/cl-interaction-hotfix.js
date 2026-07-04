(function () {
  "use strict";

  function patchInputs(root) {
    var fields = (root || document).querySelectorAll("input, textarea, select");
    fields.forEach(function (field) {
      field.style.webkitUserSelect = "text";
      field.style.userSelect = "text";
      if (field.tagName === "TEXTAREA") {
        field.style.webkitOverflowScrolling = "touch";
      }
      if (field.matches('input[type="number"]')) {
        field.setAttribute("inputmode", "decimal");
      }
    });
  }

  function unlockScroll() {
    document.documentElement.style.height = "auto";
    document.documentElement.style.overflowY = "auto";
    document.body.style.height = "auto";
    document.body.style.overflowY = "auto";
    var app = document.querySelector(".app-shell");
    if (app) {
      app.style.overflowX = "hidden";
      app.style.overflowY = "visible";
      app.style.height = "auto";
    }
    document.querySelectorAll(".page").forEach(function (page) {
      page.style.overflow = "visible";
      page.style.height = "auto";
    });
  }

  function schedulePatch() {
    requestAnimationFrame(function () {
      unlockScroll();
      patchInputs(document);
    });
  }

  document.addEventListener("focusin", function (event) {
    var target = event.target;
    if (!target || !target.matches || !target.matches("input, textarea, select")) return;
    patchInputs(target.parentNode || document);
    unlockScroll();
  }, true);

  document.addEventListener("touchmove", function () {
    unlockScroll();
  }, { passive: true });

  document.addEventListener("wheel", function () {
    unlockScroll();
  }, { passive: true });

  window.addEventListener("resize", schedulePatch, { passive: true });
  window.addEventListener("orientationchange", schedulePatch, { passive: true });
  window.addEventListener("popstate", schedulePatch, { passive: true });
  window.addEventListener("pageshow", schedulePatch, { passive: true });
  document.addEventListener("visibilitychange", schedulePatch, { passive: true });

  var observer = new MutationObserver(function () {
    schedulePatch();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      observer.observe(document.body, { childList: true, subtree: true });
      schedulePatch();
    });
  } else {
    observer.observe(document.body, { childList: true, subtree: true });
    schedulePatch();
  }
})();
