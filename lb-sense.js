/* ============================================================
   lb-sense.js — LabWahr: Zugriff auf Sensoren und Diagramme
   Bewegung (Beschleunigung, Drehrate), Mikrofon, Tonausgabe,
   Standort und Bildschirmsperre. Alle Daten werden nur live im
   Arbeitsspeicher verarbeitet; nichts wird aufgenommen oder
   übertragen.
   © 2026 Jan Dierlich – Alle Rechte vorbehalten.
   ============================================================ */
(function (global) {
  "use strict";
  var DEG = Math.PI / 180;

  /* ---------- Bewegungssensoren ---------- */
  var MOT = (function () {
    var subs = [], on = false, granted = false, last = 0, seen = false;
    function onMotion(e) {
      var a = e.accelerationIncludingGravity, r = e.rotationRate;
      if (!a || a.x == null) return;
      seen = true;
      var s = {
        t: (e.timeStamp || performance.now()) / 1000,
        ax: +a.x || 0, ay: +a.y || 0, az: +a.z || 0,
        gx: r && r.beta != null ? r.beta * DEG : 0, gy: r && r.gamma != null ? r.gamma * DEG : 0, gz: r && r.alpha != null ? r.alpha * DEG : 0
      };
      if (s.t <= last) s.t = last + 0.001;
      last = s.t;
      for (var i = 0; i < subs.length; i++) { try { subs[i](s); } catch (err) { } }
    }
    function permit() {
      if (granted) return Promise.resolve();
      var D = global.DeviceMotionEvent;
      if (!D) return Promise.reject(new Error("Dieses Gerät meldet keine Bewegungssensoren."));
      if (typeof D.requestPermission === "function") {
        return D.requestPermission().then(function (st) { if (st !== "granted") throw new Error("Der Zugriff auf die Bewegungssensoren wurde nicht erlaubt. Du kannst ihn in den Website-Einstellungen deines Browsers freigeben."); granted = true; });
      }
      granted = true; return Promise.resolve();
    }
    function sub(fn) { subs.push(fn); if (!on) { on = true; global.addEventListener("devicemotion", onMotion); } return function () { unsub(fn); }; }
    function unsub(fn) { subs = subs.filter(function (x) { return x !== fn; }); if (!subs.length && on) { on = false; global.removeEventListener("devicemotion", onMotion); } }
    return { permit: permit, sub: sub, unsub: unsub, seen: function () { return seen; } };
  })();

  /* ---------- Audio: Mikrofon und Tonausgabe ---------- */
  var AUD = (function () {
    var ac = null, stream = null, src = null, an = null, proc = null, mute = null, subs = [];
    function ctx() {
      if (!ac) { var Cc = global.AudioContext || global.webkitAudioContext; if (!Cc) throw new Error("Web Audio wird von diesem Browser nicht unterstützt."); ac = new Cc(); }
      if (ac.state === "suspended") ac.resume();
      return ac;
    }
    function start(fftSize) {
      try { ctx(); } catch (e) { return Promise.reject(e); }
      if (stream) { if (fftSize && an && an.fftSize !== fftSize) an.fftSize = fftSize; return Promise.resolve(api()); }
      if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) return Promise.reject(new Error("Das Mikrofon ist in diesem Browser nicht verfügbar."));
      return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }).then(function (s) {
        stream = s; src = ac.createMediaStreamSource(s);
        an = ac.createAnalyser(); an.fftSize = fftSize || 8192; an.smoothingTimeConstant = 0; an.minDecibels = -140; an.maxDecibels = 0;
        proc = ac.createScriptProcessor(2048, 1, 1); mute = ac.createGain(); mute.gain.value = 0;
        proc.onaudioprocess = function (ev) {
          var d = ev.inputBuffer.getChannelData(0), copy = new Float32Array(d.length); copy.set(d);
          for (var i = 0; i < subs.length; i++) { try { subs[i](copy, ac.sampleRate); } catch (err) { } }
        };
        src.connect(an); src.connect(proc); proc.connect(mute); mute.connect(ac.destination);
        return api();
      }, function () { throw new Error("Kein Zugriff auf das Mikrofon. Du kannst ihn in den Website-Einstellungen deines Browsers erlauben."); });
    }
    function api() { return { ac: ac, an: an, sr: ac.sampleRate }; }
    function stop() {
      subs = [];
      if (proc) { try { proc.disconnect(); src.disconnect(); mute.disconnect(); } catch (e) { } proc.onaudioprocess = null; }
      if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
      stream = src = an = proc = mute = null;
    }
    function sub(fn) { subs.push(fn); return function () { subs = subs.filter(function (x) { return x !== fn; }); }; }
    /* kurzer Signalton (für Reaktion, Start/Ende); when = Sekunden ab jetzt */
    function beep(freq, dur, when, vol) {
      var c = ctx(), t = c.currentTime + (when || 0), o = c.createOscillator(), g = c.createGain();
      o.frequency.value = freq || 880; o.type = "sine";
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol || 0.35, t + 0.004); g.gain.setValueAtTime(vol || 0.35, t + (dur || 0.15) - 0.01); g.gain.linearRampToValueAtTime(0, t + (dur || 0.15));
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + (dur || 0.15) + 0.02);
      var lat = (c.outputLatency || c.baseLatency || 0);
      return performance.now() + ((when || 0) + lat) * 1000;
    }
    /* Dauerton (Tongenerator) */
    var tone = null;
    function toneStart(freq, vol, type) {
      var c = ctx(); toneStop();
      var o = c.createOscillator(), g = c.createGain();
      o.type = type || "sine"; o.frequency.value = freq; g.gain.value = 0;
      g.gain.linearRampToValueAtTime(vol, c.currentTime + 0.05);
      o.connect(g); g.connect(c.destination); o.start();
      tone = { o: o, g: g };
    }
    function toneSet(freq, vol, type) { if (!tone) return; var c = ctx(); tone.o.frequency.setTargetAtTime(freq, c.currentTime, 0.02); tone.g.gain.setTargetAtTime(vol, c.currentTime, 0.02); if (type) tone.o.type = type; }
    function toneStop() { if (!tone) return; var c = ac, t = tone; tone = null; try { t.g.gain.setTargetAtTime(0, c.currentTime, 0.015); t.o.stop(c.currentTime + 0.1); } catch (e) { } }
    return { start: start, stop: stop, sub: sub, beep: beep, ctx: ctx, toneStart: toneStart, toneSet: toneSet, toneStop: toneStop, toneOn: function () { return !!tone; }, running: function () { return !!stream; } };
  })();

  /* ---------- Standort (nur auf Anfrage, nur für Vergleiche) ---------- */
  function locate() {
    return new Promise(function (res, rej) {
      if (!navigator.geolocation) { rej(new Error("Standortbestimmung ist nicht verfügbar.")); return; }
      navigator.geolocation.getCurrentPosition(function (p) { res({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy }); },
        function () { rej(new Error("Der Standort konnte nicht bestimmt werden. Du kannst den Zugriff in den Einstellungen deines Browsers erlauben.")); }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
    });
  }

  /* ---------- Bildschirm wach halten während einer Messung ---------- */
  var lock = null;
  function wake(on) {
    try {
      if (on && !lock && navigator.wakeLock) navigator.wakeLock.request("screen").then(function (l) { lock = l; l.addEventListener("release", function () { lock = null; }); }).catch(function () { });
      if (!on && lock) { lock.release(); lock = null; }
    } catch (e) { }
  }

  /* ---------- Diagramme (Canvas) ---------- */
  function cssVar(n, d) { var v = getComputedStyle(document.documentElement).getPropertyValue(n); return v && v.trim() ? v.trim() : d; }
  function colors() {
    var dark = document.documentElement.classList.contains("theme-dark");
    return { a: dark ? "#B9A6F5" : "#5A2FBE", b: dark ? "#7FB6EA" : "#2E6FB0", c: dark ? "#E79AC6" : "#B0487A", d: dark ? "#F2C46B" : "#B07A12", grid: dark ? "rgba(226,220,255,.12)" : "rgba(36,30,63,.09)", text: dark ? "#C3B2F0" : "#524370", bg: cssVar("--plot", dark ? "#241F38" : "#F7F4FD"), ok: "#2F9E55", warn: "#D99A00", bad: "#E5484D" };
  }
  function nice(v) { var p = Math.pow(10, Math.floor(Math.log10(Math.abs(v) || 1))), n = v / p; return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * p; }
  function fmtTick(v, st) { if (Math.abs(v) < st * 1e-6) v = 0; var d = st >= 1 ? 0 : Math.min(3, Math.ceil(-Math.log10(st))); return v.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d }); }
  /* opts: series [{xs, ys, color, w, dots, dash}], xr, yr, marks [x], vlines [{x, color, label}], hline [{y, color, label}], xlab, ylab */
  function plot(cv, opts) {
    if (!cv) return;
    var dpr = global.devicePixelRatio || 1, W = cv.clientWidth || 300, H = cv.clientHeight || 160;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    var g = cv.getContext("2d"), K = colors();
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    g.fillStyle = K.bg; g.fillRect(0, 0, W, H);
    var S = opts.series || [], xr = opts.xr, yr = opts.yr;
    if (!xr || !yr) {
      var x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      S.forEach(function (s) { for (var i = 0; i < s.xs.length; i++) { var x = s.xs[i], y = s.ys[i]; if (!isFinite(x) || !isFinite(y)) continue; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } });
      (opts.hline || []).forEach(function (h) { if (h.y < y0) y0 = h.y; if (h.y > y1) y1 = h.y; });
      if (!isFinite(x0)) { x0 = 0; x1 = 1; y0 = 0; y1 = 1; }
      if (x1 - x0 < 1e-9) x1 = x0 + 1;
      if (y1 - y0 < (opts.minSpan || 1e-6)) { var m = (y0 + y1) / 2, hs = (opts.minSpan || 1e-6) / 2; y0 = m - hs; y1 = m + hs; }
      var pad = (y1 - y0) * 0.08; y0 -= pad; y1 += pad;
      xr = xr || [x0, x1]; yr = yr || [y0, y1];
    }
    var L = 40, R = 10, T = 10, B = opts.xlab ? 30 : 22, pw = W - L - R, ph = H - T - B;
    function X(x) { return L + (x - xr[0]) / (xr[1] - xr[0]) * pw; }
    function Y(y) { return T + (1 - (y - yr[0]) / (yr[1] - yr[0])) * ph; }
    g.font = "11px -apple-system,system-ui,sans-serif"; g.fillStyle = K.text; g.strokeStyle = K.grid; g.lineWidth = 1;
    var ys = nice((yr[1] - yr[0]) / 4), yt = Math.ceil(yr[0] / ys) * ys;
    g.textAlign = "right"; g.textBaseline = "middle";
    for (; yt <= yr[1] + 1e-9; yt += ys) { var py = Y(yt); g.beginPath(); g.moveTo(L, py); g.lineTo(W - R, py); g.stroke(); g.fillText(fmtTick(yt, ys), L - 5, py); }
    var xs = nice((xr[1] - xr[0]) / 4), xt = Math.ceil(xr[0] / xs) * xs;
    g.textAlign = "center"; g.textBaseline = "top";
    for (; xt <= xr[1] + 1e-9; xt += xs) { var px = X(xt); g.beginPath(); g.moveTo(px, T); g.lineTo(px, T + ph); g.stroke(); g.fillText(opts.xfmt ? opts.xfmt(xt) : fmtTick(xt, xs), px, T + ph + 4); }
    if (opts.xlab) { g.textAlign = "right"; g.fillText(opts.xlab, W - R, H - 13); }
    if (opts.ylab) { g.textAlign = "left"; g.textBaseline = "top"; g.fillText(opts.ylab, L + 4, T + 2); }
    g.save(); g.beginPath(); g.rect(L, T, pw, ph); g.clip();
    (opts.hline || []).forEach(function (h) { g.strokeStyle = h.color || K.text; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(L, Y(h.y)); g.lineTo(W - R, Y(h.y)); g.stroke(); g.setLineDash([]); });
    (opts.vlines || []).forEach(function (v) { g.strokeStyle = v.color || K.d; g.lineWidth = 1.5; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(X(v.x), T); g.lineTo(X(v.x), T + ph); g.stroke(); g.setLineDash([]); g.lineWidth = 1; });
    S.forEach(function (s, si) {
      var col = s.color || [K.a, K.b, K.c, K.d][si % 4];
      g.strokeStyle = col; g.fillStyle = col; g.lineWidth = s.w || 2; g.lineJoin = "round";
      if (s.dash) g.setLineDash(s.dash);
      if (!s.dots) {
        g.beginPath(); var st = false;
        for (var i = 0; i < s.xs.length; i++) { var x = s.xs[i], y = s.ys[i]; if (!isFinite(y)) { st = false; continue; } if (!st) { g.moveTo(X(x), Y(y)); st = true; } else g.lineTo(X(x), Y(y)); }
        g.stroke();
      } else {
        for (var j = 0; j < s.xs.length; j++) { if (!isFinite(s.ys[j])) continue; g.beginPath(); g.arc(X(s.xs[j]), Y(s.ys[j]), s.r || 2.4, 0, 6.3); g.fill(); }
      }
      g.setLineDash([]);
    });
    (opts.marks || []).forEach(function (m) { g.fillStyle = K.d; g.beginPath(); var mx = X(m); g.moveTo(mx, T + 2); g.lineTo(mx - 5, T - 6 + 2); g.lineTo(mx + 5, T - 6 + 2); g.closePath(); g.fill(); g.strokeStyle = K.d; g.setLineDash([2, 3]); g.beginPath(); g.moveTo(mx, T); g.lineTo(mx, T + ph); g.stroke(); g.setLineDash([]); });
    g.restore();
    (opts.labels || []).forEach(function (lb) { g.fillStyle = lb.color || K.text; g.textAlign = lb.align || "left"; g.textBaseline = "middle"; g.fillText(lb.text, X(lb.x), Y(lb.y)); });
  }
  /* Messreihe ausdünnen (für Speicher und Diagramme) */
  function thin(xs, ys, n) {
    if (xs.length <= n) return { xs: xs.slice(), ys: ys.slice() };
    var k = xs.length / n, ox = [], oy = [];
    for (var i = 0; i < n; i++) { var a = Math.floor(i * k), b = Math.min(xs.length, Math.floor((i + 1) * k)), mi = a, ma = a; for (var j = a; j < b; j++) { if (ys[j] < ys[mi]) mi = j; if (ys[j] > ys[ma]) ma = j; } var p = mi < ma ? [mi, ma] : [ma, mi]; ox.push(xs[p[0]]); oy.push(ys[p[0]]); if (p[1] !== p[0]) { ox.push(xs[p[1]]); oy.push(ys[p[1]]); } }
    return { xs: ox, ys: oy };
  }

  global.LBSense = { MOT: MOT, AUD: AUD, locate: locate, wake: wake, plot: plot, thin: thin, colors: colors };
})(window);
