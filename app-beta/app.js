// ترانيم مدارس الأحد — web app for the servants (no projector): hymns + idea + verses + story, topics, Bible, favourites
const H = window.HYMNS, BK = window.BOOKS, T = window.TOPICS || [], HD = window.HDEEP || {}, KY = window.KEYS || {};
let B = null;                       // Bible arrives later (bible.js is big)
const HV = H.filter(h => !h.x);   // hidden hymns ("x":1) stay in the data so numbers never shift, but are not listed or searched
KE.build(HV, [], BK);
const $ = id => document.getElementById(id);
const arD = n => String(n).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const latinDigits = s => String(s).replace(/\p{Cf}/gu, '').replace(/\p{Nd}/gu, d => String(d.codePointAt(0) & 0xF));
const bookName = bi => BK[bi][0];
const ref = (b, c, v) => `${bookName(b)} ${arD(c + 1)}: ${arD(v + 1)}`;
const hName = n => H[n - 1].title;
const IC = {
  back: '<svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.6z"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M12 3v12M7 8l5-5 5 5"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/></svg>',
  chat: '<svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01"/></svg>'
};
const buzz = () => { try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) {} };
function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2400); }
let PREF = { fs: 19 };
try { Object.assign(PREF, JSON.parse(localStorage.getItem('ssw_pref') || '{}')); } catch (e) {}
const savePref = () => { try { localStorage.setItem('ssw_pref', JSON.stringify(PREF)); } catch (e) {} };
document.documentElement.style.setProperty('--fs', PREF.fs + 'px');
let FAV = [];
try { FAV = JSON.parse(localStorage.getItem('ssw_fav') || '[]'); } catch (e) {}
const saveFav = () => { try { localStorage.setItem('ssw_fav', JSON.stringify(FAV)); } catch (e) {} if (window.cloudDirty) cloudDirty(); };

// Bible book abbreviations (same as the desktop app)
const ABBR = { 'تك':0,'خر':1,'لا':2,'عد':3,'تث':4,'يش':5,'قض':6,'را':7,'1صم':8,'2صم':9,'1مل':10,'2مل':11,'1اخ':12,'2اخ':13,'عز':14,'نح':15,'اس':16,'اي':17,'مز':18,'ام':19,'جا':20,'نش':21,'اش':22,'ار':23,'مرا':24,'حز':25,'دا':26,'هو':27,'يوء':28,'يوئ':28,'عا':29,'عو':30,'يون':31,'مي':32,'نا':33,'حب':34,'صف':35,'حج':36,'زك':37,'مل':38,
  'مت':39,'مر':40,'لو':41,'يو':42,'اع':43,'رو':44,'1كو':45,'2كو':46,'غل':47,'اف':48,'في':49,'كو':50,'1تس':51,'2تس':52,'1تي':53,'2تي':54,'تي':55,'فل':56,'عب':57,'يع':58,'1بط':59,'2بط':60,'1يو':61,'2يو':62,'3يو':63,'يه':64,'رؤ':65 };
function bookByName(w) {
  const raw = w.replace(/\s+/g, '');
  if (ABBR[raw] !== undefined) return ABBR[raw];
  if (/^يو[ءئ]$|^يؤ$/.test(raw)) return 28;
  const n = KE.norm(raw).replace(/\s+/g, '');
  for (const k in ABBR) if (!/[ءئؤ]/.test(k) && KE.norm(k).replace(/\s+/g, '') === n) return ABBR[k];
  const full = KE.norm(w);
  for (let i = 0; i < BK.length; i++) if (BK[i].some(x => KE.norm(x) === full)) return i;
  return -1;
}
// "لو 15 20-24" (Van Dyke abbreviations) -> {b, c, v, v2}
function deepRef(r) {
  const m = String(r || '').match(/^(\S+) (\d+) (\d+)(?:-(\d+))?$/); if (!m) return null;
  const b = bookByName(m[1]); if (b < 0) return null;
  return { b, c: +m[2] - 1, v: +m[3] - 1, v2: m[4] ? +m[4] - 1 : +m[3] - 1 };
}
const refTxt = p => ref(p.b, p.c, p.v) + (p.v2 > p.v ? '–' + arD(p.v2 + 1) : '');
function abbrevRef(q) {
  const m = latinDigits(q).replace(/[ً-ْ]/g, '').trim().match(/^([1-3]?\s*[ء-ي][ء-ي\s]*?)\s*[.:،,-]?\s*(\d+)(?:\s*[\s.:،,-]\s*(\d+))?\s*$/);
  if (!m) return null;
  const b = bookByName(m[1]); if (b < 0) return null;
  const c = +m[2] - 1, v = m[3] ? +m[3] - 1 : 0;
  if (B && (!B[b] || !B[b].chapters[c] || B[b].chapters[c][v] === undefined)) return null;
  return { b, c, v, v2: v };
}
// highlight the query inside a line (matching on normalised letters)
function hiLine(lines, q) {
  const qn = KE.norm(q); let best = lines[0] || '';
  for (const l of lines) if (KE.norm(l).includes(qn)) { best = l; break; }
  const map = []; let flat = '';
  for (let i = 0; i < best.length; i++) { const c = KE.norm(best[i]); if (c && c !== ' ') { map.push(i); flat += c; } else if (best[i] === ' ' && flat && flat[flat.length - 1] !== ' ') { map.push(i); flat += ' '; } }
  const at = flat.indexOf(qn);
  if (at < 0 || !qn) return esc(best);
  const s = map[at], e = map[Math.min(at + qn.length - 1, map.length - 1)] + 1;
  return esc(best.slice(0, s)) + '<mark>' + esc(best.slice(s, e)) + '</mark>' + esc(best.slice(e));
}
const firstLetter = t => { const c = KE.norm(t).charAt(0); return /[a-z]/.test(c) ? 'English' : c || '#'; };
const ABC = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي', LRANK = l => { const i = ABC.indexOf(l); return i < 0 ? (l === 'English' ? 99 : 98) : i; };   // A–Z letters in Arabic alphabet order (not by hymn number)
function alphaHTML(nums) {
  const L0 = n => firstLetter(H[n - 1].title), D0 = n => H[n - 1].d || '';
  const sorted = nums.slice().sort((a, b) => a - b), order = [...new Set(sorted.map(L0))].sort((x, y) => LRANK(x) - LRANK(y));
  sorted.sort((a, b) => order.indexOf(L0(a)) - order.indexOf(L0(b)) || (D0(b) > D0(a) ? 1 : D0(b) < D0(a) ? -1 : a - b));
  let cur = null, out = '';
  sorted.forEach(n => { const L = L0(n); if (L !== cur) { cur = L; out += `<div class="lh" data-l="${esc(L)}"><span class="letter">${esc(L)}</span></div>`; } out += hymnItem(n); });
  return out;
}
function hymnItem(n, sub, key) {
  const d = HD[n];
  return `<a class="it" href="#/h/${n}"><div class="t">${key ? `<span class="ik">${esc(key[0])}</span>` : ''}${esc(hName(n))}</div><div class="s">${sub != null ? sub : d ? esc(d.i.length > 90 ? d.i.slice(0, 88) + '…' : d.i) : ''}</div></a>`;
}

// ---------- top bar ----------
function bar(html) { $('bar').innerHTML = html; }
// ---------- light / dark (follows the phone unless chosen) ----------
const THEME = {
  get() { try { return localStorage.getItem('ssw_theme') || 'auto'; } catch (e) { return 'auto'; } },
  dark() { const t = THEME.get(); return t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches); },
  apply() { const d = THEME.dark(); document.documentElement.toggleAttribute('data-theme', d); if (d) document.documentElement.setAttribute('data-theme', 'dark'); const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = d ? '#0f141a' : '#fbfaf7'; const b = document.getElementById('thm'); if (b) b.innerHTML = d ? IC.sun : IC.moon; },
  set(t) { try { localStorage.setItem('ssw_theme', t); } catch (e) {} THEME.apply(); }
};
IC.moon = '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>';
IC.sun = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/></svg>';
try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (THEME.get() === 'auto') THEME.apply(); }); } catch (e) {}
function homeBar(sub) { bar(`<img src="icon-192.png" alt=""><div class="brand">ترانيم مدارس الأحد<small>${sub || 'Brethren Sunday School Presenter'}</small></div><span class="sp"></span><button class="ib" id="thm" aria-label="فاتح / غامق">${THEME.dark() ? IC.sun : IC.moon}</button><a class="ib" href="#/about" aria-label="عن البرنامج">${IC.info}</a>`); $('thm').onclick = () => THEME.set(THEME.dark() ? 'light' : 'dark'); }
function backBar(label, extra, y) { bar(`<button class="back${y ? ' y' : ''}" id="bk">${IC.back}<span>${esc(label)}</span></button><span class="sp"></span>${extra || ''}`); $('bk').onclick = goBack; }
function goBack() { if (history.length > 1 && NAV.depth > 0) history.back(); else location.hash = '#/'; }
function showSearch(on, ph) { $('sbox').style.display = on ? '' : 'none'; if (ph) $('q').placeholder = ph; }
function setTab(t) { document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('on', a.dataset.t === t)); }

// suggestions / mistakes / a hymn to add go to WhatsApp (the hymn's name is written in the message)
const WA = 'https://wa.me/201227120955';
function suggest(n) { window.open(WA + '?text=' + encodeURIComponent(n ? 'ترنيمة: ' + hName(n) + '\n' : 'برنامج ترانيم مدارس الأحد:\n'), '_blank'); }

