import { useEffect, useState } from "react";

export function useDebounceSearch<T>(
  query: string,
  enabled: boolean,
  fetcher: (q: string) => Promise<T>,
  delayMs = 500,
): { result: T | null; isSearching: boolean } {
  const [result, setResult] = useState<T | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!enabled || query.trim().length === 0) {
      setIsSearching(false);
      setResult(null);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const data = await fetcher(query);
        setResult(data);
      } catch (err) {
        console.error("useDebounceSearch: fetch error", err);
      } finally {
        setIsSearching(false);
      }
    }, delayMs);
    return () => clearTimeout(timer);
    // fetcher identity is intentionally excluded — callers must stabilize it
    // with useCallback if needed; including it would cause re-runs on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, enabled, delayMs]);

  return { result, isSearching };
}
