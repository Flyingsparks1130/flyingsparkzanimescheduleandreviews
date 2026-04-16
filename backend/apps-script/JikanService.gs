function getPlannedUpcomingShows_(username) {
  const rawItems = fetchUserAnimeList_(username, "plan_to_watch");
  const today = todayInJst_();

  return rawItems
    .map(normalizeJikanListItem_)
    .filter(function (show) {
      if (!show.premiereDate) return false;
      return new Date(show.premiereDate + "T00:00:00+09:00").getTime() >= today.getTime();
    })
    .sort(function (a, b) {
      return a.premiereDate.localeCompare(b.premiereDate);
    });
}

function fetchUserAnimeList_(username, status) {
  let page = 1;
  const allItems = [];

  while (true) {
    const url =
      CONFIG.JIKAN_BASE +
      "/users/" + encodeURIComponent(username) +
      "/animelist" +
      "?status=" + encodeURIComponent(status) +
      "&limit=100" +
      "&page=" + page;

    const response = UrlFetchApp.fetch(url, {
      method: "get",
      muteHttpExceptions: true,
      headers: {
        Accept: "application/json"
      }
    });

    const code = response.getResponseCode();
    const text = response.getContentText();

    if (code !== 200) {
      throw new Error("Jikan request failed (" + code + "): " + text);
    }

    const payload = JSON.parse(text);
    const data = payload.data || [];
    const pagination = payload.pagination || {};

    for (let i = 0; i < data.length; i++) {
      allItems.push(data[i]);
    }

    if (!pagination.has_next_page) {
      break;
    }

    page += 1;
    Utilities.sleep(1200);
  }

  return allItems;
}

function normalizeJikanListItem_(item) {
  const anime = item.anime || {};
  const aired = anime.aired || {};
  const images = anime.images || {};
  const jpg = images.jpg || {};
  const webp = images.webp || {};
  const broadcast = anime.broadcast || {};

  const premiereDate = aired.from ? String(aired.from).slice(0, 10) : null;
  const duration = parseDurationMinutes_(anime.duration);

  return {
    malId: anime.mal_id || item.mal_id || null,
    title: anime.title || anime.title_english || anime.title_japanese || "Unknown title",
    titleJp: anime.title_japanese || "",
    season: buildSeasonLabel_(anime.season, anime.year),
    premiereDate: premiereDate,
    broadcast: broadcast.string || "",
    episodes: anime.episodes || CONFIG.DEFAULT_EPISODES,
    duration: duration || CONFIG.DEFAULT_DURATION_MINUTES,
    selected: true,
    synced: false,
    image:
      jpg.large_image_url ||
      jpg.image_url ||
      webp.large_image_url ||
      webp.image_url ||
      "",
    confidence: "Imported from Jikan"
  };
}
