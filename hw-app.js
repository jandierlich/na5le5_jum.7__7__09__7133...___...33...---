/* HimmelsWahr — gemeinsame Funktionen (Daten, Standort, Oberfläche). Astronomie: hw-astro.js · Himmels-Funktionen: hw-sky.js */

/* ---------- Symbol-System (SVG-Line-Icons statt Emoji) ---------- */
/* Alle Symbole selbst gezeichnet (Linie + gefüllte Fläche, wie die eigenen Symbole in wz-icons.svg), viewBox 0 0 24 24, stroke=currentColor —
   damit sie sich automatisch an Hell-/Dunkelmodus und Textfarbe anpassen, ohne Emoji-Zeichensatz. */
var HW_ICON_SVG = {
  home:       '<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10.5V20h5v-5.5h2V20h5v-9.5"/>',
  moon:       '<path d="M18.5 15.2A8 8 0 1 1 10.3 4.1a6.4 6.4 0 1 0 8.2 11.1Z" fill="currentColor" stroke="none"/>',
  pin:        '<path d="M12 21.6s7-6.8 7-12.2a7 7 0 1 0-14 0C5 14.8 12 21.6 12 21.6Z"/><circle cx="12" cy="9.6" r="2.4"/>',
  gear:       '<path d="M4 7h16"/><circle cx="9" cy="7" r="2.3" fill="currentColor" stroke="none"/><path d="M4 12h16"/><circle cx="16" cy="12" r="2.3" fill="currentColor" stroke="none"/><path d="M4 17h16"/><circle cx="11" cy="17" r="2.3" fill="currentColor" stroke="none"/>',
  refresh:    '<path d="M3 11a9 9 0 0 1 15.3-6.4L21 7"/><path d="M21 3v4h-4"/><path d="M21 13a9 9 0 0 1-15.3 6.4L3 17"/><path d="M3 21v-4h4"/>',
  bell:       '<path d="M12 4A5 5 0 0 0 7 9V15Q7 16 6 16H18Q17 16 17 15V9A5 5 0 0 0 12 4Z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
  bellOff:    '<path d="M8.5 6.2A5 5 0 0 1 17 9v6M7 9v6L6 16H18"/><path d="M10 19a2 2 0 0 0 4 0"/><path d="M3 3l18 18"/>',
  search:     '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.8-4.8"/>',
  close:      '<path d="M5 5l14 14M19 5 5 19"/>',
  warning:    '<path d="M12 3.5 21.5 20h-19L12 3.5Z"/><path d="M12 9.5v4.3"/><circle cx="12" cy="17" r="0.7" fill="currentColor" stroke="none"/>',
  link:       '<path d="M13.5 4.5h6v6"/><path d="M19.5 4.5 11 13"/><path d="M10 6H7.2A2.2 2.2 0 0 0 5 8.2v8.6A2.2 2.2 0 0 0 7.2 19h8.6a2.2 2.2 0 0 0 2.2-2.2V14"/>',
  chart:      '<path d="M4.5 20V11M10 20V4M15.5 20v-7M21 20H3"/>',
  thermometer:'<path d="M13 13.8V6a1 1 0 1 0-2 0v7.8a3.5 3.5 0 1 0 2 0Z"/><circle cx="12" cy="16.5" r="1.4" fill="currentColor" stroke="none"/>',
  droplet:    '<path d="M12 3s6 7.2 6 11.2a6 6 0 1 1-12 0C6 10.2 12 3 12 3Z"/>',
  wind:       '<path d="M3 8h11a2.5 2.5 0 1 0-2.5-2.5"/><path d="M3 12h15a2.5 2.5 0 1 1-2.5 2.5"/><path d="M3 16h9a2 2 0 1 1-2 2"/>',
  compass:    '<circle cx="12" cy="12" r="9" stroke-width="1.6"/><path fill-rule="evenodd" d="M16.3 7.7l-2.7 5.9-5.9 2.7 2.7-5.9ZM12 10.8a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Z" fill="currentColor" stroke="none"/>',
  eye:        '<path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.6"/>',
  haze:       '<path d="M4 8h16M4 12h10M4 16h16M16.5 12h3.5"/>',
  snowflake:  '<path d="M12 3v18M4.8 7.5l14.4 9M19.2 7.5l-14.4 9"/>',
  cloudRain:  '<path d="M7 15a4.5 4.5 0 0 1 .4-9 5.5 5.5 0 0 1 10.6 1.7A4 4 0 0 1 17 15H7Z"/><path d="M8 18l-1 2M12 18l-1 2M16 18l-1 2"/>',
  leaf:       '<path d="M5.5 18.5C5 11 9.5 5.5 19 5c.5 9.5-5 14-13.5 13.5Z"/><path d="M4 20l9-9"/>',
  sunset:     '<path d="M7.5 16.5a4.5 4.5 0 0 1 9 0Z" fill="currentColor" stroke="none"/><path d="M3 16.5h18M7.5 20h9"/><path d="M12 6v2.6M4.6 9.1l1.8 1.8M19.4 9.1l-1.8 1.8"/>',
  star:       '<path d="M12.00 3.30L14.57 9.06L20.84 9.73L16.16 13.95L17.47 20.12L12.00 16.97L6.53 20.12L7.84 13.95L3.16 9.73L9.43 9.06Z"/>',
  clock:      '<circle cx="12" cy="12" r="9"/><path d="M12 7.2v5l3.3 1.9"/>',
  arrowUp:    '<path d="M12 19V5"/><path d="M6 11l6-6 6 6"/>',
  arrowDown:  '<path d="M12 5v14"/><path d="M18 13l-6 6-6-6"/>',
  arrowUpRight:'<path d="M7 17 17 7"/><path d="M9 7h8v8"/>',
  arrowDownRight:'<path d="M7 7 17 17"/><path d="M17 9V17H9"/>',
  arrowRight: '<path d="M4 12h15"/><path d="M13 6l6 6-6 6"/>',
  sun:        '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v3M12 18.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  gust:       '<path d="M3 8h12a2 2 0 1 0-2-2"/><path d="M3 12h16a2 2 0 1 1-2 2"/><path d="M3 16h10a2 2 0 1 1-2 2"/>',
  calendar:   '<rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
  sparkles:   '<path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><path d="M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2"/><circle cx="12" cy="12" r="2"/>',
  more:       '<circle cx="5.5" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.7" fill="currentColor" stroke="none"/>',
  info:       '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><circle cx="12" cy="8" r="0.9" fill="currentColor" stroke="none"/>'
};
function hwIcon(name, size, cls, filled){
  var svg = HW_ICON_SVG[name];
  if(!svg) return '';
  size = size || 18;
  return '<svg class="hw-icon' + (cls ? ' ' + cls : '') + '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="' + (filled ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + svg + '</svg>';
}
/* Ersetzt alle statischen <span data-hwi="name" data-hwi-size="18"></span> im HTML durch das passende SVG */
function hwInitIcons(root){
  (root || document).querySelectorAll('[data-hwi]').forEach(function(el){
    var size = el.getAttribute('data-hwi-size');
    el.innerHTML = hwIcon(el.getAttribute('data-hwi'), size ? parseInt(size, 10) : 18);
  });
}
/* ---------- Untere Navigation (auf allen Seiten gleich) ---------- */
function hwRenderNav(active){
  var items = [
    ['hw-index.html', 'home', 'Start'], ['hw-umwelt.html', 'leaf', 'Luft'], ['hw-abendrot.html', 'sunset', 'Abend'],
    ['hw-nachthimmel.html', 'moon', 'Nacht'], ['hw-kompass.html', 'compass', 'Kompass']
  ];
  var html = '<nav class="hw-nav" aria-label="Hauptnavigation">' + items.map(function(it){
    return '<a href="' + it[0] + '"' + (it[0] === active ? ' aria-current="page"' : '') + '>' + hwIcon(it[1], 22) + '<span>' + it[2] + '</span></a>';
  }).join('') + '<button type="button" onclick="hwOpenHinweise()" aria-label="Mehr: Standort, Einstellungen, Darstellung">' + hwIcon('more', 22) + '<span>Mehr</span></button></nav>';
  var host = document.getElementById('hw-nav');
  if(!host){ host = document.createElement('div'); host.id = 'hw-nav'; document.body.appendChild(host); }
  host.innerHTML = html;
}

/* ---------- Sicherheit: Text für innerHTML maskieren (Ortsnamen stammen aus externer Ortssuche) ---------- */
function hwEsc(v){
  return String(v == null ? '' : v).replace(/[&<>"']/g, function(c){
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
  });
}

/* ---------- Hell-/Dunkelmodus ---------- */
/* Standard bleibt – wie bisher vorgegeben – der Hellmodus beim Start. In den Einstellungen wählbar: Hell, Dunkel, System. */
function hwGetThemePref(){
  try{ return localStorage.getItem('hw-theme-pref') || 'light'; }catch(e){ return 'light'; }
}
function hwSetThemePref(pref){
  try{ localStorage.setItem('hw-theme-pref', pref); }catch(e){}
}
function hwResolveTheme(pref){
  if(pref === 'dark') return 'dark';
  if(pref === 'system') return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  return 'light';
}
function hwApplyTheme(mode){
  document.documentElement.setAttribute('data-theme', mode);
  hwUpdateThemeMeta(mode);
  if(window.hwApplySky) window.hwApplySky();
}
function hwInitTheme(){
  hwApplyTheme(hwResolveTheme(hwGetThemePref()));
  try{ localStorage.removeItem('hw-theme'); }catch(e){} /* Altwert aus früherer Version aufräumen */
}
function hwToggleTheme(){
  var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  hwSetThemePref(next);
  hwApplyTheme(next);
}
function hwUpdateThemeMeta(mode){
  var meta = document.querySelector('meta[name=theme-color]');
  if(meta && !window.hwSkyThemeColor) meta.setAttribute('content', mode === 'dark' ? '#17142F' : '#DCE8F3');
}

/* ---------- Offline-Betrieb: Service Worker registrieren (nur über https/http, nicht über file://) ---------- */


/* ---------- Standort (merkt sich den letzten bekannten Standort lokal) ---------- */
function hwGetLocation(){
  return new Promise(function(resolve, reject){
    if(!navigator.geolocation){ reject(new Error('Geolokalisierung nicht verfügbar')); return; }
    navigator.geolocation.getCurrentPosition(
      function(pos){
        var loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        try{ localStorage.setItem('hw-last-location', JSON.stringify(loc)); }catch(e){}
        resolve(loc);
      },
      function(err){
        var cached = hwGetCachedLocation();
        if(cached) resolve(cached); else reject(err);
      },
      { enableHighAccuracy:false, timeout:8000, maximumAge:300000 }
    );
  });
}
function hwGetCachedLocation(){
  try{
    var raw = localStorage.getItem('hw-last-location');
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}
function hwHasCachedLocation(){
  return !!hwGetCachedLocation();
}

/* ---------- Manuell gewählter Standort (Geocoding) ---------- */
function hwGetManualLocation(){
  try{
    var raw = localStorage.getItem('hw-manual-location');
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}
function hwGetLocationMode(){
  try{ return localStorage.getItem('hw-location-mode') || 'auto'; }catch(e){ return 'auto'; }
}
function hwSetManualLocation(lat, lon, name){
  var loc = { lat: lat, lon: lon, name: name };
  try{
    localStorage.setItem('hw-manual-location', JSON.stringify(loc));
    localStorage.setItem('hw-location-mode', 'manual');
  }catch(e){}
}
function hwSetAutoLocation(){
  try{ localStorage.setItem('hw-location-mode', 'auto'); }catch(e){}
}
/* Liefert den aktuell aktiven Standort — entweder den manuell gewählten Ort (ohne GPS-Abfrage)
   oder den automatischen GPS-Standort (bestehendes Verhalten, inkl. Cache-Fallback). */
function hwGetActiveLocation(){
  if(hwGetLocationMode() === 'manual'){
    var m = hwGetManualLocation();
    if(m) return Promise.resolve(m);
  }
  return hwGetLocation().then(function(loc){
    return { lat: loc.lat, lon: loc.lon, name: null };
  });
}
function hwHasActiveLocationReady(){
  if(hwGetLocationMode() === 'manual' && hwGetManualLocation()) return true;
  return hwHasCachedLocation();
}
function hwActiveLocationLabel(){
  if(hwGetLocationMode() === 'manual'){
    var m = hwGetManualLocation();
    if(m) return hwIcon('pin', 14) + ' ' + hwEsc(m.name);
  }
  return hwIcon('pin', 14) + ' Mein Standort';
}

/* ---------- Geocoding-Suche (Open-Meteo, gleiche Anbieterfamilie/Lizenz wie Wetter-API) ---------- */
function hwGeocodeSearch(query){
  var params = new URLSearchParams({ name: query, count: '6', language: 'de', format: 'json' });
  return fetch('https://geocoding-api.open-meteo.com/v1/search?' + params.toString())
    .then(function(r){ if(!r.ok) throw new Error('Ortssuche nicht erreichbar'); return r.json(); })
    .then(function(data){ return data.results || []; });
}

/* ---------- Favoriten (mehrere gespeicherte Orte) ---------- */
/* Liste bleibt bewusst kurz (max. 8), damit sie auf dem Smartphone übersichtlich bleibt. */
function hwGetFavorites(){
  try{
    var raw = localStorage.getItem('hw-fav-locations');
    return raw ? JSON.parse(raw) : [];
  }catch(e){ return []; }
}
function hwSaveFavorites(list){
  try{ localStorage.setItem('hw-fav-locations', JSON.stringify(list)); }catch(e){}
}
function hwIsFavorite(lat, lon){
  return hwGetFavorites().some(function(f){ return Math.abs(f.lat-lat) < 0.01 && Math.abs(f.lon-lon) < 0.01; });
}
function hwAddFavorite(lat, lon, name){
  if(hwIsFavorite(lat, lon)) return;
  var list = hwGetFavorites();
  list.push({ lat: lat, lon: lon, name: name });
  if(list.length > 8) list.shift();
  hwSaveFavorites(list);
}
function hwRemoveFavorite(idx){
  var list = hwGetFavorites();
  list.splice(idx, 1);
  hwSaveFavorites(list);
}

/* ---------- Standort-Auswahl (wiederverwendbares Overlay für alle Seiten) ---------- */
function hwOpenLocationPicker(){
  if(document.getElementById('hw-loc-overlay')) return;
  var overlay = document.createElement('div');
  overlay.id = 'hw-loc-overlay';
  overlay.className = 'hw-sheet-overlay hw-loc-overlay';
  overlay.innerHTML =
    '<div class="hw-sheet-modal hw-loc-modal">' +
      '<h2 style="margin:0 0 10px;">Standort wählen</h2>' +
      '<button class="hw-btn primary" id="hw-loc-auto-btn" style="margin-bottom:10px;">' + hwIcon('pin', 15) + ' Automatisch (mein Standort)</button>' +
      '<div id="hw-loc-favorites"></div>' +
      '<div class="hw-loc-search-row">' +
        '<input type="text" id="hw-loc-search" placeholder="Ort eingeben, z. B. Hamburg" autocomplete="off">' +
        '<button class="hw-btn primary hw-loc-search-btn" id="hw-loc-search-btn" aria-label="Suchen">' + hwIcon('search', 16) + '</button>' +
      '</div>' +
      '<div id="hw-loc-results" class="hw-loc-results"></div>' +
      '<p class="hw-attrib">Ortssuche: <a href="https://open-meteo.com/en/docs/geocoding-api" target="_blank" rel="noopener noreferrer">Open-Meteo Geocoding</a>, Ortsdaten von <a href="https://www.geonames.org/" target="_blank" rel="noopener noreferrer">GeoNames</a> (<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>)</p>' +
      '<button class="hw-btn" id="hw-loc-close-btn" style="margin-top:10px;">Schließen</button>' +
    '</div>';
  document.body.appendChild(overlay);

  document.getElementById('hw-loc-close-btn').onclick = hwCloseLocationPicker;
  overlay.addEventListener('click', function(e){ if(e.target === overlay) hwCloseLocationPicker(); });

  document.getElementById('hw-loc-auto-btn').onclick = function(){
    hwSetAutoLocation();
    hwCloseLocationPicker();
    if(window.hwPageReload) window.hwPageReload();
  };

  function renderFavorites(){
    var wrap = document.getElementById('hw-loc-favorites');
    if(!wrap) return;
    var favs = hwGetFavorites();
    if(!favs.length){ wrap.innerHTML = ''; return; }
    wrap.innerHTML = '<p class="hw-loc-fav-title">' + hwIcon('star', 13) + ' Favoriten</p>' + favs.map(function(f, i){
      return '<div class="hw-loc-fav-row">' +
        '<button class="hw-loc-result-item hw-loc-fav-select" data-idx="' + i + '">' + hwEsc(f.name) + '</button>' +
        '<button class="hw-loc-fav-remove" data-idx="' + i + '" aria-label="Favorit entfernen">' + hwIcon('close', 14) + '</button>' +
      '</div>';
    }).join('');
    wrap.querySelectorAll('.hw-loc-fav-select').forEach(function(btn){
      btn.onclick = function(){
        var f = favs[+btn.getAttribute('data-idx')];
        hwSetManualLocation(f.lat, f.lon, f.name);
        hwCloseLocationPicker();
        if(window.hwPageReload) window.hwPageReload();
      };
    });
    wrap.querySelectorAll('.hw-loc-fav-remove').forEach(function(btn){
      btn.onclick = function(e){
        e.stopPropagation();
        hwRemoveFavorite(+btn.getAttribute('data-idx'));
        renderFavorites();
      };
    });
  }
  renderFavorites();

  var searchInput = document.getElementById('hw-loc-search');
  var resultsEl = document.getElementById('hw-loc-results');

  function runSearch(){
    var q = searchInput.value.trim();
    if(q.length < 2){ resultsEl.innerHTML = '<p style="font-size:13px;color:var(--text-secondary);">Bitte mindestens 2 Zeichen eingeben.</p>'; return; }
    resultsEl.innerHTML = '<p style="font-size:13px;color:var(--text-secondary);">Suche …</p>';
    hwGeocodeSearch(q).then(function(results){
      if(!results.length){ resultsEl.innerHTML = '<p style="font-size:13px;color:var(--text-secondary);">Keine Treffer.</p>'; return; }
      resultsEl.innerHTML = results.map(function(r, i){
        var parts = [r.name];
        if(r.admin1) parts.push(r.admin1);
        if(r.country) parts.push(r.country);
        return '<div class="hw-loc-result-row">' +
          '<button class="hw-loc-result-item" data-idx="' + i + '">' + hwEsc(parts.join(', ')) + '</button>' +
          '<button class="hw-loc-result-star" data-idx="' + i + '" aria-label="Zu Favoriten hinzufügen">' + hwIcon('star', 15) + '</button>' +
        '</div>';
      }).join('');
      resultsEl.querySelectorAll('.hw-loc-result-item').forEach(function(btn, i){
        btn.onclick = function(){
          var r = results[i];
          var label = r.name + (r.admin1 ? ', ' + r.admin1 : '') + (r.country ? ', ' + r.country : '');
          hwSetManualLocation(r.latitude, r.longitude, label);
          hwCloseLocationPicker();
          if(window.hwPageReload) window.hwPageReload();
        };
      });
      resultsEl.querySelectorAll('.hw-loc-result-star').forEach(function(btn, i){
        btn.onclick = function(e){
          e.stopPropagation();
          var r = results[i];
          var label = r.name + (r.admin1 ? ', ' + r.admin1 : '') + (r.country ? ', ' + r.country : '');
          hwAddFavorite(r.latitude, r.longitude, label);
          btn.innerHTML = hwIcon('star', 15, '', true);
          renderFavorites();
        };
      });
    }).catch(function(){
      resultsEl.innerHTML = '<p style="font-size:13px;color:var(--text-secondary);">Suche derzeit nicht verfügbar.</p>';
    });
  }

  document.getElementById('hw-loc-search-btn').onclick = runSearch;
  searchInput.addEventListener('keydown', function(e){
    if(e.key === 'Enter'){ e.preventDefault(); runSearch(); }
  });
  setTimeout(function(){ searchInput.focus(); }, 50);
}
function hwCloseLocationPicker(){
  var overlay = document.getElementById('hw-loc-overlay');
  if(overlay) overlay.remove();
}

/* ---------- Hinweise (Sammel-Overlay für Standort, Einstellungen, Hell/Dunkel) ---------- */
function hwOpenHinweise(){
  if(document.getElementById('hw-hinweise-overlay')) return;
  var overlay = document.createElement('div');
  overlay.id = 'hw-hinweise-overlay';
  overlay.className = 'hw-sheet-overlay';
  overlay.innerHTML =
    '<div class="hw-sheet-modal">' +
      '<h2 style="margin:0 0 14px;">Hinweise</h2>' +
      '<button type="button" class="hw-btn" id="hw-hinweise-loc-btn" style="justify-content:flex-start;">' + hwIcon('pin', 17) + ' Standort wählen</button>' +
      '<button type="button" class="hw-btn" id="hw-hinweise-settings-btn" style="justify-content:flex-start;">' + hwIcon('gear', 17) + ' Einstellungen</button>' +
      '<button type="button" class="hw-btn" id="hw-hinweise-theme-btn" style="justify-content:flex-start;">' + hwIcon('moon', 17) + ' Hell/Dunkel umschalten</button>' +
      '<a class="hw-btn" href="hw-info.html" style="justify-content:flex-start;">' + hwIcon('info', 17) + ' Einführung</a>' +
      '<h3 style="margin:16px 0 8px;font-size:14px;">Mehr am Himmel</h3>' +
      '<a class="hw-btn" href="./sternewahr-index.html" style="justify-content:flex-start;">' + hwIcon('moon', 17) + ' Sternenhimmel – live und mit Zeitreise</a>' +
      '<a class="hw-btn" href="./as-index.html" style="justify-content:flex-start;">' + hwIcon('sunset', 17) + ' AstroWahr – Sonnenzeiten, Mond, Horoskop</a>' +
      '<a class="hw-btn" href="./kw-index.html" style="justify-content:flex-start;">' + hwIcon('compass', 17) + ' KompassWahr – Richtungen im Kamerabild</a>' +
      '<a class="hw-btn" href="./index.html#himmel" style="justify-content:flex-start;">' + hwIcon('home', 17) + ' Zur WahrZentrale</a>' +
      '<a class="hw-btn" href="./lizenzen.html" style="justify-content:flex-start;">' + hwIcon('link', 17) + ' Quellen &amp; Lizenzen</a>' +
      '<button type="button" class="hw-btn hw-sheet-close" id="hw-hinweise-close-btn">Schließen</button>' +
    '</div>';
  document.body.appendChild(overlay);

  document.getElementById('hw-hinweise-close-btn').onclick = hwCloseHinweise;
  overlay.addEventListener('click', function(e){ if(e.target === overlay) hwCloseHinweise(); });

  document.getElementById('hw-hinweise-loc-btn').onclick = function(){
    hwCloseHinweise();
    hwOpenLocationPicker();
  };
  document.getElementById('hw-hinweise-settings-btn').onclick = function(){
    window.location.href = 'hw-einstellungen.html';
  };
  document.getElementById('hw-hinweise-theme-btn').onclick = function(){
    hwToggleTheme();
  };
}
function hwCloseHinweise(){
  var overlay = document.getElementById('hw-hinweise-overlay');
  if(overlay) overlay.remove();
}

/* ---------- Kurzfrist-Regen (Nowcast aus 15-Minuten-Modelldaten) ---------- */
/* Wertet die 15-Minuten-Niederschlagsmengen der nächsten ~2 Stunden aus. Es handelt sich um Modelldaten von
   Open-Meteo (kein Regenradar) – Zeitangaben daher auf 5 Minuten gerundet und als „ca.“ ausgewiesen. */
function hwNowcastInfo(nc){
  if(!nc || !nc.minutely_15 || !nc.minutely_15.time || !nc.minutely_15.precipitation) return null;
  var off = nc.utc_offset_seconds, t = nc.minutely_15.time, p = nc.minutely_15.precipitation, now = Date.now();
  var idx = -1, i;
  for(i = 0; i < t.length; i++){ if(hwRealTimeMs(t[i], off) <= now) idx = i; else break; }
  if(idx < 0) return null;
  var steps = [];
  for(i = 0; i < 9 && idx + i < t.length; i++) steps.push({ ms: hwRealTimeMs(t[idx + i], off), mm: p[idx + i] || 0 });
  if(steps.length < 4) return null;
  var THR = 0.1, wet = steps.map(function(s){ return s.mm >= THR; });
  function mins(ms){ return Math.max(5, Math.round((ms - now) / 300000) * 5); }
  var state, minutes = null, text;
  if(wet[0]){
    var end = -1;
    for(i = 1; i < wet.length; i++){ if(!wet[i]){ end = i; break; } }
    if(end === -1){ state = 'raining'; text = 'Es regnet – in den nächsten 2 Stunden kein Ende in Sicht.'; }
    else { state = 'stops'; minutes = mins(steps[end].ms); text = 'Es regnet – Ende in ca. ' + minutes + ' Min.'; }
  } else {
    var st = -1;
    for(i = 1; i < wet.length; i++){ if(wet[i]){ st = i; break; } }
    if(st === -1){ state = 'dry'; text = 'Trocken in den nächsten 2 Stunden.'; }
    else { state = 'starts'; minutes = mins(steps[st].ms); text = 'Regen beginnt in ca. ' + minutes + ' Min.'; }
  }
  return { state: state, minutes: minutes, text: text, steps: steps };
}
function hwRenderNowcast(containerId, nc){
  var el = document.getElementById(containerId);
  if(!el) return false;
  var info = hwNowcastInfo(nc);
  if(!info){ el.innerHTML = ''; return false; }
  var maxMm = 0.5;
  info.steps.forEach(function(s){ if(s.mm > maxMm) maxMm = s.mm; });
  var bars = info.steps.map(function(s, k){
    /* Höhe relativ zum Zeichenfeld (Spaltenhöhe minus fester Beschriftungszeile) – so stehen alle Balken auf derselben Nulllinie */
    var h = s.mm >= 0.1 ? Math.max(14, Math.round(Math.min(1, s.mm / maxMm) * 100)) : 4;
    var lab = k === 0 ? 'jetzt' : (k % 2 === 0 ? '+' + (k * 15) : '');
    return '<div class="hw-nc-col"><div class="hw-nc-bar' + (s.mm >= 0.1 ? ' wet' : '') + '" style="height:calc((100% - 17px) * ' + (h / 100) + ')"></div><span>' + lab + '</span></div>';
  }).join('');
  el.innerHTML = '<p class="hw-nc-text">' + info.text + '</p><div class="hw-nc-strip' + (info.state === 'dry' ? ' dry' : '') + '" role="img" aria-label="Niederschlag in 15-Minuten-Schritten, nächste 2 Stunden">' + bars + '</div>' +
    '<p class="hw-attrib" style="margin-top:8px;">Modelldaten (kein Radar), Minuten in Fünferschritten · <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo.com</a> (CC BY 4.0)</p>';
  return true;
}

/* ---------- Regen-Alarm ---------- */
/* Funktioniert ausschließlich, solange HimmelsWahr geöffnet ist (Tab im Vorder- oder Hintergrund).
   Eine Zustellung bei vollständig geschlossener App würde einen eigenen Push-Server erfordern, den es für diese
   serverlose Web-App bewusst nicht gibt – daher ehrlich als lokale Benachrichtigung „nur bei geöffneter App“. */
function hwIsRainAlertEnabled(){
  try{ return localStorage.getItem('hw-rain-alert-enabled') === '1'; }catch(e){ return false; }
}
function hwSetRainAlertEnabled(on){
  try{ localStorage.setItem('hw-rain-alert-enabled', on ? '1' : '0'); }catch(e){}
}
function hwUpdateRainAlertButton(){
  var btn = document.getElementById('hw-rain-alert-toggle');
  if(!btn) return;
  var on = hwIsRainAlertEnabled() && ('Notification' in window) && Notification.permission === 'granted';
  btn.innerHTML = hwIcon(on ? 'bellOff' : 'bell', 16) + ' ' + (on ? 'Regen-Alarm ausschalten' : 'Regen-Alarm einschalten');
  btn.setAttribute('aria-pressed', on ? 'true' : 'false');
}
function hwToggleRainAlert(){
  if(hwIsRainAlertEnabled()){
    hwSetRainAlertEnabled(false);
    hwUpdateRainAlertButton();
    return;
  }
  if(!('Notification' in window)){
    alert('Benachrichtigungen werden von diesem Browser nicht unterstützt. Auf manchen Smartphones funktionieren sie nur, wenn HimmelsWahr zum Home-Bildschirm hinzugefügt wurde.');
    return;
  }
  Notification.requestPermission().then(function(perm){
    if(perm === 'granted'){
      hwSetRainAlertEnabled(true);
      try{ localStorage.setItem('hw-rain-alert-state', 'idle'); }catch(e){}
    } else {
      hwSetRainAlertEnabled(false);
      alert('Ohne Erlaubnis für Benachrichtigungen kann der Regen-Alarm nicht eingeschaltet werden.');
    }
    hwUpdateRainAlertButton();
  });
}
function hwShowNotification(title, body){
  var opts = { body: body, icon: 'hw-icon-192.png', tag: 'hw-rain' };
  function fallback(){ try{ new Notification(title, opts); }catch(e){} }
  if('serviceWorker' in navigator && navigator.serviceWorker.controller){
    navigator.serviceWorker.ready.then(function(reg){ reg.showNotification(title, opts); }).catch(fallback);
  } else { fallback(); }
}
/* Prüft Nowcast (15-Minuten) bzw. – falls nicht verfügbar – die Stundenwerte auf einsetzenden Regen in den
   nächsten 2 Stunden und löst höchstens einmal pro Regenereignis eine Benachrichtigung aus. */
function hwCheckRainAlert(data, nowcast){
  if(!hwIsRainAlertEnabled()) return;
  if(!('Notification' in window) || Notification.permission !== 'granted') return;
  var info = hwNowcastInfo(nowcast), rainSoon = false, body = '';
  if(info){
    rainSoon = (info.state === 'starts' || info.state === 'raining');
    body = info.state === 'raining' ? 'Es regnet gerade bei dir.' : info.text;
  } else {
    var items = hwHourlyPrecipData(data, 2), maxPct = 0;
    (items || []).forEach(function(it){ if((it.pct || 0) > maxPct) maxPct = it.pct || 0; });
    rainSoon = maxPct >= 50;
    body = 'In den nächsten Stunden ist mit Regen zu rechnen (bis zu ' + maxPct + ' %).';
  }
  var state = 'idle';
  try{ state = localStorage.getItem('hw-rain-alert-state') || 'idle'; }catch(e){}
  if(rainSoon && state !== 'alerted'){
    hwShowNotification('Regen-Alarm – HimmelsWahr', body);
    try{ localStorage.setItem('hw-rain-alert-state', 'alerted'); }catch(e){}
  } else if(!rainSoon && state === 'alerted'){
    try{ localStorage.setItem('hw-rain-alert-state', 'idle'); }catch(e){}
  }
}

/* ---------- Pollen-Vorhersage der nächsten Tage (nicht nur aktueller Wert) ---------- */
/* Nutzt die bereits geladenen stündlichen Pollen-Daten (Air-Quality-API), aggregiert pro Kalendertag
   den jeweils höchsten Wert über alle sechs Pollenarten. */
function hwAggregateDailyPollen(data){
  var times = data.hourly && data.hourly.time;
  if(!times) return [];
  var offset = data.utc_offset_seconds;
  var fields = [
    ['alder_pollen', 'Erle'], ['birch_pollen', 'Birke'], ['grass_pollen', 'Gräser'],
    ['mugwort_pollen', 'Beifuß'], ['olive_pollen', 'Olive'], ['ragweed_pollen', 'Ambrosia']
  ];
  var byDay = {};
  var order = [];
  var now = Date.now();
  for(var i = 0; i < times.length; i++){
    var ms = hwRealTimeMs(times[i], offset);
    if(ms < now - 3600000) continue;
    var dayStr = new Date(ms + offset * 1000).toISOString().slice(0, 10);
    if(!byDay[dayStr]){ byDay[dayStr] = { max: 0, label: null, has: false }; order.push(dayStr); }
    fields.forEach(function(f){
      var arr = data.hourly[f[0]];
      var val = arr ? arr[i] : null;
      if(val != null && val > byDay[dayStr].max){
        byDay[dayStr].max = val;
        byDay[dayStr].label = f[1];
        byDay[dayStr].has = true;
      }
    });
  }
  return order.slice(0, 4).map(function(d){
    return { date: d, max: byDay[d].max, label: byDay[d].label, has: byDay[d].has };
  });
}
function hwPollenLevel(maxVal){
  if(maxVal < 20) return { stufe: 'gruen', dot: '<span class="hw-dot hw-dot-gruen"></span>' };
  if(maxVal < 100) return { stufe: 'gelb', dot: '<span class="hw-dot hw-dot-gelb"></span>' };
  return { stufe: 'rot', dot: '<span class="hw-dot hw-dot-rot"></span>' };
}
function hwRenderPollenForecast(containerId, airData){
  var el = document.getElementById(containerId);
  if(!el) return false;
  var days = hwAggregateDailyPollen(airData);
  if(!days.length){ el.innerHTML = ''; return false; }
  el.innerHTML = days.map(function(day, i){
    var weekday = i === 0 ? 'Heute' : hwWeekdayShort(day.date);
    if(!day.has){
      return '<div class="hw-row"><span>' + weekday + '</span><span style="color:var(--text-secondary);">Keine Belastung</span></div>';
    }
    var lvl = hwPollenLevel(day.max);
    return '<div class="hw-row"><span>' + weekday + '</span><span>' + lvl.dot + ' ' + day.label + '</span></div>';
  }).join('');
  return true;
}

/* ---------- Wochentrend als Mini-Grafik (Höchst-/Tiefstwerte der nächsten Tage) ---------- */
function hwRenderWeekTrend(containerId, weatherData){
  var el = document.getElementById(containerId);
  if(!el) return false;
  var d = weatherData.daily;
  if(!d || !d.time || !d.temperature_2m_max || !d.temperature_2m_min || d.time.length < 2){ el.innerHTML = ''; return false; }
  var n = Math.min(6, d.time.length);
  var maxes = d.temperature_2m_max.slice(0, n);
  var mins = d.temperature_2m_min.slice(0, n);
  var globalMax = Math.max.apply(null, maxes);
  var globalMin = Math.min.apply(null, mins);
  var range = Math.max(1, globalMax - globalMin);
  var cols = '';
  for(var i = 0; i < n; i++){
    var topPct = ((globalMax - maxes[i]) / range) * 100;
    var botPct = ((globalMax - mins[i]) / range) * 100;
    var heightPct = Math.max(10, botPct - topPct);
    var label = i === 0 ? 'Heute' : hwWeekdayShort(d.time[i]);
    cols +=
      '<div class="hw-trend-col">' +
        '<span class="hw-trend-max">' + Math.round(maxes[i]) + '°</span>' +
        '<div class="hw-trend-track"><div class="hw-trend-bar" style="top:' + topPct + '%;height:' + heightPct + '%;"></div></div>' +
        '<span class="hw-trend-min">' + Math.round(mins[i]) + '°</span>' +
        '<span class="hw-trend-day">' + label + '</span>' +
      '</div>';
  }
  el.innerHTML = '<div class="hw-trend-row">' + cols + '</div>';
  return true;
}

/* ---------- Wiederverwendbares Detail-Sheet (für Vorhersage-Tage und Detail-Kacheln) ---------- */
function hwOpenSheet(titleHtml, bodyHtml){
  hwCloseSheet();
  var overlay = document.createElement('div');
  overlay.id = 'hw-sheet-overlay';
  overlay.className = 'hw-sheet-overlay';
  overlay.innerHTML =
    '<div class="hw-sheet-modal">' +
      '<h2 style="margin:0 0 10px;">' + titleHtml + '</h2>' +
      bodyHtml +
      '<button class="hw-btn hw-sheet-close" id="hw-sheet-close-btn">Schließen</button>' +
    '</div>';
  document.body.appendChild(overlay);
  document.getElementById('hw-sheet-close-btn').onclick = hwCloseSheet;
  overlay.addEventListener('click', function(e){ if(e.target === overlay) hwCloseSheet(); });
}
function hwCloseSheet(){
  var overlay = document.getElementById('hw-sheet-overlay');
  if(overlay) overlay.remove();
}

/* ---------- Open-Meteo ---------- */
/* Wetterdaten von Open-Meteo.com — CC BY 4.0, Attribution im UI erforderlich (siehe hw-attrib auf jeder Seite) */
function hwFetchJson(url, errMsg){
  return fetch(url).then(function(r){
    if(!r.ok) throw new Error(errMsg);
    return r.json();
  });
}
/* Index der aktuellen Stunde (letzte Stunde, die nicht in der Zukunft liegt) */
function hwHourIdx(times, offset){
  var now = Date.now(), idx = 0;
  for(var i = 0; i < times.length; i++){
    if(hwRealTimeMs(times[i], offset) <= now) idx = i; else break;
  }
  return idx;
}
function hwFetchWeather(lat, lon){
  var params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,pressure_msl,surface_pressure,weather_code,cloud_cover,wind_speed_10m,wind_gusts_10m,wind_direction_10m,is_day,uv_index,visibility,shortwave_radiation',
    hourly: 'temperature_2m,weather_code,is_day,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,precipitation_probability,wind_speed_10m,pressure_msl,relative_humidity_2m,apparent_temperature,dew_point_2m,precipitation,wind_gusts_10m,direct_radiation',
    daily: 'sunset,sunrise,weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max,uv_index_max,sunshine_duration,daylight_duration,snowfall_sum',
    timezone: 'auto',
    forecast_days: '6'
  });
  return hwFetchJson('https://api.open-meteo.com/v1/forecast?' + params.toString(), 'Wetterdienst nicht erreichbar').then(function(data){
    /* Regenwahrscheinlichkeit der aktuellen Stunde aus den Stundenwerten ableiten */
    try{
      var i = hwHourIdx(data.hourly.time, data.utc_offset_seconds);
      data.current.precipitation_probability = data.hourly.precipitation_probability[i];
    }catch(e){}
    return data;
  });
}
/* 15-Minuten-Niederschlag der nächsten Stunden (Modelldaten). Schlägt der Abruf fehl, bleibt die App voll nutzbar. */
function hwFetchNowcast(lat, lon){
  var params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    minutely_15: 'precipitation',
    timezone: 'auto',
    forecast_days: '2'
  });
  return hwFetchJson('https://api.open-meteo.com/v1/forecast?' + params.toString(), 'Kurzfristvorhersage nicht erreichbar').catch(function(){ return null; });
}
/* Wolken- und Sichtdaten für mehrere Punkte in einer Anfrage (Abendrot: Horizont in Sonnenrichtung).
   Liefert immer ein Array in der Reihenfolge der übergebenen Punkte. */
