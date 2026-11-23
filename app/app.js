// ترانيم مدارس الأحد — web app for the servants (no projector): hymns + idea + verses + story, topics, Bible, favourites
const H = window.HYMNS, BK = window.BOOKS, T = window.TOPICS || [], HD = window.HDEEP || {};
let B = null;                       // Bible arrives later (bible.js is big)
KE.build(H, [], BK);
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
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/></svg>'
};
function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2400); }
let PREF = { fs: 19 };
try { Object.assign(PREF, JSON.parse(localStorage.getItem('ssw_pref') || '{}')); } catch (e) {}
const savePref = () => { try { localStorage.setItem('ssw_pref', JSON.stringify(PREF)); } catch (e) {} };
document.documentElement.style.setProperty('--fs', PREF.fs + 'px');
let FAV = [];
try { FAV = JSON.parse(localStorage.getItem('ssw_fav') || '[]'); } catch (e) {}
const saveFav = () => { try { localStorage.setItem('ssw_fav', JSON.stringify(FAV)); } catch (e) {} };

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
function alphaHTML(nums) {
  const L0 = n => firstLetter(H[n - 1].title), D0 = n => H[n - 1].d || '';
  const sorted = nums.slice().sort((a, b) => a - b), order = [...new Set(sorted.map(L0))];
  sorted.sort((a, b) => order.indexOf(L0(a)) - order.indexOf(L0(b)) || (D0(b) > D0(a) ? 1 : D0(b) < D0(a) ? -1 : a - b));
  let cur = null, out = '';
  sorted.forEach(n => { const L = L0(n); if (L !== cur) { cur = L; out += `<div class="lh" data-l="${esc(L)}"><span class="letter">${esc(L)}</span></div>`; } out += hymnItem(n); });
  return out;
}
function hymnItem(n, sub) {
  const d = HD[n];
  return `<a class="it" href="#/h/${n}"><div class="t">${esc(hName(n))}</div><div class="s">${sub != null ? sub : d ? esc(d.i.length > 90 ? d.i.slice(0, 88) + '…' : d.i) : ''}</div></a>`;
}

// ---------- top bar ----------
function bar(html) { $('bar').innerHTML = html; }
function homeBar(sub) { bar(`<img src="icon-192.png" alt=""><div class="brand">ترانيم مدارس الأحد<small>${sub || 'Brethren Sunday School Presenter'}</small></div><span class="sp"></span><a class="ib" href="#/about" aria-label="عن البرنامج">${IC.info}</a>`); }
function backBar(label, extra, y) { bar(`<button class="back${y ? ' y' : ''}" id="bk">${IC.back}<span>${esc(label)}</span></button><span class="sp"></span>${extra || ''}`); $('bk').onclick = goBack; }
function goBack() { if (history.length > 1 && NAV.depth > 0) history.back(); else location.hash = '#/'; }
function showSearch(on, ph) { $('sbox').style.display = on ? '' : 'none'; if (ph) $('q').placeholder = ph; }
function setTab(t) { document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('on', a.dataset.t === t)); }

