// zahlenfusion.js — "Zahlenfusion": eigenständiges Zahlen-Verschmelz-Spiel.
// Eigene Umsetzung des allgemeinen "Kacheln verschieben & verschmelzen"-Spielprinzips
// (Spielmechaniken sind nicht urheberrechtlich schützbar), eigener Code, eigene
// Optik (Keysglade-Palette, Systemschrift), eigener Name.
// Rückgängig, Spielstand-Fortsetzung, synthetisierte Soundeffekte, Vibration
// und Statistik ergänzt — alles rein lokal (localStorage), komplett offline.

const NF_MILESTONES = [128, 256, 512, 1024, 2048, 4096];

const nf = {
  grid: [],
  score: 0,
  best: 0,
  over: false,
  won: false,
  soundOn: true,
  highestAnnounced: 0,
  undoSnapshot: null,
};

const NF_COLORS = {
  2: ['#d3ece3', '#1c2b38'], 4: ['#dcebf5', '#1c2b38'], 8: ['#f8ddc6', '#1c2b38'],
  16: ['#FFB347', '#1c2b38'], 32: ['#FF8C00', '#fff'], 64: ['#6C8BFF', '#fff'],
  128: ['#3355C8', '#fff'], 256: ['#4a90d9', '#fff'], 512: ['#1E2A78', '#fff'],
  1024: ['#0B1440', '#fff'], 2048: ['#e35b3f', '#fff'], 4096: ['#b23a2a', '#fff'],
};
function nfColor(v) {
  return NF_COLORS[v] || ['#142433', '#fff'];
}

