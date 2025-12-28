self.addEventListener('install',(e)=>{e.waitUntil(caches.open('fittrip-pro-v1').then(c=>c.addAll(['./','./index.html','./styles.css','./app.js','./manifest.json','./sw.js'])));});
self.addEventListener('activate',(e)=>{e.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k!=='fittrip-pro-v1').map(k=>caches.delete(k)));await self.clients.claim();})());});
self.addEventListener('fetch',(e)=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));});
