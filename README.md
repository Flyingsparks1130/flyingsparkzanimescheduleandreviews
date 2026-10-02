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

## Automatic MAL mirroring (activation pending approval)

The website preserves every MAL status, including dropped shows, and replaces its list on each successful refresh so removed entries disappear. An open, visible dashboard checks the backend every minute and refreshes on returning to the tab. Its data can be up to one backend cache interval old; failed requests retain the last successful copy and display an error.

`scheduledMalSync` is designed for an Apps Script time-driven trigger every 15 minutes. It fetches every MAL page before changing any calendar event. Dropped or absent shows lose their integration-managed events (including historic events); completed and on-hold shows retain events. Ratings, progress, and status are mirrored in event descriptions. Only events containing both an exact integration sync key and matching MAL ID are managed; unrelated events are preserved. The reconciliation scans managed events between 1900 and 2200, including dates moved outside their former series window.

Each run changes at most 100 events and stops processing after a three-minute budget; large imports or removals resume on later runs. API and Calendar quotas may delay completion. Episode dates remain weekly estimates. New events require a known positive episode count and exact premiere date; unknown schedules are not invented. Existing events can still receive updated metadata when the current schedule is unknown.

Release gate: merge/deploy the frontend and update the Apps Script source/version first, then set `MAL_AUTO_SYNC_ENABLED` to `true` in Script Properties and create one 15-minute time-driven trigger for `scheduledMalSync` under the owning Google account. No trigger is created by saving source or loading the website, and there is no public HTTP route to activate this job. Set the property to `false` and remove the trigger to stop automatic writes. `MAL_AUTO_SYNC_LAST_RESULT` records the last completed run's counts; failed trigger executions appear in Apps Script Executions. Trigger activation, the initial calendar reconciliation, and production deployment remain pending explicit release approval.
