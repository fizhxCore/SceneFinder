"use client";

import { useEffect } from "react";

export default function AboutPanel({ onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="notif-scrim" onClick={onClose} aria-hidden="true" />
      <section className="notif" role="dialog" aria-modal="true" aria-label="Tentang SceneFinder">
        <span className="notif-grip" aria-hidden="true" />
        <div className="notif-head">
          <h2>Tentang</h2>
          <button type="button" className="notif-close" onClick={onClose} aria-label="Tutup" autoFocus>
            <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="notif-list about-body">
          <h3>Akses khusus</h3>
          <p>Kalau kamu bisa membuka SceneFinder, berarti kamu dipilih langsung oleh owner. Tolong jaga aksesnya: jangan bagikan sandi atau tautannya ke orang lain.</p>
          <img className="about-img owner" src="/owner.png" alt="Akun owner: xyno! oemjii, @xynoxyz21" width="720" height="264" loading="lazy" />
          <p className="about-note">Akun owner yang sebenarnya.</p>

          <h3>Alat pencari</h3>
          <p>SceneFinder membantu menemukan scenepack. Gambar kecil hanya dipakai sebagai pratinjau; semua konten milik kreatornya. Tombol di setiap scene membuka postingan aslinya di Instagram. Tidak berafiliasi dengan Instagram atau Meta.</p>

          <h3>Panduan singkat</h3>
          <ul>
            <li>Cari lewat ikon kaca pembesar.</li>
            <li>Jelajahi lewat Kategori dan Kreator.</li>
            <li>Ketuk bintang di scene untuk simpan ke Favorit.</li>
            <li>Lonceng menunjukkan scene yang baru masuk.</li>
          </ul>

          <h3>Dukung proyek</h3>
          <p>SceneFinder gratis. Kalau terbantu, kamu bisa ikut membantu biaya domain dan server lewat QRIS. Sukarela.</p>
          <img className="about-img qris" src="/qris.jpg" alt="Kode QRIS untuk mendukung SceneFinder" width="200" height="200" loading="lazy" />
          <p className="about-note">Tekan lama untuk menyimpan, lalu unggah dari galeri di aplikasi bank atau e-wallet.</p>
        </div>
      </section>
    </>
  );
}
