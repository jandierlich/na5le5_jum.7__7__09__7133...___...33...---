// WowarWahr – Wo war ich? Reise-Erinnerungskarte
// © 2026 Jan Dierlich – Alle Rechte vorbehalten.
import * as db from './wow-db.js';
import { geo, loadGeo, loadExtra, loadPlus, onGeo, country, countryName, region, regionAt, flagOf, search, describe, countryAt, dist, boundsOf, placesNear, norm, CONTINENTS, CONTINENT_ORDER } from './wow-geo.js';
import { WorldMap, renderMap, fitView, COLORS } from './wow-map.js';
import { computeStats, achievements, tripRoute, routeKm, daysBetween, yearOf, EARTH_KM, visitedRegions } from './wow-stats.js';
import { ZipWriter, readZip } from './wow-zip.js';
import { readExif } from './wow-exif.js';
import { processPhoto, blobURL, dropURL, dataURLToBlob } from './wow-photos.js';
import { renderShareCard, shareBlob } from './wow-share.js';
import { openGlobe } from './wow-globe.js';
import { openCompass } from './wow-compass.js';
import { playFilm, filmSupport, filmDuration } from './wow-film.js';
import { $, $$, esc, icon, fmtDate, fmtRange, fmtMonth, fmtNum, today, stars, toast, progress, openSheet, closeSheet, closeAllSheets, topSheet, actionSheet, confirmDialog, promptDialog, pickFiles } from './wow-ui.js';

const VERSION = '2.5.0';
const TRIP_COLORS = ['#5A2FBE', '#E8765A', '#E3A72F', '#5B7FD6', '#8E6CC9', '#4FA36B'];
const TAGS = [
  { id: 'beach', label: 'Strand', i: 'beach' },
  { id: 'city', label: 'Stadt', i: 'city' },
  { id: 'nature', label: 'Natur', i: 'tree' },
  { id: 'hike', label: 'Wandern', i: 'boot' },
  { id: 'culture', label: 'Kultur', i: 'culture' },
  { id: 'food', label: 'Essen', i: 'food' },
  { id: 'nightlife', label: 'Nachtleben', i: 'night' },
  { id: 'shopping', label: 'Shopping', i: 'bag' },
  { id: 'family', label: 'Familie', i: 'family' },
  { id: 'sport', label: 'Sport', i: 'wave' },
  { id: 'view', label: 'Aussicht', i: 'mountain' },
  { id: 'stay', label: 'Übernachtung', i: 'bed' },
];
const tagOf = id => TAGS.find(t => t.id === id);

const S = {
  trips: [], visits: [], photos: [], countries: [], wishes: [], regions: [], home: null,
  tab: (() => { try { const t = sessionStorage.getItem('wow-tab'); sessionStorage.removeItem('wow-tab'); if (t === 'more') return t; } catch (e) {} return 'home'; })(), year: 'all', layers: { pins: true, routes: true, wish: true },
  map: null, selected: null, picking: null,
};

// ================= Start =================
// System-Textgröße übernehmen, aber in einem Bereich halten, in dem das Layout funktioniert
function applyTextSize() {
  const root = document.documentElement;
  root.style.fontSize = '';
  const fs = parseFloat(getComputedStyle(root).fontSize) || 17;
  const clamped = Math.max(15, Math.min(23, fs));
  if (clamped !== fs) root.style.fontSize = clamped + 'px';
  S.fontScale = clamped / 17;
  if (S.map) S.map.set({ fontScale: S.fontScale });
}

async function init() {
  applyTextSize();
  const reapply = () => { const old = S.fontScale; applyTextSize(); if (old !== S.fontScale && S.map) renderAll(); };
  window.addEventListener('resize', reapply);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) reapply(); });
  const persistent = await db.openDB();
  await loadGeo();
  await loadData();
  buildTabbar();
  initMap();
  renderAll();
  if (hasData()) setTimeout(fitAll, 150);
  onGeo(what => { S.map.redraw(); if (what === 'regions') migrateRegions(); if (what === 'plus' && S.tab === 'map') renderMapUI(); });
  setTimeout(() => { loadExtra(); loadPlus(); }, 300);
  $('#splash').classList.add('gone');
  setTimeout(() => $('#splash')?.remove(), 600);
  if (!persistent) setTimeout(() => toast('Hinweis: Speichern ist in dieser Umgebung nicht möglich – Daten gehen beim Schließen verloren.', 5000), 800);
  // Übergabe von „Hier merken“ auf der Startseite: Ort an der übergebenen Position anlegen
  const wzH = window.wzScanHandoff && window.wzScanHandoff(['ort']);
  if (wzH && isFinite(+wzH.lat) && isFinite(+wzH.lon)) setTimeout(() => openVisitForm(null, { place: describe(+wzH.lat, +wzH.lon) }), 500);
}

async function loadData() {
  [S.trips, S.visits, S.photos, S.countries, S.wishes, S.regions] = await Promise.all(['trips', 'visits', 'photos', 'countries', 'wishes', 'regions'].map(s => db.all(s)));
  S.home = await db.setting('home');
  S.lastBackup = await db.setting('lastBackup');
  S.backupSnooze = await db.setting('backupSnooze');
  S.layers = { ...S.layers, ...(await db.setting('layers', S.layers)) }; delete S.layers.fog;
  S.trips.sort((a, b) => (b.start || '').localeCompare(a.start || ''));
}
async function refresh() { await loadData(); renderAll(); }

// Orte ohne Region nachträglich zuordnen (sobald Regionsdaten geladen sind)
async function migrateRegions() {
  let n = 0;
  for (const v of S.visits) {
    if (v.rid !== undefined && v.rid !== null) continue;
    if (!v.cid || !geo.regionsOf.has(v.cid)) continue;
    const r = regionAt(v.lat, v.lon, v.cid);
    if (r) { v.rid = r.id; if (!v.region) v.region = r.n; await db.put('visits', v); n++; }
  }
  if (n) await refresh(); else renderAll();
}
function assignRegion(v) {
  if (!v.cid || !geo.regionsOf.has(v.cid)) return;
  const r = regionAt(v.lat, v.lon, v.cid);
  v.rid = r ? r.id : null;
  if (r) v.region = r.n;
}

const tripById = id => S.trips.find(t => t.id === id);
const visitsOfTrip = id => S.visits.filter(v => v.tripId === id).sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.created || 0) - (b.created || 0));
const photosOfTrip = id => S.photos.filter(p => p.tripId === id).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
const photosOfVisit = id => S.photos.filter(p => p.visitId === id).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
const tripCountries = id => [...new Set(visitsOfTrip(id).map(v => v.cid).filter(Boolean))];
const countryRec = id => S.countries.find(c => c.id === id) || { id, visited: false, wish: false };
const thumbURL = p => p ? blobURL(p.id + ':t', p.thumb || p.blob) : '';
const fullURL = p => p ? blobURL(p.id, p.blob) : '';
const years = () => [...new Set([...S.trips.map(t => yearOf(t.start)), ...S.visits.map(v => yearOf(v.date))].filter(Boolean))].sort().reverse();
const dataBundle = () => ({ trips: S.trips, visits: S.visits, photos: S.photos, countries: S.countries, regions: S.regions, wishes: S.wishes.map(w => ({ ...w, done: wishDone(w) })), home: S.home });
const hasData = () => S.trips.length || S.visits.length || S.countries.some(c => c.visited);

function wishDone(w) { return S.visits.some(v => dist(v, w) < 25); }

// ================= Startseite =================
// Von überall zurück: jeder Knopf mit data-home schließt alles und öffnet die Startseite
function goHome() {
  for (const sel of ['.gl-x', '.cp-x', '.fm-x', '.rv-x', '#vw-x']) $$(sel).forEach(b => b.click());
  $$('.actions .cancel').forEach(b => b.click());
  if (S.picking) $('#pk-no')?.click();
  closeAllSheets();
  switchTab('home');
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-home]'); if (!b) return;
  e.preventDefault(); e.stopPropagation(); goHome();
}, true);

const greeting = () => { const h = new Date().getHours(); return h < 5 ? 'Gute Nacht' : h < 11 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend'; };
// „Heute vor … Jahren“: Besuche rund um das heutige Datum aus früheren Jahren
function memoryToday() {
  const now = new Date(), y = now.getFullYear();
  const hits = [];
  for (const v of S.visits) {
    if (!v.date || +v.date.slice(0, 4) >= y) continue;
    const d = new Date(`${y}-${v.date.slice(5, 10)}T12:00`); if (isNaN(d)) continue;
    const diff = Math.abs(d - now) / 864e5;
    if (diff <= 3.5) hits.push({ v, diff, years: y - +v.date.slice(0, 4) });
  }
  return hits.sort((a, b) => a.diff - b.diff || a.years - b.years)[0] || null;
}
function renderHome() {
  const el = $('#view-home');
  const st = computeStats(dataBundle());
  const any = hasData();
  const last = [...S.trips].filter(t => t.start && t.start <= today()).sort((a, b) => b.start.localeCompare(a.start))[0] || S.trips[0];
  const next = [...S.trips].filter(t => t.start && t.start > today()).sort((a, b) => a.start.localeCompare(b.start))[0];
  const mem = memoryToday();
  const memPh = mem ? photosOfVisit(mem.v.id)[0] : null;
  const wc = S.countries.filter(c => c.wish && !st.visited.has(c.id)).map(c => ({ flag: flagOf(c.id), name: countryName(c.id), c: c.id }));
  const wp = S.wishes.filter(w => !wishDone(w)).map(w => ({ flag: flagOf(w.cid), name: w.name, w: w.id }));
  const wishes = [...wp, ...wc].slice(0, 3);
  const tiles = [['h-visit', 'pin', 'Ort eintragen'], ['h-trip', 'trips', 'Neue Reise'], ['h-photos', 'photo', 'Aus Fotos'],
    ['h-map', 'map', 'Weltkarte'], ['h-globe', 'orbit', '3D-Globus'], ['h-compass', 'compass', 'Kompass'],
    ['h-film', 'film', 'Reisefilm'], ['h-all', 'list', 'Alle Orte'], ['h-wish', 'star', 'Wünsche']];
  el.innerHTML = `
    <header class="home-head"><a class="round hh-home" href="./index.html#unterwegs" aria-label="Zur WahrZentrale">${icon('home')}</a><div class="hh-txt"><small>${greeting()}</small><h1>Wo war ich?</h1></div><span class="hh-act"><button class="round accent" id="h-add" aria-label="Hinzufügen">${icon('plus')}</button></span></header>
    ${backupBanner()}
    ${any ? `<button class="home-hero" id="h-hero" aria-label="Weltkarte öffnen">
      <canvas id="h-mini" aria-hidden="true"></canvas>
      <div class="hh-info">
        <div><b>${st.un.length}</b><small>von 195 Staaten</small></div>
        <div><b>${fmtNum(S.visits.length)}</b><small>${S.visits.length === 1 ? 'Ort' : 'Orte'}</small></div>
        <div><b>${fmtNum(st.pct, 1)} %</b><small>der Landfläche</small></div>
      </div></button>` : `<div class="card home-welcome"><div class="cp-ic">${icon('globe')}</div><h3>Willkommen bei WowarWahr</h3>
      <p>Sammle deine Reisen auf der Weltkarte – mit Orten, Fotos und Erinnerungen. Alles bleibt privat auf deinem Smartphone.</p>
      <div class="btn-col"><button class="btn primary" id="h-w-visit">${icon('pin')}Ersten Ort eintragen</button><button class="btn" id="h-w-check">${icon('list')}Länder abhaken</button><button class="btn" id="h-w-demo">${icon('spark')}Beispielreisen ansehen</button></div></div>`}
    ${mem ? `<button class="card mem-card" data-visit="${mem.v.id}">${memPh ? `<img src="${thumbURL(memPh)}" alt="">` : `<span class="mem-flag">${flagOf(mem.v.cid)}</span>`}
      <span class="grow"><small class="mem-k">${mem.diff < 0.6 ? 'Heute' : 'Um diese Zeit'} vor ${mem.years} ${mem.years === 1 ? 'Jahr' : 'Jahren'}</small><b>${esc(mem.v.name)}</b><small>${[countryName(mem.v.cid), fmtDate(mem.v.date)].filter(Boolean).map(esc).join(' · ')}</small></span>${icon('chev', 'chev')}</button>` : ''}
    ${next ? `<h4 class="sec">Nächste Reise</h4>${tripCard(next)}` : ''}
    ${last ? `<h4 class="sec">Zuletzt unterwegs</h4>${tripCard(last)}` : ''}
    <h4 class="sec">Entdecken</h4>
    <div class="home-grid">${tiles.map(([id, ic, l]) => `<button id="${id}">${icon(ic)}<span>${l}</span></button>`).join('')}</div>
    ${wishes.length ? `<div class="sec-h"><h4 class="sec">Wunschziele</h4><button class="link" id="h-wish-all">Alle</button></div>
      <div class="list">${wishes.map(w => `<button class="row" ${w.w ? `data-wopen="${w.w}"` : `data-copen="${w.c}"`}><span class="lead flag">${w.flag}</span><span class="grow">${esc(w.name)}</span>${icon('chev', 'chev')}</button>`).join('')}</div>` : ''}
    <div class="spacer"></div>`;
  bindRows(el); bindBackupBanner(el);
  $$('[data-wopen]', el).forEach(b => b.onclick = () => openWishPlace(b.dataset.wopen));
  const on = (id, f) => { const b = $('#' + id, el); if (b) b.onclick = f; };
  on('h-add', addMenu); on('h-hero', () => switchTab('map'));
  on('h-w-visit', () => openVisitForm()); on('h-w-check', openChecklist); on('h-w-demo', loadDemo);
  on('h-visit', () => openVisitForm()); on('h-trip', () => openTripForm()); on('h-photos', () => importPhotos());
  on('h-map', () => switchTab('map')); on('h-globe', showGlobe); on('h-compass', showCompass);
  on('h-film', () => openFilmStart()); on('h-all', () => openAllVisits()); on('h-wish', () => switchTab('wish')); on('h-wish-all', () => switchTab('wish'));
  const cv = $('#h-mini', el);
  if (cv) requestAnimationFrame(() => {
    const r = cv.getBoundingClientRect(); if (!r.width) return;
    const dpr = Math.min(3, devicePixelRatio || 1); cv.width = r.width * dpr; cv.height = r.height * dpr;
    const c = cv.getContext('2d'); c.scale(dpr, dpr);
    const { vis, wish } = mapSets('all');
    renderMap(c, r.width, r.height, fitView(r.width, r.height, [-168, -52, 190, 76], 4), { visited: vis, wish, pins: S.visits.map(v => ({ lat: v.lat, lon: v.lon, color: v.tripId ? (tripById(v.tripId)?.color || COLORS.pin) : COLORS.pin })), pinSize: 3.5, cluster: false, labels: false, cities: false, home: null, detail: false });
  });
}

// ================= Tabs =================
const TABS = [['home', 'Start', 'start'], ['map', 'Karte', 'map'], ['trips', 'Reisen', 'trips'], ['stats', 'Statistik', 'stats'], ['wish', 'Wünsche', 'star'], ['more', 'Mehr', 'more']];
function buildTabbar() {
  $('#tabbar').innerHTML = TABS.map(([id, label, ic]) => `<button data-tab="${id}" aria-label="${label}">${icon(ic)}<span>${label}</span></button>`).join('');
  $$('#tabbar button').forEach(b => b.onclick = () => switchTab(b.dataset.tab));
}
function switchTab(t) {
  S.tab = t;
  $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + t));
  $$('#tabbar button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  if (t === 'map') S.map && S.map.resize();
  const v = $('#view-' + t); if (v && t !== 'map') v.scrollTop = 0;
  renderTab(t);
}
function renderAll() { renderMapLayers(); renderTab(S.tab); switchTabClasses(); $('#tabbar [data-tab=more]')?.classList.toggle('badge', !!backupDue()); }
function switchTabClasses() {
  $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + S.tab));
  $$('#tabbar button').forEach(b => b.classList.toggle('on', b.dataset.tab === S.tab));
}
function renderTab(t) {
  if (t === 'home') renderHome();
  if (t === 'map') renderMapUI();
  if (t === 'trips') renderTrips();
  if (t === 'stats') renderStats();
  if (t === 'wish') renderWish();
  if (t === 'more') renderMore();
}

// ================= Karte =================
function initMap() {
  S.map = new WorldMap($('#map'), {
    onTap: e => {
      if (S.picking) return;
      if (e.hit) {
        if (e.hit.home) return toast(`Heimatort: ${S.home.name}`);
        if (e.hit.city) return tapCity(e.hit.city);
        const items = e.hit.items;
        if (items.length === 1) return items[0].visitId ? openVisit(items[0].visitId) : openWishPlace(items[0].wishId);
        return S.map.flyTo(boundsOf(items, 0.3), 70, 60000);
      }
      const c = countryAt(e.lat, e.lon);
      if (c) { S.selected = c.id; S.map.set({ selected: c.id }); openCountry(c.id); }
    },
  });
}

// Stadt auf der Karte angetippt: gleiche Detailansicht wie bei der Suche, direkt speicherbar
function tapCity(p) {
  const rg = geo.regionsOf.has(p.cid) ? regionAt(p.lat, p.lon, p.cid) : null;
  openSearchPlace({ name: p.name, lat: p.lat, lon: p.lon, cid: p.cid, region: rg ? rg.n : (p.region || ''), rid: rg ? rg.id : null, cap: p.cap });
}

function mapSets(year = S.year) {
  const vis = new Set();
  const yr = year === 'all' ? null : year;
  const tripsIn = new Set(S.trips.filter(t => !yr || yearOf(t.start) === yr || yearOf(t.end) === yr).map(t => t.id));
  const V = S.visits.filter(v => !yr || yearOf(v.date) === yr || (v.tripId && tripsIn.has(v.tripId)));
  for (const v of V) if (v.cid) vis.add(v.cid);
  if (!yr) for (const c of S.countries) if (c.visited) vis.add(c.id);
  const wish = new Set(S.countries.filter(c => c.wish && !vis.has(c.id)).map(c => c.id));
  const trips = S.trips.filter(t => tripsIn.has(t.id));
  const vReg = visitedRegions(V, yr ? [] : S.regions);
  const regC = new Set([...vReg].map(id => region(id)?.c).filter(Boolean));
  return { vis, wish, V, trips, vReg, regC };
}

