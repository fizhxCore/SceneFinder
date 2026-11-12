import { extractHashtags, permalink } from "./instagram.js";
import { QuotaError, normalizeRapidItem } from "./rapidapi.js";

export const APIFY_DEFAULTS = { actor: "apify~instagram-post-scraper", amount: 12 };

const first = (...v) => v.find((x) => x !== undefined && x !== null && x !== "");

function toMs(raw) {
  if (raw === undefined || raw === null || raw === "") return 0;
  const n = Number(raw);
  if (Number.isFinite(n)) return n < 1e11 ? n * 1000 : n;
  const t = Date.parse(String(raw));
  return Number.isFinite(t) ? t : 0;
}

export function normalizeApifyItem(it, fallbackUsername = "") {
  if (!it || typeof it !== "object" || it.error) return null;
  const id = first(it.shortCode, it.shortcode, it.code);
  if (!id) return null;
  const thumb = first(it.displayUrl, it.display_url, it.images?.[0], it.childPosts?.[0]?.displayUrl, it.thumbnailUrl);
  if (!thumb) return normalizeRapidItem(it, fallbackUsername); // bentuk lain: coba pembaca RapidAPI
  const caption = typeof it.caption === "string" ? it.caption : "";
  const type = String(it.type || "").toLowerCase();
  const kind =
    it.productType === "clips" ? "reel"
    : type === "sidecar" || it.childPosts?.length > 0 ? "carousel"
    : type === "video" || it.videoUrl ? "video"
    : "photo";
  return {
    id,
    url: permalink(id, kind),
    kind,
    username: first(it.ownerUsername, it.owner?.username, fallbackUsername) || "",
    caption,
    hashtags: extractHashtags(caption),
    thumb,
    ts: toMs(first(it.timestamp, it.takenAtTimestamp, it.taken_at)),
  };
}

const transient = (message) => Object.assign(new Error(message), { transient: true });

// Galat sementara (batas laju 429, server 5xx, jaringan, timeout) dicoba ulang; kunci/kredit bermasalah tidak.
async function callApify(args) {
  const delays = args.retryDelays || [0, 4000, 12000];
  let last;
  for (const wait of delays) {
    if (wait) await new Promise((r) => setTimeout(r, wait));
    try {
      return await callApifyOnce(args);
    } catch (e) {
      if (!e.transient) throw e;
      last = e;
    }
  }
  throw last;
}

async function callApifyOnce({ token, actor, body, fetchImpl }) {
  let res;
  try {
    res = await fetchImpl(`https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?timeout=120&clean=true`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(130000),
    });
  } catch (e) {
    throw transient(`Apify tidak terjangkau (${e.name || e.message})`);
  }
  if (res.status === 401 || res.status === 403) throw new QuotaError(`Apify menolak token (${res.status}). Periksa APIFY_TOKEN`);
  if (res.status === 402) throw new QuotaError("Kredit Apify habis (402)");
  if (res.status === 429) throw transient("Batas request Apify tercapai (429)");
  if (res.status === 404) throw new Error("Actor Apify tidak ditemukan. Periksa APIFY_ACTOR");
  if (res.status === 400) throw new Error("Input Actor Apify ditolak (400). Periksa APIFY_INPUT");
  if (res.status >= 500) throw transient(`Apify membalas ${res.status}`);
  if (!res.ok) throw new Error(`Apify membalas ${res.status}`);
  let items;
  try {
    items = await res.json();
  } catch {
    throw new Error("Apify tidak membalas JSON");
  }
  if (!Array.isArray(items)) throw new Error("Respons Apify tidak dikenali");
  if (items.length > 0 && items.every((i) => i?.error)) throw new Error(`Apify: ${items[0].errorDescription || items[0].error}`);
  return items;
}

// Ambil satu postingan dari link-nya (butuh Actor yang menerima URL post, mis. apify~instagram-scraper).
export async function fetchPostApify(url, { token, actor, fetchImpl = fetch, retryDelays } = {}) {
  if (!token) throw new Error("APIFY_TOKEN belum diisi");
  const id = String(actor || "apify~instagram-scraper").replace("/", "~");
  const items = await callApify({ token, actor: id, body: { directUrls: [url], resultsType: "posts", resultsLimit: 1, addParentData: false }, fetchImpl, retryDelays });
  const post = items.map((i) => normalizeApifyItem(i)).find(Boolean);
  if (!post) throw new Error("Post tidak ditemukan (mungkin akunnya privat atau link salah)");
  return post;
}

export async function fetchAccountPostsApify(username, { token, actor, input, amount, fetchImpl = fetch, retryDelays } = {}) {
  const clean = String(username).replace(/^@/, "").trim();
  if (!/^[A-Za-z0-9._]{1,30}$/.test(clean)) throw new Error(`Username tidak valid: ${username}`);
  if (!token) throw new Error("APIFY_TOKEN belum diisi");

  const n = Number(amount) || APIFY_DEFAULTS.amount;
  const id = String(actor || APIFY_DEFAULTS.actor).replace("/", "~");
  let body = { username: [clean], resultsLimit: n };
  if (input) {
    try {
      body = JSON.parse(String(input).replaceAll("{username}", clean).replaceAll("{amount}", String(n)));
    } catch {
      throw new Error("APIFY_INPUT bukan JSON yang valid");
    }
  }

  const items = await callApify({ token, actor: id, body, fetchImpl, retryDelays });
  return items.map((i) => normalizeApifyItem(i, clean)).filter(Boolean);
}

export function createApifyFetcher(env = process.env, { fetchImpl = fetch } = {}) {
  return (username) =>
    fetchAccountPostsApify(username, {
      token: env.APIFY_TOKEN,
      actor: env.APIFY_ACTOR,
      input: env.APIFY_INPUT,
      amount: env.APIFY_AMOUNT || env.RAPIDAPI_AMOUNT,
      fetchImpl,
    });
}
