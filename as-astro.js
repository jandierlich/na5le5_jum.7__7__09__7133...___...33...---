/* ===================================================================
   AstroWahr – Astronomie-Engine
   Eigenständige Implementierung nach den klassischen Kepler-Formeln
   (Methode nach Paul Schlyter, "How to compute planetary positions",
   gemeinfrei/Public Domain). Keine externen Bibliotheken, kein Netz-
   werkzugriff nötig – läuft komplett offline im Browser.
   Genauigkeit: wenige Bogenminuten für die Planeten, ausreichend für
   astrologische Zwecke (Tierkreiszeichen/Gradangaben).
   =================================================================== */

(function (global) {
  const DEG = Math.PI / 180;
  const RAD = 180 / Math.PI;

  function sind(x) { return Math.sin(x * DEG); }
  function cosd(x) { return Math.cos(x * DEG); }
  function tand(x) { return Math.tan(x * DEG); }
  function atan2d(y, x) { return Math.atan2(y, x) * RAD; }
  function asind(x) { return Math.asin(x) * RAD; }
  function atand(x) { return Math.atan(x) * RAD; }
  function norm360(x) { x = x % 360; return x < 0 ? x + 360 : x; }

  // Julianisches Datum aus JS-Date (UTC)
  function toJulianDate(date) {
    return date.getTime() / 86400000 + 2440587.5;
  }

  // Tage seit Epoche 2000.0 (2000-01-01 00:00 UT = JD 2451544.5... Schlyter-Epoche: JD 2451543.5)
  function daysSinceEpoch(date) {
    return toJulianDate(date) - 2451543.5;
  }

  // Bahnelemente je Himmelskörper: {N, i, w, a, e, M0, Mrate} bei d=0, linear in d
  // N=Knoten, i=Neigung, w=Perihelargument, a=große Halbachse, e=Exzentrizität,
  // M=mittlere Anomalie (M0 + Mrate*d)
  const ELEMENTS = {
    sun:     { N: 0,        Ndot: 0,           i: 0,        idot: 0,            w: 282.9404, wdot: 4.70935e-5,  a: 1.000000,  adot: 0,           e: 0.016709,  edot: -1.151e-9,  M0: 356.0470, Mdot: 0.9856002585 },
    moon:    { N: 125.1228, Ndot: -0.0529538083,i: 5.1454,   idot: 0,            w: 318.0634, wdot: 0.1643573223,a: 60.2666,  adot: 0,           e: 0.054900,  edot: 0,          M0: 115.3654, Mdot: 13.0649929509 },
    mercury: { N: 48.3313,  Ndot: 3.24587e-5,  i: 7.0047,   idot: 5.00e-8,      w: 29.1241,  wdot: 1.01444e-5,  a: 0.387098,  adot: 0,           e: 0.205635,  edot: 5.59e-10,   M0: 168.6562, Mdot: 4.0923344368 },
    venus:   { N: 76.6799,  Ndot: 2.46590e-5,  i: 3.3946,   idot: 2.75e-8,      w: 54.8910,  wdot: 1.38374e-5,  a: 0.723330,  adot: 0,           e: 0.006773,  edot: -1.302e-9,  M0: 48.0052,  Mdot: 1.6021302244 },
    mars:    { N: 49.5574,  Ndot: 2.11081e-5,  i: 1.8497,   idot: -1.78e-8,     w: 286.5016, wdot: 2.92961e-5,  a: 1.523688,  adot: 0,           e: 0.093405,  edot: 2.516e-9,   M0: 18.6021,  Mdot: 0.5240207766 },
    jupiter: { N: 100.4542, Ndot: 2.76854e-5,  i: 1.3030,   idot: -1.557e-7,    w: 273.8777, wdot: 1.64505e-5,  a: 5.20256,   adot: 0,           e: 0.048498,  edot: 4.469e-9,   M0: 19.8950,  Mdot: 0.0830853001 },
    saturn:  { N: 113.6634, Ndot: 2.38980e-5,  i: 2.4886,   idot: -1.081e-7,    w: 339.3939, wdot: 2.97661e-5,  a: 9.55475,   adot: 0,           e: 0.055546,  edot: -9.499e-9,  M0: 316.9670, Mdot: 0.0334442282 },
    uranus:  { N: 74.0005,  Ndot: 1.3978e-5,   i: 0.7733,   idot: 1.9e-8,       w: 96.6612,  wdot: 3.0565e-5,   a: 19.18171,  adot: -1.55e-8,    e: 0.047318,  edot: 7.45e-9,    M0: 142.5905, Mdot: 0.011725806 },
    neptune: { N: 131.7806, Ndot: 3.0173e-5,   i: 1.7700,   idot: -2.55e-7,     w: 272.8461, wdot: -6.027e-6,   a: 30.05826,  adot: 3.313e-8,    e: 0.008606,  edot: 2.15e-9,    M0: 260.2471, Mdot: 0.005995147 },
    pluto:   { N: 110.30347,Ndot: 0,           i: 17.14175, idot: 0,            w: 113.76329,wdot: 0,           a: 39.48168677,adot: 0,          e: 0.24880766,edot: 0,          M0: 14.86205, Mdot: 0.003968789 }
  };

  function elementsAt(body, d) {
    const e = ELEMENTS[body];
    return {
      N: norm360(e.N + e.Ndot * d),
      i: e.i + e.idot * d,
      w: norm360(e.w + e.wdot * d),
      a: e.a + e.adot * d,
      e: e.e + e.edot * d,
      M: norm360(e.M0 + e.Mdot * d)
    };
  }

  // Löst die Kepler-Gleichung E - e*sin(E) = M iterativ (Grad)
  function eccentricAnomaly(M, ecc) {
    let E = M + ecc * RAD * sind(M) * (1 + ecc * cosd(M));
    for (let iter = 0; iter < 8; iter++) {
      const dM = M - (E - ecc * RAD * sind(E));
      const dE = dM / (1 - ecc * cosd(E));
      E += dE;
      if (Math.abs(dE) < 1e-7) break;
    }
    return E;
  }

  function heliocentric(el) {
    const E = eccentricAnomaly(el.M, el.e);
    const xv = el.a * (cosd(E) - el.e);
    const yv = el.a * (Math.sqrt(1 - el.e * el.e) * sind(E));
    const v = atan2d(yv, xv);
    const r = Math.sqrt(xv * xv + yv * yv);
    const vw = v + el.w;
    const xh = r * (cosd(el.N) * cosd(vw) - sind(el.N) * sind(vw) * cosd(el.i));
    const yh = r * (sind(el.N) * cosd(vw) + cosd(el.N) * sind(vw) * cosd(el.i));
    const zh = r * (sind(vw) * sind(el.i));
    return { x: xh, y: yh, z: zh, r: r, v: v };
  }

  // liefert {lon, lat, dist} geozentrisch ekliptikal (Grad, Grad, AU)
  function sunPosition(d) {
    const el = elementsAt('sun', d);
    const E = eccentricAnomaly(el.M, el.e);
    const xv = cosd(E) - el.e;
    const yv = Math.sqrt(1 - el.e * el.e) * sind(E);
    const v = atan2d(yv, xv);
    const r = Math.sqrt(xv * xv + yv * yv);
    const lon = norm360(v + el.w);
    return { lon: lon, lat: 0, dist: r, xs: r * cosd(lon), ys: r * sind(lon) };
  }

  function moonPosition(d, sun) {
    const el = elementsAt('moon', d);
    const h = heliocentric(el); // hier: geozentrisch, da Mond die Erde umkreist
    let lon = norm360(atan2d(h.y, h.x));
    let lat = atan2d(h.z, Math.sqrt(h.x * h.x + h.y * h.y));
    const dist = h.r;

    // Störungsterme (Schlyter) für höhere Genauigkeit
    const Ms = elementsAt('sun', d).M;
    const Mm = el.M;
    const Nm = el.N;
    const ws = elementsAt('sun', d).w;
    const Lm = norm360(Nm + el.w + Mm);
    const Ls = norm360(ws + Ms);
    const D = norm360(Lm - Ls);
    const F = norm360(Lm - Nm);

    lon += -1.274 * sind(Mm - 2 * D)
         + 0.658 * sind(2 * D)
         - 0.186 * sind(Ms)
         - 0.059 * sind(2 * Mm - 2 * D)
         - 0.057 * sind(Mm - 2 * D + Ms)
         + 0.053 * sind(Mm + 2 * D)
         + 0.046 * sind(2 * D - Ms)
         + 0.041 * sind(Mm - Ms)
         - 0.035 * sind(D)
         - 0.031 * sind(Mm + Ms)
         - 0.015 * sind(2 * F - 2 * D)
         + 0.011 * sind(Mm - 4 * D);

    lat += -0.173 * sind(F - 2 * D)
         - 0.055 * sind(Mm - F - 2 * D)
         - 0.046 * sind(Mm + F - 2 * D)
         + 0.033 * sind(F + 2 * D)
         + 0.017 * sind(2 * Mm + F);

    return { lon: norm360(lon), lat: lat, dist: dist };
  }

  function planetPosition(body, d, sun) {
    const el = elementsAt(body, d);
    const h = heliocentric(el);
    const xg = h.x + sun.xs;
    const yg = h.y + sun.ys;
    const zg = h.z;
    const lon = norm360(atan2d(yg, xg));
    const lat = atan2d(zg, Math.sqrt(xg * xg + yg * yg));
    const dist = Math.sqrt(xg * xg + yg * yg + zg * zg);
    return { lon: lon, lat: lat, dist: dist };
  }

  // Berechnet alle Positionen für ein Datum (UTC-Date-Objekt)
  function computePositions(date) {
    const d = daysSinceEpoch(date);
    const sun = sunPosition(d);
    const positions = { sonne: { lon: sun.lon, lat: 0, dist: sun.dist } };
    positions.mond = moonPosition(d, sun);
    ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].forEach(function (body) {
      positions[GERMAN[body]] = planetPosition(body, d, sun);
    });
    return positions;
  }

  const GERMAN = {
    mercury: 'merkur', venus: 'venus', mars: 'mars', jupiter: 'jupiter',
    saturn: 'saturn', uranus: 'uranus', neptune: 'neptun', pluto: 'pluto'
  };

  const SIGNS = ['Widder', 'Stier', 'Zwillinge', 'Krebs', 'Löwe', 'Jungfrau',
    'Waage', 'Skorpion', 'Schütze', 'Steinbock', 'Wassermann', 'Fische'];

  function lonToSign(lon) {
    lon = norm360(lon);
    const idx = Math.floor(lon / 30);
    const deg = lon - idx * 30;
    return { sign: SIGNS[idx], index: idx, degree: deg, lon: lon };
  }

  // Schiefe der Ekliptik
  function obliquity(d) {
    return 23.4393 - 3.563e-7 * d;
  }

  // Greenwich Mean Sidereal Time in Grad
  function gmst(date) {
    const JD = toJulianDate(date);
    const T = (JD - 2451545.0) / 36525;
    let g = 280.46061837 + 360.98564736629 * (JD - 2451545.0) + 0.000387933 * T * T - (T * T * T) / 38710000;
    return norm360(g);
  }

  // Aszendent + MC berechnen. lat/lon in Grad (lon: Ost positiv), date: UTC-Date
  function ascendantMC(date, latDeg, lonDeg) {
    const d = daysSinceEpoch(date);
    const eps = obliquity(d);
    const LST = norm360(gmst(date) + lonDeg); // Right Ascension of MC (RAMC)
    const RAMC = LST;

    let mc = atan2d(sind(RAMC), cosd(RAMC) * cosd(eps));
    mc = norm360(mc);
    // Quadrant von MC an RAMC angleichen (atan2 liefert bereits korrekten Quadranten hier)

    const ascY = cosd(RAMC);
    const ascX = -(sind(RAMC) * cosd(eps) + tand(latDeg) * sind(eps));
    let asc = atan2d(ascY, ascX);
    asc = norm360(asc);

    return { asc: asc, mc: mc, ramc: RAMC, obliquity: eps };
  }

  // Gleiche Häuser (Equal House) ab Aszendent
  function equalHouses(ascLon) {
    const houses = [];
    for (let n = 0; n < 12; n++) {
      houses.push(norm360(ascLon + n * 30));
    }
    return houses;
  }

  function houseOfLongitude(lon, houseCusps) {
    lon = norm360(lon);
    for (let n = 0; n < 12; n++) {
      const start = houseCusps[n];
      const end = houseCusps[(n + 1) % 12];
      let diff = norm360(lon - start);
      let span = norm360(end - start);
      if (span === 0) span = 360;
      if (diff < span) return n + 1;
    }
    return 12;
  }

  // Äquatoriale Koordinaten der Sonne (Rektaszension, Deklination) in Grad
  function sunEquatorial(date) {
    const d = daysSinceEpoch(date);
    const sun = sunPosition(d);
    const eps = obliquity(d);
    const ra = norm360(atan2d(cosd(eps) * sind(sun.lon), cosd(sun.lon)));
    const dec = asind(sind(eps) * sind(sun.lon));
    return { ra: ra, dec: dec, lon: sun.lon };
  }

  // Signierte Differenz kleiner Winkel in Grad (-180..180]
  function angleDiffSigned(a, b) {
    let d = (norm360(a) - norm360(b) + 540) % 360 - 180;
    return d;
  }

  // Sonnenauf-/-untergang, Sonnenmittag und Taglänge für ein Datum an einem Ort.
  // date: JS-Date (Kalendertag wird in lokaler Zeit anhand utcOffsetHours interpretiert)
  // Rückgabe: { sunrise, sunset, solarNoon (jeweils Date|null), dayLengthHours, polarDay, polarNight }
  function sunTimes(date, latDeg, lonDeg, utcOffsetHours) {
    // Referenzzeitpunkt: 12:00 Uhr lokaler Zeit am gewünschten Kalendertag, nach UTC gewandelt
    const noonLocalUTC = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0) - utcOffsetHours * 3600000;
    const refDate = new Date(noonLocalUTC);
    const d = daysSinceEpoch(refDate);
    const sun = sunPosition(d);
    const eps = obliquity(d);
    const elements = elementsAt('sun', d);
    const meanLon = norm360(elements.M + elements.w);
    const ra = norm360(atan2d(cosd(eps) * sind(sun.lon), cosd(sun.lon)));
    const dec = asind(sind(eps) * sind(sun.lon));

    // Zeitgleichung in Minuten (wahre minus mittlere Sonnenzeit)
    const eotDeg = angleDiffSigned(meanLon, ra);
    const eotMinutes = eotDeg * 4;

    // Stundenwinkel bei -0.833° Höhe (Standardrefraktion + Sonnenradius)
    const cosH0 = (sind(-0.8333) - sind(latDeg) * sind(dec)) / (cosd(latDeg) * cosd(dec));

    const lstm = utcOffsetHours * 15; // Bezugsmeridian der Zeitzone
    const timeCorrectionMin = 4 * (lonDeg - lstm) + eotMinutes;
    const solarNoonHours = 12 - timeCorrectionMin / 60;

    function hoursToDate(h) {
      const ms = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0) - utcOffsetHours * 3600000 + h * 3600000;
      return new Date(ms);
    }

    const solarNoon = hoursToDate(solarNoonHours);

    if (cosH0 > 1) {
      return { sunrise: null, sunset: null, solarNoon: solarNoon, dayLengthHours: 0, polarDay: false, polarNight: true };
    }
    if (cosH0 < -1) {
      return { sunrise: null, sunset: null, solarNoon: solarNoon, dayLengthHours: 24, polarDay: true, polarNight: false };
    }
    const H0 = Math.acos(cosH0) * RAD;
    const sunrise = hoursToDate(solarNoonHours - H0 / 15);
    const sunset = hoursToDate(solarNoonHours + H0 / 15);
    const dayLengthHours = (2 * H0) / 15;
    return { sunrise: sunrise, sunset: sunset, solarNoon: solarNoon, dayLengthHours: dayLengthHours, polarDay: false, polarNight: false };
  }


  const ASPECTS = [
    { name: 'Konjunktion', angle: 0, orb: 8, symbol: '\u260C' },
    { name: 'Sextil', angle: 60, orb: 4, symbol: '\u26B9' },
    { name: 'Quadrat', angle: 90, orb: 6, symbol: '\u25A1' },
    { name: 'Trigon', angle: 120, orb: 6, symbol: '\u25B3' },
    { name: 'Opposition', angle: 180, orb: 8, symbol: '\u260D' }
  ];

  function angleDiff(a, b) {
    let d = Math.abs(norm360(a) - norm360(b));
    if (d > 180) d = 360 - d;
    return d;
  }

  function findAspect(lon1, lon2, orbFactor) {
    orbFactor = orbFactor || 1;
    const diff = angleDiff(lon1, lon2);
    for (let i = 0; i < ASPECTS.length; i++) {
      const asp = ASPECTS[i];
      const maxOrb = asp.orb * orbFactor;
      if (Math.abs(diff - asp.angle) <= maxOrb) {
        return { name: asp.name, symbol: asp.symbol, exact: asp.angle, orb: Math.abs(diff - asp.angle) };
      }
    }
    return null;
  }

  // Mondphase (rein synodisch, wie AEVARANNA – Referenz-Neumond 06.01.2000)
  function moonPhase(date) {
    const synodic = 29.53058867;
    const refNewMoon = Date.UTC(2000, 0, 6, 18, 14) / 86400000;
    const days = date.getTime() / 86400000 - refNewMoon;
    let age = days % synodic;
    if (age < 0) age += synodic;
    const illumination = (1 - Math.cos((age / synodic) * 2 * Math.PI)) / 2;
    let phaseName;
    if (age < 1.84566) phaseName = 'Neumond';
    else if (age < 5.53699) phaseName = 'Zunehmende Sichel';
    else if (age < 9.22831) phaseName = 'Erstes Viertel';
    else if (age < 12.91963) phaseName = 'Zunehmender Mond';
    else if (age < 16.61096) phaseName = 'Vollmond';
    else if (age < 20.30228) phaseName = 'Abnehmender Mond';
    else if (age < 23.99361) phaseName = 'Letztes Viertel';
    else if (age < 27.68493) phaseName = 'Abnehmende Sichel';
    else phaseName = 'Neumond';
    return { age: age, illumination: illumination, phaseName: phaseName, synodic: synodic };
  }

  // Rückläufigkeit: vergleicht die ekliptikale Länge von heute mit morgen (scheinbare Bewegungsrichtung)
  function retrogradeStatus(date) {
    const d0 = daysSinceEpoch(date);
    const d1 = d0 + 1;
    const sun0 = sunPosition(d0);
    const sun1 = sunPosition(d1);
    const result = {};
    ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].forEach(function (body) {
      const p0 = planetPosition(body, d0, sun0);
      const p1 = planetPosition(body, d1, sun1);
      result[GERMAN[body]] = angleDiffSigned(p1.lon, p0.lon) < 0;
    });
    return result;
  }

  // Äquatoriale Koordinaten (RA/Dec) aus ekliptikalen Koordinaten (Länge/Breite), allgemein für jeden Körper
  function equatorialFromEcliptic(lonDeg, latDeg, date) {
    const d = daysSinceEpoch(date);
    const eps = obliquity(d);
    const ra = norm360(atan2d(
      sind(lonDeg) * cosd(eps) - tand(latDeg) * sind(eps),
      cosd(lonDeg)
    ));
    const dec = asind(sind(latDeg) * cosd(eps) + cosd(latDeg) * sind(eps) * sind(lonDeg));
    return { ra: ra, dec: dec };
  }

  // Horizontkoordinaten (Höhe/Azimut) aus RA/Dec für einen Beobachterort und Zeitpunkt
  // Azimut: 0°=Nord, 90°=Ost, 180°=Süd, 270°=West (Standardkonvention)
  function altAz(raDeg, decDeg, date, obsLatDeg, obsLonDeg) {
    const lst = norm360(gmst(date) + obsLonDeg);
    const ha = norm360(lst - raDeg);
    const alt = asind(sind(obsLatDeg) * sind(decDeg) + cosd(obsLatDeg) * cosd(decDeg) * cosd(ha));
    let az = atan2d(
      -sind(ha),
      cosd(obsLatDeg) * tand(decDeg) - sind(obsLatDeg) * cosd(ha)
    );
    az = norm360(az);
    return { alt: alt, az: az };
  }

  // Sucht den Zeitpunkt, an dem die Sonne eine bestimmte ekliptikale Länge erreicht
  // (0°=Frühlingsäquinoktium, 90°=Sommersonnenwende, 180°=Herbstäquinoktium, 270°=Wintersonnenwende, Nordhalbkugel)
  function findSolarLongitudeCrossing(year, targetLonDeg) {
    const dayOfYear = (79.5 + targetLonDeg * (365.2422 / 360)) % 365.2422;
    let date = new Date(Date.UTC(year, 0, 1, 0, 0, 0) + dayOfYear * 86400000);
    for (let i = 0; i < 8; i++) {
      const d = daysSinceEpoch(date);
      const sun = sunPosition(d);
      const diff = angleDiffSigned(targetLonDeg, sun.lon);
      date = new Date(date.getTime() + (diff / 0.9856) * 86400000);
    }
    return date;
  }

  global.AstroEngine = {
    computePositions: computePositions,
    lonToSign: lonToSign,
    SIGNS: SIGNS,
    ascendantMC: ascendantMC,
    equalHouses: equalHouses,
    houseOfLongitude: houseOfLongitude,
    findAspect: findAspect,
    angleDiff: angleDiff,
    angleDiffSigned: angleDiffSigned,
    moonPhase: moonPhase,
    toJulianDate: toJulianDate,
    obliquity: obliquity,
    sunEquatorial: sunEquatorial,
    sunTimes: sunTimes,
    retrogradeStatus: retrogradeStatus,
    equatorialFromEcliptic: equatorialFromEcliptic,
    altAz: altAz,
    findSolarLongitudeCrossing: findSolarLongitudeCrossing,
    ASPECTS: ASPECTS
  };
})(typeof window !== 'undefined' ? window : globalThis);
