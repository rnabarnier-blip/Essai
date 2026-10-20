/* Essais — stockage local (IndexedDB) */
(function (G) {
'use strict';
const NOM = 'essais-db', VER = 1;
let dbp = null;
function ouvrir() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    let rq;
    try { rq = indexedDB.open(NOM, VER); } catch (e) { rej(e); return; }
    rq.onupgradeneeded = () => {
      const d = rq.result;
      ['essais', 'photos', 'modeles'].forEach(s => { if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: 'id' }); });
      if (!d.objectStoreNames.contains('reglages')) d.createObjectStore('reglages', { keyPath: 'k' });
    };
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error);
  });
  return dbp;
}
function tx(store, mode, fn) {
  return ouvrir().then(d => new Promise((res, rej) => {
    const t = d.transaction(store, mode); const s = t.objectStore(store); let out;
    const r = fn(s); if (r && 'onsuccess' in r) r.onsuccess = () => { out = r.result; };
    t.oncomplete = () => res(out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
  }));
}
const DB = {
  ok: true,
  tous: store => tx(store, 'readonly', s => s.getAll()),
  get: (store, id) => tx(store, 'readonly', s => s.get(id)),
  put: (store, obj) => tx(store, 'readwrite', s => s.put(obj)),
  del: (store, id) => tx(store, 'readwrite', s => s.delete(id)),
  vider: store => tx(store, 'readwrite', s => s.clear()),
  reglage: async (k, def) => { try { const r = await DB.get('reglages', k); return r ? r.v : def; } catch (e) { return def; } },
  setReglage: (k, v) => DB.put('reglages', { k, v })
};
G.DB = DB;
})(window);
