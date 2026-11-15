import test from "node:test";
import assert from "node:assert/strict";
import { addMap, emptyState, mapsOf, normalize, removeMap, renameMap, toggleScene } from "../lib/maps.js";

test("addMap membuat map dan memakai nama yang sama tanpa membedakan huruf besar-kecil", () => {
  const a = addMap(emptyState(), "  Edit  minggu ini ");
  assert.equal(a.state.maps[0].name, "Edit minggu ini");
  const b = addMap(a.state, "edit MINGGU ini");
  assert.equal(b.id, a.id);
  assert.equal(b.state.maps.length, 1);
  assert.equal(addMap(a.state, "   ").id, null);
});

test("toggleScene: scene baru di depan, memanggil lagi mengeluarkannya, satu scene boleh di beberapa map", () => {
  let s = addMap(emptyState(), "A").state;
  const idA = s.maps[0].id;
  s = addMap(s, "B").state;
  const idB = s.maps[1].id;
  s = toggleScene(s, idA, "p1");
  s = toggleScene(s, idA, "p2");
  s = toggleScene(s, idB, "p1");
  assert.deepEqual(s.maps[0].ids, ["p2", "p1"]);
  assert.deepEqual(mapsOf(s, "p1").sort(), [idA, idB].sort());
  s = toggleScene(s, idA, "p1");
  assert.deepEqual(s.maps[0].ids, ["p2"]);
});

test("renameMap menolak nama kembar, removeMap menghapus map", () => {
  let s = addMap(emptyState(), "A").state;
  s = addMap(s, "B").state;
  const [a, b] = s.maps;
  assert.equal(renameMap(s, b.id, "a"), s);
  assert.equal(renameMap(s, b.id, "C").maps[1].name, "C");
  assert.equal(removeMap(s, a.id).maps.length, 1);
});

test("normalize membuang isi yang rusak", () => {
  assert.deepEqual(normalize(null), { maps: [] });
  const n = normalize({ maps: [{ id: "x", name: " Ok ", ids: ["a", "a", 5, null] }, { id: 1, name: "salah" }, null] });
  assert.equal(n.maps.length, 1);
  assert.deepEqual(n.maps[0].ids, ["a"]);
});
