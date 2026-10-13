/* FunWahr: Liniensymbole statt Emojis (wie in den übrigen Apps) */
const ZW_ICON_MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
const ZW_ICON_SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3.9"/><path d="M12 2.6v2.3M12 19.1v2.3M2.6 12h2.3M19.1 12h2.3M5.7 5.7l1.2 1.2M17.1 17.1l1.2 1.2M18.3 5.7l-1.2 1.2M6.9 17.1l-1.2 1.2"/></svg>';
const ZW_ICON_SOUND_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.2 9.4h2.6l4.7-3.9v13L6.8 14.6H4.2a1.2 1.2 0 0 1-1.2-1.2v-2.8a1.2 1.2 0 0 1 1.2-1.2z"/><path d="M15.2 9a4.2 4.2 0 0 1 0 6"/><path d="M17.9 6.3a8 8 0 0 1 0 11.4"/></svg>';
const ZW_ICON_SOUND_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.2 9.4h2.6l4.7-3.9v13L6.8 14.6H4.2a1.2 1.2 0 0 1-1.2-1.2v-2.8a1.2 1.2 0 0 1 1.2-1.2z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';
// game.js — ZahlenturmWahr
// Eigenständige Neufassung von "Zahlenturm": Zahlen steigen spaltenweise in einen
// 3D-Turm und verschmelzen waagerecht wie senkrecht. Eigene Umsetzung eines
// allgemeinen Spielprinzips (Spielmechaniken sind nicht urheberrechtlich
// schützbar), komplett eigener Code, eigene Optik, eigener Name.
//
// Verfeinerungen gegenüber der Vorgängerversion:
//  - höherer Turm (7 statt 6 Reihen) für mehr taktische Tiefe
//  - Verschmelzungen laufen als Kettenreaktion vom Einwurfpunkt nach außen,
//    statt in starrer Spalten-Reihenfolge — fühlt sich wie eine echte Kettenreaktion an
//  - Kombo-System: mehrere Verschmelzungen in einer Kette geben steigenden Bonus
//  - überarbeitete Zufallsverteilung der aufsteigenden Zahlen: orientiert sich am
//    Durchschnitt der obersten Kacheln, überschreitet nie die höchste Kachel auf
//    dem Feld, mit gelegentlichen "Geschenk"-Kacheln für einfache Kombis
//  - Warnhinweis, wenn der Turm fast voll ist
//  - alles weiterhin 100% offline, keine externen Abhängigkeiten

const ZT_COLS = 5;
const ZT_MAX_ROWS = 7;
const ZT_MILESTONES = [128, 256, 512, 1024, 2048, 4096, 8192, 16384];
const ZT_PRISM_FROM = 4096;

const zt = {
  grid: [],
  score: 0,
  best: 0,
  over: false,
  nextValue: 2,
  nextValue2: 4,
  lastTappedCol: -1,
  animating: false,
  highestAnnounced: 0,
  undoSnapshot: null,
  soundOn: true,
  comboCount: 0,
  focusCol: 0,
  dropCount: 0,
  highestEver: 0,
  mode: 'endless',
  goalTarget: null,
  goalWon: false,
  goalWonShown: false,
};

function ztColorAttr(v) {
  return v >= ZT_PRISM_FROM ? null : String(v);
}

