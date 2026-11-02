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
3. Deploy ke Vercel: import repo GitHub-nya, lalu isi env var `SITE_PASSWORD` (lihat "Kunci web"). Kunci RapidAPI hanya ada di GitHub, bukan di Vercel.

## Kunci web
Web ini dikunci dengan satu sandi bersama. Tanpa sandi, halaman, `/api/feed`, dan thumbnail tidak bisa dibuka.
- Di Vercel: **Settings > Environment Variables**, tambah `SITE_PASSWORD`, lalu Redeploy. Opsional `NEXT_PUBLIC_CONTACT` (email atau @IG) untuk teks "minta hapus" di footer.
- Teman cukup memasukkan sandi sekali; browser mengingat 30 hari. Mengganti `SITE_PASSWORD` mengeluarkan semua orang.
- Di produksi, kalau `SITE_PASSWORD` kosong web menolak semua akses (bukan terbuka). Di lokal (`npm run dev`) tanpa sandi web terbuka.
- Semua respons memakai `noindex`, dan `robots.txt` melarang semua crawler.
- **Jadikan repo GitHub private.** Kalau publik, siapa pun bisa membaca `data/feed.json` dan thumbnail langsung dari GitHub walau webnya terkunci.
- Sandi bersama tidak bisa mencabut akses satu orang saja; kalau perlu, ganti sandinya.

## Bot pengambil data (RapidAPI + GitHub Actions)
Instagram memblokir IP datacenter, jadi data diambil lewat API di RapidAPI. Botnya berupa workflow GitHub (`.github/workflows/scrape.yml`) yang jalan terjadwal, gratis, tanpa VPS:

1. Di RapidAPI, subscribe ke satu API scraper Instagram (paket gratis cukup untuk mulai). Buka tab **Endpoints**, catat tiga hal dari contoh kodenya: host, path endpoint "post/feed akun", dan nama parameter username.
2. Di GitHub repo: **Settings > Secrets and variables > Actions**. Isi secret `RAPIDAPI_KEY`. Kalau API-mu bukan bawaan, isi juga variable `RAPIDAPI_HOST`, `RAPIDAPI_PATH`, `RAPIDAPI_PARAM`.
3. Tab **Actions > Ambil scene baru > Run workflow** untuk tes pertama. Selanjutnya jalan sendiri tiap hari 08:00 WIB.

Alurnya: bot memanggil API per akun di `akun.json` (jeda antar akun), mengunduh thumbnail jadi webp 640px ke `public/thumbs/`, menggabungkan ke arsip `data/feed.json`, lalu commit. Vercel deploy otomatis tiap ada commit; `/api/feed` hanya membaca `data/feed.json`, jadi tidak ada panggilan API saat orang membuka web.

**Kuota.** Satu akun = satu panggilan per run. Panggilan per bulan = jumlah akun x run per hari x 30 (5 akun, sekali sehari = 150). Kalau kuota gratis lebih kecil dari itu, isi variable `RAPIDAPI_MAX_CALLS` (mis. 2) supaya tiap run hanya mengambil sebagian akun secara bergilir, dan samakan `ROTATE_EVERY_HOURS` dengan jarak antar run. Kalau kunci ditolak atau kuota habis (403/429), bot berhenti memanggil sisa akun di run itu dan data lama tidak ditimpa.

**Penting:** host/path/parameter bawaan di `.env.example` adalah tebakan umum dan belum diuji dengan API milikmu. Pencocokan field respons (`code`, `taken_at`, `thumbnail_url`, `caption.text`, dst) sengaja longgar. Kalau log menulis "Respons RapidAPI tidak dikenali", salin contoh JSON dari tab Endpoints dan sesuaikan `lib/rapidapi.js`.

### Tes lokal
```
cp .env.example .env     # isi RAPIDAPI_KEY
npm install
NO_GIT=1 node --env-file=.env worker/scrape.mjs
```

### VPS (opsional)
Cukup bila ingin jalan di server sendiri: `git clone`, `npm install`, buat `.env`, lalu cron `0 1 * * * /path/SceneFinder/worker/run.sh >> ~/scenefinder.log 2>&1`. Tanpa `RAPIDAPI_KEY`, worker kembali ke scraping langsung yang sering diblokir.

## Batasan yang perlu diketahui
- Akun private tidak bisa diambil.
- Satu panggilan biasanya hanya memberi post terbaru; arsip menumpuk seiring bot jalan. Arsip dibatasi `MAX_POSTS` (default 3000).
- Link post manual (teks berawalan `https://` di `akun.json`) diambil langsung dari halaman embed Instagram, bukan lewat RapidAPI, jadi bisa gagal di server yang diblokir.
- `lib/instagram.js` mengadaptasi `instagram.direct` dari scrapr (MIT, (c) coflyn).
