/* HimmelsWahr — Astronomie-Modul (alles lokal aus Datum, Uhrzeit und Standort berechnet, keine externe Quelle)

   Herkunft der Verfahren und Konstanten:
   - Sonne: Standardformeln der niedrigen Genauigkeit (ca. 0,01°), allgemein bekannte astronomische Fachliteratur.
   - Mond: verkürzte Störungsreihe (ca. 0,3°), Standardverfahren; Parallaxe und Refraktion als Näherung.
   - Planeten: mittlere Bahnelemente der NASA/JPL-Tabelle „Keplerian Elements for Approximate Positions of the
     Major Planets“ (Gültigkeit 1800–2050, Genauigkeit im Bereich von Bogenminuten bis wenigen Zehntelgrad).
     Daten der NASA/JPL sind für diese Nutzung frei verwendbar; es sind Zahlenwerte, kein geschützter Text.
   - Sterne: Koordinaten (J2000) als astronomische Tatsachen selbst zusammengestellt, per Präzession auf das Datum gebracht.
   Alle Angaben sind Näherungen für Orientierung und Anzeige, keine Präzisions-Ephemeride. */

function hwDeg2rad(d){ return d * Math.PI / 180; }
function hwRad2deg(r){ return r * 180 / Math.PI; }
function hwWrap360(d){ d = d % 360; return d < 0 ? d + 360 : d; }
function hwWrap180(d){ d = hwWrap360(d + 180) - 180; return d; }
function hwJulianDay(date){ return date.getTime() / 86400000 + 2440587.5; }

/* Greenwich Mean Sidereal Time in Grad */
function hwGMST(jd){
  var T = (jd - 2451545.0) / 36525.0;
  var g = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - (T * T * T) / 38710000.0;
  return hwWrap360(g);
}