function renderMapLayers() {
  if (!S.map) return;
  const { vis, wish, V, trips, vReg, regC } = mapSets();
  const pins = S.layers.pins ? V.map(v => ({ lat: v.lat, lon: v.lon, cid: v.cid, visitId: v.id, name: v.name, color: v.tripId ? (tripById(v.tripId)?.color || COLORS.pin) : COLORS.pin })) : [];
  if (S.layers.wish) for (const w of S.wishes) if (!wishDone(w)) pins.push({ lat: w.lat, lon: w.lon, wishId: w.id, name: w.name, color: '#E3A72F' });
  const routes = S.layers.routes ? trips.map(t => ({ points: tripRoute(t, S.visits, null), color: t.color || COLORS.route })).filter(r => r.points.length > 1) : [];
  S.map.set({ fontScale: S.fontScale || 1, visited: vis, visitedRegions: vReg, regionCountries: regC, wish: S.layers.wish ? wish : new Set(), pins, routes, home: S.home, selected: S.selected });
}

function renderMapUI() {
  const { vis } = mapSets();
  const st = computeStats(dataBundle());
  const unCount = [...vis].filter(id => country(id)?.un).length;
  const ys = years();
  $('#map-top').innerHTML = `
    <div class="map-head">
      <div class="map-left"><div class="brand-chip">${icon('globe')}<div><b>WowarWahr</b><small>${S.year === 'all' ? `${unCount} von 195 Staaten · ${fmtNum(st.pct, 1)} % der Landfläche` : `${S.year}: ${unCount} Staaten besucht`}</small></div></div>
      ${ys.length ? `<button class="year-pill ${S.year === 'all' ? '' : 'on'}" id="year-pill" aria-label="Jahr wählen">${icon('calendar')}<span>${S.year === 'all' ? 'Alle Jahre' : S.year}</span>${S.year === 'all' ? '' : '<i aria-hidden="true">' + icon('close', 'em') + '</i>'}</button>` : ''}</div>
      <div class="map-btns">
        <button class="round" id="btn-search" aria-label="Stadt oder Land suchen">${icon('search')}</button>
        <button class="round" id="btn-layers" aria-label="Ebenen">${icon('layers')}</button>
        <button class="round" id="btn-check" aria-label="Länder abhaken">${icon('list')}</button>
        <button class="round" id="btn-fit" aria-label="Alle Orte zeigen">${icon('locate')}</button>
        <button class="round" id="btn-globe" aria-label="3D-Globus">${icon('orbit')}</button>
        ${S.visits.length ? `<button class="round" id="btn-compass" aria-label="Sehnsuchts-Kompass">${icon('compass')}</button>` : ''}
      </div>
    </div>
`;
  $('#btn-search').onclick = openMapSearch;
  $('#btn-layers').onclick = openLayers;
  $('#btn-check').onclick = openChecklist;
  $('#btn-fit').onclick = fitAll;
  $('#btn-globe').onclick = showGlobe;
  if ($('#btn-compass')) $('#btn-compass').onclick = showCompass;
  if ($('#year-pill')) $('#year-pill').onclick = e => {
    const setYear = y => { S.year = y; renderMapLayers(); renderMapUI(); if (y !== 'all') fitAll(); };
    if (S.year !== 'all' && e.target.closest('i')) return setYear('all');
    actionSheet('Karte zeigt', [{ label: 'Alle Jahre', icon: 'globe', run: () => setYear('all') }, ...ys.map(y => ({ label: y, icon: 'calendar', run: () => setYear(y) }))]);
  };

  const onb = $('#map-onboard');
  if (!hasData() && !S.picking) {
    onb.hidden = false;
    onb.innerHTML = `<h3>Wo warst du schon überall?</h3>
      <p>Sammle deine Reisen auf der Weltkarte – mit Orten, Fotos und Erinnerungen. Tippe beim Heranzoomen einfach auf eine Stadt, um sie direkt zu speichern. Alles bleibt privat auf deinem Smartphone.</p>
      <div class="onb-grid">
        <button data-a="check">${icon('list')}<span>Länder abhaken</span></button>
        <button data-a="trip">${icon('trips')}<span>Reise anlegen</span></button>
        <button data-a="photos">${icon('photo')}<span>Aus Fotos</span></button>
        <button data-a="home">${icon('home')}<span>Heimatort</span></button>
      </div>
      <button class="link" data-a="demo">Beispielreisen ansehen</button>`;
    onb.querySelector('[data-a=check]').onclick = openChecklist;
    onb.querySelector('[data-a=trip]').onclick = () => openTripForm();
    onb.querySelector('[data-a=photos]').onclick = () => importPhotos();
    onb.querySelector('[data-a=home]').onclick = setHome;
    onb.querySelector('[data-a=demo]').onclick = loadDemo;
  } else onb.hidden = true;
}

function fitAll() {
  const { V } = mapSets();
  const pts = V.map(v => ({ lat: v.lat, lon: v.lon }));
  if (S.home && S.year === 'all') pts.push(S.home);
  if (!pts.length) return S.map.flyTo([-180, -56, 180, 76], 8);
  S.map.flyTo(boundsOf(pts, 6), 60);
}

function openLayers() {
  const L = S.layers;
  const sh = openSheet({ title: 'Kartenebenen', html: `
    <div class="list">
      ${[['pins', 'Orte als Punkte', 'pin'], ['routes', 'Reiserouten', 'trips'], ['wish', 'Wunschziele', 'star']].map(([k, l, ic, sub]) => `
      <label class="row">${icon(ic, 'lead')}<span class="grow">${l}${sub ? `<small>${sub}</small>` : ''}</span><input type="checkbox" class="switch" data-k="${k}" ${L[k] ? 'checked' : ''}></label>`).join('')}
    </div>
    <div class="legend">
      <span><i style="background:${COLORS.visited}"></i>Besucht</span>
      <span><i style="background:${COLORS.wish};outline:1.5px dashed ${COLORS.wishStroke}"></i>Wunschland</span>
      <span><i class="dot" style="background:${COLORS.pin}"></i>Ort</span>
      <span><i class="dot" style="background:#E3A72F"></i>Wunschort</span>
      <span><i class="dot" style="background:${COLORS.home}"></i>Heimat</span>
    </div>
    <p class="fine">Beim Heranzoomen erscheinen Regionen (z. B. Bundesländer), Flüsse, Seen und Städte. Besuchte Regionen werden kräftig, der Rest des Landes hell eingefärbt.</p>
    <p class="fine">Kartengrundlage: Natural Earth (gemeinfrei). Ortsnamen: Natural Earth und GeoNames (CC BY 4.0). Grenzverläufe ohne politische Wertung.</p>` });
  $$('input[data-k]', sh).forEach(i => i.onchange = async () => {
    S.layers[i.dataset.k] = i.checked; await db.setSetting('layers', S.layers); renderMapLayers(); renderMapUI();
  });
}

// ================= Reisefilm =================
// Stationen zusammenstellen: im Jahresmodus je Reise eine Station, für eine einzelne Reise je Ort eine Station
function filmStations({ year = 'all', tripId = null } = {}) {
  const st = [];
  if (tripId) {
    const t = tripById(tripId); if (!t) return st;
    let prev = S.home || null;
    for (const v of visitsOfTrip(tripId)) {
      const ph = photosOfVisit(v.id);
      st.push({ key: v.id, date: v.date || t.start || '', title: v.name, sub: [v.region, countryName(v.cid)].filter(Boolean).join(', '),
        year: v.date ? fmtDate(v.date, false) : '', color: t.color || COLORS.pin, visits: [v], leg: prev ? [prev, v] : [], photos: ph, photoIdx: ph.length ? 0 : -1, on: true });
      prev = v;
    }
    return st;
  }
  const yr = year === 'all' ? null : year;
  for (const t of S.trips.filter(t => !yr || yearOf(t.start) === yr || yearOf(t.end) === yr)) {
    const vs = visitsOfTrip(t.id); if (!vs.length) continue;
    const ph = photosOfTrip(t.id);
    st.push({ key: t.id, trip: t, date: t.start || vs[0].date || '', title: t.title || 'Reise', sub: fmtRange(t.start, t.end), year: yearOf(t.start) || '', color: t.color || COLORS.pin,
      visits: vs, photos: ph, photoIdx: ph.length ? Math.floor(ph.length / 2) : -1, on: true });
  }
  const byYear = new Map();
  for (const v of S.visits.filter(v => !v.tripId && (!yr || yearOf(v.date) === yr))) { const k = yearOf(v.date) || ''; if (!byYear.has(k)) byYear.set(k, []); byYear.get(k).push(v); }
  for (const [y, vs] of byYear) {
    vs.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const ph = vs.flatMap(v => photosOfVisit(v.id));
    st.push({ key: 'loose-' + y, date: y ? vs[0].date : '9999', title: vs.length === 1 ? vs[0].name : 'Einzelne Orte', sub: vs.length === 1 ? countryName(vs[0].cid) : `${vs.length} Orte ohne Reise${y ? ' · ' + y : ''}`,
      year: y, color: COLORS.pin, visits: vs, photos: ph, photoIdx: ph.length ? 0 : -1, on: true });
  }
  return st.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
}
function filmEvents(stations, { homeRoutes = true, tripMode = false } = {}) {
  return stations.filter(s => s.on).map(s => {
    let route, homeRoute;
    if (tripMode) { route = s.leg || []; homeRoute = route.length > 1; }
    else if (s.trip) { route = tripRoute(s.trip, S.visits, homeRoutes ? S.home : null); homeRoute = homeRoutes && !!S.home; }
    else { route = []; homeRoute = false; }
    return { title: s.title, sub: s.sub, year: s.year, color: s.color, visits: s.visits, route, homeRoute, km: routeKm(route), photo: s.photoIdx >= 0 ? s.photos[s.photoIdx]?.blob : null };
  });
}
function openFilmStart({ tripId = null } = {}) {
  const trip = tripId ? tripById(tripId) : null;
  const ys = years();
  let year = 'all', stations = filmStations({ tripId });
  const opts = { photos: true, counters: true, homeRoutes: true, outro: true };
  const defTitle = () => trip ? trip.title : year === 'all' ? 'Meine Reisen' : `Mein Reisejahr ${year}`;
  const defSub = () => {
    if (trip) return fmtRange(trip.start, trip.end);
    const y = stations.filter(s => s.on).map(s => s.year).filter(Boolean).sort();
    return y.length ? (y[0] === y[y.length - 1] ? y[0] : `${y[0]} – ${y[y.length - 1]}`) : '';
  };
  let titleTouched = false, subTouched = false;
  const sh = openSheet({ title: trip ? 'Reisefilm dieser Reise' : 'Reisefilm', full: true, html: `
    <div class="film-hero">${icon('film')}<div><b>${trip ? esc(trip.title) + ' als Film' : 'Deine Reisen als Film'}</b><small>${trip ? 'Die Karte fliegt von Ort zu Ort dieser Reise – mit deinen Fotos.' : 'Die Karte fliegt von Reise zu Reise, Routen zeichnen sich, Länder färben sich ein – mit deinen Fotos.'}</small></div></div>
    <form class="form fs-form" onsubmit="return false">
      <label>Titel im Film<input class="field" id="fs-title" maxlength="40" value="${esc(defTitle())}"></label>
      <label>Untertitel<input class="field" id="fs-sub" maxlength="50" value="${esc(defSub())}"></label>
    </form>
    ${!trip && ys.length > 1 ? `<h4 class="sec">Zeitraum</h4><div class="chips wrap" id="fs-y"><button data-y="all" class="on">Alle Jahre</button>${ys.map(y => `<button data-y="${y}">${y}</button>`).join('')}</div>` : ''}
    <div class="sec-h"><h4 class="sec">${trip ? 'Orte im Film' : 'Stationen im Film'}</h4><span><button class="link" id="fs-all">Alle</button> · <button class="link" id="fs-none">Keine</button></span></div>
    <div class="list" id="fs-list"></div>
    <p class="fine pad">Antippen zum Auswählen. Tippe auf das Bild, um das Foto für diese Station zu wählen.</p>
    <h4 class="sec">Im Film zeigen</h4>
    <div class="list">
      ${[['photos', 'Fotos', 'photo'], ['counters', 'Zähler für Länder, Orte und km', 'stats'], ...(S.home && !trip ? [['homeRoutes', 'Routen ab Heimatort', 'home']] : []), ['outro', 'Abspann mit Gesamtbilanz', 'spark']].map(([k, l, ic]) =>
        `<label class="row">${icon(ic, 'lead')}<span class="grow">${l}</span><input type="checkbox" class="switch" data-o="${k}" checked></label>`).join('')}
    </div>
    <p class="muted pad" id="fs-info"></p>
    <button class="btn primary wide" id="fs-go">${icon('film')}Film starten</button>
    <p class="fine pad">${filmSupport() ? 'Der Film wird beim Abspielen direkt auf deinem Smartphone als Video aufgenommen. Danach kannst du ihn verschicken – z. B. per Nachricht oder über das Teilen-Menü. Bitte bleib während der Aufnahme in der App.' : 'Dieses Gerät kann Filme leider nicht als Video aufnehmen – du kannst den Film aber ansehen.'} Fotos werden nur im Video verwendet, das du selbst teilst.</p>` });
  const listEl = $('#fs-list', sh);
  const drawList = () => {
    listEl.innerHTML = stations.length ? stations.map((s, i) => {
      const ph = s.photoIdx >= 0 ? s.photos[s.photoIdx] : null;
      return `<div class="row fs-row ${s.on ? '' : 'off'}"><input type="checkbox" class="check" data-i="${i}" ${s.on ? 'checked' : ''} aria-label="${esc(s.title)} im Film zeigen">
        <button type="button" class="grow tl" data-t="${i}">${esc(s.title)}<small>${esc(s.sub)}${s.visits.length > 1 ? ` · ${s.visits.length} Orte` : ''}</small></button>
        <button type="button" class="fs-ph" data-p="${i}" aria-label="Foto wählen">${ph ? `<img src="${thumbURL(ph)}" alt="">` : icon('photo')}</button></div>`;
    }).join('') : `<p class="muted pad">${trip ? 'Diese Reise hat noch keine Orte.' : 'Für diesen Zeitraum gibt es noch keine Orte.'}</p>`;
    $$('[data-i]', listEl).forEach(c => c.onchange = () => { stations[+c.dataset.i].on = c.checked; c.closest('.row').classList.toggle('off', !c.checked); info(); });
    $$('[data-t]', listEl).forEach(b => b.onclick = () => { const c = listEl.querySelector(`[data-i="${b.dataset.t}"]`); c.checked = !c.checked; c.onchange(); });
    $$('[data-p]', listEl).forEach(b => b.onclick = () => pickFilmPhoto(stations[+b.dataset.p], drawList));
    info();
  };
  const info = () => {
    const n = stations.filter(s => s.on).length;
    $('#fs-info', sh).textContent = n ? `${n} ${n === 1 ? 'Station' : 'Stationen'} · ca. ${Math.round(filmDuration(n, opts.outro))} Sekunden` : 'Bitte mindestens eine Station auswählen.';
    $('#fs-go', sh).disabled = !n;
    if (!subTouched) $('#fs-sub', sh).value = defSub();
  };
  $('#fs-title', sh).oninput = () => { titleTouched = true; };
  $('#fs-sub', sh).oninput = () => { subTouched = true; };
  $$('#fs-y button', sh).forEach(b => b.onclick = () => {
    year = b.dataset.y; $$('#fs-y button', sh).forEach(x => x.classList.toggle('on', x === b));
    stations = filmStations({ year }); if (!titleTouched) $('#fs-title', sh).value = defTitle(); drawList();
  });
  $('#fs-all', sh).onclick = () => { stations.forEach(s => s.on = true); drawList(); };
  $('#fs-none', sh).onclick = () => { stations.forEach(s => s.on = false); drawList(); };
  $$('[data-o]', sh).forEach(c => c.onchange = () => { opts[c.dataset.o] = c.checked; info(); });
  drawList();
  $('#fs-go', sh).onclick = () => {
    const sel = stations.filter(s => s.on); if (!sel.length) return;
    const events = filmEvents(stations, { homeRoutes: opts.homeRoutes, tripMode: !!trip });
    const vis = new Set(sel.flatMap(s => s.visits.map(v => v.cid)).filter(Boolean));
    if (!trip && year === 'all' && sel.length === stations.length) for (const c of S.countries) if (c.visited) vis.add(c.id);
    const title = $('#fs-title', sh).value.trim() || defTitle(), range = $('#fs-sub', sh).value.trim();
    sh.close();
    playFilm({ events, title, range, finalVisited: vis, home: S.home,
      totals: { countries: vis.size, places: events.reduce((a, e) => a + e.visits.length, 0), km: events.reduce((a, e) => a + e.km, 0) },
      photos: opts.photos, counters: opts.counters, outro: opts.outro,
      outroTitle: trip ? trip.title : 'Meine Welt', outroSub: trip ? fmtRange(trip.start, trip.end) : undefined, record: true });
  };
}
function pickFilmPhoto(station, done) {
  const sh = openSheet({ title: 'Foto für „' + station.title + '“', html: station.photos.length ? `
    <div class="grid fs-grid">${station.photos.map((p, i) => `<button class="gi ${i === station.photoIdx ? 'sel' : ''}" data-k="${i}"><img src="${thumbURL(p)}" alt="" loading="lazy"></button>`).join('')}</div>
    <button class="btn wide" data-k="-1">Kein Foto für diese Station</button>` : `<p class="muted pad">Zu dieser Station gibt es noch keine Fotos. Du kannst sie beim Ort oder bei der Reise hinzufügen.</p>` });
  $$('[data-k]', sh).forEach(b => b.onclick = () => { station.photoIdx = +b.dataset.k; sh.close(); done(); });
}

