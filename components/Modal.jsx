"use client";

import { useEffect, useRef } from "react";
import Thumb from "./Thumb.jsx";
import { timeAgo } from "../lib/browse.js";

// Caption bisa berisi link (mis. link unduhan dari kreator). Render sebagai link aman.
function Linkified({ text }) {
  const parts = String(text || "").split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow">
        {part}
      </a>
    ) : (
      part
    )
  );
}

export default function Modal({ post, onClose, onSearch }) {
  const closeBtn = useRef(null);

  useEffect(() => {
    if (!post) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [post, onClose]);

  if (!post) return null;
  const chips = [...new Set([...(post.tags || []), ...(post.hashtags || [])].map((t) => t.toLowerCase()))];

  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={`Detail scene dari ${post.username}`}>
        <button type="button" className="close" onClick={onClose} ref={closeBtn} aria-label="Tutup">
          ✕
        </button>
        <div className="modal-media">
          <Thumb src={post.thumb} className="modal-img" eager />
        </div>
        <div className="modal-body">
          <div className="meta-line">
            <strong>@{post.username}</strong>
            {post.category && <span className="pill">{post.category}</span>}
            <span>{post.kind === "reel" ? "Reel" : post.kind}</span>
            {post.ts > 0 && <span>{timeAgo(post.ts)}</span>}
          </div>
          <p className="caption">
            <Linkified text={post.caption || "(tanpa caption)"} />
          </p>
          {chips.length > 0 && (
            <div className="chips">
              {chips.map((c) => (
                <button type="button" key={c} className="chip" onClick={() => onSearch(c)}>
                  #{c}
                </button>
              ))}
            </div>
          )}
          <div className="actions">
            <a className="btn btn-primary" href={post.url} target="_blank" rel="noopener noreferrer">
              ▶ Buka di Instagram
            </a>
            <button type="button" className="btn" onClick={() => onSearch(post.username)}>
              Lainnya dari @{post.username}
            </button>
          </div>
          <p className="hint">Link scene pack / unduhan biasanya ada di caption atau bio kreator di postingan aslinya.</p>
        </div>
      </div>
    </div>
  );
}
