import { extractHashtags, permalink } from "./instagram.js";

export const DEFAULTS = {
  host: "instagram-scraper-stable-api.p.rapidapi.com",
  path: "/get_ig_user_posts.php",
  bodyField: "username_or_url",
  amount: 12,
};

export class QuotaError extends Error {}

const first = (...vals) =>
  vals.find((v) => v !== undefined && v !== null && v !== "");

function toMs(raw) {
  if (raw === undefined || raw === null || raw === "") return 0;
  const n = Number(raw);
  if (Number.isFinite(n)) return n < 1e11 ? n * 1000 : n;
  const t = Date.parse(String(raw));
  return Number.isFinite(t) ? t : 0;
}

export function normalizeRapidItem(it, fallbackUsername = "") {
  if (!it || typeof it !== "object") return null;

  if (it.node && typeof it.node === "object") {
    it = it.node;
  }

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

  const caption =
    typeof it.caption === "string"
      ? it.caption
      : it.caption?.text ||
        it.edge_media_to_caption?.edges?.[0]?.node?.text ||
        "";

  const carousel =
    it.media_type === 8 ||
    it.post_type === "carousel" ||
    Array.isArray(it.carousel_media) ||
    it.__typename === "GraphSidecar";

  const video =
    it.is_video === true ||
    it.media_type === 2 ||
    it.post_type === "video" ||
    it.post_type === "reel" ||
    (Array.isArray(it.video_versions) &&
      it.video_versions.length > 0);

  const kind =
    it.product_type === "clips" || it.post_type === "reel"
      ? "reel"
      : carousel
        ? "carousel"
        : video
          ? "video"
          : "photo";

  return {
    id,
    url: permalink(id, kind),
    kind,
    username:
      first(
        it.username,
        it.user?.username,
        it.owner?.username,
        fallbackUsername
      ) || "",
    caption,
    hashtags: extractHashtags(caption),
    thumb,
    ts: toMs(
      first(
        it.taken_at,
        it.taken_at_timestamp,
        it.timestamp,
        it.created_at
      )
    ),
  };
}

export function parseRapidResponse(json, username) {
  const candidates = [
    json?.posts,
    json?.data?.posts,
    json?.data?.items,
    json?.items,
    json?.data?.edges?.map((e) => e?.node),
    json?.data?.user?.edge_owner_to_timeline_media?.edges?.map(
      (e) => e?.node
    ),
    json?.edges?.map((e) => e?.node),
    json?.data,
    json?.result,
  ];

  const items = candidates.find(Array.isArray);

  if (!items) {
    const hint =
      typeof json?.message === "string"
        ? `: ${json.message}`
        : typeof json?.error === "string"
          ? `: ${json.error}`
          : "";

    throw new Error(`Respons RapidAPI tidak dikenali${hint}`);
  }

  return items
    .map((it) => normalizeRapidItem(it, username))
    .filter(Boolean);
}

export async function fetchAccountPostsRapid(
  username,
  {
    key,
    host,
    path,
    bodyField,
    amount,
    fetchImpl = fetch,
  } = {}
) {
  const clean = String(username).replace(/^@/, "").trim();

  if (!/^[A-Za-z0-9._]{1,30}$/.test(clean)) {
    throw new Error(`Username tidak valid: ${username}`);
  }

  if (!key) {
    throw new Error("RAPIDAPI_KEY belum diisi");
  }

  const h = host || DEFAULTS.host;
  const endpoint = path || DEFAULTS.path;
  const field = bodyField || DEFAULTS.bodyField;
  const postAmount = amount ?? DEFAULTS.amount;

  const form = new FormData();
  form.set(field, clean);

  if (postAmount !== undefined && postAmount !== null && postAmount !== "") {
    form.set("amount", String(postAmount));
  }

  const res = await fetchImpl(`https://${h}${endpoint}`, {
    method: "POST",
    headers: {
      "x-rapidapi-key": key,
      "x-rapidapi-host": h,
      Accept: "application/json",
    },
    body: form,
    signal: AbortSignal.timeout(20000),
  });

  if (res.status === 401 || res.status === 403) {
    throw new QuotaError(
      `RapidAPI menolak kunci (${res.status}). Periksa RAPIDAPI_KEY dan status subscription API`
    );
  }

  if (res.status === 429) {
    throw new QuotaError("Kuota atau batas request RapidAPI habis (429)");
  }

  if (res.status === 404) {
    throw new Error("Endpoint atau akun tidak ditemukan");
  }

  if (!res.ok) {
    throw new Error(`RapidAPI membalas ${res.status}`);
  }

  let json;

  try {
    json = await res.json();
  } catch {
    throw new Error("RapidAPI tidak membalas JSON");
  }

  return parseRapidResponse(json, clean);
}

export function createRapidFetcher(
  env = process.env,
  { fetchImpl = fetch } = {}
) {
  return (username) =>
    fetchAccountPostsRapid(username, {
      key: env.RAPIDAPI_KEY,
      host: env.RAPIDAPI_HOST,
      path: env.RAPIDAPI_PATH,
      bodyField: env.RAPIDAPI_BODY_FIELD,
      amount: env.RAPIDAPI_AMOUNT,
      fetchImpl,
    });
}
