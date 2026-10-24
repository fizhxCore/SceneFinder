"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Row, { PosterCard } from "./Row.jsx";
import Modal from "./Modal.jsx";
import Thumb from "./Thumb.jsx";
import { buildRows, categoriesOf, countBy, firstLine, searchPosts, timeAgo } from "../lib/browse.js";

const ICONS = {
  home: <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" /></>,
  fresh: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
  cats: <><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></>,
  creators: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></>,
};

function Icon({ name, size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

const TABS = [
  { id: "home", label: "Home", icon: "home" },
  { id: "search", label: "Cari", icon: "search", mobileOnly: true },
  { id: "new", label: "Terbaru", icon: "fresh" },
  { id: "cats", label: "Kategori", icon: "cats" },
  { id: "creators", label: "Kreator", icon: "creators" },
];

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
        <p className="hero-badges">
          <span className="badge badge-lime">Terbaru</span>
          <span className="badge">@{post.username}</span>
          {post.category && <span className="badge">{post.category}</span>}
          {post.ts > 0 && <span className="badge">{timeAgo(post.ts)}</span>}
        </p>
        <h1>{firstLine(post.caption, 90) || `Scene dari @${post.username}`}</h1>
        {chips.length > 0 && <p className="hero-tags">{chips.map((c) => `#${c}`).join("  ")}</p>}
        <div className="actions">
          <a className="btn btn-ink" href={post.url} target="_blank" rel="noopener noreferrer">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor" /></svg>
            Buka di Instagram
          </a>
          <button type="button" className="btn btn-mint" onClick={() => onOpen(post)}>
            Detail
          </button>
        </div>
      </div>
      <div className="hero-frame">
        <Thumb src={post.thumb} className="hero-poster" eager />
      </div>
    </section>
  );
}

