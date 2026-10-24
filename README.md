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

## Cara kerja (versi VPS + GitHub)
- **VPS** menjalankan `worker/scrape.mjs`: scrape akun di `akun.json` (satu per satu, jeda acak), kecilkan thumbnail jadi webp 640px ke `public/thumbs/`, gabungkan ke arsip `data/feed.json`, lalu `git commit && git push`.
- **Vercel** deploy otomatis tiap ada push. `/api/feed` hanya membaca `data/feed.json` yang ikut ter-build, jadi tidak ada scrape saat runtime. VPS mati = data terakhir tetap tampil.
- Aman: kalau semua sumber gagal (IP diblokir) data lama tidak ditimpa. Commit hanya bila ada post baru, plus satu "detak" per 24 jam supaya penanda "Diperbarui" jujur. Arsip dibatasi `MAX_POSTS` (default 3000).

## Setup VPS
1. `git clone` repo (pakai deploy key khusus repo ini yang punya akses write), lalu `npm install`.
2. Tes sekali tanpa push: `NO_GIT=1 npm run scrape`.
3. Jadwalkan di cron (tiap 4 jam): `0 */4 * * * /path/SceneFinder/worker/run.sh >> ~/scenefinder.log 2>&1`

## Batasan yang perlu diketahui
- IP VPS juga bisa diblokir Instagram. Kalau log menunjukkan "meminta login", pertimbangkan proxy residential atau jeda lebih panjang.
- Endpoint profil hanya memberi ±12 post terbaru per akun; arsip menumpuk seiring worker jalan.
- `lib/instagram.js` mengadaptasi `instagram.direct` dari scrapr (MIT, (c) coflyn).