// ================= Sehnsuchts-Kompass =================
function showCompass() {
  if (!S.visits.length) return toast('Speichere zuerst ein paar Orte');
  openCompass({
    places: S.visits.map(v => {
      const ph = photosOfVisit(v.id)[0];
      return { lat: v.lat, lon: v.lon, name: v.name, cid: v.cid, date: v.date, visitId: v.id, thumb: ph ? thumbURL(ph) : '',
        color: v.tripId ? (tripById(v.tripId)?.color || COLORS.pin) : COLORS.pin };
    }),
    home: S.home, flagOf, countryName, fmtDate: d => fmtDate(d, false), onVisit: id => openVisit(id),
  });
}

// ================= 3D-Globus =================
function showGlobe() {
  const { vis, wish, V } = mapSets();
  const pts = V.map(v => ({ lat: v.lat, lon: v.lon }));
  const center = S.home || (pts.length ? pts[pts.length - 1] : null);
  openGlobe({
    visited: vis, wish: S.layers.wish ? wish : new Set(),
    pins: V.map(v => ({ lat: v.lat, lon: v.lon, name: v.name, cid: v.cid, visitId: v.id, color: v.tripId ? (tripById(v.tripId)?.color || COLORS.pin) : COLORS.pin })),
    home: S.home, center,
    countryName, flagOf, fontScale: S.fontScale || 1,
    onVisit: id => openVisit(id), onCountry: cid => openCountry(cid),
  });
}

// ================= Suche auf der Karte =================
const boxAround = (lat, lon, dLon = 1.6) => [lon - dLon, lat - dLon * 0.65, lon + dLon, lat + dLon * 0.65];
function countryBounds(c) { return c.bb[2] - c.bb[0] > 300 ? [c.lx - 25, c.ly - 15, c.lx + 25, c.ly + 15] : c.bb; }
async function openMapSearch() {
  const p = await choosePlace({ title: 'Suchen', quick: false, mine: true, placeholder: 'Stadt, Land oder eigener Ort' });
  if (!p) return;
  if (S.tab !== 'map') switchTab('map');
  if (p.regionId) {
    const r = region(p.regionId);
    if (r) S.map.flyTo(r.bb, 40);
    S.selected = p.cid; S.map.set({ selected: p.cid });
    return openCountry(p.cid);
  }
  if (p.visitId) { S.map.flyTo(boxAround(p.lat, p.lon, 0.6), 60); return openVisit(p.visitId); }
  if (p.isCountry) {
    const c = country(p.cid);
    S.map.flyTo(countryBounds(c), 40);
    S.selected = c.id; S.map.set({ selected: c.id });
    return openCountry(c.id);
  }
  openSearchPlace(p);
}
function openSearchPlace(p) {
  S.map.flyTo(boxAround(p.lat, p.lon), 40);
  S.map.set({ mark: { lat: p.lat, lon: p.lon } });
  const c = country(p.cid);
  const mine = S.visits.filter(v => dist(v, p) < 15);
  const sh = openSheet({ title: p.name, onClose: () => S.map.set({ mark: null }), html: `
    <div class="visit-head"><span class="flag-l">${flagOf(p.cid)}</span><div><b>${esc(p.name)}</b><small>${[p.cap ? 'Hauptstadt' : '', p.region, countryName(p.cid)].filter(Boolean).map(esc).join(' · ')}</small></div></div>
    ${mine.length ? `<h4 class="sec">Deine Orte in der Nähe</h4><div class="list">${mine.map(visitRow).join('')}</div>` : ''}
    <div class="list">
      <button class="row" id="sp-visit">${icon('plus', 'lead')}<span class="grow">Hier war ich – als Ort eintragen</span>${icon('chev', 'chev')}</button>
      <button class="row" id="sp-wish">${icon('star', 'lead')}<span class="grow">Als Wunschziel merken</span>${icon('chev', 'chev')}</button>
      ${c ? `<button class="row" id="sp-country"><span class="lead flag">${c.flag}</span><span class="grow">${esc(c.de)} öffnen<small>Land abhaken, Regionen, Wunschland</small></span>${icon('chev', 'chev')}</button>` : ''}
    </div>` });
  const place = { name: p.name, lat: p.lat, lon: p.lon, cid: p.cid, region: p.region || '', rid: p.rid ?? null, cap: !!p.cap };
  $('#sp-visit', sh).onclick = () => { sh.close(); openVisitForm(null, { place }); };
  $('#sp-wish', sh).onclick = async () => {
    if (S.wishes.some(w => dist(w, p) < 5)) { toast(`${p.name} ist schon auf der Wunschliste`); return; }
    await db.put('wishes', { id: db.uid(), ...place, note: '', prio: 0, created: Date.now() });
    sh.close(); await refresh(); toast(`${p.name} auf der Wunschliste`);
  };
  if (c) $('#sp-country', sh).onclick = () => { sh.close(); S.map.flyTo(countryBounds(c), 40); S.selected = c.id; S.map.set({ selected: c.id }); openCountry(c.id); };
  bindRows(sh);
}

// ================= Land =================
function openCountry(cid) {
  const c = country(cid); if (!c) return;
  const rec = countryRec(cid);
  const vs = S.visits.filter(v => v.cid === cid).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const viaVisit = vs.length > 0;
  const trips = [...new Set(vs.map(v => v.tripId).filter(Boolean))].map(tripById).filter(Boolean);
  const sh = openSheet({
    title: c.de, onClose: () => { S.selected = null; S.map.set({ selected: null }); },
    html: `
    <div class="country-hero"><span class="flag-xl">${c.flag}</span>
      <div><div class="muted">${CONTINENTS[c.k]}${c.un ? '' : ' · Gebiet'}</div>
      <div class="muted small">${fmtNum(c.area)} km² · ${fmtNum(c.pop / 1e6, c.pop < 1e6 ? 2 : 1)} Mio. Einw.</div></div></div>
    <div class="list">
      <label class="row">${icon('check', 'lead')}<span class="grow">Besucht${viaVisit ? '<small>durch deine Orte</small>' : ''}</span>
        <input type="checkbox" class="switch" id="c-vis" ${rec.visited || viaVisit ? 'checked' : ''} ${viaVisit ? 'disabled' : ''}></label>
      <label class="row">${icon('star', 'lead')}<span class="grow">Wunschziel</span><input type="checkbox" class="switch" id="c-wish" ${rec.wish ? 'checked' : ''}></label>
    </div>
    ${regionBlock(cid)}
    ${vs.length ? `<h4 class="sec">Deine Orte hier</h4><div class="list">${vs.map(visitRow).join('')}</div>` : ''}
    ${trips.length ? `<h4 class="sec">Reisen</h4><div class="list">${trips.map(t => `<button class="row" data-trip="${t.id}"><span class="lead dotc" style="background:${t.color}"></span><span class="grow">${esc(t.title)}<small>${fmtRange(t.start, t.end)}</small></span>${icon('chev', 'chev')}</button>`).join('')}</div>` : ''}
    <div class="btn-row">
      <button class="btn primary" id="c-add">${icon('plus')}Ort in ${esc(c.de)}</button>
      <button class="btn" id="c-zoom">${icon('locate')}Heranzoomen</button>
    </div>` });
  sh.dataset.kind = 'country';
  $('#c-vis', sh).onchange = async e => { await db.put('countries', { ...countryRec(cid), visited: e.target.checked }); showAllYears(); await refresh(); };
  $('#c-wish', sh).onchange = async e => { await db.put('countries', { ...countryRec(cid), wish: e.target.checked }); await refresh(); };
  $('#c-add', sh).onclick = () => openVisitForm(null, { countryFilter: cid });
  $('#c-zoom', sh).onclick = () => { sh.close(); S.map.flyTo(countryBounds(c), 40); };
  if ($('#c-reg', sh)) $('#c-reg', sh).onclick = () => openRegionChecklist(cid);
  bindRows(sh);
}

function regionWord(cid, plural = true) {
  const m = { DE: ['Bundesland', 'Bundesländer'], AT: ['Bundesland', 'Bundesländer'], US: ['Bundesstaat', 'Bundesstaaten'], CH: ['Kanton', 'Kantone'],
    AU: ['Bundesstaat', 'Bundesstaaten'], CA: ['Provinz', 'Provinzen'], IT: ['Provinz', 'Provinzen'], ES: ['Provinz', 'Provinzen'], FR: ['Département', 'Départements'], JP: ['Präfektur', 'Präfekturen'] };
  return (m[cid] || ['Region', 'Regionen'])[plural ? 1 : 0];
}
function regionBlock(cid) {
  const list = geo.regionsOf.get(cid);
  if (!list || list.length < 2) return '';
  const vReg = visitedRegions(S.visits, S.regions);
  const done = list.filter(r => vReg.has(r.id)).length;
  return `<h4 class="sec">${regionWord(cid)}</h4>
    <button class="row card-row" id="c-reg">${icon('list', 'lead')}<span class="grow">${done} von ${list.length} besucht
      <span class="pbar sm"><i style="width:${done / list.length * 100}%"></i></span></span>${icon('chev', 'chev')}</button>`;
}
function openRegionChecklist(cid) {
  const list = geo.regionsOf.get(cid) || [];
  const via = new Set(S.visits.filter(v => v.cid === cid && v.rid).map(v => v.rid));
  const sh = openSheet({ title: `${regionWord(cid)} · ${countryName(cid)}`, full: true, onClose: () => { renderAll(); setTimeout(() => refreshTopCountry(cid), 0); }, html: `
    <div class="searchbar">${icon('search')}<input id="rl-q" placeholder="Suchen" autocomplete="off"></div>
    <div id="rl-count" class="muted small pad"></div><div class="list" id="rl-list"></div>
    <p class="fine pad">Grenzen: Natural Earth (gemeinfrei). Orte werden automatisch ihrer ${regionWord(cid, false)} zugeordnet.</p>` });
  const draw = q => {
    const n = (q || '').toLowerCase();
    const man = new Set(S.regions.filter(r => r.visited).map(r => r.id));
    const cnt = list.filter(r => via.has(r.id) || man.has(r.id)).length;
    $('#rl-count', sh).textContent = `${cnt} von ${list.length} ${regionWord(cid)} besucht`;
    $('#rl-list', sh).innerHTML = list.filter(r => !n || r.n.toLowerCase().includes(n)).map(r => `
      <label class="row"><span class="grow">${esc(r.n)}<small>${esc(r.t)}${via.has(r.id) ? ' · durch deine Orte' : ''}</small></span>
      <input type="checkbox" class="check" data-r="${r.id}" ${via.has(r.id) || man.has(r.id) ? 'checked' : ''} ${via.has(r.id) ? 'disabled' : ''}></label>`).join('');
    $$('input[data-r]', sh).forEach(i => i.onchange = async () => {
      await db.put('regions', { id: i.dataset.r, cid, visited: i.checked });
      if (i.checked && !countryRec(cid).visited && !S.visits.some(v => v.cid === cid)) await db.put('countries', { ...countryRec(cid), visited: true });
      showAllYears();
      await loadData(); renderMapLayers(); draw($('#rl-q', sh).value);
    });
  };
  $('#rl-q', sh).oninput = e => draw(e.target.value);
  draw('');
}
function refreshTopCountry(cid) {
  const sh = topSheet();
  if (sh && sh.dataset.kind === 'country') { sh.close(); openCountry(cid); }
}

function visitRow(v) {
  const ph = photosOfVisit(v.id)[0];
  const tagIcons = (v.tags || []).map(id => tagOf(id)?.i).filter(Boolean).map(n => icon(n, 'em')).join(' ');
  return `<button class="row" data-visit="${v.id}">
    ${ph ? `<img class="lead thumb" src="${thumbURL(ph)}" alt="">` : `<span class="lead flag">${flagOf(v.cid)}</span>`}
    <span class="grow">${esc(v.name)}<small>${[v.date ? fmtDate(v.date, false) : '', v.region].filter(Boolean).map(esc).join(' · ')}${tagIcons ? `${v.date || v.region ? ' · ' : ''}<span class="tagics">${tagIcons}</span>` : ''}</small></span>
    ${v.rating ? stars(v.rating, 'sm') : ''}${icon('chev', 'chev')}</button>`;
}
function bindRows(root) {
  $$('[data-visit]', root).forEach(b => b.onclick = () => openVisit(b.dataset.visit));
  $$('[data-trip]', root).forEach(b => b.onclick = () => openTrip(b.dataset.trip));
  $$('[data-copen]', root).forEach(b => b.onclick = () => openCountry(b.dataset.copen));
}

// ================= Alle Orte =================
function openAllVisits({ onlyCapitals = false, tag = null } = {}) {
  let sort = 'date', activeTag = tag;
  const base = onlyCapitals ? S.visits.filter(v => v.cap) : S.visits;
  const usedTags = TAGS.filter(t => S.visits.some(v => v.tags?.includes(t.id)));
  const sh = openSheet({ title: onlyCapitals ? 'Besuchte Hauptstädte' : 'Alle Orte', full: true, html: `
    <div class="searchbar">${icon('search')}<input id="av-q" type="search" placeholder="${onlyCapitals ? 'Hauptstadt oder Land suchen' : 'Ort oder Land suchen'}" autocomplete="off" enterkeyhint="search"></div>
    <div class="chips" id="av-sort">
      <button data-s="date" class="on">Datum</button>
      <button data-s="name">Name</button>
      <button data-s="country">Land</button>
    </div>
    ${usedTags.length ? `<div class="chips wrap" id="av-tags">${usedTags.map(t => `<button data-t="${t.id}" class="${activeTag === t.id ? 'on' : ''}">${icon(t.i, 'em')} ${t.label}</button>`).join('')}</div>` : ''}
    <div class="list" id="av-list"></div>
    <p class="fine pad" id="av-count"></p>` });
  const draw = () => {
    const q = norm($('#av-q', sh).value);
    let vs = base.filter(v => (!activeTag || v.tags?.includes(activeTag)) && (!q || norm(v.name).includes(q) || norm(countryName(v.cid)).includes(q) || norm(v.region || '').includes(q)));
    vs = vs.slice().sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'de');
      if (sort === 'country') return countryName(a.cid).localeCompare(countryName(b.cid), 'de') || (b.date || '').localeCompare(a.date || '');
      return (b.date || '').localeCompare(a.date || '') || (b.created || 0) - (a.created || 0);
    });
    $('#av-list', sh).innerHTML = vs.length ? vs.map(visitRow).join('') : `<p class="muted pad">${onlyCapitals ? 'Keine Hauptstädte gefunden.' : 'Keine Orte gefunden.'}</p>`;
    bindRows(sh);
    const total = activeTag ? base.filter(v => v.tags?.includes(activeTag)).length : base.length;
    $('#av-count', sh).textContent = `${vs.length} von ${total} ${total === 1 ? (onlyCapitals ? 'Hauptstadt' : 'Ort') : (onlyCapitals ? 'Hauptstädten' : 'Orten')}`;
  };
  $('#av-q', sh).oninput = draw;
  $$('#av-sort button', sh).forEach(b => b.onclick = () => { sort = b.dataset.s; $$('#av-sort button', sh).forEach(x => x.classList.toggle('on', x === b)); draw(); });
  if ($('#av-tags', sh)) $$('#av-tags button', sh).forEach(b => b.onclick = () => {
    activeTag = activeTag === b.dataset.t ? null : b.dataset.t;
    $$('#av-tags button', sh).forEach(x => x.classList.toggle('on', x.dataset.t === activeTag));
    draw();
  });
  draw();
}

// Manuell abgehakte Länder haben kein Jahr – beim Abhaken daher auf „Alle Jahre“ wechseln, damit sie sichtbar sind
function showAllYears() {
  if (S.year === 'all') return;
  S.year = 'all'; toast('Karte zeigt wieder alle Jahre');
}

// ================= Länder abhaken =================
function openChecklist() {
  let q = '', k = 'EU';
  const viaVisits = new Set(S.visits.map(v => v.cid));
  const sh = openSheet({ title: 'Länder abhaken', full: true, onClose: () => renderAll(), html: `
    <div class="searchbar">${icon('search')}<input id="cl-q" placeholder="Land suchen" autocomplete="off"></div>
    <div class="chips" id="cl-k">${CONTINENT_ORDER.map(x => `<button data-k="${x}" class="${x === k ? 'on' : ''}">${CONTINENTS[x]}</button>`).join('')}</div>
    <div id="cl-count" class="muted small pad"></div>
    <div class="list" id="cl-list"></div>` });
  const draw = () => {
    const n = q.toLowerCase();
    const list = geo.world.filter(c => q ? (c.de.toLowerCase().includes(n) || c.en.toLowerCase().includes(n)) : c.k === k)
      .sort((a, b) => b.un - a.un || a.de.localeCompare(b.de, 'de'));
    const cnt = geo.world.filter(c => c.k === k && c.un && (countryRec(c.id).visited || viaVisits.has(c.id))).length;
    const tot = geo.world.filter(c => c.k === k && c.un).length;
    $('#cl-count', sh).textContent = q ? `${list.length} Treffer` : `${CONTINENTS[k]}: ${cnt} von ${tot} Staaten besucht`;
    $('#cl-list', sh).innerHTML = list.map(c => {
      const on = countryRec(c.id).visited || viaVisits.has(c.id);
      return `<label class="row"><span class="lead flag">${c.flag}</span><span class="grow">${esc(c.de)}${c.un ? '' : '<small>Gebiet</small>'}${viaVisits.has(c.id) ? '<small>durch deine Orte</small>' : ''}</span>
        <input type="checkbox" class="check" data-c="${c.id}" ${on ? 'checked' : ''} ${viaVisits.has(c.id) ? 'disabled' : ''}></label>`;
    }).join('');
    $$('input[data-c]', sh).forEach(i => i.onchange = async () => {
      const r = countryRec(i.dataset.c);
      await db.put('countries', { ...r, visited: i.checked });
      showAllYears();
      await loadData(); renderMapLayers(); draw();
    });
  };
  $('#cl-q', sh).oninput = e => { q = e.target.value.trim(); draw(); };
  $$('#cl-k button', sh).forEach(b => b.onclick = () => { k = b.dataset.k; q = ''; $('#cl-q', sh).value = ''; $$('#cl-k button', sh).forEach(x => x.classList.toggle('on', x === b)); draw(); });
  draw();
}