// ---------- views ----------
const NAV = { depth: 0, tab: 'hymns', q: { hymns: '', bible: '' }, from: null };
function vHymns() {
  setTab('hymns'); homeBar(); showSearch(true, 'اسم الترنيمة أو أي كلمة منها…');
  $('q').value = NAV.q.hymns; sboxState();
  const q = latinDigits(NAV.q.hymns.trim()), m = $('main');
  if (!q) {
    m.innerHTML = `<div class="hint"><b>رجاء محبة:</b> استخدم البرنامج للمساعدة بس، لأنه مش بديل إنك تاخد وقت قدّام الرب وتطلب إرشاده قبل فرصة الترانيم.</div>`
      + (localStorage.getItem('ssw_hint2') || matchMedia('(display-mode: standalone)').matches || navigator.standalone ? '' : `<div class="hint">عايز تفتحه زي أي برنامج ومن غير نت؟ ضيفه للشاشة الرئيسية (Add to Home Screen) — <a href="../#add" style="color:#1f6fc5;font-weight:800;text-decoration:underline">شوف إزاي بالصور</a>. <button style="color:#1f6fc5;font-weight:800" onclick="localStorage.setItem('ssw_hint2',1);this.parentNode.remove()">تمام</button></div>`)
      + alphaHTML(H.map(h => h.num));
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
  const h = H[n - 1]; if (!h) { location.hash = '#/'; return; }
  setTab(NAV.tab); showSearch(false);
  const fav = FAV.includes(n);
  backBar('رجوع', `<button class="ib" id="shr" aria-label="مشاركة">${IC.share}</button><button class="ib${fav ? ' on' : ''}" id="fv" aria-label="المفضلة">${IC.heart}</button>`);
  const d = HD[n], tps = T.filter(t => t.nums.includes(n));
  const vs = d ? d.v.map(([r, ph]) => [deepRef(r), ph]).filter(x => x[0]) : [];
  const sp = d ? deepRef(d.s[1]) : null;
  // the words: every verse/chorus once, in order
  const seen = new Set(); let k = 0, lyr = '';
  h.slides.forEach(s => {
    const key = s.lines.join('\n'); if (seen.has(key)) return; seen.add(key);
    const tag = s.label === 'ق' ? 'القرار' : s.label ? 'العدد ' + arD(s.label) : '';
    lyr += `<div class="vb ${k++ % 2 ? 'bl' : 'w'}">${tag ? `<div><span class="tag">${tag}</span></div>` : ''}${s.lines.map(esc).join('<br>')}</div>`;
  });
  $('main').innerHTML = `<div class="ht"><span class="hl">${esc(h.title)}</span></div>`
    + (tps.length ? `<div class="chips">${tps.map(t => `<a class="chip" href="#/t/${t.id}">${esc(t.name)}</a>`).join('')}</div>` : '')
    + (d ? `<div class="card"><span class="lb"><span>فكرة الترنيمة</span></span><p>${esc(d.i)}</p></div>` : '')
    + (vs.length ? `<div class="card"><span class="lb"><span>آيات في الترنيمة</span></span><div class="vs">${vs.map(([p, ph], i) => `<button class="vch" data-k="${i}"><div class="q">«${esc(ph)}»</div><div class="r">${esc(refTxt(p))}</div></button>`).join('')}</div></div>` : '')
    + (sp ? `<div class="card story" id="sty"><span class="lb"><span>قصة مقترحة</span></span><b>${esc(d.s[0])}</b><p style="font-weight:500">${esc(d.s[2])}</p><span class="r">${esc(refTxt(sp))} ‹ افتح القصة</span></div>` : '')
    + `<div class="tools"><button id="fsm">خط أصغر</button><button id="fsp">خط أكبر</button></div><div class="lyr">${lyr}</div>`;
  $('main').querySelectorAll('.vch').forEach(b => b.onclick = () => openPassage(vs[+b.dataset.k][0], n));
  if ($('sty')) $('sty').onclick = () => openPassage(sp, n);
  $('fv').onclick = () => { const i = FAV.indexOf(n); if (i >= 0) FAV.splice(i, 1); else FAV.unshift(n); saveFav(); $('fv').classList.toggle('on', i < 0); toast(i < 0 ? 'اتضافت للمفضلة' : 'اتشالت من المفضلة'); };
  $('shr').onclick = () => shareHymn(n);
  $('fsm').onclick = () => fontStep(-1); $('fsp').onclick = () => fontStep(1);
  scrollTo(0, 0);
}
function fontStep(d) { PREF.fs = Math.max(15, Math.min(30, PREF.fs + d * 2)); savePref(); document.documentElement.style.setProperty('--fs', PREF.fs + 'px'); }
async function shareHymn(n) {
  const h = H[n - 1], d = HD[n], seen = new Set();
  const words = h.slides.filter(s => { const k = s.lines.join('\n'); if (seen.has(k)) return false; seen.add(k); return true; }).map(s => s.lines.join('\n')).join('\n\n');
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
  $('main').innerHTML = `<div class="ht"><span class="hl">${esc(t.name)}</span></div><div class="s" style="color:var(--mut);font-weight:700;margin-bottom:6px">${arD(t.nums.length)} ترنيمة</div>` + alphaHTML(t.nums);
  scrollTo(0, 0);
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
    const btn = (i) => `<button data-b="${i}">${esc(bookName(i))}</button>`;
    $('main').innerHTML = `<div class="sec">العهد القديم</div><div class="grid">${BK.slice(0, 39).map((_, i) => btn(i)).join('')}</div><div class="sec">العهد الجديد</div><div class="grid">${BK.slice(39).map((_, i) => btn(i + 39)).join('')}</div>`;
    $('main').querySelectorAll('[data-b]').forEach(b => b.onclick = () => { location.hash = '#/b/' + b.dataset.b; });
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
    if ($('pc')) $('pc').onclick = () => { NAV.from = null; location.hash = `#/b/${b}/${c - 1}`; };
    if ($('nc')) $('nc').onclick = () => { NAV.from = null; location.hash = `#/b/${b}/${c + 1}`; };
    const t = v1 != null && $('v' + Math.max(0, v1 - 1));
    if (t) t.scrollIntoView({ block: 'start' }); else scrollTo(0, 0);
    if (t) scrollBy(0, -130);
  });
}
function vFav() {
  setTab('fav'); homeBar('الترانيم اللي علّمت عليها'); showSearch(false);
  $('main').innerHTML = FAV.length ? `<div class="hint">علّم على ترانيم الدرس اللي جاي بالقلب ♡ من صفحة الترنيمة، وتلاقيها هنا على طول.</div>` + FAV.map(n => H[n - 1] ? hymnItem(n) : '').join('')
    : '<div class="empty">لسه ماعلّمتش على ترانيم<br>افتح أي ترنيمة ودوس على القلب ♡</div>';
}
function vAbout() {
  setTab(''); backBar('رجوع'); showSearch(false);
  $('main').innerHTML = `<div class="ht"><span class="hl">ترانيم مدارس الأحد</span></div><div style="direction:ltr;text-align:right;color:var(--mut);font-weight:700;white-space:nowrap;font-size:min(16px,4.2vw)">Brethren Sunday School Presenter</div>
  <div class="card"><p>تدوّر على أي ترنيمة، وتشوف فكرتها والآيات اللي كلامها مأخوذ منها وقصة مناسبة ليها، وتقرا في الكتاب المقدس. بيشتغل من غير نت، وبيتحدّث لوحده لما تنزل ترانيم جديدة.</p></div>
  <div class="card"><span class="lb"><span>رجاء محبة</span></span><p style="font-weight:500">استخدم البرنامج للمساعدة بس، لأنه مش بديل إنك تاخد وقت قدّام الرب وتطلب إرشاده قبل فرصة الترانيم.</p></div>
  <div class="card"><span class="lb"><span>ضيفه للشاشة الرئيسية</span></span><p style="font-weight:500"><a href="../#add" style="color:#1f6fc5;font-weight:800;text-decoration:underline">شوف الخطوات بالصور</a><br><b>آيفون:</b> من Safari دوس زرار المشاركة وبعدين «Add to Home Screen».<br><b>أندرويد:</b> من Chrome دوس النقط التلاتة وبعدين «Add to Home screen» أو «Install app».</p></div>
  <div class="card"><span class="lb"><span>للعرض على البروجكتور</span></span><p style="font-weight:500">نزّل برنامج الكمبيوتر من <a href="../" style="color:#1f6fc5;text-decoration:underline">هنا</a>.</p></div>
  <div class="card"><span class="lb"><span>لقيت غلطة؟</span></span><p style="font-weight:500">ابعتها لنا في <a href="https://m.me/61578584879222" style="color:#1f6fc5;text-decoration:underline">رسالة على الصفحة</a>.</p></div>
  <p style="text-align:center;color:var(--mut);font-size:13px" id="dv"></p>`;
  $('dv').textContent = 'نسخة الترانيم ' + arD(localStorage.getItem('ssw_dv') || DATA_VERSION);
}