function hwFetchSkyPoints(points){
  var params = new URLSearchParams({
    latitude: points.map(function(p){ return p.lat.toFixed(3); }).join(','),
    longitude: points.map(function(p){ return p.lon.toFixed(3); }).join(','),
    hourly: 'cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,precipitation_probability,visibility,relative_humidity_2m',
    daily: 'sunrise,sunset',
    timezone: 'auto',
    past_days: '1',
    forecast_days: '3'
  });
  return hwFetchJson('https://api.open-meteo.com/v1/forecast?' + params.toString(), 'Wetterdienst nicht erreichbar').then(function(d){
    return Array.isArray(d) ? d : [d];
  });
}

/* ---------- Open-Meteo Air Quality (Umweltbelastung) ---------- */
/* Luftqualitätsdaten von Open-Meteo.com — CC BY 4.0, Modellbasis CAMS (Copernicus), Attribution im UI erforderlich */
function hwFetchAirQuality(lat, lon){
  var params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    current: 'european_aqi,european_aqi_pm2_5,european_aqi_pm10,european_aqi_nitrogen_dioxide,european_aqi_ozone,european_aqi_sulphur_dioxide,pm10,pm2_5,ozone,nitrogen_dioxide,sulphur_dioxide,uv_index,alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen',
    hourly: 'european_aqi,pm10,pm2_5,ozone,nitrogen_dioxide,sulphur_dioxide,alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen',
    forecast_days: '5',
    past_days: '1',
    timezone: 'auto'
  });
  return fetch('https://air-quality-api.open-meteo.com/v1/air-quality?' + params.toString())
    .then(function(r){ if(!r.ok) throw new Error('Umweltdienst nicht erreichbar'); return r.json(); });
}

