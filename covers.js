// Cover Kategori yang tidak kembar dan foto avatar Kreator. Semua fungsi murni supaya bisa diuji.

// Kunci judul: huruf kecil, tanpa tagar, @nama, dan kata "scenepack", supaya "X Scenepacks" dan "X" dianggap sama.
export function titleKey(caption) {
  const line = String(caption || "").split(/\n/).map((l) => l.trim()).find(Boolean) || "";
  return line
    .toLowerCase()
    .replace(/#\S+|@\S+/g, " ")
    .replace(/scene\s*-?\s*packs?|scenepacks?|all scenes?|all movies/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

// Tiga kata pertama judul: "X — Upcoming" dan "X Scenepacks" dianggap judul yang sama dengan "X".
export function coreKey(caption) {
  return titleKey(caption).split(" ").slice(0, 3).join(" ");
}

// Mulai dari kategori terbesar. Tiap kategori memilih scene terbaru yang judul dan gambarnya belum dipakai
// kategori lain. Kalau semuanya sudah terpakai, kembali ke scene terbarunya.
export function pickCovers(posts, categories) {
  const out = new Map();
  const usedTitles = new Set();
  const usedThumbs = new Set();
  for (const c of categories) {
    const key = c.name.toLowerCase();
    const pool = posts
      .filter((p) => p.thumb && String(p.category || "").toLowerCase() === key)
      .sort((a, b) => (b.ts || 0) - (a.ts || 0));
    if (pool.length === 0) continue;
    const fresh = pool.find((p) => {
      const t = coreKey(p.caption);
      return !usedThumbs.has(p.thumb) && !(t && usedTitles.has(t));
    });
    const chosen = fresh || pool[0];
    out.set(key, chosen);
    usedThumbs.add(chosen.thumb);
    const t = coreKey(chosen.caption);
    if (t) usedTitles.add(t);
  }
  return out;
}

// Scene terbaru yang punya gambar, per kreator (kunci: nama akun huruf kecil).
export function creatorThumbs(posts) {
  const out = new Map();
  for (const p of posts) {
    if (!p.thumb || !p.username) continue;
    const k = p.username.toLowerCase();
    const cur = out.get(k);
    if (!cur || (p.ts || 0) > (cur.ts || 0)) out.set(k, p);
  }
  return out;
}
