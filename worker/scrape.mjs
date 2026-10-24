// Worker VPS: scrape akun Instagram -> kecilkan thumbnail -> simpan ke repo -> commit & push.
// Jalankan: node worker/scrape.mjs          (NO_GIT=1 untuk tes lokal tanpa commit)
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { buildFeed } from "../lib/feed.js";
import { fetchAccountPosts } from "../lib/instagram.js";
import { mergeFeeds, pruneFeed, isRemote, thumbPath, shouldWrite } from "../lib/archive.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FEED = path.join(ROOT, "data/feed.json");
const THUMBS = path.join(ROOT, "public/thumbs");
const MAX_POSTS = Number(process.env.MAX_POSTS || 3000);
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString(), ...a);
const git = (...args) => execFileSync("git", args, { cwd: ROOT, stdio: "pipe" }).toString();

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function saveThumb(post) {
  const res = await fetch(post.thumb, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`thumbnail ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await sharp(buf).resize({ width: 640, withoutEnlargement: true }).webp({ quality: 70 }).toFile(path.join(THUMBS, `${post.id}.webp`));
  return thumbPath(post.id);
}

async function main() {
  const akun = await readJson(path.join(ROOT, "akun.json"), []);
  const old = await readJson(FEED, { posts: [], checkedAt: 0, updatedAt: 0 });
  await fs.mkdir(THUMBS, { recursive: true });

  // Jeda acak antar akun supaya tidak terlihat seperti bot; satu akun per waktu.
  const fresh = await buildFeed(akun, {
    concurrency: 1,
    fetchAccountPosts: async (u) => {
      await sleep(2000 + Math.random() * 4000);
      return fetchAccountPosts(u);
    },
  });
  log(`scrape: ${fresh.posts.length} post dari ${fresh.sourceCount} sumber, ${fresh.errors.length} galat`);
  fresh.errors.forEach((e) => log("  galat", e.source, e.message));

  // Semua sumber gagal (mis. IP diblokir): jangan sentuh data lama.
  if (fresh.sourceCount > 0 && fresh.posts.length === 0) {
    log("semua sumber gagal, data lama dibiarkan");
    process.exitCode = 1;
    return;
  }

  const merged = mergeFeeds(old.posts, fresh.posts);
  let posts = merged.posts;

  // Unduh thumbnail untuk post baru. Yang gagal diunduh dilewati dan dicoba lagi di run berikutnya.
  const failed = new Set();
  let added = 0;
  for (const p of posts) {
    if (!isRemote(p.thumb)) continue;
    try {
      p.thumb = await saveThumb(p);
      added++;
    } catch (e) {
      failed.add(p.id);
      log("  thumbnail gagal", p.id, e.message);
    }
  }
  posts = posts.filter((p) => !failed.has(p.id));

  const { kept, dropped } = pruneFeed(posts, MAX_POSTS);
  for (const p of dropped) await fs.rm(path.join(THUMBS, `${p.id}.webp`), { force: true });

  const now = Date.now();
  if (!shouldWrite({ added, dropped: dropped.length, checkedAt: old.checkedAt, now })) {
    log("tidak ada post baru, lewati");
    return;
  }

  const out = {
    posts: kept,
    errors: fresh.errors,
    sourceCount: fresh.sourceCount,
    updatedAt: added > 0 ? now : old.updatedAt || now,
    checkedAt: now,
  };
  await fs.writeFile(FEED, JSON.stringify(out) + "\n");
  log(`ditulis: ${kept.length} post (${added} baru, ${dropped.length} dibuang)`);

  if (process.env.NO_GIT) return;
  git("add", "data/feed.json", "public/thumbs");
  try {
    git("diff", "--cached", "--quiet");
    log("tidak ada perubahan git");
  } catch {
    git("commit", "-m", `data: +${added} scene (${new Date(now).toISOString().slice(0, 16)}Z)`);
    git("push");
    log("push selesai");
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
