// Pengambil data Instagram tanpa login & tanpa dependensi (pakai fetch bawaan).
//
// - fetchAccountPosts: post terbaru sebuah akun lewat endpoint web_profile_info
//   (Instagram hanya memberi ±12 post terbaru per akun lewat jalur ini).
// - fetchPostByUrl: satu post lewat halaman embed. Logikanya diadaptasi dari
//   scrapr `instagram.direct` (MIT, (c) coflyn).
//
// Instagram sering memblokir IP datacenter (termasuk Vercel). Semua fungsi
// melempar Error dengan pesan jelas supaya UI bisa menampilkannya.

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1";
const IG_APP_ID = "936619743392459";

export function extractHashtags(text) {
  const found = String(text || "").match(/#[\p{L}\p{N}_]+/gu) || [];
  return [...new Set(found.map((h) => h.slice(1).toLowerCase()))];
}

export function permalink(shortcode, kind) {
  return `https://www.instagram.com/${kind === "reel" ? "reel" : "p"}/${shortcode}/`;
}

// Satu node GraphQL Instagram -> bentuk post kita.
export function normalizeNode(node, fallbackUsername = "") {
  if (!node?.shortcode) return null;
  const thumb = node.thumbnail_src || node.display_url || "";
  if (!thumb) return null;
  const caption = node.edge_media_to_caption?.edges?.[0]?.node?.text || "";
  const kind =
    node.product_type === "clips" ? "reel" : node.is_video ? "video" : node.__typename === "GraphSidecar" ? "carousel" : "photo";
  return {
    id: node.shortcode,
    url: permalink(node.shortcode, kind),
    kind,
    username: node.owner?.username || fallbackUsername,
    caption,
    hashtags: extractHashtags(caption),
    thumb,
    ts: (node.taken_at_timestamp || 0) * 1000,
  };
}

export function parseProfileResponse(json, username) {
  const edges = json?.data?.user?.edge_owner_to_timeline_media?.edges;
  if (!Array.isArray(edges)) throw new Error("Respons profil tidak dikenali (akun private / tidak ada?)");
  return edges.map((e) => normalizeNode(e.node, username)).filter(Boolean);
}

async function fetchWithTimeout(url, opts = {}, ms = 9000, fetchImpl = fetch) {
  return fetchImpl(url, { ...opts, signal: AbortSignal.timeout(ms) });
}

export async function fetchAccountPosts(username, { fetchImpl = fetch } = {}) {
  const clean = String(username).replace(/^@/, "").trim();
  if (!/^[A-Za-z0-9._]{1,30}$/.test(clean)) throw new Error(`Username tidak valid: ${username}`);
  const res = await fetchWithTimeout(
    `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(clean)}`,
    { headers: { "User-Agent": DESKTOP_UA, "x-ig-app-id": IG_APP_ID, Accept: "*/*", "Accept-Language": "en-US,en;q=0.9" }, redirect: "manual" },
    9000,
    fetchImpl
  );
  if (res.status >= 300 && res.status < 400) throw new Error("Instagram meminta login (IP server kemungkinan diblokir)");
  if (res.status === 404) throw new Error("Akun tidak ditemukan");
  if (res.status === 429) throw new Error("Kena rate limit Instagram");
  if (!res.ok) throw new Error(`Instagram membalas ${res.status}`);
  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error("Instagram membalas halaman login, bukan data (IP server kemungkinan diblokir)");
  }
  return parseProfileResponse(json, clean);
}

export function shortcodeFromUrl(raw) {
  const m = String(raw).match(/instagram\.com\/(?:[\w.]+\/)?(p|reels?|tv)\/([A-Za-z0-9_-]+)/i);
  return m ? { shortcode: m[2], kind: m[1].toLowerCase() === "p" ? "photo" : "reel" } : null;
}

// Adaptasi scrapr instagram.direct: baca JSON `shortcode_media` dari halaman embed.
export function parseEmbedHtml(html, shortcode) {
  const unescaped = String(html).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  const idx = unescaped.indexOf('"shortcode_media":');
  if (idx === -1) throw new Error("Media tidak ditemukan di halaman embed");
  const start = idx + '"shortcode_media":'.length;
  let depth = 0;
  let end = -1;
  for (let i = start; i < unescaped.length; i++) {
    const c = unescaped[i];
    if (c === "{") depth++;
    else if (c === "}" && --depth === 0) {
      end = i + 1;
      break;
    }
  }
  if (end === -1) throw new Error("Gagal membaca JSON media");
  const media = JSON.parse(unescaped.slice(start, end));
  return normalizeNode({ ...media, shortcode: media.shortcode || shortcode }, media.owner?.username || "");
}

export async function fetchPostByUrl(url, { fetchImpl = fetch } = {}) {
  const info = shortcodeFromUrl(url);
  if (!info) throw new Error(`Bukan link post Instagram: ${url}`);
  const res = await fetchWithTimeout(
    `https://www.instagram.com/p/${info.shortcode}/embed/captioned/`,
    { headers: { "User-Agent": MOBILE_UA, Accept: "text/html,application/xhtml+xml", "Accept-Language": "en-US,en;q=0.9" } },
    9000,
    fetchImpl
  );
  if (!res.ok) throw new Error(`Instagram membalas ${res.status}`);
  const post = parseEmbedHtml(await res.text(), info.shortcode);
  if (!post) throw new Error("Post tidak punya thumbnail");
  return post;
}
