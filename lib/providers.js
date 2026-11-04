import { createRapidFetcher, QuotaError } from "./rapidapi.js";
import { createApifyFetcher } from "./apify.js";
import { fetchAccountPosts } from "./instagram.js";

// SCRAPER_PROVIDER: auto (default) | rapidapi | apify | "apify,rapidapi" (urutan = prioritas) | direct
export function buildProviders(env = process.env, deps = {}) {
  const want = String(env.SCRAPER_PROVIDER || "auto").toLowerCase().trim();
  if (want === "direct") return [{ name: "langsung ke Instagram", fetch: fetchAccountPosts, api: false }];

  const all = {
    rapidapi: env.RAPIDAPI_KEY && { name: "RapidAPI", fetch: createRapidFetcher(env, deps), api: true },
    apify: env.APIFY_TOKEN && { name: "Apify", fetch: createApifyFetcher(env, deps), api: true },
  };
  const order = want === "auto" ? ["rapidapi", "apify"] : want.split(",").map((s) => s.trim());
  const list = order.map((k) => all[k]).filter(Boolean);

  if (list.length === 0) {
    if (want !== "auto") throw new Error(`SCRAPER_PROVIDER=${want} tapi kunci/token-nya kosong`);
    return [{ name: "langsung ke Instagram", fetch: fetchAccountPosts, api: false }];
  }
  return list;
}

// Coba sumber berurutan; kalau kuota/kunci satu sumber bermasalah, pindah ke sumber berikutnya.
export function createFetcher(providers, { onDead = () => {} } = {}) {
  const dead = new Map();
  return async (username) => {
    let last = null;
    for (const p of providers) {
      if (dead.has(p.name)) { last = dead.get(p.name); continue; }
      try {
        return await p.fetch(username);
      } catch (e) {
        if (!(e instanceof QuotaError)) throw e;
        dead.set(p.name, e);
        last = e;
        onDead(p.name, e);
      }
    }
    throw last || new Error("Tidak ada sumber data");
  };
}
