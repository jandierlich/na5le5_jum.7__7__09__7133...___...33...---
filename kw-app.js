"use strict";

/* ===================== Hilfsfunktionen ===================== */
function kwToRad(d){ return d*Math.PI/180; }
function kwToDeg(r){ return r*180/Math.PI; }
function kwNorm360(d){ d = d % 360; if (d < 0) d += 360; return d; }

function kwHaversine(lat1, lon1, lat2, lon2){
  const R = 6371000;
  const dLat = kwToRad(lat2-lat1);
  const dLon = kwToRad(lon2-lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(kwToRad(lat1))*Math.cos(kwToRad(lat2))*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function kwBearing(lat1, lon1, lat2, lon2){
  const y = Math.sin(kwToRad(lon2-lon1)) * Math.cos(kwToRad(lat2));
  const x = Math.cos(kwToRad(lat1))*Math.sin(kwToRad(lat2)) - Math.sin(kwToRad(lat1))*Math.cos(kwToRad(lat2))*Math.cos(kwToRad(lon2-lon1));
  return kwNorm360(kwToDeg(Math.atan2(y, x)));
}
function kwCompassLabel(deg){
  const dirs = ["N","NO","O","SO","S","SW","W","NW"];
  return dirs[Math.round(kwNorm360(deg)/45) % 8];
}
/* Öffnet ein Ziel per Karten-Link (maps.apple.com) – kein API-Key,
   keine Bibliothek nötig, funktioniert als Web-Link direkt in der Karten-App des Geräts. */
function kwMapsUrl(lat, lon, name){
  return `https://maps.apple.com/?daddr=${lat},${lon}&dirflg=w&q=${encodeURIComponent(name || "Ziel")}`;
}
function kwFormatDist(m){
  if (m < 1000) return Math.round(m) + " m";
  return (m/1000).toFixed(1).replace(".", ",") + " km";
}
/* HTML-Escaping für alle Namen, die aus OSM-Daten (Overpass) oder Nutzereingaben
   stammen und per innerHTML in die Seite eingefügt werden – verhindert, dass ein
   manipulierter Name (z.B. in OSM oder ein selbst eingegebener Wegpunktname) als
   Code im Browser ausgeführt wird. */
function kwEsc(s){ return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
/* Einmalige, statt bei jedem Klick wiederholte, Zustimmung pro externem Dienst –
   Bestätigung erscheint nur beim allerersten Aufruf, danach läuft die Funktion
   ohne Unterbrechung. Bei Ablehnung bleibt der Dienst gesperrt und der Hinweis
   kommt beim nächsten Versuch erneut. Details stehen zusätzlich dauerhaft in
   der Datenschutzerklärung. */
async function kwAskOnce(key, message){
  if (localStorage.getItem(key) === "1") return true;
  const zugestimmt = await wzConfirm(message + "\n\nDieser Hinweis erscheint nur einmal – die Angaben stehen dauerhaft in der Datenschutzerklärung.", {okLabel:"Zustimmen", cancelLabel:"Ablehnen"});
  if (zugestimmt) { localStorage.setItem(key, "1"); return true; }
  return false;
}

/* ===================== Astronomie (Näherungsformeln) ===================== */
function kwJulianDay(date){ return date.getTime()/86400000 + 2440587.5; }

function kwSunPosition(date, latDeg, lonDeg){
  const d = kwJulianDay(date) - 2451545.0;
  const L = kwNorm360(280.460 + 0.9856474*d);
  const g = kwNorm360(357.528 + 0.9856003*d);
  const lambda = kwNorm360(L + 1.915*Math.sin(kwToRad(g)) + 0.020*Math.sin(kwToRad(2*g)));
  const eps = 23.439 - 0.0000004*d;
  const RA = kwNorm360(kwToDeg(Math.atan2(Math.cos(kwToRad(eps))*Math.sin(kwToRad(lambda)), Math.cos(kwToRad(lambda)))));
  const dec = kwToDeg(Math.asin(Math.sin(kwToRad(eps))*Math.sin(kwToRad(lambda))));
  const GMST = kwNorm360(280.46061837 + 360.98564736629*d);
  const LST = kwNorm360(GMST + lonDeg);
  let H = kwNorm360(LST - RA); if (H > 180) H -= 360;
  const latR = kwToRad(latDeg), decR = kwToRad(dec), HR = kwToRad(H);
  const alt = kwToDeg(Math.asin(Math.sin(decR)*Math.sin(latR) + Math.cos(decR)*Math.cos(latR)*Math.cos(HR)));
  const az = kwNorm360(kwToDeg(Math.atan2(-Math.sin(HR), Math.tan(decR)*Math.cos(latR) - Math.sin(latR)*Math.cos(HR))));
  return { alt, az, lambda };
}

function kwMoonPosition(date, latDeg, lonDeg){
  const d = kwJulianDay(date) - 2451545.0;
  const Lm = kwNorm360(218.316 + 13.176396*d);
  const Mm = kwNorm360(134.963 + 13.064993*d);
  const F  = kwNorm360(93.272 + 13.229350*d);
  const lambda = kwNorm360(Lm + 6.289*Math.sin(kwToRad(Mm)));
  const beta = 5.128*Math.sin(kwToRad(F));
  const eps = 23.439 - 0.0000004*d;
  const lambdaR = kwToRad(lambda), betaR = kwToRad(beta), epsR = kwToRad(eps);
  const RA = kwNorm360(kwToDeg(Math.atan2(
    Math.sin(lambdaR)*Math.cos(epsR) - Math.tan(betaR)*Math.sin(epsR), Math.cos(lambdaR)
  )));
  const dec = kwToDeg(Math.asin(Math.sin(betaR)*Math.cos(epsR) + Math.cos(betaR)*Math.sin(epsR)*Math.sin(lambdaR)));
  const GMST = kwNorm360(280.46061837 + 360.98564736629*d);
  const LST = kwNorm360(GMST + lonDeg);
  let H = kwNorm360(LST - RA); if (H > 180) H -= 360;
  const latR = kwToRad(latDeg), decR = kwToRad(dec), HR = kwToRad(H);
  const alt = kwToDeg(Math.asin(Math.sin(decR)*Math.sin(latR) + Math.cos(decR)*Math.cos(latR)*Math.cos(HR)));
  const az = kwNorm360(kwToDeg(Math.atan2(-Math.sin(HR), Math.tan(decR)*Math.cos(latR) - Math.sin(latR)*Math.cos(HR))));
  return { alt, az, lambda };
}

function kwMoonPhaseInfo(date){
  const sun = kwSunPosition(date, 0, 0);
  const moon = kwMoonPosition(date, 0, 0);
  const elong = kwNorm360(moon.lambda - sun.lambda);
  const illum = (1 - Math.cos(kwToRad(elong))) / 2;
  let name;
  if (elong < 11.25 || elong >= 348.75) name = "Neumond";
  else if (elong < 78.75) name = "zunehmende Sichel";
  else if (elong < 101.25) name = "Erstes Viertel";
  else if (elong < 168.75) name = "zunehmender Mond";
  else if (elong < 191.25) name = "Vollmond";
  else if (elong < 258.75) name = "abnehmender Mond";
  else if (elong < 281.25) name = "Letztes Viertel";
  else name = "abnehmende Sichel";
  return { illum, name };
}

/* ===================== Planeten (Kepler-Bahnelemente, Näherungsformeln) =====================
   Klassische, frei verfügbare Näherungsformeln (nach P. Schlyter, "How to compute planetary
   positions") – Genauigkeit ca. 1 Bogenminute, für eine AR-Kompass-Anzeige mehr als ausreichend.
   Referenzepoche der Bahnelemente: 31.12.1999 0:00 UT (JD 2451543.5), daher eigener Tageszähler
   dOrbit getrennt von der Sternzeit-Berechnung (die weiterhin auf J2000.0 wie bei Sonne/Mond läuft). */
const KW_PLANET_ELEMENTS = {
  venus:   { N:[76.6799,2.46590e-5],  i:[3.3946,2.75e-8],   w:[54.8910,1.38374e-5],  a:0.723330, e:[0.006773,-1.302e-9], M:[48.0052,1.6021302244] },
  mars:    { N:[49.5574,2.11081e-5],  i:[1.8497,-1.78e-8],  w:[286.5016,2.92961e-5], a:1.523688, e:[0.093405,2.516e-9],  M:[18.6021,0.5240207766] },
  jupiter: { N:[100.4542,2.76854e-5], i:[1.3030,-1.557e-7], w:[273.8777,1.64505e-5], a:5.20256,  e:[0.048498,4.469e-9],  M:[19.8950,0.0830853001] },
  saturn:  { N:[113.6634,2.38980e-5], i:[2.4886,-1.081e-7], w:[339.3939,2.97661e-5], a:9.55475,  e:[0.055546,-9.499e-9], M:[316.9670,0.0334442282] },
};
const KW_SUN_ELEMENTS = { w:[282.9404,4.70935e-5], e:[0.016709,-1.151e-9], M:[356.0470,0.9856002585] };

function kwOrbitalValue(pair, d){ return pair[0] + pair[1]*d; }

/* Löst die Kepler-Gleichung M = E - e*sin(E) iterativ nach E auf (Newton-Verfahren). */
function kwSolveKepler(Mdeg, e){
  const M = kwToRad(kwNorm360(Mdeg));
  let E = M + e*Math.sin(M)*(1 + e*Math.cos(M));
  for (let n = 0; n < 6; n++){
    const dE = (E - e*Math.sin(E) - M) / (1 - e*Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-9) break;
  }
  return E;
}

/* Geozentrische Position der Sonne in der Ekliptik-Ebene (x,y in AE) – wird als Verschiebung
   gebraucht, um die heliozentrische Planetenposition in eine geozentrische umzurechnen. */
function kwSunXY(dOrbit){
  const e = kwOrbitalValue(KW_SUN_ELEMENTS.e, dOrbit);
  const M = kwOrbitalValue(KW_SUN_ELEMENTS.M, dOrbit);
  const w = kwOrbitalValue(KW_SUN_ELEMENTS.w, dOrbit);
  const E = kwSolveKepler(M, e);
  const xv = Math.cos(E) - e;
  const yv = Math.sqrt(1-e*e) * Math.sin(E);
  const v = kwToDeg(Math.atan2(yv, xv));
  const r = Math.sqrt(xv*xv + yv*yv);
  const lonSun = kwToRad(kwNorm360(v + w));
  return { x: r*Math.cos(lonSun), y: r*Math.sin(lonSun) };
}

function kwPlanetPosition(key, date, latDeg, lonDeg){
  const el = KW_PLANET_ELEMENTS[key];
  const dOrbit = kwJulianDay(date) - 2451543.5;
  const d = kwJulianDay(date) - 2451545.0; // wie bei Sonne/Mond, für Sternzeit/Schiefe der Ekliptik
  const N = kwOrbitalValue(el.N, dOrbit), i = kwOrbitalValue(el.i, dOrbit), w = kwOrbitalValue(el.w, dOrbit);
  const e = kwOrbitalValue(el.e, dOrbit), M = kwOrbitalValue(el.M, dOrbit);
  const E = kwSolveKepler(M, e);
  const xv = el.a*(Math.cos(E) - e);
  const yv = el.a*(Math.sqrt(1-e*e) * Math.sin(E));
  const v = kwToDeg(Math.atan2(yv, xv));
  const r = Math.sqrt(xv*xv + yv*yv);
  const NR = kwToRad(N), iR = kwToRad(i), vwR = kwToRad(v + w);
  const xh = r*(Math.cos(NR)*Math.cos(vwR) - Math.sin(NR)*Math.sin(vwR)*Math.cos(iR));
  const yh = r*(Math.sin(NR)*Math.cos(vwR) + Math.cos(NR)*Math.sin(vwR)*Math.cos(iR));
  const zh = r*(Math.sin(vwR)*Math.sin(iR));
  const sunXY = kwSunXY(dOrbit);
  const xg = xh + sunXY.x, yg = yh + sunXY.y, zg = zh;
  const eps = kwToRad(23.439 - 0.0000004*d);
  const xe = xg, ye = yg*Math.cos(eps) - zg*Math.sin(eps), ze = yg*Math.sin(eps) + zg*Math.cos(eps);
  const RA = kwNorm360(kwToDeg(Math.atan2(ye, xe)));
  const dec = kwToDeg(Math.atan2(ze, Math.sqrt(xe*xe+ye*ye)));
  const dist = Math.sqrt(xg*xg + yg*yg + zg*zg); // Erdabstand in AE
  const GMST = kwNorm360(280.46061837 + 360.98564736629*d);
  const LST = kwNorm360(GMST + lonDeg);
  let H = kwNorm360(LST - RA); if (H > 180) H -= 360;
  const latR = kwToRad(latDeg), decR = kwToRad(dec), HR = kwToRad(H);
  const alt = kwToDeg(Math.asin(Math.sin(decR)*Math.sin(latR) + Math.cos(decR)*Math.cos(latR)*Math.cos(HR)));
  const az = kwNorm360(kwToDeg(Math.atan2(-Math.sin(HR), Math.tan(decR)*Math.cos(latR) - Math.sin(latR)*Math.cos(HR))));
  return { alt, az, dist };
}

/* Polarstern: nahezu fixe Himmelsposition (J2000-Koordinaten), Eigenbewegung/Präzession
   über die Nutzungsdauer der App vernachlässigbar bei dieser Genauigkeitsklasse. */
function kwPolarisPosition(date, latDeg, lonDeg){
  const d = kwJulianDay(date) - 2451545.0;
  const RA = 37.9546, dec = 89.2641;
  const GMST = kwNorm360(280.46061837 + 360.98564736629*d);
  const LST = kwNorm360(GMST + lonDeg);
  let H = kwNorm360(LST - RA); if (H > 180) H -= 360;
  const latR = kwToRad(latDeg), decR = kwToRad(dec), HR = kwToRad(H);
  const alt = kwToDeg(Math.asin(Math.sin(decR)*Math.sin(latR) + Math.cos(decR)*Math.cos(latR)*Math.cos(HR)));
  const az = kwNorm360(kwToDeg(Math.atan2(-Math.sin(HR), Math.tan(decR)*Math.cos(latR) - Math.sin(latR)*Math.cos(HR))));
  return { alt, az };
}

const KW_SKY_OBJECTS = [
  { key: "venus",   label: "Venus",   icon: wzIcon("dot", "wzi-white") },
  { key: "mars",    label: "Mars",    icon: wzIcon("dot", "wzi-red") },
  { key: "jupiter", label: "Jupiter", icon: wzIcon("dot", "wzi-orange") },
  { key: "saturn",  label: "Saturn",  icon: wzIcon("planet") },
];

/* ===================== Zustand ===================== */
const kwState = {
  lat: null, lon: null, locationName: "Standort wird ermittelt …", locationMode: "auto",
  heading: null, headingMagnetic: null, headingAvailable: false, pitch: 0,
  declination: null,
  camOn: false, camStream: null,
  page: "kompass",
  pois: [], poisAll: [], poiTypesSelected: new Set(),
  poiRadius: 1500,
  waypoints: [],
  hud: null, hudFetchedAt: 0,
  clusteredPoiKeys: new Set(),
};

const KW_POI_RADII = [500, 1000, 1500, 3000, 5000];

/* Jede Kategorie wird über eine oder mehrere OSM-Kennzeichnungen gefunden ("sel": Schlüssel/Wert).
   Viele Orte sind in OpenStreetMap unterschiedlich erfasst (Bahnhof als "railway=station" oder
   "railway=halt", Pension statt Hotel, Straßenbahn- statt Bushaltestelle …) – deshalb mehrere. */
const KW_POI_TYPES = [
  { id: "viewpoint", label: "Aussichtspunkt", icon: "viewpoint", sel: [["tourism","viewpoint"]], group: "Natur & Ruhe" },
  { id: "park", label: "Park", icon: "tree", sel: [["leisure","park"]], extra: '["access"!="private"]', group: "Natur & Ruhe" },
  { id: "beach", label: "Strand/Badestelle", icon: "beach", sel: [["natural","beach"],["leisure","bathing_place"],["leisure","beach_resort"]], group: "Natur & Ruhe" },
  { id: "naturereserve", label: "Naturschutzgebiet", icon: "forest", sel: [["leisure","nature_reserve"]], group: "Natur & Ruhe" },
  { id: "orchard", label: "Streuobstwiese", icon: "orchard", sel: [["landuse","orchard"]], group: "Natur & Ruhe" },
  { id: "cafe", label: "Café", icon: "coffee", sel: [["amenity","cafe"]], group: "Essen & Trinken" },
  { id: "icecream", label: "Eisdiele", icon: "icecream", sel: [["amenity","ice_cream"],["shop","ice_cream"]], group: "Essen & Trinken" },
  { id: "restaurant", label: "Restaurant", icon: "restaurant", sel: [["amenity","restaurant"]], group: "Essen & Trinken" },
  { id: "fastfood", label: "Imbiss", icon: "restaurant", sel: [["amenity","fast_food"]], group: "Essen & Trinken" },
  { id: "bakery", label: "Bäckerei", icon: "bakery", sel: [["shop","bakery"],["shop","pastry"]], group: "Essen & Trinken" },
  { id: "supermarket", label: "Supermarkt", icon: "cart", sel: [["shop","supermarket"]], group: "Einkaufen" },
  { id: "pharmacy", label: "Apotheke", icon: "pill", sel: [["amenity","pharmacy"]], group: "Einkaufen" },
  { id: "bank", label: "Bank & Geldautomat", icon: "bank", sel: [["amenity","bank"],["amenity","atm"]], group: "Einkaufen" },
  { id: "marketplace", label: "Wochenmarkt", icon: "basket", sel: [["amenity","marketplace"]], group: "Einkaufen" },
  { id: "farmshop", label: "Hofladen", icon: "flower", sel: [["shop","farm"]], group: "Einkaufen" },
  { id: "fuel", label: "Tankstelle", icon: "fuel", sel: [["amenity","fuel"],["amenity","charging_station"]], group: "Mobilität" },
  { id: "parking", label: "Parkplatz", icon: "parking", sel: [["amenity","parking"]], extra: '["access"!~"^(private|no|customers)$"]', group: "Mobilität" },
  { id: "station", label: "Bahnhof", icon: "train", sel: [["railway","station"],["railway","halt"],["public_transport","station"]], group: "Mobilität" },
  { id: "transit", label: "Haltestelle", icon: "bus-stop", sel: [["highway","bus_stop"],["railway","tram_stop"],["amenity","bus_station"]], group: "Mobilität" },
  { id: "hospital", label: "Krankenhaus", icon: "hospital", sel: [["amenity","hospital"],["amenity","clinic"]], group: "Gesundheit" },
  { id: "attraction", label: "Sehenswürdigkeit", icon: "ferris-wheel", sel: [["tourism","attraction"],["historic","monument"],["historic","castle"]], group: "Freizeit & Kultur" },
  { id: "worship", label: "Kirche", icon: "church", sel: [["amenity","place_of_worship"]], group: "Freizeit & Kultur" },
  { id: "theatre", label: "Theater", icon: "masks", sel: [["amenity","theatre"]], group: "Freizeit & Kultur" },
  { id: "museum", label: "Museum", icon: "museum", sel: [["tourism","museum"]], group: "Freizeit & Kultur" },
  { id: "zoo", label: "Tierpark", icon: "zoo", sel: [["tourism","zoo"]], group: "Freizeit & Kultur" },
  { id: "themepark", label: "Freizeitpark", icon: "coaster", sel: [["tourism","theme_park"]], group: "Freizeit & Kultur" },
  { id: "hotel", label: "Hotel & Pension", icon: "hotel", sel: [["tourism","hotel"],["tourism","guest_house"],["tourism","motel"],["tourism","hostel"]], group: "Übernachtung" },
];
const KW_POI_GROUPS = ["Natur & Ruhe", "Essen & Trinken", "Einkaufen", "Mobilität", "Gesundheit", "Freizeit & Kultur", "Übernachtung"];
const KW_POI_TYPE_IDS = new Set(KW_POI_TYPES.map(t => t.id));
// Ortstyp-Auswahl wird jetzt lokal gemerkt (siehe kwLoadPoiTypes/kwSavePoiTypes) – beim allerersten
// App-Start (noch kein gespeicherter Wert) sind alle Themengebiete zunächst abgewählt.

/* ===================== Initialisierung ===================== */
document.addEventListener("DOMContentLoaded", () => {

  kwLoadDeclination();
  kwSetupDeclinationInput();

  kwLoadWaypoints();
  kwRenderWaypoints();
  kwLoadPoiTypes();
  kwRenderPoiFilters();
  const savedRadius = parseInt(localStorage.getItem("kw-poi-radius"), 10);
  if (KW_POI_RADII.includes(savedRadius)) kwState.poiRadius = savedRadius;
  kwRenderPoiRadius();

  kwSetupNav();
  kwSetupOnboarding();
  kwSetupLocationOverlay();
  kwSetupCompass();
  kwSetupCamera();
  kwSetupAR();

  document.getElementById("kw-poi-search").addEventListener("click", kwSearchPOIs);
  document.getElementById("kw-poi-reset").addEventListener("click", kwResetPoiFilters);
  document.getElementById("kw-wp-add").addEventListener("click", kwAddWaypoint);

  kwInitLocation();

});

/* Hell-/Dunkelmodus: zentral über wz-theme.js (Standard hell, Wahl gilt für alle Wahr-Apps) */

/* ===================== Onboarding ===================== */
function kwSetupOnboarding(){
  const onb = wzOnboarding({
    key: "kw-onboarding-seen",
    slides: [
      { icon: "compass", title: "Willkommen bei KompassWahr", text: "Ein Kompass mit Kamera-Übersicht und Informationen zu deinem Umfeld – ganz ohne Werbung, Konto oder Tracking." },
      { icon: "camera", title: "Kamera als Hintergrund", text: "Die Kamera zeigt nur ein Live-Bild als Hintergrund für die Richtungsanzeige. Es wird nichts fotografiert, gespeichert oder übertragen." },
      { icon: "pin", title: "Standort nötig", text: "Für Umfeld-Infos, Sonnen-/Mondstand und nahe Orte wird dein Standort abgefragt. Er wird nur lokal auf deinem Gerät gespeichert." },
      { icon: "pushpin", title: "Eigene Wegpunkte", text: "Merke dir Orte wie „Auto“ oder „Zeltplatz“ – der Kompass zeigt dir jederzeit Richtung und Entfernung dorthin, komplett offline." }
    ]
  });
  const again = document.getElementById("kw-show-onboarding");
  if (again) again.addEventListener("click", () => onb.show());
}

/* ===================== Navigation ===================== */
function kwSetupNav(){
  document.querySelectorAll(".kw-start-tile").forEach(btn => {
    btn.addEventListener("click", () => kwShowPage(btn.dataset.page));
  });
  const backBtn = document.getElementById("kw-back-btn");
  if (backBtn) backBtn.addEventListener("click", () => kwShowPage("start"));
}
function kwShowPage(name){
  kwState.page = name;
  document.querySelectorAll(".kw-page").forEach(p => p.classList.remove("kw-page-active"));
  document.getElementById("kw-page-" + name).classList.add("kw-page-active");
  const backBtn = document.getElementById("kw-back-btn");
  if (backBtn) backBtn.classList.toggle("kw-hidden", name === "start");
  document.body.classList.toggle("kw-fullpage", name === "kompass");
  document.body.classList.toggle("kw-on-start", name === "start");
  if (name === "umfeld") kwLoadUmfeld();
}

/* ===================== Standort ===================== */
function kwInitLocation(){
  const mode = localStorage.getItem("kw-location-mode") || "auto";
  kwState.locationMode = mode;
  if (mode === "manual") {
    try {
      const saved = JSON.parse(localStorage.getItem("kw-manual-location"));
      if (saved) { kwSetLocation(saved.lat, saved.lon, saved.name); return; }
    } catch (e) {}
  }
  kwRequestGPSLocation();
}
function kwRequestGPSLocation(attempt){
  attempt = attempt || 1;
  if (!navigator.geolocation) { kwSetLocationName("Standort nicht verfügbar"); return; }
  if (attempt === 1) kwSetLocationName("Standort wird ermittelt …");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      kwState.locationMode = "auto";
      localStorage.setItem("kw-location-mode", "auto");
      const status = document.getElementById("kw-compass-status");
      if (status) status.innerHTML = "";
      kwState.gpsAccuracy = pos.coords.accuracy;
      kwState.gpsAt = Date.now();
      kwSetLocation(pos.coords.latitude, pos.coords.longitude, null);
      kwReverseGeocode(pos.coords.latitude, pos.coords.longitude);
    },
    () => {
      // Die Ortung schlägt gelegentlich beim ersten Versuch fehl (z. B. GPS noch nicht
      // "warm") – bis zu zwei automatische Wiederholungen, dann Hinweis mit Retry-Button
      if (attempt < 3) {
        setTimeout(() => kwRequestGPSLocation(attempt + 1), 1200);
      } else {
        kwSetLocationName("Standort nicht verfügbar – bitte Zugriff erlauben");
        const status = document.getElementById("kw-compass-status");
        if (status) {
          status.innerHTML = "";
          const retryBtn = document.createElement("button");
          retryBtn.className = "kw-btn kw-btn-ghost";
          retryBtn.innerHTML = wzIcon("pin") + " Standort erneut versuchen";
          retryBtn.addEventListener("click", () => kwRequestGPSLocation(1));
          status.appendChild(retryBtn);
        }
      }
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
  );
}
function kwSetLocation(lat, lon, name){
  kwState.lat = lat; kwState.lon = lon;
  if (name) kwState.locationName = name;
  kwSetLocationName(kwState.locationName);
  if (kwState.page === "umfeld") kwLoadUmfeld();
  kwUpdateHudBottom();
}
function kwSetLocationName(name){
  kwState.locationName = name;
  document.getElementById("kw-location-name").textContent = name;
  kwRenderHudBottom();
}
async function kwReverseGeocode(lat, lon){
  if (!await kwAskOnce("kw-consent-geo-reverse", "Automatische Ortsnamen-Ermittlung nutzen? Dein aktueller Standort (Koordinaten) wird dafür bei jeder Standortbestimmung an die Ortssuche Photon von komoot (photon.komoot.io, komoot GmbH mit Sitz in Deutschland) gesendet, damit statt Koordinaten ein lesbarer Ortsname angezeigt werden kann.")) {
    kwSetLocationName("Standort ermittelt");
    return;
  }
  try {
    const data = await wzCore.geoReverse(lat, lon);
    const a = data.address || {};
    const ort = a.village || a.town || a.city || a.municipality || a.county || "";
    const teil = a.suburb || a.city_district || a.neighbourhood || "";
    const name = [teil, ort].filter(Boolean).join(", ") || data.display_name || "Standort";
    kwSetLocationName(name);
  } catch (e) {
    kwSetLocationName("Standort ermittelt");
  }
}

function kwSetupLocationOverlay(){
  const overlay = document.getElementById("kw-location-overlay");
  document.getElementById("kw-location-btn").addEventListener("click", () => overlay.classList.remove("kw-hidden"));
  document.getElementById("kw-location-close").addEventListener("click", () => overlay.classList.add("kw-hidden"));
  document.getElementById("kw-location-auto").addEventListener("click", () => {
    localStorage.removeItem("kw-manual-location");
    localStorage.setItem("kw-location-mode", "auto");
    kwSetLocationName("Standort wird ermittelt …");
    kwRequestGPSLocation();
    overlay.classList.add("kw-hidden");
  });

  function triggerSearch(){
    const q = document.getElementById("kw-location-search").value.trim();
    if (q.length < 3) { document.getElementById("kw-location-results").innerHTML = '<div class="kw-hint">Bitte mindestens 3 Zeichen eingeben</div>'; return; }
    kwSearchLocationText(q);
  }
  document.getElementById("kw-location-search-btn").addEventListener("click", triggerSearch);
  document.getElementById("kw-location-search").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); triggerSearch(); }
  });
}
async function kwSearchLocationText(q){
  const wrap = document.getElementById("kw-location-results");
  if (!await kwAskOnce("kw-consent-geo", "Externe Ortssuche nutzen? Der eingegebene Text wird dafür an die Ortssuche Photon von komoot (photon.komoot.io, komoot GmbH mit Sitz in Deutschland) gesendet.")) return;
  wrap.innerHTML = '<div class="kw-hint">Suche …</div>';
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    const list = await wzCore.geoSearch(q, 6, ctrl.signal);
    clearTimeout(timer);
    wrap.innerHTML = "";
    if (!list.length) { wrap.innerHTML = '<div class="kw-hint">Keine Treffer</div>'; return; }
    list.forEach(item => {
      const div = document.createElement("div");
      div.className = "kw-location-result";
      div.textContent = item.display_name;
      div.addEventListener("click", () => {
        const lat = parseFloat(item.lat), lon = parseFloat(item.lon);
        kwState.locationMode = "manual";
        localStorage.setItem("kw-location-mode", "manual");
        localStorage.setItem("kw-manual-location", JSON.stringify({ lat, lon, name: item.display_name.split(",").slice(0,2).join(",") }));
        kwSetLocation(lat, lon, item.display_name.split(",").slice(0,2).join(","));
        document.getElementById("kw-location-overlay").classList.add("kw-hidden");
      });
      wrap.appendChild(div);
    });
  } catch (e) {
    wrap.innerHTML = e.name === "AbortError" ? '<div class="kw-hint">Suche hat zu lange gedauert (Timeout) – bitte nochmal versuchen</div>' : '<div class="kw-hint">Suche nicht möglich</div>';
  }
}

