import { useMemo } from "react";
import { STATUS } from "../lib/library.js";
export default function Analytics({ shows, onOpen }) {
  const stats = useMemo(() => {
    const rated = shows.filter((show) => show.score > 0);
    const genres = new Map();
    for (const show of rated)
      for (const genre of show.genre
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)) {
        const group = genres.get(genre) || { total: 0, count: 0 };
        group.total += show.score;
        group.count++;
        genres.set(genre, group);
      }
    return {
      rated,
      average: rated.length
        ? (
            rated.reduce((sum, show) => sum + show.score, 0) / rated.length
          ).toFixed(1)
        : "—",
      genres: [...genres]
        .map(([name, group]) => ({
          name,
          ...group,
          average: group.total / group.count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
      top: [...rated]
        .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
        .slice(0, 5),
      distribution: Array.from(
        { length: 10 },
        (_, i) =>
          rated.filter((show) => Math.round(show.score) === i + 1).length,
      ),
    };
  }, [shows]);
  return (
    <div className="analytics-grid">
      <section className="panel">
        <div className="section-heading">
          <h2>Your scores</h2>
          <span>{stats.rated.length} rated shows</span>
        </div>
        <div className="big-number">
          {stats.average}
          <small> / 10 average</small>
        </div>
        <div
          className="histogram"
          role="img"
          aria-label={`Score distribution: ${stats.distribution.map((count, i) => `${i + 1}: ${count}`).join(", ")}`}
        >
          {stats.distribution.map((count, i) => (
            <div key={i}>
              <span className="bar-count">{count || ""}</span>
              <div
                className="histogram-bar"
                style={{
                  height: `${Math.max(3, (count / Math.max(1, ...stats.distribution)) * 120)}px`,
                }}
              />
              <small>{i + 1}</small>
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="section-heading">
          <h2>Library breakdown</h2>
          <span>{shows.length} shows</span>
        </div>
        {Object.entries(STATUS).map(([key, meta]) => {
          const count = shows.filter((show) => show.status === key).length;
          return (
            <div className="stat-row" key={key}>
              <span>{meta.label}</span>
              <div className="stat-track">
                <i
                  style={{
                    width: `${(count / Math.max(1, shows.length)) * 100}%`,
                    background: meta.color,
                  }}
                />
              </div>
              <strong>{count}</strong>
            </div>
          );
        })}
      </section>
      <section className="panel">
        <div className="section-heading">
          <h2>Most watched genres</h2>
          <span>Rated titles only</span>
        </div>
        {stats.genres.length ? (
          stats.genres.map((genre) => (
            <div className="rank-row" key={genre.name}>
              <span>
                {genre.name}
                <small>{genre.count} rated shows</small>
              </span>
              <strong>
                {genre.average.toFixed(1)}
                <small>avg.</small>
              </strong>
            </div>
          ))
        ) : (
          <p className="muted">
            Genre insights will appear when your library includes genres and
            scores.
          </p>
        )}
      </section>
      <section className="panel">
        <div className="section-heading">
          <h2>Your highest rated</h2>
          <span>From your MAL scores</span>
        </div>
        {stats.top.length ? (
          stats.top.map((show, i) => (
            <button
              className="rank-row rank-button"
              key={show.id}
              onClick={() => onOpen(show)}
            >
              <span className="rank-index">0{i + 1}</span>
              <span>
                {show.title}
                <small>{show.year || "Year unknown"}</small>
              </span>
              <strong>★ {show.score}</strong>
            </button>
          ))
        ) : (
          <p className="muted">
            Rate a show on MyAnimeList, then refresh to see your favorites here.
          </p>
        )}
      </section>
    </div>
  );
}
