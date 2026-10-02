// Install a 15-minute time trigger for scheduledMalSync only after deployment approval.
// Disabled by default: saving this source cannot activate calendar writes.
function scheduledMalSync() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty("MAL_AUTO_SYNC_ENABLED") !== "true") return { enabled: false };
  // Finish every upstream page before considering ANY deletion. Token refresh may take its own lock.
  const items = fetchCurrentUserAnimeList_("");
  items.forEach(function(item) {
    const status = item && (item.list_status || (item.node && item.node.my_list_status));
    if (!item || !item.node || !status || !status.status) throw new Error("Incomplete MAL snapshot; calendar was not changed.");
  });
  const shows = items.map(normalizeMalListItem_);
  validateSyncSnapshot_(shows);
  writeLibraryCache_(shows);
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return { busy: true };
  try {
    const calendar = CalendarApp.getCalendarById(getRequiredSetting_("CALENDAR_ID"));
    if (!calendar) throw new Error("The configured calendar could not be found.");
    const result = reconcileMalCalendar_(calendar, shows, props);
    props.setProperty("MAL_AUTO_SYNC_LAST_RESULT", JSON.stringify({ at: new Date().toISOString(), result: result }));
    return result;
  } finally { lock.releaseLock(); }
}

function validateSyncSnapshot_(shows) {
  const seen = {};
  shows.forEach(function(show) {
    if (!show || !/^\d+$/.test(String(show.malId)) || Number(show.malId) < 1 || seen[show.malId] ||
        ["watching", "completed", "on_hold", "dropped", "plan_to_watch"].indexOf(show.status) < 0) {
      throw new Error("Invalid MAL snapshot; calendar was not changed.");
    }
    seen[show.malId] = true;
  });
}

function reconcileMalCalendar_(calendar, shows, props) {
  validateSyncSnapshot_(shows);
  const current = {}, indexed = {};
  shows.forEach(function(show) { current[String(show.malId)] = show; });
  // Include historic managed events too, so removal is not limited to a future window.
  const events = calendar.getEvents(new Date("1900-01-01T00:00:00Z"), new Date("2200-01-01T00:00:00Z"), { search: "anime-sync:" });
  const budget = { remaining: 100, deadline: Date.now() + 180000 };
  const result = { created: 0, updated: 0, deleted: 0, pending: false };
  for (let i = 0; i < events.length; i++) {
    const event = events[i], description = event.getDescription() || "";
    const match = description.match(/(?:^|\n)Sync Key: (anime-sync:(\d+):ep:(\d+))(?:\s|$)/);
    if (!match || !new RegExp("(?:^|\\n)MAL ID: " + match[2] + "(?:\\s|$)").test(description)) continue;
    const show = current[match[2]];
    if (!show || show.status === "dropped") {
      if (budget.remaining <= 0 || Date.now() >= budget.deadline) { result.pending = true; return result; }
      event.deleteEvent(); budget.remaining--; result.deleted++;
    } else if (!indexed[match[1]]) indexed[match[1]] = event;
  }
  // Rotate through the whole list so a large first import resumes across runs.
  const eligible = shows.filter(function(show) { return show.status !== "dropped"; }).sort(function(a, b) { return Number(a.malId) - Number(b.malId); });
  const cursor = Number(props.getProperty("MAL_AUTO_SYNC_CURSOR")) || 0;
  const start = Math.max(0, eligible.findIndex(function(show) { return Number(show.malId) >= cursor; }));
  for (let offset = 0; offset < eligible.length; offset++) {
    const show = eligible[(start + offset) % eligible.length];
    if (budget.remaining <= 0 || Date.now() >= budget.deadline) {
      props.setProperty("MAL_AUTO_SYNC_CURSOR", String(show.malId)); result.pending = true; return result;
    }
    // Never invent 12 episodes for an unknown-length series during automatic sync.
    if (!hasExactPremiereDate_(show.premiereDate) || !Number.isInteger(show.episodes) || show.episodes < 1) {
      const keys = Object.keys(indexed).filter(function(key) { return key.indexOf("anime-sync:" + show.malId + ":ep:") === 0; });
      for (let k = 0; k < keys.length; k++) {
        const event = indexed[keys[k]], description = buildEpisodeDescription_(show, keys[k]);
        if (event.getDescription() === description) continue;
        if (budget.remaining <= 0 || Date.now() >= budget.deadline) {
          props.setProperty("MAL_AUTO_SYNC_CURSOR", String(show.malId)); result.pending = true; return result;
        }
        event.setDescription(description); budget.remaining--; result.updated++;
      }
      continue;
    }
    const row = syncShowEpisodes_(calendar, show, indexed, budget);
    result.created += row.created; result.updated += row.updated;
    if (row.pending) { props.setProperty("MAL_AUTO_SYNC_CURSOR", String(show.malId)); result.pending = true; return result; }
  }
  props.setProperty("MAL_AUTO_SYNC_CURSOR", "0");
  return result;
}

// Run once in the editor after approving deployment; does not itself write calendar events.
function enableAutomaticSync() {
  PropertiesService.getScriptProperties().setProperty("MAL_AUTO_SYNC_ENABLED", "true");
  console.log("Automatic sync enabled. Install one 15-minute trigger for scheduledMalSync.");
}

