// Logika arsip untuk worker VPS (murni, bisa dites tanpa jaringan).

// Gabungkan arsip lama dengan hasil scrape baru, kunci = id post.
// Post lama mempertahankan thumbnail lokalnya; metadata kategori/tag ikut akun.json terbaru.
export function mergeFeeds(existing = [], incoming = []) {
  const byId = new Map(existing.map((p) => [p.id, p]));
  const added = [];
  for (const p of incoming) {
    const old = byId.get(p.id);
    if (old) {
      byId.set(p.id, { ...old, category: p.category, tags: p.tags, caption: p.caption || old.caption });
    } else {
      byId.set(p.id, p);
      added.push(p.id);
    }
  }
  const posts = [...byId.values()].sort((a, b) => b.ts - a.ts);
  return { posts, added };
}

// Batasi ukuran arsip supaya repo tidak membengkak. Mengembalikan post yang dibuang.
export function pruneFeed(posts, max = 3000) {
  const sorted = [...posts].sort((a, b) => b.ts - a.ts);
  return { kept: sorted.slice(0, max), dropped: sorted.slice(max) };
}

export const isRemote = (thumb) => /^https?:\/\//i.test(String(thumb || ""));
export const thumbPath = (id) => `/thumbs/${id}.webp`;

// Perlu commit hanya kalau ada post baru, atau sudah lewat `heartbeatMs` sejak pengecekan terakhir
// (supaya halaman bisa menampilkan "diperbarui" yang jujur tanpa commit tiap run).
export function shouldWrite({ added, dropped = 0, checkedAt = 0, now = Date.now(), heartbeatMs = 24 * 3600_000 }) {
  return added > 0 || dropped > 0 || now - checkedAt >= heartbeatMs;
}
