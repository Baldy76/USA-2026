const CACHE_NAME = 'holiday-planner-v7.3.2';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './js/main.js',
    './js/store.js',
    './js/api.js',
    './js/ui.js',
    './js/features/tools.js',
    './js/features/roulette.js',
    './js/features/meetup.js',
    './js/features/weather.js',
    './js/features/checklist.js',
    './manifest.json',
    './img/la.jpg',
    './img/utah.jpg',
    './img/vegas.jpg',
    './img/flights.jpg',
    './img/bg.jpg',
    './img/logo.png',
    './img/icon-192.png'
];

self.addEventListener('install', event => { self.skipWaiting(); });
self.addEventListener('activate', event => {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
    self.clients.claim();
});
self.addEventListener('fetch', event => {
    if (event.request.url.includes('docs.google.com') || event.request.url.includes('openweathermap.org') || event.request.url.includes('frankfurter.dev')) return;
    event.respondWith(fetch(event.request).then(response => {
        const rc = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, rc));
        return response;
    }).catch(() => caches.match(event.request)));
});
