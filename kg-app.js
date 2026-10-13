/* =========================================================
   Keysglade — App-Logik
========================================================= */

let bookmarks = Storage.getBookmarks();
let visited = Storage.getVisited();
let activeCat = "all";
let activeRegion = null;
let searchQuery = "";
let mapInitialized = false;
let weatherPageInitialized = false;
let currencyInitialized = false;

document.addEventListener("DOMContentLoaded", () => {
  buildTabs();
  buildRegionChips();
  setupRegionsMap();
  renderCatalog();
  updateBookmarkCount();
  updateVisitedStats();
  setupSearch();
  setupNav();
  setupHomeWeatherPreview();
  renderPackingList(document.getElementById("packing-container"));
  renderNotes(document.getElementById("notes-container"));
  setupBudgetForm();
  setupBookmarkDrawer();
  setupEditorialTips();
  setupPhrasebook();
  setupNearby();
  setupDistanceCalculator();
  renderItinerary();
  document.getElementById("itinerary-add-day-btn").addEventListener("click", createItineraryDay);
  setupMotionToggle();
  loadInlineSVG("hero-illustration", "kg-hero-illustration.svg");
  loadInlineSVG("wave-divider", "kg-wave-divider.svg");
  loadInlineSVG("category-banner", CATEGORY_BANNERS.all);
  loadInlineSVG("weather-banner", "kg-title-weather.svg");
  setupTidesPage();
  setupTimeCompare();
  setupTipCalculator();
  setupTempConverter();
  setupThemeToggle();
  setupCountdown();
  setupDiary();
  setupBackup();
  setupItineraryTemplates();
  setupExpenseTracker();
  setupRandomPick();
  setupQuiz();
  setupAmbientSound();
  setupPrintButtons();
  setupZahlenturm();
  setupZahlenfusion();
  setupSubtabs(document.getElementById("page-map"));
  setupSubtabs(document.getElementById("page-planner"));
  setupSubtabs(document.getElementById("page-games"));
  setupMapToolbar();
  setupMapFullscreenClose();
  registerServiceWorker();
  setupOnboarding();
});

/* ---------- Navigation zwischen Seiten ---------- */

function setupNav() {
  document.querySelectorAll("[data-nav-target]").forEach((btn) => {
    btn.addEventListener("click", () => {
      showPage(btn.dataset.navTarget);
    });
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter") showPage(btn.dataset.navTarget);
    });
  });
}

function setupHomeWeatherPreview() {
  const container = document.getElementById("home-weather-mini");
  const cityName = Storage.getLastWeatherCity();
  const city = WEATHER_CITIES.find((c) => c.name === cityName) || WEATHER_CITIES[0];
  fetchWeather(city.lat, city.lon).then((data) => {
    const info = describeWeather(data.current.weather_code);
    container.innerHTML = `${info.icon} ${Math.round(data.current.temperature_2m)}°C in ${city.name} — ${info.label}. <span style="opacity:.8;">Mehr im Wetter-Tab.</span>`;
  }).catch(() => {
    container.innerHTML = `Wetterdaten aktuell nicht verfügbar.`;
  });
}

function showPage(pageId) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach((n) => n.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
  document.querySelectorAll(`[data-nav-target="${pageId}"]`).forEach((n) => n.classList.add("active"));

  if (pageId === "page-weather" && !weatherPageInitialized) {
    weatherPageInitialized = true;
    setupWeatherPage();
  }
  if (pageId === "page-planner" && !currencyInitialized) {
    currencyInitialized = true;
    setupCurrencyConverter();
  }
  if (pageId === "page-map") {
    if (!mapInitialized) {
      initMap(openDetail);
      mapInitialized = true;
    }
    resizeMapIfNeeded();
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- Unter-Reiter innerhalb einer Seite (Karte, Reiseplaner) ---------- */

function setupSubtabs(pageEl) {
  if (!pageEl) return;
  const buttons = pageEl.querySelectorAll(".subtab-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => { b.classList.remove("active"); b.setAttribute("aria-selected", "false"); });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      pageEl.querySelectorAll(".subtab-panel").forEach((p) => p.classList.remove("active"));
      const target = document.getElementById("subtab-" + btn.dataset.subtab);
      if (target) target.classList.add("active");
      if (btn.dataset.subtab === "map-overview") resizeMapIfNeeded();
    });
  });
}

