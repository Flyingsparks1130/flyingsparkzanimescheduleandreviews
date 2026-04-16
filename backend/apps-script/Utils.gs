function jsonOutput_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getRequiredSetting_(key) {
  const value = PropertiesService.getScriptProperties().getProperty(key);
  if (!value) {
    throw new Error("Missing script property: " + key);
  }
  return value;
}

function todayInJst_() {
  const now = new Date();
  const ymd = Utilities.formatDate(now, CONFIG.TIME_ZONE, "yyyy-MM-dd");
  return new Date(ymd + "T00:00:00+09:00");
}

function buildSeasonLabel_(season, year) {
  const parts = [];
  if (season) parts.push(capitalize_(season));
  if (year) parts.push(String(year));
  return parts.join(" ");
}

function capitalize_(value) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function parseDurationMinutes_(durationText) {
  if (!durationText) return null;

  const text = String(durationText);
  const hoursMatch = text.match(/(\d+)\s*hr/i);
  const minsMatch = text.match(/(\d+)\s*min/i);

  const hours = hoursMatch ? Number(hoursMatch[1]) : 0;
  const mins = minsMatch ? Number(minsMatch[1]) : 0;
  const total = hours * 60 + mins;

  return total || null;
}

function extractTimeFromBroadcast_(broadcastText) {
  if (!broadcastText) return null;

  const match = String(broadcastText).match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;

  return {
    hour: Number(match[1]),
    minute: Number(match[2])
  };
}

function pad2_(n) {
  return String(n).padStart(2, "0");
}
