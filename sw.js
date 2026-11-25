/* ============================================================
   sw.js — Der EINE Service Worker der WahrZentrale
   (Zentrale + alle 26 Apps liegen im selben Ordner und Geltungsbereich).

   Strategie
   - Eigene Dateien: "Netz zuerst, Cache als Rückfall". Mit Internet kommt
     immer die aktuelle Version (Updates erscheinen automatisch). Hängt das
     Netz länger als ~3 s oder ist man offline, wird die gespeicherte
     Version genutzt.
   - Beim Installieren werden alle Programmdateien aller Apps einmal in den
     Offline-Speicher gelegt, damit jede App auch ohne Internet startet.
     Die großen Geodaten von WowarWahr (ca. 10 MB) werden erst geladen,
     wenn WowarWahr zum ersten Mal geöffnet wird, und liegen in einem eigenen
     Speicher – ein App-Update lädt sie deshalb nicht erneut herunter.
   - Die großen, versionierten Bibliotheken der Texterkennung und der
     Barcode-Erkennung (lib-ocr-…, lib-zxing-…) liegen in der WahrZentrale
     selbst, werden aber erst beim ersten Scannen geladen und bleiben dann
     dauerhaft im Offline-Speicher. Fremde Server sind dafür nicht nötig.
   - Alles andere (Wetter, Karten-Kacheln, Produktdaten, Ortssuche …) geht
     unverändert ans Netz und wird nie gespeichert.

   Die Listen unten werden beim Erstellen des Pakets automatisch erzeugt;
   BUILD ändert sich dabei, damit Geräte die neue Liste übernehmen.
   ============================================================ */

const BUILD = 'wz118cacheb';
const CACHE = 'wahrzentrale-' + BUILD;
const LIBS_CACHE = 'wahrzentrale-libs-v4';
// Große Geodaten von WowarWahr: eigener Speicher, der Updates der App überdauert
// (Version nur erhöhen, wenn sich die wow-*.json-Dateien selbst ändern).
const DATA_CACHE = 'wahrzentrale-wowdata-v1';
const NETWORK_TIMEOUT_MS = 3000;

