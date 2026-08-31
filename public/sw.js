/*
 * Service worker mínimo do PWA.
 * Estratégia conservadora: cacheia apenas ARQUIVOS ESTÁTICOS (JS/CSS/ícones).
 * Páginas dinâmicas (com dados financeiros) NUNCA são cacheadas — sempre vão
 * à rede, para não exibir dados desatualizados nem guardar dados sensíveis.
 */
const CACHE = "transportadora-static-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Só cacheia ícones e manifest (estáveis). NÃO cacheia /_next/static para
  // não servir chunk desatualizado (quebrava o app em desenvolvimento).
  const estatico =
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/icon-") ||
      url.pathname === "/apple-icon.png" ||
      url.pathname === "/manifest.webmanifest");

  if (!estatico) return; // demais requisições (inclui /_next/*): rede

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(request);
      if (hit) return hit;
      const res = await fetch(request);
      if (res.ok) cache.put(request, res.clone());
      return res;
    }),
  );
});