// ---------- letters index on the side (drag or tap a letter to jump; the letter shows big while you move) ----------
const AZ = { heads: [], on: false };
function azSetup() {
  const bar = $('az');
  document.documentElement.style.setProperty('--azt', Math.round(topH()) + 'px');
  AZ.heads = [...document.querySelectorAll('#main .lh')];
  AZ.on = AZ.heads.length > 3;
  bar.style.display = AZ.on ? '' : 'none'; document.body.classList.toggle('has-az', AZ.on);
  if (!AZ.on) return;
  bar.innerHTML = AZ.heads.map((h, i) => `<span data-i="${i}">${h.dataset.l === 'English' ? 'En' : h.dataset.l}</span>`).join('');
}
function topH() { return document.querySelector('.top').getBoundingClientRect().height; }
function azJump(i, smooth) {
  const h = AZ.heads[i]; if (!h) return;
  const y = h.getBoundingClientRect().top + scrollY - topH() - 4;
  scrollTo({ top: y, behavior: smooth ? 'smooth' : 'auto' });
  azBubble(h.dataset.l); azLastL = h.dataset.l;
  document.querySelectorAll('#az span').forEach((s, k) => s.classList.toggle('cur', k === i));
}
let azT;
function azBubble(L) { const b = $('azb'); b.textContent = L === 'English' ? 'En' : L; b.classList.add('show'); clearTimeout(azT); azT = setTimeout(() => b.classList.remove('show'), 650); }
function azIndexAt(y) {
  const r = $('az').getBoundingClientRect();
  return Math.max(0, Math.min(AZ.heads.length - 1, Math.floor((y - r.top) / r.height * AZ.heads.length)));
}
addEventListener('resize', () => document.documentElement.style.setProperty('--azt', Math.round(topH()) + 'px'));
let azDrag = false, azLast = -1;
$('az').addEventListener('pointerdown', e => { if (!AZ.on) return; azDrag = true; $('az').setPointerCapture(e.pointerId); $('az').classList.add('act'); azLast = azIndexAt(e.clientY); azJump(azLast, false); e.preventDefault(); });
$('az').addEventListener('pointermove', e => { if (!azDrag) return; const i = azIndexAt(e.clientY); if (i !== azLast) { azLast = i; azJump(i, false); if (navigator.vibrate) navigator.vibrate(4); } });
const azEnd = () => { azDrag = false; $('az').classList.remove('act'); };
$('az').addEventListener('pointerup', azEnd); $('az').addEventListener('pointercancel', azEnd);
// while scrolling the list by hand, show which letter you are in
let azScrollT, azLastL = '';
addEventListener('scroll', () => {
  if (!AZ.on || azDrag) return;
  const t = topH() + 10; let cur = null;
  for (const h of AZ.heads) { if (h.getBoundingClientRect().top <= t) cur = h; else break; }
  const L = cur ? cur.dataset.l : AZ.heads[0].dataset.l;
  document.querySelectorAll('#az span').forEach((s, i) => s.classList.toggle('cur', AZ.heads[i].dataset.l === L));
  if (L !== azLastL) { azLastL = L; if (Math.abs(scrollY - (azScrollT || 0)) > 0) azBubble(L); }
  azScrollT = scrollY;
}, { passive: true });

