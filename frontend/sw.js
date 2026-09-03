const CACHE_NAME = 'brickcollector-v30';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/style.css',
    './css/components.css',
    './css/theme.css',
    './js/app.js',
    './js/api.js',
    './js/storage.js',
    './js/ui.js',
    './js/views/searchView.js',
    './js/views/collectionView.js',
    './js/views/statsView.js',
    './assets/Lego.webp',
    './assets/stores/lego.webp',
    './assets/stores/amazon.webp',
    './assets/stores/juguettos.webp',
    './assets/stores/dondino.webp',
    './assets/stores/carrefour.webp',
    './manifest.json'
];

// Install Event: Cache Core Assets
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(() => self.skipWaiting())
    );
});

// Activate Event: Cleanup Old Caches
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event: Cache-First for static assets, Network-First for API
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // API calls: Network first
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(event.request).catch(async () => {
                const cached = await caches.match(event.request);
                return cached || new Response(JSON.stringify({ error: "Sin conexión de red" }), {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' }
                });
            })
        );
        return;
    }

    // Static Shell: Cache First with Stale-While-Revalidate background sync
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
                    }
                }).catch(() => {});
                return cachedResponse;
            }
            return fetch(event.request);
        })
    );
});
