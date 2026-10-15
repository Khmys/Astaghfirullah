/* ============================================================
   SERVICE WORKER — kusoma bila mtandao
   - Faili za programu na JSON: mtandao kwanza (zinakuwa mpya kila ukiwa online),
     na zikikosekana mtandao zinatoka kwenye hifadhi.
   - Picha: hifadhi kwanza (haraka).
   ============================================================ */
const CACHE = "elimu-cache-v1";   // lazima ilingane na OFFLINE_CACHE ndani ya app.js
const SHELL = ["./", "Uislamu.html", "style.css", "app.js", "index.json"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

const niPicha = req => req.destination === "image" || /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(req.url);
const inafaa  = res => res && (res.ok || res.type === "opaque");

async function mtandaoKwanza(req, ms) {
  const cache = await caches.open(CACHE);
  const net = fetch(req).then(res => { if (inafaa(res)) cache.put(req, res.clone()); return res; });
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms));
  try {
    return await Promise.race([net, timeout]);
  } catch (err) {
    const hit = await cache.match(req);
    if (hit) return hit;
    if (req.mode === "navigate") {
      const shell = (await cache.match("Uislamu.html")) || (await cache.match("./"));
      if (shell) return shell;
    }
    return net;   // hakuna kwenye hifadhi: subiri mtandao (au kosa)
  }
}

async function hifadhiKwanza(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (inafaa(res)) cache.put(req, res.clone());
  return res;
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  const ndani = url.origin === self.location.origin;
  if (!ndani && !url.hostname.endsWith("telegram.org") && !niPicha(req)) return;
  e.respondWith(niPicha(req) ? hifadhiKwanza(req) : mtandaoKwanza(req, 4000));
});