const PRECACHE = [
"./index.html",
"./additive-engine.js",
"./as-app.js",
"./as-astro.js",
"./as-icon-192.png",
"./as-icons.js",
"./as-index.html",
"./as-no-zoom.js",
"./as-style.css",
"./as-tarot-art.js",
"./as-tarot-cards.js",
"./af-game.js",
"./af-icon-192.png",
"./af-index.html",
"./af-style.css",
"./aw-app.js",
"./aw-icon-192.png",
"./aw-icon-512.png",
"./aw-index.html",
"./aw-style.css",
"./bp-app.html",
"./bp-app.js",
"./bp-crop.js",
"./bp-db.js",
"./bp-icon-192.png",
"./bp-style.css",
"./bp-voice.js",
"./bw-app.js",
"./bw-icon-192.png",
"./bw-index.html",
"./datenschutz.html",
"./hinweise.html",
"./hk-icon-192.png",
"./hk-index.html",
"./hw-abendrot.html",
"./hw-app.js",
"./hw-astro.js",
"./hw-einstellungen.html",
"./hw-icon-192.png",
"./hw-insights.js",
"./hw-index.html",
"./hw-info.html",
"./hw-kompass.html",
"./hw-nachthimmel.html",
"./hw-sky.js",
"./hw-style.css",
"./hw-umwelt.html",
"./hz-icon-192.png",
"./hz-index.html",
"./icon-180.png",
"./icon-192.png",
"./icon-512.png",
"./icon-maskable-512.png",
"./impressum.html",
"./inci-database.js",
"./kg-ambient.js",
"./kg-app.js",
"./kg-backup.js",
"./kg-budget.js",
"./kg-countdown.js",
"./kg-currency.js",
"./kg-data.js",
"./kg-diary.js",
"./kg-distance.js",
"./kg-expenses.js",
"./kg-flag-florida.svg",
"./kg-flag-germany.svg",
"./kg-flag-usa.svg",
"./kg-gameturm.js",
"./kg-hero-illustration.svg",
"./kg-icon-192.png",
"./kg-icon-adventure.svg",
"./kg-icon-art.svg",
"./kg-icon-beaches.svg",
"./kg-icon-cities.svg",
"./kg-icon-food.svg",
"./kg-icon-history.svg",
"./kg-icon-map.svg",
"./kg-icon-overview.svg",
"./kg-icon-parks.svg",
"./kg-icon-planner.svg",
"./kg-icon-planning.svg",
"./kg-icon-tips.svg",
"./kg-icon-weather.svg",
"./kg-icon-wildlife.svg",
"./kg-index.html",
"./kg-itinerary.js",
"./kg-map.js",
"./kg-motion.js",
"./kg-nearby.js",
"./kg-notes.js",
"./kg-onboarding.js",
"./kg-packing.js",
"./kg-phrasebook.js",
"./kg-print.js",
"./kg-quiz.js",
"./kg-randompick.js",
"./kg-speak-share.js",
"./kg-storage.js",
"./kg-style.css",
"./kg-tempconvert.js",
"./kg-templates.js",
"./kg-theme.js",
"./kg-tide.js",
"./kg-timecompare.js",
"./kg-tipcalc.js",
"./kg-title-adventure.svg",
"./kg-title-art.svg",
"./kg-title-beaches.svg",
"./kg-title-cities.svg",
"./kg-title-food.svg",
"./kg-title-history.svg",
"./kg-title-parks.svg",
"./kg-title-plannerpage.svg",
"./kg-title-planning.svg",
"./kg-title-tips.svg",
"./kg-title-weather.svg",
"./kg-title-wildlife.svg",
"./kg-wave-divider.svg",
"./kg-weather.js",
"./kg-wowbridge.js",
"./kg-zahlenfusion.js",
"./kl-icon-192.png",
"./kl-index.html",
"./lb-app.js",
"./lb-core.js",
"./lb-exp.js",
"./lb-icon-192.png",
"./lb-icon-512.png",
"./lb-index.html",
"./lb-run.js",
"./lb-sense.js",
"./lb-style.css",
"./kv-icon-192.png",
"./kv-index.html",
"./kw-app.js",
"./kw-icon-192.png",
"./kw-icon-512.png",
"./kw-index.html",
"./kw-style.css",
"./ld-icon-192.png",
"./ld-index.html",
"./lib-jspdf.umd.min.js",
"./lib-leaflet.css",
"./lib-leaflet.js",
"./lizenzen.html",
"./lw-icon-192.png",
"./lw-icon-512.png",
"./lw-index.html",
"./manifest.json",
"./mw-icon-192.png",
"./mw-icon-512.png",
"./mw-index.html",
"./pk-engine.js",
"./pk-icon-192.png",
"./pk-index.html",
"./pw-app.js",
"./pw-check-engine.js",
"./pw-icon-192.png",
"./pw-icon-512.png",
"./pw-index.html",
"./pw-style.css",
"./qr-icon-192.png",
"./qr-icon-512.png",
"./qr-index.html",
"./rw-icons.js",
"./st-icon-192.png",
"./st-index.html",
"./sn-app.js",
"./sn-icon-192.png",
"./sn-icon-512.png",
"./sn-index.html",
"./wd-app.js",
"./wd-cam.js",
"./wd-data.js",
"./wd-icon-192.png",
"./wd-icon-512.png",
"./wd-index.html",
"./wd-share.js",
"./sternewahr-app.js",
"./sternewahr-astro.js",
"./sternewahr-index.html",
"./sternewahr-render.js",
"./sternewahr-stars.js",
"./sternewahr-style.css",
"./vw-app.js",
"./vw-icon-192.png",
"./vw-icon-512.png",
"./vw-index.html",
"./vw-style.css",
"./wk-app.js",
"./wk-icon-192.png",
"./wk-index.html",
"./wk-style.css",
"./wow-app.css",
"./wow-app.js",
"./wow-compass.js",
"./wow-db.js",
"./wow-exif.js",
"./wow-film.js",
"./wow-geo.js",
"./wow-globe.js",
"./wow-icon-192.png",
"./wow-index.html",
"./wow-map.js",
"./wow-photos.js",
"./wow-share.js",
"./wow-stats.js",
"./wow-ui.js",
"./wow-zip.js",
"./wz-apps.js",
"./wz-ask.js",
"./wz-backup.js",
"./wz-common.css",
"./wz-core.js",
"./wz-design.css",
"./wz-design.js",
"./wz-einstellungen.html",
"./wz-hub.js",
"./wz-icons.svg",
"./wz-ocr-worker.js",
"./wz-ocr.js",
"./wz-onboarding.js",
"./wz-scan.html",
"./wz-shared.js",
"./wz-sichern.html",
"./wz-theme.js",
"./wz-ui.js",
"./wz-unify.css",
"./wz-xlsx.js",
"./zh-icon-192.png",
"./zw-game.js",
"./zw-icon-192.png",
"./zw-index.html",
"./zw-spiel.html",
"./zw-style.css"
];
const WOW_DATA = ["./wow-world.json", "./wow-places.json", "./wow-regions.json", "./wow-hi.json", "./wow-water.json", "./wow-places-plus.json"];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      // einzeln statt addAll: eine fehlende Datei verhindert nicht den ganzen Offline-Speicher
      Promise.all(PRECACHE.map(url => cache.add(new Request(url, { cache: 'reload' })).catch(() => {})))
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(k => k !== CACHE && k !== LIBS_CACHE && k !== DATA_CACHE)
        .map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// AstroWahr fragt bei einem wartenden Update ausdrücklich nach
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// Hinweise aus HimmelsWahr (Regenwarnung): Tipp öffnet bzw. zeigt die App
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || './hw-index.html';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) { if ('focus' in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});

