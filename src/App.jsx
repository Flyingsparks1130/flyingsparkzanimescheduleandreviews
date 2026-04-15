import React, { useMemo, useState } from "react";

const mockShows = [
  {
    id: 1,
    title: "The Angel Next Door Spoils Me Rotten Season 2",
    titleJp: "お隣の天使様にいつの間にか駄目人間にされていた件 2期",
    season: "Spring 2026",
    premiereDate: "2026-04-03",
    broadcast: "Fridays · 10:30 PM JST",
    episodes: 13,
    duration: 23,
    status: "planned",
    upcoming: true,
    selected: true,
    synced: false,
    image: "https://placehold.co/640x360?text=Anime+Poster",
    confidence: "High match",
  },
  {
    id: 2,
    title: "Sousou no Frieren Season 2",
    titleJp: "葬送のフリーレン 第2期",
    season: "Fall 2026",
    premiereDate: "2026-10-10",
    broadcast: "Saturdays · 11:00 PM JST",
    episodes: 24,
    duration: 24,
    status: "planned",
    upcoming: true,
    selected: true,
    synced: true,
    image: "https://placehold.co/640x360?text=Anime+Poster",
    confidence: "High match",
  },
  {
    id: 3,
    title: "Dandadan Season 2",
    titleJp: "ダンダダン 第2期",
    season: "Summer 2026",
    premiereDate: "2026-07-04",
    broadcast: "Thursdays · 12:00 AM JST",
    episodes: 12,
    duration: 24,
    status: "planned",
    upcoming: true,
    selected: false,
    synced: false,
    image: "https://placehold.co/640x360?text=Anime+Poster",
    confidence: "Needs review",
  },
  {
    id: 4,
    title: "Blue Box Season 2",
    titleJp: "アオのハコ 第2期",
    season: "Winter 2027",
    premiereDate: "2027-01-09",
    broadcast: "Fridays · 11:30 PM JST",
    episodes: 12,
    duration: 24,
    status: "planned",
    upcoming: true,
    selected: false,
    synced: false,
    image: "https://placehold.co/640x360?text=Anime+Poster",
    confidence: "High match",
  },
];

function StatCard({ label, value, subtext }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-subtext">{subtext}</div>
    </div>
  );
}

