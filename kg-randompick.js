/* =========================================================
   Keysglade — Zufalls-Ziel-Generator
========================================================= */

function pickRandomEntry() {
  const unvisited = ENTRIES.filter((e) => e.lat && e.lon && !visited.has(e.id));
  const pool = unvisited.length > 0 ? unvisited : ENTRIES.filter((e) => e.lat && e.lon);
  return pool[Math.floor(Math.random() * pool.length)];
}

function setupRandomPick() {
  const btn = document.getElementById("random-pick-btn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const entry = pickRandomEntry();
    if (entry) openDetail(entry);
  });
}
