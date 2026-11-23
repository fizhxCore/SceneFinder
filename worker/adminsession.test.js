import test from "node:test";
import assert from "node:assert/strict";
import { makeToken } from "../lib/auth.js";
import { ADMIN_MAX_AGE, clientIp, hashIp, loginVerdict, makeAdminToken, verifyAdminToken } from "../lib/adminSession.js";

const KEY = "kunci-admin-rahasia-yang-panjang";
const NOW = 1_800_000_000_000;

test("token admin sah dan mengembalikan waktu kedaluwarsa 7 hari", async () => {
  const t = await makeAdminToken(KEY, NOW);
  assert.equal(await verifyAdminToken(t, KEY, NOW + 1000), NOW + ADMIN_MAX_AGE * 1000);
});

test("token ditolak kalau kedaluwarsa, diubah, atau kuncinya berganti", async () => {
  const t = await makeAdminToken(KEY, NOW);
  assert.equal(await verifyAdminToken(t, KEY, NOW + (ADMIN_MAX_AGE + 5) * 1000), 0);
  const [exp, sig] = t.split(".");
  assert.equal(await verifyAdminToken(`${Number(exp) + 99999}.${sig}`, KEY, NOW), 0);
  assert.equal(await verifyAdminToken(t, "kunci-lain", NOW), 0);
  assert.equal(await verifyAdminToken("", KEY, NOW), 0);
  assert.equal(await verifyAdminToken("abc.def", KEY, NOW), 0);
  assert.equal(await verifyAdminToken(t, "", NOW), 0);
});

test("cookie login situs tidak bisa dipakai sebagai sesi admin", async () => {
  const siteToken = await makeToken(KEY, NOW); // seandainya sandi situs sama dengan kunci admin
  assert.equal(await verifyAdminToken(siteToken, KEY, NOW), 0);
});

test("clientIp mengambil alamat pertama dan punya cadangan", () => {
  const h = (o) => ({ get: (k) => o[k] ?? null });
  assert.equal(clientIp(h({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" })), "1.2.3.4");
  assert.equal(clientIp(h({ "x-real-ip": "5.6.7.8" })), "5.6.7.8");
  assert.equal(clientIp(h({})), "tidak-diketahui");
});

test("hashIp konsisten, tidak memuat IP, dan beda untuk IP yang beda", async () => {
  const a = await hashIp("1.2.3.4", KEY);
  assert.equal(a, await hashIp("1.2.3.4", KEY));
  assert.notEqual(a, await hashIp("1.2.3.5", KEY));
  assert.equal(a.includes("1.2.3"), false);
  assert.equal(a.length, 24);
});

test("loginVerdict mengizinkan 5 percobaan lalu mengunci", () => {
  assert.deepEqual(loginVerdict(1), { ok: true, left: 4 });
  assert.deepEqual(loginVerdict(5), { ok: true, left: 0 });
  assert.deepEqual(loginVerdict(6), { ok: false });
});
