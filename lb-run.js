/* ============================================================
   lb-run.js — LabWahr: Messabläufe der 18 Versuche
   Jeder Ablauf liest die Sensoren live, zeigt Messwert, Verlauf
   und Qualität an und liefert kompakte Daten für die Auswertung.
   © 2026 Jan Dierlich – Alle Rechte vorbehalten.
   ============================================================ */
(function (global) {
  "use strict";
  var C = global.LBCore, S = global.LBSense, MOT = S.MOT, AUD = S.AUD, f = global.LBExp.fmt, RAD = Math.PI / 180, G = 9.80665;
  var NOSENS = "Es kommen keine Bewegungsdaten an. Prüfe, ob der Zugriff auf „Bewegung und Ausrichtung“ für diese Website erlaubt ist.";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function last(a) { return a[a.length - 1]; }
  function since(t, sec) { var lim = last(t) - sec, i = t.length - 1; while (i > 0 && t[i - 1] >= lim) i--; return i; }
  function rel(t) { var t0 = t[0]; return t.map(function (x) { return x - t0; }); }
  function clock(ms) { return new Date(ms).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }); }

  /* Gemeinsamer Ablauf für Bewegungsmessungen */
  function motion(ctx, h) {
    var un = null, iv = 0, chk = 0, on = false;
    return {
      running: function () { return on; },
      start: function () {
        return MOT.permit().then(function () {
          on = true; if (h.begin) h.begin();
          un = MOT.sub(h.sample); iv = setInterval(function () { try { h.tick(); } catch (e) { } }, h.every || 250); S.wake(true);
          chk = setTimeout(function () { if (on && !MOT.seen()) ctx.status("r", NOSENS); }, 1800);
          ctx.main(h.stopLabel || "Beenden", true);
        }, function (e) { ctx.alert(e.message); });
      },
      stop: function () {
        if (!on) return; on = false; if (un) un(); un = null; clearInterval(iv); clearTimeout(chk); S.wake(false);
        ctx.main(h.startLabel || "Messung starten", false); if (h.end) h.end();
      }
    };
  }
  /* Gemeinsamer Ablauf für Mikrofon-Messungen mit Auslöser (Knall, Aufprall) */
  function capture(ctx, opt) {
    var on = false, un = null, ring = null, cap = null, need = 0, noise = 0.002, cool = 0, sr = 48000;
    function onChunk(d, rate) {
      sr = rate;
      if (!ring) ring = { b: new Float32Array(Math.round(sr * 0.06)), i: 0 };
      var pk = 0, ss = 0; for (var i = 0; i < d.length; i++) { var a = Math.abs(d[i]); if (a > pk) pk = a; ss += d[i] * d[i]; }
      var rms = Math.sqrt(ss / d.length), now = performance.now();
      if (opt.level) opt.level(rms, pk);
      if (cap) {
        var nb = new Float32Array(cap.length + d.length); nb.set(cap); nb.set(d, cap.length); cap = nb;
        if (cap.length >= need) { var c = cap; cap = null; cool = now + (opt.cool || 1200); try { opt.done(c, sr); } catch (e) { } }
      } else {
        if (now > cool && pk > Math.max(opt.minPeak || 0.06, noise * (opt.k || 14))) {
          var pre = new Float32Array(ring.b.length); pre.set(ring.b.subarray(ring.i)); pre.set(ring.b.subarray(0, ring.i), ring.b.length - ring.i);
          cap = new Float32Array(pre.length + d.length); cap.set(pre); cap.set(d, pre.length);
          need = Math.round(sr * (opt.post + 0.06)); if (opt.trig) opt.trig();
        } else noise = noise * 0.9 + rms * 0.1;
      }
      for (i = 0; i < d.length; i++) { ring.b[ring.i] = d[i]; ring.i = (ring.i + 1) % ring.b.length; }
    }
    return {
      running: function () { return on; },
      start: function () {
        return AUD.start(4096).then(function () { on = true; cap = null; cool = performance.now() + 400; un = AUD.sub(onChunk); S.wake(true); ctx.main("Beenden", true); if (opt.ready) opt.ready(); }, function (e) { ctx.alert(e.message); });
      },
      stop: function () { if (!on) return; on = false; if (un) un(); un = null; AUD.stop(); S.wake(false); ctx.main("Mikrofon starten", false); }
    };
  }
  /* Hüllkurve für Diagramm und Speicher verkleinern (Maximum je Block) */
  function shrink(env, step, n) {
    var k = Math.max(1, Math.ceil(env.length / n)), out = [];
    for (var i = 0; i < env.length; i += k) { var m = 0; for (var j = i; j < Math.min(env.length, i + k); j++) if (env[j] > m) m = env[j]; out.push(+m.toPrecision(4)); }
    return { env: out, step: step * k, k: k };
  }
  function envPlot(ctx, last, opts) {
    if (!last) { ctx.plot({ series: [], xlab: "ms" }); return; }
    var xs = last.env.map(function (_, i) { return i * last.step * 1000; }), mx = Math.max.apply(null, last.env) || 1;
    var ys = opts && opts.db ? last.env.map(function (v) { return C.db(v / mx); }) : last.env.map(function (v) { return v / mx; });
    var vl = []; (opts && opts.at || []).forEach(function (x) { vl.push({ x: x * 1000 }); });
    ctx.plot({ series: [{ xs: xs, ys: ys, w: 1.6 }], vlines: vl, xlab: "ms", ylab: opts && opts.db ? "dB" : "relativ", yr: opts && opts.db ? [-60, 2] : [0, 1.05] });
  }

  var R = {};

  /* ---------- 1 Fadenpendel ---------- */
  R.period = function (ctx) {
    var rec, res = ctx.prev || null;
    var m = motion(ctx, {
      begin: function () { rec = { t: [], x: [], y: [], z: [] }; res = null; ctx.status("", "Pendel jetzt um höchstens 10° auslenken und loslassen. Die Schwingungen werden automatisch erkannt."); },
      sample: function (s) { rec.t.push(s.t); rec.x.push(s.gx); rec.y.push(s.gy); rec.z.push(s.gz); if (rec.t.length > 7200) ["t", "x", "y", "z"].forEach(function (k) { rec[k].splice(0, 1200); }); },
      every: 300,
      tick: function () {
        if (rec.t.length < 60) return;
        var i0 = since(rec.t, 60), t = rec.t.slice(i0), pr = C.pca1(rec.x.slice(i0), rec.y.slice(i0), rec.z.slice(i0)), p = C.periods(t, pr), L = ctx.p().L / 100;
        if (p.n >= 1) res = { T: p.T, sd: p.sd || 0, n: p.n };
        show(p.n >= 1 ? p : null, L);
        var j = since(t, 10), xs = t.slice(j).map(function (x) { return x - last(t); });
        ctx.plot({ series: [{ xs: xs, ys: pr.slice(j) }], vlines: p.crossings.filter(function (c) { return c >= t[j]; }).map(function (c) { return { x: c - last(t) }; }), xlab: "s", ylab: "Drehrate (Hauptachse)" });
        if (!p.n) ctx.status("y", "Warte auf gleichmäßige Schwingungen …");
        else if (p.n < 4) ctx.status("y", "Bisher " + p.n + (p.n === 1 ? " Schwingung" : " Schwingungen") + " – für ein belastbares Ergebnis mindestens 6.");
        else { var cv = p.sd / p.T; ctx.status(cv < 0.01 ? "g" : "y", cv < 0.01 ? "Gleichmäßige Schwingung. Weitere Schwingungen erhöhen die Genauigkeit; du kannst jederzeit auswerten." : "Die Einzelwerte streuen um " + f(cv * 100, 1) + " %. Prüfe, ob das Pendel kreist oder sich dreht."); }
      },
      end: function () { if (res) ctx.save(res); }
    });
    function show(p, L) {
      if (!p && !res) { ctx.big("Schwingungsdauer T", "–", "s", "Noch keine Messung"); return; }
      var q = p || res;
      ctx.big("Schwingungsdauer T", f(q.T, 3), "s", "aus " + q.n + (q.n === 1 ? " Schwingung" : " Schwingungen") + (q.n > 1 ? " · Streuung ± " + f(q.sd, 3) + " s" : "") + " · g ≈ " + f(C.pendulumG(L, q.T), 2) + " m/s²");
    }
    show(null, ctx.p().L / 100); if (res) ctx.status("", "Gespeicherte Messung vorhanden. Du kannst sie auswerten oder neu messen.");
    return { toggle: function () { if (m.running()) m.stop(); else m.start(); }, stop: m.stop, reset: function () { m.stop(); res = null; show(null, 1); ctx.plot({ series: [] }); ctx.status("", ""); }, data: function () { return res; }, inputChanged: function () { show(null, ctx.p().L / 100); } };
  };

  /* ---------- 2 Zentripetalbeschleunigung ---------- */
  R.spin = function (ctx) {
    var pairs = ctx.prev ? ctx.prev.pairs.slice() : [], wmax = ctx.prev ? ctx.prev.wmax : 0, amax = ctx.prev ? ctx.prev.amax : 0, cur = { w: 0, a: 0 }, lastT = 0;
    var m = motion(ctx, {
      begin: function () { ctx.status("", "Drehung langsam beginnen und gleichmäßig steigern."); },
      sample: function (s) {
        var w = Math.hypot(s.gx, s.gy, s.gz); cur.w = w;
        if (w < 1.0) { cur.a = 0; return; }
        var nx = s.gx / w, ny = s.gy / w, nz = s.gz / w, d = s.ax * nx + s.ay * ny + s.az * nz, a = Math.hypot(s.ax - d * nx, s.ay - d * ny, s.az - d * nz);
        cur.a = a;
        if (s.t - lastT >= 0.04) { lastT = s.t; pairs.push({ w: +w.toFixed(3), a: +a.toFixed(3) }); if (pairs.length > 1500) pairs.splice(0, 300); if (w > wmax) wmax = w; if (a > amax) amax = a; }
      },
      tick: function () {
        show();
        if (amax > 70) ctx.status("r", "Über 7 g gemessen – bitte langsamer drehen, die Sensoren können sonst übersteuern.");
        else if (pairs.length < 30) ctx.status("y", "Wertepaare: " + pairs.length + " – Drehrate langsam steigern.");
        else ctx.status("g", pairs.length + " Wertepaare. Variiere die Drehrate, damit die Parabel gut bestimmt ist.");
      },
      end: function () { ctx.save(data()); }
    });
    function show() {
      ctx.big("Drehrate", f(cur.w * 60 / (2 * Math.PI), 0), "U/min", "ω = " + f(cur.w, 1) + " rad/s · a = " + f(cur.a, 1) + " m/s² (" + f(cur.a / G, 2) + " g)");
      var xs = pairs.map(function (p) { return p.w; }), ys = pairs.map(function (p) { return p.a; }), ser = [{ xs: xs, ys: ys, dots: true, r: 1.8 }];
      if (pairs.length >= 10) { var r = C.spinFit(pairs), fx = [], fy = []; for (var i = 0; i <= 40; i++) { var w = wmax * i / 40; fx.push(w); fy.push(r * w * w); } ser.push({ xs: fx, ys: fy, w: 2, dash: [5, 4] }); }
      ctx.plot({ series: ser, xlab: "ω in rad/s", ylab: "a in m/s²" });
    }
    function data() { var pp = pairs.length > 600 ? pairs.filter(function (_, i) { return i % Math.ceil(pairs.length / 600) === 0; }) : pairs; return { pairs: pp, wmax: wmax, amax: amax }; }
    show(); if (pairs.length) ctx.status("", "Gespeicherte Messung mit " + pairs.length + " Wertepaaren.");
    return { toggle: function () { if (m.running()) m.stop(); else m.start(); }, stop: m.stop, reset: function () { m.stop(); pairs = []; wmax = amax = 0; cur = { w: 0, a: 0 }; show(); ctx.status("", ""); }, data: function () { return pairs.length ? data() : null; } };
  };

  /* ---------- 3 Aufzug ---------- */
  R.lift = function (ctx) {
    var rec, res = ctx.prev || null, gdir = null, g0 = 0, v = 0, h = 0, lt = 0;
    var m = motion(ctx, {
      begin: function () { rec = { t: [], a: [] }; gdir = null; v = h = 0; res = null; ctx.status("y", "Ruhewert wird bestimmt – Smartphone 2 Sekunden nicht bewegen."); },
      sample: function (s) {
        rec.t.push(s.t); rec.a.push([s.ax, s.ay, s.az]);
        var T = s.t - rec.t[0];
        if (!gdir && T >= 1.5) {
          var sx = 0, sy = 0, sz = 0; rec.a.forEach(function (q) { sx += q[0]; sy += q[1]; sz += q[2]; });
          var n = Math.hypot(sx, sy, sz) || 1; gdir = [sx / n, sy / n, sz / n]; g0 = n / rec.a.length; lt = s.t;
        } else if (gdir) {
          var av = s.ax * gdir[0] + s.ay * gdir[1] + s.az * gdir[2] - g0, dt = s.t - lt; lt = s.t; v += av * dt; h += v * dt;
        }
      },
      tick: function () {
        if (!gdir) return;
        ctx.big("Höhe (vorläufig)", f(Math.abs(h), 1), "m", "v = " + f(v, 2) + " m/s · Ruhewert " + f(g0, 3) + " m/s²");
        ctx.status("", "Aufzeichnung läuft. Nach dem Halt 2 Sekunden warten, dann beenden.");
        var i0 = since(rec.t, 30), xs = [], ys = [];
        for (var i = i0; i < rec.t.length; i++) { var q = rec.a[i]; xs.push(rec.t[i] - last(rec.t)); ys.push(q[0] * gdir[0] + q[1] * gdir[1] + q[2] * gdir[2] - g0); }
        ctx.plot({ series: [{ xs: xs, ys: ys, w: 1.6 }], hline: [{ y: 0 }], xlab: "s", ylab: "a − g₀ in m/s²", minSpan: 0.4 });
      },
      end: function () {
        if (!gdir || rec.t.length < 60) { ctx.status("r", "Zu kurz für eine Auswertung."); return; }
        var av = rec.a.map(function (q) { return q[0] * gdir[0] + q[1] * gdir[1] + q[2] * gdir[2]; }), L = C.liftIntegrate(rec.t, av, 1.5);
        var ts = rel(rec.t), th = S.thin(ts, L.hs, 300), tv = S.thin(ts, L.v, 300);
        res = { h: L.h, vmax: L.vmax, amax: L.amax, g0: L.g0, T: L.T, ts: th.xs, hs: th.ys, vs: tv.ys.slice(0, th.xs.length) };
        ctx.big("Höhenunterschied", f(Math.abs(L.h), 1), "m", (L.h >= 0 ? "aufwärts" : "abwärts") + " · mit Driftkorrektur");
        ctx.plot({ series: [{ xs: th.xs, ys: th.ys }], xlab: "s", ylab: "Höhe in m" });
        ctx.status("g", "Messung abgeschlossen. Weiter zur Auswertung."); ctx.save(res);
      }
    });
    if (res) { ctx.big("Höhenunterschied", f(Math.abs(res.h), 1), "m", "gespeicherte Messung"); ctx.plot({ series: [{ xs: res.ts, ys: res.hs }], xlab: "s", ylab: "Höhe in m" }); }
    else ctx.big("Höhe", "–", "m", "Messung im Stand starten");
    return { toggle: function () { if (m.running()) m.stop(); else m.start(); }, stop: m.stop, reset: function () { m.stop(); res = null; ctx.big("Höhe", "–", "m", "Messung im Stand starten"); ctx.plot({ series: [] }); ctx.status("", ""); }, data: function () { return res; } };
  };

  /* ---------- 4 Haftreibung ---------- */
  R.slide = function (ctx) {
    var angles = ctx.prev ? ctx.prev.angles.slice() : [], hist = [], lp = null, gref = null, gbuf = [], armed = true, cnt = 0, ang = 0, marks = [], tStart = 0;
    ctx.extra.innerHTML = '<button type="button" class="cta slim" data-k="now">Rutscht jetzt (manuell)</button><div class="lb-list" data-k="list"></div>';
    var list = ctx.extra.querySelector('[data-k="list"]');
    function angleAt(back) { var tt = last(hist).t - back; for (var i = hist.length - 1; i >= 0; i--) if (hist[i].t <= tt) return hist[i].a; return hist.length ? hist[0].a : NaN; }
    function take(a) { if (!isFinite(a) || a < 2) return; angles.push(+a.toFixed(2)); marks.push(last(hist).t); armed = false; AUD.beep(1320, 0.08, 0, 0.25); renderList(); ctx.save({ angles: angles }); }
    function renderList() {
      list.innerHTML = angles.length ? angles.map(function (a, i) { return '<div class="lb-li"><span>Versuch ' + (i + 1) + '</span><b>' + f(a, 1) + "° · μ = " + f(Math.tan(a * RAD), 2) + '</b><button type="button" class="icon-btn" data-del="' + i + '" aria-label="Wert löschen">✕</button></div>'; }).join("") : '<p class="muted small">Noch kein Grenzwinkel erfasst.</p>';
    }
    list.addEventListener("click", function (e) { var b = e.target.closest("[data-del]"); if (!b) return; angles.splice(+b.getAttribute("data-del"), 1); renderList(); ctx.save({ angles: angles }); });
    ctx.extra.querySelector('[data-k="now"]').addEventListener("click", function () { if (m.running() && hist.length) take(angleAt(0.3)); else ctx.toast("Bitte zuerst die Messung starten."); });
    var m = motion(ctx, {
      begin: function () { hist = []; lp = null; gref = null; gbuf = []; armed = true; marks = []; tStart = 0; ctx.status("", "Brett jetzt sehr langsam anheben. Der Rutschmoment wird automatisch erkannt."); },
      sample: function (s) {
        if (!tStart) tStart = s.t;
        lp = lp ? [lp[0] + 0.25 * (s.ax - lp[0]), lp[1] + 0.25 * (s.ay - lp[1]), lp[2] + 0.25 * (s.az - lp[2])] : [s.ax, s.ay, s.az];
        var mag = Math.hypot(s.ax, s.ay, s.az); ang = Math.atan2(Math.hypot(lp[0], lp[1]), Math.abs(lp[2])) / RAD;
        hist.push({ t: s.t, a: ang, m: mag }); while (hist.length && s.t - hist[0].t > 6) hist.shift();
        if (!gref) { gbuf.push(mag); if (s.t - tStart > 1) gref = C.median(gbuf); return; }
        if (!armed) { if (ang < 3) armed = true; cnt = 0; return; }
        if (ang > 4) {
          var jump = hist.length > 10 ? Math.abs(ang - angleAt(0.15)) : 0;
          if (Math.abs(mag - gref) > 0.7 || jump > 4) cnt++; else cnt = 0;
          if (cnt >= 2) { cnt = 0; take(angleAt(0.25)); }
        }
      },
      tick: function () {
        ctx.big("Neigung α", f(ang, 1), "°", "tan α = " + f(Math.tan(ang * RAD), 2) + " · " + angles.length + (angles.length === 1 ? " Grenzwinkel" : " Grenzwinkel") + " erfasst");
        if (hist.length) { var t1 = last(hist).t; ctx.plot({ series: [{ xs: hist.map(function (q) { return q.t - t1; }), ys: hist.map(function (q) { return q.a; }) }], vlines: marks.filter(function (x) { return t1 - x < 6; }).map(function (x) { return { x: x - t1 }; }), xlab: "s", ylab: "Neigung in °", yr: [0, Math.max(30, ang + 10)] }); }
        if (!armed) ctx.status("g", "Grenzwinkel erfasst. Brett absenken (unter 3°) und Schlitten zurücksetzen – dann erneut.");
        else if (angles.length >= 3) ctx.status("g", angles.length + " Werte erfasst. Du kannst auswerten oder weitere Durchgänge messen.");
        else ctx.status("", "Brett langsam anheben …");
      }
    });
    renderList();
    ctx.big("Neigung α", "–", "°", angles.length ? angles.length + " Grenzwinkel gespeichert" : "Messung starten, Brett flach");
    return { toggle: function () { if (m.running()) m.stop(); else m.start(); }, stop: m.stop, reset: function () { m.stop(); angles = []; renderList(); ctx.plot({ series: [] }); ctx.status("", ""); }, data: function () { return angles.length ? { angles: angles } : null; } };
  };

  /* ---------- 5 Schaukel ---------- */
  R.gforce = function (ctx) {
    var rec, res = ctx.prev || null, buf = [];
    var m = motion(ctx, {
      begin: function () { rec = { t: [], g: [] }; buf = []; res = null; ctx.status("", "Smartphone in die Tasche stecken und schaukeln. Die ersten und letzten 2,5 s werden nicht gewertet."); },
      sample: function (s) { buf.push(Math.hypot(s.ax, s.ay, s.az) / G); if (buf.length > 9) buf.shift(); rec.t.push(s.t); rec.g.push(C.mean(buf)); if (rec.t.length > 60 * 600) { rec.t.splice(0, 3600); rec.g.splice(0, 3600); } },
      tick: function () {
        if (rec.t.length < 10) return;
        var i0 = since(rec.t, 30), t1 = last(rec.t), gg = rec.g.slice(i0), tail = rec.t.length > 300 ? rec.g.slice(150) : rec.g;
        ctx.big("Lastvielfaches", f(last(rec.g), 2), "g", "Maximum " + f(Math.max.apply(null, tail), 2) + " g · Minimum " + f(Math.min.apply(null, tail), 2) + " g");
        ctx.plot({ series: [{ xs: rec.t.slice(i0).map(function (x) { return x - t1; }), ys: gg }], hline: [{ y: 1 }], xlab: "s", ylab: "n in g", minSpan: 0.5 });
      },
      end: function () {
        var n = rec.t.length, T = n ? last(rec.t) - rec.t[0] : 0;
        if (T < 8) { ctx.status("r", "Zu kurz für eine Auswertung (mindestens 8 s)."); return; }
        var lo = 0; while (lo < n && rec.t[lo] - rec.t[0] < 2.5) lo++;
        var hi = since(rec.t, 2.5), g = rec.g.slice(lo, hi), ts = rel(rec.t.slice(lo, hi)), th = S.thin(ts, g, 400);
        res = { gmax: Math.max.apply(null, g), gmin: Math.min.apply(null, g), T: T, ts: th.xs, gs: th.ys };
        ctx.status("g", "Messung abgeschlossen. Weiter zur Auswertung."); ctx.save(res);
      }
    });
    if (res) { ctx.big("Lastvielfaches", f(res.gmax, 2), "g", "gespeichert: Maximum · Minimum " + f(res.gmin, 2) + " g"); ctx.plot({ series: [{ xs: res.ts, ys: res.gs }], hline: [{ y: 1 }], xlab: "s", ylab: "n in g" }); }
    else ctx.big("Lastvielfaches", "–", "g", "Im Ruhezustand: 1,00 g");
    return { toggle: function () { if (m.running()) m.stop(); else m.start(); }, stop: m.stop, reset: function () { m.stop(); res = null; ctx.big("Lastvielfaches", "–", "g", ""); ctx.plot({ series: [] }); ctx.status("", ""); }, data: function () { return res; } };
  };

  /* ---------- 6 Seismograf ---------- */
  R.seismo = function (ctx) {
    var rec, res = ctx.prev || null, lp = null, t0 = 0;
    var m = motion(ctx, {
      begin: function () { rec = { t: [], x: [] }; lp = null; t0 = 0; res = null; ctx.status("y", "3 Sekunden Ruhe für das Grundrauschen …"); },
      sample: function (s) {
        if (!t0) t0 = s.t;
        lp = lp ? [lp[0] + 0.03 * (s.ax - lp[0]), lp[1] + 0.03 * (s.ay - lp[1]), lp[2] + 0.03 * (s.az - lp[2])] : [s.ax, s.ay, s.az];
        if (s.t - t0 < 1) return;
        rec.t.push(s.t); rec.x.push(Math.hypot(s.ax - lp[0], s.ay - lp[1], s.az - lp[2]));
        if (rec.t.length > 60 * 300) { rec.t.splice(0, 3600); rec.x.splice(0, 3600); }
      },
      tick: function () {
        if (rec.t.length < 10) return;
        var i0 = since(rec.t, 12), t1 = last(rec.t), j = since(rec.t, 0.6), pk = Math.max.apply(null, rec.x.slice(j));
        ctx.big("Erschütterung", f(pk * 1000 / G, 1), "mg", "Spitzenwert der letzten 0,6 s");
        ctx.plot({ series: [{ xs: rec.t.slice(i0).map(function (x) { return x - t1; }), ys: rec.x.slice(i0).map(function (v) { return v * 1000 / G; }), w: 1.4 }], xlab: "s", ylab: "mg", minSpan: 5 });
        if (t1 - rec.t[0] > 2) ctx.status("", "Jetzt in 15, 30 und 60 cm Entfernung je einmal gleich stark klopfen (3 s Pause).");
      },
      end: function () {
        if (rec.t.length < 120) { ctx.status("r", "Zu kurz für eine Auswertung."); return; }
        var E = C.events(rec.t, rec.x, { gap: 1.0, k: 8, min: 0.02 }), ts = rel(rec.t), th = S.thin(ts, rec.x.map(function (v) { return v * 1000 / G; }), 500);
        res = { events: E.list.map(function (e) { return { t: +(e.t - rec.t[0]).toFixed(3), v: e.v }; }), peak: Math.max.apply(null, rec.x), noise: E.noise, ts: th.xs, gs: th.ys };
        ctx.status(res.events.length ? "g" : "y", res.events.length ? res.events.length + " Ereignisse erkannt." : "Kein deutliches Ereignis über dem Grundrauschen.");
        ctx.plot({ series: [{ xs: th.xs, ys: th.ys, w: 1.4 }], marks: res.events.map(function (e) { return e.t; }), xlab: "s", ylab: "mg" }); ctx.save(res);
      }
    });
    if (res) { ctx.big("Stärkstes Ereignis", f(res.peak * 1000 / G, 1), "mg", "gespeicherte Messung"); ctx.plot({ series: [{ xs: res.ts, ys: res.gs, w: 1.4 }], marks: res.events.map(function (e) { return e.t; }), xlab: "s", ylab: "mg" }); }
    else ctx.big("Erschütterung", "–", "mg", "Smartphone flach auf den Tisch legen");
    return { toggle: function () { if (m.running()) m.stop(); else m.start(); }, stop: m.stop, reset: function () { m.stop(); res = null; ctx.big("Erschütterung", "–", "mg", ""); ctx.plot({ series: [] }); ctx.status("", ""); }, data: function () { return res; } };
  };

  /* ---------- 7 Schallgeschwindigkeit (Echo) ---------- */
  R.echo = function (ctx) {
    var dts = ctx.prev ? ctx.prev.dts.slice() : [], lastE = ctx.prev ? ctx.prev.last : null;
    ctx.extra.innerHTML = '<div class="lb-list" data-k="list"></div>';
    var list = ctx.extra.querySelector('[data-k="list"]');
    function renderList() {
      var p = ctx.p();
      list.innerHTML = dts.length ? dts.map(function (d, i) { return '<div class="lb-li"><span>Echo ' + (i + 1) + '</span><b>' + f(d * 1000, 1) + " ms · " + f(2 * p.d / d, 0) + ' m/s</b><button type="button" class="icon-btn" data-del="' + i + '" aria-label="Wert löschen">✕</button></div>'; }).join("") : '<p class="muted small">Noch kein Echo gemessen.</p>';
    }
    list.addEventListener("click", function (e) { var b = e.target.closest("[data-del]"); if (!b) return; dts.splice(+b.getAttribute("data-del"), 1); renderList(); ctx.save({ dts: dts, last: lastE }); });
    var c = capture(ctx, {
      post: 1.4, minPeak: 0.08, k: 14,
      ready: function () { ctx.status("", "Bereit. Einmal kräftig klatschen."); },
      trig: function () { ctx.status("", "Knall erkannt – werte aus …"); },
      done: function (buf, sr) {
        var p = ctx.p(), ex = 2 * p.d / C.soundSpeed(p.T), E = C.envelope(buf, sr, 1), r = C.echoDelay(E.env, E.step, { minSec: Math.max(0.025, ex * 0.6), maxSec: ex * 1.5 + 0.03 });
        var sh = shrink(E.env, E.step, 700);
        lastE = { env: sh.env, step: sh.step, p0: r ? r.p0 * E.step : 0, p1: r && isFinite(r.dt) ? r.p1 * E.step : null };
        if (r && isFinite(r.dt)) {
          dts.push(+r.dt.toFixed(5)); renderList();
          ctx.big("Laufzeit Δt", f(r.dt * 1000, 1), "ms", "c = 2·d / Δt ≈ " + f(2 * p.d / r.dt, 0) + " m/s");
          ctx.status("g", "Echo erkannt (" + f(r.rel * 100, 0) + " % der Knallstärke). Weitere Messungen verbessern die Genauigkeit.");
        } else ctx.status("y", "Knall erkannt, aber kein eindeutiges Echo zwischen " + f(ex * 600, 0) + " und " + f(ex * 1500, 0) + " ms. Abstand prüfen oder kräftiger klatschen.");
        envPlot(ctx, lastE, { at: [lastE.p0].concat(lastE.p1 != null ? [lastE.p1] : []) });
        ctx.save({ dts: dts, last: lastE });
      }
    });
    renderList(); envPlot(ctx, lastE, lastE ? { at: [lastE.p0].concat(lastE.p1 != null ? [lastE.p1] : []) } : null);
    ctx.big("Laufzeit Δt", dts.length ? f(last(dts) * 1000, 1) : "–", "ms", "Erwartet bei " + f(ctx.p().d, 0) + " m: ca. " + f(2 * ctx.p().d / C.soundSpeed(ctx.p().T) * 1000, 0) + " ms");
    ctx.main("Mikrofon starten", false);
    return { toggle: function () { if (c.running()) c.stop(); else c.start(); }, stop: c.stop, reset: function () { c.stop(); dts = []; lastE = null; renderList(); envPlot(ctx, null); ctx.status("", ""); }, data: function () { return dts.length ? { dts: dts, last: lastE } : null; }, inputChanged: renderList };
  };

  /* ---------- 8 Springender Ball ---------- */
  R.bounce = function (ctx) {
    var res = ctx.prev || null;
    var c = capture(ctx, {
      post: 5, minPeak: 0.05, k: 12, cool: 1500,
      ready: function () { ctx.status("", "Bereit. Ball aus der Ruhe fallen lassen und ausspringen lassen."); },
      trig: function () { ctx.status("", "Aufprall erkannt – zeichne 5 Sekunden auf …"); },
      done: function (buf, sr) {
        var E = C.envelope(buf, sr, 1), on = C.onsets(E.env, E.step, { rel: 0.04 }), B = C.bounce(on, ctx.p().H / 100), sh = shrink(E.env, E.step, 800);
        res = { B: B, times: on.map(function (x) { return +x.toFixed(4); }), last: { env: sh.env, step: sh.step } };
        envPlot(ctx, res.last, { at: on });
        if (B) { ctx.big("Stoßzahl e", f(B.e, 3), "", on.length + " Aufpralle · erste Sprunghöhe " + f(B.h1 * 100, 1) + " cm"); ctx.status("g", "Auswertbar. Für eine neue Messung einfach den Ball erneut fallen lassen."); }
        else { ctx.big("Stoßzahl e", "–", "", on.length + " Aufpralle erkannt"); ctx.status("y", "Zu wenige oder unregelmäßige Aufpralle. Umgebung ruhig halten und erneut versuchen."); }
        ctx.save(res);
      }
    });
    if (res && res.B) { ctx.big("Stoßzahl e", f(res.B.e, 3), "", "gespeicherte Messung"); envPlot(ctx, res.last, { at: res.times }); } else { ctx.big("Stoßzahl e", "–", "", "Mikrofon starten, dann Ball fallen lassen"); envPlot(ctx, null); }
    ctx.main("Mikrofon starten", false);
    return { toggle: function () { if (c.running()) c.stop(); else c.start(); }, stop: c.stop, reset: function () { c.stop(); res = null; ctx.big("Stoßzahl e", "–", "", ""); envPlot(ctx, null); ctx.status("", ""); }, data: function () { return res && res.B ? res : null; } };
  };

  /* ---------- 9 Doppler-Effekt ---------- */
  R.doppler = function (ctx) {
    var on = false, iv = 0, tr = [], t0 = 0, res = ctx.prev || null, spec = null, A = null;
    function analyze() {
      if (tr.length < 20) return null;
      var ts = tr.map(function (q) { return q.t; }), fs = tr.map(function (q) { return q.f; }), sm = fs.map(function (_, i) { return C.median(fs.slice(Math.max(0, i - 2), i + 3)); });
      var best = 0, tc = NaN;
      for (var i = 0; i < ts.length; i++) {
        var a = [], b = [];
        for (var j = 0; j < ts.length; j++) { if (ts[j] >= ts[i] - 0.5 && ts[j] < ts[i]) a.push(sm[j]); else if (ts[j] > ts[i] && ts[j] <= ts[i] + 0.5) b.push(sm[j]); }
        if (a.length > 2 && b.length > 2) { var d = C.median(a) - C.median(b); if (d > best) { best = d; tc = ts[i]; } }
      }
      var f1 = NaN, f2 = NaN;
      if (isFinite(tc)) {
        var A1 = [], B1 = []; for (i = 0; i < ts.length; i++) { var dt = ts[i] - tc; if (dt >= -2.5 && dt <= -0.8) A1.push(fs[i]); if (dt >= 0.8 && dt <= 2.5) B1.push(fs[i]); }
        if (A1.length >= 4 && B1.length >= 4) { f1 = C.median(A1); f2 = C.median(B1); }
      }
      if (!isFinite(f1)) { var q1 = C.percentile(fs, 0.75), q2 = C.percentile(fs, 0.25); f1 = C.median(fs.filter(function (x) { return x >= q1; })); f2 = C.median(fs.filter(function (x) { return x <= q2; })); }
      var th = S.thin(ts, fs, 400);
      return { f1: f1, f2: f2, n: tr.length, tc: tc, track: { xs: th.xs, ys: th.ys } };
    }
    function tick() {
      if (!A) return;
      if (!spec || spec.length !== A.an.frequencyBinCount) spec = new Float32Array(A.an.frequencyBinCount);
      A.an.getFloatFrequencyData(spec);
      var f0 = ctx.p().f0, bin = A.sr / A.an.fftSize, pk = C.peakFreq(spec, bin, f0 * 0.85, f0 * 1.15);
      var band = []; for (var i = Math.floor(f0 * 0.85 / bin); i < Math.ceil(f0 * 1.15 / bin); i += 3) band.push(spec[i]);
      var snr = pk.db - C.median(band), now = performance.now() / 1000 - t0;
      if (snr > 15) { tr.push({ t: +now.toFixed(3), f: +pk.f.toFixed(2) }); if (tr.length > 4000) tr.splice(0, 1000); }
      ctx.big("Frequenz", snr > 15 ? f(pk.f, 1) : "–", "Hz", snr > 15 ? "Signal " + f(snr, 0) + " dB über dem Grundgeräusch" : "kein Ton bei " + f(f0, 0) + " Hz erkannt");
      var j = 0; while (j < tr.length && tr[j].t < now - 20) j++;
      ctx.plot({ series: [{ xs: tr.slice(j).map(function (q) { return q.t - now; }), ys: tr.slice(j).map(function (q) { return q.f; }), dots: true, r: 1.8 }], xlab: "s", ylab: "Hz", minSpan: 20, hline: [{ y: f0 }] });
      ctx.status(tr.length < 20 ? "y" : "g", tr.length < 20 ? "Warte auf den Ton der Quelle …" : "Ton wird verfolgt. Nach dem Vorbeifahren beenden.");
    }
    function start() {
      AUD.start(16384).then(function (a) { A = a; on = true; tr = []; t0 = performance.now() / 1000; iv = setInterval(tick, 60); S.wake(true); ctx.main("Beenden", true); }, function (e) { ctx.alert(e.message); });
    }
    function stop() {
      if (!on) return; on = false; clearInterval(iv); AUD.stop(); A = null; S.wake(false); ctx.main("Messung starten", false);
      var r = analyze(); if (r) { res = r; ctx.save(res); ctx.big("f₁ / f₂", f(r.f1, 1) + " / " + f(r.f2, 1), "Hz", "Annähern / Entfernen"); ctx.plot({ series: [{ xs: r.track.xs, ys: r.track.ys, dots: true, r: 1.8 }], vlines: isFinite(r.tc) ? [{ x: r.tc }] : [], hline: [{ y: r.f1 }, { y: r.f2 }], xlab: "s", ylab: "Hz" }); ctx.status("g", "Vorbeifahrt ausgewertet."); }
      else ctx.status("r", "Zu wenige Messpunkte des Tons.");
    }
    if (res) { ctx.big("f₁ / f₂", f(res.f1, 1) + " / " + f(res.f2, 1), "Hz", "gespeicherte Messung"); ctx.plot({ series: [{ xs: res.track.xs, ys: res.track.ys, dots: true, r: 1.8 }], hline: [{ y: res.f1 }, { y: res.f2 }], xlab: "s", ylab: "Hz" }); }
    else ctx.big("Frequenz", "–", "Hz", "Tonquelle auf dem zweiten Gerät einschalten");
    return { toggle: function () { if (on) stop(); else start(); }, stop: stop, reset: function () { stop(); res = null; tr = []; ctx.plot({ series: [] }); ctx.big("Frequenz", "–", "Hz", ""); ctx.status("", ""); }, data: function () { return res; } };
  };

  /* ---------- 10 Abstandsgesetz ---------- */
  R.level = function (ctx) {
    var pts = ctx.prev ? ctx.prev.points.slice() : [], on = false, un = null, live = [], t0 = 0, cur = NaN, meas = null;
    var D = [0.5, 1, 2, 4];
    ctx.extra.innerHTML = '<div class="lb-list" data-k="list"></div>';
    var list = ctx.extra.querySelector('[data-k="list"]');
    function val(d) { for (var i = 0; i < pts.length; i++) if (pts[i].d === d) return pts[i].db; return NaN; }
    function renderList() {
      list.innerHTML = D.map(function (d) { var v = val(d), busy = meas && meas.d === d; return '<div class="lb-li"><span>' + f(d, d < 1 ? 1 : 0) + ' m' + (d === 4 ? ' (optional)' : '') + '</span><b>' + (busy ? "misst …" : isFinite(v) ? f(v, 1) + " dB" : "–") + '</b><button type="button" class="chip" data-m="' + d + '"' + (meas ? " disabled" : "") + '>Messen</button></div>'; }).join("");
    }
    function onChunk(d) {
      var s = 0; for (var i = 0; i < d.length; i++) s += d[i] * d[i];
      var ms = s / d.length; if (ms <= 1e-11 || performance.now() / 1000 - t0 < 0.4) return; cur = 10 * Math.log10(ms);
      var now = performance.now() / 1000 - t0; live.push({ t: now, v: cur }); while (live.length && live[0].t < now - 15) live.shift();
      if (meas) { meas.s += ms; meas.n++; if (performance.now() - meas.t0 > 3000) { var v = 10 * Math.log10(meas.s / meas.n); pts = pts.filter(function (p) { return p.d !== meas.d; }); pts.push({ d: meas.d, db: +v.toFixed(2) }); pts.sort(function (a, b) { return a.d - b.d; }); meas = null; ctx.save({ points: pts }); renderList(); ctx.status("g", "Gespeichert. Nächsten Abstand einnehmen."); } }
    }
    var iv = 0;
    function start() { return AUD.start(2048).then(function () { on = true; t0 = performance.now() / 1000; un = AUD.sub(onChunk); iv = setInterval(draw, 200); S.wake(true); ctx.main("Beenden", true); ctx.status("", "Mikrofon aktiv. Abstand einnehmen und „Messen“ tippen."); }, function (e) { ctx.alert(e.message); }); }
    function stop() { if (!on) return; on = false; if (un) un(); un = null; clearInterval(iv); AUD.stop(); S.wake(false); meas = null; renderList(); ctx.main("Mikrofon starten", false); }
    function draw() { ctx.big("Pegel (relativ)", f(cur, 1), "dB", "bezogen auf den Vollausschlag des Mikrofons"); var n = live.length ? last(live).t : 0; ctx.plot({ series: [{ xs: live.map(function (q) { return q.t - n; }), ys: live.map(function (q) { return q.v; }), w: 1.6 }], xlab: "s", ylab: "dB", minSpan: 10 }); }
    list.addEventListener("click", function (e) {
      var b = e.target.closest("[data-m]"); if (!b || meas) return;
      var d = +b.getAttribute("data-m"), go = function () { meas = { d: d, s: 0, n: 0, t0: performance.now() }; renderList(); ctx.status("", "Messe 3 Sekunden bei " + f(d, d < 1 ? 1 : 0) + " m – ruhig halten."); };
      if (on) go(); else start().then(function () { if (on) go(); });
    });
    renderList(); ctx.big("Pegel (relativ)", "–", "dB", "Mikrofon starten"); ctx.main("Mikrofon starten", false);
    return { toggle: function () { if (on) stop(); else start(); }, stop: stop, reset: function () { stop(); pts = []; renderList(); ctx.status("", ""); }, data: function () { return pts.length ? { points: pts } : null; } };
  };

  /* ---------- 11 Nachhallzeit ---------- */
  R.reverb = function (ctx) {
    var rts = ctx.prev ? ctx.prev.rts.slice() : [], lastE = ctx.prev ? ctx.prev.last : null, range = ctx.prev ? ctx.prev.range : null;
    ctx.extra.innerHTML = '<div class="lb-list" data-k="list"></div>';
    var list = ctx.extra.querySelector('[data-k="list"]');
    function renderList() { list.innerHTML = rts.length ? rts.map(function (r, i) { return '<div class="lb-li"><span>Impuls ' + (i + 1) + '</span><b>' + f(r, 2) + ' s</b><button type="button" class="icon-btn" data-del="' + i + '" aria-label="Wert löschen">✕</button></div>'; }).join("") : '<p class="muted small">Noch kein Impuls ausgewertet.</p>'; }
    list.addEventListener("click", function (e) { var b = e.target.closest("[data-del]"); if (!b) return; rts.splice(+b.getAttribute("data-del"), 1); renderList(); ctx.save({ rts: rts, last: lastE, range: range }); });
    var c = capture(ctx, {
      post: 2.6, minPeak: 0.1, k: 20, cool: 1800,
      ready: function () { ctx.status("", "Bereit. Einen kurzen, lauten Impuls erzeugen."); },
      trig: function () { ctx.status("", "Impuls erkannt – Abklingen wird aufgezeichnet …"); },
      done: function (buf, sr) {
        var E = C.envelope(buf, sr, 2), r = C.reverb(E.env, E.step), sh = shrink(E.env, E.step, 700);
        lastE = { env: sh.env, step: sh.step };
        if (r && r.ok) { rts.push(+r.rt60.toFixed(3)); range = r.range; renderList(); ctx.big("Nachhallzeit T60", f(r.rt60, 2), "s", "aus dem Abfall von −" + r.range[0] + " bis −" + r.range[1] + " dB · Dynamik " + f(r.span, 0) + " dB"); ctx.status("g", "Ausgewertet. Für den Mittelwert insgesamt 3 Impulse."); }
        else ctx.status("y", "Impuls zu leise gegenüber dem Grundgeräusch (" + (r ? f(r.span, 0) : "–") + " dB Dynamik, nötig sind mindestens 18 dB).");
        envPlot(ctx, lastE, { db: true }); ctx.save({ rts: rts, last: lastE, range: range });
      }
    });
    renderList(); envPlot(ctx, lastE, { db: true });
    ctx.big("Nachhallzeit T60", rts.length ? f(C.mean(rts), 2) : "–", "s", rts.length ? "Mittel aus " + rts.length + " Impulsen" : "Mikrofon starten, dann Impuls erzeugen");
    ctx.main("Mikrofon starten", false);
    return { toggle: function () { if (c.running()) c.stop(); else c.start(); }, stop: c.stop, reset: function () { c.stop(); rts = []; lastE = null; renderList(); envPlot(ctx, null); ctx.status("", ""); }, data: function () { return rts.length ? { rts: rts, last: lastE, range: range } : null; } };
  };

  /* ---------- 12 Helmholtz-Resonator ---------- */
  R.pitch = function (ctx) {
    var pts = ctx.prev ? ctx.prev.points.slice() : [], on = false, iv = 0, A = null, buf = null, hist = [], tr = [], t0 = 0, stable = NaN;
    ctx.extra.innerHTML = '<button type="button" class="cta slim" data-k="take" disabled>Wert übernehmen</button><div class="lb-list" data-k="list"></div>';
    var list = ctx.extra.querySelector('[data-k="list"]'), take = ctx.extra.querySelector('[data-k="take"]');
    function renderList() { list.innerHTML = pts.length ? pts.map(function (p, i) { return '<div class="lb-li"><span>h = ' + f(p.h, 1) + ' cm</span><b>' + f(p.f, 1) + ' Hz</b><button type="button" class="icon-btn" data-del="' + i + '" aria-label="Wert löschen">✕</button></div>'; }).join("") : '<p class="muted small">Noch keine Tonhöhe übernommen.</p>'; }
    list.addEventListener("click", function (e) { var b = e.target.closest("[data-del]"); if (!b) return; pts.splice(+b.getAttribute("data-del"), 1); renderList(); ctx.save({ points: pts }); });
    take.addEventListener("click", function () { if (!isFinite(stable)) return; var h = ctx.p().h; pts = pts.filter(function (p) { return p.h !== h; }); pts.push({ h: h, f: +stable.toFixed(2) }); pts.sort(function (a, b) { return b.h - a.h; }); renderList(); ctx.save({ points: pts }); ctx.toast("Übernommen: h = " + f(h, 1) + " cm → " + f(stable, 1) + " Hz. Füllstand ändern und h anpassen."); });
    function tick() {
      if (!A) return;
      if (!buf || buf.length !== A.an.fftSize) buf = new Float32Array(A.an.fftSize);
      A.an.getFloatTimeDomainData(buf);
      var r = C.yin(buf, A.sr, 70, 1500), now = performance.now() / 1000 - t0;
      if (r && r.q > 0.8) { hist.push(r.f); tr.push({ t: now, f: r.f }); } else hist.push(NaN);
      if (hist.length > 12) hist.shift(); while (tr.length && tr[0].t < now - 10) tr.shift();
      var ok = hist.filter(isFinite), md = ok.length ? C.median(ok) : NaN;
      stable = ok.length >= 8 && ok.every(function (x) { return Math.abs(x - md) / md < 0.01; }) ? md : NaN;
      take.disabled = !isFinite(stable);
      ctx.big("Tonhöhe", isFinite(md) ? f(isFinite(stable) ? stable : md, 1) : "–", "Hz", isFinite(stable) ? "stabil – jetzt übernehmen (h = " + f(ctx.p().h, 1) + " cm)" : isFinite(md) ? "noch nicht stabil" : "gleichmäßig über die Öffnung blasen");
      ctx.plot({ series: [{ xs: tr.map(function (q) { return q.t - now; }), ys: tr.map(function (q) { return q.f; }), dots: true, r: 1.8 }], xlab: "s", ylab: "Hz", minSpan: 20 });
    }
    function start() { AUD.start(4096).then(function (a) { A = a; on = true; t0 = performance.now() / 1000; hist = []; tr = []; iv = setInterval(tick, 50); S.wake(true); ctx.main("Beenden", true); ctx.status("", "Ton erzeugen. Sobald er stabil ist, „Wert übernehmen“ tippen."); }, function (e) { ctx.alert(e.message); }); }
    function stop() { if (!on) return; on = false; clearInterval(iv); AUD.stop(); A = null; S.wake(false); take.disabled = true; ctx.main("Mikrofon starten", false); }
    renderList(); ctx.big("Tonhöhe", "–", "Hz", "Mikrofon starten"); ctx.main("Mikrofon starten", false);
    return { toggle: function () { if (on) stop(); else start(); }, stop: stop, reset: function () { stop(); pts = []; renderList(); ctx.status("", ""); }, data: function () { return pts.length ? { points: pts } : null; } };
  };

  /* ---------- 13 + 15 Schattenmessungen (Breite, wahrer Mittag) ---------- */
  function shadowForm(ctx, mode) {
    var d = ctx.prev ? JSON.parse(JSON.stringify(ctx.prev)) : { pts: [] }, touched = false;
    ctx.main(null);
    ctx.extra.innerHTML =
      '<div class="lb-form"><div class="field"><label for="lbShT">Uhrzeit<span class="hint">wird beim Öffnen auf jetzt gesetzt</span></label><input class="num-input" id="lbShT" type="time" step="60"></div>' +
      '<div class="field"><label for="lbShL">Schattenlänge L<span class="hint">Stabfuß bis Schattenende</span></label><span><input class="num-input" id="lbShL" type="text" inputmode="decimal" placeholder="z. B. 74,5"> <span class="muted">cm</span></span></div>' +
      '<button type="button" class="cta primary slim" data-k="add">Messung eintragen</button></div>' +
      '<div class="lb-list" data-k="list"></div>' +
      '<div class="lb-loc" data-k="loc"></div>';
    var tIn = ctx.extra.querySelector("#lbShT"), lIn = ctx.extra.querySelector("#lbShL"), list = ctx.extra.querySelector('[data-k="list"]'), loc = ctx.extra.querySelector('[data-k="loc"]');
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function setNow() { if (touched) return; var n = new Date(); tIn.value = pad(n.getHours()) + ":" + pad(n.getMinutes()); }
    tIn.addEventListener("input", function () { touched = true; });
    setNow(); var clk = setInterval(setNow, 15000);
    function num(s) { var n = parseFloat(String(s || "").replace(",", ".")); return isFinite(n) ? n : NaN; }
    function render() {
      var H = ctx.p().H, pts = d.pts.slice().sort(function (a, b) { return a.ms - b.ms; });
      list.innerHTML = pts.length ? pts.map(function (p) { return '<div class="lb-li"><span>' + clock(p.ms) + ' Uhr</span><b>L = ' + f(p.L, 1) + " cm · h = " + f(C.stickElevation(H, p.L), 2) + '°</b><button type="button" class="icon-btn" data-del="' + p.ms + '" aria-label="Messung löschen">✕</button></div>'; }).join("") : '<p class="muted small">Noch keine Messung eingetragen.</p>';
      var noonTxt = "";
      if (isFinite(d.lon)) { var so = C.solar(Date.now()), nm = 720 - 4 * d.lon - so.eqt, dd = new Date(); dd.setUTCHours(0, 0, 0, 0); noonTxt = " · wahrer Mittag heute ca. " + clock(dd.getTime() + nm * 6e4) + " Uhr"; }
      loc.innerHTML = isFinite(d.lat) ? '<p class="muted small">Vergleichsstandort: ' + f(d.lat, 2) + "° N, " + f(d.lon, 2) + "° O – nur in diesem Versuch gespeichert" + noonTxt + '. <button type="button" class="link-btn" data-k="unloc">Entfernen</button></p>' : '<button type="button" class="cta slim" data-k="loc">Standort zum Vergleich verwenden (optional)</button><p class="muted small">Ohne Standort wird nur dein eigenes Messergebnis berechnet.</p>';
      if (pts.length) {
        var xs = pts.map(function (p) { return (p.ms - pts[0].ms) / 36e5; }), ys = pts.map(function (p) { return p.L; }), ser = [{ xs: xs, ys: ys, dots: true, r: 3.2 }], vl = [];
        if (mode === "noon" && pts.length >= 3) { var nf = C.noonFit(pts); if (nf) { var x0 = (nf.ms - pts[0].ms) / 36e5, fx = [], fy = [], lo = Math.min(xs[0], x0) - 0.2, hi = Math.max(last(xs), x0) + 0.2; for (var i = 0; i <= 40; i++) { var x = lo + (hi - lo) * i / 40, u = (pts[0].ms + x * 36e5 - nf.t0) / 36e5; fx.push(x); fy.push(nf.a * u * u + nf.b * u + nf.c); } vl.push({ x: x0 }); ser.push({ xs: fx, ys: fy, w: 1.5, dash: [5, 4] }); ctx.big("Wahrer Mittag (vorläufig)", clock(nf.ms), "Uhr", nf.both ? "Messpunkte auf beiden Seiten" : "noch Messpunkte auf der anderen Seite des Mittags nötig"); } }
        ctx.plot({ series: ser, vlines: vl, xlab: "Stunden ab " + clock(pts[0].ms), ylab: "L in cm", xfmt: function (v) { return clock(pts[0].ms + v * 36e5); } });
        if (mode === "shadow") { var best = pts.reduce(function (a, b) { return b.L < a.L ? b : a; }); ctx.big("Größte Sonnenhöhe", f(C.stickElevation(H, best.L), 2), "°", "kürzester Schatten " + f(best.L, 1) + " cm um " + clock(best.ms) + " Uhr"); }
      } else { ctx.plot({ series: [] }); ctx.big(mode === "noon" ? "Wahrer Mittag" : "Sonnenhöhe", "–", mode === "noon" ? "Uhr" : "°", "Schattenlänge eintragen"); }
      ctx.status(pts.length >= (mode === "noon" ? 4 : 3) ? "g" : "", mode === "noon" ? (pts.length < 4 ? "Mindestens 4 Messungen, je zwei vor und nach dem Mittag." : "Auswertung möglich.") : (pts.length < 3 ? "Für die Mittagshöhe mehrere Messungen um den Mittag." : "Auswertung möglich – der kürzeste Schatten zählt."));
    }
    ctx.extra.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.getAttribute("data-k") === "add") {
        var L = num(lIn.value), tv = tIn.value.split(":");
        if (!(L > 0)) { ctx.toast("Bitte eine Schattenlänge eingeben."); return; }
        var dt = new Date(); dt.setHours(+tv[0] || 0, +tv[1] || 0, 0, 0);
        d.pts = d.pts.filter(function (p) { return p.ms !== dt.getTime(); }); d.pts.push({ ms: dt.getTime(), L: L }); lIn.value = ""; touched = false; setNow(); ctx.save(d); render();
      } else if (b.getAttribute("data-del")) { var ms = +b.getAttribute("data-del"); d.pts = d.pts.filter(function (p) { return p.ms !== ms; }); ctx.save(d); render(); }
      else if (b.getAttribute("data-k") === "loc") { S.locate().then(function (p) { d.lat = p.lat; d.lon = p.lon; ctx.save(d); render(); }, function (err) { ctx.alert(err.message); }); }
      else if (b.getAttribute("data-k") === "unloc") { delete d.lat; delete d.lon; ctx.save(d); render(); }
    });
    render();
    return { toggle: function () { }, stop: function () { }, reset: function () { d = { pts: [] }; ctx.save(d); render(); }, data: function () { return d.pts.length ? d : null; }, inputChanged: render, destroy: function () { clearInterval(clk); } };
  }
  R.shadow = function (ctx) { return shadowForm(ctx, "shadow"); };
  R.noon = function (ctx) { return shadowForm(ctx, "noon"); };

  /* ---------- 14 Eratosthenes ---------- */
  R.eratos = function (ctx) {
    var d = ctx.prev ? JSON.parse(JSON.stringify(ctx.prev)) : {};
    ctx.main(null); ctx.hideChart();
    function iso(ms) { var x = new Date(ms); return x.getFullYear() + "-" + ("0" + (x.getMonth() + 1)).slice(-2) + "-" + ("0" + x.getDate()).slice(-2); }
    function part(k, title) {
      var v = d[k] || {};
      return '<div class="lb-sub"><h3>' + title + '</h3>' +
        '<div class="field"><label for="lbE' + k + 'd">Datum</label><input class="num-input wide" id="lbE' + k + 'd" type="date" value="' + (v.ms ? iso(v.ms) : iso(Date.now())) + '"></div>' +
        '<div class="field"><label for="lbE' + k + 'H">Stablänge H</label><span><input class="num-input" id="lbE' + k + 'H" type="text" inputmode="decimal" value="' + de(v.H) + '" placeholder="100"> <span class="muted">cm</span></span></div>' +
        '<div class="field"><label for="lbE' + k + 'L">Kürzester Schatten L</label><span><input class="num-input" id="lbE' + k + 'L" type="text" inputmode="decimal" value="' + de(v.L) + '" placeholder="z. B. 58,2"> <span class="muted">cm</span></span></div></div>';
    }
    function draw() {
      ctx.extra.innerHTML = part("A", "Messung A – nördlicher Ort") + part("B", "Messung B – südlicher Ort") +
        '<div class="field"><label for="lbEd">Nord-Süd-Abstand<span class="hint">nur die Nord-Süd-Komponente</span></label><span><input class="num-input" id="lbEd" type="text" inputmode="decimal" value="' + de(d.dist) + '" placeholder="z. B. 600"> <span class="muted">km</span></span></div>' +
        '<div class="btn-row"><button type="button" class="cta slim" data-k="ex">Beispielwerte laden</button></div>' + (d.example ? '<p class="muted small">Beispiel: Hamburg und München am 21. Juni (berechnete Schattenlängen). Ein so ermitteltes Ergebnis wird im Protokoll als Beispiel gekennzeichnet.</p>' : "");
      show();
    }
    function num(s) { s = String(s || "").trim(); if (s.indexOf(",") >= 0) s = s.replace(/\./g, "").replace(",", "."); var n = parseFloat(s); return isFinite(n) ? n : NaN; }
    function de(v) { return v == null || !isFinite(v) ? "" : String(+v.toFixed(2)).replace(".", ","); }
    function read() {
      ["A", "B"].forEach(function (k) {
        var ds = ctx.extra.querySelector("#lbE" + k + "d").value, p = ds.split("-"), ms = p.length === 3 ? new Date(+p[0], +p[1] - 1, +p[2], 12).getTime() : Date.now();
        d[k] = { ms: ms, H: num(ctx.extra.querySelector("#lbE" + k + "H").value), L: num(ctx.extra.querySelector("#lbE" + k + "L").value) };
      });
      d.dist = num(ctx.extra.querySelector("#lbEd").value);
    }
    function ok() { return d.A && d.B && d.A.H > 0 && d.A.L > 0 && d.B.H > 0 && d.B.L > 0 && d.dist > 0; }
    function show() {
      if (ok()) { var E = C.eratosthenes(d.A, d.B, d.dist); ctx.big("Winkelunterschied Δφ", f(E.dphi, 2), "°", isFinite(E.U) ? "Erdumfang daraus ≈ " + f(E.U, 0) + " km" : "zu kleiner Unterschied"); ctx.status("g", "Auswertung möglich."); }
      else { ctx.big("Winkelunterschied Δφ", "–", "°", "beide Messungen und den Abstand eintragen"); ctx.status("", ""); }
    }
    ctx.extra.addEventListener("input", function () { read(); d.example = false; ctx.save(d); show(); });
    ctx.extra.addEventListener("click", function (e) {
      if (!e.target.closest('[data-k="ex"]')) return;
      var ms = new Date(2026, 5, 21, 12).getTime(), base = Date.UTC(2026, 5, 21);
      function L(lat, lon) { var best = 0; for (var k = 600; k < 840; k++) best = Math.max(best, C.sunElevation(base + k * 6e4, lat, lon)); return +(100 / Math.tan(best * RAD)).toFixed(1); }
      d = { A: { ms: ms, H: 100, L: L(53.55, 10.0) }, B: { ms: ms, H: 100, L: L(48.14, 11.58) }, dist: 602, example: true };
      ctx.save(d); draw();
    });
    draw();
    return { toggle: function () { }, stop: function () { }, reset: function () { d = {}; ctx.save(d); draw(); }, data: function () { return ok() ? d : null; } };
  };

  /* ---------- 16 Reaktionszeit ---------- */
  R.reaction = function (ctx) {
    var d = ctx.prev ? JSON.parse(JSON.stringify(ctx.prev)) : { vis: [], aud: [], early: 0 }, mode = null, phase = "idle", timer = 0, t0 = 0, N = 5;
    ctx.main(null);
    ctx.extra.innerHTML = '<div class="lb-pad" data-k="pad" role="button" tabindex="0" aria-live="polite">Teil wählen</div><div class="btn-row"><button type="button" class="cta slim" data-k="vis">Teil 1: Licht</button><button type="button" class="cta slim" data-k="aud">Teil 2: Ton</button></div>';
    var pad = ctx.extra.querySelector('[data-k="pad"]');
    function arr() { return mode === "aud" ? d.aud : d.vis; }
    function info() {
      ctx.big("Reaktionszeit", arr().length ? f(last(arr()), 0) : "–", "ms", "Licht " + d.vis.length + "/" + N + (d.vis.length ? " · Median " + f(C.median(d.vis), 0) + " ms" : "") + " · Ton " + d.aud.length + "/" + N + (d.aud.length ? " · Median " + f(C.median(d.aud), 0) + " ms" : ""));
      ctx.plot({ series: [{ xs: d.vis.map(function (_, i) { return i + 1; }), ys: d.vis, dots: true, r: 4 }, { xs: d.aud.map(function (_, i) { return i + 1; }), ys: d.aud, dots: true, r: 4 }], xr: [0.5, N + 0.5], xlab: "Durchgang (violett: Licht, blau: Ton)", ylab: "ms", minSpan: 100 });
    }
    function setPad(cls, txt) { pad.className = "lb-pad" + (cls ? " " + cls : ""); pad.textContent = txt; }
    function next() {
      if (arr().length >= N) { phase = "idle"; mode = null; setPad("", "Teil abgeschlossen. " + (d.vis.length >= N && d.aud.length >= N ? "Weiter zur Auswertung." : "Nächsten Teil wählen.")); ctx.save(d); ctx.status("g", "Teil abgeschlossen."); return; }
      phase = "wait"; setPad("wait", mode === "aud" ? "Warten … (Augen zu, auf den Ton achten)" : "Warten …");
      var delay = 1500 + Math.random() * 2500;
      if (mode === "vis") timer = setTimeout(function () { setPad("go", "JETZT tippen"); requestAnimationFrame(function (ts) { t0 = ts; phase = "go"; }); }, delay);
      else { t0 = AUD.beep(1000, 0.12, delay / 1000, 0.4); timer = setTimeout(function () { phase = "go"; }, Math.max(0, t0 - performance.now())); }
    }
    function startMode(m) { clearTimeout(timer); try { AUD.ctx(); } catch (e) { } mode = m; if (m === "vis") d.vis = []; else d.aud = []; ctx.status("", m === "vis" ? "Tippe, sobald die Fläche aufleuchtet." : "Tippe, sobald der Ton erklingt."); info(); next(); }
    pad.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      if (!mode) return;
      var now = e.timeStamp || performance.now();
      if (phase === "idle") { next(); return; }
      if (phase === "wait" || now < t0) { clearTimeout(timer); d.early++; phase = "idle"; setPad("early", "Zu früh! Tippen, um den Durchgang zu wiederholen."); return; }
      if (phase === "go") {
        var rt = now - t0;
        if (rt < 100) { d.early++; phase = "idle"; setPad("early", "Unter 100 ms – als Frühstart gewertet. Tippen zum Wiederholen."); return; }
        arr().push(Math.round(rt)); phase = "res"; setPad("res", f(rt, 0) + " ms"); info(); ctx.save(d);
        timer = setTimeout(next, 1100);
      }
    });
    ctx.extra.addEventListener("click", function (e) { var b = e.target.closest("[data-k=vis],[data-k=aud]"); if (b) startMode(b.getAttribute("data-k")); });
    info();
    return { toggle: function () { }, stop: function () { clearTimeout(timer); mode = null; phase = "idle"; }, reset: function () { clearTimeout(timer); d = { vis: [], aud: [], early: 0 }; mode = null; setPad("", "Teil wählen"); info(); ctx.save(d); }, data: function () { return d.vis.length || d.aud.length ? d : null; }, destroy: function () { clearTimeout(timer); } };
  };

  /* ---------- 17 Ganganalyse ---------- */
  R.steps = function (ctx) {
    var rec, res = ctx.prev || null;
    var m = motion(ctx, {
      begin: function () { rec = { t: [], m: [] }; res = null; ctx.status("", "Losgehen. Am Ziel stehen bleiben und beenden."); },
      sample: function (s) { rec.t.push(s.t); rec.m.push(Math.hypot(s.ax, s.ay, s.az)); },
      every: 500,
      tick: function () {
        if (rec.t.length < 30) return;
        var sc = C.stepCount(rec.t, rec.m), i0 = since(rec.t, 8), t1 = last(rec.t);
        ctx.big("Schritte", String(sc.n), "", "Dauer " + f(t1 - rec.t[0], 1) + " s");
        ctx.plot({ series: [{ xs: rec.t.slice(i0).map(function (x) { return x - t1; }), ys: rec.m.slice(i0), w: 1.5 }], marks: sc.list.filter(function (p) { return p.t >= rec.t[i0]; }).map(function (p) { return p.t - t1; }), xlab: "s", ylab: "|a| in m/s²", minSpan: 2 });
      },
      end: function () {
        if (!rec || rec.t.length < 60) { ctx.status("r", "Zu kurz für eine Auswertung."); return; }
        var sc = C.stepCount(rec.t, rec.m), n = sc.n, T = n > 1 ? (last(sc.list).t - sc.list[0].t) * n / (n - 1) : NaN, ts = rel(rec.t), th = S.thin(ts, rec.m, 500);
        res = { n: n, T: T, ts: th.xs, gs: th.ys, marks: sc.list.slice(0, 300).map(function (p) { return +(p.t - rec.t[0]).toFixed(3); }) };
        ctx.big("Schritte", String(n), "", "Gehdauer " + f(T, 1) + " s"); ctx.status("g", "Messung abgeschlossen."); ctx.save(res);
      }
    });
    if (res) ctx.big("Schritte", String(res.n), "", "gespeicherte Messung · " + f(res.T, 1) + " s"); else ctx.big("Schritte", "–", "", "Am Startpunkt Messung starten");
    return { toggle: function () { if (m.running()) m.stop(); else m.start(); }, stop: m.stop, reset: function () { m.stop(); res = null; ctx.big("Schritte", "–", "", ""); ctx.plot({ series: [] }); ctx.status("", ""); }, data: function () { return res; } };
  };

  /* ---------- 18 Gleichgewicht ---------- */
  R.balance = function (ctx) {
    var d = ctx.prev ? JSON.parse(JSON.stringify(ctx.prev)) : {}, part = null, rec = null, un = null, iv = 0, tm = [], tStart = 0, DUR = 20;
    ctx.main(null);
    ctx.extra.innerHTML = '<div class="btn-row"><button type="button" class="cta slim" data-k="open">Teil 1: Augen offen</button><button type="button" class="cta slim" data-k="closed">Teil 2: Augen zu</button></div><div class="lb-list" data-k="list"></div>';
    var list = ctx.extra.querySelector('[data-k="list"]');
    function renderList() { list.innerHTML = '<div class="lb-li"><span>Augen offen</span><b>' + (isFinite(d.open) ? f(d.open * 1000 / G, 1) + " mg" : "–") + '</b></div><div class="lb-li"><span>Augen zu</span><b>' + (isFinite(d.closed) ? f(d.closed * 1000 / G, 1) + " mg" : "–") + "</b></div>"; }
    function cleanup() { tm.forEach(clearTimeout); tm = []; clearInterval(iv); if (un) un(); un = null; S.wake(false); }
    function run(k) {
      cleanup(); part = k;
      MOT.permit().then(function () {
        try { AUD.ctx(); } catch (e) { }
        rec = { t: [], x: [], y: [], z: [] }; S.wake(true);
        ctx.status("", "Position einnehmen: auf einem Bein stehen" + (k === "closed" ? ", Augen schließen" : "") + ". Start nach drei Signaltönen.");
        [0, 1, 2].forEach(function (i) { AUD.beep(660, 0.1, i, 0.3); });
        AUD.beep(990, 0.25, 3, 0.35);
        tm.push(setTimeout(function () {
          tStart = performance.now(); un = MOT.sub(function (s) { rec.t.push(s.t); rec.x.push(s.ax); rec.y.push(s.ay); rec.z.push(s.az); });
          iv = setInterval(function () {
            var el = (performance.now() - tStart) / 1000;
            ctx.big("Messung läuft", f(Math.max(0, DUR - el), 0), "s", k === "closed" ? "Augen geschlossen halten" : "ruhig stehen");
            if (rec.t.length > 30) { var i0 = since(rec.t, 10), t1 = last(rec.t), xs = [], ys = []; for (var i = i0; i < rec.t.length; i++) { xs.push(rec.t[i] - t1); ys.push(Math.hypot(rec.x[i], rec.y[i], rec.z[i]) - G); } ctx.plot({ series: [{ xs: xs, ys: ys, w: 1.4 }], xlab: "s", ylab: "|a| − g in m/s²", minSpan: 0.3 }); }
          }, 250);
          tm.push(setTimeout(function () {
            cleanup(); AUD.beep(520, 0.5, 0, 0.35);
            if (!MOT.seen() || rec.t.length < 60) { ctx.status("r", NOSENS); return; }
            d[k] = C.sway(rec.t, rec.x, rec.y, rec.z); ctx.save(d); renderList();
            ctx.big("Schwankung " + (k === "closed" ? "(Augen zu)" : "(Augen offen)"), f(d[k] * 1000 / G, 1), "mg", "Effektivwert über " + DUR + " s");
            ctx.status("g", k === "open" ? "Teil 1 fertig. Jetzt Teil 2 mit geschlossenen Augen." : "Teil 2 fertig. Weiter zur Auswertung.");
          }, DUR * 1000));
        }, 3000));
      }, function (e) { ctx.alert(e.message); });
    }
    ctx.extra.addEventListener("click", function (e) { var b = e.target.closest("[data-k=open],[data-k=closed]"); if (b) run(b.getAttribute("data-k")); });
    renderList(); ctx.big("Schwankung", "–", "mg", "Teil 1 starten");
    return { toggle: function () { }, stop: cleanup, reset: function () { cleanup(); d = {}; renderList(); ctx.save(d); ctx.status("", ""); }, data: function () { return isFinite(d.open) ? d : null; }, destroy: cleanup };
  };

  global.LBRun = R;
  global.LBRunUtil = { esc: esc };
})(window);