// ---------- «ترانيم جديدة اتضافت»: shown on the home list after an update brings new hymns ----------
function seenCount() {
  let n = +(localStorage.getItem('sswb_seen') || 0);
  if (!n) { n = H.length; /* BETA: no new-hymns popup */ try { localStorage.setItem('sswb_seen', n); } catch (e) {} }   // 967 = before the first new hymn
  return n;
}
// notes of every data update are kept per version, so an update you missed still shows its notes, and nothing old shows twice
function saveNotes(v, notes, hist, from) {   // from = the data version the phone had before this update
  try {
    let N = null; try { N = JSON.parse(localStorage.getItem('sswb_notes') || 'null'); } catch (e) {}
    const h = (N && N.h) || {}; if (N && !N.h && N.notes) h[N.v] = N.notes;
    if (hist) { for (const k in hist) if (+k > (from || 0) && +k <= v) h[k] = hist[k]; } else h[v] = notes;
    if (!h[v] && notes) h[v] = notes;
    for (const k of Object.keys(h)) if (+k < v - 20) delete h[k];
    localStorage.setItem('sswb_notes', JSON.stringify({ v: Math.max(v, (N && N.v) || 0), h }));
  } catch (e) {}
}
function pendingNotes() {
  let N = null; try { N = JSON.parse(localStorage.getItem('sswb_notes') || 'null'); } catch (e) {}
  if (!N) return [];
  const seen = +localStorage.getItem('sswb_notes_seen') || 0, h = N.h || { [N.v]: N.notes || [] }, out = [];
  Object.keys(h).map(Number).filter(k => k > seen && k <= N.v).sort((a, b) => a - b).forEach(k => (h[k] || []).forEach(t => { if (!out.includes(t)) out.push(t); }));
  return out;
}
// popup after an update (opens by itself, once):
//  new hymns -> «ترنيمة جديدة اتضافت» + the names (tap = open it); only fixes -> «الترانيم اتحدّثت» + the notes
// «البرنامج اتحدّث»: bump APPV + APP_NEWS when the web app itself gets something new
const APPV = 9;   // 9 = same news as 8, shown again to everyone (Shady) with the Keys count + thanks
const APP_NEWS = ['شكل جديد: وضع غامق بيمشي مع الموبايل، وتقدر تغيّره من زرار القمر/الشمس فوق.', 'الكتاب المقدس: اختار «العهد القديم» أو «العهد الجديد» من فوق على طول.', 'في «فرصي»: اسحب أي فرصة لليسار عشان تعمل منها نسخة أو تمسحها (ولو مسحت بالغلط دوس «تراجع»).', 'المفضلة: رتّبهم زي ما تحب، واسحب أي ترنيمة لليسار عشان تشيلها.', 'وآخر حاجات دوّرت عليها بتظهر فوق قايمة الترانيم.'];
const APP_LINK = ['#/f', 'افتح «فرصي»'];
// new Keys since the last popup («Keys جديدة اتضافت»); first run just remembers what's there
function newKeys() {
  let seen = null; try { seen = JSON.parse(localStorage.getItem('sswb_keys_seen') || 'null'); } catch (e) {}
  const cur = Object.keys(KY);
  if (!seen) { try { localStorage.setItem('sswb_keys_seen', JSON.stringify(cur)); } catch (e) {} return []; }
  const S = new Set(seen);
  return cur.filter(n => !S.has(n)).map(n => H.find(h => String(h.num) === n)).filter(Boolean);
}
const appNewsDue = () => +(localStorage.getItem('sswb_appv') || 0) < APPV;
function newHymnsHTML() {
  const n = seenCount(), nw = H.length > n ? H.slice(n) : [];
  const app = appNewsDue() ? APP_NEWS : [];
  const nk = newKeys();
  const notes = pendingNotes().filter(t => !nw.some(h => t.includes(h.title)) && !(app.length && app.some(x => x.includes('اللسان والكلام')) && t.includes('اللسان والكلام')));
  if (!nw.length && !notes.length && !app.length && !nk.length) return '';
  const title = nw.length ? (nw.length > 1 ? 'ترانيم جديدة اتضافت' : 'ترنيمة جديدة اتضافت') : app.length ? 'البرنامج اتحدّث' : notes.length ? 'الترانيم اتحدّثت' : 'Keys جديدة اتضافت';
  return `<div class="upd-card"><div class="upd-ic"><svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path fill="#111" d="M12 2l2.2 6.3L20.5 10l-6.3 2.2L12 18.5l-2.2-6.3L3.5 10l6.3-1.7z"/><path fill="#111" d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/></svg></div><h3>${title}</h3>`
    + nw.map(h => `<a class="upd-h" href="#/h/${h.num}" onclick="closeNews()">«${esc(h.title)}» <span>افتحها ‹</span></a>`).join('')
    + (notes.length ? `<ul>${notes.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '')
    + (nk.length || app.length ? `<div class="upd-k">${nk.length ? `اتضاف الـ<bdi>Key</bdi> لـ ${arD(nk.length)} ترنيمة جديدة، وبقى عندنا ${arD(Object.keys(KY).length)} ترنيمة ليها <bdi>Key</bdi>.` : `بقى عندنا ${arD(Object.keys(KY).length)} ترنيمة ليها <bdi>Key</bdi>.`}<br><span>بنشكر الرب لأجل الشباب اللي تعبوا في تحضيرهم.</span></div>` : '')
    + (app.length ? `${nw.length || notes.length ? '<b>جديد في البرنامج:</b>' : ''}<ul>${app.map(t => `<li>${esc(t)}</li>`).join('')}</ul><a class="upd-h" href="${APP_LINK[0]}" onclick="closeNews()">${APP_LINK[1]} <span>‹</span></a>` : '')
    + `<button class="upd-ok" onclick="closeNews()">تمام</button></div>`;
}
function markNewsSeen() {
  try { localStorage.setItem('sswb_appv', APPV); localStorage.setItem('sswb_seen', H.length); localStorage.setItem('sswb_keys_seen', JSON.stringify(Object.keys(KY))); const N = JSON.parse(localStorage.getItem('sswb_notes') || 'null'); if (N) localStorage.setItem('sswb_notes_seen', N.v); } catch (e) {}
}
function closeNews() { markNewsSeen(); const p = $('updPop'); if (p) p.remove(); }
let reloading = false;
// big one-time card for the cloud login (APPV 7) — shown on its own, then the normal news (if any) right after
function cloudNewsHTML() {
  return `<div class="cl-news"><div class="cl-new">جديد</div><div class="cl-cloud">☁️</div>
    <h3>فرصك بقت محفوظة على حسابك</h3><p>سجّل دخول بحساب جوجل مرة واحدة، وفرصك والمفضلة تتحفظ لوحدها.</p>
    <div class="cl-li"><span>📱</span>تلاقيها على أي موبايل تفتح منه</div>
    <div class="cl-li"><span>🔄</span>أي تعديل بيتنقل لوحده</div>
    <div class="cl-li"><span>🔒</span>كل واحد بيشوف فرصه هو بس</div>
    <button class="cl-gbtn" id="clNewsIn">سجّل دخول بجوجل</button>
    <button class="cl-later" id="clNewsLater">مش دلوقتي</button>
    <div class="cl-opt">اختياري — والبرنامج شغال عادي من غيره. وتقدر تسجّل بعدين من «فرصي».</div></div>`;
}
function closeCloudNews(go) {
  try { localStorage.setItem('sswb_appv', APPV); } catch (e) {}
  const p = $('updPop'); if (p) p.remove();
  if (go) { location.hash = '#/f'; if (window.cloudLogin) cloudLogin(); }
  else setTimeout(showNews, 400);
}
function showNews() {
  if (reloading || $('updPop') || $('welcome') && $('welcome').style.display !== 'none') return;
  if (APPV === 7 && appNewsDue() && window.cloudSignedIn && !cloudSignedIn() && window.cloudLogin) {
    const d = document.createElement('div'); d.className = 'upd-pop'; d.id = 'updPop'; d.innerHTML = cloudNewsHTML();
    document.body.appendChild(d); if (window.cloudPreload) cloudPreload();
    $('clNewsIn').onclick = () => closeCloudNews(true); $('clNewsLater').onclick = () => closeCloudNews(false);
    d.addEventListener('click', e => { if (e.target === d) closeCloudNews(false); });
    return;
  }
  if (APPV === 7 && appNewsDue() && window.cloudSignedIn && cloudSignedIn()) { try { localStorage.setItem('sswb_appv', APPV); } catch (e) {} }   // already signed in: nothing to announce
  const h = newHymnsHTML(); if (!h) return;
  const d = document.createElement('div'); d.className = 'upd-pop'; d.id = 'updPop'; d.innerHTML = h;
  d.addEventListener('click', e => { if (e.target === d) closeNews(); });
  document.body.appendChild(d);
  setTimeout(() => { if (!reloading && $('updPop') && !document.hidden) markNewsSeen(); }, 2500);   // really seen: closing the app with it open must not bring the same news back
}
// new data arrived while the app is open: reload on the home screen (once per version), otherwise a yellow button
function dataArrived(v) {
  const k = 'ssw_rl_' + v;
  if ((location.hash || '#/') === '#/' && !$('q').value && scrollY < 50 && !$('updPop') && !document.querySelector('.sheet') && !sessionStorage.getItem(k)) { sessionStorage.setItem(k, '1'); reloading = true; const p = $('updPop'); if (p) p.remove(); setTimeout(() => location.reload(), 600); return; }
  if ($('updBtn')) return;
  const el = document.createElement('button'); el.id = 'updBtn';
  el.className = 'toast show'; el.style.pointerEvents = 'auto'; el.style.background = '#ffff00'; el.style.color = '#111'; el.style.border = '2px solid #111';
  el.textContent = 'وصل تحديث للترانيم — دوس هنا'; el.onclick = () => { reloading = true; location.reload(); };
  document.body.appendChild(el);
}

// ---------- views ----------
const NAV = { depth: 0, tab: 'hymns', q: { hymns: '', bible: '' }, from: null };
// last searches (hymns), shown as small chips above the list when the search is empty
const RECENT = { get() { try { return JSON.parse(localStorage.getItem('ssw_recent') || '[]'); } catch (e) { return []; } } };
function recentAdd(q) { if (NAV.q.hymns.trim() !== q && latinDigits(NAV.q.hymns.trim()) !== q) return; const r = RECENT.get().filter(x => x !== q); r.unshift(q); try { localStorage.setItem('ssw_recent', JSON.stringify(r.slice(0, 5))); } catch (e) {} }
function recentHTML() { const r = RECENT.get(); return r.length ? `<div class="recent"><span class="rl">آخر بحث</span>${r.map(x => `<button data-q="${esc(x)}">${esc(x)}</button>`).join('')}<button class="rx" aria-label="امسح آخر بحث">×</button></div>` : ''; }
function recentBind() {
  document.querySelectorAll('.recent [data-q]').forEach(b => b.onclick = () => { $('q').value = b.dataset.q; $('q').dispatchEvent(new Event('input')); });
  const x = document.querySelector('.recent .rx'); if (x) x.onclick = () => { try { localStorage.removeItem('ssw_recent'); } catch (e) {} const r = document.querySelector('.recent'); if (r) r.remove(); azSetup(); };
}
function vHymns() {
  setTab('hymns'); homeBar(); showSearch(true, 'اسم الترنيمة أو أي كلمة منها…');
  $('q').value = NAV.q.hymns; sboxState();
  const q = latinDigits(NAV.q.hymns.trim()), m = $('main');
  if (q.length > 1) { clearTimeout(vHymns.rt); vHymns.rt = setTimeout(() => recentAdd(q), 1500); }
  if (!q) {
    m.innerHTML = recentHTML() + `<div class="hint"><b>رجاء محبة:</b> استخدم البرنامج للمساعدة بس، لأنه مش بديل إنك تاخد وقت قدّام الرب وتطلب إرشاده قبل فرصة الترانيم.</div>`
      + (localStorage.getItem('ssw_hint2') || matchMedia('(display-mode: standalone)').matches || navigator.standalone ? '' : `<div class="hint">عايز تفتحه زي أي برنامج ومن غير نت؟ ضيفه للشاشة الرئيسية (Add to Home Screen) — <a href="../#add" style="color:var(--link);font-weight:800;text-decoration:underline">شوف إزاي بالصور</a>. <button style="color:var(--link);font-weight:800" onclick="localStorage.setItem('ssw_hint2',1);this.parentNode.remove()">تمام</button></div>`)
      + alphaHTML(HV.map(h => h.num));
    recentBind();
    return;
  }
  const seen = new Set(), tit = KE.searchTitles(q, 15), frag = KE.searchFragments(q, 60), res = KE.searchHymnText(q, 60);
  let out = '';
  const snip = (n, i) => { const s = H[n - 1].slides[i]; return s ? hiLine(s.lines, q) : ''; };
  tit.filter(r => r.score >= 1).forEach(r => { seen.add(r.num); out += hymnItem(r.num); });
  frag.forEach(r => { if (seen.has(r.num)) return; seen.add(r.num); out += hymnItem(r.num, snip(r.num, r.i)); });
  tit.filter(r => r.score < 1).forEach(r => { if (seen.has(r.num)) return; seen.add(r.num); out += hymnItem(r.num); });
  res.forEach(r => { if (seen.has(r.num) || seen.size >= 60) return; seen.add(r.num); out += hymnItem(r.num, snip(r.num, r.i)); });
  m.innerHTML = out || '<div class="empty">مالقيتش ترنيمة فيها الكلام ده<br>جرّب كلمة تانية</div>';
}
function vHymn(n) {
  if (n > seenCount() && n === H.length) { try { localStorage.setItem('sswb_seen', H.length); } catch (e) {} }
  const h = H[n - 1]; if (!h) { location.hash = '#/'; return; }
  setTab(NAV.tab); showSearch(false);
  const fav = FAV.includes(n);
  backBar('رجوع', `<button class="ib" id="shr" aria-label="مشاركة">${IC.share}</button><button class="ib${fav ? ' on' : ''}" id="fv" aria-label="المفضلة">${IC.heart}</button>`);
  const d = HD[n], tps = T.filter(t => t.nums.includes(n));
  const vs = d ? d.v.map(([r, ph]) => [deepRef(r), ph]).filter(x => x[0]) : [];
  const sp = d ? deepRef(d.s[1]) : null;
  // the words: every verse/chorus once, in order
  const seen = new Set(); let k = 0, lyr = '', prevLab = null;
  const asis = h.slides.every(s => !s.label);   // no ق/1 labels = keep every slide exactly like the ppt (repeats too)
  h.slides.forEach(s => {
    const key = s.lines.join('\n'); if (!asis && seen.has(key)) return; seen.add(key);
    const cont = s.part || (s.label && s.label === prevLab); prevLab = s.label;   // 2nd slide of the same verse/chorus: no new tag
    const tag = cont ? '' : s.label === 'ق' ? 'القرار' : s.label ? 'العدد ' + arD(s.label) : '';
    lyr += `<div class="vb ${(cont ? k - 1 : k++) % 2 ? 'bl' : 'w'}">${tag ? `<div><span class="tag">${tag}</span></div>` : ''}${s.lines.map(esc).join('<br>')}</div>`;
  });
  $('main').innerHTML = `<div class="ht"><span class="hl">${esc(h.title)}</span></div>`
    + (tps.length ? `<div class="chips">${tps.map(t => `<a class="chip" href="#/t/${t.id}">${esc(t.name)}</a>`).join('')}</div>` : '')
    + `<div class="hbtns${KY[n] ? ' hk' : ''}"><button class="addf" id="adf">${ICF.plus} ضيفها لفرصة</button>${d ? '<button class="golyr" id="glr">كلمات الترنيمة ↓</button>' : ''}${KY[n] ? `<button class="golyr gkey" id="gky">Key: ${esc(KY[n][0])}${KY[n][1] ? ` <small>${KY[n][1] > 0 ? '+' : ''}${KY[n][1]}</small>` : ''}</button>` : ''}</div>`
    + (d ? `<div class="card"><span class="lb"><span>فكرة الترنيمة</span></span><p>${esc(d.i)}</p></div>` : '')
    + (vs.length ? `<div class="card"><span class="lb"><span>آيات في الترنيمة</span></span><div class="vs">${vs.map(([p, ph], i) => `<div class="vrow"><button class="vch" data-k="${i}"><div class="q">«${esc(ph)}»</div><div class="r">${esc(refTxt(p))}</div></button><button class="vplus" data-vk="${i}" aria-label="ضيف الشاهد لفرصة">+</button></div>`).join('')}</div></div>` : '')
    + (sp ? `<div class="card story" id="sty"><span class="lb"><span>قصة مقترحة</span></span><b>${esc(d.s[0])}</b><p style="font-weight:500">${esc(d.s[2])}</p><span class="r">${esc(refTxt(sp))} ‹ افتح القصة</span><br><button class="addf story-add" id="ads">${ICF.plus} ضيف القصة لفرصة</button></div>` : '')
    + `<div class="tools" id="lyrT"><button id="fsm">خط أصغر</button><button id="fsp">خط أكبر</button></div>${keyLine(n)}<div class="lyr">${lyr}</div><button class="mist" id="mist">${IC.chat}<span>لقيت غلطة في الترنيمة دي؟ ابعتها لنا</span></button>`;
  $('main').querySelectorAll('.vch').forEach(b => b.onclick = () => openPassage(vs[+b.dataset.k][0], n));
  if ($('sty')) $('sty').onclick = e => { if (!e.target.closest('#ads')) openPassage(sp, n); };
  $('adf').onclick = () => addToForsa({ t: 'h', n, note: '' }, 'الترنيمة');
  if ($('gky')) $('gky').onclick = () => { const y = $('lyrT').getBoundingClientRect().top + scrollY - 70; scrollTo({ top: y, behavior: 'smooth' }); };
  if ($('glr')) $('glr').onclick = () => { const y = $('lyrT').getBoundingClientRect().top + scrollY - 70; scrollTo({ top: y, behavior: 'smooth' }); };
  $('main').querySelectorAll('.vplus').forEach(b => b.onclick = () => { const p = vs[+b.dataset.vk][0]; withBible(() => addToForsa({ t: 'v', b: p.b, c: p.c, v: p.v, v2: p.v2, note: '' }, 'الشاهد')); });
  if ($('ads')) $('ads').onclick = () => withBible(() => addToForsa({ t: 'v', b: sp.b, c: sp.c, v: sp.v, v2: sp.v2, note: '' }, 'القصة'));
  $('fv').onclick = () => { const i = FAV.indexOf(n); if (i >= 0) FAV.splice(i, 1); else FAV.unshift(n); saveFav(); buzz(); $('fv').classList.toggle('on', i < 0); toast(i < 0 ? 'اتضافت للمفضلة' : 'اتشالت من المفضلة'); };
  $('shr').onclick = () => shareHymn(n);
  $('mist').onclick = () => suggest(n);
  $('fsm').onclick = () => fontStep(-1); $('fsp').onclick = () => fontStep(1);
  scrollTo(0, 0);
}
function fontStep(d) { PREF.fs = Math.max(15, Math.min(30, PREF.fs + d * 2)); savePref(); document.documentElement.style.setProperty('--fs', PREF.fs + 'px'); }
async function shareHymn(n) {
  const h = H[n - 1], d = HD[n], seen = new Set();
  const asis = h.slides.every(s => !s.label);
  const words = h.slides.filter(s => { const k = s.lines.join('\n'); if (!asis && seen.has(k)) return false; seen.add(k); return true; }).map(s => s.lines.join('\n')).join('\n\n');
  const txt = `${h.title}\n\n${words}` + (d ? `\n\nفكرة الترنيمة: ${d.i}\nقصة مقترحة: ${d.s[0]}` : '');
  try { if (navigator.share) { await navigator.share({ title: h.title, text: txt }); return; } } catch (e) { return; }
  try { await navigator.clipboard.writeText(txt); toast('الترنيمة اتنسخت'); } catch (e) { toast('مش قادر أنسخ هنا'); }
}
function openPassage(p, fromHymn) { NAV.from = fromHymn; location.hash = `#/b/${p.b}/${p.c}/${p.v}-${p.v2}`; }

function vTopics() {
  setTab('topics'); homeBar('الترانيم متقسمة موضوعات'); showSearch(false);
  let out = '', sec = null;
  T.forEach(t => {
    if (t.section !== sec) { sec = t.section; out += `<div><span class="letter">${esc(sec)}</span></div>`; }
    out += `<a class="it" href="#/t/${t.id}"><div class="tp"><div class="t">${esc(t.name)}</div><span class="n">${arD(t.nums.length)} ترنيمة</span></div>${t.ref ? `<div class="s">${esc(t.ref.replace(/\d/g, d => arD(d)))}</div>` : ''}</a>`;
  });
  $('main').innerHTML = out;
}
function vTopic(id) {
  const t = T.find(x => x.id === id); if (!t) { location.hash = '#/topics'; return; }
  setTab('topics'); backBar('المواضيع'); showSearch(false);
  const head = `<div class="ht"><span class="hl">${esc(t.name)}</span></div><div class="s" style="color:var(--mut);font-weight:700;margin-bottom:6px">${arD(t.nums.length)} ترنيمة</div>`;
  const draw = () => { $('main').innerHTML = head + (NAV.byKey ? keyHTML(t.nums) : alphaHTML(t.nums)); };
  document.querySelectorAll('#kbar').forEach(x => x.remove());
  if (t.nums.some(n => KY[n])) {   // only when some hymn in this topic has an approved Key
    const kb = document.createElement('div'); kb.id = 'kbar';
    const set = () => { kb.innerHTML = `<button class="${NAV.byKey ? 'on' : ''}">${NAV.byKey ? 'خلّي الترتيب أبجدي' : 'خلّي الترتيب حسب الـKey'}</button>`; kb.firstChild.onclick = () => { NAV.byKey = !NAV.byKey; set(); draw(); scrollTo(0, 0); }; };
    set(); document.querySelector('header.top .in').appendChild(kb);
  }
  draw();
  scrollTo(0, 0);
}
// ---------- Keys (approved by the musicians' reviewers, from the keys sheet) ----------
const KROOT = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const KNAME = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
function keyMajor(k) {   // the major of a key's family: Am -> C (same notes)
  const m = /^([A-G](?:#|b)?)(m?)/.exec(k || ''); if (!m || KROOT[m[1]] == null) return null;
  return (KROOT[m[1]] + (m[2] ? 3 : 0)) % 12;
}
function keyLine(n) {
  const k = KY[n]; if (!k) return '';
  return `<div class="keyl">Key: ${esc(k[0])}${k[1] ? `<span>Transpose ${k[1] > 0 ? '+' : ''}${k[1]}</span>` : ''}</div>`;
}
function keyHTML(nums) {
  // Shady: C, Cm, D, Dm, E, Em … (each key a group, major before its minor), then the hymns with no Key
  const grp = {}, none = [];
  nums.forEach(n => { const k = KY[n] && KY[n][0]; if (!k || keyRank(k) == null) none.push(n); else (grp[k] = grp[k] || []).push(n); });
  const ks = Object.keys(grp); if (!ks.length) return alphaHTML(nums);
  ks.sort((a, b) => keyRank(a) - keyRank(b));
  const alpha = alphaOrder(nums);
  let out = '';
  ks.forEach(k => {
    out += `<div class="lh"><span class="letter" style="direction:ltr">${esc(k)}</span></div>`;
    grp[k].sort((a, b) => alpha.indexOf(a) - alpha.indexOf(b)).forEach(n => out += hymnItem(n, null, KY[n]));
  });
  if (none.length) out += `<div class="lh"><span class="letter">من غير Key</span></div>` + none.sort((a, b) => alpha.indexOf(a) - alpha.indexOf(b)).map(n => hymnItem(n)).join('');
  return out;
}
function keyRank(k) {   // C=0 … B=11, minor right after its major (C, Cm, C#, C#m, D, Dm …)
  const m = /^([A-G](?:#|b)?)(m?)$/.exec(String(k).trim()); if (!m || KROOT[m[1]] == null) return null;
  return KROOT[m[1]] * 2 + (m[2] ? 1 : 0);
}
function alphaOrder(nums) {
  const L0 = n => firstLetter(H[n - 1].title), D0 = n => H[n - 1].d || '';
  const sorted = nums.slice().sort((a, b) => a - b), order = [...new Set(sorted.map(L0))].sort((x, y) => LRANK(x) - LRANK(y));
  return sorted.sort((a, b) => order.indexOf(L0(a)) - order.indexOf(L0(b)) || (D0(b) > D0(a) ? 1 : D0(b) < D0(a) ? -1 : a - b));
}

// ---------- Bible ----------
let bibleWait = null;
function needBible(then) {
  if (B) return then();
  $('main').innerHTML = '<div class="empty">بيحمّل الكتاب المقدس…</div>';
  loadBible().then(then);
}
function vBible() {
  setTab('bible'); homeBar('الكتاب المقدس'); showSearch(true, 'شاهد زي يو ٣ ١٦ أو أي كلام من الآية…');
  $('q').value = NAV.q.bible; sboxState();
  const q = latinDigits(NAV.q.bible.trim());
  if (!q) {
    // two buttons at the top (العهد القديم | العهد الجديد) — only the chosen one shows, no long scroll to reach the New Testament
    const btn = (i) => `<button data-b="${i}">${esc(bookName(i))}</button>`;
    let t = localStorage.getItem('ssw_testament') === 'nt' ? 'nt' : 'ot';
    const draw = () => {
      const list = t === 'nt' ? BK.slice(39).map((_, i) => i + 39) : BK.slice(0, 39).map((_, i) => i);
      $('main').innerHTML = `<div class="seg" role="tablist"><button data-t="ot" class="${t === 'ot' ? 'on' : ''}">العهد القديم</button><button data-t="nt" class="${t === 'nt' ? 'on' : ''}">العهد الجديد</button></div><div class="grid fadein">${list.map(btn).join('')}</div>`;
      $('main').querySelectorAll('[data-b]').forEach(b => b.onclick = () => { location.hash = '#/b/' + b.dataset.b; });
      $('main').querySelectorAll('.seg [data-t]').forEach(b => b.onclick = () => { if (t === b.dataset.t) return; t = b.dataset.t; try { localStorage.setItem('ssw_testament', t); } catch (e) {} draw(); });
    };
    draw();
    return;
  }
  needBible(() => {
    if (location.hash !== '#/bible') return;
    let out = '';
    const ab = abbrevRef(q), p = ab ? null : KE.parse(q, H, B);
    const one = ab || (p && p.type === 'verse' ? { b: p.b, c: p.c, v: p.v, v2: p.v } : null);
    if (one && B[one.b].chapters[one.c] && B[one.b].chapters[one.c][one.v] !== undefined) out += `<div class="sec">الشاهد</div><a class="it" href="#/b/${one.b}/${one.c}/${one.v}-${one.v}"><div class="t">${esc(ref(one.b, one.c, one.v))}</div><div class="s n">${esc(B[one.b].chapters[one.c][one.v])}</div></a>`;
    const res = q.length > 2 ? KE.searchBible(q, 40) : [];
    if (res.length) out += '<div class="sec">آيات فيها الكلام ده</div>' + res.map(r => `<a class="it" href="#/b/${r.b}/${r.c}/${r.v}-${r.v}"><div class="t" style="font-size:15px">${esc(ref(r.b, r.c, r.v))}</div><div class="s n">${esc(B[r.b].chapters[r.c][r.v])}</div></a>`).join('');
    $('main').innerHTML = out || '<div class="empty">مالقيتش حاجة<br>جرّب كلمة تانية أو اكتب الشاهد زي: يو ٣ ١٦</div>';
  });
}
function vBook(b) {
  setTab('bible'); backBar('الكتاب المقدس'); showSearch(false);
  needBible(() => {
    const n = B[b].chapters.length;
    $('main').innerHTML = `<div class="ht"><span class="hl">${esc(bookName(b))}</span></div><div class="sec">الأصحاحات</div><div class="grid ch">${Array.from({ length: n }, (_, i) => `<button data-c="${i}">${arD(i + 1)}</button>`).join('')}</div>`;
    $('main').querySelectorAll('[data-c]').forEach(x => x.onclick = () => { location.hash = `#/b/${b}/${x.dataset.c}`; });
  });
}
function vChapter(b, c, v1, v2) {
  setTab(NAV.from ? NAV.tab : 'bible'); showSearch(false);
  const from = NAV.from && v1 != null ? NAV.from : null;
  if (from) backBar('رجوع للترنيمة: ' + hName(from), '', true); else backBar(bookName(b));
  needBible(() => {
    const ch = B[b] && B[b].chapters[c]; if (!ch) { location.hash = '#/bible'; return; }
    const hit = i => v1 != null && i >= v1 && i <= v2;
    $('main').innerHTML = `<div class="ht"><span class="hl">${esc(bookName(b))} ${arD(c + 1)}</span></div><div class="tools"><button id="fsm">خط أصغر</button><button id="fsp">خط أكبر</button></div>`
      + ch.map((t, i) => `<div class="vl${hit(i) ? ' hit' : ''}" id="v${i}"><b>${arD(i + 1)}</b>${esc(t)}</div>`).join('')
      + `<div class="cnav">${c > 0 ? `<button id="pc">‹ الأصحاح ${arD(c)}</button>` : '<span></span>'}${c < B[b].chapters.length - 1 ? `<button id="nc">الأصحاح ${arD(c + 2)} ›</button>` : ''}</div>`;
    $('fsm').onclick = () => fontStep(-1); $('fsp').onclick = () => fontStep(1);
    verseSelect(b, c);
    if ($('pc')) $('pc').onclick = () => { NAV.from = null; location.hash = `#/b/${b}/${c - 1}`; };
    if ($('nc')) $('nc').onclick = () => { NAV.from = null; location.hash = `#/b/${b}/${c + 1}`; };
    const t = v1 != null && $('v' + Math.max(0, v1 - 1));
    if (t) t.scrollIntoView({ block: 'start' }); else scrollTo(0, 0);
    if (t) scrollBy(0, -130);
  });
}
// drag-to-reorder (favourites «رتّبهم»): hold the ≡ handle and drag the row; the other rows slide out of the way
function dragSort(root, onDrop) {
  root.querySelectorAll('.ordr .dh').forEach(h => h.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    e.preventDefault();
    const row = h.closest('.ordr'), rows = [...root.querySelectorAll('.ordr')], from = rows.indexOf(row);
    const step = row.offsetHeight + parseFloat(getComputedStyle(row).marginBottom || 0);
    let y0 = e.clientY, sy0 = scrollY, cy = e.clientY, to = from, raf = 0, done = false;
    try { h.setPointerCapture(e.pointerId); } catch (x) {}
    row.classList.add('drag'); buzz();
    rows.forEach(r => { if (r !== row) r.classList.add('slide'); });
    const place = () => {
      const dy = cy - y0 + scrollY - sy0;
      row.style.transform = 'translateY(' + dy + 'px)';
      let t = Math.max(0, Math.min(rows.length - 1, from + Math.round(dy / step)));
      if (t !== to) { to = t; buzz(); }
      rows.forEach((r, i) => { if (r === row) return; r.style.transform = from < i && i <= to ? 'translateY(' + -step + 'px)' : to <= i && i < from ? 'translateY(' + step + 'px)' : ''; });
    };
    const tick = () => {   // scroll the page while the finger is near the top / bottom edge
      raf = 0; if (done) return;
      const top = (document.querySelector('.top') || {}).offsetHeight || 0, bot = innerHeight - (($('tabs') || {}).offsetHeight || 0);
      const v = cy < top + 60 ? -8 : cy > bot - 60 ? 8 : 0;
      if (v) { scrollBy(0, v); place(); raf = requestAnimationFrame(tick); }
    };
    const move = ev => { cy = ev.clientY; place(); if (!raf) raf = requestAnimationFrame(tick); };
    const end = () => {
      done = true; removeEventListener('pointermove', move); removeEventListener('pointerup', end); removeEventListener('pointercancel', end);
      rows.forEach(r => { r.style.transform = ''; r.classList.remove('slide', 'drag'); });
      if (to !== from) onDrop(from, to);
    };
    addEventListener('pointermove', move); addEventListener('pointerup', end); addEventListener('pointercancel', end);
  }));
}
function vFav() {
  setTab('fav'); homeBar('الترانيم اللي علّمت عليها'); showSearch(false);
  const ord = !!vFav.ord;
  $('main').innerHTML = FAV.length ? `<div class="hint">علّم على ترانيم الدرس اللي جاي بالقلب ♡ من صفحة الترنيمة، وتلاقيها هنا على طول. اسحب أي ترنيمة لليسار عشان تشيلها.</div><div class="tools"><button id="ford" class="${ord ? 'on' : ''}">${ord ? 'خلصت الترتيب' : 'رتّبهم'}</button></div>` + FAV.map((n, i) => H[n - 1] ? (ord ? `<div class="ordr" data-i="${i}"><button class="dh" aria-label="اسحب عشان ترتّب">${ICF.grip}</button>${hymnItem(n)}</div>` : swRow(hymnItem(n), [['rm', 'شيل', n]])) : '').join('')
    : '<div class="empty">لسه ماعلّمتش على ترانيم<br>افتح أي ترنيمة ودوس على القلب ♡</div>';
  if ($('ford')) $('ford').onclick = () => { vFav.ord = !vFav.ord; const y = scrollY; vFav(); scrollTo(0, y); };
  if (ord) dragSort($('main'), (from, to) => { const [x] = FAV.splice(from, 1); FAV.splice(to, 0, x); saveFav(); const y = scrollY; vFav(); scrollTo(0, y); });
  swipeBind($('main'), (act, n, row) => { n = +n; row.classList.add('gone'); undoBar('اتشالت من المفضلة', () => { row.classList.remove('gone'); swClose(row); }, () => { FAV = FAV.filter(x => x !== n); saveFav(); if (location.hash === '#/fav') { const y = scrollY; vFav(); scrollTo(0, y); } }); });
}
function vAbout() {
  setTab(''); backBar('رجوع'); showSearch(false);
  $('main').innerHTML = `<div class="ht"><span class="hl">ترانيم مدارس الأحد</span></div><div style="direction:ltr;text-align:right;color:var(--mut);font-weight:700;white-space:nowrap;font-size:min(16px,4.2vw)">Brethren Sunday School Presenter</div>
  <div class="card"><p>تدوّر على أي ترنيمة، وتشوف فكرتها والآيات اللي كلامها مأخوذ منها وقصة مناسبة ليها، وتقرا في الكتاب المقدس. بيشتغل من غير نت، وبيتحدّث لوحده لما تنزل ترانيم جديدة.</p></div>
  <div class="card"><span class="lb"><span>فرصي</span></span><p style="font-weight:500">حضّر الفرصة: ضيف الترانيم والشواهد واكتب ملاحظاتك.<br>لو سجّلت دخول بحساب جوجل من «فرصي»، فرصك بتتحفظ لوحدها ومش هتضيع.<br>لو ماسجّلتش، البرنامج شغال عادي، بس الفرص بتفضل على الموبايل ده بس، فخد منها نسخة (زرار «خد نسخة») وابعتها لنفسك واتساب.</p></div>
  <div class="card"><span class="lb"><span>رجاء محبة</span></span><p style="font-weight:500">استخدم البرنامج للمساعدة بس، لأنه مش بديل إنك تاخد وقت قدّام الرب وتطلب إرشاده قبل فرصة الترانيم.</p></div>
  <div class="card"><span class="lb"><span>ضيفه للشاشة الرئيسية</span></span><p style="font-weight:500"><a href="../#add" style="color:var(--link);font-weight:800;text-decoration:underline">شوف الخطوات بالصور</a><br><b>آيفون:</b> من Safari دوس زرار المشاركة وبعدين «Add to Home Screen».<br><b>أندرويد:</b> من Chrome دوس النقط التلاتة وبعدين «Add to Home screen» أو «Install app».</p></div>
  <div class="card"><span class="lb"><span>للعرض على البروجكتور</span></span><p style="font-weight:500">نزّل برنامج الكمبيوتر من <a href="../" style="color:var(--link);text-decoration:underline">هنا</a>.</p></div>
  <div class="card"><span class="lb"><span>لقيت غلطة أو عندك ترنيمة ناقصة؟</span></span><p style="font-weight:500">ابعتها لنا <a href="https://wa.me/201227120955" target="_blank" rel="noopener" style="color:var(--link);text-decoration:underline">واتساب</a> (ولو ترنيمة جديدة ابعت كلامها مكتوب أو ملف PowerPoint)، ولما تتراجع بتنزل للكل.</p></div>
  <p style="text-align:center;color:var(--mut);font-size:13px" id="dv"></p>`;
  $('dv').textContent = 'نسخة الترانيم ' + arD(localStorage.getItem('sswb_dv') || DATA_VERSION);
  const tc = document.createElement('div'); tc.className = 'card'; tc.innerHTML = `<span class="lb"><span>الشكل</span></span><div class="seg" style="position:static;margin:8px 0 0"><button data-m="auto">زي الموبايل</button><button data-m="light">فاتح</button><button data-m="dark">غامق</button></div>`;
  $('main').insertBefore(tc, $('main').children[2] || null);
  const mark = () => tc.querySelectorAll('[data-m]').forEach(b => b.classList.toggle('on', b.dataset.m === THEME.get()));
  tc.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { THEME.set(b.dataset.m); mark(); }); mark();
}


// ---------- letters: a small handle on the side; hold it and the letters open, slide to jump, let go and they hide ----------
const AZ = { heads: [], on: false };
const azLbl = L => L === 'English' ? 'En' : L;
function topH() { return document.querySelector('.top').getBoundingClientRect().height; }
function azSetup() {
  document.documentElement.style.setProperty('--azt', Math.round(topH()) + 'px');
  AZ.heads = [...document.querySelectorAll('#main .lh')];
  AZ.on = AZ.heads.length > 3 && !location.hash.startsWith('#/t/');   // topics are short: no letter handle there
  $('azh').style.display = AZ.on ? '' : 'none';
  $('az').classList.remove('open');
  if (!AZ.on) return;
  $('az').innerHTML = AZ.heads.map((h, i) => `<span data-i="${i}">${azLbl(h.dataset.l)}</span>`).join('');
  azPlace();
}
addEventListener('resize', () => { if (AZ.on) azSetup(); });
// keep the sticky letters and the handle in place when the header or the list changes size after the first draw (fonts, notes, cards)
try { const ro = new ResizeObserver(() => { document.documentElement.style.setProperty('--azt', Math.round(topH()) + 'px'); azPlace(); }); ro.observe(document.querySelector('.top')); ro.observe($('main')); } catch (e) {}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => azPlace());
// the handle sits where you are in the list (like a scrollbar thumb) and shows the current letter
// letter headers are sticky, so measure the first hymn under each letter (it never sticks)
const azFirst = h => h.nextElementSibling || h;
function azCur() { const t = topH() + 60; let cur = AZ.heads[0]; for (const h of AZ.heads) { if (azFirst(h).getBoundingClientRect().top <= t) cur = h; else break; } return cur; }
function azPlace() {
  if (!AZ.on) return;
  const h0 = AZ.heads[0], bot = innerHeight - 82 - 52, max = document.documentElement.scrollHeight - innerHeight;
  // at the very top the handle sits next to the first letter header (not over the note above it), then follows the scroll
  const top = Math.min(bot, Math.max(topH() + 6, h0 ? h0.getBoundingClientRect().top - 8 : 0));
  const f = max > 0 ? Math.min(1, scrollY / max) : 0;
  $('azh').style.top = Math.round(top + f * Math.max(0, bot - top)) + 'px';
  const c = azCur(); if (c) $('azh').textContent = azLbl(c.dataset.l);
}
function azJump(i) {
  const h = AZ.heads[i]; if (!h) return;
  scrollTo({ top: azFirst(h).getBoundingClientRect().top + scrollY - topH() - h.offsetHeight - 10, behavior: 'auto' });
  azBubble(h.dataset.l);
  document.querySelectorAll('#az span').forEach((s, k) => s.classList.toggle('cur', k === i));
}
let azT;
function azBubble(L) { const b = $('azb'); b.textContent = azLbl(L); b.classList.add('show'); clearTimeout(azT); azT = setTimeout(() => b.classList.remove('show'), 500); }
function azIndexAt(y) {
  const r = $('az').getBoundingClientRect();
  return Math.max(0, Math.min(AZ.heads.length - 1, Math.floor((y - r.top) / r.height * AZ.heads.length)));
}
let azDrag = false, azLast = -1, azShowT;
function azStart(y) {
  if (!AZ.on) return false;
  azDrag = true; $('azh').classList.add('act'); $('az').classList.add('open');
  const c = azCur(); azLast = AZ.heads.indexOf(c);
  document.querySelectorAll('#az span').forEach((s, k) => s.classList.toggle('cur', k === azLast));
  azBubble(c.dataset.l);
  return true;
}
function azMove(y) {
  if (!azDrag) return;
  const i = azIndexAt(y);
  if (i !== azLast) { azLast = i; azJump(i); if (navigator.vibrate) navigator.vibrate(4); }
  $('azh').style.top = Math.max(topH() + 6, Math.min(innerHeight - 82 - 52, y - 26)) + 'px';
  $('azh').textContent = azLbl(AZ.heads[i].dataset.l);
}
function azEnd() { if (!azDrag) return; azDrag = false; $('azh').classList.remove('act'); $('az').classList.remove('open'); azPlace(); }
// phones: touch events (work the same up and down, iPhone included)
$('azh').addEventListener('touchstart', e => { if (azStart(e.touches[0].clientY)) e.preventDefault(); }, { passive: false });
addEventListener('touchmove', e => { if (!azDrag) return; e.preventDefault(); azMove(e.touches[0].clientY); }, { passive: false });
addEventListener('touchend', e => { if (azDrag && !e.touches.length) azEnd(); });
addEventListener('touchcancel', azEnd);
// computer mouse
$('azh').addEventListener('mousedown', e => { if (azStart(e.clientY)) e.preventDefault(); });
addEventListener('mousemove', e => { if (azDrag) azMove(e.clientY); });
addEventListener('mouseup', azEnd);
// scrolling by hand: the handle lights up and follows, then fades again
addEventListener('scroll', () => {
  if (!AZ.on || azDrag) return;
  azPlace(); $('azh').classList.add('show'); clearTimeout(azShowT); azShowT = setTimeout(() => $('azh').classList.remove('show'), 1200);
}, { passive: true });

// ---------- «فرصي»: the servant prepares a فرصة (hymns + verses + notes); kept on this phone only ----------
let FR = [];
try { FR = JSON.parse(localStorage.getItem('ssw_forsa') || '[]'); } catch (e) {}
const saveFR = () => { try { localStorage.setItem('ssw_forsa', JSON.stringify(FR)); } catch (e) { toast('مش قادر أحفظ على الموبايل ده'); } if (window.cloudDirty) cloudDirty(); };
const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const todayStr = () => ymd(new Date());
const MON = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const DAY = ['الأحد', 'الاتنين', 'التلات', 'الأربع', 'الخميس', 'الجمعة', 'السبت'];
function fDate(s) { const [y, m, d] = String(s || todayStr()).split('-').map(Number); const t = new Date(y, m - 1, d); return `${DAY[t.getDay()]} ${arD(d)} ${MON[m - 1]} ${arD(y)}`; }
function whenTxt(s) {
  const a = new Date(s + 'T00:00'), b = new Date(todayStr() + 'T00:00'), n = Math.round((a - b) / 864e5);
  return n === 0 ? 'النهارده' : n === 1 ? 'بكرة' : n === -1 ? 'امبارح' : n > 1 && n < 8 ? 'كمان ' + arD(n) + ' أيام' : '';
}
const fName = f => f.title || 'فرصة ' + fDate(f.date).split(' ').slice(1, 3).join(' ');
const fById = id => FR.find(f => f.id === id);
function newForsa() {
  const f = { id: Date.now().toString(36), date: todayStr(), title: '', place: '', note: '', items: [] };
  FR.unshift(f); saveFR(); try { localStorage.setItem('ssw_flast', f.id); } catch (e) {} return f;
}
const fSort = () => FR.slice().sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : b.id > a.id ? 1 : -1));
const verseText = it => B && B[it.b] && B[it.b].chapters[it.c] ? B[it.b].chapters[it.c].slice(it.v, it.v2 + 1).join(' ') : (it.x || '');
const itemKey = it => it.t === 'h' ? 'h' + it.n : `v${it.b}.${it.c}.${it.v}.${it.v2}`;
function countTxt(f) {
  const h = f.items.filter(i => i.t === 'h').length, v = f.items.length - h, out = [];
  if (h) out.push(h === 1 ? 'ترنيمة' : h === 2 ? 'ترنيمتين' : arD(h) + (h <= 10 ? ' ترانيم' : ' ترنيمة'));
  if (v) out.push(v === 1 ? 'شاهد' : v === 2 ? 'شاهدين' : arD(v) + (v <= 10 ? ' شواهد' : ' شاهد'));
  return out.join(' و') || 'لسه فاضية';
}
const ICF = {
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="m6 15 6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
  grip: '<svg viewBox="0 0 24 24"><path d="M5 8h14M5 12h14M5 16h14"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/></svg>',
  note: '<svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>'
};

