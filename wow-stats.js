// WowarWahr – Auswertungen & Erfolge
import { geo, dist, CONTINENT_ORDER } from './wow-geo.js';

export function visitedRegions(visits, manual = []) {
  const set = new Set();
  for (const v of visits) if (v.rid) set.add(v.rid);
  for (const r of manual) if (r.visited) set.add(r.id);
  return set;
}

export const EARTH_KM = 40075;
const NEIGHBORS_DE = ['DK', 'PL', 'CZ', 'AT', 'CH', 'FR', 'LU', 'BE', 'NL'];
const EU27 = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'];
const ISLANDS = ['IS', 'IE', 'GB', 'MT', 'CY', 'JP', 'NZ', 'LK', 'MV', 'MU', 'SC', 'CU', 'JM', 'BS', 'BB', 'FJ', 'PH', 'ID', 'MG', 'CV', 'TT', 'DM', 'LC', 'GD', 'VC', 'AG', 'KN', 'SG', 'BH', 'TW', 'PR', 'ST', 'KM', 'WS', 'TO', 'VU', 'SB', 'PG', 'TL', 'BN'];

export const dayOf = d => (d || '').slice(0, 10);
export const yearOf = d => (d || '').slice(0, 4);
export function daysBetween(a, b) {
  if (!a || !b) return 1;
  return Math.max(1, Math.round((Date.parse(dayOf(b)) - Date.parse(dayOf(a))) / 864e5) + 1);
}

// Reiseroute: Heimat → Orte (nach Datum) → Heimat
export function tripRoute(trip, visits, home) {
  const pts = visits.filter(v => v.tripId === trip.id).sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.created || 0) - (b.created || 0));
  const route = pts.map(v => ({ lat: v.lat, lon: v.lon }));
  if (home && route.length) return [home, ...route, home];
  return route;
}
export function routeKm(route) {
  let km = 0;
  for (let i = 1; i < route.length; i++) km += dist(route[i - 1], route[i]);
  return km;
}

export function computeStats(data, { year = null } = {}) {
  const { trips, visits, countries, photos, home } = data;
  const inYear = d => !year || yearOf(d) === String(year);
  const T = trips.filter(t => inYear(t.start) || inYear(t.end));
  const tripIds = new Set(T.map(t => t.id));
  const V = visits.filter(v => year ? (inYear(v.date) || (v.tripId && tripIds.has(v.tripId))) : true);

  // Besuchte Länder
  const visited = new Set();
  const firstVisit = new Map();
  for (const v of visits) {
    if (!v.cid) continue;
    const d = v.date || (trips.find(t => t.id === v.tripId) || {}).start || '';
    if (!firstVisit.has(v.cid) || (d && d < firstVisit.get(v.cid))) firstVisit.set(v.cid, d);
  }
  for (const v of V) if (v.cid) visited.add(v.cid);
  if (!year) for (const c of countries) if (c.visited) visited.add(c.id);

  const un = [...visited].filter(id => geo.byId.get(id)?.un);
  const territories = [...visited].filter(id => !geo.byId.get(id)?.un);
  const cont = {};
  for (const k of CONTINENT_ORDER) cont[k] = { total: 0, visited: 0 };
  for (const c of geo.world) if (c.un) cont[c.k].total++;
  const contVisited = new Set();
  for (const id of visited) { const c = geo.byId.get(id); if (!c) continue; contVisited.add(c.k); if (c.un) cont[c.k].visited++; }

  let landArea = 0, visitedArea = 0;
  for (const c of geo.world) { landArea += c.area; if (visited.has(c.id)) visitedArea += c.area; }

  // Entfernungen
  let km = 0;
  for (const t of T) km += routeKm(tripRoute(t, visits, home));
  const loose = V.filter(v => !v.tripId);
  if (home) for (const v of loose) km += 2 * dist(home, v);

  let farthest = null;
  const ref = home || null;
  if (ref) for (const v of V) { const d = dist(ref, v); if (!farthest || d > farthest.d) farthest = { v, d }; }
  const ext = { n: null, s: null, e: null, w: null };
  for (const v of V) {
    if (!ext.n || v.lat > ext.n.lat) ext.n = v;
    if (!ext.s || v.lat < ext.s.lat) ext.s = v;
    if (!ext.e || v.lon > ext.e.lon) ext.e = v;
    if (!ext.w || v.lon < ext.w.lon) ext.w = v;
  }
  const days = T.reduce((s, t) => s + daysBetween(t.start, t.end || t.start), 0);
  const capitals = new Set(V.filter(v => v.cap).map(v => v.name));
  const P = photos.filter(p => !year || tripIds.has(p.tripId) || V.some(v => v.id === p.visitId));

  // pro Jahr
  const perYear = {};
  for (const t of trips) { const y = yearOf(t.start); if (!y) continue; perYear[y] = perYear[y] || { trips: 0, days: 0, newCountries: 0 }; perYear[y].trips++; perYear[y].days += daysBetween(t.start, t.end || t.start); }
  for (const [, d] of firstVisit) { const y = yearOf(d); if (y) { perYear[y] = perYear[y] || { trips: 0, days: 0, newCountries: 0 }; perYear[y].newCountries++; } }

  // Neue Länder in diesem Jahr
  const newThisYear = year ? [...visited].filter(id => yearOf(firstVisit.get(id)) === String(year)) : [];

  // Häufigste Länder (Anzahl Reisen)
  const countTrips = {};
  for (const t of trips) {
    const ids = new Set(visits.filter(v => v.tripId === t.id && v.cid).map(v => v.cid));
    for (const id of ids) countTrips[id] = (countTrips[id] || 0) + 1;
  }
  const topCountries = Object.entries(countTrips).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Regionen
  const regions = visitedRegions(V, year ? [] : (data.regions || []));
  const regionsByCountry = {};
  for (const rid of regions) { const r = geo.regionById.get(rid); if (!r) continue; (regionsByCountry[r.c] ||= new Set()).add(rid); }

  const hemis = { N: V.some(v => v.lat > 0), S: V.some(v => v.lat < 0), E: V.some(v => v.lon > 0), W: V.some(v => v.lon < 0) };

  return {
    visited, un, territories, cont, contVisited, landArea, visitedArea,
    pct: landArea ? visitedArea / landArea * 100 : 0,
    km, farthest, ext, days, trips: T, visits: V, capitals, photos: P, perYear,
    newThisYear, topCountries, hemis, countTrips, firstVisit, regions, regionsByCountry,
  };
}

