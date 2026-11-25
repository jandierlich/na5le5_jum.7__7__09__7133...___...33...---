// gameturm.js — "Zahlenturm": eigenständiges Merge-Spiel, bei dem Zahlen spaltenweise
// von oben herabfallen und verschmelzen (waagerecht und senkrecht). Eigene Umsetzung
// eines allgemeinen Spielprinzips (Spielmechaniken sind nicht urheberrechtlich
// schützbar), komplett eigener Code, eigene Optik, eigener Name.
//
// Erweiterte Fassung für Keysglade: Keysglade-Farbpalette & Systemschrift,
// Rückgängig-Funktion, Spielstand-Fortsetzung (übersteht Schließen
// der App), synthetisierte Soundeffekte (Web Audio API, keine Audiodatei),
// Vibration bei Verschmelzung (falls vom Gerät unterstützt), Meilenstein-Hinweise
// und eine kleine Statistik. Alles bleibt vollständig lokal (localStorage),
// keine externen Abhängigkeiten, funktioniert komplett offline.

const ZT_COLS = 5;
const ZT_MAX_ROWS = 6;
const ZT_MILESTONES = [128, 256, 512, 1024, 2048, 4096, 8192];

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
};

const ZT_COLORS = {
  2: ['#d3ece3', '#1c2b38'], 4: ['#dcebf5', '#1c2b38'], 8: ['#f8ddc6', '#1c2b38'],
  16: ['#FFB347', '#1c2b38'], 32: ['#FF8C00', '#fff'], 64: ['#6C8BFF', '#fff'],
  128: ['#3355C8', '#fff'], 256: ['#4a90d9', '#fff'], 512: ['#1E2A78', '#fff'],
  1024: ['#0B1440', '#fff'], 2048: ['#e35b3f', '#fff'], 4096: ['#b23a2a', '#fff'],
};
function ztColor(v) {
  return ZT_COLORS[v] || ['#142433', '#fff'];
}

function ztLoadBest() {
  try { return parseInt(localStorage.getItem('zahlenturm-best') || '0', 10); } catch (e) { return 0; }
}
function ztSaveBest(v) {
  try { localStorage.setItem('zahlenturm-best', String(v)); } catch (e) {}
}