/* Offizielle 6 Stufen des Europäischen Luftqualitätsindex (EEA/CAMS): 0–20 Gut, 20–40 Mäßig, 40–60 Mittelmäßig, 60–80 Schlecht, 80–100 Sehr schlecht, >100 Extrem schlecht. Farbe (Ampel) bleibt bei den bereits kontraststarken 3 App-Farben: Gut/Mäßig=grün, Mittelmäßig/Schlecht=gelb, Sehr schlecht/Extrem schlecht=rot. */
function hwEaqiBand(aqi){
  if(aqi <= 20) return { stufe:'gruen', label:'Gut', hinweis:'Keine Einschränkung für Aktivitäten im Freien.' };
  if(aqi <= 40) return { stufe:'gruen', label:'Mäßig', hinweis:'Kaum Einschränkung, empfindliche Personen können leichte Reizungen bemerken.' };
  if(aqi <= 60) return { stufe:'gelb', label:'Mittelmäßig', hinweis:'Empfindliche Personen sollten anstrengende Aktivitäten im Freien reduzieren.' };
  if(aqi <= 80) return { stufe:'gelb', label:'Schlecht', hinweis:'Empfindliche Personen sollten Anstrengung im Freien meiden, alle anderen reduzieren.' };
  if(aqi <= 100) return { stufe:'rot', label:'Sehr schlecht', hinweis:'Anstrengende Aktivitäten im Freien für alle möglichst vermeiden.' };
  return { stufe:'rot', label:'Extrem schlecht', hinweis:'Aufenthalt im Freien möglichst auf das Nötigste beschränken.' };
}

