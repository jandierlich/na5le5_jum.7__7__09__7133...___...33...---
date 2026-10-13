/* =========================================================
   Keysglade — In der Nähe & Entfernungsrechner
   Standort wird nur einmalig abgefragt, nirgends gespeichert.
========================================================= */

function setupNearby() {
  const btn = document.getElementById("nearby-locate-btn");
  const status = document.getElementById("nearby-status");
  const results = document.getElementById("nearby-results");

  btn.addEventListener("click", () => {
    if (!("geolocation" in navigator)) {
      status.textContent = "Standortabfrage wird von diesem Browser nicht unterstützt.";
      return;
    }
    status.textContent = "Standort wird ermittelt…";
    results.innerHTML = "";

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        status.textContent = `Standort erkannt. Nächste Ziele:`;
        renderNearbyResults(latitude, longitude, results);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          status.textContent = "Standortzugriff wurde nicht erlaubt. Du kannst das jederzeit in den Browser-Einstellungen ändern.";
        } else {
          status.textContent = "Standort konnte nicht ermittelt werden.";
        }
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  });
}

function renderNearbyResults(lat, lon, container) {
  const withDistance = ENTRIES
    .filter((e) => e.lat && e.lon)
    .map((e) => ({ ...e, distanceKm: haversineKm(lat, lon, e.lat, e.lon) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 12);

  container.innerHTML = withDistance.map((e) => {
    const num = String(ENTRIES.indexOf(ENTRIES.find(x => x.id === e.id)) + 1).padStart(2, "0");
    return `
      <div class="entry-card nearby-card" data-id="${e.id}" tabindex="0" role="button">
        <div class="entry-card-top">
          <span class="plate-num">Nr. ${num}</span>
          <span class="nearby-distance">${formatDistance(e.distanceKm)}</span>
        </div>
        <div class="entry-icon">${e.icon}</div>
        <h3>${e.name}</h3>
        <div class="entry-region">${e.region}</div>
      </div>
    `;
  }).join("");

  container.querySelectorAll(".nearby-card").forEach((card) => {
    card.addEventListener("click", () => {
      const entry = ENTRIES.find((e) => e.id === card.dataset.id);
      openDetail(entry);
    });
  });
}

/* ---------- Entfernungsrechner (zwischen zwei beliebigen Zielen) ---------- */

function setupDistanceCalculator() {
  const fromSel = document.getElementById("distance-from");
  const toSel = document.getElementById("distance-to");
  const resultEl = document.getElementById("distance-result");

  const withCoords = ENTRIES.filter((e) => e.lat && e.lon);
  const optionsHtml = withCoords.map((e) => `<option value="${e.id}">${e.name} (${e.region})</option>`).join("");
  fromSel.innerHTML = `<option value="">Von…</option>${optionsHtml}`;
  toSel.innerHTML = `<option value="">Nach…</option>${optionsHtml}`;

  function update() {
    const from = ENTRIES.find((e) => e.id === fromSel.value);
    const to = ENTRIES.find((e) => e.id === toSel.value);
    if (!from || !to) {
      resultEl.innerHTML = "";
      return;
    }
    if (from.id === to.id) {
      resultEl.innerHTML = `<p class="notes-empty">Bitte zwei unterschiedliche Ziele wählen.</p>`;
      return;
    }
    const km = haversineKm(from.lat, from.lon, to.lat, to.lon);
    const minutes = estimateDriveMinutes(km);
    resultEl.innerHTML = `
      <div class="budget-range">
        <span class="budget-range-label">${from.name} → ${to.name}</span>
        <span class="budget-range-value">${formatDistance(km)}</span>
      </div>
      <p class="budget-disclaimer">Luftlinie, keine echte Routenführung. Geschätzte Fahrzeit bei Landstraßentempo: ${formatDuration(minutes)}.</p>
    `;
  }

  fromSel.addEventListener("change", update);
  toSel.addEventListener("change", update);
}
