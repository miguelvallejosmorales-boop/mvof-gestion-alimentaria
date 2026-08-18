/* MVOF · Service Worker v3.0.0
 * Estrategia:
 *  - HTML/navegación: NETWORK-FIRST  -> el index nunca se queda "pegado" en una versión vieja.
 *  - Assets mismo origen (css/js/img): STALE-WHILE-REVALIDATE -> rápido y se actualiza solo.
 *  - Supabase / cross-origin (API): NO se cachea (siempre red).
 *  Cambia CACHE_VERSION en cada release para forzar limpieza.
 */
const CACHE_VERSION = "mvof-v3.0.0";

self.addEventListener("install", (event) => {
  // Activa de inmediato la nueva versión
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.addAll(["/", "/index.html", "/manifest.json"]).catch(() => {})
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 1) No interceptar peticiones a otros orígenes (Supabase REST, OpenFoodFacts, CDNs)
  if (url.origin !== self.location.origin) return;

  // 2) HTML / navegación -> NETWORK-FIRST
  const accept = req.headers.get("accept") || "";
  if (req.mode === "navigate" || accept.includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((m) => m || caches.match("/index.html")))
    );
    return;
  }

  // 3) Assets mismo origen -> STALE-WHILE-REVALIDATE
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
