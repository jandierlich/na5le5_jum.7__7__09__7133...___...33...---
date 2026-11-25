// WowarWahr – 3D-Globus (eigene orthografische Projektion auf Canvas, ohne Bibliotheken)
// Tag-/Nachtgrenze in Echtzeit nach Sonnenstand. Grundlage: Natural Earth (Public Domain).
import { geo, normLon, countryAt } from './wow-geo.js';
import { COLORS } from './wow-map.js';
import { $, esc, icon, toast } from './wow-ui.js';

const rad = Math.PI / 180;
const F = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif';

// ---------- Sonnenstand ----------
// Subsolarer Punkt (Näherung, Genauigkeit ~0,1°) – dort steht die Sonne im Zenit
export function subsolar(date = new Date()) {
  const d = date.getTime() / 864e5 - 10957.5; // Tage seit J2000
  const g = (357.529 + 0.98560028 * d) * rad;
  const q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad;
  const e = (23.439 - 0.00000036 * d) * rad;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)) / rad;
  const dec = Math.asin(Math.sin(e) * Math.sin(L)) / rad;
  const gmst = ((18.697374558 + 24.06570982441908 * d) % 24 + 24) % 24;
  return { lat: dec, lon: normLon(ra - gmst * 15) };
}
// Sonnenhöhe (Grad) an einem Ort
export function sunAltitude(lat, lon, sun = subsolar()) {
  const p = lat * rad, s = sun.lat * rad, h = (lon - sun.lon) * rad;
  return Math.asin(Math.sin(p) * Math.sin(s) + Math.cos(p) * Math.cos(s) * Math.cos(h)) / rad;
}
// wahre Sonnenzeit am Ort (12:00 = Sonne im Süden bzw. Norden)
export function solarTime(lon, sun = subsolar()) {
  let hrs = 12 + normLon(lon - sun.lon) / 15;
  hrs = ((hrs % 24) + 24) % 24;
  const hh = Math.floor(hrs), mm = Math.floor((hrs - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// ---------- Projektion ----------
function projector(lam0, phi0) {
  const sp = Math.sin(phi0), cp = Math.cos(phi0);
  const f = (lat, lon) => {
    const phi = lat * rad, l = lon * rad - lam0;
    const cphi = Math.cos(phi), sphi = Math.sin(phi), cl = Math.cos(l);
    return [cphi * Math.sin(l), cp * sphi - sp * cphi * cl, sp * sphi + cp * cphi * cl];
  };
  f.invert = (x, y) => {
    const r2 = x * x + y * y; if (r2 > 1) return null;
    const z = Math.sqrt(1 - r2);
    const lat = Math.asin(Math.max(-1, Math.min(1, y * cp + z * sp))) / rad;
    const lon = normLon((Math.atan2(x, z * cp - y * sp) + lam0) / rad);
    return { lat, lon };
  };
  return f;
}

// Ring auf die Kugel legen: Rückseite wird auf den Rand gedrückt und entlang des Randes geführt
function ringInto(path, ring, proj, cx, cy, R) {
  const p = new Path2D();
  let started = false, prevBack = false, pa = 0, anyFront = false;
  for (let i = 0; i < ring.length; i += 2) {
    const [x, y, z] = proj(ring[i + 1], ring[i]);
    const back = z < 0;
    let X, Y;
    if (back) { const l = Math.hypot(x, y) || 1; X = cx + R * x / l; Y = cy - R * y / l; }
    else { X = cx + R * x; Y = cy - R * y; anyFront = true; }
    if (!started) { p.moveTo(X, Y); started = true; }
    else if (back && prevBack) {
      const a = Math.atan2(Y - cy, X - cx); let d = a - pa;
      while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      p.arc(cx, cy, R, pa, pa + d, d < 0);
    } else p.lineTo(X, Y);
    if (back) pa = Math.atan2(Y - cy, X - cx);
    prevBack = back;
  }
  p.closePath();
  if (anyFront) path.addPath(p);
  return anyFront;
}

function drawGlobe(ctx, w, h, st, D) {
  const { R, cx, cy } = st;
  const proj = projector(st.lam0, st.phi0);
  ctx.clearRect(0, 0, w, h);

  // Atmosphäre
  const glow = ctx.createRadialGradient(cx, cy, R * 0.96, cx, cy, R * 1.12);
  glow.addColorStop(0, 'rgba(120,180,205,.45)'); glow.addColorStop(1, 'rgba(120,180,205,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, R * 1.12, 0, Math.PI * 2); ctx.fill();

  // Ozean
  const oc = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
  oc.addColorStop(0, '#DCEFF4'); oc.addColorStop(1, '#A9CFDC');
  ctx.fillStyle = oc; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();

  // Gradnetz
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 0.8; ctx.beginPath();
  const line = pts => { let pen = false; for (const [la, lo] of pts) { const [x, y, z] = proj(la, lo); if (z < 0) { pen = false; continue; } const X = cx + R * x, Y = cy - R * y; if (pen) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); pen = true; } };
  for (let lo = -180; lo < 180; lo += 30) { const a = []; for (let la = -84; la <= 84; la += 4) a.push([la, lo]); line(a); }
  for (let la = -60; la <= 60; la += 30) { const a = []; for (let lo = -180; lo <= 180; lo += 4) a.push([la, lo]); line(a); }
  ctx.stroke();

  // Länder
  const land = new Path2D(), visited = new Path2D(), wish = new Path2D();
  for (const c of geo.world) {
    const target = D.visited.has(c.id) ? visited : D.wish.has(c.id) ? wish : land;
    for (const poly of c.polys) for (const ring of poly) ringInto(target, ring, proj, cx, cy, R);
  }
  ctx.fillStyle = COLORS.land; ctx.fill(land, 'evenodd');
  ctx.fillStyle = COLORS.wish; ctx.fill(wish, 'evenodd');
  ctx.fillStyle = COLORS.visited; ctx.fill(visited, 'evenodd');
  ctx.lineJoin = 'round'; ctx.lineWidth = 0.7;
  ctx.strokeStyle = COLORS.border; ctx.stroke(land); ctx.stroke(wish);
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.stroke(visited);

  // Nacht
  if (D.night) {
    const sv = proj(D.sun.lat, D.sun.lon);
    const N = 150, key = `${N}`;
    if (!st.nightImg || st.nightKey !== key) { st.nightCv = document.createElement('canvas'); st.nightCv.width = st.nightCv.height = N; st.nightImg = st.nightCv.getContext('2d').createImageData(N, N); st.nightKey = key; }
    const img = st.nightImg, dd = img.data;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = (i + 0.5) / N * 2 - 1, y = 1 - (j + 0.5) / N * 2, r2 = x * x + y * y, o = (j * N + i) * 4;
      let a = 0;
      if (r2 <= 1.02) {
        const z = Math.sqrt(Math.max(0, 1 - r2)), dot = x * sv[0] + y * sv[1] + z * sv[2];
        a = dot > 0.03 ? 0 : dot < -0.1 ? 1 : (0.03 - dot) / 0.13;
      }
      dd[o] = 22; dd[o + 1] = 38; dd[o + 2] = 70; dd[o + 3] = a * 100;
    }
    st.nightCv.getContext('2d').putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.drawImage(st.nightCv, cx - R, cy - R, R * 2, R * 2);
  }

  // Kugel-Schattierung
  const sh = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.2, cx, cy, R);
  sh.addColorStop(0, 'rgba(255,255,255,.10)'); sh.addColorStop(0.7, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(20,45,70,.22)');
  ctx.fillStyle = sh; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  ctx.restore();

  // Sonne im Zenit
  if (D.night) {
    const [x, y, z] = proj(D.sun.lat, D.sun.lon);
    if (z > 0.05) {
      const X = cx + R * x, Y = cy - R * y;
      const g = ctx.createRadialGradient(X, Y, 0, X, Y, 16); g.addColorStop(0, 'rgba(255,214,102,.95)'); g.addColorStop(1, 'rgba(255,214,102,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X, Y, 16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#F4B63F'; ctx.beginPath(); ctx.arc(X, Y, 4.5, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Länderbeschriftung (besuchte Länder)
  const placed = [];
  const free = (x, y, tw, th) => !placed.some(q => Math.abs(q[0] - x) < (tw + q[2]) / 2 + 4 && Math.abs(q[1] - y) < (th + q[3]) / 2 + 2);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const fz = n => `${(n * (D.fontScale || 1)).toFixed(1)}px`;
  const hits = [];
  // Orte
  for (const p of D.pins) {
    const [x, y, z] = proj(p.lat, p.lon); if (z < 0.02) continue;
    const X = cx + R * x, Y = cy - R * y, a = Math.min(1, z * 4);
    ctx.globalAlpha = a;
    ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1;
    ctx.fillStyle = p.color || COLORS.pin; ctx.beginPath(); ctx.arc(X, Y, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.lineWidth = 1.6; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.globalAlpha = 1;
    hits.push({ x: X, y: Y, p });
    placed.push([X, Y, 12, 12]);
  }
  if (D.home) {
    const [x, y, z] = proj(D.home.lat, D.home.lon);
    if (z > 0.02) {
      const X = cx + R * x, Y = cy - R * y;
      ctx.fillStyle = COLORS.home; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(X, Y, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(X - 4, Y); ctx.lineTo(X, Y - 4); ctx.lineTo(X + 4, Y); ctx.lineTo(X + 4, Y + 3.6); ctx.lineTo(X - 4, Y + 3.6); ctx.closePath(); ctx.fill();
      placed.push([X, Y, 16, 16]);
    }
  }
  for (const c of geo.world) {
    if (!D.visited.has(c.id) || c.lx == null) continue;
    const [x, y, z] = proj(c.ly, c.lx); if (z < 0.35) continue;
    const X = cx + R * x, Y = cy - R * y;
    ctx.font = `700 ${fz(12)} ${F}`; const tw = ctx.measureText(c.de).width;
    if (!free(X, Y, tw, 15)) continue; placed.push([X, Y, tw, 15]);
    ctx.globalAlpha = Math.min(1, (z - 0.35) * 4);
    ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.strokeText(c.de, X, Y);
    ctx.fillStyle = COLORS.label; ctx.fillText(c.de, X, Y); ctx.globalAlpha = 1;
  }
  // Auswahl
  if (st.sel) {
    const [x, y, z] = proj(st.sel.lat, st.sel.lon);
    if (z > 0) { const X = cx + R * x, Y = cy - R * y; ctx.strokeStyle = COLORS.select; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(X, Y, 11, 0, Math.PI * 2); ctx.stroke(); }
  }
  // Rand
  ctx.strokeStyle = 'rgba(40,80,100,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  st.hits = hits;
}

/**
 * Globus öffnen.
 * D: { visited:Set, wish:Set, pins:[{lat,lon,name,cid,visitId,color}], home,
 *      countryName, flagOf, onVisit(id), onCountry(cid), fontScale, center }
 */
export function openGlobe(D) {
  const el = document.createElement('div'); el.className = 'globe';
  el.innerHTML = `<canvas aria-label="3D-Globus"></canvas>
    <div class="gl-top">
      <button class="round gl-x" aria-label="Schließen">${icon('close')}</button>
      <button class="round" data-home aria-label="Zur Startseite">${icon('start')}</button>
      <div class="gl-title"><b>Globus</b><small id="gl-sub">Tag und Nacht in Echtzeit</small></div>
      <button class="round gl-night on" aria-label="Tag und Nacht" aria-pressed="true">${icon('sun')}</button>
    </div>
    <div class="gl-card card" hidden></div>
    <p class="gl-hint">Ziehen zum Drehen · mit zwei Fingern zoomen · Ort antippen</p>`;
  $('#sheets').appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  const cv = el.querySelector('canvas'), ctx = cv.getContext('2d');
  const c0 = D.center || { lat: 30, lon: 10 };
  const st = { lam0: c0.lon * rad, phi0: Math.max(-50, Math.min(55, c0.lat)) * rad * 0.8, zoom: 1, R: 100, cx: 0, cy: 0, dpr: 1, sel: null, hits: [] };
  let W = 0, H = 0, dirty = true, auto = true, raf = 0, alive = true, vel = null;
  let night = true;
  const data = () => ({ visited: D.visited, wish: D.wish, pins: D.pins, home: D.home, sun: subsolar(), night, fontScale: D.fontScale });

  const resize = () => {
    const r = cv.getBoundingClientRect(); if (!r.width) return;
    st.dpr = Math.min(2, devicePixelRatio || 1);
    W = r.width; H = r.height; cv.width = Math.round(W * st.dpr); cv.height = Math.round(H * st.dpr);
    layout(); dirty = true;
  };
  const layout = () => { const base = Math.min(W, H) * 0.44; st.R = base * st.zoom; st.cx = W / 2; st.cy = H * 0.5; };
  const ro = new ResizeObserver(resize); ro.observe(cv);

  const updateSub = () => {
    const sun = subsolar();
    const day = D.pins.filter(p => sunAltitude(p.lat, p.lon, sun) > 0).length;
    el.querySelector('#gl-sub').textContent = D.pins.length ? `Gerade Tag an ${day} von ${D.pins.length} deiner Orte` : 'Tag und Nacht in Echtzeit';
  };
  updateSub();
  let lastSun = Date.now();

  const loop = () => {
    if (!alive) return;
    if (auto) { st.lam0 += 0.0018; dirty = true; }
    if (vel) {
      st.lam0 -= vel.x; st.phi0 = clampPhi(st.phi0 + vel.y); vel.x *= 0.94; vel.y *= 0.94;
      if (Math.hypot(vel.x, vel.y) < 0.0002) vel = null; dirty = true;
    }
    if (Date.now() - lastSun > 30000) { lastSun = Date.now(); updateSub(); dirty = true; }
    if (dirty && W) { dirty = false; ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0); drawGlobe(ctx, W, H, st, data()); }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  const clampPhi = p => Math.max(-1.35, Math.min(1.35, p));

  // Gesten
  const pts = new Map(); let start = null, pinch = null, moved = false, last = null, lastTap = 0;
  const pos = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() }; };
  cv.style.touchAction = 'none';
  cv.addEventListener('pointerdown', e => {
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    auto = false; vel = null; pts.set(e.pointerId, pos(e));
    if (pts.size === 1) { start = pos(e); last = start; moved = false; }
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: st.zoom }; moved = true; }
  });
  cv.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    const p = pos(e); pts.set(e.pointerId, p);
    if (pts.size === 2 && pinch) {
      const [a, b] = [...pts.values()];
      st.zoom = Math.max(0.75, Math.min(6, pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d)); layout(); dirty = true;
    } else if (pts.size === 1 && start) {
      if (Math.hypot(p.x - start.x, p.y - start.y) > 7) moved = true;
      if (moved && last) {
        const dx = (p.x - last.x) / st.R, dy = (p.y - last.y) / st.R;
        st.lam0 -= dx; st.phi0 = clampPhi(st.phi0 + dy);
        const dt = Math.max(8, p.t - last.t); vel = { x: dx * 16 / dt, y: dy * 16 / dt, t: p.t };
        dirty = true;
      }
      last = p;
    }
  });
  const up = e => {
    if (!pts.has(e.pointerId)) return;
    const p = pos(e); pts.delete(e.pointerId);
    if (pts.size === 1) { const q = [...pts.values()][0]; start = q; last = q; pinch = null; return; }
    if (pts.size) return;
    pinch = null;
    if (vel && performance.now() - vel.t > 80) vel = null;
    if (!moved) {
      vel = null;
      const now = performance.now();
      if (now - lastTap < 280) { st.zoom = Math.min(6, st.zoom * 1.8); layout(); dirty = true; lastTap = 0; return; }
      lastTap = now; tap(p);
    }
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', e => { e.preventDefault(); auto = false; st.zoom = Math.max(0.75, Math.min(6, st.zoom * Math.exp(-e.deltaY * 0.002))); layout(); dirty = true; }, { passive: false });

  const card = el.querySelector('.gl-card');
  const hideCard = () => { card.hidden = true; st.sel = null; dirty = true; };
  const tap = p => {
    let best = null, bd = 22;
    for (const h of st.hits) { const d = Math.hypot(h.x - p.x, h.y - p.y); if (d < bd) { bd = d; best = h.p; } }
    const sun = subsolar();
    const when = (lat, lon) => { const alt = sunAltitude(lat, lon, sun); return `${alt > 0 ? icon('sun', 'em') + ' Tag' : alt > -6 ? icon('sunset', 'em') + ' Dämmerung' : icon('moon', 'em') + ' Nacht'} · Sonnenzeit ca. ${solarTime(lon, sun)} Uhr`; };
    if (best) {
      st.sel = best; dirty = true;
      card.innerHTML = `<div class="gl-c"><span class="flag">${D.flagOf(best.cid)}</span><span class="grow"><b>${esc(best.name)}</b><small>${esc(D.countryName(best.cid) || '')}</small><small>${when(best.lat, best.lon)}</small></span></div>
        <button class="btn primary sm" data-go>${icon('pin')}Ort öffnen</button>`;
      card.hidden = false;
      card.querySelector('[data-go]').onclick = () => D.onVisit(best.visitId);
      return;
    }
    const ll = projector(st.lam0, st.phi0).invert((p.x - st.cx) / st.R, (st.cy - p.y) / st.R);
    if (!ll) return hideCard();
    const c = countryAt(ll.lat, ll.lon);
    if (!c) return hideCard();
    st.sel = { lat: ll.lat, lon: ll.lon }; dirty = true;
    card.innerHTML = `<div class="gl-c"><span class="flag">${c.flag}</span><span class="grow"><b>${esc(c.de)}</b><small>${D.visited.has(c.id) ? 'Besucht' : D.wish.has(c.id) ? 'Wunschland' : 'Noch nicht besucht'}</small><small>${when(ll.lat, ll.lon)}</small></span></div>
      <button class="btn primary sm" data-go>${icon('globe')}Land öffnen</button>`;
    card.hidden = false;
    card.querySelector('[data-go]').onclick = () => D.onCountry(c.id);
  };

  el.querySelector('.gl-night').onclick = e => {
    night = !night; const b = e.currentTarget; b.classList.toggle('on', night); b.setAttribute('aria-pressed', String(night)); dirty = true;
    toast(night ? 'Tag und Nacht an' : 'Tag und Nacht aus');
  };
  const close = () => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); el.classList.remove('in'); setTimeout(() => el.remove(), 300); };
  el.querySelector('.gl-x').onclick = close;
  return { close };
}