/* Sonne: ekliptikale Länge, Rektaszension, Deklination */
function hwSunEcliptic(jd){
  var T = (jd - 2451545.0) / 36525.0;
  var L0 = hwWrap360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  var M = hwDeg2rad(hwWrap360(357.52911 + 35999.05029 * T - 0.0001537 * T * T));
  var C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
        + (0.019993 - 0.000101 * T) * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M);
  var omega = hwDeg2rad(125.04 - 1934.136 * T);
  var lambda = hwWrap360(L0 + C - 0.00569 - 0.00478 * Math.sin(omega));
  var eps0 = 23 + (26 + (21.448 - T * (46.8150 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  var eps = hwDeg2rad(eps0 + 0.00256 * Math.cos(omega));
  var lr = hwDeg2rad(lambda);
  var ra = hwWrap360(hwRad2deg(Math.atan2(Math.cos(eps) * Math.sin(lr), Math.cos(lr))));
  var dec = hwRad2deg(Math.asin(Math.sin(eps) * Math.sin(lr)));
  return { lon: lambda, ra: ra, dec: dec };
}
function hwSunEquatorial(jd){ var s = hwSunEcliptic(jd); return { ra: s.ra, dec: s.dec }; }

/* Mond: ekliptikale Länge/Breite, Rektaszension, Deklination */
function hwMoonEcliptic(jd){
  var T = (jd - 2451545.0) / 36525.0;
  var Lp = hwWrap360(218.3164477 + 481267.88123421 * T);
  var D = hwDeg2rad(hwWrap360(297.8501921 + 445267.1114034 * T));
  var M = hwDeg2rad(hwWrap360(357.5291092 + 35999.0502909 * T));
  var Mp = hwDeg2rad(hwWrap360(134.9633964 + 477198.8675055 * T));
  var F = hwDeg2rad(hwWrap360(93.2720950 + 483202.0175233 * T));
  var dL = 6.289 * Math.sin(Mp) + 1.274 * Math.sin(2 * D - Mp) + 0.658 * Math.sin(2 * D)
         + 0.214 * Math.sin(2 * Mp) - 0.186 * Math.sin(M) - 0.114 * Math.sin(2 * F);
  var dB = 5.128 * Math.sin(F) + 0.281 * Math.sin(Mp + F) + 0.278 * Math.sin(Mp - F) + 0.173 * Math.sin(2 * D - F);
  var lon = hwWrap360(Lp + dL), lat = dB;
  var eps = hwDeg2rad(23.4393);
  var lonR = hwDeg2rad(lon), latR = hwDeg2rad(lat);
  var ra = hwWrap360(hwRad2deg(Math.atan2(Math.sin(lonR) * Math.cos(eps) - Math.tan(latR) * Math.sin(eps), Math.cos(lonR))));
  var dec = hwRad2deg(Math.asin(Math.sin(latR) * Math.cos(eps) + Math.cos(latR) * Math.sin(eps) * Math.sin(lonR)));
  return { lon: lon, lat: lat, ra: ra, dec: dec };
}
function hwMoonEquatorial(jd){ var m = hwMoonEcliptic(jd); return { ra: m.ra, dec: m.dec }; }

/* Umrechnung Rektaszension/Deklination -> Azimut (ab Nord, im Uhrzeigersinn) und Höhe */
function hwEqToHorizon(raDeg, decDeg, lat, lon, jd){
  var lst = hwWrap360(hwGMST(jd) + lon);
  var ha = hwDeg2rad(hwWrap360(lst - raDeg));
  var decR = hwDeg2rad(decDeg), latR = hwDeg2rad(lat);
  var alt = Math.asin(Math.sin(latR) * Math.sin(decR) + Math.cos(latR) * Math.cos(decR) * Math.cos(ha));
  var azS = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(latR) - Math.tan(decR) * Math.cos(latR));
  return { azimuth: hwWrap360(hwRad2deg(azS) + 180), altitude: hwRad2deg(alt) };
}

/* Atmosphärische Refraktion (Näherung, wahre Höhe -> scheinbare Höhe), nur für die Anzeige */
function hwRefractionDeg(altDeg){
  if(altDeg < -1) return 0;
  var h = Math.max(altDeg, -0.9);
  return (1.02 / Math.tan(hwDeg2rad(h + 10.3 / (h + 5.11)))) / 60;
}

/* Präzession von J2000 auf das Datum (IAU-Standardformeln) */
function hwPrecess(raDeg, decDeg, jd){
  var T = (jd - 2451545.0) / 36525.0;
  var zeta = hwDeg2rad((2306.2181 * T + 0.30188 * T * T + 0.017998 * T * T * T) / 3600);
  var z = hwDeg2rad((2306.2181 * T + 1.09468 * T * T + 0.018203 * T * T * T) / 3600);
  var th = hwDeg2rad((2004.3109 * T - 0.42665 * T * T - 0.041833 * T * T * T) / 3600);
  var a0 = hwDeg2rad(raDeg), d0 = hwDeg2rad(decDeg);
  var A = Math.cos(d0) * Math.sin(a0 + zeta);
  var B = Math.cos(th) * Math.cos(d0) * Math.cos(a0 + zeta) - Math.sin(th) * Math.sin(d0);
  var C = Math.sin(th) * Math.cos(d0) * Math.cos(a0 + zeta) + Math.cos(th) * Math.sin(d0);
  return { ra: hwWrap360(hwRad2deg(Math.atan2(A, B) + z)), dec: hwRad2deg(Math.asin(Math.max(-1, Math.min(1, C)))) };
}

function hwSunPosition(date, lat, lon){
  var jd = hwJulianDay(date), eq = hwSunEquatorial(jd);
  return hwEqToHorizon(eq.ra, eq.dec, lat, lon, jd);
}
/* Mond mit topozentrischer Korrektur (mittlere Horizontalparallaxe 0,95°) */
function hwMoonPosition(date, lat, lon){
  var jd = hwJulianDay(date), eq = hwMoonEquatorial(jd);
  var p = hwEqToHorizon(eq.ra, eq.dec, lat, lon, jd);
  p.altitude -= 0.95 * Math.cos(hwDeg2rad(p.altitude));
  return p;
}

/* ---------- Planeten: NASA/JPL „Approximate Positions of the Planets“, Tabelle 1 (1800–2050) ----------
   je Element [Wert bei J2000, Änderung pro Jahrhundert]: a (AE), e, I (°), L (°), Perihellänge (°), Knotenlänge (°) */
var HW_PLANET_ELEMENTS = {
  Merkur:  { a:[0.38709927, 0.00000037], e:[0.20563593, 0.00001906], I:[7.00497902, -0.00594749], L:[252.25032350, 149472.67411175], w:[77.45779628, 0.16047689], O:[48.33076593, -0.12534081] },
  Venus:   { a:[0.72333566, 0.00000390], e:[0.00677672, -0.00004107], I:[3.39467605, -0.00078890], L:[181.97909950, 58517.81538729], w:[131.60246718, 0.00268329], O:[76.67984255, -0.27769418] },
  Mars:    { a:[1.52371034, 0.00001847], e:[0.09339410, 0.00007882], I:[1.84969142, -0.00813131], L:[-4.55343205, 19140.30268499], w:[-23.94362959, 0.44441088], O:[49.55953891, -0.29257343] },
  Jupiter: { a:[5.20288700, -0.00011607], e:[0.04838624, -0.00013253], I:[1.30439695, -0.00183714], L:[34.39644051, 3034.74612775], w:[14.72847983, 0.21252668], O:[100.47390909, 0.20469106] },
  Saturn:  { a:[9.53667594, -0.00125060], e:[0.05386179, -0.00050991], I:[2.48599187, 0.00193609], L:[49.95424423, 1222.49362201], w:[92.59887831, -0.41897216], O:[113.66242448, -0.28867794] },
  Uranus:  { a:[19.18916464, -0.00196176], e:[0.04725744, -0.00004397], I:[0.77263783, -0.00242939], L:[313.23810451, 428.48202785], w:[170.95427630, 0.40805281], O:[74.01692503, 0.04240589] },
  Neptun:  { a:[30.06992276, 0.00026291], e:[0.00859048, 0.00005105], I:[1.77004347, 0.00035372], L:[-55.12002969, 218.45945325], w:[44.96476227, -0.32241464], O:[131.78422574, -0.00508664] }
};
var HW_EARTH_ELEMENTS = { a:[1.00000261, 0.00000562], e:[0.01671123, -0.00004392], I:[-0.00001531, -0.01294668], L:[100.46457166, 35999.37244981], w:[102.93768193, 0.32327364], O:[0, 0] };

function hwSolveKepler(Mrad, e){
  var E = Mrad + e * Math.sin(Mrad);
  for(var i = 0; i < 12; i++){ E = E - (E - e * Math.sin(E) - Mrad) / (1 - e * Math.cos(E)); }
  return E;
}
/* Heliozentrische ekliptikale Koordinaten (J2000) aus JPL-Elementen */
function hwHelioXYZ(el, T){
  function g(k){ return el[k][0] + el[k][1] * T; }
  var a = g('a'), e = g('e'), I = hwDeg2rad(g('I')), L = g('L'), wbar = g('w'), O = hwDeg2rad(g('O'));
  var om = hwDeg2rad(wbar) - O;
  var M = hwDeg2rad(hwWrap180(L - wbar));
  var E = hwSolveKepler(M, e);
  var xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  var cw = Math.cos(om), sw = Math.sin(om), cO = Math.cos(O), sO = Math.sin(O), cI = Math.cos(I), sI = Math.sin(I);
  return {
    x: (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
    y: (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
    z: (sw * sI) * xp + (cw * sI) * yp
  };
}
/* Geozentrische Äquatorialkoordinaten (Datum-Äquinoktium) eines Planeten + Elongation von der Sonne */
function hwPlanetEquatorial(name, jd){
  var el = HW_PLANET_ELEMENTS[name];
  if(!el) return null;
  var T = (jd - 2451545.0) / 36525.0;
  var p = hwHelioXYZ(el, T), e = hwHelioXYZ(HW_EARTH_ELEMENTS, T);
  var x = p.x - e.x, y = p.y - e.y, z = p.z - e.z;
  var eps = hwDeg2rad(23.43928);
  var xe = x, ye = y * Math.cos(eps) - z * Math.sin(eps), ze = y * Math.sin(eps) + z * Math.cos(eps);
  var ra0 = hwWrap360(hwRad2deg(Math.atan2(ye, xe)));
  var dec0 = hwRad2deg(Math.atan2(ze, Math.sqrt(xe * xe + ye * ye)));
  var lonPl = hwWrap360(hwRad2deg(Math.atan2(y, x)));
  var pr = hwPrecess(ra0, dec0, jd);
  var sunLon = hwWrap360(hwRad2deg(Math.atan2(-e.y, -e.x)));   /* ekliptikale Länge der Sonne aus Erdposition (J2000) */
  return { ra: pr.ra, dec: pr.dec, dist: Math.sqrt(x * x + y * y + z * z), elongation: hwWrap180(lonPl - sunLon) };
}
function hwPlanetPosition(name, date, lat, lon){
  var jd = hwJulianDay(date), eq = hwPlanetEquatorial(name, jd);
  if(!eq) return null;
  return hwEqToHorizon(eq.ra, eq.dec, lat, lon, jd);
}

/* ---------- Mondphase aus der tatsächlichen Elongation (nicht aus einem Mittelwert) ---------- */
function hwMoonElongation(jd){
  return hwWrap360(hwMoonEcliptic(jd).lon - hwSunEcliptic(jd).lon);
}
function hwMoonPhase(date){
  date = date || new Date();
  var D = hwMoonElongation(hwJulianDay(date));
  var frac = D / 360;
  var illum = Math.round((1 - Math.cos(hwDeg2rad(D))) / 2 * 100);
  var name;
  if(D < 6 || D >= 354) name = 'Neumond';
  else if(D < 84) name = 'Zunehmende Sichel';
  else if(D < 96) name = 'Erstes Viertel';
  else if(D < 174) name = 'Zunehmender Mond';
  else if(D < 186) name = 'Vollmond';
  else if(D < 264) name = 'Abnehmender Mond';
  else if(D < 276) name = 'Letztes Viertel';
  else name = 'Abnehmende Sichel';
  return { fraction: frac, illumination: illum, name: name, elongation: D };
}
/* Sucht den nächsten Zeitpunkt, an dem die Mond-Elongation den Zielwert (0/90/180/270°) erreicht */
function hwFindMoonPhaseTime(fromDate, targetDeg){
  var step = 3 * 3600000, t0 = fromDate.getTime();
  function diff(ms){ return hwWrap180(hwMoonElongation(hwJulianDay(new Date(ms))) - targetDeg); }
  var prev = diff(t0), t = t0;
  for(var i = 0; i < 260; i++){
    var tn = t + step, cur = diff(tn);
    if(prev < 0 && cur >= 0 && Math.abs(cur - prev) < 90){
      var lo = t, hi = tn;
      for(var k = 0; k < 28; k++){ var mid = (lo + hi) / 2; if(diff(mid) < 0) lo = mid; else hi = mid; }
      return new Date((lo + hi) / 2);
    }
    prev = cur; t = tn;
  }
  return null;
}
function hwNextMoonPhases(fromDate){
  var defs = [[0, 'Neumond'], [90, 'Erstes Viertel'], [180, 'Vollmond'], [270, 'Letztes Viertel']];
  return defs.map(function(d){ return { name: d[1], date: hwFindMoonPhaseTime(fromDate, d[0]), deg: d[0] }; })
    .filter(function(x){ return x.date; }).sort(function(a, b){ return a.date - b.date; });
}
/* Astronomische Jahreszeiten (Sonne erreicht ekliptikale Länge 0/90/180/270°) */
function hwNextSeason(fromDate){
  var targets = [[0, 'Frühlingsanfang (Tagundnachtgleiche)'], [90, 'Sommeranfang (Sonnenwende)'], [180, 'Herbstanfang (Tagundnachtgleiche)'], [270, 'Winteranfang (Sonnenwende)']];
  var best = null;
  targets.forEach(function(tg){
    function diff(ms){ return hwWrap180(hwSunEcliptic(hwJulianDay(new Date(ms))).lon - tg[0]); }
    var t = fromDate.getTime(), prev = diff(t), day = 86400000;
    for(var i = 0; i < 380; i++){
      var tn = t + day, cur = diff(tn);
      if(prev < 0 && cur >= 0 && Math.abs(cur - prev) < 90){
        var lo = t, hi = tn;
        for(var k = 0; k < 26; k++){ var mid = (lo + hi) / 2; if(diff(mid) < 0) lo = mid; else hi = mid; }
        var when = new Date((lo + hi) / 2);
        if(!best || when < best.date) best = { name: tg[1], date: when };
        return;
      }
      prev = cur; t = tn;
    }
  });
  return best;
}

/* ---------- Sonnenhöhen-Übergänge (Dämmerungsphasen, Goldene/Blaue Stunde) ---------- */
/* Liefert alle Zeitpunkte im Intervall, an denen die Sonnenhöhe den Schwellwert kreuzt (5-Minuten-Raster, Minuten-genau verfeinert) */
function hwSunAltCrossings(startMs, endMs, lat, lon, thresholdDeg){
  var out = [], stepMs = 300000;
  function alt(ms){ return hwSunPosition(new Date(ms), lat, lon).altitude - thresholdDeg; }
  var prevT = startMs, prevV = alt(startMs);
  for(var t = startMs + stepMs; t <= endMs; t += stepMs){
    var v = alt(t);
    if((prevV < 0 && v >= 0) || (prevV >= 0 && v < 0)){
      var lo = prevT, hi = t, rising = v >= 0;
      for(var k = 0; k < 10; k++){ var mid = (lo + hi) / 2; var mv = alt(mid); if((mv >= 0) === rising) hi = mid; else lo = mid; }
      out.push({ ms: Math.round((lo + hi) / 2), rising: rising });
    }
    prevT = t; prevV = v;
  }
  return out;
}
/* Kennzeiten eines Ortstages (dayStartMs = 00:00 Ortszeit als UTC-Millisekunden) */
function hwDayEvents(dayStartMs, lat, lon){
  var end = dayStartMs + 86400000;
  function first(th, rising){ var c = hwSunAltCrossings(dayStartMs, end, lat, lon, th).filter(function(x){ return x.rising === rising; }); return c.length ? c[0].ms : null; }
  return {
    astroDawn: first(-18, true), nautDawn: first(-12, true), civilDawn: first(-6, true),
    blueStartMorning: first(-8, true), goldenStartMorning: first(-4, true), sunrise: first(-0.833, true), goldenEndMorning: first(6, true),
    goldenStartEvening: first(6, false), sunset: first(-0.833, false), goldenEndEvening: first(-4, false), blueEndEvening: first(-8, false),
    civilDusk: first(-6, false), nautDusk: first(-12, false), astroDusk: first(-18, false)
  };
}
var HW_STAR_CATALOG = [
  { name:'Sirius', ra:101.287, dec:-16.716, mag:-1.46 },
  { name:'Canopus', ra:95.988, dec:-52.696, mag:-0.74 },
  { name:'Arktur', ra:213.915, dec:19.182, mag:-0.05 },
  { name:'Wega', ra:279.234, dec:38.784, mag:0.03, con:'lyr' },
  { name:'Capella', ra:79.172, dec:45.998, mag:0.08, con:'aur' },
  { name:'Rigel', ra:78.634, dec:-8.202, mag:0.13, con:'ori' },
  { name:'Procyon', ra:114.826, dec:5.225, mag:0.34 },
  { name:'Achernar', ra:24.429, dec:-57.237, mag:0.46 },
  { name:'Beteigeuze', ra:88.793, dec:7.407, mag:0.50, con:'ori' },
  { name:'Hadar', ra:210.956, dec:-60.373, mag:0.61 },
  { name:'Altair', ra:297.696, dec:8.868, mag:0.77, con:'aql' },
  { name:'Aldebaran', ra:68.980, dec:16.509, mag:0.85, con:'tau' },
  { name:'Antares', ra:247.352, dec:-26.432, mag:0.96, con:'sco' },
  { name:'Spica', ra:201.298, dec:-11.161, mag:0.97, con:'vir' },
  { name:'Pollux', ra:116.329, dec:28.026, mag:1.14, con:'gem' },
  { name:'Fomalhaut', ra:344.413, dec:-29.622, mag:1.16 },
  { name:'Deneb', ra:310.358, dec:45.280, mag:1.25, con:'cyg' },
  { name:'Regulus', ra:152.093, dec:11.967, mag:1.35, con:'leo' },
  { name:'Castor', ra:113.649, dec:31.888, mag:1.58, con:'gem' },
  { name:'Bellatrix', ra:81.283, dec:6.350, mag:1.64, con:'ori' },
  { name:'Elnath', ra:81.573, dec:28.608, mag:1.65, con:'tau' },
  { name:'Alnilam', ra:84.053, dec:-1.202, mag:1.69, con:'ori' },
  { name:'Shaula', ra:263.402, dec:-37.104, mag:1.62, con:'sco' },
  { name:'Alnitak', ra:85.190, dec:-1.943, mag:1.74, con:'ori' },
  { name:'Alioth', ra:193.507, dec:55.960, mag:1.76, con:'uma' },
  { name:'Kaus Australis', ra:276.043, dec:-34.385, mag:1.85, con:'sgr' },
  { name:'Mirfak', ra:51.081, dec:49.861, mag:1.79, con:'per' },
  { name:'Dubhe', ra:165.932, dec:61.751, mag:1.79, con:'uma' },
  { name:'Alkaid', ra:206.885, dec:49.313, mag:1.86, con:'uma' },
  { name:'Menkalinan', ra:89.882, dec:44.947, mag:1.90, con:'aur' },
  { name:'Alhena', ra:99.428, dec:16.399, mag:1.93, con:'gem' },
  { name:'Sargas', ra:264.330, dec:-42.998, mag:1.86, con:'sco' },
  { name:'Polaris', ra:37.955, dec:89.264, mag:1.98, con:'umi' },
  { name:'Alpheratz', ra:2.097, dec:29.090, mag:2.06, con:'and' },
  { name:'Mirach', ra:17.433, dec:35.621, mag:2.06, con:'and' },
  { name:'Sadr', ra:305.557, dec:40.257, mag:2.23, con:'cyg' },
  { name:'Mizar', ra:200.981, dec:54.925, mag:2.23, con:'uma' },
  { name:'Albireo', ra:292.680, dec:27.960, mag:3.18, con:'cyg' },
  { name:'Gienah (Cygnus)', ra:311.553, dec:33.970, mag:2.48, con:'cyg' },
  { name:'Delta Cygni', ra:296.244, dec:45.131, mag:2.87, con:'cyg' },
  { name:'Mintaka', ra:83.002, dec:-0.299, mag:2.23, con:'ori' },
  { name:'Schedar', ra:10.127, dec:56.537, mag:2.24, con:'cas' },
  { name:'Almach', ra:30.975, dec:42.330, mag:2.10, con:'and' },
  { name:'Algol', ra:47.042, dec:40.956, mag:2.12, con:'per' },
  { name:'Denebola', ra:177.265, dec:14.572, mag:2.14, con:'leo' },
  { name:'Kochab', ra:222.676, dec:74.156, mag:2.08, con:'umi' },
  { name:'Saiph', ra:86.939, dec:-9.670, mag:2.09, con:'ori' },
  { name:'Caph', ra:2.295, dec:59.150, mag:2.28, con:'cas' },
  { name:'Dschubba', ra:240.083, dec:-22.622, mag:2.29, con:'sco' },
  { name:'Zubenelgenubi', ra:222.720, dec:-16.042, mag:2.75, con:'lib' },
  { name:'Merak', ra:165.460, dec:56.382, mag:2.37, con:'uma' },
  { name:'Nunki', ra:283.816, dec:-26.297, mag:2.05, con:'sgr' },
  { name:'Ascella', ra:285.653, dec:-29.880, mag:2.60, con:'sgr' },
  { name:'Algieba', ra:154.993, dec:19.842, mag:2.61, con:'leo' },
  { name:'Zubeneschamali', ra:229.252, dec:-9.383, mag:2.61, con:'lib' },
  { name:'Zosma', ra:168.527, dec:20.524, mag:2.56, con:'leo' },
  { name:'Phecda', ra:178.458, dec:53.695, mag:2.44, con:'uma' },
  { name:'Tsih', ra:14.177, dec:60.717, mag:2.47, con:'cas' },
  { name:'Alcyone (Plejaden)', ra:56.871, dec:24.105, mag:2.87, con:'tau' },
  { name:'Sadalsuud', ra:322.890, dec:-5.571, mag:2.90, con:'aqr' },
  { name:'Sadalmelik', ra:331.444, dec:-0.320, mag:2.95, con:'aqr' },
  { name:'Deneb Algedi', ra:326.760, dec:-16.127, mag:2.85, con:'cap' },
  { name:'Tarazed', ra:296.565, dec:10.613, mag:2.72, con:'aql' },
  { name:'Ruchbah', ra:21.454, dec:60.235, mag:2.68, con:'cas' },
  { name:'Sheratan', ra:28.660, dec:20.808, mag:2.64, con:'ari' },
  { name:'Hamal', ra:31.793, dec:23.462, mag:2.00, con:'ari' },
  { name:'Markab', ra:346.190, dec:15.205, mag:2.49, con:'peg' },
  { name:'Algenib', ra:3.309, dec:15.184, mag:2.83, con:'peg' },
  { name:'Scheat', ra:345.943, dec:28.083, mag:2.42, con:'peg' },
  { name:'Sheliak', ra:282.520, dec:33.363, mag:3.52, con:'lyr' },
  { name:'Sulafat', ra:284.736, dec:32.690, mag:3.24, con:'lyr' },
  { name:'Alshain', ra:298.828, dec:6.406, mag:3.71, con:'aql' },
  { name:'Dabih', ra:305.253, dec:-14.781, mag:3.05, con:'cap' },
  { name:'Pherkad', ra:230.182, dec:71.834, mag:3.05, con:'umi' },
  { name:'Megrez', ra:183.857, dec:57.033, mag:3.31, con:'uma' },
  { name:'Segin', ra:28.599, dec:63.670, mag:3.35, con:'cas' }
];
/* Zwei "Deep-Sky"-Objekte, die unter dunklem Himmel noch mit bloßem Auge als schwacher Fleck erkennbar
   sind (kein Fixstern, sondern Sternhaufen bzw. Galaxie) */
var HW_DEEPSKY_CATALOG = [
  { name:'Plejaden (M45)', ra:56.75, dec:24.12 },
  { name:'Andromeda-Galaxie (M31)', ra:10.685, dec:41.269 }
];
/* Deutsche Namen der Sternbilder (nur für die Anzeige, keine neuen Katalogdaten) */
var HW_CONSTELLATION_NAMES = {
  ori:'Orion', uma:'Großer Wagen', umi:'Kleiner Wagen', cas:'Kassiopeia', cyg:'Schwan',
  lyr:'Leier', aql:'Adler', tau:'Stier', gem:'Zwillinge', leo:'Löwe', lib:'Waage',
  sco:'Skorpion', sgr:'Schütze', cap:'Steinbock', aqr:'Wassermann', ari:'Widder',
  per:'Perseus', aur:'Fuhrmann', and:'Andromeda', peg:'Pegasus', vir:'Jungfrau'
};
/* Verbindungslinien der bekanntesten Sternbild-Umrisse (nur Sternnamen aus dem Katalog oben) */
var HW_CONSTELLATION_LINES = {
  ori: [['Beteigeuze','Bellatrix'],['Bellatrix','Mintaka'],['Mintaka','Alnilam'],['Alnilam','Alnitak'],
        ['Alnitak','Saiph'],['Saiph','Rigel'],['Rigel','Mintaka'],['Beteigeuze','Alnitak']],
  uma: [['Alkaid','Mizar'],['Mizar','Alioth'],['Alioth','Megrez'],['Megrez','Phecda'],
        ['Phecda','Merak'],['Merak','Dubhe'],['Dubhe','Megrez']],
  umi: [['Polaris','Kochab'],['Kochab','Pherkad']],
  cas: [['Caph','Schedar'],['Schedar','Tsih'],['Tsih','Ruchbah'],['Ruchbah','Segin']],
  cyg: [['Deneb','Sadr'],['Sadr','Albireo'],['Delta Cygni','Sadr'],['Sadr','Gienah (Cygnus)']],
  lyr: [['Wega','Sheliak'],['Sheliak','Sulafat'],['Sulafat','Wega']],
  aql: [['Tarazed','Altair'],['Altair','Alshain']],
  tau: [['Aldebaran','Elnath'],['Aldebaran','Alcyone (Plejaden)']],
  gem: [['Castor','Pollux'],['Pollux','Alhena']],
  leo: [['Regulus','Algieba'],['Algieba','Zosma'],['Zosma','Denebola']],
  lib: [['Zubenelgenubi','Zubeneschamali']],
  sco: [['Dschubba','Antares'],['Antares','Sargas'],['Sargas','Shaula']],
  sgr: [['Kaus Australis','Nunki'],['Nunki','Ascella'],['Ascella','Kaus Australis']],
  cap: [['Dabih','Deneb Algedi']],
  aqr: [['Sadalsuud','Sadalmelik']],
  ari: [['Hamal','Sheratan']],
  per: [['Mirfak','Algol']],
  aur: [['Capella','Menkalinan']],
  and: [['Alpheratz','Mirach'],['Mirach','Almach']],
  peg: [['Markab','Scheat'],['Scheat','Alpheratz'],['Alpheratz','Algenib'],['Algenib','Markab']]
};
/* Alle Objekte (Sonne, Mond, Planeten, Sterne, Deep-Sky) mit Azimut/Höhe für den Standort.
   opts.refract: Refraktion für die Anzeige berücksichtigen · onlyVisible: nur Objekte über dem Horizont */
function hwSkyObjects(date, lat, lon, onlyVisible, opts){
  opts = opts || {};
  var list = [];
  function fix(pos){
    var alt = pos.altitude;
    if(opts.refract && alt > -1) alt += hwRefractionDeg(alt);
    return { azimuth: pos.azimuth, altitude: alt };
  }
  var sun = fix(hwSunPosition(date, lat, lon));
  list.push({ name:'Sonne', type:'sun', azimuth: sun.azimuth, altitude: sun.altitude });
  var moon = fix(hwMoonPosition(date, lat, lon));
  list.push({ name:'Mond', type:'moon', azimuth: moon.azimuth, altitude: moon.altitude });
  var jd = hwJulianDay(date);
  Object.keys(HW_PLANET_ELEMENTS).forEach(function(p){
    var eq = hwPlanetEquatorial(p, jd);
    if(!eq) return;
    var pos = fix(hwEqToHorizon(eq.ra, eq.dec, lat, lon, jd));
    list.push({ name:p, type:'planet', nakedEye: (p !== 'Uranus' && p !== 'Neptun'), azimuth: pos.azimuth, altitude: pos.altitude, elongation: eq.elongation });
  });
  HW_STAR_CATALOG.forEach(function(s){
    var pr = hwPrecess(s.ra, s.dec, jd);
    var pos = fix(hwEqToHorizon(pr.ra, pr.dec, lat, lon, jd));
    list.push({ name:s.name, type:'star', mag:s.mag, con:s.con, azimuth: pos.azimuth, altitude: pos.altitude });
  });
  HW_DEEPSKY_CATALOG.forEach(function(o){
    var pr = hwPrecess(o.ra, o.dec, jd);
    var pos = fix(hwEqToHorizon(pr.ra, pr.dec, lat, lon, jd));
    list.push({ name:o.name, type:'deepsky', azimuth: pos.azimuth, altitude: pos.altitude });
  });
  if(onlyVisible) list = list.filter(function(o){ return o.altitude > -1; });
  return list;
}

/* Sichtbarkeit von Mond und Planeten in einer Zeitspanne (z. B. in der kommenden Nacht):
   liefert je Objekt Zeitraum über 5° Höhe, höchsten Stand und Himmelsrichtung, solange die Sonne tiefer als sunMaxDeg steht */
function hwVisiblePlanets(startMs, endMs, lat, lon, sunMaxDeg){
  var names = ['Mond', 'Merkur', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptun'];
  var res = {};
  names.forEach(function(n){ res[n] = { name: n, first: null, last: null, peakAlt: -90, peakMs: null, peakAz: null }; });
  for(var t = startMs; t <= endMs; t += 600000){
    var d = new Date(t);
    if(hwSunPosition(d, lat, lon).altitude > sunMaxDeg) continue;
    names.forEach(function(n){
      var pos = n === 'Mond' ? hwMoonPosition(d, lat, lon) : hwPlanetPosition(n, d, lat, lon);
      if(pos.altitude < 5) return;
      var r = res[n];
      if(r.first == null) r.first = t;
      r.last = t;
      if(pos.altitude > r.peakAlt){ r.peakAlt = pos.altitude; r.peakMs = t; r.peakAz = pos.azimuth; }
    });
  }
  return names.map(function(n){ return res[n]; }).filter(function(r){ return r.first != null; }).map(function(r){
    r.nakedEye = (r.name !== 'Uranus' && r.name !== 'Neptun');
    return r;
  });
}

/* Zeitpunkte von Mondauf- und -untergang (Höhe 0°, inkl. Parallaxe) im Intervall */
function hwMoonRiseSet(startMs, endMs, lat, lon){
  var out = [], prevT = startMs, prevV = hwMoonPosition(new Date(startMs), lat, lon).altitude + 0.1;
  for(var t = startMs + 600000; t <= endMs; t += 600000){
    var v = hwMoonPosition(new Date(t), lat, lon).altitude + 0.1;
    if((prevV < 0) !== (v < 0)){
      var lo = prevT, hi = t, rising = v >= 0;
      for(var k = 0; k < 9; k++){ var mid = (lo + hi) / 2; var mv = hwMoonPosition(new Date(mid), lat, lon).altitude + 0.1; if((mv >= 0) === rising) hi = mid; else lo = mid; }
      out.push({ ms: Math.round((lo + hi) / 2), rising: rising });
    }
    prevT = t; prevV = v;
  }
  return out;
}

/* ---------- Meteorströme (typische Maxima, gerundet; Angaben schwanken von Jahr zu Jahr um etwa ±1 Tag) ---------- */
/* Eigene Zusammenstellung allgemein bekannter astronomischer Tatsachen (Maximum-Datum, typische Zenitrate). */
var HW_METEOR_SHOWERS = [
  { name:'Quadrantiden', month:1,  day:3,  zhr:80 },
  { name:'Lyriden',      month:4,  day:22, zhr:18 },
  { name:'η-Aquariden',  month:5,  day:6,  zhr:30 },
  { name:'Perseiden',    month:8,  day:12, zhr:100 },
  { name:'Draconiden',   month:10, day:8,  zhr:10 },
  { name:'Orioniden',    month:10, day:21, zhr:20 },
  { name:'Leoniden',     month:11, day:17, zhr:15 },
  { name:'Geminiden',    month:12, day:14, zhr:120 },
  { name:'Ursiden',      month:12, day:22, zhr:10 }
];
/* Nächste Ströme ab Datum: liefert Maximum-Datum, Tage bis dahin und Mondlicht in der Maximumsnacht */
function hwUpcomingShowers(fromDate, count){
  var y = fromDate.getFullYear(), list = [];
  [y, y + 1].forEach(function(yr){
    HW_METEOR_SHOWERS.forEach(function(s){
      var peak = new Date(yr, s.month - 1, s.day, 12, 0, 0);
      var days = Math.round((peak.getTime() - fromDate.getTime()) / 86400000);
      if(days >= -2){
        var night = new Date(yr, s.month - 1, s.day, 23, 0, 0);
        list.push({ name: s.name, zhr: s.zhr, peak: peak, days: days, moon: hwMoonPhase(night).illumination });
      }
    });
  });
  list.sort(function(a, b){ return a.peak - b.peak; });
  return list.slice(0, count || 3);
}

/* ---------- Hilfsfunktionen ---------- */
function hwCompassDirection(deg){
  var dirs = ['N','NO','O','SO','S','SW','W','NW'];
  return dirs[Math.round(hwWrap360(deg) / 45) % 8];
}
function hwCompassWord(deg){
  var dirs = ['Norden','Nordosten','Osten','Südosten','Süden','Südwesten','Westen','Nordwesten'];
  return dirs[Math.round(hwWrap360(deg) / 45) % 8];
}
/* Zielpunkt in distKm Entfernung in Richtung bearingDeg (Großkreis, Kugelmodell) */
function hwDestPoint(lat, lon, bearingDeg, distKm){
  var R = 6371, dr = distKm / R, b = hwDeg2rad(bearingDeg), la = hwDeg2rad(lat), lo = hwDeg2rad(lon);
  var la2 = Math.asin(Math.sin(la) * Math.cos(dr) + Math.cos(la) * Math.sin(dr) * Math.cos(b));
  var lo2 = lo + Math.atan2(Math.sin(b) * Math.sin(dr) * Math.cos(la), Math.cos(dr) - Math.sin(la) * Math.sin(la2));
  return { lat: hwRad2deg(la2), lon: ((hwRad2deg(lo2) + 540) % 360) - 180 };
}
