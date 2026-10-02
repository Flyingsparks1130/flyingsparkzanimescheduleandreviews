import { useCallback, useEffect, useRef, useState } from "react";
import { fetchAnimeList } from "../api/client.js";
import { extractShows } from "../lib/library.js";
import { readStored, writeStored } from "../lib/storage.js";
const FRESH_MS = 5 * 60 * 1000;
function readCache() {
  const saved = readStored("library", null);
  if (!saved || !Array.isArray(saved.items) || !Number.isFinite(saved.savedAt))
    return null;
  try {
    return { shows: extractShows(saved.items), savedAt: saved.savedAt };
  } catch {
    return null;
  }
}
export function useLibrary() {
  const [cached] = useState(readCache);
  const [shows, setShows] = useState(cached?.shows || []);
  const [updatedAt, setUpdatedAt] = useState(cached?.savedAt || 0);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(null);
  const [cacheWarning, setCacheWarning] = useState(false);
  const sequence = useRef(0);
  const mounted = useRef(false);
  const load = useCallback(async (force = false) => {
    const current = ++sequence.current;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchAnimeList(force);
      const next = extractShows(response);
      if (!mounted.current || sequence.current !== current) return;
      const now = Date.now();
      setShows(next);
      setUpdatedAt(now);
      setCacheWarning(
        !writeStored("library", {
          items: next.map((show) => show._raw),
          savedAt: now,
        }),
      );
    } catch (err) {
      if (mounted.current && sequence.current === current) setError(err);
    } finally {
      if (mounted.current && sequence.current === current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    if (!cached || Date.now() - cached.savedAt > FRESH_MS) load();
    else setLoading(false);
    return () => {
      mounted.current = false;
      sequence.current++;
    };
  }, [cached, load]);
  return { shows, loading, error, updatedAt, cacheWarning, refresh: load };
}