/* Ermittelt den Schadstoff, dessen Einzel-Teilindex dem angezeigten Gesamt-EAQI entspricht (= der ungünstigste Wert, der laut Definition den Gesamtindex bestimmt). */
function hwEaqiLeadingPollutant(c){
  var kandidaten = [
    ['Feinstaub PM2,5', c.european_aqi_pm2_5],
    ['Feinstaub PM10', c.european_aqi_pm10],
    ['Ozon (O₃)', c.european_aqi_ozone],
    ['Stickstoffdioxid (NO₂)', c.european_aqi_nitrogen_dioxide],
    ['Schwefeldioxid (SO₂)', c.european_aqi_sulphur_dioxide]
  ];
  var bester = null;
  kandidaten.forEach(function(k){
    if(k[1] == null) return;
    if(bester == null || k[1] > bester[1]) bester = k;
  });
  return bester ? bester[0] : null;
}

/* Findet den hourly-Index der aktuellen Stunde (gleiche Annäherung wie an anderer Stelle der App bereits verwendet: erste Stunde ≥ jetzt). */
function hwHourlyIndexNow(data){
  var times = data.hourly && data.hourly.time;
  if(!times || !times.length) return -1;
  var offset = data.utc_offset_seconds;
  return hwHourIdx(times, offset);
}

/* Trend-Pfeil eines Schadstoffs: vergleicht die aktuelle Stunde mit der Konzentration vor 3 Stunden (gleicher Zeitraum wie beim bestehenden Luftdruck-Trend), relative Änderung >15% gilt als steigend/fallend. */
function hwPollutantTrend(data, field){
  var times = data.hourly && data.hourly.time;
  var arr = data.hourly && data.hourly[field];
  if(!times || !arr) return '';
  var idx0 = hwHourlyIndexNow(data);
  var idxPast = Math.max(0, idx0 - 3);
  if(idx0 < 0 || idxPast === idx0 || arr[idx0] == null || arr[idxPast] == null) return '';
  var diff = arr[idx0] - arr[idxPast];
  var basis = arr[idxPast] > 0 ? arr[idxPast] : 1;
  var pct = diff / basis;
  if(pct > 0.15) return hwIcon('arrowUpRight', 13);
  if(pct < -0.15) return hwIcon('arrowDownRight', 13);
  return hwIcon('arrowRight', 13);
}

/* ---------- Luftqualität der letzten 24 Stunden (grafische Balkendarstellung) ---------- */
function hwHourlyAqiData(data){
  var times = data.hourly && data.hourly.time;
  var aqi = data.hourly && data.hourly.european_aqi;
  if(!times || !aqi) return null;
  var idx0 = hwHourlyIndexNow(data);
  if(idx0 < 0) return null;
  var start = Math.max(0, idx0 - 23);
  var items = [];
  for(var i = start; i <= idx0 && i < times.length; i++){
    if(aqi[i] == null) continue;
    var d = new Date(times[i]);
    items.push({ label: d.getHours() + ' Uhr', value: aqi[i] });
  }
  return items;
}
/* Rendert den 24-Stunden-EAQI-Verlauf als scrollbares Balkendiagramm, Farbe je Balken nach Ampel-Stufe. */
function hwRenderAqiChart(containerId, data){
  var el = document.getElementById(containerId);
  if(!el) return;
  var items = hwHourlyAqiData(data);
  if(!items || items.length < 2){ el.innerHTML = ''; return; }
  var maxVal = 20;
  items.forEach(function(it){ if(it.value > maxVal) maxVal = it.value; });
  var bars = items.map(function(it, i){
    var h = Math.max(4, Math.round((it.value / maxVal) * 100)) / 100;
    var band = hwEaqiBand(it.value);
    var dotVar = band.stufe === 'gruen' ? '--green-dot' : (band.stufe === 'gelb' ? '--yellow-dot' : '--red-dot');
    var showLabel = (i % 4 === 0) || (i === items.length - 1);
    return '<div class="hw-aqi-item">' +
      '<span class="hw-aqi-val">' + it.value + '</span>' +
      '<div class="hw-aqi-bar" style="height:calc((100% - 32px) * ' + h + ');background:var(' + dotVar + ');"></div>' +
      '<span class="hw-aqi-time">' + (showLabel ? it.label : '') + '</span>' +
    '</div>';
  }).join('');
  var totalW = 34 * items.length;
  el.innerHTML = '<div class="hw-aqi-strip" style="width:' + totalW + 'px;">' + bars + '</div>';
}

