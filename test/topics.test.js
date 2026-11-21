import test from "node:test";
import assert from "node:assert/strict";
import { topTopics } from "../lib/topics.js";

let n = 0;
const post = (username, hashtags, ts = 1000 + n++) => ({ id: `p${n++}`, username, hashtags, thumb: "/t.jpg", ts });

test("membuang hashtag umum dan nama kreator, lalu mengurutkan dari yang terbanyak", () => {
  const posts = [
    post("a", ["#fyp", "Drama1", "scp", "a"]),
    post("a", ["drama1", "viral"]),
    post("b", ["drama1", "drama2"]),
    post("b", ["drama2"]),
    post("c", ["drama2", "drama3"]),
  ];
  const r = topTopics(posts, { min: 2 });
  assert.deepEqual(r.map((x) => [x.tag, x.count]), [["drama1", 3], ["drama2", 3]]);
});

test("padanan h2h dihitung satu topik dan satu scene tidak dihitung dua kali", () => {
  const posts = [post("a", ["h2h", "hearts2hearts"]), post("b", ["hearts2hearts"]), post("c", ["h2h"])];
  const r = topTopics(posts, { min: 3 });
  assert.deepEqual(r.map((x) => [x.tag, x.count]), [["hearts2hearts", 3]]);
});

test("topik di bawah minimum atau tanpa gambar tidak muncul, poster = scene terbaru", () => {
  const old = { ...post("a", ["topikx"], 10) };
  const fresh = { ...post("b", ["topikx"], 99), thumb: "/baru.jpg" };
  const third = { ...post("c", ["topikx"], 50) };
  const r = topTopics([old, fresh, third, post("d", ["jarang"])], { min: 3 });
  assert.equal(r.length, 1);
  assert.equal(r[0].post.thumb, "/baru.jpg");
  assert.deepEqual(topTopics([], {}), []);
});

test("membatasi jumlah hasil", () => {
  const posts = [];
  for (let i = 0; i < 15; i++) for (let k = 0; k < 3; k++) posts.push(post("u", [`topik${i}x`]));
  assert.equal(topTopics(posts, { limit: 10 }).length, 10);
});
