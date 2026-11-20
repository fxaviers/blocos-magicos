const CACHE = 'blocos-magicos-v2';
const FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-maskable.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function cachePut(req, res) {
  if (!res || !res.ok || res.type !== 'basic') return Promise.resolve();
  const copy = res.clone();
  return caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          e.waitUntil(cachePut(e.request, res));
          return res;
        })
        .catch(() =>
          caches.match(e.request, { ignoreSearch: true })
            .then(cached => cached || caches.match('./index.html'))
        )
    );
    return;
  }

  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(cached => {
      const networkFetch = fetch(e.request).then(res => {
        e.waitUntil(cachePut(e.request, res));
        return res;
      });
      if (cached) {
        e.waitUntil(networkFetch.catch(() => {}));
        return cached;
      }
      return networkFetch;
    })
  );
});
