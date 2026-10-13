// WowarWahr – Fotos lokal verkleinern (bleiben auf dem Gerät)

function loadImage(blob) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { res({ img, url }); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Bild konnte nicht gelesen werden')); };
    img.src = url;
  });
}

function toBlob(canvas, q) {
  return new Promise(res => canvas.toBlob(b => res(b), 'image/jpeg', q));
}

async function scaled(img, max, q) {
  const r = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * r)), h = Math.max(1, Math.round(img.naturalHeight * r));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);
  return { blob: await toBlob(c, q), w, h };
}

export async function processPhoto(file) {
  const { img, url } = await loadImage(file);
  try {
    const big = await scaled(img, 1600, 0.82);
    const thumb = await scaled(img, 360, 0.72);
    return { blob: big.blob, thumb: thumb.blob, w: big.w, h: big.h };
  } finally { URL.revokeObjectURL(url); }
}

const urlCache = new Map();
export function blobURL(id, blob) {
  if (!blob) return '';
  if (urlCache.has(id)) return urlCache.get(id);
  const u = URL.createObjectURL(blob);
  urlCache.set(id, u);
  return u;
}
export function dropURL(id) {
  for (const k of [id, id + ':t']) if (urlCache.has(k)) { URL.revokeObjectURL(urlCache.get(k)); urlCache.delete(k); }
}

export function blobToDataURL(blob) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
}
export async function dataURLToBlob(u) {
  const r = await fetch(u); return r.blob();
}
export function imageFromBlob(blob) { return loadImage(blob); }
