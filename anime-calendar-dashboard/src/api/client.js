const API_BASE = "https://script.google.com/macros/s/AKfycbw5-yXcXE3vfgxOFPftoDfcQUlzZyvc9rsw5j5gZFjLXSOcvs7fJxt_crOwqegZ3omu/exec";

async function parseApiResponse(res, fallbackMessage) {
  const text = await res.text();

  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (err) {
    throw new Error(`${fallbackMessage}: ${text || res.statusText}`);
  }

  if (!res.ok) {
    throw new Error(data.error || `${fallbackMessage} (${res.status})`);
  }

  if (data && data.ok === false) {
    throw new Error(data.error || fallbackMessage);
  }

  return data;
}

export async function fetchAnimeList(status = "", forceRefresh = false) {
  const params = new URLSearchParams({
    action: "anime-list"
  });

  if (status) {
    params.set("status", status);
  }

  if (forceRefresh) {
    params.set("refresh", "1");
  }

  const res = await fetch(`${API_BASE}?${params.toString()}`, {
    method: "GET"
  });

  return parseApiResponse(res, "Failed to fetch anime list");
}

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}?action=health`, {
    method: "GET"
  });

  return parseApiResponse(res, "Failed to fetch backend health");
}

export async function fetchAuthUrl() {
  const res = await fetch(`${API_BASE}?action=auth-url`, {
    method: "GET"
  });

  return parseApiResponse(res, "Failed to fetch auth url");
}

export async function syncSelectedShows(selectedShows) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      action: "sync-selected",
      shows: selectedShows
    })
  });

  return parseApiResponse(res, "Failed to sync selected shows");
}
