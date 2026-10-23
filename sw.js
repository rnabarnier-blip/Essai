/* Essais — service worker : tout fonctionne hors ligne */
const VERSION = '0.3.1';
const CACHE = 'essais-' + VERSION;
const FICHIERS = ['./', 'index.html', 'styles.css', 'stats.js', 'analyse.js', 'modeles.js', 'db.js', 'core.js', 'wizard.js', 'essai.js', 'suivi.js', 'remplir.js', 'app.js',
  'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS.map(f => new Request(f, { cache: 'reload' })))));
});
self.addEventListener('activate', ev => {
  ev.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('essais-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', ev => { if (ev.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  ev.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req).catch(() => caches.match('index.html'))));
});
