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

## Apps Script integration: source mismatch

The existing deployed frontend uses `anime-list`, `auth-url`, and `sync-selected`. The checked-in `backend/apps-script` snapshot only implements `health`, `planned-upcoming`, and `sync-selected` using Jikan. **It is not the current production backend. Do not overwrite the live project with that snapshot.**

On October 2, 2026, a read-only call to the configured deployed endpoint returned `MAL request failed (401): invalid_token`. The live editor also contains `MalAuthService.gs` and `MalService.gs`, which are missing here. The current Apps Script source and renewed MAL authorization are required to finish end-to-end integration testing.

Expected API contract:

| Request | Response |
| --- | --- |
| `GET ?action=anime-list` | `{ "ok": true, "items": [...] }` (also accepts `shows`, `data`, `anime`, or `list`) |
| `GET ?action=anime-list&refresh=1` | Fresh library with the same shape |
| `GET ?action=auth-url` | `{ "ok": true, "authorizeUrl": "https://myanimelist.net/..." }` |
| `POST` text/plain JSON `{ action: "sync-selected", shows: [...] }` | `{ "ok": true, "result": { "created": 0, "updated": 0, "skipped": 0 } }` |
| Failure | `{ "ok": false, "error": "..." }` |

The frontend never needs the MAL client secret, access token, or refresh token. Keep those in Apps Script properties. Once the current source is available, inspect automatic token refresh, list caching/pagination, returned image fields, and calendar event lookup/idempotency before deploying backend changes. Episode times produced by the existing backend are estimates based on premiere/broadcast fields.
