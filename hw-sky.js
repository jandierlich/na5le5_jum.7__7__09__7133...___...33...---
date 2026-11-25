/* HimmelsWahr — Himmels-Funktionen
   Lebendiger Himmel (Hintergrund nach echter Sonnenhöhe), Tagesband, Himmelsfenster, Abendrot-/Morgenrot-Schätzung,
   Nachthimmel-Bewertung. Rechnet mit hw-astro.js; Wolkendaten stammen von Open-Meteo (siehe hw-app.js). */

function hwClamp01(x){ return Math.max(0, Math.min(1, x)); }
function hwFmtLocal(ms, off){
  var d = new Date(ms + off * 1000);
  return ('0' + d.getUTCHours()).slice(-2) + ':' + ('0' + d.getUTCMinutes()).slice(-2);
}
function hwFmtLocalDay(ms, off){
  var d = new Date(ms + off * 1000);
  return ['So','Mo','Di','Mi','Do','Fr','Sa'][d.getUTCDay()] + ', ' + d.getUTCDate() + '.' + (d.getUTCMonth() + 1) + '.';
}

/* ---------- Farbverlauf des Himmels nach Sonnenhöhe ---------- */
/* [Sonnenhöhe°, oben, Mitte, unten] – von hoch nach tief, dazwischen wird linear gemischt */
var HW_SKY_ANCHORS = [
  [ 30, '#3D76B6', '#6EA3D8', '#C4DFF3'],
  [ 12, '#4A7FBE', '#7DAEDB', '#D6E6F2'],
  [  5, '#5C86C0', '#A9B7D6', '#F0D9B5'],
  [  1, '#5F6BAE', '#D58FA0', '#F7B27A'],
  [ -2, '#4E4C9A', '#B8709A', '#F09A6E'],
  [ -5, '#38357E', '#7D5CA2', '#D07A94'],
  [ -9, '#262463', '#453B84', '#7A5A9A'],
  [-14, '#1B1948', '#2E2B6A', '#4A3F82'],
  [-20, '#100E2C', '#1A1840', '#262254']
];
function hwHex2rgb(h){ return [parseInt(h.substr(1,2),16), parseInt(h.substr(3,2),16), parseInt(h.substr(5,2),16)]; }
function hwRgb2hex(c){ return '#' + c.map(function(v){ v = Math.max(0, Math.min(255, Math.round(v))); return ('0' + v.toString(16)).slice(-2); }).join(''); }
function hwMixRgb(a, b, t){ return [a[0] + (b[0]-a[0])*t, a[1] + (b[1]-a[1])*t, a[2] + (b[2]-a[2])*t]; }
function hwSkyColorsAt(alt){
  var A = HW_SKY_ANCHORS, i;
  if(alt >= A[0][0]) return { top: hwHex2rgb(A[0][1]), mid: hwHex2rgb(A[0][2]), bot: hwHex2rgb(A[0][3]) };
  if(alt <= A[A.length-1][0]) { var L = A[A.length-1]; return { top: hwHex2rgb(L[1]), mid: hwHex2rgb(L[2]), bot: hwHex2rgb(L[3]) }; }
  for(i = 0; i < A.length - 1; i++){
    if(alt <= A[i][0] && alt >= A[i+1][0]){
      var t = (A[i][0] - alt) / (A[i][0] - A[i+1][0]);
      return {
        top: hwMixRgb(hwHex2rgb(A[i][1]), hwHex2rgb(A[i+1][1]), t),
        mid: hwMixRgb(hwHex2rgb(A[i][2]), hwHex2rgb(A[i+1][2]), t),
        bot: hwMixRgb(hwHex2rgb(A[i][3]), hwHex2rgb(A[i+1][3]), t)
      };
    }
  }
  return { top: hwHex2rgb(A[0][1]), mid: hwHex2rgb(A[0][2]), bot: hwHex2rgb(A[0][3]) };
}
/* Koordinaten für den Hintergrund: gewählter/letzter Standort, sonst grobe Annahme aus der Zeitzone des Geräts */
function hwSkyCoords(){
  try{
    if(hwGetLocationMode() === 'manual'){ var m = hwGetManualLocation(); if(m) return { lat: m.lat, lon: m.lon }; }
    var c = hwGetCachedLocation();
    if(c) return { lat: c.lat, lon: c.lon };
  }catch(e){}
  return { lat: 51, lon: -new Date().getTimezoneOffset() / 4 };
}
window.hwSkyCloud = null;
function hwSetSkyCloud(pct){ window.hwSkyCloud = pct; hwApplySky(); }
function hwApplySky(){
  var root = document.documentElement;
  var bg = document.getElementById('hw-sky-bg');
  if(!bg && document.body){
    bg = document.createElement('div');
    bg.id = 'hw-sky-bg';
    bg.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(bg, document.body.firstChild);
  }
  var c = hwSkyCoords();
  var alt = hwSunPosition(new Date(), c.lat, c.lon).altitude;
  var cols = hwSkyColorsAt(alt);
  var cl = window.hwSkyCloud != null ? hwClamp01(window.hwSkyCloud / 100) : 0.25;
  var dark = root.getAttribute('data-theme') === 'dark';
  var dayF = hwClamp01((alt + 6) / 14);          /* 0 nachts … 1 tagsüber: Wolken entsättigen v. a. tagsüber */
  var out = {};
  ['top','mid','bot'].forEach(function(k){
    var rgb = cols[k];
    var gray = 0.3 * rgb[0] + 0.59 * rgb[1] + 0.11 * rgb[2];
    var f = 0.55 * cl * (0.35 + 0.65 * dayF);
    rgb = hwMixRgb(rgb, [gray * 0.92, gray * 0.95, gray], f);
    if(dark) rgb = hwMixRgb(rgb, [11, 9, 32], 0.5);
    out[k] = hwRgb2hex(rgb);
  });
  root.style.setProperty('--sky-1', out.top);
  root.style.setProperty('--sky-2', out.mid);
  root.style.setProperty('--sky-3', out.bot);
  var glow = Math.exp(-Math.pow((alt - 0.5) / 5.5, 2)) * (1 - cl * 0.65) * (dark ? 0.7 : 1);
  root.style.setProperty('--glow-o', glow.toFixed(3));
  var stars = hwClamp01((-alt - 5) / 9) * (1 - cl * 0.85);
  root.style.setProperty('--stars-o', stars.toFixed(3));
  root.setAttribute('data-sky', alt > 3 ? 'day' : (alt > -9 ? 'dusk' : 'night'));
  window.hwSkyThemeColor = true;
  var meta = document.querySelector('meta[name=theme-color]');
  if(meta) meta.setAttribute('content', out.top);
}
hwApplySky();
setInterval(hwApplySky, 300000);
document.addEventListener('visibilitychange', function(){ if(!document.hidden) hwApplySky(); });

