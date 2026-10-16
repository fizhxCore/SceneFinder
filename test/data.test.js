import test from "node:test";
import assert from "node:assert/strict";
import { parseProfileResponse, parseEmbedHtml, shortcodeFromUrl, fetchAccountPosts, extractHashtags } from "../lib/instagram.js";
import { buildFeed, normalizeSources } from "../lib/feed.js";
import { searchPosts, buildRows, categoriesOf, firstLine, timeAgo } from "../lib/browse.js";

const node = (sc, over = {}) => ({
  shortcode: sc,
  display_url: `https://cdn.example/${sc}.jpg`,
  is_video: true,
  product_type: "clips",
  taken_at_timestamp: 1_700_000_000 + Number(sc.replace(/\D/g, "") || 0),
  owner: { username: "editacc" },
  edge_media_to_caption: { edges: [{ node: { text: `Scene ${sc} #sad #queenoftears` } }] },
  ...over,
});
const profile = (...nodes) => ({ data: { user: { edge_owner_to_timeline_media: { edges: nodes.map((n) => ({ node: n })) } } } });

test("parseProfileResponse: reel/photo/carousel + hashtag + permalink", () => {
  const posts = parseProfileResponse(
    profile(node("A1"), node("B2", { is_video: false, product_type: "feed" }), node("C3", { is_video: false, product_type: "carousel_container", __typename: "GraphSidecar" }), { shortcode: "NOTHUMB" }),
    "editacc"
  );
  assert.deepEqual(posts.map((p) => p.kind), ["reel", "photo", "carousel"]);
  assert.equal(posts[0].url, "https://www.instagram.com/reel/A1/");
  assert.equal(posts[1].url, "https://www.instagram.com/p/B2/");
  assert.deepEqual(posts[0].hashtags, ["sad", "queenoftears"]);
  assert.equal(posts[0].ts, (1_700_000_000 + 1) * 1000);
  assert.throws(() => parseProfileResponse({}, "x"), /tidak dikenali/);
});

test("fetchAccountPosts: pesan error jelas untuk redirect, 404, 429, HTML", async () => {
  const mk = (res) => ({ fetchImpl: async () => res });
  await assert.rejects(fetchAccountPosts("abc", mk({ status: 302, ok: false })), /meminta login/);
  await assert.rejects(fetchAccountPosts("abc", mk({ status: 404, ok: false })), /tidak ditemukan/);
  await assert.rejects(fetchAccountPosts("abc", mk({ status: 429, ok: false })), /rate limit/);
  await assert.rejects(fetchAccountPosts("abc", mk({ status: 200, ok: true, json: async () => { throw new Error("x"); } })), /halaman login/);
  await assert.rejects(fetchAccountPosts("bad name!", mk({})), /tidak valid/);
  const ok = await fetchAccountPosts("@editacc", mk({ status: 200, ok: true, json: async () => profile(node("Z9")) }));
  assert.equal(ok[0].id, "Z9");
});

test("shortcodeFromUrl & parseEmbedHtml (format embed ala scrapr)", () => {
  assert.deepEqual(shortcodeFromUrl("https://www.instagram.com/reel/Abc_1-x/?igsh=1"), { shortcode: "Abc_1-x", kind: "reel" });
  assert.equal(shortcodeFromUrl("https://example.com/reel/abc"), null);
  const media = { shortcode: "Q1", display_url: "https://cdn/x.jpg", is_video: true, owner: { username: "u" }, edge_media_to_caption: { edges: [{ node: { text: "hi #x" } }] } };
  const html = `<script>..."shortcode_media":${JSON.stringify(media).replace(/"/g, '\\"')},"other":1...</script>`;
  const p = parseEmbedHtml(html, "Q1");
  assert.equal(p.username, "u");
  assert.deepEqual(p.hashtags, ["x"]);
  assert.throws(() => parseEmbedHtml("<html></html>", "Q1"), /tidak ditemukan/);
});

