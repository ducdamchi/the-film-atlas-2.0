import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Debounced, paginated search hook.
 *
 * - Resets to page 1 and clears results whenever `query` changes.
 * - `loadMore()` fetches the next page and appends to results.
 * - `isSearching` covers the initial (debounced) fetch only.
 * - `isLoadingMore` covers subsequent page fetches so the UI can show a
 *   bottom spinner without flashing the full results area.
 *
 * The `fetcher` identity must be stable across renders (wrap with useCallback).
 */
export function usePagedSearch<T>(
  query: string,
  enabled: boolean,
  fetcher: (q: string, page: number) => Promise<{ results: T[]; totalPages: number }>,
  delayMs = 500,
): {
  results: T[];
  isSearching: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
} {
  const [results, setResults] = useState<T[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // Refs so loadMore can read current state without needing them in its dep array.
  const pageRef = useRef(1);
  const activeQueryRef = useRef("");
  const isLoadingMoreRef = useRef(false);
  const hasMoreRef = useRef(false);

  function syncHasMore(val: boolean) {
    hasMoreRef.current = val;
    setHasMore(val);
  }
  function syncIsLoadingMore(val: boolean) {
    isLoadingMoreRef.current = val;
    setIsLoadingMore(val);
  }

  useEffect(() => {
    if (!enabled || query.trim().length === 0) {
      setIsSearching(false);
      setResults([]);
      syncHasMore(false);
      pageRef.current = 1;
      activeQueryRef.current = "";
      return;
    }

    setIsSearching(true);
    setResults([]);
    syncHasMore(false);
    pageRef.current = 1;
    activeQueryRef.current = query;

    const timer = setTimeout(async () => {
      try {
        const data = await fetcher(query, 1);
        if (activeQueryRef.current !== query) return; // query changed while in-flight
        setResults(data.results);
        syncHasMore(data.totalPages > 1);
      } catch (err) {
        console.error("usePagedSearch: fetch error", err);
      } finally {
        setIsSearching(false);
      }
    }, delayMs);

    return () => clearTimeout(timer);
    // fetcher excluded intentionally — callers must stabilize with useCallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, enabled, delayMs]);

  const loadMore = useCallback(async () => {
    if (isLoadingMoreRef.current || !hasMoreRef.current) return;
    const nextPage = pageRef.current + 1;
    const q = activeQueryRef.current;
    syncIsLoadingMore(true);
    try {
      const data = await fetcher(q, nextPage);
      if (activeQueryRef.current !== q) return; // query changed while in-flight
      setResults((prev) => [...prev, ...data.results]);
      syncHasMore(data.totalPages > nextPage);
      pageRef.current = nextPage;
    } catch (err) {
      console.error("usePagedSearch: loadMore error", err);
    } finally {
      syncIsLoadingMore(false);
    }
  }, [fetcher]);

  return { results, isSearching, isLoadingMore, hasMore, loadMore };
}
