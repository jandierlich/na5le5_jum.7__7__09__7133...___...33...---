/* ============================================================
   hw-insights.js — „Heute lohnt sich …“
   Wertet die bereits geladene Open-Meteo-Vorhersage zusammen mit
   den lokal berechneten Sonnen-, Mond- und Planetenpositionen aus
   und formuliert daraus kurze, konkrete Hinweise:
     · Sternenhimmel heute Nacht   · Regenbogen-Chance
     · Frost, Bodenfrost, Tau und Nebel
   Reine Rechenfunktionen ohne Seitenzugriff – genutzt von
   HimmelsWahr (hw-index.html) und der „Heute“-Karte des Hubs.
   Benötigt hw-astro.js. Keine zusätzlichen Datenquellen.
   Wetterdaten: Open-Meteo.com (CC BY 4.0).
   © 2026 Jan Dierlich – Alle Rechte vorbehalten.
   ============================================================ */
(function (global) {
  "use strict";

  /* Stündliche Werte, die die Hinweise brauchen (für die Abfrage bei Open-Meteo) */
  var HOURLY = "temperature_2m,apparent_temperature,dew_point_2m,precipitation_probability,precipitation,weather_code,cloud_cover,cloud_cover_low,wind_speed_10m,wind_gusts_10m,direct_radiation";

  function clamp01(x) { return Math.max(0, Math.min(1, x)); }
  function realMs(iso, off) { return off == null ? new Date(iso).getTime() : Date.parse(iso + "Z") - off * 1000; }
  function local(ms, off) { return new Date(ms + off * 1000); }
  function hh(ms, off) { var d = local(ms, off); return ("0" + d.getUTCHours()).slice(-2) + ":" + ("0" + d.getUTCMinutes()).slice(-2); }
  function hour(ms, off) { return local(ms, off).getUTCHours(); }
  function dayKey(ms, off) { var d = local(ms, off); return d.getUTCFullYear() * 400 + d.getUTCMonth() * 31 + d.getUTCDate(); }
  function num(a, k) { return a && a[k] != null && isFinite(a[k]) ? +a[k] : null; }
  function deg(v) { return Math.round(v) === 0 ? "0" : String(Math.round(v)).replace("-", "−"); }
  function bortle() { try { var b = parseInt(localStorage.getItem("hw-bortle"), 10); if (b >= 1 && b <= 9) return b; } catch (e) { } return 5; }

  /* Gleiche Formel wie die Nachtbewertung im Nachthimmel (hw-sky.js), damit beide Stellen übereinstimmen */
  function nightQuality(cloud, sunAlt, moonAlt, moonIllum, b) {
    if (sunAlt > -12) return null;
    var cloudF = 1 - Math.pow(clamp01(cloud / 100), 0.8);
    var moonPen = moonAlt > 0 ? (moonIllum / 100) * clamp01((moonAlt + 3) / 25) * 0.55 : 0;
    var twiPen = sunAlt > -18 ? (sunAlt + 18) / 6 * 0.25 : 0;
    var bortlePen = (b - 1) / 8 * 0.5;
    return Math.round(100 * cloudF * (1 - moonPen) * (1 - twiPen) * (1 - bortlePen));
  }
  function nightClass(q) { return q >= 65 ? "gruen" : (q >= 35 ? "gelb" : "rot"); }

  /* Vorbereitung: Stunden ab der aktuellen Stunde */
  function prep(data, nowMs) {
    var h = data && data.hourly, off = data ? data.utc_offset_seconds : null;
    if (!h || !h.time || !h.time.length) return null;
    if (off == null) off = -new Date().getTimezoneOffset() * 60;
    var i0 = 0;
    for (var i = 0; i < h.time.length; i++) { if (realMs(h.time[i], off) <= nowMs) i0 = i; else break; }
    return { h: h, off: off, i0: i0, n: h.time.length, t: function (k) { return realMs(h.time[k], off); } };
  }

  /* ---------- 1. Sternenhimmel heute Nacht ---------- */
  function stars(P, lat, lon, nowMs) {
    var hNow = hour(nowMs, P.off);
    if (hNow >= 6 && hNow < 12) return null; // vormittags noch nicht relevant
    var b = bortle(), slots = [], started = false;
    for (var k = P.i0; k < Math.min(P.n, P.i0 + 30); k++) {
      var t0 = P.t(k), mid = Math.max(t0 + 1800000, nowMs), cloud = num(P.h.cloud_cover, k);
      if (cloud == null) continue;
      var d = new Date(mid);
      var sun = hwSunPosition(d, lat, lon).altitude;
      var q = nightQuality(cloud, sun, hwMoonPosition(d, lat, lon).altitude, hwMoonPhase(d).illumination, b);
      if (q == null) { if (started) break; continue; }
      started = true;
      slots.push({ ms: t0, q: q, cloud: cloud });
    }
    if (!slots.length) return null;
    var best = null;
    for (var i = 0; i < slots.length; i++) {
      var v = i + 1 < slots.length ? (slots[i].q + slots[i + 1].q) / 2 : slots[i].q;
      var to = slots[Math.min(i + 1, slots.length - 1)].ms + 3600000;
      if (!best || v > best.q) best = { from: Math.max(slots[i].ms, nowMs), to: to, q: Math.round(v) };
    }
    var cls = nightClass(best.q), text, prio;
    var planets = [];
    try {
      planets = hwVisiblePlanets(best.from, best.to, lat, lon, -6).filter(function (p) { return p.nakedEye && p.name !== "Mond"; })
        .sort(function (a, b2) { return b2.peakAlt - a.peakAlt; }).slice(0, 3)
        .map(function (p) { return p.name + " im " + hwCompassWord(p.peakAz); });
    } catch (e) { }
    var win = hh(best.from, P.off) + "–" + hh(best.to, P.off) + " Uhr";
    if (cls === "gruen") { text = "Klare, dunkle Stunden: " + win + "."; prio = 80; }
    else if (cls === "gelb") { text = "Mit etwas Glück Lücken: am ehesten " + win + "."; prio = 40; }
    else { text = "Heute Nacht kaum Sterne – zu viele Wolken oder zu helles Mondlicht."; prio = 12; planets = []; }
    if (planets.length) text += " " + planets.join(", ") + ".";
    return {
      id: "sterne", icon: "star", stufe: cls, prio: prio, href: "./hw-nachthimmel.html",
      title: cls === "rot" ? "Sternenhimmel heute Nacht" : "Sternenhimmel heute Nacht · " + best.q + "/100",
      text: text,
      why: "Bewertet wird jede Nachtstunde nach Wolken, Mondlicht (nur wenn der Mond über dem Horizont steht), Restdämmerung und Lichtverschmutzung deines Ortes. " +
        "Die Lichtverschmutzung stellst du im Nachthimmel ein (aktuell Stufe " + b + " von 9). 65 Punkte und mehr bedeuten gute Sicht, unter 35 schlechte."
    };
  }

  /* ---------- 2. Regenbogen ---------- */
  function rainbow(P, lat, lon, nowMs) {
    var hit = null;
    for (var k = P.i0; k < Math.min(P.n, P.i0 + 14); k++) {
      var t0 = P.t(k); if (t0 + 3600000 <= nowMs) continue;
      if (dayKey(t0, P.off) !== dayKey(nowMs, P.off)) break; // nur heute
      var mid = Math.max(t0 + 1800000, nowMs), sp = hwSunPosition(new Date(mid), lat, lon);
      var rad = num(P.h.direct_radiation, k), pp = num(P.h.precipitation_probability, k), pr = num(P.h.precipitation, k);
      var code = num(P.h.weather_code, k), low = num(P.h.cloud_cover_low, k);
      if (rad == null || pp == null) continue;
      var showery = (pr != null && pr >= 0.1) || [51, 53, 55, 61, 63, 80, 81, 82, 95].indexOf(code) !== -1;
      var ok = sp.altitude >= 3 && sp.altitude <= 40 && rad >= 120 && pp >= 35 && showery && (low == null || low < 90);
      if (ok) {
        if (!hit) hit = { from: Math.max(t0, nowMs), to: t0 + 3600000, az: sp.azimuth, alt: sp.altitude, pp: pp };
        else if (t0 <= hit.to) hit.to = t0 + 3600000;
      } else if (hit) break;
    }
    if (!hit) return null;
    var dir = hwCompassWord(hit.az + 180), top = Math.round(42 - hit.alt);
    return {
      id: "regenbogen", icon: "rainbow", stufe: "gelb", prio: 90, href: "./hw-index.html",
      title: "Regenbogen-Chance " + hh(hit.from, P.off) + "–" + hh(hit.to, P.off) + " Uhr",
      text: "Sonne im Rücken, Blick nach " + dir + ". Der Bogen steht dann bis etwa " + top + "° hoch.",
      why: "Ein Regenbogen entsteht, wenn die Sonne scheint und gleichzeitig auf der gegenüberliegenden Seite Schauer niedergehen. " +
        "Die Sonne muss dafür niedriger als 42° stehen – der Bogen liegt immer genau gegenüber der Sonne. " +
        "Berechnet aus Sonnenstand, direkter Sonnenstrahlung und Schauerwahrscheinlichkeit (" + Math.round(hit.pp) + " %). Es bleibt eine Chance, keine Garantie."
    };
  }

  /* ---------- 3. Frost, Bodenfrost, Tau und Nebel ---------- */
  function frost(P, lat, lon, nowMs) {
    var hNow = hour(nowMs, P.off);
    if (hNow >= 9 && hNow < 14) return null;
    var minT = null, minK = -1, fog = false;
    /* Zeitraum: bis zum nächsten Vormittag 10 Uhr (Ortszeit) */
    var ld = local(nowMs, P.off), endMs = Date.UTC(ld.getUTCFullYear(), ld.getUTCMonth(), ld.getUTCDate(), 10) - P.off * 1000;
    if (hNow >= 9) endMs += 864e5;
    for (var k = P.i0; k < P.n; k++) {
      var t0 = P.t(k);
      if (t0 + 3600000 <= nowMs) continue;
      if (t0 >= endMs) break;
      var tv = num(P.h.temperature_2m, k); if (tv == null) continue;
      if (minT == null || tv < minT) { minT = tv; minK = k; }
      var c = num(P.h.weather_code, k); if (c === 45 || c === 48) fog = true;
    }
    if (minT == null) return null;
    var when = hour(P.t(minK), P.off) + " Uhr";
    var dp = num(P.h.dew_point_2m, minK), wind = num(P.h.wind_speed_10m, minK), cloud = num(P.h.cloud_cover, minK);
    var spread = dp != null ? minT - dp : null;
    var why = "Grundlage ist die tiefste vorhergesagte Lufttemperatur der kommenden Nacht in 2 m Höhe (" + deg(minT) + " °C gegen " + when + ")" +
      (spread != null ? ", der Abstand zum Taupunkt (" + Math.round(spread * 10) / 10 + " °C)" : "") +
      (cloud != null ? " und die Bewölkung (" + Math.round(cloud) + " %)" : "") +
      ". Bei klarem Himmel und wenig Wind kühlt der Boden und die Autoscheibe stärker ab als die Luft – darum ist Bodenfrost schon bei einigen Grad über null möglich.";
    if (minT <= -0.5) {
      return { id: "frost", icon: "snowflake", stufe: minT <= -5 ? "rot" : "gelb", prio: 70, href: "./hw-index.html",
        title: "Frost bis " + deg(minT) + " °C gegen " + when, text: "Autoscheiben kratzen einplanen, empfindliche Pflanzen hereinholen.", why: why };
    }
    if (minT <= 3 && (cloud == null || cloud < 35) && (wind == null || wind < 12)) {
      return { id: "frost", icon: "snowflake", stufe: "gelb", prio: 55, href: "./hw-index.html",
        title: "Bodenfrost möglich gegen " + when, text: "Luft " + deg(minT) + " °C, aber klarer Himmel: Scheiben und Wiesen können überfrieren.", why: why };
    }
    if (fog || (spread != null && spread <= 1.5 && (wind == null || wind < 10))) {
      return { id: "frost", icon: "haze", stufe: null, prio: 30, href: "./hw-index.html",
        title: fog ? "Nebel wahrscheinlich gegen " + when : "Tau gegen " + when,
        text: fog ? "Morgens langsamer fahren, Sicht kann stark eingeschränkt sein." : "Autoscheiben beschlagen, Gras und Gartenmöbel werden nass.", why: why };
    }
    return null;
  }

  /* ---------- Gesamt ---------- */
  function hwInsights(data, lat, lon, opts) {
    opts = opts || {};
    var nowMs = opts.now || Date.now(), P = prep(data, nowMs);
    if (!P || typeof hwSunPosition !== "function") return [];
    var out = [];
    [rainbow, frost, stars].forEach(function (fn) {
      try { var r = fn(P, lat, lon, nowMs); if (r) out.push(r); } catch (e) { }
    });
    out.sort(function (a, b) { return b.prio - a.prio; });
    return out;
  }

  /* Eigene Symbole im Stil der übrigen HimmelsWahr-Symbole (24×24, Linie) */
  var ICONS = {
    rainbow: '<path d="M3 17a9 9 0 0 1 18 0"/><path d="M6.2 17a5.8 5.8 0 0 1 11.6 0"/><path d="M9.3 17a2.7 2.7 0 0 1 5.4 0"/>',
    star: '<path d="M12 3.3l2.57 5.76 6.27.67-4.68 4.22 1.31 6.17L12 16.97l-5.47 3.15 1.31-6.17-4.68-4.22 6.27-.67Z"/>',
    snowflake: '<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5 4.2 16.5"/><path d="M9.8 4.8 12 6.6l2.2-1.8M9.8 19.2 12 17.4l2.2 1.8"/>',
    haze: '<path d="M4 8h16M4 12h10M4 16h16M16.5 12h3.5"/>'
  };
  function hwInsightIcon(name, size) {
    var s = size || 20;
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || ICONS.star) + "</svg>";
  }

  global.hwInsights = hwInsights;
  global.hwInsightIcon = hwInsightIcon;
  global.HW_INSIGHTS_HOURLY = HOURLY;
})(typeof window !== "undefined" ? window : this);