// ================= Reisen =================
function tripMatches(t, q) {
  if (!q) return true;
  const n = norm(q);
  const hay = [t.title, t.note, fmtRange(t.start, t.end), yearOf(t.start),
    ...visitsOfTrip(t.id).flatMap(v => [v.name, v.region, v.note]), ...tripCountries(t.id).map(countryName)].map(norm).join(' ');
  return n.split(' ').every(w => hay.includes(w));
}
function renderTrips() {
  const el = $('#view-trips');
  const hasAny = S.trips.length || S.visits.some(v => !v.tripId);
  el.innerHTML = `
    <header class="large-title"><h1>Reisen</h1><button class="round accent" id="trips-add" aria-label="Hinzufügen">${icon('plus')}</button></header>
    ${backupBanner()}
    ${hasAny ? `<div class="searchbar">${icon('search')}<input id="tr-q" type="search" placeholder="Reisen, Orte, Länder suchen" autocomplete="off" enterkeyhint="search" value="${esc(S.tripQ || '')}" aria-label="Reisen durchsuchen"></div>` : ''}
    ${!hasAny ? `<div class="empty">${icon('trips')}<h3>Noch keine Reisen</h3><p>Lege deine erste Reise an oder erstelle Reisen automatisch aus den Ortsdaten deiner Fotos.</p>
      <div class="btn-col"><button class="btn primary" id="e-trip">${icon('plus')}Neue Reise</button><button class="btn" id="e-photos">${icon('photo')}Aus Fotos erstellen</button></div></div>` : ''}
    <div id="trip-list"></div>
    <div class="spacer"></div>`;
  $('#trips-add').onclick = addMenu;
  if ($('#e-trip')) { $('#e-trip').onclick = () => openTripForm(); $('#e-photos').onclick = () => importPhotos(); }
  bindBackupBanner(el);
  if ($('#tr-q')) $('#tr-q').oninput = e => { S.tripQ = e.target.value; renderTripList(); };
  renderTripList();
}
function renderTripList() {
  const box = $('#trip-list'); if (!box) return;
  const q = (S.tripQ || '').trim();
  const trips = S.trips.filter(t => tripMatches(t, q));
  const loose = S.visits.filter(v => !v.tripId && (!q || norm([v.name, v.region, v.note, countryName(v.cid)].join(' ')).includes(norm(q))))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const byYear = {};
  for (const t of trips) (byYear[yearOf(t.start) || 'Ohne Datum'] ||= []).push(t);
  const ys = Object.keys(byYear).sort().reverse();
  box.innerHTML = `
    ${q && !trips.length && !loose.length ? `<p class="muted pad">Keine Treffer für „${esc(q)}“.</p>` : ''}
    ${q && (trips.length || loose.length) ? `<p class="muted small pad">${trips.length} ${trips.length === 1 ? 'Reise' : 'Reisen'}${loose.length ? `, ${loose.length} einzelne Orte` : ''}</p>` : ''}
    <div class="timeline">
    ${ys.map(y => `<div class="tl-year"><span>${y}</span><small>${byYear[y].length} ${byYear[y].length === 1 ? 'Reise' : 'Reisen'}</small></div>
      ${byYear[y].map(tripCard).join('')}`).join('')}
    </div>
    ${loose.length ? `<h4 class="sec">Einzelne Orte</h4><div class="list card">${loose.map(visitRow).join('')}</div>` : ''}`;
  bindRows(box);
}

// ---------- Erinnerung an Sicherung ----------
function backupDue() {
  const real = [...S.trips, ...S.visits].filter(x => !x.demo);
  if (!real.length) return null;
  const now = Date.now(), DAY = 864e5;
  if (S.backupSnooze && now < Date.parse(S.backupSnooze)) return null;
  if (S.lastBackup) {
    const days = Math.floor((now - Date.parse(S.lastBackup)) / DAY);
    return days >= 30 ? { days } : null;
  }
  const first = Math.min(...real.map(x => x.created || now));
  return now - first >= 7 * DAY ? { never: true } : null;
}
function backupBanner() {
  const d = backupDue(); if (!d) return '';
  return `<div class="banner" role="status">${icon('shield')}<div class="grow"><b>${d.never ? 'Noch keine Sicherung' : `Letzte Sicherung vor ${d.days} Tagen`}</b>
    <small>Deine Reisen und Fotos liegen nur auf diesem Smartphone. Eine Sicherung schützt sie, falls die App gelöscht wird.</small>
    <div class="banner-b"><button class="btn primary sm" data-bk="now">${icon('download')}Jetzt sichern</button><button class="btn sm" data-bk="later">Später</button></div></div></div>`;
}
function bindBackupBanner(root) {
  $$('[data-bk=now]', root).forEach(b => b.onclick = exportBackup);
  $$('[data-bk=later]', root).forEach(b => b.onclick = async () => {
    S.backupSnooze = new Date(Date.now() + 7 * 864e5).toISOString(); await db.setSetting('backupSnooze', S.backupSnooze);
    renderAll(); toast('Erinnerung in 7 Tagen');
  });
}

function tripCard(t) {
  const vs = visitsOfTrip(t.id), ph = photosOfTrip(t.id);
  const cover = ph.find(p => p.id === t.cover) || ph[0];
  const flags = tripCountries(t.id).map(flagOf).join(' ');
  const km = routeKm(tripRoute(t, S.visits, S.home));
  return `<button class="trip-card" data-trip="${t.id}" style="--tc:${t.color || TRIP_COLORS[0]}">
    <div class="tc-cover">${cover ? `<img src="${thumbURL(cover)}" alt="" loading="lazy">` : `<div class="tc-ph">${flags || icon('globe')}</div>`}</div>
    <div class="tc-body"><b>${esc(t.title)}</b><small>${fmtRange(t.start, t.end)}</small>
      <div class="tc-meta"><span>${flags}</span><span>${vs.length} ${vs.length === 1 ? 'Ort' : 'Orte'}${ph.length ? ` · ${ph.length} Fotos` : ''}${km ? ` · ${fmtNum(km)} km` : ''}</span></div></div>
  </button>`;
}

function addMenu() {
  actionSheet('Hinzufügen', [
    { label: 'Neue Reise', icon: 'trips', run: () => openTripForm() },
    { label: 'Einzelnen Ort', icon: 'pin', run: () => openVisitForm() },
    { label: 'Reisen aus Fotos erstellen', icon: 'photo', run: () => importPhotos() },
  ]);
}

function openTripForm(trip = null, { after } = {}) {
  const t = trip ? { ...trip } : { id: db.uid(), title: '', start: today(), end: today(), note: '', color: TRIP_COLORS[S.trips.length % TRIP_COLORS.length], created: Date.now() };
  const sh = openSheet({ title: trip ? 'Reise bearbeiten' : 'Neue Reise', html: `
    <form class="form" id="tf">
      <label>Titel<input class="field" name="title" required placeholder="z. B. Sommer in Italien" value="${esc(t.title)}"></label>
      <div class="two"><label>Von<input class="field" type="date" name="start" value="${esc(t.start)}"></label>
      <label>Bis<input class="field" type="date" name="end" value="${esc(t.end)}"></label></div>
      <div class="fgroup"><span class="flabel" id="tf-color">Farbe</span><div class="colors" role="radiogroup" aria-labelledby="tf-color">${TRIP_COLORS.map((c, k) => `<label class="color"><input type="radio" name="color" value="${c}" ${c === t.color ? 'checked' : ''} aria-label="Farbe ${k + 1}"><i style="background:${c}"></i></label>`).join('')}</div></div>
      <label>Reisetagebuch<textarea class="field" name="note" rows="5" placeholder="Was habt ihr erlebt?">${esc(t.note)}</textarea></label>
      <button class="btn primary wide" type="submit">${trip ? 'Speichern' : 'Reise anlegen'}</button>
    </form>` });
  $('#tf', sh).onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    Object.assign(t, { title: f.get('title').trim() || 'Reise', start: f.get('start'), end: f.get('end') || f.get('start'), note: f.get('note'), color: f.get('color') || t.color });
    if (t.end && t.start && t.end < t.start) [t.start, t.end] = [t.end, t.start];
    await db.put('trips', t);
    sh.close(); await refresh();
    if (after) after(t);
    else if (!trip) { openTrip(t.id); } else refreshTop();
    toast(trip ? 'Gespeichert' : 'Reise angelegt');
  };
}

function refreshTop() {
  // offenes Detail-Sheet neu aufbauen
  const sh = topSheet();
  if (sh && sh.dataset.kind === 'trip') { sh.close(); openTrip(sh.dataset.id); }
  else if (sh && sh.dataset.kind === 'visit') { sh.close(); openVisit(sh.dataset.id); }
}

function openTrip(id) {
  const t = tripById(id); if (!t) return;
  const vs = visitsOfTrip(id), ph = photosOfTrip(id);
  const route = tripRoute(t, S.visits, S.home);
  const km = routeKm(route);
  const cids = tripCountries(id);
  const sh = openSheet({ title: t.title, full: true, headerRight: `<button class="icon-btn" id="t-more" aria-label="Aktionen">${icon('more')}</button>`, html: `
    <div class="trip-hero" style="--tc:${t.color}">
      <canvas id="t-map"></canvas>
      <div class="th-info"><small>${fmtRange(t.start, t.end)}</small><div class="flags">${cids.map(c => `<button data-copen="${c}" title="${esc(countryName(c))}" aria-label="${esc(countryName(c))}">${flagOf(c)}</button>`).join('')}</div></div>
    </div>
    <div class="kpis">
      <div><b>${daysBetween(t.start, t.end)}</b><small>Tage</small></div>
      <div><b>${vs.length}</b><small>Orte</small></div>
      <div><b>${fmtNum(km)}</b><small>km${S.home ? ' ab Heimat' : ''}</small></div>
      <div><b>${ph.length}</b><small>Fotos</small></div>
    </div>
    ${t.note ? `<div class="diary">${esc(t.note).replace(/\n/g, '<br>')}</div>` : ''}
    <div class="sec-h"><h4 class="sec">Orte</h4><button class="link" id="t-addv">${icon('plus')}Ort</button></div>
    ${vs.length ? `<div class="list stops">${vs.map((v, i) => visitRow(v).replace('<button class="row"', `<button class="row" data-n="${i + 1}"`)).join('')}</div>` : `<p class="muted pad">Noch keine Orte – füge Orte hinzu oder importiere Fotos mit Ortsdaten.</p>`}
    <div class="sec-h"><h4 class="sec">Fotos</h4><button class="link" id="t-addp">${icon('plus')}Fotos</button></div>
    ${ph.length ? `<div class="grid">${ph.map(p => `<button class="gi" data-p="${p.id}"><img src="${thumbURL(p)}" alt="" loading="lazy"></button>`).join('')}</div>` : `<p class="muted pad">Noch keine Fotos.</p>`}
    <div class="btn-row"><button class="btn" id="t-show">${icon('map')}Auf Karte</button><button class="btn" id="t-share">${icon('share')}Teilen</button></div>
    ${vs.length ? `<button class="btn primary wide" id="t-film">${icon('film')}Reisefilm dieser Reise</button>` : ''}` });
  sh.dataset.kind = 'trip'; sh.dataset.id = id;
  // Mini-Karte
  requestAnimationFrame(() => {
    const cv = $('#t-map', sh); if (!cv) return;
    const r = cv.getBoundingClientRect(); const dpr = Math.min(3, devicePixelRatio || 1);
    cv.width = r.width * dpr; cv.height = r.height * dpr;
    const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    const pts = vs.map(v => ({ lat: v.lat, lon: v.lon }));
    const view = pts.length ? fitView(r.width, r.height, boundsOf(pts, 3), 36, 40000) : fitView(r.width, r.height, cids.length ? country(cids[0]).bb : [-180, -56, 180, 76], 20);
    const tRids = new Set(vs.map(v => v.rid).filter(Boolean));
    renderMap(ctx, r.width, r.height, view, { visited: new Set(cids), visitedRegions: tRids, regionCountries: new Set([...tRids].map(id => region(id)?.c)), cities: false, routes: pts.length > 1 ? [{ points: pts, color: t.color, width: 2.5 }] : [], pins: vs.map(v => ({ lat: v.lat, lon: v.lon, color: t.color })), cluster: false, labels: true });
  });
  bindRows(sh);
  $('#t-addv', sh).onclick = () => openVisitForm(null, { tripId: id });
  $('#t-addp', sh).onclick = () => importPhotos({ tripId: id });
  $$('[data-p]', sh).forEach(b => b.onclick = () => openViewer(ph, ph.findIndex(p => p.id === b.dataset.p), { trip: t }));
  $('#t-show', sh).onclick = () => { closeAllSheets(); switchTab('map'); const pts = vs.map(v => ({ lat: v.lat, lon: v.lon })); if (pts.length) S.map.flyTo(boundsOf(pts, 2), 60); };
  $('#t-share', sh).onclick = () => shareTrip(t);
  if ($('#t-film', sh)) $('#t-film', sh).onclick = () => openFilmStart({ tripId: id });
  $('#t-more', sh).onclick = () => actionSheet(t.title, [
    { label: 'Bearbeiten', icon: 'edit', run: () => openTripForm(t) },
    { label: 'Ort hinzufügen', icon: 'pin', run: () => openVisitForm(null, { tripId: id }) },
    { label: 'Fotos hinzufügen', icon: 'photo', run: () => importPhotos({ tripId: id }) },
    { label: 'Reisefilm erstellen', icon: 'film', run: () => openFilmStart({ tripId: id }) },
    { label: 'Reise löschen', icon: 'trash', danger: true, run: async () => {
      if (!await confirmDialog('Reise löschen?', `„${t.title}“ mit ${vs.length} Orten und ${ph.length} Fotos wird endgültig gelöscht.`, 'Löschen', true)) return;
      for (const p of ph) { await db.del('photos', p.id); dropURL(p.id); }
      for (const v of vs) await db.del('visits', v.id);
      await db.del('trips', id); sh.close(); await refresh(); toast('Reise gelöscht');
    } },
  ]);
}

async function shareTrip(t) {
  const pr = progress('Bild wird erstellt …');
  const vs = visitsOfTrip(t.id), cids = tripCountries(t.id);
  const pts = vs.map(v => ({ lat: v.lat, lon: v.lon, color: t.color }));
  const blob = await renderShareCard({
    title: t.title, subtitle: fmtRange(t.start, t.end),
    tiles: [{ value: daysBetween(t.start, t.end), label: 'Tage' }, { value: vs.length, label: 'Orte' }, { value: fmtNum(routeKm(tripRoute(t, S.visits, null))), label: 'km unterwegs' }],
    visited: new Set(cids), routes: [{ points: pts, color: t.color }], pins: pts,
    photos: photosOfTrip(t.id), focus: pts.length ? boundsOf(pts, 3) : null,
  });
  pr.done();
  await shareBlob(blob, 'WowarWahr-Reise.png', t.title);
}

// ================= Orte =================
function openVisit(id) {
  const v = S.visits.find(x => x.id === id); if (!v) return;
  const t = v.tripId ? tripById(v.tripId) : null;
  const ph = photosOfVisit(id);
  const c = country(v.cid);
  const sh = openSheet({ title: v.name, headerRight: `<button class="icon-btn" id="v-more" aria-label="Aktionen">${icon('more')}</button>`, html: `
    ${ph.length ? `<div class="hero-photo"><img src="${fullURL(ph[0])}" alt=""></div>` : ''}
    <div class="visit-head"><span class="flag-l">${c ? c.flag : icon('pin', 'em')}</span><div>
      <b>${esc(v.name)}</b><small>${[v.region, c?.de].filter(Boolean).map(esc).join(', ')}</small></div></div>
    <div class="list">
      ${c ? `<button class="row" id="v-country"><span class="lead flag">${c.flag}</span><span class="grow">${esc(c.de)}${v.region ? `<small>${esc(v.region)}</small>` : ''}</span>${icon('chev', 'chev')}</button>` : ''}
      <button class="row" id="v-date">${icon('calendar', 'lead')}<span class="grow">${v.date ? fmtDate(v.date) : 'Kein Datum – antippen zum Hinzufügen'}</span>${icon('chev', 'chev')}</button>
      ${t ? `<button class="row" data-trip="${t.id}"><span class="lead dotc" style="background:${t.color}"></span><span class="grow">${esc(t.title)}<small>${fmtRange(t.start, t.end)}</small></span>${icon('chev', 'chev')}</button>` : `<button class="row" id="v-trip">${icon('trips', 'lead')}<span class="grow">Keiner Reise zugeordnet</span>${icon('chev', 'chev')}</button>`}
      <div class="row">${icon('star', 'lead')}<span class="grow">Bewertung</span><span class="rate" id="v-rate">${[1, 2, 3, 4, 5].map(i => `<button data-r="${i}" class="${i <= (v.rating || 0) ? 'on' : ''}" aria-label="${i} Sterne">${icon('starfill', 'em')}</button>`).join('')}</span></div>
      ${S.home ? `<button class="row" id="v-home">${icon('home', 'lead')}<span class="grow">${fmtNum(dist(S.home, v))} km von zu Hause <small>Luftlinie · antippen zum Anzeigen</small></span>${icon('chev', 'chev')}</button>` : ''}
    </div>
    <div class="sec-h"><h4 class="sec">Tags</h4><button class="link" id="v-tags-edit">${icon('edit')}Bearbeiten</button></div>
    ${v.tags?.length ? `<div class="chips wrap">${v.tags.map(id => tagOf(id)).filter(Boolean).map(t => `<button data-tagf="${t.id}">${icon(t.i, 'em')} ${t.label}</button>`).join('')}</div>` : '<p class="muted pad">Noch keine Tags.</p>'}
    ${v.note ? `<div class="diary">${esc(v.note).replace(/\n/g, '<br>')}</div>` : ''}
    <div class="sec-h"><h4 class="sec">Fotos</h4><button class="link" id="v-addp">${icon('plus')}Fotos</button></div>
    ${ph.length ? `<div class="grid">${ph.map(p => `<button class="gi" data-p="${p.id}"><img src="${thumbURL(p)}" alt="" loading="lazy"></button>`).join('')}</div>` : '<p class="muted pad">Noch keine Fotos.</p>'}
    <div class="btn-row"><button class="btn" id="v-map">${icon('map')}Auf Karte</button><button class="btn" id="v-edit">${icon('edit')}Bearbeiten</button></div>
    <a class="osm-link" href="https://www.openstreetmap.org/?mlat=${v.lat.toFixed(5)}&mlon=${v.lon.toFixed(5)}#map=12/${v.lat.toFixed(4)}/${v.lon.toFixed(4)}" target="_blank" rel="noopener noreferrer">${icon('ext')}Detailkarte auf openstreetmap.org öffnen</a>` });
  sh.dataset.kind = 'visit'; sh.dataset.id = id;
  bindRows(sh);
  $$('#v-rate button', sh).forEach(b => b.onclick = async () => {
    const r = +b.dataset.r === v.rating ? 0 : +b.dataset.r;
    v.rating = r; await db.put('visits', v); await loadData();
    $$('#v-rate button', sh).forEach(x => x.classList.toggle('on', +x.dataset.r <= r));
    renderTab(S.tab);
  });
  $('#v-addp', sh).onclick = async () => {
    const files = await pickFiles();
    if (!files.length) return;
    await storePhotos(files, { visitId: v.id, tripId: v.tripId || null });
    sh.close(); await refresh(); openVisit(id);
  };
  $$('[data-p]', sh).forEach(b => b.onclick = () => openViewer(ph, ph.findIndex(p => p.id === b.dataset.p), { visit: v }));
  $('#v-map', sh).onclick = () => { closeAllSheets(); switchTab('map'); S.map.flyTo([v.lon - 1.2, v.lat - 0.8, v.lon + 1.2, v.lat + 0.8], 40, 60000); };
  $('#v-edit', sh).onclick = () => openVisitForm(v);
  if ($('#v-country', sh)) $('#v-country', sh).onclick = () => openCountry(v.cid);
  $('#v-date', sh).onclick = () => openVisitForm(v);
  if ($('#v-trip', sh)) $('#v-trip', sh).onclick = () => openVisitForm(v);
  if ($('#v-home', sh)) $('#v-home', sh).onclick = () => { closeAllSheets(); switchTab('map'); S.map.flyTo(boundsOf([S.home, v], 2), 60); };
  $('#v-tags-edit', sh).onclick = () => openVisitForm(v);
  $$('[data-tagf]', sh).forEach(b => b.onclick = () => openAllVisits({ tag: b.dataset.tagf }));
  $('#v-more', sh).onclick = () => actionSheet(v.name, [
    { label: 'Bearbeiten', icon: 'edit', run: () => openVisitForm(v) },
    { label: 'Ort löschen', icon: 'trash', danger: true, run: async () => {
      if (!await confirmDialog('Ort löschen?', `„${v.name}“${ph.length ? ` und ${ph.length} Fotos` : ''} werden gelöscht.`, 'Löschen', true)) return;
      for (const p of ph) { await db.del('photos', p.id); dropURL(p.id); }
      await db.del('visits', id); sh.close(); await refresh(); refreshTop(); toast('Ort gelöscht');
    } },
  ]);
}

