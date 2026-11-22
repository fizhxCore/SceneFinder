// Service worker sengaja minim: hanya menampilkan halaman "offline" saat tidak ada sinyal.
// Tidak menyimpan halaman, data, atau gambar, karena situs ini terkunci sandi.
const CACHE = "sf-offline-v1";
const OFFLINE = "/offline.html";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return; // selain pindah halaman: biarkan lewat apa adanya
  e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE)));
});