function nfLoadBest() {
  try { return parseInt(localStorage.getItem('zahlenfusion-best') || '0', 10); } catch (e) { return 0; }
}
function nfSaveBest(v) {
  try { localStorage.setItem('zahlenfusion-best', String(v)); } catch (e) {}
}
function nfLoadState() {
  try {
    const raw = localStorage.getItem('zahlenfusion-state');
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function nfSaveState() {
  try {
    localStorage.setItem('zahlenfusion-state', JSON.stringify({
      grid: nf.grid, score: nf.score, over: nf.over, won: nf.won,
      highestAnnounced: nf.highestAnnounced, undoSnapshot: nf.undoSnapshot,
    }));
  } catch (e) {}
}
function nfClearState() {
  try { localStorage.removeItem('zahlenfusion-state'); } catch (e) {}
}
function nfLoadStats() {
  try {
    const raw = localStorage.getItem('zahlenfusion-stats');
    return raw ? JSON.parse(raw) : { gamesPlayed: 0, highestTileEver: 0 };
  } catch (e) { return { gamesPlayed: 0, highestTileEver: 0 }; }
}
function nfSaveStats(s) {
  try { localStorage.setItem('zahlenfusion-stats', JSON.stringify(s)); } catch (e) {}
}
function nfLoadSoundPref() {
  try {
    const raw = localStorage.getItem('zahlenfusion-sound');
    return raw === null ? true : raw === 'true';
  } catch (e) { return true; }
}
function nfSaveSoundPref(v) {
  try { localStorage.setItem('zahlenfusion-sound', String(v)); } catch (e) {}
}

let nfAudioCtx = null;
function nfPlayTone(freq, duration, type, volume) {
  if (!nf.soundOn) return;
  try {
    nfAudioCtx = nfAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = nfAudioCtx;
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
function nfSoundMove() { nfPlayTone(180, 0.08, 'sine', 0.08); }
function nfSoundMerge(value) {
  const pitch = 300 + Math.min(Math.log2(value) * 40, 500);
  nfPlayTone(pitch, 0.16, 'triangle', 0.13);
}
function nfSoundMilestone() {
  nfPlayTone(523, 0.12, 'sine', 0.16);
  setTimeout(() => nfPlayTone(659, 0.12, 'sine', 0.16), 110);
  setTimeout(() => nfPlayTone(784, 0.22, 'sine', 0.16), 220);
}
function nfVibrate(pattern) {
  try { if ('vibrate' in navigator) navigator.vibrate(pattern); } catch (e) {}
}
function nfShowMilestoneToast(value) {
  const toast = document.getElementById('zt-toast');
  if (!toast) return;
  toast.innerHTML = rwi('spark') + ' ' + value + ' erreicht!';
  toast.classList.remove('zt-toast-show');
  void toast.offsetWidth;
  toast.classList.add('zt-toast-show');
}

function nfEmptyGrid() {
  return [0, 1, 2, 3].map(() => [0, 0, 0, 0]);
}
function nfEmptyCells() {
  const cells = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (nf.grid[r][c] === 0) cells.push([r, c]);
  return cells;
}
function nfSpawnTile() {
  const empties = nfEmptyCells();
  if (empties.length === 0) return;
  const [r, c] = empties[Math.floor(Math.random() * empties.length)];
  nf.grid[r][c] = Math.random() < 0.9 ? 2 : 4;
}

function nfNewGame() {
  const stats = nfLoadStats();
  stats.gamesPlayed += 1;
  nfSaveStats(stats);

  nf.grid = nfEmptyGrid();
  nf.score = 0;
  nf.over = false;
  nf.won = false;
  nf.best = nfLoadBest();
  nf.highestAnnounced = 0;
  nf.undoSnapshot = null;
  nfSpawnTile();
  nfSpawnTile();
  nfClearState();
  nfSaveState();
  nfRender();
  nfUpdateStatsPanel();
}

function nfInit() {
  nf.soundOn = nfLoadSoundPref();
  nf.best = nfLoadBest();
  const saved = nfLoadState();
  if (saved && Array.isArray(saved.grid)) {
    nf.grid = saved.grid;
    nf.score = saved.score || 0;
    nf.over = !!saved.over;
    nf.won = !!saved.won;
    nf.highestAnnounced = saved.highestAnnounced || 0;
    nf.undoSnapshot = saved.undoSnapshot || null;
    nfRender();
  } else {
    nfNewGame();
  }
  nfUpdateSoundButton();
  nfUpdateStatsPanel();
}

function nfLine(cells) {
  let vals = cells.filter(v => v !== 0);
  let gained = 0;
  let mergedMax = 0;
  for (let i = 0; i < vals.length - 1; i++) {
    if (vals[i] === vals[i + 1]) {
      vals[i] *= 2;
      gained += vals[i];
      mergedMax = Math.max(mergedMax, vals[i]);
      vals.splice(i + 1, 1);
    }
  }
  while (vals.length < 4) vals.push(0);
  return { line: vals, gained, mergedMax };
}

function nfMove(dir) {
  if (nf.over) return;

  nf.undoSnapshot = {
    grid: JSON.parse(JSON.stringify(nf.grid)),
    score: nf.score,
    highestAnnounced: nf.highestAnnounced,
  };

  let totalGain = 0;
  let mergedMax = 0;
  const before = JSON.stringify(nf.grid);

  for (let i = 0; i < 4; i++) {
    let cells;
    if (dir === 'left') cells = nf.grid[i].slice();
    if (dir === 'right') cells = nf.grid[i].slice().reverse();
    if (dir === 'up') cells = [0, 1, 2, 3].map(r => nf.grid[r][i]);
    if (dir === 'down') cells = [0, 1, 2, 3].map(r => nf.grid[r][i]).reverse();

    const { line, gained, mergedMax: lineMax } = nfLine(cells);
    totalGain += gained;
    mergedMax = Math.max(mergedMax, lineMax);

    if (dir === 'left') nf.grid[i] = line;
    if (dir === 'right') nf.grid[i] = line.slice().reverse();
    if (dir === 'up') for (let r = 0; r < 4; r++) nf.grid[r][i] = line[r];
    if (dir === 'down') { const rev = line.slice().reverse(); for (let r = 0; r < 4; r++) nf.grid[r][i] = rev[r]; }
  }

  const moved = JSON.stringify(nf.grid) !== before;
  if (!moved) { nf.undoSnapshot = null; return; }

  if (totalGain > 0) { nfSoundMerge(mergedMax); nfVibrate(25); }
  else { nfSoundMove(); }

  nf.score += totalGain;
  if (nf.score > nf.best) { nf.best = nf.score; nfSaveBest(nf.best); }

  const stats = nfLoadStats();
  if (mergedMax > stats.highestTileEver) { stats.highestTileEver = mergedMax; nfSaveStats(stats); }
  if (mergedMax > nf.highestAnnounced && NF_MILESTONES.includes(mergedMax)) {
    nf.highestAnnounced = mergedMax;
    nfShowMilestoneToast(mergedMax);
    nfSoundMilestone();
    nfVibrate([20, 40, 20]);
  }

  nfSpawnTile();

  if (!nf.won && nf.grid.some(row => row.some(v => v >= 2048))) {
    nf.won = true;
  }
  if (nfEmptyCells().length === 0 && !nfHasMoves()) {
    nf.over = true;
  }

  nfSaveState();
  nfRender();
  nfUpdateStatsPanel();
}

function nfHasMoves() {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const v = nf.grid[r][c];
      if (c < 3 && nf.grid[r][c + 1] === v) return true;
      if (r < 3 && nf.grid[r + 1][c] === v) return true;
    }
  }
  return false;
}

function nfUndo() {
  if (!nf.undoSnapshot) return;
  nf.grid = nf.undoSnapshot.grid;
  nf.score = nf.undoSnapshot.score;
  nf.highestAnnounced = nf.undoSnapshot.highestAnnounced;
  nf.undoSnapshot = null;
  nf.over = false;
  nfSaveState();
  nfRender();
}

function nfToggleSound() {
  nf.soundOn = !nf.soundOn;
  nfSaveSoundPref(nf.soundOn);
  nfUpdateSoundButton();
}
function nfUpdateSoundButton() {
  const btn = document.getElementById('nf-sound-btn');
  if (btn) {
    btn.innerHTML = rwi(nf.soundOn ? 'speaker' : 'mute');
    btn.setAttribute('aria-pressed', String(nf.soundOn));
  }
}
function nfUpdateStatsPanel() {
  const stats = nfLoadStats();
  const el = document.getElementById('nf-stats');
  if (el) {
    el.textContent = stats.gamesPlayed + ' ' + (stats.gamesPlayed === 1 ? "Spiel" : "Spiele") + ' gespielt · höchste Zahl je: ' + (stats.highestTileEver || "–");
  }
  const undoBtn = document.getElementById('nf-undo-btn');
  if (undoBtn) undoBtn.disabled = !nf.undoSnapshot;
}

function nfRender() {
  const board = document.getElementById('nf-board');
  if (!board) return;
  board.innerHTML = '';
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const v = nf.grid[r][c];
      const cell = document.createElement('div');
      cell.className = 'nf-cell';
      if (v > 0) {
        const cp = nfColor(v);
        const tile = document.createElement('div');
        tile.className = 'nf-tile nf-tile-pop';
        const fontSize = v >= 1000 ? 18 : v >= 100 ? 22 : 26;
        tile.style.background = cp[0];
        tile.style.color = cp[1];
        tile.style.fontSize = fontSize + 'px';
        tile.textContent = v;
        cell.appendChild(tile);
      }
      board.appendChild(cell);
    }
  }

  const scoreEl = document.getElementById('nf-score');
  if (scoreEl) scoreEl.textContent = nf.score;
  const bestEl = document.getElementById('nf-best');
  if (bestEl) bestEl.textContent = nf.best;
  const statusEl = document.getElementById('nf-status');
  if (statusEl) {
    statusEl.textContent = nf.over ? 'Keine Züge mehr – nochmal versuchen?' : nf.won ? '2048 erreicht! Spiel weiter für mehr' : 'Wische, um Zahlen zu verschmelzen';
  }
  const undoBtn = document.getElementById('nf-undo-btn');
  if (undoBtn) undoBtn.disabled = !nf.undoSnapshot;
}

