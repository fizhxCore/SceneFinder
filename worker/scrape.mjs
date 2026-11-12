// Bot pengambil data: ambil post akun Instagram -> kecilkan thumbnail -> simpan ke repo -> commit & push.
// Sumber data: RapidAPI dan/atau Apify (lihat SCRAPER_PROVIDER), kalau tidak ada kunci scraping langsung (sering diblokir).
// Jalankan: node worker/scrape.mjs          (NO_GIT=1 untuk tes lokal atau saat commit dilakukan pihak lain)
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { buildFeed, normalizeSources } from "../lib/feed.js";
import { QuotaError } from "../lib/rapidapi.js";
import { fetchPostApify } from "../lib/apify.js";
import { shortcodeFromUrl } from "../lib/instagram.js";
import { buildProviders, createFetcher } from "../lib/providers.js";
import { mergeFeeds, pruneFeed, isRemote, thumbPath, shouldWrite, pickAccountsByState, updateAccountState } from "../lib/archive.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FEED = path.join(ROOT, "data/feed.json");
const LEGACY_THUMBS = path.join(ROOT, "public/thumbs");
// THUMBS_DIR diisi (mis. assets/thumbs) => gambar disimpan di repo terpisah, bukan di repo utama.
const THUMBS = process.env.THUMBS_DIR ? path.resolve(ROOT, process.env.THUMBS_DIR) : LEGACY_THUMBS;
const MAX_POSTS = Number(process.env.MAX_POSTS || 1500);
const MAX_CALLS = Number(process.env.MAX_CALLS || process.env.RAPIDAPI_MAX_CALLS) || 0; // 0 = semua akun tiap run
const SLOT_MS = (Number(process.env.ROTATE_EVERY_HOURS) || 24) * 3600_000;
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
  const webp = await sharp(buf).resize({ width: 480, withoutEnlargement: true }).webp({ quality: 60 }).toBuffer();
  await fs.writeFile(path.join(THUMBS, `${post.id}.webp`), webp);
  return thumbPath(post.id);
}

// Pindahkan thumbnail lama dari public/thumbs (repo utama) ke folder gambar yang baru.
async function migrateLegacy() {
  if (path.resolve(THUMBS) === path.resolve(LEGACY_THUMBS)) return;
  const files = (await fs.readdir(LEGACY_THUMBS).catch(() => [])).filter((f) => f.endsWith(".webp"));
  let moved = 0;
  for (const f of files) {
    try {
      await fs.copyFile(path.join(LEGACY_THUMBS, f), path.join(THUMBS, f));
      await fs.rm(path.join(LEGACY_THUMBS, f));
      moved++;
    } catch (e) {
      log("  gagal memindah", f, e.message);
    }
  }
  if (files.length) log(`gambar lama dipindah: ${moved}/${files.length}`);
}

async function main() {
  const akun = await readJson(path.join(ROOT, "akun.json"), []);
  const old = await readJson(FEED, { posts: [], checkedAt: 0, updatedAt: 0 });
  const STATE = path.join(ROOT, "data/state.json"); // riwayat pengambilan per akun (kecil, terpisah dari feed.json)
  const state = (await readJson(STATE, { accounts: {} })).accounts || {};
  await fs.mkdir(THUMBS, { recursive: true });
  log(`gambar: ${path.relative(ROOT, THUMBS) || THUMBS}`);
  await migrateLegacy();

  // Pilih akun untuk run ini (bergilir kalau dibatasi) dan pilih sumber data.
  const sources = normalizeSources(akun);
  const ADD_URL = String(process.env.ADD_URL || "").trim(); // diisi dari halaman admin: tambah satu post saja
  const addMode = Boolean(ADD_URL);
  if (addMode && !shortcodeFromUrl(ADD_URL)) throw new Error(`Link tidak dikenali: ${ADD_URL}`);
  if (addMode && !process.env.APIFY_TOKEN) log("peringatan: APIFY_TOKEN kosong, mengambil langsung dari Instagram (sering diblokir)");
  const providers = buildProviders(process.env);
  const useApi = providers.some((p) => p.api);
  const accounts = addMode ? [] : useApi ? pickAccountsByState(sources.accounts, state, { limit: MAX_CALLS }) : sources.accounts;
  log(`sumber: ${providers.map((p) => p.name).join(" > ")}, ${accounts.length}/${sources.accounts.length} akun run ini`);

  const getAccount = createFetcher(providers, { onDead: (name, e) => log(`  ${name} dilewati: ${e.message}`) });
  const skipped = new Set(); // akun yang tidak sempat dicoba karena kunci/kredit bermasalah
  let quotaHit = null; // kunci/kuota bermasalah: hentikan panggilan sisanya, jangan buang request

  // Jeda acak antar akun; satu akun per waktu.
  const fresh = await buildFeed(
    { accounts, posts: addMode ? [{ url: ADD_URL, manual: true }] : sources.posts },
    {
      concurrency: 1,
      fetchPostByUrl: process.env.APIFY_TOKEN ? (u) => fetchPostApify(u, { token: process.env.APIFY_TOKEN, actor: process.env.APIFY_POST_ACTOR }) : undefined,
      fetchAccountPosts: async (u) => {
        if (quotaHit) {
          skipped.add(String(u).toLowerCase());
          throw quotaHit;
        }
        await sleep(useApi ? 1200 + Math.random() * 800 : 2000 + Math.random() * 4000);
        try {
          return await getAccount(u);
        } catch (e) {
          if (e instanceof QuotaError) quotaHit = e;
          throw e;
        }
      },
    }
  );
  log(`scrape: ${fresh.posts.length} post dari ${fresh.sourceCount} sumber, ${fresh.errors.length} galat`);
  fresh.errors.forEach((e) => log("  galat", e.source, e.message));

  // Catat akun mana yang berhasil/gagal supaya run berikutnya mendahulukan yang paling lama belum berhasil.
  if (!addMode && accounts.length) {
    const failedKeys = new Set(fresh.errors.map((e) => String(e.source).replace(/^@/, "").toLowerCase()));
    const attempted = accounts.filter((a) => !skipped.has(a.username.toLowerCase()));
    const next = updateAccountState(state, attempted, failedKeys, Date.now());
    const keep = new Set(sources.accounts.map((a) => a.username.toLowerCase()));
    for (const k of Object.keys(next)) if (!keep.has(k)) delete next[k];
    await fs.writeFile(STATE, JSON.stringify({ accounts: next }, null, 1) + "\n");
  }

  // Semua sumber gagal (mis. IP diblokir, kuota habis): jangan sentuh data lama.
  if (fresh.sourceCount > 0 && fresh.posts.length === 0) {
    log("semua sumber gagal, data lama dibiarkan");
    process.exitCode = 1;
    return;
  }

  if (addMode) {
    const have = new Set(old.posts.map((p) => p.id));
    fresh.posts = fresh.posts.filter((p) => !have.has(p.id));
    if (fresh.posts.length === 0) return log("post itu sudah ada, tidak ada yang ditambah");
    for (const p of fresh.posts) {
      const acc = sources.accounts.find((a) => a.username.toLowerCase() === String(p.username).toLowerCase());
      p.category = acc?.category || "Lainnya";
    }
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
  for (const p of dropped) {
    await fs.rm(path.join(THUMBS, `${p.id}.webp`), { force: true });
  }

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
  git("add", "data", "public/thumbs");
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
