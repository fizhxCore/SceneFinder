"use client";

import Thumb from "./Thumb.jsx";

export default function TopRow({ topics, onPick }) {
  if (topics.length === 0) return null;
  return (
    <section className="row" aria-label="Topik terbanyak">
      <div className="row-head">
        <h2 className="row-title">Topik terbanyak</h2>
      </div>
      <div className="row-wrap">
        <div className="row-scroll top-scroll">
          {topics.map((t, i) => (
            <button
              type="button"
              key={t.tag}
              className={`top-item${i >= 9 ? " wide" : ""}`}
              onClick={() => onPick(t.tag)}
              aria-label={`Peringkat ${i + 1}: #${t.tag}, ${t.count} scene`}
            >
              <span className="top-num" aria-hidden="true">{i + 1}</span>
              <span className="top-poster">
                <Thumb src={t.post.thumb} className="top-img" />
              </span>
              <span className="top-meta">
                <b>#{t.tag}</b>
                <small>{t.count} scene</small>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
