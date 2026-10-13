// WowarWahr – Geodaten: Länder, Regionen, Orte, Projektion, Suche, Entfernungen
// Quellen: Natural Earth (Public Domain) · GeoNames (CC BY 4.0)

export const CONTINENTS = {
  EU: 'Europa', AS: 'Asien', AF: 'Afrika', NA: 'Nordamerika',
  SA: 'Südamerika', OC: 'Ozeanien', AN: 'Antarktis'
};
export const CONTINENT_ORDER = ['EU', 'AS', 'AF', 'NA', 'SA', 'OC', 'AN'];

export const geo = {
  world: [], byId: new Map(),
  places: [],            // Natural Earth (mit Einwohnerzahl)
  plus: [],              // GeoNames (kleinere Orte)
  regions: [], regionById: new Map(), regionsOf: new Map(),
  hi: null, water: null,
  ready: null, extraReady: null, plusReady: null,
  listeners: new Set(),
};
const grid = new Map(); // 1°-Raster für schnelle Umkreissuche
const gkey = (lat, lon) => `${Math.floor(lat)},${Math.floor(lon)}`;
function addGrid(p) { const k = gkey(p.lat, p.lon); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(p); }

function decode(arr, q = 100) {
  const out = new Float64Array(arr.length);
  let x = 0, y = 0;
  for (let i = 0; i < arr.length; i += 2) { x += arr[i]; y += arr[i + 1]; out[i] = x / q; out[i + 1] = y / q; }
  return out;
}
const emit = what => geo.listeners.forEach(f => { try { f(what); } catch (e) {} });

export function loadGeo() {
  if (geo.ready) return geo.ready;
  geo.ready = Promise.all([
    fetch('wow-world.json').then(r => r.json()),
    fetch('wow-places.json').then(r => r.json()),
  ]).then(([world, places]) => {
    for (const c of world) {
      c.polys = c.p.map(poly => poly.map(r => decode(r)));
      delete c.p;
      c.flag = flagOf(c.id);
      geo.byId.set(c.id, c);
    }
    geo.world = world;
    geo.places = places.map(p => ({ name: p[0], lat: p[1], lon: p[2], cid: p[3], region: p[4], pop: p[5], cap: p[6] === 1, key: norm(p[0]), ne: true }));
    geo.places.forEach(addGrid);
    return geo;
  });
  return geo.ready;
}

// Zusatzebenen im Hintergrund laden (Regionen, feine Grenzen, Gewässer)
export function loadExtra() {
  if (geo.extraReady) return geo.extraReady;
  const get = u => fetch(u).then(r => { if (!r.ok) throw new Error(u); return r.json(); });
  geo.extraReady = (async () => {
    try {
      const regions = await get('wow-regions.json');
      for (const r of regions) {
        r.polys = r.p.map(x => decode(x)); delete r.p;
        geo.regionById.set(r.id, r);
        let a = geo.regionsOf.get(r.c); if (!a) geo.regionsOf.set(r.c, a = []); a.push(r);
      }
      for (const a of geo.regionsOf.values()) a.sort((x, y) => x.n.localeCompare(y.n, 'de'));
      geo.regions = regions; emit('regions');
    } catch (e) { console.warn('Regionen nicht geladen', e); }
    try {
      const w = await get('wow-water.json');
      geo.water = { lakes: w.lakes.map(r => decode(r, 1000)), rivers: w.rivers.map(r => decode(r, 1000)) }; emit('water');
    } catch (e) {}
    try {
      const hi = await get('wow-hi.json');
      const m = new Map();
      for (const [cid, polys] of Object.entries(hi)) m.set(cid, polys.map(poly => poly.map(r => decode(r, 1000))));
      geo.hi = m; emit('hi');
    } catch (e) {}
  })();
  return geo.extraReady;
}

export function loadPlus() {
  if (geo.plusReady) return geo.plusReady;
  geo.plusReady = fetch('wow-places-plus.json').then(r => r.json()).then(list => {
    geo.plus = list.map(p => ({ name: p[0], lat: p[1], lon: p[2], cid: p[3], region: '', pop: 0, cap: false, key: norm(p[0]) }));
    geo.plus.forEach(addGrid);
    emit('plus');
  }).catch(() => {});
  return geo.plusReady;
}
export const onGeo = f => geo.listeners.add(f);

