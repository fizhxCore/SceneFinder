// Logika arsip untuk worker VPS (murni, bisa dites tanpa jaringan).

// Gabungkan arsip lama dengan hasil scrape baru, kunci = id post.
// Post lama mempertahankan thumbnail lokalnya; metadata kategori/tag ikut akun.json terbaru.
export function mergeFeeds(existing = [], incoming = []) {
  const byId = new Map(existing.map((p) => [p.id, p]));
  const added = [];
  for (const p of incoming) {
    const old = byId.get(p.id);
    if (old) {
      byId.set(p.id, { ...old, category: p.category, tags: p.tags, caption: p.caption || old.caption });
    } else {
      byId.set(p.id, p);
      added.push(p.id);
    }
  }
  const posts = [...byId.values()].sort((a, b) => b.ts - a.ts);
  return { posts, added };
}

// Batasi ukuran arsip supaya repo tidak membengkak. Mengembalikan post yang dibuang.
export function pruneFeed(posts, max = 3000) {
  const sorted = [...posts].sort((a, b) => b.ts - a.ts);
  const manual = sorted.filter((p) => p.manual); // scene yang ditambah lewat halaman admin selalu dipertahankan
  const rest = sorted.filter((p) => !p.manual);
  const room = Math.max(max - manual.length, 0);
  const kept = [...manual, ...rest.slice(0, room)].sort((a, b) => b.ts - a.ts);
  return { kept, dropped: rest.slice(room) };
}

export const isRemote = (thumb) => /^https?:\/\//i.test(String(thumb || ""));
export const thumbPath = (id) => `/thumbs/${id}.webp`;

// Perlu commit hanya kalau ada post baru, atau sudah lewat `heartbeatMs` sejak pengecekan terakhir
// (supaya halaman bisa menampilkan "diperbarui" yang jujur tanpa commit tiap run).
export function shouldWrite({ added, dropped = 0, checkedAt = 0, now = Date.now(), heartbeatMs = 24 * 3600_000 }) {
  return added > 0 || dropped > 0 || now - checkedAt >= heartbeatMs;
}

// Batasi jumlah akun per run supaya kuota RapidAPI gratis tidak jebol. Akun dipilih bergilir
// (berdasarkan waktu, tanpa menyimpan state): tiap "slot" memilih `limit` akun berikutnya, lalu memutar.
// limit 0 = semua akun. slotMs sebaiknya sama dengan jarak antar run bot (default 24 jam).
export function pickAccounts(accounts, { limit = 0, now = Date.now(), slotMs = 24 * 3600_000 } = {}) {
  const n = accounts.length;
  const L = Math.floor(Number(limit) || 0);
  if (L <= 0 || L >= n) return [...accounts];
  const start = (Math.floor(now / slotMs) * L) % n;
  return Array.from({ length: L }, (_, i) => accounts[(start + i) % n]);
}

// Pilih `limit` akun berikutnya berdasarkan riwayat: yang paling lama berhasil diambil (atau belum pernah) didahulukan.
// Akun yang gagal berturut-turut (>= 2) digeser ke belakang antrean supaya tidak memakan jatah terus-menerus.
export function pickAccountsByState(accounts, state = {}, { limit = 0 } = {}) {
  const n = accounts.length;
  const L = Math.floor(Number(limit) || 0);
  if (L <= 0 || L >= n) return [...accounts];
  const rank = (a) => {
    const s = state[String(a.username).toLowerCase()] || {};
    return (s.fails || 0) >= 2 ? s.lastTry || 0 : s.lastOk || 0;
  };
  return accounts
    .map((a, i) => ({ a, i, r: rank(a) }))
    .sort((x, y) => x.r - y.r || x.i - y.i)
    .slice(0, L)
    .map((x) => x.a);
}

export function updateAccountState(state = {}, attempted = [], failedKeys = new Set(), now = Date.now()) {
  const next = { ...state };
  for (const a of attempted) {
    const k = String(a.username).toLowerCase();
    const prev = next[k] || {};
    next[k] = failedKeys.has(k) ? { lastOk: prev.lastOk || 0, lastTry: now, fails: (prev.fails || 0) + 1 } : { lastOk: now, lastTry: now, fails: 0 };
  }
  return next;
}
