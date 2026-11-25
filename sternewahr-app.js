/* SterneWahr – Steuerung, Oberfläche, Sensoren */
(function () {
  'use strict';
  const A = Astro, ST = Stars;
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const clamp = (x, a, b) => x < a ? a : (x > b ? b : x);
  const $ = id => document.getElementById(id);
  const store = {
    get(k, d) { try { const v = localStorage.getItem('zh:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('zh:' + k, JSON.stringify(v)); } catch (e) { /* Speicher nicht verfügbar */ } }
  };
  const MIN_MS = Date.UTC(1000, 0, 1), MAX_MS = Date.UTC(2999, 11, 31);
  const clampMs = ms => clamp(ms, MIN_MS, MAX_MS);

  /* ------------------------------------------------------------- Zustand */
  const st = {
    lat: store.get('lat', 51.3), lon: store.get('lon', 9.5), place: store.get('place', 'Deutschland (Mitte)'),
    ms: Date.now(), live: true, playing: true, dir: 1, speedIdx: 0,
    tz: store.get('tz', 'local'), unit: store.get('unit', 'h'),
    view: { az: 180, alt: 32, fov: 88 }, vel: { az: 0, alt: 0 },
    sensor: { on: false, f: null, u: null, tf: null, tu: null, offset: 0, has: false, absolute: false, warned: false },
    cam: false, red: store.get('red', false), pollution: store.get('pol', 0),
    layers: Object.assign({ constellations: true, conNames: true, starNames: true, milkyway: true, dso: true, sunPath: false, altazGrid: false, eqGrid: false, ecliptic: false, allStars: false }, store.get('layers', {})),
    selected: null, target: null, sheetTab: null, calib: false, cyFrac: 0.5, insets: { top: 100, bottom: 140 }
  };
  const SPEEDS = [
    { l: '1×', v: 1 }, { l: '1 Min/s', v: 60 }, { l: '1 Std/s', v: 3600 }, { l: '1 Tag/s', v: 86400 },
    { l: '1 Mon/s', v: 2629800 }, { l: '1 Jahr/s', v: 31557600 }
  ];
  const UNITS = [{ id: 'm', l: 'Min' }, { id: 'h', l: 'Std' }, { id: 'd', l: 'Tag' }, { id: 'M', l: 'Monat' }, { id: 'y', l: 'Jahr' }];
  const canvas = $('sky');
  const R = Render.create(canvas);
  let dirty = true, lastRender = 0, sky = null, frameInfo = null;

  /* ------------------------------------------------------ Hilfsfunktionen */
  const jdNow = () => A.toJD(st.ms);
  const COMPASS = ['N', 'NNO', 'NO', 'ONO', 'O', 'OSO', 'SO', 'SSO', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const compass = az => COMPASS[Math.round(A.n360(az) / 22.5) % 16];
  const f0 = (x, d) => (Math.abs(x) < 1e-9 ? 0 : x).toFixed(d === undefined ? 0 : d).replace('.', ',').replace('-', '−');
  function dtf(opts) { return new Intl.DateTimeFormat('de-DE', Object.assign(st.tz === 'utc' ? { timeZone: 'UTC' } : {}, opts)); }
  function fmtDateTime(ms) {
    const showSec = st.live;
    try { return dtf({ day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: showSec ? '2-digit' : undefined }).format(ms); }
    catch (e) { return new Date(ms).toISOString(); }
  }
  function zoneName(ms) {
    try { const p = dtf({ timeZoneName: 'short' }).formatToParts(ms).find(x => x.type === 'timeZoneName'); return p ? p.value : ''; } catch (e) { return ''; }
  }
  function dayKey(ms) { return dtf({ year: 'numeric', month: '2-digit', day: '2-digit' }).format(ms); }
  function fmtEvent(jd) { // "19:03", am Folgetag mit Wochentag ("Fr 07:10")
    if (jd === null || jd === undefined) return '—';
    const ms = A.fromJD(jd).getTime();
    let t;
    try { t = dtf({ hour: '2-digit', minute: '2-digit' }).format(ms); } catch (e) { return '—'; }
    if (dayKey(st.ms) === dayKey(ms)) return t;
    if (Math.abs(ms - st.ms) < 2.5 * 86400000) return dtf({ weekday: 'short' }).format(ms).replace('.', '') + ' ' + t;
    return dtf({ day: '2-digit', month: '2-digit', year: 'numeric' }).format(ms) + ' ' + t;
  }
  function toast(msg, ms) {
    const t = $('toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), ms || 3200);
  }
  const invalidate = () => { dirty = true; };
  function updateTimeText() { $('timeTxt').textContent = fmtDateTime(st.ms); $('timeZone').textContent = zoneName(st.ms); }
  function setTime(ms, keepPlaying) {
    st.ms = clampMs(ms); st.live = false; if (!keepPlaying) st.playing = false; updateTimeText();
    updateTransportUI(); invalidate(); scheduleDetails();
  }
  function goLive() { st.live = true; st.playing = true; st.dir = 1; st.speedIdx = 0; updateTransportUI(); invalidate(); scheduleDetails(); }
  function setLocation(lat, lon, name, silent) {
    st.lat = clamp(lat, -89.9, 89.9); st.lon = ((lon + 540) % 360) - 180; st.place = name || (f0(lat, 2) + '°, ' + f0(lon, 2) + '°');
    store.set('lat', st.lat); store.set('lon', st.lon); store.set('place', st.place);
    $('place').textContent = st.place; sunPathCache = null; invalidate(); scheduleDetails();
    if (!silent) {
      toast('Ort: ' + st.place);
      // Eingebettet in AstroWahr: gewählten Ort an die App melden, damit er dort gespeichert wird
      try { if (window.parent !== window) window.parent.postMessage({ type: 'zh-location', lat: st.lat, lon: st.lon, name: name || null, auto: name === 'Mein Standort' }, location.origin); } catch (e) {}
    }
  }

  /* --------------------------------------------------------- Kamerabasis */
  const cross = A.cross, norm = A.norm;
  function basisFromAzAlt(az, alt) { const f = A.altAzToEnu(alt, az), u = A.altAzToEnu(alt + 90, az); return { f, u, r: cross(f, u) }; }
  function rotAz(v, deg) { const c = Math.cos(deg * D2R), s = Math.sin(deg * D2R); return [v[0] * c + v[1] * s, -v[0] * s + v[1] * c, v[2]]; }
  function orthonormal(f, u) {
    f = norm(f); const d = f[0] * u[0] + f[1] * u[1] + f[2] * u[2];
    u = norm([u[0] - d * f[0], u[1] - d * f[1], u[2] - d * f[2]]);
    return { f, u, r: cross(f, u) };
  }
  function getBasis() {
    const s = st.sensor;
    if (s.on && s.f) return orthonormal(rotAz(s.f, s.offset), rotAz(s.u, s.offset));
    return basisFromAzAlt(st.view.az, st.view.alt);
  }
  // Tiefste Blickhöhe beim Ziehen: Der Horizont soll höchstens knapp über der unteren Bedienleiste liegen,
  // damit der Himmel den Bildschirm füllt (Objekte unter dem Horizont bleiben per Suche/Sprung erreichbar).
  function viewFloor(fov) {
    const W = canvas.clientWidth || 390, H = canvas.clientHeight || 844;
    const S = (Math.min(W, H) / 2) / (2 * Math.tan((fov || st.view.fov) * D2R / 4));
    const yT = H - st.insets.bottom - Math.max(40, H * 0.06), cy = H * st.cyFrac;
    return clamp(2 * Math.atan((yT - cy) / (2 * S)) * R2D, -85, 60);
  }
  function limitAlt(cur, next) { return clamp(next, Math.min(viewFloor(), cur), 89); }
  function keepAboveFloor(oldFov) { if (!st.sensor.on && st.view.alt >= viewFloor(oldFov) - 0.5) st.view.alt = Math.max(st.view.alt, viewFloor()); }
  function viewAzAlt(b) { return { az: A.n360(Math.atan2(b.f[0], b.f[1]) * R2D), alt: Math.asin(clamp(b.f[2], -1, 1)) * R2D }; }

  /* ------------------------------------------------------------ Sensoren */
  const Rz = a => [[Math.cos(a), -Math.sin(a), 0], [Math.sin(a), Math.cos(a), 0], [0, 0, 1]];
  const Rx = a => [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]];
  const Ry = a => [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]];
  const mul3 = (a, b) => { const r = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i][j] = a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j]; return r; };
  const mvec = (m, v) => [m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2], m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2], m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]];
  function deviceBasis(alpha, beta, gamma, screenAngle) { // W3C-Konvention: R = Rz(α)·Rx(β)·Ry(γ)
    const M = mul3(Rz(alpha * D2R), mul3(Rx(beta * D2R), Ry(gamma * D2R)));
    const sa = screenAngle * D2R;
    return { M, f: mvec(M, [0, 0, -1]), u: mvec(M, [Math.sin(sa), Math.cos(sa), 0]), top: mvec(M, [0, 1, 0]) };
  }
  /* Ruhige Kompassrichtung: Der Magnetkompass rauscht um mehrere Grad, die Drehsensoren (Gyroskop) sind
     dagegen ruhig, kennen aber Norden nicht. Deshalb trägt das Gyroskop die Bewegung, und der Kompass
     liefert nur den Versatz dazu – stark geglättet, bei großer Abweichung schnell nachgeführt.
     Im Ruhezustand ergibt sich exakt dieselbe Richtung wie zuvor, nur ohne Zittern. */
  function makeYawOffset(){
    var cur = null, fast = 0, last = 0;
    var w = function(d){ return ((d + 540) % 360) - 180; };
    return function(target, now){
      if (cur === null || !(now - last < 1000)) { cur = fast = target; last = now; return cur; }
      var dt = Math.max(0, now - last); last = now;
      // 1. Stufe: Kompassrauschen herausmitteln (ca. 0,25 s)
      fast = (fast + w(target - fast) * (1 - Math.exp(-dt / 250)) + 360) % 360;
      // 2. Stufe: dem beruhigten Wert nachführen – je größer die bleibende Abweichung, desto schneller
      var bias = w(fast - cur), a = Math.abs(bias);
      var tau = a > 20 ? 100 : a > 6 ? 300 : a > 2.5 ? 700 : 2000;
      cur = (cur + bias * (1 - Math.exp(-dt / tau)) + 360) % 360;
      return cur;
    };
  }
  const yawOffset = makeYawOffset();
  function screenAngle() { return (screen.orientation && typeof screen.orientation.angle === 'number') ? screen.orientation.angle : (window.orientation || 0); }
  function onOrient(e) {
    if (!st.sensor.on) return;
    if (e.beta === null || e.beta === undefined) return;
    const iosHeading = typeof e.webkitCompassHeading === 'number' && !isNaN(e.webkitCompassHeading) ? e.webkitCompassHeading : null;
    const isAbs = e.absolute === true || e.type === 'deviceorientationabsolute';
    let alpha = e.alpha || 0;
    // Smartphone: alpha kommt vom Gyroskop (ruhig, aber ohne Nordbezug) – nur wenn es fehlt, wie bisher allein der Kompass
    const gyroYaw = iosHeading !== null && typeof e.alpha === 'number' && !isNaN(e.alpha);
    if (iosHeading !== null && !gyroYaw) alpha = 0;
    else if (iosHeading !== null) { /* alpha bleibt: relative Drehung des Geräts */ }
    else if (!isAbs && !st.sensor.warned) { st.sensor.warned = true; toast('Kein Kompass verfügbar: Richtung durch Ziehen einstellen.', 5000); }
    const b = deviceBasis(alpha, e.beta, e.gamma || 0, screenAngle());
    let f = b.f, u = b.u;
    if (iosHeading !== null) {
      const upright = Math.abs(b.f[2]) < 0.7; // Rückkamera zeigt eher waagerecht
      const ref = upright ? b.f : b.top;
      const h0 = A.n360(Math.atan2(ref[0], ref[1]) * R2D);
      let d = A.n360(iosHeading - h0);
      if (gyroYaw) d = yawOffset(d, performance.now());
      f = rotAz(f, d); u = rotAz(u, d);
    }
    const s = st.sensor;
    s.tf = f; s.tu = u; s.absolute = isAbs || iosHeading !== null;
    if (!s.f) { s.f = f.slice(); s.u = u.slice(); }
    s.has = true;
  }
  let orientListeners = [];
  async function enableSensor() {
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const r = await DeviceOrientationEvent.requestPermission();
        if (r !== 'granted') { toast('Bewegungssensoren wurden nicht erlaubt. Du kannst den Himmel weiterhin durch Ziehen bewegen.', 5000); return false; }
      }
    } catch (err) { toast('Sensoren konnten nicht aktiviert werden.', 4000); return false; }
    if (typeof DeviceOrientationEvent === 'undefined') { toast('Dieses Gerät meldet keine Lagesensoren. Ziehe den Himmel mit dem Finger.', 4500); return false; }
    const s = st.sensor; s.on = true; s.has = false; s.f = null; s.u = null; s.offset = 0; s.warned = false;
    const add = (n) => { window.addEventListener(n, onOrient, true); orientListeners.push(n); };
    if ('ondeviceorientationabsolute' in window) add('deviceorientationabsolute'); else add('deviceorientation');
    setTimeout(() => { if (st.sensor.on && !st.sensor.has) { toast('Noch keine Sensordaten. Bewege das Gerät oder ziehe den Himmel mit dem Finger.', 5000); } }, 2500);
    $('bSensor').setAttribute('aria-pressed', 'true');
    toast('Live-Ausrichtung an: Halte das Gerät zum Himmel.', 3500);
    return true;
  }
  function disableSensor() {
    const s = st.sensor;
    if (s.on && s.f) { const v = viewAzAlt(getBasis()); st.view.az = v.az; st.view.alt = clamp(v.alt, -85, 89); }
    s.on = false; s.f = null; s.u = null; s.has = false;
    orientListeners.forEach(n => window.removeEventListener(n, onOrient, true)); orientListeners = [];
    $('bSensor').setAttribute('aria-pressed', 'false'); endCalib(); invalidate();
  }
  async function toggleSensor() { if (st.sensor.on) disableSensor(); else await enableSensor(); }

  async function toggleCamera() {
    if (st.cam) { stopCamera(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      const v = $('cam'); v.srcObject = stream; await v.play().catch(() => { });
      st.cam = true; document.body.classList.add('ar'); $('bCam').setAttribute('aria-pressed', 'true');
      if (st.view.fov > 70) st.view.fov = 52;
      toast('Kamerabild an (bleibt nur auf deinem Gerät). Mit zwei Fingern zoomen, bis es passt.', 4500);
      invalidate();
    } catch (e) { toast('Kamera nicht verfügbar oder nicht erlaubt.', 4000); }
  }
  function stopCamera() {
    const v = $('cam'); if (v.srcObject) { v.srcObject.getTracks().forEach(t => t.stop()); v.srcObject = null; }
    st.cam = false; document.body.classList.remove('ar'); $('bCam').setAttribute('aria-pressed', 'false'); invalidate();
  }

  /* -------------------------------------- Objekte: Position und Beschreibung */
  const PNAME = { mercury: 'Merkur', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptun' };
  const CONNAME = {}; ST.constellations.forEach(c => { CONNAME[c.id] = c.de; }); Object.assign(CONNAME, ST.CON_NAMES, { CVn: 'Jagdhunde', Cnc: 'Krebs' });
  function objEnu(o) {
    if (!o || !sky) return null;
    if (o.kind === 'sun') return sky.sun.enu;
    if (o.kind === 'moon') return sky.moon.enu;
    if (o.kind === 'planet') return sky.planets[o.ref].enu;
    if (o.kind === 'star' || o.kind === 'dso') {
      const s = o.kind === 'star' ? ST.stars[o.ref] : ST.dso[o.ref];
      const rd = A.starRaDec(s.ra, s.dec, sky.jd);
      return R.applyRefraction(A.eqToEnu(A.vec(rd.ra, rd.dec), sky.lst, sky.lat));
    }
    if (o.kind === 'con') { const c = ST.constellations[o.ref]; return conCenterEnu(c); }
    if (o.kind === 'point') { const rd = A.starRaDec(o.ra, o.dec, sky.jd); return R.applyRefraction(A.eqToEnu(A.vec(rd.ra, rd.dec), sky.lst, sky.lat)); }
    return null;
  }
  function conCenterEnu(c) {
    const pts = new Set(); c.lines.forEach(l => { pts.add(l[0]); pts.add(l[1]); });
    let x = 0, y = 0, z = 0; pts.forEach(s => { const v = A.vec(s.ra, s.dec); x += v[0]; y += v[1]; z += v[2]; });
    const rd = A.toRaDec([x, y, z]); const q = A.starRaDec(rd.ra, rd.dec, sky.jd);
    return A.eqToEnu(A.vec(q.ra, q.dec), sky.lst, sky.lat);
  }
  function objFn(o) { // Funktion t -> {ra,dec} für Auf-/Untergangsberechnung
    if (o.kind === 'sun') return 'sun';
    if (o.kind === 'moon') return 'moon';
    if (o.kind === 'planet') return A.PLANETS[o.ref];
    if (o.kind === 'point') return t => A.starRaDec(o.ra, o.dec, t);
    const s = o.kind === 'star' ? ST.stars[o.ref] : ST.dso[o.ref];
    return t => A.starRaDec(s.ra, s.dec, t);
  }
  function objName(o) {
    if (o.kind === 'sun') return 'Sonne'; if (o.kind === 'moon') return 'Mond';
    if (o.kind === 'planet') return PNAME[A.PLANETS[o.ref]];
    if (o.kind === 'star') return ST.stars[o.ref].name; if (o.kind === 'dso') return ST.dso[o.ref].name;
    if (o.kind === 'con') return ST.constellations[o.ref].de;
    if (o.kind === 'point') return o.name;
    return '';
  }

  /* ------------------------------------------------- Geschichtliche Anker */
  const ANCHORS = [
    [-3000, 'den ersten Hochkulturen am Nil'], [-1350, 'Echnaton und Nofretete'], [-800, 'der Gründung Roms'],
    [-500, 'Buddha und Konfuzius'], [-440, 'Perikles und dem klassischen Athen'], [-44, 'Cäsars Tod'],
    [30, 'Beginn unserer Zeitrechnung'], [79, 'dem Vesuvausbruch über Pompeji'], [622, 'dem Beginn des islamischen Kalenders'],
    [800, 'der Kaiserkrönung Karls des Großen'], [1088, 'der Gründung der ersten Universität in Bologna'],
    [1215, 'der Magna Carta'], [1347, 'der Pest in Europa'], [1450, 'Gutenbergs Buchdruck'],
    [1492, 'Kolumbus’ Ankunft in Amerika'], [1543, 'Kopernikus’ Weltbild mit der Sonne im Zentrum'],
    [1610, 'Galileis Entdeckung der Jupitermonde'], [1687, 'Newtons Principia'], [1789, 'der Französischen Revolution'],
    [1859, 'Darwins Evolutionstheorie'], [1876, 'der Erfindung des Telefons'], [1903, 'dem ersten Motorflug'],
    [1928, 'der Entdeckung des Penicillins'], [1945, 'dem Ende des Zweiten Weltkriegs'], [1957, 'dem Start von Sputnik'],
    [1969, 'der Mondlandung'], [1989, 'dem Fall der Berliner Mauer'], [1991, 'der Erfindung des World Wide Web'],
    [2012, 'der Landung des Rovers Curiosity auf dem Mars']
  ];
  function nearestAnchor(year) {
    let best = ANCHORS[0], bd = Infinity;
    for (const a of ANCHORS) { const d = Math.abs(a[0] - year); if (d < bd) { bd = d; best = a; } }
    return best;
  }
  function fmtYear(y) { const r = Math.round(y); return r < 0 ? (-r) + ' v. Chr.' : String(r); }
  function lightTravelText(ly) {
    const nowYear = new Date(st.ms).getUTCFullYear() + (A.toJD(st.ms) - Math.floor(A.toJD(st.ms))); // grob
    const startYear = nowYear - ly;
    if (ly < 20) return 'Das Licht ist vor rund ' + f0(ly, ly < 3 ? 1 : 0) + ' Jahren aufgebrochen – wahrscheinlich innerhalb deines Lebens.';
    if (ly >= 1000000) return 'Das Licht ist vor ' + f0(ly / 1e6, 1) + ' Millionen Jahren aufgebrochen – lange bevor es überhaupt Menschen gab.';
    if (ly >= 100000) return 'Das Licht ist vor etwa ' + f0(ly / 1000, 0) + '.000 Jahren aufgebrochen, lange bevor es Menschen wie uns gab.';
    const a = nearestAnchor(startYear);
    return 'Das Licht ist vor rund ' + f0(ly, 0) + ' Jahren aufgebrochen, etwa zur Zeit von ' + a[1] + ' (um ' + fmtYear(a[0]) + ').';
  }
  function bvWord(bv) { return bv < -0.05 ? 'bläulich-weiß' : bv < 0.3 ? 'weiß' : bv < 0.6 ? 'gelblich-weiß' : bv < 0.9 ? 'gelb' : bv < 1.3 ? 'orange' : 'rötlich'; }
  function altText(alt) { return f0(alt, 1) + '°' + (alt < 0 ? ' (unter dem Horizont)' : ''); }

  let details = { key: '', rows: null };
  let detailTimer = null;
  function scheduleDetails() { clearTimeout(detailTimer); details.key = ''; detailTimer = setTimeout(() => { computeDetails(); if (st.sheetTab === 'ueber') renderSheet(); }, 260); }
  function eventsFor(o) {
    const jd = jdNow(), fn = objFn(o);
    const rise = A.riseSet(fn, jd, st.lat, st.lon, 'rise', 1), set = A.riseSet(fn, jd, st.lat, st.lon, 'set', 1);
    const cul = A.culmination(fn, jd, st.lat, st.lon);
    return { rise, set, cul };
  }
  function computeDetails() {
    if (!st.selected || !sky) { details = { key: '', rows: null }; return; }
    const o = st.selected;
    if (o.kind === 'con') { details = { key: 'c', ev: null }; updateCard(); return; }
    const key = o.kind + (o.ref !== undefined ? o.ref : (o.id || '')) + '|' + Math.round(st.ms / 60000) + '|' + st.lat.toFixed(2) + st.lon.toFixed(2);
    if (details.key === key) return;
    details = { key, ev: eventsFor(o) }; updateCard();
  }

  let meteorTimer = null;
  function stopMeteorShow() { clearInterval(meteorTimer); meteorTimer = null; }
  function startMeteorShow(o) {
    stopMeteorShow();
    const fire = () => { const e = objEnu(o); if (e) R.spawnMeteor(e); invalidate(); };
    fire(); meteorTimer = setInterval(fire, 900 + Math.random() * 700);
  }
  function selectObject(o, opts) {
    stopMeteorShow();
    st.selected = o; st.target = null; details = { key: '', rows: null };
    if (!o) { $('card').hidden = true; measureInsets(); return; }
    if (o.kind === 'point' && o.meteor) startMeteorShow(o);
    computeDetails(); updateCard(); $('card').hidden = false; measureInsets();
    if (opts && opts.goto) gotoObject(o, opts.fov);
    invalidate();
  }
  function gotoObject(o, fov) {
    const e = objEnu(o); if (!e) return;
    const tgt = A.enuToAltAz(e);
    if (st.sensor.on) { st.target = o; toast('Richte das Gerät auf das Ziel – der Pfeil zeigt die Richtung.', 3000); invalidate(); return; }
    animateView(tgt.az, clamp(tgt.alt, -80, 85), fov || null);
  }
  let anim = null;
  function animateView(az, alt, fov) {
    const from = { az: st.view.az, alt: st.view.alt, fov: st.view.fov };
    let da = ((az - from.az + 540) % 360) - 180;
    anim = { t0: performance.now(), dur: 650, from, da, alt, fov: fov || from.fov };
  }

  function updateCard() {
    const o = st.selected; if (!o || !sky) return;
    $('cardTitle').textContent = objName(o);
    const rows = []; let sub = '';
    const row = (k, v, cls) => rows.push([k, v, cls]);
    const e = objEnu(o), aa = e ? A.enuToAltAz(e) : null;
    const ev = details.ev;
    if (o.kind === 'sun') {
      sub = 'Stern · unser Tagesgestirn';
      row('Höhe', altText(sky.sun.trueAlt)); row('Richtung', compass(sky.sun.az) + ' ' + f0(sky.sun.az) + '°');
      const ecl = R.solarEclipse(sky);
      if (ecl.obsc > 0.001) row('Finsternis', ecl.total ? 'total (Korona sichtbar)' : (ecl.annular ? 'ringförmig ' : 'partiell ') + f0(ecl.obsc * 100) + ' % verdeckt', 'warn');
      if (ecl.obsc > 0.001) row('Wichtig', 'Niemals ohne zertifizierte Sonnenfinsternis-Brille in die Sonne sehen!', 'warn');
      row('Entfernung', f0(sky.sun.dist * 149.5978707, 1) + ' Mio. km');
    } else if (o.kind === 'moon') {
      const m = sky.moon, age = m.phase / 360 * 29.530588;
      sub = A.moonPhaseName(m.phase) + ' · ' + f0(m.illum * 100) + ' % beleuchtet';
      row('Höhe', altText(m.trueAlt)); row('Richtung', compass(m.az) + ' ' + f0(m.az) + '°');
      row('Alter', f0(age, 1) + ' Tage'); row('Entfernung', f0(m.dist / 1000, 0).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '000 km'.replace('000 km', ' km').replace(/^/, ''), '');
      rows[rows.length - 1][1] = f0(Math.round(m.dist), 0).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' km';
      const le = R.lunarEclipse(sky), se = R.solarEclipse(sky);
      if (se.obsc > 0.001) row('Finsternis', 'Sonnenfinsternis, ' + f0(se.obsc * 100) + ' % der Sonne verdeckt', 'warn');
      else if (le.umbral > 0 && m.illum > 0.9) row('Finsternis', le.umbral >= 1 ? 'totale Mondfinsternis (Größe ' + f0(le.umbral, 2) + ')' : 'partielle Mondfinsternis (Größe ' + f0(le.umbral, 2) + ')', 'warn');
      else if (le.penumbral > 0.05 && m.illum > 0.9) row('Finsternis', 'Halbschattenfinsternis', 'warn');
    } else if (o.kind === 'planet') {
      const p = sky.planets[o.ref];
      sub = 'Planet · ' + (p.dist < 1.5 && p.helioDist < 1 ? 'innerer Planet' : (['mercury', 'venus'].includes(p.name) ? 'innerer Planet' : 'äußerer Planet'));
      row('Helligkeit', f0(p.mag, 1) + ' mag'); row('Höhe', altText(p.trueAlt)); row('Richtung', compass(p.az) + ' ' + f0(p.az) + '°');
      row('Abstand zur Sonne', f0(p.elong) + '° am Himmel'); row('Entfernung', f0(p.dist, 2) + ' AE · ' + f0(p.dist * 8.3167, 1) + ' Lichtminuten'); row('Beleuchtet', f0(p.illum * 100) + ' %');
      if (p.name === 'saturn') row('Ringe', 'Neigung ' + f0(Math.abs(p.ringB), 1) + '°');
      const y = A.fromJD(sky.jd).getUTCFullYear(); if (y < 1800 || y > 2050) row('Hinweis', 'Bahnnäherung außerhalb 1800–2050 ungenauer', 'warn');
    } else if (o.kind === 'star') {
      const s = ST.stars[o.ref];
      sub = 'Stern · ' + (CONNAME[s.con] || s.con) + ' · ' + bvWord(s.bv);
      row('Helligkeit', f0(s.mag, 2) + ' mag'); row('Höhe', altText(aa.alt)); row('Richtung', compass(aa.az) + ' ' + f0(aa.az) + '°');
      row('Rektaszension', f0(s.ra / 15, 2) + ' h'); row('Deklination', f0(s.dec, 1) + '°');
      if (s.ly) { row('Entfernung', f0(s.ly, s.ly < 100 ? 1 : 0) + ' Lichtjahre'); row('Du siehst die Vergangenheit', lightTravelText(s.ly)); }
    } else if (o.kind === 'dso') {
      const d = ST.dso[o.ref];
      const T = { gal: 'Galaxie', neb: 'Nebel', oc: 'Offener Sternhaufen', gc: 'Kugelsternhaufen' }[d.type];
      sub = T + ' · ' + f0(d.mag, 1) + ' mag';
      row('Höhe', altText(aa.alt)); row('Richtung', compass(aa.az) + ' ' + f0(aa.az) + '°'); row('Ausdehnung', f0(d.size) + ' Bogenminuten');
      if (d.ly) { row('Entfernung', d.ly >= 1e6 ? f0(d.ly / 1e6, 1) + ' Millionen Lichtjahre' : f0(d.ly, 0) + ' Lichtjahre'); row('Du siehst die Vergangenheit', lightTravelText(d.ly)); }
    } else if (o.kind === 'point') {
      sub = o.sub || 'Punkt am Himmel';
      row('Höhe', altText(aa.alt)); row('Richtung', compass(aa.az) + ' ' + f0(aa.az) + '°');
      if (o.extra) o.extra.forEach(x => row(x[0], x[1]));
    } else if (o.kind === 'con') {
      sub = 'Sternbild'; const en = objEnu(o), a2 = A.enuToAltAz(en);
      row('Mitte', 'Höhe ' + f0(a2.alt) + '°, ' + compass(a2.az) + ' ' + f0(a2.az) + '°');
    }
    if (ev) {
      const cnt = ev.rise === null && ev.set === null;
      if (o.kind !== 'con') {
        if (cnt) row('Auf-/Untergang', (aa ? aa.alt : 0) > 0 ? 'geht nicht unter' : 'geht nicht auf');
        else { row('Aufgang', fmtEvent(ev.rise)); row('Untergang', fmtEvent(ev.set)); }
        if (ev.cul) row('Höchststand', f0(ev.cul.alt, 0) + '° um ' + fmtEvent(ev.cul.jd));
      }
    }
    $('cardSub').textContent = sub;
    $('cardRows').innerHTML = rows.map(r => `<div class="kv${String(r[1]).length > 22 ? ' wide' : ''}"><dt>${r[0]}</dt><dd class="${r[2] || ''}">${r[1]}</dd></div>`).join('');
  }

  /* --------------------------------------------------------------- Suche */
  let searchIndex = null;
  function buildIndex() {
    const list = [{ n: 'Sonne', kind: 'sun', t: 'Stern' }, { n: 'Mond', kind: 'moon', t: 'Mond' }];
    A.PLANETS.forEach((p, i) => list.push({ n: PNAME[p], kind: 'planet', ref: i, t: 'Planet' }));
    ST.stars.forEach((s, i) => { if (!/^[α-ω0-9]/.test(s.name) || s.mag < 3.2) list.push({ n: s.name, kind: 'star', ref: i, t: 'Stern · ' + (CONNAME[s.con] || s.con) }); });
    ST.dso.forEach((d, i) => list.push({ n: d.name, kind: 'dso', ref: i, t: 'Tief-Himmel-Objekt' }));
    ST.constellations.forEach((c, i) => list.push({ n: c.de, kind: 'con', ref: i, t: 'Sternbild' }));
    const alias = { 'Wega': 'Vega', 'Atair': 'Altair', 'Arktur': 'Arcturus', 'Kapella': 'Capella', 'Beteigeuze': 'Betelgeuse', 'Prokyon': 'Procyon', 'Kastor': 'Castor', 'Polarstern': 'Polaris Nordstern', 'Alkyone': 'Alcyone', 'Elektra': 'Electra' };
    list.forEach(x => { x.key = (x.n + ' ' + (alias[x.n] || '')).toLowerCase(); });
    return list;
  }
  function openSearch() { $('searchWrap').hidden = false; searchIndex = searchIndex || buildIndex(); $('searchIn').value = ''; renderSearch(''); setTimeout(() => $('searchIn').focus(), 50); }
  function closeSearch() { $('searchWrap').hidden = true; $('searchIn').blur(); }
  function renderSearch(q) {
    q = q.trim().toLowerCase();
    let items;
    if (!q) items = searchIndex.filter(x => ['sun', 'moon', 'planet'].includes(x.kind)).concat(['Polarstern', 'Sirius', 'Wega', 'Orion', 'Plejaden (M45)', 'Andromeda-Galaxie (M31)'].map(n => searchIndex.find(x => x.n === n)).filter(Boolean));
    else items = searchIndex.filter(x => x.key.includes(q)).sort((a, b) => (a.key.startsWith(q) ? 0 : 1) - (b.key.startsWith(q) ? 0 : 1)).slice(0, 12);
    if (!items.length) { $('searchRes').innerHTML = '<li style="cursor:default"><span>Nichts gefunden</span></li>'; return; }
    $('searchRes').innerHTML = items.map((x, i) => `<li data-i="${searchIndex.indexOf(x)}"><span>${x.n}</span><small>${x.t}</small></li>`).join('');
  }

  /* ---------------------------------------------------- Sonnenbahn (Tag) */
  let sunPathCache = null;
  function getSunPath() {
    const d = new Date(st.ms); if (st.tz === 'utc') d.setUTCHours(0, 0, 0, 0); else d.setHours(0, 0, 0, 0);
    const key = d.getTime() + '|' + st.lat.toFixed(2) + '|' + st.lon.toFixed(2) + '|' + st.tz;
    if (sunPathCache && sunPathCache.key === key) return sunPathCache;
    const pts = [], hours = [];
    for (let m = 0; m <= 24 * 60; m += 10) {
      const ms = d.getTime() + m * 60000, jd = A.toJD(ms), s = A.sun(jd), ls = A.lst(jd, st.lon);
      const e = A.eqToEnu(s.v, ls, st.lat), alt = A.enuToAltAz(e).alt;
      const ee = R.applyRefraction(e);
      pts.push(alt > -1 ? ee : null);
      if (m % 60 === 0 && alt > -1) hours.push({ e: ee, label: String((m / 60) % 24).padStart(2, '0') });
    }
    // Stundenbeschriftung in der angezeigten Zeitzone: bei Gerätezeit entspricht m dem lokalen Tagesbeginn
    sunPathCache = { key, pts: pts.map(e => ({ e })), hours };
    return sunPathCache;
  }

  /* ---------------------------------------------------------- Frame-Schleife */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(120, now - last); last = now;
    try {
      let animating = false;
      if (flight) stepFlight(now);
      if (st.live) st.ms = Date.now();
      else if (st.playing) { const sp = st.dir * SPEEDS[st.speedIdx].v; if (sp) { st.ms = clampMs(st.ms + dt * sp); animating = true; } }
      // Ansichtsanimation
      if (anim) {
        const t = clamp((now - anim.t0) / anim.dur, 0, 1), k = t * t * (3 - 2 * t);
        st.view.az = A.n360(anim.from.az + anim.da * k); st.view.alt = anim.from.alt + (anim.alt - anim.from.alt) * k;
        st.view.fov = anim.from.fov * Math.pow(anim.fov / anim.from.fov, k);
        if (t >= 1) anim = null; animating = true;
      }
      // Trägheit
      if (!dragging && (Math.abs(st.vel.az) > 0.005 || Math.abs(st.vel.alt) > 0.005) && !st.sensor.on) {
        st.view.az = A.n360(st.view.az + st.vel.az * dt); st.view.alt = limitAlt(st.view.alt, st.view.alt + st.vel.alt * dt);
        const dec = Math.exp(-dt / 320); st.vel.az *= dec; st.vel.alt *= dec; animating = true;
      }
      // Sensor glätten
      const s = st.sensor;
      if (s.on && s.tf && s.f) {
        const k = 1 - Math.exp(-dt / 60);
        s.f = norm([s.f[0] + (s.tf[0] - s.f[0]) * k, s.f[1] + (s.tf[1] - s.f[1]) * k, s.f[2] + (s.tf[2] - s.f[2]) * k]);
        s.u = norm([s.u[0] + (s.tu[0] - s.u[0]) * k, s.u[1] + (s.tu[1] - s.u[1]) * k, s.u[2] + (s.tu[2] - s.u[2]) * k]);
        animating = true;
      }
      const cyT = clamp((st.insets.top + (canvas.clientHeight - st.insets.bottom)) / 2 / Math.max(canvas.clientHeight, 1), 0.3, 0.55);
      if (Math.abs(st.cyFrac - cyT) > 0.002) { st.cyFrac += (cyT - st.cyFrac) * (1 - Math.exp(-dt / 120)); animating = true; } else st.cyFrac = cyT;
      const need = dirty || animating || st.selected || st.cam || (now - lastRender > 150);
      if (need) {
        lastRender = now; dirty = false;
        sky = A.skyState(jdNow(), st.lat, st.lon, 0);
        const basis = getBasis();
        const selE = st.selected ? objEnu(st.selected) : null;
        const tgtE = st.target ? objEnu(st.target) : null;
        frameInfo = R.draw({
          sky, basis, fov: st.view.fov, layers: st.layers, red: st.red, ar: st.cam, pollution: st.pollution,
          selected: st.selected && selE ? { enu: selE, r: 8 } : null, target: tgtE ? { enu: tgtE } : null,
          sunPath: st.layers.sunPath ? getSunPath() : null, nowMs: now, cyFrac: st.cyFrac, insets: st.insets
        });
        if (st.calib) drawCrosshair();
        updateHud(basis);
        if (now - (frame.lastUi || 0) > 400) { frame.lastUi = now; $('timeTxt').textContent = fmtDateTime(st.ms); $('timeZone').textContent = zoneName(st.ms); if (st.selected) { if (!details.key || !details.ev) computeDetails(); updateCard(); } }
      }
    } catch (err) { if (!frame.errShown) { frame.errShown = true; console.error(err); toast('Darstellungsfehler: ' + err.message, 6000); } }
    requestAnimationFrame(frame);
  }
  function updateHud(b) {
    const v = viewAzAlt(b);
    const txt = compass(v.az) + ' ' + f0(v.az) + '° · ' + f0(v.alt) + '°' + (st.sensor.on ? ' · Sensor' : '');
    if ($('hudTxt').textContent !== txt) $('hudTxt').textContent = txt;
  }
  function drawCrosshair() {
    const c = canvas.getContext('2d'), W = canvas.clientWidth, H = canvas.clientHeight;
    c.setTransform(R.state.dpr, 0, 0, R.state.dpr, 0, 0);
    c.strokeStyle = 'rgba(255,216,154,0.95)'; c.lineWidth = 1.5;
    c.beginPath(); c.arc(W / 2, H / 2, 18, 0, Math.PI * 2); c.moveTo(W / 2 - 30, H / 2); c.lineTo(W / 2 - 8, H / 2); c.moveTo(W / 2 + 8, H / 2); c.lineTo(W / 2 + 30, H / 2); c.moveTo(W / 2, H / 2 - 30); c.lineTo(W / 2, H / 2 - 8); c.moveTo(W / 2, H / 2 + 8); c.lineTo(W / 2, H / 2 + 30); c.stroke();
  }

  /* ------------------------------------------------------- Kalibrieren */
  function startCalib() {
    if (!st.sensor.on) { toast('Zuerst die Live-Ausrichtung einschalten.', 3000); return; }
    // Ziel wählen: Sonne > Mond > hellster sichtbarer Planet/Stern
    let o = null;
    if (sky.sun.trueAlt > 4) o = { kind: 'sun' };
    else if (sky.moon.trueAlt > 4) o = { kind: 'moon' };
    else { let best = 99; sky.planets.forEach((p, i) => { if (p.trueAlt > 8 && p.mag < best && p.mag < 2) { best = p.mag; o = { kind: 'planet', ref: i }; } }); }
    if (!o) { let best = 99; ST.stars.forEach((s, i) => { const e = objEnu({ kind: 'star', ref: i }); if (e && e[2] > 0.17 && s.mag < best) { best = s.mag; o = { kind: 'star', ref: i }; } }); }
    if (!o) { toast('Kein geeignetes Ziel über dem Horizont.', 3000); return; }
    st.calib = true; st.calibObj = o; st.target = o; closeSheet();
    $('calibTxt').textContent = objName(o) + ' im Fadenkreuz ausrichten, dann „Passt“';
    $('calib').hidden = false; invalidate();
  }
  function endCalib() { st.calib = false; st.target = null; $('calib').hidden = true; invalidate(); }
  function confirmCalib() {
    const e = objEnu(st.calibObj); if (!e) return endCalib();
    const t = A.enuToAltAz(e), cur = viewAzAlt(getBasis());
    const d = ((t.az - cur.az + 540) % 360) - 180;
    st.sensor.offset = ((st.sensor.offset + d) % 360 + 360) % 360; store.set('offset', st.sensor.offset);
    endCalib(); toast('Kalibriert: Nordabweichung ausgeglichen.', 2500);
  }

  /* ------------------------------------------------------------- Gesten */
  let dragging = false; const ptrs = new Map(); let g = null;
  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    anim = null; st.vel.az = 0; st.vel.alt = 0;
    if (ptrs.size === 1) g = { t0: performance.now(), sx: e.clientX, sy: e.clientY, moved: 0, lx: e.clientX, ly: e.clientY, lt: performance.now(), pinch: null };
    else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; g.pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y), fov0: st.view.fov }; g.moved = 99; }
    dragging = true;
  });
  canvas.addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2 && g && g.pinch) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      { const of = st.view.fov; st.view.fov = clamp(g.pinch.fov0 * g.pinch.d0 / Math.max(d, 10), 1.2, 130); keepAboveFloor(of); } invalidate(); return;
    }
    if (ptrs.size === 1 && g) {
      const dx = e.clientX - g.lx, dy = e.clientY - g.ly, now = performance.now();
      g.moved += Math.abs(dx) + Math.abs(dy);
      const S = frameInfo ? frameInfo.cam.S : 300, k = R2D / S;
      if (st.sensor.on) { st.sensor.offset = ((st.sensor.offset - dx * k) % 360 + 360) % 360; }
      else {
        st.view.az = A.n360(st.view.az - dx * k); st.view.alt = limitAlt(st.view.alt, st.view.alt + dy * k);
        const dtt = Math.max(8, now - g.lt); st.vel.az = 0.7 * st.vel.az + 0.3 * (-dx * k / dtt); st.vel.alt = 0.7 * st.vel.alt + 0.3 * (dy * k / dtt);
      }
      g.lx = e.clientX; g.ly = e.clientY; g.lt = now; invalidate();
    }
  });
  function endPtr(e) {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    if (ptrs.size === 0 && g) {
      dragging = false;
      const dur = performance.now() - g.t0;
      if (g.moved < 9 && dur < 550) {
        const rect = canvas.getBoundingClientRect(), hit = R.hitTest(e.clientX - rect.left, e.clientY - rect.top);
        if (hit) selectObject(hit.kind === 'star' || hit.kind === 'dso' || hit.kind === 'planet' ? { kind: hit.kind, ref: hit.ref } : { kind: hit.kind });
        else if (st.selected) selectObject(null);
      }
      if (performance.now() - g.lt > 90) { st.vel.az = 0; st.vel.alt = 0; }
      g = null;
    } else if (ptrs.size === 1) { const p = [...ptrs.values()][0]; g = { t0: performance.now(), sx: p.x, sy: p.y, moved: 99, lx: p.x, ly: p.y, lt: performance.now(), pinch: null }; }
  }
  canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr);
  canvas.addEventListener('wheel', e => { e.preventDefault(); const of = st.view.fov; st.view.fov = clamp(st.view.fov * Math.exp(e.deltaY * 0.0012), 1.2, 130); keepAboveFloor(of); invalidate(); }, { passive: false });
  window.addEventListener('keydown', e => {
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    const k = st.view.fov / 30;
    if (e.key === 'ArrowLeft') st.view.az = A.n360(st.view.az - k); else if (e.key === 'ArrowRight') st.view.az = A.n360(st.view.az + k);
    else if (e.key === 'ArrowUp') st.view.alt = limitAlt(st.view.alt, st.view.alt + k); else if (e.key === 'ArrowDown') st.view.alt = limitAlt(st.view.alt, st.view.alt - k);
    else if (e.key === '+' || e.key === '=') st.view.fov = clamp(st.view.fov / 1.15, 1.2, 130); else if (e.key === '-') { const of = st.view.fov; st.view.fov = clamp(st.view.fov * 1.15, 1.2, 130); keepAboveFloor(of); }
    else return;
    invalidate();
  });
  window.addEventListener('resize', invalidate);

  /* ---------------------------------------------------------- Zeitleiste */
  function buildTransport() {
    $('speedChips').innerHTML = SPEEDS.map((s, i) => `<button class="chip" data-sp="${i}" aria-pressed="false">${s.l}</button>`).join('');
    $('unitChips').innerHTML = '<span class="hint" style="align-self:center;margin:0 6px 0 2px;white-space:nowrap">Schritt:</span>' + UNITS.map(u => `<button class="chip" data-un="${u.id}" aria-pressed="${st.unit === u.id}">${u.l}</button>`).join('');
    $('unitBtn').textContent = UNITS.find(u => u.id === st.unit).l;
  }
  function updateTransportUI() {
    document.querySelectorAll('#speedChips .chip').forEach(c => c.setAttribute('aria-pressed', String(!st.live && st.playing && +c.dataset.sp === st.speedIdx)));
    $('spRev').setAttribute('aria-pressed', String(st.dir < 0));
    const running = st.live || st.playing;
    $('spPlayIc').innerHTML = `<use href="#${running ? 'i-pause' : 'i-play'}"/>`;
    $('nowBtn').classList.toggle('ghost', st.live);
    $('nowBtn').textContent = st.live ? 'Live' : 'Jetzt';
  }
  function shiftUnit(ms, unit, n) {
    if (unit === 'm') return ms + n * 60000; if (unit === 'h') return ms + n * 3600000; if (unit === 'd') return ms + n * 86400000;
    const d = new Date(ms);
    if (unit === 'M') d.setMonth(d.getMonth() + n); else d.setFullYear(d.getFullYear() + n);
    return d.getTime();
  }
  let scrubAcc = 0, scrubX = 0, scrubOff = 0;
  const scrub = $('scrub');
  scrub.addEventListener('pointerdown', e => { scrub.setPointerCapture(e.pointerId); scrubX = e.clientX; scrubAcc = 0; st.live = false; st.playing = false; updateTransportUI(); });
  scrub.addEventListener('pointermove', e => {
    if (!scrub.hasPointerCapture(e.pointerId)) return;
    const dx = e.clientX - scrubX; scrubX = e.clientX; scrubAcc += dx / 46; scrubOff -= dx;
    $('scrubTicks').style.backgroundPosition = `${scrubOff}px 100%, ${scrubOff}px 100%`;
    if (st.unit === 'M' || st.unit === 'y') { const n = Math.trunc(scrubAcc); if (n) { scrubAcc -= n; st.ms = clampMs(shiftUnit(st.ms, st.unit, n)); } }
    else { const unitMs = { m: 60000, h: 3600000, d: 86400000 }[st.unit]; st.ms = clampMs(st.ms + scrubAcc * unitMs); scrubAcc = 0; }
    invalidate(); scheduleDetails();
  });
  scrub.addEventListener('keydown', e => {
    const n = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!n) return;
    setTime(shiftUnit(st.ms, st.unit, n)); e.preventDefault();
  });
  function setUnit(u) { st.unit = u; store.set('unit', u); document.querySelectorAll('#unitChips .chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.un === u))); $('unitBtn').textContent = UNITS.find(x => x.id === u).l; }
  $('unitChips').addEventListener('click', e => { const b = e.target.closest('[data-un]'); if (b) setUnit(b.dataset.un); });
  $('unitBtn').addEventListener('click', () => { const i = UNITS.findIndex(u => u.id === st.unit); setUnit(UNITS[(i + 1) % UNITS.length].id); toast('Schritt beim Verschieben: ' + UNITS.find(u => u.id === st.unit).l, 1400); });
  $('speedChips').addEventListener('click', e => {
    const b = e.target.closest('[data-sp]'); if (!b) return;
    if (st.live) { st.ms = Date.now(); st.live = false; }
    st.speedIdx = +b.dataset.sp; st.playing = true; updateTransportUI(); invalidate(); scheduleDetails();
  });
  $('spRev').addEventListener('click', () => { st.dir = -st.dir; if (st.live) { st.live = false; st.ms = Date.now(); } st.playing = true; updateTransportUI(); });
  $('spPlay').addEventListener('click', () => {
    if (st.live) { st.live = false; st.playing = false; }
    else st.playing = !st.playing;
    updateTransportUI(); scheduleDetails();
  });
  $('nowBtn').addEventListener('click', goLive);
  $('tbToggle').addEventListener('click', () => { const h = $('tbSpeed').hidden; $('tbSpeed').hidden = !h; $('tbToggle').setAttribute('aria-expanded', String(h)); });
  $('timeBtn').addEventListener('click', openDateModal);

  function pad(n) { return String(n).padStart(2, '0'); }
  function toInputValue(ms) {
    if (st.tz === 'utc') { const d = new Date(ms); return `${String(d.getUTCFullYear()).padStart(4, '0')}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; }
    const d = new Date(ms); return `${String(d.getFullYear()).padStart(4, '0')}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function fromInputValue(v) {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v); if (!m) return null;
    if (st.tz === 'utc') return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
    const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]); d.setFullYear(+m[1]); return d.getTime();
  }
  let birthMode = false;
  function openDateModal(birth) {
    birthMode = !!birth;
    $('dtIn').value = birthMode && !store.get('birth', null) ? '' : toInputValue(birthMode ? (store.get('birth', null) || st.ms) : st.ms);
    $('modalTitle').textContent = birthMode ? 'Deine Geburtsnacht' : 'Datum und Uhrzeit';
    $('modalHint').textContent = birthMode ? 'Gib Datum und, wenn du sie kennst, die Uhrzeit deiner Geburt ein. Die Uhrzeit wird nur auf diesem Gerät gespeichert.' : 'Vor dem Jahr 1582 rechnet die App im proleptischen gregorianischen Kalender. Planetenpositionen sind zwischen 1800 und 2050 am genauesten.';
    $('dtOk').textContent = birthMode ? 'Meinen Himmel zeigen' : 'Übernehmen';
    $('modal').hidden = false;
  }
  $('dtOk').addEventListener('click', () => {
    const ms = fromInputValue($('dtIn').value); if (ms === null || isNaN(ms)) { toast('Bitte ein gültiges Datum eingeben.'); return; }
    $('modal').hidden = true;
    if (birthMode) {
      store.set('birth', ms); setTime(ms); sky = A.skyState(jdNow(), st.lat, st.lon, 0);
      const inp = $('memName'); if (inp) inp.value = 'Meine Geburtsnacht';
      selectObject({ kind: 'moon' }, { goto: true, fov: 30 });
      toast('So stand der Mond in deiner Geburtsnacht: ' + A.moonPhaseName(sky.moon.phase) + ', ' + f0(sky.moon.illum * 100) + ' % beleuchtet.', 5500);
    } else setTime(ms);
  });
  $('dtCancel').addEventListener('click', () => { $('modal').hidden = true; });

  /* ------------------------------------------------------- Kopfleiste */
  $('bSearch').addEventListener('click', openSearch);
  $('searchClose').addEventListener('click', closeSearch);
  $('searchIn').addEventListener('input', e => renderSearch(e.target.value));
  $('searchRes').addEventListener('click', e => {
    const li = e.target.closest('li[data-i]'); if (!li) return;
    const x = searchIndex[+li.dataset.i]; closeSearch();
    selectObject(x.kind === 'con' ? { kind: 'con', ref: x.ref } : (x.kind === 'sun' || x.kind === 'moon' ? { kind: x.kind } : { kind: x.kind, ref: x.ref }), { goto: true, fov: x.kind === 'con' ? 55 : null });
  });
  $('bSensor').addEventListener('click', toggleSensor);
  $('bCam').addEventListener('click', toggleCamera);
  $('bMenu').addEventListener('click', () => openSheet('ueber'));
  $('placeBtn').addEventListener('click', () => openSheet('ort'));
  $('cardClose').addEventListener('click', () => selectObject(null));
  $('cardGoto').addEventListener('click', () => { if (st.selected) gotoObject(st.selected); });
  $('cardZoom').addEventListener('click', () => { if (st.selected) gotoObject(st.selected, st.selected.kind === 'sun' || st.selected.kind === 'moon' ? 3 : 12); });
  $('calibOk').addEventListener('click', confirmCalib);
  $('calibReset').addEventListener('click', () => { st.sensor.offset = 0; store.set('offset', 0); toast('Kalibrierung zurückgesetzt.'); endCalib(); });

  /* --------------------------------------------------------------- Menü */
  function openSheet(tab) { st.sheetTab = tab; $('sheet').hidden = false; $('scrim').hidden = false; renderSheet(); if (tab === 'ueber') scheduleOverview(); if (tab === 'entdecken') scheduleDiscover(); requestAnimationFrame(updateTabsFade); }
  function closeSheet() { st.sheetTab = null; $('sheet').hidden = true; $('scrim').hidden = true; }
  $('scrim').addEventListener('click', closeSheet); $('sheetClose').addEventListener('click', closeSheet);
  $('tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (!b) return; st.sheetTab = b.dataset.tab; renderSheet(); if (st.sheetTab === 'ueber') scheduleOverview(); if (st.sheetTab === 'entdecken') scheduleDiscover(); $('sheetBody').scrollTop = 0; b.scrollIntoView({ block: 'nearest', inline: 'center' }); });
  const updateTabsFade = () => { const t = $('tabs'); $('tabsFade').style.opacity = t.scrollLeft + t.clientWidth >= t.scrollWidth - 4 ? '0' : '1'; };
  $('tabs').addEventListener('scroll', updateTabsFade); window.addEventListener('resize', updateTabsFade);

  const CITIES = [['Hamburg', 53.55, 10.0], ['Berlin', 52.52, 13.40], ['München', 48.14, 11.58], ['Köln', 50.94, 6.96], ['Wien', 48.21, 16.37], ['Zürich', 47.38, 8.54], ['Madrid', 40.42, -3.70], ['Reykjavík', 64.15, -21.94], ['Tromsø', 69.65, 18.96], ['New York', 40.71, -74.01], ['Kapstadt', -33.92, 18.42], ['Sydney', -33.87, 151.21], ['Tokio', 35.68, 139.69], ['Rio de Janeiro', -22.91, -43.17]];
  const MOMENTS = [
    { id: 'sofi26', t: 'Totale Sonnenfinsternis in Spanien', d: '12.08.2026 · Burgos · kurz vor Sonnenuntergang', iso: '2026-08-12T18:29:00Z', lat: 42.34, lon: -3.70, place: 'Burgos, Spanien', obj: { kind: 'sun' }, fov: 4 },
    { id: 'sofihh', t: 'Fast total in Hamburg', d: '12.08.2026 · 87 % der Sonne verdeckt, tief im Westen', iso: '2026-08-12T18:07:00Z', lat: 53.55, lon: 10.0, place: 'Hamburg', obj: { kind: 'sun' }, fov: 6 },
    { id: 'mofi26', t: 'Mondfinsternis bei Sonnenaufgang', d: '28.08.2026 · Hamburg · partiell, Mond geht unter', iso: '2026-08-28T04:12:00Z', lat: 53.55, lon: 10.0, place: 'Hamburg', obj: { kind: 'moon' }, fov: 6 },
    { id: 'blut25', t: 'Blutmond über Hamburg', d: '07.09.2025 · totale Mondfinsternis beim Mondaufgang', iso: '2025-09-07T18:11:00Z', lat: 53.55, lon: 10.0, place: 'Hamburg', obj: { kind: 'moon' }, fov: 6 },
    { id: 'jupsat', t: 'Große Konjunktion Jupiter und Saturn', d: '21.12.2020 · Berlin · nur 0,1° Abstand', iso: '2020-12-21T16:00:00Z', lat: 52.52, lon: 13.40, place: 'Berlin', obj: { kind: 'planet', ref: 3 }, fov: 10 },
    { id: 'venjup', t: 'Venus und Jupiter am Abendhimmel', d: '09.06.2026 · Berlin · zwei helle Lichter im Westen', iso: '2026-06-09T20:30:00Z', lat: 52.52, lon: 13.40, place: 'Berlin', obj: { kind: 'planet', ref: 1 }, fov: 25 },
    { id: 'sofi99', t: 'Sonnenfinsternis von 1999', d: '11.08.1999 · Stuttgart · totale Finsternis in Deutschland', iso: '1999-08-11T10:34:00Z', lat: 48.78, lon: 9.18, place: 'Stuttgart', obj: { kind: 'sun' }, fov: 4 },
    { id: 'tromso', t: 'Mitternachtssonne', d: '21.06.2026 · Tromsø · die Sonne geht nicht unter', iso: '2026-06-21T22:00:00Z', lat: 69.65, lon: 18.96, place: 'Tromsø', obj: { kind: 'sun' }, fov: 70 },
    { id: 'apollo', t: 'Der Mond am Tag der Mondlandung', d: '20.07.1969 · Houston · Apollo 11 setzt auf', iso: '1969-07-20T20:17:00Z', lat: 29.76, lon: -95.37, place: 'Houston', obj: { kind: 'moon' }, fov: 6 }
  ];
  function jumpMoment(m) {
    setLocation(m.lat, m.lon, m.place, true); setTime(Date.parse(m.iso));
    closeSheet(); sky = A.skyState(jdNow(), st.lat, st.lon, 0);
    st.sensor.on && disableSensor();
    selectObject(m.obj); const e = objEnu(m.obj), aa = A.enuToAltAz(e);
    animateView(aa.az, clamp(aa.alt, -20, 80), m.fov);
    toast(m.t + ' · ' + m.place, 3500);
  }

  function jumpEvent(kind) {
    const jd = jdNow(); let t = null, msg = '';
    if (kind === 'sunrise') t = A.riseSet('sun', jd, st.lat, st.lon, 'rise', 1), msg = 'Kein Sonnenaufgang in den nächsten Tagen.';
    else if (kind === 'sunset') t = A.riseSet('sun', jd, st.lat, st.lon, 'set', 1), msg = 'Kein Sonnenuntergang in den nächsten Tagen.';
    else if (kind === 'moonrise') t = A.riseSet('moon', jd, st.lat, st.lon, 'rise', 1), msg = 'Kein Mondaufgang gefunden.';
    else if (kind === 'moonset') t = A.riseSet('moon', jd, st.lat, st.lon, 'set', 1), msg = 'Kein Monduntergang gefunden.';
    else if (kind === 'new') t = A.moonPhaseTime(jd + 0.01, 0, 1);
    else if (kind === 'full') t = A.moonPhaseTime(jd + 0.01, 180, 1);
    else if (kind === 'fq') t = A.moonPhaseTime(jd + 0.01, 90, 1);
    else if (kind === 'lq') t = A.moonPhaseTime(jd + 0.01, 270, 1);
    else if (kind === 'night') {
      msg = 'Hier wird es in den nächsten Tagen nicht völlig dunkel.';
      for (let i = 0; i < 24 * 4 * 3; i++) { const q = jd + i / 96; if (A.skyState(q, st.lat, st.lon).sun.trueAlt < -18) { t = q; break; } }
    } else if (kind === 'mofi') {
      const e = A.nextLunarEclipse(jd + 0.02, 1, 5);
      if (e) { setTime(A.fromJD(e.jd).getTime()); closeSheet(); sky = A.skyState(e.jd, st.lat, st.lon); selectObject({ kind: 'moon' }, { goto: true, fov: 14 }); toast((e.kind === 'total' ? 'Totale' : e.kind === 'partial' ? 'Partielle' : 'Halbschatten-') + ' Mondfinsternis (Maximum)' + (sky.moon.trueAlt < 0 ? ' – der Mond ist an diesem Ort nicht sichtbar' : ''), 5000); return; }
      toast('Keine Mondfinsternis gefunden.'); return;
    } else if (kind === 'sofi') {
      const e = A.nextLocalSolarEclipse(jd + 0.02, st.lat, st.lon, 12);
      if (e) { setTime(A.fromJD(e.jd).getTime()); closeSheet(); sky = A.skyState(e.jd, st.lat, st.lon); selectObject({ kind: 'sun' }, { goto: true, fov: e.kind === 'total' ? 4 : 8 }); toast((e.kind === 'total' ? 'Totale' : e.kind === 'annular' ? 'Ringförmige' : 'Partielle') + ' Sonnenfinsternis hier (' + f0(Math.min(e.mag, 1) * 100) + ' % Größe)', 5000); return; }
      toast('In den nächsten 12 Jahren keine sichtbare Sonnenfinsternis an diesem Ort.', 4500); return;
    }
    if (t === null || t === undefined) { toast(msg || 'Nichts gefunden.'); return; }
    setTime(A.fromJD(t).getTime()); closeSheet();
    if (kind === 'sunrise' || kind === 'sunset') { sky = A.skyState(t, st.lat, st.lon); const aa = A.enuToAltAz(sky.sun.enu); animateView(aa.az, clamp(aa.alt + 12, 5, 40), Math.min(st.view.fov, 90)); }
    if (kind === 'moonrise' || kind === 'moonset' || kind === 'new' || kind === 'full' || kind === 'fq' || kind === 'lq') { sky = A.skyState(t, st.lat, st.lon); if (sky.moon.trueAlt > -5) { const aa = A.enuToAltAz(sky.moon.enu); selectObject({ kind: 'moon' }); animateView(aa.az, clamp(aa.alt + 8, 5, 60), 40); } else selectObject({ kind: 'moon' }); }
  }

  /* -------------------------------- Menü-Inhalte (Heute, Zeit, Ansicht, Ort, Info) */
  /* -------------------------------------------------- Sternschnuppenströme */
  // Radianten und Maxima sind astronomische Fakten (veröffentlichte Daten der IMO); das genaue Maximum
  // kann je nach Jahr um etwa einen Tag abweichen.
  const SHOWERS = [
    { id: 'qua', name: 'Quadrantiden', from: [12, 28], peak: [1, 3], to: [1, 12], ra: 230, dec: 49, zhr: 110 },
    { id: 'lyr', name: 'Lyriden', from: [4, 16], peak: [4, 22], to: [4, 25], ra: 271, dec: 34, zhr: 18 },
    { id: 'eta', name: 'Eta-Aquariiden', from: [4, 19], peak: [5, 5], to: [5, 28], ra: 338, dec: -1, zhr: 50 },
    { id: 'per', name: 'Perseiden', from: [7, 17], peak: [8, 12], to: [8, 24], ra: 46, dec: 58, zhr: 100 },
    { id: 'ori', name: 'Orioniden', from: [10, 2], peak: [10, 21], to: [11, 7], ra: 95, dec: 16, zhr: 20 },
    { id: 'leo', name: 'Leoniden', from: [11, 6], peak: [11, 18], to: [11, 30], ra: 152, dec: 22, zhr: 15 },
    { id: 'gem', name: 'Geminiden', from: [12, 4], peak: [12, 14], to: [12, 17], ra: 112, dec: 33, zhr: 150 },
    { id: 'urs', name: 'Ursiden', from: [12, 17], peak: [12, 22], to: [12, 26], ra: 217, dec: 75, zhr: 10 }
  ];
  function dateInYear(y, md) { return new Date(Date.UTC(y, md[0] - 1, md[1], 12)); }
  function meteorEvents(jd0, H) {
    const y0 = A.fromJD(jd0).getUTCFullYear(), out = [];
    for (const sh of SHOWERS) {
      for (const y of [y0, y0 + 1]) {
        const peakMs = dateInYear(y, sh.peak).getTime(), peakJd = A.toJD(peakMs);
        if (peakJd < jd0 - 2 || peakJd > jd0 + H) continue;
        let best = null;
        for (let t = peakJd - 0.55; t <= peakJd + 0.55; t += 1 / 96) {
          const s = A.skyState(t, st.lat, st.lon, 0);
          const rd = A.starRaDec(sh.ra, sh.dec, t), e = A.eqToEnu(A.vec(rd.ra, rd.dec), s.lst, st.lat), aa = A.enuToAltAz(e);
          if (s.sun.trueAlt < -10 && aa.alt > 15) { const score = aa.alt - (s.moon.trueAlt > 0 ? s.moon.illum * 25 : 0); if (!best || score > best.score) best = { jd: t, alt: aa.alt, az: aa.az, sunAlt: s.sun.trueAlt, sunAz: s.sun.az, score }; }
        }
        const whenMeteor = v => (v.sunAlt > -14 ? (v.sunAz > 180 ? 'abends' : 'morgens') : 'nachts') + ' im ' + compass(v.az);
        out.push({
          jd: best ? best.jd : peakJd, kind: 'meteor', title: sh.name + ': Sternschnuppen-Maximum',
          sub: (best ? 'Beste Sicht ' + whenMeteor(best) + ', bis zu ' + sh.zhr + ' pro Stunde unter besten Bedingungen' : 'Radiant in dieser Nacht kaum über dem Horizont oder es bleibt hell'),
          vis: !!best, obj: { kind: 'point', ra: sh.ra, dec: sh.dec, name: sh.name, meteor: true, sub: 'Radiant des Meteorstroms ' + sh.name, extra: [['Fällt am stärksten', 'bis zu ' + sh.zhr + ' pro Stunde unter dunklem Himmel'], ['Aktiv', dtf({ day: 'numeric', month: 'long' }).format(dateInYear(y, sh.from)) + ' bis ' + dtf({ day: 'numeric', month: 'long' }).format(dateInYear(y, sh.to))]] },
          fov: 70
        });
      }
    }
    return out;
  }

  /* --------------------------------------------------------------- Entdecken */
  let discCache = null, discTimer = null;
  function scheduleDiscover() { clearTimeout(discTimer); const key = Math.floor(st.ms / 86400000) + '|' + st.lat.toFixed(1) + '|' + st.lon.toFixed(1); if (discCache && discCache.key === key) return; discTimer = setTimeout(() => { if (st.sheetTab === 'entdecken') { discCache = computeDiscover(key); renderSheet(); } }, 60); }
  function angleBetween(a, b) { const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; return Math.acos(clamp(d, -1, 1)) * 180 / Math.PI; }
  function computeDiscover(key) {
    const jd0 = jdNow(), H = 150, step = 4 / 24, n = Math.ceil(H / step), ev = [];
    const PL = [0, 1, 2, 3, 4]; // Merkur bis Saturn
    const S = [];
    for (let i = 0; i <= n; i++) { const s = A.skyState(jd0 + i * step, st.lat, st.lon, 0); S.push({ jd: s.jd, sun: s.sun, moon: s.moon, pl: s.planets }); }
    const posOf = (s, k) => k === 's' ? s.sun : k === 'm' ? s.moon : (s.pl || s.planets)[k];
    const sep = (s, a, b) => angleBetween(posOf(s, a).enu, posOf(s, b).enu);
    const nm = k => k === 'm' ? 'Mond' : PNAME[S[0].pl[k].name];
    // beste Sicht: Zeitpunkt im Fenster ±14 h, an dem beide Körper hoch genug stehen und es dunkel ist
    const bestView = (jd, a, b) => {
      let best = null;
      for (let t = jd - 14 / 24; t <= jd + 14 / 24; t += 1 / 72) {
        const s = A.skyState(t, st.lat, st.lon, 0), pa = posOf(s, a), pb = posOf(s, b);
        if (s.sun.trueAlt < -5 && pa.trueAlt > 3 && pb.trueAlt > 3) { const d = angleBetween(pa.enu, pb.enu); if (!best || d < best.d) best = { jd: t, d, alt: Math.min(pa.trueAlt, pb.trueAlt), az: (pa.az + pb.az) / 2, sunAlt: s.sun.trueAlt, sunAz: s.sun.az }; }
      }
      return best;
    };
    const minSearch = (jd, a, b) => { let bt = jd, bd = 999; for (let t = jd - 4 / 24; t <= jd + 4 / 24; t += 1 / 72) { const d = sep(A.skyState(t, st.lat, st.lon, 0), a, b); if (d < bd) { bd = d; bt = t; } } return { jd: bt, d: bd }; };
    const when = v => (v.sunAlt > -14 ? (v.sunAz > 180 ? 'abends' : 'morgens') : 'nachts') + ' im ' + compass(v.az);
    const pairEvent = (a, b, thr, title) => {
      for (let i = 1; i < n; i++) {
        const d0 = sep(S[i - 1], a, b), d1 = sep(S[i], a, b), d2 = sep(S[i + 1], a, b);
        if (d1 < thr && d1 <= d0 && d1 < d2) {
          const m = minSearch(S[i].jd, a, b), v = bestView(m.jd, a, b);
          const oa = a === 'm' ? { kind: 'moon' } : { kind: 'planet', ref: a };
          const ob = b === 'm' ? { kind: 'moon' } : { kind: 'planet', ref: b };
          const planetRef = typeof b === 'number' ? b : a;
          ev.push({ jd: v ? v.jd : m.jd, kind: 'pair', title: title(m.d), sub: v ? 'Beste Sicht ' + when(v) + ', Höhe ' + f0(v.alt) + '°' : 'An deinem Ort nicht sichtbar', vis: !!v, obj: { kind: 'planet', ref: planetRef }, fov: a === 'm' ? 14 : 8, pair: [a, b] });
        }
      }
    };
    for (const p of [1, 2, 3, 4, 0]) pairEvent('m', p, 5, d => 'Mond bei ' + nm(p) + ' (' + f0(d, 1) + '°)');
    for (let i = 0; i < PL.length; i++) for (let j = i + 1; j < PL.length; j++) pairEvent(PL[i], PL[j], 2.5, d => nm(PL[i]) + ' und ' + nm(PL[j]) + ' nah beieinander (' + f0(d, 1) + '°)');
    // größte Elongation (Merkur, Venus) und Opposition (Mars, Jupiter, Saturn)
    const W = 60; // Fenster ±10 Tage
    for (const p of PL) for (let i = W; i < n - W; i++) {
      const e1 = S[i].pl[p].elong; let isMax = true;
      for (let k = i - W; k <= i + W && isMax; k++) if (S[k].pl[p].elong > e1) isMax = false;
      if (!isMax) continue;
      const inner = p < 2;
      if (inner && e1 > (p === 0 ? 17 : 40)) {
        const east = ((S[i].pl[p].ra - S[i].sun.ra + 540) % 360) - 180 > 0;
        ev.push({ jd: S[i].jd, kind: 'elong', title: nm(p) + ': größter Abstand zur Sonne', sub: f0(e1) + '° ' + (east ? 'östlich, Abendhimmel' : 'westlich, Morgenhimmel'), vis: true, obj: { kind: 'planet', ref: p }, fov: 60 });
      }
    }
    for (const p of [2, 3, 4]) for (let i = 1; i < n; i++) {
      const e0 = S[i - 1].pl[p].elong, e1 = S[i].pl[p].elong, e2 = S[i + 1].pl[p].elong;
      if (e1 > 172 && e1 >= e0 && e1 > e2) ev.push({ jd: S[i].jd, kind: 'opp', title: nm(p) + ' in Opposition', sub: 'Die ganze Nacht sichtbar, jetzt am hellsten und größten', vis: true, obj: { kind: 'planet', ref: p }, fov: 30 });
    }
    // Mondphasen
    const PH = [[0, 'Neumond'], [90, 'Erstes Viertel'], [180, 'Vollmond'], [270, 'Letztes Viertel']];
    for (const [deg, name] of PH) { let t = jd0; for (let k = 0; k < 8; k++) { const q = A.moonPhaseTime(t + 0.01, deg, 1); if (!q || q > jd0 + H) break; ev.push({ jd: q, kind: 'phase', title: name, sub: '', vis: true, obj: { kind: 'moon' }, fov: 40, minor: deg % 180 !== 0 }); t = q + 5; } }
    // Finsternisse (auch weiter entfernt)
    const le = A.nextLunarEclipse(jd0 + 0.02, 1, 5);
    if (le) { const s = A.skyState(le.jd, st.lat, st.lon, 0); ev.push({ jd: le.jd, kind: 'eclipse', title: (le.kind === 'total' ? 'Totale' : le.kind === 'partial' ? 'Partielle' : 'Halbschatten-') + ' Mondfinsternis', sub: s.moon.trueAlt > 0 ? 'Mond im Maximum über dem Horizont (Höhe ' + f0(s.moon.trueAlt) + '°)' : 'Im Maximum bei dir unter dem Horizont', vis: s.moon.trueAlt > 0, obj: { kind: 'moon' }, fov: 14 }); }
    const se = A.nextLocalSolarEclipse(jd0 + 0.02, st.lat, st.lon, 12);
    if (se) ev.push({ jd: se.jd, kind: 'eclipse', title: (se.kind === 'total' ? 'Totale' : se.kind === 'annular' ? 'Ringförmige' : 'Partielle') + ' Sonnenfinsternis', sub: 'An deinem Ort ' + f0(Math.min(se.mag, 1) * 100) + ' % Größe', vis: true, obj: { kind: 'sun' }, fov: se.kind === 'total' ? 4 : 8 });
    meteorEvents(jd0, H).forEach(e => ev.push(e));
    ev.sort((x, y) => x.jd - y.jd);
    return { key, ev, jd0 };
  }
  function htmlDiscover() {
    if (!discCache) return '<p>Suche Ereignisse für ' + st.place + ' …</p>';
    const list = discCache.ev; let lastMonth = '';
    const rows = list.map((e, i) => {
      const ms = A.fromJD(e.jd).getTime();
      const month = dtf({ month: 'long', year: 'numeric' }).format(ms);
      const head = month !== lastMonth ? `<h4>${month}</h4>` : ''; lastMonth = month;
      const date = dtf({ weekday: 'short', day: 'numeric', month: 'numeric' }).format(ms).replace(/\./g, '.');
      const time = dtf({ hour: '2-digit', minute: '2-digit' }).format(ms);
      const sub = [e.sub, time].filter(Boolean).join(' · ');
      return head + `<button class="item ev${e.vis ? '' : ' dim'}${e.minor ? ' minor' : ''}" data-ev="${i}"><span class="t"><b>${e.title}</b><span>${sub}</span></span><span class="r">${date}</span></button>`;
    }).join('');
    return `<p>Ereignisse der nächsten Monate für <b>${st.place}</b>. Tippe auf eines, um in der Zeit dorthin zu springen.</p>${rows}<p class="hint">Bei Begegnungen zeigt die Zeit den Moment mit der besten Sicht: dunkler Himmel, beide Objekte über dem Horizont. Abgeblendete Einträge sind an deinem Ort nicht zu sehen.</p>`;
  }
  function jumpDiscover(e) {
    setTime(A.fromJD(e.jd).getTime()); closeSheet(); sky = A.skyState(e.jd, st.lat, st.lon, 0);
    st.sensor.on && disableSensor();
    selectObject(e.obj); const o = objEnu(e.obj), aa = A.enuToAltAz(o);
    animateView(aa.az, clamp(aa.alt, -10, 80), e.fov || 20);
    toast(e.title, 3500);
  }

  let overviewTimer = null;
  function scheduleOverview() { clearTimeout(overviewTimer); overviewTimer = setTimeout(() => { if (st.sheetTab === 'ueber') { overviewCache = computeOverview(); renderSheet(); } }, 60); }
  let overviewCache = null;
  function computeOverview() {
    const jd = jdNow(), s = A.skyState(jd, st.lat, st.lon), out = [];
    const mk = (name, o, body) => {
      const ev = { rise: A.riseSet(body, jd, st.lat, st.lon, 'rise', 1), set: A.riseSet(body, jd, st.lat, st.lon, 'set', 1) };
      out.push({ name, o, alt: o.trueAlt, az: o.az, mag: o.mag, ev });
    };
    mk('Sonne', s.sun, 'sun'); mk('Mond', s.moon, 'moon');
    s.planets.forEach((p, i) => mk(PNAME[p.name], p, p.name));
    const moon = s.moon;
    const nm = A.moonPhaseTime(jd + 0.01, 0, 1), fm = A.moonPhaseTime(jd + 0.01, 180, 1);
    return { rows: out, sky: s, nm, fm, key: Math.round(st.ms / 60000) };
  }
  function renderSheet() {
    const tab = st.sheetTab; if (!tab) return;
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    const body = $('sheetBody');
    if (tab === 'ueber') body.innerHTML = htmlOverview();
    else if (tab === 'entdecken') body.innerHTML = htmlDiscover();
    else if (tab === 'erinnerungen') body.innerHTML = htmlMemories();
    else if (tab === 'zeit') body.innerHTML = htmlTime();
    else if (tab === 'ebenen') body.innerHTML = htmlLayers();
    else if (tab === 'ort') body.innerHTML = htmlPlace();
    else if (tab === 'info') body.innerHTML = htmlInfo();
  }
  function htmlOverview() {
    if (!overviewCache) { return '<p>Berechne …</p>'; }
    const ov = overviewCache, s = ov.sky;
    const kindOf = n => n === 'Sonne' ? { kind: 'sun' } : n === 'Mond' ? { kind: 'moon' } : null;
    const rows = ov.rows.map((r, i) => {
      const up = r.alt > 0;
      const name = r.name;
      const obj = i === 0 ? { kind: 'sun' } : i === 1 ? { kind: 'moon' } : { kind: 'planet', ref: i - 2 };
      return `<tr data-obj='${JSON.stringify(obj)}' style="cursor:pointer"><td><b>${name}</b><small>${f0(r.mag, 1)} mag</small></td>
        <td class="${up ? 'up' : ''}">${f0(r.alt)}°<small>${up ? 'sichtbar' : 'unter Horizont'}</small></td>
        <td>${compass(r.az)}<small>${f0(r.az)}°</small></td>
        <td>↑ ${fmtEvent(r.ev.rise)}<small>↓ ${fmtEvent(r.ev.set)}</small></td></tr>`;
    }).join('');
    return `<div class="row" style="margin-top:0"><button class="btn" data-act="flight">Kinoflug: eine Nacht in 60 Sekunden</button><button class="btn ghost" data-act="poster">Poster</button></div><h4>Der Himmel für ${st.place}</h4>
      <p><b>${A.moonPhaseName(s.moon.phase)}</b>, ${f0(s.moon.illum * 100)} % beleuchtet. Nächster Neumond: ${fmtEvent(ov.nm)}. Nächster Vollmond: ${fmtEvent(ov.fm)}.</p>
      <table class="ov"><thead><tr><th>Objekt</th><th>Höhe</th><th>Richtung</th><th>Auf / Unter</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="hint">Tippe auf eine Zeile, um das Objekt am Himmel zu zeigen. Zeiten in ${st.tz === 'utc' ? 'UTC' : 'Gerätezeit'}.</p>`;
  }
  function htmlTime() {
    const btn = (id, l) => `<button class="btn ghost" data-jump="${id}">${l}</button>`;
    return `<h4>Springen</h4>
      <div class="grid2">${btn('sunrise', 'Sonnenaufgang')}${btn('sunset', 'Sonnenuntergang')}${btn('moonrise', 'Mondaufgang')}${btn('moonset', 'Monduntergang')}${btn('night', 'Volle Dunkelheit')}${btn('new', 'Neumond')}${btn('fq', 'Erstes Viertel')}${btn('full', 'Vollmond')}${btn('lq', 'Letztes Viertel')}${btn('mofi', 'Mondfinsternis')}</div>
      <div class="row"><button class="btn ghost" data-jump="sofi" style="flex:1">Nächste Sonnenfinsternis hier</button></div>
      <div class="row"><button class="btn" data-act="date" style="flex:1">Datum und Uhrzeit wählen</button></div>
      <div class="row"><button class="btn ghost" data-act="birth" style="flex:1">✦ Meine Geburtsnacht zeigen</button></div>
      <h4>Himmelsmomente</h4>
      <div class="list">${MOMENTS.map(m => `<button class="item" data-moment="${m.id}"><span class="t"><b>${m.t}</b><span>${m.d}</span></span></button>`).join('')}</div>`;
  }
  function tog(id, label, sub, checked) { return `<div class="toggle"><label for="t_${id}">${label}${sub ? `<small>${sub}</small>` : ''}</label><span class="sw"><input type="checkbox" id="t_${id}" data-layer="${id}" ${checked ? 'checked' : ''}><i></i></span></div>`; }
  function visibleStarCount() {
    if (!sky) return null;
    const lim = R.limitingMagFor(sky, st.pollution, st.layers.allStars);
    let n = 0; for (const s2 of ST.stars) if (s2.mag < lim) n++;
    return { n, total: ST.stars.length, lim };
  }
  function htmlLayers() {
    const L = st.layers;
    const vc = visibleStarCount();
    const seg = (name, val, items) => `<div class="seg">${items.map(i => `<button class="chip" data-${name}="${i[0]}" aria-pressed="${String(val) === String(i[0])}">${i[1]}</button>`).join('')}</div>`;
    return `<h4>Himmel</h4>
      ${tog('constellations', 'Sternbild-Linien', '', L.constellations)}${tog('conNames', 'Sternbild-Namen', '', L.conNames)}${tog('starNames', 'Sternnamen', '', L.starNames)}
      ${tog('milkyway', 'Milchstraße', 'Stilisiertes Band, keine Katalogdaten', L.milkyway)}${tog('dso', 'Galaxien, Nebel, Sternhaufen', '', L.dso)}${tog('sunPath', 'Sonnenbahn des Tages', 'Mit Stundenmarken', L.sunPath)}
      ${tog('allStars', 'Alle Sterne auch am Tag', 'Ohne Dämmerungs- und Tageslichtabzug', L.allStars)}
      <h4>Hilfslinien</h4>
      ${tog('altazGrid', 'Höhen- und Richtungsgitter', '', L.altazGrid)}${tog('eqGrid', 'Äquatorgitter', '', L.eqGrid)}${tog('ecliptic', 'Ekliptik', 'Bahn von Sonne, Mond und Planeten', L.ecliptic)}
      <h4>Himmelsqualität</h4>${seg('pol', st.pollution, [[0, 'Dunkler Himmel'], [1, 'Vorort'], [2, 'Stadt']])}
      ${vc ? `<p class="hint"><b>${vc.n} von ${vc.total}</b> Katalogsternen sind gerade an deinem Ort und mit dieser Einstellung hell genug, um sichtbar zu sein${vc.n < vc.total ? ' – der Rest geht in Dämmerung, Mondlicht oder Lichtern der Stadt unter' : ''}.</p>` : ''}
      <p class="hint">Simuliert, wie viele Sterne und wie viel Milchstraße du am Ort sehen könntest.</p>
      <h4>Darstellung</h4>
      ${tog('red', 'Rotlicht-Modus', 'Schont die Dunkeladaption der Augen', st.red)}
      <h4>Zeitanzeige</h4>${seg('tz', st.tz, [['local', 'Gerätezeit'], ['utc', 'UTC']])}
      <h4>Kompass</h4>
      <div class="row"><button class="btn ghost" data-act="calib">Kompass an Sonne, Mond oder Stern kalibrieren</button></div>
      <p class="hint">Magnetkompasse weichen oft um einige Grad ab. Richte das Fadenkreuz auf ein Objekt und bestätige. Im Sensor-Modus kannst du die Richtung auch durch Ziehen feinjustieren.</p>`;
  }
  function htmlPlace() {
    return `<h4>Aktueller Ort</h4><p><b>${st.place}</b><br>${f0(st.lat, 3)}° N, ${f0(st.lon, 3)}° O</p>
      <div class="row"><button class="btn" data-act="locate" style="flex:1">Meinen Standort verwenden</button></div>
      <p class="hint">Der Standort wird nur auf deinem Gerät zur Berechnung benutzt und nirgendwohin gesendet.</p>
      <h4>Orte der Welt</h4>
      <div class="seg">${CITIES.map((c, i) => `<button class="chip" data-city="${i}">${c[0]}</button>`).join('')}</div>
      <h4>Koordinaten eingeben</h4>
      <div class="row2"><label class="field">Breite (±90)<input id="inLat" inputmode="decimal" value="${st.lat.toFixed(4)}"></label><label class="field">Länge (±180)<input id="inLon" inputmode="decimal" value="${st.lon.toFixed(4)}"></label></div>
      <div class="row"><button class="btn ghost" data-act="coords" style="flex:1">Übernehmen</button></div>`;
  }
  function htmlInfo() {
    return `<h4>SterneWahr</h4>
      <p>Der Sternenhimmel für deinen Ort, live und in der Zeit verschiebbar: Ziehe mit dem Finger, zoome mit zwei Fingern, tippe auf Objekte. Mit „Live-Ausrichtung“ folgt der Himmel deinem Gerät.</p>
      <h4>Verknüpfung</h4>
      <p>Die App lässt sich mit Parametern öffnen, zum Beispiel <b>?lat=53.55&amp;lon=10&amp;t=2026-08-12T18:29:00Z&amp;obj=moon</b>. Möglich sind lat, lon, name, t (Zeit in UTC), obj (sun, moon, Planet oder Sternname), fov und flight=1.</p>
      <h4>Genauigkeit</h4>
      <p>Sonne und Mond werden nach gekürzten Reihen von Jean Meeus berechnet (Winkelfehler unter etwa 0,02°). Die Planeten nutzen die Bahnnäherung der NASA/JPL für 1800–2050 (Fehler meist unter 0,1°, Saturn bis etwa 0,3°) und außerhalb davon die weniger genaue Langzeitnäherung. Sterne stehen auf J2000 und werden präzediert; Eigenbewegungen sind nicht enthalten. Refraktion ist für Höhen über dem Horizont eingerechnet. Die Sternauswahl ist begrenzt (knapp 300 helle Sterne).</p>
      <p>Die Milchstraße ist ein stilisiertes Band und keine Messdaten. Kometen, Satelliten und die ISS sind nicht enthalten. Die Entfernungen der Sterne (für die Lichtlaufzeit) sind veröffentlichte Näherungswerte. Die Maxima der Sternschnuppenströme können um etwa einen Tag abweichen.</p>
      <h4>Sonne nie ungeschützt ansehen</h4>
      <p>Blicke nie ohne zertifizierten Sonnenfilter (ISO 12312-2) in die Sonne, auch nicht bei einer Finsternis und nicht durch Kamera oder Fernglas. Die App zeigt nur eine Simulation.</p>
      <h4>Datenschutz</h4>
      <p>Alles läuft auf deinem Gerät. Es gibt kein Konto und kein Tracking, und die App lädt nichts von Drittanbietern nach. Standort, Kamera und Bewegungssensoren werden nur auf ausdrücklichen Wunsch genutzt und nie an Server übertragen. Wenn AstroWahr deinen Standort bereits kennt (automatisch ermittelt oder von Hand eingegeben), übergibt es ihn beim Öffnen dieser Ansicht, damit du ihn nicht doppelt eingeben musst; du kannst ihn hier unter „Ort" jederzeit ändern.</p>
      <h4>Rechtliches</h4>
      <p class="hint">Impressum, Datenschutz sowie Quellen &amp; Lizenzen gelten für die ganze WahrZentrale.</p>
      <div class="list"><a class="item" href="./impressum.html" target="_top"><span class="t"><b>Impressum</b></span></a><a class="item" href="./datenschutz.html#zh" target="_top"><span class="t"><b>Datenschutz</b></span></a><a class="item" href="./lizenzen.html" target="_top"><span class="t"><b>Quellen und Lizenzen</b></span></a></div>
      <p class="hint">Live-Himmel, Zeitreise, Entdecken, Erinnerungen, Poster, Kinoflug, Sternenlicht und Sternschnuppen</p>`;
  }
  $('sheetBody').addEventListener('click', e => {
    const t = e.target;
    let b;
    if ((b = t.closest('[data-jump]'))) { jumpEvent(b.dataset.jump); return; }
    if ((b = t.closest('[data-mem]'))) { const m = mems.find(x => x.id === +b.dataset.mem); if (m) jumpMem(m); return; }
    if ((b = t.closest('[data-ev]'))) { jumpDiscover(discCache.ev[+b.dataset.ev]); return; }
    if ((b = t.closest('[data-moment]'))) { jumpMoment(MOMENTS.find(m => m.id === b.dataset.moment)); return; }
    if ((b = t.closest('[data-act]'))) {
      const a = b.dataset.act;
      if (a === 'date') { closeSheet(); openDateModal(); }
      else if (a === 'birth') { closeSheet(); openDateModal(true); }
      else if (a === 'calib') startCalib();
      else if (a === 'flight') startFlight();
      else if (a === 'poster') openPoster();
      else if (a === 'memSave') saveMem();
      else if (a === 'memDel') delMem(+b.dataset.id, b);
      else if (a === 'memPoster') { const m = mems.find(x => x.id === +b.dataset.id); if (m) openPoster({ ms: m.ms, lat: m.lat, lon: m.lon, place: m.place, az: m.az, alt: m.alt, fov: m.fov, title: m.title }); }
      else if (a === 'locate') locate();
      else if (a === 'coords') { const la = parseFloat($('inLat').value.replace(',', '.')), lo = parseFloat($('inLon').value.replace(',', '.')); if (isNaN(la) || isNaN(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) { toast('Bitte gültige Koordinaten eingeben.'); return; } setLocation(la, lo, null); renderSheet(); }
      return;
    }
    if ((b = t.closest('[data-city]'))) { const c = CITIES[+b.dataset.city]; setLocation(c[1], c[2], c[0]); closeSheet(); return; }
    if ((b = t.closest('[data-pol]'))) { st.pollution = +b.dataset.pol; store.set('pol', st.pollution); renderSheet(); invalidate(); return; }
    if ((b = t.closest('[data-tz]'))) { st.tz = b.dataset.tz; store.set('tz', st.tz); sunPathCache = null; renderSheet(); invalidate(); scheduleDetails(); return; }
    if ((b = t.closest('tr[data-obj]'))) { const o = JSON.parse(b.dataset.obj); closeSheet(); selectObject(o, { goto: true }); return; }
  });
  $('sheetBody').addEventListener('change', e => {
    const c = e.target.closest('[data-layer]'); if (!c) return;
    const id = c.dataset.layer;
    if (id === 'red') { st.red = c.checked; store.set('red', st.red); document.documentElement.classList.toggle('red', st.red); document.querySelector('meta[name="theme-color"]').setAttribute('content', st.red ? '#160404' : '#0b0921'); }
    else { st.layers[id] = c.checked; store.set('layers', st.layers); }
    invalidate();
  });

  /* ------------------------------------------------------------ Standort */
  function locate() {
    if (!navigator.geolocation) { toast('Standortbestimmung wird hier nicht unterstützt.', 4000); return; }
    toast('Standort wird bestimmt …', 2500);
    navigator.geolocation.getCurrentPosition(p => {
      setLocation(p.coords.latitude, p.coords.longitude, 'Mein Standort', false);
      if (st.sheetTab) renderSheet();
    }, err => { toast(err.code === 1 ? 'Standort nicht erlaubt. Du kannst einen Ort im Menü wählen.' : 'Standort nicht verfügbar. Wähle einen Ort im Menü.', 5000); }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 });
  }

  /* ------------------------------------------- Layout: freie Fläche für den Himmel */
  function measureInsets() {
    const tb = $('timebar').offsetHeight, card = $('card'), ch = card.hidden || window.innerWidth >= 720 ? 0 : card.offsetHeight + 8;
    document.documentElement.style.setProperty('--tb-h', tb + 'px');
    st.insets = { top: 100, bottom: tb + ch + 10 }; invalidate();
  }
  if (window.ResizeObserver) { const ro = new ResizeObserver(measureInsets); ro.observe($('timebar')); ro.observe($('card')); }
  window.addEventListener('resize', measureInsets);

  /* ---------------------------------------------------------------- Start */
  /* ------------------------------------------------------ Erinnerungen */
  let mems = store.get('mem', []); if (!Array.isArray(mems)) mems = [];
  const saveMems = () => store.set('mem', mems.slice(0, 200));
  function memDate(ms) { try { return dtf({ weekday: 'short', day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(ms); } catch (e) { return ''; } }
  function htmlMemories() {
    const cur = st.place;
    const list = mems.length ? mems.map(m => `<div class="memrow"><button class="item" data-mem="${m.id}"><span class="t"><b>${esc(m.title)}</b><span>${memDate(m.ms)} · ${esc(m.place)}</span></span></button><button class="btn ghost small" data-act="memPoster" data-id="${m.id}" aria-label="Poster">Poster</button><button class="btn ghost small" data-act="memDel" data-id="${m.id}" aria-label="Löschen">Löschen</button></div>`).join('') : '<p class="hint">Noch nichts gemerkt. Halte einen besonderen Himmel fest: den ersten Abend im Urlaub, einen Geburtstag, einen Mondaufgang.</p>';
    return `<h4>Diesen Himmel merken</h4>
      <p class="hint">Gespeichert werden Zeit, Ort und Blickrichtung. Alles bleibt auf deinem Gerät.</p>
      <label class="field">Name<input id="memName" maxlength="60" value="${esc(cur)}" autocomplete="off"></label>
      <div class="row" style="margin-top:0"><button class="btn" data-act="memSave">Speichern</button><button class="btn ghost" data-act="poster">Poster erstellen</button></div>
      <h4>Gemerkt${mems.length ? ' (' + mems.length + ')' : ''}</h4><div class="list">${list}</div>`;
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function saveMem() {
    const inp = $('memName'); const title = ((inp && inp.value.trim()) || st.place).slice(0, 60);
    mems.unshift({ id: Date.now(), title, ms: st.ms, lat: st.lat, lon: st.lon, place: st.place, az: st.view.az, alt: st.view.alt, fov: st.view.fov });
    saveMems(); renderSheet(); toast('Gemerkt: ' + title, 2500);
  }
  function jumpMem(m) {
    setLocation(m.lat, m.lon, m.place, true); setTime(m.ms); closeSheet(); st.sensor.on && disableSensor();
    selectObject(null); animateView(m.az, m.alt, m.fov); toast(m.title, 3000);
  }
  let delArm = null;
  function delMem(id, btn) {
    if (delArm !== id) { delArm = id; btn.textContent = 'Sicher?'; setTimeout(() => { if (delArm === id) { delArm = null; if (btn.isConnected) btn.textContent = 'Löschen'; } }, 3000); return; }
    delArm = null; mems = mems.filter(m => m.id !== id); saveMems(); renderSheet();
  }

  /* ------------------------------------------------------------- Poster */
  let posterCtx = null, posterTimer = null, posterBlob = null, posterUrl = null;
  function openPoster(ctx) {
    const src = ctx || { ms: st.ms, lat: st.lat, lon: st.lon, place: st.place, az: st.view.az, alt: st.view.alt, fov: st.view.fov };
    const inp = $('memName');
    posterCtx = Object.assign({ mode: 'view', size: 2, note: '' }, src, { title: (ctx && ctx.title) || (inp && inp.value.trim()) || src.place });
    closeSheet(); $('poster').hidden = false; $('posterTitle').value = posterCtx.title; $('posterNote').value = '';
    document.querySelectorAll('#poster [data-psize]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.psize === '2')));
    document.querySelectorAll('#poster [data-pmode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.pmode === posterCtx.mode)));
    renderPoster();
  }
  function closePoster() { $('poster').hidden = true; if (posterUrl) { URL.revokeObjectURL(posterUrl); posterUrl = null; } posterBlob = null; }
  function renderPoster() {
    const c = posterCtx; if (!c) return;
    const S = c.size === 3 ? 3 : 2, PW = 1080 * S, MG = 64 * S; // S = 3: Druckgröße, 3240 px breit (A3 mit rund 280 dpi)
    let pc = document.getElementById('posterSkyCanvas');
    if (!pc) { pc = document.createElement('canvas'); pc.id = 'posterSkyCanvas'; pc.style.cssText = 'position:fixed;left:-10000px;top:0;width:960px;height:960px;pointer-events:none'; document.body.appendChild(pc); }
    // Himmel in der Auflösung zeichnen, in der er auf dem Poster steht (kein Hochskalieren beim Druckformat)
    const pcCss = S === 3 ? Math.max(960, Math.ceil((PW - 2 * MG) / Math.min(window.devicePixelRatio || 1, 2.5))) : 960;
    pc.style.width = pc.style.height = pcCss + 'px';
    if (!renderPoster.R) renderPoster.R = Render.create(pc);
    const jd = A.toJD(c.ms), sk = A.skyState(jd, c.lat, c.lon, 0);
    const zen = c.mode === 'zenith';
    const basis = zen ? basisFromAzAlt(180, 89.9) : basisFromAzAlt(c.az, c.alt);
    renderPoster.R.draw({ sky: sk, basis, fov: zen ? 165 : c.fov, layers: Object.assign({}, st.layers, { sunPath: false }), red: false, ar: false, pollution: st.pollution, selected: null, target: null, sunPath: null, nowMs: 0, cyFrac: 0.5, insets: { top: 0, bottom: 0 } });
    const SANS = '-apple-system, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif';

    // Layout von oben nach unten berechnen, damit nichts überlappt
    const titleTop = MG + 62 * S, taglineY = titleTop + 40 * S, ruleY = taglineY + 34 * S;
    const skyTop = ruleY + 40 * S, SK = PW - 2 * MG, skyBottom = skyTop + SK;
    const note = (c.note || '').trim(), noteH = note ? 64 * S : 0;
    const metaTop = skyBottom + 62 * S + noteH, rowH = 76 * S, metaRows = 3;
    const footerY = metaTop + metaRows * rowH + 34 * S;
    const PH = footerY + 40 * S;

    const out = document.createElement('canvas'); out.width = PW; out.height = PH; const g = out.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 0, PH); bg.addColorStop(0, '#0b0921'); bg.addColorStop(0.55, '#150f3c'); bg.addColorStop(1, '#1c1352'); g.fillStyle = bg; g.fillRect(0, 0, PW, PH);

    /* --- Titel --- */
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    let fs = 62 * S; g.font = '700 ' + fs + 'px ' + SANS;
    while (g.measureText(c.title).width > (PW - 2 * MG) && fs > 30 * S) { fs -= 2 * S; g.font = '700 ' + fs + 'px ' + SANS; }
    g.fillStyle = '#f6f2ff'; g.fillText(c.title, MG, titleTop);
    g.font = '600 ' + 20 * S + 'px ' + SANS; g.fillStyle = '#a99cf2';
    g.fillText(('ÜBER ' + (c.place === 'Mein Standort' ? 'meinem Standort' : c.place)).toUpperCase().split('').join(String.fromCharCode(8202)), MG, taglineY);
    g.strokeStyle = 'rgba(255,216,154,.55)'; g.lineWidth = 1.4 * S; g.beginPath(); g.moveTo(MG, ruleY); g.lineTo(MG + 64 * S, ruleY); g.stroke();

    /* --- Himmel --- */
    const rr = 30 * S; g.save(); g.beginPath();
    g.moveTo(MG + rr, skyTop); g.arcTo(MG + SK, skyTop, MG + SK, skyBottom, rr); g.arcTo(MG + SK, skyBottom, MG, skyBottom, rr); g.arcTo(MG, skyBottom, MG, skyTop, rr); g.arcTo(MG, skyTop, MG + SK, skyTop, rr);
    g.closePath(); g.clip(); g.drawImage(pc, MG, skyTop, SK, SK); g.restore();
    g.strokeStyle = 'rgba(200,190,255,.28)'; g.lineWidth = 2 * S; g.beginPath();
    g.moveTo(MG + rr, skyTop); g.arcTo(MG + SK, skyTop, MG + SK, skyBottom, rr); g.arcTo(MG + SK, skyBottom, MG, skyBottom, rr); g.arcTo(MG, skyBottom, MG, skyTop, rr); g.arcTo(MG, skyTop, MG + SK, skyTop, rr);
    g.closePath(); g.stroke();

    /* --- Widmung (optional) --- */
    if (note) {
      let nf = 30 * S; g.textAlign = 'center'; g.font = '500 ' + nf + 'px ' + SANS;
      while (g.measureText(note).width > (PW - 2 * MG) && nf > 16 * S) { nf -= S; g.font = '500 ' + nf + 'px ' + SANS; }
      g.fillStyle = '#e4dcff'; g.fillText(note, PW / 2, skyBottom + 58 * S);
    }

    /* --- Angaben --- */
    g.strokeStyle = 'rgba(255,216,154,.4)'; g.lineWidth = 1 * S; g.beginPath(); g.moveTo(MG, metaTop - 30 * S); g.lineTo(PW - MG, metaTop - 30 * S); g.stroke();
    const D = dtf({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(c.ms), T = dtf({ hour: '2-digit', minute: '2-digit' }).format(c.ms);
    const dm = (v, p, n) => { const a = Math.abs(v), d = Math.floor(a), m = Math.round((a - d) * 60); return d + '°' + String(m === 60 ? 59 : m).padStart(2, '0') + '′ ' + (v >= 0 ? p : n); };
    const label = (txt, x, yy) => { g.font = '600 ' + 15 * S + 'px ' + SANS; g.fillStyle = '#8f86c4'; g.textAlign = 'left'; g.fillText(txt.toUpperCase(), x, yy); };
    const value = (txt, x, yy) => { g.font = '500 ' + 27 * S + 'px ' + SANS; g.fillStyle = '#eee9ff'; g.textAlign = 'left'; g.fillText(txt, x, yy); };
    const colW = (PW - 2 * MG) / 2;
    let my = metaTop;
    label('Datum', MG, my); value(D, MG, my + 32 * S);
    label('Uhrzeit', MG + colW, my); value(T + ' Uhr ' + zoneName(c.ms), MG + colW, my + 32 * S);
    my += rowH;
    label('Ort', MG, my); value(dm(c.lat, 'N', 'S') + '  ·  ' + dm(c.lon, 'O', 'W'), MG, my + 32 * S);
    label('Mond', MG + colW, my); value(A.moonPhaseName(sk.moon.phase) + ', ' + Math.round(sk.moon.illum * 100) + ' %', MG + colW, my + 32 * S);
    my += rowH;
    label('Blickrichtung', MG, my); value(zen ? 'Zenit, Rundumblick' : compass(c.az) + ' · ' + Math.round(c.alt) + '° über dem Horizont', MG, my + 32 * S);

    /* --- Signatur --- */
    g.textAlign = 'right'; g.font = '700 ' + 22 * S + 'px ' + SANS; g.fillStyle = '#c9befa';
    g.fillText('Sternenhimmel · WahrZentrale', PW - MG, footerY);
    g.textAlign = 'left'; g.font = '400 ' + 18 * S + 'px ' + SANS; g.fillStyle = '#6f6799';
    g.fillText('Auf dem Gerät berechnet.', MG, footerY);

    out.toBlob(b => {
      // Reicht der Speicher für das Druckformat nicht, wird das Format zum Teilen erzeugt
      if (!b && c.size === 3) { c.size = 2; document.querySelectorAll('#poster [data-psize]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.psize === '2'))); toast('Das Druckformat ist auf diesem Gerät zu groß – es wird das Format zum Teilen erzeugt.', 5000); renderPoster(); return; }
      if (!b || $('poster').hidden) return; posterBlob = b;
      const pi = $('posterInfo'); if (pi) pi.textContent = out.width + ' × ' + out.height + ' Pixel' + (c.size === 3 ? ' · gut für A3, bei etwas Abstand auch A2' : ' · gut zum Teilen und für A4'); if (posterUrl) URL.revokeObjectURL(posterUrl); posterUrl = URL.createObjectURL(b); $('posterImg').src = posterUrl;
    }, 'image/png');
  }
  async function sharePoster() {
    if (!posterBlob) return; const name = 'Sternenhimmel-' + new Date(posterCtx.ms).toISOString().slice(0, 10) + (posterCtx.size === 3 ? '-Druck' : '') + '.png';
    try {
      const file = new File([posterBlob], name, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: posterCtx.title }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = posterUrl; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    toast('Bild gespeichert. Falls nichts geschah: Bild lange drücken und sichern.', 4500);
  }
  $('posterClose').addEventListener('click', closePoster);
  $('posterShare').addEventListener('click', sharePoster);
  $('posterTitle').addEventListener('input', () => { posterCtx.title = $('posterTitle').value.trim() || posterCtx.place; clearTimeout(posterTimer); posterTimer = setTimeout(renderPoster, 350); });
  $('posterNote').addEventListener('input', () => { posterCtx.note = $('posterNote').value; clearTimeout(posterTimer); posterTimer = setTimeout(renderPoster, 250); });
  $('poster').addEventListener('click', e => {
    const sz = e.target.closest('[data-psize]');
    if (sz) { posterCtx.size = +sz.dataset.psize; document.querySelectorAll('#poster [data-psize]').forEach(x => x.setAttribute('aria-pressed', String(x === sz))); renderPoster(); return; }
    const b = e.target.closest('[data-pmode]');
    if (b) { posterCtx.mode = b.dataset.pmode; document.querySelectorAll('#poster [data-pmode]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); renderPoster(); }
    else if (e.target === $('poster')) closePoster();
  });

  /* ------------------------------------------------------------ Kinoflug */
  let flight = null;
  function planFlight() {
    const jd = jdNow(), la = st.lat, lo = st.lon;
    const S = A.riseSet('sun', jd, la, lo, 'set', 1); if (S === null || S === undefined) return null;
    const R1 = A.riseSet('sun', S + 0.02, la, lo, 'rise', 1); if (R1 === null || R1 === undefined) return null;
    let N = null; for (let t = S; t < R1; t += 5 / 1440) if (A.skyState(t, la, lo, 0).sun.trueAlt < -15) { N = t; break; }
    const hasNight = N !== null; if (!hasNight) N = S + 2 / 24;
    const H = 1 / 24, k = [];
    k.push({ jd: S - 0.5 * H, track: 1, dalt: 6, fov: 60, dur: 0 });
    k.push({ jd: S + 0.15 * H, track: 1, dalt: 6, fov: 55, dur: 7, cap: 'Die Sonne geht unter.' });
    k.push({ jd: N, az: 180, alt: 38, fov: 95, dur: 9, cap: hasNight ? 'Die Dämmerung klingt aus. Die ersten Sterne treten hervor.' : 'Es wird dunkler. Die hellsten Sterne erscheinen.' });
    const t3 = Math.max(N + 0.5 * H, k[2].jd + 0.2 * H); k.push({ jd: t3, az: 180, alt: 72, fov: 115, dur: 8, cap: 'Der Himmel gehört jetzt den Sternen.' });
    const t5 = Math.max(R1 - 0.7 * H, t3 + 0.6 * H);
    const t4 = Math.min(Math.max(N + 5 * H, t3 + 0.3 * H), t5 - 0.3 * H);
    k.push({ jd: Math.max(t4, t3 + 0.1 * H), az: 0, alt: clamp(la, 15, 80), fov: 105, dur: 12, cap: 'Die Erde dreht sich. Alle Sterne kreisen um den Himmelspol.' });
    k.push({ jd: Math.max(t5, k[4].jd + 0.1 * H), track: 1, dalt: 10, fov: 85, dur: 10, cap: 'Der Morgen kommt.' });
    k.push({ jd: k[5].jd + 0.9 * H, track: 1, dalt: 8, fov: 60, dur: 7, cap: 'Ein neuer Tag.' });
    return k;
  }
  function keyView(k, jd) { if (!k.track) return { az: k.az, alt: k.alt, fov: k.fov }; const s = A.skyState(jd, st.lat, st.lon, 0); return { az: s.sun.az, alt: clamp(s.sun.trueAlt + k.dalt, 3, 60), fov: k.fov }; }
  function startFlight() {
    const k = planFlight(); if (!k) { toast('Hier gibt es in diesem Zeitraum keinen Sonnenuntergang. Der Kinoflug braucht ihn.', 4500); return; }
    st.sensor.on && disableSensor(); st.cam && toggleCamera();
    closeSheet(); selectObject(null); anim = null; st.vel.az = 0; st.vel.alt = 0; st.live = false; st.playing = false;
    flight = { k, total: k.reduce((a, x) => a + x.dur, 0), t0: performance.now(), idx: -1 };
    document.body.classList.add('cine'); $('cine').hidden = false; measureInsets();
    const v = keyView(k[0], k[0].jd); st.view.az = v.az; st.view.alt = v.alt; st.view.fov = v.fov; st.ms = A.fromJD(k[0].jd).getTime(); updateTransportUI();
  }
  function endFlight(done) {
    if (!flight) return; flight = null; document.body.classList.remove('cine'); $('cine').hidden = true; $('cineCap').classList.remove('on'); measureInsets(); invalidate();
    toast(done ? 'Das war der Kinoflug. Mit „Jetzt“ geht es zurück in die Gegenwart.' : 'Kinoflug beendet.', 3500);
  }
  function stepFlight(now) {
    const f = flight, el = (now - f.t0) / 1000;
    if (el >= f.total) { endFlight(true); return; }
    let acc = 0, i = 1; while (i < f.k.length - 1 && el > acc + f.k[i].dur) { acc += f.k[i].dur; i++; }
    const seg = f.k[i], p = f.k[i - 1], u = clamp((el - acc) / seg.dur, 0, 1), e = u * u * (3 - 2 * u);
    const jd = p.jd + (seg.jd - p.jd) * e; st.ms = clampMs(A.fromJD(jd).getTime());
    const a = keyView(p, p.jd), b = keyView(seg, jd), da = ((b.az - a.az + 540) % 360) - 180;
    st.view.az = A.n360(a.az + da * e); st.view.alt = a.alt + (b.alt - a.alt) * e; st.view.fov = a.fov * Math.pow(b.fov / a.fov, e);
    if (f.idx !== i) { f.idx = i; const c = $('cineCap'); c.classList.remove('on'); setTimeout(() => { if (flight) { c.textContent = seg.cap || ''; c.classList.add('on'); } }, 250); }
    $('cineFill').style.width = (el / f.total * 100).toFixed(1) + '%'; invalidate();
  }
  $('cineEnd').addEventListener('click', () => endFlight(false));
  canvas.addEventListener('pointerdown', () => { if (flight) endFlight(false); });

  /* ------------------------------------- Verknüpfung (z. B. aus TagWahr) */
  // as-index.html?lat=53.55&lon=10&t=2026-08-12T18:29:00Z&obj=moon&fov=8&name=Hamburg&flight=1
  function applyDeepLink() {
    let q; try { q = new URLSearchParams(location.search); } catch (e) { return false; }
    if (!['lat', 'lon', 't', 'obj', 'flight', 'live'].some(k => q.has(k))) return false;
    store.set('welcomed', true);
    const la = parseFloat(q.get('lat')), lo = parseFloat(q.get('lon'));
    if (isFinite(la) && isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180) setLocation(la, lo, (q.get('name') || '').slice(0, 60) || null, true);
    const t = Date.parse(q.get('t') || ''); if (isFinite(t)) setTime(t);
    sky = A.skyState(jdNow(), st.lat, st.lon, 0);
    const os = (q.get('obj') || '').toLowerCase(); let o = null;
    if (os === 'sun' || os === 'sonne') o = { kind: 'sun' }; else if (os === 'moon' || os === 'mond') o = { kind: 'moon' };
    else if (os) {
      const pi = A.PLANETS.findIndex(n => n === os || (PNAME[n] || '').toLowerCase() === os); if (pi >= 0) o = { kind: 'planet', ref: pi };
      else { const si = ST.stars.findIndex(s => s.name && s.name.toLowerCase() === os); if (si >= 0) o = { kind: 'star', ref: si }; }
    }
    const fov = parseFloat(q.get('fov')); if (o) selectObject(o, { goto: true, fov: isFinite(fov) ? clamp(fov, 1, 120) : undefined });
    if (q.get('flight') === '1') setTimeout(startFlight, 600);
    return true;
  }

  function init() {
    document.documentElement.classList.toggle('red', st.red);
    st.sensor.offset = store.get('offset', 0) || 0;
    $('place').textContent = st.place;
    buildTransport(); updateTransportUI(); measureInsets();
    st.cyFrac = clamp((st.insets.top + (canvas.clientHeight - st.insets.bottom)) / 2 / Math.max(canvas.clientHeight, 1), 0.3, 0.55);
    st.view.alt = Math.max(st.view.alt, viewFloor()); // Startblick: Horizont unten, Himmel füllt das Bild
    applyDeepLink();
    // Zurück auf automatischen Standort (in einer anderen App gewählt): aktuellen Standort holen
    if (store.get('relocate', false)) {
      store.set('relocate', false);
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'geolocation' }).then(s => { if (s.state === 'granted') locate(); }).catch(() => {});
      }
    }
    // Erststart: Standortabfrage anbieten – automatischer Standort hat nach bereits erteilter
    // Freigabe immer Vorrang, dann wird er direkt übernommen statt erneut nachzufragen.
    if (!store.get('welcomed', false)) {
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'geolocation' }).then(status => {
          if (status.state === 'granted') { store.set('welcomed', true); locate(); }
          else showWelcome();
        }).catch(() => showWelcome());
      } else {
        showWelcome();
      }
    }
    requestAnimationFrame(frame);
  }
  function showWelcome() {
    $('welcome').hidden = false;
    $('wLoc').addEventListener('click', () => { store.set('welcomed', true); $('welcome').hidden = true; locate(); });
    $('wLater').addEventListener('click', () => { store.set('welcomed', true); $('welcome').hidden = true; toast('Ort später im Menü unter „Ort“ einstellen.', 3500); });
  }
  window.__zh = {
    st, A, R, setTime: iso => setTime(Date.parse(iso)), setLoc: (la, lo, n) => setLocation(la, lo, n || 'Test', true), setView: (az, alt, fov) => { st.view.az = az; st.view.alt = alt; if (fov) st.view.fov = fov; invalidate(); },
    select: o => selectObject(o), layers: st.layers, invalidate, sky: () => sky, frameInfo: () => frameInfo, onOrient, moment: id => jumpMoment(MOMENTS.find(m => m.id === id)), MOMENTS, openSheet, jump: jumpEvent, closeSheet, enableSensor,
    hit: (x, y) => R.hitTest(x, y), floor: f => viewFloor(f)
  };
  init();
})();
