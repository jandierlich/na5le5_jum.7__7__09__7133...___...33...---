/* =========================================================
   Keysglade — Storage
   Alle Daten bleiben ausschließlich lokal auf dem Gerät
   (localStorage). Es gibt keine Server-Übertragung.
========================================================= */

const Storage = {
  _get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn("Storage-Lesefehler", key, e);
      return fallback;
    }
  },
  _set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn("Storage-Schreibfehler", key, e);
    }
  },

  getBookmarks() {
    return new Set(this._get("fk_bookmarks", []));
  },
  setBookmarks(set) {
    this._set("fk_bookmarks", Array.from(set));
  },

  getPersonalNotes() {
    return this._get("fk_notes", []);
  },
  setPersonalNotes(notes) {
    this._set("fk_notes", notes);
  },

  getPackingState() {
    return this._get("fk_packing", {});
  },
  setPackingState(state) {
    this._set("fk_packing", state);
  },

  getLastWeatherCity() {
    return this._get("fk_weather_city", "Naples");
  },
  setLastWeatherCity(name) {
    this._set("fk_weather_city", name);
  },

  getLastTideStation() {
    return this._get("fk_tide_station", "Naples");
  },
  setLastTideStation(name) {
    this._set("fk_tide_station", name);
  },

  getItinerary() {
    return this._get("fk_itinerary", []);
  },
  setItinerary(days) {
    this._set("fk_itinerary", days);
  },

  getMotionPaused() {
    return this._get("fk_motion_paused", null);
  },
  setMotionPaused(paused) {
    this._set("fk_motion_paused", paused);
  },

  getVisited() {
    return new Set(this._get("fk_visited", []));
  },
  setVisited(set) {
    this._set("fk_visited", Array.from(set));
  },

  getTripDate() {
    return this._get("fk_trip_date", null);
  },
  setTripDate(dateStr) {
    this._set("fk_trip_date", dateStr);
  },

  getOnboardingSeen() {
    return this._get("fk_onboarding_seen", false);
  },
  setOnboardingSeen(seen) {
    this._set("fk_onboarding_seen", seen);
  },

  getExpenses() {
    return this._get("fk_expenses", []);
  },
  setExpenses(expenses) {
    this._set("fk_expenses", expenses);
  },

  getExpenseDisplayCurrency() {
    return this._get("fk_expense_currency", "USD");
  },
  setExpenseDisplayCurrency(currency) {
    this._set("fk_expense_currency", currency);
  },

  getLastBudgetEstimate() {
    return this._get("fk_last_budget", null);
  },
  setLastBudgetEstimate(estimate) {
    this._set("fk_last_budget", estimate);
  },

  getBookmarkNotes() {
    return this._get("fk_bookmark_notes", {});
  },
  setBookmarkNotes(notes) {
    this._set("fk_bookmark_notes", notes);
  },
};