// Länderkennung als eigenes Kürzel-Symbol (ISO-3166-Code), statt Flaggen-Emoji
export function flagOf(id) {
  if (!id || !/^[A-Z]{2}$/.test(id)) return '<span class="cc cc-x" aria-hidden="true">–</span>';
  return `<span class="cc" aria-hidden="true">${id}</span>`;
}
export function country(id) { return geo.byId.get(id); }
export function countryName(id) { const c = geo.byId.get(id); return c ? c.de : (id || '–'); }
export function region(id) { return geo.regionById.get(id); }

export function norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}
export const normLon = lon => ((lon + 540) % 360) - 180;

// Suche in Ländern, Regionen + Orten (offline)
export function search(q, { limit = 40, countryFilter = null, withCountries = true, withRegions = false } = {}) {
  const n = norm(q);
  const res = [];
  if (withCountries) {
    for (const c of geo.world) {
      if (countryFilter && c.id !== countryFilter) continue;
      const a = norm(c.de), b = norm(c.en);
      let score = -1;
      if (!n) score = countryFilter ? 5 : -1;
      else if (a === n || b === n) score = 6;
      else if (a.startsWith(n) || b.startsWith(n)) score = 3;
      else if (a.includes(n) || b.includes(n)) score = 1;
      if (score >= 0) res.push({ type: 'country', c, score: score + 0.5 });
    }
  }
  if (withRegions && n.length >= 3) {
    for (const r of geo.regions) {
      if (countryFilter && r.c !== countryFilter) continue;
      const a = r.key || (r.key = norm(r.n));
      const score = a === n ? 4.6 : a.startsWith(n) ? 3.2 : a.includes(n) ? 0.8 : -1;
      if (score >= 0) res.push({ type: 'region', r, score });
    }
  }
  const scan = (list, bonus, cap) => {
    let count = 0;
    for (const p of list) {
      if (countryFilter && p.cid !== countryFilter) continue;
      let score = -1;
      if (!n) score = bonus > 0 ? 1 : -1;
      else if (p.key === n) score = p.pop >= 50000 || p.cap ? 4 : 2.9;
      else if (p.key.startsWith(n)) score = 2.5;
      else if (n.length > 3 && p.key.includes(n)) score = 0.6;
      if (score >= 0) {
        res.push({ type: 'place', p, score: score + bonus + Math.log10(p.pop + 10) / 10 });
        if (++count > cap) break;
      }
    }
  };
  scan(geo.places, 0.3, 400);
  if (n.length >= 2 && geo.plus.length) scan(geo.plus, 0, 300);
  res.sort((a, b) => b.score - a.score);
  // Doppelte (gleicher Name, fast gleiche Position) entfernen
  const out = [];
  for (const r of res) {
    if (r.type === 'place' && out.some(o => o.type === 'place' && o.p.key === r.p.key && Math.abs(o.p.lat - r.p.lat) < 0.05 && Math.abs(o.p.lon - r.p.lon) < 0.05)) continue;
    out.push(r); if (out.length >= limit) break;
  }
  return out;
}

