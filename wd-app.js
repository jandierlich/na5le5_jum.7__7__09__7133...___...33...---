/* ============================================================
   WunderWahr – jeden Tag ein Grund zu staunen
   Bereiche: TagesWahr (Tageswunder), KilometerWahr (Meilensteine & Lebensuhr),
   WeitblickWahr (geradeaus um die Welt, Tag und Nacht), ZeitWahr (Erdgeschichte zu Fuß).
   Alles wird auf dem Gerät berechnet; es wird nichts gesendet.
   Speicher (Präfix wunderwahr_): Personen/Geburtsdaten, Sammlung, Fortschritt des ZeitWahrs, Einstellungen.
   © 2026 Jan Dierlich – Alle Rechte vorbehalten.
   ============================================================ */
(function () {
  "use strict";
  var D = window.WD_DATA, A = window.Astro;
  var $ = function (id) { return document.getElementById(id); };
  var D2R = Math.PI / 180, R2D = 180 / Math.PI, RE = 6371.0088;
  var DAY = 86400000;

  /* ---------------- Helfer ---------------- */
  function load(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmt(n, d) { return (n == null || !isFinite(n)) ? "–" : n.toLocaleString("de-DE", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function big(n) {
    var a = Math.abs(n);
    if (a >= 1e12) return fmt(n / 1e12, 2) + " Billionen";
    if (a >= 1e9) return fmt(n / 1e9, 2) + " Milliarden";
    if (a >= 1e6) return fmt(n / 1e6, 2) + " Millionen";
    return fmt(n, 0);
  }
  function ordinal(n) { return fmt(n, 0) + "."; }
  var WD = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  var MO = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  function dLong(d) { return WD[d.getDay()] + ", " + d.getDate() + ". " + MO[d.getMonth()] + " " + d.getFullYear(); }
  function dShort(d) { return d.getDate() + ". " + MO[d.getMonth()] + " " + d.getFullYear(); }
  function midnight(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function daysBetween(a, b) { return Math.round((midnight(b) - midnight(a)) / DAY); }
  function toast(t) { if (window.wzToast) wzToast(t); }
  function wrap360(a) { return ((a % 360) + 360) % 360; }
  function wrap180(a) { return ((a + 540) % 360) - 180; }

  /* ---------------- Reiter ---------------- */
  var tabs = document.querySelectorAll(".sn-tab");
  function showTab(id) {
    tabs.forEach(function (t) { var on = t.getAttribute("data-tab") === id; t.classList.toggle("active", on); t.setAttribute("aria-selected", on ? "true" : "false"); });
    document.querySelectorAll(".screen").forEach(function (s) { s.classList.toggle("active", s.id === "screen-" + id); });
    save("wunderwahr_tab", id);
    if (id === "weitblick") renderWeitblick();
    if (id === "kilometer") renderKilometer();
    if (id === "zeit") renderZeit();
  }
  tabs.forEach(function (t) { t.addEventListener("click", function () { showTab(t.getAttribute("data-tab")); }); });

  /* =========================================================
     1. TagesWahr – Tageswunder
     ========================================================= */
  var offset = 0; // 0 = heute, -1 = gestern …
  function wonderFor(date) { return D.wonderFor(date); }
  function sammlung() { return load("wunderwahr_sammlung", []); }
  function renderTages() {
    var day = new Date(Date.now() + offset * DAY);
    var w = wonderFor(day), saved = sammlung().indexOf(w.id) >= 0;
    $("fbDate").textContent = offset === 0 ? "Heute · " + dLong(day) : dLong(day);
    $("fbCard").innerHTML =
      '<div class="wd-over">' + esc(w.k) + '</div>' +
      '<h2 class="wd-card-t">' + esc(w.t) + '</h2>' +
      '<p class="wd-card-x">' + esc(w.x) + '</p>' +
      '<details class="wd-more"><summary>Wie kann das sein?</summary><p>' + esc(w.w) + '</p></details>' +
      '<div class="wd-card-acts">' +
      '<button type="button" class="wd-glass" id="fbPrev" aria-label="Vorheriger Tag"><svg class="wzi"><use href="#wzi-left"></use></svg></button>' +
      '<button type="button" class="wd-glass wd-keep' + (saved ? ' on' : '') + '" id="fbKeep"><svg class="wzi"><use href="#wzi-' + (saved ? 'starfill' : 'star') + '"></use></svg>' + (saved ? 'In der Sammlung' : 'Sammeln') + '</button>' +
      '<button type="button" class="wd-glass" id="fbNext" aria-label="Nächster Tag"' + (offset >= 0 ? ' disabled' : '') + '><svg class="wzi"><use href="#wzi-right"></use></svg></button>' +
      '</div>';
    $("fbPrev").onclick = function () { if (offset > -6) { offset--; renderTages(); } else toast("Ältere Karten findest du in deiner Sammlung."); };
    $("fbNext").onclick = function () { if (offset < 0) { offset++; renderTages(); } };
    $("fbKeep").onclick = function () {
      var s = sammlung(), i = s.indexOf(w.id);
      if (i >= 0) s.splice(i, 1); else s.unshift(w.id);
      save("wunderwahr_sammlung", s); renderTages();
    };
    // Heute vor … Jahren
    var key = String(day.getMonth() + 1).padStart(2, "0") + "-" + String(day.getDate()).padStart(2, "0");
    var hv = D.HEUTE[key];
    $("fbHeute").hidden = !hv;
    if (hv) {
      $("fbHeute").innerHTML = '<h2>Heute vor …</h2>' + hv.map(function (e) {
        return '<div class="sn-fact"><div class="ic wd-yr">' + (day.getFullYear() - e[0]) + '</div><div><b>' + (day.getFullYear() - e[0]) + ' Jahren · ' + e[0] + '</b><span>' + esc(e[1]) + '</span></div></div>';
      }).join("");
    }
    // Sammlung
    var s = sammlung(), list = s.map(function (id) { return D.WUNDER.filter(function (x) { return x.id === id; })[0]; }).filter(Boolean);
    $("fbSamCount").textContent = list.length ? list.length + (list.length === 1 ? " Karte" : " Karten") : "noch leer";
    $("fbSam").innerHTML = list.length ? list.map(function (x) {
      return '<details class="wd-sam"><summary><span class="wd-dot"></span><b>' + esc(x.t) + '</b><small>' + esc(x.k) + '</small></summary><p>' + esc(x.x) + ' ' + esc(x.w) + '</p></details>';
    }).join("") : '<p class="muted small" style="margin:0">Tippe auf „Sammeln“, um eine Karte aufzuheben. Deine Sammlung wächst mit jedem Tag.</p>';
  }

  /* =========================================================
     2. KilometerWahr – Meilensteine & Lebensuhr
     ========================================================= */
  var SYN = 29.530588853, ORBIT_KM_S = 29.78, GAL_KM_S = 230, SID = 86164.0905;
  var HR = 75 / 60, BR = 16 / 60; // Schätzwerte je Sekunde (Ø Herzschlag 75/min, Ø Atem 16/min)
  function persons() { return load("wunderwahr_personen", []); }
  var activeP = load("wunderwahr_person", null);
  function birth(p) { var a = p.date.split("-"); return new Date(+a[0], +a[1] - 1, +a[2], 12, 0, 0); }
  function firstFullMoonAfter(t) {
    if (A && A.moonPhaseTime) { var jd = A.moonPhaseTime(A.toJD(t), 180, 1); if (jd) return A.fromJD(jd); }
    return new Date(t.getTime() + 14 * DAY);
  }
  function fullMoonN(b, n) { // Datum des n-ten Vollmonds nach der Geburt (n ≥ 1)
    var f1 = firstFullMoonAfter(b), est = new Date(f1.getTime() + (n - 1) * SYN * DAY);
    if (A && A.moonPhaseTime) { var jd = A.moonPhaseTime(A.toJD(est) - 3, 180, 1); if (jd) return A.fromJD(jd); }
    return est;
  }
  function milestones(p, from, to) {
    var b = birth(p), out = [], bt = b.getTime(), nm = p.name && p.name !== "Ich" ? p.name : null;
    var who = nm ? nm + "s " : "Dein ";
    var whoF = nm ? nm + "s " : "Deine ";
    function add(t, title, sub, big) { if (t >= from && t <= to) out.push({ t: t, title: title, sub: sub, big: !!big, p: p }); }
    var s = function (sec) { return bt + sec * 1000; };
    // Lebenstage
    for (var k = 1000; k <= 40000; k += 1000) add(bt + k * DAY, who + fmt(k) + ". Lebenstag", "Seit " + (nm || "deiner") + (nm ? "s" : "") + " Geburt sind " + fmt(k) + " Tage vergangen.", k % 5000 === 0);
    // Sekunden
    for (var q = 0.5; q <= 3; q += 0.5) add(s(q * 1e9), q === 1 ? whoF + "erste Milliarde Sekunden" : (nm ? nm + " ist " : "Du bist ") + fmt(q, q === Math.floor(q) ? 0 : 1) + " Milliarden Sekunden alt", "Eine Milliarde Sekunden sind rund 31 Jahre und 8 Monate.", q === Math.floor(q));
    // Stunden, Wochen, Minuten
    for (var h = 100000; h <= 900000; h += 100000) add(s(h * 3600), whoF + fmt(h) + ". Stunde", "Ein Stunden-Jubiläum, das kaum jemand bemerkt.");
    for (var wk = 500; wk <= 5000; wk += 500) add(s(wk * 7 * 86400), whoF + fmt(wk) + ". Woche", "Wochen gezählt seit dem ersten Tag.");
    for (var mi = 5e6; mi <= 5e7; mi += 5e6) add(s(mi * 60), whoF + fmt(mi / 1e6) + "-millionste Minute", "Fünf Millionen Minuten sind knapp neuneinhalb Jahre.");
    // Planeten-Geburtstage
    [["Merkur", 87.969, 10], ["Venus", 224.701, 5], ["Mars", 686.98, 1], ["Jupiter", 4332.59, 1]].forEach(function (pl) {
      for (var n = 1; n * pl[1] < 40000; n++) {
        if (n % pl[2] !== 0 && pl[0] !== "Mars" && pl[0] !== "Jupiter") continue;
        add(bt + n * pl[1] * DAY, who + ordinal(n) + " " + pl[0] + "-Geburtstag", (nm || "Du") + (nm ? " ist" : " bist") + " dann " + fmt(n) + " " + pl[0] + "-Jahre alt (1 " + pl[0] + "-Jahr = " + fmt(pl[1], 0) + " Erdtage).", pl[0] === "Jupiter");
      }
    });
    // Reise um die Sonne (km entlang der Bahn)
    for (var km = 5e9; km <= 7.5e10; km += 5e9) add(s(km / ORBIT_KM_S), (nm ? nm + ": " : "") + fmt(km / 1e9) + " Milliarden km um die Sonne", "So weit " + (nm ? "ist " + nm : "bist du") + " dann mit der Erde auf ihrer Bahn gereist.", km % 1e10 === 0);
    // Herzschläge & Atemzüge (Schätzung)
    for (var hb = 5e8; hb <= 3.5e9; hb += 5e8) add(s(hb / HR), (nm ? nm + ": rund " : "Rund ") + (hb % 1e9 === 0 ? fmt(hb / 1e9) + " Milliarden" : fmt(hb / 1e9, 1) + " Milliarden") + " Herzschläge", "Schätzung mit durchschnittlich 75 Schlägen pro Minute.", hb % 1e9 === 0);
    for (var br = 1e8; br <= 7e8; br += 1e8) add(s(br / BR), (nm ? nm + ": rund " : "Rund ") + fmt(br / 1e6) + " Millionen Atemzüge", "Schätzung mit durchschnittlich 16 Atemzügen pro Minute.");
    // Vollmonde (je 50) – Datum genau berechnet
    var est0 = Math.floor((from - bt) / (SYN * DAY));
    for (var n2 = Math.max(50, Math.ceil(est0 / 50) * 50 - 50); n2 <= est0 + 80; n2 += 50) {
      var fm = fullMoonN(b, n2).getTime();
      add(fm, who + fmt(n2) + ". Vollmond", "Seit " + (nm ? nm + "s" : "deiner") + " Geburt geht der Mond zum " + fmt(n2) + ". Mal voll auf.", n2 % 100 === 0);
    }
    return out.sort(function (a, b2) { return a.t - b2.t; });
  }
  function nextFor(list, from, days) { return list.filter(function (m) { return m.t >= from; }); }
  var liveTimer = null;
  function renderKilometer() {
    var ps = persons();
    var setup = $("llSetup"), main = $("llMain");
    if (!ps.length) { setup.hidden = false; main.hidden = true; return; }
    setup.hidden = true; main.hidden = false;
    if (!activeP || !ps.some(function (p) { return p.id === activeP; })) activeP = ps[0].id;
    // Personen-Chips
    $("llPeople").innerHTML = ps.map(function (p) {
      return '<button type="button" class="chip' + (p.id === activeP ? ' active' : '') + '" data-id="' + p.id + '">' + esc(p.name || "Ich") + '</button>';
    }).join("") + '<button type="button" class="chip" id="llAdd"><svg class="wzi"><use href="#wzi-plus"></use></svg>Person</button>';
    $("llPeople").querySelectorAll("[data-id]").forEach(function (b) { b.onclick = function () { activeP = b.getAttribute("data-id"); save("wunderwahr_person", activeP); renderKilometer(); }; });
    $("llAdd").onclick = function () { $("llForm").hidden = false; $("llName").focus(); };
    var p = ps.filter(function (x) { return x.id === activeP; })[0];
    var now = Date.now(), list = milestones(p, now - 400 * DAY, now + 12 * 365 * DAY);
    var up = list.filter(function (m) { return m.t >= midnight(new Date()).getTime(); });
    var past = list.filter(function (m) { return m.t < midnight(new Date()).getTime(); });
    var nx = up[0];
    if (nx) {
      var dd = daysBetween(new Date(), new Date(nx.t));
      $("llNext").innerHTML = '<div class="wd-over">Nächster Meilenstein</div><h2 class="wd-card-t">' + esc(nx.title) + '</h2>' +
        '<p class="wd-card-x">' + dLong(new Date(nx.t)) + '</p>' +
        '<div class="wd-count"><b>' + (dd === 0 ? "Heute!" : dd === 1 ? "Morgen" : "in " + fmt(dd) + " Tagen") + '</b><span>' + esc(nx.sub) + '</span></div>';
    }
    $("llList").innerHTML = up.slice(1, 9).map(function (m) {
      var d2 = daysBetween(new Date(), new Date(m.t));
      return '<div class="sn-row' + (m.big ? ' on' : '') + '"><span class="dot" style="background:' + (m.big ? 'var(--wd-gold)' : 'var(--accent)') + '"></span><div class="main"><b>' + esc(m.title) + '</b><span>' + dShort(new Date(m.t)) + '</span></div><div class="r">' + (d2 < 60 ? fmt(d2) + " Tg." : fmt(d2 / 30.44, 0) + " Mon.") + '</div></div>';
    }).join("");
    var lp = past[past.length - 1];
    $("llPast").innerHTML = (lp ? 'Zuletzt erreicht: <b>' + esc(lp.title) + '</b> am ' + dShort(new Date(lp.t)) + ' · ' : '') +
      '<button type="button" class="wd-link" id="llDel">' + esc(p.name || "Ich") + ' entfernen</button>';
    $("llDel").onclick = function () {
      var q = window.wzConfirm ? wzConfirm((p.name || "Ich") + " mit Geburtsdatum aus KilometerWahr entfernen?", { okLabel: "Entfernen" }) : Promise.resolve(true);
      q.then(function (ok) { if (!ok) return; save("wunderwahr_personen", persons().filter(function (x) { return x.id !== p.id; })); activeP = null; save("wunderwahr_person", null); renderKilometer(); renderZeit(); });
    };
    // Familie: nächste Anlässe aller Personen
    if (ps.length > 1) {
      var all = [];
      ps.forEach(function (pp) { all = all.concat(milestones(pp, now, now + 365 * DAY).filter(function (m) { return m.big || /Lebenstag|Milliarde Sekunden|Jupiter/.test(m.title); })); });
      all.sort(function (a, b) { return a.t - b.t; });
      $("llFam").hidden = !all.length;
      $("llFamList").innerHTML = all.slice(0, 5).map(function (m) { return '<div class="sn-row"><span class="dot" style="background:var(--wd-gold)"></span><div class="main"><b>' + esc(m.title) + '</b><span>' + dShort(new Date(m.t)) + '</span></div></div>'; }).join("");
    } else $("llFam").hidden = true;
    startLive(p);
  }
  function startLive(p) {
    clearInterval(liveTimer);
    var b = birth(p).getTime(), b0 = midnight(new Date()).getTime();
    function tick() {
      var now = Date.now(), sec = (now - b) / 1000, today = (now - b0) / 1000;
      var fm = Math.floor((now - firstFullMoonAfter(new Date(b)).getTime()) / (SYN * DAY)) + 1;
      $("llLive").innerHTML = [
        ["Sekunden gelebt", fmt(Math.floor(sec)), ""],
        ["Herzschläge (geschätzt)", fmt(Math.floor(sec * HR)), "Ø 75 pro Minute"],
        ["Km mit der Erde um die Sonne", fmt(Math.floor(sec * ORBIT_KM_S)), "29,78 km in jeder Sekunde"],
        ["Km mit der Sonne durch die Milchstraße", fmt(Math.floor(sec * GAL_KM_S)), "rund 230 km pro Sekunde"],
        ["Erdumdrehungen erlebt", fmt(Math.floor(sec / SID)), ""],
        ["Vollmonde erlebt", fmt(fm), ""]
      ].map(function (r) { return '<div class="wd-live-row"><span>' + r[0] + (r[2] ? '<small>' + r[2] + '</small>' : '') + '</span><b>' + r[1] + '</b></div>'; }).join("");
      $("llWorld").innerHTML = [
        ["Geburten weltweit", fmt(Math.floor(today * 4.25)), "≈ 4,3 pro Sekunde"],
        ["Blitzeinschläge", fmt(Math.floor(today * 44)), "≈ 44 pro Sekunde"],
        ["Herzschläge aller Menschen", big(today * 8.1e9 * HR), "Schätzung"],
        ["Km der Erde auf ihrer Bahn", fmt(Math.floor(today * ORBIT_KM_S)), "seit Mitternacht"]
      ].map(function (r) { return '<div class="wd-live-row"><span>' + r[0] + '<small>' + r[2] + '</small></span><b>' + r[1] + '</b></div>'; }).join("");
    }
    tick(); liveTimer = setInterval(function () { if (document.querySelector("#screen-kilometer.active")) tick(); }, 250);
  }
  $("llSave").onclick = function () {
    var name = ($("llName").value || "").trim(), v = $("llDate").value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) { toast("Bitte ein Geburtsdatum wählen."); return; }
    var ps = persons(); var id = "p" + Date.now().toString(36);
    ps.push({ id: id, name: name || (ps.length ? "Person " + (ps.length + 1) : "Ich"), date: v });
    save("wunderwahr_personen", ps); activeP = id; save("wunderwahr_person", id);
    $("llForm").hidden = true; $("llName").value = ""; renderKilometer();
  };
  $("llStart").onclick = function () {
    var v = $("llDate0").value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) { toast("Bitte dein Geburtsdatum wählen."); return; }
    save("wunderwahr_personen", [{ id: "ich", name: "Ich", date: v }]); activeP = "ich"; renderKilometer(); renderZeit();
  };
  $("llCancel").onclick = function () { $("llForm").hidden = true; };

  /* =========================================================
     3. WeitblickWahr – geradeaus um die Welt, Tag und Nacht
     ========================================================= */
  var GEO = { world: null, places: null, loading: null, mask: null };
  function decode(arr) { var out = new Float32Array(arr.length), x = 0, y = 0; for (var i = 0; i < arr.length; i += 2) { x += arr[i]; y += arr[i + 1]; out[i] = x / 100; out[i + 1] = y / 100; } return out; }
  function loadGeo() {
    if (GEO.loading) return GEO.loading;
    GEO.loading = Promise.all([fetch("wow-world.json").then(function (r) { return r.json(); }), fetch("wow-places.json").then(function (r) { return r.json(); })]).then(function (res) {
      res[0].forEach(function (c) { c.polys = c.p.map(function (poly) { return poly.map(decode); }); delete c.p; });
      GEO.world = res[0];
      GEO.places = res[1].map(function (x) { return { n: x[0], lat: x[1], lon: x[2], c: x[3], pop: x[5] || 0 }; }).filter(function (x) { return x.pop >= 150000; });
      buildMask();
    });
    return GEO.loading;
  }
  function inRing(r, lon, lat) { var inside = false; for (var i = 0, j = r.length - 2; i < r.length; j = i, i += 2) { var xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1]; if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) inside = !inside; } return inside; }
  function countryAt(lat, lon) {
    for (var k = 0; k < GEO.world.length; k++) {
      var c = GEO.world[k], b = c.bb;
      if (lon < b[0] - .01 || lon > b[2] + .01 || lat < b[1] - .01 || lat > b[3] + .01) continue;
      for (var p = 0; p < c.polys.length; p++) { var rings = c.polys[p]; if (inRing(rings[0], lon, lat)) { var hole = false; for (var h = 1; h < rings.length; h++) if (inRing(rings[h], lon, lat)) { hole = true; break; } if (!hole) return c; } }
    }
    return null;
  }
  /* Meeresnamen – grobe Einteilung nach Lage (für die Anzeige ausreichend) */
  function seaAt(lat, lon) {
    function box(a, b, c, d) { return lon >= a && lon <= b && lat >= c && lat <= d; }
    if (box(9.5, 30.5, 53.3, 66)) return "Ostsee";
    if (box(-4.5, 9.5, 50.8, 61.5)) return "Nordsee";
    if (box(27, 42, 40.5, 47.5)) return "Schwarzes Meer";
    if (box(46, 55, 36, 47.5)) return "Kaspisches Meer";
    if (box(-6, 36.5, 30, 46.5)) return "Mittelmeer";
    if (box(32, 44, 12, 30)) return "Rotes Meer";
    if (box(47, 57, 23, 30.5)) return "Persischer Golf";
    if (box(-98, -80.5, 18, 31)) return "Golf von Mexiko";
    if (box(-89, -59, 8, 22.5)) return "Karibisches Meer";
    if (box(-96, -76, 51, 64.5)) return "Hudsonbucht";
    if (lat > 66) return "Arktischer Ozean";
    if (lat < -60) return "Südlicher Ozean";
    if (lon > 20 && lon < 147 && lat < 30 && !(lon > 105 && lat > -8) && !(lon > 129 && lat > -15)) return "Indischer Ozean";
    if (lon >= -70 && lon <= 20) { if (lat < 10 && lon < -77) return "Pazifischer Ozean"; return "Atlantischer Ozean"; }
    if (lon > -100 && lon < -70 && lat > 8 && lat < 66) { if (lat > 20 || lon > -80) return "Atlantischer Ozean"; }
    return "Pazifischer Ozean";
  }
  function dest(lat, lon, brg, km) {
    var d = km / RE, p1 = lat * D2R, l1 = lon * D2R, t = brg * D2R;
    var p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(t));
    var l2 = l1 + Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
    return [p2 * R2D, wrap180(l2 * R2D)];
  }
  function hav(a, b, c, d) { var dl = (c - a) * D2R, dn = (d - b) * D2R; var x = Math.sin(dl / 2) * Math.sin(dl / 2) + Math.cos(a * D2R) * Math.cos(c * D2R) * Math.sin(dn / 2) * Math.sin(dn / 2); return 2 * RE * Math.asin(Math.min(1, Math.sqrt(x))); }
  var LOC = (function () {
    var k = window.wzCore && wzCore.knownLocation && wzCore.knownLocation();
    if (k && isFinite(k.lat)) return { lat: +k.lat, lon: +k.lon, name: k.name || "" };
    return { lat: 53.733, lon: 10.083, name: "Tangstedt" };
  })();
  var CIRC = 2 * Math.PI * RE;
  function geradeaus(brg) {
    var step = 10, pts = [], segs = [], cur = null, homeC = countryAt(LOC.lat, LOC.lon);
    for (var km = 0; km <= CIRC; km += step) {
      var p = dest(LOC.lat, LOC.lon, brg, km), c = countryAt(p[0], p[1]);
      var name = c ? c.de : seaAt(p[0], p[1]), land = !!c;
      pts.push(p);
      if (!cur || cur.name !== name) { cur = { name: name, land: land, a: km, b: km, a3: c ? c.id : null }; segs.push(cur); }
      cur.b = km + step;
    }
    // sehr kurze Abschnitte (< 25 km) mit dem Nachbarn zusammenführen, außer Länder
    // Übersichtlich: Länder immer, Meeresabschnitte erst ab 150 km (kurze Stücke zwischen Inseln entfallen)
    segs = segs.filter(function (s, i) { return s.land || s.b - s.a >= 150 || i === 0 || i === segs.length - 1; });
    var merged = []; segs.forEach(function (s) { var l = merged[merged.length - 1]; if (l && l.name === s.name) l.b = s.b; else merged.push({ name: s.name, land: s.land, a: s.a, b: s.b }); });
    // Großstädte nahe der Linie (bis 40 km)
    var cities = [];
    if (GEO.places) GEO.places.forEach(function (pl) {
      if (pl.pop < 400000) return;
      var best = 1e9, at = 0;
      for (var i = 0; i < pts.length; i += 2) { var dd = Math.abs(pts[i][0] - pl.lat); if (dd > 1) continue; var d = hav(pts[i][0], pts[i][1], pl.lat, pl.lon); if (d < best) { best = d; at = i * step; } }
      if (best < 40 && at > 15) cities.push({ n: pl.n, km: at, off: best });
    });
    cities.sort(function (a, b) { return a.km - b.km; });
    return { pts: pts, segs: merged, cities: cities, home: homeC };
  }
  /* Sonne: Bildpunkt (subsolarer Punkt) und Höhe an einem Ort */
  function subsolar(t) {
    var jd = A.toJD(t), s = A.sun(jd);
    return { lat: s.dec, lon: wrap180(s.ra - A.gmst(jd)) };
  }
  function sunAlt(lat, lon, ss) {
    var h = (lon - ss.lon) * D2R, p = lat * D2R, d = ss.lat * D2R;
    return Math.asin(Math.sin(p) * Math.sin(d) + Math.cos(p) * Math.cos(d) * Math.cos(h)) * R2D;
  }
  function riseAz(day) {
    var j0 = A.toJD(midnight(day)), jr = A.riseSet("sun", j0, LOC.lat, LOC.lon, "rise", 1);
    if (!jr) return null;
    var s = A.sun(jr), e = A.eqToEnu(s.v, A.lst(jr, LOC.lon), LOC.lat), aa = A.enuToAltAz(e);
    return { az: aa.az, time: A.fromJD(jr) };
  }
  function dirName(a) { var n = ["Norden", "Nordnordost", "Nordost", "Ostnordost", "Osten", "Ostsüdost", "Südost", "Südsüdost", "Süden", "Südsüdwest", "Südwest", "Westsüdwest", "Westen", "Westnordwest", "Nordwest", "Nordnordwest"]; return n[Math.round(wrap360(a) / 22.5) % 16]; }

  /* Erdmaske für den Globus (gleichabstandige Karte, einmal gezeichnet) */
  function buildMask() {
    var W = 1440, H = 720, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    var g = cv.getContext("2d"); g.fillStyle = "#000"; g.fillRect(0, 0, W, H); g.fillStyle = "#fff";
    GEO.world.forEach(function (c) { c.polys.forEach(function (rings) { g.beginPath(); rings.forEach(function (r) { for (var i = 0; i < r.length; i += 2) { var x = (r[i] + 180) / 360 * W, y = (90 - r[i + 1]) / 180 * H; if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.closePath(); }); g.fill("evenodd"); }); });
    GEO.mask = g.getImageData(0, 0, W, H).data; GEO.mw = W; GEO.mh = H;
  }
  var view = { lat: LOC.lat, lon: LOC.lon }, heading = load("wunderwahr_richtung", 90), lastPath = null;
  function drawGlobe() {
    var cv = $("dkGlobe"); if (!cv || !GEO.mask) return;
    var css = cv.clientWidth || 320, dpr = Math.min(2, window.devicePixelRatio || 1), N = Math.round(css * dpr);
    if (cv.width !== N) { cv.width = N; cv.height = N; }
    var g = cv.getContext("2d"), img = g.createImageData(N, N), px = img.data, R = N / 2 - 6 * dpr, cx = N / 2, cy = N / 2;
    var ss = subsolar(new Date()), p0 = view.lat * D2R, l0 = view.lon * D2R, sp0 = Math.sin(p0), cp0 = Math.cos(p0);
    var sd = Math.sin(ss.lat * D2R), cd = Math.cos(ss.lat * D2R);
    for (var y = 0; y < N; y++) {
      for (var x = 0; x < N; x++) {
        var X = (x - cx) / R, Y = (cy - y) / R, rho2 = X * X + Y * Y, o = (y * N + x) * 4;
        if (rho2 > 1) { px[o + 3] = 0; continue; }
        var cz = Math.sqrt(1 - rho2);
        var lat = Math.asin(cz * sp0 + Y * cp0), lon = l0 + Math.atan2(X, cz * cp0 - Y * sp0);
        var latD = lat * R2D, lonD = wrap180(lon * R2D);
        var mx = Math.floor((lonD + 180) / 360 * GEO.mw) % GEO.mw, my = Math.min(GEO.mh - 1, Math.floor((90 - latD) / 180 * GEO.mh));
        var land = GEO.mask[(my * GEO.mw + mx) * 4] > 127;
        var alt = Math.asin(Math.sin(lat) * sd + Math.cos(lat) * cd * Math.cos(lon - ss.lon * D2R)) * R2D;
        var day = alt > 0 ? 1 : alt < -12 ? 0 : (alt + 12) / 12; // weicher Übergang durch die Dämmerung
        var r1, g1, b1;
        if (land) { r1 = 58 + 132 * day; g1 = 46 + 128 * day; b1 = 110 + 135 * day; } else { r1 = 20 + 30 * day; g1 = 18 + 40 * day; b1 = 46 + 92 * day; }
        var glow = Math.max(0, 1 - Math.abs(alt + 3) / 5); // goldener Saum der Dämmerung
        r1 += 120 * glow; g1 += 70 * glow; b1 += 10 * glow;
        var shade = 0.55 + 0.45 * cz; // Kugelwirkung
        px[o] = Math.min(255, r1 * shade); px[o + 1] = Math.min(255, g1 * shade); px[o + 2] = Math.min(255, b1 * shade); px[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    function proj(la, lo) {
      var p = la * D2R, l = lo * D2R - l0, c = sp0 * Math.sin(p) + cp0 * Math.cos(p) * Math.cos(l);
      return { x: cx + R * Math.cos(p) * Math.sin(l), y: cy - R * (cp0 * Math.sin(p) - sp0 * Math.cos(p) * Math.cos(l)), v: c >= 0 };
    }
    // Stadtlichter auf der Nachtseite
    if (GEO.places) GEO.places.forEach(function (pl) {
      if (pl.pop < 1000000) return;
      var a = sunAlt(pl.lat, pl.lon, ss); if (a > -4) return;
      var q = proj(pl.lat, pl.lon); if (!q.v) return;
      g.fillStyle = "rgba(255,214,130," + Math.min(.9, .35 + pl.pop / 2e7) + ")"; g.beginPath(); g.arc(q.x, q.y, 1.4 * dpr, 0, 7); g.fill();
    });
    // Linie geradeaus
    if (lastPath) {
      g.lineWidth = 2 * dpr; g.strokeStyle = "rgba(255,255,255,.92)"; g.setLineDash([5 * dpr, 4 * dpr]);
      g.beginPath(); var pen = false;
      for (var i = 0; i < lastPath.pts.length; i += 3) { var q = proj(lastPath.pts[i][0], lastPath.pts[i][1]); if (q.v) { if (pen) g.lineTo(q.x, q.y); else g.moveTo(q.x, q.y); pen = true; } else pen = false; }
      g.stroke(); g.setLineDash([]);
    }
    // Standort
    var me = proj(LOC.lat, LOC.lon);
    if (me.v) { g.fillStyle = "#FFD27A"; g.strokeStyle = "#fff"; g.lineWidth = 2 * dpr; g.beginPath(); g.arc(me.x, me.y, 4.5 * dpr, 0, 7); g.fill(); g.stroke(); }
    // Rand
    g.strokeStyle = "rgba(185,166,245,.55)"; g.lineWidth = 1.2 * dpr; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke();
  }
  function updatePath() {
    if (!GEO.world) return;
    lastPath = geradeaus(heading);
    var segs = lastPath.segs, total = CIRC;
    $("dkHead").textContent = fmt(Math.round(wrap360(heading))) + "° · " + dirName(heading);
    $("dkDial").style.setProperty("--a", wrap360(heading) + "deg");
    var firstAbroad = segs.filter(function (s) { return s.a > 0 && s.name !== (lastPath.home && lastPath.home.de); })[0];
    var lands = segs.filter(function (s) { return s.land; }).length, seaKm = segs.filter(function (s) { return !s.land; }).reduce(function (a, s) { return a + (s.b - s.a); }, 0);
    $("dkSum").innerHTML = '<div class="wd-stat"><b>' + fmt(total) + ' km</b><span>einmal um die Erde</span></div><div class="wd-stat"><b>' + fmt(lands) + '</b><span>Länder</span></div><div class="wd-stat"><b>' + fmt(seaKm / total * 100) + ' %</b><span>über Wasser</span></div>';
    var rows = segs.map(function (s, i) {
      var len = s.b - s.a, last = i === segs.length - 1;
      if (i === 0) return '<div class="sn-row"><span class="dot" style="background:#FFD27A"></span><div class="main"><b>' + esc(LOC.name || "Dein Standort") + '</b><span>Start · ' + esc(s.name) + '</span></div><div class="r">0 km</div></div>';
      var c = lastPath.cities.filter(function (ct) { return ct.km >= s.a && ct.km < s.b; }).slice(0, 3).map(function (ct) { return ct.n; });
      return '<div class="sn-row"><span class="dot" style="background:' + (s.land ? 'var(--accent)' : 'var(--wd-sea)') + '"></span><div class="main"><b>' + esc(s.name) + (last && s.name === segs[0].name ? ' – wieder zu Hause' : '') + '</b><span>' + (c.length ? 'vorbei an ' + esc(c.join(", ")) : (s.land ? fmt(len) + ' km Land' : fmt(len) + ' km Wasser')) + '</span></div><div class="r">' + fmt(s.a) + ' km</div></div>';
    });
    $("dkList").innerHTML = rows.join("");
    $("dkTimes").innerHTML = [["Zu Fuß", "8 Std. am Tag, 5 km/h", fmt(total / 40) + " Tage"], ["Mit dem Auto", "Ø 100 km/h", fmt(total / 100) + " Std."], ["Im Flugzeug", "Ø 900 km/h", fmt(total / 900, 0) + " Std."], ["Mit Schallgeschwindigkeit", "1.235 km/h", fmt(total / 1235, 1) + " Std."], ["Mit Lichtgeschwindigkeit", "", fmt(total / 299792.458, 2) + " Sek."]]
      .map(function (r) { return '<div class="sn-row"><div class="main"><b>' + r[0] + '</b><span>' + r[1] + '</span></div><div class="r">' + r[2] + '</div></div>'; }).join("");
    if (firstAbroad) $("dkFirst").textContent = "Erstes Ziel: " + firstAbroad.name + " nach " + fmt(firstAbroad.a) + " km";
    drawGlobe();
  }
  function renderSunrise() {
    var now = new Date(), y = now.getFullYear();
    var r = riseAz(now), rs = riseAz(new Date(y, 5, 21)), rw = riseAz(new Date(y, 11, 21));
    if (!r) { $("dkSun").innerHTML = '<p class="muted">An deinem Ort geht die Sonne heute nicht auf.</p>'; return; }
    var g = geradeaus(r.az), abroad = g.segs.filter(function (s) { return s.land && s.a > 0 && s.name !== (g.home && g.home.de); }).slice(0, 3).map(function (s) { return s.name; });
    var city = g.cities.filter(function (c) { return c.km > 80; })[0];
    $("dkSun").innerHTML =
      '<div class="wd-over">Sonnenaufgang heute</div><h2 class="wd-card-t">' + (city ? 'Die Sonne geht heute über ' + esc(city.n) + ' auf' : 'Die Sonne geht heute im ' + dirName(r.az) + ' auf') + '</h2>' +
      '<p class="wd-card-x">Um ' + r.time.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + ' Uhr, Richtung ' + fmt(r.az) + '° (' + dirName(r.az) + ')' + (abroad.length ? '. Geradeaus in dieser Richtung liegen ' + esc(abroad.join(", ")) + '.' : '.') + '</p>' +
      '<div class="wd-sunbar"><div class="wd-sunbar-l"><i style="left:' + ((rs.az - 30) / 120 * 100) + '%"></i><i style="left:' + ((rw.az - 30) / 120 * 100) + '%"></i><i class="now" style="left:' + ((r.az - 30) / 120 * 100) + '%"></i></div><div class="wd-sunbar-t"><span>21. Juni · ' + fmt(rs.az) + '°</span><span>heute</span><span>21. Dez. · ' + fmt(rw.az) + '°</span></div></div>' +
      '<button type="button" class="wd-glass" id="dkUseSun"><svg class="wzi"><use href="#wzi-sun"></use></svg>Diese Linie um die Welt verfolgen</button>';
    $("dkUseSun").onclick = function () { setHeading(r.az); $("dkGlobeCard").scrollIntoView({ behavior: "smooth", block: "start" }); };
  }
  function renderTerminator() {
    if (!GEO.places) return;
    var ss = subsolar(new Date()), rise = [], set = [];
    GEO.places.forEach(function (pl) {
      if (pl.pop < 800000) return;
      var a = sunAlt(pl.lat, pl.lon, ss); if (Math.abs(a + 0.8) > 1.6) return;
      var morning = wrap180(pl.lon - ss.lon) < 0;
      (morning ? rise : set).push({ n: pl.n, c: pl.c, a: a, pop: pl.pop });
    });
    function fmtL(l, word) { l.sort(function (a, b) { return b.pop - a.pop; }); return l.slice(0, 4).map(function (x) { return '<div class="sn-row"><span class="dot" style="background:' + (word === "auf" ? '#FFD27A' : '#B9A6F5') + '"></span><div class="main"><b>' + esc(x.n) + '</b><span>Sonne geht gerade ' + word + '</span></div></div>'; }).join("") || '<p class="muted small" style="margin:6px 0">Gerade keine Großstadt genau auf der Linie.</p>'; }
    $("dkRise").innerHTML = fmtL(rise, "auf"); $("dkSet").innerHTML = fmtL(set, "unter");
  }
  function setHeading(a) { heading = wrap360(a); save("wunderwahr_richtung", Math.round(heading)); $("dkSlider").value = Math.round(heading); updatePath(); }
  var weitblickReady = false;
  function renderWeitblick() {
    loadGeo().then(function () {
      if (!weitblickReady) { weitblickReady = true; $("dkSlider").value = Math.round(heading); }
      updatePath(); renderSunrise(); renderTerminator();
    });
  }
  $("dkSlider").addEventListener("input", function () { heading = +this.value; $("dkHead").textContent = fmt(heading) + "° · " + dirName(heading); $("dkDial").style.setProperty("--a", heading + "deg"); });
  $("dkSlider").addEventListener("change", function () { setHeading(+this.value); });
  document.querySelectorAll("[data-dir]").forEach(function (b) { b.onclick = function () { setHeading(+b.getAttribute("data-dir")); }; });
  /* Mit dem Handy zielen: Kompass übernimmt die Richtung */
  var aiming = false, lastAim = 0;
  function onOri(e) {
    var h = e.webkitCompassHeading != null ? e.webkitCompassHeading : (e.absolute && e.alpha != null ? 360 - e.alpha : null);
    if (h == null) return;
    heading = wrap360(h); $("dkHead").textContent = fmt(Math.round(heading)) + "° · " + dirName(heading); $("dkDial").style.setProperty("--a", heading + "deg");
    if (Date.now() - lastAim > 900) { lastAim = Date.now(); $("dkSlider").value = Math.round(heading); updatePath(); }
  }
  $("dkAim").onclick = function () {
    if (aiming) { aiming = false; window.removeEventListener("deviceorientation", onOri); window.removeEventListener("deviceorientationabsolute", onOri); this.classList.remove("on"); this.lastChild.textContent = "Mit dem Handy zielen"; save("wunderwahr_richtung", Math.round(heading)); return; }
    var btn = this;
    function go() { aiming = true; btn.classList.add("on"); btn.lastChild.textContent = "Richtung festhalten"; window.addEventListener("deviceorientationabsolute", onOri); window.addEventListener("deviceorientation", onOri); }
    if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === "function") DeviceOrientationEvent.requestPermission().then(function (s) { if (s === "granted") go(); else toast("Ohne Zugriff auf den Kompass bitte die Richtung unten einstellen."); }).catch(function () { toast("Kompass nicht verfügbar."); });
    else go();
  };
  /* Globus mit dem Finger drehen */
  (function () {
    var cv = $("dkGlobe"), st = null;
    cv.addEventListener("pointerdown", function (e) { st = { x: e.clientX, y: e.clientY, lat: view.lat, lon: view.lon }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener("pointermove", function (e) { if (!st) return; var k = 180 / (cv.clientWidth || 300); view.lon = wrap180(st.lon - (e.clientX - st.x) * k); view.lat = Math.max(-80, Math.min(80, st.lat + (e.clientY - st.y) * k)); drawGlobe(); });
    cv.addEventListener("pointerup", function () { st = null; });
    cv.addEventListener("dblclick", function () { view.lat = LOC.lat; view.lon = LOC.lon; drawGlobe(); });
  })();
  setInterval(function () { if (document.querySelector("#screen-weitblick.active")) { drawGlobe(); renderTerminator(); } }, 60000);

  /* =========================================================
     4. ZeitWahr – Erdgeschichte zu Fuß
     ========================================================= */
  var AE = load("wunderwahr_zeitreise", { m: 0, scale: 46 });
  function aeKm() { return AE.m / 1000; }
  function posKm(ma) { return (4600 - ma) / 4600 * AE.scale; }
  function renderZeit() {
    var km = aeKm(), tot = AE.scale, pct = Math.min(100, km / tot * 100);
    var reached = D.ZEITALTER.filter(function (z) { return posKm(z[0]) <= km + 1e-9; });
    var cur = reached[reached.length - 1], nxt = D.ZEITALTER[reached.length];
    var maNow = 4600 - km / tot * 4600;
    $("aeHero").innerHTML = '<div class="wd-over">Du stehst bei</div><h2 class="wd-card-t">vor ' + (maNow >= 1000 ? fmt(maNow / 1000, 2) + " Milliarden" : fmt(maNow, maNow < 10 ? 1 : 0) + " Millionen") + ' Jahren</h2>' +
      '<p class="wd-card-x"><b>' + esc(cur[1]) + '.</b> ' + esc(cur[2]) + '</p>' +
      '<div class="wd-prog"><i style="width:' + pct + '%"></i>' + D.ZEITALTER.map(function (z) { return '<span style="left:' + (posKm(z[0]) / tot * 100) + '%"></span>'; }).join("") + '</div>' +
      '<div class="wd-prog-t"><span>' + fmt(km, 2) + ' km gelaufen</span><span>' + fmt(tot) + ' km</span></div>' +
      (nxt ? '<p class="wd-next">Nächstes Zeitalter: <b>' + esc(nxt[1]) + '</b> in ' + fmt(Math.max(0, posKm(nxt[0]) - km), 2) + ' km</p>' : '<p class="wd-next"><b>Du bist in der Gegenwart angekommen!</b></p>');
    $("aeList").innerHTML = D.ZEITALTER.map(function (z) {
      var p = posKm(z[0]), on = p <= km + 1e-9;
      return '<div class="sn-row' + (on ? ' on' : '') + '"><span class="dot" style="background:' + (on ? 'var(--wd-gold)' : 'var(--border)') + '"></span><div class="main"><b>' + esc(z[1]) + '</b><span>vor ' + (z[0] >= 1 ? fmt(z[0], z[0] < 10 ? 1 : 0) + " Mio." : fmt(z[0] * 1000) + " Tsd.") + ' Jahren</span></div><div class="r">' + (p >= 1 ? fmt(p, p > AE.scale * 0.97 ? 3 : 1) + " km" : fmt(p * 1000) + " m") + '</div></div>';
    }).join("");
    // Maßstab der letzten Meter
    var mPerYear = tot * 1000 / 4.6e9;
    function len(y) { var m = y * mPerYear; return m >= 1 ? fmt(m, 1) + " m" : m >= 0.01 ? fmt(m * 100, 1) + " cm" : fmt(m * 1000, 1) + " mm"; }
    var ps = persons(), age = ps.length ? (Date.now() - birth(ps[0]).getTime()) / (365.25 * DAY) : null;
    $("aeScale").innerHTML = [["Seit dem Ende der Dinosaurier", len(66e6)], ["Seit es den Homo sapiens gibt", len(3e5)], ["Seit dem Bau der Pyramiden", len(4600)], ["Seit Christi Geburt", len(2026)], [age ? "Dein bisheriges Leben" : "Ein Menschenleben (80 Jahre)", len(age || 80)]]
      .map(function (r) { return '<div class="sn-row"><div class="main"><b>' + r[0] + '</b></div><div class="r">' + r[1] + '</div></div>'; }).join("");
    document.querySelectorAll("[data-scale]").forEach(function (b) { b.classList.toggle("active", +b.getAttribute("data-scale") === AE.scale); });
    renderZeitmitte();
  }
  document.querySelectorAll("[data-scale]").forEach(function (b) { b.onclick = function () { AE.scale = +b.getAttribute("data-scale"); save("wunderwahr_zeitreise", AE); renderZeit(); }; });
  /* Laufen: GPS zählt nur echte Schritte (genaue Positionen, Gehtempo) */
  var watch = null, lastFix = null;
  $("aeGo").onclick = function () {
    var btn = this;
    if (watch != null) { navigator.geolocation.clearWatch(watch); watch = null; btn.classList.remove("on"); btn.lastChild.textContent = "Etappe starten"; $("aeState").textContent = "Pausiert – dein Fortschritt ist gespeichert."; return; }
    if (!navigator.geolocation) { toast("Standort nicht verfügbar."); return; }
    lastFix = null; btn.classList.add("on"); btn.lastChild.textContent = "Etappe beenden"; $("aeState").textContent = "Läuft – die App muss dabei geöffnet bleiben.";
    watch = navigator.geolocation.watchPosition(function (p) {
      var c = p.coords; if (c.accuracy > 35) return;
      if (lastFix) {
        var d = hav(lastFix.lat, lastFix.lon, c.latitude, c.longitude) * 1000, dt = (p.timestamp - lastFix.t) / 1000;
        if (d < 8) return;
        if (dt > 0 && d / dt > 4.5) { lastFix = { lat: c.latitude, lon: c.longitude, t: p.timestamp }; return; } // zu schnell: Fahrzeug
        AE.m += d; save("wunderwahr_zeitreise", AE); renderZeit();
      }
      lastFix = { lat: c.latitude, lon: c.longitude, t: p.timestamp };
    }, function () { toast("Standort nicht verfügbar."); }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
  };
  $("aeReset").onclick = function () {
    (window.wzConfirm ? wzConfirm("Die Zeitreise wirklich von vorn beginnen?", { okLabel: "Neu beginnen" }) : Promise.resolve(true)).then(function (ok) { if (ok) { AE.m = 0; save("wunderwahr_zeitreise", AE); renderZeit(); } });
  };
  /* Deine Zeitmitte & überraschend gleichzeitig */
  function renderZeitmitte() {
    var ps = persons();
    if (!ps.length) { $("aeMitte").innerHTML = '<h2>Deine Zeitmitte</h2><p class="muted small" style="margin:0">Trag in KilometerWahr dein Geburtsdatum ein – dann zeigt dir ZeitWahr, was von deiner Geburt aus genauso weit zurückliegt wie dein ganzes bisheriges Leben.</p>'; }
    else {
      var by = +ps[0].date.slice(0, 4), now = new Date().getFullYear(), age = now - by, mid = by - age;
      var near = D.EREIGNISSE.filter(function (e) { return Math.abs(e[0] - mid) <= 6; }).slice(0, 4);
      $("aeMitte").innerHTML = '<h2>Deine Zeitmitte</h2><p class="small" style="margin:0 0 8px">Du bist <b>' + age + '</b> Jahre alt. Genauso lange vor deiner Geburt war das Jahr <b>' + mid + '</b>.</p>' +
        '<div class="wd-axis"><span style="left:0">' + mid + '</span><span style="left:50%">' + by + '<small>Geburt</small></span><span style="left:100%">' + now + '</span><i></i></div>' +
        (near.length ? '<p class="muted small" style="margin:0 0 2px">Um diese Zeit geschah:</p>' + near.map(function (e) { return '<div class="sn-fact"><div class="ic wd-yr">' + e[0] + '</div><div><b>' + esc(e[1]) + '</b></div></div>'; }).join("") : '');
    }
    $("aeGleich").innerHTML = D.GLEICHZEITIG.map(function (g) {
      var a = g.a.y, c = g.c.y, span = c - a || 1;
      function pos(y) { return ((y - a) / span * 100).toFixed(1); }
      function yr(y) { return y < 0 ? -y + " v. Chr." : String(y); }
      return '<div class="wd-gl"><b>' + esc(g.t) + '</b><div class="wd-gl-line"><i style="left:0"></i><i class="mid" style="left:' + pos(g.b.y) + '%"></i><i style="left:100%"></i></div>' +
        '<div class="wd-gl-t"><span>' + esc(g.a.n) + '<small>' + yr(a) + '</small></span><span style="text-align:center">' + esc(g.b.n) + '<small>' + yr(g.b.y) + '</small></span><span style="text-align:right">' + esc(g.c.n) + '<small>' + yr(c) + '</small></span></div></div>';
    }).join("");
  }

  /* ---------------- Start ---------------- */
  renderTages();
  var onb = window.wzOnboarding ? wzOnboarding({
    key: "wunderwahr_onboarded",
    slides: [
      { icon: "tages", title: "Willkommen bei WunderWahr", text: "Jeden Tag ein Grund zu staunen – über dein Leben, deine Zeit und deinen Platz auf der Welt. Vier Bereiche, jeden Tag etwas Neues." },
      { icon: "tages", title: "TagesWahr", text: "Jeden Morgen eine neue Wunderkarte – ein ganzes Jahr ohne Wiederholung. Was dir gefällt, hebst du in deiner Sammlung auf." },
      { icon: "kilometer", title: "KilometerWahr", text: "Aus deinem Geburtsdatum werden Meilensteine, die sonst niemand bemerkt: dein 10.000. Lebenstag, deine erste Milliarde Sekunden, dein nächster Mars-Geburtstag – auch für deine Familie." },
      { icon: "weitblick", title: "WeitblickWahr", text: "Zeig mit dem Smartphone in eine Richtung und folge der Linie einmal um die ganze Erde. Dazu Tag und Nacht live auf dem Globus." },
      { icon: "zeit", title: "ZeitWahr", text: "Erlaufe die Erdgeschichte Schritt für Schritt – 4,6 Milliarden Jahre auf deinen Spaziergängen. Dazu überraschende Gleichzeitigkeiten der Geschichte." },
      { icon: "lock", title: "Alles bleibt bei dir", text: "Alles wird auf dem Gerät berechnet. Geburtsdaten, Sammlung und Fortschritt bleiben nur auf diesem Gerät; es wird nichts gesendet." }
    ]
  }) : null;
  if ($("showOnboardingBtn")) $("showOnboardingBtn").addEventListener("click", function () { if (onb) onb.show(); });
  var TABS = ["tages", "kilometer", "weitblick", "zeit"];
  var h0 = (location.hash || "").slice(1);
  var startTab = TABS.indexOf(h0) >= 0 ? h0 : load("wunderwahr_tab", "tages");
  showTab(TABS.indexOf(startTab) >= 0 ? startTab : "tages");
  // Datum direkt vorbelegen (Platzhalter), Heute-Hinweis bei Tageswechsel
  var lastDay = new Date().getDate();
  setInterval(function () { var d = new Date().getDate(); if (d !== lastDay) { lastDay = d; offset = 0; renderTages(); } }, 60000);
})();