async function storePhotos(files, { visitId = null, tripId = null, meta = null } = {}) {
  return storeJobs(files.map(file => ({ file, visitId, tripId })), meta);
}
// Fotos parallel verkleinern und speichern (mit Abbrechen)
async function storeJobs(jobs, meta = null) {
  if (!jobs.length) return { saved: 0 };
  let cancelled = false, done = 0, failed = 0, next = 0;
  const pr = progress(`Fotos werden gespeichert … 0/${jobs.length}`, { onCancel: () => { cancelled = true; } });
  const worker = async () => {
    while (!cancelled && next < jobs.length) {
      const job = jobs[next++];
      try {
        const ex = meta?.get(job.file) || await readExif(job.file);
        const pp = await processPhoto(job.file);
        await db.put('photos', { id: db.uid(), visitId: job.visitId || null, tripId: job.tripId || null, blob: pp.blob, thumb: pp.thumb, w: pp.w, h: pp.h,
          date: ex.date || null, utc: ex.utc || null, tz: ex.tz || null, lat: ex.lat ?? null, lon: ex.lon ?? null, created: Date.now() });
      } catch (e) { failed++; }
      done++;
      pr.update(`Fotos werden gespeichert … ${done}/${jobs.length}`);
    }
  };
  const n = Math.min(3, jobs.length);
  await Promise.all(Array.from({ length: n }, worker));
  const saved = done - failed;
  pr.done(cancelled ? `Abgebrochen – ${saved} Fotos gespeichert` : failed ? `${saved} gespeichert, ${failed} nicht lesbar` : `${saved} ${saved === 1 ? 'Foto' : 'Fotos'} gespeichert`);
  return { saved, cancelled };
}

function openVisitForm(visit = null, { tripId = null, countryFilter = null, place = null } = {}) {
  const v = visit ? { ...visit } : { id: db.uid(), tripId, name: '', lat: null, lon: null, cid: null, region: '', cap: false, date: '', rating: 0, note: '', tags: [], created: Date.now() };
  if (!visit && tripId) { const t = tripById(tripId); v.date = t?.start || today(); }
  if (!visit && !tripId) v.date = today();
  if (place) Object.assign(v, place);
  let pending = [];
  const sh = openSheet({ title: visit ? 'Ort bearbeiten' : 'Ort hinzufügen', html: `
    <form class="form" id="vf">
      <div class="fgroup"><span class="flabel">Ort</span>
      <button type="button" class="place-pick" id="vf-place"></button></div>
      <label>Name<input class="field" name="name" placeholder="Name des Ortes" value="${esc(v.name)}"></label>
      <label>Reise<select class="field" name="tripId"><option value="">Keine Reise (einzelner Ort)</option>
        ${S.trips.map(t => `<option value="${t.id}" ${t.id === v.tripId ? 'selected' : ''}>${esc(t.title)} · ${fmtRange(t.start, t.end)}</option>`).join('')}
        <option value="__new">+ Neue Reise …</option></select></label>
      <label>Datum<input class="field" type="date" name="date" id="vf-date" value="${esc(v.date || '')}" ${v.date === '' ? 'disabled' : ''}></label>
      <div class="list"><div class="row">${icon('calendar', 'lead')}<span class="grow">Ohne Datum</span><input type="checkbox" class="switch" id="vf-nodate" ${v.date === '' ? 'checked' : ''}></div></div>
      <div class="fgroup"><span class="flabel">Bewertung</span><span class="rate big" id="vf-rate">${[1, 2, 3, 4, 5].map(i => `<button type="button" data-r="${i}" class="${i <= v.rating ? 'on' : ''}" aria-label="${i} ${i === 1 ? 'Stern' : 'Sterne'}">${icon('starfill', 'em')}</button>`).join('')}</span></div>
      <div class="fgroup"><span class="flabel">Tags</span><div class="chips wrap" id="vf-tags">${TAGS.map(t => `<button type="button" data-t="${t.id}" class="${v.tags?.includes(t.id) ? 'on' : ''}">${icon(t.i, 'em')} ${t.label}</button>`).join('')}</div></div>
      <label>Notiz<textarea class="field" name="note" rows="3" placeholder="Erinnerungen, Tipps, Lieblingsessen …">${esc(v.note)}</textarea></label>
      ${visit ? '' : `<button type="button" class="btn wide" id="vf-photos">${icon('camera')}Fotos hinzufügen <span id="vf-pc"></span></button>`}
      <button class="btn primary wide" type="submit">${visit ? 'Speichern' : 'Ort speichern'}</button>
    </form>` });
  const drawPlace = () => {
    $('#vf-place', sh).innerHTML = v.lat != null
      ? `<span class="flag">${flagOf(v.cid)}</span><span class="grow"><b>${esc(v.name || '')}</b><small>${[v.region, countryName(v.cid)].filter(Boolean).map(esc).join(', ')} · ${v.lat.toFixed(3)}, ${v.lon.toFixed(3)}</small></span>${icon('chev', 'chev')}`
      : `${icon('search', 'lead')}<span class="grow"><b>Ort auswählen</b><small>Suchen, aktueller Standort oder auf der Karte</small></span>${icon('chev', 'chev')}`;
  };
  drawPlace();
  const dateInput = $('#vf-date', sh), noDateCb = $('#vf-nodate', sh);
  let lastDate = v.date || today();
  noDateCb.onchange = () => {
    if (noDateCb.checked) { lastDate = dateInput.value || lastDate; dateInput.value = ''; dateInput.disabled = true; }
    else { dateInput.disabled = false; dateInput.value = lastDate; }
  };
  $$('#vf-tags button', sh).forEach(b => b.onclick = () => b.classList.toggle('on'));
  const choose = async () => {
    const p = await choosePlace({ countryFilter });
    if (!p) return;
    Object.assign(v, p); v.rid = p.rid ?? null;
    sh.querySelector('[name=name]').value = p.name;
    drawPlace();
  };
  $('#vf-place', sh).onclick = choose;
  $$('#vf-rate button', sh).forEach(b => b.onclick = () => { v.rating = +b.dataset.r === v.rating ? 0 : +b.dataset.r; $$('#vf-rate button', sh).forEach(x => x.classList.toggle('on', +x.dataset.r <= v.rating)); });
  const sel = sh.querySelector('[name=tripId]');
  sel.onchange = () => {
    if (sel.value === '__new') {
      sel.value = v.tripId || '';
      openTripForm(null, { after: t => { const o = document.createElement('option'); o.value = t.id; o.textContent = t.title; sel.insertBefore(o, sel.lastElementChild); sel.value = t.id; } });
    }
  };
  if ($('#vf-photos', sh)) $('#vf-photos', sh).onclick = async () => {
    const f = await pickFiles(); pending = pending.concat(f);
    $('#vf-pc', sh).textContent = pending.length ? `(${pending.length})` : '';
    // Ort aus Foto übernehmen, falls noch keiner gewählt
    if (v.lat == null) {
      for (const file of f) {
        const ex = await readExif(file);
        if (ex.lat != null) {
          Object.assign(v, describe(ex.lat, ex.lon));
          if (ex.date && !visit) { noDateCb.checked = false; dateInput.disabled = false; dateInput.value = lastDate = ex.date.slice(0, 10); }
          sh.querySelector('[name=name]').value = v.name; drawPlace(); toast('Ort aus Foto übernommen'); break;
        }
      }
    }
  };
  if (!visit && !place) setTimeout(choose, 350);
  $('#vf', sh).onsubmit = async e => {
    e.preventDefault();
    if (v.lat == null) { toast('Bitte zuerst einen Ort auswählen'); return choose(); }
    const f = new FormData(e.target);
    v.name = (f.get('name') || '').trim() || v.name || 'Ort';
    v.tripId = f.get('tripId') && f.get('tripId') !== '__new' ? f.get('tripId') : null;
    v.date = noDateCb.checked ? '' : (dateInput.value || '');
    v.note = f.get('note');
    v.tags = $$('#vf-tags button.on', sh).map(b => b.dataset.t);
    if (!v.rid) assignRegion(v);
    await db.put('visits', v);
    if (visit && visit.tripId !== v.tripId) for (const p of photosOfVisit(v.id)) await db.put('photos', { ...p, tripId: v.tripId });
    if (pending.length) await storePhotos(pending, { visitId: v.id, tripId: v.tripId });
    // Reisezeitraum ggf. erweitern
    const t = v.tripId && tripById(v.tripId);
    if (t && v.date) {
      let ch = false;
      if (!t.start || v.date < t.start) { t.start = v.date; ch = true; }
      if (!t.end || v.date > t.end) { t.end = v.date; ch = true; }
      if (ch) await db.put('trips', t);
    }
    sh.close(); await refresh(); refreshTop();
    if (!visit) toast(`${v.name} gespeichert`);
  };
}

// ---------- Ort wählen ----------
function choosePlace({ countryFilter = null, title = 'Ort wählen', allowCountry = true, quick = true, mine = false, placeholder = 'Stadt oder Land suchen' } = {}) {
  return new Promise(resolve => {
    let done = false;
    const finish = p => { if (done) return; done = true; sh.close(); resolve(p); };
    const sh = openSheet({ title, full: true, onClose: () => { if (!done) { done = true; resolve(null); } }, html: `
      <div class="searchbar">${icon('search')}<input id="cp-q" type="search" placeholder="${esc(placeholder)}" autocomplete="off" enterkeyhint="search" aria-label="${esc(placeholder)}"></div>
      ${countryFilter ? `<div class="chips"><button class="on" id="cp-cf">${flagOf(countryFilter)} nur ${esc(countryName(countryFilter))} ${icon('close', 'em')}</button></div>` : ''}
      ${quick ? `<div class="quick">
        <button id="cp-gps">${icon('locate')}<span>Aktueller Standort</span></button>
        <button id="cp-map">${icon('map')}<span>Auf Karte wählen</span></button>
      </div>` : ''}
      <div class="list" id="cp-list"></div>
      <p class="fine pad">Ortsverzeichnis mit rund 157.000 Orten: Natural Earth (gemeinfrei) und GeoNames (CC BY 4.0). Dein Ort fehlt? Wähle ihn auf der Karte und gib ihm einen eigenen Namen.</p>` });
    let cf = countryFilter;
    const nearHint = p => {
      if (p.ne) return '';
      if (p.near === undefined) { let best = null; for (const q of placesNear(p.lat, p.lon, 0.8)) { if (!q.ne || q === p) continue; const d = dist(p, q); if (d > 2 && (!best || d < best.d)) best = { q, d }; } p.near = best ? `${Math.round(best.d)} km von ${best.q.name}` : ''; }
      return p.near;
    };
    const regionName = p => {
      if (!p.region && geo.regionsOf.has(p.cid)) { const r = regionAt(p.lat, p.lon, p.cid); p.region = r ? r.n : ''; }
      return p.region;
    };
    if (!geo.plus.length) loadPlus().then(() => { if (!done) draw($('#cp-q', sh).value); });
    const draw = q => {
      const res = search(q, { countryFilter: cf, withCountries: allowCountry, withRegions: mine, limit: 40 });
      // Eigene Orte zuerst (nur Kartensuche)
      const nq = norm(q);
      if (mine && nq) {
        const own = S.visits.filter(v => norm(v.name).includes(nq)).sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 8);
        res.unshift(...own.map(v => ({ type: 'visit', v })));
      }
      $('#cp-list', sh).innerHTML = res.map((r, i) => r.type === 'visit'
        ? `<button class="row" data-i="${i}"><span class="lead flag">${flagOf(r.v.cid)}</span><span class="grow">${esc(r.v.name)} <em class="tag">Dein Ort</em><small>${[fmtDate(r.v.date), r.v.tripId ? tripById(r.v.tripId)?.title : '', countryName(r.v.cid)].filter(Boolean).map(esc).join(' · ')}</small></span></button>`
        : r.type === 'region'
        ? `<button class="row" data-i="${i}"><span class="lead flag">${flagOf(r.r.c)}</span><span class="grow">${esc(r.r.n)}<small>${esc(regionWord(r.r.c, false))} · ${esc(countryName(r.r.c))}</small></span></button>`
        : r.type === 'country'
        ? `<button class="row" data-i="${i}"><span class="lead flag">${r.c.flag}</span><span class="grow">${esc(r.c.de)}<small>Land · ${CONTINENTS[r.c.k]}</small></span></button>`
        : `<button class="row" data-i="${i}"><span class="lead flag">${flagOf(r.p.cid)}</span><span class="grow">${esc(r.p.name)}${r.p.cap ? ' <em class="tag">Hauptstadt</em>' : ''}<small>${[nearHint(r.p), [regionName(r.p), countryName(r.p.cid)].filter(Boolean).join(', ')].filter(Boolean).map(esc).join(' · ')}</small></span></button>`).join('')
        || '<p class="muted pad">Nichts gefunden. Tipp: „Auf Karte wählen“ nutzen.</p>';
      $$('#cp-list [data-i]', sh).forEach(b => b.onclick = () => {
        const r = res[+b.dataset.i];
        if (r.type === 'region') finish({ regionId: r.r.id, cid: r.r.c, name: r.r.n });
        else if (r.type === 'visit') finish({ visitId: r.v.id, name: r.v.name, lat: r.v.lat, lon: r.v.lon, cid: r.v.cid });
        else if (r.type === 'country') finish({ name: r.c.de, lat: r.c.ly, lon: r.c.lx, cid: r.c.id, region: '', cap: false, isCountry: true });
        else { const rg = geo.regionsOf.has(r.p.cid) ? regionAt(r.p.lat, r.p.lon, r.p.cid) : null; finish({ name: r.p.name, lat: r.p.lat, lon: r.p.lon, cid: r.p.cid, region: rg ? rg.n : r.p.region, rid: rg ? rg.id : null, cap: r.p.cap }); }
      });
    };
    $('#cp-q', sh).oninput = e => draw(e.target.value);
    if ($('#cp-cf', sh)) $('#cp-cf', sh).onclick = e => { cf = null; e.target.remove(); draw($('#cp-q', sh).value); };
    if (quick) $('#cp-gps', sh).onclick = async () => {
      const pos = await locateMe(); if (!pos) return;
      const d = describe(pos.lat, pos.lon);
      finish(d);
    };
    if (quick) $('#cp-map', sh).onclick = async () => {
      const pt = await pickOnMap(cf ? country(cf).bb : null);
      if (!pt) return;
      const d = describe(pt.lat, pt.lon);
      const name = await promptDialog('Name des Ortes', d.name.replace(/^bei /, ''), 'z. B. Strandhaus');
      if (name === null) return;
      finish({ ...d, name: name || d.name });
    };
    draw('');
    if (!quick) setTimeout(() => $('#cp-q', sh)?.focus(), 350);
  });
}

function locateMe() {
  return new Promise(res => {
    if (!navigator.geolocation) { toast('Standort ist auf diesem Gerät nicht verfügbar'); return res(null); }
    const pr = progress('Standort wird ermittelt …');
    navigator.geolocation.getCurrentPosition(
      p => { pr.done(); res({ lat: p.coords.latitude, lon: p.coords.longitude }); },
      e => { pr.done(e.code === 1 ? 'Standortzugriff nicht erlaubt (Einstellungen › Datenschutz › Ortungsdienste)' : 'Standort konnte nicht ermittelt werden'); res(null); },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 });
  });
}

