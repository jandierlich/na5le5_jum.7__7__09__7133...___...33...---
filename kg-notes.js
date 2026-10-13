/* =========================================================
   Keysglade — Meine Notizen
   Rein lokales, privates Notizbuch (kein Austausch mit
   anderen Nutzer:innen, keine Server-Speicherung).
========================================================= */

function renderNotes(container) {
  const notes = Storage.getPersonalNotes();

  const listHtml = notes.length === 0
    ? `<div class="empty-state"><div class="empty-state-icon">${rwi("note")}</div><p class="empty-state-text">Noch keine eigenen Notizen</p><p class="empty-state-hint">Leg unten deine erste an.</p></div>`
    : notes.map((n, i) => `
        <div class="note-card">
          <div class="note-card-header">
            <strong>${escapeHtml(n.title)}</strong>
            <button class="note-delete" data-index="${i}" aria-label="Notiz löschen">${rwi("close")}</button>
          </div>
          <p>${escapeHtml(n.text)}</p>
        </div>
      `).join("");

  container.innerHTML = `
    <div class="notes-list">${listHtml}</div>
    <form class="note-form" id="note-form">
      <input type="text" id="note-title" placeholder="Titel (z. B. Restaurant-Tipp)" required maxlength="60">
      <textarea id="note-text" placeholder="Deine Notiz…" required maxlength="500" rows="3"></textarea>
      <button type="submit">Notiz speichern</button>
    </form>
  `;

  container.querySelectorAll(".note-delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.index, 10);
      const current = Storage.getPersonalNotes();
      current.splice(idx, 1);
      Storage.setPersonalNotes(current);
      renderNotes(container);
    });
  });

  const form = container.querySelector("#note-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = container.querySelector("#note-title").value.trim();
    const text = container.querySelector("#note-text").value.trim();
    if (!title || !text) return;
    const current = Storage.getPersonalNotes();
    current.unshift({ title, text, created: new Date().toISOString() });
    Storage.setPersonalNotes(current);
    renderNotes(container);
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
