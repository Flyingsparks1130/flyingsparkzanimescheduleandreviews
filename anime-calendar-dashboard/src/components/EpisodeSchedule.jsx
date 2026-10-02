import { Cover, StatusBadge } from "./ShowCard.jsx";

export default function EpisodeSchedule({ entries, onOpen }) {
  return (
    <div className="schedule-list">
      {entries.map((entry, index) => (
        <div key={entry.id}>
          {(index === 0 || entries[index - 1].group !== entry.group) && (
            <h3 className="month-heading">
              {entry.day ? entry.label : `Expected · ${entry.label}`}
            </h3>
          )}
          <div className="schedule-row">
            <div className="schedule-date">
              <strong>{entry.day ? entry.day.slice(8) : "—"}</strong>
              <span>
                {entry.day
                  ? new Date(`${entry.day}T12:00:00`).toLocaleDateString(
                      undefined,
                      { weekday: "short" },
                    )
                  : "TBD"}
              </span>
            </div>
            <Cover show={entry.show} />
            <button
              className="schedule-title"
              onClick={() => onOpen(entry.show)}
            >
              {entry.show.title}
              <small>{entry.detail}</small>
            </button>
            <StatusBadge status={entry.show.status} />
          </div>
        </div>
      ))}
    </div>
  );
}
