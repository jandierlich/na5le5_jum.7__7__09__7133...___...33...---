// WowarWahr – Sehnsuchts-Kompass: zeigt, in welcher Richtung deine Orte gerade liegen.
// Nutzt Standort, Kompass-/Lagesensor und optional das Kamerabild – alles nur lokal, nichts wird gespeichert oder gesendet.
import { dist } from './wow-geo.js';
import { COLORS } from './wow-map.js';
import { $, esc, icon, fmtNum, toast } from './wow-ui.js';

const rad = Math.PI / 180;
const F = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif';
const LOCK = 9;      // Grad: so genau muss man hinschauen
const FOV = 62;      // Blickwinkel im Kamera-Modus

export function bearing(a, b) {
  const p1 = a.lat * rad, p2 = b.lat * rad, dl = (b.lon - a.lon) * rad;
  const y = Math.sin(dl) * Math.cos(p2), x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) / rad + 360) % 360;
}
const rel = (b, h) => ((b - h + 540) % 360) - 180; // -180..180, positiv = rechts
// Blickrichtung der Geräterückseite aus alpha/beta/gamma (W3C-Formel)
function headingFrom(alpha, beta, gamma) {
  const a = alpha * rad, b = beta * rad, g = gamma * rad;
  const cA = Math.cos(a), sA = Math.sin(a), sB = Math.sin(b), cG = Math.cos(g), sG = Math.sin(g);
  const rA = -cA * sG - sA * sB * cG, rB = -sA * sG + cA * sB * cG;
  return (Math.atan2(rA, rB) / rad + 360) % 360;
}
// Bezugsrichtung wie im Sternenhimmel: Gerät eher aufrecht → Rückkamera, sonst (flach) → Oberkante.
// So bleibt die Richtung auch bei flach gehaltenem Gerät stabil.
function refHeading(alpha, beta, gamma) {
  const a = alpha * rad, b = beta * rad, g = gamma * rad;
  const cB = Math.cos(b), cG = Math.cos(g);
  if (Math.abs(cB * cG) < 0.7) return headingFrom(alpha, beta, gamma);
  return (Math.atan2(-Math.sin(a) * cB, Math.cos(a) * cB) / rad + 360) % 360;
}
/* Ruhige Kompassrichtung (wie Sternenhimmel, HimmelsWahr und KompassWahr): Das Gyroskop trägt die Bewegung,
   der rauschende Magnetkompass liefert nur den Versatz zu Norden – stark geglättet, bei großer Abweichung
   schnell nachgeführt. */
function makeYawOffset() {
  let cur = null, fast = 0, last = 0;
  const w = d => ((d + 540) % 360) - 180;
  return (target, now) => {
    if (cur === null || !(now - last < 1000)) { cur = fast = target; last = now; return cur; }
    const dt = Math.max(0, now - last); last = now;
    fast = (fast + w(target - fast) * (1 - Math.exp(-dt / 250)) + 360) % 360;
    const bias = w(fast - cur), a = Math.abs(bias);
    const tau = a > 20 ? 100 : a > 6 ? 300 : a > 2.5 ? 700 : 2000;
    cur = (cur + bias * (1 - Math.exp(-dt / tau)) + 360) % 360;
    return cur;
  };
}
const dirWord = d => ['Norden', 'Nordosten', 'Osten', 'Südosten', 'Süden', 'Südwesten', 'Westen', 'Nordwesten'][Math.round(d / 45) % 8];
const kmText = km => km < 10 ? `${fmtNum(km, 1)} km` : `${fmtNum(km)} km`;

/**
 * D: { places:[{lat,lon,name,cid,date,visitId,color,thumb}], home, flagOf, countryName, fmtDate, onVisit(id) }
 */
