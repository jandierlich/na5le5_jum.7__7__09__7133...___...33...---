/* =========================================================
   Keysglade — Reiseplaner: Tagesplan-Builder
   Alles bleibt lokal (localStorage). Distanzen sind
   Luftlinien-Näherungen, keine echten Routendaten.
========================================================= */

let itineraryDayMaps = {}; // dayId -> Leaflet-Instanz (Mini-Routenkarten)

function getItinerary() {
  return Storage.getItinerary();
}

function saveItinerary(days) {
  Storage.setItinerary(days);
}

function createItineraryDay() {
  const days = getItinerary();
  const nextNum = days.length + 1;
  days.push({ id: `day-${Date.now()}`, title: `Tag ${nextNum}`, entryIds: [] });
  saveItinerary(days);
  renderItinerary();
}

function removeItineraryDay(dayId) {
  let days = getItinerary();
  days = days.filter((d) => d.id !== dayId);
  saveItinerary(days);
  renderItinerary();
}

function renameItineraryDay(dayId, newTitle) {
  const days = getItinerary();
  const day = days.find((d) => d.id === dayId);
  if (day) day.title = newTitle;
  saveItinerary(days);
}

function addEntryToDay(dayId, entryId) {
  const days = getItinerary();
  const day = days.find((d) => d.id === dayId);
  if (day && !day.entryIds.includes(entryId)) {
    day.entryIds.push(entryId);
    saveItinerary(days);
    renderItinerary();
  }
}

function removeEntryFromDay(dayId, entryId) {
  const days = getItinerary();
  const day = days.find((d) => d.id === dayId);
  if (day) {
    day.entryIds = day.entryIds.filter((id) => id !== entryId);
    saveItinerary(days);
    renderItinerary();
  }
}

function moveEntryInDay(dayId, entryId, direction) {
  const days = getItinerary();
  const day = days.find((d) => d.id === dayId);
  if (!day) return;
  const idx = day.entryIds.indexOf(entryId);
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= day.entryIds.length) return;
  [day.entryIds[idx], day.entryIds[newIdx]] = [day.entryIds[newIdx], day.entryIds[idx]];
  saveItinerary(days);
  renderItinerary();
}

function calculateDaySummary(day) {
  const stops = day.entryIds
    .map((id) => ENTRIES.find((e) => e.id === id))
    .filter((e) => e && e.lat && e.lon);

  let totalKm = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    totalKm += haversineKm(stops[i].lat, stops[i].lon, stops[i + 1].lat, stops[i + 1].lon);
  }
  const minutes = estimateDriveMinutes(totalKm);
  return { stops, totalKm, minutes };
}

