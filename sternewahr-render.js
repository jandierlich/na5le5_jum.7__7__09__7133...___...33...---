/*
 * SterneWahr – Himmelsdarstellung (Canvas 2D)
 * Stereografische Projektion, Himmelshintergrund pro Pixel (Dämmerung, Horizont, Milchstraße),
 * Sterne, Sternbilder, Planeten, Sonne (mit Korona), Mond (Phase, Finsternis).
 */
(function (root, factory) { root.Render = factory(root.Astro, root.Stars); })(typeof self !== 'undefined' ? self : this, function (A, ST) {
  'use strict';
  const D2R = Math.PI / 180, R2D = 180 / Math.PI, TAU = Math.PI * 2;
  const clamp = (x, a, b) => x < a ? a : (x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const FONT = '-apple-system, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif';

  /* ------------------------------------------------ Farben und Kennlinien */
  const KF = [ // Sonnenhöhe, Zenit, Horizont, Glutfarbe, Glutstärke
    [-18, [4, 5, 22], [9, 10, 38], [0, 0, 0], 0],
    [-12, [10, 14, 48], [38, 36, 96], [90, 60, 130], 0.25],
    [-6, [24, 32, 84], [120, 86, 140], [255, 140, 110], 0.55],
    [-1, [44, 78, 150], [230, 150, 120], [255, 170, 100], 0.9],
    [3, [60, 110, 190], [190, 190, 225], [255, 190, 120], 0.6],
    [10, [66, 124, 206], [165, 198, 235], [255, 220, 160], 0.35],
    [30, [62, 120, 206], [150, 190, 236], [255, 235, 190], 0.2]
  ];
  function skyColors(a) {
    a = clamp(a, -18, 30);
    let i = 0; while (i < KF.length - 2 && a > KF[i + 1][0]) i++;
    const k0 = KF[i], k1 = KF[i + 1];
    const t = smooth(0, 1, (a - k0[0]) / (k1[0] - k0[0]));
    const mix = (x, y) => [lerp(x[0], y[0], t), lerp(x[1], y[1], t), lerp(x[2], y[2], t)];
    return { zen: mix(k0[1], k1[1]), hor: mix(k0[2], k1[2]), glow: mix(k0[3], k1[3]), gs: lerp(k0[4], k1[4], t) };
  }
  // Grenzhelligkeit für Sterne je nach Sonnenhöhe (Dämmerung)
  const LIMKF = [[-18, 6.6], [-15, 5.6], [-12, 4.4], [-9, 3.0], [-6, 1.6], [-3, 0.2], [0, -1.2], [6, -3.2], [90, -4.2]];
  function limitingMag(sunAlt) {
    if (sunAlt <= LIMKF[0][0]) return LIMKF[0][1];
    for (let i = 0; i < LIMKF.length - 1; i++) if (sunAlt <= LIMKF[i + 1][0]) { const t = (sunAlt - LIMKF[i][0]) / (LIMKF[i + 1][0] - LIMKF[i][0]); return lerp(LIMKF[i][1], LIMKF[i + 1][1], t); }
    return LIMKF[LIMKF.length - 1][1];
  }
  function bvToRgb(bv) {
    bv = clamp(bv, -0.4, 2.0);
    const T = 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62)), t = T / 100;
    let r, g, b;
    if (t <= 66) { r = 255; g = 99.4708025861 * Math.log(t) - 161.1195681661; b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307; }
    else { r = 329.698727446 * Math.pow(t - 60, -0.1332047592); g = 288.1221695283 * Math.pow(t - 60, -0.0755148492); b = 255; }
    const m = 0.38; // zu Weiß hin abschwächen
    return [clamp(r, 0, 255) * (1 - m) + 255 * m, clamp(g, 0, 255) * (1 - m) + 255 * m, clamp(b, 0, 255) * (1 - m) + 255 * m].map(Math.round);
  }

  /* ----------------------------------------------------------- Milchstraße */
  let MW = null;
  const MW_W = 720, MW_H = 360;
  function hash2(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function vnoise(x, y, wrapX) { // periodisch in x (wrapX Zellen)
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
    const X0 = ((xi % wrapX) + wrapX) % wrapX, X1 = (X0 + 1) % wrapX;
    const a = hash2(X0, yi), b = hash2(X1, yi), c = hash2(X0, yi + 1), d = hash2(X1, yi + 1);
    return lerp(lerp(a, b, sx), lerp(c, d, sx), sy);
  }
  function buildMW() {
    MW = new Float32Array(MW_W * MW_H);
    const wrap = d => { d = ((d + 180) % 360 + 360) % 360 - 180; return d; };
    for (let j = 0; j < MW_H; j++) {
      const b = -90 + (j + 0.5) * 180 / MW_H;
      for (let i = 0; i < MW_W; i++) {
        const l = (i + 0.5) * 360 / MW_W, dl = wrap(l);
        const bulge = Math.exp(-dl * dl / (2 * 32 * 32));
        const along = 0.30 + 0.70 * bulge + 0.22 * Math.exp(-Math.pow(wrap(l - 80), 2) / (2 * 14 * 14)) + 0.20 * Math.exp(-Math.pow(wrap(l - 285), 2) / (2 * 16 * 16));
        const sigma = 4.2 + 3.6 * bulge;
        const off = 0.8 * Math.sin(l * D2R * 2 + 0.6); // leichte Welle der Ebene
        let v = along * Math.exp(-Math.pow((b - off) / sigma, 2) / 2);
        v += 0.55 * bulge * Math.exp(-(b * b) / (2 * 9 * 9)) * Math.exp(-dl * dl / (2 * 14 * 14)); // Zentralbulge
        const n = 0.5 * vnoise(l / 8, b / 8, 45) + 0.3 * vnoise(l / 4, b / 4 + 9, 90) + 0.2 * vnoise(l / 2, b / 2 + 17, 180);
        v *= 0.55 + 0.9 * n;
        // Dunkelwolken: Große Spalte, Kohlensack
        const rift = Math.exp(-Math.pow(wrap(l - 5) / 38, 2)) * Math.exp(-Math.pow((b - 1.2) / 2.4, 2));
        v *= 1 - 0.75 * rift;
        const coal = Math.exp(-((wrap(l - 302) ** 2) + (b - 0) ** 2) / (2 * 3.2 * 3.2));
        v *= 1 - 0.85 * coal;
        MW[j * MW_W + i] = clamp(v, 0, 1.4);
      }
    }
  }
  function mwSample(l, b) { // l 0..360, b -90..90 (Grad), bilinear
    let x = l / 360 * MW_W - 0.5, y = (b + 90) / 180 * MW_H - 0.5;
    const xi = Math.floor(x), yi = clamp(Math.floor(y), 0, MW_H - 2), fx = x - xi, fy = clamp(y - yi, 0, 1);
    const x0 = ((xi % MW_W) + MW_W) % MW_W, x1 = (x0 + 1) % MW_W;
    const a = MW[yi * MW_W + x0], c = MW[yi * MW_W + x1], d = MW[(yi + 1) * MW_W + x0], e = MW[(yi + 1) * MW_W + x1];
    return lerp(lerp(a, c, fx), lerp(d, e, fx), fy);
  }

  /* ------------------------------------------------------------ Matrizen */
  const mul = (a, b) => { const r = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i][j] = a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j]; return r; };
  const tr = a => [[a[0][0], a[1][0], a[2][0]], [a[0][1], a[1][1], a[2][1]], [a[0][2], a[1][2], a[2][2]]];
  const mv = (m, v) => [m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2], m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2], m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]];
  function enuMatrix(lst, lat) { // Äquator (des Datums) -> Ost/Nord/Zenit
    const cl = Math.cos(lst * D2R), sl = Math.sin(lst * D2R), cp = Math.cos(lat * D2R), sp = Math.sin(lat * D2R);
    return [[-sl, cl, 0], [-sp * cl, -sp * sl, cp], [cp * cl, cp * sl, sp]];
  }
  // Galaktisches System (J2000-Äquator -> galaktisch), Zeilen = galaktische x,y,z-Achsen
  const GALM = (function () {
    const ax = Math.cos(266.40499 * D2R) * Math.cos(-28.93617 * D2R), ay = Math.sin(266.40499 * D2R) * Math.cos(-28.93617 * D2R), az = Math.sin(-28.93617 * D2R);
    const zx = Math.cos(192.85948 * D2R) * Math.cos(27.12825 * D2R), zy = Math.sin(192.85948 * D2R) * Math.cos(27.12825 * D2R), zz = Math.sin(27.12825 * D2R);
    const gx = [ax, ay, az], gz = [zx, zy, zz];
    const gy = [gz[1] * gx[2] - gz[2] * gx[1], gz[2] * gx[0] - gz[0] * gx[2], gz[0] * gx[1] - gz[1] * gx[0]];
    return [gx, gy, gz];
  })();

  /* ------------------------------------------------------------- Renderer */
  function create(canvas) {
    const ctx = canvas.getContext('2d');
    const bgCanvas = document.createElement('canvas');
    const bgCtx = bgCanvas.getContext('2d');
    let bgImg = null, bgW = 0, bgH = 0;
    const starRGB = ST.stars.map(s => bvToRgb(s.bv));
    const starPhase = ST.stars.map((s, i) => (i * 2.39996 + s.mag) % (Math.PI * 2));
    const starSpeed = ST.stars.map((s, i) => 0.7 + (i % 11) * 0.09);
    const starCol = starRGB.map(c => c.join(','));
    const nStars = ST.stars.length;
    const sVec = ST.stars.map(s => A.vec(s.ra, s.dec));
    const dVec = ST.dso.map(d => A.vec(d.ra, d.dec));
    const conCenters = ST.constellations.map(c => {
      const pts = new Set(); c.lines.forEach(l => { pts.add(l[0]); pts.add(l[1]); });
      let x = 0, y = 0, z = 0; pts.forEach(s => { const v = A.vec(s.ra, s.dec); x += v[0]; y += v[1]; z += v[2]; });
      return A.norm([x, y, z]);
    });
    const R = { W: 0, H: 0, dpr: 1, objs: [], frame: null };
    let meteors = [];
    function spawnMeteor(enu) {
      if (!enu) return;
      meteors.push({ enu: enu.slice(), t0: null, ang: Math.random() * TAU, len: 60 + Math.random() * 70, dur: 650 + Math.random() * 500 });
      if (meteors.length > 6) meteors.shift();
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const W = canvas.clientWidth, H = canvas.clientHeight;
      if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
      R.W = W; R.H = H; R.dpr = dpr;
    }

    // ---- Kamera / Projektion
    function makeCam(basis, fov, cyFrac) {
      const W = R.W, H = R.H, S = (Math.min(W, H) / 2) / (2 * Math.tan(fov * D2R / 4));
      return { r: basis.r, u: basis.u, f: basis.f, S, W, H, fov, cx: W / 2, cy: H * (cyFrac || 0.5), m: [basis.r, basis.u, basis.f] };
    }
    function toScreen(cam, e) { // e: ENU-Einheitsvektor -> {x,y,cz,rho,ok}
      const cx = e[0] * cam.r[0] + e[1] * cam.r[1] + e[2] * cam.r[2];
      const cy = e[0] * cam.u[0] + e[1] * cam.u[1] + e[2] * cam.u[2];
      const cz = e[0] * cam.f[0] + e[1] * cam.f[1] + e[2] * cam.f[2];
      if (cz < -0.985) return { x: 0, y: 0, cz, ok: false, cx, cy };
      const k = 2 / (1 + cz);
      return { x: cam.cx + cam.S * cx * k, y: cam.cy - cam.S * cy * k, cz, ok: true, cx, cy, k };
    }
    function pxPerDeg(cam, p) { const rho = 2 * Math.tan(Math.acos(clamp(p.cz, -1, 1)) / 2); return cam.S * (1 + rho * rho / 4) * D2R; }
    function fromScreen(cam, px, py) {
      const X = (px - cam.cx) / cam.S, Y = (cam.cy - py) / cam.S, rho = Math.hypot(X, Y);
      let cx = 0, cy = 0, cz = 1;
      if (rho > 1e-9) { const th = 2 * Math.atan(rho / 2), s = Math.sin(th); cx = s * X / rho; cy = s * Y / rho; cz = Math.cos(th); }
      return [cx * cam.r[0] + cy * cam.u[0] + cz * cam.f[0], cx * cam.r[1] + cy * cam.u[1] + cz * cam.f[1], cx * cam.r[2] + cy * cam.u[2] + cz * cam.f[2]];
    }
    function applyRefraction(e) { // ENU-Vektor -> scheinbare Position
      const alt = Math.asin(clamp(e[2], -1, 1)) * R2D;
      if (alt < -1.9 || alt > 45) return e;
      const dr = A.refraction(alt) * D2R, h = Math.hypot(e[0], e[1]);
      if (h < 1e-9) return e;
      const na = alt * D2R + dr, ch = Math.cos(na) / h;
      return [e[0] * ch, e[1] * ch, Math.sin(na)];
    }

    /* ------------------------------------------------------------ Zeichnen */
    // p: { sky, cam(basis), fov, layers, red, ar, pollution, selected, target, sunPath, nowMs }
    function limitingMagFor(sky, pollution, allStars) {
      const sunAlt = sky.sun.trueAlt;
      const eclipse = solarEclipse(sky);
      const ec = eclipse.total ? 1 : smooth(0.55, 1, eclipse.obsc) * 0.85;
      const sunAltEff = sunAlt > -18 ? sunAlt - 16 * ec * smooth(-12, 2, sunAlt) : sunAlt;
      let maglim = limitingMag(sunAltEff);
      if (sunAltEff < -6) maglim -= [0, 1.4, 2.6][pollution || 0];
      if (sky.moon.trueAlt > 0) maglim -= 1.6 * sky.moon.illum * smooth(-6, 6, sky.moon.trueAlt);
      if (allStars) maglim = 7;
      return maglim;
    }
    function draw(p) {
      resize();
      const W = R.W, H = R.H, dpr = R.dpr, sky = p.sky, L = p.layers;
      R.inTop = (p.insets && p.insets.top) || 100; R.inBottom = (p.insets && p.insets.bottom) || 140;
      const cam = makeCam(p.basis, p.fov, p.cyFrac);
      const jd = sky.jd;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      /* --- Lichtverhältnisse --- */
      const sunAlt = sky.sun.trueAlt;
      const eclipse = solarEclipse(sky);
      const ec = eclipse.total ? 1 : smooth(0.55, 1, eclipse.obsc) * 0.85; // Verdunkelung durch Finsternis
      const sunAltEff = sunAlt > -18 ? sunAlt - 16 * ec * smooth(-12, 2, sunAlt) : sunAlt;
      const moonUp = sky.moon.trueAlt > 0;
      let maglim = limitingMag(sunAltEff);
      if (sunAltEff < -6) maglim -= [0, 1.4, 2.6][p.pollution || 0];
      if (moonUp) maglim -= 1.6 * sky.moon.illum * smooth(-6, 6, sky.moon.trueAlt);
      if (L.allStars) maglim = 7;
      const dark = smooth(-4, -14, sunAltEff); // 0 Tag … 1 Nacht

      /* --- Hintergrund (pro Pixel, niedrig aufgelöst) --- */
      if (!p.ar) { drawBackground(cam, sky, sunAltEff, dark, p, eclipse); drawLandscape(cam, p, sunAltEff, dark); }

      /* --- Gitter und Linien --- */
      R.objs = [];
      const labels = [];
      const drawLabel = (txt, x, y, o) => placeLabel(labels, txt, x, y, o || {}, p, dark);
      const enu = Astro_eqToCam(p, sky);
      if (L.altazGrid) drawAltAzGrid(cam, p, dark);
      if (L.eqGrid) drawEqGrid(cam, enu, p, dark);
      if (L.ecliptic) drawEcliptic(cam, enu, p, dark);
      if (L.sunPath && p.sunPath) drawSunPath(cam, p);

      /* --- Sterne projizieren --- */
      const sp = new Array(nStars);
      for (let i = 0; i < nStars; i++) {
        const s = ST.stars[i];
        if (s.mag > maglim) { sp[i] = null; continue; }
        let e = mv(enu.M, sVec[i]);
        e = applyRefraction(e);
        const q = toScreen(cam, e);
        sp[i] = q.ok && q.x > -60 && q.x < W + 60 && q.y > -60 && q.y < H + 60 ? { x: q.x, y: q.y, e, alt: e[2] } : null;
      }
      const showSky = dark > 0.02 || L.allStars || sunAltEff < 0;

      // Sternbildlinien
      if (L.constellations && (dark > 0.05 || L.allStars)) {
        ctx.lineWidth = 1.3;
        ctx.strokeStyle = p.red ? 'rgba(255,110,90,0.55)' : 'rgba(190,175,255,0.58)';
        ctx.beginPath();
        for (const c of ST.constellations) {
          for (const l of c.lines) {
            const ia = starIndex(l[0]), ib = starIndex(l[1]);
            const a = sp[ia], b = sp[ib];
            if (!a || !b) continue;
            if (a.alt < -0.02 || b.alt < -0.02) continue;
            // Linie an den Sternrand verkürzen
            const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, g = Math.min(5 + (3 - Math.min(l[0].mag, 3)) * 0.8, d / 3);
            ctx.moveTo(a.x + dx / d * g, a.y + dy / d * g); ctx.lineTo(b.x - dx / d * g, b.y - dy / d * g);
          }
        }
        ctx.globalAlpha = clamp(dark * 1.6 + (L.allStars ? 0.75 : 0), 0, 1);
        ctx.stroke(); ctx.globalAlpha = 1;
      }

      // Tief-Himmel-Objekte
      if (L.dso && (maglim > 2.4 || L.allStars)) {
        for (let i = 0; i < ST.dso.length; i++) {
          const d = ST.dso[i];
          let e = mv(enu.M, dVec[i]); e = applyRefraction(e);
          if (e[2] < -0.02) continue;
          const q = toScreen(cam, e); if (!q.ok || q.x < -80 || q.x > W + 80 || q.y < -80 || q.y > H + 80) continue;
          const ppd = pxPerDeg(cam, q), rad = Math.max(4.5, d.size / 60 * ppd / 2);
          const a = clamp(0.25 + (maglim - d.mag) * 0.12, 0.15, 0.85) * Math.max(dark, L.allStars ? 0.8 : 0);
          if (a <= 0.02) continue;
          const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, rad * 1.6);
          const col = d.type === 'neb' ? (p.red ? '255,120,100' : '190,150,255') : (p.red ? '255,150,120' : '200,205,255');
          g.addColorStop(0, `rgba(${col},${a * 0.9})`); g.addColorStop(0.5, `rgba(${col},${a * 0.35})`); g.addColorStop(1, `rgba(${col},0)`);
          ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(q.x, q.y, rad * 1.6, rad * (d.type === 'gal' ? 0.8 : 1.6), d.type === 'gal' ? -0.6 : 0, 0, TAU); ctx.fill();
          R.objs.push({ kind: 'dso', ref: i, x: q.x, y: q.y, hit: Math.max(16, rad), pri: 5 + d.mag });
          if (a > 0.3 && (p.fov < 70 || d.mag < 2)) drawLabel(shortName(d.name), q.x, q.y + rad * 1.2 + 8, { color: 'dso', pri: 3 });
        }
      }

      // Sterne
      const zoomK = Math.pow(clamp(90 / p.fov, 0.5, 4), 0.22);
      if (showSky) {
        for (let i = 0; i < nStars; i++) {
          const q = sp[i]; if (!q) continue;
          const s = ST.stars[i];
          if (q.alt < -0.02 && !p.ar) continue;
          const vis = clamp(0.35 + (maglim - s.mag) * 0.32, 0, 1);
          if (vis <= 0.02) continue;
          // Extinktion am Horizont
          const ext = smooth(-0.5, 6, q.alt * R2D) * 0.55 + 0.45;
          let rad = clamp((0.75 + (4.6 - s.mag) * 0.55) * zoomK, 0.7, 6.2);
          const col = p.red ? '255,120,100' : starCol[i];
          // Funkeln: nahe am Horizont stärker (Luftunruhe), stärker bei helleren Sternen sichtbar
          const twAmp = (0.05 + 0.4 * clamp(1 - q.alt * R2D / 22, 0, 1)) * clamp(1 - (s.mag - 2) * 0.12, 0.3, 1);
          const tw = 1 + twAmp * Math.sin((p.nowMs || 0) / 1000 * starSpeed[i] + starPhase[i]);
          const a = vis * ext * clamp(tw, 0.55, 1.35);
          if (s.mag < 1.2) rad *= clamp(1 + (tw - 1) * 0.35, 0.85, 1.15);
          if (s.mag < 2.2) {
            const gr = rad * (3.2 + (2.2 - s.mag) * 0.8);
            const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, gr);
            g.addColorStop(0, `rgba(${col},${0.55 * a})`); g.addColorStop(1, `rgba(${col},0)`);
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y, gr, 0, TAU); ctx.fill();
          }
          ctx.fillStyle = `rgba(${col},${Math.min(1, a + 0.1)})`;
          ctx.beginPath(); ctx.arc(q.x, q.y, rad, 0, TAU); ctx.fill();
          if (s.mag <= 4.3 || L.allStars) R.objs.push({ kind: 'star', ref: i, x: q.x, y: q.y, hit: Math.max(14, rad + 8), pri: 10 + s.mag });
          if (L.starNames && ST.labelled.has(s.name) && (dark > 0.2 || L.allStars) && a > 0.3) drawLabel(s.name, q.x + rad + 5, q.y - rad - 2, { color: 'star', pri: 4 + s.mag * 0.3, left: true });
        }
      }

      // Sternbildnamen
      if (L.conNames && (dark > 0.15 || L.allStars)) {
        for (let i = 0; i < ST.constellations.length; i++) {
          let e = mv(enu.M, conCenters[i]);
          if (e[2] < 0.02) continue;
          const q = toScreen(cam, e); if (!q.ok || q.x < 20 || q.x > W - 20 || q.y < R.inTop + 10 || q.y > H - R.inBottom - 10) continue;
          drawLabel(ST.constellations[i].de.toUpperCase(), q.x, q.y, { color: 'con', pri: 1, spaced: true });
        }
      }

      /* --- Planeten --- */
      const PL = { mercury: 'Merkur', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptun' };
      const PCOL = { mercury: '210,200,190', venus: '255,246,225', mars: '255,150,110', jupiter: '255,240,205', saturn: '255,224,160', uranus: '170,235,240', neptune: '150,180,255' };
      sky.planets.forEach((pl, idx) => {
        if (pl.alt < -0.5 && !p.ar) return;
        const lim = maglim + 0.6;
        if (pl.mag > lim && !(L.allStars)) return;
        const q = toScreen(cam, pl.enu); if (!q.ok || q.x < -50 || q.x > W + 50 || q.y < -50 || q.y > H + 50) return;
        const vis = clamp(0.5 + (lim - pl.mag) * 0.3, 0.4, 1);
        const rad = clamp((1.7 + (2 - pl.mag) * 0.5) * zoomK, 1.6, 6.5);
        const col = p.red ? '255,130,110' : PCOL[pl.name];
        const gr = rad * 4.2;
        const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, gr);
        g.addColorStop(0, `rgba(${col},${0.6 * vis})`); g.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y, gr, 0, TAU); ctx.fill();
        ctx.fillStyle = `rgba(${col},${vis})`; ctx.beginPath(); ctx.arc(q.x, q.y, rad, 0, TAU); ctx.fill();
        if (pl.name === 'saturn') { ctx.strokeStyle = `rgba(${col},${0.8 * vis})`; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.ellipse(q.x, q.y, rad * 2.3, rad * (0.35 + 0.65 * Math.abs(Math.sin(pl.ringB * D2R))), -0.35, 0, TAU); ctx.stroke(); }
        R.objs.push({ kind: 'planet', ref: idx, x: q.x, y: q.y, hit: Math.max(20, rad + 10), pri: pl.mag });
        drawLabel(PL[pl.name], q.x + rad + 6, q.y - rad - 2, { color: 'planet', pri: 0, left: true });
      });

      /* --- Sonne und Mond --- */
      drawSunMoon(cam, sky, p, eclipse, dark, drawLabel);

      /* --- Horizont: Himmelsrichtungen --- */
      drawCompass(cam, p, dark, sunAltEff);

      /* --- Auswahl / Zielpfeil --- */
      if (p.selected) drawSelection(cam, p);
      if (p.target) drawArrow(cam, p);
      if (meteors.length) drawMeteors(cam, p);

      R.frame = { cam, maglim, dark, eclipse, sunAltEff };
      return R.frame;
    }

    /* ------------ Hilfsfunktionen zum Zeichnen ------------ */
    const starIdx = new Map(ST.stars.map((s, i) => [s, i]));
    const starIndex = s => starIdx.get(s);
    function shortName(n) { return n.replace(/\s*\(.*\)/, m => m); }

    function Astro_eqToCam(p, sky) {
      const T = sky.T;
      const P = A.precessionMatrix(T);
      const E = enuMatrix(sky.lst, sky.lat);
      return { M: mul(E, P), P, E };
    }

    function solarEclipse(sky) {
      const sun = sky.sun, moon = sky.moon;
      const sep = A.angSep(A.vec(sun.ra, sun.dec), A.vec(moon.ra, moon.dec));
      const rs = sun.radius, rm = moon.radius;
      let obsc = 0, total = false;
      if (sep < rs + rm && sky.sun.trueAlt > -1) {
        if (sep <= Math.abs(rm - rs)) { obsc = rm >= rs ? 1 : (rm * rm) / (rs * rs); total = rm >= rs; }
        else {
          const d = sep, r1 = rs, r2 = rm;
          const a1 = Math.acos(clamp((d * d + r1 * r1 - r2 * r2) / (2 * d * r1), -1, 1)), a2 = Math.acos(clamp((d * d + r2 * r2 - r1 * r1) / (2 * d * r2), -1, 1));
          const area = r1 * r1 * (a1 - Math.sin(2 * a1) / 2) + r2 * r2 * (a2 - Math.sin(2 * a2) / 2);
          obsc = clamp(area / (Math.PI * r1 * r1), 0, 1);
        }
      }
      return { sep, obsc, total: total && obsc >= 0.9999, annular: sep <= Math.abs(rm - rs) && rm < rs };
    }
    function lunarEclipse(sky) {
      const sun = sky.sun, moon = sky.moon;
      const anti = A.vec((sun.ra + 180) % 360, -sun.dec);
      const d = A.angSep(A.vec(moon.gra, moon.gdec), anti);
      const pis = 0.002443 / sun.dist, ss = sun.radius;
      const Ru = 1.02 * (moon.parallax + pis - ss), Rp = 1.02 * (moon.parallax + pis + ss), rm = moon.radius;
      return { d, Ru, Rp, rm, umbral: (Ru + rm - d) / (2 * rm), penumbral: (Rp + rm - d) / (2 * rm), anti };
    }

    function drawBackground(cam, sky, sunAltEff, dark, p, eclipse) {
      if (!MW) buildMW();
      const scale = 4, w = Math.max(8, Math.ceil(R.W / scale)), h = Math.max(8, Math.ceil(R.H / scale));
      if (w !== bgW || h !== bgH) { bgCanvas.width = w; bgCanvas.height = h; bgW = w; bgH = h; bgImg = bgCtx.createImageData(w, h); }
      const data = bgImg.data;
      const col = skyColors(sunAltEff);
      const zen = col.zen, hor = col.hor, gl = col.glow, gs = col.gs;
      const sunE = sky.sun.enu, moonE = sky.moon.enu;
      const sunHor = Math.hypot(sunE[0], sunE[1]) || 1;
      const sunUp = sky.sun.trueAlt > -20;
      const dayK = smooth(-6, 6, sunAltEff);
      const mwOn = p.layers.milkyway && dark > 0.01;
      const mwK = dark * [1, 0.42, 0][p.pollution || 0] * (1 - 0.6 * sky.moon.illum * (sky.moon.trueAlt > 0 ? smooth(0, 15, sky.moon.trueAlt) : 0));
      const glowK = [0.05, 0.16, 0.32][p.pollution || 0] * dark;
      const moonGlow = 0.20 * sky.moon.illum * dark * (sky.moon.trueAlt > -5 ? 1 : 0);
      // Matrix Kamera -> galaktisch: gal = GALM * P^T * E^T * (cx*r + cy*u + cz*f)
      const enu = Astro_eqToCam(p, sky);
      const back = mul(GALM, tr(enu.M)); // ENU -> galaktisch (J2000-Äquator = ENU^T, dann galaktisch)
      const red = p.red;
      const S = cam.S, W2 = cam.cx, H2 = cam.cy;
      const r = cam.r, u = cam.u, f = cam.f;
      const ecl = eclipse.obsc;
      for (let j = 0; j < h; j++) {
        const py = (j + 0.5) * scale;
        const Y = (H2 - py) / S;
        for (let i = 0; i < w; i++) {
          const px = (i + 0.5) * scale;
          const X = (px - W2) / S, rho = Math.hypot(X, Y);
          let cx = 0, cy = 0, cz = 1;
          if (rho > 1e-9) { const th = 2 * Math.atan(rho / 2), s = Math.sin(th); cx = s * X / rho; cy = s * Y / rho; cz = Math.cos(th); }
          const ex = cx * r[0] + cy * u[0] + cz * f[0], ey = cx * r[1] + cy * u[1] + cz * f[1], ez = cx * r[2] + cy * u[2] + cz * f[2];
          const alt = Math.asin(clamp(ez, -1, 1)) * R2D;
          let cr, cg, cb;
          if (alt >= -0.9) {
            const w0 = 1 - Math.exp(-Math.max(alt, 0) / 22);
            cr = hor[0] + (zen[0] - hor[0]) * w0; cg = hor[1] + (zen[1] - hor[1]) * w0; cb = hor[2] + (zen[2] - hor[2]) * w0;
            if (sunUp) {
              const sd = ex * sunE[0] + ey * sunE[1] + ez * sunE[2];
              const hd = clamp((ex * sunE[0] + ey * sunE[1]) / (Math.hypot(ex, ey) * sunHor + 1e-9), -1, 1);
              const azf = Math.exp(-(1 - hd) / 0.42);
              const hg = gs * Math.exp(-Math.max(alt, 0) / (7 + 9 * dayK)) * (0.32 + 0.68 * azf);
              cr += gl[0] * hg * 0.85; cg += gl[1] * hg * 0.85; cb += gl[2] * hg * 0.85;
              const halo = Math.exp(-(1 - sd) / 0.05) * (0.25 + 0.5 * dayK) * (1 - ecl * 0.95);
              cr += 255 * halo * 0.6; cg += 236 * halo * 0.6; cb += 200 * halo * 0.5;
              if (ecl > 0.3) { const rim = Math.exp(-Math.max(alt, 0) / 9) * ecl * 0.55; cr += 235 * rim * 0.5; cg += 120 * rim * 0.5; cb += 90 * rim * 0.5; } // 360°-Dämmerung
            }
            if (moonGlow > 0.005) {
              const md = ex * moonE[0] + ey * moonE[1] + ez * moonE[2];
              const mg = Math.exp(-(1 - md) / 0.018) * moonGlow;
              cr += 190 * mg; cg += 200 * mg; cb += 255 * mg;
            }
            if (mwOn && alt > -0.5) {
              const gx = back[0][0] * ex + back[0][1] * ey + back[0][2] * ez, gy = back[1][0] * ex + back[1][1] * ey + back[1][2] * ez, gz = back[2][0] * ex + back[2][1] * ey + back[2][2] * ez;
              let l = Math.atan2(gy, gx) * R2D; if (l < 0) l += 360;
              const b = Math.asin(clamp(gz, -1, 1)) * R2D;
              const v = mwSample(l, b) * mwK * (0.25 + 0.75 * smooth(0, 14, alt));
              if (v > 0.003) {
                const warm = smooth(-40, 25, -Math.abs(l > 180 ? l - 360 : l)) ; // wärmer Richtung Zentrum
                cr += (120 + 90 * warm) * v * 0.6; cg += (118 + 55 * warm) * v * 0.6; cb += (170 + 10 * warm) * v * 0.6;
              }
            }
            if (glowK > 0 && alt > -1) { const gh = glowK * Math.exp(-Math.max(alt, 0) / 5.5); cr += 150 * gh; cg += 96 * gh; cb += 130 * gh; }
            if (alt < 0.9) { // weicher Horizontübergang zum Boden
              const hz = smooth(-0.9, 0.9, alt);
              const gc = groundColor(ex, ey, ez, alt, hor, dark, red);
              cr = gc[0] + (cr - gc[0]) * hz; cg = gc[1] + (cg - gc[1]) * hz; cb = gc[2] + (cb - gc[2]) * hz;
            }
          } else {
            const gc = groundColor(ex, ey, ez, alt, hor, dark, red);
            cr = gc[0]; cg = gc[1]; cb = gc[2];
          }
          if (red) { const lum = 0.3 * cr + 0.59 * cg + 0.11 * cb; cr = lum * 1.0; cg = lum * 0.1; cb = lum * 0.06; }
          const o = (j * w + i) * 4;
          data[o] = cr > 255 ? 255 : cr; data[o + 1] = cg > 255 ? 255 : cg; data[o + 2] = cb > 255 ? 255 : cb; data[o + 3] = 255;
        }
      }
      bgCtx.putImageData(bgImg, 0, 0);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bgCanvas, 0, 0, R.W, R.H);
    }
    // Erdboden: Wiesen/Felder mit perspektivischer Struktur, zum Horizont hin im Dunst
    const GND_DAY = [58, 76, 42], GND_DAY_FAR = [92, 104, 74], GND_NIGHT = [13, 14, 26], GND_NIGHT_FAR = [24, 23, 46];
    function groundColor(ex, ey, ez, alt, hor, dark, red) {
      const a = Math.max(-alt, 0);
      const far = Math.exp(-a / 9);
      const near = [lerp(GND_DAY[0], GND_NIGHT[0], dark), lerp(GND_DAY[1], GND_NIGHT[1], dark), lerp(GND_DAY[2], GND_NIGHT[2], dark)];
      const farC = [lerp(GND_DAY_FAR[0], GND_NIGHT_FAR[0], dark), lerp(GND_DAY_FAR[1], GND_NIGHT_FAR[1], dark), lerp(GND_DAY_FAR[2], GND_NIGHT_FAR[2], dark)];
      let r = lerp(near[0], farC[0], far), g = lerp(near[1], farC[1], far), b = lerp(near[2], farC[2], far);
      // Perspektivische Feld-/Wiesenstruktur (nur bei steilerem Blick, sonst flimmert es)
      const tex = smooth(1.5, 10, a);
      if (tex > 0 && ez < -0.01) {
        const gx = ex / -ez, gy = ey / -ez;
        const n1 = vnoise(gx * 0.9 + 400, gy * 0.9 + 400, 100000), n2 = vnoise(gx * 3.1 + 900, gy * 3.1 + 900, 100000);
        const v = ((n1 - 0.5) * 0.30 + (n2 - 0.5) * 0.14) * tex;
        const warm = smooth(0.58, 0.72, n1) * tex * (1 - dark); // einzelne Feld-/Ackerflächen
        r *= 1 + v + 0.22 * warm; g *= 1 + v + 0.08 * warm; b *= 1 + v - 0.10 * warm;
      }
      // Vordergrund dunkler, Horizont im Dunst
      const fg = 1 - 0.35 * smooth(20, 80, a);
      r *= fg; g *= fg; b *= fg;
      const haze = Math.exp(-a / 2.2) * lerp(0.62, 0.38, dark);
      return [lerp(r, hor[0], haze), lerp(g, hor[1], haze), lerp(b, hor[2], haze)];
    }

    /* --- Landschaftssilhouette am Horizont: ferne Hügel und Baumreihe --- */
    function hash1(i) { return hash2(i, 7919); }
    function farProfile(az) { // Grad über dem Horizont
      const f = 0.55 * vnoise(az / 15, 3.1, 24) + 0.30 * vnoise(az / 6, 7.7, 60) + 0.15 * vnoise(az / 2.5, 11.3, 144);
      return Math.max(0, f - 0.28) * 3.4;
    }
    const TREE_W = 0.32, TREE_N = Math.round(360 / TREE_W);
    function nearProfile(az) {
      const roll = Math.max(0, 0.45 * vnoise(az / 10, 5.5, 36) - 0.08);
      const forest = smooth(0.40, 0.62, vnoise(az / 12, 21.7, 30));
      const t = az / TREE_W, ti = ((Math.floor(t) % TREE_N) + TREE_N) % TREE_N, ft = t - Math.floor(t);
      const hsh = hash1(ti), x = 2 * ft - 1;
      const conifer = hash1(ti + 5000) < 0.45;
      const shape = conifer ? Math.max(0, 1 - Math.abs(x) * 1.15) : Math.sqrt(Math.max(0, 1 - x * x));
      const single = forest < 0.15 && hsh > 0.94 ? 1 : 0; // vereinzelte Bäume im offenen Land
      const m = Math.max(forest, single);
      const tree = m * ((0.55 + 0.55 * hsh) * (conifer ? 1.25 : 0.85) * shape + 0.45 * forest);
      return roll + tree;
    }
    function drawLandscape(cam, p, sunAltEff, dark) {
      const hor = skyColors(sunAltEff).hor;
      const hmul = clamp(0.55 + cam.fov / 110, 0.7, 1.7);
      const ppd = cam.S * D2R * 2;
      const step = clamp(0.8 / ppd, 0.03, 0.6);
      const W = R.W, H = R.H, M = 80;
      const toRGB = c => { let [r, g, b] = c; if (p.red) { const l = 0.3 * r + 0.59 * g + 0.11 * b; r = l; g = l * 0.1; b = l * 0.06; } return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`; };
      const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
      const hillBase = mix([66, 86, 80], [18, 16, 38], dark);
      const treeBase = mix([30, 44, 30], [8, 9, 19], dark);
      const layers = [
        { prof: farProfile, col: mix(hor, hillBase, 0.5), base: -0.12 },
        { prof: nearProfile, col: mix(hor, treeBase, lerp(0.82, 0.9, dark)), base: -0.12 }
      ];
      // Sichtbare Azimutbereiche grob bestimmen
      const vis = [];
      for (let az = 0; az < 360; az += 2) { const q = toScreen(cam, A.altAzToEnu(1, az)); vis.push(q.ok && q.x > -W && q.x < 2 * W && q.y > -H && q.y < 2 * H); }
      if (!vis.some(Boolean)) return;
      for (const L of layers) {
        ctx.fillStyle = toRGB(L.col);
        ctx.beginPath();
        let seg = null;
        const flush = () => {
          if (seg && seg.top.length > 1) {
            ctx.moveTo(seg.top[0][0], seg.top[0][1]);
            for (let i = 1; i < seg.top.length; i++) ctx.lineTo(seg.top[i][0], seg.top[i][1]);
            for (let i = seg.bot.length - 1; i >= 0; i--) ctx.lineTo(seg.bot[i][0], seg.bot[i][1]);
            ctx.closePath();
          }
          seg = null;
        };
        const n = Math.ceil(360 / step);
        for (let i = 0; i <= n; i++) {
          const az = i * step;
          const vi = Math.floor((az % 360) / 2);
          if (!vis[vi] && !vis[(vi + 1) % 180] && !vis[(vi + 179) % 180]) { flush(); continue; }
          const h = L.prof(az % 360) * hmul;
          const qt = toScreen(cam, A.altAzToEnu(h, az)), qb = toScreen(cam, A.altAzToEnu(L.base, az));
          if (!qt.ok || !qb.ok || Math.abs(qt.x) > 1e5 || Math.abs(qb.y) > 1e5) { flush(); continue; }
          const off = (qt.x < -M && qb.x < -M) || (qt.x > W + M && qb.x > W + M) || (qt.y > H + M && qb.y > H + M) || (qt.y < -M && qb.y < -M);
          if (off) { if (seg) { seg.top.push([qt.x, qt.y]); seg.bot.push([qb.x, qb.y]); } flush(); continue; }
          if (!seg) seg = { top: [], bot: [] };
          seg.top.push([qt.x, qt.y]); seg.bot.push([qb.x, qb.y]);
        }
        flush();
        ctx.fill();
      }
    }

    function placeLabel(list, txt, x, y, o, p, dark) {
      ctx.font = (o.color === 'con' ? '600 10.5px ' : (o.color === 'planet' ? '700 12.5px ' : '500 11.5px ')) + FONT;
      let w = ctx.measureText(txt).width + (o.spaced ? txt.length * 1.2 : 0);
      const h = 13;
      let lx = o.left ? x : x - w / 2, ly = y;
      const rect = { x: lx - 2, y: ly - h, w: w + 4, h: h + 3 };
      if (rect.x < 4 || rect.x + rect.w > R.W - 4 || rect.y < R.inTop || rect.y + rect.h > R.H - R.inBottom) return false;
      for (const b of list) if (rect.x < b.x + b.w && rect.x + rect.w > b.x && rect.y < b.y + b.h && rect.y + rect.h > b.y) return false;
      list.push(rect);
      const day = dark < 0.4;
      const colors = { star: p.red ? '255,150,130' : '235,232,255', planet: p.red ? '255,150,130' : '255,236,190', con: p.red ? '255,110,90' : '178,160,255', dso: p.red ? '255,130,110' : '205,190,255', sun: '255,240,200', moon: '235,238,255' };
      const c = colors[o.color] || '235,232,255';
      ctx.textBaseline = 'alphabetic';
      if (o.spaced) {
        ctx.fillStyle = `rgba(${c},${day ? 0.75 : 0.62})`;
        let cx = lx; for (const ch of txt) { ctx.fillText(ch, cx, ly); cx += ctx.measureText(ch).width + 1.2; }
      } else {
        ctx.lineWidth = 3; ctx.strokeStyle = day ? 'rgba(10,8,40,0.55)' : 'rgba(5,4,20,0.5)'; ctx.lineJoin = 'round'; ctx.strokeText(txt, lx, ly);
        ctx.fillStyle = `rgba(${c},0.95)`; ctx.fillText(txt, lx, ly);
      }
      return true;
    }

    function polyline(cam, pts, style, width, dash) {
      ctx.strokeStyle = style; ctx.lineWidth = width || 1; ctx.setLineDash(dash || []);
      ctx.beginPath(); let pen = false, px = 0, py = 0;
      for (const e of pts) {
        if (!e) { pen = false; continue; }
        const q = toScreen(cam, e);
        if (!q.ok || Math.abs(q.x) > 3e3 || Math.abs(q.y) > 3e3) { pen = false; continue; }
        if (pen && Math.hypot(q.x - px, q.y - py) < 900) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y);
        pen = true; px = q.x; py = q.y;
      }
      ctx.stroke(); ctx.setLineDash([]);
    }
    function drawAltAzGrid(cam, p, dark) {
      const st = p.red ? 'rgba(255,90,70,0.22)' : 'rgba(150,170,255,0.20)';
      for (const alt of [15, 30, 45, 60, 75]) { const pts = []; for (let az = 0; az <= 360; az += 4) pts.push(A.altAzToEnu(alt, az)); polyline(cam, pts, st, 1); }
      for (let az = 0; az < 360; az += 30) { const pts = []; for (let alt = 0; alt <= 90; alt += 5) pts.push(A.altAzToEnu(alt, az)); polyline(cam, pts, st, 1); }
    }
    function drawEqGrid(cam, enu, p, dark) {
      const st = p.red ? 'rgba(255,120,90,0.18)' : 'rgba(255,190,140,0.16)';
      for (let dec = -60; dec <= 60; dec += 30) { const pts = []; for (let ra = 0; ra <= 360; ra += 5) pts.push(mv(enu.M, A.vec(ra, dec))); polyline(cam, pts, st, 1); }
      for (let ra = 0; ra < 360; ra += 30) { const pts = []; for (let dec = -85; dec <= 85; dec += 5) pts.push(mv(enu.M, A.vec(ra, dec))); polyline(cam, pts, st, 1); }
    }
    function drawEcliptic(cam, enu, p) {
      const eps = 23.43928, pts = [];
      for (let l = 0; l <= 360; l += 3) { const x = Math.cos(l * D2R), y = Math.sin(l * D2R) * Math.cos(eps * D2R), z = Math.sin(l * D2R) * Math.sin(eps * D2R); pts.push(mv(enu.M, [x, y, z])); }
      polyline(cam, pts, p.red ? 'rgba(255,140,100,0.5)' : 'rgba(255,214,140,0.42)', 1.2, [6, 5]);
    }
    function drawSunPath(cam, p) {
      const pts = p.sunPath.pts;
      polyline(cam, pts.map(q => q.e), p.red ? 'rgba(255,150,110,0.6)' : 'rgba(255,214,140,0.55)', 1.4, [2, 5]);
      ctx.font = '500 10.5px ' + FONT; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      for (const q of p.sunPath.hours) {
        const s = toScreen(cam, q.e); if (!s.ok || s.x < 10 || s.x > R.W - 10 || s.y < R.inTop - 40 || s.y > R.H - R.inBottom + 20) continue;
        ctx.fillStyle = p.red ? 'rgba(255,150,110,0.9)' : 'rgba(255,214,140,0.9)'; ctx.beginPath(); ctx.arc(s.x, s.y, 2.2, 0, TAU); ctx.fill();
        ctx.fillStyle = p.red ? 'rgba(255,180,150,0.9)' : 'rgba(255,230,180,0.85)'; ctx.fillText(q.label, s.x, s.y - 9);
      }
      ctx.textAlign = 'left';
    }
    function drawCompass(cam, p, dark, sunAltEff) {
      const names = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
      ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      for (let i = 0; i < 8; i++) {
        const az = i * 45, q = toScreen(cam, A.altAzToEnu(1.6, az));
        if (!q.ok || q.x < 14 || q.x > R.W - 14 || q.y < R.inTop - 40 || q.y > R.H - R.inBottom + 20) continue;
        const main = i % 2 === 0;
        ctx.font = (main ? '700 13px ' : '600 10.5px ') + FONT;
        const text = names[i];
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(6,4,24,0.55)'; ctx.strokeText(text, q.x, q.y);
        ctx.fillStyle = i === 0 ? (p.red ? 'rgba(255,140,120,1)' : 'rgba(255,170,200,1)') : (p.red ? 'rgba(255,150,130,0.9)' : 'rgba(225,220,255,' + (main ? 0.95 : 0.7) + ')');
        ctx.fillText(text, q.x, q.y);
      }
      ctx.textAlign = 'left';
    }
    function drawMeteors(cam, p) {
      const now = p.nowMs || performance.now();
      meteors = meteors.filter(m => {
        if (m.t0 === null) m.t0 = now;
        const t = (now - m.t0) / m.dur;
        if (t >= 1) return false;
        const q = toScreen(cam, m.enu); if (!q.ok) return t < 1;
        const ease = 1 - Math.pow(1 - Math.min(t / 0.35, 1), 2);
        const head = t * m.len, tail = Math.max(0, head - m.len * 0.55);
        const fade = t < 0.12 ? t / 0.12 : (1 - smooth(0.55, 1, t));
        const hx = q.x + Math.cos(m.ang) * head, hy = q.y + Math.sin(m.ang) * head;
        const tx = q.x + Math.cos(m.ang) * tail, ty = q.y + Math.sin(m.ang) * tail;
        const g = ctx.createLinearGradient(tx, ty, hx, hy);
        const col = p.red ? '255,150,120' : '255,246,220';
        g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${0.9 * fade})`);
        ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
        ctx.fillStyle = `rgba(${col},${fade})`; ctx.beginPath(); ctx.arc(hx, hy, 1.8, 0, TAU); ctx.fill();
        return true;
      });
    }
    function drawSelection(cam, p) {
      const e = p.selected.enu; if (!e) return;
      const q = toScreen(cam, e); if (!q.ok) return;
      const t = (p.nowMs / 900) % 1;
      ctx.strokeStyle = p.red ? 'rgba(255,140,120,0.95)' : 'rgba(255,214,140,0.95)'; ctx.lineWidth = 1.6;
      const r = (p.selected.r || 10) + 8 + Math.sin(t * TAU) * 1.5;
      ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, TAU); ctx.stroke();
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.785; ctx.beginPath(); ctx.moveTo(q.x + Math.cos(a) * (r + 3), q.y + Math.sin(a) * (r + 3)); ctx.lineTo(q.x + Math.cos(a) * (r + 9), q.y + Math.sin(a) * (r + 9)); ctx.stroke(); }
    }
    function drawArrow(cam, p) {
      const e = p.target.enu; if (!e) return;
      const q = toScreen(cam, e);
      const inside = q.ok && q.x > 30 && q.x < R.W - 30 && q.y > R.inTop - 20 && q.y < R.H - R.inBottom + 10;
      if (inside) return;
      const ang = Math.atan2(-q.cy, q.cx);
      const sep = Math.acos(clamp(q.cz, -1, 1)) * R2D;
      const cx = cam.cx, cy = cam.cy, rr = Math.max(40, Math.min(R.W / 2, cam.cy - R.inTop, R.H - R.inBottom - cam.cy) - 24);
      const ax = cx + Math.cos(ang) * rr, ay = cy + Math.sin(ang) * rr;
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(ang);
      ctx.fillStyle = p.red ? 'rgba(255,140,120,0.95)' : 'rgba(255,214,140,0.95)'; ctx.strokeStyle = 'rgba(8,6,30,0.6)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-9, -11); ctx.lineTo(-4, 0); ctx.lineTo(-9, 11); ctx.closePath(); ctx.stroke(); ctx.fill();
      ctx.restore();
      ctx.font = '600 12px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const lx = cx + Math.cos(ang) * (rr - 26), ly = cy + Math.sin(ang) * (rr - 26);
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(8,6,30,0.7)'; ctx.strokeText(Math.round(sep) + '°', lx, ly);
      ctx.fillStyle = 'rgba(255,236,190,1)'; ctx.fillText(Math.round(sep) + '°', lx, ly); ctx.textAlign = 'left';
    }

    /* -------------------------------- Sonne, Mond, Korona, Finsternisse */
    function screenDirToward(cam, sky, vFrom, vTo, enuM, q0) { // Bildschirmrichtung von vFrom (Äquatorvektor des Datums) zu vTo
      const d = vTo[0] * vFrom[0] + vTo[1] * vFrom[1] + vTo[2] * vFrom[2];
      let t = [vTo[0] - d * vFrom[0], vTo[1] - d * vFrom[1], vTo[2] - d * vFrom[2]];
      const l = Math.hypot(t[0], t[1], t[2]); if (l < 1e-9) return [0, -1];
      t = [t[0] / l, t[1] / l, t[2] / l];
      const p2 = A.norm([vFrom[0] + t[0] * 0.01, vFrom[1] + t[1] * 0.01, vFrom[2] + t[2] * 0.01]);
      const e2 = mv(enuM, p2), q1 = toScreen(cam, e2);
      const dx = q1.x - q0.x, dy = q1.y - q0.y, n = Math.hypot(dx, dy) || 1;
      return [dx / n, dy / n];
    }
    function drawSunMoon(cam, sky, p, eclipse, dark, drawLabel) {
      const sun = sky.sun, moon = sky.moon, E = enuMatrix(sky.lst, sky.lat);
      const sq = toScreen(cam, sun.enu), mq = toScreen(cam, moon.enu);
      const closeSM = eclipse.sep < 3.5;
      // ---- Sonne
      let sunR = 0, sunOn = false;
      if ((sun.alt > -1.2 || p.ar) && sq.ok) {
        const k = pxPerDeg(cam, sq), trueR = sun.radius * k;
        sunR = Math.max(trueR, 9);
        sunOn = true;
        const cx = sq.x, cy = sq.y;
        const warm = 1 - smooth(2, 22, sun.alt);
        const rgb = [255, 244 - 74 * warm, 214 - 124 * warm];
        const vis = 1 - eclipse.obsc * 0.98;
        // Korona bei Totalität
        if (eclipse.total || eclipse.obsc > 0.97) {
          const tk = eclipse.total ? 1 : smooth(0.97, 1, eclipse.obsc);
          drawCorona(cx, cy, Math.max(trueR, 6), tk, p);
        }
        const g = ctx.createRadialGradient(cx, cy, sunR * 0.6, cx, cy, sunR * 9);
        g.addColorStop(0, `rgba(${rgb.join(',')},${0.55 * vis})`); g.addColorStop(0.25, `rgba(${rgb.join(',')},${0.16 * vis})`); g.addColorStop(1, `rgba(${rgb.join(',')},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, sunR * 9, 0, TAU); ctx.fill();
        const gd = ctx.createRadialGradient(cx, cy, 0, cx, cy, sunR);
        gd.addColorStop(0, `rgba(255,255,${p.red ? 200 : 240},1)`); gd.addColorStop(0.75, `rgba(${rgb.join(',')},1)`); gd.addColorStop(1, `rgba(${rgb[0]},${rgb[1] - 30},${rgb[2] - 40},1)`);
        ctx.fillStyle = p.red ? 'rgb(255,170,140)' : gd; ctx.beginPath(); ctx.arc(cx, cy, sunR, 0, TAU); ctx.fill();
        R.objs.push({ kind: 'sun', x: cx, y: cy, hit: Math.max(26, sunR + 12), pri: -30 });
        if (!closeSM || cam.fov > 20) drawLabel('Sonne', cx + sunR + 6, cy - sunR - 2, { color: 'sun', pri: -2, left: true });
      }
      // ---- Mond
      if ((moon.alt > -1.2 || p.ar) && mq.ok) {
        const k = pxPerDeg(cam, mq), trueR = moon.radius * k;
        const mr = Math.max(trueR, 9.5);
        const cx = mq.x, cy = mq.y;
        // Richtungen auf dem Bildschirm
        const vM = moon.v, vS = A.vec(sun.ra, sun.dec);
        const toSun = screenDirToward(cam, sky, vM, vS, E, mq);
        const toNorth = screenDirToward(cam, sky, vM, [0, 0, 1], E, mq);
        const sunDisc = sunOn && closeSM;
        // Schein
        const glowA = (0.10 + 0.32 * moon.illum) * (0.35 + 0.65 * dark) * (1 - eclipse.obsc * 0.9);
        const gg = ctx.createRadialGradient(cx, cy, mr * 0.8, cx, cy, mr * 6);
        gg.addColorStop(0, `rgba(${p.red ? '255,140,120' : '200,210,255'},${glowA})`); gg.addColorStop(1, 'rgba(200,210,255,0)');
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(cx, cy, mr * 6, 0, TAU); ctx.fill();
        if (sunDisc && eclipse.sep < sun.radius + moon.radius + 0.05) {
          // Sonnenfinsternis: Mond als dunkle Silhouette vor der Sonne
          ctx.fillStyle = 'rgb(3,3,10)'; ctx.beginPath(); ctx.arc(cx, cy, mr, 0, TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(120,120,160,0.25)'; ctx.lineWidth = 1; ctx.stroke();
        } else {
          drawMoonDisc(cx, cy, mr, moon, toSun, toNorth, p, dark);
          const le = lunarEclipse(sky);
          if (le.penumbral > 0.02 && moon.illum > 0.9) drawLunarShadow(cx, cy, mr, le, cam, sky, mq, E, p);
        }
        R.objs.push({ kind: 'moon', x: cx, y: cy, hit: Math.max(26, mr + 12), pri: -20 });
        if (!closeSM || cam.fov > 20) drawLabel('Mond', cx + mr + 6, cy - mr - 2, { color: 'moon', pri: -1, left: true });
      }
    }
    function drawCorona(cx, cy, r, k, p) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(cx, cy, r, cx, cy, r * 4.2);
      g.addColorStop(0, `rgba(255,250,240,${0.85 * k})`); g.addColorStop(0.18, `rgba(235,235,255,${0.45 * k})`); g.addColorStop(0.5, `rgba(190,190,255,${0.14 * k})`); g.addColorStop(1, 'rgba(160,160,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r * 4.2, 0, TAU); ctx.fill();
      // Streamer
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * TAU + Math.sin(i * 12.9898) * 0.12, len = r * (1.8 + 2.4 * Math.abs(Math.sin(i * 78.233)) * (0.6 + 0.4 * Math.cos(a * 2)));
        const gx = ctx.createLinearGradient(cx + Math.cos(a) * r, cy + Math.sin(a) * r, cx + Math.cos(a) * len, cy + Math.sin(a) * len);
        gx.addColorStop(0, `rgba(255,250,245,${0.32 * k})`); gx.addColorStop(1, 'rgba(255,250,245,0)');
        ctx.strokeStyle = gx; ctx.lineWidth = Math.max(1, r * 0.09);
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len); ctx.stroke();
      }
      ctx.restore();
    }
    // Maria (Position x nach Himmelsrichtung West rechts, y nach Norden oben; im Einheitskreis)
    const MARIA = [[-0.27, 0.42, 0.25, 0.20, 0.5], [0.28, 0.42, 0.15, 0.15, 0.5], [0.36, 0.10, 0.20, 0.17, 0.5], [0.64, 0.30, 0.09, 0.07, 0.6], [0.62, -0.10, 0.12, 0.10, 0.5],
      [0.34, -0.17, 0.07, 0.06, 0.45], [-0.55, 0.06, 0.30, 0.22, 0.42], [-0.20, -0.36, 0.17, 0.13, 0.45], [-0.56, -0.32, 0.09, 0.09, 0.5], [0.0, 0.74, 0.28, 0.05, 0.35], [0.03, 0.14, 0.07, 0.05, 0.4], [-0.02, -0.03, 0.10, 0.08, 0.3]];
    function drawMoonDisc(cx, cy, r, moon, toSun, toNorth, p, dark) {
      ctx.save(); ctx.translate(cx, cy);
      // Basis: x-Achse = Himmelsrichtung West (rechts, wenn Norden oben), y = Norden
      const nx = toNorth[0], ny = toNorth[1];
      const wx = -ny, wy = nx; // West: Norden im Uhrzeigersinn um 90° gedreht (Bildschirm-y nach unten)
      // Grundscheibe mit Meeren und Kratern
      const drawBase = () => {
      const base = ctx.createRadialGradient(-r * 0.25, -r * 0.25, r * 0.1, 0, 0, r);
      base.addColorStop(0, p.red ? '#e8a090' : '#ecebf4'); base.addColorStop(0.8, p.red ? '#c47a6c' : '#cfcfdc'); base.addColorStop(1, p.red ? '#8c4a40' : '#a2a3b8');
      ctx.fillStyle = base; ctx.fillRect(-r, -r, 2 * r, 2 * r);
      if (r > 8) {
        for (const m of MARIA) {
          const mxs = (m[0] * wx + m[1] * nx) * r, mys = (m[0] * wy + m[1] * ny) * r, rr = m[2] * r;
          ctx.save(); ctx.translate(mxs, mys); ctx.rotate(Math.atan2(ny, nx) * 0 + 0);
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rr);
          g.addColorStop(0, `rgba(${p.red ? '110,50,44' : '96,100,124'},${m[4]})`); g.addColorStop(0.7, `rgba(${p.red ? '110,50,44' : '96,100,124'},${m[4] * 0.6})`); g.addColorStop(1, 'rgba(96,100,124,0)');
          ctx.fillStyle = g; ctx.scale(1, m[3] / m[2]); ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU); ctx.fill(); ctx.restore();
        }
        // Krater Tycho / Copernicus
        for (const c of [[-0.10, -0.76, 0.05, 0.9], [-0.32, 0.13, 0.035, 0.8], [-0.62, 0.30, 0.03, 0.8]]) {
          const xs = (c[0] * wx + c[1] * nx) * r, ys = (c[0] * wy + c[1] * ny) * r;
          const g = ctx.createRadialGradient(xs, ys, 0, xs, ys, c[2] * r * 3);
          g.addColorStop(0, `rgba(255,255,255,${c[3]})`); g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(xs, ys, c[2] * r * 3, 0, TAU); ctx.fill();
        }
      }
      };
      // Phase: beleuchtete Fläche = Halbkreis zur Sonne + Terminator-Halbellipse
      const ang = Math.atan2(toSun[1], toSun[0]);
      const cosI = Math.cos(moon.phaseAngle * D2R);
      const litPath = (withDisc) => {
        ctx.rotate(ang);
        ctx.beginPath();
        if (withDisc) ctx.arc(0, 0, r + 0.6, 0, TAU);
        ctx.moveTo(0, -r); ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
        if (cosI >= 0) ctx.ellipse(0, 0, Math.abs(cosI) * r, r, 0, Math.PI / 2, Math.PI * 1.5, false);
        else ctx.ellipse(0, 0, Math.abs(cosI) * r, r, 0, Math.PI / 2, -Math.PI / 2, true);
        ctx.closePath();
        ctx.rotate(-ang);
      };
      // Nachtseite: nachts dunkel mit Erdlicht-Hauch, am Taghimmel unsichtbar (der Himmel scheint durch)
      const k = Math.max(0, Math.min(1, dark == null ? 1 : dark));
      if (k > 0.01) {
        ctx.save();
        litPath(true); ctx.clip('evenodd');
        ctx.globalAlpha = k;
        drawBase();
        ctx.fillStyle = p.red ? 'rgba(20,4,4,0.93)' : 'rgba(9,9,28,0.93)';
        ctx.fillRect(-r - 1, -r - 1, 2 * r + 2, 2 * r + 2);
        ctx.restore();
      }
      // Tagseite
      ctx.save();
      litPath(false); ctx.clip();
      drawBase();
      ctx.restore();
      // Erdlicht-Rand (nur bei dunklem Himmel)
      if (k > 0.01) {
        ctx.strokeStyle = `rgba(150,150,190,${0.16 * k})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
      }
      ctx.restore();
    }
    function drawLunarShadow(cx, cy, mr, le, cam, sky, mq, E, p) {
      // Erdschatten-Mittelpunkt relativ zum Mond (Bildschirm)
      const vM = A.vec(sky.moon.gra, sky.moon.gdec), dir = screenDirToward(cam, sky, vM, le.anti, E, mq);
      const pxDeg = mr / le.rm;
      const sx = cx + dir[0] * le.d * pxDeg, sy = cy + dir[1] * le.d * pxDeg;
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, mr, 0, TAU); ctx.clip();
      // Halbschatten
      let g = ctx.createRadialGradient(sx, sy, le.Ru * pxDeg, sx, sy, le.Rp * pxDeg);
      g.addColorStop(0, 'rgba(40,30,50,0.55)'); g.addColorStop(1, 'rgba(40,30,50,0.0)');
      ctx.fillStyle = g; ctx.fillRect(cx - mr, cy - mr, mr * 2, mr * 2);
      // Kernschatten: rot
      g = ctx.createRadialGradient(sx, sy, 0, sx, sy, le.Ru * pxDeg);
      g.addColorStop(0, 'rgba(56,10,6,0.96)'); g.addColorStop(0.75, 'rgba(96,26,12,0.94)'); g.addColorStop(0.93, 'rgba(150,54,26,0.86)'); g.addColorStop(1, 'rgba(200,110,70,0.55)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, le.Ru * pxDeg, 0, TAU); ctx.fill();
      ctx.restore();
    }

    /* ----------------------------------------------------------- Treffer */
    function hitTest(x, y) {
      let best = null, bd = 1e9;
      for (const o of R.objs) {
        const d = Math.hypot(o.x - x, o.y - y);
        if (d <= o.hit) { const score = d + (o.pri || 0) * 0.9; if (score < bd) { bd = score; best = o; } }
      }
      return best;
    }

    return { draw, hitTest, resize, toScreen, fromScreen, makeCam, pxPerDeg, applyRefraction, lunarEclipse, solarEclipse, state: R, enuMatrix, limitingMag, limitingMagFor, skyColors, spawnMeteor };
  }

  return { create, enuMatrix, limitingMag, skyColors, bvToRgb, smooth };
});
