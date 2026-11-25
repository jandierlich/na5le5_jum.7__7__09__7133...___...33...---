/* ============================================================
   lb-app.js — LabWahr: Oberfläche, Versuchsablauf, Freies
   Messen, Tongenerator, Protokolle (PDF/CSV) und Fortschritt.
   Gespeichert wird nur lokal (localStorage, Präfix labwahr_).
   © 2026 Jan Dierlich – Alle Rechte vorbehalten.
   ============================================================ */
(function () {
  "use strict";
  var C = window.LBCore, X = window.LBExp, S = window.LBSense, RUN = window.LBRun, f = X.fmt;
  var LS = { sess: "labwahr_sitzungen", last: "labwahr_zuletzt", prot: "labwahr_protokolle", tests: "labwahr_tests", onb: "labwahr_onboarded", frei: "labwahr_frei", ton: "labwahr_ton" };
  var $ = function (id) { return document.getElementById(id); };
  function load(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function toast(t) { if (window.wzToast) wzToast(t); }
  function alertMsg(t) { if (window.wzAlert) wzAlert(t); else alert(t); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function when(ms) { return new Date(ms).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  function dur(min) { return min >= 60 ? (min % 60 ? f(min / 60, 1) : f(min / 60, 0)) + " Std." : min + " Min."; }
  function ico(path, size) { return '<svg width="' + (size || 24) + '" height="' + (size || 24) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + path + '"/></svg>'; }
  function wi(id) { return window.wzIcon ? wzIcon(id) : ""; }
  var STEPS = ["Fragestellung", "Aufbau", "Messung", "Auswertung", "Wissenstest"], STEPS_SHORT = ["Frage", "Aufbau", "Messung", "Auswertung", "Test"];
  var THEME_TINT = { mech: "t1", akustik: "t2", astro: "t3", bio: "t4" };

  /* ---------- Gespeicherte Daten ---------- */
  function sessions() { return load(LS.sess, {}) || {}; }
  function sess(id) { var all = sessions(); return all[id] || null; }
  function putSess(id, s) {
    var all = sessions(); all[id] = s;
    if (!save(LS.sess, all)) { s.data = null; all[id] = s; save(LS.sess, all); toast("Speicher voll – Messdaten konnten nicht gesichert werden."); }
  }
  function newSess(id) { var e = X.byId(id), inp = {}; (e.inputs || []).forEach(function (q) { inp[q.id] = q.def; }); var old = sess(id); if (old && old.inputs) for (var k in old.inputs) if (k in inp) inp[k] = old.inputs[k]; return { sid: uid(), step: 0, hypo: null, inputs: inp, data: null, entryId: null }; }
  function prots() { var l = load(LS.prot, []); return Array.isArray(l) ? l : []; }
  function saveProts(l) { save(LS.prot, l); }
  function tests() { return load(LS.tests, {}) || {}; }
  function doneSet() { var s = {}; prots().forEach(function (p) { if (p.exp && p.exp !== "frei" && !p.example) s[p.exp] = (s[p.exp] || 0) + 1; }); return s; }

  /* ---------- Tabs ---------- */
  var current = "versuche";
  function showTab(id) {
    current = id;
    Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (t) { var on = t.getAttribute("data-tab") === id; t.classList.toggle("active", on); t.setAttribute("aria-selected", on ? "true" : "false"); });
    Array.prototype.forEach.call(document.querySelectorAll(".screen"), function (s) { s.classList.toggle("active", s.id === "screen-" + id); });
    if (id === "versuche") renderOverview();
    if (id === "protokolle") renderProts();
    if (id === "fortschritt") renderProgress();
    if (id !== "messen") FREE.stop(true); else FREE.render();
  }
  Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (t) { t.addEventListener("click", function () { showTab(t.getAttribute("data-tab")); try { history.replaceState(null, "", "#" + t.getAttribute("data-tab")); } catch (e) { } }); });

  /* ---------- Übersicht ---------- */
  function dots(n) { var s = ""; for (var i = 0; i < 3; i++) s += '<span class="lb-dot' + (i < n ? " on" : "") + '"></span>'; return '<span class="lb-dots" aria-label="Schwierigkeit: ' + ["einfach", "mittel", "anspruchsvoll"][n - 1] + '">' + s + "</span>"; }
  function renderOverview() {
    var done = doneSet(), lastId = load(LS.last, null), ls = lastId ? sess(lastId) : null, le = lastId ? X.byId(lastId) : null, h = "";
    if (le && ls) {
      h += '<div class="card lb-resume"><div class="lb-resume-top"><div class="lb-ic ' + THEME_TINT[le.theme] + '">' + ico(le.icon, 26) + '</div><div class="lb-resume-txt"><div class="lb-kicker">Zuletzt bearbeitet</div><div class="lb-resume-title">' + esc(le.title) + '</div><div class="muted small">Schritt ' + (ls.step + 1) + " von 5 · " + STEPS[ls.step] + '</div></div></div>' +
        '<div class="lb-prog" role="img" aria-label="Fortschritt ' + (ls.step + 1) + ' von 5"><span style="width:' + ((ls.step + 1) * 20) + '%"></span></div><button type="button" class="cta primary" data-open="' + le.id + '">Fortsetzen</button></div>';
    }
    X.THEMES.forEach(function (t) {
      var items = X.LIST.filter(function (e) { return e.theme === t.id; }), n = items.filter(function (e) { return done[e.id]; }).length;
      h += '<section class="lb-theme"><div class="lb-theme-head"><div><h2>' + esc(t.title) + '</h2><p class="muted small">' + esc(t.sub) + '</p></div><span class="lb-count">' + n + " / " + items.length + '</span></div><div class="lb-grid">';
      items.forEach(function (e) {
        h += '<button type="button" class="lb-tile" data-open="' + e.id + '"><span class="lb-ic ' + THEME_TINT[e.theme] + '">' + ico(e.icon, 24) + "</span>" +
          '<span class="lb-tile-title">' + esc(e.title).replace("Zentripetalbeschleunigung", "Zentripetal&shy;beschleunigung").replace("Schallgeschwindigkeit", "Schall&shy;geschwindigkeit") + '</span><span class="lb-tile-q">' + esc(e.q) + '</span>' +
          '<span class="lb-tile-meta"><span>' + dur(e.min) + "</span>" + dots(e.lvl) + "</span>" +
          (done[e.id] ? '<span class="lb-done" aria-label="durchgeführt">' + wi("check") + "</span>" : "") + "</button>";
      });
      h += "</div></section>";
    });
    $("lbOverview").innerHTML = h;
  }
  $("lbOverview").addEventListener("click", function (e) { var b = e.target.closest("[data-open]"); if (b) openExp(b.getAttribute("data-open"), true); });

  /* ---------- Versuchsansicht ---------- */
  var V = { id: null, exp: null, s: null, runner: null, pushed: false, result: null, testAns: null };
  function openExp(id, push) {
    var e = X.byId(id); if (!e) return;
    FREE.stop(true);
    V.id = id; V.exp = e; V.s = sess(id) || newSess(id); V.testAns = null;
    save(LS.last, id); putSess(id, V.s);
    $("lbXTheme").textContent = (X.THEMES.filter(function (t) { return t.id === e.theme; })[0] || {}).title || "";
    $("lbXTitle").textContent = e.title; $("lbXQ").textContent = e.q;
    $("lbX").hidden = false; document.documentElement.classList.add("lb-x-open");
    if (push) { V.pushed = true; try { history.pushState({ lbx: id }, "", "#v-" + id); } catch (err) { } }
    go(V.s.step || 0);
  }
  function closeExp(fromPop) {
    if (!V.exp) return;
    killRunner();
    $("lbX").hidden = true; document.documentElement.classList.remove("lb-x-open");
    V.id = V.exp = V.s = null;
    if (!fromPop) { if (V.pushed) { V.pushed = false; history.back(); return; } try { history.replaceState(null, "", "#" + current); } catch (e) { } }
    V.pushed = false; renderOverview();
  }
  window.addEventListener("popstate", function () { if (V.exp && location.hash.indexOf("#v-") !== 0) closeExp(true); else if (!V.exp && location.hash.indexOf("#v-") === 0) openExp(location.hash.slice(3), false); });
  $("lbXBack").addEventListener("click", function () { closeExp(false); });
  function killRunner() { if (V.runner) { try { V.runner.stop(); } catch (e) { } try { if (V.runner.destroy) V.runner.destroy(); } catch (e) { } V.runner = null; } }

  function stepBar() {
    $("lbXSteps").innerHTML = STEPS.map(function (n, i) { return '<button type="button" class="lb-step' + (i < V.s.step ? " past" : i === V.s.step ? " cur" : "") + '" data-step="' + i + '"' + (i === V.s.step ? ' aria-current="step"' : "") + '><span class="lb-step-bar"></span><span class="lb-step-n">' + STEPS_SHORT[i] + "</span></button>"; }).join("");
  }
  $("lbXSteps").addEventListener("click", function (e) { var b = e.target.closest("[data-step]"); if (b) go(+b.getAttribute("data-step")); });

  function go(step) {
    if (step !== 2) killRunner();
    V.s.step = step; putSess(V.id, V.s); stepBar();
    var e = V.exp, body = $("lbXBody"), h = "";
    if (step === 0) h = stepQuestion(e);
    else if (step === 1) h = stepSetup(e);
    else if (step === 2) h = stepMeasure(e);
    else if (step === 3) h = stepResult(e);
    else h = stepTest(e);
    body.innerHTML = h;
    $("lbX").scrollTop = 0;
    var prev = $("lbXPrev"), next = $("lbXNext");
    prev.hidden = step === 0; prev.textContent = "Zurück";
    next.textContent = ["Weiter zum Aufbau", "Weiter zur Messung", "Auswerten", "Weiter zum Wissenstest", "Abschließen"][step];
    if (step === 2) mountRunner();
    if (step === 3) afterResult();
  }
  $("lbXPrev").addEventListener("click", function () { if (V.s.step > 0) go(V.s.step - 1); });
  $("lbXNext").addEventListener("click", function () {
    var st = V.s.step;
    if (st === 2) { if (V.runner) { try { V.runner.stop(); } catch (e) { } var d = V.runner.data(); if (d) { V.s.data = d; putSess(V.id, V.s); } } go(3); }
    else if (st === 4) closeExp(false);
    else go(st + 1);
  });

  function card(title, inner, cls) { return '<div class="card' + (cls ? " " + cls : "") + '">' + (title ? "<h2>" + title + "</h2>" : "") + inner + "</div>"; }

  /* Schritt 1: Fragestellung, Hypothese, Theorie */
  function stepQuestion(e) {
    var hy = e.hypo, sel = V.s.hypo;
    return card("Fragestellung", '<p class="lb-p">' + esc(e.frage) + "</p>") +
      card("Deine Hypothese", '<p class="lb-p"><b>' + esc(hy.q) + '</b></p><div class="lb-opts" role="radiogroup" aria-label="Hypothese">' + hy.opts.map(function (o, i) { return '<button type="button" class="lb-opt' + (sel === i ? " on" : "") + '" role="radio" aria-checked="' + (sel === i) + '" data-hypo="' + i + '">' + esc(o) + "</button>"; }).join("") + '</div><p class="muted small">Lege dich vor der Messung fest. In der Auswertung siehst du, ob deine Vorhersage zutrifft.</p>') +
      card("Theoretischer Hintergrund", '<p class="lb-p">' + esc(e.theorie) + '</p><div class="lb-formula">' + esc(e.formel) + '</div><p class="muted small">' + esc(e.formelInfo) + "</p>");
  }
  $("lbXBody").addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-hypo]");
    if (b) { V.s.hypo = +b.getAttribute("data-hypo"); putSess(V.id, V.s); Array.prototype.forEach.call(document.querySelectorAll("[data-hypo]"), function (x) { var on = +x.getAttribute("data-hypo") === V.s.hypo; x.classList.toggle("on", on); x.setAttribute("aria-checked", on); }); return; }
    var q = ev.target.closest("[data-q]");
    if (q) { var qi = +q.getAttribute("data-q"), oi = +q.getAttribute("data-o"); if (V.testAns && V.testAns.done) return; V.testAns = V.testAns || { a: [] }; V.testAns.a[qi] = oi; Array.prototype.forEach.call(document.querySelectorAll('[data-q="' + qi + '"]'), function (x) { x.classList.toggle("on", +x.getAttribute("data-o") === oi); x.setAttribute("aria-checked", +x.getAttribute("data-o") === oi); }); var cnt = V.testAns.a.filter(function (x) { return x != null; }).length; $("lbTestEval").disabled = cnt < V.exp.test.length; return; }
    var k = ev.target.closest("[data-act]"); if (!k) return;
    var act = k.getAttribute("data-act");
    if (act === "testEval") evalTest();
    else if (act === "testAgain") { V.testAns = null; go(4); }
    else if (act === "newRun") newRun();
    else if (act === "reset") { if (V.runner) Promise.resolve(window.wzConfirm ? wzConfirm("Messdaten dieses Durchgangs verwerfen?", { okLabel: "Verwerfen", cancelLabel: "Abbrechen" }) : true).then(function (ok) { if (ok && V.runner) { V.runner.reset(); V.s.data = null; putSess(V.id, V.s); } }); }
    else if (act === "toggle") { if (V.runner) V.runner.toggle(); }
    else if (act === "toMeasure") go(2);
    else if (act === "pdfOne") { var p = prots().filter(function (x) { return x.id === V.s.entryId; })[0]; if (p) pdf([p], "Versuchsprotokoll – " + p.title); }
    else if (act === "tone") showTab2("messen", "ton");
  });
  function newRun() {
    killRunner(); var ns = newSess(V.id); ns.hypo = V.s.hypo; ns.step = 2; V.s = ns; putSess(V.id, V.s); go(2); toast("Neuer Durchgang – der bisherige bleibt im Protokoll.");
  }

  /* Schritt 2: Aufbau */
  function stepSetup(e) {
    return card("Versuchsskizze", e.skizze, "lb-sk-card") +
      card("Durchführung", '<ol class="lb-ol">' + e.aufbau.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol>") +
      card("Material", '<div class="lb-chips">' + e.material.map(function (m) { return '<span class="lb-chip">' + esc(m) + "</span>"; }).join("") + "</div>") +
      '<div class="lb-warn">' + wi("warning") + "<div><b>Sicherheit:</b> " + esc(e.sicherheit) + "</div></div>" +
      (e.id === "doppler" || e.id === "abstand" ? '<button type="button" class="cta slim lb-gap" data-act="tone">Tongenerator öffnen</button>' : "");
  }

  /* Schritt 3: Messung */
  function stepMeasure(e) {
    var inp = (e.inputs || []).map(function (q) {
      var v = V.s.inputs[q.id];
      return '<div class="field"><label for="lbIn_' + q.id + '">' + esc(q.label) + '<span class="hint">' + esc(q.hint) + '</span></label><span><input class="num-input" id="lbIn_' + q.id + '" data-in="' + q.id + '" type="text" inputmode="decimal" value="' + esc(String(v).replace(".", ",")) + '"> <span class="muted">' + esc(q.unit) + "</span></span></div>";
    }).join("");
    return (inp ? card("Parameter", inp) : "") +
      '<div class="card lb-meas"><div class="lb-big"><span class="lb-big-l" id="lbBigL"></span><span class="lb-big-v"><b id="lbBigV">–</b> <span id="lbBigU"></span></span><span class="lb-big-s" id="lbBigS"></span></div>' +
      '<div class="lb-chart" id="lbChartBox"><canvas id="lbChart"></canvas></div>' +
      '<div class="lb-status" id="lbStatus" aria-live="polite"></div>' +
      '<div class="lb-extra" id="lbExtra"></div>' +
      '<div class="btn-row" id="lbMainRow"><button type="button" class="cta slim" data-act="reset">Verwerfen</button><button type="button" class="cta primary slim" id="lbMain" data-act="toggle">Messung starten</button></div></div>' +
      (V.s.entryId ? '<button type="button" class="cta slim lb-gap" data-act="newRun">Neuen Durchgang beginnen</button>' : "");
  }
  function params() {
    var o = {};
    (V.exp.inputs || []).forEach(function (q) { var el = document.querySelector('[data-in="' + q.id + '"]'), n = el ? parseFloat(String(el.value).replace(",", ".")) : NaN; o[q.id] = isFinite(n) ? Math.min(q.max, Math.max(q.min, n)) : (V.s.inputs[q.id] != null ? V.s.inputs[q.id] : q.def); });
    return o;
  }
  function mountRunner() {
    var e = V.exp, mk = RUN[e.runner]; if (!mk) return;
    var chart = $("lbChart");
    var ctx = {
      exp: e, prev: V.s.data, extra: $("lbExtra"), cv: chart,
      p: params,
      big: function (l, v, u, s) { $("lbBigL").textContent = l || ""; $("lbBigV").textContent = v; $("lbBigU").textContent = u || ""; $("lbBigS").textContent = s || ""; },
      status: function (cls, t) { var el = $("lbStatus"); if (!el) return; el.className = "lb-status" + (cls ? " " + cls : ""); el.textContent = t || ""; el.hidden = !t; },
      plot: function (o) { if (chart && chart.isConnected) S.plot(chart, o); },
      main: function (label, active) { var b = $("lbMain"); if (!b) return; if (label == null) { b.hidden = true; return; } b.hidden = false; b.textContent = label; b.classList.toggle("stop", !!active); },
      hideChart: function () { $("lbChartBox").hidden = true; },
      save: function (d) { if (!V.s) return; V.s.data = d; putSess(V.id, V.s); },
      toast: toast, alert: alertMsg
    };
    ctx.status("", ""); ctx.plot({ series: [] });
    V.runner = mk(ctx);
  }
  $("lbXBody").addEventListener("input", function (ev) {
    var el = ev.target.closest("[data-in]"); if (!el || !V.s) return;
    var n = parseFloat(String(el.value).replace(",", ".")); if (isFinite(n)) { V.s.inputs[el.getAttribute("data-in")] = n; putSess(V.id, V.s); }
    if (V.runner && V.runner.inputChanged) V.runner.inputChanged();
  });

  /* Schritt 4: Auswertung */
  function evaluate() {
    if (!V.s.data) return null;
    var inp = {}; (V.exp.inputs || []).forEach(function (q) { inp[q.id] = V.s.inputs[q.id] != null ? V.s.inputs[q.id] : q.def; });
    try { return V.exp.evaluate(V.s.data, inp); } catch (err) { return { ok: false, msg: "Die Messdaten konnten nicht ausgewertet werden." }; }
  }
  function scaleSvg(sc) {
    if (!sc) return "";
    var W = 320, x = function (v) { return 14 + (Math.max(sc.min, Math.min(sc.max, v)) - sc.min) / (sc.max - sc.min) * (W - 28); }, h = '<svg viewBox="0 0 ' + W + ' 74" class="lb-scale" role="img" aria-label="Einordnung des Messwerts">';
    h += '<rect class="sc-track" x="14" y="30" width="' + (W - 28) + '" height="8" rx="4"/>';
    if (sc.band && isFinite(sc.band[0]) && isFinite(sc.band[1])) h += '<rect class="sc-band" x="' + x(sc.band[0]) + '" y="30" width="' + Math.max(3, x(sc.band[1]) - x(sc.band[0])) + '" height="8" rx="4"/>';
    (sc.marks || []).forEach(function (m) { h += '<path class="sc-mark" d="M' + x(m[0]) + ' 40v6"/><text class="sc-mt" x="' + x(m[0]) + '" y="58" text-anchor="middle">' + esc(m[1]) + "</text>"; });
    if (sc.ref != null && isFinite(sc.ref)) h += '<path class="sc-ref" d="M' + x(sc.ref) + ' 22v24"/><text class="sc-rt" x="' + Math.min(W - 40, Math.max(40, x(sc.ref))) + '" y="15" text-anchor="middle">' + esc(sc.refLabel || "") + "</text>";
    h += '<circle class="sc-val" cx="' + x(sc.val) + '" cy="34" r="7"/><text class="sc-vt" x="' + Math.min(W - 40, Math.max(40, x(sc.val))) + '" y="' + ((sc.marks && sc.marks.length) ? 72 : 60) + '" text-anchor="middle">' + esc(sc.valLabel || "") + "</text>";
    return h + "</svg>";
  }
  function stepResult(e) {
    var r = evaluate(); V.result = r;
    if (!r) return card("Noch keine Messdaten", '<p class="lb-p">Führe zuerst die Messung durch.</p><button type="button" class="cta primary slim" data-act="toMeasure">Zur Messung</button>');
    if (!r.ok) return card("Auswertung nicht möglich", '<p class="lb-p">' + esc(r.msg) + '</p><button type="button" class="cta primary slim" data-act="toMeasure">Zurück zur Messung</button>');
    var hy = e.hypo, sel = V.s.hypo, entry = upsertEntry(r);
    var h = '<div class="card lb-res"><div class="lb-big"><span class="lb-big-l">' + esc(r.main.label) + '</span><span class="lb-big-v"><b>' + esc(r.main.value) + "</b> <span>" + esc(r.main.unit) + '</span></span><span class="lb-big-s">' + esc(r.sub || "") + "</span></div>" +
      (r.rating ? '<div class="lb-pill ' + r.rating.cls + '"><span></span>' + esc(r.rating.text) + "</div>" : "") + scaleSvg(r.scale) + "</div>";
    h += card("Hypothese", sel == null ? '<p class="lb-p">Du hast vorab keine Hypothese gewählt.</p><p class="muted small">' + esc(hy.why) + "</p>" :
      '<div class="lb-hyp ' + (sel === hy.ok ? "ok" : "no") + '"><b>' + (sel === hy.ok ? "Bestätigt" : "Nicht bestätigt") + ":</b> " + esc(hy.opts[sel]) + "</div>" + (sel === hy.ok ? "" : '<p class="lb-p">Zutreffend ist: <b>' + esc(hy.opts[hy.ok]) + "</b></p>") + '<p class="muted small">' + esc(hy.why) + "</p>");
    h += card("Messwerte", '<table class="lb-table">' + r.table.map(function (row) { return "<tr><th>" + esc(row[0]) + "</th><td>" + esc(row[1]) + "</td></tr>"; }).join("") + "</table>");
    if (r.plot) h += card("Diagramm", '<div class="lb-chart"><canvas id="lbResChart"></canvas></div>');
    h += card("Interpretation", '<p class="lb-p">' + esc(r.note) + '</p><div class="lb-formula">' + esc(e.formel) + "</div>");
    h += card("Mögliche Fehlerquellen", '<ul class="lb-ul">' + e.fehler.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>");
    h += card("Protokoll", '<p class="muted small">Dieser Durchgang ist im Protokoll gespeichert (' + esc(when(entry.ts)) + ').</p><label class="lb-lbl" for="lbNote">Eigene Notiz</label><textarea id="lbNote" class="text-input lb-note" rows="3" maxlength="600" placeholder="z. B. Ort, Besonderheiten, Wiederholung mit anderem Material">' + esc(entry.note || "") + '</textarea><div class="btn-row"><button type="button" class="cta slim" data-act="pdfOne">' + wi("doc") + " Protokoll als PDF</button></div>");
    return h;
  }
  function afterResult() {
    var r = V.result;
    var n = $("lbNote"); if (n) n.addEventListener("input", function () { var l = prots(), p = l.filter(function (x) { return x.id === V.s.entryId; })[0]; if (p) { p.note = n.value.slice(0, 600); saveProts(l); } });
    if (r && r.ok && r.plot) plotResult(r.plot, $("lbResChart"));
  }
  function plotResult(pl, cv) {
    if (!cv) return;
    if (pl.pairs) {
      var fx = [], fy = [], wm = Math.max.apply(null, pl.pairs.map(function (p) { return p.w; })); for (var i = 0; i <= 40; i++) { var w = wm * i / 40; fx.push(w); fy.push(pl.r * w * w); }
      S.plot(cv, { series: [{ xs: pl.pairs.map(function (p) { return p.w; }), ys: pl.pairs.map(function (p) { return p.a; }), dots: true, r: 1.8 }, { xs: fx, ys: fy, dash: [5, 4] }], xlab: "ω in rad/s", ylab: "a in m/s²" });
    } else if (pl.h) S.plot(cv, { series: [{ xs: pl.t, ys: pl.h }], xlab: "s", ylab: "Höhe in m" });
    else if (pl.g) S.plot(cv, { series: [{ xs: pl.t, ys: pl.g, w: 1.4 }], marks: pl.marks || [], xlab: "s", hline: pl.marks ? [] : [{ y: 1 }] });
    else if (pl.env) {
      var xs = pl.env.map(function (_, i) { return i * pl.step * 1000; }), mx = Math.max.apply(null, pl.env) || 1;
      S.plot(cv, pl.db ? { series: [{ xs: xs, ys: pl.env.map(function (v) { return C.db(v / mx); }), w: 1.4 }], yr: [-60, 2], xlab: "ms", ylab: "dB" } : { series: [{ xs: xs, ys: pl.env.map(function (v) { return v / mx; }), w: 1.4 }], vlines: (pl.marks || [pl.p0, pl.p1].filter(function (x) { return x != null; })).map(function (x) { return { x: x * 1000 }; }), yr: [0, 1.05], xlab: "ms", ylab: "relativ" });
    } else if (pl.track) S.plot(cv, { series: [{ xs: pl.track.xs, ys: pl.track.ys, dots: true, r: 1.8 }], xlab: "s", ylab: "Hz" });
    else if (pl.pts) {
      var K = C.mean(pl.pts.map(function (p) { return p.f * Math.sqrt(p.h); })), hs = pl.pts.map(function (p) { return p.h; }), lo = Math.min.apply(null, hs) * 0.8, hi = Math.max.apply(null, hs) * 1.15, gx = [], gy = [];
      for (var j = 0; j <= 40; j++) { var hh = lo + (hi - lo) * j / 40; gx.push(hh); gy.push(K / Math.sqrt(hh)); }
      S.plot(cv, { series: [{ xs: hs, ys: pl.pts.map(function (p) { return p.f; }), dots: true, r: 4 }].concat(pl.pts.length > 1 ? [{ xs: gx, ys: gy, dash: [5, 4] }] : []), xlab: "Lufthöhe h in cm", ylab: "f in Hz" });
    } else if (pl.shadow) {
      var pts = pl.shadow.slice().sort(function (a, b) { return a.ms - b.ms; }), t0 = pts[0].ms;
      S.plot(cv, { series: [{ xs: pts.map(function (p) { return (p.ms - t0) / 36e5; }), ys: pts.map(function (p) { return p.L; }), dots: true, r: 3.5 }], vlines: pl.noon ? [{ x: (pl.noon - t0) / 36e5 }] : [], xfmt: function (v) { return new Date(t0 + v * 36e5).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }); }, ylab: "L in cm" });
    }
  }
  function upsertEntry(r) {
    var l = prots(), e = V.exp, p = V.s.entryId ? l.filter(function (x) { return x.id === V.s.entryId; })[0] : null, isNew = !p;
    if (!p) { p = { id: uid(), exp: e.id, ts: Date.now(), note: "" }; l.unshift(p); V.s.entryId = p.id; putSess(V.id, V.s); }
    var pr = (e.inputs || []).map(function (q) { return [q.label, f(V.s.inputs[q.id], q.step < 1 ? 1 : 0) + " " + q.unit]; });
    p.title = e.title; p.theme = e.theme; p.value = r.store.v; p.unit = r.store.unit; p.d = r.store.d; p.text = r.store.text; p.dev = isFinite(r.store.dev) ? r.store.dev : null; p.example = !!r.store.example;
    p.main = r.main.label + ": " + r.main.value + (r.main.unit ? " " + r.main.unit : ""); p.sub = r.sub || ""; p.rating = r.rating ? r.rating.text : ""; p.ratingCls = r.rating ? r.rating.cls : "";
    p.hypo = V.s.hypo == null ? null : { q: e.hypo.q, chosen: e.hypo.opts[V.s.hypo], ok: V.s.hypo === e.hypo.ok };
    p.params = pr; p.table = r.table; p.frage = e.frage; p.formel = e.formel; p.interp = r.note; p.updated = Date.now();
    if (r.store.aud) p.aud = r.store.aud;
    if (l.length > 400) l.length = 400;
    saveProts(l);
    if (isNew) toast("Im Protokoll gespeichert");
    return p;
  }

  /* Schritt 5: Wissenstest */
  function stepTest(e) {
    var t = tests()[e.id], a = V.testAns, done = a && a.done;
    var h = '<p class="muted lb-intro">' + e.test.length + " Prüfungsfragen zum Versuch." + (t ? " Bisher bestes Ergebnis: " + t.best + " von " + t.total + "." : "") + "</p>";
    e.test.forEach(function (q, i) {
      var sel = a ? a.a[i] : null;
      h += '<div class="card"><h2>Frage ' + (i + 1) + '</h2><p class="lb-p"><b>' + esc(q.q) + '</b></p><div class="lb-opts" role="radiogroup">' + q.opts.map(function (o, j) {
        var cls = sel === j ? " on" : ""; if (done) cls += j === q.ok ? " right" : sel === j ? " wrong" : "";
        return '<button type="button" class="lb-opt' + cls + '" role="radio" aria-checked="' + (sel === j) + '" data-q="' + i + '" data-o="' + j + '"' + (done ? " disabled" : "") + ">" + esc(o) + "</button>";
      }).join("") + "</div>" + (done ? '<p class="lb-why ' + (sel === q.ok ? "ok" : "no") + '"><b>' + (sel === q.ok ? "Richtig." : "Nicht richtig.") + "</b> " + esc(q.why) + "</p>" : "") + "</div>";
    });
    if (done) { var sc = a.score; h += '<div class="card lb-score"><div class="lb-big"><span class="lb-big-l">Ergebnis</span><span class="lb-big-v"><b>' + sc + " / " + e.test.length + '</b></span><span class="lb-big-s">' + (sc === e.test.length ? "Alle Fragen richtig beantwortet." : sc >= Math.ceil(e.test.length * 2 / 3) ? "Bestanden." : "Noch nicht bestanden – lies die Erklärungen und versuche es erneut.") + '</span></div><button type="button" class="cta slim" data-act="testAgain">Test wiederholen</button></div>'; }
    else h += '<button type="button" class="cta primary" id="lbTestEval" data-act="testEval" disabled>Antworten auswerten</button>';
    h += card("Weiterführendes Experiment", '<p class="lb-p">' + esc(e.weiter) + "</p>");
    return h;
  }
  function evalTest() {
    var e = V.exp, a = V.testAns; if (!a) return;
    var sc = 0; e.test.forEach(function (q, i) { if (a.a[i] === q.ok) sc++; });
    a.done = true; a.score = sc;
    var all = tests(), t = all[e.id] || { best: 0, total: e.test.length }; t.best = Math.max(t.best, sc); t.last = sc; t.total = e.test.length; t.ts = Date.now(); all[e.id] = t; save(LS.tests, all);
    var y = window.scrollY; go(4); void y;
  }

  /* ---------- Protokolle ---------- */
  var openProt = null;
  function renderProts() {
    var l = prots(), box = $("lbProtList");
    $("lbProtPdf").disabled = $("lbProtCsv").disabled = !l.length;
    if (!l.length) { box.innerHTML = '<div class="empty-hint">Noch keine Protokolle. Jeder ausgewertete Versuch wird hier automatisch festgehalten.</div>'; return; }
    box.innerHTML = l.map(function (p) {
      var open = openProt === p.id;
      return '<div class="lb-prot' + (open ? " open" : "") + '" data-id="' + esc(p.id) + '"><button type="button" class="lb-prot-head" data-act="toggleProt" aria-expanded="' + open + '"><span class="lb-ic sm ' + (THEME_TINT[p.theme] || "t1") + '">' + ico((X.byId(p.exp) || { icon: "M4 4h16v16H4z" }).icon, 20) + '</span><span class="lb-prot-t"><b>' + esc(p.title) + (p.example ? " (Beispielwerte)" : "") + '</b><span class="muted small">' + esc(when(p.ts)) + '</span></span><span class="lb-prot-v">' + esc(p.value != null && isFinite(p.value) ? f(p.value, p.d || 0) + (p.unit ? " " + p.unit : "") : "") + "</span></button>" +
        (open ? '<div class="lb-prot-body"><p class="lb-p">' + esc(p.text) + "</p>" + (p.rating ? '<div class="lb-pill ' + esc(p.ratingCls) + '"><span></span>' + esc(p.rating) + "</div>" : "") +
          (p.hypo ? '<p class="small"><b>Hypothese:</b> ' + esc(p.hypo.chosen) + " – " + (p.hypo.ok ? "bestätigt" : "nicht bestätigt") + "</p>" : "") +
          '<table class="lb-table">' + (p.params || []).concat(p.table || []).map(function (r) { return "<tr><th>" + esc(r[0]) + "</th><td>" + esc(r[1]) + "</td></tr>"; }).join("") + "</table>" +
          '<label class="lb-lbl" for="lbPN_' + esc(p.id) + '">Notiz</label><textarea class="text-input lb-note" id="lbPN_' + esc(p.id) + '" data-note="' + esc(p.id) + '" rows="2" maxlength="600">' + esc(p.note || "") + "</textarea>" +
          '<div class="lb-prot-actions">' + (p.exp !== "frei" ? '<button type="button" class="icon-btn" data-act="openExp">' + wi("flask") + " Versuch öffnen</button>" : "") + '<button type="button" class="icon-btn" data-act="pdfProt">' + wi("doc") + ' PDF</button><button type="button" class="icon-btn" data-act="delProt">' + wi("trash") + " Löschen</button></div></div>" : "") + "</div>";
    }).join("");
  }
  $("lbProtList").addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]"); if (!b) return;
    var it = b.closest(".lb-prot"), id = it && it.getAttribute("data-id"), act = b.getAttribute("data-act"), p = prots().filter(function (x) { return x.id === id; })[0];
    if (act === "toggleProt") { openProt = openProt === id ? null : id; renderProts(); }
    else if (act === "pdfProt" && p) pdf([p], "Versuchsprotokoll – " + p.title);
    else if (act === "openExp" && p) openExp(p.exp, true);
    else if (act === "delProt") Promise.resolve(window.wzConfirm ? wzConfirm("Dieses Protokoll löschen?", { okLabel: "Löschen", cancelLabel: "Abbrechen" }) : true).then(function (ok) {
      if (!ok) return; saveProts(prots().filter(function (x) { return x.id !== id; }));
      var all = sessions(); for (var k in all) if (all[k] && all[k].entryId === id) all[k].entryId = null; save(LS.sess, all);
      renderProts();
    });
  });
  $("lbProtList").addEventListener("input", function (e) { var t = e.target.closest("[data-note]"); if (!t) return; var l = prots(), p = l.filter(function (x) { return x.id === t.getAttribute("data-note"); })[0]; if (p) { p.note = t.value.slice(0, 600); saveProts(l); } });
  $("lbProtPdf").addEventListener("click", function () { pdf(prots().slice().reverse(), "Laborbuch"); });
  $("lbProtCsv").addEventListener("click", function () {
    var rows = [["Datum", "Versuch", "Ergebnis", "Wert", "Einheit", "Abweichung Literatur %", "Hypothese", "Notiz"]];
    prots().slice().reverse().forEach(function (p) { rows.push([when(p.ts), p.title + (p.example ? " (Beispielwerte)" : ""), p.text || "", p.value != null && isFinite(p.value) ? f(p.value, Math.max(2, p.d || 0)) : "", p.unit || "", p.dev != null ? f(p.dev * 100, 2) : "", p.hypo ? (p.hypo.ok ? "bestätigt" : "nicht bestätigt") : "", p.note || ""]); });
    share(csv(rows), "LabWahr-Protokolle.csv", "text/csv");
  });

  /* ---------- Export: CSV, PDF, Teilen ---------- */
  function csv(rows) { return "﻿" + rows.map(function (r) { return r.map(function (c) { c = String(c == null ? "" : c); return /[;"\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(";"); }).join("\r\n"); }
  function share(content, name, type) {
    var blob = content instanceof Blob ? content : new Blob([content], { type: type + ";charset=utf-8" });
    try {
      var file = new File([blob], name, { type: type });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: name }).catch(function () { }); return; }
    } catch (e) { }
    var a = document.createElement("a"), url = URL.createObjectURL(blob); a.href = url; a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 2000);
  }
  var PDFMAP = { "²": "^2", "³": "^3", "−": "-", "–": "-", "—": "-", "≈": "~", "π": "pi", "√": "Wurzel ", "⁴": "^4", "φ": "phi", "δ": "delta", "Δ": "Delta ", "λ": "lambda", "θ": "theta", "ω": "omega", "α": "alpha", "μ": "µ", "ϑ": "T", "₀": "0", "₁": "1", "₂": "2", "ā": "a", "⇒": "=>", "∝": "~", "∫": "Integral ", "…": "...", "„": "\"", "“": "\"", "”": "\"", "‘": "'", "’": "'", "≤": "<=", "≥": ">=", "✕": "x", "↑": "", "↓": "", "€": "EUR" };
  function pdfTxt(s) { return String(s == null ? "" : s).replace(/[^\x00-\xb1\xb4-\xff]/g, function (c) { return PDFMAP[c] != null ? PDFMAP[c] : "?"; }); }
  function pdf(list, title) {
    if (!list.length) return;
    var go = function () {
      var J = window.jspdf && window.jspdf.jsPDF; if (!J) { alertMsg("Die PDF-Funktion konnte nicht geladen werden."); return; }
      var doc = new J({ unit: "mm", format: "a4" }), y = 18, M = 16, W = 178;
      function need(h) { if (y + h > 282) { doc.addPage(); y = 18; } }
      function line(t, size, bold, col) { if (bold && (size || 10) <= 10) need(14); doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size || 10); doc.setTextColor(col || 36, col ? col : 30, col ? col : 63); var ls = doc.splitTextToSize(pdfTxt(t), W); ls.forEach(function (l) { need(size ? size * 0.5 : 5); doc.text(l, M, y); y += (size || 10) * 0.45; }); }
      function gap(h) { y += h || 3; }
      doc.setFillColor(90, 47, 190); doc.rect(0, 0, 210, 8, "F");
      line("LabWahr – " + title, 16, true); gap(1);
      line("Erstellt am " + when(Date.now()) + " · " + list.length + (list.length === 1 ? " Versuch" : " Versuche"), 9, false, 90); gap(5);
      list.forEach(function (p, i) {
        need(30);
        if (i) { doc.setDrawColor(200, 190, 230); doc.line(M, y - 2, M + W, y - 2); gap(3); }
        line(p.title + (p.example ? " (Beispielwerte)" : ""), 13, true); line(when(p.ts), 9, false, 90); gap(2);
        if (p.frage) { line("Fragestellung", 10, true); line(p.frage, 10); gap(2); }
        if (p.hypo) { line("Hypothese", 10, true); line(p.hypo.q + " – gewählt: " + p.hypo.chosen + " (" + (p.hypo.ok ? "bestätigt" : "nicht bestätigt") + ")", 10); gap(2); }
        if (p.formel) { line("Formel", 10, true); line(p.formel, 10); gap(2); }
        line("Ergebnis", 10, true); line(p.main || p.text, 11, true); if (p.sub) line(p.sub, 10); if (p.rating) line("Bewertung: " + p.rating, 10); gap(2);
        var rows = (p.params || []).concat(p.table || []);
        if (rows.length) { line("Parameter und Messwerte", 10, true); rows.forEach(function (r) { need(6); doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(82, 67, 112); var a = doc.splitTextToSize(pdfTxt(r[0]), 70), b = doc.splitTextToSize(pdfTxt(r[1]), W - 74); doc.text(a, M, y); doc.setTextColor(36, 30, 63); doc.text(b, M + 74, y); y += Math.max(a.length, b.length) * 4.4 + 0.6; }); gap(2); }
        if (p.interp) { line("Interpretation", 10, true); line(p.interp, 10); gap(2); }
        if (p.note) { line("Notiz", 10, true); line(p.note, 10); gap(2); }
        gap(4);
      });
      var n = doc.getNumberOfPages();
      for (var k = 1; k <= n; k++) { doc.setPage(k); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(120, 110, 150); doc.text(pdfTxt("LabWahr · Teil der WahrZentrale · Seite " + k + " von " + n), M, 291); }
      share(doc.output("blob"), "LabWahr-" + (list.length === 1 ? pdfTxt(list[0].title).replace(/[^A-Za-z0-9]+/g, "-") : "Laborbuch") + ".pdf", "application/pdf");
    };
    if (window.jspdf) go(); else if (window.wzCore && wzCore.loadScript) wzCore.loadScript("./lib-jspdf.umd.min.js").then(go, function () { alertMsg("Die PDF-Funktion konnte nicht geladen werden."); }); else alertMsg("Die PDF-Funktion ist nicht verfügbar.");
  }

  /* ---------- Fortschritt ---------- */
  function achievements() {
    var l = prots(), done = doneSet(), t = tests(), byExp = function (id) { return l.filter(function (p) { return p.exp === id && !p.example; }); };
    var themeDone = function (th) { return X.LIST.filter(function (e) { return e.theme === th; }).every(function (e) { return done[e.id]; }); };
    var hypOk = l.filter(function (p) { return p.hypo && p.hypo.ok; }).length, passed = X.LIST.filter(function (e) { var r = t[e.id]; return r && r.best >= Math.ceil(r.total * 2 / 3); }).length;
    var fr = load(LS.frei, {}) || {};
    return [
      { t: "Erdbeschleunigung auf 1 % genau", d: "Fadenpendel mit höchstens 1 % Abweichung vom Literaturwert", ok: byExp("pendel").some(function (p) { return p.dev != null && Math.abs(p.dev) <= 0.01; }) },
      { t: "Schallgeschwindigkeit auf 3 % genau", d: "Echo-Messung mit höchstens 3 % Abweichung vom Theoriewert", ok: byExp("echo").some(function (p) { return p.dev != null && Math.abs(p.dev) <= 0.03; }) },
      { t: "Erdumfang aus eigenen Messungen", d: "Eratosthenes mit eigenen Schattenmessungen (keine Beispielwerte)", ok: byExp("eratos").length > 0 },
      { t: "Ortsbestimmung ohne GPS", d: "Geografische Breite und Länge mit dem Schattenstab bestimmt", ok: byExp("breite").length > 0 && byExp("mittag").length > 0 },
      { t: "Reproduzierbarkeit", d: "Einen Versuch dreimal unabhängig durchgeführt", ok: Object.keys(done).some(function (k) { return done[k] >= 3; }) },
      { t: "Mechanik vollständig", d: "Alle 6 Versuche zur Mechanik durchgeführt", ok: themeDone("mech") },
      { t: "Akustik vollständig", d: "Alle 6 Versuche zur Akustik durchgeführt", ok: themeDone("akustik") },
      { t: "Astronomie & Geodäsie vollständig", d: "Alle 3 Versuche durchgeführt", ok: themeDone("astro") },
      { t: "Biomechanik & Wahrnehmung vollständig", d: "Alle 3 Versuche durchgeführt", ok: themeDone("bio") },
      { t: "Treffsichere Hypothesen", d: "10 Hypothesen durch die eigene Messung bestätigt (" + Math.min(hypOk, 10) + "/10)", ok: hypOk >= 10 },
      { t: "Alle Wissenstests bestanden", d: "Mindestens 2 von 3 Fragen in jedem Test (" + passed + "/18)", ok: passed >= 18 },
      { t: "Eigene Messreihe", d: "Eine Aufzeichnung aus „Freies Messen“ als CSV exportiert", ok: (fr.exports || 0) > 0 }
    ];
  }
  function renderProgress() {
    var done = doneSet(), n = Object.keys(done).length, t = tests(), passed = X.LIST.filter(function (e) { var r = t[e.id]; return r && r.best >= Math.ceil(r.total * 2 / 3); }).length;
    var l = prots(), hy = l.filter(function (p) { return p.hypo; }), hyOk = hy.filter(function (p) { return p.hypo.ok; }).length, circ = 2 * Math.PI * 35;
    var h = '<div class="card lb-sum"><svg width="92" height="92" viewBox="0 0 84 84" role="img" aria-label="' + n + ' von 18 Versuchen durchgeführt"><circle cx="42" cy="42" r="35" fill="none" class="ring-bg" stroke-width="9"/><circle cx="42" cy="42" r="35" fill="none" class="ring-fg" stroke-width="9" stroke-linecap="round" stroke-dasharray="' + (circ * n / 18) + " " + circ + '" transform="rotate(-90 42 42)"/><text x="42" y="44" text-anchor="middle" class="ring-n">' + n + '</text><text x="42" y="58" text-anchor="middle" class="ring-s">von 18</text></svg>' +
      '<div class="lb-sum-txt"><div class="lb-kicker">Versuche durchgeführt</div><div class="lb-sum-row"><span>Wissenstests bestanden</span><b>' + passed + ' / 18</b></div><div class="lb-sum-row"><span>Hypothesen bestätigt</span><b>' + hyOk + " / " + hy.length + '</b></div><div class="lb-sum-row"><span>Protokolle</span><b>' + l.length + "</b></div></div></div>";
    h += '<div class="card"><h2>Themenbereiche</h2>' + X.THEMES.map(function (th) { var it = X.LIST.filter(function (e) { return e.theme === th.id; }), k = it.filter(function (e) { return done[e.id]; }).length; return '<div class="lb-bar-row"><div class="lb-bar-l"><span>' + esc(th.title) + "</span><b>" + k + " / " + it.length + '</b></div><div class="lb-prog"><span style="width:' + (k / it.length * 100) + '%"></span></div></div>'; }).join("") + "</div>";
    h += '<div class="card"><h2>Nachweise</h2>' + achievements().map(function (a) { return '<div class="lb-ach' + (a.ok ? " ok" : "") + '"><span class="lb-ach-i" aria-hidden="true">' + (a.ok ? wi("check") : "") + '</span><div><b>' + esc(a.t) + '</b><span class="muted small">' + esc(a.d) + '</span></div><span class="sr-only">' + (a.ok ? "erreicht" : "offen") + "</span></div>"; }).join("") + "</div>";
    h += '<div class="card"><h2>Wissenstests</h2><table class="lb-table">' + X.LIST.map(function (e) { var r = t[e.id]; return "<tr><th>" + esc(e.title) + "</th><td>" + (r ? r.best + " / " + r.total + (r.best >= Math.ceil(r.total * 2 / 3) ? " · bestanden" : "") : "–") + "</td></tr>"; }).join("") + "</table></div>";
    $("lbProgress").innerHTML = h;
  }

  /* ---------- Freies Messen und Tongenerator ---------- */
  var FREE = (function () {
    var SENS = [
      { id: "acc", t: "Beschleunigung", icon: "M4 18 18 4M11 4h7v7M4 21h16", ch: ["x", "y", "z", "|a|"], unit: "m/s²", d: 2 },
      { id: "gyr", t: "Drehrate", icon: "M20 12a8 8 0 1 1-3-6.2M20 4v4h-4", ch: ["x", "y", "z"], unit: "rad/s", d: 2 },
      { id: "lvl", t: "Pegel", icon: "M4 9.5h3l4-3.5v12l-4-3.5H4zM15 9q2 3 0 6M18 7q3.5 5 0 10", ch: ["Lautstärke", "Rohwert"], units: ["dB (geschätzt)", "dB (roh)"], unit: "dB", d: 1 },
      { id: "pit", t: "Tonhöhe", icon: "M9 18V6l10-2v12M6.5 18a2.5 2.5 0 1 0 .01 0M16.5 16a2.5 2.5 0 1 0 .01 0", ch: ["f"], unit: "Hz", d: 1 },
      { id: "tlt", t: "Neigung", icon: "M3 19h18M5 19 19 9M16 19a4 4 0 0 0-1.6-3.2", ch: ["Längsachse", "Querachse"], unit: "°", d: 1 },
      { id: "gps", t: "Tempo (GPS)", icon: "M4 16a8 8 0 1 1 16 0M12 16l4-5M3.5 20h17", ch: ["v", "Genauigkeit"], unit: "km/h", d: 1 }
    ];
    /* Schätzung wie in LautstärkeWahr: Rohwert (bezogen auf den Vollausschlag) + 111 dB, unkalibriert */
    var LVL_OFFSET = 111;
    var cfg = load(LS.frei, {}) || {}, sel = cfg.sensor || "acc", on = false, rec = null, un = null, iv = 0, gw = null, A = null, buf = null, t0 = 0, MAXN = 120000;
    function sdef() { return SENS.filter(function (s) { return s.id === sel; })[0]; }
    function render() {
      $("lbFreeSens").innerHTML = SENS.map(function (s) { return '<button type="button" class="lb-sens' + (s.id === sel ? " on" : "") + '" data-sens="' + s.id + '" aria-pressed="' + (s.id === sel) + '"' + (on ? " disabled" : "") + ">" + ico(s.icon, 22) + "<span>" + esc(s.t).replace("Beschleunigung", "Beschleu&shy;nigung") + "</span></button>"; }).join("");
      $("lbFreeMain").textContent = on ? "Aufzeichnung beenden" : "Aufzeichnung starten"; $("lbFreeMain").classList.toggle("stop", on);
      $("lbFreeCsv").disabled = on || !rec || !rec.t.length; $("lbFreeNote").disabled = on || !rec || !rec.t.length;
      if (!rec) { $("lbFreeVals").innerHTML = sdef().ch.map(function (c) { return '<div class="stat"><b>–</b><span>' + esc(c) + "</span></div>"; }).join(""); S.plot($("lbFreeChart"), { series: [] }); $("lbFreeInfo").textContent = "Sensor wählen und Aufzeichnung starten. Die Daten bleiben im Arbeitsspeicher, bis du sie exportierst."; }
      toneUi();
    }
    function push(vals) {
      if (!rec) return;
      var t = performance.now() / 1000 - t0; rec.t.push(+t.toFixed(4)); vals.forEach(function (v, i) { rec.c[i].push(v); });
      if (rec.t.length >= MAXN) { stop(); toast("Maximale Länge der Aufzeichnung erreicht."); }
    }
    function start() {
      var s = sdef(); rec = { s: s.id, t: [], c: s.ch.map(function () { return []; }), start: Date.now() }; t0 = performance.now() / 1000;
      var ok = function () { on = true; iv = setInterval(draw, 200); S.wake(true); render(); };
      var err = function (e) { rec = null; alertMsg(e.message); render(); };
      if (s.id === "acc" || s.id === "gyr" || s.id === "tlt") {
        S.MOT.permit().then(function () {
          un = S.MOT.sub(function (m) {
            if (s.id === "acc") push([m.ax, m.ay, m.az, Math.hypot(m.ax, m.ay, m.az)]);
            else if (s.id === "gyr") push([m.gx, m.gy, m.gz]);
            else push([Math.atan2(m.ay, Math.hypot(m.ax, m.az)) * 180 / Math.PI, Math.atan2(m.ax, Math.hypot(m.ay, m.az)) * 180 / Math.PI]);
          }); ok();
        }, err);
      } else if (s.id === "lvl") {
        S.AUD.start(2048).then(function () { var tq = performance.now(); un = S.AUD.sub(function (d) { if (performance.now() - tq < 400) return; var q = 0; for (var i = 0; i < d.length; i++) q += d[i] * d[i]; q /= d.length; if (q <= 1e-11) return; var raw = 10 * Math.log10(q); push([Math.min(130, Math.max(0, raw + LVL_OFFSET)), raw]); }); ok(); }, err);
      } else if (s.id === "pit") {
        S.AUD.start(4096).then(function (a) { A = a; buf = new Float32Array(a.an.fftSize); var pi = setInterval(function () { if (!A) { clearInterval(pi); return; } A.an.getFloatTimeDomainData(buf); var r = C.yin(buf, A.sr, 50, 2000); push([r && r.q > 0.8 ? +r.f.toFixed(2) : NaN]); }, 50); un = function () { clearInterval(pi); }; ok(); }, err);
      } else if (s.id === "gps") {
        if (!navigator.geolocation) { err(new Error("Standortbestimmung ist nicht verfügbar.")); return; }
        gw = navigator.geolocation.watchPosition(function (p) { push([p.coords.speed != null && p.coords.speed >= 0 ? p.coords.speed * 3.6 : NaN, p.coords.accuracy]); }, function () { stop(); alertMsg("Der Standort konnte nicht bestimmt werden. Du kannst den Zugriff in den Einstellungen deines Browsers erlauben."); }, { enableHighAccuracy: true, maximumAge: 0 });
        ok();
      }
    }
    function stop(silent) {
      if (!on) return; on = false; clearInterval(iv);
      if (un) { un(); un = null; }
      if (gw != null) { navigator.geolocation.clearWatch(gw); gw = null; }
      if (A || sel === "lvl" || sel === "pit") { S.AUD.stop(); A = null; }
      S.wake(false);
      if (!silent || $("lbFreeVals")) { draw(true); render(); }
    }
    function draw(all) {
      if (!rec || !rec.t.length) return;
      var s = sdef(), n = rec.t.length, tl = rec.t[n - 1], i0 = 0;
      if (!all && on) { while (i0 < n && rec.t[i0] < tl - 10) i0++; }
      var ser = rec.c.map(function (c, k) { if ((s.id === "gps" || s.id === "lvl") && k === 1) return null; var th = S.thin(rec.t.slice(i0), c.slice(i0), 600); return { xs: th.xs, ys: th.ys, w: k === 3 ? 2.4 : 1.6, dots: s.id === "pit" || s.id === "gps", r: 1.8 }; }).filter(Boolean);
      S.plot($("lbFreeChart"), { series: ser, xlab: "s", ylab: s.units ? s.units[0] : s.unit, minSpan: s.id === "lvl" ? 10 : 0.2 });
      $("lbFreeVals").innerHTML = rec.c.map(function (c, k) {
        var fin = c.filter(isFinite), cur = c.length ? c[c.length - 1] : NaN, unit = s.units ? s.units[k] : s.id === "gps" && k === 1 ? "m" : s.unit;
        return '<div class="stat"><b>' + (isFinite(cur) ? f(cur, s.d) : "–") + '</b><span>' + esc(s.ch[k]) + " · " + esc(unit) + (fin.length ? "<br>min " + f(Math.min.apply(null, fin), s.d) + " · max " + f(Math.max.apply(null, fin), s.d) : "") + "</span></div>";
      }).join("");
      var rate = n > 1 ? (n - 1) / (tl - rec.t[0]) : 0;
      $("lbFreeInfo").textContent = (s.id === "lvl" ? "Geschätzt wie in LautstärkeWahr (Rohwert + 111 dB), unkalibriert. " : "") + (on ? "Aufzeichnung läuft · " : "Aufzeichnung beendet · ") + f(tl, 1) + " s · " + n.toLocaleString("de-DE") + " Messpunkte" + (rate ? " · ca. " + f(rate, 0) + " Hz" : "");
    }
    function exportCsv() {
      if (!rec || !rec.t.length) return;
      var s = sdef(), head = ["Zeit in s"].concat(s.ch.map(function (c, k) { return c + " in " + (s.units ? s.units[k] : s.id === "gps" && k === 1 ? "m" : s.unit); })), rows = [head];
      for (var i = 0; i < rec.t.length; i++) { var r = [f(rec.t[i], 4)]; for (var k = 0; k < rec.c.length; k++) r.push(isFinite(rec.c[k][i]) ? f(rec.c[k][i], s.id === "acc" || s.id === "gyr" ? 4 : 2) : ""); rows.push(r); }
      share(csv(rows), "LabWahr-" + s.t.replace(/[^A-Za-zÄÖÜäöüß]+/g, "-") + "-" + new Date(rec.start).toISOString().slice(0, 16).replace(/[T:]/g, "-") + ".csv", "text/csv");
      cfg.exports = (cfg.exports || 0) + 1; save(LS.frei, cfg);
    }
    function note() {
      if (!rec || !rec.t.length) return;
      var s = sdef(), tab = rec.c.map(function (c, k) { var fin = c.filter(isFinite), u = s.units ? s.units[k] : s.id === "gps" && k === 1 ? "m" : s.unit; return [s.ch[k], fin.length ? "Mittel " + f(C.mean(fin), s.d) + " · min " + f(Math.min.apply(null, fin), s.d) + " · max " + f(Math.max.apply(null, fin), s.d) + " " + u : "–"]; });
      var l = prots(); l.unshift({ id: uid(), exp: "frei", theme: "mech", ts: rec.start, title: "Freie Messung: " + s.t, text: f(rec.t[rec.t.length - 1], 1) + " s, " + rec.t.length + " Messpunkte", params: [["Sensor", s.t], ["Dauer", f(rec.t[rec.t.length - 1], 1) + " s"]], table: tab, note: "", main: "Freie Messung: " + s.t });
      saveProts(l); toast("Zusammenfassung im Protokoll notiert");
    }
    $("lbFreeSens").addEventListener("click", function (e) { var b = e.target.closest("[data-sens]"); if (!b || on) return; sel = b.getAttribute("data-sens"); cfg.sensor = sel; save(LS.frei, cfg); rec = null; render(); });
    $("lbFreeMain").addEventListener("click", function () { if (on) stop(); else start(); });
    $("lbFreeCsv").addEventListener("click", exportCsv);
    $("lbFreeNote").addEventListener("click", note);

    /* Tongenerator */
    var ton = load(LS.ton, null) || { f: 1000, v: 0.2, w: "sine" }; ton.v = Math.min(0.5, Math.max(0.02, +ton.v || 0.2));
    function toneUi() {
      var fr = $("lbToneF"); if (!fr) return;
      if (document.activeElement !== fr) fr.value = String(Math.round(ton.f));
      $("lbToneR").value = String(Math.log10(ton.f)); $("lbToneV").value = String(ton.v);
      Array.prototype.forEach.call(document.querySelectorAll("[data-wave]"), function (b) { var o = b.getAttribute("data-wave") === ton.w; b.classList.toggle("active", o); b.setAttribute("aria-checked", o); });
      $("lbToneBtn").textContent = S.AUD.toneOn() ? "Ton stoppen" : "Ton abspielen"; $("lbToneBtn").classList.toggle("stop", S.AUD.toneOn());
      $("lbToneOut").textContent = f(ton.f, ton.f < 100 ? 1 : 0) + " Hz · Lautstärke " + Math.round(ton.v * 200) + " %";
    }
    function apply() { ton.f = Math.min(20000, Math.max(20, ton.f)); save(LS.ton, ton); if (S.AUD.toneOn()) S.AUD.toneSet(ton.f, ton.v, ton.w); toneUi(); }
    $("lbToneF").addEventListener("change", function () { var n = parseFloat(this.value.replace(",", ".")); if (isFinite(n)) { ton.f = n; apply(); } });
    $("lbToneR").addEventListener("input", function () { ton.f = Math.round(Math.pow(10, +this.value)); apply(); });
    $("lbToneV").addEventListener("input", function () { ton.v = Math.min(0.5, +this.value); apply(); });
    $("lbTonePre").addEventListener("click", function (e) { var b = e.target.closest("[data-f]"); if (b) { ton.f = +b.getAttribute("data-f"); apply(); } var w = e.target.closest("[data-wave]"); if (w) { ton.w = w.getAttribute("data-wave"); apply(); } });
    $("lbToneBtn").addEventListener("click", function () { if (S.AUD.toneOn()) S.AUD.toneStop(); else S.AUD.toneStart(ton.f, ton.v, ton.w); toneUi(); });
    return { render: render, stop: stop, toneOff: function () { S.AUD.toneStop(); toneUi(); } };
  })();
  function showTab2(tab, anchor) { if (V.exp) closeExp(false); setTimeout(function () { showTab(tab); var el = $(anchor === "ton" ? "lbToneCard" : "lbFreeCard"); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 60); }

  /* ---------- Einführung ---------- */
  var onb = wzOnboarding({
    key: LS.onb,
    slides: [
      { icon: "flask", title: "Willkommen bei LabWahr", text: "18 physikalische Versuche aus Mechanik, Akustik, Astronomie und Biomechanik – gemessen mit den Sensoren deines Smartphones." },
      { icon: "list", title: "Wissenschaftlich vorgehen", text: "Jeder Versuch folgt demselben Ablauf: Fragestellung und Hypothese, Aufbau, Messung, Auswertung mit Messunsicherheit und ein kurzer Wissenstest." },
      { icon: "chart", title: "Freies Messen und Protokolle", text: "Zeichne Rohdaten aller Sensoren auf und exportiere sie als CSV. Alle Ergebnisse landen im Protokoll – auch als PDF." },
      { icon: "lock", title: "100 % lokal", text: "Mikrofon, Bewegungssensoren und Standort werden nur live ausgewertet. Es wird nichts aufgenommen oder übertragen; Protokolle bleiben auf deinem Gerät." }
    ]
  });
  window.LB = { showOnboarding: function () { onb.show(); } };
  $("showOnboardingBtn").addEventListener("click", function () { onb.show(); });

  /* ---------- Start ---------- */
  document.addEventListener("visibilitychange", function () { if (document.hidden) { FREE.stop(true); FREE.toneOff(); if (V.runner) try { V.runner.stop(); } catch (e) { } } });
  window.addEventListener("pagehide", function () { FREE.stop(true); FREE.toneOff(); killRunner(); });
  var h0 = (location.hash || "").slice(1);
  if (h0.indexOf("v-") === 0 && X.byId(h0.slice(2))) { showTab("versuche"); openExp(h0.slice(2), false); }
  else showTab(["versuche", "messen", "protokolle", "fortschritt"].indexOf(h0) !== -1 ? h0 : "versuche");
})();