function setupMapToolbar() {
  const chipsEl = document.getElementById("map-category-chips");
  if (chipsEl) {
    const mapCats = CATEGORIES.filter((c) => ["beaches", "cities", "parks"].includes(c.id));
    chipsEl.innerHTML = `<button class="chip active" data-mapcat="all">Alle</button>` +
      mapCats.map((c) => `<button class="chip" data-mapcat="${c.id}">${c.label}</button>`).join("");
    chipsEl.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        chipsEl.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        filterMapMarkers(chip.dataset.mapcat);
      });
    });
  }

  const locateBtn = document.getElementById("map-locate-btn");
  if (locateBtn) {
    locateBtn.addEventListener("click", () => {
      showMyLocationOnMap((msg) => {
        const statusEl = document.getElementById("map-locate-status");
        if (statusEl) statusEl.textContent = msg;
      });
    });
  }

  const fullscreenBtn = document.getElementById("map-fullscreen-btn");
  if (fullscreenBtn) fullscreenBtn.addEventListener("click", toggleMapFullscreen);
}

/* ---------- Katalog (Entdecken) ---------- */

const CATEGORY_BANNERS = {
  all: "kg-title-beaches.svg",
  beaches: "kg-title-beaches.svg",
  cities: "kg-title-cities.svg",
  parks: "kg-title-parks.svg",
  food: "kg-title-food.svg",
  wildlife: "kg-title-wildlife.svg",
  history: "kg-title-history.svg",
  art: "kg-title-art.svg",
  adventure: "kg-title-adventure.svg",
  planning: "kg-title-planning.svg",
};

function buildTabs() {
  const nav = document.getElementById("category-tabs");
  const allBtn = `<button class="tab-btn active" data-cat="all"><img src="kg-icon-overview.svg" alt="" width="16" height="16"> Übersicht</button>`;
  const catBtns = CATEGORIES.map(
    (c) => `<button class="tab-btn" data-cat="${c.id}"><img src="${c.icon}" alt="" width="16" height="16"> ${c.label}</button>`
  ).join("");
  nav.innerHTML = allBtn + catBtns;

  nav.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      nav.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeCat = btn.dataset.cat;
      loadInlineSVG("category-banner", CATEGORY_BANNERS[activeCat] || CATEGORY_BANNERS.all);
      renderCatalog();
    });
  });
}

function buildRegionChips() {
  const wrap = document.getElementById("region-chips");
  wrap.innerHTML = REGIONS.map((r) => `<button class="chip" data-region="${r}">${r}</button>`).join("");
  wrap.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => selectRegion(chip.dataset.region));
  });
}

function selectRegion(region) {
  if (activeRegion === region) {
    activeRegion = null;
  } else {
    activeRegion = region;
  }
  syncRegionUI();
  renderCatalog();
}

function syncRegionUI() {
  document.querySelectorAll("#region-chips .chip").forEach((c) => {
    c.classList.toggle("active", c.dataset.region === activeRegion);
  });
  document.querySelectorAll(".region-legend-item").forEach((b) => {
    b.classList.toggle("active", b.dataset.region === activeRegion);
  });
  document.querySelectorAll(".region-shape").forEach((s) => {
    s.classList.toggle("active", s.dataset.region === activeRegion);
  });
}

function setupRegionsMap() {
  document.querySelectorAll(".region-shape").forEach((shape) => {
    shape.style.cursor = "pointer";
    shape.addEventListener("click", () => selectRegion(shape.dataset.region));
  });
  document.querySelectorAll(".region-legend-item").forEach((btn) => {
    btn.addEventListener("click", () => selectRegion(btn.dataset.region));
  });
}

function setupSearch() {
  const input = document.getElementById("search-input");
  input.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    renderCatalog();
  });
}

function getFilteredEntries() {
  return ENTRIES.filter((e) => {
    if (activeCat !== "all" && e.cat !== activeCat) return false;
    if (activeRegion && e.region !== activeRegion) return false;
    if (searchQuery) {
      const haystack = (e.name + " " + e.desc + " " + e.tags.join(" ")).toLowerCase();
      if (!haystack.includes(searchQuery)) return false;
    }
    return true;
  });
}

