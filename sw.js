const CACHE_NAME = 'holiday-planner-v2.1.52';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css?v=2.1.52',
    './js/main.js?v=2.1.52',
    './js/store.js?v=2.1.31',
    './js/api.js?v=2.1.47',
    './js/ui.js?v=2.1.52',
    './manifest.json',
    './img/la.jpg',
    './img/utah.jpg',
    './img/vegas.jpg',
    './img/flights.jpg',
    './img/bg.jpg',
    './img/clear.jpg',
    './img/clouds.jpg',
    './img/rain.jpg',
    './img/snow.jpg',
    './img/logo.png',
    './img/icon-192.png',
    './img/icon-512.png'
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
        event.request.url.includes('frankfurter.dev') ||
        event.request.url.includes('script.google.com')) { return; }
    
    event.respondWith(
        fetch(event.request).then(response => {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
            return response;
        }).catch(() => caches.match(event.request))
    );
});
