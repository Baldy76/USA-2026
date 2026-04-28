const CACHE_NAME = 'planner-v9-4';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './img/icon-192.png',
  './img/icon-512.png',
  './img/la.jpg',
  './img/utah.jpg',
  './img/vegas.jpg',
  './img/flights.jpg',
  './js/main.js',
  './js/store.js',
  './js/api.js',
  './js/ui.js',
  './js/core/clock.js',
  './js/core/theme.js',
  './js/core/animations.js',
  './js/features/itinerary.js',
  './js/features/travel.js',
  './js/features/guides.js',
  './js/features/quotes.js',
  './js/features/wallet.js',
  './js/features/briefing.js',
  './js/features/tools.js',
  './js/features/weather.js',
  './js/features/roulette.js',
  './js/features/meetup.js',
  './js/features/checklist.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
