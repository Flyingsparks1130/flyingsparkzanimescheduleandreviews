import test from "node:test";
import assert from "node:assert/strict";
import { normalizeShow } from "../src/lib/library.js";
import {
  buildSchedule,
  releaseWindow,
  filterSchedule,
} from "../src/lib/schedule.js";
process.env.TZ = "America/New_York";
const show = (extra = {}) =>
  normalizeShow(
    {
      malId: 1,
      title: "Example",
      status: "watching",
      premiereDate: "2026-10-02",
      episodes: 3,
      broadcast: "friday 23:00",
      ...extra,
    },
    0,
  );

test("schedule includes today and later episode dates, excludes completed/dropped and past episodes", () => {
  const entries = buildSchedule(
    [
      show(),
      show({ malId: 2, status: "completed" }),
      show({ malId: 3, status: "dropped" }),
      show({ malId: 4, premiereDate: "1970-04-01" }),
    ],
    "2026-10-09",
  );
  assert.deepEqual(
    entries.map((e) => e.episode),
    [2, 3],
  );
  assert.deepEqual(
    entries.map((e) => e.day),
    ["2026-10-09", "2026-10-16"],
  );
  assert.equal(
    buildSchedule([show({ status: "on_hold" })], "2026-10-02").length,
    3,
  );
});
test("episode expansion needs both an exact date and a known episode count", () => {
  const exactUnknown = buildSchedule([show({ episodes: 0 })], "2026-10-02");
  assert.equal(exactUnknown.length, 1);
  assert.equal(exactUnknown[0].episode, null);
  assert.match(exactUnknown[0].detail, /count TBD/);
  const month = buildSchedule(
    [show({ premiereDate: "2026-11", episodes: 12 })],
    "2026-10-02",
  );
  assert.equal(month.length, 1);
  assert.equal(month[0].episode, null);
  assert.equal(month[0].precision, "month");
  assert.equal(
    buildSchedule(
      [show({ premiereDate: "2026-01-01", episodes: 0 })],
      "2026-10-02",
    ).length,
    0,
  );
});
test("expected release precision uses month, season, year, then TBD without inventing dates", () => {
  assert.equal(
    releaseWindow(show({ premiereDate: "2026-11", season: "Fall 2026" }))
      .precision,
    "month",
  );
  assert.equal(
    releaseWindow(show({ premiereDate: "", season: "Fall 2026", year: 2026 }))
      .label,
    "Fall 2026",
  );
  assert.equal(
    releaseWindow(show({ premiereDate: "2027", season: "" })).label,
    "2027",
  );
  assert.equal(
    releaseWindow(show({ premiereDate: "", season: "", year: 0 })).label,
    "TBD",
  );
  assert.equal(
    buildSchedule(
      [
        show({ premiereDate: "2026-09" }),
        show({ premiereDate: "", season: "Summer 2026" }),
        show({ premiereDate: "2025" }),
      ],
      "2026-10-02",
    ).length,
    0,
  );
  assert.equal(
    buildSchedule([show({ premiereDate: "2026-10" })], "2026-10-02").length,
    1,
  );
});
test("refreshing metadata replaces broad windows with finer dates, then episodes, and removes changed statuses", () => {
  const base = {
    status: "plan_to_watch",
    episodes: 0,
    premiereDate: "",
    year: 2027,
  };
  assert.equal(buildSchedule([show(base)], "2026-10-02")[0].precision, "year");
  assert.equal(
    buildSchedule([show({ ...base, season: "Winter 2027" })], "2026-10-02")[0]
      .precision,
    "season",
  );
  assert.equal(
    buildSchedule([show({ ...base, premiereDate: "2027-02" })], "2026-10-02")[0]
      .precision,
    "month",
  );
  const known = show({ ...base, premiereDate: "2027-02-03", episodes: 12 });
  assert.equal(buildSchedule([known], "2026-10-02").length, 12);
  assert.equal(
    buildSchedule([{ ...known, status: "completed" }], "2026-10-02").length,
    0,
  );
});
test("schedule filters use episode date and never expose past or excluded statuses", () => {
  const entries = buildSchedule(
    [
      show({ premiereDate: "2026-09-25", episodes: 4 }),
      show({ malId: 2, premiereDate: "2026-12", status: "plan_to_watch" }),
    ],
    "2026-10-02",
  );
  assert.equal(
    filterSchedule(entries, { date: "month" }, "2026-10-02").length,
    3,
  );
  assert.equal(
    filterSchedule(entries, { date: "unknown" }, "2026-10-02").length,
    1,
  );
  assert.equal(
    filterSchedule(entries, { status: "completed" }, "2026-10-02").length,
    0,
  );
  assert.equal(
    filterSchedule(entries, { query: "nomatch" }, "2026-10-02").length,
    0,
  );
});
test("JST episode instants agree with calendar and maintain local-day boundaries across DST", () => {
  const entries = buildSchedule(
    [
      show({
        premiereDate: "2026-11-01",
        broadcast: "sunday 00:30",
        episodes: 2,
      }),
    ],
    "2026-10-31",
  );
  assert.equal(entries[0].at, "2026-10-31T15:30:00.000Z");
  assert.equal(entries[0].day, "2026-10-31");
  assert.equal(entries[1].day, "2026-11-07");
});