export default function Browse() {
  const [state, setState] = useState({ status: "loading", posts: [], errors: [], sourceCount: 0, updatedAt: 0, checkedAt: 0 });
  const [view, setView] = useState("home");
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
          checkedAt: data.checkedAt || 0,
        });
      })
      .catch((e) => {
        if (e.name !== "AbortError") setState((s) => ({ ...s, status: "error", errors: [{ source: "jaringan", message: e.message }] }));
      });
    return () => ctrl.abort();
  }, []);

  // Tekan "/" untuk fokus ke kolom cari (desktop).
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
  const searching = query.trim().length > 0;
  const stale = state.checkedAt > 0 && Date.now() - state.checkedAt > 3 * 86400_000;

  const categories = useMemo(() => categoriesOf(posts), [posts]);
  const creators = useMemo(() => countBy(posts, (p) => [p.username]), [posts]);
  const rows = useMemo(() => buildRows(posts), [posts]);
  const hero = rows[0]?.posts[0];
  const results = useMemo(() => (searching ? searchPosts(posts, query) : []), [posts, query, searching]);
  const categoryPosts = useMemo(() => (category ? searchPosts(posts, "", { category }) : []), [posts, category]);
  const suggestions = useMemo(
    () => rows.filter((r) => r.id.startsWith("tag-")).map((r) => r.query).slice(0, 10),
    [rows]
  );
  const coverOf = useCallback((cat) => posts.find((p) => p.category.toLowerCase() === cat.toLowerCase())?.thumb, [posts]);
  const creatorCategory = useCallback((u) => posts.find((p) => p.username === u)?.category || "", [posts]);

  const toTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const go = useCallback((id) => {
    setView(id);
    setQuery("");
    setCategory("");
    setSelected(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  const close = useCallback(() => setSelected(null), []);
  const searchFor = useCallback((q) => {
    setQuery(q);
    setSelected(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const current = searching ? "search" : view;
  const grid = (list) => (
    <div className="grid">
      {list.map((p) => (
        <PosterCard key={p.id} post={p} onOpen={setSelected} />
      ))}
    </div>
  );

  return (
    <>
      <header className="nav">
        <a className="logo" href="/" onClick={(e) => { e.preventDefault(); go("home"); }}>
          <span className="logo-mark" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 16 16"><path d="M4 2.5v11l9-5.5z" fill="currentColor" /></svg>
          </span>
          Scene<span>Finder</span>
        </a>
        <nav className="nav-links" aria-label="Menu utama">
          {TABS.filter((t) => !t.mobileOnly).map((t) => (
            <button type="button" key={t.id} className={current === t.id ? "on" : ""} onClick={() => go(t.id)} aria-current={current === t.id ? "page" : undefined}>
              {t.label}
            </button>
          ))}
        </nav>
        <label className="search nav-search">
          <Icon name="search" size={18} />
          <input
            ref={input}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari judul, aktor, hashtag"
            aria-label="Cari scene"
            autoComplete="off"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Hapus pencarian">
              <svg width="10" height="10" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
            </button>
          )}
        </label>
      </header>

      <main>
        {status === "loading" && <Skeleton />}

        {status !== "loading" && posts.length === 0 && (
          <div className="state">
            <h2>{status === "error" ? "Data gagal dimuat" : "Belum ada scene"}</h2>
            <p>
              {status === "error"
                ? "Coba muat ulang halaman sebentar lagi."
                : "Worker di VPS belum mengisi data. Pastikan akun sudah terdaftar di akun.json lalu jalankan worker/scrape.mjs."}
            </p>
          </div>
        )}

        {posts.length > 0 && current === "home" && (
          <>
            {hero && <Hero post={hero} onOpen={setSelected} />}
            <div className="rows">
              {rows.map((r) => (
                <Row key={r.id} title={r.title} posts={r.posts} onOpen={setSelected} onTitleClick={r.query ? () => searchFor(r.query) : undefined} />
              ))}
            </div>
          </>
        )}

        {posts.length > 0 && current === "search" && (
          <section className="results">
            <label className="search page-search">
              <Icon name="search" size={20} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari judul, aktor, mood, hashtag"
                aria-label="Cari scene"
                autoComplete="off"
                autoFocus={view === "search"}
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} aria-label="Hapus pencarian">
                  <svg width="10" height="10" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
                </button>
              )}
            </label>
            {searching ? (
              <>
                <h2 className="row-title">{results.length} hasil untuk “{query.trim()}”</h2>
                {results.length === 0 ? (
                  <div className="state">
                    <p>Tidak ada scene yang cocok. Coba kata lain, atau cari lewat nama kreator dan hashtag.</p>
                  </div>
                ) : (
                  grid(results)
                )}
              </>
            ) : (
              <>
                <h2 className="row-title">Coba cari</h2>
                <div className="chips chips-lg">
                  {[...categories.map((c) => c.name), ...suggestions].map((c) => (
                    <button type="button" key={c} className="chip" onClick={() => searchFor(c)}>
                      {c}
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {posts.length > 0 && current === "new" && (
          <section className="results">
            <h2 className="row-title">Terbaru</h2>
            {grid(posts.slice(0, 60))}
          </section>
        )}

        {posts.length > 0 && current === "cats" && (
          <section className="results">
            {!category ? (
              <>
                <h2 className="row-title">Kategori</h2>
                <div className="cat-grid">
                  {categories.map((c) => (
                    <button type="button" key={c.name} className="cat-tile" onClick={() => { setCategory(c.name); toTop(); }}>
                      <Thumb src={coverOf(c.name)} className="cat-img" />
                      <span className="cat-name">{c.name}</span>
                      <span className="badge badge-lime">{c.n} scene</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h2 className="row-title head-back">
                  <button type="button" className="back" onClick={() => setCategory("")} aria-label="Kembali ke semua kategori">
                    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true"><path d="M11 3L5 9l6 6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                  {category}
                </h2>
                {grid(categoryPosts)}
              </>
            )}
          </section>
        )}

        {posts.length > 0 && current === "creators" && (
          <section className="results">
            <h2 className="row-title">Kreator</h2>
            <div className="creator-grid">
              {creators.map((c) => (
                <button type="button" key={c.name} className="creator" onClick={() => searchFor(c.name)}>
                  <span className="avatar" aria-hidden="true">{c.name.slice(0, 1).toUpperCase()}</span>
                  <strong>@{c.name}</strong>
                  <small>
                    {c.n} scene{creatorCategory(c.name) ? `, ${creatorCategory(c.name)}` : ""}
                  </small>
                </button>
              ))}
            </div>
          </section>
        )}

        {status === "ready" && stale && (
          <p className="partial">Data belum diperbarui sejak {timeAgo(state.checkedAt)}. Scraper mungkin sedang bermasalah.</p>
        )}
      </main>

      <footer className="foot">
        <span>Hanya alat pencari. Semua thumbnail dan konten milik kreatornya, klik kartu untuk membuka postingan aslinya di Instagram.</span>
        {state.updatedAt > 0 && <span>Diperbarui {timeAgo(state.updatedAt)}</span>}
      </footer>

      <nav className="tabbar" aria-label="Menu utama">
        {TABS.map((t) => (
          <button type="button" key={t.id} className={current === t.id ? "on" : ""} onClick={() => go(t.id)} aria-current={current === t.id ? "page" : undefined}>
            <Icon name={t.icon} size={22} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <Modal post={selected} onClose={close} onSearch={searchFor} />
    </>
  );
}
