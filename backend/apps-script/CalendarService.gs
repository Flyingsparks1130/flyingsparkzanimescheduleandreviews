function syncSelectedShows_(shows) {
  const calendarName = getRequiredSetting_("CALENDAR_NAME");
  const calendar = getCalendarByName_(calendarName);

  if (!calendar) {
    throw new Error("Calendar not found: " + calendarName);
  }

  const selected = shows.filter(function (show) {
    return !!show.selected;
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const results = [];

  for (let i = 0; i < selected.length; i++) {
    const result = syncShowEpisodes_(calendar, selected[i]);
    created += result.created;
    updated += result.updated;
    skipped += result.skipped;
    results.push(result);
    Utilities.sleep(100);
  }

  return {
    totalShows: selected.length,
    created: created,
    updated: updated,
    skipped: skipped,
    results: results
  };
}

function syncShowEpisodes_(calendar, show) {
  if (!show.premiereDate) {
    return {
      title: show.title || "Unknown",
      created: 0,
      updated: 0,
      skipped: 1,
      reason: "Missing premiere date"
    };
  }

  const totalEpisodes = Number(show.episodes) || CONFIG.DEFAULT_EPISODES;
  const durationMinutes = Number(show.duration) || CONFIG.DEFAULT_DURATION_MINUTES;

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let ep = 1; ep <= totalEpisodes; ep++) {
    const start = buildEpisodeStart_(show, ep);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    const syncKey = "anime-sync:" + show.malId + ":ep:" + ep;
    const title = (show.title || "Anime") + " Ep. " + ep;

    const description =
      "JP Title: " + (show.titleJp || "N/A") + "\n" +
      "Season: " + (show.season || "N/A") + "\n" +
      "Premiere: " + (show.premiereDate || "N/A") + "\n" +
      "Broadcast: " + (show.broadcast || "N/A") + "\n" +
      "MAL ID: " + (show.malId || "N/A") + "\n" +
      "Sync Key: " + syncKey;

    const searchStart = new Date(start.getTime() - 12 * 60 * 60 * 1000);
    const searchEnd = new Date(start.getTime() + 12 * 60 * 60 * 1000);

    const existing = calendar.getEvents(searchStart, searchEnd, { search: syncKey });

    if (existing.length > 0) {
      const event = existing[0];
      event.setTitle(title);
      event.setTime(start, end);
      event.setDescription(description);
      updated += 1;
    } else {
      calendar.createEvent(title, start, end, {
        description: description
      });
      created += 1;
    }
  }

  return {
    title: show.title || "Unknown",
    created: created,
    updated: updated,
    skipped: skipped
  };
}

function buildEpisodeStart_(show, episodeNumber) {
  const base = buildPremiereDateTime_(show);
  const eventDate = new Date(base.getTime());
  eventDate.setDate(eventDate.getDate() + (episodeNumber - 1) * 7);
  return eventDate;
}

function buildPremiereDateTime_(show) {
  const time = extractTimeFromBroadcast_(show.broadcast);

  const hour = time ? time.hour : CONFIG.DEFAULT_START_HOUR_JST;
  const minute = time ? time.minute : CONFIG.DEFAULT_START_MINUTE_JST;

  return new Date(
    show.premiereDate +
      "T" +
      pad2_(hour) +
      ":" +
      pad2_(minute) +
      ":00+09:00"
  );
}

function getCalendarByName_(name) {
  const calendars = CalendarApp.getAllCalendars();
  for (let i = 0; i < calendars.length; i++) {
    if (calendars[i].getName() === name) {
      return calendars[i];
    }
  }
  return null;
}
