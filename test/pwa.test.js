import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { restoreMap, removeMap } from "../lib/maps.js";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const png = (p) => {
  const b = readFileSync(new URL(`../${p}`, import.meta.url));
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
};

test("manifest lengkap dan ikonnya ada dengan ukuran yang benar", () => {
  const m = JSON.parse(read("public/manifest.webmanifest"));
  assert.equal(m.display, "standalone");
  assert.equal(m.start_url, "/");
  for (const i of m.icons) {
    const [w, h] = i.sizes.split("x").map(Number);
    assert.ok(existsSync(new URL(`../public${i.src}`, import.meta.url)), i.src);
    assert.deepEqual(png(`public${i.src}`), { w, h });
  }
  assert.ok(m.icons.some((i) => i.purpose === "maskable" && i.sizes === "512x512"));
  assert.ok(m.icons.some((i) => i.purpose === "any" && i.sizes === "192x192"));
});

test("middleware tidak mengunci file yang dibutuhkan PWA, tapi tetap mengunci halaman", () => {
  const src = read("middleware.js");
  const matcher = src.match(/matcher:\s*\["([^"]+)"\]/)[1];
  const re = new RegExp(`^/${matcher.slice(2, -1)}$`); // buang pembungkus "/( ... )"
  for (const open of ["/manifest.webmanifest", "/sw.js", "/offline.html", "/icons/icon-192.png", "/icons/apple-touch-icon.png", "/login", "/logo.png"]) {
    assert.equal(re.test(open), false, `${open} harus terbuka`);
  }
  for (const locked of ["/", "/admin", "/api/request", "/api/admin/requests", "/thumbs/a.jpg"]) {
    assert.equal(re.test(locked), true, `${locked} harus terkunci`);
  }
});

test("service worker hanya menangani navigasi dan tidak menyimpan data", () => {
  const sw = read("public/sw.js");
  assert.match(sw, /addEventListener\("fetch"/);
  assert.match(sw, /mode !== "navigate"/);
  assert.equal(/cache\.put|addAll|\.put\(/.test(sw), false);
  assert.ok(existsSync(new URL("../public/offline.html", import.meta.url)));
});

test("restoreMap mengembalikan map ke posisi semula", () => {
  const s = { maps: [{ id: "a", name: "A", ids: [] }, { id: "b", name: "B", ids: ["x"] }, { id: "c", name: "C", ids: [] }] };
  const removed = s.maps[1];
  const after = removeMap(s, "b");
  assert.deepEqual(after.maps.map((m) => m.id), ["a", "c"]);
  assert.deepEqual(restoreMap(after, removed, 1).maps.map((m) => m.id), ["a", "b", "c"]);
  assert.deepEqual(restoreMap(after, removed, 99).maps.map((m) => m.id), ["a", "c", "b"]);
  assert.deepEqual(restoreMap(after, removed, -5).maps.map((m) => m.id), ["b", "a", "c"]);
});

test("restoreMap menolak nama kembar, id kembar, input kosong, dan jumlah penuh", () => {
  const s = { maps: [{ id: "a", name: "Plan", ids: [] }] };
  assert.equal(restoreMap(s, { id: "z", name: "plan", ids: [] }, 0), s);
  assert.equal(restoreMap(s, { id: "a", name: "Lain", ids: [] }, 0), s);
  assert.equal(restoreMap(s, null, 0), s);
  const full = { maps: Array.from({ length: 30 }, (_, i) => ({ id: `m${i}`, name: `M${i}`, ids: [] })) };
  assert.equal(restoreMap(full, { id: "n", name: "Baru", ids: [] }, 0), full);
});