/* ---------- Persistenz ---------- */
function ztLoadBest() {
  try { return parseInt(localStorage.getItem('ztw-best') || '0', 10); } catch (e) { return 0; }
}
function ztSaveBest(v) {
  try { localStorage.setItem('ztw-best', String(v)); } catch (e) {}
}
function ztLoadState() {
  try {
    const raw = localStorage.getItem('ztw-state');
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function ztSaveState() {
  try {
    localStorage.setItem('ztw-state', JSON.stringify({
      grid: zt.grid, score: zt.score, over: zt.over,
      nextValue: zt.nextValue, nextValue2: zt.nextValue2,
      highestAnnounced: zt.highestAnnounced, undoSnapshot: zt.undoSnapshot,
      dropCount: zt.dropCount,
      mode: zt.mode, goalTarget: zt.goalTarget,
      goalWon: zt.goalWon, goalWonShown: zt.goalWonShown,
    }));
  } catch (e) {}
}
function ztClearState() {
  try { localStorage.removeItem('ztw-state'); } catch (e) {}
}
function ztLoadStats() {
  try {
    const raw = localStorage.getItem('ztw-stats');
    return raw ? JSON.parse(raw) : { gamesPlayed: 0, highestTileEver: 0 };
  } catch (e) { return { gamesPlayed: 0, highestTileEver: 0 }; }
}
function ztSaveStats(stats) {
  try { localStorage.setItem('ztw-stats', JSON.stringify(stats)); } catch (e) {}
}
function ztLoadSoundPref() {
  try {
    const raw = localStorage.getItem('ztw-sound');
    return raw === null ? true : raw === 'true';
  } catch (e) { return true; }
}
function ztSaveSoundPref(v) {
  try { localStorage.setItem('ztw-sound', String(v)); } catch (e) {}
}
function ztLoadThemePref() {
  // Zuletzt gewählter Modus wird gemerkt; ohne gespeicherte Wahl: Nachthimmel-Design (dunkel)
  return 'dark'; // Spiele bleiben immer im Nachthimmel-Look
}
function ztSaveThemePref(v) {
  try { localStorage.setItem('ztw-theme', v); } catch (e) {}
}

/* ---------- Sound & Haptik (synthetisiert, keine Audiodateien) ---------- */
let ztAudioCtx = null;
function ztPlayTone(freq, duration, type, volume) {
  if (!zt.soundOn) return;
  try {
    ztAudioCtx = ztAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = ztAudioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume || 0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
}
/* Pentatonische Tonleiter (C-Dur-Pentatonik über vier Oktaven) — alle Töne
   passen unabhängig von der Reihenfolge harmonisch zueinander, dadurch
   klingen auch schnelle Kettenreaktionen nie schräg oder dissonant. */
const ZT_SCALE = [
  130.81, 146.83, 164.81, 196.00, 220.00,
  261.63, 293.66, 329.63, 392.00, 440.00,
  523.25, 587.33, 659.25, 783.99, 880.00,
  1046.50, 1174.66, 1318.51, 1567.98, 1760.00,
];

function ztSoundFall() { ztPlayTone(196.00, 0.09, 'sine', 0.06); }
function ztSoundMerge(value, comboStep) {
  const exp = Math.max(1, Math.round(Math.log2(value)));
  const idx = Math.min(exp - 1, ZT_SCALE.length - 1);
  ztPlayTone(ZT_SCALE[idx], 0.22, 'triangle', 0.13);
  if (comboStep > 1) {
    const idx2 = Math.min(idx + 2, ZT_SCALE.length - 1);
    setTimeout(() => ztPlayTone(ZT_SCALE[idx2], 0.16, 'sine', 0.08), 40);
  }
}
function ztSoundMilestone() {
  ztPlayTone(523.25, 0.14, 'sine', 0.15);
  setTimeout(() => ztPlayTone(659.25, 0.14, 'sine', 0.15), 120);
  setTimeout(() => ztPlayTone(783.99, 0.26, 'sine', 0.16), 240);
}
function ztVibrate(pattern) {
  try { if ('vibrate' in navigator) navigator.vibrate(pattern); } catch (e) {}
}

/* ---------- Zufallsverteilung (balanciert, mit steigender Schwierigkeit) ---------- */
// Die Basis-Schwierigkeit steigt mit der Spieldauer, aber gebremst (logarithmisch),
// damit sie auf lange Sicht nicht davonläuft — für nahezu endloses Spielen bleibt
// vor allem der tatsächliche Spielfeldzustand ausschlaggebend, nicht die reine Zeit.
const ZT_DROPS_PER_DIFFICULTY_STEP = 18;
// Alle paar Würfe wird garantiert eine kleine, leicht kombinierbare Kachel
// eingestreut, unabhängig vom Zufall — damit nie zu lange nur große,
// schwer zu verrechnende Werte kommen.
const ZT_GUARANTEED_GIFT_EVERY = 5;

function ztRandomValue() {
  const flat = [];
  for (const col of zt.grid) for (const v of col) flat.push(v);
  if (!flat.length) return Math.random() < 0.6 ? 2 : 4;

  flat.sort((a, b) => b - a);
  const maxExpOnBoard = Math.floor(Math.log2(flat[0]));

  // Durchschnitt ALLER Steine (nicht nur der höchsten) für eine ruhigere,
  // weniger sprunghafte Kurve — ein hoher Einzelturm reißt die Vorschau
  // dadurch nicht sofort mit nach oben.
  const avgExp = flat.reduce((s, v) => s + Math.log2(v), 0) / flat.length;
  const boardCenterExp = Math.max(1, Math.round(avgExp) - 1);

  // Schwierigkeits-Sockel, der mit der Spieldauer steigt, aber logarithmisch
  // gebremst — so wächst er anfangs spürbar, flacht danach aber ab, statt
  // linear ins Unendliche zu laufen.
  const paceExp = 1 + Math.floor(Math.log2(1 + zt.dropCount / ZT_DROPS_PER_DIFFICULTY_STEP));
  // Die Obergrenze liegt jetzt HÖCHSTENS auf dem größten Stein, der bereits
  // auf dem Feld liegt (nicht mehr eine Stufe darüber) — so kann eine neue
  // Kachel den Turm nie über das hinaus fordern, was er selbst schon
  // erreicht hat, und die Werte laufen nicht mehr vorzeitig davon.
  const softCap = maxExpOnBoard;
  const centerExp = Math.min(Math.max(boardCenterExp, Math.min(paceExp, boardCenterExp + 1)), softCap);

  const forceGift = zt.dropCount > 0 && zt.dropCount % ZT_GUARANTEED_GIFT_EVERY === 0;
  const roll = Math.random();
  let exp;
  if (forceGift) {
    exp = Math.max(1, centerExp - 3);       // garantierte kleine Verschnaufpause
  } else if (roll < 0.20) {
    exp = Math.max(1, centerExp - 2);       // Geschenk-Kachel für leichte Kombis
  } else if (roll < 0.92) {
    exp = centerExp + (Math.floor(Math.random() * 3) - 1); // centerExp -1..+1
  } else {
    exp = centerExp + 1;                    // seltene Herausforderung
  }
  exp = Math.min(Math.max(1, exp), Math.max(1, softCap));
  return Math.pow(2, exp);
}

/* ---------- Spielstart ---------- */
function ztNewGame() {
  const stats = ztLoadStats();
  stats.gamesPlayed += 1;
  ztSaveStats(stats);
  zt.highestEver = stats.highestTileEver || 0;

  zt.grid = Array.from({ length: ZT_COLS }, () => []);
  zt.score = 0;
  zt.over = false;
  zt.best = ztLoadBest();
  zt.dropCount = 0;
  zt.nextValue = ztRandomValue();
  zt.nextValue2 = ztRandomValue();
  zt.lastTappedCol = -1;
  zt.animating = false;
  zt.highestAnnounced = 0;
  zt.undoSnapshot = null;
  zt.comboCount = 0;
  zt.goalWon = false;
  zt.goalWonShown = false;
  ztClearState();
  ztSaveState();
  ztRender(null);
}

/* ---------- Modus/Ziel aus der URL lesen (kommt von der Startseite) ---------- */
function ztReadModeFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const target = parseInt(params.get('target'), 10);
    const forceNew = params.get('new') === '1';
    if (mode === 'goal' && ZT_MILESTONES.includes(target)) {
      return { mode: 'goal', target, forceNew };
    }
    if (mode === 'endless') {
      return { mode: 'endless', target: null, forceNew };
    }
  } catch (e) {}
  return null; // keine expliziten URL-Parameter -> gespeicherten Stand nutzen
}

function ztApplySavedState(saved) {
  zt.grid = saved.grid;
  zt.score = saved.score || 0;
  zt.over = !!saved.over;
  zt.nextValue = saved.nextValue || ztRandomValue();
  zt.nextValue2 = saved.nextValue2 || ztRandomValue();
  zt.highestAnnounced = saved.highestAnnounced || 0;
  zt.undoSnapshot = saved.undoSnapshot || null;
  zt.dropCount = saved.dropCount || 0;
  zt.mode = saved.mode || 'endless';
  zt.goalTarget = saved.goalTarget || null;
  zt.goalWon = !!saved.goalWon;
  zt.goalWonShown = !!saved.goalWonShown;
  zt.lastTappedCol = -1;
  zt.animating = false;
  ztRender(null);
}

function ztInit() {
  zt.soundOn = ztLoadSoundPref();
  zt.best = ztLoadBest();
  zt.highestEver = ztLoadStats().highestTileEver || 0;

  const urlInfo = ztReadModeFromUrl();
  const saved = ztLoadState();

  if (urlInfo) {
    // Explizite Wahl von der Startseite: bei "new=1" (Button "Neues Spiel"/
    // "Ohne Ziel spielen"/Ziel-Kachel) IMMER neu starten, auch wenn Modus und
    // Ziel zufällig zum gespeicherten Stand passen. Nur ohne dieses Flag
    // (z. B. Seite neu geladen) wird bei exakt passendem Stand weitergespielt.
    const matchesSaved = !urlInfo.forceNew && saved && Array.isArray(saved.grid)
      && (saved.mode || 'endless') === urlInfo.mode
      && (saved.goalTarget || null) === urlInfo.target;
    if (matchesSaved) {
      ztApplySavedState(saved);
    } else {
      zt.mode = urlInfo.mode;
      zt.goalTarget = urlInfo.target;
      ztNewGame();
    }
  } else if (saved && Array.isArray(saved.grid)) {
    ztApplySavedState(saved);
  } else {
    zt.mode = 'endless';
    zt.goalTarget = null;
    ztNewGame();
  }
  ztUpdateSoundButton();
}

/* ---------- Kettenreaktion: Verschmelzungen vom Einwurfpunkt nach außen ---------- */
// Sucht nach der nächstgelegenen Verschmelzung zur zuletzt eingeworfenen Spalte.
// Wichtig: waagerecht UND senkrecht werden gemeinsam nach Entfernung sortiert
// geprüft, damit z. B. eine waagerechte Verschmelzung direkt neben dem
// Einwurfpunkt immer Vorrang vor einer senkrechten Verschmelzung in einer
// weiter entfernten Spalte hat — die Kette bleibt so am Einwurfpunkt verankert.
function ztFindAndDoOneMerge(originCol) {
  const oc = originCol < 0 ? 0 : originCol;

  for (let d = 0; d < ZT_COLS; d++) {
    const cols = d === 0 ? [oc] : [oc - d, oc + d].filter(c => c >= 0 && c < ZT_COLS);
    for (const c of cols) {
      const col = zt.grid[c];
      for (let i = col.length - 1; i > 0; i--) {
        if (col[i] === col[i - 1]) {
          col[i - 1] *= 2;
          col.splice(i, 1);
          return { value: col[i - 1], col: c, row: i - 1 };
        }
      }
    }

    const pairs = [];
    for (let a = 0; a < ZT_COLS - 1; a++) {
      const dist = Math.min(Math.abs(a - oc), Math.abs(a + 1 - oc));
      if (dist === d) pairs.push([a, a + 1]);
    }
    for (const [a, b] of pairs) {
      const colA = zt.grid[a], colB = zt.grid[b];
      const minLen = Math.min(colA.length, colB.length);
      for (let i = minLen - 1; i >= 0; i--) {
        if (colA[i] === colB[i]) {
          colA[i] *= 2;
          colB.splice(i, 1);
          return { value: colA[i], col: a, row: i };
        }
      }
    }
  }
  return null;
}

function ztCheckGameOver() {
  zt.over = zt.grid.every(col => col.length >= ZT_MAX_ROWS);
}

/* Lässt eine Kachel sichtbar von unterhalb des Turms in die Zielspalte
   aufsteigen. Arbeitet mit den tatsächlichen Pixel-Positionen der Zellen
   (statt einer festen CSS-Keyframe-Prozentangabe), damit die Animation auf
   jedem Bildschirm und in jeder Turmhöhe exakt in der richtigen Spalte
   landet. */
function ztAnimateDrop(colIndex, value, onLand) {
  const board = document.getElementById('zt-board');
  const col = zt.grid[colIndex];
  // Der Turm baut sich jetzt von der Oberkante nach unten auf: der erste
  // Stein einer Spalte landet ganz oben, jeder weitere darunter. Deshalb
  // entspricht die Landezeile direkt der aktuellen Spaltenlänge (vor dem
  // Einfügen) — bei einer leeren Spalte also Zeile 0 (Oberkante).
  const landingRow = col.length;
  const columnEl = board ? board.querySelectorAll('.zt-column')[colIndex] : null;

  if (!board || !columnEl) {
    // Sicherheitsnetz: falls das Layout nicht gemessen werden kann,
    // Kachel trotzdem regulär einsetzen statt das Spiel zu blockieren.
    col.push(value);
    onLand();
    return;
  }

  const boardRect = board.getBoundingClientRect();
  const colRect = columnEl.getBoundingClientRect();
  const rowHeight = colRect.height / ZT_MAX_ROWS;
  const left = colRect.left - boardRect.left + ZT_TILE_INSET;
  const width = colRect.width - ZT_TILE_INSET * 2;
  const height = rowHeight - ZT_TILE_GAP;
  const topTarget = (colRect.top - boardRect.top) + landingRow * rowHeight + ZT_TILE_GAP / 2;

  const flyer = document.createElement('div');
  flyer.className = 'zt-tile zt-tile-flying';
  const attr = ztColorAttr(value);
  if (attr) flyer.dataset.v = attr; else flyer.dataset.prism = 'true';
  flyer.textContent = value;
  flyer.style.fontSize = ztFontSizeFor(value, Math.min(width, height)) + 'px';
  flyer.style.width = width + 'px';
  flyer.style.height = height + 'px';
  flyer.style.left = left + 'px';
  // Startposition unterhalb des sichtbaren Turms, statt oberhalb.
  flyer.style.top = (boardRect.height + height * 1.2) + 'px';
  board.appendChild(flyer);

  void flyer.offsetHeight; // Reflow erzwingen, damit die Transition greift

  const duration = 380; // spürbar zügig aufsteigend
  // Abbremsende Kurve statt beschleunigend — ein Aufstieg wirkt natürlicher,
  // wenn er zum Ziel hin ausklingt statt zu beschleunigen.
  flyer.style.transition = 'top ' + duration + 'ms cubic-bezier(.15,.65,.35,1)';
  requestAnimationFrame(() => { flyer.style.top = topTarget + 'px'; });

  setTimeout(() => {
    flyer.style.transition = 'transform 130ms ease-out';
    flyer.style.transform = 'scaleY(.8) scaleX(1.1)';
    setTimeout(() => { flyer.style.transform = 'scaleY(1) scaleX(1)'; }, 130);
    setTimeout(() => {
      flyer.remove();
      onLand();
    }, 150);
  }, duration);
}

function ztInsert(colIndex) {
  if (zt.over || zt.animating) return;
  const col = zt.grid[colIndex];
  if (col.length >= ZT_MAX_ROWS) return;

  zt.undoSnapshot = {
    grid: JSON.parse(JSON.stringify(zt.grid)),
    score: zt.score,
    nextValue: zt.nextValue,
    nextValue2: zt.nextValue2,
    highestAnnounced: zt.highestAnnounced,
    dropCount: zt.dropCount,
  };

  zt.lastTappedCol = colIndex;
  zt.animating = true;
  zt.comboCount = 0;
  zt.dropCount += 1;
  const value = zt.nextValue;
  ztSoundFall();

  ztAnimateDrop(colIndex, value, () => {
    col.push(value);
    ztRender(null);
    setTimeout(() => ztStepMerges(colIndex), 120);
  });
}

function ztStepMerges(originCol) {
  const merge = ztFindAndDoOneMerge(originCol);
  if (merge) {
    const mergedValue = merge.value;
    zt.comboCount += 1;
    const multiplier = 1 + Math.min(zt.comboCount - 1, 4) * 0.5;
    const gained = Math.round(mergedValue * multiplier);
    zt.score += gained;

    ztSoundMerge(mergedValue, zt.comboCount);
    ztVibrate(zt.comboCount > 1 ? [18, 30, 18] : 22);
    ztSpawnScoreFloat(merge.col, merge.row, gained);

    if (mergedValue > zt.highestAnnounced && ZT_MILESTONES.includes(mergedValue)) {
      zt.highestAnnounced = mergedValue;
      ztShowMilestoneToast(mergedValue);
      ztSoundMilestone();
      ztVibrate([20, 40, 20]);
    }
    if (zt.mode === 'goal' && zt.goalTarget && mergedValue >= zt.goalTarget) {
      zt.goalWon = true;
    }
    const stats = ztLoadStats();
    if (mergedValue > stats.highestTileEver) {
      stats.highestTileEver = mergedValue;
      ztSaveStats(stats);
      zt.highestEver = mergedValue;
    }

    ztRender('merge', { col: merge.col, row: merge.row });
    setTimeout(() => ztStepMerges(originCol), 400);
    return;
  }

  if (zt.score > zt.best) { zt.best = zt.score; ztSaveBest(zt.best); }
  zt.nextValue = zt.nextValue2;
  zt.nextValue2 = ztRandomValue();
  ztCheckGameOver();
  zt.animating = false;
  zt.comboCount = 0;
  ztSaveState();
  ztRender(null);
  ztUpdateStatsPanel();
  if (zt.mode === 'goal' && zt.goalWon && !zt.goalWonShown) {
    zt.goalWonShown = true;
    ztSaveState();
    ztShowGoalWinModal();
  }
}

function ztUndo() {
  if (!zt.undoSnapshot || zt.animating) return;
  zt.grid = zt.undoSnapshot.grid;
  zt.score = zt.undoSnapshot.score;
  zt.nextValue = zt.undoSnapshot.nextValue;
  zt.nextValue2 = zt.undoSnapshot.nextValue2;
  zt.highestAnnounced = zt.undoSnapshot.highestAnnounced;
  zt.dropCount = zt.undoSnapshot.dropCount;
  zt.undoSnapshot = null;
  zt.over = false;
  ztSaveState();
  ztRender(null);
}

function ztToggleSound() {
  zt.soundOn = !zt.soundOn;
  ztSaveSoundPref(zt.soundOn);
  ztUpdateSoundButton();
}
function ztUpdateSoundButton() {
  const btn = document.getElementById('zt-sound-btn');
  if (btn) {
    btn.innerHTML = zt.soundOn ? ZW_ICON_SOUND_ON : ZW_ICON_SOUND_OFF;
    btn.setAttribute('aria-pressed', String(zt.soundOn));
  }
}

function ztApplyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('zt-theme-btn');
  if (btn) {
    btn.innerHTML = theme === 'light' ? ZW_ICON_SUN : ZW_ICON_MOON;
    const lbl = theme === 'light' ? 'Hellmodus aktiv – zu Dunkel wechseln' : 'Dunkelmodus aktiv – zu Hell wechseln';
    btn.setAttribute('title', lbl);
    btn.setAttribute('aria-label', lbl);
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#eef1fb' : '#0d0a1c');
}
function ztToggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  const next = current === 'light' ? 'dark' : 'light';
  ztSaveThemePref(next);
  ztApplyTheme(next);
}

