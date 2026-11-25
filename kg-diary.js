/* =========================================================
   Keysglade — Reise-Tagebuch
   Fotos und Notizen bleiben ausschließlich lokal im Browser
   (IndexedDB) — kein Upload, kein Server. Da es sich um
   ausschließlich eigene Fotos der Nutzer:in handelt, entstehen
   keine Bildrechte-Fragen.
========================================================= */

const DIARY_DB_NAME = "keysglade-diary";
const DIARY_STORE = "entries";
let diaryDbPromise = null;
const diaryObjectUrls = [];

function openDiaryDB() {
  if (diaryDbPromise) return diaryDbPromise;
  diaryDbPromise = new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB wird von diesem Browser nicht unterstützt"));
      return;
    }
    const req = indexedDB.open(DIARY_DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(DIARY_STORE)) {
        db.createObjectStore(DIARY_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
  return diaryDbPromise;
}

async function addDiaryEntry(entry) {
  const db = await openDiaryDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DIARY_STORE, "readwrite");
    tx.objectStore(DIARY_STORE).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllDiaryEntries() {
  const db = await openDiaryDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DIARY_STORE, "readonly");
    const req = tx.objectStore(DIARY_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function deleteDiaryEntry(id) {
  const db = await openDiaryDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DIARY_STORE, "readwrite");
    tx.objectStore(DIARY_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function revokeDiaryObjectUrls() {
  diaryObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  diaryObjectUrls.length = 0;
}

async function renderDiary() {
  const list = document.getElementById("diary-list");
  if (!list) return;

  revokeDiaryObjectUrls();

  let entries;
  try {
    entries = await getAllDiaryEntries();
  } catch (e) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${rwi("alert")}</div><p class="empty-state-text">Reise-Tagebuch konnte nicht geladen werden</p><p class="empty-state-hint">IndexedDB ist in diesem Browser evtl. nicht verfügbar.</p></div>`;
    return;
  }

  entries.sort((a, b) => (a.date < b.date ? 1 : -1));

  if (entries.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${rwi("book")}</div><p class="empty-state-text">Noch keine Einträge</p><p class="empty-state-hint">Füge unten dein erstes Foto mit Notiz hinzu.</p></div>`;
    return;
  }

  list.innerHTML = entries.map((entry) => {
    let imgTag = "";
    if (entry.photo) {
      const url = URL.createObjectURL(entry.photo);
      diaryObjectUrls.push(url);
      imgTag = `<img src="${url}" alt="" class="diary-photo">`;
    }
    const dateLabel = new Date(entry.date).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
    return `
      <div class="diary-entry" data-date="${entry.date}">
        ${imgTag}
        <div class="diary-entry-body">
          <div class="diary-entry-date">${dateLabel}</div>
          <p>${escapeHtml(entry.note || "")}</p>
          <button class="diary-delete-btn print-hide" data-id="${entry.id}">Eintrag löschen</button>
        </div>
      </div>
    `;
  }).join("");

  list.querySelectorAll(".diary-delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await deleteDiaryEntry(Number(btn.dataset.id));
      renderDiary();
    });
  });

  list.querySelectorAll(".diary-photo").forEach((img) => {
    img.addEventListener("click", () => openDiaryLightbox(img.src));
  });
}

function openDiaryLightbox(src) {
  const overlay = document.getElementById("diary-lightbox");
  const img = document.getElementById("diary-lightbox-img");
  if (!overlay || !img) return;
  img.src = src;
  overlay.classList.add("open");
}

function setupDiary() {
  const form = document.getElementById("diary-form");
  if (!form) return;

  const dateInput = document.getElementById("diary-date");
  dateInput.value = new Date().toISOString().slice(0, 10);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const date = dateInput.value || new Date().toISOString().slice(0, 10);
    const note = document.getElementById("diary-note").value.trim();
    const fileInput = document.getElementById("diary-photo");
    const file = fileInput.files[0] || null;

    if (!note && !file) return;

    await addDiaryEntry({
      id: Date.now(),
      date,
      note,
      photo: file,
    });

    form.reset();
    dateInput.value = new Date().toISOString().slice(0, 10);
    renderDiary();
  });

  renderDiary();
}
