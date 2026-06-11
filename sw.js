/* LinguaPath service worker — offline support */
const VERSION = 'linguapath-v5';
const FONT_CACHE = 'linguapath-fonts';
const CORE = [
  './',
  './index.html',
  './style.css',
  './js/01-data.js',
  './js/02-state.js',
  './js/03-gamification.js',
  './js/04-srs.js',
  './js/05-audio.js',
  './js/06-ui.js',
  './js/07-views-main.js',
  './js/08-srs-write.js',
  './js/09-exercises.js',
  './js/10-views-more.js',
  './js/11-boot.js',
  './js/12-palette.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(CORE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== VERSION && k !== FONT_CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  // App navigation: network first, fall back to cached shell (keeps SPA working offline)
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // Google Fonts: stale-while-revalidate
  if (url.hostname.indexOf('fonts.googleapis.com') !== -1 || url.hostname.indexOf('fonts.gstatic.com') !== -1) {
    e.respondWith(
      caches.open(FONT_CACHE).then((c) =>
        c.match(req).then((cached) => {
          const net = fetch(req)
            .then((res) => { c.put(req, res.clone()); return res; })
            .catch(() => cached);
          return cached || net;
        })
      )
    );
    return;
  }

  // Same-origin assets: cache first, then network
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then((cached) =>
        cached || fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
            return res;
          })
          .catch(() => cached)
      )
    );
  }
});
