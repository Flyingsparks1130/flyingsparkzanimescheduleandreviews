function getAnimeList_(status, forceRefresh) {
  const filter = normalizeRequestedStatus_(status);
  const shows = getAllAnimeListCached_(!!forceRefresh);
  return filter ? shows.filter(function(show) { return show.status === filter; }) : shows;
}

function getAllAnimeListCached_(forceRefresh) {
  const cached = forceRefresh ? null : readLibraryCache_();
  if (cached !== null) return cached;
  const shows = fetchCurrentUserAnimeList_("").map(normalizeMalListItem_);
  writeLibraryCache_(shows);
  return shows;
}

function libraryCacheKey_() {
  return "mal_library_v2:" + (PropertiesService.getScriptProperties().getProperty("MAL_CACHE_GENERATION") || "initial");
}

function readLibraryCache_() {
  try {
    const cache = CacheService.getScriptCache();
    const manifest = JSON.parse(cache.get(libraryCacheKey_()) || "null");
    if (!manifest || !Array.isArray(manifest.keys) || !manifest.keys.length) return null;
    const chunks = cache.getAll(manifest.keys);
    if (manifest.keys.some(function(key) { return typeof chunks[key] !== "string"; })) return null;
    const encoded = manifest.keys.map(function(key) { return chunks[key]; }).join("");
    const text = Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(encoded), "application/x-gzip", "library.json.gz")).getDataAsString("UTF-8");
    const shows = JSON.parse(text);
    return Array.isArray(shows) ? shows : null;
  } catch (error) { return null; }
}

function writeLibraryCache_(shows) {
  try {
    const cache = CacheService.getScriptCache();
    const key = libraryCacheKey_();
    const encoded = Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(JSON.stringify(shows), "application/json" )).getBytes());
    const generation = Utilities.getUuid();
    const chunks = {}, keys = [];
    // Base64 is ASCII: 80,000 characters stays below Apps Script's 100 KB entry limit.
    for (let offset = 0; offset < encoded.length; offset += 80000) {
      const chunkKey = key + ":" + generation + ":" + keys.length;
      keys.push(chunkKey); chunks[chunkKey] = encoded.slice(offset, offset + 80000);
    }
    if (keys.length > 100) return; // Cache is optional; never fail the library for a size/quota limit.
    cache.putAll(chunks, 900);
    // Publish the manifest last, using immutable generation-specific chunks.
    cache.put(key, JSON.stringify({ keys: keys }), 900);
  } catch (error) { /* Successful upstream data is still returned when cache storage fails. */ }
}

function clearAnimeListCache_() { CacheService.getScriptCache().remove(libraryCacheKey_()); }

function fetchCurrentUserAnimeList_(status) {
  const fields = ["alternative_titles", "start_date", "num_episodes", "broadcast", "average_episode_duration", "main_picture", "start_season", "media_type", "mean", "rank", "popularity", "studios", "genres", "synopsis", "list_status", "my_list_status"];
  let url = CONFIG.MAL_API_BASE + "/users/@me/animelist?limit=1000&sort=list_updated_at&fields=" + encodeURIComponent(fields.join(","));
  if (status) url += "&status=" + encodeURIComponent(normalizeRequestedStatus_(status));
  const items = [], visited = {};
  while (url) {
    if (visited[url]) throw new Error("MyAnimeList returned a repeated page. Please try again later.");
    visited[url] = true;
    const payload = fetchMalJson_(url);
    if (!Array.isArray(payload.data)) throw new Error("MyAnimeList returned an unexpected library response.");
    Array.prototype.push.apply(items, payload.data);
    url = payload.paging && payload.paging.next ? payload.paging.next : null;
  }
  return items;
}

function normalizeMalListItem_(item) {
  const node = item.node || {}, alt = node.alternative_titles || {}, broadcast = node.broadcast || {};
  const picture = node.main_picture || {}, season = node.start_season || {};
  const status = item.list_status || node.my_list_status || {};
  return {
    malId: node.id || null, title: node.title || alt.en || alt.ja || "Unknown title", titleEn: alt.en || "", titleJp: alt.ja || "",
    season: buildSeasonLabel_(season.season, season.year), year: Number(season.year) || 0,
    premiereDate: node.start_date ? String(node.start_date).trim() : "",
    broadcast: [broadcast.day_of_the_week, broadcast.start_time].filter(Boolean).join(" "),
    episodes: Number(node.num_episodes) || 0,
    duration: node.average_episode_duration ? Math.max(1, Math.round(Number(node.average_episode_duration) / 60)) : CONFIG.DEFAULT_DURATION_MINUTES,
    selected: false, image: picture.medium || picture.large || "", confidence: "Imported from MAL",
    status: status.status || "plan_to_watch", score: Number(status.score) || 0,
    numEpisodesWatched: Number(status.num_episodes_watched) || 0, isRewatching: !!status.is_rewatching, updatedAt: status.updated_at || "",
    mediaType: node.media_type || "", meanScore: Number(node.mean) || null, rank: Number(node.rank) || null,
    popularity: Number(node.popularity) || null, synopsis: node.synopsis || "",
    studios: normalizeNames_(node.studios), genres: normalizeNames_(node.genres)
  };
}

function normalizeNames_(items) { return (items || []).filter(function(item) { return item && item.name; }).map(function(item) { return item.name; }); }
function normalizeRequestedStatus_(status) {
  const value = String(status || "").trim().toLowerCase();
  if (!value || value === "all") return "";
  if (["watching", "completed", "on_hold", "dropped", "plan_to_watch"].indexOf(value) < 0) throw new Error("Invalid MAL status.");
  return value;
}

/** Read-only diagnostic: warms the cache and reports durations, without logging the library. */
function checkLibraryPerformance() {
  const start = Date.now();
  const shows = getAnimeList_("", true);
  const freshMs = Date.now() - start;
  const cacheAvailable = readLibraryCache_() !== null;
  const cachedStart = Date.now();
  const cached = getAnimeList_("", false);
  console.log(JSON.stringify({ shows: shows.length, cachedShows: cached.length, cacheAvailable: cacheAvailable, freshMs: freshMs, cachedMs: Date.now() - cachedStart }));
}
