/* =========================================================
   Keysglade — Wetter
   Datenquelle: Open-Meteo (https://open-meteo.com)
   Kostenlos, ohne API-Key, ohne Cookies/Tracking.
========================================================= */

const WMO_CODES = {
  0: { label: "Klarer Himmel", icon: "sun" },
  1: { label: "Überwiegend klar", icon: "cloudsun" },
  2: { label: "Teilweise bewölkt", icon: "cloudsun" },
  3: { label: "Bedeckt", icon: "cloud" },
  45: { label: "Nebel", icon: "fog" },
  48: { label: "Reifnebel", icon: "fog" },
  51: { label: "Leichter Nieselregen", icon: "drizzle" },
  53: { label: "Nieselregen", icon: "drizzle" },
  55: { label: "Starker Nieselregen", icon: "rain" },
  61: { label: "Leichter Regen", icon: "rain" },
  63: { label: "Regen", icon: "rain" },
  65: { label: "Starker Regen", icon: "rain" },
  80: { label: "Regenschauer", icon: "drizzle" },
  81: { label: "Kräftige Schauer", icon: "rain" },
  82: { label: "Heftige Schauer", icon: "thunder" },
  95: { label: "Gewitter", icon: "thunder" },
  96: { label: "Gewitter mit Hagel", icon: "thunder" },
  99: { label: "Schweres Gewitter mit Hagel", icon: "thunder" },
};

function describeWeather(code) {
  const w = WMO_CODES[code] || { label: "Unbekannt", icon: "question" };
  return { label: w.label, icon: rwi(w.icon) };
}

async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m` +
    `&hourly=precipitation_probability` +
    `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,sunrise,sunset,uv_index_max` +
    `&timezone=auto&forecast_days=6`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Wetterdaten konnten nicht geladen werden");
  return res.json();
}

function describeUvIndex(uv) {
  if (uv < 3) return { label: "Niedrig", advice: "Sonnenschutz meist nicht zwingend nötig.", color: "#2E9E5B" };
  if (uv < 6) return { label: "Mäßig", advice: "Sonnenschutz (LSF 30+) empfohlen, v. a. mittags.", color: "#e0b41e" };
  if (uv < 8) return { label: "Hoch", advice: "Sonnenschutz, Kopfbedeckung und Schatten in der Mittagszeit.", color: "#FF8C00" };
  if (uv < 11) return { label: "Sehr hoch", advice: "Direkte Sonne zwischen 11 und 15 Uhr möglichst meiden.", color: "#d1552b" };
  return { label: "Extrem", advice: "Aufenthalt im Freien in der Mittagszeit vermeiden, konsequenter Schutz nötig.", color: "#b23a2a" };
}

function formatClockTime(isoString) {
  return new Date(isoString).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function calculateGoldenHour(sunriseIso, sunsetIso) {
  const sunrise = new Date(sunriseIso);
  const sunset = new Date(sunsetIso);
  const morningEnd = new Date(sunrise.getTime() + 45 * 60000);
  const eveningStart = new Date(sunset.getTime() - 45 * 60000);
  return {
    morning: `${formatClockTime(sunrise)} – ${formatClockTime(morningEnd)}`,
    evening: `${formatClockTime(eveningStart)} – ${formatClockTime(sunset)}`,
  };
}

let lastWeatherSummary = null;
let lastWeatherDaily = null;
let lastWeatherDayNames = null;

function buildTempChartSvg(maxTemps, minTemps, dayNames, dates) {
  const w = 300, h = 132, padX = 16, padTop = 18, padBottom = 26;
  const allVals = [...maxTemps, ...minTemps];
  const lo = Math.min(...allVals) - 2;
  const hi = Math.max(...allVals) + 2;
  const range = hi - lo || 1;
  const plotH = h - padTop - padBottom;
  const stepX = (w - padX * 2) / (maxTemps.length - 1);

  const toXY = (val, i) => {
    const x = padX + i * stepX;
    const y = padTop + plotH - ((val - lo) / range) * plotH;
    return [x, y];
  };

  const maxPoints = maxTemps.map((v, i) => toXY(v, i));
  const minPoints = minTemps.map((v, i) => toXY(v, i));
  const toPath = (pts) => pts.map((p) => p.join(",")).join(" ");

  const maxDots = maxPoints.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.4" fill="#FF8C00"/>`).join("");
  const minDots = minPoints.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.4" fill="#1E2A78"/>`).join("");

  const maxLabels = maxPoints.map(([x, y], i) =>
    `<text x="${x}" y="${y - 7}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#FF8C00">${Math.round(maxTemps[i])}°</text>`
  ).join("");
  const minLabels = minPoints.map(([x, y], i) =>
    `<text x="${x}" y="${y + 14}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#1E2A78">${Math.round(minTemps[i])}°</text>`
  ).join("");
  const dateLabels = maxPoints.map(([x], i) =>
    `<text x="${x}" y="${h - 8}" text-anchor="middle" font-size="9" fill="var(--text-muted)">${dates && dates[i] ? dates[i] : dayNames[i]}</text>`
  ).join("");

  return `
    <svg viewBox="0 0 ${w} ${h}" class="temp-chart-svg" role="img" aria-label="Temperaturverlauf der nächsten Tage">
      <polyline points="${toPath(maxPoints)}" fill="none" stroke="#FF8C00" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      <polyline points="${toPath(minPoints)}" fill="none" stroke="#1E2A78" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      ${maxDots}${minDots}
      ${maxLabels}${minLabels}
      ${dateLabels}
    </svg>
  `;
}

