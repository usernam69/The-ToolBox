// Offline support: serve the app shell from cache, refresh it in the background.
const CACHE='toolbox-v3';
const FILES=['./','index.html','manifest.json','icon.svg','js/core.js','js/daily.js','js/money.js','js/study.js','js/files.js','js/text.js','js/saved.js','js/life.js','js/more.js','js/media.js','js/system.js','js/review.js','js/fun.js','js/start.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;
  e.respondWith(caches.match(e.request).then(hit=>{const net=fetch(e.request).then(r=>{if(r.ok)caches.open(CACHE).then(c=>c.put(e.request,r.clone()));return r}).catch(()=>hit);return hit||net}))});