function pickOnMap(bounds) {
  return new Promise(resolve => {
    const prevTab = S.tab;
    document.body.classList.add('picking');
    S.picking = true;
    switchTab('map');
    $('#map-onboard').hidden = true;
    if (bounds) S.map.flyTo(bounds, 30);
    const bar = $('#pick-bar');
    bar.hidden = false;
    bar.innerHTML = `<p>Karte verschieben und zoomen, bis das Fadenkreuz auf dem Ort liegt.</p><div class="btn-row"><button class="btn" id="pk-no">Abbrechen</button><button class="btn primary" id="pk-ok">${icon('check')}Ort übernehmen</button></div>`;
    const end = val => {
      document.body.classList.remove('picking'); S.picking = null; bar.hidden = true;
      switchTab(prevTab); resolve(val);
    };
    $('#pk-no').onclick = () => end(null);
    $('#pk-ok').onclick = () => end(S.map.center());
  });
}

// ---------- Fotoansicht ----------
function openViewer(list, index, { trip = null, visit = null } = {}) {
  let i = Math.max(0, index);
  const el = document.createElement('div'); el.className = 'viewer';
  el.innerHTML = `<div class="vw-top"><span class="vw-l"><button class="icon-btn light" id="vw-x" aria-label="Schließen">${icon('close')}</button><button class="icon-btn light" data-home aria-label="Zur Startseite">${icon('start')}</button></span><span id="vw-n"></span><button class="icon-btn light" id="vw-m" aria-label="Aktionen">${icon('more')}</button></div>
    <div class="vw-stage"><img id="vw-img" alt=""></div><div class="vw-cap" id="vw-cap"></div>`;
  $("#sheets").appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  const show = () => {
    const p = list[i];
    $('#vw-img', el).src = fullURL(p);
    $('#vw-n', el).textContent = `${i + 1} / ${list.length}`;
    const v = p.visitId && S.visits.find(x => x.id === p.visitId);
    $('#vw-cap', el).textContent = [v?.name, p.date ? fmtDate(p.date) : ''].filter(Boolean).join(' · ');
  };
  show();
  const close = () => { el.classList.remove('in'); setTimeout(() => { el.remove(); if (S.viewerDirty) { S.viewerDirty = false; refreshTop(); } }, 250); };
  $('#vw-x', el).onclick = close;
  let x0 = null, y0 = 0;
  const stage = $('.vw-stage', el);
  stage.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener('touchend', e => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
    if (dy > 120 && Math.abs(dx) < 80) return close();
    if (Math.abs(dx) > 50) { i = (i + (dx < 0 ? 1 : -1) + list.length) % list.length; show(); }
  });
  stage.onclick = e => { if (e.clientX > innerWidth / 2) i = (i + 1) % list.length; else i = (i - 1 + list.length) % list.length; show(); };
  $('#vw-m', el).onclick = () => {
    const p = list[i];
    const t = trip || (p.tripId && tripById(p.tripId));
    actionSheet('Foto', [
      ...(t ? [{ label: 'Als Titelbild der Reise', icon: 'photo', run: async () => { await db.put('trips', { ...t, cover: p.id }); await refresh(); S.viewerDirty = true; toast('Titelbild gesetzt'); } }] : []),
      { label: 'Anderem Ort / Reise zuordnen', icon: 'pin', run: () => movePhoto(p, np => {
        const stays = trip ? np.tripId === trip.id : visit ? np.visitId === visit.id : true;
        if (stays) { list[i] = np; show(); return; }
        list.splice(i, 1); if (!list.length) return close(); i = i % list.length; show(); }) },
      { label: 'Teilen / Sichern', icon: 'share', run: () => shareBlob(p.blob, 'Foto.jpg', '') },
      { label: 'Foto löschen', icon: 'trash', danger: true, run: async () => {
        if (!await confirmDialog('Foto löschen?', 'Das Foto wird aus WowarWahr entfernt (nicht aus deiner Fotomediathek).', 'Löschen', true)) return;
        await db.del('photos', p.id); dropURL(p.id); list.splice(i, 1);
        await refresh(); S.viewerDirty = true;
        if (!list.length) return close();
        i = i % list.length; show();
      } },
    ]);
  };
}

function movePhoto(p, after) {
  const cur = p.visitId ? 'v:' + p.visitId : p.tripId ? 't:' + p.tripId : '';
  const mark = key => key === cur ? icon('check', 'ok') : '';
  const loose = S.visits.filter(v => !v.tripId);
  const sh = openSheet({ title: 'Foto zuordnen', full: true, html: `
    <div class="searchbar">${icon('search')}<input id="mv-q" placeholder="Reise oder Ort suchen" autocomplete="off"></div>
    <div id="mv-list">
    ${S.trips.map(t => `<div class="mv-trip" data-s="${esc(norm([t.title, ...visitsOfTrip(t.id).map(v => v.name)].join(' ')))}">
      <h4 class="sec"><span class="dotc inline" style="background:${t.color}"></span>${esc(t.title)} · ${fmtRange(t.start, t.end)}</h4>
      <div class="list">
        <button class="row" data-to="t:${t.id}">${icon('trips', 'lead')}<span class="grow">Nur der Reise zuordnen<small>ohne bestimmten Ort</small></span>${mark('t:' + t.id)}</button>
        ${visitsOfTrip(t.id).map(v => `<button class="row" data-to="v:${v.id}"><span class="lead flag">${flagOf(v.cid)}</span><span class="grow">${esc(v.name)}<small>${v.date ? fmtDate(v.date, false) : ''}</small></span>${mark('v:' + v.id)}</button>`).join('')}
      </div></div>`).join('')}
    ${loose.length ? `<div class="mv-trip" data-s="${esc(norm(loose.map(v => v.name).join(' ')))}"><h4 class="sec">Einzelne Orte</h4><div class="list">${loose.map(v => `<button class="row" data-to="v:${v.id}"><span class="lead flag">${flagOf(v.cid)}</span><span class="grow">${esc(v.name)}</span>${mark('v:' + v.id)}</button>`).join('')}</div></div>` : ''}
    </div>` });
  $('#mv-q', sh).oninput = e => { const n = norm(e.target.value); $$('.mv-trip', sh).forEach(d => d.hidden = !!n && !d.dataset.s.includes(n)); };
  $$('[data-to]', sh).forEach(b => b.onclick = async () => {
    const [kind, id] = b.dataset.to.split(':');
    let visitId = null, tripId = null;
    if (kind === 'v') { visitId = id; tripId = S.visits.find(v => v.id === id)?.tripId || null; } else tripId = id;
    const np = { ...p, visitId, tripId };
    await db.put('photos', np);
    sh.close(); await refresh();
    if ($('.viewer')) S.viewerDirty = true; else refreshTop();
    toast('Foto verschoben');
    after && after(np);
  });
}

// ================= Import aus Fotos =================
async function readAllExif(files) {
  const pr = progress(`Fotos werden gelesen … 0/${files.length}`);
  const meta = new Map(); let n = 0, next = 0;
  const worker = async () => { while (next < files.length) { const f = files[next++]; meta.set(f, await readExif(f)); if (++n % 5 === 0) pr.update(`Fotos werden gelesen … ${n}/${files.length}`); } };
  await Promise.all(Array.from({ length: Math.min(6, files.length) }, worker));
  pr.done();
  return meta;
}
const photoTime = m => m.utc ?? (m.date ? Date.parse(m.date + 'Z') : null);
const localDay = m => (m.date || '').slice(0, 10);

async function importPhotos({ tripId = null } = {}) {
  const files = await pickFiles();
  if (!files.length) return;
  const meta = await readAllExif(files);
  const withGps = files.filter(f => meta.get(f).lat != null);

  // Direkt in eine bestehende Reise
  if (tripId) {
    const t = tripById(tripId);
    const vs = visitsOfTrip(tripId);
    const assign = new Map();
    const newPlaces = [];
    for (const f of withGps) {
      const m = meta.get(f);
      let best = null;
      for (const v of vs.concat(newPlaces)) { const d = dist(v, m); if (d < 15 && (!best || d < best.d)) best = { v, d }; }
      if (best) assign.set(f, best.v);
      else {
        const d = describe(m.lat, m.lon);
        const nv = { id: db.uid(), tripId, ...d, date: localDay(m) || t.start, rating: 0, note: '', created: Date.now() };
        newPlaces.push(nv); assign.set(f, nv);
      }
    }
    if (newPlaces.length && !await confirmDialog('Neue Orte gefunden', `${newPlaces.length} ${newPlaces.length === 1 ? 'Ort wurde' : 'Orte wurden'} anhand der Fotos erkannt: ${newPlaces.map(p => p.name).join(', ')}. Zur Reise hinzufügen?`, 'Hinzufügen')) {
      newPlaces.length = 0; assign.clear();
    }
    for (const v of newPlaces) await db.put('visits', v);
    await storeJobs(files.map(f => ({ file: f, tripId, visitId: assign.get(f)?.id || null })), meta);
    await refresh(); refreshTop();
    if (withGps.length < files.length) toast(`${files.length - withGps.length} Fotos ohne Ortsdaten wurden der Reise allgemein zugeordnet.`, 3500);
    return;
  }

  if (!withGps.length) {
    openSheet({ title: 'Keine Ortsdaten gefunden', html: `<div class="empty">${icon('photo')}<p>Die gewählten Fotos enthalten keine GPS-Position. Das passiert z. B., wenn die Ortungsdienste für die Kamera ausgeschaltet waren oder die Ortsangaben beim Auswählen bzw. Teilen entfernt wurden.</p><p>Du kannst die Reise trotzdem anlegen und die Orte selbst wählen.</p><button class="btn primary" id="np-trip">Reise manuell anlegen</button></div>` });
    $('#np-trip').onclick = () => { closeSheet(); openTripForm(); };
    return;
  }

  // In Reisen gruppieren: > 2 Tage ohne Foto = neue Reise (nach echter Zeit, zeitzonenrichtig)
  const sorted = withGps.map(f => ({ f, ...meta.get(f) })).sort((a, b) => (photoTime(a) ?? 0) - (photoTime(b) ?? 0));
  const groups = [];
  for (const p of sorted) {
    const g = groups[groups.length - 1];
    const tm = photoTime(p);
    // Lücke in Kalendertagen (Ortszeit): mehr als 2 Tage ohne Foto = neue Reise
    const gap = g && localDay(p) && g.lastDay ? (Date.parse(localDay(p)) - Date.parse(g.lastDay)) / 864e5 : 0;
    if (!g || gap > 2 || (tm == null) !== (g.lastT == null)) groups.push({ items: [p], extra: [], firstT: tm, lastT: tm, first: localDay(p), last: localDay(p), lastDay: localDay(p) });
    else { g.items.push(p); if (tm != null) g.lastT = tm; if (localDay(p)) g.lastDay = localDay(p); if (localDay(p)) { g.last = localDay(p) > g.last ? localDay(p) : g.last; g.first = g.first && g.first < localDay(p) ? g.first : localDay(p); } }
  }
  // Fotos ohne Ort, aber mit Datum: der passenden Reise zuordnen
  let skipped = 0;
  for (const f of files) {
    const m = meta.get(f); if (m.lat != null) continue;
    const tm = photoTime(m);
    const g = tm != null && groups.find(g => g.firstT != null && tm >= g.firstT - 24 * 36e5 && tm <= g.lastT + 24 * 36e5);
    if (g) g.extra.push({ f, ...m }); else skipped++;
  }
  // Orte je Gruppe
  for (const g of groups) {
    const places = [];
    for (const p of g.items) {
      let pl = places.find(x => dist(x, p) < 15);
      if (!pl) { pl = { ...describe(p.lat, p.lon), items: [], date: localDay(p) }; places.push(pl); }
      pl.items.push(p);
    }
    g.places = places;
    const cids = [...new Set(places.map(p => p.cid).filter(Boolean))];
    g.cids = cids;
    g.title = `${cids.slice(0, 2).map(countryName).join(' & ')}${cids.length > 2 ? ' u. a.' : ''}${g.first ? ' · ' + fmtMonth(g.first) : ''}`;
    const s = g.first, e = g.last;
    g.target = (s && S.trips.find(t => t.start && t.end && !(e < t.start || s > t.end))?.id) || 'new';
    g.use = true;
  }
  const sh = openSheet({ title: 'Reisen aus Fotos', full: true, html: `
    <p class="muted pad">${withGps.length} Fotos mit Ortsdaten${groups.some(g => g.extra.length) ? `, ${groups.reduce((a, g) => a + g.extra.length, 0)} ohne Ort über das Datum zugeordnet` : ''}${skipped ? `, ${skipped} ohne Ort keiner Reise zuzuordnen (übersprungen)` : ''}. Prüfe die Vorschläge:</p>
    <div id="imp-list">${groups.map((g, i) => `
      <div class="card imp">
        <label class="imp-h"><input type="checkbox" class="check" data-use="${i}" checked><span class="grow"><input class="field slim" data-title="${i}" value="${esc(g.title)}"><small>${fmtRange(g.first, g.last)} · ${g.items.length + g.extra.length} Fotos · ${g.cids.map(flagOf).join(' ')}</small></span></label>
        <div class="imp-places">${g.places.map(p => `<span class="pill">${flagOf(p.cid)} ${esc(p.name)} <small>${p.items.length}</small></span>`).join('')}</div>
        <label class="imp-t">Speichern in <select class="field slim" data-target="${i}"><option value="new" ${g.target === 'new' ? 'selected' : ''}>Neue Reise</option>${S.trips.map(t => `<option value="${t.id}" ${g.target === t.id ? 'selected' : ''}>${esc(t.title)}</option>`).join('')}</select></label>
      </div>`).join('')}</div>
    <button class="btn primary wide" id="imp-go">${icon('check')}Übernehmen</button>
    <p class="fine pad">Die Fotos werden verkleinert und nur auf diesem Gerät gespeichert. Die Ortsbestimmung erfolgt offline.</p>` });
  $$('[data-use]', sh).forEach(c => c.onchange = () => groups[+c.dataset.use].use = c.checked);
  $$('[data-title]', sh).forEach(c => c.oninput = () => groups[+c.dataset.title].title = c.value);
  $$('[data-target]', sh).forEach(c => c.onchange = () => groups[+c.dataset.target].target = c.value);
  $('#imp-go', sh).onclick = async () => {
    sh.close();
    let tripsMade = 0, lastTrip = null;
    const jobs = [];
    for (const g of groups.filter(g => g.use)) {
      let t;
      if (g.target === 'new') {
        t = { id: db.uid(), title: g.title || 'Reise', start: g.first || today(), end: g.last || g.first || today(), note: '', color: TRIP_COLORS[(S.trips.length + tripsMade) % TRIP_COLORS.length], created: Date.now() };
        await db.put('trips', t); tripsMade++;
      } else {
        t = tripById(g.target);
        if (g.first && g.first < t.start) t.start = g.first; if (g.last && g.last > t.end) t.end = g.last;
        await db.put('trips', t);
      }
      lastTrip = t;
      const existing = visitsOfTrip(t.id);
      for (const p of g.places) {
        let v = existing.find(x => dist(x, p) < 15);
        if (!v) {
          const lat = p.items.reduce((s, x) => s + x.lat, 0) / p.items.length, lon = p.items.reduce((s, x) => s + x.lon, 0) / p.items.length;
          v = { id: db.uid(), tripId: t.id, name: p.name, lat, lon, cid: p.cid, region: p.region, rid: p.rid, cap: p.cap, date: p.date, rating: 0, note: '', created: Date.now() };
          await db.put('visits', v);
        }
        for (const x of p.items) jobs.push({ file: x.f, visitId: v.id, tripId: t.id });
      }
      for (const x of g.extra) jobs.push({ file: x.f, visitId: null, tripId: t.id });
    }
    await storeJobs(jobs, meta);
    await refresh(); fitAll();
    toast(tripsMade ? `${tripsMade} ${tripsMade === 1 ? 'Reise' : 'Reisen'} erstellt` : 'Fotos übernommen');
    if (lastTrip) { switchTab('trips'); openTrip(lastTrip.id); }
  };
}

