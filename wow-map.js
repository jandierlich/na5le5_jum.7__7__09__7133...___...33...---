// WowarWahr – eigener Karten-Renderer (Canvas, Web-Mercator, endlos horizontal)
// Grundlage: Natural Earth (Public Domain), Orte zusätzlich GeoNames (CC BY 4.0).
import { geo, mx, my, lonOf, latOf, normLon, placesNear } from './wow-geo.js';
export { boundsOf } from './wow-geo.js';

export const COLORS = {
  ocean: '#DCE6F5', land: '#F6F4FA', border: '#CFC4E3', regionLine: 'rgba(130,115,170,.45)',
  visited: '#7C5CFF', visitedLight: '#CFC2F5', wish: '#F7D3B6', wishStroke: '#E8765A',
  pin: '#E8765A', wishPin: '#E3A72F', cluster: '#3B2585', route: '#5A2FBE', home: '#241748', select: '#241748',
  river: '#AFC6E8', graticule: 'rgba(255,255,255,.55)', city: '#2F2A45', label: '#241E3F', countryLabel: '#5F5680', regionLabel: '#5B5378',
  halo: 'rgba(255,255,255,.88)'
};
// Gedämpfter Dunkelmodus (gemeinsamer Schalter "reisewahr-theme", gesetzt im <head>)
const LIGHT = { ...COLORS };
const DARK_PAL = {};
export const DARK = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark';
if (DARK) Object.assign(COLORS, Object.assign(DARK_PAL, {
  ocean: '#1A2238', land: '#2F2944', border: '#4A4266', regionLine: 'rgba(170,160,210,.35)',
  visited: '#8E75F0', visitedLight: '#4A3D6B', wish: '#5E4636', wishStroke: '#EE8A70',
  pin: '#EE8A70', wishPin: '#E9B447', cluster: '#8E75F0', route: '#B9A6F5', home: '#D6CCF5', select: '#D6CCF5',
  river: '#2A3A5C', graticule: 'rgba(255,255,255,.06)', city: '#E2DDF2', label: '#F2EFFA', countryLabel: '#BDB4DA', regionLabel: '#ADA4CB',
  halo: 'rgba(24,20,40,.85)'
}));
const HI_S = 3200;      // ab hier feine Grenzen
const REG_S = 1900;     // ab hier Regionen sichtbar
const U = 1024;
const F = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif';

const cache = { lo: new Map(), hi: new Map(), reg: new Map(), lakes: null, rivers: null };

function ringsPath(polys, p = new Path2D()) {
  for (const poly of polys) for (const ring of (poly.length && poly[0].length ? poly : [poly])) {
    for (let i = 0; i < ring.length; i += 2) {
      const x = mx(ring[i]) * U, y = my(ring[i + 1]) * U;
      if (i === 0) p.moveTo(x, y); else p.lineTo(x, y);
    }
    p.closePath();
  }
  return p;
}
function countryPath(c, hi) {
  const m = hi ? cache.hi : cache.lo;
  let p = m.get(c.id);
  if (!p) {
    const polys = hi ? geo.hi.get(c.id) : c.polys;
    if (!polys) return countryPath(c, false);
    p = ringsPath(polys); m.set(c.id, p);
  }
  return p;
}
function regionPath(r) {
  let p = cache.reg.get(r.id);
  if (!p) { p = new Path2D(); for (const ring of r.polys) ringsPath([[ring]], p); cache.reg.set(r.id, p); }
  return p;
}
function waterPaths() {
  if (!geo.water) return null;
  if (!cache.lakes) {
    cache.lakes = new Path2D(); for (const r of geo.water.lakes) ringsPath([[r]], cache.lakes);
    cache.rivers = new Path2D();
    for (const r of geo.water.rivers) for (let i = 0; i < r.length; i += 2) {
      const x = mx(r[i]) * U, y = my(r[i + 1]) * U; if (i === 0) cache.rivers.moveTo(x, y); else cache.rivers.lineTo(x, y);
    }
  }
  return cache;
}

/**
 * view: { s, tx, ty }  – s = Pixel pro Weltbreite
 * layers: visited:Set, visitedRegions:Set, regionCountries:Set, wish:Set, selected, pins, routes, home,
 *         labels, cluster, pinSize, detail
 */
