/* ============================================================
   wz-ask.js — „Fragen statt suchen“
   Beantwortet Fragen im Eingabefeld der WahrZentrale direkt auf
   dem Gerät – ohne KI-Dienst und ohne zusätzliche Datenquelle:
     · Wetter (Regen, Temperatur, Wind, Frost) aus der bereits
       freigegebenen Open-Meteo-Abfrage der „Heute“-Karte
     · Sonne, Mond, Planeten – lokal berechnet (hw-astro.js)
     · Tipps aus HimmelsWahr (Sterne, Regenbogen, Frost)
     · Parkplatz, Abos, Vorräte, Urlaub, Gedanken, Fahrten –
       aus den Daten, die bereits auf dem Gerät liegen.
   Die Erkennung arbeitet mit festen Stichwörtern; es wird nichts
   übertragen oder gespeichert.
   © 2026 Jan Dierlich – Alle Rechte vorbehalten.
   ============================================================ */
(function (global) {
  "use strict";

  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").replace(/\s+/g, " ").trim(); }
  function has(q, re) { return re.test(q); }
  function pad(n) { return ("0" + n).slice(-2); }
  function hm(d) { return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function deg(v) { return String(Math.round(v)).replace("-", "−"); }
  function fmt(n, d) { return Number(n).toLocaleString("de-DE", { maximumFractionDigits: d || 0, minimumFractionDigits: d || 0 }); }
  function eur(n) { return Number(n).toLocaleString("de-DE", { style: "currency", currency: "EUR" }); }
  function dayStart(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function cap(t) { t = String(t || ""); return t.charAt(0).toUpperCase() + t.slice(1); }
  function dot(t) { t = String(t || "").trim(); return !t || /[.!?…]$/.test(t) ? t : t + "."; }
  function realMs(iso, off) { return off == null ? new Date(iso).getTime() : Date.parse(iso + "Z") - off * 1000; }

  /* ---------- Beispiele (für die Vorschläge unter dem Eingabefeld) ---------- */
  var EXAMPLES = ["Regnet es heute?", "Wann geht die Sonne unter?", "Wo habe ich geparkt?", "Was läuft bald ab?", "Lohnt sich heute der Sternenhimmel?", "Wie viel zahle ich für Abos?"];

  /* ---------- Zeitangaben verstehen ---------- */
  function timeWindow(q, now) {
    var t0 = dayStart(now), tomorrow = /\b(morgen|morgige)\b/.test(q) && !/\bheute morgen\b/.test(q);
    if (/ubermorgen/.test(q)) { t0 = new Date(t0.getTime() + 2 * 864e5); tomorrow = true; }
    else if (tomorrow) t0 = new Date(t0.getTime() + 864e5);
    var label = /ubermorgen/.test(q) ? "übermorgen" : (tomorrow ? "morgen" : "heute");
    var m = q.match(/\bum (\d{1,2})(?:[:.](\d{2}))?\s*(?:uhr)?\b/) || q.match(/\b(\d{1,2})(?:[:.](\d{2}))? uhr\b/);
    var from, to, at = null;
    if (m && +m[1] <= 23) {
      at = new Date(t0); at.setHours(+m[1], m[2] ? +m[2] : 0, 0, 0);
      if (!tomorrow && at.getTime() < now.getTime() - 3600000) { at = new Date(at.getTime() + 864e5); label = "morgen"; }
      from = at.getTime(); to = from + 3600000;
      return { from: from, to: to, at: at, label: label + " um " + at.getHours() + " Uhr", point: true };
    }
    var parts = [[/\b(fruh|morgens|heute morgen)\b/, 6, 10, "früh"], [/vormittag/, 9, 12, "am Vormittag"], [/mittag(?!s?nacht)/, 11, 14, "mittags"],
      [/nachmittag/, 13, 18, "am Nachmittag"], [/\babend/, 18, 22, "am Abend"], [/\bnacht/, 21, 30, "in der Nacht"]];
    for (var i = 0; i < parts.length; i++) {
      if (parts[i][0].test(q) && !(i === 1 && /nachmittag/.test(q))) {
        from = t0.getTime() + parts[i][1] * 3600000; to = t0.getTime() + parts[i][2] * 3600000;
        if (!tomorrow && to < now.getTime()) { from += 864e5; to += 864e5; label = "morgen"; }
        return { from: Math.max(from, tomorrow ? from : now.getTime()), to: to, label: (label === "heute" && parts[i][3] === "in der Nacht" ? "heute Nacht" : label + " " + parts[i][3]).replace("heute am Abend", "heute Abend").replace("morgen am Abend", "morgen Abend") };
      }
    }
    if (/\b(gleich|jetzt|bald|sofort|nachste[nr]? stunde)\b/.test(q)) return { from: now.getTime(), to: now.getTime() + 2 * 3600000, label: "in den nächsten 2 Stunden" };
    if (tomorrow || label === "übermorgen") return { from: t0.getTime() + 6 * 3600000, to: t0.getTime() + 22 * 3600000, label: label };
    if (now.getHours() >= 21) return { from: now.getTime(), to: t0.getTime() + 30 * 3600000, label: "heute Nacht" };
    return { from: now.getTime(), to: t0.getTime() + 24 * 3600000, label: "heute" };
  }
  function hoursIn(d, w) {
    var h = d && d.hourly, off = d ? d.utc_offset_seconds : null, out = [];
    if (!h || !h.time) return out;
    for (var k = 0; k < h.time.length; k++) {
      var t = realMs(h.time[k], off);
      if (t + 3600000 <= w.from || t >= w.to) continue;
      out.push({ k: k, t: t, h: h });
    }
    return out;
  }
  function v(x, f) { var a = x.h[f]; return a && a[x.k] != null ? +a[x.k] : null; }

  /* ---------- Absichten (Reihenfolge = Vorrang) ---------- */
  var INTENTS = [
    { id: "hilfe", re: /\b(was kannst du|was kann ich fragen|hilfe|wie funktioniert (das|die suche|wahrzentrale))\b/ },
    { id: "parken", re: /(wo .*(geparkt|parkt|auto|wagen|parkplatz))|\bmein (auto|wagen|parkplatz)\b|\bparkplatz\b|\bgeparkt\b/ },
    { id: "regenbogen", re: /regenbogen/ },
    { id: "sterne", re: /\b(sterne|sternenhimmel|sternschnupp|planet|jupiter|venus|mars|saturn|merkur|milchstrasse|nachthimmel)/ },
    { id: "frost", re: /\b(frost|friert|frieren|glatt|kratzen|scheibe|bodenfrost)/ },
    { id: "regen", re: /\b(regen|regnet|regnen|schirm|nass|niederschlag|schauer|gewitter|schnee|schneit)/ },
    { id: "wind", re: /\b(wind|windig|sturm|sturmisch|boen)/ },
    { id: "temp", re: /\b(wie warm|wie kalt|temperatur|grad|warm|kalt|jacke|anziehen)\b/ },
    { id: "sonne", re: /\b(sonnenuntergang|sonnenaufgang|sonne (unter|auf)|geht die sonne|dunkel|hell|goldene stunde|blaue stunde|tageslicht|tag(es)?lange)/ },
    { id: "mond", re: /\b(mond|vollmond|neumond|mondphase)/ },
    { id: "abo", re: /\b(abo|abos|abonnement|fixkosten|vertrag|vertrage|zahle ich|ausgaben|kosten|zahlung|abbuchung)/ },
    { id: "vorrat", re: /\b(ablauf|lauft .*ab|mhd|haltbar|vorrat|vorrate|verbrauchen)/ },
    { id: "urlaub", re: /\b(urlaub|reise|florida|keysglade|wie lange noch)/ },
    { id: "gedanken", re: /\b(gedanke|gedanken|losdenk)/ },
    { id: "fahrten", re: /\b(gefahren|kilometer|fahrten|fahrt|km)\b/ },
    { id: "wetter", re: /\b(wetter|wie wird es|wie wirds)\b/ }
  ];
  var QWORD = /^(wann|wie|wo|was|wieviel|wie viel|welche[rsn]?|ist|sind|gibt|gibt es|regnet|brauche|brauch|soll|kann|lohnt|scheint|wird|habe|hab|muss|geht|lauft|schneit|friert)\b/;

  function detect(raw) {
    var q = norm(raw);
    if (q.length < 3) return null;
    for (var i = 0; i < INTENTS.length; i++) if (INTENTS[i].re.test(q)) return INTENTS[i].id;
    return null;
  }
  function looksLikeQuestion(raw) {
    var q = norm(raw);
    if (q.length < 3) return false;
    if (/\?\s*$/.test(raw) || QWORD.test(q)) return true;
    var id = detect(raw);
    /* ohne Fragezeichen nur bei eindeutigen Stichwörtern antworten (z. B. „Sonnenuntergang“, „Vollmond“, „Parkplatz“) */
    return !!id && /^(sonnenuntergang|sonnenaufgang|vollmond|neumond|mondphase|parkplatz|regenbogen|sternenhimmel|goldene stunde|blaue stunde|wetter( morgen| heute)?|abos?|fixkosten)$/.test(q);
  }

  /* ---------- Antworten ---------- */
  function A(o) { return o; }
  function needLoc(H) {
    var loc = H.loc();
    if (!loc) return { err: A({ app: "hw", title: "Dafür fehlt dein Ort", text: "Einmal in HimmelsWahr den Standort freigeben oder einen Ort wählen – danach kann ich das beantworten.", href: "./hw-index.html" }) };
    return { loc: loc };
  }
  function weather(H) {
    var L = needLoc(H); if (L.err) return Promise.resolve({ err: L.err });
    if (!H.wxOn()) return Promise.resolve({ err: A({ app: "hw", title: "Wetter ist noch nicht freigegeben", text: "Für Wetterfragen geht dein Ort an Open-Meteo (Schweiz). Einmal erlauben, dann antworte ich direkt hier.", action: "wx" }) });
    return H.fetchWeather(L.loc).then(function (d) { return { d: d, loc: L.loc }; }, function () {
      return { err: A({ app: "hw", title: "Wetterdienst gerade nicht erreichbar", text: "Bitte später noch einmal fragen.", href: "./hw-index.html" }) };
    });
  }
  function astro(H) { return Promise.all([H.load("./hw-astro.js"), H.load("./hw-insights.js")]); }
  var SRC = "Wetterdaten: Open-Meteo.com (CC BY 4.0)";

  var HANDLERS = {
    hilfe: function () {
      return A({ app: "wz", title: "Frag einfach drauflos", text: "Zum Beispiel: " + EXAMPLES.join(" · ") + ". Alles wird auf deinem Gerät beantwortet." });
    },

    regen: function (q, H, now) {
      return weather(H).then(function (r) {
        if (r.err) return r.err;
        var w = timeWindow(q, now), hs = hoursIn(r.d, w);
        if (!hs.length) return null;
        var snow = /schnee|schneit/.test(q), storm = /gewitter/.test(q);
        var max = 0, first = null, firstHigh = null;
        hs.forEach(function (x) { var p = v(x, "precipitation_probability") || 0; if (p > max) { max = p; first = x; } if (p >= 50 && !firstHigh) firstHigh = x; });
        if (storm || snow) {
          var codes = storm ? [95, 96, 99] : [71, 73, 75, 77, 85, 86], hit = hs.filter(function (x) { return codes.indexOf(v(x, "weather_code")) !== -1; })[0];
          return A({ app: "hw", href: "./hw-index.html", title: hit ? "Ja – " + (storm ? "Gewitter" : "Schnee") + " ab etwa " + new Date(hit.t).getHours() + " Uhr" : "Nein, " + (storm ? "kein Gewitter" : "kein Schnee") + " in Sicht",
            text: "Vorhersage für " + w.label + ".", note: SRC });
        }
        var title, text;
        if (w.point) {
          var p0 = v(hs[0], "precipitation_probability") || 0;
          title = p0 >= 50 ? "Ja, wahrscheinlich" : (p0 >= 25 ? "Vielleicht" : "Nein, eher trocken");
          text = p0 + " % Regenwahrscheinlichkeit " + w.label + ".";
        } else if (max < 20) { title = "Nein, eher trocken"; text = "Höchstens " + max + " % Regenwahrscheinlichkeit " + w.label + "."; }
        else if (max < 50) { title = "Vielleicht"; text = cap(w.label) + " bis zu " + max + " % Regenwahrscheinlichkeit, am ehesten gegen " + new Date(first.t).getHours() + " Uhr."; }
        else { title = "Ja, wahrscheinlich"; text = cap(w.label) + " ab etwa " + new Date(firstHigh.t).getHours() + " Uhr mit " + (v(firstHigh, "precipitation_probability")) + " % Wahrscheinlichkeit. Schirm einpacken."; }
        return A({ app: "hw", href: "./hw-index.html", title: title, text: text, note: SRC });
      });
    },

    temp: function (q, H, now) {
      return weather(H).then(function (r) {
        if (r.err) return r.err;
        var w = timeWindow(q, now), hs = hoursIn(r.d, w);
        if (!hs.length) return null;
        if (w.point) {
          var t = v(hs[0], "temperature_2m"), f = v(hs[0], "apparent_temperature");
          return A({ app: "hw", href: "./hw-index.html", title: "Etwa " + deg(t) + " °C " + w.label, text: f != null && Math.abs(f - t) >= 2 ? "Gefühlt " + deg(f) + " °C." : "Gefühlt ähnlich.", note: SRC });
        }
        var mn = Infinity, mx = -Infinity, fmn = Infinity;
        hs.forEach(function (x) { var t = v(x, "temperature_2m"), f = v(x, "apparent_temperature"); if (t == null) return; mn = Math.min(mn, t); mx = Math.max(mx, t); if (f != null) fmn = Math.min(fmn, f); });
        var tip = fmn < 3 ? "Warm anziehen – Mütze und Handschuhe schaden nicht." : (fmn < 10 ? "Jacke einpacken." : (mx > 25 ? "Leichte Kleidung, an Trinken denken." : "Angenehm – eine leichte Jacke reicht."));
        return A({ app: "hw", href: "./hw-index.html", title: deg(mn) + " bis " + deg(mx) + " °C " + w.label, text: tip, note: SRC });
      });
    },

    wind: function (q, H, now) {
      return weather(H).then(function (r) {
        if (r.err) return r.err;
        var w = timeWindow(q, now), hs = hoursIn(r.d, w);
        if (!hs.length) return null;
        var g = 0, s = 0, at = null;
        hs.forEach(function (x) { var gx = v(x, "wind_gusts_10m") || 0; s = Math.max(s, v(x, "wind_speed_10m") || 0); if (gx > g) { g = gx; at = x; } });
        var title = g >= 75 ? "Ja, stürmisch" : (g >= 50 ? "Ja, windig" : (g >= 30 ? "Etwas Wind" : "Nein, kaum Wind"));
        return A({ app: "hw", href: "./hw-index.html", title: title, text: cap(w.label) + " Wind bis " + Math.round(s) + " km/h, Böen bis " + Math.round(g) + " km/h" + (at && g >= 30 ? " gegen " + new Date(at.t).getHours() + " Uhr" : "") + ".", note: SRC });
      });
    },

    wetter: function (q, H, now) {
      return weather(H).then(function (r) {
        if (r.err) return r.err;
        var w = timeWindow(q, now), hs = hoursIn(r.d, w);
        if (!hs.length) return null;
        var mn = Infinity, mx = -Infinity, pp = 0, g = 0;
        hs.forEach(function (x) { var t = v(x, "temperature_2m"); if (t != null) { mn = Math.min(mn, t); mx = Math.max(mx, t); } pp = Math.max(pp, v(x, "precipitation_probability") || 0); g = Math.max(g, v(x, "wind_gusts_10m") || 0); });
        return A({ app: "hw", href: "./hw-index.html", title: deg(mn) + " bis " + deg(mx) + " °C " + w.label,
          text: (pp < 20 ? "Voraussichtlich trocken" : "Regen bis " + pp + " %") + (g >= 50 ? ", windig mit Böen bis " + Math.round(g) + " km/h" : "") + ".", note: SRC });
      });
    },

    frost: function (q, H, now) { return tip("frost", q, H, now); },
    regenbogen: function (q, H, now) { return tip("regenbogen", q, H, now); },

    sterne: function (q, H, now) {
      var L = needLoc(H); if (L.err) return Promise.resolve(L.err);
      return astro(H).then(function () {
        var loc = L.loc, s = now.getTime(), planets = [];
        try {
          planets = global.hwVisiblePlanets(s, s + 14 * 3600000, loc.lat, loc.lon, -6).filter(function (p) { return p.nakedEye && p.name !== "Mond"; })
            .map(function (p) { return p.name + " (" + hm(new Date(p.first)) + "–" + hm(new Date(p.last)) + " Uhr, im " + global.hwCompassWord(p.peakAz) + ")"; });
        } catch (e) { }
        var pl = planets.length ? "Mit bloßem Auge: " + planets.join(", ") + "." : "Heute Nacht steht kein heller Planet hoch genug.";
        if (!H.wxOn()) return A({ app: "hw", href: "./hw-nachthimmel.html", title: "Sternenhimmel heute Nacht", text: pl, note: "Für die Wolken-Einschätzung das Wetter in „Heute“ freigeben." });
        return weather(H).then(function (r) {
          if (r.err) return A({ app: "hw", href: "./hw-nachthimmel.html", title: "Sternenhimmel heute Nacht", text: pl });
          var it = global.hwInsights(r.d, loc.lat, loc.lon).filter(function (x) { return x.id === "sterne"; })[0];
          if (!it) return A({ app: "hw", href: "./hw-nachthimmel.html", title: "Heute wird es nicht richtig dunkel", text: pl });
          return A({ app: "hw", href: "./hw-nachthimmel.html", title: it.stufe === "gruen" ? "Ja – " + it.title.replace("Sternenhimmel heute Nacht · ", "gute Sicht, ") : (it.stufe === "gelb" ? "Mit etwas Glück" : "Eher nicht"),
            text: it.text.split(". ")[0].replace(/\.$/, "") + ". " + pl, note: SRC + " · Sterne und Planeten auf deinem Gerät berechnet" });
        });
      });
    },

    sonne: function (q, H, now) {
      var L = needLoc(H); if (L.err) return Promise.resolve(L.err);
      return astro(H).then(function () {
        var loc = L.loc, w = timeWindow(q, now), day = dayStart(new Date(w.from));
        if (w.label.indexOf("heute") === -1 && w.label.indexOf("morgen") === -1 && w.label.indexOf("übermorgen") === -1) day = dayStart(now);
        var s0 = day.getTime(), s1 = s0 + 864e5;
        function cross(th) { try { return global.hwSunAltCrossings(s0, s1, loc.lat, loc.lon, th); } catch (e) { return []; } }
        var horizon = cross(-0.833), rise = horizon.filter(function (c) { return c.rising; })[0], set = horizon.filter(function (c) { return !c.rising; })[0];
        var dayLbl = (s0 === dayStart(now).getTime()) ? "heute" : (s0 - dayStart(now).getTime() === 864e5 ? "morgen" : "übermorgen");
        if (!rise && !set) return A({ app: "hw", title: "Heute kein Sonnenauf- oder -untergang", text: "An deinem Ort bleibt die Sonne den ganzen Tag " + (global.hwSunPosition(new Date(s0 + 12 * 3600000), loc.lat, loc.lon).altitude > 0 ? "über" : "unter") + " dem Horizont." });
        var len = rise && set ? (set.ms - rise.ms) / 60000 : null;
        var lenTxt = len ? "Tageslicht " + Math.floor(len / 60) + " Std. " + Math.round(len % 60) + " Min." : "";
        if (/aufgang|sonne auf|hell/.test(q) && rise) return A({ app: "hw", href: "./hw-index.html", title: "Sonnenaufgang " + dayLbl + " um " + hm(new Date(rise.ms)) + " Uhr", text: dot(lenTxt), note: "Auf deinem Gerät berechnet" });
        if (/goldene stunde/.test(q)) {
          var g = cross(6).filter(function (c) { return !c.rising; })[0];
          return A({ app: "hw", href: "./hw-abendrot.html", title: g ? "Goldene Stunde " + dayLbl + " ab " + hm(new Date(g.ms)) + " Uhr" : "Heute keine Goldene Stunde am Abend", text: set ? "Bis zum Sonnenuntergang um " + hm(new Date(set.ms)) + " Uhr." : "", note: "Auf deinem Gerät berechnet" });
        }
        if (/blaue stunde|dunkel/.test(q)) {
          var c6 = cross(-6).filter(function (c) { return !c.rising; })[0], c12 = cross(-12).filter(function (c) { return !c.rising; })[0];
          return A({ app: "hw", href: "./hw-abendrot.html", title: c6 ? "Dunkel wird es " + dayLbl + " gegen " + hm(new Date(c6.ms)) + " Uhr" : "Es wird nicht richtig dunkel",
            text: (set ? "Sonnenuntergang " + hm(new Date(set.ms)) + " Uhr, danach Blaue Stunde" : "") + (c12 ? "; richtig dunkel ab " + hm(new Date(c12.ms)) + " Uhr." : "."), note: "Auf deinem Gerät berechnet" });
        }
        return A({ app: "hw", href: "./hw-abendrot.html", title: set ? "Sonnenuntergang " + dayLbl + " um " + hm(new Date(set.ms)) + " Uhr" : "Heute kein Sonnenuntergang",
          text: dot((rise ? "Aufgang " + hm(new Date(rise.ms)) + " Uhr · " : "") + lenTxt), note: "Auf deinem Gerät berechnet" });
      });
    },

    mond: function (q, H, now) {
      return H.load("./hw-astro.js").then(function () {
        var ph = global.hwMoonPhase(now), next = global.hwNextMoonPhases(now) || [];
        var want = /vollmond/.test(q) ? "Vollmond" : (/neumond/.test(q) ? "Neumond" : null);
        if (want) {
          var n = next.filter(function (p) { return p.name.indexOf(want) !== -1; })[0];
          if (n) {
            var dd = Math.round((dayStart(n.date) - dayStart(now)) / 864e5);
            return A({ app: "hw", href: "./hw-nachthimmel.html", title: "Nächster " + want + ": " + n.date.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" }),
              text: (dd === 0 ? "Heute" : dd === 1 ? "Morgen" : "In " + dd + " Tagen") + ", gegen " + hm(n.date) + " Uhr. Jetzt: " + ph.name + ", " + ph.illumination + " % beleuchtet.", note: "Auf deinem Gerät berechnet" });
          }
        }
        var txt = next.length ? "Als Nächstes: " + next[0].name + " am " + next[0].date.toLocaleDateString("de-DE", { day: "numeric", month: "long" }) + "." : "";
        var loc = H.loc();
        if (loc) {
          try {
            var ev = global.hwMoonRiseSet(now.getTime(), now.getTime() + 24 * 3600000, loc.lat, loc.lon);
            if (ev.length) txt = ev.slice(0, 2).map(function (e) { return (e.rising ? "Aufgang " : "Untergang ") + hm(new Date(e.ms)) + " Uhr"; }).join(", ") + ". " + txt;
          } catch (e) { }
        }
        return A({ app: "hw", href: "./hw-nachthimmel.html", title: ph.name + " · " + ph.illumination + " % beleuchtet", text: txt, note: "Auf deinem Gerät berechnet" });
      });
    },

    parken: function (q, H, now) {
      var wps = (H.json("kw-waypoints", []) || []).filter(function (w) { return w && w.name === "Auto"; });
      var car = wps[wps.length - 1];
      if (car) {
        var t = car.ts ? new Date(car.ts) : null, ago = t ? (now - t) / 60000 : null;
        var when = !t ? "" : (ago < 60 ? "vor " + Math.max(1, Math.round(ago)) + " Min." : (dayStart(t).getTime() === dayStart(now).getTime() ? "heute um " + hm(t) + " Uhr" : "am " + t.toLocaleDateString("de-DE", { day: "numeric", month: "long" }) + " um " + hm(t) + " Uhr"));
        return Promise.resolve(A({ app: "kw", href: "./kw-index.html", title: "Dein Parkplatz ist gemerkt", text: dot("Gemerkt " + when) + " KompassWahr zeigt dir Richtung und Entfernung – auch ohne Netz.", note: "Tippen, um hinzufinden" }));
      }
      return H.lastParking().then(function (p) {
        if (p) return A({ app: "bp", href: "./bp-app.html", title: "Letzter Parkschein: " + p.ort, text: (p.date ? "Vom " + p.date + ". " : "") + "Für den genauen Ort beim nächsten Mal „Hier merken“ → „Als Parkplatz merken“ nutzen." });
        return A({ app: "kw", title: "Noch kein Parkplatz gemerkt", text: "Beim Aussteigen oben in den Favoriten auf „Hier merken“ tippen und „Als Parkplatz merken“ wählen – dann steht er hier.", action: "here" });
      });
    },

    abo: function (q, H, now) {
      var list = H.json("alltagwahr_entries_v1", []) || [];
      if (!list.length) return Promise.resolve(A({ app: "aw", href: "./aw-index.html", title: "Noch keine wiederkehrenden Ausgaben", text: "Tipp: Einfach hier eintippen, z. B. „Streaming 13,99 monatlich“, und als wiederkehrende Ausgabe anlegen." }));
      var m = H.monthlyTotal(), np = H.nextPayment();
      var nt = np ? "Als Nächstes: " + np.e.name + " (" + eur(+np.e.amount || 0) + ") am " + np.d.toLocaleDateString("de-DE", { day: "numeric", month: "long" }) + "." : "";
      return Promise.resolve(A({ app: "aw", href: "./aw-index.html", title: eur(m) + " pro Monat", text: list.length + (list.length === 1 ? " Eintrag" : " Einträge") + ", im Jahr " + eur(m * 12) + ". " + nt }));
    },

    vorrat: function (q, H, now) {
      var ex = H.expiringStock(), all = H.json("vw_inventar", []) || [];
      if (!all.length) return Promise.resolve(A({ app: "vw", href: "./vw-index.html", title: "Noch keine Vorräte erfasst", text: "In VorratsWahr scannen oder hier eintippen, z. B. „3 Gläser Marmelade“." }));
      if (!ex.length) return Promise.resolve(A({ app: "vw", href: "./vw-index.html", title: "Nichts läuft in den nächsten 7 Tagen ab", text: all.length + " Vorräte im Blick." }));
      var names = ex.slice(0, 4).map(function (e) { return (e.name || "Eintrag") + " (" + new Date(e.datum + "T00:00:00").toLocaleDateString("de-DE", { day: "numeric", month: "numeric" }) + ")"; }).join(", ");
      return Promise.resolve(A({ app: "vw", href: "./vw-index.html", title: ex.length + (ex.length === 1 ? " Vorrat läuft" : " Vorräte laufen") + " bald ab", text: names + (ex.length > 4 ? " …" : "") + "." }));
    },

    urlaub: function (q, H, now) {
      var d = H.tripDate();
      if (!d) return Promise.resolve(A({ app: "kg", href: "./kg-index.html", title: "Noch kein Reisedatum eingetragen", text: "In Keysglade das Abreisedatum setzen – dann zählt die WahrZentrale mit." }));
      var n = Math.round((dayStart(new Date(d + "T00:00:00")) - dayStart(now)) / 864e5);
      return Promise.resolve(A({ app: "kg", href: "./kg-index.html", title: n > 1 ? "Noch " + n + " Tage" : (n === 1 ? "Morgen geht's los" : (n === 0 ? "Heute geht's los" : "Die Reise hat schon begonnen")), text: "Abreise am " + new Date(d + "T00:00:00").toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" }) + "." }));
    },

    gedanken: function (q, H) {
      var n = H.thoughtsOpen();
      return Promise.resolve(A({ app: "ld", href: "./ld-index.html", title: n ? n + (n === 1 ? " offener Gedanke" : " offene Gedanken") : "Keine offenen Gedanken", text: n ? "Am Abend in LosDenkWahr in Ruhe durchgehen." : "Kopf frei. Neues einfach hier eintippen und wegparken." }));
    },

    fahrten: function (q, H, now) {
      var t = H.tours();
      if (!t.length) return Promise.resolve(A({ app: "wk", href: "./wk-index.html", title: "Noch keine Fahrten aufgezeichnet", text: "In NaviWahr auf Aufnahme tippen – Kilometer und Wege erscheinen dann hier." }));
      function sum(ms) { return t.filter(function (x) { return x.startTime >= ms; }).reduce(function (a, x) { return a + (x.distanceKm || 0); }, 0); }
      var mon = new Date(dayStart(now)); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
      var m1 = new Date(now.getFullYear(), now.getMonth(), 1), y1 = new Date(now.getFullYear(), 0, 1);
      return Promise.resolve(A({ app: "wk", href: "./wk-index.html", title: fmt(sum(mon.getTime()), 1) + " km diese Woche", text: "Diesen Monat " + fmt(sum(m1.getTime()), 1) + " km, dieses Jahr " + fmt(sum(y1.getTime()), 0) + " km (" + t.length + " Aufzeichnungen)." }));
    }
  };

  /* Tipps aus HimmelsWahr (gleiche Berechnung wie „Heute lohnt sich …“) */
  var TIP_NONE = {
    frost: ["Kein Frost in Sicht", "Die kommende Nacht bleibt frostfrei."],
    regenbogen: ["Heute eher kein Regenbogen", "Dafür bräuchte es Sonne und gleichzeitig Schauer bei tief stehender Sonne."]
  };
  function tip(id, q, H, now) {
    return weather(H).then(function (r) {
      if (r.err) return r.err;
      return astro(H).then(function () {
        var it = global.hwInsights(r.d, r.loc.lat, r.loc.lon, { now: now.getTime() }).filter(function (x) { return x.id === id; })[0];
        if (!it) return A({ app: "hw", href: "./hw-index.html", title: TIP_NONE[id][0], text: TIP_NONE[id][1], note: SRC });
        return A({ app: "hw", href: "./hw-index.html#heute-lohnt", title: it.title, text: it.text, note: SRC, stufe: it.stufe });
      });
    });
  }

  function answer(raw, H) {
    var id = detect(raw);
    if (!id || !HANDLERS[id]) return Promise.resolve(null);
    var q = norm(raw), now = new Date();
    try { return Promise.resolve(HANDLERS[id](q, H, now)).catch(function () { return null; }); }
    catch (e) { return Promise.resolve(null); }
  }

  global.wzAsk = { answer: answer, detect: detect, looksLikeQuestion: looksLikeQuestion, examples: EXAMPLES, _timeWindow: timeWindow };
})(typeof window !== "undefined" ? window : this);
