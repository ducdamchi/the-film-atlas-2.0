import { queryOptions } from "@tanstack/react-query"
import { fetchPersonFromTMDB } from "@/utils/apiCalls"
import { checkDirectorStatusFn } from "@/server/directors"

export const personQueryOptions = (tmdbId: string | number) =>
  queryOptions({
    queryKey: ["person", String(tmdbId)],
    queryFn: () => fetchPersonFromTMDB(tmdbId),
    staleTime: 1000 * 60 * 10,
  })

export const directorStatusQueryOptions = (tmdbId: string | number) =>
  queryOptions({
    queryKey: ["directorStatus", String(tmdbId)],
    queryFn: () => checkDirectorStatusFn({ data: tmdbId }),
    staleTime: 0,
    retry: false,
  })
