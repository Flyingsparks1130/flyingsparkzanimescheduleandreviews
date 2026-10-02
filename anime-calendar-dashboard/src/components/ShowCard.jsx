import { memo, useState } from "react";
import { STATUS, canSync, formatDate } from "../lib/library.js";

export function Cover({ show, className = "" }) {
  const [failed, setFailed] = useState("");
  return show.image && failed !== show.image ? (
    <img
      className={`cover ${className}`}
      src={show.image}
      alt=""
      loading="lazy"
      decoding="async"
      width="225"
      height="318"
      onError={() => setFailed(show.image)}
    />
  ) : (
    <div
      className={`cover cover-placeholder ${className}`}
      aria-label="Cover unavailable"
    >
      <span>飛</span>
      <small>{show.title}</small>
    </div>
  );
}
export function StatusBadge({ status }) {
  return (
    <span
      className="status-badge"
      style={{ "--status-color": STATUS[status].color }}
    >
      <i />
      {STATUS[status].label}
    </span>
  );
}
export default memo(function ShowCard({
  show,
  selected,
  onToggle,
  onOpen,
  disabled,
}) {
  return (
    <article className={`show-card${selected ? " is-selected" : ""}`}>
      <button
        className="cover-button"
        onClick={() => onOpen(show)}
        aria-label={`View ${show.title}`}
      >
        <Cover show={show} />
        {!!show.score && (
          <span className="score">
            <span aria-hidden="true">★</span> {show.score}
            <small>/10</small>
          </span>
        )}
        <span className="cover-open">View details ↗</span>
      </button>
      <div className="card-body">
        <StatusBadge status={show.status} />
        <h3>
          <button onClick={() => onOpen(show)}>{show.title}</button>
        </h3>
        <p className="card-meta">
          {show.year || "Year TBA"} <span>·</span>{" "}
          {show.episodes ? `${show.episodes} episodes` : "Episodes TBA"}
        </p>
        <p className="card-date">{formatDate(show.premiereDate)}</p>
        {canSync(show) && (
          <label className="queue-check">
            <input
              type="checkbox"
              aria-label={`Queue ${show.title} for calendar sync`}
              checked={selected}
              disabled={disabled}
              onChange={() => onToggle(show.id)}
            />
            <span>
              {selected ? "In calendar queue" : "Add to calendar queue"}
            </span>
          </label>
        )}
      </div>
    </article>
  );
});
