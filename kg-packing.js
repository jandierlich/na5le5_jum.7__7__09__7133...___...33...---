/* =========================================================
   Keysglade — Packliste
========================================================= */

const PACKING_LIST = {
  "Dokumente & Formalitäten": [
    "Reisepass (Gültigkeit prüfen)",
    "Einreisegenehmigung / Visum-Unterlagen",
    "Führerschein (ggf. internationaler Führerschein)",
    "Reise- & Krankenversicherung-Nachweis",
    "Buchungsbestätigungen (digital + Ausdruck)",
  ],
  "Kleidung": [
    "Leichte, atmungsaktive Kleidung",
    "Badesachen (mehrfach)",
    "Leichte Regenjacke",
    "Bequeme Wanderschuhe",
    "Leichte Fleecejacke für Innenräume",
    "Sonnenhut / Cap",
  ],
  "Gesundheit & Pflege": [
    "Sonnenschutz (wasserfest, hoher LSF)",
    "Insektenschutzmittel",
    "Reiseapotheke",
    "Nach-Sonne-Pflege",
  ],
  "Elektronik": [
    "Steckdosenadapter (Typ A/B, 120V)",
    "Powerbank",
    "Ladekabel",
    "Wasserdichte Handyhülle",
  ],
  "Sonstiges": [
    "Wiederverschließbare Wasserflasche",
    "Strandtuch",
    "Kleingeld für Parkgebühren",
    "Kreditkarte ohne hohe Auslandsgebühren",
  ],
};

function renderPackingList(container) {
  const state = Storage.getPackingState();
  let html = `<div id="packing-weather-hint"></div>`;

  Object.entries(PACKING_LIST).forEach(([group, items]) => {
    html += `<div class="packing-group"><h4>${group}</h4><ul class="packing-items">`;
    items.forEach((item) => {
      const key = `${group}::${item}`;
      const checked = state[key] ? "checked" : "";
      html += `
        <li>
          <label class="packing-item ${state[key] ? "checked" : ""}">
            <input type="checkbox" data-key="${key}" ${checked}>
            <span>${item}</span>
          </label>
        </li>`;
    });
    html += `</ul></div>`;
  });

  container.innerHTML = html;

  container.querySelectorAll('input[type="checkbox"]').forEach((box) => {
    box.addEventListener("change", (e) => {
      const key = e.target.dataset.key;
      const state = Storage.getPackingState();
      state[key] = e.target.checked;
      Storage.setPackingState(state);
      e.target.closest(".packing-item").classList.toggle("checked", e.target.checked);
    });
  });

  if (typeof lastWeatherSummary !== "undefined" && lastWeatherSummary) {
    renderWeatherPackingHint(lastWeatherSummary);
  }
}

function renderWeatherPackingHint(summary) {
  const el = document.getElementById("packing-weather-hint");
  if (!el) return;

  const hints = [];
  if (summary.maxRainChance >= 50) hints.push("Regenwahrscheinlichkeit über 50 % in den nächsten Tagen — Regenjacke nicht vergessen.");
  if (summary.maxUv >= 8) hints.push("Sehr hoher UV-Index erwartet — zusätzlichen Sonnenschutz einplanen.");
  if (summary.minTemp <= 18) hints.push("Abends/nachts wird es kühler — eine wärmere Schicht einpacken.");
  if (summary.maxTemp >= 33) hints.push("Sehr hohe Temperaturen erwartet — auf ausreichend Wasser und leichte Kleidung achten.");

  if (hints.length === 0) {
    el.innerHTML = "";
    return;
  }

  el.innerHTML = `
    <div class="packing-weather-hint-box">
      <div class="packing-weather-hint-label">Basierend auf dem Wetter für ${summary.city}:</div>
      ${hints.map((h) => `<p>${h}</p>`).join("")}
    </div>
  `;
}

function onWeatherSummaryUpdated(summary) {
  renderWeatherPackingHint(summary);
}
