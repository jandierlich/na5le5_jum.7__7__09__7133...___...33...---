/* ============================================================
   lb-core.js — LabWahr: Auswertung der Messdaten
   Reine Rechenfunktionen ohne Oberfläche: Schwingungsdauer,
   Integration, Hüllkurven, Echo, Aufprall-Zeiten, Tonhöhe,
   Nachhall, Sonnenstand. Alles läuft auf dem Gerät.
   Eigene Umsetzung bekannter Physik- und Astronomie-Formeln
   (Sonnenstand nach dem NOAA-Verfahren, Tonhöhe nach dem
   veröffentlichten YIN-Verfahren).
   © 2026 Jan Dierlich – Alle Rechte vorbehalten.
   ============================================================ */
(function (global) {
  "use strict";
  var G = 9.80665, RAD = Math.PI / 180;

  /* ---------- Statistik ---------- */
  function mean(a) { if (!a.length) return NaN; var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s / a.length; }
  function sd(a) { if (a.length < 2) return 0; var m = mean(a), s = 0; for (var i = 0; i < a.length; i++) s += (a[i] - m) * (a[i] - m); return Math.sqrt(s / (a.length - 1)); }
  function percentile(a, p) {
    if (!a.length) return NaN;
    var b = a.slice().sort(function (x, y) { return x - y; }), k = (b.length - 1) * p, i = Math.floor(k), f = k - i;
    return i + 1 < b.length ? b[i] + (b[i + 1] - b[i]) * f : b[i];
  }
  function median(a) { return percentile(a, 0.5); }
  /* Ausreißer entfernen: nur Werte innerhalb ±tol (relativ) um den Median */
  function robust(a, tol) { var m = median(a); return a.filter(function (x) { return Math.abs(x - m) <= Math.abs(m) * tol; }); }

  /* ---------- Hauptachse einer 3D-Messreihe (für frei hängende Geräte) ---------- */
  function pca1(xs, ys, zs) {
    var n = xs.length; if (n < 3) return xs.slice();
    var mx = mean(xs), my = mean(ys), mz = mean(zs), c = [0, 0, 0, 0, 0, 0];
    for (var i = 0; i < n; i++) {
      var x = xs[i] - mx, y = ys[i] - my, z = zs[i] - mz;
      c[0] += x * x; c[1] += x * y; c[2] += x * z; c[3] += y * y; c[4] += y * z; c[5] += z * z;
    }
    var v = [1, 0.7, 0.3];
    for (var k = 0; k < 40; k++) {
      var w = [c[0] * v[0] + c[1] * v[1] + c[2] * v[2], c[1] * v[0] + c[3] * v[1] + c[4] * v[2], c[2] * v[0] + c[4] * v[1] + c[5] * v[2]];
      var nn = Math.hypot(w[0], w[1], w[2]) || 1; v = [w[0] / nn, w[1] / nn, w[2] / nn];
    }
    var out = new Array(n);
    for (i = 0; i < n; i++) out[i] = (xs[i] - mx) * v[0] + (ys[i] - my) * v[1] + (zs[i] - mz) * v[2];
    return out;
  }

  /* ---------- Schwingungsdauer aus Nulldurchgängen (mit Hysterese) ---------- */
  function periods(t, x) {
    var n = t.length; if (n < 10) return { list: [], T: NaN, sd: NaN, n: 0, crossings: [] };
    var m = mean(x), s = sd(x), thr = Math.max(s * 0.25, 1e-9), state = 0, cr = [];
    for (var i = 1; i < n; i++) {
      var v = x[i] - m, p = x[i - 1] - m;
      if (state <= 0 && v > thr) {
        /* letzten Nulldurchgang davor suchen und linear interpolieren */
        for (var j = i; j > 0; j--) {
          var a = x[j - 1] - m, b = x[j] - m;
          if (a <= 0 && b > 0) { cr.push(t[j - 1] + (t[j] - t[j - 1]) * (-a / (b - a))); break; }
        }
        state = 1;
      } else if (state >= 0 && v < -thr) state = -1;
      void p;
    }
    var L = [];
    for (i = 1; i < cr.length; i++) L.push(cr[i] - cr[i - 1]);
    var good = L.length >= 3 ? robust(L, 0.2) : L;
    return { list: good, T: good.length ? mean(good) : NaN, sd: good.length > 1 ? sd(good) : NaN, n: good.length, crossings: cr };
  }
  function pendulumG(L, T) { return 4 * Math.PI * Math.PI * L / (T * T); }

  /* ---------- Fliehkraft: a = r·ω² (Ausgleichsrechnung durch den Ursprung) ---------- */
  function spinFit(pairs) {
    var sxy = 0, sxx = 0;
    pairs.forEach(function (p) { var w2 = p.w * p.w; sxy += p.a * w2; sxx += w2 * w2; });
    return sxx > 0 ? sxy / sxx : NaN;
  }

  /* ---------- Aufzug: zweimal integrieren, Drift über „Stillstand am Ende“ entfernen ---------- */
  function liftIntegrate(t, a, restSec) {
    var n = t.length; if (n < 20) return null;
    var t0 = t[0], rest = [];
    for (var i = 0; i < n && t[i] - t0 < (restSec || 1.5); i++) rest.push(a[i]);
    var g0 = mean(rest), v = [0];
    for (i = 1; i < n; i++) v.push(v[i - 1] + 0.5 * ((a[i] - g0) + (a[i - 1] - g0)) * (t[i] - t[i - 1]));
    var T = t[n - 1] - t0, vEnd = v[n - 1], h = [0], vmax = 0;
    for (i = 0; i < n; i++) { v[i] -= vEnd * (t[i] - t0) / T; if (Math.abs(v[i]) > Math.abs(vmax)) vmax = v[i]; }
    for (i = 1; i < n; i++) h.push(h[i - 1] + 0.5 * (v[i] + v[i - 1]) * (t[i] - t[i - 1]));
    var amax = 0; for (i = 0; i < n; i++) if (Math.abs(a[i] - g0) > Math.abs(amax)) amax = a[i] - g0;
    return { h: h[n - 1], vmax: vmax, amax: amax, g0: g0, v: v, hs: h, T: T };
  }

  /* ---------- Schaukel: aus der größten Last den Ausschlag schätzen ---------- */
  function swingAmplitude(gmax) { if (!(gmax > 1 && gmax < 3)) return NaN; return Math.acos((3 - gmax) / 2) / RAD; }

  /* ---------- Ereignisse (Seismograf, Schritte) ---------- */
  function events(t, x, opts) {
    opts = opts || {};
    var gap = opts.gap || 0.4, base = percentile(x, 0.5), noise = percentile(x.map(function (v) { return Math.abs(v - base); }), 0.8) || 1e-6;
    var thr = base + Math.max(noise * (opts.k || 6), opts.min || 0), ev = [], i = 0, n = t.length;
    while (i < n) {
      if (x[i] > thr) {
        var j = i, pk = i;
        while (j < n && (x[j] > thr || t[j] - t[pk] < gap * 0.5)) { if (x[j] > x[pk]) pk = j; j++; }
        if (!ev.length || t[pk] - ev[ev.length - 1].t >= gap) ev.push({ t: t[pk], v: x[pk] });
        else if (x[pk] > ev[ev.length - 1].v) ev[ev.length - 1] = { t: t[pk], v: x[pk] };
        i = j;
      } else i++;
    }
    return { list: ev, thr: thr, noise: noise, base: base };
  }

  /* Schritte: geglätteter Betrag der Beschleunigung, Spitzen mit Mindestabstand */
  function stepCount(t, mag) {
    var n = t.length; if (n < 20) return { n: 0, list: [] };
    var sm = new Array(n), k = 0.25, s = mag[0];
    for (var i = 0; i < n; i++) { s += k * (mag[i] - s); sm[i] = s; }
    var m = mean(sm), d = sd(sm), thr = m + 0.35 * d, peaks = [];
    for (i = 1; i < n - 1; i++) {
      if (sm[i] > thr && sm[i] >= sm[i - 1] && sm[i] > sm[i + 1]) {
        if (!peaks.length || t[i] - peaks[peaks.length - 1].t >= 0.28) peaks.push({ t: t[i], v: sm[i] });
        else if (sm[i] > peaks[peaks.length - 1].v) peaks[peaks.length - 1] = { t: t[i], v: sm[i] };
      }
    }
    return { n: peaks.length, list: peaks, thr: thr };
  }

  /* Gleichgewicht: Schwerkraft per gleitendem Mittel entfernen, Rest als Effektivwert */
  function sway(t, xs, ys, zs) {
    var n = t.length; if (n < 30) return NaN;
    var w = 1.0, j0 = 0, sx = 0, sy = 0, sz = 0, cnt = 0, acc = 0, used = 0, q = [];
    for (var i = 0; i < n; i++) {
      q.push(i); sx += xs[i]; sy += ys[i]; sz += zs[i]; cnt++;
      while (t[i] - t[q[0]] > w) { var o = q.shift(); sx -= xs[o]; sy -= ys[o]; sz -= zs[o]; cnt--; }
      if (t[i] - t[0] < w) continue;
      var dx = xs[i] - sx / cnt, dy = ys[i] - sy / cnt, dz = zs[i] - sz / cnt;
      acc += dx * dx + dy * dy + dz * dz; used++;
    }
    void j0;
    return used ? Math.sqrt(acc / used) : NaN;
  }

  /* ---------- Schall: Hüllkurve (Effektivwert in kurzen Fenstern) ---------- */
  function envelope(buf, sr, winMs) {
    var w = Math.max(8, Math.round(sr * (winMs || 2) / 1000)), out = new Float32Array(Math.floor(buf.length / w));
    for (var k = 0; k < out.length; k++) { var s = 0, o = k * w; for (var i = 0; i < w; i++) { var v = buf[o + i]; s += v * v; } out[k] = Math.sqrt(s / w); }
    return { env: out, step: w / sr };
  }
  function db(x) { return 20 * Math.log10(Math.max(x, 1e-9)); }

  /* Echo: stärkster Knall, danach das deutlichste spätere Maximum nach einem Abklingen */
  function echoDelay(env, step, opts) {
    opts = opts || {};
    var n = env.length; if (n < 20) return null;
    var p0 = 0; for (var i = 0; i < n; i++) if (env[i] > env[p0]) p0 = i;
    var noise = percentile(Array.prototype.slice.call(env, 0, Math.max(5, p0 - Math.round(0.02 / step))), 0.5) || 1e-6;
    var minI = p0 + Math.round((opts.minSec || 0.03) / step), maxI = Math.min(n - 1, p0 + Math.round((opts.maxSec || 1.2) / step));
    var best = -1, bestScore = 0, low = env[p0];
    for (i = minI; i < maxI; i++) {
      low = Math.min(low, env[i]);
      if (env[i] >= env[i - 1] && env[i] >= env[i + 1] && env[i] > noise * 3) {
        var score = env[i] / Math.max(low, noise);
        if (score > 1.6 && score > bestScore) { bestScore = score; best = i; }
      }
    }
    if (best < 0) return { p0: p0, dt: NaN, ratio: 0 };
    return { p0: p0, p1: best, dt: (best - p0) * step, ratio: bestScore, rel: env[best] / env[p0] };
  }

  /* Aufprall-Zeitpunkte (hüpfender Ball): steile Anstiege der Hüllkurve */
  function onsets(env, step, opts) {
    opts = opts || {};
    var n = env.length, out = [], ref = Math.round((opts.lookSec || 0.012) / step), refr = Math.round((opts.refrSec || 0.06) / step);
    var peak = 0; for (var i = 0; i < n; i++) peak = Math.max(peak, env[i]);
    var floor = percentile(Array.prototype.slice.call(env), 0.3) || 1e-6, thr = Math.max(floor * 5, peak * (opts.rel || 0.06));
    var last = -1e9;
    for (i = ref; i < n; i++) {
      if (env[i] > thr && env[i] > 3 * env[i - ref] && i - last > refr) { out.push(i * step); last = i; }
    }
    return out;
  }
  function bounce(times, H) {
    if (times.length < 3) return null;
    var iv = []; for (var i = 1; i < times.length; i++) iv.push(times[i] - times[i - 1]);
    /* nur abnehmende Folge zu Beginn */
    var seq = [iv[0]];
    for (i = 1; i < iv.length; i++) { if (iv[i] < seq[seq.length - 1] * 1.02 && iv[i] > seq[seq.length - 1] * 0.4) seq.push(iv[i]); else break; }
    if (seq.length < 2) return null;
    var ratios = []; for (i = 1; i < Math.min(seq.length, 5); i++) ratios.push(seq[i] / seq[i - 1]);
    var e = median(ratios), h1 = G * seq[0] * seq[0] / 8;
    return { e: e, h1: h1, seq: seq, loss: 1 - e * e, fromH: H ? h1 / H : NaN, eFromH: H ? Math.sqrt(h1 / H) : NaN };
  }

  /* Nachhallzeit aus dem Abklingen (lineare Ausgleichsgerade im dB-Verlauf) */
  function reverb(env, step) {
    var n = env.length; if (n < 30) return null;
    var p0 = 0; for (var i = 0; i < n; i++) if (env[i] > env[p0]) p0 = i;
    var pk = db(env[p0]), floor = db(percentile(Array.prototype.slice.call(env, Math.min(n - 1, p0 + 1)), 0.1) || 1e-6);
    var span = pk - floor;
    var range = span >= 35 ? [5, 25] : span >= 25 ? [5, 20] : span >= 18 ? [3, 13] : null;
    if (!range) return { ok: false, span: span };
    /* geglätteter Verlauf (10 ms) */
    var sm = [], k = Math.max(1, Math.round(0.01 / step));
    for (i = p0; i < n; i++) { var s = 0, c = 0; for (var j = Math.max(p0, i - k); j <= Math.min(n - 1, i + k); j++) { s += env[j] * env[j]; c++; } sm.push(db(Math.sqrt(s / c))); }
    var a = -1, b = -1;
    for (i = 0; i < sm.length; i++) { if (a < 0 && sm[i] <= pk - range[0]) a = i; if (a >= 0 && sm[i] <= pk - range[1]) { b = i; break; } }
    if (a < 0 || b < 0 || b - a < 3) return { ok: false, span: span };
    var xs = [], ys = []; for (i = a; i <= b; i++) { xs.push(i * step); ys.push(sm[i]); }
    var mx = mean(xs), my = mean(ys), sxy = 0, sxx = 0;
    for (i = 0; i < xs.length; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) * (xs[i] - mx); }
    var slope = sxy / sxx;
    if (!(slope < 0)) return { ok: false, span: span };
    return { ok: true, rt60: -60 / slope, slope: slope, span: span, range: range };
  }

  /* Tonhöhe (YIN, eigene Umsetzung des veröffentlichten Verfahrens) */
  function yin(buf, sr, fmin, fmax) {
    var W = Math.min(2048, Math.floor(buf.length / 2)), tMin = Math.floor(sr / (fmax || 1500)), tMax = Math.min(Math.floor(sr / (fmin || 60)), buf.length - W - 1);
    if (tMax <= tMin + 2) return null;
    var d = new Float32Array(tMax + 2), rms = 0;
    for (var i = 0; i < W; i++) rms += buf[i] * buf[i];
    if (Math.sqrt(rms / W) < 0.004) return null;
    for (var t = 1; t <= tMax + 1; t++) { var s = 0; for (var j = 0; j < W; j++) { var x = buf[j] - buf[j + t]; s += x * x; } d[t] = s; }
    var run = 0; d[0] = 1;
    for (t = 1; t <= tMax + 1; t++) { run += d[t]; d[t] = d[t] * t / (run || 1); }
    var tau = -1;
    for (t = tMin; t <= tMax; t++) { if (d[t] < 0.15) { while (t + 1 <= tMax && d[t + 1] < d[t]) t++; tau = t; break; } }
    if (tau < 1) return null;
    var a = d[tau - 1], b = d[tau], c = d[tau + 1], den = a - 2 * b + c, p = den ? 0.5 * (a - c) / den : 0;
    return { f: sr / (tau + p), q: 1 - b };
  }
  /* Spektrum-Spitze (Werte in dB) mit Parabel-Interpolation */
  function peakFreq(spec, binHz, fmin, fmax) {
    var i0 = Math.max(1, Math.floor(fmin / binHz)), i1 = Math.min(spec.length - 2, Math.ceil(fmax / binHz)), best = i0;
    for (var i = i0; i <= i1; i++) if (spec[i] > spec[best]) best = i;
    var a = spec[best - 1], b = spec[best], c = spec[best + 1], den = a - 2 * b + c, p = den ? 0.5 * (a - c) / den : 0;
    return { f: (best + p) * binHz, db: b };
  }
  function dopplerSpeed(f1, f2, c) { return (c || 343) * (f1 - f2) / (f1 + f2); }
  function soundSpeed(tempC) { return 331.3 * Math.sqrt(1 + (tempC == null ? 20 : tempC) / 273.15); }

  /* Lautstärke über Abstand: Abnahme pro Abstandsverdopplung (Ausgleichsgerade über log2) */
  function levelSlope(points) {
    var xs = points.map(function (p) { return Math.log2(p.d); }), ys = points.map(function (p) { return p.db; });
    if (xs.length < 2) return NaN;
    var mx = mean(xs), my = mean(ys), sxy = 0, sxx = 0;
    for (var i = 0; i < xs.length; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) * (xs[i] - mx); }
    return sxx ? sxy / sxx : NaN;
  }

  /* ---------- Sonne (NOAA-Verfahren) ---------- */
  function solar(ms) {
    var jd = ms / 864e5 + 2440587.5, T = (jd - 2451545) / 36525;
    var L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360, M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
    var e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
    var C = Math.sin(M * RAD) * (1.914602 - T * (0.004817 + 0.000014 * T)) + Math.sin(2 * M * RAD) * (0.019993 - 0.000101 * T) + Math.sin(3 * M * RAD) * 0.000289;
    var om = 125.04 - 1934.136 * T, lam = L0 + C - 0.00569 - 0.00478 * Math.sin(om * RAD);
    var eps = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60 + 0.00256 * Math.cos(om * RAD);
    var dec = Math.asin(Math.sin(eps * RAD) * Math.sin(lam * RAD)), y = Math.pow(Math.tan(eps * RAD / 2), 2);
    var eqt = 4 / RAD * (y * Math.sin(2 * L0 * RAD) - 2 * e * Math.sin(M * RAD) + 4 * e * y * Math.sin(M * RAD) * Math.cos(2 * L0 * RAD) - 0.5 * y * y * Math.sin(4 * L0 * RAD) - 1.25 * e * e * Math.sin(2 * M * RAD));
    return { dec: dec / RAD, eqt: eqt };
  }
  /* Sonnenhöhe in Grad für Ort und Zeit (für Vergleiche) */
  function sunElevation(ms, lat, lon) {
    var so = solar(ms), d = new Date(ms), utcMin = d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60;
    var ha = (utcMin + so.eqt + 4 * lon) / 4 - 180;
    var s = Math.sin(lat * RAD) * Math.sin(so.dec * RAD) + Math.cos(lat * RAD) * Math.cos(so.dec * RAD) * Math.cos(ha * RAD);
    return Math.asin(Math.max(-1, Math.min(1, s))) / RAD;
  }
  function stickElevation(H, L) { return Math.atan2(H, L) / RAD; }
  /* Breite aus der Mittagshöhe (Sonne im Süden, Nordhalbkugel nördlich der Wendekreise) */
  function latitudeFromNoon(elev, ms) { return 90 - elev + solar(ms).dec; }
  function eratosthenes(a, b, dKm) {
    var pa = latitudeFromNoon(stickElevation(a.H, a.L), a.ms), pb = latitudeFromNoon(stickElevation(b.H, b.L), b.ms), dphi = Math.abs(pa - pb);
    return { phiA: pa, phiB: pb, dphi: dphi, U: dphi > 0.05 ? 360 / dphi * dKm : NaN };
  }
  /* Wahrer Mittag: Parabel durch Schattenlängen, Minimum = Mittag */
  function noonFit(pts) {
    if (pts.length < 3) return null;
    var t0 = mean(pts.map(function (p) { return p.ms; })), X = pts.map(function (p) { return (p.ms - t0) / 36e5; }), Y = pts.map(function (p) { return p.L; });
    var s = [0, 0, 0, 0, 0], r = [0, 0, 0];
    for (var i = 0; i < X.length; i++) { var x = X[i], y = Y[i]; s[0] += 1; s[1] += x; s[2] += x * x; s[3] += x * x * x; s[4] += x * x * x * x; r[0] += y; r[1] += x * y; r[2] += x * x * y; }
    var A = [[s[4], s[3], s[2], r[2]], [s[3], s[2], s[1], r[1]], [s[2], s[1], s[0], r[0]]];
    for (var c = 0; c < 3; c++) {
      var p = c; for (var k = c + 1; k < 3; k++) if (Math.abs(A[k][c]) > Math.abs(A[p][c])) p = k;
      var tmp = A[c]; A[c] = A[p]; A[p] = tmp; if (Math.abs(A[c][c]) < 1e-12) return null;
      for (k = 0; k < 3; k++) { if (k === c) continue; var f = A[k][c] / A[c][c]; for (var j = c; j < 4; j++) A[k][j] -= f * A[c][j]; }
    }
    var a = A[0][3] / A[0][0], b = A[1][3] / A[1][1];
    if (!(a > 0)) return null;
    var xm = -b / (2 * a), before = X.filter(function (x) { return x < xm; }).length, after = X.length - before;
    var cc = A[2][3] / A[2][2];
    return { ms: t0 + xm * 36e5, both: before > 0 && after > 0, a: a, b: b, c: cc, t0: t0 };
  }
  function longitudeFromNoon(noonMs) {
    var d = new Date(noonMs), utcMin = d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60;
    return (720 - solar(noonMs).eqt - utcMin) / 4;
  }

  var API = {
    G: G, mean: mean, sd: sd, median: median, percentile: percentile, robust: robust, pca1: pca1,
    periods: periods, pendulumG: pendulumG, spinFit: spinFit, liftIntegrate: liftIntegrate, swingAmplitude: swingAmplitude,
    events: events, stepCount: stepCount, sway: sway, envelope: envelope, db: db, echoDelay: echoDelay, onsets: onsets, bounce: bounce,
    reverb: reverb, yin: yin, peakFreq: peakFreq, dopplerSpeed: dopplerSpeed, soundSpeed: soundSpeed, levelSlope: levelSlope,
    solar: solar, sunElevation: sunElevation, stickElevation: stickElevation, latitudeFromNoon: latitudeFromNoon,
    eratosthenes: eratosthenes, noonFit: noonFit, longitudeFromNoon: longitudeFromNoon
  };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  global.LBCore = API;
})(typeof window !== "undefined" ? window : globalThis);
