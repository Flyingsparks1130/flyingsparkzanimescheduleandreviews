function syncSelectedShows_(shows) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) throw new Error("Another sync is running. Check the calendar and try again shortly.");
  try {
    const calendar = CalendarApp.getCalendarById(getRequiredSetting_("CALENDAR_ID"));
    if (!calendar) throw new Error("The configured calendar could not be found.");
    const seen = {};
    const selected = (shows || []).filter(function(show) {
      if (!show || !show.selected || seen[show.malId]) return false;
      seen[show.malId] = true; return true;
    });
    const result = { totalShows: selected.length, created: 0, updated: 0, skipped: 0, results: [] };
    selected.forEach(function(show) {
      const row = syncShowEpisodes_(calendar, show);
      result.created += row.created; result.updated += row.updated; result.skipped += row.skipped; result.results.push(row);
    });
    return result;
  } finally { lock.releaseLock(); }
}

function syncShowEpisodes_(calendar, show) {
  const result = { malId: show && show.malId, title: show && show.title || "Unknown", created: 0, updated: 0, skipped: 0 };
  if (!show || !/^\d+$/.test(String(show.malId)) || Number(show.malId) < 1 || !hasExactPremiereDate_(show.premiereDate)) {
    result.skipped = 1; result.reason = "A valid MAL ID and exact premiere date are required."; return result;
  }
  const total = Number(show.episodes) || CONFIG.DEFAULT_EPISODES;
  const duration = Number(show.duration) || CONFIG.DEFAULT_DURATION_MINUTES;
  if (!Number.isInteger(total) || total < 1 || total > 2500 || !Number.isFinite(duration) || duration < 1 || duration > 600) {
    result.skipped = 1; result.reason = "Invalid episode count or duration."; return result;
  }
  const first = buildEpisodeStart_(show, 1), last = buildEpisodeStart_(show, total);
  const prefix = "anime-sync:" + show.malId + ":ep:";
  // One search per series replaces one search per episode. Match exact keys after search.
  const existing = calendar.getEvents(new Date(first.getTime() - 7 * 86400000), new Date(last.getTime() + 7 * 86400000), { search: prefix });
  const indexed = {};
  existing.forEach(function(event) {
    const match = (event.getDescription() || "").match(/Sync Key: (anime-sync:\d+:ep:\d+)(?:\s|$)/);
    if (match && !indexed[match[1]]) indexed[match[1]] = event;
  });
  for (let episode = 1; episode <= total; episode++) {
    const start = buildEpisodeStart_(show, episode), end = new Date(start.getTime() + duration * 60000);
    const key = prefix + episode, title = (show.title || "Anime") + " Ep. " + episode;
    const description = buildEpisodeDescription_(show, key);
    const event = indexed[key];
    if (!event) { calendar.createEvent(title, start, end, { description: description }); result.created++; continue; }
    let changed = false;
    if (event.getTitle() !== title) { event.setTitle(title); changed = true; }
    if (event.getStartTime().getTime() !== start.getTime() || event.getEndTime().getTime() !== end.getTime()) { event.setTime(start, end); changed = true; }
    if (event.getDescription() !== description) { event.setDescription(description); changed = true; }
    if (changed) result.updated++; else result.skipped++;
  }
  return result;
}

function buildEpisodeDescription_(show, key) {
  return "JP Title: " + (show.titleJp || "N/A") + "\nEnglish Title: " + (show.titleEn || "N/A") +
    "\nSeason: " + (show.season || "N/A") + "\nPremiere: " + show.premiereDate +
    "\nBroadcast: " + (show.broadcast || "N/A") + "\nEpisodes: " + (show.episodes != null ? show.episodes : "N/A") +
    "\nDuration: " + (show.duration != null ? show.duration : "N/A") + " min\nScore: " + (show.score != null ? show.score : "N/A") +
    "\nStatus: " + (show.status || "N/A") + "\nMAL ID: " + show.malId + "\nSync Key: " + key;
}

function buildEpisodeStart_(show, episode) {
  // Fixed elapsed weeks preserve JST dates even if the runtime's local timezone uses DST.
  return new Date(buildPremiereDateTime_(show).getTime() + (episode - 1) * 7 * 86400000);
}
function buildPremiereDateTime_(show) {
  if (!hasExactPremiereDate_(show.premiereDate)) throw new Error("Premiere date is not exact.");
  const time = extractTimeFromBroadcast_(show.broadcast);
  const hour = time ? time.hour : CONFIG.DEFAULT_START_HOUR_JST;
  const minute = time ? time.minute : CONFIG.DEFAULT_START_MINUTE_JST;
  if (hour > 23 || minute > 59) throw new Error("Invalid broadcast time.");
  return new Date(show.premiereDate + "T" + pad2_(hour) + ":" + pad2_(minute) + ":00+09:00");
}
