import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/utils/authContext";
import {
  collectionsQueryOptions,
  collectionDetailQueryOptions,
  watchedFilmsQueryOptions,
  watchlistedFilmsQueryOptions,
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
  films: UserFilm[];
}

export function useCollections(): CollectionData[] {
  const { authState } = useAuth();
  const queryClient = useQueryClient();

  const { data: rawCollections = [] } = useQuery({
    ...collectionsQueryOptions,
    enabled: !!authState.status,
  });

  // Subscribe (not snapshot) so the hook re-renders when either list changes
  const { data: watchedFilms = [] } = useQuery({
    ...watchedFilmsQueryOptions,
    enabled: !!authState.status,
  });
  const { data: watchlistedFilms = [] } = useQuery({
    ...watchlistedFilmsQueryOptions,
    enabled: !!authState.status,
  });

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