function renderItinerary() {
  const container = document.getElementById("itinerary-container");
  const days = getItinerary();

  Object.values(itineraryDayMaps).forEach((m) => m && m.remove());
  itineraryDayMaps = {};

  if (days.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${rwi("calendar")}</div><p class="empty-state-text">Noch kein Tagesplan angelegt</p><p class="empty-state-hint">Leg unten deinen ersten Tag an oder lade eine Muster-Route.</p></div>`;
  } else {
    container.innerHTML = days.map((day) => {
      const { stops, totalKm, minutes } = calculateDaySummary(day);
      const entryOptions = ENTRIES.filter((e) => !day.entryIds.includes(e.id))
        .map((e) => `<option value="${e.id}">${e.name} (${e.region})</option>`)
        .join("");

      const stopsHtml = day.entryIds.length === 0
        ? `<p class="notes-empty" style="margin:8px 0;">Noch keine Ziele für diesen Tag.</p>`
        : day.entryIds.map((id, i) => {
            const entry = ENTRIES.find((e) => e.id === id);
            if (!entry) return "";
            return `
              <div class="itinerary-stop">
                <span class="itinerary-stop-num">${i + 1}</span>
                <span class="itinerary-stop-icon">${entry.icon}</span>
                <span class="itinerary-stop-name">${entry.name}</span>
                <div class="itinerary-stop-actions">
                  <button data-action="up" data-day="${day.id}" data-entry="${id}" aria-label="Nach oben" ${i === 0 ? "disabled" : ""}>↑</button>
                  <button data-action="down" data-day="${day.id}" data-entry="${id}" aria-label="Nach unten" ${i === day.entryIds.length - 1 ? "disabled" : ""}>↓</button>
                  <button data-action="remove" data-day="${day.id}" data-entry="${id}" aria-label="Entfernen">${rwi("close")}</button>
                </div>
              </div>`;
          }).join("");

      const hasRoute = stops.length >= 2;
      const mapId = `itinerary-map-${day.id}`;

      return `
        <div class="itinerary-day">
          <div class="itinerary-day-header">
            <input type="text" class="itinerary-day-title" value="${day.title}" data-day="${day.id}" maxlength="40">
            ${canShare() ? `<button class="itinerary-share-day" data-day="${day.id}" aria-label="Tag teilen" title="Teilen">${rwi("share")}</button>` : ""}
            <button class="itinerary-remove-day" data-day="${day.id}" aria-label="Tag löschen">Tag löschen</button>
          </div>
          <div class="itinerary-stops">${stopsHtml}</div>
          <div class="itinerary-add-row">
            <select data-day="${day.id}" class="itinerary-add-select">
              <option value="">+ Ziel hinzufügen…</option>
              ${entryOptions}
            </select>
          </div>
          ${day.entryIds.length > 0 ? `
            <div class="itinerary-summary">
              ${stops.length < day.entryIds.length ? `<span class="itinerary-note">Hinweis: einige Reiseplanungs-Themen haben keine Koordinaten und zählen nicht in die Routenberechnung.</span>` : ""}
              ${hasRoute ? `<span>${rwi("ruler")} Gesamtstrecke (Luftlinie): <strong>${formatDistance(totalKm)}</strong></span>
              <span>${rwi("car")} geschätzte Fahrzeit: <strong>${formatDuration(minutes)}</strong></span>` : `<span class="itinerary-note">Mindestens 2 Ziele mit Standort nötig für eine Streckenberechnung.</span>`}
            </div>
            ${hasRoute ? `<div id="${mapId}" class="itinerary-mini-map"></div>` : ""}
          ` : ""}
        </div>
      `;
    }).join("");
  }

  container.querySelectorAll(".itinerary-day-title").forEach((input) => {
    input.addEventListener("change", (e) => renameItineraryDay(e.target.dataset.day, e.target.value.trim() || "Tag"));
  });
  container.querySelectorAll(".itinerary-remove-day").forEach((btn) => {
    btn.addEventListener("click", () => removeItineraryDay(btn.dataset.day));
  });
  container.querySelectorAll(".itinerary-share-day").forEach((btn) => {
    btn.addEventListener("click", () => {
      const days = getItinerary();
      const day = days.find((d) => d.id === btn.dataset.day);
      if (!day) return;
      const stopNames = day.entryIds
        .map((id) => ENTRIES.find((e) => e.id === id))
        .filter(Boolean)
        .map((e, i) => `${i + 1}. ${e.name}`)
        .join("\n");
      shareContent({
        title: day.title,
        text: `Mein Reiseplan für "${day.title}" (Keysglade):\n\n${stopNames || "Noch keine Ziele eingetragen."}`,
      });
    });
  });
  container.querySelectorAll(".itinerary-add-select").forEach((sel) => {
    sel.addEventListener("change", (e) => {
      if (e.target.value) addEntryToDay(e.target.dataset.day, e.target.value);
    });
  });
  container.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const { action, day, entry } = btn.dataset;
      if (action === "remove") removeEntryFromDay(day, entry);
      if (action === "up") moveEntryInDay(day, entry, -1);
      if (action === "down") moveEntryInDay(day, entry, 1);
    });
  });

  days.forEach((day) => {
    const { stops } = calculateDaySummary(day);
    if (stops.length >= 2) {
      requestAnimationFrame(() => renderItineraryMap(`itinerary-map-${day.id}`, day.id, stops));
    }
  });
}

function renderItineraryMap(mapId, dayId, stops) {
  const el = document.getElementById(mapId);
  if (!el) return;

  requestMapAccess(mapId, "Die Streckenberechnung (Distanz/Fahrzeit) bleibt trotzdem vollständig.", () => {
    // Container koennte sich seit dem Anfragen der Zustimmung durch einen
    // erneuten Render bereits veraendert/entfernt haben.
    const freshEl = document.getElementById(mapId);
    if (!freshEl) return;

    const map = L.map(mapId, { scrollWheelZoom: false, zoomControl: true });
    L.tileLayer("https://tile.openstreetmap.de/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    const latlngs = stops.map((s) => [s.lat, s.lon]);
    stops.forEach((s, i) => {
      L.circleMarker([s.lat, s.lon], {
        radius: 8, fillColor: "#FF8C00", color: "#fff", weight: 2, fillOpacity: 0.95,
      }).addTo(map).bindTooltip(`${i + 1}. ${s.name}`, { permanent: false });
    });
    L.polyline(latlngs, { color: "#1E2A78", weight: 3, dashArray: "6 8" }).addTo(map);
    map.fitBounds(latlngs, { padding: [30, 30] });

    itineraryDayMaps[dayId] = map;
    setTimeout(() => map.invalidateSize(), 80);
  });
}