/* ---------- Vergleich zum EAQI um diese Zeit gestern (gleiches Muster wie Temperatur-Vergleich) ---------- */
function hwUpdateAqiYesterdayCompare(currentAqi, locKey){
  var raw = null;
  try{ raw = localStorage.getItem('hw-aqi-yesterday'); }catch(e){}
  var stored = null;
  try{ stored = raw ? JSON.parse(raw) : null; }catch(e){ stored = null; }
  var now = Date.now();
  var diff = null;
  if(stored && typeof stored.aqi === 'number' && stored.key === (locKey || '') && (now - stored.ts) >= 20*3600000 && (now - stored.ts) <= 30*3600000){
    diff = Math.round(currentAqi - stored.aqi);
  }
  if(!stored || stored.key !== (locKey || '') || (now - stored.ts) >= 20*3600000){
    try{ localStorage.setItem('hw-aqi-yesterday', JSON.stringify({ aqi: currentAqi, ts: now, key: locKey || '' })); }catch(e){}
  }
  return diff;
}
function hwAqiYesterdayCompareText(diff){
  if(diff == null) return null;
  if(diff === 0) return 'Luftqualität wie gestern um diese Zeit';
  if(diff > 0) return 'Luftqualität heute schlechter als gestern (EAQI +' + diff + ')';
  return 'Luftqualität heute besser als gestern (EAQI ' + diff + ')';
}

/* ---------- Wetter-Icons (Line-Art, gleicher Stil wie App-Icon, per WMO-Code) ---------- */
/* Farbe passend zur Wetterlage statt immer einheitlichem Violett (nutzt dieselben, bereits auf Kontrast geprüften Töne wie die Detail-Kacheln). isDay=false färbt Klar/Teilweise-bewölkt in einem neutralen Nacht-Ton statt Sonnen-Amber. */
function hwWeatherIconColor(code, isDay){
  var dark = document.documentElement.getAttribute('data-theme') === 'dark';
  if((code === 0 || code === 1 || code === 2) && isDay === false){
    return dark ? '#B0B6D8' : '#444F78';
  }
  if(code === 0 || code === 1) return dark ? '#F0C871' : '#92650A';
  if(code === 2 || code === 3) return dark ? '#B0B6D8' : '#444F78';
  if(code === 45 || code === 48) return dark ? '#B0B6D8' : '#444F78';
  if([51,53,55,56,57,61,63,65,66,67,80,81,82].indexOf(code) !== -1) return dark ? '#8FC0EE' : '#1F5C96';
  if([71,73,75,77,85,86].indexOf(code) !== -1) return dark ? '#A9C6F2' : '#1F4F96';
  if([95,96,99].indexOf(code) !== -1) return dark ? '#C4AEF0' : '#5B3FA0';
  return dark ? '#B6ABE8' : '#4B3F72';
}
/* isDay: false zeichnet bei Klar (0/1) einen Mond statt einer Sonne, bei Teilweise bewölkt (2) Mond+Wolke statt Sonne+Wolke. Standard (nicht übergeben oder true) = Tag. */
function hwWeatherIcon(code, size, isDay){
  size = size || 28;
  isDay = isDay !== false;
  var s = '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">';
  var body;
  if(code === 0 || code === 1){
    if(isDay){
      body = '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M4.4 4.4l1.7 1.7M17.9 17.9l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.4 19.6l1.7-1.7M17.9 6.1l1.7-1.7"/>';
    } else {
      body = '<path d="M18.5 13.2A7.2 7.2 0 0 1 9.8 4.5a7.2 7.2 0 1 0 8.7 8.7z"/>';
    }
  } else if(code === 2){
    if(isDay){
      body = '<circle cx="9" cy="9.5" r="3.2"/><path d="M9 3.8v1.7M14.4 9.5h1.7M4.6 9.5h1.2M12.9 5.6l1-1M5.1 13.9l1-1"/><path d="M6 20h11.5a3 3 0 0 0 .3-6 4.3 4.3 0 0 0-8.3-1.2A3.4 3.4 0 0 0 6 20z"/>';
    } else {
      body = '<path d="M12.3 5.3a4.6 4.6 0 0 0 5 6.9 4.6 4.6 0 0 1-8-3 4.6 4.6 0 0 1 3-3.9z"/><path d="M6 20h11.5a3 3 0 0 0 .3-6 4.3 4.3 0 0 0-8.3-1.2A3.4 3.4 0 0 0 6 20z"/>';
    }
  } else if(code === 3){
    body = '<path d="M5.5 19h12.2a3.1 3.1 0 0 0 .3-6.2 4.6 4.6 0 0 0-8.9-1.3A3.6 3.6 0 0 0 5.5 19z"/>';
  } else if(code === 45 || code === 48){
    body = '<path d="M3 9.5h13M3 13h18M3 16.5h13"/>';
  } else if([51,53,55,56,57,61,63,65,66,67,80,81,82].indexOf(code) !== -1){
    body = '<path d="M5.5 14h12.2a3.1 3.1 0 0 0 .3-6.2 4.6 4.6 0 0 0-8.9-1.3A3.6 3.6 0 0 0 5.5 14z"/><path d="M8 17.5l-1 2.3M12 17.5l-1 2.3M16 17.5l-1 2.3"/>';
  } else if([71,73,75,77,85,86].indexOf(code) !== -1){
    body = '<path d="M5.5 12h12.2a3.1 3.1 0 0 0 .3-6.2 4.6 4.6 0 0 0-8.9-1.3A3.6 3.6 0 0 0 5.5 12z"/><path d="M9 16v5M9 17.5l-1.6 1M9 17.5l1.6 1M15 16v5M15 17.5l-1.6 1M15 17.5l1.6 1"/>';
  } else if([95,96,99].indexOf(code) !== -1){
    body = '<path d="M5.5 12h12.2a3.1 3.1 0 0 0 .3-6.2 4.6 4.6 0 0 0-8.9-1.3A3.6 3.6 0 0 0 5.5 12z"/><path d="M12.5 14l-2.7 4.2h2.4L10.8 22"/>';
  } else {
    body = '<circle cx="12" cy="12" r="8"/><path d="M12 8v5M12 16h.01"/>';
  }
  return s + body + '</svg>';
}

/* ---------- Gassi-/Draußen-Score ---------- */
/* Draußen-Score (0–100): Regen, Wind/Böen, gefühlte Temperatur (Kälte und Hitze) und UV-Index.
   Eine grobe, transparente Faustformel – keine medizinische oder sicherheitsrelevante Aussage. */
function hwCalcScore(temp, precipProb, wind, uv, gust){
  var score = 100;
  score -= (precipProb || 0) * 0.55;
  if(wind > 20) score -= (wind - 20) * 1.1;
  if(gust != null && gust > 45) score -= (gust - 45) * 0.6;
  if(temp < 12) score -= (12 - temp) * 1.2;
  if(temp < 0) score -= (0 - temp) * 2.5;
  if(temp > 26) score -= (temp - 26) * 4.5;
  if(uv != null && uv >= 8) score -= (uv - 7) * 3;
  score = Math.max(0, Math.min(100, Math.round(score)));
  var stufe = score >= 70 ? 'gruen' : (score >= 40 ? 'gelb' : 'rot');
  var label = score >= 70 ? 'Gut geeignet für draußen' : (score >= 40 ? 'Mit Einschränkungen geeignet' : 'Eher drinnen bleiben');
  return { score: score, stufe: stufe, label: label };
}

/* ---------- Wettercode-Text (WMO) ---------- */
/* Gefrierender Regen/Sprühregen: Glättegefahr */
function hwIsFreezingCode(code){ return [56,57,66,67].indexOf(code) !== -1; }
/* Böen-Einstufung nach der Beaufort-Skala (gleiche Grenzen wie in hw-insights.js):
   stürmische Böen ab 62 km/h (8), Sturmböen ab 75 (9), schwere Sturmböen ab 89 (10),
   orkanartige Böen ab 103 (11), Orkanböen ab 118 km/h (12). Darunter: null. */
function hwGustStage(v){
  if(v == null || !isFinite(v)) return null;
  var s = [[118,12,'Orkanböen'],[103,11,'orkanartige Böen'],[89,10,'schwere Sturmböen'],[75,9,'Sturmböen'],[62,8,'stürmische Böen']];
  for(var i = 0; i < s.length; i++) if(v >= s[i][0]) return { min:s[i][0], bft:s[i][1], name:s[i][2], Name:s[i][2].charAt(0).toUpperCase() + s[i][2].slice(1) };
  return null;
}
function hwWeatherCodeText(code){
  var map = {
    0:'Klarer Himmel',1:'Überwiegend klar',2:'Teilweise bewölkt',3:'Bedeckt',
    45:'Nebel',48:'Reifnebel',51:'Leichter Sprühregen',53:'Sprühregen',55:'Starker Sprühregen',
    61:'Leichter Regen',63:'Regen',65:'Starker Regen',71:'Leichter Schneefall',73:'Schneefall',75:'Starker Schneefall',
    56:'Gefrierender Sprühregen',57:'Starker gefrierender Sprühregen',66:'Gefrierender Regen',67:'Starker gefrierender Regen',77:'Schneegriesel',80:'Leichte Regenschauer',81:'Regenschauer',82:'Heftige Regenschauer',85:'Schneeschauer',86:'Starke Schneeschauer',95:'Gewitter',96:'Gewitter mit Hagel',99:'Schweres Gewitter mit Hagel'
  };
  return map[code] || 'Unbekannt';
}

/* ---------- Zeitzonen-korrekte Umrechnung von Open-Meteo-Zeit-Strings ---------- */
/* Open-Meteo liefert Zeit-Strings ohne Zeitzonen-Kennung – sie stellen die lokale Uhrzeit AM ORT dar,
   nicht am Gerätestandort. new Date(str) interpretiert sie fälschlich als Uhrzeit in der Zeitzone des
   Geräts. Das ist unproblematisch für die reine Anzeige (Ziffern bleiben korrekt), führt aber bei
   allen "wie lange noch bis…"-Berechnungen zu einem Fehler in Höhe der Zeitzonendifferenz zwischen
   Gerät und gewähltem Ort. Diese Funktion errechnet den tatsächlichen Zeitpunkt (echte UTC-ms) mithilfe
   des von Open-Meteo mitgelieferten utc_offset_seconds-Werts des jeweiligen Orts. */
function hwRealTimeMs(isoStr, utcOffsetSeconds){
  if(utcOffsetSeconds == null) return new Date(isoStr).getTime();
  return Date.parse(isoStr + 'Z') - utcOffsetSeconds * 1000;
}

/* ---------- Regenwahrscheinlichkeit stundenweise (grafische Balkendarstellung) ---------- */
/* Baut aus den bereits geladenen hourly-Daten die Werte der nächsten Stunden.
   hours: wie viele Folgestunden zusätzlich zur aktuellen Stunde angezeigt werden (Standard 5). */
