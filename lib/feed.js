import { fetchAccountPosts, fetchPostByUrl, shortcodeFromUrl } from "./instagram.js";

// Jalankan tugas dengan batas paralel supaya tidak menghujani Instagram.
async function pool(items, limit, worker) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        try {
          out[i] = { ok: true, value: await worker(items[i]) };
        } catch (e) {
          out[i] = { ok: false, error: e.message };
        }
      }
    })
  );
  return out;
}

// Terima daftar sederhana: "username", {username, category, tags}, "https://instagram.com/reel/...".
// Format lama {accounts, posts} tetap diterima.
export function normalizeSources(src) {
  if (!Array.isArray(src)) return src || { accounts: [], posts: [] };
  const accounts = [];
  const posts = [];
  for (const item of src) {
    const o = typeof item === "string" ? (/^https?:\/\//i.test(item) ? { url: item } : { username: item }) : item;
    if (o?.url) posts.push(o);
    else if (o?.username) accounts.push({ ...o, username: String(o.username).replace(/^@/, "").trim() });
  }
  return { accounts, posts };
}

const cleanTags = (t) => (Array.isArray(t) ? t.map((x) => String(x).trim()).filter(Boolean) : []);

// Gabungkan semua sumber (akun + link manual) jadi satu daftar post tanpa duplikat.
export async function buildFeed(rawSources, deps = {}) {
  const sources = normalizeSources(rawSources);
  const getAccount = deps.fetchAccountPosts || fetchAccountPosts;
  const getPost = deps.fetchPostByUrl || fetchPostByUrl;

  const accounts = (sources?.accounts || []).filter((a) => a?.username);
  const extras = (sources?.posts || [])
    .map((p) => (typeof p === "string" ? { url: p } : p))
    .filter((p) => p?.url && shortcodeFromUrl(p.url));

  const jobs = [
    ...accounts.map((a) => ({ type: "account", label: `@${a.username}`, meta: a, run: () => getAccount(a.username) })),
    ...extras.map((p) => ({ type: "post", label: p.url, meta: p, run: async () => [await getPost(p.url)] })),
  ];

  const results = await pool(jobs, 4, (j) => j.run());
  const errors = [];
  const byId = new Map();

  results.forEach((r, i) => {
    const job = jobs[i];
    if (!r.ok) return errors.push({ source: job.label, message: r.error });
    for (const post of r.value) {
      if (!post || byId.has(post.id)) continue;
      byId.set(post.id, {
        ...post,
        category: String(job.meta.category || "").trim(),
        tags: cleanTags(job.meta.tags),
      });
    }
  });

  const posts = [...byId.values()].sort((a, b) => b.ts - a.ts);
  return { posts, errors, sourceCount: jobs.length, updatedAt: Date.now() };
}
