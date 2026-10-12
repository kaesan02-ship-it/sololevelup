const ROOT = new URL(self.registration.scope).pathname;
const CACHE_PREFIX = "solo-levelup-" + encodeURIComponent(ROOT) + "-";
const CACHE = CACHE_PREFIX + "v3";
const assetPath = (name) => ROOT + name;
async function cacheShell(cache, response) {
  const html = await response.clone().text();
  const assets = new Set([
    assetPath("manifest.webmanifest"),
    assetPath("icon.svg"),
    assetPath("icon-192.png"),
    assetPath("icon-512.png"),
  ]);
  for (const match of html.matchAll(/(?:src|href)="([^"<>]+)"/g)) {
    const url = new URL(match[1], self.registration.scope);
    if (
      url.origin === self.location.origin &&
      url.pathname.startsWith(assetPath("_next/static/"))
    )
      assets.add(url.pathname);
  }
  const missing = [];
  for (const asset of assets)
    if (!(await cache.match(asset))) missing.push(asset);
  await cache.addAll(missing);
  // Keep the previous working shell until the new shell's dependencies exist.
  await cache.put(ROOT, response.clone());
}
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const response = await fetch(ROOT, { cache: "reload" });
      if (!response.ok) throw Error("App shell unavailable");
      await cacheShell(cache, response);
      await self.skipWaiting();
    })(),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith(CACHE_PREFIX) && key !== CACHE)
          await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (request.mode === "navigate" && url.pathname === ROOT) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const response = await fetch(request);
          if (response.ok) {
            try {
              await cacheShell(cache, response);
            } catch {
              /* Preserve the existing offline shell when a download fails. */
            }
            return response;
          }
          return (await cache.match(ROOT)) || response;
        } catch {
          const cached = await cache.match(ROOT);
          return cached || Response.error();
        }
      })(),
    );
  } else if (
    url.pathname.startsWith(assetPath("_next/static/")) ||
    [
      assetPath("icon.svg"),
      assetPath("icon-192.png"),
      assetPath("icon-512.png"),
      assetPath("manifest.webmanifest"),
    ].includes(url.pathname)
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      })(),
    );
  }
});
