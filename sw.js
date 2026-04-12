const CACHE_NAME = 'holiday-planner-v2.1.12';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css?v=2.1.12',
    './js/main.js?v=2.1.12',
    './js/store.js?v=2.1.12',
    './js/api.js?v=2.1.12',
    './js/ui.js?v=2.1.12',
    './manifest.json',
    './la.jpg',
    './utah.jpg',
    './vegas.jpg',
    './flights.jpg',
    './bg.jpg',
    './clear.jpg',
    './clouds.jpg',
    './rain.jpg',
    './snow.jpg',
    './logo.png'
];

self.addEventListener('install', event => { self.skipWaiting(); });

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
        ))
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    if (event.request.url.includes('docs.google.com') || 
        event.request.url.includes('openweathermap.org') ||
        event.request.url.includes('frankfurter.app')) { return; }
    
    event.respondWith(
        fetch(event.request).then(response => {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
            return response;
        }).catch(() => caches.match(event.request))
    );
});
