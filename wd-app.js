/* ============================================================
   ThaumoraWahr – jeden Tag ein Grund zu staunen
   Bereiche: TagesWahr (Tageswunder, Rechenwunder, „Heute vor …“),
   KilometerWahr (Meilensteine, Lebensuhr, Jubiläumskalender, Urkunden),
   WeitblickWahr (geradeaus um die Welt, Tag und Nacht, Kamera-Modus),
   ZeitWahr (drei Zeitreisen zu Fuß, Zeitmitte, Gleichzeitigkeiten).
   Alles wird auf dem Gerät berechnet; es wird nichts gesendet.
   Speicher (Präfix thaumorawahr_): Personen/Geburtsdaten, entdeckte und gemerkte Karten, Tageskarten,
   Zeitkapseln, Fortschritt der Zeitreisen, Etappenprotokoll, Einstellungen.
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
  var splashUntil = 0; // Hinweise erst nach dem Startbildschirm zeigen
  function toast(t, ms) { var w = splashUntil - Date.now(); if (!window.wzToast) return; if (w > 0) setTimeout(function () { wzToast(t, ms); }, w); else wzToast(t, ms); }
  function wrap360(a) { return ((a % 360) + 360) % 360; }
  function wrap180(a) { return ((a + 540) % 360) - 180; }
  function ymd(d) { return D.ymd(d); }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  var acted = false; document.addEventListener("pointerdown", function () { acted = true; }, { capture: true, once: true });
  function buzz(ms) { try { if (acted && navigator.vibrate) navigator.vibrate(ms || 12); } catch (e) { } }
  function dist(km) { return km >= 1 ? fmt(km, 2) + " km" : km >= 0.001 ? fmt(km * 1000) + " m" : km > 0 ? fmt(km * 1e5, 0) + " cm" : "am Start"; }
  function icon(id) { return '<svg class="wzi" aria-hidden="true"><use href="#wzi-' + id + '"></use></svg>'; }
  function seeded(n) { var s = (n * 2654435761) % 4294967296; return function () { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
  function stats() { return load("thaumorawahr_stats", { shared: 0, cam: 0 }); }
  function bump(k, n) { var s = stats(); s[k] = (s[k] || 0) + (n || 1); save("thaumorawahr_stats", s); checkBadges(); }

  /* Eigenes Blatt (Bottom Sheet) */
  function sheet(html, onReady) {
    var bg = document.createElement("div"); bg.className = "wd-sheet-bg";
    bg.innerHTML = '<div class="wd-sheet" role="dialog" aria-modal="true"><button type="button" class="wd-x" aria-label="Schließen">' + icon("close") + '</button>' + html + '</div>';
    var last = document.activeElement;
    function close() { if (bg.parentNode) bg.parentNode.removeChild(bg); document.removeEventListener("keydown", key); if (last && last.focus) last.focus(); }
    function key(e) { if (e.key === "Escape") close(); }
    bg.addEventListener("click", function (e) { if (e.target === bg) close(); });
    bg.querySelector(".wd-x").onclick = close;
    document.addEventListener("keydown", key);
    document.body.appendChild(bg);
    setTimeout(function () { var f = bg.querySelector(".wd-sheet button:not(.wd-x), .wd-sheet .wd-x"); if (f) f.focus(); }, 30);
    if (onReady) onReady(bg.querySelector(".wd-sheet"), close);
    return close;
  }

  /* ---------------- Reiter ---------------- */
  var tabs = document.querySelectorAll(".sn-tab");
  function showTab(id) {
    tabs.forEach(function (t) { var on = t.getAttribute("data-tab") === id; t.classList.toggle("active", on); t.setAttribute("aria-selected", on ? "true" : "false"); });
    document.querySelectorAll(".screen").forEach(function (s) { s.classList.toggle("active", s.id === "screen-" + id); });
    save("thaumorawahr_tab", id);
    if (id === "weitblick") renderWeitblick();
    if (id === "kilometer") renderKilometer();
    if (id === "zeit") renderZeit();
    if (id === "tages") renderTages();
  }
  if ($("wdSplashD")) {
    try { if (sessionStorage.getItem("thaumorawahr_splash") !== "1") splashUntil = Date.now() + 3600; } catch (e) { }
    $("wdSplashD").textContent = dLong(new Date());
    try { // Vorschau: Thema des heutigen Wunders, ohne den Inhalt zu verraten
      var spW = D.wonderFor(new Date()), spE = load("thaumorawahr_entdeckt", {}), spS = load("thaumorawahr_serie", {}), spT = [];
      spT.push('<i>' + icon("tages") + 'Heute: ' + esc(spW.k) + '</i>');
      $("wdSplashT").innerHTML = spT.join("");
    } catch (e) { }
  }
  tabs.forEach(function (t) { t.addEventListener("click", function () { showTab(t.getAttribute("data-tab")); }); });

  /* =========================================================
     1. TagesWahr – Tageswunder, Rechenwunder, „Heute vor …“
     ========================================================= */
  var offset = 0; // 0 = heute, -1 = gestern …
  var SELTEN = {}; (D.SELTEN || []).forEach(function (id) { SELTEN[id] = 1; });
  function wonderFor(date) { return D.wonderFor(date); }
  function sammlung() { return load("thaumorawahr_sammlung", []); }
  function entdeckt() { return load("thaumorawahr_entdeckt", {}); }
  function discover(id, date) {
    var e = entdeckt(); if (e[id]) return false;
    e[id] = ymd(date || new Date()); save("thaumorawahr_entdeckt", e); return true;
  }
  try { localStorage.removeItem("thaumorawahr_quiz"); localStorage.removeItem("thaumorawahr_schaetz"); } catch (e) { } // Quiz und Schätzfrage gibt es nicht mehr
  (function migrate() { // bereits gemerkte Karten zählen als entdeckt
    var e = entdeckt(), ch = false;
    sammlung().forEach(function (id) { if (!e[id]) { e[id] = ymd(new Date()); ch = true; } });
    var t = load("thaumorawahr_tage", {}); Object.keys(t).forEach(function (k) { if (!e[t[k]]) { e[t[k]] = k; ch = true; } });
    if (ch) save("thaumorawahr_entdeckt", e);
  })();

  function renderCard(day) {
    var w = wonderFor(day), rare = !!SELTEN[w.id];
    var neu = discover(w.id, day);
    var card = $("fbCard");
    card.classList.toggle("gold", rare);
    card.setAttribute("aria-label", "Tageswunder: " + w.t);
    card.innerHTML =
      (rare ? '<div class="wd-rare">' + icon("starfill") + 'Seltene Karte</div>' : '') +
      '<div class="wd-over">' + esc(w.k) + '</div>' +
      '<h2 class="wd-card-t">' + esc(w.t) + '</h2>' +
      '<p class="wd-card-x">' + esc(w.x) + '</p>' +
      '<details class="wd-more"><summary>Wie kann das sein?</summary><p>' + esc(w.w) + '</p></details>' +
      '<div class="wd-card-acts">' +
      '<button type="button" class="wd-glass wd-icon" id="fbPrev" aria-label="Vorheriger Tag">' + icon("left") + '</button>' +
      '<button type="button" class="wd-glass wd-wide" id="fbShare">' + icon("share") + 'Als Bild teilen</button>' +
      '<button type="button" class="wd-glass wd-icon" id="fbNext" aria-label="Nächster Tag"' + (offset >= 0 ? ' disabled' : '') + '>' + icon("right") + '</button>' +
      '</div>';
    $("fbPrev").onclick = function () { go(-1); };
    $("fbNext").onclick = function () { go(1); };
    $("fbShare").onclick = function () { shareWonder(w, day); };
    return w;
  }
  function shareWonder(w, day) {
    if (!window.WDShare) return;
    WDShare.wonderCard({ over: w.k, title: w.t, text: w.x, more: w.w, gold: !!SELTEN[w.id], foot: "Tageswunder vom " + dShort(day || new Date()) })
      .then(function (b) { return WDShare.share(b, "Wunder-" + w.id + ".png", w.t); })
      .then(function (ok) { if (ok) bump("shared"); });
  }
  function go(dir) {
    var n = offset + dir;
    if (n > 0) return;
    if (n < -6) { toast("Zurückblättern geht bis zu einer Woche."); return; }
    var card = $("fbCard"), reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    offset = n;
    if (reduce) { renderTages(); return; }
    card.classList.add(dir < 0 ? "out-r" : "out-l");
    setTimeout(function () {
      card.classList.add("drag"); card.classList.remove("out-r", "out-l"); card.classList.add(dir < 0 ? "out-l" : "out-r");
      renderTages(true);
      void card.offsetWidth; card.classList.remove("drag", "out-l", "out-r");
    }, 180);
  }
  /* Wischen über die Karte */
  (function () {
    var el = $("fbSwipe"), st = null;
    el.addEventListener("pointerdown", function (e) { if (e.target.closest("button,summary,a")) return; st = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false }; });
    el.addEventListener("pointermove", function (e) {
      if (!st || e.pointerId !== st.id) return;
      var dx = e.clientX - st.x, dy = e.clientY - st.y;
      if (!st.moved && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.4) { st.moved = true; try { el.setPointerCapture(e.pointerId); } catch (x) { } $("fbCard").classList.add("drag"); }
      if (st.moved) { var lim = (dx > 0 && offset <= -6) || (dx < 0 && offset >= 0) ? 0.25 : 1; $("fbCard").style.transform = "translateX(" + dx * lim + "px) rotate(" + dx * lim / 40 + "deg)"; }
    });
    function end(e) {
      if (!st) return; var dx = e.clientX - st.x, moved = st.moved; st = null;
      var c = $("fbCard"); c.classList.remove("drag"); c.style.transform = "";
      if (!moved) return;
      if (dx > 70) go(-1); else if (dx < -70) go(1);
    }
    el.addEventListener("pointerup", end); el.addEventListener("pointercancel", end);
  })();

  function renderTages() {
    var day = new Date(Date.now() + offset * DAY);
    $("fbDate").textContent = offset === 0 ? "Heute · " + dLong(day) : dLong(day);
    renderCard(day);
    renderCalc(day);
    // Heute vor … Jahren
    var key = String(day.getMonth() + 1).padStart(2, "0") + "-" + String(day.getDate()).padStart(2, "0");
    var hv = D.HEUTE[key];
    $("fbHeute").hidden = !hv;
    if (hv) {
      $("fbHeute").innerHTML = '<h2>' + (offset === 0 ? 'Heute vor …' : 'An diesem Tag vor …') + '</h2>' + hv.map(function (e) {
        var y = day.getFullYear() - e[0];
        return '<div class="sn-fact"><div class="ic wd-yr">' + fmt(y) + '</div><div><b>' + fmt(y) + ' Jahren · ' + e[0] + '</b><span>' + esc(e[1]) + '</span></div></div>';
      }).join("");
    }
    renderKapselBanner();
  }

  /* ---------- Rechenwunder: jeden Tag frisch berechnet ---------- */
  function sunTimes(day) {
    if (!A || !A.riseSet) return null;
    var j0 = A.toJD(midnight(day)), r = A.riseSet("sun", j0, LOC.lat, LOC.lon, "rise", 1), s2 = A.riseSet("sun", j0, LOC.lat, LOC.lon, "set", 1);
    if (!r || !s2) return null;
    var a = A.fromJD(r), b = A.fromJD(s2); if (b < a) b = new Date(b.getTime() + DAY);
    return { rise: a, set: b, len: (b - a) / 60000 };
  }
  function sunAltAt(t) { var jd = A.toJD(t), s = A.sun(jd), aa = A.enuToAltAz(A.eqToEnu(s.v, A.lst(jd, LOC.lon), LOC.lat)); return aa.alt; }
  function hm(min) { var h = Math.floor(min / 60), m = Math.round(min - h * 60); if (m === 60) { h++; m = 0; } return h + " Std. " + m + " Min."; }
  var CALC = [
    function mond(day) {
      var t = new Date(day); t.setHours(12, 0, 0, 0);
      var d0 = A.moon(A.toJD(t)).dist, d7 = A.moon(A.toJD(addDays(t, -7))).dist;
      var best = null; for (var i = 1; i <= 30; i++) { var di = A.moon(A.toJD(addDays(t, i))).dist; if (!best || di < best.d) best = { d: di, i: i }; }
      return { over: "Rechenwunder · Mond", n: fmt(Math.round(d0 / 10) * 10) + " km", t: "So weit ist der Mond heute entfernt", x: "Das sind " + fmt(Math.abs(d0 - d7)) + " km " + (d0 < d7 ? "weniger" : "mehr") + " als vor einer Woche. Am " + dShort(addDays(t, best.i)) + " kommt er der Erde mit rund " + fmt(Math.round(best.d / 100) * 100) + " km am nächsten. Sein Licht braucht heute " + fmt(d0 / 299792.458, 2) + " Sekunden bis zu dir." };
    },
    function sonne(day) {
      var t = new Date(day); t.setHours(12, 0, 0, 0);
      var au = A.sun(A.toJD(t)).dist, km = au * 149597870.7, s = km / 299792.458;
      var m = Math.floor(s / 60), sec = Math.round(s - m * 60);
      return { over: "Rechenwunder · Sonne", n: fmt(km / 1e6, 2) + " Mio. km", t: "So weit ist die Sonne heute entfernt", x: "Ihr Licht ist bis zu dir " + m + " Minuten und " + sec + " Sekunden unterwegs. Anfang Januar ist die Erde der Sonne am nächsten (rund 147 Mio. km), Anfang Juli am fernsten (rund 152 Mio. km) – die Jahreszeiten kommen trotzdem von der schrägen Erdachse." };
    },
    function tag(day) {
      var a = sunTimes(day), b = sunTimes(addDays(day, -7)); if (!a || !b) return null;
      var diff = a.len - b.len, y = day.getFullYear(), sol = day < new Date(y, 5, 21) ? new Date(y, 5, 21) : day < new Date(y, 11, 21) ? new Date(y, 11, 21) : new Date(y + 1, 5, 21);
      var dsol = daysBetween(day, sol), summer = sol.getMonth() === 5;
      return { over: "Rechenwunder · " + (LOC.name || "Dein Ort"), n: hm(a.len), t: "So lang ist der Tag heute", x: "Sonnenaufgang " + a.rise.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr, Sonnenuntergang " + a.set.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr. Das sind " + fmt(Math.abs(diff)) + " Minuten " + (diff >= 0 ? "mehr" : "weniger") + " Tageslicht als vor einer Woche. " + (dsol === 0 ? "Heute ist Sonnenwende!" : "Noch " + fmt(dsol) + " Tage bis zur " + (summer ? "Sommer" : "Winter") + "sonnenwende.") };
    },
    function schatten(day) {
      var best = -90, at = null;
      for (var m = 600; m <= 900; m += 5) { var t = new Date(day); t.setHours(0, m, 0, 0); var al = sunAltAt(t); if (al > best) { best = al; at = t; } }
      if (best < 3) return null;
      var len = 1.8 / Math.tan(best * D2R);
      return { over: "Rechenwunder · Schatten", n: fmt(len, len < 10 ? 2 : 1) + " m", t: "So lang ist dein Mittagsschatten heute", x: "Ein 1,80 Meter großer Mensch wirft in " + (LOC.name || "deiner Gegend") + " um " + at.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr – wenn die Sonne mit " + fmt(best, 1) + "° am höchsten steht – einen Schatten dieser Länge. Im Juni ist er bei uns am kürzesten, im Dezember am längsten." };
    },
    function bahn(day) {
      var ps = persons(), now = new Date(), from, wer;
      if (ps.length) { var b = birth(ps[0]); from = new Date(now.getFullYear(), b.getMonth(), b.getDate()); if (from > now) from = new Date(now.getFullYear() - 1, b.getMonth(), b.getDate()); wer = "Seit deinem letzten Geburtstag"; }
      else { from = new Date(now.getFullYear(), 0, 1); wer = "Seit dem 1. Januar"; }
      var km = (now - from) / 1000 * ORBIT_KM_S;
      return { over: "Rechenwunder · Erdbahn", n: fmt(km / 1e6, 1) + " Mio. km", t: wer + " bist du so weit um die Sonne gereist", x: "Die Erde rast mit 29,78 Kilometern pro Sekunde auf ihrer Bahn – über 100.000 km/h. Eine ganze Runde sind rund 940 Millionen Kilometer." };
    },
    function mondphase(day) {
      var t = new Date(day); t.setHours(21, 0, 0, 0); var jd = A.toJD(t);
      var s = A.sun(jd), m = A.moon(jd), cosE = s.v[0] * m.v[0] + s.v[1] * m.v[1] + s.v[2] * m.v[2];
      var illum = (1 - cosE) / 2 * 100;
      var nf = A.moonPhaseTime ? A.moonPhaseTime(jd, 180, 1) : null, nn = A.moonPhaseTime ? A.moonPhaseTime(jd, 0, 1) : null;
      var nfD = nf ? A.fromJD(nf) : null, nnD = nn ? A.fromJD(nn) : null;
      return { over: "Rechenwunder · Mondphase", n: fmt(illum) + " %", t: "So viel vom Mond ist heute Abend beleuchtet", x: (nfD ? "Nächster Vollmond: " + dLong(nfD) + ". " : "") + (nnD ? "Nächster Neumond: " + dLong(nnD) + ". " : "") + "Von einem Vollmond zum nächsten vergehen im Mittel 29 Tage, 12 Stunden und 44 Minuten." };
    },
    function planet(day) {
      var pl = [["mars", "Mars"], ["jupiter", "Jupiter"], ["venus", "Venus"], ["saturn", "Saturn"]][Math.floor(daysBetween(new Date(2026, 0, 1), day) / 10) % 4];
      var t = new Date(day); t.setHours(12, 0, 0, 0); var p = A.planet(pl[0], A.toJD(t)), km = p.dist * 149597870.7, lt = km / 299792.458;
      var p30 = A.planet(pl[0], A.toJD(addDays(t, 30))).dist * 149597870.7;
      return { over: "Rechenwunder · " + pl[1], n: fmt(km / 1e6) + " Mio. km", t: "So weit ist der " + pl[1] + " heute von dir entfernt", x: "Sein Licht braucht " + (lt >= 3600 ? fmt(lt / 3600, 1) + " Stunden" : fmt(lt / 60) + " Minuten") + " bis zur Erde. In 30 Tagen ist er " + fmt(Math.abs(p30 - km) / 1e6, 1) + " Mio. km " + (p30 < km ? "näher" : "weiter weg") + ". Mit dem Auto bei 100 km/h wärst du " + fmt(km / 100 / 24 / 365.25) + " Jahre unterwegs." };
    },
    function drehung(day) {
      var v = 1674.4 * Math.cos(LOC.lat * D2R), now = new Date(), h = offset === 0 ? (now - midnight(now)) / 3600000 : 24;
      return { over: "Rechenwunder · Erddrehung", n: fmt(v) + " km/h", t: "So schnell drehst du dich gerade mit der Erde", x: "In " + (LOC.name || "deiner Gegend") + " trägt dich die Erddrehung mit dieser Geschwindigkeit nach Osten. " + (offset === 0 ? "Seit Mitternacht sind das schon " + fmt(v * h) + " Kilometer" : "An einem ganzen Tag sind das " + fmt(v * 24) + " Kilometer") + " – ohne dass du es merkst." };
    },
    function jahr(day) {
      var y = day.getFullYear(), a = new Date(y, 0, 1), b = new Date(y + 1, 0, 1), p = (day - a) / (b - a) * 100, rest = daysBetween(day, b);
      return { over: "Rechenwunder · Jahr", n: fmt(p, 1) + " %", t: "So viel von " + y + " ist schon vorbei", x: "Noch " + fmt(rest) + " Tage bis Silvester. Die Erde hat damit schon " + fmt(p * 9.4, 0) + " Millionen Kilometer ihrer Runde um die Sonne geschafft – rund " + fmt(940 - p * 9.4, 0) + " Millionen liegen noch vor ihr." };
    },
    function leben(day) {
      var ps = persons(); if (!ps.length) return null;
      var p = ps[0], n = daysBetween(birth(p), day) + 1, next = Math.ceil(n / 1000) * 1000; if (next === n) next += 1000;
      return { over: "Rechenwunder · Dein Leben", n: fmt(n) + ". Tag", t: "Heute ist dein " + fmt(n) + ". Lebenstag", x: "Dein " + fmt(next) + ". Lebenstag ist am " + dLong(addDays(day, next - n)) + ". Bis dahin hat dein Herz noch rund " + big((next - n) * 86400 * HR) + "-mal geschlagen." };
    }
  ];
  function renderCalc(day) {
    var el = $("fbCalc"), n = daysBetween(new Date(2026, 0, 1), day), out = null;
    var fnUsed = null;
    for (var k = 0; k < CALC.length && !out; k++) { try { fnUsed = CALC[((n + k) % CALC.length + CALC.length) % CALC.length]; out = fnUsed(day); } catch (e) { out = null; } }
    var METH = { mond: "Geozentrische Mondentfernung nach Meeus (Mittag); nächster Erdnähe-Tag durch Tagesraster über 30 Tage.", sonne: "Sonnenabstand in AE nach Meeus × 149.597.870,7 km; Lichtlaufzeit mit c = 299.792,458 km/s.",
      tag: "Auf- und Untergang bei −0,8333° (Refraktion + Sonnenradius) für deinen Standort, Vergleich mit dem Wert vor 7 Tagen.", schatten: "Maximale Sonnenhöhe im 5-Minuten-Raster 10–15 Uhr; Schattenlänge = 1,80 m / tan h.",
      bahn: "Strecke = vergangene Sekunden × 29,78 km/s (mittlere Bahngeschwindigkeit).", mondphase: "Beleuchteter Anteil = (1 − cos Elongation)/2; Phasenzeitpunkte über die Differenz der ekliptikalen Längen.",
      planet: "Planetenort aus Keplerelementen (JPL-Näherung), geozentrische Entfernung; Lichtlaufzeit mit c.", drehung: "v = 1.674,4 km/h · cos φ (Äquatorgeschwindigkeit × Kosinus der Breite).",
      jahr: "Anteil der verstrichenen Zeit am Kalenderjahr; Bahnstrecke ≈ 940 Mio. km pro Umlauf.", leben: "Tageszählung ab Geburtstag; Herzschläge mit Ø 75 pro Minute geschätzt." };
    if (!out) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = '<div class="wd-over">' + esc(out.over) + '</div><span class="wd-calc-n">' + esc(out.n) + '</span><h2 class="wd-card-t" style="font-size:19px">' + esc(out.t) + '</h2><p class="wd-card-x" style="font-size:14.5px">' + esc(out.x) + '</p>' +
      '<p class="wd-meth">Methode: ' + esc(METH[fnUsed && fnUsed.name] || "eigene Berechnung auf dem Gerät.") + '</p>' +
      '<div class="wd-card-acts"><button type="button" class="wd-glass" id="fbCalcShare">' + icon("share") + 'Teilen</button></div>';
    $("fbCalcShare").onclick = function () {
      WDShare.wonderCard({ over: out.over, title: out.n + " – " + out.t, text: out.x, foot: "Berechnet am " + dShort(day) })
        .then(function (b) { return WDShare.share(b, "Rechenwunder.png", out.t); }).then(function (ok) { if (ok) bump("shared"); });
    };
  }

  /* ---------- Abzeichen ---------- */
  function reisen() { return load("thaumorawahr_reisen", null) || migrateReisen(); }
  function checkBadges() { }

  /* =========================================================
     2. KilometerWahr – Meilensteine & Lebensuhr
     ========================================================= */
  var SYN = 29.530588853, ORBIT_KM_S = 29.78, GAL_KM_S = 230, SID = 86164.0905;
  var HR = 75 / 60, BR = 16 / 60; // Schätzwerte je Sekunde (Ø Herzschlag 75/min, Ø Atem 16/min)
  function persons() { return load("thaumorawahr_personen", []); }
  var activeP = load("thaumorawahr_person", null);
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
    renderKapsel();
    var ps = persons();
    var setup = $("llSetup"), main = $("llMain");
    if (!ps.length) { setup.hidden = false; main.hidden = true; return; }
    setup.hidden = true; main.hidden = false;
    if (!activeP || !ps.some(function (p) { return p.id === activeP; })) activeP = ps[0].id;
    // Personen-Chips
    $("llPeople").innerHTML = ps.map(function (p) {
      return '<button type="button" class="chip' + (p.id === activeP ? ' active' : '') + '" data-id="' + p.id + '">' + esc(p.name || "Ich") + '</button>';
    }).join("") + '<button type="button" class="chip" id="llAdd"><svg class="wzi"><use href="#wzi-plus"></use></svg>Person</button>';
    $("llPeople").querySelectorAll("[data-id]").forEach(function (b) { b.onclick = function () { activeP = b.getAttribute("data-id"); save("thaumorawahr_person", activeP); renderKilometer(); }; });
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
    $("llPast").innerHTML = (lp ? 'Zuletzt erreicht: <b>' + esc(lp.title) + '</b> am ' + dShort(new Date(lp.t)) + ' · <button type="button" class="wd-link" id="llCert">Urkunde</button> · ' : '') +
      '<button type="button" class="wd-link" id="llDel">' + esc(p.name || "Ich") + ' entfernen</button>';
    if (lp) $("llCert").onclick = function () { certMilestone(p, lp); };
    $("llDel").onclick = function () {
      var q = window.wzConfirm ? wzConfirm((p.name || "Ich") + " mit Geburtsdatum aus KilometerWahr entfernen?", { okLabel: "Entfernen" }) : Promise.resolve(true);
      q.then(function (ok) { if (!ok) return; save("thaumorawahr_personen", persons().filter(function (x) { return x.id !== p.id; })); activeP = null; save("thaumorawahr_person", null); renderKilometer(); renderZeit(); });
    };
    // Familie: nächste Anlässe aller Personen
    if (ps.length > 1) {
      var all = [];
      ps.forEach(function (pp) { all = all.concat(milestones(pp, now, now + 365 * DAY).filter(function (m) { return m.big || /Lebenstag|Milliarde Sekunden|Jupiter/.test(m.title); })); });
      all.sort(function (a, b) { return a.t - b.t; });
      $("llFam").hidden = !all.length;
      $("llFamList").innerHTML = all.slice(0, 5).map(function (m) { return '<div class="sn-row"><span class="dot" style="background:var(--wd-gold)"></span><div class="main"><b>' + esc(m.title) + '</b><span>' + dShort(new Date(m.t)) + '</span></div></div>'; }).join("");
    } else $("llFam").hidden = true;
    renderCal();
    renderWochen();
    renderZeitmasse();
    renderGeburt();
    startLive(p);
  }
  function startLive(p) {
    clearInterval(liveTimer);
    var b = birth(p).getTime(), b0 = midnight(new Date()).getTime();
    function tick() {
      var now = Date.now(), sec = (now - b) / 1000, today = (now - b0) / 1000;
      var fm = Math.floor((now - firstFullMoonAfter(new Date(b)).getTime()) / (SYN * DAY)) + 1;
      function words(n) { var a = Math.abs(n); return a >= 1e12 ? fmt(n / 1e12, 3) + " Billionen" : a >= 1e9 ? fmt(n / 1e9, 3) + " Milliarden" : a >= 1e6 ? fmt(n / 1e6, 2) + " Millionen" : fmt(n); }
      function row(label, n, unit, sub) {
        n = Math.floor(n); var w = words(n), exact = n >= 1e6;
        return '<div class="wd-live-row"><span>' + label + (sub ? '<small>' + sub + '</small>' : '') + '</span><b><em>' + w + (unit ? ' <i>' + unit + '</i>' : '') + '</em>' + (exact ? '<small>' + fmt(n) + '</small>' : '') + '</b></div>';
      }
      $("llLive").innerHTML =
        row("Sekunden gelebt", sec, "", "live gezählt") +
        row("Herzschläge", sec * HR, "", "geschätzt, Ø 75 pro Minute") +
        row("Mit der Erde um die Sonne", sec * ORBIT_KM_S, "km", "29,78 km in jeder Sekunde") +
        row("Mit der Sonne durch die Milchstraße", sec * GAL_KM_S, "km", "rund 230 km pro Sekunde") +
        row("Erdumdrehungen erlebt", sec / SID, "", "") +
        row("Vollmonde erlebt", fm, "", "");
      $("llWorld").innerHTML =
        row("Geburten weltweit", today * 4.25, "", "≈ 4,3 pro Sekunde") +
        row("Blitzeinschläge", today * 44, "", "≈ 44 pro Sekunde") +
        row("Herzschläge aller Menschen", today * 8.1e9 * HR, "", "Schätzung") +
        row("Strecke der Erde auf ihrer Bahn", today * ORBIT_KM_S, "km", "seit Mitternacht");
    }
    tick(); liveTimer = setInterval(function () { if (document.querySelector("#screen-kilometer.active")) tick(); }, 250);
  }
  $("llSave").onclick = function () {
    var name = ($("llName").value || "").trim(), v = $("llDate").value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) { toast("Bitte ein Geburtsdatum wählen."); return; }
    var ps = persons(); var id = "p" + Date.now().toString(36);
    ps.push({ id: id, name: name || (ps.length ? "Person " + (ps.length + 1) : "Ich"), date: v });
    save("thaumorawahr_personen", ps); activeP = id; save("thaumorawahr_person", id);
    $("llForm").hidden = true; $("llName").value = ""; renderKilometer(); checkBadges();
  };
  $("llStart").onclick = function () {
    var v = $("llDate0").value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) { toast("Bitte dein Geburtsdatum wählen."); return; }
    save("thaumorawahr_personen", [{ id: "ich", name: "Ich", date: v }]); activeP = "ich"; renderKilometer(); renderZeit(); checkBadges();
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
  var view = { lat: LOC.lat, lon: LOC.lon }, heading = load("thaumorawahr_richtung", 90), lastPath = null;
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
    drawGlobe(); renderGK();
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
  function setHeading(a) { heading = wrap360(a); save("thaumorawahr_richtung", Math.round(heading)); $("dkSlider").value = Math.round(heading); updatePath(); }
  var weitblickReady = false;
  function renderWeitblick() {
    loadGeo().then(function () {
      if (!weitblickReady) { weitblickReady = true; $("dkSlider").value = Math.round(heading); }
      updatePath(); renderSunrise(); renderTerminator(); renderEphem(); renderGroesse(); renderAdresse();
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
    if (aiming) { aiming = false; window.removeEventListener("deviceorientation", onOri); window.removeEventListener("deviceorientationabsolute", onOri); this.classList.remove("on"); this.lastChild.textContent = "Mit dem Handy zielen"; save("thaumorawahr_richtung", Math.round(heading)); return; }
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
     4. ZeitWahr – drei Zeitreisen zu Fuß
     ========================================================= */
  var R_ORDER = ["erde", "universum", "mensch"], R_ICON = { erde: "globe", universum: "universe", mensch: "people" };
  var SCALE_TXT = { "46": "46 km · über Wochen", "4.6": "4,6 km · an einem Nachmittag", "13.8": "13,8 km · über ein paar Tage", "1.38": "1,38 km · ein Spaziergang", "3": "3 km · ein Spaziergang", "30": "30 km · über Wochen" };
  function migrateReisen() {
    var old = load("thaumorawahr_zeitreise", null), r = { aktiv: "erde", fertig: {} };
    R_ORDER.forEach(function (k) { r[k] = { m: 0, scale: D.REISEN[k].scales[0] }; });
    if (old) { r.erde.m = old.m || 0; r.erde.scale = old.scale || 46; }
    save("thaumorawahr_reisen", r); return r;
  }
  var RS = reisen();
  function stations(id) {
    var R = D.REISEN[id];
    if (R.st) return R.st;
    var y = new Date().getFullYear();
    return R.jahre.map(function (j) { return [y - j[0] - (j[0] < 0 ? 1 : 0), j[1], j[2], j[0]]; });
  }
  function total(id) { var st = stations(id); return st[0][0]; }
  function cur() { return RS[RS.aktiv]; }
  function posKm(id, ago) { var T = total(id); return (T - ago) / T * RS[id].scale; }
  function agoTxt(y, id) {
    if (y >= 1e9) return "vor " + fmt(y / 1e9, 2) + " Milliarden Jahren";
    if (y >= 1e6) return "vor " + fmt(y / 1e6, y < 1e7 ? 1 : 0) + " Millionen Jahren";
    if (id === "mensch" && y < 6000) { var yr = new Date().getFullYear() - Math.round(y); return yr > 0 ? "im Jahr " + yr : "im Jahr " + (1 - yr) + " v. Chr."; }
    if (y >= 1) return "vor " + fmt(y) + " Jahren";
    return "in der Gegenwart";
  }
  function renderZeit() {
    var id = RS.aktiv, R = D.REISEN[id], c = cur(), st = stations(id), T = total(id);
    var km = c.m / 1000, tot = c.scale, pct = Math.min(100, km / tot * 100), done = km >= tot;
    var reached = st.filter(function (z) { return posKm(id, z[0]) <= km + 1e-9; });
    var now = reached[reached.length - 1] || st[0], nxt = st[reached.length];
    var agoNow = Math.max(0, T - km / tot * T);
    if (done && !(RS.fertig || {})[id]) { RS.fertig = RS.fertig || {}; RS.fertig[id] = ymd(new Date()); save("thaumorawahr_reisen", RS); toast("Angekommen in der Gegenwart! Deine Urkunde ist bereit.", 2400); buzz([30, 50, 30]); setTimeout(checkBadges, 2700); }
    $("aeTrips").innerHTML = R_ORDER.map(function (k) {
      var r = RS[k], p = Math.min(100, r.m / 1000 / r.scale * 100), f = (RS.fertig || {})[k];
      return '<button type="button" class="wd-trip' + (k === id ? ' on' : '') + (f ? ' done' : '') + '" data-trip="' + k + '" aria-pressed="' + (k === id) + '">' + icon(R_ICON[k]) + esc(D.REISEN[k].kurz) + '<small>' + (f ? "geschafft" : fmt(p) + " %") + '</small></button>';
    }).join("");
    $("aeScales").innerHTML = R.scales.map(function (s) { return '<button type="button" class="chip' + (s === c.scale ? ' active' : '') + '" data-scale="' + s + '">' + SCALE_TXT[String(s)] + '</button>'; }).join("");
    $("aeHero").innerHTML = '<div class="wd-over">' + esc(R.name) + ' · du stehst</div><h2 class="wd-card-t">' + (done ? "in der Gegenwart" : agoTxt(agoNow, id)) + '</h2>' +
      '<p class="wd-card-x"><b>' + esc(now[1]) + '.</b> ' + esc(now[2]) + '</p>' +
      '<div class="wd-prog"><i style="width:' + pct + '%"></i>' + st.map(function (z) { return '<span style="left:' + (posKm(id, z[0]) / tot * 100) + '%"></span>'; }).join("") + '</div>' +
      '<div class="wd-prog-t"><span>' + fmt(km, 2) + ' km gelaufen</span><span>' + fmt(tot, tot < 10 ? 2 : 1) + ' km</span></div>' +
      (nxt && !done ? '<p class="wd-next">Nächste Station: <b>' + esc(nxt[1]) + '</b> in ' + dist(Math.max(posKm(id, nxt[0]) - km, 0.000005)) + '</p>' : '') +
      (done ? '<p class="wd-next"><b>Geschafft – du bist in der Gegenwart angekommen!</b></p><button type="button" class="wd-glass" id="aeCert">' + icon("medal") + 'Urkunde ansehen und teilen</button>' : '');
    if ($("aeCert")) $("aeCert").onclick = function () {
      var f = RS.fertig[id];
      WDShare.certificate({ kind: "ZeitWahr", title: R.name, verb: "", text: "Zu Fuß gelaufen: " + fmt(tot, tot < 10 ? 2 : 1) + " km – " + (T >= 1e9 ? fmt(T / 1e9, 1) + " Milliarden" : fmt(T)) + " Jahre Geschichte, Schritt für Schritt.", date: "Geschafft am " + dShort(new Date(f)) })
        .then(function (b) { return WDShare.share(b, "Urkunde-" + id + ".png", R.name); }).then(function (ok) { if (ok) bump("shared"); });
    };
    $("aeListH").textContent = "Stationen: " + R.name;
    $("aeList").innerHTML = st.map(function (z) {
      var p = posKm(id, z[0]), on = p <= km + 1e-9;
      var when = id === "mensch" && z[3] != null ? (z[3] < 0 ? fmt(-z[3]) + " v. Chr." : "Jahr " + z[3]) : agoTxt(z[0], id);
      return '<div class="sn-row' + (on ? ' on' : '') + '"><span class="dot" style="background:' + (on ? 'var(--wd-gold)' : 'var(--border)') + '"></span><div class="main"><b>' + esc(z[1]) + '</b><span>' + when + '</span></div><div class="r">' + (p >= 1 ? fmt(p, p > tot * 0.97 ? 3 : 1) + " km" : p <= 0 ? "Start" : dist(p)) + '</div></div>';
    }).join("");
    // Maßstab der letzten Meter
    var mPerYear = tot * 1000 / T;
    function len(y) { var m = y * mPerYear; return m >= 1000 ? fmt(m / 1000, 2) + " km" : m >= 1 ? fmt(m, 1) + " m" : m >= 0.01 ? fmt(m * 100, 1) + " cm" : m >= 0.0001 ? fmt(m * 1000, 2) + " mm" : "weniger als ein Haar"; }
    var ps = persons(), age = ps.length ? (Date.now() - birth(ps[0]).getTime()) / (365.25 * DAY) : null, Y = new Date().getFullYear();
    var rows = id === "mensch"
      ? [["Seit dem Bau der Pyramiden", len(Y + 2560)], ["Seit Christi Geburt", len(Y)], ["Seit Gutenbergs Buchdruck", len(Y - 1450)], ["Seit der Mondlandung", len(Y - 1969)], [age ? "Dein bisheriges Leben" : "Ein Menschenleben (80 Jahre)", len(age || 80)]]
      : [["Seit dem Ende der Dinosaurier", len(66e6)], ["Seit es den Homo sapiens gibt", len(3e5)], ["Seit dem Bau der Pyramiden", len(Y + 2560)], ["Seit Christi Geburt", len(Y)], [age ? "Dein bisheriges Leben" : "Ein Menschenleben (80 Jahre)", len(age || 80)]];
    $("aeScale").innerHTML = rows.map(function (r) { return '<div class="sn-row"><div class="main"><b>' + r[0] + '</b></div><div class="r">' + r[1] + '</div></div>'; }).join("");
    document.querySelectorAll("[data-trip]").forEach(function (b) { b.onclick = function () { if (watch != null) { toast("Bitte erst die laufende Etappe beenden."); return; } RS.aktiv = b.getAttribute("data-trip"); save("thaumorawahr_reisen", RS); renderZeit(); }; });
    document.querySelectorAll("[data-scale]").forEach(function (b) {
      b.onclick = function () {
        var s = +b.getAttribute("data-scale"); if (s === cur().scale) return;
        var ch = function () { var c2 = cur(), frac = c2.m / 1000 / c2.scale; c2.scale = s; c2.m = Math.min(frac, 1) * s * 1000; if (RS.fertig && frac < 1) delete RS.fertig[RS.aktiv]; save("thaumorawahr_reisen", RS); renderZeit(); };
        if (cur().m > 0 && window.wzConfirm) wzConfirm("Strecke ändern? Dein Fortschritt wird auf die neue Länge umgerechnet.", { okLabel: "Ändern" }).then(function (ok) { if (ok) ch(); }); else ch();
      };
    });
    renderZeitmitte();
    renderEtappen();
  }
  /* Laufen: GPS zählt nur echte Schritte (genaue Positionen, Gehtempo) – mit Live-Diagnose und Etappenprotokoll */
  var watch = null, lastFix = null, stage = null;
  function etappen() { return load("thaumorawahr_etappen", []); }
  function renderGps() {
    var el = $("aeGps"); if (!el) return;
    if (!stage) { el.hidden = true; return; }
    var dur = (Date.now() - stage.t0) / 1000, km = stage.m / 1000, pace = km > 0.01 ? dur / 60 / km : null;
    el.hidden = false;
    el.innerHTML = '<div class="wd-kv"><div><span>Etappe</span><b>' + fmt(stage.m) + ' m</b></div><div><span>Dauer</span><b>' + Math.floor(dur / 60) + ':' + String(Math.floor(dur % 60)).padStart(2, "0") + ' min</b></div>' +
      '<div><span>GPS-Genauigkeit</span><b>' + (stage.acc != null ? '± ' + fmt(stage.acc) + ' m' : 'wird gesucht …') + '</b></div><div><span>Tempo</span><b>' + (stage.v != null ? fmt(stage.v * 3.6, 1) + ' km/h' : '–') + (pace ? ' · ' + fmt(pace, 1) + ' min/km' : '') + '</b></div>' +
      '<div><span>Fixes gezählt / verworfen</span><b>' + stage.ok + ' / ' + stage.no + '</b></div><div><span>Zeitreise ' + esc(D.REISEN[RS.aktiv].kurz) + '</span><b>' + agoTxt(Math.max(0, total(RS.aktiv) - cur().m / 1000 / cur().scale * total(RS.aktiv)), RS.aktiv) + '</b></div></div>';
  }
  function renderEtappen() {
    var el = $("aeEtappen"); if (!el) return;
    var E = etappen().slice().reverse(), sum = E.reduce(function (a, e) { return a + e.m; }, 0), dur = E.reduce(function (a, e) { return a + e.s; }, 0);
    el.innerHTML = '<h2 class="wd-head">Etappenprotokoll <small>' + E.length + ' Etappen</small></h2>' +
      (E.length ? '<div class="wd-kv" style="margin-bottom:6px"><div><span>Strecke gesamt</span><b>' + fmt(sum / 1000, 2) + ' km</b></div><div><span>Gehzeit gesamt</span><b>' + hm(dur / 60) + '</b></div><div><span>Ø Tempo</span><b>' + (dur ? fmt(sum / dur * 3.6, 2) + ' km/h' : '–') + '</b></div><div><span>Längste Etappe</span><b>' + fmt(Math.max.apply(null, E.map(function (e) { return e.m; })) / 1000, 2) + ' km</b></div></div>' +
        E.slice(0, 12).map(function (e) { return '<div class="sn-row"><div class="main"><b>' + dShort(new Date(e.d)) + ' · ' + esc((D.REISEN[e.j] || {}).kurz || "") + '</b><span>' + hm(e.s / 60) + ' · Ø ' + (e.s ? fmt(e.m / e.s * 3.6, 1) : '–') + ' km/h · ' + e.ok + ' Fixes, ' + e.no + ' verworfen</span></div><div class="r wd-num">' + fmt(e.m / 1000, 2) + ' km</div></div>'; }).join("")
        : '<p class="muted small" style="margin:0">Noch keine Etappe. Gespeichert werden je Etappe nur Datum, Dauer, Strecke und die Zahl der GPS-Punkte – keine Route.</p>');
  }
  function endStage() {
    if (!stage) return;
    if (stage.m >= 1) { var E = etappen(); E.push({ d: ymd(new Date(stage.t0)), j: RS.aktiv, m: Math.round(stage.m), s: Math.round((Date.now() - stage.t0) / 1000), ok: stage.ok, no: stage.no }); if (E.length > 300) E.splice(0, E.length - 300); save("thaumorawahr_etappen", E); }
    stage = null; renderGps(); renderEtappen();
  }
  $("aeGo").onclick = function () {
    var btn = this;
    if (watch != null) { navigator.geolocation.clearWatch(watch); watch = null; endStage(); btn.classList.remove("on"); btn.lastChild.textContent = "Etappe starten"; $("aeState").textContent = "Pausiert – dein Fortschritt ist gespeichert."; return; }
    if (!navigator.geolocation) { toast("Standort nicht verfügbar."); return; }
    lastFix = null; stage = { t0: Date.now(), m: 0, ok: 0, no: 0, acc: null, v: null };
    btn.classList.add("on"); btn.lastChild.textContent = "Etappe beenden"; $("aeState").textContent = "Läuft – die App muss dabei geöffnet bleiben."; renderGps();
    watch = navigator.geolocation.watchPosition(function (p) {
      var c = p.coords; stage.acc = c.accuracy;
      if (c.accuracy > 35) { stage.no++; renderGps(); return; }
      if (lastFix) {
        var d = hav(lastFix.lat, lastFix.lon, c.latitude, c.longitude) * 1000, dt = (p.timestamp - lastFix.t) / 1000;
        if (d < 8) { renderGps(); return; }
        stage.v = dt > 0 ? d / dt : null;
        if (dt > 0 && d / dt > 4.5) { stage.no++; lastFix = { lat: c.latitude, lon: c.longitude, t: p.timestamp }; renderGps(); return; } // zu schnell: Fahrzeug
        cur().m += d; stage.m += d; stage.ok++; save("thaumorawahr_reisen", RS); renderZeit();
      }
      lastFix = { lat: c.latitude, lon: c.longitude, t: p.timestamp }; renderGps();
    }, function () { toast("Standort nicht verfügbar."); }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
  };
  setInterval(function () { if (stage && document.querySelector("#screen-zeit.active")) renderGps(); }, 1000);
  $("aeReset").onclick = function () {
    (window.wzConfirm ? wzConfirm("Die Zeitreise „" + D.REISEN[RS.aktiv].name + "“ wirklich von vorn beginnen?", { okLabel: "Neu beginnen" }) : Promise.resolve(true)).then(function (ok) { if (ok) { cur().m = 0; save("thaumorawahr_reisen", RS); renderZeit(); } });
  };
  /* Deine Zeitmitte & überraschend gleichzeitig */
  function renderZeitmitte() {
    var ps = persons();
    if (!ps.length) { $("aeMitte").innerHTML = '<h2>Deine Zeitmitte</h2><p class="muted small" style="margin:0">Trag in KilometerWahr dein Geburtsdatum ein – dann zeigt dir ZeitWahr, was von deiner Geburt aus genauso weit zurückliegt wie dein ganzes bisheriges Leben.</p>'; }
    else {
      var by = +ps[0].date.slice(0, 4), now = new Date().getFullYear(), age = now - by, mid = by - age;
      var near = D.EREIGNISSE.filter(function (e) { return Math.abs(e[0] - mid) <= 6; }).slice(0, 4);
      $("aeMitte").innerHTML = '<h2>Deine Zeitmitte</h2><p class="small" style="margin:0 0 8px">Du bist <b>' + age + '</b> Jahre alt. Genauso lange vor deiner Geburt war das Jahr <b>' + mid + '</b>.</p>' +
        '<div class="wd-gl wd-gl-solo"><div class="wd-gl-line"><i style="left:0"></i><i class="mid" style="left:50%"></i><i style="left:100%"></i></div>' +
        '<div class="wd-gl-t"><span>Zeitmitte<small>' + mid + '</small></span><span style="text-align:center">Geburt<small>' + by + '</small></span><span style="text-align:right">Heute<small>' + now + '</small></span></div></div>' +
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

  /* =========================================================
     Erweiterungen (FINAL-97):
     Lebenszeit in Wochen, Geburtsmoment, Zeitkapsel, Wahre Größe, Kosmische Adresse
     ========================================================= */

  /* ---------- Lebenszeit in Wochen ---------- */
  var WEEKS_ROWS = 90;
  function weekStart(b, row, col) { return addDays(new Date(b.getFullYear() + row, b.getMonth(), b.getDate()), col * 7); }
  function weekState(p, b, row, col, ms, now) {
    var st = weekStart(b, row, col), en = addDays(st, 7);
    if (now >= st && now < en) return "now";
    var big = ms.some(function (m) { return m.t >= st.getTime() && m.t < en.getTime(); });
    if (st < now) return big ? "msp" : "past";
    return big ? "msf" : "fut";
  }
  function renderWochen() {
    var el = $("llWochen"), ps = persons(); if (!el || !ps.length) { if (el) el.hidden = true; return; }
    var p = ps.filter(function (x) { return x.id === activeP; })[0] || ps[0], b = birth(p), now = new Date();
    var lived = Math.floor((now - b) / (7 * DAY)), yrs = (now - b) / (365.2425 * DAY), rowNow = Math.floor(yrs);
    el.hidden = false;
    el.innerHTML = '<h2 class="wd-head">Lebenszeit in Wochen <small>' + esc(p.name || "Ich") + '</small></h2>' +
      '<p class="muted small" style="margin:0 0 10px">Raster über 90 Jahre: eine Zeile pro Lebensjahr (ab Geburtstag), 52 Kästchen pro Zeile; die 1–2 Resttage je Jahr sind ausgelassen. Tippe auf eine Zeile, um das Lebensjahr vergrößert zu öffnen.</p>' +
      '<div class="wd-kv"><div><span>Gelebte Wochen</span><b>' + fmt(lived) + '</b></div><div><span>Aktuelle Lebenswoche</span><b>' + fmt(lived + 1) + '</b></div><div><span>Alter</span><b>' + fmt(yrs, 3) + ' Jahre</b></div><div><span>Anteil am Raster</span><b>' + fmt(Math.min(100, yrs / WEEKS_ROWS * 100), 1) + ' %</b></div></div>' +
      '<canvas id="llWCv" class="wd-weeks" role="img" aria-label="Raster der Lebenswochen; ' + fmt(lived) + ' Wochen gelebt"></canvas>' +
      '<div class="wd-legend"><span><i class="a"></i>gelebt</span><span><i class="g"></i>aktuelle Woche</span><span><i class="m"></i>Meilenstein</span><span><i class="f"></i>kommend</span></div>' +
      '<button type="button" class="cta slim" id="llWNow" style="margin-top:10px">' + icon("calendar") + 'Aktuelles Lebensjahr öffnen</button>';
    var cv = $("llWCv"), css = cv.clientWidth || 340, dpr = Math.min(2, window.devicePixelRatio || 1);
    var padL = 24, cell = (css - padL) / 52, H = WEEKS_ROWS * cell + 4;
    cv.style.height = H + "px"; cv.width = Math.round(css * dpr); cv.height = Math.round(H * dpr);
    var g = cv.getContext("2d"); g.scale(dpr, dpr);
    var cs = getComputedStyle(document.documentElement), col = { past: cs.getPropertyValue("--accent").trim() || "#5A2FBE", fut: cs.getPropertyValue("--border").trim() || "#ccc", gold: cs.getPropertyValue("--wd-gold").trim() || "#C98A1F", sub: cs.getPropertyValue("--sub-onbg").trim() || "#777" };
    var ms = milestones(p, b.getTime(), b.getTime() + WEEKS_ROWS * 365.25 * DAY).filter(function (m) { return m.big; });
    g.font = "600 8px -apple-system, system-ui, sans-serif"; g.fillStyle = col.sub; g.textAlign = "right"; g.textBaseline = "middle";
    for (var y = 0; y < WEEKS_ROWS; y++) {
      if (y % 10 === 0) { g.fillStyle = col.sub; g.fillText(String(y), padL - 5, y * cell + cell / 2); }
      for (var w = 0; w < 52; w++) {
        var stt = weekState(p, b, y, w, ms, now), x = padL + w * cell, s = Math.max(1, cell - 1.3);
        g.globalAlpha = stt === "fut" ? .55 : stt === "msf" ? .6 : 1;
        g.fillStyle = stt === "past" ? col.past : stt === "fut" ? col.fut : col.gold;
        g.fillRect(x, y * cell, s, s);
      }
    }
    g.globalAlpha = 1;
    g.strokeStyle = col.gold; g.lineWidth = 1.2; g.strokeRect(padL - 1, rowNow * cell - 1, 52 * cell + 1, cell + 1);
    cv.onclick = function (e) { var rc = cv.getBoundingClientRect(), row = Math.floor((e.clientY - rc.top) / cell); if (row >= 0 && row < WEEKS_ROWS) openJahr(p, row); };
    $("llWNow").onclick = function () { openJahr(p, rowNow); };
  }
  /* Ein Lebensjahr vergrößert: 52 gut antippbare Wochen */
  function openJahr(p, row) {
    var b = birth(p), now = new Date(), ms = milestones(p, b.getTime(), b.getTime() + WEEKS_ROWS * 365.25 * DAY).filter(function (m) { return m.big; });
    var y0 = new Date(b.getFullYear() + row, b.getMonth(), b.getDate()), y1 = addDays(new Date(b.getFullYear() + row + 1, b.getMonth(), b.getDate()), -1);
    var cells = ""; for (var w = 0; w < 52; w++) { var st = weekState(p, b, row, w, ms, now); cells += '<button type="button" class="wd-wk ' + st + '" data-w="' + w + '" aria-label="Woche ' + (w + 1) + ', ab ' + dShort(weekStart(b, row, w)) + '">' + (w + 1) + '</button>'; }
    sheet('<h2>Lebensjahr ' + (row + 1) + ' <small class="muted" style="font-size:14px;font-weight:500">Alter ' + row + '</small></h2>' +
      '<p class="muted small" style="margin:0 0 10px">' + dShort(y0) + ' – ' + dShort(y1) + ' · Kalenderjahre ' + y0.getFullYear() + (y1.getFullYear() !== y0.getFullYear() ? '/' + y1.getFullYear() : '') + '</p>' +
      '<div class="wd-wkgrid">' + cells + '</div>' +
      '<div class="btn-row" style="margin-top:12px"><button type="button" class="cta slim" id="jPrev"' + (row <= 0 ? ' disabled' : '') + '>' + icon("left") + 'Jahr ' + row + '</button><button type="button" class="cta slim" id="jNext"' + (row >= WEEKS_ROWS - 1 ? ' disabled' : '') + '>Jahr ' + (row + 2) + icon("right") + '</button></div>', function (root, close) {
        root.querySelectorAll("[data-w]").forEach(function (c) { c.onclick = function () { close(); weekDetail(p, row, +c.getAttribute("data-w")); }; });
        root.querySelector("#jPrev").onclick = function () { close(); openJahr(p, row - 1); };
        root.querySelector("#jNext").onclick = function () { close(); openJahr(p, row + 1); };
      });
  }
  function weekDetail(p, row, col) {
    var b = birth(p), now = new Date(), start = weekStart(b, row, col), end = addDays(start, 6);
    var wk = Math.floor((start - b) / (7 * DAY)) + 1, past = start <= now;
    var evs = D.EREIGNISSE.filter(function (ev) { return ev[0] === start.getFullYear() || ev[0] === end.getFullYear(); });
    var hv = []; for (var d = 0; d < 7; d++) { var dd = addDays(start, d), key = String(dd.getMonth() + 1).padStart(2, "0") + "-" + String(dd.getDate()).padStart(2, "0"); (D.HEUTE[key] || []).forEach(function (h) { if (h[0] <= start.getFullYear()) hv.push([dd, h]); }); }
    var mws = milestones(p, start.getTime(), end.getTime() + DAY);
    var ageD = Math.floor((start - b) / DAY);
    sheet('<h2>Lebenswoche ' + fmt(wk) + '</h2><p class="muted" style="margin:0">' + dShort(start) + ' – ' + dShort(end) + (past ? '' : ' · liegt in der Zukunft') + '</p>' +
      '<div class="wd-kv" style="margin-top:10px"><div><span>Alter zu Wochenbeginn</span><b>' + row + ' J. · ' + fmt(ageD) + ' Tage</b></div><div><span>Woche im Lebensjahr</span><b>' + (col + 1) + ' von 52</b></div>' +
      '<div><span>' + (past ? 'Vor' : 'In') + '</span><b>' + fmt(Math.abs(daysBetween(now, start))) + ' Tagen</b></div><div><span>Erdbahn bis dahin</span><b>' + fmt(ageD * 86400 * ORBIT_KM_S / 1e9, 2) + ' Mrd. km</b></div></div>' +
      (mws.length ? '<h3 class="wd-sub">Meilensteine in dieser Woche</h3>' + mws.map(function (m) { return '<div class="sn-row on"><span class="dot" style="background:var(--wd-gold)"></span><div class="main"><b>' + esc(m.title) + '</b><span>' + dShort(new Date(m.t)) + '</span></div></div>'; }).join("") : '') +
      (evs.length ? '<h3 class="wd-sub">In diesem Jahr in der Welt</h3>' + evs.map(function (ev) { return '<div class="sn-fact"><div class="ic wd-yr">' + ev[0] + '</div><div><b>' + esc(ev[1]) + '</b></div></div>'; }).join("") : '') +
      (hv.length ? '<h3 class="wd-sub">Jahrestage in dieser Woche</h3>' + hv.slice(0, 7).map(function (x) { return '<div class="sn-fact"><div class="ic wd-yr">' + x[1][0] + '</div><div><b>' + x[0].getDate() + '. ' + MO[x[0].getMonth()] + '</b><span>' + esc(x[1][1]) + '</span></div></div>'; }).join("") : '') +
      '<button type="button" class="cta slim" id="wBack" style="margin-top:12px">' + icon("left") + 'Zurück zum Lebensjahr ' + (row + 1) + '</button>', function (root, close) {
        root.querySelector("#wBack").onclick = function () { close(); openJahr(p, row); };
      });
  }

  /* ---------- Geburtsmoment: Himmel und Erde am Tag der Geburt ---------- */
  function renderGeburt() {
    var el = $("llGeburt"), ps = persons(); if (!el || !ps.length || !A) { if (el) el.hidden = true; return; }
    var p = ps.filter(function (x) { return x.id === activeP; })[0] || ps[0], b = birth(p), jd = A.toJD(b), now = new Date(), jdn = A.toJD(now);
    try {
      var s = A.sun(jd), m = A.moon(jd), cosE = s.v[0] * m.v[0] + s.v[1] * m.v[1] + s.v[2] * m.v[2], illum = (1 - cosE) / 2 * 100;
      var nm = A.moonPhaseTime(jd, 0, -1), age = nm ? jd - nm : null, waxing = age != null && age < 14.77;
      var phase = illum < 3 ? "Neumond" : illum > 97 ? "Vollmond" : (waxing ? "zunehmend" : "abnehmend") + (illum < 45 ? "e Sichel" : illum > 55 ? "er Mond (Dreiviertel)" : "er Halbmond");
      var key = String(b.getMonth() + 1).padStart(2, "0") + "-" + String(b.getDate()).padStart(2, "0"), hv = (D.HEUTE[key] || []).filter(function (h) { return h[0] <= b.getFullYear() + 80; });
      var sec = (now - b) / 1000, ly = sec * GAL_KM_S / 9.4607e12;
      var pl = [["mars", "Mars"], ["venus", "Venus"], ["jupiter", "Jupiter"], ["saturn", "Saturn"]].map(function (x) { return [x[1], A.planet(x[0], jd).dist * 149597870.7, A.planet(x[0], jdn).dist * 149597870.7]; });
      var tt = new Date(b), wd = WD[tt.getDay()];
      var kw = (function (d) { var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); var dn = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - dn); var y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t - y0) / DAY + 1) / 7); })(tt);
      el.hidden = false;
      el.innerHTML = '<h2 class="wd-head">Geburtsmoment <small>' + esc(p.name || "Ich") + ' · ' + dShort(b) + '</small></h2>' +
        '<p class="muted small" style="margin:0 0 10px">Berechnet für 12:00 Uhr Ortszeit (die Uhrzeit ist nicht hinterlegt). Positionen nach Meeus, geozentrisch.</p>' +
        '<div class="wd-kv"><div><span>Wochentag</span><b>' + wd + '</b></div><div><span>Kalenderwoche</span><b>' + kw + '</b></div>' +
        '<div><span>Julianisches Datum</span><b>' + fmt(jd, 3) + '</b></div><div><span>Tage seither</span><b>' + fmt(Math.floor((now - b) / DAY)) + '</b></div>' +
        '<div><span>Mond</span><b>' + phase + '</b></div><div><span>Beleuchtung · Mondalter</span><b>' + fmt(illum) + ' % · ' + (age != null ? fmt(age, 1) + ' d' : '–') + '</b></div>' +
        '<div><span>Abstand Mond</span><b>' + fmt(Math.round(m.dist / 100) * 100) + ' km</b></div><div><span>Abstand Sonne</span><b>' + fmt(s.dist * 149.5978707, 2) + ' Mio. km</b></div>' +
        '<div><span>Sonne (ekl. Länge)</span><b>' + fmt(s.lon, 1) + '°</b></div><div><span>Strecke der Sonne seither</span><b>' + fmt(ly, 4) + ' Lj</b></div></div>' +
        '<h3 class="wd-sub">Planetenabstände: Geburt → heute</h3>' + pl.map(function (x) { return '<div class="sn-row"><div class="main"><b>' + x[0] + '</b><span>' + fmt(x[1] / 1e6) + ' → ' + fmt(x[2] / 1e6) + ' Mio. km</span></div><div class="r">' + (x[2] < x[1] ? "−" : "+") + fmt(Math.abs(x[2] - x[1]) / 1e6) + '</div></div>'; }).join("") +
        (hv.length ? '<h3 class="wd-sub">Derselbe Kalendertag in der Geschichte</h3>' + hv.map(function (h) { return '<div class="sn-fact"><div class="ic wd-yr">' + h[0] + '</div><div><b>' + (h[0] < b.getFullYear() ? fmt(b.getFullYear() - h[0]) + ' Jahre vor der Geburt' : h[0] === b.getFullYear() ? 'im Geburtsjahr' : fmt(h[0] - b.getFullYear()) + ' Jahre nach der Geburt') + '</b><span>' + esc(h[1]) + '</span></div></div>'; }).join("") : '');
    } catch (e) { el.hidden = true; }
  }

  /* ---------- Zeitkapsel ---------- */
  function kapseln() { return load("thaumorawahr_kapseln", []); }
  function kapselReady(k) { return !k.opened && midnight(new Date()) >= midnight(new Date(k.open)); }
  function renderKapselBanner() {
    var el = $("fbKapsel"); if (!el) return;
    var r = kapseln().filter(kapselReady);
    el.hidden = !r.length || offset !== 0;
    if (!r.length) return;
    el.innerHTML = '<div class="wd-kapsel-b">' + icon("lock") + '<div><b>Zeitkapsel bereit</b><span>' + (r.length === 1 ? 'Geschrieben am ' + dShort(new Date(r[0].created)) : r.length + ' Zeitkapseln können geöffnet werden') + '</span></div><button type="button" class="wd-mini" id="fbKapselGo">Öffnen</button></div>';
    $("fbKapselGo").onclick = function () { openKapsel(r[0].id); };
  }
  function renderKapsel() {
    var el = $("llKapsel"); if (!el) return;
    var ks = kapseln().sort(function (a, b) { return a.open < b.open ? -1 : 1; }), now = new Date();
    el.innerHTML = '<h2 class="wd-head">Zeitkapsel <small>' + ks.length + ' gespeichert</small></h2>' +
      '<p class="muted small" style="margin:0 0 10px">Eine Nachricht an dein zukünftiges Ich – versiegelt bis zum gewählten Datum. Gespeichert nur auf diesem Gerät, unverschlüsselt im App-Speicher; mit der Datensicherung der WahrZentrale wird sie mitgesichert.</p>' +
      (ks.length ? ks.map(function (k) {
        var d = daysBetween(now, new Date(k.open)), ready = kapselReady(k);
        return '<div class="sn-row"><span class="dot" style="background:' + (k.opened ? 'var(--border)' : ready ? 'var(--wd-gold)' : 'var(--accent)') + '"></span><div class="main"><b>' + esc(k.t || "Zeitkapsel") + '</b><span>' + (k.opened ? 'geöffnet am ' + dShort(new Date(k.opened)) : ready ? 'bereit zum Öffnen' : 'versiegelt bis ' + dShort(new Date(k.open)) + ' · noch ' + fmt(d) + (d === 1 ? ' Tag' : ' Tage')) + ' · geschrieben ' + dShort(new Date(k.created)) + '</span></div>' +
          '<div class="r">' + (k.opened || ready ? '<button type="button" class="wd-mini" data-ko="' + k.id + '">' + (k.opened ? 'Lesen' : 'Öffnen') + '</button>' : '') + '<button type="button" class="wd-mini" data-kd="' + k.id + '" aria-label="Löschen">' + icon("trash") + '</button></div></div>';
      }).join("") : '') +
      '<button type="button" class="cta primary" id="llKNew" style="margin-top:10px">' + icon("lock") + 'Neue Zeitkapsel</button>';
    el.querySelectorAll("[data-ko]").forEach(function (b) { b.onclick = function () { openKapsel(b.getAttribute("data-ko")); }; });
    el.querySelectorAll("[data-kd]").forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute("data-kd");
        (window.wzConfirm ? wzConfirm("Diese Zeitkapsel endgültig löschen? Der Inhalt kann nicht wiederhergestellt werden.", { okLabel: "Löschen" }) : Promise.resolve(true)).then(function (ok) { if (ok) { save("thaumorawahr_kapseln", kapseln().filter(function (k) { return k.id !== id; })); renderKapsel(); renderKapselBanner(); } });
      };
    });
    $("llKNew").onclick = newKapsel;
  }
  function newKapsel() {
    var ps = persons(), nb = null;
    if (ps.length) { var b = birth(ps[0]), n = new Date(); nb = new Date(n.getFullYear(), b.getMonth(), b.getDate()); if (nb <= n) nb = new Date(n.getFullYear() + 1, b.getMonth(), b.getDate()); }
    var opts = [["m1", "in 1 Monat", addDays(new Date(), 30)], ["y1", "in 1 Jahr", new Date(new Date().getFullYear() + 1, new Date().getMonth(), new Date().getDate())], ["y5", "in 5 Jahren", new Date(new Date().getFullYear() + 5, new Date().getMonth(), new Date().getDate())]];
    if (nb) opts.splice(2, 0, ["gb", "zum Geburtstag", nb]);
    sheet('<h2>Neue Zeitkapsel</h2><div class="wd-form"><label for="kT">Betreff (optional)</label><input class="text-input" id="kT" maxlength="60" placeholder="z. B. Gedanken im Herbst">' +
      '<label for="kX">Nachricht</label><textarea class="text-input" id="kX" rows="6" maxlength="4000" placeholder="Was möchtest du dir selbst sagen? Was beschäftigt dich, was erhoffst du dir?"></textarea>' +
      '<label>Öffnen frühestens</label><div class="chip-row" id="kO">' + opts.map(function (o, i) { return '<button type="button" class="chip' + (i === 1 ? ' active' : '') + '" data-d="' + ymd(o[2]) + '">' + o[1] + '</button>'; }).join("") + '</div>' +
      '<input class="text-input sn-date" type="date" id="kD" value="' + ymd(opts[1][2]) + '" min="' + ymd(addDays(new Date(), 1)) + '" aria-label="Öffnungsdatum"></div>' +
      '<button type="button" class="cta primary" id="kSave" style="margin-top:12px">' + icon("lock") + 'Versiegeln</button>', function (root, close) {
        root.querySelectorAll("#kO [data-d]").forEach(function (c) { c.onclick = function () { root.querySelectorAll("#kO .chip").forEach(function (x) { x.classList.toggle("active", x === c); }); root.querySelector("#kD").value = c.getAttribute("data-d"); }; });
        root.querySelector("#kSave").onclick = function () {
          var txt = root.querySelector("#kX").value.trim(), d = root.querySelector("#kD").value;
          if (!txt) { toast("Bitte eine Nachricht schreiben."); return; }
          if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d <= ymd(new Date())) { toast("Bitte ein Datum in der Zukunft wählen."); return; }
          var w = wonderFor(new Date()), ks = kapseln();
          ks.push({ id: "k" + Date.now().toString(36), t: root.querySelector("#kT").value.trim(), txt: txt, created: new Date().toISOString(), open: d, ctx: { ort: LOC.name || "", wunder: w.t } });
          save("thaumorawahr_kapseln", ks); close(); toast("Zeitkapsel versiegelt bis " + dShort(new Date(d)) + "."); renderKapsel();
        };
      });
  }
  function openKapsel(id) {
    var ks = kapseln(), k = ks.filter(function (x) { return x.id === id; })[0]; if (!k) return;
    if (!k.opened && !kapselReady(k)) return;
    var first = !k.opened;
    if (first) { k.opened = new Date().toISOString(); save("thaumorawahr_kapseln", ks); }
    var d = daysBetween(new Date(k.created), new Date());
    sheet('<div class="wd-kapsel-open' + (first ? ' anim' : '') + '"><div class="wd-seal">' + icon("lock") + '</div>' +
      '<h2>' + esc(k.t || "Zeitkapsel") + '</h2><p class="muted small" style="margin:0 0 12px">Geschrieben am ' + dLong(new Date(k.created)) + (k.ctx && k.ctx.ort ? ' in ' + esc(k.ctx.ort) : '') + ' – vor ' + fmt(d) + (d === 1 ? ' Tag' : ' Tagen') + '.</p>' +
      '<div class="wd-letter">' + esc(k.txt).replace(/\n/g, "<br>") + '</div>' +
      (k.ctx && k.ctx.wunder ? '<p class="muted small" style="margin:12px 0 0">Tageswunder an jenem Tag: „' + esc(k.ctx.wunder) + '“</p>' : '') + '</div>');
    renderKapsel(); renderKapselBanner();
  }

  /* ---------- Wahre Größe: Länder auf der Mercator-Karte verschieben ---------- */
  var TG = { sel: null, to: null, ready: false };
  function vec(lat, lon) { var p = lat * D2R, l = lon * D2R; return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)]; }
  function unvec(v) { return [Math.asin(Math.max(-1, Math.min(1, v[2]))) * R2D, Math.atan2(v[1], v[0]) * R2D]; }
  function rotFn(a, b) {
    var k = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], s = Math.hypot(k[0], k[1], k[2]), c = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    if (s < 1e-12) return function (v) { return v; };
    k = [k[0] / s, k[1] / s, k[2] / s];
    return function (v) { var kv = [k[1] * v[2] - k[2] * v[1], k[2] * v[0] - k[0] * v[2], k[0] * v[1] - k[1] * v[0]], kd = k[0] * v[0] + k[1] * v[1] + k[2] * v[2]; return [v[0] * c + kv[0] * s + k[0] * kd * (1 - c), v[1] * c + kv[1] * s + k[1] * kd * (1 - c), v[2] * c + kv[2] * s + k[2] * kd * (1 - c)]; };
  }
  /* Verschiebung ohne Verdrehen: 1) Drehung um die Erdachse (Längenänderung), 2) Drehung entlang des Ziel-Meridians (Breitenänderung) */
  function moveFn(from, to) {
    var dl = (to[1] - from[1]) * D2R, cz = Math.cos(dl), sz = Math.sin(dl);
    var r2 = rotFn(vec(from[0], to[1]), vec(to[0], to[1]));
    return function (v) { return r2([v[0] * cz - v[1] * sz, v[0] * sz + v[1] * cz, v[2]]); };
  }
  var MLAT = 82, DLAT = 89.5;
  function mercY(lat, lim) { var L = lim || MLAT, p = Math.max(-L, Math.min(L, lat)) * D2R; return Math.log(Math.tan(Math.PI / 4 + p / 2)); }
  var MY = mercY(MLAT);
  var RAT = (2 * MY) / (2 * Math.PI); // Höhe/Breite der Mercator-Karte bis ±82°
  function tgOk(c) { return !!(c && c.area && c.bb && c.bb[1] > -60 && c.de); }
  function tgSelect(c) { TG.sel = c; TG.to = [Math.abs(c.ly) > 25 ? 0 : (c.ly >= 0 ? 55 : -55), c.lx]; TG.forId = c.id; }
  var TGV = { inline: null, big: null };
  function renderGroesse() {
    var el = $("dkGroesse"); if (!el || !GEO.world) return;
    if (!TG.sel || !tgOk(TG.sel)) tgSelect(GEO.world.filter(function (c) { return c.de === "Grönland" && tgOk(c); })[0] || GEO.world.filter(tgOk)[0]);
    el.innerHTML = '<h2 class="wd-head">Wahre Größe <small>Mercator-Projektion</small></h2>' +
      '<p class="muted small" style="margin:0 0 10px">Die übliche Weltkarte (Mercator) ist winkeltreu, aber nicht flächentreu: Ein Gebiet in der Breite φ wird linear um 1/cos φ und in der Fläche um 1/cos² φ vergrößert. Tippe auf der Karte ein beliebiges Land an, um es auszuwählen, und ziehe dann die goldene Kopie an eine andere Stelle – oder tippe aufs Meer, um sie dorthin zu setzen. Die Kopie wird auf der Kugel verschoben und neu projiziert.</p>' +
      '<div class="wd-merc-sel" id="tgSelL" aria-live="polite"></div>' +
      '<div class="wd-merc-wrap"><canvas id="tgCv" class="wd-merc" role="img" aria-label="Weltkarte in Mercator-Projektion mit verschobenem Land"></canvas>' +
      '<button type="button" class="wd-merc-zoom" id="tgBig" aria-label="Karte vergrößern">' + icon("expand") + '</button></div><div id="tgInfo"></div>';
    TGV.inline = tgMap($("tgCv"), false);
    $("tgBig").onclick = openGroesseBig;
    drawGroesse();
  }
  /* Karten-Steuerung für eingebettete und vergrößerte Ansicht (gemeinsamer Zustand TG) */
  function tgMap(cv, big) {
    var V = { cv: cv, big: big, s: 1, minS: 1, cx: .5, cy: .5, tr: null, copy: [], refPt: null, init: !big };
    var pts = {}, st = null, pinch = null, raf = 0;
    function redraw() { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; drawGroesse(); }); }
    function local(e) { var rc = cv.getBoundingClientRect(); return [e.clientX - rc.left, e.clientY - rc.top]; }
    function ll(px, py) { var t = V.tr, x = (px - t.ox) / t.bw, y = (py - t.oy) / t.bh, my = MY - y * 2 * MY; return [(2 * Math.atan(Math.exp(my)) - Math.PI / 2) * R2D, x * 360 - 180]; }
    function onCopy(px, py) {
      if (V.refPt && Math.hypot(px - V.refPt[0], py - V.refPt[1]) < 22) return true;
      return V.copy.some(function (rings) { var ins = false; rings.forEach(function (r) { if (inRing(r, px, py)) ins = !ins; }); return ins; });
    }
    function setTo(lat, lon) { TG.to = [Math.max(-72, Math.min(72, lat)), wrap180(lon)]; redraw(); }
    function zoomAt(s, mx, my) {
      var t = V.tr, nx = (mx - t.ox) / t.bw, ny = (my - t.oy) / t.bh;
      V.s = Math.max(V.minS, Math.min(12, s));
      var bw = t.w * V.s, bh = bw * RAT;
      V.cx = (t.w / 2 - (mx - nx * bw)) / bw; V.cy = (t.h / 2 - (my - ny * bh)) / bh; redraw();
    }
    V.zoomBy = function (f) { if (V.tr) zoomAt(V.s * f, V.tr.w / 2, V.tr.h / 2); };
    cv.addEventListener("pointerdown", function (e) {
      if (!V.tr) return; var p = local(e); pts[e.pointerId] = p; try { cv.setPointerCapture(e.pointerId); } catch (x) { }
      var ids = Object.keys(pts);
      if (big && ids.length === 2) { var a = pts[ids[0]], b = pts[ids[1]]; pinch = { d0: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, s0: V.s }; st = null; return; }
      if (ids.length > 1) return;
      var copy = onCopy(p[0], p[1]);
      st = { x: p[0], y: p[1], p0: ll(p[0], p[1]), to0: TG.to.slice(), moved: false, mode: copy ? "copy" : (big && V.s > 1.01 ? "pan" : "copy"), onCopy: copy, cx0: V.cx, cy0: V.cy };
    });
    cv.addEventListener("pointermove", function (e) {
      if (!(e.pointerId in pts)) return; var p = local(e); pts[e.pointerId] = p;
      var ids = Object.keys(pts);
      if (pinch && ids.length === 2) { var a = pts[ids[0]], b = pts[ids[1]]; zoomAt(pinch.s0 * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d0, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); pinch.s0 = V.s; pinch.d0 = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1; return; }
      if (!st) return;
      if (Math.hypot(p[0] - st.x, p[1] - st.y) > 6) st.moved = true;
      if (!st.moved) return;
      if (st.mode === "pan") { var t = V.tr; V.cx = st.cx0 - (p[0] - st.x) / t.bw; V.cy = st.cy0 - (p[1] - st.y) / t.bh; redraw(); }
      else { var p1 = ll(p[0], p[1]); setTo(st.to0[0] + (p1[0] - st.p0[0]), st.to0[1] + (p1[1] - st.p0[1])); }
    });
    function up(e) {
      if (!(e.pointerId in pts)) return; var p = pts[e.pointerId]; delete pts[e.pointerId];
      if (pinch) { if (!Object.keys(pts).length) pinch = null; st = null; return; }
      if (st && !st.moved && !st.onCopy && e.type === "pointerup") {
        var q = ll(p[0], p[1]); if (q[0] < -85 || q[0] > 85 || p[0] < V.tr.ox || p[0] > V.tr.ox + V.tr.bw) { st = null; return; }
        var c = countryAt(q[0], q[1]);
        if (c && tgOk(c)) { if (c !== TG.sel) { tgSelect(c); buzz(); redraw(); } }
        else if (!c) setTo(q[0], q[1]);
      }
      st = null;
    }
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    return V;
  }
  function tgDraw(V) {
    var cv = V.cv; if (!cv || !cv.isConnected) return;
    var w = cv.clientWidth || 340, h, dpr = Math.min(V.big ? 3 : 2, window.devicePixelRatio || 1);
    if (V.big) h = cv.clientHeight || w * RAT; else { h = w * RAT; cv.style.height = h + "px"; }
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    V.minS = V.big ? Math.max(1, h / (w * RAT)) : 1;
    if (!V.init) { V.init = true; V.s = V.minS; V.cx = (wrap180(TG.to[1]) + 180) / 360; V.cy = (MY - mercY(TG.to[0])) / (2 * MY); }
    if (V.s < V.minS) V.s = V.minS;
    var bw = w * V.s, bh = bw * RAT;
    V.cx = bw <= w ? .5 : Math.max(w / 2 / bw, Math.min(1 - w / 2 / bw, V.cx));
    V.cy = bh <= h ? .5 : Math.max(h / 2 / bh, Math.min(1 - h / 2 / bh, V.cy));
    var ox = w / 2 - V.cx * bw, oy = h / 2 - V.cy * bh; V.tr = { ox: ox, oy: oy, bw: bw, bh: bh, w: w, h: h };
    var g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var cs = getComputedStyle(document.documentElement), acc = cs.getPropertyValue("--accent").trim() || "#5A2FBE";
    var dark = document.documentElement.classList.contains("theme-dark");
    g.clearRect(0, 0, w, h);
    g.fillStyle = dark ? "#15102A" : "#EEE9FA"; g.fillRect(ox, oy, bw, bh);
    function X(lon) { return ox + (lon + 180) / 360 * bw; }
    function Y(lat) { return oy + (MY - mercY(lat)) / (2 * MY) * bh; }
    function YD(lat) { return oy + (MY - mercY(lat, DLAT)) / (2 * MY) * bh; }
    function vis(c) { var b = c.bb; return !(X(b[2]) < 0 || X(b[0]) > w || Y(b[1]) < 0 || Y(b[3]) > h); }
    // Breitenkreise (Linien unter den Ländern, Beschriftung zuletzt obenauf)
    var LATS = [-60, -30, 0, 30, 60, 75];
    g.strokeStyle = dark ? "rgba(255,255,255,.08)" : "rgba(40,20,90,.08)"; g.lineWidth = 1;
    LATS.forEach(function (la) { var y = Y(la); if (y < -2 || y > h + 2) return; g.beginPath(); g.moveTo(Math.max(0, ox), y); g.lineTo(Math.min(w, ox + bw), y); g.stroke(); });
    function path(c) { c.polys.forEach(function (rings) { g.beginPath(); rings.forEach(function (r) { for (var i = 0; i < r.length; i += 2) { var x = X(r[i]), y = Y(r[i + 1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.closePath(); }); g.fill("evenodd"); if (V.big && V.s > 2.5) g.stroke(); }); }
    // Länder (bei starker Vergrößerung mit Grenzen)
    g.fillStyle = dark ? "#3A2E5E" : "#D5CAEE"; g.strokeStyle = dark ? "rgba(255,255,255,.18)" : "rgba(255,255,255,.9)"; g.lineWidth = .7;
    GEO.world.forEach(function (c) { if (vis(c)) path(c); });
    var c = TG.sel, ref = [c.ly, c.lx];
    // Original hervorheben
    g.fillStyle = dark ? "rgba(155,123,255,.28)" : "rgba(90,47,190,.16)"; g.strokeStyle = acc; g.lineWidth = 1.2; g.setLineDash([3, 2]);
    c.polys.forEach(function (rings) { g.beginPath(); rings.forEach(function (r) { for (var i = 0; i < r.length; i += 2) { var x = X(r[i]), y = Y(r[i + 1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.closePath(); }); g.fill("evenodd"); g.stroke(); });
    g.setLineDash([]);
    // verschobene Kopie
    var rot = moveFn(ref, TG.to); V.copy = [];
    g.fillStyle = dark ? "rgba(255,210,122,.55)" : "rgba(201,138,31,.5)"; g.strokeStyle = dark ? "#FFD27A" : "#8A5A06"; g.lineWidth = 1.2;
    [-360, 0, 360].forEach(function (sh) {
      c.polys.forEach(function (rings) {
        var sp = [];
        g.beginPath();
        rings.forEach(function (r) {
          var prev = null, out = new Float32Array(r.length);
          for (var i = 0; i < r.length; i += 2) {
            var q = unvec(rot(vec(r[i + 1], r[i]))), lon = q[1];
            if (prev != null) { while (lon - prev > 180) lon -= 360; while (lon - prev < -180) lon += 360; } else { while (lon - TG.to[1] > 180) lon -= 360; while (lon - TG.to[1] < -180) lon += 360; }
            prev = lon; var x = X(lon + sh), y = YD(q[0]); out[i] = x; out[i + 1] = y; if (i) g.lineTo(x, y); else g.moveTo(x, y);
          }
          g.closePath(); sp.push(out);
        });
        g.fill("evenodd"); g.stroke(); V.copy.push(sp);
      });
    });
    V.refPt = [X(TG.to[1]), YD(TG.to[0])];
    // Griffpunkt der Kopie
    g.beginPath(); g.arc(V.refPt[0], V.refPt[1], V.big ? 5 : 3.5, 0, 2 * Math.PI); g.fillStyle = dark ? "#FFD27A" : "#8A5A06"; g.fill();
    g.lineWidth = 1.5; g.strokeStyle = dark ? "#15102A" : "#fff"; g.stroke();
    g.font = "650 " + (V.big ? 10.5 : 8.5) + "px -apple-system, system-ui, sans-serif"; g.lineJoin = "round";
    LATS.forEach(function (la) {
      var y = Y(la); if (y < 8 || y > h + 2) return; var t = (la === 0 ? "0°" : la + "°") + " ×" + fmt(1 / Math.pow(Math.cos(la * D2R), 2), 1), x = Math.max(4, ox + 4);
      g.lineWidth = 3; g.strokeStyle = dark ? "rgba(21,16,42,.85)" : "rgba(238,233,250,.9)"; g.strokeText(t, x, y - 3);
      g.fillStyle = dark ? "rgba(255,255,255,.6)" : "rgba(40,20,90,.6)"; g.fillText(t, x, y - 3);
    });
  }
  function tgFacts() {
    var c = TG.sel, ref = [c.ly, c.lx], de = GEO.world.filter(function (x) { return x.de === "Deutschland"; })[0];
    return { c: c, ref: ref, rel: function () { var r = this.f0 / this.f1; return r >= 1 ? "erscheint am Original " + fmt(r, 1) + "-mal so groß wie an der Kopie" : "erscheint an der Kopie " + fmt(1 / r, 1) + "-mal so groß wie am Original"; }, f0: 1 / Math.pow(Math.cos(ref[0] * D2R), 2), f1: 1 / Math.pow(Math.cos(TG.to[0] * D2R), 2), vde: c.area / (de ? de.area : 357000) };
  }
  function drawGroesse() {
    if (TGV.inline) tgDraw(TGV.inline);
    if (TGV.big) tgDraw(TGV.big);
    var F = tgFacts(), c = F.c;
    if ($("tgSelL")) $("tgSelL").innerHTML = '<b>' + esc(c.de) + '</b><span>' + fmt(c.area) + ' km² · Original ×' + fmt(F.f0, 2) + ' · Kopie ×' + fmt(F.f1, 2) + '</span>';
    if ($("tgBigSel")) $("tgBigSel").innerHTML = '<b>' + esc(c.de) + '</b><span>' + fmt(c.area) + ' km² · ' + F.rel() + '</span>';
    if (!$("tgInfo")) return;
    $("tgInfo").innerHTML = '<div class="wd-kv"><div><span>Fläche (aus Umriss berechnet)</span><b>' + fmt(c.area) + ' km²</b></div><div><span>Vergleich Deutschland</span><b>× ' + fmt(F.vde, 1) + '</b></div>' +
      '<div><span>Bezugspunkt original</span><b>' + fmt(F.ref[0], 1) + '° · ×' + fmt(F.f0, 2) + '</b></div><div><span>Bezugspunkt verschoben</span><b>' + fmt(TG.to[0], 1) + '° · ×' + fmt(F.f1, 2) + '</b></div></div>' +
      '<p class="muted small" style="margin:8px 0 0">×-Werte = Flächenvergrößerung der Mercator-Karte am Bezugspunkt (1/cos² φ). Auf der Karte ' + F.rel().replace("erscheint", "erscheint " + esc(c.de) + " damit etwa").replace("an der Kopie", "an der neuen Position") + '. Das Land wird auf der Kugel starr verschoben (Norden bleibt oben); sehr ausgedehnte Länder wie Russland krümmen sich dabei sichtbar, weil ihre Ränder auf der Kugel andere Wege nehmen. Kartenrand bei ±82°.</p>';
  }
  /* Vergrößerte Karte: Vollbild mit Zoom (zwei Finger oder +/−), Schließen über X */
  function openGroesseBig() {
    if (TGV.big) return;
    var ov = document.createElement("div"); ov.className = "wd-mercbig"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "Wahre Größe – vergrößerte Karte");
    ov.innerHTML = '<div class="wd-mercbig-top"><div class="wd-merc-sel" id="tgBigSel" aria-live="polite"></div><button type="button" class="wd-mercbig-x" id="tgBigX" aria-label="Schließen">' + icon("close") + '</button></div>' +
      '<div class="wd-mercbig-map"><canvas id="tgBigCv" role="img" aria-label="Vergrößerte Weltkarte in Mercator-Projektion"></canvas>' +
      '<div class="wd-mercbig-zoom"><button type="button" data-z="1.6" aria-label="Hineinzoomen">' + icon("plus") + '</button><button type="button" data-z="0.625" aria-label="Herauszoomen">' + icon("minus") + '</button></div></div>' +
      '<p class="wd-mercbig-hint">Land antippen = auswählen · Kopie ziehen = verschieben · Meer antippen = Kopie dorthin setzen · zwei Finger = zoomen, ein Finger neben der Kopie = Karte bewegen</p>';
    document.body.appendChild(ov); document.documentElement.classList.add("wd-cam-open");
    var last = document.activeElement;
    TGV.big = tgMap($("tgBigCv"), true);
    ov.querySelectorAll("[data-z]").forEach(function (b) { b.onclick = function () { TGV.big.zoomBy(+b.getAttribute("data-z")); }; });
    function onResize() { drawGroesse(); }
    function key(e) { if (e.key === "Escape") close(); }
    function close() {
      TGV.big = null; window.removeEventListener("resize", onResize); document.removeEventListener("keydown", key);
      if (ov.parentNode) ov.parentNode.removeChild(ov); document.documentElement.classList.remove("wd-cam-open"); drawGroesse();
      if (last && last.focus) try { last.focus(); } catch (x) { }
    }
    $("tgBigX").onclick = close; window.addEventListener("resize", onResize); document.addEventListener("keydown", key);
    requestAnimationFrame(function () { drawGroesse(); try { $("tgBigX").focus(); } catch (x) { } });
  }

  /* ---------- Kosmische Adresse ---------- */
  function adresse() {
    var LJ = 9.4607e12;
    return [
      { n: LOC.name || "Dein Standort", d: "Breite " + fmt(LOC.lat, 3) + "°, Länge " + fmt(LOC.lon, 3) + "°", km: 1, t: "Ausgangspunkt" },
      { n: "Deutschland", d: "Fläche rund 357.600 km², Nord–Süd rund 880 km", km: 880, t: "Licht durchquert das Land in rund 3 Millisekunden." },
      { n: "Europa", d: "Fläche rund 10 Mio. km²", km: 4000, t: "Ein Funksignal braucht quer über Europa gut 13 Millisekunden." },
      { n: "Erde", d: "Durchmesser 12.742 km, Umfang 40.075 km", km: 12742, t: "Licht umrundet die Erde rund 7,5-mal pro Sekunde." },
      { n: "Erde-Mond-System", d: "mittlerer Mondabstand 384.400 km", km: 768800, t: "Licht braucht 1,28 Sekunden zum Mond." },
      { n: "Innere Planeten", d: "Erdbahn: Radius 1 AE = 149,6 Mio. km", km: 2 * 1.496e8, t: "Sonnenlicht ist 8 Minuten 19 Sekunden bis zur Erde unterwegs." },
      { n: "Planetensystem", d: "bis zur Neptunbahn: Radius rund 30 AE = 4,5 Mrd. km", km: 2 * 4.5e9, t: "Licht braucht gut 4 Stunden bis zum Neptun." },
      { n: "Sonnenumgebung", d: "nächster Stern Proxima Centauri: 4,24 Lichtjahre", km: 2 * 4.24 * LJ, t: "Die Raumsonde Voyager 1 bräuchte dorthin über 70.000 Jahre." },
      { n: "Milchstraße", d: "Durchmesser rund 100.000 Lj, 100–400 Mrd. Sterne; Sonne rund 26.000 Lj vom Zentrum im Orion-Arm", km: 1e5 * LJ, t: "Ein Umlauf der Sonne um das Zentrum dauert rund 230 Mio. Jahre." },
      { n: "Lokale Gruppe", d: "über 80 Galaxien, Ausdehnung rund 10 Mio. Lj; Andromeda in 2,5 Mio. Lj", km: 1e7 * LJ, t: "Andromeda nähert sich mit rund 110 km/s." },
      { n: "Virgo-Superhaufen", d: "Ausdehnung rund 110 Mio. Lj, über 100 Galaxiengruppen", km: 1.1e8 * LJ, t: "Sein Zentrum, der Virgo-Haufen, liegt rund 54 Mio. Lj entfernt." },
      { n: "Laniakea-Superhaufen", d: "Ausdehnung rund 520 Mio. Lj, etwa 100.000 Galaxien", km: 5.2e8 * LJ, t: "Definiert 2014 über die Bewegungsrichtungen der Galaxien." },
      { n: "Beobachtbares Universum", d: "Durchmesser rund 93 Mrd. Lj", km: 9.3e10 * LJ, t: "Das älteste sichtbare Licht ist rund 13,8 Mrd. Jahre unterwegs." }
    ];
  }
  function renderAdresse() {
    var el = $("dkAdresse"); if (!el) return;
    var L = adresse();
    el.innerHTML = '<h2 class="wd-head">Kosmische Adresse <small>' + L.length + ' Ebenen</small></h2>' +
      '<p class="muted small" style="margin:0 0 8px">Von deinem Standort bis an den Rand des beobachtbaren Universums – jede Ebene mit Ausdehnung und Größensprung zur vorherigen.</p>' +
      L.map(function (l, i) { var f = i ? l.km / L[i - 1].km : null; return '<div class="sn-row"><span class="dot" style="background:' + (i ? 'var(--accent)' : 'var(--wd-gold)') + '"></span><div class="main"><b>' + esc(l.n) + '</b><span>' + esc(l.d) + '</span></div><div class="r">' + (f ? "×" + (f >= 1e4 ? fmt(f / 1000) + " Tsd." : fmt(f, f < 10 ? 1 : 0)) : "") + '</div></div>'; }).join("") +
      '<div class="btn-row" style="margin-top:10px"><button type="button" class="cta primary slim" id="kaZoom">' + icon("universe") + 'Hinauszoomen</button><button type="button" class="cta slim" id="kaShare">' + icon("share") + 'Teilen</button></div>' +
      '<p class="muted small" style="margin:8px 0 0">„×“ = Faktor der Ausdehnung gegenüber der Ebene darüber. Werte gerundet; Grenzen von Superhaufen sind Definitionssache.</p>';
    $("kaZoom").onclick = function () { zoomAdresse(L); };
    $("kaShare").onclick = function () {
      WDShare.wonderCard({ over: "Kosmische Adresse", title: L[0].n + " → Universum", text: L.slice(0, 1).concat(L.slice(3)).map(function (l) { return l.n; }).join(" › "), more: "Vom eigenen Standort bis zum Rand des beobachtbaren Universums: rund 93 Milliarden Lichtjahre Durchmesser.", foot: "WeitblickWahr" })
        .then(function (b) { return WDShare.share(b, "Kosmische-Adresse.png", "Kosmische Adresse"); });
    };
  }
  function zoomAdresse(L) {
    var ov = document.createElement("div"); ov.className = "wd-kino wd-zoom"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", "Kosmische Adresse");
    ov.innerHTML = '<canvas></canvas><div class="wd-zoom-t" aria-live="polite"></div><div class="wd-kino-ctl"><button type="button" data-k="prev" aria-label="Zurück">' + icon("left") + '</button><button type="button" data-k="next" aria-label="Weiter">' + icon("right") + '</button><button type="button" data-k="x" aria-label="Schließen">' + icon("close") + '</button></div>';
    document.body.appendChild(ov); document.documentElement.classList.add("wd-cam-open");
    var cv = ov.querySelector("canvas"), g = cv.getContext("2d"), lvl = 0, shown = 0, raf = 0;
    function txt() {
      var l = L[lvl], f = lvl ? L[lvl].km / L[lvl - 1].km : null;
      ov.querySelector(".wd-zoom-t").innerHTML = '<div class="wd-over">Ebene ' + (lvl + 1) + ' von ' + L.length + '</div><h2>' + esc(l.n) + '</h2><p>' + esc(l.d) + '</p><p class="w">' + esc(l.t) + (f ? ' Größensprung: ×' + (f >= 1e4 ? fmt(f / 1000) + ' Tsd.' : fmt(f, f < 10 ? 1 : 0)) + '.' : '') + '</p>';
    }
    function draw() {
      if (!ov.parentNode) return;
      shown += (lvl - shown) * 0.12; if (Math.abs(lvl - shown) < 0.001) shown = lvl;
      var w = ov.clientWidth, h = ov.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
      if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
      var cx = w / 2, cy = h * 0.36, R = Math.min(w, h) * 0.3, base = Math.log10(L[Math.max(0, Math.min(L.length - 1, Math.round(shown)))].km);
      var lf = Math.floor(shown), fr = shown - lf, cur = Math.log10(L[lf].km) + (lf + 1 < L.length ? (Math.log10(L[lf + 1].km) - Math.log10(L[lf].km)) * fr : 0);
      for (var i = 0; i < L.length; i++) {
        var r = R * Math.pow(10, (Math.log10(L[i].km) - cur) * 0.32);
        if (r < 1.5 || r > Math.max(w, h) * 2) continue;
        var on = i === lvl;
        g.beginPath(); g.arc(cx, cy, r, 0, 7); g.strokeStyle = on ? "#FFD27A" : "rgba(201,184,255," + (i < lvl ? .55 : .25) + ")"; g.lineWidth = on ? 2.2 : 1; g.stroke();
        if (r > 22 && r < Math.max(w, h)) { g.fillStyle = on ? "#FFD27A" : "rgba(255,255,255,.6)"; g.font = (on ? "700 " : "500 ") + "11px -apple-system, system-ui, sans-serif"; g.textAlign = "center"; g.fillText(L[i].n, cx, cy - r - 5); }
      }
      g.fillStyle = "#FFD27A"; g.beginPath(); g.arc(cx, cy, 3, 0, 7); g.fill();
      raf = requestAnimationFrame(draw);
    }
    function close() { cancelAnimationFrame(raf); if (ov.parentNode) ov.parentNode.removeChild(ov); document.documentElement.classList.remove("wd-cam-open"); document.removeEventListener("keydown", key); }
    function key(e) { if (e.key === "Escape") close(); if (e.key === "ArrowRight") { lvl = Math.min(L.length - 1, lvl + 1); txt(); } if (e.key === "ArrowLeft") { lvl = Math.max(0, lvl - 1); txt(); } }
    document.addEventListener("keydown", key);
    ov.querySelectorAll("[data-k]").forEach(function (b) { b.onclick = function () { var k = b.getAttribute("data-k"); if (k === "x") close(); else { lvl = Math.max(0, Math.min(L.length - 1, lvl + (k === "next" ? 1 : -1))); txt(); } }; });
    txt(); raf = requestAnimationFrame(draw);
  }

  /* =========================================================
     Technik (FINAL-98): Ephemeriden, Großkreis-Parameter, Zeitmaße & Zeitdilatation,
     Methoden-Übersicht
     ========================================================= */
  function hhmm(d) { return d ? d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "–"; }
  function hhmmss(d) { return d ? d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "–"; }
  function degTxt(a, d) { return fmt(a, d == null ? 1 : d) + "°"; }
  function raTxt(ra) { var h = wrap360(ra) / 15, H = Math.floor(h), m = (h - H) * 60, M = Math.floor(m), S = Math.round((m - M) * 60); if (S === 60) { S = 0; M++; } if (M === 60) { M = 0; H = (H + 1) % 24; } return H + "h " + String(M).padStart(2, "0") + "m " + String(S).padStart(2, "0") + "s"; }
  function sunAA(t) { var jd = A.toJD(t), s = A.sun(jd), aa = A.enuToAltAz(A.eqToEnu(s.v, A.lst(jd, LOC.lon), LOC.lat)); return { alt: aa.alt, az: aa.az, s: s }; }
  /* Zeitpunkt, an dem die Sonnenhöhe einen Wert kreuzt (Suche in 5-Minuten-Schritten, dann Bisektion) */
  function sunCross(day, h, rising) {
    var t0 = midnight(day).getTime(), step = 5 * 60000, prev = sunAA(new Date(t0)).alt - h;
    for (var t = t0 + step; t <= t0 + DAY; t += step) {
      var cur = sunAA(new Date(t)).alt - h;
      if (rising ? (prev < 0 && cur >= 0) : (prev >= 0 && cur < 0)) {
        var a = t - step, b = t; for (var i = 0; i < 20; i++) { var m = (a + b) / 2, v = sunAA(new Date(m)).alt - h; if (rising ? v < 0 : v >= 0) a = m; else b = m; }
        return new Date((a + b) / 2);
      }
      prev = cur;
    }
    return null;
  }
  function eqTime(t) { // Zeitgleichung in Minuten (wahre minus mittlere Sonnenzeit)
    var jd = A.toJD(t), T = (jd - 2451545) / 36525, L0 = wrap360(280.46646 + 36000.76983 * T + 0.0003032 * T * T), s = A.sun(jd);
    return 4 * wrap180(L0 - 0.0057183 - s.ra);
  }
  function renderEphem() {
    var el = $("dkEphem"); if (!el || !A) return;
    try {
      var now = new Date(), jd = A.toJD(now), sa = sunAA(now), s = sa.s, refr = A.refraction ? A.refraction(sa.alt) : 0;
      var cul = A.culmination ? A.culmination("sun", A.toJD(midnight(now)), LOC.lat, LOC.lon) : null, culD = cul ? A.fromJD(cul.jd) : null;
      var rise = sunCross(now, -0.8333, true), set = sunCross(now, -0.8333, false);
      var tw = [[-6, "Bürgerliche Dämmerung"], [-12, "Nautische Dämmerung"], [-18, "Astronomische Dämmerung"]].map(function (x) { return [x[1], sunCross(now, x[0], true), sunCross(now, x[0], false)]; });
      var m = A.moon(jd), tc = A.topocentric(m.ra, m.dec, m.dist, A.lst(jd, LOC.lon), LOC.lat, 0), maa = A.enuToAltAz(A.eqToEnu(A.vec(tc.ra, tc.dec), A.lst(jd, LOC.lon), LOC.lat));
      var cosE = s.v[0] * m.v[0] + s.v[1] * m.v[1] + s.v[2] * m.v[2], illum = (1 - cosE) / 2 * 100;
      var mr = A.riseSet("moon", A.toJD(midnight(now)), LOC.lat, LOC.lon, "rise", 1), mset = A.riseSet("moon", A.toJD(midnight(now)), LOC.lat, LOC.lon, "set", 1);
      var lstH = wrap360(A.lst(jd, LOC.lon)), eot = eqTime(now), len = rise && set ? (set - rise) / 60000 : null;
      var mDiam = 2 * Math.asin(1737.4 / m.dist) * R2D * 60, sDiam = 2 * s.radius * 60;
      function r(k, v) { return '<div><span>' + k + '</span><b>' + v + '</b></div>'; }
      el.innerHTML = '<h2 class="wd-head">Ephemeriden <small>' + esc(LOC.name || "Standort") + ' · ' + hhmmss(now) + '</small></h2>' +
        '<p class="muted small" style="margin:0 0 10px">Live berechnet für ' + fmt(LOC.lat, 4) + '° N, ' + fmt(LOC.lon, 4) + '° O. Azimut ab Norden über Osten; Höhen geometrisch, Refraktion separat ausgewiesen.</p>' +
        '<h3 class="wd-sub">Sonne</h3><div class="wd-kv">' +
        r("Azimut", degTxt(sa.az)) + r("Höhe (+ Refraktion)", degTxt(sa.alt, 2) + (refr ? " (+" + fmt(refr * 60, 1) + "′)" : "")) +
        r("Rektaszension", raTxt(s.ra)) + r("Deklination", degTxt(s.dec, 2)) +
        r("Aufgang / Untergang", hhmm(rise) + " / " + hhmm(set)) + r("Tageslänge", len ? hm(len) : "–") +
        r("Wahrer Mittag (Höhe)", culD ? hhmm(culD) + " (" + degTxt(cul.alt, 1) + ")" : "–") + r("Zeitgleichung", (eot >= 0 ? "+" : "−") + fmt(Math.abs(eot), 2) + " min") +
        r("Abstand", fmt(s.dist, 6) + " AE") + r("Scheinbarer Durchmesser", fmt(sDiam, 2) + "′") + '</div>' +
        '<h3 class="wd-sub">Dämmerung (Beginn morgens / Ende abends)</h3><div class="wd-kv">' + tw.map(function (x) { return r(x[0] + " (" + (x[0][0] === "B" ? "−6°" : x[0][0] === "N" ? "−12°" : "−18°") + ")", hhmm(x[1]) + " / " + hhmm(x[2])); }).join("") + r("Lokale Sternzeit", raTxt(lstH)) + '</div>' +
        '<h3 class="wd-sub">Mond</h3><div class="wd-kv">' +
        r("Azimut", degTxt(maa.az)) + r("Höhe (topozentrisch)", degTxt(maa.alt, 2)) +
        r("Entfernung (Erdmitte)", fmt(m.dist) + " km") + r("Scheinbarer Durchmesser", fmt(mDiam, 2) + "′") +
        r("Beleuchtung", fmt(illum, 1) + " %") + r("Aufgang / Untergang", hhmm(mr ? A.fromJD(mr) : null) + " / " + hhmm(mset ? A.fromJD(mset) : null)) +
        r("Ekliptikale Breite", degTxt(m.lat, 2)) + r("Julianisches Datum", fmt(jd, 5)) + '</div>';
    } catch (e) { el.innerHTML = '<h2>Ephemeriden</h2><p class="muted small">Für diesen Ort nicht berechenbar.</p>'; }
  }
  setInterval(function () { if (document.querySelector("#screen-weitblick.active") && !document.hidden) renderEphem(); }, 10000);

  /* Großkreis-Parameter der gewählten Richtung */
  function renderGK() {
    var el = $("dkGK"); if (!el) return;
    var a = heading * D2R, p = LOC.lat * D2R;
    var vmax = Math.acos(Math.min(1, Math.abs(Math.sin(a) * Math.cos(p)))) * R2D; // Scheitelbreite (Clairaut)
    var sv = 0; if (lastPath) { var mx = -99; lastPath.pts.forEach(function (q0, i) { if (q0[0] > mx) { mx = q0[0]; sv = i * 10; } }); } // Entfernung bis zum nördlichsten Punkt (entlang der Linie)
    var ant = [-LOC.lat, wrap180(LOC.lon + 180)], q = dest(LOC.lat, LOC.lon, heading, CIRC / 4), q2 = dest(LOC.lat, LOC.lon, heading, CIRC * 3 / 4);
    var inc = vmax; // Bahnneigung gegen den Äquator = Scheitelbreite
    el.innerHTML = '<h3 class="wd-sub">Großkreis-Parameter</h3><div class="wd-kv">' +
      '<div><span>Anfangskurs</span><b>' + degTxt(wrap360(heading), 1) + '</b></div><div><span>Neigung gegen Äquator</span><b>' + degTxt(inc, 2) + '</b></div>' +
      '<div><span>Nördlichster Punkt</span><b>' + degTxt(vmax, 2) + ' N</b></div><div><span>Abstand zum Scheitel</span><b>' + fmt(sv) + ' km</b></div>' +
      '<div><span>Nach 10.008 km (¼)</span><b>' + fmt(q[0], 2) + '°, ' + fmt(q[1], 2) + '°</b></div><div><span>Nach ' + fmt(CIRC * 3 / 4) + ' km (¾)</span><b>' + fmt(q2[0], 2) + '°, ' + fmt(q2[1], 2) + '°</b></div>' +
      '<div><span>Erdumfang (Kugel R = ' + fmt(RE, 1) + ' km)</span><b>' + fmt(CIRC, 1) + ' km</b></div><div><span>Gegenpunkt deines Orts</span><b>' + fmt(ant[0], 2) + '°, ' + fmt(ant[1], 2) + '°</b></div></div>' +
      '<p class="muted small" style="margin:8px 0 0">Kugelmodell (mittlerer Erdradius). Scheitelbreite nach Clairaut: cos φ<sub>max</sub> = |sin α · cos φ<sub>0</sub>|. Ein Großkreis schneidet den Äquator zweimal und erreicht genau eine nördlichste und eine südlichste Breite.</p>';
  }

  /* Zeitmaße & relativistische Zeitdilatation */
  function renderZeitmasse() {
    var el = $("llMasse"), ps = persons(); if (!el || !ps.length) { if (el) el.hidden = true; return; }
    var p = ps.filter(function (x) { return x.id === activeP; })[0] || ps[0], sec = (Date.now() - birth(p).getTime()) / 1000, d = sec / 86400;
    var rows = [
      ["Sekunden", sec, 0], ["Minuten", sec / 60, 0], ["Stunden", sec / 3600, 0], ["Tage (24 h)", d, 2], ["Wochen", d / 7, 2],
      ["Sterntage (23 h 56 min 4 s)", sec / SID, 1], ["Synodische Monate (29,53 d)", d / SYN, 2], ["Siderische Monate (27,32 d)", d / 27.321661, 2],
      ["Tropische Jahre (365,2422 d)", d / 365.24219, 4], ["Julianische Jahre (365,25 d)", d / 365.25, 4],
      ["Merkurjahre", d / 87.969, 2], ["Venusjahre", d / 224.701, 2], ["Marsjahre", d / 686.98, 3], ["Jupiterjahre", d / 4332.59, 3],
      ["Saturnjahre", d / 10759.22, 4], ["Uranusjahre", d / 30688.5, 4], ["Neptunjahre", d / 60182, 5], ["Galaktische Jahre (≈ 230 Mio. J.)", d / 365.25 / 2.3e8, 9]
    ];
    var c = 299792.458, vo = ORBIT_KM_S, vg = GAL_KM_S;
    var dvo = sec * vo * vo / (2 * c * c), dvg = sec * vg * vg / (2 * c * c), dgr = sec * 6.96e-10; // GM/(R c²) für die Erdoberfläche
    function fs(x) { return x >= 1 ? fmt(x, 2) + " s" : x >= 1e-3 ? fmt(x * 1000, 2) + " ms" : fmt(x * 1e6, 2) + " µs"; }
    el.hidden = false;
    el.innerHTML = '<h2 class="wd-head">Alter in Zeitmaßen <small>' + esc(p.name || "Ich") + '</small></h2>' +
      rows.map(function (r) { return '<div class="sn-row"><div class="main"><b>' + r[0] + '</b></div><div class="r wd-num">' + fmt(r[1], r[2]) + '</div></div>'; }).join("") +
      '<h3 class="wd-sub">Relativistische Zeitdilatation (Abschätzung)</h3><div class="wd-kv">' +
      '<div><span>Bahnbewegung der Erde (29,78 km/s)</span><b>− ' + fs(dvo) + '</b></div><div><span>Bewegung um das galaktische Zentrum (230 km/s)</span><b>− ' + fs(dvg) + '</b></div>' +
      '<div><span>Schwerefeld der Erde (Oberfläche)</span><b>− ' + fs(dgr) + '</b></div><div><span>Faktor v²/2c² (Erdbahn)</span><b>' + (vo * vo / (2 * c * c)).toExponential(2).replace(".", ",") + '</b></div></div>' +
      '<p class="muted small" style="margin:8px 0 0">So viel weniger Zeit ist für dich vergangen als für eine gedachte Uhr, die relativ zur Sonne bzw. zum galaktischen Zentrum ruht oder sich weit weg von der Erde befindet. Näherung erster Ordnung (Δt ≈ t·v²/2c² bzw. t·GM/Rc²); Effekte überlagern sich nicht einfach additiv, die Größenordnung stimmt.</p>';
  }

  /* Methoden & Genauigkeit */
  function openMethoden() {
    var M = [
      ["Tageswunder", "730 eigene Karten, Reihenfolge ab 01.01.2026; persönlich festgelegte Tageskarte, bekannte Karten werden übersprungen (Speicher: thaumorawahr_tage, thaumorawahr_entdeckt)."],
      ["Sonne, Mond, Planeten", "Algorithmen nach J. Meeus (Astronomical Algorithms): Sonnenposition mit Genauigkeit ~0,01°, Mond nach verkürzter ELP-Reihe (~0,1°, Entfernung ~10 km), Planeten über Keplerbahnen (JPL-Näherungselemente, Bogenminuten). Auf- und Untergänge: Suche in 10-Minuten-Schritten mit Bisektion, Standardrefraktion −0,8333° (Sonne)."],
      ["Dämmerung", "Sonnenhöhe −6°, −12°, −18°; Suche in 5-Minuten-Schritten, Bisektion auf Sekunden. Polarnacht/-tag: kein Wert."],
      ["Zeitgleichung", "E = 4 min · (L₀ − 0,0057183° − α), L₀ mittlere Länge der Sonne, α Rektaszension. Genauigkeit ~±10 s."],
      ["Meilensteine", "Exakt aus dem Geburtsdatum (12:00 Uhr Ortszeit angenommen); Vollmonde über Phasensuche der Mondlänge; Herzschläge/Atemzüge mit Mittelwerten 75/min bzw. 16/min."],
      ["Großkreis", "Kugelmodell R = 6.371,0088 km; Zielpunkte nach der direkten geodätischen Formel auf der Kugel in 10-km-Schritten; Länderzuordnung per Punkt-in-Polygon (Natural Earth, vereinfacht). Abweichung zum Ellipsoid bis ~0,5 %."],
      ["Kamera-Modus", "Peilung über Großkreis-Anfangskurs; Blickrichtung aus Geräteausrichtung (Kompasskurs bzw. α/β/γ nach dem Beispiel der W3C-Spezifikation), zeitbasiert geglättet, Ausreißer über 100° verworfen. Bildwinkel als 58° horizontal angenommen – typische Abweichung einige Grad."],
      ["Wahre Größe", "Verschiebung auf der Kugel in zwei Drehungen (um die Erdachse, dann entlang des Meridians), anschließend Mercator-Projektion y = ln tan(π/4 + φ/2). Fläche aus den Natural-Earth-Umrissen. Flächenverzerrung 1/cos² φ."],
      ["Zeitreisen / GPS", "Gezählt werden nur Fixes mit Genauigkeit ≤ 35 m, Mindestabstand 8 m und Geschwindigkeit ≤ 4,5 m/s (≈ 16 km/h); Abstand nach Haversine. Es wird keine Route gespeichert, nur Summen je Etappe."],
      ["Zeitdilatation", "Näherung erster Ordnung: Δt ≈ t·v²/(2c²) (Bewegung) bzw. t·GM/(R c²) (Gravitation, Erdoberfläche 6,96·10⁻¹⁰)."],
      ["Daten", "Alles wird auf dem Gerät berechnet; keine Verbindung zu fremden Servern (strenge Sicherheitsrichtlinie: nur eigene Dateien)."]
    ];
    sheet('<h2>Methoden &amp; Genauigkeit</h2><p class="muted small" style="margin:0 0 6px">Wie ThaumoraWahr rechnet und wie genau die Werte sind.</p>' + M.map(function (x) { return '<h3 class="wd-sub">' + x[0] + '</h3><p class="small" style="margin:0;line-height:1.55">' + x[1] + '</p>'; }).join(""));
  }

  /* ---------------- KilometerWahr: Jubiläumskalender & Urkunden ---------------- */
  function calList(from, to) {
    var all = [];
    persons().forEach(function (pp) {
      all = all.concat(milestones(pp, from, to));
    });
    return all.sort(function (a, b) { return a.t - b.t; });
  }
  function renderCal() {
    var el = $("llCal"), now = midnight(new Date()).getTime(), list = calList(now, now + 365 * DAY);
    if (!list.length) { el.hidden = true; return; }
    el.hidden = false;
    var html = '<h2 class="wd-head">Jubiläumskalender <small>nächste 12 Monate</small></h2>', lastM = -1, shown = 0;
    list.slice(0, 24).forEach(function (m) {
      var d = new Date(m.t), mk = d.getFullYear() * 12 + d.getMonth();
      if (mk !== lastM) { html += '<div class="wd-month">' + MO[d.getMonth()] + ' ' + d.getFullYear() + '</div>'; lastM = mk; }
      html += '<div class="sn-row' + (m.big ? ' on' : '') + '"><span class="dot" style="background:' + (m.big ? 'var(--wd-gold)' : 'var(--accent)') + '"></span><div class="main"><b>' + esc(m.title) + '</b><span>' + WD[d.getDay()] + ', ' + d.getDate() + '. ' + MO[d.getMonth()] + '</span></div></div>';
      shown++;
    });
    html += '<button type="button" class="cta primary" id="llIcs" style="margin-top:12px">' + icon("calendar") + 'In meinen Kalender übernehmen</button><p class="muted small" style="margin:8px 0 0">Erstellt eine Kalenderdatei mit den Meilensteinen der nächsten drei Jahre. Dein Kalender fragt, ob er sie übernehmen soll.</p>';
    el.innerHTML = html;
    $("llIcs").onclick = function () {
      var ev = calList(now, now + 3 * 365 * DAY).map(function (m, i) { return { date: m.t, title: m.title, text: m.sub + " – berechnet mit ThaumoraWahr", uid: "wd-" + m.p.id + "-" + m.t + "-" + i }; });
      WDShare.ics(ev, "Meilensteine.ics");
    };
  }
  function certMilestone(p, m) {
    var nm = p.name && p.name !== "Ich" ? p.name : "";
    WDShare.certificate({ kind: "KilometerWahr", name: nm, verb: nm ? "hat erreicht:" : "", title: m.title, text: String(m.sub || "").replace(" ist dann ", " ist ").replace(" bist dann ", " bist ").replace("sind dann", "sind"), date: "Erreicht am " + dShort(new Date(m.t)) })
      .then(function (b) { return WDShare.share(b, "Urkunde-Meilenstein.png", m.title); }).then(function (ok) { if (ok) bump("shared"); });
  }

  /* ---------------- WeitblickWahr: Kamera-Modus ---------------- */
  $("dkCam").onclick = function () {
    if (!window.WDCam) return;
    WDCam.start({ loc: LOC, ziele: D.ZIELE, onOpen: function () { bump("cam"); } });
  };

  /* ---------------- Start ---------------- */
  var onb = window.wzOnboarding ? wzOnboarding({
    key: "thaumorawahr_onboarded",
    slides: [
      { icon: "tages", title: "Willkommen bei ThaumoraWahr", text: "Jeden Tag ein Grund zu staunen – über dein Leben, deine Zeit und deinen Platz auf der Welt. Vier Bereiche, jeden Tag etwas Neues." },
      { icon: "tages", title: "TagesWahr", text: "Jeden Morgen eine neue Wunderkarte – zwei Jahre ohne Wiederholung – und ein frisch berechnetes Rechenwunder. Karten, die du schon kennst, werden übersprungen." },
      { icon: "share", title: "Teilen", text: "Jedes Tageswunder und jedes Rechenwunder lässt sich als gestaltete Bildkarte teilen. Bis zu eine Woche kannst du zurückblättern." },
      { icon: "kilometer", title: "KilometerWahr", text: "Aus deinem Geburtsdatum werden Meilensteine, die sonst niemand bemerkt – dazu Jubiläumskalender, Lebenszeit in Wochen, der Himmel am Tag deiner Geburt und eine Zeitkapsel an dein zukünftiges Ich." },
      { icon: "weitblick", title: "WeitblickWahr", text: "Folge einer Linie geradeaus um die Erde, sieh Tag und Nacht live, prüfe die wahre Größe von Ländern, zoome von deinem Standort bis an den Rand des Universums – und halte im Kamera-Modus das Handy hoch, um zu sehen, wo New York, der Nordpol oder der Mond liegen." },
      { icon: "zeit", title: "ZeitWahr", text: "Drei Zeitreisen zu Fuß: die Erdgeschichte, das Universum seit dem Urknall und die Geschichte der Menschheit – Schritt für Schritt auf deinen Spaziergängen." },
      { icon: "lock", title: "Alles bleibt bei dir", text: "Alles wird auf dem Gerät berechnet. Geburtsdaten und Fortschritt bleiben nur auf diesem Gerät; die Kamera wird nur angezeigt, nie aufgenommen. Es wird nichts gesendet." }
    ]
  }) : null;
  if ($("showOnboardingBtn")) $("showOnboardingBtn").addEventListener("click", function () { if (onb) onb.show(); });
  if ($("showMethodBtn")) $("showMethodBtn").addEventListener("click", openMethoden);
  var TABS = ["tages", "kilometer", "weitblick", "zeit"];
  var h0 = (location.hash || "").slice(1);
  var startTab = TABS.indexOf(h0) >= 0 ? h0 : load("thaumorawahr_tab", "tages");
  showTab(TABS.indexOf(startTab) >= 0 ? startTab : "tages");
  if (startTab !== "tages") renderTages();
  checkBadges();
  // Startbildschirm ausblenden
  (function () {
    var sp = $("wdSplash"); if (!sp) return;
    var shown = false; try { shown = sessionStorage.getItem("thaumorawahr_splash") === "1"; sessionStorage.setItem("thaumorawahr_splash", "1"); } catch (e) { }
    if (shown) { sp.parentNode.removeChild(sp); return; }
    var gone = false;
    function hide() { if (gone) return; gone = true; sp.classList.add("go"); setTimeout(function () { if (sp.parentNode) sp.parentNode.removeChild(sp); }, 500); }
    sp.addEventListener("pointerdown", hide);
    setTimeout(hide, 3000);
  })();
  // Tageswechsel: neue Karte, wenn die App über Mitternacht offen ist
  var lastDay = new Date().getDate();
  setInterval(function () { var d = new Date().getDate(); if (d !== lastDay) { lastDay = d; offset = 0; renderTages(); } }, 60000);
})();
