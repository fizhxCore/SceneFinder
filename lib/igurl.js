// Ambil kode post dari link Instagram (p, reel, tv) dan rapikan jadi satu bentuk. Mengembalikan null kalau bukan link post.
export function parseInstagramPostUrl(raw) {
  let u;
  try {
    u = new URL(String(raw || "").trim());
  } catch {
    return null;
  }
  if (!/^https?:$/.test(u.protocol)) return null;
  const host = u.hostname.toLowerCase().replace(/^(www|m)\./, "");
  if (host !== "instagram.com" && host !== "instagr.am") return null;
  const m = u.pathname.match(/\/(p|reel|reels|tv)\/([A-Za-z0-9_-]{5,})/);
  if (!m) return null;
  const kind = m[1] === "p" ? "p" : m[1] === "tv" ? "tv" : "reel";
  return { code: m[2], url: `https://www.instagram.com/${kind}/${m[2]}/` };
}
