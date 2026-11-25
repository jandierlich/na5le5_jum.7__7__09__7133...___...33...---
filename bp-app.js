// bp-app.js — Hauptlogik der Web-App "BelegParkWahr"

const state = {
  screen: 'dashboard',
  parkscheine: [],
  nebenkosten: [],
  fahrten: [],
  kilometerstand: [],
  notizen: [],
  kostenTab: 'nebenkosten',
  categories: ['Betriebsmittel', 'Spesen', 'Hotelrechnung'],
  activeCategory: 'Alle',
  editingId: null,
  editingType: null,
  capturedPhoto: null,
  capturedAudio: null,
  voiceRecorder: null,
  isRecording: false,
  ocrDate: '',
  ocrBetrag: '',
  ocrDateConfirmed: false,
  ocrBetragConfirmed: false,
  lastLocation: null,
  searchQuery: '',
  searchQueryPark: '',
  darkMode: false,
  overviewMode: 'month',
  pdfSelection: { park: true, extra: true, fahrt: true },
  xlsxSelection: { park: true, extra: true, fahrt: true, km: true },
  xlsxMonth: 'all',
  selectedMonth: null,
};

const monthNames = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

function fmtEUR(n) {
  return n.toFixed(2).replace('.', ',') + ' €';
}

// Kleiner, dezenter Bestätigungs-Effekt beim Speichern eines Belegs (komplett selbst
// programmiert, keine externe Bild-/GIF-Datei, dadurch uneingeschränkt lizenzfrei).
function celebrateConfirm() {
  const colors = ['#3F53F2', '#FF4433', '#7C5CFF', '#FF8C00', '#E8267A'];
  const container = document.createElement('div');
  container.className = 'confetti-container';
  const originX = window.innerWidth / 2;
  const originY = window.innerHeight * 0.35;
  const count = 18;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-particle';
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const distance = 60 + Math.random() * 70;
    const endX = Math.cos(angle) * distance;
    const endY = Math.sin(angle) * distance - 30;
    const size = 5 + Math.random() * 5;
    p.style.left = originX + 'px';
    p.style.top = originY + 'px';
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.background = colors[i % colors.length];
    p.style.setProperty('--end-transform', `translate(${endX}px, ${endY}px) scale(0.2)`);
    container.appendChild(p);
  }
  document.body.appendChild(container);
  setTimeout(() => container.remove(), 950);
}
function parseEUR(s) {
  return parseFloat(String(s).replace(',', '.').replace(/[^0-9.\-]/g, '')) || 0;
}
function currentMonthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function nextMonthKey(key) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m, 1); // m ist 1-indiziert -> Tag 1 des Folgemonats
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function daysInMonthKey(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 0).getDate(); // Tag 0 des Folgemonats = letzter Tag von "key"
}

// Wiederkehrende Nebenkosten (z. B. Stellplatzmiete, Leasingrate): Für jeden als
// "wiederkehrend" markierten Eintrag werden fehlende Monate bis zum aktuellen Monat
// automatisch als eigenständige Kopien nachgetragen. Bereits erzeugte Monate merkt sich
// die Vorlage selbst (recurringMonths), damit nichts doppelt entsteht — auch wenn eine
// erzeugte Kopie vom Nutzer wieder gelöscht wurde.
async function generateDueRecurringInstances(allExtras) {
  const templates = allExtras.filter(e => e.recurring);
  if (templates.length === 0) return false;
  const currentMonth = currentMonthKey();
  let changed = false;
  for (const tpl of templates) {
    const originMonth = tpl.date.slice(0, 7);
    const alreadyTracked = new Set(tpl.recurringMonths || []);
    const existingChildMonths = new Set(
      allExtras.filter(e => e.recurringSourceId === tpl.id).map(e => e.date.slice(0, 7))
    );
    const newlyGenerated = [];
    let cursor = nextMonthKey(originMonth);
    while (cursor <= currentMonth) {
      if (!alreadyTracked.has(cursor) && !existingChildMonths.has(cursor)) {
        const day = Math.min(parseInt(tpl.date.slice(8, 10), 10) || 1, daysInMonthKey(cursor));
        const child = {
          id: uid(),
          titel: tpl.titel,
          kategorie: tpl.kategorie,
          date: `${cursor}-${String(day).padStart(2, '0')}`,
          betrag: tpl.betrag,
          notiz: tpl.notiz || '',
          recurringSourceId: tpl.id,
          createdAt: Date.now(),
        };
        await dbPut('nebenkosten', child);
        newlyGenerated.push(cursor);
        changed = true;
      }
      cursor = nextMonthKey(cursor);
    }
    if (newlyGenerated.length > 0) {
      tpl.recurringMonths = [...alreadyTracked, ...newlyGenerated];
      await dbPut('nebenkosten', tpl);
    }
  }
  return changed;
}

async function loadAll() {
  state.parkscheine = (await dbGetAll('parkscheine')).sort((a, b) => b.date.localeCompare(a.date));
  let nebenkostenData = await dbGetAll('nebenkosten');
  if (await generateDueRecurringInstances(nebenkostenData)) {
    nebenkostenData = await dbGetAll('nebenkosten');
  }
  state.nebenkosten = nebenkostenData.sort((a, b) => b.date.localeCompare(a.date));
  state.fahrten = (await dbGetAll('fahrten')).sort((a, b) => b.date.localeCompare(a.date));
  state.kilometerstand = (await dbGetAll('kilometerstand')).sort((a, b) => b.date.localeCompare(a.date));
  state.notizen = (await dbGetAll('notizen')).sort((a, b) => b.date.localeCompare(a.date));
  const cats = await dbGetMeta('categories');
  if (cats) state.categories = cats;
  // Hell/Dunkel folgt dem gemeinsamen Schalter der WahrZentrale (Start immer hell,
  // Dunkel nur nach bewusster Wahl – gilt für alle Apps).
  state.darkMode = !!(window.wzTheme && wzTheme.isDark());
  document.body.classList.toggle('dark', state.darkMode);
}

// ---------- Rendering ----------
function render() {
  const app = document.getElementById('app');
  app.innerHTML = '';
  const content = document.createElement('div');
  content.style.display = 'flex';
  content.style.flexDirection = 'column';
  content.style.flex = '1';
  content.style.minHeight = '0';

  if (state.screen === 'dashboard') content.appendChild(renderDashboard());
  else if (state.screen === 'home') content.appendChild(renderHome());
  else if (state.screen === 'add-park') content.appendChild(renderAddPark());
  else if (state.screen === 'extra') content.appendChild(renderExtra());
  else if (state.screen === 'add-extra') content.appendChild(renderAddExtra());
  else if (state.screen === 'add-fahrt') content.appendChild(renderAddFahrt());
  else if (state.screen === 'add-km') content.appendChild(renderAddKm());
  else if (state.screen === 'map') content.appendChild(renderMap());
  else if (state.screen === 'month') content.appendChild(renderMonth());
  else if (state.screen === 'notes') content.appendChild(renderNotes());
  else if (state.screen === 'about') content.appendChild(renderAboutScreen());
  else if (state.screen === 'guide') content.appendChild(renderGuideScreen());
  else if (state.screen === 'search') content.appendChild(renderSearchScreen());
  else if (state.screen === 'add-note') content.appendChild(renderAddNote());

  app.appendChild(content);

  if (state.screen === 'map') {
    setTimeout(initMap, 0);
  }
}

