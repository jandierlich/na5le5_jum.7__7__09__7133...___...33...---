/*
 * SterneWahr – Astronomie-Rechenkern
 * Eigenständig, ohne externe Abhängigkeiten, läuft im Browser und in Node.
 *
 * Verfahren (veröffentlichte Literatur):
 *  - Sonne, Mond (gekürzte Reihen), Nutation, Präzession, Sternzeit, Parallaxe,
 *    Refraktion: Jean Meeus, "Astronomical Algorithms", 2. Aufl. (Willmann-Bell)
 *  - Planeten: Keplersche Bahnelemente aus E. M. Standish, "Keplerian Elements
 *    for Approximate Positions of the Major Planets" (JPL/NASA, Tabellen 1 und 2a)
 *  - Delta T: Polynome nach F. Espenak / J. Meeus (NASA)
 * Alle Formeln sind mathematische Verfahren; es wird kein fremder Quellcode verwendet.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Astro = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PI = Math.PI, D2R = PI / 180, R2D = 180 / PI;
  const mod = (x, m) => ((x % m) + m) % m;
  const n360 = x => mod(x, 360);
  const sin = x => Math.sin(x * D2R), cos = x => Math.cos(x * D2R), tan = x => Math.tan(x * D2R);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  /* ---------------------------------------------------------------- Zeit */
  const UNIX_JD = 2440587.5;
  const toJD = d => (d instanceof Date ? d.getTime() : d) / 86400000 + UNIX_JD;
  const fromJD = jd => new Date((jd - UNIX_JD) * 86400000);

  function deltaT(jd) { // Sekunden (TT - UT)
    const y = 2000 + (jd - 2451544.5) / 365.2425;
    let t;
    if (y < 1860) { t = (y - 1820) / 100; return -20 + 32 * t * t; }
    if (y < 1900) { t = y - 1860; return 7.62 + 0.5737 * t - 0.251754 * t * t + 0.01680668 * t ** 3 - 0.0004473624 * t ** 4 + t ** 5 / 233174; }
    if (y < 1920) { t = y - 1900; return -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t ** 3 - 0.000197 * t ** 4; }
    if (y < 1941) { t = y - 1920; return 21.20 + 0.84493 * t - 0.076100 * t * t + 0.0020936 * t ** 3; }
    if (y < 1961) { t = y - 1950; return 29.07 + 0.407 * t - t * t / 233 + t ** 3 / 2547; }
    if (y < 1986) { t = y - 1975; return 45.45 + 1.067 * t - t * t / 260 - t ** 3 / 718; }
    if (y < 2005) { t = y - 2000; return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t ** 3 + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5; }
    if (y < 2050) { t = y - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t; }
    if (y < 2150) return -20 + 32 * ((y - 1820) / 100) ** 2 - 0.5628 * (2150 - y);
    t = (y - 1820) / 100; return -20 + 32 * t * t;
  }
  const toTT = jd => jd + deltaT(jd) / 86400;
  const centuries = jdtt => (jdtt - 2451545) / 36525;

  /* ------------------------------------------- Grundgrößen der Erde/Ekliptik */
  function meanObliquity(T) { return 23.439291111 - 0.013004167 * T - 0.000000164 * T * T + 0.000000504 * T ** 3; }
  function nutation(T) { // Grad, niedrige Genauigkeit (~0,5")
    const Om = 125.04452 - 1934.136261 * T, L = 280.4665 + 36000.7698 * T, Lp = 218.3165 + 481267.8813 * T;
    const dpsi = -17.20 * sin(Om) - 1.32 * sin(2 * L) - 0.23 * sin(2 * Lp) + 0.21 * sin(2 * Om);
    const deps = 9.20 * cos(Om) + 0.57 * cos(2 * L) + 0.10 * cos(2 * Lp) - 0.09 * cos(2 * Om);
    return { dpsi: dpsi / 3600, deps: deps / 3600 };
  }
  function gmst(jd) { // mittlere Greenwich-Sternzeit in Grad (jd = UT)
    const T = (jd - 2451545) / 36525;
    return n360(280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * T * T - T ** 3 / 38710000);
  }
  function lst(jd, lonDeg) { // wahre lokale Sternzeit in Grad
    const T = centuries(toTT(jd));
    const nu = nutation(T);
    return n360(gmst(jd) + nu.dpsi * cos(meanObliquity(T) + nu.deps) + lonDeg);
  }

  /* -------------------------------------------------------------- Vektoren */
  const vec = (ra, dec) => [cos(dec) * cos(ra), cos(dec) * sin(ra), sin(dec)];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = a => Math.hypot(a[0], a[1], a[2]);
  const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const toRaDec = v => ({ ra: n360(Math.atan2(v[1], v[0]) * R2D), dec: Math.asin(clamp(v[2] / len(v), -1, 1)) * R2D });
  const angSep = (a, b) => Math.atan2(len(cross(a, b)), dot(a, b)) * R2D;

  function precessionMatrix(T) { // J2000 -> Äquator des Datums, T in Jahrhunderten
    const zeta = (2306.2181 * T + 0.30188 * T * T + 0.017998 * T ** 3) / 3600 * D2R;
    const z = (2306.2181 * T + 1.09468 * T * T + 0.018203 * T ** 3) / 3600 * D2R;
    const th = (2004.3109 * T - 0.42665 * T * T - 0.041833 * T ** 3) / 3600 * D2R;
    const cz = Math.cos(zeta), sz = Math.sin(zeta), cZ = Math.cos(z), sZ = Math.sin(z), ct = Math.cos(th), st = Math.sin(th);
    const A = [[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]];
    const B = [[ct, 0, -st], [0, 1, 0], [st, 0, ct]];
    const C = [[cZ, -sZ, 0], [sZ, cZ, 0], [0, 0, 1]];
    return mul3(C, mul3(B, A));
  }
  function mul3(a, b) {
    const r = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i][j] = a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j];
    return r;
  }
  const mulv = (m, v) => [m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2], m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2], m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]];

  // Äquatorialer Einheitsvektor (des Datums) -> lokaler Horizontvektor (Ost, Nord, Zenit)
  function eqToEnu(v, lstDeg, latDeg) {
    const cl = cos(lstDeg), sl = sin(lstDeg), sp = sin(latDeg), cp = cos(latDeg);
    const xh = v[0] * cl + v[1] * sl, yh = v[0] * sl - v[1] * cl, zh = v[2];
    return [-yh, zh * cp - xh * sp, zh * sp + xh * cp];
  }
  function enuToAltAz(e) { return { alt: Math.asin(clamp(e[2], -1, 1)) * R2D, az: n360(Math.atan2(e[0], e[1]) * R2D) }; }
  function altAzToEnu(alt, az) { return [cos(alt) * sin(az), cos(alt) * cos(az), sin(alt)]; }

  function refraction(altDeg) { // Bennett, in Grad; nur für sichtbare Höhen sinnvoll
    if (altDeg < -1.9) return 0;
    const h = Math.max(altDeg, -1.9);
    return (1 / Math.tan((h + 7.31 / (h + 4.4)) * D2R)) / 60 * (altDeg < -1 ? clamp((altDeg + 1.9) / 0.9, 0, 1) : 1);
  }

  /* ---------------------------------------------------------------- Sonne */
  function sun(jdUT) {
    const jde = toTT(jdUT), T = centuries(jde);
    const L0 = n360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
    const M = n360(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
    const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
    const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M) + (0.019993 - 0.000101 * T) * sin(2 * M) + 0.000289 * sin(3 * M);
    const trueLon = L0 + C, v = M + C;
    const R = 1.000001018 * (1 - e * e) / (1 + e * cos(v));
    const Om = 125.04 - 1934.136 * T;
    const lon = trueLon - 0.00569 - 0.00478 * sin(Om);
    const eps = meanObliquity(T) + 0.00256 * cos(Om);
    const ra = n360(Math.atan2(cos(eps) * sin(lon), cos(lon)) * R2D);
    const dec = Math.asin(sin(eps) * sin(lon)) * R2D;
    return { ra, dec, lon: n360(lon), dist: R, radius: 0.2666 / R, v: vec(ra, dec) };
  }

  /* ----------------------------------------------------------------- Mond */
  // Spalten: D, M, M', F, Σl, Σr
  const MOON_LR = [
    [0, 0, 1, 0, 6288774, -20905355], [2, 0, -1, 0, 1274027, -3699111], [2, 0, 0, 0, 658314, -2955968], [0, 0, 2, 0, 213618, -569925],
    [0, 1, 0, 0, -185116, 48888], [0, 0, 0, 2, -114332, -3149], [2, 0, -2, 0, 58793, 246158], [2, -1, -1, 0, 57066, -152138],
    [2, 0, 1, 0, 53322, -170733], [2, -1, 0, 0, 45758, -204586], [0, 1, -1, 0, -40923, -129620], [1, 0, 0, 0, -34720, 108743],
    [0, 1, 1, 0, -30383, 104755], [2, 0, 0, -2, 15327, 10321], [0, 0, 1, 2, -12528, 0], [0, 0, 1, -2, 10980, 79661],
    [4, 0, -1, 0, 10675, -34782], [0, 0, 3, 0, 10034, -23210], [4, 0, -2, 0, 8548, -21636], [2, 1, -1, 0, -7888, 24208],
    [2, 1, 0, 0, -6766, 30824], [1, 0, -1, 0, -5163, -8379], [1, 1, 0, 0, 4987, -16675], [2, -1, 1, 0, 4036, -12831],
    [2, 0, 2, 0, 3994, -10445], [4, 0, 0, 0, 3861, -11650], [2, 0, -3, 0, 3665, 14403], [0, 1, -2, 0, -2689, -7003],
    [2, 0, -1, 2, -2602, 0], [2, -1, -2, 0, 2390, 10056], [1, 0, 1, 0, -2348, 6322], [2, -2, 0, 0, 2236, -9884],
    [0, 1, 2, 0, -2120, 5751], [0, 2, 0, 0, -2069, 0], [2, -2, -1, 0, 2048, -4950], [2, 0, 1, -2, -1773, 4130],
    [2, 0, 0, 2, -1595, 0], [4, -1, -1, 0, 1215, -3958], [0, 0, 2, 2, -1110, 0], [3, 0, -1, 0, -892, 3258],
    [2, 1, 1, 0, -810, 2616], [4, -1, -2, 0, 759, -1897], [0, 2, -1, 0, -713, -2117], [2, 2, -1, 0, -700, 2354],
    [2, 1, -2, 0, 691, 0], [2, -1, 0, -2, 596, 0], [4, 0, 1, 0, 549, -1423], [0, 0, 4, 0, 537, -1117],
    [4, -1, 0, 0, 520, -1571], [1, 0, -2, 0, -487, -1739], [2, 1, 0, -2, -399, 0], [0, 0, 2, -2, -381, -4421],
    [1, 1, 1, 0, 351, 0], [3, 0, -2, 0, -340, 0], [4, 0, -3, 0, 330, 0], [2, -1, 2, 0, 327, 0],
    [0, 2, 1, 0, -323, 1165], [1, 1, -1, 0, 299, 0], [2, 0, 3, 0, 294, 0], [2, 0, -1, -2, 0, 8752]
  ];
  // Spalten: D, M, M', F, Σb
  const MOON_B = [
    [0, 0, 0, 1, 5128122], [0, 0, 1, 1, 280602], [0, 0, 1, -1, 277693], [2, 0, 0, -1, 173237], [2, 0, -1, 1, 55413],
    [2, 0, -1, -1, 46271], [2, 0, 0, 1, 32573], [0, 0, 2, 1, 17198], [2, 0, 1, -1, 9266], [0, 0, 2, -1, 8822],
    [2, -1, 0, -1, 8216], [2, 0, -2, -1, 4324], [2, 0, 1, 1, 4200], [2, 1, 0, -1, -3359], [2, -1, -1, 1, 2463],
    [2, -1, 0, 1, 2211], [2, -1, -1, -1, 2065], [0, 1, -1, -1, -1870], [4, 0, -1, -1, 1828], [0, 1, 0, 1, -1794],
    [0, 0, 0, 3, -1749], [0, 1, -1, 1, -1565], [1, 0, 0, 1, -1491], [0, 1, 1, 1, -1475], [0, 1, 1, -1, -1410],
    [0, 1, 0, -1, -1344], [1, 0, 0, -1, -1335], [0, 0, 3, 1, 1107], [4, 0, 0, -1, 1021], [4, 0, -1, 1, 833],
    [0, 0, 1, -3, 777], [4, 0, -2, 1, 671], [2, 0, 0, -3, 607], [2, 0, 2, -1, 596], [2, -1, 1, -1, 491],
    [2, 0, -2, 1, -451], [0, 0, 3, -1, 439], [2, 0, 2, 1, 422], [2, 0, -3, -1, 421], [2, 1, -1, 1, -366],
    [2, 1, 0, 1, -351], [4, 0, 0, 1, 331], [2, -1, 1, 1, 315], [2, -2, 0, -1, 302], [0, 0, 1, 3, -283],
    [2, 1, 1, -1, -229], [1, 1, 0, -1, 223], [1, 1, 0, 1, 223], [0, 1, -2, -1, -220], [2, 1, -1, -1, -220],
    [1, 0, 1, 1, -185], [2, -1, -2, -1, 181], [0, 1, 2, 1, -177], [4, 0, -2, -1, 176], [4, -1, -1, -1, 166],
    [1, 0, 1, -1, -164], [4, 0, 1, -1, 132], [1, 0, -1, -1, -119], [4, -1, 0, -1, 115], [2, -2, 0, 1, 107]
  ];

  // Geozentrische ekliptikale Mondposition (mittleres Äquinoktium des Datums), t = TT
  function moonEcliptic(jde) {
    const T = centuries(jde);
    const Lp = n360(218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + T ** 3 / 538841 - T ** 4 / 65194000);
    const D = n360(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + T ** 3 / 545868 - T ** 4 / 113065000);
    const M = n360(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + T ** 3 / 24490000);
    const Mp = n360(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + T ** 3 / 69699 - T ** 4 / 14712000);
    const F = n360(93.2720950 + 483202.0175233 * T - 0.0036539 * T * T - T ** 3 / 3526000 + T ** 4 / 863310000);
    const A1 = n360(119.75 + 131.849 * T), A2 = n360(53.09 + 479264.290 * T), A3 = n360(313.45 + 481266.484 * T);
    const E = 1 - 0.002516 * T - 0.0000074 * T * T;
    let sl = 0, sr = 0, sb = 0;
    for (const t of MOON_LR) {
      const arg = t[0] * D + t[1] * M + t[2] * Mp + t[3] * F;
      const f = t[1] === 0 ? 1 : (Math.abs(t[1]) === 1 ? E : E * E);
      sl += t[4] * f * sin(arg); sr += t[5] * f * cos(arg);
    }
    for (const t of MOON_B) {
      const arg = t[0] * D + t[1] * M + t[2] * Mp + t[3] * F;
      const f = t[1] === 0 ? 1 : (Math.abs(t[1]) === 1 ? E : E * E);
      sb += t[4] * f * sin(arg);
    }
    sl += 3958 * sin(A1) + 1962 * sin(Lp - F) + 318 * sin(A2);
    sb += -2235 * sin(Lp) + 382 * sin(A3) + 175 * sin(A1 - F) + 175 * sin(A1 + F) + 127 * sin(Lp - Mp) - 115 * sin(Lp + Mp);
    return { lon: n360(Lp + sl / 1e6), lat: sb / 1e6, dist: 385000.56 + sr / 1000, T };
  }

  function moon(jdUT) {
    const jde = toTT(jdUT);
    const m = moonEcliptic(jde), T = m.T, nu = nutation(T);
    const lon = m.lon + nu.dpsi, eps = meanObliquity(T) + nu.deps;
    const ra = n360(Math.atan2(sin(lon) * cos(eps) - tan(m.lat) * sin(eps), cos(lon)) * R2D);
    const dec = Math.asin(clamp(sin(m.lat) * cos(eps) + cos(m.lat) * sin(eps) * sin(lon), -1, 1)) * R2D;
    return { ra, dec, lon: n360(lon), lat: m.lat, dist: m.dist, parallax: Math.asin(6378.14 / m.dist) * R2D, radius: Math.asin(1737.4 / m.dist) * R2D, v: vec(ra, dec) };
  }

  // Topozentrische Korrektur (Parallaxe) nach Meeus Kap. 40
  function topocentric(ra, dec, distKm, lstDeg, latDeg, elevM) {
    const sinPi = 6378.14 / distKm;
    const u = Math.atan(0.99664719 * tan(latDeg));
    const h = (elevM || 0) / 6378140;
    const rs = 0.99664719 * Math.sin(u) + h * sin(latDeg);
    const rc = Math.cos(u) + h * cos(latDeg);
    const H = lstDeg - ra;
    const dA = Math.atan2(-rc * sinPi * sin(H), cos(dec) - rc * sinPi * cos(H));
    const dec2 = Math.atan2((sin(dec) - rs * sinPi) * Math.cos(dA), cos(dec) - rc * sinPi * cos(H)) * R2D;
    return { ra: n360(ra + dA * R2D), dec: dec2 };
  }

  /* ------------------------------------------------------------- Planeten */
  // a, e, I, L, ϖ, Ω und Änderung pro Jahrhundert (Standish/JPL)
  const ELEM1 = { // gültig 1800–2050
    mercury: [0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593, 0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081],
    venus: [0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255, 0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418],
    earth: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0, 0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0],
    mars: [1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891, 0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
    jupiter: [5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909, -0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106],
    saturn: [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448, -0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794],
    uranus: [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503, -0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589],
    neptune: [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574, 0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664]
  };
  const ELEM2 = { // gültig 3000 v. Chr. – 3000 n. Chr. (mit Zusatztermen b, c, s, f für Jupiter–Neptun)
    mercury: [0.38709843, 0.20563661, 7.00559432, 252.25166724, 77.45771895, 48.33961819, 0.00000000, 0.00002123, -0.00590158, 149472.67486623, 0.15940013, -0.12214182],
    venus: [0.72332102, 0.00676399, 3.39777545, 181.97970850, 131.76755713, 76.67261496, 0.00000026, -0.00005107, 0.00043494, 58517.81560260, 0.05679648, -0.27274174],
    earth: [1.00000018, 0.01673163, -0.00054346, 100.46691572, 102.93005885, -5.11260389, -0.00000003, -0.00003661, -0.01337178, 35999.37306329, 0.31795260, -0.24123856],
    mars: [1.52371243, 0.09336511, 1.85181869, -4.56813164, -23.91744784, 49.71320984, 0.00000097, 0.00009149, -0.00724757, 19140.29934243, 0.45223625, -0.26852431],
    jupiter: [5.20248019, 0.04853590, 1.29861416, 34.33479152, 14.27495244, 100.29282654, -0.00002864, 0.00018026, -0.00322699, 3034.90371757, 0.18199196, 0.13024619, -0.00012452, 0.06064060, -0.35635438, 38.35125000],
    saturn: [9.54149883, 0.05550825, 2.49424102, 50.07571329, 92.86136063, 113.63998702, -0.00003065, -0.00032044, 0.00451969, 1222.11494724, 0.54179478, -0.25015002, 0.00025899, -0.13434469, 0.87320147, 38.35125000],
    uranus: [19.18797948, 0.04685740, 0.77298127, 314.20276625, 172.43404441, 73.96250215, -0.00020455, -0.00001550, -0.00180155, 428.49512595, 0.09266985, 0.05739699, 0.00058331, -0.97731848, 0.17689245, 7.67025000],
    neptune: [30.06952752, 0.00895439, 1.77005520, 304.22289287, 46.68158724, 131.78635853, 0.00006447, 0.00000818, 0.00022400, 218.46515314, 0.01009938, -0.00606302, -0.00041348, 0.68346318, -0.10162547, 7.67025000]
  };
  const PLANETS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
  const EPS2000 = 23.43928;

  function helio(name, T, tableSel) { // heliozentrisch, ekliptikal J2000, AU
    const useTab1 = tableSel === 1 || (tableSel === undefined && T > -2 && T < 0.5);
    const el = (useTab1 ? ELEM1 : ELEM2)[name];
    const a = el[0] + el[6] * T, e = el[1] + el[7] * T, I = el[2] + el[8] * T;
    const L = el[3] + el[9] * T, wbar = el[4] + el[10] * T, Om = el[5] + el[11] * T;
    const w = wbar - Om;
    let M = L - wbar;
    if (el.length > 12) M += el[12] * T * T + el[13] * cos(el[15] * T) + el[14] * sin(el[15] * T);
    M = mod(M + 180, 360) - 180;
    const Mr = M * D2R;
    let E = Mr + e * Math.sin(Mr);
    for (let i = 0; i < 12; i++) { const d = (E - e * Math.sin(E) - Mr) / (1 - e * Math.cos(E)); E -= d; if (Math.abs(d) < 1e-11) break; }
    const xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
    const cw = cos(w), sw = sin(w), cO = cos(Om), sO = sin(Om), cI = cos(I), sI = sin(I);
    return [
      (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
      (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
      (sw * sI) * xp + (cw * sI) * yp
    ];
  }
  const eclToEq2000 = v => [v[0], v[1] * cos(EPS2000) - v[2] * sin(EPS2000), v[1] * sin(EPS2000) + v[2] * cos(EPS2000)];

  const PLANET_MAG = { // H, Koeffizienten (Astronomical Almanac / Meeus)
    mercury: (rd, i) => -0.42 + 5 * Math.log10(rd) + 0.0380 * i - 0.000273 * i * i + 0.000002 * i ** 3,
    venus: (rd, i) => -4.40 + 5 * Math.log10(rd) + 0.0009 * i + 0.000239 * i * i - 0.00000065 * i ** 3,
    mars: (rd, i) => -1.52 + 5 * Math.log10(rd) + 0.016 * i,
    jupiter: (rd, i) => -9.40 + 5 * Math.log10(rd) + 0.005 * i,
    saturn: (rd, i, ringB) => -8.88 + 5 * Math.log10(rd) + 0.044 * i - 2.60 * Math.abs(sin(ringB)) + 1.25 * sin(ringB) ** 2,
    uranus: (rd) => -7.19 + 5 * Math.log10(rd),
    neptune: (rd) => -6.87 + 5 * Math.log10(rd)
  };
  const SATURN_POLE = vec(40.589, 83.537); // Rotationspol (J2000)

  // Geozentrische Position eines Planeten (Äquator J2000 und des Datums)
  function planet(name, jdUT, tableSel) {
    const jde = toTT(jdUT), T = centuries(jde);
    const earth = helio('earth', T, tableSel);
    let tau = 0, p, g;
    for (let k = 0; k < 3; k++) {
      p = helio(name, T - tau / 36525, tableSel);
      g = [p[0] - earth[0], p[1] - earth[1], p[2] - earth[2]];
      tau = len(g) * 0.0057755183;
    }
    const delta = len(g), r = len(p), R = len(earth);
    const eq2000 = eclToEq2000(g);
    const vDate = norm(mulv(precessionMatrix(T), eq2000));
    const rd = toRaDec(vDate);
    const cosI = clamp((r * r + delta * delta - R * R) / (2 * r * delta), -1, 1);
    const phaseAngle = Math.acos(cosI) * R2D;
    const sunV = sun(jdUT).v;
    const elong = angSep(vDate, sunV);
    let ringB = 0;
    if (name === 'saturn') ringB = Math.asin(clamp(-dot(norm(eq2000), SATURN_POLE), -1, 1)) * R2D;
    const mag = PLANET_MAG[name](r * delta, phaseAngle, ringB);
    return { name, ra: rd.ra, dec: rd.dec, dist: delta, helioDist: r, phaseAngle, illum: (1 + cosI) / 2, elong, mag, ringB, v: vDate };
  }

  /* --------------------------------------------- Galaktische Koordinaten */
  const GAL = { raG: 192.85948, decG: 27.12825, lNCP: 122.93192 };
  function galToEq2000(l, b) { // Grad -> RA/Dec J2000
    const th = GAL.lNCP - l;
    const sd = sin(GAL.decG) * sin(b) + cos(GAL.decG) * cos(b) * cos(th);
    const dec = Math.asin(clamp(sd, -1, 1)) * R2D;
    const y = cos(b) * sin(th);
    const x = cos(GAL.decG) * sin(b) - sin(GAL.decG) * cos(b) * cos(th);
    return { ra: n360(GAL.raG + Math.atan2(y, x) * R2D), dec };
  }

  /* ---------------------------------------------------- Zustand des Himmels */
  // Gibt für einen Zeitpunkt Sonne, Mond, Planeten in Horizontkoordinaten aus.
  function skyState(jdUT, latDeg, lonDeg, elevM) {
    const ls = lst(jdUT, lonDeg);
    const T = centuries(toTT(jdUT));
    const out = { jd: jdUT, lst: ls, T, lat: latDeg, lon: lonDeg };
    const place = (o, r) => {
      const e = eqToEnu(vec(r.ra, r.dec), ls, latDeg);
      const aa = enuToAltAz(e);
      const appAlt = aa.alt + refraction(aa.alt);
      o.trueAlt = aa.alt; o.alt = appAlt; o.az = aa.az;
      o.enu = altAzToEnu(appAlt, aa.az);
      return o;
    };
    const s = sun(jdUT);
    out.sun = place({ name: 'sun', ra: s.ra, dec: s.dec, dist: s.dist, radius: s.radius, lon: s.lon, v: s.v, mag: -26.7 }, s);
    const m = moon(jdUT);
    const tc = topocentric(m.ra, m.dec, m.dist, ls, latDeg, elevM);
    const sunMoonSep = angSep(m.v, s.v);
    const psi = sunMoonSep * D2R;
    const iAng = Math.atan2(s.dist * 149597870.7 * Math.sin(psi), m.dist - s.dist * 149597870.7 * Math.cos(psi)) * R2D;
    out.moon = place({ name: 'moon', ra: tc.ra, dec: tc.dec, gra: m.ra, gdec: m.dec, dist: m.dist, radius: m.radius, parallax: m.parallax, lon: m.lon, lat: m.lat, elong: sunMoonSep, phaseAngle: iAng, illum: (1 + cos(iAng)) / 2, phase: n360(m.lon - s.lon), v: vec(tc.ra, tc.dec), mag: -12.7 }, tc);
    out.planets = PLANETS.map(n => { const p = planet(n, jdUT); return place(p, p); });
    return out;
  }

  /* --------------------------------------------------------- Ereignissuche */
  function bisect(f, a, b, iters) {
    let fa = f(a);
    for (let i = 0; i < (iters || 40); i++) { const m = (a + b) / 2, fm = f(m); if ((fa <= 0) === (fm <= 0)) { a = m; fa = fm; } else b = m; }
    return (a + b) / 2;
  }
  // Nächste Mondphase (0 Neumond, 90 erstes Viertel, 180 Vollmond, 270 letztes Viertel) ab jd (vorwärts oder rückwärts)
  function moonPhaseTime(jd, target, dir) {
    dir = dir || 1;
    const f = t => mod(n360(moon(t).lon - sun(t).lon) - target + 180, 360) - 180;
    const step = 0.25 * dir;
    let t = jd, prev = f(t);
    for (let i = 0; i < 140; i++) {
      const t2 = t + step, cur = f(t2);
      // Nulldurchgang (Phase läuft vorwärts: - nach +), nicht der Sprung bei ±180
      const crossed = dir > 0 ? (prev < 0 && cur >= 0) : (prev >= 0 && cur < 0);
      if (crossed && Math.abs(cur - prev) < 90) {
        const a = Math.min(t, t2), b = Math.max(t, t2);
        return bisect(f, a, b, 44);
      }
      t = t2; prev = cur;
    }
    return null;
  }
  // Auf-/Untergang: body = 'sun' | 'moon' | Planetenname | Funktion t -> {ra, dec} (Äquator des Datums)
  // dir=+1 nächster, -1 vorheriger; kind 'rise'|'set'
  function riseSet(body, jd, latDeg, lonDeg, kind, dir) {
    dir = dir || 1;
    const alt = t => {
      let ra, dec, h0 = -0.5667;
      if (typeof body === 'function') { const p = body(t); ra = p.ra; dec = p.dec; }
      else if (body === 'sun') { const s = sun(t); ra = s.ra; dec = s.dec; h0 = -0.8333; }
      else if (body === 'moon') { const m = moon(t); const tc = topocentric(m.ra, m.dec, m.dist, lst(t, lonDeg), latDeg, 0); ra = tc.ra; dec = tc.dec; }
      else { const p = planet(body, t); ra = p.ra; dec = p.dec; }
      return enuToAltAz(eqToEnu(vec(ra, dec), lst(t, lonDeg), latDeg)).alt - h0;
    };
    const step = (10 / 1440) * dir;
    let t = jd, prev = alt(t);
    for (let i = 0; i < 150; i++) {
      const t2 = t + step, cur = alt(t2);
      const rising = prev < 0 && cur >= 0, setting = prev >= 0 && cur < 0;
      if ((kind === 'rise' && rising) || (kind === 'set' && setting)) return bisect(alt, Math.min(t, t2), Math.max(t, t2), 36);
      t = t2; prev = cur;
    }
    return null;
  }
  // Höchststand (Kulmination) innerhalb von 24 h ab jd: { jd, alt }
  function culmination(body, jd, latDeg, lonDeg) {
    const altf = t => {
      let ra, dec;
      if (typeof body === 'function') { const p = body(t); ra = p.ra; dec = p.dec; }
      else if (body === 'sun') { const s = sun(t); ra = s.ra; dec = s.dec; }
      else if (body === 'moon') { const m = moon(t); const tc = topocentric(m.ra, m.dec, m.dist, lst(t, lonDeg), latDeg, 0); ra = tc.ra; dec = tc.dec; }
      else { const p = planet(body, t); ra = p.ra; dec = p.dec; }
      return enuToAltAz(eqToEnu(vec(ra, dec), lst(t, lonDeg), latDeg)).alt;
    };
    let best = -1e9, bt = jd;
    for (let i = 0; i <= 288; i++) { const t = jd + i / 288; const a = altf(t); if (a > best) { best = a; bt = t; } }
    let lo = bt - 1 / 288, hi = bt + 1 / 288;
    for (let i = 0; i < 30; i++) { const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3; if (altf(m1) < altf(m2)) lo = m1; else hi = m2; }
    bt = (lo + hi) / 2;
    return { jd: bt, alt: altf(bt) };
  }
  // Katalogstern (J2000) -> RA/Dek des Datums
  function starRaDec(ra2000, dec2000, jd) {
    const M = precessionMatrix(centuries(toTT(jd)));
    return toRaDec(mulv(M, vec(ra2000, dec2000)));
  }

  /* ------------------------------------------------------ Finsternisse */
  // Geometrie einer Mondfinsternis zum Zeitpunkt jd (geozentrisch, Danjon-Vergrößerung 1,02)
  function lunarEclipseGeom(jd) {
    const s = sun(jd), m = moon(jd);
    const d = angSep(m.v, vec(n360(s.ra + 180), -s.dec));
    const pis = 0.002443 / s.dist;
    const Ru = 1.02 * (m.parallax + pis - s.radius), Rp = 1.02 * (m.parallax + pis + s.radius), rm = m.radius;
    return { d, Ru, Rp, rm, umbral: (Ru + rm - d) / (2 * rm), penumbral: (Rp + rm - d) / (2 * rm) };
  }
  function minimize(f, a, b, it) { for (let i = 0; i < (it || 40); i++) { const m1 = a + (b - a) / 3, m2 = b - (b - a) / 3; if (f(m1) < f(m2)) b = m2; else a = m1; } return (a + b) / 2; }
  // Nächste Mondfinsternis (mind. Halbschatten-Größe 0,15) ab jd, dir = +1/-1
  function nextLunarEclipse(jd, dir, maxYears) {
    dir = dir || 1; let t = jd;
    for (let i = 0; i < (maxYears || 4) * 13; i++) {
      const fm = moonPhaseTime(t, 180, dir); if (!fm) return null;
      const g0 = lunarEclipseGeom(fm);
      if (g0.penumbral > 0) {
        const tm = minimize(x => lunarEclipseGeom(x).d, fm - 0.25, fm + 0.25);
        const g = lunarEclipseGeom(tm);
        if (g.penumbral > 0.15) {
          const kind = g.umbral >= 1 ? 'total' : (g.umbral > 0 ? 'partial' : 'penumbral');
          // Kontakte der Kernschattenphase (U1..U4)
          const cont = (lim) => { const f = x => { const q = lunarEclipseGeom(x); return q.d - lim(q); }; return [bisectRoot(f, tm - 0.3, tm), bisectRoot(f, tm, tm + 0.3)]; };
          const umb = g.umbral > 0 ? cont(q => q.Ru + q.rm) : null;
          const tot = g.umbral >= 1 ? cont(q => q.Ru - q.rm) : null;
          return { jd: tm, kind, umbral: g.umbral, penumbral: g.penumbral, partial: umb, total: tot };
        }
      }
      t = fm + dir * 2;
    }
    return null;
  }
  function bisectRoot(f, a, b) { let fa = f(a); if ((fa <= 0) === (f(b) <= 0)) return null; for (let i = 0; i < 40; i++) { const m = (a + b) / 2, fm = f(m); if ((fa <= 0) === (fm <= 0)) { a = m; fa = fm; } else b = m; } return (a + b) / 2; }
  // Topozentrischer Abstand Sonne–Mond und Sonnenhöhe an einem Ort
  function sunMoonLocal(jd, lat, lon) {
    const s = sun(jd), m = moon(jd), ls = lst(jd, lon);
    const tc = topocentric(m.ra, m.dec, m.dist, ls, lat, 0);
    const alt = enuToAltAz(eqToEnu(s.v, ls, lat)).alt;
    return { sep: angSep(vec(tc.ra, tc.dec), s.v), rs: s.radius, rm: Math.asin(1737.4 / m.dist) * R2D * (1 + sin(enuToAltAz(eqToEnu(vec(tc.ra, tc.dec), ls, lat)).alt) * 6378 / m.dist), alt };
  }
  // Nächste am Ort sichtbare Sonnenfinsternis (Sonne über Horizont) ab jd
  function nextLocalSolarEclipse(jd, lat, lon, maxYears) {
    let t = jd;
    for (let i = 0; i < (maxYears || 12) * 13; i++) {
      const nm = moonPhaseTime(t, 0, 1); if (!nm) return null;
      // grobe Vorprüfung: Mondbreite muss klein sein
      const me = moonEcliptic(toTT(nm));
      if (Math.abs(me.lat) < 1.6) {
        let best = null;
        for (let k = -80; k <= 80; k++) {
          const x = nm + k * 4 / 1440, q = sunMoonLocal(x, lat, lon);
          if (q.alt > -0.8 && q.sep < q.rs + q.rm) { if (!best || q.sep < best.sep) best = { t: x, sep: q.sep }; }
        }
        if (best) {
          const f = x => { const q = sunMoonLocal(x, lat, lon); return q.alt > -0.8 ? q.sep : 9; };
          const tm = minimize(f, best.t - 5 / 1440, best.t + 5 / 1440, 30);
          const q = sunMoonLocal(tm, lat, lon);
          const overl = q.rs + q.rm - q.sep;
          const mag = overl / (2 * q.rs);
          const kind = q.sep <= Math.abs(q.rm - q.rs) ? (q.rm >= q.rs ? 'total' : 'annular') : 'partial';
          const g = x => { const r = sunMoonLocal(x, lat, lon); return r.sep - (r.rs + r.rm); };
          return { jd: tm, kind, mag, alt: q.alt, start: bisectRoot(g, tm - 0.15, tm), end: bisectRoot(g, tm, tm + 0.15) };
        }
      }
      t = nm + 2;
    }
    return null;
  }
  const MOON_NAMES = ['Neumond', 'Zunehmende Sichel', 'Erstes Viertel', 'Zunehmender Mond', 'Vollmond', 'Abnehmender Mond', 'Letztes Viertel', 'Abnehmende Sichel'];
  function moonPhaseName(elongLon) { // Differenz der ekliptikalen Längen Mond–Sonne (0..360)
    const e = n360(elongLon);
    if (e < 6 || e > 354) return MOON_NAMES[0];
    if (Math.abs(e - 90) < 6) return MOON_NAMES[2];
    if (Math.abs(e - 180) < 6) return MOON_NAMES[4];
    if (Math.abs(e - 270) < 6) return MOON_NAMES[6];
    if (e < 90) return MOON_NAMES[1]; if (e < 180) return MOON_NAMES[3]; if (e < 270) return MOON_NAMES[5]; return MOON_NAMES[7];
  }

  return {
    D2R, R2D, mod, n360, toJD, fromJD, deltaT, toTT, centuries, gmst, lst, nutation, meanObliquity,
    vec, dot, cross, len, norm, toRaDec, angSep, precessionMatrix, mulv, eqToEnu, enuToAltAz, altAzToEnu, refraction,
    sun, moon, moonEcliptic, topocentric, planet, helio, PLANETS, galToEq2000, skyState, moonPhaseTime, riseSet, culmination, starRaDec, lunarEclipseGeom, nextLunarEclipse, nextLocalSolarEclipse, sunMoonLocal, moonPhaseName
  };
});
