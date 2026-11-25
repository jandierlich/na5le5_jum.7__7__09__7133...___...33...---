/* =========================================================
   Keysglade → WowarWahr (Brücke)
   Überträgt besuchte Keysglade-Ziele als Orte in WowarWahr.
   Einmaliges Kopieren, keine dauerhafte Kopplung: Änderungen in
   WowarWahr (Bewertung, Notiz, Fotos) bleiben unangetastet.
   Beide Apps liegen auf demselben Origin und teilen sich deshalb
   die Browser-Datenbank – solange sie über das eine
   ReiseWahr-Icon auf dem Home-Bildschirm geöffnet werden.
========================================================= */

const WowBridge = (function () {
  // Muss exakt dem Schema in wow-db.js entsprechen (Name, Version, Stores)
  const DB_NAME = "wowarwahr";
  const DB_VERSION = 2;
  const STORES = ["trips", "visits", "photos", "countries", "wishes", "settings", "regions"];
  const TRIP_ID = "kg-florida";
  const TRIP_COLOR = "#E3A72F";

  function open() {
    return new Promise((res, rej) => {
      if (!("indexedDB" in window)) return rej(new Error("no idb"));
      const r = indexedDB.open(DB_NAME, DB_VERSION);
      r.onupgradeneeded = () => {
        const d = r.result;
        for (const s of STORES) {
          if (!d.objectStoreNames.contains(s)) {
            const os = d.createObjectStore(s, { keyPath: s === "settings" ? "key" : "id" });
            if (s === "visits") os.createIndex("tripId", "tripId");
            if (s === "photos") { os.createIndex("visitId", "visitId"); os.createIndex("tripId", "tripId"); }
          }
        }
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
      r.onblocked = () => rej(new Error("blocked"));
    });
  }

  const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  // Reisedatum aus dem Countdown, falls es schon erreicht ist – sonst heute
  function visitDate() {
    const t = Storage.getTripDate();
    const d = today();
    return t && t <= d ? t : d;
  }

  const visitId = (entry) => "kg-" + entry.id;

  /** Welche der übergebenen Ziel-IDs sind schon in WowarWahr? */
  async function known(ids) {
    try {
      const db = await open();
      const os = db.transaction("visits").objectStore("visits");
      const out = new Set();
      await Promise.all(ids.map((id) => req(os.get("kg-" + id)).then((v) => { if (v) out.add(id); })));
      db.close();
      return out;
    } catch (e) {
      return new Set();
    }
  }

  /** Überträgt Einträge; liefert Anzahl neu angelegter Orte. */
  async function add(entries) {
    const list = entries.filter((e) => e && e.lat && e.lon);
    if (!list.length) return 0;
    const db = await open();
    const tx = db.transaction(["trips", "visits"], "readwrite");
    const trips = tx.objectStore("trips");
    const visits = tx.objectStore("visits");
    const date = visitDate();
    let added = 0;

    for (const e of list) {
      const exists = await req(visits.get(visitId(e)));
      if (exists) continue;
      visits.put({
        id: visitId(e), tripId: TRIP_ID, name: e.name, lat: e.lat, lon: e.lon, cid: "US",
        date, rating: 0, note: "", source: "keysglade", created: Date.now() + added,
      });
      added++;
    }

    if (added) {
      const t = await req(trips.get(TRIP_ID));
      const trip = t || { id: TRIP_ID, title: "Florida", color: TRIP_COLOR, note: "Aus Keysglade übernommen.", created: Date.now(), start: date, end: date };
      if (date < trip.start) trip.start = date;
      if (date > trip.end) trip.end = date;
      trips.put(trip);
    }

    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); });
    db.close();
    return added;
  }

  function notify(text) {
    let el = document.getElementById("wow-bridge-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "wow-bridge-toast";
      el.className = "zt-toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.add("zt-toast-show");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("zt-toast-show"), 2600);
  }

  async function addWithFeedback(entries) {
    try {
      const n = await add(entries);
      if (n === 0) notify("Schon in WowarWahr eingetragen");
      else notify(n === 1 ? "In WowarWahr eingetragen" : `${n} Orte in WowarWahr eingetragen`);
      return n;
    } catch (e) {
      notify("WowarWahr-Speicher nicht erreichbar");
      return -1;
    }
  }

  return { add, addWithFeedback, known };
})();