/* ---------- Mond als Scheibe mit echter Phase (SVG) ---------- */
/* D: Elongation Mond–Sonne in Grad (0 = Neumond, 180 = Vollmond); Nordhalbkugel-Ansicht (zunehmend = rechts beleuchtet) */
function hwMoonDiscSvg(D, size, litColor, darkColor){
  size = size || 40;
  litColor = litColor || '#F1EDFB';
  darkColor = darkColor || 'rgba(255,255,255,0.14)';
  var r = size / 2 - 1, cx = size / 2, cy = size / 2;
  var waxing = D <= 180, Dm = waxing ? D : 360 - D;
  var k = Math.cos(hwDeg2rad(Dm)), rx = Math.abs(k) * r;
  var lit = '';
  if(Dm > 176){ lit = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + litColor + '"/>'; }
  else if(Dm > 4){
    var d = 'M ' + cx + ' ' + (cy - r) + ' A ' + r + ' ' + r + ' 0 0 1 ' + cx + ' ' + (cy + r) +
            ' A ' + rx.toFixed(2) + ' ' + r + ' 0 0 ' + (k > 0 ? 0 : 1) + ' ' + cx + ' ' + (cy - r) + ' Z';
    lit = '<path d="' + d + '" fill="' + litColor + '"' + (waxing ? '' : ' transform="translate(' + size + ',0) scale(-1,1)"') + '/>';
  }
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" aria-hidden="true" focusable="false">' +
    '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + darkColor + '"/>' + lit + '</svg>';
}

