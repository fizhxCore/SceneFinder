"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Row, { PosterCard } from "./Row.jsx";
import Modal from "./Modal.jsx";
import Thumb from "./Thumb.jsx";
import { buildRows, categoriesOf, countBy, firstLine, prettyTitle, searchPosts, timeAgo } from "../lib/browse.js";

const ICONS = {
  home: <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" /></>,
  fresh: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
  cats: <><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></>,
  creators: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></>,
  ext: <path d="M7 17L17 7M8 7h9v9" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
};

function Icon({ name, size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

const TABS = {
  home: { label: "Home", icon: "home" },
  search: { label: "Cari", icon: "search" },
  new: { label: "Terbaru", icon: "fresh" },
  cats: { label: "Kategori", icon: "cats" },
  creators: { label: "Kreator", icon: "creators" },
};

function Skeleton() {
  return (
    <div className="skeleton" aria-busy="true" aria-label="Memuat">
      {[0, 1, 2].map((r) => (
        <div key={r}>
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

function Dock({ current, go }) {
  return (
    <nav className="dock" aria-label="Menu utama">
      {["home", "new", "cats", "creators"].map((id) => (
        <button type="button" key={id} className={current === id ? "on" : ""} onClick={() => go(id)} aria-current={current === id ? "page" : undefined}>
          <Icon name={TABS[id].icon} size={22} />
          <span>{TABS[id].label}</span>
        </button>
      ))}
    </nav>
  );
}

function Hero({ post, onOpen }) {
  const [copied, setCopied] = useState(false);
  const chips = [...new Set([...(post.tags || []), ...(post.hashtags || [])])].slice(0, 4);

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ url: post.url, title: firstLine(post.caption, 60) || `@${post.username}` });
      } else {
        await navigator.clipboard.writeText(post.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      /* dibatalkan atau tidak diizinkan: tidak perlu pesan */
    }
  };

  return (
    <section className="hero">
      <div className="hero-copy">
        <p className="tag-line">
          <span className="tag tag-peach">@{post.username}</span>
          {post.category && <span className="tag tag-lilac">{post.category}</span>}
          {post.ts > 0 && <span className="tag">{timeAgo(post.ts)}</span>}
        </p>
        <h1>{prettyTitle(post.caption, 90) || `Scene dari @${post.username}`}</h1>
        {chips.length > 0 && <p className="hero-tags">{chips.map((c) => `#${c}`).join("  ")}</p>}
        <div className="trio">
          <a className="cta cta-peach" href={post.url} target="_blank" rel="noopener noreferrer">
            <Icon name="ext" size={18} />
            Buka di Instagram
          </a>
          <button type="button" className="orb" onClick={() => onOpen(post)} aria-label="Lihat detail" title="Detail">
            <Icon name="info" size={22} />
          </button>
          <button type="button" className="cta cta-white" onClick={share} aria-label={copied ? "Link tersalin" : "Bagikan"} title="Bagikan">
            <Icon name="link" size={18} />
            <span className="lbl">{copied ? "Tersalin" : "Bagikan"}</span>
          </button>
        </div>
      </div>
      <div className="hero-poster">
        <Thumb src={post.thumb} className="hero-img" eager />
      </div>
    </section>
  );
}

// Opsional: isi NEXT_PUBLIC_CONTACT di Vercel (mis. email atau @IG) supaya kreator tahu ke mana minta hapus.
const CONTACT = process.env.NEXT_PUBLIC_CONTACT || "";

const CLOSE_ICON = <svg width="10" height="10" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>;

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
  const rows = useMemo(() => {
    const seen = new Set();
    return buildRows(posts).filter((r) => {
      const key = r.posts.map((p) => p.id).join();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [posts]);
  const hero = rows[0]?.posts[0];
  const fresh = useMemo(() => posts.filter((p) => p.ts > Date.now() - 7 * 86400_000).length, [posts]);
  const results = useMemo(() => (searching ? searchPosts(posts, query) : []), [posts, query, searching]);
  const categoryPosts = useMemo(() => (category ? searchPosts(posts, "", { category }) : []), [posts, category]);
  const suggestions = useMemo(() => rows.filter((r) => r.id.startsWith("tag-")).map((r) => r.query).slice(0, 10), [rows]);
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
      <div className="page">
        <header className="top">
          <a className="logo" href="/" onClick={(e) => { e.preventDefault(); go("home"); }}>
            <img className="logo-img" src="/logo-sm.png" alt="" width="46" height="39" />
            SceneFinder
          </a>
          {posts.length > 0 && (
            <span className="count" title={`${posts.length} scene tersimpan`}>{fresh > 0 ? `${fresh} baru` : `${posts.length} scene`}</span>
          )}
          <button type="button" className="top-btn" onClick={() => go("search")} aria-label="Cari scene">
            <Icon name="search" size={20} />
          </button>
          <label className="search top-search">
            <Icon name="search" size={18} />
            <input ref={input} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari judul, aktor, hashtag" aria-label="Cari scene" autoComplete="off" />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Hapus pencarian">
                {CLOSE_ICON}
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
                  : "Bot belum mengisi data. Pastikan akun sudah terdaftar di akun.json lalu jalankan bot dari tab Actions di GitHub, atau npm run scrape."}
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
                    {CLOSE_ICON}
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
                        <span className="cat-media">
                          <Thumb src={coverOf(c.name)} className="cat-img" />
                        </span>
                        <span className="cat-meta">
                          <span className="cat-name">{c.name}</span>
                          <span className="tag">{c.n} scene</span>
                        </span>
                      </button>
                    ))}
                  </div>
                  <h2 className="row-title cat-after">Terbaru</h2>
                  {grid(posts.slice(0, 12))}
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
              <div className="panel">
                {creators.map((c) => (
                  <button type="button" key={c.name} className="creator" onClick={() => searchFor(c.name)}>
                    <span className="avatar" aria-hidden="true">{c.name.slice(0, 1).toUpperCase()}</span>
                    <span className="creator-name">
                      <strong>@{c.name}</strong>
                      {creatorCategory(c.name) && <small>{creatorCategory(c.name)}</small>}
                    </span>
                    <span className="creator-count">
                      {c.n}
                      <small>scene</small>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {status === "ready" && stale && (
            <p className="partial">Data belum diperbarui sejak {timeAgo(state.checkedAt)}. Bot pengambil data mungkin sedang bermasalah.</p>
          )}
        </main>

        <footer className="foot">
          <span>Hanya alat pencari. Semua thumbnail dan konten milik kreatornya, klik kartu untuk membuka postingan aslinya di Instagram.</span>
          {CONTACT && <span>Minta hapus postingan: {CONTACT}</span>}
          {state.updatedAt > 0 && <span>Diperbarui {timeAgo(state.updatedAt)}</span>}
        </footer>
      </div>

      <Dock current={current} go={go} />
      <Modal post={selected} onClose={close} onSearch={searchFor} />
    </>
  );
}
