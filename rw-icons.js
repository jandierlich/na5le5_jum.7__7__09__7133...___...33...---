/* =========================================================
   ReiseWahr — eigene Symbole (Startseite + Keysglade)
   Alle Symbole sind eigenständig gezeichnete Vektorgrafiken
   (24er-Raster, Linienstärke 1,8, abgerundete Enden) und
   übernehmen die Textfarbe. © 2026 Jan Dierlich.
   Keine Emojis, keine Symbolschriften, keine Fremdgrafiken.

   Nutzung:
   - im Code:  rwi("sun")  → SVG-Markup
   - im HTML:  <i data-i="print"></i>  → wird automatisch ersetzt
========================================================= */
(function () {
  var P = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>',
    cloud: '<path d="M7 18.5h10.2a4 4 0 0 0 .5-7.97 5.6 5.6 0 0 0-10.8 1.2A3.4 3.4 0 0 0 7 18.5Z"/>',
    cloudsun: '<path d="M9 20h8.6a3.4 3.4 0 0 0 .4-6.78 4.8 4.8 0 0 0-9.2 1A2.9 2.9 0 0 0 9 20Z"/><circle cx="8" cy="8.5" r="2.7"/><path d="M8 3v1.2M2.5 8.5h1.2M4.1 4.6l.9.9M11.9 4.6l-.9.9M4.1 12.4l.9-.9"/>',
    fog: '<path d="M5.5 7.5h13M3.5 11.5h17M5.5 15.5h13M8.5 19.5h7"/>',
    drizzle: '<path d="M7 14h10a3.5 3.5 0 0 0 .5-6.97A5 5 0 0 0 7.9 8.1 3 3 0 0 0 7 14Z"/><path d="M9 17.5v.8M13 17.5v.8M17 17.5v.8M11 20.5v.8M15 20.5v.8"/>',
    rain: '<path d="M7 14h10a3.5 3.5 0 0 0 .5-6.97A5 5 0 0 0 7.9 8.1 3 3 0 0 0 7 14Z"/><path d="M9 17l-1 3.5M13 17l-1 3.5M17 17l-1 3.5"/>',
    thunder: '<path d="M7 14h10a3.5 3.5 0 0 0 .5-6.97A5 5 0 0 0 7.9 8.1 3 3 0 0 0 7 14Z"/><path d="M12.8 15.5 10.5 19h3l-2.3 3.5"/>',
    question: '<circle cx="12" cy="12" r="8.5"/><path d="M9.7 9.6a2.4 2.4 0 1 1 3.4 2.2c-.7.3-1.1.9-1.1 1.6v.6"/><circle cx="12" cy="16.9" r=".5" fill="currentColor"/>',
    droplet: '<path d="M12 3.5s-5.8 6.3-5.8 10.6a5.8 5.8 0 0 0 11.6 0C17.8 9.8 12 3.5 12 3.5Z"/>',
    droplets: '<path d="M8.5 6s-3.5 3.8-3.5 6.4a3.5 3.5 0 0 0 7 0C12 9.8 8.5 6 8.5 6Z"/><path d="M16.5 11s-2.5 2.7-2.5 4.6a2.5 2.5 0 0 0 5 0c0-1.9-2.5-4.6-2.5-4.6Z"/>',
    wind: '<path d="M3 9h11.5A2.5 2.5 0 1 0 12 6.5M3 13h15a2.5 2.5 0 1 1-2.5 2.5M3 17h7"/>',
    sunrise: '<path d="M3 18.5h18M6.5 15a5.5 5.5 0 0 1 11 0M12 3.5v5M9.5 6 12 3.5 14.5 6M4.3 10.8l1.3 1M19.7 10.8l-1.3 1"/>',
    thermo: '<path d="M10 14.3V5a2 2 0 1 1 4 0v9.3a4 4 0 1 1-4 0Z"/><path d="M12 9.5v7"/>',
    alert: '<path d="M12 3.8 2.8 19.8h18.4Z"/><path d="M12 10v4.6"/><circle cx="12" cy="17.2" r=".5" fill="currentColor"/>',
    hurricane: '<circle cx="12" cy="12" r="2.6"/><path d="M9.4 12c0-5 3.2-8.2 9-8.6M14.6 12c0 5-3.2 8.2-9 8.6"/>',
    tornado: '<path d="M3.5 5h17M5.5 9h13M8 13h9M10.5 17h5M12.5 21h1.5"/>',
    waves: '<path d="M2.5 8c1.6 0 1.6-1.4 3.2-1.4S7.3 8 8.9 8s1.6-1.4 3.1-1.4S13.6 8 15.2 8s1.6-1.4 3.2-1.4S20 8 21.5 8M2.5 13c1.6 0 1.6-1.4 3.2-1.4S7.3 13 8.9 13s1.6-1.4 3.1-1.4 1.6 1.4 3.2 1.4 1.6-1.4 3.2-1.4S20 13 21.5 13M2.5 18c1.6 0 1.6-1.4 3.2-1.4S7.3 18 8.9 18s1.6-1.4 3.1-1.4 1.6 1.4 3.2 1.4 1.6-1.4 3.2-1.4S20 18 21.5 18"/>',
    bookmark: '<path d="M6.5 3.5h11v17L12 16.5l-5.5 4Z"/>',
    bookmarked: '<path d="M6.5 3.5h11v17L12 16.5l-5.5 4Z" fill="currentColor"/>',
    circle: '<circle cx="12" cy="12" r="8.5"/>',
    checkcircle: '<circle cx="12" cy="12" r="8.5"/><path d="m8 12.3 2.8 2.8L16.2 9.5"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><ellipse cx="12" cy="12" rx="3.6" ry="8.5"/><path d="M3.5 12h17"/>',
    share: '<path d="M12 3.5v11M7.5 8 12 3.5 16.5 8M5 12.5V20h14v-7.5"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    dice: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><g fill="currentColor" stroke="none"><circle cx="8.6" cy="8.6" r="1.3"/><circle cx="15.4" cy="8.6" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="8.6" cy="15.4" r="1.3"/><circle cx="15.4" cy="15.4" r="1.3"/></g>',
    map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/>',
    pin: '<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z"/><circle cx="12" cy="9" r="2.5"/>',
    locate: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/>',
    fullscreen: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    calculator: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8.5 6.5h7v3h-7Z"/><g fill="currentColor" stroke="none"><circle cx="9" cy="13" r="1"/><circle cx="12" cy="13" r="1"/><circle cx="15" cy="13" r="1"/><circle cx="9" cy="17" r="1"/><circle cx="12" cy="17" r="1"/><circle cx="15" cy="17" r="1"/></g>',
    book: '<path d="M5 5a2 2 0 0 1 2-2h12v15H7a2 2 0 0 0-2 2Z"/><path d="M5 20a2 2 0 0 0 2 1.5h12V18M9 7.5h6"/>',
    print: '<path d="M7 8V3.5h10V8M7 17H4.5V9.5A1.5 1.5 0 0 1 6 8h12a1.5 1.5 0 0 1 1.5 1.5V17H17"/><path d="M7 13.5h10v7H7Z"/>',
    download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>',
    upload: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 19.5h14"/>',
    bulb: '<path d="M9.5 18h5M10.5 21h3M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z"/>',
    tower: '<rect x="7.5" y="3.5" width="9" height="5" rx="1.2"/><rect x="7.5" y="9.5" width="9" height="5" rx="1.2"/><rect x="7.5" y="15.5" width="9" height="5" rx="1.2"/>',
    tiles: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    speaker: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4Z"/><path d="M15.5 9.2a4 4 0 0 1 0 5.6M18 6.8a7.4 7.4 0 0 1 0 10.4"/>',
    mute: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4Z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
    undo: '<path d="M9 5.5 4.5 10 9 14.5"/><path d="M4.5 10h10a5 5 0 0 1 0 10H11"/>',
    refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4v4.5H15"/>',
    pause: '<path d="M8.5 5.5v13M15.5 5.5v13"/>',
    play: '<path d="M8 5.5v13l10.5-6.5Z"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    ruler: '<path d="M3.5 16.5 16.5 3.5l4 4-13 13Z"/><path d="M7.3 12.7l1.6 1.6M10.2 9.8l1.6 1.6M13.1 6.9l1.6 1.6"/>',
    car: '<path d="M5.5 16V12.8l1.9-4.6A1.5 1.5 0 0 1 8.8 7.2h6.4a1.5 1.5 0 0 1 1.4 1l1.9 4.6V16Z"/><path d="M4 12.8h16M7.5 16v2.5M16.5 16v2.5"/><circle cx="8.5" cy="13.9" r=".4" fill="currentColor"/><circle cx="15.5" cy="13.9" r=".4" fill="currentColor"/>',
    spark: '<path d="M12 3.5 13.8 10.2 20.5 12l-6.7 1.8L12 20.5l-1.8-6.7L3.5 12l6.7-1.8Z"/>',
    palm: '<path d="M12.5 21c.3-3.5.2-7-.5-10"/><path d="M12 11C10 8 6.5 7.3 3.5 8.8M12 11c2.3-2.8 5.8-3.2 8.5-1.6M12 11c-.8-3.5-3.2-5.8-6.3-6.5M12 11c1.2-3.3 3.8-5.3 6.8-5.6M8.5 21h8"/>',
    plane: '<path d="M21 4.5 3.5 11l6 2.5 2.5 6Z"/><path d="M9.5 13.5 21 4.5"/>',
    money: '<rect x="2.5" y="6.5" width="19" height="11" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9.5v5M18 9.5v5"/>',
    note: '<path d="M4 20h4L19 9l-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/>',
    trips: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18"/>',
    home: '<path d="M4 11 12 4l8 7v9h-5.5v-6h-5v6H4Z"/>',
    star: '<path d="M12.00 3.30L14.57 9.06L20.84 9.73L16.16 13.95L17.47 20.12L12.00 16.97L6.53 20.12L7.84 13.95L3.16 9.73L9.43 9.06Z"/>',
    starfill: '<path d="M12.00 3.30L14.57 9.06L20.84 9.73L16.16 13.95L17.47 20.12L12.00 16.97L6.53 20.12L7.84 13.95L3.16 9.73L9.43 9.06Z" fill="currentColor"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r=".5" fill="currentColor"/>'
  };

  function rwi(name, cls) {
    return '<svg class="rwi' + (cls ? " " + cls : "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (P[name] || P.info) + "</svg>";
  }
  window.rwi = rwi;

  // Grundstil einmalig einfügen: Symbole skalieren mit der Schriftgröße
  var css = document.createElement("style");
  css.textContent =
    ".rwi{width:1.15em;height:1.15em;vertical-align:-.2em;flex:none;display:inline-block;pointer-events:none}" +
    ".rwi-lg{width:1em;height:1em}" +
    "[data-i]{font-style:normal}" +
    "img.cat-ic{width:1em;height:1em;vertical-align:-.12em;display:inline-block}";
  document.head.appendChild(css);

  function upgrade(root) {
    (root || document).querySelectorAll("[data-i]:not([data-i-done])").forEach(function (el) {
      el.insertAdjacentHTML("afterbegin", rwi(el.getAttribute("data-i")) + (el.childNodes.length ? " " : ""));
      el.setAttribute("data-i-done", "");
    });
  }
  window.rwiUpgrade = upgrade;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { upgrade(); });
  else upgrade();
})();
