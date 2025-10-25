(function () {
  // Guard to block automatic reloads when the tab is inactive
  const originalReload = window.location.reload.bind(window.location);
  const originalGo = window.history.go.bind(window.history);

  let blockReload = true; // default: disable auto-refresh globally; set false to allow

  function isInactive() {
    return document.hidden || document.visibilityState !== "visible";
  }

  function shouldBlock() {
    // Block if globally disabled or page is inactive
    return blockReload || isInactive();
  }

  window.location.reload = function (forceGet) {
    if (shouldBlock()) {
      console.warn("[Auto-Refresh Blocked] Suppressed window.location.reload while inactive/disabled.");
      return; // no-op
    }
    try {
      originalReload(forceGet);
    } catch (e) {
      console.warn("[Auto-Refresh Override] Reload call failed:", e);
    }
  };

  window.history.go = function (delta) {
    // Many libraries use history.go(0) to force a reload
    if ((delta === 0 || delta === "0") && shouldBlock()) {
      console.warn("[Auto-Refresh Blocked] Suppressed history.go(0) while inactive/disabled.");
      return; // no-op
    }
    return originalGo(delta);
  };

  document.addEventListener("visibilitychange", function () {
    // Maintain blocking when the page is hidden
    // When user returns, global blockReload still applies unless toggled off
  });

  // Public toggle if needed elsewhere
  window.disableAutoRefresh = function (disable = true) {
    blockReload = !!disable;
  };
})();