function escapeHtmlBP(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (k === 'html') e.innerHTML = v;
    else e.setAttribute(k, v);
  }
  (Array.isArray(children) ? children : [children]).forEach(c => {
    if (c == null) return;
    e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return e;
}

function header(sub, title, opts = {}) {
  const rightContent = opts.right !== undefined ? opts.right : null;
  // Heimknopf: auf der Übersicht führt er zur WahrZentrale, auf allen anderen
  // Seiten zurück zur Übersicht von BelegParkWahr.
  const homeBtn = state.screen === 'dashboard'
    ? el('a', { href: './index.html#unterwegs', class: 'header-btn', style: 'text-decoration:none;display:flex', 'aria-label': 'Zur WahrZentrale', title: 'Zur WahrZentrale', html: homeSvg() })
    : el('button', { class: 'header-btn', 'aria-label': 'Zur Übersicht', title: 'Zur Übersicht', onclick: () => { state.screen = 'dashboard'; state.editingId = null; render(); }, html: homeSvg() });
  const h = el('div', { class: opts.variant ? `header header-${opts.variant}` : 'header' }, [
    el('div', { class: 'blob1' }), el('div', { class: 'blob2' }),
    el('div', { class: 'header-row' }, [
      // Heimknopf wie in allen Apps oben links (auf Unterseiten steht dort der Zurück-Pfeil)
      opts.onBack ? el('button', { class: 'header-btn', 'aria-label': 'Zurück', title: 'Zurück', onclick: opts.onBack, html: arrowLeftSvg() }) : homeBtn,
      el('div', { style: 'flex:1' }, [
        el('div', { class: 'header-sub' }, sub),
        el('div', { class: 'header-title' }, title),
      ]),
      el('div', { style: 'display:flex;gap:8px' }, [opts.onBack ? homeBtn : null, rightContent]),
    ]),
  ]);
  return h;
}

// Eigene modale Dialoge — ersetzen die nativen alert()/confirm()-Popups des Browsers,
// damit Hinweise und Rückfragen optisch zur restlichen App passen statt wie ein System-Dialog auszusehen.
function showAppModal(message, { showCancel = false } = {}) {
  return new Promise((resolve) => {
    const overlay = el('div', { class: 'app-modal-overlay' });
    const closeWith = (result) => { overlay.remove(); resolve(result); };
    const actions = [];
    if (showCancel) {
      actions.push(el('button', { class: 'app-modal-btn app-modal-btn-secondary', onclick: () => closeWith(false) }, 'Abbrechen'));
    }
    actions.push(el('button', { class: 'app-modal-btn app-modal-btn-primary', onclick: () => closeWith(true) }, showCancel ? 'Ja, weiter' : 'OK'));
    const card = el('div', { class: 'app-modal-card' }, [
      el('div', { class: 'app-modal-text' }, message),
      el('div', { class: 'app-modal-actions' }, actions),
    ]);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  });
}
function customAlert(message) { return showAppModal(message, { showCancel: false }); }

// Zeigt ein aufgenommenes Foto vollflächig an (Fingertipp zum Vergrößern), mit Kreuz zum Schließen.
function openImageLightbox(src) {
  const overlay = el('div', { class: 'photo-lightbox-overlay', onclick: () => overlay.remove() }, [
    el('img', { src, onclick: (e) => e.stopPropagation() }),
    el('button', { class: 'photo-lightbox-close', onclick: (e) => { e.stopPropagation(); overlay.remove(); }, html: '✕' }),
  ]);
  document.body.appendChild(overlay);
}

// Gemeinsamer Foto-Aufnahme-Baustein für Parkschein/Nebenkosten/Kilometerstand:
// zeigt das ganze Foto (kein Zuschnitt), Fingertipp öffnet die Lightbox, ein kleiner
// Kamera-Button in der Ecke ersetzt das Foto (statt das ganze Vorschaubild antippbar zu machen).
function renderPhotoCapture(inputId, onFileSelected, label = 'Foto aufnehmen') {
  const wrap = el('div', { class: 'photo-capture-wrap' });
  const box = el('button', {
    class: 'photo-capture',
    onclick: () => {
      if (state.capturedPhoto) openImageLightbox(state.capturedPhoto);
      else document.getElementById(inputId).click();
    },
  }, state.capturedPhoto
      ? [el('img', { src: state.capturedPhoto })]
      : [icon(cameraSvg(), 20), el('span', { class: 'overlay-text' }, label)]
  );
  wrap.appendChild(box);
  if (state.capturedPhoto) {
    wrap.appendChild(el('button', {
      class: 'photo-retake-btn',
      onclick: (e) => { e.stopPropagation(); document.getElementById(inputId).click(); },
      html: cameraSvg(),
    }));
  }
  wrap.appendChild(el('input', { type: 'file', accept: 'image/*', capture: 'environment', id: inputId, style: 'display:none', onchange: onFileSelected }));
  return wrap;
}
function customConfirm(message) { return showAppModal(message, { showCancel: true }); }

function icon(svg, size = 18) {
  const span = document.createElement('span');
  span.innerHTML = svg;
  span.style.display = 'flex';
  span.style.width = size + 'px';
  span.style.height = size + 'px';
  return span;
}

// Minimal inline SVG icons (no external icon library needed)
const arrowLeftSvg = () => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12H4.5M11 5.5 4.5 12l6.5 6.5"/></svg>`;
const cameraSvg = () => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.2A2.2 2.2 0 0 1 5.2 7h2.1l1.3-2.1A1.8 1.8 0 0 1 10.1 4h3.8a1.8 1.8 0 0 1 1.5.9L16.7 7h2.1A2.2 2.2 0 0 1 21 9.2v8.6a2.2 2.2 0 0 1-2.2 2.2H5.2A2.2 2.2 0 0 1 3 17.8z"/><circle cx="12" cy="13.3" r="3.5"/></svg>`;
const plusSvg = () => `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5.5v13M5.5 12h13"/></svg>`;
const checkSvg = () => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.8l4.8 4.7L19.5 6.8"/></svg>`;
const pencilSvg = () => `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l1.1-4.6L15.9 4.6a2 2 0 0 1 2.8 0l.7.7a2 2 0 0 1 0 2.8L8.6 18.9z"/><path d="M13.8 6.7l3.5 3.5"/></svg>`;
const trashSvg = () => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6.5h16"/><path d="M9.2 6.5V5a1.5 1.5 0 0 1 1.5-1.5h2.6A1.5 1.5 0 0 1 14.8 5v1.5"/><path d="M6.2 6.5 7 18.6a2 2 0 0 0 2 1.9h6a2 2 0 0 0 2-1.9l.8-12.1"/><path d="M10 10.5v6M14 10.5v6"/></svg>`;
const searchSvg = () => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.8" cy="10.8" r="6.8"/><path d="M15.8 15.8l4.7 4.7"/></svg>`;
const downloadSvg = () => `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5v11M7.8 10.3L12 14.5l4.2-4.2"/><path d="M4 14.5v3.3a2.2 2.2 0 0 0 2.2 2.2h11.6a2.2 2.2 0 0 0 2.2-2.2v-3.3"/></svg>`;
const mapPinSvg = () => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21.5s-6.8-5.9-6.8-11.4a6.8 6.8 0 0 1 13.6 0c0 5.5-6.8 11.4-6.8 11.4z"/><circle cx="12" cy="10" r="2.5"/></svg>`;
const briefcaseSvg = () => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7.5" width="18" height="12.5" rx="2.4"/><path d="M8.8 7.5V6a2 2 0 0 1 2-2h2.4a2 2 0 0 1 2 2v1.5"/><path d="M3 13h7.5M13.5 13H21"/><path d="M10.5 11.8h3v2.6h-3z"/></svg>`;
const mapSvg = () => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4L3.5 6v14L9 18l6 2 5.5-2V4L15 6z"/><path d="M9 4v14M15 6v14"/></svg>`;
const fileTextSvg = () => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 3H7.2A2.2 2.2 0 0 0 5 5.2v13.6A2.2 2.2 0 0 0 7.2 21h9.6a2.2 2.2 0 0 0 2.2-2.2V8.5z"/><path d="M13.5 3v3.6a1.9 1.9 0 0 0 1.9 1.9H19"/><path d="M8.5 12.5h7M8.5 16h4.5"/></svg>`;
const moonSvg = () => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19.5 14.5a8 8 0 0 1-10-10 8 8 0 1 0 10 10z"/></svg>`;
const sunSvg = () => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.9"/><path d="M12 2.6v2.3M12 19.1v2.3M2.6 12h2.3M19.1 12h2.3M5.7 5.7l1.2 1.2M17.1 17.1l1.2 1.2M18.3 5.7l-1.2 1.2M6.9 17.1l-1.2 1.2"/></svg>`;
const micSvg = () => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2.8" width="6" height="11.4" rx="3"/><path d="M5.6 11.2a6.4 6.4 0 0 0 12.8 0"/><path d="M12 17.6v3.6M8.6 21.2h6.8"/></svg>`;
const gameCarSvg = () => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h14M5 17a2 2 0 1 0 0-4h14a2 2 0 1 0 0 4M5 13l1.5-5h11L19 13"/><circle cx="7.5" cy="17" r="1.5"/><circle cx="16.5" cy="17" r="1.5"/></svg>`;
const helpSvg = () => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.4 9.5a2.7 2.7 0 1 1 3.9 2.4c-.8.4-1.3 1-1.3 1.9v.3"/><path d="M12 17.3h.01"/></svg>`;
const bookSvg = () => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.5c-1.6-1.2-4-1.7-8-1.7v13c4 0 6.4.5 8 1.7 1.6-1.2 4-1.7 8-1.7v-13c-4 0-6.4.5-8 1.7z"/><path d="M12 6.5v13"/></svg>`;
const homeSvg = () => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/></svg>`;
const chevronRightSvg = () => `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5.5l6.5 6.5L9 18.5"/></svg>`;
const arrowUpSvg = () => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19.5v-15M5.5 11 12 4.5l6.5 6.5"/></svg>`;
const stopSvg = () => `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`;
const playSvg = () => `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7.5 4.3 19.2 12 7.5 19.7z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`;

// ---------- Home (Parkscheine) ----------
function renderDashboard() {
  const wrap = el('div', { style: 'display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden' });
  wrap.appendChild(header('Übersicht', 'BelegParkWahr', {
    variant: 'dashboard',
    right: el('div', { style: 'display:flex;gap:8px' }, [
      el('button', { class: 'header-btn', 'aria-label': 'Suchen', title: 'Suchen', onclick: () => { state.screen = 'search'; render(); }, html: searchSvg() }),
      el('button', { class: 'header-btn', 'aria-label': 'Hell-/Dunkelmodus umschalten', title: 'Hell-/Dunkelmodus umschalten', onclick: toggleDarkMode, html: state.darkMode ? sunSvg() : moonSvg() }),
    ]),
  }));

  const body = el('div', { class: 'content' });

  const monthKey = currentMonthKey();
  const parkMonth = state.parkscheine.filter(p => p.date.startsWith(monthKey));
  const extraMonth = state.nebenkosten.filter(n => n.date.startsWith(monthKey));
  const fahrtMonth = state.fahrten.filter(f => f.date.startsWith(monthKey));
  const parkTotal = parkMonth.reduce((s, p) => s + p.betrag, 0);
  const extraTotal = extraMonth.reduce((s, n) => s + n.betrag, 0);
  const fahrtKm = fahrtMonth.reduce((s, f) => s + f.km, 0);
  const fahrtTotal = fahrtMonth.reduce((s, f) => s + f.km * f.satz, 0);
  const gesamt = parkTotal + extraTotal + fahrtTotal;

  body.appendChild(el('div', { class: 'card summary-card' }, [
    el('div', {}, [
      el('div', { class: 'summary-sub' }, 'Gesamt diesen Monat'),
      el('div', { class: 'summary-photos' }, `${parkMonth.length + extraMonth.length + fahrtMonth.length} Einträge erfasst`),
    ]),
    el('div', { class: 'amount' }, fmtEUR(gesamt)),
  ]));

  body.appendChild(el('div', { class: 'section-label' }, 'IM ÜBERBLICK'));
  body.appendChild(el('div', { class: 'stat-strip' }, [
    el('div', { class: 'card stat-tile' }, [
      el('div', { style: 'font-size:10px;color:var(--sub);font-family:inherit;font-variant-numeric:tabular-nums;letter-spacing:1px' }, 'PARKSCHEINE'),
      el('div', { style: 'font-family:ui-rounded, -apple-system, sans-serif;font-weight:700;font-size:14px;margin-top:4px' }, `${parkMonth.length}`),
      el('div', { style: 'font-family:inherit;font-variant-numeric:tabular-nums;font-size:13px;color:var(--amount);font-weight:700' }, fmtEUR(parkTotal)),
    ]),
    el('div', { class: 'card stat-tile' }, [
      el('div', { style: 'font-size:10px;color:var(--sub);font-family:inherit;font-variant-numeric:tabular-nums;letter-spacing:1px' }, 'NEBENKOSTEN'),
      el('div', { style: 'font-family:ui-rounded, -apple-system, sans-serif;font-weight:700;font-size:14px;margin-top:4px' }, `${extraMonth.length}`),
      el('div', { style: 'font-family:inherit;font-variant-numeric:tabular-nums;font-size:13px;color:var(--amount);font-weight:700' }, fmtEUR(extraTotal)),
    ]),
    el('div', { class: 'card stat-tile' }, [
      el('div', { style: 'font-size:10px;color:var(--sub);font-family:inherit;font-variant-numeric:tabular-nums;letter-spacing:1px' }, 'FAHRTEN'),
      el('div', { style: 'font-family:ui-rounded, -apple-system, sans-serif;font-weight:700;font-size:14px;margin-top:4px' }, `${fahrtKm.toLocaleString('de-DE')} km`),
      el('div', { style: 'font-family:inherit;font-variant-numeric:tabular-nums;font-size:13px;color:var(--amount);font-weight:700' }, fmtEUR(fahrtTotal)),
    ]),
  ]));

  body.appendChild(el('div', { class: 'section-label' }, 'BEREICHE'));

  // Einheitliches Kachelraster: alle Bereiche gleich groß und gleich gewichtet,
  // ein einziger Akzent (Petrol) statt Regenbogenfarben je Kachel — Farbe bleibt
  // Beträgen/Status vorbehalten, nicht der reinen Navigation.
  const navItems = [
    { id: 'home', label: 'Parken', sub: 'Parkscheine erfassen', icon: mapPinSvg },
    { id: 'extra', label: 'Kosten', sub: 'Nebenkosten, Fahrten, km-Stand', icon: briefcaseSvg },
    { id: 'map', label: 'Karte', sub: 'Alle Standorte im Überblick', icon: mapSvg },
    { id: 'month', label: 'Monat & Jahr', sub: 'Übersicht, Export, Backup', icon: fileTextSvg },
    { id: 'notes', label: 'Notizen', sub: 'Freie Sprachaufnahmen', icon: micSvg },
    { id: 'guide', label: 'Anleitung', sub: 'So funktioniert die App', icon: bookSvg },
    { id: 'about', label: 'Über die App', sub: 'Infos zur App', icon: helpSvg },
  ];
  const grid = el('div', { class: 'tile-grid' });
  navItems.forEach(item => {
    grid.appendChild(el('button', {
      class: 'tile',
      onclick: () => { state.screen = item.id; render(); },
    }, [
      el('div', { class: 'tile-icon-wrap' }, [icon(item.icon(), 20)]),
      el('div', {}, [
        el('div', { class: 'tile-label' }, item.label),
        el('div', { class: 'tile-sub' }, item.sub),
      ]),
    ]));
  });
  body.appendChild(grid);
  body.appendChild(legalLinksBP());

  wrap.appendChild(body);
  return wrap;
}

function legalLinksBP() {
  const a = (href, t) => el('a', { href, style: 'color:var(--sub);text-decoration:underline;text-underline-offset:2px' }, t);
  return el('div', { style: 'display:flex;justify-content:center;gap:14px;flex-wrap:wrap;margin:18px 0 6px;font-size:13px;font-family:-apple-system, sans-serif' },
    [a('./impressum.html', 'Impressum'), a('./datenschutz.html#bp', 'Datenschutz'), a('./lizenzen.html', 'Lizenzen')]);
}

function renderHome() {
  const wrap = el('div', { style: 'display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden' });
  wrap.appendChild(header('BelegParkWahr', monthNames[new Date().getMonth()] + ' ' + new Date().getFullYear(), {
    right: el('button', { class: 'header-btn', 'aria-label': 'Suchen', title: 'Suchen', onclick: () => { state.screen = 'search'; render(); }, html: searchSvg() }),
  }));

  const body = el('div', { class: 'content', style: 'position:relative' });
  body.appendChild(renderNavTileStrip('home'));

  const monthKey = currentMonthKey();
  const monthEntries = state.parkscheine.filter(p => p.date.startsWith(monthKey));
  const total = monthEntries.reduce((s, p) => s + p.betrag, 0);

  body.appendChild(el('div', { class: 'card summary-card' }, [
    el('div', {}, [
      el('div', { class: 'summary-sub' }, 'Gesamt diesen Monat'),
      el('div', { class: 'summary-photos' }, `${monthEntries.length} Fotos erfasst`),
    ]),
    el('div', { class: 'amount' }, fmtEUR(total)),
  ]));

  body.appendChild(renderBackupBanner());

  const parkSearch = el('input', { type: 'text', id: 'park-search-input', placeholder: 'Suchen nach Ort …', value: state.searchQueryPark });
  parkSearch.addEventListener('input', (e) => {
    state.searchQueryPark = e.target.value;
    updateParkList();
  });
  body.appendChild(el('div', { class: 'search-bar' }, [icon(searchSvg(), 16), parkSearch]));

  body.appendChild(el('div', { id: 'park-list' }, renderParkListItems(monthEntries)));

  wrap.appendChild(body);
  wrap.appendChild(el('button', { class: 'fab', onclick: () => { resetAddForm(); state.screen = 'add-park'; render(); }, html: cameraSvg() }));
  return wrap;
}

function renderParkListItems(monthEntries) {
  let list = monthEntries;
  if (state.searchQueryPark) {
    const q = state.searchQueryPark.toLowerCase();
    list = list.filter(p => (p.ort || '').toLowerCase().includes(q));
  }
  if (list.length === 0) {
    return [el('div', { class: 'empty-state' }, state.searchQueryPark ? 'Keine Einträge gefunden.' : 'Noch keine Parkscheine in diesem Monat. Tippe unten rechts auf die Kamera, um den ersten zu erfassen.')];
  }
  return list.map(p => renderParkRow(p));
}

function updateParkList() {
  const container = document.getElementById('park-list');
  if (!container) return;
  const monthKey = currentMonthKey();
  const monthEntries = state.parkscheine.filter(p => p.date.startsWith(monthKey));
  container.innerHTML = '';
  renderParkListItems(monthEntries).forEach(node => container.appendChild(node));
}

function renderParkRow(p) {
  const day = new Date(p.date).toLocaleDateString('de-DE', { weekday: 'short' }).toUpperCase().slice(0, 2);
  const badge = p.photo
    ? el('div', { class: 'entry-badge' }, [el('img', { src: p.photo })])
    : el('div', { class: 'entry-badge' }, day);
  const row = el('div', { class: 'card entry-row' }, [
    badge,
    el('div', { class: 'entry-main' }, [
      el('div', { class: 'entry-title' }, p.ort || '(ohne Titel)'),
      el('div', { class: 'entry-date' }, new Date(p.date).toLocaleDateString('de-DE')),
    ]),
    el('div', { class: 'entry-amount' }, fmtEUR(p.betrag)),
    el('div', { class: 'swipe-actions' }, [
      p.audio ? el('button', { style: 'background:rgba(124,92,255,0.15);color:var(--teal)', onclick: () => playVoiceNote(p.audio), html: playSvg() }) : null,
      el('button', { style: 'background:transparent;color:var(--sub)', onclick: () => editPark(p.id), html: pencilSvg() }),
      el('button', { style: 'background:transparent;color:var(--coral)', onclick: () => removeEntry('parkscheine', p.id), html: trashSvg() }),
    ]),
  ]);
  return row;
}

function editPark(id) {
  const p = state.parkscheine.find(x => x.id === id);
  if (!p) return;
  state.editingId = id;
  state.editingType = 'park';
  state.capturedPhoto = p.photo || null;
  state.capturedAudio = p.audio || null;
  state.ocrDate = p.date;
  state.ocrBetrag = String(p.betrag).replace('.', ',');
  state.ocrDateConfirmed = true;
  state.ocrBetragConfirmed = true;
  state.screen = 'add-park';
  render();
}

function resetAddForm() {
  state.editingId = null;
  state.editingType = null;
  state.capturedPhoto = null;
  state.capturedAudio = null;
  state.isRecording = false;
  state.ocrDate = new Date().toISOString().slice(0, 10);
  state.ocrBetrag = '';
  state.ocrDateConfirmed = false;
  state.ocrBetragConfirmed = false;
  state.duplicateOrt = null;
}

let undoTimer = null;

async function removeEntry(store, id) {
  const entry = state[store].find(e => e.id === id);
  if (!entry) return;
  await dbDelete(store, id);
  await loadAll();
  render();
  showUndoToast(store, entry);
}

function showUndoToast(store, entry) {
  const old = document.getElementById('undo-toast');
  if (old) old.remove();
  if (undoTimer) clearTimeout(undoTimer);

  const toast = el('div', {
    id: 'undo-toast',
    style: 'position:fixed;left:16px;right:16px;bottom:90px;max-width:448px;margin:0 auto;background:var(--ink);color:var(--bg);border-radius:20px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;box-shadow:0 10px 28px rgba(0,0,0,0.25);z-index:900;',
  }, [
    el('span', { style: 'font-family:-apple-system, sans-serif;font-size:13px' }, 'Eintrag gelöscht'),
    el('button', {
      style: 'background:var(--violet);color:#fff;border:none;border-radius:16px;padding:8px 14px;font-family:ui-rounded, -apple-system, sans-serif;font-weight:700;font-size:14px;cursor:pointer;flex-shrink:0;',
      onclick: async () => {
        clearTimeout(undoTimer);
        toast.remove();
        await dbPut(store, entry);
        await loadAll();
        render();
      },
    }, 'Rückgängig'),
  ]);
  document.body.appendChild(toast);
  undoTimer = setTimeout(() => { toast.remove(); }, 5000);
}

// ---------- Add / Edit Parkschein ----------
function renderAddPark() {
  const wrap = el('div', { class: 'form-screen', style: 'display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden' });
  wrap.appendChild(header(state.editingId ? 'Bearbeiten' : 'Neuer Eintrag', 'Parkschein', { onBack: () => { state.screen = 'home'; render(); } }));
  const body = el('div', { class: 'content' });

  body.appendChild(renderPhotoCapture('park-file-input', onParkPhotoSelected));
  body.appendChild(el('div', { id: 'ocr-status', style: 'font-size:11px;color:var(--sub);margin:-10px 0 14px;font-family:inherit;font-variant-numeric:tabular-nums' }));

  body.appendChild(ocrField('Datum', 'ocrDate', 'ocrDateConfirmed', 'date', 'var(--violet)'));
  body.appendChild(ocrField('Betrag (€)', 'ocrBetrag', 'ocrBetragConfirmed', 'text', 'var(--violet)'));

  body.appendChild(el('label', { class: 'field-label' }, 'Ort / Titel'));
  const ortInput = el('input', {
    type: 'text', id: 'park-ort', placeholder: 'z. B. Rathausplatz',
    style: 'border:2px solid var(--violet);border-radius:20px;',
    value: state.editingId ? (state.parkscheine.find(p => p.id === state.editingId)?.ort || '') : (state.duplicateOrt || ''),
  });
  body.appendChild(ortInput);

  body.appendChild(renderVoiceRecorder());

  body.appendChild(el('button', { class: 'btn-primary', onclick: () => saveParkEntry(ortInput.value) }, state.editingId ? 'Änderungen speichern' : 'Eintrag speichern'));

  if (state.editingId) {
    body.appendChild(el('button', {
      class: 'btn-secondary', style: 'margin-top:10px',
      onclick: () => duplicatePark(ortInput.value),
    }, 'Als Vorlage für neuen Eintrag nutzen'));
  }

  wrap.appendChild(body);
  return wrap;
}

function duplicatePark(ortValue) {
  const betrag = state.ocrBetrag;
  const photo = state.capturedPhoto;
  const audio = state.capturedAudio;
  state.editingId = null;
  state.editingType = null;
  state.ocrDate = new Date().toISOString().slice(0, 10);
  state.ocrBetrag = betrag;
  state.ocrDateConfirmed = true;
  state.ocrBetragConfirmed = true;
  state.capturedPhoto = photo;
  state.capturedAudio = audio;
  state.duplicateOrt = ortValue;
  render();
}

function renderVoiceRecorder() {
  const container = el('div', { style: 'margin-bottom:16px' });
  container.appendChild(el('label', { class: 'field-label' }, 'Sprachnotiz'));

  if (state.capturedAudio) {
    const row = el('div', { style: 'display:flex;align-items:center;gap:10px;background:var(--card);border:2px solid var(--teal);border-radius:20px;padding:10px 14px' }, [
      el('button', { class: 'icon-btn', style: 'background:var(--teal);color:#fff;border-radius:16px;width:34px;height:34px;flex-shrink:0', onclick: () => playVoiceNote(state.capturedAudio), html: playSvg() }),
      el('span', { style: 'flex:1;font-size:13px;color:var(--ink);font-family:-apple-system, sans-serif' }, 'Sprachnotiz aufgenommen'),
      el('button', { class: 'icon-btn', style: 'color:var(--coral)', onclick: () => { state.capturedAudio = null; render(); }, html: trashSvg() }),
    ]);
    container.appendChild(row);
    return container;
  }

  if (state.isRecording) {
    const btn = el('button', {
      style: 'width:100%;padding:13px;border-radius:20px;border:none;background:var(--coral);color:#fff;font-family:ui-rounded, -apple-system, sans-serif;font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer',
      onclick: async () => {
        const dataUrl = await state.voiceRecorder.stop();
        state.isRecording = false;
        state.capturedAudio = dataUrl;
        render();
      },
    }, [icon(stopSvg(), 15), ' Aufnahme beenden']);
    container.appendChild(btn);
    return container;
  }

  const btn = el('button', {
    style: 'width:100%;padding:13px;border-radius:20px;border:2px dashed var(--sub);background:transparent;color:var(--ink);font-family:ui-rounded, -apple-system, sans-serif;font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer',
    onclick: async () => {
      try {
        state.voiceRecorder = createVoiceRecorder();
        await state.voiceRecorder.start();
        state.isRecording = true;
        render();
      } catch (e) {
        await customAlert('Mikrofon-Zugriff wurde nicht erlaubt oder ist nicht verfügbar.');
      }
    },
  }, [icon(micSvg(), 15), ' Sprachnotiz aufnehmen']);
  container.appendChild(btn);
  return container;
}

function ocrField(label, stateKey, confirmedKey, type, color) {
  const confirmed = state[confirmedKey];
  const inputEl = el('input', {
    type: type === 'date' ? 'date' : 'text',
    inputmode: type === 'date' ? null : 'decimal',
    value: state[stateKey] || '',
    style: 'border:none;background:transparent;margin:0;padding:0;font-family:ui-rounded, -apple-system, sans-serif;font-weight:700;font-size:14px;color:var(--ink);width:100%;',
  });
  // Bei JEDEM Tastendruck sofort im State übernehmen (kein Warten auf "Blur"/Verlassen des Feldes)
  inputEl.addEventListener('input', (e) => { state[stateKey] = e.target.value; });
  inputEl.addEventListener('change', (e) => { state[stateKey] = e.target.value; state[confirmedKey] = true; render(); });

  const acceptBtn = el('button', {
    class: 'icon-btn',
    style: `color:${confirmed ? 'var(--teal)' : color};flex-shrink:0`,
    onclick: () => { state[confirmedKey] = true; render(); },
    html: checkSvg(),
  });

  const wrapDiv = el('div', {}, [
    el('label', { class: 'field-label' }, label),
    el('div', { class: `ocr-field${confirmed ? ' confirmed' : ''}`, style: `border-color:${confirmed ? 'var(--teal)' : color}` }, [
      inputEl,
      acceptBtn,
    ]),
    !confirmed ? el('div', { class: 'ocr-hint', style: `color:${color}` }, 'Vorgeschlagen — bitte prüfen oder korrigieren') : el('div', { style: 'margin-bottom:14px' }),
  ]);
  return wrapDiv;
}

async function onParkPhotoSelected(ev) {
  const file = ev.target.files[0];
  if (!file) return;
  const dataUrl = await processPhotoFile(file);
  state.capturedPhoto = dataUrl;
  render();
  runOCR(dataUrl);
}

async function runOCR(dataUrl) {
  const statusEl = document.getElementById('ocr-status');
  if (statusEl) statusEl.textContent = 'Texterkennung läuft …';
  try {
    if (typeof Tesseract === 'undefined') {
      if (statusEl) statusEl.textContent = 'Texterkennung wird geladen …';
      await wzLoadTesseract();
    }
    if (typeof Tesseract === 'undefined') throw new Error('Tesseract nicht geladen');
    const result = await Tesseract.recognize(dataUrl, 'deu');
    const text = result.data.text || '';
    const dateMatch = text.match(/(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})/);
    const amountMatch = text.match(/(\d{1,3}(?:[.,]\d{2}))\s*(?:€|EUR)?/);
    if (dateMatch) {
      let [, d, m, y] = dateMatch;
      if (y.length === 2) y = '20' + y;
      state.ocrDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      state.ocrDateConfirmed = false;
    }
    if (amountMatch) {
      state.ocrBetrag = amountMatch[1];
      state.ocrBetragConfirmed = false;
    }
    if (statusEl) statusEl.textContent = (dateMatch || amountMatch) ? 'Werte erkannt — bitte prüfen.' : 'Nichts eindeutig erkannt — bitte manuell eintragen.';
  } catch (err) {
    if (statusEl) statusEl.textContent = 'Texterkennung nicht verfügbar — bitte manuell eintragen.';
  }
  render();
}