/* ---------- Himmelsfenster (Hero): Blick nach Süden mit Sonne und Mond an ihrer echten Position ---------- */
function hwOrbPos(az, alt){
  /* Osten (90°) links, Süden (180°) Mitte, Westen (270°) rechts; Horizont bei 86 %, 65° Höhe bei ca. 16 % */
  var x = ((hwWrap180(az - 180)) / 210) * 1 + 0.5;
  x = Math.max(0.05, Math.min(0.95, x));
  var y = 0.86 - Math.max(-6, Math.min(70, alt)) / 70 * 0.70;
  /* Unten links liegen Temperatur und Beschreibung (siehe .hw-hero-main). Ein tiefstehender
     Sonnen-/Mond-Kreis würde dort mit der Zahl überlappen, darum dort die Bahn nach oben begrenzen. */
  if(x < 0.72 && y > 0.40) y = 0.40;
  return { x: x * 100, y: y * 100, outside: Math.abs(hwWrap180(az - 180)) > 105 };
}
function hwRenderScene(sceneId, code, lat, lon, cloud){
  var el = document.getElementById(sceneId);
  if(!el) return;
  var cond = hwSkyCondition(code);
  var now = new Date();
  var sun = hwSunPosition(now, lat, lon), moon = hwMoonPosition(now, lat, lon);
  var ph = hwMoonPhase(now);
  var cl = cloud != null ? cloud : (cond === 'clear' ? 5 : cond === 'partly' ? 45 : 85);
  var html = '<div class="hw-scene-stars"></div>';
  var sp = hwOrbPos(sun.azimuth, sun.altitude), mp = hwOrbPos(moon.azimuth, moon.altitude);
  var dim = 1 - hwClamp01(cl / 100) * 0.75;
  if(sun.altitude > -4 && !sp.outside){
    var warm = sun.altitude < 10 ? '#FF9F5A' : '#FFE49A';
    html += '<div class="hw-orb hw-orb-sun" style="left:' + sp.x.toFixed(1) + '%;top:' + sp.y.toFixed(1) + '%;opacity:' + Math.max(0.35, dim).toFixed(2) + ';--orb:' + warm + ';"></div>';
  }
  if(moon.altitude > -2 && !mp.outside){
    var mo = (sun.altitude > 0 ? 0.55 : 1) * Math.max(0.4, dim);
    html += '<div class="hw-orb hw-orb-moon" style="left:' + mp.x.toFixed(1) + '%;top:' + mp.y.toFixed(1) + '%;opacity:' + mo.toFixed(2) + ';">' + hwMoonDiscSvg(ph.elongation, 46) + '</div>';
  }
  var nCl = cl < 15 ? 0 : (cl < 40 ? 1 : (cl < 70 ? 2 : 3));
  for(var i = 0; i < nCl; i++) html += '<span class="hw-cloud hw-cloud-' + (i + 1) + '"></span>';
  if(cl >= 60) html += '<div class="hw-overcast" style="opacity:' + (0.25 + cl / 100 * 0.4).toFixed(2) + ';"></div>';
  if(cond === 'rain' || cond === 'storm'){
    var drops = '';
    for(var r = 0; r < 18; r++) drops += '<span class="hw-raindrop" style="left:' + ((r * 11 + 5) % 100) + '%;animation-delay:' + (r * 0.11).toFixed(2) + 's;"></span>';
    html += '<div class="hw-rain-layer">' + drops + '</div>';
  }
  if(cond === 'snow'){
    var fl = '';
    for(var f = 0; f < 14; f++) fl += '<span class="hw-snowflake" style="left:' + ((f * 9 + 4) % 100) + '%;animation-delay:' + (f * 0.35).toFixed(2) + 's;"></span>';
    html += '<div class="hw-snow-layer">' + fl + '</div>';
  }
  if(cond === 'storm') html += '<div class="hw-flash"></div>';
  el.innerHTML = html;
}

