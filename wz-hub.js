/* ============================================================
   wz-hub.js — Startseite der WahrZentrale
   - Kopf: lebendiger Himmel (Tageszeit, Sonne/Mond, Sterne) – lokal berechnet
   - Weitermachen (zuletzt geöffnete App) und Favoriten-Leiste
   - "Heute": Wetter (nur nach Freigabe),
     offene Gedanken, Tagesaufgabe, nächste Zahlung, Urlaub,
     letzte Fahrt, Erinnerung an die Sicherung
   - Bereiche mit allen Apps und kleinen Kennzahlen
   - Suche über Apps und die lokal gespeicherten Einträge
   Alles wird auf dem Gerät gelesen und berechnet; nur das Wetter
   (nach Freigabe) wird bei Open-Meteo abgefragt.
   © 2026 Jan Dierlich – Alle Rechte vorbehalten.
   ============================================================ */
(function () {
  "use strict";
  var WZ = window.WZ, icon = WZ.icon;
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Helfer ---------- */
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
  function json(k, fb) { try { var v = get(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } }
  function num(k) { var v = parseFloat(get(k) || "0"); return isFinite(v) ? v : 0; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmt(n, d) { return Number(n).toLocaleString("de-DE", { maximumFractionDigits: d || 0, minimumFractionDigits: d || 0 }); }
  function eur(n) { return Number(n).toLocaleString("de-DE", { style: "currency", currency: "EUR" }); }
  function pad(n) { return String(n).padStart(2, "0"); }
  function hm(d) { return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function startOfDay(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function daysUntil(iso) { if (!iso) return null; var t = new Date(iso + (iso.length === 10 ? "T00:00:00" : "")); return Math.round((startOfDay(t) - startOfDay(new Date())) / 864e5); }
  function dateDe(d, opts) { return d.toLocaleDateString("de-DE", opts || { day: "numeric", month: "long" }); }
  var CHEV = '<svg class="wz-ic r-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 6l6 6-6 6"/></svg>';

  // IndexedDB nur lesen – existiert eine Datenbank noch nicht, wird sie NICHT angelegt
  function idbReadAll(name, stores) {
    return new Promise(function (resolve) {
      if (!("indexedDB" in window)) return resolve(null);
      var r;
      try { r = indexedDB.open(name); } catch (e) { return resolve(null); }
      var created = false;
      r.onupgradeneeded = function () { created = true; try { r.transaction.abort(); } catch (e) { } };
      r.onerror = function (e) { if (e && e.preventDefault) e.preventDefault(); resolve(null); };
      r.onblocked = function () { resolve(null); };
      r.onsuccess = function () {
        var db = r.result;
        if (created) { db.close(); return resolve(null); }
        var have = stores.filter(function (s) { return db.objectStoreNames.contains(s); });
        if (!have.length) { db.close(); return resolve({}); }
        var out = {}, tx;
        try { tx = db.transaction(have, "readonly"); } catch (e) { db.close(); return resolve({}); }
        have.forEach(function (s) { tx.objectStore(s).getAll().onsuccess = function (ev) { out[s] = ev.target.result || []; }; });
        tx.oncomplete = function () { db.close(); resolve(out); };
        tx.onerror = function () { db.close(); resolve(out); };
      };
    });
  }

  /* ---------- Himmel: Sonne und Mond (Näherungsformeln, lokal) ---------- */
  var RAD = Math.PI / 180;
  /* Sonnenauf- und -untergang nach dem NOAA-Verfahren (minutengenau, gleiche Werte wie HimmelsWahr) */
  function sunTimes(date, lat, lon) {
    var day0 = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    function solar(ms) {
      var jd = ms / 864e5 + 2440587.5, T = (jd - 2451545) / 36525;
      var L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360, M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
      var e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
      var C = Math.sin(M * RAD) * (1.914602 - T * (0.004817 + 0.000014 * T)) + Math.sin(2 * M * RAD) * (0.019993 - 0.000101 * T) + Math.sin(3 * M * RAD) * 0.000289;
      var om = 125.04 - 1934.136 * T, lam = L0 + C - 0.00569 - 0.00478 * Math.sin(om * RAD);
      var eps = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60 + 0.00256 * Math.cos(om * RAD);
      var dec = Math.asin(Math.sin(eps * RAD) * Math.sin(lam * RAD)), y = Math.pow(Math.tan(eps * RAD / 2), 2);
      var eqt = 4 / RAD * (y * Math.sin(2 * L0 * RAD) - 2 * e * Math.sin(M * RAD) + 4 * e * y * Math.sin(M * RAD) * Math.cos(2 * L0 * RAD) - 0.5 * y * y * Math.sin(4 * L0 * RAD) - 1.25 * e * e * Math.sin(2 * M * RAD));
      return { dec: dec, eqt: eqt };
    }
    function ev(sign) {
      var ms = day0 + 12 * 36e5, out = null;
      for (var i = 0; i < 3; i++) {
        var so = solar(ms), cosH = Math.cos(90.833 * RAD) / (Math.cos(lat * RAD) * Math.cos(so.dec)) - Math.tan(lat * RAD) * Math.tan(so.dec);
        if (cosH > 1) return "night"; if (cosH < -1) return "day";
        var mins = 720 - 4 * (lon - sign * Math.acos(cosH) / RAD) - so.eqt;
        ms = day0 + mins * 6e4; out = ms;
      }
      return new Date(out);
    }
    var set = ev(1), rise = ev(-1);
    if (set === "night" || rise === "night") return { polar: "night" };
    if (set === "day" || rise === "day") return { polar: "day" };
    return { rise: rise, set: set };
  }
  // Sonnenhöhe in Grad (gleiche Näherung wie oben, plus Sternzeit)
  function sunAlt(date, lat, lon) {
    var d = date.getTime() / 864e5 + 2440587.5 - 2451545.0;
    var M = (357.5291 + 0.98560028 * d) * RAD;
    var C = (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) * RAD;
    var L = M + C + (180 + 102.9372) * RAD, e = 23.4397 * RAD;
    var dec = Math.asin(Math.sin(L) * Math.sin(e)), ra = Math.atan2(Math.sin(L) * Math.cos(e), Math.cos(L));
    var H = (280.16 + 360.9856235 * d) * RAD + lon * RAD - ra, p = lat * RAD;
    return Math.asin(Math.sin(p) * Math.sin(dec) + Math.cos(p) * Math.cos(dec) * Math.cos(H)) / RAD;
  }
  var SYN = 29.530588853, NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);
  function moon(now) {
    var age = ((now - NEW_MOON) / 864e5) % SYN; if (age < 0) age += SYN;
    var illum = (1 - Math.cos(2 * Math.PI * age / SYN)) / 2;
    var names = [[1.85, "Neumond"], [5.54, "Zunehmende Sichel"], [9.23, "Erstes Viertel"], [12.92, "Zunehmender Mond"], [16.61, "Vollmond"], [20.3, "Abnehmender Mond"], [23.99, "Letztes Viertel"], [27.68, "Abnehmende Sichel"], [99, "Neumond"]];
    var name = "Neumond"; for (var i = 0; i < names.length; i++) if (age < names[i][0]) { name = names[i][1]; break; }
    var toFull = (14.765 - age + SYN) % SYN;
    return { age: age, illum: illum, name: name, toFull: toFull };
  }

  /* ---------- Wetter (Open-Meteo, nur nach Freigabe) ---------- */
  var WX_TEXT = [[0, "Klar", "sun"], [1, "Überwiegend klar", "sun"], [2, "Teils bewölkt", "cloudsun"], [3, "Bedeckt", "cloud"], [45, "Nebel", "fog"], [48, "Nebel mit Reif", "fog"],
    [51, "Leichter Nieselregen", "rain"], [53, "Nieselregen", "rain"], [55, "Starker Nieselregen", "rain"], [56, "Gefrierender Niesel", "rain"], [57, "Gefrierender Niesel", "rain"],
    [61, "Leichter Regen", "rain"], [63, "Regen", "rain"], [65, "Starker Regen", "rain"], [66, "Gefrierender Regen", "rain"], [67, "Gefrierender Regen", "rain"],
    [71, "Leichter Schneefall", "snow"], [73, "Schneefall", "snow"], [75, "Starker Schneefall", "snow"], [77, "Schneegriesel", "snow"],
    [80, "Regenschauer", "rain"], [81, "Regenschauer", "rain"], [82, "Heftige Schauer", "rain"], [85, "Schneeschauer", "snow"], [86, "Schneeschauer", "snow"],
    [95, "Gewitter", "storm"], [96, "Gewitter mit Hagel", "storm"], [99, "Gewitter mit Hagel", "storm"]];
  var WX_ICON = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4"/>',
    cloudsun: WZ.ICONS.hw, cloud: WZ.ICONS.weather,
    fog: '<path d="M4 9h16M3 13h18M5 17h14"/>',
    rain: '<path d="M7.6 14.5h9a3.6 3.6 0 00.2-7.2 5 5 0 00-9.4 1.2 3 3 0 00.2 6z"/><path d="M8.5 17.5l-1 2.5M12.5 17.5l-1 2.5M16.5 17.5l-1 2.5"/>',
    snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/>',
    storm: '<path d="M7.6 15.5h9a3.6 3.6 0 00.2-7.2 5 5 0 00-9.4 1.2 3 3 0 00.2 6z"/><path d="M12.5 15.5l-2 3.5h3l-2 3.5"/>'
  };
  function wxInfo(code) { var t = WX_TEXT[0]; for (var i = 0; i < WX_TEXT.length; i++) if (WX_TEXT[i][0] === code) { t = WX_TEXT[i]; break; } return { text: t[1], icon: t[2] }; }
  function svg(p) { return '<svg class="wz-ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + p + "</svg>"; }

  var wxReq = null;
  /* Stundenwerte für „Himmels-Tipp“ (gleiche Liste wie HW_INSIGHTS_HOURLY in hw-insights.js) */
  var WX_HOURLY = "temperature_2m,apparent_temperature,dew_point_2m,precipitation_probability,precipitation,weather_code,cloud_cover,cloud_cover_low,wind_speed_10m,wind_gusts_10m,direct_radiation";
  function fetchWeather(loc) {
    if (!wxReq) wxReq = fetchWeatherNow(loc).catch(function (e) { wxReq = null; throw e; });
    return wxReq;
  }
  function fetchWeatherNow(loc) {
    var lat = Math.round(loc.lat * 100) / 100, lon = Math.round(loc.lon * 100) / 100;
    var cache = json("wz_today_wx", null);
    if (cache && cache.lat === lat && cache.lon === lon && Date.now() - cache.t < 30 * 60 * 1000 && cache.data && cache.data.hourly && cache.data.hourly.direct_radiation) return Promise.resolve(cache.data);
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon +
      "&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
      "&hourly=" + WX_HOURLY + "&timezone=auto&forecast_days=2";
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 8000);
    return fetch(url, ctrl ? { signal: ctrl.signal } : undefined).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error("http " + r.status);
      return r.json();
    }).then(function (data) {
      set("wz_today_wx", JSON.stringify({ t: Date.now(), lat: lat, lon: lon, data: data }));
      return data;
    });
  }

  /* ---------- Kennzahlen der Apps (nur lesen) ---------- */
  var FW_NAMES = { af: "AufwindWahr", zw: "ZahlenturmWahr", kv: "Korvanthiel", hk: "HerzKaroDrei", pk: "PartikelWahr", st: "StrömungsWahr", bw: "BeatWahr" };
  var M = {
    zwBest: function () { return num("ztw-best"); },
    zwGames: function () { var s = json("ztw-stats", null); return (s && s.gamesPlayed) || 0; },
    kvBest: function () { return num("korvanthielBest"); },
    kvDaily: function () { var d = json("korvanthielDaily", null); return d && d.date === ymd(new Date()) ? 1 : 0; },
    hkGames: function () { var s = json("herzkarodrei_stats_v1", null); return (s && s.gamesPlayed) || 0; },
    afGames: function () { var s = json("aufwindwahr_stats", null); return (s && s.gamesPlayed) || 0; },
    bwProjects: function () { var p = json("beatwahr_projects_v3", null); return p && typeof p === "object" ? Object.keys(p).length : 0; },
    visit: function (a) { return num("funwahr-zuletzt-" + a); }
  };
  var TASKS = [
    { app: "zw", text: "Neuer Rekord in ZahlenturmWahr", metric: "zwBest", kind: "more" },
    { app: "kv", text: "Tages-Challenge in Korvanthiel", metric: "kvDaily", kind: "flag" },
    { app: "hk", text: "Eine Runde HerzKaroDrei", metric: "hkGames", kind: "more" },
    { app: "pk", text: "Partikelgewitter entfesseln", kind: "visit" },
    { app: "kv", text: "Neuer Rekord in Korvanthiel", metric: "kvBest", kind: "more" },
    { app: "st", text: "Wirbel in StrömungsWahr", kind: "visit" },
    { app: "zw", text: "Ein Turm in ZahlenturmWahr", metric: "zwGames", kind: "more" },
    { app: "bw", text: "Ein Beat in BeatWahr", kind: "visit" },
    { app: "af", text: "Eine Partie AufwindWahr", metric: "afGames", kind: "more" },
    { app: "wd", text: "Das Tageswunder in ThaumoraWahr lesen", kind: "visit" }
  ];
  function dailyTask() {
    var d = ymd(new Date()), seed = 0;
    for (var i = 0; i < d.length; i++) seed = (seed * 31 + d.charCodeAt(i)) >>> 0;
    var st = json("funwahr-tagesaufgabe", null);
    if (!st || st.date !== d) {
      var idx = seed % TASKS.length, t = TASKS[idx];
      st = { date: d, idx: idx, base: t.metric ? M[t.metric]() : 0 };
      set("funwahr-tagesaufgabe", JSON.stringify(st));
    }
    var task = TASKS[st.idx] || TASKS[0], done;
    if (task.kind === "more") done = M[task.metric]() > st.base;
    else if (task.kind === "flag") done = M[task.metric]() === 1;
    else done = M.visit(task.app) >= startOfDay(new Date()).getTime();
    return { task: task, done: done };
  }
  function thoughtsOpen() {
    var list = json("losgedacht_thoughts", []);
    if (!Array.isArray(list)) return 0;
    var now = Date.now();
    return list.filter(function (t) { return t && t.status === "open" && !(t.snoozeUntil && t.snoozeUntil > now); }).length;
  }
  function nextPayment() {
    var list = json("alltagwahr_entries_v1", []);
    if (!Array.isArray(list) || !list.length) return null;
    var best = null;
    list.forEach(function (e) {
      if (!e || !e.nextDate) return;
      var d = new Date(e.nextDate + "T00:00:00"), step = { monthly: 1, quarterly: 3, yearly: 12 }[e.rhythm] || 1, guard = 0;
      while (startOfDay(d) < startOfDay(new Date()) && guard++ < 400) d.setMonth(d.getMonth() + step);
      if (!best || d < best.d) best = { d: d, e: e };
    });
    return best;
  }
  function monthlyTotal() {
    var list = json("alltagwahr_entries_v1", []), sum = 0;
    if (!Array.isArray(list)) return 0;
    list.forEach(function (e) { if (!e) return; var a = +e.amount || 0; sum += e.rhythm === "yearly" ? a / 12 : e.rhythm === "quarterly" ? a / 3 : a; });
    return sum;
  }
  function tours() { var t = json("wk-tours", []); return Array.isArray(t) ? t : []; }
  function tripDate() { var d = json("fk_trip_date", null); return typeof d === "string" ? d : null; }
  function hasAnyData() {
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && !/^wz_|theme|onboard|intro-seen|welcomed|seen|consent|zuletzt|tagesaufgabe|sound|location-mode|manual-location|last-location|currentloc|^zh:(lat|lon|place)$/i.test(k)) return true; } } catch (e) { }
    return false;
  }

  /* ---------- Heute ---------- */
  function row(opts) {
    var tag = opts.href ? "a" : (opts.onClick ? "button" : "div");
    var h = "<" + tag + ' class="row' + (opts.cls ? " " + opts.cls : "") + '"' + (opts.href ? ' href="' + opts.href + '"' : "") + (tag === "button" ? ' type="button"' : "") + (opts.id ? ' id="' + opts.id + '"' : "") + ">" +
      '<span class="r-ic">' + (opts.svg || icon(opts.icon)) + "</span>" +
      '<span class="r-txt"><span class="r-l">' + opts.label + '</span><span class="r-v" style="display:block"' + (opts.count ? " data-count" : "") + ">" + opts.value + "</span>" + (opts.note ? '<span class="r-note" style="display:block">' + opts.note + "</span>" : "") + "</span>" +
      (opts.button ? opts.button : (opts.href ? CHEV : "")) + "</" + tag + ">";
    return h;
  }

  /* Heute: Karten ein-/ausblenden und sortieren (wz_today_cfg, nur lokal) */
  var TODAY_CARDS = [
    { id: "wetter", name: "Wetter", desc: "Temperatur und Regen an deinem Ort", def: true, ic: "weather" },
    { id: "himmelstipp", name: "Himmels-Tipp", desc: "Sternenhimmel, Regenbogen und Frost (HimmelsWahr)", def: true, cond: true, ic: "hw" },
    { id: "gedanken", name: "Offene Gedanken", desc: "aus LosDenkWahr", def: true, cond: true, ic: "thought" },
    { id: "zahlung", name: "Nächste Zahlung", desc: "aus AlltagWahr", def: true, cond: true, ic: "euro" },
    { id: "urlaub", name: "Urlaubs-Countdown", desc: "aus Keysglade", def: true, cond: true, ic: "plane" },
    { id: "fahrt", name: "Letzte Fahrt", desc: "aus NaviWahr", def: true, cond: true, ic: "car" },
    { id: "vorrat", name: "Vorräte", desc: "was in den nächsten 7 Tagen abläuft (VorratsWahr)", def: false, cond: true, ic: "vw" },
    { id: "zuletzt", name: "Zuletzt geöffnet", desc: "deine drei zuletzt genutzten Apps", def: false, cond: true, ic: "clock" },
    { id: "wunder", name: "Tageswunder", desc: "jeden Tag eine neue Karte aus ThaumoraWahr", def: true, ic: "wd" },
    { id: "aufgabe", name: "Tagesaufgabe", desc: "eine kleine Aufgabe für heute", def: true, ic: "trophy" },
    { id: "sicherung", name: "Sicherungs-Erinnerung", desc: "wenn länger als 30 Tage nicht gesichert", def: true, cond: true, ic: "backup" }
  ];
  var todayEdit = false;
  function todayCfg() { var c = json("wz_today_cfg", null); return c && typeof c === "object" ? { order: Array.isArray(c.order) ? c.order : [], on: c.on && typeof c.on === "object" ? c.on : {} } : { order: [], on: {} }; }
  function saveTodayCfg(c) { set("wz_today_cfg", JSON.stringify(c)); }
  function todayOrdered() { return byList(TODAY_CARDS, todayCfg().order, "id"); }
  function cardOn(c, cfg) { return Object.prototype.hasOwnProperty.call(cfg.on, c.id) ? !!cfg.on[c.id] : c.def; }

  function expiringStock() {
    var list = json("vw_inventar", []);
    if (!Array.isArray(list)) return [];
    var today = startOfDay(new Date()).getTime(), lim = today + 7 * 864e5;
    return list.filter(function (e) { if (!e || !e.datum) return false; var t = new Date(e.datum + "T00:00:00").getTime(); return isFinite(t) && t <= lim; })
      .sort(function (a, b) { return a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0; });
  }

  function loadWonder() {
    function fill() {
      var r = $("wdRow"); if (!r || !window.WD_DATA) return;
      var w = WD_DATA.wonderFor(new Date()); if (!w) return;
      r.querySelector(".r-v").textContent = w.t;
      r.querySelector(".r-l").textContent = "Tageswunder · " + w.k;
      r.hidden = false;
    }
    if (window.WD_DATA) return fill();
    if (loadWonder.busy) return; loadWonder.busy = true;
    var sc = document.createElement("script"); sc.src = "./wd-data.js"; sc.async = true;
    sc.onload = function () { loadWonder.busy = false; fill(); }; sc.onerror = function () { loadWonder.busy = false; };
    document.head.appendChild(sc);
  }
  function renderToday() {
    var now = new Date();
    $("heute-date").textContent = now.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
    var eb = $("todayEdit");
    if (eb) { eb.textContent = todayEdit ? "Fertig" : "Anpassen"; eb.classList.toggle("on", todayEdit); eb.setAttribute("aria-pressed", String(todayEdit)); }
    if (todayEdit) { renderTodayEditor(); return; }
    var loc = window.wzCore ? wzCore.knownLocation() : null;
    var cfg = todayCfg(), wxOn = get("wz_today_weather") === "on", wxShown = false, wxAsk = false, tipShown = false;

    var build = {
      wetter: function () {
        if (!wxOn) { wxAsk = true; return ""; }
        if (!loc) return row({ icon: "weather", label: "Wetter", value: "Standort unbekannt", note: "Einmal ermitteln oder in den Einstellungen einen Ort wählen.",
          button: '<button type="button" class="r-btn" id="wxLoc">Ermitteln</button>' });
        wxShown = true;
        return '<a class="row" href="./hw-index.html" id="wxRow"><span class="r-ic">' + icon("weather") + '</span><span class="r-txt"><span class="r-l">Wetter' + (loc.name ? " · " + esc(loc.name) : "") + '</span><span class="r-v" style="display:block">Wird geladen …</span></span>' + CHEV + "</a>";
      },
      himmelstipp: function () {
        if (!wxOn || !loc) return "";
        tipShown = true;
        return '<a class="row" href="./hw-index.html#heute-lohnt" id="tipRow" hidden><span class="r-ic">' + icon("hw") + '</span><span class="r-txt"><span class="r-l">Himmels-Tipp</span><span class="r-v" style="display:block"></span></span>' + CHEV + "</a>";
      },
      gedanken: function () {
        var open = thoughtsOpen();
        return open > 0 ? row({ icon: "thought", label: "LosDenkWahr", value: open + (open === 1 ? " Gedanke wartet" : " Gedanken warten") + " auf dich", count: true, href: "./ld-index.html" }) : "";
      },
      zahlung: function () {
        var np = nextPayment(); if (!np) return "";
        var dd = Math.round((startOfDay(np.d) - startOfDay(now)) / 864e5);
        var when = dd === 0 ? "heute" : dd === 1 ? "morgen" : "am " + dateDe(np.d, { day: "numeric", month: "short" });
        return row({ icon: "euro", label: "Nächste Zahlung", value: esc(np.e.name) + " <small>· " + eur(+np.e.amount || 0) + " " + when + "</small>", href: "./aw-index.html" });
      },
      urlaub: function () {
        var td = tripDate(); if (!td) return "";
        var du = daysUntil(td);
        return du !== null && du >= 0 ? row({ icon: "plane", label: "Keysglade", value: du === 0 ? "Heute geht’s los" : "Urlaub in " + du + (du === 1 ? " Tag" : " Tagen"), count: du > 0, href: "./kg-index.html" }) : "";
      },
      fahrt: function () {
        var tl = tours(); if (!tl.length) return "";
        var last = tl[0];
        var wk = tl.filter(function (t) { return t.startTime >= Date.now() - 7 * 864e5; }).reduce(function (s, t) { return s + (t.distanceKm || 0); }, 0);
        return row({ icon: "car", label: "NaviWahr · letzte Fahrt", value: fmt(last.distanceKm || 0, 1) + " km <small>· " + dateDe(new Date(last.startTime), { day: "numeric", month: "short" }) + "</small>", note: "Diese Woche: " + fmt(wk, 1) + " km", count: true, href: "./wk-index.html" });
      },
      vorrat: function () {
        var ex = expiringStock(); if (!ex.length) return "";
        var today = startOfDay(now).getTime(), gone = ex.filter(function (e) { return new Date(e.datum + "T00:00:00").getTime() < today; }).length;
        var names = ex.slice(0, 3).map(function (e) { return esc(e.name || "Eintrag"); }).join(", ") + (ex.length > 3 ? " …" : "");
        return row({ icon: "vw", label: "VorratsWahr", value: ex.length + (ex.length === 1 ? " Vorrat läuft" : " Vorräte laufen") + " bald ab", note: names + (gone ? " · davon " + gone + " schon abgelaufen" : ""), href: "./vw-index.html" });
      },
      zuletzt: function () {
        var rec = json("wz_recent", {}) || {};
        var apps = WZ.APPS.filter(function (a) { return rec[a.id]; }).sort(function (a, b) { return rec[b.id] - rec[a.id]; }).slice(0, 3);
        if (!apps.length) return "";
        return '<div class="row recent-row"><span class="r-ic">' + icon("clock") + '</span><span class="r-txt"><span class="r-l">Zuletzt geöffnet</span><span class="recent-apps">' +
          apps.map(function (a) { return '<a href="./' + a.href + '" class="recent-app"><span class="recent-ic">' + icon(a.id) + "</span>" + esc(a.name) + "</a>"; }).join("") + "</span></span></div>";
      },
      wunder: function () {
        // Tageswunder aus ThaumoraWahr: die Inhalte werden erst nach dem Aufbau der Startseite nachgeladen (offline aus dem Zwischenspeicher)
        setTimeout(loadWonder, 0);
        return '<a class="row" href="./wd-index.html" id="wdRow" hidden><span class="r-ic">' + icon("wd") + '</span><span class="r-txt"><span class="r-l">Tageswunder</span><span class="r-v" style="display:block"></span></span>' + CHEV + "</a>";
      },
      aufgabe: function () {
        var da = dailyTask();
        return row({ svg: da.done ? icon("check") : icon("trophy"), label: da.done ? "Tagesaufgabe erledigt" : "Tagesaufgabe", value: esc(da.task.text), href: "./" + da.task.app + "-index.html" });
      },
      sicherung: function () {
        var lb = parseInt(get("wz_last_backup") || "0", 10);
        var age = lb ? Math.floor((Date.now() - lb) / 864e5) : null;
        return (age === null || age > 30) && hasAnyData() ? row({ icon: "backup", label: "Sicherung", value: age === null ? "Noch nie gesichert" : "Letzte Sicherung vor " + age + " Tagen", note: "Eine Datei mit allen Daten schützt vor Verlust.", href: "./wz-sichern.html" }) : "";
      }
    };

    var out = [], anyOn = false;
    todayOrdered().forEach(function (c) {
      if (!cardOn(c, cfg)) return;
      anyOn = true;
      var h = ""; try { h = build[c.id](); } catch (e) { h = ""; }
      if (h) out.push(h);
    });
    if (!out.length) out.push(row({ icon: "info", label: "Heute", value: anyOn ? "Gerade gibt es nichts Neues." : "Alle Karten sind ausgeblendet.", note: "Über „Anpassen“ wählst du, was hier erscheint." }));
    if (wxAsk) out.push(row({ icon: "weather", cls: "wx-ask", label: "Wetter", value: "Wetter für deinen Ort anzeigen?", note: "Dein Standort geht dafür an Open-Meteo (Schweiz).",
      button: '<button type="button" class="wx-link" id="wxOn">Anzeigen</button>' }));
    $("today").innerHTML = out.join("");
    countUp($("today"));

    var b = $("wxOn");
    if (b) b.addEventListener("click", function (e) { e.preventDefault(); set("wz_today_weather", "on"); renderToday(); renderSky(); });
    var l = $("wxLoc");
    if (l) l.addEventListener("click", function (e) {
      e.preventDefault();
      if (!navigator.geolocation) return;
      l.textContent = "…";
      navigator.geolocation.getCurrentPosition(function (p) {
        if (window.wzCore) wzCore.rememberGps(p.coords.latitude, p.coords.longitude, "");
        renderToday(); renderSky();
      }, function () { l.textContent = "Ermitteln"; }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
    });
    if (tipShown) {
      Promise.all([fetchWeather(loc), wzCore.loadScript("./hw-astro.js"), wzCore.loadScript("./hw-insights.js")]).then(function (res) {
        var r = $("tipRow"), d = res[0]; if (!r || typeof window.hwInsights !== "function") return;
        var off = []; try { off = JSON.parse(get("hw-insights-off") || "[]") || []; } catch (e) { }
        var list = window.hwInsights(d, loc.lat, loc.lon).filter(function (x) { return x.prio >= 30 && off.indexOf(x.id) === -1; });
        if (!list.length) { r.remove(); return; }
        var top = list[0];
        r.querySelector(".r-ic").innerHTML = window.hwInsightIcon(top.icon, 22).replace("<svg ", '<svg class="wz-ic" ');
        r.querySelector(".r-v").textContent = top.title;
        var n = document.createElement("span"); n.className = "r-note"; n.style.display = "block";
        n.textContent = top.text + (list.length > 1 ? " · " + (list.length - 1) + (list.length === 2 ? " weiterer Tipp" : " weitere Tipps") + " in HimmelsWahr" : "");
        var src = document.createElement("span"); src.className = "r-note"; src.style.display = "block";
        src.textContent = "Wetterdaten: Open-Meteo.com (CC BY 4.0) · Himmel auf dem Gerät berechnet";
        r.querySelector(".r-txt").appendChild(n);
        r.querySelector(".r-txt").appendChild(src);
        r.hidden = false;
      }).catch(function () { var r = $("tipRow"); if (r) r.remove(); });
    }
    if (wxShown) {
      fetchWeather(loc).then(function (d) {
        var r = $("wxRow"); if (!r || !d || !d.current) return;
        var w = wxInfo(d.current.weather_code), dl = d.daily || {};
        var mx = dl.temperature_2m_max ? Math.round(dl.temperature_2m_max[0]) : null, mn = dl.temperature_2m_min ? Math.round(dl.temperature_2m_min[0]) : null;
        var pp = dl.precipitation_probability_max ? dl.precipitation_probability_max[0] : null;
        r.querySelector(".r-ic").innerHTML = svg(WX_ICON[w.icon] || WX_ICON.cloud);
        r.querySelector(".r-v").innerHTML = '<span class="wx-big" data-count>' + Math.round(d.current.temperature_2m) + "°</span> <small>" + w.text + (mx !== null ? " · " + mn + "° / " + mx + "°" : "") + (pp !== null ? " · Regen " + pp + " %" : "") + "</small>";
        var note = document.createElement("span"); note.className = "r-note"; note.style.display = "block";
        note.innerHTML = 'Wetterdaten: <span style="text-decoration:underline">Open-Meteo.com</span> (CC BY 4.0)';
        r.querySelector(".r-txt").appendChild(note);
        countUp(r);
      }).catch(function () {
        var r = $("wxRow"); if (r) r.querySelector(".r-v").textContent = "Gerade nicht erreichbar";
      });
    }
  }

  function renderTodayEditor(focusId, focusDir) {
    var cfg = todayCfg(), list = todayOrdered();
    var h = '<p class="t-hint">Wähle, was „Heute“ zeigt, und ändere mit den Pfeilen die Reihenfolge.</p>';
    list.forEach(function (c, i) {
      var on = cardOn(c, cfg);
      h += '<div class="row t-edit' + (on ? "" : " off") + '"><span class="r-ic">' + icon(c.ic) + '</span><span class="r-txt"><span class="r-l">' + esc(c.name) + '</span><span class="r-note" style="display:block">' + esc(c.desc) + (c.cond ? " · erscheint nur, wenn es etwas gibt" : "") + "</span></span>" +
        '<span class="mv-row">' + arrowBtn("up", c.name + " nach oben", 'data-tmv="' + c.id + '" data-dir="-1"', i === 0) + arrowBtn("down", c.name + " nach unten", 'data-tmv="' + c.id + '" data-dir="1"', i === list.length - 1) + "</span>" +
        '<label class="sw"><input type="checkbox" data-ton="' + c.id + '"' + (on ? " checked" : "") + ' aria-label="' + esc(c.name) + ' anzeigen"><span></span></label></div>';
    });
    h += '<div class="t-foot"><button type="button" class="t-reset" id="todayReset">Ursprüngliche Auswahl</button><button type="button" class="r-btn" id="todayDone">Fertig</button></div>';
    $("today").innerHTML = h;
    Array.prototype.forEach.call($("today").querySelectorAll("[data-ton]"), function (inp) {
      inp.addEventListener("change", function () {
        var c = todayCfg(); c.on[inp.getAttribute("data-ton")] = inp.checked; saveTodayCfg(c);
        inp.closest(".t-edit").classList.toggle("off", !inp.checked);
      });
    });
    Array.prototype.forEach.call($("today").querySelectorAll("[data-tmv]"), function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-tmv"), dir = +btn.getAttribute("data-dir");
        var ids = todayOrdered().map(function (c) { return c.id; }), i = ids.indexOf(id), j = i + dir;
        if (j < 0 || j >= ids.length) return;
        ids.splice(j, 0, ids.splice(i, 1)[0]);
        var c = todayCfg(); c.order = ids; saveTodayCfg(c);
        renderTodayEditor(id, dir);
      });
    });
    $("todayReset").addEventListener("click", function () { try { localStorage.removeItem("wz_today_cfg"); } catch (e) { } renderTodayEditor(); });
    $("todayDone").addEventListener("click", function () { todayEdit = false; renderToday(); var s = $("heute"); if (s) s.scrollIntoView({ block: "nearest" }); });
    if (focusId) {
      var f = $("today").querySelector('[data-tmv="' + focusId + '"][data-dir="' + focusDir + '"]:not([disabled])') || $("today").querySelector('[data-tmv="' + focusId + '"]:not([disabled])');
      if (f) { try { f.focus({ preventScroll: true }); } catch (e) { } f.closest(".t-edit").scrollIntoView({ block: "nearest" }); }
    }
  }

  /* ---------- Bereiche und Kacheln ---------- */
  function statFor(id) {
    try {
      switch (id) {
        case "zh": { var m = json("zh:mem", []); return Array.isArray(m) && m.length ? m.length + (m.length === 1 ? " Erinnerung" : " Erinnerungen") : ""; }
        case "as": { var p = json("astrowahr.profiles", []); return Array.isArray(p) && p.length ? p.length + (p.length === 1 ? " Horoskop" : " Horoskope") : ""; }
        case "kw": { var w = json("kw-waypoints", []); return Array.isArray(w) && w.length ? w.length + (w.length === 1 ? " Wegpunkt" : " Wegpunkte") : ""; }
        case "wk": { var t = tours(); return t.length ? t.length + (t.length === 1 ? " Fahrt · " : " Fahrten · ") + fmt(t.reduce(function (s, x) { return s + (x.distanceKm || 0); }, 0), 0) + " km" : ""; }
        case "kg": { var d = tripDate(); var n = d ? daysUntil(d) : null; return n !== null && n >= 0 ? (n === 0 ? "Heute geht’s los" : "Noch " + n + (n === 1 ? " Tag" : " Tage")) : ""; }
        case "aw": { var mt = monthlyTotal(); return mt > 0 ? eur(mt) + " im Monat" : ""; }
        case "vw": { var v = json("vw_inventar", []); return Array.isArray(v) && v.length ? v.length + (v.length === 1 ? " Vorrat" : " Vorräte") : ""; }
        case "ld": { var o = thoughtsOpen(); return o ? o + " offen" : ""; }
        case "af": { var ag = M.afGames(); return ag ? fmt(ag) + (ag === 1 ? " Partie" : " Partien") : ""; }
        case "zw": { var b = M.zwBest(); return b ? "Rekord " + fmt(b) : ""; }
        case "kv": { var k = M.kvBest(); return k ? "Rekord " + fmt(k) : ""; }
        case "hk": { var g = M.hkGames(); return g ? fmt(g) + (g === 1 ? " Runde" : " Runden") : ""; }
        case "bw": { var pr = M.bwProjects(); return pr ? pr + (pr === 1 ? " Projekt" : " Projekte") : ""; }
        case "hz": { var hd = json("horizontwahr_daten", null); return hd && Array.isArray(hd.items) && hd.items.length ? hd.items.length + " Objekte · " + hd.r + " km" : ""; }
        case "sn": { var sm = json("staunwahr_momente", []); return Array.isArray(sm) && sm.length ? sm.length + (sm.length === 1 ? " Lichtecho-Moment" : " Lichtecho-Momente") : ""; }
        case "mw": { var ml = json("messwahr_messungen", []); return Array.isArray(ml) && ml.length ? ml.length + (ml.length === 1 ? " Messung" : " Messungen") : ""; }
        case "lb": { var lp = json("labwahr_protokolle", []), lx = {}; (Array.isArray(lp) ? lp : []).forEach(function (q) { if (q && q.exp && q.exp !== "frei" && !q.example) lx[q.exp] = 1; }); var ln = Object.keys(lx).length; return ln ? ln + " von 18 Versuchen" : ""; }
        case "wd": { var we = json("thaumorawahr_entdeckt", {}), wn = we && typeof we === "object" ? Object.keys(we).length : 0; if (!wn) { var ws = json("thaumorawahr_sammlung", []); wn = Array.isArray(ws) ? ws.length : 0; } return wn ? wn + (wn === 1 ? " Wunder entdeckt" : " Wunder entdeckt") : ""; }
        case "kl": { var kmo = json("klangwahr_momente", []); return Array.isArray(kmo) && kmo.length ? kmo.length + (kmo.length === 1 ? " Moment" : " Momente") : ""; }
      }
    } catch (e) { }
    return "";
  }

  /* ---------- Eigene Gruppen und Symbolfarben ----------
     wz_home_layout: { names: {gruppe: "Titel"}, custom: [{id, title}], assign: {appId: gruppe}, colors: {appId: farbe}, gcolors: {gruppe: farbe} }
     Alles bleibt lokal auf dem Gerät. */
  var ICON_COLORS = [
    ["violett", "Violett", "#7C5CFF", "#5A2FBE", "#3B2585"],
    ["lila", "Lila", "#B06CF0", "#8A3FD1", "#5E2296"],
    ["pflaume", "Pflaume", "#A86A9E", "#7E3F76", "#52244D"],
    ["indigo", "Indigo", "#6C7BFF", "#4453D6", "#2A3496"],
    ["nachtblau", "Nachtblau", "#5A6FB8", "#2E3F86", "#1A2556"],
    ["blau", "Blau", "#4DA3FF", "#1F6FD6", "#15479A"],
    ["himmel", "Himmel", "#7FC8FF", "#3A9BE8", "#1C66AE"],
    ["petrol", "Petrol", "#3CC7C9", "#1C8F9E", "#0F5C6B"],
    ["tuerkis", "Türkis", "#4FD6C8", "#19A797", "#0D6E64"],
    ["mint", "Mint", "#8FE3B4", "#4CBF85", "#2A8559"],
    ["gruen", "Grün", "#5CCB7A", "#2E9E55", "#1B6B3A"],
    ["oliv", "Oliv", "#A8B85A", "#7A8A2E", "#4E5A18"],
    ["senf", "Senf", "#E6C24A", "#B8901C", "#7A5D0C"],
    ["gold", "Gold", "#F2B93B", "#C98612", "#8F5A08"],
    ["kupfer", "Kupfer", "#D9895A", "#A85A2C", "#6E3716"],
    ["orange", "Orange", "#FF9A5A", "#E0621F", "#A63F0E"],
    ["koralle", "Koralle", "#FF8A7A", "#E85A4F", "#A8352E"],
    ["rot", "Rot", "#FF6B6B", "#D93B4A", "#9E1F33"],
    ["bordeaux", "Bordeaux", "#C2506A", "#8E2440", "#5A1028"],
    ["rosa", "Rosa", "#FF7EB6", "#DB3F8B", "#A01F63"],
    ["schiefer", "Schiefer", "#7D93A8", "#4F6478", "#2F3D4C"],
    ["graphit", "Graphit", "#8A8799", "#5B5870", "#34323F"]
  ];
  function colorDef(key) { for (var i = 0; i < ICON_COLORS.length; i++) if (ICON_COLORS[i][0] === key) return ICON_COLORS[i]; return null; }
  function gradient(key) { var c = colorDef(key); return c ? "linear-gradient(150deg," + c[2] + " 0%," + c[3] + " 55%," + c[4] + " 100%)" : ""; }
  function layout() {
    var l = json("wz_home_layout", null);
    if (!l || typeof l !== "object") l = {};
    l.names = l.names && typeof l.names === "object" ? l.names : {};
    l.custom = Array.isArray(l.custom) ? l.custom.filter(function (g) { return g && g.id && g.title; }) : [];
    l.assign = l.assign && typeof l.assign === "object" ? l.assign : {};
    l.colors = l.colors && typeof l.colors === "object" ? l.colors : {};
    l.gcolors = l.gcolors && typeof l.gcolors === "object" ? l.gcolors : {};
    // Gestaltung je Gruppe: { ic: Symbol, sub: Untertitel, font, size, style, tiles }
    l.gdesign = l.gdesign && typeof l.gdesign === "object" ? l.gdesign : {};
    return l;
  }
  function saveLayout(l) { set("wz_home_layout", JSON.stringify(l)); }
  function allGroups() {
    var l = layout();
    function sub(id, def) { var d = l.gdesign[id]; return d && typeof d.sub === "string" ? d.sub : def; }
    return WZ.AREAS.map(function (a) { return { id: a.id, title: l.names[a.id] || a.title, sub: sub(a.id, l.names[a.id] ? "" : a.sub), builtin: true }; })
      .concat(l.custom.map(function (g) { return { id: g.id, title: g.title, sub: sub(g.id, ""), builtin: false }; }));
  }
  function groupOf(app, l) {
    l = l || layout();
    var g = l.assign[app.id];
    if (g && (WZ.AREAS.some(function (a) { return a.id === g; }) || l.custom.some(function (c) { return c.id === g; }))) return g;
    return app.area;
  }
  function iconStyle(id, l) {
    l = l || layout();
    var st = homeStyle(), key = l.colors[id] || st.icon;
    var g = key && key !== "violett" ? gradient(key) : "";
    return g ? ' style="background:' + g + '"' : "";
  }
  // Ordner-Symbol (Emblem) einer Gruppe: eigene Farbe > Farbe für alle Ordner > Standard je Bereich
  function groupStyle(id, l) {
    l = l || layout();
    var key = l.gcolors[id] || homeStyle().group, c = colorDef(key);
    return c ? ' style="--area-grad:' + gradient(key) + ';--area-tint:' + c[3] + '"' : "";
  }
  // Symbol einer App mit Tiefe: Abstufung je Bereich, eigene Farbe hat Vorrang
  var AREA_CLS = { himmel: "a-himmel", alltag: "a-alltag", spiel: "a-spiel" };
  function appIcon(app, l) {
    l = l || layout();
    var st = iconStyle(app.id, l), cls = st ? "c-own" : (AREA_CLS[groupOf(app, l)] || "");
    return '<span class="t-ic' + (cls ? " " + cls : "") + '"' + st + ">" + WZ.iconFine(app.id) + "</span>";
  }
  function nameHtml(n) { n = esc(n); return n.length > 9 ? n.replace(/([a-zäöüß])([A-ZÄÖÜ])/g, "$1<wbr>$2") : n; }

  /* ---------- Themenbereiche: Emblem und feines Ornament ---------- */
  var AREA_ART = {
    himmel: {
      em: '<path d="M14.6 4.4a8 8 0 1 0 5.2 11.2 6.3 6.3 0 0 1-5.2-11.2z"/><path d="M19 3v2.6M17.7 4.3h2.6"/><circle cx="21" cy="9.4" r=".6" fill="currentColor" stroke="none"/>',
      orn: '<g fill="none" stroke="currentColor" stroke-width="1"><path d="M40 120l38-46 44 18 40-52 30 30" stroke-dasharray="1 5"/><circle cx="160" cy="62" r="34"/><circle cx="160" cy="62" r="52" opacity=".6"/><path d="M90 14a58 58 0 0 1 120 30" opacity=".6"/></g><g fill="currentColor"><circle cx="40" cy="120" r="2.4"/><circle cx="78" cy="74" r="2"/><circle cx="122" cy="92" r="2.4"/><circle cx="162" cy="40" r="3"/><circle cx="192" cy="70" r="1.8"/><circle cx="20" cy="40" r="1.2"/><circle cx="60" cy="24" r="1"/><circle cx="210" cy="120" r="1.2"/></g>'
    },
    unterwegs: {
      em: '<path d="M5 19.5c0-4 4-3.6 6.2-6.2s.6-4.8 3.6-5.5" stroke-dasharray="1.6 1.6"/><circle cx="5" cy="19.5" r="1.4"/><path d="M17 3a3.6 3.6 0 0 0-3.6 3.6c0 2.8 3.6 6.4 3.6 6.4s3.6-3.6 3.6-6.4A3.6 3.6 0 0 0 17 3z"/><circle cx="17" cy="6.6" r="1.1"/>',
      orn: '<g fill="none" stroke="currentColor" stroke-width="1"><path d="M10 60c40-30 80 10 120-14s60-40 90-20"/><path d="M10 80c40-30 80 10 120-14s60-40 90-20" opacity=".7"/><path d="M10 100c40-30 80 10 120-14s60-40 90-20" opacity=".5"/><path d="M30 140c20-40 60-30 80-60s40-50 90-56" stroke-dasharray="4 5"/></g><circle cx="200" cy="24" r="4" fill="currentColor"/><circle cx="30" cy="140" r="3" fill="currentColor"/>'
    },
    alltag: {
      em: '<rect x="4" y="5" width="16" height="15" rx="2.8"/><path d="M4 9.4h16M8.5 3v4M15.5 3v4"/><path d="M8.6 14.4l2.2 2.2 4.6-4.6"/>',
      orn: '<g fill="none" stroke="currentColor" stroke-width="1"><path d="M20 30h200M20 52h200M20 74h200M20 96h200M20 118h200" opacity=".55"/><path d="M50 10v140" opacity=".7"/><circle cx="170" cy="74" r="40"/><path d="M150 74l14 14 26-28"/></g>'
    },
    spiel: {
      em: '<path d="M10 3.5l1.6 4.4 4.4 1.6-4.4 1.6L10 15.5l-1.6-4.4L4 9.5l4.4-1.6z"/><path d="M17.5 14l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9z" fill="currentColor" stroke="none"/>',
      orn: '<g fill="none" stroke="currentColor" stroke-width="1.2"><path d="M10 90h16l8-30 10 60 10-80 10 70 8-40 8 20h18"/><path d="M120 40l6 16 16 6-16 6-6 16-6-16-16-6 16-6z"/><path d="M180 90l4 10 10 4-10 4-4 10-4-10-10-4 10-4z"/></g><g fill="currentColor"><circle cx="200" cy="30" r="2.4"/><circle cx="160" cy="130" r="1.8"/><circle cx="96" cy="20" r="1.4"/></g>'
    }
  };
  /* Selbst gezeichnete Gruppensymbole (Linienstil wie die Bereichs-Embleme, 24er-Raster) */
  var GROUP_ICONS = [
    ["ordner", "Ordner", '<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.2h7a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/><path d="M3.5 10.5h17"/>'],
    ["himmel", "Himmel", AREA_ART.himmel.em],
    ["unterwegs", "Unterwegs", AREA_ART.unterwegs.em],
    ["alltag", "Alltag", AREA_ART.alltag.em],
    ["spiel", "Spiel", AREA_ART.spiel.em],
    ["stern", "Stern", '<path d="M12 3.6l2.3 5.4 5.8.5-4.4 3.8 1.3 5.7L12 16l-5 3 1.3-5.7-4.4-3.8 5.8-.5z"/>'],
    ["sonne", "Sonne", '<circle cx="12" cy="12" r="4"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>'],
    ["kompass", "Kompass", '<circle cx="12" cy="12" r="8.5"/><path d="M15.6 8.4l-2.1 5.1-5.1 2.1 2.1-5.1z"/><circle cx="12" cy="12" r=".9" fill="currentColor" stroke="none"/>'],
    ["lupe", "Entdecken", '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/><path d="M7.8 9.4a3 3 0 0 1 2.4-2"/>'],
    ["kamera", "Kamera", '<path d="M4 8.5a2 2 0 0 1 2-2h2l1.5-2h5l1.5 2h2a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="12.6" r="3.5"/>'],
    ["erde", "Welt", '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.3 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.3-3.5-8.5s1.1-6.1 3.5-8.5z"/>'],
    ["karte", "Karte", '<path d="M3.5 6.5l5.5-2 6 2 5.5-2v13l-5.5 2-6-2-5.5 2z"/><path d="M9 4.5v13M15 6.5v13"/>'],
    ["berg", "Berge", '<path d="M2.5 19l6.5-10.5 4.2 6.3 2.5-3.4 5.8 7.6z"/><path d="M6.9 11.9l2.1 1.3 1.6-1.4"/>'],
    ["baum", "Natur", '<path d="M12 3.5l5.5 7.6h-3.1l4 5.6H5.6l4-5.6H6.5z"/><path d="M12 16.7v3.8"/>'],
    ["blatt", "Blatt", '<path d="M5 19c0-8 5-13.4 14.5-14-.3 9.5-5.8 14.4-14.5 14z"/><path d="M5 19l7.5-7.5"/>'],
    ["welle", "Wasser", '<path d="M3 8.5c2.2-2 3.8-2 6 0s3.8 2 6 0 3.8-2 6 0"/><path d="M3 13.5c2.2-2 3.8-2 6 0s3.8 2 6 0 3.8-2 6 0"/><path d="M3 18.5c2.2-2 3.8-2 6 0s3.8 2 6 0 3.8-2 6 0"/>'],
    ["pfote", "Tiere", '<path d="M12 12.6c2.6 0 5 2.6 5 5 0 1.6-1.4 2.4-2.8 2.1-.8-.2-1.4-.5-2.2-.5s-1.4.3-2.2.5C8.4 20 7 19.2 7 17.6c0-2.4 2.4-5 5-5z"/><ellipse cx="6" cy="10.4" rx="1.6" ry="2"/><ellipse cx="9.6" cy="6.6" rx="1.6" ry="2.1"/><ellipse cx="14.4" cy="6.6" rx="1.6" ry="2.1"/><ellipse cx="18" cy="10.4" rx="1.6" ry="2"/>'],
    ["haus", "Zuhause", '<path d="M4 11l8-6.5 8 6.5"/><path d="M6 9.5v10h12v-10"/><path d="M10 19.5v-5h4v5"/>'],
    ["herz", "Herz", '<path d="M12 19.5s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.5c0 5.4-7.5 10-7.5 10z"/>'],
    ["musik", "Musik", '<path d="M9 17.5V6l10-2v11.5M9 9.5l10-2"/><circle cx="6.8" cy="17.5" r="2.2"/><circle cx="16.8" cy="15.5" r="2.2"/>'],
    ["buch", "Lesen", '<path d="M12 6.5c-2-1.5-4.8-2-8-1.5v13c3.2-.5 6 0 8 1.5 2-1.5 4.8-2 8-1.5V5c-3.2-.5-6 0-8 1.5z"/><path d="M12 6.5v13"/>'],
    ["idee", "Ideen", '<path d="M9.5 18.3h5M10.3 20.6h3.4"/><path d="M12 3.5a6 6 0 0 0-3.5 10.9c.4.3.5.8.5 1.3v.6h6v-.6c0-.5.1-1 .5-1.3A6 6 0 0 0 12 3.5z"/>'],
    ["werkzeug", "Werkzeug", '<path d="M14.6 4.2a4.5 4.5 0 0 0-4.3 5.9L4.4 16a1.9 1.9 0 0 0 2.7 2.7l5.9-5.9a4.5 4.5 0 0 0 5.9-4.3l-2.6 2.6-2.4-.6-.6-2.4z"/>'],
    ["lineal", "Messen", '<rect x="3" y="8.5" width="18" height="7" rx="1.5"/><path d="M6.5 8.5v3M10 8.5v2M13.5 8.5v3M17 8.5v2"/>'],
    ["uhr", "Zeit", '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.4 2"/>'],
    ["tasche", "Einkauf", '<path d="M5.5 8h13l-1 11.5h-11z"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/>'],
    ["auto", "Auto", '<path d="M4 15.5v-3.2l2-4.3h12l2 4.3v3.2z"/><path d="M4 12.3h16"/><circle cx="7.6" cy="15.8" r="1.7"/><circle cx="16.4" cy="15.8" r="1.7"/>'],
    ["flugzeug", "Reisen", '<path d="M20.8 4.2L3.5 11l6.2 2.4 2.4 6.2z"/><path d="M9.7 13.4L20.8 4.2"/>'],
    ["pokal", "Pokal", '<path d="M7.5 4.5h9v4a4.5 4.5 0 0 1-9 0z"/><path d="M7.5 6h-3a3 3 0 0 0 3 3.5M16.5 6h3a3 3 0 0 1-3 3.5"/><path d="M12 13v3.3M8.6 19.6h6.8M9.8 19.6l.5-3.3h3.4l.5 3.3"/>'],
    ["wuerfel", "Würfel", '<rect x="4.5" y="4.5" width="15" height="15" rx="3.2"/><circle cx="8.7" cy="8.7" r="1.1" fill="currentColor" stroke="none"/><circle cx="15.3" cy="8.7" r="1.1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="8.7" cy="15.3" r="1.1" fill="currentColor" stroke="none"/><circle cx="15.3" cy="15.3" r="1.1" fill="currentColor" stroke="none"/>']
  ];
  function groupIconDef(key) { for (var i = 0; i < GROUP_ICONS.length; i++) if (GROUP_ICONS[i][0] === key) return GROUP_ICONS[i]; return null; }
  // Ornament (rechts oben in der Karte) aus dem gewählten Symbol: groß und zart gezeichnet
  function ornFrom(em) {
    return '<g transform="translate(118 8) scale(5.6)" fill="none" stroke="currentColor" stroke-width=".22" stroke-linecap="round" stroke-linejoin="round">' + em + '</g>' +
      '<g fill="currentColor"><circle cx="40" cy="120" r="2"/><circle cx="76" cy="30" r="1.4"/><circle cx="96" cy="96" r="1.6"/></g>';
  }
  function groupDesign(id, l) { l = l || layout(); var d = l.gdesign[id]; return d && typeof d === "object" ? d : {}; }
  function areaArt(id, l) {
    var key = groupDesign(id, l).ic;
    if (!key || !groupIconDef(key)) return AREA_ART[id] || { em: groupIconDef("ordner")[2], orn: ornFrom(groupIconDef("ordner")[2]) };
    if (AREA_ART[key]) return AREA_ART[key];
    var em = groupIconDef(key)[2];
    return { em: em, orn: ornFrom(em) };
  }
  /* Beschriftung und Darstellung je Gruppe (nur Systemschriften) */
  var G_FONTS = [["", "Standard"], ["rund", "Rund"], ["technisch", "Technisch"]];
  var G_SIZES = [["s", "Klein"], ["", "Normal"], ["l", "Groß"]];
  var G_STYLES = [["", "Kräftig"], ["leicht", "Leicht"], ["versal", "Versalien"]];
  var G_TILES = [["kompakt", "Kompakt", "4 je Reihe, nur Name"], ["", "Normal", "2 je Reihe mit Beschreibung"], ["gross", "Groß", "Große Symbole"], ["liste", "Liste", "Eine App je Zeile"]];
  function inList(list, v) { return list.some(function (x) { return x[0] === v; }) ? v : ""; }
  function designCls(id, l) {
    var d = groupDesign(id, l), c = "";
    var f = inList(G_FONTS, d.font), z = inList(G_SIZES, d.size), y = inList(G_STYLES, d.style), t = inList(G_TILES, d.tiles);
    if (f) c += " gf-" + f; if (z) c += " gh-" + z; if (y) c += " gs-" + y; if (t) c += " tl-" + t;
    return c;
  }

  /* ---------- Weitermachen und Favoriten ---------- */
  var SHORT = { zh: "Sterne", kv: "Korvan&shy;thiel", hk: "HerzKaro<wbr>Drei" };
  var FAV_DEFAULT = ["hw", "wk", "aw", "ld"], FAV_MAX = 4; // der fünfte Platz der Zeile gehört „Hier merken“
  var HERE_IC = '<svg class="wz-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6.5-6.2-6.5-11A6.5 6.5 0 0112 3.5 6.5 6.5 0 0118.5 10c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/></svg>';
  function favs() {
    var f = json("wz_home_favs", null);
    if (!Array.isArray(f)) f = FAV_DEFAULT;
    return f.filter(function (id, i) { return WZ.app(id) && f.indexOf(id) === i; }).slice(0, FAV_MAX);
  }
  function toggleFav(id) {
    var f = favs(), i = f.indexOf(id), app = WZ.app(id);
    if (i !== -1) f.splice(i, 1);
    else { if (f.length >= FAV_MAX) { toast("Höchstens " + FAV_MAX + " Favoriten – entferne zuerst einen."); return; } f.push(id); }
    set("wz_home_favs", JSON.stringify(f));
    toast(i !== -1 ? "„" + app.name + "“ ist kein Favorit mehr" : "„" + app.name + "“ ist jetzt ein Favorit");
    renderFavs(); renderAreas(null, id);
  }
  function ago(ts) {
    var m = Math.round((Date.now() - ts) / 6e4);
    if (m < 1) return "gerade eben"; if (m < 60) return "vor " + m + " Min.";
    var h = Math.round(m / 60); if (h < 24) return "vor " + h + " Std.";
    var d = Math.round(h / 24); return d === 1 ? "gestern" : "vor " + d + " Tagen";
  }
  function renderJump() {
    var box = $("jump"); if (!box) return;
    var rec = json("wz_recent", {}) || {}, best = null;
    WZ.APPS.forEach(function (a) { if (rec[a.id] && (!best || rec[a.id] > rec[best.id])) best = a; });
    if (!best) { box.innerHTML = ""; return; }
    var stat = statsOn() ? statFor(best.id) : "";
    box.innerHTML = '<a class="jump" href="./' + best.href + '" aria-label="Weiter mit ' + esc(best.name) + '">' + '<span class="t-ic">' + WZ.iconFine(best.id) + "</span>" +
      '<span class="j-txt"><span class="j-l" style="display:block">Geöffnet ' + ago(rec[best.id]) + '</span><span class="j-n" style="display:block">' + esc(best.name) + '</span><span class="j-s" style="display:block">' + esc(stat || best.sub) + "</span></span>" +
      '<span class="j-go" aria-hidden="true">Weiter<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 6l6 6-6 6"/></svg></span></a>';
  }
  function renderFavs() {
    var box = $("favs"); if (!box) return;
    var f = favs(), l = layout();
    box.hidden = false;
    var here = '<button type="button" class="fav fav-here" id="hereBtn" aria-label="Hier merken: aktuellen Standort festhalten"><span class="t-ic">' + HERE_IC + '</span><span class="f-n">Hier merken</span></button>';
    box.innerHTML = '<div class="favs-h"><h2 id="favs-h">Favoriten</h2><button type="button" id="favEdit">' + (editMode ? "Fertig" : "Bearbeiten") + "</button></div>" +
      '<div class="fav-row">' + f.map(function (id) { var a = WZ.app(id); return '<a class="fav" href="./' + a.href + '" aria-label="' + esc(a.name) + '">' + appIcon(a, l) + '<span class="f-n">' + (SHORT[a.id] || nameHtml(a.name, 1)) + "</span></a>"; }).join("") + here + "</div>" +
      (f.length ? "" : '<p class="t-hint">Tippe unten bei einer App auf den Stern, um sie hier abzulegen.</p>');
    $("hereBtn").addEventListener("click", openHere);
    $("favEdit").addEventListener("click", function () {
      if (editMode) { editMode = false; } else { set("wz_home_sort", "eigene"); editMode = true; }
      renderSortBar(); renderAreas(); renderFavs();
      if (editMode) { var s = $("sortbar"); if (s) s.scrollIntoView({ block: "start", behavior: "smooth" }); }
    });
  }

  /* ---------- Echter Ortsname für den Kopfbereich ----------
     Ist nur ein GPS-Standort ohne Namen bekannt, wird der Ort einmalig über Photon
     (komoot, Sitz in Deutschland) ermittelt – mit auf 2 Nachkommastellen (≈ 1 km)
     gerundeten Koordinaten – und lokal gemerkt. Abschaltbar in den Einstellungen. */
  var PLACE_KEY = "wz_place_name_cache", placeReq = {};
  function shortPlace(n) { return String(n || "").split(",")[0].trim().slice(0, 40); }
  function placeKey(l) { return (+l.lat).toFixed(2) + "," + (+l.lon).toFixed(2); }
  function cachedPlace(l) {
    try { var c = JSON.parse(get(PLACE_KEY) || "{}"); return c[placeKey(l)] || ""; } catch (e) { return ""; }
  }
  function resolvePlace(l) {
    if (get("wz_place_name") === "off" || !window.wzCore || !wzCore.geoReverse || navigator.onLine === false) return Promise.resolve("");
    var k = placeKey(l);
    if (placeReq[k]) return placeReq[k];
    var parts = k.split(",");
    placeReq[k] = wzCore.geoReverse(parts[0], parts[1]).then(function (d) {
      var a = (d && d.address) || {};
      var n = shortPlace(a.city || a.town || a.village || a.suburb || a.county || "");
      if (n) {
        var c = {}; try { c = JSON.parse(get(PLACE_KEY) || "{}") || {}; } catch (e) { c = {}; }
        var keys = Object.keys(c); if (keys.length > 20) delete c[keys[0]];
        c[k] = n; set(PLACE_KEY, JSON.stringify(c));
      }
      return n;
    }).catch(function () { delete placeReq[k]; return ""; });
    return placeReq[k];
  }

  /* Wetter vor Sonne/Mond: Wolke, Regen, Schnee, Gewitter, Nebel (nur bei eingeschaltetem Wetter) */
  function orbWx(icon) {
    if (!icon || icon === "sun") return "";
    var part = icon === "cloudsun";
    var cloud = '<g class="ow-cloud"><circle cx="30" cy="57" r="11"/><circle cx="45" cy="48" r="15"/><circle cx="60" cy="57" r="11"/><rect x="30" y="52" width="30" height="16" rx="8"/></g>';
    var extra = "";
    if (icon === "rain") extra = '<g class="ow-drops" stroke="#CFE0FF" stroke-width="2.6" stroke-linecap="round"><path d="M33 73l-2 6"/><path d="M45 73l-2 6"/><path d="M57 73l-2 6"/></g>';
    else if (icon === "snow") extra = '<g class="ow-drops" fill="#FFFFFF"><circle cx="33" cy="77" r="2.3"/><circle cx="45" cy="80" r="2.3"/><circle cx="57" cy="77" r="2.3"/></g>';
    else if (icon === "storm") extra = '<path class="ow-bolt" d="M47 66l-7 11h6l-3 9 9-13h-6l3-7z" fill="#FFD66B"/>';
    else if (icon === "fog") extra = '<g stroke="rgba(255,255,255,.75)" stroke-width="3" stroke-linecap="round"><path d="M18 74h44"/><path d="M26 81h40"/></g>';
    return '<svg viewBox="0 0 86 86" class="orb-wx' + (part ? " part" : "") + '"><defs><linearGradient id="owG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#DCD3F5"/></linearGradient></defs>' +
      '<g fill="url(#owG)"' + (part ? ' transform="translate(-10 8) scale(.78)"' : "") + ">" + cloud + "</g>" + extra + "</svg>";
  }
  function setOrbWx(icon) {
    var orb = $("skyOrb"); if (!orb) return;
    var old = orb.querySelector(".orb-wx"); if (old) old.remove();
    var h = orb.classList.contains("arc") ? "" : orbWx(icon);
    orb.classList.toggle("wx-dim", !!h && icon !== "cloudsun");
    if (h) orb.insertAdjacentHTML("beforeend", h);
  }

  /* ---------- Kopf: lebendiger Himmel ---------- */
  var SKY = {
    night: { a: "var(--wzp-241748, #241748)", b: "var(--wzp-15102a, #15102A)", c: "var(--wzp-0b0921, #0B0921)", stars: 1 },
    twilight: { a: "var(--wzp-241748, #241748)", b: "var(--wzp-3b2585, #3B2585)", c: "var(--wzp-5a2fbe, #5A2FBE)", stars: .55 },
    golden: { a: "var(--wzp-3b2585, #3B2585)", b: "var(--wzp-3b2585, #3B2585)", c: "var(--wzp-5a2fbe, #5A2FBE)", stars: 0 },
    day: { a: "var(--wzp-5a2fbe, #5A2FBE)", b: "var(--wzp-3b2585, #3B2585)", c: "var(--wzp-241748, #241748)", stars: 0 }
  };
  function buildStars() {
    var box = $("skyStars"); if (!box || box.childNodes.length) return;
    var seed = 7, h = "";
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    for (var i = 0; i < 34; i++) {
      h += '<i class="' + (rnd() < .6 ? "s" : "") + '" style="left:' + (rnd() * 100).toFixed(1) + "%;top:" + (rnd() * 78).toFixed(1) + "%;--t:" + (2.4 + rnd() * 3).toFixed(1) + "s;--dl:" + (-rnd() * 5).toFixed(1) + 's"></i>';
    }
    box.innerHTML = h;
  }
  function sunSvg() {
    return '<svg viewBox="0 0 86 86" class="orb-sun"><defs><radialGradient id="skySunG" cx="40%" cy="38%" r="65%"><stop offset="0" stop-color="#FFFBEA"/><stop offset=".55" stop-color="#FFE08A"/><stop offset="1" stop-color="#FFB44D"/></radialGradient></defs>' +
      '<g class="orb-pulse"><circle cx="43" cy="43" r="36" fill="rgba(255,226,150,.16)"/><circle cx="43" cy="43" r="25" fill="url(#skySunG)"/></g></svg>';
  }
  function moonSvg(mo) {
    var cx = 43, cy = 43, r = 25, phase = 2 * Math.PI * mo.age / SYN, waxing = mo.age < SYN / 2;
    var rx = Math.abs(Math.cos(phase)) * r, crescent = mo.illum < .5;
    var lit = waxing ? 1 : 0, term = waxing ? (crescent ? 0 : 1) : (crescent ? 1 : 0);
    var d = "M" + cx + " " + (cy - r) + " A" + r + " " + r + " 0 0 " + lit + " " + cx + " " + (cy + r) + " A" + rx.toFixed(2) + " " + r + " 0 0 " + term + " " + cx + " " + (cy - r) + "Z";
    return '<svg viewBox="0 0 86 86" class="orb-moon"><defs><radialGradient id="skyMoonG" cx="42%" cy="40%" r="70%"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#DCD2FA"/></radialGradient><clipPath id="skyMoonC"><path d="' + d + '"/></clipPath></defs>' +
      '<circle cx="43" cy="43" r="33" fill="rgba(220,210,255,.10)"/><circle cx="43" cy="43" r="25" fill="rgba(255,255,255,.10)" stroke="rgba(255,255,255,.22)" stroke-width="1"/>' +
      (mo.illum > .01 ? '<path d="' + d + '" fill="url(#skyMoonG)"/><g clip-path="url(#skyMoonC)" fill="rgba(124,92,255,.16)"><circle cx="35" cy="36" r="5"/><circle cx="50" cy="50" r="6.5"/><circle cx="49" cy="31" r="3"/><circle cx="33" cy="53" r="3.2"/></g>' : "") + "</svg>";
  }
  /* Kleiner Sonnenbogen im Kopf (nur tagsüber, an der Stelle der Sonnenscheibe): der Weg der Sonne
     von Aufgang bis Untergang als Bogen über dem Horizont, mit der Sonne an ihrer jetzigen Stelle.
     Vor dem Aufgang und nach dem Untergang läuft die Kurve gestrichelt unter den Horizont weiter.
     Der zurückgelegte Teil ist kräftig, der kommende zart; im Winter ist der Bogen flacher.
     Marken am Horizont: Aufgang, Höchststand, Untergang. Bewusst ohne Beschriftung – die Zeiten
     stehen daneben im Text. Aus sunAlt()/sunTimes() berechnet, ohne Netz; es wird nichts gesendet. */
  function skyMini(now, lat, lon, st) {
    if (!st || !st.rise || !st.set) return "";
    var r = st.rise.getTime(), s = st.set.getTime(), t = now.getTime();
    if (!(s > r) || t < r || t > s) return "";
    var W = 112, H = 48, Y0 = 30, XA = 20, XD = 72, N = 36, K = 10, i, a, alts = [], amax = 1, imax = 0;
    for (i = -K; i <= N + K; i++) { a = sunAlt(new Date(r + (s - r) * i / N), lat, lon); alts.push(a); if (a > amax) { amax = a; imax = i; } }
    var top = (Y0 - 6) * Math.max(.62, Math.min(1, .62 + .38 * (amax - 13) / 47)), k = top / amax, f1 = function (v) { return v.toFixed(1); };
    function xOf(j) { return XA + j / N * XD; }
    function yOf(alt) { return alt >= 0 ? Y0 - alt * k : Math.min(Y0 + 11, Y0 - alt * k * .55); }
    function seg(from, to) { var d = "", j; for (j = from; j <= to; j++) d += (d ? "L" : "M") + f1(xOf(j)) + " " + f1(j === 0 || j === N ? Y0 : yOf(alts[j + K])); return d; }
    var day = seg(0, N), p = (t - r) / (s - r), xn = XA + p * XD, yn = Math.min(Y0, yOf(Math.max(0, sunAlt(now, lat, lon)))), xm = xOf(imax);
    var tick = function (x, len) { return '<path d="M' + f1(x) + " " + Y0 + "v" + len + '" stroke="#fff" stroke-opacity=".6" stroke-width="1" stroke-linecap="round"/>'; };
    return '<svg viewBox="0 0 ' + W + " " + H + '" class="orb-arc"><defs>' +
      '<clipPath id="miA"><rect x="0" y="0" width="' + f1(xn) + '" height="' + H + '"/></clipPath>' +
      '<clipPath id="miB"><rect x="' + f1(xn) + '" y="0" width="' + f1(W - xn) + '" height="' + H + '"/></clipPath>' +
      '<linearGradient id="miF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      '<radialGradient id="miS" cx="40%" cy="38%" r="65%"><stop offset="0" stop-color="#FFFBEA"/><stop offset=".55" stop-color="#FFE08A"/><stop offset="1" stop-color="#FFB44D"/></radialGradient></defs>' +
      '<path d="' + day + 'Z" fill="url(#miF)"/>' +
      '<path d="M2 ' + Y0 + "H" + (W - 2) + '" stroke="#fff" stroke-opacity=".55" stroke-width="1" stroke-linecap="round"/>' +
      tick(XA, 3.5) + tick(xm, 2.5) + tick(XA + XD, 3.5) +
      '<path d="' + seg(-K, 0) + '" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.1" stroke-dasharray="1.6 3" stroke-linecap="round"/>' +
      '<path d="' + seg(N, N + K) + '" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.1" stroke-dasharray="1.6 3" stroke-linecap="round"/>' +
      '<path d="' + day + '" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round" clip-path="url(#miB)"/>' +
      '<path d="' + day + '" fill="none" stroke="#fff" stroke-opacity=".96" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" clip-path="url(#miA)"/>' +
      (Y0 - yn > 9 ? '<path d="M' + f1(xn) + " " + f1(yn + 7.5) + "V" + (Y0 - 1) + '" stroke="#fff" stroke-opacity=".5" stroke-width="1" stroke-dasharray="1.5 2.5"/>' : "") +
      '<g class="arc-sun"><circle cx="' + f1(xn) + '" cy="' + f1(yn) + '" r="8.5" fill="rgba(255,226,150,.22)"/><circle cx="' + f1(xn) + '" cy="' + f1(yn) + '" r="5.2" fill="url(#miS)"/></g></svg>';
  }
  function renderSky() {
    var sky = $("sky"); if (!sky) return;
    var now = new Date(), loc = window.wzCore ? wzCore.knownLocation() : null, sl = loc || { lat: 51.3, lon: 9.5 };
    var alt = sunAlt(now, sl.lat, sl.lon), st = sunTimes(now, sl.lat, sl.lon), mo = moon(now.getTime());
    var phase = alt < -10 ? "night" : alt < -1 ? "twilight" : alt < 8 ? "golden" : "day", P = SKY[phase];
    var morning = now.getHours() < 12, side = morning ? "0%" : "100%";
    sky.style.setProperty("--sky-a", P.a); sky.style.setProperty("--sky-b", P.b); sky.style.setProperty("--sky-c", P.c);
    sky.style.setProperty("--sky-stars", String(P.stars));
    var glow = phase === "day" ? "radial-gradient(70% 80% at 86% 30%, rgba(255,255,255,.28), rgba(255,255,255,0) 70%), linear-gradient(180deg, rgba(255,255,255,0) 55%, rgba(255,255,255,.10) 100%)"
      : phase === "golden" ? "radial-gradient(110% 70% at " + side + " 100%, rgba(255,200,110,.75) 0%, rgba(255,150,105,.42) 30%, rgba(230,110,160,.16) 56%, rgba(230,110,160,0) 78%)"
      : phase === "twilight" ? "radial-gradient(120% 65% at " + side + " 100%, rgba(255,140,105,.72) 0%, rgba(225,105,160,.38) 33%, rgba(150,90,200,.12) 60%, rgba(150,90,200,0) 80%)"
      : "radial-gradient(60% 70% at 86% 30%, rgba(200,190,255,.16), rgba(200,190,255,0) 70%)";
    sky.querySelector(".sky-glow").style.background = glow;
    if (P.stars) buildStars();
    var orb = $("skyOrb"), isSun = phase === "day" || phase === "golden";
    // Tagsüber der kleine Sonnenbogen, nachts der Mond in seiner Phase
    var mini = ""; if (isSun) { try { mini = skyMini(now, sl.lat, sl.lon, st); } catch (e) { mini = ""; } }
    orb.classList.toggle("arc", !!mini);
    orb.innerHTML = mini || (isSun ? sunSvg() : moonSvg(mo));
    orb.style.setProperty("--orb-y", isSun && !mini ? Math.max(-14, Math.min(18, 18 - alt * 0.8)).toFixed(0) + "px" : "0px");
    var hr = now.getHours();
    var greet = hr < 5 ? "Gute Nacht" : hr < 11 ? "Guten Morgen" : hr < 17 ? "Guten Tag" : hr < 22 ? "Guten Abend" : "Gute Nacht";
    var known = loc ? (loc.name ? shortPlace(loc.name) : cachedPlace(loc)) : "";
    $("skyGreet").textContent = greet + " · " + (known || (loc ? "dein Standort" : "Deutschland (Mitte)"));
    if (loc && !known) resolvePlace(loc).then(function (n) { if (n) $("skyGreet").textContent = greet + " · " + n; });
    var big;
    if (st.polar === "day") big = "<span>Heute</span>Die Sonne geht nicht unter";
    else if (st.polar === "night") big = "<span>Heute</span>Die Sonne geht nicht auf";
    else if (now < st.rise) big = "<span>Sonnenaufgang</span>" + hm(st.rise);
    else if (now < st.set) big = "<span>Sonnenuntergang</span>" + hm(st.set);
    else big = "<span>Sonnenaufgang morgen</span>" + hm(new Date(st.rise.getTime() + 864e5));
    $("skyBig").innerHTML = big;
    var full = mo.toFull < 1 ? "heute Vollmond" : "Vollmond in " + Math.round(mo.toFull) + (Math.round(mo.toFull) === 1 ? " Tag" : " Tagen");
    $("skySub").textContent = mo.name + " " + Math.round(mo.illum * 100) + " % · " + full;
    $("skyMain").href = "./hw-index.html";
    $("skyMain").setAttribute("aria-label", greet + ". " + $("skyBig").textContent.replace(/(\D)(\d)/, "$1 $2") + ". " + $("skySub").textContent + ". HimmelsWahr öffnen");
    var chip = $("skyWx");
    if (get("wz_today_weather") === "on" && loc) {
      fetchWeather(loc).then(function (d) {
        if (!d || !d.current) return;
        var w = wxInfo(d.current.weather_code);
        chip.innerHTML = svg(WX_ICON[w.icon] || WX_ICON.cloud) + Math.round(d.current.temperature_2m) + "°";
        chip.setAttribute("aria-label", Math.round(d.current.temperature_2m) + " Grad, " + w.text); chip.title = w.text;
        chip.hidden = false;
        setOrbWx(w.icon);
      }).catch(function () { chip.hidden = true; setOrbWx(""); });
    } else { chip.hidden = true; setOrbWx(""); }
  }

  /* ---------- Zahlen sanft hochzählen (nur beim ersten Aufbau) ---------- */
  var counted = false, countOn = true;
  function countUp(root) {
    if (!countOn || !root) return;
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    Array.prototype.forEach.call(root.querySelectorAll("[data-count]"), function (el) {
      var node = null, walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) { if (/\d/.test(walker.currentNode.nodeValue)) { node = walker.currentNode; break; } }
      if (!node) return;
      var m = node.nodeValue.match(/\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+(?:,\d+)?/); if (!m) return;
      var raw = m[0], dec = raw.indexOf(",") !== -1 ? raw.split(",")[1].length : 0;
      var target = parseFloat(raw.replace(/\./g, "").replace(",", ".")); if (!isFinite(target) || target === 0) return;
      var pre = node.nodeValue.slice(0, m.index), post = node.nodeValue.slice(m.index + raw.length), t0 = null, dur = 700;
      function step(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        node.nodeValue = pre + (target * e).toLocaleString("de-DE", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + post;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  /* ---------- Darstellung der Startseite ----------
     wz_home_style: { fs: Schriftgröße-Faktor, text: Schriftfarbe, sat: Farbstärke in %, icon: Standard-Symbolfarbe, group: Ordnerfarbe für alle Gruppen ("" = je Bereich) } */
  var FONT_SIZES = [[0.9, "Klein"], [1, "Normal"], [1.12, "Groß"], [1.25, "Sehr groß"]];
  var TEXT_COLORS = [
    ["standard", "Standard", null, null],
    ["kraeftig", "Kräftig", "#140F24", "#FFFFFF"],
    ["violett", "Violett", "#3B2585", "#D8CCFA"],
    ["blaugrau", "Blaugrau", "#2B3345", "#DCE3F0"],
    ["warm", "Warm", "#3A2A22", "#F3E6DA"]
  ];
  function homeStyle() {
    var s = json("wz_home_style", null) || {};
    var fs = +s.fs; if (!FONT_SIZES.some(function (f) { return f[0] === fs; })) fs = 1;
    var sat = Math.round(+s.sat); if (!isFinite(sat) || sat < 40 || sat > 160) sat = 100;
    var text = TEXT_COLORS.some(function (t) { return t[0] === s.text; }) ? s.text : "standard";
    var ic = colorDef(s.icon) ? s.icon : "violett";
    var gc = colorDef(s.group) ? s.group : "";
    return { fs: fs, sat: sat, text: text, icon: ic, group: gc };
  }
  function saveHomeStyle(st) { set("wz_home_style", JSON.stringify(st)); applyHomeStyle(); }
  function applyHomeStyle() {
    var st = homeStyle(), r = document.documentElement;
    r.style.setProperty("--wz-fs", String(st.fs));
    r.style.setProperty("--hub-sat", String(st.sat / 100));
    var dark = window.wzTheme && wzTheme.isDark ? wzTheme.isDark() : r.classList.contains("theme-dark");
    var t = null; TEXT_COLORS.forEach(function (x) { if (x[0] === st.text) t = dark ? x[3] : x[2]; });
    var app = document.querySelector(".app");
    if (app) { if (t) app.style.setProperty("--wz-text", t); else app.style.removeProperty("--wz-text"); }
    r.classList.toggle("hub-big", st.fs >= 1.25);
  }

  /* ---------- Aufbau der Startseite: Blöcke verschieben und ausblenden ----------
     wz_home_blocks: { order: [blockId, …], off: { blockId: true } } – nur lokal, in der Sicherung enthalten */
  var HOME_BLOCKS = [
    { id: "jump", name: "Weitermachen", desc: "Zuletzt geöffnete App", ic: "recent", hide: true },
    { id: "favs", name: "Favoriten", desc: "Bis zu vier Apps und „Hier merken“", ic: "star", hide: true },
    { id: "heute", name: "Heute", desc: "Tagesaufgabe, Wetter, Sicherung …", ic: "today", hide: true },
    { id: "areas", name: "Apps", desc: "Alle Bereiche und Kacheln", ic: "grid", hide: false },
    { id: "tools", name: "Werkzeuge", desc: "Sichern, Einstellungen, Hinweise", ic: "tools", hide: false }
  ];
  var BLOCK_IC = {
    recent: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>', star: '<path d="M12 4l2.4 5 5.4.7-4 3.8 1 5.4L12 16.3 7.2 18.9l1-5.4-4-3.8 5.4-.7z"/>',
    today: '<rect x="4.5" y="5.5" width="15" height="14" rx="3"/><path d="M4.5 10h15M9 3.5v4M15 3.5v4"/>', grid: '<rect x="4.5" y="4.5" width="6" height="6" rx="1.6"/><rect x="13.5" y="4.5" width="6" height="6" rx="1.6"/><rect x="4.5" y="13.5" width="6" height="6" rx="1.6"/><rect x="13.5" y="13.5" width="6" height="6" rx="1.6"/>',
    info: '<circle cx="12" cy="12" r="8"/><path d="M12 11v5.2"/><circle cx="12" cy="7.9" r=".6" fill="currentColor"/>',
    bolt: '<path d="M13 3.5L5.5 13.5H11l-1 7 7.5-10H12z"/>', sort: '<path d="M5 7h14M7.5 12h9M10 17h4"/>', tools: '<path fill="currentColor" fill-rule="evenodd" stroke="currentColor" stroke-width=".9" stroke-linejoin="round" d="M10.12 4.33L10.37 1.93A10.20 10.20 0 0 1 13.63 1.93L13.88 4.33A7.90 7.90 0 0 1 16.10 5.25L17.97 3.73A10.20 10.20 0 0 1 20.27 6.03L18.75 7.90A7.90 7.90 0 0 1 19.67 10.12L22.07 10.37A10.20 10.20 0 0 1 22.07 13.63L19.67 13.88A7.90 7.90 0 0 1 18.75 16.10L20.27 17.97A10.20 10.20 0 0 1 17.97 20.27L16.10 18.75A7.90 7.90 0 0 1 13.88 19.67L13.63 22.07A10.20 10.20 0 0 1 10.37 22.07L10.12 19.67A7.90 7.90 0 0 1 7.90 18.75L6.03 20.27A10.20 10.20 0 0 1 3.73 17.97L5.25 16.10A7.90 7.90 0 0 1 4.33 13.88L1.93 13.63A10.20 10.20 0 0 1 1.93 10.37L4.33 10.12A7.90 7.90 0 0 1 5.25 7.90L3.73 6.03A10.20 10.20 0 0 1 6.03 3.73L7.90 5.25A7.90 7.90 0 0 1 10.12 4.33ZM8.40 12a3.60 3.60 0 1 0 7.20 0a3.60 3.60 0 1 0 -7.20 0Z"/>'
  };
  function blockIcon(k) { return '<svg class="wz-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + BLOCK_IC[k] + "</svg>"; }
  function blocksCfg() { var c = json("wz_home_blocks", null); return c && typeof c === "object" ? { order: Array.isArray(c.order) ? c.order : [], off: c.off && typeof c.off === "object" ? c.off : {} } : { order: [], off: {} }; }
  function saveBlocksCfg(c) { set("wz_home_blocks", JSON.stringify(c)); }
  /* Infozeilen unter den Apps (Rekord, Partien, Orte …): wz_home_stats = "off" blendet sie aus.
     Nur die Anzeige ändert sich – die Daten in den Apps bleiben unverändert. */
  function statsOn() { return get("wz_home_stats") !== "off"; }
  function applyStats() { document.documentElement.classList.toggle("wz-nostats", !statsOn()); }
  function blocksOrdered() {
    // Neue Blöcke, die in einer gespeicherten Reihenfolge noch fehlen, landen an ihrer Standardposition
    var ids = blocksCfg().order.filter(function (id) { return HOME_BLOCKS.some(function (b) { return b.id === id; }); });
    if (ids.length) HOME_BLOCKS.forEach(function (b, i) { if (ids.indexOf(b.id) === -1) ids.splice(Math.min(i, ids.length), 0, b.id); });
    return byList(HOME_BLOCKS, ids, "id");
  }
  function applyBlocks() {
    applyStats();
    var home = $("home"), anchor = home && home.querySelector(".wz-footer"); if (!home || !anchor) return;
    var cfg = blocksCfg(), list = blocksOrdered();
    list.forEach(function (b) {
      var el = $(b.id); if (!el) return;
      home.insertBefore(el, anchor);
      el.classList.toggle("blk-off", !!(b.hide && cfg.off[b.id]) && !(b.id === "sortwrap" && editMode));
    });
    // Die Zeile „Apps anordnen“ (mit „Fertig“) erscheint nur beim Anordnen, direkt über den Apps
    var sw = $("sortwrap"), ar = $("areas");
    if (sw) { sw.classList.toggle("blk-off", !editMode); if (editMode && ar) home.insertBefore(sw, ar); }
  }
  function startArrange() {
    set("wz_home_sort", "eigene"); editMode = true; renderSortBar(); renderAreas(); renderFavs();
    var s = $("sortwrap"); if (s) s.scrollIntoView({ block: "start", behavior: "smooth" });
  }
  function openHomeEdit(focusId, focusDir) {
    var cfg = blocksCfg(), list = blocksOrdered();
    var h = '<p class="hs-note" style="margin-top:2px">Mit den Pfeilen bestimmst du die Reihenfolge, mit dem Schalter blendest du einen Bereich aus.</p>';
    list.forEach(function (b, i) {
      var on = !(b.hide && cfg.off[b.id]);
      h += '<div class="row t-edit' + (on ? "" : " off") + '"><span class="r-ic">' + blockIcon(b.ic) + '</span><span class="r-txt"><span class="r-l">' + esc(b.name) + '</span><span class="r-note">' + esc(b.desc) + "</span></span>" +
        '<span class="mv-row">' + arrowBtn("up", b.name + " nach oben", 'data-bmv="' + b.id + '" data-dir="-1"', i === 0) + arrowBtn("down", b.name + " nach unten", 'data-bmv="' + b.id + '" data-dir="1"', i === list.length - 1) + "</span>" +
        (b.hide ? '<label class="sw"><input type="checkbox" data-bon="' + b.id + '"' + (on ? " checked" : "") + ' aria-label="' + esc(b.name) + ' anzeigen"><span></span></label>' : '<span class="sw-none" aria-hidden="true"></span>') + "</div>";
    });
    h += '<h3>Infos unter den Apps</h3><div class="row t-edit' + (statsOn() ? "" : " off") + '"><span class="r-ic">' + blockIcon("info") + '</span><span class="r-txt"><span class="r-l">Infos anzeigen</span><span class="r-note">Rekorde, Partien, Orte, Fahrten … unter den App-Namen</span></span>' +
      '<label class="sw"><input type="checkbox" data-statson' + (statsOn() ? " checked" : "") + ' aria-label="Infos unter den Apps anzeigen"><span></span></label></div>';
    var sm = sortMode();
    h += '<h3>Reihenfolge der Apps</h3><div class="hs-seg" role="group" aria-label="Apps sortieren">' + [["eigene", "Eigene"], ["az", "A–Z"], ["zuletzt", "Zuletzt genutzt"]].map(function (x) {
      return '<button type="button" data-hsort="' + x[0] + '" aria-pressed="' + (sm === x[0]) + '">' + x[1] + "</button>"; }).join("") + "</div>";
    h += '<h3>Mehr anpassen</h3><div class="hs-list">' +
      '<button type="button" data-go="today">Inhalte von „Heute“ wählen<span>Karten ein- und ausblenden</span></button>' +
      '<button type="button" data-go="arrange">Apps anordnen<span>Gruppen, Reihenfolge, Favoriten</span></button>' +
      '<button type="button" data-go="style">Farben und Schrift<span>Größe, Farbstärke, Symbole</span></button></div>' +
      '<button type="button" class="hs-reset">Ursprünglicher Aufbau</button>';
    var old = document.querySelector(".hs-wrap"); if (old) old.remove();
    openSheet("Startseite anpassen", h, function (w, close) {
      if (focusId) w.querySelector(".hs").style.animation = "none";
      var so = w.querySelector("[data-statson]");
      if (so) so.addEventListener("change", function () {
        if (so.checked) { try { localStorage.removeItem("wz_home_stats"); } catch (e) { } } else set("wz_home_stats", "off");
        applyStats(); renderJump(); so.closest(".t-edit").classList.toggle("off", !so.checked);
      });
      Array.prototype.forEach.call(w.querySelectorAll("[data-bon]"), function (inp) {
        inp.addEventListener("change", function () {
          var c = blocksCfg(), id = inp.getAttribute("data-bon");
          if (inp.checked) delete c.off[id]; else c.off[id] = true;
          saveBlocksCfg(c); applyBlocks(); inp.closest(".t-edit").classList.toggle("off", !inp.checked);
        });
      });
      Array.prototype.forEach.call(w.querySelectorAll("[data-bmv]"), function (btn) {
        btn.addEventListener("click", function () {
          var id = btn.getAttribute("data-bmv"), dir = +btn.getAttribute("data-dir");
          var ids = blocksOrdered().map(function (b) { return b.id; }), i = ids.indexOf(id), j = i + dir;
          if (j < 0 || j >= ids.length) return;
          ids.splice(j, 0, ids.splice(i, 1)[0]);
          var c = blocksCfg(); c.order = ids; saveBlocksCfg(c); applyBlocks();
          var top = w.querySelector(".hs").scrollTop;
          openHomeEdit(id, dir);
          var nw = document.querySelector(".hs-wrap .hs"); if (nw) nw.scrollTop = top;
        });
      });
      Array.prototype.forEach.call(w.querySelectorAll("[data-hsort]"), function (b) {
        b.addEventListener("click", function () {
          set("wz_home_sort", b.getAttribute("data-hsort")); editMode = false;
          Array.prototype.forEach.call(w.querySelectorAll("[data-hsort]"), function (o) { o.setAttribute("aria-pressed", String(o === b)); });
          renderSortBar(); renderAreas(); renderFavs();
        });
      });
      Array.prototype.forEach.call(w.querySelectorAll("[data-go]"), function (b) {
        b.addEventListener("click", function () {
          var go = b.getAttribute("data-go"); close();
          if (go === "style") { openStyle(); return; }
          var c = blocksCfg();
          if (go === "today") { if (c.off.heute) { delete c.off.heute; saveBlocksCfg(c); applyBlocks(); } todayEdit = true; renderToday(); var s = $("heute"); if (s) s.scrollIntoView({ block: "start", behavior: "smooth" }); }
          if (go === "arrange") startArrange();
        });
      });
      w.querySelector(".hs-reset").addEventListener("click", function () { try { localStorage.removeItem("wz_home_blocks"); localStorage.removeItem("wz_home_closed"); localStorage.removeItem("wz_home_stats"); } catch (e) { } applyBlocks(); renderJump(); renderAreas(); openHomeEdit("x"); });
      if (focusId) {
        var f = w.querySelector('[data-bmv="' + focusId + '"][data-dir="' + focusDir + '"]:not([disabled])') || w.querySelector('[data-bmv="' + focusId + '"]:not([disabled])');
        if (f) { try { f.focus({ preventScroll: true }); } catch (e) { } }
      }
    });
  }

  /* ---------- Sortierung der Startseite ---------- */
  // wz_home_sort: "eigene" | "az" | "zuletzt"; wz_home_order: { areas: [...], apps: { bereich: [...] } }
  // wz_recent: { appId: Zeitstempel } – wird von wz-core.js beim Öffnen einer App gesetzt
  var editMode = false;
  function sortMode() { var m = get("wz_home_sort"); return m === "az" || m === "zuletzt" ? m : "eigene"; }
  function orderPrefs() { var o = json("wz_home_order", null); return o && typeof o === "object" ? o : { areas: [], apps: {} }; }
  function byList(list, ids, key) { // Einträge nach gespeicherter Reihenfolge, neue hinten anhängen
    var pos = {}; (ids || []).forEach(function (id, i) { pos[id] = i; });
    return list.slice().sort(function (a, b) {
      var pa = pos[a[key]], pb = pos[b[key]];
      if (pa === undefined && pb === undefined) return list.indexOf(a) - list.indexOf(b);
      if (pa === undefined) return 1; if (pb === undefined) return -1; return pa - pb;
    });
  }
  function orderedAreas() { return byList(allGroups(), orderPrefs().areas, "id"); }
  function orderedApps(areaId) {
    var l = layout();
    var apps = WZ.APPS.filter(function (x) { return groupOf(x, l) === areaId; });
    var mode = sortMode();
    if (mode === "az") return apps.slice().sort(function (a, b) { return a.name.localeCompare(b.name, "de"); });
    var custom = byList(apps, (orderPrefs().apps || {})[areaId], "id");
    if (mode === "zuletzt") {
      var rec = json("wz_recent", {}) || {};
      return custom.slice().sort(function (a, b) { return (rec[b.id] || 0) - (rec[a.id] || 0) || custom.indexOf(a) - custom.indexOf(b); });
    }
    return custom;
  }
  function saveOrder(o) { set("wz_home_order", JSON.stringify(o)); }
  function moveArea(id, dir) {
    var ids = orderedAreas().map(function (a) { return a.id; }), i = ids.indexOf(id), j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    ids.splice(j, 0, ids.splice(i, 1)[0]);
    var o = orderPrefs(); o.areas = ids; saveOrder(o); renderAreas(id);
  }
  function moveApp(areaId, id, dir) {
    var ids = orderedApps(areaId).map(function (a) { return a.id; }), i = ids.indexOf(id), j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    ids.splice(j, 0, ids.splice(i, 1)[0]);
    var o = orderPrefs(); o.apps = o.apps || {}; o.apps[areaId] = ids; saveOrder(o); renderAreas(null, id);
  }
  var ARR = { up: '<path d="M12 19V5M6 11l6-6 6 6"/>', down: '<path d="M12 5v14M6 13l6 6 6-6"/>', left: '<path d="M19 12H5M11 6l-6 6 6 6"/>', right: '<path d="M5 12h14M13 6l6 6-6 6"/>' };
  function arrowBtn(dir, label, attrs, disabled) {
    return '<button type="button" class="mv" ' + attrs + ' aria-label="' + label + '"' + (disabled ? " disabled" : "") + '><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ARR[dir] + "</svg></button>";
  }
  function renderSortBar() {
    var bar = $("sortbar");
    if (!bar) return;
    // Sortieren, Farben und Anordnen stehen gebündelt unter „Startseite anpassen“;
    // diese Zeile gibt es nur noch während des Anordnens.
    bar.innerHTML = editMode ? '<span class="sort-title">Apps anordnen</span><button type="button" class="sort-act on" id="sortDone">Fertig</button>' : "";
    var d = $("sortDone"); if (d) d.addEventListener("click", function () { editMode = false; renderSortBar(); renderAreas(); renderFavs(); toTop(); });
    $("sortHint").hidden = !editMode;
    applyBlocks();
  }

  var PEN = '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>';
  var BIN = '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>';
  function smallBtn(p, label, attrs) {
    return '<button type="button" class="mv" ' + attrs + ' aria-label="' + label + '" title="' + label + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + "</svg></button>";
  }
  /* Eingeklappte Bereiche: wz_home_closed = { bereichId: true } – nur lokal, in der Sicherung enthalten */
  function closedAreas() { var c = json("wz_home_closed", null); return c && typeof c === "object" && !Array.isArray(c) ? c : {}; }
  function toggleArea(id) {
    var c = closedAreas(), sec = document.getElementById(id); if (!sec) return;
    if (c[id]) delete c[id]; else c[id] = true;
    set("wz_home_closed", JSON.stringify(c));
    sec.classList.toggle("closed", !!c[id]);
    var b = sec.querySelector("[data-toggle]"), t = groupTitle(id);
    if (b) { b.setAttribute("aria-expanded", String(!c[id])); b.setAttribute("aria-label", t + (c[id] ? " aufklappen" : " einklappen")); }
  }
  function renderAreas(focusArea, focusApp) {
    var h = "", areas = orderedAreas(), l = layout(), closed = closedAreas();
    var visible = areas.filter(function (a) { return editMode || orderedApps(a.id).length; });
    visible.forEach(function (a, ai) {
      var apps = orderedApps(a.id);
      if (!editMode) {
        var art = areaArt(a.id, l);
        h += '<section class="sec area ar-' + esc(a.id) + designCls(a.id, l) + (closed[a.id] ? " closed" : "") + '" id="' + esc(a.id) + '" aria-labelledby="h-' + esc(a.id) + '"' + groupStyle(a.id, l) + '><div class="area-card">' +
          '<svg class="area-orn" viewBox="0 0 230 150" aria-hidden="true">' + art.orn + "</svg>" +
          '<div class="area-h"><span class="area-em"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + art.em + "</svg></span>" +
          '<span class="area-t"><h2 id="h-' + esc(a.id) + '">' + esc(a.title) + "</h2>" + (a.sub ? "<p>" + esc(a.sub) + "</p>" : "") + "</span>" +
          '<span class="area-n">' + apps.length + (apps.length === 1 ? " App" : " Apps") + "</span>" +
          '<button type="button" class="area-tg" data-toggle="' + esc(a.id) + '" aria-expanded="' + !closed[a.id] + '" aria-controls="g-' + esc(a.id) + '" aria-label="' + esc(a.title) + (closed[a.id] ? " aufklappen" : " einklappen") + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button></div>' +
          '<div class="area-mini">' + apps.map(function (x) { return '<a href="./' + x.href + '" data-app="' + x.id + '" aria-label="' + esc(x.name) + '" title="' + esc(x.name) + '">' + appIcon(x, l) + "</a>"; }).join("") + "</div>" +
          '<div class="grid apps" id="g-' + esc(a.id) + '">' + apps.map(function (x) {
            return '<a class="tile" href="./' + x.href + '" data-app="' + x.id + '">' + appIcon(x, l) +
              '<span class="t-txt"><span class="t-name">' + nameHtml(x.name) + '</span><span class="t-sub">' + esc(x.sub) + '</span><span class="t-stat" data-count data-stat="' + x.id + '">' + esc(statFor(x.id)) + "</span></span></a>";
          }).join("") + "</div></div></section>";
        return;
      }
      h += '<section class="sec' + (editMode ? " editing" : "") + '" id="' + esc(a.id) + '" aria-labelledby="h-' + esc(a.id) + '"><div class="sec-h"><h2 id="h-' + esc(a.id) + '">' + esc(a.title) + "</h2>" +
        (editMode ? '<span class="mv-row">' +
          '<button type="button" class="mv t-color g-color" data-gcolor="' + esc(a.id) + '" aria-label="Ordnerfarbe für ' + esc(a.title) + '" title="Ordnerfarbe"' + groupStyle(a.id, l) + "><span></span></button>" +
          smallBtn(PEN, "Gruppe „" + esc(a.title) + "“ gestalten: Name, Symbol, Schrift, Darstellung", 'data-rename="' + esc(a.id) + '"') +
          (!a.builtin && !apps.length ? smallBtn(BIN, "Gruppe „" + esc(a.title) + "“ löschen", 'data-delgroup="' + esc(a.id) + '"') : "") +
          arrowBtn("up", esc(a.title) + " nach oben", 'data-area="' + esc(a.id) + '" data-dir="-1"', ai === 0) +
          arrowBtn("down", esc(a.title) + " nach unten", 'data-area="' + esc(a.id) + '" data-dir="1"', ai === visible.length - 1) + "</span>"
          : "") +
        '</div><div class="grid">';
      if (editMode && !apps.length) h += '<p class="grp-empty">Leere Gruppe – verschiebe Apps über „Gruppe“ hierher.</p>';
      apps.forEach(function (x, xi) {
        var isFav = favs().indexOf(x.id) !== -1;
        var inner = appIcon(x, l) + "<span><span class=\"t-name\" style=\"display:block\">" + x.name +
          '</span><span class="t-sub" style="display:block">' + x.sub + '</span><span class="t-stat" style="display:block" data-stat="' + x.id + '">' + esc(statFor(x.id)) + "</span></span>";
        if (editMode) {
          var opts = areas.map(function (g) { return '<option value="' + esc(g.id) + '"' + (g.id === a.id ? " selected" : "") + ">" + esc(g.title) + "</option>"; }).join("");
          h += '<div class="tile is-edit" data-app="' + x.id + '">' + inner +
            '<label class="t-grp"><span>Gruppe</span><select data-assign="' + x.id + '" aria-label="Gruppe für ' + x.name + '">' + opts + "</select></label>" +
            '<span class="mv-row tile-mv">' +
            '<button type="button" class="mv t-fav' + (isFav ? " on" : "") + '" data-fav="' + x.id + '" aria-pressed="' + isFav + '" aria-label="' + x.name + (isFav ? " aus den Favoriten nehmen" : " als Favorit") + '" title="Favorit"><svg viewBox="0 0 24 24" fill="' + (isFav ? "currentColor" : "none") + '" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12.00 3.30L14.57 9.06L20.84 9.73L16.16 13.95L17.47 20.12L12.00 16.97L6.53 20.12L7.84 13.95L3.16 9.73L9.43 9.06Z"/></svg></button>' +
            '<button type="button" class="mv t-color" data-color="' + x.id + '" aria-label="Symbolfarbe für ' + x.name + '" title="Symbolfarbe"><span' + iconStyle(x.id, l) + "></span></button>" +
            arrowBtn("left", x.name + " nach vorne", 'data-app-mv="' + x.id + '" data-area-of="' + esc(a.id) + '" data-dir="-1"', xi === 0) +
            arrowBtn("right", x.name + " nach hinten", 'data-app-mv="' + x.id + '" data-area-of="' + esc(a.id) + '" data-dir="1"', xi === apps.length - 1) + "</span></div>";
        }
      });
      h += "</div></section>";
    });
    if (editMode) h += '<button type="button" class="grp-add" id="grpAdd">+ Neue Gruppe</button>';
    $("areas").innerHTML = h;
    if (editMode) {
      Array.prototype.forEach.call($("areas").querySelectorAll("[data-area]"), function (b) {
        b.addEventListener("click", function () { moveArea(b.getAttribute("data-area"), +b.getAttribute("data-dir")); });
      });
      Array.prototype.forEach.call($("areas").querySelectorAll("[data-app-mv]"), function (b) {
        b.addEventListener("click", function () { moveApp(b.getAttribute("data-area-of"), b.getAttribute("data-app-mv"), +b.getAttribute("data-dir")); });
      });
      Array.prototype.forEach.call($("areas").querySelectorAll("[data-assign]"), function (sel) {
        sel.addEventListener("change", function () { assignApp(sel.getAttribute("data-assign"), sel.value); });
      });
      Array.prototype.forEach.call($("areas").querySelectorAll("[data-fav]"), function (b) {
        b.addEventListener("click", function () { toggleFav(b.getAttribute("data-fav")); });
      });
      Array.prototype.forEach.call($("areas").querySelectorAll("[data-color]"), function (b) {
        b.addEventListener("click", function () { pickColor(b.getAttribute("data-color")); });
      });
      Array.prototype.forEach.call($("areas").querySelectorAll("[data-gcolor]"), function (b) {
        b.addEventListener("click", function () { pickGroupColor(b.getAttribute("data-gcolor")); });
      });
      Array.prototype.forEach.call($("areas").querySelectorAll("[data-rename]"), function (b) {
        b.addEventListener("click", function () { designGroup(b.getAttribute("data-rename")); });
      });
      Array.prototype.forEach.call($("areas").querySelectorAll("[data-delgroup]"), function (b) {
        b.addEventListener("click", function () { deleteGroup(b.getAttribute("data-delgroup")); });
      });
      var ga = $("grpAdd"); if (ga) ga.addEventListener("click", addGroup);
      var f = focusArea ? document.querySelector('[data-area="' + focusArea + '"]:not([disabled])') : focusApp ? (document.querySelector('[data-app-mv="' + focusApp + '"]:not([disabled])') || document.querySelector('[data-fav="' + focusApp + '"]')) : null;
      if (f) { try { f.focus({ preventScroll: true }); } catch (e) { } }
      if (focusArea) { var sec = document.getElementById(focusArea); if (sec) sec.scrollIntoView({ block: "nearest" }); }
      return;
    }
    Array.prototype.forEach.call($("areas").querySelectorAll(".area-h"), function (head) {
      head.addEventListener("click", function () { var b = head.querySelector("[data-toggle]"); if (b) toggleArea(b.getAttribute("data-toggle")); });
    });
    countUp($("areas"));
    // asynchron: WowarWahr und BelegParkWahr
    idbReadAll("wowarwahr", ["visits", "trips", "countries"]).then(function (r) {
      if (!r || !r.visits) return;
      var c = {}; r.visits.forEach(function (v) { if (v.cid) c[v.cid] = 1; }); (r.countries || []).forEach(function (x) { if (x.visited) c[x.id] = 1; });
      var n = Object.keys(c).length, el = document.querySelector('[data-stat="wow"]');
      if (el && (n || r.visits.length)) el.textContent = n + (n === 1 ? " Land · " : " Länder · ") + r.visits.length + (r.visits.length === 1 ? " Ort" : " Orte");
    });
    idbReadAll("parken-und-belege", ["parkscheine", "nebenkosten", "fahrten"]).then(function (r) {
      if (!r) return;
      var mk = ymd(new Date()).slice(0, 7), sum = 0, cnt = 0;
      ["parkscheine", "nebenkosten", "fahrten"].forEach(function (s) { (r[s] || []).forEach(function (e) { if (e && e.date && e.date.indexOf(mk) === 0) { sum += +e.betrag || 0; cnt++; } }); });
      var el = document.querySelector('[data-stat="bp"]');
      if (el && cnt) el.textContent = eur(sum) + " diesen Monat";
    });
  }

  /* ---------- Gruppen bearbeiten ---------- */
  function assignApp(appId, groupId) {
    var l = layout(), app = WZ.app(appId); if (!app) return;
    if (groupId === app.area) delete l.assign[appId]; else l.assign[appId] = groupId;
    saveLayout(l);
    // an das Ende der neuen Gruppe stellen
    var o = orderPrefs(); o.apps = o.apps || {};
    var ids = orderedApps(groupId).map(function (a) { return a.id; }).filter(function (i) { return i !== appId; });
    ids.push(appId); o.apps[groupId] = ids; saveOrder(o);
    renderAreas(null, appId);
    toast("„" + app.name + "“ liegt jetzt in „" + groupTitle(groupId) + "“");
  }
  function groupTitle(id) { var t = ""; allGroups().forEach(function (g) { if (g.id === id) t = g.title; }); return t; }
  function addGroup() {
    askText("Neue Gruppe", "", function (v) {
      if (!v) return;
      var l = layout(), id = "g" + Date.now().toString(36);
      l.custom.push({ id: id, title: v }); saveLayout(l);
      var o = orderPrefs(); o.areas = orderedAreas().map(function (a) { return a.id; }); saveOrder(o);
      renderAreas(id);
      // gleich weiter zum Gestalten (Symbol, Schrift, Darstellung)
      setTimeout(function () { designGroup(id); }, 260);
    }, "z. B. Favoriten");
  }
  function deleteGroup(id) {
    var l = layout();
    l.custom = l.custom.filter(function (g) { return g.id !== id; });
    Object.keys(l.assign).forEach(function (k) { if (l.assign[k] === id) delete l.assign[k]; });
    delete l.gcolors[id];
    delete l.gdesign[id];
    saveLayout(l); renderAreas();
  }

  /* ---------- Gruppe gestalten: Name, Untertitel, Symbol, Farbe, Schrift, Darstellung ----------
     Vorschau oben zeigt jede Änderung sofort; gespeichert wird mit „Übernehmen“. */
  function designGroup(id) {
    var l = layout(), builtin = WZ.AREAS.filter(function (a) { return a.id === id; })[0];
    var d = JSON.parse(JSON.stringify(groupDesign(id, l)));
    var name = groupTitle(id), gc = l.gcolors[id] || "";
    var defSub = builtin ? builtin.sub : "";
    var sub = typeof d.sub === "string" ? d.sub : (builtin && !l.names[id] ? builtin.sub : "");
    function seg(list, key, attr) {
      return '<div class="hs-seg" role="group">' + list.map(function (x) { return '<button type="button" ' + attr + '="' + x[0] + '" aria-pressed="' + (inList(list, d[key]) === x[0]) + '"' + (attr === "data-gf" ? ' class="gf-btn gf-' + (x[0] || "std") + '"' : "") + ">" + x[1] + "</button>"; }).join("") + "</div>";
    }
    var curIc = d.ic && groupIconDef(d.ic) ? d.ic : "";
    var icH = '<div class="hs-ic">' + '<button type="button" data-gi="" class="' + (!curIc ? "on" : "") + '" aria-label="Standard-Symbol"><span class="sw-std">Std</span></button>' +
      GROUP_ICONS.map(function (g) { return '<button type="button" data-gi="' + g[0] + '" class="' + (curIc === g[0] ? "on" : "") + '" aria-label="' + esc(g[1]) + '" title="' + esc(g[1]) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + g[2] + "</svg></button>"; }).join("") + "</div>";
    var tilesH = '<div class="hs-tl">' + G_TILES.map(function (t) {
      return '<button type="button" data-gt="' + t[0] + '" aria-pressed="' + (inList(G_TILES, d.tiles) === t[0]) + '"><span class="tl-pv tl-pv-' + (t[0] || "normal") + '" aria-hidden="true"><i></i><i></i><i></i><i></i></span><b>' + t[1] + "</b><em>" + t[2] + "</em></button>";
    }).join("") + "</div>";
    var body =
      '<div class="gd-prev" id="gdPrev"></div>' +
      '<h3>Name</h3><input class="hs-in" id="gdName" type="text" maxlength="30" autocomplete="off" value="' + esc(name) + '">' +
      '<h3>Untertitel</h3><input class="hs-in" id="gdSub" type="text" maxlength="44" autocomplete="off" value="' + esc(sub) + '" placeholder="optional, z. B. Draußen unterwegs">' +
      '<h3>Symbol</h3>' + icH +
      '<h3>Ordnerfarbe</h3>' + swatches(gc, true, "data-gd") +
      '<h3>Schrift der Überschrift</h3>' + seg(G_FONTS, "font", "data-gf") +
      '<h3>Größe der Überschrift</h3>' + seg(G_SIZES, "size", "data-gz") +
      '<h3>Stil der Überschrift</h3>' + seg(G_STYLES, "style", "data-gy") +
      '<h3>Darstellung der Apps</h3>' + tilesH +
      '<button type="button" class="hs-ok" id="gdOk" style="margin-top:20px">Übernehmen</button>' +
      '<button type="button" class="hs-reset" id="gdReset">Gestaltung auf Standard</button>';
    openSheet("Gruppe gestalten", body, function (w, close) {
      var inName = w.querySelector("#gdName"), inSub = w.querySelector("#gdSub");
      function preview() {
        var tmp = layout(); tmp.gdesign[id] = d; if (gc) tmp.gcolors[id] = gc; else delete tmp.gcolors[id];
        var art = areaArt(id, tmp);
        w.querySelector("#gdPrev").innerHTML = '<div class="sec area ar-' + esc(id) + designCls(id, tmp) + '"' + groupStyle(id, tmp) + '><div class="area-h"><span class="area-em"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + art.em + "</svg></span>" +
          '<span class="area-t"><h2>' + esc(inName.value.trim() || name) + "</h2>" + (inSub.value.trim() ? "<p>" + esc(inSub.value.trim()) + "</p>" : "") + "</span></div></div>";
      }
      function pick(attr, key, list) {
        Array.prototype.forEach.call(w.querySelectorAll("[" + attr + "]"), function (b) {
          b.addEventListener("click", function () {
            var v = b.getAttribute(attr);
            if (v) d[key] = v; else delete d[key];
            Array.prototype.forEach.call(w.querySelectorAll("[" + attr + "]"), function (x) { if (list) x.setAttribute("aria-pressed", String(x === b)); else x.classList.toggle("on", x === b); });
            preview();
          });
        });
      }
      pick("data-gi", "ic"); pick("data-gf", "font", 1); pick("data-gz", "size", 1); pick("data-gy", "style", 1); pick("data-gt", "tiles", 1);
      Array.prototype.forEach.call(w.querySelectorAll("[data-gd]"), function (b) {
        b.addEventListener("click", function () { gc = b.getAttribute("data-gd"); Array.prototype.forEach.call(w.querySelectorAll("[data-gd]"), function (x) { x.classList.toggle("on", x === b); }); preview(); });
      });
      inName.addEventListener("input", preview); inSub.addEventListener("input", preview);
      w.querySelector("#gdOk").addEventListener("click", function () {
        var l2 = layout(), v = inName.value.trim().slice(0, 30), sv = inSub.value.trim().slice(0, 44);
        if (builtin) { if (!v || v === builtin.title) delete l2.names[id]; else l2.names[id] = v; }
        else if (v) l2.custom.forEach(function (g) { if (g.id === id) g.title = v; });
        // Untertitel nur speichern, wenn er vom Standard abweicht
        var stdSub = builtin && !l2.names[id] ? defSub : "";
        if (sv === stdSub) delete d.sub; else d.sub = sv;
        if (Object.keys(d).length) l2.gdesign[id] = d; else delete l2.gdesign[id];
        if (gc) l2.gcolors[id] = gc; else delete l2.gcolors[id];
        saveLayout(l2); close(); renderAreas(id); toast("Gruppe „" + groupTitle(id) + "“ gestaltet");
      });
      w.querySelector("#gdReset").addEventListener("click", function () {
        var l2 = layout(); delete l2.gdesign[id]; delete l2.gcolors[id]; saveLayout(l2); close(); renderAreas(id); toast("Gestaltung zurückgesetzt");
      });
      preview();
    });
  }

  /* ---------- Kleine Dialoge (Bottom-Sheet) ---------- */
  function openSheet(title, bodyHtml, onReady) {
    var wrap = document.createElement("div");
    wrap.className = "hs-wrap"; wrap.setAttribute("role", "dialog"); wrap.setAttribute("aria-modal", "true"); wrap.setAttribute("aria-label", title);
    wrap.innerHTML = '<div class="hs"><div class="hs-head"><h2>' + esc(title) + '</h2><button type="button" class="hs-x" aria-label="Schließen"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' + bodyHtml + "</div>";
    function close() { wrap.remove(); document.removeEventListener("keydown", onKey); }
    function onKey(e) { if (e.key === "Escape") close(); }
    wrap.addEventListener("click", function (e) { if (e.target === wrap) close(); });
    wrap.querySelector(".hs-x").addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    document.body.appendChild(wrap);
    if (onReady) onReady(wrap, close);
    return close;
  }
  function askText(title, value, done, placeholder) {
    openSheet(title, '<input class="hs-in" type="text" maxlength="30" autocomplete="off" value="' + esc(value || "") + '" placeholder="' + esc(placeholder || "") + '"><button type="button" class="hs-ok">Übernehmen</button>', function (w, close) {
      var inp = w.querySelector(".hs-in");
      function ok() { var v = inp.value.trim().slice(0, 30); close(); done(v); }
      w.querySelector(".hs-ok").addEventListener("click", ok);
      inp.addEventListener("keydown", function (e) { if (e.key === "Enter") ok(); });
      setTimeout(function () { try { inp.focus(); inp.select(); } catch (e) { } }, 60);
    });
  }
  function swatches(current, withDefault, attr) {
    attr = attr || "data-c";
    return '<div class="hs-sw">' + (withDefault ? '<button type="button" ' + attr + '="" class="' + (!current ? "on" : "") + '"><span class="sw-std">Std</span><em>Standard</em></button>' : "") +
      ICON_COLORS.map(function (c) { return '<button type="button" ' + attr + '="' + c[0] + '" class="' + (current === c[0] ? "on" : "") + '"><span style="background:' + gradient(c[0]) + '"></span><em>' + c[1] + "</em></button>"; }).join("") + "</div>";
  }
  function pickGroupColor(groupId) {
    var l = layout();
    openSheet("Ordnerfarbe: " + groupTitle(groupId), '<p class="hs-note">„Standard“ übernimmt die Ordnerfarbe aus „Startseite gestalten“.</p>' + swatches(l.gcolors[groupId] || "", true), function (w, close) {
      Array.prototype.forEach.call(w.querySelectorAll("[data-c]"), function (b) {
        b.addEventListener("click", function () {
          var l2 = layout(), c = b.getAttribute("data-c");
          if (c) l2.gcolors[groupId] = c; else delete l2.gcolors[groupId];
          saveLayout(l2); close(); renderAreas(groupId);
        });
      });
    });
  }
  function pickColor(appId) {
    var l = layout(), app = WZ.app(appId);
    openSheet("Symbolfarbe: " + app.name, swatches(l.colors[appId] || "", true), function (w, close) {
      Array.prototype.forEach.call(w.querySelectorAll("[data-c]"), function (b) {
        b.addEventListener("click", function () {
          var l2 = layout(), c = b.getAttribute("data-c");
          if (c) l2.colors[appId] = c; else delete l2.colors[appId];
          saveLayout(l2); close(); renderAreas(null, appId); renderFavs();
        });
      });
    });
  }
  function openStyle() {
    var st = homeStyle();
    var fsH = '<div class="hs-seg" role="group" aria-label="Schriftgröße">' + FONT_SIZES.map(function (f) { return '<button type="button" data-fs="' + f[0] + '" aria-pressed="' + (st.fs === f[0]) + '">' + f[1] + "</button>"; }).join("") + "</div>";
    var tcH = '<div class="hs-tc">' + TEXT_COLORS.map(function (t) {
      var dot = t[2] ? '<span style="background:linear-gradient(135deg,' + t[2] + ' 50%,' + t[3] + ' 50%)"></span>' : '<span class="sw-std">Std</span>';
      return '<button type="button" data-tc="' + t[0] + '" aria-pressed="' + (st.text === t[0]) + '">' + dot + "<em>" + t[1] + "</em></button>";
    }).join("") + "</div>";
    var body =
      '<h3>Schriftgröße</h3>' + fsH +
      '<h3>Schriftfarbe</h3>' + tcH +
      '<h3>Farbstärke <output id="hsSatV">' + st.sat + ' %</output></h3><input type="range" id="hsSat" min="40" max="160" step="10" value="' + st.sat + '" aria-label="Farbstärke">' +
      '<div class="hs-scale"><span>dezent</span><span>kräftig</span></div>' +
      '<h3>Symbolfarbe für alle Apps</h3><p class="hs-note">Einzelne Apps färbst du unter „Anordnen“ um.</p>' + swatches(st.icon, false) +
      '<h3>Ordnerfarbe für alle Gruppen</h3><p class="hs-note">„Standard“ = je Bereich leicht abgestuft. Einzelne Ordner färbst du unter „Anordnen“ um.</p>' + swatches(st.group, true, "data-gc") +
      '<button type="button" class="hs-reset">Alles auf Standard</button>';
    openSheet("Startseite gestalten", body, function (w) {
      function upd(fn) { var s2 = homeStyle(); fn(s2); saveHomeStyle(s2); renderAreas(); renderToday(); renderFavs(); }
      Array.prototype.forEach.call(w.querySelectorAll("[data-fs]"), function (b) {
        b.addEventListener("click", function () { upd(function (s2) { s2.fs = +b.getAttribute("data-fs"); }); Array.prototype.forEach.call(w.querySelectorAll("[data-fs]"), function (x) { x.setAttribute("aria-pressed", String(x === b)); }); });
      });
      Array.prototype.forEach.call(w.querySelectorAll("[data-tc]"), function (b) {
        b.addEventListener("click", function () { upd(function (s2) { s2.text = b.getAttribute("data-tc"); }); Array.prototype.forEach.call(w.querySelectorAll("[data-tc]"), function (x) { x.setAttribute("aria-pressed", String(x === b)); }); });
      });
      var sat = w.querySelector("#hsSat");
      sat.addEventListener("input", function () { w.querySelector("#hsSatV").textContent = sat.value + " %"; var s2 = homeStyle(); s2.sat = +sat.value; saveHomeStyle(s2); });
      Array.prototype.forEach.call(w.querySelectorAll("[data-c]"), function (b) {
        b.addEventListener("click", function () { upd(function (s2) { s2.icon = b.getAttribute("data-c"); }); Array.prototype.forEach.call(w.querySelectorAll("[data-c]"), function (x) { x.classList.toggle("on", x === b); }); });
      });
      Array.prototype.forEach.call(w.querySelectorAll("[data-gc]"), function (b) {
        b.addEventListener("click", function () { upd(function (s2) { s2.group = b.getAttribute("data-gc"); }); Array.prototype.forEach.call(w.querySelectorAll("[data-gc]"), function (x) { x.classList.toggle("on", x === b); }); });
      });
      w.querySelector(".hs-reset").addEventListener("click", function () {
        try { localStorage.removeItem("wz_home_style"); } catch (e) { }
        applyHomeStyle(); renderAreas(); renderToday();
        w.remove(); openStyle();
      });
    });
  }
  function toast(msg) {
    var t = document.createElement("div"); t.className = "hs-toast"; t.setAttribute("role", "status"); t.textContent = msg;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2600);
  }

  /* ---------- Übergabe an eine App (wie beim Scanner, nur für diesen Seitenwechsel) ---------- */
  function handoff(data, href) {
    data.ts = Date.now();
    try { sessionStorage.setItem("wz_scan_handoff", JSON.stringify(data)); } catch (e) { }
    location.href = href;
  }

  /* ---------- Ein Eingabefeld für alles ----------
     Der Text im Suchfeld kann direkt als neuer Eintrag angelegt werden. Es wird nur
     vorgeschlagen – angelegt wird erst in der jeweiligen App, nach deinem Tipp. */
  function qeMoney(n) { return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function qeParse(raw) {
    var t = raw.replace(/\s+/g, " ").trim(), p = { raw: t, amount: null, rhythm: null, qty: null, title: t };
    var noDate = t.replace(/\d{1,2}[.\/]\d{1,2}[.\/]\d{2,4}/g, " ");
    var m = noDate.match(/(\d{1,5}(?:[.,]\d{1,2})?)\s*(?:€|euro\b|eur\b)/i) || noDate.match(/(?:^|\s)(\d{1,5}[.,]\d{2})(?!\d)/);
    if (m) {
      var v = parseFloat(m[1].replace(",", "."));
      if (isFinite(v) && v > 0) { p.amount = v; p.title = t.replace(m[0], " "); }
    }
    var low = t.toLowerCase();
    if (/j[aä]hrlich|pro jahr|im jahr|jahresbeitrag/.test(low)) p.rhythm = "yearly";
    else if (/viertelj[aä]hr|quartal/.test(low)) p.rhythm = "quarterly";
    else if (/monatlich|pro monat|im monat|\bmtl\b|\babo\b/.test(low)) p.rhythm = "monthly";
    p.title = p.title.replace(/\b(j[aä]hrlich|viertelj[aä]hrlich|monatlich|pro jahr|im jahr|pro monat|im monat|pro quartal|mtl\.?)\b/gi, " ").replace(/\s+/g, " ").replace(/^[\s,;:–-]+|[\s,;:–-]+$/g, "");
    var q = t.match(/^(\d{1,3})\s*(?:x|×|mal|stück|stk\.?|gläser|glas|dosen|dose|flaschen|flasche|packungen|packung|pck\.?|beutel|tüten|tüte|becher|tafeln|tafel)?\s+(\D.*)$/i);
    if (q && p.amount === null) { p.qty = Math.min(999, parseInt(q[1], 10)); p.item = q[2].trim(); }
    return p;
  }
  function qeGuess(p) {
    var low = p.raw.toLowerCase();
    if (p.amount !== null && p.rhythm) return "abo";
    if (p.amount !== null) return /park(schein|platz|haus|en\b|geb)/.test(low) ? "park" : "beleg";
    if (p.qty !== null || /\b(vorrat|eingekocht|eingemacht|haltbar bis|mhd|marmelade|konfit[uü]re|eingefroren)\b/.test(low)) return "vorrat";
    return "gedanke";
  }
  var QE_RHYTHM = { monthly: "monatlich", quarterly: "vierteljährlich", yearly: "jährlich" };
  function qeTargets(p) {
    var title = p.title || p.raw, amt = p.amount !== null ? qeMoney(p.amount) + " €" : "";
    var park = /park/i.test(p.raw);
    return {
      gedanke: { app: "ld", label: "LosDenkWahr", value: "Als Gedanke wegparken", note: "„" + p.raw + "“",
        go: function () { handoff({ t: "gedanke", text: p.raw }, "./ld-index.html"); } },
      beleg: park
        ? { app: "bp", label: "BelegParkWahr", value: "Als Parkschein erfassen", note: [title, amt].filter(Boolean).join(" · "),
            go: function () { handoff({ t: "park", text: p.raw, titel: title, betrag: p.amount !== null ? qeMoney(p.amount) : "" }, "./bp-app.html"); } }
        : { app: "bp", label: "BelegParkWahr", value: "Als Beleg erfassen", note: [title, amt].filter(Boolean).join(" · "),
            go: function () { handoff({ t: "beleg", text: p.raw, titel: title, betrag: p.amount !== null ? qeMoney(p.amount) : "" }, "./bp-app.html"); } },
      vorrat: { app: "vw", label: "VorratsWahr", value: "Als Vorrat eintragen", note: (p.qty !== null ? p.qty + " × " + p.item : p.raw),
        go: function () { handoff({ t: "vorrat", text: p.qty !== null ? p.item : p.raw, anzahl: p.qty !== null ? p.qty : 1, kurz: true }, "./vw-index.html"); } },
      abo: { app: "aw", label: "AlltagWahr", value: "Als wiederkehrende Ausgabe", note: [title, amt ? amt + " " + QE_RHYTHM[p.rhythm || "monthly"] : ""].filter(Boolean).join(" · "),
        go: function () { handoff({ t: "abo", name: title, betrag: p.amount, rhythm: p.rhythm || "monthly" }, "./aw-index.html"); } }
    };
  }
  function qeHtml(raw) {
    var p = qeParse(raw), T = qeTargets(p), g = qeGuess(p);
    if (g === "park") g = "beleg";
    var order = [g].concat(["gedanke", "beleg", "vorrat", "abo"].filter(function (k) { return k !== g; }));
    return '<div class="res-group" id="qeGroup"><h3>Neu anlegen</h3><div class="card today">' + order.map(function (k, i) {
      var t = T[k];
      return row({ onClick: true, cls: "qe", id: "qe-" + k, icon: t.app, label: t.label, value: esc(t.value) + (i === 0 ? '<span class="qe-tag">Vorschlag</span>' : ""), note: esc(t.note), button: CHEV });
    }).join("") + "</div></div>";
  }
  function qeBind(raw) {
    var T = qeTargets(qeParse(raw));
    Object.keys(T).forEach(function (k) { var b = $("qe-" + k); if (b) b.addEventListener("click", T[k].go); });
  }

  /* ---------- Hier merken ----------
     Ein Tipp ermittelt den Standort (nur auf dem Gerät) und legt ihn dort ab, wo er hingehört. */
  function hereFmt(lat, lon) {
    function f(v, pos, neg) { return Math.abs(v).toLocaleString("de-DE", { minimumFractionDigits: 5, maximumFractionDigits: 5 }) + "° " + (v >= 0 ? pos : neg); }
    return f(lat, "N", "S") + ", " + f(lon, "O", "W");
  }
  function hereSaveWaypoint(name, lat, lon, replace) {
    var list = json("kw-waypoints", []); if (!Array.isArray(list)) list = [];
    if (replace) list = list.filter(function (w) { return w && w.name !== name; });
    list.push({ id: Date.now(), name: name, lat: lat, lon: lon, ts: new Date().toISOString() });
    set("kw-waypoints", JSON.stringify(list));
  }
  function openHere() {
    openSheet("Hier merken", '<div id="hereBody"><p class="hs-note" style="margin:6px 0 4px">Standort wird ermittelt …</p></div>', function (w, close) {
      var body = w.querySelector("#hereBody");
      function fail(msg) { body.innerHTML = '<p class="hs-note" style="margin:6px 0 14px">' + esc(msg) + '</p><button type="button" class="hs-ok" id="hereAgain">Noch einmal versuchen</button>'; body.querySelector("#hereAgain").addEventListener("click", function () { close(); openHere(); }); }
      function saved(name) {
        body.innerHTML = '<div class="here-pos"><b>Gemerkt: ' + esc(name) + '</b>KompassWahr zeigt dir jederzeit Richtung und Entfernung dorthin – auch ohne Netz.</div>' +
          '<div class="hs-list"><a href="./kw-index.html">In KompassWahr öffnen<span>Richtung und Entfernung zum Wegpunkt</span></a></div><button type="button" class="hs-reset" id="hereDone" style="margin-top:12px">Fertig</button>';
        body.querySelector("#hereDone").addEventListener("click", close);
      }
      if (!navigator.geolocation) { fail("Der Standort ist auf diesem Gerät nicht verfügbar."); return; }
      navigator.geolocation.getCurrentPosition(function (pos) {
        if (!document.body.contains(w)) return;
        var lat = pos.coords.latitude, lon = pos.coords.longitude, acc = Math.round(pos.coords.accuracy || 0);
        try { if (window.wzCore && wzCore.rememberGps) wzCore.rememberGps(lat, lon, ""); } catch (e) { }
        body.innerHTML = '<div class="here-pos"><b>' + hereFmt(lat, lon) + "</b>" + (acc ? "auf etwa " + fmt(acc) + " m genau" : "") + " · bleibt auf diesem Gerät</div>" +
          '<div class="hs-list">' +
          '<button type="button" data-here="auto">Als Parkplatz merken<span>Wegpunkt „Auto“ in KompassWahr – ersetzt den letzten Parkplatz</span></button>' +
          '<button type="button" data-here="wp">Als Wegpunkt merken<span>Mit eigenem Namen in KompassWahr</span></button>' +
          '<button type="button" data-here="ort">Als Reiseort eintragen<span>Neuer Ort in WowarWahr</span></button>' +
          '<button type="button" data-here="copy">Koordinaten kopieren<span>In die Zwischenablage</span></button></div>';
        body.querySelector('[data-here="auto"]').addEventListener("click", function () { hereSaveWaypoint("Auto", lat, lon, true); saved("Auto"); });
        body.querySelector('[data-here="wp"]').addEventListener("click", function () {
          close();
          askText("Name des Wegpunkts", "", function (v) { var n = v || "Wegpunkt"; hereSaveWaypoint(n, lat, lon, false); toast("Gemerkt: " + n + " – zu finden in KompassWahr"); }, "z. B. Ferienhaus, Zeltplatz");
        });
        body.querySelector('[data-here="ort"]').addEventListener("click", function () { handoff({ t: "ort", lat: lat, lon: lon }, "./wow-index.html"); });
        body.querySelector('[data-here="copy"]').addEventListener("click", function () {
          var b = this, txt = lat.toFixed(6) + ", " + lon.toFixed(6);
          function done(ok) { b.querySelector("span").textContent = ok ? "Kopiert: " + txt : "Kopieren nicht möglich"; }
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { done(true); }, function () { done(false); }); else done(false);
        });
      }, function (e) {
        if (!document.body.contains(w)) return;
        fail(e && e.code === 1 ? "Der Standortzugriff ist nicht erlaubt. Du kannst ihn in den Einstellungen deines Geräts unter „Datenschutz › Ortungsdienste“ freigeben." : "Der Standort konnte gerade nicht ermittelt werden.");
      }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 });
    });
  }

  /* ---------- Suche ---------- */
  var idx = null;
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss"); }
  function add(list, app, text, sub, href) { if (text && String(text).trim()) list.push({ app: app, text: String(text), sub: sub || "", href: href || ("./" + WZ.app(app).href), n: norm(text + " " + (sub || "")) }); }
  function buildIndex() {
    if (idx) return Promise.resolve(idx);
    var L = [];
    try {
      (json("losgedacht_thoughts", []) || []).forEach(function (t) { if (t && t.text) add(L, "ld", t.text, t.status === "open" ? "offen" : "losgelassen"); });
      tours().forEach(function (t) { add(L, "wk", t.title || ("Fahrt " + fmt(t.distanceKm || 0, 1) + " km"), new Date(t.startTime).toLocaleDateString("de-DE")); (t.notes || []).forEach(function (n) { if (n) add(L, "wk", n.title || n.text, "Notiz zu einer Fahrt"); }); });
      (json("wk-navfavorites", []) || []).forEach(function (f) { if (f) add(L, "wk", f.name, "gemerktes Ziel"); });
      (json("kw-waypoints", []) || []).forEach(function (w) { if (w) add(L, "kw", w.name, "Wegpunkt"); });
      (json("vw_inventar", []) || []).forEach(function (v) { if (v) add(L, "vw", v.name, [v.kategorie, v.notiz].filter(Boolean).join(" · ")); });
      (json("alltagwahr_entries_v1", []) || []).forEach(function (e) { if (e) add(L, "aw", e.name, eur(+e.amount || 0)); });
      (json("astrowahr.profiles", []) || []).forEach(function (p) { if (p) add(L, "as", p.name || p.label || p.title, "Horoskop"); });
      (json("zh:mem", []) || []).forEach(function (m) { if (m) add(L, "zh", m.title, [m.place, m.ms ? new Date(m.ms).toLocaleDateString("de-DE") : ""].filter(Boolean).join(" · ")); });
      (json("hw-fav-locations", []) || []).forEach(function (f) { if (f) add(L, "hw", f.name, "Lieblingsort"); });
      (json("fk_notes", []) || []).forEach(function (n) { if (n) add(L, "kg", n.title, n.text); });
      (json("lw_history", []) || []).forEach(function (h) { if (h && (h.note || h.tag)) add(L, "lw", h.note || h.tag, h.tag || "Messung"); });
      (json("messwahr_messungen", []) || []).forEach(function (m) { if (m && m.name && m.name !== "Höhe" && m.name !== "Neigung") add(L, "mw", m.name, (m.typ === "hoehe" ? "Höhe " + fmt(m.wert, 1) + " m" : "Neigung " + fmt(m.wert, 1) + "°")); });
      (json("labwahr_protokolle", []) || []).forEach(function (q) { if (q && q.title) add(L, "lb", q.title + (q.note ? " – " + q.note : ""), q.text || "Protokoll"); });
      (json("klangwahr_momente", []) || []).forEach(function (m) { if (m && m.name) add(L, "kl", m.name, m.peaks && m.peaks[0] ? fmt(m.peaks[0].f, 0) + " Hz" : "Moment"); });
      (json("staunwahr_momente", []) || []).forEach(function (m) { if (m && m.name) add(L, "sn", m.name, "Lichtecho-Moment · " + (m.date || "").split("-").reverse().join(".")); });
      ((json("horizontwahr_daten", null) || {}).items || []).forEach(function (o) { if (o && o.n && o.c !== "wind" && o.c !== "ort") add(L, "hz", o.n, o.t || "am Horizont"); });
    } catch (e) { }
    return Promise.all([
      idbReadAll("parken-und-belege", ["parkscheine", "nebenkosten", "fahrten", "notizen", "kilometerstand"]).then(function (r) {
        if (!r) return;
        (r.parkscheine || []).forEach(function (p) { add(L, "bp", p.ort || "Parkschein", "Parkschein · " + (p.date || "") + (p.betrag ? " · " + eur(p.betrag) : "")); });
        (r.nebenkosten || []).forEach(function (n) { add(L, "bp", n.titel || n.kategorie, [n.kategorie, n.notiz, n.date].filter(Boolean).join(" · ")); });
        (r.fahrten || []).forEach(function (f) { add(L, "bp", [f.von, f.nach].filter(Boolean).join(" – ") || f.zweck || "Fahrt", [f.zweck, f.date, f.km ? fmt(f.km, 1) + " km" : ""].filter(Boolean).join(" · ")); });
        (r.notizen || []).forEach(function (n) { add(L, "bp", n.titel || "Sprachnotiz", "Notiz · " + (n.date || "")); });
        (r.kilometerstand || []).forEach(function (k) { if (k.ort) add(L, "bp", k.ort, "Kilometerstand · " + (k.date || "")); });
      }),
      idbReadAll("wowarwahr", ["visits", "trips", "wishes"]).then(function (r) {
        if (!r) return;
        (r.visits || []).forEach(function (v) { add(L, "wow", v.name, [v.region, v.date].filter(Boolean).join(" · ")); });
        (r.trips || []).forEach(function (t) { add(L, "wow", t.title, "Reise" + (t.start ? " · " + t.start : "")); });
        (r.wishes || []).forEach(function (w) { add(L, "wow", w.name, "Wunschziel"); });
      })
    ]).then(function () { idx = L; return L; });
  }
  function hl(text, q) {
    var t = esc(text), n = norm(text), i = n.indexOf(q);
    if (i < 0 || !q) return t;
    // Position im Originaltext grob übernehmen (gleiche Länge bei einfachen Buchstaben)
    var raw = String(text);
    return esc(raw.slice(0, i)) + "<mark>" + esc(raw.slice(i, i + q.length)) + "</mark>" + esc(raw.slice(i + q.length));
  }
  /* ---------- Fragen statt suchen (wz-ask.js) ---------- */
  var ASK_H = {
    loc: function () { return window.wzCore ? wzCore.knownLocation() : null; },
    wxOn: function () { return get("wz_today_weather") === "on"; },
    fetchWeather: function (loc) { return fetchWeather(loc); },
    load: function (src) { return wzCore.loadScript(src); },
    json: json, monthlyTotal: function () { return monthlyTotal(); }, nextPayment: function () { return nextPayment(); },
    expiringStock: function () { return expiringStock(); }, tripDate: function () { return tripDate(); },
    tours: function () { return tours(); }, thoughtsOpen: function () { return thoughtsOpen(); },
    lastParking: function () {
      return idbReadAll("parken-und-belege", ["parkscheine"]).then(function (r) {
        var l = (r && r.parkscheine || []).filter(function (p) { return p && p.ort; });
        l.sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); });
        return l[0] || null;
      }).catch(function () { return null; });
    }
  };
  var askSeq = 0;
  function askHtml() {
    return '<div class="res-group" id="askGroup"><h3>Antwort</h3><div class="card today"><div class="row ask-row" id="askRow"><span class="r-ic">' + icon("info") + '</span><span class="r-txt"><span class="r-v" style="display:block">Einen Moment …</span></span></div></div></div>';
  }
  function askRender(raw, seq) {
    window.wzAsk.answer(raw, ASK_H).then(function (a) {
      if (seq !== askSeq) return;
      var g = $("askGroup"); if (!g) return;
      if (!a) {
        g.querySelector(".card").innerHTML = row({ icon: "info", label: "Darauf weiß ich noch keine Antwort", value: "Frag zum Beispiel so:", note: "" }) + askChips(window.wzAsk.examples.slice(0, 4));
        bindChips(g); return;
      }
      var app = a.app && a.app !== "wz" ? a.app : "info";
      var btn = a.action === "wx" ? '<button type="button" class="r-btn" id="askWx">Erlauben</button>' : (a.action === "here" ? '<button type="button" class="r-btn" id="askHere">Hier merken</button>' : "");
      g.querySelector(".card").innerHTML = row({ icon: app, cls: "ask-row", label: "Antwort" + (a.app && a.app !== "wz" ? " · " + esc((WZ.APPS.filter(function (x) { return x.id === a.app; })[0] || {}).name || "") : ""),
        value: esc(a.title), note: esc(a.text || "") + (a.note ? '<span class="ask-src">' + esc(a.note) + "</span>" : ""), href: btn ? null : a.href, button: btn || null });
      var w = $("askWx"); if (w) w.addEventListener("click", function () { set("wz_today_weather", "on"); renderToday(); renderSky(); doSearch(); });
      var h = $("askHere"); if (h) h.addEventListener("click", function () { openHere(); });
    });
  }
  function askChips(list) {
    return '<div class="ask-chips">' + list.map(function (t) { return '<button type="button" class="ask-chip" data-ask="' + esc(t) + '">' + esc(t) + "</button>"; }).join("") + "</div>";
  }
  function bindChips(root) {
    Array.prototype.forEach.call(root.querySelectorAll("[data-ask]"), function (b) {
      b.addEventListener("mousedown", function (e) { e.preventDefault(); });
      b.addEventListener("click", function () { var q = $("q"); q.value = b.getAttribute("data-ask"); doSearch(); });
    });
  }
  /* Leeres Feld angetippt: kurz zeigen, was alles geht */
  function showAskHints() {
    if ($("q").value.trim() || !window.wzAsk) return;
    $("home").hidden = true; $("results").hidden = false;
    $("results").innerHTML = '<div class="res-group" id="hintGroup"><h3>Frag einfach</h3><div class="card today ask-hint">' + askChips(window.wzAsk.examples) +
      '<p class="ask-more">Oder einen Namen eintippen, um Apps und Einträge zu finden – oder etwas Neues wie „Streaming 13,99 monatlich“, „3 Gläser Marmelade“ oder einen Gedanken. Alles bleibt auf deinem Gerät.</p></div></div>';
    bindChips($("results"));
  }
  function hideAskHints() {
    setTimeout(function () { if (!$("q").value.trim() && $("hintGroup")) { $("results").hidden = true; $("home").hidden = false; } }, 180);
  }

  var searchTimer = null;
  function doSearch() {
    var raw = $("q").value.trim(), q = norm(raw);
    $("qx").hidden = !raw;
    if (!q) { $("results").hidden = true; $("home").hidden = false; if (document.activeElement === $("q")) showAskHints(); return; }
    $("home").hidden = true; $("results").hidden = false;
    var isQ = !!(window.wzAsk && window.wzAsk.looksLikeQuestion(raw));
    var apps = WZ.APPS.filter(function (a) { return norm(a.name + " " + a.sub + " " + a.kw).indexOf(q) !== -1; });
    var h = "";
    if (apps.length) {
      h += '<div class="res-group"><h3>Apps</h3><div class="card today">' + apps.map(function (a) {
        return row({ svg: icon(a.id), label: a.sub, value: hl(a.name, q), href: "./" + a.href });
      }).join("") + "</div></div>";
    }
    var qe = raw.length >= 3 && !isQ ? qeHtml(raw) : "", entryLike = /\s|\d/.test(raw) && !isQ;
    $("results").innerHTML = (isQ ? askHtml() : "") + (entryLike ? qe : "") + h + '<div id="resData"><p class="res-empty">Suche in deinen Einträgen …</p></div>' + (entryLike ? "" : qe);
    if (qe) qeBind(raw);
    if (isQ) askRender(raw, ++askSeq);
    buildIndex().then(function (L) {
      if (norm($("q").value.trim()) !== q) return;
      var hits = L.filter(function (x) { return x.n.indexOf(q) !== -1; });
      var box = $("resData"); if (!box) return;
      if (!hits.length) { box.innerHTML = apps.length || $("qeGroup") || $("askGroup") ? "" : '<p class="res-empty">Nichts gefunden.</p>'; return; }
      var by = {};
      hits.forEach(function (x) { (by[x.app] = by[x.app] || []).push(x); });
      var out = "";
      WZ.APPS.forEach(function (a) {
        var g = by[a.id]; if (!g) return;
        out += '<div class="res-group"><h3>' + icon(a.id) + a.name + ' <span style="text-transform:none;letter-spacing:0">(' + g.length + ')</span></h3><div class="card today">' +
          g.slice(0, 8).map(function (x) { return row({ icon: a.id, label: esc(x.sub), value: hl(x.text.length > 120 ? x.text.slice(0, 117) + "…" : x.text, q), href: x.href }); }).join("") +
          (g.length > 8 ? '<a class="row" href="./' + a.href + '"><span class="r-txt"><span class="r-v" style="display:block">Alle ' + g.length + " in " + a.name + " ansehen</span></span>" + CHEV + "</a>" : "") + "</div></div>";
      });
      box.innerHTML = out;
    });
  }

  /* ---------- Immer oben beginnen ----------
     Apps verlinken zurück mit Sprungmarke (z. B. #unterwegs). Die Marke wird
     entfernt und die Seite steht immer am Anfang. */
  try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch (e) { }
  function toTop() {
    try { if (location.hash) history.replaceState(null, "", location.pathname + location.search); } catch (e) { }
    window.scrollTo(0, 0);
  }
  if (location.hash) toTop();

  /* ---------- Start ---------- */
  function init() {
    applyHomeStyle();
    applyBlocks();
    var he = $("homeEdit"); if (he) he.addEventListener("click", function () { openHomeEdit(); });
    if (window.wzTheme && wzTheme.onChange) wzTheme.onChange(function () { applyHomeStyle(); });
    renderSky();
    renderJump();
    renderFavs();
    renderToday();
    var te = $("todayEdit");
    if (te) te.addEventListener("click", function () { todayEdit = !todayEdit; renderToday(); });
    renderSortBar();
    renderAreas();
    countOn = false; // ab jetzt keine Zähl-Animation mehr (nur beim ersten Öffnen)
    // sanftes Erscheinen der Bereiche, leicht versetzt
    var parts = [$("jump"), $("favs"), $("heute"), $("sortwrap")].concat(Array.prototype.slice.call(document.querySelectorAll("#areas > .sec")));
    var di = 0;
    parts.forEach(function (el) { if (!el || el.hidden || !el.innerHTML.trim()) return; el.classList.add("rise"); el.style.setProperty("--d", (Math.min(di++, 7) * 0.06).toFixed(2) + "s"); });
    setInterval(renderSky, 5 * 60 * 1000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) renderSky(); });
    var rs = $("sortReset");
    if (rs) rs.addEventListener("click", function () { try { localStorage.removeItem("wz_home_order"); localStorage.removeItem("wz_home_layout"); } catch (e) { } renderAreas(); });
    var q = $("q");
    q.addEventListener("input", function () { clearTimeout(searchTimer); searchTimer = setTimeout(doSearch, 140); });
    q.addEventListener("focus", function () { buildIndex(); }, { once: true });
    q.addEventListener("focus", showAskHints);
    q.addEventListener("blur", hideAskHints);
    $("qx").addEventListener("click", function () { q.value = ""; doSearch(); q.focus(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && q.value) { q.value = ""; doSearch(); } });
    // beim Zurückkehren (z. B. aus einer App) Kennzahlen auffrischen
    window.addEventListener("pageshow", function (e) { if (e.persisted) { idx = null; renderSky(); renderJump(); renderToday(); renderAreas(); renderFavs(); } toTop(); });
    // Beim Zurückkehren immer oben beginnen (Kopf mit Himmel sichtbar)
    toTop();
    setTimeout(toTop, 0);
    if (/[?&]anpassen=1/.test(location.search)) { try { history.replaceState(null, "", location.pathname); } catch (e) { } openHomeEdit(); }
    initOnboarding();
  }

  /* ---------- Kurze Einführung beim ersten Start (einheitlich über wz-onboarding.js) ---------- */
  function initOnboarding() {
    if (typeof window.wzOnboarding !== "function") return;
    function ic(p) { return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + p + "</svg>"; }
    var again = /[?&]einfuehrung=1/.test(location.search);
    var onb = window.wzOnboarding({
      key: "wz_onboarded",
      auto: !again,
      slides: [
        { iconHtml: '<img src="./icon-192.png" alt="" style="width:100%;height:100%;border-radius:inherit;display:block">', title: "Willkommen in der WahrZentrale",
          text: "Über zwanzig eigene Apps unter einem Dach – für Himmel, Unterwegs, Alltag und Spiel. Alles läuft auf deinem Gerät: ohne Konto, ohne Werbung, ohne Tracking." },
        { iconHtml: ic('<circle cx="10.5" cy="10.5" r="6.3"/><path d="M15.3 15.3l5.2 5.2"/><path d="M8.7 8.8a1.8 1.8 0 1 1 2.6 1.6c-.6.3-.8.7-.8 1.3"/><circle cx="10.5" cy="13.7" r=".45" fill="currentColor"/>'), title: "Ein Feld für alles",
          html: "<p>Oben einfach lostippen:</p>" +
            '<div class="wz-onb-row"><b>Suchen</b><span>– Apps und deine Einträge finden</span></div>' +
            '<div class="wz-onb-row"><b>Fragen</b><span>– „Regnet es heute?“, „Wo habe ich geparkt?“</span></div>' +
            '<div class="wz-onb-row"><b>Eintragen</b><span>– „Streaming 13,99 monatlich“ oder ein Gedanke</span></div>' +
            "<p>Das Symbol rechts im Feld scannt Barcodes, QR-Codes und Belege.</p>" },
        { iconHtml: ic('<rect x="4.5" y="5.5" width="15" height="14" rx="3"/><path d="M4.5 10h15M9 3.5v4M15 3.5v4"/>'), title: "Heute auf einen Blick",
          text: "Die Karte „Heute“ sammelt, was gerade zählt: Wetter, Himmels-Tipp, nächste Zahlung, offene Gedanken und mehr. Über „Anpassen“ wählst du, was dort erscheint." },
        { iconHtml: ic('<path d="M12 21.6s7-6.8 7-12.2a7 7 0 1 0-14 0C5 14.8 12 21.6 12 21.6Z"/><circle cx="12" cy="9.6" r="2.4"/>'), title: "Favoriten und „Hier merken“",
          text: "Deine vier Lieblings-Apps liegen oben griffbereit. „Hier merken“ hält mit einem Tipp deinen Standort fest – etwa den Parkplatz. Zurück zur Startseite kommst du aus jeder App über den Pfeil oben links." },
        { iconHtml: ic('<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7"/><circle cx="12" cy="15.4" r="1.2" fill="currentColor"/>'), title: "Deine Daten bleiben bei dir",
          text: "Alles wird nur auf diesem Gerät gespeichert. Über das Zahnrad oben findest du die Einstellungen und unter „Sichern“ eine Sicherungsdatei für alle Apps." }
      ]
    });
    if (again) { try { history.replaceState(null, "", location.pathname); } catch (e) { } onb.show(); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
