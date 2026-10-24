"use client";

import { useState } from "react";

// Gambar dari CDN Instagram. URL-nya kedaluwarsa, jadi kalau gagal tampilkan placeholder, bukan ikon rusak.
export default function Thumb({ src, alt = "", className = "", eager = false }) {
  const [bad, setBad] = useState(false);
  if (!src || bad) {
    return (
      <div className={`thumb-fallback ${className}`} aria-hidden="true">
        <svg width="30" height="30" viewBox="0 0 16 16"><path d="M4 2.5v11l9-5.5z" fill="currentColor" /></svg>
      </div>
    );
  }
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setBad(true)}
    />
  );
}
