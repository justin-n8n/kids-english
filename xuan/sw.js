/* 離線快取：版本 202610041348 */
const CACHE='ek-xuan-202610041348';
const ASSETS=["./", "index.html", "data.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "../core/style.css", "../core/app.js", "../core/monsters.js", "../core/config.js"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('ek-xuan-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const r=e.request; if(r.method!=='GET') return;
  const u=new URL(r.url);
  if(u.origin!==location.origin && !/fonts\.(googleapis|gstatic)\.com/.test(u.host)) return;
  // 先用網路（拿最新版），沒網路就用快取
  e.respondWith(fetch(r).then(res=>{ if(res&&(res.ok||res.type==='opaque')){const cp=res.clone(); caches.open(CACHE).then(c=>c.put(r,cp));} return res; })
    .catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||caches.match('index.html'))));
});
