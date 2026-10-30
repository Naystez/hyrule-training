/* Hyrule Training — cache réseau prioritaire (mise à jour V2).
   Pour les nouvelles versions d'index.html : connexion -> version en ligne,
   sans connexion -> dernière copie locale disponible.
   Ce script ne modifie pas les données localStorage du jeu. */
const CACHE_NAME = 'hyrule-training-v2';
const CACHE_PREFIX = 'hyrule-training-';
const APP_FILES = [
  './index.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_FILES);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
        .map(name => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const isPage = request.mode === 'navigate' ||
      url.pathname.endsWith('/index.html') ||
      url.pathname === new URL(self.registration.scope).pathname;

    try {
      // Ne pas servir un ancien HTML lorsque GitHub Pages est accessible.
      const response = await fetch(request, { cache: 'no-store' });
      if (response.ok) {
        await cache.put(isPage ? './index.html' : request, response.clone());
      }
      return response;
    } catch (error) {
      // Fonctionnement hors connexion : dernière version enregistrée.
      const cached = await cache.match(isPage ? './index.html' : request);
      if (cached) return cached;
      return new Response('Hors connexion : ressource non disponible.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  })());
});
