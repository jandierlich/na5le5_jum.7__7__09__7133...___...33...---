// WowarWahr – lokale Datenhaltung (IndexedDB, Fallback: Arbeitsspeicher)
// Alle Daten bleiben ausschließlich auf dem Gerät.

const DB_NAME = 'wowarwahr';
const STORES = ['trips', 'visits', 'photos', 'countries', 'wishes', 'settings', 'regions'];
let idb = null;
let memory = null; // Fallback, falls IndexedDB nicht verfügbar ist

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export async function openDB() {
  try {
    if (!('indexedDB' in window)) throw new Error('no idb');
    idb = await new Promise((res, rej) => {
      const r = indexedDB.open(DB_NAME, 2);
      r.onupgradeneeded = () => {
        const d = r.result;
        for (const s of STORES) {
          if (!d.objectStoreNames.contains(s)) {
            const os = d.createObjectStore(s, { keyPath: s === 'settings' ? 'key' : 'id' });
            if (s === 'visits') os.createIndex('tripId', 'tripId');
            if (s === 'photos') { os.createIndex('visitId', 'visitId'); os.createIndex('tripId', 'tripId'); }
          }
        }
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
      setTimeout(() => rej(new Error('timeout')), 4000);
    });
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
    return true;
  } catch (e) {
    idb = null;
    memory = Object.fromEntries(STORES.map(s => [s, new Map()]));
    return false;
  }
}

export const isPersistent = () => !!idb;

function tx(store, mode = 'readonly') {
  return idb.transaction(store, mode).objectStore(store);
}
const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

export async function all(store) {
  if (!idb) return [...memory[store].values()];
  return req(tx(store).getAll());
}
export async function get(store, id) {
  if (!idb) return memory[store].get(id);
  return req(tx(store).get(id));
}
export async function put(store, obj) {
  if (!idb) { memory[store].set(obj.id ?? obj.key, obj); return obj; }
  await req(tx(store, 'readwrite').put(obj));
  return obj;
}
export async function del(store, id) {
  if (!idb) { memory[store].delete(id); return; }
  return req(tx(store, 'readwrite').delete(id));
}
export async function byIndex(store, index, value) {
  if (!idb) return [...memory[store].values()].filter(o => o[index] === value);
  return req(tx(store).index(index).getAll(value));
}
export async function clearAll() {
  for (const s of STORES) {
    if (!idb) memory[s].clear();
    else await req(tx(s, 'readwrite').clear());
  }
}
export async function setting(key, fallback = null) {
  const r = await get('settings', key);
  return r ? r.value : fallback;
}
export async function setSetting(key, value) {
  return put('settings', { key, value });
}
export { STORES };
