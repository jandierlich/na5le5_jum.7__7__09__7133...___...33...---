/* =========================================================
   Keysglade — Reise-Countdown
========================================================= */

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function renderCountdown() {
  const el = document.getElementById("countdown-widget");
  if (!el) return;
  const tripDate = Storage.getTripDate();

  if (!tripDate) {
    el.innerHTML = `
      <p class="countdown-empty">Noch kein Reisedatum eingetragen.</p>
      <div class="countdown-set-row">
        <input type="date" id="countdown-date-input">
        <button id="countdown-set-btn" class="btn-primary">Reise-Countdown starten</button>
      </div>
    `;
    document.getElementById("countdown-set-btn").addEventListener("click", () => {
      const val = document.getElementById("countdown-date-input").value;
      if (val) {
        Storage.setTripDate(val);
        renderCountdown();
      }
    });
    return;
  }

  const days = daysUntil(tripDate);
  const dateLabel = new Date(tripDate).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  let message;
  if (days > 1) message = `<span class="countdown-days">${days}</span><span class="countdown-unit">Tage bis zur Reise</span>`;
  else if (days === 1) message = `<span class="countdown-days">1</span><span class="countdown-unit">Tag bis zur Reise!</span>`;
  else if (days === 0) message = `<span class="countdown-today">${rwi("palm")} Heute geht's los!</span>`;
  else message = `<span class="countdown-today">${rwi("waves")} Gute Reise! Wir hoffen, es war/ist wunderbar.</span>`;

  // Querverbindung: Sternenhimmel über der gewählten Wetter-Stadt am Abend der Anreise (ca. 21:30 Uhr Ortszeit)
  const skyCity = (typeof WEATHER_CITIES !== "undefined" && WEATHER_CITIES.find((c) => c.name === Storage.getLastWeatherCity())) || { name: "Naples", lat: 26.1420, lon: -81.7948 };
  let skyHref = "";
  try {
    const t = new Date(tripDate + "T21:30:00-04:00").toISOString();
    skyHref = `./sternewahr-index.html?lat=${skyCity.lat}&lon=${skyCity.lon}&name=${encodeURIComponent(skyCity.name + " (Florida)")}&t=${encodeURIComponent(t)}`;
  } catch (e) {}

  el.innerHTML = `
    <div class="countdown-display">${message}</div>
    <div class="countdown-date-label">${dateLabel}</div>
    <button id="countdown-edit-btn" class="countdown-edit-btn">Datum ändern</button>
    ${skyHref && days >= 0 ? `<a class="countdown-edit-btn" style="display:inline-block;margin-left:8px;text-decoration:none" href="${skyHref}">Sternenhimmel am Anreiseabend</a>` : ""}
  `;

  document.getElementById("countdown-edit-btn").addEventListener("click", () => {
    Storage.setTripDate(null);
    renderCountdown();
  });
}

function setupCountdown() {
  if (!document.getElementById("countdown-widget")) return;
  renderCountdown();
}
