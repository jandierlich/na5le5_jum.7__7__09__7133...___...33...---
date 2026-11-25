// WowarWahr – Teilen-Karte (Bild) lokal erzeugen
import { renderMap, fitView } from './wow-map.js';
import { boundsOf } from './wow-geo.js';
import { imageFromBlob } from './wow-photos.js';

const F = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

export async function renderShareCard({ title, subtitle, tiles, visited, wish, routes, pins, photos = [], focus = null }) {
  const W = 1080, H = 1350;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#FBF8F1'); g.addColorStop(1, '#F1EADB');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#5A2FBE'; ctx.font = `700 34px ${F}`; ctx.fillText('WowarWahr', 72, 104);
  ctx.fillStyle = '#231F30'; ctx.font = `800 76px ${F}`; ctx.fillText(title, 72, 196);
  ctx.fillStyle = '#706B80'; ctx.font = `500 36px ${F}`; ctx.fillText(subtitle || '', 72, 250);

  // Karte
  const mx = 48, my = 300, mw = W - 96, mh = 560;
  ctx.save(); rr(ctx, mx, my, mw, mh, 36); ctx.clip();
  ctx.translate(mx, my);
  const pts = (pins || []);
  let span = 999;
  if (pts.length) { const b = boundsOf(pts, 0); span = Math.max(b[2] - b[0], (b[3] - b[1]) * 1.6); }
  const view = focus ? fitView(mw, mh, focus, 40, 20000)
    : span < 70 ? fitView(mw, mh, boundsOf(pts, 32), 30)
    : fitView(mw, mh, [-180, -56, 180, 76], 10);
  renderMap(ctx, mw, mh, view, { visited, wish, routes: (routes || []).map(r => ({ points: r.points || r, width: 4, color: r.color })), pins: pts, pinSize: 9, cluster: false, light: true });
  ctx.restore();

  // Kacheln
  const tw = (W - 96 - 2 * 24) / 3, ty = 900;
  (tiles || []).slice(0, 3).forEach((t, i) => {
    const x = 48 + i * (tw + 24);
    ctx.fillStyle = '#FFFFFF'; rr(ctx, x, ty, tw, 170, 28); ctx.fill();
    ctx.fillStyle = t.color || '#5A2FBE'; ctx.font = `800 64px ${F}`; ctx.fillText(t.value, x + 28, ty + 92);
    ctx.fillStyle = '#706B80'; ctx.font = `600 28px ${F}`; ctx.fillText(t.label, x + 28, ty + 140);
  });

  // Fotos
  const imgs = [];
  for (const p of photos.slice(0, 4)) { try { imgs.push(await imageFromBlob(p.thumb || p.blob)); } catch (e) {} }
  if (imgs.length) {
    const sz = (W - 96 - (imgs.length - 1) * 16) / Math.max(4, imgs.length);
    imgs.forEach(({ img, url }, i) => {
      const x = 48 + i * (sz + 16), y = 1100;
      ctx.save(); rr(ctx, x, y, sz, 180, 24); ctx.clip();
      const r = Math.max(sz / img.naturalWidth, 180 / img.naturalHeight);
      ctx.drawImage(img, x + (sz - img.naturalWidth * r) / 2, y + (180 - img.naturalHeight * r) / 2, img.naturalWidth * r, img.naturalHeight * r);
      ctx.restore(); URL.revokeObjectURL(url);
    });
  } else {
    ctx.fillStyle = '#706B80'; ctx.font = `500 30px ${F}`;
    ctx.fillText('Wo war ich? – meine Reisekarte', 72, 1190);
  }
  ctx.fillStyle = '#9E9AA8'; ctx.font = `500 22px ${F}`;
  ctx.fillText('Karte: Natural Earth (gemeinfrei) · Orte: GeoNames (CC BY 4.0)', 72, H - 36);
  return new Promise(res => c.toBlob(res, 'image/png'));
}

export async function shareBlob(blob, name, text) {
  const file = new File([blob], name, { type: blob.type });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'WowarWahr', text });
      return 'shared';
    }
  } catch (e) { if (e.name === 'AbortError') return 'aborted'; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'downloaded';
}
