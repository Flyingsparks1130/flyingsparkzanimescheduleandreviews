import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { randomBytes, randomUUID } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";

function backend() {
  const properties = new Map(
    Object.entries({
      MAL_CLIENT_ID: "test-client",
      MAL_CLIENT_SECRET: "test-secret",
      MAL_ACCESS_TOKEN: "old-token",
      MAL_REFRESH_TOKEN: "refresh-token",
      MAL_REDIRECT_URI: "https://example.com/callback",
      CALENDAR_ID: "test-calendar",
    }),
  );
  const cache = new Map();
  const blob = (value) => ({
    getBytes: () => Buffer.from(value),
    getDataAsString: () => Buffer.from(value).toString("utf8"),
  });
  const context = vm.createContext({
    console,
    Date,
    JSON,
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key) => properties.get(key) || null,
        setProperty: (key, value) => properties.set(key, value),
        setProperties: (values, erase) => {
          if (erase) properties.clear();
          Object.entries(values).forEach(([key, value]) =>
            properties.set(key, value),
          );
        },
      }),
    },
    CacheService: {
      getScriptCache: () => ({
        get: (key) => cache.get(key) || null,
        getAll: (keys) =>
          Object.fromEntries(
            keys
              .filter((key) => cache.has(key))
              .map((key) => [key, cache.get(key)]),
          ),
        put: (key, value) => {
          assert.ok(Buffer.byteLength(value) < 100000);
          cache.set(key, value);
        },
        putAll: (values) =>
          Object.entries(values).forEach(([key, value]) => {
            assert.ok(Buffer.byteLength(value) < 100000);
            cache.set(key, value);
          }),
        remove: (key) => cache.delete(key),
      }),
    },
    Utilities: {
      getUuid: randomUUID,
      newBlob: (value) => blob(value),
      gzip: (value) => blob(gzipSync(value.getBytes())),
      ungzip: (value) => blob(gunzipSync(value.getBytes())),
      base64Encode: (value) => Buffer.from(value).toString("base64"),
      base64Decode: (value) => Buffer.from(value, "base64"),
    },
    LockService: {
      getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }),
    },
    UrlFetchApp: {
      fetch() {
        throw new Error("Unexpected network call");
      },
    },
    CalendarApp: {
      getCalendarById() {
        throw new Error("Calendar must not be read while loading the library");
      },
    },
  });
  for (const name of [
    "Code",
    "Utils",
    "MalAuthService",
    "MalService",
    "CalendarService",
  ])
    vm.runInContext(
      fs.readFileSync(
        new URL(`../../backend/apps-script/${name}.gs`, import.meta.url),
        "utf8",
      ),
      context,
    );
  return { context, properties, cache };
}
const reply = (status, body) => ({
  getResponseCode: () => status,
  getContentText: () => JSON.stringify(body),
});

test("token refresh preserves configuration and retries an expired request exactly once", () => {
  const { context, properties } = backend();
  const calls = [];
  context.UrlFetchApp.fetch = (url, options) => {
    calls.push({ url, options });
    if (url.endsWith("/token"))
      return reply(200, {
        access_token: "new-token",
        refresh_token: "new-refresh",
        expires_in: 3600,
      });
    return options.headers.Authorization === "Bearer old-token"
      ? reply(401, { error: "invalid_token" })
      : reply(200, { data: [] });
  };
  context.fetchMalJson_("https://api.myanimelist.net/v2/users/@me/animelist");
  assert.equal(calls.length, 3);
  assert.equal(calls[1].options.payload.grant_type, "refresh_token");
  assert.equal(properties.get("MAL_CLIENT_ID"), "test-client");
  assert.equal(properties.get("CALENDAR_ID"), "test-calendar");
  assert.equal(properties.get("MAL_REFRESH_TOKEN"), "new-refresh");
  assert.ok(Number(properties.get("MAL_TOKEN_EXPIRES_AT")) > Date.now());
});

test("failed refresh exposes no raw secrets and rejects foreign paging hosts", () => {
  const { context } = backend();
  let calls = 0;
  context.UrlFetchApp.fetch = () => {
    calls++;
    return reply(401, { error: "SECRET_SENTINEL" });
  };
  assert.throws(
    () =>
      context.fetchMalJson_(
        "https://api.myanimelist.net/v2/users/@me/animelist",
      ),
    (error) =>
      /Reconnect/.test(error.message) && !/SECRET_SENTINEL/.test(error.message),
  );
  assert.equal(calls, 2);
  assert.throws(
    () =>
      context.fetchMalJson_(
        "https://api.myanimelist.net.evil.example/v2/users/@me/animelist",
      ),
    /paging URL/,
  );
  assert.equal(calls, 2);
});