/* ---------- Tagesband: der ganze Ortstag nach echter Sonnenhöhe, mit Regenwahrscheinlichkeit ---------- */
function hwNextDayEventText(ev, nowMs, off){
  var list = [
    [ev.civilDawn, 'Bürgerliche Dämmerung ab '], [ev.sunrise, 'Sonnenaufgang '], [ev.goldenEndMorning, 'Goldene Stunde endet '],
    [ev.goldenStartEvening, 'Goldene Stunde ab '], [ev.sunset, 'Sonnenuntergang '], [ev.blueEndEvening, 'Blaue Stunde bis ']
  ];
  for(var i = 0; i < list.length; i++){
    if(list[i][0] && list[i][0] > nowMs) return list[i][1] + hwFmtLocal(list[i][0], off) + ' Uhr';
  }
  return '';
}
function hwRenderDayBand(containerId, data, lat, lon){
  var el = document.getElementById(containerId);
  if(!el || !data.daily || !data.daily.time) return;
  var off = data.utc_offset_seconds;
  var dayStart = Date.parse(data.daily.time[0] + 'T00:00:00Z') - off * 1000;
  var stops = [], i;
  for(i = 0; i <= 48; i++){
    var alt = hwSunPosition(new Date(dayStart + i * 1800000), lat, lon).altitude;
    var cols = hwSkyColorsAt(alt);
    var rgb = hwMixRgb(cols.mid, cols.bot, hwClamp01(1 - Math.abs(alt) / 8) * 0.7);
    stops.push(hwRgb2hex(rgb) + ' ' + (i / 48 * 100).toFixed(2) + '%');
  }
  var nowFrac = hwClamp01((Date.now() - dayStart) / 86400000);
  var rain = '';
  var h = data.hourly;
  if(h && h.time && h.precipitation_probability){
    for(i = 0; i < h.time.length; i++){
      var ms = hwRealTimeMs(h.time[i], off);
      if(ms < dayStart || ms >= dayStart + 86400000) continue;
      var p = h.precipitation_probability[i];
      if(p == null || p < 30) continue;
      rain += '<span class="hw-band-rain" style="left:' + ((ms - dayStart) / 86400000 * 100).toFixed(2) + '%;height:' + Math.max(14, p) + '%;" title="' + p + ' % Regen"></span>';
    }
  }
  var ticks = '';
  function tick(str, label){
    if(!str) return;
    var f = hwClamp01((hwRealTimeMs(str, off) - dayStart) / 86400000);
    ticks += '<span class="hw-band-tick" style="left:' + (f * 100).toFixed(2) + '%;"><i></i><b>' + hwFmtLocal(hwRealTimeMs(str, off), off) + '</b></span>';
  }
  tick(data.daily.sunrise[0]); tick(data.daily.sunset[0]);
  var ev = hwDayEvents(dayStart, lat, lon);
  var note = hwNextDayEventText(ev, Date.now(), off);
  el.innerHTML =
    '<div class="hw-band" role="img" aria-label="Tagesverlauf des Himmels von 0 bis 24 Uhr, mit Sonnenaufgang, Sonnenuntergang und Regenwahrscheinlichkeit">' +
      '<div class="hw-band-track" style="background:linear-gradient(90deg,' + stops.join(',') + ');">' + rain +
        '<span class="hw-band-now" style="left:' + (nowFrac * 100).toFixed(2) + '%;"></span></div>' +
      '<div class="hw-band-ticks">' + ticks + '</div>' +
    '</div>' + (note ? '<p class="hw-band-note">' + note + '</p>' : '');
}