/* Open-Meteo liefert bei timezone=auto alle Uhrzeiten als "naive" Ortszeit-Strings
   des Reiseziels (z. B. Florida), ohne Zeitzonen-Offset. new Date(t) würde diese
   String fälschlich als Browser-Ortszeit (Deutschland) interpretieren — das hätte
   das Regenfenster um die Zeitverschiebung zu Florida verschoben. Daher Vergleich
   als reine Zeichenketten, mit "jetzt" umgerechnet in die Ziel-Zeitzone. */
function getLocalNowString(timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function getNextSixHoursRain(hourly, timezone) {
  if (!hourly || !hourly.time || !hourly.time.length) return [[], []];
  const nowLocal = timezone ? getLocalNowString(timezone) : new Date().toISOString().slice(0, 16);
  let startIdx = hourly.time.findIndex((t) => t >= nowLocal);
  if (startIdx === -1) startIdx = 0;
  const slice = hourly.time.slice(startIdx, startIdx + 6);
  const chances = hourly.precipitation_probability.slice(startIdx, startIdx + 6).map((v) => v ?? 0);
  const labels = slice.map((t) => `${t.slice(11, 13)} Uhr`);
  return [chances, labels];
}

function buildRainChartSvg(rainChances, hourLabels) {
  const w = 300, h = 132, padX = 16, padTop = 18, padBottom = 26;
  const plotH = h - padTop - padBottom;
  const stepX = (w - padX * 2) / (rainChances.length - 1);
  const barW = Math.min(26, stepX * 0.55);

  const bars = rainChances.map((pct, i) => {
    const x = padX + i * stepX;
    const barH = (Math.max(0, Math.min(100, pct)) / 100) * plotH;
    const y = padTop + plotH - barH;
    return `<rect x="${x - barW / 2}" y="${y}" width="${barW}" height="${barH}" rx="3" fill="#1E2A78" fill-opacity="0.75"/>
      <text x="${x}" y="${y - 6}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#1E2A78">${Math.round(pct)}%</text>`;
  }).join("");

  const timeLabels = hourLabels.map((label, i) => {
    const x = padX + i * stepX;
    return `<text x="${x}" y="${h - 8}" text-anchor="middle" font-size="9" fill="var(--text-muted)">${label}</text>`;
  }).join("");

  return `
    <svg viewBox="0 0 ${w} ${h}" class="temp-chart-svg" role="img" aria-label="Regenwahrscheinlichkeit der kommenden sechs Stunden in Prozent">
      ${bars}
      ${timeLabels}
    </svg>
  `;
}

function renderWeatherCard(container, cityName, data) {
  const current = data.current;
  const daily = data.daily;
  const currentInfo = describeWeather(current.weather_code);
  const uvInfo = describeUvIndex(daily.uv_index_max[0]);
  const golden = calculateGoldenHour(daily.sunrise[0], daily.sunset[0]);

  lastWeatherSummary = {
    city: cityName,
    maxRainChance: Math.max(...daily.precipitation_probability_max.slice(0, 6)),
    minTemp: Math.min(...daily.temperature_2m_min.slice(0, 6)),
    maxTemp: Math.max(...daily.temperature_2m_max.slice(0, 6)),
    maxUv: Math.max(...daily.uv_index_max.slice(0, 6)),
  };
  if (typeof onWeatherSummaryUpdated === "function") onWeatherSummaryUpdated(lastWeatherSummary);

  const dayNames = daily.time.map((d) =>
    new Date(d).toLocaleDateString("de-DE", { weekday: "short" })
  );
  const shortDates = daily.time.map((d) =>
    new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })
  );

  lastWeatherDaily = daily;
  lastWeatherDayNames = dayNames;

  let forecastHtml = "";
  for (let i = 0; i < daily.time.length; i++) {
    const info = describeWeather(daily.weather_code[i]);
    forecastHtml += `
      <div class="forecast-day" data-day-index="${i}" tabindex="0" role="button" aria-label="Details für ${dayNames[i]}">
        <div class="forecast-day-name">${dayNames[i]}</div>
        <div class="forecast-icon">${info.icon}</div>
        <div class="forecast-temps">
          <span class="temp-max">${Math.round(daily.temperature_2m_max[i])}°</span>
          <span class="temp-min">${Math.round(daily.temperature_2m_min[i])}°</span>
        </div>
        <div class="forecast-rain">${rwi("droplet")} ${daily.precipitation_probability_max[i] ?? 0}%</div>
      </div>`;
  }

  container.innerHTML = `
    <div class="weather-current">
      <div class="weather-current-main">
        <div class="weather-current-icon">${currentInfo.icon}</div>
        <div>
          <div class="weather-current-temp">${Math.round(current.temperature_2m)}°C</div>
          <div class="weather-current-label">${currentInfo.label} in ${cityName}</div>
        </div>
      </div>
      <div class="weather-current-meta">
        <span>${rwi("wind")} ${Math.round(current.wind_speed_10m)} km/h</span>
        <span>${rwi("droplets")} ${current.relative_humidity_2m}% Luftfeuchtigkeit</span>
      </div>
    </div>
    <div class="forecast-row">${forecastHtml}</div>

    <div class="temp-chart-wrap">
      <div class="temp-chart-legend"><span class="temp-chart-dot" style="background:#FF8C00"></span> Höchstwerte <span class="temp-chart-dot" style="background:#1E2A78"></span> Tiefstwerte</div>
      ${buildTempChartSvg(daily.temperature_2m_max, daily.temperature_2m_min, dayNames, shortDates)}
    </div>

    <div class="temp-chart-wrap">
      <div class="temp-chart-legend"><span class="temp-chart-dot" style="background:#1E2A78"></span> Regenwahrscheinlichkeit (kommende 6 Stunden)</div>
      ${buildRainChartSvg(...getNextSixHoursRain(data.hourly, data.timezone))}
    </div>

    <div class="weather-extra-row">
      <div class="weather-extra-card">
        <div class="weather-extra-label">${rwi("sunrise")} Sonnenauf-/untergang</div>
        <div class="weather-extra-value">${formatClockTime(daily.sunrise[0])} · ${formatClockTime(daily.sunset[0])}</div>
        <div class="weather-extra-sub">Goldene Stunde morgens: ${golden.morning}<br>Goldene Stunde abends: ${golden.evening}</div>
      </div>
      <div class="weather-extra-card">
        <div class="weather-extra-label">${rwi("sun")} UV-Index heute</div>
        <div class="weather-extra-value" style="color:${uvInfo.color}">${Math.round(daily.uv_index_max[0])} · ${uvInfo.label}</div>
        <div class="weather-extra-sub">${uvInfo.advice}</div>
      </div>
    </div>

    <p class="weather-source">Daten von Open-Meteo, aktualisiert bei jedem Seitenaufruf.</p>
  `;

  container.querySelectorAll(".forecast-day").forEach((el) => {
    el.addEventListener("click", () => openWeatherDayDetail(Number(el.dataset.dayIndex)));
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openWeatherDayDetail(Number(el.dataset.dayIndex)); }
    });
  });
}

