// Force-unregister stale service workers and clear old caches
(function() {
  var SW_VERSION = 'directrefer-v5';
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(regs) {
      var needsReload = false;
      regs.forEach(function(r) {
        r.unregister();
        needsReload = true;
      });
      if ('caches' in window) {
        caches.keys().then(function(names) {
          names.forEach(function(n) {
            if (n !== 'directrefer-assets-v2') {
              caches.delete(n);
            }
          });
        });
      }
    });
  }
})();
