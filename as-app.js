(function () {
  'use strict';
  const E = window.AstroEngine;
  const STORAGE_KEYS = { profiles: 'astrowahr.profiles' };

  /* ---------------------------------------------------------------
     Stammdaten
     --------------------------------------------------------------- */
  const SIGNS_META = [
    { symbol: '♈', element: 'Feuer', quality: 'Kardinal', ruler: 'Mars',
      traits: 'Du gehst Dinge mutig und direkt an, dein Elan reißt andere mit. Achte darauf, nicht ungeduldig über die Bedürfnisse anderer hinwegzugehen.' },
    { symbol: '♉', element: 'Erde', quality: 'Fix', ruler: 'Venus',
      traits: 'Du schätzt Beständigkeit, Genuss und verlässliche Nähe. Manchmal hilft es, Gewohntes bewusst loszulassen, um Neues zuzulassen.' },
    { symbol: '♊', element: 'Luft', quality: 'Veränderlich', ruler: 'Merkur',
      traits: 'Neugier und Wortgewandtheit machen dich zum wachen Beobachter deiner Umgebung. Gib einzelnen Themen ruhig auch mal mehr Tiefe statt nur Breite.' },
    { symbol: '♋', element: 'Wasser', quality: 'Kardinal', ruler: 'Mond',
      traits: 'Du spürst Stimmungen fein und sorgst dich liebevoll um Menschen, die dir wichtig sind. Schütze dich davor, dich in fremden Gefühlen zu verlieren.' },
    { symbol: '♌', element: 'Feuer', quality: 'Fix', ruler: 'Sonne',
      traits: 'Mit Herzenswärme und Selbstbewusstsein ziehst du Aufmerksamkeit auf dich. Teile die Bühne bewusst auch mit anderen.' },
    { symbol: '♍', element: 'Erde', quality: 'Veränderlich', ruler: 'Merkur',
      traits: 'Dein Blick fürs Detail und dein Verantwortungsgefühl machen dich verlässlich. Sei nicht zu streng mit dir, wenn nicht alles perfekt läuft.' },
    { symbol: '♎', element: 'Luft', quality: 'Kardinal', ruler: 'Venus',
      traits: 'Harmonie, Ästhetik und faire Ausgewogenheit sind dir wichtig. Triff Entscheidungen ruhig auch mal aus dem Bauch statt endlos abzuwägen.' },
    { symbol: '♏', element: 'Wasser', quality: 'Fix', ruler: 'Pluto',
      traits: 'Du gehst Dingen intensiv und ehrlich auf den Grund. Vertrauen aufzubauen braucht Zeit – lass es zu, statt dich vorschnell zurückzuziehen.' },
    { symbol: '♐', element: 'Feuer', quality: 'Veränderlich', ruler: 'Jupiter',
      traits: 'Freiheitsliebe und Optimismus treiben deinen Wissensdurst an. Behalte im Blick, dass große Visionen auch kleine Schritte brauchen.' },
    { symbol: '♑', element: 'Erde', quality: 'Kardinal', ruler: 'Saturn',
      traits: 'Ehrgeiz und Disziplin bringen dich Schritt für Schritt an dein Ziel. Vergiss dabei nicht, auch mal bewusst Pausen zu genießen.' },
    { symbol: '♒', element: 'Luft', quality: 'Fix', ruler: 'Uranus',
      traits: 'Eigenständiges Denken und ein Blick fürs große Ganze zeichnen dich aus. Lass auch Nähe zu, nicht nur Ideen.' },
    { symbol: '♓', element: 'Wasser', quality: 'Veränderlich', ruler: 'Neptun',
      traits: 'Feinfühligkeit und Fantasie verbinden dich mit Menschen und Stimmungen. Achte auf klare Grenzen, damit du dich nicht verlierst.' }
  ];

  const PLANETS_META = [
    { key: 'sonne', name: 'Sonne', symbol: '☉', art: 'die', noun: 'Identität', short: 'deine Identität' },
    { key: 'mond', name: 'Mond', symbol: '☽', art: 'der', noun: 'Gefühlswelt', short: 'deine Gefühlswelt' },
    { key: 'merkur', name: 'Merkur', symbol: '☿', art: 'der', noun: 'Denken', short: 'dein Denken' },
    { key: 'venus', name: 'Venus', symbol: '♀', art: 'die', noun: 'Liebe', short: 'deine Liebe' },
    { key: 'mars', name: 'Mars', symbol: '♂', art: 'der', noun: 'Antrieb', short: 'dein Antrieb' },
    { key: 'jupiter', name: 'Jupiter', symbol: '♃', art: 'der', noun: 'Wachstum', short: 'dein Wachstum' },
    { key: 'saturn', name: 'Saturn', symbol: '♄', art: 'der', noun: 'Verantwortung', short: 'deine Verantwortung' },
    { key: 'uranus', name: 'Uranus', symbol: '♅', art: 'der', noun: 'Freiheitsdrang', short: 'dein Freiheitsdrang' },
    { key: 'neptun', name: 'Neptun', symbol: '♆', art: 'der', noun: 'Intuition', short: 'deine Intuition' },
    { key: 'pluto', name: 'Pluto', symbol: '♇', art: 'der', noun: 'Wandlungskraft', short: 'deine Wandlungskraft' }
  ];

  const ELEMENT_POOLS = {
    Feuer: [
      'Heute hast du die Energie, ein liegen gebliebenes Vorhaben entschlossen anzupacken.',
      'Ein spontaner Impuls bringt frischen Schwung in deinen Tag.',
      'Deine Tatkraft wirkt heute ansteckend auf andere.',
      'Nutze den Tag, um mutig ein Gespräch zu suchen, das du aufgeschoben hast.',
      'Etwas Bewegung tut dir gut und klärt den Kopf.',
      'Vertraue heute deinem ersten Instinkt.'
    ],
    Erde: [
      'Kleine, konkrete Schritte bringen dich heute spürbar voran.',
      'Ein ruhiger Moment mit gutem Essen oder in der Natur tut dir besonders gut.',
      'Ordnung schaffen – im Kalender oder auf dem Schreibtisch – gibt dir heute Halt.',
      'Verlässlichkeit ist heute dein größtes Plus im Umgang mit anderen.',
      'Gönn dir heute bewusst etwas Genuss, ohne schlechtes Gewissen.',
      'Geduld zahlt sich heute besonders aus.'
    ],
    Luft: [
      'Ein gutes Gespräch bringt heute überraschend neue Perspektiven.',
      'Deine Ideen finden heute offene Ohren.',
      'Es lohnt sich, heute etwas Neues zu lesen oder zu lernen.',
      'Sozialer Austausch hebt heute deine Stimmung.',
      'Bring eine Idee heute zu Papier, bevor sie wieder verfliegt.',
      'Flexibilität hilft dir heute, spontan die bessere Option zu wählen.'
    ],
    Wasser: [
      'Deine Intuition liegt heute besonders richtig – vertrau ihr.',
      'Ein ehrliches Gespräch über Gefühle bringt heute Nähe.',
      'Gönn dir heute Zeit für Rückzug und Verarbeitung.',
      'Kreative Ausdrucksformen wie Musik oder Schreiben tun dir heute gut.',
      'Achte heute besonders sensibel auf deine eigenen Grenzen.',
      'Ein Traum oder Bauchgefühl kann dir heute einen Hinweis geben.'
    ]
  };
  const FOCUS_AREAS = ['Liebe & Beziehungen', 'Beruf & Ziele', 'Gesundheit & Energie', 'Kommunikation', 'Finanzen', 'Kreativität & Ausdruck'];

  // Städteliste mit Zeitzone (IANA), damit Sommer-/Winterzeit – auch historisch –
  // automatisch korrekt vorgeschlagen werden kann.
  const CITY_PRESETS = [
    { name: 'Tangstedt', lat: 53.7167, lon: 10.0333, tz: 'Europe/Berlin' },
    { name: 'Norderstedt', lat: 53.7064, lon: 9.9920, tz: 'Europe/Berlin' },
    { name: 'Hamburg', lat: 53.5511, lon: 9.9937, tz: 'Europe/Berlin' },
    { name: 'Berlin', lat: 52.5200, lon: 13.4050, tz: 'Europe/Berlin' },
    { name: 'München', lat: 48.1351, lon: 11.5820, tz: 'Europe/Berlin' },
    { name: 'Köln', lat: 50.9375, lon: 6.9603, tz: 'Europe/Berlin' },
    { name: 'Frankfurt am Main', lat: 50.1109, lon: 8.6821, tz: 'Europe/Berlin' },
    { name: 'Stuttgart', lat: 48.7758, lon: 9.1829, tz: 'Europe/Berlin' },
    { name: 'Düsseldorf', lat: 51.2277, lon: 6.7735, tz: 'Europe/Berlin' },
    { name: 'Dortmund', lat: 51.5136, lon: 7.4653, tz: 'Europe/Berlin' },
    { name: 'Essen', lat: 51.4556, lon: 7.0116, tz: 'Europe/Berlin' },
    { name: 'Leipzig', lat: 51.3397, lon: 12.3731, tz: 'Europe/Berlin' },
    { name: 'Bremen', lat: 53.0793, lon: 8.8017, tz: 'Europe/Berlin' },
    { name: 'Dresden', lat: 51.0504, lon: 13.7373, tz: 'Europe/Berlin' },
    { name: 'Hannover', lat: 52.3759, lon: 9.7320, tz: 'Europe/Berlin' },
    { name: 'Nürnberg', lat: 49.4521, lon: 11.0767, tz: 'Europe/Berlin' },
    { name: 'Kiel', lat: 54.3233, lon: 10.1228, tz: 'Europe/Berlin' },
    { name: 'Lübeck', lat: 53.8655, lon: 10.6866, tz: 'Europe/Berlin' },
    { name: 'Flensburg', lat: 54.7937, lon: 9.4469, tz: 'Europe/Berlin' },
    { name: 'Rostock', lat: 54.0924, lon: 12.0991, tz: 'Europe/Berlin' },
    { name: 'Schwerin', lat: 53.6355, lon: 11.4012, tz: 'Europe/Berlin' },
    { name: 'Oldenburg', lat: 53.1435, lon: 8.2146, tz: 'Europe/Berlin' },
    { name: 'Osnabrück', lat: 52.2799, lon: 8.0472, tz: 'Europe/Berlin' },
    { name: 'Münster', lat: 51.9607, lon: 7.6261, tz: 'Europe/Berlin' },
    { name: 'Bielefeld', lat: 52.0302, lon: 8.5325, tz: 'Europe/Berlin' },
    { name: 'Braunschweig', lat: 52.2689, lon: 10.5268, tz: 'Europe/Berlin' },
    { name: 'Magdeburg', lat: 52.1205, lon: 11.6276, tz: 'Europe/Berlin' },
    { name: 'Potsdam', lat: 52.3906, lon: 13.0645, tz: 'Europe/Berlin' },
    { name: 'Halle (Saale)', lat: 51.4969, lon: 11.9688, tz: 'Europe/Berlin' },
    { name: 'Erfurt', lat: 50.9848, lon: 11.0299, tz: 'Europe/Berlin' },
    { name: 'Chemnitz', lat: 50.8278, lon: 12.9214, tz: 'Europe/Berlin' },
    { name: 'Kassel', lat: 51.3127, lon: 9.4797, tz: 'Europe/Berlin' },
    { name: 'Aachen', lat: 50.7753, lon: 6.0839, tz: 'Europe/Berlin' },
    { name: 'Bonn', lat: 50.7374, lon: 7.0982, tz: 'Europe/Berlin' },
    { name: 'Mainz', lat: 49.9929, lon: 8.2473, tz: 'Europe/Berlin' },
    { name: 'Wiesbaden', lat: 50.0782, lon: 8.2398, tz: 'Europe/Berlin' },
    { name: 'Saarbrücken', lat: 49.2402, lon: 6.9969, tz: 'Europe/Berlin' },
    { name: 'Mannheim', lat: 49.4875, lon: 8.4660, tz: 'Europe/Berlin' },
    { name: 'Karlsruhe', lat: 49.0069, lon: 8.4037, tz: 'Europe/Berlin' },
    { name: 'Freiburg im Breisgau', lat: 47.9990, lon: 7.8421, tz: 'Europe/Berlin' },
    { name: 'Ulm', lat: 48.4011, lon: 9.9876, tz: 'Europe/Berlin' },
    { name: 'Augsburg', lat: 48.3705, lon: 10.8978, tz: 'Europe/Berlin' },
    { name: 'Regensburg', lat: 49.0134, lon: 12.1016, tz: 'Europe/Berlin' },
    { name: 'Würzburg', lat: 49.7913, lon: 9.9534, tz: 'Europe/Berlin' },
    { name: 'Wien', lat: 48.2082, lon: 16.3738, tz: 'Europe/Vienna' },
    { name: 'Graz', lat: 47.0707, lon: 15.4395, tz: 'Europe/Vienna' },
    { name: 'Linz', lat: 48.3069, lon: 14.2858, tz: 'Europe/Vienna' },
    { name: 'Salzburg', lat: 47.8095, lon: 13.0550, tz: 'Europe/Vienna' },
    { name: 'Innsbruck', lat: 47.2692, lon: 11.4041, tz: 'Europe/Vienna' },
    { name: 'Zürich', lat: 47.3769, lon: 8.5417, tz: 'Europe/Zurich' },
    { name: 'Bern', lat: 46.9480, lon: 7.4474, tz: 'Europe/Zurich' },
    { name: 'Basel', lat: 47.5596, lon: 7.5886, tz: 'Europe/Zurich' },
    { name: 'Genf', lat: 46.2044, lon: 6.1432, tz: 'Europe/Zurich' },
    { name: 'Amsterdam', lat: 52.3676, lon: 4.9041, tz: 'Europe/Amsterdam' },
    { name: 'Kopenhagen', lat: 55.6761, lon: 12.5683, tz: 'Europe/Copenhagen' },
    { name: 'Paris', lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris' },
    { name: 'London', lat: 51.5072, lon: -0.1276, tz: 'Europe/London' },
    { name: 'Rom', lat: 41.9028, lon: 12.4964, tz: 'Europe/Rome' },
    { name: 'Madrid', lat: 40.4168, lon: -3.7038, tz: 'Europe/Madrid' },
    { name: 'Warschau', lat: 52.2297, lon: 21.0122, tz: 'Europe/Warsaw' },
    { name: 'Istanbul', lat: 41.0082, lon: 28.9784, tz: 'Europe/Istanbul' },
    { name: 'New York', lat: 40.7128, lon: -74.0060, tz: 'America/New_York' },
    { name: 'Los Angeles', lat: 34.0522, lon: -118.2437, tz: 'America/Los_Angeles' },
    { name: 'Orlando', lat: 28.5384, lon: -81.3789, tz: 'America/New_York' }
  ];
  function findCity(name) {
    const n = String(name || '').trim().toLowerCase();
    if (!n) return null;
    return CITY_PRESETS.find(function (c) { return c.name.toLowerCase() === n; }) || null;
  }
  // Entfernung in km (Großkreis) – für „nächstgelegene Stadt" beim automatischen Standort.
  function distKm(lat1, lon1, lat2, lon2) {
    const r = Math.PI / 180;
    const a = Math.sin((lat2 - lat1) * r / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin((lon2 - lon1) * r / 2) ** 2;
    return 12742 * Math.asin(Math.min(1, Math.sqrt(a)));
  }
  // Liefert einen lesbaren Ortsnamen für Koordinaten – komplett offline aus der eigenen Städteliste.
  function nearestPlaceName(lat, lon) {
    let best = null, bestD = Infinity;
    CITY_PRESETS.forEach(function (c) { const d = distKm(lat, lon, c.lat, c.lon); if (d < bestD) { bestD = d; best = c; } });
    if (best && bestD <= 8) return best.name;
    if (best && bestD <= 60) return 'bei ' + best.name;
    return fmtCoord(lat, 'lat') + ', ' + fmtCoord(lon, 'lon');
  }
  function fmtCoord(v, kind) {
    const dir = kind === 'lat' ? (v >= 0 ? 'N' : 'S') : (v >= 0 ? 'O' : 'W');
    return fmtNum(Math.abs(v), 2) + '° ' + dir;
  }

  const OFFSET_PRESETS = [
    { label: 'MEZ – Winterzeit Deutschland/Österreich/Schweiz (UTC+1)', value: 1 },
    { label: 'MESZ – Sommerzeit Deutschland/Österreich/Schweiz (UTC+2)', value: 2 },
    { label: 'UTC ±0 (London Winterzeit u.a.)', value: 0 }
  ];

  /* Zeitzonen-Versatz (in Stunden) einer IANA-Zeitzone für eine lokale Uhrzeit.
     Nutzt die Zeitzonen-Datenbank des Geräts (Intl) und kennt damit auch historische
     Regeln – z. B. dass die Sommerzeit in Deutschland 1981–1995 schon Ende September
     endete und es 1950–1979 gar keine Sommerzeit gab. */
  function tzOffsetHours(tz, dateStr, timeStr) {
    const d = (dateStr || '').split('-').map(Number);
    if (!d[0] || !d[1] || !d[2]) return null;
    const t = (timeStr || '12:00').split(':').map(Number);
    const wallUTC = Date.UTC(d[0], d[1] - 1, d[2], t[0] || 0, t[1] || 0);
    try {
      const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
      const offsetAt = function (utcMs) {
        const parts = {};
        fmt.formatToParts(new Date(utcMs)).forEach(function (p) { parts[p.type] = p.value; });
        const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, (+parts.hour) % 24, +parts.minute);
        return (asUTC - utcMs) / 3600000;
      };
      let off = offsetAt(wallUTC);
      off = offsetAt(wallUTC - off * 3600000);
      return Math.round(off * 4) / 4;
    } catch (e) {
      return tz === 'Europe/Berlin' ? germanOffsetFallback(dateStr) : null;
    }
  }
  // Rückfall ohne Intl-Zeitzonen: deutsche Regeln seit 1980 (bis 1995 Ende im September).
  function germanOffsetFallback(dateStr) {
    const p = (dateStr || '').split('-').map(Number);
    const year = p[0];
    if (!year || year < 1980) return 1;
    function lastSunday(y, monthIndex) {
      const d = new Date(Date.UTC(y, monthIndex + 1, 0, 1, 0, 0));
      d.setUTCDate(d.getUTCDate() - d.getUTCDay());
      return d;
    }
    const start = year === 1980 ? new Date(Date.UTC(1980, 3, 6, 1)) : lastSunday(year, 2);
    const end = year <= 1995 ? lastSunday(year, 8) : lastSunday(year, 9);
    const check = new Date(Date.UTC(p[0], p[1] - 1, p[2], 12));
    return (check >= start && check < end) ? 2 : 1;
  }
  // Vorschlag für DE/AT/CH ohne bekannten Ort: deutsche Regeln (historisch korrekt).
  function euDefaultOffset(dateStr) {
    if (!dateStr) return 1;
    const off = tzOffsetHours('Europe/Berlin', dateStr, '12:00');
    return off === null ? germanOffsetFallback(dateStr) : off;
  }
  // Versatz der Gerätezeitzone an einem bestimmten Kalendertag (für „Automatisch").
  function deviceOffsetFor(dateStr, timeStr) {
    const p = (dateStr || '').split('-').map(Number);
    const t = (timeStr || '12:00').split(':').map(Number);
    if (!p[0]) return -new Date().getTimezoneOffset() / 60;
    return -new Date(p[0], p[1] - 1, p[2], t[0] || 12, t[1] || 0).getTimezoneOffset() / 60;
  }
  function deviceTzName() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; }
  }
  // Kurzbezeichnung für einen Versatz, z. B. „MESZ" für +2 in Mitteleuropa.
  function offsetShortLabel(off, tz) {
    const central = !tz || /^Europe\/(Berlin|Vienna|Zurich|Amsterdam|Copenhagen|Paris|Rome|Madrid|Warsaw|Oslo|Stockholm|Brussels|Prague|Budapest|Luxembourg)$/.test(tz);
    if (central && off === 1) return 'MEZ';
    if (central && off === 2) return 'MESZ';
    if (central && off === 3) return 'MEHSZ';
    return 'UTC' + (off >= 0 ? '+' : '−') + fmtNum(Math.abs(off), off % 1 ? 1 : 0);
  }
  function buildFullOffsetList() {
    const presetValues = OFFSET_PRESETS.map(function (o) { return o.value; });
    const list = [];
    for (let h = -12; h <= 14; h += 0.5) {
      if (presetValues.indexOf(h) !== -1) continue;
      const sign = h >= 0 ? '+' : '';
      list.push({ label: 'UTC' + sign + h, value: h });
    }
    return list;
  }

  /* ---------------------------------------------------------------
     ASTRO-LEXIKON – Lehrfunktion mit Erklärungen zu Planeten, Zeichen,
     Häusern, Aspekten und Grundbegriffen
     --------------------------------------------------------------- */
  const ASTRO_GLOSSARY = [
    { id: 'planet:sonne', cat: 'planet', symbol: '☉', title: 'Sonne', body: 'Die Sonne zeigt dein Grundwesen, deine Identität und die Kraft, mit der du dich im Leben zeigst. Sie steht für bewusstes Ich, Vitalität und die grundlegende Richtung, in die sich deine Persönlichkeit entwickeln will. Das Sonnenzeichen ist das bekannteste Element der Astrologie – der klassische Zeitungshoroskop-Text bezieht sich fast immer nur auf sie. Ihr Zeichen zeigt, wie sich dein Selbstausdruck färbt, ihr Haus, in welchem Lebensbereich du am meisten strahlen willst.' },
    { id: 'planet:mond', cat: 'planet', symbol: '☽', title: 'Mond', body: 'Der Mond steht für deine Gefühlswelt, deine unbewussten Bedürfnisse und das, was dir emotionale Sicherheit gibt. Während die Sonne zeigt, wer du bewusst sein willst, zeigt der Mond, wie du instinktiv fühlst und reagierst – besonders in vertrauter Umgebung. Er bewegt sich sehr schnell (ca. 13° pro Tag) und wechselt etwa alle zweieinhalb Tage das Zeichen, weshalb seine Position ohne genaue Geburtszeit am schwersten sicher zu bestimmen ist. Sein Zeichen beschreibt deinen emotionalen Grundton, sein Haus den Bereich, in dem du dich am meisten geborgen fühlst.' },
    { id: 'planet:merkur', cat: 'planet', symbol: '☿', title: 'Merkur', body: 'Merkur regiert Denken, Sprache und den Austausch von Informationen. Er zeigt, wie du Dinge verstehst, wie du kommunizierst und wie dein Verstand mit neuen Eindrücken umgeht. Da Merkur sich nie weit von der Sonne entfernt, steht er meist im gleichen oder einem benachbarten Zeichen. Sein Zeichen prägt deinen Denk- und Sprachstil, sein Haus den Bereich, in dem du am meisten kommunizierst oder lernst.' },
    { id: 'planet:venus', cat: 'planet', symbol: '♀', title: 'Venus', body: 'Venus steht für Liebe, Beziehung, Ästhetik und die Dinge, die du als wertvoll empfindest. Sie zeigt, wie du Zuneigung ausdrückst und empfängst und wonach du dich in Partnerschaften sehnst. Auch Geldwerte und Genuss fallen in ihren Bereich. Ihr Zeichen beschreibt deinen Beziehungs- und Geschmacksstil, ihr Haus den Bereich, in dem dir Harmonie besonders wichtig ist.' },
    { id: 'planet:mars', cat: 'planet', symbol: '♂', title: 'Mars', body: 'Mars ist der Planet des Antriebs, der Durchsetzungskraft und des Handelns. Er zeigt, wie du Ziele verfolgst, wie du kämpfst oder dich abgrenzt und wo deine Energie und dein Mut liegen. Er steht auch für Wut, Leidenschaft und körperliche Aktivität. Sein Zeichen prägt deinen Handlungsstil, sein Haus den Bereich, in dem du am aktivsten bist.' },
    { id: 'planet:jupiter', cat: 'planet', symbol: '♃', title: 'Jupiter', body: 'Jupiter steht für Wachstum, Optimismus, Sinnsuche und Expansion. Er zeigt, wo du über dich hinauswächst und wo dir Chancen zufallen. Er braucht etwa zwölf Jahre für einen vollen Tierkreisumlauf und bleibt daher rund ein Jahr in jedem Zeichen. Sein Zeichen zeigt, worin du optimistisch bist, sein Haus, in welchem Bereich sich Wachstum am ehesten zeigt.' },
    { id: 'planet:saturn', cat: 'planet', symbol: '♄', title: 'Saturn', body: 'Saturn steht für Struktur, Verantwortung, Disziplin und Lektionen, die durch Zeit und Ausdauer gelernt werden. Er zeigt, wo du dich anstrengen musst – und wo du langfristig echte Meisterschaft aufbauen kannst. Saturn braucht etwa 29 Jahre für einen Umlauf; die „Saturn-Rückkehr" um das 29. Lebensjahr gilt astrologisch als Reifephase. Sein Zeichen zeigt deinen Umgang mit Verantwortung, sein Haus den Bereich, in dem du am meisten gefordert wirst.' },
    { id: 'planet:uranus', cat: 'planet', symbol: '♅', title: 'Uranus', body: 'Uranus steht für Wandel, Freiheit, Originalität und plötzliche Umbrüche. Er zeigt, wo du dich von Konventionen lösen willst. Da er rund 84 Jahre für einen Umlauf braucht, bleibt er etwa sieben Jahre in einem Zeichen und prägt damit ganze Generationen ähnlich – sein Haus ist daher aussagekräftiger als sein Zeichen. Das Haus zeigt, in welchem Lebensbereich bei dir persönlich Freiheit und Wandel besonders wichtig sind.' },
    { id: 'planet:neptun', cat: 'planet', symbol: '♆', title: 'Neptun', body: 'Neptun steht für Intuition, Sehnsucht, Spiritualität und Auflösung von Grenzen – positiv als Mitgefühl und Vision, schwierig als Verwirrung oder Flucht. Mit rund 165 Jahren für einen Umlauf bleibt er etwa 14 Jahre in einem Zeichen und wirkt damit stark generationsprägend. Sein Haus zeigt, in welchem Lebensbereich du besonders empfänglich oder verträumt bist.' },
    { id: 'planet:pluto', cat: 'planet', symbol: '♇', title: 'Pluto', body: 'Pluto steht für Tiefe, Wandlung und Kräfte, die unter der Oberfläche wirken – Macht, Krisen, aber auch tiefgreifende Erneuerung. Mit etwa 248 Jahren für einen Umlauf bleibt er wegen seiner stark elliptischen Bahn teils elf, teils über zwanzig Jahre in einem Zeichen und ist damit der am stärksten generationsprägende Planet. Sein Haus zeigt, in welchem Lebensbereich bei dir besonders intensive Wandlungsprozesse stattfinden.' },

    { id: 'sign:0', cat: 'sign', symbol: '♈', title: 'Widder', body: 'Widder ist das erste Zeichen des Tierkreises – kardinal, feurig, geprägt von Mut, Tempo und dem Bedürfnis, Neues zu beginnen. Ein Planet in Widder drückt sich direkt, ungeduldig und initiativ aus. Herrscherplanet ist Mars. Die Kehrseite kann Ungeduld oder Impulsivität sein.' },
    { id: 'sign:1', cat: 'sign', symbol: '♉', title: 'Stier', body: 'Stier ist ein fixes Erdzeichen, das für Beständigkeit, Genuss und Sicherheit steht. Ein Planet in Stier drückt sich ruhig, bodenständig und beharrlich aus, oft mit Sinn für Ästhetik und Komfort. Herrscherplanet ist Venus. Die Kehrseite kann Sturheit sein.' },
    { id: 'sign:2', cat: 'sign', symbol: '♊', title: 'Zwillinge', body: 'Zwillinge ist ein veränderliches Luftzeichen, das für Neugier, Kommunikation und geistige Beweglichkeit steht. Ein Planet in Zwillinge drückt sich vielseitig, wortgewandt und wissbegierig aus. Herrscherplanet ist Merkur. Die Kehrseite kann Oberflächlichkeit sein.' },
    { id: 'sign:3', cat: 'sign', symbol: '♋', title: 'Krebs', body: 'Krebs ist ein kardinales Wasserzeichen, das für Gefühl, Fürsorge und Zugehörigkeit steht. Ein Planet in Krebs drückt sich sensibel, beschützend und stimmungsabhängig aus, oft mit starkem Familienbezug. Herrscherplanet ist der Mond. Die Kehrseite kann Rückzug sein.' },
    { id: 'sign:4', cat: 'sign', symbol: '♌', title: 'Löwe', body: 'Löwe ist ein fixes Feuerzeichen, das für Selbstausdruck, Herzlichkeit und Anerkennung steht. Ein Planet in Löwe drückt sich warmherzig, kreativ und selbstbewusst aus. Herrscherplanet ist die Sonne. Die Kehrseite kann übertriebenes Geltungsbedürfnis sein.' },
    { id: 'sign:5', cat: 'sign', symbol: '♍', title: 'Jungfrau', body: 'Jungfrau ist ein veränderliches Erdzeichen, das für Analyse, Dienst und Verbesserung steht. Ein Planet in Jungfrau drückt sich genau, pflichtbewusst und detailorientiert aus. Herrscherplanet ist Merkur. Die Kehrseite kann Perfektionismus sein.' },
    { id: 'sign:6', cat: 'sign', symbol: '♎', title: 'Waage', body: 'Waage ist ein kardinales Luftzeichen, das für Ausgleich, Beziehung und Ästhetik steht. Ein Planet in Waage drückt sich diplomatisch und beziehungsorientiert aus. Herrscherplanet ist Venus. Die Kehrseite kann Unentschlossenheit sein.' },
    { id: 'sign:7', cat: 'sign', symbol: '♏', title: 'Skorpion', body: 'Skorpion ist ein fixes Wasserzeichen, das für Intensität, Transformation und das Verborgene steht. Ein Planet in Skorpion drückt sich tiefgründig, leidenschaftlich und kompromisslos ehrlich aus. Herrscherplanet ist modern Pluto, klassisch Mars. Die Kehrseite kann Kontrollbedürfnis sein.' },
    { id: 'sign:8', cat: 'sign', symbol: '♐', title: 'Schütze', body: 'Schütze ist ein veränderliches Feuerzeichen, das für Freiheit, Sinnsuche und Optimismus steht. Ein Planet in Schütze drückt sich weitblickend und abenteuerlustig aus. Herrscherplanet ist Jupiter. Die Kehrseite kann Übertreibung sein.' },
    { id: 'sign:9', cat: 'sign', symbol: '♑', title: 'Steinbock', body: 'Steinbock ist ein kardinales Erdzeichen, das für Struktur, Ehrgeiz und Ausdauer steht. Ein Planet in Steinbock drückt sich diszipliniert und zielstrebig aus. Herrscherplanet ist Saturn. Die Kehrseite kann übermäßige Strenge sein.' },
    { id: 'sign:10', cat: 'sign', symbol: '♒', title: 'Wassermann', body: 'Wassermann ist ein fixes Luftzeichen, das für Eigenständigkeit, Gemeinschaft und Innovation steht. Ein Planet in Wassermann drückt sich unabhängig und ideenreich aus. Herrscherplanet ist modern Uranus, klassisch Saturn. Die Kehrseite kann Distanziertheit sein.' },
    { id: 'sign:11', cat: 'sign', symbol: '♓', title: 'Fische', body: 'Fische ist ein veränderliches Wasserzeichen, das für Mitgefühl, Intuition und Auflösung von Grenzen steht. Ein Planet in Fische drückt sich feinfühlig und fantasievoll aus. Herrscherplanet ist modern Neptun, klassisch Jupiter. Die Kehrseite kann Wirklichkeitsflucht sein.' },

    { id: 'house:1', cat: 'house', symbol: '1', title: '1. Haus', body: 'Das 1. Haus zeigt dein Auftreten, deinen ersten Eindruck auf andere und wie du grundsätzlich ins Leben gehst. Es beginnt exakt beim Aszendenten.' },
    { id: 'house:2', cat: 'house', symbol: '2', title: '2. Haus', body: 'Das 2. Haus steht für materielle Sicherheit, Besitz, Einkommen und deinen Selbstwert – was dir wirklich etwas „wert" ist.' },
    { id: 'house:3', cat: 'house', symbol: '3', title: '3. Haus', body: 'Das 3. Haus betrifft Kommunikation, Nahbereich (Geschwister, Nachbarschaft), Alltagsdenken und kurze Wege oder Lernen.' },
    { id: 'house:4', cat: 'house', symbol: '4', title: '4. Haus', body: 'Das 4. Haus steht für Zuhause, Familie, Wurzeln und dein inneres Fundament – das gefühlte „Zuhause" in dir.' },
    { id: 'house:5', cat: 'house', symbol: '5', title: '5. Haus', body: 'Das 5. Haus betrifft Kreativität, Selbstausdruck, Romantik, Spiel und – klassisch – Kinder.' },
    { id: 'house:6', cat: 'house', symbol: '6', title: '6. Haus', body: 'Das 6. Haus steht für Alltag, Arbeit, Gesundheit und Routinen – wie du dich um dich selbst und deine Aufgaben kümmerst.' },
    { id: 'house:7', cat: 'house', symbol: '7', title: '7. Haus', body: 'Das 7. Haus betrifft Partnerschaft auf Augenhöhe – feste Beziehungen, aber auch offene Gegner oder Verträge. Es beginnt exakt gegenüber dem Aszendenten.' },
    { id: 'house:8', cat: 'house', symbol: '8', title: '8. Haus', body: 'Das 8. Haus steht für Transformation, Intimität, gemeinsame Ressourcen und alles, was unter die Oberfläche geht – von tiefer Bindung bis zu Krisen und Neuanfängen.' },
    { id: 'house:9', cat: 'house', symbol: '9', title: '9. Haus', body: 'Das 9. Haus betrifft Weltanschauung, Studium, Reisen und den großen Sinnhorizont – alles, was deinen Blick weitet.' },
    { id: 'house:10', cat: 'house', symbol: '10', title: '10. Haus', body: 'Das 10. Haus steht für Berufung, Status und öffentliches Ansehen – wofür du in der Welt stehst. Es beginnt beim Medium Coeli.' },
    { id: 'house:11', cat: 'house', symbol: '11', title: '11. Haus', body: 'Das 11. Haus betrifft Freundschaften, Netzwerke, Gruppen und Zukunftsvisionen – dein Wirken über den eigenen Kreis hinaus.' },
    { id: 'house:12', cat: 'house', symbol: '12', title: '12. Haus', body: 'Das 12. Haus steht für das Unbewusste, Rückzug, Spiritualität und Loslassen – Themen, die oft im Verborgenen wirken, bevor sie bewusst werden.' },

    { id: 'aspect:Konjunktion', cat: 'aspect', symbol: '☌', title: 'Konjunktion (0°)', body: 'Bei einer Konjunktion stehen zwei Planeten nahezu am gleichen Punkt. Ihre Energien verschmelzen und wirken wie eine Einheit – je nach beteiligten Planeten kann das enorm verstärkend oder auch innerlich widersprüchlich sein, da beide Themen gleichzeitig „laut" sind.' },
    { id: 'aspect:Sextil', cat: 'aspect', symbol: '⚹', title: 'Sextil (60°)', body: 'Beim Sextil unterstützen sich zwei Planeten sanft und harmonisch. Es öffnet Chancen und Talente, die aber – anders als beim Trigon – meist aktiv genutzt werden müssen, um sich zu zeigen.' },
    { id: 'aspect:Quadrat', cat: 'aspect', symbol: '□', title: 'Quadrat (90°)', body: 'Beim Quadrat stehen zwei Planeten in innerer Spannung zueinander. Das erzeugt Reibung und Herausforderung, ist aber oft der stärkste Antrieb für Wachstum, weil es zum Handeln zwingt.' },
    { id: 'aspect:Trigon', cat: 'aspect', symbol: '△', title: 'Trigon (120°)', body: 'Beim Trigon fließen zwei Planeten mühelos zusammen. Es zeigt natürliche Begabung und Leichtigkeit – die Kehrseite kann sein, dass dieses Potenzial nie bewusst gefördert wird, weil es sich „von selbst" anfühlt.' },
    { id: 'aspect:Opposition', cat: 'aspect', symbol: '☍', title: 'Opposition (180°)', body: 'Bei der Opposition stehen sich zwei Planeten exakt gegenüber. Sie zeigt ein Spannungsfeld zweier Pole, die einen bewussten Ausgleich suchen – oft erlebt man dieses Thema zuerst im Außen, etwa in einer anderen Person, bevor die eigene Beteiligung erkennbar wird.' },

    { id: 'element:Feuer', cat: 'element', symbol: '🔥', title: 'Element Feuer', body: 'Feuerzeichen (Widder, Löwe, Schütze) stehen für Tatkraft, Spontaneität und Begeisterung. Sie handeln aus Instinkt und Inspiration heraus.' },
    { id: 'element:Erde', cat: 'element', symbol: '🌍', title: 'Element Erde', body: 'Erdzeichen (Stier, Jungfrau, Steinbock) stehen für Bodenständigkeit, Praxis und Beständigkeit. Sie handeln aus konkreter, greifbarer Erfahrung heraus.' },
    { id: 'element:Luft', cat: 'element', symbol: '💨', title: 'Element Luft', body: 'Luftzeichen (Zwillinge, Waage, Wassermann) stehen für Denken, Austausch und Ideen. Sie handeln aus gedanklicher Distanz und sozialem Kontext heraus.' },
    { id: 'element:Wasser', cat: 'element', symbol: '💧', title: 'Element Wasser', body: 'Wasserzeichen (Krebs, Skorpion, Fische) stehen für Gefühl, Intuition und Tiefe. Sie handeln aus emotionaler Resonanz heraus.' },

    { id: 'quality:Kardinal', cat: 'quality', symbol: '◆', title: 'Qualität Kardinal', body: 'Kardinale Zeichen (Widder, Krebs, Waage, Steinbock) markieren den Beginn einer Jahreszeit und stehen für Initiative – sie starten gerne Neues.' },
    { id: 'quality:Fix', cat: 'quality', symbol: '◆', title: 'Qualität Fix', body: 'Fixe Zeichen (Stier, Löwe, Skorpion, Wassermann) stehen mitten in einer Jahreszeit und für Beständigkeit – sie halten durch und vertiefen.' },
    { id: 'quality:Veränderlich', cat: 'quality', symbol: '◆', title: 'Qualität Veränderlich', body: 'Veränderliche Zeichen (Zwillinge, Jungfrau, Schütze, Fische) beschließen eine Jahreszeit und stehen für Anpassung – sie bereiten den Übergang vor.' },

    { id: 'general:aszendent', cat: 'general', symbol: '✦', title: 'Aszendent', body: 'Der Aszendent ist der Tierkreispunkt, der zum Zeitpunkt deiner Geburt gerade im Osten aufging. Er zeigt dein spontanes Auftreten und markiert zugleich den Beginn des 1. Hauses. Anders als das Sonnenzeichen wechselt er sehr schnell – etwa alle zwei Stunden –, weshalb eine genaue Geburtszeit für seine Berechnung unverzichtbar ist.' },
    { id: 'general:mc', cat: 'general', symbol: '✦', title: 'Medium Coeli (MC)', body: 'Das Medium Coeli („Himmelsmitte") ist der höchste Punkt der Ekliptik zum Geburtszeitpunkt und markiert den Beginn des 10. Hauses. Es steht für Berufung, öffentliches Ansehen und die Richtung, in die du dich in der Welt entwickeln willst.' },
    { id: 'general:radix', cat: 'general', symbol: '✦', title: 'Radix / Geburtshoroskop', body: 'Radix (lat. „Wurzel") ist der Fachbegriff für dein Geburtshoroskop – die Momentaufnahme des Himmels zum Zeitpunkt und Ort deiner Geburt. Es gilt als lebenslange Grundstruktur, auf die sich weitere Techniken wie Transite beziehen.' },
    { id: 'general:transit', cat: 'general', symbol: '✦', title: 'Transit', body: 'Ein Transit ist die aktuelle Position eines Planeten am Himmel im Vergleich zu deinem Geburtshoroskop. Bildet ein aktuell wandernder Planet einen Aspekt zu einem deiner Geburtsplaneten, gilt dieses Thema für die Dauer des Transits als besonders aktiviert.' },
    { id: 'general:synastrie', cat: 'general', symbol: '✦', title: 'Synastrie', body: 'Synastrie ist der Vergleich zweier Geburtshoroskope, um die astrologische Dynamik zwischen zwei Menschen zu betrachten – etwa wo sich Planeten harmonisch ergänzen oder spannungsreich berühren.' },
    { id: 'general:orb', cat: 'general', symbol: '✦', title: 'Orb', body: 'Der Orb ist die erlaubte Abweichung vom exakten Aspektwinkel, innerhalb derer ein Aspekt noch als wirksam gilt. Ein engerer Orb (kleinere Abweichung) gilt astrologisch meist als stärker wirksam als ein weiter.' },
    { id: 'general:haussystem', cat: 'general', symbol: '✦', title: 'Häusersystem', body: 'Ein Häusersystem legt fest, wie der Tierkreis in die 12 Häuser eingeteilt wird. AstroWahr nutzt das gleichweite System (Equal House), bei dem jedes Haus exakt 30° ab dem Aszendenten umfasst – einfach nachvollziehbar und robust, auch wenn andere Systeme wie Placidus unterschiedlich breite Häuser berechnen.' },
    { id: 'general:sternzeichen', cat: 'general', symbol: '✦', title: 'Sternzeichen vs. Aszendent', body: 'Das „Sternzeichen" aus Zeitungshoroskopen ist eigentlich nur dein Sonnenzeichen – einer von vielen Faktoren im Chart. Der Aszendent gilt oft als ebenso prägend fürs Auftreten, braucht aber eine genaue Geburtszeit. Ein vollständiges Geburtshoroskop mit allen Planeten, Häusern und Aspekten liefert ein deutlich differenzierteres Bild als das Sonnenzeichen allein.' },
    { id: 'general:tarot', cat: 'general', symbol: '✦', title: 'Was ist Tarot?', body: 'Tarot ist ein 78-Karten-Deck aus 22 Trümpfen (Große Arkana, für große Lebensthemen) und 56 Farbkarten (Kleine Arkana, für Alltagsthemen), das als Reflexionswerkzeug genutzt wird. Beim Legen wählst du bewusst oder zufällig Karten zu einer Frage und deutest sie als Denkanstoß – nicht als feststehende Vorhersage.' },
    { id: 'general:arkana', cat: 'general', symbol: '✦', title: 'Große vs. Kleine Arkana', body: 'Die 22 Karten der Großen Arkana (Trümpfe wie „Der Narr" oder „Der Tod") stehen für große, archetypische Lebensthemen und Entwicklungsschritte. Die 56 Karten der Kleinen Arkana sind in vier Farben zu je 14 Karten unterteilt (Stäbe/Feuer, Kelche/Wasser, Schwerter/Luft, Münzen/Erde) und beschreiben konkretere Alltagssituationen im jeweiligen Lebensbereich.' },
    { id: 'general:umgekehrt', cat: 'general', symbol: '✦', title: 'Umgekehrte Karten', body: 'Eine umgekehrt gezogene Tarotkarte wird oft als Blockade, Innenschau oder abgeschwächte/verzerrte Form der aufrechten Bedeutung gedeutet – z. B. als Warnsignal oder als Aufforderung, ein Thema erst innerlich zu klären, bevor es sich nach außen zeigt.' }
  ];
  function glossaryEntry(id) { return ASTRO_GLOSSARY.find(function (g) { return g.id === id; }); }

  /* ---------------------------------------------------------------
     WELTRAUMKUNDE – Sterne, Universum, Sonnensystem-Vertiefung,
     Raumfahrt. Eigenständig formulierte Fakten, keine Bildinhalte.
     --------------------------------------------------------------- */
  const SPACE_GLOSSARY = [
    { id: 'star:was-ist-ein-stern', cat: 'star', symbol: '⭐', title: 'Was ist ein Stern?', body: 'Ein Stern ist eine riesige, selbstleuchtende Kugel aus Plasma, in deren Kern durch Kernfusion Wasserstoff zu Helium verschmilzt. Die dabei freiwerdende Energie erzeugt einen Strahlungsdruck, der die eigene Schwerkraft des Sterns ausgleicht – ein Stern befindet sich sein Leben lang im Gleichgewicht zwischen Gravitation (nach innen) und Fusionsdruck (nach außen). Unsere Sonne ist ein ganz gewöhnlicher Stern mittlerer Größe.' },
    { id: 'star:entstehung', cat: 'star', symbol: '🌫️', title: 'Sternentstehung', body: 'Sterne entstehen in riesigen Gas- und Staubwolken (Nebeln), wenn Bereiche höherer Dichte unter ihrer eigenen Schwerkraft kollabieren. Dabei erhitzt sich der entstehende Kern (Protostern) immer weiter, bis im Zentrum Temperaturen erreicht werden, bei denen die Kernfusion zündet – damit ist ein neuer Stern „geboren". Der Prozess dauert je nach Sternmasse einige hunderttausend bis mehrere Millionen Jahre.' },
    { id: 'star:hauptreihe', cat: 'star', symbol: '☀️', title: 'Hauptreihenstern', body: 'Den größten Teil seines Lebens verbringt ein Stern als „Hauptreihenstern" – in dieser stabilen Phase fusioniert er kontinuierlich Wasserstoff zu Helium. Unsere Sonne befindet sich seit etwa 4,6 Milliarden Jahren in diesem Stadium und wird darin voraussichtlich noch etwa 5 Milliarden weitere Jahre bleiben.' },
    { id: 'star:roter-riese', cat: 'star', symbol: '🔴', title: 'Roter Riese', body: 'Geht dem Kern eines sonnenähnlichen Sterns der Wasserstoff aus, beginnt die Fusion in einer Hülle um den Kern, während sich der Stern stark aufbläht und abkühlt – er wird zu einem Roten Riesen, oft hundertfach größer als zuvor. Unsere Sonne wird in dieser Phase vermutlich bis zur Erdbahn anschwellen.' },
    { id: 'star:weisser-zwerg', cat: 'star', symbol: '⚪', title: 'Weißer Zwerg', body: 'Kann ein Stern wie unsere Sonne am Ende seines Lebens keine Fusion mehr aufrechterhalten, stößt er seine äußeren Hüllen ab und übrig bleibt ein extrem dichter, erdgroßer Kern aus entartetem Material – ein Weißer Zwerg. Er kühlt über Milliarden Jahre langsam aus, ohne weitere Energie zu erzeugen.' },
    { id: 'star:supernova', cat: 'star', symbol: '💥', title: 'Supernova', body: 'Sehr massereiche Sterne (mehr als etwa das Achtfache der Sonnenmasse) enden nicht als Weißer Zwerg, sondern kollabieren nach dem Ende der Fusion schlagartig und explodieren als Supernova – eine der energiereichsten Explosionen im Universum, die für kurze Zeit heller strahlen kann als eine ganze Galaxie.' },
    { id: 'star:neutronenstern', cat: 'star', symbol: '🌟', title: 'Neutronenstern', body: 'Übersteht der Kern eines explodierten massereichen Sterns die Supernova, kann daraus ein Neutronenstern entstehen: ein nur etwa 20 Kilometer großer, aber so dichter Körper, dass ein Teelöffel seiner Materie mehrere Milliarden Tonnen wiegen würde. Rotierende Neutronensterne, die man als Radiopulse registriert, heißen Pulsare.' },
    { id: 'star:schwarzes-loch', cat: 'star', symbol: '🕳️', title: 'Schwarzes Loch (stellar)', body: 'Ist der kollabierende Kern eines sehr massereichen Sterns noch schwerer als bei einem Neutronenstern, hält keine bekannte Kraft der weiteren Kontraktion stand – es entsteht ein Schwarzes Loch, dessen Schwerkraft so stark ist, dass innerhalb eines bestimmten Radius (Ereignishorizont) nicht einmal Licht entkommen kann.' },
    { id: 'star:spektralklassen', cat: 'star', symbol: '🌈', title: 'Spektralklassen', body: 'Sterne werden anhand ihrer Oberflächentemperatur und Farbe in die Spektralklassen O, B, A, F, G, K, M eingeteilt (heißeste bis kühlste). O-Sterne sind blau-weiß und extrem heiß, M-Sterne rötlich und vergleichsweise kühl. Unsere Sonne gehört mit rund 5.500 °C Oberflächentemperatur zur Klasse G.' },
    { id: 'star:doppelsterne', cat: 'star', symbol: '✨', title: 'Doppel- und Mehrfachsterne', body: 'Mehr als die Hälfte aller Sterne existiert nicht allein, sondern in Doppel- oder Mehrfachsystemen, die sich gegenseitig umkreisen. Unsere Sonne ist damit eher untypisch als Einzelstern unterwegs.' },
    { id: 'star:bekannte-sterne', cat: 'star', symbol: '💫', title: 'Bekannte Sterne', body: 'Sirius im Sternbild Großer Hund ist der hellste Stern am Nachthimmel. Der Polarstern (Polaris) steht nahe am Nordhimmelspol und dient seit jeher zur Orientierung. Beteigeuze im Orion ist ein Roter Überriese, der irgendwann als Supernova enden wird – wann genau, ist unbekannt. Proxima Centauri ist mit rund 4,2 Lichtjahren der sonnennächste bekannte Stern.' },

    { id: 'universe:urknall', cat: 'universe', symbol: '💫', title: 'Urknall', body: 'Nach dem heutigen Stand der Kosmologie begann das Universum vor rund 13,8 Milliarden Jahren mit dem Urknall – einem extrem heißen, dichten Zustand, aus dem sich Raum, Zeit und Materie ausdehnten und abkühlten. Der Urknall war keine Explosion in einem bereits vorhandenen Raum, sondern die Ausdehnung des Raumes selbst.' },
    { id: 'universe:expansion', cat: 'universe', symbol: '↔️', title: 'Expansion des Universums', body: 'Das Universum dehnt sich fortlaufend aus – entfernte Galaxien bewegen sich im Mittel von uns weg, und zwar umso schneller, je weiter sie entfernt sind (Hubble-Gesetz). Diese Expansion wurde in den 1920er-Jahren durch Edwin Hubbles Beobachtungen entdeckt und gilt als eine der zentralen Grundlagen der modernen Kosmologie.' },
    { id: 'universe:galaxie', cat: 'universe', symbol: '🌌', title: 'Galaxie', body: 'Eine Galaxie ist ein durch Schwerkraft gebundenes System aus Milliarden bis Billionen Sternen, dazu Gas, Staub und Dunkler Materie. Das beobachtbare Universum enthält schätzungsweise hunderte Milliarden Galaxien.' },
    { id: 'universe:milchstrasse', cat: 'universe', symbol: '🌠', title: 'Milchstraße', body: 'Unsere Heimatgalaxie, die Milchstraße, ist eine Balkenspiralgalaxie mit schätzungsweise 100 bis 400 Milliarden Sternen. Unser Sonnensystem liegt in einem der äußeren Spiralarme, etwa 26.000 Lichtjahre vom Zentrum entfernt, um das die Sonne rund alle 230 Millionen Jahre einmal kreist.' },
    { id: 'universe:andromeda', cat: 'universe', symbol: '🌀', title: 'Andromeda-Galaxie', body: 'Die Andromeda-Galaxie ist mit rund 2,5 Millionen Lichtjahren Entfernung die nächste große Nachbargalaxie der Milchstraße und mit bloßem Auge als schwacher Fleck sichtbar. Beide Galaxien nähern sich einander an und könnten in mehreren Milliarden Jahren verschmelzen.' },
    { id: 'universe:galaxientypen', cat: 'universe', symbol: '🔄', title: 'Galaxientypen', body: 'Galaxien werden grob in Spiralgalaxien (mit Armen wie die Milchstraße), elliptische Galaxien (kugel- bis eiförmig, ohne Spiralstruktur) und irreguläre Galaxien (ohne klare Form, oft nach Kollisionen) unterteilt.' },
    { id: 'universe:dunkle-materie', cat: 'universe', symbol: '⚫', title: 'Dunkle Materie', body: 'Dunkle Materie ist eine bisher nicht direkt nachgewiesene Form von Materie, deren Existenz aus ihrer Schwerkraftwirkung geschlossen wird – etwa daraus, dass sich Galaxien schneller drehen, als es die sichtbare Materie allein erklären könnte. Sie macht schätzungsweise rund 27 % des Universums aus, sichtbare Materie dagegen nur etwa 5 %.' },
    { id: 'universe:dunkle-energie', cat: 'universe', symbol: '🌑', title: 'Dunkle Energie', body: 'Dunkle Energie ist der Platzhalter-Begriff für das, was die beschleunigte Expansion des Universums antreibt. Sie macht nach aktuellem Verständnis den größten Anteil (rund 68 %) des gesamten Energieinhalts des Universums aus, ihre genaue Natur ist aber noch ungeklärt.' },
    { id: 'universe:lichtjahr', cat: 'universe', symbol: '📏', title: 'Lichtjahr & kosmische Entfernungen', body: 'Ein Lichtjahr ist die Strecke, die Licht in einem Jahr zurücklegt – rund 9,46 Billionen Kilometer. Es ist ein Entfernungsmaß, keine Zeitangabe. Da Licht eine endliche Geschwindigkeit hat, sehen wir entfernte Objekte immer so, wie sie in der Vergangenheit aussahen: Das Licht der Sonne ist rund 8 Minuten zu uns unterwegs, das der Andromeda-Galaxie rund 2,5 Millionen Jahre.' },
    { id: 'universe:hintergrundstrahlung', cat: 'universe', symbol: '📡', title: 'Kosmische Hintergrundstrahlung', body: 'Die kosmische Hintergrundstrahlung ist ein schwaches Mikrowellen-„Nachglühen" des heißen, jungen Universums, etwa 380.000 Jahre nach dem Urknall entstanden, als das Universum erstmals durchsichtig wurde. Sie ist heute aus fast jeder Richtung des Himmels messbar und gilt als eine der wichtigsten Bestätigungen der Urknalltheorie.' },

    { id: 'solar:zwergplaneten', cat: 'solar', symbol: '🪐', title: 'Zwergplaneten', body: 'Ein Zwergplanet umkreist die Sonne und ist durch seine eigene Schwerkraft näherungsweise rund geformt, hat aber – anders als ein „echter" Planet – seine Umlaufbahn nicht von anderen größeren Körpern freigeräumt. Neben Pluto zählen Ceres (im Asteroidengürtel), sowie Eris, Makemake und Haumea (alle jenseits von Neptun) zu den offiziell anerkannten Zwergplaneten.' },
    { id: 'solar:asteroidenguertel', cat: 'solar', symbol: '☄️', title: 'Asteroidengürtel', body: 'Zwischen den Bahnen von Mars und Jupiter befindet sich der Asteroidengürtel, eine Zone mit Millionen Gesteinsbrocken unterschiedlichster Größe – Überreste aus der Frühzeit des Sonnensystems, die sich wegen Jupiters Schwerkraft nie zu einem Planeten formen konnten. Der größte Körper darin ist der Zwergplanet Ceres.' },
    { id: 'solar:kuiperguertel', cat: 'solar', symbol: '🧊', title: 'Kuipergürtel', body: 'Jenseits der Neptunbahn liegt der Kuipergürtel, eine Zone mit unzähligen eisigen Kleinkörpern – darunter Pluto, Eris und Makemake. Er gilt als Ursprungsort vieler kurzperiodischer Kometen.' },
    { id: 'solar:kometen', cat: 'solar', symbol: '☄️', title: 'Kometen', body: 'Kometen sind kleine, eisig-staubige Körper, die auf oft stark elliptischen Bahnen die Sonne umkreisen. Nähern sie sich der Sonne, verdampft Eis von ihrer Oberfläche und bildet die charakteristische Koma und den Schweif, der immer von der Sonne weg zeigt.' },
    { id: 'solar:grosse-monde', cat: 'solar', symbol: '🌕', title: 'Große Monde des Sonnensystems', body: 'Titan (Saturn) ist der einzige Mond mit einer dichten Atmosphäre und flüssigen Methan-Seen auf seiner Oberfläche. Europa und Ganymed (beide Jupiter) verbergen vermutlich flüssige Wasserozeane unter ihrer Eiskruste – Europa gilt als einer der aussichtsreichsten Orte für mögliches außerirdisches Leben im Sonnensystem. Io (Jupiter) ist wegen extremer Gezeitenkräfte der vulkanisch aktivste Körper im Sonnensystem. Enceladus (Saturn) schleudert Eisfontänen aus einem unterirdischen Ozean ins All.' },
    { id: 'solar:oortsche-wolke', cat: 'solar', symbol: '🌫️', title: 'Oortsche Wolke', body: 'Die Oortsche Wolke ist eine hypothetische, kugelförmige Ansammlung eisiger Kleinkörper, die das Sonnensystem in großer Entfernung umgibt und als Ursprung langperiodischer Kometen gilt. Sie wurde bisher nicht direkt beobachtet, sondern aus der Umlaufbahn solcher Kometen erschlossen.' },

    { id: 'space:rakete', cat: 'space', symbol: '🚀', title: 'Wie funktioniert eine Rakete?', body: 'Eine Rakete fliegt nach dem Rückstoßprinzip: Verbranntes Treibstoffgas wird mit hoher Geschwindigkeit nach hinten ausgestoßen, wodurch die Rakete nach vorne beschleunigt wird – anders als ein Flugzeug braucht sie dafür keine umgebende Luft und funktioniert auch im Vakuum des Weltraums.' },
    { id: 'space:traegerrakete', cat: 'space', symbol: '🛰️', title: 'Trägerrakete & Nutzlast', body: 'Eine Trägerrakete transportiert ihre eigentliche Fracht – die Nutzlast, etwa einen Satelliten oder eine Raumkapsel – in den Weltraum. Meist besteht sie aus mehreren Stufen, die nacheinander ausgebrannten Treibstoff und ihr eigenes Gewicht abwerfen, um die verbleibende Rakete leichter und effizienter zu machen.' },
    { id: 'space:erdumlaufbahn', cat: 'space', symbol: '🌍', title: 'Erdumlaufbahnen', body: 'Der niedrige Erdorbit (LEO, bis etwa 2.000 km Höhe) beherbergt unter anderem die ISS und die meisten Erdbeobachtungssatelliten. Der geostationäre Orbit (GEO, rund 35.786 km Höhe) lässt einen Satelliten exakt mit der Erdrotation mitlaufen, sodass er scheinbar über einem festen Punkt am Himmel „stehen" bleibt – ideal für Kommunikations- und Wettersatelliten.' },
    { id: 'space:sputnik', cat: 'space', symbol: '📡', title: 'Sputnik 1', body: 'Am 4. Oktober 1957 startete die Sowjetunion mit Sputnik 1 den ersten künstlichen Erdsatelliten der Geschichte und leitete damit das Weltraumzeitalter ein. Der etwa fußballgroße Satellit sendete rund drei Wochen lang Funksignale, bevor seine Batterien erschöpft waren.' },
    { id: 'space:gagarin', cat: 'space', symbol: '👨‍🚀', title: 'Juri Gagarin & Wostok 1', body: 'Am 12. April 1961 wurde der sowjetische Kosmonaut Juri Gagarin mit Wostok 1 der erste Mensch im Weltraum. Sein Flug umrundete die Erde einmal und dauerte etwa 108 Minuten.' },
    { id: 'space:apollo11', cat: 'space', symbol: '🌕', title: 'Apollo 11 & die Mondlandung', body: 'Am 20. Juli 1969 betraten mit Neil Armstrong und Buzz Aldrin erstmals Menschen die Mondoberfläche, während Michael Collins im Kommandomodul in der Mondumlaufbahn wartete. Es war der Höhepunkt des US-amerikanischen Apollo-Programms und bislang die einzige bemannte Mission, die je einen anderen Himmelskörper erreicht hat.' },
    { id: 'space:spaceshuttle', cat: 'space', symbol: '🛸', title: 'Space Shuttle', body: 'Das US-amerikanische Space-Shuttle-Programm (1981–2011) setzte erstmals teilweise wiederverwendbare Raumfähren ein, die wie ein Flugzeug landen konnten. Über 30 Jahre flogen die Shuttles unter anderem Bauteile der ISS und das Hubble-Weltraumteleskop ins All.' },
    { id: 'space:iss', cat: 'space', symbol: '🛰️', title: 'Internationale Raumstation (ISS)', body: 'Die ISS ist ein gemeinsames Projekt mehrerer Raumfahrtagenturen und wird seit November 2000 ununterbrochen von wechselnden Besatzungen bewohnt. Sie umkreist die Erde in rund 400 km Höhe etwa alle 90 Minuten einmal und dient vor allem der Forschung unter Schwerelosigkeit.' },
    { id: 'space:sonden', cat: 'space', symbol: '🔭', title: 'Raumsonden', body: 'Unbemannte Raumsonden erkunden das Sonnensystem, ohne dass Menschen an Bord sind. Die Voyager-Sonden (Start 1977) verließen als erste menschengemachte Objekte das Sonnensystem in Richtung interstellarem Raum. New Horizons flog 2015 als erste Sonde am Pluto vorbei.' },
    { id: 'space:bemannt-unbemannt', cat: 'space', symbol: '🧑‍🚀', title: 'Bemannte vs. unbemannte Raumfahrt', body: 'Bemannte Missionen transportieren Menschen und benötigen aufwendige Lebenserhaltungssysteme, sind dafür aber flexibel vor Ort einsetzbar. Unbemannte Missionen (Sonden, Satelliten, Rover) sind günstiger, können auch lebensfeindliche Umgebungen erreichen und stellen daher den weit größeren Teil aller Weltraummissionen.' },
    { id: 'space:wiederverwendbarkeit', cat: 'space', symbol: '♻️', title: 'Wiederverwendbare Raketen', body: 'Klassische Trägerraketen wurden nach einem Start verworfen. Seit den 2010er-Jahren gibt es Raketenstufen, die kontrolliert zur Erde zurückkehren und erneut gestartet werden können – ein Konzept, das die Kosten pro Start deutlich senken kann und heute von mehreren Anbietern eingesetzt wird.' }
  ];
  function spaceEntry(id) { return SPACE_GLOSSARY.find(function (g) { return g.id === id; }); }
  const RULER_TO_PLANET_KEY = { 'Mars': 'mars', 'Venus': 'venus', 'Merkur': 'merkur', 'Mond': 'mond', 'Sonne': 'sonne', 'Jupiter': 'jupiter', 'Saturn': 'saturn', 'Uranus': 'uranus', 'Neptun': 'neptun', 'Pluto': 'pluto' };
  function glossLink(id, label) { return '<span class="gloss-link" data-glossary="' + id + '">' + esc(label) + '</span>'; }
  function infoBtn(id) { return '<button type="button" class="info-btn" data-glossary="' + id + '">i</button>'; }
  function showGlossary(id) {
    const g = glossaryEntry(id);
    if (!g) return;
    openTextModal('<span class="modal-sym">' + AWSym(g.symbol) + '</span>' + esc(g.title), '<p class="modal-body-text">' + esc(g.body) + '</p>' +
      '<button type="button" class="btn ghost small" id="glossMore">Im Astro-Lexikon öffnen</button>');
    document.getElementById('glossMore').addEventListener('click', function () {
      closeModal(); astrolexState = { filter: '', cat: 'all', openId: id }; navigate('astrolex');
    });
  }

  /* ---------------------------------------------------------------
     Modal / Lightbox (vergrößerbar & schließbar)
     --------------------------------------------------------------- */
  let zoomState = { scale: 1, tx: 0, ty: 0 };
  let currentZoomStage = null;
  function openTextModal(title, bodyHtml) {
    const content = document.getElementById('modalContent');
    content.className = 'modal-content';
    document.getElementById('modalBox').classList.remove('dialog-box');
    content.innerHTML = '<h3>' + title + '</h3>' + bodyHtml;
    document.getElementById('modalZoomControls').style.display = 'none';
    document.getElementById('modalOverlay').classList.add('show');
    currentZoomStage = null;
    textGlyphs(content);
  }

  function openImageModal(svgHtml) {
    const content = document.getElementById('modalContent');
    content.className = 'modal-content zoom-mode';
    document.getElementById('modalBox').classList.remove('dialog-box');
    zoomState = { scale: 1, tx: 0, ty: 0 };
    content.innerHTML = '<div class="zoom-stage" id="zoomStage">' + svgHtml + '</div>';
    document.getElementById('modalZoomControls').style.display = 'flex';
    document.getElementById('modalOverlay').classList.add('show');
    currentZoomStage = document.getElementById('zoomStage');
    applyZoomTransform();
    bindZoomStage(currentZoomStage);
    textGlyphs(content);
  }

  function closeModal() {
    document.getElementById('modalOverlay').classList.remove('show');
    document.getElementById('modalContent').innerHTML = '';
    document.getElementById('modalBox').classList.remove('dialog-box');
    currentZoomStage = null;
  }
  // Eigenes Bestätigungsfenster statt window.confirm() – im Homescreen-Modus zeigt das
  // System-Fenster sonst die Webadresse als Überschrift.
  function confirmDialog(opts, onOk) {
    const content = document.getElementById('modalContent');
    content.className = 'modal-content dialog-mode';
    document.getElementById('modalBox').classList.add('dialog-box');
    document.getElementById('modalZoomControls').style.display = 'none';
    currentZoomStage = null;
    content.innerHTML =
      '<div class="dialog-icon' + (opts.danger ? ' danger' : '') + '">' + ic(opts.icon || (opts.danger ? 'trash' : 'info')) + '</div>' +
      '<h3>' + esc(opts.title) + '</h3>' +
      (opts.text ? '<p>' + esc(opts.text) + '</p>' : '') +
      '<div class="dialog-actions">' +
      '<button type="button" class="btn secondary" id="dlgCancel">' + esc(opts.cancelLabel || 'Abbrechen') + '</button>' +
      '<button type="button" class="btn' + (opts.danger ? ' danger-solid' : '') + '" id="dlgOk">' + esc(opts.okLabel || 'OK') + '</button>' +
      '</div>';
    document.getElementById('modalOverlay').classList.add('show');
    document.getElementById('dlgCancel').addEventListener('click', closeModal);
    document.getElementById('dlgOk').addEventListener('click', function () { closeModal(); onOk(); });
    setTimeout(function () { const b = document.getElementById('dlgCancel'); if (b) b.focus(); }, 30);
  }
  function ic(name, cls) { return window.AWIcon ? window.AWIcon(name, cls) : ''; }
  function applyZoomTransform() {
    if (!currentZoomStage) return;
    currentZoomStage.style.transform = 'translate(' + zoomState.tx + 'px,' + zoomState.ty + 'px) scale(' + zoomState.scale + ')';
  }
  function bindZoomStage(stage) {
    const pointers = new Map();
    let startDist = 0, startScale = 1, dragStart = null;
    stage.addEventListener('pointerdown', function (e) {
      stage.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        dragStart = { x: e.clientX, y: e.clientY, tx: zoomState.tx, ty: zoomState.ty };
      } else if (pointers.size === 2) {
        const pts = Array.from(pointers.values());
        startDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
        startScale = zoomState.scale;
        dragStart = null;
      }
    });
    stage.addEventListener('pointermove', function (e) {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const pts = Array.from(pointers.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        zoomState.scale = Math.min(4, Math.max(1, startScale * (dist / startDist)));
        applyZoomTransform();
      } else if (pointers.size === 1 && dragStart && zoomState.scale > 1) {
        zoomState.tx = dragStart.tx + (e.clientX - dragStart.x);
        zoomState.ty = dragStart.ty + (e.clientY - dragStart.y);
        applyZoomTransform();
      }
    });
    function endPointer(e) { pointers.delete(e.pointerId); if (pointers.size === 0) dragStart = null; }
    stage.addEventListener('pointerup', endPointer);
    stage.addEventListener('pointercancel', endPointer);
    let lastTap = 0;
    stage.addEventListener('pointerup', function () {
      const now = Date.now();
      if (now - lastTap < 300) {
        zoomState.scale = zoomState.scale > 1 ? 1 : 2.2;
        zoomState.tx = 0; zoomState.ty = 0;
        applyZoomTransform();
      }
      lastTap = now;
    });
  }

  /* ---------------------------------------------------------------
     WILLKOMMENS-TOUR
     --------------------------------------------------------------- */
  const ONBOARD_KEY = 'astrowahr.onboarded';
  const TOUR_SLIDES = [
    { icon: '<img class="tour-app-icon" src="as-icon-192.png" alt="">', title: 'Willkommen bei AstroWahr', body: 'Eine App für zwei verwandte, aber unterschiedliche Blicke auf den Himmel – komplett offline berechnet, ohne Server, ohne Tracking.' },
    { icon: 'split', title: 'Zwei klar getrennte Bereiche', body: 'Die Startseite führt dich bewusst zu zwei getrennten Bereichen: Astronomie liefert reine, überprüfbare Fakten. Astrologie legt darüber eine symbolische Deutungsebene. Beide nutzen dieselben berechneten Positionen – aber sie beantworten unterschiedliche Fragen.' },
    { icon: 'telescope', title: 'Astronomie – Fakten pur', body: 'Live-Positionen und Entfernungen, ein echter Sternenhimmel mit Zeitreise für deinen Standort, physikalische Planeten-Steckbriefe, Sonnenauf-/-untergang, ein Jahreszeiten-Rechner und die Erklärung, warum Tierkreiszeichen nicht mit den echten Sternbildern übereinstimmen. Keine Deutung, nur Berechnung.' },
    { icon: 'crystal', title: 'Astrologie – Deutung & Reflexion', body: 'Geburtshoroskop, Tageshoroskop, Transite, Kompatibilität und Tarot – als Werkzeug zur Selbstreflexion und Unterhaltung gedacht, nicht als wissenschaftlich belegte Aussage. Das Astro-Lexikon erklärt alle Begriffe im Detail.' },
    { icon: 'search', title: 'Los geht\'s', body: 'Über das Lupensymbol oben findest du jederzeit alles per Suche – über beide Bereiche hinweg, aber klar mit Astronomie oder Astrologie beschriftet. Diese Tour findest du jederzeit erneut unter Anleitung.' }
  ];
  // Einheitliche Einführung der WahrZentrale (wz-onboarding.js) – gleiche Optik wie in allen Apps
  let asOnb = null;
  function openTour() {
    if (typeof wzOnboarding !== 'function') return;
    if (!asOnb) {
      asOnb = wzOnboarding({
        key: ONBOARD_KEY,
        auto: false,
        slides: TOUR_SLIDES.map(function (s) {
          return {
            iconHtml: s.icon.charAt(0) === '<'
              ? '<img src="as-icon-192.png" alt="" style="width:100%;height:100%;border-radius:inherit;display:block">'
              : ic(s.icon),
            title: s.title,
            text: s.body
          };
        })
      });
    }
    asOnb.show();
  }

  /* ---------------------------------------------------------------
     GLOBALE SUCHE
     --------------------------------------------------------------- */
  const TOOL_SHORTCUTS = [
    { label: 'Himmel jetzt', domain: 'astro', tab: 'astro-live' },
    { label: 'Sternenhimmel', domain: 'astro', tab: 'sternenhimmel' },
    { label: 'Planeten-Steckbriefe', domain: 'astro', tab: 'astro-planets' },
    { label: 'Sonnenzeiten (Sonnenauf- und -untergang)', domain: 'astro', tab: 'astro-sun' },
    { label: 'Jahreszeiten (Tagundnachtgleichen & Sonnenwenden)', domain: 'astro', tab: 'astro-seasons' },
    { label: 'Sternbilder & Präzession', domain: 'astro', tab: 'astro-precession' },
    { label: 'Mondkalender', domain: 'astro', tab: 'mond' },
    { label: 'Weltraumkunde', domain: 'astro', tab: 'weltraum' },
    { label: 'Sternentwicklung', domain: 'astro', tab: 'weltraum-sterne' },
    { label: 'Raumfahrt-Zeitstrahl', domain: 'astro', tab: 'weltraum-zeitstrahl' },
    { label: 'Geburtshoroskop', domain: 'astrologie', tab: 'chart' },
    { label: 'Tageshoroskop', domain: 'astrologie', tab: 'horoskop' },
    { label: 'Transite', domain: 'astrologie', tab: 'transite' },
    { label: 'Kompatibilität', domain: 'astrologie', tab: 'kompat' },
    { label: 'Astro-Lexikon', domain: 'astrologie', tab: 'astrolex' },
    { label: 'Tarot', domain: 'tarot', tab: 'tarot' },
    { label: 'Anleitung', domain: 'general', tab: 'anleitung' },
    { label: 'Einstellungen', domain: 'general', tab: 'einstellungen' },
    { label: 'Rechtliches', domain: 'general', tab: 'rechtliches' },
    { label: 'Impressum', domain: 'general', tab: 'impressum' },
    { label: 'Datenschutz', domain: 'general', tab: 'datenschutz' }
  ];
  const DOMAIN_META = {
    astro: { icon: 'telescope', label: 'Astronomie' },
    astrologie: { icon: 'crystal', label: 'Astrologie' },
    tarot: { icon: 'cards', label: 'Tarot' },
    general: { icon: 'gear', label: 'App' }
  };
  let searchResultCache = [];
  function openSearchModal() {
    document.getElementById('modalZoomControls').style.display = 'none';
    document.getElementById('modalOverlay').classList.add('show');
    const content = document.getElementById('modalContent');
    content.className = 'modal-content search-mode';
    content.innerHTML = '<div class="field search-field" style="margin-bottom:4px;">' + ic('search', 'field-ic') + '<input type="search" id="globalSearchInput" placeholder="Suche über Astronomie & Astrologie…" autocomplete="off" enterkeyhint="search" aria-label="Suche"></div><div id="globalSearchResults"></div>';
    renderSearchResults('');
    setTimeout(function () { const el = document.getElementById('globalSearchInput'); if (el) el.focus(); }, 50);
    document.getElementById('globalSearchInput').addEventListener('input', function (e) {
      const pos = e.target.selectionStart;
      renderSearchResults(e.target.value);
      const el = document.getElementById('globalSearchInput');
      if (el) { el.focus(); el.setSelectionRange(pos, pos); }
    });
  }
  function runGlobalSearch(query) {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const results = [];
    TOOL_SHORTCUTS.forEach(function (s) {
      if (s.label.toLowerCase().indexOf(q) !== -1) {
        results.push({ domain: s.domain, label: s.label, sub: 'Direkt öffnen', action: function () { closeModal(); navigate(s.tab); } });
      }
    });
    ASTRO_GLOSSARY.forEach(function (g) {
      if (g.title.toLowerCase().indexOf(q) !== -1 || g.body.toLowerCase().indexOf(q) !== -1) {
        results.push({ domain: 'astrologie', label: g.title, sub: 'Astro-Lexikon', action: function () { closeModal(); astrolexState = { filter: '', cat: 'all', openId: g.id }; navigate('astrolex'); } });
      }
    });
    if (window.CARDS) {
      window.CARDS.forEach(function (c) {
        if (c.name.toLowerCase().indexOf(q) !== -1 || c.keywords.join(' ').toLowerCase().indexOf(q) !== -1) {
          results.push({ domain: 'tarot', label: c.name, sub: 'Tarot-Lexikon', action: function () { closeModal(); tarotState.view = 'lexikon'; tarotState.lex = { filter: '', arcana: 'all', favOnly: false, openId: c.id }; navigate('tarot'); } });
        }
      });
    }
    PLANET_FACTS.forEach(function (p) {
      if (p.name.toLowerCase().indexOf(q) !== -1 || p.fact.toLowerCase().indexOf(q) !== -1) {
        results.push({ domain: 'astro', label: p.name, sub: 'Planeten-Steckbrief', action: function () { closeModal(); navigate('astro-planets'); } });
      }
    });
    SPACE_GLOSSARY.forEach(function (g) {
      if (g.title.toLowerCase().indexOf(q) !== -1 || g.body.toLowerCase().indexOf(q) !== -1) {
        results.push({ domain: 'astro', label: g.title, sub: 'Weltraumkunde-Lexikon', action: function () { closeModal(); weltraumLexState = { filter: '', cat: 'all', openId: g.id }; navigate('weltraum-lexikon'); } });
      }
    });
    return results.slice(0, 40);
  }
  function renderSearchResults(query) {
    const box = document.getElementById('globalSearchResults');
    if (!box) return;
    const results = runGlobalSearch(query);
    searchResultCache = results;
    if (!query.trim()) { box.innerHTML = '<p class="hint">Mindestens 2 Zeichen eingeben – durchsucht Werkzeuge, Astro-Lexikon, Tarot-Lexikon und Planeten-Steckbriefe.</p>'; return; }
    if (query.trim().length < 2) { box.innerHTML = '<p class="hint">Bitte mindestens 2 Zeichen eingeben.</p>'; return; }
    if (!results.length) { box.innerHTML = emptyState('search', 'Keine Treffer.'); return; }
    const grouped = {};
    results.forEach(function (r, i) {
      r._idx = i;
      if (!grouped[r.domain]) grouped[r.domain] = [];
      grouped[r.domain].push(r);
    });
    let html = '';
    ['astro', 'astrologie', 'tarot', 'general'].forEach(function (dom) {
      if (!grouped[dom]) return;
      const meta = DOMAIN_META[dom];
      html += '<div class="search-domain-label">' + meta.label + '</div>';
      grouped[dom].forEach(function (r) {
        html += '<div class="search-result-row" role="button" tabindex="0" data-idx="' + r._idx + '"><div class="search-result-icon dom-' + r.domain + '">' + ic(DOMAIN_META[r.domain].icon) + '</div><div class="search-result-text"><b>' + esc(r.label) + '</b><span>' + esc(r.sub) + '</span></div><span class="row-chev">' + ic('chevron') + '</span></div>';
      });
    });
    box.innerHTML = html;
    box.querySelectorAll('[data-idx]').forEach(function (row) {
      row.addEventListener('click', function () {
        const r = searchResultCache[parseInt(row.dataset.idx, 10)];
        if (r) r.action();
      });
    });
  }

  /* ---------------------------------------------------------------
     Hilfsfunktionen
     --------------------------------------------------------------- */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  // Deutsche Zahlendarstellung (Komma, Tausenderpunkt)
  function fmtNum(x, digits) {
    const d = digits || 0;
    return Number(x).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  // Grad innerhalb eines Zeichens in astrologisch üblicher Schreibweise: 16°54′
  function fmtDeg(x) {
    let d = Math.floor(x), m = Math.round((x - d) * 60);
    if (m === 60) { d += 1; m = 0; }
    if (d >= 30) { d = 29; m = 59; }
    return d + '°' + String(m).padStart(2, '0') + '′';
  }
  function fmtOrb(x) { return fmtNum(x, 1) + '°'; }
  function localDateKey(d) {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }
  function seedFromString(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return h >>> 0;
    };
  }
  function mulberry32(seed) {
    let a = seed;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seededRand(str) {
    const seedFn = seedFromString(str);
    return mulberry32(seedFn());
  }

  // Mondphase aus dem tatsächlichen Winkelabstand Mond–Sonne (genauer als ein mittlerer Zyklus;
  // Neu-/Vollmondzeiten liegen damit auf wenige Minuten genau).
  const SYNODIC = 29.53058867;
  function moonElongation(d) {
    const p = E.computePositions(d);
    return ((p.mond.lon - p.sonne.lon) % 360 + 360) % 360;
  }
  function moonPhaseTrue(d) {
    const e = moonElongation(d);
    const age = e / 360 * SYNODIC;
    const illumination = (1 - Math.cos(e * Math.PI / 180)) / 2;
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
    return { age: age, illumination: illumination, phaseName: phaseName, synodic: SYNODIC, elongation: e };
  }
  // Nächster Zeitpunkt, an dem die Elongation den Zielwinkel (0 = Neumond, 180 = Vollmond) erreicht
  function nextMoonPhaseTime(from, target) {
    const f = function (d) { return ((moonElongation(d) - target + 540) % 360) - 180; };
    let t = from.getTime(), prev = f(from);
    for (let i = 0; i < 24 * 32; i++) {
      const t2 = t + 3600000, cur = f(new Date(t2));
      if (prev < 0 && cur >= 0 && Math.abs(cur - prev) < 90) {
        let a = t, b = t2;
        for (let k = 0; k < 20; k++) { const m = (a + b) / 2; if (f(new Date(m)) < 0) a = m; else b = m; }
        return new Date((a + b) / 2);
      }
      t = t2; prev = cur;
    }
    return null;
  }

  let toastTimer = null;
  function toast(msg, ms) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, ms || 2400);
  }
  function emptyState(iconName, text, actionHtml) {
    return '<div class="empty-state"><span class="empty-ic">' + ic(iconName) + '</span><p>' + text + '</p>' + (actionHtml || '') + '</div>';
  }
  // Tierkreis- und einige Planetenzeichen werden auf dem Smartphone sonst als bunte Emoji
  // dargestellt. Das Steuerzeichen U+FE0E erzwingt die schlichte Textdarstellung.
  const EMOJI_PRONE = /([♈-♓♀♂☀☿♃-♇☉☽☌☍⚹])(?!︎)/g;
  function textGlyphs(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (n) {
      if (EMOJI_PRONE.test(n.nodeValue)) { EMOJI_PRONE.lastIndex = 0; n.nodeValue = n.nodeValue.replace(EMOJI_PRONE, '$1︎'); }
      EMOJI_PRONE.lastIndex = 0;
    });
  }
  function scrollTop() {
    try { window.scrollTo(0, 0); } catch (e) {}
    const v = document.getElementById('view'); if (v) v.scrollTop = 0;
  }

  /* ---------------------------------------------------------------
     Profil-Speicherung
     --------------------------------------------------------------- */
  function getProfiles() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.profiles) || '[]'); }
    catch (e) { return []; }
  }
  function saveProfiles(list) { localStorage.setItem(STORAGE_KEYS.profiles, JSON.stringify(list)); }
  function addProfile(p) {
    const list = getProfiles();
    p.id = 'p' + Date.now() + Math.floor(Math.random() * 1000);
    list.push(p);
    saveProfiles(list);
    return p;
  }
  function updateProfile(id, patch) {
    const list = getProfiles();
    const idx = list.findIndex(function (p) { return p.id === id; });
    if (idx === -1) return null;
    list[idx] = Object.assign({}, list[idx], patch, { id: id });
    saveProfiles(list);
    return list[idx];
  }
  function deleteProfile(id) {
    saveProfiles(getProfiles().filter(function (p) { return p.id !== id; }));
  }
  function getProfile(id) { return getProfiles().find(function (p) { return p.id === id; }); }

  /* ---------------------------------------------------------------
     Chart-Berechnung
     --------------------------------------------------------------- */
  function utcDateFromProfile(p) {
    const parts = p.date.split('-').map(Number);
    let hh = 12, mi = 0;
    if (!p.timeUnknown && p.time) {
      const tp = p.time.split(':').map(Number);
      hh = tp[0]; mi = tp[1];
    }
    const utcMs = Date.UTC(parts[0], parts[1] - 1, parts[2], hh, mi) - (p.utcOffset || 0) * 3600000;
    return new Date(utcMs);
  }

  function computeChart(p) {
    const utcDate = utcDateFromProfile(p);
    const positions = E.computePositions(utcDate);
    let asc = null, mc = null, houses = null;
    if (!p.timeUnknown) {
      const am = E.ascendantMC(utcDate, p.lat, p.lon);
      asc = am.asc; mc = am.mc;
      houses = E.equalHouses(asc);
    }
    const planets = PLANETS_META.map(function (meta) {
      const pos = positions[meta.key];
      const sign = E.lonToSign(pos.lon);
      const house = houses ? E.houseOfLongitude(pos.lon, houses) : null;
      return { key: meta.key, meta: meta, lon: pos.lon, sign: sign, house: house };
    });
    const aspects = [];
    for (let i = 0; i < planets.length; i++) {
      for (let j = i + 1; j < planets.length; j++) {
        const a = E.findAspect(planets[i].lon, planets[j].lon, 1);
        if (a) aspects.push({ a: planets[i], b: planets[j], aspect: a });
      }
    }
    aspects.sort(function (x, y) { return x.aspect.orb - y.aspect.orb; });
    return { utcDate: utcDate, positions: positions, planets: planets, asc: asc, mc: mc, houses: houses, aspects: aspects };
  }

  // Deutungstexte je Aspekt in mehreren Varianten – die Auswahl hängt vom Planetenpaar ab,
  // damit sich die Liste nicht wie ein Baukasten liest. {A}/{a} = erster, {b} = zweiter Planet.
  const ASPECT_TEXTS = {
    Konjunktion: [
      '{A} und {b} sind eng miteinander verwoben – was das eine berührt, bewegt auch das andere.',
      '{A} und {b} treten gemeinsam auf und verstärken sich gegenseitig; das wirkt kraftvoll, manchmal auch einseitig.',
      'Hier verschmelzen {a} und {b} zu einer Einheit – ein zentrales, gut spürbares Thema.'
    ],
    Sextil: [
      '{A} und {b} ergänzen sich angenehm – eine Chance, die sich vor allem zeigt, wenn du sie aktiv nutzt.',
      '{A} und {b} stehen in freundlichem Austausch, der leicht neue Möglichkeiten eröffnet.',
      '{A} und {b} unterstützen sich auf unaufgeregte Weise – ein Talent, das durch Übung wächst.'
    ],
    Quadrat: [
      '{A} und {b} reiben sich aneinander. Diese Spannung fordert heraus, kann aber zu echter Entwicklung antreiben.',
      '{A} und {b} setzen sich gegenseitig unter Druck, der nach Lösungen verlangt – oft ein Motor für Ehrgeiz und Wachstum.',
      '{A} und {b} wollen Verschiedenes zur selben Zeit; wer diese Reibung bewusst annimmt, gewinnt an Stärke.'
    ],
    Trigon: [
      '{A} und {b} fließen mühelos zusammen – wie eine natürliche Begabung, die sich fast von selbst zeigt.',
      '{A} und {b} harmonieren miteinander; hier fällt vieles leicht.',
      '{A} und {b} stützen sich gegenseitig und schenken in diesem Bereich Vertrauen und Leichtigkeit.'
    ],
    Opposition: [
      '{A} und {b} stehen sich gegenüber und suchen einen bewussten Ausgleich zwischen zwei Polen.',
      '{A} und {b} ziehen in entgegengesetzte Richtungen – Balance entsteht, wenn beide Seiten ihren Platz bekommen.',
      '{A} und {b} spiegeln sich gegenseitig; oft wird dieses Thema in Begegnungen mit anderen Menschen sichtbar.'
    ]
  };
  function aspectConnector(name, shortA, shortB, seed) {
    const variants = ASPECT_TEXTS[name];
    if (!variants) return '';
    const v = variants[Math.abs(seed || 0) % variants.length];
    return v.replace(/\{A\}/g, capitalize(shortA)).replace(/\{a\}/g, shortA).replace(/\{b\}/g, shortB);
  }

  function aspectQuality(name) {
    if (name === 'Trigon' || name === 'Sextil') return { key: 'harm', label: 'harmonisch' };
    if (name === 'Quadrat' || name === 'Opposition') return { key: 'tens', label: 'spannungsvoll' };
    return { key: 'conj', label: 'verbindend' };
  }

  function aspectRowHTML(symbol, titleHtml, text, orb, name) {
    const q = aspectQuality(name);
    return '<div class="aspect-row"><div class="aspect-symbol q-' + q.key + '">' + symbol + '</div><div class="aspect-text"><b>' + titleHtml + '</b><span class="row-preview">' + text + '</span><div class="aspect-meta"><span class="q-chip q-' + q.key + '">' + q.label + '</span> Orb ' + fmtOrb(orb) + '</div></div></div>';
  }

  // Zeigt die wichtigsten Einträge sofort, den Rest aufklappbar.

  function collapsibleList(rows, visible, moreLabel) {
    if (rows.length <= visible + 1) return '<div class="card list-card">' + rows.join('') + '</div>';
    return '<div class="card list-card">' + rows.slice(0, visible).join('') +
      '<details class="more"><summary>' + esc(moreLabel.replace('%n', rows.length - visible)) + '</summary>' + rows.slice(visible).join('') + '</details></div>';
  }

  /* ---------------------------------------------------------------
     SVG-Radkarte
     --------------------------------------------------------------- */
  function polar(cx, cy, r, lon, rotate) {
    const screenAngle = 180 - (lon - rotate);
    const rad = screenAngle * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
  }

  // Verteilt eng beieinanderstehende Planeten auf dem Rad, damit sich Symbole nicht überlagern.
  function spreadLongitudes(items, minGap) {
    const list = items.map(function (it, i) { return { i: i, lon: it.lon, disp: it.lon }; }).sort(function (x, y) { return x.lon - y.lon; });
    for (let pass = 0; pass < 30; pass++) {
      let moved = false;
      for (let k = 0; k < list.length; k++) {
        const cur = list[k], next = list[(k + 1) % list.length];
        let gap = next.disp - cur.disp;
        if (k === list.length - 1) gap += 360;
        if (list.length > 1 && gap < minGap) {
          const push = (minGap - gap) / 2;
          cur.disp -= push; next.disp += push; moved = true;
        }
      }
      if (!moved) break;
    }
    const out = [];
    list.forEach(function (it) { out[it.i] = ((it.disp % 360) + 360) % 360; });
    return out;
  }

  function buildWheelSVG(chart) {
    const cx = 180, cy = 180, rOuter = 168, rZodiac = 146, rHouse = 128, rPlanet = 106, rInner = 64;
    const rotate = chart.asc !== null ? chart.asc : 0;
    const f = function (n) { return n.toFixed(1); };
    let svg = '<svg viewBox="-16 -16 392 392" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Radix-Horoskop">';
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + rOuter + '" fill="#12173a" stroke="#2a3260" stroke-width="1.5"/>';
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + rZodiac + '" fill="#141a40" stroke="#2a3260" stroke-width="1"/>';
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + rInner + '" fill="#0e1230" stroke="#2a3260" stroke-width="1"/>';

    // Gradeinteilung (alle 5°, lange Striche alle 10°)
    for (let d = 0; d < 360; d += 5) {
      const long = d % 10 === 0;
      const p1 = polar(cx, cy, rZodiac, d, rotate), p2 = polar(cx, cy, rZodiac - (long ? 5 : 3), d, rotate);
      svg += '<line x1="' + f(p1.x) + '" y1="' + f(p1.y) + '" x2="' + f(p2.x) + '" y2="' + f(p2.y) + '" stroke="#3a4380" stroke-width="0.7"/>';
    }
    for (let i = 0; i < 12; i++) {
      const lon0 = i * 30;
      const p1 = polar(cx, cy, rOuter, lon0, rotate);
      const p2 = polar(cx, cy, rZodiac, lon0, rotate);
      svg += '<line x1="' + f(p1.x) + '" y1="' + f(p1.y) + '" x2="' + f(p2.x) + '" y2="' + f(p2.y) + '" stroke="#3a4380" stroke-width="1"/>';
      const mid = polar(cx, cy, (rOuter + rZodiac) / 2, lon0 + 15, rotate);
      svg += '<text x="' + f(mid.x) + '" y="' + f(mid.y + 5) + '" font-size="14" fill="#ffd27a" text-anchor="middle">' + SIGNS_META[i].symbol + '︎</text>';
    }

    if (chart.houses) {
      for (let i = 0; i < 12; i++) {
        const lon0 = chart.houses[i];
        const p1 = polar(cx, cy, rZodiac - 5, lon0, rotate);
        const p2 = polar(cx, cy, rInner, lon0, rotate);
        const isAngle = (i === 0 || i === 3 || i === 6 || i === 9);
        svg += '<line x1="' + f(p1.x) + '" y1="' + f(p1.y) + '" x2="' + f(p2.x) + '" y2="' + f(p2.y) + '" stroke="' + (isAngle ? '#b892ff' : '#2a3260') + '" stroke-width="' + (isAngle ? 1.6 : 0.8) + '"/>';
        const lbl = polar(cx, cy, rInner + 9, lon0 + 15, rotate);
        svg += '<text x="' + f(lbl.x) + '" y="' + f(lbl.y + 3) + '" font-size="8" fill="#7680a8" text-anchor="middle">' + (i + 1) + '</text>';
      }
    }

    // Aspektlinien im Innenkreis
    chart.aspects.forEach(function (item) {
      if (item.aspect.name === 'Konjunktion') return;
      const p1 = polar(cx, cy, rInner, item.a.lon, rotate);
      const p2 = polar(cx, cy, rInner, item.b.lon, rotate);
      const color = (item.aspect.name === 'Trigon' || item.aspect.name === 'Sextil') ? '#5aa9e6' : item.aspect.name === 'Quadrat' ? '#ff7a7a' : '#ffd27a';
      svg += '<line x1="' + f(p1.x) + '" y1="' + f(p1.y) + '" x2="' + f(p2.x) + '" y2="' + f(p2.y) + '" stroke="' + color + '" stroke-width="0.8" opacity="0.6"/>';
    });

    // Planeten: echte Position als Markierung am Zeichenring, Symbol bei Bedarf leicht versetzt
    const disp = spreadLongitudes(chart.planets, 11);
    chart.planets.forEach(function (pl, i) {
      const tick1 = polar(cx, cy, rZodiac - 1, pl.lon, rotate), tick2 = polar(cx, cy, rZodiac - 9, pl.lon, rotate);
      svg += '<line x1="' + f(tick1.x) + '" y1="' + f(tick1.y) + '" x2="' + f(tick2.x) + '" y2="' + f(tick2.y) + '" stroke="#eef0fb" stroke-width="1.4"/>';
      const pos = polar(cx, cy, rPlanet, disp[i], rotate);
      const tick3 = polar(cx, cy, rPlanet + 11, disp[i], rotate);
      if (Math.abs(E.angleDiffSigned ? E.angleDiffSigned(disp[i], pl.lon) : disp[i] - pl.lon) > 0.5) {
        svg += '<line x1="' + f(tick2.x) + '" y1="' + f(tick2.y) + '" x2="' + f(tick3.x) + '" y2="' + f(tick3.y) + '" stroke="#5b64a0" stroke-width="0.6"/>';
      }
      svg += '<circle cx="' + f(pos.x) + '" cy="' + f(pos.y) + '" r="10.5" fill="#161c38" stroke="#b892ff" stroke-width="1"/>';
      svg += '<text x="' + f(pos.x) + '" y="' + f(pos.y + 4.2) + '" font-size="12" fill="#eef0fb" text-anchor="middle">' + pl.meta.symbol + '︎</text>';
    });

    if (chart.asc !== null) {
      const ascP = polar(cx, cy, rOuter + 9, chart.asc, rotate);
      svg += '<text x="' + f(ascP.x) + '" y="' + f(ascP.y + 3.5) + '" font-size="10" fill="#b892ff" text-anchor="middle" font-weight="bold">AC</text>';
      const mcP = polar(cx, cy, rOuter + 9, chart.mc, rotate);
      svg += '<text x="' + f(mcP.x) + '" y="' + f(mcP.y + 3.5) + '" font-size="10" fill="#ffd27a" text-anchor="middle" font-weight="bold">MC</text>';
    }

    svg += '</svg>';
    return svg;
  }

  /* ---------------------------------------------------------------
     Navigation
     --------------------------------------------------------------- */
  const SECTION_ROOTS = ['start', 'astronomie', 'astrologie', 'mehr'];
  let navHistory = ['start'];
  let chartState = { view: 'list', activeId: null, editId: null };
  let transiteState = { activeId: null };
  let kompatState = { idA: null, idB: null };
  let tarotState = { view: 'start', spread: null, question: '', drawn: [], revealed: [], lex: { filter: '', arcana: 'all', favOnly: false, openId: null } };

  function navigate(tab) {
    if (tab === 'impressum') { location.href = './impressum.html'; return; }
    if (tab === 'datenschutz') { location.href = './datenschutz.html#as'; return; }
    if (SECTION_ROOTS.indexOf(tab) !== -1) {
      navHistory = [tab];
    } else if (navHistory[navHistory.length - 1] !== tab) {
      navHistory.push(tab);
    }
    renderActiveTab(tab);
  }
  // Ein einziger Zurück-Weg: Der Pfeil oben geht zuerst innerhalb einer Seite zurück
  // (z. B. Formular → Liste, Lexikon-Eintrag → Übersicht) und erst dann zur vorherigen Seite.
  function inTabBack(tab) {
    if (tab === 'chart') {
      if (chartState.view === 'form') {
        chartState = chartState.editId ? { view: 'result', activeId: chartState.editId, fromList: chartState.fromList } : { view: 'list', activeId: null };
        return true;
      }
      if (chartState.view === 'result' && chartState.fromList) { chartState = { view: 'list', activeId: null }; return true; }
      chartState = { view: 'list', activeId: null };
      return false;
    }
    if (tab === 'astrolex') {
      if (astrolexState.openId && astrolexState.fromList) { astrolexState.openId = null; astrolexState.fromList = false; return true; }
      if (astrolexState.openId) { astrolexState = { filter: '', cat: 'all', openId: null }; return false; }
      if (astrolexState.cat !== 'all' || astrolexState.filter) { astrolexState = { filter: '', cat: 'all', openId: null }; return true; }
      return false;
    }
    if (tab === 'weltraum-lexikon') {
      if (weltraumLexState.openId && weltraumLexState.fromList) { weltraumLexState.openId = null; weltraumLexState.fromList = false; return true; }
      if (weltraumLexState.openId) { weltraumLexState = { filter: '', cat: 'all', openId: null }; return false; }
      return false;
    }
    if (tab === 'tarot') {
      if (tarotState.view === 'lexikon' && tarotState.lex.openId !== null && tarotState.lex.fromList) { tarotState.lex.openId = null; tarotState.lex.fromList = false; return true; }
      if (tarotState.view === 'lexikon' && tarotState.lex.openId !== null) { tarotState.lex.openId = null; tarotState.view = 'start'; return false; }
      if (tarotState.view !== 'start') { tarotState.view = 'start'; return true; }
      return false;
    }
    return false;
  }
  function goBack() {
    const cur = navHistory[navHistory.length - 1];
    if (inTabBack(cur)) { renderActiveTab(cur); return; }
    if (navHistory.length > 1) {
      navHistory.pop();
      renderActiveTab(navHistory[navHistory.length - 1]);
    }
  }
  function renderActiveTab(tab) {
    document.querySelectorAll('section.tab').forEach(function (s) { s.classList.remove('active'); });
    const el = document.getElementById('tab-' + tab);
    if (el) el.classList.add('active');
    document.querySelectorAll('nav.bottom-nav button').forEach(function (b) {
      const on = b.dataset.tab === navHistory[0];
      b.classList.toggle('active', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    const backBtn = document.getElementById('backBtn');
    const brand = document.getElementById('brandHeader');
    const h1 = brand.querySelector('h1');
    const isSub = navHistory.length > 1;
    backBtn.style.display = isSub ? 'flex' : 'none';
    brand.classList.toggle('is-sub', isSub);
    h1.textContent = isSub ? ((el && el.dataset.title) || 'AstroWahr') : 'AstroWahr';
    document.title = isSub ? h1.textContent + ' – AstroWahr' : 'AstroWahr';
    scrollTop();
    if (tab !== 'sternenhimmel') setImmersive(false);
    renderTab(tab);
    textGlyphs(el);
  }
  function setImmersive(on) {
    document.body.classList.toggle('sky-immersive', on);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', on ? '#0b0921' : (document.documentElement.getAttribute('data-theme') === 'dark' ? '#17142f' : '#f7f6fc'));
  }
  // Nach einer Neuzeichnung innerhalb derselben Seite (z. B. Lexikon-Eintrag öffnen)
  function refreshTab(tab, keepScroll) {
    renderTab(tab);
    textGlyphs(document.getElementById('tab-' + tab));
    if (!keepScroll) scrollTop();
  }

  function renderTab(tab) {
    if (tab === 'start') renderStart();
    else if (tab === 'astrologie') renderAstrologie();
    else if (tab === 'astronomie') renderAstronomie();
    else if (tab === 'astro-live') renderAstroLive();
    else if (tab === 'astro-planets') renderAstroPlanets();
    else if (tab === 'astro-sun') renderAstroSun();
    else if (tab === 'astro-precession') renderAstroPrecession();
    else if (tab === 'astro-seasons') renderAstroSeasons();
    else if (tab === 'sternenhimmel') renderSternenhimmel();
    else if (tab === 'weltraum') renderWeltraum();
    else if (tab === 'weltraum-lexikon') renderWeltraumLexikon();
    else if (tab === 'weltraum-sterne') renderWeltraumSterne();
    else if (tab === 'weltraum-zeitstrahl') renderWeltraumZeitstrahl();
    else if (tab === 'horoskop') renderHoroskop();
    else if (tab === 'chart') renderChart();
    else if (tab === 'transite') renderTransite();
    else if (tab === 'kompat') renderKompat();
    else if (tab === 'mond') renderMond();
    else if (tab === 'tarot') renderTarot();
    else if (tab === 'astrolex') renderAstrolex();
    else if (tab === 'mehr') renderMehr();
    else if (tab === 'anleitung') renderAnleitung();
    else if (tab === 'einstellungen') renderEinstellungen();
    else if (tab === 'rechtliches') renderRechtliches();
    else if (tab === 'impressum') renderImpressumInline();
    else if (tab === 'datenschutz') renderDatenschutzInline();
    else if (tab === 'lizenzen') renderLizenzenInline();
  }

  /* ---------------------------------------------------------------
     START (Weiche: Astronomie / Astrologie)
     --------------------------------------------------------------- */
  function renderStart() {
    const now = new Date();
    document.getElementById('heroDate').textContent = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const positions = E.computePositions(now);
    const sunSign = E.lonToSign(positions.sonne.lon);
    const moonSign = E.lonToSign(positions.mond.lon);
    const phase = moonPhaseTrue(now);
    document.getElementById('heroSky').innerHTML =
      '<div class="hero-sky-item"><div class="glyph">' + SIGNS_META[sunSign.index].symbol + '</div><div class="label">Sonne in</div><div class="value">' + esc(sunSign.sign) + '</div></div>' +
      '<div class="hero-sky-item"><div class="glyph">' + SIGNS_META[moonSign.index].symbol + '</div><div class="label">Mond in</div><div class="value">' + esc(moonSign.sign) + '</div></div>' +
      '<div class="hero-sky-item"><div class="glyph">' + moonSVG(phase, 26, true) + '</div><div class="label">Mondphase</div><div class="value">' + esc(phase.phaseName) + '</div></div>';

    document.getElementById('forkBento').innerHTML =
      tile('grad-3', 'telescope', 'Astronomie', 'Live-Himmel, Planeten-Steckbriefe, Sonnenzeiten, Sternbilder & Weltraumkunde', 'astronomie', true, 'fork-tile') +
      tile('grad-1', 'crystal', 'Astrologie', 'Geburtshoroskop, Tageshoroskop, Transite, Kompatibilität, Tarot & mehr', 'astrologie', true, 'fork-tile');
    bindTiles('forkBento');

    document.getElementById('quickBento').innerHTML =
      tile('grad-2', 'stars', 'Sternenhimmel', 'Live-Sternkarte für deinen Standort', 'sternenhimmel') +
      tile('grad-2', 'sunrise', 'Sonnenzeiten', 'Auf- und Untergang für heute', 'astro-sun') +
      tile('grad-1', 'crystal', 'Tageshoroskop', 'Dein Impuls für heute', 'horoskop') +
      tile('grad-3', 'moon', 'Mondkalender', 'Aktuelle Mondphase', 'mond');
    bindTiles('quickBento');
  }

  /* ---------------------------------------------------------------
     ASTROLOGIE (Hub)
     --------------------------------------------------------------- */
  function renderAstrologie() {
    document.getElementById('astrologieBento').innerHTML =
      tile('grad-1', 'seasons', 'Geburtshoroskop', 'Dein Radix mit Planeten, Häusern & Aspekten', 'chart') +
      tile('grad-2', 'crystal', 'Tageshoroskop', 'Täglicher Impuls für dein Sternzeichen', 'horoskop') +
      tile('grad-3', 'orbit', 'Transite', 'Aktuelle Planetenstände auf dein Horoskop', 'transite') +
      tile('grad-1', 'rings', 'Kompatibilität', 'Zwei Horoskope im Vergleich (Synastrie)', 'kompat') +
      tile('grad-3', 'moon', 'Mondkalender', 'Mondphase, Beleuchtung & nächster Vollmond', 'mond') +
      tile('grad-2', 'cards', 'Tarot', 'Karten legen & Kartenlexikon', 'tarot') +
      tile('grad-1', 'cap', 'Astro-Lexikon', 'Planeten, Zeichen, Häuser & Aspekte erklärt', 'astrolex', true);
    bindTiles('astrologieBento');

    const profiles = getProfiles();
    const box = document.getElementById('astrologieProfiles');
    if (!profiles.length) {
      box.innerHTML = emptyState('seasons', 'Noch keine Geburtsdaten gespeichert.', '<button type="button" class="btn small" id="astroNewChart">' + ic('plus') + 'Geburtshoroskop anlegen</button>');
      document.getElementById('astroNewChart').addEventListener('click', openNewChartForm);
    } else {
      box.innerHTML = profiles.slice(-3).reverse().map(function (p) {
        return profileRowHTML(p, 'chart');
      }).join('');
      bindProfileRows(box, 'chart');
    }
  }

  function openNewChartForm() {
    chartState = { view: 'form', activeId: null, editId: null };
    if (navHistory[navHistory.length - 1] === 'chart') renderActiveTab('chart');
    else navigate('chart');
  }

  const PLANET_FACTS = [
    { key: 'sonne', name: 'Sonne', symbol: '☉', type: 'Stern (Gelber Zwerg, Spektralklasse G2V)', diameter: '1.392.700 km (rund 109× Erddurchmesser)', distance: 'Zentrum des Sonnensystems', orbitPeriod: '–', rotation: '~27 Tage (Äquator, differenziell)', moons: '–', fact: 'Die Sonne enthält etwa 99,8 % der Masse des gesamten Sonnensystems. Ihr Licht braucht rund 8 Minuten bis zur Erde.' },
    { key: 'merkur', name: 'Merkur', symbol: '☿', type: 'Gesteinsplanet', diameter: '4.879 km', distance: '57,9 Mio. km (0,39 AE) von der Sonne', orbitPeriod: '88 Tage', rotation: '58,6 Tage', moons: '0', fact: 'Merkur hat die stärksten Temperaturschwankungen aller Planeten: bis zu 430 °C am Tag, bis zu -180 °C in der Nacht, da er praktisch keine Atmosphäre besitzt.' },
    { key: 'venus', name: 'Venus', symbol: '♀', type: 'Gesteinsplanet', diameter: '12.104 km', distance: '108,2 Mio. km (0,72 AE) von der Sonne', orbitPeriod: '224,7 Tage', rotation: '243 Tage (rückläufig)', moons: '0', fact: 'Venus dreht sich rückläufig und so langsam, dass ihr Tag länger ist als ihr Jahr. Mit rund 465 °C Oberflächentemperatur ist sie wegen ihrer dichten CO₂-Atmosphäre der heißeste Planet – heißer als der sonnennähere Merkur.' },
    { key: 'erde', name: 'Erde', symbol: '⊕', type: 'Gesteinsplanet', diameter: '12.742 km', distance: '149,6 Mio. km (1 AE) von der Sonne', orbitPeriod: '365,25 Tage', rotation: '23h 56min', moons: '1 (der Mond)', fact: 'Die Erde ist der einzige bekannte Planet mit flüssigem Oberflächenwasser und bestätigtem Leben.' },
    { key: 'mars', name: 'Mars', symbol: '♂', type: 'Gesteinsplanet', diameter: '6.779 km', distance: '227,9 Mio. km (1,52 AE) von der Sonne', orbitPeriod: '687 Tage', rotation: '24h 37min', moons: '2 (Phobos, Deimos)', fact: 'Der Mars beherbergt mit Olympus Mons den höchsten bekannten Vulkan des Sonnensystems – rund 22 km hoch, fast dreimal so hoch wie der Mount Everest.' },
    { key: 'jupiter', name: 'Jupiter', symbol: '♃', type: 'Gasriese', diameter: '139.820 km', distance: '778,5 Mio. km (5,20 AE) von der Sonne', orbitPeriod: '11,86 Jahre', rotation: '9h 56min', moons: 'über 110 bekannte Monde (Stand 2026, laufend neue Entdeckungen)', fact: 'Jupiter ist mit Abstand der massereichste Planet – mehr als doppelt so massereich wie alle anderen Planeten zusammen. Sein „Großer Roter Fleck" ist ein Sturm, der seit Jahrhunderten tobt.' },
    { key: 'saturn', name: 'Saturn', symbol: '♄', type: 'Gasriese', diameter: '116.460 km', distance: '1,43 Mrd. km (9,58 AE) von der Sonne', orbitPeriod: '29,4 Jahre', rotation: '10h 34min', moons: 'über 290 bekannte Monde (Stand 2026, Rekordhalter im Sonnensystem)', fact: 'Saturns Ringe bestehen überwiegend aus Eispartikeln und sind trotz ihres riesigen Durchmessers erstaunlich dünn – im Schnitt nur wenige Zehnermeter dick.' },
    { key: 'uranus', name: 'Uranus', symbol: '♅', type: 'Eisriese', diameter: '50.724 km', distance: '2,87 Mrd. km (19,2 AE) von der Sonne', orbitPeriod: '84 Jahre', rotation: '17h 14min', moons: '28 bekannte Monde', fact: 'Uranus rotiert quer „liegend" mit einer Achsneigung von rund 98° – vermutlich Folge einer gewaltigen Kollision in der Frühzeit des Sonnensystems.' },
    { key: 'neptun', name: 'Neptun', symbol: '♆', type: 'Eisriese', diameter: '49.244 km', distance: '4,50 Mrd. km (30,05 AE) von der Sonne', orbitPeriod: '165 Jahre', rotation: '16h 6min', moons: '16 bekannte Monde', fact: 'Neptun hat die stärksten Winde des Sonnensystems – Böen von bis zu 2.100 km/h wurden gemessen.' },
    { key: 'pluto', name: 'Pluto', symbol: '♇', type: 'Zwergplanet (seit 2006)', diameter: '2.377 km', distance: '~5,9 Mrd. km (39,5 AE, stark elliptische Bahn)', orbitPeriod: '248 Jahre', rotation: '6,4 Tage', moons: '5 (größter: Charon)', fact: 'Pluto und sein großer Mond Charon umkreisen einander so eng, dass ihr gemeinsamer Schwerpunkt außerhalb von Pluto liegt.' },
    { key: 'mond', name: 'Mond (Erdmond)', symbol: '☽', type: 'Natürlicher Satellit der Erde', diameter: '3.474 km', distance: '~384.400 km von der Erde', orbitPeriod: '27,3 Tage (siderisch) / 29,5 Tage (synodisch)', rotation: 'gebunden – zeigt der Erde immer dieselbe Seite', moons: '–', fact: 'Der Mond entfernt sich jedes Jahr um rund 3,8 cm von der Erde – gemessen mit Reflektoren, die Apollo-Astronauten hinterlassen haben.' }
  ];

  const ZODIAC_CONSTELLATIONS = [
    { sign: 'Widder', dateRange: '21.3. – 19.4.', constellation: 'Fische', note: 'Die Sonne steht zu dieser Zeit astronomisch bereits im Sternbild Fische.' },
    { sign: 'Stier', dateRange: '20.4. – 20.5.', constellation: 'Widder', note: '' },
    { sign: 'Zwillinge', dateRange: '21.5. – 20.6.', constellation: 'Stier', note: '' },
    { sign: 'Krebs', dateRange: '21.6. – 22.7.', constellation: 'Zwillinge', note: '' },
    { sign: 'Löwe', dateRange: '23.7. – 22.8.', constellation: 'Krebs', note: '' },
    { sign: 'Jungfrau', dateRange: '23.8. – 22.9.', constellation: 'Löwe', note: '' },
    { sign: 'Waage', dateRange: '23.9. – 22.10.', constellation: 'Jungfrau', note: '' },
    { sign: 'Skorpion', dateRange: '23.10. – 21.11.', constellation: 'Waage', note: '' },
    { sign: 'Schütze', dateRange: '22.11. – 21.12.', constellation: 'Skorpion / Schlangenträger', note: 'Die Sonne durchquert hier auch das 13. Sternbild Ophiuchus (Schlangenträger).' },
    { sign: 'Steinbock', dateRange: '22.12. – 19.1.', constellation: 'Schütze', note: '' },
    { sign: 'Wassermann', dateRange: '20.1. – 18.2.', constellation: 'Steinbock', note: '' },
    { sign: 'Fische', dateRange: '19.2. – 20.3.', constellation: 'Wassermann', note: '' }
  ];

  /* ---------------------------------------------------------------
     ASTRONOMIE (Hub + Unterseiten)
     --------------------------------------------------------------- */
  function renderAstronomie() {
    document.getElementById('astronomieBento').innerHTML =
      tile('grad-3', 'compass', 'Himmel jetzt', 'Positionen, Entfernungen & Rückläufigkeit in Echtzeit', 'astro-live') +
      tile('grad-2', 'stars', 'Sternenhimmel', 'Live-Sternkarte mit Zeitreise & Sternschnuppen', 'sternenhimmel') +
      tile('grad-1', 'planet', 'Planeten-Steckbriefe', 'Größe, Entfernung, Umlaufzeit, Monde', 'astro-planets') +
      tile('grad-2', 'sunrise', 'Sonnenzeiten', 'Auf- und Untergang für jeden Ort, inkl. Taglänge', 'astro-sun') +
      tile('grad-1', 'leaf', 'Jahreszeiten', 'Exakte Tagundnachtgleichen & Sonnenwenden', 'astro-seasons') +
      tile('grad-3', 'precession', 'Sternbilder & Präzession', 'Warum dein Tierkreiszeichen nicht am Himmel steht', 'astro-precession') +
      tile('grad-2', 'rocket', 'Weltraumkunde', 'Sterne, Universum, Sonnensystem & Raumfahrt', 'weltraum') +
      tile('grad-1', 'moon', 'Mondkalender', 'Mondphase, Beleuchtung & nächster Vollmond', 'mond');
    bindTiles('astronomieBento');
  }

  function renderAstroLive() {
    const root = document.getElementById('astroLiveRoot');
    const now = new Date();
    const positions = E.computePositions(now);
    const retro = E.retrogradeStatus(now);

    let html = '<p class="hint">Auf deinem Gerät berechnete Positionen und Entfernungen für ' + now.toLocaleString('de-DE', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) + ' Uhr – kein Blick durchs Teleskop, sondern astronomische Berechnung.</p>';
    html += '<div class="card flush"><table class="data-table compact"><thead><tr><th>Körper</th><th>Position</th><th class="num">Abstand</th></tr></thead><tbody>';
    PLANETS_META.forEach(function (meta) {
      const pos = positions[meta.key];
      const sign = E.lonToSign(pos.lon);
      let dist;
      if (meta.key === 'sonne') dist = fmtNum(pos.dist * 149597870.7 / 1000000, 1) + ' Mio. km';
      else if (meta.key === 'mond') dist = fmtNum(Math.round(pos.dist * 6371 / 100) * 100, 0) + ' km';
      else dist = fmtNum(pos.dist, 2) + ' AE';
      const isRetro = retro[meta.key];
      html += '<tr><td class="nowrap"><span class="inline-glyph">' + meta.symbol + '</span>' + glossLink('planet:' + meta.key, meta.name) + (isRetro ? ' <span class="retro" title="rückläufig" aria-label="rückläufig">℞</span>' : '') + '</td><td class="nowrap">' + fmtDeg(sign.degree) + ' ' + SIGNS_META[sign.index].symbol + '<span class="sign-name"> ' + sign.sign + '</span></td><td class="num nowrap">' + dist + '</td></tr>';
    });
    html += '</tbody></table></div>';
    html += '<p class="hint small">℞ = rückläufig: Der Planet bewegt sich, von der Erde aus gesehen, für einige Wochen scheinbar entgegen seiner üblichen Richtung durch den Tierkreis – eine reine Perspektiventäuschung durch die unterschiedlichen Umlaufgeschwindigkeiten von Erde und Planet.</p>';

    html += '<h2 class="section-title">Sichtbarkeit</h2><div class="card">';
    ['merkur', 'venus'].forEach(function (key) {
      const meta = PLANETS_META.find(function (m) { return m.key === key; });
      const elong = E.angleDiffSigned(positions[key].lon, positions.sonne.lon);
      const absElong = Math.abs(elong);
      let text;
      if (absElong < 8) text = 'Aktuell zu nah an der Sonne, um sichtbar zu sein.';
      else if (elong < 0) text = 'Derzeit Morgenstern – vor Sonnenaufgang im Osten sichtbar (Winkelabstand zur Sonne: ' + fmtNum(absElong, 0) + '°).';
      else text = 'Derzeit Abendstern – nach Sonnenuntergang im Westen sichtbar (Winkelabstand zur Sonne: ' + fmtNum(absElong, 0) + '°).';
      html += '<div class="aspect-row"><div class="aspect-symbol">' + meta.symbol + '</div><div class="aspect-text"><b>' + meta.name + '</b><br>' + text + '</div></div>';
    });
    ['mars', 'jupiter', 'saturn'].forEach(function (key) {
      const meta = PLANETS_META.find(function (m) { return m.key === key; });
      const elong = Math.abs(E.angleDiffSigned(positions[key].lon, positions.sonne.lon));
      let text;
      if (elong < 20) text = 'Nahe der Sonne, kaum beobachtbar.';
      else if (elong > 150) text = 'Nahe der Opposition – die ganze Nacht sichtbar, günstigste Beobachtungszeit.';
      else text = 'Am Abend- oder Morgenhimmel sichtbar (Winkelabstand zur Sonne: ' + fmtNum(elong, 0) + '°).';
      html += '<div class="aspect-row"><div class="aspect-symbol">' + meta.symbol + '</div><div class="aspect-text"><b>' + meta.name + '</b><br>' + text + '</div></div>';
    });
    html += '</div>';
    html += '<div class="disclaimer-box">Sichtbarkeitsangaben sind grobe Näherungen anhand des Winkelabstands zur Sonne (Elongation) – tatsächliche Sichtbarkeit hängt zusätzlich von Horizonthöhe, Tageszeit, Wetter und Lichtverschmutzung an deinem Standort ab.</div>';
    root.innerHTML = html;
  }

  function timezoneOptionsHTML(selected, autoLabel) {
    const offsets = OFFSET_PRESETS.concat(buildFullOffsetList());
    let html = '<option value="auto"' + (selected === 'auto' ? ' selected' : '') + '>' + esc(autoLabel || 'Automatisch (Sommer-/Winterzeit)') + '</option>';
    html += offsets.map(function (o) { return '<option value="' + o.value + '"' + (selected === o.value ? ' selected' : '') + '>' + esc(o.label) + '</option>'; }).join('');
    return html;
  }
  // Ermittelt den Versatz für „Automatisch": bekannte Stadt → deren Zeitzone, sonst Gerätezeitzone.

  function resolveAutoOffset(placeName, dateStr, timeStr) {
    const city = findCity(placeName);
    if (city && city.tz) {
      const off = tzOffsetHours(city.tz, dateStr, timeStr);
      if (off !== null) return { offset: off, tz: city.tz, source: city.name };
    }
    return { offset: deviceOffsetFor(dateStr, timeStr), tz: deviceTzName(), source: 'Gerät' };
  }

  function renderAstroPlanets() {
    const root = document.getElementById('astroPlanetsRoot');
    let html = '<p class="hint">Reine astronomische Fakten – unabhängig von der astrologischen Bedeutung im Astro-Lexikon.</p>';
    html += PLANET_FACTS.map(function (p) {
      return '<div class="card">' +
        '<div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;"><span style="font-size:1.5rem;">' + AWSym(p.symbol) + '</span><div><div style="font-weight:700;">' + esc(p.name) + '</div><div style="font-size:.76rem; color:var(--text-faint);">' + esc(p.type) + '</div></div></div>' +
        '<table class="data-table"><tbody>' +
        '<tr><td>Durchmesser</td><td>' + esc(p.diameter) + '</td></tr>' +
        '<tr><td>Entfernung</td><td>' + esc(p.distance || '') + '</td></tr>' +
        (p.orbitPeriod && p.orbitPeriod !== '–' ? '<tr><td>Umlaufzeit</td><td>' + esc(p.orbitPeriod) + '</td></tr>' : '') +
        '<tr><td>Rotation</td><td>' + esc(p.rotation) + '</td></tr>' +
        '<tr><td>Monde</td><td>' + esc(p.moons) + '</td></tr>' +
        '</tbody></table>' +
        '<p style="font-size:.84rem; color:var(--text-dim); margin-top:8px; margin-bottom:0;">' + esc(p.fact) + '</p>' +
        '</div>';
    }).join('');
    root.innerHTML = html;
  }

  let astroSunState = { lat: null, lon: null, place: '', offset: null, date: null };
  function renderAstroSun() {
    const root = document.getElementById('astroSunRoot');
    const today = new Date();
    if (!astroSunState.date) astroSunState.date = localDateKey(today);
    if (astroSunState.offset === null) astroSunState.offset = 'auto';
    if (astroSunState.lat === null) {
      const saved = getSavedLoc();
      if (saved && isFinite(saved.lat) && isFinite(saved.lon)) { astroSunState.lat = saved.lat; astroSunState.lon = saved.lon; astroSunState.place = saved.place || ''; }
    }
    let html = '<p class="hint">Sonnenaufgang, Sonnenuntergang, Sonnenmittag und Taglänge für einen beliebigen Ort und ein beliebiges Datum.</p>';
    html += '<div class="card form-card">';
    html += '<button type="button" class="btn secondary" id="sunAutoLoc">' + ic('locate') + 'Aktuellen Standort verwenden</button>';
    html += '<div class="field"><label for="sunPlace">Ort</label><input type="text" id="sunPlace" list="cityListSun" placeholder="Stadt suchen oder frei eintragen" autocomplete="off" value="' + esc(astroSunState.place) + '"><datalist id="cityListSun">' + CITY_PRESETS.map(function (c) { return '<option value="' + esc(c.name) + '">'; }).join('') + '</datalist></div>';
    html += '<div class="field"><div class="row2"><div><label for="sunLat">Breitengrad</label><input type="number" inputmode="decimal" step="0.0001" id="sunLat" value="' + (astroSunState.lat !== null ? astroSunState.lat : '') + '"></div><div><label for="sunLon">Längengrad</label><input type="number" inputmode="decimal" step="0.0001" id="sunLon" value="' + (astroSunState.lon !== null ? astroSunState.lon : '') + '"></div></div></div>';
    html += '<div class="field"><div class="row2"><div><label for="sunDate">Datum</label><input type="date" id="sunDate" value="' + astroSunState.date + '"></div><div><label for="sunOffset">Zeitzone</label><select id="sunOffset">' + timezoneOptionsHTML(astroSunState.offset, 'Automatisch') + '</select></div></div></div>';
    html += '<button type="button" class="btn" id="sunComputeBtn">Berechnen</button>';
    html += '</div>';
    html += '<div id="sunResult"></div>';
    root.innerHTML = html;

    const hadNoLoc = astroSunState.lat === null;
    const autoBtnHTML = ic('locate') + 'Aktuellen Standort verwenden';
    function applyLoc(loc) {
      const latEl = document.getElementById('sunLat');
      if (!latEl) return;
      latEl.value = loc.lat; document.getElementById('sunLon').value = loc.lon; document.getElementById('sunPlace').value = loc.place || '';
      astroSunState.lat = loc.lat; astroSunState.lon = loc.lon; astroSunState.place = loc.place || '';
      renderSunResult();
    }
    document.getElementById('sunAutoLoc').addEventListener('click', function () {
      const btn = document.getElementById('sunAutoLoc');
      btn.disabled = true; btn.innerHTML = ic('locate') + 'Ermittle Standort …';
      requestGeolocation(function (loc) {
        btn.disabled = false; btn.innerHTML = autoBtnHTML;
        applyLoc(loc);
        toast('Standort übernommen: ' + loc.place);
      }, function () {
        btn.disabled = false; btn.innerHTML = autoBtnHTML;
        toast('Standort nicht verfügbar – bitte Freigabe erlauben oder Ort eingeben.', 3200);
      });
    });
    document.getElementById('sunPlace').addEventListener('input', function (e) {
      const match = findCity(e.target.value);
      if (match) { document.getElementById('sunLat').value = match.lat; document.getElementById('sunLon').value = match.lon; }
    });
    document.getElementById('sunPlace').addEventListener('focus', function (e) { e.target.select(); });
    if (hadNoLoc) autoLocateIfGranted(applyLoc);
    document.getElementById('sunComputeBtn').addEventListener('click', function () {
      const lat = parseFloat(document.getElementById('sunLat').value);
      const lon = parseFloat(document.getElementById('sunLon').value);
      const offRaw = document.getElementById('sunOffset').value;
      const dateStr = document.getElementById('sunDate').value;
      const place = document.getElementById('sunPlace').value.trim();
      if (isNaN(lat) || isNaN(lon) || !dateStr) { toast('Bitte Ort bzw. Koordinaten und Datum angeben'); return; }
      astroSunState = { lat: lat, lon: lon, place: place, offset: offRaw === 'auto' ? 'auto' : parseFloat(offRaw), date: dateStr };
      saveLoc({ lat: lat, lon: lon, place: place || nearestPlaceName(lat, lon), auto: false });
      renderSunResult();
    });
    if (astroSunState.lat !== null && astroSunState.lon !== null) renderSunResult();
  }

  function renderSunResult() {
    const box = document.getElementById('sunResult');
    if (!box) return;
    const parts = astroSunState.date.split('-').map(Number);
    const localDate = new Date(parts[0], parts[1] - 1, parts[2]);
    let offset = astroSunState.offset, zoneLabel;
    if (offset === 'auto') {
      const r = resolveAutoOffset(astroSunState.place, astroSunState.date, '12:00');
      offset = r.offset; zoneLabel = offsetShortLabel(offset, r.tz);
    } else {
      zoneLabel = offsetShortLabel(offset);
    }
    const t = E.sunTimes(localDate, astroSunState.lat, astroSunState.lon, offset);
    function fmtTime(d) {
      if (!d) return '–';
      const local = new Date(d.getTime() + offset * 3600000);
      return String(local.getUTCHours()).padStart(2, '0') + ':' + String(local.getUTCMinutes()).padStart(2, '0');
    }
    const polarTxt = t.polarDay ? 'Polartag' : t.polarNight ? 'Polarnacht' : null;
    const dayLen = t.polarDay ? '24 Std.' : t.polarNight ? '0 Std.' : Math.floor(t.dayLengthHours) + ' Std. ' + Math.round((t.dayLengthHours % 1) * 60) + ' Min.';
    const where = astroSunState.place || nearestPlaceName(astroSunState.lat, astroSunState.lon);
    let html = '<h2 class="section-title">' + esc(where) + '<span class="title-sub">' + localDate.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) + ' · Zeiten in ' + esc(zoneLabel) + '</span></h2>';
    html += '<div class="stat-grid">';
    html += statTile('sunrise', 'Sonnenaufgang', polarTxt || fmtTime(t.sunrise), polarTxt ? (t.polarDay ? 'Sonne geht nicht unter' : 'Sonne geht nicht auf') : 'Uhr');
    html += statTile('sunset', 'Sonnenuntergang', polarTxt || fmtTime(t.sunset), polarTxt ? '' : 'Uhr');
    html += statTile('noon', 'Sonnenmittag', fmtTime(t.solarNoon), 'Uhr');
    html += statTile('hourglass', 'Taglänge', dayLen, '');
    html += '</div>';
    html += '<p class="hint small">Auf wenige Minuten genau (vereinfachtes Verfahren mit Standardrefraktion); lokale Horizontverdeckung durch Berge oder Gebäude ist nicht enthalten.</p>';
    box.innerHTML = html;
    textGlyphs(box);
  }

  function statTile(iconName, label, value, unit) {
    return '<div class="stat"><span class="stat-ic">' + ic(iconName) + '</span><span class="stat-label">' + esc(label) + '</span><span class="stat-value">' + esc(value) + (unit ? ' <small>' + esc(unit) + '</small>' : '') + '</span></div>';
  }

  function renderAstroPrecession() {
    const root = document.getElementById('astroPrecessionRoot');
    let html = '<div class="card">';
    html += '<p class="lead">Die Tierkreiszeichen der Astrologie (Widder bis Fische) sind an die <b>Jahreszeiten</b> gekoppelt: Widder beginnt fest am Frühlingsäquinoktium. Die <b>Sternbilder</b> am Himmel dagegen sind unterschiedlich große Flächen mit festen Grenzen. Vor rund 2.000 Jahren, als das astrologische System entstand, deckten sich beide noch ungefähr. Seitdem hat sich die Erdachse durch die <b>Präzession</b> (ein rund 26.000 Jahre dauerndes „Taumeln" der Erdachse) um etwa ein Zeichen weitergedreht – die Sonne steht an deinem Geburtstag heute astronomisch meist im <i>vorherigen</i> Sternbild.</p>';
    html += '</div>';
    html += '<div class="card flush"><table class="data-table"><thead><tr><th>Zeichen</th><th>Zeitraum</th><th>Sonne im Sternbild</th></tr></thead><tbody>';
    ZODIAC_CONSTELLATIONS.forEach(function (z, i) {
      html += '<tr><td class="nowrap">' + SIGNS_META[i].symbol + ' ' + esc(z.sign) + '</td><td class="nowrap">' + esc(z.dateRange) + '</td><td>' + esc(z.constellation) + '</td></tr>';
    });
    html += '</tbody></table></div>';
    html += '<div class="disclaimer-box">Die westliche Astrologie arbeitet bewusst mit dem <b>tropischen</b> Tierkreis (an die Jahreszeiten gekoppelt), nicht mit den tatsächlichen Sternbildern – das ist kein Fehler, sondern eine andere Definition von „Zeichen" als in der beobachtenden Astronomie. Ein 13. Sternbild, der Schlangenträger (Ophiuchus), wird von der Ekliptik ebenfalls durchquert, ist in der westlichen Astrologie aber traditionell nicht als eigenes Zeichen enthalten.</div>';
    root.innerHTML = html;
  }

  /* ---------------------------------------------------------------
     WELTRAUMKUNDE (Hub + Lexikon + Sternentwicklung + Zeitstrahl)
     --------------------------------------------------------------- */
  function renderWeltraum() {
    const root = document.getElementById('weltraumRoot');
    let html = '<p class="hint">Sterne, das Universum im Großen, die Feinheiten unseres Sonnensystems und die Geschichte der Raumfahrt – Hintergrundwissen ohne jede Deutung.</p>';
    html += '<div class="bento" id="weltraumBento"></div>';
    root.innerHTML = html;
    document.getElementById('weltraumBento').innerHTML =
      tile('grad-1', 'book', 'Lexikon', 'Sterne, Universum, Sonnensystem & Raumfahrt', 'weltraum-lexikon') +
      tile('grad-3', 'evolution', 'Sternentwicklung', 'Vom Nebel bis zum Schwarzen Loch', 'weltraum-sterne') +
      tile('grad-2', 'timeline', 'Raumfahrt-Zeitstrahl', 'Meilensteine von Sputnik bis heute', 'weltraum-zeitstrahl', true);
    bindTiles('weltraumBento');
  }

  const SPACE_CATS = [['all', 'Alle'], ['star', 'Sterne'], ['universe', 'Universum'], ['solar', 'Sonnensystem'], ['space', 'Raumfahrt']];
  let weltraumLexState = { filter: '', cat: 'all', openId: null };
  function renderWeltraumLexikon() {
    const root = document.getElementById('weltraumLexikonRoot');
    if (weltraumLexState.openId) {
      const g = spaceEntry(weltraumLexState.openId);
      if (g) {
        root.innerHTML = '<article class="card entry-card"><div class="entry-symbol">' + AWSym(g.symbol) + '</div><h2 class="section-title">' + esc(g.title) + '</h2><p>' + esc(g.body) + '</p></article>';
        return;
      }
    }
    let html = '<div class="field search-field">' + ic('search', 'field-ic') + '<input type="search" id="wxSearch" placeholder="Begriff suchen…" autocomplete="off" aria-label="Weltraumkunde-Lexikon durchsuchen" value="' + esc(weltraumLexState.filter) + '"></div>';
    html += '<div class="pill-select" role="tablist">' + SPACE_CATS.map(function (c) {
      return '<button type="button" role="tab" aria-selected="' + (weltraumLexState.cat === c[0]) + '" class="pill' + (weltraumLexState.cat === c[0] ? ' active' : '') + '" data-wxcat="' + c[0] + '">' + c[1] + '</button>';
    }).join('') + '</div>';
    const q = weltraumLexState.filter.toLowerCase();
    const filtered = SPACE_GLOSSARY.filter(function (g) {
      if (weltraumLexState.cat !== 'all' && g.cat !== weltraumLexState.cat) return false;
      if (!q) return true;
      return g.title.toLowerCase().indexOf(q) !== -1 || g.body.toLowerCase().indexOf(q) !== -1;
    });
    if (filtered.length) {
      html += '<div class="card list-card">' + filtered.map(function (g) {
        return listRow(g.symbol, g.title, g.body, 'data-wxopen="' + g.id + '"');
      }).join('') + '</div>';
    } else {
      html += emptyState('search', 'Keine Treffer.');
    }
    root.innerHTML = html;
    bindWeltraumLexControls(root);
    root.querySelectorAll('[data-wxopen]').forEach(function (row) {
      row.addEventListener('click', function () { weltraumLexState.openId = row.getAttribute('data-wxopen'); weltraumLexState.fromList = true; refreshTab('weltraum-lexikon'); });
    });
  }

  // Einheitliche, antippbare Listenzeile mit Kurzvorschau

  function listRow(symbol, title, body, attrs, symbolIsIcon) {
    const preview = body.length > 90 ? body.slice(0, 90).replace(/\s+\S*$/, '') + ' …' : body;
    return '<div class="aspect-row tappable" role="button" tabindex="0" ' + attrs + '><div class="aspect-symbol">' + (symbolIsIcon ? ic(symbol) : AWSym(symbol)) + '</div><div class="aspect-text"><b>' + esc(title) + '</b><span class="row-preview">' + esc(preview) + '</span></div><span class="row-chev">' + ic('chevron') + '</span></div>';
  }

  function bindWeltraumLexControls(root) {
    const search = document.getElementById('wxSearch');
    if (search) search.addEventListener('input', function (e) {
      const pos = e.target.selectionStart;
      weltraumLexState.filter = e.target.value;
      refreshTab('weltraum-lexikon', true);
      const el = document.getElementById('wxSearch');
      if (el) { el.focus(); el.setSelectionRange(pos, pos); }
    });
    root.querySelectorAll('[data-wxcat]').forEach(function (p) {
      p.addEventListener('click', function () { weltraumLexState.cat = p.getAttribute('data-wxcat'); weltraumLexState.openId = null; refreshTab('weltraum-lexikon', true); });
    });
  }

  function renderWeltraumSterne() {
    const root = document.getElementById('weltraumSterneRoot');
    let html = '<p class="hint">Wie ein Stern sein Leben verbringt, hängt fast ausschließlich von seiner Masse ab. Eigene, vereinfachte Darstellung – keine Fotografie.</p>';
    html += '<div class="card evo-card">';
    html += '<div class="evo-step"><span class="evo-dot">🌫️</span><span>' + esc(spaceEntry('star:entstehung').title) + '</span></div><div class="evo-arrow">' + ic('chevron') + '</div><div class="evo-step"><span class="evo-dot">⭐</span><span>' + esc(spaceEntry('star:hauptreihe').title) + '</span></div>';
    html += '<p>Jeder Stern beginnt als kollabierende Gaswolke und verbringt danach den größten Teil seines Lebens stabil auf der Hauptreihe. Danach trennen sich die Wege:</p>';
    html += '</div>';
    html += '<div class="card path-card"><div class="path-title">Sonnenähnliche Sterne</div><div class="path-sub">leicht bis mittelschwer</div><div class="path-steps">Hauptreihe → ' + esc(spaceEntry('star:roter-riese').title) + ' → ' + esc(spaceEntry('star:weisser-zwerg').title) + '</div></div>';
    html += '<div class="card path-card"><div class="path-title">Massereiche Sterne</div><div class="path-sub">ab ca. 8 Sonnenmassen</div><div class="path-steps">Hauptreihe → Roter Überriese → ' + esc(spaceEntry('star:supernova').title) + ' → ' + esc(spaceEntry('star:neutronenstern').title) + ' oder ' + esc(spaceEntry('star:schwarzes-loch').title) + '</div></div>';
    html += '<h2 class="section-title">Die Stationen im Detail</h2><div class="card list-card">';
    ['star:entstehung', 'star:hauptreihe', 'star:roter-riese', 'star:weisser-zwerg', 'star:supernova', 'star:neutronenstern', 'star:schwarzes-loch'].forEach(function (id) {
      const g = spaceEntry(id);
      html += listRow(g.symbol, g.title, g.body, 'data-wxopen2="' + g.id + '"');
    });
    html += '</div>';
    html += '<div class="disclaimer-box">Stark vereinfachtes Schema für den Überblick – tatsächlich hängt der genaue Verlauf zusätzlich von Faktoren wie Doppelsternpartnern oder chemischer Zusammensetzung ab.</div>';
    root.innerHTML = html;
    root.querySelectorAll('[data-wxopen2]').forEach(function (row) {
      row.addEventListener('click', function () { weltraumLexState = { filter: '', cat: 'all', openId: row.getAttribute('data-wxopen2') }; navigate('weltraum-lexikon'); });
    });
  }

  const SPACE_TIMELINE = [
    { year: '1957', id: 'space:sputnik' },
    { year: '1961', id: 'space:gagarin' },
    { year: '1969', id: 'space:apollo11' },
    { year: '1981–2011', id: 'space:spaceshuttle' },
    { year: 'seit 2000', id: 'space:iss' },
    { year: 'seit 1977', id: 'space:sonden' },
    { year: 'seit 2010er', id: 'space:wiederverwendbarkeit' }
  ];
  function renderWeltraumZeitstrahl() {
    const root = document.getElementById('weltraumZeitstrahlRoot');
    let html = '<p class="hint">Ausgewählte Meilensteine der Raumfahrtgeschichte – zum Weiterlesen antippen.</p>';
    html += '<div class="timeline">';
    SPACE_TIMELINE.forEach(function (item) {
      const g = spaceEntry(item.id);
      const preview = g.body.length > 110 ? g.body.slice(0, 110).replace(/\s+\S*$/, '') + ' …' : g.body;
      html += '<div class="tl-item tappable" role="button" tabindex="0" data-wxopen3="' + g.id + '"><div class="tl-year">' + esc(item.year) + '</div><div class="tl-body"><b>' + esc(g.title) + '</b><span>' + esc(preview) + '</span></div></div>';
    });
    html += '</div>';
    html += '<div class="disclaimer-box">Auswahl bekannter Meilensteine, keine vollständige Raumfahrtgeschichte. Reine Textdarstellung ohne Missionslogos oder Fotografien.</div>';
    root.innerHTML = html;
    root.querySelectorAll('[data-wxopen3]').forEach(function (row) {
      row.addEventListener('click', function () { weltraumLexState = { filter: '', cat: 'all', openId: row.getAttribute('data-wxopen3') }; navigate('weltraum-lexikon'); });
    });
  }

  /* ---------------------------------------------------------------
     ASTRONOMIE: JAHRESZEITEN-RECHNER
     --------------------------------------------------------------- */
  let astroSeasonsState = { year: new Date().getFullYear(), offset: null };
  function renderAstroSeasons() {
    const root = document.getElementById('astroSeasonsRoot');
    if (astroSeasonsState.offset === null) astroSeasonsState.offset = 'auto';
    let html = '<p class="hint">Die exakten astronomischen Zeitpunkte, an denen die Jahreszeiten beginnen – berechnet aus dem Sonnenstand, nicht aus dem Kalender. Sie bilden zugleich die Grundlage des tropischen Tierkreises der Astrologie, werden hier aber rein astronomisch betrachtet.</p>';
    html += '<div class="card form-card"><div class="field"><div class="row2">';
    html += '<div><label for="seasonYear">Jahr</label><input type="number" inputmode="numeric" id="seasonYear" min="1800" max="2100" value="' + astroSeasonsState.year + '"></div>';
    html += '<div><label for="seasonOffset">Zeitzone</label><select id="seasonOffset">' + timezoneOptionsHTML(astroSeasonsState.offset, 'Automatisch') + '</select></div>';
    html += '</div></div>';
    html += '<button type="button" class="btn" id="seasonComputeBtn">Berechnen</button></div>';
    html += '<div id="seasonResult"></div>';
    root.innerHTML = html;
    function apply() {
      astroSeasonsState.year = parseInt(document.getElementById('seasonYear').value, 10) || new Date().getFullYear();
      const v = document.getElementById('seasonOffset').value;
      astroSeasonsState.offset = v === 'auto' ? 'auto' : parseFloat(v);
      renderSeasonResult();
    }
    document.getElementById('seasonComputeBtn').addEventListener('click', apply);
    document.getElementById('seasonOffset').addEventListener('change', apply);
    renderSeasonResult();
  }

  function renderSeasonResult() {
    const box = document.getElementById('seasonResult');
    if (!box) return;
    const y = astroSeasonsState.year;
    const events = [
      { label: 'Frühlings-Tagundnachtgleiche', short: 'Frühlingsanfang', icon: 'sprout', lon: 0 },
      { label: 'Sommersonnenwende', short: 'Sommeranfang', icon: 'sun', lon: 90 },
      { label: 'Herbst-Tagundnachtgleiche', short: 'Herbstanfang', icon: 'leaf', lon: 180 },
      { label: 'Wintersonnenwende', short: 'Winteranfang', icon: 'snow', lon: 270 }
    ];
    let html = '<h2 class="section-title">Jahreszeiten ' + y + '</h2><div class="card list-card">';
    events.forEach(function (ev) {
      const d = E.findSolarLongitudeCrossing(y, ev.lon);
      let off, tz;
      if (astroSeasonsState.offset === 'auto') {
        // Versatz der Gerätezeitzone genau zu diesem Zeitpunkt (inkl. Sommerzeit)
        tz = deviceTzName();
        off = -new Date(d.getTime()).getTimezoneOffset() / 60;
      } else { off = astroSeasonsState.offset; }
      const local = new Date(d.getTime() + off * 3600000);
      const dateTxt = local.getUTCDate() + '. ' + ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'][local.getUTCMonth()];
      const timeTxt = String(local.getUTCHours()).padStart(2, '0') + ':' + String(local.getUTCMinutes()).padStart(2, '0') + ' Uhr ' + offsetShortLabel(off, tz);
      html += '<div class="aspect-row"><div class="aspect-symbol accent">' + ic(ev.icon) + '</div><div class="aspect-text"><b>' + esc(ev.label) + '</b><span class="row-preview">' + esc(ev.short) + '</span></div><div class="row-value"><b>' + dateTxt + '</b><span>' + timeTxt + '</span></div></div>';
    });
    html += '</div>';
    html += '<p class="hint small">Zeitpunkte auf etwa eine Viertelstunde genau (vereinfachtes Verfahren ohne Nutations- und Störungsterme). Bei „Automatisch" gilt die Zeitzone dieses Geräts inklusive Sommerzeit. Bezeichnungen für die Nordhalbkugel – auf der Südhalbkugel sind die Jahreszeiten vertauscht.</p>';
    box.innerHTML = html;
  }

  /* ---------------------------------------------------------------
     ASTRONOMIE: STERNENHIMMELKARTE
     --------------------------------------------------------------- */
  /* ---------------------------------------------------------------
     Gemeinsamer Standort (für Sonnenauf-/-untergang & Sternenhimmel)
     --------------------------------------------------------------- */
  const LOC_KEY = 'astrowahr.currentloc';
  function getSavedLoc() {
    let loc = null;
    try { loc = JSON.parse(localStorage.getItem(LOC_KEY) || 'null'); } catch (e) { return null; }
    // ältere Einträge hießen nur „Aktueller Standort" – durch den nächstgelegenen Ort ersetzen
    if (loc && isFinite(loc.lat) && isFinite(loc.lon) && (!loc.place || loc.place === 'Aktueller Standort')) loc.place = nearestPlaceName(loc.lat, loc.lon);
    return loc;
  }

  function saveLoc(loc) {
    try { localStorage.setItem(LOC_KEY, JSON.stringify(loc)); } catch (e) {}
  }
  function requestGeolocation(onOk, onErr) {
    if (!('geolocation' in navigator)) { onErr && onErr('nogeo'); return; }
    navigator.geolocation.getCurrentPosition(function (pos) {
      const lat = Math.round(pos.coords.latitude * 10000) / 10000, lon = Math.round(pos.coords.longitude * 10000) / 10000;
      const loc = { lat: lat, lon: lon, place: nearestPlaceName(lat, lon), auto: true };
      saveLoc(loc);
      onOk && onOk(loc);
    }, function (err) { onErr && onErr(err); }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 20 * 60 * 1000 });
  }

  function geoPermissionState(cb) {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then(function (status) {
        cb(status.state);
      }).catch(function () { cb('unknown'); });
    } else {
      cb('unknown');
    }
  }
  // Automatischer Standort hat nach erteilter Freigabe immer Vorrang: Ist die Berechtigung
  // bereits erteilt, wird der Standort ohne weiteren Klick automatisch ermittelt.
  function autoLocateIfGranted(onOk) {
    geoPermissionState(function (state) {
      if (state === 'granted') requestGeolocation(onOk, function () {});
    });
  }
  function openLocPicker(cb, initial) {
    const cur = initial || getSavedLoc() || { lat: '', lon: '', place: '' };
    const body =
      '<p class="hint">Für Angaben, die sich auf deinen aktuellen Standort beziehen. Geburtsorte werden immer separat eingegeben.</p>' +
      '<button type="button" class="btn" id="locAutoBtn" style="margin-bottom:12px;">' + ic('locate') + 'Standort automatisch verwenden</button>' +
      '<div class="field"><label for="locPlace">Ort</label><input type="text" id="locPlace" list="cityListLoc" placeholder="Stadt suchen oder frei eintragen" autocomplete="off" value="' + esc(cur.place || '') + '"><datalist id="cityListLoc">' + CITY_PRESETS.map(function (c) { return '<option value="' + esc(c.name) + '">'; }).join('') + '</datalist></div>' +
      '<div class="field"><div class="row2"><div><label for="locLat">Breitengrad</label><input type="number" inputmode="decimal" step="0.0001" id="locLat" value="' + (cur.lat !== '' && cur.lat != null ? cur.lat : '') + '"></div><div><label for="locLon">Längengrad</label><input type="number" inputmode="decimal" step="0.0001" id="locLon" value="' + (cur.lon !== '' && cur.lon != null ? cur.lon : '') + '"></div></div></div>' +
      '<button type="button" class="btn secondary" id="locOkBtn">Übernehmen</button>';
    openTextModal('Standort', body);
    document.getElementById('locPlace').addEventListener('input', function (e) {
      const match = findCity(e.target.value);
      if (match) { document.getElementById('locLat').value = match.lat; document.getElementById('locLon').value = match.lon; }
    });
    document.getElementById('locPlace').addEventListener('focus', function (e) { e.target.select(); });
    document.getElementById('locAutoBtn').addEventListener('click', function () {
      const btn = document.getElementById('locAutoBtn');
      btn.disabled = true; btn.innerHTML = ic('locate') + 'Ermittle Standort …';
      requestGeolocation(function (loc) {
        closeModal();
        cb(loc);
      }, function () {
        btn.disabled = false; btn.innerHTML = ic('locate') + 'Standort automatisch verwenden';
        toast('Standort nicht verfügbar – bitte Freigabe erlauben oder Ort eingeben.', 3200);
      });
    });
    document.getElementById('locOkBtn').addEventListener('click', function () {
      const lat = parseFloat(document.getElementById('locLat').value);
      const lon = parseFloat(document.getElementById('locLon').value);
      const place = document.getElementById('locPlace').value.trim();
      if (isNaN(lat) || isNaN(lon)) { toast('Bitte Ort oder Koordinaten angeben'); return; }
      const loc = { lat: lat, lon: lon, place: place || nearestPlaceName(lat, lon), auto: false };
      closeModal();
      cb(loc);
    });
  }

  /* ---------------------------------------------------------------
     STERNENHIMMEL (SterneWahr-Technologie, eingebettet)
     --------------------------------------------------------------- */
  function renderSternenhimmel() {
    const root = document.getElementById('sternenhimmelRoot');
    function paint() {
      const loc = getSavedLoc();
      if (loc && isFinite(loc.lat) && isFinite(loc.lon)) {
        setImmersive(true);
        const name = (loc.place && loc.place !== 'Aktueller Standort') ? loc.place : nearestPlaceName(loc.lat, loc.lon);
        const src = 'sternewahr-index.html?lat=' + encodeURIComponent(loc.lat) + '&lon=' + encodeURIComponent(loc.lon) + '&name=' + encodeURIComponent(name);
        // Ortswechsel erfolgt direkt im Sternenhimmel (Ortsname oben links antippen);
        // der gewählte Ort wird per Nachricht an AstroWahr zurückgemeldet und gespeichert.
        root.innerHTML =
          '<div class="sky-embed-wrap immersive">' +
          '<iframe src="' + src + '" title="Live-Sternenhimmel" allow="geolocation; camera; accelerometer; gyroscope; magnetometer"></iframe>' +
          '<button type="button" class="sky-float-btn sky-float-back" id="skyBackBtn" aria-label="Zurück">' + ic('back') + '</button>' +
          '</div>';
        document.getElementById('skyBackBtn').addEventListener('click', function () { goBack(); });
      } else {
        setImmersive(false);
        root.innerHTML = '<p class="hint" style="text-align:center; padding-top:24px;">Standort wird geprüft …</p>';
        geoPermissionState(function (state) {
          if (state === 'granted') {
            requestGeolocation(function () { paint(); }, function () { renderLocChoice(); });
          } else {
            renderLocChoice();
          }
        });
      }
    }
    function renderLocChoice() {
      setImmersive(false);
      let html = '<p class="hint">Ein echter, im Browser selbst berechneter Sternenhimmel für deinen Standort – mit Zeitreise, Sternschnuppenströmen, Sternenlicht-Laufzeiten und der Möglichkeit, besondere Himmelsmomente zu speichern.</p>';
      html += '<div class="card center-card">' +
        '<div class="center-ic">' + ic('pin') + '</div>' +
        '<h3>Wo stehst du?</h3>' +
        '<p class="hint">Für den Sternenhimmel deines Ortes braucht AstroWahr deinen Standort – einmalig, danach gemerkt. Er verlässt dein Gerät nicht.</p>' +
        '<button type="button" class="btn" id="skyAutoLoc">' + ic('locate') + 'Standort automatisch verwenden</button>' +
        '<button type="button" class="btn secondary" id="skyManualLoc" style="margin-top:8px;">Ort manuell eingeben</button>' +
        '</div>';
      root.innerHTML = html;
      const autoBtn = document.getElementById('skyAutoLoc');
      if (autoBtn) autoBtn.addEventListener('click', function () {
        autoBtn.disabled = true; autoBtn.innerHTML = ic('locate') + 'Ermittle Standort …';
        requestGeolocation(function () { paint(); }, function () {
          autoBtn.disabled = false; autoBtn.innerHTML = ic('locate') + 'Standort automatisch verwenden';
          toast('Standort nicht verfügbar – bitte Freigabe erlauben oder Ort eingeben.', 3200);
        });
      });
      const manBtn = document.getElementById('skyManualLoc');
      if (manBtn) manBtn.addEventListener('click', function () { openLocPicker(function (l) { saveLoc(l); paint(); }); });
    }
    paint();
  }

  // Mondphase als kleine Grafik (Beleuchtung und zu-/abnehmende Seite korrekt, Nordhalbkugel)

  function moonSVG(phase, size, onDark) {
    const s = size || 28, r = 10, cx = 12, cy = 12;
    const k = Math.max(0, Math.min(1, phase.illumination));
    const waxing = phase.age < phase.synodic / 2;
    const rx = Math.abs(1 - 2 * k) * r;
    const outerSweep = waxing ? 1 : 0;
    const gibbous = k > 0.5;
    const termSweep = waxing ? (gibbous ? 1 : 0) : (gibbous ? 0 : 1);
    const lit = '#F6EFD6', dark = onDark ? 'rgba(255,255,255,0.14)' : 'var(--moon-dark)';
    let svg = '<svg class="moon-ic" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" aria-hidden="true">';
    svg += '<circle cx="12" cy="12" r="10" fill="' + dark + '"/>';
    if (k > 0.01) {
      if (k > 0.99) svg += '<circle cx="12" cy="12" r="10" fill="' + lit + '"/>';
      else svg += '<path fill="' + lit + '" d="M' + cx + ' ' + (cy - r) + ' A' + r + ' ' + r + ' 0 0 ' + outerSweep + ' ' + cx + ' ' + (cy + r) + ' A' + rx.toFixed(2) + ' ' + r + ' 0 0 ' + termSweep + ' ' + cx + ' ' + (cy - r) + 'Z"/>';
    }
    svg += '<circle cx="12" cy="12" r="10" fill="none" stroke="' + (onDark ? 'rgba(255,255,255,0.35)' : 'var(--border-strong)') + '" stroke-width="0.8"/>';
    svg += '</svg>';
    return svg;
  }



  function tile(grad, iconName, title, sub, tabTarget, wide, extraClass) {
    return '<button type="button" class="tile' + (wide ? ' wide' : '') + (extraClass ? ' ' + extraClass : '') + '" data-goto="' + tabTarget + '">' +
      '<span class="tile-badge" style="background:var(--' + grad + ')">' + ic(iconName) + '</span>' +
      '<span class="tile-body"><span class="tile-title">' + esc(title) + '</span><span class="tile-sub">' + esc(sub) + '</span></span></button>';
  }

  function bindTiles(containerId) {
    document.getElementById(containerId).querySelectorAll('[data-goto]').forEach(function (el) {
      el.addEventListener('click', function () { navigate(el.dataset.goto); });
    });
  }

  function profileRowHTML(p, context) {
    const dateStr = p.date.split('-').reverse().join('.');
    let signTxt = '';
    try { const c = computeChart(p); signTxt = SIGNS_META[c.planets[0].sign.index].symbol + ' ' + c.planets[0].sign.sign + (c.asc !== null ? ' · AC ' + E.lonToSign(c.asc).sign : ''); } catch (e) {}
    return '<div class="profile-row" data-id="' + p.id + '">' +
      '<button type="button" class="profile-main" data-act="open" data-ctx="' + context + '"><span class="pname">' + esc(p.label) + '</span><span class="pmeta">' + dateStr + (p.timeUnknown ? '' : ', ' + esc(p.time) + ' Uhr') + (p.place ? ' · ' + esc(p.place) : '') + '</span>' + (signTxt ? '<span class="psign">' + signTxt + '</span>' : '') + '</button>' +
      '<div class="pactions"><button type="button" class="icon-btn" data-act="del" aria-label="Profil löschen">' + ic('trash') + '</button>' +
      '<span class="row-chev">' + ic('chevron') + '</span></div></div>';
  }

  function bindProfileRows(container, defaultCtx) {
    container.querySelectorAll('.profile-row').forEach(function (row) {
      const id = row.dataset.id;
      row.querySelectorAll('[data-act="open"]').forEach(function (b) {
        b.addEventListener('click', function () {
          const ctx = b.dataset.ctx || defaultCtx;
          if (ctx === 'chart') {
            const inChartList = navHistory[navHistory.length - 1] === 'chart';
            chartState = { view: 'result', activeId: id, fromList: inChartList };
            if (inChartList) renderActiveTab('chart'); else navigate('chart');
          }
        });
      });
      row.querySelectorAll('[data-act="del"]').forEach(function (b) {
        b.addEventListener('click', function () {
          const prof = getProfile(id);
          confirmDialog({ title: 'Profil löschen?', text: '„' + (prof ? prof.label : 'Profil') + '“ wird dauerhaft von diesem Gerät entfernt.', okLabel: 'Löschen', danger: true }, function () { deleteProfile(id); toast('Profil gelöscht'); refreshTab(currentTabName(), true); });
        });
      });
    });
  }

  function currentTabName() {
    const active = document.querySelector('section.tab.active');
    return active ? active.id.replace('tab-', '') : 'start';
  }

  /* ---------------------------------------------------------------
     TAGESHOROSKOP
     --------------------------------------------------------------- */
  let selectedHoroskopSign = null;
  function renderHoroskop() {
    const grid = document.getElementById('horoskopSignGrid');
    if (selectedHoroskopSign === null) {
      const profiles = getProfiles();
      if (profiles.length) {
        try { selectedHoroskopSign = computeChart(profiles[profiles.length - 1]).planets[0].sign.index; } catch (e) { selectedHoroskopSign = 0; }
      } else {
        selectedHoroskopSign = E.lonToSign(E.computePositions(new Date()).sonne.lon).index;
      }
    }
    grid.innerHTML = SIGNS_META.map(function (s, i) {
      return '<button type="button" class="sign-tile' + (i === selectedHoroskopSign ? ' selected' : '') + '" aria-pressed="' + (i === selectedHoroskopSign) + '" data-idx="' + i + '"><span class="glyph">' + s.symbol + '</span><span class="name">' + E.SIGNS[i] + '</span></button>';
    }).join('');
    grid.querySelectorAll('.sign-tile').forEach(function (t) {
      t.addEventListener('click', function () { selectedHoroskopSign = parseInt(t.dataset.idx, 10); renderHoroskop(); textGlyphs(document.getElementById('tab-horoskop')); });
    });
    renderHoroskopResult(selectedHoroskopSign);
  }

  function renderHoroskopResult(idx) {
    const now = new Date();
    const dateKey = localDateKey(now);
    const rand = seededRand(dateKey + '-astrowahr-' + idx);
    const meta = SIGNS_META[idx];
    const pool = ELEMENT_POOLS[meta.element];
    const impulsText = pool[Math.floor(rand() * pool.length)];
    const focus = FOCUS_AREAS[Math.floor(rand() * FOCUS_AREAS.length)];
    const positions = E.computePositions(now);
    const sunSign = E.lonToSign(positions.sonne.lon);
    const moonSign = E.lonToSign(positions.mond.lon);
    let sonnenSaison = '';
    if (sunSign.index === idx) {
      sonnenSaison = '<div class="notice-box soft">☉ Gerade ist Sonnensaison für ' + E.SIGNS[idx] + ' – traditionell ein guter Zeitraum für Neuanfänge.</div>';
    }
    document.getElementById('horoskopResult').innerHTML =
      '<div class="card horo-card">' +
      '<div class="horo-head"><span class="horo-glyph">' + meta.symbol + '</span><div><div class="horo-title">' + glossLink('sign:' + idx, E.SIGNS[idx]) + '</div><div class="horo-meta">' + glossLink('element:' + meta.element, meta.element) + ' · ' + glossLink('quality:' + meta.quality, meta.quality) + ' · Herrscher ' + glossLink('planet:' + (RULER_TO_PLANET_KEY[meta.ruler] || ''), meta.ruler) + '</div></div>' +
      '<div class="horo-date">' + now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }) + '</div></div>' +
      '<div class="horo-impulse"><span class="horo-label">Heutiger Impuls</span>' + esc(impulsText) + '</div>' +
      '<div class="horo-row"><span class="horo-label">Fokus heute</span><b>' + esc(focus) + '</b></div>' +
      '<p class="horo-traits">' + esc(meta.traits) + '</p>' +
      '<p class="horo-moon">Der Mond steht heute in ' + SIGNS_META[moonSign.index].symbol + ' ' + glossLink('sign:' + moonSign.index, E.SIGNS[moonSign.index]) + ' (' + fmtDeg(moonSign.degree) + ').</p>' +
      sonnenSaison +
      '</div>' +
      '<div class="disclaimer-box">Astrologische Impulse dienen der Unterhaltung und Selbstreflexion – sie ersetzen keine medizinische, psychologische, rechtliche oder finanzielle Beratung.</div>';
  }

  /* ---------------------------------------------------------------
     GEBURTSHOROSKOP (Chart)
     --------------------------------------------------------------- */
  function renderChart() {
    const root = document.getElementById('chartRoot');
    if (chartState.view === 'form') { renderChartForm(root); return; }
    if (chartState.view === 'result' && chartState.activeId) { renderChartResult(root, chartState.activeId); return; }
    renderChartList(root);
  }

  function renderChartList(root) {
    const profiles = getProfiles();
    let html = '<p class="hint">Lege ein Geburtshoroskop mit Datum, Uhrzeit und Geburtsort an – die Planetenpositionen werden direkt auf deinem Gerät berechnet.</p>';
    html += '<button type="button" class="btn" id="chartNewBtn">' + ic('plus') + 'Neues Geburtshoroskop</button>';
    if (profiles.length) {
      html += '<h2 class="section-title">Gespeichert</h2>';
      html += profiles.slice().reverse().map(function (p) { return profileRowHTML(p, 'chart'); }).join('');
    } else {
      html += emptyState('seasons', 'Noch keine Geburtshoroskope gespeichert.');
    }
    root.innerHTML = html;
    document.getElementById('chartNewBtn').addEventListener('click', openNewChartForm);
    bindProfileRows(root, 'chart');
  }

  // Zeitzone bei der Geburt: bekannte Stadt → deren Zeitzone, sonst deutsche Regeln (historisch korrekt)

  function resolveBirthOffset(place, dateStr, timeStr) {
    const city = findCity(place);
    const tz = city ? city.tz : 'Europe/Berlin';
    let off = dateStr ? tzOffsetHours(tz, dateStr, timeStr || '12:00') : null;
    if (off === null) off = tz === 'Europe/Berlin' ? germanOffsetFallback(dateStr) : 1;
    return { offset: off, tz: tz, city: city };
  }

  function birthOffsetHint(r, dateStr) {
    if (!dateStr) return 'Wird nach Eingabe von Datum und Ort automatisch ermittelt – inklusive historischer Sommerzeit-Regeln.';
    const d = dateStr.split('-').reverse().join('.');
    const zone = offsetShortLabel(r.offset, r.tz) + ' (UTC' + (r.offset >= 0 ? '+' : '−') + fmtNum(Math.abs(r.offset), r.offset % 1 ? 1 : 0) + ')';
    const where = r.city ? r.city.name : 'Deutschland';
    let txt = 'Am ' + d + ' galt in ' + where + ': ' + zone + '.';
    if (!r.city) txt += ' Bei einer Geburt außerhalb Deutschlands bitte die Zeitzone von Hand wählen.';
    return txt;
  }

  function renderChartForm(root) {
    const editing = !!chartState.editId;
    const existing = editing ? getProfile(chartState.editId) : null;
    const tzAuto = existing ? !!existing.tzAuto : true;
    let html = '<h2 class="section-title">' + (editing ? 'Geburtshoroskop bearbeiten' : 'Neues Geburtshoroskop') + '</h2>';
    html += '<div class="card form-card">';
    html += '<div class="field"><label for="fLabel">Name</label><input type="text" id="fLabel" placeholder="z. B. Jan" autocomplete="off" autocapitalize="words" data-lpignore="true" value="' + esc(existing ? existing.label : '') + '"></div>';
    html += '<div class="field"><div class="row2"><div><label for="fDate">Geburtsdatum</label><input type="date" id="fDate" max="2100-12-31" value="' + (existing ? existing.date : '') + '"></div>';
    html += '<div id="fTimeField"' + (existing && existing.timeUnknown ? ' class="is-disabled"' : '') + '><label for="fTime">Uhrzeit</label><input type="time" id="fTime" value="' + (existing && existing.time ? existing.time : '') + '"' + (existing && existing.timeUnknown ? ' disabled' : '') + '></div></div></div>';
    html += '<label class="checkbox-row" for="fTimeUnknown"><input type="checkbox" id="fTimeUnknown" ' + (existing && existing.timeUnknown ? 'checked' : '') + '><span>Geburtszeit unbekannt <small>(dann ohne Aszendent und Häuser)</small></span></label>';
    html += '<div class="field"><label for="fPlace">Geburtsort</label><input type="text" id="fPlace" list="cityList" placeholder="Stadt suchen oder frei eintragen" autocomplete="off" value="' + esc(existing ? existing.place || '' : '') + '"><datalist id="cityList">' + CITY_PRESETS.map(function (c) { return '<option value="' + esc(c.name) + '">'; }).join('') + '</datalist></div>';
    html += '<div class="field"><div class="row2"><div><label for="fLat">Breitengrad</label><input type="number" inputmode="decimal" step="0.0001" id="fLat" placeholder="53,7167" value="' + (existing ? existing.lat : '') + '"></div><div><label for="fLon">Längengrad</label><input type="number" inputmode="decimal" step="0.0001" id="fLon" placeholder="10,0333" value="' + (existing ? existing.lon : '') + '"></div></div>';
    html += '<p class="field-hint">Bei Städten aus der Vorschlagsliste werden die Koordinaten automatisch ergänzt, sonst z. B. aus einer Karten-App übernehmen.</p></div>';
    html += '<div class="field"><label for="fOffset">Zeitzone bei der Geburt</label><select id="fOffset">' + timezoneOptionsHTML(tzAuto ? 'auto' : existing.utcOffset, 'Automatisch (nach Ort und Datum)') + '</select><p class="field-hint" id="fOffsetHint"></p></div>';
    html += '<button type="button" class="btn" id="fSubmit">' + (editing ? 'Änderungen speichern' : 'Berechnen & speichern') + '</button>';
    html += '</div>';
    html += '<p class="hint small">Ohne genaue Uhrzeit lassen sich Aszendent, Häuser und die exakte Mondposition nicht zuverlässig berechnen – Sonnenzeichen und die meisten Planetenzeichen bleiben aber gültig.</p>';
    root.innerHTML = html;

    const $ = function (id) { return document.getElementById(id); };
    function updateOffsetHint() {
      const hint = $('fOffsetHint');
      if (!hint) return;
      if ($('fOffset').value !== 'auto') { hint.textContent = 'Von Hand gewählt. „Automatisch" berücksichtigt Sommerzeit und historische Regeln.'; return; }
      const r = resolveBirthOffset($('fPlace').value, $('fDate').value, $('fTimeUnknown').checked ? '12:00' : ($('fTime').value || '12:00'));
      hint.textContent = birthOffsetHint(r, $('fDate').value);
    }
    $('fTimeUnknown').addEventListener('change', function (e) {
      $('fTime').disabled = e.target.checked;
      $('fTimeField').classList.toggle('is-disabled', e.target.checked);
      updateOffsetHint();
    });
    ['fDate', 'fTime', 'fOffset'].forEach(function (id) { $(id).addEventListener('change', updateOffsetHint); });
    $('fPlace').addEventListener('input', function (e) {
      const match = findCity(e.target.value);
      if (match) { $('fLat').value = match.lat; $('fLon').value = match.lon; }
      updateOffsetHint();
    });
    updateOffsetHint();
    $('fSubmit').addEventListener('click', function () {
      const label = $('fLabel').value.trim() || 'Ohne Namen';
      const date = $('fDate').value;
      const timeUnknown = $('fTimeUnknown').checked;
      const time = $('fTime').value;
      const lat = parseFloat($('fLat').value);
      const lon = parseFloat($('fLon').value);
      const place = $('fPlace').value.trim();
      if (!date) { toast('Bitte ein Geburtsdatum angeben'); $('fDate').focus(); return; }
      if (!timeUnknown && !time) { toast('Bitte eine Uhrzeit angeben oder „unbekannt" wählen'); $('fTime').focus(); return; }
      if (isNaN(lat) || isNaN(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) { toast('Bitte gültige Koordinaten angeben'); $('fLat').focus(); return; }
      const auto = $('fOffset').value === 'auto';
      const offset = auto ? resolveBirthOffset(place, date, timeUnknown ? '12:00' : time).offset : parseFloat($('fOffset').value);
      const data = { label: label, date: date, time: timeUnknown ? null : time, timeUnknown: timeUnknown, utcOffset: offset, tzAuto: auto, lat: lat, lon: lon, place: place };
      let p;
      if (editing) { p = updateProfile(chartState.editId, data); toast('Änderungen gespeichert'); }
      else { p = addProfile(data); toast('Gespeichert'); }
      chartState = { view: 'result', activeId: p.id, fromList: true };
      renderActiveTab('chart');
    });
  }

  function renderChartResult(root, id) {
    const p = getProfile(id);
    if (!p) { chartState = { view: 'list', activeId: null }; renderChartList(root); return; }
    const chart = computeChart(p);
    const sun = chart.planets[0], moon = chart.planets[1];
    let html = '<div class="chart-head"><h2 class="section-title">' + esc(p.label) + '</h2>';
    html += '<p class="hint">' + p.date.split('-').reverse().join('.') + (p.timeUnknown ? ' · Uhrzeit unbekannt' : ' · ' + p.time + ' Uhr') + (p.place ? ' · ' + esc(p.place) : '') + ' · ' + offsetShortLabel(p.utcOffset, (findCity(p.place) || {}).tz) + '</p></div>';

    // Hinweis bei möglicherweise falscher Zeitzone (ältere Profile vor der Sommerzeit-Korrektur)
    if (!p.tzAuto && p.date) {
      const r = resolveBirthOffset(p.place, p.date, p.time || '12:00');
      const knownRegion = r.city || !p.place || /deutschland|germany/i.test(p.place);
      if (knownRegion && r.offset !== p.utcOffset && (p.utcOffset === 1 || p.utcOffset === 2)) {
        html += '<div class="notice-box" id="tzNotice"><b>Zeitzone prüfen:</b> Gespeichert ist ' + offsetShortLabel(p.utcOffset) + ', am ' + p.date.split('-').reverse().join('.') + ' galt ' + (r.city ? 'in ' + esc(r.city.name) : 'in Deutschland') + ' aber ' + offsetShortLabel(r.offset, r.tz) + '. Das verschiebt Aszendent und Häuser.<button type="button" class="btn small" id="tzFixBtn">Auf ' + offsetShortLabel(r.offset, r.tz) + ' korrigieren</button></div>';
      }
    }

    html += '<div class="big-three">' +
      '<div><span class="bt-label">Sonne</span><span class="bt-glyph">' + SIGNS_META[sun.sign.index].symbol + '</span><span class="bt-value">' + sun.sign.sign + '</span></div>' +
      '<div><span class="bt-label">Mond</span><span class="bt-glyph">' + SIGNS_META[moon.sign.index].symbol + '</span><span class="bt-value">' + moon.sign.sign + '</span></div>' +
      (chart.asc !== null ? '<div><span class="bt-label">Aszendent</span><span class="bt-glyph">' + SIGNS_META[E.lonToSign(chart.asc).index].symbol + '</span><span class="bt-value">' + E.lonToSign(chart.asc).sign + '</span></div>' : '<div><span class="bt-label">Aszendent</span><span class="bt-glyph">–</span><span class="bt-value">ohne Uhrzeit</span></div>') +
      '</div>';

    html += '<button type="button" class="chart-wrap" id="chartZoomBtn" aria-label="Horoskop vergrößern">' + buildWheelSVG(chart) + '<span class="zoom-hint">' + ic('zoom') + 'Vergrößern</span></button>';
    if (p.timeUnknown) html += '<div class="disclaimer-box">Ohne Geburtszeit werden Aszendent und Häuser nicht berechnet; die Mondposition ist auf 12:00 Uhr bezogen und kann bis zu etwa 7° abweichen.</div>';

    // Elemente-Verteilung
    const elCount = { Feuer: 0, Erde: 0, Luft: 0, Wasser: 0 };
    chart.planets.forEach(function (pl) { elCount[SIGNS_META[pl.sign.index].element]++; });
    html += '<h2 class="section-title">Elemente</h2><div class="card element-card">' + Object.keys(elCount).map(function (k) {
      return '<div class="el-row">' + glossLink('element:' + k, k) + '<span class="el-bar"><span class="el-fill el-' + k.toLowerCase() + '" style="width:' + (elCount[k] * 10) + '%"></span></span><span class="el-num">' + elCount[k] + '</span></div>';
    }).join('') + '</div>';

    html += '<h2 class="section-title">Planeten</h2>';
    html += '<div class="card flush"><table class="data-table"><thead><tr><th></th><th>Planet</th><th>Zeichen</th><th class="num">Grad</th>' + (chart.houses ? '<th class="num">Haus ' + infoBtn('general:haussystem') + '</th>' : '') + '</tr></thead><tbody>';
    chart.planets.forEach(function (pl) {
      html += '<tr><td class="glyph-cell">' + pl.meta.symbol + '</td><td>' + glossLink('planet:' + pl.key, pl.meta.name) + '</td><td class="nowrap">' + SIGNS_META[pl.sign.index].symbol + ' ' + glossLink('sign:' + pl.sign.index, pl.sign.sign) + '</td><td class="num nowrap">' + fmtDeg(pl.sign.degree) + '</td>' + (chart.houses ? '<td class="num">' + (pl.house ? glossLink('house:' + pl.house, String(pl.house)) : '–') + '</td>' : '') + '</tr>';
    });
    if (chart.asc !== null) {
      const ascSign = E.lonToSign(chart.asc), mcSign = E.lonToSign(chart.mc);
      html += '<tr class="axis-row"><td class="glyph-cell">AC</td><td>' + glossLink('general:aszendent', 'Aszendent') + '</td><td class="nowrap">' + SIGNS_META[ascSign.index].symbol + ' ' + glossLink('sign:' + ascSign.index, ascSign.sign) + '</td><td class="num nowrap">' + fmtDeg(ascSign.degree) + '</td><td class="num">1</td></tr>';
      html += '<tr class="axis-row"><td class="glyph-cell">MC</td><td>' + glossLink('general:mc', 'Medium Coeli') + '</td><td class="nowrap">' + SIGNS_META[mcSign.index].symbol + ' ' + glossLink('sign:' + mcSign.index, mcSign.sign) + '</td><td class="num nowrap">' + fmtDeg(mcSign.degree) + '</td><td class="num">10</td></tr>';
    }
    html += '</tbody></table></div>';

    html += '<h2 class="section-title">Aspekte <span class="count">' + chart.aspects.length + '</span> ' + infoBtn('general:orb') + '</h2>';
    if (!chart.aspects.length) {
      html += '<p class="hint">Keine Aspekte innerhalb der verwendeten Orben gefunden.</p>';
    } else {
      html += '<p class="hint small">Die exaktesten (stärksten) Aspekte stehen oben.</p>';
      const rows = chart.aspects.map(function (item) {
        const seed = PLANETS_META.indexOf(item.a.meta) * 11 + PLANETS_META.indexOf(item.b.meta) * 3;
        const text = aspectConnector(item.aspect.name, item.a.meta.short, item.b.meta.short, seed);
        return aspectRowHTML(item.aspect.symbol, glossLink('planet:' + item.a.key, item.a.meta.name) + ' ' + glossLink('aspect:' + item.aspect.name, item.aspect.name) + ' ' + glossLink('planet:' + item.b.key, item.b.meta.name), esc(text), item.aspect.orb, item.aspect.name);
      });
      html += collapsibleList(rows, 6, 'Alle weiteren Aspekte anzeigen (%n)');
    }

    html += '<div class="action-row">';
    html += '<button type="button" class="btn secondary" id="chartEditBtn">' + ic('edit') + 'Bearbeiten</button>';
    html += '<button type="button" class="btn danger" id="chartDelBtn">' + ic('trash') + 'Löschen</button></div>';
    html += '<div class="disclaimer-box">Astrologische Deutungen dienen der Unterhaltung und Selbstreflexion – sie sind nicht wissenschaftlich belegt und ersetzen keine Beratung.</div>';
    root.innerHTML = html;
    document.getElementById('chartEditBtn').addEventListener('click', function () { chartState = { view: 'form', activeId: null, editId: id, fromList: chartState.fromList }; refreshTab('chart'); });
    document.getElementById('chartZoomBtn').addEventListener('click', function () { openImageModal(buildWheelSVG(chart)); });
    const fixBtn = document.getElementById('tzFixBtn');
    if (fixBtn) fixBtn.addEventListener('click', function () {
      const r = resolveBirthOffset(p.place, p.date, p.time || '12:00');
      updateProfile(id, { utcOffset: r.offset, tzAuto: true });
      toast('Zeitzone korrigiert');
      refreshTab('chart', true);
    });
    document.getElementById('chartDelBtn').addEventListener('click', function () {
      confirmDialog({ title: 'Profil löschen?', text: '„' + p.label + '“ wird dauerhaft von diesem Gerät entfernt.', okLabel: 'Löschen', danger: true }, function () { deleteProfile(id); chartState = { view: 'list', activeId: null }; refreshTab('chart'); toast('Profil gelöscht'); });
    });
  }

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* ---------------------------------------------------------------
     TRANSITE
     --------------------------------------------------------------- */
  function renderTransite() {
    const root = document.getElementById('transiteRoot');
    const profiles = getProfiles();
    let html = '<p class="hint">Vergleicht die aktuellen Planetenstände mit deinem Geburtshoroskop und zeigt, welche Aspekte gerade aktiv sind.</p>';
    if (!profiles.length) {
      html += emptyState('orbit', 'Für Transite brauchst du ein gespeichertes Geburtshoroskop.', '<button type="button" class="btn small" id="trNewChart">' + ic('plus') + 'Geburtshoroskop anlegen</button>');
      root.innerHTML = html;
      document.getElementById('trNewChart').addEventListener('click', openNewChartForm);
      return;
    }
    if (!transiteState.activeId || !getProfile(transiteState.activeId)) transiteState.activeId = profiles[profiles.length - 1].id;
    html += '<div class="pill-select" id="transitePills" role="tablist">' + profiles.map(function (p) {
      return '<button type="button" role="tab" aria-selected="' + (p.id === transiteState.activeId) + '" class="pill' + (p.id === transiteState.activeId ? ' active' : '') + '" data-id="' + p.id + '">' + esc(p.label) + '</button>';
    }).join('') + '</div>';
    html += '<div id="transiteResult"></div>';
    root.innerHTML = html;
    root.querySelectorAll('.pill').forEach(function (pill) {
      pill.addEventListener('click', function () { transiteState.activeId = pill.dataset.id; refreshTab('transite', true); });
    });
    renderTransiteResult(transiteState.activeId);
  }

  function renderTransiteResult(id) {
    const box = document.getElementById('transiteResult');
    if (!box) return;
    const p = getProfile(id);
    if (!p) return;
    const natal = computeChart(p);
    const now = new Date();
    const transitPositions = E.computePositions(now);
    const transitPlanets = PLANETS_META.map(function (meta) {
      const pos = transitPositions[meta.key];
      return { meta: meta, lon: pos.lon, sign: E.lonToSign(pos.lon) };
    });
    const hits = [];
    transitPlanets.forEach(function (tp) {
      natal.planets.forEach(function (np) {
        const a = E.findAspect(tp.lon, np.lon, 0.4);
        if (a) hits.push({ tp: tp, np: np, aspect: a });
      });
    });
    hits.sort(function (x, y) { return x.aspect.orb - y.aspect.orb; });

    let html = '<h2 class="section-title">Aktive Transite <span class="count">' + hits.length + '</span> ' + infoBtn('general:transit') + '</h2>';
    if (!hits.length) {
      html += '<p class="hint">Aktuell steht kein Planet in engem Aspekt zu einem Planeten deines Geburtshoroskops.</p>';
    } else {
      html += '<p class="hint small">Enger Toleranzbereich – nur gerade wirksame Aspekte, die exaktesten oben.</p>';
      const rows = hits.map(function (h) {
        const seed = PLANETS_META.indexOf(h.tp.meta) * 7 + PLANETS_META.indexOf(h.np.meta);
        const text = aspectConnector(h.aspect.name, h.tp.meta.art + ' laufende ' + h.tp.meta.name, h.np.meta.short + ' im Geburtshoroskop', seed);
        return aspectRowHTML(h.aspect.symbol, glossLink('planet:' + h.tp.meta.key, h.tp.meta.name) + ' ' + glossLink('aspect:' + h.aspect.name, h.aspect.name) + ' Geburts-' + glossLink('planet:' + h.np.meta.key, h.np.meta.name), esc(text), h.aspect.orb, h.aspect.name);
      });
      html += collapsibleList(rows, 6, 'Weitere Transite anzeigen (%n)');
    }
    html += '<h2 class="section-title">Aktuelle Stellungen</h2>';
    html += '<div class="card flush"><table class="data-table"><thead><tr><th></th><th>Planet</th><th>Zeichen</th><th class="num">Grad</th></tr></thead><tbody>';
    transitPlanets.forEach(function (tp) {
      html += '<tr><td class="glyph-cell">' + tp.meta.symbol + '</td><td>' + tp.meta.name + '</td><td class="nowrap">' + SIGNS_META[tp.sign.index].symbol + ' ' + tp.sign.sign + '</td><td class="num nowrap">' + fmtDeg(tp.sign.degree) + '</td></tr>';
    });
    html += '</tbody></table></div>';
    html += '<div class="disclaimer-box">Transite zeigen aktuelle astronomische Stellungen im Vergleich zu deinem Geburtshoroskop – sie dienen der Reflexion, nicht der Vorhersage konkreter Ereignisse.</div>';
    box.innerHTML = html;
  }

  /* ---------------------------------------------------------------
     KOMPATIBILITÄT (Synastrie)
     --------------------------------------------------------------- */
  function renderKompat() {
    const root = document.getElementById('kompatRoot');
    const profiles = getProfiles();
    let html = '<p class="hint">Vergleicht zwei gespeicherte Geburtshoroskope (Synastrie) und zeigt die Aspekte zwischen beiden Planetenbildern.</p>';
    if (profiles.length < 2) {
      html += emptyState('rings', profiles.length ? 'Für einen Vergleich brauchst du ein zweites Geburtshoroskop.' : 'Für einen Vergleich brauchst du zwei gespeicherte Geburtshoroskope.', '<button type="button" class="btn small" id="kNewChart">' + ic('plus') + 'Geburtshoroskop anlegen</button>');
      root.innerHTML = html;
      document.getElementById('kNewChart').addEventListener('click', openNewChartForm);
      return;
    }
    html += '<div class="card form-card"><div class="field"><div class="row2">';
    html += '<div><label for="kA">Person A</label><select id="kA">' + profiles.map(function (p) { return '<option value="' + p.id + '">' + esc(p.label) + '</option>'; }).join('') + '</select></div>';
    html += '<div><label for="kB">Person B</label><select id="kB">' + profiles.map(function (p) { return '<option value="' + p.id + '">' + esc(p.label) + '</option>'; }).join('') + '</select></div>';
    html += '</div></div><button type="button" class="btn" id="kCompute">Vergleichen</button></div>';
    html += '<div id="kompatResult"></div>';
    root.innerHTML = html;
    if (kompatState.idA && getProfile(kompatState.idA)) document.getElementById('kA').value = kompatState.idA;
    if (kompatState.idB && getProfile(kompatState.idB)) document.getElementById('kB').value = kompatState.idB;
    else document.getElementById('kB').selectedIndex = Math.min(1, profiles.length - 1);
    document.getElementById('kCompute').addEventListener('click', function () {
      kompatState.idA = document.getElementById('kA').value;
      kompatState.idB = document.getElementById('kB').value;
      renderKompatResult();
      textGlyphs(document.getElementById('kompatResult'));
    });
    if (kompatState.idA && kompatState.idB) renderKompatResult();
  }

  function renderKompatResult() {
    const box = document.getElementById('kompatResult');
    if (!box) return;
    const pA = getProfile(kompatState.idA), pB = getProfile(kompatState.idB);
    if (!pA || !pB) return;
    if (pA.id === pB.id) { box.innerHTML = '<p class="hint">Bitte zwei unterschiedliche Profile wählen.</p>'; return; }
    const cA = computeChart(pA), cB = computeChart(pB);
    const hits = [];
    cA.planets.forEach(function (a) {
      cB.planets.forEach(function (b) {
        const asp = E.findAspect(a.lon, b.lon, 0.75);
        if (asp) hits.push({ a: a, b: b, aspect: asp });
      });
    });
    hits.sort(function (x, y) { return x.aspect.orb - y.aspect.orb; });
    const harm = hits.filter(function (h) { return aspectQuality(h.aspect.name).key === 'harm'; }).length;
    const tens = hits.filter(function (h) { return aspectQuality(h.aspect.name).key === 'tens'; }).length;
    const conj = hits.length - harm - tens;

    let html = '<h2 class="section-title">' + esc(pA.label) + ' & ' + esc(pB.label) + '</h2>';
    html += '<div class="card flush"><table class="data-table"><thead><tr><th></th><th>Sonne</th><th>Mond</th></tr></thead><tbody>' +
      '<tr><td><b>' + esc(pA.label) + '</b></td><td class="nowrap">' + SIGNS_META[cA.planets[0].sign.index].symbol + ' ' + cA.planets[0].sign.sign + '</td><td class="nowrap">' + SIGNS_META[cA.planets[1].sign.index].symbol + ' ' + cA.planets[1].sign.sign + '</td></tr>' +
      '<tr><td><b>' + esc(pB.label) + '</b></td><td class="nowrap">' + SIGNS_META[cB.planets[0].sign.index].symbol + ' ' + cB.planets[0].sign.sign + '</td><td class="nowrap">' + SIGNS_META[cB.planets[1].sign.index].symbol + ' ' + cB.planets[1].sign.sign + '</td></tr>' +
      '</tbody></table></div>';
    if (hits.length) {
      html += '<div class="mix-bar" aria-label="Verteilung der Aspekte"><span class="q-harm" style="flex:' + harm + '"></span><span class="q-conj" style="flex:' + conj + '"></span><span class="q-tens" style="flex:' + tens + '"></span></div>';
      html += '<p class="mix-legend"><span class="q-chip q-harm">' + harm + ' harmonisch</span><span class="q-chip q-conj">' + conj + ' verbindend</span><span class="q-chip q-tens">' + tens + ' spannungsvoll</span></p>';
    }
    html += '<h2 class="section-title">Verbindungen <span class="count">' + hits.length + '</span> ' + infoBtn('general:synastrie') + '</h2>';
    if (!hits.length) {
      html += '<p class="hint">Innerhalb der verwendeten Orben wurden keine Aspekte zwischen beiden Horoskopen gefunden.</p>';
    } else {
      const rows = hits.map(function (h) {
        const seed = PLANETS_META.indexOf(h.a.meta) * 5 + PLANETS_META.indexOf(h.b.meta) * 2;
        const text = aspectConnector(h.aspect.name, esc(pA.label) + 's ' + h.a.meta.noun, esc(pB.label) + 's ' + h.b.meta.noun, seed);
        return aspectRowHTML(h.aspect.symbol, esc(pA.label) + 's ' + glossLink('planet:' + h.a.key, h.a.meta.name) + ' ' + glossLink('aspect:' + h.aspect.name, h.aspect.name) + ' ' + esc(pB.label) + 's ' + glossLink('planet:' + h.b.key, h.b.meta.name), text, h.aspect.orb, h.aspect.name);
      });
      html += collapsibleList(rows, 6, 'Weitere Verbindungen anzeigen (%n)');
    }
    html += '<div class="disclaimer-box">Synastrie beschreibt astrologische Resonanzen zwischen zwei Menschen – sie ist eine Reflexionshilfe, kein Urteil über eine Beziehung.</div>';
    box.innerHTML = html;
  }

  /* ---------------------------------------------------------------
     MONDKALENDER
     --------------------------------------------------------------- */
  function renderMond() {
    const root = document.getElementById('mondRoot');
    const now = new Date();
    const phase = moonPhaseTrue(now);
    const positions = E.computePositions(now);
    const moonSign = E.lonToSign(positions.mond.lon);
    const nextFull = nextMoonPhaseTime(now, 180);
    const nextNew = nextMoonPhaseTime(now, 0);
    const fmtD = function (d) { return d ? d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long' }) : '–'; };
    const fmtT = function (d) { return d ? d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr' : ''; };

    let html = '<div class="card moon-hero">' +
      '<div class="moon-big">' + moonSVG(phase, 96) + '</div>' +
      '<div class="moon-name">' + esc(phase.phaseName) + '</div>' +
      '<div class="moon-meta">Beleuchtung ' + fmtNum(phase.illumination * 100, 0) + ' % · Zyklustag ' + (Math.floor(phase.age) + 1) + ' von ' + fmtNum(phase.synodic, 1) + '</div>' +
      '<div class="moon-meta">Mond in ' + SIGNS_META[moonSign.index].symbol + ' ' + moonSign.sign + ' (' + fmtDeg(moonSign.degree) + ')</div>' +
      '</div>';
    html += '<div class="stat-grid">' +
      '<div class="stat"><span class="stat-ic moon-stat">' + moonSVG({ illumination: 1, age: 14.8, synodic: phase.synodic }, 22) + '</span><span class="stat-label">Nächster Vollmond</span><span class="stat-value date">' + fmtD(nextFull) + '</span><span class="stat-label">' + fmtT(nextFull) + '</span></div>' +
      '<div class="stat"><span class="stat-ic moon-stat">' + moonSVG({ illumination: 0, age: 0, synodic: phase.synodic }, 22) + '</span><span class="stat-label">Nächster Neumond</span><span class="stat-value date">' + fmtD(nextNew) + '</span><span class="stat-label">' + fmtT(nextNew) + '</span></div>' +
      '</div>';
    html += '<h2 class="section-title">Nächste 7 Tage</h2><div class="card list-card">';
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getTime() + i * 86400000);
      const ph = moonPhaseTrue(d);
      html += '<div class="aspect-row"><div class="aspect-symbol plain">' + moonSVG(ph, 26) + '</div><div class="aspect-text"><b>' + (i === 0 ? 'Heute' : i === 1 ? 'Morgen' : d.toLocaleDateString('de-DE', { weekday: 'long' })) + '</b><span class="row-preview">' + d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' }) + ' · ' + esc(ph.phaseName) + '</span></div><div class="row-value"><b>' + fmtNum(ph.illumination * 100, 0) + ' %</b><span>beleuchtet</span></div></div>';
    }
    html += '</div>';
    html += '<p class="hint small">Die Mondphase ist rein astronomisch und weltweit gleich – kein Standortbezug nötig. „Beleuchtung" gibt an, wie viel der von der Erde sichtbaren Mondscheibe beleuchtet ist.</p>';
    root.innerHTML = html;
  }

  /* ---------------------------------------------------------------
     ASTRO-LEXIKON (Anzeige)
     --------------------------------------------------------------- */
  let astrolexState = { filter: '', cat: 'all', openId: null };
  const ASTROLEX_CATS = [['all', 'Alle'], ['planet', 'Planeten'], ['sign', 'Zeichen'], ['house', 'Häuser'], ['aspect', 'Aspekte'], ['grund', 'Grundlagen']];
  function renderAstrolex() {
    const root = document.getElementById('astrolexRoot');
    if (astrolexState.openId) {
      const g = glossaryEntry(astrolexState.openId);
      if (g) {
        root.innerHTML = '<article class="card entry-card"><div class="entry-symbol">' + AWSym(g.symbol) + '</div><h2 class="section-title">' + esc(g.title) + '</h2><p>' + esc(g.body) + '</p></article>';
        return;
      }
    }
    let html = '<p class="hint">Nachschlagewerk für Planeten, Zeichen, Häuser und Aspekte – auch direkt aus deinem Horoskop über die ⓘ-Symbole und unterstrichenen Begriffe erreichbar.</p>';
    html += '<div class="field search-field">' + ic('search', 'field-ic') + '<input type="search" id="axSearch" placeholder="Begriff suchen…" autocomplete="off" aria-label="Astro-Lexikon durchsuchen" value="' + esc(astrolexState.filter) + '"></div>';
    html += '<div class="pill-select" role="tablist">' + ASTROLEX_CATS.map(function (c) {
      return '<button type="button" role="tab" aria-selected="' + (astrolexState.cat === c[0]) + '" class="pill' + (astrolexState.cat === c[0] ? ' active' : '') + '" data-cat="' + c[0] + '">' + c[1] + '</button>';
    }).join('') + '</div>';

    const isStart = astrolexState.cat === 'all' && !astrolexState.filter;
    if (isStart) {
      const catIcons = { planet: ['planet', 'grad-1'], sign: ['sparkle', 'grad-2'], house: ['home', 'grad-3'], aspect: ['orbit', 'grad-1'], grund: ['cap', 'grad-3'] };
      html += '<div class="bento">' + ASTROLEX_CATS.slice(1).map(function (c) {
        const count = ASTRO_GLOSSARY.filter(function (g) { return c[0] === 'grund' ? (g.cat === 'general' || g.cat === 'element' || g.cat === 'quality') : g.cat === c[0]; }).length;
        return '<button type="button" class="tile" data-open-cat="' + c[0] + '"><span class="tile-badge" style="background:var(--' + catIcons[c[0]][1] + ');">' + ic(catIcons[c[0]][0]) + '</span><span class="tile-body"><span class="tile-title">' + c[1] + '</span><span class="tile-sub">' + count + ' Einträge</span></span></button>';
      }).join('') + '</div>';
      root.innerHTML = html;
      bindAstrolexControls(root);
      root.querySelectorAll('[data-open-cat]').forEach(function (t) {
        t.addEventListener('click', function () { astrolexState.cat = t.getAttribute('data-open-cat'); refreshTab('astrolex'); });
      });
      return;
    }

    const q = astrolexState.filter.toLowerCase();
    const filtered = ASTRO_GLOSSARY.filter(function (g) {
      const catMatch = astrolexState.cat === 'all' ? true : (astrolexState.cat === 'grund' ? (g.cat === 'general' || g.cat === 'element' || g.cat === 'quality') : g.cat === astrolexState.cat);
      if (!catMatch) return false;
      if (!q) return true;
      return g.title.toLowerCase().indexOf(q) !== -1 || g.body.toLowerCase().indexOf(q) !== -1;
    });
    if (filtered.length) {
      html += '<div class="card list-card">' + filtered.map(function (g) { return listRow(g.symbol, g.title, g.body, 'data-open="' + g.id + '"'); }).join('') + '</div>';
    } else {
      html += emptyState('search', 'Keine Treffer.');
    }
    root.innerHTML = html;
    bindAstrolexControls(root);
    root.querySelectorAll('[data-open]').forEach(function (row) {
      row.addEventListener('click', function () { astrolexState.openId = row.dataset.open; astrolexState.fromList = true; refreshTab('astrolex'); });
    });
  }

  function bindAstrolexControls(root) {
    const search = document.getElementById('axSearch');
    if (search) search.addEventListener('input', function (e) {
      const pos = e.target.selectionStart;
      astrolexState.filter = e.target.value;
      refreshTab('astrolex', true);
      const el = document.getElementById('axSearch');
      if (el) { el.focus(); el.setSelectionRange(pos, pos); }
    });
    root.querySelectorAll('[data-cat]').forEach(function (p) {
      p.addEventListener('click', function () { astrolexState.cat = p.dataset.cat; astrolexState.openId = null; refreshTab('astrolex', true); });
    });
  }

  /* ---------------------------------------------------------------
     MEHR
     --------------------------------------------------------------- */
  function renderMehr() {
    document.getElementById('mehrBento').innerHTML =
      tile('grad-2', 'book', 'Anleitung', 'Funktionen, Begriffe & Übersicht aller Seiten', 'anleitung') +
      tile('grad-1', 'gear', 'Einstellungen', 'Erscheinungsbild, Backup & App-Version', 'einstellungen') +
      tile('grad-3', 'scroll', 'Rechtliches', 'Impressum, Datenschutz, Quellen & Lizenzen', 'rechtliches', true);
    bindTiles('mehrBento');
  }

  /* ---------------------------------------------------------------
     TAROT – Start, Legen, Lexikon
     --------------------------------------------------------------- */
  const TAROT_STORAGE = { favorites: 'astrowahr.tarot.favorites', stats: 'astrowahr.tarot.stats' };
  const TAROT_SPREADS = {
    tage: { label: 'Tageskarte', desc: 'Eine einzelne Karte als Impuls für den Tag – gut geeignet, um morgens kurz innezuhalten, ohne eine konkrete Frage zu stellen.', positions: ['Impuls für heute'] },
    drei: { label: 'Drei-Karten', desc: 'Die klassische Universallegung: die 1. Karte zeigt die aktuelle Situation, die 2. Karte die Herausforderung darin, die 3. Karte einen Rat oder möglichen nächsten Schritt. Passt auf fast jede Frage.', positions: ['Situation', 'Herausforderung', 'Rat'] },
    kreuz: { label: 'Keltisches Kreuz', desc: 'Die ausführlichste Legung mit zehn Karten für eine vielschichtige Betrachtung einer Lebenslage – von der Gegenwart über Vergangenheit und nahe Zukunft bis zum möglichen Ergebnis. Nimm dir dafür etwas mehr Zeit.', positions: ['Gegenwärtige Situation', 'Herausforderung', 'Bewusste Grundlage', 'Unbewusste Grundlage', 'Vergangenheit', 'Nahe Zukunft', 'Deine Haltung', 'Umfeld & Einflüsse', 'Hoffnung oder Furcht', 'Ergebnis'] }
  };
  function tarotFavorites() { try { return JSON.parse(localStorage.getItem(TAROT_STORAGE.favorites) || '[]'); } catch (e) { return []; } }
  function tarotToggleFavorite(id) {
    let favs = tarotFavorites();
    if (favs.indexOf(id) === -1) favs.push(id); else favs = favs.filter(function (x) { return x !== id; });
    localStorage.setItem(TAROT_STORAGE.favorites, JSON.stringify(favs));
  }
  function tarotStats() { try { return JSON.parse(localStorage.getItem(TAROT_STORAGE.stats) || '{}'); } catch (e) { return {}; } }
  function tarotBumpStats(patch) {
    const s = Object.assign({ draws: 0 }, tarotStats());
    Object.keys(patch).forEach(function (k) { s[k] = (s[k] || 0) + patch[k]; });
    localStorage.setItem(TAROT_STORAGE.stats, JSON.stringify(s));
    return s;
  }

  function renderTarot() {
    const root = document.getElementById('tarotRoot');
    const labels = { start: 'Übersicht', legen: 'Legen', lexikon: 'Lexikon' };
    let html = '<div class="segmented" id="tarotPills" role="tablist">' +
      ['start', 'legen', 'lexikon'].map(function (v) {
        return '<button type="button" role="tab" aria-selected="' + (tarotState.view === v) + '" class="seg' + (tarotState.view === v ? ' active' : '') + '" data-view="' + v + '">' + labels[v] + '</button>';
      }).join('') + '</div>';
    html += '<div id="tarotSub"></div>';
    root.innerHTML = html;
    root.querySelectorAll('.seg').forEach(function (p) {
      p.addEventListener('click', function () { tarotState.view = p.dataset.view; if (tarotState.view === 'lexikon') tarotState.lex.openId = null; refreshTab('tarot', true); });
    });
    if (tarotState.view === 'legen') renderTarotLegen();
    else if (tarotState.view === 'lexikon') renderTarotLexikon();
    else renderTarotStart();
  }

  function renderTarotStart() {
    const box = document.getElementById('tarotSub');
    const stats = Object.assign({ draws: 0 }, tarotStats());
    let html = '<div class="hero-card tarot-hero">';
    html += '<div class="tarot-hero-text"><div class="hero-date">Tarot als Reflexionshilfe</div><div class="tarot-hero-title">Deine Karte für heute</div><p>Eine einzelne Karte als kurzer Impuls – ganz ohne Frage.</p></div>';
    html += '<button type="button" class="btn light" id="tarotDailyBtn">' + ic('cards') + 'Tageskarte ziehen</button>';
    html += '</div>';
    html += '<div class="bento">';
    html += '<button type="button" class="tile" data-goto-view="legen"><span class="tile-badge" style="background:var(--grad-1);">' + ic('shuffle') + '</span><span class="tile-body"><span class="tile-title">Karten legen</span><span class="tile-sub">Drei Karten oder Keltisches Kreuz</span></span></button>';
    html += '<button type="button" class="tile" data-goto-view="lexikon"><span class="tile-badge" style="background:var(--grad-3);">' + ic('book') + '</span><span class="tile-body"><span class="tile-title">Kartenlexikon</span><span class="tile-sub">Alle 78 Karten mit Favoriten</span></span></button>';
    html += '</div>';
    html += '<details class="card info-details"><summary>Was ist Tarot?</summary><p>' + esc(glossaryEntry('general:tarot').body) + '</p><p>' + esc(glossaryEntry('general:arkana').body) + '</p><p>' + esc(glossaryEntry('general:umgekehrt').body) + '</p></details>';
    html += '<p class="hint small">Bisher ' + stats.draws + ' Legung' + (stats.draws === 1 ? '' : 'en') + ' gezogen.</p>';
    html += '<div class="disclaimer-box">Tarot dient der Selbstreflexion und Unterhaltung, nicht der Vorhersage konkreter Ereignisse.</div>';
    box.innerHTML = html;
    document.getElementById('tarotDailyBtn').addEventListener('click', function () {
      tarotState.view = 'legen'; tarotState.spread = 'tage'; tarotState.question = '';
      drawTarotSpread('tage');
      tarotState.revealed = [true];
      refreshTab('tarot');
    });
    box.querySelectorAll('[data-goto-view]').forEach(function (t) {
      t.addEventListener('click', function () { tarotState.view = t.getAttribute('data-goto-view'); refreshTab('tarot'); });
    });
  }

  function tarotCardFace(card, reversed, small, zoomable) {
    const art = window.generateCardArt(card);
    const zoomAttrs = zoomable ? ' data-zoom-card="' + card.id + '" data-zoom-rev="' + (reversed ? '1' : '0') + '"' : '';
    return '<div class="tarot-card-face' + (small ? ' small' : '') + '">' +
      '<div class="tarot-card-art' + (reversed ? ' reversed' : '') + (zoomable ? ' zoomable' : '') + '"' + zoomAttrs + '>' + art + '</div>' +
      '<div class="tarot-card-name">' + esc(card.name) + (reversed ? ' <span class="tarot-rev-tag">Umgekehrt</span>' : '') + '</div></div>';
  }

  function renderTarotLegen() {
    const box = document.getElementById('tarotSub');
    const icons = { tage: 'cards', drei: 'shuffle', kreuz: 'sparkle' };
    const counts = { tage: '1 Karte', drei: '3 Karten', kreuz: '10 Karten' };
    let html = '';
    if (!tarotState.spread) {
      html += '<p class="hint">Wähle eine Legeart:</p><div class="spread-list">' + Object.keys(TAROT_SPREADS).map(function (k) {
        return '<button type="button" class="spread-option" data-spread="' + k + '"><span class="tile-badge" style="background:var(--grad-' + (k === 'tage' ? '2' : k === 'drei' ? '1' : '3') + ')">' + ic(icons[k]) + '</span><span class="spread-text"><b>' + TAROT_SPREADS[k].label + ' <small>' + counts[k] + '</small></b><span>' + esc(TAROT_SPREADS[k].desc) + '</span></span></button>';
      }).join('') + '</div>';
      box.innerHTML = html;
      bindTarotSpreadPicker(box);
      return;
    }
    html += '<div class="pill-select" role="tablist">' + Object.keys(TAROT_SPREADS).map(function (k) {
      return '<button type="button" role="tab" aria-selected="' + (tarotState.spread === k) + '" class="pill' + (tarotState.spread === k ? ' active' : '') + '" data-spread="' + k + '">' + TAROT_SPREADS[k].label + '</button>';
    }).join('') + '</div>';

    if (!tarotState.drawn.length) {
      html += '<div class="card spread-desc">' + esc(TAROT_SPREADS[tarotState.spread].desc) + '</div>';
      html += '<div class="field"><label for="tarotQuestion">Deine Frage (optional)</label><textarea id="tarotQuestion" placeholder="Worum geht es dir gerade?">' + esc(tarotState.question) + '</textarea></div>';
      html += '<button type="button" class="btn" id="tarotDrawBtn">' + ic('shuffle') + 'Karten mischen &amp; legen</button>';
      box.innerHTML = html;
      bindTarotSpreadPicker(box);
      document.getElementById('tarotDrawBtn').addEventListener('click', function () {
        tarotState.question = document.getElementById('tarotQuestion').value.trim();
        drawTarotSpread(tarotState.spread);
      });
      return;
    }

    const positions = TAROT_SPREADS[tarotState.spread].positions;
    html += tarotState.question ? '<div class="card question-card"><span class="horo-label">Deine Frage</span>' + esc(tarotState.question) + '</div>' : '';
    const allRevealed = tarotState.revealed.every(Boolean);
    if (!allRevealed) html += '<p class="hint">Tippe nacheinander auf die verdeckten Karten, um sie aufzudecken.</p>';
    html += '<div class="tarot-spread-grid tarot-grid-' + tarotState.spread + '">';
    tarotState.drawn.forEach(function (d, i) {
      const revealed = tarotState.revealed[i];
      html += '<div class="tarot-slot' + (revealed ? ' revealed' : '') + '" data-idx="' + i + '"' + (revealed ? '' : ' role="button" tabindex="0" aria-label="Karte ' + (i + 1) + ' aufdecken"') + '>' +
        '<div class="tarot-pos-label">' + (i + 1) + '. ' + esc(positions[i]) + '</div>' +
        (revealed ? tarotCardFace(d.card, d.reversed, true, true) : '<div class="tarot-card-back"></div>') +
        '</div>';
    });
    html += '</div>';
    if (!allRevealed && tarotState.drawn.length > 1) html += '<button type="button" class="btn ghost small center-btn" id="tarotRevealAll">Alle aufdecken</button>';
    if (allRevealed) {
      html += '<h2 class="section-title">Deutung</h2><div class="card list-card">';
      tarotState.drawn.forEach(function (d, i) {
        const text = d.reversed ? d.card.reversed : d.card.upright;
        html += '<div class="aspect-row"><div class="aspect-symbol num">' + (i + 1) + '</div><div class="aspect-text"><b>' + esc(positions[i]) + ': ' + esc(d.card.name) + (d.reversed ? ' ' + glossLink('general:umgekehrt', '(umgekehrt)') : '') + '</b><span class="row-preview">' + esc(text) + '</span></div></div>';
      });
      html += '</div>';
      if (tarotState.spread === 'tage') {
        html += '<div class="notice-box soft"><b>Reflexionsfrage:</b> ' + esc(tarotState.drawn[0].card.advice) + '</div>';
      }
    }
    html += '<button type="button" class="btn secondary" id="tarotResetBtn" style="margin-top:12px;">' + ic('refresh') + 'Neue Legung</button>';
    html += '<div class="disclaimer-box">Tarot dient der Selbstreflexion und Unterhaltung, nicht der Vorhersage konkreter Ereignisse.</div>';
    box.innerHTML = html;
    bindTarotSpreadPicker(box);

    box.querySelectorAll('.tarot-slot').forEach(function (slot) {
      slot.addEventListener('click', function () {
        const idx = parseInt(slot.dataset.idx, 10);
        if (!tarotState.revealed[idx]) { tarotState.revealed[idx] = true; refreshTab('tarot', true); }
      });
    });
    const allBtn = document.getElementById('tarotRevealAll');
    if (allBtn) allBtn.addEventListener('click', function () { tarotState.revealed = tarotState.revealed.map(function () { return true; }); refreshTab('tarot', true); });
    const resetBtn = document.getElementById('tarotResetBtn');
    if (resetBtn) resetBtn.addEventListener('click', function () {
      tarotState.drawn = []; tarotState.revealed = []; tarotState.question = '';
      refreshTab('tarot', true);
    });
  }

  function bindTarotSpreadPicker(box) {
    box.querySelectorAll('[data-spread]').forEach(function (p) {
      p.addEventListener('click', function () {
        if (tarotState.drawn.length && p.dataset.spread !== tarotState.spread) {
          confirmDialog({ title: 'Legung verwerfen?', text: 'Die aktuelle Legung geht verloren, wenn du eine andere Legeart wählst.', okLabel: 'Verwerfen', icon: 'cards' }, function () {
            tarotState.spread = p.dataset.spread;
            tarotState.drawn = []; tarotState.revealed = []; tarotState.question = '';
            refreshTab('tarot', true);
          });
          return;
        }
        tarotState.spread = p.dataset.spread;
        tarotState.drawn = []; tarotState.revealed = []; tarotState.question = '';
        refreshTab('tarot', true);
      });
    });
  }

  function drawTarotSpread(spreadKey) {
    const n = TAROT_SPREADS[spreadKey].positions.length;
    const pool = window.CARDS.slice();
    const rnd = function () {
      if (window.crypto && window.crypto.getRandomValues) { const a = new Uint32Array(1); window.crypto.getRandomValues(a); return a[0] / 4294967296; }
      return Math.random();
    };
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
    }
    tarotState.drawn = pool.slice(0, n).map(function (c) { return { card: c, reversed: rnd() < 0.35 }; });
    tarotState.revealed = new Array(n).fill(false);
    tarotBumpStats({ draws: 1 });
    refreshTab('tarot', true);
  }

  function renderTarotLexikon() {
    const box = document.getElementById('tarotSub');
    const favs = tarotFavorites();
    if (tarotState.lex.openId !== null) {
      const card = window.getCard(tarotState.lex.openId);
      if (card) {
        const isFav = favs.indexOf(card.id) !== -1;
        let html = '<div class="card entry-card tarot-entry">';
        html += tarotCardFace(card, false, false, true);
        html += '<p class="kw">' + card.keywords.map(esc).join(' · ') + '</p>';
        html += '<p><b>Aufrecht:</b> ' + esc(card.upright) + '</p>';
        html += '<p><b>Umgekehrt:</b> ' + esc(card.reversed) + '</p>';
        html += '<p class="muted"><b>Reflexionsfrage:</b> ' + esc(card.advice) + '</p>';
        html += '<button type="button" class="btn ' + (isFav ? 'secondary' : 'ghost') + ' small" id="lexFavBtn" aria-pressed="' + isFav + '">' + ic(isFav ? 'starFilled' : 'star') + (isFav ? 'Favorit' : 'Als Favorit merken') + '</button>';
        html += '</div>';
        box.innerHTML = html;
        document.getElementById('lexFavBtn').addEventListener('click', function () { tarotToggleFavorite(card.id); refreshTab('tarot', true); });
        return;
      }
    }
    let html = '<div class="field search-field">' + ic('search', 'field-ic') + '<input type="search" id="lexSearch" placeholder="Karte oder Stichwort suchen…" autocomplete="off" aria-label="Kartenlexikon durchsuchen" value="' + esc(tarotState.lex.filter) + '"></div>';
    const arcanaOpts = [['all', 'Alle'], ['major', 'Große Arkana'], ['staebe', 'Stäbe'], ['kelche', 'Kelche'], ['schwerter', 'Schwerter'], ['muenzen', 'Münzen']];
    html += '<div class="pill-select">' + arcanaOpts.map(function (o) {
      return '<button type="button" class="pill' + (tarotState.lex.arcana === o[0] ? ' active' : '') + '" data-arc="' + o[0] + '">' + o[1] + '</button>';
    }).join('') + '<button type="button" class="pill' + (tarotState.lex.favOnly ? ' active' : '') + '" id="lexFavToggle" aria-pressed="' + tarotState.lex.favOnly + '">★ Favoriten</button></div>';

    const q = tarotState.lex.filter.toLowerCase();
    const filtered = window.CARDS.filter(function (c) {
      if (tarotState.lex.favOnly && favs.indexOf(c.id) === -1) return false;
      const arcMatch = tarotState.lex.arcana === 'all' ? true : (tarotState.lex.arcana === 'major' ? c.arcana === 'major' : c.suit === tarotState.lex.arcana);
      if (!arcMatch) return false;
      if (!q) return true;
      return c.name.toLowerCase().indexOf(q) !== -1 || c.keywords.join(' ').toLowerCase().indexOf(q) !== -1;
    });
    if (filtered.length) {
      html += '<div class="tarot-lex-grid">' + filtered.map(function (c) {
        return '<button type="button" class="tarot-lex-item" data-id="' + c.id + '" aria-label="' + esc(c.name) + '">' + tarotCardFace(c, false, true) + '</button>';
      }).join('') + '</div>';
    } else {
      html += emptyState(tarotState.lex.favOnly ? 'star' : 'search', tarotState.lex.favOnly ? 'Noch keine Favoriten markiert.' : 'Keine Karten gefunden.');
    }
    box.innerHTML = html;
    bindLexikonControls(box);
    box.querySelectorAll('.tarot-lex-item').forEach(function (item) {
      item.addEventListener('click', function () { tarotState.lex.openId = parseInt(item.dataset.id, 10); tarotState.lex.fromList = true; refreshTab('tarot'); });
    });
  }

  function bindLexikonControls(box) {
    const search = document.getElementById('lexSearch');
    if (search) search.addEventListener('input', function (e) {
      const pos = e.target.selectionStart;
      tarotState.lex.filter = e.target.value;
      refreshTab('tarot', true);
      const el = document.getElementById('lexSearch');
      if (el) { el.focus(); el.setSelectionRange(pos, pos); }
    });
    box.querySelectorAll('[data-arc]').forEach(function (p) {
      p.addEventListener('click', function () { tarotState.lex.arcana = p.dataset.arc; refreshTab('tarot', true); });
    });
    const favToggle = document.getElementById('lexFavToggle');
    if (favToggle) favToggle.addEventListener('click', function () { tarotState.lex.favOnly = !tarotState.lex.favOnly; refreshTab('tarot', true); });
  }

  /* ---------------------------------------------------------------
     ANLEITUNG
     --------------------------------------------------------------- */
  function renderSitemapHTML() {
    const order = ['astro', 'astrologie', 'tarot', 'general'];
    let html = '';
    order.forEach(function (dom) {
      const items = TOOL_SHORTCUTS.filter(function (s) { return s.domain === dom; });
      if (!items.length) return;
      const meta = DOMAIN_META[dom];
      html += '<div class="search-domain-label">' + meta.label + '</div>';
      items.forEach(function (s) {
        html += '<div class="search-result-row" role="button" tabindex="0" data-nav="' + s.tab + '"><div class="search-result-icon dom-' + dom + '">' + ic(meta.icon) + '</div><div class="search-result-text"><b>' + esc(s.label) + '</b></div><span class="row-chev">' + ic('chevron') + '</span></div>';
      });
    });
    return html;
  }
  function bindSitemapClicks(container) {
    container.querySelectorAll('[data-nav]').forEach(function (row) {
      row.addEventListener('click', function () { navigate(row.getAttribute('data-nav')); });
    });
  }

  function renderAnleitung() {
    document.getElementById('anleitungRoot').innerHTML =
      '<h3>Direkt weiter zu</h3>' +
      '<div class="bento" id="anleitungBento"></div>' +
      '<h3>Astronomie oder Astrologie?</h3>' +
      '<p>AstroWahr trennt bewusst zwei Bereiche: <b>Astronomie</b> liefert reine, unabhängig überprüfbare Fakten und Berechnungen (Positionen, Entfernungen, Sonnenzeiten, physikalische Planetendaten) ohne Deutung. <b>Astrologie</b> nutzt dieselben berechneten Positionen, legt aber zusätzlich eine symbolische, nicht wissenschaftlich belegte Deutungsebene darüber (Geburtshoroskop, Tageshoroskop, Tarot). Die Startseite führt zu beiden Bereichen.</p>' +
      '<h3>Alle Bereiche im Überblick</h3>' +
      '<p style="font-size:.84rem; color:var(--text-dim);">Vollständige Übersicht aller Seiten – zum direkten Aufrufen antippen.</p>' +
      '<div class="card" id="anleitungSitemap"></div>' +
      '<h3>Direkt nachschlagen</h3>' +
      '<p>Unterstrichene Begriffe und kleine ⓘ-Symbole sind überall in der App antippbar und öffnen eine kurze Erklärung. Für die ausführliche Übersicht gibt es das <b>Astro-Lexikon</b> mit allen Planeten, Zeichen, Häusern und Aspekten – durchsuchbar und nach Kategorie filterbar. Chart-Grafik und Tarotkarten lassen sich zudem antippen, um sie vergrößert und mit Zoom/Pan-Steuerung anzuzeigen; ein Tipp daneben oder das × schließt die Ansicht wieder.</p>' +
      '<h3>Wie AstroWahr rechnet</h3>' +
      '<p>Alle Planetenpositionen werden direkt auf deinem Gerät aus astronomischen Bahnelementen berechnet (Kepler-Formeln) – ohne Internetverbindung, ohne externen Server. Die Genauigkeit liegt bei wenigen Bogenminuten und reicht für die astrologische Zeichen- und Gradbestimmung sowie für die astronomischen Übersichten.</p>' +
      '<h3>Weltraumkunde</h3>' +
      '<p>Der Bereich Weltraumkunde (Astronomie → Weltraumkunde) ergänzt die berechneten Positionen um Hintergrundwissen: Sterne und ihre Entwicklung, das Universum im Großen, vertiefte Sonnensystem-Themen (Zwergplaneten, Asteroiden- und Kuipergürtel, große Monde) sowie eine Auswahl an Meilensteinen der Raumfahrtgeschichte. Alle Texte sind eigenständig formuliert; es werden keine Fotografien, Missionslogos, Illustrationen oder sonstigen Bilder Dritter verwendet, sondern ausschließlich einzelne Unicode-Symbole und eigene Liniensymbole zur Orientierung. Einzelne Zahlenangaben (z. B. Monde der Gasplaneten) ändern sich mit neuen Entdeckungen und sind entsprechend gekennzeichnet.</p>' +
      '<h3>Rückläufigkeit (℞)</h3>' +
      '<p>Ein Planet erscheint „rückläufig", wenn er sich – von der Erde aus gesehen – für einige Wochen scheinbar entgegen seiner üblichen Richtung durch den Tierkreis bewegt. Das ist eine reine Perspektiventäuschung durch die unterschiedlichen Umlaufgeschwindigkeiten von Erde und Planet, keine tatsächliche Kursänderung. Zu sehen ist die Kennzeichnung im Astronomie-Bereich unter „Himmel jetzt".</p>' +
      '<h3>Sonnenauf-/-untergang</h3>' +
      '<p>Die Berechnung nutzt ein Standardverfahren (Zeitgleichung + Stundenwinkel bei -0,833° Höhe, inklusive Standardrefraktion) und ist auf wenige Minuten genau. Lokale Horizontverdeckung durch Berge oder Gebäude ist nicht enthalten. Nahe der Polarkreise kann die Sonne ganztägig auf- oder untergehen (Polartag/Polarnacht) – das wird entsprechend angezeigt.</p>' +
      '<h3>Sternbilder vs. Tierkreiszeichen</h3>' +
      '<p>Die Astrologie nutzt den <b>tropischen</b> Tierkreis (fest an die Jahreszeiten gekoppelt), nicht die tatsächlichen, unterschiedlich großen Sternbilder am Himmel. Durch die Präzession der Erdachse hat sich seit Entstehung des Systems vor rund 2.000 Jahren eine Verschiebung von etwa einem Zeichen ergeben – nachzulesen im Astronomie-Bereich unter „Sternbilder & Präzession".</p>' +
      '<h3>Die Chart-Grafik lesen</h3>' +
      '<p>Der äußere Ring zeigt die zwölf Tierkreiszeichen mit einer Gradeinteilung. Ist eine Geburtszeit bekannt, markieren dünne Speichen die zwölf Häuser (die vier dickeren, violetten Linien sind die Hauptachsen Aszendent/Deszendent und MC/IC). Die Planeten stehen im inneren Ring; ein kleiner weißer Strich am Zeichenring markiert jeweils die exakte Position – stehen mehrere Planeten dicht beieinander, werden ihre Symbole leicht auseinandergerückt, damit sie lesbar bleiben. Farbige Linien zwischen den Planeten zeigen Aspekte: Türkis für Trigon/Sextil (harmonisch), Rot für Quadrat (spannungsreich), Gold für Opposition (Ausgleich gesucht) – Konjunktionen werden nicht extra verbunden, da die Planeten dafür nah beieinanderstehen.</p>' +
      '<h3>Aszendent & Häuser</h3>' +
      '<p>Für Aszendent, Medium Coeli (MC) und die 12 Häuser werden Geburtsdatum, -uhrzeit, -zeitzone und -ort benötigt. AstroWahr nutzt das gleichweite Häusersystem (Equal House) ab dem Aszendenten. Ohne bekannte Geburtszeit lassen sich diese Werte nicht seriös berechnen – die App zeigt dann nur die Zeichenpositionen der Planeten.</p>' +
      '<h3>Zeitzone</h3>' +
      '<p>Standardmäßig ermittelt AstroWahr die Zeitzone automatisch. Beim Geburtshoroskop richtet sie sich nach Geburtsort und Datum – inklusive historischer Sommerzeit-Regeln (in Deutschland gab es z. B. 1950–1979 keine Sommerzeit, und bis 1995 endete sie bereits Ende September). Ist der Geburtsort nicht in der Vorschlagsliste, gelten die deutschen Regeln. Sonnenzeiten und Jahreszeiten nutzen die Zeitzone deines Geräts. Du kannst die Zeitzone jederzeit auch von Hand wählen, etwa bei einer Geburt im Ausland. Eine falsche Zeitzone verschiebt vor allem Aszendent, Häuser, Mondposition und Sonnenzeiten.</p>' +
      '<h3>Aspekte, Orb und die Reihenfolge der Listen</h3>' +
      '<p>Aspekte sind bestimmte Winkelbeziehungen zwischen zwei Planeten: Konjunktion (0°), Sextil (60°), Quadrat (90°), Trigon (120°) und Opposition (180°), jeweils mit einem Toleranzbereich (Orb). Aspektlisten sind nach Orb sortiert – die exaktesten (stärksten) Aspekte stehen oben; die wichtigsten sind sofort sichtbar, die übrigen aufklappbar. Jeder Aspekt ist zusätzlich als harmonisch (Trigon, Sextil), spannungsvoll (Quadrat, Opposition) oder verbindend (Konjunktion) gekennzeichnet. Bei Transiten wird ein deutlich engerer Orb verwendet als im Geburtshoroskop, da dort nur gerade aktuell wirksame Aspekte relevant sind; bei der Kompatibilität ein etwas weiterer, da hier zwei komplette Planetenbilder verglichen werden.</p>' +
      '<h3>Mondkalender-Begriffe</h3>' +
      '<p>„Zyklustag" zählt die Tage seit dem letzten Neumond (ein voller Zyklus dauert rund 29,5 Tage). „Beleuchtung" gibt an, wie viel Prozent der Mondscheibe von der Erde aus gesehen gerade sichtbar beleuchtet sind – 0 % beim Neumond, 100 % beim Vollmond.</p>' +
      '<h3>Tarot</h3>' +
      '<p>Der Tarot-Bereich bietet eine Startseite mit Kurzerklärung, drei Legearten (Tageskarte, Drei-Karten-Legung, Keltisches Kreuz – jeweils mit Erklärtext direkt bei der Auswahl) sowie ein durchsuchbares Kartenlexikon mit Favoriten. Kartentexte und Kartenbilder sind eigene Erstellungen und bilden kein bestehendes Tarot-Deck (z. B. Rider-Waite-Smith) nach – weder inhaltlich noch bildlich.</p>' +
      '<h3>Erscheinungsbild</h3>' +
      '<p>Unter Einstellungen lässt sich zwischen Hell, Dunkel und „System" (folgt automatisch der Geräteeinstellung) wechseln. Die Wahl wird lokal gespeichert und beim nächsten Start automatisch wieder angewendet.</p>' +
      '<h3>Suche & Tour</h3>' +
      '<p>Das Lupensymbol oben rechts durchsucht Werkzeuge, Astro-Lexikon, Tarot-Lexikon und Planeten-Steckbriefe gleichzeitig – jeder Treffer ist klar mit Astronomie, Astrologie, Tarot oder App beschriftet. Der Pfeil oben links führt immer einen Schritt zurück, auch innerhalb einer Seite (z. B. vom Lexikon-Eintrag zur Übersicht). Die Einführungs-Tour lässt sich hier jederzeit erneut aufrufen.</p>' +
      '<button type="button" class="btn secondary" id="replayTourBtn" style="margin-bottom:8px;">' + ic('refresh') + 'Tour erneut ansehen</button>' +
      '<h3>Deine Daten</h3>' +
      '<p>Alle Geburtsprofile werden ausschließlich lokal auf deinem Gerät gespeichert (localStorage). Es gibt keine Server-Anbindung, kein Tracking und keine Weitergabe an Dritte.</p>' +
      '<div class="disclaimer-box">Der Astronomie-Bereich bildet den aktuellen wissenschaftlichen Kenntnisstand vereinfacht ab; der Astrologie- und Tarot-Bereich dient der Unterhaltung und Selbstreflexion. Astrologische und Tarot-Aussagen sind nicht wissenschaftlich belegt und ersetzen keine medizinische, psychologische, rechtliche oder finanzielle Beratung.</div>';
    document.getElementById('anleitungBento').innerHTML =
      tile('grad-3', 'telescope', 'Astronomie', 'Live-Himmel, Planeten-Fakten, Sonnenzeiten', 'astronomie') +
      tile('grad-1', 'cap', 'Astro-Lexikon', 'Planeten, Zeichen, Häuser & Aspekte', 'astrolex') +
      tile('grad-2', 'cards', 'Tarot', 'Tageskarte, Legungen & Kartenlexikon', 'tarot', true);
    bindTiles('anleitungBento');
    const sitemapBox = document.getElementById('anleitungSitemap');
    sitemapBox.innerHTML = renderSitemapHTML();
    bindSitemapClicks(sitemapBox);
    document.getElementById('replayTourBtn').addEventListener('click', openTour);
  }

  /* ---------------------------------------------------------------
     EINSTELLUNGEN
     --------------------------------------------------------------- */
  const THEME_KEY = 'astrowahr.theme';
  function getThemePref() { try { return localStorage.getItem(THEME_KEY) || 'light'; } catch (e) { return 'light'; } }
  function applyTheme(pref) {
    const effective = pref === 'system' ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : pref;
    if (effective === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', effective === 'dark' ? '#17142f' : '#f7f6fc');
    // wirkt beim nächsten Start der Homescreen-App
    const sb = document.getElementById('statusBarMeta');
    if (sb) sb.setAttribute('content', 'black-translucent'); // einheitlich: Inhalt läuft durch die Statusleiste
  }
  function setThemePref(pref) {
    try { localStorage.setItem(THEME_KEY, pref); } catch (e) {}
    applyTheme(pref);
  }

  function renderEinstellungen() {
    const root = document.getElementById('einstellungenRoot');
    const count = getProfiles().length;
    const favCount = tarotFavorites().length;
    const themePref = getThemePref();
    root.innerHTML =
      '<h2 class="section-title">Erscheinungsbild</h2>' +
      '<div class="segmented" id="themePills" role="radiogroup" aria-label="Erscheinungsbild">' +
      [['light', 'Hell', 'sun'], ['dark', 'Dunkel', 'moon']].map(function (o) {
        return '<button type="button" role="radio" aria-checked="' + (themePref === o[0]) + '" class="seg' + (themePref === o[0] ? ' active' : '') + '" data-theme-pref="' + o[0] + '">' + ic(o[2]) + o[1] + '</button>';
      }).join('') + '</div>' +
      '<h2 class="section-title">Daten &amp; Backup</h2>' +
      '<div class="card settings-card">' +
      '<div class="settings-row"><span>Geburtshoroskope</span><b>' + count + '</b></div>' +
      '<div class="settings-row"><span>Tarot-Favoriten</span><b>' + favCount + '</b></div>' +
      '<p class="hint small">Das Backup enthält Geburtshoroskope sowie Tarot-Favoriten und -Statistik als JSON-Datei. Alle Daten bleiben sonst ausschließlich auf diesem Gerät.</p>' +
      '<button type="button" class="btn secondary" id="exportBtn">' + ic('download') + 'Backup exportieren</button>' +
      '<label class="btn secondary" style="cursor:pointer;">' + ic('upload') + 'Backup importieren<input type="file" id="importFile" accept="application/json,.json" style="display:none;"></label>' +
      '</div>' +
      '<button type="button" class="btn danger" id="wipeBtn"' + (count ? '' : ' disabled') + '>' + ic('trash') + 'Alle Profile löschen</button>' +
      '<h2 class="section-title">Über AstroWahr</h2>' +
      '<div class="card settings-card">' +
      '<div class="settings-row"><span>Version</span><b>' + APP_VERSION + ' (Build ' + APP_BUILD + ')</b></div>' +
      '<div class="settings-row"><span>Offline verfügbar</span><b id="offlineState">' + ('serviceWorker' in navigator ? 'wird geprüft …' : 'nicht unterstützt') + '</b></div>' +
      '<button type="button" class="btn ghost" id="checkUpdateBtn">' + ic('refresh') + 'Nach Update suchen</button>' +
      '</div>';

    root.querySelectorAll('[data-theme-pref]').forEach(function (p) {
      p.addEventListener('click', function () { setThemePref(p.getAttribute('data-theme-pref')); refreshTab('einstellungen', true); });
    });
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(function (reg) {
        const el = document.getElementById('offlineState');
        if (el) el.textContent = reg && reg.active ? 'Ja' : 'Noch nicht';
      }).catch(function () {});
    }
    document.getElementById('checkUpdateBtn').addEventListener('click', function () {
      checkForUpdate(true);
    });
    document.getElementById('exportBtn').addEventListener('click', function () {
      const bundle = { astrowahrBackup: 1, version: APP_VERSION, exported: new Date().toISOString(), profiles: getProfiles(), tarotFavorites: tarotFavorites(), tarotStats: tarotStats() };
      const data = JSON.stringify(bundle, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'astrowahr-backup-' + localDateKey(new Date()) + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
      toast('Backup erstellt');
    });
    document.getElementById('importFile').addEventListener('change', function (e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function () {
        try {
          const data = JSON.parse(reader.result);
          const valid = function (p) { return p && typeof p === 'object' && typeof p.date === 'string' && isFinite(p.lat) && isFinite(p.lon); };
          if (Array.isArray(data)) {
            if (!data.every(valid)) throw new Error('invalid');
            saveProfiles(data);
          } else if (data && typeof data === 'object') {
            if (Array.isArray(data.profiles)) { if (!data.profiles.every(valid)) throw new Error('invalid'); saveProfiles(data.profiles); }
            if (Array.isArray(data.tarotFavorites)) localStorage.setItem(TAROT_STORAGE.favorites, JSON.stringify(data.tarotFavorites));
            if (data.tarotStats && typeof data.tarotStats === 'object') localStorage.setItem(TAROT_STORAGE.stats, JSON.stringify(data.tarotStats));
          } else { throw new Error('invalid'); }
          toast('Backup importiert');
          refreshTab('einstellungen', true);
        } catch (err) { toast('Diese Datei ist kein gültiges AstroWahr-Backup.', 3200); }
      };
      reader.readAsText(file);
    });
    document.getElementById('wipeBtn').addEventListener('click', function () {
      confirmDialog({ title: 'Alle Profile löschen?', text: 'Alle gespeicherten Geburtshoroskope werden von diesem Gerät entfernt. Das kann nicht rückgängig gemacht werden.', okLabel: 'Alle löschen', danger: true }, function () {
        saveProfiles([]);
        toast('Alle Profile gelöscht');
        refreshTab('einstellungen', true);
      });
    });
  }

  /* ---------------------------------------------------------------
     RECHTLICHES / IMPRESSUM / DATENSCHUTZ
     --------------------------------------------------------------- */
  function renderRechtliches() {
    document.getElementById('rechtlichesRoot').innerHTML =
      '<div class="bento">' +
      tile('grad-1', 'doc', 'Impressum', 'Gilt für die ganze WahrZentrale', 'impressum') +
      tile('grad-3', 'lock', 'Datenschutz', 'Gemeinsame Erklärung, Abschnitt AstroWahr', 'datenschutz') +
      tile('grad-2', 'book', 'Quellen & Lizenzen', 'Berechnungsverfahren, Sterndaten und Genauigkeit', 'lizenzen', true) +
      '</div>';
    bindTiles('rechtlichesRoot');
  }

  const IMPRESSUM_HTML = '';
  const DATENSCHUTZ_HTML = '';

  const LIZENZEN_HTML =
    '<h3>Quellen, Lizenzen und Hinweise</h3>' +
    '<h3>Eigener Code und eigene Gestaltung</h3>' +
    '<p>Impressum und Datenschutzerklärung: <a href="./impressum.html">Impressum</a> · <a href="./datenschutz.html#as">Datenschutz</a> · <a href="./lizenzen.html">Lizenzen der WahrZentrale</a></p>' +
    '<p>Programmcode, Gestaltung, Symbole, Tarot-Kartenkunst und Texte: © 2026 Jan Dierlich. Alle Rechte vorbehalten. AstroWahr verwendet keine fremden Programmbibliotheken, keine Web-Schriftarten (ausschließlich die Systemschriften des Geräts) und keine Bilddateien Dritter. Sämtliche grafischen Darstellungen (Radix-Chart, Tarotkarten, Kompassansichten, Sternenhimmel) werden vollständig im Programm erzeugt.</p>' +
    '<p class="hint">Der Quellcode ist auf GitHub öffentlich einsehbar, steht jedoch unter keiner Open-Source-Lizenz. Nutzung, Vervielfältigung, Veränderung oder Weiterverbreitung – auch auszugsweise – sind ohne vorherige schriftliche Zustimmung des Urhebers nicht gestattet.</p>' +
    '<h3>Berechnungsverfahren (veröffentlichte Fachliteratur)</h3>' +
    '<p>Mathematische Verfahren sind frei nutzbar; es wurde kein fremder Quellcode übernommen, alle Verfahren sind selbst implementiert. Der Astrologie-/Grundlagen-Bereich (Tageshoroskop, Geburtshoroskop, Transite, Kompatibilität, Mondkalender, „Himmel jetzt", Sonnenauf-/-untergang, Jahreszeiten) nutzt eine eigene Kepler-Implementierung nach der Methode von Paul Schlyter („How to compute planetary positions", gemeinfrei). Der Bereich „Sternenhimmel" nutzt eine eigenständige, genauere Berechnung nach folgenden veröffentlichten Quellen:</p>' +
    '<table><tr><th>Bereich</th><th>Quelle</th></tr>' +
    '<tr><td>Sonne, Mond (Reihenentwicklung), Nutation, Präzession, Sternzeit, Parallaxe, Refraktion, Mondphasen, Beleuchtung, Finsternisse</td><td>Jean Meeus: <i>Astronomical Algorithms</i>, 2. Auflage, Willmann-Bell, 1998</td></tr>' +
    '<tr><td>Planeten (Keplersche Bahnelemente)</td><td>E. M. Standish: <i>Keplerian Elements for Approximate Positions of the Major Planets</i>, NASA Jet Propulsion Laboratory</td></tr>' +
    '<tr><td>Differenz TT − UT (Delta T)</td><td>Polynomnäherungen nach F. Espenak und J. Meeus (NASA)</td></tr>' +
    '<tr><td>Sternschnuppenströme (Radianten, Maxima, Raten)</td><td>Veröffentlichte Almanachdaten der International Meteor Organization (IMO)</td></tr>' +
    '<tr><td>Galaktische Koordinaten</td><td>Standarddefinition der IAU (Galaktischer Nordpol und Zentrum für J2000)</td></tr></table>' +
    '<p>Beide Berechnungswege wurden unabhängig gegen bekannte Referenzereignisse abgeglichen (u. a. Äquinoktien/Sonnwenden, Sonnenfinsternisse 1999/2025/2026, Mondlandung).</p>' +
    '<h3>Sterndaten</h3>' +
    '<p>Die Auswahl von knapp 300 hellen Sternen und einigen Tief-Himmel-Objekten im Sternenhimmel-Bereich ist eine eigene Zusammenstellung. Positionen (Epoche J2000, ohne Eigenbewegung) und Helligkeiten sind astronomische Tatsachen, keine Kopie eines urheberrechtlich geschützten Katalogs. Sternbildfiguren sind eigene, vereinfachte Linienzüge. Bei rund 50 bekannten Sternen und Objekten zeigt die App zusätzlich die Entfernung in Lichtjahren als veröffentlichten Näherungswert aus der Fachliteratur.</p>' +
    '<h3>Tarot</h3>' +
    '<p>Tarot-Kartentexte und -Bilder sind eigene Erstellungen ohne Bezug zu bestehenden Decks (z. B. Rider-Waite-Smith); die Kartendaten wurden aus einem früheren eigenen Projekt (AEVARANNA) übernommen und thematisch angepasst.</p>' +
    '<h3>Weltraumkunde</h3>' +
    '<p>Eigenständig formulierte Fakten ohne Verwendung von Fotografien, Missionslogos oder sonstigen Bildern Dritter (z. B. NASA/ESA) – ausschließlich selbst gestaltete, vereinfachte Darstellungen.</p>' +
    '<h3>Genauigkeit und Grenzen</h3>' +
    '<ul>' +
    '<li>Sonne und Mond: Winkelfehler unter etwa 0,02 Grad (Sternenhimmel-Bereich) bzw. wenige Bogenminuten (übrige Astronomie/Astrologie). Finsternisse wurden mit bekannten Ereignissen abgeglichen.</li>' +
    '<li>Planeten: zwischen 1800 und 2050 meist besser als 0,1–0,3 Grad. Außerhalb dieses Zeitraums nutzen beide Berechnungswege eine weniger genaue Langzeitnäherung.</li>' +
    '<li>Sterne: Eigenbewegungen fehlen; für ferne Jahrhunderte weichen Sternpositionen daher sichtbar ab.</li>' +
    '<li>Die Milchstraße im Sternenhimmel ist ein stilisiertes Band, keine Messdaten. Kometen, Satelliten, die ISS und Polarlichter sind nicht enthalten. Die jährlichen Sternschnuppenströme sind mit veröffentlichten Näherungswerten enthalten; das tatsächliche Maximum kann um etwa einen Tag abweichen.</li>' +
    '<li>Entfernungsangaben in Lichtjahren sind Näherungswerte; die Fachliteratur kann leicht abweichende Werte nennen.</li>' +
    '<li>Magnetkompasse in Mobilgeräten weichen oft um einige Grad ab und werden durch Metall und Elektronik gestört; der Sternenhimmel-Bereich bietet dafür eine Kalibrierung an.</li>' +
    '<li>Mondzahlen der Gasriesen sind mit Stand 2026 gekennzeichnet, da sich diese durch neue Entdeckungen laufend ändern.</li>' +
    '</ul>' +
    '<h3>Sicherheitshinweis zur Sonnenbeobachtung</h3>' +
    '<p>Blicke niemals ohne einen geeigneten, zertifizierten Sonnenfilter (z. B. Sonnenfinsternisbrille nach ISO 12312-2) in die Sonne, auch nicht bei einer Finsternis und auch nicht durch Kamera, Fernglas oder Fernrohr. Die Darstellung in der App ist eine Simulation und ersetzt keine offizielle Finsternisvorhersage.</p>' +
    '<h3>Haftungsausschluss</h3>' +
    '<p>Alle astrologischen und Tarot-Inhalte sind als Unterhaltung/Reflexionshilfe gekennzeichnet, nicht als wissenschaftliche, medizinische, psychologische, rechtliche oder finanzielle Beratung. Die Angaben in der App werden ohne Gewähr bereitgestellt.</p>';

  function renderImpressumInline() { document.getElementById('impressumInline').innerHTML = IMPRESSUM_HTML; }
  function renderDatenschutzInline() { document.getElementById('datenschutzInline').innerHTML = DATENSCHUTZ_HTML; }
  function renderLizenzenInline() { document.getElementById('lizenzenInline').innerHTML = LIZENZEN_HTML; }

  /* ---------------------------------------------------------------
     Init
     --------------------------------------------------------------- */
  /* ---------------------------------------------------------------
     Version & Updates
     --------------------------------------------------------------- */
  const APP_VERSION = '2.1';
  const APP_BUILD = 33; // muss zu CACHE_NAME im service-worker.js passen
  let swRegistration = null;
  let updateShown = false;
  function showUpdateBanner(worker) {
    if (updateShown) return;
    updateShown = true;
    const bar = document.getElementById('updateBar');
    if (!bar) return;
    bar.hidden = false;
    document.getElementById('updateBtn').onclick = function () {
      bar.querySelector('span').textContent = 'Wird aktualisiert …';
      if (worker) worker.postMessage({ type: 'SKIP_WAITING' });
      else location.reload();
    };
    document.getElementById('updateLater').onclick = function () { bar.hidden = true; };
  }
  function watchRegistration(reg) {
    swRegistration = reg;
    if (reg.waiting && navigator.serviceWorker.controller) showUpdateBanner(reg.waiting);
    reg.addEventListener('updatefound', function () {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', function () {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) showUpdateBanner(nw);
      });
    });
  }
  function checkForUpdate(manual) {
    if (!swRegistration) { if (manual) toast('Updates werden nur in der installierten App geprüft.'); return; }
    swRegistration.update().then(function () {
      if (manual) setTimeout(function () {
        if (!swRegistration.waiting && !swRegistration.installing) toast('AstroWahr ist auf dem neuesten Stand (Version ' + APP_VERSION + ').');
      }, 1200);
    }).catch(function () { if (manual) toast('Keine Verbindung – Update-Prüfung nicht möglich.'); });
  }

  /* ---------------------------------------------------------------
     Init
     --------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    applyTheme(getThemePref());
    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const onChange = function () { if (getThemePref() === 'system') applyTheme('system'); };
      if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
    }
    document.querySelectorAll('nav.bottom-nav button').forEach(function (b) {
      b.addEventListener('click', function () { navigate(b.dataset.tab); });
    });
    document.getElementById('backBtn').addEventListener('click', goBack);
    document.getElementById('searchBtn').addEventListener('click', openSearchModal);

    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalOverlay').addEventListener('click', function (e) { if (e.target.id === 'modalOverlay') closeModal(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.getElementById('modalOverlay').classList.contains('show')) { closeModal(); return; }
      // Tastatur/Schaltersteuerung: Elemente mit role="button" per Enter/Leertaste auslösen
      const t = e.target;
      if ((e.key === 'Enter' || e.key === ' ') && t && t.getAttribute && t.getAttribute('role') === 'button' && t.tagName !== 'BUTTON') {
        e.preventDefault(); t.click();
      }
    });
    document.getElementById('zoomInBtn').addEventListener('click', function () { zoomState.scale = Math.min(4, zoomState.scale + 0.4); applyZoomTransform(); });
    document.getElementById('zoomOutBtn').addEventListener('click', function () { zoomState.scale = Math.max(1, zoomState.scale - 0.4); applyZoomTransform(); });
    document.getElementById('zoomResetBtn').addEventListener('click', function () { zoomState = { scale: 1, tx: 0, ty: 0 }; applyZoomTransform(); });

    document.getElementById('view').addEventListener('click', function (e) {
      const gEl = e.target.closest('[data-glossary]');
      if (gEl) { showGlossary(gEl.dataset.glossary); return; }
      const zEl = e.target.closest('[data-zoom-card]');
      if (zEl) {
        const card = window.getCard(parseInt(zEl.dataset.zoomCard, 10));
        if (card) {
          const rev = zEl.dataset.zoomRev === '1';
          const art = window.generateCardArt(card);
          openImageModal(rev ? '<div style="transform:rotate(180deg);">' + art + '</div>' : art);
        }
        return;
      }
    });

    // Der eingebettete Sternenhimmel meldet einen dort gewählten Ort zurück
    window.addEventListener('message', function (e) {
      if (e.origin !== location.origin || !e.data || e.data.type !== 'zh-location') return;
      const lat = parseFloat(e.data.lat), lon = parseFloat(e.data.lon);
      if (!isFinite(lat) || !isFinite(lon)) return;
      saveLoc({ lat: lat, lon: lon, place: (e.data.name && !e.data.auto) ? String(e.data.name).slice(0, 60) : nearestPlaceName(lat, lon), auto: !!e.data.auto });
    });

    function routeFromHash() {
      const hashTab = (location.hash || '').replace('#', '');
      if (['impressum', 'datenschutz', 'lizenzen'].indexOf(hashTab) !== -1) {
        navigate('mehr'); navigate('rechtliches'); navigate(hashTab);
        history.replaceState(null, '', location.pathname + location.search);
        return true;
      } else if (hashTab === 'sternenhimmel') {
        navigate('astronomie'); navigate('sternenhimmel');
        history.replaceState(null, '', location.pathname + location.search);
        return true;
      }
      return false;
    }

    if (!routeFromHash()) {
      navigate('start');
    }

    // Der eingebettete Sternenhimmel (iframe) verlinkt mit target="_top" auf
    // z. B. "as-index.html#impressum". Ist AstroWahr bereits geladen, ist das nur
    // ein Fragment-Wechsel ohne Neuladen der Seite – daher zusätzlich auf
    // hashchange reagieren, damit der Link auch dann sichtbar navigiert.
    window.addEventListener('hashchange', function () {
      routeFromHash();
    });

    let onboarded = null;
    try { onboarded = localStorage.getItem(ONBOARD_KEY); } catch (e) {}
    if (!onboarded) { setTimeout(openTour, 300); }

    if ('serviceWorker' in navigator) {
      // Anmeldung und Update-Hinweis übernimmt wz-core.js für alle Apps gemeinsam
      navigator.serviceWorker.ready.then(watchRegistration).catch(function () {});
      // Beim Zurückkehren in die App im Hintergrund nach Updates sehen
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible' && swRegistration) swRegistration.update().catch(function () {});
      });
    }
  });
})();