function nfAttachSwipe(el) {
  let sx = 0, sy = 0, tracking = false;
  el.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    sx = e.touches[0].clientX; sy = e.touches[0].clientY; tracking = true;
  }, { passive: true });
  el.addEventListener('touchend', (e) => {
    if (!tracking) return;
    tracking = false;
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) nfMove(dx > 0 ? 'right' : 'left');
    else nfMove(dy > 0 ? 'down' : 'up');
  }, { passive: true });
}

function nfAttachKeys() {
  document.addEventListener('keydown', (e) => {
    const board = document.getElementById('nf-board');
    if (!board || !document.getElementById('page-games').classList.contains('active')) return;
    if (e.key === 'ArrowLeft') nfMove('left');
    else if (e.key === 'ArrowRight') nfMove('right');
    else if (e.key === 'ArrowUp') nfMove('up');
    else if (e.key === 'ArrowDown') nfMove('down');
  });
}

function setupZahlenfusion() {
  if (!document.getElementById('nf-board')) return;
  nfInit();
  nfAttachSwipe(document.getElementById('nf-board'));
  nfAttachKeys();

  const newGameBtn = document.getElementById('nf-newgame-btn');
  if (newGameBtn) newGameBtn.addEventListener('click', nfNewGame);

  const undoBtn = document.getElementById('nf-undo-btn');
  if (undoBtn) undoBtn.addEventListener('click', nfUndo);

  const soundBtn = document.getElementById('nf-sound-btn');
  if (soundBtn) soundBtn.addEventListener('click', nfToggleSound);
}
