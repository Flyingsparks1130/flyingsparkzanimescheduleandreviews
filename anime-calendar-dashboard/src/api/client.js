const API_BASE = "https://script.google.com/macros/s/AKfycbzQ1p4ZGP46E6vZpAmzhF4K3esbeu3uXwqdTscp-y5ETwnUpkiaPhprXVQj4IruH3_o/exec";

export async function fetchPlannedUpcoming() {
  const res = await fetch(`${API_BASE}?action=planned-upcoming`);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch planned upcoming anime: ${text}`);
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
