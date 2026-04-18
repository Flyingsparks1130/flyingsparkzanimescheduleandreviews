const API_BASE = "https://script.google.com/macros/s/AKfycbw5-yXcXE3vfgxOFPftoDfcQUlzZyvc9rsw5j5gZFjLXSOcvs7fJxt_crOwqegZ3omu/exec";

export async function fetchAnimeList(status = "") {
  const url = status
    ? `${API_BASE}?action=anime-list&status=${encodeURIComponent(status)}`
    : `${API_BASE}?action=anime-list`;

  const res = await fetch(url);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch anime list: ${text}`);
  }

  return res.json();
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

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to sync selected shows: ${text}`);
  }

  return res.json();
}