export function dist(a, b) {
  const R = 6371.0088, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function placesNear(lat, lon, radDeg = 1) {
  const out = [];
  const la0 = Math.floor(lat - radDeg), la1 = Math.floor(lat + radDeg);
  const scale = 1 / Math.max(0.2, Math.cos(lat * Math.PI / 180));
  const lo0 = Math.floor(lon - radDeg * scale), lo1 = Math.floor(lon + radDeg * scale);
  for (let a = la0; a <= la1; a++) for (let b = lo0; b <= lo1; b++) {
    const bb = ((b + 180) % 360 + 360) % 360 - 180;
    const cell = grid.get(`${a},${bb}`); if (cell) for (const p of cell) out.push(p);
  }
  return out;
}

export function nearestPlace(lat, lon, maxKm = 60) {
  let best = null, bd = Infinity;
  const pt = { lat, lon };
  const rad = Math.min(3, maxKm / 80 + 0.3);
  for (const p of placesNear(lat, lon, rad)) {
    const d = dist(pt, p);
    const w = d - Math.min(6, Math.log10(p.pop + 1)) - (p.ne ? 0.5 : 0);
    if (w < bd) { bd = w; best = { p, d }; }
  }
  if (!best && maxKm > 150) {
    for (const p of geo.places) { const d = dist(pt, p); if (!best || d < best.d) best = { p, d }; }
  }
  return best && best.d <= maxKm ? best : null;
}

function pipRing(x, y, r) {
  let ins = false;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
    const xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}
const inBB = (b, lat, lon, m = 0.05) => !(lon < b[0] - m || lon > b[2] + m || lat < b[1] - m || lat > b[3] + m);

export function countryAt(lat, lon) {
  lon = normLon(lon);
  for (const c of geo.world) {
    if (!inBB(c.bb, lat, lon)) continue;
    const polys = geo.hi?.get(c.id) || c.polys;
    for (const poly of polys) {
      if (pipRing(lon, lat, poly[0])) {
        let hole = false;
        for (let h = 1; h < poly.length; h++) if (pipRing(lon, lat, poly[h])) hole = true;
        if (!hole) return c;
      }
    }
  }
  return null;
}

export function countryNear(lat, lon) {
  const c = countryAt(lat, lon);
  if (c) return c;
  for (const d of [0.05, 0.12, 0.25]) {
    for (const [a, b] of [[d, 0], [-d, 0], [0, d], [0, -d], [d, d], [-d, -d], [d, -d], [-d, d]]) {
      const x = countryAt(lat + a, lon + b);
      if (x) return x;
    }
  }
  const np = nearestPlace(lat, lon, 200);
  return np ? geo.byId.get(np.p.cid) : null;
}

export function regionAt(lat, lon, cid) {
  lon = normLon(lon);
  const list = cid ? geo.regionsOf.get(cid) : geo.regions;
  if (!list) return null;
  for (const r of list) {
    if (!inBB(r.bb, lat, lon)) continue;
    for (const ring of r.polys) if (pipRing(lon, lat, ring)) return r;
  }
  // an der Küste: nächstgelegene Region des Landes
  let best = null, bd = Infinity;
  for (const r of list) {
    const cx = (r.bb[0] + r.bb[2]) / 2, cy = (r.bb[1] + r.bb[3]) / 2;
    if (!inBB(r.bb, lat, lon, 0.4)) continue;
    const d = (cx - lon) ** 2 + (cy - lat) ** 2;
    if (d < bd) { bd = d; best = r; }
  }
  return best;
}

// Web-Mercator in Welteinheiten (x läuft über 0..1 hinaus weiter – Welt wiederholt sich)
export const MAXLAT = 84;
export function mx(lon) { return (lon + 180) / 360; }
export function my(lat) {
  lat = Math.max(-MAXLAT, Math.min(MAXLAT, lat));
  const s = Math.sin(lat * Math.PI / 180);
  return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
}
export function lonOf(x) { return x * 360 - 180; }
export function latOf(y) { return 90 - 360 * Math.atan(Math.exp((y - 0.5) * 2 * Math.PI)) / Math.PI; }

// Ort aus Koordinaten beschreiben
export function describe(lat, lon) {
  lon = normLon(lon);
  const c = countryNear(lat, lon);
  const np = nearestPlace(lat, lon, 40);
  const rg = c ? regionAt(lat, lon, c.id) : null;
  let name, cap = false;
  if (np && np.d < (np.p.ne ? 10 : 5)) { name = np.p.name; cap = np.p.cap; }
  else if (np) name = `bei ${np.p.name}`;
  else name = c ? c.de : 'Unbekannter Ort';
  return { name, region: rg ? rg.n : (np?.p.region || ''), rid: rg ? rg.id : null, cid: c ? c.id : (np ? np.p.cid : null), cap, lat, lon };
}

// Grenzen eines Punktesatzes – wählt bei Pazifik-Reisen die kürzere Seite
export function boundsOf(points, minSpan = 4) {
  if (!points.length) return [-180, -58, 180, 78];
  let b = 90, d = -90;
  for (const p of points) { b = Math.min(b, p.lat); d = Math.max(d, p.lat); }
  const span = lons => { let lo = Infinity, hi = -Infinity; for (const x of lons) { lo = Math.min(lo, x); hi = Math.max(hi, x); } return [lo, hi]; };
  let [a, c] = span(points.map(p => normLon(p.lon)));
  const [a2, c2] = span(points.map(p => { const x = normLon(p.lon); return x < 0 ? x + 360 : x; }));
  if (c2 - a2 < c - a) { a = a2; c = c2; }
  const cx = (a + c) / 2, cy = (b + d) / 2;
  const sx = Math.max(c - a, minSpan) / 2, sy = Math.max(d - b, minSpan * 0.6) / 2;
  return [cx - sx, cy - sy, cx + sx, cy + sy];
}
