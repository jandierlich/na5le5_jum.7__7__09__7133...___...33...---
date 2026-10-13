/* ============================================================
   wz-theme.js — Gemeinsamer Hell-/Dunkelmodus für die GESAMTE
   WahrZentrale (Zentrale, alle 26 Apps, alle Unterseiten).

   - Standard: beim ersten Start immer Hellmodus – unabhängig von der
     Smartphone-Einstellung.
   - Ein Schalter für alles: egal in welcher App umgeschaltet wird, alle
     anderen Apps folgen (Eintrag "wz_theme").
   - Brücke zu den App-eigenen Schaltern: Einige Apps haben einen eigenen
     Umschalter mit eigenem Speicher-Eintrag (z. B. "hw-theme-pref" in
     HimmelsWahr). Diese Einträge werden hier VOR dem Start der App auf den
     gemeinsamen Wert gesetzt, und wenn eine App ihren Eintrag ändert, wird
     das sofort als gemeinsamer Wert übernommen. So bleibt der Code der
     einzelnen Apps unverändert und trotzdem gibt es nur einen Schalter.
   - Wird im <head> als erstes Skript geladen (blockierend, winzig, offline
     gecacht), damit beim Öffnen nichts hell aufblitzt.

   Setzt die Klasse "theme-dark" und das Attribut data-theme="dark|light"
   auf <html>.

   API (global):
     wzTheme.isDark()          -> boolean
     wzTheme.set(true|false)   -> Dunkel/Hell festlegen
     wzTheme.toggle()
     wzTheme.onChange(fn)      -> fn(isDark) bei jedem Wechsel
     wzTheme.bind(element)     -> beliebigen Button nachträglich verdrahten
   ============================================================ */
