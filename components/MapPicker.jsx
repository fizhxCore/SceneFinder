"use client";

import { useEffect, useRef, useState } from "react";

const SUGGEST = ["Favorit", "Nanti dicek", "Untuk diedit"];

export default function MapPicker({ post, maps, onClose }) {
  const [name, setName] = useState("");
  const input = useRef(null);
  const empty = maps.state.maps.length === 0;

  useEffect(() => {
    if (!post) return;
    setName("");
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.stopPropagation(); // jangan ikut menutup sheet detail di belakangnya
      onClose();
    };
    document.addEventListener("keydown", onKey, true);
    if (empty) input.current?.focus();
    return () => document.removeEventListener("keydown", onKey, true);
  }, [post, onClose]);

  if (!post) return null;
  const inMaps = new Set(maps.mapsOf(post.id));

  const create = (e, preset) => {
    e?.preventDefault();
    const id = maps.create(preset ?? name);
    if (id) {
      if (!maps.mapsOf(post.id).includes(id)) maps.toggle(id, post.id);
      setName("");
    }
  };

  return (
    <div className="backdrop picker-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal picker" role="dialog" aria-modal="true" aria-label="Simpan ke map">
        <span className="grab" aria-hidden="true" />
        <h3 className="picker-title">Simpan ke…</h3>
        {!empty && (
          <ul className="picker-list">
            {maps.state.maps.map((m) => (
              <li key={m.id}>
                <button type="button" className={`picker-row${inMaps.has(m.id) ? " on" : ""}`} onClick={() => maps.toggle(m.id, post.id)} aria-pressed={inMaps.has(m.id)}>
                  <span className="picker-name">{m.name}</span>
                  <span className="picker-count">{m.ids.length}</span>
                  <span className="picker-mark" aria-hidden="true">{inMaps.has(m.id) ? "✓" : "+"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {empty && (
          <div className="chips">
            {SUGGEST.map((s) => (
              <button type="button" key={s} className="chip" onClick={(e) => create(e, s)}>
                {s}
              </button>
            ))}
          </div>
        )}
        <form className="picker-new" onSubmit={create}>
          <input ref={input} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Map baru, mis. Edit minggu ini" aria-label="Nama map baru" autoComplete="off" />
          <button type="submit" className="cta cta-ink" disabled={!name.trim()}>
            Buat
          </button>
        </form>
        <button type="button" className="cta cta-dark" onClick={onClose}>
          Selesai
        </button>
      </div>
    </div>
  );
}