function hwHourlyPrecipData(data, hours){
  hours = hours || 5;
  var times = data.hourly && data.hourly.time;
  var precip = data.hourly && data.hourly.precipitation_probability;
  if(!times || !precip) return null;
  var offset = data.utc_offset_seconds;
  var now = Date.now();
  var idx0 = hwHourIdx(times, offset);
  var items = [];
  for(var i = idx0; i <= idx0 + hours && i < times.length; i++){
    var d = new Date(times[i]);
    var label = (i === idx0) ? 'Jetzt' : (d.getHours() + ' Uhr');
    items.push({ label: label, pct: precip[i] });
  }
  return items;
}
/* Ordnet einem Prozentwert eine Ampelfarbe zu (grün/gelb/rot) für den Balken-Farbverlauf. */
function hwPrecipColor(pct){
  if(pct <= 20) return 'var(--green-dot)';
  if(pct <= 50) return 'var(--yellow-dot)';
  return 'var(--red-dot)';
}
/* Rendert die Regenwahrscheinlichkeit als Balkendiagramm mit Ampel-Farbverlauf in ein Zielelement. */
function hwRenderPrecipChart(containerId, weatherData, hours){
  var el = document.getElementById(containerId);
  if(!el) return;
  var items = hwHourlyPrecipData(weatherData, hours);
  if(!items || !items.length){ el.innerHTML = ''; return; }
  el.innerHTML = '<div class="hw-precip-chart">' + items.map(function(it){
    var h = Math.max(4, it.pct) / 100;
    return '<div class="hw-precip-bar-wrap">' +
      '<span class="hw-precip-pct">' + it.pct + '%</span>' +
      '<div class="hw-precip-bar" style="height:calc((100% - 38px) * ' + h + ');background:' + hwPrecipColor(it.pct) + ';"></div>' +
      '<span class="hw-precip-label">' + it.label + '</span>' +
    '</div>';
  }).join('') + '</div>';
}

/* ---------- Windrichtung, Luftdruck-Trend, Dauer-Formatierung ---------- */
/* Ermittelt den Luftdruck-Trend aus den letzten 3 Stunden (steigend/fallend/stabil). */
function hwPressureTrend(data){
  var times = data.hourly && data.hourly.time;
  var pressure = data.hourly && data.hourly.pressure_msl;
  if(!times || !pressure) return null;
  var offset = data.utc_offset_seconds;
  var now = Date.now();
  var idx0 = hwHourIdx(times, offset);
  var idxPast = Math.max(0, idx0 - 3);
  if(idxPast === idx0) return null;
  var diff = pressure[idx0] - pressure[idxPast];
  var trend, icon;
  if(diff > 1){ trend = 'steigend'; icon = hwIcon('arrowUpRight', 13); }
  else if(diff < -1){ trend = 'fallend'; icon = hwIcon('arrowDownRight', 13); }
  else { trend = 'stabil'; icon = hwIcon('arrowRight', 13); }
  return { trend: trend, icon: icon, diff: diff };
}
function hwFormatDuration(seconds){
  if(seconds == null) return '–';
  var h = Math.floor(seconds / 3600), m = Math.round((seconds % 3600) / 60);
  return h + ' Std ' + m + ' Min';
}

/* ---------- Mehrtages-Vorhersage ---------- */
/* Reine Datums-Strings ("YYYY-MM-DD") von Open-Meteo werden von new Date() als UTC-Mitternacht
   interpretiert; bei negativer Zeitzone des Geräts (z. B. Nord-/Südamerika) rutscht .getDate()/.getDay()
   dadurch auf den Vortag zurück. Diese Funktion liest Jahr/Monat/Tag direkt aus dem String, unabhängig
   von der Zeitzone des Geräts. */
function hwDateOnlyLocal(dateStr){
  var p = String(dateStr).split('-');
  return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
}
function hwWeekdayShort(dateStr){
  var names = ['So','Mo','Di','Mi','Do','Fr','Sa'];
  return names[hwDateOnlyLocal(dateStr).getDay()];
}
/* Rendert eine ausführliche 6-Tage-Vorschau (ohne den heutigen Tag) aus den bereits geladenen daily-Daten:
   Wochentag+Datum, Icon+Wetterlage-Text, Höchst-/Tiefsttemperatur, Regenwahrscheinlichkeit+Regenmenge, Wind, UV-Index. */
var hwForecastDataCache = null;
function hwRenderForecast(containerId, weatherData){
  var el = document.getElementById(containerId);
  if(!el) return;
  var d = weatherData.daily;
  if(!d || !d.time || d.time.length < 2){ el.innerHTML = ''; return; }
  hwForecastDataCache = weatherData;
  var monthNames = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
  var cards = [];
  for(var i = 1; i < d.time.length && i <= 5; i++){
    var dt = hwDateOnlyLocal(d.time[i]);
    var dateLabel = dt.getDate() + '. ' + monthNames[dt.getMonth()];
    cards.push(
      '<button type="button" class="hw-forecast-day" data-day-idx="' + i + '">' +
        '<div class="hw-forecast-day-head">' +
          '<span class="hw-forecast-weekday">' + hwWeekdayShort(d.time[i]) + ', ' + dateLabel + '</span>' +
          '<span style="display:flex;align-items:center;">' +
            '<span style="color:' + hwWeatherIconColor(d.weather_code[i]) + ';">' + hwWeatherIcon(d.weather_code[i], 26) + '</span>' +
            '<span class="hw-forecast-chevron">›</span>' +
          '</span>' +
        '</div>' +
        '<div class="hw-forecast-desc">' + hwWeatherCodeText(d.weather_code[i]) + '</div>' +
        '<div class="hw-forecast-temps"><strong>' + Math.round(d.temperature_2m_max[i]) + '°</strong> / ' + Math.round(d.temperature_2m_min[i]) + '°</div>' +
        '<div class="hw-row"><span>Regen</span><span>' + d.precipitation_probability_max[i] + ' % · ' + d.precipitation_sum[i].toFixed(1) + ' mm</span></div>' +
        '<div class="hw-row" style="border-bottom:none;"><span>Wind' + (d.wind_gusts_10m_max && hwGustStage(d.wind_gusts_10m_max[i]) ? ' ' + hwIcon('warning', 13) + '' : '') + '</span><span' + (d.wind_gusts_10m_max && hwGustStage(d.wind_gusts_10m_max[i]) ? ' style="color:var(--red-fg);font-weight:700;"' : '') + '>' + Math.round(d.wind_speed_10m_max[i]) + ' km/h' + (d.wind_gusts_10m_max && d.wind_gusts_10m_max[i] != null ? ' (Böen ' + Math.round(d.wind_gusts_10m_max[i]) + ')' : '') + '</span></div>' +
      '</button>'
    );
  }
  el.innerHTML = cards.join('');
  el.querySelectorAll('.hw-forecast-day').forEach(function(btn){
    btn.onclick = function(){ hwOpenForecastDayDetail(parseInt(btn.getAttribute('data-day-idx'), 10)); };
  });
}

/* Öffnet das Detail-Sheet für einen Vorhersage-Tag (u. a. UV-Index, Sonnenauf-/-untergang) */
function hwOpenForecastDayDetail(i){
  if(!hwForecastDataCache) return;
  var d = hwForecastDataCache.daily;
  var monthNames = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
  var dt = hwDateOnlyLocal(d.time[i]);
  var dateLabel = dt.getDate() + '. ' + monthNames[dt.getMonth()];
  var sunrise = d.sunrise && d.sunrise[i] ? hwFormatTime(d.sunrise[i]) : '–';
  var sunset = d.sunset && d.sunset[i] ? hwFormatTime(d.sunset[i]) : '–';
  var uv = d.uv_index_max ? Math.round(d.uv_index_max[i]) : null;
  var sunshine = d.sunshine_duration && d.sunshine_duration[i] != null ? hwFormatDuration(d.sunshine_duration[i]) : null;
  var snow = d.snowfall_sum && d.snowfall_sum[i] > 0 ? d.snowfall_sum[i] + ' cm' : null;

  var rows = [
    ['Höchst- / Tiefstwert', Math.round(d.temperature_2m_max[i]) + '° / ' + Math.round(d.temperature_2m_min[i]) + '°'],
    ['Regenwahrscheinlichkeit', d.precipitation_probability_max[i] + ' %'],
    ['Regenmenge', d.precipitation_sum[i].toFixed(1) + ' mm'],
    ['Wind (max.)', Math.round(d.wind_speed_10m_max[i]) + ' km/h']
  ];
  if(d.wind_gusts_10m_max && d.wind_gusts_10m_max[i] != null){
    var gust = d.wind_gusts_10m_max[i];
    var gst = hwGustStage(gust);
    rows.push(['Windböen (max.)' + (gst ? ' ' + hwIcon('warning', 13) + '' : ''), Math.round(gust) + ' km/h']);
    if(gst) rows.push(['Einstufung', gst.Name + ' (Stärke ' + gst.bft + ')']);
  }
  if(uv != null) rows.push(['UV-Index (max.)', uv]);
  rows.push(['Sonnenaufgang', sunrise]);
  rows.push(['Sonnenuntergang', sunset]);
  if(sunshine) rows.push(['Sonnenscheindauer', sunshine]);
  if(snow) rows.push(['Schneefall', snow]);

  var body = '<p style="color:var(--text-secondary);margin-top:-4px;">' + hwWeatherCodeText(d.weather_code[i]) + '</p>' +
    rows.map(function(r, idx){
      var lastStyle = idx === rows.length - 1 ? ' style="border-bottom:none;"' : '';
      return '<div class="hw-row"' + lastStyle + '><span>' + r[0] + '</span><span>' + r[1] + '</span></div>';
    }).join('');

  hwOpenSheet(hwWeekdayShort(d.time[i]) + ', ' + dateLabel, body);
}
function hwFormatTime(isoStr){
  var dt = new Date(isoStr);
  if(isNaN(dt.getTime())) return '–';
  var hh = dt.getHours().toString().padStart(2, '0');
  var mm = dt.getMinutes().toString().padStart(2, '0');
  return hh + ':' + mm + ' Uhr';
}

/* ---------- Reihenfolge der Startseiten-Abschnitte (vom Nutzer in den Einstellungen sortierbar) ---------- */
var HW_SECTION_KEYS_DEFAULT = ['hero','insights','nowcast','quicktiles','lage','hourly','forecast','details'];
var HW_SECTION_META = {
  quicktiles: { icon: hwIcon('link', 16), label:'Schnellzugriff (Luft, Abendrot, Nachthimmel, Kompass, Sonnenbahn)' },
  hero:       { icon: hwIcon('sun', 16), label:'Himmel-Übersicht mit Tagesband' },
  insights:   { icon: hwIcon('sparkles', 16), label:'Heute lohnt sich (Sterne, Regenbogen, Frost)' },
  nowcast:    { icon: hwIcon('cloudRain', 16), label:'Regen in den nächsten 2 Stunden' },
  lage:       { icon: hwIcon('pin', 16), label:'Aktuelle Lage' },
  hourly:     { icon: hwIcon('clock', 16), label:'Stündlicher Verlauf' },
  forecast:   { icon: hwIcon('calendar', 16), label:'Vorhersage' },
  details:    { icon: hwIcon('chart', 16), label:'Weitere Details' }
};
function hwGetSectionOrder(){
  try {
    var raw = localStorage.getItem('hw-section-order');
    if(raw){
      var arr = JSON.parse(raw);
      if(Array.isArray(arr) && arr.length){
        HW_SECTION_KEYS_DEFAULT.forEach(function(k, i){
          if(arr.indexOf(k) !== -1) return;
          var prev = i > 0 ? arr.indexOf(HW_SECTION_KEYS_DEFAULT[i - 1]) : -1;
          if(prev === -1) arr.push(k); else arr.splice(prev + 1, 0, k);
        });
        return arr;
      }
    }
  } catch(e){}
  return HW_SECTION_KEYS_DEFAULT.slice();
}
function hwSetSectionOrder(order){
  try { localStorage.setItem('hw-section-order', JSON.stringify(order)); } catch(e){}
}
/* Ordnet die Abschnitte der Startseite gemäß gespeicherter Reihenfolge neu an, indem die bereits
   vorhandenen DOM-Elemente vor einen fixen Anker verschoben werden (keine Neuerstellung, keine
   verlorenen Event-Handler). Wird auf hw-index.html möglichst früh aufgerufen. */