/* ===================== Missweisung (Deklination) =====================
   Der Kompass des Handys liefert eine auf das Magnetfeld bezogene Richtung
   ("magnetisch Nord"), während Sonne/Mond/Orte hier astronomisch/geografisch
   berechnet werden ("geografisch Nord"). Der Unterschied (Missweisung) liegt
   in Deutschland aktuell bei wenigen Grad, ändert sich aber je nach Ort und
   über die Jahre langsam. Statt hier einen festen Wert zu raten, kann er
   einmalig eingetragen werden (z. B. über die NOAA-Seite nachgeschlagen) und
   wird danach lokal gespeichert und automatisch auf die Kompassanzeige
   angewendet. Ohne Eingabe bleibt die Anzeige unverändert (Missweisung 0°). */
function kwLoadDeclination(){
  const raw = localStorage.getItem("kw-declination");
  const val = raw !== null ? parseFloat(raw) : NaN;
  kwState.declination = isNaN(val) ? null : val;
  const input = document.getElementById("kw-decl-input");
  const status = document.getElementById("kw-decl-status");
  if (kwState.declination !== null) {
    if (input) input.value = kwState.declination;
    if (status) status.textContent = `Aktiv: ${kwState.declination > 0 ? "+" : ""}${kwState.declination}° werden auf die Kompassrichtung angerechnet.`;
  }
}
function kwSetupDeclinationInput(){
  const input = document.getElementById("kw-decl-input");
  const status = document.getElementById("kw-decl-status");
  document.getElementById("kw-decl-save").addEventListener("click", () => {
    const raw = input.value.trim();
    if (raw === "") {
      kwState.declination = null;
      localStorage.removeItem("kw-declination");
      status.textContent = "Zurückgesetzt – keine Korrektur.";
      return;
    }
    const val = parseFloat(raw.replace(",", "."));
    if (isNaN(val) || val < -30 || val > 30) {
      status.textContent = "Bitte eine Zahl zwischen -30 und 30 eingeben.";
      return;
    }
    kwState.declination = val;
    localStorage.setItem("kw-declination", String(val));
    status.textContent = `Gespeichert: ${val > 0 ? "+" : ""}${val}° werden ab jetzt angerechnet.`;
  });
}