function ztLoadState() {
  try {
    const raw = localStorage.getItem('zahlenturm-state');
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function ztSaveState() {
  try {
    localStorage.setItem('zahlenturm-state', JSON.stringify({
      grid: zt.grid, score: zt.score, over: zt.over,
      nextValue: zt.nextValue, nextValue2: zt.nextValue2,
      highestAnnounced: zt.highestAnnounced, undoSnapshot: zt.undoSnapshot,
    }));
  } catch (e) {}
}
function ztClearState() {
  try { localStorage.removeItem('zahlenturm-state'); } catch (e) {}
}

function ztLoadStats() {
  try {
    const raw = localStorage.getItem('zahlenturm-stats');
    return raw ? JSON.parse(raw) : { gamesPlayed: 0, highestTileEver: 0 };
  } catch (e) { return { gamesPlayed: 0, highestTileEver: 0 }; }
}
function ztSaveStats(stats) {
  try { localStorage.setItem('zahlenturm-stats', JSON.stringify(stats)); } catch (e) {}
}

function ztLoadSoundPref() {
  try {
    const raw = localStorage.getItem('zahlenturm-sound');
    return raw === null ? true : raw === 'true';
  } catch (e) { return true; }
}
function ztSaveSoundPref(v) {
  try { localStorage.setItem('zahlenturm-sound', String(v)); } catch (e) {}
}

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
function ztSoundFall() { ztPlayTone(220, 0.12, 'sine', 0.1); }
function ztSoundMerge(value) {
  const pitch = 300 + Math.min(Math.log2(value) * 40, 500);
  ztPlayTone(pitch, 0.18, 'triangle', 0.14);
}
function ztSoundMilestone() {
  ztPlayTone(523, 0.12, 'sine', 0.16);
  setTimeout(() => ztPlayTone(659, 0.12, 'sine', 0.16), 110);
  setTimeout(() => ztPlayTone(784, 0.22, 'sine', 0.16), 220);
}

function ztVibrate(pattern) {
  try { if ('vibrate' in navigator) navigator.vibrate(pattern); } catch (e) {}
}

function ztShowMilestoneToast(value) {
  const toast = document.getElementById('zt-toast');
  if (!toast) return;
  toast.innerHTML = rwi('spark') + ' ' + value + ' erreicht!';
  toast.classList.remove('zt-toast-show');
  void toast.offsetWidth;
  toast.classList.add('zt-toast-show');
}

function ztRandomValue() {
  const maxTile = zt.grid.reduce((m, col) => col.reduce((mm, v) => Math.max(mm, v), m), 2);
  const maxExp = Math.max(1, Math.floor(Math.log2(maxTile)));

  if (Math.random() < 0.15) {
    const lowExp = 1 + Math.floor(Math.random() * 2);
    return Math.pow(2, lowExp);
  }

  const highExp = Math.max(1, maxExp - 2);
  const lowExp = Math.max(1, highExp - 2);
  const exp = lowExp + Math.floor(Math.random() * (highExp - lowExp + 1));
  return Math.pow(2, exp);
}

function ztNewGame() {
  const stats = ztLoadStats();
  stats.gamesPlayed += 1;
  ztSaveStats(stats);

  zt.grid = Array.from({ length: ZT_COLS }, () => []);
  zt.score = 0;
  zt.over = false;
  zt.best = ztLoadBest();
  zt.nextValue = ztRandomValue();
  zt.nextValue2 = ztRandomValue();
  zt.lastTappedCol = -1;
  zt.animating = false;
  zt.highestAnnounced = 0;
  zt.undoSnapshot = null;
  ztClearState();
  ztSaveState();
  ztRender(null);
}

function ztInit() {
  zt.soundOn = ztLoadSoundPref();
  zt.best = ztLoadBest();

  const saved = ztLoadState();
  if (saved && Array.isArray(saved.grid)) {
    zt.grid = saved.grid;
    zt.score = saved.score || 0;
    zt.over = !!saved.over;
    zt.nextValue = saved.nextValue || ztRandomValue();
    zt.nextValue2 = saved.nextValue2 || ztRandomValue();
    zt.highestAnnounced = saved.highestAnnounced || 0;
    zt.undoSnapshot = saved.undoSnapshot || null;
    zt.lastTappedCol = -1;
    zt.animating = false;
    ztRender(null);
  } else {
    ztNewGame();
  }
  ztUpdateSoundButton();
}

function ztFindAndDoOneMerge() {
  for (let c = 0; c < ZT_COLS; c++) {
    const col = zt.grid[c];
    for (let i = col.length - 1; i > 0; i--) {
      if (col[i] === col[i - 1]) {
        col[i - 1] *= 2;
        zt.score += col[i - 1];
        col.splice(i, 1);
        return col[i - 1];
      }
    }
  }
  for (let c = 0; c < ZT_COLS - 1; c++) {
    const a = zt.grid[c], b = zt.grid[c + 1];
    const minLen = Math.min(a.length, b.length);
    for (let i = minLen - 1; i >= 0; i--) {
      if (a[i] === b[i]) {
        a[i] *= 2;
        zt.score += a[i];
        b.splice(i, 1);
        return a[i];
      }
    }
  }
  return 0;
}

function ztCheckGameOver() {
  zt.over = zt.grid.every(col => col.length >= ZT_MAX_ROWS);
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
  };

  zt.lastTappedCol = colIndex;
  zt.animating = true;
  col.push(zt.nextValue);
  ztSoundFall();
  ztRender('fall');

  setTimeout(ztStepMerges, 480);
}

function ztStepMerges() {
  const mergedValue = ztFindAndDoOneMerge();
  if (mergedValue) {
    ztSoundMerge(mergedValue);
    ztVibrate(25);

    if (mergedValue > zt.highestAnnounced && ZT_MILESTONES.includes(mergedValue)) {
      zt.highestAnnounced = mergedValue;
      ztShowMilestoneToast(mergedValue);
      ztSoundMilestone();
      ztVibrate([20, 40, 20]);
    }
    const stats = ztLoadStats();
    if (mergedValue > stats.highestTileEver) {
      stats.highestTileEver = mergedValue;
      ztSaveStats(stats);
    }

    ztRender('merge');
    setTimeout(ztStepMerges, 420);
    return;
  }

  if (zt.score > zt.best) { zt.best = zt.score; ztSaveBest(zt.best); }
  zt.nextValue = zt.nextValue2;
  zt.nextValue2 = ztRandomValue();
  ztCheckGameOver();
  zt.animating = false;
  ztSaveState();
  ztRender(null);
  ztUpdateStatsPanel();
}

function ztUndo() {
  if (!zt.undoSnapshot || zt.animating) return;
  zt.grid = zt.undoSnapshot.grid;
  zt.score = zt.undoSnapshot.score;
  zt.nextValue = zt.undoSnapshot.nextValue;
  zt.nextValue2 = zt.undoSnapshot.nextValue2;
  zt.highestAnnounced = zt.undoSnapshot.highestAnnounced;
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
    btn.innerHTML = rwi(zt.soundOn ? 'speaker' : 'mute');
    btn.setAttribute('aria-pressed', String(zt.soundOn));
  }
}

