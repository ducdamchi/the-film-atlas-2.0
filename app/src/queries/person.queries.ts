import { queryOptions } from "@tanstack/react-query"
import { fetchPersonFromTMDB, checkDirectorStatus } from "@/utils/apiCalls"

export const personQueryOptions = (tmdbId: string | number) =>
  queryOptions({
    queryKey: ["person", String(tmdbId)],
    queryFn: () => fetchPersonFromTMDB(tmdbId),
    staleTime: 1000 * 60 * 10,
  })

export const directorStatusQueryOptions = (tmdbId: string | number) =>
  queryOptions({
    queryKey: ["directorStatus", String(tmdbId)],
    queryFn: () => checkDirectorStatus(tmdbId),
    staleTime: 0,
    retry: false,
  })