export function openCompass(D) {
  const el = document.createElement('div'); el.className = 'compass';
  el.innerHTML = `<video class="cp-video" playsinline muted autoplay hidden></video>
    <canvas class="cp-canvas" aria-hidden="true"></canvas>
    <div class="cp-top">
      <button class="round cp-x" aria-label="Schließen">${icon('close')}</button>
      <button class="round" data-home aria-label="Zur Startseite">${icon('start')}</button>
      <div class="gl-title"><b>Sehnsuchts-Kompass</b><small class="cp-from">Wo liegen deine Orte?</small></div>
      <button class="round cp-cam" aria-label="Kamerabild" aria-pressed="false">${icon('camera')}</button>
      <button class="round cp-snd on" aria-label="Ton bei Treffer" aria-pressed="true">${icon('bell')}</button>
    </div>
    <div class="cp-start card">
      <div class="cp-ic">${icon('compass')}</div>
      <h3>Wohin zieht es dich zurück?</h3>
      <p>Halte dein Smartphone vor dich und dreh dich langsam im Kreis. Der Kompass zeigt dir, in welcher Richtung deine Orte gerade liegen – wie weit weg und wann du dort warst.</p>
      <button class="btn primary wide cp-go">${icon('compass')}Kompass starten</button>
      <p class="fine">Dafür fragt dein Smartphone nach Zugriff auf Standort und Bewegungssensoren. Beides wird nur auf dem Gerät verwendet und nicht gespeichert.</p>
    </div>
    <div class="cp-card card" hidden></div>
    <p class="cp-hint" hidden></p>`;
  $('#sheets').appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));

  const cv = el.querySelector('.cp-canvas'), ctx = cv.getContext('2d'), video = el.querySelector('video');
  const card = el.querySelector('.cp-card'), hint = el.querySelector('.cp-hint'), fromEl = el.querySelector('.cp-from');
  let W = 0, H = 0, dpr = 1, alive = true, raf = 0;
  let fused = false, lastT = 0; const yawOffset = makeYawOffset();
  let pos = null, fromHome = false, heading = 0, target = 0, hasSensor = false, cam = false, stream = null, sound = true;
  let watchId = null, current = null, lastLock = null, pulse = 0, hereShown = false, started = false;
  let audio = null;

  // Orte bündeln (gleiche Stelle ~5 km → ein Eintrag, jüngster Besuch zählt)
  const groups = new Map();
  for (const p of D.places) {
    if (p.lat == null) continue;
    const k = `${Math.round(p.lat * 20)},${Math.round(p.lon * 20)}`;
    const g = groups.get(k);
    if (!g) groups.set(k, { ...p, n: 1 });
    else { g.n++; if ((p.date || '') > (g.date || '')) Object.assign(g, { ...p, n: g.n }); if (!g.thumb && p.thumb) g.thumb = p.thumb; }
  }
  const items = [...groups.values()];
  let list = [];
  const recompute = () => {
    if (!pos) return;
    list = items.map(p => ({ p, b: bearing(pos, p), d: dist(pos, p) })).filter(x => x.d >= 1.5);
    const near = items.map(p => ({ p, d: dist(pos, p) })).sort((a, b) => a.d - b.d)[0];
    if (near && near.d < 3 && !hereShown && !fromHome) {
      hereShown = true;
      toast(`Du warst schon mal hier: ${near.p.name}${near.p.date ? ' · ' + D.fmtDate(near.p.date) : ''}`, 4200);
    }
    dirty = true;
  };
  let dirty = true;

  const resize = () => {
    const r = cv.getBoundingClientRect(); if (!r.width) return;
    dpr = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); dirty = true;
  };
  const ro = new ResizeObserver(resize); ro.observe(cv);

  // ---------- Sensoren ----------
  const onOrient = e => {
    let h = null;
    if (typeof e.webkitCompassHeading === 'number' && !isNaN(e.webkitCompassHeading)) {
      h = e.webkitCompassHeading;
      if (typeof e.alpha === 'number' && !isNaN(e.alpha) && typeof e.beta === 'number') {
        // Smartphone: Gyroskop + geglätteter Kompass-Versatz
        const g = refHeading(e.alpha, e.beta, e.gamma || 0);
        h = (g + yawOffset((h - g + 360) % 360, performance.now()) + 360) % 360;
        fused = true;
      } else fused = false;
    } else if (e.absolute && e.alpha != null) { h = refHeading(e.alpha, e.beta || 0, e.gamma || 0); fused = false; }
    if (h == null) return;
    if (!hasSensor) { hasSensor = true; hint.hidden = true; }
    target = h; dirty = true;
  };
  async function startSensors() {
    try {
      if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const r = await DeviceOrientationEvent.requestPermission();
        if (r !== 'granted') throw new Error('denied');
      }
    } catch (e) { toast('Ohne Bewegungssensoren kannst du den Kompass mit dem Finger drehen.', 3600); }
    window.addEventListener('deviceorientationabsolute', onOrient, true);
    window.addEventListener('deviceorientation', onOrient, true);
    setTimeout(() => { if (!hasSensor && alive) { hint.textContent = 'Kein Kompass gefunden – zum Drehen mit dem Finger wischen.'; hint.hidden = false; } }, 1800);
  }
  function startLocation() {
    const useHome = why => {
      if (pos) return;
      if (D.home) { pos = { lat: D.home.lat, lon: D.home.lon }; fromHome = true; fromEl.textContent = `Von deinem Heimatort ${D.home.name} aus${why ? ' · ' + why : ''}`; recompute(); }
      else { fromEl.textContent = 'Standort nicht verfügbar'; hint.textContent = 'Erlaube den Standort in den Einstellungen oder lege einen Heimatort fest.'; hint.hidden = false; }
    };
    if (!navigator.geolocation) return useHome('');
    watchId = navigator.geolocation.watchPosition(g => {
      const first = !pos || fromHome;
      pos = { lat: g.coords.latitude, lon: g.coords.longitude }; fromHome = false;
      fromEl.textContent = `Von deinem Standort aus · ${items.length} ${items.length === 1 ? 'Ort' : 'Orte'}`;
      recompute();
    }, e => useHome(e.code === 1 ? 'Standort nicht erlaubt' : ''), { enableHighAccuracy: false, maximumAge: 60000, timeout: 12000 });
    setTimeout(() => useHome(''), 6000);
  }
  async function toggleCamera() {
    const btn = el.querySelector('.cp-cam');
    if (cam) { cam = false; stream?.getTracks().forEach(t => t.stop()); stream = null; video.hidden = true; el.classList.remove('cam'); }
    else {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        video.srcObject = stream; video.hidden = false; await video.play().catch(() => {});
        cam = true; el.classList.add('cam');
      } catch (e) { toast('Kamera nicht verfügbar oder nicht erlaubt.'); }
    }
    btn.classList.toggle('on', cam); btn.setAttribute('aria-pressed', String(cam)); dirty = true;
  }
  const ping = () => {
    if (!sound) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const t = audio.currentTime, o = audio.createOscillator(), g = audio.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(880, t); o.frequency.exponentialRampToValueAtTime(1320, t + 0.12);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g).connect(audio.destination); o.start(t); o.stop(t + 0.4);
    } catch (e) {}
    try { navigator.vibrate && navigator.vibrate(25); } catch (e) {}
  };

  // Wischen, falls kein Sensor
  let drag = null;
  cv.style.touchAction = 'none';
  cv.addEventListener('pointerdown', e => { if (hasSensor) return; drag = { x: e.clientX, h: target }; try { cv.setPointerCapture(e.pointerId); } catch (err) {} });
  cv.addEventListener('pointermove', e => { if (!drag) return; target = (drag.h - (e.clientX - drag.x) * 0.45 + 360) % 360; dirty = true; });
  const endDrag = () => { drag = null; };
  cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);

  // ---------- Auswahl ----------
  const pick = () => {
    let best = null;
    for (const x of list) {
      const r = Math.abs(rel(x.b, heading));
      if (r > LOCK) continue;
      if (!best || r < best.r - 0.01 || (Math.abs(r - best.r) < 1.5 && x.d < best.x.d)) best = { x, r };
    }
    if (current && best && best.x !== current) {
      const cr = Math.abs(rel(current.b, heading));
      if (cr <= LOCK && cr < best.r + 2) best = { x: current, r: cr };
    }
    return best ? best.x : null;
  };
  const showCard = x => {
    if (!x) {
      card.hidden = true;
      if (list.length && started) {
        const n = [...list].sort((a, b) => Math.abs(rel(a.b, heading)) - Math.abs(rel(b.b, heading)))[0];
        const r = rel(n.b, heading);
        hint.textContent = `Nächster Ort: ${n.p.name} – ${Math.round(Math.abs(r))}° ${r > 0 ? 'nach rechts' : 'nach links'}${hasSensor ? '' : ' · zum Drehen wischen'}`;
        hint.hidden = false;
      }
      return;
    }
    hint.hidden = true;
    const same = list.filter(y => y !== x && Math.abs(rel(y.b, x.b)) <= LOCK).length;
    const p = x.p;
    card.innerHTML = `${p.thumb ? `<img class="cp-ph" src="${p.thumb}" alt="">` : `<span class="cp-flag">${D.flagOf(p.cid)}</span>`}
      <div class="grow"><small class="cp-over">Dort drüben, Richtung ${dirWord(x.b)}</small><b>${esc(p.name)}</b>
      <small>${[kmText(x.d), D.countryName(p.cid), p.date ? D.fmtDate(p.date) : ''].filter(Boolean).map(esc).join(' · ')}</small>
      ${same ? `<small>+ ${same} ${same === 1 ? 'weiterer Ort' : 'weitere Orte'} in dieser Richtung</small>` : ''}</div>${icon('chev', 'chev')}`;
    card.hidden = false;
    card.onclick = () => D.onVisit(p.visitId);
  };

  // ---------- Zeichnen ----------
  const draw = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    if (cam) drawAR(); else drawDial();
  };
  const dotR = x => { const md = Math.max(...list.map(y => y.d), 100); return 0.3 + 0.62 * Math.log(1 + x.d) / Math.log(1 + md); };
  function drawDial() {
    const cx = W / 2, cy = H * 0.44, R = Math.min(W * 0.44, H * 0.3);
    // Ziffernblatt
    const g = ctx.createRadialGradient(cx, cy - R * 0.2, R * 0.1, cx, cy, R * 1.05);
    g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#F0EEF4');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.05, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(90,47,190,.18)'; ctx.lineWidth = 1;
    for (const f of [0.3, 0.61, 0.92]) { ctx.beginPath(); ctx.arc(cx, cy, R * f, 0, Math.PI * 2); ctx.stroke(); }
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-heading * rad);
    for (let d = 0; d < 360; d += 5) {
      const long = d % 30 === 0, a = d * rad;
      ctx.strokeStyle = long ? 'rgba(31,27,42,.55)' : 'rgba(31,27,42,.2)'; ctx.lineWidth = long ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(Math.sin(a) * R * (long ? 0.95 : 0.98), -Math.cos(a) * R * (long ? 0.95 : 0.98)); ctx.lineTo(Math.sin(a) * R * 1.03, -Math.cos(a) * R * 1.03); ctx.stroke();
    }
    ctx.font = `700 15px ${F}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    [['N', 0], ['O', 90], ['S', 180], ['W', 270]].forEach(([t, d]) => {
      const a = d * rad; ctx.save(); ctx.translate(Math.sin(a) * R * 0.84, -Math.cos(a) * R * 0.84); ctx.rotate(heading * rad);
      ctx.fillStyle = t === 'N' ? COLORS.pin : '#464155'; ctx.fillText(t, 0, 0); ctx.restore();
    });
    // Orte
    for (const x of list) {
      const a = x.b * rad, r = R * dotR(x), X = Math.sin(a) * r, Y = -Math.cos(a) * r, on = x === current;
      ctx.fillStyle = x.p.color || COLORS.pin; ctx.globalAlpha = on ? 1 : 0.82;
      ctx.beginPath(); ctx.arc(X, Y, on ? 8 + pulse * 5 : 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = on ? 2.5 : 1.5; ctx.stroke(); ctx.globalAlpha = 1;
    }
    ctx.restore();
    // Blickrichtung
    ctx.fillStyle = COLORS.select; ctx.beginPath(); ctx.moveTo(cx, cy - R * 1.13); ctx.lineTo(cx - 9, cy - R * 1.13 - 14); ctx.lineTo(cx + 9, cy - R * 1.13 - 14); ctx.closePath(); ctx.fill();
    const beam = ctx.createLinearGradient(cx, cy, cx, cy - R);
    beam.addColorStop(0, 'rgba(90,47,190,0)'); beam.addColorStop(1, `rgba(90,47,190,${0.16 + pulse * 0.2})`);
    ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, (-90 - LOCK) * rad, (-90 + LOCK) * rad); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1F1B2A'; ctx.font = `800 ${Math.round(R * 0.2)}px ${F}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(heading) % 360}°`, cx, cy - 4);
    ctx.fillStyle = '#605C6C'; ctx.font = `600 13px ${F}`; ctx.fillText(dirWord(heading), cx, cy + R * 0.14);
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
  }
  function drawAR() {
    const cx = W / 2, horizon = H * 0.46;
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(0, horizon); ctx.lineTo(W, horizon); ctx.stroke(); ctx.setLineDash([]);
    const vis = list.map(x => ({ x, r: rel(x.b, heading) })).filter(o => Math.abs(o.r) < FOV / 2 + 4).sort((a, b) => b.x.d - a.x.d);
    const md = Math.max(...list.map(y => y.d), 100);
    const placed = [];
    for (const { x, r } of vis) {
      const X = cx + r / (FOV / 2) * (W / 2), f = Math.log(1 + x.d) / Math.log(1 + md), Y = horizon - 30 - f * H * 0.26;
      const on = x === current;
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(X, Y + 14); ctx.lineTo(X, horizon); ctx.stroke();
      ctx.fillStyle = x.p.color || COLORS.pin; ctx.beginPath(); ctx.arc(X, horizon, on ? 6 : 4, 0, Math.PI * 2); ctx.fill();
      const label = `${x.p.name} · ${kmText(x.d)}`;
      ctx.font = `${on ? 800 : 650} ${on ? 17 : 14}px ${F}`; const tw = ctx.measureText(label).width + 22, th = on ? 34 : 28;
      const LX = Math.max(tw / 2 + 8, Math.min(W - tw / 2 - 8, X));
      let y = Y; while (placed.some(q => Math.abs(q[0] - LX) < (tw + q[2]) / 2 && Math.abs(q[1] - y) < (th + q[3]) / 2)) y -= th + 4;
      placed.push([LX, y, tw, th]);
      ctx.fillStyle = on ? 'rgba(90,47,190,.95)' : 'rgba(255,255,255,.9)';
      const x0 = LX - tw / 2, y0 = y - th / 2, rr = th / 2;
      ctx.beginPath(); ctx.moveTo(x0 + rr, y0); ctx.arcTo(x0 + tw, y0, x0 + tw, y0 + th, rr); ctx.arcTo(x0 + tw, y0 + th, x0, y0 + th, rr); ctx.arcTo(x0, y0 + th, x0, y0, rr); ctx.arcTo(x0, y0, x0 + tw, y0, rr); ctx.fill();
      ctx.fillStyle = on ? '#fff' : '#1F1B2A'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, LX, y + 0.5);
    }
    // Kompassband
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(0, H * 0.62, W, 34);
    ctx.fillStyle = '#1F1B2A'; ctx.font = `700 13px ${F}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let d = -60; d <= 60; d += 15) {
      const deg = (Math.round(heading / 15) * 15 + d + 360) % 360, X = cx + rel(deg, heading) / (FOV / 2) * (W / 2);
      const t = { 0: 'N', 90: 'O', 180: 'S', 270: 'W' }[deg] ?? String(deg);
      ctx.fillStyle = t === 'N' ? COLORS.pin : '#1F1B2A'; ctx.fillText(t, X, H * 0.62 + 17);
    }
    ctx.fillStyle = COLORS.select; ctx.beginPath(); ctx.moveTo(cx, H * 0.62 - 2); ctx.lineTo(cx - 7, H * 0.62 - 12); ctx.lineTo(cx + 7, H * 0.62 - 12); ctx.closePath(); ctx.fill();
  }

  const loop = () => {
    if (!alive) return;
    const d = rel(target, heading);
    const now = performance.now(), dt = Math.min(200, Math.max(0, now - (lastT || now))); lastT = now;
    // Mit Gyroskop ist das Signal bereits ruhig: kurze, zeitbasierte Glättung (ca. 60 ms) wie im Sternenhimmel.
    // Ohne Gyroskop: kleine Abweichungen (Kompassrauschen) stark glätten, echte Drehungen zügig nachführen.
    const ad = Math.abs(d), k = fused ? 1 - Math.exp(-dt / 60) : ad > 12 ? 0.18 : ad > 4 ? 0.09 : 0.04;
    if (ad > 0.05) { heading = (heading + d * k + 360) % 360; dirty = true; }
    if (pulse > 0) { pulse = Math.max(0, pulse - 0.03); dirty = true; }
    if (dirty && W && started) {
      dirty = false;
      const t = pick();
      if (t !== current) { current = t; if (t && t !== lastLock) { lastLock = t; pulse = 1; ping(); } if (!t) lastLock = null; showCard(t); }
      else if (!t) showCard(null);
      draw();
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  el.querySelector('.cp-go').onclick = async () => {
    // Audio und Sensoren müssen im Tipp freigegeben werden (mobile Systeme)
    try { audio = new (window.AudioContext || window.webkitAudioContext)(); audio.resume && audio.resume(); } catch (e) {}
    await startSensors();
    el.querySelector('.cp-start').hidden = true; started = true;
    if (!items.length) { hint.textContent = 'Noch keine Orte gespeichert.'; hint.hidden = false; }
    startLocation(); dirty = true;
  };
  el.querySelector('.cp-cam').onclick = toggleCamera;
  el.querySelector('.cp-snd').onclick = e => { sound = !sound; e.currentTarget.classList.toggle('on', sound); e.currentTarget.setAttribute('aria-pressed', String(sound)); };
  const close = () => {
    alive = false; cancelAnimationFrame(raf); ro.disconnect();
    window.removeEventListener('deviceorientationabsolute', onOrient, true); window.removeEventListener('deviceorientation', onOrient, true);
    if (watchId != null) navigator.geolocation.clearWatch(watchId);
    stream?.getTracks().forEach(t => t.stop());
    try { audio && audio.close(); } catch (e) {}
    el.classList.remove('in'); setTimeout(() => el.remove(), 300);
  };
  el.querySelector('.cp-x').onclick = close;
  return { close };
}
