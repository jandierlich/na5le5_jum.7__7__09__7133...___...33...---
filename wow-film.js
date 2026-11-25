// WowarWahr – Reisefilm: animierte Reise durch die eigenen Jahre, lokal als Video aufgenommen
// Aufnahme über MediaRecorder (im Browser eingebaut), keine Daten verlassen das Gerät.
import { renderMap, fitView } from './wow-map.js';
import { boundsOf } from './wow-geo.js';
import { imageFromBlob } from './wow-photos.js';
import { $, icon, fmtNum, toast } from './wow-ui.js';
import { shareBlob } from './wow-share.js';

const F = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif';
const W = 720, H = 1280;
const MAP = { x: 28, y: 262, w: 664, h: 760 }; // h wird je Film angepasst (ohne Zähler größer)
const INTRO = 2.6, OUTRO = 5.2;

export function filmSupport() {
  return !!(window.MediaRecorder && HTMLCanvasElement.prototype.captureStream);
}
function pickMime() {
  const list = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  for (const m of list) { try { if (MediaRecorder.isTypeSupported(m)) return m; } catch (e) {} }
  return '';
}
export function filmDuration(n, outro = true) { return INTRO + n * eventDur(n) + (outro ? OUTRO : 2); }
function eventDur(n) { return Math.max(1.4, Math.min(3.2, 42 / Math.max(1, n))); }

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const back = t => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
// Kamera: Ansicht als Mittelpunkt (Welteinheiten) + Maßstab
const cam = v => ({ cx: (MAP.w / 2 - v.tx) / v.s, cy: (MAP.h / 2 - v.ty) / v.s, s: v.s });
function flyBetween(a, b, e) {
  let bx = b.cx; while (bx - a.cx > 0.5) bx -= 1; while (bx - a.cx < -0.5) bx += 1;
  const d = Math.hypot(bx - a.cx, b.cy - a.cy);
  const dip = Math.min(1.6, d * 5);
  const ls = Math.log(a.s) + (Math.log(b.s) - Math.log(a.s)) * e - dip * Math.sin(Math.PI * e);
  const s = Math.max(MAP.w, Math.exp(ls));
  const cx = a.cx + (bx - a.cx) * e, cy = a.cy + (b.cy - a.cy) * e;
  return { s, tx: MAP.w / 2 - cx * s, ty: MAP.h / 2 - cy * s };
}
// Teilroute bis Fortschritt p (0..1)
function partial(route, p) {
  if (route.length < 2) return route;
  const segs = route.length - 1, pos = p * segs, i = Math.floor(pos), f = pos - i;
  const out = route.slice(0, Math.min(route.length, i + 1));
  if (i < segs && f > 0) {
    const a = route[i], b = route[i + 1];
    let bl = b.lon; while (bl - a.lon > 180) bl -= 360; while (bl - a.lon < -180) bl += 360;
    out.push({ lat: a.lat + (b.lat - a.lat) * f, lon: a.lon + (bl - a.lon) * f });
  }
  return out;
}

async function prepPhoto(blob) {
  if (!blob) return null;
  try {
    const { img, url } = await imageFromBlob(blob);
    const m = 520, r = Math.min(1, m / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * r); c.height = Math.round(img.naturalHeight * r);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
    return c;
  } catch (e) { return null; }
}

/**
 * Film abspielen und aufnehmen.
 * opt: { events:[{title, sub, year, color, visits:[{lat,lon,cid,name}], route, km, homeRoute, photo:Blob}],
 *        title, range, finalVisited:Set, home, totals:{countries, places, km}, record:boolean }
 */