// Prüft, ob am selben Tag mit demselben Betrag schon ein Eintrag existiert
// (z. B. wenn ausversehen derselbe Beleg zweimal fotografiert wird).
function findDuplicate(list, date, betrag, excludeId) {
  return list.find(e => e.id !== excludeId && e.date === date && Math.abs(e.betrag - betrag) < 0.005);
}

async function saveParkEntry(ort) {
  const betrag = parseEUR(state.ocrBetrag);
  if (!state.ocrDate || !betrag) { await customAlert('Bitte Datum und Betrag angeben.'); return; }
  if (betrag <= 0) { await customAlert('Der Betrag muss größer als 0 € sein.'); return; }
  const dup = findDuplicate(state.parkscheine, state.ocrDate, betrag, state.editingId);
  if (dup && !await customConfirm(`Am ${new Date(state.ocrDate).toLocaleDateString('de-DE')} existiert bereits ein Parkschein über ${fmtEUR(dup.betrag)}${dup.ort ? ' (' + dup.ort + ')' : ''}.\n\nTrotzdem als neuen Eintrag speichern?`)) {
    return;
  }
  const existing = state.editingId ? state.parkscheine.find(x => x.id === state.editingId) : null;
  const entry = {
    id: state.editingId || uid(),
    date: state.ocrDate,
    ort: ort || '',
    betrag,
    photo: state.capturedPhoto,
    audio: state.capturedAudio,
    location: existing?.location || state.lastLocation || null,
    createdAt: existing?.createdAt || Date.now(),
  };
  if (navigator.geolocation && !state.editingId) {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      entry.location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      await dbPut('parkscheine', entry);
      await loadAll();
      if (state.screen === 'map') render();
    }, () => {}, { timeout: 4000 });
  }
  await dbPut('parkscheine', entry);
  await loadAll();
  const wasNew = !state.editingId;
  state.screen = 'home';
  render();
  if (wasNew) celebrateConfirm();
}

// ---------- Nebenkosten ----------
function renderExtra() {
  const wrap = el('div', { style: 'display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden' });
  wrap.appendChild(header('Übersicht', 'Kosten'));
  const body = el('div', { class: 'content', style: 'position:relative' });
  body.appendChild(renderNavTileStrip('extra'));

  const toggle = el('div', { class: 'segment-toggle' }, [
    el('button', {
      class: `segment-btn${state.kostenTab === 'nebenkosten' ? ' active' : ''}`,
      onclick: () => { state.kostenTab = 'nebenkosten'; render(); },
    }, 'Nebenkosten'),
    el('button', {
      class: `segment-btn${state.kostenTab === 'fahrten' ? ' active' : ''}`,
      onclick: () => { state.kostenTab = 'fahrten'; render(); },
    }, 'Fahrten'),
    el('button', {
      class: `segment-btn${state.kostenTab === 'kmstand' ? ' active' : ''}`,
      onclick: () => { state.kostenTab = 'kmstand'; render(); },
    }, 'km-Stand'),
  ]);
  body.appendChild(toggle);

  if (state.kostenTab === 'fahrten') {
    body.appendChild(renderFahrtenContent());
    wrap.appendChild(body);
    wrap.appendChild(el('button', { class: 'fab', onclick: () => { resetFahrtForm(); state.screen = 'add-fahrt'; render(); }, html: plusSvg() }));
    return wrap;
  }

  if (state.kostenTab === 'kmstand') {
    body.appendChild(renderKmContent());
    wrap.appendChild(body);
    wrap.appendChild(el('button', { class: 'fab', onclick: () => { resetKmForm(); state.screen = 'add-km'; render(); }, html: plusSvg() }));
    return wrap;
  }

  const searchInput = el('input', { type: 'text', id: 'search-input', placeholder: 'Suchen nach Titel oder Notiz …', value: state.searchQuery });
  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    updateExtraList();
  });
  body.appendChild(el('div', { class: 'search-bar' }, [icon(searchSvg(), 16), searchInput]));

  const chipList = el('div', { style: 'display:flex;flex-direction:column;gap:8px;margin-bottom:14px' });
  ['Alle', ...state.categories].forEach(cat => {
    const active = state.activeCategory === cat;
    const row = el('div', { style: 'display:flex;align-items:stretch;gap:6px' }, [
      el('button', {
        style: `flex:1;text-align:left;padding:12px 16px;border-radius:20px;border:none;cursor:pointer;font-family:inherit;font-variant-numeric:tabular-nums;font-size:13px;font-weight:600;background:${active ? 'var(--violet)' : 'rgba(108,76,224,0.1)'};color:${active ? '#fff' : 'var(--violet)'}`,
        onclick: () => { state.activeCategory = cat; render(); },
      }, cat),
    ]);
    if (cat !== 'Alle') {
      row.appendChild(el('button', { class: 'icon-btn', style: 'color:var(--sub);flex-shrink:0;width:38px', onclick: () => renameCategory(cat), html: pencilSvg() }));
      row.appendChild(el('button', { class: 'icon-btn', style: 'color:var(--coral);flex-shrink:0;width:38px', onclick: () => deleteCategory(cat), html: trashSvg() }));
    }
    chipList.appendChild(row);
  });
  chipList.appendChild(el('button', {
    style: 'width:100%;text-align:left;padding:12px 16px;border-radius:20px;border:2px dashed var(--sub);background:transparent;color:var(--sub);font-family:inherit;font-variant-numeric:tabular-nums;font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px;cursor:pointer',
    onclick: addCustomCategory,
  }, [icon(plusSvg(), 12), ' eigene Kategorie']));
  body.appendChild(chipList);

  body.appendChild(el('div', { id: 'extra-list' }, renderExtraListItems()));

  wrap.appendChild(body);
  wrap.appendChild(el('button', { class: 'fab', onclick: () => { resetExtraForm(); state.screen = 'add-extra'; render(); }, html: plusSvg() }));
  return wrap;
}

function getFilteredExtra() {
  let list = state.activeCategory === 'Alle' ? state.nebenkosten : state.nebenkosten.filter(n => n.kategorie === state.activeCategory);
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    list = list.filter(n => (n.titel || '').toLowerCase().includes(q) || (n.notiz || '').toLowerCase().includes(q));
  }
  return list;
}

function renderExtraListItems() {
  const list = getFilteredExtra();
  if (list.length === 0) {
    return [el('div', { class: 'empty-state' }, 'Keine Einträge gefunden.')];
  }
  return list.map(n => renderExtraRow(n));
}

function updateExtraList() {
  const container = document.getElementById('extra-list');
  if (!container) return;
  container.innerHTML = '';
  renderExtraListItems().forEach(node => container.appendChild(node));
}

const catColors = { Betriebsmittel: '#FF8C00', Spesen: '#7C5CFF', Hotelrechnung: '#E8267A' };
const catColorsDark = { Betriebsmittel: '#FFA020', Spesen: '#B9A6F5', Hotelrechnung: '#FF5CA8' };

function colorForCat(cat) {
  const isDark = document.body.classList.contains('dark');
  const palette = isDark ? catColorsDark : catColors;
  const fallback = isDark ? '#6B7CFF' : '#3F53F2';
  return palette[cat] || fallback;
}

function renderExtraRow(n) {
  return el('div', { class: 'card entry-row' }, [
    el('div', { class: 'entry-badge', style: `background:${colorForCat(n.kategorie)}1E;color:${colorForCat(n.kategorie)}` },
      n.photo ? [el('img', { src: n.photo })] : '€'),
    el('div', { class: 'entry-main' }, [
      el('div', { class: 'entry-title' }, n.recurring ? `↻ ${n.titel}` : n.titel),
      el('div', { class: 'entry-cat', style: `color:${colorForCat(n.kategorie)}` }, n.kategorie.toUpperCase()),
    ]),
    el('div', { class: 'entry-amount' }, fmtEUR(n.betrag)),
    el('div', { class: 'swipe-actions' }, [
      n.audio ? el('button', { style: 'background:rgba(124,92,255,0.15);color:var(--teal)', onclick: () => playVoiceNote(n.audio), html: playSvg() }) : null,
      el('button', { style: 'background:transparent;color:var(--sub)', onclick: () => editExtra(n.id), html: pencilSvg() }),
      el('button', { style: 'background:transparent;color:var(--coral)', onclick: () => removeEntry('nebenkosten', n.id), html: trashSvg() }),
    ]),
  ]);
}

function addCustomCategory() {
  const name = prompt('Name der neuen Kategorie:');
  if (name && !state.categories.includes(name)) {
    state.categories.push(name);
    dbSetMeta('categories', state.categories);
    render();
  }
}

async function renameCategory(oldName) {
  const newName = prompt('Neuer Name für diese Kategorie:', oldName);
  if (!newName || newName === oldName) return;
  if (state.categories.includes(newName)) { await customAlert('Diese Kategorie gibt es schon.'); return; }
  state.categories = state.categories.map(c => c === oldName ? newName : c);
  await dbSetMeta('categories', state.categories);
  // Bestehende Einträge mit der alten Kategorie ebenfalls aktualisieren
  for (const n of state.nebenkosten) {
    if (n.kategorie === oldName) {
      n.kategorie = newName;
      await dbPut('nebenkosten', n);
    }
  }
  if (state.activeCategory === oldName) state.activeCategory = newName;
  await loadAll();
  render();
}

async function deleteCategory(name) {
  if (state.categories.length <= 1) { await customAlert('Mindestens eine Kategorie muss übrig bleiben.'); return; }
  const count = state.nebenkosten.filter(n => n.kategorie === name).length;
  const msg = count > 0
    ? `Kategorie "${name}" löschen? ${count} bestehende Einträge behalten die Kategorie-Bezeichnung, sie taucht aber nicht mehr in der Auswahl auf.`
    : `Kategorie "${name}" löschen?`;
  if (!await customConfirm(msg)) return;
  state.categories = state.categories.filter(c => c !== name);
  await dbSetMeta('categories', state.categories);
  if (state.activeCategory === name) state.activeCategory = 'Alle';
  render();
}

function resetExtraForm() {
  state.editingId = null;
  state.editingType = null;
  state.capturedPhoto = null;
  state.capturedAudio = null;
  state.isRecording = false;
  state.duplicateExtra = null;
}

function editExtra(id) {
  const n = state.nebenkosten.find(x => x.id === id);
  if (!n) return;
  state.editingId = id;
  state.editingType = 'extra';
  state.capturedPhoto = n.photo || null;
  state.capturedAudio = n.audio || null;
  state.screen = 'add-extra';
  render();
}

function renderAddExtra() {
  const existing = state.editingId ? state.nebenkosten.find(x => x.id === state.editingId) : null;
  const wrap = el('div', { class: 'form-screen', style: 'display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden' });
  wrap.appendChild(header(state.editingId ? 'Bearbeiten' : 'Neuer Eintrag', 'Nebenkosten', { onBack: () => { state.screen = 'extra'; render(); } }));
  const body = el('div', { class: 'content' });

  body.appendChild(renderPhotoCapture('extra-file-input', async (e) => { state.capturedPhoto = await processPhotoFile(e.target.files[0]); render(); }, 'Beleg fotografieren'));

  body.appendChild(el('label', { class: 'field-label' }, 'Titel'));
  const titelInput = el('input', { type: 'text', value: existing?.titel || state.duplicateExtra?.titel || '', placeholder: 'z. B. Tankstelle A5' });
  body.appendChild(titelInput);

  body.appendChild(el('label', { class: 'field-label' }, 'Kategorie'));
  const catSelect = el('select', {}, state.categories.map(c => el('option', { value: c, selected: (existing ? existing.kategorie === c : state.duplicateExtra?.kategorie === c) ? 'selected' : null }, c)));
  body.appendChild(catSelect);

  body.appendChild(el('label', { class: 'field-label' }, 'Datum'));
  const dateInput = el('input', { type: 'date', value: existing?.date || new Date().toISOString().slice(0, 10), style: 'width:100%;border:none;margin:0;padding:0;background:transparent;' });
  const dateWrap = el('div', { style: 'width:100%;overflow:hidden;border-radius:18px;background:var(--bg);margin-bottom:16px;padding:12px 14px;box-sizing:border-box;box-shadow:inset 3px 3px 7px var(--shadow-dark-soft), inset -3px -3px 7px var(--shadow-light-soft);' }, [dateInput]);
  body.appendChild(dateWrap);

  body.appendChild(el('label', { class: 'field-label' }, 'Betrag (€)'));
  const betragInput = el('input', { type: 'text', inputmode: 'decimal', value: existing?.betrag ?? state.duplicateExtra?.betrag ?? '', placeholder: '0,00' });
  body.appendChild(betragInput);

  body.appendChild(el('label', { class: 'field-label' }, 'Notiz (optional)'));
  const notizInput = el('textarea', {}, existing?.notiz || state.duplicateExtra?.notiz || '');
  body.appendChild(notizInput);

  // "Wiederkehrend" ist nur für eigenständige Einträge sinnvoll, nicht für automatisch
  // erzeugte Kopien einer bereits wiederkehrenden Vorlage (sonst entstünden verschachtelte Serien).
  let recurringCheckbox = null;
  if (!existing || !existing.recurringSourceId) {
    const recurringRow = el('label', {
      style: 'display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:18px;background:var(--card);margin-bottom:16px;cursor:pointer;box-shadow:5px 5px 12px var(--shadow-dark-soft), -5px -5px 12px var(--shadow-light-soft);',
    });
    recurringCheckbox = el('input', { type: 'checkbox', style: 'width:18px;height:18px;flex-shrink:0;accent-color:var(--violet);', checked: existing?.recurring ? 'checked' : null });
    recurringRow.appendChild(recurringCheckbox);
    recurringRow.appendChild(el('div', {}, [
      el('div', { style: 'font-family:ui-rounded, -apple-system, sans-serif;font-weight:700;font-size:13px' }, '↻ Wiederkehrend'),
      el('div', { style: 'font-size:12px;color:var(--sub);margin-top:2px' }, 'Wird jeden Monat automatisch als neuer Eintrag nachgetragen (z. B. Stellplatzmiete, Leasingrate).'),
    ]));
    body.appendChild(recurringRow);
  }

  body.appendChild(renderVoiceRecorder());

  body.appendChild(el('button', { class: 'btn-primary', onclick: () => saveExtraEntry({
    titel: titelInput.value, kategorie: catSelect.value, date: dateInput.value, betrag: parseEUR(betragInput.value), notiz: notizInput.value,
    recurring: recurringCheckbox ? recurringCheckbox.checked : false,
  }) }, state.editingId ? 'Änderungen speichern' : 'Eintrag speichern'));

  if (state.editingId) {
    body.appendChild(el('button', {
      class: 'btn-secondary', style: 'margin-top:10px',
      onclick: () => duplicateExtra(titelInput.value, catSelect.value, betragInput.value, notizInput.value),
    }, 'Als Vorlage für neuen Eintrag nutzen'));
  }

  wrap.appendChild(body);
  return wrap;
}