/* ===================== Kompass ===================== */
function kwSetupCompass(){
  const enableBtn = document.getElementById("kw-compass-enable");
  const status = document.getElementById("kw-compass-status");

  function start(){
    const handler = (e) => kwHandleOrientation(e);
    window.addEventListener("deviceorientationabsolute", handler, true);
    // Fallback nur verwenden, wenn nach kurzer Wartezeit kein absolutes Signal ankam
    let gotAbsolute = false;
    const markAbsolute = () => { gotAbsolute = true; };
    window.addEventListener("deviceorientationabsolute", markAbsolute, { once: true });
    setTimeout(() => {
      if (!gotAbsolute) window.addEventListener("deviceorientation", handler, true);
    }, 800);
    status.textContent = "";
  }

  if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
    // das System: Berechtigung nötig, per Button anstoßen
    enableBtn.classList.remove("kw-hidden");
    status.textContent = "Kompass benötigt deine Erlaubnis";
    enableBtn.addEventListener("click", () => {
      DeviceOrientationEvent.requestPermission().then(res => {
        if (res === "granted") { enableBtn.classList.add("kw-hidden"); start(); }
        else { status.textContent = "Kompasszugriff wurde nicht erlaubt"; }
      }).catch(() => { status.textContent = "Kompasszugriff nicht möglich"; });
    });
  } else if (window.DeviceOrientationEvent) {
    start();
  } else {
    status.textContent = "Dieses Gerät unterstützt keinen Kompass";
  }
}

/* Ruhige Kompassrichtung: Der Magnetkompass rauscht um mehrere Grad, die Drehsensoren (Gyroskop) sind
   dagegen ruhig, kennen aber Norden nicht. Deshalb trägt das Gyroskop die Bewegung, und der Kompass
   liefert nur den Versatz dazu – stark geglättet, bei großer Abweichung schnell nachgeführt.
   Im Ruhezustand ergibt sich exakt dieselbe Richtung wie zuvor, nur ohne Zittern. */
function kwMakeYawOffset(){
  var cur = null, fast = 0, last = 0;
  var w = function(d){ return ((d + 540) % 360) - 180; };
  return function(target, now){
    if (cur === null || !(now - last < 1000)) { cur = fast = target; last = now; return cur; }
    var dt = Math.max(0, now - last); last = now;
    // 1. Stufe: Kompassrauschen herausmitteln (ca. 0,25 s)
    fast = (fast + w(target - fast) * (1 - Math.exp(-dt / 250)) + 360) % 360;
    // 2. Stufe: dem beruhigten Wert nachführen – je größer die bleibende Abweichung, desto schneller
    var bias = w(fast - cur), a = Math.abs(bias);
    var tau = a > 20 ? 100 : a > 6 ? 300 : a > 2.5 ? 700 : 2000;
    cur = (cur + bias * (1 - Math.exp(-dt / tau)) + 360) % 360;
    return cur;
  };
}
const kwYawOffset = kwMakeYawOffset();
/* Richtung des Geräts allein aus den Drehsensoren (ohne Nordbezug): die Himmelsrichtung, in die die
   Rückkamera blickt – aus der vollen Drehung berechnet, damit sie auch im Bereich „genau senkrecht“
   stabil bleibt (W3C-Konvention R = Rz(α)·Rx(β)·Ry(γ)). Zeigt die Kamera steil nach oben oder unten,
   übernimmt die Oberkante des Geräts (nach oben: deren Gegenrichtung) – das ist dieselbe Richtung,
   nur numerisch stabil, und springt beim Übergang nicht. */
function kwGyroHeading(alpha, beta, gamma){
  const r = Math.PI / 180, cA = Math.cos(alpha*r), sA = Math.sin(alpha*r), cB = Math.cos(beta*r), sB = Math.sin(beta*r), cG = Math.cos(gamma*r), sG = Math.sin(gamma*r);
  const fx = -(cA*sG + sA*sB*cG), fy = -(sA*sG - cA*sB*cG), fz = -cB*cG;   // Rückkamera
  const tx = -sA*cB, ty = cA*cB;                                            // Oberkante
  if (Math.abs(fz) < 0.9) return kwNorm360(Math.atan2(fx, fy) / r);
  return fz > 0 ? kwNorm360(Math.atan2(-tx, -ty) / r) : kwNorm360(Math.atan2(tx, ty) / r);
}
/* Bezugsrichtung für den Abgleich mit dem Smartphone-Kompass – dieselbe Regel wie im Sternenhimmel und
   im Himmels-Kompass von HimmelsWahr: Gerät eher aufrecht → Blickrichtung der Rückkamera,
   sonst → Oberkante des Geräts. Daraus entsteht nur der (geglättete) Versatz; angezeigt wird weiterhin
   die stetige Kamerarichtung aus kwGyroHeading. */