export async function playFilm(opt) {
  const el = document.createElement('div'); el.className = 'film';
  el.innerHTML = `<div class="fm-stage"><canvas width="${W}" height="${H}" aria-label="Reisefilm"></canvas></div>
    <div class="fm-top"><span class="fm-l"><button class="round fm-x" aria-label="Schließen">${icon('close')}</button><button class="round" data-home aria-label="Zur Startseite">${icon('start')}</button></span><span class="fm-rec" hidden>${icon('dot', 'em')} Aufnahme</span></div>
    <div class="fm-bar"><i></i></div>
    <div class="fm-end" hidden>
      <button class="btn primary" data-a="share">${icon('share')}Film teilen</button>
      <div class="btn-row"><button class="btn" data-a="again">${icon('film')}Nochmal</button><button class="btn" data-a="close">Schließen</button></div>
      <p class="fm-note"></p>
    </div>`;
  $('#sheets').appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  const cv = el.querySelector('canvas'), ctx = cv.getContext('2d');
  MAP.h = opt.counters === false ? 950 : 760;
  const OUT = opt.outro === false ? 2 : OUTRO;
  const photos = await Promise.all(opt.events.map(e => opt.photos === false ? null : prepPhoto(e.photo)));

  // Kamera-Stationen vorberechnen
  const all = opt.events.flatMap(e => e.visits);
  const worldPts = opt.home ? [...all, opt.home] : all;
  const worldView = cam(worldPts.length ? fitView(MAP.w, MAP.h, boundsOf(worldPts, 30), 40, 9000) : fitView(MAP.w, MAP.h, [-180, -56, 180, 76], 10));
  const views = opt.events.map(e => {
    const pts = e.route.length ? e.route : e.visits;
    return cam(fitView(MAP.w, MAP.h, boundsOf(pts, 3), 70, 22000));
  });
  const n = opt.events.length, D = eventDur(n), T = INTRO + n * D + OUT;
  const cumKm = []; let acc = 0; for (const e of opt.events) { cumKm.push(acc); acc += e.km; }

  let stopFlag = false, rec = null, chunks = [], mime = '', videoBlob = null;
  const recEl = el.querySelector('.fm-rec'), bar = el.querySelector('.fm-bar i'), end = el.querySelector('.fm-end');

  const frame = t => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#FBF8F1'); g.addColorStop(1, '#EFE7D6');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // Zustand bestimmen
    let view, idx = -1, u = 0, phase = 'intro';
    if (t < INTRO) view = worldView;
    else if (t < INTRO + n * D) { phase = 'ev'; idx = Math.min(n - 1, Math.floor((t - INTRO) / D)); u = (t - INTRO - idx * D) / D; view = flyBetween(idx ? views[idx - 1] : worldView, views[idx], ease(clamp(u / 0.32))); }
    else { phase = 'outro'; u = (t - INTRO - n * D) / OUT; view = flyBetween(n ? views[n - 1] : worldView, worldView, ease(clamp(u / 0.32))); }

    const visited = new Set(), pins = [], routes = [];
    let km = 0, places = 0, newest = null;
    const upto = phase === 'outro' ? n : idx;
    for (let i = 0; i < upto; i++) {
      const e = opt.events[i];
      for (const v of e.visits) { if (v.cid) visited.add(v.cid); pins.push({ lat: v.lat, lon: v.lon, color: e.color }); }
      if (e.route.length > 1) routes.push({ points: e.route, color: e.color + '70', width: 2.5 });
      km += e.km; places += e.visits.length;
    }
    if (phase === 'ev') {
      const e = opt.events[idx];
      const rp = clamp((u - 0.22) / 0.6);
      const route = e.route;
      const nv = e.visits.length;
      e.visits.forEach((v, k) => {
        const at = route.length > 1 ? (k + (e.homeRoute ? 1 : 0)) / (route.length - 1) : nv > 1 ? k / (nv - 1) : 0;
        if (rp + 1e-6 >= at && u > 0.2) {
          if (v.cid && !visited.has(v.cid)) newest = v.cid;
          if (v.cid) visited.add(v.cid);
          const age = clamp((rp - at) * 6 + 0.001);
          pins.push({ lat: v.lat, lon: v.lon, color: e.color, name: age > 0.3 ? v.name : undefined });
          places++;
        }
      });
      if (route.length > 1 && u > 0.2) routes.push({ points: partial(route, rp), color: e.color, width: 4 });
      km += e.km * rp;
    }
    if (phase === 'outro') for (const id of opt.finalVisited) visited.add(id);

    // Karte
    ctx.save(); rr(ctx, MAP.x, MAP.y, MAP.w, MAP.h, 34); ctx.clip(); ctx.translate(MAP.x, MAP.y);
    renderMap(ctx, MAP.w, MAP.h, view, { visited, pins: pins.map(p => ({ ...p, name: phase === 'ev' ? p.name : undefined })), routes, home: opt.home, labels: view.s > 1300, cities: false, cluster: false, pinSize: 9, fontScale: 1.55, selected: newest, detail: true, light: true });
    ctx.restore();
    ctx.save(); rr(ctx, MAP.x, MAP.y, MAP.w, MAP.h, 34); ctx.strokeStyle = 'rgba(35,31,48,.08)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();

    // Kopf
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.fillStyle = '#5A2FBE'; ctx.font = `700 26px ${F}`; ctx.fillText('WowarWahr', 44, 86);
    if (phase === 'intro') {
      const a = easeOut(clamp(t / 0.9));
      ctx.globalAlpha = a;
      ctx.fillStyle = '#231F30'; ctx.font = `800 64px ${F}`; let tt = opt.title || ''; while (ctx.measureText(tt).width > W - 88 && tt.length > 4) tt = tt.slice(0, -2) + '…'; ctx.fillText(tt, 44, 168 + (1 - a) * 20);
      ctx.fillStyle = '#706B80'; ctx.font = `500 30px ${F}`; ctx.fillText(opt.range || '', 44, 214 + (1 - a) * 20);
      ctx.globalAlpha = 1;
    } else if (phase === 'ev') {
      const e = opt.events[idx];
      const a = easeOut(clamp(u / 0.18));
      ctx.globalAlpha = a;
      if (e.year) { ctx.fillStyle = e.color; ctx.beginPath(); ctx.arc(54, 122, 9, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#464155'; ctx.font = `800 30px ${F}`; ctx.fillText(e.year, 74, 132); }
      ctx.fillStyle = '#231F30'; ctx.font = `800 50px ${F}`;
      let title = e.title; while (ctx.measureText(title).width > W - 88 && title.length > 4) title = title.slice(0, -2) + '…';
      ctx.fillText(title, 44, 188 + (1 - a) * 14);
      ctx.fillStyle = '#706B80'; ctx.font = `500 27px ${F}`; ctx.fillText(e.sub || '', 44, 230 + (1 - a) * 14);
      ctx.globalAlpha = 1;
    } else {
      const a = easeOut(clamp(u / 0.25));
      ctx.globalAlpha = a;
      ctx.fillStyle = '#231F30'; ctx.font = `800 56px ${F}`; ctx.fillText(opt.outroTitle || 'Meine Welt', 44, 172);
      ctx.fillStyle = '#706B80'; ctx.font = `500 30px ${F}`; ctx.fillText(opt.outroSub ?? (opt.range ? `bis heute · ${opt.range}` : 'bis heute'), 44, 216);
      ctx.globalAlpha = 1;
    }

    // Foto
    if (phase === 'ev' && photos[idx]) {
      const pu = clamp((u - 0.42) / 0.22), out = clamp((u - 0.9) / 0.1);
      if (pu > 0) {
        const img = photos[idx], sz = 300, bw = 14, sc = back(pu) * (1 - out * 0.15);
        ctx.save(); ctx.globalAlpha = 1 - out;
        ctx.translate(W - 60 - sz / 2, MAP.y + MAP.h - 70 - sz / 2); ctx.rotate(-0.07 + pu * 0.02); ctx.scale(sc, sc);
        ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
        ctx.fillStyle = '#fff'; ctx.fillRect(-sz / 2 - bw, -sz / 2 - bw, sz + bw * 2, sz + bw * 2 + 40);
        ctx.shadowColor = 'transparent';
        const r = Math.max(sz / img.width, sz / img.height);
        ctx.beginPath(); ctx.rect(-sz / 2, -sz / 2, sz, sz); ctx.clip();
        ctx.drawImage(img, -img.width * r / 2, -img.height * r / 2, img.width * r, img.height * r);
        ctx.restore();
      }
    }

    // Zähler
    if (opt.counters !== false) {
    const tiles = [[visited.size, visited.size === 1 ? 'Land' : 'Länder'], [places, places === 1 ? 'Ort' : 'Orte'], [fmtNum(km), 'km']];
    const tw = (W - 56 - 2 * 18) / 3, ty = MAP.y + MAP.h + 28;
    tiles.forEach(([v, l], i) => {
      const x = 28 + i * (tw + 18);
      ctx.fillStyle = '#fff'; rr(ctx, x, ty, tw, 150, 26); ctx.fill();
      ctx.fillStyle = i === 0 ? '#5A2FBE' : '#231F30'; ctx.font = `800 54px ${F}`; ctx.fillText(String(v), x + 24, ty + 80);
      ctx.fillStyle = '#706B80'; ctx.font = `600 25px ${F}`; ctx.fillText(l, x + 24, ty + 122);
    });
    }

    // Abspann
    if (phase === 'outro' && opt.outro !== false && u > 0.42) {
      const a = easeOut(clamp((u - 0.42) / 0.2));
      ctx.fillStyle = `rgba(36,23,72,${0.9 * a})`; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = a; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.font = `800 190px ${F}`; ctx.fillText(String(opt.totals.countries), W / 2, 560 + (1 - a) * 30);
      ctx.font = `700 48px ${F}`; ctx.fillText(opt.totals.countries === 1 ? 'Land' : 'Länder', W / 2, 640);
      ctx.font = `500 32px ${F}`; ctx.globalAlpha = a * 0.92;
      ctx.fillText(`${fmtNum(opt.totals.places)} Orte · ${fmtNum(opt.totals.km)} km`, W / 2, 720);
      ctx.font = `600 26px ${F}`; ctx.globalAlpha = a * 0.8; ctx.fillText('Erstellt mit WowarWahr', W / 2, H - 150);
      ctx.font = `500 18px ${F}`; ctx.globalAlpha = a * 0.6; ctx.fillText('Karte: Natural Earth (gemeinfrei) · Orte: GeoNames (CC BY 4.0)', W / 2, H - 112);
      ctx.globalAlpha = 1; ctx.textAlign = 'left';
    }
  };

  const run = record => new Promise(resolve => {
    end.hidden = true; stopFlag = false;
    if (record && filmSupport()) {
      mime = pickMime();
      try {
        const stream = cv.captureStream(30);
        rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 5e6 } : { videoBitsPerSecond: 5e6 });
        chunks = []; rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
        rec.onstop = () => { if (!stopFlag) videoBlob = new Blob(chunks, { type: (rec.mimeType || mime || 'video/webm').split(';')[0] }); resolve(); };
        rec.start(250); recEl.hidden = false;
      } catch (e) { rec = null; }
    } else rec = null;
    let t = 0, last = performance.now();
    const step = now => {
      if (stopFlag) { if (rec && rec.state !== 'inactive') rec.stop(); else resolve(); return; }
      t += Math.min(0.1, (now - last) / 1000); last = now;
      frame(Math.min(t, T)); bar.style.width = `${Math.min(100, t / T * 100)}%`;
      if (t < T + 0.8) requestAnimationFrame(step);
      else { recEl.hidden = true; if (rec && rec.state !== 'inactive') rec.stop(); else resolve(); }
    };
    requestAnimationFrame(step);
  });

  const close = () => { stopFlag = true; el.classList.remove('in'); setTimeout(() => el.remove(), 300); };
  el.querySelector('.fm-x').onclick = close;
  const showEnd = () => {
    end.hidden = false;
    const note = end.querySelector('.fm-note'), shareBtn = end.querySelector('[data-a=share]');
    if (videoBlob && videoBlob.size) { note.textContent = `Video fertig (${fmtNum(videoBlob.size / 1048576, 1)} MB) – z. B. per Nachricht oder über das Teilen-Menü versenden.`; shareBtn.hidden = false; }
    else { note.textContent = 'Dieses Gerät kann den Film leider nicht als Video aufnehmen – du kannst ihn aber jederzeit hier ansehen.'; shareBtn.hidden = true; }
  };
  end.querySelector('[data-a=share]').onclick = async () => {
    const ext = videoBlob.type.includes('mp4') ? 'mp4' : 'webm';
    const r = await shareBlob(videoBlob, `WowarWahr-Reisefilm.${ext}`, 'Mein Reisefilm');
    if (r === 'downloaded') toast('Video gespeichert');
  };
  end.querySelector('[data-a=again]').onclick = async () => { await run(false); if (!stopFlag) showEnd(); };
  end.querySelector('[data-a=close]').onclick = close;

  await run(opt.record !== false);
  if (!stopFlag) showEnd();
}
