const CONFIG = {
  JIKAN_BASE: "https://api.jikan.moe/v4",
  TIME_ZONE: "Asia/Tokyo",
  DEFAULT_EPISODES: 12,
  DEFAULT_DURATION_MINUTES: 24,
  DEFAULT_START_HOUR_JST: 22,
  DEFAULT_START_MINUTE_JST: 0
};

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || "health";

    if (action === "health") {
      return jsonOutput_({
        ok: true,
        service: "anime-calendar-backend",
        timeZone: CONFIG.TIME_ZONE
      });
    }

    if (action === "planned-upcoming") {
      const username = getRequiredSetting_("MAL_USERNAME");
      const shows = getPlannedUpcomingShows_(username);

      return jsonOutput_({
        ok: true,
        count: shows.length,
        shows: shows
      });
    }

    return jsonOutput_({
      ok: false,
      error: "Unknown action: " + action
    });
  } catch (error) {
    return jsonOutput_({
      ok: false,
      error: String(error && error.message ? error.message : error)
    });
  }
}

function doPost(e) {
  try {
    const body = e && e.postData && e.postData.contents
      ? JSON.parse(e.postData.contents)
      : {};

    const action = body.action || "";

    if (action === "sync-selected") {
      const shows = Array.isArray(body.shows) ? body.shows : [];
      const result = syncSelectedShows_(shows);

      return jsonOutput_({
        ok: true,
        result: result
      });
    }

    return jsonOutput_({
      ok: false,
      error: "Unknown action: " + action
    });
  } catch (error) {
    return jsonOutput_({
      ok: false,
      error: String(error && error.message ? error.message : error)
    });
  }
}