/* ================= Abendrot / Morgenrot ================= */
/* Nächstes Sonnenuntergangs- bzw. -aufgangsereignis (ohne Zeitzonen-Wissen, nur aus Datum + Standort) */
function hwNextSunEvent(lat, lon, wantSet, fromMs){
  fromMs = fromMs || Date.now();
  var list = hwSunAltCrossings(fromMs - 3600000, fromMs + 50 * 3600000, lat, lon, -0.833);
  for(var i = 0; i < list.length; i++){
    if(list[i].rising === !wantSet && list[i].ms > fromMs - 900000) return list[i].ms;
  }
  return null;
}
/* Stundenwerte eines Punktes zum Zeitpunkt ms (nächstliegende volle Stunde) */
function hwSampleHour(pt, ms){
  var h = pt.hourly, off = pt.utc_offset_seconds, best = 0, bd = Infinity;
  for(var i = 0; i < h.time.length; i++){
    var d = Math.abs(hwRealTimeMs(h.time[i], off) - ms);
    if(d < bd){ bd = d; best = i; }
  }
  function g(k){ return h[k] ? h[k][best] : null; }
  return { low: g('cloud_cover_low') || 0, mid: g('cloud_cover_mid') || 0, high: g('cloud_cover_high') || 0,
           total: g('cloud_cover') || 0, precip: g('precipitation_probability') || 0, vis: g('visibility'), rh: g('relative_humidity_2m') };
}
/* Schätzformel (transparent, nicht wissenschaftlich validiert):
   - Horizont in Sonnenrichtung frei von tiefen Wolken (Mittel aus 60 und 150 km Entfernung)
   - „Leinwand“: mittlere/hohe Wolken über dir und in Sonnenrichtung, ideal 35–65 %
   - tiefe Wolken über dir, Regenwahrscheinlichkeit und diesiges Wetter mindern */