function kwRefHeading(alpha, beta, gamma){
  const r = Math.PI / 180, cA = Math.cos(alpha*r), sA = Math.sin(alpha*r), cB = Math.cos(beta*r), sB = Math.sin(beta*r), cG = Math.cos(gamma*r), sG = Math.sin(gamma*r);
  const fx = -(cA*sG + sA*sB*cG), fy = -(sA*sG - cA*sB*cG), fz = -cB*cG;
  if (Math.abs(fz) < 0.7) return kwNorm360(Math.atan2(fx, fy) / r);
  return kwNorm360(Math.atan2(-sA*cB, cA*cB) / r);
}
function kwHandleOrientation(e){
  let heading = null;
  if (typeof e.webkitCompassHeading === "number") {
    heading = e.webkitCompassHeading; // das System: bereits 0=Nord, im Uhrzeigersinn, kalibriert
    if (typeof e.alpha === "number" && typeof e.beta === "number" && !isNaN(e.alpha)) {
      const g = kwGyroHeading(e.alpha, e.beta, e.gamma || 0);
      const h0 = kwRefHeading(e.alpha, e.beta, e.gamma || 0);
      heading = kwNorm360(g + kwYawOffset(kwNorm360(heading - h0), performance.now()));
    }
  } else if (typeof e.alpha === "number" && (e.absolute === true || e.type === "deviceorientationabsolute")) {
    heading = kwNorm360(360 - e.alpha); // echte, nordbezogene Ausrichtung
  } else if (typeof e.alpha === "number") {
    heading = kwNorm360(360 - e.alpha); // Notlösung ohne garantierten Nordbezug
    document.getElementById("kw-compass-status").textContent = "Kompass evtl. ungenau (Gerät liefert keine kalibrierte Nordrichtung)";
  }
  // Vor-/Rückneigung (Pitch) des Geräts: beta ≈ 90° wenn das Handy senkrecht/aufrecht
  // gehalten wird (Kamera zeigt zum Horizont). Abweichung davon = Blickwinkel nach oben/unten.
  if (typeof e.beta === "number") {
    kwState.pitch = e.beta - 90;
  }
  if (heading === null || isNaN(heading)) return;
  kwState.headingMagnetic = heading;
  // Missweisung: dreht magnetisch Nord auf geografisch Nord, damit die
  // astronomisch berechneten Sonne-/Mond-/Ortsrichtungen zur Kompassnadel passen.
  heading = kwNorm360(heading + (kwState.declination || 0));
  kwState.heading = heading;
  kwState.headingAvailable = true;

  document.getElementById("kw-heading-deg").textContent = Math.round(heading) + "°";
  document.getElementById("kw-heading-card").textContent = kwCompassLabel(heading);

  // Peilstreifen, Marken und Radarnadel werden bei jedem Bild weich nachgeführt (kwARFrame),
  // hier nur noch der gedrosselte Neuaufbau, welche Marken überhaupt im Bild sind.
  // AR-Overlay bewusst gedrosselt neu aufbauen (statt bei jedem Sensor-Update,
  // das auf manchen Geräten 30-60×/s feuert) – reduziert unnötiges DOM-Rebuilding
  // und damit auch das Risiko, dass ein Tap genau in einen Neuaufbau fällt.
  const nowMs = performance.now();
  if (!kwState.lastARUpdate || nowMs - kwState.lastARUpdate > 100) {
    kwState.lastARUpdate = nowMs;
    kwUpdateAR(heading);
  }
}


/* ===================== Kamera ===================== */
function kwSetupCamera(){
  document.getElementById("kw-cam-enable").addEventListener("click", kwEnableCamera);
}
async function kwEnableCamera(){
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    kwState.camStream = stream;
    kwState.camOn = true;
    const video = document.getElementById("kw-cam-video");
    video.srcObject = stream;
    document.getElementById("kw-cam-off").classList.add("kw-hidden");
  } catch (e) {
    document.getElementById("kw-cam-off").querySelector("p").textContent = "Kamera nicht verfügbar oder Zugriff verweigert.";
  }
}
function kwDisableCamera(){
  if (kwState.camStream) kwState.camStream.getTracks().forEach(t => t.stop());
  kwState.camStream = null;
  kwState.camOn = false;
  document.getElementById("kw-cam-off").classList.remove("kw-hidden");
}

/* ===================== AR-Overlay ===================== */
const KW_AR_FOV = 70;   // angenommenes horizontales Sichtfeld in Grad für Ziel-Pins
const KW_AR_VFOV = 85;  // angenommenes vertikales Sichtfeld in Grad (Hochformat)
const KW_TAPE_FOV = 100; // Sichtfeld des oberen Peilstreifens in Grad

function kwUpdateHeadingTape(heading){
  const tape = document.getElementById("kw-heading-tape");
  tape.innerHTML = "";
  const cardinals = { 0: "N", 45: "NO", 90: "O", 135: "SO", 180: "S", 225: "SW", 270: "W", 315: "NW" };
  for (let deg = 0; deg < 360; deg += 15) {
    let rel = deg - heading;
    rel = ((rel + 180) % 360 + 360) % 360 - 180;
    if (Math.abs(rel) > KW_TAPE_FOV/2) continue;
    const leftPct = 50 + (rel / KW_TAPE_FOV) * 100;
    const el = document.createElement("div");
    const isCardinal = cardinals[deg] !== undefined;
    el.className = "kw-heading-tick" + (deg % 45 === 0 ? " kw-heading-tick-major" : "") + (isCardinal ? " kw-heading-tick-cardinal" : "");
    el.style.left = leftPct + "%";
    el.textContent = isCardinal ? cardinals[deg] : (deg % 45 === 0 ? String(deg) : "");
    tape.appendChild(el);
  }
}

/* Ein einziger, dauerhafter Klick-Listener auf dem AR-Layer selbst (per Event-
   Delegation): kwUpdateAR() leert und befüllt den Layer bei jedem Sensor-Update
   neu, ein Listener direkt an einer Sammel-Marke würde also sofort wieder
   verschwinden, bevor ein Tap überhaupt ankommt. */
function kwSetupAR(){
  const layer = document.getElementById("kw-ar-layer");
  if (!layer) return;
  // pointerup statt click: reagiert direkt auf den Touch und ist robuster,
  // wenn das Element unter dem Finger durch ein Sensor-Update kurz zuvor
  // neu aufgebaut wurde (das kann den synthetischen "click" auf manchen Geräten kosten).
  layer.addEventListener("pointerup", (e) => {
    const cluster = e.target.closest(".kw-ar-mark-cluster");
    if (cluster && cluster._items) { e.stopPropagation(); kwOpenARPop(cluster._items); }
  });
  // Antippen irgendwo anders im Kamerabild schließt die Übersicht wieder
  const wrap = layer.parentElement;
  if (wrap) wrap.addEventListener("pointerup", (e) => {
    const pop = document.getElementById("kw-ar-pop");
    if (!pop || pop.hidden) return;
    if (e.target.closest("#kw-ar-pop") && !e.target.closest(".kw-ar-pop-close")) return;
    if (e.target.closest(".kw-ar-mark-cluster")) return;
    pop.hidden = true;
  });
  requestAnimationFrame(kwARFrame);
}

/* Übersicht einer Sammel-Marke direkt im Kamerabild: jedes Ziel mit Entfernung und Richtung.
   Der Blick in die Kamera bleibt erhalten (früher wechselte die App auf die Listen-Seite). */
function kwOpenARPop(items){
  const pop = document.getElementById("kw-ar-pop");
  if (!pop) return;
  const rows = items.slice().sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0)).map(m => {
    const name = m.name || m.label.split(" · ")[0];
    const meta = (typeof m.dist === "number" ? kwFormatDist(m.dist) + " · " : "") + kwCompassLabel(m.az);
    return `<li><span class="kw-ar-pop-ic">${m.icon}</span><span class="kw-ar-pop-name">${kwEsc(name)}</span><span class="kw-ar-pop-meta">${kwEsc(meta)}</span></li>`;
  }).join("");
  pop.innerHTML = `<div class="kw-ar-pop-head"><b>${items.length} Ziele in dieser Richtung</b>`
    + `<button type="button" class="kw-ar-pop-close" aria-label="Schließen"><svg class="wzi" aria-hidden="true"><use href="#wzi-close"></use></svg></button></div>`
    + `<ul>${rows}</ul>`;
  pop.hidden = false;
}

/* Weiches Gleiten: Blickrichtung und Neigung werden zeitbasiert geglättet (ca. 60 ms, wie im
   Sternenhimmel) und Marken, Peilstreifen und Radarnadel bei jedem Bild (60/120 Hz) neu
   positioniert. Der Neuaufbau der Marken (kwUpdateAR) läuft weiterhin nur alle 100 ms. */
const KW_GLIDE_MS = 60;
function kwARFrame(now){
  requestAnimationFrame(kwARFrame);
  if (!kwState.headingAvailable) return;
  const dt = Math.min(200, Math.max(0, now - (kwState.glideT || now)));
  kwState.glideT = now;
  const k = 1 - Math.exp(-dt / KW_GLIDE_MS);
  const tH = kwState.heading, tP = kwState.pitch || 0;
  if (typeof kwState.dispHeading !== "number") { kwState.dispHeading = tH; kwState.dispPitch = tP; kwState.glideDirty = true; }
  const dH = ((tH - kwState.dispHeading + 540) % 360) - 180, dP = tP - kwState.dispPitch;
  if (Math.abs(dH) > 0.01 || Math.abs(dP) > 0.01) {
    kwState.dispHeading = kwNorm360(kwState.dispHeading + dH * k);
    kwState.dispPitch += dP * k;
    kwState.glideDirty = true;
  }
  if (!kwState.glideDirty) return;
  kwState.glideDirty = false;
  kwUpdateHeadingTape(kwState.dispHeading);
  const needle = document.getElementById("kw-mini-radar-needle");
  if (needle) needle.style.transform = `translate(-50%, -100%) rotate(${kwState.dispHeading}deg)`;
  kwPlaceARMarks();
}
/* Setzt die beim letzten Neuaufbau erzeugten Marken an die Stelle, die zur geglätteten
   Blickrichtung passt. Marken knapp außerhalb des Bildes gleiten so hinein statt aufzuploppen. */
function kwPlaceARMarks(){
  const list = kwState.arEls || [];
  const h = typeof kwState.dispHeading === "number" ? kwState.dispHeading : (kwState.heading || 0);
  const p = typeof kwState.dispPitch === "number" ? kwState.dispPitch : (kwState.pitch || 0);
  list.forEach(o => {
    const relH = ((o.az - h + 540) % 360) - 180, relV = o.alt - p;
    const show = Math.abs(relH) <= KW_AR_FOV/2 + 8 && Math.abs(relV) <= KW_AR_VFOV/2 + 8;
    o.el.style.display = show ? "" : "none";
    if (!show) return;
    o.el.style.left = (50 + (relH / KW_AR_FOV) * 100) + "%";
    o.el.style.top = (50 - (relV / KW_AR_VFOV) * 100) + "%";
  });
}

