/* AstroWahr – eigenes, einheitliches Liniensymbol-Set (24×24, Strichstärke über CSS).
   Ersetzt die zuvor verwendeten Emoji in Navigation, Kacheln und Bedienelementen,
   damit die App auf allen Geräten gleich aussieht. © 2026 Jan Dierlich. */
(function () {
  'use strict';
  const P = {
    home: '<path d="M4 10.5 12 4l8 6.5"/><path d="M6 9.2V20h4.5v-5.5h3V20H18V9.2"/>',
    telescope: '<path d="m4.5 13.5 11-6.3 2.5 4.3-11 6.3z"/><path d="m15.5 7.2 1.3-.8 2.5 4.3-1.3.8"/><path d="M4.5 13.5 3 14.4l1.2 2.1 1.6-.9"/><path d="m11 15.6-3 5.4M11 15.6l3 5.4"/>',
    crystal: '<circle cx="12" cy="10.5" r="6.5"/><path d="M7.5 20h9M8.8 17.4 7.5 20M15.2 17.4l1.3 2.6"/><path d="M9.6 8.2c.6-1 1.5-1.6 2.6-1.8"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7"/><path d="M6.5 7l.9 12.5h9.2L17.5 7"/><path d="M10.3 10.5v6M13.7 10.5v6"/>',
    planet: '<circle cx="12" cy="12" r="5.2"/><path d="M6.9 13.9C3.6 15.6 2 17.2 2.6 18.2c.9 1.5 6.2-.3 11.8-4.1 5.6-3.7 9-8 8.1-9.5-.6-1-2.9-.7-6 .7"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7"/>',
    sunrise: '<path d="M3 18h18M6 21h12"/><path d="M7 18a5 5 0 0 1 10 0"/><path d="M12 3.5v5M9.5 6 12 3.5 14.5 6M4.2 10.8l1.6 1.2M19.8 10.8l-1.6 1.2"/>',
    sunset: '<path d="M3 18h18M6 21h12"/><path d="M7 18a5 5 0 0 1 10 0"/><path d="M12 3.5v5M9.5 6 12 8.5 14.5 6M4.2 10.8l1.6 1.2M19.8 10.8l-1.6 1.2"/>',
    noon: '<circle cx="12" cy="9" r="3.4"/><path d="M12 2.5v1.6M5.5 9H3.9M20.1 9h-1.6M7.4 4.4l1.1 1.1M16.6 4.4l-1.1 1.1"/><path d="M3 17h18M6 20.5h12"/><path d="M12 13v4"/>',
    hourglass: '<path d="M6.5 3.5h11M6.5 20.5h11"/><path d="M8 3.5c0 4.5 4 5.5 4 8.5s-4 4-4 8.5M16 3.5c0 4.5-4 5.5-4 8.5s4 4 4 8.5"/>',
    moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
    stars: '<path d="M12 3.5l1.6 4.4 4.4 1.6-4.4 1.6L12 15.5l-1.6-4.4L6 9.5l4.4-1.6z"/><path d="M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8zM5.5 15.5l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z"/>',
    star: '<path d="M12.00 3.30L14.57 9.06L20.84 9.73L16.16 13.95L17.47 20.12L12.00 16.97L6.53 20.12L7.84 13.95L3.16 9.73L9.43 9.06Z"/>',
    comet: '<path d="m14.5 3.5 1.3 2.8 3 .4-2.2 2.1.5 3-2.6-1.4-2.7 1.4.5-3-2.2-2.1 3-.4z"/><path d="M10 13 4 19M12 16l-3.5 3.5M7.5 11.5 4.5 14.5"/>',
    orbit: '<circle cx="12" cy="12" r="2.4"/><ellipse cx="12" cy="12" rx="9.5" ry="4.2" transform="rotate(-25 12 12)"/><circle cx="20" cy="8.2" r="1.2" fill="currentColor" stroke="none"/>',
    heart: '<path d="M12 19.5S4 14.8 4 9.4A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 8 1.8c0 5.4-8 10.1-8 10.1z"/>',
    rings: '<circle cx="9" cy="12" r="5.5"/><circle cx="15" cy="12" r="5.5"/>',
    cards: '<rect x="8.5" y="3.5" width="10" height="15" rx="1.8" transform="rotate(10 13.5 11)"/><path d="M6.2 6.3 4.6 6.6a1.8 1.8 0 0 0-1.5 2.1l1.9 10.8a1.8 1.8 0 0 0 2.1 1.5l5.2-.9"/><path d="m13.9 8.8.7 1.5 1.6.3-1.2 1.1.3 1.6-1.4-.8-1.5.7.3-1.6-1.1-1.2 1.6-.2z"/>',
    book: '<path d="M4 5.5A2 2 0 0 1 6 3.5h13v14H6a2 2 0 0 0-2 2z"/><path d="M4 19.5a2 2 0 0 0 2 2h13v-4"/><path d="M8.5 8h6.5M8.5 11h4.5"/>',
    cap: '<path d="M2.5 9.5 12 5l9.5 4.5L12 14z"/><path d="M6.5 11.6V16c1.5 1.4 3.3 2 5.5 2s4-.6 5.5-2v-4.4"/><path d="M21.5 9.5v5"/>',
    rocket: '<path d="M14.5 4.5c2.5-.6 4.4-.5 5-.5 0 .6.1 2.5-.5 5a11 11 0 0 1-4.3 6.2L12 16.6 7.4 12l1.4-2.7A11 11 0 0 1 14.5 4.5z"/><circle cx="15" cy="9" r="1.6"/><path d="M7.4 12 4.5 11.4l2.3-2.6 3.3-.3M12 16.6l.6 2.9 2.6-2.3.3-3.3M6.6 17.4c-1 1-1.4 2.6-1.4 2.6s1.6-.4 2.6-1.4"/>',
    timeline: '<path d="M6 3.5v17"/><circle cx="6" cy="7" r="1.8"/><circle cx="6" cy="17" r="1.8"/><path d="M10 7h9M10 12h6M10 17h8"/>',
    evolution: '<circle cx="5.5" cy="12" r="2"/><circle cx="12" cy="12" r="3.2"/><circle cx="18.5" cy="12" r="1.3"/><path d="M8 12h.8M16.2 12h.8"/>',
    seasons: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17M3.5 12h17"/><circle cx="12" cy="3.5" r="1.4" fill="currentColor" stroke="none"/>',
    precession: '<circle cx="12" cy="13.5" r="5"/><path d="M15 3.5 9 23"/><ellipse cx="14.4" cy="5.4" rx="4.2" ry="1.5" stroke-dasharray="2 2"/>',
    gear: '<path fill="currentColor" fill-rule="evenodd" stroke="currentColor" stroke-width=".9" stroke-linejoin="round" d="M10.12 4.33L10.37 1.93A10.20 10.20 0 0 1 13.63 1.93L13.88 4.33A7.90 7.90 0 0 1 16.10 5.25L17.97 3.73A10.20 10.20 0 0 1 20.27 6.03L18.75 7.90A7.90 7.90 0 0 1 19.67 10.12L22.07 10.37A10.20 10.20 0 0 1 22.07 13.63L19.67 13.88A7.90 7.90 0 0 1 18.75 16.10L20.27 17.97A10.20 10.20 0 0 1 17.97 20.27L16.10 18.75A7.90 7.90 0 0 1 13.88 19.67L13.63 22.07A10.20 10.20 0 0 1 10.37 22.07L10.12 19.67A7.90 7.90 0 0 1 7.90 18.75L6.03 20.27A10.20 10.20 0 0 1 3.73 17.97L5.25 16.10A7.90 7.90 0 0 1 4.33 13.88L1.93 13.63A10.20 10.20 0 0 1 1.93 10.37L4.33 10.12A7.90 7.90 0 0 1 5.25 7.90L3.73 6.03A10.20 10.20 0 0 1 6.03 3.73L7.90 5.25A7.90 7.90 0 0 1 10.12 4.33ZM8.40 12a3.60 3.60 0 1 0 7.20 0a3.60 3.60 0 1 0 -7.20 0Z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r=".6" fill="currentColor"/>',
    doc: '<path d="M6 3.5h8l4 4v13H6z"/><path d="M14 3.5v4h4M9 12h6M9 15.5h6"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/><path d="M12 14.5v2.5"/>',
    scroll: '<path d="M12 4v16M8 20h8M5 7h14"/><path d="M5 7l-2.5 6a2.5 2.5 0 0 0 5 0zM19 7l-2.5 6a2.5 2.5 0 0 0 5 0z"/>',
    pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
    locate: '<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/>',
    zoom: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5M10.5 7.5v6M7.5 10.5h6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/><path d="M4.5 19.5h15"/>',
    upload: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M4.5 19.5h15"/>',
    refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4h-4"/>',
    split: '<path d="M12 21v-7l-6-6M12 14l6-6"/><path d="M6 12.5V8h4.5M18 12.5V8h-4.5"/>',
    shuffle: '<path d="M3.5 7h3.8c4.2 0 5.2 10 9.4 10h3.8M3.5 17h3.8c1.7 0 2.8-1.6 3.8-3.6M13 9.6C14 7.6 15.1 7 16.7 7h3.8"/><path d="m18 4.5 2.5 2.5L18 9.5M18 14.5l2.5 2.5-2.5 2.5"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    heartOutline: '<path d="M12 19.5S4 14.8 4 9.4A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 8 1.8c0 5.4-8 10.1-8 10.1z"/>',
    starFilled: '<path fill="currentColor" d="M12.00 3.30L14.57 9.06L20.84 9.73L16.16 13.95L17.47 20.12L12.00 16.97L6.53 20.12L7.84 13.95L3.16 9.73L9.43 9.06Z"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.6 8.4-2 5.2-5.2 2 2-5.2z"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
    leaf: '<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19c3-4 6-7 10-9"/>',
    snow: '<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/><path d="m9.5 4.5 2.5 2 2.5-2M9.5 19.5l2.5-2 2.5 2"/>',
    sprout: '<path d="M12 20.5V11"/><path d="M12 13c0-4 2.5-6.5 7-6.5 0 4-2.5 6.5-7 6.5zM12 11C12 7.5 9.8 5.5 5.5 5.5c0 3.5 2.2 5.5 6.5 5.5z"/>',
    sparkle: '<path d="M12 3.5l1.9 6.6 6.6 1.9-6.6 1.9L12 20.5l-1.9-6.6L3.5 12l6.6-1.9z"/>'
  };
  // zusätzliche Symbole für Lexikon-Einträge (ersetzen die früheren Emoji)
  Object.assign(P, {
    fire: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.3 2.4-5.5 4-7.6.4 1.8 1.4 3 2.6 3.5.3-2.9 1.6-5.4 3.6-7.2-.2 2.8.6 4.5 1.8 6.1 1.1 1.5 1.9 3 1.9 5.2 0 3.6-2.6 6.2-6.4 6.2z"/>',
    drop: '<path d="M12 3.5c3.2 4 5.8 7.3 5.8 10.4a5.8 5.8 0 0 1-11.6 0C6.2 10.8 8.8 7.5 12 3.5z"/>',
    wind: '<path d="M3 8.5h11a2.5 2.5 0 1 0-2.5-2.5M3 12.5h15a2.5 2.5 0 1 1-2.5 2.5M3 16.5h7"/>',
    globe: '<circle cx="12" cy="12" r="8.8"/><ellipse cx="12" cy="12" rx="3.7" ry="8.8"/><path d="M3.2 12h17.6"/>',
    galaxy: '<path d="M12.2 12.2a1.9 1.9 0 1 0 1.9-1.9c-2.2 0-4 1.8-4 4a6 6 0 0 0 6 6 8.2 8.2 0 0 0 0-16.4c-4.3 0-8 3-9.4 7.4"/>',
    hole: '<circle cx="12" cy="12" r="3.2" fill="currentColor"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8"/>',
    spectrum: '<path d="M3 17.5a9 9 0 0 1 18 0M6.5 17.5a5.5 5.5 0 0 1 11 0M10 17.5a2 2 0 0 1 4 0"/>',
    satellite: '<rect x="9.4" y="9.4" width="5.2" height="5.2" rx="1" transform="rotate(45 12 12)"/><path d="M8.4 8.4 5.6 5.6M15.6 15.6l2.8 2.8M3.5 7.7l4.2-4.2M16.3 20.5l4.2-4.2"/>',
    person: '<circle cx="12" cy="8" r="3.6"/><path d="M5.5 20.5a6.5 6.5 0 0 1 13 0"/>',
    ruler: '<rect x="3" y="8" width="18" height="8" rx="1.5"/><path d="M7 8v3M11 8v4M15 8v3M19 8v3"/>',
    nebula: '<path d="M4 14.5c0-2.5 2-4.2 4.3-4.2.6-2.4 2.7-4 5.1-4 3 0 5.4 2.3 5.4 5.3 1.3.5 2.2 1.7 2.2 3.1 0 1.9-1.6 3.3-3.5 3.3H7.6C5.6 18 4 16.5 4 14.5z"/><path d="M9 13.5h.01M13 11.5h.01M15.5 14.5h.01"/>',
    dot: '<circle cx="12" cy="12" r="6" fill="currentColor"/>',
    ring: '<circle cx="12" cy="12" r="6"/>'
  });
  const EMOJI_ICON = {
    '🔥': 'fire', '🌍': 'globe', '💨': 'wind', '💧': 'drop', '🌫️': 'nebula', '🔴': 'dot', '⚪': 'ring', '⚫': 'dot', '💥': 'sparkle', '🌟': 'starFilled',
    '🕳️': 'hole', '🌈': 'spectrum', '💫': 'sparkle', '✨': 'sparkle', '⭐': 'star', '☀️': 'sun', '↔️': 'split', '🌌': 'galaxy', '🌠': 'comet',
    '🌀': 'galaxy', '🔄': 'refresh', '♻️': 'refresh', '🌑': 'moon', '🌕': 'moon', '📏': 'ruler', '🪐': 'planet', '🧊': 'snow', '🚀': 'rocket',
    '👨\u200d🚀': 'person', '🧑\u200d🚀': 'person', '🛸': 'orbit', '🔭': 'telescope', '📡': 'satellite', '☄️': 'comet', '🛰️': 'satellite'
  };
  // Liefert für ein Emoji das eigene Symbol, für astronomische Zeichen (♈, ☉ …) das Zeichen selbst
  const EMOJI_MAP = {};
  Object.keys(EMOJI_ICON).forEach(function (k) { EMOJI_MAP[k.replace(/️/g, '')] = EMOJI_ICON[k]; });
  window.AWSym = function (sym) {
    const raw = String(sym || ''), key = raw.replace(/️/g, '');
    if (EMOJI_MAP[key]) return icon(EMOJI_MAP[key], 'aw-sym');
    return raw;
  };
  function icon(name, cls) {
    const body = P[name] || P.sparkle;
    return '<svg class="aw-ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + body + '</svg>';
  }
  window.AWIcon = icon;
  window.AWIconNames = Object.keys(P);
})();
