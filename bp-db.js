// bp-db.js — lokale Speicherung über IndexedDB
const DB_NAME = 'parken-und-belege';
const DB_VERSION = 4;
let dbInstance = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) return resolve(dbInstance);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('parkscheine')) {
        db.createObjectStore('parkscheine', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('nebenkosten')) {
        db.createObjectStore('nebenkosten', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('fahrten')) {
        db.createObjectStore('fahrten', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('kilometerstand')) {
        db.createObjectStore('kilometerstand', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('notizen')) {
        db.createObjectStore('notizen', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };
    req.onsuccess = (e) => { dbInstance = e.target.result; resolve(dbInstance); };
    req.onerror = (e) => reject(e.target.error);
  });
}

async function dbGetAll(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function dbPut(storeName, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value);
    tx.oncomplete = () => resolve(value);
    tx.onerror = (e) => reject(e.target.error);
  });
}

async function dbDelete(storeName, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}

async function dbGetMeta(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('meta', 'readonly');
    const req = tx.objectStore('meta').get(key);
    req.onsuccess = () => resolve(req.result ? req.result.value : null);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function dbSetMeta(key, value) {
  return dbPut('meta', { key, value });
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
