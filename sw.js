// Bump CACHE whenever you deploy changes, so the phone picks up the new files.
const CACHE = 'rebuild-v5';
const FONTS = 'rebuild-fonts';
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'js/app.js',
  'js/db.js',
  'js/store.js',
  'js/dates.js',
  'js/ui.js',
  'js/theme.js',
  'js/icons.js',
  'js/defaults.js',
  'js/streak.js',
  'js/quests.js',
  'js/ics.js',
  'js/exercises.js',
  'js/training.js',
  'js/views/today.js',
  'js/views/train.js',
  'js/views/library.js',
  'js/views/exercise.js',
  'js/views/meal.js',
  'js/views/weight.js',
  'js/views/photos.js',
  'js/views/lifts.js',
  'js/views/shop.js',
  'js/views/more.js',
  'js/views/tasks.js',
  'js/views/plans.js',
  'js/views/review.js',
  'js/views/food.js',
  'js/views/settings.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== FONTS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Google Fonts: cache on first use so the app keeps its look offline.
  if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    e.respondWith(caches.open(FONTS).then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok || res.type === 'opaque') c.put(e.request, res.clone());
      return res;
    }))));
    return;
  }
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request))
  );
});
