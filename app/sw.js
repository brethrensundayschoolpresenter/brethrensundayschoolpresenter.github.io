// ترانيم مدارس الأحد — offline: app files network-first (so fixes arrive), hymn/Bible data cache-first
// (new hymn data is written into the 'ssw-data' cache by app.js after checking content.json on GitHub)
const SHELL = 'ssw-shell-v110';
const FILES = ['./', 'index.html', 'app.js', 'sync.js', 'engine.js', 'books.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', '../fonts/BalooBhaijaan2-VF.ttf', '../fonts/NotoNaskh.ttf', 'data/keys.js'];   // keys.js = approved Keys, network-first like the app files so every publish arrives at once
const MUST = ['./', 'index.html', 'app.js', 'engine.js', 'books.js'];
const DATA = ['data/hymns.js', 'data/topics.js', 'data/stories.js', 'data/bible.js'];
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    // 28 Nov: only the files the app cannot open without must all arrive; the rest (fonts, icons, keys) are saved one by one,
    // so one file that fails no longer leaves the phone with no offline copy at all
    const s = await caches.open(SHELL); await s.addAll(MUST);
    for (const f of FILES) if (!MUST.includes(f)) { try { await s.add(f); } catch (x) {} }
    const d = await caches.open('ssw-data');
    for (const f of DATA) { const u = new URL(f, self.registration.scope).href; if (!(await d.match(u))) { try { await d.add(u); } catch (x) {} } }
    self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('ssw-shell-') && k !== SHELL) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  if (/\/app\/data\//.test(u.pathname) && u.searchParams.has('fresh')) return;   // the page is refreshing its data: go to the network
  if (/\/app\/data\//.test(u.pathname) && !/keys\.js$/.test(u.pathname)) {
    e.respondWith((async () => {
      const d = await caches.open('ssw-data'), key = u.origin + u.pathname;
      const hit = await d.match(key); if (hit) return hit;
      const r = await fetch(e.request); if (r.ok) d.put(key, r.clone()); return r;
    })());
    return;
  }
  e.respondWith((async () => {
    try { const r = await fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }); if (r.ok) (await caches.open(SHELL)).put(e.request, r.clone()); return r; }
    catch (x) { return (await caches.match(e.request, { ignoreSearch: true })) || (await caches.match('index.html')); }
  })());
});
