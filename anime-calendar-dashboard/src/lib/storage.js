import { API_BASE } from "../api/client.js";
const prefix = `animelens:v2:${API_BASE}:`;
export function readStored(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(prefix + key)) ?? fallback;
  } catch {
    return fallback;
  }
}
export function writeStored(key, value) {
  try {
    localStorage.setItem(prefix + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
