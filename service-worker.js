const CACHE_NAME = "yatis-asistani-v9";
const CORE_FILES = ["./","./index.html","./style.css?v=9","./app.js?v=9","./firebase.js?v=9","./manifest.json","./icon-192.png","./icon-512.png"];
self.addEventListener("install",event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE_FILES)))});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",event=>{if(event.request.method!=="GET")return;event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match(event.request).then(cached=>cached||caches.match("./index.html"))))});
