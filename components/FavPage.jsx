"use client";

import { useMemo, useState } from "react";
import Thumb from "./Thumb.jsx";
import { PosterCard } from "./Row.jsx";

const TONES = ["f0", "f1", "f2", "f3"];

export default function FavPage({ posts, maps, onOpen }) {
  const [openId, setOpenId] = useState(null);
  const byId = useMemo(() => new Map(posts.map((p) => [p.id, p])), [posts]);
  const list = maps.state.maps;
  const open = list.find((m) => m.id === openId) || null;
  const scenesOf = (m) => m.ids.map((id) => byId.get(id)).filter(Boolean); // scene yang sudah terbuang dari feed tidak ditampilkan

  if (open) {
    const scenes = scenesOf(open);
    return (
      <section className="results fav-detail">
        <div className="fav-head">
          <button type="button" className="fav-back" onClick={() => setOpenId(null)} aria-label="Kembali ke daftar map">
            ←
          </button>
          <h2 className="row-title fav-title">{open.name}</h2>
        </div>
        <div className="fav-actions">
          <button type="button" className="chip" onClick={() => { const n = window.prompt("Nama baru untuk map ini", open.name); if (n) maps.rename(open.id, n); }}>
            Ganti nama
          </button>
          <button type="button" className="chip" onClick={() => { if (window.confirm(`Hapus map “${open.name}”? Scene-nya tidak ikut terhapus dari web.`)) { maps.remove(open.id); setOpenId(null); } }}>
            Hapus map
          </button>
        </div>
        {scenes.length === 0 ? (
          <div className="state">
            <p>Map ini masih kosong. Buka scene, ketuk bintang, lalu pilih map ini.</p>
          </div>
        ) : (
          <div className="grid">
            {scenes.map((p) => (
              <PosterCard key={p.id} post={p} onOpen={onOpen} />
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="results">
      <h2 className="row-title">Favorit</h2>
      {list.length === 0 ? (
        <div className="state">
          <p>Belum ada map. Buka sebuah scene dan ketuk bintang untuk menyimpannya ke map, misalnya “Edit minggu ini”.</p>
        </div>
      ) : (
        <div className="folders">
          {list.map((m, i) => {
            const scenes = scenesOf(m);
            return (
              <button type="button" key={m.id} className={`folder ${TONES[i % TONES.length]}`} onClick={() => setOpenId(m.id)} aria-label={`Buka map ${m.name}, ${scenes.length} scene`}>
                <span className="folder-head">
                  <span className="folder-main">
                    <span className="folder-name">{m.name}</span>
                    {scenes.length === 0 && <span className="folder-empty">Belum ada scene</span>}
                  </span>
                  <span className="folder-thumbs">
                    {scenes.slice(0, 3).map((p) => (
                      <span key={p.id} className="t">
                        <Thumb src={p.thumb} className="folder-img" />
                      </span>
                    ))}
                  </span>
                  <span className="folder-count">
                    {scenes.length}
                    <small>scene</small>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
