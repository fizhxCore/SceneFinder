import test from "node:test";
import assert from "node:assert/strict";
import { parseRapidResponse, normalizeRapidItem, fetchAccountPostsRapid, createRapidFetcher, QuotaError } from "../lib/rapidapi.js";
import { pickAccounts } from "../lib/archive.js";

const item = (code, over = {}) => ({
  code,
  taken_at: 1_700_000_000,
  thumbnail_url: `https://cdn.example/${code}.jpg`,
  product_type: "clips",
  media_type: 2,
  user: { username: "editacc" },
  caption: { text: `Scene ${code} #sad #queenoftears` },
  ...over,
});
const ok = (json) => ({ status: 200, ok: true, json: async () => json });

test("normalizeRapidItem: jenis post, waktu, caption, thumbnail", () => {
  const reel = normalizeRapidItem(item("A1"));
  assert.equal(reel.kind, "reel");
  assert.equal(reel.url, "https://www.instagram.com/reel/A1/");
  assert.equal(reel.ts, 1_700_000_000_000);
  assert.deepEqual(reel.hashtags, ["sad", "queenoftears"]);
  assert.equal(reel.username, "editacc");
  assert.equal(normalizeRapidItem(item("B2", { product_type: "feed", media_type: 1 })).kind, "photo");
  assert.equal(normalizeRapidItem(item("C3", { product_type: "carousel_container", media_type: 8 })).kind, "carousel");
  assert.equal(normalizeRapidItem(item("V4", { product_type: "feed", media_type: 2 })).kind, "video");
  // waktu: milidetik, string ISO, dan string angka
  assert.equal(normalizeRapidItem(item("T1", { taken_at: 1_700_000_000_000 })).ts, 1_700_000_000_000);
  assert.equal(normalizeRapidItem(item("T2", { taken_at: "2023-11-14T22:13:20.000Z" })).ts, 1_700_000_000_000);
  assert.equal(normalizeRapidItem(item("T3", { taken_at: "1700000000" })).ts, 1_700_000_000_000);
  // caption berupa string, thumbnail dari image_versions2, username cadangan
  const alt = normalizeRapidItem(
    { shortcode: "S1", caption: "halo #x", image_versions2: { candidates: [{ url: "https://cdn/x.jpg" }] }, taken_at_timestamp: 5 },
    "cadangan"
  );
  assert.equal(alt.thumb, "https://cdn/x.jpg");
  assert.equal(alt.caption, "halo #x");
  assert.equal(alt.username, "cadangan");
  // tanpa id atau tanpa thumbnail dibuang
  assert.equal(normalizeRapidItem({ thumbnail_url: "x" }), null);
  assert.equal(normalizeRapidItem({ code: "N1" }), null);
  assert.equal(normalizeRapidItem(null), null);
});

test("parseRapidResponse: beberapa bentuk respons + pesan error", () => {
  assert.equal(parseRapidResponse({ data: { items: [item("A1"), { junk: 1 }] } }, "u").length, 1);
  assert.equal(parseRapidResponse({ items: [item("A1")] }, "u")[0].id, "A1");
  assert.equal(parseRapidResponse({ data: [item("A1")] }, "u")[0].id, "A1");
  assert.equal(parseRapidResponse({ data: { edges: [{ node: item("E1") }] } }, "u")[0].id, "E1");
  assert.deepEqual(parseRapidResponse({ data: { items: [] } }, "u"), []);
  assert.throws(() => parseRapidResponse({ message: "Akun private" }, "u"), /tidak dikenali: Akun private/);
  assert.throws(() => parseRapidResponse(null, "u"), /tidak dikenali/);
});