function duplicateExtra(titelVal, kategorieVal, betragVal, notizVal) {
  const photo = state.capturedPhoto;
  const audio = state.capturedAudio;
  state.editingId = null;
  state.editingType = null;
  state.capturedPhoto = photo;
  state.capturedAudio = audio;
  state.duplicateExtra = { titel: titelVal, kategorie: kategorieVal, betrag: betragVal, notiz: notizVal };
  render();
}

async function saveExtraEntry(data) {
  if (!data.titel || !data.betrag) { await customAlert('Bitte mindestens Titel und Betrag angeben.'); return; }
  if (data.betrag <= 0) { await customAlert('Der Betrag muss größer als 0 € sein.'); return; }
  const dup = findDuplicate(state.nebenkosten, data.date, data.betrag, state.editingId);
  if (dup && !await customConfirm(`Am ${new Date(data.date).toLocaleDateString('de-DE')} existiert bereits ein Eintrag "${dup.titel}" über ${fmtEUR(dup.betrag)}.\n\nTrotzdem als neuen Eintrag speichern?`)) {
    return;
  }
  const existing = state.editingId ? state.nebenkosten.find(x => x.id === state.editingId) : null;
  const entry = {
    id: state.editingId || uid(), ...data, photo: state.capturedPhoto, audio: state.capturedAudio,
    createdAt: existing?.createdAt || Date.now(),
    // Verknüpfung zur Vorlage (falls dies eine automatisch erzeugte Kopie ist) sowie die
    // Liste bereits erzeugter Monate (falls dies selbst eine Vorlage ist) bleiben beim Bearbeiten erhalten.
    ...(existing?.recurringSourceId ? { recurringSourceId: existing.recurringSourceId } : {}),
    ...(existing?.recurringMonths ? { recurringMonths: existing.recurringMonths } : {}),
  };
  const wasNew = !state.editingId;
  await dbPut('nebenkosten', entry);
  await loadAll();
  state.screen = 'extra';
  render();
  if (wasNew) celebrateConfirm();
}

// ---------- Fahrten ----------
function renderFahrtenContent() {
  const frag = document.createDocumentFragment();
  const allFahrten = state.fahrten;
  const totalKm = allFahrten.reduce((s, f) => s + f.km, 0);
  const totalBetrag = allFahrten.reduce((s, f) => s + f.betrag, 0);

  frag.appendChild(el('div', { class: 'card', style: 'display:flex;justify-content:space-between;align-items:center' }, [
    el('div', {}, [
      el('div', { style: 'font-size:12px;color:var(--sub)' }, 'Gesamt gefahren'),
      el('div', { style: 'font-family:inherit;font-variant-numeric:tabular-nums;font-size:11px;color:var(--violet);font-weight:600;margin-top:2px' }, `${totalKm.toFixed(1)} km`),
    ]),
    el('span', { style: 'font-family:inherit;font-variant-numeric:tabular-nums;font-size:17px;font-weight:700;color:var(--amount)' }, fmtEUR(totalBetrag)),
  ]));

  if (allFahrten.length === 0) {
    frag.appendChild(el('div', { class: 'empty-state' }, 'Noch keine Fahrten erfasst.'));
  }
  allFahrten.forEach(f => frag.appendChild(renderFahrtRow(f)));
  return frag;
}

function renderFahrtRow(f) {
  return el('div', { class: 'card entry-row' }, [
    el('div', { class: 'entry-badge', style: 'background:rgba(108,76,224,0.12);color:var(--violet)' }, `${f.km}`),
    el('div', { class: 'entry-main' }, [
      el('div', { class: 'entry-title' }, `${f.von || '?'} → ${f.nach || '?'}`),
      el('div', { class: 'entry-date' }, `${new Date(f.date).toLocaleDateString('de-DE')}${f.zweck ? ' · ' + f.zweck : ''}`),
    ]),
    el('div', { class: 'entry-amount' }, fmtEUR(f.betrag)),
    el('div', { class: 'swipe-actions' }, [
      el('button', { style: 'background:transparent;color:var(--sub)', onclick: () => editFahrt(f.id), html: pencilSvg() }),
      el('button', { style: 'background:transparent;color:var(--coral)', onclick: () => removeEntry('fahrten', f.id), html: trashSvg() }),
    ]),
  ]);
}

function resetFahrtForm() {
  state.editingId = null;
  state.editingType = null;
  state.duplicateFahrt = null;
}

function editFahrt(id) {
  state.editingId = id;
  state.editingType = 'fahrt';
  state.screen = 'add-fahrt';
  render();
}

function renderAddFahrt() {
  const existing = state.editingId ? state.fahrten.find(x => x.id === state.editingId) : null;
  const wrap = el('div', { class: 'form-screen', style: 'display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden' });
  wrap.appendChild(header(state.editingId ? 'Bearbeiten' : 'Neuer Eintrag', 'Fahrt', { onBack: () => { state.screen = 'extra'; state.kostenTab = 'fahrten'; render(); } }));
  const body = el('div', { class: 'content' });

  body.appendChild(el('label', { class: 'field-label' }, 'Datum'));
  const dateInput = el('input', { type: 'date', value: existing?.date || state.prefillFahrtDate || new Date().toISOString().slice(0, 10), style: 'width:100%;border:none;margin:0;padding:0;background:transparent;' });
  state.prefillFahrtDate = null;
  const dateWrap = el('div', { style: 'width:100%;overflow:hidden;border-radius:18px;background:var(--bg);margin-bottom:16px;padding:12px 14px;box-sizing:border-box;box-shadow:inset 3px 3px 7px var(--shadow-dark-soft), inset -3px -3px 7px var(--shadow-light-soft);' }, [dateInput]);
  body.appendChild(dateWrap);

  body.appendChild(el('label', { class: 'field-label' }, 'Von'));
  const vonInput = el('input', { type: 'text', value: existing?.von || state.duplicateFahrt?.von || '', placeholder: 'z. B. Büro' });
  body.appendChild(vonInput);

  body.appendChild(el('label', { class: 'field-label' }, 'Nach'));
  const nachInput = el('input', { type: 'text', value: existing?.nach || state.duplicateFahrt?.nach || '', placeholder: 'z. B. Kunde Meier GmbH' });
  body.appendChild(nachInput);

  body.appendChild(el('label', { class: 'field-label' }, 'Zweck (optional)'));
  const zweckInput = el('input', { type: 'text', value: existing?.zweck || state.duplicateFahrt?.zweck || '', placeholder: 'z. B. Kundentermin' });
  body.appendChild(zweckInput);

  body.appendChild(el('label', { class: 'field-label' }, 'Gefahrene Kilometer'));
  const kmInput = el('input', { type: 'text', inputmode: 'decimal', value: existing?.km ?? state.duplicateFahrt?.km ?? '', placeholder: '0' });
  body.appendChild(kmInput);

  body.appendChild(el('label', { class: 'field-label' }, 'Kilometersatz (€/km)'));
  const satzInput = el('input', { type: 'text', inputmode: 'decimal', value: existing?.satz ?? '0,30', placeholder: '0,30' });
  body.appendChild(satzInput);
  body.appendChild(el('div', { style: 'font-size:11px;color:var(--sub);margin:-12px 0 16px' }, 'Voreingestellt: aktuelle Kilometerpauschale für Dienstreisen mit dem Pkw (0,30 €/km, Stand 2026). Bitte bei Bedarf anpassen.'));

  body.appendChild(el('button', { class: 'btn-primary', onclick: () => saveFahrtEntry({
    date: dateInput.value, von: vonInput.value, nach: nachInput.value, zweck: zweckInput.value,
    km: parseEUR(kmInput.value), satz: parseEUR(satzInput.value) || 0.30,
  }) }, state.editingId ? 'Änderungen speichern' : 'Eintrag speichern'));

  if (state.editingId) {
    body.appendChild(el('button', {
      class: 'btn-secondary', style: 'margin-top:10px',
      onclick: () => duplicateFahrt(vonInput.value, nachInput.value, zweckInput.value, kmInput.value),
    }, 'Als Vorlage für neuen Eintrag nutzen'));
  }

  wrap.appendChild(body);
  return wrap;
}

function duplicateFahrt(vonVal, nachVal, zweckVal, kmVal) {
  state.editingId = null;
  state.editingType = null;
  state.duplicateFahrt = { von: vonVal, nach: nachVal, zweck: zweckVal, km: kmVal };
  render();
}

async function saveFahrtEntry(data) {
  if (!data.date || !data.km) { await customAlert('Bitte mindestens Datum und Kilometer angeben.'); return; }
  if (data.km <= 0) { await customAlert('Die Kilometerzahl muss größer als 0 sein.'); return; }
  const betrag = Math.round(data.km * data.satz * 100) / 100;
  const existing = state.editingId ? state.fahrten.find(x => x.id === state.editingId) : null;
  const entry = { id: state.editingId || uid(), ...data, betrag, createdAt: existing?.createdAt || Date.now() };
  await dbPut('fahrten', entry);
  await loadAll();
  state.screen = 'extra';
  state.kostenTab = 'fahrten';
  render();
}

// ---------- Kilometerstand ----------
function renderKmContent() {
  const frag = document.createDocumentFragment();
  if (state.kilometerstand.length === 0) {
    frag.appendChild(el('div', { class: 'empty-state' }, 'Noch keine Kilometerstände erfasst. Praktisch z. B. beim Tanken, damit du später weißt, welchen Stand du zu welchem Zeitpunkt hattest.'));
    return frag;
  }
  state.kilometerstand.forEach(k => frag.appendChild(renderKmRow(k)));
  return frag;
}

function renderKmRow(k) {
  return el('div', { class: 'card entry-row' }, [
    el('div', { class: 'entry-badge', style: 'background:rgba(124,92,255,0.14);color:var(--teal)' },
      k.photo ? [el('img', { src: k.photo })] : [icon(mapPinSvg(), 18)]),
    el('div', { class: 'entry-main' }, [
      el('div', { class: 'entry-title' }, `${k.km.toLocaleString('de-DE')} km`),
      el('div', { class: 'entry-date' }, `${new Date(k.date).toLocaleDateString('de-DE')}${k.ort ? ' · ' + k.ort : ''}${k.location ? ' · mit Standort' : ''}`),
    ]),
    el('div', { class: 'swipe-actions' }, [
      el('button', { style: 'background:transparent;color:var(--sub)', onclick: () => editKm(k.id), html: pencilSvg() }),
      el('button', { style: 'background:transparent;color:var(--coral)', onclick: () => removeEntry('kilometerstand', k.id), html: trashSvg() }),
    ]),
  ]);
}

function resetKmForm() {
  state.editingId = null;
  state.editingType = null;
  state.capturedPhoto = null;
}

function editKm(id) {
  const k = state.kilometerstand.find(x => x.id === id);
  state.editingId = id;
  state.editingType = 'km';
  state.capturedPhoto = k?.photo || null;
  state.screen = 'add-km';
  render();
}

function renderAddKm() {
  const existing = state.editingId ? state.kilometerstand.find(x => x.id === state.editingId) : null;
  const wrap = el('div', { class: 'form-screen', style: 'display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden' });
  wrap.appendChild(header(state.editingId ? 'Bearbeiten' : 'Neuer Eintrag', 'Kilometerstand', { onBack: () => { state.screen = 'extra'; state.kostenTab = 'kmstand'; render(); } }));
  const body = el('div', { class: 'content' });

  body.appendChild(renderPhotoCapture('km-file-input', async (e) => { state.capturedPhoto = await processPhotoFile(e.target.files[0]); render(); }, 'Foto aufnehmen (z. B. Tacho)'));

  body.appendChild(el('label', { class: 'field-label' }, 'Datum'));
  const dateInput = el('input', { type: 'date', value: existing?.date || new Date().toISOString().slice(0, 10), style: 'width:100%;border:none;margin:0;padding:0;background:transparent;' });
  const dateWrap = el('div', { style: 'width:100%;overflow:hidden;border-radius:18px;background:var(--bg);margin-bottom:16px;padding:12px 14px;box-sizing:border-box;box-shadow:inset 3px 3px 7px var(--shadow-dark-soft), inset -3px -3px 7px var(--shadow-light-soft);' }, [dateInput]);
  body.appendChild(dateWrap);

  body.appendChild(el('label', { class: 'field-label' }, 'Kilometerstand'));
  const kmInput = el('input', { type: 'text', inputmode: 'decimal', value: existing?.km ?? '', placeholder: 'z. B. 84250' });
  body.appendChild(kmInput);

  body.appendChild(el('label', { class: 'field-label' }, 'Ort / Anlass (optional)'));
  const ortInput = el('input', { type: 'text', value: existing?.ort || '', placeholder: 'z. B. Shell Tankstelle A5' });
  body.appendChild(ortInput);

  body.appendChild(el('div', { style: 'font-size:11px;color:var(--sub);margin:-10px 0 16px' }, 'Der aktuelle Standort wird beim Speichern automatisch mit hinterlegt und ist danach auf der Karte sichtbar.'));

  body.appendChild(el('button', { class: 'btn-primary', onclick: () => saveKmEntry({
    date: dateInput.value, km: parseEUR(kmInput.value), ort: ortInput.value,
  }) }, state.editingId ? 'Änderungen speichern' : 'Eintrag speichern'));

  wrap.appendChild(body);
  return wrap;
}

async function saveKmEntry(data) {
  if (!data.date || !data.km) { await customAlert('Bitte mindestens Datum und Kilometerstand angeben.'); return; }
  if (data.km < 0) { await customAlert('Der Kilometerstand darf nicht negativ sein.'); return; }
  const existing = state.editingId ? state.kilometerstand.find(x => x.id === state.editingId) : null;
  const entry = { id: state.editingId || uid(), ...data, photo: state.capturedPhoto, location: existing?.location || null, createdAt: existing?.createdAt || Date.now() };
  const wasNew = !state.editingId;

  await dbPut('kilometerstand', entry);
  await loadAll();
  state.screen = 'extra';
  state.kostenTab = 'kmstand';
  render();
  if (wasNew) celebrateConfirm();

  if (navigator.geolocation && wasNew) {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      entry.location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      await dbPut('kilometerstand', entry);
      await loadAll();
      if (state.screen === 'map') render();
    }, () => {}, { timeout: 4000 });
  }
}

