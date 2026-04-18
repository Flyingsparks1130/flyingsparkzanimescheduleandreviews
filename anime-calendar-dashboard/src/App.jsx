import React, { useEffect, useMemo, useState } from "react";
import { fetchAnimeList, syncSelectedShows } from "./api/client";

function StatCard({ label, value, subtext }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-subtext">{subtext}</div>
    </div>
  );
}

function normalizeDateString(value) {
  if (!value) return null;
  if (/^\d{4}$/.test(value)) return `${value}-01-01`;
  if (/^\d{4}-\d{2}$/.test(value)) return `${value}-01`;
  return value;
}

function isUpcomingDate(value) {
  const normalized = normalizeDateString(value);
  if (!normalized) return false;
  const date = new Date(`${normalized}T00:00:00`);
  return !Number.isNaN(date.getTime()) && date.getTime() >= Date.now() - 24 * 60 * 60 * 1000;
}

function isWithinDays(value, days) {
  const normalized = normalizeDateString(value);
  if (!normalized) return false;

  const date = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  const future = new Date();
  future.setDate(now.getDate() + days);

  return date >= now && date <= future;
}

export default function App() {
  const [shows, setShows] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState("");
  const [lastSync, setLastSync] = useState("");

  function getSavedSelectionMap() {
    try {
      const raw = localStorage.getItem("animeSelectionState");
      return raw ? JSON.parse(raw) : {};
    } catch (err) {
      console.error("Failed to parse saved selection state", err);
      return {};
    }
  }

  function saveSelectionMap(nextShows) {
    try {
      const selectionMap = nextShows.reduce((acc, show) => {
        if (show.malId != null) {
          acc[show.malId] = !!show.selected;
        }
        return acc;
      }, {});

      localStorage.setItem("animeSelectionState", JSON.stringify(selectionMap));
    } catch (err) {
      console.error("Failed to save selection state", err);
    }
  }

  async function loadShows(forceRefresh = false) {
    setError("");

    try {
      const data = await fetchAnimeList("", forceRefresh);
      const incoming = Array.isArray(data.items) ? data.items : [];
      const savedSelectionMap = getSavedSelectionMap();

      const normalized = incoming.map((show, index) => ({
        id: show.malId || show.id || index + 1,
        malId: show.malId || null,
        title: show.title || "Unknown title",
        titleJp: show.titleJp || "",
        season: show.season || "Unknown season",
        premiereDate: show.premiereDate || "",
        broadcast: show.broadcast || "Unknown",
        episodes: show.episodes || 0,
        duration: show.duration || 24,
        status: show.status || "",
        score: show.score ?? 0,
        selected:
          show.malId != null && savedSelectionMap[show.malId] !== undefined
            ? savedSelectionMap[show.malId]
            : show.selected ?? false,
        synced: show.synced ?? false,
        image: show.image || "https://placehold.co/640x360?text=Anime+Poster",
        confidence: show.confidence || "Imported from backend"
      }));

      const now = new Date().toLocaleString();

      setShows(normalized);
      setLastRefresh(now);

      localStorage.setItem("animeListCache", JSON.stringify(normalized));
      localStorage.setItem("animeListLastRefresh", now);
      saveSelectionMap(normalized);
    } catch (err) {
      setError(err.message || "Failed to load anime");
    }
  }

  useEffect(() => {
    const cachedShows = localStorage.getItem("animeListCache");
    const cachedLastRefresh = localStorage.getItem("animeListLastRefresh");

    if (cachedShows) {
      try {
        setShows(JSON.parse(cachedShows));
        if (cachedLastRefresh) {
          setLastRefresh(cachedLastRefresh);
        }
      } catch (err) {
        console.error("Failed to parse cached anime list", err);
      }
    }

    async function init() {
      setLoading(true);
      await loadShows(false);
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
        show.season.toLowerCase().includes(q) ||
        show.status.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all" ? true : show.status === statusFilter;

      const matchesTime =
        timeFilter === "all"
          ? true
          : timeFilter === "upcoming"
          ? isUpcomingDate(show.premiereDate)
          : timeFilter === "next30"
          ? isWithinDays(show.premiereDate, 30)
          : timeFilter === "next90"
          ? isWithinDays(show.premiereDate, 90)
          : timeFilter === "tbd"
          ? !show.premiereDate
          : true;

      return matchesQuery && matchesStatus && matchesTime;
    });
  }, [shows, query, statusFilter, timeFilter]);

  const selectedCount = shows.filter((s) => s.selected).length;
  const syncedCount = shows.filter((s) => s.synced).length;
  const queueCount = shows.filter((s) => s.selected && !s.synced).length;

  function toggleSelected(id) {
    setShows((prev) => {
      const next = prev.map((show) =>
        show.id === id ? { ...show, selected: !show.selected } : show
      );
      saveSelectionMap(next);
      localStorage.setItem("animeListCache", JSON.stringify(next));
      return next;
    });
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadShows(true);
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
      setLastSync(new Date().toLocaleString());
      await loadShows(false);
    } catch (err) {
      setError(err.message || "Failed to sync selected shows");
    } finally {
      setSyncing(false);
    }
  }

  async function handleSyncOne(show) {
    setError("");
    setSyncing(true);

    try {
      await syncSelectedShows([{ ...show, selected: true }]);
      setLastSync(new Date().toLocaleString());
      await loadShows(false);
    } catch (err) {
      setError(err.message || `Failed to sync ${show.title}`);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="page-wrap">
        <div className="main-grid">
          <div className="left-column">
            <section className="hero-card">
              <div className="hero-tags">
                <span className="pill">MyAnimeList library</span>
                <span className="pill">Frontend time filters</span>
                <span className="pill">Google Calendar sync</span>
              </div>

              <div className="hero-top">
                <div>
                  <h1>Anime Calendar Sync</h1>
                  <p className="hero-copy">
                    A dashboard for loading your MAL anime library, filtering by
                    status and time range, and syncing selected titles into Google Calendar.
                  </p>

                  <div style={{ marginTop: "1rem", opacity: 0.9 }}>
                    <p style={{ margin: "0 0 0.35rem 0" }}>
                      <strong>Reload library from MAL</strong> fetches your current MAL list.
                    </p>
                    <p style={{ margin: "0 0 0.35rem 0" }}>
                      <strong>Create/update Google Calendar events</strong> writes selected anime into your Google Calendar.
                    </p>
                    <p style={{ margin: 0 }}>
                      Already-synced titles are detected from existing calendar events.
                    </p>
                  </div>
                </div>

                <div className="hero-actions">
                  <button
                    className="button button-light"
                    onClick={handleRefresh}
                    disabled={refreshing || loading}
                  >
                    {refreshing ? "Reloading..." : "Reload library from MAL"}
                  </button>

                  <button
                    className="button button-primary"
                    onClick={handleSyncSelected}
                    disabled={syncing || loading}
                  >
                    {syncing ? "Creating/updating..." : "Create/update Google Calendar events"}
                  </button>
                </div>
              </div>
            </section>

            <section className="stats-grid">
              <StatCard
                label="Queued for sync"
                value={selectedCount}
                subtext="Currently selected for calendar sync"
              />
              <StatCard
                label="Found in Google Calendar"
                value={syncedCount}
                subtext="Detected from backend calendar data"
              />
              <StatCard
                label="Pending jobs"
                value={queueCount}
                subtext="Selected but not yet found as synced"
              />
            </section>

            <section className="panel">
              <div className="toolbar">
                <input
                  className="search-input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search title, JP title, season, or status"
                />

                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  <select
                    className="search-input"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All statuses</option>
                    <option value="watching">Watching</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On hold</option>
                    <option value="dropped">Dropped</option>
                    <option value="plan_to_watch">Plan to watch</option>
                  </select>

                  <select
                    className="search-input"
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value)}
                  >
                    <option value="all">All dates</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="next30">Next 30 days</option>
                    <option value="next90">Next 90 days</option>
                    <option value="tbd">No date / TBD</option>
                  </select>
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
                        <span className="pill">{show.season || "Unknown season"}</span>
                        <span className="pill">{show.episodes} eps</span>
                        <span className="pill">{show.duration} min</span>
                        <span className="pill">Score: {show.score || "-"}</span>
                      </div>

                      <div className="info-box">
                        <div className="info-row">
                          <span>Premiere</span>
                          <strong>{show.premiereDate || "TBD"}</strong>
                        </div>
                        <div className="info-row">
                          <span>Broadcast</span>
                          <strong>{show.broadcast}</strong>
                        </div>
                        <div className="info-row">
                          <span>List status</span>
                          <strong>{show.status || "-"}</strong>
                        </div>
                      </div>

                      <label className="toggle-box">
                        <div>
                          <div className="toggle-title">Include this show in sync</div>
                          <div className="toggle-subtitle">
                            Will be included when you click sync
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
                          disabled={syncing}
                        >
                          {syncing ? "Working..." : "Create/update this one"}
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
                MAL list data is loaded from your Apps Script backend and can be sent to Google Calendar sync.
              </p>

              <div className="status-box">
                <div className="info-row">
                  <span>Last MAL refresh</span>
                  <strong>{lastRefresh || "Not yet loaded"}</strong>
                </div>
                <div className="info-row">
                  <span>Last calendar sync</span>
                  <strong>{syncing ? "Sync in progress..." : lastSync || "Waiting"}</strong>
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
          </div>
        </div>
      </div>
    </div>
  );
}
