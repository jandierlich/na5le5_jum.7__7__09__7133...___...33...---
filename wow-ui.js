// WowarWahr – UI-Grundbausteine: Icons, Sheets, Dialoge, Formatierung

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const P = {
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/>',
  trips: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18"/>',
  stats: '<path d="M5 20V11M12 20V5M19 20v-6"/>',
  star: '<path d="M12.00 3.30L14.57 9.06L20.84 9.73L16.16 13.95L17.47 20.12L12.00 16.97L6.53 20.12L7.84 13.95L3.16 9.73L9.43 9.06Z"/>',
  more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  chev: '<path d="m9 5 7 7-7 7"/>',
  back: '<path d="m15 5-7 7 7 7"/>',
  pin: '<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z"/><circle cx="12" cy="9" r="2.5"/>',
  camera: '<path d="M4 8h3.2l1.8-3h6l1.8 3H20v11H4Z"/><circle cx="12" cy="13" r="3.5"/>',
  locate: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/>',
  home: '<path d="M4 11 12 4l8 7v9h-5.5v-6h-5v6H4Z"/>',
  trash: '<path d="M4 7h16M9.5 7V4.5h5V7M6 7l1 13h10l1-13"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/>',
  share: '<path d="M12 3.5v11M7.5 8 12 3.5 16.5 8M5 12.5V20h14v-7.5"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  layers: '<path d="m12 3.5 9 5-9 5-9-5Z"/><path d="m3 13.5 9 5 9-5"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r=".6"/><circle cx="4.5" cy="12" r=".6"/><circle cx="4.5" cy="18" r=".6"/>',
  spark: '<path d="M12 3.5 13.8 10.2 20.5 12l-6.7 1.8L12 20.5l-1.8-6.7L3.5 12l6.7-1.8Z"/>',
  download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>',
  upload: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 19.5h14"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.4"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><ellipse cx="12" cy="12" rx="3.6" ry="8.5"/><path d="M3.5 12h17"/>',
  photo: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z"/>',
  shield: '<path d="M12 3.5 19 6v6c0 4.5-3 7.5-7 8.5-4-1-7-4-7-8.5V6Z"/>',
  doc: '<path d="M6 3.5h8l4 4v13H6Z"/><path d="M14 3.5v4h4M9 12h6M9 16h6"/>',
  orbit: '<circle cx="12" cy="12" r="6"/><ellipse cx="12" cy="12" rx="10.2" ry="3.6" transform="rotate(-22 12 12)"/>',
  film: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="m10 9.2 5 2.8-5 2.8Z"/>',
  start: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
  compass: '<circle cx="12" cy="12" r="8.5"/><path d="m14.8 9.2-1.9 3.7-3.7 1.9 1.9-3.7Z"/>',
  bell: '<path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5H5Z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>',
  starfill: '<path d="M12.00 3.30L14.57 9.06L20.84 9.73L16.16 13.95L17.47 20.12L12.00 16.97L6.53 20.12L7.84 13.95L3.16 9.73L9.43 9.06Z" fill="currentColor"/>',
  beach: '<path d="M4 11.5a8 8 0 0 1 16 0Z"/><path d="M12 11.5v8.5M4 20.5h16"/>',
  city: '<path d="M3.5 20.5h17M5 20.5V9l5-2.5v14M10 20.5V4.5l6 2.5v13.5M16 20.5V11l3.5 1.5v8"/>',
  tree: '<path d="M12 3.5 6 12h3l-3.5 5h13L15 12h3Z"/><path d="M12 17v3.5"/>',
  boot: '<path d="M7 3.5h5v8l6 2.5a2.5 2.5 0 0 1 1.5 2.3v2.2H5.5V8Z"/><path d="M5.5 18.5v2h14v-2M9 7h3M9 10h3"/>',
  culture: '<path d="M3.5 9 12 4l8.5 5Z"/><path d="M5.5 9v8.5M9.5 9v8.5M14.5 9v8.5M18.5 9v8.5M3.5 20.5h17M4.5 17.5h15"/>',
  food: '<path d="M7 3.5v17M4.5 3.5v4.5a2.5 2.5 0 0 0 5 0V3.5M17 20.5V3.5c-2.2 1-3.5 3.5-3.5 7v2.5H17"/>',
  night: '<path d="M16 15.5A6.5 6.5 0 0 1 8.5 6a6.5 6.5 0 1 0 7.5 9.5Z"/><path d="M17.5 3.5v3M16 5h3M20.5 9.5v2M19.5 10.5h2"/>',
  bag: '<path d="M5 8h14l-1 12.5H6Z"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/>',
  family: '<circle cx="8" cy="7" r="2.5"/><circle cx="16" cy="7" r="2.5"/><circle cx="12" cy="13.2" r="1.8"/><path d="M4 20v-3.5A3.5 3.5 0 0 1 7.5 13h.5M20 20v-3.5a3.5 3.5 0 0 0-3.5-3.5H16M9.5 20v-1a2.5 2.5 0 0 1 5 0v1"/>',
  wave: '<path d="M3 17c2 0 2-2 4.5-2s2.5 2 4.5 2 2-2 4.5-2 2.5 2 4.5 2"/><path d="M6.5 12.5C7 8 10.5 5 15.5 4.5c-1.5 2.5-1.5 5 0 8"/>',
  mountain: '<path d="M2.5 19.5 9 10l4 5.5 2.5-3 6 7Z"/><circle cx="17" cy="6.5" r="2.2"/>',
  bed: '<path d="M3 18.5V6M3 14.5h18v4M21 14.5v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11.5" r="1.8"/>',
  trophy: '<path d="M7.5 4.5h9V9a4.5 4.5 0 0 1-9 0Z"/><path d="M7.5 6.5h-3a3 3 0 0 0 3 3.5M16.5 6.5h3a3 3 0 0 1-3 3.5M12 13.5V17M8.5 20.5h7M10 17h4v3.5h-4Z"/>',
  plane: '<path d="M12 3c.9 0 1.5.8 1.5 1.8v4.7l7 4v2l-7-2v4l2 1.5v1.5l-3.5-1-3.5 1V19l2-1.5v-4l-7 2v-2l7-4V4.8C10.5 3.8 11.1 3 12 3Z"/>',
  people: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0M15 14.3a4.5 4.5 0 0 1 5.5 4.2"/>',
  eu: '<circle cx="19.00" cy="12.00" r="1.1" fill="currentColor" stroke="none"/><circle cx="18.06" cy="15.50" r="1.1" fill="currentColor" stroke="none"/><circle cx="15.50" cy="18.06" r="1.1" fill="currentColor" stroke="none"/><circle cx="12.00" cy="19.00" r="1.1" fill="currentColor" stroke="none"/><circle cx="8.50" cy="18.06" r="1.1" fill="currentColor" stroke="none"/><circle cx="5.94" cy="15.50" r="1.1" fill="currentColor" stroke="none"/><circle cx="5.00" cy="12.00" r="1.1" fill="currentColor" stroke="none"/><circle cx="5.94" cy="8.50" r="1.1" fill="currentColor" stroke="none"/><circle cx="8.50" cy="5.94" r="1.1" fill="currentColor" stroke="none"/><circle cx="12.00" cy="5.00" r="1.1" fill="currentColor" stroke="none"/><circle cx="15.50" cy="5.94" r="1.1" fill="currentColor" stroke="none"/><circle cx="18.06" cy="8.50" r="1.1" fill="currentColor" stroke="none"/>',
  castle: '<path d="M4 20.5V8h3v2.5h2.5V8h5v2.5H17V8h3v12.5Z"/><path d="M10 20.5V16a2 2 0 0 1 4 0v4.5M3 20.5h18"/>',
  car: '<path d="M5.5 16v-3.2l1.9-4.6a1.5 1.5 0 0 1 1.4-1h6.4a1.5 1.5 0 0 1 1.4 1l1.9 4.6V16Z"/><path d="M4 12.8h16M7.5 16v2.5M16.5 16v2.5"/>',
  puzzle: '<path d="M5 8.5h3.5a2 2 0 1 1 4 0H16V12a2 2 0 1 1 0 4v3.5h-3.5a2 2 0 1 0-4 0H5V16a2 2 0 1 0 0-4Z"/>',
  island: '<path d="M12.5 18c.3-3 .2-6-.5-8.5"/><path d="M12 9.5C10 7 6.8 6.4 4 7.8M12 9.5c2.2-2.5 5.4-2.9 8-1.5M12 9.5c-.7-3-3-5-5.8-5.6M12 9.5c1.1-3 3.5-4.8 6.3-5.1M3 18.5c2.2 0 2.2-1.3 4.5-1.3s2.2 1.3 4.5 1.3 2.2-1.3 4.5-1.3 2.2 1.3 4.5 1.3"/>',
  snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 6.5l2.5-2M9.5 19.5 12 17.5l2.5 2"/>',
  hourglass: '<path d="M6.5 3.5h11M6.5 20.5h11M7.5 3.5c0 4.5 4.5 5.5 4.5 8.5s-4.5 4-4.5 8.5M16.5 3.5c0 4.5-4.5 5.5-4.5 8.5s4.5 4 4.5 8.5"/>',
  sunset: '<path d="M3 18.5h18M6.5 15a5.5 5.5 0 0 1 11 0M12 3.5v5M9.5 6 12 8.5 14.5 6M4.3 10.8l1.3 1M19.7 10.8l-1.3 1"/>',
  dot: '<circle cx="12" cy="12" r="5" fill="currentColor" stroke="none"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>',
};
export const icon = (name, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;

// ---------- Formatierung ----------
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const MS = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dez.'];
const parts = d => { const m = (d || '').match(/(\d{4})-(\d{2})-(\d{2})/); return m ? { y: +m[1], m: +m[2] - 1, d: +m[3] } : null; };
export function fmtDate(d, long = true) {
  const p = parts(d); if (!p) return '';
  return `${p.d}. ${long ? MONTHS[p.m] : MS[p.m]} ${p.y}`;
}
export function fmtMonth(d) { const p = parts(d); return p ? `${MONTHS[p.m]} ${p.y}` : ''; }
export function fmtRange(a, b) {
  const x = parts(a), y = parts(b || a);
  if (!x) return 'Ohne Datum';
  if (!y || (x.y === y.y && x.m === y.m && x.d === y.d)) return fmtDate(a);
  if (x.y === y.y && x.m === y.m) return `${x.d}.–${y.d}. ${MONTHS[x.m]} ${x.y}`;
  if (x.y === y.y) return `${x.d}. ${MS[x.m]} – ${y.d}. ${MS[y.m]} ${x.y}`;
  return `${x.d}. ${MS[x.m]} ${x.y} – ${y.d}. ${MS[y.m]} ${y.y}`;
}
export const fmtNum = (n, d = 0) => Number(n || 0).toLocaleString('de-DE', { maximumFractionDigits: d, minimumFractionDigits: d });
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const stars = (n, cls = '') => `<span class="stars ${cls}">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'on' : ''}">${icon('starfill', 'em')}</i>`).join('')}</span>`;

// ---------- Toast ----------
let toastT;
export function toast(msg, ms = 2400) {
  const t = $('#toast');
  t.innerHTML = esc(msg); t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms);
}
export function progress(msg, { onCancel } = {}) {
  const t = $('#toast');
  const btn = onCancel ? '<button class="t-cancel">Abbrechen</button>' : '';
  const set = m => { t.innerHTML = `<span class="spin"></span><span class="t-msg">${esc(m)}</span>${btn}`; const b = t.querySelector('.t-cancel'); if (b) b.onclick = () => { b.disabled = true; b.textContent = '…'; onCancel(); }; };
  set(msg); t.classList.add('show'); t.classList.toggle('interactive', !!onCancel); clearTimeout(toastT);
  return {
    update: m => { const el = t.querySelector('.t-msg'); if (el) el.textContent = m; else set(m); },
    done: m => { t.classList.remove('interactive'); if (m) toast(m); else t.classList.remove('show'); },
  };
}

// ---------- Sheets ----------
const stack = [];
export function openSheet({ title = '', html = '', cls = '', onClose, headerRight = '', full = false }) {
  const root = $('#sheets');
  const bd = document.createElement('div'); bd.className = 'backdrop';
  const sh = document.createElement('section'); sh.className = `sheet ${cls} ${full ? 'full' : ''}`;
  sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true');
  sh.innerHTML = `<div class="grab"></div>
    <header class="sheet-h"><div class="sh-left"><button class="icon-btn s-close" aria-label="Schließen">${icon('close')}</button><button class="icon-btn s-home" data-home aria-label="Zur Startseite">${icon('start')}</button></div>
    <h2>${esc(title)}</h2><div class="sh-right">${headerRight}</div></header>
    <div class="sheet-b">${html}</div>`;
  root.append(bd, sh);
  document.body.classList.add('has-sheet');
  requestAnimationFrame(() => { bd.classList.add('in'); sh.classList.add('in'); });
  const entry = { bd, sh, onClose };
  stack.push(entry);
  const close = () => closeSheet(entry);
  bd.addEventListener('click', close);
  sh.querySelector('.s-close').addEventListener('click', close);
  // Wischen zum Schließen
  let y0 = null, dy = 0;
  const h = sh.querySelector('.sheet-h'), g = sh.querySelector('.grab');
  for (const el of [h, g]) {
    el.addEventListener('touchstart', e => { y0 = e.touches[0].clientY; dy = 0; sh.style.transition = 'none'; }, { passive: true });
    el.addEventListener('touchmove', e => { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); sh.style.transform = `translateY(${dy}px)`; }, { passive: true });
    el.addEventListener('touchend', () => { sh.style.transition = ''; sh.style.transform = ''; if (dy > 110) close(); y0 = null; });
  }
  sh.close = close;
  sh.setBody = html => { sh.querySelector('.sheet-b').innerHTML = html; };
  sh.setTitle = t => { sh.querySelector('h2').textContent = t; };
  return sh;
}
export function closeSheet(entry) {
  if (!entry) entry = stack[stack.length - 1];
  if (!entry) return;
  const i = stack.indexOf(entry); if (i < 0) return;
  stack.splice(i, 1);
  entry.bd.classList.remove('in'); entry.sh.classList.remove('in');
  setTimeout(() => { entry.bd.remove(); entry.sh.remove(); }, 320);
  if (!stack.length) document.body.classList.remove('has-sheet');
  entry.onClose && entry.onClose();
}
export function closeAllSheets() { while (stack.length) closeSheet(stack[stack.length - 1]); }
export const topSheet = () => stack[stack.length - 1]?.sh;

// Auswahlmenü (Action Sheet) – Handler laufen synchron im Tipp (wichtig für Dateiauswahl auf mobilen Geräten)
export function actionSheet(title, options) {
  const root = $('#sheets');
  const bd = document.createElement('div'); bd.className = 'backdrop';
  const box = document.createElement('div'); box.className = 'actions';
  box.innerHTML = `${title ? `<div class="act-title">${esc(title)}</div>` : ''}
    <div class="act-group">${options.map((o, i) => `<button data-i="${i}" class="${o.danger ? 'danger' : ''}">${o.icon ? icon(o.icon) : ''}<span>${esc(o.label)}</span></button>`).join('')}</div>
    <div class="act-group"><button class="cancel">Abbrechen</button></div>`;
  root.append(bd, box);
  requestAnimationFrame(() => { bd.classList.add('in'); box.classList.add('in'); });
  const close = () => { bd.classList.remove('in'); box.classList.remove('in'); setTimeout(() => { bd.remove(); box.remove(); }, 280); };
  bd.onclick = close; box.querySelector('.cancel').onclick = close;
  box.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { close(); options[+b.dataset.i].run(); });
}

export function confirmDialog(title, text, okLabel = 'OK', danger = false) {
  return new Promise(res => {
    const root = $('#sheets');
    const bd = document.createElement('div'); bd.className = 'backdrop in dim';
    const d = document.createElement('div'); d.className = 'alert';
    d.innerHTML = `<h3>${esc(title)}</h3><p>${esc(text)}</p><div class="alert-b"><button class="no">Abbrechen</button><button class="yes ${danger ? 'danger' : ''}">${esc(okLabel)}</button></div>`;
    root.append(bd, d);
    requestAnimationFrame(() => d.classList.add('in'));
    const end = v => { bd.remove(); d.remove(); res(v); };
    d.querySelector('.no').onclick = () => end(false);
    d.querySelector('.yes').onclick = () => end(true);
  });
}

export function promptDialog(title, value = '', placeholder = '') {
  return new Promise(res => {
    const root = $('#sheets');
    const bd = document.createElement('div'); bd.className = 'backdrop in dim';
    const d = document.createElement('div'); d.className = 'alert';
    d.innerHTML = `<h3>${esc(title)}</h3><input class="field" value="${esc(value)}" placeholder="${esc(placeholder)}"><div class="alert-b"><button class="no">Abbrechen</button><button class="yes">OK</button></div>`;
    root.append(bd, d);
    requestAnimationFrame(() => d.classList.add('in'));
    const inp = d.querySelector('input'); setTimeout(() => inp.focus(), 50);
    const end = v => { bd.remove(); d.remove(); res(v); };
    d.querySelector('.no').onclick = () => end(null);
    d.querySelector('.yes').onclick = () => end(inp.value.trim());
    inp.onkeydown = e => { if (e.key === 'Enter') end(inp.value.trim()); };
  });
}

export function pickFiles({ multiple = true, accept = 'image/*' } = {}) {
  return new Promise(res => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = accept; inp.multiple = multiple;
    inp.style.display = 'none';
    document.body.appendChild(inp);
    inp.onchange = () => { res([...inp.files]); inp.remove(); };
    inp.addEventListener('cancel', () => { res([]); inp.remove(); });
    inp.click();
  });
}