function hwApplySectionOrder(){
  var anchor = document.getElementById('hw-section-anchor');
  if(!anchor) return;
  var parent = anchor.parentNode;
  var order = hwGetSectionOrder();
  order.forEach(function(key){
    var el = parent.querySelector(':scope > [data-hw-section="' + key + '"]');
    if(el) parent.insertBefore(el, anchor);
  });
}

/* ---------- Wiederverwendbare Auf/Ab-Sortierliste für die Einstellungen ---------- */
function hwRenderOrderList(containerId, order, metaMap, onChange){
  var el = document.getElementById(containerId);
  if(!el) return;
  el.innerHTML = order.map(function(k, i){
    var meta = metaMap[k];
    if(!meta) return '';
    return '<div class="hw-order-row">' +
      '<span class="hw-order-icon">' + meta.icon + '</span>' +
      '<span class="hw-order-label">' + meta.label + '</span>' +
      '<span class="hw-order-btns">' +
        '<button type="button" aria-label="' + meta.label + ' nach oben" data-dir="up" data-idx="' + i + '"' + (i === 0 ? ' disabled' : '') + '>' + hwIcon('arrowUp', 15) + '</button>' +
        '<button type="button" aria-label="' + meta.label + ' nach unten" data-dir="down" data-idx="' + i + '"' + (i === order.length - 1 ? ' disabled' : '') + '>' + hwIcon('arrowDown', 15) + '</button>' +
      '</span>' +
    '</div>';
  }).join('');
  el.querySelectorAll('button[data-dir]').forEach(function(btn){
    btn.onclick = function(){
      var idx = parseInt(btn.getAttribute('data-idx'), 10);
      var dir = btn.getAttribute('data-dir');
      var target = dir === 'up' ? idx - 1 : idx + 1;
      if(target < 0 || target >= order.length) return;
      var tmp = order[idx];
      order[idx] = order[target];
      order[target] = tmp;
      onChange(order);
    };
  });
}
function hwRenderSectionSettings(){
  hwRenderOrderList('hw-section-order-list', hwGetSectionOrder(), HW_SECTION_META, function(newOrder){
    hwSetSectionOrder(newOrder);
    hwRenderSectionSettings();
  });
}
function hwResetSectionOrder(){
  hwSetSectionOrder(HW_SECTION_KEYS_DEFAULT.slice());
  hwRenderSectionSettings();
}

/* ---------- Reihenfolge der Detail-Kacheln (vom Nutzer in den Einstellungen sortierbar) ---------- */
var HW_TILE_KEYS_DEFAULT = ['temp','humid','dew','pressure','windgust','winddir','visibility','radiation','sunshine','snow'];
var HW_TILE_META = {
  temp:       { icon: hwIcon('thermometer', 16), label:'Gefühlte Temperatur' },
  humid:      { icon: hwIcon('droplet', 16), label:'Luftfeuchtigkeit' },
  dew:        { icon: hwIcon('haze', 16), label:'Taupunkt' },
  pressure:   { icon: hwIcon('chart', 16), label:'Luftdruck' },
  windgust:   { icon: hwIcon('gust', 16), label:'Windböen' },
  winddir:    { icon: hwIcon('compass', 16), label:'Windrichtung' },
  visibility: { icon: hwIcon('eye', 16), label:'Sichtweite' },
  radiation:  { icon: hwIcon('sun', 16), label:'Sonneneinstrahlung' },
  sunshine:   { icon: hwIcon('sun', 16), label:'Sonnenschein heute' },
  snow:       { icon: hwIcon('snowflake', 16), label:'Schneefall heute' }
};
function hwGetTileOrder(){
  try {
    var raw = localStorage.getItem('hw-tile-order');
    if(raw){
      var arr = JSON.parse(raw);
      if(Array.isArray(arr) && arr.length){
        /* Falls durch ein App-Update neue Kachel-Typen hinzugekommen sind, hinten ergänzen */
        HW_TILE_KEYS_DEFAULT.forEach(function(k){ if(arr.indexOf(k) === -1) arr.push(k); });
        return arr;
      }
    }
  } catch(e){}
  return HW_TILE_KEYS_DEFAULT.slice();
}
function hwSetTileOrder(order){
  try { localStorage.setItem('hw-tile-order', JSON.stringify(order)); } catch(e){}
}

/* ---------- Farbenfrohe Detail-Kacheln (gefühlte Temperatur, Luftfeuchtigkeit, Wind, Luftdruck, Sonne, Sicht, Schnee) ---------- */
function hwRenderDetailTiles(weatherData){
  var el = document.getElementById('hw-stat-grid');
  if(!el) return;
  var c = weatherData.current;
  var d = weatherData.daily;
  var map = {};

  if(c.apparent_temperature != null){
    map.temp = { cls:'hw-stat-temp', icon: hwIcon('thermometer', 22), value: Math.round(c.apparent_temperature) + '°C', label:'Gefühlt',
      desc:'Berücksichtigt neben der Lufttemperatur auch Wind und Luftfeuchtigkeit – also wie warm oder kalt sich das Wetter tatsächlich anfühlt.' };
  }
  if(c.relative_humidity_2m != null){
    map.humid = { cls:'hw-stat-humid', icon: hwIcon('droplet', 22), value: c.relative_humidity_2m + ' %', label:'Luftfeuchtigkeit',
      desc:'Der Anteil an Wasserdampf in der Luft, angegeben relativ zur maximal möglichen Menge bei der aktuellen Temperatur.' };
  }
  if(c.dew_point_2m != null){
    map.dew = { cls:'hw-stat-dew', icon: hwIcon('haze', 22), value: Math.round(c.dew_point_2m) + '°C', label:'Taupunkt',
      desc:'Die Temperatur, auf die die Luft abkühlen müsste, damit sich Wasserdampf als Tau niederschlägt. Ab etwa 16–18 °C wird die Luft meist als schwül empfunden.' };
  }
  if(c.pressure_msl != null){
    var trend = hwPressureTrend(weatherData);
    map.pressure = { cls:'hw-stat-pressure', icon: hwIcon('chart', 22), value: Math.round(c.pressure_msl) + ' hPa', label: 'Luftdruck' + (trend ? ' ' + trend.icon + ' ' + trend.trend : ''),
      desc:'Der Luftdruck auf Meereshöhe. Ein fallender Trend deutet häufig auf eine Wetterverschlechterung hin, ein steigender auf eine Besserung.' };
  }
  if(c.wind_gusts_10m != null){
    var stormy = hwGustStage(c.wind_gusts_10m);
    map.windgust = { cls:'hw-stat-wind' + (stormy ? ' hw-stat-storm' : ''), icon: hwIcon('gust', 22), value: Math.round(c.wind_gusts_10m) + ' km/h', label: stormy ? stormy.Name + ' ' + hwIcon('warning', 13) : 'Windböen',
      desc:'Die höchste erwartete kurzzeitige Windgeschwindigkeit – meist deutlich stärker als der mittlere, anhaltende Wind. Eingestuft nach der Beaufort-Skala: stürmische Böen ab 62 km/h, Sturmböen ab 75, schwere Sturmböen ab 89, orkanartige Böen ab 103 und Orkanböen ab 118 km/h.' + (stormy ? ' Aktuell: ' + stormy.name + ' (Stärke ' + stormy.bft + ').' : '') };
  }
  if(c.wind_direction_10m != null){
    var arrowHtml = '<span class="hw-wind-arrow" style="display:inline-block;transform:rotate(' + c.wind_direction_10m + 'deg);">' + hwIcon('arrowUp', 22) + '</span>';
    map.winddir = { cls:'hw-stat-wind', icon: arrowHtml, value: hwCompassDirection(c.wind_direction_10m), label:'Windrichtung',
      desc:'Die Richtung, aus der der Wind weht, als Kompassrichtung (' + c.wind_direction_10m + '°).' };
  }
  if(c.visibility != null){
    map.visibility = { cls:'hw-stat-visibility', icon: hwIcon('eye', 22), value: (c.visibility/1000).toFixed(1) + ' km', label:'Sichtweite',
      desc:'Die Entfernung, bis zu der Objekte bei den aktuellen Wetterbedingungen (z. B. Nebel, Regen) noch erkennbar sind.' };
  }
  if(c.shortwave_radiation != null){
    map.radiation = { cls:'hw-stat-sun', icon: hwIcon('sun', 22), value: Math.round(c.shortwave_radiation) + ' W/m²', label:'Sonneneinstrahlung',
      desc:'Die aktuelle Strahlungsleistung der Sonne pro Quadratmeter, die auf den Boden trifft.' };
  }
  if(d && d.sunshine_duration && d.sunshine_duration[0] != null){
    map.sunshine = { cls:'hw-stat-sun', icon: hwIcon('sun', 22), value: hwFormatDuration(d.sunshine_duration[0]), label:'Sonnenschein heute',
      desc:'Die für heute berechnete Gesamtdauer an direktem Sonnenschein (ohne Wolkenbedeckung).' };
  }
  if(d && d.snowfall_sum && d.snowfall_sum[0] > 0){
    map.snow = { cls:'hw-stat-snow', icon: hwIcon('snowflake', 22), value: d.snowfall_sum[0] + ' cm', label:'Schneefall heute',
      desc:'Die für heute berechnete Neuschneemenge.' };
  }

  var tiles = hwGetTileOrder().map(function(k){ return map[k]; }).filter(Boolean);

  el.innerHTML = tiles.map(function(t, i){
    return '<button type="button" class="hw-stat-tile ' + t.cls + '" style="animation-delay:' + (i*0.04) + 's;" data-tile-idx="' + i + '">' +
      '<span class="hw-stat-icon">' + t.icon + '</span>' +
      '<div class="hw-stat-value">' + t.value + '</div>' +
      '<div class="hw-stat-label">' + t.label + '</div>' +
    '</button>';
  }).join('');

  el.querySelectorAll('.hw-stat-tile').forEach(function(btn){
    var t = tiles[parseInt(btn.getAttribute('data-tile-idx'), 10)];
    btn.onclick = function(){
      hwOpenSheet(t.label, '<p style="font-size:22px;font-weight:700;margin:0 0 8px;">' + t.value + '</p><p style="color:var(--text-secondary);margin:0;">' + t.desc + '</p>');
    };
  });
}

/* ---------- Einstellungen: Reihenfolge der Detail-Kacheln per Auf/Ab sortierbar ---------- */
function hwRenderTileSettings(){
  hwRenderOrderList('hw-tile-order-list', hwGetTileOrder(), HW_TILE_META, function(newOrder){
    hwSetTileOrder(newOrder);
    hwRenderTileSettings();
  });
}
function hwResetTileOrder(){
  hwSetTileOrder(HW_TILE_KEYS_DEFAULT.slice());
  hwRenderTileSettings();
}

