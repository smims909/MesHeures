/* ════════════════════════════════════════════════════════════════
   MesHeures — Service Worker  v1.2
   Stratégie : Cache First (assets locaux) + Cache dynamique (CDN exports)
   L'app s'ouvre instantanément même en mode avion.
   Les librairies xlsx et jspdf sont mises en cache au 1er usage.
════════════════════════════════════════════════════════════════ */

const CACHE_NAME  = 'mesheures-v1.2';
const CACHE_CDN   = 'mesheures-cdn-v1.2';

const ASSETS = [
    'index.html',
    'manifest.json',
    'apple-touch-icon.webp',
];

const CDN_URLS = [
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
];

/* ── Installation : mise en cache initiale des assets locaux ─── */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

/* ── Activation : supprimer les anciens caches ───────────────── */
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME && key !== CACHE_CDN)
                    .map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

/* ── Fetch : Cache First ─────────────────────────────────────── */
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);

    // ── CDN (xlsx / jspdf) : Cache First, pas de mise à jour silencieuse
    //    Ces fichiers sont versionnés dans l'URL → immuables
    if (CDN_URLS.includes(event.request.url)) {
        event.respondWith(
            caches.open(CACHE_CDN).then(cache =>
                cache.match(event.request).then(cached => {
                    if (cached) return cached;
                    return fetch(event.request, { mode: 'cors' }).then(response => {
                        if (response && response.status === 200) {
                            cache.put(event.request, response.clone());
                        }
                        return response;
                    });
                })
            )
        );
        return;
    }

    // ── Assets locaux : Cache First + mise à jour silencieuse ────
    if (url.origin !== self.location.origin) return;

    event.respondWith(
        caches.open(CACHE_NAME).then(cache =>
            cache.match(event.request).then(cached => {
                const fetchPromise = fetch(event.request)
                    .then(response => {
                        if (response && response.status === 200) {
                            cache.put(event.request, response.clone());
                        }
                        return response;
                    })
                    .catch(() => null);

                return cached || fetchPromise;
            })
        )
    );
});
