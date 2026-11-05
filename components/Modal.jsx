"use client";

import { useEffect, useRef, useState } from "react";
import Thumb from "./Thumb.jsx";
import { prettyTitle, timeAgo } from "../lib/browse.js";

function shortLink(u) {
  try {
    const x = new URL(u);
    const first = x.pathname.split("/").filter(Boolean)[0];
    return x.hostname.replace(/^www\./, "") + (first ? `/${first}` : "");
  } catch {
    return u;
  }
}

// Link di caption jadi tombol pendek (mis. "mega.nz/folder"), bukan URL penuh.
function Linkified({ text }) {
  const parts = String(text || "").split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} className="linkpill" href={part} target="_blank" rel="noopener noreferrer nofollow">
        ↗ {shortLink(part)}
      </a>
    ) : (
      part
    )
  );
}

// Hashtag dibaca ulang dari caption tanpa URL, supaya potongan kunci link tidak jadi "tag".
const tagsFrom = (c) => (String(c || "").replace(/https?:\/\/\S+/g, " ").match(/#[\p{L}\p{N}_]+/gu) || []).map((h) => h.slice(1).toLowerCase());

export default function Modal({ post, onClose, onSearch }) {
  const closeBtn = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!post) return;
    setOpen(false);
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
  const chips = [...new Set([...(post.tags || []).map((t) => t.toLowerCase()), ...tagsFrom(post.caption)])];
  const caption = post.caption || "(tanpa caption)";
  const long = caption.length > 220 || caption.split("\n").length > 5;

  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={`Detail scene dari ${post.username}`}>
        <span className="grab" aria-hidden="true" />
        <button type="button" className="close" onClick={onClose} ref={closeBtn} aria-label="Tutup">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
        </button>
        <div className="sheet-head">
          <div className="sheet-thumb"><Thumb src={post.thumb} className="modal-img" eager /></div>
          <div className="sheet-info">
            <h2 className="sheet-title">{prettyTitle(post.caption, 90) || `Scene dari @${post.username}`}</h2>
            <strong className="sheet-by">@{post.username}</strong>
            <div className="meta-line">
              {post.category && <span className="tag tag-peach">{post.category}</span>}
              <span className="tag">{post.kind === "reel" ? "Reel" : post.kind}</span>
              {post.ts > 0 && <span className="tag">{timeAgo(post.ts)}</span>}
            </div>
          </div>
        </div>
        <div className="modal-body">
          <p className={`caption${open ? "" : " clamp"}`}>
            <Linkified text={caption} />
          </p>
          {long && (
            <button type="button" className="readmore" onClick={() => setOpen((v) => !v)}>
              {open ? "Lebih sedikit" : "Selengkapnya"}
            </button>
          )}
          {chips.length > 0 && (
            <div className="chips">
              {chips.map((c) => (
                <button type="button" key={c} className="chip" onClick={() => onSearch(c)}>#{c}</button>
              ))}
            </div>
          )}
          <div className="actions">
            <a className="cta cta-peach" href={post.url} target="_blank" rel="noopener noreferrer">Buka di Instagram</a>
            <button type="button" className="cta cta-dark" onClick={() => onSearch(post.username)}>Lainnya dari @{post.username}</button>
          </div>
          <p className="hint">Link scene pack / unduhan biasanya ada di caption atau bio kreator di postingan aslinya.</p>
        </div>
      </div>
    </div>
  );
}
