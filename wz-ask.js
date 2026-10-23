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
     · Rechnen und Umrechnen, Uhrzeit weltweit, Kalender und
       Feiertage, Wegweiser zu den Werkzeug-Apps (Stand 23.10.2026).
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
  var EXAMPLES = ["Regnet es heute?", "Wann geht die Sonne unter?", "Wo habe ich geparkt?", "Was läuft bald ab?", "Lohnt sich heute der Sternenhimmel?", "Wie viel zahle ich für Abos?", "Wie spät ist es in Florida?", "Wie lange noch bis Weihnachten?", "12 km in Meilen", "19 % von 250"];

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
    { id: "uhrzeit", re: /\b(wie spat|wieviel uhr|wie viel uhr|uhrzeit|zeitverschiebung|zeitunterschied)\b/ },
    { id: "datum", re: /(welcher tag ist|welches datum|der wievielte|kalenderwoche|welche woche|\bkw\b|zeitumstellung|uhr(en)? umgestellt|uhr umstellen|sommerzeit|winterzeit|(wann|wie (viele|lange)|tage bis|wochen bis|noch bis).*(heiligabend|weihnacht|silvester|neujahr|nikolaus|advent|karfreitag|oster|himmelfahrt|vatertag|pfingst|muttertag|valentinstag|halloween|reformationstag|einheit|tag der arbeit|fruhlingsanfang|sommeranfang|herbstanfang|winteranfang|\d{1,2}\.\s?\d{1,2}\.))/ },
    { id: "wegweiser", re: /gewitter.*(wie weit|entfern|abstand|weg|kommt|zieht)|(wie weit|entfernung).*gewitter|blitz.*donner/ },
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
    if (convParse(raw)) return "umrechnen";
    if (calcLooks(raw)) return "rechnen";
    for (var i = 0; i < INTENTS.length; i++) if (INTENTS[i].re.test(q)) return INTENTS[i].id;
    if (guideFor(q)) return "wegweiser";
    return null;
  }
  function looksLikeQuestion(raw) {
    var q = norm(raw);
    if (q.length < 3) return false;
    if (/\?\s*$/.test(raw) || QWORD.test(q)) return true;
    var id = detect(raw);
    if (id === "rechnen" || id === "umrechnen" || id === "uhrzeit" || id === "datum") return true;
    /* ohne Fragezeichen nur bei eindeutigen Stichwörtern antworten (z. B. „Sonnenuntergang“, „Vollmond“, „Parkplatz“) */
    return !!id && /^(sonnenuntergang|sonnenaufgang|vollmond|neumond|mondphase|parkplatz|regenbogen|sternenhimmel|goldene stunde|blaue stunde|wetter( morgen| heute)?|abos?|fixkosten)$/.test(q);
  }

  /* ---------- Antworten ---------- */
  function A(o) { return o; }
  var FB_NOTE = "Für Deutschland (Mitte) berechnet – für deinen Ort in HimmelsWahr den Standort freigeben";
  function needLoc(H, fallback) {
    var loc = H.loc();
    if (!loc && fallback) return { loc: { lat: 51.3, lon: 9.5, fallback: true } };
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
      var L = needLoc(H, true); if (L.err) return Promise.resolve(L.err);
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
        if (/aufgang|sonne auf|hell/.test(q) && rise) return A({ app: "hw", href: "./hw-index.html", title: "Sonnenaufgang " + dayLbl + " um " + hm(new Date(rise.ms)) + " Uhr", text: dot(lenTxt), note: L.loc.fallback ? FB_NOTE : "Auf deinem Gerät berechnet" });
        if (/goldene stunde/.test(q)) {
          var g = cross(6).filter(function (c) { return !c.rising; })[0];
          return A({ app: "hw", href: "./hw-abendrot.html", title: g ? "Goldene Stunde " + dayLbl + " ab " + hm(new Date(g.ms)) + " Uhr" : "Heute keine Goldene Stunde am Abend", text: set ? "Bis zum Sonnenuntergang um " + hm(new Date(set.ms)) + " Uhr." : "", note: L.loc.fallback ? FB_NOTE : "Auf deinem Gerät berechnet" });
        }
        if (/blaue stunde|dunkel/.test(q)) {
          var c6 = cross(-6).filter(function (c) { return !c.rising; })[0], c12 = cross(-12).filter(function (c) { return !c.rising; })[0];
          return A({ app: "hw", href: "./hw-abendrot.html", title: c6 ? "Dunkel wird es " + dayLbl + " gegen " + hm(new Date(c6.ms)) + " Uhr" : "Es wird nicht richtig dunkel",
            text: (set ? "Sonnenuntergang " + hm(new Date(set.ms)) + " Uhr, danach Blaue Stunde" : "") + (c12 ? "; richtig dunkel ab " + hm(new Date(c12.ms)) + " Uhr." : "."), note: L.loc.fallback ? FB_NOTE : "Auf deinem Gerät berechnet" });
        }
        return A({ app: "hw", href: "./hw-abendrot.html", title: set ? "Sonnenuntergang " + dayLbl + " um " + hm(new Date(set.ms)) + " Uhr" : "Heute kein Sonnenuntergang",
          text: dot((rise ? "Aufgang " + hm(new Date(rise.ms)) + " Uhr · " : "") + lenTxt), note: L.loc.fallback ? FB_NOTE : "Auf deinem Gerät berechnet" });
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

  /* ============================================================
     Erweiterung 23. Oktober 2026 – alles lokal, ohne Netz:
     Rechnen, Umrechnen, Uhrzeit weltweit, Kalender/Feiertage
     und ein Wegweiser zu den Werkzeug-Apps.
     ============================================================ */

  /* ---------- Rechnen (eigener Rechenparser, kein eval) ---------- */
  function calcPrep(raw) {
    var s = String(raw || "").toLowerCase().trim()
      .replace(/^(was (ist|ergibt|sind)|wie ?viel (ist|sind|ergibt)|rechne|berechne|rechnen)\s+/, "")
      .replace(/\s*(=|\?)+\s*$/, "")
      .replace(/×|\bmal\b/g, "*").replace(/÷|\bgeteilt durch\b|\bdurch\b/g, "/").replace(/\bplus\b/g, "+")
      .replace(/−|–|\bminus\b/g, "-").replace(/\bhoch\b/g, "^").replace(/\bprozent\b/g, "%")
      .replace(/\b(quadrat)?wurzel( aus)?\b/g, "√").replace(/(\d)\s*:\s*(\d)/g, "$1/$2");
    // Zahlen: 1.234,56 → 1234.56 ; 3,5 → 3.5
    s = s.replace(/\d[\d.]*,\d+|\d{1,3}(?:\.\d{3})+(?![\d,])/g, function (n) { return n.indexOf(",") !== -1 ? n.replace(/\./g, "").replace(",", ".") : n.replace(/\./g, ""); });
    return s.replace(/\s+/g, "");
  }
  function calcLooks(raw) {
    if (/^\d[\d.,]*-\d[\d.,]*$/.test(String(raw || "").trim())) return false; // Nummern wie 040-123456
    var s = calcPrep(raw);
    if (!s || s.length > 80 || !/^[\d.+\-*/^%()√von]+$/.test(s)) return false;
    if (!/\d/.test(s)) return false;
    return /[+\-*/^√]|%von|\d%/.test(s.replace(/^-/, "")) && !/^\d+%$/.test(s);
  }
  function calcEval(s) {
    var i = 0;
    function peek() { return s.charAt(i); }
    function num() {
      var m = s.slice(i).match(/^\d+(\.\d+)?/); if (!m) throw 0;
      i += m[0].length; return parseFloat(m[0]);
    }
    function atom() {
      var c = peek();
      if (c === "(") { i++; var v = expr(); if (peek() !== ")") throw 0; i++; return v; }
      if (c === "-") { i++; return -atom(); }
      if (c === "+") { i++; return atom(); }
      if (c === "√") { i++; var r = atom(); if (r < 0) throw 0; return Math.sqrt(r); }
      return num();
    }
    function power() {
      var b = atom();
      if (peek() === "^") { i++; var e = power(); return Math.pow(b, e); }
      if (peek() === "%") {
        i++;
        if (s.slice(i, i + 3) === "von") { i += 3; return b / 100 * power(); }
        return { pct: b };
      }
      return b;
    }
    function term() {
      var v = power(); if (typeof v === "object") v = v.pct / 100;
      for (;;) {
        var c = peek();
        if (c === "*" || c === "/") { i++; var r = power(); if (typeof r === "object") r = r.pct / 100; if (c === "/" && r === 0) throw 1; v = c === "*" ? v * r : v / r; }
        else return v;
      }
    }
    function expr() {
      var v = term();
      for (;;) {
        var c = peek();
        if (c === "+" || c === "-") {
          i++;
          var save = i, r = power();
          if (typeof r === "object" && (peek() === "" || peek() === ")" || peek() === "+" || peek() === "-")) { v = c === "+" ? v * (1 + r.pct / 100) : v * (1 - r.pct / 100); continue; }
          i = save; r = term(); v = c === "+" ? v + r : v - r;
        } else return v;
      }
    }
    var out = expr();
    if (i !== s.length || !isFinite(out)) throw 0;
    return out;
  }
  function nice(n) {
    if (Math.abs(n) >= 1e15 || (Math.abs(n) < 1e-6 && n !== 0)) return n.toExponential(6).replace(".", ",").replace("e+", " · 10^").replace("e-", " · 10^-");
    var r = Math.round(n * 1e10) / 1e10;
    return r.toLocaleString("de-DE", { maximumFractionDigits: 10 });
  }

  /* ---------- Umrechnen ---------- */
  var UNITS = [
    // [Kategorie, Faktor zur Basis, Anzeige, Stichwörter]
    ["len", 1000, "km", "km kilometer"], ["len", 1, "m", "m meter"], ["len", 0.01, "cm", "cm zentimeter"], ["len", 0.001, "mm", "mm millimeter"],
    ["len", 1609.344, "Meile|Meilen", "meile meilen mi mile miles"], ["len", 1852, "Seemeile|Seemeilen", "seemeile seemeilen sm nm"],
    ["len", 0.3048, "Fuß", "fuss ft feet foot"], ["len", 0.0254, "Zoll", "zoll inch inches"], ["len", 0.9144, "Yard|Yards", "yard yards yd"],
    ["mass", 1000, "kg", "kg kilo kilogramm"], ["mass", 1, "g", "g gramm"], ["mass", 0.001, "mg", "mg milligramm"], ["mass", 1e6, "t", "t tonne tonnen"],
    ["mass", 453.59237, "lb", "lb lbs pound pounds"], ["mass", 28.349523125, "oz", "oz unze unzen ounce ounces"],
    ["vol", 1, "l", "l liter"], ["vol", 0.001, "ml", "ml milliliter"], ["vol", 0.01, "cl", "cl zentiliter"], ["vol", 0.1, "dl", "dl deziliter"],
    ["vol", 3.785411784, "Gallone (US)|Gallonen (US)", "gallone gallonen gal gallon gallons"], ["vol", 0.2365882365, "Cup (US)|Cups (US)", "cup cups tasse tassen"],
    ["vol", 0.0295735295625, "fl oz (US)", "floz fl.oz flunze"],
    ["spd", 1 / 3.6, "km/h", "km/h kmh stundenkilometer"], ["spd", 0.44704, "mph", "mph meilen/h"], ["spd", 1, "m/s", "m/s ms"], ["spd", 0.514444, "Knoten", "knoten kn kt"],
    ["area", 1, "m²", "m2 m² qm quadratmeter"], ["area", 1e6, "km²", "km2 km² qkm quadratkilometer"], ["area", 1e4, "ha", "ha hektar"], ["area", 4046.8564224, "Acre|Acres", "acre acres"], ["area", 0.09290304, "sq ft", "sqft quadratfuss"],
    ["temp", 0, "°C", "c °c grad celsius gradcelsius"], ["temp", 0, "°F", "f °f fahrenheit gradfahrenheit"], ["temp", 0, "K", "k kelvin"]
  ];
  function unit(w) {
    w = String(w || "").replace(/\s+/g, "").replace(/\.$/, "");
    for (var k = 0; k < UNITS.length; k++) if ((" " + UNITS[k][3] + " ").indexOf(" " + w + " ") !== -1) return UNITS[k];
    return null;
  }
  var CONV_RE = /^(?:was sind |wie ?viele? (?:sind )?|rechne |umrechnen |umrechnung )?(-?\d[\d.]*(?:,\d+)?)\s*([a-z°²/.]+(?: ?[a-z°²/.]+)?)\s+(?:in|nach|zu|=|als)\s+([a-z°²/.]+(?: ?[a-z°²/.]+)?)\s*\??$/;
  function convParse(raw) {
    var s = String(raw || "").toLowerCase().replace(/ß/g, "ss").replace(/\bgrad (celsius|fahrenheit)\b/g, "grad$1").replace(/\bmeilen pro stunde\b/g, "mph").replace(/\bfl\.? ?oz\b/g, "floz").replace(/\bsq ?ft\b/g, "sqft").trim();
    var m = s.match(CONV_RE); if (!m) return null;
    var a = unit(m[2]), b = unit(m[3]);
    if (!a || !b || a[0] !== b[0] || a === b) return null;
    var n = parseFloat(m[1].indexOf(",") !== -1 ? m[1].replace(/\./g, "").replace(",", ".") : m[1]);
    if (!isFinite(n)) return null;
    return { n: n, a: a, b: b };
  }
  function convDo(p) {
    if (p.a[0] === "temp") {
      var c = p.a[2] === "°C" ? p.n : (p.a[2] === "°F" ? (p.n - 32) * 5 / 9 : p.n - 273.15);
      return p.b[2] === "°C" ? c : (p.b[2] === "°F" ? c * 9 / 5 + 32 : c + 273.15);
    }
    return p.n * p.a[1] / p.b[1];
  }
  function round3(v) {
    var a = Math.abs(v);
    if (Math.abs(v - Math.round(v)) < 1e-9) return Math.round(v).toLocaleString("de-DE");
    return a >= 100 ? fmt(v, a >= 1e5 ? 0 : 1) : Number(v.toPrecision(4)).toLocaleString("de-DE", { maximumFractionDigits: 6 });
  }
  function uName(u, n) { var t = u[2].split("|"); return Math.abs(n) === 1 && t[1] ? t[0] : (t[1] || t[0]); }

  /* ---------- Uhrzeit weltweit ---------- */
  var ZONES = [
    ["florida miami orlando tampa key west keys naples fort lauderdale new york washington boston ostkuste usa", "America/New_York", "Florida / US-Ostküste"],
    ["los angeles kalifornien san francisco las vegas seattle westkuste", "America/Los_Angeles", "US-Westküste"],
    ["chicago texas dallas houston", "America/Chicago", "Chicago / Texas"], ["denver colorado", "America/Denver", "Denver"],
    ["hawaii honolulu", "Pacific/Honolulu", "Hawaii"], ["kanada toronto montreal", "America/Toronto", "Toronto"], ["vancouver", "America/Vancouver", "Vancouver"],
    ["mexiko cancun", "America/Mexico_City", "Mexiko-Stadt"], ["brasilien rio sao paulo", "America/Sao_Paulo", "São Paulo"], ["argentinien buenos aires", "America/Argentina/Buenos_Aires", "Buenos Aires"],
    ["london england grossbritannien uk schottland irland dublin", "Europe/London", "London"], ["portugal lissabon porto", "Europe/Lisbon", "Lissabon"],
    ["kanaren teneriffa gran canaria lanzarote fuerteventura", "Atlantic/Canary", "Kanaren"], ["island reykjavik", "Atlantic/Reykjavik", "Island"],
    ["madeira", "Atlantic/Madeira", "Madeira"], ["azoren", "Atlantic/Azores", "Azoren"],
    ["griechenland athen kreta rhodos", "Europe/Athens", "Athen"], ["finnland helsinki", "Europe/Helsinki", "Helsinki"], ["turkei istanbul antalya", "Europe/Istanbul", "Istanbul"],
    ["agypten kairo hurghada", "Africa/Cairo", "Kairo"], ["moskau russland", "Europe/Moscow", "Moskau"], ["dubai emirate abu dhabi", "Asia/Dubai", "Dubai"],
    ["indien delhi mumbai", "Asia/Kolkata", "Indien"], ["thailand bangkok phuket", "Asia/Bangkok", "Bangkok"], ["vietnam", "Asia/Ho_Chi_Minh", "Vietnam"], ["bali indonesien", "Asia/Makassar", "Bali"],
    ["singapur", "Asia/Singapore", "Singapur"], ["china peking shanghai hongkong", "Asia/Shanghai", "China"], ["japan tokio tokyo", "Asia/Tokyo", "Tokio"], ["korea seoul", "Asia/Seoul", "Seoul"],
    ["australien sydney melbourne", "Australia/Sydney", "Sydney"], ["perth", "Australia/Perth", "Perth"], ["neuseeland auckland", "Pacific/Auckland", "Auckland"],
    ["sudafrika kapstadt johannesburg", "Africa/Johannesburg", "Südafrika"], ["kenia nairobi", "Africa/Nairobi", "Nairobi"], ["marokko marrakesch", "Africa/Casablanca", "Marokko"],
    ["deutschland hamburg berlin munchen tangstedt hause", "Europe/Berlin", "Deutschland"],
    ["spanien mallorca madrid barcelona frankreich paris italien rom osterreich wien schweiz zurich niederlande amsterdam danemark kopenhagen schweden stockholm norwegen oslo polen kroatien", "Europe/Berlin", "Mitteleuropa"]
  ];
  function zoneFor(q) {
    for (var k = 0; k < ZONES.length; k++) {
      var keys = ZONES[k][0].split(" "), multi = ZONES[k][0].match(/[a-z]+ [a-z]+/g) || [];
      for (var j = 0; j < keys.length; j++) if (new RegExp("\\b" + keys[j] + "\\b").test(q)) return ZONES[k];
      for (var mm = 0; mm < multi.length; mm++) if (q.indexOf(multi[mm]) !== -1) return ZONES[k];
    }
    return null;
  }
  function zoneParts(tz, d) {
    var o = {};
    new Intl.DateTimeFormat("de-DE", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "long" })
      .formatToParts(d).forEach(function (p) { o[p.type] = p.value; });
    return o;
  }
  function zoneOffsetMin(tz, d) {
    var p = zoneParts(tz, d);
    return Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - Math.floor(d.getTime() / 60000) * 60000) / 60000);
  }

  /* ---------- Kalender ---------- */
  function easter(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
      h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
      mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, mo - 1, da);
  }
  function lastSunday(y, m) { var d = new Date(y, m + 1, 0); d.setDate(d.getDate() - d.getDay()); return d; }
  function nthSunday(y, m, n) { var d = new Date(y, m, 1); d.setDate(1 + ((7 - d.getDay()) % 7) + (n - 1) * 7); return d; }
  function addD(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  var FEAST = [
    ["heiligabend", "Heiligabend", function (y) { return new Date(y, 11, 24); }],
    ["weihnachten|weihnachtstag", "Weihnachten", function (y) { return new Date(y, 11, 25); }],
    ["silvester", "Silvester", function (y) { return new Date(y, 11, 31); }],
    ["neujahr|neues jahr|jahreswechsel", "Neujahr", function (y) { return new Date(y, 0, 1); }],
    ["nikolaus", "Nikolaus", function (y) { return new Date(y, 11, 6); }],
    ["(1\\.|erster|ersten) advent|\\badvent\\b", "1. Advent", function (y) { return addD(new Date(y, 11, 24), -new Date(y, 11, 24).getDay() - 21); }],
    ["karfreitag", "Karfreitag", function (y) { return addD(easter(y), -2); }],
    ["ostermontag", "Ostermontag", function (y) { return addD(easter(y), 1); }],
    ["ostern|ostersonntag", "Ostern", easter],
    ["himmelfahrt|vatertag", "Christi Himmelfahrt", function (y) { return addD(easter(y), 39); }],
    ["pfingstmontag", "Pfingstmontag", function (y) { return addD(easter(y), 50); }],
    ["pfingsten", "Pfingsten", function (y) { return addD(easter(y), 49); }],
    ["muttertag", "Muttertag", function (y) { return nthSunday(y, 4, 2); }],
    ["valentinstag", "Valentinstag", function (y) { return new Date(y, 1, 14); }],
    ["halloween", "Halloween", function (y) { return new Date(y, 9, 31); }],
    ["reformationstag", "Reformationstag", function (y) { return new Date(y, 9, 31); }],
    ["tag der (deutschen )?einheit|3\\. oktober", "Tag der Deutschen Einheit", function (y) { return new Date(y, 9, 3); }],
    ["tag der arbeit|1\\. mai|maifeiertag", "Tag der Arbeit", function (y) { return new Date(y, 4, 1); }],
    ["fruhlingsanfang|fruhling", "Frühlingsanfang", function (y) { return new Date(y, 2, 20); }],
    ["sommeranfang|sommer", "Sommeranfang", function (y) { return new Date(y, 5, 21); }],
    ["herbstanfang|herbst", "Herbstanfang", function (y) { return new Date(y, 8, 22); }],
    ["winteranfang|winter", "Winteranfang", function (y) { return new Date(y, 11, 21); }]
  ];
  function isoWeek(d) {
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    return Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7);
  }
  function longDate(d) { return d.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
  function inDays(n) { return n === 0 ? "Heute" : n === 1 ? "Morgen" : n === 2 ? "Übermorgen" : "In " + n.toLocaleString("de-DE") + " Tagen"; }

  /* ---------- Wegweiser zu den Werkzeug-Apps ---------- */
  var GUIDE = [
    [/gewitter.*(wie weit|entfern|abstand|weg|kommt|zieht)|(wie weit|entfernung).*gewitter|blitz.*donner/, "mw", "./mw-index.html#gewitter", "Das misst der Gewitter-Peiler", "In MessWahr den Blitz antippen – den Donner hört die App selbst. Daraus werden Entfernung, Richtung und Zug des Gewitters."],
    [/(wie (hoch|gross) ist|hohe (von|eines|des|der)|hohe messen|wie hoch)/, "mw", "./mw-index.html#hoehe", "Das misst MessWahr", "Fußpunkt und Spitze mit der Kamera anpeilen – MessWahr rechnet die Höhe aus Neigung und Entfernung."],
    [/(wasserwaage|gerade|schief|neigung|gefalle|steigung)/, "mw", "./mw-index.html#waage", "Wasserwaage in MessWahr", "Smartphone auflegen – Neigung in Grad und Prozent, auch für Bilder und Regale."],
    [/(wie laut|lautstarke|dezibel|\bdb\b|larm)/, "lw", "./lw-index.html", "Das misst LautstärkeWahr", "Pegel in Dezibel mit Verlauf und Schwellenwert-Alarm – nur live, nichts wird aufgenommen."],
    [/(welcher ton|welche note|frequenz|hertz|\bhz\b|stimmgerat|gitarre stimmen|stimmen)/, "kl", "./kl-index.html#stimmen", "Das zeigt KlangWahr", "Stimmgerät, Spektrum und Tongenerator – live ausgewertet, ohne Aufnahme."],
    [/(was ist das fur ein|welcher berg|welche kirche|welche burg|was sehe ich|was ist da hinten|horizont)/, "hz", "./hz-index.html", "Frag HorizontWahr", "Kamera auf den Horizont richten – Kirchen, Burgen, Orte und Berge erscheinen mit Namen und Entfernung."],
    [/(welcher stern|welches sternbild|sternbild|was leuchtet da|heller punkt am himmel)/, "zh", "./sternewahr-index.html", "Schau im Sternenhimmel nach", "Smartphone an den Himmel halten – Sterne, Sternbilder und Planeten werden live beschriftet."],
    [/(wo ist norden|himmelsrichtung|welche richtung|kompass)/, "kw", "./kw-index.html", "KompassWahr zeigt die Richtung", "Kompass mit Kamera-Übersicht, Orten und Wegpunkten in deiner Umgebung."],
    [/(unter mir|andere seite der erde|durch die erde|antipode)/, "sn", "./sn-index.html", "Schau durch die Erde", "StaunWahr zeigt, was genau auf der anderen Seite der Erde liegt – mit Röntgenblick zum Himmel darunter."],
    [/(e-?nummer|zusatzstoff|inhaltsstoff|inci|barcode|ist .* gesund|kosmetik)/, "pw", "./pw-index.html", "Prüf es mit ProduktWahr", "Barcode oder Zutatenliste scannen – Zusatzstoffe und Inhaltsstoffe werden verständlich erklärt."],
    [/(qr|qr-code)/, "qr", "./qr-index.html", "QRWahr liest den Code", "Code scannen und den Inhalt erst ansehen – nichts öffnet sich automatisch."],
    [/(pendel|erdbeschleunigung|experiment|versuch|physik)/, "lb", "./lb-index.html", "Probier es in LabWahr aus", "18 Physik-Versuche mit den Sensoren deines Smartphones – messen, auswerten, verstehen."]
  ];
  function guideFor(q) {
    for (var k = 0; k < GUIDE.length; k++) if (GUIDE[k][0].test(q)) return GUIDE[k];
    return null;
  }

  var EXTRA_HANDLERS = {
    rechnen: function (q, H, now, raw) {
      var s = calcPrep(raw), v;
      try { v = calcEval(s); } catch (e) { return A({ app: "wz", title: e === 1 ? "Durch null teilen geht nicht" : "Das kann ich nicht rechnen", text: "Erlaubt sind + − × ÷, Klammern, hoch (^), Wurzel und Prozent, z. B. „19 % von 250“ oder „250 + 19 %“." }); }
      return A({ app: "wz", title: "= " + nice(v), text: String(raw).trim().replace(/\s*[=?]+\s*$/, "") + " = " + nice(v), note: "Auf deinem Gerät gerechnet" });
    },
    umrechnen: function (q, H, now, raw) {
      var p = convParse(raw); if (!p) return null;
      var v = convDo(p);
      return A({ app: "wz", title: round3(p.n) + " " + uName(p.a, p.n) + " = " + round3(v) + " " + uName(p.b, Number(round3(v).replace(/\./g, "").replace(",", "."))), text: p.a[0] === "temp" || p.n === 1 ? "" : "1 " + uName(p.a, 1) + " = " + round3(p.a[1] / p.b[1]) + " " + uName(p.b, p.a[1] / p.b[1]) + ".", note: "Auf deinem Gerät umgerechnet" });
    },
    uhrzeit: function (q, H, now) {
      var z = zoneFor(q.replace(/^.*?\b(in|auf|im|nach|fur)\b/, ""));
      var here = hm(now) + " Uhr";
      if (!z) {
        if (/\b(in|auf|im|nach)\b/.test(q) && !/\b(jetzt|gerade|hier|bei mir)\b\s*\??$/.test(q)) return A({ app: "wz", title: "Diesen Ort kenne ich nicht", text: "Bei dir ist es " + here + ". Ich kenne u. a. Florida, New York, London, Kanaren, Dubai, Bangkok, Tokio, Sydney und Hawaii." });
        return A({ app: "wz", title: "Es ist " + here, text: longDate(now) + " · Kalenderwoche " + isoWeek(now) + "." });
      }
      var p = zoneParts(z[1], now), diff = (zoneOffsetMin(z[1], now) - zoneOffsetMin(Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Berlin", now)) / 60;
      var dTxt = diff === 0 ? "Gleiche Zeit wie bei dir" : (Math.abs(diff) + (Math.abs(diff) === 1 ? " Stunde " : " Stunden ")).replace(".", ",") + (diff < 0 ? "hinter dir" : "vor dir");
      var sameDay = p.weekday === now.toLocaleDateString("de-DE", { weekday: "long" });
      return A({ app: "wz", title: z[2] + ": " + p.hour + ":" + p.minute + " Uhr", text: dTxt + (sameDay ? "" : " · dort ist " + p.weekday) + ". Bei dir: " + here + ".", note: "Zeitzonen und Sommerzeit aus deinem Gerät" });
    },
    datum: function (q, H, now) {
      var y = now.getFullYear(), t0 = dayStart(now);
      if (/(zeitumstellung|uhr(en)? umgestellt|umstellung|sommerzeit|winterzeit|normalzeit)/.test(q)) {
        var a = [lastSunday(y, 2), lastSunday(y, 9), lastSunday(y + 1, 2)].filter(function (d) { return d >= t0; })[0];
        var toSummer = a.getMonth() === 2, n = Math.round((a - t0) / 864e5);
        return A({ app: "wz", title: "Nächste Zeitumstellung: " + a.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" }),
          text: inDays(n) + ". " + (toSummer ? "Um 2 Uhr wird die Uhr auf 3 Uhr vorgestellt – eine Stunde weniger Schlaf." : "Um 3 Uhr wird die Uhr auf 2 Uhr zurückgestellt – eine Stunde mehr Schlaf."), note: "Gesetzliche Regel: letzter Sonntag im März bzw. Oktober" });
      }
      for (var k = 0; k < FEAST.length; k++) {
        if (new RegExp(FEAST[k][0]).test(q)) {
          var d = FEAST[k][2](y); if (d < t0) d = FEAST[k][2](y + 1);
          var n2 = Math.round((dayStart(d) - t0) / 864e5);
          return A({ app: "wz", title: FEAST[k][1] + ": " + (n2 === 0 ? "heute" : n2 === 1 ? "morgen" : "noch " + n2.toLocaleString("de-DE") + " Tage"), text: longDate(d) + (n2 > 13 ? " – " + (n2 % 7 ? Math.floor(n2 / 7) + " Wochen und " + (n2 % 7) + (n2 % 7 === 1 ? " Tag." : " Tage.") : "genau " + n2 / 7 + " Wochen.") : "."), note: "Auf deinem Gerät berechnet" });
        }
      }
      var m = q.match(/(\d{1,2})\.\s?(\d{1,2})\.?(\d{2,4})?/);
      if (m && /\bbis\b|wann|wie (viele|lange)/.test(q)) {
        var yy = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : y, dd = new Date(yy, +m[2] - 1, +m[1]);
        if (!m[3] && dd < t0) dd = new Date(y + 1, +m[2] - 1, +m[1]);
        if (dd.getDate() === +m[1]) {
          var n3 = Math.round((dd - t0) / 864e5);
          return A({ app: "wz", title: n3 >= 0 ? inDays(n3) : "Vor " + (-n3).toLocaleString("de-DE") + " Tagen", text: longDate(dd) + ".", note: "Auf deinem Gerät berechnet" });
        }
      }
      var start = new Date(y, 0, 1), doy = Math.round((t0 - start) / 864e5) + 1, len = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365;
      return A({ app: "wz", title: longDate(now), text: "Kalenderwoche " + isoWeek(now) + " · Tag " + doy + " von " + len + " · noch " + (len - doy) + " Tage bis Jahresende.", note: "Auf deinem Gerät berechnet" });
    },
    wegweiser: function (q) {
      var g = guideFor(q); if (!g) return null;
      return A({ app: g[1], href: g[2], title: g[3], text: g[4], note: "Tippen zum Öffnen" });
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

  for (var hk in EXTRA_HANDLERS) if (Object.prototype.hasOwnProperty.call(EXTRA_HANDLERS, hk)) HANDLERS[hk] = EXTRA_HANDLERS[hk];

  function answer(raw, H) {
    var id = detect(raw);
    if (!id || !HANDLERS[id]) return Promise.resolve(null);
    var q = norm(raw), now = new Date();
    try { return Promise.resolve(HANDLERS[id](q, H, now, raw)).catch(function () { return null; }); }
    catch (e) { return Promise.resolve(null); }
  }

  global.wzAsk = { answer: answer, detect: detect, looksLikeQuestion: looksLikeQuestion, examples: EXAMPLES, _timeWindow: timeWindow };
})(typeof window !== "undefined" ? window : this);