// ---------- Übergreifende Suche ----------
function renderSearchScreen() {
  const wrap = el('div', { style: 'display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden' });
  wrap.appendChild(header('Alles durchsuchen', 'Suche', { onBack: () => { state.globalSearchQuery = ''; state.screen = 'dashboard'; render(); } }));
  const body = el('div', { class: 'content' });

  const searchInput = el('input', { type: 'text', placeholder: 'Ort, Titel, Notiz, Zweck …', id: 'global-search-input', value: state.globalSearchQuery || '' });
  const searchBar = el('div', { class: 'search-bar' }, [icon(searchSvg(), 16), searchInput]);
  body.appendChild(searchBar);

  const resultsWrap = el('div', { id: 'global-search-results' });
  body.appendChild(resultsWrap);

  function runSearch(q) {
    resultsWrap.innerHTML = '';
    const query = q.trim().toLowerCase();
    if (!query) {
      resultsWrap.appendChild(el('div', { class: 'empty-state', style: 'margin-top:16px' }, 'Tippe oben, um gleichzeitig in Parkscheinen, Nebenkosten und Fahrten zu suchen.'));
      return;
    }

    const parkHits = state.parkscheine.filter(p => (p.ort || '').toLowerCase().includes(query));
    const extraHits = state.nebenkosten.filter(n => (n.titel || '').toLowerCase().includes(query) || (n.notiz || '').toLowerCase().includes(query) || (n.kategorie || '').toLowerCase().includes(query));
    const fahrtHits = state.fahrten.filter(f => (f.von || '').toLowerCase().includes(query) || (f.nach || '').toLowerCase().includes(query) || (f.zweck || '').toLowerCase().includes(query));

    if (parkHits.length === 0 && extraHits.length === 0 && fahrtHits.length === 0) {
      resultsWrap.appendChild(el('div', { class: 'empty-state', style: 'margin-top:16px' }, 'Keine Treffer gefunden.'));
      return;
    }

    function section(title, count) {
      if (count === 0) return;
      resultsWrap.appendChild(el('div', { style: 'font-family:inherit;font-variant-numeric:tabular-nums;font-size:10px;letter-spacing:1px;color:var(--sub);margin:16px 0 8px' }, `${title.toUpperCase()} (${count})`));
    }

    section('Parkscheine', parkHits.length);
    parkHits.forEach(p => resultsWrap.appendChild(renderParkRow(p)));

    section('Nebenkosten', extraHits.length);
    extraHits.forEach(n => resultsWrap.appendChild(renderExtraRow(n)));

    section('Fahrten', fahrtHits.length);
    fahrtHits.forEach(f => resultsWrap.appendChild(renderFahrtRow(f)));
  }

  searchInput.addEventListener('input', (e) => { state.globalSearchQuery = e.target.value; runSearch(e.target.value); });
  runSearch(state.globalSearchQuery || '');

  wrap.appendChild(body);
  setTimeout(() => { const i = document.getElementById('global-search-input'); if (i) i.focus(); }, 50);
  return wrap;
}

// ---------- Anleitung ----------
function renderGuideScreen() {
  const wrap = el('div', { style: 'display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden' });
  wrap.appendChild(header('Schritt für Schritt', 'Anleitung', { onBack: () => { state.screen = 'dashboard'; render(); } }));
  const body = el('div', { class: 'content' });

  const sections = [
    {
      title: 'Parkschein erfassen',
      icon: mapPinSvg, color: '#3F53F2',
      steps: [
        'Im Bereich "Parken" unten rechts auf das Kamera-Symbol tippen.',
        'Beleg fotografieren – Datum und Betrag werden automatisch per Texterkennung vorgeschlagen.',
        'Vorschlag prüfen und bei Bedarf korrigieren, dann mit dem Häkchen bestätigen.',
        'Ort/Titel eingeben (optional eine Sprachnotiz aufnehmen) und speichern.',
      ],
    },
    {
      title: 'Nebenkosten erfassen',
      icon: briefcaseSvg, color: '#7C5CFF',
      steps: [
        'Im Reiter "Kosten" den Tab "Nebenkosten" wählen, dann unten rechts auf "+".',
        'Titel, Kategorie, Datum und Betrag eingeben, optional Foto und Notiz ergänzen.',
        'Kategorien lassen sich über "Kosten" jederzeit umbenennen, löschen oder neu anlegen.',
      ],
    },
    {
      title: 'Fahrten erfassen',
      icon: gameCarSvg, color: '#FF8C00',
      steps: [
        'Im Reiter "Kosten" den Tab "Fahrten" wählen, dann unten rechts auf "+".',
        'Von, Nach, Zweck und die gefahrenen Kilometer eingeben.',
        'Der Betrag wird automatisch mit der Kilometerpauschale (0,30 €/km) berechnet.',
      ],
    },
    {
      title: 'Kilometerstand festhalten',
      icon: mapSvg, color: '#E8267A',
      steps: [
        'Im Reiter "Kosten" den Tab "km-Stand" wählen, dann unten rechts auf "+".',
        'Kilometerstand eintragen, z. B. beim Tanken – Standort wird automatisch per GPS erfasst.',
        'Optional ein Foto des Tachos hinzufügen.',
      ],
    },
    {
      title: 'Sprachnotizen',
      icon: micSvg, color: '#3F53F2',
      steps: [
        'Im Reiter "Notizen" unten rechts auf "+" tippen.',
        'Optional einen Titel vergeben, dann die Aufnahme starten und wieder stoppen.',
        'Alle Notizen lassen sich später direkt in der Liste abspielen.',
      ],
    },
    {
      title: 'Karte',
      icon: mapSvg, color: '#7C5CFF',
      steps: [
        'Zeigt jeden erfassten Parkort einzeln als Punkt auf der Karte.',
        'Der zuletzt erfasste Kilometerstand-Ort wird zusätzlich türkis markiert.',
        'Über die Infokarte lässt sich der Standort direkt in OpenStreetMap öffnen.',
      ],
    },
    {
      title: 'Monat & Jahr, Export und Backup',
      icon: fileTextSvg, color: '#FF4433',
      steps: [
        'Zwischen "Monat" und "Jahr" umschalten, mit den Pfeilen durch die Zeiträume blättern.',
        'Kategorien für den Export antippen (violett = ausgewählt), dann PDF oder CSV erstellen.',
        'Weiter unten: formatierter Tabellen-Export (XLSX) mit eigener Kategorie- und Zeitraum-Auswahl.',
        'Ganz unten: vollständiges Backup (inkl. Fotos/Audio) erstellen oder wiederherstellen.',
      ],
    },
    {
      title: 'Weitere praktische Funktionen',
      icon: helpSvg, color: '#3F53F2',
      steps: [
        'Übergreifend suchen: Lupe-Symbol oben in "Übersicht" oder "Parken" durchsucht alle Bereiche gleichzeitig.',
        'Eintrag bearbeiten oder löschen: in jeder Liste nach links wischen oder die Symbole antippen.',
        'Aus Versehen gelöscht? Unten erscheint kurz "Rückgängig".',
        'Bestehenden Eintrag als Vorlage für einen neuen nutzen: beim Bearbeiten ganz unten.',
        'Dark Mode: Mond-/Sonnen-Symbol oben rechts in der Kopfzeile.',
      ],
    },
  ];

  sections.forEach(sec => {
    body.appendChild(el('div', { class: 'card' }, [
      el('div', { style: 'display:flex;align-items:center;gap:10px;margin-bottom:10px' }, [
        el('div', { style: `width:36px;height:36px;border-radius:16px;background:${sec.color}1E;color:${sec.color};display:flex;align-items:center;justify-content:center;flex-shrink:0` }, [icon(sec.icon(), 17)]),
        el('div', { style: 'font-family:ui-rounded, -apple-system, sans-serif;font-weight:700;font-size:14px' }, sec.title),
      ]),
      ...sec.steps.map((s, i) => el('div', { style: 'display:flex;gap:8px;margin-bottom:6px' }, [
        el('span', { style: 'font-family:inherit;font-variant-numeric:tabular-nums;font-size:12px;color:var(--sub);flex-shrink:0' }, `${i + 1}.`),
        el('span', { style: 'font-family:-apple-system, sans-serif;font-size:13px;color:var(--sub);line-height:1.4' }, s),
      ])),
    ]));
  });

  body.appendChild(el('div', { style: 'text-align:center;font-size:11px;color:var(--sub);margin-top:8px;font-family:inherit;font-variant-numeric:tabular-nums' },
    'Alle Daten bleiben ausschließlich lokal auf diesem Gerät gespeichert.'));

  wrap.appendChild(body);
  return wrap;
}

// ---------- Über die App ----------
function renderAboutScreen() {
  const wrap = el('div', { style: 'display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden' });
  wrap.appendChild(header('Kurzübersicht', 'Über die App', { onBack: () => { state.screen = 'dashboard'; render(); } }));
  const body = el('div', { class: 'content' });

  body.appendChild(el('div', { style: 'font-family:-apple-system, sans-serif;font-size:13px;color:var(--sub);margin-bottom:16px;text-align:center' },
    'Alle Daten bleiben ausschließlich lokal auf diesem Gerät gespeichert – keine Cloud, kein Server.'));

  const isDark = document.body.classList.contains('dark');
  const items = [
    { icon: mapPinSvg, color: isDark ? '#6B7CFF' : '#3F53F2', title: 'Parkscheine', text: 'Foto aufnehmen, Datum/Betrag werden per Texterkennung vorgeschlagen und lassen sich direkt bearbeiten.' },
    { icon: briefcaseSvg, color: isDark ? '#B9A6F5' : '#7C5CFF', title: 'Nebenkosten', text: 'Mit frei anpassbaren Kategorien (umbenennbar, löschbar), Notizen und Belegfoto.' },
    { icon: gameCarSvg, color: isDark ? '#FFA020' : '#FF8C00', title: 'Fahrten', text: 'Von/Nach/Zweck/Kilometer erfassen, automatische Berechnung mit Kilometerpauschale.' },
    { icon: mapSvg, color: isDark ? '#FF5CA8' : '#E8267A', title: 'Kilometerstand', text: 'Mit Foto und Ort/Anlass, z. B. praktisch beim Tanken.' },
    { icon: micSvg, color: isDark ? '#6B7CFF' : '#3F53F2', title: 'Notizen', text: 'Freie Sprachnotizen, unabhängig von Belegen.' },
    { icon: mapSvg, color: isDark ? '#B9A6F5' : '#7C5CFF', title: 'Karte', text: 'Zeigt jeden erfassten Parkort einzeln mit Standort an.' },
    { icon: fileTextSvg, color: isDark ? '#FF5A47' : '#FF4433', title: 'Monat & Jahr', text: 'Übersicht mit Diagramm, individuell auswählbarem PDF-, CSV- und Tabellen-Export (XLSX) sowie vollständigem Backup (inkl. Fotos).' },
  ];

  items.forEach(it => {
    body.appendChild(el('div', { class: 'card', style: 'display:flex;gap:12px;align-items:flex-start' }, [
      el('div', { style: `width:36px;height:36px;border-radius:16px;background:${it.color}1E;color:${it.color};display:flex;align-items:center;justify-content:center;flex-shrink:0` }, [icon(it.icon(), 17)]),
      el('div', {}, [
        el('div', { style: 'font-family:ui-rounded, -apple-system, sans-serif;font-weight:700;font-size:14px;margin-bottom:2px' }, it.title),
        el('div', { style: 'font-family:-apple-system, sans-serif;font-size:13px;color:var(--sub);line-height:1.4' }, it.text),
      ]),
    ]));
  });

  body.appendChild(el('div', { style: 'text-align:center;font-size:11px;color:var(--sub);margin-top:8px;font-family:inherit;font-variant-numeric:tabular-nums' },
    'Eigene Entwicklung · genutzte Bibliotheken und Daten: siehe Lizenzen'));
  body.appendChild(legalLinksBP());

  wrap.appendChild(body);
  return wrap;
}


// ---------- Eigenständige Sprachnotizen ----------
function renderNotes() {
  const wrap = el('div', { style: 'display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden' });
  wrap.appendChild(header('Freie Aufnahmen', 'Notizen'));
  const body = el('div', { class: 'content' });
  body.appendChild(renderNavTileStrip('notes'));

  if (state.notizen.length === 0) {
    body.appendChild(el('div', { class: 'empty-state', style: 'margin-top:16px' },
      'Noch keine Sprachnotizen. Praktisch für alles, was nichts mit einem Beleg zu tun hat – z. B. eine schnelle Erinnerung während der Fahrt.'));
  }
  state.notizen.forEach(n => body.appendChild(renderNoteRow(n)));

  wrap.appendChild(body);
  wrap.appendChild(el('button', { class: 'fab', onclick: () => { resetNoteForm(); state.screen = 'add-note'; render(); }, html: micSvg() }));
  return wrap;
}

function renderNoteRow(n) {
  return el('div', { class: 'card entry-row' }, [
    el('div', { class: 'entry-badge', style: 'background:rgba(108,76,224,0.14);color:var(--violet)' }, [icon(micSvg(), 16)]),
    el('div', { class: 'entry-main' }, [
      el('div', { class: 'entry-title' }, n.titel || 'Sprachnotiz'),
      el('div', { class: 'entry-date' }, new Date(n.date).toLocaleDateString('de-DE') + ' · ' + new Date(n.createdAt || n.date).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })),
    ]),
    el('div', { class: 'swipe-actions' }, [
      el('button', { style: 'background:rgba(124,92,255,0.15);color:var(--teal)', onclick: () => playVoiceNote(n.audio), html: playSvg() }),
      el('button', { style: 'background:transparent;color:var(--sub)', onclick: () => editNote(n.id), html: pencilSvg() }),
      el('button', { style: 'background:transparent;color:var(--coral)', onclick: () => removeEntry('notizen', n.id), html: trashSvg() }),
    ]),
  ]);
}

function resetNoteForm() {
  state.editingId = null;
  state.editingType = null;
  state.capturedAudio = null;
  state.isRecording = false;
}

function editNote(id) {
  const n = state.notizen.find(x => x.id === id);
  if (!n) return;
  state.editingId = id;
  state.editingType = 'note';
  state.capturedAudio = n.audio || null;
  state.screen = 'add-note';
  render();
}

function renderAddNote() {
  const existing = state.editingId ? state.notizen.find(x => x.id === state.editingId) : null;
  const wrap = el('div', { class: 'form-screen', style: 'display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden' });
  wrap.appendChild(header(state.editingId ? 'Bearbeiten' : 'Neue Aufnahme', 'Notiz', { onBack: () => { state.screen = 'notes'; render(); } }));
  const body = el('div', { class: 'content' });

  body.appendChild(el('label', { class: 'field-label' }, 'Titel'));
  const titelInput = el('input', { type: 'text', value: existing?.titel || '', placeholder: 'z. B. Idee für morgen' });
  body.appendChild(titelInput);

  body.appendChild(renderVoiceRecorder());

  body.appendChild(el('button', { class: 'btn-primary', onclick: () => saveNoteEntry({ titel: titelInput.value }) }, state.editingId ? 'Änderungen speichern' : 'Notiz speichern'));

  wrap.appendChild(body);
  return wrap;
}

async function saveNoteEntry(data) {
  if (!state.capturedAudio) { await customAlert('Bitte zuerst eine Sprachnotiz aufnehmen.'); return; }
  const existing = state.editingId ? state.notizen.find(x => x.id === state.editingId) : null;
  const entry = {
    id: state.editingId || uid(),
    date: existing?.date || new Date().toISOString().slice(0, 10),
    titel: data.titel || '',
    audio: state.capturedAudio,
    createdAt: existing?.createdAt || Date.now(),
  };
  const wasNew = !state.editingId;
  await dbPut('notizen', entry);
  await loadAll();
  state.screen = 'notes';
  render();
  if (wasNew) celebrateConfirm();
}

