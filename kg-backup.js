/* =========================================================
   Keysglade — Backup (Export / Import)
   Bündelt alle lokalen Daten (localStorage + IndexedDB-Fotos)
   in eine JSON-Datei zum Herunterladen bzw. Wiedereinspielen.
   Es verlässt dabei nichts automatisch das Gerät — die Datei
   wird nur erzeugt, wenn aktiv auf "Exportieren" getippt wird.
========================================================= */

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return res.blob();
}

async function exportBackup() {
  const statusEl = document.getElementById("backup-status");
  statusEl.textContent = "Backup wird erstellt…";

  const localData = {
    bookmarks: Array.from(Storage.getBookmarks()),
    visited: Array.from(Storage.getVisited()),
    personalNotes: Storage.getPersonalNotes(),
    packingState: Storage.getPackingState(),
    lastWeatherCity: Storage.getLastWeatherCity(),
    lastTideStation: Storage.getLastTideStation(),
    itinerary: Storage.getItinerary(),
    motionPaused: Storage.getMotionPaused(),
    tripDate: Storage.getTripDate(),
    onboardingSeen: Storage.getOnboardingSeen(),
    expenses: Storage.getExpenses(),
    lastBudgetEstimate: Storage.getLastBudgetEstimate(),
  };

  let diaryEntries = [];
  try {
    const rawEntries = await getAllDiaryEntries();
    diaryEntries = await Promise.all(rawEntries.map(async (entry) => ({
      id: entry.id,
      date: entry.date,
      note: entry.note,
      photo: entry.photo ? await blobToDataUrl(entry.photo) : null,
    })));
  } catch (e) {
    console.warn("Tagebuch konnte nicht exportiert werden:", e);
  }

  const backup = {
    app: "Keysglade",
    exportedAt: new Date().toISOString(),
    version: 1,
    localData,
    diaryEntries,
  };

  const jsonText = JSON.stringify(backup, null, 2);
  const filename = `keysglade-backup-${new Date().toISOString().slice(0, 10)}.json`;

  // Manche Browser unterstuetzen einen echten
  // "Speichern unter"-Dialog mit freier Ordnerwahl. andere Browser
  // kennen diese API nicht - dort greift automatisch der normale Download
  // in den Standard-Downloads-Ordner des Browsers.
  if ("showSaveFilePicker" in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: "JSON-Datei", accept: { "application/json": [".json"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(jsonText);
      await writable.close();
      statusEl.textContent = "Backup wurde im gewählten Ordner gespeichert.";
      return;
    } catch (e) {
      if (e && e.name === "AbortError") {
        statusEl.textContent = "Speichern abgebrochen.";
        return;
      }
      // Bei anderen Fehlern (z.B. Berechtigung verweigert) auf den normalen Download zurueckfallen
    }
  }

  const blob = new Blob([jsonText], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  statusEl.textContent = "Backup wurde heruntergeladen.";
}

async function importBackup(file) {
  const statusEl = document.getElementById("backup-status");
  statusEl.textContent = "Backup wird eingelesen…";

  let backup;
  try {
    const text = await file.text();
    backup = JSON.parse(text);
  } catch (e) {
    statusEl.textContent = "Datei konnte nicht gelesen werden — ist es eine gültige Keysglade-Backup-Datei?";
    return;
  }

  if (!backup || backup.app !== "Keysglade" || !backup.localData) {
    statusEl.textContent = "Das ist keine gültige Keysglade-Backup-Datei.";
    return;
  }

  const d = backup.localData;
  Storage.setBookmarks(new Set(d.bookmarks || []));
  Storage.setVisited(new Set(d.visited || []));
  Storage.setPersonalNotes(d.personalNotes || []);
  Storage.setPackingState(d.packingState || {});
  Storage.setLastWeatherCity(d.lastWeatherCity || "Miami");
  Storage.setLastTideStation(d.lastTideStation || "Miami Beach");
  Storage.setItinerary(d.itinerary || []);
  Storage.setMotionPaused(d.motionPaused ?? null);
  Storage.setTripDate(d.tripDate || null);
  Storage.setOnboardingSeen(d.onboardingSeen || false);
  Storage.setExpenses(d.expenses || []);
  Storage.setLastBudgetEstimate(d.lastBudgetEstimate || null);

  if (Array.isArray(backup.diaryEntries) && backup.diaryEntries.length > 0) {
    for (const entry of backup.diaryEntries) {
      const photoBlob = entry.photo ? await dataUrlToBlob(entry.photo) : null;
      await addDiaryEntry({ id: entry.id, date: entry.date, note: entry.note, photo: photoBlob });
    }
  }

  statusEl.textContent = "Backup wurde eingespielt. Die Seite wird neu geladen …";
  setTimeout(() => window.location.reload(), 1200);
}

function setupBackup() {
  const exportBtn = document.getElementById("backup-export-btn");
  const importInput = document.getElementById("backup-import-input");
  if (!exportBtn || !importInput) return;

  exportBtn.addEventListener("click", exportBackup);
  importInput.addEventListener("change", () => {
    const file = importInput.files[0];
    if (file) importBackup(file);
    importInput.value = "";
  });
}
