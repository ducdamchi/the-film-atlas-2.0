import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/utils/authContext";
import {
  collectionsQueryOptions,
  collectionDetailQueryOptions,
  watchedFilmsQueryOptions,
  watchlistedFilmsQueryOptions,
} from "@/queries/collections.queries";
import type { AppCollection } from "@/utils/apiCalls";
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
        const films =
          queryClient.getQueryData<UserFilm[]>(
            watchedFilmsQueryOptions.queryKey,
          ) ?? [];
        return { ...shared, queryString: "watched", films };
      }

      if (col.collection_type === "watchlist") {
        const films =
          queryClient.getQueryData<UserFilm[]>(
            watchlistedFilmsQueryOptions.queryKey,
          ) ?? [];
        return { ...shared, queryString: "watchlisted", films };
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
