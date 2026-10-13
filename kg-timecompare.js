/* =========================================================
   Keysglade — Zeitvergleich Deutschland ↔ Florida
   Reines JavaScript (Intl.DateTimeFormat), keine externe API.
========================================================= */

function formatZoneTime(timeZone) {
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date());
}

function formatZoneDate(timeZone) {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone,
  }).format(new Date());
}

function calculateHourDifference() {
  const now = new Date();
  const deHour = parseInt(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "Europe/Berlin" }).format(now), 10);
  const flHour = parseInt(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "America/New_York" }).format(now), 10);
  let diff = deHour - flHour;
  if (diff < 0) diff += 24;
  if (diff > 12) diff -= 24;
  return diff;
}

// Baut die feste Struktur (Flaggen, Beschriftungen) NUR EINMAL auf.
// Die Flaggen-Bilder werden dadurch nie neu geladen — kein Flackern mehr.
function buildTimeCompareStructure(el) {
  el.innerHTML = `
    <div class="time-compare-col">
      <div class="time-compare-flag"><img src="kg-flag-germany.svg" alt="" width="32" height="22"></div>
      <div class="time-compare-time" id="time-compare-de-time"></div>
      <div class="time-compare-date" id="time-compare-de-date"></div>
      <div class="time-compare-place">Deutschland</div>
    </div>
    <div class="time-compare-diff">
      <span id="time-compare-diff-value"></span>
    </div>
    <div class="time-compare-col">
      <div class="time-compare-flag time-compare-flag-duo">
        <img src="kg-flag-usa.svg" alt="" width="26" height="18">
        <img src="kg-flag-florida.svg" alt="" width="26" height="18">
      </div>
      <div class="time-compare-time" id="time-compare-fl-time"></div>
      <div class="time-compare-date" id="time-compare-fl-date"></div>
      <div class="time-compare-place">Florida (Eastern Time)</div>
    </div>
  `;
}

// Aktualisiert nur die Text-Inhalte (Uhrzeit/Datum/Differenz) —
// die Flaggen-Bilder bleiben unangetastet im DOM.
function updateTimeCompareValues() {
  const diff = calculateHourDifference();
  document.getElementById("time-compare-de-time").textContent = formatZoneTime("Europe/Berlin");
  document.getElementById("time-compare-de-date").textContent = formatZoneDate("Europe/Berlin");
  document.getElementById("time-compare-fl-time").textContent = formatZoneTime("America/New_York");
  document.getElementById("time-compare-fl-date").textContent = formatZoneDate("America/New_York");
  document.getElementById("time-compare-diff-value").textContent = `${diff >= 0 ? "−" : "+"}${Math.abs(diff)}h`;
}

function setupTimeCompare() {
  const el = document.getElementById("time-compare-widget");
  if (!el) return;
  buildTimeCompareStructure(el);
  updateTimeCompareValues();
  setInterval(updateTimeCompareValues, 15000);
}
