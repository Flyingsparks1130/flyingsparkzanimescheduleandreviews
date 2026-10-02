export const API_BASE =
  import.meta.env?.VITE_API_BASE ||
  "https://script.google.com/macros/s/AKfycbw5-yXcXE3vfgxOFPftoDfcQUlzZyvc9rsw5j5gZFjLXSOcvs7fJxt_crOwqegZ3omu/exec";
const pending = new Map();
export class ApiError extends Error {
  constructor(message, code = "request") {
    super(message);
    this.code = code;
  }
}
async function request(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.method === "POST" ? 120000 : 45000,
  );
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    let data;
    try {
      data = await response.json();
    } catch {
      throw new ApiError(
        "The server returned an unreadable response. Check the Apps Script deployment.",
      );
    }
    if (!response.ok || data?.ok === false) {
      const message = String(
        data?.error || `Request failed (${response.status})`,
      );
      if (
        /invalid_token|unauthorized|\b401\b|authorization|login/i.test(message)
      )
        throw new ApiError(
          "MyAnimeList authorization has expired. Reconnect your account, then refresh your library.",
          "auth",
        );
      throw new ApiError(message);
    }
    return data;
  } catch (error) {
    if (error.name === "AbortError")
      throw new ApiError(
        options.method === "POST"
          ? "The sync took too long to confirm. It may still be running; check Google Calendar before trying again."
          : "The server is taking too long. Your saved library is still available. Try again shortly.",
        "timeout",
      );
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      "Could not reach the server. Check your connection and try again.",
      "network",
    );
  } finally {
    clearTimeout(timer);
  }
}
export function fetchAnimeList(forceRefresh = false) {
  const key = forceRefresh ? "refresh" : "list";
  if (!pending.has(key))
    pending.set(
      key,
      request(
        `${API_BASE}?action=anime-list${forceRefresh ? "&refresh=1" : ""}`,
      ).finally(() => pending.delete(key)),
    );
  return pending.get(key);
}
export async function fetchAuthUrl() {
  const data = await request(`${API_BASE}?action=auth-url`);
  let url;
  try {
    url = new URL(data.authorizeUrl || data.authUrl || data.url);
  } catch {
    throw new ApiError(
      "No authorization link was returned. Reauthorize MyAnimeList in the Apps Script project.",
    );
  }
  if (
    url.protocol !== "https:" ||
    !["myanimelist.net", "accounts.google.com"].includes(url.hostname)
  )
    throw new ApiError(
      "The server returned an unsupported authorization link.",
    );
  return url.href;
}
export function syncSelectedShows(shows) {
  return request(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "sync-selected", shows }),
  });
}
