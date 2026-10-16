/* ============================================================
   SERVICE WORKER — kusoma bila mtandao, kwa kasi na kwa kuokoa bando

   - Kila kitu kikishahifadhiwa kwenye simu, kinafunguka PAPO HAPO
     (hakisubiri mtandao hata ukiwa dhaifu).
   - Nyuma ya pazia programu inajisasisha yenyewe, lakini:
       * si zaidi ya mara moja kila dakika 10 kwa kila faili (picha: siku 7),
       * inauliza tu "je, imebadilika?" — faili isipobadilika inatumia
         baiti chache sana (si kupakua upya),
       * haisasishi kabisa kama mtumiaji amewasha "Data Saver".
   - Mabadiliko mapya yanaonekana mtu anapofungua mara ya pili.
   ============================================================ */
const CACHE = "elimu-cache-v1";   // lazima ilingane na OFFLINE_CACHE ndani ya app.js
const SHELL = ["./", "Uislamu.html", "style.css", "app.js", "index.json"];

const TTL_APP = 10 * 60 * 1000;            // faili za programu na masomo
const TTL_IMG = 7 * 24 * 60 * 60 * 1000;   // picha
const TTL_EXT = 24 * 60 * 60 * 1000;       // script ya Telegram

const META_URL = new URL("__meta__", self.location).href;   // kumbukumbu ya lini kila faili ilisasishwa mwisho
let meta = null, metaTimer = null;

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

async function pakiaMeta(cache) {
  if (meta) return meta;
  try { const r = await cache.match(META_URL); meta = r ? await r.json() : {}; } catch (e) { meta = {}; }
  return meta;
}
function hifadhiMeta(cache) {
  clearTimeout(metaTimer);
  metaTimer = setTimeout(() => {
    try { cache.put(META_URL, new Response(JSON.stringify(meta), { headers: { "Content-Type": "application/json" } })); } catch (e) {}
  }, 800);
}

async function shellYaDharura(cache) {
  return (await cache.match("Uislamu.html", { ignoreSearch: true })) || (await cache.match("./", { ignoreSearch: true }));
}

// Sasisha nyuma ya pazia (kwa uangalifu wa bando)
async function sasisha(req, aina, cache, ndani) {
  try {
    if (self.navigator.connection && self.navigator.connection.saveData) return;
    const ttl = aina === "img" ? TTL_IMG : aina === "ext" ? TTL_EXT : TTL_APP;
    const m = await pakiaMeta(cache);
    if (Date.now() - (m[req.url] || 0) < ttl) return;
    m[req.url] = Date.now();                       // weka alama kwanza ili isirudiwe
    const init = { cache: "no-cache" };            // "je, imebadilika?" — jibu dogo (304) ikiwa haijabadilika
    if (!ndani) init.mode = "no-cors";
    const res = await fetch(req.url, init);
    if (inafaa(res)) await cache.put(req, res);
    hifadhiMeta(cache);
  } catch (e) { /* hakuna mtandao: hakuna shida, nakala ya simu inaendelea kutumika */ }
}

async function shughulikia(e, aina, ndani) {
  const req = e.request;
  const cache = await caches.open(CACHE);
  // Kufungua ukurasa daima kunatumia nakala ya simu (papo hapo). Ni "Pakua" tu (faili za ndani) inayolazimisha mtandao.
  const lazimaMtandao = req.mode !== "navigate" && (req.cache === "reload" || req.cache === "no-cache" || req.cache === "no-store");

  if (!lazimaMtandao) {
    let hit = await cache.match(req, { ignoreSearch: req.mode === "navigate" });
    if (!hit && req.mode === "navigate") hit = await shellYaDharura(cache);
    if (hit) { e.waitUntil(sasisha(req, aina, cache, ndani)); return hit; }
  }

  // Haipo kwenye simu (au imeombwa mpya kabisa): chukua mtandaoni
  try {
    const res = await fetch(req);
    if (inafaa(res)) {
      await cache.put(req, res.clone());
      const m = await pakiaMeta(cache); m[req.url] = Date.now(); hifadhiMeta(cache);
    }
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: req.mode === "navigate" });
    if (hit) return hit;
    if (req.mode === "navigate") { const s = await shellYaDharura(cache); if (s) return s; }
    throw err;
  }
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  const ndani = url.origin === self.location.origin;
  if (!ndani && !url.hostname.endsWith("telegram.org") && !niPicha(req)) return;
  const aina = niPicha(req) ? "img" : (ndani ? "app" : "ext");
  e.respondWith(shughulikia(e, aina, ndani));
});
