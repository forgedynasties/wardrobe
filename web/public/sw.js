const CACHE = "hangur-v1";
const SHELL = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

const OFFLINE_RESPONSE = new Response(
  JSON.stringify({ error: "offline" }),
  { status: 503, headers: { "Content-Type": "application/json" } },
);

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for API + dynamic data.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(req).catch(() => caches.match(req).then((c) => c ?? OFFLINE_RESPONSE.clone())),
    );
    return;
  }

  // Stale-while-revalidate for Next build assets + page shell.
  event.respondWith(
    caches.match(req).catch(() => null).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
          }
          return res;
        })
        .catch(() => cached ?? OFFLINE_RESPONSE.clone());
      return cached || network;
    }),
  );
});
