/* PuttX service worker: network first, so a home-screen app always gets the newest build when
   online; the last good copy is served when offline. Same-origin GETs only. */
'use strict';
const CACHE = 'puttx-v2';
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', './manifest.webmanifest'])).catch(() => {})); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(r.url, { cache: 'no-store', credentials: 'same-origin' }).then(res => {
    if (res.ok && !u.search) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r.mode === 'navigate' ? './' : r, copy)); }
    return res;
  }).catch(() => caches.match(r.mode === 'navigate' ? './' : r).then(m => m || caches.match('./'))));
});