function hwGlowScore(o, a, b){
  var lowSun = 0.55 * a.low + 0.45 * b.low;
  var blocker = 1 - hwClamp01((lowSun - 15) / 55);
  function canvasOf(p){ return Math.max(p.high, p.mid * 0.85); }
  var canvas = 0.35 * canvasOf(o) + 0.35 * canvasOf(a) + 0.30 * canvasOf(b);
  var cf;
  if(canvas < 5) cf = 0.30;
  else if(canvas < 20) cf = 0.30 + (canvas - 5) / 15 * 0.45;
  else if(canvas < 35) cf = 0.75 + (canvas - 20) / 15 * 0.25;
  else if(canvas <= 65) cf = 1;
  else if(canvas <= 90) cf = 1 - (canvas - 65) / 25 * 0.4;
  else cf = 0.6 - (canvas - 90) / 10 * 0.15;
  var ownLow = 1 - hwClamp01((o.low - 50) / 50) * 0.6;
  var rain = 1 - hwClamp01((o.precip - 30) / 60) * 0.8;
  var haze = (o.vis != null && o.vis < 8000) ? 0.9 : 1;
  var score = Math.round(95 * blocker * cf * ownLow * rain * haze);   /* Höchstwert 95: eine Garantie gibt es nie */
  return { score: Math.max(0, Math.min(100, score)), blocker: blocker, canvas: canvas, lowSun: lowSun, rain: rain, ownLow: ownLow, haze: haze, cf: cf };
}
function hwGlowClass(score){
  if(score >= 65) return { stufe: 'gruen', label: 'Gute Chancen' };
  if(score >= 35) return { stufe: 'gelb', label: 'Durchwachsene Chancen' };
  return { stufe: 'rot', label: 'Geringe Chancen' };
}
function hwGlowText(r, dirWord, sunrise){
  var w = sunrise ? 'Morgenrot' : 'Abendrot';
  if(r.blocker < 0.45) return 'Tiefe Wolken (' + Math.round(r.lowSun) + ' %) Richtung ' + dirWord + ' verdecken voraussichtlich den Horizont – das Licht kommt kaum durch.';
  if(r.rain < 0.6) return 'Regen ist wahrscheinlich – das dämpft die Farben.';
  if(r.canvas < 10) return 'Kaum mittlere oder hohe Wolken: Die Sicht ist frei, aber ohne Wolken zum Anstrahlen bleibt der Himmel eher blass.';
  if(r.canvas > 80) return 'Sehr dichte mittlere und hohe Wolken: Es kann trüb bleiben – nur Lücken am Horizont bringen dann noch Farbe.';
  if(r.score >= 65) return 'Freier Horizont Richtung ' + dirWord + ' und ein lockerer Wolkenschleier darüber – die klassische Zutat für kräftiges ' + w + '.';
  return 'Gemischte Bedingungen – ' + w + ' ist möglich, aber nicht sicher.';
}
/* Komplettberechnung: Ereignis wählen, Punkte in Sonnenrichtung abfragen, bewerten */
function hwComputeGlow(lat, lon, wantSet){
  var evMs = hwNextSunEvent(lat, lon, wantSet);
  if(evMs == null) return Promise.reject(new Error(wantSet ? 'An diesem Ort geht die Sonne in den nächsten Tagen nicht unter.' : 'An diesem Ort geht die Sonne in den nächsten Tagen nicht auf.'));
  var az = hwSunPosition(new Date(evMs), lat, lon).azimuth;
  var p1 = hwDestPoint(lat, lon, az, 60), p2 = hwDestPoint(lat, lon, az, 150);
  return hwFetchSkyPoints([{ lat: lat, lon: lon }, p1, p2]).then(function(res){
    if(res.length < 3) throw new Error('Wolkendaten unvollständig');
    var o = hwSampleHour(res[0], evMs), a = hwSampleHour(res[1], evMs), b = hwSampleHour(res[2], evMs);
    var sc = hwGlowScore(o, a, b), cls = hwGlowClass(sc.score);
    var off = res[0].utc_offset_seconds;
    return { ms: evMs, off: off, azimuth: az, own: o, near: a, far: b, calc: sc, cls: cls,
             text: hwGlowText(sc, hwCompassWord(az), !wantSet), sunrise: !wantSet, lat: lat, lon: lon };
  });
}

/* ================= Nachthimmel ================= */
function hwNightQualityColor(q){
  if(q == null) return 'var(--border)';
  if(q >= 65) return 'var(--green-dot)';
  if(q >= 35) return 'var(--yellow-dot)';
  return 'var(--red-dot)';
}
/* Gleiche Schwellen wie hwNightQualityColor, aber als Ampel-Klasse+Label (Score der ganzen Nacht UND des besten Fensters
   müssen exakt dieselbe Einstufung verwenden, sonst widersprechen sich Zahl/Graph und "Beste Zeit" wie in v46 gemeldet) */