// the log: every فرصة, coming ones first
function vForsaList() {
  setTab('forsa'); homeBar('حضّر فرصتك: ترانيم وشواهد وملاحظات'); showSearch(false);
  const t = todayStr(), all = fSort(), up = all.filter(f => f.date >= t).reverse(), past = all.filter(f => f.date < t);
  const row = f => { const w = whenTxt(f.date); return swRow(`<a class="it fl" href="#/f/${f.id}"><div class="t">${esc(fName(f))}${w ? `<span class="badge">${w}</span>` : ''}</div><div class="s">${esc(fDate(f.date))}${f.place ? ' · ' + esc(f.place) : ''} · ${countTxt(f)}</div></a>`, [['dup', 'نسخة', f.id], ['del', 'امسح', f.id]]); };
  $('main').innerHTML = `<button class="newf" id="nf">${ICF.plus.replace('<svg', '<svg style="width:22px;height:22px;stroke:#111;fill:none;stroke-width:2.6;stroke-linecap:round"')} فرصة جديدة</button>`
    + (FR.length ? '' : `<div class="hint">اعمل فرصة، وضيف ليها الترانيم والشواهد اللي هتستخدمها، واكتب ملاحظاتك. الفرص كلها بتفضل متسجلة هنا بتاريخها.</div>`)
    + (up.length ? `<div class="sec">الفرص الجاية</div>${up.map(row).join('')}` : '')
    + (past.length ? `<div class="sec">الفرص اللي فاتت</div>${past.map(row).join('')}` : '')
    + (window.cloudCardHTML ? cloudCardHTML() : '')
    + (window.cloudSignedIn && cloudSignedIn() ? '' : `<div class="hint fbk"><b>فرصك بتتحفظ على الموبايل ده بس.</b> لو عايز تحافظ عليها وتلاقيها لو غيّرت الموبايل أو بتستخدم أكتر من موبايل، سجّل دخول بجوجل.
      <div class="fbk-b">${FR.length ? '<button id="bkS">خد نسخة</button>' : ''}<button id="bkR">رجّع نسخة</button></div><input type="file" id="bkF" accept=".json,application/json,text/plain" hidden></div>`);   // signed in: the account keeps them, so no file backup box
  $('nf').onclick = () => { const f = newForsa(); location.hash = '#/f/' + f.id; };
  if ($('bkS')) $('bkS').onclick = backupForsas;
  if ($('bkR')) $('bkR').onclick = () => $('bkF').click();
  if ($('bkF')) $('bkF').onchange = () => { const f = $('bkF').files[0]; if (f) restoreForsas(f); };
  if (window.cloudBind) cloudBind();
  swipeBind($('main'), (act, id, row) => {
    const f = fById(id); if (!f) return;
    if (act === 'dup') {
      const c = JSON.parse(JSON.stringify(f)); c.id = Date.now().toString(36); c.date = todayStr(); c.title = fName(f) + ' (نسخة)'; delete c.u;
      FR.unshift(c); saveFR(); buzz(); toast('اتعملت نسخة: «' + c.title + '»'); vForsaList(); return;
    }
    row.classList.add('gone');   // really deleted only after 5 s, so «تراجع» puts it back as it was
    undoBar('الفرصة اتمسحت', () => { row.classList.remove('gone'); swClose(row); }, () => { FR = FR.filter(x => x.id !== id); saveFR(); if (location.hash === '#/f') vForsaList(); });
  });
}
// ---------- swipe a row to the left to show its buttons ----------
function swRow(inner, acts) {
  return `<div class="swr"><div class="swa">${acts.map(([a, t, v]) => `<button data-sw="${a}" data-v="${esc(String(v))}" class="sw-${a}">${t}</button>`).join('')}</div><div class="swc">${inner}</div></div>`;
}
function swClose(r) { const c = r && r.querySelector('.swc'); if (c) { c.style.transform = ''; r.classList.remove('open'); } }
function swipeBind(root, onAct) {
  root.querySelectorAll('.swr').forEach(r => {
    const c = r.querySelector('.swc'), W = () => r.querySelector('.swa').offsetWidth;
    let x0 = 0, y0 = 0, dx = 0, mode = '', base = 0;
    c.addEventListener('touchstart', e => { const t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; dx = 0; mode = ''; base = r.classList.contains('open') ? -W() : 0; c.style.transition = 'none'; }, { passive: true });
    c.addEventListener('touchmove', e => {
      const t = e.touches[0], ddx = t.clientX - x0, ddy = t.clientY - y0;
      if (!mode) { if (Math.abs(ddx) < 8 && Math.abs(ddy) < 8) return; mode = Math.abs(ddx) > Math.abs(ddy) * 1.3 ? 'x' : 'y'; if (mode === 'x') root.querySelectorAll('.swr.open').forEach(o => { if (o !== r) swClose(o); }); }
      if (mode !== 'x') return;
      e.preventDefault(); dx = ddx; c.style.transform = `translateX(${Math.max(-W() - 20, Math.min(0, base + dx))}px)`;
    }, { passive: false });
    c.addEventListener('touchend', () => {
      c.style.transition = '';
      if (mode !== 'x') return;
      const open = base + dx < -W() / 2; c.style.transform = open ? `translateX(${-W()}px)` : ''; r.classList.toggle('open', open); if (open) buzz();
    });
    c.addEventListener('click', e => { if (r.classList.contains('open') || mode === 'x') { e.preventDefault(); e.stopPropagation(); swClose(r); mode = ''; } }, true);
    r.querySelectorAll('[data-sw]').forEach(b => b.onclick = () => onAct(b.dataset.sw, b.dataset.v, r));
  });
}
// a bar at the bottom: «… · تراجع» for 5 s; the change happens only when it closes
function undoBar(msg, undo, commit) {
  const old = document.getElementById('undo'); if (old && old._commit) { clearTimeout(old._t); old._commit(); old.remove(); }
  const d = document.createElement('div'); d.id = 'undo'; d.className = 'undo'; d.innerHTML = `<span>${esc(msg)}</span><button>تراجع</button>`;
  document.body.appendChild(d); d._commit = commit; buzz();
  d.querySelector('button').onclick = () => { clearTimeout(d._t); d._commit = null; d.remove(); undo(); };
  d._t = setTimeout(() => { if (d._commit) d._commit(); d.remove(); }, 5000);
}

