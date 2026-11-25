/* PartikelWahr — eigenständige Physik- und Render-Engine.
   Kein externes Framework, keine Bibliothek: nur Canvas 2D, WebAudio, DeviceOrientation. */
(() => {
  'use strict';

  // ---------------------------------------------------------------------
  // Setup / DOM
  // ---------------------------------------------------------------------
  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d', { alpha: false });
  let W = 0, H = 0, DPR = 1;

  // Echte HD-Schärfe: volle Gerätepixeldichte nutzen (bis 3x), aber die
  // Backing-Store-Fläche begrenzen, damit große Desktop-Monitore nicht
  // ruckeln — auf Handys/Tablets bleibt die volle native Schärfe erhalten.
  function computeDPR() {
    const raw = window.devicePixelRatio || 1;
    let dpr = Math.min(raw, 3);
    const budget = 4_800_000; // max. Backing-Store-Pixel für flüssige 60fps
    const vh = (window.wzVH ? window.wzVH() : window.innerHeight);
    const backing = window.innerWidth * vh * dpr * dpr;
    if (backing > budget) dpr = Math.sqrt(budget / (window.innerWidth * vh));
    return Math.max(1, dpr);
  }

  function resize() {
    DPR = computeDPR();
    W = window.innerWidth;
    H = (window.wzVH ? window.wzVH() : window.innerHeight);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
    resizeBloom();
    buildWaterField();
    buildBackground();
  }
  window.addEventListener('resize', resize);

  // ---------------------------------------------------------------------
  // Bloom-Pass — echtes weiches Störlicht um die scharfen Formen, ohne
  // die Kerne selbst zu verwaschen. Der Hauptcanvas bleibt haarscharf
  // (voller DPR); der Bloom wird auf einer kleinen Offscreen-Fläche
  // erzeugt (billig zu weichzeichnen) und additiv obendrauf gelegt —
  // dieselbe Technik, die Spiele/Kunst-Renderer für ihr Leuchten nutzen.
  // ---------------------------------------------------------------------
  const bloomCanvas = document.createElement('canvas');
  const bloomCtx = bloomCanvas.getContext('2d');
  const BLOOM_SCALE = 0.4;
  function resizeBloom() {
    bloomCanvas.width = Math.max(1, Math.round(canvas.width * BLOOM_SCALE));
    bloomCanvas.height = Math.max(1, Math.round(canvas.height * BLOOM_SCALE));
  }
  function drawBloom() {
    bloomCtx.clearRect(0, 0, bloomCanvas.width, bloomCanvas.height);
    bloomCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, bloomCanvas.width, bloomCanvas.height);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // in echten Gerätepixeln arbeiten, sonst verdoppelt sich die Unschärfe mit DPR
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5 * settings.bloom;
    if ('filter' in ctx) {
      ctx.filter = 'blur(7px)';
      ctx.drawImage(bloomCanvas, 0, 0, bloomCanvas.width, bloomCanvas.height, 0, 0, canvas.width, canvas.height);
      ctx.filter = 'none';
    } else {
      ctx.drawImage(bloomCanvas, 0, 0, bloomCanvas.width, bloomCanvas.height, 0, 0, canvas.width, canvas.height);
    }
    ctx.restore();
  }

  const COLORS = {
    fire: [255, 122, 51],
    fireHot: [255, 214, 120],
    water: [47, 182, 201],
    waterLight: [150, 226, 235],
    star: [232, 228, 255],
    bolt: [201, 166, 255],
    snow: [225, 238, 255],
    bubble: [190, 225, 255],
    sand: [214, 176, 118]
  };

  // ---------------------------------------------------------------------
  // Partikel-Sprites — der Verlauf (Glanz-Effekt) für Feuer/Wasser sieht
  // bei jedem Partikel exakt gleich aus, nur skaliert und (bei Feuer)
  // abgedunkelt. Statt ihn bei jedem Bild für jedes einzelne Partikel neu
  // zu berechnen, wird er einmalig auf eine kleine Offscreen-Fläche
  // gezeichnet und danach nur noch als fertiges Bild eingefügt — optisch
  // exakt dasselbe Ergebnis, aber deutlich weniger Rechenaufwand pro Bild.
  // ---------------------------------------------------------------------
  function buildFireSprite(rgb) {
    const CORE = 40, PAD = 4;
    const S = Math.ceil((CORE + PAD) * 2);
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const cx = c.getContext('2d');
    const cc = S / 2;
    const g = cx.createRadialGradient(cc, cc, 0, cc, cc, CORE);
    g.addColorStop(0, 'rgba(255,255,255,0.85)');
    g.addColorStop(0.35, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.9)`);
    g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
    cx.fillStyle = g;
    cx.beginPath(); cx.arc(cc, cc, CORE, 0, 6.283); cx.fill();
    return { canvas: c, CORE };
  }
  const fireSpriteHot = buildFireSprite(COLORS.fireHot);
  const fireSpriteCool = buildFireSprite(COLORS.fire);

  function buildWaterSprite() {
    const R = 40, PAD = 8;
    const S = Math.ceil((R + PAD) * 2);
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const cx = c.getContext('2d');
    const cc = S / 2;
    const body = cx.createRadialGradient(cc - R * 0.32, cc - R * 0.38, R * 0.1, cc, cc, R);
    body.addColorStop(0, 'rgba(226,252,255,0.98)');
    body.addColorStop(0.5, 'rgba(110,210,224,0.95)');
    body.addColorStop(1, 'rgba(18,100,118,0.92)');
    cx.fillStyle = body;
    cx.beginPath(); cx.arc(cc, cc, R, 0, 6.283); cx.fill();
    cx.strokeStyle = 'rgba(210,248,252,0.55)';
    cx.lineWidth = Math.max(0.45, R * 0.16);
    cx.stroke();
    cx.fillStyle = 'rgba(255,255,255,0.95)';
    cx.beginPath(); cx.arc(cc - R * 0.34, cc - R * 0.4, Math.max(0.35, R * 0.24), 0, 6.283); cx.fill();
    return { canvas: c, R };
  }
  const waterSprite = buildWaterSprite();

  // Sterne-Funken und Galaxie-Partikel: Farbe kommt aus einer kleinen,
  // aber unbegrenzten Menge möglicher Kombinationen (fünf Paletten plus
  // der weiße Zünd-Blitz) — pro tatsächlich vorkommender Farbe wird das
  // Sprite einmalig gebaut und danach aus dem Cache wiederverwendet.
  function buildGlowSprite(rgb, midStop) {
    const CORE = 40, PAD = 6;
    const S = Math.ceil((CORE + PAD) * 2);
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const cx = c.getContext('2d');
    const cc = S / 2;
    const g = cx.createRadialGradient(cc, cc, 0, cc, cc, CORE);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(midStop, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.95)`);
    g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
    cx.fillStyle = g;
    cx.beginPath(); cx.arc(cc, cc, CORE, 0, 6.283); cx.fill();
    return { canvas: c, CORE };
  }
  const sparkSpriteCache = new Map();
  function getSparkSprite(r, g, b) {
    const key = r + ',' + g + ',' + b;
    let s = sparkSpriteCache.get(key);
    if (!s) { s = buildGlowSprite([r, g, b], 0.3); sparkSpriteCache.set(key, s); }
    return s;
  }
  const galaxySpriteCache = new Map();
  function getGalaxySprite(r, g, b) {
    const key = r + ',' + g + ',' + b;
    let s = galaxySpriteCache.get(key);
    if (!s) { s = buildGlowSprite([r, g, b], 0.35); galaxySpriteCache.set(key, s); }
    return s;
  }

  function buildSteamSprite() {
    const CORE = 40, PAD = 4;
    const S = Math.ceil((CORE + PAD) * 2);
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const cx = c.getContext('2d');
    const cc = S / 2;
    const g = cx.createRadialGradient(cc, cc, 0, cc, cc, CORE);
    g.addColorStop(0, 'rgba(235,238,245,1)');
    g.addColorStop(1, 'rgba(235,238,245,0)');
    cx.fillStyle = g;
    cx.beginPath(); cx.arc(cc, cc, CORE, 0, 6.283); cx.fill();
    return { canvas: c, CORE };
  }
  const steamSprite = buildSteamSprite();

  // Schneeflocke: weicher Kern plus feine sechsstrahlige Zeichnung, die im
  // Kleinen kaum auffällt, aber beim Antippen (größere Flocken) sichtbar wird.
  // Normale Flocken: schlichter weicher Punkt — bei 2-6px Anzeigegröße
  // wäre feine Kristall-Zeichnung ohnehin nicht zu erkennen.
  function buildSnowSoftSprite() {
    const CORE = 22, PAD = 6;
    const S = Math.ceil((CORE + PAD) * 2);
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const cx = c.getContext('2d');
    const cc = S / 2;
    const g = cx.createRadialGradient(cc, cc, 0, cc, cc, CORE);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.55, 'rgba(225,238,255,0.7)');
    g.addColorStop(1, 'rgba(225,238,255,0)');
    cx.fillStyle = g;
    cx.beginPath(); cx.arc(cc, cc, CORE, 0, 6.283); cx.fill();
    return { canvas: c, CORE };
  }
  const snowSoftSprite = buildSnowSoftSprite();

  // Hero-Flocken: deutlich größer, mit echter sechsstrahliger Kristallform
  // (samt kleinen Verästelungen) — nur bei diesen lohnt sich das Detail,
  // weil sie tatsächlich groß genug gezeichnet werden, um es zu zeigen.
  function buildSnowCrystalSprite() {
    const CORE = 30, PAD = 8;
    const S = Math.ceil((CORE + PAD) * 2);
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const cx = c.getContext('2d');
    const cc = S / 2;
    const g = cx.createRadialGradient(cc, cc, 0, cc, cc, CORE * 0.45);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(225,238,255,0)');
    cx.fillStyle = g;
    cx.beginPath(); cx.arc(cc, cc, CORE * 0.45, 0, 6.283); cx.fill();
    cx.strokeStyle = 'rgba(255,255,255,0.8)';
    cx.lineWidth = 1.3;
    cx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      const ex = cc + Math.cos(a) * CORE * 0.85, ey = cc + Math.sin(a) * CORE * 0.85;
      cx.beginPath(); cx.moveTo(cc, cc); cx.lineTo(ex, ey); cx.stroke();
      // kleine Seitenäste, wie bei einem echten Eiskristall
      const mx = cc + Math.cos(a) * CORE * 0.55, my = cc + Math.sin(a) * CORE * 0.55;
      const branch = CORE * 0.22;
      cx.beginPath();
      cx.moveTo(mx, my);
      cx.lineTo(mx + Math.cos(a + 0.9) * branch, my + Math.sin(a + 0.9) * branch);
      cx.moveTo(mx, my);
      cx.lineTo(mx + Math.cos(a - 0.9) * branch, my + Math.sin(a - 0.9) * branch);
      cx.stroke();
    }
    return { canvas: c, CORE };
  }
  const snowCrystalSprite = buildSnowCrystalSprite();


  // Herbstblatt: kleine ovale Fläche mit Mittelrippe — pro vorkommender
  // Blattfarbe einmal gebaut und danach aus dem Cache wiederverwendet.
  const LEAF_PALETTES = [
    [196, 84, 40],   // Ziegelrot
    [214, 132, 34],  // Kürbis
    [223, 168, 52],  // Ocker
    [168, 62, 46],   // Weinrot
    [150, 104, 40]   // Braun
  ];
  const leafSpriteCache = new Map();
  function buildLeafSprite(rgb) {
    const R = 20, PAD = 6;
    const S = Math.ceil((R + PAD) * 2);
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const cx = c.getContext('2d');
    const cc = S / 2;
    cx.save();
    cx.translate(cc, cc);
    const g = cx.createLinearGradient(0, -R, 0, R);
    g.addColorStop(0, `rgba(${Math.min(255, rgb[0] + 40)},${Math.min(255, rgb[1] + 30)},${rgb[2]},0.95)`);
    g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.95)`);
    cx.fillStyle = g;
    cx.beginPath();
    cx.moveTo(0, -R);
    cx.bezierCurveTo(R * 0.85, -R * 0.3, R * 0.85, R * 0.5, 0, R);
    cx.bezierCurveTo(-R * 0.85, R * 0.5, -R * 0.85, -R * 0.3, 0, -R);
    cx.fill();
    cx.strokeStyle = 'rgba(0,0,0,0.18)';
    cx.lineWidth = 0.8;
    cx.beginPath(); cx.moveTo(0, -R * 0.85); cx.lineTo(0, R * 0.85); cx.stroke();
    cx.restore();
    return { canvas: c, R };
  }
  function getLeafSprite(rgb) {
    const key = rgb.join(',');
    let s = leafSpriteCache.get(key);
    if (!s) { s = buildLeafSprite(rgb); leafSpriteCache.set(key, s); }
    return s;
  }

  // Seifenblase: heller Rand-Ring mit dünnem Kern statt vollflächiger
  // Füllung — dadurch wirkt sie hohl/durchsichtig wie eine echte Blase.
  const BUBBLE_TINTS = [
    [255, 190, 210], // rosa
    [190, 255, 214], // mint
    [255, 228, 168], // gold
    [200, 210, 255], // veilchenblau
    [225, 190, 255]  // lila
  ];
  function buildBubbleSprite() {
    const R = 26, PAD = 6;
    const S = Math.ceil((R + PAD) * 2);
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const cx = c.getContext('2d');
    const cc = S / 2;
    const body = cx.createRadialGradient(cc, cc, R * 0.55, cc, cc, R);
    body.addColorStop(0, 'rgba(220,240,255,0.06)');
    body.addColorStop(0.82, 'rgba(220,240,255,0.16)');
    body.addColorStop(0.92, 'rgba(255,255,255,0.55)');
    body.addColorStop(1, 'rgba(220,240,255,0)');
    cx.fillStyle = body;
    cx.beginPath(); cx.arc(cc, cc, R, 0, 6.283); cx.fill();
    cx.fillStyle = 'rgba(255,255,255,0.8)';
    cx.beginPath(); cx.arc(cc - R * 0.36, cc - R * 0.4, R * 0.16, 0, 6.283); cx.fill();
    return { canvas: c, R };
  }
  const bubbleSprite = buildBubbleSprite();

  // Sandkorn: winziger, harter Glanzpunkt (kein weicher Bloom-Kern nötig,
  // Sand soll körnig statt leuchtend wirken).
  function buildSandSprite() {
    const CORE = 14, PAD = 3;
    const S = Math.ceil((CORE + PAD) * 2);
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const cx = c.getContext('2d');
    const cc = S / 2;
    const g = cx.createRadialGradient(cc, cc, 0, cc, cc, CORE);
    g.addColorStop(0, 'rgba(226,196,150,0.95)');
    g.addColorStop(0.45, 'rgba(214,176,118,0.9)');
    g.addColorStop(0.8, 'rgba(150,116,74,0.5)');
    g.addColorStop(1, 'rgba(150,116,74,0)');
    cx.fillStyle = g;
    cx.beginPath(); cx.arc(cc, cc, CORE, 0, 6.283); cx.fill();
    return { canvas: c, CORE };
  }
  const sandSprite = buildSandSprite();

  // Nebel: großer, sehr weicher Fleck, deutlich diffuser als der Dampf —
  // mehrere überlappende Flecken ergeben eine zusammenhängende Wolkenbank.
  function buildFogSprite() {
    const CORE = 70, PAD = 4;
    const S = Math.ceil((CORE + PAD) * 2);
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const cx = c.getContext('2d');
    const cc = S / 2;
    const g = cx.createRadialGradient(cc, cc, 0, cc, cc, CORE);
    g.addColorStop(0, 'rgba(214,218,230,0.5)');
    g.addColorStop(0.6, 'rgba(214,218,230,0.22)');
    g.addColorStop(1, 'rgba(214,218,230,0)');
    cx.fillStyle = g;
    cx.beginPath(); cx.arc(cc, cc, CORE, 0, 6.283); cx.fill();
    return { canvas: c, CORE };
  }
  const fogSprite = buildFogSprite();

  // ---------------------------------------------------------------------
  // Global physics state
  // ---------------------------------------------------------------------
  const gravity = { x: 0, y: 620 };      // px/s^2, shifted by device tilt
  const targetGravity = { x: 0, y: 620 };
  const BASE_G = 620;

  const active = {
    fire: true, water: false, star: false, bolt: false, galaxy: false,
    snow: false, leaf: false, bubble: false, sand: false, fog: false
  };

  // ---------------------------------------------------------------------
  // Einstellungen — persistiert lokal auf dem Gerät (kein Server beteiligt)
  // ---------------------------------------------------------------------
  const DEFAULT_SETTINGS = { density: 1, bloom: 1, firework: 1, bg: 'flat', sound: 0, tilt: 1 };
  let settings = { ...DEFAULT_SETTINGS };
  try {
    const saved = JSON.parse(localStorage.getItem('partikelwahr-settings') || 'null');
    if (saved) settings = { ...DEFAULT_SETTINGS, ...saved };
    // Migration: alte Lautstärke-Stufen (vor der Neuabstimmung) auf die
    // neuen Werte abbilden, sonst bleibt bei wiederkehrenden Nutzern eine
    // Zahl aktiv, die zu keinem Regler-Button mehr passt.
    const SOUND_MIGRATION = { 0.3: 0.15, 0.55: 0.4, 0.85: 0.75 };
    if (settings.sound in SOUND_MIGRATION) {
      settings.sound = SOUND_MIGRATION[settings.sound];
      saveSettings(); // migrierten Wert direkt zurückschreiben, sonst läuft bei jedem Neustart erneut die (harmlose) Migration statt des schon aktuellen Werts
    }
  } catch (e) { /* privater Modus o.ä. — Einstellungen bleiben nur für diese Sitzung */ }
  function saveSettings() {
    try { localStorage.setItem('partikelwahr-settings', JSON.stringify(settings)); } catch (e) {}
  }

  let bgGradient = null;
  function buildBackground() {
    if (settings.bg === 'flat') { bgGradient = '#05070c'; return; }
    // Bewusst LINEAR statt radial: ein radialer Verlauf erzeugte im
    // Zusammenspiel mit dem Bloom-Pass einen sichtbaren hellen Ring an
    // der Übergangszone. Ein linearer Verlauf hat keine solche Kante.
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0a0d17');
    g.addColorStop(1, '#020305');
    bgGradient = g;
  }

  // ---------------------------------------------------------------------
  // Simple deterministic pseudo-noise (own implementation, no library)
  // ---------------------------------------------------------------------
  function hash(x) {
    x = Math.sin(x) * 43758.5453;
    return x - Math.floor(x);
  }
  function noise1(x) {
    // smoothed value noise from a handful of sine harmonics — cheap "turbulence"
    return (
      Math.sin(x * 1.7) * 0.5 +
      Math.sin(x * 4.1 + 1.3) * 0.28 +
      Math.sin(x * 9.3 + 2.7) * 0.14
    );
  }

  // ---------------------------------------------------------------------
  // Particle pools (swap-pop removal, no GC churn from splice)
  // ---------------------------------------------------------------------
  function makePool(cap) {
    return { arr: [], cap };
  }
  const pools = {
    fire: makePool(900),
    water: makePool(1400),
    splash: makePool(500),
    star: makePool(500),
    sparkle: makePool(300),
    bolt: makePool(40),
    spark: makePool(400),
    steam: makePool(350),
    galaxy: makePool(700),
    snow: makePool(680),
    leaf: makePool(220),
    bubble: makePool(220),
    sand: makePool(900),
    fog: makePool(125)
  };

  function spawn(pool, obj) {
    if (pool.arr.length >= pool.cap) pool.arr.shift();
    pool.arr.push(obj);
  }
  function sweep(pool, dt, update) {
    const a = pool.arr;
    for (let i = a.length - 1; i >= 0; i--) {
      const alive = update(a[i], dt);
      if (!alive) {
        a[i] = a[a.length - 1];
        a.pop();
      }
    }
  }

  // Schweif auf eine feste Bildschirm-Länge kürzen (nicht auf eine feste
  // Punktanzahl) — so bleibt die sichtbare Länge unabhängig davon, wie
  // schnell sich das jeweilige Partikel gerade bewegt. maxPoints ist nur
  // eine Sicherheitsgrenze, falls ein Partikel kaum von der Stelle kommt.
  function trimTrail(trail, maxLenPx, maxPoints) {
    const capEls = maxPoints * 2;
    if (trail.length > capEls) trail.splice(0, trail.length - capEls);
    while (trail.length > 4) {
      let len = 0;
      for (let i = 0; i + 3 < trail.length; i += 2) {
        len += Math.hypot(trail[i + 2] - trail[i], trail[i + 3] - trail[i + 1]);
      }
      if (len <= maxLenPx) break;
      trail.splice(0, 2);
    }
  }

  // ---------------------------------------------------------------------
  // Spatial-Hash-Grid — für effiziente Kollisionen zwischen Partikel-Pools
  // (z.B. Feuer trifft Wasser), ohne jedes Paar einzeln zu prüfen.
  // ---------------------------------------------------------------------
  function buildGrid(pool, cellSize) {
    const grid = new Map();
    for (const p of pool.arr) {
      const key = (p.x / cellSize | 0) + ',' + (p.y / cellSize | 0);
      let bucket = grid.get(key);
      if (!bucket) { bucket = []; grid.set(key, bucket); }
      bucket.push(p);
    }
    return grid;
  }
  function forNeighbors(grid, cellSize, x, y, fn) {
    const cx = x / cellSize | 0, cy = y / cellSize | 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const bucket = grid.get((cx + dx) + ',' + (cy + dy));
        if (bucket) for (const p of bucket) fn(p);
      }
    }
  }

  // ---------------------------------------------------------------------
  // FEUER — Auftrieb, Turbulenz, additive Glut
  // ---------------------------------------------------------------------
  function emitFire(x, y, n) {
    n = Math.round(n * settings.density);
    for (let i = 0; i < n; i++) {
      spawn(pools.fire, {
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 40,
        vy: -Math.random() * 60 - 20,
        life: 0,
        maxLife: 0.9 + Math.random() * 0.9,
        size: 8 + Math.random() * 10,
        seed: Math.random() * 1000
      });
    }
  }

  function updateFire(dt) {
    sweep(pools.fire, dt, (p, dt) => {
      if (p._doomed) return false;
      p.life += dt;
      const t = p.life / p.maxLife;
      if (t >= 1) return false;
      // buoyancy counters gravity, plus turbulence sideways drift
      const buoy = (1 - t) * 380;
      p.vy += (gravity.y * 0.25 - buoy) * dt;
      p.vx += noise1(p.seed + p.life * 3) * 260 * dt + gravity.x * 0.4 * dt;
      p.vx *= 0.985;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      // side-wall collision
      if (p.x < 4) { p.x = 4; p.vx *= -0.4; }
      if (p.x > W - 4) { p.x = W - 4; p.vx *= -0.4; }
      return p.y > -40;
    });
  }

  function drawFire() {
    if (pools.fire.arr.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of pools.fire.arr) {
      const t = p.life / p.maxLife;
      const size = p.size * (1 - t * 0.7);
      const alpha = 1 - t;
      // scharfer, kleiner Glutkern statt eines großen weichen Flecks —
      // das weiche Leuchten drumherum entsteht separat im Bloom-Pass.
      const core = size * 0.42;
      const sprite = t < 0.4 ? fireSpriteHot : fireSpriteCool;
      const scale = core / sprite.CORE;
      const dw = sprite.canvas.width * scale, dh = sprite.canvas.height * scale;
      ctx.globalAlpha = alpha;
      ctx.drawImage(sprite.canvas, p.x - dw / 2, p.y - dh / 2, dw, dh);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ---------------------------------------------------------------------
  // DAMPF — entsteht, wenn Feuer und Wasser aufeinandertreffen
  // ---------------------------------------------------------------------
  function emitSteam(x, y, n) {
    for (let i = 0; i < n; i++) {
      spawn(pools.steam, {
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 30,
        vy: -30 - Math.random() * 40,
        life: 0,
        maxLife: 1.1 + Math.random() * 0.9,
        size: 5 + Math.random() * 6,
        seed: Math.random() * 1000
      });
    }
  }
  function updateSteam(dt) {
    sweep(pools.steam, dt, (p, dt) => {
      p.life += dt;
      if (p.life >= p.maxLife) return false;
      p.vy -= 26 * dt; // langsam aufsteigend
      p.vx += noise1(p.seed + p.life * 2) * 90 * dt + gravity.x * 0.35 * dt;
      p.vx *= 0.98; p.vy *= 0.99;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      return true;
    });
  }
  function drawSteam() {
    if (!pools.steam.arr.length) return;
    ctx.save();
    for (const p of pools.steam.arr) {
      const t = p.life / p.maxLife;
      const size = p.size * (1 + t * 1.6); // Dampf dehnt sich aus
      const a = (1 - t) * 0.32;
      const scale = size / steamSprite.CORE;
      const dw = steamSprite.canvas.width * scale, dh = steamSprite.canvas.height * scale;
      ctx.globalAlpha = a;
      ctx.drawImage(steamSprite.canvas, p.x - dw / 2, p.y - dh / 2, dw, dh);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Feuer + Wasser: wo sich beide Modi begegnen, entsteht Dampf statt
  // sich einfach zu überlagern — echte Wechselwirkung zwischen den Systemen.
  function updateFireWaterInteraction() {
    if (!active.fire || !active.water) return;
    if (!pools.fire.arr.length || !pools.water.arr.length) return;
    const grid = buildGrid(pools.water, 26);
    for (const f of pools.fire.arr) {
      if (f._doomed) continue;
      let hit = null;
      forNeighbors(grid, 26, f.x, f.y, (w) => {
        if (hit || w._doomed) return;
        const dx = f.x - w.x, dy = f.y - w.y;
        if (dx * dx + dy * dy < 15 * 15) hit = w;
      });
      if (hit) {
        emitSteam((f.x + hit.x) / 2, (f.y + hit.y) / 2, 2 + Math.floor(Math.random() * 2));
        f._doomed = true;
        hit._doomed = true;
      }
    }
  }

  // Feuer + Schnee: Flocken, die einer Flamme zu nahe kommen, schmelzen —
  // statt einfach zu verschwinden, werden sie zu ein paar Wassertropfen
  // (plus einem kurzen Dampfschleier), genau wie echter Schnee am Feuer.
  function updateFireSnowInteraction() {
    if (!active.fire || !active.snow) return;
    if (!pools.fire.arr.length || !pools.snow.arr.length) return;
    const grid = buildGrid(pools.fire, 30);
    for (const s of pools.snow.arr) {
      if (s._doomed) continue;
      let hit = null;
      forNeighbors(grid, 30, s.x, s.y, (f) => {
        if (hit || f._doomed) return;
        const dx = s.x - f.x, dy = s.y - f.y;
        if (dx * dx + dy * dy < 18 * 18) hit = f;
      });
      if (hit) {
        emitWater(s.x, s.y, 1);
        emitSteam(s.x, s.y, 1);
        s._doomed = true;
      }
    }
  }

  // ---------------------------------------------------------------------
  // WASSER — Höhenfeld (Wellengleichung) + fallende Tropfen mit Kollision
  // ---------------------------------------------------------------------
  const WATER_STEP = 10; // px between height samples
  let waterN = 0;
  let waterH = null, waterV = null, waterRest = null;

  function buildWaterField() {
    waterN = Math.ceil(W / WATER_STEP) + 2;
    waterRest = new Float32Array(waterN);
    waterH = new Float32Array(waterN);
    waterV = new Float32Array(waterN);
    const restY = H * 0.86;
    for (let i = 0; i < waterN; i++) { waterRest[i] = restY; waterH[i] = restY; }
  }

  function waterHeightAt(x) {
    const fi = x / WATER_STEP;
    const i0 = Math.max(0, Math.min(waterN - 2, Math.floor(fi)));
    const f = fi - i0;
    return waterH[i0] * (1 - f) + waterH[i0 + 1] * f;
  }

  function disturbWater(x, amount) {
    const i = Math.round(x / WATER_STEP);
    for (let k = -2; k <= 2; k++) {
      const idx = i + k;
      if (idx >= 0 && idx < waterN) waterV[idx] += amount * (1 - Math.abs(k) / 3);
    }
  }

  function emitWater(x, y, n) {
    n = Math.round(n * settings.density);
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * 6.283;
      const toss = 40 + Math.random() * 90;
      spawn(pools.water, {
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        // kurzer Toss nach außen/oben, wie echtes Wasser, das vom Finger
        // abspritzt — statt sofort schwerkraftbedingt nach unten zu fallen
        vx: Math.cos(ang) * toss * 0.6 + gravity.x * 0.3,
        vy: -Math.abs(Math.sin(ang)) * toss - 40,
        r: 1.5 + Math.random() * 1.7,
        bounces: 0
      });
    }
  }

  function updateWaterField(dt) {
    // wave equation: spring back to rest + neighbour coupling + damping
    for (let i = 0; i < waterN; i++) {
      const left = i > 0 ? waterH[i - 1] : waterH[i];
      const right = i < waterN - 1 ? waterH[i + 1] : waterH[i];
      const spread = (left + right - 2 * waterH[i]) * 0.18;
      const springAcc = (waterRest[i] - waterH[i]) * 3.2;
      waterV[i] += (springAcc + spread * 60) * dt;
      waterV[i] *= 0.985;
    }
    // tilt slowly re-levels the rest line sideways (flow toward the low side)
    for (let i = 0; i < waterN; i++) {
      waterH[i] += waterV[i] * dt;
    }
    // propagate a slight lateral flow driven by gravity.x
    if (Math.abs(gravity.x) > 4) {
      const flow = gravity.x * 0.0009;
      for (let i = 1; i < waterN - 1; i++) {
        waterV[i] += (waterH[i - 1] - waterH[i + 1]) * flow;
      }
    }
  }

  function updateWaterDrops(dt) {
    sweep(pools.water, dt, (p, dt) => {
      if (p._doomed) return false;
      p.vy += gravity.y * 0.62 * dt; // spürbar sanfterer, graziler Fall
      p.vx += gravity.x * 1.3 * dt;
      p.vx *= 0.998;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < 2) { p.x = 2; p.vx *= -0.5; }
      if (p.x > W - 2) { p.x = W - 2; p.vx *= -0.5; }

      const surface = waterHeightAt(p.x);
      if (p.y + p.r >= surface) {
        disturbWater(p.x, Math.min(60, Math.abs(p.vy) * 0.06));
        if (p.bounces < 2 && Math.abs(p.vy) > 90) {
          p.y = surface - p.r;
          p.vy *= -0.32;
          p.vx += (Math.random() - 0.5) * 40;
          p.bounces++;
          return true;
        }
        emitSplash(p.x, surface, Math.min(1, Math.abs(p.vy) / 260));
        return false; // absorbed — kein sichtbarer Teich, nur ein kurzes Aufblitzen
      }
      return p.y < H + 20;
    });
  }

  // Kurzer, feiner Lichtring am Auftreffpunkt statt einer sichtbaren Wasserfläche
  function emitSplash(x, y, strength) {
    spawn(pools.splash, { x, y, life: 0, maxLife: 0.3 + strength * 0.15, r0: 2, r1: 10 + strength * 16 });
    playWaterPlop(strength);
  }
  function updateSplash(dt) {
    sweep(pools.splash, dt, (p, dt) => { p.life += dt; return p.life < p.maxLife; });
  }
  function drawSplash() {
    if (!pools.splash.arr.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of pools.splash.arr) {
      const t = p.life / p.maxLife;
      const r = p.r0 + (p.r1 - p.r0) * t;
      ctx.strokeStyle = `rgba(150,226,235,${(1 - t) * 0.5})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r, r * 0.32, 0, 0, 6.283);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawWater() {
    drawSplash();
    // Kristallklare Tropfen: scharfe Kontur + kleiner Glanzpunkt (wie echtes
    // Glas/Wasser), statt eines diffusen Leuchtflecks. Das feine Glühen
    // drumherum entsteht separat im Bloom-Pass, ohne die Kontur zu verwaschen.
    ctx.save();
    for (const p of pools.water.arr) {
      const r = Math.max(1.1, p.r);
      const scale = r / waterSprite.R;
      const dw = waterSprite.canvas.width * scale, dh = waterSprite.canvas.height * scale;
      ctx.drawImage(waterSprite.canvas, p.x - dw / 2, p.y - dh / 2, dw, dh);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------------
  // STERNE — feines Feuerwerk aus echten, funkelnden Sternpartikeln.
  // Rein reaktiv (Touch + Musik) — kein Ambient-Hintergrund, reiner
  // schwarzer Grund bleibt immer sichtbar.
  // ---------------------------------------------------------------------
  const STAR_PALETTES = [
    [232, 228, 255], // Sternlicht (lavendel-weiß)
    [201, 166, 255], // Violett
    [255, 220, 165], // warmes Gold
    [255, 182, 214], // zartes Rosé
    [180, 210, 255]  // kühles Weißblau
  ];
  function pickPalette() { return STAR_PALETTES[Math.floor(Math.random() * STAR_PALETTES.length)]; }

  // Eine einzelne, feine Feuerwerksgarbe: Partikel fliegen fein und leicht
  // auseinander, unter sanfter Schwerkraft, mit kurzer Leuchtspur und
  // vereinzelten funkelnden "echten" Sternen (Strahlenkranz beim Aufblitzen).
  function emitFirework(x, y, strength = 1) {
    const col = pickPalette();
    const count = Math.round((16 + Math.random() * 10) * strength * settings.firework);
    const speed = (110 + Math.random() * 90) * Math.sqrt(strength);
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const sp = speed * (0.55 + Math.random() * 0.55);
      spawn(pools.sparkle, {
        x, y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: 0,
        maxLife: 1.1 + Math.random() * 0.9,
        size: 1 + Math.random() * 1.3,
        color: col,
        gravityScale: 0.22,
        drag: 0.985,
        hero: Math.random() < 0.22,
        trail: []
      });
    }
    // winziger heller Kernblitz im Zentrum
    spawn(pools.sparkle, {
      x, y, vx: 0, vy: 0, life: 0, maxLife: 0.22, size: 5,
      color: [255, 255, 255], gravityScale: 0, drag: 1, hero: true, flash: true, trail: []
    });
  }

  // Feiner, treibender Glitzerregen — für Touch-Ziehen und leise Musik.
  function emitGlitter(x, y, n) {
    n = Math.round(n * settings.density);
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * 6.283;
      const sp = 6 + Math.random() * 26;
      spawn(pools.sparkle, {
        x: x + (Math.random() - 0.5) * 14,
        y: y + (Math.random() - 0.5) * 14,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 8,
        life: 0,
        maxLife: 0.7 + Math.random() * 0.8,
        size: 0.6 + Math.random() * 0.9,
        color: pickPalette(),
        gravityScale: 0.04,
        drag: 0.99,
        hero: Math.random() < 0.12,
        trail: []
      });
    }
  }

  function updateSparkle(dt) {
    sweep(pools.sparkle, dt, (p, dt) => {
      p.life += dt;
      if (p.life >= p.maxLife) return false;
      if (!p.flash) {
        p.vy += gravity.y * p.gravityScale * dt;
        p.vx += gravity.x * Math.max(p.gravityScale, 0.35) * dt;
        const d = Math.pow(p.drag, dt * 60);
        p.vx *= d; p.vy *= d;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.trail.push(p.x, p.y);
        trimTrail(p.trail, 38, 30); // ~1 cm sichtbare Länge, unabhängig von der Geschwindigkeit
      }
      return true;
    });
  }

  function drawSparkOne(p, alpha) {
    const [r, g, b] = p.color;
    const size = p.size * (p.flash ? (1 - p.life / p.maxLife) * 2 + 0.6 : 1);

    // feine Leuchtspur
    if (p.trail.length >= 4) {
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.45})`;
      ctx.lineWidth = Math.max(0.5, size * 0.55);
      ctx.beginPath();
      ctx.moveTo(p.trail[0], p.trail[1]);
      for (let i = 2; i < p.trail.length; i += 2) ctx.lineTo(p.trail[i], p.trail[i + 1]);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }

    // scharfer Kern statt großem weichem Fleck — vorbereitetes Sprite statt
    // eines live berechneten Verlaufs (gleiche Optik, weniger Rechenaufwand)
    const coreR = size * 1.5;
    const sprite = getSparkSprite(r, g, b);
    const scale = coreR / sprite.CORE;
    const dw = sprite.canvas.width * scale, dh = sprite.canvas.height * scale;
    ctx.globalAlpha = alpha;
    ctx.drawImage(sprite.canvas, p.x - dw / 2, p.y - dh / 2, dw, dh);
    ctx.globalAlpha = 1;

    // "echter" Stern: feiner Strahlenkranz beim Aufblitzen
    if (p.hero) {
      const spike = size * (p.flash ? 9 : 5) * alpha;
      ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.85})`;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(p.x - spike, p.y); ctx.lineTo(p.x + spike, p.y);
      ctx.moveTo(p.x, p.y - spike); ctx.lineTo(p.x, p.y + spike);
      ctx.stroke();
    }
  }

  function drawStars() {
    if (!pools.sparkle.arr.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of pools.sparkle.arr) {
      const t = p.life / p.maxLife;
      const alpha = p.flash ? (1 - t) : Math.pow(1 - t, 1.4);
      drawSparkOne(p, alpha);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------------
  // GALAXIE — echte Orbitalmechanik: Zentralkraft + Tangentialgeschwindigkeit
  // formen eine Spiralgalaxie, die sich unter Touch aufbaut und langsam dreht.
  // ---------------------------------------------------------------------
  const GALAXY_PALETTES = [
    [[255, 255, 255], [143, 184, 255], [201, 166, 255]], // weiß→blau→violett (Kern→Arme)
    [[255, 245, 220], [255, 190, 140], [201, 166, 255]]  // warmer Kern, kühle Arme
  ];
  function emitGalaxy(cx, cy, strength = 1) {
    const pal = GALAXY_PALETTES[Math.floor(Math.random() * GALAXY_PALETTES.length)];
    const arms = 2 + Math.floor(Math.random() * 2);
    const count = Math.round(70 * strength * settings.density);
    const dir = Math.random() < 0.5 ? 1 : -1; // Drehrichtung
    for (let i = 0; i < count; i++) {
      const r = 6 + Math.pow(Math.random(), 0.6) * 130 * Math.sqrt(strength);
      const armOffset = (i % arms) * (6.283 / arms);
      const theta = armOffset + r * 0.045 + (Math.random() - 0.5) * 0.35;
      const x = cx + Math.cos(theta) * r;
      const y = cy + Math.sin(theta) * r;
      // Kreisbahn-Geschwindigkeit senkrecht zum Radius — sorgt für echte Umlaufbahnen
      const orbitSpeed = (70 + 620 / (r + 14)) * dir;
      const col = r < 30 ? pal[0] : (r < 80 ? pal[1] : pal[2]);
      spawn(pools.galaxy, {
        x, y, cx, cy,
        vx: -Math.sin(theta) * orbitSpeed,
        vy: Math.cos(theta) * orbitSpeed,
        life: 0,
        maxLife: 4 + Math.random() * 2.5,
        size: r < 30 ? 1.6 + Math.random() * 0.8 : 0.8 + Math.random() * 0.9,
        color: col,
        trail: []
      });
    }
  }
  function updateGalaxy(dt) {
    sweep(pools.galaxy, dt, (p, dt) => {
      p.life += dt;
      if (p.life >= p.maxLife) return false;
      const dx = p.cx - p.x, dy = p.cy - p.y;
      const d = Math.max(18, Math.hypot(dx, dy));
      // Zentralkraft (abgeschwächtes Gravitationsgesetz) hält die Bahn stabil
      const pull = 5200 / (d * d) * d; // ~ 5200/d, sanft softened
      p.vx += (dx / d) * pull * dt;
      p.vy += (dy / d) * pull * dt;
      p.vx *= 0.999; p.vy *= 0.999;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.trail.push(p.x, p.y);
      trimTrail(p.trail, 38, 24); // ~1 cm sichtbare Länge, unabhängig von der Geschwindigkeit
      return true;
    });
  }
  function drawGalaxy() {
    if (!pools.galaxy.arr.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of pools.galaxy.arr) {
      const t = p.life / p.maxLife;
      const alpha = Math.pow(1 - t, 1.2);
      const [r, g, b] = p.color;
      if (p.trail.length >= 4) {
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.4})`;
        ctx.lineWidth = Math.max(0.4, p.size * 0.5);
        ctx.beginPath();
        ctx.moveTo(p.trail[0], p.trail[1]);
        for (let i = 2; i < p.trail.length; i += 2) ctx.lineTo(p.trail[i], p.trail[i + 1]);
        ctx.stroke();
      }
      const glowR = p.size * 3.2;
      const sprite = getGalaxySprite(r, g, b);
      const scale = glowR / sprite.CORE;
      const dw = sprite.canvas.width * scale, dh = sprite.canvas.height * scale;
      ctx.globalAlpha = alpha;
      ctx.drawImage(sprite.canvas, p.x - dw / 2, p.y - dh / 2, dw, dh);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------------
  // SCHNEE — treibende Flocken mit leichtem Schwerkraft-Einfluss, seitlichem
  // Drift durch Turbulenz + Neigung, unterschiedlich großen (und damit
  // unterschiedlich schnell fallenden) Flocken für echte Tiefenwirkung.
  // ---------------------------------------------------------------------
  function emitSnow(x, y, n) {
    n = Math.round(n * settings.density);
    for (let i = 0; i < n; i++) {
      const hero = Math.random() < 0.12;
      const size = hero ? 2.6 + Math.random() * 1.8 : 0.6 + Math.random() * 1.6;
      spawn(pools.snow, {
        x: x + (Math.random() - 0.5) * 26,
        y: y + (Math.random() - 0.5) * 14,
        vx: (Math.random() - 0.5) * 30,
        vy: 10 + Math.random() * 20,
        life: 0,
        maxLife: 11 + Math.random() * 7,
        size,
        hero,
        angle: Math.random() * 6.283,
        seed: Math.random() * 1000,
        spin: (Math.random() - 0.5) * (hero ? 0.6 : 1.4)
      });
    }
  }
  function updateSnow(dt) {
    sweep(pools.snow, dt, (p, dt) => {
      if (p._doomed) return false;
      p.life += dt;
      if (p.life >= p.maxLife) return false;
      // kleine Flocken fallen langsamer (mehr Luftwiderstand) als große —
      // insgesamt deutlich gedrosselt, damit sie eher schweben als fallen
      const fallScale = 0.045 + p.size * 0.014;
      p.vy += (gravity.y * fallScale - p.vy * 0.6) * dt;
      p.vx += (noise1(p.seed + p.life * 0.9) * 58 + gravity.x * 0.5 - p.vx * 0.5) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.angle += p.spin * dt;
      if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
      return p.y < H + 20;
    });
  }
  function drawSnow() {
    if (!pools.snow.arr.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of pools.snow.arr) {
      // feste Ein-/Ausblendzeit statt Bruchteil der Lebensdauer — bei
      // 5-9s maxLife wäre eine relative Einblendzeit sonst 0.8-1.5s lang
      // spürbar unsichtbar, genau wie zuvor beim Nebel.
      const fadeIn = Math.min(1, p.life / 0.4);
      const fadeOut = Math.min(1, (p.maxLife - p.life) / 0.6);
      const alpha = fadeIn * fadeOut;
      const sprite = p.hero ? snowCrystalSprite : snowSoftSprite;
      const r = p.size * 3.4;
      const scale = r / sprite.CORE;
      const dw = sprite.canvas.width * scale, dh = sprite.canvas.height * scale;
      ctx.globalAlpha = alpha * 0.9;
      if (p.hero) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.drawImage(sprite.canvas, -dw / 2, -dh / 2, dw, dh);
        ctx.restore();
      } else {
        ctx.drawImage(sprite.canvas, p.x - dw / 2, p.y - dh / 2, dw, dh);
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ---------------------------------------------------------------------
  // BLÄTTER — taumelnde Herbstblätter: Drehung + seitliches Flattern
  // zusätzlich zum Fall, wie echtes Laub im Wind.
  // ---------------------------------------------------------------------
  function emitLeaf(x, y, n, gust) {
    n = Math.round(n * settings.density);
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * 6.283;
      const sp = gust ? 60 + Math.random() * 140 : 10 + Math.random() * 20;
      spawn(pools.leaf, {
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 16,
        vx: Math.cos(ang) * sp,
        vy: (gust ? -Math.abs(Math.sin(ang) * sp) - 40 : Math.sin(ang) * sp),
        life: 0,
        maxLife: 4.5 + Math.random() * 3.5,
        size: 0.7 + Math.random() * 0.6,
        color: LEAF_PALETTES[Math.floor(Math.random() * LEAF_PALETTES.length)],
        seed: Math.random() * 1000,
        angle: Math.random() * 6.283,
        spin: (Math.random() - 0.5) * 4.5,
        flutterPhase: Math.random() * 6.283
      });
    }
  }
  function updateLeaf(dt) {
    sweep(pools.leaf, dt, (p, dt) => {
      p.life += dt;
      if (p.life >= p.maxLife) return false;
      p.vy += gravity.y * 0.1 * dt;
      p.vx += (noise1(p.seed + p.life * 0.7) * 70 + gravity.x * 0.6 - p.vx * 0.35) * dt;
      // Flattern: periodisches Taumeln bremst/beschleunigt den Fall leicht,
      // wie ein Blatt, das im Sinkflug immer wieder abkippt
      p.flutterPhase += dt * (2.2 + p.size);
      p.vy *= 0.985;
      const flutter = Math.sin(p.flutterPhase) * 22;
      p.x += (p.vx + flutter) * dt;
      p.y += p.vy * dt;
      p.angle += p.spin * dt * (0.4 + Math.abs(Math.sin(p.flutterPhase)) * 0.8);
      if (p.x < -20) p.x = W + 20; else if (p.x > W + 20) p.x = -20;
      return p.y < H + 24;
    });
  }
  function drawLeaf() {
    if (!pools.leaf.arr.length) return;
    ctx.save();
    for (const p of pools.leaf.arr) {
      const t = p.life / p.maxLife;
      // Einblendzeit fest statt relativ (gleicher Grund wie bei Schnee/Nebel);
      // das kontinuierliche Ausblenden über die Fallzeit bleibt wie gehabt.
      const fadeIn = Math.min(1, p.life / 0.4);
      const alpha = fadeIn * Math.pow(1 - t, 0.7);
      const sprite = getLeafSprite(p.color);
      const scale = (p.size * 13) / sprite.R;
      const dw = sprite.canvas.width * scale, dh = sprite.canvas.height * scale;
      ctx.globalAlpha = alpha;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      // Flattern wirkt auch wie eine Blickwinkeländerung: kurzzeitig schmaler
      const squash = 0.55 + 0.45 * Math.abs(Math.sin(p.flutterPhase));
      ctx.scale(squash, 1);
      ctx.drawImage(sprite.canvas, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ---------------------------------------------------------------------
  // BLASEN — steigen entgegen der Schwerkraft, wackeln seitlich und
  // zerplatzen (statt einfach zu verblassen) oben am Bildschirmrand,
  // bei Berührung oder am Ende ihrer Lebenszeit.
  // ---------------------------------------------------------------------
  function emitBubble(x, y, n) {
    n = Math.round(n * settings.density);
    for (let i = 0; i < n; i++) {
      spawn(pools.bubble, {
        x: x + (Math.random() - 0.5) * 18,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 20,
        vy: -30 - Math.random() * 30,
        life: 0,
        maxLife: 3.5 + Math.random() * 3,
        size: 5 + Math.random() * 12,
        seed: Math.random() * 1000,
        tint: BUBBLE_TINTS[Math.floor(Math.random() * BUBBLE_TINTS.length)],
        tintAngle: Math.random() * 6.283,
        popped: false
      });
    }
  }
  function popBubble(p) {
    p.popped = true;
    p.life = p.maxLife;
    playBubblePop(p.size);
    emitSparklePop(p.x, p.y, p.size);
  }
  function emitSparklePop(x, y, size) {
    const n = 5 + Math.floor(size * 0.3);
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * 6.283;
      const sp = 30 + Math.random() * 60;
      spawn(pools.sparkle, {
        x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        life: 0, maxLife: 0.3 + Math.random() * 0.3, size: 0.6 + Math.random() * 0.6,
        color: COLORS.bubble, gravityScale: 0.15, drag: 0.96, hero: false, trail: []
      });
    }
  }
  function updateBubble(dt) {
    sweep(pools.bubble, dt, (p, dt) => {
      p.life += dt;
      const buoy = 70 + p.size * 2;
      p.vy += (gravity.y * 0.18 - buoy) * dt;
      p.vx += (Math.sin(p.life * 2.2 + p.seed) * 26 + gravity.x * 0.35 - p.vx * 0.4) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      // zerplatzt am Bildschirmrand, bei Fingerkontakt oder spätestens
      // am Ende der Lebenszeit — nie stilles Verblassen. Kurze Schonfrist
      // nach dem Entstehen, sonst zerplatzt eine frisch "gepustete" Blase
      // sofort wieder am eigenen Finger, noch bevor sie wegschwimmen kann.
      if (p.y < H * 0.04) { popBubble(p); return false; }
      if (p.life > 0.3) {
        for (const pt of pointers.values()) {
          const dx = p.x - pt.x, dy = p.y - pt.y;
          if (dx * dx + dy * dy < (p.size + 18) * (p.size + 18)) { popBubble(p); return false; }
        }
      }
      if (p.life >= p.maxLife) { popBubble(p); return false; }
      return true;
    });
  }
  function drawBubble() {
    if (!pools.bubble.arr.length) return;
    ctx.save();
    for (const p of pools.bubble.arr) {
      // feste Einblendzeit statt Bruchteil der Lebensdauer (0.58-1.08s
      // wären bei relativer Berechnung spürbar gewesen)
      const alpha = Math.min(1, p.life / 0.35) * 0.85;
      const r = p.size;
      const scale = r / bubbleSprite.R;
      const dw = bubbleSprite.canvas.width * scale, dh = bubbleSprite.canvas.height * scale;
      ctx.globalAlpha = alpha;
      ctx.drawImage(bubbleSprite.canvas, p.x - dw / 2, p.y - dh / 2, dw, dh);
      // schmaler, farbiger Lichtbrechungsbogen am Rand — gibt der Blase
      // ein dezentes, irisierendes Schillern statt einer reinen Glasoptik
      const [tr, tg, tb] = p.tint;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.tintAngle);
      ctx.strokeStyle = `rgba(${tr},${tg},${tb},${alpha * 0.45})`;
      ctx.lineWidth = Math.max(0.6, r * 0.1);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.86, -0.85, 0.85);
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ---------------------------------------------------------------------
  // SAND — feine Körner in einem konstanten "Wind"-Strömungsfeld, das von
  // der Geräteneigung angetrieben wird; Finger wirken als Hindernis und
  // lenken den Strom sichtbar um (statt ihn nur anzuziehen wie der Wirbel).
  // ---------------------------------------------------------------------
  function emitSand(x, y, n) {
    n = Math.round(n * settings.density);
    for (let i = 0; i < n; i++) {
      spawn(pools.sand, {
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 40,
        vy: (Math.random() - 0.5) * 40,
        life: 0,
        maxLife: 2.5 + Math.random() * 2.5,
        size: 0.5 + Math.random() * 1,
        seed: Math.random() * 1000
      });
    }
  }
  function updateSand(dt) {
    sweep(pools.sand, dt, (p, dt) => {
      p.life += dt;
      if (p.life >= p.maxLife) return false;
      // Grundströmung entlang der Neigung (fällt die Neigung flach aus,
      // bleibt ein sehr sanfter Eigenwind erhalten statt Stillstand)
      const windX = gravity.x * 1.1 + 36;
      const windY = (gravity.y - BASE_G) * 0.6;
      p.vx += (windX + noise1(p.seed + p.life * 3) * 70 - p.vx * 0.9) * dt;
      p.vy += (windY + noise1(p.seed + 500 + p.life * 3) * 50 - p.vy * 0.9) * dt;
      // Finger als umströmtes Hindernis statt Anziehungspunkt
      for (const pt of pointers.values()) {
        const dx = p.x - pt.x, dy = p.y - pt.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 110 * 110 && d2 > 4) {
          const d = Math.sqrt(d2);
          const push = (1 - d / 110) * 340;
          p.vx += (dx / d) * push * dt * 3 - (dy / d) * push * dt * 1.4;
          p.vy += (dy / d) * push * dt * 3 + (dx / d) * push * dt * 1.4;
        }
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10; else if (p.y > H + 10) p.y = -10;
      return true;
    });
  }
  function drawSand() {
    if (!pools.sand.arr.length) return;
    ctx.save();
    for (const p of pools.sand.arr) {
      const t = p.life / p.maxLife;
      const alpha = Math.min(1, t * 6) * Math.min(1, (1 - t) * 4) * 0.85;
      const r = p.size * 3.4;
      const scale = r / sandSprite.CORE;
      const dw = sandSprite.canvas.width * scale, dh = sandSprite.canvas.height * scale;
      ctx.globalAlpha = alpha;
      ctx.drawImage(sandSprite.canvas, p.x - dw / 2, p.y - dh / 2, dw, dh);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  function replenishSand() {
    // hält kontinuierlich eine Grundmenge im Strömungsfeld, statt nur
    // punktuell durch Touch/Ambient-Events nachzuspawnen
    if (!active.sand) return;
    if (pools.sand.arr.length > 260) return;
    for (let i = 0; i < 6; i++) {
      emitSand(Math.random() < 0.5 ? -10 : W + 10, Math.random() * H, 1);
    }
  }

  // ---------------------------------------------------------------------
  // NEBEL — sehr langsame, große, weiche Flecken, die sich normal (nicht
  // additiv) überblenden, damit sie wie echter Dunst wirken statt zu
  // leuchten; Finger teilen den Nebel kurz, statt ihn anzuziehen.
  // ---------------------------------------------------------------------
  function emitFog(x, y, n) {
    n = Math.round(n * settings.density);
    for (let i = 0; i < n; i++) {
      spawn(pools.fog, {
        x: x + (Math.random() - 0.5) * 60,
        y: y + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 6,
        life: 0,
        maxLife: 9 + Math.random() * 6,
        size: 34 + Math.random() * 40,
        seed: Math.random() * 1000
      });
    }
  }
  // Hält — solange der Modus aktiv ist — kontinuierlich eine ruhende
  // Grundschicht im Bild, statt nur bei Touch/Ambient-Events kurz
  // aufzutauchen: so wirkt der Nebel wie eine durchgehende Dunstschicht,
  // die langsam "einzieht", statt wie vereinzelte Wolkenflecken.
  const FOG_TARGET = 30;
  let fogReplenishT = 0;
  let fogTouchT = 0; // drosselt Touch-Erzeugung beim Wischen, s. handlePoint()
  function replenishFog(dt) {
    if (!active.fog) return;
    fogReplenishT -= dt;
    if (fogReplenishT > 0 || pools.fog.arr.length >= FOG_TARGET) return;
    fogReplenishT = 0.3 + Math.random() * 0.25;
    emitFog(Math.random() * W, H * (0.18 + Math.random() * 0.6), 1);
  }
  function updateFog(dt) {
    sweep(pools.fog, dt, (p, dt) => {
      p.life += dt;
      if (p.life >= p.maxLife) return false;
      p.vx += (noise1(p.seed + p.life * 0.3) * 8 + gravity.x * 0.06 - p.vx * 0.3) * dt;
      p.vy += (noise1(p.seed + 300 + p.life * 0.25) * 4 - p.vy * 0.3) * dt;
      for (const pt of pointers.values()) {
        const dx = p.x - pt.x, dy = p.y - pt.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 180 * 180 && d2 > 4) {
          const d = Math.sqrt(d2);
          const push = (1 - d / 180) * 90;
          p.vx += (dx / d) * push * dt;
          p.vy += (dy / d) * push * dt;
        }
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      // Vertikales Wrap-Around wie beim horizontalen: ohne das konnte
      // kräftiges Wischen Nebel weit über den oberen/unteren Rand hinaus
      // schieben — dort blieb er (noch "am Leben", zählt weiter für die
      // Nachfüll-Zielmenge mit), war aber dauerhaft unsichtbar. Sah aus,
      // als würde bestehender Nebel beim Wischen einfach verschwinden.
      if (p.x < -80) p.x = W + 80; else if (p.x > W + 80) p.x = -80;
      if (p.y < -80) p.y = H + 80; else if (p.y > H + 80) p.y = -80;
      return true;
    });
  }
  function drawFog() {
    if (!pools.fog.arr.length) return;
    ctx.save();
    for (const p of pools.fog.arr) {
      // Ein- und Ausblendzeit als feste Zeitspanne statt als Bruchteil der
      // Lebensdauer — bei 9-15s maxLife würde eine relative Einblendzeit
      // (z. B. "erstes Drittel") sonst 3-5 echte Sekunden dauern: neu
      // entstehender Nebel bliebe an einer eben weggeschobenen Stelle viel
      // zu lange unsichtbar und wirkt wie ein dauerhaftes Loch.
      const fadeIn = Math.min(1, p.life / 1.1);
      const fadeOut = Math.min(1, (p.maxLife - p.life) / 2.2);
      const alpha = fadeIn * fadeOut;
      const scale = p.size / fogSprite.CORE;
      const dw = fogSprite.canvas.width * scale, dh = fogSprite.canvas.height * scale;
      ctx.globalAlpha = alpha * 0.55;
      ctx.drawImage(fogSprite.canvas, p.x - dw / 2, p.y - dh / 2, dw, dh);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ---------------------------------------------------------------------
  // BLITZ — fraktale Mittelpunkt-Verschiebung (selbstgeschrieben)
  // ---------------------------------------------------------------------
  function buildBoltPath(x1, y1, x2, y2, disp, depth, out) {
    if (depth <= 0 || disp < 4) { out.push(x2, y2); return; }
    const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * disp;
    const my = (y1 + y2) / 2 + (Math.random() - 0.5) * disp;
    buildBoltPath(x1, y1, mx, my, disp * 0.55, depth - 1, out);
    buildBoltPath(mx, my, x2, y2, disp * 0.55, depth - 1, out);
    if (Math.random() < 0.28 && depth > 1) {
      const bx = mx + (Math.random() - 0.5) * disp * 1.6;
      const by = my + (Math.random() - 0.5) * disp * 1.6;
      const branch = [];
      buildBoltPath(mx, my, bx, by, disp * 0.4, depth - 2, branch);
      spawn(pools.bolt, { pts: [mx, my, ...branch], life: 0, maxLife: 0.22 + Math.random() * 0.1, branch: true });
    }
  }

  function strikeBolt(x1, y1, x2, y2) {
    const pts = [x1, y1];
    buildBoltPath(x1, y1, x2, y2, Math.hypot(x2 - x1, y2 - y1) * 0.28, 6, pts);
    spawn(pools.bolt, { pts, life: 0, maxLife: 0.28 + Math.random() * 0.12, branch: false });
    for (let i = 0; i < 14; i++) {
      const ang = Math.random() * 6.283;
      const speed = 60 + Math.random() * 260;
      spawn(pools.spark, {
        x: x2, y: y2, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
        life: 0, maxLife: 0.4 + Math.random() * 0.3, color: COLORS.bolt
      });
    }
    flash = 1;
    electrifyNearbyWater(x2, y2, 90);
    playThunder();
  }

  // Blitz + Wasser: trifft der Blitz in die Nähe von Wassertropfen, "leitet"
  // das Wasser den Strom weiter — ein knisternder, elektrisierter Funkenregen
  // an jedem betroffenen Tropfen statt eines stummen Übereinanders.
  function electrifyNearbyWater(x, y, radius) {
    if (!active.water || !pools.water.arr.length) return;
    const r2 = radius * radius;
    const electro = [200, 244, 255];
    for (const w of pools.water.arr) {
      const dx = w.x - x, dy = w.y - y;
      if (dx * dx + dy * dy > r2) continue;
      const n = 4 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) {
        const ang = Math.random() * 6.283;
        const speed = 70 + Math.random() * 190;
        spawn(pools.spark, {
          x: w.x, y: w.y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed - 30,
          life: 0, maxLife: 0.25 + Math.random() * 0.25, color: electro
        });
      }
    }
  }

  let flash = 0;
  function updateBolt(dt) {
    sweep(pools.bolt, dt, (b, dt) => { b.life += dt; return b.life < b.maxLife; });
    sweep(pools.spark, dt, (p, dt) => {
      p.life += dt;
      if (p.life >= p.maxLife) return false;
      p.vy += gravity.y * 0.4 * dt;
      p.vx *= 0.96;
      p.x += p.vx * dt; p.y += p.vy * dt;
      return true;
    });
    flash *= Math.max(0, 1 - dt * 6);
  }

  function drawBolt() {
    if (flash > 0.01) {
      ctx.fillStyle = `rgba(201,166,255,${flash * 0.18})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (pools.bolt.arr.length) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const b of pools.bolt.arr) {
        const t = b.life / b.maxLife;
        const a = 1 - t;
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.strokeStyle = `rgba(255,255,255,${a})`;
        ctx.lineWidth = b.branch ? 1.2 : 2.6;
        ctx.beginPath();
        for (let i = 0; i < b.pts.length; i += 2) {
          if (i === 0) ctx.moveTo(b.pts[i], b.pts[i + 1]);
          else ctx.lineTo(b.pts[i], b.pts[i + 1]);
        }
        ctx.stroke();
        ctx.strokeStyle = `rgba(201,166,255,${a * 0.5})`;
        ctx.lineWidth = (b.branch ? 1.2 : 2.6) + 4;
        ctx.stroke();
      }
      ctx.restore();
    }
    if (pools.spark.arr.length) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of pools.spark.arr) {
        const a = 1 - p.life / p.maxLife;
        const [r, g, b] = p.color || COLORS.bolt;
        ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, 6.283);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------
  // Pointer input — spawns particles for every active mode
  // ---------------------------------------------------------------------
  const pointers = new Map();
  let lastTapT = 0, lastTapX = 0, lastTapY = 0;
  // Drosselt Touch-Erzeugung beim Ziehen für Modi mit langlebigen/kleinen
  // Pool-Kapazitäten — ohne das würde zügiges Wischen mehr Partikel pro
  // Sekunde erzeugen, als der Pool fassen kann, und für jeden neuen würde
  // sofort ein alter (auch weit entfernter, "unsichtbar" verdrängter)
  // Partikel gelöscht. Der erste Fingertipp (isNew) bleibt stets sofort.
  let snowTouchT = 0, leafTouchT = 0, bubbleTouchT = 0, sandTouchT = 0;

  function handlePoint(id, x, y, isNew) {
    if (active.fire) { emitFire(x, y, isNew ? 6 : 3); if (isNew) playFireCrackle(); }
    if (active.water) { emitWater(x, y, isNew ? 9 : 4); disturbWater(x, isNew ? 46 : 18); }
    if (active.star) { if (isNew) emitFirework(x, y, 0.7); else emitGlitter(x, y, 2); }
    if (active.bolt && isNew) {
      const fromTop = Math.random() < 0.5;
      const sx = fromTop ? x + (Math.random() - 0.5) * 120 : x;
      const sy = fromTop ? -20 : y - 140 - Math.random() * 80;
      strikeBolt(sx, sy, x, y);
    }
    if (active.galaxy && isNew) emitGalaxy(x, y, 1);
    if (active.snow) {
      if (isNew) emitSnow(x, y, 10);
      else { const now = performance.now(); if (now - snowTouchT > 78) { snowTouchT = now; emitSnow(x, y, 3); } }
    }
    if (active.leaf) {
      if (isNew) emitLeaf(x, y, 7, true);
      else { const now = performance.now(); if (now - leafTouchT > 80) { leafTouchT = now; emitLeaf(x, y, 2, true); } }
    }
    if (active.bubble) {
      if (isNew) emitBubble(x, y, 5);
      else { const now = performance.now(); if (now - bubbleTouchT > 72) { bubbleTouchT = now; emitBubble(x, y, 2); } }
    }
    if (active.sand) {
      if (isNew) emitSand(x, y, 12);
      else { const now = performance.now(); if (now - sandTouchT > 48) { sandTouchT = now; emitSand(x, y, 4); } }
    }
    if (active.fog) {
      // gedrosselt statt bei jedem einzelnen pointermove-Event: sonst
      // sprengt zügiges Wischen den Pool binnen 1 Sekunde, und für jeden
      // neuen Nebel-Fleck verschwindet sofort ein alter (Cap-Verdrängung)
      const now = performance.now();
      if (now - fogTouchT > 115) { fogTouchT = now; emitFog(x, y, isNew ? 2 : 1); }
    }
    if (!active.fire && !active.water && !active.star && !active.bolt && !active.galaxy &&
        !active.snow && !active.leaf && !active.bubble && !active.sand && !active.fog) {
      if (isNew) emitFirework(x, y, 0.5); else emitGlitter(x, y, 1);
    }
  }

  canvas.addEventListener('pointerdown', (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const now = performance.now();
    if (pointers.size === 1) {
      const dtTap = now - lastTapT;
      const dist = Math.hypot(e.clientX - lastTapX, e.clientY - lastTapY);
      if (dtTap < 320 && dist < 46) {
        triggerBlackHole(e.clientX, e.clientY);
        lastTapT = 0;
      } else {
        lastTapT = now; lastTapX = e.clientX; lastTapY = e.clientY;
      }
    }
    handlePoint(e.pointerId, e.clientX, e.clientY, true);
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    const pt = pointers.get(e.pointerId);
    pt.x = e.clientX; pt.y = e.clientY;
    handlePoint(e.pointerId, e.clientX, e.clientY, false);
  });
  function releasePointer(e) { pointers.delete(e.pointerId); }
  canvas.addEventListener('pointerup', releasePointer);
  canvas.addEventListener('pointercancel', releasePointer);

  // ---------------------------------------------------------------------
  // SCHWARZES LOCH — Doppeltipp saugt kurz alles sichtbare ein und
  // stößt es in einem Lichtblitz wieder aus.
  // ---------------------------------------------------------------------
  let blackHole = null;
  function triggerBlackHole(x, y) {
    blackHole = { x, y, t: 0, suckDur: 0.85 };
  }
  function updateBlackHole(dt) {
    if (!blackHole) return;
    blackHole.t += dt;
    if (blackHole.t < blackHole.suckDur) {
      const strength = 1400 * (blackHole.t / blackHole.suckDur);
      const pull = (p) => {
        const dx = blackHole.x - p.x, dy = blackHole.y - p.y;
        const d = Math.max(6, Math.hypot(dx, dy));
        const f = strength / d;
        const nx = dx / d, ny = dy / d;
        p.vx += (nx * f - ny * f * 1.5) * dt;
        p.vy += (ny * f + nx * f * 1.5) * dt;
        if (d < 16) return true;
        return false;
      };
      for (const p of pools.fire.arr) if (pull(p)) p._doomed = true;
      for (const p of pools.water.arr) if (pull(p)) p._doomed = true;
      for (const p of pools.sparkle.arr) if (pull(p)) p.life = p.maxLife;
      for (const p of pools.steam.arr) if (pull(p)) p.life = p.maxLife;
      for (const p of pools.galaxy.arr) if (pull(p)) p.life = p.maxLife;
      for (const p of pools.snow.arr) if (pull(p)) p.life = p.maxLife;
      for (const p of pools.leaf.arr) if (pull(p)) p.life = p.maxLife;
      for (const p of pools.bubble.arr) if (pull(p)) p.life = p.maxLife;
      for (const p of pools.sand.arr) if (pull(p)) p.life = p.maxLife;
      for (const p of pools.fog.arr) if (pull(p)) p.life = p.maxLife;
    } else {
      flash = 1.5;
      emitFirework(blackHole.x, blackHole.y, 2.4);
      emitFirework(blackHole.x, blackHole.y, 1.6);
      blackHole = null;
    }
  }
  function drawBlackHole() {
    if (!blackHole) return;
    const t = blackHole.t / blackHole.suckDur;
    const r = 3 + t * 24;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.arc(blackHole.x, blackHole.y, r, 0, 6.283); ctx.fill();
    ctx.strokeStyle = `rgba(201,166,255,${0.55 + 0.4 * Math.sin(t * 26)})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  // Gravitationswirbel: jeder aktive Finger zieht nahe Partikel sanft an
  // und lässt sie umkreisen — bei mehreren Fingern entstehen mehrere
  // gleichzeitige Wirbel, die sich sichtbar beeinflussen.
  const VORTEX_RADIUS = 160;
  function applyVortex(pool, px, py, dt) {
    const r2 = VORTEX_RADIUS * VORTEX_RADIUS;
    for (const p of pool.arr) {
      const dx = px - p.x, dy = py - p.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2 || d2 < 16) continue;
      const d = Math.sqrt(d2);
      const falloff = 1 - d / VORTEX_RADIUS;
      const pull = 260 * falloff * falloff;
      const nx = dx / d, ny = dy / d;
      // Zug zum Zentrum + tangentiale Komponente fürs Umkreisen
      p.vx += (nx * pull * 0.55 - ny * pull * 1.3) * dt;
      p.vy += (ny * pull * 0.55 + nx * pull * 1.3) * dt;
    }
  }
  function applyVortices(dt) {
    // Erst ab zwei gleichzeitigen Fingern aktiv — bei normalem Ein-Finger-
    // Ziehen soll die Geste klar bleiben (Partikel folgen dem Finger),
    // ohne dauerhaftes Wirbel-Rauschen. Der Wirbel bleibt ein bewusst
    // entdeckter Zwei-Finger-Trick.
    if (pointers.size < 2) return;
    for (const pt of pointers.values()) {
      applyVortex(pools.fire, pt.x, pt.y, dt);
      applyVortex(pools.water, pt.x, pt.y, dt);
      applyVortex(pools.sparkle, pt.x, pt.y, dt);
      applyVortex(pools.snow, pt.x, pt.y, dt);
      applyVortex(pools.leaf, pt.x, pt.y, dt);
      applyVortex(pools.bubble, pt.x, pt.y, dt);
    }
  }

  // ---------------------------------------------------------------------
  // Device tilt -> gravity vector
  // ---------------------------------------------------------------------
  let motionActive = false;
  let lastBeta = null, lastGamma = null;
  let calBeta = null, calGamma = null; // Kalibrierung: Haltung beim ersten Signal wird "neutral"

  function recalibrateTilt() { calBeta = null; calGamma = null; }

  function onOrientation(e) {
    if (e.beta === null && e.gamma === null) return;
    motionActive = true;
    lastBeta = e.beta; lastGamma = e.gamma;
    if (!settings.tilt) { targetGravity.x = 0; targetGravity.y = BASE_G; updateTiltDiag(); return; }
    if (calBeta === null) { calBeta = e.beta || 0; calGamma = e.gamma || 0; }

    let dBeta = (e.beta || 0) - calBeta;
    let dGamma = (e.gamma || 0) - calGamma;
    if (dBeta > 180) dBeta -= 360; else if (dBeta < -180) dBeta += 360;
    dBeta = Math.max(-90, Math.min(90, dBeta));
    dGamma = Math.max(-90, Math.min(90, dGamma));

    targetGravity.x = (dGamma / 90) * 900;
    targetGravity.y = BASE_G + (dBeta / 90) * 520;
  }
  window.addEventListener('deviceorientation', onOrientation);

  async function requestMotionPermission() {
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' &&
          typeof DeviceOrientationEvent.requestPermission === 'function') {
        const result = await DeviceOrientationEvent.requestPermission();
        if (result !== 'granted') {
          showHint('Neigung wurde nicht erlaubt. Aktivierbar in den Website-Einstellungen des Browsers unter „Bewegung & Ausrichtung“.');
          updateTiltDiag();
          return;
        }
      }
      recalibrateTilt();
      // Nach kurzer Wartezeit prüfen, ob überhaupt Sensordaten ankommen —
      // das System liefert grundsätzlich keine, wenn die Seite nicht über HTTPS
      // läuft (z.B. lokal geöffnete Datei statt GitHub-Pages-Adresse).
      setTimeout(() => {
        if (!motionActive) {
          showHint('Neigungssensor liefert keine Daten. Die App muss dafür über HTTPS aufgerufen werden (z. B. die echte GitHub-Pages-Adresse), nicht als lokal geöffnete Datei.');
        }
        updateTiltDiag();
      }, 2500);
    } catch (err) {
      showHint('Neigung wurde nicht erlaubt.');
    }
    updateTiltDiag();
  }

  // ---------------------------------------------------------------------
  // Audio — Mikrofon oder eigene Musik, gemeinsame Analyse
  // ---------------------------------------------------------------------
  let audioCtx = null;
  let analyser = null;
  let freqData = null;
  let micStream = null;
  let micSource = null;
  let musicEl = null;
  let musicSource = null;
  let audioMode = null; // 'mic' | 'music' | null

  let volAvg = 0, bassAvg = 0;
  let lastBurst = 0;

  function ensureAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  // Einmaliges, echtes (aber lautloses) Abspielen beim allerersten
  // Fingertipp — das reine `resume()` allein reicht auf Mobil-Browser nicht
  // immer zuverlässig aus, um die Audio-Pipeline sofort freizugeben. Ohne
  // diesen "Unlock" blieb der erstversuchte Ton oft stumm (erst der
  // zweite Versuch, wenn der Kontext dann längst aktiv war, funktionierte).
  // Danach bleibt die Pipeline dauerhaft freigegeben, auch wenn der erste
  // tatsächliche Ton erst viel später (z. B. nach einem Abstecher in die
  // Einstellungen) ausgelöst wird.
  function unlockAudio() {
    try {
      const ctxA = ensureAudioCtx();
      const buf = ctxA.createBuffer(1, 1, ctxA.sampleRate);
      const src = ctxA.createBufferSource();
      src.buffer = buf;
      src.connect(ctxA.destination);
      src.start(0);
    } catch (e) { /* Audio nicht verfügbar — Soundeffekte bleiben dann einfach stumm */ }
  }

  // ---------------------------------------------------------------------
  // Sound-Effekte — vollständig selbst berechnet aus Oszillatoren und
  // computergeneriertem Rauschen (kein Sample, keine Audiodatei, keine
  // externe Bibliothek). Dadurch rechtlich unbedenklich: es wird nichts
  // von Dritten verwendet, jeder Ton entsteht live aus reiner Mathematik,
  // genau wie die Partikel-Grafik selbst. Optional, Standard: aus.
  // Nutzt denselben AudioContext wie Mikrofon-/Musik-Analyse.
  // ---------------------------------------------------------------------
  let sfxMaster = null;
  let sfxNoiseBuffer = null;
  function ensureSfx() {
    const ctxA = ensureAudioCtx();
    if (!sfxMaster) {
      sfxMaster = ctxA.createGain();
      sfxMaster.connect(ctxA.destination);
    }
    sfxMaster.gain.value = settings.sound; // spiegelt die aktuelle Lautstärke-Einstellung live wider
    if (!sfxNoiseBuffer) {
      const len = Math.round(ctxA.sampleRate * 1.2);
      sfxNoiseBuffer = ctxA.createBuffer(1, len, ctxA.sampleRate);
      const d = sfxNoiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return ctxA;
  }

  // Wasser: kurzes "Plopp" beim Auftreffen eines Tropfens — Sinuston mit
  // schnell fallender Tonhöhe, Lautstärke richtet sich nach Aufprallstärke.
  function playWaterPlop(strength) {
    if (!settings.sound) return;
    const ctxA = ensureSfx();
    const t0 = ctxA.currentTime;
    const osc = ctxA.createOscillator();
    const gain = ctxA.createGain();
    osc.type = 'sine';
    const f0 = 520 + Math.random() * 160;
    osc.frequency.setValueAtTime(f0, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(60, f0 * 0.28), t0 + 0.11);
    const vol = 0.12 + Math.min(1, strength) * 0.16;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
    osc.connect(gain); gain.connect(sfxMaster);
    osc.start(t0); osc.stop(t0 + 0.18);
  }

  // Blase: helles, kurzes "Plopp" beim Zerplatzen — Tonhöhe schnellt
  // erst kurz hoch (typischer "Pop"-Charakter), dann abrupter Abbruch,
  // plus ein winziger hochpassgefilterter Klick für die Transiente.
  // Größere Blasen klingen minimal tiefer und lauter als kleine.
  function playBubblePop(size) {
    if (!settings.sound) return;
    const ctxA = ensureSfx();
    const t0 = ctxA.currentTime;
    const sizeF = Math.max(0, Math.min(1, (size - 5) / 12));
    const f0 = 1500 - sizeF * 500 + Math.random() * 120;
    const osc = ctxA.createOscillator();
    const gain = ctxA.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f0 * 0.6, t0);
    osc.frequency.exponentialRampToValueAtTime(f0, t0 + 0.025);
    osc.frequency.exponentialRampToValueAtTime(Math.max(200, f0 * 0.4), t0 + 0.09);
    const vol = 0.1 + sizeF * 0.08;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);
    osc.connect(gain); gain.connect(sfxMaster);
    osc.start(t0); osc.stop(t0 + 0.12);

    const src = ctxA.createBufferSource();
    src.buffer = sfxNoiseBuffer;
    const hp = ctxA.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 3500;
    const ng = ctxA.createGain();
    ng.gain.setValueAtTime(0.0001, t0);
    ng.gain.exponentialRampToValueAtTime(0.05, t0 + 0.003);
    ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.02);
    src.connect(hp); hp.connect(ng); ng.connect(sfxMaster);
    src.start(t0); src.stop(t0 + 0.03);
  }

  // Feuer: kurzes Knistern bei Berührung — ein paar winzige gefilterte
  // Rauschimpulse dicht hintereinander statt eines glatten Tons.
  function playFireCrackle() {
    if (!settings.sound) return;
    const ctxA = ensureSfx();
    const t0 = ctxA.currentTime;
    const bursts = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < bursts; i++) {
      const t = t0 + Math.random() * 0.09;
      const src = ctxA.createBufferSource();
      src.buffer = sfxNoiseBuffer;
      const bp = ctxA.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1800 + Math.random() * 2200;
      bp.Q.value = 5 + Math.random() * 6;
      const g = ctxA.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.038 + Math.random() * 0.05, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03 + Math.random() * 0.03);
      src.connect(bp); bp.connect(g); g.connect(sfxMaster);
      src.start(t); src.stop(t + 0.08);
    }
  }

  // Blitz: Donnerknall — gefiltertes Rauschen mit langem Ausklang plus
  // ein tiefer Sinus-"Boom" für Wucht. Bewusst gegenüber den anderen drei
  // Klängen abgesenkt: als einziger länger als eine flüchtige Berührung
  // (~0.9s Nachklang) wirkt er sonst bei gleicher Spitzenlautstärke
  // deutlich dominanter als Wasser-Plopp, Blasen-Plopp oder Feuer-Knistern.
  function playThunder() {
    if (!settings.sound) return;
    const ctxA = ensureSfx();
    const t0 = ctxA.currentTime;
    const src = ctxA.createBufferSource();
    src.buffer = sfxNoiseBuffer;
    const lp = ctxA.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2600, t0);
    lp.frequency.exponentialRampToValueAtTime(180, t0 + 0.6);
    const g = ctxA.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.65);
    src.connect(lp); lp.connect(g); g.connect(sfxMaster);
    src.start(t0); src.stop(t0 + 0.7);

    const osc = ctxA.createOscillator();
    const og = ctxA.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, t0);
    osc.frequency.exponentialRampToValueAtTime(38, t0 + 0.4);
    og.gain.setValueAtTime(0.0001, t0);
    og.gain.exponentialRampToValueAtTime(0.16, t0 + 0.02);
    og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45);
    osc.connect(og); og.connect(sfxMaster);
    osc.start(t0); osc.stop(t0 + 0.5);
  }

  function attachAnalyser() {
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.75;
    freqData = new Uint8Array(analyser.frequencyBinCount);
  }

  async function toggleMic() {
    if (audioMode === 'mic') { stopAudio(); return; }
    stopAudio();
    try {
      const ctxA = ensureAudioCtx();
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micSource = ctxA.createMediaStreamSource(micStream);
      attachAnalyser();
      micSource.connect(analyser);
      audioMode = 'mic';
      updateAudioUI();
    } catch (err) {
      showHint('Mikrofonzugriff wurde nicht erlaubt.');
    }
  }

  function ensureMusicEl() {
    if (musicEl) return musicEl;
    musicEl = new Audio();
    musicEl.preload = 'auto';
    const player = document.getElementById('player');
    const fill = document.getElementById('playerProgressFill');
    musicEl.addEventListener('playing', () => { player.classList.remove('loading'); setPlayIcon(true); });
    musicEl.addEventListener('pause', () => setPlayIcon(false));
    musicEl.addEventListener('waiting', () => player.classList.add('loading'));
    musicEl.addEventListener('canplay', () => player.classList.remove('loading'));
    musicEl.addEventListener('timeupdate', () => {
      if (musicEl.duration) fill.style.width = (musicEl.currentTime / musicEl.duration * 100) + '%';
    });
    musicEl.addEventListener('ended', () => setPlayIcon(false));
    musicEl.addEventListener('error', () => {
      player.classList.remove('loading');
      const codes = {
        1: 'Laden wurde abgebrochen.',
        2: 'Netzwerkfehler beim Laden.',
        3: 'Datei ist beschädigt oder das Format wird nicht unterstützt.',
        4: 'Dieses Dateiformat wird von diesem Browser nicht abgespielt.'
      };
      const detail = musicEl.error ? (codes[musicEl.error.code] || `Fehlercode ${musicEl.error.code}`) : '';
      showHint('Diese Datei konnte nicht abgespielt werden.' + (detail ? ' ' + detail : ''));
    });
    return musicEl;
  }

  async function loadMusic(file) {
    stopAudio();
    const ctxA = ensureAudioCtx();
    if (ctxA.state === 'suspended') { try { await ctxA.resume(); } catch (e) {} }
    const el = ensureMusicEl();
    el.pause();
    el.src = URL.createObjectURL(file);
    if (!musicSource) musicSource = ctxA.createMediaElementSource(el);
    attachAnalyser();
    musicSource.connect(analyser);
    analyser.connect(ctxA.destination);
    audioMode = 'music';

    document.getElementById('playerName').textContent = file.name.replace(/\.[^.]+$/, '');
    document.getElementById('playerProgressFill').style.width = '0%';
    const player = document.getElementById('player');
    player.classList.add('show');
    player.classList.add('loading');
    updateAudioUI();

    try {
      await el.play(); // setzt bei Erfolg über das 'playing'-Event automatisch das Pause-Icon
    } catch (err) {
      player.classList.remove('loading');
      setPlayIcon(false);
      showHint('Musik geladen – zum Abspielen auf Play tippen.');
    }
  }

  function stopAudio() {
    if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
    if (micSource) { try { micSource.disconnect(); } catch (e) {} micSource = null; }
    if (analyser) { try { analyser.disconnect(); } catch (e) {} analyser = null; }
    if (audioMode === 'mic') audioMode = null;
    updateAudioUI();
  }

  function analyseAudio(dt) {
    if (!analyser) { volAvg *= 0.9; bassAvg *= 0.9; return; }
    analyser.getByteFrequencyData(freqData);
    let sum = 0, bass = 0;
    const bassBins = Math.floor(freqData.length * 0.12);
    for (let i = 0; i < freqData.length; i++) {
      sum += freqData[i];
      if (i < bassBins) bass += freqData[i];
    }
    const vol = sum / freqData.length / 255;
    const bassLevel = bass / bassBins / 255;
    volAvg = volAvg * 0.85 + vol * 0.15;
    bassAvg = bassAvg * 0.7 + bassLevel * 0.3;

    // continuous ambient emission driven by the music, scaled per active mode
    if (vol > 0.05) {
      if (active.star) emitGlitter(Math.random() * W, H * 0.15 + Math.random() * H * 0.55, Math.round(vol * 3));
      if (active.fire) emitFire(W / 2 + (Math.random() - 0.5) * 200, H * 0.85, Math.round(vol * 4));
      if (active.bubble) emitBubble(Math.random() * W, H * 0.9, Math.round(vol * 2));
      if (active.fog) emitFog(Math.random() * W, H * (0.3 + Math.random() * 0.4), Math.round(vol * 1));
    }

    // beat / peak detection -> burst, wie eine kleine Feuerwerksshow im Takt
    const now = performance.now();
    if (bassLevel > 0.5 && bassLevel > bassAvg * 1.35 && now - lastBurst > 220) {
      lastBurst = now;
      const bx = Math.random() * W, by = H * 0.12 + Math.random() * H * 0.45;
      if (active.bolt) strikeBolt(bx, -20, bx + (Math.random() - 0.5) * 150, by);
      if (active.water) emitWater(Math.random() * W, 0, 18);
      if (active.fire) emitFire(Math.random() * W, H * 0.9, 14);
      if (active.galaxy) { const s = pickAmbientSpot(); emitGalaxy(s.x, s.y, 0.7 + bassLevel * 0.5); }
      if (active.snow) emitSnow(Math.random() * W, -10, 10);
      if (active.leaf) { const s = pickAmbientSpot(); emitLeaf(s.x, 0, 5, true); }
      if (active.sand) emitSand(Math.random() < 0.5 ? -10 : W + 10, Math.random() * H, 14);
      const noOtherMode = !active.fire && !active.water && !active.bolt && !active.galaxy &&
        !active.snow && !active.leaf && !active.bubble && !active.sand && !active.fog;
      if (active.star || noOtherMode) { const s = pickAmbientSpot(); emitFirework(s.x, s.y, 0.6 + bassLevel * 0.8); }
    }
  }

  function setPlayIcon(playing) {
    const path = document.getElementById('playIcon');
    path.setAttribute('d', playing
      ? 'M8 5.5h3v13H8zM13 5.5h3v13h-3z'
      : 'M8 5.5v13l11-6.5-11-6.5z');
  }

  function updateAudioUI() {
    document.getElementById('btn-mic').dataset.active = audioMode === 'mic' ? 'true' : 'false';
  }

  // ---------------------------------------------------------------------
  // UI wiring
  // ---------------------------------------------------------------------
  const modeButtons = ['fire', 'water', 'star', 'bolt', 'galaxy', 'snow', 'leaf', 'bubble', 'sand', 'fog']
    .map(m => document.getElementById('btn-' + m));
  const MODE_NAMES = {
    fire: 'Feuer', water: 'Wasser', star: 'Sterne', bolt: 'Blitz', galaxy: 'Galaxie',
    snow: 'Schnee', leaf: 'Blätter', bubble: 'Blasen', sand: 'Sand', fog: 'Nebel'
  };
  const modeLabel = document.getElementById('modeLabel');

  function updateModeLabel() {
    const on = Object.keys(active).filter(k => active[k]).map(k => MODE_NAMES[k]);
    if (on.length) {
      modeLabel.textContent = on.join(' + ');
      modeLabel.classList.add('show');
    } else {
      modeLabel.classList.remove('show');
    }
  }

  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      active[mode] = !active[mode];
      btn.dataset.active = active[mode] ? 'true' : 'false';
      updateModeLabel();
    });
  });
  updateModeLabel();

  document.getElementById('btn-mic').addEventListener('click', toggleMic);

  const musicInput = document.getElementById('musicInput');
  document.getElementById('btn-music').addEventListener('click', () => musicInput.click());
  musicInput.addEventListener('change', () => {
    if (musicInput.files && musicInput.files[0]) loadMusic(musicInput.files[0]);
  });

  document.getElementById('playPause').addEventListener('click', async () => {
    if (!musicEl) return;
    if (musicEl.paused) {
      try { await musicEl.play(); } catch (e) { showHint('Konnte nicht abgespielt werden.'); }
    } else {
      musicEl.pause();
    }
  });
  document.getElementById('closePlayer').addEventListener('click', () => {
    if (musicEl) { musicEl.pause(); musicEl.src = ''; }
    stopAudio();
    if (audioMode === 'music') audioMode = null;
    document.getElementById('player').classList.remove('show', 'loading');
  });

  let hintTimer = null;
  function showHint(text) {
    const el = document.getElementById('permHint');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(hintTimer);
    // längerer Text braucht mehr Lesezeit als eine kurze Standardmeldung
    const duration = Math.max(3200, Math.min(7000, text.length * 65));
    hintTimer = setTimeout(() => el.classList.remove('show'), duration);
  }

  // Info / legal sheet
  const overlay = document.getElementById('overlay');
  document.getElementById('infoBtn').addEventListener('click', () => overlay.classList.add('show'));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('show'); });
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => overlay.classList.remove('show')));
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.dataset.on = 'false');
      document.querySelectorAll('.pane').forEach(p => p.dataset.on = 'false');
      tab.dataset.on = 'true';
      document.querySelector(`.pane[data-tab="${tab.dataset.tab}"]`).dataset.on = 'true';
    });
  });

  // Start-Bildschirm: direkte Sprungmarken zu Impressum/Datenschutz, ohne
  // die App zu starten — öffnet dasselbe Sheet direkt auf dem Impressum-Tab
  // (der Datenschutz-Abschnitt liegt dort weiter unten in derselben Ansicht).
  document.querySelectorAll('.introLink').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelector('.tab[data-tab="legal"]').click();
      overlay.classList.add('show');
      const targetId = btn.dataset.legalScroll;
      if (targetId && targetId !== 'top') {
        const target = document.getElementById(targetId);
        if (target) target.scrollIntoView({ block: 'start' });
      } else {
        document.getElementById('sheet').scrollTop = 0;
      }
    });
  });

  // Einstellungen — Segmented-Buttons spiegeln + verändern `settings`
  function refreshSettingsUI() {
    document.querySelectorAll('.seg').forEach(seg => {
      const key = seg.dataset.setting;
      seg.querySelectorAll('button').forEach(btn => {
        const val = key === 'bg' ? btn.dataset.value : parseFloat(btn.dataset.value);
        btn.dataset.on = (val === settings[key]) ? 'true' : 'false';
      });
    });
  }
  document.querySelectorAll('.seg').forEach(seg => {
    const key = seg.dataset.setting;
    seg.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        settings[key] = key === 'bg' ? btn.dataset.value : parseFloat(btn.dataset.value);
        if (key === 'bg') buildBackground();
        if (key === 'tilt') updateTiltDiag();
        refreshSettingsUI();
        saveSettings();
      });
    });
  });
  refreshSettingsUI();

  // Neigungssensor-Diagnose — zeigt live, ob und welche Werte ankommen
  function updateTiltDiag() {
    const statusEl = document.getElementById('tiltStatus');
    const valEl = document.getElementById('tiltValues');
    if (!statusEl) return;
    const hasPermAPI = typeof DeviceOrientationEvent !== 'undefined' &&
                        typeof DeviceOrientationEvent.requestPermission === 'function';
    if (!settings.tilt) {
      statusEl.textContent = 'Ausgeschaltet — Partikel fallen geradeaus nach unten, unabhängig von der Haltung des Smartphones.';
    } else if (motionActive) {
      statusEl.textContent = 'Aktiv — Sensordaten kommen an.';
    } else if (hasPermAPI) {
      statusEl.textContent = 'Noch keine Daten. Auf "Neigung aktivieren" tippen und Smartphone dabei bewegen.';
    } else {
      statusEl.textContent = 'Warte auf erstes Signal … (falls das lange so bleibt: Seite über HTTPS öffnen, nicht als lokale Datei)';
    }
    valEl.textContent = (lastBeta === null)
      ? 'beta: –   gamma: –'
      : `roh — beta: ${lastBeta.toFixed(1)}°  gamma: ${lastGamma.toFixed(1)}°   ·   relativ zum Nullpunkt — beta: ${(calBeta === null ? 0 : lastBeta - calBeta).toFixed(1)}°  gamma: ${(calGamma === null ? 0 : lastGamma - calGamma).toFixed(1)}°`;
  }
  document.getElementById('tiltRequestBtn').addEventListener('click', () => requestMotionPermission());
  document.getElementById('tiltCalibrateBtn').addEventListener('click', () => {
    recalibrateTilt();
    showHint('Neu kalibriert — aktuelle Haltung ist jetzt der Nullpunkt.');
  });
  document.querySelector('.tab[data-tab="settings"]').addEventListener('click', updateTiltDiag);
  setInterval(() => {
    if (document.querySelector('.pane[data-tab="settings"]').dataset.on === 'true') updateTiltDiag();
  }, 400);
  updateTiltDiag();

  // Intro / start gesture (also the point where we request sensor + audio-context permissions)
  const intro = document.getElementById('intro');
  document.getElementById('startBtn').addEventListener('click', async () => {
    intro.classList.add('hide');
    unlockAudio();
    await requestMotionPermission();
  }, { once: true });

  // Dock fades slightly when idle so it doesn't distract from the art
  let idleTimer = null;
  let lastInteractionT = performance.now();
  const dock = document.getElementById('dock');
  function resetIdle() {
    dock.classList.remove('faded');
    lastInteractionT = performance.now();
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => dock.classList.add('faded'), 4500);
  }
  ['pointerdown', 'pointermove'].forEach(ev => window.addEventListener(ev, resetIdle));
  resetIdle();

  // ---------------------------------------------------------------------
  // Autonome Idle-Show — berührt niemand den Bildschirm für ein paar
  // Sekunden, beginnt das Universum von selbst zu leben: sanfte, in
  // ihrem Timing zufällige Ausbrüche in den gerade aktiven Modi. Perfekt
  // für eine Party oder als stilles Kunstwerk, ganz ohne Zutun.
  // ---------------------------------------------------------------------
  // Zufällige Position für automatische Ausbrüche (Sterne/Galaxie) — nutzt
  // den ganzen sichtbaren Bereich (nicht nur oben) und vermeidet, dieselbe
  // Bildschirm-Ecke zweimal hintereinander zu treffen, damit es wirklich
  // abwechslungsreich statt "immer von derselben Stelle" wirkt.
  let lastAmbientQuadrant = -1;
  function pickAmbientSpot() {
    let q;
    do { q = Math.floor(Math.random() * 4); } while (q === lastAmbientQuadrant);
    lastAmbientQuadrant = q;
    const qx = q % 2, qy = Math.floor(q / 2);
    const x = W * (0.1 + qx * 0.48 + Math.random() * 0.42);
    const y = H * (0.12 + qy * 0.38 + Math.random() * 0.34);
    return { x, y };
  }

  let nextAutoEventT = 0;
  function autoAmbientEvent() {
    const modesOn = active.fire || active.water || active.star || active.bolt || active.galaxy ||
      active.snow || active.leaf || active.bubble || active.sand || active.fog;
    if (active.fire) emitFire(W * (0.2 + Math.random() * 0.6), H * 0.94, 3 + Math.random() * 3);
    if (active.water) emitWater(W * (0.15 + Math.random() * 0.7), -10, 4 + Math.random() * 4);
    if (active.star) {
      const s = pickAmbientSpot();
      emitFirework(s.x, s.y, 0.45 + Math.random() * 0.35);
    }
    if (active.bolt && Math.random() < 0.45) {
      const bx = W * (0.2 + Math.random() * 0.6);
      strikeBolt(bx, -20, bx + (Math.random() - 0.5) * 160, H * (0.25 + Math.random() * 0.3));
    }
    if (active.galaxy && Math.random() < 0.5) {
      const s = pickAmbientSpot();
      emitGalaxy(s.x, s.y, 0.6);
    }
    if (active.snow) emitSnow(Math.random() * W, -10, 4 + Math.random() * 4);
    if (active.leaf) emitLeaf(Math.random() * W, -10, 2 + Math.random() * 2, false);
    if (active.bubble) emitBubble(W * (0.2 + Math.random() * 0.6), H * 1.02, 2 + Math.random() * 3);
    if (active.fog) emitFog(Math.random() * W, H * (0.25 + Math.random() * 0.5), 1);
    if (!modesOn) { const s = pickAmbientSpot(); emitFirework(s.x, s.y, 0.4); }
  }
  function updateAutoShow(t) {
    if (document.hidden) return;
    const idleFor = (t - lastInteractionT) / 1000;
    if (idleFor < 6) return;
    if (t >= nextAutoEventT) {
      autoAmbientEvent();
      nextAutoEventT = t + 850 + Math.random() * 950;
    }
  }

  // ---------------------------------------------------------------------
  // Intro background mini starfield (lightweight, separate canvas)
  // ---------------------------------------------------------------------
  (function introStars() {
    const c = document.getElementById('introStars');
    const ic = c.getContext('2d');
    let iw, ih, stars = [];
    function build() {
      iw = c.width = window.innerWidth;
      ih = c.height = (window.wzVH ? window.wzVH() : window.innerHeight);
      stars = Array.from({ length: 90 }, () => ({
        x: Math.random() * iw, y: Math.random() * ih,
        r: Math.random() * 1.4 + 0.3, p: Math.random() * 6.283, s: 0.5 + Math.random()
      }));
    }
    build();
    window.addEventListener('resize', build);
    let t0 = performance.now();
    function loop(t) {
      if (intro.classList.contains('hide')) return;
      const dt = (t - t0) / 1000; t0 = t;
      ic.clearRect(0, 0, iw, ih);
      for (const s of stars) {
        s.p += dt * s.s;
        ic.fillStyle = `rgba(232,228,255,${0.3 + 0.5 * Math.abs(Math.sin(s.p))})`;
        ic.beginPath(); ic.arc(s.x, s.y, s.r, 0, 6.283); ic.fill();
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  })();

  // ---------------------------------------------------------------------
  // Main loop
  // ---------------------------------------------------------------------
  let lastT = performance.now();
  let running = true;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) lastT = performance.now(); });

  function frame(t) {
    requestAnimationFrame(frame);
    if (!running) return;
    let dt = (t - lastT) / 1000;
    lastT = t;
    dt = Math.min(dt, 0.05); // clamp for tab-switch hiccups

    // smooth gravity toward tilt target
    gravity.x += (targetGravity.x - gravity.x) * Math.min(1, dt * 4);
    gravity.y += (targetGravity.y - gravity.y) * Math.min(1, dt * 4);

    analyseAudio(dt);
    updateAutoShow(t);
    applyVortices(dt);

    replenishSand();
    replenishFog(dt);

    updateFire(dt);
    updateWaterField(dt);
    updateWaterDrops(dt);
    updateFireWaterInteraction();
    updateFireSnowInteraction();
    updateSplash(dt);
    updateSteam(dt);
    updateSparkle(dt);
    updateGalaxy(dt);
    updateBolt(dt);
    updateSnow(dt);
    updateLeaf(dt);
    updateBubble(dt);
    updateSand(dt);
    updateFog(dt);
    updateBlackHole(dt);

    ctx.fillStyle = bgGradient || '#05070c';
    ctx.fillRect(0, 0, W, H);

    if (active.water || pools.water.arr.length) drawWater();
    if (active.fire || pools.fire.arr.length) drawFire();
    drawSteam();
    drawGalaxy();
    drawStars();
    drawBolt();
    drawSnow();
    drawLeaf();
    drawBubble();
    drawSand();
    drawFog();
    drawBlackHole();
    drawBloom();
  }

  resize();
  requestAnimationFrame(frame);

  // ---------------------------------------------------------------------
  // Service worker (offline / installierbar)
  // ---------------------------------------------------------------------

})();
