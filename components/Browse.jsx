"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Row, { PosterCard } from "./Row.jsx";
import Modal from "./Modal.jsx";
import Thumb from "./Thumb.jsx";
import { buildRows, categoriesOf, firstLine, searchPosts, timeAgo } from "../lib/browse.js";

function Skeleton() {
  return (
    <div className="skeleton" aria-busy="true" aria-label="Memuat">
      {[0, 1, 2].map((r) => (
        <div key={r} className="sk-row">
          <div className="sk-title" />
          <div className="sk-cards">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="sk-card" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Hero({ post, onOpen }) {
  const chips = [...new Set([...(post.tags || []), ...(post.hashtags || [])])].slice(0, 4);
  return (
    <section className="hero">
      <Thumb src={post.thumb} className="hero-bg" eager />
      <div className="hero-shade" />
      <div className="hero-content">
        <span className="hero-label">TERBARU</span>
        <h1>{firstLine(post.caption, 90) || `Scene dari @${post.username}`}</h1>
        <p className="hero-meta">
          @{post.username}
          {post.category ? ` · ${post.category}` : ""}
          {post.ts ? ` · ${timeAgo(post.ts)}` : ""}
        </p>
        {chips.length > 0 && <p className="hero-tags">{chips.map((c) => `#${c}`).join("  ")}</p>}
        <div className="actions">
          <a className="btn btn-light" href={post.url} target="_blank" rel="noopener noreferrer">
            ▶ Buka di Instagram
          </a>
          <button type="button" className="btn btn-dim" onClick={() => onOpen(post)}>
            ⓘ Detail
          </button>
        </div>
      </div>
      <Thumb src={post.thumb} className="hero-poster" eager />
    </section>
  );
}

export default function Browse() {
  const [state, setState] = useState({ status: "loading", posts: [], errors: [], sourceCount: 0, updatedAt: 0 });
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState(null);
  const input = useRef(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/feed", { signal: ctrl.signal })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        setState({
          status: r.ok ? "ready" : "error",
          posts: data.posts || [],
          errors: data.errors || [],
          sourceCount: data.sourceCount || 0,
          updatedAt: data.updatedAt || 0,
        });
      })
      .catch((e) => {
        if (e.name !== "AbortError") setState((s) => ({ ...s, status: "error", errors: [{ source: "jaringan", message: e.message }] }));
      });
    return () => ctrl.abort();
  }, []);

  // Tekan "/" untuk fokus ke kolom cari.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" && !/input|textarea/i.test(document.activeElement?.tagName || "")) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const { posts, status } = state;
  const categories = useMemo(() => categoriesOf(posts), [posts]);
  const searching = query.trim().length > 0;
  const results = useMemo(() => (searching ? searchPosts(posts, query, { category }) : []), [posts, query, category, searching]);
  const rows = useMemo(() => buildRows(posts, { category }), [posts, category]);
  const hero = !searching ? rows[0]?.posts[0] : null;

  const close = useCallback(() => setSelected(null), []);
  const searchFor = useCallback((q) => {
    setQuery(q);
    setSelected(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <>
      <header className="nav">
        <a className="logo" href="/" onClick={(e) => { e.preventDefault(); setQuery(""); setCategory(""); }}>
          SCENE<span>FINDER</span>
        </a>
        <nav className="cats" aria-label="Kategori">
          <button type="button" className={!category ? "on" : ""} onClick={() => setCategory("")}>
            Semua
          </button>
          {categories.map((c) => (
            <button
              type="button"
              key={c.name}
              className={category.toLowerCase() === c.name.toLowerCase() ? "on" : ""}
              onClick={() => setCategory(c.name)}
            >
              {c.name}
            </button>
          ))}
        </nav>
        <label className="search">
          <span aria-hidden="true">⌕</span>
          <input
            ref={input}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Judul, aktor, mood, hashtag…  ( / )"
            aria-label="Cari scene"
            autoComplete="off"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Hapus pencarian">
              ✕
            </button>
          )}
        </label>
      </header>

      <main>
        {status === "loading" && <Skeleton />}

        {status !== "loading" && posts.length === 0 && (
          <div className="state">
            <h2>{status === "error" ? "Gagal mengambil data dari Instagram" : "Belum ada sumber"}</h2>
            {state.sourceCount === 0 && status !== "error" ? (
              <p>
                Isi <code>akun.json</code> dengan username akun IG yang mau di-scrape, lalu deploy ulang.
              </p>
            ) : (
              <>
                <p>
                  Instagram sering memblokir permintaan dari server (termasuk Vercel). Detail per sumber:
                </p>
                <ul>
                  {state.errors.map((e, i) => (
                    <li key={i}>
                      <code>{e.source}</code> — {e.message}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {posts.length > 0 && !searching && (
          <>
            {hero && <Hero post={hero} onOpen={setSelected} />}
            <div className={`rows ${hero ? "after-hero" : ""}`}>
              {rows.map((r) => (
                <Row
                  key={r.id}
                  title={r.title}
                  posts={r.posts}
                  onOpen={setSelected}
                  onTitleClick={r.query ? () => searchFor(r.query) : undefined}
                />
              ))}
            </div>
          </>
        )}

        {posts.length > 0 && searching && (
          <section className="results">
            <h2 className="row-title">
              {results.length} hasil untuk “{query.trim()}”{category ? ` di ${category}` : ""}
            </h2>
            {results.length === 0 ? (
              <div className="state">
                <p>Tidak ada scene yang cocok. Coba kata lain, atau cari lewat nama kreator dan hashtag.</p>
              </div>
            ) : (
              <div className="grid">
                {results.map((p) => (
                  <PosterCard key={p.id} post={p} onOpen={setSelected} />
                ))}
              </div>
            )}
          </section>
        )}

        {status === "ready" && state.errors.length > 0 && (
          <p className="partial">
            {state.errors.length} dari {state.sourceCount} sumber gagal dimuat: {state.errors.map((e) => e.source).join(", ")}
          </p>
        )}
      </main>

      <footer className="foot">
        Hanya alat pencari. Semua thumbnail dan konten milik kreatornya, klik kartu untuk membuka postingan aslinya di Instagram.
      </footer>

      <Modal post={selected} onClose={close} onSearch={searchFor} />
    </>
  );
}
