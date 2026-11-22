"use client";

import { useEffect } from "react";

// Mendaftarkan service worker (hanya di produksi) supaya situs bisa dipasang ke layar utama.
export default function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* gagal mendaftar: situs tetap jalan, hanya tidak bisa dipasang */
    });
  }, []);
  return null;
}