// ================= Statistik =================
function renderStats() {
  const el = $('#view-stats');
  const st = computeStats(dataBundle());
  const ach = achievements(st, dataBundle());
  const done = ach.filter(a => a.done).length;
  const ys = years();
  const perYear = ys.slice(0, 8).reverse().map(y => ({ y, ...(st.perYear[y] || { trips: 0, days: 0, newCountries: 0 }) }));
  const maxT = Math.max(1, ...perYear.map(p => p.trips));
  const ring = (v, max, label, sub) => {
    const r = 40, c = 2 * Math.PI * r, f = Math.min(1, v / max);
    return `<div class="ring"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="${r}" class="rbg"/><circle cx="50" cy="50" r="${r}" class="rfg" stroke-dasharray="${c * f} ${c}" transform="rotate(-90 50 50)"/></svg>
      <div class="ring-t"><b>${label}</b><small>${sub}</small></div></div>`;
  };
  el.innerHTML = `
    <header class="large-title"><h1>Statistik</h1><button class="round" id="st-share" aria-label="Weltkarte teilen">${icon('share')}</button></header>
    <div class="card hero-stats">
      ${ring(st.un.length, 195, st.un.length, 'von 195 Staaten')}
      <div class="hs-side">
        <div><b>${fmtNum(st.pct, 1)} %</b><small>der Landfläche der Erde</small></div>
        <div><b>${[...st.contVisited].filter(k => k !== 'AN').length} / 6</b><small>bewohnte Kontinente</small></div>
        ${st.territories.length ? `<div><b>+${st.territories.length}</b><small>weitere Gebiete</small></div>` : ''}
      </div>
    </div>
    <div class="tiles">
      <button class="tile" id="st-trips"><b>${S.trips.length}</b><small>Reisen</small></button>
      <div class="tile"><b>${fmtNum(st.days)}</b><small>Reisetage</small></div>
      <button class="tile" id="st-visits"><b>${S.visits.length}</b><small>Orte</small></button>
      <div class="tile"><b>${fmtNum(st.km)}</b><small>km Luftlinie${S.home ? '' : '*'}</small></div>
      <div class="tile"><b>${fmtNum(st.km / EARTH_KM, 2)}×</b><small>um die Erde</small></div>
      <button class="tile" id="st-caps"><b>${st.capitals.size}</b><small>Hauptstädte</small></button>
    </div>
    ${S.home ? '' : `<p class="fine pad">* Ohne Heimatort zählen nur die Strecken zwischen den Orten. <button class="link" id="st-home">Heimatort festlegen</button></p>`}
    ${S.visits.length ? `<button class="card film-card" id="st-film"><span class="fc-ic">${icon('film')}</span><span class="grow"><b>Dein Reisefilm</b><small>Deine Reisen als animierter Film – zum Verschicken</small></span>${icon('chev', 'chev')}</button>` : ''}

    ${ys.length ? `<div class="card"><h4 class="card-h">Jahresrückblick</h4><div class="chips wrap">${ys.map(y => `<button data-review="${y}">${icon('spark')}${y}</button>`).join('')}</div></div>` : ''}

    ${perYear.length ? `<div class="card"><h4 class="card-h">Reisen pro Jahr</h4>
      <div class="bars" role="img" aria-label="Reisen pro Jahr">${perYear.map(p => `<div class="bar" tabindex="0" data-tip="${p.y}: ${p.trips} ${p.trips === 1 ? 'Reise' : 'Reisen'}, ${p.days} Tage, ${p.newCountries} neue Länder">
        <span class="bv">${p.trips || ''}</span><i style="height:${(p.trips / maxT) * 100}%"></i><span class="bl">${p.y.slice(2) === p.y ? p.y : '’' + p.y.slice(2)}</span></div>`).join('')}</div>
      <div class="bar-tip muted small" id="bar-tip">Tippe auf einen Balken für Details.</div></div>` : ''}

    <div class="card"><h4 class="card-h">Staaten nach Kontinent</h4>
      ${CONTINENT_ORDER.filter(k => st.cont[k].total).map(k => `<div class="prog"><span>${CONTINENTS[k]}</span><span class="pv">${st.cont[k].visited} / ${st.cont[k].total}</span>
        <div class="pbar"><i style="width:${st.cont[k].visited / st.cont[k].total * 100}%"></i></div></div>`).join('')}
    </div>

    ${regionCard(st)}

    ${st.visits.length ? `<div class="card"><h4 class="card-h">Rekorde</h4><div class="list plain">
      ${st.farthest ? recRow('home', 'Am weitesten weg', st.farthest.v, `${fmtNum(st.farthest.d)} km`) : ''}
      ${recRow('stats', 'Nördlichster Ort', st.ext.n, `${st.ext.n.lat.toFixed(1)}° ${st.ext.n.lat >= 0 ? 'N' : 'S'}`)}
      ${recRow('stats', 'Südlichster Ort', st.ext.s, `${Math.abs(st.ext.s.lat).toFixed(1)}° ${st.ext.s.lat >= 0 ? 'N' : 'S'}`)}
      ${recRow('stats', 'Östlichster Ort', st.ext.e, `${Math.abs(st.ext.e.lon).toFixed(1)}° ${st.ext.e.lon >= 0 ? 'O' : 'W'}`)}
      ${recRow('stats', 'Westlichster Ort', st.ext.w, `${Math.abs(st.ext.w.lon).toFixed(1)}° ${st.ext.w.lon >= 0 ? 'O' : 'W'}`)}
    </div></div>` : ''}

    ${st.topCountries.length ? `<div class="card"><h4 class="card-h">Lieblingsländer</h4><div class="list plain">
      ${st.topCountries.map(([id, n]) => `<button class="row" data-tc="${id}"><span class="lead flag">${flagOf(id)}</span><span class="grow">${esc(countryName(id))}</span><span class="muted">${n} ${n === 1 ? 'Reise' : 'Reisen'}</span>${icon('chev', 'chev')}</button>`).join('')}</div></div>` : ''}

    <div class="card"><h4 class="card-h">Erfolge <span class="muted">${done} / ${ach.length}</span></h4>
      <div class="ach">${ach.map(a => `<div class="ach-i ${a.done ? 'done' : ''}"><span class="ai">${icon(a.icon, 'em')}</span><b>${esc(a.title)}</b><small>${esc(a.text)}</small>
        ${a.done ? '<em>Geschafft</em>' : `<div class="pbar sm"><i style="width:${Math.min(100, a.value / a.goal * 100)}%"></i></div><small class="pv">${fmtNum(Math.min(a.value, a.goal))} / ${fmtNum(a.goal)}</small>`}</div>`).join('')}</div></div>
    <div class="spacer"></div>`;
  $('#st-share').onclick = () => shareWorld();
  if ($('#st-film')) $('#st-film').onclick = () => openFilmStart();
  $('#st-visits').onclick = () => openAllVisits();
  $('#st-trips').onclick = () => switchTab('trips');
  $('#st-caps').onclick = () => openAllVisits({ onlyCapitals: true });
  if ($('#st-home')) $('#st-home').onclick = setHome;
  $$('[data-review]', el).forEach(b => b.onclick = () => openReview(b.dataset.review));
  $$('[data-rc]', el).forEach(b => b.onclick = () => openRegionChecklist(b.dataset.rc));
  $$('[data-visit]', el).forEach(b => b.onclick = () => openVisit(b.dataset.visit));
  $$('[data-tc]', el).forEach(b => b.onclick = () => openCountry(b.dataset.tc));
  $$('.bar', el).forEach(b => b.onclick = b.onfocus = () => { $$('.bar', el).forEach(x => x.classList.toggle('on', x === b)); $('#bar-tip').textContent = b.dataset.tip; });
}
function regionCard(st) {
  const rows = Object.entries(st.regionsByCountry).map(([cid, set]) => ({ cid, n: set.size, total: geo.regionsOf.get(cid)?.length || 0 }))
    .filter(r => r.total > 1).sort((a, b) => b.n - a.n || b.n / b.total - a.n / a.total).slice(0, 6);
  if (!rows.length) return geo.regions.length ? '' : '';
  return `<div class="card"><h4 class="card-h">Regionen <span class="muted">${st.regions.size} insgesamt</span></h4>
    ${rows.map(r => `<button class="prog tl" data-rc="${r.cid}"><span>${flagOf(r.cid)} ${esc(countryName(r.cid))}</span><span class="pv">${r.n} / ${r.total} ${regionWord(r.cid)}</span>
      <div class="pbar"><i style="width:${r.n / r.total * 100}%"></i></div></button>`).join('')}
    <p class="fine">Tippe auf ein Land, um weitere Regionen abzuhaken.</p></div>`;
}
const recRow = (ic, label, v, val) => v ? `<button class="row" data-visit="${v.id}">${icon(ic, 'lead')}<span class="grow">${label}<small>${flagOf(v.cid)} ${esc(v.name)}</small></span><span class="muted">${val}</span></button>` : '';

async function shareWorld(year = null) {
  const pr = progress('Bild wird erstellt …');
  const st = computeStats(dataBundle(), { year });
  const { vis, wish } = mapSets(year || 'all');
  const blob = await renderShareCard({
    title: year ? `Mein Reisejahr ${year}` : 'Wo war ich?', subtitle: year ? `${st.trips.length} Reisen · ${st.days} Tage unterwegs` : `${st.un.length} Staaten · ${fmtNum(st.pct, 1)} % der Welt`,
    tiles: [{ value: st.un.length, label: 'Staaten' }, { value: [...st.contVisited].filter(k => k !== 'AN').length, label: 'Kontinente' }, { value: fmtNum(st.km), label: 'km Luftlinie' }],
    visited: vis, wish: year ? new Set() : wish, pins: st.visits.map(v => ({ lat: v.lat, lon: v.lon })),
    photos: st.photos.slice(-4),
  });
  pr.done();
  await shareBlob(blob, year ? `WowarWahr-${year}.png` : 'WowarWahr-Weltkarte.png', 'Meine Reisekarte');
}

// ---------- Jahresrückblick ----------
function openReview(year) {
  const st = computeStats(dataBundle(), { year });
  const { vis } = mapSets(year);
  const ph = st.photos;
  const cont = [...new Set([...vis].map(id => country(id)?.k).filter(Boolean))];
  const topTrip = [...st.trips].sort((a, b) => daysBetween(b.start, b.end) - daysBetween(a.start, a.end))[0];
  const slides = [
    `<div class="rv-s rv-a"><small>WowarWahr</small><h1>Dein Reisejahr<br>${year}</h1><p>Tippe, um weiterzublättern</p></div>`,
    `<div class="rv-s rv-b"><div class="big">${st.trips.length}</div><h2>${st.trips.length === 1 ? 'Reise' : 'Reisen'}</h2><p>${fmtNum(st.days)} Tage unterwegs an ${st.visits.length} Orten.</p>${topTrip ? `<p class="soft">Längste Reise: <b>${esc(topTrip.title)}</b> (${daysBetween(topTrip.start, topTrip.end)} Tage)</p>` : ''}</div>`,
    `<div class="rv-s rv-c"><div class="big">${vis.size}</div><h2>${vis.size === 1 ? 'Land' : 'Länder'}</h2><div class="rv-flags">${[...vis].map(id => `<span>${flagOf(id)}</span>`).join('')}</div>${st.newThisYear.length ? `<p>Davon <b>${st.newThisYear.length} zum ersten Mal</b>: ${st.newThisYear.map(countryName).map(esc).join(', ')}</p>` : ''}<p class="soft">${cont.map(k => CONTINENTS[k]).join(' · ')}</p></div>`,
    `<div class="rv-s rv-d"><canvas id="rv-map"></canvas><h2>${fmtNum(st.km)} km</h2><p>Luftlinie – das sind ${fmtNum(st.km / EARTH_KM * 100)} % einer Erdumrundung.</p>${st.farthest ? `<p class="soft">Am weitesten weg: <b>${esc(st.farthest.v.name)}</b>, ${fmtNum(st.farthest.d)} km von zu Hause</p>` : ''}</div>`,
    ...(ph.length ? [`<div class="rv-s rv-e"><h2>Momente</h2><div class="rv-grid">${ph.slice(0, 9).map(p => `<img src="${thumbURL(p)}" alt="">`).join('')}</div></div>`] : []),
    `<div class="rv-s rv-f"><h2>Was für ein Jahr!</h2><p>Teile deinen Rückblick als Bild.</p><button class="btn primary" id="rv-share">${icon('share')}Rückblick teilen</button><button class="btn light" id="rv-close">Schließen</button></div>`,
  ];
  const el = document.createElement('div'); el.className = 'review';
  el.innerHTML = `<div class="rv-bars">${slides.map(() => '<i><b></b></i>').join('')}</div><button class="icon-btn light rv-home" data-home aria-label="Zur Startseite">${icon('start')}</button><button class="icon-btn light rv-x" aria-label="Schließen">${icon('close')}</button><div class="rv-stage"></div>`;
  $("#sheets").appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  let i = 0;
  const close = () => { el.classList.remove('in'); setTimeout(() => el.remove(), 300); };
  const show = () => {
    $('.rv-stage', el).innerHTML = slides[i];
    $$('.rv-bars i', el).forEach((b, k) => b.className = k < i ? 'done' : k === i ? 'now' : '');
    const cv = $('#rv-map', el);
    if (cv) {
      const r = cv.getBoundingClientRect(), dpr = Math.min(3, devicePixelRatio || 1);
      cv.width = r.width * dpr; cv.height = r.height * dpr;
      const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
      const pts = st.visits.map(v => ({ lat: v.lat, lon: v.lon }));
      renderMap(ctx, r.width, r.height, fitView(r.width, r.height, pts.length ? boundsOf(S.home ? [...pts, S.home] : pts, 10) : [-180, -56, 180, 76], 20),
        { visited: vis, pins: pts, cluster: false, cities: false, home: S.home, routes: st.trips.map(t => ({ points: tripRoute(t, S.visits, S.home), color: t.color, width: 2.5 })) });
    }
    if ($('#rv-share', el)) $('#rv-share', el).onclick = e => { e.stopPropagation(); shareWorld(year); };
    if ($('#rv-close', el)) $('#rv-close', el).onclick = e => { e.stopPropagation(); close(); };
  };
  $('.rv-x', el).onclick = e => { e.stopPropagation(); close(); };
  $('.rv-stage', el).onclick = e => {
    if (e.target.closest('button')) return;
    if (e.clientX < innerWidth * 0.3) i = Math.max(0, i - 1);
    else if (i < slides.length - 1) i++;
    show();
  };
  show();
}

// ================= Wünsche =================
function renderWish() {
  const el = $('#view-wish');
  const st = computeStats(dataBundle());
  const wc = S.countries.filter(c => c.wish);
  const openC = wc.filter(c => !st.visited.has(c.id)), doneC = wc.filter(c => st.visited.has(c.id));
  const openP = S.wishes.filter(w => !wishDone(w)), doneP = S.wishes.filter(w => wishDone(w));
  const sortP = a => a.sort((x, y) => (y.prio || 0) - (x.prio || 0) || x.name.localeCompare(y.name, 'de'));
  el.innerHTML = `
    <header class="large-title"><h1>Wünsche</h1><button class="round accent" id="w-add" aria-label="Wunschziel hinzufügen">${icon('plus')}</button></header>
    ${!wc.length && !S.wishes.length ? `<div class="empty">${icon('star')}<h3>Wohin soll es noch gehen?</h3><p>Sammle Länder und Orte, die du unbedingt noch sehen willst. Auf der Karte erscheinen sie gestrichelt bzw. als goldene Punkte – und sobald du dort warst, gilt der Wunsch als erfüllt.</p><button class="btn primary" id="w-add2">${icon('plus')}Wunschziel hinzufügen</button></div>` : ''}
    ${openC.length ? `<h4 class="sec">Wunschländer</h4><div class="list card">${sortP(openC.map(c => ({ ...c, name: countryName(c.id) }))).map(c => `
      <div class="row"><span class="lead flag">${flagOf(c.id)}</span><button class="grow tl" data-copen="${c.id}">${esc(c.name)}<small>${CONTINENTS[country(c.id)?.k] || ''}</small></button>
      <button class="prio ${c.prio ? 'on' : ''}" data-cprio="${c.id}" aria-label="Priorität">${icon('starfill', 'em')}</button><button class="icon-btn sm" data-cdel="${c.id}" aria-label="Entfernen">${icon('close')}</button></div>`).join('')}</div>` : ''}
    ${openP.length ? `<h4 class="sec">Wunschorte</h4><div class="list card">${sortP(openP).map(w => `
      <div class="row"><span class="lead flag">${flagOf(w.cid)}</span><button class="grow tl" data-wopen="${w.id}">${esc(w.name)}<small>${esc(countryName(w.cid))}${w.note ? ' · ' + esc(w.note) : ''}</small></button>
      <button class="prio ${w.prio ? 'on' : ''}" data-wprio="${w.id}" aria-label="Priorität">${icon('starfill', 'em')}</button><button class="icon-btn sm" data-wdel="${w.id}" aria-label="Entfernen">${icon('close')}</button></div>`).join('')}</div>` : ''}
    ${doneC.length || doneP.length ? `<h4 class="sec">Erfüllt</h4><div class="list card">${doneC.map(c => `<button class="row done" data-copen="${c.id}"><span class="lead flag">${flagOf(c.id)}</span><span class="grow">${esc(countryName(c.id))}</span>${icon('check', 'ok')}</button>`).join('')}${doneP.map(w => `<button class="row done" data-wopen="${w.id}"><span class="lead flag">${flagOf(w.cid)}</span><span class="grow">${esc(w.name)}</span>${icon('check', 'ok')}</button>`).join('')}</div>` : ''}
    <div class="spacer"></div>`;
  const add = async () => {
    const p = await choosePlace({ title: 'Wunschziel' });
    if (!p) return;
    const isCountry = country(p.cid) && p.name === countryName(p.cid) && !p.region;
    if (isCountry) await db.put('countries', { ...countryRec(p.cid), wish: true });
    else await db.put('wishes', { id: db.uid(), ...p, note: '', prio: 0, created: Date.now() });
    await refresh(); toast(`${p.name} auf der Wunschliste`);
  };
  $('#w-add').onclick = add; if ($('#w-add2')) $('#w-add2').onclick = add;
  $$('[data-cprio]', el).forEach(b => b.onclick = async () => { const r = countryRec(b.dataset.cprio); await db.put('countries', { ...r, prio: r.prio ? 0 : 1 }); await refresh(); });
  $$('[data-cdel]', el).forEach(b => b.onclick = async () => { const r = countryRec(b.dataset.cdel); await db.put('countries', { ...r, wish: false }); await refresh(); });
  $$('[data-wprio]', el).forEach(b => b.onclick = async () => { const w = S.wishes.find(x => x.id === b.dataset.wprio); await db.put('wishes', { ...w, prio: w.prio ? 0 : 1 }); await refresh(); });
  $$('[data-wdel]', el).forEach(b => b.onclick = async () => { await db.del('wishes', b.dataset.wdel); await refresh(); });
  $$('[data-wopen]', el).forEach(b => b.onclick = () => openWishPlace(b.dataset.wopen));
  $$('[data-copen]', el).forEach(b => b.onclick = () => openCountry(b.dataset.copen));
}

function openWishPlace(id) {
  const w = S.wishes.find(x => x.id === id); if (!w) return;
  const sh = openSheet({ title: w.name, html: `
    <div class="visit-head"><span class="flag-l">${flagOf(w.cid)}</span><div><b>${esc(w.name)}</b><small>Wunschziel · ${[w.region, countryName(w.cid)].filter(Boolean).map(esc).join(', ')}</small></div></div>
    <form class="form" id="wf"><label>Notiz<textarea class="field" name="note" rows="3" placeholder="Warum dorthin? Wann?">${esc(w.note || '')}</textarea></label>
    <div class="btn-row"><button class="btn" type="button" id="wf-map">${icon('map')}Auf Karte</button><button class="btn primary" type="submit">Speichern</button></div>
    <button class="btn wide" type="button" id="wf-done">${icon('check')}Ich war dort! Als Ort eintragen</button></form>` });
  $('#wf', sh).onsubmit = async e => { e.preventDefault(); w.note = new FormData(e.target).get('note'); await db.put('wishes', w); sh.close(); await refresh(); };
  $('#wf-map', sh).onclick = () => { closeAllSheets(); switchTab('map'); S.map.flyTo([w.lon - 2, w.lat - 1.3, w.lon + 2, w.lat + 1.3], 40); };
  $('#wf-done', sh).onclick = () => { sh.close(); openVisitForm(null, { place: { name: w.name, lat: w.lat, lon: w.lon, cid: w.cid, region: w.region || '', cap: !!w.cap } }); };
}

