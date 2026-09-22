import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/utils/authContext";
import {
  collectionsQueryOptions,
  collectionDetailQueryOptions,
  watchedFilmsQueryOptions,
  watchlistedFilmsQueryOptions,
  guestWatchedQueryOptions,
  guestWatchlistedQueryOptions,
} from "@/queries/collections.queries";
import type { AppCollection } from "@/types/api";
import type { UserFilm } from "@/types/film";

export interface CollectionData {
  id: string;
  title: string;
  description: string | null;
  collectionType: string;
  queryString: string | null;
  isPublic: boolean;
  filmCount: number;
  totalRuntime: number;
  isPinned: boolean;
  pinnedOrder: string | null;
  mainOrder: string | null;
  films: UserFilm[];
}

function buildGuestCollection(
  type: "watched" | "watchlist",
  films: UserFilm[],
): CollectionData {
  const totalRuntime = films.reduce((sum, f) => sum + (f.runtime ?? 0), 0);
  return {
    id: `guest-${type}`,
    title: type === "watched" ? "Watched" : "Watchlist",
    description: null,
    collectionType: type,
    queryString: type === "watched" ? "watched" : "watchlisted",
    isPublic: false,
    filmCount: films.length,
    totalRuntime,
    isPinned: true,
    pinnedOrder: type === "watched" ? "a0" : "a1",
    mainOrder: null,
    films,
  };
}

export function useCollections(): CollectionData[] {
  const { authState } = useAuth();
  const isGuest = !authState.status;
  const queryClient = useQueryClient();

  const { data: rawCollections = [] } = useQuery({
    ...collectionsQueryOptions,
    enabled: !isGuest,
  });

  // Subscribe (not snapshot) so the hook re-renders when either list changes
  const { data: watchedFilms = [] } = useQuery({
    ...(isGuest ? guestWatchedQueryOptions : watchedFilmsQueryOptions),
  });
  const { data: watchlistedFilms = [] } = useQuery({
    ...(isGuest ? guestWatchlistedQueryOptions : watchlistedFilmsQueryOptions),
  });

  if (isGuest) {
    return [
      buildGuestCollection("watched", watchedFilms),
      buildGuestCollection("watchlist", watchlistedFilms),
    ];
  }

  return (rawCollections as AppCollection[]).map(
    (col: AppCollection): CollectionData => {
      const shared = {
        id: col.id,
        title: col.title,
        description: col.description ?? null,
        collectionType: col.collection_type,
        isPublic: col.is_public,
        filmCount: col.film_count,
        totalRuntime: col.total_runtime,
        isPinned: col.is_pinned,
        pinnedOrder: col.pinned_order,
        mainOrder: col.main_order,
      };

      if (col.collection_type === "watched") {
        return { ...shared, queryString: "watched", films: watchedFilms };
      }

      if (col.collection_type === "watchlist") {
        return { ...shared, queryString: "watchlisted", films: watchlistedFilms };
      }

      // Standard collection — read films from per-collection cache
      const cached = queryClient.getQueryData<{
        collection: AppCollection;
        films: UserFilm[];
      }>(collectionDetailQueryOptions(col.id).queryKey);
      return { ...shared, queryString: col.id, films: cached?.films ?? [] };
    },
  );
}
