// カタカナ ふうせん の Service Worker（build_pages.py が作る。直接直さない）
const VERSION = "kf-e7b32b0022c4";
const FONTS = "kf-fonts";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== FONTS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// つながっていれば新しい版を、3 秒待ってもだめなら保存してある版を出す
function networkFirst(req) {
  const fromNet = fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put("./index.html", copy)); }
    return res;
  });
  const fallback = new Promise(resolve => setTimeout(resolve, 3000)).then(() => caches.match("./index.html"));
  return Promise.race([fromNet.catch(() => caches.match("./index.html")), fallback.then(hit => hit || fromNet)]);
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (req.mode === "navigate") { e.respondWith(networkFirst(req)); return; }
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
    return;
  }
  // Google Fonts は、一度読んだら保存しておく（オフラインでも同じ字の形にする）
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(FONTS).then(c => c.match(req).then(hit => hit || fetch(req).then(res => { c.put(req, res.clone()); return res; }))));
  }
});
