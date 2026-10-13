/* =========================================================
   Keysglade — Karte
   Leaflet + OpenStreetMap-Kacheln (wie in "Parken und Belege")
========================================================= */

/* ---------- Leaflet: lokal, Karte nur nach Einwilligung ----------
   Die Kartenbibliothek Leaflet liegt in der WahrZentrale selbst (lib-leaflet.js).
   Kartenkacheln von OpenStreetMap werden erst geladen, wenn der Nutzer eine
   Kartenansicht öffnet UND eingewilligt hat. Die Einwilligung gilt für alle
   Karten der WahrZentrale (Abgleich über wz-core.js, Eintrag "wz_map_consent").
   Mehrere gleichzeitige Kartenanfragen (z. B. eine pro Reisetag) werden in
   einer Warteschlange gesammelt und gemeinsam aufgelöst. */
const LEAFLET_CSS_URL = "./lib-leaflet.css"; // lokal, Teil der WahrZentrale
const LEAFLET_JS_URL = "./lib-leaflet.js"; // lokal, Teil der WahrZentrale
const MAP_CONSENT_KEY = "kg_map_consent"; // "granted" | "declined"

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

function showMapFallback(containerId, message) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<div class="map-fallback">${escapeHtml(message)}</div>`;
}

let mapConsentQueue = [];
function requestMapAccess(containerId, fallbackMessage, onGranted) {
  if (typeof L !== "undefined") { onGranted(); return; }
  const status = mapConsentStatus();
  if (status === "declined") {
    showMapFallback(containerId, "Kartenanzeige laut deiner Wahl deaktiviert. " + fallbackMessage);
    return;
  }
  if (status === "granted") {
    loadLeafletAssets().then(onGranted).catch(() => {
      showMapFallback(containerId, "Karte konnte nicht geladen werden. " + fallbackMessage);
    });
    return;
  }
  showMapFallback(containerId, "Warte auf deine Bestätigung zum Kartenladen …");
  mapConsentQueue.push({ containerId, fallbackMessage, onGranted });
  const modal = document.getElementById("map-consent-modal");
  if (modal) modal.classList.add("open");
}

function resolveMapConsentQueue(granted) {
  const queue = mapConsentQueue;
  mapConsentQueue = [];
  if (!granted) {
    queue.forEach((q) => showMapFallback(q.containerId, "Kartenanzeige laut deiner Wahl deaktiviert. " + q.fallbackMessage));
    return;
  }
  loadLeafletAssets().then(() => {
    queue.forEach((q) => q.onGranted());
  }).catch(() => {
    queue.forEach((q) => showMapFallback(q.containerId, "Karte konnte nicht geladen werden. " + q.fallbackMessage));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const acceptBtn = document.getElementById("map-consent-accept");
  const declineBtn = document.getElementById("map-consent-decline");
  const modal = document.getElementById("map-consent-modal");
  if (acceptBtn) acceptBtn.addEventListener("click", () => {
    setMapConsent("granted");
    if (modal) modal.classList.remove("open");
    resolveMapConsentQueue(true);
  });
  if (declineBtn) declineBtn.addEventListener("click", () => {
    setMapConsent("declined");
    if (modal) modal.classList.remove("open");
    resolveMapConsentQueue(false);
  });
});

let fkMapInstance = null;
let fkMarkers = [];

const CATEGORY_COLORS = {
  beaches: "#3355C8",
  cities: "#0B1440",
  parks: "#FF8C00",
};

function initMap(onSelectEntry) {
  if (fkMapInstance) return fkMapInstance;

  requestMapAccess("map-container", "Alle anderen Funktionen der App bleiben davon unberührt.", () => {
    if (fkMapInstance) return; // bereits aufgebaut (z. B. zweiter Aufruf waehrend des Ladens)
    fkMapInstance = L.map("map-container", {
      center: [27.8, -81.6],
      zoom: 6,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://tile.openstreetmap.de/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende',
      maxZoom: 18,
    }).addTo(fkMapInstance);

    L.control.scale({ metric: true, imperial: false, position: "bottomleft" }).addTo(fkMapInstance);

    const withCoords = ENTRIES.filter((e) => e.lat && e.lon);
    withCoords.forEach((entry) => {
      const color = CATEGORY_COLORS[entry.cat] || "#0B1440";
      const marker = L.circleMarker([entry.lat, entry.lon], {
        radius: 8,
        fillColor: color,
        color: "#ffffff",
        weight: 2,
        fillOpacity: 0.9,
      }).addTo(fkMapInstance);

      marker.bindPopup(`
        <strong>${entry.icon} ${entry.name}</strong><br>
        <span style="font-size:12px;color:#666;">${entry.region}</span><br>
        <button class="popup-detail-btn" data-id="${entry.id}" style="margin-top:6px;padding:4px 10px;border:none;border-radius:4px;background:#0B1440;color:#fff;font-size:12px;cursor:pointer;">Details</button>
      `);

      marker.on("popupopen", () => {
        const btn = document.querySelector(`.popup-detail-btn[data-id="${entry.id}"]`);
        if (btn) btn.addEventListener("click", () => onSelectEntry(entry));
      });

      fkMarkers.push(marker);
    });

    resizeMapIfNeeded();
  });
  return fkMapInstance;
}

function filterMapMarkers(cat) {
  if (!fkMapInstance) return;
  fkMarkers.forEach((marker) => {
    fkMapInstance.removeLayer(marker);
  });
  fkMarkers.forEach((marker, i) => {
    const entry = ENTRIES.filter((e) => e.lat && e.lon)[i];
    if (cat === "all" || entry.cat === cat) {
      marker.addTo(fkMapInstance);
    }
  });
}

function resizeMapIfNeeded() {
  if (fkMapInstance) {
    setTimeout(() => fkMapInstance.invalidateSize(), 100);
  }
}

let myLocationMarker = null;

function showMyLocationOnMap(statusCallback) {
  if (!fkMapInstance) return;
  if (!("geolocation" in navigator)) {
    if (statusCallback) statusCallback("Standortabfrage wird von diesem Browser nicht unterstützt.");
    return;
  }
  if (statusCallback) statusCallback("Standort wird ermittelt…");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      if (myLocationMarker) fkMapInstance.removeLayer(myLocationMarker);
      myLocationMarker = L.circleMarker([latitude, longitude], {
        radius: 9, fillColor: "#1E2A78", color: "#ffffff", weight: 3, fillOpacity: 0.95,
      }).addTo(fkMapInstance).bindPopup("Dein Standort").openPopup();
      fkMapInstance.setView([latitude, longitude], 11);
      if (statusCallback) statusCallback("");
    },
    () => { if (statusCallback) statusCallback("Standort konnte nicht ermittelt werden."); },
    { enableHighAccuracy: false, timeout: 10000 }
  );
}

function toggleMapFullscreen() {
  const wrap = document.getElementById("map-container-wrap");
  if (!wrap) return;
  wrap.classList.toggle("map-fullscreen");
  resizeMapIfNeeded();
}

function closeMapFullscreen() {
  const wrap = document.getElementById("map-container-wrap");
  if (!wrap || !wrap.classList.contains("map-fullscreen")) return;
  wrap.classList.remove("map-fullscreen");
  resizeMapIfNeeded();
}

function setupMapFullscreenClose() {
  const closeBtn = document.getElementById("map-fullscreen-close-btn");
  if (closeBtn) closeBtn.addEventListener("click", closeMapFullscreen);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMapFullscreen();
  });
}

/* ---------- Mini-Karte im Detail-Modal ---------- */

let detailMapInstance = null;

function initDetailMap(containerId, lat, lon, label) {
  destroyDetailMap();
  const el = document.getElementById(containerId);
  if (!el) return;

  requestMapAccess(containerId, "Die Detailinfos bleiben trotzdem vollständig.", () => {
    // Erneut aufräumen: falls zwischenzeitlich (waehrend auf die Zustimmung
    // gewartet wurde) bereits eine andere wartende Anfrage fuer denselben
    // Container aufgeloest wurde, darf hier kein zweiter Leaflet-Map auf
    // demselben Container-Element entstehen.
    destroyDetailMap();
    detailMapInstance = L.map(containerId, {
      center: [lat, lon],
      zoom: 11,
      scrollWheelZoom: false,
      attributionControl: true,
    });

    L.tileLayer("https://tile.openstreetmap.de/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(detailMapInstance);

    L.circleMarker([lat, lon], {
      radius: 9,
      fillColor: "#FF8C00",
      color: "#ffffff",
      weight: 2,
      fillOpacity: 0.95,
    }).addTo(detailMapInstance).bindPopup(label).openPopup();

    setTimeout(() => detailMapInstance && detailMapInstance.invalidateSize(), 80);
  });
}

function destroyDetailMap() {
  if (detailMapInstance) {
    detailMapInstance.remove();
    detailMapInstance = null;
  }
}
