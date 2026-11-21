// Request scenepack: aturan isi, batas harian, dan bentuk data. Fungsi murni supaya bisa diuji.
export const STATUSES = ["menunggu", "dikerjakan", "selesai", "tidak bisa"];
export const LABELS = { menunggu: "Menunggu", dikerjakan: "Dikerjakan", selesai: "Selesai", "tidak bisa": "Tidak bisa" };
export const LIMITS = { perClient: 5, global: 100, title: 80, note: 300, stored: 300 };

export const isStatus = (s) => STATUSES.includes(s);
export const statusClass = (s) => `st-${s === "tidak bisa" ? "tidak" : s}`;
export const validClientId = (id) => /^[a-f0-9]{16,48}$/.test(String(id || ""));

// Satu baris, tanpa karakter kontrol, spasi dirapikan, dipotong sesuai batas.
const clean = (s, max) => String(s ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

export function validateRequest(body) {
  if (!validClientId(body?.client)) return { ok: false, error: "Sesi tidak dikenali. Muat ulang halaman." };
  const title = clean(body?.title, LIMITS.title);
  const note = clean(body?.note, LIMITS.note);
  if (title.length < 2) return { ok: false, error: "Judul minimal 2 huruf." };
  return { ok: true, title, note, client: body.client };
}

// Hari menurut WIB (UTC+7), dipakai untuk kunci batas harian.
export const dayKey = (now = Date.now()) => new Date(now + 7 * 3600_000).toISOString().slice(0, 10).replace(/-/g, "");

export function makeRequest({ title, note, client }, now = Date.now(), rand = Math.random) {
  const id = now.toString(36) + Math.floor(rand() * 36 ** 4).toString(36).padStart(4, "0");
  return { id, title, note, client, ts: now, status: "menunggu" };
}

// Bentuk yang boleh keluar ke browser: tanpa id klien.
export const publicView = (r) => ({ id: r.id, title: r.title, note: r.note, ts: r.ts, status: r.status });

// `client` dan `global` adalah hitungan hari ini setelah request ini dihitung.
export function rateVerdict({ client, global }, limits = LIMITS) {
  if (client > limits.perClient) return { ok: false, error: `Batas ${limits.perClient} request per hari sudah habis. Coba lagi besok.` };
  if (global > limits.global) return { ok: false, error: "Request hari ini sudah penuh. Coba lagi besok." };
  return { ok: true, left: Math.max(0, limits.perClient - client) };
}

// Hasil HGETALL dari Upstash berupa array datar [field, nilai, field, nilai, ...].
export function parseStored(flat) {
  const out = [];
  for (let i = 0; Array.isArray(flat) && i + 1 < flat.length; i += 2) {
    try {
      const r = JSON.parse(flat[i + 1]);
      if (r && typeof r.id === "string") out.push(r);
    } catch {
      /* baris rusak dilewati */
    }
  }
  return out.sort((a, b) => b.ts - a.ts);
}
