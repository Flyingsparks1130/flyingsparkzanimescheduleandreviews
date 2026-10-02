export const STATUS = {
  watching: { label: "Watching", color: "#86cdbb" },
  plan_to_watch: { label: "Plan to watch", color: "#b5a0ee" },
  completed: { label: "Completed", color: "#8eb7e3" },
  on_hold: { label: "On hold", color: "#e5be7f" },
  dropped: { label: "Dropped", color: "#e59a9a" },
};
export function normalizeStatus(value) {
  const key = String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_");
  const aliases = {
    1: "watching",
    2: "completed",
    3: "on_hold",
    4: "dropped",
    6: "plan_to_watch",
    currently_watching: "watching",
    complete: "completed",
    planning: "plan_to_watch",
    ptw: "plan_to_watch",
    paused: "on_hold",
  };
  return STATUS[key] ? key : aliases[key] || "plan_to_watch";
}
export function names(value) {
  return Array.isArray(value)
    ? value
        .map((v) => (typeof v === "object" ? v?.name : v))
        .filter(Boolean)
        .join(", ")
    : typeof value === "string"
      ? value
      : "";
}
export function exactDate(value) {
  const text = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return "";
  const date = new Date(`${text}T12:00:00Z`);
  return Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === text
    ? text
    : "";
}
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function formatDate(value, options = {}) {
  return exactDate(value)
    ? new Date(`${exactDate(value)}T12:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        ...options,
      })
    : "Date to be announced";
}
function number(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
function imageUrl(value) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}
export function normalizeShow(raw, index) {
  const anime = raw.node || raw.anime || raw;
  const list = raw.list_status || anime.my_list_status || raw;
  const malId = number(raw.malId || anime.mal_id || anime.id || raw.anime_id);
  const premiereDate = exactDate(
    raw.premiereDate ||
      raw.premiere_date ||
      anime.start_date ||
      raw.anime_start_date ||
      anime.aired?.from,
  );
  const title = String(
    anime.title || raw.anime_title || raw.name || "Untitled",
  );
  const titleJp = String(
    raw.titleJp || anime.title_japanese || anime.alternative_titles?.ja || "",
  );
  const genre = names(anime.genre || anime.genres || raw.anime_genres);
  const studio = names(anime.studio || anime.studios || raw.anime_studios);
  const status = normalizeStatus(
    list.status || raw.my_status || raw.watching_status,
  );
  const broadcast =
    typeof anime.broadcast === "string"
      ? anime.broadcast
      : anime.broadcast?.string ||
        (anime.broadcast?.start_time
          ? `${anime.broadcast.day_of_the_week || ""} ${anime.broadcast.start_time} (JST)`
          : "");
  return {
    id: malId ? String(malId) : `unknown-${index}-${title}`,
    malId,
    title,
    titleJp,
    status,
    score: Math.min(10, number(list.score ?? raw.my_score)),
    genre,
    studio,
    year: number(
      anime.year ||
        anime.start_season?.year ||
        raw.start_year ||
        premiereDate.slice(0, 4),
    ),
    premiereDate,
    broadcast,
    season:
      typeof raw.season === "string"
        ? raw.season
        : names(anime.start_season?.season),
    episodes: number(
      anime.episodes ?? anime.num_episodes ?? raw.anime_num_episodes,
    ),
    duration:
      number(
        raw.duration ||
          (anime.average_episode_duration
            ? anime.average_episode_duration / 60
            : 0),
      ) || 24,
    watched: number(
      list.num_episodes_watched || raw.numEpisodesWatched || raw.watched,
    ),
    image: imageUrl(
      raw.image ||
        raw.image_url ||
        anime.main_picture?.medium ||
        anime.main_picture?.large ||
        anime.images?.webp?.image_url ||
        anime.images?.jpg?.image_url ||
        raw.anime_image,
    ),
    synopsis: String(anime.synopsis || anime.background || ""),
    type: String(anime.media_type || raw.mediaType || anime.type || ""),
    searchText:
      `${title} ${titleJp} ${genre} ${studio} ${status}`.toLowerCase(),
    _raw: raw,
  };
}
export function extractShows(data) {
  const rows = Array.isArray(data)
    ? data
    : [data?.items, data?.anime, data?.data, data?.list, data?.shows].find(
        Array.isArray,
      );
  if (!rows)
    throw new Error(
      "The backend returned an unexpected library format. Your saved library has been kept.",
    );
  if (rows.some((row) => !row || typeof row !== "object" || Array.isArray(row)))
    throw new Error("The backend returned an invalid library entry.");
  const unique = new Map();
  rows.forEach((raw, index) => {
    const show = normalizeShow(raw, index);
    unique.set(show.id, show);
  });
  return [...unique.values()];
}
export function filterShows(
  shows,
  { query = "", status = "all", date = "all", sort = "title" },
  today = localDay(),
) {
  const term = query.trim().toLowerCase();
  const month = today.slice(0, 7);
  return shows
    .filter(
      (show) =>
        (status === "all" || show.status === status) &&
        (!term || show.searchText.includes(term)) &&
        (date === "all" ||
          (date === "upcoming" && show.premiereDate >= today) ||
          (date === "month" && show.premiereDate.startsWith(month)) ||
          (date === "unknown" && !show.premiereDate)),
    )
    .sort((a, b) => {
      if (sort === "score")
        return b.score - a.score || a.title.localeCompare(b.title);
      if (sort === "newest" || sort === "oldest") {
        if (!a.premiereDate)
          return b.premiereDate ? 1 : a.title.localeCompare(b.title);
        if (!b.premiereDate) return -1;
        return (
          (sort === "newest" ? -1 : 1) *
            a.premiereDate.localeCompare(b.premiereDate) ||
          a.title.localeCompare(b.title)
        );
      }
      return a.title.localeCompare(b.title);
    });
}
export function canSync(show) {
  return (
    !!show.malId &&
    !!show.premiereDate &&
    ["watching", "plan_to_watch"].includes(show.status)
  );
}
export function syncPayload(show) {
  return {
    ...show._raw,
    malId: show.malId,
    title: show.title,
    titleJp: show.titleJp,
    premiereDate: show.premiereDate,
    broadcast: show.broadcast,
    episodes: show.episodes,
    duration: show.duration,
    season: show.season,
    selected: true,
  };
}
export function syncSummary(response) {
  const result = response?.result || response;
  if (
    ["created", "updated", "skipped"].some((key) =>
      Number.isFinite(result?.[key]),
    )
  )
    return `${result.created || 0} events created · ${result.updated || 0} updated · ${result.skipped || 0} skipped`;
  return (
    response?.message ||
    response?.msg ||
    "The server accepted the sync request. Check Google Calendar to confirm the events."
  );
}
