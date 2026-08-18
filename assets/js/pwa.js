/* MVOF · PWA: registro + banner + auto-update */
window.deferredPrompt = null;
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js")
      .then(reg => {
        reg.addEventListener("updatefound", () => {
          const nuevoSW = reg.installing;
          if (!nuevoSW) return;
          nuevoSW.addEventListener("statechange", () => {
            if (nuevoSW.state === "installed" && navigator.serviceWorker.controller) {
              if (typeof toast === "function") toast("Nueva versión disponible, recargando...");
              nuevoSW.postMessage({ type: "SKIP_WAITING" });
              setTimeout(() => location.reload(), 1000);
            }
          });
        });
      })
      .catch(err => console.error("[PWA] Fallo registro SW:", err));
  });
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!refreshing) { refreshing = true; location.reload(); }
  });
}
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  window.deferredPrompt = e;
  const btn = document.getElementById("pwa-install-btn");
  if (btn) btn.classList.add("show");
});
async function instalarPWA() {
  if (!window.deferredPrompt) return;
  window.deferredPrompt.prompt();
  const result = await window.deferredPrompt.userChoice;
  if (result.outcome === "accepted" && typeof toast === "function") toast("Instalando MVOF...");
  window.deferredPrompt = null;
  const btn = document.getElementById("pwa-install-btn");
  if (btn) btn.classList.remove("show");
}
window.addEventListener("appinstalled", () => {
  const btn = document.getElementById("pwa-install-btn");
  if (btn) btn.classList.remove("show");
  if (typeof toast === "function") toast("✅ MVOF instalada");
});
window.addEventListener("DOMContentLoaded", () => {
  const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  if (standalone) {
    const btn = document.getElementById("pwa-install-btn");
    if (btn) btn.classList.remove("show");
    document.documentElement.classList.add("is-pwa");
  }
});
/* Herramientas de emergencia (Console): desregistrarSW() / limpiarTodoPWA() */
window.desregistrarSW = async function() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  for (const r of regs) await r.unregister();
  const keys = await caches.keys();
  for (const k of keys) await caches.delete(k);
  alert("Service Worker desregistrado y caches limpiadas. La página se recargará.");
  location.reload();
};
window.limpiarTodoPWA = async function() {
  await window.desregistrarSW();
  localStorage.clear(); sessionStorage.clear();
};
