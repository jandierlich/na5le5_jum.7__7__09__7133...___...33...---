/* =========================================================
   Keysglade — Distanz-Berechnung
   Luftlinie per Haversine-Formel + grobe Fahrzeit-Schätzung.
   Keine echten Verkehrsdaten — nur eine Näherung.
========================================================= */

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Erdradius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function estimateDriveMinutes(km, avgSpeedKmh = 75) {
  return Math.round((km / avgSpeedKmh) * 60);
}

function formatDistance(km) {
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} Min.`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} Std.` : `${h} Std. ${m} Min.`;
}
