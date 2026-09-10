const CACHE_NAME = 'brickcollector-v41';
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

// Activate Event: Cleanup Old Caches Immediately
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

// Fetch Event: Network-First for ALL requests (API & Shell) to guarantee immediate updates
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

    // Static Shell: Network-First to guarantee latest code from server, fallback to cache if offline
    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
                }
                return networkResponse;
            })
            .catch(async () => {
                const cached = await caches.match(event.request);
                return cached;
            })
    );
});