test("buildFeed: dedup, metadata sumber, urut terbaru, error per sumber", async () => {
  const deps = {
    fetchAccountPosts: async (u) => {
      if (u === "gagal") throw new Error("diblokir");
      return parseProfileResponse(profile(node("A1"), node("A2")), u);
    },
    fetchPostByUrl: async () => parseProfileResponse(profile(node("A2"), node("M7")), "x")[1],
  };
  const feed = await buildFeed(
    { accounts: [{ username: "satu", category: "K-Drama", tags: ["sad"] }, { username: "gagal" }], posts: ["https://www.instagram.com/p/M7/", "bukan-link"] },
    deps
  );
  assert.deepEqual(feed.posts.map((p) => p.id), ["M7", "A2", "A1"]);
  assert.equal(feed.posts.find((p) => p.id === "A1").category, "K-Drama");
  assert.deepEqual(feed.errors, [{ source: "@gagal", message: "diblokir" }]);
  assert.equal(feed.sourceCount, 3);
});

test("searchPosts: AND, bobot tag > caption, filter kategori", () => {
  const posts = [
    { id: "1", username: "a", caption: "rooftop scene #sad", hashtags: ["sad"], tags: [], category: "K-Drama", ts: 3 },
    { id: "2", username: "b", caption: "hujan sad rooftop", hashtags: [], tags: ["sad"], category: "K-Pop", ts: 2 },
    { id: "3", username: "c", caption: "lucu", hashtags: ["fun"], tags: [], category: "K-Drama", ts: 1 },
  ];
  assert.deepEqual(searchPosts(posts, "sad rooftop").map((p) => p.id), ["2", "1"]);
  assert.deepEqual(searchPosts(posts, "#fun").map((p) => p.id), ["3"]);
  assert.deepEqual(searchPosts(posts, "", { category: "k-drama" }).map((p) => p.id), ["1", "3"]);
  assert.deepEqual(searchPosts(posts, "tidakada"), []);
  assert.deepEqual(categoriesOf(posts).map((c) => [c.name, c.n]), [["K-Drama", 2], ["K-Pop", 1]]);
});

test("buildRows & util", () => {
  const posts = Array.from({ length: 6 }, (_, i) => ({
    id: String(i), username: i < 4 ? "ua" : "ub", caption: "x", hashtags: ["sad"], tags: [], category: i < 3 ? "K-Drama" : "", ts: 100 - i,
  }));
  const rows = buildRows(posts);
  assert.deepEqual(rows.map((r) => r.id), ["new", "cat-k-drama", "tag-sad", "user-ua"]);
  assert.equal(buildRows(posts, { category: "K-Drama" })[0].title, "Terbaru di K-Drama");
  assert.deepEqual(buildRows([]), []);
  const fyp = posts.map((p) => ({ ...p, hashtags: ["fyp", "sad"] }));
  assert.ok(!buildRows(fyp).some((r) => r.id === "tag-fyp"), "hashtag generik tidak jadi baris");
  const many = Array.from({ length: 12 }, (_, i) => ({ id: "m" + i, username: "u" + i, caption: "", hashtags: i < 11 ? ["kdrama"] : ["x"], tags: [], category: "", ts: i }));
  assert.ok(!buildRows(many).some((r) => r.id === "tag-kdrama"), "hashtag yang ada di hampir semua post tidak jadi baris");
  assert.equal(firstLine("Queen of Tears #sad #fyp\nbaris dua"), "Queen of Tears");
  assert.equal(timeAgo(Date.now() - 3 * 86400_000), "3 hari lalu");
  assert.deepEqual(extractHashtags("#A #a #b_c"), ["a", "b_c"]);
});

test("normalizeSources: daftar sederhana", () => {
  const n = normalizeSources(["@satu", { username: "dua", category: "K-Pop" }, "https://www.instagram.com/reel/AB1/", {}, 5]);
  assert.deepEqual(n.accounts.map((a) => a.username), ["satu", "dua"]);
  assert.equal(n.posts.length, 1);
  assert.deepEqual(normalizeSources({ accounts: [{ username: "x" }], posts: [] }).accounts[0].username, "x");
});
