import test from "node:test";
import assert from "node:assert/strict";
import { fetchAccountPostsApify } from "../lib/apify.js";
import { pickAccountsByState, updateAccountState } from "../lib/archive.js";
import { QuotaError } from "../lib/rapidapi.js";

const item = { shortCode: "ABC12", caption: "x", displayUrl: "https://x/y.jpg", timestamp: "2026-11-01T00:00:00.000Z", ownerUsername: "u", type: "Image" };

test("429 dicoba ulang lalu berhasil", async () => {
  let n = 0;
  const fetchImpl = async () => (++n < 3 ? new Response("", { status: 429 }) : new Response(JSON.stringify([item]), { status: 201 }));
  const r = await fetchAccountPostsApify("u", { token: "t", fetchImpl, retryDelays: [0, 0, 0] });
  assert.equal(r.length, 1);
  assert.equal(n, 3);
});

test("429 terus-menerus bukan QuotaError (akun lain tetap dicoba)", async () => {
  const fetchImpl = async () => new Response("", { status: 429 });
  await assert.rejects(fetchAccountPostsApify("u", { token: "t", fetchImpl, retryDelays: [0, 0] }), (e) => !(e instanceof QuotaError) && /429/.test(e.message));
});

test("kredit habis (402) tidak dicoba ulang", async () => {
  let n = 0;
  const fetchImpl = async () => (n++, new Response("", { status: 402 }));
  await assert.rejects(fetchAccountPostsApify("u", { token: "t", fetchImpl, retryDelays: [0, 0, 0] }), QuotaError);
  assert.equal(n, 1);
});

test("giliran akun: yang paling lama belum berhasil didahulukan, yang gagal berulang digeser", () => {
  const acc = ["a", "b", "c", "d"].map((username) => ({ username }));
  const state = { a: { lastOk: 300 }, b: { lastOk: 100 }, c: { lastOk: 200, fails: 2, lastTry: 900 } };
  assert.deepEqual(pickAccountsByState(acc, state, { limit: 2 }).map((x) => x.username), ["d", "b"]);
  const next = updateAccountState(state, [acc[1]], new Set(["b"]), 1000);
  assert.equal(next.b.fails, 1);
  assert.equal(next.b.lastOk, 100);
});

test("fetchAccountPostsApify meminta hanya posting baru kalau ada tanggal terakhir", async () => {
  const bodies = [];
  const fetchImpl = async (url, init) => (bodies.push(JSON.parse(init.body)), new Response("[]", { status: 201 }));
  await fetchAccountPostsApify("u", { token: "t", fetchImpl, since: Date.parse("2026-11-10T12:00:00Z") });
  await fetchAccountPostsApify("u", { token: "t", fetchImpl });
  assert.equal(bodies[0].onlyPostsNewerThan, "2026-11-09");
  assert.equal(bodies[0].skipPinnedPosts, true);
  assert.equal("onlyPostsNewerThan" in bodies[1], false); // akun baru: tanpa batas tanggal
  assert.equal(bodies[1].resultsLimit, 12);
});
