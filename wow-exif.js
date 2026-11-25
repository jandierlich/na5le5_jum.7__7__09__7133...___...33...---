// WowarWahr – eigener, minimaler EXIF-Leser (JPEG + HEIC)
// Liest nur Aufnahmedatum und GPS-Position. Alles lokal, nichts wird übertragen.

async function readBytes(file, start, len) {
  const b = await file.slice(start, start + len).arrayBuffer();
  return new DataView(b);
}
const str = (dv, o, n) => { let s = ''; for (let i = 0; i < n && o + i < dv.byteLength; i++) s += String.fromCharCode(dv.getUint8(o + i)); return s; };

function parseTiff(dv, base) {
  const le = dv.getUint16(base) === 0x4949;
  const u16 = o => dv.getUint16(base + o, le);
  const u32 = o => dv.getUint32(base + o, le);
  if (u16(2) !== 42) return null;
  const readIFD = off => {
    const tags = {};
    if (off <= 0 || base + off + 2 > dv.byteLength) return tags;
    const n = u16(off);
    for (let i = 0; i < n; i++) {
      const e = off + 2 + i * 12;
      if (base + e + 12 > dv.byteLength) break;
      const tag = u16(e), type = u16(e + 2), count = u32(e + 4);
      const size = ({ 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 })[type] || 1;
      const vo = size * count > 4 ? u32(e + 8) : e + 8;
      let val;
      try {
        if (type === 2) val = str(dv, base + vo, count).replace(/\0.*$/, '');
        else if (type === 3) val = count === 1 ? u16(vo) : Array.from({ length: count }, (_, k) => u16(vo + k * 2));
        else if (type === 4) val = count === 1 ? u32(vo) : Array.from({ length: count }, (_, k) => u32(vo + k * 4));
        else if (type === 5 || type === 10) val = Array.from({ length: count }, (_, k) => {
          const a = u32(vo + k * 8), b = u32(vo + k * 8 + 4); return b ? a / b : 0;
        });
        else if (type === 1 || type === 7) val = Array.from({ length: Math.min(count, 8) }, (_, k) => dv.getUint8(base + vo + k));
      } catch (err) { val = undefined; }
      tags[tag] = val;
    }
    return tags;
  };
  const ifd0 = readIFD(u32(4));
  const exif = ifd0[0x8769] ? readIFD(ifd0[0x8769]) : {};
  const gps = ifd0[0x8825] ? readIFD(ifd0[0x8825]) : {};
  const out = {};
  const dt = exif[0x9003] || exif[0x9004] || ifd0[0x0132];
  if (typeof dt === 'string') {
    const m = dt.match(/(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
    if (m && m[1] !== '0000') out.date = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
  }
  // Zeitzone: Offset aus EXIF, sonst GPS-Zeit (UTC) – für richtige Reihenfolge über Zeitzonen hinweg
  const off = exif[0x9011] || exif[0x9010];
  if (out.date && typeof off === 'string' && /^[+-]\d{2}:\d{2}$/.test(off)) {
    const t = Date.parse(out.date + off);
    if (!isNaN(t)) { out.utc = t; out.tz = off; }
  }
  if (!out.utc && typeof gps[0x1D] === 'string' && Array.isArray(gps[7])) {
    const m = gps[0x1D].match(/(\d{4}):(\d{2}):(\d{2})/);
    if (m) {
      const [hh, mm, ss] = gps[7];
      const t = Date.UTC(+m[1], +m[2] - 1, +m[3], hh | 0, mm | 0, Math.floor(ss || 0));
      if (!isNaN(t)) out.utc = t;
    }
  }
  if (out.date && !out.utc) out.utc = Date.parse(out.date + 'Z'); // Näherung (Ortszeit)
  const dms = v => Array.isArray(v) && v.length >= 3 ? v[0] + v[1] / 60 + v[2] / 3600 : null;
  let lat = dms(gps[2]), lon = dms(gps[4]);
  if (lat != null && lon != null && !(lat === 0 && lon === 0)) {
    if (gps[1] === 'S') lat = -lat;
    if (gps[3] === 'W') lon = -lon;
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) { out.lat = lat; out.lon = lon; }
  }
  return out;
}

async function jpeg(file) {
  const dv = await readBytes(file, 0, Math.min(file.size, 512 * 1024));
  let o = 2;
  while (o + 4 < dv.byteLength) {
    if (dv.getUint8(o) !== 0xFF) break;
    const marker = dv.getUint8(o + 1);
    const len = dv.getUint16(o + 2);
    if (marker === 0xE1 && str(dv, o + 4, 4) === 'Exif') return parseTiff(dv, o + 10);
    if (marker === 0xDA) break;
    o += 2 + len;
  }
  return {};
}

async function heic(file) {
  const head = await readBytes(file, 0, Math.min(file.size, 256 * 1024));
  const boxes = (dv, start, end) => {
    const list = [];
    let o = start;
    while (o + 8 <= end) {
      let size = dv.getUint32(o); const type = str(dv, o + 4, 4); let hdr = 8;
      if (size === 1) { size = Number(dv.getBigUint64(o + 8)); hdr = 16; }
      if (size === 0) size = end - o;
      if (size < 8) break;
      list.push({ type, start: o, body: o + hdr, end: Math.min(o + size, end) });
      o += size;
    }
    return list;
  };
  const top = boxes(head, 0, head.byteLength);
  const meta = top.find(b => b.type === 'meta');
  if (!meta) return {};
  const inner = boxes(head, meta.body + 4, meta.end);
  const iinf = inner.find(b => b.type === 'iinf');
  const iloc = inner.find(b => b.type === 'iloc');
  if (!iinf || !iloc) return {};
  // Exif-Item finden
  let exifId = null;
  {
    const v = head.getUint8(iinf.body);
    const o = iinf.body + 4 + (v === 0 ? 2 : 4);
    for (const infe of boxes(head, o, iinf.end)) {
      if (infe.type !== 'infe') continue;
      const iv = head.getUint8(infe.body);
      let p = infe.body + 4;
      const id = iv >= 3 ? head.getUint32(p) : head.getUint16(p); p += iv >= 3 ? 4 : 2;
      p += 2;
      if (iv >= 2 && str(head, p, 4) === 'Exif') { exifId = id; break; }
    }
  }
  if (exifId == null) return {};
  // Position aus iloc
  const v = head.getUint8(iloc.body);
  let p = iloc.body + 4;
  const b1 = head.getUint8(p), b2 = head.getUint8(p + 1); p += 2;
  const offSize = b1 >> 4, lenSize = b1 & 15, baseSize = b2 >> 4, idxSize = (v === 1 || v === 2) ? b2 & 15 : 0;
  const rd = n => { let val = 0; if (n === 4) val = head.getUint32(p); else if (n === 8) val = Number(head.getBigUint64(p)); else if (n === 2) val = head.getUint16(p); p += n; return val; };
  const count = v < 2 ? rd(2) : rd(4);
  for (let i = 0; i < count; i++) {
    const id = v < 2 ? rd(2) : rd(4);
    if (v === 1 || v === 2) rd(2);
    rd(2);
    const base = rd(baseSize);
    const ext = rd(2);
    let first = null;
    for (let e = 0; e < ext; e++) {
      if (idxSize) rd(idxSize);
      const off = rd(offSize), len = rd(lenSize);
      if (!first) first = { off: base + off, len };
    }
    if (id === exifId && first) {
      const dv = await readBytes(file, first.off, Math.min(first.len, 256 * 1024));
      const skip = dv.getUint32(0);
      return parseTiff(dv, 4 + skip) || {};
    }
  }
  return {};
}

export async function readExif(file) {
  try {
    const sig = await readBytes(file, 0, 12);
    if (sig.getUint16(0) === 0xFFD8) return (await jpeg(file)) || {};
    if (str(sig, 4, 4) === 'ftyp') return (await heic(file)) || {};
  } catch (e) { /* keine Metadaten */ }
  return {};
}
