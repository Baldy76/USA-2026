const CACHE_NAME = 'holiday-planner-v1.0.1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json'
];

// Install Event: Caches the app files
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting(); // Forces the new service worker to activate immediately
});

// Activate Event: Cleans up old caches when you update the version number
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch Event: Serves files from cache, EXCEPT for your Google Sheet
self.addEventListener('fetch', event => {
    // We strictly ignore the Google Sheets URL so it always fetches live data
    if (event.request.url.includes('docs.google.com')) {
        return; 
    }

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            return cachedResponse || fetch(event.request);
        })
    );
});