function kwUpdateAR(heading){
  // geglättete Richtung nutzen, damit Neuaufbau und Bild-für-Bild-Nachführung zusammenpassen
  if (typeof kwState.dispHeading === "number") heading = kwState.dispHeading;
  const layer = document.getElementById("kw-ar-layer");
  layer.innerHTML = "";
  kwState.arEls = [];
  const marks = [];

  if (kwState.lat !== null) {
    const now = new Date();
    const sun = kwSunPosition(now, kwState.lat, kwState.lon);
    if (sun.alt > -6) marks.push({ az: sun.az, alt: sun.alt, label: "Sonne", icon: wzIcon("sun"), kind: "kw-ar-sky" });
    const moon = kwMoonPosition(now, kwState.lat, kwState.lon);
    if (moon.alt > -6) {
      // Mondphase gleich mit anzeigen – kurz vor/nach Neumond steht der Mond dicht bei der Sonne
      // und ist dann am Himmel praktisch nicht zu sehen.
      const ph = kwMoonPhaseInfo(now);
      const moonLabel = ph.illum < 0.03 ? "Mond · Neumond, kaum sichtbar" : `Mond · ${ph.name}`;
      marks.push({ az: moon.az, alt: moon.alt, label: moonLabel, icon: wzIcon("moon"), kind: "kw-ar-sky" });
    }
    KW_SKY_OBJECTS.forEach(obj => {
      const p = kwPlanetPosition(obj.key, now, kwState.lat, kwState.lon);
      if (p.alt > 0) marks.push({ az: p.az, alt: p.alt, label: obj.label, icon: obj.icon, kind: "kw-ar-sky" });
    });
    const polaris = kwPolarisPosition(now, kwState.lat, kwState.lon);
    if (polaris.alt > 0) marks.push({ az: polaris.az, alt: polaris.alt, label: "Polarstern", icon: wzIcon("star-filled"), kind: "kw-ar-sky" });

    // Wegpunkte und Orte liegen auf Bodenhöhe (keine Höhendaten verfügbar). Eine physikalisch
    // exakte Herleitung aus Augenhöhe/Entfernung ergäbe bei üblichen Distanzen (50–1500 m) nur
    // Bruchteile eines Grades – bei ~85° Sichtfeld optisch nicht wahrnehmbar. Stattdessen eine
    // bewusst verstärkte, nicht-physikalische Staffelung: nahe Marken unten im Bild, weit
    // entfernte nahe der Horizontlinie – Wurzelkurve, damit sich auch nahe Orte untereinander
    // noch sichtbar unterscheiden statt nur ganz am Bildrand.
    const KW_GROUND_ALT_NEAR = -34; // Grad, direkt am Nutzer (unterer Bildbereich)
    const KW_GROUND_ALT_FAR = -3;   // Grad, am Rand des Suchradius (nah der Horizontlinie)
    const kwGroundAlt = (dist) => {
      const maxDist = kwState.poiRadius || 1500;
      const t = Math.sqrt(Math.min(1, dist / maxDist));
      return KW_GROUND_ALT_NEAR + t * (KW_GROUND_ALT_FAR - KW_GROUND_ALT_NEAR);
    };

    kwState.waypoints.forEach(wp => {
      const az = kwBearing(kwState.lat, kwState.lon, wp.lat, wp.lon);
      const dist = kwHaversine(kwState.lat, kwState.lon, wp.lat, wp.lon);
      marks.push({ az, alt: kwGroundAlt(dist), dist, label: `${wp.name} · ${kwFormatDist(dist)}`, name: wp.name, icon: wzIcon("pushpin"), kind: "kw-ar-waypoint" });
    });

    // Nur die nächsten 10 Orte ins Bild projizieren – mehr wäre im Kamerabild ohnehin
    // nicht mehr sinnvoll lesbar, kwState.pois ist bereits nach Distanz sortiert.
    kwState.pois.slice(0, 10).forEach(p => {
      marks.push({ az: p.az, alt: kwGroundAlt(p.dist), dist: p.dist, label: `${p.name} · ${kwFormatDist(p.dist)}`, name: p.name, icon: wzIcon("pin"), kind: "kw-ar-poi", lat: p.lat, lon: p.lon });
    });
  }

  // Mini-Radar (360°-Übersicht, unabhängig vom aktuell sichtbaren Kamera-Ausschnitt)
  // separat aktualisieren – nutzt dieselben Boden-Marken, aber ungefiltert nach Sichtfeld.
  kwUpdateMiniRadar(heading, marks.filter(m => m.kind !== "kw-ar-sky"));

  const pitch = typeof kwState.dispPitch === "number" ? kwState.dispPitch : (kwState.pitch || 0);
  const maxDist = kwState.poiRadius || 1500;

  // Schritt 1: alle Marken, die im Sichtfeld liegen, auf Bildschirmposition projizieren
  const projected = [];
  marks.forEach(m => {
    let relH = m.az - heading;
    relH = ((relH + 180) % 360 + 360) % 360 - 180;
    // etwas Rand über das Sichtfeld hinaus mitnehmen, damit Marken beim Schwenken hineingleiten
    if (Math.abs(relH) > KW_AR_FOV/2 + 8) return;
    const relV = m.alt - pitch;
    if (Math.abs(relV) > KW_AR_VFOV/2 + 8) return;
    const leftPct = 50 + (relH / KW_AR_FOV) * 100;
    const topPct = 50 - (relV / KW_AR_VFOV) * 100;
    const inView = Math.abs(relH) <= KW_AR_FOV/2 && Math.abs(relV) <= KW_AR_VFOV/2;
    projected.push({ ...m, leftPct, topPct, inView });
  });

  // Schritt 2: nahe beieinanderliegende Marken der gleichen Art (Himmel/Wegpunkt/Ort)
  // zu einer Sammel-Marke gruppieren, statt sie unlesbar übereinanderzulegen.
  // Sortierung nach Entfernung (bzw. Himmelsobjekte zuerst), damit die jeweils
  // nächstgelegene Marke die "Ankerposition" der Gruppe bestimmt.
  projected.sort((a, b) => (a.dist ?? -1) - (b.dist ?? -1));
  // Schwellwert für die Gruppierung: getrennt für horizontal/vertikal, da die
  // Marken als Textpille breit, aber flach sind – zwei Mittelpunkte können sich
  // schon deutlich mehr als eine kleine, kreisförmige Distanz unterscheiden und
  // trotzdem als Pillen sichtbar überlappen (Namenslänge variiert stark).
  const KW_CLUSTER_H_PCT = 17; // horizontal, in % der Bildbreite
  const KW_CLUSTER_V_PCT = 7;  // vertikal, in % der Bildhöhe
  const groups = [];
  projected.forEach(m => {
    const group = groups.find(g =>
      g.kind === m.kind &&
      // Himmelsobjekte (Sonne, Mond, Planeten, Polarstern) werden nie zusammengefasst –
      // es sind nur wenige, und jedes hat eine echte, eigene Position am Himmel.
      m.kind !== "kw-ar-sky" &&
      Math.abs(g.leftPct - m.leftPct) < KW_CLUSTER_H_PCT &&
      Math.abs(g.topPct - m.topPct) < KW_CLUSTER_V_PCT
    );
    if (group) group.items.push(m);
    else groups.push({ kind: m.kind, leftPct: m.leftPct, topPct: m.topPct, items: [m] });
  });

  // Erst ab 4 nahen Marken einer Art wird zusammengefasst. Bei 2–3 bleibt jede Marke an ihrer
  // echten Position und ist einzeln lesbar – nur die Beschriftungen werden versetzt (s. u.).
  const KW_CLUSTER_MIN = 4;
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g.items.length > 1 && g.items.length < KW_CLUSTER_MIN) {
      groups.splice(i, 1, ...g.items.map(m => ({ kind: m.kind, leftPct: m.leftPct, topPct: m.topPct, items: [m] })));
    }
  }
  // Liegen Marken dicht beieinander (z. B. Sonne und Mond um Neumond oder zwei nahe Orte), bleibt
  // jede an ihrer echten Position; die Beschriftungen werden abwechselnd nach unten/oben versetzt,
  // damit sie sich nicht überdecken.
  const KW_LABEL_STEP_PX = 48;
  const layerH = layer.clientHeight || 600, layerW = layer.clientWidth || 360;
  const labelShift = new Map();
  const placed = []; // { x, y } angezeigte Mittelpunkte in Pixeln
  groups.forEach(g => {
    const x = g.leftPct / 100 * layerW, y = g.topPct / 100 * layerH;
    const free = dy => !placed.some(o => Math.abs(o.x - x) < KW_CLUSTER_H_PCT / 100 * layerW && Math.abs(o.y - (y + dy)) < KW_LABEL_STEP_PX);
    // erste freie Stelle suchen: an Ort und Stelle, sonst abwechselnd darunter/darüber
    let dy = 0;
    for (let k = 1; !free(dy) && k <= 8; k++) dy = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * KW_LABEL_STEP_PX / 2;
    if (dy) labelShift.set(g, dy);
    placed.push({ x, y: y + dy });
  });

  groups.forEach(g => {
    const anchor = g.items[0];
    const el = document.createElement("div");
    el.style.left = g.leftPct + "%";
    el.style.top = g.topPct + "%";
    const shiftPx = labelShift.get(g) || 0;
    if (shiftPx) el.style.transform = `translate(-50%, calc(-50% + ${shiftPx}px))`;

    if (g.items.length === 1) {
      el.className = "kw-ar-mark " + (g.kind || "");
      if (typeof anchor.dist === "number") {
        const t = Math.min(1, anchor.dist / maxDist);
        el.style.transform = `translate(-50%, calc(-50% + ${shiftPx}px)) scale(${(1.1 - t*0.4).toFixed(2)})`;
        el.style.opacity = (1 - t*0.5).toFixed(2);
      }
      el.innerHTML = `<span class="kw-ar-dot">${anchor.icon}</span>${kwEsc(anchor.label)}`;
    } else {
      // Sammel-Marke: zeigt Anzahl + die nächsten zwei Namen. Tap-Ziel wird nur als
      // data-Attribut hinterlegt – der eigentliche Klick wird zentral per Event-Delegation
      // auf dem (nie neu erzeugten) Layer-Element abgefangen, siehe kwSetupAR().
      el.className = "kw-ar-mark kw-ar-mark-cluster " + (g.kind || "");
      const names = g.items.slice(0, 2).map(m => m.name || m.label.split(" · ")[0]).join(", ");
      const more = g.items.length > 2 ? ` +${g.items.length - 2}` : "";
      el.innerHTML = `<span class="kw-ar-dot">${anchor.icon}</span>${g.items.length} Ziele: ${kwEsc(names)}${kwEsc(more)}`;
      // Ziele direkt am Element merken – beim Antippen öffnet sich die Übersicht im Kamerabild
      el._items = g.items;
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", `${g.items.length} Ziele anzeigen`);
    }
    layer.appendChild(el);
    kwState.arEls.push({ el, az: anchor.az, alt: anchor.alt });
  });
  kwPlaceARMarks();

  // Merken, welche Orte gerade im Sichtfeld liegen (Kompass zeigt in ihre Richtung),
  // damit die Orte-Übersicht sie farblich kennzeichnen kann – unabhängig davon, ob sie
  // im AR-Bild einzeln stehen oder mit anderen zu einer Sammel-Marke gruppiert wurden.
  kwState.clusteredPoiKeys = new Set();
  projected.forEach(m => {
    if (m.inView && m.kind === "kw-ar-poi" && typeof m.lat === "number") {
      kwState.clusteredPoiKeys.add(m.lat.toFixed(5) + "," + m.lon.toFixed(5));
    }
  });
  kwHighlightClusteredPois();
}

/* Kleines, "nordoben" ausgerichtetes Mini-Radar am Bildrand: zeigt Wegpunkte und Orte
   über den vollen 360°-Kreis (nicht nur den schmalen Kamera-Ausschnitt), damit auch
   erkennbar ist, was gerade außerhalb des Blickfelds bzw. hinter einem liegt. Die rote
   Nadel dreht sich mit der aktuellen Blickrichtung, Norden bleibt dabei immer oben fix. */
