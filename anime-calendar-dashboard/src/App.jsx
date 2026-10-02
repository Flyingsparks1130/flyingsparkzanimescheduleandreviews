import {
  lazy,
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { fetchAuthUrl, syncSelectedShows } from "./api/client.js";
import { useLibrary } from "./hooks/useLibrary.js";
import {
  STATUS,
  canSync,
  filterShows,
  formatDate,
  localDay,
  syncPayload,
  syncSummary,
} from "./lib/library.js";
import { readStored, writeStored } from "./lib/storage.js";
import { download, toCsv, toIcs } from "./lib/export.js";
import ShowCard, { Cover, StatusBadge } from "./components/ShowCard.jsx";
import ShowDetails from "./components/ShowDetails.jsx";
const Analytics = lazy(() => import("./components/Analytics.jsx"));
const PAGE_SIZE = 24;
const PAGES = {
  library: [
    "Library",
    "Your next obsession starts here.",
    "Explore your collection, find a favorite, and make room for what's next.",
  ],
  schedule: [
    "Schedule",
    "A little anticipation.",
    "Premiere dates from your library, together in one place.",
  ],
  analytics: [
    "Insights",
    "A picture of your taste.",
    "Your ratings and watching habits, straight from your MyAnimeList library.",
  ],
  calendar: [
    "Calendar & export",
    "Make time for your favorites.",
    "Choose the shows you want to add to Google Calendar.",
  ],
};
function initialQueue() {
  const stored = readStored("queue", []);
  return new Set(
    Array.isArray(stored) ? stored.filter((id) => typeof id === "string") : [],
  );
}

export default function App() {
  const { shows, loading, error, updatedAt, cacheWarning, refresh } =
    useLibrary();
  const [page, setPage] = useState("library");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [status, setStatus] = useState("all");
  const [date, setDate] = useState("all");
  const [sort, setSort] = useState("title");
  const [pageNumber, setPageNumber] = useState(1);
  const [queue, setQueue] = useState(initialQueue);
  const [queueWarning, setQueueWarning] = useState(false);
  const [selectedShow, setSelectedShow] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [auth, setAuth] = useState({ loading: false, url: "", error: "" });
  const syncInFlight = useRef(false);
  const resultsHeading = useRef(null);
  const today = localDay();
  const counts = useMemo(() => {
    const result = Object.fromEntries(
      Object.keys(STATUS).map((key) => [key, 0]),
    );
    shows.forEach((show) => result[show.status]++);
    return result;
  }, [shows]);
  const upcoming = useMemo(
    () =>
      shows
        .filter((show) => show.premiereDate >= today)
        .sort((a, b) => a.premiereDate.localeCompare(b.premiereDate)),
    [shows, today],
  );
  const queued = useMemo(
    () => shows.filter((show) => queue.has(show.id) && canSync(show)),
    [shows, queue],
  );
  const filtered = useMemo(
    () =>
      filterShows(
        shows,
        {
          query: deferredQuery,
          status,
          date,
          sort: page === "schedule" ? "oldest" : sort,
        },
        today,
      ),
    [shows, deferredQuery, status, date, sort, page, today],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(pageNumber, pages);
  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  useEffect(() => {
    setPageNumber(1);
  }, [deferredQuery, status, date, sort, page]);
  useEffect(() => {
    setQueueWarning(!writeStored("queue", [...queue]));
  }, [queue]);
  const toggleQueue = useCallback((id) => {
    if (syncInFlight.current) return;
    setQueue((previous) => {
      const next = new Set(previous);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);
  const openShow = useCallback((show) => setSelectedShow(show), []);
  function navigate(next) {
    setPage(next);
    setPageNumber(1);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function resetFilters() {
    setQuery("");
    setStatus("all");
    setDate("all");
  }
  async function reconnect() {
    setAuth({ loading: true, url: "", error: "" });
    try {
      setAuth({ loading: false, url: await fetchAuthUrl(), error: "" });
    } catch (err) {
      setAuth({ loading: false, url: "", error: err.message });
    }
  }
  async function syncQueue() {
    if (syncInFlight.current || !queued.length) return;
    syncInFlight.current = true;
    setSyncing(true);
    setSyncResult(null);
    try {
      const response = await syncSelectedShows(queued.map(syncPayload));
      setSyncResult({ ok: true, message: syncSummary(response) });
    } catch (err) {
      setSyncResult({ ok: false, message: err.message, code: err.code });
    } finally {
      syncInFlight.current = false;
      setSyncing(false);
    }
  }
  const authNeeded = error?.code === "auth" || syncResult?.code === "auth";
  function paginate(next) {
    setPageNumber(next);
    resultsHeading.current?.focus();
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <a href="#main" className="brand" onClick={() => navigate("library")}>
          <span className="brand-mark">飛</span>
          <span>
            flying sparks<small>ANIME LIBRARY</small>
          </span>
        </a>
        <div className="sidebar-label">YOUR SPACE</div>
        <nav aria-label="Main navigation">
          {Object.entries(PAGES).map(([key, [label]], index) => (
            <button
              key={key}
              className={`nav-item${page === key ? " active" : ""}`}
              aria-current={page === key ? "page" : undefined}
              onClick={() => navigate(key)}
            >
              <span aria-hidden="true">{["▦", "◷", "◈", "↗"][index]}</span>
              {label}
              {key === "calendar" && queued.length > 0 && (
                <b>{queued.length}</b>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="connection-dot" />
          Your MyAnimeList collection
          <p>
            Your collection.
            <br />
            At your own pace.
          </p>
        </div>
        <div className="sidebar-bottom">
          <span className="avatar">FS</span>
          <div>
            Flying Sparks<small>Anime, on your schedule.</small>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span className="breadcrumb">
            Your space <span>/</span> <strong>{PAGES[page][0]}</strong>
          </span>
          <div className="topbar-actions">
            <span className="updated" role="status">
              {loading
                ? shows.length
                  ? "Updating library…"
                  : "Connecting…"
                : updatedAt
                  ? `Updated ${new Date(updatedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
                  : "Awaiting connection"}
            </span>
            <button
              className="secondary refresh"
              disabled={loading}
              onClick={() => refresh(true)}
            >
              <span className={loading ? "spin" : ""} aria-hidden="true">
                ↻
              </span>{" "}
              {loading ? "Loading" : "Refresh"}
            </button>
          </div>
        </header>
        <main id="main" className="main-content">
          <div className="page-intro">
            <div>
              <p className="eyebrow">
                {page === "library"
                  ? "THE COLLECTION"
                  : PAGES[page][0].toUpperCase()}
              </p>
              <h1>{PAGES[page][1]}</h1>
              <p>{PAGES[page][2]}</p>
            </div>
            {page === "library" && (
              <button
                className="text-button"
                onClick={() => {
                  navigate("schedule");
                  setDate("upcoming");
                }}
              >
                Explore upcoming <span>↗</span>
              </button>
            )}
          </div>
          {error && (
            <div className="notice error" role="alert">
              <div>
                <strong>
                  {error.code === "auth"
                    ? "Reconnect MyAnimeList"
                    : "Library update unavailable"}
                </strong>
                <p>
                  {error.message}
                  {shows.length > 0 ? " Showing your saved library." : ""}
                </p>
              </div>
              {error.code !== "auth" && (
                <button
                  className="secondary"
                  disabled={loading}
                  onClick={() => refresh()}
                >
                  Try again
                </button>
              )}
            </div>
          )}
          {authNeeded && (
            <div className="notice">
              <div>
                <strong>Restore your account connection</strong>
                <p>
                  {auth.error ||
                    "Get a secure authorization link, finish connecting in a new tab, then refresh here."}
                </p>
              </div>
              {auth.url ? (
                <a
                  className="primary"
                  href={auth.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Continue to authorization ↗
                </a>
              ) : (
                <button
                  className="primary"
                  disabled={auth.loading}
                  onClick={reconnect}
                >
                  {auth.loading ? "Getting link…" : "Reconnect account"}
                </button>
              )}
            </div>
          )}
          {(cacheWarning || queueWarning) && (
            <p className="notice" role="status">
              Browser storage is unavailable or full. Your current session
              works, but changes may not survive a reload.
            </p>
          )}
          {loading && !shows.length && (
            <div
              className="skeleton-grid"
              aria-label="Loading library"
              aria-busy="true"
            >
              {Array.from({ length: 6 }, (_, index) => (
                <div className="skeleton" key={index} />
              ))}
            </div>
          )}
          {!loading && !error && !shows.length && (
            <div className="empty">
              <span>◇</span>
              <h2>Your collection is ready for a story.</h2>
              <p>
                Add shows to your MyAnimeList account and refresh to bring them
                here.
              </p>
              <a
                className="primary"
                href="https://myanimelist.net/animelist"
                target="_blank"
                rel="noreferrer"
              >
                Open MyAnimeList ↗
              </a>
            </div>
          )}
          {shows.length > 0 && (
            <>
              {page === "library" && (
                <>
                  <section className="overview" aria-label="Library overview">
                    {[
                      [
                        shows.length,
                        "In your library",
                        "Every story, in one place",
                        "all",
                      ],
                      [
                        counts.watching,
                        "Watching now",
                        "Keep the momentum going",
                        "watching",
                      ],
                      [
                        counts.plan_to_watch,
                        "On your watchlist",
                        "Good things ahead",
                        "plan_to_watch",
                      ],
                      [
                        counts.completed,
                        "Completed",
                        "Stories that stay with you",
                        "completed",
                      ],
                    ].map(([value, label, note, key]) => (
                      <button
                        className={`overview-stat${status === key ? " chosen" : ""}`}
                        key={key}
                        onClick={() => setStatus(key)}
                      >
                        <span>{label}</span>
                        <strong>{value.toLocaleString()}</strong>
                        <small>{note}</small>
                      </button>
                    ))}
                  </section>
                  {upcoming[0] && (
                    <section className="up-next">
                      <div className="up-next-label">
                        <span className="connection-dot" />
                        ON THE HORIZON
                      </div>
                      <div>
                        <h2>{upcoming[0].title}</h2>
                        <p>
                          Premieres {formatDate(upcoming[0].premiereDate)}
                          {upcoming[0].studio ? ` · ${upcoming[0].studio}` : ""}
                        </p>
                      </div>
                      <button
                        className="secondary"
                        onClick={() => openShow(upcoming[0])}
                      >
                        Take a look ↗
                      </button>
                    </section>
                  )}
                </>
              )}
              {(page === "library" || page === "schedule") && (
                <>
                  <section
                    className="library-controls"
                    aria-label="Search and filter library"
                  >
                    <div className="section-heading">
                      <h2 ref={resultsHeading} tabIndex={-1}>
                        {page === "library"
                          ? "All your stories"
                          : "Premiere schedule"}
                        <span className="count-pill">{filtered.length}</span>
                      </h2>
                      <span>
                        {page === "schedule"
                          ? "Premieres, not weekly episode airings"
                          : "A collection that's uniquely yours"}
                      </span>
                    </div>
                    <div className="filter-row">
                      <label className="search-field">
                        <span aria-hidden="true">⌕</span>
                        <input
                          aria-label="Search your library"
                          type="search"
                          placeholder="Search titles, genres, or studios…"
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                        />
                      </label>
                      <label className="select-field">
                        <span>Dates</span>
                        <select
                          aria-label="Filter by date"
                          value={date}
                          onChange={(event) => setDate(event.target.value)}
                        >
                          <option value="all">All dates</option>
                          <option value="upcoming">Upcoming</option>
                          <option value="month">This month</option>
                          <option value="unknown">Date TBA</option>
                        </select>
                      </label>
                      {page === "library" && (
                        <label className="select-field">
                          <span>Sort by</span>
                          <select
                            aria-label="Sort library"
                            value={sort}
                            onChange={(event) => setSort(event.target.value)}
                          >
                            <option value="title">Title A–Z</option>
                            <option value="newest">Newest premiere</option>
                            <option value="oldest">Oldest premiere</option>
                            <option value="score">Highest rated</option>
                          </select>
                        </label>
                      )}
                    </div>
                    <div
                      className="status-tabs"
                      aria-label="Filter by watch status"
                    >
                      {[
                        ["all", { label: "All shows" }],
                        ...Object.entries(STATUS),
                      ].map(([key, meta]) => (
                        <button
                          key={key}
                          aria-pressed={status === key}
                          className={status === key ? "selected" : ""}
                          onClick={() => setStatus(key)}
                        >
                          {key !== "all" && (
                            <i style={{ background: meta.color }} />
                          )}
                          {meta.label}
                          <span>
                            {key === "all" ? shows.length : counts[key]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                  {!filtered.length ? (
                    <div className="empty">
                      <span>⌕</span>
                      <h2>No stories found.</h2>
                      <p>Try a different title or broaden your filters.</p>
                      <button className="secondary" onClick={resetFilters}>
                        Clear filters
                      </button>
                    </div>
                  ) : (
                    <>
                      {page === "library" ? (
                        <div
                          className="show-grid"
                          aria-busy={query !== deferredQuery}
                        >
                          {visible.map((show) => (
                            <ShowCard
                              key={show.id}
                              show={show}
                              selected={queue.has(show.id)}
                              disabled={syncing}
                              onToggle={toggleQueue}
                              onOpen={openShow}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="schedule-list">
                          {visible.map((show, index) => (
                            <div key={show.id}>
                              {(index === 0 ||
                                visible[index - 1].premiereDate.slice(0, 7) !==
                                  show.premiereDate.slice(0, 7)) && (
                                <h3 className="month-heading">
                                  {show.premiereDate
                                    ? new Date(
                                        `${show.premiereDate}T12:00:00`,
                                      ).toLocaleDateString(undefined, {
                                        month: "long",
                                        year: "numeric",
                                      })
                                    : "To be announced"}
                                </h3>
                              )}
                              <div className="schedule-row">
                                <div className="schedule-date">
                                  <strong>
                                    {show.premiereDate
                                      ? show.premiereDate.slice(8)
                                      : "—"}
                                  </strong>
                                  <span>
                                    {show.premiereDate
                                      ? new Date(
                                          `${show.premiereDate}T12:00:00`,
                                        ).toLocaleDateString(undefined, {
                                          weekday: "short",
                                        })
                                      : "TBA"}
                                  </span>
                                </div>
                                <Cover show={show} />
                                <button
                                  className="schedule-title"
                                  onClick={() => openShow(show)}
                                >
                                  {show.title}
                                  <small>
                                    {show.broadcast ||
                                      "Broadcast time not announced"}
                                  </small>
                                </button>
                                <StatusBadge status={show.status} />
                                {canSync(show) && (
                                  <button
                                    className="secondary"
                                    disabled={syncing}
                                    aria-label={`${queue.has(show.id) ? "Remove" : "Queue"} ${show.title}`}
                                    onClick={() => toggleQueue(show.id)}
                                  >
                                    {queue.has(show.id)
                                      ? "Queued ✓"
                                      : "+ Queue"}
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="pagination">
                        <span>
                          Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                          {Math.min(currentPage * PAGE_SIZE, filtered.length)}{" "}
                          of {filtered.length}
                        </span>
                        <div>
                          <button
                            className="secondary"
                            disabled={currentPage === 1}
                            onClick={() => paginate(currentPage - 1)}
                          >
                            ← Previous
                          </button>
                          <span>
                            {currentPage} / {pages}
                          </span>
                          <button
                            className="secondary"
                            disabled={currentPage === pages}
                            onClick={() => paginate(currentPage + 1)}
                          >
                            Next →
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
              {page === "analytics" && (
                <Suspense fallback={<p role="status">Loading insights…</p>}>
                  <Analytics shows={shows} onOpen={openShow} />
                </Suspense>
              )}
              {page === "calendar" && (
                <div className="calendar-layout">
                  <section className="panel">
                    <div className="section-heading">
                      <h2>
                        Your calendar queue{" "}
                        <span className="count-pill">{queued.length}</span>
                      </h2>
                      <button
                        className="text-button"
                        disabled={syncing || !queue.size}
                        onClick={() => setQueue(new Set())}
                      >
                        Clear queue
                      </button>
                    </div>
                    <p className="muted">
                      Choose watching or planned shows with a known premiere
                      date. Episode events follow the backend's weekly schedule
                      and may be estimates.
                    </p>
                    <div className="button-row">
                      <button
                        className="secondary"
                        disabled={syncing}
                        onClick={() =>
                          setQueue(
                            (previous) =>
                              new Set([
                                ...previous,
                                ...shows
                                  .filter(
                                    (show) =>
                                      canSync(show) &&
                                      show.status === "watching",
                                  )
                                  .map((show) => show.id),
                              ]),
                          )
                        }
                      >
                        Add currently watching
                      </button>
                      <button
                        className="text-button"
                        onClick={() => navigate("library")}
                      >
                        Choose from library ↗
                      </button>
                    </div>
                    {queued.length ? (
                      <div className="queue-list">
                        {queued.map((show) => (
                          <div className="queue-row" key={show.id}>
                            <Cover show={show} />
                            <div>
                              <button
                                className="text-button"
                                onClick={() => openShow(show)}
                              >
                                {show.title}
                              </button>
                              <small>
                                {formatDate(show.premiereDate)} ·{" "}
                                {show.episodes || "Estimated"} episodes
                              </small>
                            </div>
                            <button
                              className="remove-button"
                              disabled={syncing}
                              aria-label={`Remove ${show.title} from queue`}
                              onClick={() => toggleQueue(show.id)}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty compact">
                        <span>◷</span>
                        <h3>A little room for what's next.</h3>
                        <p>Add shows from your library to get started.</p>
                      </div>
                    )}
                    <div className="sync-footer">
                      <button
                        className="primary"
                        disabled={syncing || !queued.length}
                        onClick={syncQueue}
                      >
                        {syncing
                          ? "Syncing with Google Calendar…"
                          : `Sync ${queued.length} ${queued.length === 1 ? "show" : "shows"} to Google Calendar`}
                      </button>
                      <p>
                        Syncing can take a while for long series. Your queue
                        stays saved.
                      </p>
                      {syncResult && (
                        <div
                          className={`notice${syncResult.ok ? " success" : " error"}`}
                          role="status"
                        >
                          {syncResult.message}
                        </div>
                      )}
                    </div>
                  </section>
                  <section className="panel export-panel">
                    <p className="eyebrow">TAKE IT WITH YOU</p>
                    <h2>Your library, anywhere.</h2>
                    <p className="muted">
                      Export all {shows.length} shows. Calendar downloads
                      include premiere dates only.
                    </p>
                    {[
                      [
                        "CSV spreadsheet",
                        "Titles, scores, and library details",
                        () =>
                          download(
                            "flying-sparks.csv",
                            toCsv(shows),
                            "text/csv;charset=utf-8",
                          ),
                      ],
                      [
                        "JSON data",
                        "Your complete normalized library",
                        () =>
                          download(
                            "flying-sparks.json",
                            JSON.stringify(
                              shows.map(
                                ({ _raw, searchText, ...show }) => show,
                              ),
                              null,
                              2,
                            ),
                            "application/json",
                          ),
                      ],
                      [
                        "Premiere calendar",
                        "An .ics file for your calendar app",
                        () =>
                          download(
                            "flying-sparks-premieres.ics",
                            toIcs(shows),
                            "text/calendar;charset=utf-8",
                          ),
                      ],
                    ].map(([label, description, action]) => (
                      <button
                        className="export-button"
                        key={label}
                        onClick={action}
                      >
                        <span>
                          {label}
                          <small>{description}</small>
                        </span>
                        <span>↓</span>
                      </button>
                    ))}
                  </section>
                </div>
              )}
            </>
          )}
          <footer className="page-footer">
            <span>
              FLYING SPARKS <span> / </span> A home for your anime.
            </span>
            <a href="https://myanimelist.net" target="_blank" rel="noreferrer">
              Library data from MyAnimeList ↗
            </a>
          </footer>
        </main>
      </div>
      {selectedShow && (
        <ShowDetails
          show={selectedShow}
          onClose={() => setSelectedShow(null)}
          selected={queue.has(selectedShow.id)}
          onToggle={toggleQueue}
          disabled={syncing}
        />
      )}
    </div>
  );
}