// one فرصة
function vForsa(id) {
  const f = fById(id); if (!f) { location.hash = '#/f'; return; }
  try { localStorage.setItem('ssw_flast', f.id); } catch (e) {}
  setTab('forsa'); showSearch(false);
  backBar('فرصي');
  const save = () => { saveFR(); };
  let st; const later = () => { clearTimeout(st); st = setTimeout(save, 300); };
  const items = f.items.map((it, i) => {
    const main = it.t === 'h'
      ? `<div class="fi-main"><a href="#/h/${it.n}"><div class="k">ترنيمة</div><div class="t">${esc(H[it.n - 1] ? hName(it.n) : '—')}</div></a></div>`
      : `<a class="fi-main" href="#/b/${it.b}/${it.c}/${it.v}-${it.v2}"><div class="k">شاهد</div><div class="t">${esc(refTxt(it))}</div><div class="s">${esc(verseText(it))}</div></a>`;
    return `<div class="fi" data-i="${i}"><div class="fi-top"><span class="fnum">${arD(i + 1)}</span>${main}<div class="fi-act"><button data-a="up" ${i ? '' : 'disabled'} aria-label="لفوق">${ICF.up}</button><button data-a="down" ${i < f.items.length - 1 ? '' : 'disabled'} aria-label="لتحت">${ICF.down}</button><button data-a="del" aria-label="شيل">${ICF.x}</button></div></div>`
      + (it.t === 'h' && HD[it.n] && !f.hideSug ? (it.sug ? hymnSug(it.n) + `<button class="sgb" data-a="sug">اخفي الآيات والقصة</button>` : `<button class="sgb" data-a="sug">اظهر الآيات والقصة ‹</button>`) : '')
      + (it.note ? `<textarea class="fnote" rows="1" placeholder="ملاحظة…">${esc(it.note)}</textarea>` : `<button class="addnote" data-a="note">+ ملاحظة ${it.t === 'h' ? 'على الترنيمة دي' : 'على الشاهد ده'}</button>`) + '</div>';
  }).join('');
  $('main').innerHTML = `<div class="fhead"><input class="ftitle" id="fT" placeholder="عنوان الفرصة (اختياري)" value="${esc(f.title)}">
    <div class="frow"><label for="fD">التاريخ</label><input type="date" id="fD" value="${f.date}"><span class="dl" id="fDl">${whenTxt(f.date)}</span></div>
    <div class="frow"><label for="fP">المكان</label><input id="fP" placeholder="اختياري" value="${esc(f.place)}"></div></div>
    <div class="sec fsec"><span>الترانيم والشواهد</span>${f.items.some(i => i.t === 'h' && HD[i.n]) ? `<button class="sugt" id="sugT">${f.hideSug ? 'اظهر الاقتراحات' : 'اخفي الاقتراحات'}</button>` : ''}</div>
    ${items || '<div class="hint">لسه مافيش حاجة. ضيف ترنيمة أو شاهد من هنا، أو من صفحة أي ترنيمة بزرار «ضيفها لفرصة».</div>'}
    <div class="fadd"><button id="aH">${ICF.plus} ترنيمة</button><button id="aV">${ICF.plus} شاهد</button></div>
    <div class="fref" id="fR"><input id="fRi" placeholder="زي: يو ٣ ١٦ أو مز ٢٣ ١-٤" enterkeyhint="done"><button id="fRb">ضيف</button></div>
    <div class="fref-h">أو افتح «الكتاب» ودوس على الآية وبعدين «ضيف للفرصة».</div>
    <div class="sec">ملاحظاتك على الفرصة</div>
    <textarea class="fnotes" id="fN" placeholder="اكتب أي حاجة: ترتيب الفرصة، الفكرة، حاجة عايز تقولها…">${esc(f.note)}</textarea>
    <button class="fdel" id="fX">امسح الفرصة دي</button>`;
  const grow = el => { el.style.height = 'auto'; el.style.height = el.scrollHeight + 2 + 'px'; };
  document.querySelectorAll('#main textarea').forEach(grow);
  $('fT').oninput = () => { f.title = $('fT').value.trim(); later(); };
  $('fP').oninput = () => { f.place = $('fP').value.trim(); later(); };
  $('fD').onchange = () => { if ($('fD').value) { f.date = $('fD').value; save(); $('fDl').textContent = whenTxt(f.date); } else $('fD').value = f.date; };
  $('fN').oninput = () => { grow($('fN')); f.note = $('fN').value; later(); };
  $('main').querySelectorAll('.fi').forEach(el => {
    const i = +el.dataset.i;
    const ta = el.querySelector('.fnote'); if (ta) ta.oninput = () => { grow(ta); f.items[i].note = ta.value; later(); };
    el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
      const a = b.dataset.a;
      if (a === 'note') { b.outerHTML = `<textarea class="fnote" rows="1" placeholder="ملاحظة…"></textarea>`; const t = el.querySelector('.fnote'); t.oninput = () => { grow(t); f.items[i].note = t.value; later(); }; t.focus(); return; }
      if (a === 'sug') { f.items[i].sug = !f.items[i].sug; save(); const y = scrollY; vForsa(id); scrollTo(0, y); return; }
      if (a === 'del') { const [gone] = f.items.splice(i, 1); save(); vForsa(id); undoToast('اتشالت', () => { f.items.splice(i, 0, gone); save(); vForsa(id); }); return; }
      const j = a === 'up' ? i - 1 : i + 1; if (j < 0 || j >= f.items.length) return;
      [f.items[i], f.items[j]] = [f.items[j], f.items[i]]; save(); const y = scrollY; vForsa(id); scrollTo(0, y);
    });
  });
  if ($('sugT')) $('sugT').onclick = () => { f.hideSug = !f.hideSug; save(); const y = scrollY; vForsa(id); scrollTo(0, y); };
  $('aH').onclick = () => hymnPicker(f);
  $('aV').onclick = () => { $('fR').classList.toggle('on'); if ($('fR').classList.contains('on')) $('fRi').focus(); };
  const addRef = () => withBible(() => {
    const p = parseRefRange($('fRi').value);
    if (!p) { toast('مش فاهم الشاهد — اكتبه زي: يو ٣ ١٦'); return; }
    if (addItem(f, { t: 'v', b: p.b, c: p.c, v: p.v, v2: p.v2, note: '' })) { vForsa(id); toast('الشاهد اتضاف'); }
  });
  $('fRb').onclick = addRef;
  $('fRi').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addRef(); } });
  // two buttons fixed at the top (inside the sticky header), always visible while scrolling
  document.querySelectorAll('#fbar').forEach(x => x.remove());   // vForsa re-renders itself: never two bars
  const fb = document.createElement('div'); fb.id = 'fbar';
  fb.innerHTML = `<button id="fPC"><b>اعرضها على الكمبيوتر</b><small>ابعت الملف لنفسك واتساب</small></button><button id="fsh"><b>شير الفرصة كتابة</b><small>تتقري على الموبايل</small></button>`;
  document.querySelector('header.top .in').appendChild(fb); document.body.classList.add('hasfbar');
  $('fsh').onclick = () => shareForsa(f);
  $('fPC').onclick = () => sendForsaToPC(f);
  $('fX').onclick = () => {
    const b = $('fX');
    if (!b.classList.contains('sure')) { b.classList.add('sure'); b.textContent = 'متأكد؟ دوس تاني للمسح'; setTimeout(() => { if (b.isConnected) { b.classList.remove('sure'); b.textContent = 'امسح الفرصة دي'; } }, 3500); return; }
    FR = FR.filter(x => x.id !== id); saveFR(); location.hash = '#/f'; toast('الفرصة اتمسحت');
  };
  if (B) {} else loadBible().then(() => { if (location.hash === '#/f/' + id && f.items.some(i => i.t === 'v')) { const y = scrollY; vForsa(id); scrollTo(0, y); } });
}
// small, under a hymn inside a فرصة: its verses + the suggested story (tap = open)
function hymnSug(n) {
  const d = HD[n]; if (!d) return '';
  const vs = d.v.map(([r, ph]) => [deepRef(r), ph]).filter(x => x[0]), sp = deepRef(d.s[1]);
  const row = (p, lb, txt) => `<a class="sg" href="#/b/${p.b}/${p.c}/${p.v}-${p.v2}"><b>${lb}</b><i>${txt}</i><span>${esc(refTxt(p))}</span></a>`;
  return `<div class="fsug">${vs.map(([p, ph]) => row(p, 'آية', '«' + esc(ph) + '»')).join('')}${sp ? row(sp, 'قصة', esc(d.s[0])) : ''}</div>`;
}
// backup: one small file with all the فرص (send it to yourself on WhatsApp); restore = pick that file
// hymn titles go in the file too, so the computer finds the right hymn even if its numbers differ
const withTitles = list => list.map(f => Object.assign({}, f, { items: f.items.map(it => it.t === 'h' && H[it.n - 1] ? Object.assign({}, it, { title: H[it.n - 1].title }) : it) }));
async function sendFile(list, name, title) {
  const txt = JSON.stringify({ app: 'ssw-forsa', v: 1, saved: todayStr(), forsas: withTitles(list) });
  const file = new File([txt], name, { type: 'application/json' });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  toast('الملف اتحفظ في التحميلات');
}
const fileSafe = t => String(t).replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 40);
function sendForsaToPC(f) { sendFile([f], 'فرصة-' + fileSafe(fName(f)) + '-' + f.date + '.json', fName(f)); }
async function backupForsas() {
  const name = 'فرصي-' + todayStr() + '.json';
  return sendFile(FR, name, 'نسخة من فرصي');
}
async function restoreForsas(file) {
  try {
    const d = JSON.parse(await file.text()), list = d && d.app === 'ssw-forsa' && Array.isArray(d.forsas) ? d.forsas : null;
    if (!list) throw 0;
    let n = 0;
    list.forEach(f => { if (f && f.id && Array.isArray(f.items) && !fById(f.id)) { FR.push(f); n++; } });
    saveFR(); vForsaList();
    toast(!n ? 'الفرص دي موجودة بالفعل' : n === 1 ? 'رجعت فرصة' : n === 2 ? 'رجعت فرصتين' : 'رجعت ' + arD(n) + (n <= 10 ? ' فرص' : ' فرصة'));
  } catch (e) { toast('الملف ده مش نسخة من «فرصي»'); }
}
const withBible = fn => B ? fn() : (toast('لحظة…'), loadBible().then(fn));
function undoToast(msg, undo) {
  const el = document.createElement('div'); el.className = 'vsel'; el.innerHTML = `<span>${msg}</span><button>رجّعها</button>`;
  el.querySelector('button').onclick = () => { el.remove(); undo(); };
  document.body.appendChild(el); setTimeout(() => el.remove(), 4000);
}
// «يو ٣ ١٦» / «مز ٢٣ ١-٤» / «يو ٣: ١٦-١٨»
function parseRefRange(q) {
  const s = latinDigits(q).replace(/[ً-ْ]/g, '').trim();
  const m = s.match(/^(.*?\D)\s*(\d+)\s*[\s.:،,]\s*(\d+)\s*[-–]\s*(\d+)\s*$/);
  let p = m ? abbrevRef(m[1] + ' ' + m[2] + ' ' + m[3]) : abbrevRef(s);
  if (!p) return null;
  if (m) { const last = B[p.b].chapters[p.c].length - 1; p.v2 = Math.max(p.v, Math.min(+m[4] - 1, last)); }
  return p;
}
function addItem(f, it) {
  if (f.items.some(x => itemKey(x) === itemKey(it))) { toast('موجودة في الفرصة دي بالفعل'); return false; }
  if (it.t === 'v') it.x = verseText(it);
  f.items.push(it); saveFR(); buzz(); try { localStorage.setItem('ssw_flast', f.id); } catch (e) {} return true;
}
function closeSheet() { const s = $('sheet'); if (s) s.remove(); }
function openSheet(html) {
  closeSheet();
  const d = document.createElement('div'); d.className = 'sheet'; d.id = 'sheet';
  d.innerHTML = `<div class="sheet-in"><div class="grab"></div>${html}</div>`;
  d.addEventListener('click', e => { if (e.target === d) closeSheet(); });
  document.body.appendChild(d); return d;
}
// from a hymn page / a verse: «ضيفها لأنهي فرصة؟»
function addToForsa(it, label) {
  const go = f => { if (addItem(f, it)) toast('اتضافت لـ «' + fName(f) + '»'); closeSheet(); };
  if (!FR.length) { const f = newForsa(); go(f); toast('اتعملت فرصة جديدة واتضاف ليها ' + label); return; }
  const t = todayStr(), last = localStorage.getItem('ssw_flast');
  const list = fSort().filter(f => f.date >= t || f.id === last).reverse();
  const more = fSort().filter(f => !list.includes(f)).slice(0, 3);
  const row = f => `<button class="it${f.id === last ? ' last' : ''}" data-id="${f.id}"><div class="t">${esc(fName(f))}</div><div class="s">${esc(fDate(f.date))} · ${countTxt(f)}</div></button>`;
  const s = openSheet(`<h3>ضيف ${esc(label)} لأنهي فرصة؟</h3>${list.map(row).join('')}${more.length ? '<div class="sec">فرص قديمة</div>' + more.map(row).join('') : ''}<button class="newf" data-new="1">${ICF.plus.replace('<svg', '<svg style="width:20px;height:20px;stroke:#111;fill:none;stroke-width:2.6"')} فرصة جديدة</button>`);
  s.querySelectorAll('[data-id]').forEach(b => b.onclick = () => go(fById(b.dataset.id)));
  s.querySelector('[data-new]').onclick = () => go(newForsa());
}
// inside a فرصة: pick hymns (search by name or any words)
function hymnPicker(f) {
  const s = openSheet(`<h3>ضيف ترنيمة</h3><div class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="pq" type="search" autocomplete="off" placeholder="اسم الترنيمة أو أي كلمة منها…"></div><div class="pk" id="pl"></div>`);
  const has = n => f.items.some(x => x.t === 'h' && x.n === n);
  const draw = () => {
    const q = latinDigits($('pq').value.trim()); let nums = [];
    if (!q) nums = FAV.slice(0, 30);
    else { const seen = new Set(); [...KE.searchTitles(q, 20), ...KE.searchFragments(q, 20), ...KE.searchHymnText(q, 20)].forEach(r => { if (!seen.has(r.num) && seen.size < 30) { seen.add(r.num); nums.push(r.num); } }); }
    $('pl').innerHTML = (!q && nums.length ? '<div class="sec">من المفضلة</div>' : '') + nums.map(n => `<button class="it" data-n="${n}"><div class="t">${esc(hName(n))}</div><span class="ok">${has(n) ? '✓ اتضافت' : ''}</span></button>`).join('')
      + (!nums.length ? `<div class="empty" style="padding:20px">${q ? 'مالقيتش ترنيمة بالكلام ده' : 'اكتب اسم الترنيمة أو كلمة منها'}</div>` : '');
    $('pl').querySelectorAll('[data-n]').forEach(b => b.onclick = () => { const n = +b.dataset.n; if (has(n)) return; addItem(f, { t: 'h', n, note: '' }); b.querySelector('.ok').textContent = '✓ اتضافت'; });
  };
  let t; $('pq').oninput = () => { clearTimeout(t); t = setTimeout(draw, 150); };
  draw(); setTimeout(() => $('pq').focus(), 250);
  const obs = new MutationObserver(() => { if (!$('sheet')) { obs.disconnect(); if (location.hash === '#/f/' + f.id) vForsa(f.id); } });
  obs.observe(document.body, { childList: true });
}
async function shareForsa(f) {
  let txt = fName(f) + '\n' + fDate(f.date) + (f.place ? '\nالمكان: ' + f.place : '') + '\n';
  f.items.forEach((it, i) => {
    txt += '\n' + arD(i + 1) + '. ' + (it.t === 'h' ? 'ترنيمة: ' + (H[it.n - 1] ? hName(it.n) : '') : refTxt(it) + '\n' + verseText(it));
    if (it.note) txt += '\n   ملاحظة: ' + it.note;
  });
  if (f.note) txt += '\n\nملاحظات:\n' + f.note;
  try { if (navigator.share) { await navigator.share({ title: fName(f), text: txt }); return; } } catch (e) { return; }
  window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank');
}
// Bible chapter: tap verses to pick them, then «ضيف للفرصة»
function verseSelect(b, c) {
  let sel = [];
  const bar = () => {
    let el = $('vsel');
    if (!sel.length) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.className = 'vsel'; el.id = 'vsel'; document.body.appendChild(el); }
    const v = Math.min(...sel), v2 = Math.max(...sel);
    el.innerHTML = `<span>${esc(refTxt({ b, c, v, v2 }))}</span><button id="vsA">+ ضيف للفرصة</button><button class="x" id="vsX">×</button>`;
    $('vsA').onclick = () => { addToForsa({ t: 'v', b, c, v, v2, note: '' }, 'الشاهد'); clear(); };
    $('vsX').onclick = clear;
  };
  const clear = () => { sel = []; document.querySelectorAll('.vl.sel').forEach(x => x.classList.remove('sel')); bar(); };
  document.querySelectorAll('#main .vl').forEach(el => el.onclick = () => {
    const i = +el.id.slice(1), k = sel.indexOf(i);
    if (k >= 0) sel.splice(k, 1); else sel.push(i);
    el.classList.toggle('sel', k < 0); bar();
  });
}
addEventListener('hashchange', () => { const v = $('vsel'); if (v) v.remove(); closeSheet(); });