function kwUpdateMiniRadar(heading, groundMarks){
  // Radarnadel wird in kwARFrame() bei jedem Bild weich nachgeführt
  const dotsWrap = document.getElementById("kw-mini-radar-dots");
  if (!dotsWrap) return;
  dotsWrap.innerHTML = "";
  if (kwState.lat === null) return;

  const maxDist = kwState.poiRadius || 1500;
  const KW_RADAR_MIN_PCT = 14, KW_RADAR_MAX_PCT = 40;
  groundMarks.forEach(m => {
    const t = Math.min(1, (m.dist || 0) / maxDist);
    const r = KW_RADAR_MIN_PCT + t * (KW_RADAR_MAX_PCT - KW_RADAR_MIN_PCT);
    const angleRad = kwToRad(m.az);
    const dot = document.createElement("div");
    dot.className = "kw-mini-radar-dot " + (m.kind === "kw-ar-waypoint" ? "kw-mini-radar-dot-wp" : "kw-mini-radar-dot-poi");
    dot.style.left = (50 + r * Math.sin(angleRad)) + "%";
    dot.style.top = (50 - r * Math.cos(angleRad)) + "%";
    dotsWrap.appendChild(dot);
  });
}

/* Markiert in der bereits gerenderten Orte-Liste jene Einträge farblich, die
   aktuell (laut letztem AR-Update) im Sichtfeld liegen, also in Kompass-
   Richtung zeigen (ob einzeln oder als Teil einer Sammel-Marke gruppiert).
   Baut die Liste dafür nicht neu auf, sondern schaltet nur die CSS-Klasse um. */
function kwHighlightClusteredPois(){
  const listEl = document.getElementById("kw-poi-list");
  if (!listEl) return;
  const keys = kwState.clusteredPoiKeys || new Set();
  listEl.querySelectorAll(".kw-poi-item").forEach(el => {
    const key = el.dataset.lat + "," + el.dataset.lon;
    el.classList.toggle("kw-poi-item-clustered", keys.has(key));
  });
}

/* ===================== Info-Leiste im Kamerabild (HUD) ===================== */
async function kwUpdateHudBottom(){
  if (kwState.lat === null) return;
  const lat = kwState.lat, lon = kwState.lon; // an Open-Meteo gerundet: Wetter/Luft ≈ 1 km, Höhe ≈ 10 m
  const [wetter, luft, hoehe] = await Promise.allSettled([
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(2)}&longitude=${lon.toFixed(2)}&current=temperature_2m&daily=sunset&timezone=auto`).then(r => r.json()),
    fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat.toFixed(2)}&longitude=${lon.toFixed(2)}&current=european_aqi`).then(r => r.json()),
    fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}`).then(r => r.json()),
  ]);

  kwState.hud = {
    tempC: (wetter.status === "fulfilled" && wetter.value.current) ? Math.round(wetter.value.current.temperature_2m) : null,
    sunsetIso: (wetter.status === "fulfilled" && wetter.value.daily) ? wetter.value.daily.sunset[0] : null,
    aqi: (luft.status === "fulfilled" && luft.value.current) ? luft.value.current.european_aqi : null,
    elevation: (hoehe.status === "fulfilled" && hoehe.value.elevation) ? Math.round(hoehe.value.elevation[0]) : null,
  };
  kwRenderHudBottom();
}

function kwRenderHudBottom(){
  const wrap = document.getElementById("kw-hud-bottom");
  if (!wrap) return;
  if (kwState.lat === null) { wrap.innerHTML = ""; return; }

  const chips = [];
  chips.push({ label: "Ort", value: kwState.locationName.split(",")[0] });

  // Sonnenstand ist eine reine Rechnung (keine API nötig) und daher immer sofort verfügbar
  const sunNow = kwSunPosition(new Date(), kwState.lat, kwState.lon);
  if (sunNow.alt > 0) chips.push({ label: "Sonnenstand", value: `${Math.round(sunNow.alt)}° ${kwCompassLabel(sunNow.az)}` });

  const h = kwState.hud;
  if (h) {
    if (h.sunsetIso) {
      const sunset = new Date(h.sunsetIso);
      const diffMin = Math.round((sunset - new Date()) / 60000);
      if (diffMin > 0 && diffMin < 24*60) {
        const hh = Math.floor(diffMin/60), mm = diffMin % 60;
        chips.push({ label: "Sonnenuntergang in", value: (hh > 0 ? hh + " Std " : "") + mm + " Min" });
      } else if (diffMin <= 0 && diffMin > -12*60) {
        // Sonnenuntergang liegt bereits hinter uns (z. B. abends) – Chip bleibt sichtbar
        // statt kommentarlos zu verschwinden, damit es nicht wie ein Fehler wirkt.
        chips.push({ label: "Sonne", value: "bereits untergegangen" });
      }
    }
    if (h.tempC !== null) chips.push({ label: "Temperatur", value: h.tempC + "°C" });
    if (h.aqi !== null) {
      let label = "gut";
      if (h.aqi > 80) label = "sehr schlecht"; else if (h.aqi > 40) label = "mäßig";
      chips.push({ label: "Luftqualität", value: label });
    }
    if (h.elevation !== null) chips.push({ label: "Höhe ü. NN", value: h.elevation + " m" });
  }

  chips.push({ label: "Koordinaten", value: `${kwState.lat.toFixed(3)}, ${kwState.lon.toFixed(3)}` });

  if (kwState.waypoints.length) {
    let nearest = null, nearestDist = Infinity;
    kwState.waypoints.forEach(wp => {
      const d = kwHaversine(kwState.lat, kwState.lon, wp.lat, wp.lon);
      if (d < nearestDist) { nearestDist = d; nearest = wp; }
    });
    if (nearest) chips.push({ label: "Nächster Wegpunkt", value: `${kwEsc(nearest.name)} · ${kwFormatDist(nearestDist)}` });
  }

  wrap.innerHTML = chips.slice(0, 6).map(c => `
    <div class="kw-hud-chip">
      <span class="kw-hud-chip-label">${kwEsc(c.label)}</span>
      <span class="kw-hud-chip-value">${c.value}</span>
    </div>`).join("");
}

/* ===================== Umfeld ===================== */
async function kwLoadUmfeld(){
  const content = document.getElementById("kw-umfeld-content");
  if (kwState.lat === null) {
    content.innerHTML = '<div class="kw-hint">Standort wird benötigt – bitte oben erlauben oder auswählen.</div>';
    return;
  }
  content.innerHTML = '<div class="kw-card kw-skeleton"><div class="kw-shimmer"></div></div><div class="kw-card kw-skeleton"><div class="kw-shimmer"></div></div>';

  const lat = kwState.lat, lon = kwState.lon;
  const now = new Date();

  const [wetter, luft, hoehe] = await Promise.allSettled([
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(2)}&longitude=${lon.toFixed(2)}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&daily=sunrise,sunset&timezone=auto`).then(r => r.json()),
    fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat.toFixed(2)}&longitude=${lon.toFixed(2)}&current=european_aqi,pm2_5,pm10,uv_index`).then(r => r.json()),
    fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}`).then(r => r.json()),
  ]);

  const sun = kwSunPosition(now, lat, lon);
  const moon = kwMoonPosition(now, lat, lon);
  const phase = kwMoonPhaseInfo(now);

  let html = "";

  html += `<div class="kw-card">
    <h3><svg class="wzi" aria-hidden="true"><use href="#wzi-pin"></use></svg> Standort</h3>
    <div class="kw-row"><span class="kw-row-label">Ort</span><span class="kw-row-value">${kwState.locationName}</span></div>
    <div class="kw-row"><span class="kw-row-label">Koordinaten</span><span class="kw-row-value">${lat.toFixed(4)}, ${lon.toFixed(4)}</span></div>
    ${hoehe.status === "fulfilled" && hoehe.value.elevation ? `<div class="kw-row"><span class="kw-row-label">Höhe über NN</span><span class="kw-row-value">${Math.round(hoehe.value.elevation[0])} m</span></div>` : ""}
  </div>`;

  if (wetter.status === "fulfilled" && wetter.value.current) {
    const c = wetter.value.current;
    html += `<div class="kw-card">
      <h3><svg class="wzi" aria-hidden="true"><use href="#wzi-cloud-rain"></use></svg> Wetter</h3>
      <div class="kw-tile-grid">
        <div class="kw-tile"><span class="kw-tile-label">Temperatur</span><span class="kw-tile-value">${Math.round(c.temperature_2m)}°C</span></div>
        <div class="kw-tile"><span class="kw-tile-label">Gefühlt</span><span class="kw-tile-value">${Math.round(c.apparent_temperature)}°C</span></div>
        <div class="kw-tile"><span class="kw-tile-label">Luftfeuchte</span><span class="kw-tile-value">${Math.round(c.relative_humidity_2m)}%</span></div>
        <div class="kw-tile"><span class="kw-tile-label">Wind</span><span class="kw-tile-value">${Math.round(c.wind_speed_10m)} km/h</span></div>
      </div>
    </div>`;
  }

  if (luft.status === "fulfilled" && luft.value.current) {
    const c = luft.value.current;
    const aqi = c.european_aqi;
    let dot = "kw-dot-gruen", txt = "gut";
    if (aqi > 80) { dot = "kw-dot-rot"; txt = "sehr schlecht"; }
    else if (aqi > 40) { dot = "kw-dot-gelb"; txt = "mäßig"; }
    html += `<div class="kw-card">
      <h3><svg class="wzi" aria-hidden="true"><use href="#wzi-wind"></use></svg> Luftqualität</h3>
      <div class="kw-ampel"><span class="kw-dot ${dot}"></span> ${txt} (EAQI ${Math.round(aqi)})</div>
      <div class="kw-tile-grid" style="margin-top:10px">
        <div class="kw-tile"><span class="kw-tile-label">PM2,5</span><span class="kw-tile-value">${c.pm2_5?.toFixed(1) ?? "–"} µg/m³</span></div>
        <div class="kw-tile"><span class="kw-tile-label">PM10</span><span class="kw-tile-value">${c.pm10?.toFixed(1) ?? "–"} µg/m³</span></div>
        <div class="kw-tile"><span class="kw-tile-label">UV-Index</span><span class="kw-tile-value">${c.uv_index?.toFixed(1) ?? "–"}</span></div>
      </div>
    </div>`;
  }

  const sunriseSet = (wetter.status === "fulfilled" && wetter.value.daily)
    ? `<div class="kw-row"><span class="kw-row-label">Sonnenaufgang</span><span class="kw-row-value">${wetter.value.daily.sunrise[0].slice(11,16)}</span></div>
       <div class="kw-row"><span class="kw-row-label">Sonnenuntergang</span><span class="kw-row-value">${wetter.value.daily.sunset[0].slice(11,16)}</span></div>`
    : "";

  html += `<div class="kw-card">
    <h3><svg class="wzi" aria-hidden="true"><use href="#wzi-sun"></use></svg> Sonne & <svg class="wzi" aria-hidden="true"><use href="#wzi-moon"></use></svg> Mond</h3>
    ${sunriseSet}
    <div class="kw-row"><span class="kw-row-label">Sonnenrichtung</span><span class="kw-row-value">${sun.alt > 0 ? Math.round(sun.az) + "° (" + kwCompassLabel(sun.az) + ")" : "unter dem Horizont"}</span></div>
    <div class="kw-row"><span class="kw-row-label">Mondrichtung</span><span class="kw-row-value">${moon.alt > 0 ? Math.round(moon.az) + "° (" + kwCompassLabel(moon.az) + ")" : "unter dem Horizont"}</span></div>
    <div class="kw-row"><span class="kw-row-label">Mondphase</span><span class="kw-row-value">${phase.name} (${Math.round(phase.illum*100)}%)</span></div>
    <p class="kw-attribution">Richtungen sind eine astronomische Näherung, keine amtliche Angabe.</p>
  </div>`;

  const planetRows = KW_SKY_OBJECTS.map(obj => {
    const p = kwPlanetPosition(obj.key, now, kwState.lat, kwState.lon);
    const dir = p.alt > 0 ? Math.round(p.az) + "° (" + kwCompassLabel(p.az) + ")" : "unter dem Horizont";
    return `<div class="kw-row"><span class="kw-row-label">${obj.icon} ${obj.label}</span><span class="kw-row-value">${dir}</span></div>`;
  }).join("");
  const polaris = kwPolarisPosition(now, kwState.lat, kwState.lon);
  const polarisDir = polaris.alt > 0 ? Math.round(polaris.az) + "° (" + kwCompassLabel(polaris.az) + ")" : "unter dem Horizont";
  html += `<div class="kw-card">
    <h3><svg class="wzi" aria-hidden="true"><use href="#wzi-planet"></use></svg> Planeten &amp; <svg class="wzi" aria-hidden="true"><use href="#wzi-star-filled"></use></svg> Polarstern</h3>
    ${planetRows}
    <div class="kw-row"><span class="kw-row-label"><svg class="wzi" aria-hidden="true"><use href="#wzi-star-filled"></use></svg> Polarstern</span><span class="kw-row-value">${polarisDir}</span></div>
    <p class="kw-attribution">Nur mit bloßem Auge sichtbar bei klarem Himmel und ausreichender Dunkelheit; Richtungen sind eine astronomische Näherung, keine amtliche Angabe.</p>
  </div>`;

  html += `<p class="kw-attribution">Wetter- &amp; Luftdaten: <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer">Open-Meteo</a> (CC BY 4.0) · Ortsname: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>-Mitwirkende (ODbL)</p>`;

  content.innerHTML = html;
}

