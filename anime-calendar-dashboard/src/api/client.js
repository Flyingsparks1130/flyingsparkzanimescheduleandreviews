import { useState, useMemo, useEffect, useCallback } from "react";
import {
  fetchAnimeList,
  fetchAuthUrl,
  syncSelectedShows
} from "./api/client";

const STATUS_META = {
  watching: { label: "Watching", color: "#22c55e" },
  completed: { label: "Completed", color: "#3b82f6" },
  on_hold: { label: "On hold", color: "#f59e0b" },
  dropped: { label: "Dropped", color: "#ef4444" },
  plan_to_watch: { label: "Plan to watch", color: "#8b5cf6" }
};

function normalizeStatus(value) {
  if (!value) return "plan_to_watch";

  const normalized = String(value).toLowerCase().trim().replace(/[\s-]+/g, "_");

  if (normalized === "watching") return "watching";
  if (normalized === "completed") return "completed";
  if (normalized === "on_hold") return "on_hold";
  if (normalized === "dropped") return "dropped";
  if (normalized === "plan_to_watch") return "plan_to_watch";

  return "plan_to_watch";
}

function hasExactDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function getDateFilterLabel(value) {
  switch (value) {
    case "upcoming":
      return "Upcoming";
    case "this_month":
      return "This month";
    case "next_3_months":
      return "Next 3 months";
    case "this_year":
      return "This year";
    default:
      return "All dates";
  }
}

function isWithinDateFilter(show, dateFilter) {
  if (dateFilter === "all") return true;
  if (!show.premiereDate || !hasExactDate(show.premiereDate)) {
    return dateFilter === "upcoming";
  }

  const today = new Date();
  const showDate = new Date(`${show.premiereDate}T00:00:00`);

  if (Number.isNaN(showDate.getTime())) return false;

  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const startOfThreeMonthsOut = new Date(today.getFullYear(), today.getMonth() + 3, 1);
  const startOfNextYear = new Date(today.getFullYear() + 1, 0, 1);

  if (dateFilter === "upcoming") {
    return showDate >= startOfToday;
  }

  if (dateFilter === "this_month") {
    return showDate >= new Date(today.getFullYear(), today.getMonth(), 1) &&
      showDate < startOfNextMonth;
  }

  if (dateFilter === "next_3_months") {
    return showDate >= startOfToday && showDate < startOfThreeMonthsOut;
  }

  if (dateFilter === "this_year") {
    return showDate >= new Date(today.getFullYear(), 0, 1) &&
      showDate < startOfNextYear;
  }

  return true;
}

function formatStatusLabel(status) {
  return STATUS_META[status]?.label || status;
}

function formatLastRefresh(value) {
  if (!value) return "Not yet loaded";
  return value;
}

function buildSelectionMap(items) {
  return items.reduce((acc, show) => {
    acc[String(show.malId)] = !!show.selected;
    return acc;
  }, {});
}

function mergeSelectionState(items, savedSelectionMap) {
  return items.map((show) => ({
    ...show,
    selected: savedSelectionMap[String(show.malId)] ?? !!show.selected
  }));
}

function normalizeShow(show, index) {
  return {
    id: show.malId || show.id || index + 1,
    malId: show.malId || null,
    title: show.title || "Unknown title",
    titleJp: show.titleJp || "",
    season: show.season || "Unknown season",
    premiereDate: show.premiereDate || "",
    broadcast: show.broadcast || "",
    episodes: Number(show.episodes) || 0,
    duration: Number(show.duration) || 24,
    status: normalizeStatus(show.status),
    score: show.score ?? null,
    selected: !!show.selected,
    synced: !!show.synced,
    image: show.image || "https://placehold.co/640x360?text=Anime",
    confidence: show.confidence || "Imported from backend"
  };
}