// ================= Mehr =================
async function renderMore() {
  const el = $('#view-more');
  let storage = '';
  try { if (navigator.storage?.estimate) { const e = await navigator.storage.estimate(); storage = `${fmtNum(e.usage / 1048576, 1)} MB belegt`; } } catch (e) {}
  const demo = S.trips.some(t => t.demo);
  const last = await db.setting('lastBackup');
  el.innerHTML = `
    <header class="large-title"><h1>Mehr</h1></header>
    ${backupBanner()}
    <div class="list card">
      <a class="row" href="./index.html#unterwegs">${icon('back', 'lead')}<span class="grow">Zur WahrZentrale</span></a>
    </div>
    <h4 class="sec">Einstellungen</h4>
    <div class="list card">
      <button class="row" id="m-home">${icon('home', 'lead')}<span class="grow">Heimatort<small>${S.home ? esc(S.home.name) + ' · ' + esc(countryName(S.home.cid)) : 'Noch nicht festgelegt'}</small></span>${icon('chev', 'chev')}</button>
      <label class="row">${icon('moon', 'lead')}<span class="grow">Dunkelmodus<small>Gilt für alle Apps der WahrZentrale</small></span><input type="checkbox" class="switch" id="m-dark" ${document.documentElement.getAttribute('data-theme') === 'dark' ? 'checked' : ''}></label>
      <button class="row" id="m-check">${icon('list', 'lead')}<span class="grow">Länder abhaken</span>${icon('chev', 'chev')}</button>
      <button class="row" id="m-film">${icon('film', 'lead')}<span class="grow">Reisefilm<small>Animierter Film deiner Reisen zum Teilen</small></span>${icon('chev', 'chev')}</button>
      <button class="row" id="m-compass">${icon('compass', 'lead')}<span class="grow">Sehnsuchts-Kompass<small>In welcher Richtung liegen deine Orte?</small></span>${icon('chev', 'chev')}</button>
      <button class="row" id="m-globe">${icon('orbit', 'lead')}<span class="grow">3D-Globus<small>Mit Tag und Nacht in Echtzeit</small></span>${icon('chev', 'chev')}</button>
      <button class="row" id="m-allvisits">${icon('pin', 'lead')}<span class="grow">Alle Orte<small>${S.visits.length} besucht${S.visits.length === 1 ? 'er Ort' : 'e Orte'}</small></span>${icon('chev', 'chev')}</button>
    </div>
    <h4 class="sec">Daten</h4>
    <div class="list card">
      <button class="row" id="m-export">${icon('download', 'lead')}<span class="grow">Sicherung erstellen<small>${last ? 'Zuletzt: ' + fmtDate(last.slice(0, 10)) : 'Noch keine Sicherung'} · ZIP mit allen Daten und Fotos</small></span>${icon('chev', 'chev')}</button>
      <button class="row" id="m-import">${icon('upload', 'lead')}<span class="grow">Sicherung wiederherstellen</span>${icon('chev', 'chev')}</button>
      <div class="row">${icon('info', 'lead')}<span class="grow">Speicher<small>${S.trips.length} Reisen · ${S.visits.length} Orte · ${S.photos.length} Fotos${storage ? ' · ' + storage : ''}</small></span></div>
      ${demo ? `<button class="row" id="m-demo-x">${icon('trash', 'lead')}<span class="grow">Beispielreisen entfernen</span></button>` : `<button class="row" id="m-demo">${icon('spark', 'lead')}<span class="grow">Beispielreisen laden</span></button>`}
      <button class="row danger" id="m-wipe">${icon('trash', 'lead')}<span class="grow">Alle Daten löschen</span></button>
    </div>
    <p class="fine pad">Deine Daten liegen nur in dieser App auf deinem Smartphone. Wenn du die App vom Home-Bildschirm entfernst oder Websitedaten löschst, sind sie weg – erstelle deshalb ab und zu eine Sicherung (z. B. in deiner Dateiablage oder einem Cloud-Speicher).</p>
    <h4 class="sec">Rechtliches</h4>
    <div class="list card">
      <button class="row" data-legal="impressum">${icon('doc', 'lead')}<span class="grow">Impressum</span>${icon('chev', 'chev')}</button>
      <button class="row" data-legal="datenschutz">${icon('shield', 'lead')}<span class="grow">Datenschutz</span>${icon('chev', 'chev')}</button>
      <button class="row" data-legal="lizenzen">${icon('info', 'lead')}<span class="grow">Lizenzen & Quellen</span>${icon('chev', 'chev')}</button>
    </div>
    <div class="about"><div class="app-ic">${icon('globe')}</div><b>WowarWahr</b><small>Version ${VERSION} · Teil der Wahr-Familie</small><small>© 2026 Jan Dierlich · Alle Rechte vorbehalten</small></div>
    <div class="spacer"></div>`;
  bindBackupBanner(el);
  $('#m-home').onclick = setHome;
  $('#m-dark').onchange = e => {
    try { localStorage.setItem('reisewahr-theme', e.target.checked ? 'dark' : 'light'); } catch (err) {}
    // Kartenfarben werden beim Start festgelegt – daher kurz neu laden, zurück auf „Mehr“
    try { sessionStorage.setItem('wow-tab', 'more'); } catch (err) {}
    location.reload();
  };
  $('#m-check').onclick = openChecklist;
  $('#m-allvisits').onclick = () => openAllVisits();
  $('#m-film').onclick = () => openFilmStart();
  $('#m-globe').onclick = () => showGlobe();
  $('#m-compass').onclick = () => showCompass();
  $('#m-export').onclick = exportBackup;
  $('#m-import').onclick = importBackup;
  if ($('#m-demo')) $('#m-demo').onclick = loadDemo;
  if ($('#m-demo-x')) $('#m-demo-x').onclick = removeDemo;
  $('#m-wipe').onclick = async () => {
    if (!await confirmDialog('Alle Daten löschen?', 'Alle Reisen, Orte, Fotos, Wunschziele und Einstellungen werden unwiderruflich gelöscht.', 'Weiter', true)) return;
    if (!await confirmDialog('Wirklich alles löschen?', 'Dies kann nicht rückgängig gemacht werden. Hast du eine Sicherung?', 'Endgültig löschen', true)) return;
    await db.clearAll(); await refresh(); toast('Alle Daten gelöscht');
  };
  $$('[data-legal]', el).forEach(b => b.onclick = () => openLegal(b.dataset.legal));
}

async function setHome() {
  const p = await choosePlace({ title: 'Heimatort', allowCountry: false });
  if (!p) return;
  S.home = { name: p.name, lat: p.lat, lon: p.lon, cid: p.cid };
  await db.setSetting('home', S.home);
  await refresh(); toast(`Heimatort: ${p.name}`);
}

// ---------- Sicherung ----------
// Sicherung als ZIP: data.json + Fotos als Binärdateien (speicherschonend)
async function exportBackup() {
  const pr = progress('Sicherung wird erstellt …');
  try {
    const zip = new ZipWriter();
    const settings = await db.all('settings');
    const photos = S.photos.map(({ blob, thumb, ...rest }) => ({ ...rest, hasThumb: !!thumb }));
    const data = { app: 'WowarWahr', format: 2, version: VERSION, exported: new Date().toISOString(),
      trips: S.trips, visits: S.visits, countries: S.countries, regions: S.regions, wishes: S.wishes, settings, photos };
    await zip.add('data.json', JSON.stringify(data));
    let i = 0;
    for (const p of S.photos) {
      await zip.add(`photos/${p.id}.jpg`, p.blob);
      if (p.thumb) await zip.add(`thumbs/${p.id}.jpg`, p.thumb);
      if (++i % 10 === 0) pr.update(`Sicherung wird erstellt … ${i}/${S.photos.length} Fotos`);
    }
    const blob = zip.finish();
    pr.done();
    const r = await shareBlob(blob, `WowarWahr-Sicherung-${today()}.zip`, 'WowarWahr-Sicherung');
    if (r !== 'aborted') { S.lastBackup = new Date().toISOString(); await db.setSetting('lastBackup', S.lastBackup); renderAll(); }
  } catch (e) { console.error(e); pr.done('Sicherung fehlgeschlagen'); }
}
async function importBackup() {
  const [file] = await pickFiles({ multiple: false, accept: '.zip,application/zip,application/json,.json' });
  if (!file) return;
  let data, zip = null;
  try {
    const sig = new Uint8Array(await file.slice(0, 2).arrayBuffer());
    if (sig[0] === 0x50 && sig[1] === 0x4B) { zip = await readZip(file); data = JSON.parse(await zip.text('data.json')); }
    else data = JSON.parse(await file.text());
  } catch (e) { return toast('Datei konnte nicht gelesen werden'); }
  if (!data || data.app !== 'WowarWahr') return toast('Das ist keine WowarWahr-Sicherung');
  if (!await confirmDialog('Sicherung wiederherstellen?', `${data.trips.length} Reisen, ${data.visits.length} Orte und ${data.photos.length} Fotos vom ${fmtDate(data.exported)}. Deine aktuellen Daten werden dabei ersetzt.`, 'Wiederherstellen', true)) return;
  const pr = progress('Wird wiederhergestellt …');
  try {
    await db.clearAll();
    for (const st of ['trips', 'visits', 'countries', 'wishes', 'settings', 'regions']) for (const o of data[st] || []) await db.put(st, o);
    let i = 0;
    for (const p of data.photos || []) {
      let blob, thumb;
      if (zip) { blob = await zip.blob(`photos/${p.id}.jpg`, 'image/jpeg'); thumb = p.hasThumb ? await zip.blob(`thumbs/${p.id}.jpg`, 'image/jpeg') : null;
        // als eigenständige Blobs übernehmen (nicht an die Datei gebunden)
        blob = blob && new Blob([await blob.arrayBuffer()], { type: 'image/jpeg' }); thumb = thumb && new Blob([await thumb.arrayBuffer()], { type: 'image/jpeg' }); }
      else { blob = await dataURLToBlob(p.blob); thumb = p.thumb ? await dataURLToBlob(p.thumb) : null; }
      if (!blob) continue;
      const { hasThumb, ...rest } = p;
      await db.put('photos', { ...rest, blob, thumb });
      if (++i % 10 === 0) pr.update(`Fotos … ${i}/${data.photos.length}`);
    }
    await refresh(); pr.done('Sicherung wiederhergestellt');
  } catch (e) { console.error(e); pr.done('Wiederherstellung fehlgeschlagen'); }
}

// ---------- Beispiele ----------
async function loadDemo() {
  const mk = (name, cc) => {
    const r = geo.places.find(p => p.name === name && (!cc || p.cid === cc));
    return r ? { name: r.name, lat: r.lat, lon: r.lon, cid: r.cid, region: r.region, cap: r.cap } : null;
  };
  const trips = [
    { title: 'Südsee-Abenteuer', start: '2026-02-03', end: '2026-02-22', color: TRIP_COLORS[5], note: 'Über die Datumsgrenze – zweimal den gleichen Tag erlebt.', stops: [['Auckland', 'NZ', 5], ['Suva', 'FJ', 4], ['Honolulu', 'US', 5]] },
    { title: 'Städtetour Ost', start: '2025-09-05', end: '2025-09-09', color: TRIP_COLORS[0], note: '', stops: [['Berlin', 'DE', 5], ['Dresden', 'DE', 4], ['Leipzig', 'DE', 4]] },
    { title: 'Toskana & Rom', start: '2025-07-12', end: '2025-07-24', color: TRIP_COLORS[1], note: 'Pizza in Neapel war leider nicht drin – nächstes Mal!', stops: [['Florenz', 'IT', 5], ['Siena', 'IT', 4], ['Rom', 'IT', 5]] },
    { title: 'Kopenhagen-Wochenende', start: '2025-04-18', end: '2025-04-21', color: TRIP_COLORS[3], note: '', stops: [['Kopenhagen', 'DK', 4], ['Malmö', 'SE', 3]] },
    { title: 'Florida Keys', start: '2024-10-02', end: '2024-10-16', color: TRIP_COLORS[2], note: 'Sonnenuntergang in Key West!', stops: [['Miami', 'US', 4], ['Key West', 'US', 5], ['Orlando', 'US', 3]] },
    { title: 'Lissabon & Porto', start: '2024-05-08', end: '2024-05-15', color: TRIP_COLORS[0], note: '', stops: [['Lissabon', 'PT', 5], ['Porto', 'PT', 5]] },
    { title: 'Japan-Rundreise', start: '2023-03-25', end: '2023-04-09', color: TRIP_COLORS[4], note: 'Kirschblüte in Kyoto.', stops: [['Tokio', 'JP', 5], ['Kyōto', 'JP', 5], ['Ōsaka', 'JP', 4]] },
  ];
  for (const t of trips) {
    const trip = { id: db.uid(), title: t.title, start: t.start, end: t.end, color: t.color, note: t.note, demo: true, created: Date.now() };
    await db.put('trips', trip);
    let d = 0;
    for (const [n, cc, r] of t.stops) {
      const p = mk(n, cc) || mk(n.normalize('NFD').replace(/[̀-ͯ]/g, ''), cc);
      if (!p) continue;
      const date = new Date(Date.parse(t.start) + d * 864e5).toISOString().slice(0, 10); d += 3;
      const v = { id: db.uid(), tripId: trip.id, ...p, date, rating: r, note: '', demo: true, created: Date.now() + d };
      assignRegion(v);
      await db.put('visits', v);
    }
  }
  for (const id of ['AT', 'CH', 'FR', 'NL', 'ES']) await db.put('countries', { ...countryRec(id), visited: true, demo: true });
  for (const id of ['IS', 'NZ']) await db.put('countries', { ...countryRec(id), wish: true, demo: true });
  const ha = mk('Hamburg', 'DE');
  if (!S.home && ha) { await db.setSetting('home', { ...ha, demo: true }); }
  await refresh(); fitAll(); toast('Beispielreisen geladen – unter „Mehr“ wieder entfernbar');
}
async function removeDemo() {
  for (const t of S.trips.filter(t => t.demo)) await db.del('trips', t.id);
  for (const v of S.visits.filter(v => v.demo)) { for (const p of photosOfVisit(v.id)) await db.del('photos', p.id); await db.del('visits', v.id); }
  for (const c of S.countries.filter(c => c.demo)) await db.del('countries', c.id);
  if (S.home?.demo) await db.del('settings', 'home');
  await refresh(); toast('Beispielreisen entfernt');
}

// ---------- Rechtliches ----------
function openLegal(kind) {
  if (kind === 'impressum') { location.href = './impressum.html'; return; }
  if (kind === 'datenschutz') { location.href = './datenschutz.html#wow'; return; }
  const T = {
    lizenzen: ['Lizenzen & Quellen', `
      <h3>WowarWahr</h3><p>© 2026 Jan Dierlich. Alle Rechte vorbehalten. Programmcode, Gestaltung, Texte, Symbole und App-Icon sind eigene Werke. Ausgenommen sind die unten genannten Daten Dritter, für die deren Lizenzen gelten.</p>
      <h3>Kartendaten</h3><p>Ländergrenzen, Regionen (z. B. Bundesländer), Seen, Flüsse, Ländernamen und rund 7.300 größere Städte stammen von <b>Natural Earth</b> (naturalearthdata.com) und sind gemeinfrei (Public Domain). „Made with Natural Earth.“ Die Daten wurden für die App vereinfacht.</p>
      <h3>Ortsverzeichnis</h3><p>Rund 150.000 weitere Orte stammen von <b>GeoNames</b> (geonames.org), lizenziert unter der Creative Commons Namensnennung 4.0 International (CC BY 4.0, creativecommons.org/licenses/by/4.0/). Bezogen über die Aufbereitung „cities.json“ (github.com/lutangar/cities.json). Änderungen: auf Name, Koordinaten und Land reduziert, Dubletten zu Natural Earth entfernt, Koordinaten gerundet.</p>
      <p>Die Darstellung von Grenzen und Gebieten folgt Natural Earth (De-facto-Grenzen) und stellt keine politische Wertung dar. Kleine Inseln und Gebiete sind vereinfacht oder nicht dargestellt.</p>
      <h3>Symbole und Länderkennungen</h3><p>Alle Symbole der App (Tags, Erfolge, Sterne, Bedienelemente) sind eigenständig gezeichnete Vektorgrafiken. Länder werden mit ihrem zweistelligen ISO-3166-Code (z. B. „DE“) in einem eigenen Kürzel-Symbol gekennzeichnet; es werden keine Emojis, Flaggengrafiken oder Symbolschriften verwendet.</p>
      <h3>Schriften</h3><p>Es werden ausschließlich die auf dem Smartphone vorhandenen Systemschriften verwendet. Es werden keine Web-Schriften geladen oder mitgeliefert.</p>
      <h3>Bibliotheken</h3><p>Keine. Kartendarstellung, 3D-Globus, Sonnenstands-Berechnung (nach allgemein bekannten astronomischen Näherungsformeln), Kompass, Reisefilm, Foto-Metadaten-Leser, ZIP-Sicherung und alle übrigen Funktionen sind eigenständig programmiert. Die Videoaufnahme nutzt die im Browser eingebaute Aufnahmefunktion (MediaRecorder). Es werden keine Kartenkacheln, Schnittstellen oder Skripte Dritter geladen.</p>
      <h3>Externer Link</h3><p>Der optionale Link zu openstreetmap.org führt zu einer externen Website; Kartendaten dort © OpenStreetMap-Mitwirkende (ODbL).</p>`],
  }[kind];
  openSheet({ title: T[0], full: true, html: `<div class="legal">${T[1]}</div>` });
}

// Querformat-Hinweis & Start
init().catch(e => { console.error(e); const s = $('#splash'); if (s) s.innerHTML = `<p style="padding:24px">Die App konnte nicht geladen werden.<br><small>${esc(e.message)}</small></p>`; });
