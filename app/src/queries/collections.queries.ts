import { queryOptions } from "@tanstack/react-query"
import { fetchUserCollectionsFn, fetchCollectionByIdFn } from "@/server/collections"
import { fetchWatchedFn } from "@/server/watched"
import { fetchWatchlistedFn } from "@/server/watchlisted"

export const collectionsQueryOptions = queryOptions({
  queryKey: ["collections"],
  queryFn: () => fetchUserCollectionsFn(),
  staleTime: 1000 * 30,
})

export const collectionDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["collection", id],
    queryFn: () => fetchCollectionByIdFn({ data: id }),
    staleTime: 1000 * 30,
  })

// Reused by both the Collections page and the map choropleth (useMapFilmData)
export const watchedFilmsQueryOptions = queryOptions({
  queryKey: ["watched-list"],
  queryFn: () => fetchWatchedFn(),
  staleTime: 1000 * 60,
})

export const watchlistedFilmsQueryOptions = queryOptions({
  queryKey: ["watchlisted-list"],
  queryFn: () => fetchWatchlistedFn(),
  staleTime: 1000 * 60,
})
