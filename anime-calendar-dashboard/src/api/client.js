const API_BASE = "https://script.google.com/macros/s/AKfycbzQ1p4ZGP46E6vZpAmzhF4K3esbeu3uXwqdTscp-y5ETwnUpkiaPhprXVQj4IruH3_o/exec";

export async function fetchPlannedUpcoming() {
  const res = await fetch(`${API_BASE}?action=planned-upcoming`);
  if (!res.ok) throw new Error("Failed to fetch planned upcoming anime");
  return res.json();
}

export async function syncSelectedShows(selectedShows) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      action: "sync-selected",
      shows: selectedShows
    })
  });

  if (!res.ok) throw new Error("Failed to sync selected shows");
  return res.json();
}
