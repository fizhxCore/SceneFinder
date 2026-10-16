# Scene Finder (Next.js + Vercel)

Pencari scene K-Drama / K-Pop untuk bahan edit, tampilan ala aplikasi streaming. **Tanpa database**: kamu cukup mendaftar akun Instagram kreator, aplikasi mengambil post terbaru mereka, menampilkan thumbnail langsung dari post, dan setiap kartu mengarah ke postingan aslinya di Instagram (tempat kreator biasanya menaruh link scene pack).

## Pakai

1. Edit satu file saja, `akun.json` di root. Isinya daftar sederhana:
   ```json
   [
     "akun_edit_kdrama",
     { "username": "akun_fancam", "category": "K-Pop", "tags": ["fancam"] },
     "https://www.instagram.com/reel/XXXXXXXX/"
   ]
   ```
   - Teks biasa = username akun (tanpa @). Teks berawalan `https://` = satu post tertentu.
   - `category` (opsional) jadi tab di navbar dan baris di halaman utama; `tags` ikut dicari.
2. `npm install && npm run dev` untuk lokal, `npm test` untuk tes logika.
3. Deploy ke Vercel: import repo GitHub-nya, tanpa env var apa pun.

## Cara kerja
- `GET /api/feed` mengambil semua sumber (paralel maksimal 4), menggabungkan dan membuang duplikat. Hasilnya di-cache CDN Vercel 1 jam (`s-maxage=3600`) dan data lama tetap dilayani saat diperbarui (`stale-while-revalidate`). Respons gagal total tidak dicache.
- Pencarian, filter kategori, dan baris (terbaru, kategori, hashtag populer, per kreator) dihitung di browser dari data itu.

## Batasan yang perlu diketahui
- **Instagram sering memblokir IP datacenter, termasuk Vercel.** Kalau itu terjadi, halaman menampilkan galat per akun. Cadangan: jalankan di Pterodactyl (`npm run build && npm start`) atau pakai penyedia data pihak ketiga dengan mengganti `fetchAccountPosts` di `lib/instagram.js`.
- Endpoint profil hanya memberi **±12 post terbaru per akun**. Post lama bisa ditambah lewat `posts`.
- URL thumbnail Instagram kedaluwarsa dalam hitungan hari. Cache 1 jam membuatnya selalu segar; kalau gagal dimuat, kartu menampilkan placeholder.
- `lib/instagram.js` mengadaptasi `instagram.direct` dari scrapr (MIT, (c) coflyn) memakai `fetch`, jadi tidak ada dependensi tambahan selain Next/React.