test("OAuth verifies expiring state, preserves settings, and invalidates prior account cache", () => {
  const { context, properties } = backend();
  const url = new URL(context.buildMalAuthorizationUrl_().authorizeUrl);
  assert.ok(url.searchParams.get("code_challenge").length >= 43);
  assert.throws(
    () => context.completeMalAuthorization_("code", "missing"),
    /state/,
  );
  context.UrlFetchApp.fetch = () =>
    reply(200, {
      access_token: "new",
      refresh_token: "new-refresh",
      expires_in: 300,
    });
  context.completeMalAuthorization_("code", url.searchParams.get("state"));
  assert.equal(properties.get("MAL_CLIENT_SECRET"), "test-secret");
  assert.ok(properties.get("MAL_CACHE_GENERATION"));
  assert.throws(
    () =>
      context.completeMalAuthorization_("code", url.searchParams.get("state")),
    /already used/,
  );
});

test("library uses one unfiltered paginated fetch, caches it, and never scans calendars", () => {
  const { context } = backend();
  const calls = [];
  context.UrlFetchApp.fetch = (url) => {
    calls.push(url);
    return reply(200, {
      data: [
        {
          node: {
            id: 1,
            title: "Test",
            genres: [{ name: "Drama" }],
            main_picture: { medium: "medium", large: "large" },
          },
          list_status: { status: "watching", score: 8 },
        },
      ],
    });
  };
  const shows = context.getAnimeList_("", false);
  assert.equal(shows[0].genres[0], "Drama");
  assert.equal(shows[0].image, "medium");
  assert.equal(shows[0].episodes, 0);
  assert.equal(context.getAnimeList_("watching", false).length, 1);
  assert.equal(context.getAnimeList_("completed", false).length, 0);
  assert.equal(calls.length, 1);
  assert.match(calls[0], /limit=1000/);
  assert.doesNotMatch(calls[0], /[?&]status=/);
  context.getAnimeList_("", true);
  assert.equal(calls.length, 2);
});

test("chunk cache handles large Unicode payloads and safely misses after partial eviction", () => {
  const { context, cache } = backend();
  const shows = [
    { title: "星の物語", synopsis: randomBytes(180000).toString("base64") },
  ];
  context.writeLibraryCache_(shows);
  assert.deepEqual(context.readLibraryCache_(), shows);
  const manifest = JSON.parse(cache.get(context.libraryCacheKey_()));
  assert.ok(manifest.keys.length > 1);
  cache.delete(manifest.keys[0]);
  assert.equal(context.readLibraryCache_(), null);
});

test("pagination follows next links and stops a repeated page", () => {
  const { context } = backend();
  let calls = 0;
  const next = "https://api.myanimelist.net/v2/users/@me/animelist?offset=1000";
  context.UrlFetchApp.fetch = () =>
    reply(200, {
      data: [{ node: { id: ++calls } }],
      paging: calls === 1 ? { next } : {},
    });
  assert.equal(context.fetchCurrentUserAnimeList_("").length, 2);
  context.UrlFetchApp.fetch = () => reply(200, { data: [], paging: { next } });
  assert.throws(() => context.fetchCurrentUserAnimeList_(""), /repeated page/);
});

test("calendar sync indexes exact episode keys once and avoids unchanged writes", () => {
  const { context } = backend();
  const show = {
    malId: 1,
    title: "A",
    premiereDate: "2026-10-02",
    episodes: 12,
    duration: 24,
    selected: true,
  };
  let reads = 0,
    writes = 0;
  const events = [];
  const calendar = {
    getEvents() {
      reads++;
      return events;
    },
    createEvent(title, start, end, options) {
      writes++;
      events.push({
        getTitle: () => title,
        getStartTime: () => start,
        getEndTime: () => end,
        getDescription: () => options.description,
        setTitle() {
          throw new Error("Unnecessary write");
        },
        setTime() {
          throw new Error("Unnecessary write");
        },
        setDescription() {
          throw new Error("Unnecessary write");
        },
      });
    },
  };
  const first = context.syncShowEpisodes_(calendar, show);
  assert.equal(first.created, 12);
  assert.equal(reads, 1);
  const second = context.syncShowEpisodes_(calendar, show);
  assert.equal(second.skipped, 12);
  assert.equal(second.created, 0);
  assert.equal(reads, 2);
  assert.equal(writes, 12);
  assert.equal(
    context.syncShowEpisodes_(calendar, { ...show, premiereDate: "2026-02-30" })
      .skipped,
    1,
  );
  assert.equal(
    context.syncShowEpisodes_(calendar, { ...show, malId: null }).skipped,
    1,
  );
});

test("JST weekly dates remain stable over daylight-saving changes", () => {
  const { context } = backend();
  const show = { premiereDate: "2026-10-25", broadcast: "Sunday 23:00" };
  assert.equal(
    context.buildEpisodeStart_(show, 2).toISOString(),
    "2026-11-01T14:00:00.000Z",
  );
  assert.throws(
    () => context.buildPremiereDateTime_({ ...show, broadcast: "99:99" }),
    /broadcast/,
  );
});
