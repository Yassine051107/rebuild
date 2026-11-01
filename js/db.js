// Whole app state is one JSON document in IndexedDB (localStorage fallback).
// Progress photos are stored separately as Blobs in the 'photos' store.
const DB = 'rebuild';
const STORE = 'kv';
const PHOTOS = 'photos';
const KEY = 'state';

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if (!db.objectStoreNames.contains(PHOTOS)) db.createObjectStore(PHOTOS);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function photoTx(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTOS, mode);
    const req = fn(tx.objectStore(PHOTOS));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
  });
}
export const putPhoto = (id, blob) => photoTx('readwrite', st => st.put(blob, id));
export const getPhoto = id => photoTx('readonly', st => st.get(id));
export const deletePhoto = id => photoTx('readwrite', st => st.delete(id));

export async function load() {
  try {
    const db = await open();
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    try { return JSON.parse(localStorage.getItem(DB) || 'null'); } catch { return null; }
  }
}

export async function save(state) {
  const copy = JSON.parse(JSON.stringify(state));
  try {
    const db = await open();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(copy, KEY);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    try { localStorage.setItem(DB, JSON.stringify(copy)); } catch { /* storage unavailable */ }
  }
}
