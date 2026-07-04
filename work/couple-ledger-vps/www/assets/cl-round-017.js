(function () {
  "use strict";

  var REFRESH_KEY = "cl_round_017_home_refresh";
  var refreshTimer = 0;
  var refreshAttempts = 0;

  function isHome() {
    return location.pathname === "/" || location.pathname === "/home";
  }

  function safeSessionSet(value) {
    try {
      sessionStorage.setItem(REFRESH_KEY, JSON.stringify(value));
    } catch (error) {
      // Session storage can be unavailable in strict browser modes.
    }
  }

  function safeSessionTake() {
    try {
      var raw = sessionStorage.getItem(REFRESH_KEY);
      sessionStorage.removeItem(REFRESH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function activeInputHasDraft() {
    var active = document.activeElement;
    if (!active || !/^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) return false;
    if (active.tagName === "SELECT") return false;
    return String(active.value || "").trim().length > 0;
  }

  function attemptHomeRefresh() {
    refreshTimer = 0;
    if (!isHome()) return;

    if (activeInputHasDraft() && refreshAttempts < 4) {
      refreshAttempts += 1;
      refreshTimer = window.setTimeout(attemptHomeRefresh, 1600);
      return;
    }

    location.reload();
  }

  function scheduleHomeRefresh(event) {
    if (!isHome()) return;

    var detail = event && event.detail ? event.detail : {};
    var note = detail.sourceText || (detail.draft && detail.draft.note) || "";
    safeSessionSet({
      at: Date.now(),
      note: String(note).slice(0, 28)
    });

    refreshAttempts = 0;
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(attemptHomeRefresh, 1400);
  }

  function showRefreshToast() {
    if (!isHome()) return;

    var state = safeSessionTake();
    if (!state || !state.at || Date.now() - state.at > 12000) return;
    if (document.querySelector(".cl-r17-refresh-toast")) return;

    var toast = document.createElement("div");
    toast.className = "cl-r17-refresh-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.textContent = "\u8d26\u5355\u5df2\u4fdd\u5b58\uff0c\u9996\u9875\u6570\u636e\u5df2\u5237\u65b0";

    document.body.appendChild(toast);
    window.requestAnimationFrame(function () {
      toast.classList.add("is-visible");
    });

    window.setTimeout(function () {
      toast.classList.remove("is-visible");
      window.setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 220);
    }, 2600);
  }

  window.addEventListener("cl-r12-saved", scheduleHomeRefresh);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showRefreshToast, { once: true });
  } else {
    showRefreshToast();
  }
})();
