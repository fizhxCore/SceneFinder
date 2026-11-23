"use client";

import { useEffect, useState } from "react";
import { LABELS, STATUSES, statusClass } from "../lib/requests.js";
import { timeAgo } from "../lib/browse.js";

const FILTERS = [["semua", "Semua"], ["menunggu", "Menunggu"], ["dikerjakan", "Dikerjakan"], ["selesai", "Selesai"]];

async function call(body) {
  const res = await fetch("/api/admin/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (res.status === 401) {
    window.location.reload(); // sesi habis: kembali ke halaman masuk
    throw new Error("Sesi admin habis.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Gagal.");
  return data;
}

export default function AdminRequests({ hidden = false, onCount }) {
  const [items, setItems] = useState(null);
  const [filter, setFilter] = useState("semua");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    try {
      const d = await call({ action: "list" });
      setItems(d.requests);
      onCount?.(d.requests.filter((r) => r.status === "menunggu").length);
      setErr("");
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function act(body) {
    setBusy(true);
    try {
      await call(body);
      await load();
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }

  const count = (s) => (items || []).filter((r) => s === "semua" || r.status === s).length;
  const shown = (items || []).filter((r) => filter === "semua" || r.status === filter);

  return (
    <section hidden={hidden} aria-label="Request masuk">
      {items === null && !err && <p className="ad-empty">Memuat…</p>}
      {err && <p className="ad-err ad-msg" role="status">{err}</p>}
      {items && (
        <>
          <div className="ad-chips" role="group" aria-label="Saring request">
            {FILTERS.map(([k, label]) => (
              <button type="button" key={k} className="ad-chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>
                {label} {count(k)}
              </button>
            ))}
          </div>
          {shown.length === 0 && <p className="ad-empty">{items.length === 0 ? "Belum ada request." : "Tidak ada request di saringan ini."}</p>}
          <ul className="ad-list">
            {shown.map((r) => (
              <li key={r.id} className="ad-req">
                <div className="ad-req-top">
                  <h3>{r.title}</h3>
                  <span className={`st ${statusClass(r.status)}`}>{LABELS[r.status]}</span>
                </div>
                {r.note && <p>{r.note}</p>}
                <small>{timeAgo(r.ts)}</small>
                <div className="ad-acts">
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
    </section>
  );
}
