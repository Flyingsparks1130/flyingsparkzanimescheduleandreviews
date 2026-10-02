import { exactDate } from "./library.js";
export function csvCell(value) {
  let text = String(value ?? "");
  if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
  return `"${text.replaceAll('"', '""')}"`;
}
export function toCsv(shows) {
  return (
    "\uFEFF" +
    [
      "Title,Status,Score,Genre,Studio,Year,Premiere,Episodes",
      ...shows.map((show) =>
        [
          show.title,
          show.status,
          show.score,
          show.genre,
          show.studio,
          show.year,
          show.premiereDate,
          show.episodes,
        ]
          .map(csvCell)
          .join(","),
      ),
    ].join("\r\n")
  );
}
function escapeIcs(value) {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,");
}
function foldLine(line) {
  const encoder = new TextEncoder();
  let result = "",
    current = "",
    size = 0;
  for (const character of line) {
    const bytes = encoder.encode(character).length;
    if (size + bytes > 75) {
      result += current + "\r\n";
      current = " ";
      size = 1;
    }
    current += character;
    size += bytes;
  }
  return result + current;
}
export function toIcs(shows, now = new Date()) {
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AnimeLens//Premieres//EN",
    "CALSCALE:GREGORIAN",
  ];
  for (const show of shows.filter((show) => exactDate(show.premiereDate))) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${encodeURIComponent(show.id)}-premiere@animelens`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${show.premiereDate.replaceAll("-", "")}`,
      `SUMMARY:${escapeIcs(show.title)} premiere`,
      `DESCRIPTION:${escapeIcs("Premiere date from MyAnimeList. " + (show.genre || ""))}`,
      "END:VEVENT",
    );
  }
  return [...lines, "END:VCALENDAR"].map(foldLine).join("\r\n") + "\r\n";
}
export function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
