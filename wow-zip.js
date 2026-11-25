// WowarWahr – schlanker ZIP-Schreiber/-Leser (unkomprimiert, "stored")
// Für Sicherungen mit vielen Fotos: kein riesiger Text im Speicher, Fotos bleiben Binärdaten.

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
const enc = new TextEncoder();

function dosTime(d = new Date()) {
  const t = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const dt = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return [t, dt];
}

export class ZipWriter {
  constructor() { this.parts = []; this.central = []; this.offset = 0; this.count = 0; }
  async add(name, data) {
    const bytes = data instanceof Blob ? new Uint8Array(await data.arrayBuffer()) : typeof data === 'string' ? enc.encode(data) : data;
    const nm = enc.encode(name);
    const crc = crc32(bytes);
    const [t, d] = dosTime();
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
    lh.setUint16(10, t, true); lh.setUint16(12, d, true); lh.setUint32(14, crc, true);
    lh.setUint32(18, bytes.length, true); lh.setUint32(22, bytes.length, true); lh.setUint16(26, nm.length, true); lh.setUint16(28, 0, true);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
    ch.setUint16(12, t, true); ch.setUint16(14, d, true); ch.setUint32(16, crc, true); ch.setUint32(20, bytes.length, true); ch.setUint32(24, bytes.length, true);
    ch.setUint16(28, nm.length, true); ch.setUint32(42, this.offset, true);
    this.parts.push(new Uint8Array(lh.buffer), nm, data instanceof Blob ? data : bytes);
    this.central.push(new Uint8Array(ch.buffer), nm);
    this.offset += 30 + nm.length + bytes.length; this.count++;
  }
  finish() {
    const size = this.central.reduce((s, p) => s + p.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, this.count, true); end.setUint16(10, this.count, true);
    end.setUint32(12, size, true); end.setUint32(16, this.offset, true);
    return new Blob([...this.parts, ...this.central, new Uint8Array(end.buffer)], { type: 'application/zip' });
  }
}

// Liest ZIP-Dateien, die mit ZipWriter (stored) erstellt wurden
export async function readZip(file) {
  const tailLen = Math.min(file.size, 65557);
  const tail = new DataView(await file.slice(file.size - tailLen).arrayBuffer());
  let e = -1;
  for (let i = tail.byteLength - 22; i >= 0; i--) if (tail.getUint32(i, true) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error('Keine ZIP-Datei');
  const n = tail.getUint16(e + 10, true), cdSize = tail.getUint32(e + 12, true), cdOff = tail.getUint32(e + 16, true);
  const cd = new DataView(await file.slice(cdOff, cdOff + cdSize).arrayBuffer());
  const dec = new TextDecoder();
  const entries = new Map();
  let p = 0;
  for (let i = 0; i < n; i++) {
    const method = cd.getUint16(p + 10, true), csize = cd.getUint32(p + 20, true);
    const nl = cd.getUint16(p + 28, true), xl = cd.getUint16(p + 30, true), cl = cd.getUint16(p + 32, true);
    const off = cd.getUint32(p + 42, true);
    const name = dec.decode(new Uint8Array(cd.buffer, p + 46, nl));
    entries.set(name, { off, csize, method });
    p += 46 + nl + xl + cl;
  }
  const blob = async (name, type = '') => {
    const en = entries.get(name); if (!en) return null;
    if (en.method !== 0) throw new Error('Komprimierte ZIP-Einträge werden nicht unterstützt');
    const lh = new DataView(await file.slice(en.off, en.off + 30).arrayBuffer());
    const start = en.off + 30 + lh.getUint16(26, true) + lh.getUint16(28, true);
    return file.slice(start, start + en.csize, type);
  };
  return { entries, blob, text: async name => { const b = await blob(name); return b ? b.text() : null; } };
}