function renderCatalog() {
  const grid = document.getElementById("catalog-grid");
  const countEl = document.getElementById("result-count");
  const filtered = getFilteredEntries();
  countEl.textContent = `${filtered.length} ${filtered.length === 1 ? "Eintrag" : "Einträge"}`;

  if (filtered.length === 0) {
    grid.innerHTML = `<p class="empty-state">Kein Eintrag passt zu dieser Kombination. Suche oder Filter anpassen.</p>`;
    return;
  }

  grid.innerHTML = filtered.map((e) => {
    const num = String(ENTRIES.indexOf(e) + 1).padStart(2, "0");
    const isBookmarked = bookmarks.has(e.id);
    const isPlace = !!(e.lat && e.lon);
    const isVisited = isPlace && visited.has(e.id);
    return `
      <div class="entry-card ${isVisited ? "is-visited" : ""}" data-id="${e.id}" tabindex="0" role="button">
        <div class="entry-card-top">
          <span class="plate-num">Nr. ${num}</span>
          <div class="entry-card-actions">
            ${isPlace ? `<button class="visited-btn ${isVisited ? "active" : ""}" data-id="${e.id}" aria-label="${isVisited ? "Als noch nicht besucht markieren" : "Als besucht markieren"}" title="Besucht">${rwi(isVisited ? "checkcircle" : "circle")}</button>` : ""}
            <button class="bookmark-btn" data-id="${e.id}" aria-label="Merken">${rwi(isBookmarked ? "bookmarked" : "bookmark")}</button>
          </div>
        </div>
        <div class="entry-icon">${e.icon}</div>
        <h3>${e.name}</h3>
        <div class="entry-region">${e.region}</div>
        <p>${e.desc.slice(0, 108)}${e.desc.length > 108 ? "…" : ""}</p>
        <div class="entry-tags">${e.tags.slice(0, 3).map((t) => `<span>${t}</span>`).join("")}</div>
      </div>
    `;
  }).join("");

  grid.querySelectorAll(".entry-card").forEach((card) => {
    card.addEventListener("click", (ev) => {
      if (ev.target.closest(".bookmark-btn") || ev.target.closest(".visited-btn")) return;
      const entry = ENTRIES.find((e) => e.id === card.dataset.id);
      openDetail(entry);
    });
    card.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") card.click();
    });
  });

  grid.querySelectorAll(".bookmark-btn").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      toggleBookmark(btn.dataset.id);
    });
  });

  grid.querySelectorAll(".visited-btn").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      toggleVisited(btn.dataset.id);
    });
  });
}

/* ---------- Detail-Modal ---------- */

