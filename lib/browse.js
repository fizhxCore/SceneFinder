// Logika murni untuk UI (dipisah dari React supaya bisa dites di Node).

const lc = (s) => String(s || "").toLowerCase();

const GENERIC_TAGS = new Set([
  "fyp", "foryou", "foryoupage", "fypシ", "viral", "trending", "explore", "reels", "reel", "reelsinstagram",
  "instagram", "instagood", "edit", "edits", "capcut", "video", "shorts",
]);

function score(post, tokens) {
  const fields = [
    [[post.category, ...(post.tags || [])], 5],
    [post.hashtags || [], 3],
    [[post.username], 3],
    [[post.caption], 1],
  ];
  let total = 0;
  for (const t of tokens) {
    let best = 0;
    for (const [vals, w] of fields) if (vals.some((v) => lc(v).includes(t))) best = Math.max(best, w);
    if (!best) return 0; // semua kata harus cocok
    total += best;
  }
  return total;
}

export function searchPosts(posts, query = "", { category = "" } = {}) {
  const tokens = lc(query).split(/\s+/).map((t) => t.replace(/^#/, "")).filter(Boolean);
  const pool = category ? posts.filter((p) => lc(p.category) === lc(category)) : posts;
  if (!tokens.length) return pool;
  return pool
    .map((p) => ({ p, s: score(p, tokens) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || b.p.ts - a.p.ts)
    .map((x) => x.p);
}

export function countBy(posts, pick) {
  const m = new Map();
  for (const p of posts) {
    for (const v of pick(p)) {
      const k = lc(v);
      if (!k) continue;
      const cur = m.get(k) || { name: v, n: 0 };
      cur.n++;
      m.set(k, cur);
    }
  }
  return [...m.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
}

export const categoriesOf = (posts) => countBy(posts, (p) => (p.category ? [p.category] : []));

// Baris ala Netflix: terbaru, per kategori, hashtag populer, per kreator.
export function buildRows(posts, { category = "" } = {}) {
  const pool = category ? posts.filter((p) => lc(p.category) === lc(category)) : posts;
  if (!pool.length) return [];
  const rows = [{ id: "new", title: category ? `Terbaru di ${category}` : "Baru ditambahkan", posts: pool.slice(0, 20) }];

  if (!category) {
    for (const c of categoriesOf(pool)) {
      const list = pool.filter((p) => lc(p.category) === lc(c.name));
      if (list.length >= 3) rows.push({ id: `cat-${lc(c.name)}`, title: c.name, posts: list.slice(0, 20) });
    }
  }

  // Hashtag generik (fyp, viral, ...) atau yang ada di hampir semua post tidak berguna sebagai baris.
  const tooCommon = (n) => pool.length >= 10 && n > pool.length * 0.6;
  const tagCounts = countBy(pool, (p) => [...(p.tags || []), ...(p.hashtags || [])]).filter(
    (t) => t.n >= 3 && !GENERIC_TAGS.has(lc(t.name)) && !tooCommon(t.n)
  );
  for (const t of tagCounts.slice(0, 6)) {
    const list = pool.filter((p) => [...(p.tags || []), ...(p.hashtags || [])].some((x) => lc(x) === lc(t.name)));
    rows.push({ id: `tag-${lc(t.name)}`, title: `#${t.name}`, posts: list.slice(0, 20), query: t.name });
  }

  for (const u of countBy(pool, (p) => [p.username]).filter((u) => u.n >= 3).slice(0, 8)) {
    rows.push({
      id: `user-${lc(u.name)}`,
      title: `Dari @${u.name}`,
      posts: pool.filter((p) => lc(p.username) === lc(u.name)).slice(0, 20),
      query: u.name,
    });
  }
  return rows;
}

export function firstLine(caption, max = 80) {
  const line = String(caption || "").split(/\n/).map((l) => l.trim()).find(Boolean) || "";
  const noTags = line.replace(/#[\p{L}\p{N}_]+/gu, "").replace(/\s+/g, " ").trim() || line;
  return noTags.length > max ? `${noTags.slice(0, max - 1)}…` : noTags;
}

export function timeAgo(ts, now = Date.now()) {
  if (!ts) return "";
  const s = Math.max(1, Math.round((now - ts) / 1000));
  const units = [["tahun", 31536000], ["bulan", 2592000], ["minggu", 604800], ["hari", 86400], ["jam", 3600], ["menit", 60]];
  for (const [name, sec] of units) if (s >= sec) return `${Math.floor(s / sec)} ${name} lalu`;
  return "baru saja";
}
