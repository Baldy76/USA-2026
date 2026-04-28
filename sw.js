const CACHE_NAME = 'planner-v9-6';
const urlsToCache = [
  './', './index.html', './style.css', './js/main.js', './js/store.js', './js/api.js', './js/ui.js',
  './js/core/clock.js', './js/core/theme.js', './js/core/animations.js',
  './js/features/itinerary.js', './js/features/travel.js', './js/features/guides.js',
  './js/features/quotes.js', './js/features/weather.js', './js/features/briefing.js'
];

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(urlsToCache))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.map(k => k !== CACHE_NAME && caches.delete(k))))));
self.addEventListener('fetch', e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));
