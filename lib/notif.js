// Logika panel lonceng: scene mana yang "belum dilihat" dan cara mengelompokkannya per hari.
const DAY = 86400_000;
export const FRESH_MS = 7 * DAY;

// Belum dilihat = lebih baru dari saat terakhir menekan "Tandai semua dilihat", dan paling jauh 7 hari ke belakang.
export function unseenPosts(posts, seenAt = 0, now = Date.now()) {
  const from = Math.max(seenAt || 0, now - FRESH_MS);
  return posts.filter((p) => p.ts > from);
}

export function isFresh(post, now = Date.now()) {
  return post.ts > now - FRESH_MS;
}

export function dayLabel(ts, now = Date.now()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const start = d.getTime();
  if (ts >= start) return "Hari ini";
  if (ts >= start - DAY) return "Kemarin";
  if (ts >= now - FRESH_MS) return "Minggu ini";
  return "Lebih lama";
}

// 60 scene terbaru: grup "Belum dilihat" dulu, sisanya per hari. Grup kosong tidak dikembalikan.
export function groupPosts(posts, seenAt = 0, now = Date.now(), limit = 60) {
  const latest = [...posts].filter((p) => p.ts > 0).sort((a, b) => b.ts - a.ts).slice(0, limit);
  const unseen = new Set(unseenPosts(latest, seenAt, now).map((p) => p.id));
  const groups = [];
  if (unseen.size > 0) groups.push({ label: "Belum dilihat", unseen: true, posts: latest.filter((p) => unseen.has(p.id)) });
  for (const p of latest) {
    if (unseen.has(p.id)) continue;
    const label = dayLabel(p.ts, now);
    let g = groups.find((x) => x.label === label && !x.unseen);
    if (!g) groups.push((g = { label, unseen: false, posts: [] }));
    g.posts.push(p);
  }
  return groups;
}