// ---------- Karte ----------
function renderMap() {
  const wrap = el('div', { style: 'display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden' });
  wrap.appendChild(header('Standort', 'Letzte Orte'));

  const allParkWithLocation = state.parkscheine.filter(p => p.location);
  const lastPark = allParkWithLocation[0] || null;
  const lastKm = state.kilometerstand.find(k => k.location) || null;

  if (!lastPark && !lastKm) {
    const body = el('div', { class: 'content' }, [
      renderNavTileStrip('map'),
      el('div', { class: 'empty-state', style: 'margin-top:20px' },
        'Noch kein Standort erfasst. Beim nächsten Parkschein oder Kilometerstand bitte den Standortzugriff erlauben, wenn der Browser danach fragt – erst dann kann hier der Ort angezeigt werden.'),
    ]);
    wrap.appendChild(body);
    return wrap;
  }

  const infoCard = el('div', { style: 'flex:0;padding:18px 18px 0;display:flex;flex-direction:column;gap:10px' }, [renderNavTileStrip('map')]);
  if (lastPark) {
    const mapsUrl = `https://www.openstreetmap.org/?mlat=${lastPark.location.lat}&mlon=${lastPark.location.lng}#map=17/${lastPark.location.lat}/${lastPark.location.lng}`;
    infoCard.appendChild(el('div', { class: 'card', style: 'margin:0;border-left:4px solid var(--violet)' }, [
      el('div', { style: 'font-size:10px;color:var(--violet);font-family:inherit;font-variant-numeric:tabular-nums;letter-spacing:0.5px;margin-bottom:2px' },
        allParkWithLocation.length > 1 ? `${allParkWithLocation.length} PARKORTE AUF DER KARTE` : 'ZULETZT GEPARKT'),
      el('div', { style: 'font-family:ui-rounded, -apple-system, sans-serif;font-weight:700;font-size:14px' }, lastPark.ort || 'Parkort'),
      el('div', { style: 'font-family:inherit;font-variant-numeric:tabular-nums;font-size:11px;color:var(--sub);margin:4px 0 12px' }, new Date(lastPark.date).toLocaleDateString('de-DE') + (allParkWithLocation.length > 1 ? ' (neuester)' : '')),
      el('a', {
        href: mapsUrl,
        style: 'display:flex;align-items:center;justify-content:center;gap:8px;padding:11px;border-radius:20px;background:linear-gradient(135deg,var(--violet),var(--violet-deep));color:#fff;text-decoration:none;font-family:ui-rounded, -apple-system, sans-serif;font-weight:700;font-size:14px',
      }, [icon(mapPinSvg(), 15), ' Standort auf OpenStreetMap öffnen']),
    ]));
  }
  if (lastKm) {
    const mapsUrl = `https://www.openstreetmap.org/?mlat=${lastKm.location.lat}&mlon=${lastKm.location.lng}#map=17/${lastKm.location.lat}/${lastKm.location.lng}`;
    infoCard.appendChild(el('div', { class: 'card', style: 'margin:0;border-left:4px solid var(--teal)' }, [
      el('div', { style: 'font-size:10px;color:var(--teal);font-family:inherit;font-variant-numeric:tabular-nums;letter-spacing:0.5px;margin-bottom:2px' }, 'LETZTER KILOMETERSTAND'),
      el('div', { style: 'font-family:ui-rounded, -apple-system, sans-serif;font-weight:700;font-size:14px' }, `${lastKm.km.toLocaleString('de-DE')} km${lastKm.ort ? ' · ' + lastKm.ort : ''}`),
      el('div', { style: 'font-family:inherit;font-variant-numeric:tabular-nums;font-size:11px;color:var(--sub);margin:4px 0 12px' }, new Date(lastKm.date).toLocaleDateString('de-DE')),
      el('a', {
        href: mapsUrl,
        style: 'display:flex;align-items:center;justify-content:center;gap:8px;padding:11px;border-radius:20px;background:linear-gradient(135deg,var(--teal),#5A2FBE);color:#fff;text-decoration:none;font-family:ui-rounded, -apple-system, sans-serif;font-weight:700;font-size:14px',
      }, [icon(mapPinSvg(), 15), ' Standort auf OpenStreetMap öffnen']),
    ]));
  }
  wrap.appendChild(infoCard);

  const mapWrap = el('div', { class: 'map-wrap' }, [
    el('div', { id: 'map' }),
    el('div', { id: 'map-status', style: 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:20px;font-size:13px;color:var(--sub);font-family:-apple-system, sans-serif;background:var(--bg);' }, 'Karte wird geladen …'),
  ]);
  wrap.appendChild(mapWrap);
  return wrap;
}

async function initMap(askAgain) {
  let mapEl = document.getElementById('map');
  let statusEl = document.getElementById('map-status');
  if (!mapEl) return;
  const allowed = await wzCore.ensureMapConsent(askAgain ? { ask: true } : undefined);
  if (!allowed) {
    if (statusEl) {
      statusEl.innerHTML = '';
      statusEl.appendChild(document.createTextNode('Die Kartenansicht ist ausgeschaltet. Die Buttons oben öffnen den Ort direkt auf OpenStreetMap.'));
      const again = document.createElement('button');
      again.type = 'button'; again.className = 'btn-secondary'; again.style.cssText = 'margin-top:12px;max-width:260px';
      again.textContent = 'Karte doch anzeigen';
      again.addEventListener('click', () => initMap(true));
      const box = document.createElement('div'); box.style.cssText = 'display:flex;flex-direction:column;align-items:center';
      box.appendChild(document.createTextNode('')); statusEl.appendChild(box); box.appendChild(again);
    }
    return;
  }
  try { await wzCore.loadLeaflet(); } catch (e) {}
  mapEl = document.getElementById('map');
  statusEl = document.getElementById('map-status');
  if (!mapEl || mapEl._leaflet_id) return;
  if (typeof L === 'undefined') {
    if (statusEl) statusEl.textContent = 'Eingebettete Karte konnte nicht geladen werden. Bitte einen der Buttons "Standort auf OpenStreetMap öffnen" oben verwenden.';
    return;
  }
  const allParkWithLocation = state.parkscheine.filter(p => p.location);
  const lastKm = state.kilometerstand.find(k => k.location) || null;
  if (allParkWithLocation.length === 0 && !lastKm) return;

  const points = allParkWithLocation.map(p => [p.location.lat, p.location.lng]);
  if (lastKm) points.push([lastKm.location.lat, lastKm.location.lng]);

  const map = L.map('map');
  const tileLayer = L.tileLayer('https://tile.openstreetmap.de/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap-Mitwirkende</a>',
    maxZoom: 19, maxNativeZoom: 18,
  }).addTo(map);

  if (points.length > 1) {
    map.fitBounds(points, { padding: [40, 40] });
  } else {
    map.setView(points[0], 16);
  }

  allParkWithLocation.forEach((p) => {
    const pin = L.divIcon({ html: '<div class="wz-pin"></div>', className: '', iconSize: [26, 34], iconAnchor: [13, 32], popupAnchor: [0, -28] });
    L.marker([p.location.lat, p.location.lng], { icon: pin }).addTo(map)
      .bindPopup(`<b>${escapeHtmlBP(p.ort || 'Parkort')}</b><br>${new Date(p.date).toLocaleDateString('de-DE')}<br>${fmtEUR(p.betrag)}`);
  });
  if (lastKm) {
    const kmPoint = [lastKm.location.lat, lastKm.location.lng];
    const kmIcon = L.divIcon({ html: `<div style="background:#B8892F;width:26px;height:26px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`, className: '', iconSize: [26, 26], iconAnchor: [13, 13] });
    L.marker(kmPoint, { icon: kmIcon }).addTo(map).bindPopup(`<b>Kilometerstand</b><br>${lastKm.km.toLocaleString('de-DE')} km<br>${new Date(lastKm.date).toLocaleDateString('de-DE')}`);
  }

  let tileLoaded = false;
  tileLayer.on('load', () => { tileLoaded = true; if (statusEl) statusEl.remove(); });
  setTimeout(() => {
    if (!tileLoaded && statusEl) {
      statusEl.textContent = 'Kartenkacheln laden gerade nicht (z. B. wegen Internetverbindung). Bitte einen der Buttons "Standort auf OpenStreetMap öffnen" oben verwenden.';
    }
  }, 4000);
}

// ---------- Monats- & Jahresübersicht ----------
function selectedMonthKey() {
  return state.selectedMonth || currentMonthKey();
}

function shiftSelectedMonth(delta) {
  const [y, m] = selectedMonthKey().split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  const newKey = currentMonthKey(d);
  if (newKey > currentMonthKey()) return; // nicht in die Zukunft
  state.selectedMonth = newKey;
  render();
}

function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return `${monthNames[m - 1]} ${y}`;
}

function renderMonth() {
  const wrap = el('div', { style: 'display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden' });
  wrap.appendChild(header('Export', state.overviewMode === 'year' ? `Jahr ${new Date().getFullYear()}` : 'Monatsübersicht'));
  const body = el('div', { class: 'content' });
  body.appendChild(renderNavTileStrip('month'));

  // Umschalter Monat / Jahr
  const toggle = el('div', { class: 'segment-toggle', style: 'margin-top:0' }, [
    el('button', {
      class: `segment-btn${state.overviewMode !== 'year' ? ' active' : ''}`,
      onclick: () => { state.overviewMode = 'month'; render(); },
    }, 'Monat'),
    el('button', {
      class: `segment-btn${state.overviewMode === 'year' ? ' active' : ''}`,
      onclick: () => { state.overviewMode = 'year'; render(); },
    }, 'Jahr'),
  ]);
  body.appendChild(toggle);

  if (state.overviewMode === 'year') {
    body.appendChild(renderYearContent());
  } else {
    const isCurrentMonth = selectedMonthKey() === currentMonthKey();
    const monthNav = el('div', { style: 'display:flex;align-items:center;justify-content:space-between;margin-bottom:14px' }, [
      el('button', { class: 'icon-btn nav-round-btn', onclick: () => shiftSelectedMonth(-1), html: arrowLeftSvg() }),
      el('div', { style: 'font-family:ui-rounded, -apple-system, sans-serif;font-weight:700;font-size:14px' }, monthLabel(selectedMonthKey())),
      el('button', {
        class: 'icon-btn nav-round-btn', style: `opacity:${isCurrentMonth ? '0.35' : '1'}`,
        onclick: () => { if (!isCurrentMonth) shiftSelectedMonth(1); },
        html: `<span style="display:inline-block;transform:rotate(180deg)">${arrowLeftSvg()}</span>`,
      }),
    ]);
    body.appendChild(monthNav);
    body.appendChild(renderMonthContent());
  }

  const fullBackupCard = el('div', { class: 'card', style: 'margin-top:8px' }, [
    el('div', { style: 'font-family:ui-rounded, -apple-system, sans-serif;font-weight:700;font-size:14px;margin-bottom:4px' }, 'Vollständiges Backup'),
    el('div', { style: 'font-size:13px;color:var(--sub);margin-bottom:12px' }, 'Enthält wirklich alles – inklusive Fotos und Sprachnotizen. Damit lässt sich der komplette Datenbestand 1:1 wiederherstellen.'),
    el('div', { class: 'btn-row' }, [
      makeExportButton('btn-primary', downloadSvg(), 'Backup erstellen', buildFullBackup),
      el('button', { class: 'btn-secondary', onclick: triggerBackupImport }, 'Backup importieren'),
    ]),
  ]);

  const xlsxCard = el('div', { class: 'card', style: 'margin-top:8px' }, [
    el('div', { style: 'font-family:ui-rounded, -apple-system, sans-serif;font-weight:700;font-size:14px;margin-bottom:4px' }, 'Tabellen-Export (XLSX)'),
    el('div', { style: 'font-size:13px;color:var(--sub);margin-bottom:12px' }, 'Formatierte Tabellendatei (XLSX) mit eigenen Tabellenblättern und Summenzeilen. Wähle unten aus, was und für welchen Zeitraum enthalten sein soll.'),
  ]);

  const xsel = state.xlsxSelection;
  const xlsxCatRow = el('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px' });
  [
    ['park', 'Parkscheine'], ['extra', 'Nebenkosten'], ['fahrt', 'Fahrten'], ['km', 'Kilometerstand'],
  ].forEach(([key, label]) => {
    const active = xsel[key];
    xlsxCatRow.appendChild(el('button', {
      style: `padding:8px 12px;border-radius:28px;border:none;cursor:pointer;font-family:ui-rounded, -apple-system, sans-serif;font-size:12px;font-weight:700;background:${active ? 'var(--violet)' : 'rgba(108,76,224,0.1)'};color:${active ? '#fff' : 'var(--violet)'}`,
      onclick: () => { xsel[key] = !xsel[key]; render(); },
    }, label));
  });
  xlsxCard.appendChild(xlsxCatRow);

  xlsxCard.appendChild(el('label', { class: 'field-label' }, 'Zeitraum'));
  const monthSelect = el('select', { onchange: (e) => { state.xlsxMonth = e.target.value; } },
    [el('option', { value: 'all', selected: state.xlsxMonth === 'all' ? 'selected' : null }, 'Alle Monate'),
      ...xlsxAvailableMonths().map(m => el('option', { value: m, selected: state.xlsxMonth === m ? 'selected' : null }, monthLabel(m)))]);
  xlsxCard.appendChild(monthSelect);

  xlsxCard.appendChild(el('button', {
    class: 'btn-secondary', style: 'margin-bottom:10px',
    onclick: () => {
      const filtered = xlsxFilteredData();
      showXLSXPreview(filtered);
    },
  }, 'Vorschau ansehen'));
  xlsxCard.appendChild(makeExportButton('btn-primary', downloadSvg(), 'XLSX erstellen', buildXLSX));
  body.appendChild(xlsxCard);
  body.appendChild(fullBackupCard);

  wrap.appendChild(body);
  return wrap;
}

function pdfCheckRow(label, count, unit, total, key, color) {
  const checked = state.pdfSelection[key];
  return el('div', {
    class: 'card',
    style: `display:flex;justify-content:space-between;align-items:center;cursor:pointer;opacity:${checked ? '1' : '0.45'}`,
    onclick: () => { state.pdfSelection[key] = !state.pdfSelection[key]; render(); },
  }, [
    el('span', { style: 'display:flex;align-items:center;gap:10px' }, [
      el('span', {
        style: `width:20px;height:20px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:${checked ? color : 'transparent'};border:2px solid ${color}`,
        html: checked ? checkSvg() : '',
      }),
      el('span', {}, [label + ' ', el('span', { style: 'font-family:inherit;font-variant-numeric:tabular-nums;font-size:10px;color:var(--sub)' }, `(${count} ${unit})`)]),
    ]),
    el('span', { style: 'font-family:inherit;font-variant-numeric:tabular-nums;font-weight:700;font-size:17px;color:var(--amount)' }, fmtEUR(total)),
  ]);
}

function renderMonthContent() {
  const frag = document.createDocumentFragment();
  const monthKey = selectedMonthKey();
  const parkMonth = state.parkscheine.filter(p => p.date.startsWith(monthKey));
  const extraMonth = state.nebenkosten.filter(n => n.date.startsWith(monthKey));
  const fahrtMonth = state.fahrten.filter(f => f.date.startsWith(monthKey));
  const totalPark = parkMonth.reduce((s, p) => s + p.betrag, 0);
  const totalExtra = extraMonth.reduce((s, n) => s + n.betrag, 0);
  const totalFahrt = fahrtMonth.reduce((s, f) => s + f.betrag, 0);
  const sel = state.pdfSelection;
  const selectedTotal = (sel.park ? totalPark : 0) + (sel.extra ? totalExtra : 0) + (sel.fahrt ? totalFahrt : 0);

  const [selY, selM] = monthKey.split('-').map(Number);
  const trend = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(selY, selM - 1 - i, 1);
    const key = currentMonthKey(d);
    const sum = state.parkscheine.filter(p => p.date.startsWith(key)).reduce((s, p) => s + p.betrag, 0)
      + state.nebenkosten.filter(n => n.date.startsWith(key)).reduce((s, n) => s + n.betrag, 0)
      + state.fahrten.filter(f => f.date.startsWith(key)).reduce((s, f) => s + f.betrag, 0);
    trend.push(sum);
  }
  const max = Math.max(...trend, 1);
  frag.appendChild(el('div', { class: 'card' }, [
    el('div', { style: 'font-size:10px;color:var(--sub);font-family:inherit;font-variant-numeric:tabular-nums;letter-spacing:1px' }, 'AUSGABENVERLAUF (6 MONATE BIS AUSGEWÄHLTEM MONAT)'),
    el('div', { class: 'chart-bars' }, trend.map(v => el('div', { style: `height:${Math.max((v / max) * 100, 4)}%` }))),
  ]));

  frag.appendChild(el('div', { style: 'font-size:10px;color:var(--sub);font-family:inherit;font-variant-numeric:tabular-nums;letter-spacing:1px;margin:4px 0 8px' }, 'FÜR PDF/CSV AUSWÄHLEN (ANTIPPEN)'));
  frag.appendChild(pdfCheckRow('Parkscheine', parkMonth.length, 'Fotos', totalPark, 'park', 'var(--violet)'));
  frag.appendChild(pdfCheckRow('Nebenkosten', extraMonth.length, 'Fotos', totalExtra, 'extra', 'var(--teal)'));
  frag.appendChild(pdfCheckRow('Fahrten', fahrtMonth.length, 'Fahrten', totalFahrt, 'fahrt', 'var(--pink)'));

  frag.appendChild(el('div', { class: 'total-strip' }, [
    el('span', { style: 'font-weight:700' }, 'Ausgewählt'),
    el('span', { style: 'font-family:inherit;font-variant-numeric:tabular-nums;font-weight:700;font-size:17px' }, fmtEUR(selectedTotal)),
  ]));

  const pdfBtn = makeExportButton('btn-primary', downloadSvg(), 'PDF erstellen', async () => {
    if (!sel.park && !sel.extra && !sel.fahrt) { await customAlert('Bitte mindestens eine Kategorie auswählen.'); throw new Error('validation'); }
    return exportMonthPDF(sel.park ? parkMonth : [], sel.extra ? extraMonth : [], sel.fahrt ? fahrtMonth : []);
  });
  const csvBtn = makeExportButton('btn-primary', downloadSvg(), 'CSV erstellen', buildCSV);
  frag.appendChild(el('div', { class: 'btn-row', style: 'margin-top:16px' }, [pdfBtn, csvBtn]));
  return frag;
}

