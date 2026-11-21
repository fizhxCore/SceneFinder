"use client";

import { useEffect, useState } from "react";
import { LABELS, LIMITS, statusClass } from "../lib/requests.js";
import { timeAgo } from "../lib/browse.js";

// Id acak per perangkat, hanya untuk mengenali request milik sendiri dan menghitung jatah harian.
function clientId() {
  try {
    let id = localStorage.getItem("sf_client");
    if (!/^[a-f0-9]{16,48}$/.test(id || "")) {
      id = [...crypto.getRandomValues(new Uint8Array(12))].map((x) => x.toString(16).padStart(2, "0")).join("");
      localStorage.setItem("sf_client", id);
    }
    return id;
  } catch {
    return "";
  }
}

export default function RequestPanel({ onClose }) {
  const [client, setClient] = useState("");
  const [list, setList] = useState([]);
  const [left, setLeft] = useState(null);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ ok: null, text: "" });

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const id = clientId();
    setClient(id);
    if (!id) {
      setMsg({ ok: false, text: "Penyimpanan browser dimatikan, request tidak bisa dikirim." });
      return;
    }
    let live = true;
    fetch(`/api/request?client=${id}`)
      .then((r) => r.json().then((d) => ({ r, d })))
      .then(({ r, d }) => {
        if (!live) return;
        if (r.ok) {
          setList(d.requests || []);
          setLeft(d.left);
        } else setMsg({ ok: false, text: d.error || "Gagal memuat." });
      })
      .catch(() => live && setMsg({ ok: false, text: "Tidak bisa terhubung ke server." }));
    return () => {
      live = false;
    };
  }, []);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg({ ok: null, text: "" });
    try {
      const res = await fetch("/api/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client, title, note }) });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setList((l) => [d.request, ...l]);
        setLeft(d.left);
        setTitle("");
        setNote("");
        setMsg({ ok: true, text: "Terkirim. Statusnya muncul di daftar di bawah." });
      } else setMsg({ ok: false, text: d.error || "Gagal mengirim." });
    } catch {
      setMsg({ ok: false, text: "Tidak bisa terhubung ke server." });
    }
    setBusy(false);
  }

  return (
    <>
      <div className="notif-scrim" onClick={onClose} aria-hidden="true" />
      <section className="notif" role="dialog" aria-modal="true" aria-label="Request scenepack">
        <span className="notif-grip" aria-hidden="true" />
        <div className="notif-head">
          <h2>Request scenepack</h2>
          <button type="button" className="notif-close" onClick={onClose} aria-label="Tutup" autoFocus>
            <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="notif-list rq-body">
          <form onSubmit={submit}>
            <label htmlFor="rq-title">Judul</label>
            <input id="rq-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={LIMITS.title} required placeholder="mis. nama drama atau aktor" autoComplete="off" />
            <label htmlFor="rq-note">Keterangan (opsional)</label>
            <textarea id="rq-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={LIMITS.note} placeholder="Tahun tayang, pemeran, atau akun yang biasanya buat" />
            <span className="rq-count">{note.length}/{LIMITS.note}</span>
            <button type="submit" className="rq-send" disabled={busy || !client || title.trim().length < 2}>
              {busy ? "Mengirim…" : "Kirim request"}
            </button>
            <p className="rq-hint">
              Batas {LIMITS.perClient} request per hari. Sisa hari ini: {left ?? "…"}
            </p>
            {msg.text && (
              <p className={msg.ok ? "rq-ok" : "rq-err"} role="status">
                {msg.text}
              </p>
            )}
          </form>
          {list.length > 0 && (
            <>
              <h3 className="notif-group rq-group">Request saya</h3>
              <ul className="rq-list">
                {list.map((r) => (
                  <li key={r.id} className="rq-item">
                    <span className="rq-main">
                      <strong>{r.title}</strong>
                      <small>{timeAgo(r.ts)}</small>
                    </span>
                    <span className={`st ${statusClass(r.status)}`}>{LABELS[r.status] || r.status}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
    </>
  );
}