function ztUpdateStatsPanel() {
  const stats = ztLoadStats();
  const el = document.getElementById('zt-stats');
  if (el) {
    el.textContent = stats.gamesPlayed + ' ' + (stats.gamesPlayed === 1 ? "Spiel" : "Spiele") + ' gespielt · höchste Zahl je: ' + (stats.highestTileEver || "–");
  }
}

function ztRender(mode) {
  const board = document.getElementById('zt-board');
  if (!board) return;
  board.innerHTML = '';

  for (let r = 0; r < ZT_MAX_ROWS; r++) {
    for (let c = 0; c < ZT_COLS; c++) {
      const col = zt.grid[c];
      const posFromBottom = ZT_MAX_ROWS - 1 - r;
      const v = posFromBottom < col.length ? col[posFromBottom] : 0;

      const cell = document.createElement('div');
      const isTop = r === 0;
      const isBottom = r === ZT_MAX_ROWS - 1;
      const radius = isTop && isBottom ? '10px' : isTop ? '10px 10px 0 0' : isBottom ? '0 0 10px 10px' : '0';
      cell.className = 'zt-cell';
      cell.style.borderRadius = radius;
      cell.addEventListener('click', () => ztInsert(c));
      if (isTop) {
        cell.tabIndex = 0;
        cell.setAttribute('role', 'button');
        cell.setAttribute('aria-label', 'Spalte ' + (c + 1) + ' antippen');
        cell.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ztInsert(c); }
        });
      }

      if (v > 0) {
        const colorPair = ztColor(v);
        const tile = document.createElement('div');
        const isFalling = mode === 'fall' && c === zt.lastTappedCol && posFromBottom === col.length - 1;
        const isMerging = mode === 'merge';
        tile.className = 'zt-tile' + (isFalling ? ' zt-tile-fall' : isMerging ? ' zt-tile-merge' : '');
        const fontSize = v >= 10000 ? 11 : v >= 1000 ? 13 : v >= 100 ? 15 : 18;
        tile.style.borderRadius = radius;
        tile.style.background = colorPair[0];
        tile.style.color = colorPair[1];
        tile.style.fontSize = fontSize + 'px';
        tile.textContent = v;
        cell.appendChild(tile);
      }
      board.appendChild(cell);
    }
  }

  const scoreEl = document.getElementById('zt-score');
  if (scoreEl) scoreEl.textContent = zt.score;
  const bestEl = document.getElementById('zt-best');
  if (bestEl) bestEl.textContent = zt.best;
  const nextEl = document.getElementById('zt-next-value');
  if (nextEl) {
    const cp = ztColor(zt.nextValue);
    nextEl.textContent = zt.nextValue;
    nextEl.style.background = cp[0];
    nextEl.style.color = cp[1];
  }
  const next2El = document.getElementById('zt-next-value-2');
  if (next2El) {
    const cp2 = ztColor(zt.nextValue2);
    next2El.textContent = zt.nextValue2;
    next2El.style.background = cp2[0];
    next2El.style.color = cp2[1];
  }
  const statusEl = document.getElementById('zt-status');
  if (statusEl) statusEl.textContent = zt.over ? 'Keine Spalte mehr frei – nochmal versuchen?' : 'Spalte antippen, die Zahl fällt hinein';

  const undoBtn = document.getElementById('zt-undo-btn');
  if (undoBtn) undoBtn.disabled = !zt.undoSnapshot || zt.animating;
}

function setupZahlenturm() {
  if (!document.getElementById('zt-board')) return;
  ztInit();
  ztUpdateStatsPanel();

  const newGameBtn = document.getElementById('zt-newgame-btn');
  if (newGameBtn) newGameBtn.addEventListener('click', () => {
    if (zt.animating) return;
    ztNewGame();
    ztUpdateStatsPanel();
  });

  const undoBtn = document.getElementById('zt-undo-btn');
  if (undoBtn) undoBtn.addEventListener('click', ztUndo);

  const soundBtn = document.getElementById('zt-sound-btn');
  if (soundBtn) soundBtn.addEventListener('click', ztToggleSound);
}
