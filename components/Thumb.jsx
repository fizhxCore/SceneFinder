"use client";

import { useRef, useState } from "react";

// Gambar dari CDN Instagram. URL-nya kedaluwarsa, jadi kalau gagal tampilkan placeholder, bukan ikon rusak.
export default function Thumb({ src, alt = "", className = "", eager = false }) {
  // 0 = alamat utama (repo gambar), 1 = berkas lama di repo, 2 = ulang alamat utama setelah jeda, 3 = gagal
  const [stage, setStage] = useState(0);
  const nonce = useRef(Date.now());
  const base = (process.env.NEXT_PUBLIC_THUMB_BASE || "").replace(/\/$/, "");
  const remote = Boolean(base) && String(src || "").startsWith("/thumbs/");
  if (!src || stage === 3) {
    return (
      <div className={`thumb-fallback ${className}`} aria-hidden="true">
        <svg width="30" height="30" viewBox="0 0 16 16"><path d="M4 2.5v11l9-5.5z" fill="currentColor" /></svg>
      </div>
    );
  }
  const shown = !remote ? src : stage === 1 ? src : stage === 2 ? `${base}${src}?r=${nonce.current}` : base + src;
  const onError = () => {
    if (!remote) return setStage(3);
    if (stage === 0) return setStage(1);
    if (stage === 1) return void setTimeout(() => setStage(2), 4000); // situs gambar mungkin baru terbit
    setStage(3);
  };
  return (
    <img
      className={className}
      src={shown}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : undefined}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={onError}
    />
  );
}
