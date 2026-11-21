// Jelajah scene: memilih tumpukan kartu dan menilai arah geser. Semua fungsi murni supaya bisa diuji.
export const SKIP_MS = 7 * 86400_000; // scene yang dilewati muncul lagi setelah 7 hari
export const SWIPE_AT = 90; // jarak geser (px) yang dihitung sebagai keputusan

// Isi localStorage tidak dipercaya: buang yang kedaluwarsa atau bentuknya salah.
export function pruneSkipped(raw, now = Date.now()) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [id, t] of Object.entries(raw)) {
    if (typeof t === "number" && now - t < SKIP_MS) out[id] = t;
  }
  return out;
}

export function swipeDecision(dx, at = SWIPE_AT) {
  if (dx >= at) return "save";
  if (dx <= -at) return "skip";
  return null;
}

// Tumpukan acak: tanpa scene yang sudah tersimpan di map mana pun, tanpa yang baru dilewati, dan tanpa yang tidak punya gambar.
export function buildDeck(posts, { savedIds = new Set(), skipped = {}, now = Date.now(), size = 40, rand = Math.random } = {}) {
  const pool = posts.filter((p) => p && p.thumb && !savedIds.has(p.id) && !(now - (skipped[p.id] || 0) < SKIP_MS));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, size);
}
