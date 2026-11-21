"use client";

import { useEffect, useState } from "react";
import { LABELS, STATUSES, statusClass } from "../lib/requests.js";
import { timeAgo } from "../lib/browse.js";

async function call(key, body) {
  const res = await fetch("/api/admin/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, ...body }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Gagal.");
  return data;
}

export default function AdminRequests() {
  const [key, setKey] = useState("");
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function load(k = key) {
    setBusy(true);
    setErr("");
    try {
      const d = await call(k, { action: "list" });
      setItems(d.requests);
      try {
        sessionStorage.setItem("sf_admin", k);
      } catch {
        /* abaikan */
      }
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }

  useEffect(() => {
    try {
      const k = sessionStorage.getItem("sf_admin");
      if (k) {
        setKey(k);
        load(k);
      }
    } catch {
      /* penyimpanan sesi tidak tersedia */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function act(body) {
    setBusy(true);
    setErr("");
    try {
      await call(key, body);
      await load();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }

  const waiting = items ? items.filter((r) => r.status === "menunggu").length : 0;

  return (
    <section className="login-card adm-card" aria-label="Request masuk">
      <h1>Request masuk</h1>
      {items === null ? (
        <>
          <p>Masukkan kunci admin untuk melihat request scenepack.</p>
          <form className="adm-load" onSubmit={(e) => { e.preventDefault(); load(); }}>
            <input type="password" required value={key} onChange={(e) => setKey(e.target.value)} placeholder="Kunci admin" autoComplete="off" aria-label="Kunci admin" />
            <button type="submit" className="cta cta-ink" disabled={busy}>
              {busy ? "Memuat…" : "Muat"}
            </button>
          </form>
        </>
      ) : (
        <>
          <p>{items.length === 0 ? "Belum ada request." : `${items.length} request, ${waiting} menunggu.`}</p>
          <ul className="adm-list">
            {items.map((r) => (
              <li key={r.id} className="adm-req">
                <div className="adm-top">
                  <h3>{r.title}</h3>
                  <span className={`st ${statusClass(r.status)}`}>{LABELS[r.status]}</span>
                </div>
                {r.note && <p>{r.note}</p>}
                <small>{timeAgo(r.ts)}</small>
                <div className="adm-actions">
                  {STATUSES.filter((s) => s !== "menunggu").map((s) => (
                    <button type="button" key={s} aria-pressed={r.status === s} disabled={busy} onClick={() => act({ action: "status", id: r.id, status: s })}>
                      {LABELS[s]}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(`Hapus request "${r.title}"?`)) act({ action: "delete", id: r.id });
                    }}
                  >
                    Hapus
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      {err && <p className="login-err" role="status">{err}</p>}
    </section>
  );
}
