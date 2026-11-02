/* Aurivevents service worker
   - The app shell (HTML, CSS, JS, icons, photos) is cached so the app opens with no signal.
   - Same-origin files: network first (fresh after every deploy), cached copy when offline or slow.
   - Fonts and CDN libraries: cached after first use.
   - Supabase (data + auth) is never cached here; the app keeps its own offline copy and syncs. */
const VERSION = 'auriv-2026-11-02-3';
const SHELL = [
"./",
"index.html",
"manifest.webmanifest",
"css/app.css",
"assets/icon.svg",
"assets/icons/apple-touch-icon.png",
"assets/icons/favicon-32.png",
"assets/icons/icon-192.png",
"assets/icons/icon-512.png",
"assets/icons/maskable-512.png",
"js/cloud.js",
"js/config.js",
"js/controls.js",
"js/core.js",
"js/help.js",
"js/search.js",
"js/simple.js",
"js/ui.js",
"js/visual.js",
"js/x00_framework.js",
"js/x01_access.js",
"js/x02_data.js",
"js/x03_fixes.js",
"js/x04_scope.js",
"js/x05_vendors.js",
"js/x06_sales.js",
"js/x07_finance.js",
"js/x08_crew.js",
"js/x09_eventday.js",
"js/x10_usability.js",
"js/x11_reporting.js",
"js/x12_guests.js",
"js/x13_production.js",
"js/x14_about.js",
"js/x15_v56.js",
"js/x16_about56.js",
"js/x17_v57.js",
"js/x18_v58.js",
"js/x19_v59.js",
"js/x20_v510.js",
"js/x99_boot.js",
"assets/img/corporate-1.jpg",
"assets/img/corporate-2.jpg",
"assets/img/corporate-3.jpg",
"assets/img/corporate-4.jpg",
"assets/img/party-1.jpg",
"assets/img/party-2.jpg",
"assets/img/party-3.jpg",
"assets/img/party-4.jpg",
"assets/img/v-catering.jpg",
"assets/img/v-decor.jpg",
"assets/img/v-makeup.jpg",
"assets/img/v-music.jpg",
"assets/img/v-other.jpg",
"assets/img/v-photography.jpg",
"assets/img/v-priest.jpg",
"assets/img/v-transport.jpg",
"assets/img/v-venue.jpg",
"assets/img/wedding-1.jpg",
"assets/img/wedding-2.jpg",
"assets/img/wedding-3.jpg",
"assets/img/wedding-4.jpg",
"assets/img/wedding-5.jpg",
"assets/img/wedding-6.jpg"
];
const NET_TIMEOUT = 3500;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(SHELL.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'skip-waiting') self.skipWaiting() });

function timeout(ms) { return new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)) }
async function networkFirst(req, fallbackKey) {
  const cache = await caches.open(VERSION);
  try {
    const res = await Promise.race([fetch(req), timeout(NET_TIMEOUT)]);
    if (res && res.ok) cache.put(fallbackKey || req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(fallbackKey || req, { ignoreSearch: true });
    if (hit) return hit;
    throw err;
  }
}
async function staleWhileRevalidate(req) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(req);
  const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res }).catch(() => hit);
  return hit || net;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (/supabase\.co$/.test(url.hostname)) return;            // live data and sign-in: always network
  if (req.mode === 'navigate') { e.respondWith(networkFirst(req, './')); return }
  if (url.origin === self.location.origin) { e.respondWith(networkFirst(req)); return }
  if (/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com)$/.test(url.hostname)) { e.respondWith(staleWhileRevalidate(req)); return }
});