function renderYearContent() {
  const frag = document.createDocumentFragment();
  const year = new Date().getFullYear();
  const monthSums = [];
  for (let m = 0; m < 12; m++) {
    const key = `${year}-${String(m + 1).padStart(2, '0')}`;
    const sum = state.parkscheine.filter(p => p.date.startsWith(key)).reduce((s, p) => s + p.betrag, 0)
      + state.nebenkosten.filter(n => n.date.startsWith(key)).reduce((s, n) => s + n.betrag, 0)
      + state.fahrten.filter(f => f.date.startsWith(key)).reduce((s, f) => s + f.betrag, 0);
    monthSums.push(sum);
  }
  const max = Math.max(...monthSums, 1);
  frag.appendChild(el('div', { class: 'card' }, [
    el('div', { style: 'font-size:10px;color:var(--sub);font-family:inherit;font-variant-numeric:tabular-nums;letter-spacing:1px' }, `MONATSVERLAUF ${year}`),
    el('div', { class: 'chart-bars' }, monthSums.map(v => el('div', { style: `height:${Math.max((v / max) * 100, 4)}%` }))),
    el('div', { style: 'display:flex;justify-content:space-between;margin-top:4px' },
      ['J','F','M','A','M','J','J','A','S','O','N','D'].map(l => el('span', { style: 'font-size:9px;color:var(--sub);flex:1;text-align:center;font-family:inherit;font-variant-numeric:tabular-nums' }, l))),
  ]));

  const parkYear = state.parkscheine.filter(p => p.date.startsWith(String(year)));
  const extraYear = state.nebenkosten.filter(n => n.date.startsWith(String(year)));
  const fahrtYear = state.fahrten.filter(f => f.date.startsWith(String(year)));
  const totalPark = parkYear.reduce((s, p) => s + p.betrag, 0);
  const totalExtra = extraYear.reduce((s, n) => s + n.betrag, 0);
  const totalFahrt = fahrtYear.reduce((s, f) => s + f.betrag, 0);
  const sel = state.pdfSelection;
  const selectedTotal = (sel.park ? totalPark : 0) + (sel.extra ? totalExtra : 0) + (sel.fahrt ? totalFahrt : 0);

  frag.appendChild(el('div', { style: 'font-size:10px;color:var(--sub);font-family:inherit;font-variant-numeric:tabular-nums;letter-spacing:1px;margin:4px 0 8px' }, 'FÜR PDF/CSV AUSWÄHLEN (ANTIPPEN)'));
  frag.appendChild(pdfCheckRow('Parkscheine', parkYear.length, 'Fotos', totalPark, 'park', 'var(--violet)'));
  frag.appendChild(pdfCheckRow('Nebenkosten', extraYear.length, 'Fotos', totalExtra, 'extra', 'var(--teal)'));
  frag.appendChild(pdfCheckRow('Fahrten', fahrtYear.length, 'Fahrten', totalFahrt, 'fahrt', 'var(--pink)'));
  frag.appendChild(el('div', { class: 'total-strip' }, [
    el('span', { style: 'font-weight:700' }, `Ausgewählt ${year}`),
    el('span', { style: 'font-family:inherit;font-variant-numeric:tabular-nums;font-weight:700;font-size:17px' }, fmtEUR(selectedTotal)),
  ]));

  const pdfBtn = makeExportButton('btn-primary', downloadSvg(), 'PDF erstellen', async () => {
    if (!sel.park && !sel.extra && !sel.fahrt) { await customAlert('Bitte mindestens eine Kategorie auswählen.'); throw new Error('validation'); }
    return exportYearPDF(sel.park ? parkYear : [], sel.extra ? extraYear : [], sel.fahrt ? fahrtYear : [], year);
  });
  const csvBtn = makeExportButton('btn-primary', downloadSvg(), 'CSV erstellen', buildCSV);
  frag.appendChild(el('div', { class: 'btn-row', style: 'margin-top:16px' }, [pdfBtn, csvBtn]));
  return frag;
}

function getImageDimensions(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 1, height: 1 });
    img.src = dataUrl;
  });
}

function fitBox(natW, natH, maxW, maxH) {
  const ratio = Math.min(maxW / natW, maxH / natH);
  return { w: natW * ratio, h: natH * ratio };
}

// ---------- PDF-Export ----------
async function exportMonthPDF(parkMonth, extraMonth, fahrtMonth = []) {
  if (typeof jspdf === 'undefined') { try { await wzCore.loadScript('./lib-jspdf.umd.min.js'); } catch (e) {} }
  if (typeof jspdf === 'undefined') { await customAlert('PDF-Bibliothek konnte nicht geladen werden.'); return; }
  const { jsPDF } = jspdf;
  const doc = new jsPDF();
  let y = 20;
  doc.setFontSize(16);
  doc.text('BelegParkWahr — Monatsübersicht', 14, y);
  y += 6;
  doc.setFontSize(10);
  doc.text(new Date().toLocaleDateString('de-DE'), 14, y);
  y += 10;

  if (parkMonth.length > 0) {
    doc.setFontSize(13);
    doc.text('Parkscheine', 14, y); y += 8;
    for (let i = 0; i < parkMonth.length; i++) {
      const p = parkMonth[i];
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(10);
      doc.text(`${i + 1}. ${new Date(p.date).toLocaleDateString('de-DE')}  ${p.ort || ''}`, 14, y);
      doc.setFont(undefined, 'bold');
      doc.text(fmtEUR(p.betrag), 132, y, { align: 'right' });
      doc.setFont(undefined, 'normal');
      if (p.photo) {
        try {
          const dim = await getImageDimensions(p.photo);
          const box = fitBox(dim.width, dim.height, 40, 40);
          doc.addImage(p.photo, 'JPEG', 140, y - 14, box.w, box.h);
        } catch (e) {}
      }
      y += 42;
    }
    y += 6;
  }

  if (extraMonth.length > 0) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(13);
    doc.text('Nebenkosten', 14, y); y += 8;
    for (const n of extraMonth) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(10);
      doc.text(`${new Date(n.date).toLocaleDateString('de-DE')}  ${n.titel} (${n.kategorie})`, 14, y);
      doc.setFont(undefined, 'bold');
      doc.text(fmtEUR(n.betrag), 132, y, { align: 'right' });
      doc.setFont(undefined, 'normal');
      if (n.photo) {
        try {
          const dim = await getImageDimensions(n.photo);
          const box = fitBox(dim.width, dim.height, 40, 40);
          doc.addImage(n.photo, 'JPEG', 140, y - 14, box.w, box.h);
        } catch (e) {}
      }
      y += 42;
    }
  }

  if (fahrtMonth.length > 0) {
    y += 6;
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(13);
    doc.text('Fahrten', 14, y); y += 8;
    for (const f of fahrtMonth) {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(10);
      doc.text(`${new Date(f.date).toLocaleDateString('de-DE')}  ${f.von || '?'} -> ${f.nach || '?'} (${f.km} km${f.zweck ? ', ' + f.zweck : ''})`, 14, y);
      doc.text(fmtEUR(f.betrag), 170, y, { align: 'right' });
      y += 12;
    }
  }

  const total = parkMonth.reduce((s, p) => s + p.betrag, 0) + extraMonth.reduce((s, n) => s + n.betrag, 0) + fahrtMonth.reduce((s, f) => s + f.betrag, 0);
  if (y > 260) { doc.addPage(); y = 20; }
  doc.setFontSize(12);
  doc.text(`Gesamt: ${fmtEUR(total)}`, 14, y + 10);

  const blob = doc.output('blob');
  return { blob, filename: `BelegParkWahr-${currentMonthKey()}.pdf`, mime: 'application/pdf' };
}

async function exportYearPDF(parkYear, extraYear, fahrtYear, year) {
  if (typeof jspdf === 'undefined') { try { await wzCore.loadScript('./lib-jspdf.umd.min.js'); } catch (e) {} }
  if (typeof jspdf === 'undefined') { await customAlert('PDF-Bibliothek konnte nicht geladen werden.'); return; }
  const { jsPDF } = jspdf;
  const doc = new jsPDF();
  let y = 20;
  doc.setFontSize(16);
  doc.text(`BelegParkWahr — Jahresübersicht ${year}`, 14, y);
  y += 10;

  let parkCounter = 0;
  for (let m = 0; m < 12; m++) {
    const key = `${year}-${String(m + 1).padStart(2, '0')}`;
    const parkMonth = parkYear.filter(p => p.date.startsWith(key));
    const extraMonth = extraYear.filter(n => n.date.startsWith(key));
    const fahrtMonth = fahrtYear.filter(f => f.date.startsWith(key));
    if (parkMonth.length === 0 && extraMonth.length === 0 && fahrtMonth.length === 0) continue;

    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(13);
    doc.text(monthNames[m], 14, y); y += 8;

    for (const p of parkMonth) {
      parkCounter++;
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(10);
      doc.text(`${parkCounter}. ${new Date(p.date).toLocaleDateString('de-DE')}  ${p.ort || ''}`, 14, y);
      doc.setFont(undefined, 'bold');
      doc.text(fmtEUR(p.betrag), 132, y, { align: 'right' });
      doc.setFont(undefined, 'normal');
      if (p.photo) {
        try {
          const dim = await getImageDimensions(p.photo);
          const box = fitBox(dim.width, dim.height, 40, 40);
          doc.addImage(p.photo, 'JPEG', 140, y - 14, box.w, box.h);
        } catch (e) {}
      }
      y += 42;
    }
    for (const n of extraMonth) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(10);
      doc.text(`${new Date(n.date).toLocaleDateString('de-DE')}  ${n.titel} (${n.kategorie})`, 14, y);
      doc.setFont(undefined, 'bold');
      doc.text(fmtEUR(n.betrag), 132, y, { align: 'right' });
      doc.setFont(undefined, 'normal');
      if (n.photo) {
        try {
          const dim = await getImageDimensions(n.photo);
          const box = fitBox(dim.width, dim.height, 40, 40);
          doc.addImage(n.photo, 'JPEG', 140, y - 14, box.w, box.h);
        } catch (e) {}
      }
      y += 42;
    }
    for (const f of fahrtMonth) {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(10);
      doc.text(`${new Date(f.date).toLocaleDateString('de-DE')}  ${f.von || '?'} -> ${f.nach || '?'} (${f.km} km${f.zweck ? ', ' + f.zweck : ''})`, 14, y);
      doc.text(fmtEUR(f.betrag), 170, y, { align: 'right' });
      y += 12;
    }
    y += 4;
  }

  const total = parkYear.reduce((s, p) => s + p.betrag, 0) + extraYear.reduce((s, n) => s + n.betrag, 0) + fahrtYear.reduce((s, f) => s + f.betrag, 0);
  if (y > 260) { doc.addPage(); y = 20; }
  doc.setFontSize(12);
  doc.text(`Gesamt ${year}: ${fmtEUR(total)}`, 14, y + 10);

  const blob = doc.output('blob');
  return { blob, filename: `BelegParkWahr-Jahr-${year}.pdf`, mime: 'application/pdf' };
}

// ---------- Vollständiges Backup (JSON, inkl. Fotos/Audio) ----------
async function buildFullBackup() {
  const data = {
    format: 'parken-und-belege-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    parkscheine: state.parkscheine,
    nebenkosten: state.nebenkosten,
    fahrten: state.fahrten,
    kilometerstand: state.kilometerstand,
    notizen: state.notizen,
    categories: state.categories,
  };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  return { blob, filename: `BelegParkWahr-Vollbackup-${new Date().toISOString().slice(0, 10)}.json`, mime: 'application/json' };
}

function triggerBackupImport() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.style.display = 'none';
  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.format !== 'parken-und-belege-backup') {
        await customAlert('Diese Datei sieht nicht wie ein gültiges Backup dieser App aus.');
        return;
      }
      const counts = {
        parkscheine: (data.parkscheine || []).length,
        nebenkosten: (data.nebenkosten || []).length,
        fahrten: (data.fahrten || []).length,
        kilometerstand: (data.kilometerstand || []).length,
        notizen: (data.notizen || []).length,
      };
      const ok = await customConfirm(
        `Backup vom ${data.exportedAt ? new Date(data.exportedAt).toLocaleDateString('de-DE') : 'unbekannt'} importieren?\n\n` +
        `${counts.parkscheine} Parkscheine\n${counts.nebenkosten} Nebenkosten\n${counts.fahrten} Fahrten\n${counts.kilometerstand} Kilometerstände\n${counts.notizen} Notizen\n\n` +
        `Bereits vorhandene Einträge mit gleicher ID werden überschrieben, alles andere bleibt zusätzlich erhalten.`
      );
      if (!ok) return;

      for (const p of data.parkscheine || []) await dbPut('parkscheine', p);
      for (const n of data.nebenkosten || []) await dbPut('nebenkosten', n);
      for (const f of data.fahrten || []) await dbPut('fahrten', f);
      for (const k of data.kilometerstand || []) await dbPut('kilometerstand', k);
      for (const note of data.notizen || []) await dbPut('notizen', note);
      if (data.categories) {
        const merged = Array.from(new Set([...state.categories, ...data.categories]));
        await dbSetMeta('categories', merged);
      }
      await loadAll();
      render();
      await customAlert('Backup erfolgreich importiert.');
    } catch (err) {
      await customAlert('Backup konnte nicht gelesen werden. Ist es eine gültige Backup-Datei dieser App?');
    }
  });
  document.body.appendChild(input);
  input.click();
  setTimeout(() => input.remove(), 1000);
}

// ---------- Tabellen-Export (XLSX) (formatiert, mehrere Tabellenblätter) ----------
function xlsxFilteredData() {
  const sel = state.xlsxSelection;
  const month = state.xlsxMonth;
  const byMonth = (arr) => month === 'all' ? arr : arr.filter(e => e.date.startsWith(month));
  return {
    parkscheine: sel.park ? byMonth(state.parkscheine) : [],
    nebenkosten: sel.extra ? byMonth(state.nebenkosten) : [],
    fahrten: sel.fahrt ? byMonth(state.fahrten) : [],
    kilometerstand: sel.km ? byMonth(state.kilometerstand) : [],
  };
}

function xlsxAvailableMonths() {
  const all = [...state.parkscheine, ...state.nebenkosten, ...state.fahrten, ...state.kilometerstand];
  const months = Array.from(new Set(all.map(e => e.date.slice(0, 7)))).sort().reverse();
  return months;
}

async function buildXLSX() {
  if (typeof XLSX === 'undefined') { try { await wzCore.loadScript('./wz-xlsx.js'); } catch (e) {} }
  if (typeof XLSX === 'undefined') { await customAlert('Tabellen-Export konnte nicht geladen werden.'); throw new Error('xlsx missing'); }
  const sel = state.xlsxSelection;
  if (!sel.park && !sel.extra && !sel.fahrt && !sel.km) { await customAlert('Bitte mindestens eine Kategorie auswählen.'); throw new Error('validation'); }
  const filtered = xlsxFilteredData();
  const wb = XLSX.utils.book_new();

  function addSheet(name, headers, rows, sumCols) {
    if (rows.length === 0) return;
    const data = [headers, ...rows];
    if (sumCols) {
      const sumRow = headers.map((h, i) => {
        if (i === 0) return 'Summe';
        if (sumCols.includes(i)) return rows.reduce((s, r) => s + (parseFloat(r[i]) || 0), 0);
        return '';
      });
      data.push(sumRow);
    }
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = headers.map(() => ({ wch: 18 }));
    // Kopfzeile fett hervorheben (Unterstützung hängt von der jeweiligen Tabellen-App ab)
    headers.forEach((_, i) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
      if (ws[cellRef]) ws[cellRef].s = { font: { bold: true }, fill: { fgColor: { rgb: 'E9E4FB' } } };
    });
    XLSX.utils.book_append_sheet(wb, ws, name);
  }

  addSheet('Parkscheine', ['Datum', 'Ort', 'Betrag (€)'],
    filtered.parkscheine.map(p => [p.date, p.ort || '', p.betrag]), [2]);

  addSheet('Nebenkosten', ['Datum', 'Titel', 'Kategorie', 'Betrag (€)', 'Notiz'],
    filtered.nebenkosten.map(n => [n.date, n.titel, n.kategorie, n.betrag, n.notiz || '']), [3]);

  addSheet('Fahrten', ['Datum', 'Von', 'Nach', 'Zweck', 'Kilometer', 'Satz (€/km)', 'Betrag (€)'],
    filtered.fahrten.map(f => [f.date, f.von || '', f.nach || '', f.zweck || '', f.km, f.satz, f.betrag]), [6]);

  addSheet('Kilometerstand', ['Datum', 'Kilometerstand', 'Ort/Anlass'],
    filtered.kilometerstand.map(k => [k.date, k.km, k.ort || '']), []);

  if (wb.SheetNames.length === 0) { await customAlert('Für diese Auswahl gibt es keine Einträge.'); throw new Error('validation'); }

  const wbOut = XLSX.write(wb, { type: 'array', bookType: 'xlsx', cellStyles: true });
  const blob = new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  return { blob, filename: `BelegParkWahr-${new Date().toISOString().slice(0, 10)}.xlsx`, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
}

