import test from "node:test";
import assert from "node:assert/strict";
import {
  extractShows,
  normalizeShow,
  exactDate,
  filterShows,
  canSync,
  syncPayload,
  syncSummary,
} from "../src/lib/library.js";
import { toCsv, toIcs } from "../src/lib/export.js";
import {
  fetchAnimeList,
  fetchAuthUrl,
  syncSelectedShows,
} from "../src/api/client.js";

test("normalizes MAL nested nodes, Japanese titles, object genres and stable IDs", () => {
  const [show] = extractShows({
    data: [
      {
        node: {
          id: 42,
          title: "Test",
          alternative_titles: { ja: "日本語" },
          start_date: "2026-10-02",
          genres: [{ name: "Drama" }],
          studios: [{ name: "Studio" }],
          main_picture: { medium: "https://example.com/image.jpg" },
          num_episodes: 12,
        },
        list_status: { status: "watching", score: 8, num_episodes_watched: 3 },
      },
    ],
  });
  assert.equal(show.id, "42");
  assert.equal(show.genre, "Drama");
  assert.equal(show.studio, "Studio");
  assert.equal(show.score, 8);
  assert.equal(show.watched, 3);
  assert.equal(filterShows([show], { query: "日本語" }).length, 1);
});
test("supports Apps Script malId and rejects malformed library responses", () => {
  assert.equal(normalizeShow({ malId: 7, title: "A" }, 0).id, "7");
  assert.equal(extractShows({ shows: [{ malId: 7 }, { malId: 7 }] }).length, 1);
  assert.throws(() => extractShows({ ok: true }), /unexpected/);
  assert.throws(() => extractShows({ items: [null] }), /invalid/);
  assert.deepEqual(extractShows({ items: [] }), []);
});
test("rejects partial and impossible dates and puts unknown dates last", () => {
  assert.equal(exactDate("2026-02-30"), "");
  assert.equal(exactDate("2026-03"), "");
  assert.equal(exactDate("2024-02-29"), "2024-02-29");
  const shows = [
    { malId: 1, title: "A" },
    { malId: 2, title: "B", premiereDate: "2026-10-02" },
    { malId: 3, title: "C", premiereDate: "2025-01-01" },
  ].map(normalizeShow);
  assert.deepEqual(
    filterShows(shows, { date: "upcoming" }, "2026-10-02").map((s) => s.id),
    ["2"],
  );
  assert.deepEqual(
    filterShows(shows, { sort: "newest" }).map((s) => s.id),
    ["2", "3", "1"],
  );
});
test("sync payload always opts in selected shows with normalized IDs and dates", () => {
  const show = normalizeShow(
    {
      mal_id: 42,
      title: "A",
      status: "watching",
      start_date: "2026-10-02",
      selected: false,
    },
    0,
  );
  assert.equal(canSync(show), true);
  assert.equal(syncPayload(show).selected, true);
  assert.equal(syncPayload(show).malId, 42);
  assert.equal(canSync({ ...show, premiereDate: "" }), false);
  assert.equal(canSync({ ...show, status: "completed" }), false);
  assert.match(
    syncSummary({ result: { created: 0, updated: 0, skipped: 1 } }),
    /0 events created · 0 updated · 1 skipped/,
  );
  assert.match(syncSummary({ ok: true }), /accepted/);
});
test("CSV escapes quotes and formula values; calendar escapes and folds UTF-8", () => {
  const show = normalizeShow(
    {
      malId: 42,
      title: '=SUM(1,2) "星"',
      premiereDate: "2026-10-02",
      genres: ["Drama"],
    },
    0,
  );
  assert.match(toCsv([show]), /"'=SUM\(1,2\) ""星"""/);
  const ics = toIcs(
    [{ ...show, title: "星".repeat(80) + ", title;\nnext" }],
    new Date("2026-01-01T00:00:00Z"),
  );
  assert.match(ics, /UID:42-premiere@animelens/);
  assert.match(ics, /DTSTAMP:20260101T000000Z/);
  assert.match(ics, /DTSTART;VALUE=DATE:20261002/);
  assert.match(ics.replaceAll("\r\n ", ""), /\\, title\\;\\nnext/);
  for (const line of ics.split("\r\n"))
    assert.ok(Buffer.byteLength(line) <= 75);
});
test("API shares duplicate requests, reports expired auth and sends selected JSON without preflight", async () => {
  const originalFetch = globalThis.fetch;
  try {
    let count = 0;
    globalThis.fetch = async () => {
      count++;
      return { ok: true, json: async () => ({ items: [] }) };
    };
    await Promise.all([fetchAnimeList(), fetchAnimeList()]);
    assert.equal(count, 1);
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        ok: false,
        error: 'MAL request failed (401): {"error":"invalid_token"}',
      }),
    });
    await assert.rejects(fetchAnimeList(), (error) => error.code === "auth");
    globalThis.fetch = async (url, options) => {
      assert.equal(options.headers["Content-Type"], "text/plain;charset=utf-8");
      assert.equal(JSON.parse(options.body).shows[0].selected, true);
      return { ok: true, json: async () => ({ ok: true }) };
    };
    await syncSelectedShows([{ selected: true }]);
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ authorizeUrl: "javascript:alert(1)" }),
    });
    await assert.rejects(fetchAuthUrl(), /unsupported/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
