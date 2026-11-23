"use client";

import { useState } from "react";

export default function AdminForm() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState({ ok: null, msg: "" });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setState({ ok: null, msg: "" });
    try {
      const res = await fetch("/api/admin/add", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) return window.location.reload(); // sesi habis: kembali ke halaman masuk
      if (res.ok) {
        setUrl("");
        setState({ ok: true, msg: "Terkirim ke bot. Scene muncul sekitar 2–4 menit lagi. Kalau postingnya sudah ada, tidak ada yang berubah." });
      } else {
        setState({ ok: false, msg: data.error || "Gagal mengirim." });
      }
    } catch {
      setState({ ok: false, msg: "Tidak bisa terhubung ke server." });
    }
    setBusy(false);
  }

  return (
    <form className="ad-card" onSubmit={submit}>
      <h2>Tambah scene lewat link</h2>
      <p>Tempel link postingan Instagram. Bot akan mengambil gambar dan caption-nya, lalu scene muncul setelah bot selesai.</p>
      <label htmlFor="adm-url">Link postingan</label>
      <input id="adm-url" className="ad-input" type="url" inputMode="url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.instagram.com/p/…" autoComplete="off" />
      <button type="submit" className="ad-go" disabled={busy}>
        {busy ? "Mengirim…" : "Tambah"}
      </button>
      {state.msg && (
        <p className={state.ok ? "ad-ok" : "ad-err"} role="status">
          {state.msg}
        </p>
      )}
    </form>
  );
}
