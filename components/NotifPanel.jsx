"use client";

import { useEffect, useMemo } from "react";
import Thumb from "./Thumb.jsx";
import { prettyTitle, timeAgo } from "../lib/browse.js";
import { groupPosts, isFresh } from "../lib/notif.js";

export default function NotifPanel({ posts, seenAt, onOpen, onClose, onMarkSeen }) {
  const groups = useMemo(() => groupPosts(posts, seenAt), [posts, seenAt]);
  const hasUnseen = groups[0]?.unseen === true;

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
      <section className="notif" role="dialog" aria-modal="true" aria-label="Notifikasi scene baru">
        <span className="notif-grip" aria-hidden="true" />
        <div className="notif-head">
          <h2>Notifikasi</h2>
          <button type="button" className="notif-mark" onClick={onMarkSeen} disabled={!hasUnseen}>
            Tandai semua dilihat
          </button>
          <button type="button" className="notif-close" onClick={onClose} aria-label="Tutup notifikasi" autoFocus>
            <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="notif-list">
          {groups.length === 0 && <p className="notif-empty">Belum ada scene.</p>}
          {groups.map((g) => (
            <div key={g.label}>
              <h3 className="notif-group">{g.label}</h3>
              {g.posts.map((p) => (
                <button type="button" key={p.id} className="n-item" onClick={() => onOpen(p)}>
                  <span className="n-thumb">
                    <Thumb src={p.thumb} className="n-img" />
                  </span>
                  <span className="n-info">
                    <strong>{prettyTitle(p.caption, 60) || `@${p.username}`}</strong>
                    <small>
                      @{p.username} · {timeAgo(p.ts)}
                    </small>
                  </span>
                  {isFresh(p) && <span className="n-new">BARU</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
