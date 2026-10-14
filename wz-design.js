/* ============================================================
   wz-design.js — Einheitlicher Aufbau für alle Apps der WahrZentrale
   (gehört zu wz-design.css)

   Was diese Datei macht – und was nicht:
   - Sie baut den Kopfbereich jeder App in dieselbe Form um:
     Zeile „WahrZentrale · Bereich“, App-Symbol, Titel, Kurzbeschreibung.
     Die ursprünglichen Elemente des Kopfes bleiben im Dokument (nur
     ausgeblendet) oder werden – wenn sie etwas anzeigen oder bedienen –
     unverändert in den neuen Kopf verschoben. Ereignisse, Kennungen und
     Klassen bleiben dabei erhalten, die Programmlogik der Apps wird
     nicht berührt.
   - Sie ergänzt in den Reiterleisten eigene Symbole (Linienstil der
     WahrZentrale) und markiert die Leiste, damit wz-design.css sie als
     einheitliche Tableiste am unteren Rand zeigt.
   - Beim Wechsel über die Tableiste springt die Seite nach oben.
   Alles läuft lokal, ohne Netz.
   ============================================================ */
(function () {
  "use strict";
  var root = document.documentElement;
  var app = root.getAttribute("data-wz-app") || "";
  var page = (location.pathname.split("/").pop() || "index.html").toLowerCase();

  var AREA = {
    hw: "Himmel", zh: "Himmel", as: "Himmel", kw: "Himmel", hz: "Himmel", sn: "Himmel",
    wk: "Unterwegs", kg: "Unterwegs", wow: "Unterwegs", bp: "Unterwegs",
    aw: "Alltag", pw: "Alltag", vw: "Alltag", ld: "Alltag", qr: "Alltag", lw: "Alltag", mw: "Alltag", lb: "Alltag",
    af: "Spiel & Klang", zw: "Spiel & Klang", kv: "Spiel & Klang", hk: "Spiel & Klang", pk: "Spiel & Klang",
    st: "Spiel & Klang", bw: "Spiel & Klang", kl: "Spiel & Klang",
    wz: ""
  };

  /* ---------- Symbole (eigene Zeichnungen, 24er-Raster, Linienstil) ---------- */
  var P = {
    messen: '<path d="M4.5 16.5a7.5 7.5 0 1 1 15 0"/><path d="M12 16.5l3.6-4.4"/><circle cx="12" cy="16.5" r="1.2"/><path d="M6.6 11.2l1 .8M12 8.9v1.3M17.4 11.2l-1 .8"/>',
    verlauf: '<path d="M4 19.5h16"/><path d="M5 15.5l4-4.5 3.2 2.8L19 7"/><circle cx="9" cy="11" r=".9"/><circle cx="12.2" cy="13.8" r=".9"/>',
    info: '<circle cx="12" cy="12" r="8.2"/><path d="M12 11v5.2"/><circle cx="12" cy="7.9" r=".6" fill="currentColor"/>',
    hoehe: '<path d="M7 20V7.5L10.5 4 14 7.5V20"/><path d="M4.5 20h15"/><path d="M18 4.5v11"/><path d="M16.5 6l1.5-1.5L19.5 6M16.5 14l1.5 1.5 1.5-1.5"/>',
    waage: '<rect x="3.5" y="9" width="17" height="6.5" rx="3.25"/><circle cx="12" cy="12.25" r="1.7"/><path d="M9 9v6.5M15 9v6.5"/>',
    neigung: '<path d="M4 19.5h16"/><path d="M4 19.5L17.5 7.5"/><path d="M10.5 19.5a6.5 6.5 0 0 0-1.9-4.6"/>',
    gewitter: '<path d="M7.2 15.5H6.5a3.5 3.5 0 0 1-.4-7A5 5 0 0 1 15.8 7a3.8 3.8 0 0 1 2 7.3"/><path d="M12.8 12.5l-2.6 4.2h3.2l-2 4"/>',
    liste: '<path d="M9 7h11M9 12h11M9 17h11"/><circle cx="5" cy="7" r=".9"/><circle cx="5" cy="12" r=".9"/><circle cx="5" cy="17" r=".9"/>',
    rundblick: '<path d="M3 18.5l5-6.5 3.5 4 3-3.5 6.5 6"/><path d="M3 18.5h18"/><path d="M5 9.5a10 10 0 0 1 14 0" stroke-dasharray="1.6 2.2"/>',
    spektrum: '<path d="M4 19.5h16"/><path d="M6 17v-3M9 17V9M12 17V5.5M15 17v-6M18 17v-2.5"/>',
    stimmen: '<path d="M9.5 3.5v7a2.5 2.5 0 0 0 5 0v-7"/><path d="M12 13v7.5"/><path d="M9.5 20.5h5"/>',
    ton: '<path d="M2.8 12c1.6 0 1.6-5 3.2-5s1.6 10 3.2 10 1.6-10 3.2-10 1.6 10 3.2 10 1.6-5 3.2-5h2.4"/>',
    momente: '<path d="M7 4h10v16l-5-3.6L7 20z"/><path d="M10 9.5h4"/>',
    versuche: '<path d="M10 3.5h4M10.5 3.5v5.3L5.6 17.6A2 2 0 0 0 7.4 20.5h9.2a2 2 0 0 0 1.8-2.9l-4.9-8.8V3.5"/><path d="M8 14.5h8"/>',
    protokolle: '<path d="M7 3.5h7.5L18 7v13.5H7z"/><path d="M14.5 3.5V7H18"/><path d="M9.5 11h6M9.5 14h6M9.5 17h4"/>',
    fortschritt: '<path d="M12 3.5a8.5 8.5 0 1 1-8.5 8.5"/><path d="M12 3.5a8.5 8.5 0 0 0-8.5 8.5" stroke-dasharray="1.4 2"/><path d="M8.5 12.2l2.3 2.3 4.7-4.8"/>',
    start: '<path d="M4 11.2L12 4.5l8 6.7"/><path d="M6.2 9.5v10h11.6v-10"/><path d="M10 19.5v-5h4v5"/>',
    entdecken: '<circle cx="12" cy="12" r="8.2"/><path d="M15.4 8.6l-2 4.8-4.8 2 2-4.8z"/>',
    karte: '<path d="M3.5 6.5l5.5-2 6 2 5.5-2v13l-5.5 2-6-2-5.5 2z"/><path d="M9 4.5v13M15 6.5v13"/>',
    wetter: '<circle cx="9" cy="8.5" r="3"/><path d="M9 3v1.2M3.5 8.5h1.2M5.1 4.6l.9.9M12.9 4.6l-.9.9"/><path d="M9.5 19.5H17a3.2 3.2 0 0 0 .3-6.4 4.5 4.5 0 0 0-8.6.9 2.8 2.8 0 0 0 .8 5.5z"/>',
    planer: '<rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/><path d="M8 14h2.5M13.5 14H16M8 17h2.5"/>',
    tipps: '<path d="M9 17.5h6M10 20.5h4"/><path d="M8.6 14.5A5.8 5.8 0 1 1 15.4 14.5c-.8.6-1.1 1.4-1.1 2.2V17.5H9.7v-.8c0-.8-.3-1.6-1.1-2.2z"/>',
    spiele: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="8.6" cy="8.6" r="1" fill="currentColor"/><circle cx="15.4" cy="15.4" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="15.4" cy="8.6" r="1" fill="currentColor"/><circle cx="8.6" cy="15.4" r="1" fill="currentColor"/>',
    einstellungen: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4L18 18M6 18l1.6-1.6M16.4 7.6L18 6"/>',
    sequencer: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M8 5v14M12.5 5v14M16.5 5v14"/><path d="M3.5 12h17" stroke-dasharray="1.4 2"/>'
  };
  function svg(name) {
    return '<svg class="wzd-tic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' + (P[name] || P.info) + "</svg>";
  }

  /* ---------- Zuordnung: Reiter → Symbol ---------- */
  var TABICON = {
    messen: "messen", verlauf: "verlauf", info: "info",
    hoehe: "hoehe", waage: "waage", neigung: "neigung", gewitter: "gewitter", liste: "liste",
    rundblick: "rundblick",
    spektrum: "spektrum", stimmen: "stimmen", ton: "ton", momente: "momente",
    versuche: "versuche", protokolle: "protokolle", fortschritt: "fortschritt",
    "page-home": "start", "page-explore": "entdecken", "page-map": "karte", "page-weather": "wetter",
    "page-planner": "planer", "page-tips": "tipps", "page-games": "spiele"
  };

  var SHORT = { "Reiseplaner": "Planer" };

  /* ---------- Kopf je App ----------
     head:  Kopf-Element der App
     keep:  Elemente, die sichtbar bleiben und in den neuen Kopf wandern
     acts:  Bedienknöpfe, die in die obere Kopfzeile wandern
     eyebrow/title/sub: feste Texte, sonst aus dem bisherigen Kopf gelesen */
  var DOC = { eyebrow: "WahrZentrale", icon: "icon-192.png" };
  var HEAD = {
    lw: { head: "header.wz-hero" }, mw: { head: "header.wz-hero" }, hz: { head: "header.wz-hero" },
    kl: { head: "header.wz-hero" }, lb: { head: "header.wz-hero" }, sn: { head: "header.wz-hero" },
    qr: { head: "header.wz-hero" }, aw: { head: "header.wz-hero" },
    pw: { head: ".pw-hero" }, vw: { head: "#home > .wz-hero, #home > div:first-child" },
    kw: { head: "header.kw-header", keep: ["#kw-location-name"] },
    as: { head: "header.topbar", lead: ["#backBtn"], acts: ["#wzHomeBtn", "#searchBtn"], mirror: "#brandHeader h1", sub: "Live-Himmel, Planeten, Horoskope und Tarot" },
    wk: { head: "header.topbar", lead: ["#btnBack"], acts: ["#wzHomeBtn", "#btnTheme"], mirror: "#pageTitle", sub: "Fahrten und Fußwege aufzeichnen – mit Karte, Navigation und Wetter" },
    kg: { head: "header.app-header", acts: [".back-home-btn", "#help-btn", "#theme-toggle-btn"], keep: ["#open-drawer-btn"], move: [{ sel: "nav.main-nav", after: true }], title: "Keysglade", sub: "Florida-Reisebegleiter – Strände, Städte, Wetter und Reiseplanung" },
    hw: { head: ".hw-topbar, .hw-header", acts: [".wz-inline-home"], keep: [".hw-hero-loc"] }
  };
  var HWPAGE = {
    "hw-index.html": { eyebrow: "WahrZentrale · Himmel", title: "HimmelsWahr", sub: "Wetter, Luft, Abendrot und Nachthimmel für deinen Ort" },
    "hw-abendrot.html": { eyebrow: "HimmelsWahr" }, "hw-umwelt.html": { eyebrow: "HimmelsWahr" },
    "hw-nachthimmel.html": { eyebrow: "HimmelsWahr" }, "hw-kompass.html": { eyebrow: "HimmelsWahr" },
    "hw-info.html": { eyebrow: "HimmelsWahr" }, "hw-einstellungen.html": { eyebrow: "HimmelsWahr" }
  };

  /* Textseiten der Zentrale (Impressum, Datenschutz, Einstellungen …) */
  var DOCSUB = {
    "impressum.html": "Anbieterangaben für die gesamte WahrZentrale",
    "datenschutz.html": "Welche Daten wann wohin gehen – und was auf deinem Gerät bleibt",
    "lizenzen.html": "Eigene Arbeit, mitgelieferte Bibliotheken und Datenquellen",
    "hinweise.html": "So liest du die Ampel der Prüf- und Mess-Apps",
    "wz-einstellungen.html": "Darstellung, Standort, Karten und Speicher – für alle Apps",
    "wz-sichern.html": "Eine Datei mit allen Daten aller Apps"
  };
  var DOCTITLE = { "datenschutz.html": "Datenschutz", "lizenzen.html": "Quellen & Lizenzen", "wz-sichern.html": "Sichern & Wiederherstellen" };
  function buildDocHead() {
    if (app !== "wz" || !DOCSUB[page]) return;
    var wrapEl = document.querySelector(".wz-doc-wrap"); if (!wrapEl) return;
    var h1 = wrapEl.querySelector("h1");
    var title = DOCTITLE[page] || txt(h1) || "WahrZentrale";
    var h = document.createElement("header");
    h.className = "wzd-head wzd-dochead";
    h.innerHTML =
      '<div class="wzd-headin"><div class="wzd-row"><span class="wzd-eyebrow">WahrZentrale</span><span class="wzd-acts">' +
      '<a class="wzd-act" href="./index.html" aria-label="Zur WahrZentrale" title="Zur WahrZentrale">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11.2L12 4.5l8 6.7"/><path d="M6.2 9.5v10h11.6v-10"/><path d="M10 19.5v-5h4v5"/></svg></a></span></div>' +
      '<div class="wzd-id"><img class="wzd-ico" src="./icon-192.png" alt="" width="56" height="56" decoding="async">' +
      '<div class="wzd-txt"><div class="wzd-title" role="heading" aria-level="1">' + esc(title) + '</div><p class="wzd-sub">' + esc(DOCSUB[page]) + "</p></div></div></div>";
    wrapEl.parentNode.insertBefore(h, wrapEl);
    // Hell/Dunkel wie in allen Apps rechts neben dem Haus-Knopf
    if (window.wzTheme && wzTheme.bind) {
      var dt = document.createElement("button");
      dt.type = "button"; dt.className = "wzd-act wzd-theme-added"; dt.setAttribute("data-wz-theme-toggle", "");
      h.querySelector(".wzd-acts").appendChild(dt);
      wzTheme.bind(dt);
    }
    if (h1) h1.classList.add("wzd-h1-hidden");
    root.classList.add("wzd-on", "wzd-doc");
  }

  function txt(el) { return el ? (el.textContent || "").replace(/\s+/g, " ").trim() : ""; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function buildHead() {
    var cfg = HEAD[app];
    if (app === "hw") { cfg = Object.assign({}, HEAD.hw, HWPAGE[page] || {}); }
    if (!cfg) return;
    var sels = cfg.head.split(",");
    var h = null;
    for (var i = 0; i < sels.length && !h; i++) h = document.querySelector(sels[i].trim());
    if (!h || h.classList.contains("wzd-head")) return;

    var title = cfg.title || txt(cfg.titleFrom ? document.querySelector(cfg.titleFrom) : h.querySelector("h1, .kw-logo-text, .hw-brand span")) || document.title.split("–")[0].trim();
    var sub = cfg.sub;
    if (!sub) {
      var ps = h.querySelectorAll("p");
      sub = ps.length ? txt(ps[0]) : "";
    }
    var note = "";
    if (app === "pw") { var p2 = h.querySelectorAll("p")[1]; note = txt(p2); }
    var eyebrow = cfg.eyebrow || ("WahrZentrale" + (AREA[app] ? " · " + AREA[app] : ""));
    var icon = (cfg.icon || (app + "-icon-192.png"));

    Array.prototype.forEach.call(h.children, function (c) { c.classList.add("wzd-orig"); });
    h.classList.add("wzd-head");
    var wrap = document.createElement("div");
    wrap.className = "wzd-headin";
    wrap.innerHTML =
      '<div class="wzd-row"><span class="wzd-lead"></span><span class="wzd-eyebrow">' + esc(eyebrow) + '</span><span class="wzd-acts"></span></div>' +
      '<div class="wzd-id"><img class="wzd-ico" src="./' + esc(icon) + '" alt="" width="56" height="56" decoding="async">' +
      '<div class="wzd-txt"><div class="wzd-title" role="heading" aria-level="1">' + esc(title) + "</div>" +
      (sub ? '<p class="wzd-sub">' + esc(sub) + "</p>" : "") +
      (note ? '<p class="wzd-note">' + esc(note) + "</p>" : "") + "</div></div>" +
      '<div class="wzd-meta"></div>';
    h.insertBefore(wrap, h.firstChild);
    var acts = wrap.querySelector(".wzd-acts"), meta = wrap.querySelector(".wzd-meta"), lead = wrap.querySelector(".wzd-lead");
    (cfg.lead || []).forEach(function (s) {
      Array.prototype.forEach.call(h.querySelectorAll(s), function (el) { el.classList.add("wzd-act"); lead.appendChild(el); });
    });
    (cfg.acts || []).forEach(function (s) {
      Array.prototype.forEach.call(h.querySelectorAll(s), function (el) { el.classList.add("wzd-act"); acts.appendChild(el); });
    });
    (cfg.keep || []).forEach(function (s) {
      var el = h.querySelector(s); if (el) { el.classList.add("wzd-kept"); meta.appendChild(el); }
    });
    if (!meta.children.length) meta.remove();
    else placeMeta(wrap, meta);
    (cfg.move || []).forEach(function (m) {
      var el = h.querySelector(m.sel); if (el && m.after) h.parentNode.insertBefore(el, h.nextSibling);
    });
    root.classList.add("wzd-on");
    if (cfg.mirror) mirrorTitle(document.querySelector(cfg.mirror), title, eyebrow, wrap);
    moveFloats(acts, lead);
    if (!acts.querySelector('a[href^="./index.html"]') && app !== "kg" && cfg.homeHref !== false) {
      // Seiten ohne eigenen Heimknopf (z. B. Unterseiten von HimmelsWahr) bekommen denselben wie alle anderen
      var hb = document.createElement("a");
      hb.className = "wzd-act wzd-home-added"; hb.href = "./index.html" + (AREA[app] ? "#" + ({ "Himmel": "himmel", "Unterwegs": "unterwegs", "Alltag": "alltag", "Spiel & Klang": "spiel" }[AREA[app]] || "") : "");
      hb.setAttribute("aria-label", "Zur WahrZentrale"); hb.title = "Zur WahrZentrale";
      hb.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11.2L12 4.5l8 6.7"/><path d="M6.2 9.5v10h11.6v-10"/><path d="M10 19.5v-5h4v5"/></svg>';
      acts.insertBefore(hb, acts.firstChild);
    }
    if (app === "hw" && !acts.querySelector("[data-wz-theme-toggle]") && window.wzTheme && wzTheme.bind) {
      // HimmelsWahr: Hell/Dunkel sitzt wie in allen anderen Apps rechts im Kopf (bisher nur im Hinweise-Blatt)
      var tb = document.createElement("button");
      tb.type = "button"; tb.className = "wzd-act wzd-theme-added"; tb.setAttribute("data-wz-theme-toggle", "");
      acts.appendChild(tb);
      wzTheme.bind(tb);
      if (wzTheme.onChange) wzTheme.onChange(function () { try { if (window.hwUpdateThemeMeta) hwUpdateThemeMeta(wzTheme.isDark() ? "dark" : "light"); if (window.hwApplySky) hwApplySky(); } catch (e) { } });
    }
    if (app === "as" && !acts.querySelector("[data-wz-theme-toggle], #themeToggle") && window.wzTheme && wzTheme.bind) {
      // AstroWahr: Hell/Dunkel wie überall rechts im Kopf (bisher nur unter „Mehr“ › Einstellungen)
      var ab = document.createElement("button");
      ab.type = "button"; ab.className = "wzd-act wzd-theme-added"; ab.setAttribute("data-wz-theme-toggle", "");
      acts.appendChild(ab);
      wzTheme.bind(ab);
    }
    if (app === "wk" && window.wzTheme && wzTheme.paint) {
      // NaviWahr: gleiches Mond-/Sonnen-Symbol wie in allen Apps (Mond = Dunkelmodus einschalten)
      var wb = document.getElementById("btnTheme"); if (wb && !wb.__wzThemePainted) wzTheme.paint(wb);
    }
    if (app === "kw") kwSubview(wrap, eyebrow);
    bleed(h);
    window.addEventListener("resize", function () { bleed(h); });
    window.addEventListener("orientationchange", function () { setTimeout(function () { bleed(h); }, 300); });
  }

  /* Ort- bzw. Merkliste-Pille: läuft hinter der Kurzbeschreibung mit (eine Zeile weniger im Kopf).
     Auf kompakten Unterseiten (KompassWahr), wo Symbol und Beschreibung ausgeblendet sind,
     steht sie wie bisher unter der Kopfzeile. */
  function placeMeta(wrap, meta) {
    var txtBox = wrap.querySelector(".wzd-txt"); if (!txtBox) return;
    var line = document.createElement("div");
    line.className = "wzd-subline";
    var sub = txtBox.querySelector(".wzd-sub");
    if (sub) line.appendChild(sub);
    txtBox.appendChild(line);
    function sync() {
      var compact = root.classList.contains("wzd-subview");
      if (compact && meta.parentNode !== wrap) wrap.appendChild(meta);
      else if (!compact && meta.parentNode !== line) line.appendChild(meta);
    }
    sync();
    try { new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ["class"] }); } catch (e) { }
  }

  /* Knöpfe, die bisher frei über der Seite schwebten (Home, Hell/Dunkel,
     Einstellungen, Standort …), sitzen jetzt fest im Kopf und laufen mit ihm
     weg – so liegt beim Scrollen nichts über dem Inhalt. Reihenfolge überall:
     Home, weitere Knöpfe, Hell/Dunkel. Zurück-Pfeile stehen links. */
  function moveFloats(acts, lead) {
    var list = Array.prototype.filter.call(document.body.children, function (el) {
      return el.matches && el.matches(".wz-hbtn, .kw-float, a.home-link");
    });
    if (!list.length) return;
    function rank(el) {
      var s = (el.id + " " + el.className + " " + (el.getAttribute("aria-label") || "")).toLowerCase();
      if (/back|zurück/.test(s)) return -1;
      if (/home|zentrale/.test(s)) return 0;
      if (/theme|dunkel|hell/.test(s)) return 2;
      return 1;
    }
    list.sort(function (a, b) { return rank(a) - rank(b); });
    list.forEach(function (el) {
      el.classList.add("wzd-act", "wzd-was-float");
      if (rank(el) < 0) lead.appendChild(el); else acts.appendChild(el);
    });
  }

  /* KompassWahr: auf den Unterseiten kompakter Kopf „Zurück · Seitenname“ */
  function kwSubview(wrap, eyebrow) {
    var eb = wrap.querySelector(".wzd-eyebrow");
    var NAMES = { kompass: "Kompass", umfeld: "Umfeld", orte: "Orte", wegpunkte: "Wegpunkte" };
    function sync() {
      var sub = !document.body.classList.contains("kw-on-start");
      var act = document.querySelector(".kw-page.kw-page-active");
      var key = act ? act.id.replace("kw-page-", "") : "";
      root.classList.toggle("wzd-subview", sub);
      eb.textContent = sub ? (NAMES[key] || "KompassWahr") : eyebrow;
    }
    sync();
    try { new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ["class"] }); } catch (e) { }
  }

  /* Der Kopf reicht immer bis an den Bildschirmrand und bis ganz nach oben –
     auch wenn er in einem Behälter mit Innenabstand steht. */
  function bleed(h) {
    ["margin-left", "margin-right", "margin-top"].forEach(function (k) { h.style.removeProperty(k); });
    if (!h.getClientRects().length) return;
    var r = h.getBoundingClientRect(), W = document.documentElement.clientWidth;
    var top = r.top + (window.pageYOffset || 0);
    if (r.left > 0.5) h.style.setProperty("margin-left", (-r.left) + "px", "important");
    if (W - r.right > 0.5) h.style.setProperty("margin-right", (-(W - r.right)) + "px", "important");
    if (top > 0.5) h.style.setProperty("margin-top", (-top) + "px", "important");
  }

  /* Unterseiten (AstroWahr, NaviWahr): Ändert die App ihren Seitentitel,
     zeigt der Kopf die kompakte Form „Zurück · Titel“. */
  function mirrorTitle(src, appTitle, eyebrow, wrap) {
    if (!src) return;
    var eb = wrap.querySelector(".wzd-eyebrow");
    function sync() {
      var t = txt(src);
      var sub = !!t && t !== appTitle;
      root.classList.toggle("wzd-subview", sub);
      eb.textContent = sub ? t : eyebrow;
    }
    sync();
    try { new MutationObserver(sync).observe(src, { childList: true, characterData: true, subtree: true }); } catch (e) { }
  }

  /* ---------- Tableiste unten ---------- */
  var BAR = [".tabs", "nav.sn-tabs", "nav.bottom-nav", "nav.hw-nav", "nav.main-nav"];
  var BAR_APPS = { lw: 1, mw: 1, hz: 1, kl: 1, lb: 1, sn: 1, as: 1, hw: 1, kg: 1 };
  function decorateBar() {
    if (!BAR_APPS[app]) return true;
    var bar = null;
    for (var i = 0; i < BAR.length && !bar; i++) bar = document.querySelector(BAR[i]);
    if (!bar || bar.classList.contains("wzd-bar")) return !!bar;
    bar.classList.add("wzd-bar");
    root.classList.add("wzd-has-bar");
    var items = bar.querySelectorAll("button, a");
    if (items.length > 5) bar.classList.add("wzd-many");
    Array.prototype.forEach.call(items, function (b) {
      var key = b.getAttribute("data-tab") || b.getAttribute("data-nav-target") || "";
      if (TABICON[key] && !b.querySelector("svg")) {
        var label = txt(b);
        b.innerHTML = svg(TABICON[key]) + '<span class="wzd-tlabel">' + esc(SHORT[label] || label) + "</span>";
        if (SHORT[label]) b.setAttribute("aria-label", label);
      }
      b.addEventListener("click", function () {
        var was = b.classList.contains("active") || b.getAttribute("aria-current") === "page" || b.getAttribute("aria-selected") === "true";
        if (!was) setTimeout(function () { try { window.scrollTo(0, 0); } catch (e) { } }, 0);
      });
    });
    return true;
  }

  function watchScroll() {
    var on = false, q = false;
    function upd() { q = false; var y = window.pageYOffset || 0; var s = y > 90; if (s !== on) { on = s; root.classList.toggle("wzd-scrolled", s); } }
    window.addEventListener("scroll", function () { if (!q) { q = true; requestAnimationFrame(upd); } }, { passive: true });
    upd();
  }

  /* Leisten, die eine App bei jedem Seitenwechsel neu zeichnet (BelegParkWahr):
     werden bei jeder Änderung wieder markiert. Ohne Platzhalter am Seitenende –
     dort rollt nur der eigene Inhaltsbereich der App. */
  function watchLateBars(sel) {
    function mark() {
      Array.prototype.forEach.call(document.querySelectorAll(sel + ":not(.wzd-bar)"), function (b) {
        b.classList.add("wzd-bar"); if (b.children.length > 5) b.classList.add("wzd-many");
      });
    }
    mark();
    try { new MutationObserver(mark).observe(document.body, { childList: true, subtree: true }); } catch (e) { }
  }

  /* Bildschirmtastatur: Solange ein Eingabefeld aktiv ist, tritt die Tableiste
     zurück – sonst schiebt das System sie über die Tastatur und sie verdeckt das Feld. */
  function isField(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.isContentEditable) return true;
    var tag = el.tagName;
    if (tag === "TEXTAREA" || tag === "SELECT") return true;
    if (tag !== "INPUT") return false;
    var ty = (el.getAttribute("type") || "text").toLowerCase();
    return ["button", "submit", "reset", "checkbox", "radio", "range", "color", "file", "image", "hidden"].indexOf(ty) === -1;
  }
  function watchTyping() {
    document.addEventListener("focusin", function (e) { if (isField(e.target)) root.classList.add("wzd-typing"); }, true);
    document.addEventListener("focusout", function () {
      setTimeout(function () { if (!isField(document.activeElement)) root.classList.remove("wzd-typing"); }, 120);
    }, true);
  }

  function init() {
    try { watchScroll(); } catch (e) { }
    try { watchTyping(); } catch (e) { }
    if (app === "bp") { try { watchLateBars(".nav-tile-strip"); } catch (e) { } }
    try { buildDocHead(); } catch (e) { }
    try { buildHead(); } catch (e) { /* Kopf bleibt im Zweifel unverändert */ }
    try {
      if (!decorateBar()) {
        // Leisten, die erst das App-Skript erzeugt (z. B. HimmelsWahr): kurz nachsehen
        var n = 0, t = setInterval(function () { if (decorateBar() || ++n > 40) clearInterval(t); }, 50);
      }
    } catch (e) { }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