function openWeatherDayDetail(i) {
  const daily = lastWeatherDaily;
  if (!daily) return;
  const modal = document.getElementById("weather-day-modal");
  const info = describeWeather(daily.weather_code[i]);
  const uvInfo = describeUvIndex(daily.uv_index_max[i]);
  const dayLabel = new Date(daily.time[i]).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" });

  modal.querySelector(".weather-day-modal-body").innerHTML = `
    <div class="weather-day-modal-header">
      <span class="weather-day-modal-icon">${info.icon}</span>
      <div>
        <div class="weather-day-modal-date">${dayLabel}</div>
        <div class="weather-day-modal-desc">${info.label}</div>
      </div>
    </div>
    <div class="weather-day-modal-grid">
      <div><span class="weather-day-modal-label">Höchsttemperatur</span><span class="weather-day-modal-value">${Math.round(daily.temperature_2m_max[i])}°C</span></div>
      <div><span class="weather-day-modal-label">Tiefsttemperatur</span><span class="weather-day-modal-value">${Math.round(daily.temperature_2m_min[i])}°C</span></div>
      <div><span class="weather-day-modal-label">Regenchance</span><span class="weather-day-modal-value">${daily.precipitation_probability_max[i] ?? 0}%</span></div>
      <div><span class="weather-day-modal-label">Erwartete Regenmenge</span><span class="weather-day-modal-value">${(daily.precipitation_sum[i] ?? 0).toFixed(1)} mm</span></div>
      <div><span class="weather-day-modal-label">Wind (Böen)</span><span class="weather-day-modal-value">${Math.round(daily.wind_speed_10m_max[i])} km/h</span></div>
      <div><span class="weather-day-modal-label">UV-Index</span><span class="weather-day-modal-value" style="color:${uvInfo.color}">${Math.round(daily.uv_index_max[i])} · ${uvInfo.label}</span></div>
      <div><span class="weather-day-modal-label">Sonnenaufgang</span><span class="weather-day-modal-value">${formatClockTime(daily.sunrise[i])}</span></div>
      <div><span class="weather-day-modal-label">Sonnenuntergang</span><span class="weather-day-modal-value">${formatClockTime(daily.sunset[i])}</span></div>
    </div>
    <p class="weather-day-modal-advice">${uvInfo.advice}</p>
  `;
  modal.classList.add("open");
}

async function loadWeatherFor(cityName, container) {
  const city = WEATHER_CITIES.find((c) => c.name === cityName) || WEATHER_CITIES[0];
  container.innerHTML = `
    <div class="skeleton-weather-current">
      <div class="skeleton-block skeleton-weather-icon"></div>
      <div class="skeleton-block skeleton-weather-temp"></div>
    </div>
    <div class="skeleton-forecast-row">
      <div class="skeleton-block"></div><div class="skeleton-block"></div><div class="skeleton-block"></div>
      <div class="skeleton-block"></div><div class="skeleton-block"></div><div class="skeleton-block"></div>
    </div>
  `;
  try {
    const data = await fetchWeather(city.lat, city.lon);
    renderWeatherCard(container, city.name, data);
  } catch (e) {
    container.innerHTML = `<p class="weather-error">Wetterdaten aktuell nicht verfügbar. Bitte Internetverbindung prüfen.</p>`;
  }
}
