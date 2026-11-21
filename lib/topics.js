// Topik terbanyak: menghitung hashtag di feed. Ini jumlah scene yang memuatnya, bukan popularitas di luar situs.
export const GENERIC = new Set([
  "fyp", "fypage", "foryou", "foryoupage", "viral", "trending", "explore", "reels", "reel", "edit", "edits", "capcut",
  "scp", "scenepack", "scenepacks", "kpopscenepack", "kpopscenepacks", "scene", "scenes", "scenefinder", "video", "videos", "shorts", "tiktok", "instagram", "ig",
  "kpop", "kdrama", "cdrama", "drama", "dramas", "korean", "koreandrama", "chinesedrama", "movie", "movies", "anime", "actor", "actors", "actress",
]);

// Hashtag yang ditulis dua cara dihitung satu topik.
export const ALIASES = { h2h: "hearts2hearts", jihyotwice: "jihyo" };

const norm = (t) => String(t || "").toLowerCase().replace(/^#/, "").replace(/[^\p{L}\p{N}]+/gu, "");

export function topTopics(posts, { min = 3, limit = 10, generic = GENERIC, aliases = ALIASES } = {}) {
  const creators = new Set(posts.map((p) => norm(p.username)).filter(Boolean));
  const groups = new Map();
  for (const p of posts) {
    const seen = new Set();
    for (const raw of p.hashtags || []) {
      let t = norm(raw);
      t = aliases[t] || t;
      if (t.length < 3 || generic.has(t) || creators.has(t) || seen.has(t)) continue;
      seen.add(t);
      const g = groups.get(t) || { tag: t, count: 0, post: null };
      g.count += 1;
      if (p.thumb && (!g.post || p.ts > g.post.ts)) g.post = p;
      groups.set(t, g);
    }
  }
  return [...groups.values()]
    .filter((g) => g.count >= min && g.post)
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, limit);
}
