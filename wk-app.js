(function () {
  "use strict";

  /* ---------- Helpers ---------- */
  const $ = (id) => document.getElementById(id);
  const fmt1 = (n) => n.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const fmt2 = (n) => n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function haversineMeters(a, b) {
    const R = 6371000;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLon = (b.lon - a.lon) * Math.PI / 180;
    const la1 = a.lat * Math.PI / 180, la2 = b.lat * Math.PI / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function formatDuration(sec) {
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  function formatHM(sec) {
    const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
    return `${h}h ${m}m`;
  }
  function formatDate(ts) {
    return new Date(ts).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) +
      " · " + new Date(ts).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  }
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function svgIcon(name, cls) {
    return `<svg class="icon${cls ? " " + cls : ""}"><use href="#icon-${name}"/></svg>`;
  }

  let toastTimer = null;
  function showToast(msg, durationMs) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), durationMs || 2200);
  }

  function vibrate(pattern) {
    if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) { /* Haptik optional */ } }
  }

  /* Speichert/teilt eine Datei: bevorzugt die Teilen-Funktion (Web Share API
     mit Datei-Anhang), da installierte Web-Apps einen reinen Download-Link
     oft nur im Browser öffnen statt ihn wirklich zu speichern. Über "Teilen"
     lässt sich die Datei zuverlässig in der Dateien-App ablegen. Fällt die
     Teilen-Funktion nicht zur Verfügung, wird der klassische Download
     verwendet (funktioniert im normalen Browser-Tab zuverlässig). */
  async function shareOrDownload(filename, content, mime) {
    try {
      if (navigator.canShare && navigator.share) {
        const file = new File([content], filename, { type: mime });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: filename });
          return;
        }
      }
    } catch (e) { /* Abgebrochen oder nicht unterstützt – Fallback unten */ if (e && e.name === "AbortError") return; }
    downloadFile(filename, content, mime);
  }
  function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }

  /* ---------- Rückgängig-Snackbar (ersetzt Lösch-Bestätigung) ---------- */
  let pendingUndo = null;
  let undoTimer = null;
  function showUndoToast(msg, restoreFn) {
    pendingUndo = restoreFn;
    $("undoToastMsg").textContent = msg;
    $("undoToast").classList.add("show");
    clearTimeout(undoTimer);
    undoTimer = setTimeout(() => { $("undoToast").classList.remove("show"); pendingUndo = null; }, 4500);
  }
  $("btnUndoDelete").addEventListener("click", () => {
    if (pendingUndo) pendingUndo();
    $("undoToast").classList.remove("show");
    clearTimeout(undoTimer);
    pendingUndo = null;
  });

  // Wählbar sind "car" (Auto) und "walk" (Zu Fuß). "bike" bleibt hier
  // ausschließlich, damit ältere gespeicherte bzw. aus einer Sicherung
  // importierte Touren weiter korrekt angezeigt werden.
  const MODE_META = {
    walk: { label: "Zu Fuß", icon: "walk", maxPlausibleKmh: 20, color: "#3D7BD9" },
    bike: { label: "Rad", icon: "bike", maxPlausibleKmh: 60, color: "#4C6FD6" },
    car: { label: "Auto", icon: "car", maxPlausibleKmh: 180, color: "#C9812E" }
  };

  /* ---------- Theme ---------- */
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    // Farben passend zum aktuellen grünen Design (vorher noch Blau-Werte aus v36)
    if (metaTheme) metaTheme.setAttribute("content", theme === "dark" ? "#15102A" : "#5A2FBE");
    try { localStorage.setItem("wk-theme", theme); } catch (e) {}
  }
  function initTheme() {
    // Gespeicherte Wahl wiederherstellen (vorher startete die App immer hell,
    // obwohl die Auswahl gespeichert wurde).
    let saved = null;
    try { saved = localStorage.getItem("wk-theme"); } catch (e) {}
    applyTheme(saved === "dark" ? "dark" : "light");
  }
  $("btnTheme").addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    applyTheme(cur === "dark" ? "light" : "dark");
  });

  /* ---------- Einstellungen ---------- */
  function loadSettings() {
    try { return Object.assign({ autoPause: false }, JSON.parse(localStorage.getItem("wk-settings") || "{}")); }
    catch (e) { return { autoPause: false }; }
  }
  function saveSettings(s) { localStorage.setItem("wk-settings", JSON.stringify(s)); }
  let settings = loadSettings();
  function renderAutopauseToggle() {
    const btn = $("btnToggleAutopause");
    btn.textContent = settings.autoPause ? "An" : "Aus";
    btn.classList.toggle("on", settings.autoPause);
  }
  $("btnToggleAutopause").addEventListener("click", () => {
    settings.autoPause = !settings.autoPause;
    saveSettings(settings);
    renderAutopauseToggle();
  });

  /* ---------- Wake Lock: Display bleibt während aktiver Tour an ---------- */
  let wakeLock = null;
  let gapBaseT = 0; // frühester Zeitpunkt, ab dem eine Hintergrund-Lücke gemessen wird (nach „Fortsetzen“)
  async function requestWakeLock() {
    if (!("wakeLock" in navigator)) return;
    try { wakeLock = await navigator.wakeLock.request("screen"); } catch (e) { wakeLock = null; }
  }
  function releaseWakeLock() {
    if (wakeLock) { try { wakeLock.release(); } catch (e) { /* egal */ } wakeLock = null; }
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    if (activeOverlay !== "live" || !tour || isPaused) return;
    requestWakeLock();
    const lastT = Math.max(tour.points.length ? tour.points[tour.points.length - 1].t : tour.startTime, gapBaseT);
    const gapMs = Date.now() - lastT;
    if (gapMs > BACKGROUND_GAP_MS) {
      awaitingGapMark = true; // nächster empfangener Punkt wird als Lückenende markiert (für die gestrichelte Darstellung)
      pendingGapMs = gapMs;
      const mins = Math.round(gapMs / 60000);
      const gapLabel = mins < 1 ? "kurze Zeit" : mins === 1 ? "etwa 1 Minute" : `etwa ${mins} Minuten`;
      $("bgGapText").textContent = `Die Aufzeichnung hat für ${gapLabel} keine Position erhalten, weil die App im Hintergrund war. Wie soll diese Zeit gewertet werden?`;
      $("ov-bggap").classList.add("open");
    }
  });

  /* =====================================================================
     NAVIGATION: 4 persistente Tabs (Start/Verlauf/Statistik/Info) +
     Vollbild-Overlays für Aufgaben-Abläufe (Tracking, Zusammenfassung,
     Tour-Detail, Notiz, Onboarding). Die Topbar ist immer sichtbar;
     ihr Zurück-Pfeil ist nur innerhalb eines schließbaren Overlays aktiv.
     ===================================================================== */
  let currentTab = "start";
  let activeOverlay = null; // "onboarding" | "live" | "summary" | "detail" | null
  const OVERLAY_TITLES = { onboarding: "Willkommen", live: "Tour läuft", summary: "Zusammenfassung", detail: "Tour" };
  const OVERLAY_CLOSABLE = { onboarding: false, live: false, summary: true, detail: true };
  const TAB_TITLES = { history: "Verlauf", stats: "Statistik", info: "Info" };

  function switchTab(name) {
    if (activeOverlay) closeOverlay();
    currentTab = name;
    document.querySelectorAll(".tabview").forEach((v) => v.classList.remove("active"));
    $("tab-" + name).classList.add("active");
    if (name === "start") {
      $("btnBack").hidden = true;
      $("pageTitle").innerHTML = '<img src="wk-icon-192.png" alt="" class="titleicon">NaviWahr';
    } else {
      $("btnBack").hidden = false;
      $("pageTitle").textContent = TAB_TITLES[name] || "NaviWahr";
    }
    window.scrollTo(0, 0);
    if (name === "start") renderHome();
    if (name === "history") renderHistory();
    if (name === "stats") renderStats();
  }
  document.querySelectorAll(".qtile[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.getAttribute("data-tab")));
  });

  function openOverlay(name) {
    activeOverlay = name;
    document.querySelectorAll(".overlay").forEach((o) => o.classList.remove("open"));
    const el = $("ov-" + name);
    el.classList.add("open");
    el.classList.remove("map-expanded");
    $("btnBack").hidden = !OVERLAY_CLOSABLE[name];
    $("pageTitle").textContent = OVERLAY_TITLES[name] || "NaviWahr";
    window.scrollTo(0, 0);
    requestAnimationFrame(() => {
      try {
        if (name === "live" && liveMap) liveMap.invalidateSize();
        if (name === "summary" && summaryMap) summaryMap.invalidateSize();
        if (name === "detail" && detailMap) detailMap.invalidateSize();
      } catch (e) { /* Karte optional */ }
    });
  }
  function closeOverlay() {
    if (!activeOverlay) return;
    $("ov-" + activeOverlay).classList.remove("open");
    activeOverlay = null;
    $("btnBack").hidden = true;
    $("pageTitle").innerHTML = '<img src="wk-icon-192.png" alt="" class="titleicon">NaviWahr';
  }
  $("btnBack").addEventListener("click", () => {
    if (activeOverlay === "summary") { closeOverlay(); switchTab("start"); return; }
    if (activeOverlay === "detail") { closeOverlay(); switchTab("history"); return; }
    if (activeOverlay) { closeOverlay(); return; }
    if (currentTab !== "start") { switchTab("start"); return; }
  });

  /* Notiz-Modal liegt über dem Live-Overlay, eigene kleine Steuerung */
  function openNoteModal() { $("ov-note").classList.add("open"); }
  function closeNoteModal() { $("ov-note").classList.remove("open"); }

  /* ---------- Onboarding ---------- */
  // Einheitliche Einführung der WahrZentrale (wz-onboarding.js) – gleiche Optik wie in allen Apps
  const wkOnb = (typeof wzOnboarding === "function") ? wzOnboarding({
    key: "wk-onboarding-seen",
    auto: false,
    slides: [{
      iconHtml: '<img src="wk-icon-192.png" alt="" style="width:100%;height:100%;border-radius:inherit;display:block">',
      title: "Willkommen bei NaviWahr",
      html: '<p>Zeichne deine Fahrten und Fußwege auf – Strecke, Zeit, Tempo und das aktuelle Wetter. Alles bleibt ausschließlich lokal auf deinem Gerät gespeichert.</p>'
        + '<p style="margin-top:10px"><b>Wichtig:</b> Das Tracking startet und endet ausschließlich, wenn du selbst auf „Start“ bzw. „Tour beenden“ tippst. Es gibt kein automatisches Tracking im Hintergrund.</p>'
        + '<p style="margin-top:10px">Kartendarstellung über OpenStreetMap, Wetterdaten über Open-Meteo. Beides wird nur bei aktiver Nutzung geladen.</p>'
    }]
  }) : null;
  $("btnReplayOnboarding").addEventListener("click", () => { if (wkOnb) wkOnb.show(); });

  function renderMapConsentToggle() {
    const btn = $("btnToggleMapConsent");
    if (!btn) return;
    const on = mapConsentStatus() === "granted";
    btn.textContent = on ? "An" : "Aus";
    btn.classList.toggle("on", on);
  }
  // Einwilligung jederzeit in der App widerrufbar (so einfach wie erteilt,
  // Art. 7 Abs. 3 DSGVO). Einschalten öffnet denselben Einwilligungsdialog
  // mit dem vollständigen Hinweistext.
  $("btnToggleMapConsent").addEventListener("click", () => {
    if (mapConsentStatus() === "granted") {
      setMapConsent("declined");
      renderMapConsentToggle();
      showToast("Kartenanzeige ausgeschaltet – es werden keine Kartendaten mehr geladen.");
    } else {
      pendingMapConsent = null;
      $("ov-map-consent").classList.add("open");
    }
  });

  $("btnMapConsentAccept").addEventListener("click", () => {
    setMapConsent("granted");
    renderMapConsentToggle();
    $("ov-map-consent").classList.remove("open");
    const pending = pendingMapConsent; pendingMapConsent = null;
    if (pending) pending.grant();
  });
  $("btnMapConsentDecline").addEventListener("click", () => {
    setMapConsent("declined");
    renderMapConsentToggle();
    $("ov-map-consent").classList.remove("open");
    const pending = pendingMapConsent; pendingMapConsent = null;
    if (pending) pending.decline();
  });

  /* ---------- Weather (Open-Meteo) ---------- */
  const WEATHER_TEXT = {
    0: "Klar", 1: "Meist klar", 2: "Teilweise bewölkt", 3: "Bedeckt",
    45: "Nebel", 48: "Nebel (Reif)", 51: "Nieselregen", 53: "Nieselregen", 55: "Nieselregen",
    61: "Leichter Regen", 63: "Regen", 65: "Starker Regen", 66: "Gefrierender Regen", 67: "Gefrierender Regen",
    71: "Leichter Schneefall", 73: "Schneefall", 75: "Starker Schneefall", 77: "Schneegriesel",
    80: "Regenschauer", 81: "Regenschauer", 82: "Heftige Regenschauer",
    85: "Schneeschauer", 86: "Schneeschauer", 95: "Gewitter", 96: "Gewitter mit Hagel", 99: "Gewitter mit Hagel"
  };
  const WX_SVG = {
    sun: "<svg viewBox=\"0 0 24 24\" width=\"17\" height=\"17\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" style=\"vertical-align:-3px\"><circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4\"/></svg>",
    cloudsun: "<svg viewBox=\"0 0 24 24\" width=\"17\" height=\"17\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" style=\"vertical-align:-3px\"><circle cx=\"9\" cy=\"8.5\" r=\"3.1\"/><path d=\"M9 2.6v1.3M3.4 8.5H2.3M5.1 4.6l.9.9M12.9 4.6l-.9.9\"/><path d=\"M7.6 19.5h9a3.6 3.6 0 00.2-7.2 5 5 0 00-9.4 1.2 3 3 0 00.2 6z\"/></svg>",
    cloud: "<svg viewBox=\"0 0 24 24\" width=\"17\" height=\"17\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" style=\"vertical-align:-3px\"><path d=\"M7.6 18.5h9a3.6 3.6 0 00.2-7.2 5 5 0 00-9.4 1.2 3 3 0 00.2 6z\"/></svg>",
    fog: "<svg viewBox=\"0 0 24 24\" width=\"17\" height=\"17\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" style=\"vertical-align:-3px\"><path d=\"M4 9h16M3 13h18M5 17h14\"/></svg>",
    rain: "<svg viewBox=\"0 0 24 24\" width=\"17\" height=\"17\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" style=\"vertical-align:-3px\"><path d=\"M7.6 14.5h9a3.6 3.6 0 00.2-7.2 5 5 0 00-9.4 1.2 3 3 0 00.2 6z\"/><path d=\"M8.5 17.5l-1 2.5M12.5 17.5l-1 2.5M16.5 17.5l-1 2.5\"/></svg>",
    snow: "<svg viewBox=\"0 0 24 24\" width=\"17\" height=\"17\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" style=\"vertical-align:-3px\"><path d=\"M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9\"/></svg>",
    storm: "<svg viewBox=\"0 0 24 24\" width=\"17\" height=\"17\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" style=\"vertical-align:-3px\"><path d=\"M7.6 15.5h9a3.6 3.6 0 00.2-7.2 5 5 0 00-9.4 1.2 3 3 0 00.2 6z\"/><path d=\"M12.5 15.5l-2 3.5h3l-2 3.5\"/></svg>"
  };
  const WEATHER_ICON = {
    0: WX_SVG.sun, 1: WX_SVG.cloudsun, 2: WX_SVG.cloudsun, 3: WX_SVG.cloud, 45: WX_SVG.fog, 48: WX_SVG.fog, 51: WX_SVG.rain, 53: WX_SVG.rain, 55: WX_SVG.rain, 61: WX_SVG.rain, 63: WX_SVG.rain, 65: WX_SVG.rain, 66: WX_SVG.rain, 67: WX_SVG.rain, 71: WX_SVG.snow, 73: WX_SVG.snow, 75: WX_SVG.snow, 77: WX_SVG.snow, 80: WX_SVG.rain, 81: WX_SVG.rain, 82: WX_SVG.storm, 85: WX_SVG.snow, 86: WX_SVG.snow, 95: WX_SVG.storm, 96: WX_SVG.storm, 99: WX_SVG.storm
  };
  function weatherClass(code) {
    if ([0, 1, 2].includes(code)) return "good";
    if ([3, 45, 48, 51, 53, 61, 80].includes(code)) return "mid";
    return "bad";
  }
  async function fetchWeather(lat, lon) {
    // an Open-Meteo nur auf 2 Nachkommastellen (≈ 1 km) gerundet – genügt fürs Wetter
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${(+lat).toFixed(2)}&longitude=${(+lon).toFixed(2)}&current=temperature_2m,weather_code&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Wetter nicht verfügbar");
    const data = await res.json();
    const code = data.current.weather_code;
    return { temp: Math.round(data.current.temperature_2m), code: code, text: WEATHER_TEXT[code] || "–" };
  }
  function renderWeatherLine(el, w) {
    if (!w) { el.style.display = "none"; return; }
    const cls = weatherClass(w.code);
    el.style.display = "flex";
    el.className = "weatherline" + (cls === "mid" ? " mid" : cls === "bad" ? " bad" : "");
    el.innerHTML = `<span>${WEATHER_ICON[w.code] || ""} ${w.text} · ${w.temp}°C</span>` +
      `<a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" style="margin-left:auto;font-size:11px;opacity:.7;color:inherit;text-decoration:underline;">Open-Meteo</a>`;
  }

  /* =====================================================================
     KARTE: Leaflet.js + OpenStreetMap-Kacheln (tile.openstreetmap.de, FOSSGIS e.V.) –
     derselbe Kartenstandard wie in den anderen Wahr-Apps. Karte ist eine
     Zusatzansicht: Tracking, Zeit, Strecke und Tempo hängen NIE davon ab,
     ob die Karte erfolgreich lädt.
     ===================================================================== */
  const OSM_TILE_URL = "https://tile.openstreetmap.de/{z}/{x}/{y}.png";
  const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>-Mitwirkende';

  /* ---------- Leaflet: lokal, Karte nur nach Einwilligung ----------
     Die Kartenbibliothek Leaflet liegt in der WahrZentrale selbst (lib-leaflet.js).
     Kartenkacheln von OpenStreetMap werden erst geladen, wenn der Nutzer die
     Kartenansicht nutzt UND eingewilligt hat. Die Einwilligung gilt für alle
     Karten der WahrZentrale (Abgleich über wz-core.js, Eintrag "wz_map_consent"). */
  const LEAFLET_CSS_URL = "./lib-leaflet.css"; // lokal, Teil der WahrZentrale
  const LEAFLET_JS_URL = "./lib-leaflet.js"; // lokal, Teil der WahrZentrale
  // v2: Die frühere Einwilligung (wk_map_consent) nannte nur einen fremden Bibliotheks-Server, nicht
  // die OpenStreetMap-Kartenserver. Deshalb neuer Schlüssel = alle werden mit
  // dem vollständigen Text einmal neu gefragt; der alte Wert wird entfernt.
  const MAP_CONSENT_KEY = "wk_map_consent_v2"; // "granted" | "declined"
  try { localStorage.removeItem("wk_map_consent"); } catch (e) {}

  function mapConsentStatus() {
    try { return localStorage.getItem(MAP_CONSENT_KEY); } catch (e) { return null; }
  }
  function setMapConsent(v) {
    try { localStorage.setItem(MAP_CONSENT_KEY, v); } catch (e) {}
  }

  let leafletLoadPromise = null;
  function loadLeafletAssets() {
    if (typeof L !== "undefined") return Promise.resolve();
    if (leafletLoadPromise) return leafletLoadPromise;
    leafletLoadPromise = new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS_URL;
      document.head.appendChild(link);
      const script = document.createElement("script");
      script.src = LEAFLET_JS_URL;
      script.onload = () => resolve();
      script.onerror = () => { leafletLoadPromise = null; reject(new Error("Leaflet konnte nicht geladen werden")); };
      document.body.appendChild(script);
    });
    return leafletLoadPromise;
  }

  // Merkt sich, was zu tun ist, während der Einwilligungsdialog offen ist
  // (nur eine Kartenanfrage gleichzeitig möglich, da immer nur ein
  // Karten-Overlay sichtbar sein kann).
  let pendingMapConsent = null;
  function requestMapAccess(containerId, fallbackSuffix, onGranted) {
    const status = mapConsentStatus();
    // Widerruf muss sofort wirken – auch wenn Leaflet in dieser Sitzung schon
    // geladen wurde, werden danach keine Kartenkacheln mehr angefragt.
    if (status === "granted" && typeof L !== "undefined") { onGranted(); return; }
    if (status === "declined") {
      showMapFallback(containerId, "Kartenanzeige laut deiner Wahl deaktiviert. " + fallbackSuffix);
      return;
    }
    if (status === "granted") {
      loadLeafletAssets().then(onGranted).catch(() => {
        showMapFallback(containerId, "Karte konnte nicht geladen werden. " + fallbackSuffix);
      });
      return;
    }
    showMapFallback(containerId, "Warte auf deine Bestätigung zum Kartenladen …");
    pendingMapConsent = {
      grant: () => {
        loadLeafletAssets().then(onGranted).catch(() => {
          showMapFallback(containerId, "Karte konnte nicht geladen werden. " + fallbackSuffix);
        });
      },
      decline: () => showMapFallback(containerId, "Kartenanzeige laut deiner Wahl deaktiviert. " + fallbackSuffix),
    };
    $("ov-map-consent").classList.add("open");
  }

  function mapLibraryReady() { return typeof L !== "undefined"; }
  function showMapFallback(containerId, message) {
    const el = $(containerId);
    if (!el) return;
    el.innerHTML = `<div class="mapfallback"><span>${svgIcon("map")}</span>${escapeHtml(message)}</div>`;
  }
  function dotIcon(color) {
    return L.divIcon({ className: "", html: `<div class="wk-marker" style="background:${color}"></div>`, iconSize: [16, 16], iconAnchor: [8, 8] });
  }
  // Deutlich dunklere Variante einer Modusfarbe für den Live-Positions-Marker
  // (bessere Erkennbarkeit/Kontrast auf hellen wie dunklen Kartenkacheln).
  function darkenColor(hex, amount) {
    const c = hex.replace("#", "");
    const r = Math.max(0, Math.round(parseInt(c.slice(0, 2), 16) * (1 - amount)));
    const g = Math.max(0, Math.round(parseInt(c.slice(2, 4), 16) * (1 - amount)));
    const b = Math.max(0, Math.round(parseInt(c.slice(4, 6), 16) * (1 - amount)));
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  }
  function addTileLayer(map) {
    L.tileLayer(OSM_TILE_URL, { maxZoom: 19, maxNativeZoom: 18, attribution: OSM_ATTRIBUTION }).addTo(map);
  }

  let liveMap = null, liveMarker = null, liveRouteLine = null, liveGapLayer = null;
  let summaryMap = null, detailMap = null;
  let hasCenteredLiveMap = false;

  /* ---------- Navigation (Ziel per Adresssuche oder per Kartentipp) ----------
     Für die Adresssuche wird Photon (komoot, OpenStreetMap-Daten, Server in
     Deutschland) über wzCore.geoSearch angefragt – bewusst nur bei Klick/Enter,
     nie bei jedem Tastenanschlag (kein Auto-Vervollständigen).
     Für die eigentliche Routenführung fragt NaviWahr den öffentlichen
     OSRM-Routing-Server von FOSSGIS (routing.openstreetmap.de, Profil
     routed-car bzw. routed-foot) nach einer echten Auto- bzw. Fußgängerroute. Nutzungsregeln laut routing.openstreetmap.de/about.html:
     Attribution + "fix the map"-Link anzeigen, gültiger User-Agent/Referrer
     (liefert der Browser), max. 1 Anfrage/Sekunde, kein Scraping, keine
     Massennutzung. Kostenlos,
     ohne API-Key, ohne Registrierung, aber mit Fair-Use-Limit (max. 1
     Anfrage/Sekunde, keine SLA/Uptime-Garantie) und OHNE Datenspeicherung
     durch NaviWahr selbst. Route wird nur einmal beim Zielsetzen sowie bei
     spürbarer Abweichung von der Route (mit Mindestabstand zwischen zwei
     Anfragen) neu berechnet, nicht bei jedem GPS-Update. Ist der Dienst
     nicht erreichbar (z. B. offline), fällt NaviWahr automatisch auf die
     bisherige Luftlinien-Navigation (Pfeil + direkte Entfernung, komplett
     ohne weitere Anfragen) zurück. */
  let navTarget = null, navVisible = false, navPicking = false, navStarted = false, navLine = null, navMarker = null, navArrivedShown = false;
  let navFavorites = loadNavFavorites();
  const NAVFAV_MATCH_M = 15; // Toleranz, ab der ein Ziel als "gleicher Favorit" gilt
  function loadNavFavorites() {
    try { return JSON.parse(localStorage.getItem("wk-navfavorites") || "[]"); } catch (e) { return []; }
  }
  function saveNavFavorites() { localStorage.setItem("wk-navfavorites", JSON.stringify(navFavorites)); }
  function findNavFavoriteIndex(target) {
    if (!target) return -1;
    return navFavorites.findIndex((f) => haversineMeters(f, target) < NAVFAV_MATCH_M);
  }
  let navRouteLine = null, navRouteCoords = null, navRouteSteps = null, navStepIndex = 0;
  let navRouteFetching = false, navLastRouteFetchAt = 0, navRouteFetchFailedOnce = false;
  // Durchschnittstempo der zuletzt berechneten Route (Sekunden pro Meter),
  // aus den OSRM-Gesamtwerten (route.distance/route.duration). Damit lässt
  // sich die Reststrecke zum nächsten Manöverpunkt (distToManeuver, per GPS
  // gemessen) in eine Restzeit umrechnen – die Schritt-Dauern allein reichen
  // dafür nicht, siehe Kommentar bei etaSec weiter unten.
  let navRoutePaceSecPerM = null;
  const OSRM_MIN_REFETCH_MS = 3000;    // Mindestabstand zwischen zwei Neuanfragen; die FOSSGIS-
                                        // Fair-Use-Regel erlaubt bis zu 1 Anfrage/Sekunde – 3s bleibt
                                        // bei einer einzelnen Navigation weit darunter
  const OSRM_TIMEOUT_MS = 8000;        // Zeitgrenze für die erste Routenanfrage
  const OSRM_REROUTE_TIMEOUT_MS = 5000;// kürzere Zeitgrenze bei Neuberechnung unterwegs (alte Route bleibt solange sichtbar)
  /* Schnelle Neuberechnung nach Verfahren:
     - Abweichung wird abhängig von der GPS-Genauigkeit früher erkannt
       (bei gutem Signal schon ab ca. 35 m statt erst ab 70 m, zwei Fixe in Folge),
     - die neue Route wird mit der aktuellen Fahrtrichtung angefragt (OSRM-
       Parameter "bearings"), damit sie nicht erst ein Wenden verlangt und
       gleich wieder verworfen werden muss (das kostete bisher mehrere Runden),
     - bis die neue Route da ist, bleibt die alte sichtbar und es erscheint
       sofort "Neue Route wird berechnet …",
     - veraltete Antworten (Ziel inzwischen geändert/beendet) werden verworfen. */
  let navLastAcc = null, navLastSpeedMps = null, navHeadingValid = false;
  let navOffrouteCount = 0, navRerouting = false, navRouteReqId = 0, navRouteAbort = null;
  /* Modusabhängige Parameter der Navigation/Aufzeichnung (Auto / Zu Fuß):
     profile      Routing-Profil auf routing.openstreetmap.de
     offrouteM    ab dieser Abweichung gilt die Route sofort als "verlassen"
     offrouteFastM bei gutem GPS-Signal gilt die Route schon ab dieser Abweichung als
                  verlassen, wenn zwei Fixe in Folge daneben liegen
     bearingRange Toleranz (Grad) für die Fahrtrichtung bei der Neuberechnung (0 = ohne,
                  zu Fuß kann man jederzeit umdrehen)
     arriveStepM  Abstand zum Manöverpunkt, ab dem zum nächsten Schritt gewechselt wird
     turnM        Abstand zum Manöver, ab dem Ton/Pfeil ausgelöst werden
     turnNearM    reduzierter Abstand, falls zwei Richtungsänderungen dicht aufeinander folgen
     arriveM      Abstand zum Ziel, ab dem "Zielort erreicht" gilt
     fixedZoom    fester Kartenzoom während der Zielführung (null = je nach Tempo)
     headingMinM  Mindestweg zwischen zwei GPS-Punkten, um daraus die Laufrichtung zu bestimmen
     speedHoldMs  so lange bleibt das zuletzt gemessene Tempo stehen, bevor es auf 0 fällt
                  (zu Fuß kommt nur alle paar Sekunden ein verwertbarer Punkt) */
  const NAV_PARAMS = {
    car:  { profile: "routed-car",  offrouteM: 70, offrouteFastM: 35, arriveStepM: 20, turnM: 100, turnNearM: 20, arriveM: 30, fixedZoom: null, headingMinM: 4, speedHoldMs: 0,    bearingRange: 60 },
    walk: { profile: "routed-foot", offrouteM: 40, offrouteFastM: 25, arriveStepM: 12, turnM: 30,  turnNearM: 10, arriveM: 20, fixedZoom: 18,   headingMinM: 8, speedHoldMs: 8000, bearingRange: 0 }
  };
  function navParams() { return NAV_PARAMS[selectedMode] || NAV_PARAMS.car; }
  const TURN_ALERT_DISPLAY_MS = 8000;   // Anzeigedauer des großen Abbiegepfeils

  /* ---------- Kartenausrichtung in Fahrtrichtung ----------
     Die Live-Karte wird per CSS-Transform gedreht, sodass die aktuelle
     Bewegungsrichtung immer "oben" zeigt (wie bei Navigations-Apps).
     Quelle der Richtung: bevorzugt der Kompass-Heading des Geräts
     (pos.coords.heading, nur vorhanden, wenn das Gerät sich bewegt);
     ansonsten die Peilung zwischen den letzten beiden ausreichend weit
     auseinanderliegenden GPS-Punkten. Die Karte selbst wird zusätzlich
     vergrößert dargestellt, damit die Ecken nach der Drehung nicht leer
     bleiben (der Container bleibt per overflow:hidden begrenzt). */
  let currentBearing = 0, lastBearingPoint = null;
  function computeBearing(lat1, lon1, lat2, lon2) {
    const toRad = (d) => (d * Math.PI) / 180, toDeg = (r) => (r * 180) / Math.PI;
    const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
    const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  }
  function smoothBearing(prev, next, alpha) {
    const diff = ((next - prev + 540) % 360) - 180; // kürzeste Winkeldifferenz, -180..180
    return (prev + alpha * diff + 360) % 360;
  }
  function applyMapRotation(bearing) {
    if (!liveMap || navPicking || !navStarted) return;
    try {
      const el = liveMap.getContainer();
      el.style.transformOrigin = "50% 50%";
      el.style.transform = `scale(1.6) rotate(${(-bearing).toFixed(1)}deg)`;
      const attr = el.querySelector(".leaflet-control-attribution");
      if (attr) { attr.style.transformOrigin = "50% 50%"; attr.style.transform = `rotate(${bearing.toFixed(1)}deg)`; }
      // Positions-Pfeilspitze gegenläufig zur Kartendrehung rotieren, damit
      // sie unabhängig vom Kompasskurs immer "nach oben" (=Fahrtrichtung)
      // zeigt – wie bei klassischen Navigations-Apps.
      if (liveMarker) {
        const iconEl = liveMarker.getElement();
        const rot = iconEl && iconEl.querySelector(".wk-navarrow-rot");
        if (rot) rot.style.transform = `rotate(${bearing.toFixed(1)}deg)`;
      }
    } catch (e) { /* Karte optional */ }
  }
  function resetMapRotation() {
    currentBearing = 0; lastBearingPoint = null; navHeadingValid = false;
    if (!liveMap) return;
    try { liveMap.getContainer().style.transform = "scale(1.6) rotate(0deg)"; } catch (e) {}
  }
  function updateHeading(point, deviceHeading) {
    let target = null;
    if (typeof deviceHeading === "number" && !isNaN(deviceHeading)) {
      target = deviceHeading;
      lastBearingPoint = point;
    } else if (lastBearingPoint) {
      const distM = haversineMeters(lastBearingPoint, point);
      if (distM >= navParams().headingMinM) {
        target = computeBearing(lastBearingPoint.lat, lastBearingPoint.lon, point.lat, point.lon);
        lastBearingPoint = point;
      }
    } else {
      lastBearingPoint = point;
    }
    if (target === null) return;
    navHeadingValid = true;
    currentBearing = smoothBearing(currentBearing, target, 0.3);
    applyMapRotation(currentBearing);
  }

  /* ---------- Geschwindigkeitsabhängiges Reinzoomen (nur während aktiver
     Zielführung) ----------
     Quelle bevorzugt pos.coords.speed (m/s, vom Gerät geliefert); ohne
     dieses Feld wird die Geschwindigkeit ersatzweise aus zwei
     aufeinanderfolgenden Punkten berechnet (wie bei der Peilung). Der
     Zoomlevel wird gedämpft angewendet (Mindestabstand zwischen zwei
     Zoomwechseln), damit die Karte nicht bei jedem GPS-Update springt. */
  let navSpeedPrevPoint = null, navLastZoomValue = null, navLastZoomAppliedAt = 0;
  const NAV_ZOOM_MIN_INTERVAL_MS = 4000;
  function estimateSpeedKmh(point, deviceSpeedMps) {
    if (typeof deviceSpeedMps === "number" && isFinite(deviceSpeedMps) && deviceSpeedMps >= 0) {
      navSpeedPrevPoint = point;
      return deviceSpeedMps * 3.6;
    }
    let kmh = null;
    if (navSpeedPrevPoint) {
      const d = haversineMeters(navSpeedPrevPoint, point);
      const dtS = Math.max(0.5, (point.t - navSpeedPrevPoint.t) / 1000);
      if (d >= 3) kmh = (d / dtS) * 3.6;
    }
    navSpeedPrevPoint = point;
    return kmh;
  }
  function speedToNavZoom(kmh) {
    if (kmh < 4) return 18;
    if (kmh < 8) return 17;
    if (kmh < 15) return 16;
    if (kmh < 25) return 15;
    if (kmh < 45) return 14;
    if (kmh < 70) return 13;
    return 12;
  }
  function updateNavZoom(point, deviceSpeedMps) {
    if (!liveMap) return;
    const fixedZoom = navParams().fixedZoom;
    const kmh = fixedZoom ? 0 : estimateSpeedKmh(point, deviceSpeedMps);
    if (kmh === null) return;
    const z = fixedZoom || speedToNavZoom(kmh);
    const now = Date.now();
    if (z === navLastZoomValue) return;
    if (now - navLastZoomAppliedAt < NAV_ZOOM_MIN_INTERVAL_MS) return;
    navLastZoomValue = z;
    navLastZoomAppliedAt = now;
    try { liveMap.setZoom(z); } catch (e) {}
  }
  function resetNavZoom() {
    navSpeedPrevPoint = null; navLastZoomValue = null; navLastZoomAppliedAt = 0;
  }

  /* ---------- Positions-Marker: runder Punkt normal, kleine Pfeilspitze
     nur während aktiver Zielführung (siehe applyMapRotation oben für die
     Gegenrotation der Pfeilspitze). ---------- */
  function arrowIcon(color) {
    return L.divIcon({
      className: "",
      html: `<div class="wk-navarrow-rot"><svg class="wk-navarrow" viewBox="0 0 24 24" width="26" height="26">` +
        `<path d="M12 2 L20 21 L12 16.5 L4 21 Z" fill="${color}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg></div>`,
      iconSize: [26, 26], iconAnchor: [13, 13]
    });
  }
  function setLiveMarkerNavMode(active) {
    if (!liveMarker) return;
    const color = darkenColor(MODE_META[selectedMode].color, 0.35);
    try { liveMarker.setIcon(active ? arrowIcon("#7C6AD8") : dotIcon(color)); } catch (e) {}
  }


  /* ---------- Anzeige Reststrecke / Restzeit / Ankunft ----------
     Liefert Zahl und Einheit getrennt, damit die Zahl groß und die Einheit
     klein gesetzt werden kann. */
  function navDistParts(m) {
    if (m < 999.5) return { num: String(Math.round(m)), unit: "m" };
    const km = m / 1000;
    return { num: km < 99.95 ? fmt1(km) : String(Math.round(km)), unit: "km" };
  }
  function navTimeParts(sec) {
    const mins = Math.max(1, Math.round(sec / 60));
    return { h: Math.floor(mins / 60), m: mins % 60 };
  }
  function renderNavRest(distM, sec, isRoute) {
    const d = navDistParts(distM);
    $("navRestDist").innerHTML = `${d.num}<small>${d.unit}</small>`;
    $("navRestDistLbl").textContent = isRoute ? "Reststrecke" : "Luftlinie";
    let pill = `${d.num} ${d.unit}`;
    const timeEl = $("navRestTime");
    if (sec != null) {
      const t = navTimeParts(sec);
      const mm = String(t.m).padStart(2, "0");
      timeEl.innerHTML = t.h > 0 ? `${t.h}<small>h</small>${mm}<small>min</small>` : `${t.m}<small>min</small>`;
      timeEl.classList.toggle("long", t.h > 0);
      const eta = new Date(Date.now() + sec * 1000).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
      $("navRestEta").innerHTML = `Ankunft ca. <b>${eta}</b> Uhr`;
      pill += " · " + (t.h > 0 ? `${t.h} h ${mm} min` : `${t.m} min`) + " · Ankunft " + eta;
    } else {
      timeEl.textContent = "–";
      timeEl.classList.remove("long");
      // Solange die Straßenroute noch angefragt wird (kein Fehlversuch), nur "wird berechnet" zeigen.
      $("navRestEta").textContent = (isRoute || !navRouteFetchFailedOnce) ? "Route wird berechnet …" : "Ohne Straßenroute keine Zeitangabe";
      if (!isRoute) pill += " Luftlinie";
    }
    $("mapRest").textContent = pill;
  }
  function updateNavCardVisibility() {
    $("navCard").style.display = navVisible ? "block" : "none";
    $("navSearchBox").style.display = navTarget ? "none" : "block";
    $("navActiveBox").style.display = navTarget ? "flex" : "none";
    $("navPickHint").style.display = navPicking ? "block" : "none";
    $("btnNavStart").style.display = navTarget && !navStarted ? "block" : "none";
    $("mapRest").classList.toggle("show", !!navTarget);
    if (!navTarget) renderNavFavorites();
    updateNavFavButton();
  }
  function updateNavFavButton() {
    const btn = $("btnNavFav");
    if (!btn) return;
    const isFav = findNavFavoriteIndex(navTarget) !== -1;
    btn.innerHTML = svgIcon(isFav ? "star-filled" : "star");
    btn.setAttribute("aria-label", isFav ? "Favorit entfernen" : "Als Favorit merken");
  }
  function toggleNavFavorite() {
    if (!navTarget) return;
    const idx = findNavFavoriteIndex(navTarget);
    if (idx !== -1) {
      navFavorites.splice(idx, 1);
      showToast("Favorit entfernt.");
    } else {
      const name = prompt("Name für diesen Favoriten:", navTarget.label || "");
      if (name === null) return;
      navFavorites.push({
        id: "f" + Date.now(),
        label: (name.trim() || navTarget.label || formatCoordLabel(navTarget.lat, navTarget.lon)),
        lat: navTarget.lat,
        lon: navTarget.lon,
        approx: !!navTarget.approx,
      });
      showToast("Als Favorit gemerkt.");
    }
    saveNavFavorites();
    updateNavFavButton();
  }
  function renderNavFavorites() {
    const box = $("navFavoritesBox");
    const list = $("navFavorites");
    if (!box || !list) return;
    if (!navFavorites.length) { box.style.display = "none"; list.innerHTML = ""; return; }
    box.style.display = "block";
    list.innerHTML = "";
    navFavorites.forEach((f) => {
      const row = document.createElement("div");
      row.className = "navfav-item";
      const btn = document.createElement("button");
      btn.className = "navfav-label";
      btn.innerHTML = svgIcon("star-filled") + " ";
      btn.append(document.createTextNode(f.label + (f.approx ? " ≈" : "")));
      btn.addEventListener("click", () => pickNavTarget(f.lat, f.lon, f.label, f.approx));
      const del = document.createElement("button");
      del.className = "navfav-del";
      del.setAttribute("aria-label", "Favorit löschen");
      del.innerHTML = svgIcon("trash");
      del.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = navFavorites.findIndex((x) => x.id === f.id);
        if (idx === -1) return;
        navFavorites.splice(idx, 1);
        saveNavFavorites();
        renderNavFavorites();
        updateNavFavButton();
        showUndoToast("Favorit gelöscht.", () => {
          navFavorites.splice(idx, 0, f);
          saveNavFavorites();
          renderNavFavorites();
          updateNavFavButton();
        });
      });
      row.appendChild(btn);
      row.appendChild(del);
      list.appendChild(row);
    });
  }
  function formatCoordLabel(lat, lon) {
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }
  // Ziel wählen (Adresssuche oder Kartentipp): legt nur das Ziel fest und
  // zeigt eine Vorschau (Entfernung/Route) an – die eigentliche Zielführung
  // (Karte dreht in Fahrtrichtung, GPS-Dauerabfrage, Display-Wachhalten)
  // startet erst, wenn der Nutzer danach explizit auf "Start" tippt, siehe
  // confirmNavStart().
  function pickNavTarget(lat, lon, label, approx) {
    navTarget = { lat, lon, label: label || formatCoordLabel(lat, lon), approx: !!approx };
    $("navApprox").style.display = navTarget.approx ? "block" : "none";
    navPicking = false;
    navStarted = false;
    navArrivedShown = false;
    clearNavLayers();
    clearNavRoute();
    if (liveMap) {
      navMarker = L.marker([lat, lon], { icon: dotIcon("#7C6AD8") }).addTo(liveMap);
    }
    $("navAddressInput").value = "";
    $("navResults").innerHTML = "";
    updateNavCardVisibility();
    resetMapRotation();
    resetNavZoom();
    setLiveMarkerNavMode(false);
    updateNavInfo();
    fetchOsrmRoute(true);
  }
  // Tippt der Nutzer auf "Start", beginnt die eigentliche Zielführung: erst
  // ab jetzt drehen sich Karte/Positions-Pfeil in Fahrtrichtung, die Karte
  // zoomt je nach Tempo, und – bei reiner Navigation ohne Tour-Aufzeichnung –
  // erst jetzt werden Display-Wachhalten (Wake Lock) und die GPS-Dauerabfrage
  // aktiviert (bei gleichzeitiger Aufzeichnung laufen beide ohnehin schon
  // seit Sessionstart).
  function confirmNavStart() {
    if (!navTarget) return;
    navStarted = true;
    updateNavCardVisibility();
    resetMapRotation();
    resetNavZoom();
    resetTurnAlerts();
    ensureTurnAudioUnlocked();
    setLiveMarkerNavMode(true);
    if (!tour) {
      if (navWithTracking) {
        // Navigation + gleichzeitige Aufzeichnung: Zeit/Strecke der Tour
        // beginnen erst jetzt, nach Zielwahl und explizitem Start-Tipp –
        // nicht schon beim ersten Antippen von "Start" auf der
        // Einrichtungsseite, denn dort war die Auswahl (Ziel) noch nicht
        // abgeschlossen.
        resetTourState(selectedMode);
        $("liveModeLabel").textContent = MODE_META[selectedMode].label;
        if ($("pageTitle")) $("pageTitle").textContent = "Tour läuft";
        if (lastKnownPos) {
          fetchWeather(lastKnownPos.lat, lastKnownPos.lon)
            .then((w) => { tour.weather = w; renderWeatherLine($("liveWeather"), w); })
            .catch(() => { /* Wetter optional, Tracking läuft trotzdem */ });
        }
      } else {
        if ($("pageTitle")) $("pageTitle").textContent = "Navigation läuft";
      }
      requestWakeLock();
      if (watchId === null) startWatch();
    }
    updateNavInfo();
    showToast(navWithTracking ? "Tour & Navigation gestartet." : "Navigation gestartet.");
  }
  function clearNavLayers() {
    if (navLine) { try { liveMap.removeLayer(navLine); } catch (e) {} navLine = null; }
    if (navMarker) { try { liveMap.removeLayer(navMarker); } catch (e) {} navMarker = null; }
  }
  function cancelNavRouteFetch() {
    navRouteReqId++;
    if (navRouteAbort) { try { navRouteAbort.abort(); } catch (e) {} navRouteAbort = null; }
    navRouteFetching = false;
    navRerouting = false;
    navOffrouteCount = 0;
  }
  function clearNavRoute() {
    cancelNavRouteFetch();
    if (navRouteLine) { try { liveMap.removeLayer(navRouteLine); } catch (e) {} navRouteLine = null; }
    navRouteCoords = null;
    navRouteSteps = null;
    navStepIndex = 0;
    navRoutePaceSecPerM = null;
    clearNavRouteProfile();
    navLastRouteFetchAt = 0;
    navRouteFetchFailedOnce = false;
    $("navInstruction").textContent = "";
    $("navInstruction").style.display = "none";
    resetTurnAlerts();
  }
  function clearNavTarget() {
    navTarget = null;
    navStarted = false;
    navArrivedShown = false;
    $("navApprox").style.display = "none";
    clearNavLayers();
    clearNavRoute();
    navPicking = false;
    updateNavCardVisibility();
    // Zielführung explizit beendet: Karte/Positions-Marker zurück in den
    // normalen (nicht gedrehten) Zustand, kein Auto-Zoom mehr.
    resetMapRotation();
    resetNavZoom();
    setLiveMarkerNavMode(false);
  }

  /* ---------- OSRM-Straßenrouting ----------
     lonlat-Reihenfolge beachten: OSRM erwartet lon,lat (nicht lat,lon). */
  /* ---------- Wegprofil der Route: Reststrecke/Restzeit entlang der echten Straße ----------
     Beim Laden einer Route wird einmal die aufsummierte Länge der Routenlinie
     (navRouteCum, Meter je Linienpunkt) und ein Zeitprofil (navRouteTime:
     nach wie vielen Metern sind laut Routing wie viele Sekunden vergangen)
     aufgebaut. Bei jedem GPS-Update wird die aktuelle Position auf die
     Routenlinie projiziert; Reststrecke und Restzeit sind dann exakt der
     noch vor einem liegende Teil der Straßenroute – keine Luftlinie, auch
     nicht stückweise bis zum nächsten Abbiegepunkt. */
  let navRouteCum = null, navRouteTime = null, navRouteLenM = 0, navRouteDurSec = 0, navRouteSegHint = 0;
  function buildNavRouteProfile(route) {
    const c = navRouteCoords;
    const cum = new Array(c.length);
    cum[0] = 0;
    for (let i = 1; i < c.length; i++) {
      cum[i] = cum[i - 1] + haversineMeters({ lat: c[i - 1][0], lon: c[i - 1][1] }, { lat: c[i][0], lon: c[i][1] });
    }
    navRouteCum = cum;
    navRouteLenM = cum[cum.length - 1];
    // Zeitprofil aus den Schritt-Längen/-Dauern des Routings.
    let d = 0, t = 0;
    let pts = [{ d: 0, t: 0 }];
    (navRouteSteps || []).forEach((st) => {
      d += st.distance || 0; t += st.duration || 0;
      pts.push({ d, t });
    });
    if (d > 0 && t > 0) {
      // Schritt-Längen auf die tatsächliche Linienlänge normieren (Rundungsdifferenzen).
      const scale = navRouteLenM / d;
      pts.forEach((p) => { p.d *= scale; });
    } else {
      t = route.duration || 0;
      pts = [{ d: 0, t: 0 }, { d: navRouteLenM, t }];
    }
    navRouteTime = pts;
    navRouteDurSec = t;
    navRouteSegHint = 0;
  }
  function clearNavRouteProfile() {
    navRouteCum = null; navRouteTime = null; navRouteLenM = 0; navRouteDurSec = 0; navRouteSegHint = 0;
  }
  // Sekunden, die laut Routing bis zum Wegpunkt "alongM" (Meter ab Routenstart) vergehen.
  function navTimeAt(alongM) {
    const p = navRouteTime;
    if (!p || p.length < 2) return 0;
    for (let i = 1; i < p.length; i++) {
      if (alongM <= p[i].d || i === p.length - 1) {
        const span = p[i].d - p[i - 1].d;
        const f = span > 0 ? Math.min(1, Math.max(0, (alongM - p[i - 1].d) / span)) : 1;
        return p[i - 1].t + f * (p[i].t - p[i - 1].t);
      }
    }
    return navRouteDurSec;
  }
  // Projiziert die Position auf die Routenlinie. Ergebnis: zurückgelegte
  // Meter ab Routenstart (alongM) und Abstand zur Linie (offM).
  function projectOnNavRoute(pos) {
    const c = navRouteCoords, cum = navRouteCum;
    if (!c || !cum || c.length < 2) return null;
    const kx = 111320 * Math.cos(pos.lat * Math.PI / 180), ky = 110540;
    function scan(from, to) {
      let best = null;
      for (let i = Math.max(0, from); i < Math.min(c.length - 1, to); i++) {
        const ax = (c[i][1] - pos.lon) * kx, ay = (c[i][0] - pos.lat) * ky;
        const bx = (c[i + 1][1] - pos.lon) * kx, by = (c[i + 1][0] - pos.lat) * ky;
        const dx = bx - ax, dy = by - ay;
        const len2 = dx * dx + dy * dy;
        let f = len2 > 0 ? -(ax * dx + ay * dy) / len2 : 0;
        f = Math.min(1, Math.max(0, f));
        const px = ax + f * dx, py = ay + f * dy;
        const off2 = px * px + py * py;
        if (!best || off2 < best.off2) best = { off2, seg: i, f };
      }
      return best;
    }
    // Zuerst nur ein Stück vor/hinter der letzten Stelle suchen: schnell, und
    // bei Routen, die dieselbe Straße zweimal benutzen, springt die Anzeige
    // nicht auf den falschen Abschnitt. Passt das nicht, ganze Route prüfen.
    let best = scan(navRouteSegHint - 5, navRouteSegHint + 250);
    if (!best || best.off2 > 50 * 50) {
      const all = scan(0, c.length - 1);
      if (all && (!best || all.off2 < best.off2)) best = all;
    }
    if (!best) return null;
    navRouteSegHint = best.seg;
    return { alongM: cum[best.seg] + best.f * (cum[best.seg + 1] - cum[best.seg]), offM: Math.sqrt(best.off2) };
  }
  function nearestDistanceToRoute(pos) {
    if (!navRouteCoords || navRouteCoords.length === 0) return Infinity;
    let min = Infinity;
    for (let i = 0; i < navRouteCoords.length; i++) {
      const d = haversineMeters(pos, { lat: navRouteCoords[i][0], lon: navRouteCoords[i][1] });
      if (d < min) min = d;
    }
    return min;
  }
  function maneuverText(step) {
    if (!step) return "";
    const m = step.maneuver || {};
    const street = step.name ? ` auf ${step.name}` : "";
    switch (m.type) {
      case "depart": return `Los geht's Richtung ${step.name || "Ziel"}`;
      case "arrive": return "Ziel erreicht";
      case "roundabout":
      case "rotary": return `Im Kreisverkehr die ${m.exit || 1}. Ausfahrt nehmen${street}`;
      case "turn":
      case "end of road":
      case "fork":
      case "merge":
        if (m.modifier === "left" || m.modifier === "sharp left") return `Links abbiegen${street}`;
        if (m.modifier === "slight left") return `Leicht links halten${street}`;
        if (m.modifier === "right" || m.modifier === "sharp right") return `Rechts abbiegen${street}`;
        if (m.modifier === "slight right") return `Leicht rechts halten${street}`;
        if (m.modifier === "uturn") return "Wenden";
        return `Geradeaus weiter${street}`;
      case "new name":
      case "continue": return `Weiter geradeaus${street}`;
      default: return `Weiter${street}`;
    }
  }
  /* ---------- Abbiege-Signal: kurzer Ton + kurz eingeblendeter Richtungspfeil
     ca. 100 m vor der nächsten Richtungsänderung ----------
     Der Ton wird per Web Audio API erzeugt (kein Audiofile nötig, läuft
     offline). Der AudioContext wird beim Antippen von "Start" (siehe
     confirmNavStart) angelegt/fortgesetzt, weil Browser einen neuen
     AudioContext nur innerhalb einer Nutzer-Geste erlauben – spätere,
     durch GPS-Updates ausgelöste Signale funktionieren dann trotzdem. */
  let turnAudioCtx = null;
  let navTurnAlertStepIndex = -1;
  let turnAlertHideTimer = null;
  function ensureTurnAudioUnlocked() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!turnAudioCtx) turnAudioCtx = new AudioCtx();
      if (turnAudioCtx.state === "suspended") turnAudioCtx.resume().catch(() => {});
      // Mobil-Browser entsperrt die Audioausgabe oft erst endgültig, wenn
      // innerhalb der Nutzer-Geste tatsächlich ein Ton gestartet wird (nicht
      // nur resume()) – deshalb hier ein extrem kurzer, praktisch unhörbarer
      // Ton direkt beim Antippen von "Start".
      const osc = turnAudioCtx.createOscillator(), gain = turnAudioCtx.createGain();
      gain.gain.setValueAtTime(0.0001, turnAudioCtx.currentTime);
      osc.connect(gain); gain.connect(turnAudioCtx.destination);
      osc.start(turnAudioCtx.currentTime);
      osc.stop(turnAudioCtx.currentTime + 0.01);
    } catch (e) { /* Ton optional */ }
  }
  function playChime(tones) {
    if (!turnAudioCtx) return;
    const ctx = turnAudioCtx;
    const doPlay = () => {
      try {
        const now = ctx.currentTime;
        const tone = (freq, start, dur, peak) => {
          const osc = ctx.createOscillator(), gain = ctx.createGain();
          osc.type = "sine"; osc.frequency.setValueAtTime(freq, now + start);
          gain.gain.setValueAtTime(0, now + start);
          gain.gain.linearRampToValueAtTime(peak, now + start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
          osc.connect(gain); gain.connect(ctx.destination);
          osc.start(now + start); osc.stop(now + start + dur + 0.02);
        };
        tones.forEach((t) => tone(t.freq, t.start, t.dur, t.peak));
      } catch (e) { /* Ton optional */ }
    };
    // Wurde der Kontext zwischenzeitlich angehalten (z. B. nach kurzem
    // Bildschirm-Sperren), MUSS auf das Ende von resume() gewartet werden,
    // bevor Töne eingeplant werden – sonst verpufft der Ton lautlos, weil
    // die Zeitstempel gegen eine noch stehende Uhr berechnet wurden.
    if (ctx.state === "suspended") ctx.resume().then(doPlay).catch(() => {});
    else doPlay();
  }
  function playTurnChime() {
    // sanfter, zweitönig aufsteigender Klang (kein schrilles Piepen)
    playChime([{ freq: 880, start: 0, dur: 0.4, peak: 0.16 }, { freq: 1320, start: 0.14, dur: 0.42, peak: 0.14 }]);
  }
  function playArrivalChime() {
    // eigenständiger, dreitönig aufsteigender Klang – bewusst anders als das
    // Abbiege-Signal, damit "Ziel erreicht" nicht mit einer Richtungsänderung
    // verwechselt wird.
    playChime([
      { freq: 660, start: 0, dur: 0.3, peak: 0.15 },
      { freq: 880, start: 0.12, dur: 0.3, peak: 0.15 },
      { freq: 1320, start: 0.24, dur: 0.5, peak: 0.18 },
    ]);
  }
  function isTurnManeuver(step) {
    if (!step || !step.maneuver) return false;
    const type = step.maneuver.type;
    if (type === "depart" || type === "arrive") return false;
    if (type === "roundabout" || type === "rotary") return true;
    const mod = step.maneuver.modifier;
    return !!mod && mod !== "straight";
  }
  /* Winkel (Grad, 0 = geradeaus, positiv = rechts, negativ = links), um
     den der Pfeil im Knick abbiegt – anhand des tatsächlichen OSRM-
     Abbiege-Modifiers, NICHT anhand der Peilung zum Manöverpunkt (die
     zeigte bisher meist nahezu geradeaus und damit nicht die reale
     Abbiegerichtung). */
  function turnBendDeg(mod) {
    switch (mod) {
      case "sharp left": return -132;
      case "left": return -88;
      case "slight left": return -38;
      case "slight right": return 38;
      case "right": return 88;
      case "sharp right": return 132;
      default: return 0;
    }
  }
  function bentArrowSvg(angleDeg) {
    const cx = 50, startY = 94, bendY = 52, armLen = 36;
    const rad = (angleDeg * Math.PI) / 180;
    const dirX = Math.sin(rad), dirY = -Math.cos(rad);
    const endX = cx + armLen * dirX, endY = bendY + armLen * dirY;
    const headLen = 24, headWidth = 34;
    const backX = endX - dirX * headLen, backY = endY - dirY * headLen;
    const perpX = -dirY, perpY = dirX;
    const p1x = backX + (perpX * headWidth) / 2, p1y = backY + (perpY * headWidth) / 2;
    const p2x = backX - (perpX * headWidth) / 2, p2y = backY - (perpY * headWidth) / 2;
    const f = (n) => n.toFixed(1);
    return `<svg viewBox="0 0 100 100" width="100%" height="100%" overflow="visible">
      <path d="M ${cx} ${startY} L ${cx} ${bendY} L ${f(backX)} ${f(backY)}" stroke="currentColor" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <polygon points="${f(endX)},${f(endY)} ${f(p1x)},${f(p1y)} ${f(p2x)},${f(p2y)}" fill="currentColor"/>
    </svg>`;
  }
  function uturnArrowSvg() {
    return `<svg viewBox="0 0 100 100" width="100%" height="100%" overflow="visible">
      <path d="M 38 94 L 38 42 A 22 22 0 0 1 82 42 L 82 68" stroke="currentColor" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <polygon points="82,90 68,64 96,64" fill="currentColor"/>
    </svg>`;
  }
  /* Kreisverkehr-Symbol: Ring in der Mitte plus Einfahrt (unten) und
     Ausfahrt-Pfeil, dessen Richtung sich – wie beim normalen Abbiegepfeil
     (bentArrowSvg) – nach dem tatsächlichen OSRM-Modifier der Ausfahrt
     richtet (angleDeg: 0 = geradeaus, negativ = links, positiv = rechts).
     Vorher zeigte der Pfeil immer fest nach rechts oben, unabhängig von der
     wirklichen Ausfahrtrichtung – das war das "falsche Symbol". */
  function roundaboutArrowSvg(angleDeg) {
    const cx = 50, cy = 46, r = 22;
    const rad = (angleDeg * Math.PI) / 180;
    const dirX = Math.sin(rad), dirY = -Math.cos(rad);
    const exitStartX = cx + r * dirX, exitStartY = cy + r * dirY;
    const armLen = 26, headLen = 20, headWidth = 28;
    const endX = cx + (r + armLen) * dirX, endY = cy + (r + armLen) * dirY;
    const backX = endX - dirX * headLen, backY = endY - dirY * headLen;
    const perpX = -dirY, perpY = dirX;
    const p1x = backX + (perpX * headWidth) / 2, p1y = backY + (perpY * headWidth) / 2;
    const p2x = backX - (perpX * headWidth) / 2, p2y = backY - (perpY * headWidth) / 2;
    const f = (n) => n.toFixed(1);
    return `<svg viewBox="0 0 100 100" width="100%" height="100%" overflow="visible">
      <path d="M 50 94 L 50 ${f(cy + r)}" stroke="currentColor" stroke-width="10" fill="none" stroke-linecap="round"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="currentColor" stroke-width="7"/>
      <path d="M ${f(exitStartX)} ${f(exitStartY)} L ${f(backX)} ${f(backY)}" stroke="currentColor" stroke-width="10" fill="none" stroke-linecap="round"/>
      <polygon points="${f(endX)},${f(endY)} ${f(p1x)},${f(p1y)} ${f(p2x)},${f(p2y)}" fill="currentColor"/>
    </svg>`;
  }
  function turnArrowMarkup(step) {
    const m = step && step.maneuver;
    if (!m) return bentArrowSvg(0);
    if (m.type === "roundabout" || m.type === "rotary") return roundaboutArrowSvg(turnBendDeg(m.modifier));
    if (m.modifier === "uturn") return uturnArrowSvg();
    return bentArrowSvg(turnBendDeg(m.modifier));
  }
  function showTurnArrow(step) {
    const wrap = $("turnAlert"), arrow = $("turnAlertArrow");
    if (!wrap || !arrow) return;
    arrow.innerHTML = turnArrowMarkup(step);
    wrap.classList.add("show");
    wrap.setAttribute("aria-hidden", "false");
    if (turnAlertHideTimer) clearTimeout(turnAlertHideTimer);
    turnAlertHideTimer = setTimeout(() => {
      wrap.classList.remove("show");
      wrap.setAttribute("aria-hidden", "true");
      turnAlertHideTimer = null;
    }, TURN_ALERT_DISPLAY_MS);
  }
  function maybeTriggerTurnAlert(stepIndex, step, relDeg) {
    if (!isTurnManeuver(step)) return;
    if (navTurnAlertStepIndex === stepIndex) return; // für diesen Schritt schon ausgelöst
    navTurnAlertStepIndex = stepIndex;
    playTurnChime();
    showTurnArrow(step);
    vibrate([60]);
  }
  function resetTurnAlerts() {
    navTurnAlertStepIndex = -1;
    if (turnAlertHideTimer) { clearTimeout(turnAlertHideTimer); turnAlertHideTimer = null; }
    const wrap = $("turnAlert");
    if (wrap) { wrap.classList.remove("show"); wrap.setAttribute("aria-hidden", "true"); }
  }
  function osrmRouteUrl(useBearing) {
    const profile = navParams().profile;
    // Auf routing.openstreetmap.de steckt das Profil im Pfad (routed-car / routed-foot);
    // das Segment "driving" ist dort ein fester Platzhalter.
    let url = `https://routing.openstreetmap.de/${profile}/route/v1/driving/` +
      `${lastKnownPos.lon.toFixed(6)},${lastKnownPos.lat.toFixed(6)};${navTarget.lon.toFixed(6)},${navTarget.lat.toFixed(6)}` +
      `?overview=full&geometries=geojson&steps=true`;
    if (useBearing) url += `&bearings=${Math.round(currentBearing) % 360},${navParams().bearingRange};`;
    return url;
  }
  async function fetchOsrmRoute(force) {
    if (!navTarget || !lastKnownPos) return;
    if (navRouteFetching) return;
    const now = Date.now();
    if (!force && now - navLastRouteFetchAt < OSRM_MIN_REFETCH_MS) return;
    navRouteFetching = true;
    navLastRouteFetchAt = now;
    const reqId = ++navRouteReqId;
    const hadRoute = !!(navRouteCoords && navRouteCoords.length > 1);
    const isReroute = hadRoute && navStarted;
    navRerouting = isReroute;
    if (isReroute) showRerouteHint();
    // Fahrtrichtung mitschicken, wenn sie verlässlich ist (Zielführung läuft,
    // Fahrzeug in Bewegung): dann beginnt die neue Route in Fahrtrichtung.
    const useBearing = navStarted && navHeadingValid && navParams().bearingRange > 0 &&
      (navLastSpeedMps === null || navLastSpeedMps > 1.5);
    const controller = new AbortController();
    navRouteAbort = controller;
    const timeout = setTimeout(() => controller.abort(), isReroute ? OSRM_REROUTE_TIMEOUT_MS : OSRM_TIMEOUT_MS);
    try {
      let data = null;
      try { data = await (await fetch(osrmRouteUrl(useBearing), { signal: controller.signal })).json(); }
      catch (e1) { if (!useBearing || controller.signal.aborted) throw e1; }
      // Mit Richtungsvorgabe keine passende Straße gefunden (z. B. Stillstand
      // auf einem Parkplatz): sofort ohne Richtungsvorgabe erneut anfragen.
      if (useBearing && reqId === navRouteReqId && (!data || data.code !== "Ok") && navTarget && lastKnownPos) {
        // Fair-Use-Regel (max. 1 Anfrage/Sekunde) auch hier einhalten.
        const waitMs = 1100 - (Date.now() - now);
        if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs));
        if (reqId !== navRouteReqId || controller.signal.aborted) throw new Error("abgebrochen");
        data = await (await fetch(osrmRouteUrl(false), { signal: controller.signal })).json();
      }
      clearTimeout(timeout);
      if (reqId !== navRouteReqId) return; // veraltet: Ziel inzwischen geändert/beendet
      if (data.code !== "Ok" || !data.routes || !data.routes[0]) throw new Error("no route");
      const route = data.routes[0];
      navRouteCoords = route.geometry.coordinates.map((c) => [c[1], c[0]]); // lon,lat -> lat,lon
      navRouteSteps = (route.legs[0] && route.legs[0].steps) || [];
      navStepIndex = 0;
      navOffrouteCount = 0;
      navRoutePaceSecPerM = (route.distance > 0) ? route.duration / route.distance : null;
      buildNavRouteProfile(route);
      if (navRouteFetchFailedOnce) showToast("Straßenroute wieder verfügbar.");
      navRouteFetchFailedOnce = false;
      resetTurnAlerts();
      if (liveMap) {
        if (navRouteLine) { try { liveMap.removeLayer(navRouteLine); } catch (e) {} }
        navRouteLine = L.polyline(navRouteCoords, { color: "#191970", weight: 3, opacity: 0.85 }).addTo(liveMap);
        if (navLine) { try { liveMap.removeLayer(navLine); } catch (e) {} navLine = null; }
      }
      navRerouting = false;
      navRouteFetching = false;
      navRouteAbort = null;
      updateNavInfo();
    } catch (e) {
      clearTimeout(timeout);
      if (reqId !== navRouteReqId) return; // abgebrochen, weil Ziel geändert/beendet
      navRouteAbort = null;
      navRerouting = false;
      if (isReroute && !navRouteFetchFailedOnce) {
        // Erster Fehlschlag unterwegs: alte Route bleibt stehen, beim nächsten
        // GPS-Update (nach dem Mindestabstand) wird es erneut versucht.
        navRouteFetchFailedOnce = true;
        showToast("Neue Route verzögert sich – wird erneut versucht.");
        return;
      }
      navRouteCoords = null;
      navRouteSteps = null;
      navRoutePaceSecPerM = null;
      clearNavRouteProfile();
      if (navRouteLine) { try { liveMap.removeLayer(navRouteLine); } catch (e) {} navRouteLine = null; }
      if (!navRouteFetchFailedOnce || isReroute) {
        navRouteFetchFailedOnce = true;
        showToast("Straßenroute nicht verfügbar – Luftlinie wird angezeigt.");
      }
    } finally {
      if (reqId === navRouteReqId) navRouteFetching = false;
    }
  }
  function showRerouteHint() {
    const el = $("navInstruction");
    if (!el) return;
    el.textContent = "Neue Route wird berechnet …";
    el.style.display = "block";
  }
  async function searchNavAddress() {
    const q = $("navAddressInput").value.trim();
    if (!q) return;
    $("navResults").innerHTML = '<div class="small">Suche…</div>';
    try {
      const data = await wzCore.geoSearch(q, 5);
      if (!Array.isArray(data) || data.length === 0) {
        $("navResults").innerHTML = '<div class="small">Keine Treffer gefunden.</div>';
        return;
      }
      $("navResults").innerHTML = "";
      data.forEach((item) => {
        const hasHouseNumber = !!(item.address && item.address.house_number);
        const btn = document.createElement("button");
        btn.className = "navresult-item";
        const main = document.createElement("div");
        main.textContent = item.display_name;
        btn.appendChild(main);
        if (!hasHouseNumber) {
          const note = document.createElement("div");
          note.className = "navresult-approx";
          note.textContent = "≈ ungefähre Lage – keine Hausnummer in den Kartendaten erfasst";
          btn.appendChild(note);
        }
        btn.addEventListener("click", () => {
          pickNavTarget(parseFloat(item.lat), parseFloat(item.lon), item.display_name.split(",")[0], !hasHouseNumber);
        });
        $("navResults").appendChild(btn);
      });
    } catch (e) {
      $("navResults").innerHTML = '<div class="small">Suche fehlgeschlagen – Internetverbindung prüfen.</div>';
    }
  }
  function updateNavInfo() {
    if (!navTarget || !lastKnownPos) return;
    const distM = haversineMeters(lastKnownPos, navTarget);
    $("navLabel").textContent = "Ziel: " + navTarget.label;

    if (navRouteCoords && navRouteCoords.length > 1) {
      // Echte Straßenroute vorhanden: Restdistanz/-dauer und Manöver aus
      // den OSRM-Schritten ableiten, Pfeil zeigt zum nächsten Manöverpunkt.
      let steps = navRouteSteps || [];
      while (navStepIndex < steps.length - 1) {
        const loc = steps[navStepIndex].maneuver.location; // [lon, lat]
        const d = haversineMeters(lastKnownPos, { lat: loc[1], lon: loc[0] });
        if (d <= navParams().arriveStepM) navStepIndex++;
        else break;
      }
      // Position auf die Routenlinie projizieren: daraus ergeben sich
      // Reststrecke/Restzeit entlang der echten Straßenroute.
      const proj = projectOnNavRoute(lastKnownPos);
      // Zusätzlich zum Abstand-Kriterium oben: Ist man auf der Route bereits
      // am Manöverpunkt vorbei (gemessen entlang der Linie), gilt der Schritt
      // ebenfalls als erledigt – auch wenn das GPS nie näher als
      // arriveStepM an den Punkt herankam (enge Bebauung, zu Fuß).
      if (proj && proj.offM <= navParams().offrouteM && navRouteTime && navRouteTime.length === steps.length + 1) {
        while (navStepIndex < steps.length - 1 && proj.alongM >= navRouteTime[navStepIndex].d - navParams().arriveStepM) navStepIndex++;
      }
      const curStep = steps[navStepIndex];
      let routeRemM = distM, etaSec = null;
      if (proj) {
        routeRemM = Math.max(0, navRouteLenM - proj.alongM);
        etaSec = Math.max(0, navRouteDurSec - navTimeAt(proj.alongM));
      }
      if (curStep) {
        const loc = curStep.maneuver.location;
        const distToManeuver = haversineMeters(lastKnownPos, { lat: loc[1], lon: loc[0] });
        const bearingToManeuver = computeBearing(lastKnownPos.lat, lastKnownPos.lon, loc[1], loc[0]);
        const rel = (bearingToManeuver - currentBearing + 360) % 360;
        $("navArrow").style.transform = `rotate(${rel.toFixed(0)}deg)`;
        $("navInstruction").textContent = navRerouting ? "Neue Route wird berechnet …" : maneuverText(curStep);
        $("navInstruction").style.display = "block";
        // Signal (Ton + kurz eingeblendeter Pfeil) ca. 100 m vor der
        // Richtungsänderung; steht sie bereits näher bevor (z. B. gleich zu
        // Beginn der Navigation), löst die Bedingung sofort aus. Liegt die
        // darauf folgende Richtungsänderung weniger als 100 m hinter dieser
        // (kurzes Wegstück zwischen zwei Abbiegungen), wird das Signal erst
        // 20 m vorher ausgelöst, damit es eindeutig dem richtigen Manöver
        // zugeordnet werden kann.
        const alertTriggerM = (typeof curStep.distance === "number" && curStep.distance < navParams().turnM)
          ? navParams().turnNearM : navParams().turnM;
        if (!navRerouting && distToManeuver <= alertTriggerM) maybeTriggerTurnAlert(navStepIndex, curStep, rel);
      }
      renderNavRest(routeRemM, etaSec, true);
      // Ist der Nutzer spürbar von der Route abgekommen, neue Route anfragen
      // (mit Mindestabstand zwischen zwei Anfragen, siehe OSRM_MIN_REFETCH_MS).
      // Bei gutem GPS-Signal schon früher: Schwelle wächst mit der Ungenauigkeit,
      // zwei Fixe in Folge daneben verhindern Fehlalarme durch einzelne Ausreißer.
      const np = navParams();
      const offM = proj ? proj.offM : nearestDistanceToRoute(lastKnownPos);
      const acc = navLastAcc;
      const fastM = (acc !== null && acc <= ACCURACY_REJECT_M) ? Math.min(np.offrouteM, Math.max(np.offrouteFastM, acc + 15)) : np.offrouteM;
      if (offM > fastM) navOffrouteCount++; else navOffrouteCount = 0;
      if (offM > np.offrouteM || navOffrouteCount >= 2) fetchOsrmRoute(false);
    } else {
      // Fallback: Luftlinie (keine Route verfügbar, z. B. offline).
      renderNavRest(distM, null, false);
      $("navInstruction").style.display = "none";
      const bearingToTarget = computeBearing(lastKnownPos.lat, lastKnownPos.lon, navTarget.lat, navTarget.lon);
      const rel = (bearingToTarget - currentBearing + 360) % 360;
      $("navArrow").style.transform = `rotate(${rel.toFixed(0)}deg)`;
      if (liveMap) {
        if (!navLine) {
          navLine = L.polyline([[lastKnownPos.lat, lastKnownPos.lon], [navTarget.lat, navTarget.lon]],
            { color: "#7C6AD8", weight: 3, dashArray: "6 8", opacity: 0.85 }).addTo(liveMap);
        } else {
          navLine.setLatLngs([[lastKnownPos.lat, lastKnownPos.lon], [navTarget.lat, navTarget.lon]]);
        }
      }
      // Kein aktiver Fetch, kein zu junger Fehlversuch: Route erneut versuchen
      // (z. B. Verbindung kam während der Navigation zurück).
      if (!navRouteFetching && Date.now() - navLastRouteFetchAt > OSRM_MIN_REFETCH_MS) fetchOsrmRoute(false);
    }

    if (distM <= navParams().arriveM) {
      if (!navArrivedShown) {
        navArrivedShown = true;
        showToast("Zielort erreicht.", 5000);
        vibrate([80, 50, 80]);
        playArrivalChime();
        // Ziel erreicht: Zielführung beenden (Ziel, Route, Pfeil,
        // Kartendrehung/-zoom werden zurückgesetzt). Lief gleichzeitig eine
        // Tour-Aufzeichnung, wird sie jetzt automatisch mitbeendet (wie ein
        // Tipp auf "Tour beenden"), statt unbemerkt im Hintergrund weiterzulaufen.
        const hadTour = !!tour;
        clearNavTarget();
        if (hadTour) stopSession(false);
      }
    } else {
      navArrivedShown = false;
    }
  }
  $("btnNavPick").addEventListener("click", () => {
    navPicking = true;
    // Karte kurz "nordoben" ausrichten, solange getippt wird: Bei gedrehter
    // Kartenansicht (Fahrtrichtung oben) würde ein Antippen sonst an einer
    // anderen Stelle landen, als visuell zu sehen ist (CSS-Rotation vs.
    // Leaflets eigene, nicht rotationsbewusste Klick-Berechnung).
    if (liveMap) {
      try { liveMap.getContainer().style.transform = "scale(1.6) rotate(0deg)"; } catch (e) {}
    }
    updateNavCardVisibility();
    showToast("Jetzt auf die Karte tippen.");
  });
  $("btnNavStart").addEventListener("click", confirmNavStart);
  $("btnNavSearch").addEventListener("click", searchNavAddress);
  $("navAddressInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); searchNavAddress(); }
  });
  $("btnNavCancel").addEventListener("click", clearNavTarget);
  $("btnNavFav").addEventListener("click", toggleNavFavorite);

  function centerLiveMapOnce(lat, lon) {
    if (!liveMap || hasCenteredLiveMap) return;
    hasCenteredLiveMap = true;
    try { liveMap.setView([lat, lon], 16); } catch (e) {}
  }
  let lastKnownPos = null;

  $("btnMapExpand").addEventListener("click", () => {
    $("ov-live").classList.add("map-expanded");
    requestAnimationFrame(() => { if (liveMap) { try { liveMap.invalidateSize(); } catch (e) {} } });
  });
  $("btnMapCollapse").addEventListener("click", () => {
    $("ov-live").classList.remove("map-expanded");
    requestAnimationFrame(() => { if (liveMap) { try { liveMap.invalidateSize(); } catch (e) {} } });
  });

  /* Zusammenfassung/Tour-Detail: gleiches Auf-/Zuklappen für ihre (statischen)
     Karten, per Event-Delegation, da hier zwei unabhängige Kartenansichten
     dieselben Button-Klassen wiederverwenden. */
  document.addEventListener("click", (e) => {
    const expandBtn = e.target.closest(".statichmapwrap .mapexpand");
    const collapseBtn = e.target.closest(".statichmapwrap .mapcollapse");
    if (!expandBtn && !collapseBtn) return;
    const overlay = e.target.closest(".overlay");
    if (!overlay) return;
    overlay.classList.toggle("map-expanded", !!expandBtn);
    requestAnimationFrame(() => {
      try {
        if (overlay.id === "ov-summary" && summaryMap) summaryMap.invalidateSize();
        if (overlay.id === "ov-detail" && detailMap) detailMap.invalidateSize();
      } catch (err) { /* Karte optional */ }
    });
  });

  /* Baut aus einer Punktliste durchgehende (solide) und Lücken-Segmente
     (gestrichelt) für die Kartendarstellung. Ein Punkt mit gapBefore=true
     markiert das Ende einer App-im-Hintergrund-Lücke – die direkte
     Verbindung zum vorherigen Punkt wird gestrichelt gezeichnet, da für
     diese Zeitspanne keine echten GPS-Punkte vorliegen. */
  function buildRouteSegments(path) {
    const solid = [];
    const dashed = [];
    let current = [];
    path.forEach((p, i) => {
      if (i > 0 && p.gapBefore) {
        if (current.length > 1) solid.push(current);
        const prev = path[i - 1];
        dashed.push([[prev.lat, prev.lon], [p.lat, p.lon]]);
        current = [[p.lat, p.lon]];
      } else {
        current.push([p.lat, p.lon]);
      }
    });
    if (current.length > 1) solid.push(current);
    return { solid, dashed };
  }

  function initLiveMap() {
    const el = $("map");
    el.innerHTML = "";
    liveMap = null; liveMarker = null; liveRouteLine = null; liveGapLayer = null;
    hasCenteredLiveMap = false;
    requestMapAccess("map", "Die Aufzeichnung läuft trotzdem normal weiter.", () => {
      if (!mapLibraryReady()) {
        showMapFallback("map", "Karte konnte nicht geladen werden. Die Aufzeichnung läuft trotzdem normal weiter.");
        return;
      }
      try {
        liveMap = L.map("map", { attributionControl: true, zoomControl: false }).setView([53.6, 10.0], 13);
        addTileLayer(liveMap);
        liveRouteLine = L.polyline(tour ? tour.points.map((p) => [p.lat, p.lon]) : [], { color: MODE_META[selectedMode].color, weight: 3 }).addTo(liveMap);
        liveGapLayer = L.layerGroup().addTo(liveMap);
        liveMarker = L.marker([53.6, 10.0], { icon: dotIcon(darkenColor(MODE_META[selectedMode].color, 0.35)) }).addTo(liveMap);
        const mapEl = liveMap.getContainer();
        mapEl.style.transformOrigin = "50% 50%";
        mapEl.style.transition = "transform .35s linear";
        mapEl.style.transform = "scale(1.6) rotate(0deg)";
        resetMapRotation();
        liveMap.on("click", (e) => {
          if (!navPicking) return;
          pickNavTarget(e.latlng.lat, e.latlng.lng);
        });
        // Falls beim Öffnen des Overlays bereits eine Position bekannt ist
        // (z. B. erneuter Start ohne Seiten-Neuladen), sofort darauf zentrieren.
        if (lastKnownPos) centerLiveMapOnce(lastKnownPos.lat, lastKnownPos.lon);
      } catch (e) {
        liveMap = null;
        showMapFallback("map", "Karte konnte nicht geladen werden. Die Aufzeichnung läuft trotzdem normal weiter.");
      }
    });
  }
  function drawLiveGapSegment(prevPoint, point) {
    if (!liveMap || !liveGapLayer || !prevPoint) return;
    try {
      L.polyline([[prevPoint.lat, prevPoint.lon], [point.lat, point.lon]],
        { color: MODE_META[tour.mode].color, weight: 3, dashArray: "6 8", opacity: 0.85 }).addTo(liveGapLayer);
    } catch (e) { /* Karte optional */ }
  }
  function updateLiveMapPosition(lat, lon) {
    lastKnownPos = { lat, lon };
    if (navTarget) updateNavInfo();
    if (!liveMap || !liveMarker) return;
    try {
      liveMarker.setLatLng([lat, lon]);
      if (!hasCenteredLiveMap) centerLiveMapOnce(lat, lon);
      else liveMap.panTo([lat, lon], { animate: true });
      if (liveRouteLine && tour) liveRouteLine.setLatLngs(tour.points.map((p) => [p.lat, p.lon]));
    } catch (e) { /* Karte optional, Tracking-Daten sind unabhängig davon bereits gesichert */ }
  }

  function drawStaticRoute(containerId, path, color, onDone) {
    const el = $(containerId);
    el.innerHTML = "";
    requestMapAccess(containerId, "Deine Tourdaten sind trotzdem vollständig gespeichert.", () => {
      if (!mapLibraryReady()) {
        showMapFallback(containerId, "Karte konnte nicht geladen werden. Deine Tourdaten sind trotzdem vollständig gespeichert.");
        onDone && onDone(null);
        return;
      }
      let map;
      try {
        map = L.map(containerId, { attributionControl: true, scrollWheelZoom: false });
        addTileLayer(map);
      } catch (e) {
        showMapFallback(containerId, "Karte konnte nicht geladen werden. Deine Tourdaten sind trotzdem vollständig gespeichert.");
        onDone && onDone(null);
        return;
      }
      let latlngs = [];
      try {
        if (path.length > 1) {
          const mainColor = color || MODE_META.car.color;
          const { solid, dashed } = buildRouteSegments(path);
          solid.forEach((seg) => L.polyline(seg, { color: mainColor, weight: 3 }).addTo(map));
          dashed.forEach((seg) => L.polyline(seg, { color: mainColor, weight: 3, dashArray: "6 8", opacity: 0.85 }).addTo(map));
          latlngs = path.map((p) => [p.lat, p.lon]);
          L.marker(latlngs[0], { icon: dotIcon("#2E7D32") }).addTo(map);
          L.marker(latlngs[latlngs.length - 1], { icon: dotIcon("#C62828") }).addTo(map);
          map.fitBounds(latlngs, { padding: [28, 28] });
        } else if (path.length === 1) {
          map.setView([path[0].lat, path[0].lon], 15);
          L.marker([path[0].lat, path[0].lon], { icon: dotIcon("#2A3B66") }).addTo(map);
        } else {
          map.setView([53.6, 10.0], 4);
        }
      } catch (e) { /* Route optional */ }
      // Härtung gegen die gemeldete "leere Karte in Zusammenfassung/Verlauf":
      // Auf manchen Geräten/PWA-Ansichten ist der Kartencontainer im ersten
      // Frame nach dem Öffnen des Overlays noch nicht final bemessen (0 Höhe/
      // Breite), wodurch Leaflet die Kachel-/Routen-Darstellung falsch oder gar
      // nicht aufbaut. Ein einzelner verzögerter invalidateSize()-Aufruf (wie
      // bisher) reicht dafür nicht immer aus. Deshalb zusätzlich: mehrere
      // gestaffelte Nachversuche UND ein ResizeObserver, der jede tatsächliche
      // Größenänderung des Containers abfängt (z. B. wenn das Overlay erst
      // etwas später seine endgültigen Maße bekommt) und die Karte danach neu
      // vermisst/zentriert.
      const resize = () => {
        try {
          map.invalidateSize();
          if (latlngs.length > 1) map.fitBounds(latlngs, { padding: [28, 28] });
        } catch (e) {}
      };
      [50, 250, 600, 1200].forEach((ms) => setTimeout(resize, ms));
      try {
        const ro = new ResizeObserver(() => resize());
        ro.observe(el);
        map.on("unload", () => { try { ro.disconnect(); } catch (e) {} });
      } catch (e) { /* ResizeObserver optional */ }
      onDone && onDone(map);
    });
  }

  /* ---------- Mode select (Start-Tab) ---------- */
  // Auto oder Zu Fuß; die letzte Wahl wird gemerkt. Während einer laufenden
  // Session lässt sich der Modus bewusst nicht umschalten (Auswahl liegt im Start-Tab).
  let selectedMode = "car";
  try { if (localStorage.getItem("wk-mode") === "walk") selectedMode = "walk"; } catch (e) {}
  function applyModeSelection() {
    document.querySelectorAll("#modeSelect .mode").forEach((b) => b.classList.toggle("active", b.getAttribute("data-mode") === selectedMode));
    if ($("liveDrivenLbl")) $("liveDrivenLbl").textContent = selectedMode === "walk" ? "Gegangen" : "Gefahren";
  }
  $("modeSelect").addEventListener("click", (e) => {
    const btn = e.target.closest(".mode");
    if (!btn) return;
    selectedMode = btn.getAttribute("data-mode") === "walk" ? "walk" : "car";
    try { localStorage.setItem("wk-mode", selectedMode); } catch (err) {}
    applyModeSelection();
    updateNewTourHint();
  });

  /* ---------- Aufzeichnen/Navigation-Auswahl (Start-Tab) ----------
     Muss VOR dem Start feststehen: entweder eine Tour aufzeichnen, oder
     navigieren (mit oder ohne gleichzeitiger Aufzeichnung). Während der
     laufenden Session lässt sich das bewusst nicht mehr umschalten. */
  let sessionType = "track";   // "track" | "navigate"
  let navWithTracking = true;  // nur relevant, wenn sessionType === "navigate"
  function updateNewTourHint() {
    if (sessionType === "track") {
      $("newtourHint").textContent = "Auf „Start” tippen, um " + (selectedMode === "walk" ? "einen Fußweg" : "eine Autofahrt") + " aufzuzeichnen. Aufzeichnung startet erst mit diesem Tipp und läuft nur, solange die App geöffnet ist.";
    } else if (navWithTracking) {
      $("newtourHint").textContent = "Navigation mit gleichzeitiger Tour-Aufzeichnung. Erst Ziel per Adresssuche oder Kartentipp wählen – Tour und Zielführung starten dann mit dem zweiten Start-Tipp.";
    } else {
      $("newtourHint").textContent = "Reine Navigation ohne Aufzeichnung – es wird keine Tour gespeichert. Ziel nach dem Start per Adresssuche oder Kartentipp wählen.";
    }
  }
  $("sessionSelect").addEventListener("click", (e) => {
    const btn = e.target.closest(".mode");
    if (!btn) return;
    document.querySelectorAll("#sessionSelect .mode").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    sessionType = btn.getAttribute("data-session");
    $("navTrackSelect").style.display = sessionType === "navigate" ? "flex" : "none";
    updateNewTourHint();
  });
  $("navTrackSelect").addEventListener("click", (e) => {
    const btn = e.target.closest(".mode");
    if (!btn) return;
    document.querySelectorAll("#navTrackSelect .mode").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    navWithTracking = btn.getAttribute("data-navtrack") === "yes";
    updateNewTourHint();
  });
  applyModeSelection();
  updateNewTourHint();

  /* ---------- Gerätespeicher für Fotos und Zwischenstand ----------
     Eigene Datenbank "naviwahr" (IndexedDB, bleibt auf dem Gerät):
     - "fotos":   Fotos der Notizen. Sie lagen früher zusammen mit den Touren
                  im kleinen gemeinsamen Speicher aller Apps und haben ihn am
                  schnellsten gefüllt.
     - "laufend": Zwischenstand der gerade laufenden Aufzeichnung, damit eine
                  Fahrt nicht verloren geht, wenn das System die App im
                  Hintergrund schließt.
     Steht die Datenbank nicht zur Verfügung, arbeitet NaviWahr wie bisher
     (Foto bei der Tour, kein Zwischenstand). */
  const WKDB = (() => {
    let dbP = null;
    function open() {
      if (dbP) return dbP;
      dbP = new Promise((resolve) => {
        let r;
        try { r = indexedDB.open("naviwahr", 1); } catch (e) { resolve(null); return; }
        r.onupgradeneeded = () => {
          const d = r.result;
          if (!d.objectStoreNames.contains("fotos")) d.createObjectStore("fotos", { keyPath: "id" });
          if (!d.objectStoreNames.contains("laufend")) d.createObjectStore("laufend", { keyPath: "id" });
        };
        r.onsuccess = () => {
          const d = r.result;
          d.onversionchange = () => { try { d.close(); } catch (e) {} dbP = null; };
          d.onclose = () => { dbP = null; };
          resolve(d);
        };
        r.onerror = (ev) => { if (ev && ev.preventDefault) ev.preventDefault(); dbP = null; resolve(null); };
        r.onblocked = () => { dbP = null; resolve(null); };
      });
      return dbP;
    }
    function run(store, mode, fn) {
      return open().then((d) => new Promise((resolve) => {
        if (!d) { resolve({ ok: false }); return; }
        let out;
        try {
          const tx = d.transaction(store, mode);
          const req = fn(tx.objectStore(store));
          if (req) req.onsuccess = () => { out = req.result; };
          tx.oncomplete = () => resolve({ ok: true, value: out });
          tx.onerror = (ev) => { if (ev && ev.preventDefault) ev.preventDefault(); };
          tx.onabort = () => resolve({ ok: false });
        } catch (e) { dbP = null; resolve({ ok: false }); }
      })).catch(() => ({ ok: false }));
    }
    return {
      put: (store, value) => run(store, "readwrite", (s) => s.put(value)).then((r) => r.ok),
      get: (store, id) => run(store, "readonly", (s) => s.get(id)).then((r) => (r.ok && r.value ? r.value : null)),
      del: (store, id) => run(store, "readwrite", (s) => s.delete(id)).then((r) => r.ok),
      keys: (store) => run(store, "readonly", (s) => s.getAllKeys()).then((r) => (r.ok ? (r.value || []) : null))
    };
  })();

  /* Fotos der Notizen: neue Notizen tragen nur noch eine Kennung (photoId),
     das Bild selbst liegt in der Datenbank. Ältere Notizen mit eingebettetem
     Bild (photo) werden weiterhin angezeigt und beim Start umgezogen. */
  const sessionPhotoIds = new Set();
  function newPhotoId(t) { return "f" + (t || Date.now()) + "-" + Math.floor(Math.random() * 1e9).toString(36); }
  async function storeNotePhoto(dataUrl, t) {
    const id = newPhotoId(t);
    sessionPhotoIds.add(id);
    const ok = await WKDB.put("fotos", { id: id, data: dataUrl, t: t || Date.now() });
    return ok ? id : null;
  }
  function noteImgHtml(n, style) {
    if (n && typeof n.photo === "string" && n.photo) return `<img src="${n.photo}" alt="" style="${style}">`;
    if (n && n.photoId) return `<img data-wkfoto="${escapeHtml(String(n.photoId))}" alt="" style="${style}" hidden>`;
    return "";
  }
  function fillNotePhotos(rootEl) {
    if (!rootEl) return;
    rootEl.querySelectorAll("img[data-wkfoto]").forEach((img) => {
      const id = img.getAttribute("data-wkfoto");
      img.removeAttribute("data-wkfoto");
      WKDB.get("fotos", id).then((rec) => { if (rec && rec.data) { img.src = rec.data; img.hidden = false; } });
    });
  }
  /* Einmaliger Umzug: eingebettete Fotos gespeicherter Touren in die Datenbank.
     Erst wenn ein Foto dort nachweislich liegt, wird es aus der Tour entfernt. */
  async function migrateTourPhotos() {
    let raw = null;
    try { raw = localStorage.getItem("wk-tours"); } catch (e) { return; }
    if (!raw || raw.indexOf("data:image") === -1) return;
    let list;
    try { list = JSON.parse(raw); } catch (e) { return; }
    if (!Array.isArray(list)) return;
    const moved = new Map(); // Bilddaten -> Kennung
    for (const t of list) {
      for (const n of (t && Array.isArray(t.notes) ? t.notes : [])) {
        if (!n || typeof n.photo !== "string" || n.photo.indexOf("data:") !== 0 || moved.has(n.photo)) continue;
        const id = await storeNotePhoto(n.photo, n.t);
        if (!id) return; // Datenbank nicht nutzbar: alles bleibt, wie es ist
        const back = await WKDB.get("fotos", id);
        if (!back || back.data !== n.photo) return;
        moved.set(n.photo, id);
      }
    }
    if (!moved.size) return;
    // Zweiter Schritt ohne Wartezeit: den jetzt aktuellen Stand lesen, ersetzen, speichern.
    let fresh;
    try { fresh = JSON.parse(localStorage.getItem("wk-tours") || "[]"); } catch (e) { return; }
    if (!Array.isArray(fresh)) return;
    let changed = false;
    fresh.forEach((t) => (t && Array.isArray(t.notes) ? t.notes : []).forEach((n) => {
      if (n && typeof n.photo === "string" && moved.has(n.photo)) { n.photoId = moved.get(n.photo); delete n.photo; changed = true; }
    }));
    if (changed) { try { localStorage.setItem("wk-tours", JSON.stringify(fresh)); } catch (e) { /* alter Stand bleibt gültig */ } }
  }
  /* Aufräumen: Fotos, zu denen es keine Tour mehr gibt (gelöscht oder
     verworfen), werden beim nächsten Start entfernt – so bleibt „Rückgängig“
     nach dem Löschen einer Tour vollständig möglich. */
  async function cleanupOrphanPhotos(extraNotes) {
    let raw = null, list;
    try { raw = localStorage.getItem("wk-tours"); } catch (e) { return; }
    try { list = JSON.parse(raw || "[]"); } catch (e) { return; }
    if (!Array.isArray(list)) return;
    const used = new Set();
    list.forEach((t) => (t && Array.isArray(t.notes) ? t.notes : []).forEach((n) => { if (n && n.photoId) used.add(String(n.photoId)); }));
    (extraNotes || []).forEach((n) => { if (n && n.photoId) used.add(String(n.photoId)); });
    const keys = await WKDB.keys("fotos");
    if (!keys) return;
    for (const k of keys) {
      const id = String(k);
      if (used.has(id) || sessionPhotoIds.has(id)) continue;
      if (tour && tour.notes && tour.notes.some((n) => n && n.photoId === id)) continue;
      await WKDB.del("fotos", k);
    }
  }

  /* ---------- Zwischenstand der laufenden Aufzeichnung ----------
     Alle 20 Sekunden, beim Pausieren, nach jeder Notiz und immer dann, wenn
     die App in den Hintergrund geht, wird der Stand der Aufzeichnung abgelegt.
     Schließt das System die App, bietet NaviWahr beim nächsten Öffnen an,
     die Aufzeichnung fortzusetzen oder als Tour anzusehen. */
  const CHECKPOINT_EVERY_MS = 20000;
  const RESUME_MAX_AGE_MS = 6 * 3600 * 1000; // danach nur noch „ansehen“, nicht mehr „fortsetzen“
  let checkpointBusy = false;
  function checkpoint() {
    if (!tour || !Array.isArray(tour.points) || tour.points.length < 1) return;
    if (checkpointBusy) return;
    const now = Date.now();
    // Pausen bis zu diesem Moment einrechnen, damit der Stand für sich allein stimmt
    const pausedMs = tour.pausedMs +
      (isPaused && pauseStartedAt !== null ? now - pauseStartedAt : 0) +
      (autoPaused && autoPauseStart !== null ? now - autoPauseStart : 0);
    const snap = Object.assign({}, tour, { pausedMs: pausedMs, currentSpeedKmh: 0 });
    checkpointBusy = true;
    WKDB.put("laufend", { id: "tour", savedAt: now, tour: snap }).then(() => { checkpointBusy = false; }, () => { checkpointBusy = false; });
  }
  function clearCheckpoint() { return WKDB.del("laufend", "tour"); }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") checkpoint(); });
  window.addEventListener("pagehide", checkpoint);

  /* ---------- Tracking state ---------- */
  let watchId = null;
  let timerId = null;
  let isPaused = false;
  let pauseStartedAt = null;
  let tour = null; // {mode, startTime, points:[{lat,lon,t,acc}], distanceM, maxSpeedKmh, weather, notes:[], pausedMs}

  /* Automatische Pause bei Stillstand (optionale Einstellung): startet und
     beendet die Tour weiterhin ausschließlich der Nutzer manuell – hier wird
     lediglich das Weiterzählen von Zeit/Strecke pausiert, solange die
     Aufzeichnung bereits läuft. Die Positionsabfrage (watchPosition) bleibt
     dabei aktiv, damit eine Bewegung danach automatisch erkannt wird. */
  const AUTO_PAUSE_AFTER_MS = 25000;
  const AUTO_PAUSE_MOVE_M = 12;
  let autoPaused = false;
  let autoPauseStart = null;
  let lastMoveAt = null;

  /* Erkennung von App-im-Hintergrund-Lücken (Display gesperrt, App
     gewechselt): Wird beim Zurückkehren in den Vordergrund anhand des
     Zeitsprungs seit dem letzten GPS-Punkt erkannt. Die Zeitspanne wird
     unabhängig von der Nutzer-Entscheidung als Lücke markiert, damit sie
     auf der Karte gestrichelt dargestellt wird – die Nutzer-Entscheidung
     betrifft nur, ob die Zeit zur Dauer der Tour zählt. */
  const BACKGROUND_GAP_MS = 15000;
  let awaitingGapMark = false;
  let pendingGapMs = 0;
  function closeBgGapModal() { $("ov-bggap").classList.remove("open"); }
  $("btnBgGapPause").addEventListener("click", () => {
    if (tour) tour.pausedMs += pendingGapMs;
    pendingGapMs = 0;
    closeBgGapModal();
    updateLiveStats();
  });
  $("btnBgGapActive").addEventListener("click", () => {
    pendingGapMs = 0;
    closeBgGapModal();
  });

  function resetTourState(mode) {
    tour = { mode, startTime: Date.now(), endTime: null, points: [], distanceM: 0, maxSpeedKmh: 0, currentSpeedKmh: 0, weather: null, notes: [], pausedMs: 0 };
    isPaused = false;
    pauseStartedAt = null;
    autoPaused = false;
    autoPauseStart = null;
    lastMoveAt = Date.now();
    awaitingGapMark = false;
    pendingGapMs = 0;
  }
  function engageAutoPause() {
    autoPaused = true;
    autoPauseStart = Date.now();
    vibrate(15);
    $("gpsHint").textContent = "Automatische Pause – keine Bewegung erkannt.";
  }
  function releaseAutoPause() {
    if (autoPauseStart !== null) tour.pausedMs += Date.now() - autoPauseStart;
    autoPaused = false;
    autoPauseStart = null;
    $("gpsHint").textContent = "";
  }
  function plausibleSpeedKmh(mode) { return MODE_META[mode].maxPlausibleKmh; }

  const ACCURACY_REJECT_M = 30; // Fixe mit schlechterer Genauigkeit fließen nicht in Strecke/Route ein
  const MIN_MOVE_M = 5;         // Mindestbewegung, damit GPS-Wackeln im Stehen nicht als Strecke zählt

  function handlePosition(pos) {
    const { latitude: lat, longitude: lon, accuracy, altitude } = pos.coords;
    const t = pos.timestamp || Date.now();
    const point = { lat, lon, t, acc: accuracy, alt: typeof altitude === "number" ? altitude : null };

    if (!autoPaused) {
      $("gpsHint").innerHTML = accuracy > 25 ? `${svgIcon("warning")} Schwaches GPS-Signal (±${Math.round(accuracy)} m)` : "";
    }

    // Genauigkeit/Tempo für die Abweichungserkennung und die Neuberechnung merken.
    navLastAcc = typeof accuracy === "number" ? accuracy : null;
    navLastSpeedMps = (typeof pos.coords.speed === "number" && !isNaN(pos.coords.speed) && pos.coords.speed >= 0) ? pos.coords.speed : null;
    // Live-Markerposition immer aktualisieren, damit die Karte reagiert –
    // in die Streckenberechnung fließen aber nur ausreichend genaue Fixe ein.
    updateLiveMapPosition(lat, lon);
    if (accuracy <= ACCURACY_REJECT_M && navTarget && navStarted) {
      updateHeading(point, pos.coords.heading);
      updateNavZoom(point, pos.coords.speed);
    }

    if (!tour) {
      // Reine Navigation ohne Aufzeichnung: Karte/Peilung/Ziel-Entfernung
      // sind oben bzw. über updateLiveMapPosition bereits aktualisiert,
      // es gibt aber keine Tour-Strecke/-Zeit zu berechnen.
      return;
    }

    if (settings.autoPause && accuracy <= ACCURACY_REJECT_M) {
      const lastAny = tour.points[tour.points.length - 1];
      if (lastAny) {
        const moved = haversineMeters(lastAny, point) >= AUTO_PAUSE_MOVE_M;
        if (moved) {
          lastMoveAt = t;
          if (autoPaused) releaseAutoPause();
        } else if (!autoPaused && lastMoveAt !== null && (t - lastMoveAt) > AUTO_PAUSE_AFTER_MS) {
          engageAutoPause();
        }
      }
    }
    if (autoPaused) { tour.currentSpeedKmh = 0; updateLiveStats(); return; }

    if (accuracy > ACCURACY_REJECT_M) return;

    const last = tour.points[tour.points.length - 1];
    if (last) {
      const distM = haversineMeters(last, point);
      const dtS = Math.max(0.5, (t - last.t) / 1000);
      const speedKmh = (distM / dtS) * 3.6;
      const maxOk = plausibleSpeedKmh(tour.mode) * 1.3;
      if (speedKmh > maxOk) { updateLiveStats(); return; } // vermutlicher GPS-Ausreißer, Tempo aber nicht "einfrieren"
      // Bewegung muss deutlich über der Positionsungenauigkeit liegen, sonst
      // wird reines GPS-Wackeln im Stehen fälschlich als Strecke gezählt.
      const noiseFloor = Math.max(MIN_MOVE_M, (last.acc || 15) * 0.6);
      if (distM < noiseFloor) {
        // Keine echte Bewegung: Tempo auf 0 setzen, statt den letzten Wert
        // stehen zu lassen (z.B. Auto/Fußgänger hält an). Zu Fuß liegen
        // zwischen zwei verwertbaren Punkten normal mehrere Sekunden – dort
        // fällt das Tempo erst nach speedHoldMs ohne neuen Punkt auf 0.
        if ((t - last.t) > navParams().speedHoldMs) tour.currentSpeedKmh = 0;
        updateLiveStats();
        return;
      }
      tour.distanceM += distM;
      lastMoveAt = t; // gezählte Strecke = Bewegung (sonst greift die Auto-Pause bei langsamem Tempo fälschlich)
      if (awaitingGapMark) { point.gapBefore = true; awaitingGapMark = false; drawLiveGapSegment(last, point); }
      tour.points.push(point);
      if (speedKmh > tour.maxSpeedKmh) tour.maxSpeedKmh = speedKmh;
      tour.currentSpeedKmh = speedKmh;
    } else {
      if (awaitingGapMark) { point.gapBefore = true; awaitingGapMark = false; }
      tour.points.push(point);
      checkpoint(); // erster Punkt: die Aufzeichnung ist ab jetzt gesichert
    }

    updateLiveStats();
  }

  function updateLiveStats() {
    const livePausedMs = tour.pausedMs + (autoPaused && autoPauseStart !== null ? Date.now() - autoPauseStart : 0);
    const elapsedS = (Date.now() - tour.startTime - livePausedMs) / 1000;
    const km = tour.distanceM / 1000;
    $("liveDistance").textContent = fmt2(km);
    $("liveTime").textContent = formatDuration(elapsedS);
    const avg = elapsedS > 0 ? km / (elapsedS / 3600) : 0;
    $("liveAvg").textContent = fmt1(avg);
    $("liveMax").textContent = fmt1(tour.maxSpeedKmh);
    $("liveSpeed").textContent = fmt1(tour.currentSpeedKmh || 0);
  }

  function startWatch() {
    watchId = navigator.geolocation.watchPosition(handlePosition, (err) => {
      if (err.code === 1) {
        showToast("Standortzugriff wurde verweigert.");
        stopSession(true);
      }
    }, { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 });
    if (tour) timerId = setInterval(updateLiveStats, 1000);
  }

  function startSession(resumeTour) {
    if (!("geolocation" in navigator)) {
      showToast("Standortzugriff wird von diesem Browser nicht unterstützt.");
      return;
    }
    const resuming = !!(resumeTour && Array.isArray(resumeTour.points));
    const doNav = !resuming && sessionType === "navigate";
    // Reine Aufzeichnung (ohne Navigation) startet sofort mit diesem
    // Start-Tipp, da hier bereits alle Auswahlen (Modus) getroffen sind.
    // Bei Navigation (mit oder ohne gleichzeitiger Aufzeichnung) fehlt an
    // dieser Stelle noch die Zielauswahl – Zeit/Strecke der Tour beginnen
    // deshalb dort erst mit dem zweiten, echten Start-Tipp nach der
    // Zielwahl (siehe confirmNavStart). Hier wird nur die Statistik-UI
    // schon eingeblendet (mit 0-Werten), aber nicht gestartet.
    const doTrackNow = resuming || sessionType === "track";
    const doTrackUI = doTrackNow || (doNav && navWithTracking);

    if (resuming) {
      // Unterbrochene Aufzeichnung übernehmen: der nächste Punkt gilt als Ende einer Lücke
      tour = resumeTour;
      isPaused = false; pauseStartedAt = null; autoPaused = false; autoPauseStart = null;
      lastMoveAt = Date.now(); awaitingGapMark = true; pendingGapMs = 0;
      gapBaseT = Date.now();
    } else if (doTrackNow) {
      resetTourState(selectedMode);
    } else {
      tour = null;
      isPaused = false; pauseStartedAt = null; autoPaused = false; autoPauseStart = null;
      lastMoveAt = null; awaitingGapMark = false; pendingGapMs = 0;
    }

    $("liveTrackUI").style.display = doTrackUI ? "" : "none";
    $("liveStatgrid").style.display = doTrackUI ? "" : "none";
    $("liveTrackBtnRow").style.display = doTrackUI ? "" : "none";
    $("btnStopTour").innerHTML = doTrackUI ? `${svgIcon("stop")} Tour beenden` : `${svgIcon("stop")} Navigation beenden`;
    if (doTrackUI) {
      $("liveModeLabel").textContent = MODE_META[selectedMode].label;
      $("liveDistance").textContent = "0,00";
      $("liveTime").textContent = "00:00";
      $("liveSpeed").textContent = "0,0";
      $("liveAvg").textContent = "0,0";
      $("liveMax").textContent = "0,0";
    }
    $("liveWeather").style.display = "none";
    $("gpsHint").textContent = "";
    $("btnPauseTour").innerHTML = `${svgIcon("pause")} Pause`;
    $("btnPauseTour").disabled = false;
    if (resuming) { updateLiveStats(); if (tour.weather) renderWeatherLine($("liveWeather"), tour.weather); }

    navTarget = null; navStarted = false; navLine = null; navMarker = null; navArrivedShown = false;
    navRouteLine = null; navRouteCoords = null; navRouteSteps = null; navStepIndex = 0;
    cancelNavRouteFetch();
    navLastRouteFetchAt = 0; navRouteFetching = false; navRouteFetchFailedOnce = false;
    clearNavRouteProfile();
    $("ov-live").classList.toggle("navmode", doNav);
    resetNavZoom();
    $("navInstruction").textContent = ""; $("navInstruction").style.display = "none";
    $("navAddressInput").value = ""; $("navResults").innerHTML = "";
    navVisible = doNav;
    navPicking = doNav; // Ziel-Auswahl beginnt direkt nach dem Start
    updateNavCardVisibility();

    openOverlay("live");
    // Bei Navigation (ob mit oder ohne gleichzeitiger Tour-Aufzeichnung)
    // wird erst dann wirklich gestartet (Zeit/Strecke, Display-Wachhalten,
    // GPS-Dauerabfrage), wenn der Nutzer nach der Zielwahl auf "Start"
    // tippt (siehe confirmNavStart) – bis dahin nur Zielauswahl, um Akku
    // zu sparen und weil die Auswahl (Ziel) hier noch nicht abgeschlossen
    // ist. Nur bei reiner Aufzeichnung ohne Navigation startet alles
    // sofort mit diesem Tipp.
    if (doNav) $("pageTitle").textContent = "Ziel wählen";
    vibrate(30);
    if (doTrackNow) requestWakeLock();
    if (liveMap) { try { liveMap.remove(); } catch (e) {} liveMap = null; }
    initLiveMap();

    // Kartenaufbau ist bewusst unabhängig von allem Folgenden: Auch wenn
    // initLiveMap() oben fehlschlägt, laufen Standortabfrage und Timer weiter.
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        lastKnownPos = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        centerLiveMapOnce(pos.coords.latitude, pos.coords.longitude);
        if (doTrackNow && tour && !tour.weather) {
          fetchWeather(pos.coords.latitude, pos.coords.longitude)
            .then((w) => { tour.weather = w; renderWeatherLine($("liveWeather"), w); })
            .catch(() => { /* Wetter optional, Tracking läuft trotzdem */ });
        }
      },
      () => { /* kein Toast nötig: watchPosition liefert i. d. R. kurz danach eine Position und zentriert dann */ },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    if (doTrackNow) startWatch();
  }

  function togglePause() {
    if (!tour) return;
    vibrate(15);
    if (!isPaused) {
      isPaused = true;
      pauseStartedAt = Date.now();
      if (autoPaused) releaseAutoPause();
      if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
      if (timerId !== null) { clearInterval(timerId); timerId = null; }
      $("btnPauseTour").innerHTML = `${svgIcon("play")} Fortsetzen`;
      $("gpsHint").textContent = "Pausiert – Zeit und Strecke werden nicht erfasst.";
      releaseWakeLock();
    } else {
      isPaused = false;
      if (pauseStartedAt !== null) { tour.pausedMs += Date.now() - pauseStartedAt; pauseStartedAt = null; }
      lastMoveAt = Date.now();
      $("btnPauseTour").innerHTML = `${svgIcon("pause")} Pause`;
      $("gpsHint").textContent = "";
      requestWakeLock();
      startWatch();
    }
    checkpoint();
  }
  $("btnPauseTour").addEventListener("click", togglePause);

  function stopSession(aborted) {
    if (isPaused && pauseStartedAt !== null && tour) { tour.pausedMs += Date.now() - pauseStartedAt; pauseStartedAt = null; }
    if (autoPaused && tour) releaseAutoPause();
    closeBgGapModal();
    awaitingGapMark = false;
    isPaused = false;
    if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
    if (timerId !== null) { clearInterval(timerId); timerId = null; }
    releaseWakeLock();
    vibrate([20, 40, 20]);
    navPicking = false;
    clearNavLayers();
    if (!tour) {
      // Reine Navigation ohne Aufzeichnung: nichts zu speichern/zusammenzufassen.
      closeOverlay();
      switchTab("start");
      return;
    }
    tour.endTime = Date.now();

    if (aborted && tour.points.length < 2) {
      clearCheckpoint();
      showToast("Tour abgebrochen.");
      closeOverlay();
      switchTab("start");
      return;
    }
    checkpoint(); // beendet, aber noch nicht gespeichert: bleibt bis „Speichern“ oder „Verwerfen“ gesichert
    renderSummary();
  }

  $("btnStartTour").addEventListener("click", () => startSession());
  $("btnStopTour").addEventListener("click", () => stopSession(false));

  /* ---------- Notes ---------- */
  function resizeImageToDataUrl(file, maxDim) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = () => { img.src = reader.result; };
      reader.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) { height *= maxDim / width; width = maxDim; }
        else if (height > maxDim) { width *= maxDim / height; height = maxDim; }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  $("btnAddNote").addEventListener("click", () => {
    if (!tour) return;
    $("noteTitle").value = "";
    $("noteText").value = "";
    $("notePhoto").value = "";
    openNoteModal();
  });
  $("btnNoteCancel").addEventListener("click", () => closeNoteModal());
  $("btnNoteSave").addEventListener("click", async () => {
    if (!tour) { closeNoteModal(); return; }
    const noteTour = tour;
    const last = tour.points[tour.points.length - 1];
    const note = {
      t: Date.now(), lat: last ? last.lat : null, lon: last ? last.lon : null,
      title: $("noteTitle").value.trim(), text: $("noteText").value.trim(), photo: null
    };
    const file = $("notePhoto").files[0];
    try {
      if (file) {
        const dataUrl = await resizeImageToDataUrl(file, 900);
        const photoId = await storeNotePhoto(dataUrl, note.t);
        if (photoId) note.photoId = photoId; else note.photo = dataUrl; // ohne Datenbank wie bisher bei der Tour
      }
    } catch (e) { /* Foto optional */ }
    noteTour.notes.push(note);
    checkpoint();
    showToast("Notiz gespeichert.");
    closeNoteModal();
  });

  function renderNotesInto(listEl, cardEl, notes) {
    if (!notes || notes.length === 0) { cardEl.style.display = "none"; return; }
    cardEl.style.display = "block";
    listEl.innerHTML = "";
    notes.forEach((n) => {
      const div = document.createElement("div");
      div.className = "card";
      div.style.padding = "10px 12px";
      const title = n.title ? `<strong>${escapeHtml(n.title)}</strong><br>` : "";
      const text = n.text ? `<span class="small">${escapeHtml(n.text)}</span><br>` : "";
      const img = noteImgHtml(n, "width:100%;border-radius:10px;margin-top:6px;");
      const time = `<span class="small">${new Date(n.t).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</span>`;
      div.innerHTML = title + text + time + img;
      listEl.appendChild(div);
    });
    fillNotePhotos(listEl);
  }

  /* ---------- Höhenprofil ---------- */
  // Rein aus den GPS-Höhenwerten der bereits genutzten Geolocation-API
  // berechnet (keine neue Datenquelle). Werte sind auf dem Smartphone ohne
  // Barometer erfahrungsgemäß ungenau, daher: Lücken auffüllen, glätten
  // und kleine Schwankungen als Rauschen ignorieren, statt sie als
  // Anstieg/Gefälle zu zählen.
  function computeElevation(path) {
    if (!path || path.length < 3) return null;
    const raw = path.map((p) => (typeof p.alt === "number" ? p.alt : null));
    if (raw.every((v) => v === null)) return null;

    // Lücken (kein Höhenwert für diesen Punkt) mit dem letzten bekannten Wert auffüllen
    let last = raw.find((v) => v !== null);
    const filled = raw.map((v) => { if (v !== null) last = v; return last; });

    // Gleitender Mittelwert zur Rauschunterdrückung
    const win = 4;
    const smoothed = filled.map((_, i) => {
      const from = Math.max(0, i - win), to = Math.min(filled.length - 1, i + win);
      let sum = 0, n = 0;
      for (let j = from; j <= to; j++) { sum += filled[j]; n++; }
      return sum / n;
    });

    // Anstieg/Gefälle per Hysterese statt Punkt-zu-Punkt-Vergleich ermitteln:
    // ein reiner Nachbar-Vergleich verschluckt echte Höhenänderungen, die sich
    // über viele Punkte in kleinen Schritten unterhalb der Rauschschwelle
    // verteilen (z. B. ein langer, flacher Anstieg). Stattdessen wird ein
    // laufender Trend verfolgt und erst beim Richtungswechsel um mehr als
    // NOISE_M verbucht – so bleibt echtes, verteiltes Höhenprofil erhalten
    // und nur echtes Wackeln wird ignoriert.
    const NOISE_M = 1.5;
    let gain = 0, loss = 0;
    let extremum = smoothed[0];
    let current = smoothed[0];
    let direction = 0; // 0 = unbekannt, 1 = aufwärts, -1 = abwärts
    for (let i = 1; i < smoothed.length; i++) {
      const v = smoothed[i];
      if (direction >= 0 && v >= current) {
        current = v; direction = 1;
      } else if (direction <= 0 && v <= current) {
        current = v; direction = -1;
      } else if (direction === 1 && (current - v) >= NOISE_M) {
        gain += current - extremum; extremum = current; current = v; direction = -1;
      } else if (direction === -1 && (v - current) >= NOISE_M) {
        loss += extremum - current; extremum = current; current = v; direction = 1;
      }
      // sonst: Schwankung innerhalb der Rauschschwelle, laufenden Trend nicht abbrechen
    }
    if (direction === 1) gain += current - extremum;
    else if (direction === -1) loss += extremum - current;

    return { series: smoothed, min: Math.min(...smoothed), max: Math.max(...smoothed), gain, loss };
  }

  function buildElevationSvg(series, min, max) {
    const w = 300, h = 76, pad = 4;
    const range = Math.max(1, max - min);
    const stepX = (w - pad * 2) / Math.max(1, series.length - 1);
    const pts = series.map((v, i) => {
      const x = pad + i * stepX;
      const y = pad + (h - pad * 2) * (1 - (v - min) / range);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    const area = `${pad},${h - pad} ${pts} ${w - pad},${h - pad}`;
    return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="76" preserveAspectRatio="none">
      <polygon points="${area}" fill="var(--accent-soft)"></polygon>
      <polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2.5"></polyline>
    </svg>`;
  }

  /* ---------- Routen-Miniatur (kleine SVG-Vorschau ohne Kartenkacheln) ---------- */
  function buildRouteThumbSvg(path, color, size) {
    // Auch bei sehr kurzen/spärlich aufgezeichneten Touren (z. B. wenn eine
    // Navigation gleich zu Beginn automatisch als Tour beendet wurde) soll
    // im Verlauf immer eine kleine Vorschau erscheinen statt einer leeren
    // Lücke – sonst wirkt der Eintrag, als gäbe es nichts zum Öffnen.
    if (!path || path.length === 0) {
      return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
        <circle cx="${size / 2}" cy="${size / 2}" r="4" fill="${color}"/>
      </svg>`;
    }
    if (path.length === 1) {
      return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
        <circle cx="${size / 2}" cy="${size / 2}" r="5" fill="none" stroke="${color}" stroke-width="2.4"/>
        <circle cx="${size / 2}" cy="${size / 2}" r="2" fill="${color}"/>
      </svg>`;
    }
    const lats = path.map((p) => p.lat), lons = path.map((p) => p.lon);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLon = Math.min(...lons), maxLon = Math.max(...lons);
    const latR = Math.max(0.0001, maxLat - minLat);
    const lonR = Math.max(0.0001, maxLon - minLon);
    const pad = 5;
    const pts = path.map((p) => {
      const x = pad + ((p.lon - minLon) / lonR) * (size - pad * 2);
      const y = pad + (1 - (p.lat - minLat) / latR) * (size - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  function renderElevationCard(cardId, chartId, ascentId, descentId, path) {
    const card = $(cardId);
    const elev = computeElevation(path);
    if (!elev) { card.style.display = "none"; return; }
    card.style.display = "block";
    $(ascentId).textContent = "+" + Math.round(elev.gain) + " m";
    $(descentId).textContent = "−" + Math.round(elev.loss) + " m";
    $(chartId).innerHTML = buildElevationSvg(elev.series, elev.min, elev.max);
  }

  /* ---------- Kilometer-Splits ---------- */
  // Grobe Schätzung: die Split-Zeit wird dem GPS-Punkt zugeordnet, bei dem
  // die 1-km-Marke überschritten wird – ohne Interpolation zwischen Punkten.
  // Wird einmalig beim Speichern berechnet und in der Tour mitgespeichert,
  // damit Splits auch später in der Detailansicht verfügbar sind.
  function computeSplits(points) {
    if (!points || points.length < 3) return [];
    const splits = [];
    let splitDist = 0, splitStart = points[0].t;
    for (let i = 1; i < points.length; i++) {
      const d = haversineMeters(points[i - 1], points[i]);
      splitDist += d;
      if (splitDist >= 1000) {
        splits.push({ km: splits.length + 1, durationSec: (points[i].t - splitStart) / 1000 });
        splitStart = points[i].t;
        splitDist = 0;
      }
    }
    return splits;
  }
  function renderSplitsCard(cardId, listId, splits) {
    const card = $(cardId);
    if (!splits || splits.length === 0) { card.style.display = "none"; return; }
    card.style.display = "block";
    const maxDur = Math.max(...splits.map((s) => s.durationSec), 1);
    $(listId).innerHTML = splits.map((s) => `
      <div class="splitrow">
        <span class="sklabel">Km ${s.km}</span>
        <span class="skbarwrap"><span class="skbar" style="width:${Math.round((s.durationSec / maxDur) * 100)}%"></span></span>
        <span class="skpace">${formatDuration(s.durationSec)}</span>
      </div>`).join("");
  }

  /* ---------- Erfolge ---------- */
  const ACHIEVEMENTS = [
    { id: "tour1", icon: "flag", label: "Erste Tour", check: (s) => s.count >= 1 },
    { id: "tour10", icon: "medal", label: "10 Touren", check: (s) => s.count >= 10 },
    { id: "tour50", icon: "trophy", label: "50 Touren", check: (s) => s.count >= 50 },
    { id: "km10", icon: "milestone", label: "10 km gesamt", check: (s) => s.totalKm >= 10 },
    { id: "km50", icon: "sparkle", label: "50 km gesamt", check: (s) => s.totalKm >= 50 },
    { id: "km100", icon: "peak", label: "100 km gesamt", check: (s) => s.totalKm >= 100 },
    { id: "km500", icon: "flame", label: "500 km gesamt", check: (s) => s.totalKm >= 500 },
    { id: "streak7", icon: "calendar", label: "7 Tage in Folge", check: (s) => s.streak >= 7 }
  ];
  function loadUnlocked() {
    try { return JSON.parse(localStorage.getItem("wk-achievements") || "[]"); } catch (e) { return []; }
  }
  function saveUnlocked(arr) { localStorage.setItem("wk-achievements", JSON.stringify(arr)); }
  function computeAchievementStats(list) {
    const count = list.length;
    const totalKm = list.reduce((s, t) => s + t.distanceKm, 0);
    const days = [...new Set(list.map((t) => new Date(t.startTime).toDateString()))]
      .map((d) => new Date(d).getTime()).sort((a, b) => b - a);
    let streak = days.length ? 1 : 0;
    for (let i = 1; i < days.length; i++) {
      if (Math.round((days[i - 1] - days[i]) / 86400000) === 1) streak++; else break;
    }
    return { count, totalKm, streak };
  }
  function checkAchievements(list) {
    const stats = computeAchievementStats(list);
    const unlocked = loadUnlocked();
    const newly = ACHIEVEMENTS.filter((a) => !unlocked.includes(a.id) && a.check(stats));
    if (newly.length > 0) {
      saveUnlocked(unlocked.concat(newly.map((a) => a.id)));
      newly.forEach((a, i) => setTimeout(() => showToast(`Erfolg freigeschaltet: ${a.label}`), i * 2400));
    }
    renderBadges();
  }
  function renderBadges() {
    const unlocked = loadUnlocked();
    $("badgeGrid").innerHTML = ACHIEVEMENTS.map((a) => `
      <div class="badge ${unlocked.includes(a.id) ? "unlocked" : "locked"}">
        <span class="bic">${svgIcon(a.icon)}</span><span class="blbl">${a.label}</span>
      </div>`).join("");
  }

  /* ---------- GPX-Export ---------- */
  function buildGPX(t) {
    const name = escapeHtml(t.title || MODE_META[t.mode].label);
    const pts = (t.path || []).map((p) =>
      `<trkpt lat="${p.lat}" lon="${p.lon}">${typeof p.alt === "number" ? `<ele>${p.alt.toFixed(1)}</ele>` : ""}</trkpt>`
    ).join("");
    return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="NaviWahr" xmlns="http://www.topografix.com/GPX/1/1">
<metadata><name>${name}</name><time>${new Date(t.startTime).toISOString()}</time></metadata>
<trk><name>${name}</name><trkseg>${pts}</trkseg></trk>
</gpx>`;
  }

  /* ---------- Backup: Export / Import (JSON, ausschließlich auf Wunsch) ---------- */
  $("btnExportBackup").addEventListener("click", () => {
    const data = { app: "NaviWahr", exportedAt: Date.now(), tours: loadTours() };
    shareOrDownload(`naviwahr-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), "application/json");
  });
  $("btnImportBackup").addEventListener("click", () => $("fileImportBackup").click());
  $("fileImportBackup").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const incoming = Array.isArray(data.tours) ? data.tours : [];
      const existing = loadTours();
      const existingIds = new Set(existing.map((t) => t.id));
      const fresh = incoming.filter((t) => t && t.id && !existingIds.has(t.id));
      if (fresh.length === 0) { showToast("Keine neuen Touren in dieser Sicherung."); return; }
      if (!saveTours(existing.concat(fresh))) return; // Speicher voll – Toast kommt aus saveTours()
      showToast(`${fresh.length} Tour(en) importiert.`);
      renderHome(); renderHistory(); renderStats(); checkAchievements(loadTours());
    } catch (err) { showToast("Import fehlgeschlagen – Datei ungültig."); }
  });

  /* ---------- Notiz-Marker auf der Karte (Zusammenfassung/Detail) ---------- */
  function addNoteMarkers(map, notes) {
    if (!map || !notes || !notes.length) return;
    notes.forEach((n) => {
      if (typeof n.lat !== "number" || typeof n.lon !== "number") return;
      try {
        const icon = L.divIcon({ className: "", html: `<div class="wk-notemarker">${svgIcon("pin", "filled")}</div>`, iconSize: [26, 26], iconAnchor: [13, 26] });
        const marker = L.marker([n.lat, n.lon], { icon }).addTo(map);
        const title = n.title ? `<strong>${escapeHtml(n.title)}</strong><br>` : "";
        const text = n.text ? `${escapeHtml(n.text)}<br>` : "";
        const popupHtml = (src) => `<div style="max-width:180px;">${title}${text}${src ? `<img src="${src}" alt="" style="width:100%;max-width:180px;border-radius:8px;margin-top:4px;">` : ""}</div>`;
        marker.bindPopup(popupHtml(n.photo || ""));
        if (!n.photo && n.photoId) {
          WKDB.get("fotos", n.photoId).then((rec) => { if (rec && rec.data) { try { marker.setPopupContent(popupHtml(rec.data)); } catch (e) { /* Marker optional */ } } });
        }
      } catch (e) { /* Marker optional */ }
    });
  }

  /* ---------- Summary ---------- */
  let pendingTour = null;
  function renderSummary() {
    pendingTour = tour;
    const km = tour.distanceM / 1000;
    const durS = (tour.endTime - tour.startTime - tour.pausedMs) / 1000;
    const avg = durS > 0 ? km / (durS / 3600) : 0;
    $("sumDistance").textContent = fmt2(km) + " km";
    $("sumTime").textContent = formatDuration(durS);
    $("sumAvg").textContent = fmt1(avg) + " km/h";
    $("sumMax").textContent = fmt1(tour.maxSpeedKmh) + " km/h";
    renderWeatherLine($("sumWeather"), tour.weather);
    renderElevationCard("sumElevationCard", "sumElevationChart", "sumAscent", "sumDescent", tour.points);
    renderSplitsCard("sumSplitsCard", "sumSplitsList", computeSplits(tour.points));
    renderNotesInto($("sumNotesList"), $("sumNotesCard"), tour.notes);
    $("sumTitle").value = "";

    if (summaryMap) { try { summaryMap.remove(); } catch (e) {} summaryMap = null; }
    if (liveMap) { try { liveMap.remove(); } catch (e) {} liveMap = null; }

    openOverlay("summary");
    // Erst nach dem nächsten Frame initialisieren, damit das Overlay beim
    // Kartenaufbau garantiert schon sichtbar ist und Leaflet die richtige
    // Containergröße misst (sonst kann die Karte leer/grau bleiben).
    requestAnimationFrame(() => {
      drawStaticRoute("summaryMap", tour.points, MODE_META[tour.mode].color, (map) => {
        summaryMap = map;
        if (!summaryMap) return;
        addNoteMarkers(summaryMap, tour.notes);
        const latlngs = (tour.points || []).map((p) => [p.lat, p.lon]);
        setTimeout(() => {
          if (!summaryMap) return;
          try {
            summaryMap.invalidateSize();
            if (latlngs.length > 1) summaryMap.fitBounds(latlngs, { padding: [28, 28] });
          } catch (e) {}
        }, 200);
      });
    });
  }

  /* Formgetreue Routen-Vereinfachung (Douglas-Peucker, auf feste Punktzahl
     begrenzt). Früher wurde einfach jeder n-te Punkt behalten – bei langen
     Fahrten (z. B. 500 km → nur alle ~1,7 km ein Punkt) schnitt die Linie
     dann Kurven, Kreisel und Ausfahrten ab und lief quer über Felder.
     Jetzt bekommt jeder Punkt eine "Wichtigkeit" = wie weit (in Metern) die
     Linie danebenläge, wenn man ihn weglässt. Behalten werden die
     wichtigsten Punkte: Kurven bekommen viele Punkte, lange gerade Stücke
     (Autobahn) nur wenige. Speicherbedarf bleibt gleich (max. maxPoints). */
  function simplifyPath(points, maxPoints) {
    const n = points.length;
    if (n <= maxPoints) return points;
    // Lokale Projektion auf Meter (für Distanzen im Tourbereich völlig ausreichend).
    const lat0 = points[0].lat * Math.PI / 180;
    const kx = 111320 * Math.cos(lat0), ky = 110540;
    const xs = new Float64Array(n), ys = new Float64Array(n);
    for (let i = 0; i < n; i++) { xs[i] = points[i].lon * kx; ys[i] = points[i].lat * ky; }
    const segDist = (i, a, b) => {
      const dx = xs[b] - xs[a], dy = ys[b] - ys[a];
      const len2 = dx * dx + dy * dy;
      let t = len2 > 0 ? ((xs[i] - xs[a]) * dx + (ys[i] - ys[a]) * dy) / len2 : 0;
      t = Math.max(0, Math.min(1, t));
      const px = xs[a] + t * dx - xs[i], py = ys[a] + t * dy - ys[i];
      return Math.sqrt(px * px + py * py);
    };
    // Wichtigkeit je Punkt per Douglas-Peucker (iterativ, kein Rekursions-Überlauf
    // bei sehr langen Aufzeichnungen mit zehntausenden Punkten).
    const importance = new Float64Array(n);
    importance[0] = importance[n - 1] = Infinity;
    const stack = [[0, n - 1, Infinity]];
    while (stack.length) {
      const [a, b, parentImp] = stack.pop();
      if (b - a < 2) continue;
      let maxD = -1, idx = -1;
      for (let i = a + 1; i < b; i++) {
        const d = segDist(i, a, b);
        if (d > maxD) { maxD = d; idx = i; }
      }
      // Ein Punkt darf nie wichtiger sein als der, der ihn "freigelegt" hat –
      // so ergibt das Behalten der Top-N immer eine stimmige Teil-Linie.
      const imp = Math.min(maxD, parentImp);
      importance[idx] = imp;
      stack.push([a, idx, imp], [idx, b, imp]);
    }
    // Lücken-Markierungen (gapBefore) müssen erhalten bleiben, sonst geht die
    // gestrichelte Darstellung beim Vereinfachen der Route verloren – dazu
    // auch der Punkt direkt davor (Ende des vorherigen Abschnitts).
    for (let i = 1; i < n; i++) {
      if (points[i].gapBefore) { importance[i] = Infinity; importance[i - 1] = Infinity; }
    }
    const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => importance[b] - importance[a]);
    const keep = order.slice(0, Math.max(maxPoints, order.filter((i) => importance[i] === Infinity).length));
    return keep.sort((a, b) => a - b).map((i) => points[i]);
  }

  // Punkt-Budget für die gespeicherte Route: mindestens 300 (wie bisher),
  // bei langen Touren ca. 2 Punkte je km, höchstens 1200. Eine 500-km-Fahrt
  // belegt so rund 60 KB – Kurven bleiben erkennbar, der Speicher des
  // Geräts wird trotzdem nicht durch wenige lange Fahrten aufgebraucht.
  function routePointBudget(km) {
    return Math.max(300, Math.min(1200, Math.round(km * 2)));
  }

  function loadTours() {
    // Beschädigte oder fremde Daten (kein Array, leere Einträge) dürfen den Start nicht verhindern
    try {
      const list = JSON.parse(localStorage.getItem("wk-tours") || "[]");
      return Array.isArray(list) ? list.filter((t) => t && typeof t === "object" && MODE_META[t.mode]) : [];
    }
    catch (e) { return []; }
  }
  function saveTours(list) {
    try {
      localStorage.setItem("wk-tours", JSON.stringify(list));
      return true;
    } catch (e) {
      showToast("Speicher voll – Tour konnte nicht gespeichert werden. Bitte alte Touren oder Fotos löschen und erneut versuchen.");
      return false;
    }
  }

  $("btnDiscardTour").addEventListener("click", () => {
    pendingTour = null; tour = null;
    clearCheckpoint();
    showToast("Tour verworfen.");
    closeOverlay();
    switchTab("start");
  });
  $("btnSaveTour").addEventListener("click", () => {
    if (!pendingTour) return;
    const km = pendingTour.distanceM / 1000;
    const durS = (pendingTour.endTime - pendingTour.startTime - pendingTour.pausedMs) / 1000;
    const avg = durS > 0 ? km / (durS / 3600) : 0;
    const prevForMode = loadTours().filter((t) => t.mode === pendingTour.mode);
    const isNewLongest = prevForMode.length > 0 && km > Math.max(...prevForMode.map((t) => t.distanceKm));
    const record = {
      id: "t" + pendingTour.startTime + Math.floor(Math.random() * 1000),
      mode: pendingTour.mode, title: $("sumTitle").value.trim(),
      startTime: pendingTour.startTime, endTime: pendingTour.endTime,
      distanceKm: km, durationSec: durS, avgKmh: avg, maxKmh: pendingTour.maxSpeedKmh,
      weather: pendingTour.weather, notes: pendingTour.notes,
      splits: computeSplits(pendingTour.points),
      favorite: false,
      path: simplifyPath(pendingTour.points, routePointBudget(km)).map((p) => ({ lat: p.lat, lon: p.lon, alt: p.alt, gapBefore: p.gapBefore || undefined }))
    };
    const list = loadTours();
    list.unshift(record);
    if (!saveTours(list)) return; // Speicher voll – Toast kommt aus saveTours(), Tour bleibt erhalten, erneuter Versuch möglich
    pendingTour = null; tour = null;
    clearCheckpoint();
    showToast(isNewLongest ? `Tour gespeichert – neue Bestleistung! (${MODE_META[record.mode].label})` : "Tour gespeichert.");
    checkAchievements(list);
    closeOverlay();
    switchTab("start");
    if (record.mode === "car") offerBelegPark(record);
  });

  /* ---------- WahrZentrale: Fahrt in BelegParkWahr übernehmen ---------- */
  function offerBelegPark(record) {
    if (!window.wzCore || !record || !(record.distanceKm > 0.2)) return;
    const d = new Date(record.startTime);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const km = (Math.round(record.distanceKm * 10) / 10).toString();
    const q = new URLSearchParams({ neu: "fahrt", datum: iso, km, zweck: record.title || "" }).toString();
    setTimeout(() => wzCore.sheet({
      title: "Fahrt auch als Beleg erfassen?",
      text: `${km.replace(".", ",")} km am ${d.toLocaleDateString("de-DE")} – z. B. als Dienstfahrt mit Kilometerpauschale oder mit einem Parkschein in BelegParkWahr.`,
      actions: [
        { label: "Als Fahrt in BelegParkWahr", href: "./bp-app.html?" + q, primary: true },
        { label: "Parkschein fotografieren", href: "./bp-app.html?neu=park" }
      ]
    }), 600);
  }

  /* ---------- Home (Start-Tab) ---------- */
  function renderHome() {
    const list = loadTours();
    const greetEl = $("greetLine");
    if (list.length === 0) {
      greetEl.textContent = "Noch keine Tour aufgezeichnet – starte deine erste.";
    } else {
      const last = list[0];
      greetEl.textContent = `Letzte Tour: ${fmt2(last.distanceKm)} km (${MODE_META[last.mode].label}) am ${formatDate(last.startTime).split(" · ")[0]}`;
    }
    const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
    const week = list.filter((t) => t.startTime >= weekAgo);
    $("wsDist").textContent = fmt1(week.reduce((s, t) => s + t.distanceKm, 0)) + " km";
    $("wsCount").textContent = week.length;
  }

  /* ---------- History ---------- */
  let historyFilter = "all";
  let historySort = "newest";
  $("historyFilters").addEventListener("click", (e) => {
    const btn = e.target.closest(".filterchip");
    if (!btn) return;
    document.querySelectorAll("#historyFilters .filterchip").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    historyFilter = btn.getAttribute("data-filter");
    renderHistory();
  });
  $("historySort").addEventListener("change", (e) => {
    historySort = e.target.value;
    renderHistory();
  });

  function sortTours(list, mode) {
    const out = list.slice();
    if (mode === "oldest") out.sort((a, b) => a.startTime - b.startTime);
    else if (mode === "longest") out.sort((a, b) => b.distanceKm - a.distanceKm);
    else if (mode === "shortest") out.sort((a, b) => a.distanceKm - b.distanceKm);
    else out.sort((a, b) => b.startTime - a.startTime); // newest
    return out;
  }

  function renderHistory() {
    let list = loadTours().filter((t) =>
      historyFilter === "all" ? true : historyFilter === "fav" ? t.favorite : t.mode === historyFilter);
    list = sortTours(list, historySort);
    const el = $("historyList");
    el.innerHTML = "";
    if (list.length === 0) {
      el.innerHTML = `<div class="emptystate"><span class="ic">${svgIcon("history")}</span>Noch keine Touren in dieser Kategorie.</div>`;
      return;
    }
    list.forEach((t) => {
      const div = document.createElement("div");
      div.className = "historyitem";
      const color = MODE_META[t.mode].color;
      const thumb = buildRouteThumbSvg(t.path, color, 44);
      div.innerHTML = `
        <div class="modeic" style="background:${color}22;color:${color};">${svgIcon(MODE_META[t.mode].icon)}</div>
        <div class="meta">
          <strong>${escapeHtml(t.title) || MODE_META[t.mode].label}</strong>
          <span>${formatDate(t.startTime)} · ${fmt2(t.distanceKm)} km · ${formatDuration(t.durationSec)}</span>
        </div>
        ${thumb ? `<div class="routethumb" style="color:${color};">${thumb}</div>` : ""}
        <button class="favstar ${t.favorite ? "active" : ""}" data-id="${t.id}" aria-label="Favorit">${svgIcon(t.favorite ? "star-filled" : "star")}</button>
        <button class="del" data-id="${t.id}" aria-label="Löschen">${svgIcon("trash")}</button>
      `;
      // Ganze Zeile antippbar (nicht nur Titeltext/Icon), damit sich die
      // aufgezeichnete Route zuverlässig öffnen lässt.
      div.addEventListener("click", () => openDetail(t.id));
      div.querySelector(".favstar").addEventListener("click", (ev) => {
        ev.stopPropagation();
        toggleFavorite(t.id);
      });
      div.querySelector(".del").addEventListener("click", (ev) => {
        ev.stopPropagation();
        const all = loadTours();
        const idx = all.findIndex((x) => x.id === t.id);
        if (idx === -1) return;
        all.splice(idx, 1);
        saveTours(all);
        renderHistory(); renderHome(); renderStats();
        showUndoToast("Tour gelöscht.", () => {
          const list2 = loadTours();
          list2.splice(Math.min(idx, list2.length), 0, t);
          saveTours(list2);
          renderHistory(); renderHome(); renderStats();
          showToast("Tour wiederhergestellt.");
        });
      });
      el.appendChild(div);
    });
  }

  function toggleFavorite(id) {
    const all = loadTours();
    const t = all.find((x) => x.id === id);
    if (!t) return;
    t.favorite = !t.favorite;
    saveTours(all);
    renderHistory();
    if (detailId === id) renderFavoriteButton(t.favorite);
  }
  function renderFavoriteButton(active) {
    const btn = $("btnToggleFavorite");
    btn.innerHTML = svgIcon(active ? "star-filled" : "star");
    btn.classList.toggle("active", active);
  }

  /* ---------- Detail ---------- */
  let detailId = null;
  function openDetail(id) {
    detailId = id;
    const t = loadTours().find((x) => x.id === id);
    if (!t) return;
    $("detTitleText").textContent = t.title || MODE_META[t.mode].label;
    $("detDistance").textContent = fmt2(t.distanceKm) + " km";
    $("detTime").textContent = formatDuration(t.durationSec);
    $("detAvg").textContent = fmt1(t.avgKmh) + " km/h";
    $("detMax").textContent = fmt1(t.maxKmh) + " km/h";
    renderWeatherLine($("detWeather"), t.weather);
    renderElevationCard("detElevationCard", "detElevationChart", "detAscent", "detDescent", t.path);
    renderSplitsCard("detSplitsCard", "detSplitsList", t.splits);
    renderNotesInto($("detNotesList"), $("detNotesCard"), t.notes);
    renderFavoriteButton(!!t.favorite);

    if (detailMap) { try { detailMap.remove(); } catch (e) {} detailMap = null; }
    openOverlay("detail");
    // Wie bei der Zusammenfassung: erst nach dem nächsten Frame aufbauen,
    // damit der Kartencontainer garantiert sichtbar und korrekt bemessen ist.
    // Zusätzlich wird die Kartengröße noch einmal mit kurzer Verzögerung neu
    // berechnet (invalidateSize) – bei manchen Geräten/PWA-Ansichten ist der
    // Container direkt nach dem Öffnen des Overlays noch nicht final bemessen,
    // wodurch die Route sonst unsichtbar bleiben oder falsch zugeschnitten
    // sein kann.
    requestAnimationFrame(() => {
      drawStaticRoute("detailMap", t.path, MODE_META[t.mode].color, (map) => {
        detailMap = map;
        if (!detailMap) return;
        addNoteMarkers(detailMap, t.notes);
        const latlngs = (t.path || []).map((p) => [p.lat, p.lon]);
        setTimeout(() => {
          if (!detailMap) return;
          try {
            detailMap.invalidateSize();
            if (latlngs.length > 1) detailMap.fitBounds(latlngs, { padding: [28, 28] });
          } catch (e) {}
        }, 200);
      });
    });
  }
  $("btnEditTitle").addEventListener("click", () => {
    if (!detailId) return;
    const all = loadTours();
    const t = all.find((x) => x.id === detailId);
    if (!t) return;
    const input = prompt("Titel der Tour:", t.title || "");
    if (input === null) return;
    t.title = input.trim();
    saveTours(all);
    $("detTitleText").textContent = t.title || MODE_META[t.mode].label;
    renderHistory();
    showToast("Titel gespeichert.");
  });
  $("btnToggleFavorite").addEventListener("click", () => {
    if (detailId) toggleFavorite(detailId);
  });
  $("btnShareTour").addEventListener("click", async () => {
    const t = loadTours().find((x) => x.id === detailId);
    if (!t) return;
    const text = `${t.title || MODE_META[t.mode].label}\n${fmt2(t.distanceKm)} km in ${formatDuration(t.durationSec)} (Ø ${fmt1(t.avgKmh)} km/h)\nAufgezeichnet mit NaviWahr.`;
    try {
      if (navigator.share) { await navigator.share({ text }); return; }
    } catch (e) { if (e && e.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(text); showToast("In Zwischenablage kopiert."); }
    catch (e) { showToast("Teilen auf diesem Gerät nicht möglich."); }
  });
  $("btnExportGpx").addEventListener("click", () => {
    const t = loadTours().find((x) => x.id === detailId);
    if (!t) return;
    shareOrDownload(`${(t.title || MODE_META[t.mode].label).replace(/[^\w\-]+/g, "_")}.gpx`, buildGPX(t), "application/gpx+xml");
  });
  $("btnDeleteTour").addEventListener("click", () => {
    if (!detailId) return;
    const all = loadTours();
    const idx = all.findIndex((x) => x.id === detailId);
    if (idx === -1) return;
    const removed = all[idx];
    all.splice(idx, 1);
    saveTours(all);
    closeOverlay();
    switchTab("history");
    showUndoToast("Tour gelöscht.", () => {
      const list = loadTours();
      list.splice(Math.min(idx, list.length), 0, removed);
      saveTours(list);
      renderHistory(); renderHome(); renderStats();
      showToast("Tour wiederhergestellt.");
    });
  });

  /* ---------- Stats ---------- */
  let statsFilter = "all";
  if ($("statsFilters")) $("statsFilters").addEventListener("click", (e) => {
    const btn = e.target.closest(".filterchip");
    if (!btn) return;
    document.querySelectorAll("#statsFilters .filterchip").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    statsFilter = btn.getAttribute("data-filter");
    renderStats();
  });

  function renderStats() {
    const all = loadTours().filter((t) => statsFilter === "all" || t.mode === statsFilter);
    $("statCount").textContent = all.length;
    const totalKm = all.reduce((s, t) => s + t.distanceKm, 0);
    const totalSec = all.reduce((s, t) => s + t.durationSec, 0);
    $("statDistanceSum").textContent = fmt1(totalKm) + " km";
    $("statTimeSum").textContent = formatHM(totalSec);
    $("statAvgAll").textContent = (totalSec > 0 ? fmt1(totalKm / (totalSec / 3600)) : "0,0") + " km/h";

    if (all.length === 0) {
      $("statLongest").textContent = "–";
      $("statFastest").textContent = "–";
    } else {
      const longest = all.reduce((a, b) => (b.distanceKm > a.distanceKm ? b : a));
      const fastest = all.reduce((a, b) => (b.avgKmh > a.avgKmh ? b : a));
      $("statLongest").textContent = fmt2(longest.distanceKm) + " km";
      $("statFastest").textContent = fmt1(fastest.avgKmh) + " km/h";
    }

    const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
    const week = all.filter((t) => t.startTime >= weekAgo);
    $("statWeekDist").textContent = fmt1(week.reduce((s, t) => s + t.distanceKm, 0)) + " km";
    $("statWeekCount").textContent = week.length;
  }

  /* ---------- Unterbrochene Aufzeichnung wieder aufnehmen ---------- */
  let resumeCandidate = null;
  let resumeDropArmed = false;
  function closeResumeModal() {
    $("ov-resume").classList.remove("open");
    resumeCandidate = null; resumeDropArmed = false;
    $("btnResumeDrop").textContent = "Verwerfen";
  }
  function offerResume(cp) {
    const t = cp.tour;
    const ended = !!t.endTime;
    const canContinue = !ended && (Date.now() - cp.savedAt) <= RESUME_MAX_AGE_MS && ("geolocation" in navigator);
    const start = new Date(t.startTime);
    const when = start.toLocaleDateString("de-DE", { day: "numeric", month: "long" }) + ", " +
      start.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr";
    const what = (MODE_META[t.mode].label) + " vom " + when + " (" + fmt2((t.distanceM || 0) / 1000) + " km)";
    $("resumeTitle").textContent = ended ? "Tour noch nicht gespeichert" : "Aufzeichnung wurde unterbrochen";
    $("resumeText").textContent = ended
      ? what + " wurde beendet, aber weder gespeichert noch verworfen."
      : what + " wurde nicht beendet, weil die App geschlossen wurde. Der Stand bis dahin ist gesichert.";
    $("resumeHint").textContent = canContinue
      ? "Beim Fortsetzen zählt die Zeit seit der Unterbrechung als Pause; der fehlende Abschnitt erscheint auf der Karte gestrichelt."
      : (ended ? "" : "Du kannst sie als Tour ansehen und speichern.");
    $("resumeHint").style.display = $("resumeHint").textContent ? "" : "none";
    $("btnResumeGo").style.display = canContinue ? "" : "none";
    $("btnResumeView").textContent = ended ? "Ansehen" : "Beenden und ansehen";
    $("btnResumeView").className = "btn btn-block " + (canContinue ? "btn-outline" : "btn-primary");
    resumeCandidate = cp;
    $("ov-resume").classList.add("open");
  }
  $("btnResumeGo").addEventListener("click", () => {
    const cp = resumeCandidate;
    if (!cp || tour) { closeResumeModal(); return; }
    closeResumeModal();
    const t = cp.tour;
    t.pausedMs = (t.pausedMs || 0) + Math.max(0, Date.now() - cp.savedAt);
    t.endTime = null;
    t.currentSpeedKmh = 0;
    selectedMode = t.mode === "walk" ? "walk" : "car";
    applyModeSelection();
    startSession(t);
    showToast("Aufzeichnung wird fortgesetzt.");
  });
  $("btnResumeView").addEventListener("click", () => {
    const cp = resumeCandidate;
    if (!cp || tour) { closeResumeModal(); return; }
    closeResumeModal();
    tour = cp.tour;
    if (!tour.endTime) tour.endTime = cp.savedAt;
    tour.currentSpeedKmh = 0;
    isPaused = false; pauseStartedAt = null; autoPaused = false; autoPauseStart = null;
    checkpoint();
    renderSummary();
  });
  $("btnResumeDrop").addEventListener("click", () => {
    if (!resumeDropArmed) {
      resumeDropArmed = true;
      $("btnResumeDrop").textContent = "Wirklich verwerfen? Nochmal tippen";
      setTimeout(() => { resumeDropArmed = false; $("btnResumeDrop").textContent = "Verwerfen"; }, 5000);
      return;
    }
    closeResumeModal();
    clearCheckpoint();
    showToast("Aufzeichnung verworfen.");
  });

  /* Beim Start: Zwischenstand prüfen, Fotos umziehen, verwaiste Fotos entfernen.
     Läuft im Hintergrund; schlägt etwas fehl, bleibt alles beim alten Stand. */
  async function startupStorageWork() {
    let cp = null;
    try {
      cp = await WKDB.get("laufend", "tour");
      const valid = cp && cp.tour && Array.isArray(cp.tour.points) && cp.tour.points.length >= 1 &&
        MODE_META[cp.tour.mode] && typeof cp.tour.startTime === "number" && typeof cp.savedAt === "number" &&
        Array.isArray(cp.tour.notes);
      if (cp && !valid) { await clearCheckpoint(); cp = null; }
      if (cp && !tour && !activeOverlay) offerResume(cp);
    } catch (e) { cp = null; }
    try {
      await migrateTourPhotos();
      await cleanupOrphanPhotos(cp ? cp.tour.notes : null);
    } catch (e) { /* Aufräumen ist optional */ }
  }

  /* ---------- Init ---------- */
  function init() {
    initTheme();
    renderAutopauseToggle();
    renderMapConsentToggle();
    renderBadges();
    checkAchievements(loadTours());
    switchTab("start");
    if (!localStorage.getItem("wk-onboarding-seen") && wkOnb) {
      wkOnb.show();
    }

    window.addEventListener("beforeunload", () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    });

    setInterval(checkpoint, CHECKPOINT_EVERY_MS);
    startupStorageWork();

  }

  document.addEventListener("DOMContentLoaded", init);
})();
