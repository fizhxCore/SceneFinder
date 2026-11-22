"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Thumb from "./Thumb.jsx";
import { PosterCard } from "./Row.jsx";
import Explore from "./Explore.jsx";
import MapMenu from "./MapMenu.jsx";

const TONES = ["f0", "f1", "f2", "f3"];

export default function FavPage({ posts, maps, onOpen }) {
  const [openId, setOpenId] = useState(null);
  const [exploring, setExploring] = useState(false);
  const [menuId, setMenuId] = useState(null);
  const [undo, setUndo] = useState(null);
  const undoTimer = useRef(null);
  const byId = useMemo(() => new Map(posts.map((p) => [p.id, p])), [posts]);
  const list = maps.state.maps;
  const open = list.find((m) => m.id === openId) || null;
  const menuMap = list.find((m) => m.id === menuId) || null;

  useEffect(() => () => clearTimeout(undoTimer.current), []);

  // Hapus langsung, lalu beri 6 detik untuk membatalkan. Tidak perlu kotak konfirmasi.
  const removeWithUndo = (m) => {
    const index = list.findIndex((x) => x.id === m.id);
    maps.remove(m.id);
    setUndo({ map: m, index });
    clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), 6000);
  };
  const undoRemove = () => {
    if (!undo) return;
    maps.restore(undo.map, undo.index);
    clearTimeout(undoTimer.current);
    setUndo(null);
  };
  const renameMap = (m) => {
    const n = window.prompt("Nama baru untuk map ini", m.name);
    if (n) maps.rename(m.id, n);
  };

  const scenesOf = (m) => m.ids.map((id) => byId.get(id)).filter(Boolean); // scene yang sudah terbuang dari feed tidak ditampilkan

  if (exploring) return <Explore posts={posts} maps={maps} onOpen={onOpen} onClose={() => setExploring(false)} />;

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
          <button type="button" className="chip" onClick={() => { removeWithUndo(open); setOpenId(null); }}>
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
      <button type="button" className="explore-btn" onClick={() => setExploring(true)}>
        Jelajah scene
      </button>
      {list.length === 0 ? (
        <div className="state">
          <p>Belum ada map. Buka sebuah scene dan ketuk bintang untuk menyimpannya ke map, misalnya “Edit minggu ini”.</p>
        </div>
      ) : (
        <div className="folders">
          {list.map((m, i) => {
            const scenes = scenesOf(m);
            return (
              <div key={m.id} className={`folder ${TONES[i % TONES.length]}`}>
                <button type="button" className="folder-open" onClick={() => setOpenId(m.id)} aria-label={`Buka map ${m.name}, ${scenes.length} scene`} />
                <span className="folder-head">
                  <span className="folder-main">
                    <span className="folder-name">{m.name}</span>
                    <span className="folder-sub">{scenes.length === 0 ? "Belum ada scene" : `${scenes.length} scene`}</span>
                  </span>
                  <span className="folder-thumbs">
                    {scenes.slice(0, 3).map((p) => (
                      <span key={p.id} className="t">
                        <Thumb src={p.thumb} className="folder-img" />
                      </span>
                    ))}
                  </span>
                  <button type="button" className="folder-more" onClick={() => setMenuId(m.id)} aria-label={`Menu map ${m.name}`}>
                    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h.01M12 12h.01M19 12h.01" /></svg>
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      )}
      {menuMap && (
        <MapMenu
          map={menuMap}
          onClose={() => setMenuId(null)}
          onRename={() => { setMenuId(null); renameMap(menuMap); }}
          onDelete={() => { setMenuId(null); removeWithUndo(menuMap); }}
        />
      )}
      {undo && (
        <div className="snack" role="status">
          <span>Map “{undo.map.name}” dihapus</span>
          <button type="button" onClick={undoRemove}>Batalkan</button>
        </div>
      )}
    </section>
  );
}
