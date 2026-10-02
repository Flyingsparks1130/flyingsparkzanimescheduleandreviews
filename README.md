# Flying Sparks anime library

A React dashboard for a MyAnimeList collection, premiere dates, rating insights, Google Calendar sync, and data exports.

## Development

Use Node 22.12 or newer.

```sh
cd anime-calendar-dashboard
npm ci
npm run dev
```

Run `npm test` for data/API/export regressions and `npm run build` for the production bundle. GitHub Pages deploys from `main`; pull requests run checks without deploying.

Set `VITE_API_BASE` in `.env.local` to override the existing Apps Script web-app URL. This URL is public configuration, not a place for tokens or secrets. See `.env.example`.

## Loading and data

- The library is saved in browser storage, scoped to its backend URL. A cached library appears immediately. Copies older than five minutes refresh in the background; Refresh always requests fresh server data.
- Concurrent list requests are deduplicated. Failed refreshes and invalid payloads preserve the previous library. Blocked/full storage does not prevent use of the app.
- Search, status/date filters, sorting, and pagination run locally. At most 24 library cards or schedule entries are mounted per page. Covers use backend URLs and lazy loading; there are no per-title image-search requests.
- Insights load separately and are calculated locally. Scores refer to the user's MAL ratings. Missing dates, ratings, and artwork have explicit fallbacks.
- Calendar selections persist independently of filters. Only watching/planned entries with an ID and valid premiere date can be queued. Payloads include `selected: true` and normalized `malId` values. Results show the backend's created/updated/skipped counts when supplied.
- CSV exports escape spreadsheet formulas and quotes. iCalendar exports contain all-day premiere events, not inferred weekly broadcasts.

## Apps Script integration

`backend/apps-script` now contains the current MAL-based backend, recovered from the live project and updated alongside this dashboard. It replaces the obsolete Jikan snapshot. Credentials and the original hard-coded setup function are deliberately excluded.

The backend refreshes expired tokens, retries a 401 once, preserves existing script properties, validates OAuth state, and obtains the full library in pages of up to 1,000 records. Compressed cache chunks stay below Apps Script's per-entry limit, expire after 15 minutes, and safely refetch if any chunk is evicted. Loading the library performs no Calendar API reads. Calendar sync indexes existing events once per series and skips unchanged writes.

Required script properties: `MAL_CLIENT_ID`, `MAL_CLIENT_SECRET`, `MAL_REDIRECT_URI`, and `CALENDAR_ID`. Authorization maintains `MAL_ACCESS_TOKEN`, `MAL_REFRESH_TOKEN`, and `MAL_TOKEN_EXPIRES_AT`. Set configuration through Project Settings, never in committed source. `checkMalConnection` renews/checks the saved connection without calendar writes; `checkLibraryPerformance` warms the cache and logs only counts and durations.

Saving source in Apps Script does not change an existing versioned `/exec` deployment. Publish a new version of the existing deployment to activate the fixes while preserving its URL. The existing public web-app access configuration is unchanged by this work.

Expected API contract:

| Request | Response |
| --- | --- |
| `GET ?action=anime-list` | `{ "ok": true, "items": [...] }` (also accepts `shows`, `data`, `anime`, or `list`) |
| `GET ?action=anime-list&refresh=1` | Fresh library with the same shape |
| `GET ?action=auth-url` | `{ "ok": true, "authorizeUrl": "https://myanimelist.net/..." }` |
| `POST` text/plain JSON `{ action: "sync-selected", shows: [...] }` | `{ "ok": true, "result": { "created": 0, "updated": 0, "skipped": 0 } }` |
| Failure | `{ "ok": false, "error": "..." }` |

The frontend never needs the MAL client secret, access token, or refresh token. Episode events are weekly estimates based on premiere/broadcast fields, not a verified episode-release feed. Calendar lookup covers the show's estimated run plus one week on each side; moving a premiere by more than that can require manually reviewing old events. Large initial calendar syncs remain subject to Google's execution and calendar quotas. No live calendar writes are used for testing.
