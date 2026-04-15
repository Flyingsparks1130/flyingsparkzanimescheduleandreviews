const API_BASE = "YOUR_APPS_SCRIPT_WEB_APP_URL";

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