function openDetail(entry) {
  const modal = document.getElementById("detail-modal");
  const num = String(ENTRIES.indexOf(entry) + 1).padStart(2, "0");
  const isBookmarked = bookmarks.has(entry.id);
  const hasCoords = entry.lat && entry.lon;
  const isVisited = hasCoords && visited.has(entry.id);

  modal.querySelector(".detail-body").innerHTML = `
    <span class="plate-num">Nr. ${num} · ${entry.region}</span>
    <div class="detail-heading">
      <span class="detail-icon">${entry.icon}</span>
      <h2>${entry.name}</h2>
    </div>
    <p class="detail-desc">${entry.desc}</p>
    <div class="detail-tip">
      <span class="detail-tip-label">Tipp</span>
      <p>${entry.tip}</p>
    </div>
    <div class="entry-tags">${entry.tags.map((t) => `<span>${t}</span>`).join("")}</div>
    ${hasCoords ? `<div id="detail-mini-map" class="detail-mini-map"></div>` : ""}
    <div class="detail-action-row">
      <button id="detail-bookmark-btn" class="btn-primary" data-id="${entry.id}">
        ${isBookmarked ? rwi("bookmarked") + " In Merkliste" : rwi("bookmark") + " Zur Merkliste hinzufügen"}
      </button>
      ${hasCoords ? `
      <button id="detail-visited-btn" class="btn-secondary ${isVisited ? "active" : ""}" data-id="${entry.id}">
        ${isVisited ? rwi("checkcircle") + " Besucht" : rwi("circle") + " Als besucht markieren"}
      </button>` : ""}
      ${isVisited ? `<button id="detail-wow-btn" class="btn-secondary">${rwi("globe")} In WowarWahr eintragen</button>` : ""}
      ${canShare() ? `<button id="detail-share-btn" class="btn-secondary">${rwi("share")} Teilen</button>` : ""}
    </div>
  `;

  modal.querySelector("#detail-bookmark-btn").addEventListener("click", (e) => {
    toggleBookmark(entry.id);
    openDetail(entry);
  });

  const visitedBtn = modal.querySelector("#detail-visited-btn");
  if (visitedBtn) {
    visitedBtn.addEventListener("click", (e) => {
      toggleVisited(entry.id);
      openDetail(entry);
    });
  }

  const wowBtn = modal.querySelector("#detail-wow-btn");
  if (wowBtn) {
    WowBridge.known([entry.id]).then((k) => {
      if (k.has(entry.id)) { wowBtn.innerHTML = rwi("globe") + " In WowarWahr " + rwi("check"); wowBtn.classList.add("active"); }
    });
    wowBtn.addEventListener("click", async () => {
      const n = await WowBridge.addWithFeedback([entry]);
      if (n >= 0) { wowBtn.innerHTML = rwi("globe") + " In WowarWahr " + rwi("check"); wowBtn.classList.add("active"); }
    });
  }

  const shareBtn = modal.querySelector("#detail-share-btn");
  if (shareBtn) {
    shareBtn.addEventListener("click", () => {
      shareContent({ title: entry.name, text: `${entry.name} — ${entry.desc}\n\nGefunden in der Keysglade-App.` });
    });
  }

  modal.classList.add("open");

  if (hasCoords) {
    requestAnimationFrame(() => initDetailMap("detail-mini-map", entry.lat, entry.lon, entry.name));
  }
}

document.addEventListener("click", (e) => {
  if (e.target.matches("[data-close-modal]") || e.target.classList.contains("modal-overlay")) {
    const overlay = e.target.closest(".modal-overlay") || e.target;
    overlay.classList.remove("open");
    if (overlay.id === "detail-modal") destroyDetailMap();
  }
});

/* ---------- Bookmarks / Merkliste ---------- */

function toggleBookmark(id) {
  if (bookmarks.has(id)) bookmarks.delete(id);
  else bookmarks.add(id);
  Storage.setBookmarks(bookmarks);
  updateBookmarkCount();
  renderCatalog();
  renderBookmarkDrawer();
}

function toggleVisited(id) {
  if (visited.has(id)) visited.delete(id);
  else visited.add(id);
  Storage.setVisited(visited);
  renderCatalog();
  updateVisitedStats();
}

function updateVisitedStats() {
  const el = document.getElementById("visited-stats");
  if (!el) return;
  const total = ENTRIES.filter((e) => e.lat && e.lon).length;
  el.textContent = `${visited.size} von ${total} Zielen besucht`;
  if (visited.size) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "visited-wow-btn";
    b.innerHTML = rwi("globe") + " Alle in WowarWahr eintragen";
    b.addEventListener("click", () => WowBridge.addWithFeedback(ENTRIES.filter((e) => visited.has(e.id))));
    el.appendChild(document.createElement("br"));
    el.appendChild(b);
  }
}

function updateBookmarkCount() {
  document.querySelectorAll(".bookmark-count").forEach((el) => (el.textContent = bookmarks.size));
}

function setupBookmarkDrawer() {
  document.getElementById("open-drawer-btn").addEventListener("click", () => {
    document.getElementById("bookmark-drawer").classList.add("open");
    document.getElementById("drawer-overlay").classList.add("open");
    renderBookmarkDrawer();
  });
  document.getElementById("close-drawer-btn").addEventListener("click", closeDrawer);
  document.getElementById("drawer-overlay").addEventListener("click", closeDrawer);
}

function closeDrawer() {
  document.getElementById("bookmark-drawer").classList.remove("open");
  document.getElementById("drawer-overlay").classList.remove("open");
}

