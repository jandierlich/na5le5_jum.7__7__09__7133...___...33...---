/* ============================================================
   WunderWahr – jeden Tag ein Grund zu staunen
   Bereiche: TagesWahr (Tageswunder, Rechenwunder, Quiz, Sammelalbum, Abzeichen, Wunderjahr),
   KilometerWahr (Meilensteine, Lebensuhr, Jubiläumskalender, Urkunden),
   WeitblickWahr (geradeaus um die Welt, Tag und Nacht, Kamera-Modus),
   ZeitWahr (drei Zeitreisen zu Fuß, Zeitmitte, Gleichzeitigkeiten).
   Alles wird auf dem Gerät berechnet; es wird nichts gesendet.
   Speicher (Präfix wunderwahr_): Personen/Geburtsdaten, entdeckte und gemerkte Karten, Tageskarten,
   Serie, Quiz-Antworten, Abzeichen, Fortschritt der Zeitreisen, Einstellungen.
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
  function stats() { return load("wunderwahr_stats", { quizOk: 0, quizAll: 0, shared: 0, cam: 0 }); }
  function bump(k, n) { var s = stats(); s[k] = (s[k] || 0) + (n || 1); save("wunderwahr_stats", s); checkBadges(); }

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
    save("wunderwahr_tab", id);
    if (id === "weitblick") renderWeitblick();
    if (id === "kilometer") renderKilometer();
    if (id === "zeit") renderZeit();
    if (id === "tages") renderTages();
  }
  if ($("wdSplashD")) {
    try { if (sessionStorage.getItem("wunderwahr_splash") !== "1") splashUntil = Date.now() + 1700; } catch (e) { }
    $("wdSplashD").textContent = dLong(new Date());
    try { // kleine Vorschau: Thema des heutigen Wunders, Serie, Sternstunde – ohne den Inhalt zu verraten
      var spW = D.wonderFor(new Date()), spE = load("wunderwahr_entdeckt", {}), spS = load("wunderwahr_serie", {}), spT = [];
      spT.push('<i>' + icon("tages") + 'Heute: ' + esc(spW.k) + '</i>');
      var spN = spS.last === ymd(new Date()) ? spS.n : spS.last === ymd(addDays(new Date(), -1)) ? (spS.n || 0) + 1 : 1;
      if (spN >= 2) spT.push('<i>' + icon("flame") + spN + ' Tage in Folge</i>');
      if ((D.SELTEN || []).indexOf(spW.id) >= 0 && !spE[spW.id]) spT.push('<i class="gold">' + icon("starfill") + 'Heute wartet etwas Seltenes</i>');
      $("wdSplashT").innerHTML = spT.join("");
    } catch (e) { }
  }
  tabs.forEach(function (t) { t.addEventListener("click", function () { showTab(t.getAttribute("data-tab")); }); });

  /* =========================================================
     1. TagesWahr – Tageswunder, Rechenwunder, Quiz, Album, Abzeichen
     ========================================================= */
  var offset = 0; // 0 = heute, -1 = gestern …
  var SELTEN = {}; (D.SELTEN || []).forEach(function (id) { SELTEN[id] = 1; });
  var KATS = []; D.WUNDER.forEach(function (w) { if (KATS.indexOf(w.k) < 0) KATS.push(w.k); });
  function wonderFor(date) { return D.wonderFor(date); }
  function sammlung() { return load("wunderwahr_sammlung", []); }
  function entdeckt() { return load("wunderwahr_entdeckt", {}); }
  function discover(id, date) {
    var e = entdeckt(); if (e[id]) return false;
    e[id] = ymd(date || new Date()); save("wunderwahr_entdeckt", e); return true;
  }
  (function migrate() { // bereits gemerkte Karten zählen als entdeckt
    var e = entdeckt(), ch = false;
    sammlung().forEach(function (id) { if (!e[id]) { e[id] = ymd(new Date()); ch = true; } });
    var t = load("wunderwahr_tage", {}); Object.keys(t).forEach(function (k) { if (!e[t[k]]) { e[t[k]] = k; ch = true; } });
    if (ch) save("wunderwahr_entdeckt", e);
  })();

  /* Serie: an wie vielen Tagen hintereinander TagesWahr geöffnet wurde */
  function serie() {
    var s = load("wunderwahr_serie", { last: null, n: 0, best: 0 }), today = ymd(new Date());
    if (s.last !== today) {
      s.n = s.last === ymd(addDays(new Date(), -1)) ? s.n + 1 : 1;
      s.last = today; s.best = Math.max(s.best || 0, s.n); save("wunderwahr_serie", s);
    }
    return s;
  }

  function renderCard(day) {
    var w = wonderFor(day), saved = sammlung().indexOf(w.id) >= 0, rare = !!SELTEN[w.id];
    var neu = discover(w.id, day);
    if (neu && rare && offset === 0) setTimeout(function () { toast("Eine Sternstunde! Diese Karte ist besonders selten."); buzz(30); }, 600);
    var card = $("fbCard");
    card.classList.toggle("gold", rare);
    card.setAttribute("aria-label", "Tageswunder: " + w.t);
    card.innerHTML =
      (rare ? '<div class="wd-rare">' + icon("starfill") + 'Sternstunde</div>' : '') +
      '<div class="wd-over">' + esc(w.k) + '</div>' +
      '<h2 class="wd-card-t">' + esc(w.t) + '</h2>' +
      '<p class="wd-card-x">' + esc(w.x) + '</p>' +
      '<details class="wd-more"><summary>Wie kann das sein?</summary><p>' + esc(w.w) + '</p></details>' +
      '<div class="wd-card-acts">' +
      '<button type="button" class="wd-glass wd-icon" id="fbPrev" aria-label="Vorheriger Tag">' + icon("left") + '</button>' +
      '<button type="button" class="wd-glass wd-keep' + (saved ? ' on' : '') + '" id="fbKeep" aria-pressed="' + saved + '">' + icon(saved ? 'starfill' : 'star') + (saved ? 'Gemerkt' : 'Merken') + '</button>' +
      '<button type="button" class="wd-glass wd-icon" id="fbShare" aria-label="Als Bild teilen">' + icon("share") + '</button>' +
      '<button type="button" class="wd-glass wd-icon" id="fbNext" aria-label="Nächster Tag"' + (offset >= 0 ? ' disabled' : '') + '>' + icon("right") + '</button>' +
      '</div>';
    $("fbPrev").onclick = function () { go(-1); };
    $("fbNext").onclick = function () { go(1); };
    $("fbKeep").onclick = function () {
      var s = sammlung(), i = s.indexOf(w.id);
      if (i >= 0) s.splice(i, 1); else { s.unshift(w.id); buzz(); }
      save("wunderwahr_sammlung", s); renderCard(day); renderAlbum(); checkBadges();
    };
    $("fbShare").onclick = function () { shareWonder(w, day); };
    return w;
  }
  function shareWonder(w, day) {
    if (!window.WDShare) return;
    WDShare.wonderCard({ over: w.k, title: w.t, text: w.x, more: w.w, gold: !!SELTEN[w.id], foot: day ? "Tageswunder vom " + dShort(day) : "Aus meinem Wunderalbum" })
      .then(function (b) { return WDShare.share(b, "Wunder-" + w.id + ".png", w.t); })
      .then(function (ok) { if (ok) bump("shared"); });
  }
  function go(dir) {
    var n = offset + dir;
    if (n > 0) return;
    if (n < -6) { toast("Ältere Karten findest du in deinem Album."); return; }
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
    var s = serie();
    $("fbDate").textContent = offset === 0 ? "Heute · " + dLong(day) : dLong(day);
    $("fbStreak").hidden = s.n < 2;
    $("fbStreak").innerHTML = icon("flame") + s.n + " Tage in Folge";
    $("fbStreak").setAttribute("aria-label", "Serie: " + s.n + " Tage in Folge");
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
    renderQuiz();
    renderAlbum();
    renderBadges();
    renderYearCard();
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
    for (var k = 0; k < CALC.length && !out; k++) { try { out = CALC[((n + k) % CALC.length + CALC.length) % CALC.length](day); } catch (e) { out = null; } }
    if (!out) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = '<div class="wd-over">' + esc(out.over) + '</div><span class="wd-calc-n">' + esc(out.n) + '</span><h2 class="wd-card-t" style="font-size:19px">' + esc(out.t) + '</h2><p class="wd-card-x" style="font-size:14.5px">' + esc(out.x) + '</p>' +
      '<div class="wd-card-acts"><button type="button" class="wd-glass" id="fbCalcShare">' + icon("share") + 'Teilen</button></div>';
    $("fbCalcShare").onclick = function () {
      WDShare.wonderCard({ over: out.over, title: out.n + " – " + out.t, text: out.x, foot: "Berechnet am " + dShort(day) })
        .then(function (b) { return WDShare.share(b, "Rechenwunder.png", out.t); }).then(function (ok) { if (ok) bump("shared"); });
    };
  }

  /* ---------- Quiz zum Wunder von gestern ---------- */
  function quizFor(w, seed) {
    var r = seeded(seed), m = w.x.match(/(\d{1,3}(?:\.\d{3})+|\d+(?:,\d+)?)/);
    function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    if (m) {
      var tok = m[1], dec = (tok.split(",")[1] || "").length, v = parseFloat(tok.replace(/\./g, "").replace(",", ".")), grp = tok.indexOf(".") >= 0;
      var year = !grp && !dec && v >= 1000 && v <= new Date().getFullYear() && /^\d{4}$/.test(tok);
      var f = function (x) { return year ? String(Math.round(x)) : x.toLocaleString("de-DE", { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: grp || x >= 10000 }); };
      var opts = [], cand = year ? [-120, -60, -35, 40, 75, 110] : [2, 3, 5, 10, .5, .2, .1, 1 / 3, 4, 1.5];
      cand = shuffle(cand.slice());
      for (var i = 0; i < cand.length && opts.length < 2; i++) {
        var x = year ? v + cand[i] : v * cand[i];
        if (year && x > new Date().getFullYear()) continue;
        if (!year) { var mag = Math.pow(10, Math.max(0, Math.floor(Math.log10(Math.abs(x) || 1)) - 1)); x = dec ? Math.round(x * Math.pow(10, dec)) / Math.pow(10, dec) : Math.round(x / mag) * mag; }
        var s = f(x); if (x > 0 && s !== f(v) && opts.indexOf(s) < 0) opts.push(s);
      }
      if (opts.length === 2) {
        var q = esc(w.x.slice(0, m.index)) + '<mark>?</mark>' + esc(w.x.slice(m.index + tok.length));
        return { q: q, opts: shuffle([tok].concat(opts)), ok: tok, typ: "zahl" };
      }
    }
    var e = entdeckt(), pool = D.WUNDER.filter(function (x) { return x.id !== w.id && !e[x.id]; });
    var o = [w.t]; while (o.length < 3 && pool.length) { var k = Math.floor(r() * pool.length); o.push(pool.splice(k, 1)[0].t); }
    return { q: "Welches dieser Wunder hast du gestern entdeckt?", opts: shuffle(o), ok: w.t, typ: "titel" };
  }
  function renderQuiz() {
    var el = $("fbQuiz"), today = new Date(), yd = addDays(today, -1), tage = load("wunderwahr_tage", {}), e = entdeckt();
    var id = tage[ymd(yd)], w = id && D.byId(id);
    if (!w || !e[w.id] || offset !== 0) { el.hidden = true; return; }
    var qa = load("wunderwahr_quiz", {}), done = qa[ymd(today)];
    var q = quizFor(w, daysBetween(new Date(2026, 0, 1), today) * 7 + 3);
    el.hidden = false;
    el.innerHTML = '<h2 class="wd-head">Quiz zu gestern <small>' + icon("quiz") + '</small></h2><p class="wd-quiz-q">' + q.q + '</p><div class="wd-quiz-o" role="group" aria-label="Antworten">' +
      q.opts.map(function (o) { return '<button type="button" data-o="' + esc(o) + '"' + (done ? ' disabled' : '') + (done && o === q.ok ? ' class="ok"' : done && o === done.a && o !== q.ok ? ' class="no"' : '') + '>' + (done && o === q.ok ? icon("check") : '') + esc(o) + '</button>'; }).join("") +
      '</div><p class="wd-quiz-r" id="fbQuizR" aria-live="polite">' + (done ? (done.ok ? "Richtig! Morgen gibt es die nächste Frage." : "Knapp daneben – die richtige Antwort ist markiert.") + ' <span class="muted">(' + fmt(stats().quizOk) + ' von ' + fmt(stats().quizAll) + ' richtig)</span>' : '') + '</p>';
    if (done) return;
    el.querySelectorAll("[data-o]").forEach(function (b) {
      b.onclick = function () {
        var a = b.getAttribute("data-o"), ok = a === q.ok;
        qa[ymd(today)] = { a: a, ok: ok }; var ks = Object.keys(qa).sort(); if (ks.length > 800) delete qa[ks[0]];
        save("wunderwahr_quiz", qa);
        var s = stats(); s.quizAll = (s.quizAll || 0) + 1; if (ok) s.quizOk = (s.quizOk || 0) + 1; save("wunderwahr_stats", s);
        buzz(ok ? 15 : [10, 60, 10]); renderQuiz(); checkBadges(); renderBadges();
      };
    });
  }

  /* ---------- Sammelalbum ---------- */
  var albumKat = null, albumFilter = "alle", albumMax = 20;
  function renderAlbum() {
    var e = entdeckt(), sam = sammlung(), ids = Object.keys(e), total = D.WUNDER.length;
    var rareN = ids.filter(function (id) { return SELTEN[id]; }).length;
    var html = '<h2 class="wd-head">Dein Wunderalbum <small>' + fmt(ids.length) + ' von ' + fmt(total) + '</small></h2>' +
      '<div class="wd-bigbar" role="progressbar" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + ids.length + '" aria-label="Entdeckte Wunder"><i style="width:' + (ids.length / total * 100).toFixed(1) + '%"></i></div>' +
      '<div class="wd-cats">' + KATS.map(function (k) {
        var all = D.WUNDER.filter(function (w) { return w.k === k; }), got = all.filter(function (w) { return e[w.id]; }).length;
        return '<button type="button" class="wd-cat' + (albumKat === k ? ' on' : '') + '" data-k="' + esc(k) + '" aria-pressed="' + (albumKat === k) + '" aria-label="' + esc(k) + ': ' + got + ' von ' + all.length + '"><span class="wd-ring" style="--p:' + Math.round(got / all.length * 100) + '"><b>' + got + '</b></span><span>' + esc(k) + '</span></button>';
      }).join("") + '</div>' +
      '<div class="wd-filter" role="group" aria-label="Filter">' + [["alle", "Alle"], ["merk", "Gemerkt (" + sam.length + ")"], ["selten", "Sternstunden (" + rareN + "/" + (D.SELTEN || []).length + ")"]].map(function (f) {
        return '<button type="button" class="chip' + (albumFilter === f[0] ? ' active' : '') + '" data-f="' + f[0] + '">' + f[1] + '</button>';
      }).join("") + '</div>';
    var list = ids.map(function (id) { return D.byId(id); }).filter(Boolean)
      .filter(function (w) { return (!albumKat || w.k === albumKat) && (albumFilter !== "merk" || sam.indexOf(w.id) >= 0) && (albumFilter !== "selten" || SELTEN[w.id]); })
      .sort(function (a, b) { return (e[b.id] || "").localeCompare(e[a.id] || ""); });
    html += '<div class="wd-albumlist">' + (list.length ? list.slice(0, albumMax).map(function (x) {
      return '<details class="wd-sam' + (SELTEN[x.id] ? ' gold' : '') + '"><summary><span class="wd-dot"' + (sam.indexOf(x.id) >= 0 ? '' : ' style="background:var(--border)"') + '></span><b>' + esc(x.t) + '</b><small>' + esc(x.k) + '</small></summary><p>' + esc(x.x) + ' ' + esc(x.w) + '</p>' +
        '<div class="wd-sam-a"><button type="button" class="wd-mini" data-share="' + x.id + '">' + icon("share") + 'Teilen</button><button type="button" class="wd-mini" data-keep="' + x.id + '">' + icon(sam.indexOf(x.id) >= 0 ? "starfill" : "star") + (sam.indexOf(x.id) >= 0 ? "Gemerkt" : "Merken") + '</button></div></details>';
    }).join("") + (list.length > albumMax ? '<button type="button" class="cta slim" id="fbMore" style="margin-top:10px">Weitere ' + fmt(Math.min(20, list.length - albumMax)) + ' zeigen</button>' : '')
      : '<p class="muted small" style="margin:6px 0 0">' + (albumFilter === "merk" ? "Noch nichts gemerkt. Tippe bei einer Karte auf „Merken“." : albumFilter === "selten" ? "Noch keine Sternstunde – sie tauchen zufällig zwischen den anderen Karten auf." : "Hier sammeln sich alle Wunder, die du entdeckst.") + '</p>') + '</div>';
    var el = $("fbAlbum"); el.innerHTML = html;
    el.querySelectorAll("[data-k]").forEach(function (b) { b.onclick = function () { var k = b.getAttribute("data-k"); albumKat = albumKat === k ? null : k; albumMax = 20; renderAlbum(); }; });
    el.querySelectorAll("[data-f]").forEach(function (b) { b.onclick = function () { albumFilter = b.getAttribute("data-f"); albumMax = 20; renderAlbum(); }; });
    el.querySelectorAll("[data-share]").forEach(function (b) { b.onclick = function () { shareWonder(D.byId(b.getAttribute("data-share")), null); }; });
    el.querySelectorAll("[data-keep]").forEach(function (b) {
      b.onclick = function () { var id = b.getAttribute("data-keep"), s = sammlung(), i = s.indexOf(id); if (i >= 0) s.splice(i, 1); else s.unshift(id); save("wunderwahr_sammlung", s); buzz(); renderAlbum(); renderCard(new Date(Date.now() + offset * DAY)); };
    });
    if ($("fbMore")) $("fbMore").onclick = function () { albumMax += 20; renderAlbum(); };
  }

  /* ---------- Abzeichen ---------- */
  function reisen() { return load("wunderwahr_reisen", null) || migrateReisen(); }
  function badgeState() {
    var e = entdeckt(), ids = Object.keys(e), s = stats(), se = load("wunderwahr_serie", { best: 0 }), R = reisen();
    var kats = {}; ids.forEach(function (id) { var w = D.byId(id); if (w) kats[w.k] = 1; });
    var walked = ["erde", "universum", "mensch"].reduce(function (a, k) { return a + ((R[k] && R[k].m) || 0); }, 0) / 1000;
    var fertig = Object.keys(R.fertig || {}).length;
    return { n: ids.length, best: se.best || 0, quiz: s.quizOk || 0, rare: ids.filter(function (id) { return SELTEN[id]; }).length, kats: Object.keys(kats).length, shared: s.shared || 0, persons: persons().length, cam: s.cam || 0, fertig: fertig, km: walked };
  }
  var BADGES = [
    ["neugier", "Neugierig", "10 Wunder entdecken", "tages", function (b) { return [b.n, 10]; }],
    ["staunend", "Staunend", "50 Wunder entdecken", "tages", function (b) { return [b.n, 50]; }],
    ["kenner", "Wunderkenner", "100 Wunder entdecken", "tages", function (b) { return [b.n, 100]; }],
    ["wunderjahr", "Ein Wunderjahr", "365 Wunder entdecken", "medal", function (b) { return [b.n, 365]; }],
    ["allesgesehen", "Alles gesehen", "Alle 730 Wunder entdecken", "eye", function (b) { return [b.n, 730]; }],
    ["woche", "Eine Woche dabei", "7 Tage in Folge vorbeischauen", "flame", function (b) { return [b.best, 7]; }],
    ["monat", "Ein Monat Staunen", "30 Tage in Folge vorbeischauen", "flame", function (b) { return [b.best, 30]; }],
    ["hundert", "Hundert Tage", "100 Tage in Folge vorbeischauen", "flame", function (b) { return [b.best, 100]; }],
    ["gedaechtnis", "Gutes Gedächtnis", "10 Quizfragen richtig beantworten", "quiz", function (b) { return [b.quiz, 10]; }],
    ["wundergedaechtnis", "Wundergedächtnis", "50 Quizfragen richtig beantworten", "quiz", function (b) { return [b.quiz, 50]; }],
    ["sternstunde", "Sternstunde", "Eine seltene Sternstunden-Karte finden", "starfill", function (b) { return [b.rare, 1]; }],
    ["sternensammler", "Sternensammler", "10 Sternstunden-Karten finden", "starfill", function (b) { return [b.rare, 10]; }],
    ["allrounder", "Allrounder", "In allen " + KATS.length + " Themen mindestens ein Wunder entdecken", "globe", function (b) { return [b.kats, KATS.length]; }],
    ["erzaehlt", "Weitererzählt", "Ein Wunder oder eine Urkunde teilen", "share", function (b) { return [b.shared, 1]; }],
    ["vermesser", "Lebensvermesser", "In KilometerWahr ein Geburtsdatum eintragen", "kilometer", function (b) { return [b.persons, 1]; }],
    ["weitblick", "Weitblick", "Den Kamera-Modus in WeitblickWahr ausprobieren", "camera", function (b) { return [b.cam, 1]; }],
    ["zehnkm", "Zeitwanderer", "10 km auf Zeitreisen laufen", "walk", function (b) { return [b.km, 10]; }],
    ["zeitreisend", "Zeitreisend", "Eine Zeitreise bis in die Gegenwart laufen", "zeit", function (b) { return [b.fertig, 1]; }],
    ["allezeiten", "Durch alle Zeiten", "Alle drei Zeitreisen abschließen", "universe", function (b) { return [b.fertig, 3]; }]
  ];
  function checkBadges() {
    var got = load("wunderwahr_abzeichen", {}), b = badgeState(), neu = [];
    BADGES.forEach(function (x) { var p = x[4](b); if (p[0] >= p[1] && !got[x[0]]) { got[x[0]] = ymd(new Date()); neu.push(x[1]); } });
    if (neu.length) { save("wunderwahr_abzeichen", got); setTimeout(function () { toast("Neues Abzeichen: " + neu.join(", "), 2600); buzz([20, 40, 20]); }, 300); if ($("fbBadges")) renderBadges(); }
  }
  function renderBadges() {
    var got = load("wunderwahr_abzeichen", {}), n = Object.keys(got).length;
    $("fbBadges").innerHTML = '<h2 class="wd-head">Abzeichen <small>' + n + ' von ' + BADGES.length + '</small></h2><div class="wd-badges">' + BADGES.map(function (x) {
      var on = !!got[x[0]];
      return '<button type="button" class="wd-badge' + (on ? ' got' : '') + '" data-b="' + x[0] + '" aria-label="' + esc(x[1]) + (on ? ' – erreicht' : ' – noch offen') + '"><span class="wd-medal">' + icon(x[3]) + '</span><span>' + esc(x[1]) + '</span></button>';
    }).join("") + '</div>';
    $("fbBadges").querySelectorAll("[data-b]").forEach(function (el) {
      el.onclick = function () {
        var x = BADGES.filter(function (y) { return y[0] === el.getAttribute("data-b"); })[0], p = x[4](badgeState()), on = got[x[0]];
        sheet('<h2>' + esc(x[1]) + '</h2><p class="muted" style="margin:0 0 12px">' + esc(x[2]) + '</p>' +
          (on ? '<p><b>Erreicht am ' + dShort(new Date(on)) + '.</b></p>' : '<div class="wd-bigbar"><i style="width:' + Math.min(100, p[0] / p[1] * 100).toFixed(1) + '%"></i></div><p class="small">' + fmt(Math.min(p[0], p[1]), p[0] % 1 ? 1 : 0) + ' von ' + fmt(p[1]) + '</p>'));
      };
    });
  }

  /* ---------- Dein Wunderjahr ---------- */
  function yearData(y) {
    var e = entdeckt(), ids = Object.keys(e).filter(function (id) { return (e[id] || "").slice(0, 4) === String(y); });
    var kc = {}; ids.forEach(function (id) { var w = D.byId(id); if (w) kc[w.k] = (kc[w.k] || 0) + 1; });
    var fav = Object.keys(kc).sort(function (a, b) { return kc[b] - kc[a]; })[0];
    var qa = load("wunderwahr_quiz", {}), qy = Object.keys(qa).filter(function (k) { return k.slice(0, 4) === String(y); });
    var ok = qy.filter(function (k) { return qa[k].ok; }).length;
    var got = load("wunderwahr_abzeichen", {}), by = Object.keys(got).filter(function (k) { return (got[k] || "").slice(0, 4) === String(y); }).length;
    return { n: ids.length, fav: fav, favN: fav ? kc[fav] : 0, rare: ids.filter(function (id) { return SELTEN[id]; }).length, best: (load("wunderwahr_serie", {}).best) || 0, quiz: ok, quizAll: qy.length, badges: by, merk: sammlung().length };
  }
  function renderYearCard() {
    var y = new Date().getFullYear(), d = yearData(y);
    $("fbYear").innerHTML = '<span class="wd-medal">' + icon("calendar") + '</span><div><b>Dein Wunderjahr ' + y + '</b><span>' + fmt(d.n) + ' Wunder entdeckt' + (d.fav ? ' · am liebsten ' + esc(d.fav) : '') + '</span></div><button type="button" class="wd-mini" id="fbYearBtn">Ansehen</button>';
    $("fbYearBtn").onclick = function () { openYear(y); };
  }
  function openYear(y) {
    var d = yearData(y);
    sheet('<h2>Dein Wunderjahr ' + y + '</h2><p class="muted" style="margin:0">Alles, was du in diesem Jahr in WunderWahr erlebt hast.</p>' +
      '<div class="wd-ystats"><div><b>' + fmt(d.n) + '</b><span>Wunder entdeckt</span></div><div><b>' + fmt(d.best) + '</b><span>Tage längste Serie</span></div>' +
      '<div><b>' + fmt(d.quiz) + '<small style="font-size:14px;color:var(--sub-onbg)"> / ' + fmt(d.quizAll) + '</small></b><span>Quizfragen richtig</span></div><div><b>' + fmt(d.rare) + '</b><span>Sternstunden gefunden</span></div>' +
      '<div><b>' + fmt(d.merk) + '</b><span>Karten gemerkt</span></div><div><b>' + fmt(d.badges) + '</b><span>Abzeichen verdient</span></div></div>' +
      (d.fav ? '<p class="small">Dein Lieblingsthema: <b>' + esc(d.fav) + '</b> mit ' + fmt(d.favN) + ' Wundern.</p>' : '') +
      '<button type="button" class="cta primary" id="yShare">' + icon("share") + 'Als Bild teilen</button>', function (root) {
        root.querySelector("#yShare").onclick = function () {
          var txt = fmt(d.n) + " Wunder entdeckt, " + fmt(d.best) + " Tage längste Serie, " + fmt(d.quiz) + " Quizfragen richtig" + (d.rare ? ", " + fmt(d.rare) + " Sternstunden gefunden" : "") + ".";
          WDShare.wonderCard({ over: "Mein Wunderjahr", title: "Mein Wunderjahr " + y, text: txt, more: d.fav ? "Am meisten gestaunt habe ich über das Thema „" + d.fav + "“." : "", gold: true, foot: "Jeden Tag ein Grund zu staunen" })
            .then(function (b) { return WDShare.share(b, "Wunderjahr-" + y + ".png", "Mein Wunderjahr " + y); }).then(function (ok) { if (ok) bump("shared"); });
        };
      });
  }

  /* ---------- Große Schrift ---------- */
  function applyGross(on) { document.documentElement.classList.toggle("wd-gross", on); $("fbGross").setAttribute("aria-checked", on ? "true" : "false"); }
  applyGross(load("wunderwahr_gross", false) === true);
  $("fbGross").onclick = function () { var on = !document.documentElement.classList.contains("wd-gross"); save("wunderwahr_gross", on); applyGross(on); };

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
    $("llPast").innerHTML = (lp ? 'Zuletzt erreicht: <b>' + esc(lp.title) + '</b> am ' + dShort(new Date(lp.t)) + ' · <button type="button" class="wd-link" id="llCert">Urkunde</button> · ' : '') +
      '<button type="button" class="wd-link" id="llDel">' + esc(p.name || "Ich") + ' entfernen</button>';
    if (lp) $("llCert").onclick = function () { certMilestone(p, lp); };
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
    renderCal();
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
    $("llForm").hidden = true; $("llName").value = ""; renderKilometer(); checkBadges();
  };
  $("llStart").onclick = function () {
    var v = $("llDate0").value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) { toast("Bitte dein Geburtsdatum wählen."); return; }
    save("wunderwahr_personen", [{ id: "ich", name: "Ich", date: v }]); activeP = "ich"; renderKilometer(); renderZeit(); checkBadges();
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
     4. ZeitWahr – drei Zeitreisen zu Fuß
     ========================================================= */
  var R_ORDER = ["erde", "universum", "mensch"], R_ICON = { erde: "globe", universum: "universe", mensch: "people" };
  var SCALE_TXT = { "46": "46 km · über Wochen", "4.6": "4,6 km · an einem Nachmittag", "13.8": "13,8 km · über ein paar Tage", "1.38": "1,38 km · ein Spaziergang", "3": "3 km · ein Spaziergang", "30": "30 km · über Wochen" };
  function migrateReisen() {
    var old = load("wunderwahr_zeitreise", null), r = { aktiv: "erde", fertig: {} };
    R_ORDER.forEach(function (k) { r[k] = { m: 0, scale: D.REISEN[k].scales[0] }; });
    if (old) { r.erde.m = old.m || 0; r.erde.scale = old.scale || 46; }
    save("wunderwahr_reisen", r); return r;
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
    if (done && !(RS.fertig || {})[id]) { RS.fertig = RS.fertig || {}; RS.fertig[id] = ymd(new Date()); save("wunderwahr_reisen", RS); toast("Angekommen in der Gegenwart! Deine Urkunde ist bereit.", 2400); buzz([30, 50, 30]); setTimeout(checkBadges, 2700); }
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
    document.querySelectorAll("[data-trip]").forEach(function (b) { b.onclick = function () { if (watch != null) { toast("Bitte erst die laufende Etappe beenden."); return; } RS.aktiv = b.getAttribute("data-trip"); save("wunderwahr_reisen", RS); renderZeit(); }; });
    document.querySelectorAll("[data-scale]").forEach(function (b) {
      b.onclick = function () {
        var s = +b.getAttribute("data-scale"); if (s === cur().scale) return;
        var ch = function () { var c2 = cur(), frac = c2.m / 1000 / c2.scale; c2.scale = s; c2.m = Math.min(frac, 1) * s * 1000; if (RS.fertig && frac < 1) delete RS.fertig[RS.aktiv]; save("wunderwahr_reisen", RS); renderZeit(); };
        if (cur().m > 0 && window.wzConfirm) wzConfirm("Strecke ändern? Dein Fortschritt wird auf die neue Länge umgerechnet.", { okLabel: "Ändern" }).then(function (ok) { if (ok) ch(); }); else ch();
      };
    });
    renderZeitmitte();
  }
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
        cur().m += d; save("wunderwahr_reisen", RS); renderZeit(); if (Math.floor(cur().m / 1000) !== Math.floor((cur().m - d) / 1000)) checkBadges();
      }
      lastFix = { lat: c.latitude, lon: c.longitude, t: p.timestamp };
    }, function () { toast("Standort nicht verfügbar."); }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
  };
  $("aeReset").onclick = function () {
    (window.wzConfirm ? wzConfirm("Die Zeitreise „" + D.REISEN[RS.aktiv].name + "“ wirklich von vorn beginnen?", { okLabel: "Neu beginnen" }) : Promise.resolve(true)).then(function (ok) { if (ok) { cur().m = 0; save("wunderwahr_reisen", RS); renderZeit(); } });
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
      var ev = calList(now, now + 3 * 365 * DAY).map(function (m, i) { return { date: m.t, title: m.title, text: m.sub + " – berechnet mit WunderWahr", uid: "wd-" + m.p.id + "-" + m.t + "-" + i }; });
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
    key: "wunderwahr_onboarded",
    slides: [
      { icon: "tages", title: "Willkommen bei WunderWahr", text: "Jeden Tag ein Grund zu staunen – über dein Leben, deine Zeit und deinen Platz auf der Welt. Vier Bereiche, jeden Tag etwas Neues." },
      { icon: "tages", title: "TagesWahr", text: "Jeden Morgen eine neue Wunderkarte – zwei Jahre ohne Wiederholung – und ein frisch berechnetes Rechenwunder. Am nächsten Tag wartet ein Quiz, und jede Karte landet in deinem Wunderalbum." },
      { icon: "medal", title: "Sammeln und Abzeichen", text: "Fülle die Themen deines Albums, finde seltene Sternstunden, halte deine Serie und verdiene eigene Abzeichen. Jedes Wunder lässt sich als schöne Bildkarte teilen." },
      { icon: "kilometer", title: "KilometerWahr", text: "Aus deinem Geburtsdatum werden Meilensteine, die sonst niemand bemerkt – mit Jubiläumskalender für die ganze Familie und Urkunden zum Teilen." },
      { icon: "weitblick", title: "WeitblickWahr", text: "Folge einer Linie geradeaus um die Erde, sieh Tag und Nacht live – und halte im Kamera-Modus das Handy hoch, um zu sehen, wo New York, der Nordpol oder der Mond liegen." },
      { icon: "zeit", title: "ZeitWahr", text: "Drei Zeitreisen zu Fuß: die Erdgeschichte, das Universum seit dem Urknall und die Geschichte der Menschheit – Schritt für Schritt auf deinen Spaziergängen." },
      { icon: "lock", title: "Alles bleibt bei dir", text: "Alles wird auf dem Gerät berechnet. Geburtsdaten, Album und Fortschritt bleiben nur auf diesem Gerät; die Kamera wird nur angezeigt, nie aufgenommen. Es wird nichts gesendet." }
    ]
  }) : null;
  if ($("showOnboardingBtn")) $("showOnboardingBtn").addEventListener("click", function () { if (onb) onb.show(); });
  var TABS = ["tages", "kilometer", "weitblick", "zeit"];
  var h0 = (location.hash || "").slice(1);
  var startTab = TABS.indexOf(h0) >= 0 ? h0 : load("wunderwahr_tab", "tages");
  showTab(TABS.indexOf(startTab) >= 0 ? startTab : "tages");
  if (startTab !== "tages") renderTages();
  checkBadges();
  // Startbildschirm ausblenden
  (function () {
    var sp = $("wdSplash"); if (!sp) return;
    var shown = false; try { shown = sessionStorage.getItem("wunderwahr_splash") === "1"; sessionStorage.setItem("wunderwahr_splash", "1"); } catch (e) { }
    if (shown) { sp.parentNode.removeChild(sp); return; }
    var gone = false;
    function hide() { if (gone) return; gone = true; sp.classList.add("go"); setTimeout(function () { if (sp.parentNode) sp.parentNode.removeChild(sp); }, 500); }
    sp.addEventListener("pointerdown", hide);
    setTimeout(hide, 1100);
  })();
  // Tageswechsel: neue Karte, wenn die App über Mitternacht offen ist
  var lastDay = new Date().getDate();
  setInterval(function () { var d = new Date().getDate(); if (d !== lastDay) { lastDay = d; offset = 0; renderTages(); } }, 60000);
})();