// Exportbilder (Teilen-Karte, Reisefilm) bleiben immer hell: renderMap(..., { light: true })
export function renderMap(ctx, w, h, view, L = {}) {
  if (!(DARK && L.light)) return renderMapImpl(ctx, w, h, view, L);
  Object.assign(COLORS, LIGHT);
  try { return renderMapImpl(ctx, w, h, view, L); } finally { Object.assign(COLORS, DARK_PAL); }
}
function renderMapImpl(ctx, w, h, view, L = {}) {
  const { s, tx, ty } = view;
  const detail = L.detail !== false;
  const fz = n => `${(n * (L.fontScale || 1)).toFixed(1)}px`;
  const vis = L.visited || new Set(), wish = L.wish || new Set();
  const vReg = L.visitedRegions || new Set(), regC = L.regionCountries || new Set();
  const useHi = detail && s > HI_S && geo.hi;
  const showReg = detail && s > REG_S && geo.regions.length;
  const k0 = Math.floor(-tx / s), k1 = Math.floor((w - tx) / s);
  const base = ctx.getTransform();
  const y0 = -ty / s, y1 = (h - ty) / s;

  ctx.save();
  ctx.fillStyle = COLORS.ocean; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = COLORS.graticule; ctx.lineWidth = 1; ctx.beginPath();
  for (let k = k0; k <= k1; k++) {
    const ox = tx + k * s;
    for (let lon = -180; lon < 180; lon += 30) { const x = mx(lon) * s + ox; ctx.moveTo(x, my(84) * s + ty); ctx.lineTo(x, my(-84) * s + ty); }
    for (let lat = -60; lat <= 60; lat += 30) { const y = my(lat) * s + ty; ctx.moveTo(ox, y); ctx.lineTo(ox + s, y); }
  }
  ctx.stroke();

  const kpx = U / s; // 1 Bildschirmpixel in Pfad-Einheiten
  for (let k = k0; k <= k1; k++) {
    const ox = tx + k * s;
    const x0 = -ox / s, x1 = (w - ox) / s;
    const inView = b => !(mx(b[2]) < x0 || mx(b[0]) > x1 || my(b[1]) < y0 || my(b[3]) > y1);
    ctx.setTransform(base.multiply(new DOMMatrix([s / U, 0, 0, s / U, ox, ty])));
    const visible = geo.world.filter(c => inView(c.bb));
    for (const c of visible) {
      let fill = COLORS.land;
      if (vis.has(c.id)) fill = showReg && regC.has(c.id) ? COLORS.visitedLight : COLORS.visited;
      else if (wish.has(c.id)) fill = COLORS.wish;
      ctx.fillStyle = fill; ctx.fill(countryPath(c, useHi), 'evenodd');
    }
    if (showReg) {
      ctx.fillStyle = COLORS.visited;
      for (const rid of vReg) { const r = geo.regionById.get(rid); if (r && inView(r.bb)) ctx.fill(regionPath(r)); }
      const allLines = s > 4200;
      ctx.lineWidth = 0.7 * kpx; ctx.setLineDash([3 * kpx, 2.5 * kpx]);
      for (const c of visible) {
        if (!allLines && !vis.has(c.id)) continue;
        const list = geo.regionsOf.get(c.id); if (!list) continue;
        ctx.strokeStyle = vis.has(c.id) ? 'rgba(255,255,255,.75)' : COLORS.regionLine;
        for (const r of list) if (inView(r.bb)) ctx.stroke(regionPath(r));
      }
      ctx.setLineDash([]);
    }
    if (detail && s > 1500) {
      const wp = waterPaths();
      if (wp) {
        ctx.fillStyle = COLORS.ocean; ctx.fill(wp.lakes);
        ctx.strokeStyle = COLORS.river; ctx.lineWidth = Math.min(1.6, 0.6 + s / 20000) * kpx; ctx.lineJoin = 'round'; ctx.stroke(wp.rivers);
      }
    }
    ctx.lineJoin = 'round'; ctx.lineWidth = (useHi ? 1 : 0.8) * kpx;
    for (const c of visible) { ctx.strokeStyle = vis.has(c.id) ? 'rgba(255,255,255,.9)' : COLORS.border; ctx.stroke(countryPath(c, useHi)); }
    if (wish.size) {
      ctx.setLineDash([4 * kpx, 3 * kpx]); ctx.strokeStyle = COLORS.wishStroke; ctx.lineWidth = 1.4 * kpx;
      for (const c of visible) if (wish.has(c.id) && !vis.has(c.id)) ctx.stroke(countryPath(c, useHi));
      ctx.setLineDash([]);
    }
    if (L.selected) { const c = geo.byId.get(L.selected); if (c && inView(c.bb)) { ctx.strokeStyle = COLORS.select; ctx.lineWidth = 2.2 * kpx; ctx.stroke(countryPath(c, useHi)); } }
  }
  ctx.setTransform(base);

  const P = (lat, lon, k) => [mx(lon) * s + tx + k * s, my(lat) * s + ty];
  const ks = []; for (let k = k0 - 1; k <= k1 + 1; k++) ks.push(k);
  const onScreen = (x, y, m = 30) => x > -m && x < w + m && y > -m && y < h + m;

  // Kleinstaaten & Inseln: bei geringer Zoomstufe als Punkt markieren, damit sie sichtbar bleiben
  if (vis.size || wish.size) {
    ctx.save(); ctx.lineWidth = 1.6;
    for (const c of geo.world) {
      const isV = vis.has(c.id), isW = !isV && wish.has(c.id);
      if ((!isV && !isW) || c.lx == null) continue;
      const bw = (mx(c.bb[2]) - mx(c.bb[0])) * s, bh = (my(c.bb[1]) - my(c.bb[3])) * s;
      if (Math.max(bw, bh) >= 12) continue;
      for (const k of ks) {
        const [x, y] = P(c.ly, c.lx, k); if (!onScreen(x, y, 10)) continue;
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = isV ? COLORS.visited : COLORS.wish; ctx.fill();
        ctx.strokeStyle = isV ? '#fff' : COLORS.wishStroke; ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Routen – immer der kürzere Weg (auch über die Datumsgrenze)
  if (L.routes) {
    ctx.save(); ctx.lineCap = 'round';
    for (const r of L.routes) {
      const pts = r.points || r; if (pts.length < 2) continue;
      const un = [{ lat: pts[0].lat, lon: pts[0].lon }];
      for (let i = 1; i < pts.length; i++) {
        let lon = pts[i].lon; const prev = un[i - 1].lon;
        while (lon - prev > 180) lon -= 360; while (lon - prev < -180) lon += 360;
        un.push({ lat: pts[i].lat, lon });
      }
      ctx.strokeStyle = r.color || COLORS.route; ctx.globalAlpha = 0.9; ctx.lineWidth = r.width || 2; ctx.setLineDash([6, 5]);
      for (const k of ks) {
        ctx.beginPath();
        for (let i = 0; i < un.length; i++) {
          const [x, y] = P(un[i].lat, un[i].lon, k);
          if (i === 0) { ctx.moveTo(x, y); continue; }
          const [px, py] = P(un[i - 1].lat, un[i - 1].lon, k);
          const dx = x - px, dy = y - py, d = Math.hypot(dx, dy);
          if (d < 4) ctx.lineTo(x, y); else ctx.quadraticCurveTo((x + px) / 2 - dy * 0.18, (y + py) / 2 + dx * 0.18, x, y);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  const placed = [];
  const free = (x, y, tw, th = 14) => !placed.some(q => Math.abs(q[0] - x) < (tw + q[2]) / 2 + 4 && Math.abs(q[1] - y) < (th + q[3]) / 2 + 2);
  const label = (text, x, y, font, color, halo = COLORS.halo, th = 14) => {
    ctx.font = font; const tw = ctx.measureText(text).width;
    if (!free(x, y, tw, th)) return false;
    placed.push([x, y, tw, th]);
    ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.strokeStyle = halo; ctx.strokeText(text, x, y);
    ctx.fillStyle = color; ctx.fillText(text, x, y); return true;
  };
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  // Pins zuerst in die Belegung, damit Beschriftungen ausweichen
  const drawn = [];
  const groups = [];
  if (L.pins && L.pins.length) {
    // Jede Stadt einzeln; nur überlappende Markierungen werden zusammengefasst (Orte und Wunschorte getrennt)
    const cell = L.cluster === false ? 0 : (s < 2000 ? 16 : 20);
    const sorted = [...L.pins].sort((a, b) => (a.wishId ? 1 : 0) - (b.wishId ? 1 : 0));
    for (const pin of sorted) for (const k of ks) {
      const [x, y] = P(pin.lat, pin.lon, k);
      if (!onScreen(x, y)) continue;
      const wishG = !!pin.wishId;
      const g = cell ? groups.find(g => g.wish === wishG && Math.hypot(g.x - x, g.y - y) < cell) : null;
      if (g) g.items.push(pin); else groups.push({ x, y, items: [pin], wish: wishG });
    }
    for (const g of groups) { const r = g.items.length > 1 ? 11 : 8; placed.push([g.x, g.y, r * 2, r * 2]); }
    if (L.pinLabels !== false && L.labels && s >= 1300) {
      ctx.font = `600 ${fz(12.5)} ${F}`;
      for (const g of groups) if (g.items.length === 1 && g.items[0].name) {
        const tw = ctx.measureText(g.items[0].name).width, off = g.wish ? 13 : 11;
        placed.push([g.x + off + tw / 2, g.y, tw, 16]);
      }
    }
  }

  // Länderbeschriftung
  if (L.labels) {
    for (const k of ks) for (const c of geo.world) {
      const bw = (mx(c.bb[2]) - mx(c.bb[0])) * s;
      const v = vis.has(c.id);
      if (bw < (v ? 44 : 70)) continue;
      const [x, y] = P(c.ly, c.lx, k);
      if (!onScreen(x, y, 60)) continue;
      label(c.de, x, y, `${v ? 700 : 600} ${fz(s > 5000 ? 14 : 12.5)} ${F}`, v ? COLORS.label : COLORS.countryLabel, COLORS.halo, 16);
    }
  }
  // Regionen beschriften
  if (L.labels && showReg && s > 5200) {
    for (const k of ks) for (const c of geo.world) {
      const list = geo.regionsOf.get(c.id); if (!list) continue;
      for (const r of list) {
        const bw = (mx(r.bb[2]) - mx(r.bb[0])) * s; if (bw < 80) continue;
        const [x, y] = P((r.bb[1] + r.bb[3]) / 2, (r.bb[0] + r.bb[2]) / 2, k);
        if (!onScreen(x, y)) continue;
        label(r.n, x, y, `600 ${fz(12)} ${F}`, vReg.has(r.id) ? '#fff' : COLORS.regionLabel, vReg.has(r.id) ? 'rgba(36,23,72,.75)' : COLORS.halo, 15);
      }
    }
  }
  // Städte (Positionen merken, damit sie antippbar sind – ganz unten angehängt, damit eigene Orte beim Antippen Vorrang haben)
  const cityHits = [];
  if (L.labels && detail && L.cities !== false && s > 2600) {
    const c0 = { lon: lonOf(-tx / s), lat: latOf(-ty / s) }, c1 = { lon: lonOf((w - tx) / s), lat: latOf((h - ty) / s) };
    const spanLon = c1.lon - c0.lon;
    if (spanLon < 50) {
      const cLat = (c0.lat + c1.lat) / 2, cLon = normLon((c0.lon + c1.lon) / 2);
      const rad = Math.max(spanLon / 2, (c0.lat - c1.lat) / 2) + 0.5;
      let cand = placesNear(cLat, cLon, rad);
      const minPop = s > 40000 ? 0 : s > 16000 ? 20000 : s > 7000 ? 100000 : 400000;
      cand = cand.filter(p => (p.ne ? p.pop >= minPop : s > 40000)).sort((a, b) => (b.ne - a.ne) || b.pop - a.pop);
      const maxN = s > 40000 ? 28 : 18;
      let n = 0;
      for (const p of cand) {
        if (n >= maxN) break;
        for (const k of ks) {
          const [x, y] = P(p.lat, p.lon, k);
          if (!onScreen(x, y, 0)) continue;
          const big = p.pop > 1e6 || p.cap;
          const font = `${big ? 700 : 600} ${fz(big ? 13.5 : 12.5)} ${F}`;
          ctx.font = font; const tw = ctx.measureText(p.name).width;
          const lx = x + tw / 2 + 6;
          if (!free(lx, y, tw, 18) || !free(x, y, 10, 10)) continue;
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, big ? 3.2 : 2.4, 0, 7); ctx.fill();
          ctx.lineWidth = 1.2; ctx.strokeStyle = COLORS.city; ctx.stroke();
          label(p.name, lx, y, font, COLORS.city, COLORS.halo, 16);
          placed.push([x, y, 6, 6]); cityHits.push({ x, y, r: 16, city: p }); n++;
        }
      }
    }
  }
  ctx.restore();

  // Pins zeichnen
  ctx.save();
  for (const g of groups) {
    const n = g.items.length;
    const r = n > 1 ? 11 + Math.min(6, Math.log2(n) * 2) : (L.pinSize || 7);
    ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 1;
    const cols = new Set(g.items.map(i => i.color));
    ctx.fillStyle = g.wish ? COLORS.wishPin : n > 1 && cols.size > 1 ? COLORS.cluster : (g.items[0].color || COLORS.pin);
    const rr = g.wish && n === 1 ? r + 2 : r;
    ctx.beginPath(); ctx.arc(g.x, g.y, rr, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
    if (g.wish && n === 1) { // Stern für Wunschorte
      ctx.fillStyle = '#fff'; ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? rr * 0.3 : rr * 0.68; ctx.lineTo(g.x + Math.cos(a) * q, g.y + Math.sin(a) * q); }
      ctx.closePath(); ctx.fill();
    }
    if (n > 1) { ctx.fillStyle = '#fff'; ctx.font = `700 ${fz(12)} ${F}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(n, g.x, g.y + 0.5); }
    drawn.push({ x: g.x, y: g.y, r: Math.max(r, 16), items: g.items });
  }
  // Namen der eigenen Orte / Wunschorte beim Heranzoomen
  if (L.pinLabels !== false && L.labels && s >= 1300) {
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const font = `600 ${fz(12.5)} ${F}`;
    for (const g of groups) {
      if (g.items.length !== 1 || !g.items[0].name) continue;
      const it = g.items[0], off = g.wish ? 13 : 11;
      ctx.font = font; const tw = ctx.measureText(it.name).width;
      ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.strokeStyle = COLORS.halo; ctx.strokeText(it.name, g.x + off, g.y);
      ctx.fillStyle = g.wish ? (DARK ? '#F0CF84' : '#8A5A00') : COLORS.label; ctx.fillText(it.name, g.x + off, g.y);
    }
  }
  if (L.home) for (const k of ks) {
    const [x, y] = P(L.home.lat, L.home.lon, k);
    if (!onScreen(x, y)) continue;
    ctx.fillStyle = COLORS.home; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x, y - 5); ctx.lineTo(x + 5, y); ctx.lineTo(x + 5, y + 4.5); ctx.lineTo(x - 5, y + 4.5); ctx.closePath(); ctx.fill();
    drawn.push({ x, y, r: 14, home: true });
  }
  // Suchergebnis: Stecknadel
  if (L.mark) for (const k of ks) {
    const [x, y] = P(L.mark.lat, L.mark.lon, k);
    if (!onScreen(x, y, 40)) continue;
    ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2;
    ctx.fillStyle = COLORS.select; ctx.beginPath();
    ctx.arc(x, y - 22, 11, Math.PI * 0.8, Math.PI * 0.2); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y - 22, 4.2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  ctx.restore(); // Gegenstück zum ersten save() – Zustand des Aufrufers wiederherstellen
  if (cityHits.length) drawn.push(...cityHits);
  return drawn;
}

export function fitView(w, h, bounds, pad = 30, maxS = 60000) {
  const [lon0, lat0, lon1, lat1] = bounds;
  const X0 = mx(lon0), X1 = mx(lon1), Y0 = my(lat1), Y1 = my(lat0);
  const bw = Math.max(X1 - X0, 0.0005), bh = Math.max(Y1 - Y0, 0.0005);
  const s = Math.min((w - pad * 2) / bw, (h - pad * 2) / bh, maxS);
  return { s, tx: w / 2 - (X0 + bw / 2) * s, ty: h / 2 - (Y0 + bh / 2) * s };
}

// Interaktive Karte mit Gesten
export class WorldMap {
  constructor(canvas, { onTap, onChange } = {}) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.onTap = onTap; this.onChange = onChange;
    this.layers = {}; this.view = null; this.drawn = [];
    this.pointers = new Map(); this.dirty = true; this.anim = null;
    this.resize();
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.bind();
    const loop = () => { if (this.dirty) this.draw(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  resize() {
    const r = this.canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.w = r.width; this.h = r.height; this.dpr = dpr;
    this.canvas.width = Math.round(r.width * dpr); this.canvas.height = Math.round(r.height * dpr);
    if (!this.view) this.view = fitView(this.w, this.h, this.w / this.h < 0.8 ? [-45, -45, 65, 74] : [-180, -56, 180, 76], 8);
    if (this.pending) { const [b, p, m] = this.pending; this.pending = null; this.view = fitView(this.w, this.h, b, p, m); }
    this.clamp(); this.dirty = true;
  }
  minS() { return this.w; }
  clamp() {
    const v = this.view; if (!v) return;
    v.s = Math.max(this.minS(), Math.min(v.s, 120000));
    v.tx = ((v.tx % v.s) + v.s) % v.s - v.s; // Welt wiederholt sich horizontal
    const top = my(84) * v.s, bottom = my(-70) * v.s, worldH = bottom - top;
    if (worldH <= this.h) v.ty = (this.h - worldH) / 2 - top;
    else v.ty = Math.min(this.h * 0.25 - top, Math.max(this.h * 0.75 - bottom, v.ty));
  }
  set(layers) { this.layers = { ...this.layers, ...layers }; this.dirty = true; }
  redraw() { this.dirty = true; }
  draw() {
    if (!this.view || !this.w) return;
    this.dirty = false;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawn = renderMap(this.ctx, this.w, this.h, this.view, { labels: this.view.s > 1300, ...this.layers });
  }
  zoomAt(f, x, y) {
    const v = this.view; const ns = Math.max(this.minS(), Math.min(v.s * f, 120000)); f = ns / v.s;
    v.tx = x - (x - v.tx) * f; v.ty = y - (y - v.ty) * f; v.s = ns;
    this.clamp(); this.dirty = true; this.onChange && this.onChange();
  }
  flyTo(bounds, pad = 50, maxS = 14000) {
    if (!this.view || !this.w) { this.pending = [bounds, pad, maxS]; return; }
    const target = fitView(this.w, this.h, bounds, pad, maxS);
    const from = { ...this.view }; const t0 = performance.now(); const D = 650;
    cancelAnimationFrame(this.anim);
    const lz0 = Math.log(from.s), lz1 = Math.log(Math.max(this.minS(), target.s));
    const c0x = (this.w / 2 - from.tx) / from.s, c0y = (this.h / 2 - from.ty) / from.s;
    let c1x = (this.w / 2 - target.tx) / target.s; const c1y = (this.h / 2 - target.ty) / target.s;
    while (c1x - c0x > 0.5) c1x -= 1; while (c1x - c0x < -0.5) c1x += 1;
    const step = now => {
      let t = Math.min(1, (now - t0) / D); t = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const s = Math.exp(lz0 + (lz1 - lz0) * t);
      const cx = c0x + (c1x - c0x) * t, cy = c0y + (c1y - c0y) * t;
      this.view = { s, tx: this.w / 2 - cx * s, ty: this.h / 2 - cy * s };
      this.clamp(); this.dirty = true;
      if (t < 1) this.anim = requestAnimationFrame(step); else this.onChange && this.onChange();
    };
    this.anim = requestAnimationFrame(step);
  }
  toLatLon(x, y) { const v = this.view; return { lon: normLon(lonOf((x - v.tx) / v.s)), lat: latOf((y - v.ty) / v.s) }; }
  center() { return this.toLatLon(this.w / 2, this.h / 2); }
  bind() {
    const c = this.canvas;
    c.style.touchAction = 'none';
    let start = null, lastTap = 0, moved = false, pinch = null, vel = { x: 0, y: 0 }, lastMove = 0;
    const pos = e => { const r = c.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    c.addEventListener('pointerdown', e => {
      try { c.setPointerCapture(e.pointerId); } catch (err) {}
      cancelAnimationFrame(this.anim); cancelAnimationFrame(this.inertia);
      this.pointers.set(e.pointerId, pos(e));
      if (this.pointers.size === 1) { start = { ...pos(e), tx: this.view.tx, ty: this.view.ty }; moved = false; vel = { x: 0, y: 0 }; }
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: this.view.s, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, tx: this.view.tx, ty: this.view.ty };
        moved = true;
      }
    });
    c.addEventListener('pointermove', e => {
      if (!this.pointers.has(e.pointerId)) return;
      const p = pos(e); const prev = this.pointers.get(e.pointerId);
      this.pointers.set(e.pointerId, p);
      if (this.pointers.size === 2 && pinch) {
        const [a, b] = [...this.pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const ns = Math.max(this.minS(), Math.min(pinch.s * d / pinch.d, 120000));
        const f = ns / pinch.s;
        this.view.s = ns;
        this.view.tx = (a.x + b.x) / 2 - (pinch.mx - pinch.tx) * f;
        this.view.ty = (a.y + b.y) / 2 - (pinch.my - pinch.ty) * f;
        this.clampSoft(); this.dirty = true;
      } else if (this.pointers.size === 1 && start) {
        const dx = p.x - start.x, dy = p.y - start.y;
        if (Math.hypot(dx, dy) > 6) moved = true;
        if (moved) {
          const now = performance.now(), dt = Math.max(1, now - lastMove);
          vel = { x: (p.x - prev.x) / dt, y: (p.y - prev.y) / dt }; lastMove = now;
          this.view.tx = start.tx + dx; this.view.ty = start.ty + dy; this.clampSoft(); this.dirty = true;
        }
      }
    });
    const up = e => {
      if (!this.pointers.has(e.pointerId)) return;
      const p = pos(e);
      this.pointers.delete(e.pointerId);
      if (this.pointers.size === 1) { const q = [...this.pointers.values()][0]; start = { ...q, tx: this.view.tx, ty: this.view.ty }; pinch = null; return; }
      if (this.pointers.size > 0) return;
      pinch = null; this.clamp();
      if (!moved) {
        const now = performance.now();
        if (now - lastTap < 280) { this.zoomAt(2.2, p.x, p.y); lastTap = 0; clearTimeout(this.tapT); return; }
        lastTap = now;
        this.tapT = setTimeout(() => this.handleTap(p), 230);
      } else if (performance.now() - lastMove < 60 && Math.hypot(vel.x, vel.y) > 0.25) {
        let vx = vel.x * 16, vy = vel.y * 16;
        const glide = () => {
          vx *= 0.92; vy *= 0.92;
          this.view.tx += vx; this.view.ty += vy; this.clamp(); this.dirty = true;
          if (Math.hypot(vx, vy) > 0.4) this.inertia = requestAnimationFrame(glide); else this.onChange && this.onChange();
        };
        this.inertia = requestAnimationFrame(glide);
      } else this.onChange && this.onChange();
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('wheel', e => { e.preventDefault(); const p = pos(e); this.zoomAt(Math.exp(-e.deltaY * 0.0022), p.x, p.y); }, { passive: false });
  }
  // Während der Geste: nur Zoom und Höhe begrenzen (tx nicht springen lassen)
  clampSoft() {
    const v = this.view;
    v.s = Math.max(this.minS(), Math.min(v.s, 120000));
    const top = my(84) * v.s, bottom = my(-70) * v.s, worldH = bottom - top;
    if (worldH <= this.h) v.ty = (this.h - worldH) / 2 - top;
    else v.ty = Math.min(this.h * 0.25 - top, Math.max(this.h * 0.75 - bottom, v.ty));
  }
  handleTap(p) {
    let hit = null, hd = Infinity;
    for (const d of this.drawn) { const dd = Math.hypot(d.x - p.x, d.y - p.y); if (dd <= d.r && dd < hd) { hit = d; hd = dd; } }
    this.onTap && this.onTap({ ...this.toLatLon(p.x, p.y), hit, x: p.x, y: p.y });
  }
}
