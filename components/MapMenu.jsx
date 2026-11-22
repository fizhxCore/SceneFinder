"use client";

import { useEffect } from "react";

export default function MapMenu({ map, onRename, onDelete, onClose }) {
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
      <section className="notif map-menu" role="dialog" aria-modal="true" aria-label={`Menu map ${map.name}`}>
        <span className="notif-grip" aria-hidden="true" />
        <div className="notif-head">
          <h2>{map.name}</h2>
          <button type="button" className="notif-close" onClick={onClose} aria-label="Tutup" autoFocus>
            <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="map-menu-body">
          <button type="button" className="mm-row" onClick={onRename}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z" /></svg>
            Ganti nama
          </button>
          <button type="button" className="mm-row mm-danger" onClick={onDelete}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" /></svg>
            Hapus map
          </button>
          <p className="mm-note">Scene di dalam map tidak ikut terhapus dari web.</p>
        </div>
      </section>
    </>
  );
}
