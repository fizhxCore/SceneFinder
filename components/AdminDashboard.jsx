"use client";

import { useEffect, useState } from "react";
import AdminForm from "./AdminForm.jsx";
import AdminRequests from "./AdminRequests.jsx";

const fmt = (ms) => new Date(ms).toLocaleDateString("id-ID", { day: "numeric", month: "short" });

export default function AdminDashboard({ expiresAt }) {
  const [tab, setTab] = useState("tambah");
  const [waiting, setWaiting] = useState(0);
  const [until, setUntil] = useState("");

  // Diformat di browser supaya zona waktunya ikut perangkatmu.
  useEffect(() => setUntil(fmt(expiresAt)), [expiresAt]);

  return (
    <div className="ad">
      <header className="ad-head">
        <img src="/logo-sm.png" alt="" width="46" height="39" />
        <b>Admin</b>
        <form method="post" action="/api/admin/logout">
          <button type="submit" className="ad-out">
            Keluar
          </button>
        </form>
      </header>
      <p className="ad-session">Masuk sebagai admin{until ? ` · sesi sampai ${until}` : ""}</p>
      <div className="ad-tabs" role="tablist" aria-label="Menu admin">
        <button type="button" role="tab" className="ad-tab" aria-selected={tab === "tambah"} onClick={() => setTab("tambah")}>
          Tambah scene
        </button>
        <button type="button" role="tab" className="ad-tab" aria-selected={tab === "request"} onClick={() => setTab("request")}>
          Request{waiting > 0 && <i>{waiting}</i>}
        </button>
      </div>
      {tab === "tambah" && <AdminForm />}
      <AdminRequests hidden={tab !== "request"} onCount={setWaiting} />
    </div>
  );
}
