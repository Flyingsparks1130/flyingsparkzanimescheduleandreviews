import { useEffect, useRef } from "react";
import { Cover, StatusBadge } from "./ShowCard.jsx";
import { canSync, formatDate } from "../lib/library.js";
export default function ShowDetails({
  show,
  onClose,
  selected,
  onToggle,
  disabled,
}) {
  const dialog = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const element = dialog.current;
    element.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="details"
      aria-labelledby="detail-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === dialog.current) onClose();
      }}
    >
      <button
        className="detail-close secondary"
        onClick={onClose}
        autoFocus
        aria-label="Close details"
      >
        ✕
      </button>
      <div className="detail-layout">
        <Cover show={show} />
        <div>
          <StatusBadge status={show.status} />
          <h2 id="detail-title">{show.title}</h2>
          {show.titleJp && <p className="muted">{show.titleJp}</p>}
          <dl className="detail-facts">
            {[
              ["Premiere", formatDate(show.premiereDate)],
              ["Your score", show.score ? `${show.score} / 10` : "Unrated"],
              ["Episodes", show.episodes || "TBA"],
              ["Studio", show.studio || "Unknown"],
              ["Genres", show.genre || "Unknown"],
              ["Broadcast", show.broadcast || "Not announced"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="synopsis">
            {show.synopsis ||
              "A synopsis isn't available in this library entry. Open MyAnimeList for more information."}
          </p>
          <div className="button-row">
            {canSync(show) && (
              <button
                className="primary"
                disabled={disabled}
                onClick={() => onToggle(show.id)}
              >
                {selected ? "Remove from queue" : "Add to calendar queue"}
              </button>
            )}
            {!!show.malId && (
              <a
                className="secondary"
                href={`https://myanimelist.net/anime/${show.malId}`}
                target="_blank"
                rel="noreferrer"
              >
                MyAnimeList ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}