// ---------- router ----------
let lastHash = '';
function route() {
  const h = location.hash || '#/', p = h.slice(2).split('/');
  if (lastHash && h !== lastHash) NAV.depth++;
  lastHash = h;
  if (p[0] === '' ) { NAV.tab = 'hymns'; NAV.from = null; vHymns(); }
  else if (p[0] === 'h') { vHymn(+p[1]); }
  else if (p[0] === 'topics') { NAV.tab = 'topics'; vTopics(); }
  else if (p[0] === 't') { NAV.tab = 'topics'; vTopic(+p[1]); }
  else if (p[0] === 'bible') { NAV.tab = 'bible'; NAV.from = null; vBible(); }
  else if (p[0] === 'b') {
    if (p[2] == null) { NAV.tab = 'bible'; NAV.from = null; vBook(+p[1]); }
    else { const r = (p[3] || '').split('-'); vChapter(+p[1], +p[2], p[3] ? +r[0] : null, p[3] ? +(r[1] || r[0]) : null); }
  }
  else if (p[0] === 'fav') { NAV.tab = 'fav'; vFav(); }
  else if (p[0] === 'about') vAbout();
  else vHymns();
  azSetup();
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
    const s = document.createElement('script'); s.src = 'data/bible.js';
    s.onload = () => { B = window.BIBLE; setTimeout(() => { KE.buildBible(B); res(); }, 30); };
    s.onerror = () => { bibleWait = null; toast('محتاج نت أول مرة عشان الكتاب المقدس يتحمّل'); };
    document.head.appendChild(s);
  });
  return bibleWait;
}