/* ---------- Erfolgs-Animationen (Konfetti & fliegende Punkte) ---------- */
const ZT_CONFETTI_COLORS = ['#ffbe4d', '#ff5c8a', '#5ce097', '#57e2ef', '#8a86ff', '#ffe000'];

function ztBurstConfetti(x, y, count) {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'zt-confetti';
    const angle = Math.random() * Math.PI * 2;
    const dist = 55 + Math.random() * 75;
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    p.style.setProperty('--dx', (Math.cos(angle) * dist) + 'px');
    p.style.setProperty('--dy', (Math.sin(angle) * dist) + 'px');
    p.style.setProperty('--rot', (Math.random() * 360) + 'deg');
    p.style.background = ZT_CONFETTI_COLORS[i % ZT_CONFETTI_COLORS.length];
    p.style.animationDelay = (Math.random() * 70) + 'ms';
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 950);
  }
}

/* Kleine fliegende "+Punkte"-Anzeige direkt über der verschmolzenen Kachel —
   sofortiges, spielerisches Erfolgsfeedback bei jeder einzelnen Verschmelzung. */
function ztSpawnScoreFloat(colIndex, rowIndex, amount) {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const board = document.getElementById('zt-board');
  if (!board) return;
  const columnEl = board.querySelectorAll('.zt-column')[colIndex];
  if (!columnEl) return;
  const boardRect = board.getBoundingClientRect();
  const colRect = columnEl.getBoundingClientRect();
  const rowHeight = colRect.height / ZT_MAX_ROWS;
  const rowFromTop = rowIndex; // Turm baut sich von oben nach unten auf
  const top = (colRect.top - boardRect.top) + rowFromTop * rowHeight + rowHeight / 2;
  const left = (colRect.left - boardRect.left) + colRect.width / 2;

  const el = document.createElement('div');
  el.className = 'zt-score-float';
  el.textContent = '+' + amount;
  el.style.left = left + 'px';
  el.style.top = top + 'px';
  board.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

function ztShowMilestoneToast(value) {
  const toast = document.getElementById('zt-toast');
  if (!toast) return;
  toast.innerHTML = '<svg class="fw-i" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d="M12 2.5l2.3 6.6 6.9.2-5.5 4.2 2 6.7L12 16.3l-5.7 3.9 2-6.7-5.5-4.2 6.9-.2z"/></svg> ' + value + ' erreicht!';
  toast.classList.remove('toast-show');
  void toast.offsetWidth;
  toast.classList.add('toast-show');
  clearTimeout(ztShowMilestoneToast._t);
  ztShowMilestoneToast._t = setTimeout(() => toast.classList.remove('toast-show'), 1800);
  const rect = toast.getBoundingClientRect();
  ztBurstConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2, 16);
}

