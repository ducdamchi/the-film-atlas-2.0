import { queryOptions } from "@tanstack/react-query"
import {
  fetchFilmFromTMDB,
  fetchFilmRatingsFromOMDB,
  fetchFilmAwardsFromWikidata,
  fetchFilmFromYTS,
  fetchSubtitles,
  checkLikeStatus,
  checkSaveStatus,
} from "@/utils/apiCalls"

export const filmQueryOptions = (tmdbId: string | number) =>
  queryOptions({
    queryKey: ["film", String(tmdbId)],
    queryFn: () => fetchFilmFromTMDB(tmdbId),
    staleTime: 1000 * 60 * 10,
  })

export const omdbQueryOptions = (imdbId: string) =>
  queryOptions({
    queryKey: ["omdb", imdbId],
    queryFn: () => fetchFilmRatingsFromOMDB(imdbId),
    staleTime: 1000 * 60 * 60,
  })

export const wikidataQueryOptions = (imdbId: string) =>
  queryOptions({
    queryKey: ["wikidata", imdbId],
    queryFn: () => fetchFilmAwardsFromWikidata(imdbId),
    staleTime: 1000 * 60 * 60,
  })

// Non-critical — prefetched by loader, not blocking
export const ytsQueryOptions = (imdbId: string) =>
  queryOptions({
    queryKey: ["yts", imdbId],
    queryFn: () => fetchFilmFromYTS(imdbId),
    staleTime: 1000 * 60 * 5,
  })

export const subtitlesQueryOptions = (imdbId: string) =>
  queryOptions({
    queryKey: ["subtitles", imdbId],
    queryFn: () => fetchSubtitles(imdbId),
    staleTime: 1000 * 60 * 5,
  })

export const likeStatusQueryOptions = (tmdbId: number | string) =>
  queryOptions({
    queryKey: ["watched", String(tmdbId)],
    queryFn: () => checkLikeStatus(tmdbId),
    staleTime: 0,
    retry: false,
  })

export const saveStatusQueryOptions = (tmdbId: number | string) =>
  queryOptions({
    queryKey: ["watchlisted", String(tmdbId)],
    queryFn: () => checkSaveStatus(tmdbId),
    staleTime: 0,
    retry: false,
  })