/* ---------- Zahlen-Hochzähl-Animation ---------- */
function hwAnimateNumber(el, from, to, suffix, durationMs){
  if(!el) return;
  durationMs = durationMs || 650;
  if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    el.textContent = to + (suffix || '');
    return;
  }
  var start = null;
  function step(ts){
    if(start === null) start = ts;
    var progress = Math.min(1, (ts - start) / durationMs);
    var eased = 1 - Math.pow(1 - progress, 3);
    var current = Math.round(from + (to - from) * eased);
    el.textContent = current + (suffix || '');
    if(progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ---------- Ring-Gauge (SVG, für Score/UV-Index) ---------- */
function hwRenderRing(containerId, value, max, colorVar, label, centerText){
  var el = document.getElementById(containerId);
  if(!el) return;
  var pct = Math.max(0, Math.min(1, value / max));
  var r = 34, circ = 2 * Math.PI * r;
  var offset = circ * (1 - pct);
  el.innerHTML =
    '<div style="display:flex;flex-direction:column;align-items:center;">' +
    '<svg width="84" height="84" viewBox="0 0 84 84">' +
      '<circle cx="42" cy="42" r="' + r + '" fill="none" stroke="var(--border)" stroke-width="8"/>' +
      '<circle cx="42" cy="42" r="' + r + '" fill="none" stroke="' + colorVar + '" stroke-width="8" stroke-linecap="round" ' +
        'stroke-dasharray="' + circ.toFixed(1) + '" stroke-dashoffset="' + circ.toFixed(1) + '" transform="rotate(-90 42 42)" class="hw-ring-progress" ' +
        'style="--hw-ring-final:' + offset.toFixed(1) + ';"/>' +
      '<text x="42" y="47" text-anchor="middle" font-size="16" font-weight="700" fill="var(--text)">' + centerText + '</text>' +
    '</svg>' +
    '<span style="font-size:12px;color:var(--text-secondary);margin-top:2px;">' + label + '</span>' +
    '</div>';
  /* Animation nachträglich per rAF starten, damit der Übergang von stroke-dashoffset (Start) zum Zielwert greift */
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){
      var ring = el.querySelector('.hw-ring-progress');
      if(ring) ring.style.strokeDashoffset = offset.toFixed(1);
    });
  });
}

/* ---------- Stündlicher Vorhersage-Streifen mit Temperaturkurve ---------- */
function hwRenderHourlyStrip(containerId, weatherData, hours){
  hours = hours || 16;
  var el = document.getElementById(containerId);
  if(!el) return;
  var times = weatherData.hourly && weatherData.hourly.time;
  var temps = weatherData.hourly && weatherData.hourly.temperature_2m;
  var codes = weatherData.hourly && weatherData.hourly.weather_code;
  var isDayArr = weatherData.hourly && weatherData.hourly.is_day;
  if(!times || !temps || !codes){ el.innerHTML = ''; return; }
  var offset = weatherData.utc_offset_seconds;
  var now = Date.now();
  var idx0 = hwHourIdx(times, offset);
  var items = [];
  for(var i = idx0; i < idx0 + hours && i < times.length; i++){
    items.push({ time: times[i], temp: temps[i], code: codes[i], isDay: isDayArr ? isDayArr[i] === 1 : true });
  }
  if(!items.length){ el.innerHTML = ''; return; }

  var cards = items.map(function(it){
    var d = new Date(it.time);
    var label = d.getHours() + ' Uhr';
    return '<div class="hw-hourly-item">' +
      '<span class="hw-hourly-time">' + label + '</span>' +
      '<span style="color:' + hwWeatherIconColor(it.code, it.isDay) + ';">' + hwWeatherIcon(it.code, 22, it.isDay) + '</span>' +
      '<span class="hw-hourly-temp">' + Math.round(it.temp) + '°</span>' +
    '</div>';
  }).join('');

  var totalW = 60 * items.length;
  el.innerHTML = '<div class="hw-hourly-strip" style="width:' + totalW + 'px;">' + cards + '</div>';
}

/* ---------- Himmel-Hero (animierte Wetterlage-Visualisierung) ---------- */
function hwSkyCondition(code){
  if(code === 0 || code === 1) return 'clear';
  if(code === 2) return 'partly';
  if(code === 3 || code === 45 || code === 48) return 'cloudy';
  if([51,53,55,56,57,61,63,65,66,67,80,81,82].indexOf(code) !== -1) return 'rain';
  if([71,73,75,77,85,86].indexOf(code) !== -1) return 'snow';
  if([95,96,99].indexOf(code) !== -1) return 'storm';
  return 'cloudy';
}
/* ---------- Tagesüberblick (kurzer Ein-Satz-Überblick aus bereits geladenen Wetterdaten) ---------- */
function hwBuildDaySummary(data){
  var d = data.daily, h = data.hourly;
  if(!d || !d.time || !d.time.length) return '';
  var maxT = Math.round(d.temperature_2m_max[0]);
  var minT = Math.round(d.temperature_2m_min[0]);
  /* Nur Adjektive am Satzanfang klein schreiben – Hauptwörter (Nebel, Regenschauer …) bleiben groß */
  var codeText = hwWeatherCodeText(d.weather_code[0]).replace(/^(Klarer|Überwiegend|Teilweise|Bedeckt|Leichter|Leichte|Starker|Starke|Heftige|Gefrierender|Schweres)\b/, function(w){ return w.charAt(0).toLowerCase() + w.slice(1); });
  var offset = data.utc_offset_seconds;
  var now = Date.now();
  var rainHour = null;
  if(h && h.time && h.precipitation_probability){
    for(var i=0;i<h.time.length;i++){
      var t = hwRealTimeMs(h.time[i], offset);
      if(t < now) continue;
      if(t - now > 12*3600000) break;
      if(h.precipitation_probability[i] >= 50){ rainHour = new Date(h.time[i]).getHours(); break; }
    }
  }
  var txt = 'Heute ' + codeText + ', ' + minT + '° bis ' + maxT + '°C';
  if(rainHour != null){
    txt += ' · ab ' + rainHour + ' Uhr Regen möglich';
  } else if(d.precipitation_probability_max && d.precipitation_probability_max[0] < 20){
    txt += ' · voraussichtlich trocken';
  }
  return txt + '.';
}
function hwRenderDaySummary(containerId, data){
  var el = document.getElementById(containerId);
  if(!el) return;
  var txt = hwBuildDaySummary(data);
  if(!txt){ el.style.display = 'none'; return; }
  el.textContent = txt;
  el.style.display = 'block';
}

/* ---------- Vergleich zur Temperatur um diese Zeit gestern ---------- */
/* Speichert lokal die zuletzt gemessene Temperatur samt Zeitstempel und vergleicht sie ~24 Std. später
   mit dem aktuellen Wert. Referenzwert wird höchstens einmal pro ~20 Std. überschrieben, damit
   mehrfaches Öffnen am selben Tag den Vergleich nicht verfälscht. */
/* Schlüssel für „gleicher Ort“ (auf ca. 10 km gerundet) – Vergleiche gelten nur für denselben Ort */
function hwLocKey(lat, lon){ return lat.toFixed(1) + ',' + lon.toFixed(1); }
function hwUpdateYesterdayCompare(currentTemp, locKey){
  var raw = null;
  try{ raw = localStorage.getItem('hw-temp-yesterday'); }catch(e){}
  var stored = null;
  try{ stored = raw ? JSON.parse(raw) : null; }catch(e){ stored = null; }
  var now = Date.now();
  var diff = null;
  if(stored && typeof stored.temp === 'number' && stored.key === (locKey || '') && (now - stored.ts) >= 20*3600000 && (now - stored.ts) <= 30*3600000){
    diff = Math.round(currentTemp - stored.temp);
  }
  if(!stored || stored.key !== (locKey || '') || (now - stored.ts) >= 20*3600000){
    try{ localStorage.setItem('hw-temp-yesterday', JSON.stringify({ temp: currentTemp, ts: now, key: locKey || '' })); }catch(e){}
  }
  return diff;
}
function hwYesterdayCompareText(diff){
  if(diff == null) return null;
  if(diff === 0) return 'Genauso warm wie gestern um diese Zeit';
  if(diff > 0) return diff + '° wärmer als gestern um diese Zeit';
  return Math.abs(diff) + '° kälter als gestern um diese Zeit';
}

/* ---------- Zwei-Finger-Zoom unterbinden (zusätzlich zur Viewport-Meta, für WebKit-Sonderfälle) ---------- */
document.addEventListener('gesturestart', function(e){ e.preventDefault(); }, { passive: false });
document.addEventListener('gesturechange', function(e){ e.preventDefault(); }, { passive: false });
document.addEventListener('touchmove', function(e){ if(e.touches.length > 1) e.preventDefault(); }, { passive: false });

/* ---------- Druckgefühl & zuverlässiges Antippen ----------
   1) Kurzer Vibrationsimpuls beim Antippen (nur wo die Vibration API existiert, je nach Gerät und Browser).
   2) Die Druck-Optik (Zusammendrücken) hängt NICHT an CSS :active, sondern an dieser eigenen
      .hw-pressed-Klasse, die über Pointer-Events gesetzt/entfernt wird. Grund: Auf manchen Geräten entscheidet
      WebKit anhand des Zustands direkt unter dem Finger, ob ein Touch als Tap oder als Beginn einer
      Wisch-/Scrollgeste zählt. Verändert sich das Element während des Touches selbst per :active-
      Transition, wertet WebKit manchmal um – der Tap "verpufft" und der Button reagiert scheinbar
      nicht. Mit dieser Klasse bleibt :active unangetastet, und pointerup/-cancel/-leave entfernen
      .hw-pressed IMMER (auch bei abgebrochenem Touch, z.B. durch die Home-Indicator-Wischgeste am
      unteren Rand, wo die Tableiste sitzt) – ein Button kann also nie optisch "gedrückt" hängen
      bleiben und dadurch nachfolgende Taps schlucken. */
var HW_TAP_SEL = 'button, .hw-btn, .hw-quick-tile, .hw-pill-nav a, .hw-pill-nav button, .hw-nav a, .hw-nav button, ' +
  '.hw-order-btns button, .hw-stat-tile, .hw-forecast-day, .hw-seg button, .hw-loc-result-item, .hw-loc-result-star, ' +
  '.hw-loc-fav-remove, .hw-hero-loc, .hw-ar-btn, .hw-sheet-close, a[role="button"]';
function hwClearPressed(){
  var pressed = document.querySelectorAll('.hw-pressed');
  for(var i = 0; i < pressed.length; i++) pressed[i].classList.remove('hw-pressed');
}
function hwInitTapFeedback(){
  var canVibrate = 'vibrate' in navigator;
  document.addEventListener('pointerdown', function(e){
    var t = e.target.closest ? e.target.closest(HW_TAP_SEL) : null;
    if(!t || t.disabled) return;
    if(e.pointerType !== 'mouse'){
      t.classList.add('hw-pressed');
      if(canVibrate){ try{ navigator.vibrate(8); }catch(err){} }
    }
  }, { passive: true });
  /* Immer auf allen drei Wegen aufräumen, mit denen ein Touch enden kann – nur so ist garantiert,
     dass nie eine .hw-pressed-Klasse übrig bleibt, wenn das Gerät statt "pointerup" ein
     "pointercancel" (abgebrochene Geste) oder "pointerleave" (Finger vom Element weggezogen) meldet. */
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function(type){
    document.addEventListener(type, hwClearPressed, { passive: true });
  });
  /* Zusätzliches Sicherheitsnetz: falls ein Browser keines der obigen Events zuverlässig liefert
     (z.B. bei einem unterbrochenen Seitenwechsel), nie länger als eine Geste optisch hängen bleiben. */
  document.addEventListener('visibilitychange', hwClearPressed);
}

hwInitTheme();
document.addEventListener('DOMContentLoaded', function(){ hwInitIcons(); hwInitTapFeedback(); });