test("fetchAccountPostsRapid: request benar, status jadi pesan jelas", async () => {
  let seen;
  const fetchImpl = async (url, opts) => {
    seen = { url, opts };
    return ok({ data: { items: [item("Z9")] } });
  };
  const posts = await fetchAccountPostsRapid("@editacc", { key: "kunci", fetchImpl });
  assert.equal(posts[0].id, "Z9");
  assert.equal(seen.url, "https://instagram-scraper-api2.p.rapidapi.com/v1.2/posts?username_or_id_or_url=editacc");
  assert.equal(seen.opts.headers["x-rapidapi-key"], "kunci");
  assert.equal(seen.opts.headers["x-rapidapi-host"], "instagram-scraper-api2.p.rapidapi.com");

  await fetchAccountPostsRapid("abc", { key: "k", host: "api.contoh.com", path: "/akun", param: "u", fetchImpl });
  assert.equal(seen.url, "https://api.contoh.com/akun?u=abc");

  const st = (status) => ({ key: "k", fetchImpl: async () => ({ status, ok: status < 400, json: async () => ({}) }) });
  await assert.rejects(fetchAccountPostsRapid("abc", st(403)), (e) => e instanceof QuotaError && /menolak kunci/.test(e.message));
  await assert.rejects(fetchAccountPostsRapid("abc", st(401)), QuotaError);
  await assert.rejects(fetchAccountPostsRapid("abc", st(429)), (e) => e instanceof QuotaError && /habis/.test(e.message));
  await assert.rejects(fetchAccountPostsRapid("abc", st(404)), (e) => !(e instanceof QuotaError) && /tidak ditemukan/.test(e.message));
  await assert.rejects(fetchAccountPostsRapid("abc", st(500)), /500/);
  await assert.rejects(fetchAccountPostsRapid("abc", { key: "k", fetchImpl: async () => ({ status: 200, ok: true, json: async () => { throw new Error("x"); } }) }), /JSON/);
  await assert.rejects(fetchAccountPostsRapid("abc", {}), /RAPIDAPI_KEY/);
  await assert.rejects(fetchAccountPostsRapid("bad name!", { key: "k" }), /tidak valid/);
});

test("createRapidFetcher: baca konfigurasi dari env", async () => {
  let url;
  const f = createRapidFetcher(
    { RAPIDAPI_KEY: "k", RAPIDAPI_HOST: "h.example", RAPIDAPI_PATH: "/p", RAPIDAPI_PARAM: "name" },
    { fetchImpl: async (u) => ((url = u), ok({ items: [item("Q1")] })) }
  );
  assert.equal((await f("satu"))[0].id, "Q1");
  assert.equal(url, "https://h.example/p?name=satu");
  // env kosong (variabel GitHub yang belum diisi) jatuh ke nilai bawaan
  const g = createRapidFetcher({ RAPIDAPI_KEY: "k", RAPIDAPI_HOST: "" }, { fetchImpl: async (u) => ((url = u), ok({ items: [] })) });
  await g("dua");
  assert.match(url, /^https:\/\/instagram-scraper-api2\.p\.rapidapi\.com\/v1\.2\/posts\?/);
});

test("pickAccounts: semua akun, atau bergilir per slot waktu", () => {
  const acc = ["a", "b", "c", "d", "e"].map((username) => ({ username }));
  const names = (l) => l.map((a) => a.username).join("");
  assert.equal(names(pickAccounts(acc)), "abcde");
  assert.equal(names(pickAccounts(acc, { limit: 0 })), "abcde");
  assert.equal(names(pickAccounts(acc, { limit: 9 })), "abcde");
  const day = 24 * 3600_000;
  const run = (k) => names(pickAccounts(acc, { limit: 2, now: k * day + 1000, slotMs: day }));
  assert.equal(run(0), "ab");
  assert.equal(run(1), "cd");
  assert.equal(run(2), "ea"); // memutar kembali ke awal
  assert.equal(run(3), "bc");
  // dalam satu slot hasilnya sama, dan semua akun akhirnya kebagian
  assert.equal(names(pickAccounts(acc, { limit: 2, now: 5 * day + 10, slotMs: day })), names(pickAccounts(acc, { limit: 2, now: 5 * day + day - 10, slotMs: day })));
  const seen = new Set();
  for (let k = 0; k < 5; k++) run(k).split("").forEach((x) => seen.add(x));
  assert.equal(seen.size, 5);
  assert.deepEqual(pickAccounts([], { limit: 2 }), []);
});
