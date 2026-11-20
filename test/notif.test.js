import test from "node:test";
import assert from "node:assert/strict";
import { unseenPosts, dayLabel, groupPosts, isFresh } from "../lib/notif.js";

const NOW = new Date(2026, 10, 20, 15, 0, 0).getTime();
const H = 3600_000;
const post = (id, ago) => ({ id, ts: NOW - ago });

test("unseenPosts membatasi 7 hari dan menghormati seenAt", () => {
  const posts = [post("a", 2 * H), post("b", 30 * H), post("c", 9 * 24 * H)];
  assert.deepEqual(unseenPosts(posts, 0, NOW).map((p) => p.id), ["a", "b"]);
  assert.deepEqual(unseenPosts(posts, NOW - 10 * H, NOW).map((p) => p.id), ["a"]);
  assert.deepEqual(unseenPosts(posts, NOW, NOW), []);
});

test("dayLabel membedakan hari ini, kemarin, minggu ini, dan lebih lama", () => {
  assert.equal(dayLabel(NOW - 2 * H, NOW), "Hari ini");
  assert.equal(dayLabel(NOW - 20 * H, NOW), "Kemarin");
  assert.equal(dayLabel(NOW - 4 * 24 * H, NOW), "Minggu ini");
  assert.equal(dayLabel(NOW - 12 * 24 * H, NOW), "Lebih lama");
});

test("groupPosts menaruh Belum dilihat dulu lalu per hari, tanpa grup kosong", () => {
  const posts = [post("old", 12 * 24 * H), post("kemarin", 20 * H), post("baru", 1 * H), post("baru2", 2 * H)];
  const seenAt = NOW - 10 * H;
  const g = groupPosts(posts, seenAt, NOW);
  assert.deepEqual(g.map((x) => x.label), ["Belum dilihat", "Kemarin", "Lebih lama"]);
  assert.deepEqual(g[0].posts.map((p) => p.id), ["baru", "baru2"]);
  assert.deepEqual(groupPosts([], 0, NOW), []);
  assert.equal(groupPosts(posts, 0, NOW, 2).reduce((n, x) => n + x.posts.length, 0), 2);
});

test("isFresh true untuk 7 hari terakhir", () => {
  assert.equal(isFresh(post("x", 6 * 24 * H), NOW), true);
  assert.equal(isFresh(post("y", 8 * 24 * H), NOW), false);
});
