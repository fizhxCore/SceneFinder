"use client";

import { useEffect, useRef, useState } from "react";
import Thumb from "./Thumb.jsx";
import { firstLine, prettyTitle, timeAgo } from "../lib/browse.js";
import { extractLinks } from "../lib/links.js";

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

export default function Modal({ post, onClose, onSearch, saved = false, onSave }) {
  const closeBtn = useRef(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    if (!post) return;
    setOpen(false);
    setCopied("");
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
  // Judul diambil dari baris pertama caption; kalau baris itu sama persis dengan judul, jangan ditampilkan dua kali.
  const lines = caption.split("\n");
  const dup = lines.length > 1 && lines[0].trim().toLowerCase() === firstLine(post.caption, 90).toLowerCase();
  const body = dup ? lines.slice(1).join("\n").replace(/^\s+/, "") : caption;
  const links = extractLinks(caption);
  const copy = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied(""), 1800);
    } catch {
      /* tidak diizinkan: abaikan */
    }
  };
  const long = body.length > 220 || caption.split("\n").length > 5;

  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={`Detail scene dari ${post.username}`}>
        <span className="grab" aria-hidden="true" />
        <button type="button" className="close" onClick={onClose} ref={closeBtn} aria-label="Tutup">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
        </button>
        {onSave && (
          <button type="button" className="star" onClick={() => onSave(post)} aria-pressed={saved} aria-label={saved ? "Ubah map penyimpanan" : "Simpan ke map"}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.9z" />
            </svg>
          </button>
        )}
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
            <Linkified text={body} />
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
          {links.length > 0 && (
            <div className="links">
              {links.map((l) => (
                <div className="linkrow" key={l.url}>
                  <a className="cta cta-peach" href={l.url} target="_blank" rel="noopener noreferrer nofollow">
                    ↗ Buka {l.label}
                  </a>
                  <button type="button" className="copy" onClick={() => copy(l.url)}>
                    {copied === l.url ? "Tersalin" : "Salin"}
                  </button>
                </div>
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
