// Pengambil data Instagram lewat RapidAPI (pengganti scraping langsung yang diblokir di IP datacenter).
//
// Bentuk respons tiap penyedia di RapidAPI berbeda, jadi normalisasinya sengaja longgar:
// menerima beberapa nama field yang umum dipakai (code/shortcode, taken_at, thumbnail_url, dst).
// Host, path, dan nama parameter diatur lewat env supaya bisa ganti penyedia tanpa ubah kode.
import { extractHashtags, permalink } from "./instagram.js";

export const DEFAULTS = {
  host: "instagram-scraper-api2.p.rapidapi.com",
  path: "/v1.2/posts",
  param: "username_or_id_or_url",
};

// Kunci salah / belum subscribe / kuota habis: tidak ada gunanya lanjut memanggil akun berikutnya.
export class QuotaError extends Error {}

const first = (...vals) => vals.find((v) => v !== undefined && v !== null && v !== "");

function toMs(raw) {
  if (raw === undefined || raw === null || raw === "") return 0;
  const n = Number(raw);
  if (Number.isFinite(n)) return n < 1e11 ? n * 1000 : n; // detik atau milidetik
  const t = Date.parse(String(raw));
  return Number.isFinite(t) ? t : 0;
}

// Satu item post dari RapidAPI -> bentuk post kita (sama dengan normalizeNode di lib/instagram.js).
export function normalizeRapidItem(it, fallbackUsername = "") {
  if (!it || typeof it !== "object") return null;
  const id = first(it.code, it.shortcode);
  if (!id) return null;
  const thumb = first(
    it.thumbnail_url,
    it.display_url,
    it.thumbnail_src,
    it.display_uri,
    it.image_versions2?.candidates?.[0]?.url,
    it.carousel_media?.[0]?.image_versions2?.candidates?.[0]?.url
  );
  if (!thumb) return null;
  const caption = typeof it.caption === "string" ? it.caption : it.caption?.text || it.edge_media_to_caption?.edges?.[0]?.node?.text || "";
  const carousel = it.media_type === 8 || Array.isArray(it.carousel_media) || it.__typename === "GraphSidecar";
  const video = it.is_video === true || it.media_type === 2 || (Array.isArray(it.video_versions) && it.video_versions.length > 0);
  const kind = it.product_type === "clips" ? "reel" : carousel ? "carousel" : video ? "video" : "photo";
  return {
    id,
    url: permalink(id, kind),
    kind,
    username: first(it.user?.username, it.owner?.username, fallbackUsername) || "",
    caption,
    hashtags: extractHashtags(caption),
    thumb,
    ts: toMs(first(it.taken_at, it.taken_at_timestamp, it.timestamp, it.created_at)),
  };
}

export function parseRapidResponse(json, username) {
  const candidates = [
    json?.data?.items,
    json?.items,
    json?.data?.edges?.map((e) => e?.node),
    json?.data?.user?.edge_owner_to_timeline_media?.edges?.map((e) => e?.node),
    json?.edges?.map((e) => e?.node),
    json?.data,
    json?.result,
  ];
  const items = candidates.find(Array.isArray);
  if (!items) {
    const hint = typeof json?.message === "string" ? `: ${json.message}` : "";
    throw new Error(`Respons RapidAPI tidak dikenali${hint}`);
  }
  return items.map((it) => normalizeRapidItem(it, username)).filter(Boolean);
}

export async function fetchAccountPostsRapid(username, { key, host, path, param, fetchImpl = fetch } = {}) {
  const clean = String(username).replace(/^@/, "").trim();
  if (!/^[A-Za-z0-9._]{1,30}$/.test(clean)) throw new Error(`Username tidak valid: ${username}`);
  if (!key) throw new Error("RAPIDAPI_KEY belum diisi");
  const h = host || DEFAULTS.host;
  const url = `https://${h}${path || DEFAULTS.path}?${param || DEFAULTS.param}=${encodeURIComponent(clean)}`;
  const res = await fetchImpl(url, {
    headers: { "x-rapidapi-key": key, "x-rapidapi-host": h, Accept: "application/json" },
    signal: AbortSignal.timeout(20000),
  });
  if (res.status === 401 || res.status === 403) throw new QuotaError(`RapidAPI menolak kunci (${res.status}). Cek RAPIDAPI_KEY dan apakah sudah subscribe ke API ini`);
  if (res.status === 429) throw new QuotaError("Kuota atau batas request RapidAPI habis (429)");
  if (res.status === 404) throw new Error("Akun tidak ditemukan");
  if (!res.ok) throw new Error(`RapidAPI membalas ${res.status}`);
  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error("RapidAPI tidak membalas JSON");
  }
  return parseRapidResponse(json, clean);
}

// Pembuat fungsi (username) => posts dari env, dipakai worker.
export function createRapidFetcher(env = process.env, { fetchImpl = fetch } = {}) {
  return (username) =>
    fetchAccountPostsRapid(username, {
      key: env.RAPIDAPI_KEY,
      host: env.RAPIDAPI_HOST,
      path: env.RAPIDAPI_PATH,
      param: env.RAPIDAPI_PARAM,
      fetchImpl,
    });
}