(function (global) {
  "use strict";

  var KEY = "wz_theme";
  // Frühere, pro App getrennte Speicherstellen – werden einmalig aufgeräumt.
  var LEGACY_KEYS = ["pw_theme", "vw_theme", "qr_theme", "kw_theme", "lw_theme", "alltagwahr_theme", "hw-theme"];
  // App-eigene Schalter, die dem gemeinsamen Wert folgen (Wert: "dark" | "light")
  var BRIDGE_KEYS = ["hw-theme-pref", "wk-theme", "astrowahr.theme", "reisewahr-theme", "ztw-theme", "beatwahr_theme"];
  var DARK_META = "#1E1B2E";
  var root = document.documentElement;
  var listeners = [];
  var buttons = [];
  var store = null;
  try { store = global.localStorage; } catch (e) { store = null; }
  var proto = global.Storage && global.Storage.prototype;
  var rawSet = proto ? proto.setItem : null;
  var rawRemove = proto ? proto.removeItem : null;

  /* ---------- Farbwelt ----------
     Standard ist "Nachthimmel". Daneben gibt es genau eine eigene Farbwelt, die man in den
     Einstellungen mit zwei Reglern mischt: Farbton und Farbstärke. Sie gilt für ALLE Apps.
     "wz_palette" = "eigene" schaltet sie ein, "wz_palette_custom" = { hue: 0–359, sat: 0–1.2 }
     enthält die Werte. Umgefärbt werden nur die violetten Töne der Oberfläche; Helligkeit und
     Kontrast jeder einzelnen Farbe bleiben genau erhalten (gleiche relative Leuchtdichte),
     Ampel- und Inhaltsfarben bleiben unberührt. Die Farbwerte werden hier beim Laden berechnet
     und als Stilregel eingesetzt – es wird keine Datei nachgeladen und nichts übertragen.
     SRC_P / SRC_Q: alle violetten Ausgangsfarben der Oberfläche (als --wzp-… bzw. --wzq-… in den
     Stilen der Apps hinterlegt). */
  var PALETTE_KEY = "wz_palette", CUSTOM_KEY = "wz_palette_custom";
  // frühere feste Farbwelten werden als eigene Farbwelt mit denselben Werten weitergeführt
  var LEGACY_PAL = { nachtblau: [218, 1], abendrot: [336, 0.92], bernstein: [28, 0.95], graphit: [258, 0.10] };
  var SRC_P = "0b0921 0d0a1c 150f2c 15102a 15113a 17142f 191620 1b1638 1b1823 1b1840 1c1940 1d1a24 1e1723 1e1b26 1e1b2e 1f1b2a 211a55 221e36 231e3c 231f2d 23202b 23202c 241748 241e3f 241f47 241f4d 251f3a 252148 25222f 28223b 292633 2a1f55 2a243a 2a2440 2a2650 2b2130 2b2150 2b2346 2c2440 2c2555 2e2446 2e2a3b 2e2a57 2f2848 302c3a 302c3b 342b4e 34313e 362c52 363241 382f57 3a2380 3a2e52 3a3170 3a3566 3b2585 3e3a48 3f3560 464155 4a3d56 4a3d6b 4b2fa0 4b3f72 4e4a59 524370 553d8c 575363 584f72 5a2fbe 5b3fa0 5c4c82 605c6c 6a3fa8 6a4fd0 6c5aa0 6e4fe0 6e50ae 7b3fe4 7c5cff 847e97 8a7fa8 8a86ff 8b6cf0 8b7ff2 8b86a8 8e75f0 928e9d 9791be 9a8fc0 a19dac a59dbe a59eb9 a742ff a79bff a79fd0 aba0ce b1a9c9 b6abe8 b9a6f5 b9b2cf bbb8c3 c3b2f0 c3b5ff c4aef0 c4b4e6 c6c0d6 c6c3ce c7b3ec c7c0d6 c9a6ff c9b8f7 c9beea cbc6d9 ccc6dd cfc9e0 cfd0f5 d0cde6 d4c6f0 d6bef4 d6ccf5 d8ccfa d8d0fa d8d2ff d9d4e8 d9d4ee dac7f2 dcd2f0 dcd7ea dcd8e9 e0d6f4 e3e0ee e4e0ef e4e1f5 e6ddf7 e8e4ff e9e8ec ebe3fa ece5fa ece6f8 ece7fb ece9fa eceaf6 ede7f8 eee9f8 eeeaf8 efe9fa f0e6f8 f1ecff f1edfb f1eefa f1eefb f1effa f3effb f3f1fa f3f2fa f5f3ff f7f6fc f8f6fc";
  var SRC_Q = "040214 040218 05031e 08061e 0a0418 0a061e 0a070c 0a0814 0a081e 0c0928 0d0a1c 0f0823 0f0c28 100a24 120a28 140c32 140e18 141023 141032 141123 141228 14141e 17142f 1b1638 1c1838 1e1932 1e1b2e 1e1b3a 221c38 221d34 231450 231e3c 231f30 23202b 241748 241e3f 292633 2a2440 3a1e8c 423e4e 4b3f72 5a14a0 5a2fbe 5a4696 7828ff 7850ff 7864b4 786ea0 a742ff aba0ce b4aad2 b4aadc b6abe8 b9a6f5 c3b5ff c7c0d6 cfc9e8 f1edfb f1eefa f1eefb f7f6fc f8f6fc f8f6ff faf8ff";
  function readCustom() {
    try {
      var c = JSON.parse((store && store.getItem(CUSTOM_KEY)) || "null");
      if (c && isFinite(+c.hue) && isFinite(+c.sat)) return { hue: ((Math.round(+c.hue) % 360) + 360) % 360, sat: Math.max(0, Math.min(1.2, +c.sat)) };
    } catch (e) { }
    return null;
  }
  function storedPalette() {
    try {
      var v = store ? store.getItem(PALETTE_KEY) : null;
      if (v && LEGACY_PAL[v]) { rawWrite(CUSTOM_KEY, JSON.stringify({ hue: LEGACY_PAL[v][0], sat: LEGACY_PAL[v][1] })); rawWrite(PALETTE_KEY, "eigene"); v = "eigene"; }
      return v === "eigene" && readCustom() ? "eigene" : "nachthimmel";
    } catch (e) { return "nachthimmel"; }
  }
  function paletteInfo(id) {
    if (id === "eigene") { var c = readCustom() || { hue: 258, sat: 1 }; return { id: "eigene", name: "Eigene Farbwelt", hue: c.hue, sat: c.sat }; }
    return { id: "nachthimmel", name: "Nachthimmel", hue: null, sat: 1 };
  }
  // Farbton verschieben, relative Leuchtdichte beibehalten
  function lin(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  function lumi(c) { return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]); }
  function toHls(c) {
    var r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, sat = 0, d = mx - mn;
    if (d) { sat = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
    return [h, l, sat];
  }
  function fromHls(h, l, sat) {
    function f(n) { var k = (n + h / 30) % 12, a = sat * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }
    return [f(0), f(8), f(4)];
  }
  // custom (optional): { hue, sat } für eine Vorschau, ohne etwas zu speichern
  function shiftColor(hex, id, custom) {
    var p = custom ? { id: "eigene", hue: +custom.hue, sat: +custom.sat } : paletteInfo(id || storedPalette());
    var m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || "").trim());
    if (!m || p.id === "nachthimmel") return hex;
    var x = m[1].length === 3 ? m[1].replace(/(.)/g, "$1$1") : m[1];
    var c = [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16)];
    var hl = toHls(c);
    if (hl[2] < 0.07 || hl[0] < 236 || hl[0] > 292 || hl[1] <= 0.02 || hl[1] >= 0.99) return hex;
    var nh = p.hue === null ? hl[0] : (hl[0] + p.hue - 258 + 360) % 360, ns = Math.min(1, hl[2] * p.sat), want = lumi(c), lo = 0, hi = 1;
    for (var i = 0; i < 30; i++) { var mid = (lo + hi) / 2; if (lumi(fromHls(nh, mid, ns)) < want) lo = mid; else hi = mid; }
    var o = fromHls(nh, (lo + hi) / 2, ns);
    return "#" + o.map(function (v) { return ("0" + Math.max(0, Math.min(255, v)).toString(16)).slice(-2); }).join("").toUpperCase();
  }
  function paletteCss() {
    var out = [], a = SRC_P.split(" "), i, c;
    for (i = 0; i < a.length; i++) out.push("--wzp-" + a[i] + ":" + shiftColor("#" + a[i], "eigene"));
    a = SRC_Q.split(" ");
    for (i = 0; i < a.length; i++) { c = shiftColor("#" + a[i], "eigene"); out.push("--wzq-" + a[i] + ":" + parseInt(c.slice(1, 3), 16) + "," + parseInt(c.slice(3, 5), 16) + "," + parseInt(c.slice(5, 7), 16)); }
    return 'html[data-wz-palette="eigene"]{' + out.join(";") + "}";
  }
  function applyPalette() {
    var id = storedPalette(), st = document.getElementById("wz-palette-css");
    if (st && st.tagName !== "STYLE") { try { st.parentNode.removeChild(st); } catch (e) { } st = null; }
    if (id === "nachthimmel") { root.removeAttribute("data-wz-palette"); if (st) st.textContent = ""; return; }
    var css = "";
    try { css = paletteCss(); } catch (e) { root.removeAttribute("data-wz-palette"); return; }
    if (!st) { st = document.createElement("style"); st.id = "wz-palette-css"; (document.head || root).appendChild(st); }
    if (st.textContent !== css) st.textContent = css;
    root.setAttribute("data-wz-palette", "eigene");
  }

  var ICON_MOON = '<svg class="wzi" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.5 15.2A8 8 0 1110.3 4.1a6.4 6.4 0 108.2 11.1z" fill="currentColor"/></svg>';
  var ICON_SUN = '<svg class="wzi" viewBox="0 0 24 24" aria-hidden="true"><g stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2" fill="currentColor" stroke="none"/><line x1="12" y1="1.8" x2="12" y2="4.2"/><line x1="12" y1="19.8" x2="12" y2="22.2"/><line x1="1.8" y1="12" x2="4.2" y2="12"/><line x1="19.8" y1="12" x2="22.2" y2="12"/><line x1="4.6" y1="4.6" x2="6.3" y2="6.3"/><line x1="17.7" y1="17.7" x2="19.4" y2="19.4"/><line x1="4.6" y1="19.4" x2="6.3" y2="17.7"/><line x1="17.7" y1="6.3" x2="19.4" y2="4.6"/></g></svg>';

  function rawWrite(k, v) { try { if (store && rawSet) rawSet.call(store, k, v); } catch (e) { } }
  function rawDelete(k) { try { if (store && rawRemove) rawRemove.call(store, k); } catch (e) { } }

  function stored() {
    try {
      var v = store ? store.getItem(KEY) : null;
      return v === "dark" || v === "light" ? v : null;
    } catch (e) { return null; }
  }
  function isDark() { return stored() === "dark"; }

  // Gemeinsamen Wert in die App-eigenen Einträge spiegeln
  function syncBridge(dark) {
    var v = dark ? "dark" : "light";
    for (var i = 0; i < BRIDGE_KEYS.length; i++) {
      try { if (store && store.getItem(BRIDGE_KEYS[i]) !== v) rawWrite(BRIDGE_KEYS[i], v); } catch (e) { }
    }
  }

  function paintButton(btn, dark) {
    btn.innerHTML = dark ? ICON_SUN : ICON_MOON;
    var label = dark ? "Hellmodus einschalten" : "Dunkelmodus einschalten";
    btn.setAttribute("aria-label", label);
    btn.setAttribute("title", label);
  }

  // Apps mit reiner Nachtansicht (Spiele, LosDenkWahr) tragen data-wz-fixed="dark"
  var FIXED = root.getAttribute("data-wz-fixed");
  function apply() {
    var dark = FIXED === "dark" ? true : isDark();
    root.classList.toggle("theme-dark", dark);
    root.setAttribute("data-theme", dark ? "dark" : "light");
    root.style.colorScheme = dark ? "dark" : "light";
    if (document.body) document.body.classList.toggle("wz-dark", dark);
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metas.length; i++) {
      var m = metas[i];
      if (!m.hasAttribute("data-light")) m.setAttribute("data-light", m.getAttribute("content") || "#5A2FBE");
      setMeta(m, dark ? DARK_META : m.getAttribute("data-light"));
    }
    for (var b = 0; b < buttons.length; b++) paintButton(buttons[b], isDark());
    for (var l = 0; l < listeners.length; l++) {
      try { listeners[l](dark); } catch (e) { }
    }
  }

  // theme-color der Statusleiste an die Farbwelt anpassen – auch wenn eine App ihn selbst setzt
  var metaGuard = false;
  function setMeta(m, v) { metaGuard = true; m.setAttribute("content", shiftColor(v)); metaGuard = false; }
  function watchMetas() {
    if (!global.MutationObserver) return;
    new MutationObserver(function (list) {
      if (metaGuard || storedPalette() === "nachthimmel") return;
      list.forEach(function (r) {
        var m = r.target; if (!m || m.getAttribute("name") !== "theme-color") return;
        var v = m.getAttribute("content"), sv = shiftColor(v);
        if (sv !== v) setMeta(m, v);
      });
    }).observe(document.head || root, { attributes: true, attributeFilter: ["content"], subtree: true });
  }

  function paletteChanged() {
    applyPalette();
    // theme-color neu berechnen (Originalwerte stehen in data-light bzw. werden neu gelesen)
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metas.length; i++) { var m = metas[i]; setMeta(m, isDark() || FIXED === "dark" ? DARK_META : (m.getAttribute("data-light") || m.getAttribute("content"))); }
    for (var l = 0; l < listeners.length; l++) { try { listeners[l](isDark()); } catch (e) { } }
  }
  function setPalette(id) {
    if (id === "eigene") { if (!readCustom()) rawWrite(CUSTOM_KEY, JSON.stringify({ hue: 258, sat: 1 })); rawWrite(PALETTE_KEY, "eigene"); }
    else rawDelete(PALETTE_KEY);
    paletteChanged();
  }
  // Eigene Farbwelt setzen und einschalten: hue 0–359 (Farbton), sat 0–1.2 (Farbstärke)
  function setCustomPalette(c) {
    var hue = ((Math.round(+c.hue) % 360) + 360) % 360, sat = Math.max(0, Math.min(1.2, +c.sat));
    if (!isFinite(hue) || !isFinite(sat)) return;
    rawWrite(CUSTOM_KEY, JSON.stringify({ hue: hue, sat: Math.round(sat * 100) / 100 })); rawWrite(PALETTE_KEY, "eigene");
    paletteChanged();
  }

  function set(dark) {
    if (dark) rawWrite(KEY, "dark"); else rawDelete(KEY);
    syncBridge(dark);
    apply();
  }
  function toggle() { set(!isDark()); }

  function bind(btn) {
    if (!btn || btn.__wzThemeBound) return;
    btn.__wzThemeBound = true;
    buttons.push(btn);
    paintButton(btn, isDark());
    btn.addEventListener("click", function (e) { e.preventDefault(); toggle(); });
  }

  function bindAll() {
    var list = document.querySelectorAll("[data-wz-theme-toggle]");
    for (var i = 0; i < list.length; i++) bind(list[i]);
    apply(); // theme-color-Metas, die erst nach diesem Skript im <head> stehen
  }

  // Brücke: ändert eine App ihren eigenen Eintrag, gilt das für alle Apps
  if (proto && rawSet && !proto.__wzThemeHook) {
    proto.__wzThemeHook = true;
    proto.setItem = function (k, v) {
      rawSet.apply(this, arguments);
      if (this === store && BRIDGE_KEYS.indexOf(k) !== -1) {
        var val = String(v);
        var dark = val === "dark" || (val === "system" && global.matchMedia && global.matchMedia("(prefers-color-scheme: dark)").matches);
        if (dark !== isDark()) set(dark); else syncBridge(dark);
      }
    };
  }

  // Einmaliges Aufräumen der alten, getrennten Einstellungen
  for (var k = 0; k < LEGACY_KEYS.length; k++) rawDelete(LEGACY_KEYS[k]);

  syncBridge(isDark());
  applyPalette();
  apply();
  watchMetas();

  global.addEventListener("storage", function (e) {
    if (e.key === KEY) { syncBridge(isDark()); apply(); }
    if (e.key === PALETTE_KEY || e.key === CUSTOM_KEY) { applyPalette(); apply(); }
  });
  global.addEventListener("pageshow", function () { syncBridge(isDark()); applyPalette(); apply(); }); // Zurück-Navigation aus dem Cache

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bindAll);
  else bindAll();

  /* ---------- Zwei-Finger-Zoom überall unterbinden ----------
     das System ignoriert "user-scalable=no" im Viewport-Meta, daher zusätzlich die
     WebKit-Gesten und Mehrfinger-Bewegungen abfangen. Doppeltipp-Zoom
     verhindert "touch-action: manipulation" in wz-common.css / wz-unify.css. */
  function blockGesture(e) { e.preventDefault(); }
  document.addEventListener("gesturestart", blockGesture, { passive: false });
  document.addEventListener("gesturechange", blockGesture, { passive: false });
  document.addEventListener("gestureend", blockGesture, { passive: false });
  document.addEventListener("touchmove", function (e) {
    if (e.touches && e.touches.length > 1) e.preventDefault();
  }, { passive: false });

  /* ---------- Volle Bildschirmhöhe (gegen Balken am unteren Rand) ----------
     Als App vom Home-Bildschirm rechnet das System die CSS-Einheiten 100vh/100dvh teils zu
     klein – dann bleibt unter Menüleisten ein leerer Streifen. Alle Apps nutzen deshalb
     "--wz-vh" (echte, gemessene Höhe) statt 100vh/100dvh. */
  var vhProbe = null, vhNow = 0;
  // Für Spiele mit Zeichenfläche: echte nutzbare Höhe in Pixeln
  global.wzVH = function () { return vhNow || global.innerHeight; };
  function safeTop() {
    try {
      if (!vhProbe) {
        vhProbe = document.createElement("div");
        vhProbe.style.cssText = "position:fixed;top:0;left:0;width:0;height:env(safe-area-inset-top,0px);visibility:hidden;pointer-events:none";
        (document.body || root).appendChild(vhProbe);
      }
      return vhProbe.offsetHeight || 0;
    } catch (e) { return 0; }
  }
  function setVh() {
    var h = Math.max(global.innerHeight || 0, root.clientHeight || 0);
    try {
      var standalone = global.navigator.standalone === true ||
        (global.matchMedia && global.matchMedia("(display-mode: standalone)").matches);
      var isPhone = /iPhone|iPod/.test(global.navigator.userAgent || "");
      if (standalone && isPhone && global.screen) {
        var portrait = (global.innerWidth || 0) <= (global.innerHeight || 0);
        var full = portrait ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
        // Nur wenn die App hinter der Statusleiste gezeichnet wird, entspricht die
        // Bildschirmhöhe exakt der nutzbaren Fläche.
        if (full > h && full - h <= 120 && safeTop() > 0) h = full;
      }
    } catch (e) { }
    if (h > 0) { vhNow = h; root.style.setProperty("--wz-vh", h + "px"); }
  }
  setVh();
  global.addEventListener("resize", setVh);
  global.addEventListener("orientationchange", function () { setTimeout(setVh, 250); });
  global.addEventListener("pageshow", setVh);
  document.addEventListener("DOMContentLoaded", setVh);

  /* ---------- Sichtbaren Ausschnitt nach der Tastatur wieder ausrichten ----------
     Als App vom Home-Bildschirm lässt das System nach dem Schließen der Tastatur manchmal den sichtbaren
     Ausschnitt gegenüber dem Seitenlayout verschoben; fest verankerte Leisten wandern dann beim
     Scrollen mit. Ein kurzer Scroll-Anstoß bringt beides wieder zur Deckung. Die Leisten selbst
     werden nicht verschoben. */
  var vv = global.visualViewport;
  function keyboardOpen() {
    var a = document.activeElement;
    return !!a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable === true);
  }
  function vvNudge() {
    try { var x = global.scrollX || 0, y = global.scrollY || 0; global.scrollTo(x, y + 1); global.scrollTo(x, y); } catch (e) { }
  }
  document.addEventListener("focusout", function () { global.setTimeout(function () { if (!keyboardOpen()) vvNudge(); }, 250); }, true);

  global.wzTheme = {
    isDark: isDark,
    set: set,
    toggle: toggle,
    bind: bind,
    onChange: function (fn) { if (typeof fn === "function") listeners.push(fn); },
    palettes: function () { return [{ id: "nachthimmel", name: "Nachthimmel" }, { id: "eigene", name: "Eigene Farbwelt" }]; },
    palette: storedPalette,
    setPalette: setPalette,
    customPalette: function () { return readCustom() || { hue: 258, sat: 1 }; },
    setCustomPalette: setCustomPalette,
    shiftColor: shiftColor
  };
})(window);