// ---------- router ----------
let lastHash = '';
function route() {
  const h = location.hash || '#/', p = h.slice(2).split('/');
  document.querySelectorAll('#fbar,#kbar').forEach(x => x.remove()); document.body.classList.remove('hasfbar');
  if (lastHash && h !== lastHash) NAV.depth++;
  lastHash = h;
  if (p[0] === '' ) { NAV.tab = 'hymns'; NAV.from = null; vHymns(); }
  else if (p[0] === 'h') { vHymn(+p[1]); }
  else if (p[0] === 'topics') { NAV.tab = 'topics'; vTopics(); scrollTo(0, 0); }   // topics always open at the top
  else if (p[0] === 't') { NAV.tab = 'topics'; vTopic(+p[1]); scrollTo(0, 0); }
  else if (p[0] === 'bible') { NAV.tab = 'bible'; NAV.from = null; vBible(); }
  else if (p[0] === 'b') {
    if (p[2] == null) { NAV.tab = 'bible'; NAV.from = null; vBook(+p[1]); }
    else { const r = (p[3] || '').split('-'); vChapter(+p[1], +p[2], p[3] ? +r[0] : null, p[3] ? +(r[1] || r[0]) : null); }
  }
  else if (p[0] === 'fav') { NAV.tab = 'fav'; vFav(); }
  else if (p[0] === 'f') { NAV.tab = 'forsa'; NAV.from = null; if (p[1]) vForsa(p[1]); else vForsaList(); }
  else if (p[0] === 'about') vAbout();
  else vHymns();
  azSetup();
  const mn = $('main'); mn.classList.remove('anim'); void mn.offsetWidth; mn.classList.add('anim');
}
addEventListener('hashchange', route);
// search box
function sboxState() { $('sbox').classList.toggle('has', !!$('q').value); }
let qt;
$('q').addEventListener('input', () => {
  sboxState(); clearTimeout(qt);
  qt = setTimeout(() => { const tab = location.hash.startsWith('#/bible') ? 'bible' : 'hymns'; NAV.q[tab] = $('q').value; if (tab === 'bible') vBible(); else vHymns(); azSetup(); }, 180);
});
$('q').addEventListener('keydown', e => { if (e.key === 'Enter') $('q').blur(); });
$('qx').onclick = () => { $('q').value = ''; $('q').dispatchEvent(new Event('input')); $('q').focus(); };
// tabs: tapping the current tab goes back to its start
document.querySelectorAll('#tabs a').forEach(a => a.addEventListener('click', e => {
  if (a.dataset.t === 'hymns' && location.hash === '#/' && NAV.q.hymns) { NAV.q.hymns = ''; vHymns(); azSetup(); }
}));

