function legacyDescriptionText_(value) {
  return String(value || "").replace(/<br\s*\/?\s*>/gi, "\n").replace(/<\/(?:p|div)>/gi, "\n").replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'");
}

function legacyTitleKey_(value) {
  return String(value || "").normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");
}

function planLegacyIdentifiers_(events, shows) {
  const aliases = {}, occupied = {}, plans = [], review = [];
  shows.forEach(function(show) {
    [show.title, show.titleEn, show.titleJp].forEach(function(title) {
      const key = legacyTitleKey_(title);
      if (!key || key === "na") return;
      if (!aliases[key]) aliases[key] = {};
      aliases[key][show.malId] = show;
    });
  });
  events.forEach(function(event) {
    const match = (event.getDescription() || "").match(/(?:^|\n)Sync Key: (anime-sync:\d+:ep:\d+)(?:\s|$)/);
    if (match) occupied[match[1]] = true;
  });
  events.forEach(function(event) {
    const originalDescription = event.getDescription() || "", description = legacyDescriptionText_(originalDescription), title = event.getTitle() || "";
    if (/Sync Key:|MAL ID:/i.test(description)) return;
    // Require the known legacy template, never adopt an unrelated personal event by title alone.
    if (!/(?:^|\n)\s*(?:JP Kanji Title|JP Title):/i.test(description) || !/(?:^|\n)\s*(?:Eng Title|English Title):/i.test(description)) return;
    const episode = title.match(/^(.*?)\s*(?:-\s*)?Ep\.\s*(\d+)\s*$/i);
    if (!episode) { review.push({ title: title, reason: "No exact episode number" }); return; }
    const labels = [episode[1]];
    const lines = description.matchAll(/(?:^|\n)\s*(?:JP Kanji Title|JP Title|Eng Title|English Title):\s*([^\r\n]+)/gi);
    for (const line of lines) labels.push(line[1]);
    const votes = {}, sources = {};
    labels.forEach(function(label) {
      const key = legacyTitleKey_(label);
      if (sources[key]) return;
      sources[key] = true;
      Object.keys(aliases[key] || {}).forEach(function(id) { votes[id] = (votes[id] || 0) + 1; });
    });
    const candidates = Object.keys(votes).filter(function(id) { return votes[id] >= 2; });
    if (candidates.length !== 1 || Object.keys(votes).some(function(id) { return id !== candidates[0]; })) {
      review.push({ title: title, reason: "Titles do not uniquely corroborate one MAL show" }); return;
    }
    const id = candidates[0], show = shows.find(function(item) { return String(item.malId) === id; }), number = Number(episode[2]);
    if (!number || !Number.isInteger(number) || number > 2500 || (show.episodes > 0 && number > show.episodes)) {
      review.push({ title: title, reason: "Episode outside known MAL range" }); return;
    }
    const key = "anime-sync:" + id + ":ep:" + number;
    plans.push({ event: event, title: title, malId: id, key: key, description: originalDescription });
  });
  const counts = {};
  plans.forEach(function(plan) { counts[plan.key] = (counts[plan.key] || 0) + 1; });
  const matches = plans.filter(function(plan) {
    if (occupied[plan.key] || counts[plan.key] > 1) { review.push({ title: plan.title, reason: "Identifier collision: " + plan.key }); return false; }
    return true;
  });
  return { matches: matches, review: review };
}

function previewLegacyIdentifiers() { return runLegacyIdentifiers_(false); }
function applyLegacyIdentifiers() { return runLegacyIdentifiers_(true); }

function runLegacyIdentifiers_(apply) {
  const shows = getAnimeList_("", true);
  validateSyncSnapshot_(shows);
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) throw new Error("Sync is running. Retry after it completes.");
  try {
    const calendar = CalendarApp.getCalendarById(getRequiredSetting_("CALENDAR_ID"));
    if (!calendar) throw new Error("Calendar not found.");
    const events = calendar.getEvents(new Date("1900-01-01T00:00:00Z"), new Date("2200-01-01T00:00:00Z"));
    const plan = planLegacyIdentifiers_(events, shows);
    let changed = 0;
    const deadline = Date.now() + 180000;
    if (apply) {
      for (const item of plan.matches) {
        if (changed >= 300 || Date.now() >= deadline) break;
        item.event.setDescription(item.description.trimEnd() + "\nMAL ID: " + item.malId + "\nSync Key: " + item.key);
        changed++;
      }
    }
    const summary = { apply: apply, scanned: events.length, matched: plan.matches.length, changed: changed, remaining: plan.matches.length - changed,
      reviewCount: plan.review.length, sampleMatches: plan.matches.slice(0, 5).map(function(item) { return { title: item.title, key: item.key }; }), review: plan.review.slice(0, 12), reviewReasons: plan.review.reduce(function(counts, item) { counts[item.reason] = (counts[item.reason] || 0) + 1; return counts; }, {}) };
    console.log(JSON.stringify(summary));
    return summary;
  } finally { lock.releaseLock(); }
}

function pauseSyncForMigration() {
  const props = PropertiesService.getScriptProperties();
  props.setProperty("MAL_AUTO_SYNC_ENABLED", "false");
  console.log("Automatic sync paused for identifier migration.");
}