function networkFirst(event) {
  const request = event.request;
  return caches.open(CACHE).then(cache => {
    const fromNetwork = fetch(request).then(response => {
      if (response && response.ok && response.type === 'basic') {
        const copy = response.clone();
        event.waitUntil(cache.put(request, copy).catch(() => {}));
      }
      return response;
    });
    fromNetwork.catch(() => {});
    const fromCache = () => cache.match(request, { ignoreSearch: true });
    const timeout = new Promise(resolve => setTimeout(resolve, NETWORK_TIMEOUT_MS));

    return Promise.race([fromNetwork, timeout.then(fromCache)])
      .then(res => res || fromNetwork)
      .catch(() => fromCache())
      .then(res => res || (request.mode === 'navigate' ? cache.match('./index.html') : undefined))
      .then(res => res || Response.error());
  });
}

function cacheFirstLibs(request) {
  return caches.open(LIBS_CACHE).then(cache =>
    cache.match(request).then(cached => cached || fetch(request).then(response => {
      if (response && (response.ok || response.type === 'opaque')) cache.put(request, response.clone()).catch(() => {});
      return response;
    }))
  );
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    // WowarWahr wird geöffnet: große Geodaten einmalig im Hintergrund nachladen
    if (request.mode === 'navigate' && url.pathname.endsWith('/wow-index.html')) {
      event.waitUntil(caches.open(DATA_CACHE).then(cache => Promise.all(WOW_DATA.map(f =>
        cache.match(f).then(hit => hit || cache.add(f).catch(() => {}))))));
    }
    // Geodaten: zuerst aus dem eigenen Speicher, sonst einmal laden und ablegen
    if (/\/wow-[a-z-]+\.json$/.test(url.pathname)) {
      event.respondWith(caches.open(DATA_CACHE).then(cache =>
        cache.match(request, { ignoreSearch: true }).then(hit => hit || fetch(request).then(res => {
          if (res && res.ok) cache.put(request, res.clone()).catch(() => {});
          return res;
        }))));
      return;
    }
    // große Bibliotheken (Dateiname enthält die Version): einmal laden, dann aus dem Speicher
    if (/\/lib-(ocr|zxing)-[^/]+$/.test(url.pathname)) {
      event.respondWith(cacheFirstLibs(request));
      return;
    }
    event.respondWith(networkFirst(event));
    return;
  }
  // alle übrigen externen Anfragen: unverändert ans Netz, nie gecacht
});