var kwLastOpErr = "";
/* ===================== Orte (Overpass) ===================== */
function kwRenderPoiFilters(){
  const wrap = document.getElementById("kw-poi-filters");
  wrap.innerHTML = "";
  KW_POI_GROUPS.forEach(group => {
    const types = KW_POI_TYPES.filter(t => t.group === group);
    if (!types.length) return;
    const section = document.createElement("div");
    section.className = "kw-poi-group";
    const heading = document.createElement("div");
    heading.className = "kw-poi-group-title";
    heading.textContent = group;
    section.appendChild(heading);
    const row = document.createElement("div");
    row.className = "kw-poi-filters-row";
    types.forEach(t => {
      const btn = document.createElement("button");
      btn.className = "kw-poi-filter" + (kwState.poiTypesSelected.has(t.id) ? " kw-poi-filter-active" : "");
      btn.innerHTML = wzIcon(t.icon) + " <span>" + kwEsc(t.label) + "</span>";
      btn.addEventListener("click", () => {
        if (kwState.poiTypesSelected.has(t.id)) kwState.poiTypesSelected.delete(t.id);
        else kwState.poiTypesSelected.add(t.id);
        kwSavePoiTypes();
        kwRenderPoiFilters();
        kwApplyPoiFilter();
      });
      row.appendChild(btn);
    });
    section.appendChild(row);
    wrap.appendChild(section);
  });
}

/* Ortstyp-Auswahl wird lokal gemerkt und beim nächsten App-Start wiederhergestellt (nur gültige
   IDs übernehmen, falls sich die Kategorienliste seither geändert hat). */
function kwSavePoiTypes(){
  localStorage.setItem("kw-poitypes", JSON.stringify([...kwState.poiTypesSelected]));
}
function kwLoadPoiTypes(){
  try {
    const saved = JSON.parse(localStorage.getItem("kw-poitypes")) || [];
    saved.filter(id => KW_POI_TYPE_IDS.has(id)).forEach(id => kwState.poiTypesSelected.add(id));
  } catch (e) { /* ignorieren, Auswahl bleibt leer */ }
}

function kwResetPoiFilters(){
  kwState.poiTypesSelected.clear();
  kwSavePoiTypes();
  kwRenderPoiFilters();
  kwApplyPoiFilter();
}

/* Filtert die bereits geladenen Orte (poisAll) nach aktueller Auswahl,
   ohne neue Overpass-Anfrage – wirkt sofort auf Liste, HUD und Livebild */
function kwApplyPoiFilter(){
  kwState.pois = kwState.poisAll.filter(p => kwState.poiTypesSelected.has(p.type));
  const statusEl = document.getElementById("kw-poi-status");
  const listEl = document.getElementById("kw-poi-list");
  if (listEl) {
    listEl.innerHTML = "";
    kwState.pois.forEach(p => {
      const div = document.createElement("div");
      div.className = "kw-poi-item";
      div.dataset.lat = p.lat.toFixed(5);
      div.dataset.lon = p.lon.toFixed(5);
      div.innerHTML = `
        <div>
          <div class="kw-poi-item-name">${kwEsc(p.name)}</div>
          <div class="kw-poi-item-meta">${kwFormatDist(p.dist)} · ${kwCompassLabel(p.az)}</div>
        </div>
        <div class="kw-poi-item-actions">
          <a class="kw-maps-link" href="${kwMapsUrl(p.lat, p.lon, p.name)}" target="_blank" rel="noopener noreferrer" aria-label="In Karten-App öffnen"><svg class="wzi" aria-hidden="true"><use href="#wzi-map"></use></svg></a>
          <div class="kw-poi-item-dir" style="transform:rotate(${p.az}deg)"><svg class="wzi" aria-hidden="true"><use href="#wzi-arrow-up"></use></svg></div>
        </div>
      `;
      listEl.appendChild(div);
    });
    kwHighlightClusteredPois();
  }
  if (statusEl && kwState.poisAll.length) {
    statusEl.textContent = kwState.pois.length ? `${kwState.pois.length} von ${kwState.poisAll.length} Orten sichtbar` : "Keine Orte für die aktuelle Auswahl – oben weitere Ortstypen wählen oder neu suchen";
  }
  kwRenderHudBottom();
}

function kwRenderPoiRadius(){
  const wrap = document.getElementById("kw-poi-radius");
  wrap.innerHTML = "";
  KW_POI_RADII.forEach(r => {
    const btn = document.createElement("button");
    btn.className = "kw-poi-filter" + (kwState.poiRadius === r ? " kw-poi-filter-active" : "");
    btn.textContent = r < 1000 ? `${r} m` : `${r/1000} km`;
    btn.addEventListener("click", () => {
      kwState.poiRadius = r;
      localStorage.setItem("kw-poi-radius", String(r));
      kwRenderPoiRadius();
    });
    wrap.appendChild(btn);
  });
}

/* Holt vor der Ortssuche einen frischen GPS-Wert (höchstens 30 s alt, max. 10 s warten).
   Schlägt das fehl, wird mit dem bisherigen Standort gesucht. */
function kwRefreshPositionForSearch(){
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve();
    const fresh = kwState.gpsAt && (Date.now() - kwState.gpsAt < 30000) && kwState.gpsAccuracy && kwState.gpsAccuracy <= 50;
    if (fresh) return resolve();
    navigator.geolocation.getCurrentPosition(pos => {
      kwState.gpsAccuracy = pos.coords.accuracy;
      kwState.gpsAt = Date.now();
      kwState.lat = pos.coords.latitude; kwState.lon = pos.coords.longitude;
      kwUpdateHudBottom();
      resolve();
    }, () => resolve(), { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
  });
}

/* Laufende Suche merken: tippt man erneut auf "Suchen" (oder ändert den Umkreis und sucht
   neu), darf eine ältere, langsamere Antwort das neuere Ergebnis nicht überschreiben. */
let kwPoiSearchId = 0;

