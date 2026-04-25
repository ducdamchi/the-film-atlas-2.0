import { useState, useEffect } from "react";

import { useAuth } from "@/utils/authContext";
import {
  fetchListByParams,
  fetchUserCollections,
  fetchCollectionById,
} from "@/utils/apiCalls";
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

function resolveCollection(col: AppCollection): Promise<CollectionData> {
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
    return fetchListByParams({ queryString: "watched" }).then((films) => ({
      ...shared,
      queryString: "watched" as string | null,
      films,
    }));
  }
  if (col.collection_type === "watchlist") {
    return fetchListByParams({ queryString: "watchlisted" }).then((films) => ({
      ...shared,
      queryString: "watchlisted" as string | null,
      films,
    }));
  }
  return fetchCollectionById(col.id).then(({ films }) => ({
    ...shared,
    queryString: col.id as string | null,
    films,
  }));
}

export function useCollections() {
  const [collections, setCollections] = useState<CollectionData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { authState } = useAuth();

  useEffect(() => {
    if (!authState.status) return;
    setIsLoading(true);

    fetchUserCollections()
      .then((userCollections: AppCollection[]) =>
        Promise.all(userCollections.map(resolveCollection)),
      )
      .then((resolved) => {
        setCollections(resolved);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [authState.status]);

  return { collections, setCollections, isLoading };
}