// ---------- updates: same hymn data the desktop app gets (content.json on GitHub) ----------
const DATA_VERSION = 6;
const RAW = 'https://raw.githubusercontent.com/brethrensundayschoolpresenter/brethren-sunday-school-presenter/main/renderer/data/';
async function sha256(t) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
async function checkUpdates() {
  try {
    if (!('caches' in window) || !navigator.onLine) return;
    const c = await (await fetch(RAW + 'content.json?t=' + Date.now(), { cache: 'no-store' })).json();
    const have = +(localStorage.getItem('ssw_dv') || DATA_VERSION);
    if (!c || !(c.dataVersion > have) || !c.files) return;
    const got = {};
    for (const f of Object.keys(c.files)) {
      const t = await (await fetch(RAW + f + '?v=' + c.dataVersion, { cache: 'no-store' })).text();
      if (await sha256(t) !== c.files[f]) return;          // half-downloaded or changed meanwhile: try next time
      got[f] = t;
    }
    const cache = await caches.open('ssw-data');
    for (const f in got) await cache.put(new URL('data/' + f, location.href).href, new Response(got[f], { headers: { 'Content-Type': 'text/javascript; charset=utf-8' } }));
    localStorage.setItem('ssw_dv', c.dataVersion);
    const el = document.createElement('button');
    el.className = 'toast show'; el.style.pointerEvents = 'auto'; el.style.background = '#ffff00'; el.style.color = '#111'; el.style.border = '2px solid #111';
    el.textContent = 'في ترانيم جديدة — دوس هنا'; el.onclick = () => location.reload();
    document.body.appendChild(el);
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
  $('wN').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('wM').focus(); } });
  $('wf').addEventListener('submit', e => {
    e.preventDefault();
    const n = $('wN').value.trim(), m = $('wM').value.trim();
    if (n.length < 2) { $('wE').textContent = 'اكتب اسمك'; $('wN').focus(); return; }
    if (m.length < 2) { $('wE').textContent = 'اكتب اسم الاجتماع أو الكنيسة'; $('wM').focus(); return; }
    try { localStorage.setItem('ssw_reg_wait', JSON.stringify({ n, m })); localStorage.setItem('ssw_reg', '1'); localStorage.setItem('ssw_name', n); } catch (x) {}
    $('welcome').remove(); sendReg(); toast('أهلًا بيك يا ' + n.split(' ')[0]);
  });
}

// ---------- start ----------
route();
askReg();
// keep the loading screen until the app font is ready, so the words never jump from another font
Promise.race([document.fonts ? document.fonts.load('800 16px K').then(() => document.fonts.ready) : Promise.resolve(), new Promise(r => setTimeout(r, 2500))])
  .then(() => { $('load').style.opacity = 0; setTimeout(() => $('load').remove(), 300); });
if ('serviceWorker' in navigator) {
  // always look for a newer version of the app files; when one takes over, reload once so it shows right away
  const hadSW = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => r.update()).catch(() => {});
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadSW && !reloaded) { reloaded = true; location.reload(); } });
}
setTimeout(() => { loadBible(); checkUpdates(); sendReg(); }, 1200);
addEventListener('online', sendReg);