/* ---------- Allgemeiner Bestätigungs-Dialog ---------- */
function ztShowConfirm(title, text, onConfirm) {
  const backdrop = document.getElementById('zt-confirm-modal-backdrop');
  const titleEl = document.getElementById('zt-confirm-modal-title');
  const textEl = document.getElementById('zt-confirm-modal-text');
  const yesBtn = document.getElementById('zt-confirm-yes-btn');
  if (!backdrop || !yesBtn) { onConfirm(); return; } // Sicherheitsnetz, falls Markup fehlt
  if (titleEl) titleEl.textContent = title;
  if (textEl) textEl.textContent = text;
  yesBtn.onclick = () => { backdrop.hidden = true; onConfirm(); };
  backdrop.hidden = false;
}

/* ---------- Ziel-Modus: Gewinn-Dialog ---------- */
function ztHideGoalModal() {
  const backdrop = document.getElementById('zt-goal-modal-backdrop');
  if (backdrop) backdrop.hidden = true;
}
function ztGoToNextGoal() {
  const idx = ZT_MILESTONES.indexOf(zt.goalTarget);
  if (idx >= 0 && idx < ZT_MILESTONES.length - 1) {
    window.location.href = 'zw-spiel.html?mode=goal&target=' + ZT_MILESTONES[idx + 1];
  } else {
    ztHideGoalModal();
  }
}
function ztShowGoalWinModal() {
  const backdrop = document.getElementById('zt-goal-modal-backdrop');
  const text = document.getElementById('zt-goal-modal-text');
  const nextBtn = document.getElementById('zt-goal-next-btn');
  const title = document.getElementById('zt-goal-modal-title');
  if (!backdrop) return;
  if (text) {
    text.textContent = 'Du hast ' + zt.goalTarget + ' in ' + zt.dropCount + ' Zügen erreicht — Punktestand: ' + zt.score + '.';
  }
  const idx = ZT_MILESTONES.indexOf(zt.goalTarget);
  const hasNext = idx >= 0 && idx < ZT_MILESTONES.length - 1;
  if (nextBtn) {
    nextBtn.hidden = !hasNext;
    if (hasNext) nextBtn.innerHTML = '<svg class="fw-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg> Nächstes Ziel: ' + ZT_MILESTONES[idx + 1];
  }
  backdrop.hidden = false;
  ztSoundMilestone();
  ztVibrate([20, 40, 20, 40, 20]);
  if (title) {
    const rect = title.getBoundingClientRect();
    ztBurstConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2, 28);
  }
}

