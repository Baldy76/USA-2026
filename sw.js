const CACHE_NAME = 'holiday-planner-v1.4.0';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './la.jpg',
    './utah.jpg',
    './vegas.jpg',
    './bg.jpg',
    './clear.jpg',
    './clouds.jpg',
    './rain.jpg',
    './snow.jpg'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
    );
    self.skipWaiting(); 
});

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

self.addEventListener('fetch', event => {
    if (event.request.url.includes('docs.google.com') || 
        event.request.url.includes('openweathermap.org') ||
        event.request.url.includes('frankfurter.app') ||
        event.request.url.includes('flightaware.com')) {
        return; 
    }
    event.respondWith(
        caches.match(event.request).then(cachedResponse => cachedResponse || fetch(event.request))
    );
});
