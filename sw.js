/* ════════════════════════════════════════════════════════════════
   MesHeures — Service Worker  v1.0 stable
   Stratégie : Cache First
   L'app s'ouvre instantanément même en mode avion.
   Le cache est mis à jour en arrière-plan à chaque ouverture réseau.
════════════════════════════════════════════════════════════════ */

const CACHE_NAME = 'mesheures-v1.0';

const ASSETS = [
    'index.html',
    'manifest.json',
    'apple-touch-icon.png',
];

/* ── Installation : mise en cache initiale ───────────────────── */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())  // activer immédiatement
    );
});

/* ── Activation : supprimer les anciens caches ───────────────── */
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())  // prendre le contrôle immédiatement
    );
});

/* ── Fetch : Cache First avec mise à jour silencieuse ───────── */
self.addEventListener('fetch', event => {
    // Ignorer les requêtes non-GET et les CDN externes (xlsx, jspdf)
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) return;

    event.respondWith(
        caches.open(CACHE_NAME).then(cache =>
            cache.match(event.request).then(cached => {
                // Mise à jour silencieuse en arrière-plan
                const fetchPromise = fetch(event.request)
                    .then(response => {
                        if (response && response.status === 200) {
                            cache.put(event.request, response.clone());
                        }
                        return response;
                    })
                    .catch(() => null);

                // Répondre depuis le cache si disponible, sinon attendre le réseau
                return cached || fetchPromise;
            })
        )
    );
});
