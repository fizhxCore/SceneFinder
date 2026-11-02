"use client";

import { useRef } from "react";
import Thumb from "./Thumb.jsx";
import { firstLine } from "../lib/browse.js";

export function PosterCard({ post, onOpen }) {
  const title = firstLine(post.caption, 60) || `@${post.username}`;
  return (
    <button type="button" className="card" onClick={() => onOpen(post)} aria-label={`${title}, dari ${post.username}`}>
      <span className="card-media">
        <Thumb src={post.thumb} className="card-img" />
        {post.kind !== "photo" && <span className="kind">{post.kind === "reel" ? "Reel" : post.kind === "carousel" ? "Slide" : "Video"}</span>}
      </span>
      <span className="card-info">
        <strong>{title}</strong>
        <small>@{post.username}</small>
      </span>
    </button>
  );
}

export default function Row({ title, posts, onOpen, onTitleClick }) {
  const scroller = useRef(null);
  const slide = (dir) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <section className="row" aria-label={title}>
      <div className="row-head">
        <h2 className="row-title">{title}</h2>
        {onTitleClick && (
          <button type="button" className="more" onClick={onTitleClick}>
            Lihat semua
          </button>
        )}
      </div>
      <div className="row-wrap">
        <button type="button" className="arrow left" onClick={() => slide(-1)} aria-label="Geser kiri">
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M11 3L5 9l6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="row-scroll" ref={scroller}>
          {posts.map((p) => (
            <PosterCard key={p.id} post={p} onOpen={onOpen} />
          ))}
        </div>
        <button type="button" className="arrow right" onClick={() => slide(1)} aria-label="Geser kanan">
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M7 3l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </section>
  );
}
