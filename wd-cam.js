/* ============================================================
   WunderWahr – Kamera-Modus für WeitblickWahr
   Zeigt im Live-Kamerabild, in welcher Richtung Städte, Pole, Sonne, Mond
   und helle Planeten liegen. Das Kamerabild wird nur angezeigt – nichts wird
   aufgenommen, gespeichert oder gesendet.
   © 2026 Jan Dierlich – Alle Rechte vorbehalten.
   ============================================================ */
(function (g) {
  "use strict";
  var D2R = Math.PI / 180, R2D = 180 / Math.PI, RE = 6371.0088;
  function wrap360(a) { return ((a % 360) + 360) % 360; }
  function wrap180(a) { return ((a + 540) % 360) - 180; }
  function bearing(la1, lo1, la2, lo2) {
    var p1 = la1 * D2R, p2 = la2 * D2R, dl = (lo2 - lo1) * D2R;
    return wrap360(Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)) * R2D);
  }
  function dist(la1, lo1, la2, lo2) {
    var dl = (la2 - la1) * D2R, dn = (lo2 - lo1) * D2R;
    var x = Math.sin(dl / 2) * Math.sin(dl / 2) + Math.cos(la1 * D2R) * Math.cos(la2 * D2R) * Math.sin(dn / 2) * Math.sin(dn / 2);
    return 2 * RE * Math.asin(Math.min(1, Math.sqrt(x)));
  }
  /* Blickrichtung der Rückseite des Geräts aus alpha/beta/gamma (W3C-Beispiel) */
  function rearHeading(alpha, beta, gamma) {
    var x = beta * D2R, y = gamma * D2R, z = alpha * D2R;
    var cX = Math.cos(x), cY = Math.cos(y), cZ = Math.cos(z), sX = Math.sin(x), sY = Math.sin(y), sZ = Math.sin(z);
    var Vx = -cZ * sY - sZ * sX * cY, Vy = -sZ * sY + cZ * sX * cY;
    var h = Math.atan(Vx / Vy);
    if (Vy < 0) h += Math.PI; else if (Vx < 0) h += 2 * Math.PI;
    return h * R2D;
  }
  var NAMES = ["Norden", "Nordnordost", "Nordost", "Ostnordost", "Osten", "Ostsüdost", "Südost", "Südsüdost", "Süden", "Südsüdwest", "Südwest", "Westsüdwest", "Westen", "Westnordwest", "Nordwest", "Nordnordwest"];
  function dirName(a) { return NAMES[Math.round(wrap360(a) / 22.5) % 16]; }
  function fmt(n) { return Math.round(n).toLocaleString("de-DE"); }

  var st = null;
  function sky(loc) {
    var A = g.Astro, out = []; if (!A) return out;
    var jd = A.toJD(new Date()), ls = A.lst(jd, loc.lon);
    function add(name, v, kind) { try { var aa = A.enuToAltAz(A.eqToEnu(v, ls, loc.lat)); out.push({ n: name, az: aa.az, alt: aa.alt, sky: kind }); } catch (e) { } }
    add("Sonne", A.sun(jd).v, "sun"); add("Mond", A.moon(jd).v, "moon");
    [["venus", "Venus"], ["mars", "Mars"], ["jupiter", "Jupiter"], ["saturn", "Saturn"]].forEach(function (p) { try { add(p[1], A.planet(p[0], jd).v, "planet"); } catch (e) { } });
    return out;
  }
  function open(opts) {
    if (st) return;
    var loc = opts.loc, targets = (opts.ziele || []).map(function (z) { return { n: z[0], az: bearing(loc.lat, loc.lon, z[1], z[2]), km: dist(loc.lat, loc.lon, z[1], z[2]) }; }).filter(function (t) { return t.km > 30; });
    var ov = document.createElement("div"); ov.className = "wd-cam"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", "Kamera-Modus");
    ov.innerHTML = '<video playsinline muted autoplay></video><canvas aria-hidden="true"></canvas>' +
      '<div class="wd-cam-top"><b id="wdCamHead">–</b><span id="wdCamHint">Halte das Handy aufrecht vor dich.</span></div>' +
      '<div class="wd-cam-bar"><div class="wd-cam-seg" role="group" aria-label="Anzeigen"><button type="button" data-f="alle" class="on">Alles</button><button type="button" data-f="orte">Orte</button><button type="button" data-f="himmel">Himmel</button></div>' +
      '<button type="button" class="wd-cam-x" aria-label="Kamera-Modus schließen"><svg class="wzi" aria-hidden="true"><use href="#wzi-close"></use></svg></button></div>' +
      '<p class="wd-cam-note">Richtungen sind ungefähr. Ungenau? Das Handy einmal in Form einer Acht schwenken.</p>';
    document.body.appendChild(ov); document.documentElement.classList.add("wd-cam-open");
    var video = ov.querySelector("video"), cv = ov.querySelector("canvas"), c = cv.getContext("2d");
    st = { ov: ov, stream: null, raf: 0, heading: null, pitch: 0, filter: "alle", skyT: 0, sky: sky(loc) };
    ov.querySelectorAll("[data-f]").forEach(function (b) { b.onclick = function () { st.filter = b.getAttribute("data-f"); ov.querySelectorAll("[data-f]").forEach(function (x) { x.classList.toggle("on", x === b); }); }; });
    ov.querySelector(".wd-cam-x").onclick = close;
    function onKey(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", onKey); st.onKey = onKey;
    function onOri(e) {
      var h = null;
      if (e.webkitCompassHeading != null && !isNaN(e.webkitCompassHeading)) h = e.webkitCompassHeading;
      else if (e.alpha != null && (e.absolute || e.type === "deviceorientationabsolute")) h = rearHeading(e.alpha, e.beta || 0, e.gamma || 0);
      if (h != null) st.heading = st.heading == null ? h : wrap360(st.heading + wrap180(h - st.heading) * 0.25);
      if (e.beta != null) st.pitch = st.pitch + ((e.beta - 90) - st.pitch) * 0.25;
    }
    st.onOri = onOri;
    window.addEventListener("deviceorientationabsolute", onOri); window.addEventListener("deviceorientation", onOri);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false }).then(function (s) {
        if (!st) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
        st.stream = s; video.srcObject = s; var p = video.play(); if (p && p.catch) p.catch(function () { });
      }).catch(function () { ov.classList.add("nocam"); ov.querySelector("#wdCamHint").textContent = "Ohne Kamera: Die Richtungen werden auf dunklem Grund gezeigt."; });
    } else ov.classList.add("nocam");
    function draw() {
      if (!st) return;
      var w = ov.clientWidth, h = ov.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
      if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
      if (Date.now() - st.skyT > 30000) { st.sky = sky(loc); st.skyT = Date.now(); }
      var head = st.heading, pitch = st.pitch;
      var hfov = 58, vfov = hfov * h / w; // Hochformat: ungefähre Bildwinkel einer Hauptkamera
      var cx = w / 2, cy = h / 2;
      function px(az, alt) { return { x: cx + wrap180(az - head) / hfov * w, y: cy - (alt - pitch) / vfov * h, d: wrap180(az - head) }; }
      $t("wdCamHead", head == null ? "Kompass wird gesucht …" : fmt(wrap360(head)) + "° · " + dirName(head));
      if (head == null) { st.raf = requestAnimationFrame(draw); return; }
      // Horizontlinie
      var hy = cy + pitch / vfov * h;
      c.strokeStyle = "rgba(255,255,255,.45)"; c.lineWidth = 1.5; c.setLineDash([6, 6]); c.beginPath(); c.moveTo(0, hy); c.lineTo(w, hy); c.stroke(); c.setLineDash([]);
      // Himmelsrichtungen auf dem Horizont
      c.font = "700 13px -apple-system, system-ui, sans-serif"; c.textAlign = "center";
      [["N", 0], ["NO", 45], ["O", 90], ["SO", 135], ["S", 180], ["SW", 225], ["W", 270], ["NW", 315]].forEach(function (r) {
        var p = px(r[1], 0); if (Math.abs(p.d) > hfov / 2 + 5) return;
        c.fillStyle = r[0] === "N" ? "#FFB4A8" : "rgba(255,255,255,.9)"; c.fillText(r[0], p.x, hy + 20);
      });
      var items = [];
      if (st.filter !== "himmel") targets.forEach(function (t) { items.push({ n: t.n, sub: fmt(t.km) + " km", az: t.az, alt: 0, kind: "ort" }); });
      if (st.filter !== "orte") st.sky.forEach(function (s) { items.push({ n: s.n, sub: s.alt < -1 ? "unter dem Horizont" : fmt(s.alt) + "° hoch", az: s.az, alt: s.alt, kind: s.sky }); });
      // Orte am Horizont übereinanderstapeln, damit nichts überlappt
      var placed = [];
      items.sort(function (a, b) { return (a.kind === "ort" ? 1 : 0) - (b.kind === "ort" ? 1 : 0) || a.az - b.az; });
      var off = [];
      items.forEach(function (it) {
        var p = px(it.az, it.alt);
        if (Math.abs(p.d) > hfov / 2 + 2) { if (it.kind !== "ort") off.push({ it: it, d: p.d }); return; }
        var y = it.kind === "ort" ? hy - 34 : p.y;
        if (it.kind === "ort") { for (var k = 0; k < placed.length; k++) { var q = placed[k]; if (Math.abs(q.x - p.x) < 112 && Math.abs(q.y - y) < 40) { y = q.y - 42; k = -1; } } }
        placed.push({ x: p.x, y: y });
        var col = it.kind === "sun" ? "#FFD27A" : it.kind === "moon" ? "#E8E2FF" : it.kind === "planet" ? "#FFC6A0" : "#C9B8FF";
        if (it.kind === "ort") { c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 1; c.beginPath(); c.moveTo(p.x, y + 14); c.lineTo(p.x, hy); c.stroke(); }
        c.fillStyle = col; c.beginPath(); c.arc(p.x, it.kind === "ort" ? hy : y, it.kind === "sun" ? 9 : 5, 0, 7); c.fill();
        var label = it.n, sub = it.sub;
        c.font = "700 14px -apple-system, system-ui, sans-serif"; var tw = Math.max(c.measureText(label).width, (c.font = "500 11.5px -apple-system, system-ui, sans-serif", c.measureText(sub).width)) + 18;
        var by = it.kind === "ort" ? y - 14 : y - 46;
        c.fillStyle = "rgba(20,14,44,.72)"; rr(c, p.x - tw / 2, by, tw, 32, 9); c.fill();
        c.fillStyle = "#fff"; c.font = "700 14px -apple-system, system-ui, sans-serif"; c.fillText(label, p.x, by + 14);
        c.fillStyle = "rgba(255,255,255,.78)"; c.font = "500 11.5px -apple-system, system-ui, sans-serif"; c.fillText(sub, p.x, by + 27);
      });
      // Pfeile am Rand zu Sonne und Mond, wenn sie außerhalb des Bildes liegen
      off.filter(function (o) { return o.it.kind === "sun" || o.it.kind === "moon"; }).forEach(function (o) {
        var right = o.d > 0, x = right ? w - 26 : 26, y = h * 0.62 + (o.it.kind === "moon" ? 44 : 0);
        c.fillStyle = "rgba(20,14,44,.72)"; rr(c, right ? x - 92 : x - 12, y - 16, 104, 32, 10); c.fill();
        c.fillStyle = o.it.kind === "sun" ? "#FFD27A" : "#E8E2FF"; c.font = "700 13px -apple-system, system-ui, sans-serif"; c.textAlign = right ? "right" : "left";
        c.fillText((right ? "" : "‹ ") + o.it.n + (right ? " ›" : ""), x, y + 5); c.textAlign = "center";
      });
      // Fadenkreuz
      c.strokeStyle = "rgba(255,255,255,.8)"; c.lineWidth = 1.5; c.beginPath(); c.arc(cx, cy, 14, 0, 7); c.moveTo(cx - 24, cy); c.lineTo(cx - 8, cy); c.moveTo(cx + 8, cy); c.lineTo(cx + 24, cy); c.stroke();
      st.raf = requestAnimationFrame(draw);
    }
    function $t(id, t) { var e = ov.querySelector("#" + id); if (e && e.textContent !== t) e.textContent = t; }
    function rr(c2, x, y, w2, h2, r) { c2.beginPath(); c2.moveTo(x + r, y); c2.arcTo(x + w2, y, x + w2, y + h2, r); c2.arcTo(x + w2, y + h2, x, y + h2, r); c2.arcTo(x, y + h2, x, y, r); c2.arcTo(x, y, x + w2, y, r); c2.closePath(); }
    st.raf = requestAnimationFrame(draw);
    if (opts.onOpen) opts.onOpen();
  }
  function close() {
    if (!st) return;
    cancelAnimationFrame(st.raf);
    if (st.stream) st.stream.getTracks().forEach(function (t) { t.stop(); });
    window.removeEventListener("deviceorientationabsolute", st.onOri); window.removeEventListener("deviceorientation", st.onOri);
    document.removeEventListener("keydown", st.onKey);
    if (st.ov.parentNode) st.ov.parentNode.removeChild(st.ov);
    document.documentElement.classList.remove("wd-cam-open");
    st = null;
  }
  /* Muss direkt aus einem Tipp heraus aufgerufen werden (Freigabe für Bewegungssensoren) */
  function start(opts) {
    var DOE = window.DeviceOrientationEvent;
    if (DOE && typeof DOE.requestPermission === "function") {
      DOE.requestPermission().then(function (s) { if (s !== "granted" && g.wzToast) wzToast("Ohne Kompass-Zugriff kann die Richtung nicht angezeigt werden."); open(opts); }).catch(function () { open(opts); });
    } else open(opts);
  }
  g.WDCam = { start: start, close: close };
})(window);
