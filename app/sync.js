// ترانيم مدارس الأحد — «فرصي» + المفضلة على الكلاود (BETA, mobile only)
// Google login (Firebase Auth) + one Firestore document per user: users/{uid} = { forsa: "<json>", fav: [n…], updated: ms }
// The phone stays the main copy (works offline); the cloud is merged in whenever the phone is online.
// Merge rule: each فرصة keeps its own "last changed" time (u); the newer copy wins; a deleted فرصة leaves a tombstone (del[id] = time).
// Security is in the Firestore rules (each user can read/write only users/<his uid>), not here.
(function () {
  const CFG = { apiKey: 'AIzaSyAqf_TjFNGHlhZeYVUUC_3Ki1OK6crC7wo', authDomain: 'bssp-app.firebaseapp.com', projectId: 'bssp-app', appId: '1:498768877357:web:af7d3a6bacb9296fdb25a4' };
  const SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
  const DOC = uid => 'https://firestore.googleapis.com/v1/projects/bssp-app/databases/(default)/documents/users/' + encodeURIComponent(uid);
  const KEEP_DEL = 90 * 864e5;   // forget tombstones after 90 days
  const L = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  // beta switch: ?beta=1 once turns it on for this phone (?beta=0 turns it off); signed-in users always keep it
  try {
    const q = new URLSearchParams(location.search).get('beta');
    if (q === '1') L.set('ssw_beta', 1); else if (q === '0') L.del('ssw_beta');
  } catch (e) {}
  const ON = () => true;   // public since 2026-11-25 (was: ?beta=1 only)

  let tries = 0, started = false, fb = null, auth = null, user = null, timer = null, busy = false, again = false, lastPull = 0;
  const st = { state: L.get('ssw_cloud', null) ? 'wait' : 'out', name: (L.get('ssw_cloud', null) || {}).name || '', at: L.get('ssw_cloud_at', 0), err: '' };

  // ---- local change tracking: which فرصة changed, and when ----
  const fh = () => L.get('ssw_fh', {}), fu = () => L.get('ssw_fu', {}), fdel = () => L.get('ssw_fdel', {});
  function track() {   // called after every local save; stamps what changed
    const H = fh(), U = fu(), D = fdel(), now = Date.now(), seen = {};
    for (const f of FR) {
      const h = JSON.stringify(f); seen[f.id] = 1;
      if (H[f.id] !== h) { H[f.id] = h; U[f.id] = now; delete D[f.id]; }
    }
    for (const id in H) if (!seen[id]) { delete H[id]; delete U[id]; D[id] = now; }
    L.set('ssw_fh', H); L.set('ssw_fu', U); L.set('ssw_fdel', D);
    const fs = JSON.stringify(FAV);
    if (L.get('ssw_favh', null) !== fs) { L.set('ssw_favh', fs); L.set('ssw_favu', now); }
  }
  window.cloudDirty = function () {
    if (!ON()) return;
    track();
    if (user) { clearTimeout(timer); timer = setTimeout(sync, 1500); }
  };

  // ---- merge local + cloud (pure: used by sync and by the tests) ----
  function merge(local, remote, now) {
    // local/remote = { list: [{f, u}], del: {id: t}, fav: [..], favU: t }
    const del = {}, out = [];
    for (const src of [local.del || {}, remote.del || {}]) for (const id in src) if (!del[id] || src[id] > del[id]) del[id] = src[id];
    const pick = {};
    for (const src of [local.list || [], remote.list || []]) for (const x of src) {
      if (!x || !x.f || !x.f.id) continue;
      const cur = pick[x.f.id];
      if (!cur || (x.u || 0) > (cur.u || 0)) pick[x.f.id] = x;
    }
    for (const id in pick) { if (del[id] && del[id] >= (pick[id].u || 0)) continue; delete del[id]; out.push(pick[id]); }
    for (const id in del) if (now - del[id] > KEEP_DEL) delete del[id];
    const lf = (local.favU || 0) >= (remote.favU || 0);
    return { list: out, del, fav: lf ? (local.fav || []) : (remote.fav || []), favU: Math.max(local.favU || 0, remote.favU || 0) };
  }
  window.cloudMerge = merge;   // for tests

  function localBlob() {
    const U = fu();
    return { list: FR.map(f => ({ f, u: U[f.id] || 0 })), del: fdel(), fav: FAV.slice(), favU: L.get('ssw_favu', 0) };
  }
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const canon = b => ({ list: b.list.slice().sort((x, y) => (x.f.id < y.f.id ? -1 : 1)), del: Object.keys(b.del).sort().map(k => [k, b.del[k]]), fav: b.fav, favU: b.favU });

  function applyLocal(m) {   // write the merged result into the phone (without re-stamping it)
    const order = {}; FR.forEach((f, i) => { order[f.id] = i; });
    const list = m.list.slice().sort((a, b) => (order[a.f.id] ?? -1) - (order[b.f.id] ?? -1));
    FR.length = 0; list.forEach(x => FR.push(x.f));
    FAV.length = 0; m.fav.forEach(n => FAV.push(n));
    const H = {}, U = {};
    for (const x of m.list) { H[x.f.id] = JSON.stringify(x.f); U[x.f.id] = x.u || 0; }
    L.set('ssw_fh', H); L.set('ssw_fu', U); L.set('ssw_fdel', m.del);
    L.set('ssw_favh', JSON.stringify(FAV)); L.set('ssw_favu', m.favU);
    try { localStorage.setItem('ssw_forsa', JSON.stringify(FR)); localStorage.setItem('ssw_fav', JSON.stringify(FAV)); } catch (e) {}
  }

  // ---- Firestore REST ----
  async function pull(tok) {
    const r = await fetch(DOC(user.uid), { headers: { Authorization: 'Bearer ' + tok } });
    if (r.status === 404) return { list: [], del: {}, fav: [], favU: 0, empty: true };
    if (!r.ok) throw new Error('pull ' + r.status);
    const d = (await r.json()).fields || {};
    let blob = {}; try { blob = JSON.parse((d.forsa && d.forsa.stringValue) || '{}'); } catch (e) {}
    const fav = ((d.fav && d.fav.arrayValue && d.fav.arrayValue.values) || []).map(v => +(v.integerValue || v.doubleValue || 0)).filter(Boolean);
    return { list: blob.list || [], del: blob.del || {}, fav, favU: blob.favU || 0 };
  }
  async function push(tok, m) {
    const body = { fields: {
      forsa: { stringValue: JSON.stringify({ v: 1, list: m.list, del: m.del, favU: m.favU }) },
      fav: { arrayValue: m.fav.length ? { values: m.fav.map(n => ({ integerValue: String(n) })) } : {} },
      updated: { integerValue: String(Date.now()) }
    } };
    const u = DOC(user.uid) + '?updateMask.fieldPaths=forsa&updateMask.fieldPaths=fav&updateMask.fieldPaths=updated';
    const r = await fetch(u, { method: 'PATCH', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error('push ' + r.status);
  }

  async function sync() {
    if (!user) return;
    if (busy) { again = true; return; }
    if (!navigator.onLine) { setState('offline'); return; }
    busy = true; setState('sync');
    try {
      track();
      const tok = await user.getIdToken();
      const loc = localBlob(), rem = await pull(tok), m = merge(loc, rem, Date.now());
      const changedHere = !same(canon(m), canon(loc)), changedThere = rem.empty || !same(canon(m), canon(rem));
      if (changedHere) applyLocal(m);
      if (changedThere) await push(tok, m);
      lastPull = Date.now(); st.at = lastPull; L.set('ssw_cloud_at', lastPull); setState('ok');
      if (changedHere) refreshView();
    } catch (e) { st.err = String(e && e.message || e); setState('err'); }
    busy = false;
    if (again) { again = false; setTimeout(sync, 300); }
  }
  function refreshView() {
    const h = location.hash || '#/';
    if (/^#\/(f|fav)/.test(h) && !document.querySelector('.sheet') && !(document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName))) { try { route(); } catch (e) {} }
  }

  // ---- login ----
  async function loadSdk() {
    if (fb) return fb;
    const q = tries++ ? '?r=' + tries : '';   // a failed import may be remembered by the browser: retry with a new address
    const app = await import(SDK + 'firebase-app.js' + q), a = await import(SDK + 'firebase-auth.js' + q);
    const inst = app.getApps && app.getApps().length ? app.getApp() : app.initializeApp(CFG);
    auth = a.getAuth(inst); auth.languageCode = 'ar';
    fb = a; return fb;
  }
  async function start() {
    try {
      await loadSdk();
      if (started) return; started = true;
      try { await fb.getRedirectResult(auth); } catch (e) {}
      fb.onAuthStateChanged(auth, u => {
        user = u || null;
        if (user) { st.name = user.displayName || user.email || ''; L.set('ssw_cloud', { uid: user.uid, name: st.name }); setState('wait'); sync(); }
        else { L.del('ssw_cloud'); setState('out'); }
      });
    } catch (e) { fb = null; st.err = 'sdk'; setState(L.get('ssw_cloud', null) ? 'offline' : 'out'); }
  }
  async function login() {
    try {
      if (!fb) { setState('login'); await loadSdk(); }   // normally already loaded when the card shows, so the popup opens straight from the tap (iPhone blocks late popups)
      const p = new fb.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
      const pop = fb.signInWithPopup(auth, p); setState('login');
      try { await pop; if (!started) start(); }
      catch (e) {
        const c = e && e.code || '';
        if (/popup-blocked|operation-not-supported|web-storage-unsupported/.test(c)) { await fb.signInWithRedirect(auth, p); return; }
        if (/popup-closed|cancelled-popup/.test(c)) { setState('out'); return; }
        throw e;
      }
      track();   // stamp what's on the phone so it goes up with the first sync
    } catch (e) { st.err = String(e && (e.code || e.message) || e); setState('err'); toast('مقدرناش نسجّل الدخول، جرّب تاني'); }
  }
  async function logout() {
    if (!confirm('تخرج من حسابك؟ فرصك هتفضل على الموبايل ده.')) return;
    try { await loadSdk(); await fb.signOut(auth); } catch (e) {}
    user = null; L.del('ssw_cloud'); setState('out');
  }

  // ---- the card on «فرصي» ----
  function setState(s) { st.state = s; const el = document.getElementById('cloudBox'); if (el) el.outerHTML = cardHTML(); bind(); }
  function ago(t) { if (!t) return ''; const m = Math.round((Date.now() - t) / 6e4); return m < 1 ? 'دلوقتي' : m < 60 ? 'من ' + arD(m) + ' دقيقة' : m < 1440 ? 'من ' + arD(Math.round(m / 60)) + ' ساعة' : 'من ' + arD(Math.round(m / 1440)) + ' يوم'; }
  function cardHTML() {
    if (!ON()) return '';
    const s = st.state;
    if (s === 'out' || s === 'login') return `<div class="cloud" id="cloudBox"><div class="cl-t">☁️ احفظ فرصك على حسابك</div>
      <div class="cl-s">سجّل دخول بحساب جوجل، وفرصك والمفضلة تتحفظ وتلاقيها على أي موبايل تاني. كل واحد بيشوف فرصه هو بس.</div>
      <button class="cl-go" id="clIn"${s === 'login' ? ' disabled' : ''}>${s === 'login' ? 'استنى…' : 'سجّل دخول بجوجل'}</button></div>`;
    const line = s === 'sync' || s === 'wait' ? 'بيتزامن…' : s === 'offline' ? 'من غير نت دلوقتي — هيتزامن أول ما النت يرجع' : s === 'err' ? 'حصلت مشكلة في المزامنة — هيحاول تاني' : 'متزامن ' + ago(st.at);
    return `<div class="cloud on" id="cloudBox"><div class="cl-t">☁️ فرصك محفوظة على حسابك</div>
      <div class="cl-s">${st.name ? esc(st.name) + ' · ' : ''}${line}</div>
      <div class="cl-row"><button id="clNow">زامن دلوقتي</button><button id="clOut">خروج</button></div></div>`;
  }
  function bind() {
    const a = document.getElementById('clIn'), b = document.getElementById('clNow'), c = document.getElementById('clOut');
    if (a) a.onclick = login; if (b) b.onclick = () => sync(); if (c) c.onclick = logout;
    if (a && !fb && navigator.onLine) loadSdk().catch(() => {});   // ready before the tap, so the Google window opens straight away (iPhone blocks late popups)
  }
  window.cloudCardHTML = cardHTML;
  window.cloudSignedIn = () => ON() && !!L.get('ssw_cloud', null);
  window.cloudBind = bind;
  window.cloudLogin = login;
  window.cloudPreload = () => { if (!fb && navigator.onLine) loadSdk().catch(() => {}); };

  // ---- start ----
  // sync.js loads before app.js (so the first «فرصي» page already has the card); start once app.js has run
  const boot = () => {
    track();
    if (L.get('ssw_cloud', null)) start();   // signed in on this phone: restore the session + sync; others load the login library only when «فرصي» shows the card
    // opened with no internet: the login library couldn't load yet -> start again when the internet comes back
    const wake = () => { if (!L.get('ssw_cloud', null) && !user) return; if (!started) start(); else sync(); };
    addEventListener('online', wake);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - lastPull > 30000) wake(); });
  };
  // DOMContentLoaded comes after every script on the page has run (app.js may still be downloading right after this file)
  if (ON()) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot(); }
})();