// ---------- Bible loading (after the hymns are on screen) ----------
function loadBible() {
  if (bibleWait) return bibleWait;
  bibleWait = new Promise(res => {
    const s = document.createElement('script'); s.src = '../app/data/bible.js';
    s.onload = () => { B = window.BIBLE; setTimeout(() => { KE.buildBible(B); res(); }, 30); };
    s.onerror = () => { bibleWait = null; toast('محتاج نت أول مرة عشان الكتاب المقدس يتحمّل'); };
    document.head.appendChild(s);
  });
  return bibleWait;
}

// ---------- updates: same hymn data the desktop app gets (content.json on GitHub) ----------
const DATA_VERSION = 32;
const RAW = 'https://raw.githubusercontent.com/brethrensundayschoolpresenter/brethren-sunday-school-presenter/main/renderer/data/';
async function sha256(t) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
let lastCheck = 0;
async function checkUpdates() {
  lastCheck = Date.now(); return;   // BETA: test data only, no updates
  try {
    if (!('caches' in window) || !navigator.onLine) return;
    const c = await (await fetch(RAW + 'content.json?t=' + Date.now(), { cache: 'no-store' })).json();
    const have = +(localStorage.getItem('sswb_dv') || DATA_VERSION);
    if (!c || !(c.dataVersion > have) || !c.files) return;
    const got = {};
    for (const f of Object.keys(c.files)) {
      const t = await (await fetch(RAW + f + '?v=' + c.dataVersion, { cache: 'no-store' })).text();
      if (await sha256(t) !== c.files[f]) return;          // half-downloaded or changed meanwhile: try next time
      got[f] = t;
    }
    const cache = await caches.open('ssw-data');
    for (const f in got) await cache.put(new URL('data/' + f, location.href).href, new Response(got[f], { headers: { 'Content-Type': 'text/javascript; charset=utf-8' } }));
    localStorage.setItem('sswb_dv', c.dataVersion);
    if ((c.notes && c.notes.length) || c.history) saveNotes(c.dataVersion, c.notes, c.history, have);
    dataArrived(c.dataVersion);
  } catch (e) {}
}


