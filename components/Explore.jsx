"use client";

import { useEffect, useRef, useState } from "react";
import Thumb from "./Thumb.jsx";
import { prettyTitle } from "../lib/browse.js";
import { isFresh } from "../lib/notif.js";
import { buildDeck, pruneSkipped, swipeDecision } from "../lib/swipe.js";

const SKIP_KEY = "sf_skipped_v1";

function readSkipped() {
  try {
    return pruneSkipped(JSON.parse(localStorage.getItem(SKIP_KEY) || "{}"));
  } catch {
    return {};
  }
}

function writeSkipped(obj) {
  try {
    localStorage.setItem(SKIP_KEY, JSON.stringify(obj));
  } catch {
    /* tidak tersimpan: scene yang dilewati bisa muncul lagi lebih cepat */
  }
}

const savedSet = (maps) => new Set(maps.state.maps.flatMap((m) => m.ids));
const still = { dx: 0, dy: 0, dragging: false };

export default function Explore({ posts, maps, onOpen, onClose }) {
  const skippedRef = useRef({});
  const [deck, setDeck] = useState(() => {
    skippedRef.current = readSkipped();
    return buildDeck(posts, { savedIds: savedSet(maps), skipped: skippedRef.current });
  });
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState([]);
  const [pick, setPick] = useState("");
  const [pos, setPos] = useState(still);
  const [exiting, setExiting] = useState(null);
  const [notice, setNotice] = useState("");
  const drag = useRef(null);
  const timer = useRef(null);
  const actRef = useRef(null);

  const list = maps.state.maps;
  const targetId = list.some((m) => m.id === pick) ? pick : list[0]?.id || "";
  const current = deck[index];

  useEffect(() => () => clearTimeout(timer.current), []);

  const commit = (dir) => {
    const post = deck[index];
    if (!post) return;
    if (dir === "save") {
      const id = targetId || maps.create("Jelajah");
      if (!id) {
        setNotice("Map sudah penuh, hapus satu map dulu.");
        setPos(still);
        setExiting(null);
        return;
      }
      maps.toggle(id, post.id);
      setHistory((h) => [...h, { post, dir, mapId: id }]);
      setNotice(`Disimpan ke ${list.find((m) => m.id === id)?.name || "Jelajah"}`);
    } else {
      skippedRef.current = { ...skippedRef.current, [post.id]: Date.now() };
      writeSkipped(skippedRef.current);
      setHistory((h) => [...h, { post, dir }]);
      setNotice("Dilewati");
    }
    setIndex((i) => i + 1);
    setPos(still);
    setExiting(null);
  };

  const act = (dir) => {
    if (!current || exiting) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return commit(dir);
    setExiting(dir);
    timer.current = setTimeout(() => commit(dir), 200);
  };
  actRef.current = act;

  const undo = () => {
    const last = history[history.length - 1];
    if (!last || exiting) return;
    if (last.dir === "save") {
      maps.toggle(last.mapId, last.post.id);
    } else {
      const rest = { ...skippedRef.current };
      delete rest[last.post.id];
      skippedRef.current = rest;
      writeSkipped(rest);
    }
    setHistory((h) => h.slice(0, -1));
    setIndex((i) => i - 1);
    setNotice("Dibatalkan");
  };

  const reshuffle = () => {
    skippedRef.current = readSkipped();
    setDeck(buildDeck(posts, { savedIds: savedSet(maps), skipped: skippedRef.current }));
    setIndex(0);
    setHistory([]);
    setPos(still);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (["SELECT", "INPUT"].includes(e.target?.tagName) || document.querySelector('[role="dialog"]')) return;
      if (e.key === "ArrowRight") actRef.current?.("save");
      else if (e.key === "ArrowLeft") actRef.current?.("skip");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const onDown = (e) => {
    if (!current || exiting) return;
    drag.current = { x: e.clientX, y: e.clientY, dx: 0, moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setPos({ dx: 0, dy: 0, dragging: true });
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    d.dx = dx;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) d.moved = true;
    setPos({ dx, dy, dragging: true });
  };
  const onUp = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    const verdict = swipeDecision(d.dx);
    if (verdict) act(verdict);
    else {
      setPos(still);
      if (!d.moved) onOpen(current);
    }
  };
  const onCancel = () => {
    drag.current = null;
    setPos(still);
  };

  const o = Math.min(1, Math.max(0, (Math.abs(pos.dx) - 30) / 60));
  const frontStyle = exiting
    ? { transform: `translateX(${exiting === "save" ? 520 : -520}px) rotate(${exiting === "save" ? 18 : -18}deg)` }
    : { transform: `translate(${pos.dx}px, ${pos.dy * 0.15}px) rotate(${pos.dx / 20}deg)` };
  const saveO = exiting === "save" ? 1 : pos.dx > 0 ? o : 0;
  const skipO = exiting === "skip" ? 1 : pos.dx < 0 ? o : 0;

  return (
    <section className="results ex">
      <div className="fav-head">
        <button type="button" className="fav-back" onClick={onClose} aria-label="Kembali ke Favorit">
          ←
        </button>
        <h2 className="row-title fav-title">Jelajah scene</h2>
      </div>

      <div className="ex-bar">
        <label className="ex-pick">
          <span>Simpan ke</span>
          <select
            value={targetId || "__none"}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "__new") {
                const n = window.prompt("Nama map baru");
                const id = n ? maps.create(n) : null;
                if (id) setPick(id);
              } else setPick(v);
            }}
          >
            {list.length === 0 && <option value="__none">Jelajah (baru)</option>}
            {list.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
            <option value="__new">+ Map baru…</option>
          </select>
        </label>
        <button type="button" className="ex-undo" onClick={undo} disabled={history.length === 0}>
          Batalkan
        </button>
      </div>

      {current ? (
        <>
          <div className="ex-stage">
            {deck[index + 2] && (
              <div className="ex-card back2" aria-hidden="true">
                <Thumb src={deck[index + 2].thumb} className="ex-img" />
              </div>
            )}
            {deck[index + 1] && (
              <div className="ex-card back1" aria-hidden="true">
                <Thumb src={deck[index + 1].thumb} className="ex-img" />
              </div>
            )}
            <div
              className={`ex-card front${pos.dragging ? " drag" : ""}`}
              style={frontStyle}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onCancel}
              role="group"
              aria-label={`Scene ${index + 1} dari ${deck.length}`}
            >
              <Thumb src={current.thumb} className="ex-img" eager />
              <span className="ex-stamp save" style={{ opacity: saveO }} aria-hidden="true">SIMPAN</span>
              <span className="ex-stamp skip" style={{ opacity: skipO }} aria-hidden="true">LEWATI</span>
              {isFresh(current) && <span className="n-new ex-new">BARU</span>}
              <div className="ex-info">
                <strong>{prettyTitle(current.caption, 60) || `@${current.username}`}</strong>
                <small>
                  @{current.username}
                  {current.category ? ` · ${current.category}` : ""}
                </small>
              </div>
            </div>
          </div>

          <div className="ex-actions">
            <button type="button" className="ex-btn" style={{ width: 56, height: 56 }} onClick={() => act("skip")} aria-label="Lewati scene ini">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
            <button type="button" className="ex-btn" style={{ width: 48, height: 48 }} onClick={() => onOpen(current)} aria-label="Lihat detail scene">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
            </button>
            <button type="button" className="ex-btn save" style={{ width: 64, height: 64 }} onClick={() => act("save")} aria-label="Simpan scene ini ke map">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.9z" /></svg>
            </button>
          </div>
          <p className="ex-hint">Geser kanan untuk simpan, kiri untuk lewati · sisa {deck.length - index}</p>
        </>
      ) : (
        <div className="state">
          <p>{deck.length === 0 ? "Semua scene sudah kamu simpan atau lewati. Yang dilewati muncul lagi setelah 7 hari." : "Tumpukan habis."}</p>
          <button type="button" className="chip ex-again" onClick={reshuffle}>
            Kocok ulang
          </button>
        </div>
      )}
      <p className="sr-only" aria-live="polite">{notice}</p>
    </section>
  );
}
