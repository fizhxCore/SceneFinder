import test from "node:test";
import assert from "node:assert/strict";
import { buildDeck, pruneSkipped, swipeDecision, SKIP_MS } from "../lib/swipe.js";

const NOW = 1_800_000_000_000;
const post = (id, thumb = `/thumbs/${id}.jpg`) => ({ id, thumb });

test("swipeDecision memakai ambang 90 px", () => {
  assert.equal(swipeDecision(120), "save");
  assert.equal(swipeDecision(90), "save");
  assert.equal(swipeDecision(-90), "skip");
  assert.equal(swipeDecision(-200), "skip");
  assert.equal(swipeDecision(40), null);
  assert.equal(swipeDecision(0), null);
});

test("pruneSkipped membuang yang kedaluwarsa dan data rusak", () => {
  const out = pruneSkipped({ a: NOW - 1000, b: NOW - SKIP_MS - 1, c: "x", d: null }, NOW);
  assert.deepEqual(out, { a: NOW - 1000 });
  assert.deepEqual(pruneSkipped(null, NOW), {});
  assert.deepEqual(pruneSkipped("rusak", NOW), {});
});

test("buildDeck mengecualikan yang tersimpan, baru dilewati, dan tanpa gambar", () => {
  const posts = [post("a"), post("b"), post("c"), post("d"), post("e", "")];
  const deck = buildDeck(posts, { savedIds: new Set(["a"]), skipped: { b: NOW - 1000 }, now: NOW, rand: () => 0 });
  assert.deepEqual(deck.map((p) => p.id).sort(), ["c", "d"]);
});

test("scene yang dilewati lebih dari 7 hari lalu kembali muncul", () => {
  const deck = buildDeck([post("a"), post("b")], { skipped: { a: NOW - SKIP_MS - 5 }, now: NOW, rand: () => 0 });
  assert.equal(deck.length, 2);
});

test("buildDeck membatasi ukuran dan tidak mengubah daftar asli", () => {
  const posts = Array.from({ length: 100 }, (_, i) => post(`p${i}`));
  const copy = posts.map((p) => p.id);
  const deck = buildDeck(posts, { now: NOW, size: 40 });
  assert.equal(deck.length, 40);
  assert.equal(new Set(deck.map((p) => p.id)).size, 40);
  assert.deepEqual(posts.map((p) => p.id), copy);
  assert.deepEqual(buildDeck([], { now: NOW }), []);
});
