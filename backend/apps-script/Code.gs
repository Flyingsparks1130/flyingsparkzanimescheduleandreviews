const CONFIG = {
  MAL_API_BASE: "https://api.myanimelist.net/v2",
  MAL_AUTH_BASE: "https://myanimelist.net/v1/oauth2",
  TIME_ZONE: "Asia/Tokyo",
  DEFAULT_EPISODES: 12,
  DEFAULT_DURATION_MINUTES: 24,
  DEFAULT_START_HOUR_JST: 23,
  DEFAULT_START_MINUTE_JST: 0
};

function doGet(e) {
  try {
    if (e && e.parameter && e.parameter.code) {
      const code = e.parameter.code;
      completeMalAuthorization_(code, e.parameter.state);

      return ContentService
        .createTextOutput("Authorization successful. You can close this tab.")
        .setMimeType(ContentService.MimeType.TEXT);
    }

    const action = e && e.parameter && e.parameter.action
      ? e.parameter.action
      : "health";

    if (action === "health") {
      return jsonOutput_({
        ok: true,
        service: "anime-calendar-backend",
        timeZone: CONFIG.TIME_ZONE
      });
    }

    if (action === "auth-url") {
      const result = buildMalAuthorizationUrl_();
      return jsonOutput_({
        ok: true,
        authorizeUrl: result.authorizeUrl
      });
    }

if (action === "anime-list") {
  const status = e && e.parameter && e.parameter.status ? e.parameter.status : "";
  const refresh = e && e.parameter && e.parameter.refresh === "1";
  const items = getAnimeList_(status, refresh);

  return jsonOutput_({
    ok: true,
    status: status || "all",
    count: items.length,
    items: items
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

