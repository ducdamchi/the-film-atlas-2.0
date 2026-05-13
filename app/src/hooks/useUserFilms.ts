import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  watchedFilmsQueryOptions,
  watchlistedFilmsQueryOptions,
} from "@/queries/collections.queries";
import type { UserFilm } from "@/types/film";
import type { AuthState } from "@/types/auth";

interface UseUserFilmsParams {
  authState: AuthState;
  isDiscoverMode: boolean;
  isoA2: string | null | undefined;
  queryString: string;
  sortBy: string | null;
  sortDirection: string | null;
  numStars: number | null;
}

export function useUserFilms({
  authState,
  isDiscoverMode,
  isoA2,
  queryString,
  sortBy,
  sortDirection,
  numStars,
}: UseUserFilmsParams) {
  const enabled = !!authState.status && !isDiscoverMode && !!isoA2;

  const isWatchlisted = queryString === "watchlisted/by_country";
  const isRated = queryString === "watched/rated/by_country";

  const { data: watchedList = [], isLoading: watchedLoading } = useQuery({
    ...watchedFilmsQueryOptions,
    enabled: enabled && !isWatchlisted,
  });
  const { data: watchlistedList = [], isLoading: watchlistedLoading } = useQuery({
    ...watchlistedFilmsQueryOptions,
    enabled: enabled && isWatchlisted,
  });

  const isLoading = isWatchlisted ? watchlistedLoading : watchedLoading;

  const userFilmList = useMemo<UserFilm[]>(() => {
    if (!isoA2) return [];
    const base = isWatchlisted ? watchlistedList : watchedList;

    let list = base.filter((f) => f.origin_country.includes(isoA2));

    if (isRated) list = list.filter((f) => (f.stars ?? 0) > 0);
    if (numStars && numStars > 0) list = list.filter((f) => f.stars === numStars);

    return [...list].sort((a, b) => {
      const key = sortBy === "released_date" ? "release_date" : "added_date";
      const dir = sortDirection === "asc" ? 1 : -1;
      return a[key] < b[key] ? -dir : a[key] > b[key] ? dir : 0;
    });
  }, [watchedList, watchlistedList, isoA2, isWatchlisted, isRated, numStars, sortBy, sortDirection]);

  return { userFilmList, isLoading };
}