export default function App() {
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const [lastRefresh, setLastRefresh] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadShows = useCallback(async (forceRefresh = false) => {
    setError("");

    try {
      const data = await fetchAnimeList(statusFilter === "all" ? "" : statusFilter, forceRefresh);
      const incoming = Array.isArray(data.items) ? data.items : [];
      const normalized = incoming.map(normalizeShow);

      let savedSelectionMap = {};
      try {
        savedSelectionMap = JSON.parse(localStorage.getItem("animeSelectionState") || "{}");
      } catch (err) {
        console.error("Failed to parse animeSelectionState", err);
      }

      const merged = mergeSelectionState(normalized, savedSelectionMap);
      const now = new Date().toLocaleString();

      setShows(merged);
      setLastRefresh(now);

      localStorage.setItem("animeListCache", JSON.stringify(merged));
      localStorage.setItem("animeListLastRefresh", now);
      localStorage.setItem("animeSelectionState", JSON.stringify(buildSelectionMap(merged)));
    } catch (err) {
      setError(err.message || "Failed to load anime");
    }
  }, [statusFilter]);

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
  }, [loadShows]);

  useEffect(() => {
    localStorage.setItem("animeSelectionState", JSON.stringify(buildSelectionMap(shows)));
  }, [shows]);

  const filteredShows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return shows.filter((show) => {
      const matchesStatus = statusFilter === "all" ? true : show.status === statusFilter;
      const matchesDate = isWithinDateFilter(show, dateFilter);
      const matchesSearch = !q
        ? true
        : [
            show.title,
            show.titleJp,
            show.season,
            formatStatusLabel(show.status)
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(q));

      return matchesStatus && matchesDate && matchesSearch;
    });
  }, [shows, statusFilter, dateFilter, searchQuery]);

  const selectedCount = useMemo(
    () => shows.filter((show) => show.selected).length,
    [shows]
  );

  const syncedCount = useMemo(
    () => shows.filter((show) => show.synced).length,
    [shows]
  );

  const pendingCount = selectedCount;

  async function handleReloadLibrary() {
    setReloading(true);
    setSyncMessage("");

    try {
      await loadShows(true);
    } finally {
      setReloading(false);
    }
  }

  function toggleSelected(malId) {
    setShows((prev) =>
      prev.map((show) =>
        show.malId === malId
          ? { ...show, selected: !show.selected }
          : show
      )
    );
  }

  async function handleSyncSelected() {
    const selectedShows = shows.filter((show) => show.selected);

    if (!selectedShows.length) {
      setSyncMessage("Select at least one show first.");
      return;
    }

    setSyncing(true);
    setError("");
    setSyncMessage("");

    try {
      await syncSelectedShows(selectedShows);
      setSyncMessage("Calendar sync completed.");
      await loadShows(false);
    } catch (err) {
      const message = err.message || "Failed to sync selected shows";
      setError(message);

      const lower = message.toLowerCase();
      if (
        lower.includes("auth") ||
        lower.includes("authorization") ||
        lower.includes("token")
      ) {
        try {
          const auth = await fetchAuthUrl();
          if (auth.authorizeUrl) {
            window.open(auth.authorizeUrl, "_blank", "noopener,noreferrer");
          }
        } catch (authErr) {
          console.error("Failed to fetch auth url", authErr);
        }
      }
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b1020",
        color: "#f8fafc",
        fontFamily: "Inter, system-ui, sans-serif"
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: 24
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 360px",
            gap: 24,
            alignItems: "start"
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #0f172a, #1e293b)",
              borderRadius: 28,
              padding: 28,
              border: "1px solid rgba(255,255,255,0.08)"
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 18
              }}
            >
              <span
                style={{
                  background: "rgba(255,255,255,0.08)",
                  padding: "8px 14px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 600
                }}
              >
                MyAnimeList library
              </span>
              <span
                style={{
                  background: "rgba(255,255,255,0.08)",
                  padding: "8px 14px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 600
                }}
              >
                Frontend time filters
              </span>
              <span
                style={{
                  background: "rgba(255,255,255,0.08)",
                  padding: "8px 14px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 600
                }}
              >
                Google Calendar sync
              </span>
            </div>

            <h1
              style={{
                fontSize: 56,
                lineHeight: 1,
                margin: 0,
                marginBottom: 18,
                fontWeight: 800
              }}
            >
              Anime Calendar Sync
            </h1>

            <p
              style={{
                fontSize: 18,
                lineHeight: 1.6,
                color: "#cbd5e1",
                maxWidth: 760,
                marginBottom: 22
              }}
            >
              Reload library from MAL fetches your current MAL list. Create/update Google Calendar events writes selected anime into your Google Calendar. Already-synced titles are detected from existing calendar events.
            </p>

            <div
              style={{
                display: "flex",
                gap: 14,
                flexWrap: "wrap"
              }}
            >
              <button
                onClick={handleReloadLibrary}
                disabled={reloading || loading}
                style={{
                  padding: "14px 22px",
                  borderRadius: 16,
                  border: "none",
                  background: "#ffffff",
                  color: "#0f172a",
                  fontWeight: 700,
                  fontSize: 18,
                  cursor: reloading || loading ? "not-allowed" : "pointer",
                  opacity: reloading || loading ? 0.7 : 1
                }}
              >
                {reloading ? "Reloading..." : "Reload library from MAL"}
              </button>

              <button
                onClick={handleSyncSelected}
                disabled={syncing || loading}
                style={{
                  padding: "14px 22px",
                  borderRadius: 16,
                  border: "none",
                  background: "#5b8cff",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: 18,
                  cursor: syncing || loading ? "not-allowed" : "pointer",
                  opacity: syncing || loading ? 0.7 : 1
                }}
              >
                {syncing ? "Syncing..." : "Create/update Google Calendar events"}
              </button>
            </div>
          </div>

          <div
            style={{
              background: "#f8fafc",
              color: "#0f172a",
              borderRadius: 28,
              padding: 24
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 14, fontSize: 28 }}>
              Backend status
            </h2>

            <p
              style={{
                color: "#64748b",
                lineHeight: 1.7,
                marginBottom: 22
              }}
            >
              MAL list data is loaded from your Apps Script backend and can be sent to Google Calendar sync.
            </p>

            <div
              style={{
                background: "#f1f5f9",
                borderRadius: 20,
                padding: 18
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ color: "#64748b" }}>Last MAL refresh</span>
                <strong>{formatLastRefresh(lastRefresh)}</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ color: "#64748b" }}>Last calendar sync</span>
                <strong>{syncMessage || "Waiting"}</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                <span style={{ color: "#64748b" }}>Google auth</span>
                <strong style={{ color: "#16a34a" }}>Connected</strong>
              </div>

              <div
                style={{
                  height: 8,
                  background: "#e2e8f0",
                  borderRadius: 999,
                  overflow: "hidden",
                  marginBottom: 14
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: shows.length ? `${(syncedCount / shows.length) * 100}%` : "0%",
                    background: "#94a3b8"
                  }}
                />
              </div>

              <div style={{ color: "#64748b" }}>
                {shows.length
                  ? `${Math.round((syncedCount / shows.length) * 100)}% of loaded shows are marked synced.`
                  : "No shows loaded yet."}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 18,
            marginTop: 22
          }}
        >
          <div
            style={{
              background: "#f8fafc",
              color: "#0f172a",
              borderRadius: 24,
              padding: 22
            }}
          >
            <div style={{ color: "#64748b", marginBottom: 10 }}>Queued for sync</div>
            <div style={{ fontSize: 46, fontWeight: 800 }}>{selectedCount}</div>
            <div style={{ color: "#64748b" }}>Will be included when you click sync</div>
          </div>

          <div
            style={{
              background: "#f8fafc",
              color: "#0f172a",
              borderRadius: 24,
              padding: 22
            }}
          >
            <div style={{ color: "#64748b", marginBottom: 10 }}>Found in Google Calendar</div>
            <div style={{ fontSize: 46, fontWeight: 800 }}>{syncedCount}</div>
            <div style={{ color: "#64748b" }}>Detected from backend truth</div>
          </div>

          <div
            style={{
              background: "#f8fafc",
              color: "#0f172a",
              borderRadius: 24,
              padding: 22
            }}
          >
            <div style={{ color: "#64748b", marginBottom: 10 }}>Pending jobs</div>
            <div style={{ fontSize: 46, fontWeight: 800 }}>{pendingCount}</div>
            <div style={{ color: "#64748b" }}>Ready for backend processing</div>
          </div>
        </div>

        <div
          style={{
            background: "#f8fafc",
            color: "#0f172a",
            borderRadius: 28,
            padding: 22,
            marginTop: 22
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 280px",
              gap: 18,
              alignItems: "center"
            }}
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, JP title, season, or status"
              style={{
                width: "100%",
                padding: "16px 18px",
                borderRadius: 16,
                border: "1px solid #cbd5e1",
                fontSize: 18
              }}
            />

            <div style={{ display: "grid", gap: 14 }}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: "16px 18px",
                  borderRadius: 16,
                  border: "1px solid #cbd5e1",
                  fontSize: 18
                }}
              >
                <option value="all">All statuses</option>
                <option value="watching">Watching</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On hold</option>
                <option value="dropped">Dropped</option>
                <option value="plan_to_watch">Plan to watch</option>
              </select>

              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={{
                  padding: "16px 18px",
                  borderRadius: 16,
                  border: "1px solid #cbd5e1",
                  fontSize: 18
                }}
              >
                <option value="all">All dates</option>
                <option value="upcoming">Upcoming</option>
                <option value="this_month">This month</option>
                <option value="next_3_months">Next 3 months</option>
                <option value="this_year">This year</option>
              </select>
            </div>
          </div>
        </div>

        {loading && (
          <div
            style={{
              background: "#f8fafc",
              color: "#0f172a",
              borderRadius: 24,
              padding: 24,
              marginTop: 22
            }}
          >
            Loading anime list...
          </div>
        )}

        {!!error && (
          <div
            style={{
              background: "#fff7ed",
              color: "#9a3412",
              borderRadius: 24,
              padding: 24,
              marginTop: 22,
              fontWeight: 700
            }}
          >
            {error}
          </div>
        )}

        {!loading && !error && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
              gap: 22,
              marginTop: 22
            }}
          >
            {filteredShows.map((show) => {
              const statusMeta = STATUS_META[show.status] || STATUS_META.plan_to_watch;

              return (
                <div
                  key={show.id}
                  style={{
                    background: "#f8fafc",
                    color: "#0f172a",
                    borderRadius: 28,
                    overflow: "hidden",
                    boxShadow: "0 12px 32px rgba(15, 23, 42, 0.12)"
                  }}
                >
                  <img
                    src={show.image}
                    alt={show.title}
                    style={{
                      width: "100%",
                      height: 260,
                      objectFit: "cover",
                      display: "block"
                    }}
                  />

                  <div style={{ padding: 22 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 16
                      }}
                    >
                      <div>
                        <h3
                          style={{
                            fontSize: 28,
                            lineHeight: 1.25,
                            margin: 0,
                            marginBottom: 8
                          }}
                        >
                          {show.title}
                        </h3>

                        {show.titleJp ? (
                          <div
                            style={{
                              color: "#64748b",
                              fontSize: 16,
                              marginBottom: 18
                            }}
                          >
                            {show.titleJp}
                          </div>
                        ) : null}
                      </div>

                      <span
                        style={{
                          background: show.synced ? "#dcfce7" : "#fef3c7",
                          color: show.synced ? "#166534" : "#92400e",
                          borderRadius: 999,
                          padding: "8px 14px",
                          fontWeight: 700,
                          whiteSpace: "nowrap"
                        }}
                      >
                        {show.synced ? "Synced" : "Not synced"}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        marginBottom: 18
                      }}
                    >
                      <span
                        style={{
                          background: "#e2e8f0",
                          borderRadius: 999,
                          padding: "8px 14px",
                          fontWeight: 700
                        }}
                      >
                        {show.season || "Unknown season"}
                      </span>

                      <span
                        style={{
                          background: "#e2e8f0",
                          borderRadius: 999,
                          padding: "8px 14px",
                          fontWeight: 700
                        }}
                      >
                        {show.episodes} eps
                      </span>

                      <span
                        style={{
                          background: "#e2e8f0",
                          borderRadius: 999,
                          padding: "8px 14px",
                          fontWeight: 700
                        }}
                      >
                        {show.duration} min
                      </span>

                      <span
                        style={{
                          background: "#e2e8f0",
                          borderRadius: 999,
                          padding: "8px 14px",
                          fontWeight: 700
                        }}
                      >
                        Score: {show.score ?? "-"}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gap: 10,
                        marginBottom: 18,
                        color: "#475569"
                      }}
                    >
                      <div>
                        <strong>Premiere:</strong>{" "}
                        {show.premiereDate || "Unknown"}
                      </div>
                      <div>
                        <strong>Broadcast:</strong>{" "}
                        {show.broadcast || "Unknown"}
                      </div>
                      <div>
                        <strong>Status:</strong>{" "}
                        <span style={{ color: statusMeta.color, fontWeight: 700 }}>
                          {formatStatusLabel(show.status)}
                        </span>
                      </div>
                      <div>
                        <strong>Date filter:</strong>{" "}
                        {getDateFilterLabel(dateFilter)}
                      </div>
                    </div>

                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: 14,
                        borderRadius: 16,
                        background: "#f1f5f9",
                        cursor: "pointer"
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={show.selected}
                        onChange={() => toggleSelected(show.malId)}
                        style={{ width: 18, height: 18 }}
                      />
                      <div>
                        <div style={{ fontWeight: 700 }}>Queue for calendar sync</div>
                        <div style={{ color: "#64748b", fontSize: 14 }}>
                          Will be included when you click sync
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && !error && !filteredShows.length && (
          <div
            style={{
              background: "#f8fafc",
              color: "#0f172a",
              borderRadius: 24,
              padding: 24,
              marginTop: 22
            }}
          >
            No shows match your current search and filters.
          </div>
        )}
      </div>
    </div>
  );
}
