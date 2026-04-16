import React, { useEffect, useMemo, useState } from "react";
import { fetchPlannedUpcoming, syncSelectedShows } from "./api/client";

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
  const [shows, setShows] = useState([]);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("upcoming");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState("");

  async function loadShows() {
    setError("");

    try {
      const data = await fetchPlannedUpcoming();
      const incoming = Array.isArray(data.shows) ? data.shows : [];

      const normalized = incoming.map((show, index) => ({
        id: show.malId || show.id || index + 1,
        malId: show.malId || null,
        title: show.title || "Unknown title",
        titleJp: show.titleJp || "",
        season: show.season || "Unknown season",
        premiereDate: show.premiereDate || "Unknown",
        broadcast: show.broadcast || "Unknown",
        episodes: show.episodes || 0,
        duration: show.duration || 24,
        status: show.status || "planned",
        upcoming: show.upcoming !== false,
        selected: show.selected ?? true,
        synced: show.synced ?? false,
        image: show.image || "https://placehold.co/640x360?text=Anime+Poster",
        confidence: show.confidence || "Imported from backend"
      }));

      setShows(normalized);
      setLastRefresh(new Date().toLocaleString());
    } catch (err) {
      setError(err.message || "Failed to load shows");
    }
  }

  useEffect(() => {
    async function init() {
      setLoading(true);
      await loadShows();
      setLoading(false);
    }

    init();
  }, []);

  const filtered = useMemo(() => {
    return shows.filter((show) => {
      const q = query.toLowerCase().trim();

      const matchesQuery =
        !q ||
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

  async function handleRefresh() {
    setRefreshing(true);
    await loadShows();
    setRefreshing(false);
  }

  async function handleSyncSelected() {
    const selectedShows = shows.filter((show) => show.selected);

    if (selectedShows.length === 0) {
      setError("No shows selected to sync.");
      return;
    }

    setError("");
    setSyncing(true);

    try {
      await syncSelectedShows(selectedShows);

      setShows((prev) =>
        prev.map((show) =>
          show.selected ? { ...show, synced: true } : show
        )
      );
    } catch (err) {
      setError(err.message || "Failed to sync selected shows");
    } finally {
      setSyncing(false);
    }
  }

  async function handleSyncOne(show) {
    setError("");

    try {
      await syncSelectedShows([{ ...show, selected: true }]);

      setShows((prev) =>
        prev.map((item) =>
          item.id === show.id ? { ...item, synced: true, selected: true } : item
        )
      );
    } catch (err) {
      setError(err.message || `Failed to sync ${show.title}`);
    }
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
                  <button
                    className="button button-light"
                    onClick={handleRefresh}
                    disabled={refreshing || loading}
                  >
                    {refreshing ? "Refreshing..." : "Refresh from Jikan"}
                  </button>

                  <button
                    className="button button-primary"
                    onClick={handleSyncSelected}
                    disabled={syncing || loading}
                  >
                    {syncing ? "Syncing..." : "Sync selected"}
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

            {error && (
              <section className="panel">
                <p style={{ margin: 0, color: "#b91c1c", fontWeight: 600 }}>
                  {error}
                </p>
              </section>
            )}

            {loading ? (
              <section className="panel">
                <p style={{ margin: 0 }}>Loading anime from backend...</p>
              </section>
            ) : (
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
                        <button className="button button-outline">
                          View details
                        </button>
                        <button
                          className="button button-dark"
                          onClick={() => handleSyncOne(show)}
                        >
                          Queue sync
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            )}
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
                  <strong>{lastRefresh || "Not yet loaded"}</strong>
                </div>
                <div className="info-row">
                  <span>Last calendar sync</span>
                  <strong>{syncing ? "Sync in progress..." : "Waiting"}</strong>
                </div>
                <div className="info-row">
                  <span>Google auth</span>
                  <strong className="ok">Connected</strong>
                </div>

                <div className="progress-track">
                  <div
                    className="progress-bar"
                    style={{
                      width: shows.length
                        ? `${Math.round((syncedCount / shows.length) * 100)}%`
                        : "0%"
                    }}
                  />
                </div>

                <p className="small-copy">
                  {shows.length
                    ? `${Math.round((syncedCount / shows.length) * 100)}% of loaded shows are marked synced.`
                    : "No shows loaded yet."}
                </p>
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