function hwNightClass(q){
  if(q == null) return null;
  if(q >= 65) return { s: 'gruen', l: 'Gute Sicht' };
  if(q >= 35) return { s: 'gelb', l: 'Mittlere Sicht' };
  return { s: 'rot', l: 'Schlechte Sicht' };
}
function hwGetBortle(){
  try{ var b = parseInt(localStorage.getItem('hw-bortle'), 10); if(b >= 1 && b <= 9) return b; }catch(e){}
  return 5;
}
function hwSetBortle(b){ try{ localStorage.setItem('hw-bortle', String(b)); }catch(e){} }
/* Bewertung einer Stunde: Wolken, Mondlicht (nur wenn der Mond über dem Horizont steht), Restdämmerung, Lichtverschmutzung (Bortle 1–9) */
function hwNightSlotQuality(cloud, sunAlt, moonAlt, moonIllum, bortle){
  if(sunAlt > -12) return null;
  var cloudF = 1 - Math.pow(hwClamp01(cloud / 100), 0.8);
  var moonPen = moonAlt > 0 ? (moonIllum / 100) * hwClamp01((moonAlt + 3) / 25) * 0.55 : 0;
  var twiPen = sunAlt > -18 ? (sunAlt + 18) / 6 * 0.25 : 0;
  var bortlePen = (bortle - 1) / 8 * 0.5;
  return Math.round(100 * cloudF * (1 - moonPen) * (1 - twiPen) * (1 - bortlePen));
}
function hwComputeNight(lat, lon){
  var now = Date.now();
  var alt0 = hwSunPosition(new Date(now), lat, lon).altitude;
  var list = hwSunAltCrossings(now - 20 * 3600000, now + 36 * 3600000, lat, lon, -0.833);
  var start = null, end = null, i;
  if(alt0 < -0.833){
    for(i = 0; i < list.length; i++){ if(!list[i].rising && list[i].ms <= now) start = list[i].ms; }
    if(start == null) start = now - 8 * 3600000;
    for(i = 0; i < list.length; i++){ if(list[i].rising && list[i].ms > now){ end = list[i].ms; break; } }
  } else {
    for(i = 0; i < list.length; i++){
      if(!list[i].rising && list[i].ms > now && start == null) start = list[i].ms;
      else if(list[i].rising && start != null && list[i].ms > start){ end = list[i].ms; break; }
    }
  }
  if(start == null || end == null) return Promise.reject(new Error('Für diesen Ort lässt sich keine Nacht bestimmen (Polartag/-nacht).'));
  /* Ohne Netz bleiben Mond, Planeten und Kalender nutzbar (rein lokal berechnet); nur die Wolkenbewertung entfällt */
  return hwFetchSkyPoints([{ lat: lat, lon: lon }]).catch(function(){ return null; }).then(function(res){
    var pt = res ? res[0] : null, h = pt ? pt.hourly : { time: [] }, bortle = hwGetBortle();
    var off = pt ? pt.utc_offset_seconds : -new Date().getTimezoneOffset() * 60;
    var slots = [], minSun = 90;
    for(var k = 0; k < h.time.length; k++){
      var t0 = hwRealTimeMs(h.time[k], off);
      if(t0 + 3600000 <= start || t0 >= end) continue;
      var mid = t0 + 1800000;
      var sunAlt = hwSunPosition(new Date(mid), lat, lon).altitude;
      var mAlt = hwMoonPosition(new Date(mid), lat, lon).altitude;
      var illum = hwMoonPhase(new Date(mid)).illumination;
      if(sunAlt < minSun) minSun = sunAlt;
      slots.push({ ms: t0, cloud: h.cloud_cover[k], sunAlt: sunAlt, moonAlt: mAlt, moonIllum: illum,
                   q: hwNightSlotQuality(h.cloud_cover[k], sunAlt, mAlt, illum, bortle) });
    }
    var valid = slots.filter(function(s){ return s.q != null; });
    var avg = valid.length ? Math.round(valid.reduce(function(a, s){ return a + s.q; }, 0) / valid.length) : null;
    var best = null;
    for(i = 0; i + 1 < slots.length; i++){
      if(slots[i].q == null || slots[i+1].q == null) continue;
      var v = (slots[i].q + slots[i+1].q) / 2;
      if(!best || v > best.q) best = { from: slots[i].ms, to: slots[i+1].ms + 3600000, q: Math.round(v) };
    }
    return {
      start: start, end: end, off: off, offline: !pt, slots: slots, avg: avg, best: best, minSun: minSun, bortle: bortle, lat: lat, lon: lon,
      moon: hwMoonPhase(new Date((start + end) / 2)),
      moonEvents: hwMoonRiseSet(start, end, lat, lon),
      objects: hwVisiblePlanets(start, end, lat, lon, -4)
    };
  });
}
