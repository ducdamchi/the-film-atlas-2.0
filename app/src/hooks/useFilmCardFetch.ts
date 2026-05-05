import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { filmQueryOptions } from "@/queries/film.queries";
import type { TMDBCrewMember } from "@/types/tmdb";

/**
 * Used only by TmdbFilmCard (Map/discover mode).
 * Fetches full TMDB details on hover (debounced 1s) and caches the result
 * under ["film", id] for 10 minutes via TanStack Query.
 * UserFilmCard no longer uses this hook — its overlay data comes from the
 * stored filmObject returned by the watched/watchlisted/collections list query.
 */
export function useFilmCardFetch(filmId: number) {
  const [shouldFetch, setShouldFetch] = useState(false);
  const [isPosterHovered, setIsPosterHovered] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (window.innerWidth < 768) setShouldFetch(true);
    const onResize = () => {
      if (window.innerWidth < 768) setShouldFetch(true);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const { data, isError } = useQuery({
    ...filmQueryOptions(filmId),
    enabled: shouldFetch,
  });

  const directors = (data?.credits?.crew ?? []).filter(
    (c: TMDBCrewMember) => c.job === "Director",
  );

  const handleCardHoverEnter = () => {
    if (shouldFetch || window.innerWidth < 768) return;
    debounceRef.current = setTimeout(() => setShouldFetch(true), 1000);
  };

  const handleCardHoverLeave = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  };

  return {
    isLoading: !data && !isError,
    fetchError: isError,
    movieDetails: data ?? {},
    directors,
    isPosterHovered,
    setIsPosterHovered,
    handleCardHoverEnter,
    handleCardHoverLeave,
  };
}