// ---------- first open: name + meeting (same Google Form as the download page; sent later if offline) ----------
const FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSeOKyMpyAyBKAhD9_Fheqym-wyP91tAttS_a4M0oACJL7mzXg/formResponse';
async function sendReg() {
  let r; try { r = JSON.parse(localStorage.getItem('ssw_reg_wait') || 'null'); } catch (e) {}
  if (!r || !navigator.onLine) return;
  const fd = new FormData(); fd.append('entry.1735689864', r.n); fd.append('entry.520013336', r.m + ' (موبايل)');
  try { await fetch(FORM, { method: 'POST', mode: 'no-cors', body: fd }); localStorage.removeItem('ssw_reg_wait'); } catch (e) {}
}
function askReg() {
  if (localStorage.getItem('ssw_reg') === '1' || localStorage.getItem('bssp_reg') === '1') return;
  $('welcome').style.display = '';
  // a new phone: everything it has now is not «new» for it
  try { localStorage.setItem('sswb_seen', H.length); localStorage.setItem('sswb_notes_seen', localStorage.getItem('sswb_dv') || DATA_VERSION); localStorage.setItem('sswb_appv', APPV); } catch (e) {}
  $('wN').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('wM').focus(); } });
  $('wf').addEventListener('submit', e => {
    e.preventDefault();
    const n = $('wN').value.trim(), m = $('wM').value.trim();
    if (n.length < 2) { $('wE').textContent = 'اكتب اسمك'; $('wN').focus(); return; }
    if (m.length < 2) { $('wE').textContent = 'اكتب اسم الاجتماع أو الكنيسة'; $('wM').focus(); return; }
    try { localStorage.setItem('ssw_reg_wait', JSON.stringify({ n, m })); localStorage.setItem('ssw_reg', '1'); localStorage.setItem('ssw_name', n); localStorage.setItem('sswb_appv', APPV); } catch (x) {}
    $('welcome').remove(); sendReg(); toast('أهلًا بيك يا ' + n.split(' ')[0]); setTimeout(showNews, 1500);
  });
}