async function kwSearchPOIs(){
  const statusEl = document.getElementById("kw-poi-status");
  const listEl = document.getElementById("kw-poi-list");
  if (kwState.lat === null) { statusEl.textContent = "Standort wird benötigt."; return; }
  if (!kwState.poiTypesSelected.size) { statusEl.textContent = "Bitte zuerst mindestens einen Ortstyp oben auswählen."; return; }
  if (!await kwAskOnce("kw-consent-overpass", "Orte in der Nähe suchen? Dein Standort + Radius wird dafür an einen von mehreren Overpass-Servern gesendet (overpass-api.de oder Spiegelserver, OSM Community; antwortet einer langsam, zusätzlich an den nächsten). Daten: © OpenStreetMap ODbL.")) return;

  const searchId = ++kwPoiSearchId;
  listEl.innerHTML = "";
  kwState.poisAll = [];
  kwState.pois = [];
  kwRenderHudBottom();
  // Bei automatischem Standort vor der Suche einen frischen, genauen GPS-Wert holen: der beim
  // App-Start ermittelte Wert kann veraltet oder (WLAN-/Funkzellen-Ortung) mehrere hundert Meter
  // ungenau sein – bei 500 m oder 1 km Umkreis sucht man dann schlicht am falschen Ort.
  if (kwState.locationMode !== "manual") {
    statusEl.textContent = "Standort wird genau bestimmt …";
    await kwRefreshPositionForSearch();
    if (searchId !== kwPoiSearchId) return;
  }
  statusEl.textContent = "Suche läuft … (kann bis zu 45 Sek dauern)";
  const radius = kwState.poiRadius;
  const radiusLabel = radius < 1000 ? `${radius} m` : `${radius/1000} km`;
  const lat = kwState.lat, lon = kwState.lon;
  const queryTypes = KW_POI_TYPES.filter(t => kwState.poiTypesSelected.has(t.id));
  // Jede Kategorie bekommt ihre eigene Overpass-Ausgabe mit eigenem Limit (statt eines
  // gemeinsamen Topfs für alle Kategorien). Sonst können häufige Kategorien wie
  // Haltestellen oder Parkplätze bei größerem Radius den gemeinsamen Deckel allein
  // füllen, bevor seltenere/weiter entfernte Kategorien überhaupt in der Antwort landen.
  // Abgefragt wird "nwr" (Punkte, Gebäudeumrisse und Flächen): Supermärkte, Apotheken,
  // Krankenhäuser, Parkplätze, Hotels usw. sind in OSM oft nur als Gebäude eingetragen
  // und wurden früher mit reinen Punkt-Abfragen übersehen. "out center" liefert für
  // Gebäude/Flächen einen Mittelpunkt.
  // Pro Kategorie eine eigene Ausgabe mit großzügigem Limit: Overpass sortiert nicht nach
  // Entfernung, deshalb würden bei einem kleinen Limit oft weiter entfernte Treffer kommen und
  // die nächstgelegenen fehlen. Sortiert und gekürzt wird danach hier auf dem Gerät.
  // "out tags center" liefert nur Namen/Kennzeichen und den Mittelpunkt (keine Umriss-Punkte) –
  // das hält die Antwort klein und schnell, auch im Mobilfunknetz.
  // Jede Kategorie wird EINZELN abgefragt (höchstens zwei Anfragen gleichzeitig – mehr erlaubt
  // overpass-api.de pro Gerät nicht). Früher ging alles in einer einzigen Anfrage raus: Wurde
  // die bei großem Umkreis zu schwer, fiel ALLES aus und es hieß "Server überlastet", obwohl
  // nur eine Kategorie das Problem war. Jetzt bleiben die übrigen Ergebnisse erhalten.
  // Kein knappes Ausgabe-Limit beim Server mehr: Overpass sortiert nicht nach Entfernung, ein
  // Limit von 40/60 lieferte bei dichten Kategorien eine zufällige Auswahl, und die
  // nächstgelegenen Treffer konnten fehlen. Sortiert und gekürzt wird hier auf dem Gerät.
  // "out tags center" liefert nur Namen/Kennzeichen und den Mittelpunkt – klein und schnell.
  const qFor = t => `[out:json][timeout:25];(` + t.sel.map(([k, v]) =>
      `nwr["${k}"="${v}"]${t.extra || ""}(around:${radius},${lat},${lon});`).join("") + `);out tags center 800;`;
  // Nur Server mit weltweiten Daten. overpass.osm.ch wurde entfernt: der enthält nur die
  // Schweiz und hat für Deutschland blitzschnell "0 Treffer" geliefert – das wurde als
  // gültiges Ergebnis übernommen, und die Suche fand scheinbar nichts.
  const mirrors = ["https://overpass.private.coffee/api/interpreter","https://overpass-api.de/api/interpreter"];
  // Pro Anfrage MEHR Zeit als das Server-Timeout (25 s): Früher brach die App schon nach 22 s
  // ab – schwere, aber gültige Antworten kamen dadurch nie an und wurden als "überlastet" gemeldet.
  const perRequestMs = 33000;
  const fetchType = async t => {
    const query = qFor(t);
    // Gemeinsamer Ablauf der WahrZentrale (wz-core.js): zuletzt schneller Server zuerst,
    // bei Ablehnung sofort der nächste, nach 10 s ohne Antwort zusätzlich der nächste.
    if (window.wzCore && wzCore.overpass) {
      try {
        return await wzCore.overpass(query, { perMs: perRequestMs, maxMs: 70000, hedgeMs: 10000,
          onSlow: () => { statusEl.textContent = `Server antwortet langsam (${t.label}) – versuche es weiter …`; },
          cancelled: () => searchId !== kwPoiSearchId });
      } catch (e) { if (e && e.cancel) e.stale = true; throw e; }
    }
    const deadline = Date.now() + 70000;
    let lastErr = null;
    for (let m = 0; m < mirrors.length; m++) {
      // Pro Server bis zu 2 Versuche; bei "zu viele Anfragen" (429) oder Serverfehler direkt weiter.
      for (let attempt = 0; attempt < 2; attempt++) {
        const remaining = deadline - Date.now();
        if (remaining < 3000) throw lastErr || new Error("Zeit abgelaufen");
        if (searchId !== kwPoiSearchId) throw Object.assign(new Error("veraltet"), { stale: true });
        if (m > 0 || attempt > 0) statusEl.textContent = `Server antwortet langsam (${t.label}) – versuche es weiter …`;
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), Math.min(perRequestMs, remaining));
        try {
          const res = await fetch(mirrors[m], {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
            body: "data=" + encodeURIComponent(query),
            signal: ctrl.signal,
          });
          if (!res.ok) {
            const err = new Error("HTTP " + res.status);
            err.skipMirror = res.status === 429 || res.status >= 500;
            throw err;
          }
          const j = await res.json();
          if (!j || !Array.isArray(j.elements)) throw new Error("Unerwartete Antwort");
          // Overpass antwortet bei Zeitüberschreitung/Überlastung mit HTTP 200, aber einem
          // "remark" und leerer/unvollständiger Liste – das ist kein echtes "nichts gefunden".
          if (j.remark && /error|timed out|out of memory/i.test(j.remark)) {
            const err = new Error("Overpass: " + j.remark);
            err.skipMirror = true;
            err.heavy = /timed out|out of memory/i.test(j.remark);
            throw err;
          }
          return j;
        } catch (e) {
          lastErr = e;
          if (e.skipMirror) break;
          if (attempt === 0) await new Promise(r => setTimeout(r, 800));
        } finally {
          clearTimeout(timer);
        }
      }
    }
    throw lastErr || new Error("Alle Overpass-Server nicht erreichbar");
  };

  const typeById = {};
  KW_POI_TYPES.forEach(t => { typeById[t.id] = t; });
  const toItems = (data, t) => (data.elements || []).map(el => {
    const plat = el.lat ?? el.center?.lat;
    const plon = el.lon ?? el.center?.lon;
    if (typeof plat !== "number" || typeof plon !== "number") return null;
    const hasName = !!el.tags?.name;
    // Treffer gehört zu der Kategorie, nach der gerade gesucht wurde
    return {
      name: el.tags?.name || (t.label || "Ohne Namen"),
      hasName, lat: plat, lon: plon, dist: kwHaversine(lat, lon, plat, plon), az: kwBearing(lat, lon, plat, plon), type: t.id,
    };
  }).filter(Boolean).sort((a, b) => a.dist - b.dist);

  // Pro Kategorie die nächstgelegenen behalten. Früher wurden ALLE Kategorien zusammen auf die
  // 40 nächsten gekürzt – dichte Kategorien (Haltestellen, Parkplätze, Restaurants) verdrängten
  // dann seltenere wie Krankenhaus, Museum oder Tierpark komplett aus der Liste.
  const perCat = Math.max(8, Math.ceil(60 / queryTypes.length));
  const got = {}, failed = {};
  let idx = 0, done = 0;
  const worker = async () => {
    while (idx < queryTypes.length) {
      const t = queryTypes[idx++];
      if (searchId !== kwPoiSearchId) return;
      statusEl.textContent = `Suche ${t.label} … (${done + 1} von ${queryTypes.length}, Umkreis ${radiusLabel})`;
      try { got[t.id] = kwDedupePois(toItems(await fetchType(t), t)).slice(0, perCat); }
      catch (e) { if (e.stale) return; failed[t.id] = e.heavy ? "heavy" : "busy"; kwLastOpErr = (e && e.message) || ""; }
      done++;
    }
  };
  await Promise.all([worker(), worker()]);
  if (searchId !== kwPoiSearchId) return;

  const okTypes = queryTypes.filter(t => got[t.id]);
  if (!okTypes.length) {
    const heavy = queryTypes.some(t => failed[t.id] === "heavy");
    statusEl.textContent = heavy
      ? "Die Suche war für den Kartenserver zu umfangreich – bitte kleineren Umkreis oder weniger Ortstypen wählen."
      : "Suche derzeit nicht möglich (Server überlastet oder ohne Antwort), bitte in 1–2 Minuten erneut versuchen." + (kwLastOpErr ? " (" + kwLastOpErr + ")" : "");
    return;
  }
  const items = okTypes.flatMap(t => got[t.id]).sort((a, b) => a.dist - b.dist);
  kwState.poisAll = items;
  kwApplyPoiFilter();

  const none = okTypes.filter(t => !got[t.id].length).map(t => t.label);
  const busy = queryTypes.filter(t => failed[t.id] === "busy").map(t => t.label);
  const heavy = queryTypes.filter(t => failed[t.id] === "heavy").map(t => t.label);
  let extra = "";
  if (none.length && items.length) extra += `\nKeine Treffer im Umkreis (in OpenStreetMap nicht eingetragen): ${none.join(", ")}`;
  if (busy.length) extra += `\nNicht geladen, Server überlastet: ${busy.join(", ")} – bitte gleich noch einmal suchen`;
  if (heavy.length) extra += `\nFür den Server zu umfangreich: ${heavy.join(", ")} – kleineren Umkreis wählen`;
  statusEl.style.whiteSpace = "pre-line";
  // Früher blieb bei 0 Treffern "Suche läuft …" einfach stehen – jetzt klare Rückmeldung.
  if (!items.length) {
    const next = KW_POI_RADII.find(r => r > radius);
    statusEl.textContent = `Keine passenden Orte im Umkreis von ${radiusLabel} gefunden.` + extra;
    if (next) {
      const btn = document.createElement("button");
      btn.className = "kw-btn kw-btn-ghost kw-poi-widen";
      btn.textContent = `Umkreis auf ${next < 1000 ? next + " m" : next / 1000 + " km"} erweitern`;
      btn.addEventListener("click", () => {
        kwState.poiRadius = next;
        localStorage.setItem("kw-poi-radius", String(next));
        kwRenderPoiRadius();
        kwSearchPOIs();
      });
      statusEl.appendChild(document.createElement("br"));
      statusEl.appendChild(btn);
    }
  } else {
    statusEl.textContent = `${items.length} ${items.length === 1 ? "Ort" : "Orte"} im Umkreis von ${radiusLabel}`
      + (kwState.gpsAccuracy && kwState.locationMode !== "manual" ? ` · Standort auf ca. ${Math.round(kwState.gpsAccuracy)} m genau` : "")
      + extra;
  }
}

/* Manche Orte (v.a. Haltestellen) liegen in OSM als mehrere Nodes vor
   (z. B. je eine pro Fahrtrichtung/Bahnsteig an derselben Haltestelle).
   Hier wird pro Kategorie zusammengefasst: gleicher Name <svg class="wzi" aria-hidden="true"><use href="#wzi-arrow-right"></use></svg> nur der nächstgelegene
   Treffer bleibt; namenlose Orte werden zusätzlich zusammengefasst, wenn sie
   näher als 40 m an einem bereits übernommenen Treffer derselben Kategorie liegen. */
function kwDedupePois(items){
  const kept = [];
  items.forEach(p => {
    if (p.hasName) {
      // Gleicher Name nur zusammenfassen, wenn nah beieinander (Haltestelle je Fahrtrichtung,
      // Bahnsteige). Früher galt das im ganzen Umkreis – von Filialen wie "Aldi", "Sparkasse"
      // oder "Aral" blieb dann nur die nächste übrig, alle weiteren fehlten.
      const key = p.name.trim().toLowerCase();
      const near = (p.type === "station" || p.type === "transit") ? 400 : 150;
      if (kept.some(k => k.type === p.type && k.hasName && k.name.trim().toLowerCase() === key && kwHaversine(k.lat, k.lon, p.lat, p.lon) < near)) return;
      kept.push(p);
      return;
    }
    const tooClose = kept.some(k => k.type === p.type && !k.hasName && kwHaversine(k.lat, k.lon, p.lat, p.lon) < 40);
    if (tooClose) return;
    kept.push(p);
  });
  return kept;
}

/* Ordnet ein Overpass-Element anhand seiner Tags einer unserer Kategorien zu. Zuerst unter den
   gerade gesuchten Kategorien: ein Hotel mit Restaurant oder eine Kirche, die zugleich
   Sehenswürdigkeit ist, landet so in der Kategorie, nach der gesucht wurde (früher fielen
   solche Treffer durch den Filter, und die Suche meldete scheinbar "nichts gefunden"). */
function kwGuessPoiType(el, preferred){
  const tags = el.tags || {};
  const hit = t => t.sel.some(([k, v]) => tags[k] === v);
  const lists = preferred ? [preferred, KW_POI_TYPES] : [KW_POI_TYPES];
  for (const list of lists) for (const t of list) if (hit(t)) return t.id;
  return "other";
}

/* ===================== Wegpunkte ===================== */
function kwLoadWaypoints(){
  try {
    kwState.waypoints = JSON.parse(localStorage.getItem("kw-waypoints")) || [];
  } catch (e) { kwState.waypoints = []; }
}
function kwSaveWaypoints(){
  localStorage.setItem("kw-waypoints", JSON.stringify(kwState.waypoints));
}
function kwAddWaypoint(){
  const nameInput = document.getElementById("kw-wp-name");
  const name = nameInput.value.trim() || "Wegpunkt";
  if (kwState.lat === null) { wzAlert("Standort wird benötigt."); return; }
  kwState.waypoints.push({ id: Date.now(), name, lat: kwState.lat, lon: kwState.lon, ts: new Date().toISOString() });
  kwSaveWaypoints();
  nameInput.value = "";
  kwRenderWaypoints();
  kwRenderHudBottom();
}
function kwRenderWaypoints(){
  const wrap = document.getElementById("kw-wp-list");
  wrap.innerHTML = "";
  if (!kwState.waypoints.length) {
    wrap.innerHTML = '<div class="kw-hint">Noch keine Wegpunkte gemerkt.</div>';
    return;
  }
  kwState.waypoints.forEach(wp => {
    const div = document.createElement("div");
    div.className = "kw-wp-item";
    let meta = "gemerkt";
    if (kwState.lat !== null) {
      const dist = kwHaversine(kwState.lat, kwState.lon, wp.lat, wp.lon);
      const az = kwBearing(kwState.lat, kwState.lon, wp.lat, wp.lon);
      meta = `${kwFormatDist(dist)} · ${kwCompassLabel(az)}`;
    }
    div.innerHTML = `
      <div>
        <div class="kw-wp-item-name"><svg class="wzi" aria-hidden="true"><use href="#wzi-pushpin"></use></svg> ${kwEsc(wp.name)}</div>
        <div class="kw-wp-item-meta">${meta}</div>
      </div>
      <a class="kw-maps-link" href="${kwMapsUrl(wp.lat, wp.lon, wp.name)}" target="_blank" rel="noopener noreferrer" aria-label="In Karten-App öffnen"><svg class="wzi" aria-hidden="true"><use href="#wzi-map"></use></svg></a>
      <button class="kw-wp-del" data-id="${wp.id}" aria-label="Wegpunkt löschen"><svg class="wzi" aria-hidden="true"><use href="#wzi-trash"></use></svg></button>
    `;
    div.querySelector(".kw-wp-del").addEventListener("click", () => {
      kwState.waypoints = kwState.waypoints.filter(w => w.id !== wp.id);
      kwSaveWaypoints();
      kwRenderWaypoints();
      kwRenderHudBottom();
    });
    wrap.appendChild(div);
  });
}
