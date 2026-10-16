"use client";

import { useRef } from "react";
import Thumb from "./Thumb.jsx";
import { firstLine } from "../lib/browse.js";

export function PosterCard({ post, onOpen }) {
  const title = firstLine(post.caption, 60) || `@${post.username}`;
  return (
    <button type="button" className="card" onClick={() => onOpen(post)} aria-label={`${title}, dari ${post.username}`}>
      <Thumb src={post.thumb} className="card-img" />
      {post.kind !== "photo" && <span className="kind">{post.kind === "reel" ? "REEL" : post.kind.toUpperCase()}</span>}
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
      <h2 className="row-title">
        {onTitleClick ? (
          <button type="button" onClick={onTitleClick} title="Lihat semua">
            {title} <span aria-hidden="true">›</span>
          </button>
        ) : (
          title
        )}
      </h2>
      <div className="row-wrap">
        <button type="button" className="arrow left" onClick={() => slide(-1)} aria-label="Geser kiri">
          ‹
        </button>
        <div className="row-scroll" ref={scroller}>
          {posts.map((p) => (
            <PosterCard key={p.id} post={p} onOpen={onOpen} />
          ))}
        </div>
        <button type="button" className="arrow right" onClick={() => slide(1)} aria-label="Geser kanan">
          ›
        </button>
      </div>
    </section>
  );
}
