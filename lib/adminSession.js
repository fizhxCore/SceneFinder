// Sesi admin: kunci diketik sekali di halaman masuk, lalu server memberi cookie bertanda tangan.
// Tanda tangan diturunkan dari ADMIN_KEY dengan awalan "admin:", jadi cookie login situs tidak bisa dipakai membuka admin,
// dan mengganti ADMIN_KEY otomatis mengeluarkan semua sesi. Hanya memakai Web Crypto.
import { safeEqual } from "./auth.js";

const enc = new TextEncoder();

export const ADMIN_COOKIE = "sf_admin";
export const ADMIN_MAX_AGE = 7 * 24 * 3600; // 7 hari, dalam detik
export const LOGIN_MAX_TRIES = 5;
export const LOGIN_WINDOW = 15 * 60; // 15 menit, dalam detik

async function hmac(message, secret) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function makeAdminToken(adminKey, now = Date.now()) {
  const exp = now + ADMIN_MAX_AGE * 1000;
  return `${exp}.${await hmac(`admin:${exp}`, adminKey)}`;
}

// Mengembalikan waktu kedaluwarsa (ms) kalau sah, atau 0 kalau tidak.
export async function verifyAdminToken(token, adminKey, now = Date.now()) {
  if (!token || !adminKey) return 0;
  const [exp, sig] = String(token).split(".");
  if (!/^\d+$/.test(exp || "") || !sig || Number(exp) < now) return 0;
  return safeEqual(sig, await hmac(`admin:${exp}`, adminKey)) ? Number(exp) : 0;
}

export async function isAdmin(req) {
  return Boolean(await verifyAdminToken(req.cookies.get(ADMIN_COOKIE)?.value, process.env.ADMIN_KEY));
}

export function clientIp(headers) {
  const forwarded = String(headers.get("x-forwarded-for") || "").split(",")[0].trim();
  return forwarded || String(headers.get("x-real-ip") || "").trim() || "tidak-diketahui";
}

// Alamat IP tidak disimpan mentah di Redis, hanya sidik jarinya.
export async function hashIp(ip, secret) {
  return (await hmac(`ip:${ip}`, secret)).slice(0, 24);
}

// `count` adalah jumlah percobaan di jendela ini, termasuk yang sekarang.
export function loginVerdict(count, max = LOGIN_MAX_TRIES) {
  return count > max ? { ok: false } : { ok: true, left: Math.max(0, max - count) };
}