function ztUpdateStatsPanel() {
  const stats = ztLoadStats();
  zt.highestEver = stats.highestTileEver || 0;
  const el = document.getElementById('zt-highest');
  if (el) el.textContent = stats.highestTileEver || '–';
}

/* ---------- Rendering ---------- */
// Schriftgröße wird relativ zur tatsächlich gerenderten Kachelgröße berechnet
// (nicht als fester Pixelwert), damit auch sehr große Zahlen (z. B. 16384)
// bei jeder Turmhöhe und Bildschirmgröße zuverlässig in die Kachel passen.
const ZT_FONT_RATIO = { 1: 0.40, 2: 0.36, 3: 0.30, 4: 0.25, 5: 0.21, 6: 0.18 };
function ztFontSizeFor(value, cellSize) {
  const digits = Math.min(String(value).length, 6);
  const ratio = ZT_FONT_RATIO[digits] || 0.16;
  return Math.max(9, Math.round(cellSize * ratio));
}
const ZT_TILE_GAP = 6; // schwebender Abstand zwischen gestapelten Steinen
const ZT_TILE_INSET = 4; // schwebender Abstand zu den Spaltenwänden

function ztFlashScore(el) {
  if (!el) return;
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
}

function ztRender(mode, mergeAt) {
  const board = document.getElementById('zt-board');
  if (!board) return;
  board.innerHTML = '';

  const nearFullCols = zt.grid.map(col => col.length >= ZT_MAX_ROWS - 1);

  // Phase 1: leere Spalten (durchgängige "Röhren") anlegen und ins DOM
  // einhängen, damit ihre tatsächliche gerenderte Höhe gemessen werden kann.
  const columnEls = [];
  for (let c = 0; c < ZT_COLS; c++) {
    const columnEl = document.createElement('div');
    columnEl.className = 'zt-column';
    if (nearFullCols[c]) columnEl.dataset.danger = 'true';
    columnEl.tabIndex = 0;
    columnEl.setAttribute('role', 'button');
    columnEl.setAttribute('aria-label', 'Spalte ' + (c + 1) + ' antippen');
    columnEl.addEventListener('click', () => ztInsert(c));
    columnEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ztInsert(c); }
      if (e.key === 'ArrowLeft' && c > 0) { e.preventDefault(); ztFocusCol(c - 1); }
      if (e.key === 'ArrowRight' && c < ZT_COLS - 1) { e.preventDefault(); ztFocusCol(c + 1); }
    });
    board.appendChild(columnEl);
    columnEls.push(columnEl);
  }

  // Phase 2: Höhe/Breite jetzt messen und schwebende Steine einsetzen.
  const colRect0 = columnEls[0].getBoundingClientRect();
  const rowHeight = colRect0.height / ZT_MAX_ROWS;
  const colWidth = colRect0.width;
  const cellSize = Math.min(colWidth, rowHeight);

  for (let c = 0; c < ZT_COLS; c++) {
    const col = zt.grid[c];
    const columnEl = columnEls[c];
    for (let i = 0; i < col.length; i++) {
      const v = col[i];
      const rowFromTop = i; // Turm baut sich von oben nach unten auf
      const tile = document.createElement('div');
      const isMerging = mode === 'merge' && mergeAt && mergeAt.col === c && mergeAt.row === i;
      tile.className = 'zt-tile' + (isMerging ? ' zt-tile-merge' : '');
      tile.style.left = ZT_TILE_INSET + 'px';
      tile.style.right = ZT_TILE_INSET + 'px';
      tile.style.top = (rowFromTop * rowHeight + ZT_TILE_GAP / 2) + 'px';
      tile.style.height = (rowHeight - ZT_TILE_GAP) + 'px';
      tile.style.fontSize = ztFontSizeFor(v, cellSize) + 'px';
      const attr = ztColorAttr(v);
      if (attr) tile.dataset.v = attr; else tile.dataset.prism = 'true';
      tile.textContent = v;
      columnEl.appendChild(tile);
    }
  }

  const scoreEl = document.getElementById('zt-score');
  if (scoreEl) {
    if (scoreEl.textContent !== String(zt.score)) ztFlashScore(scoreEl);
    scoreEl.textContent = zt.score;
  }
  const bestEl = document.getElementById('zt-best');
  if (bestEl) bestEl.textContent = zt.best;

  const comboCard = document.getElementById('zt-combo-card');
  const comboEl = document.getElementById('zt-combo');
  if (comboCard && comboEl) {
    if (zt.comboCount >= 2) {
      const comboText = '×' + (1 + Math.min(zt.comboCount - 1, 4) * 0.5).toFixed(1);
      if (comboEl.textContent !== comboText) ztFlashScore(comboEl);
      comboEl.textContent = comboText;
      comboCard.hidden = false;
    } else {
      comboCard.hidden = true;
    }
  }

  const goalCard = document.getElementById('zt-goal-card');
  const goalValueEl = document.getElementById('zt-goal-value');
  if (goalCard && goalValueEl) {
    if (zt.mode === 'goal' && zt.goalTarget) {
      goalValueEl.innerHTML = (zt.goalWon ? '<svg class="fw-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 12.5l5 5 10-11"/></svg> ' : '') + zt.goalTarget;
      goalCard.hidden = false;
    } else {
      goalCard.hidden = true;
    }
  }

  const nextEl = document.getElementById('zt-next-value');
  if (nextEl) {
    nextEl.textContent = zt.nextValue;
    // Exakt dieselbe Größe wie die Kacheln im Spielfeld.
    nextEl.style.width = cellSize + 'px';
    nextEl.style.height = cellSize + 'px';
    nextEl.style.fontSize = ztFontSizeFor(zt.nextValue, cellSize) + 'px';
    const attr = ztColorAttr(zt.nextValue);
    if (attr) { nextEl.dataset.v = attr; nextEl.removeAttribute('data-prism'); }
    else { nextEl.dataset.prism = 'true'; nextEl.removeAttribute('data-v'); }
  }
  const next2El = document.getElementById('zt-next-value-2');
  if (next2El) {
    next2El.textContent = zt.nextValue2;
    // Bewusst kleiner als die "steigt jetzt"-Kachel (ca. 3/4 der Größe),
    // damit die Vorschau erkennbar als "danach" abgesetzt bleibt.
    const smallSize = Math.round(cellSize * 0.72);
    next2El.style.width = smallSize + 'px';
    next2El.style.height = smallSize + 'px';
    next2El.style.fontSize = ztFontSizeFor(zt.nextValue2, smallSize) + 'px';
    const attr2 = ztColorAttr(zt.nextValue2);
    if (attr2) { next2El.dataset.v = attr2; next2El.removeAttribute('data-prism'); }
    else { next2El.dataset.prism = 'true'; next2El.removeAttribute('data-v'); }
  }

  const statusEl = document.getElementById('zt-status');
  if (statusEl) {
    if (zt.over) {
      statusEl.textContent = 'Game over';
      statusEl.hidden = false;
    } else {
      statusEl.hidden = true;
    }
  }

  const highestEl = document.getElementById('zt-highest');
  if (highestEl) highestEl.textContent = zt.highestEver || '–';

  // Nur davon abhängig, ob überhaupt ein Rückgängig-Stand existiert — nicht
  // zusätzlich vom Animationsstatus, sonst schaltet der Button bei jedem
  // Zug kurz ab und wieder an und wirkt dadurch wie ein Blinken. Ein Klick
  // während der Animation wird ohnehin von ztUndo() selbst ignoriert.
  const undoBtn = document.getElementById('zt-undo-btn');
  if (undoBtn) undoBtn.disabled = !zt.undoSnapshot;
}

