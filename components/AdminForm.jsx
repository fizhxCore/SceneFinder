"use client";

import { useEffect, useState } from "react";

export default function AdminForm() {
  const [key, setKey] = useState("");
  const [url, setUrl] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState({ ok: null, msg: "" });

  useEffect(() => {
    try {
      const k = sessionStorage.getItem("sf_admin");
      if (k) setKey(k);
    } catch {
      /* penyimpanan sesi tidak tersedia */
    }
  }, []);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setState({ ok: null, msg: "" });
    try {
      const res = await fetch("/api/admin/add", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, url }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        try {
          sessionStorage.setItem("sf_admin", key);
        } catch {
          /* abaikan */
        }
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
    <form className="login-card" onSubmit={submit}>
      <h1>Tambah scene</h1>
      <p>Tempel link postingan Instagram. Bot akan mengambil gambar dan caption-nya.</p>
      <div className="login-field">
        <label htmlFor="adm-url">Link postingan</label>
        <input id="adm-url" type="url" inputMode="url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.instagram.com/p/…" autoComplete="off" />
      </div>
      <div className="login-field">
        <label htmlFor="adm-key">Kunci admin</label>
        <span className="pw">
          <input id="adm-key" type={show ? "text" : "password"} required value={key} onChange={(e) => setKey(e.target.value)} placeholder="Kunci admin" autoComplete="off" />
          <button type="button" className="pw-toggle" onClick={() => setShow((v) => !v)} aria-pressed={show}>
            {show ? "Sembunyikan" : "Tampilkan"}
          </button>
        </span>
      </div>
      <button type="submit" className="cta cta-ink" disabled={busy}>
        {busy ? "Mengirim…" : "Tambah"}
      </button>
      {state.msg && (
        <p className={state.ok ? "admin-ok" : "login-err"} role="status">
          {state.msg}
        </p>
      )}
      <a className="admin-back" href="/">← Kembali ke beranda</a>
    </form>
  );
}