function renderBookmarkDrawer() {
  const list = document.getElementById("bookmark-list");
  const entries = ENTRIES.filter((e) => bookmarks.has(e.id));
  if (entries.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${rwi("bookmark")}</div><p class="empty-state-text">Noch nichts gemerkt</p><p class="empty-state-hint">Tippe auf das Lesezeichen-Symbol bei einem Eintrag.</p></div>`;
    return;
  }
  const bookmarkNotes = Storage.getBookmarkNotes();
  list.innerHTML = entries.map((e) => `
    <div class="bookmark-item">
      <div class="bookmark-item-row">
        <div class="bookmark-item-info" data-id="${e.id}">
          <span>${e.icon}</span>
          <div>
            <div class="bookmark-item-name">${e.name}</div>
            <div class="bookmark-item-region">${e.region}</div>
          </div>
        </div>
        <button class="bookmark-remove" data-id="${e.id}" aria-label="Entfernen">${rwi("close")}</button>
      </div>
      <textarea class="bookmark-note-input" data-id="${e.id}" placeholder="Eigene Notiz (z. B. 'bei Sonnenuntergang')" rows="1">${escapeHtml(bookmarkNotes[e.id] || "")}</textarea>
    </div>
  `).join("");

  list.querySelectorAll(".bookmark-item-info").forEach((el) => {
    el.addEventListener("click", () => {
      const entry = ENTRIES.find((e) => e.id === el.dataset.id);
      closeDrawer();
      openDetail(entry);
    });
  });
  list.querySelectorAll(".bookmark-remove").forEach((btn) => {
    btn.addEventListener("click", () => toggleBookmark(btn.dataset.id));
  });
  list.querySelectorAll(".bookmark-note-input").forEach((textarea) => {
    textarea.addEventListener("click", (e) => e.stopPropagation());
    textarea.addEventListener("change", (e) => {
      const notes = Storage.getBookmarkNotes();
      const val = e.target.value.trim();
      if (val) notes[e.target.dataset.id] = val;
      else delete notes[e.target.dataset.id];
      Storage.setBookmarkNotes(notes);
    });
  });
}

/* ---------- Wetter-Seite ---------- */

function setupWeatherPage() {
  const select = document.getElementById("weather-city-select");
  select.innerHTML = WEATHER_CITIES.map((c) => `<option value="${c.name}">${c.name}</option>`).join("");
  const lastCity = Storage.getLastWeatherCity();
  select.value = lastCity;

  const container = document.getElementById("weather-container");
  loadWeatherFor(lastCity, container);

  select.addEventListener("change", () => {
    Storage.setLastWeatherCity(select.value);
    loadWeatherFor(select.value, container);
  });
}


/* ---------- Budget-Rechner ---------- */

function setupBudgetForm() {
  const form = document.getElementById("budget-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const result = calculateBudget({
      travelers: parseInt(document.getElementById("budget-travelers").value, 10) || 1,
      nights: parseInt(document.getElementById("budget-nights").value, 10) || 1,
      accommodation: document.getElementById("budget-accommodation").value,
      parkDays: parseInt(document.getElementById("budget-parkdays").value, 10) || 0,
      needsCar: document.getElementById("budget-car").checked,
    });
    renderBudgetResult(document.getElementById("budget-result"), result);
    Storage.setLastBudgetEstimate({ total: result.total });
    if (typeof renderExpenses === "function") renderExpenses();
  });
}

/* ---------- Redaktionelle Tipps ---------- */

let activeTipCategory = "all";

function setupEditorialTips() {
  const chipsEl = document.getElementById("tips-category-chips");
  const categories = [...new Set(EDITORIAL_TIPS.map((t) => t.cat))];

  if (chipsEl) {
    chipsEl.innerHTML = `<button class="chip active" data-tipcat="all">Alle</button>` +
      categories.map((c) => `<button class="chip" data-tipcat="${c}">${c}</button>`).join("");

    chipsEl.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        chipsEl.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        activeTipCategory = chip.dataset.tipcat;
        renderEditorialTips();
      });
    });
  }
  renderEditorialTips();
}

function renderEditorialTips() {
  const list = document.getElementById("editorial-tips-list");
  if (!list) return;
  const filtered = activeTipCategory === "all"
    ? EDITORIAL_TIPS
    : EDITORIAL_TIPS.filter((t) => t.cat === activeTipCategory);
  list.innerHTML = filtered.map((t) => `<li>${t.text}</li>`).join("");
}

/* ---------- Service Worker ---------- */

function registerServiceWorker() {
  // Der gemeinsame Service Worker wird zentral in wz-core.js angemeldet.
}