// ---------- the hymns that came with this version of the web app (same site, so they never lag behind) ----------
async function syncBundled() {
  return;   // BETA: test data only
  try {
    if (!('caches' in window) || !navigator.onLine) return;
    const have = +(localStorage.getItem('sswb_dv') || 0);
    if (have >= DATA_VERSION) return;
    let notes = [], hist = null;
    try { const c = await (await fetch('%64ata/content.json?fresh=' + DATA_VERSION, { cache: 'no-cache' })).json(); notes = c.notes || []; hist = c.history || null; } catch (e) {}
    const got = {};
    for (const f of ['hymns.js', 'topics.js', 'stories.js']) {
      // '%64ata' = 'data': an older offline worker on the phone doesn't recognise this path, so it can't answer with its old copy
      const r = await fetch('%64ata/' + f + '?fresh=' + DATA_VERSION, { cache: 'no-cache' });
      if (!r.ok) return;
      got[f] = await r.text();
    }
    const cache = await caches.open('ssw-data');
    for (const f in got) await cache.put(new URL('data/' + f, location.href).href, new Response(got[f], { headers: { 'Content-Type': 'text/javascript; charset=utf-8' } }));
    localStorage.setItem('sswb_dv', DATA_VERSION);
    if (have && (notes.length || hist)) saveNotes(DATA_VERSION, notes, hist, have);
    if (have) dataArrived(DATA_VERSION);
    else { const n = (got['hymns.js'].match(/"num":/g) || []).length; if (n && n !== H.length && !sessionStorage.getItem('ssw_rl')) { sessionStorage.setItem('ssw_rl', '1'); location.reload(); } }
  } catch (e) {}
}

// ---------- start ----------
route();
askReg();
setTimeout(showNews, 700);
// keep the loading screen until the app font is ready, so the words never jump from another font
Promise.race([document.fonts ? document.fonts.load('800 16px K').then(() => document.fonts.ready) : Promise.resolve(), new Promise(r => setTimeout(r, 2500))])
  .then(() => { $('load').style.opacity = 0; setTimeout(() => $('load').remove(), 300); });
if ('serviceWorker' in navigator) {
  // always look for a newer version of the app files; when one takes over, reload once so it shows right away
  const hadSW = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => r.update()).catch(() => {});
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadSW && !reloaded) { reloaded = true; reloading = true; location.reload(); } });
}
syncBundled();
setTimeout(() => { loadBible(); checkUpdates(); sendReg(); }, 1200);
// the bottom bar stays at the bottom: while typing (keyboard open, the phone may move «fixed» things) it hides, and comes back after
document.addEventListener('focusin', e => { if (e.target.matches('input:not([type=date]),textarea')) document.body.classList.add('typing'); });
document.addEventListener('focusout', () => setTimeout(() => { if (!document.activeElement || !document.activeElement.matches('input,textarea')) document.body.classList.remove('typing'); }, 50));
// a phone keeps the app open in the background for days: look for updates again when it comes back
document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - lastCheck > 15 * 60 * 1000) { checkUpdates(); sendReg(); } });
addEventListener('online', sendReg);

// ---------- splash ----------
// logo + name appear together; after that the splash stays 1.3 s so the name is read, then fades (max 3.5 s in all)
(function () {
  const sp = document.getElementById('splash'); if (!sp) return;
  let done = false; const out = () => { if (done) return; done = true; sp.classList.add('out'); setTimeout(() => sp.remove(), 450); };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setTimeout(out, 900); return; }
  const q = sp.querySelector('.spi'), t0 = Date.now();
  (function wait() { if (q && q.classList.contains('go')) setTimeout(out, 1300); else if (Date.now() - t0 < 2000) setTimeout(wait, 50); else out(); })();
  setTimeout(out, 3500);
})();

// iPhone fix (2026-11-26): Safari sometimes leaves the visual viewport offset after a scroll, so the fixed header
// disappears and the bottom tab bar sits in the middle of the screen. Keep both glued to what is actually on screen.
(function () {
  const v = window.visualViewport, T = document.querySelector('.top'), B = document.getElementById('tabs');
  if (!v || !T || !B) return;
  let raf = 0;
  const typing = () => { const a = document.activeElement; return !!a && /^(INPUT|TEXTAREA)$/.test(a.tagName); };
  const fix = () => {
    raf = 0;
    if (typing()) { T.style.transform = ''; B.style.transform = ''; return; }   // keyboard open: leave everything as before
    const dy = Math.round(v.offsetTop), db = Math.round(v.offsetTop + v.height - innerHeight);
    T.style.transform = dy > 1 ? 'translateY(' + dy + 'px)' : '';
    B.style.transform = Math.abs(db) > 1 ? 'translateY(' + db + 'px)' : '';
  };
  // wait until the scroll (and the end-of-page bounce) has fully stopped, so the bars never follow the bounce
  let idle = 0;
  const q = () => { clearTimeout(idle); idle = setTimeout(() => { if (!raf) raf = requestAnimationFrame(fix); }, 250); };
  v.addEventListener('resize', q); v.addEventListener('scroll', q); addEventListener('scroll', q, { passive: true });
})();
