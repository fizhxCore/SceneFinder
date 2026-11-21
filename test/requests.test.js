import test from "node:test";
import assert from "node:assert/strict";
import { LIMITS, dayKey, isStatus, makeRequest, parseStored, publicView, rateVerdict, statusClass, validClientId, validateRequest } from "../lib/requests.js";
import { redis, redisPipeline, upstashConfigured } from "../lib/upstash.js";

const CLIENT = "a1b2c3d4e5f60718293a4b5c";

test("validateRequest merapikan, memotong, dan menolak isi yang buruk", () => {
  const ok = validateRequest({ client: CLIENT, title: "  Taming   The\nHusband  ", note: "x".repeat(500) });
  assert.equal(ok.ok, true);
  assert.equal(ok.title, "Taming The Husband");
  assert.equal(ok.note.length, LIMITS.note);
  assert.equal(validateRequest({ client: CLIENT, title: "a" }).ok, false);
  assert.equal(validateRequest({ client: "xyz", title: "Judul bagus" }).ok, false);
  assert.equal(validateRequest(null).ok, false);
  assert.equal(validateRequest({ client: CLIENT, title: "t".repeat(200) }).title.length, LIMITS.title);
});

test("validClientId hanya menerima heksadesimal 16-48 karakter", () => {
  assert.equal(validClientId(CLIENT), true);
  assert.equal(validClientId("../etc/passwd"), false);
  assert.equal(validClientId(""), false);
});

test("makeRequest dan publicView tidak membocorkan id klien", () => {
  const r = makeRequest({ title: "Judul", note: "", client: CLIENT }, 1_800_000_000_000, () => 0.5);
  assert.equal(r.status, "menunggu");
  assert.match(r.id, /^[a-z0-9]{6,24}$/);
  assert.equal("client" in publicView(r), false);
});

test("rateVerdict menolak lewat batas per klien dan batas global", () => {
  assert.deepEqual(rateVerdict({ client: 1, global: 1 }), { ok: true, left: 4 });
  assert.equal(rateVerdict({ client: 5, global: 5 }).left, 0);
  assert.equal(rateVerdict({ client: 6, global: 6 }).ok, false);
  assert.equal(rateVerdict({ client: 1, global: 101 }).ok, false);
});

test("dayKey memakai hari WIB", () => {
  assert.equal(dayKey(Date.UTC(2026, 10, 20, 18, 0, 0)), "20261121"); // 18.00 UTC = 01.00 WIB hari berikutnya
  assert.equal(dayKey(Date.UTC(2026, 10, 20, 10, 0, 0)), "20261120");
});

test("parseStored membaca array datar, melewati baris rusak, terbaru dulu", () => {
  const flat = ["a", JSON.stringify({ id: "a", ts: 1 }), "b", "{rusak", "c", JSON.stringify({ id: "c", ts: 9 })];
  assert.deepEqual(parseStored(flat).map((r) => r.id), ["c", "a"]);
  assert.deepEqual(parseStored(null), []);
});

test("status dan kelas status", () => {
  assert.equal(isStatus("selesai"), true);
  assert.equal(isStatus("hack"), false);
  assert.equal(statusClass("tidak bisa"), "st-tidak");
  assert.equal(statusClass("menunggu"), "st-menunggu");
});

test("klien Upstash mengirim perintah dengan token dan menangani galat", async () => {
  const env = { UPSTASH_REDIS_REST_URL: "https://x.upstash.io/", UPSTASH_REDIS_REST_TOKEN: "tok" };
  assert.equal(upstashConfigured(env), true);
  assert.equal(upstashConfigured({}), false);
  const calls = [];
  const ok = async (url, init) => (calls.push([url, init]), { ok: true, status: 200, json: async () => ({ result: 7 }) });
  assert.equal(await redis(["INCR", "k"], { env, fetchImpl: ok }), 7);
  assert.equal(calls[0][0], "https://x.upstash.io");
  assert.equal(calls[0][1].headers.Authorization, "Bearer tok");
  assert.equal(calls[0][1].body, '["INCR","k"]');
  const bad = async () => ({ ok: false, status: 401, json: async () => ({ error: "WRONGPASS" }) });
  await assert.rejects(() => redis(["GET", "k"], { env, fetchImpl: bad }), /WRONGPASS/);
  const pipe = async () => ({ ok: true, status: 200, json: async () => [{ result: 1 }, { result: 1 }] });
  assert.deepEqual(await redisPipeline([["INCR", "a"], ["EXPIRE", "a", 5]], { env, fetchImpl: pipe }), [1, 1]);
});