// ---------- CSV-Export (Backup) ----------
async function buildCSV() {
  const rows = [['Typ', 'Datum', 'Titel/Ort', 'Kategorie', 'Betrag', 'Notiz']];
  state.parkscheine.forEach(p => rows.push(['Parkschein', p.date, p.ort || '', '', p.betrag.toFixed(2), '']));
  state.nebenkosten.forEach(n => rows.push(['Nebenkosten', n.date, n.titel, n.kategorie, n.betrag.toFixed(2), n.notiz || '']));
  state.fahrten.forEach(f => rows.push(['Fahrt', f.date, `${f.von || ''} -> ${f.nach || ''}`, `${f.km} km × ${f.satz} €`, f.betrag.toFixed(2), f.zweck || '']));
  state.kilometerstand.forEach(k => rows.push(['Kilometerstand', k.date, k.ort || '', `${k.km} km`, '', '']));
  state.notizen.forEach(n => rows.push(['Sprachnotiz', n.date, n.titel || '', '', '', '(nur Audio, nicht im CSV enthalten)']));
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  return { blob, filename: 'BelegParkWahr-Backup.csv', mime: 'text/csv' };
}

// Öffnet den nativen "Teilen"-Dialog (dort lässt sich die Datei sichern).
// Fällt auf einen normalen Download-Link zurück, falls Teilen nicht unterstützt wird
// (z. B. am Desktop-Browser beim Testen).
// Erstellt einen Export-Button, der zweistufig funktioniert:
// 1. Antippen -> Datei wird im Hintergrund vorbereitet (kann bei PDFs mit Bildern etwas dauern)
// 2. Danach erscheint ein neuer, eigener Tipp-Button -> erst DIESER frische Fingertipp
//    öffnet den "Teilen"-Dialog. So bleibt die vom Smartphone geforderte "direkte Nutzer-Aktion"
//    erhalten, auch wenn die Vorbereitung selbst einen Moment gedauert hat.
function showXLSXPreview(filtered) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(var(--wzq-141023, 20, 16, 35),0.95);z-index:1000;display:flex;flex-direction:column;padding:max(16px, env(safe-area-inset-top)) 16px 16px;box-sizing:border-box;';

  const topBar = document.createElement('div');
  topBar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;';
  const title = document.createElement('div');
  title.textContent = 'Vorschau: Was wird exportiert?';
  title.style.cssText = "color:#fff;font-family:ui-rounded, -apple-system, sans-serif;font-weight:700;font-size:14px;";
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Schließen ✕';
  closeBtn.style.cssText = "background:rgba(255,255,255,0.15);color:#fff;border:none;border-radius:16px;padding:8px 14px;font-family:-apple-system, sans-serif;font-size:13px;";
  closeBtn.onclick = () => overlay.remove();
  topBar.appendChild(title);
  topBar.appendChild(closeBtn);
  overlay.appendChild(topBar);

  const box = document.createElement('div');
  box.style.cssText = 'flex:1;background:#fff;border-radius:22px;overflow:auto;padding:16px;';

  function section(name, headers, rows) {
    const wrapDiv = document.createElement('div');
    wrapDiv.style.marginBottom = '20px';
    const h = document.createElement('div');
    h.textContent = `${name} (${rows.length})`;
    h.style.cssText = "font-family:ui-rounded, -apple-system, sans-serif;font-weight:700;font-size:14px;color:#2E3448;margin-bottom:6px;";
    wrapDiv.appendChild(h);
    if (rows.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'Keine Einträge in diesem Zeitraum.';
      empty.style.cssText = "font-family:-apple-system, sans-serif;font-size:13px;color:#7C88A3;";
      wrapDiv.appendChild(empty);
    } else {
      const table = document.createElement('table');
      table.style.cssText = 'width:100%;border-collapse:collapse;font-family:inherit;font-variant-numeric:tabular-nums;font-size:11px;color:#2E3448;';
      const thead = document.createElement('tr');
      headers.forEach(hd => {
        const th = document.createElement('th');
        th.textContent = hd;
        th.style.cssText = 'text-align:left;padding:6px;background:#E4E9F8;border-bottom:1px solid #D7DEEF;';
        thead.appendChild(th);
      });
      table.appendChild(thead);
      rows.forEach(r => {
        const tr = document.createElement('tr');
        r.forEach(v => {
          const td = document.createElement('td');
          td.textContent = v;
          td.style.cssText = 'padding:6px;border-bottom:1px solid #D7DEEF;';
          tr.appendChild(td);
        });
        table.appendChild(tr);
      });
      wrapDiv.appendChild(table);
    }
    box.appendChild(wrapDiv);
  }

  section('Parkscheine', ['Datum', 'Ort', 'Betrag (€)'], filtered.parkscheine.map(p => [new Date(p.date).toLocaleDateString('de-DE'), p.ort || '', fmtEUR(p.betrag)]));
  section('Nebenkosten', ['Datum', 'Titel', 'Kategorie', 'Betrag (€)'], filtered.nebenkosten.map(n => [new Date(n.date).toLocaleDateString('de-DE'), n.titel, n.kategorie, fmtEUR(n.betrag)]));
  section('Fahrten', ['Datum', 'Von', 'Nach', 'km', 'Betrag (€)'], filtered.fahrten.map(f => [new Date(f.date).toLocaleDateString('de-DE'), f.von || '', f.nach || '', f.km, fmtEUR(f.betrag)]));
  section('Kilometerstand', ['Datum', 'km', 'Ort/Anlass'], filtered.kilometerstand.map(k => [new Date(k.date).toLocaleDateString('de-DE'), k.km, k.ort || '']));

  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

function showFilePreview(blob, mimeType) {
  const url = URL.createObjectURL(blob);
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(var(--wzq-141023, 20, 16, 35),0.95);z-index:1000;display:flex;flex-direction:column;padding:max(16px, env(safe-area-inset-top)) 16px 16px;box-sizing:border-box;';

  const topBar = document.createElement('div');
  topBar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;';
  const title = document.createElement('div');
  title.textContent = 'Vorschau';
  title.style.cssText = "color:#fff;font-family:ui-rounded, -apple-system, sans-serif;font-weight:700;font-size:14px;";
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Schließen ✕';
  closeBtn.style.cssText = "background:rgba(255,255,255,0.15);color:#fff;border:none;border-radius:16px;padding:8px 14px;font-family:-apple-system, sans-serif;font-size:13px;";
  closeBtn.onclick = () => { URL.revokeObjectURL(url); overlay.remove(); };
  topBar.appendChild(title);
  topBar.appendChild(closeBtn);
  overlay.appendChild(topBar);

  if (mimeType === 'application/pdf') {
    const iframe = document.createElement('iframe');
    // #view=FitH weist den PDF-Betrachter an, die Seite auf die verfügbare Breite
    // einzupassen, statt sie in Originalgröße (breiter als der Bildschirm) zu zeigen.
    iframe.src = url + '#view=FitH';
    iframe.style.cssText = 'flex:1;border:none;border-radius:22px;background:#fff;';
    overlay.appendChild(iframe);
  } else if (mimeType.includes('spreadsheetml') || mimeType.includes('json')) {
    // XLSX/JSON: Inhalt ist binär bzw. sehr technisch, keine sinnvolle Textvorschau möglich
    const box = document.createElement('div');
    box.style.cssText = 'flex:1;background:#fff;border-radius:22px;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;';
    box.innerHTML = `<div style="font-family:-apple-system, sans-serif;color:#2E3448;font-size:14px">Für diesen Dateityp gibt es keine Vorschau hier in der App.<br><br>Die Datei ist aber fertig und bereit zum Speichern.</div>`;
    overlay.appendChild(box);
  } else {
    // CSV: als Text anzeigen, da Browser diesen Typ nicht direkt darstellen
    const box = document.createElement('div');
    box.style.cssText = 'flex:1;background:#fff;border-radius:22px;overflow:auto;padding:14px;';
    const pre = document.createElement('pre');
    pre.style.cssText = "margin:0;white-space:pre-wrap;word-break:break-word;font-family:inherit;font-variant-numeric:tabular-nums;font-size:13px;color:#2E3448;";
    blob.text().then(t => { pre.textContent = t; });
    box.appendChild(pre);
    overlay.appendChild(box);
  }

  document.body.appendChild(overlay);
}

function makeExportButton(className, iconSvg, label, buildFn) {
  const btn = el('button', { class: className }, [icon(iconSvg, 15), ' ' + label]);
  const originalHTML = btn.innerHTML;

  btn.addEventListener('click', async function onPrepare() {
    btn.removeEventListener('click', onPrepare);
    btn.disabled = true;
    btn.style.opacity = '0.7';
    btn.innerHTML = 'Wird vorbereitet …';
    try {
      const { blob, filename, mime } = await buildFn();

      showFilePreview(blob, mime);

      btn.disabled = false;
      btn.style.opacity = '1';
      btn.innerHTML = downloadSvg() + ' Jetzt speichern / teilen';
      btn.addEventListener('click', async function onSave() {
        btn.removeEventListener('click', onSave);
        btn.disabled = true;
        btn.style.opacity = '0.7';
        await shareFile(blob, filename, mime);
        await markBackupDone();
        btn.disabled = false;
        btn.style.opacity = '1';
      });
    } catch (e) {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.innerHTML = originalHTML;
      if (e && e.message !== 'validation') await customAlert('Datei konnte nicht erstellt werden.');
    }
  });

  return btn;
}

async function shareFile(blob, filename, mimeType) {
  try {
    const file = new File([blob], filename, { type: mimeType });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file] });
      return;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return; // Nutzer hat den Dialog selbst abgebrochen
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function markBackupDone() {
  await dbSetMeta('lastBackup', Date.now());
}

function renderBackupBanner() {
  const holder = el('div');
  dbGetMeta('lastBackup').then(last => {
    const days = last ? (Date.now() - last) / 86400000 : Infinity;
    if (days > 14) {
      holder.innerHTML = '';
      holder.appendChild(el('div', { class: 'backup-banner', onclick: () => { state.screen = 'month'; render(); } }, [
        icon(downloadSvg(), 18),
        el('span', {}, last ? `Letztes Backup vor ${Math.floor(days)} Tagen — zur Sicherheit jetzt exportieren` : 'Noch kein Backup erstellt — zur Sicherheit jetzt exportieren'),
      ]));
    }
  });
  return holder;
}

// ---------- Kachel-Navigation ----------
// Ersetzt die frühere schwebende Tableiste: eine kompakte Kachelreihe im
// gleichen Kachel-Design wie die Übersicht, oben auf jedem Hauptbildschirm.
const NAV_TILES = [
  { id: 'dashboard', label: 'Übersicht', icon: homeSvg },
  { id: 'home', label: 'Parken', icon: mapPinSvg },
  { id: 'extra', label: 'Kosten', icon: briefcaseSvg },
  { id: 'map', label: 'Karte', icon: mapSvg },
  { id: 'month', label: 'Monat', icon: fileTextSvg },
  { id: 'notes', label: 'Notizen', icon: micSvg },
];
function renderNavTileStrip(activeId) {
  const active = ['add-park'].includes(activeId) ? 'home'
    : ['add-extra', 'add-fahrt', 'add-km'].includes(activeId) ? 'extra'
    : ['add-note'].includes(activeId) ? 'notes'
    : activeId;
  return el('div', { class: 'nav-tile-strip' }, NAV_TILES.map(t => el('button', {
    class: `nav-tile${active === t.id ? ' active' : ''}`,
    onclick: () => { state.screen = t.id; render(); },
  }, [
    el('div', { class: 'tile-icon-wrap' }, [icon(t.icon(), 16)]),
    el('span', {}, t.label),
  ])));
}

function toggleDarkMode() {
  state.darkMode = !state.darkMode;
  if (window.wzTheme) wzTheme.set(state.darkMode);
  document.body.classList.toggle('dark', state.darkMode);
  render();
}
if (window.wzTheme) wzTheme.onChange((dark) => {
  if (dark === state.darkMode) return;
  state.darkMode = dark;
  document.body.classList.toggle('dark', dark);
  render();
});

// ---------- Start ----------
(async function init() {
  await loadAll();
  resetAddForm();
  // Erlaubt Direktsprünge von der Startseite (./bp-app.html) aus, z. B. bp-app.html?screen=guide
  const params = new URLSearchParams(location.search);
  const requestedScreen = params.get('screen');
  if (requestedScreen === 'guide' || requestedScreen === 'about') {
    state.screen = requestedScreen;
  }
  // bp-app.html?neu=fahrt&datum=JJJJ-MM-TT&km=12.3&zweck=… bzw. ?neu=park
  const neu = params.get('neu');
  if (neu === 'fahrt') {
    const km = parseFloat(params.get('km') || '');
    state.editingId = null;
    state.duplicateFahrt = { von: '', nach: '', zweck: (params.get('zweck') || '').slice(0, 80), km: isFinite(km) ? String(km).replace('.', ',') : '' };
    state.prefillFahrtDate = /^\d{4}-\d{2}-\d{2}$/.test(params.get('datum') || '') ? params.get('datum') : null;
    state.screen = 'add-fahrt';
  } else if (neu === 'park') {
    resetAddForm();
    state.screen = 'add-park';
  }
  if (neu) { try { history.replaceState(null, '', location.pathname); } catch (e) {} }
  // Übergabe aus dem Scanner der Startseite: Foto und erkannte Werte ins passende Formular
  const wzH = window.wzScanHandoff && wzScanHandoff(['park', 'beleg']);
  if (wzH) {
    const text = String(wzH.text || '');
    const dateMatch = text.match(/(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})/);
    // Beträge suchen – Datum und Uhrzeit vorher entfernen, damit „02.10.“ nicht als 2,10 € gilt
    const AMT = /\d{1,4}[.,]\d{2}(?!\d)/g;
    const toNum = a => parseFloat(a.replace(',', '.'));
    const clean = text.replace(/\d{1,2}[.\/]\d{1,2}[.\/]\d{2,4}/g, ' ').replace(/\d{1,2}:\d{2}/g, ' ');
    const amounts = (clean.match(AMT) || []).map(toNum).filter(a => a > 0 && a < 10000);
    const lines = clean.split('\n');
    const pickLine = re => { const l = lines.find(x => re.test(x) && AMT.test(x)); AMT.lastIndex = 0; if (!l) return null; const m = l.match(AMT); return m ? toNum(m[m.length - 1]) : null; };
    const withCurrency = pickLine(/€|EUR/i);
    const sumLine = pickLine(/summe|gesamt|total|zu zahlen|endbetrag/i);
    const fmtAmt = n => String(n.toFixed(2)).replace('.', ',');
    let isoDate = null;
    if (dateMatch) {
      let [, d, m, y] = dateMatch;
      if (y.length === 2) y = '20' + y;
      if (+m >= 1 && +m <= 12 && +d >= 1 && +d <= 31) isoDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    if (wzH.t === 'park') {
      resetAddForm();
      state.capturedPhoto = wzH.photo || null;
      if (isoDate) state.ocrDate = isoDate;
      const parkAmt = withCurrency ?? amounts[0];
      if (wzH.betrag) state.ocrBetrag = String(wzH.betrag);
      else if (parkAmt) state.ocrBetrag = fmtAmt(parkAmt);
      if (wzH.titel) state.duplicateOrt = String(wzH.titel).slice(0, 80);
      state.screen = 'add-park';
    } else {
      resetExtraForm();
      state.capturedPhoto = wzH.photo || null;
      const first = (text.split('\n').map(l => l.trim()).find(l => /[A-Za-zÄÖÜäöü]{3}/.test(l)) || '').slice(0, 40);
      // Summenzeile hat Vorrang, sonst der größte Betrag
      const bonAmt = sumLine ?? (amounts.length ? Math.max.apply(null, amounts) : null);
      state.duplicateExtra = { titel: wzH.titel ? String(wzH.titel).slice(0, 60) : first, kategorie: null, betrag: wzH.betrag ? String(wzH.betrag) : (bonAmt ? fmtAmt(bonAmt) : '') };
      state.screen = 'add-extra';
    }
  }
  render();
})();
