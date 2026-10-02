import { exactDate, localDay } from "./library.js";

export const SCHEDULE_STATUSES = ["watching", "plan_to_watch", "on_hold"];
const WEEK = 7 * 86400000;
const SEASONS = { winter: 1, spring: 4, summer: 7, fall: 10, autumn: 10 };
const pad = (value) => String(value).padStart(2, "0");
function monthLabel(year, month) {
  return new Date(`${year}-${pad(month)}-01T12:00:00`).toLocaleDateString(
    undefined,
    { month: "long", year: "numeric" },
  );
}

// Partial dates remain windows, never fabricated premiere days.
export function releaseWindow(show) {
  const raw = String(show.startDate || show.premiereDate || "");
  const month = raw.match(/^(\d{4})-(\d{2})$/);
  if (month && Number(month[2]) >= 1 && Number(month[2]) <= 12) {
    const end = new Date(Date.UTC(Number(month[1]), Number(month[2]), 0))
      .toISOString()
      .slice(0, 10);
    return {
      precision: "month",
      label: monthLabel(month[1], month[2]),
      start: `${raw}-01`,
      end,
    };
  }
  const year =
    Number(show.year) ||
    Number(raw.match(/^(\d{4})(?:$|-)/)?.[1]) ||
    Number(String(show.season || "").match(/\b(\d{4})\b/)?.[1]);
  const season = String(show.season || "")
    .toLowerCase()
    .match(/\b(winter|spring|summer|fall|autumn)\b/)?.[1];
  if (year >= 1900 && year <= 2200) {
    if (season) {
      const first = SEASONS[season];
      return {
        precision: "season",
        label: `${season === "autumn" ? "Fall" : season[0].toUpperCase() + season.slice(1)} ${year}`,
        start: `${year}-${pad(first)}-01`,
        end: new Date(Date.UTC(year, first + 2, 0)).toISOString().slice(0, 10),
      };
    }
    return {
      precision: "year",
      label: String(year),
      start: `${year}-01-01`,
      end: `${year}-12-31`,
    };
  }
  return { precision: "tbd", label: "TBD", start: "", end: "" };
}

export function buildSchedule(shows, today = localDay()) {
  const entries = [];
  for (const show of shows) {
    if (!SCHEDULE_STATUSES.includes(show.status)) continue;
    const premiere = exactDate(show.premiereDate);
    if (premiere) {
      const time = String(show.broadcast || "").match(/\b(\d{1,2}):(\d{2})\b/);
      const hour =
        time && Number(time[1]) < 24 && Number(time[2]) < 60
          ? pad(time[1])
          : "23";
      const minute =
        time && Number(time[1]) < 24 && Number(time[2]) < 60 ? time[2] : "00";
      const first = new Date(
        `${premiere}T${hour}:${minute}:00+09:00`,
      ).getTime();
      const knownCount = Number.isInteger(show.episodes) && show.episodes > 0;
      if (!knownCount) {
        const day = localDay(new Date(first));
        if (day >= today)
          entries.push({
            id: `${show.id}:expected`,
            show,
            episode: null,
            day,
            at: new Date(first).toISOString(),
            precision: "day",
            label: monthLabel(day.slice(0, 4), day.slice(5, 7)),
            group: day.slice(0, 7),
            sortDate: day,
            detail: "Premiere · Episode count TBD",
          });
        continue;
      }
      const total = Math.min(show.episodes, 2500);
      for (
        let episode = Math.max(1, Math.floor(show.watched || 0) + 1);
        episode <= total;
        episode++
      ) {
        const at = new Date(first + (episode - 1) * WEEK),
          day = localDay(at);
        if (day < today) continue;
        entries.push({
          id: `${show.id}:ep:${episode}`,
          show,
          episode,
          day,
          at: at.toISOString(),
          precision: "day",
          label: monthLabel(day.slice(0, 4), day.slice(5, 7)),
          group: day.slice(0, 7),
          sortDate: day,
          detail: `Episode ${episode}${knownCount ? ` of ${total}` : " · total TBD"} · Estimated weekly airing${time ? ` · ${at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}` : " · time TBD"}`,
        });
      }
      continue;
    }
    const window = releaseWindow(show);
    if (window.end && window.end < today) continue;
    entries.push({
      id: `${show.id}:expected`,
      show,
      episode: null,
      day: "",
      precision: window.precision,
      label: window.label,
      group: `expected:${window.label}`,
      sortDate: window.start
        ? window.start < today
          ? today
          : window.start
        : "9999-12-31",
      window,
      detail: `${window.precision === "tbd" ? "Release date TBD" : `Expected ${window.label}`} · Episode schedule TBD`,
    });
  }
  return entries.sort(
    (a, b) =>
      a.sortDate.localeCompare(b.sortDate) ||
      (a.precision === "day" ? 0 : 1) - (b.precision === "day" ? 0 : 1) ||
      a.group.localeCompare(b.group) ||
      (a.at || "").localeCompare(b.at || "") ||
      a.show.title.localeCompare(b.show.title),
  );
}

export function filterSchedule(
  entries,
  { query = "", status = "all", date = "all" },
  today = localDay(),
) {
  const term = query.trim().toLowerCase(),
    month = today.slice(0, 7);
  return entries.filter(
    (entry) =>
      (status === "all" || entry.show.status === status) &&
      (!term || entry.show.searchText.includes(term)) &&
      (date === "all" ||
        date === "upcoming" ||
        (date === "unknown" && !entry.day) ||
        (date === "month" &&
          (entry.day.startsWith(month) ||
            (entry.precision === "month" &&
              entry.window.start.startsWith(month))))),
  );
}
