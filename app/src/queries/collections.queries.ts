import { queryOptions } from "@tanstack/react-query"
import {
  fetchUserCollections,
  fetchCollectionById,
  fetchListByParams,
} from "@/utils/apiCalls"

export const collectionsQueryOptions = queryOptions({
  queryKey: ["collections"],
  queryFn: fetchUserCollections,
  staleTime: 1000 * 30,
})

export const collectionDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["collection", id],
    queryFn: () => fetchCollectionById(id),
    staleTime: 1000 * 30,
  })

// Reused by both the Collections page and the map choropleth (useMapFilmData)
export const watchedFilmsQueryOptions = queryOptions({
  queryKey: ["watched-list"],
  queryFn: () => fetchListByParams({ queryString: "watched" }),
  staleTime: 1000 * 60,
})

export const watchlistedFilmsQueryOptions = queryOptions({
  queryKey: ["watchlisted-list"],
  queryFn: () => fetchListByParams({ queryString: "watchlisted" }),
  staleTime: 1000 * 60,
})
