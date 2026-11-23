/* Matek 1 vizsgafelkészítő – offline működés: az app saját fájljait eltárolja, és net nélkül onnan szolgálja ki. */
var CACHE = 'matek1-sze-v1';
var FILES = ['./', 'index.html', 'css/app.css', 'js/core.js', 'js/base.js', 'js/figures.js', 'js/sze1.js', 'js/sze2.js', 'js/sze3.js', 'js/sze4.js', 'js/szeen1.js', 'js/szeen2.js', 'js/szeen3.js', 'js/szeen4.js', 'js/app.js', 'icon.svg', 'manifest.webmanifest'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(function (res) {
    var copy = res.clone();
    caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
    return res;
  }).catch(function () { return caches.match(e.request); }));
});
