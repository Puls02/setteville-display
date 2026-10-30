
const PREFIX = "signage-shell-/setteville-display/";
const BASE = "/setteville-display/";
const SHELL = "signage-shell-/setteville-display/f019bec529780258";
const ASSETS = ["/setteville-display/index.html","/setteville-display/assets/index-KJqV0CzI.js","/setteville-display/assets/index-_cv2RA4C.css"];
const MEDIA = "signage-media-v1:/setteville-display/";
self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const previous = (await caches.keys()).filter(key => key.startsWith(PREFIX) && key !== SHELL);
    // Keep the previous bundle available to tabs already playing; do not reload them.
    for (const key of previous.slice(0, -1)) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate' && [BASE, BASE + 'display', BASE + 'display/'].includes(url.pathname)) {
    event.respondWith((async () => {
      const shell = await caches.open(SHELL);
      return await shell.match(BASE + 'index.html') || fetch(request);
    })());
    return;
  }
  const media = url.pathname.startsWith(BASE + 'media/');
  if (!media && !url.pathname.startsWith(BASE + 'assets/') && !ASSETS.includes(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(media ? MEDIA : SHELL);
    const saved = await cache.match(request);
    if (saved) return saved;
    if (!media) {
      for (const key of await caches.keys()) {
        if (!key.startsWith(PREFIX) || key === SHELL) continue;
        const previous = await (await caches.open(key)).match(request);
        if (previous) return previous;
      }
    }
    const response = await fetch(request);
    if (media && response.ok && response.headers.get('Content-Type')?.startsWith('image/')) {
      await cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  })());
});
