import test from "node:test";
import assert from "node:assert/strict";
import { makeToken, verifyToken, safeEqual, MAX_AGE } from "../lib/auth.js";

test("token: sah, salah sandi, dirusak, kedaluwarsa", async () => {
  const now = 1_700_000_000_000;
  const t = await makeToken("rahasia", now);
  assert.equal(await verifyToken(t, "rahasia", now + 1000), true);
  assert.equal(await verifyToken(t, "sandi-lain", now + 1000), false); // ganti sandi = semua keluar
  const [exp, sig] = t.split(".");
  assert.equal(await verifyToken(`${Number(exp) + 1}.${sig}`, "rahasia", now), false); // masa berlaku dipalsukan
  const flipped = sig.slice(0, -1) + (sig.endsWith("0") ? "1" : "0");
  assert.equal(await verifyToken(`${exp}.${flipped}`, "rahasia", now), false); // tanda tangan diubah
  assert.equal(await verifyToken(t, "rahasia", now + (MAX_AGE + 1) * 1000), false); // kedaluwarsa
  for (const bad of [undefined, "", "abc", "123.", ".abc", "x.y"]) assert.equal(await verifyToken(bad, "rahasia", now), false);
  assert.equal(await verifyToken(t, "", now), false);
});

test("safeEqual", () => {
  assert.equal(safeEqual("abc", "abc"), true);
  assert.equal(safeEqual("abc", "abd"), false);
  assert.equal(safeEqual("abc", "abcd"), false);
  assert.equal(safeEqual("", ""), true);
});