function ztFocusCol(c) {
  const board = document.getElementById('zt-board');
  if (!board) return;
  const cell = board.querySelectorAll('.zt-column')[c];
  if (cell) cell.focus();
}

/* ---------- Setup ---------- */
function setupZahlenturmWahr() {
  if (!document.getElementById('zt-board')) return;
  ztApplyTheme(ztLoadThemePref());
  ztInit();
  ztUpdateStatsPanel();

  const newGameBtn = document.getElementById('zt-newgame-btn');
  if (newGameBtn) newGameBtn.addEventListener('click', () => {
    if (zt.animating) return;
    ztShowConfirm(
      'Neuer Turm?',
      'Der aktuelle Spielstand geht dabei verloren.',
      () => { ztNewGame(); ztUpdateStatsPanel(); }
    );
  });

  const undoBtn = document.getElementById('zt-undo-btn');
  if (undoBtn) undoBtn.addEventListener('click', () => {
    if (!zt.undoSnapshot || zt.animating) return;
    ztShowConfirm(
      'Zug rückgängig machen?',
      'Der letzte Zug wird zurückgenommen.',
      ztUndo
    );
  });

  const confirmNoBtn = document.getElementById('zt-confirm-no-btn');
  const confirmBackdrop = document.getElementById('zt-confirm-modal-backdrop');
  if (confirmNoBtn && confirmBackdrop) {
    confirmNoBtn.addEventListener('click', () => { confirmBackdrop.hidden = true; });
  }
  if (confirmBackdrop) {
    confirmBackdrop.addEventListener('click', (e) => {
      if (e.target === confirmBackdrop) confirmBackdrop.hidden = true;
    });
  }

  const soundBtn = document.getElementById('zt-sound-btn');
  if (soundBtn) soundBtn.addEventListener('click', ztToggleSound);

  const themeBtn = document.getElementById('zt-theme-btn');
  if (themeBtn) themeBtn.addEventListener('click', ztToggleTheme);

  const goalNextBtn = document.getElementById('zt-goal-next-btn');
  const goalContinueBtn = document.getElementById('zt-goal-continue-btn');
  if (goalNextBtn) goalNextBtn.addEventListener('click', ztGoToNextGoal);
  if (goalContinueBtn) goalContinueBtn.addEventListener('click', ztHideGoalModal);

  // Falls die Seite neu geladen wird, nachdem das Ziel bereits erreicht,
  // aber der Dialog noch nicht bestätigt wurde, den Dialog erneut zeigen.
  if (zt.mode === 'goal' && zt.goalWon && !zt.goalWonShown) {
    zt.goalWonShown = true;
    ztSaveState();
    ztShowGoalWinModal();
  }
}

document.addEventListener('DOMContentLoaded', setupZahlenturmWahr);
