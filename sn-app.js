/* ============================================================
   StaunWahr – Teil der WahrZentrale
   © 2026 Jan Dierlich – Alle Rechte vorbehalten.

   Vier Bereiche: DurchblickWahr (durch die Erde), LichtechoWahr (Stern zum
   eigenen Moment), PlanetenWahr (Sonnensystem im Maßstab) und RaumTacho
   (eigene Geschwindigkeit im All).

   Alles wird auf dem Gerät berechnet. Ländergrenzen: Natural Earth
   (gemeinfrei, wow-world.json), Sterne: eigene Zusammenstellung
   (sternewahr-stars.js), Himmelsmechanik: sternewahr-astro.js.
   Kartenkacheln (nur Planetenweg, nur nach Zustimmung): OpenStreetMap
   über tile.openstreetmap.de (FOSSGIS e.V.).
   Alle Zeichnungen und Symbole sind eigene Arbeiten.
   ============================================================ */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var A = window.Astro, ST = window.Stars;
  var D2R = Math.PI / 180, R2D = 180 / Math.PI, TAU = Math.PI * 2;
  var R_EARTH = 6371;               // km, mittlerer Radius
  var AU = 1.495978707e11;          // m
  var LY_M = 9.4607304725808e15;    // m
  var reduceMotion = false;
  try { reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { }

  /* ---------------- Hilfen ---------------- */
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function fmt(n, d) {
    d = d || 0;
    return Number(n).toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function icon(id) { return '<svg class="wzi" aria-hidden="true"><use href="#wzi-' + id + '"></use></svg>'; }
  function km(x) {
    if (x < 1) return fmt(x * 1000, 0) + " m";
    if (x < 10) return fmt(x, 1) + " km";
    return fmt(x, 0) + " km";
  }
  var DIRS = ["N", "NO", "O", "SO", "S", "SW", "W", "NW"];
  var DIRS_LONG = ["Norden", "Nordosten", "Osten", "Südosten", "Süden", "Südwesten", "Westen", "Nordwesten"];
  function dirWord(az, long) { var i = Math.round(((az % 360) + 360) % 360 / 45) % 8; return long ? DIRS_LONG[i] : DIRS[i]; }
  function hav(lat1, lon1, lat2, lon2) {
    var p1 = lat1 * D2R, p2 = lat2 * D2R, dp = p2 - p1, dl = (lon2 - lon1) * D2R;
    var a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(a)));
  }
  function destPoint(lat, lon, brg, distM) {
    var d = distM / (R_EARTH * 1000), b = brg * D2R, p1 = lat * D2R, l1 = lon * D2R;
    var p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b));
    var l2 = l1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
    return { lat: p2 * R2D, lon: ((l2 * R2D + 540) % 360) - 180 };
  }
  function bearing(lat1, lon1, lat2, lon2) {
    var p1 = lat1 * D2R, p2 = lat2 * D2R, dl = (lon2 - lon1) * D2R;
    var y = Math.sin(dl) * Math.cos(p2), x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
    return (Math.atan2(y, x) * R2D + 360) % 360;
  }
  function durTxt(sec) {
    if (sec < 90) return fmt(sec, 0) + " s";
    var m = Math.round(sec / 60);
    if (m < 90) return m + " min";
    var h = Math.floor(m / 60), r = m % 60;
    if (h < 48) return h + " h" + (r ? " " + r + " min" : "");
    var dd = Math.floor(h / 24), hh = h % 24;
    return dd + " Tage" + (hh ? " " + hh + " h" : "");
  }
  function isDark() { return document.documentElement.classList.contains("theme-dark"); }

  /* Canvas mit Pixeldichte vorbereiten */
  function prep(cv) {
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    var w = cv.clientWidth || 300, h = cv.clientHeight || w;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    var c = cv.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    return { c: c, W: w, H: h, dpr: dpr };
  }
  var FONT = "-apple-system,system-ui,sans-serif";
  var MONO = "ui-monospace,Menlo,monospace";
  var VIOLET = "#B9A6F5", GOLD = "#FFD27A", SOFT = "rgba(226,220,255,.72)", FAINT = "rgba(226,220,255,.18)";

  /* ---------------- Standort (gemeinsam mit allen Apps) ---------------- */
  var LOC = { lat: 53.55, lon: 10.0, name: "Hamburg", src: "default" };
  function readLoc() {
    var c = lsGet("wz_location", null);
    if (c && c.mode === "manual" && isFinite(c.lat) && isFinite(c.lon)) { LOC = { lat: +c.lat, lon: +c.lon, name: c.name || "Gewählter Ort", src: "manual" }; return; }
    var g = lsGet("wz_last_gps", null);
    if (g && isFinite(g.lat) && isFinite(g.lon)) { LOC = { lat: +g.lat, lon: +g.lon, name: g.name || cachedPlaceName(g.lat, g.lon) || "Dein Standort", src: "gps" }; return; }
  }
  function cachedPlaceName(lat, lon) {
    try { var cch = JSON.parse(localStorage.getItem("wz_place_name_cache") || "{}"); return cch[(+lat).toFixed(2) + "," + (+lon).toFixed(2)] || ""; } catch (e) { return ""; }
  }
  function locLabel() {
    $("snLocName").textContent = LOC.src === "default" ? "Noch kein Standort – Beispiel Hamburg" : LOC.name + (LOC.src === "gps" ? " (GPS)" : "");
    $("snLocBtn").textContent = LOC.src === "default" ? "Standort wählen" : "ändern";
  }
  /* Ortswahl: offline aus den mitgelieferten Ortsdaten (Natural Earth, GeoNames) */
  var PLUS = null, plusP = null;
  function loadPlus() {
    if (plusP) return plusP;
    plusP = fetch("wow-places-plus.json").then(function (r) { return r.json(); }).then(function (l) {
      PLUS = l.map(function (x) { return { n: x[0], lat: x[1], lon: x[2], c: x[3], r: "", pop: 0, k: normTxt(x[0]) }; });
      return PLUS;
    }).catch(function () { plusP = null; return null; });
    return plusP;
  }
  function locSearch() {
    var q = normTxt($("snLocSearch").value), res = $("snLocRes");
    if (q.length < 2) { res.innerHTML = ""; return; }
    var seen = {}, hits = [];
    var take = function (list) {
      if (!list) return;
      for (var i = 0; i < list.length && hits.length < 40; i++) {
        var p = list[i];
        if (p.k.indexOf(q) !== 0 && !(q.length > 3 && p.k.indexOf(" " + q) >= 0)) continue;
        var key = p.n + "|" + p.lat.toFixed(1) + "|" + p.lon.toFixed(1); if (seen[key]) continue; seen[key] = 1; hits.push(p);
      }
    };
    take(GEO.all); take(PLUS);
    hits.sort(function (a, b) { return (b.k === q) - (a.k === q) || b.pop - a.pop; });
    hits = hits.slice(0, 8);
    res.innerHTML = hits.length ? hits.map(function (p, i) { return '<button type="button" data-i="' + i + '">' + esc(p.n) + '<span>' + esc(countryName(p.c)) + (p.r ? " · " + esc(p.r) : "") + " · " + fmt(Math.abs(p.lat), 2) + "° " + (p.lat >= 0 ? "N" : "S") + ", " + fmt(Math.abs(p.lon), 2) + "° " + (p.lon >= 0 ? "O" : "W") + '</span></button>'; }).join("") : '<p class="muted small" style="margin:8px 0 0">' + (PLUS ? "Kein Ort gefunden." : "Suche läuft …") + '</p>';
    Array.prototype.forEach.call(res.querySelectorAll("button"), function (b) { b.addEventListener("click", function () { pickPlace(hits[+b.getAttribute("data-i")]); }); });
  }
  function pickPlace(p) {
    if (window.wzCore && wzCore.setManualLocation) wzCore.setManualLocation(p.lat, p.lon, p.n);
    else lsSet("wz_location", { mode: "manual", lat: p.lat, lon: p.lon, name: p.n });
    LOC = { lat: p.lat, lon: p.lon, name: p.n, src: "manual" };
    XR.exitCache = {}; if (XR.sky) XR.sky.t = 0;
    locClose(); locLabel(); refreshAll();
    if (window.wzToast) wzToast("Standort: " + p.n);
  }
  function locOpen() {
    $("snLocSheet").hidden = false; $("snLocSearch").value = ""; $("snLocRes").innerHTML = "";
    $("snLocNote").textContent = LOC.src === "manual" ? "Aktuell gewählt: " + LOC.name : "";
    loadGeo(); loadPlus().then(function () { if ($("snLocSearch").value) locSearch(); });
    setTimeout(function () { try { $("snLocSearch").focus(); } catch (e) { } }, 60);
  }
  function locClose() { $("snLocSheet").hidden = true; }
  function askGps(cb) {
    if (!navigator.geolocation) { if (window.wzToast) wzToast("Standort ist auf diesem Gerät nicht verfügbar."); return; }
    $("snLocName").textContent = "Standort wird bestimmt …";
    navigator.geolocation.getCurrentPosition(function (p) {
      var old = lsGet("wz_last_gps", null);
      var name = old && old.name && hav(old.lat, old.lon, p.coords.latitude, p.coords.longitude) < 3 ? old.name : (cachedPlaceName(p.coords.latitude, p.coords.longitude) || "Dein Standort");
      LOC = { lat: p.coords.latitude, lon: p.coords.longitude, name: name, src: "gps" };
      if (window.wzCore && wzCore.rememberGps) wzCore.rememberGps(LOC.lat, LOC.lon, name === "Dein Standort" ? "" : name);
      else lsSet("wz_last_gps", { lat: LOC.lat, lon: LOC.lon, name: name === "Dein Standort" ? "" : name, t: Date.now() });
      locLabel(); refreshAll(); if (cb) cb();
    }, function () {
      locLabel();
      if (window.wzToast) wzToast("Standort nicht verfügbar – es wird der zuletzt bekannte Ort verwendet.");
    }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 });
  }

  /* ---------------- Lage des Geräts (gleiche Rechnung wie HorizontWahr) ---------------- */
  var ORI = (function () {
    function wrap360(d) { d %= 360; return d < 0 ? d + 360 : d; }
    function qFromAngles(a, b, g) {
      var _z = (a || 0) * D2R, _x = (b || 0) * D2R, _y = (g || 0) * D2R;
      var cX = Math.cos(_x / 2), cY = Math.cos(_y / 2), cZ = Math.cos(_z / 2), sX = Math.sin(_x / 2), sY = Math.sin(_y / 2), sZ = Math.sin(_z / 2);
      return [sX * cY * cZ - cX * sY * sZ, cX * sY * cZ + sX * cY * sZ, cX * cY * sZ + sX * sY * cZ, cX * cY * cZ - sX * sY * sZ];
    }
    function qMul(a, b) {
      return [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
        a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
    }
    function qAxis(ax, rad) { var s = Math.sin(rad / 2); return [ax[0] * s, ax[1] * s, ax[2] * s, Math.cos(rad / 2)]; }
    function qNorm(q) { var n = Math.hypot(q[0], q[1], q[2], q[3]) || 1; return [q[0] / n, q[1] / n, q[2] / n, q[3] / n]; }
    function qSlerp(a, b, t) {
      var bx = b[0], by = b[1], bz = b[2], bw = b[3], dot = a[0] * bx + a[1] * by + a[2] * bz + a[3] * bw;
      if (dot < 0) { bx = -bx; by = -by; bz = -bz; bw = -bw; dot = -dot; }
      if (dot > 0.9995) return qNorm([a[0] + (bx - a[0]) * t, a[1] + (by - a[1]) * t, a[2] + (bz - a[2]) * t, a[3] + (bw - a[3]) * t]);
      var th0 = Math.acos(Math.min(1, dot)), th = th0 * t, s0 = Math.cos(th) - dot * Math.sin(th) / Math.sin(th0), s1 = Math.sin(th) / Math.sin(th0);
      return [a[0] * s0 + bx * s1, a[1] * s0 + by * s1, a[2] * s0 + bz * s1, a[3] * s0 + bw * s1];
    }
    function qRot(q, v) {
      var qx = q[0], qy = q[1], qz = q[2], qw = q[3], tx = 2 * (qy * v[2] - qz * v[1]), ty = 2 * (qz * v[0] - qx * v[2]), tz = 2 * (qx * v[1] - qy * v[0]);
      return [v[0] + qw * tx + (qy * tz - qz * ty), v[1] + qw * ty + (qz * tx - qx * tz), v[2] + qw * tz + (qx * ty - qy * tx)];
    }
    function makeYawOffset() {
      var cur = null, fast = 0, last = 0, w = function (d) { return ((d + 540) % 360) - 180; };
      return function (target, now) {
        if (cur === null || !(now - last < 1000)) { cur = fast = target; last = now; return cur; }
        var dt = Math.max(0, now - last); last = now;
        fast = (fast + w(target - fast) * (1 - Math.exp(-dt / 250)) + 360) % 360;
        var bias = w(fast - cur), a = Math.abs(bias), tau = a > 20 ? 100 : a > 6 ? 300 : a > 2.5 ? 700 : 2000;
        cur = (cur + bias * (1 - Math.exp(-dt / tau)) + 360) % 360;
        return cur;
      };
    }
    var st = { raw: null, absSeen: false, smQ: null, smT: 0, yaw: makeYawOffset(), on: false };
    function store(e, ok) { st.raw = { alpha: e.alpha, beta: e.beta, gamma: e.gamma, webkit: (e.webkitCompassHeading != null ? e.webkitCompassHeading : null), ok: ok }; }
    function onAbs(e) { if (e.alpha == null) return; st.absSeen = true; store(e, true); }
    function onOri(e) {
      if (e.beta == null) return;
      if (e.webkitCompassHeading != null) { store(e, true); return; }
      if (st.absSeen) return;
      store(e, e.absolute === true);
    }
    function permit() {
      var p = (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function")
        ? DeviceOrientationEvent.requestPermission() : Promise.resolve(typeof DeviceOrientationEvent !== "undefined" ? "granted" : "unsupported");
      return p.then(function (r) {
        if (r === "unsupported") throw new Error("Dieses Gerät liefert keine Lagedaten.");
        if (r !== "granted") throw new Error("Der Zugriff auf die Bewegungs- und Lagesensoren wurde nicht erlaubt. Du kannst ihn in den Einstellungen deines Browsers wieder erlauben.");
      });
    }
    function start() { if (st.on) return; st.on = true; window.addEventListener("deviceorientationabsolute", onAbs, true); window.addEventListener("deviceorientation", onOri, true); }
    function stop() { st.on = false; window.removeEventListener("deviceorientationabsolute", onAbs, true); window.removeEventListener("deviceorientation", onOri, true); st.raw = null; st.absSeen = false; st.smQ = null; }
    function attitude() {
      var r = st.raw; if (!r || r.beta == null) return null;
      var alphaEff;
      if (r.webkit != null) {
        var gyroYaw = typeof r.alpha === "number" && !isNaN(r.alpha), a0 = gyroYaw ? r.alpha : 0;
        var q0 = qFromAngles(a0, r.beta, r.gamma || 0), f0 = qRot(q0, [0, 0, -1]);
        var ref = Math.abs(f0[2]) < 0.7 ? f0 : qRot(q0, [0, 1, 0]);
        var h0 = wrap360(Math.atan2(ref[0], ref[1]) / D2R), d = wrap360(r.webkit - h0);
        if (gyroYaw) d = st.yaw(d, performance.now());
        alphaEff = wrap360(a0 - d);
      } else alphaEff = (r.alpha || 0);
      var q = qFromAngles(alphaEff, r.beta, r.gamma || 0);
      var ang = (screen.orientation && typeof screen.orientation.angle === "number") ? screen.orientation.angle : (window.orientation || 0);
      ang = ((ang % 360) + 360) % 360;
      return { q: qNorm(qMul(q, qAxis([0, 0, 1], -ang * D2R))), ok: r.webkit != null || r.ok };
    }
    function smoothQ(att, tau) {
      var now = performance.now();
      if (!st.smQ) { st.smQ = att.q; st.smT = now; return st.smQ; }
      var dt = Math.min(200, Math.max(0, now - st.smT)); st.smT = now;
      st.smQ = qSlerp(st.smQ, att.q, 1 - Math.exp(-dt / (tau || 60)));
      return st.smQ;
    }
    /* Richtung, in die die Rückseite (Kamera) zeigt */
    function back(q) {
      var fw = qRot(q, [0, 0, -1]);
      return { az: wrap360(Math.atan2(fw[0], fw[1]) / D2R), alt: Math.asin(clamp(fw[2], -1, 1)) / D2R };
    }
    function view(q) { return { fw: qRot(q, [0, 0, -1]), rt: qRot(q, [1, 0, 0]), up: qRot(q, [0, 1, 0]) }; }
    return { permit: permit, start: start, stop: stop, attitude: attitude, smooth: smoothQ, back: back, view: view, state: st };
  })();

  /* ---------------- Ländergrenzen (Natural Earth, gemeinfrei) ---------------- */
  var GEO = { world: null, places: null, loading: null };
  function decode(arr) {
    var out = new Float32Array(arr.length), x = 0, y = 0;
    for (var i = 0; i < arr.length; i += 2) { x += arr[i]; y += arr[i + 1]; out[i] = x / 100; out[i + 1] = y / 100; }
    return out;
  }
  function loadGeo() {
    if (GEO.loading) return GEO.loading;
    GEO.loading = fetch("wow-world.json").then(function (r) { return r.json(); }).then(function (w) {
      w.forEach(function (c) { c.polys = c.p.map(function (poly) { return poly.map(decode); }); delete c.p; });
      GEO.world = w;
      fetch("wow-places.json").then(function (r) { return r.json(); }).then(function (p) {
        GEO.all = p.map(function (x) { return { n: x[0], lat: x[1], lon: x[2], c: x[3], r: x[4] || "", pop: x[5] || 0, k: normTxt(x[0]) }; });
        GEO.places = GEO.all.filter(function (x) { return x.pop >= 20000; });
        dbExamples();
        if (DB.ready) DB.update(true);
      }).catch(function () { });
      return w;
    });
    return GEO.loading;
  }
  function normTxt(t) { return String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim(); }
  function inRing(r, lon, lat) {
    var inside = false;
    for (var i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
      var xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1];
      if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }
  function countryAt(lat, lon) {
    if (!GEO.world) return null;
    for (var k = 0; k < GEO.world.length; k++) {
      var c = GEO.world[k], b = c.bb;
      if (lon < b[0] - .01 || lon > b[2] + .01 || lat < b[1] - .01 || lat > b[3] + .01) continue;
      for (var p = 0; p < c.polys.length; p++) {
        var rings = c.polys[p];
        if (inRing(rings[0], lon, lat)) {
          var hole = false;
          for (var h = 1; h < rings.length; h++) if (inRing(rings[h], lon, lat)) { hole = true; break; }
          if (!hole) return c;
        }
      }
    }
    return null;
  }
  function nearestLand(lat, lon) {
    if (!GEO.world) return null;
    var best = null, bd = 1e9;
    var cl = Math.cos(lat * D2R);
    for (var k = 0; k < GEO.world.length; k++) {
      var c = GEO.world[k], b = c.bb;
      // grobe Vorauswahl über das Begrenzungsrechteck
      var dLat = Math.max(0, b[1] - lat, lat - b[3]) * 111;
      if (dLat > bd) continue;
      for (var p = 0; p < c.polys.length; p++) {
        var r = c.polys[p][0];
        for (var i = 0; i < r.length; i += 4) {
          var dy = (r[i + 1] - lat) * 111;
          if (Math.abs(dy) > bd) continue;
          var d = hav(lat, lon, r[i + 1], r[i]);
          if (d < bd) { bd = d; best = { c: c, d: d, lat: r[i + 1], lon: r[i] }; }
        }
      }
    }
    return best;
  }
  function nearestPlace(lat, lon) {
    if (!GEO.places) return null;
    var best = null, bd = 1e9;
    for (var i = 0; i < GEO.places.length; i++) {
      var p = GEO.places[i];
      if (Math.abs(p.lat - lat) * 111 > bd) continue;
      var d = hav(lat, lon, p.lat, p.lon);
      if (d < bd) { bd = d; best = p; }
    }
    return best ? { p: best, d: bd } : null;
  }
  function countryName(id) {
    if (!GEO.world) return id;
    for (var i = 0; i < GEO.world.length; i++) if (GEO.world[i].id === id) return GEO.world[i].de;
    return id;
  }
  /* Meeresname (vereinfachte Grenzen, nur für Wasserflächen) */
  function oceanName(lat, lon) {
    if (lat < -60) return "Südlicher Ozean";
    if (lat > 66) return "Arktischer Ozean";
    if (lat > 53 && lat < 66 && lon > 9 && lon < 30) return "Ostsee";
    if (lat > 51 && lat <= 61 && lon > -4 && lon <= 9) return "Nordsee";
    if (lat > 30 && lat < 46 && lon > -6 && lon < 36.5) return "Mittelmeer";
    if (lat > 40.5 && lat < 47.5 && lon > 27 && lon < 42) return "Schwarzes Meer";
    if (lat > 12 && lat < 30 && lon > 32 && lon < 44) return "Rotes Meer";
    if (lat > 23 && lat < 31 && lon > 47 && lon < 57) return "Persischer Golf";
    var west;
    if (lat >= 18) west = -98; else if (lat >= 14) west = -88.5; else if (lat >= 8) west = -83.6; else if (lat >= 0) west = -77; else if (lat >= -56) west = -70; else west = -67;
    var atlEast = lat > 30 ? 60 : 20;
    if (lon > west && lon < atlEast && !(lat < 30 && lon > 20)) return "Atlantischer Ozean";
    if (lon >= 20 && lon < 100 && lat < 30) return "Indischer Ozean";
    if (lon >= 100 && lon < 147 && lat < (lon < 106 ? 6 : -9)) return "Indischer Ozean";
    return "Pazifischer Ozean";
  }

  /* ---------------- Erdkugel zeichnen (orthografisch) ---------------- */
  function drawGlobe(c, cx, cy, r, lat0, lon0, opt) {
    opt = opt || {};
    var sp0 = Math.sin(lat0 * D2R), cp0 = Math.cos(lat0 * D2R);
    function proj(lat, lon) {
      var p = lat * D2R, dl = (lon - lon0) * D2R, cp = Math.cos(p), sp = Math.sin(p), cdl = Math.cos(dl);
      var x = cp * Math.sin(dl), y = cp0 * sp - sp0 * cp * cdl, z = sp0 * sp + cp0 * cp * cdl;
      if (z < 0) { var n = Math.hypot(x, y) || 1; x /= n; y /= n; }
      return [cx + x * r, cy - y * r, z];
    }
    var g = c.createRadialGradient(cx - r * .35, cy - r * .4, r * .1, cx, cy, r);
    g.addColorStop(0, opt.ocean0 || "#2C3270"); g.addColorStop(1, opt.ocean1 || "#121436");
    c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.fillStyle = g; c.fill();
    c.save(); c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.clip();
    // Gradnetz
    if (opt.grid !== false) {
      c.strokeStyle = "rgba(185,166,245,.13)"; c.lineWidth = .7;
      for (var la = -60; la <= 60; la += 30) { c.beginPath(); var f = true; for (var lo = -180; lo <= 180; lo += 4) { var q = proj(la, lo); if (q[2] < 0) { f = true; continue; } if (f) { c.moveTo(q[0], q[1]); f = false; } else c.lineTo(q[0], q[1]); } c.stroke(); }
      for (var lo2 = -180; lo2 < 180; lo2 += 30) { c.beginPath(); var f2 = true; for (var la2 = -88; la2 <= 88; la2 += 4) { var q2 = proj(la2, lo2); if (q2[2] < 0) { f2 = true; continue; } if (f2) { c.moveTo(q2[0], q2[1]); f2 = false; } else c.lineTo(q2[0], q2[1]); } c.stroke(); }
    }
    if (GEO.world) {
      c.fillStyle = opt.land || "#7563C9"; c.strokeStyle = opt.coast || "rgba(226,220,255,.55)"; c.lineWidth = .6;
      for (var k = 0; k < GEO.world.length; k++) {
        var co = GEO.world[k];
        var mlon = (co.bb[0] + co.bb[2]) / 2, mlat = (co.bb[1] + co.bb[3]) / 2;
        // Länder ganz auf der Rückseite überspringen
        var ext = Math.max(co.bb[2] - co.bb[0], co.bb[3] - co.bb[1]);
        var zc = sp0 * Math.sin(mlat * D2R) + cp0 * Math.cos(mlat * D2R) * Math.cos((mlon - lon0) * D2R);
        if (ext < 40 && zc < -0.35) continue;
        var hl = opt.highlight && co.id === opt.highlight;
        c.beginPath();
        for (var p = 0; p < co.polys.length; p++) {
          var ring = co.polys[p][0], any = false, step = r < 120 ? 4 : 2;
          for (var i = 0; i < ring.length; i += step) {
            var pt = proj(ring[i + 1], ring[i]);
            if (pt[2] > 0) any = true;
            if (i === 0) c.moveTo(pt[0], pt[1]); else c.lineTo(pt[0], pt[1]);
          }
          if (!any) { /* nichts sichtbar */ }
          c.closePath();
        }
        c.fillStyle = hl ? (opt.hlFill || GOLD) : (opt.land || "#7563C9");
        c.fill("evenodd");
        if (r > 80) c.stroke();
      }
    }
    // Tag/Nacht
    if (opt.sun) {
      var s = opt.sun; // Unterpunkt der Sonne
      var sv = [Math.cos(s.lat * D2R) * Math.cos(s.lon * D2R), Math.cos(s.lat * D2R) * Math.sin(s.lon * D2R), Math.sin(s.lat * D2R)];
      // Mittelpunkt der Ansicht und Achsen im Erdsystem
      var l0 = lon0 * D2R, p0 = lat0 * D2R;
      var Z = [Math.cos(p0) * Math.cos(l0), Math.cos(p0) * Math.sin(l0), Math.sin(p0)];
      var E = [-Math.sin(l0), Math.cos(l0), 0];
      var N = [-Math.sin(p0) * Math.cos(l0), -Math.sin(p0) * Math.sin(l0), Math.cos(p0)];
      var sx = sv[0] * E[0] + sv[1] * E[1] + sv[2] * E[2], sy = sv[0] * N[0] + sv[1] * N[1] + sv[2] * N[2], sz = sv[0] * Z[0] + sv[1] * Z[1] + sv[2] * Z[2];
      // Nachtseite als Verlauf entlang der Sonnenrichtung in der Bildebene
      var L = Math.hypot(sx, sy);
      var dx = L > 1e-6 ? sx / L : 1, dy = L > 1e-6 ? -sy / L : 0;
      // Grenze liegt bei Projektion t mit t*L + sqrt(1-t^2)*sz ... Näherung: Terminator-Ellipse
      c.save();
      c.translate(cx, cy); c.rotate(Math.atan2(dy, dx));
      // Ellipse: Halbachsen r (senkrecht) und r*|sz| (in Sonnenrichtung)
      var ex = r * Math.abs(sz);
      c.beginPath();
      if (sz >= 0) {
        // Sonne vorne: Nacht ist eine Sichel auf der Gegenseite
        c.arc(0, 0, r, Math.PI / 2, Math.PI * 1.5, false);
        c.ellipse(0, 0, ex, r, 0, Math.PI * 1.5, Math.PI / 2, true);
      } else {
        c.arc(0, 0, r, Math.PI / 2, Math.PI * 1.5, false);
        c.ellipse(0, 0, ex, r, 0, Math.PI * 1.5, Math.PI / 2, false);
      }
      c.closePath();
      c.fillStyle = "rgba(6,5,20,.5)"; c.fill();
      c.restore();
    }
    c.restore();
    // Rand & Atmosphäre
    var ag = c.createRadialGradient(cx, cy, r * .96, cx, cy, r * 1.12);
    ag.addColorStop(0, "rgba(150,170,255,.35)"); ag.addColorStop(1, "rgba(150,170,255,0)");
    c.beginPath(); c.arc(cx, cy, r * 1.12, 0, TAU); c.fillStyle = ag; c.fill();
    c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.strokeStyle = "rgba(226,220,255,.35)"; c.lineWidth = 1; c.stroke();
    return proj;
  }
  /* ---------- Ruhig drehende Erdkugel (Pixel für Pixel, ohne Flackern) ----------
     Einmalig wird aus den Ländergrenzen eine Landmaske (1 Pixel = 0,5°) gezeichnet;
     die Kugel wird dann je Bild aus dieser Maske abgetastet. */
  var LANDMASK = null;
  function landMask() {
    if (LANDMASK || !GEO.world) return LANDMASK;
    var w = 720, h = 360, cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    var c = cv.getContext("2d"); c.fillStyle = "#000"; c.fillRect(0, 0, w, h); c.fillStyle = "#fff";
    GEO.world.forEach(function (co) {
      co.polys.forEach(function (rings) {
        c.beginPath();
        rings.forEach(function (r) { for (var i = 0; i < r.length; i += 2) { var x = (r[i] + 180) * 2, y = (90 - r[i + 1]) * 2; if (i) c.lineTo(x, y); else c.moveTo(x, y); } c.closePath(); });
        c.fill("evenodd");
      });
    });
    var d = c.getImageData(0, 0, w, h).data, m = new Uint8Array(w * h);
    for (var k = 0; k < w * h; k++) m[k] = d[k * 4];
    LANDMASK = { m: m, w: w, h: h };
    return LANDMASK;
  }
  var GPX = { cv: null, img: null, size: 0 };
  function drawGlobePx(c, cx, cy, r, lat0, lon0, sunLat, sunLon, mark) {
    var lm = landMask();
    if (!lm) { drawGlobe(c, cx, cy, r, lat0, lon0, { sun: { lat: sunLat, lon: sunLon }, grid: false }); return; }
    var dpr = Math.min(window.devicePixelRatio || 1, 2), N = Math.min(260, Math.round(r * 2 * dpr));
    if (GPX.size !== N) { GPX.cv = document.createElement("canvas"); GPX.cv.width = GPX.cv.height = N; GPX.img = GPX.cv.getContext("2d").createImageData(N, N); GPX.size = N; }
    var data = GPX.img.data, p0 = lat0 * D2R, sp0 = Math.sin(p0), cp0 = Math.cos(p0), l0 = lon0 * D2R;
    var sl = sunLat * D2R, sv = [Math.cos(sl) * Math.cos(sunLon * D2R), Math.cos(sl) * Math.sin(sunLon * D2R), Math.sin(sl)];
    var half = N / 2;
    for (var py = 0; py < N; py++) {
      var y = (half - py - 0.5) / half;
      for (var px = 0; px < N; px++) {
        var x = (px + 0.5 - half) / half, rr = x * x + y * y, id = (py * N + px) * 4;
        if (rr > 1) { data[id + 3] = 0; continue; }
        var z = Math.sqrt(1 - rr);
        // Bildpunkt -> geografische Koordinaten (inverse orthografische Projektion)
        var la = Math.asin(z * sp0 + y * cp0), lo = l0 + Math.atan2(x, z * cp0 - y * sp0);
        var cla = Math.cos(la);
        var gx = cla * Math.cos(lo), gy = cla * Math.sin(lo), gz = Math.sin(la);
        var light = gx * sv[0] + gy * sv[1] + gz * sv[2];
        var day = light > 0.08 ? 1 : light < -0.08 ? 0 : (light + 0.08) / 0.16;
        var lonD = ((lo * R2D + 540) % 360) - 180, mx = Math.min(lm.w - 1, Math.max(0, Math.floor((lonD + 180) * 2))), my = Math.min(lm.h - 1, Math.max(0, Math.floor((90 - la * R2D) * 2)));
        var land = lm.m[my * lm.w + mx] > 127;
        var shade = 0.55 + 0.45 * z; // Randabdunklung
        var r0, g0, b0;
        if (land) { r0 = 132; g0 = 112; b0 = 214; } else { r0 = 40; g0 = 46; b0 = 112; }
        var f = shade * (0.38 + 0.62 * day);
        data[id] = r0 * f; data[id + 1] = g0 * f; data[id + 2] = b0 * f + (1 - day) * 10; data[id + 3] = 255;
      }
    }
    GPX.cv.getContext("2d").putImageData(GPX.img, 0, 0);
    c.drawImage(GPX.cv, cx - r, cy - r, r * 2, r * 2);
    var ag = c.createRadialGradient(cx, cy, r * 0.97, cx, cy, r * 1.12);
    ag.addColorStop(0, "rgba(150,170,255,.35)"); ag.addColorStop(1, "rgba(150,170,255,0)");
    c.beginPath(); c.arc(cx, cy, r * 1.12, 0, TAU); c.fillStyle = ag; c.fill();
  }
  function subSolar(date) {
    var jd = A.toJD(date), s = A.sun(jd);
    var lon = s.ra - A.gmst(jd);
    lon = ((lon + 540) % 360) - 180;
    return { lat: s.dec, lon: lon };
  }
  function sunAltAt(lat, lon, date) {
    var jd = A.toJD(date), s = A.sun(jd);
    var e = A.eqToEnu(A.vec(s.ra, s.dec), A.lst(jd, lon), lat);
    return A.enuToAltAz(e).alt;
  }

  /* =====================================================================
     1. DURCHBLICK
     ===================================================================== */
  var LAYERS = [
    { n: "Erdkruste", r0: 6336, r1: 6371, col: "#B7A8EE" },
    { n: "Erdmantel", r0: 3480, r1: 6336, col: "#D9673E" },
    { n: "Äußerer Kern (flüssig)", r0: 1221, r1: 3480, col: "#F2A048" },
    { n: "Innerer Kern (fest)", r0: 0, r1: 1221, col: "#FFE3A0" }
  ];
  // grobe Richtwerte (Tiefe km -> °C bzw. GPa)
  var TEMP = [[0, 15], [35, 500], [660, 1900], [2891, 3800], [5150, 5300], [6371, 5500]];
  var PRESS = [[0, 0], [35, 1], [660, 24], [2891, 136], [5150, 330], [6371, 364]];
  function interp(tab, x) { for (var i = 1; i < tab.length; i++) if (x <= tab[i][0]) return lerp(tab[i - 1][1], tab[i][1], (x - tab[i - 1][0]) / (tab[i][0] - tab[i - 1][0])); return tab[tab.length - 1][1]; }

  var DB = {
    az: 0, dip: 90, sensor: false, ready: false, raf: 0, last: null, heavyT: 0, pending: false,
    chord: function (lat, lon, az, dip) {
      var a = lat * D2R, b = lon * D2R;
      var U = [Math.cos(a) * Math.cos(b), Math.cos(a) * Math.sin(b), Math.sin(a)];
      var E = [-Math.sin(b), Math.cos(b), 0];
      var N = [-Math.sin(a) * Math.cos(b), -Math.sin(a) * Math.sin(b), Math.cos(a)];
      var ca = Math.cos(dip * D2R), sa = Math.sin(dip * D2R), sz = Math.sin(az * D2R), cz = Math.cos(az * D2R);
      var d = [0, 1, 2].map(function (i) { return ca * (sz * E[i] + cz * N[i]) - sa * U[i]; });
      var L = 2 * sa;
      var X = [U[0] + L * d[0], U[1] + L * d[1], U[2] + L * d[2]];
      var n = Math.hypot(X[0], X[1], X[2]);
      return { lat: Math.asin(clamp(X[2] / n, -1, 1)) * R2D, lon: Math.atan2(X[1], X[0]) * R2D, len: L * R_EARTH, pmin: ca * R_EARTH, depth: R_EARTH * (1 - ca) };
    },
    segs: function (pmin) {
      return LAYERS.map(function (ly) {
        var o = ly.r1 > pmin ? 2 * Math.sqrt(ly.r1 * ly.r1 - pmin * pmin) : 0;
        var i = ly.r0 > pmin ? 2 * Math.sqrt(ly.r0 * ly.r0 - pmin * pmin) : 0;
        return { ly: ly, len: Math.max(0, o - i) };
      });
    },
    update: function (heavy) {
      var ch = DB.chord(LOC.lat, LOC.lon, DB.az, DB.dip);
      DB.last = ch;
      $("dbAzOut").textContent = dirWord(DB.az) + " " + Math.round(DB.az) + "°";
      $("dbDipOut").textContent = Math.round(DB.dip) + "°";
      $("dbDirTxt").textContent = DB.dip >= 89.5 ? "senkrecht nach unten" : "Richtung " + dirWord(DB.az, true) + " · " + Math.round(DB.dip) + "° nach unten";
      var fall = Math.PI * Math.sqrt(6371000 / 9.81) / 60;
      $("dbStats").innerHTML = cell("Tunnel", km(ch.len), "durch die Erde") + cell("Tiefster Punkt", km(ch.depth), DB.dip > 89 ? "Erdmittelpunkt" : "unter der Oberfläche") + cell("Freier Fall", fmt(fall, 0) + " min", "durch den Tunnel", true);
      // Schichten
      var segs = DB.segs(ch.pmin), tot = ch.len || 1;
      $("dbLayerBar").innerHTML = [0, 1, 2, 3, 2, 1, 0].map(function (k, idx) {
        var s = segs[k]; var w = idx === 3 ? s.len : s.len / 2; if (w <= 0) return "";
        return '<i style="width:' + (w / tot * 100).toFixed(3) + '%;background:' + s.ly.col + '"></i>';
      }).join("");
      $("dbLayerLeg").innerHTML = segs.map(function (s) {
        return '<span><i style="background:' + s.ly.col + '"></i>' + esc(s.ly.n) + '</span><b>' + (s.len > 0 ? km(s.len) : "–") + '</b>';
      }).join("");
      var t = interp(TEMP, ch.depth), pr = interp(PRESS, ch.depth);
      $("dbFacts").innerHTML =
        fact("temp", "Bis zu ca. " + fmt(Math.round(t / 100) * 100, 0) + " °C", ch.depth > 5100 ? "Im inneren Kern ist es etwa so heiß wie an der Oberfläche der Sonne." : ch.depth > 2900 ? "Im flüssigen äußeren Kern entsteht durch Strömungen das Magnetfeld der Erde." : "Der Erdmantel ist fest, fließt aber über Millionen Jahre ganz langsam wie zäher Teig.") +
        fact("down", "Druck bis ca. " + (pr >= 10 ? fmt(pr / 100, 1) + " Mio. bar" : fmt(pr * 10, 0) + " Tsd. bar"), "Das entspricht dem Gewicht von rund " + fmt(Math.max(1, Math.round(pr * 1e5 / 14700 / (pr * 1e5 / 14700 > 100 ? 100 : 1)) * (pr * 1e5 / 14700 > 100 ? 100 : 1)), 0) + " Autos auf jedem Quadratzentimeter.") +
        fact("clock", "Freier Fall: rund " + fmt(fall, 0) + " Minuten", "Ohne Luft und Reibung fiele ein Stein durch jeden geraden Tunnel gleich lang – egal wie lang er ist (vereinfacht bei gleichmäßiger Dichte; mit der echten Dichteverteilung sind es senkrecht eher 38 Minuten).") +
        fact("ruler", "Mit dem Auto: " + durTxt(ch.len / 100 * 3600), "bei konstant 100 km/h – wenn es denn eine Straße gäbe. Das tiefste Bohrloch der Welt reicht nur gut 12 km tief.");
      dbJourney(ch.depth); dbSeg();
      drawSection();
      if (heavy) DB.heavy(); else DB.scheduleHeavy();
    },
    scheduleHeavy: function () {
      if (DB.pending) return; DB.pending = true;
      setTimeout(function () { DB.pending = false; DB.heavy(); }, 160);
    },
    heavy: function () {
      var ch = DB.last; if (!ch) return;
      var land = countryAt(ch.lat, ch.lon), name, sub = "";
      var latTxt = fmt(Math.abs(ch.lat), 2) + "° " + (ch.lat >= 0 ? "N" : "S") + ", " + fmt(Math.abs(ch.lon), 2) + "° " + (ch.lon >= 0 ? "O" : "W");
      if (land) {
        name = land.de;
        var np = nearestPlace(ch.lat, ch.lon);
        sub = np ? "In der Nähe von " + np.p.n + " (" + km(np.d) + ")" : latTxt;
      } else if (GEO.world) {
        name = oceanName(ch.lat, ch.lon);
        var nl = nearestLand(ch.lat, ch.lon);
        sub = nl ? "Nächstes Land: " + nl.c.de + " – " + km(nl.d) : "";
      } else { name = "…"; }
      $("dbExitName").textContent = name;
      $("dbExitSub").textContent = sub;
      $("dbExitNote").textContent = land ? "Ein seltener Treffer: Nur rund 15 % der Landflächen der Erde liegen auf der Gegenseite wieder Land gegenüber." : (GEO.world ? "Kein Zufall: Nur rund 15 % der Landflächen liegen auf der Gegenseite wieder Land gegenüber – die meisten Tunnel enden im Meer." : "");
      var now = new Date(), sa = sunAltAt(ch.lat, ch.lon, now);
      var solar = new Date(now.getTime() + ch.lon / 15 * 3600000);
      var hh = solar.getUTCHours(), mm = solar.getUTCMinutes();
      var season = seasonAt(ch.lat, now);
      $("dbExitStats").innerHTML = cell("Position", fmt(Math.abs(ch.lat), 1) + "° " + (ch.lat >= 0 ? "N" : "S"), fmt(Math.abs(ch.lon), 1) + "° " + (ch.lon >= 0 ? "O" : "W")) +
        cell("Sonnenzeit", (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm, sa > 0 ? "Sonne " + Math.round(sa) + "° hoch" : sa > -6 ? "Dämmerung" : "Nacht", true) +
        cell("Jahreszeit", season, ch.lat >= 0 ? "Nordhalbkugel" : "Südhalbkugel");
      drawExitGlobe(land ? land.id : null);
    }
  };
  function seasonAt(lat, d) {
    var m = d.getUTCMonth(); // 0..11
    var n = ["Winter", "Winter", "Frühling", "Frühling", "Frühling", "Sommer", "Sommer", "Sommer", "Herbst", "Herbst", "Herbst", "Winter"][m];
    if (lat < 0) n = { Winter: "Sommer", Sommer: "Winter", "Frühling": "Herbst", Herbst: "Frühling" }[n];
    if (Math.abs(lat) < 23.4) n = "Tropen";
    return n;
  }
  function cell(lbl, val, sub, gold) {
    return '<div><span class="instr-lbl">' + esc(lbl) + '</span><span class="instr-val"' + (gold ? ' style="color:#FFD27A"' : "") + '>' + esc(val) + '</span>' + (sub ? '<span class="instr-sub">' + esc(sub) + '</span>' : "") + '</div>';
  }
  function fact(ic, t, s) { return '<div class="sn-fact"><div class="ic">' + icon(ic) + '</div><div><b>' + esc(t) + '</b><span>' + esc(s) + '</span></div></div>'; }

  var JOURNEY = [
    { d: 0, n: "Erdoberfläche", t: "ca. 15 °C", x: "Start der Reise. Bis zum Mittelpunkt sind es im Mittel 6 371 km – am Äquator gut 21 km mehr als an den Polen, weil die Erde sich dreht und dabei leicht abplattet." },
    { d: 4, n: "Tiefstes Bergwerk", t: "Gestein bis ca. 60 °C", x: "In der Mponeng-Goldmine in Südafrika arbeiten Menschen rund 4 km unter der Oberfläche. Ohne Kühlung wäre es dort unerträglich heiß." },
    { d: 12.262, n: "Tiefstes Bohrloch der Welt", t: "ca. 180 °C", x: "Die Kola-Bohrung im Norden Russlands erreichte 1989 eine Tiefe von 12 262 Metern. Tiefer hat die Menschheit nie gebohrt – die Hitze machte das Gestein zu weich." },
    { d: 35, n: "Moho – Grenze zum Erdmantel", t: "ca. 500 °C", x: "1909 entdeckte Andrija Mohorovičić, dass Erdbebenwellen hier plötzlich schneller werden. Unter den Ozeanen liegt diese Grenze schon nach etwa 7 km, unter Gebirgen erst nach bis zu 70 km." },
    { d: 100, n: "Unterseite der Erdplatten", t: "ca. 1 300 °C", x: "Die starren Platten gleiten auf einer zähplastischen Schicht – einige Zentimeter pro Jahr, etwa so schnell, wie Fingernägel wachsen. So entstehen Gebirge, Erdbeben und Vulkane." },
    { d: 150, n: "Heimat der Diamanten", t: "über 1 000 °C", x: "Ab rund 150 km ist der Druck so hoch, dass sich Kohlenstoff zu Diamant ordnet. Vulkanische Schlote haben einige davon blitzschnell nach oben gebracht." },
    { d: 410, n: "Übergangszone", t: "ca. 1 500 °C", x: "Zwischen 410 und 660 km ordnen sich die Kristalle der Minerale unter dem Druck neu. In einem Mineral namens Ringwoodit kann Wasser gebunden sein – vermutlich in gewaltigen Mengen." },
    { d: 660, n: "Unterer Erdmantel", t: "ca. 1 900 °C", x: "Rund die Hälfte des Erdvolumens. Sein Hauptmineral Bridgmanit gilt als häufigstes Mineral unseres Planeten – obwohl es niemand je direkt von dort geholt hat." },
    { d: 2891, n: "Kern-Mantel-Grenze", t: "ca. 4 000 °C", x: "Hier trifft festes Gestein auf flüssiges Eisen. Beno Gutenberg bestimmte diese Tiefe schon 1914 aus Erdbebenwellen – erstaunlich genau." },
    { d: 4000, n: "Der Dynamo der Erde", t: "ca. 4 500 °C", x: "Im flüssigen äußeren Kern strömt glühendes Metall. Diese Strömungen erzeugen das Magnetfeld der Erde – unseren Schutzschild gegen Teilchen von der Sonne und der Grund, warum ein Kompass funktioniert." },
    { d: 5150, n: "Innerer Kern", t: "ca. 5 300 °C", x: "1936 schloss die dänische Forscherin Inge Lehmann aus Erdbebenwellen, dass im flüssigen Kern ein fester Kern steckt. Er ist trotz der Hitze fest, weil der Druck so gewaltig ist." },
    { d: 6371, n: "Erdmittelpunkt", t: "ca. 5 500 °C · 3,6 Mio. bar", x: "Hier wärst du schwerelos: Die Erde zieht von allen Seiten gleich stark. Der innere Kern misst rund 2 440 km – fast genau so viel wie der Zwergplanet Pluto." }
  ];
  function dbJourney(depth) {
    var n = 0;
    $("dbJourney").innerHTML = JOURNEY.map(function (j) {
      var on = depth + 0.5 >= j.d; if (on) n++;
      return '<div class="sn-st' + (on ? " on" : "") + '"><div class="d">' + (j.d === 0 ? "0 km" : j.d < 20 ? fmt(j.d, j.d % 1 ? 1 : 0) + " km" : fmt(j.d, 0) + " km") + '</div><b>' + esc(j.n) + '</b><span>' + esc(j.x) + '</span><i class="t" style="font-style:normal">' + esc(j.t) + '</i></div>';
    }).join("");
    $("dbJourneyLead").textContent = "Dein Tunnel reicht bis " + km(depth) + " tief – " + n + " von " + JOURNEY.length + " Stationen liegen auf deinem Weg.";
  }
  var KNOW = [
    ["globe", "Erdbebenwellen als Röntgenblick", "Jedes starke Beben schickt Wellen durch den ganzen Planeten. Messstationen auf der ganzen Welt zeichnen auf, wann und wie sie ankommen – daraus setzt sich das Bild vom Inneren zusammen."],
    ["info", "Der Schatten des Kerns", "Scherwellen können Flüssigkeiten nicht durchqueren. Auf der Gegenseite eines Bebens bleiben sie aus – der Beweis, dass der äußere Kern flüssig ist."],
    ["lichtecho", "Botschaften aus dem All", "Eisenmeteorite sind Bruchstücke der Kerne zerbrochener Kleinplaneten. Sie verraten, woraus auch der Erdkern vermutlich besteht: vor allem aus Eisen und Nickel."],
    ["down", "Fenster in die Tiefe", "Vulkane und Diamanten bringen Gestein aus über 100 km Tiefe nach oben – einige besonders tief entstandene Diamanten stammen sogar aus dem unteren Erdmantel."]
  ];
  var DB_EX = ["Hamburg", "Madrid", "Peking", "Shanghai", "Honolulu", "Bogotá", "Wellington", "Buenos Aires"];
  function placeOf(name) { if (!GEO.all) return null; for (var i = 0; i < GEO.all.length; i++) if (GEO.all[i].n === name) return GEO.all[i]; return null; }
  function dbExamples() {
    var box = $("dbExamples"); if (!box || !GEO.all) return;
    box.innerHTML = '<span class="muted small" style="align-self:center;margin-right:2px">Beispiele:</span>' + DB_EX.map(function (n) { return placeOf(n) ? '<button type="button" class="chip" data-n="' + esc(n) + '">' + esc(n) + '</button>' : ""; }).join("");
    Array.prototype.forEach.call(box.querySelectorAll(".chip"), function (b) { b.addEventListener("click", function () { dbPair(placeOf(b.getAttribute("data-n"))); }); });
  }
  function exitInfo(lat, lon) {
    var land = countryAt(lat, lon);
    if (land) { var np = nearestPlace(lat, lon); return { name: land.de, sub: np && np.d < 400 ? "nahe " + np.p.n + " (" + km(np.d) + ")" : "Landesinneres", land: true }; }
    var nl = nearestLand(lat, lon), npl = nearestPlace(lat, lon);
    return { name: oceanName(lat, lon), sub: nl ? "nächstes Land: " + nl.c.de + " – " + km(nl.d) + (npl && npl.d < 1500 ? " · nächster Ort: " + npl.p.n : "") : "", land: false };
  }
  function dbPair(pl) {
    if (!pl) return;
    var alat = -pl.lat, alon = pl.lon > 0 ? pl.lon - 180 : pl.lon + 180;
    var ex = exitInfo(alat, alon);
    var box = $("dbPair"); box.hidden = false;
    box.innerHTML = '<div class="row">' + icon("pin") + '<div><b>' + esc(pl.n) + '</b><span>' + esc(countryName(pl.c)) + " · " + fmt(Math.abs(pl.lat), 1) + "° " + (pl.lat >= 0 ? "N" : "S") + '</span></div></div>' +
      '<div class="arrow">↓ 12 742 km quer durch die Erde</div>' +
      '<div class="row">' + icon("globe") + '<div><b>' + esc(ex.name) + '</b><span>' + esc(ex.sub) + " · " + fmt(Math.abs(alat), 1) + "° " + (alat >= 0 ? "N" : "S") + ", " + fmt(Math.abs(alon), 1) + "° " + (alon >= 0 ? "O" : "W") + '</span></div></div>' +
      '<p class="muted small" style="margin:10px 0 0">' + (ex.land ? "Volltreffer: Hier liegt Land genau gegenüber Land." : "Wie meistens: Der Gegenpunkt liegt im Meer.") + " Über die Erdoberfläche wären es 20 015 km – der halbe Erdumfang.</p>";
  }
  function dbSearchInit() {
    var inp = $("dbSearch"), res = $("dbSearchRes");
    inp.addEventListener("input", function () {
      var q = normTxt(inp.value);
      if (q.length < 2 || !GEO.all) { res.innerHTML = ""; return; }
      var hits = GEO.all.filter(function (p) { return p.k.indexOf(q) === 0 || (q.length > 3 && p.k.indexOf(" " + q) >= 0); })
        .sort(function (a, b) { return (b.k === q) - (a.k === q) || b.pop - a.pop; }).slice(0, 6);
      res.innerHTML = hits.length ? hits.map(function (p, i) { return '<button type="button" data-i="' + i + '">' + esc(p.n) + '<span>' + esc(countryName(p.c)) + (p.r ? " · " + esc(p.r) : "") + '</span></button>'; }).join("") : '<p class="muted small" style="margin:8px 0 0">Kein Ort gefunden.</p>';
      Array.prototype.forEach.call(res.querySelectorAll("button"), function (b) { b.addEventListener("click", function () { dbPair(hits[+b.getAttribute("data-i")]); res.innerHTML = ""; inp.value = ""; inp.blur(); }); });
    });
    $("dbKnow").innerHTML = KNOW.map(function (k) { return fact(k[0], k[1], k[2]); }).join("");
  }
  var dbAnimT0 = performance.now();
  function drawSection() {
    var cv = $("dbSection"); if (!cv.offsetParent) return;
    var P = prep(cv), c = P.c, W = P.W, H = P.H;
    var cx = W / 2, R = W * 0.355, cy = H * 0.51;
    var ch = DB.last || DB.chord(LOC.lat, LOC.lon, 0, 90);
    // Sterne im Hintergrund (fest)
    c.fillStyle = "rgba(255,255,255,.5)";
    for (var i = 0; i < 40; i++) { var x = (Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) % 1 * W, y = (Math.sin(i * 78.233) * 12345.678 % 1 + 1) % 1 * H; c.globalAlpha = .15 + (i % 5) * .08; c.fillRect(x, y, 1.2, 1.2); }
    c.globalAlpha = 1;
    // Atmosphäre
    var ag = c.createRadialGradient(cx, cy, R, cx, cy, R * 1.12);
    ag.addColorStop(0, "rgba(150,170,255,.30)"); ag.addColorStop(1, "rgba(150,170,255,0)");
    c.beginPath(); c.arc(cx, cy, R * 1.12, 0, TAU); c.fillStyle = ag; c.fill();
    // Mantel
    var mg = c.createRadialGradient(cx, cy, R * 3480 / 6371, cx, cy, R);
    mg.addColorStop(0, "#E2753F"); mg.addColorStop(.55, "#B9483A"); mg.addColorStop(1, "#6E2D48");
    c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fillStyle = mg; c.fill();
    // äußerer Kern
    var og = c.createRadialGradient(cx, cy, R * 1221 / 6371, cx, cy, R * 3480 / 6371);
    og.addColorStop(0, "#FFC768"); og.addColorStop(1, "#EE8A3A");
    c.beginPath(); c.arc(cx, cy, R * 3480 / 6371, 0, TAU); c.fillStyle = og; c.fill();
    // innerer Kern
    var ig = c.createRadialGradient(cx - R * .05, cy - R * .05, 0, cx, cy, R * 1221 / 6371);
    ig.addColorStop(0, "#FFFBEA"); ig.addColorStop(1, "#FFDB8A");
    c.beginPath(); c.arc(cx, cy, R * 1221 / 6371, 0, TAU); c.fillStyle = ig; c.fill();
    // Kruste (zur Sichtbarkeit verbreitert)
    c.beginPath(); c.arc(cx, cy, R - 1.5, 0, TAU); c.strokeStyle = "#B7A8EE"; c.lineWidth = 3; c.stroke();
    // Legende unten
    c.font = "600 10px " + FONT; c.textBaseline = "middle"; c.textAlign = "left";
    var leg = [["Kruste", "#B7A8EE"], ["Mantel", "#D9673E"], ["Äußerer Kern", "#F2A048"], ["Innerer Kern", "#FFE3A0"]];
    var tw = 0; leg.forEach(function (l) { tw += c.measureText(l[0]).width + 22; });
    var lx = (W - tw + 8) / 2, lyy = H - 12;
    leg.forEach(function (l) { c.beginPath(); c.arc(lx + 4, lyy, 4, 0, TAU); c.fillStyle = l[1]; c.fill(); c.fillStyle = SOFT; c.fillText(l[0], lx + 12, lyy); lx += c.measureText(l[0]).width + 22; });
    // Tunnel
    var side = (DB.az > 180) ? -1 : 1;
    var th = DB.dip * D2R;
    var ox = cx, oy = cy - R;
    var L = 2 * R * Math.sin(th);
    var ex = ox + side * Math.cos(th) * L, ey = oy + Math.sin(th) * L;
    c.save();
    c.shadowColor = "rgba(255,210,122,.8)"; c.shadowBlur = 10;
    var tg = c.createLinearGradient(ox, oy, ex, ey); tg.addColorStop(0, "#FFFFFF"); tg.addColorStop(1, GOLD);
    c.strokeStyle = tg; c.lineWidth = 2.2; c.setLineDash([6, 5]);
    c.beginPath(); c.moveTo(ox, oy); c.lineTo(ex, ey); c.stroke();
    c.restore();
    c.setLineDash([]);
    // tiefster Punkt
    if (DB.dip > 3) {
      var mx = ox + side * Math.cos(th) * L / 2, my = oy + Math.sin(th) * L / 2;
      c.beginPath(); c.arc(mx, my, 3, 0, TAU); c.fillStyle = "#fff"; c.fill();
    }
    // Kapsel auf der Reise
    var tt = reduceMotion ? 0.5 : ((performance.now() - dbAnimT0) / 4200) % 1;
    var ease = .5 - .5 * Math.cos(tt * Math.PI);
    var kx = lerp(ox, ex, ease), ky = lerp(oy, ey, ease);
    var kg = c.createRadialGradient(kx, ky, 0, kx, ky, 12);
    kg.addColorStop(0, "rgba(255,255,255,1)"); kg.addColorStop(.3, "rgba(255,226,160,.8)"); kg.addColorStop(1, "rgba(255,210,122,0)");
    c.beginPath(); c.arc(kx, ky, 12, 0, TAU); c.fillStyle = kg; c.fill();
    // Du + Ausgang
    pinMark(c, ox, oy, "#fff", "Du");
    c.beginPath(); c.arc(ex, ey, 5, 0, TAU); c.fillStyle = GOLD; c.fill();
    c.beginPath(); c.arc(ex, ey, 9, 0, TAU); c.strokeStyle = "rgba(255,210,122,.6)"; c.lineWidth = 1.5; c.stroke();
    c.font = "700 11px " + FONT; c.fillStyle = GOLD; c.textAlign = ex > cx + 4 ? "left" : ex < cx - 4 ? "right" : "center"; c.textBaseline = "top";
    c.fillText("Ausgang", ex + (ex > cx + 4 ? 12 : ex < cx - 4 ? -12 : 0), ey + (Math.abs(ex - cx) < 5 ? 14 : 6));
  }
  function pinMark(c, x, y, col, label) {
    c.save();
    c.beginPath(); c.arc(x, y, 5.5, 0, TAU); c.fillStyle = col; c.fill();
    c.beginPath(); c.arc(x, y, 10, 0, TAU); c.strokeStyle = "rgba(255,255,255,.45)"; c.lineWidth = 1.4; c.stroke();
    c.font = "700 11.5px " + FONT; c.fillStyle = "#fff"; c.textAlign = "right"; c.textBaseline = "middle";
    c.fillText(label, x - 15, y);
    c.restore();
  }
  function drawExitGlobe(hl) {
    var cv = $("dbGlobe"); if (!cv.offsetParent) return;
    var P = prep(cv), c = P.c, W = P.W;
    var ch = DB.last; if (!ch) return;
    var r = W * 0.42, cx = W / 2, cy = W / 2;
    var proj = drawGlobe(c, cx, cy, r, ch.lat, ch.lon, { sun: subSolar(new Date()), highlight: hl, hlFill: "#9F8BF0" });
    // Ausgang
    c.save();
    c.shadowColor = "rgba(255,210,122,.9)"; c.shadowBlur = 12;
    c.beginPath(); c.arc(cx, cy, 5, 0, TAU); c.fillStyle = GOLD; c.fill();
    c.restore();
    c.strokeStyle = GOLD; c.lineWidth = 1.4;
    c.beginPath(); c.arc(cx, cy, 11, 0, TAU); c.stroke();
    c.beginPath(); c.moveTo(cx - 20, cy); c.lineTo(cx - 13, cy); c.moveTo(cx + 13, cy); c.lineTo(cx + 20, cy); c.moveTo(cx, cy - 20); c.lineTo(cx, cy - 13); c.moveTo(cx, cy + 13); c.lineTo(cx, cy + 20); c.stroke();
  }
  function dbLoop() {
    DB.raf = 0;
    var scr = $("screen-durchblick");
    if (!scr.classList.contains("active") || document.hidden) return;
    if (DB.sensor) {
      var att = ORI.attitude();
      if (att) {
        var q = ORI.smooth(att, 90), b = ORI.back(q);
        var hint = $("dbSensorHint");
        if (b.alt < -2) {
          DB.az = b.az; DB.dip = clamp(-b.alt, 1, 90);
          $("dbAz").value = Math.round(DB.az); $("dbDip").value = Math.round(DB.dip);
          hint.hidden = true;
          DB.update(false);
        } else {
          hint.hidden = false; hint.textContent = "Zeig mit der Rückseite des Handys nach unten – flach mit dem Display nach oben heißt: senkrecht durch die Erde.";
          drawSection();
        }
      } else drawSection();
    } else if (!reduceMotion) drawSection();
    DB.raf = requestAnimationFrame(dbLoop);
  }
  function dbSeg() {
    var aim = DB.sensor, down = !DB.sensor && DB.dip >= 89.5;
    $("dbAim").classList.toggle("on", aim); $("dbAim").setAttribute("aria-pressed", aim);
    $("dbDown").classList.toggle("on", down); $("dbDown").setAttribute("aria-pressed", down);
  }
  function dbStartLoop() { if (!DB.raf) DB.raf = requestAnimationFrame(dbLoop); }
  function dbInit() {
    $("dbAz").addEventListener("input", function () { DB.sensorOff(); DB.az = +this.value; DB.update(false); });
    $("dbDip").addEventListener("input", function () { DB.sensorOff(); DB.dip = +this.value; DB.update(false); });
    $("dbDown").addEventListener("click", function () { DB.sensorOff(); DB.az = 0; DB.dip = 90; $("dbAz").value = 0; $("dbDip").value = 90; DB.update(true); });
    $("dbAim").addEventListener("click", function () {
      if (DB.sensor) { DB.sensorOff(); return; }
      ORI.permit().then(function () {
        ORI.start(); DB.sensor = true;
        dbSeg();
        var h = $("dbSensorHint"); h.hidden = false; h.textContent = "Neige das Handy – die Rückseite zeigt die Richtung durch die Erde.";
        dbStartLoop();
      }).catch(function (e) { if (window.wzAlert) wzAlert(e.message); });
    });
    DB.sensorOff = function () {
      if (!DB.sensor) return;
      DB.sensor = false; ORI.stop();
      dbSeg();
      $("dbSensorHint").hidden = true;
      DB.update(true);
    };
    DB.ready = true;
    dbSearchInit();
    DB.update(true);
    loadGeo().then(function () { DB.update(true); }).catch(function () { $("dbExitName").textContent = oceanName(DB.last.lat, DB.last.lon); });
  }

  /* =====================================================================
     2. LICHTECHO
     ===================================================================== */
  // Entfernungen in Lichtjahren (gerundet, nach Parallaxenmessungen; Unsicherheit meist 1–3 %)
  var LY_EXT = {
    "Rigil Kentaurus": 4.37, "Sirius": 8.6, "Prokyon": 11.46, "Atair": 16.7, "Wega": 25.0, "Fomalhaut": 25.1, "π3 Ori": 26.3,
    "Alula Australis": 28.8, "Pollux": 33.8, "ζ Her": 35.0, "Zavijava": 35.6, "Denebola": 35.9, "Arktur": 36.7, "Muphrid": 37.2,
    "Porrima": 38.1, "Deneb Algedi": 38.7, "β TrA": 40.4, "Kapella": 42.9, "Alshain": 44.7, "Errai": 45.0, "ι Psc": 45.3,
    "Talitha": 47.3, "Rasalhague": 48.6, "Alderamin": 49.0, "δ Aql": 50.1, "Kastor": 51.0, "Caph": 54.7, "Zosma": 58.4,
    "Menkent": 58.8, "Sheratan": 59.6, "Wasat": 60.5, "Mothallah": 63.3, "Larawag": 63.7, "Tureis": 63.5, "Aldebaran": 65.3,
    "Hamal": 65.8, "ζ Lep": 70.5, "Gienah Cyg": 72.7, "η Sco": 73.5, "Heze": 73.9, "Unukalhai": 74, "Sarin": 75.1,
    "Alphecca": 75.0, "Zubenelgenubi": 75.8, "Kaus Borealis": 78.2, "Regulus": 79.3, "Merak": 79.7, "Megrez": 80.5,
    "δ Vel": 80.6, "Menkalinan": 81.1, "Cebalrai": 81.8, "Alioth": 82.6, "Mizar": 82.9, "Phecda": 83.2, "Okab": 83,
    "Ankaa": 85, "Seginus": 85, "κ Oph": 87.6, "Algorab": 87, "Sabik": 88, "Ascella": 88, "Gacrux": 88.6, "Cursa": 89,
    "Algol": 90, "Diphda": 96, "Alnasl": 97, "Alpheratz": 97, "Altais": 97.4, "Ruchbah": 99, "Edasich": 101, "Alnair": 101,
    "Rotanev": 101, "δ And": 101, "Alkaid": 104, "η Her": 108, "Algedi": 109, "Alhena": 109, "Vindemiatrix": 110,
    "Cor Caroli": 110, "Miaplacidus": 113, "Nusakan": 114, "μ And": 120, "Dubhe": 123, "λ Aql": 125, "β Tri": 127,
    "Algieba": 130, "Kochab": 131, "Asellus Australis": 131, "Markab": 133, "Rasalas": 133, "Elnath": 134, "γ Psc": 135,
    "Achernar": 139, "Kornephoros": 139, "Kraz": 140, "δ Aur": 140, "Kaus Australis": 143, "γ CrB": 145, "Ain": 147,
    "Alrescha": 151, "Eltanin": 154, "Gienah Crv": 154, "Gomeisa": 160, "Skat": 160, "Nihal": 160, "Acamar": 161,
    "Mahasim": 166, "Yed Prior": 171, "Yildun": 172, "Acubens": 174, "Alphard": 177, "Tiaki": 177, "Muscida": 179,
    "Peacock": 179, "Asellus Borealis": 181, "Zubeneschamali": 185, "Scheat": 196, "Mirach": 197, "Izar": 202,
    "Homam": 204, "Schedar": 228, "Nunki": 228, "Tejat": 232, "Menkar": 249, "Spica": 250, "Bellatrix": 250,
    "Sualocin": 254, "Phakt": 261, "Thuban": 303, "Kaus Media": 306, "Canopus": 310, "Acrux": 320, "Rasalgethi": 360,
    "Furud": 362, "Rastaban": 380, "Hadar": 390, "Algenib": 390, "Tarazed": 395, "Adhara": 430, "Albireo": 430,
    "Polarstern": 433, "Pherkad": 487, "Mirzam": 500, "Sadalmelik": 520, "Sadalsuud": 540, "Beteigeuze": 548,
    "Antares": 550, "Shaula": 570, "Mirfak": 590, "Saiph": 650, "Enif": 690, "Rigel": 860, "Mintaka": 900, "Deneb": 2600
  };
  var STARS = [];
  function conName(id) {
    for (var i = 0; i < ST.constellations.length; i++) if (ST.constellations[i].id === id) return ST.constellations[i].de;
    return (ST.CON_NAMES && ST.CON_NAMES[id]) || id;
  }
  function buildStars() {
    STARS = ST.stars.map(function (s) {
      var ly = LY_EXT[s.name] != null ? LY_EXT[s.name] : s.ly;
      return ly ? { name: s.name, con: s.con, ra: s.ra, dec: s.dec, mag: s.mag, bv: s.bv, ly: ly } : null;
    }).filter(Boolean).sort(function (a, b) { return a.ly - b.ly; });
  }
  function colorWord(bv) {
    if (bv < -0.1) return "bläulich weiß"; if (bv < 0.2) return "weiß"; if (bv < 0.5) return "gelblich weiß";
    if (bv < 0.9) return "gelblich"; if (bv < 1.3) return "orange"; return "orangerot";
  }
  function starColor(bv) {
    if (bv < -0.1) return "#BFD3FF"; if (bv < 0.2) return "#F2F4FF"; if (bv < 0.5) return "#FFF6E0";
    if (bv < 0.9) return "#FFE7B0"; if (bv < 1.3) return "#FFC98A"; return "#FFAE7A";
  }
  function starAltAz(s, date) {
    var jd = A.toJD(date), rd = A.starRaDec(s.ra, s.dec, jd);
    var e = A.eqToEnu(A.vec(rd.ra, rd.dec), A.lst(jd, LOC.lon), LOC.lat);
    var aa = A.enuToAltAz(e);
    return { alt: aa.alt + A.refraction(aa.alt), az: aa.az };
  }
  function maxAlt(s) { return 90 - Math.abs(LOC.lat - s.dec); }
  function tonightBest(s) {
    // beste Zeit in der nächsten dunklen Phase (Sonne unter -10°), Schritt 10 min
    var now = Date.now(), best = null, inDark = false;
    for (var m = 0; m <= 24 * 60; m += 10) {
      var d = new Date(now + m * 60000), dark = sunAltAt(LOC.lat, LOC.lon, d) < -10;
      if (!dark) { if (inDark) break; continue; }
      inDark = true;
      var aa = starAltAz(s, d);
      if (!best || aa.alt > best.alt) best = { d: d, alt: aa.alt, az: aa.az };
    }
    return best;
  }
  var LE = { moments: [], sel: null, data: null, t0: performance.now(), raf: 0 };
  function leLoad() {
    LE.moments = lsGet("staunwahr_momente", []);
    if (!Array.isArray(LE.moments)) LE.moments = [];
    LE.sel = lsGet("staunwahr_moment_aktiv", LE.moments.length ? LE.moments[0].id : null);
    if (LE.sel && !LE.moments.some(function (m) { return m.id === LE.sel; })) LE.sel = LE.moments.length ? LE.moments[0].id : null;
  }
  function leCurrent() { for (var i = 0; i < LE.moments.length; i++) if (LE.moments[i].id === LE.sel) return LE.moments[i]; return null; }
  function momentDate(m) { var p = m.date.split("-"); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2], 12)); }
  var MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  function dateTxt(d) { return d.getUTCDate() + ". " + MONTHS[d.getUTCMonth()] + " " + d.getUTCFullYear(); }
  function monthTxt(d) { return MONTHS[d.getUTCMonth()] + " " + d.getUTCFullYear(); }
  function yearsBetween(a, b) { return (b - a) / (365.25 * 86400000); }
  function leRenderMoments() {
    var box = $("leMoments");
    if (!LE.moments.length) { box.innerHTML = ""; return; }
    box.innerHTML = LE.moments.map(function (m) {
      var on = m.id === LE.sel;
      return '<button type="button" class="chip' + (on ? " active" : "") + '" role="radio" aria-checked="' + on + '" data-id="' + esc(m.id) + '">' + esc(m.name) + '</button>';
    }).join("") + (LE.sel ? '<button type="button" class="icon-btn" id="leDel" aria-label="Ausgewählten Moment entfernen">' + icon("trash") + ' Entfernen</button>' : "");
    Array.prototype.forEach.call(box.querySelectorAll(".chip"), function (b) {
      b.addEventListener("click", function () { LE.sel = b.getAttribute("data-id"); lsSet("staunwahr_moment_aktiv", LE.sel); leRenderMoments(); leUpdate(); rtUpdateLife(); });
    });
    var del = $("leDel");
    if (del) del.addEventListener("click", function () {
      var cur = leCurrent(); if (!cur) return;
      var go = function () {
        LE.moments = LE.moments.filter(function (m) { return m.id !== cur.id; });
        lsSet("staunwahr_momente", LE.moments);
        LE.sel = LE.moments.length ? LE.moments[0].id : null; lsSet("staunwahr_moment_aktiv", LE.sel);
        leRenderMoments(); leUpdate(); rtUpdateLife();
      };
      if (window.wzConfirm) wzConfirm("„" + cur.name + "“ entfernen?").then(function (ok) { if (ok) go(); }); else go();
    });
  }
  function leUpdate() {
    var m = leCurrent();
    $("leResult").hidden = !m; $("leEmpty").hidden = !!m;
    if (!m) { LE.data = null; return; }
    var t0 = momentDate(m), now = new Date();
    var age = yearsBetween(t0, now);
    if (age < 0) { $("leResult").hidden = true; $("leEmpty").hidden = false; $("leEmpty").querySelector(".empty-hint").textContent = "Dieser Moment liegt in der Zukunft – sein Licht ist noch gar nicht losgeflogen."; return; }
    var vis = STARS.filter(function (s) { return maxAlt(s) > 8; });
    var ranked = vis.slice().sort(function (a, b) { return Math.abs(a.ly - age) - Math.abs(b.ly - age) || a.mag - b.mag; });
    var main = ranked[0];
    LE.data = { m: m, age: age, main: main, ranked: ranked, t0: t0 };
    $("leBubbleSub").textContent = fmt(age, 1) + " Lichtjahre weit";
    if (age < 4.2) {
      $("leStarLbl").textContent = "Noch unterwegs";
      $("leStar").textContent = "Noch kein Stern erreicht";
      var rk = STARS[0];
      $("leStarSub").textContent = "Das Licht deines Moments ist erst " + fmt(age, 1) + " Lichtjahre weit. Den nächsten Stern, " + rk.name + " (Alpha Centauri), erreicht es im " + monthTxt(new Date(t0.getTime() + rk.ly * 365.25 * 86400000)) + ".";
      $("leStarFacts").innerHTML = ""; $("leShow").hidden = true;
    } else {
      $("leShow").hidden = false;
      var diff = main.ly - age;
      var left = new Date(now.getTime() - main.ly * 365.25 * 86400000);
      $("leStarLbl").textContent = "Dein Lichtecho-Stern";
      $("leStar").textContent = main.name;
      $("leStarSub").textContent = "Das Licht, das heute von " + main.name + " bei dir ankommt, ist im " + monthTxt(left) + " losgeflogen – " + (Math.abs(diff) < 0.15 ? "praktisch genau zu deinem Moment." : "nur " + monthsTxt(Math.abs(diff)) + (diff > 0 ? " vor" : " nach") + " deinem Moment.");
      var aa = starAltAz(main, now), best = tonightBest(main);
      var posTxt = aa.alt > 0 ? "Jetzt " + Math.round(aa.alt) + "° hoch im " + dirWord(aa.az, true) : "Gerade unter dem Horizont";
      var bestTxt = best && best.alt > 5 ? (aa.alt > 5 && sunAltAt(LOC.lat, LOC.lon, now) < -10 ? "Diese Nacht am höchsten gegen " : "Heute Nacht am besten gegen ") + timeTxt(best.d) + " Uhr, " + Math.round(best.alt) + "° hoch im " + dirWord(best.az, true) + "." : (maxAlt(main) > 8 ? "In dieser Nacht nicht gut zu sehen – er steht vor allem tagsüber am Himmel. In einigen Monaten klappt es besser." : "");
      $("leStarFacts").innerHTML =
        fact("lichtecho", fmt(main.ly, main.ly < 100 ? 1 : 0) + " Lichtjahre entfernt", "Ein " + colorWord(main.bv) + " leuchtender Stern im Sternbild " + conName(main.con) + ", Helligkeit " + fmt(main.mag, 1) + " mag.") +
        fact("sky", posTxt, bestTxt || "") +
        fact("globe", "Und umgekehrt", "Das Licht der Erde von deinem Moment kommt " + (diff > 0 ? "in " + monthsTxt(diff).replace(/Jahre\b/g, "Jahren").replace(/Monate\b/g, "Monaten") + " " : "gerade ") + "bei " + main.name + " an. Wer dort mit einem riesigen Teleskop zur Erde schaut, sähe genau diesen Tag.");
    }
    // Alternativen
    var alt = ranked.slice(age < 4.2 ? 0 : 1, age < 4.2 ? 4 : 5);
    $("leAlt").innerHTML = alt.map(function (s) {
      var d = s.ly - age;
      return '<div class="sn-row"><span class="dot" style="background:' + starColor(s.bv) + '"></span><div class="main"><b>' + esc(s.name) + '</b><span>' + esc(conName(s.con)) + " · " + fmt(s.mag, 1) + ' mag</span></div><div class="r">' + fmt(s.ly, 1) + ' Lj<small>' + (Math.abs(d) < 0.15 ? "genau" : (d > 0 ? "+" : "−") + monthsTxt(Math.abs(d), true)) + '</small></div></div>';
    }).join("");
    // Nächste Lichtgeburtstage
    var next = vis.filter(function (s) { return s.ly > age; }).slice(0, 5);
    $("leNext").innerHTML = next.map(function (s) {
      var when = new Date(t0.getTime() + s.ly * 365.25 * 86400000);
      return '<div class="sn-row"><span class="dot" style="background:' + starColor(s.bv) + '"></span><div class="main"><b>' + esc(s.name) + '</b><span>' + fmt(s.ly, 1) + ' Lichtjahre · ' + esc(conName(s.con)) + '</span></div><div class="r">' + (["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."][when.getUTCMonth()] + " " + when.getUTCFullYear()) + '<small>in ' + monthsTxt(s.ly - age, true) + '</small></div></div>';
    }).join("") || '<div class="empty-hint">Keine weiteren Sterne in der Liste.</div>';
    drawBubble();
  }
  function monthsTxt(y, short) {
    var mo = Math.round(y * 12);
    if (mo < 1) return short ? "< 1 Mon." : "weniger als einen Monat";
    if (mo < 12) return mo + (short ? " Mon." : (mo === 1 ? " Monat" : " Monate"));
    var yy = Math.floor(mo / 12), r = mo % 12;
    if (short) return yy + " J." + (r ? " " + r + " M." : "");
    return yy + (yy === 1 ? " Jahr" : " Jahre") + (r ? " und " + r + (r === 1 ? " Monat" : " Monate") : "");
  }
  function timeTxt(d) { var h = d.getHours(), m = d.getMinutes(); return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m; }
  function drawBubble() {
    var cv = $("leBubble"); if (!cv.offsetParent || !LE.data) return;
    var P = prep(cv), c = P.c, W = P.W, H = P.H;
    var cx = W / 2, cy = H / 2 + 8, R = W * 0.44;
    var age = LE.data.age;
    var maxLy = clamp(Math.max(age * 1.55, 30), 30, 260);
    var sc = function (ly) { return Math.sqrt(ly / maxLy) * R; }; // Wurzel-Skala: Nahes bleibt lesbar
    // Ringe
    c.font = "500 9.5px " + MONO; c.textAlign = "left"; c.textBaseline = "middle";
    [10, 25, 50, 100, 200].forEach(function (ly) {
      if (ly > maxLy) return;
      c.beginPath(); c.arc(cx, cy, sc(ly), 0, TAU); c.strokeStyle = FAINT; c.lineWidth = .8; c.setLineDash([2, 4]); c.stroke(); c.setLineDash([]);
      c.fillStyle = "rgba(226,220,255,.45)"; c.fillText(ly + " Lj", cx + sc(ly) * .707 + 3, cy - sc(ly) * .707);
    });
    // Lichtblase
    var rb = sc(Math.min(age, maxLy));
    var bg = c.createRadialGradient(cx, cy, 0, cx, cy, rb);
    bg.addColorStop(0, "rgba(185,166,245,.05)"); bg.addColorStop(.85, "rgba(185,166,245,.12)"); bg.addColorStop(1, "rgba(255,210,122,.28)");
    c.beginPath(); c.arc(cx, cy, rb, 0, TAU); c.fillStyle = bg; c.fill();
    c.save(); c.shadowColor = "rgba(255,210,122,.9)"; c.shadowBlur = 10;
    c.beginPath(); c.arc(cx, cy, rb, 0, TAU); c.strokeStyle = GOLD; c.lineWidth = 1.6; c.stroke(); c.restore();
    // Lichtwelle (Animation)
    var tt = reduceMotion ? 0 : ((performance.now() - LE.t0) / 3800) % 1;
    if (!reduceMotion) {
      c.beginPath(); c.arc(cx, cy, rb * tt, 0, TAU); c.strokeStyle = "rgba(255,226,160," + (0.45 * (1 - tt)).toFixed(3) + ")"; c.lineWidth = 2; c.stroke();
    }
    // Sterne: Winkel = Rektaszension, Abstand = Entfernung
    var inside = 0, main = LE.data.main;
    STARS.forEach(function (s) {
      if (s.ly > maxLy) return;
      var ang = -s.ra * D2R - Math.PI / 2, rr = sc(s.ly);
      var x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr;
      var isIn = s.ly <= age, isMain = s === main && age >= 4.2;
      if (isIn) inside++;
      var sz = clamp(3.2 - s.mag * .7, .9, 3.6) * (isMain ? 1.5 : 1);
      c.beginPath(); c.arc(x, y, sz, 0, TAU);
      c.fillStyle = isIn ? starColor(s.bv) : "rgba(226,220,255,.42)"; c.fill();
      if (isMain) {
        c.beginPath(); c.arc(x, y, 9, 0, TAU); c.strokeStyle = GOLD; c.lineWidth = 1.5; c.stroke();
        c.font = "700 12px " + FONT; c.fillStyle = GOLD; c.textBaseline = "middle";
        var tw2 = c.measureText(s.name).width, rt = x > cx;
        if (rt && x + 13 + tw2 > W - 4) rt = false; if (!rt && x - 13 - tw2 < 4) rt = true;
        c.textAlign = rt ? "left" : "right"; c.fillText(s.name, x + (rt ? 13 : -13), y);
      } else if (s.mag < 1.0 || (isIn && s.mag < 1.6)) {
        c.font = "500 10px " + FONT; c.fillStyle = isIn ? "rgba(255,240,210,.85)" : "rgba(226,220,255,.55)"; c.textBaseline = "middle";
        var tw = c.measureText(s.name).width, right = x > cx;
        if (right && x + 6 + tw > W - 4) right = false; if (!right && x - 6 - tw < 4) right = true;
        c.textAlign = right ? "left" : "right"; c.fillText(s.name, x + (right ? 6 : -6), y);
      }
    });
    // Erde
    var eg = c.createRadialGradient(cx - 2, cy - 2, 0, cx, cy, 6);
    eg.addColorStop(0, "#BFD8FF"); eg.addColorStop(1, "#3E6FD8");
    c.beginPath(); c.arc(cx, cy, 5.5, 0, TAU); c.fillStyle = eg; c.fill();
    c.font = "700 11px " + FONT; c.fillStyle = "#fff"; c.textAlign = "center"; c.textBaseline = "top"; c.fillText("Erde", cx, cy + 9);
    // Fußzeile
    c.font = "500 10.5px " + FONT; c.fillStyle = SOFT; c.textAlign = "left"; c.textBaseline = "alphabetic";
    c.fillText(inside + " helle Sterne haben dein Licht schon empfangen", 14, H - 12);
  }
  function leLoop() {
    LE.raf = 0;
    if (!$("screen-lichtecho").classList.contains("active") || document.hidden || reduceMotion) return;
    drawBubble();
    LE.raf = requestAnimationFrame(leLoop);
  }
  function leInit() {
    buildStars(); leLoad(); leRenderMoments(); leUpdate(); leNow(); leHist();
    var datePh = function () { $("leDatePh").parentNode.classList.toggle("has", !!$("leDate").value); };
    ["input", "change", "blur"].forEach(function (ev) { $("leDate").addEventListener(ev, datePh); });
    datePh();
    $("leSave").addEventListener("click", function () {
      var name = $("leName").value.trim() || "Mein Moment", d = $("leDate").value;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { if (window.wzToast) wzToast("Bitte ein Datum wählen."); return; }
      var id = "m" + Date.now().toString(36);
      LE.moments.push({ id: id, name: name.slice(0, 40), date: d });
      lsSet("staunwahr_momente", LE.moments);
      LE.sel = id; lsSet("staunwahr_moment_aktiv", id);
      $("leName").value = ""; $("leDate").value = ""; datePh();
      leRenderMoments(); leUpdate(); rtUpdateLife(); leStart();
    });
    $("leShow").addEventListener("click", function () {
      if (!LE.data || !LE.data.main) return;
      location.href = "./sternewahr-index.html?obj=" + encodeURIComponent(LE.data.main.name) + "&fov=50";
    });
  }
  /* Lichtlaufzeiten jetzt */
  var PNAMES = { mercury: "Merkur", venus: "Venus", mars: "Mars", jupiter: "Jupiter", saturn: "Saturn", uranus: "Uranus", neptune: "Neptun" };
  var C_KMS = 299792.458;
  function lightTxt(sec) {
    if (sec < 60) return fmt(sec, 2) + " Sekunden";
    var m = Math.floor(sec / 60), ss = Math.round(sec % 60);
    if (ss === 60) { m++; ss = 0; }
    if (m < 60) return m + " min " + ss + " s";
    var h = Math.floor(m / 60); return h + " h " + (m % 60) + " min";
  }
  function altNow(ra, dec, date) {
    var jd = A.toJD(date), e = A.eqToEnu(A.vec(ra, dec), A.lst(jd, LOC.lon), LOC.lat);
    var aa = A.enuToAltAz(e); return { alt: aa.alt + A.refraction(aa.alt), az: aa.az };
  }
  function leNow() {
    var now = new Date(), jd = A.toJD(now), rows = [];
    var mo = A.moon(jd), su = A.sun(jd);
    var moAlt = altNow(mo.ra, mo.dec, now), suAlt = altNow(su.ra, su.dec, now);
    rows.push({ n: "Mond", d: mo.dist, col: "#E9E6DC", alt: moAlt.alt, az: moAlt.az });
    rows.push({ n: "Sonne", d: su.dist * AU / 1000, col: "#FFD27A", alt: suAlt.alt, az: suAlt.az });
    A.PLANETS.forEach(function (id) {
      var pl = A.planet(id, jd), aa = altNow(pl.ra, pl.dec, now);
      var pp = null; for (var i = 0; i < PL.length; i++) if (PL[i].id === id) pp = PL[i];
      rows.push({ n: PNAMES[id], d: pl.dist * AU / 1000, col: pp ? pp.col : "#ccc", alt: aa.alt, az: aa.az, mag: pl.mag });
    });
    var night = suAlt.alt < -6;
    $("leNow").innerHTML = rows.map(function (r) {
      var sec = r.d / C_KMS;
      var vis = r.alt > 0 ? (r.n === "Sonne" ? "gerade am Himmel – nie direkt hineinschauen" : Math.round(r.alt) + "° hoch im " + dirWord(r.az, true) + (night && r.mag != null && r.mag < 5.5 ? " – jetzt sichtbar" : night && r.n === "Mond" ? " – jetzt sichtbar" : "")) : "unter dem Horizont";
      return '<div class="sn-row"><span class="dot" style="background:' + r.col + '"></span><div class="main"><b>' + r.n + '</b><span>' + esc(vis) + '</span></div><div class="r">' + lightTxt(sec) + '<small>' + (r.d < 1e6 ? fmt(r.d, 0) + " km" : fmt(r.d / 1e6, r.d < 1e8 ? 1 : 0) + " Mio. km") + '</small></div></div>';
    }).join("") + '<p class="muted small" style="margin:8px 0 0">Was du siehst, ist also nie ganz „jetzt“: Selbst den Mond siehst du gut eine Sekunde zu spät.</p>';
  }
  /* Licht aus der Geschichte */
  var HIST = [
    { n: "Sirius", a: "Der hellste Stern am Nachthimmel. Sein Licht ist erst wenige Jahre alt." },
    { n: "Arktur", a: "Etwa zur Zeit der Deutschen Einheit losgeflogen." },
    { n: "Aldebaran", a: "Losgeflogen, als Juri Gagarin als erster Mensch ins All flog." },
    { n: "Regulus", a: "Losgeflogen kurz nach dem Zweiten Weltkrieg." },
    { n: "Dubhe", a: "Losgeflogen, als die Brüder Wright den ersten Motorflug wagten." },
    { n: "Spica", a: "Losgeflogen, als in Amerika die Unabhängigkeit erklärt wurde." },
    { n: "Thuban", a: "Losgeflogen zur Zeit Johann Sebastian Bachs. Vor rund 4 800 Jahren war Thuban übrigens der Polarstern – zur Zeit der Pyramidenbauer." },
    { n: "Polarstern", a: "Losgeflogen, als Galileo Galilei forschte." },
    { n: "Alkyone", label: "Plejaden (Alkyone)", a: "Losgeflogen, als Tycho Brahe und Johannes Kepler den Himmel vermaßen." },
    { n: "Beteigeuze", a: "Losgeflogen kurz bevor Kolumbus Amerika erreichte. Ihre Entfernung ist allerdings unsicher.", unsure: true },
    { n: "Krippe (M44)", dso: true, ly: 577, a: "Losgeflogen, als Gutenberg den Buchdruck entwickelte." },
    { n: "Rigel", a: "Losgeflogen zur Zeit Kaiser Barbarossas. Entfernung mit größerer Unsicherheit.", unsure: true },
    { n: "Orionnebel (M42)", dso: true, ly: 1344, a: "Losgeflogen im frühen Mittelalter. In diesem Nebel entstehen gerade neue Sterne." },
    { n: "Deneb", a: "Losgeflogen in der griechischen Antike – vielleicht auch früher, die Entfernung ist sehr unsicher.", unsure: true },
    { n: "Herkuleshaufen (M13)", dso: true, ly: 22200, a: "Losgeflogen mitten in der letzten Eiszeit. Rund 300 000 Sterne auf engem Raum." },
    { n: "Andromeda-Galaxie (M31)", label: "Andromeda-Galaxie", dso: true, ly: 2500000, a: "Losgeflogen, als in Afrika die ersten Vertreter der Gattung Mensch lebten. Eines der fernsten Dinge, die du mit bloßem Auge sehen kannst." }
  ];
  function yearTxt(ly) {
    var now = new Date(), y = now.getFullYear() + now.getMonth() / 12 - ly;
    if (ly >= 10000) return ly >= 1e6 ? "vor " + fmt(ly / 1e6, 1) + " Mio.<small>Jahren</small>" : "vor " + fmt(Math.round(ly / 1000), 0) + " 000<small>Jahren</small>";
    if (ly > 200) y = Math.round(y / 10) * 10; else y = Math.round(y);
    return y < 0 ? "um " + fmt(-y, 0) + " v. Chr." : "um " + y;
  }
  function leHist() {
    $("leHist").innerHTML = HIST.map(function (h, i) {
      var o = null;
      if (h.dso) { for (var k = 0; k < ST.dso.length; k++) if (ST.dso[k].name === h.n) o = ST.dso[k]; }
      else for (var j = 0; j < STARS.length; j++) if (STARS[j].name === h.n) o = STARS[j];
      if (!o) return "";
      var ly = h.ly || o.ly;
      var best = tonightBest(o), vis = best && best.alt > 10;
      var visTxt = maxAlt(o) < 5 ? "von hier nie zu sehen" : vis ? "heute Nacht sichtbar" : "zurzeit tagsüber am Himmel";
      return '<div class="sn-row' + (h.dso ? "" : " tap") + '"' + (h.dso ? "" : ' data-star="' + esc(h.n) + '" role="button" tabindex="0"') + '><span class="dot" style="background:' + (o.bv != null ? starColor(o.bv) : "#C9C2F2") + '"></span><div class="main"><b style="white-space:normal">' + esc(h.label || h.n) + '</b><span>' + esc(h.a) + '</span><span style="margin-top:3px">' + fmt(ly, ly < 100 ? 1 : 0) + " Lichtjahre · " + visTxt + '</span></div><div class="r">' + yearTxt(ly) + (h.dso ? "" : '<small>zeigen ›</small>') + '</div></div>';
    }).join("");
    Array.prototype.forEach.call($("leHist").querySelectorAll("[data-star]"), function (r) {
      var go = function () { location.href = "./sternewahr-index.html?obj=" + encodeURIComponent(r.getAttribute("data-star")) + "&fov=50"; };
      r.addEventListener("click", go); r.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
    });
    $("leKnow").innerHTML =
      fact("lichtecho", "Ein Lichtjahr", "Die Strecke, die Licht in einem Jahr zurücklegt: rund 9,46 Billionen Kilometer. Ein Auto mit 100 km/h bräuchte dafür über 10 Millionen Jahre.") +
      fact("clock", "299 792 km pro Sekunde", "So schnell ist Licht. In einer einzigen Sekunde käme es siebeneinhalbmal um die Erde.") +
      fact("sky", "Gibt es die Sterne noch?", "Bei den Sternen hier praktisch sicher: Sterne leben Millionen bis Milliarden Jahre – viel länger, als ihr Licht zu uns braucht. Selbst bei Beteigeuze, einem Kandidaten für eine künftige Supernova, ist ein bereits unbemerkter Ausbruch sehr unwahrscheinlich.") +
      fact("globe", "Die Erde als Zeitkapsel", "Das Licht der Erde fliegt ebenfalls ins All. Wer 66 Lichtjahre entfernt mit einem gigantischen Teleskop herschaute, sähe heute die Erde von vor 66 Jahren.");
  }
  function leStart() { if (!LE.raf) LE.raf = requestAnimationFrame(leLoop); }

  /* =====================================================================
     3. PLANETENWEG
     ===================================================================== */
  var PL = [
    { id: "sun", n: "Sonne", au: 0, d: 1392700, col: "#FFD27A", day: "ca. 25 Erdtage (am Äquator)", yr: null, temp: "ca. 5 500 °C an der Oberfläche", g: 27.9,
      x: "Ein Stern mittlerer Größe – und doch vereint sie 99,86 % der gesamten Masse des Sonnensystems. Jede Sekunde verwandelt sie rund vier Millionen Tonnen Masse in Licht und Wärme." },
    { id: "mercury", n: "Merkur", au: 0.387, d: 4879, col: "#C9C0B6", day: "176 Erdtage (Sonnenaufgang bis Sonnenaufgang)", yr: 87.97, temp: "−180 bis +430 °C", g: 0.38,
      x: "Der kleinste und sonnennächste Planet. Weil er kaum Atmosphäre hat, wird es nachts eisig kalt. Ein Merkurtag dauert länger als zwei Merkurjahre." },
    { id: "venus", n: "Venus", au: 0.723, d: 12104, col: "#F1D79E", day: "117 Erdtage", yr: 224.7, temp: "ca. 465 °C", g: 0.90,
      x: "Der heißeste Planet – heißer als Merkur, weil ihre dichte Kohlendioxid-Hülle die Wärme festhält. Sie dreht sich rückwärts: Dort geht die Sonne im Westen auf." },
    { id: "earth", n: "Erde", au: 1.0, d: 12742, col: "#7FB2F0", day: "24 Stunden", yr: 365.256, temp: "im Mittel ca. 15 °C", g: 1.0,
      x: "Der einzige Ort, von dem wir wissen, dass es Leben gibt – und der einzige Planet mit Meeren aus flüssigem Wasser an der Oberfläche." },
    { id: "mars", n: "Mars", au: 1.524, d: 6779, col: "#E7825C", day: "24 h 40 min", yr: 686.98, temp: "im Mittel ca. −60 °C", g: 0.38,
      x: "Hier steht der Olympus Mons, mit rund 22 km einer der höchsten Berge im Sonnensystem. Die rote Farbe kommt von Eisenoxid – also Rost im Staub." },
    { id: "jupiter", n: "Jupiter", au: 5.203, d: 139820, col: "#E1B587", day: "9 h 56 min", yr: 4332.6, temp: "ca. −110 °C an den Wolken", g: 2.53,
      x: "Mehr als 1 300 Erden hätten in ihm Platz. Der Große Rote Fleck ist ein Wirbelsturm, der seit Jahrhunderten tobt und größer ist als die Erde." },
    { id: "saturn", n: "Saturn", au: 9.537, d: 116460, col: "#EEDCA4", day: "10 h 33 min", yr: 10759, temp: "ca. −140 °C an den Wolken", g: 1.07,
      x: "Seine Hauptringe spannen sich über rund 270 000 km, sind aber meist nur einige zehn Meter dick. Saturn ist im Mittel leichter als Wasser – in einer riesigen Wanne würde er schwimmen." },
    { id: "uranus", n: "Uranus", au: 19.19, d: 50724, col: "#A6E0E8", day: "17 h 14 min", yr: 30687, temp: "ca. −195 °C", g: 0.89,
      x: "Er liegt fast auf der Seite: Seine Achse ist um 98° gekippt. Dadurch erlebt jeder Pol rund 42 Jahre Tag und danach 42 Jahre Nacht." },
    { id: "neptune", n: "Neptun", au: 30.07, d: 49244, col: "#7C9BF0", day: "16 h 6 min", yr: 60190, temp: "ca. −200 °C", g: 1.14,
      x: "Hier wehen die schnellsten Winde im Sonnensystem – über 2 000 km/h. Seit seiner Entdeckung 1846 hat er die Sonne erst ein einziges Mal umrundet." }
  ];
  var SIZES = [[0.5, "ein Staubkorn"], [1.5, "ein Sandkorn"], [3, "ein Senfkorn"], [5, "ein Pfefferkorn"], [8, "eine Erbse"], [13, "eine Haselnuss"],
    [19, "eine Murmel"], [28, "eine Kirsche"], [45, "ein Tischtennisball"], [75, "ein Tennisball"], [100, "eine Orange"], [160, "eine Pampelmuse"],
    [250, "ein Fußball"], [450, "ein Wasserball"], [1050, "ein Gymnastikball"], [1800, "ein Strandkorb"], [4500, "ein Auto"], [1e9, "ein Haus"]];
  function sizeWord(mm) { for (var i = 0; i < SIZES.length; i++) if (mm < SIZES[i][0]) return SIZES[i][1]; return "ein Haus"; }
  function mmTxt(mm) { return mm < 10 ? fmt(mm, 1) + " mm" : mm < 1000 ? fmt(mm / 10, 1) + " cm" : fmt(mm / 1000, 2) + " m"; }
  function distTxt(m) { return m < 1000 ? fmt(m, 0) + " m" : fmt(m / 1000, m < 10000 ? 2 : 1) + " km"; }
  var PW = { km: 3, mode: "line", dir: 90, anchor: null, map: null, layers: null, watch: null, live: null, reached: {} };
  function pwLoad() {
    var s = lsGet("staunwahr_planetenweg", null);
    if (s) { PW.km = s.km || 3; PW.mode = s.mode || "line"; PW.dir = isFinite(s.dir) ? s.dir : 90; PW.anchor = s.anchor || null; }
  }
  function pwSave() { lsSet("staunwahr_planetenweg", { km: PW.km, mode: PW.mode, dir: PW.dir, anchor: PW.anchor }); }
  function pwScale() { return PW.km * 1000 / (30.07 * AU); } // Meter Modell pro Meter echt
  function helioLon(id, date) {
    var jd = A.toJD(date), T = A.centuries(A.toTT(jd));
    if (id === "earth") { var s = A.sun(jd); return (s.lon + 180) % 360; }
    var h = A.helio(id, T);
    return (Math.atan2(h[1], h[0]) * R2D + 360) % 360;
  }
  function pwBearing(p) {
    if (PW.mode === "line") return PW.dir;
    if (p.id === "sun") return 0;
    try { return (360 - helioLon(p.id, new Date())) % 360; } catch (e) { return PW.dir; }
  }
  function pwSun() { return PW.anchor || { lat: LOC.lat, lon: LOC.lon }; }
  function pwUpdate() {
    var s = pwScale();
    Array.prototype.forEach.call($("pwScale").querySelectorAll(".chip"), function (b) { var on = +b.getAttribute("data-km") === PW.km; b.classList.toggle("active", on); b.setAttribute("aria-checked", on); });
    Array.prototype.forEach.call($("pwMode").querySelectorAll(".chip"), function (b) { var on = b.getAttribute("data-m") === PW.mode; b.classList.toggle("active", on); b.setAttribute("aria-checked", on); });
    $("pwDir").hidden = PW.mode !== "line";
    $("pwDir").innerHTML = PW.mode === "line" ? '<span class="muted small" style="align-self:center;margin-right:2px">Richtung:</span>' + [0, 45, 90, 135, 180, 225, 270, 315].map(function (a) {
      return '<button type="button" class="chip' + (a === PW.dir ? " active" : "") + '" data-a="' + a + '">' + DIRS[a / 45] + '</button>';
    }).join("") : "";
    Array.prototype.forEach.call($("pwDir").querySelectorAll(".chip"), function (b) { b.addEventListener("click", function () { PW.dir = +b.getAttribute("data-a"); pwSave(); pwUpdate(); }); });
    var nep = 30.07 * AU * s;
    var sunMm = PL[0].d * 1e6 * s;
    $("pwTopSub").textContent = PW.mode === "line" ? "Planeten in einer Linie nach " + DIRS_LONG[PW.dir / 45] : "Echte Stellung am " + dateTxt(new Date());
    var proxLy = 4.2465, proxM = proxLy * LY_M * s;
    $("pwStats").innerHTML = cell("Bis Neptun", distTxt(nep), "zu Fuß " + durTxt(nep / 1.35)) +
      cell("Sonne", mmTxt(sunMm), "so groß wie " + sizeWord(sunMm), true) +
      cell("Nächster Stern", fmt(proxM / 1000, 0) + " km", proxM / 1000 > 40075 / 2 ? "weiter als halb um die Erde" : "Proxima Centauri");
    pwRenderList();
    pwNumbers();
    drawPlan();
    pwMapRefresh();
  }
  PW.open = null;
  function yrTxt(days) { return days < 1000 ? fmt(days, 0) + " Erdtage" : fmt(days / 365.25, days < 20000 ? 1 : 0) + " Erdjahre"; }
  function planetTonight(id) {
    var now = Date.now(), best = null, inDark = false;
    for (var m = 0; m <= 24 * 60; m += 15) {
      var d = new Date(now + m * 60000), dark = sunAltAt(LOC.lat, LOC.lon, d) < -8;
      if (!dark) { if (inDark) break; continue; }
      inDark = true;
      var pl = A.planet(id, A.toJD(d)), aa = altNow(pl.ra, pl.dec, d);
      if (!best || aa.alt > best.alt) best = { d: d, alt: aa.alt, az: aa.az, mag: pl.mag };
    }
    return best;
  }
  function pwDetail(p) {
    var s = pwScale(), now = new Date(), jd = A.toJD(now);
    var g = '<div class="g">' +
      '<div><span>Durchmesser</span><b>' + fmt(p.d, 0) + ' km</b></div>' +
      '<div><span>' + (p.id === "sun" ? "Schwerkraft" : "Abstand zur Sonne") + '</span><b>' + (p.id === "sun" ? fmt(p.g, 1) + " × Erde" : fmt(p.au * AU / 1e9, 0) + " Mio. km") + '</b></div>' +
      '<div><span>Ein Tag</span><b style="font-size:12.5px">' + esc(p.day) + '</b></div>' +
      '<div><span>Ein Jahr</span><b style="font-size:12.5px">' + (p.yr ? yrTxt(p.yr) : "–") + '</b></div>' +
      '<div><span>Temperatur</span><b style="font-size:12.5px">' + esc(p.temp) + '</b></div>' +
      '<div><span>' + (p.id === "sun" ? "Größe" : "Schwerkraft") + '</span><b>' + (p.id === "sun" ? "109 × Erde" : fmt(p.g, 2) + " × Erde") + '</b></div></div>';
    var hl = [];
    var m = leCurrent();
    if (m && p.yr) {
      var ageDays = (now - momentDate(m)) / 86400000;
      if (ageDays > 0) {
        var n = ageDays / p.yr;
        var next = momentDate(m).getTime() + Math.ceil(n) * p.yr * 86400000;
        hl.push("Seit „" + esc(m.name) + "“ hat " + (p.id === "earth" ? "die Erde" : p.n) + " die Sonne <b>" + fmt(n, n < 10 ? 2 : 1) + "-mal</b> umrundet" + (p.id === "earth" ? "." : " – dein nächstes „" + p.n + "-Jahr“ ist am " + dateTxt(new Date(next)) + " vollendet."));
      }
    }
    var w = parseFloat(String($("pwWeight").value || "").replace(",", "."));
    if (w > 0 && w < 400) hl.push("Mit " + fmt(w, 0) + " kg würdest du dich dort fühlen wie <b>" + fmt(w * p.g, 0) + " kg</b>" + (p.g > 2 ? " – Aufstehen wäre Schwerstarbeit." : p.g < 0.5 ? " – deine Sprünge wären über zweieinhalbmal so hoch." : "."));
    if (p.id !== "sun" && p.id !== "earth") {
      var pl = A.planet(p.id, jd), lt = pl.dist * AU / 1000 / C_KMS;
      hl.push("Jetzt von der Erde entfernt: <b>" + fmt(pl.dist * AU / 1e9, 0) + " Mio. km</b> – sein Licht braucht " + lightTxt(lt) + " bis zu dir.");
      var t = planetTonight(p.id);
      hl.push(t && t.alt > 8 ? "Heute Nacht sichtbar: am höchsten gegen <b>" + timeTxt(t.d) + " Uhr</b>, " + Math.round(t.alt) + "° hoch im " + dirWord(t.az, true) + (t.mag < 2 ? " – hell und mit bloßem Auge leicht zu finden." : t.mag < 6 ? " – mit bloßem Auge erkennbar." : " – nur mit Fernglas oder Teleskop.") : "Heute Nacht nicht gut zu sehen – er steht zu nah an der Sonne oder unter dem Horizont.");
    }
    var mm = p.d * 1e6 * s;
    hl.push("Im Modell: <b>" + mmTxt(mm) + "</b> groß, so groß wie " + sizeWord(mm) + (p.au ? ", " + distTxt(p.au * AU * s) + " von der Sonne." : "."));
    return g + '<p>' + esc(p.x) + '</p>' + hl.map(function (h) { return '<div class="hl">' + h + '</div>'; }).join("");
  }
  function pwRenderList() {
    var s = pwScale();
    $("pwList").innerHTML = PL.map(function (p) {
      var mm = p.d * 1e6 * s, dm = p.au * AU * s, on = PW.open === p.id;
      var light = p.au * AU / 299792458;
      return '<div class="sn-row tap' + (on ? " open" : "") + '" data-p="' + p.id + '" role="button" tabindex="0" aria-expanded="' + on + '"><span class="dot" style="background:' + p.col + '"></span><div class="main"><b>' + p.n + '</b><span>wie ' + sizeWord(mm) + " · " + mmTxt(mm) + '</span></div><div class="r">' + (p.id === "sun" ? "Start" : distTxt(dm)) + '<small>' + (p.id === "sun" ? "bei dir" : "Licht: " + durTxt(light)) + '</small></div><svg class="wzi chev" aria-hidden="true" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
        '<div class="sn-pd' + (on ? " open" : "") + '">' + (on ? pwDetail(p) : "") + '</div>';
    }).join("");
    Array.prototype.forEach.call($("pwList").querySelectorAll("[data-p]"), function (r) {
      var tg = function () { var id = r.getAttribute("data-p"); PW.open = PW.open === id ? null : id; pwRenderList(); };
      r.addEventListener("click", tg); r.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tg(); } });
    });
  }
  function pwNumbers() {
    var s = pwScale();
    var step = 0.75 / s / 1000; // km im All pro Schritt
    var cModel = 299792458 * s * 3.6; // km/h
    var earthMm = 12742 * 1e6 * s, moonD = 384400 * 1000 * s, moonMm = 3474 * 1e6 * s;
    var yrs = (Date.now() - Date.UTC(2023, 0, 1)) / (365.25 * 86400000);
    var voyAu = 159 + 3.57 * yrs;
    $("pwNumbers").innerHTML =
      fact("walk", "Ein Schritt = " + (step >= 1e6 ? fmt(step / 1e6, 1) + " Mio. km" : fmt(step, 0) + " km") + " im All", "Mit jedem Schritt von 75 cm legst du in diesem Modell eine Strecke zurück, für die ein Verkehrsflugzeug " + durTxt(step / 900 * 3600).replace(" Tage", " Tage") + " bräuchte.") +
      fact("lichtecho", "Licht kriecht mit " + (cModel < 10 ? fmt(cModel, 1) : fmt(cModel, 0)) + " km/h", cModel < 6 ? "Im Modell ist das Licht langsamer als du beim Spazierengehen – so leer und weit ist das Sonnensystem." : "Im Modell ist das Licht etwa so schnell wie " + (cModel < 30 ? "ein Fahrrad" : cModel < 150 ? "ein Auto" : "ein Schnellzug") + ".") +
      fact("globe", "Erde und Mond: " + (moonD < 1 ? fmt(moonD * 100, 0) + " cm" : fmt(moonD, 1) + " m") + " auseinander", "Die Erde (" + mmTxt(earthMm) + ") und der Mond (" + mmTxt(moonMm) + ") – bis zum Mond und knapp dahinter, weiter ist bisher kein Mensch gereist.") +
      fact("sun", "99,86 % in der Sonne", "Fast die gesamte Masse des Sonnensystems steckt in der Sonne. Der Rest – alle Planeten, Monde, Kometen – ist fast nichts.") +
      fact("planeten", "Pluto läge " + distTxt(39.5 * AU * s) + " entfernt", "Der Zwergplanet zieht auf einer langgestreckten Bahn noch weit jenseits von Neptun seine Runden.") +
      fact("tacho", "Voyager 1 wäre schon " + distTxt(voyAu * AU * s) + " weit", "Die Raumsonde ist seit 1977 unterwegs und das fernste Objekt, das Menschen gebaut haben – rund " + fmt(voyAu, 0) + "-mal so weit von der Sonne entfernt wie die Erde. Ungefähr Ende 2026 erreicht sie eine Entfernung von einem Lichttag.");
  }
  function drawPlan() {
    var cv = $("pwPlan"); if (!cv.offsetParent) return;
    var P = prep(cv), c = P.c, W = P.W, H = P.H;
    var cx = W / 2, cy = H / 2 + 12, R = W * 0.38, s = pwScale();
    var rr = function (au) { return Math.sqrt(au / 30.07) * R; };
    // Bahnen
    PL.forEach(function (p) {
      if (!p.au) return;
      c.beginPath(); c.arc(cx, cy, rr(p.au), 0, TAU); c.strokeStyle = "rgba(226,220,255,.16)"; c.lineWidth = 1; c.stroke();
    });
    // Sonne
    var sg = c.createRadialGradient(cx, cy, 0, cx, cy, 16);
    sg.addColorStop(0, "#FFF6D8"); sg.addColorStop(.35, "#FFD27A"); sg.addColorStop(1, "rgba(255,190,90,0)");
    c.beginPath(); c.arc(cx, cy, 16, 0, TAU); c.fillStyle = sg; c.fill();
    // Planeten
    PL.forEach(function (p, i) {
      if (!p.au) return;
      var b = pwBearing(p) * D2R, r = rr(p.au);
      var x = cx + Math.sin(b) * r, y = cy - Math.cos(b) * r;
      var sz = p.id === "jupiter" || p.id === "saturn" ? 5 : p.id === "uranus" || p.id === "neptune" ? 4 : 3.2;
      c.beginPath(); c.arc(x, y, sz, 0, TAU); c.fillStyle = p.col; c.fill();
      if (p.id === "saturn") { c.beginPath(); c.ellipse(x, y, sz * 2, sz * .7, -.4, 0, TAU); c.strokeStyle = "rgba(238,220,164,.8)"; c.lineWidth = 1; c.stroke(); }
      if (PW.mode === "real" && (i >= 5 || p.id === "earth")) {
        c.font = "600 10px " + FONT; c.fillStyle = p.id === "earth" ? "#9FC4F5" : SOFT; c.textAlign = "center"; c.textBaseline = "middle";
        var ux = Math.sin(b), uy = -Math.cos(b), lo = p.id === "earth" ? 16 : sz + 11;
        var lx2 = x + ux * lo, ly2 = y + uy * lo;
        if (ly2 < 62) { c.textAlign = "left"; lx2 = x + sz + 7; ly2 = y; }
        c.fillText(p.n, lx2, ly2);
      } else if (PW.mode === "line" && i >= 5) {
        c.font = "600 10px " + FONT; c.fillStyle = SOFT; c.textAlign = "center";
        var below = PW.mode === "real" || i % 2 === 0;
        // in Linienrichtung abwechselnd seitlich versetzt
        var nx = Math.cos(b), ny = Math.sin(b), off = sz + 9;
        var tx = PW.mode === "line" ? x + (below ? nx : -nx) * off : x, ty = PW.mode === "line" ? y + (below ? ny : -ny) * off : y + sz + 9;
        c.textBaseline = "middle"; c.fillText(p.n, tx, ty);
      }
    });
    if (PW.mode === "line") {
      c.font = "600 10px " + FONT; c.fillStyle = SOFT; c.textAlign = "center"; c.textBaseline = "middle";
      var b0 = PW.dir * D2R, rm = (rr(0.387) + rr(1.524)) / 2;
      var gx = cx + Math.sin(b0) * rm + Math.cos(b0) * 30, gy = cy - Math.cos(b0) * rm + Math.sin(b0) * 30;
      c.fillText("Merkur bis Mars", gx, gy);
    } else {
      // Bezugsrichtung am Rand
      c.strokeStyle = "rgba(226,220,255,.35)"; c.lineWidth = 1;
      c.beginPath(); c.moveTo(W - 18, H - 42); c.lineTo(W - 18, H - 62); c.moveTo(W - 22, H - 57); c.lineTo(W - 18, H - 62); c.lineTo(W - 14, H - 57); c.stroke();
    }
    // eigene Position im Live-Betrieb
    if (PW.live) {
      var lb = PW.live.brg * D2R, lr = Math.sqrt(clamp(PW.live.dist / (30.07 * AU * s), 0, 1.2)) * R;
      var lxp = cx + Math.sin(lb) * lr, lyp = cy - Math.cos(lb) * lr;
      c.beginPath(); c.arc(lxp, lyp, 6, 0, TAU); c.fillStyle = "#fff"; c.fill();
      c.beginPath(); c.arc(lxp, lyp, 10, 0, TAU); c.strokeStyle = "rgba(255,255,255,.5)"; c.lineWidth = 1.5; c.stroke();
    }
    c.font = "500 9.5px " + FONT; c.fillStyle = "rgba(226,220,255,.5)"; c.textAlign = "left"; c.textBaseline = "alphabetic";
    c.fillText(PW.mode === "real" ? "Pfeil: Richtung Frühlingspunkt · Abstände gestaucht" : "Abstände zur besseren Übersicht gestaucht", 12, H - 10);
  }
  /* Karte (nur nach Zustimmung) */
  function consentState() {
    var v = null; try { v = localStorage.getItem("wz_map_consent"); } catch (e) { }
    return v;
  }
  function setConsent(v) {
    try { localStorage.setItem("wz_map_consent", v); localStorage.setItem("wk_map_consent_v2", v); localStorage.setItem("kg_map_consent", v); } catch (e) { }
  }
  var leafletP = null;
  function loadLeaflet() {
    if (window.L) return Promise.resolve();
    if (leafletP) return leafletP;
    leafletP = new Promise(function (res, rej) {
      var l = document.createElement("link"); l.rel = "stylesheet"; l.href = "./lib-leaflet.css"; document.head.appendChild(l);
      var sc = document.createElement("script"); sc.src = "./lib-leaflet.js"; sc.onload = function () { res(); }; sc.onerror = function () { leafletP = null; rej(new Error("Karte konnte nicht geladen werden.")); };
      document.body.appendChild(sc);
    });
    return leafletP;
  }
  function pwShowMap() {
    var st = consentState();
    if (st === "granted") { loadLeaflet().then(pwMakeMap).catch(function (e) { pwFallback(e.message); }); return; }
    $("snConsent").hidden = false;
  }
  function pwFallback(msg) {
    $("pwMap").innerHTML = '<div class="fallback">' + icon("map") + '<span>' + esc(msg) + '</span></div>';
  }
  function pwMakeMap() {
    var box = $("pwMap");
    if (PW.map) { pwMapRefresh(); return; }
    box.innerHTML = "";
    var sun = pwSun();
    PW.map = L.map(box, { zoomControl: true, attributionControl: true }).setView([sun.lat, sun.lon], 13);
    L.tileLayer("https://tile.openstreetmap.de/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap-Mitwirkende" }).addTo(PW.map);
    PW.layers = L.layerGroup().addTo(PW.map);
    pwMapRefresh(true);
  }
  function pwMapRefresh(fit) {
    if (!PW.map || !window.L) return;
    var sun = pwSun(), s = pwScale();
    PW.layers.clearLayers();
    PL.forEach(function (p) {
      var dm = p.au * AU * s;
      if (p.au) L.circle([sun.lat, sun.lon], { radius: dm, color: p.col, weight: 1.5, opacity: .8, fill: false, interactive: false }).addTo(PW.layers);
      var pos = p.au ? destPoint(sun.lat, sun.lon, pwBearing(p), dm) : sun;
      L.marker([pos.lat, pos.lon], { icon: L.divIcon({ className: "", html: '<div class="sn-pmark" style="background:' + p.col + '"></div>', iconSize: [14, 14], iconAnchor: [7, 7] }), keyboard: false }).addTo(PW.layers);
      if (p.id === "sun" || p.au > 1.6) L.marker([pos.lat, pos.lon], { icon: L.divIcon({ className: "", html: '<div class="sn-plabel">' + p.n + '</div>', iconSize: null, iconAnchor: [-10, 9] }), interactive: false, keyboard: false }).addTo(PW.layers);
    });
    if (PW.live && PW.live.pos) L.circleMarker([PW.live.pos.lat, PW.live.pos.lon], { radius: 7, color: "#fff", weight: 3, fillColor: "#5A2FBE", fillOpacity: 1 }).addTo(PW.layers);
    if (fit !== false) {
      var nep = 30.07 * AU * s;
      var b = L.latLng(sun.lat, sun.lon).toBounds(nep * 2.1);
      PW.map.fitBounds(b);
    }
  }
  function pwGo() {
    if (PW.watch != null) { pwStop(); return; }
    if (!navigator.geolocation) { if (window.wzAlert) wzAlert("Standort ist auf diesem Gerät nicht verfügbar."); return; }
    $("pwGo").innerHTML = icon("close") + " Planetenweg beenden";
    $("pwLive").hidden = false; $("pwLive").innerHTML = "<b>Standort wird bestimmt …</b><span>Die Sonne wird an deinen jetzigen Standort gesetzt.</span>";
    PW.anchor = null; PW.reached = {};
    PW.watch = navigator.geolocation.watchPosition(function (p) {
      var pos = { lat: p.coords.latitude, lon: p.coords.longitude };
      if (!PW.anchor) { PW.anchor = pos; pwSave(); pwUpdate(); pwMapRefresh(true); }
      var dist = hav(PW.anchor.lat, PW.anchor.lon, pos.lat, pos.lon) * 1000;
      PW.live = { pos: pos, dist: dist, brg: bearing(PW.anchor.lat, PW.anchor.lon, pos.lat, pos.lon), acc: p.coords.accuracy };
      pwLive();
    }, function () {
      $("pwLive").innerHTML = "<b>Kein Standort</b><span>Bitte erlaube den Standortzugriff, um den Weg zu gehen.</span>";
    }, { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 });
  }
  function pwStop() {
    if (PW.watch != null) navigator.geolocation.clearWatch(PW.watch);
    PW.watch = null; PW.live = null;
    $("pwGo").innerHTML = icon("walk") + " Planetenweg starten";
    $("pwLive").hidden = true;
    drawPlan(); pwMapRefresh(false);
  }
  function pwLive() {
    var s = pwScale(), d = PW.live.dist, prev = null, next = null;
    for (var i = 1; i < PL.length; i++) { var dm = PL[i].au * AU * s; if (dm <= d) prev = PL[i]; else { next = PL[i]; break; } }
    PL.forEach(function (p) {
      if (!p.au || PW.reached[p.id]) return;
      var dm = p.au * AU * s, tol = Math.max(12, dm * 0.02, PW.live.acc || 0);
      if (Math.abs(d - dm) <= tol) {
        PW.reached[p.id] = true;
        if (navigator.vibrate) try { navigator.vibrate([60, 60, 120]); } catch (e) { }
        if (window.wzToast) wzToast("Du kreuzt die Bahn von " + p.n + "!");
      }
    });
    var realKm = d / s / 1000;
    $("pwLive").innerHTML = "<b>" + distTxt(d) + " von der Sonne</b><span>" +
      (next ? (prev ? "Zwischen " + prev.n + " und " + next.n + " · " : "") + next.n + " in " + distTxt(next.au * AU * s - d) : "Jenseits von Neptun – willkommen im Kuipergürtel!") +
      "</span><span>Im echten Sonnensystem wärst du " + (realKm > 1e9 ? fmt(realKm / 1e9, 2) + " Mrd. km" : fmt(realKm / 1e6, 0) + " Mio. km") + " von der Sonne entfernt.</span>";
    drawPlan(); pwMapRefresh(false);
  }
  function pwInit() {
    pwLoad();
    Array.prototype.forEach.call($("pwScale").querySelectorAll(".chip"), function (b) { b.addEventListener("click", function () { PW.km = +b.getAttribute("data-km"); pwSave(); pwUpdate(); pwMapRefresh(true); }); });
    Array.prototype.forEach.call($("pwMode").querySelectorAll(".chip"), function (b) { b.addEventListener("click", function () { PW.mode = b.getAttribute("data-m"); pwSave(); pwUpdate(); }); });
    $("pwMapBtn").addEventListener("click", pwShowMap);
    $("pwGo").addEventListener("click", pwGo);
    var w0 = lsGet("staunwahr_gewicht", "");
    if (w0) $("pwWeight").value = w0;
    $("pwWeight").addEventListener("change", function () { var v = this.value.trim(); lsSet("staunwahr_gewicht", v); if (PW.open) pwRenderList(); });
    $("snConsentYes").addEventListener("click", function () { setConsent("granted"); $("snConsent").hidden = true; loadLeaflet().then(pwMakeMap).catch(function (e) { pwFallback(e.message); }); });
    $("snConsentNo").addEventListener("click", function () { setConsent("declined"); $("snConsent").hidden = true; pwFallback("Ohne Karte – die Ansicht von oben und die Liste zeigen alle Abstände."); });
    if (consentState() === "declined") pwFallback("Kartenanzeige laut deiner Wahl aus. Ändern kannst du das in den Einstellungen der WahrZentrale.");
    pwUpdate();
  }

  /* =====================================================================
     4. RAUMTACHO
     ===================================================================== */
  var GM_SUN = 1.32712440018e20;
  var RT = { sel: 1, t0: Date.now(), raf: 0 };
  function speeds() {
    var rot = 465.1 * Math.cos(LOC.lat * D2R); // m/s
    var r = A.sun(A.toJD(new Date())).dist * AU;
    var orb = Math.sqrt(GM_SUN * (2 / r - 1 / (1.000001018 * AU)));
    return [
      { id: "rot", n: "Erddrehung", sub: "bei dir auf " + fmt(LOC.lat, 1) + "° Breite", v: rot, col: "#7FB2F0", lap: "eine Runde pro Tag", ca: false,
        x: "Am Äquator wären es 1 670 km/h, an den Polen null. Deshalb starten Raketen gern nahe am Äquator – sie bekommen Schwung geschenkt." },
      { id: "orb", n: "Um die Sonne", sub: "mit der Erde auf ihrer Bahn", v: orb, col: "#FFD27A", lap: "eine Runde pro Jahr", ca: false,
        x: "Anfang Januar ist die Erde der Sonne am nächsten und am schnellsten, Anfang Juli am langsamsten. Heute beträgt der Abstand " + fmt(r / 1e9, 1) + " Mio. km." },
      { id: "apex", n: "Zu den Nachbarsternen", sub: "die Sonne gegenüber den Sternen ringsum", v: 19700, col: "#8FE3C4", lap: "Richtung Sternbild Herkules", ca: true,
        x: "Die Sonne zieht mitsamt allen Planeten in Richtung des Sternbilds Herkules, nicht weit von der hellen Wega. Die Nachbarsterne bewegen sich dabei alle ein wenig anders." },
      { id: "gal", n: "Um die Milchstraße", sub: "mit der Sonne um das galaktische Zentrum", v: 230000, col: "#B9A6F5", lap: "eine Runde in ca. 230 Mio. Jahren", ca: true,
        x: "Als die Sonne zuletzt an derselben Stelle ihrer Bahn war, lebten auf der Erde die ersten Dinosaurier. Seit ihrer Entstehung hat sie erst rund 20 Runden gedreht." },
      { id: "cmb", n: "Gegen den Urknall", sub: "gegenüber der kosmischen Hintergrundstrahlung", v: 369800, col: "#F29AC0", lap: "Richtung Sternbild Becher", ca: true,
        x: "Die Hintergrundstrahlung ist das Nachleuchten des jungen Universums. An ihr lässt sich messen, wie schnell wir uns durch den Kosmos bewegen – ein natürlicher Bezugspunkt für alles." }
    ];
  }
  var REFS = [{ n: "Auto", v: 130 }, { n: "Flugzeug", v: 900 }, { n: "Raumstation", v: 27600 }, { n: "schnellste Raumsonde", v: 692000 }];
  var RECORDS = [
    { n: "Schnellster Mensch zu Fuß", s: "Höchsttempo im 100-m-Weltrekordlauf 2009", v: 44.7 },
    { n: "Hochgeschwindigkeitszug", s: "übliche Höchstgeschwindigkeit in Deutschland", v: 300 },
    { n: "Schallgeschwindigkeit", s: "in Luft bei 20 °C", v: 1235 },
    { n: "Überschall-Passagierflugzeug", s: "Reisegeschwindigkeit, bis 2003 im Einsatz", v: 2180 },
    { n: "Internationale Raumstation", s: "einmal um die Erde in gut 90 Minuten", v: 27600 },
    { n: "Schnellste Menschen", s: "Apollo 10 beim Rückflug vom Mond, 1969", v: 39897 },
    { n: "Voyager 1", s: "seit 1977 auf dem Weg aus dem Sonnensystem", v: 61000 },
    { n: "Du – um die Sonne", s: "gerade jetzt, ganz ohne Anschnallen", v: 0, you: true },
    { n: "Schnellste Raumsonde", s: "Parker Solar Probe nahe der Sonne, 2024", v: 692000 },
    { n: "Licht", s: "schneller geht es nicht", v: 1079252849 }
  ];

  function rtUpdateStatic() {
    var S = speeds();
    if (RT.sel >= S.length) RT.sel = 1;
    $("rtSel").innerHTML = S.map(function (s, i) { return '<button type="button" class="sn-chip-d' + (i === RT.sel ? " active" : "") + '" data-i="' + i + '" role="radio" aria-checked="' + (i === RT.sel) + '">' + esc(s.n) + '</button>'; }).join("");
    Array.prototype.forEach.call($("rtSel").querySelectorAll("button"), function (b) { b.addEventListener("click", function () { RT.sel = +b.getAttribute("data-i"); rtUpdateStatic(); rtTick(true); }); });
    $("rtSelSub").textContent = S[RT.sel].sub + " · " + S[RT.sel].lap;
    $("rtList").innerHTML = S.map(function (s) {
      return '<div class="sn-row" style="align-items:flex-start"><span class="dot" style="background:' + s.col + ';margin-top:4px"></span><div class="main"><b>' + esc(s.n) + '</b><span>' + esc(s.sub) + " · " + esc(s.lap) + '</span><span style="margin-top:4px">' + esc(s.x) + '</span></div><div class="r">' + (s.ca ? "ca. " : "") + fmt(s.v * 3.6, 0) + '<small>km/h</small><small>' + fmt(s.v / 1000, s.v < 10000 ? 2 : 1) + ' km/s</small></div></div>';
    }).join("") + '<p class="muted small" style="margin:8px 0 0">Die Bewegungen überlagern sich in verschiedene Richtungen – man darf sie nicht einfach addieren. Die Werte ab „Zu den Nachbarsternen“ sind gerundete Messwerte.</p>';
    $("rtDay").innerHTML = S.map(function (s) {
      var d = s.v * 86400 / 1000;
      var cmp = d < 40075 ? "rund " + fmt(d / 40075 * 100, 0) + " % des Erdumfangs" : d < 384400 * 2 ? fmt(d / 40075, 0) + "-mal um die Erde" : fmt(d / 384400, 0) + "-mal die Strecke zum Mond";
      return '<div class="sn-row"><span class="dot" style="background:' + s.col + '"></span><div class="main"><b>' + esc(s.n) + '</b><span>' + cmp + '</span></div><div class="r">' + (s.ca ? "ca. " : "") + (d >= 1e6 ? fmt(d / 1e6, 1) + " Mio. km" : fmt(d, 0) + " km") + '</div></div>';
    }).join("");
    var orb = S[1].v, rot = S[0].v;
    var maxLog = Math.log10(1.2e9), minLog = Math.log10(30);
    $("rtRecords").innerHTML = RECORDS.map(function (r) {
      var v = r.you ? orb * 3.6 : r.v, w = clamp((Math.log10(v) - minLog) / (maxLog - minLog), 0.02, 1) * 100;
      return '<div class="sn-row" style="display:block"><div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline"><div class="main"><b' + (r.you ? ' style="color:var(--accent)"' : "") + '>' + esc(r.n) + '</b><span>' + esc(r.s) + '</span></div><div class="r">' + (r.v > 1e8 ? fmt(v / 1e9, 2) + " Mrd." : fmt(v, v < 100 ? 1 : 0)) + '<small>km/h</small></div></div><div class="sn-bar"><i style="width:' + w.toFixed(1) + '%;background:' + (r.you ? "var(--accent)" : "linear-gradient(90deg,#B9A6F5,#FFD27A)") + '"></i></div></div>';
    }).join("") + '<p class="muted small" style="margin:8px 0 0">Balken in logarithmischer Skala – jeder große Abschnitt ist zehnmal so schnell wie der vorige.</p>';
    $("rtCompare").innerHTML =
      fact("clock", "In 5 Sekunden Lesezeit: " + fmt(orb * 5 / 1000, 0) + " km", "So weit trägt dich die Erde um die Sonne, während du diesen Satz liest.") +
      fact("ruler", "Hamburg–München in " + fmt(612000 / orb, 0) + " Sekunden", "Rund 612 km Luftlinie – auf der Erdbahn ein Katzensprung.") +
      fact("globe", "Bis zum Mond in " + fmt(384400000 / orb / 3600, 1) + " Stunden", "So schnell wärst du mit dem Tempo der Erde dort. Die Apollo-Astronauten brauchten rund drei Tage.") +
      fact("sun", "Erddrehung bei dir: " + fmt(rot * 3.6, 0) + " km/h", rot * 3.6 > 1235 ? "Schneller als der Schall – und du merkst nichts davon." : rot * 3.6 > 900 ? "Schneller als ein Verkehrsflugzeug – und du merkst nichts davon." : "Fast so schnell wie ein Verkehrsflugzeug – und du merkst nichts davon.") +
      fact("info", "Warum spüren wir nichts?", "Wir spüren nur Änderungen der Geschwindigkeit, nicht die Geschwindigkeit selbst – wie in einem ruhig fliegenden Flugzeug. Galileo Galilei beschrieb das schon vor fast 400 Jahren. Und weil die Luft mitreist, weht auch kein Fahrtwind.") +
      fact("tacho", "Riesig schnell, riesig weit", "Um das Zentrum der Milchstraße bist du über zweihundertmal so schnell wie eine Gewehrkugel – und brauchst trotzdem 230 Millionen Jahre für eine Runde. So groß ist unsere Galaxie.");
    drawDial();
  }
  function rtUpdateLife() {
    var m = leCurrent();
    $("rtLife").hidden = !m; if (!m) return;
    var t = (Date.now() - momentDate(m).getTime()) / 1000; if (t < 0) { $("rtLife").hidden = true; return; }
    var S = speeds();
    var orbKm = S[1].v * t / 1000, rotKm = S[0].v * t / 1000, galKm = S[3].v * t / 1000;
    var big = function (x) { return x >= 1e9 ? fmt(x / 1e9, 1) + " Mrd. km" : fmt(x / 1e6, 1) + " Mio. km"; };
    $("rtLifeBody").innerHTML =
      '<p class="muted small" style="margin:-4px 0 6px">Seit ' + esc(m.name) + " (" + dateTxt(momentDate(m)) + ")</p>" +
      fact("sun", big(orbKm) + " um die Sonne", fmt(t / (365.2564 * 86400), 1) + " Runden – jede rund 940 Millionen Kilometer lang.") +
      fact("globe", big(rotKm) + " mit der Erddrehung", "So viel Weg legt dein Standort durch die tägliche Drehung zurück.") +
      fact("tacho", big(galKm) + " durch die Milchstraße", "Und trotzdem erst ein winziger Bruchteil einer einzigen Runde um das Zentrum – die ist rund 1,5 Trillionen Kilometer lang.") +
      fact("planeten", big(S[2].v * t / 1000) + " Richtung Herkules", "So weit hat sich die Sonne seit damals gegenüber ihren Nachbarsternen verschoben.");
  }
  function logPos(v) { return (Math.log10(v) - 2) / (7 - 2); } // 100 … 10 Mio. km/h
  function drawDial() {
    var cv = $("rtDial"); if (!cv.offsetParent) return;
    var P = prep(cv), c = P.c, W = P.W, H = P.H;
    var cx = W / 2, cy = H * 0.86, R = Math.min(W * 0.42, H * 0.74);
    var a0 = Math.PI * 1.0, a1 = Math.PI * 2.0;
    var ang = function (kmh) { return a0 + clamp(logPos(kmh), 0, 1) * (a1 - a0); };
    // Skalenbogen
    var gg = c.createLinearGradient(cx - R, cy, cx + R, cy);
    gg.addColorStop(0, "rgba(127,178,240,.55)"); gg.addColorStop(.5, "rgba(255,210,122,.55)"); gg.addColorStop(1, "rgba(242,154,192,.55)");
    c.beginPath(); c.arc(cx, cy, R, a0, a1); c.strokeStyle = gg; c.lineWidth = 10; c.lineCap = "round"; c.stroke(); c.lineCap = "butt";
    c.beginPath(); c.arc(cx, cy, R - 14, a0, a1); c.strokeStyle = "rgba(226,220,255,.12)"; c.lineWidth = 1; c.stroke();
    // Teilstriche
    c.font = "600 9.5px " + MONO; c.textAlign = "center"; c.textBaseline = "middle";
    var labs = { 2: "100", 3: "1 000", 4: "10 000", 5: "100 000", 6: "1 Mio.", 7: "10 Mio." };
    for (var e = 2; e <= 7; e += 0.25) {
      var a = ang(Math.pow(10, e)), major = Math.abs(e - Math.round(e)) < 1e-6;
      var r1 = R - 18, r2 = R - (major ? 28 : 22);
      c.beginPath(); c.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); c.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
      c.strokeStyle = major ? "rgba(226,220,255,.6)" : "rgba(226,220,255,.25)"; c.lineWidth = major ? 1.4 : 1; c.stroke();
      if (major) { c.fillStyle = "rgba(226,220,255,.62)"; c.fillText(labs[Math.round(e)], cx + Math.cos(a) * (R - 40), cy + Math.sin(a) * (R - 40)); }
    }
    // Vergleichsmarken außen
    c.font = "500 9px " + FONT;
    REFS.forEach(function (rf, i) {
      var a = ang(rf.v), r1 = R + 7, r2 = R + 12;
      c.beginPath(); c.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); c.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
      c.strokeStyle = "rgba(226,220,255,.45)"; c.lineWidth = 1; c.stroke();
      c.save(); c.translate(cx + Math.cos(a) * (R + 16), cy + Math.sin(a) * (R + 16)); c.rotate(a + Math.PI / 2);
      c.fillStyle = "rgba(226,220,255,.55)"; c.textAlign = "center"; c.textBaseline = "bottom"; c.fillText(rf.n, 0, 0); c.restore();
    });
    // Zeiger
    var S = speeds();
    S.forEach(function (s, i) {
      if (i === RT.sel) return;
      var a = ang(s.v * 3.6);
      c.beginPath(); c.moveTo(cx + Math.cos(a) * (R - 30), cy + Math.sin(a) * (R - 30)); c.lineTo(cx + Math.cos(a) * (R + 4), cy + Math.sin(a) * (R + 4));
      c.strokeStyle = s.col; c.globalAlpha = .75; c.lineWidth = 2.5; c.stroke(); c.globalAlpha = 1;
    });
    var sel = S[RT.sel], as = ang(sel.v * 3.6);
    c.save(); c.shadowColor = sel.col; c.shadowBlur = 14;
    c.beginPath(); c.moveTo(cx - Math.cos(as) * 12, cy - Math.sin(as) * 12); c.lineTo(cx + Math.cos(as) * (R + 2), cy + Math.sin(as) * (R + 2));
    c.strokeStyle = sel.col; c.lineWidth = 3.2; c.lineCap = "round"; c.stroke(); c.restore();
    c.beginPath(); c.arc(cx, cy, 8, 0, TAU); c.fillStyle = "#1B1438"; c.fill(); c.strokeStyle = sel.col; c.lineWidth = 2.5; c.stroke();
  }
  /* ---------- Rollende Ziffern, Zurücksetzen, bewegte Szene ---------- */
  RT.shown = ""; RT.anim = null; RT.lastOdo = 0; RT.scT0 = performance.now();
  function odoSet(str) {
    var box = $("rtOdo");
    var shape = str.replace(/\d/g, "9");
    if (box.getAttribute("data-shape") !== shape) {
      box.setAttribute("data-shape", shape);
      box.innerHTML = str.split("").map(function (ch) {
        if (!/\d/.test(ch)) return '<span class="sep">' + ch + '</span>';
        var col = ""; for (var d = 0; d <= 9; d++) col += "<b>" + d + "</b>";
        return '<span class="sn-dg"><i style="transform:translateY(0)">' + col + '</i></span>';
      }).join("") + '<span class="u">km</span>';
      RT.shown = "";
    }
    var cols = box.querySelectorAll(".sn-dg i"), k = 0;
    for (var i = 0; i < str.length; i++) {
      var ch = str[i]; if (!/\d/.test(ch)) continue;
      var el = cols[k++];
      if (RT.shown[i] !== ch) {
        // schnelle Stellen ohne Übergang, sonst sanftes Rollen
        el.style.transition = (i >= str.length - 2 && !RT.anim) ? "transform .09s linear" : "transform .45s cubic-bezier(.3,1.4,.5,1)";
        el.style.transform = "translateY(" + (-32 * +ch) + "px)";
      }
    }
    RT.shown = str;
  }
  function rtReset() {
    var sel = speeds()[RT.sel], cur = sel.v * (Date.now() - RT.t0) / 1e6;
    RT.anim = { from: cur, t0: performance.now() };
    var b = $("rtReset"); b.disabled = true;
    setTimeout(function () { b.disabled = false; }, 1100);
  }
  function rtTick(force) {
    if (RT.raf) { cancelAnimationFrame(RT.raf); }
    RT.raf = 0;
    if (!$("screen-raumtacho").classList.contains("active") || document.hidden) return;
    var S = speeds(), sel = S[RT.sel], now = performance.now();
    var key = sel.n + "|" + Math.round(sel.v * 3.6);
    if (force || RT.key !== key) {
      RT.key = key;
      $("rtSelLbl").textContent = sel.n;
      $("rtSpeed").innerHTML = (sel.ca ? '<span style="font-size:20px;color:#B9A6F5">ca. </span>' : "") + fmt(sel.v * 3.6, 0) + "<small>km/h</small>";
      drawDial();
    }
    if (now - RT.lastOdo > 90 || RT.anim) {
      RT.lastOdo = now;
      var dist;
      if (RT.anim) {
        var t = clamp((now - RT.anim.t0) / 900, 0, 1), e = 1 - Math.pow(1 - t, 3);
        dist = RT.anim.from * (1 - e);
        if (t >= 1) { RT.anim = null; RT.t0 = Date.now(); dist = 0; }
      } else dist = sel.v * (Date.now() - RT.t0) / 1e6;
      odoSet(fmt(dist, 2));
    }
    drawScene(now);
    RT.raf = requestAnimationFrame(function () { rtTick(false); });
  }
  var SCENE_CAP = {
    rot: "Zeitraffer: ein Tag in 12 Sekunden · der goldene Punkt bist du",
    orb: "Zeitraffer: ein Jahr in 20 Sekunden · Bahnen von Merkur bis Mars maßstäblich",
    apex: "Symbolisch: Das Sonnensystem zieht durch die Sternenwelt Richtung Herkules",
    gal: "Zeitraffer: 230 Millionen Jahre in 30 Sekunden · die Sonne mit Spur",
    cmb: "Die Hintergrundstrahlung ist in Flugrichtung um gut 0,1 % wärmer – daran messen wir das Tempo"
  };
  var cmbTex = null;
  function drawScene(now) {
    var cv = $("rtScene"); if (!cv || !cv.offsetParent) return;
    var P = prep(cv), c = P.c, W = P.W, H = P.H, S = speeds(), sel = S[RT.sel];
    var t = reduceMotion ? 0 : (now - RT.scT0) / 1000;
    if ($("rtSceneCap").textContent !== SCENE_CAP[sel.id]) $("rtSceneCap").textContent = SCENE_CAP[sel.id];
    var cx = W / 2, cy = H * 0.47;
    // feste Hintergrundsterne
    c.fillStyle = "#fff";
    for (var i = 0; i < 60; i++) { c.globalAlpha = 0.12 + ((i * 37) % 10) / 22; c.fillRect(((i * 97.13) % 1000) / 1000 * W, ((i * 61.7) % 1000) / 1000 * H, 1.1, 1.1); }
    c.globalAlpha = 1;
    if (sel.id === "rot") {
      var ph = (t / 12) * 360 % 360, lon0 = LOC.lon - ph, r = H * 0.38;
      drawGlobePx(c, cx, cy, r, 18, lon0, 0, lon0 - 60);
      // Spur
      for (var k = 14; k >= 0; k--) {
        var dl = (ph - k * 4) * D2R, la = LOC.lat * D2R, p0 = 18 * D2R;
        var x = Math.cos(la) * Math.sin(dl), y = Math.cos(p0) * Math.sin(la) - Math.sin(p0) * Math.cos(la) * Math.cos(dl), z = Math.sin(p0) * Math.sin(la) + Math.cos(p0) * Math.cos(la) * Math.cos(dl);
        if (z <= 0) continue;
        c.beginPath(); c.arc(cx + x * r, cy - y * r, k === 0 ? 4.5 : 2.4 * (1 - k / 16), 0, TAU);
        c.fillStyle = k === 0 ? GOLD : "rgba(255,210,122," + (0.6 * (1 - k / 15)).toFixed(2) + ")"; c.fill();
      }
      sceneLabel(c, W - 10, 18, fmt(sel.v * 3.6, 0) + " km/h", "right");
    } else if (sel.id === "orb") {
      var sc = Math.min(W * 0.43, H * 0.4 / 0.52) / 1.524, tilt = 0.5;
      var sg = c.createRadialGradient(cx, cy, 0, cx, cy, 22); sg.addColorStop(0, "#FFF6D8"); sg.addColorStop(.35, "#FFD27A"); sg.addColorStop(1, "rgba(255,190,90,0)");
      c.beginPath(); c.arc(cx, cy, 22, 0, TAU); c.fillStyle = sg; c.fill();
      var base = helioLon("earth", new Date()) * D2R;
      [["mercury", .387, 87.97, "#C9C0B6"], ["venus", .723, 224.7, "#F1D79E"], ["earth", 1, 365.256, "#7FB2F0"], ["mars", 1.524, 686.98, "#E7825C"]].forEach(function (p) {
        var a = p[1] * sc, b = a * tilt;
        c.beginPath(); c.ellipse(cx, cy, a, b, 0, 0, TAU); c.strokeStyle = p[0] === "earth" ? "rgba(127,178,240,.45)" : "rgba(226,220,255,.16)"; c.lineWidth = 1; c.stroke();
        var ang0 = helioLon(p[0], new Date()) * D2R, ang = -(ang0 + (t / 20) * TAU * 365.256 / p[2]);
        if (p[0] === "earth") {
          for (var k = 24; k > 0; k--) { var aa = ang + k * 0.035; c.beginPath(); c.arc(cx + Math.cos(aa) * a, cy + Math.sin(aa) * b, 2.2, 0, TAU); c.fillStyle = "rgba(127,178,240," + (0.5 * (1 - k / 25)).toFixed(2) + ")"; c.fill(); }
        }
        var px = cx + Math.cos(ang) * a, py = cy + Math.sin(ang) * b;
        c.beginPath(); c.arc(px, py, p[0] === "earth" ? 5 : 3, 0, TAU); c.fillStyle = p[3]; c.fill();
        if (p[0] === "earth") {
          var ma = t * TAU * 365.256 / 27.32 / 20;
          c.beginPath(); c.arc(px + Math.cos(ma) * 9, py + Math.sin(ma) * 9 * tilt, 1.6, 0, TAU); c.fillStyle = "#E9E6DC"; c.fill();
          c.font = "700 11px " + FONT; c.fillStyle = "#BFD8FF"; c.textAlign = "left"; c.textBaseline = "middle"; c.fillText("Du", px + 9, py - 9);
        }
      });
      sceneLabel(c, W - 10, 18, fmt(sel.v / 1000, 1) + " km/s", "right");
    } else if (sel.id === "apex") {
      if (!RT.warp) { RT.warp = []; for (var j = 0; j < 160; j++) RT.warp.push([Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random()]); }
      var vx = cx, vy = cy - 6;
      RT.warp.forEach(function (s, j) {
        var z = ((s[2] - t * 0.12) % 1 + 1) % 1, zz = 0.05 + z * 0.95, z2 = Math.min(1, zz + 0.04);
        var x1 = vx + s[0] / zz * W * 0.12, y1 = vy + s[1] / zz * H * 0.12, x0 = vx + s[0] / z2 * W * 0.12, y0 = vy + s[1] / z2 * H * 0.12;
        var a = clamp((1 - zz) * 1.2, 0, 1);
        c.strokeStyle = "rgba(220,230,255," + a.toFixed(2) + ")"; c.lineWidth = 0.6 + (1 - zz) * 1.6;
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
      });
      var wg = c.createRadialGradient(vx, vy, 0, vx, vy, 16); wg.addColorStop(0, "rgba(160,220,255,.9)"); wg.addColorStop(1, "rgba(160,220,255,0)");
      c.beginPath(); c.arc(vx, vy, 16, 0, TAU); c.fillStyle = wg; c.fill();
      c.font = "700 11px " + FONT; c.fillStyle = "#BFE8FF"; c.textAlign = "center"; c.textBaseline = "top"; c.fillText("Herkules · nahe der Wega", vx, vy + 14);
      sceneLabel(c, W - 10, 18, "ca. " + fmt(sel.v / 1000, 1) + " km/s", "right");
    } else if (sel.id === "gal") {
      var R = Math.min(W, H * 1.6) * 0.42, rotA = t / 30 * TAU;
      var core = c.createRadialGradient(cx, cy, 0, cx, cy, R * 0.32); core.addColorStop(0, "rgba(255,236,190,.95)"); core.addColorStop(1, "rgba(255,210,150,0)");
      c.save(); c.translate(cx, cy); c.scale(1, 0.55);
      c.beginPath(); c.arc(0, 0, R * 0.32, 0, TAU); c.fillStyle = core; c.fill();
      for (var g = 0; g < 900; g++) {
        var arm = g % 4, tt = ((g * 0.6180339) % 1), rr = R * (0.12 + tt * 0.88);
        var ag = arm * Math.PI / 2 + Math.log(rr / (R * 0.1) + 1) * 2.2 + (((g * 0.7548776) % 1) - 0.5) * 0.5 + rotA * (0.6 + 0.4 * (1 - tt));
        c.fillStyle = (g % 7 === 0) ? "rgba(255,215,170,.75)" : "rgba(190,200,255,.6)";
        c.fillRect(Math.cos(ag) * rr, Math.sin(ag) * rr, 1.3, 1.3);
      }
      var sr = R * 0.52, sa = -2 + rotA * 0.75;
      for (var k = 30; k > 0; k--) { var aa = sa - k * 0.03; c.beginPath(); c.arc(Math.cos(aa) * sr, Math.sin(aa) * sr, 2.2, 0, TAU); c.fillStyle = "rgba(255,210,122," + (0.5 * (1 - k / 31)).toFixed(2) + ")"; c.fill(); }
      var sx = Math.cos(sa) * sr, sy = Math.sin(sa) * sr;
      c.restore();
      var px2 = cx + sx, py2 = cy + sy * 0.55;
      c.beginPath(); c.arc(px2, py2, 4.5, 0, TAU); c.fillStyle = GOLD; c.fill();
      c.font = "700 11px " + FONT; c.fillStyle = GOLD; c.textAlign = "left"; c.textBaseline = "middle"; c.fillText("Du bist hier", px2 + 9, py2);
      sceneLabel(c, W - 10, 18, "ca. " + fmt(sel.v / 1000, 0) + " km/s", "right");
    } else {
      // Hintergrundstrahlung mit Dipol (Ellipse wie eine Himmelskarte)
      var ex = W * 0.42, ey = H * 0.36;
      if (!cmbTex || cmbTex.w !== Math.round(ex * 2)) {
        var off = document.createElement("canvas"), ow = Math.round(ex * 2), oh = Math.round(ey * 2);
        off.width = ow; off.height = oh; var oc = off.getContext("2d"), img = oc.createImageData(ow, oh);
        for (var yy = 0; yy < oh; yy++) for (var xx = 0; xx < ow; xx++) {
          var nx = (xx - ow / 2) / (ow / 2), ny = (yy - oh / 2) / (oh / 2), id = (yy * ow + xx) * 4;
          if (nx * nx + ny * ny > 1) { img.data[id + 3] = 0; continue; }
          var dip = nx * 0.85; // Flugrichtung rechts
          var n = Math.sin(xx * 0.31 + yy * 0.17) * Math.sin(xx * 0.07 - yy * 0.23) * 0.35 + Math.sin(xx * 0.9 + yy * 1.3) * 0.12;
          var v = clamp(dip + n * 0.5, -1, 1);
          img.data[id] = v > 0 ? 200 + 55 * v : 200 + 40 * v; img.data[id + 1] = v > 0 ? 120 + 40 * v : 120 + 60 * -v; img.data[id + 2] = v > 0 ? 110 - 40 * v : 140 + 110 * -v; img.data[id + 3] = 230;
        }
        oc.putImageData(img, 0, 0); cmbTex = { c: off, w: ow };
      }
      c.drawImage(cmbTex.c, cx - ex, cy - ey);
      c.beginPath(); c.ellipse(cx, cy, ex, ey, 0, 0, TAU); c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 1; c.stroke();
      var pulse = reduceMotion ? 0.5 : (Math.sin(t * 2.4) + 1) / 2;
      c.strokeStyle = "rgba(255,255,255,.95)"; c.fillStyle = "rgba(255,255,255,.95)"; c.lineWidth = 2.4;
      var ax0 = cx - ex * 0.35, ax1 = cx + ex * (0.45 + pulse * 0.12);
      c.beginPath(); c.moveTo(ax0, cy); c.lineTo(ax1, cy); c.stroke();
      c.beginPath(); c.moveTo(ax1 + 10, cy); c.lineTo(ax1 - 2, cy - 7); c.lineTo(ax1 - 2, cy + 7); c.closePath(); c.fill();
      c.font = "700 10.5px " + FONT; c.textBaseline = "middle";
      c.fillStyle = "#FFE0C8"; c.textAlign = "right"; c.fillText("wärmer", cx + ex - 6, cy - ey + 14);
      c.fillStyle = "#C8D8FF"; c.textAlign = "left"; c.fillText("kühler", cx - ex + 6, cy - ey + 14);
      sceneLabel(c, W - 10, 18, "ca. " + fmt(sel.v / 1000, 0) + " km/s", "right");
    }
  }
  function sceneLabel(c, x, y, txt, align) {
    c.font = "700 12px " + MONO; c.textAlign = align || "left"; c.textBaseline = "middle"; c.fillStyle = "#FFD27A"; c.fillText(txt, x, y);
  }

  /* =====================================================================
     RÖNTGENBLICK – der Himmel auf der anderen Seite der Erde
     Lagesensor → Blickrichtung; alles unterhalb des Horizonts wird
     „durch die Erde hindurch“ gezeigt. Berechnung vollständig auf dem Gerät.
     ===================================================================== */
  var XR = { on: false, raf: 0, sky: null, skyT: 0, lines: true, drag: { az: 180, alt: -30 }, sensor: false, infoT: 0, openT: 0, exitCache: {}, dragging: null };
  function enuOf(ra, dec, ls) { return A.eqToEnu(A.vec(ra, dec), ls, LOC.lat); }
  function altAzOfEnu(e) { return { alt: Math.asin(clamp(e[2], -1, 1)) * R2D, az: (Math.atan2(e[0], e[1]) * R2D + 360) % 360 }; }
  function xrSky() {
    var now = new Date(), jd = A.toJD(now), ls = A.lst(jd, LOC.lon);
    var stars = ST.stars.map(function (s) { var rd = A.starRaDec(s.ra, s.dec, jd); return { s: s, e: enuOf(rd.ra, rd.dec, ls) }; });
    var by = {}; stars.forEach(function (o) { by[o.s.name] = o; });
    var sk = A.skyState(jd, LOC.lat, LOC.lon, 0);
    var bodies = [];
    var sun = { n: "Sonne", e: enuOf(sk.sun.ra, sk.sun.dec, ls), kind: "sun" };
    var moon = { n: "Mond", e: enuOf(sk.moon.ra, sk.moon.dec, ls), kind: "moon", illum: sk.moon.illum, waxing: ((sk.moon.lon - sk.sun.lon + 360) % 360) < 180 };
    bodies.push(sun, moon);
    sk.planets.forEach(function (p) { bodies.push({ n: PNAMES[p.name], e: enuOf(p.ra, p.dec, ls), kind: "planet", mag: p.mag, col: (PL.filter(function (q) { return q.id === p.name; })[0] || {}).col || "#fff" }); });
    XR.sky = { stars: stars, by: by, bodies: bodies, sun: sun, moon: moon, t: Date.now() };
    return XR.sky;
  }
  function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function vecAA(az, alt) { var A_ = az * D2R, L = alt * D2R; return [Math.sin(A_) * Math.cos(L), Math.cos(A_) * Math.cos(L), Math.sin(L)]; }
  function xrView() {
    if (XR.sensor) {
      var att = ORI.attitude();
      if (att) { var q = ORI.smooth(att, 70), v = ORI.view(q); v.ok = true; return v; }
    }
    var az = XR.drag.az, alt = XR.drag.alt;
    var fw = vecAA(az, alt), rt = [Math.cos(az * D2R), -Math.sin(az * D2R), 0];
    var up = [rt[1] * fw[2] - rt[2] * fw[1], rt[2] * fw[0] - rt[0] * fw[2], rt[0] * fw[1] - rt[1] * fw[0]];
    return { fw: fw, rt: rt, up: up, ok: false };
  }
  function xrExit(az, alt) {
    if (alt > -0.5) return null;
    var key = Math.round(az / 2) + "|" + Math.round(alt / 2);
    if (XR.exitCache[key]) return XR.exitCache[key];
    var ch = DB.chord(LOC.lat, LOC.lon, az, -alt), land = countryAt(ch.lat, ch.lon);
    var r = { len: ch.len, name: land ? land.de : oceanName(ch.lat, ch.lon), lat: ch.lat, lon: ch.lon };
    XR.exitCache[key] = r; return r;
  }
  function clipHalf(poly, a, b, c0) { // behält Punkte mit a*x+b*y+c0 <= 0
    var out = [];
    for (var i = 0; i < poly.length; i++) {
      var P = poly[i], Q = poly[(i + 1) % poly.length];
      var fp = a * P[0] + b * P[1] + c0, fq = a * Q[0] + b * Q[1] + c0;
      if (fp <= 0) out.push(P);
      if ((fp <= 0) !== (fq <= 0)) { var t = fp / (fp - fq); out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]); }
    }
    return out;
  }
  function xrDraw() {
    var cv = $("xrCv"), P = prep(cv), c = P.c, W = P.W, H = P.H;
    if (!XR.sky || Date.now() - XR.sky.t > 20000) xrSky();
    var v = xrView(), f = (H / 2) / Math.tan(36 * D2R), cx = W / 2, cy = H / 2;
    var proj = function (e, minZ) {
      var zc = dot3(e, v.fw); if (zc < (minZ || 0.04)) return null;
      return [cx + f * dot3(e, v.rt) / zc, cy - f * dot3(e, v.up) / zc, zc];
    };
    // Himmel
    var bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#070618"); bg.addColorStop(1, "#0B0922"); c.fillStyle = bg; c.fillRect(0, 0, W, H);
    // Sternbilder
    if (XR.lines) {
      c.strokeStyle = "rgba(185,166,245,.32)"; c.lineWidth = 1;
      ST.constellations.forEach(function (con) {
        con.lines.forEach(function (l) {
          if (!l[0] || !l[1]) return;
          var a = XR.sky.by[l[0].name], b = XR.sky.by[l[1].name]; if (!a || !b) return;
          var pa = proj(a.e, 0.2), pb = proj(b.e, 0.2); if (!pa || !pb) return;
          c.beginPath(); c.moveTo(pa[0], pa[1]); c.lineTo(pb[0], pb[1]); c.stroke();
        });
      });
    }
    // Sterne
    var labels = 0;
    XR.sky.stars.forEach(function (o) {
      var p = proj(o.e); if (!p || p[0] < -10 || p[0] > W + 10 || p[1] < -10 || p[1] > H + 10) return;
      var s = o.s, r = clamp(2.7 - s.mag * 0.55, 0.7, 3.4);
      if (s.mag < 1.6) { var g = c.createRadialGradient(p[0], p[1], 0, p[0], p[1], r * 4); g.addColorStop(0, starColor(s.bv)); g.addColorStop(1, "rgba(0,0,0,0)"); c.globalAlpha = 0.35; c.beginPath(); c.arc(p[0], p[1], r * 4, 0, TAU); c.fillStyle = g; c.fill(); c.globalAlpha = 1; }
      c.beginPath(); c.arc(p[0], p[1], r, 0, TAU); c.fillStyle = starColor(s.bv); c.fill();
      if (ST.labelled.has(s.name) && s.mag < 1.7 && labels < 26) { labels++; c.font = "500 11px " + FONT; c.fillStyle = "rgba(226,220,255,.72)"; c.textAlign = "left"; c.textBaseline = "middle"; c.fillText(s.name, p[0] + r + 4, p[1]); }
    });
    // Erde: Halbebene unter dem Horizont (der Horizont ist im Bild eine Gerade)
    var ga = v.rt[2], gb = -v.up[2], gc = v.fw[2] * f - v.rt[2] * cx + v.up[2] * cy; // g(x,y) = ga*x + gb*y + gc ; Boden: g < 0
    var poly = clipHalf([[0, 0], [W, 0], [W, H], [0, H]], ga, gb, gc);
    if (poly.length > 2) {
      c.beginPath(); poly.forEach(function (q, i) { if (i) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]); }); c.closePath();
      var nrm = Math.hypot(ga, gb) || 1, dx = -ga / nrm, dy = -gb / nrm; // Richtung in die Erde
      var x0 = cx, y0 = cy, d0 = (ga * cx + gb * cy + gc) / nrm; x0 = cx - (ga / nrm) * d0; y0 = cy - (gb / nrm) * d0;
      var eg = c.createLinearGradient(x0, y0, x0 + dx * H, y0 + dy * H);
      eg.addColorStop(0, "rgba(240,140,90,.40)"); eg.addColorStop(0.2, "rgba(200,90,66,.26)"); eg.addColorStop(1, "rgba(130,56,80,.22)");
      c.fillStyle = eg; c.fill();
    }
    // Gitter im Boden
    c.lineWidth = 1;
    [-15, -30, -45, -60, -75].forEach(function (alt) {
      c.strokeStyle = "rgba(255,170,120,.20)"; c.setLineDash([3, 5]); c.beginPath(); var pen = false;
      for (var az = 0; az <= 360; az += 3) { var p = proj(vecAA(az, alt), 0.08); if (!p) { pen = false; continue; } if (pen) c.lineTo(p[0], p[1]); else { c.moveTo(p[0], p[1]); pen = true; } }
      c.stroke(); c.setLineDash([]);
    });
    for (var az2 = 0; az2 < 360; az2 += 30) {
      c.strokeStyle = "rgba(255,170,120,.14)"; c.beginPath(); var pen2 = false;
      for (var al = 0; al >= -86; al -= 3) { var p2 = proj(vecAA(az2, al), 0.08); if (!p2) { pen2 = false; continue; } if (pen2) c.lineTo(p2[0], p2[1]); else { c.moveTo(p2[0], p2[1]); pen2 = true; } }
      c.stroke();
    }
    // Horizontlinie
    var pts = [];
    [[0, 0, W, 0], [W, 0, W, H], [W, H, 0, H], [0, H, 0, 0]].forEach(function (e) {
      var f1 = ga * e[0] + gb * e[1] + gc, f2 = ga * e[2] + gb * e[3] + gc;
      if ((f1 <= 0) !== (f2 <= 0)) { var t = f1 / (f1 - f2); pts.push([e[0] + (e[2] - e[0]) * t, e[1] + (e[3] - e[1]) * t]); }
    });
    if (pts.length >= 2 && v.fw[2] > -0.995) {
      c.save(); c.shadowColor = "rgba(185,166,245,.9)"; c.shadowBlur = 10;
      c.strokeStyle = "rgba(205,190,255,.9)"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); c.lineTo(pts[1][0], pts[1][1]); c.stroke(); c.restore();
    }
    // Himmelsrichtungen am Horizont
    c.font = "700 12px " + FONT; c.textAlign = "center"; c.textBaseline = "middle";
    for (var k = 0; k < 8; k++) {
      var ph = proj(vecAA(k * 45, 0), 0.1); if (!ph) continue;
      c.fillStyle = k === 0 ? "#FF9A8A" : "rgba(226,220,255,.85)"; c.fillText(DIRS[k], ph[0], ph[1] - 12);
    }
    // Gegenpunkt (senkrecht nach unten)
    var pn = proj([0, 0, -1], 0.08);
    if (pn) {
      c.strokeStyle = "rgba(255,210,122,.8)"; c.lineWidth = 1.4;
      c.beginPath(); c.arc(pn[0], pn[1], 10, 0, TAU); c.stroke();
      c.beginPath(); c.moveTo(pn[0] - 16, pn[1]); c.lineTo(pn[0] + 16, pn[1]); c.moveTo(pn[0], pn[1] - 16); c.lineTo(pn[0], pn[1] + 16); c.stroke();
      var ex = xrExit(0, -90);
      c.font = "700 11.5px " + FONT; c.fillStyle = GOLD; c.textAlign = "center"; c.textBaseline = "top";
      c.fillText("Gegenpunkt" + (ex ? " · " + ex.name : ""), pn[0], pn[1] + 18);
    }
    // Sonne, Mond, Planeten
    var off = [];
    XR.sky.bodies.forEach(function (b) {
      var p = proj(b.e), alt = Math.asin(clamp(b.e[2], -1, 1)) * R2D;
      var onScreen = p && p[0] > -20 && p[0] < W + 20 && p[1] > -20 && p[1] < H + 20;
      if (!onScreen) { if (b.kind !== "planet") off.push(b); return; }
      if (b.kind === "sun") {
        var g = c.createRadialGradient(p[0], p[1], 0, p[0], p[1], 60); g.addColorStop(0, "rgba(255,240,200,.95)"); g.addColorStop(0.2, "rgba(255,200,110,.6)"); g.addColorStop(1, "rgba(255,170,80,0)");
        c.beginPath(); c.arc(p[0], p[1], 60, 0, TAU); c.fillStyle = g; c.fill();
        c.beginPath(); c.arc(p[0], p[1], 10, 0, TAU); c.fillStyle = "#FFF4D6"; c.fill();
        bodyLabel(c, p, "Sonne", alt < -0.8 ? "unter deinen Füßen" : "über dem Horizont", GOLD);
      } else if (b.kind === "moon") {
        drawMoonPhase(c, p[0], p[1], 8, b.illum, b.waxing);
        bodyLabel(c, p, "Mond", alt < -0.8 ? "unter dem Horizont" : "", "#EDEAF8");
      } else {
        c.beginPath(); c.arc(p[0], p[1], 3.6, 0, TAU); c.fillStyle = b.col; c.fill();
        c.beginPath(); c.arc(p[0], p[1], 7, 0, TAU); c.strokeStyle = b.col; c.globalAlpha = .5; c.lineWidth = 1; c.stroke(); c.globalAlpha = 1;
        bodyLabel(c, p, b.n, "", b.col);
      }
    });
    // Pfeile zu Sonne und Mond außerhalb des Bildes
    off.forEach(function (b) {
      var dx = dot3(b.e, v.rt), dy = -dot3(b.e, v.up), n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n;
      var infoH = ($("xrInfo").offsetHeight || 140) + 24, topM = 90, m = 40;
      var hy = dy > 0 ? (H - infoH - cy) : (cy - topM);
      var s = Math.min((W / 2 - m) / Math.abs(dx || 1e-6), hy / Math.abs(dy || 1e-6));
      var ax = cx + dx * s, ay = cy + dy * s, ang = Math.atan2(dy, dx);
      c.save(); c.translate(ax, ay); c.rotate(ang);
      c.beginPath(); c.moveTo(12, 0); c.lineTo(-6, -8); c.lineTo(-6, 8); c.closePath(); c.fillStyle = b.kind === "sun" ? GOLD : "#EDEAF8"; c.fill(); c.restore();
      c.font = "700 11px " + FONT; c.fillStyle = b.kind === "sun" ? GOLD : "#EDEAF8"; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText(b.n, ax - dx * 22, ay - dy * 22);
    });
    // Fadenkreuz
    c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 1.2;
    c.beginPath(); c.arc(cx, cy, 14, 0, TAU); c.stroke();
    c.beginPath(); c.moveTo(cx - 24, cy); c.lineTo(cx - 17, cy); c.moveTo(cx + 17, cy); c.lineTo(cx + 24, cy); c.moveTo(cx, cy - 24); c.lineTo(cx, cy - 17); c.moveTo(cx, cy + 17); c.lineTo(cx, cy + 24); c.stroke();
    // Info
    if (performance.now() - XR.infoT > 220) { XR.infoT = performance.now(); xrInfo(v); }
  }
  function bodyLabel(c, p, name, sub, col) {
    c.font = "700 12.5px " + FONT; c.fillStyle = col; c.textAlign = "left"; c.textBaseline = "middle";
    c.fillText(name, p[0] + 14, p[1] - (sub ? 6 : 0));
    if (sub) { c.font = "500 10.5px " + FONT; c.fillStyle = "rgba(226,220,255,.75)"; c.fillText(sub, p[0] + 14, p[1] + 8); }
  }
  function drawMoonPhase(c, x, y, r, illum, waxing) {
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = "#2A2840"; c.fill();
    var k = clamp(illum, 0, 1), s = waxing ? 1 : -1;
    c.save(); c.translate(x, y); c.scale(s, 1);
    c.beginPath(); c.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
    c.ellipse(0, 0, Math.abs(1 - 2 * k) * r, r, 0, Math.PI / 2, -Math.PI / 2, k < 0.5);
    c.closePath(); c.fillStyle = "#F2F0EA"; c.fill(); c.restore();
  }
  function xrInfo(v) {
    var aa = altAzOfEnu(v.fw), ex = xrExit(aa.az, aa.alt);
    var cell2 = function (l, val, sub, gold) { return '<div' + (gold ? ' class="gold"' : "") + '><span>' + esc(l) + '</span><b>' + esc(val) + '</b>' + (sub ? '<i>' + esc(sub) + '</i>' : "") + '</div>'; };
    var html = '<div class="ar-grid three">' +
      cell2("Blick", dirWord(aa.az) + " " + Math.round(aa.az) + "°", (aa.alt >= 0 ? "+" : "−") + Math.abs(Math.round(aa.alt)) + "° " + (aa.alt >= 0 ? "über" : "unter") + " dem Horizont") +
      cell2("Durch die Erde", ex ? km(ex.len) : "–", ex ? "bis zum Ausgang" : "freier Himmel") +
      cell2("Dahinter", ex ? ex.name : "Himmel", ex ? "Ausgang des Blicks" : "über dir", true) + '</div>';
    // Objekt im Fadenkreuz
    var best = null, bd = 6;
    XR.sky.bodies.forEach(function (b) { var d = Math.acos(clamp(dot3(b.e, v.fw), -1, 1)) * R2D; if (d < bd) { bd = d; best = b; } });
    if (!best) XR.sky.stars.forEach(function (o) { if (o.s.mag > 2.6) return; var d = Math.acos(clamp(dot3(o.e, v.fw), -1, 1)) * R2D; if (d < Math.min(bd, 3)) { bd = d; best = { n: o.s.name, e: o.e, kind: "star", s: o.s }; } });
    if (best) {
      var balt = Math.asin(clamp(best.e[2], -1, 1)) * R2D;
      var where = balt < -0.8 ? Math.round(-balt) + "° unter dem Horizont" : Math.round(balt) + "° über dem Horizont";
      var extra = best.kind === "sun" ? (balt < -0.8 ? " – auf der anderen Seite der Erde ist gerade Tag." : "") :
        best.kind === "moon" ? " · zu " + Math.round(best.illum * 100) + " % beleuchtet" :
        best.kind === "planet" ? " · Helligkeit " + fmt(best.mag, 1) + " mag" :
        " · Sternbild " + conName(best.s.con) + (best.s.ly ? " · " + fmt(best.s.ly, best.s.ly < 100 ? 1 : 0) + " Lichtjahre" : (LY_EXT[best.n] ? " · " + fmt(LY_EXT[best.n], LY_EXT[best.n] < 100 ? 1 : 0) + " Lichtjahre" : ""));
      html += '<small style="font-size:13px;color:#fff;opacity:1;margin-top:10px"><b style="color:#FFD27A">' + esc(best.n) + '</b> · ' + esc(where + extra) + '</small>';
    } else if (aa.alt < -5) {
      html += '<small>Alles unterhalb der leuchtenden Linie liegt unter dem Horizont – du schaust gerade durch die Erde.</small>';
    }
    if (!v.ok && XR.sensor) html += '<small>Lagesensor noch nicht bereit – bewege das Handy leicht.</small>';
    html += '<small style="margin-top:8px;opacity:.7">Blick von ' + esc(LOC.src === "default" ? "Hamburg (Beispiel)" : LOC.name) + " aus · " + timeTxt(new Date()) + ' Uhr · live berechnet</small>';
    $("xrInfo").innerHTML = html;
  }
  function xrLoop() {
    XR.raf = 0; if (!XR.on) return;
    xrDraw();
    XR.raf = requestAnimationFrame(xrLoop);
  }
  function xrOpen() {
    if (DB.sensor) DB.sensorOff();
    XR.on = true; XR.exitCache = {}; xrSky();
    $("xr").hidden = false;
    var hint = $("xrHint"); hint.classList.remove("off");
    hint.innerHTML = "Halte dein Smartphone vor dich und neige es langsam nach unten.<br><b>Alles unter der leuchtenden Linie liegt unter deinen Füßen</b> – du siehst es durch die Erde hindurch.";
    clearTimeout(XR.hintT); XR.hintT = setTimeout(function () { hint.classList.add("off"); }, 6500);
    ORI.permit().then(function () {
      ORI.start(); XR.sensor = true;
      setTimeout(function () { if (XR.on && !ORI.state.raw) { XR.sensor = false; ORI.stop(); dragHint(); } }, 1500);
    }).catch(function () { XR.sensor = false; dragHint(); });
    if (!XR.raf) XR.raf = requestAnimationFrame(xrLoop);
  }
  function dragHint() {
    var hint = $("xrHint"); hint.classList.remove("off");
    hint.innerHTML = "Ohne Lagesensor: <b>Wische mit dem Finger</b>, um dich umzusehen – nach unten wischen heißt durch die Erde schauen.";
    clearTimeout(XR.hintT); XR.hintT = setTimeout(function () { hint.classList.add("off"); }, 5000);
  }
  function xrClose() {
    XR.on = false; $("xr").hidden = true;
    if (XR.sensor) { ORI.stop(); XR.sensor = false; }
    if (XR.raf) cancelAnimationFrame(XR.raf); XR.raf = 0;
  }
  function xrTeaser() {
    var cv = $("xrTeaserCv"); if (!cv || !cv.offsetParent) return;
    var sky = xrSky();
    var P = prep(cv), c = P.c, W = P.W, H = P.H;
    var hx = W * 0.83, hy = H * 0.42, R = Math.max(W * 0.36, H * 0.9);
    // Sterne
    for (var i = 0; i < 50; i++) { c.globalAlpha = 0.2 + (i % 5) * 0.12; c.fillStyle = "#fff"; c.fillRect(W * 0.35 + ((i * 97.13) % 100) / 100 * W * 0.65, ((i * 61.7) % 100) / 100 * H, 1.2, 1.2); }
    c.globalAlpha = 1;
    // Erde (durchsichtig) unten rechts
    var g = c.createLinearGradient(0, hy, 0, H); g.addColorStop(0, "rgba(232,128,82,.35)"); g.addColorStop(1, "rgba(120,50,70,.2)");
    c.fillStyle = g; c.fillRect(W * 0.3, hy, W * 0.7, H - hy);
    c.save(); c.shadowColor = "rgba(185,166,245,.9)"; c.shadowBlur = 8; c.strokeStyle = "rgba(205,190,255,.9)"; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(W * 0.3, hy); c.lineTo(W, hy); c.stroke(); c.restore();
    // Sonne unter dem Horizont
    var sx = W * 0.86, sy = H * 0.78;
    var sg = c.createRadialGradient(sx, sy, 0, sx, sy, 34); sg.addColorStop(0, "rgba(255,240,200,.95)"); sg.addColorStop(.25, "rgba(255,200,110,.6)"); sg.addColorStop(1, "rgba(255,170,80,0)");
    c.beginPath(); c.arc(sx, sy, 34, 0, TAU); c.fillStyle = sg; c.fill();
    c.beginPath(); c.arc(sx, sy, 6, 0, TAU); c.fillStyle = "#FFF4D6"; c.fill();
    c.setLineDash([3, 4]); c.strokeStyle = "rgba(255,210,122,.7)"; c.beginPath(); c.moveTo(W * 0.62, hy - 18); c.lineTo(sx, sy); c.stroke(); c.setLineDash([]);
    // Text: was liegt gerade unter dir?
    var below = sky.bodies.filter(function (b) { return b.e[2] < -0.015 && (b.kind !== "planet" || b.mag < 2.5); });
    var names = below.map(function (b) { return b.kind === "sun" ? "die Sonne (" + Math.round(-Math.asin(b.e[2]) * R2D) + "° tief)" : b.kind === "moon" ? "der Mond" : b.n; });
    var nStars = sky.stars.filter(function (o) { return o.e[2] < 0; }).length;
    $("xrTeaserNow").textContent = names.length ? "Gerade unter deinen Füßen: " + names.slice(0, 4).join(", ") + " – und " + nStars + " helle Sterne" : "Gerade unter deinen Füßen: " + nStars + " helle Sterne";
  }

  /* =====================================================================
     Rahmen: Reiter, Einführung, Aktualisierung
     ===================================================================== */
  var TABS = ["durchblick", "lichtecho", "planetenweg", "raumtacho"];
  function showTab(id) {
    if (TABS.indexOf(id) < 0) id = "durchblick";
    Array.prototype.forEach.call(document.querySelectorAll(".sn-tab"), function (t) { var on = t.getAttribute("data-tab") === id; t.classList.toggle("active", on); t.setAttribute("aria-selected", on ? "true" : "false"); });
    TABS.forEach(function (t) { $("screen-" + t).classList.toggle("active", t === id); });
    lsSet("staunwahr_tab", id);
    if (id !== "durchblick" && DB.sensor) DB.sensorOff();
    try { history.replaceState(null, "", "#" + id); } catch (e) { }
    requestAnimationFrame(function () {
      if (id === "durchblick") { DB.update(true); dbStartLoop(); xrTeaser(); }
      if (id === "lichtecho") { drawBubble(); leStart(); }
      if (id === "planetenweg") { drawPlan(); if (PW.map) setTimeout(function () { PW.map.invalidateSize(); }, 50); }
      if (id === "raumtacho") { rtUpdateStatic(); rtUpdateLife(); rtTick(true); }
    });
  }
  function refreshAll() {
    var a = lsGet("staunwahr_tab", "durchblick");
    DB.update(true); leUpdate(); leNow(); leHist(); pwUpdate(); rtUpdateStatic(); rtUpdateLife(); xrTeaser();
    if ($("screen-raumtacho").classList.contains("active")) rtTick(true);
  }

  function init() {
    readLoc(); locLabel();
    $("snLocBtn").addEventListener("click", locOpen);
    $("snLocClose").addEventListener("click", locClose);
    $("snLocSheet").addEventListener("click", function (e) { if (e.target === this) locClose(); });
    $("snLocSearch").addEventListener("input", locSearch);
    $("snLocGps").addEventListener("click", function () {
      if (window.wzCore && wzCore.setAutoLocation) wzCore.setAutoLocation(); else lsSet("wz_location", { mode: "auto" });
      locClose(); XR.exitCache = {}; askGps();
    });
    Array.prototype.forEach.call(document.querySelectorAll(".sn-tab"), function (t) { t.addEventListener("click", function () { showTab(t.getAttribute("data-tab")); }); });
    dbInit(); leInit(); pwInit();
    rtUpdateStatic(); rtUpdateLife();
    $("rtReset").addEventListener("click", rtReset);
    var tz = $("xrTeaser");
    tz.addEventListener("click", xrOpen); tz.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); xrOpen(); } });
    $("xrClose").addEventListener("click", xrClose);
    $("xrLines").addEventListener("click", function () { XR.lines = !XR.lines; this.setAttribute("aria-pressed", XR.lines); this.style.opacity = XR.lines ? 1 : .6; });
    var xcv = $("xrCv");
    xcv.addEventListener("pointerdown", function (e) { $("xrHint").classList.add("off"); if (XR.sensor) return; XR.dragging = [e.clientX, e.clientY]; try { xcv.setPointerCapture(e.pointerId); } catch (x) { } });
    xcv.addEventListener("pointermove", function (e) { if (!XR.dragging) return; var dx = e.clientX - XR.dragging[0], dy = e.clientY - XR.dragging[1]; XR.dragging = [e.clientX, e.clientY]; XR.drag.az = (XR.drag.az - dx * 0.25 + 360) % 360; XR.drag.alt = clamp(XR.drag.alt + dy * 0.25, -89, 89); });
    var xup = function () { XR.dragging = null; };
    xcv.addEventListener("pointerup", xup); xcv.addEventListener("pointercancel", xup);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && XR.on) xrClose(); });
    var onb = wzOnboarding({
      key: "staunwahr_onboarded",
      slides: [
        { icon: "durchblick", title: "Willkommen bei StaunWahr", text: "Vier Blicke auf die Welt in ganz anderen Maßstäben – quer durch die Erde, zurück im Licht der Sterne, zu Fuß durchs Sonnensystem und mit Höchsttempo durchs All." },
        { icon: "xray", title: "Röntgenblick", text: "Der Höhepunkt: Halte dein Smartphone nach unten und sieh den Himmel auf der anderen Seite der Erde – mitten in der Nacht sogar die Sonne unter deinen Füßen." },
        { icon: "durchblick", title: "DurchblickWahr", text: "Neige dein Smartphone nach unten und schau quer durch die Erde: Welche Schichten durchquerst du, und wo kommst du heraus?" },
        { icon: "lichtecho", title: "LichtechoWahr", text: "Finde den Stern, dessen Licht genau zu deinem Geburtstag – oder einem anderen besonderen Tag – losgeflogen ist." },
        { icon: "planeten", title: "PlanetenWahr & RaumTacho", text: "Leg das Sonnensystem maßstabsgetreu vor deine Haustür und sieh, wie schnell du gerade durchs All rast." },
        { icon: "lock", title: "Alles bleibt bei dir", text: "Berechnungen laufen auf dem Gerät. Standort, Lagesensoren und deine Momente werden nirgendwohin gesendet. Nur die Karte in PlanetenWahr lädt – nach deiner Zustimmung – Kartenbilder." }
      ]
    });
    $("showOnboardingBtn").addEventListener("click", function () { onb.show(); });
    var h0 = (location.hash || "").slice(1);
    showTab(TABS.indexOf(h0) >= 0 ? h0 : lsGet("staunwahr_tab", "durchblick"));
    if (LOC.src !== "manual" && LOC.src === "default" && navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: "geolocation" }).then(function (r) { if (r.state === "granted") askGps(); }).catch(function () { });
    }
    window.addEventListener("hashchange", function () { var h = (location.hash || "").slice(1); if (TABS.indexOf(h) >= 0) showTab(h); });
    window.addEventListener("resize", function () { DB.update(false); drawBubble(); drawPlan(); drawDial(); });
    document.addEventListener("visibilitychange", function () { if (!document.hidden) showTab(lsGet("staunwahr_tab", "durchblick")); });
    window.addEventListener("pagehide", function () { if (XR.on) xrClose(); if (DB.sensor) DB.sensorOff(); if (PW.watch != null) pwStop(); });
    // Theme-Wechsel: Zeichnungen sind dunkel und themenunabhängig
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
