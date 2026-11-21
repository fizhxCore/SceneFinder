import test from "node:test";
import assert from "node:assert/strict";
import { titleKey, coreKey, pickCovers, creatorThumbs } from "../lib/covers.js";

const post = (id, category, caption, ts, thumb = `/t/${id}.jpg`, username = "u") => ({ id, category, caption, ts, thumb, username });

test("titleKey menganggap 'X Scenepacks' sama dengan 'X'", () => {
  assert.equal(titleKey("Blossom In Darkness Scenepacks #scp @a"), titleKey("blossom in darkness"));
  assert.equal(titleKey(""), "");
  assert.equal(titleKey(null), "");
});

test("kategori kedua tidak memakai judul yang sama dengan kategori pertama", () => {
  const posts = [
    post("a", "K-Drama", "Blossom In Darkness Scenepacks", 90),
    post("b", "Asian Drama", "Blossom In Darkness", 100),
    post("c", "Asian Drama", "Another Show", 50),
  ];
  const covers = pickCovers(posts, [{ name: "K-Drama" }, { name: "Asian Drama" }]);
  assert.equal(covers.get("k-drama").id, "a");
  assert.equal(covers.get("asian drama").id, "c");
});

test("kalau semua judul sudah terpakai, kembali ke scene terbaru kategori itu", () => {
  const posts = [post("a", "K-Drama", "Same Title", 90), post("b", "Lainnya", "Same Title", 100), post("c", "Lainnya", "same title", 20)];
  const covers = pickCovers(posts, [{ name: "K-Drama" }, { name: "Lainnya" }]);
  assert.equal(covers.get("lainnya").id, "b");
});

test("kategori tanpa gambar dilewati dan tidak error", () => {
  const covers = pickCovers([post("a", "K-Drama", "x", 1, "")], [{ name: "K-Drama" }, { name: "Kosong" }]);
  assert.equal(covers.size, 0);
});

test("creatorThumbs memilih scene terbaru per kreator, tidak peduli huruf besar", () => {
  const posts = [post("a", "x", "t", 10, "/a.jpg", "Kreator1"), post("b", "x", "t", 30, "/b.jpg", "kreator1"), post("c", "x", "t", 20, "", "kreator1")];
  const m = creatorThumbs(posts);
  assert.equal(m.get("kreator1").id, "b");
  assert.equal(m.size, 1);
});

test("varian judul dengan tambahan di belakang tetap dianggap judul yang sama", () => {
  assert.equal(coreKey("BLOSSOM IN DARKNESS — UPCOMING"), coreKey("Blossom In Darkness Scenepacks"));
  const posts = [post("a", "K-Drama", "Blossom In Darkness Scenepacks", 90), post("b", "Asian Drama", "BLOSSOM IN DARKNESS — UPCOMING", 100), post("c", "Asian Drama", "Another Show", 50)];
  const covers = pickCovers(posts, [{ name: "K-Drama" }, { name: "Asian Drama" }]);
  assert.equal(covers.get("asian drama").id, "c");
});