// Erfolge: { id, icon, title, text, value, goal }
export function achievements(st, data) {
  const has = ids => ids.filter(id => st.visited.has(id)).length;
  const maxRepeat = Math.max(0, ...Object.values(st.countTrips));
  const wishDone = data.countries.filter(c => c.wish && st.visited.has(c.id)).length +
    data.wishes.filter(w => w.done).length;
  const list = [
    { id: 'first', icon: 'trips', title: 'Los geht’s', text: 'Erste Reise angelegt', value: data.trips.length, goal: 1 },
    { id: 'c5', icon: 'map', title: 'Entdecker', text: '5 Staaten besucht', value: st.un.length, goal: 5 },
    { id: 'c10', icon: 'compass', title: 'Weltenbummler', text: '10 Staaten besucht', value: st.un.length, goal: 10 },
    { id: 'c25', icon: 'globe', title: 'Globetrotter', text: '25 Staaten besucht', value: st.un.length, goal: 25 },
    { id: 'c50', icon: 'trophy', title: 'Kosmopolit', text: '50 Staaten besucht', value: st.un.length, goal: 50 },
    { id: 'k3', icon: 'orbit', title: 'Drei Kontinente', text: '3 Kontinente bereist', value: st.contVisited.size, goal: 3 },
    { id: 'k6', icon: 'plane', title: 'Alle Kontinente', text: '6 bewohnte Kontinente', value: [...st.contVisited].filter(k => k !== 'AN').length, goal: 6 },
    { id: 'nb', icon: 'people', title: 'Gute Nachbarn', text: 'Alle 9 Nachbarländer Deutschlands', value: has(NEIGHBORS_DE), goal: NEIGHBORS_DE.length },
    { id: 'eu', icon: 'eu', title: 'Europa-Sammler', text: 'Alle 27 EU-Staaten', value: has(EU27), goal: EU27.length },
    { id: 'de16', icon: 'castle', title: 'Deutschland komplett', text: 'Alle 16 Bundesländer', value: st.regionsByCountry.DE?.size || 0, goal: 16 },
    { id: 'us10', icon: 'car', title: 'Road Trip', text: '10 US-Bundesstaaten', value: st.regionsByCountry.US?.size || 0, goal: 10 },
    { id: 'reg25', icon: 'puzzle', title: 'Regionen-Sammler', text: '25 Regionen weltweit', value: st.regions.size, goal: 25 },
    { id: 'isl', icon: 'island', title: 'Inselhüpfer', text: '5 Inselstaaten besucht', value: has(ISLANDS), goal: 5 },
    { id: 'cap', icon: 'culture', title: 'Hauptstadt-Sammler', text: '10 Hauptstädte besucht', value: st.capitals.size, goal: 10 },
    { id: 'km1', icon: 'plane', title: 'Vielflieger', text: '10.000 km Luftlinie', value: Math.round(st.km), goal: 10000 },
    { id: 'km2', icon: 'globe', title: 'Einmal um die Welt', text: '40.075 km Luftlinie', value: Math.round(st.km), goal: 40075 },
    { id: 'south', icon: 'compass', title: 'Südhalbkugel', text: 'Einen Ort südlich des Äquators', value: st.hemis.S ? 1 : 0, goal: 1 },
    { id: 'polar', icon: 'snow', title: 'Polarkreis', text: 'Nördlich von 66,5° N', value: st.ext.n && st.ext.n.lat >= 66.56 ? 1 : 0, goal: 1 },
    { id: 'trips10', icon: 'calendar', title: 'Reiselustig', text: '10 Reisen', value: data.trips.length, goal: 10 },
    { id: 'days100', icon: 'hourglass', title: '100 Reisetage', text: 'Zusammen 100 Tage unterwegs', value: st.days, goal: 100 },
    { id: 'fan', icon: 'heart', title: 'Stammgast', text: 'Ein Land auf 3 Reisen besucht', value: maxRepeat, goal: 3 },
    { id: 'photo', icon: 'camera', title: 'Fotograf', text: '50 Fotos gesammelt', value: data.photos.length, goal: 50 },
    { id: 'wish', icon: 'star', title: 'Traum erfüllt', text: 'Ein Wunschziel erreicht', value: wishDone, goal: 1 },
  ];
  for (const a of list) a.done = a.value >= a.goal;
  return list;
}
