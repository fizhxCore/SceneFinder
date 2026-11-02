// Kunci sandi sederhana untuk web kecil. Cookie berisi "kedaluwarsa.tandatangan", ditandatangani HMAC
// dengan SITE_PASSWORD sebagai kunci, jadi mengganti sandi otomatis mengeluarkan semua orang.
// Hanya memakai Web Crypto (jalan di middleware Next.js maupun Node).
const enc = new TextEncoder();

export const COOKIE = "sf_auth";
export const MAX_AGE = 30 * 24 * 3600; // 30 hari, dalam detik

async function hmac(message, secret) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Bandingkan teks tanpa berhenti di karakter pertama yang beda.
export function safeEqual(a, b) {
  const x = String(a);
  const y = String(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x.charCodeAt(i) || 0) ^ (y.charCodeAt(i) || 0);
  return diff === 0;
}

export async function makeToken(secret, now = Date.now()) {
  const exp = now + MAX_AGE * 1000;
  return `${exp}.${await hmac(String(exp), secret)}`;
}

export async function verifyToken(token, secret, now = Date.now()) {
  if (!token || !secret) return false;
  const [exp, sig] = String(token).split(".");
  if (!/^\d+$/.test(exp || "") || !sig) return false;
  if (Number(exp) < now) return false;
  return safeEqual(sig, await hmac(exp, secret));
}
