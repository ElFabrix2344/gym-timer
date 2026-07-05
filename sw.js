const CACHE = 'volta-v3';

const PRECACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-maskable.svg',
  './lite/',
  './lite/index.html',
  './lite/styles.css',
  './lite/app.js',
  './lite/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (!e.data) return;

  // Final alert: replaces the ongoing countdown notification (same tag) and sounds
  if (e.data.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification('¡Descanso terminado!', {
      body: 'Vuelve al trabajo.',
      icon: './icons/icon.svg',
      badge: './icons/icon-maskable.svg',
      vibrate: [200, 100, 200, 100, 200],
      tag: 'volta-timer',
      renotify: true,
    });
  }

  // Ongoing countdown: silent updates on the same tag, like a timer in the shade
  if (e.data.type === 'REST_TICK') {
    self.registration.showNotification('⏱ Descanso en curso', {
      body: e.data.body || '',
      icon: './icons/icon.svg',
      badge: './icons/icon-maskable.svg',
      tag: 'volta-timer',
      silent: true,
      renotify: false,
    });
  }

  if (e.data.type === 'REST_CLEAR') {
    self.registration.getNotifications({ tag: 'volta-timer' })
      .then(ns => ns.forEach(n => n.close()));
  }
});

// Network first, cache as fallback: updates always arrive when online,
// and the app keeps working offline from the last cached version
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const cacheable = url.origin === self.location.origin ||
                    url.hostname === 'fonts.googleapis.com' ||
                    url.hostname === 'fonts.gstatic.com';

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok && cacheable) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
