/* =========================================================
   Keysglade — Sprachführer
========================================================= */

function setupPhrasebook() {
  const input = document.getElementById("phrasebook-search");
  const list = document.getElementById("phrasebook-list");

  function render(filter = "") {
    const q = filter.trim().toLowerCase();
    const filtered = PHRASEBOOK.filter(
      (p) => !q || p.en.toLowerCase().includes(q) || p.de.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q)
    );

    if (filtered.length === 0) {
      list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${rwi("search")}</div><p class="empty-state-text">Keine Treffer</p></div>`;
      return;
    }

    const groups = {};
    filtered.forEach((p) => {
      if (!groups[p.cat]) groups[p.cat] = [];
      groups[p.cat].push(p);
    });

    list.innerHTML = Object.entries(groups).map(([cat, phrases]) => `
      <div class="phrase-group">
        <h4>${cat}</h4>
        ${phrases.map((p, i) => `
          <div class="phrase-row">
            <button class="phrase-speak-btn" data-text="${p.en.replace(/"/g, "&quot;")}" aria-label="Aussprache anhören" title="Anhören">${rwi("speaker")}</button>
            <span class="phrase-en">${p.en}</span>
            <span class="phrase-de">${p.de}</span>
          </div>
        `).join("")}
      </div>
    `).join("");

    list.querySelectorAll(".phrase-speak-btn").forEach((btn) => {
      btn.addEventListener("click", () => speakPhrase(btn.dataset.text));
    });
  }

  input.addEventListener("input", () => render(input.value));
  render();
}