export default function App() {
  const [shows, setShows] = useState(mockShows);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("upcoming");

  const filtered = useMemo(() => {
    return shows.filter((show) => {
      const q = query.toLowerCase();
      const matchesQuery =
        show.title.toLowerCase().includes(q) ||
        show.titleJp.toLowerCase().includes(q) ||
        show.season.toLowerCase().includes(q);

      const matchesTab =
        tab === "all"
          ? true
          : tab === "selected"
          ? show.selected
          : tab === "synced"
          ? show.synced
          : show.upcoming;

      return matchesQuery && matchesTab;
    });
  }, [shows, query, tab]);

  const selectedCount = shows.filter((s) => s.selected).length;
  const syncedCount = shows.filter((s) => s.synced).length;
  const queueCount = shows.filter((s) => s.selected && !s.synced).length;

  function toggleSelected(id) {
    setShows((prev) =>
      prev.map((show) =>
        show.id === id ? { ...show, selected: !show.selected } : show
      )
    );
  }

  function markSelectedSynced() {
    setShows((prev) =>
      prev.map((show) =>
        show.selected ? { ...show, synced: true } : show
      )
    );
  }

  return (
    <div className="app-shell">
      <div className="page-wrap">
        <div className="main-grid">
          <div className="left-column">
            <section className="hero-card">
              <div className="hero-tags">
                <span className="pill">Jikan planned list</span>
                <span className="pill">Upcoming anime</span>
                <span className="pill">Google Calendar sync</span>
              </div>

              <div className="hero-top">
                <div>
                  <h1>Anime Calendar Sync</h1>
                  <p className="hero-copy">
                    A GitHub Pages control panel for pulling future shows from
                    your planned list, reviewing matches, and syncing selected
                    series into Google Calendar.
                  </p>
                </div>

                <div className="hero-actions">
                  <button className="button button-light">
                    Refresh from Jikan
                  </button>
                  <button className="button button-primary" onClick={markSelectedSynced}>
                    Sync selected
                  </button>
                </div>
              </div>
            </section>

            <section className="stats-grid">
              <StatCard
                label="Shows selected"
                value={selectedCount}
                subtext="Currently queued for sync"
              />
              <StatCard
                label="Already synced"
                value={syncedCount}
                subtext="Mapped into Google Calendar"
              />
              <StatCard
                label="Pending jobs"
                value={queueCount}
                subtext="Ready for backend processing"
              />
            </section>

            <section className="panel">
              <div className="toolbar">
                <input
                  className="search-input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search title, JP title, or season"
                />

                <div className="tab-row">
                  <button
                    className={tab === "upcoming" ? "tab active" : "tab"}
                    onClick={() => setTab("upcoming")}
                  >
                    Upcoming
                  </button>
                  <button
                    className={tab === "selected" ? "tab active" : "tab"}
                    onClick={() => setTab("selected")}
                  >
                    Selected
                  </button>
                  <button
                    className={tab === "synced" ? "tab active" : "tab"}
                    onClick={() => setTab("synced")}
                  >
                    Synced
                  </button>
                  <button
                    className={tab === "all" ? "tab active" : "tab"}
                    onClick={() => setTab("all")}
                  >
                    All
                  </button>
                </div>
              </div>
            </section>

            <section className="cards-grid">
              {filtered.map((show) => (
                <article className="anime-card" key={show.id}>
                  <img className="anime-image" src={show.image} alt={show.title} />

                  <div className="anime-content">
                    <div className="anime-header">
                      <div>
                        <h2>{show.title}</h2>
                        <p className="jp-title">{show.titleJp}</p>
                      </div>

                      <span className={show.synced ? "status synced" : "status unsynced"}>
                        {show.synced ? "Synced" : "Not synced"}
                      </span>
                    </div>

                    <div className="pill-row">
                      <span className="pill">{show.season}</span>
                      <span className="pill">{show.episodes} eps</span>
                      <span className="pill">{show.duration} min</span>
                      <span className="pill">{show.confidence}</span>
                    </div>

                    <div className="info-box">
                      <div className="info-row">
                        <span>Premiere</span>
                        <strong>{show.premiereDate}</strong>
                      </div>
                      <div className="info-row">
                        <span>Broadcast</span>
                        <strong>{show.broadcast}</strong>
                      </div>
                      <div className="info-row">
                        <span>List status</span>
                        <strong>{show.status}</strong>
                      </div>
                    </div>

                    <label className="toggle-box">
                      <div>
                        <div className="toggle-title">Sync this show</div>
                        <div className="toggle-subtitle">
                          Include in the next calendar update
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={show.selected}
                        onChange={() => toggleSelected(show.id)}
                      />
                    </label>

                    <div className="card-actions">
                      <button className="button button-outline">View details</button>
                      <button className="button button-dark">Queue sync</button>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          </div>

          <div className="right-column">
            <section className="panel">
              <h3>Backend status</h3>
              <p className="panel-copy">
                First-pass view of your sync pipeline from planned list to Google Calendar.
              </p>

              <div className="status-box">
                <div className="info-row">
                  <span>Last Jikan refresh</span>
                  <strong>2 min ago</strong>
                </div>
                <div className="info-row">
                  <span>Last calendar sync</span>
                  <strong>Today · 9:12 PM</strong>
                </div>
                <div className="info-row">
                  <span>Google auth</span>
                  <strong className="ok">Connected</strong>
                </div>

                <div className="progress-track">
                  <div className="progress-bar" style={{ width: "72%" }} />
                </div>
                <p className="small-copy">
                  72% of selected shows have active calendar entries.
                </p>
              </div>

              <div className="activity-list">
                <div className="activity-item">
                  <strong>Frieren Season 2 synced</strong>
                  <span>24 episode placeholders created in Google Calendar</span>
                </div>
                <div className="activity-item">
                  <strong>Dandadan needs review</strong>
                  <span>Broadcast time confidence is low. Confirm before auto-creating events.</span>
                </div>
                <div className="activity-item">
                  <strong>Auto-select rule enabled</strong>
                  <span>Upcoming planned shows are pre-selected when the premiere date exists.</span>
                </div>
              </div>
            </section>

            <section className="panel">
              <h3>Suggested flow</h3>
              <p className="panel-copy">
                Clean first pass for your GitHub Pages plus backend setup.
              </p>

              <div className="flow-list">
                <div className="flow-item">
                  <strong>1. Pull planned list</strong>
                  <span>Backend reads your planned anime list and filters to future or not-yet-aired titles.</span>
                </div>
                <div className="flow-item">
                  <strong>2. Review upcoming titles</strong>
                  <span>Frontend shows candidate matches, premiere dates, and sync confidence.</span>
                </div>
                <div className="flow-item">
                  <strong>3. Queue calendar sync</strong>
                  <span>Selected entries are sent to an API endpoint that creates or updates Google Calendar events.</span>
                </div>
                <div className="flow-item">
                  <strong>4. Reconcile changes later</strong>
                  <span>A scheduled job can refresh premiere dates and repair mismatched events automatically.</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
