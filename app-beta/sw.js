// BETA (test link, only Shady): network-first for everything, own caches; never touches the live app's caches/data
const SHELL = 'sswb-shell-v14';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if ((k.startsWith('sswb-shell-') && k !== SHELL) || k === 'sswb-data') await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith((async () => {
    try { const r = await fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }); if (r.ok) (await caches.open(SHELL)).put(e.request, r.clone()); return r; }
    catch (x) { return (await caches.match(e.request, { ignoreSearch: true, cacheName: SHELL })) || (await caches.match('index.html', { cacheName: SHELL })); }
  })());
});
