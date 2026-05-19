import { useRef, useEffect } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { queryTopRatedFilmByCountryTMDB } from "@/utils/apiCalls"
import { shuffleArray } from "@/utils/helperFunctions"
import { COUNTRY_DEFAULTS, GLOBAL_DEFAULTS } from "@/data/countryDefaults"
import type { TMDBFilmSummary } from "@/types/tmdb"
import type { DiscoverFilterMode, DiscoverSort } from "@/routes/map"

const RANDOM_BATCH_SIZE = 3

// Module-level epoch map for random-mode cache busting.
// Bumped when the user switches away from random and back, forcing a fresh shuffle.
// Lives outside the hook so it survives component unmounts (full browser session).
const randomEpochs = new Map<string, number>()
function getOrInitEpoch(isoA2: string): number {
  if (!randomEpochs.has(isoA2)) randomEpochs.set(isoA2, Date.now())
  return randomEpochs.get(isoA2)!
}
function bumpEpoch(isoA2: string): void {
  randomEpochs.set(isoA2, Date.now())
}

interface UseDiscoverFilmsParams {
  isDiscoverMode: boolean
  isoA2: string | null | undefined
  dsort: DiscoverSort
  filter: DiscoverFilterMode
  /** Used only when filter === "custom" */
  rating: number
  /** Used only when filter === "custom" */
  votes: number
}

export interface UseDiscoverFilmsResult {
  suggestedFilmList: TMDBFilmSummary[]
  isLoading: boolean
  hasNextPage: boolean
  loadMoreTrigger: React.RefObject<HTMLDivElement | null>
}

/**
 * Manages paginated TMDB film discovery for the selected map country.
 *
 * Filter thresholds are resolved synchronously:
 *   - "recommended" mode: static per-country lookup from countryDefaults.ts
 *     (pre-calibrated offline, no async probe needed).
 *   - "custom" mode: user-supplied rating/votes values from URL params.
 *
 * Uses useInfiniteQuery for per-country caching. The shuffled order for
 * random mode is baked into the cache so revisiting a country restores the
 * same list instantly. Switching away from random and back bumps an epoch
 * in the query key, forcing a fresh fetch and new shuffle.
 */
export function useDiscoverFilms({
  isDiscoverMode,
  isoA2,
  dsort,
  filter,
  rating,
  votes,
}: UseDiscoverFilmsParams): UseDiscoverFilmsResult {
  // Resolve filters synchronously — no async probe
  const filters =
    filter === "custom"
      ? { rating, voteCount: votes }
      : (COUNTRY_DEFAULTS[isoA2 ?? ""] ?? GLOBAL_DEFAULTS)

  // Bump random epoch when switching back to random so the cached shuffle
  // is discarded and a new one is fetched.
  const prevDsortRef = useRef(dsort)
  useEffect(() => {
    const prev = prevDsortRef.current
    prevDsortRef.current = dsort
    if (prev !== "random" && dsort === "random" && isoA2) {
      bumpEpoch(isoA2)
    }
  }, [dsort, isoA2])

  const epoch = isoA2 && dsort === "random" ? getOrInitEpoch(isoA2) : null

  const loadMoreTrigger = useRef<HTMLDivElement | null>(null)

  const { data, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey: [
        "discover",
        isoA2,
        dsort,
        filters.rating,
        filters.voteCount,
        epoch,
      ],
      queryFn: async ({ queryKey, pageParam }) => {
        // Destructure from key so the fn always uses the values it was keyed on,
        // regardless of closure staleness.
        const [, countryCode, sortBy, ratingMax, voteCountMax] = queryKey as [
          string,
          string,
          string,
          number,
          number,
        ]
        const ratingRange: [number, number] = [0, ratingMax]
        const voteCountRange: [number, number] = [0, voteCountMax]
        const batchIndex = pageParam as number

        if (sortBy === "random") {
          const startPage = batchIndex * RANDOM_BATCH_SIZE + 1
          const pageNums = Array.from(
            { length: RANDOM_BATCH_SIZE },
            (_, i) => startPage + i,
          )
          const responses = await Promise.all(
            pageNums.map((p) =>
              queryTopRatedFilmByCountryTMDB({
                page: p,
                countryCode,
                sortBy,
                ratingRange,
                voteCountRange,
              }),
            ),
          )
          const results = responses
            .flatMap((r) => r.results)
            .filter((m) => m.backdrop_path !== null && m.poster_path !== null)
          shuffleArray(results)
          return { results, totalResults: responses[0].totalResults }
        } else {
          const { results, totalResults } =
            await queryTopRatedFilmByCountryTMDB({
              page: batchIndex + 1,
              countryCode,
              sortBy,
              ratingRange,
              voteCountRange,
            })
          return {
            results: results.filter(
              (m) => m.backdrop_path !== null && m.poster_path !== null,
            ),
            totalResults,
          }
        }
      },
      initialPageParam: 0,
      getNextPageParam: (lastPage, allPages) => {
        const batchSize = dsort === "random" ? RANDOM_BATCH_SIZE : 1
        const tmdbPagesFetched = allPages.length * batchSize
        const totalTmdbPages = Math.ceil(lastPage.totalResults / 20)
        return tmdbPagesFetched < totalTmdbPages ? allPages.length : undefined
      },
      staleTime: 5 * 60 * 1000,
      enabled: !!isoA2 && isDiscoverMode,
    })

  const suggestedFilmList = data?.pages.flatMap((p) => p.results) ?? []

  /* Intersection Observer — triggers next page load */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isFetchingNextPage && hasNextPage) {
            fetchNextPage()
          }
        }),
      { threshold: 0, rootMargin: "0px 0px 400px 0px" },
    )
    if (loadMoreTrigger.current) observer.observe(loadMoreTrigger.current)
    return () => {
      if (loadMoreTrigger.current) observer.unobserve(loadMoreTrigger.current)
    }
  }, [isFetchingNextPage, hasNextPage, fetchNextPage])

  return {
    suggestedFilmList,
    isLoading: isFetching && !isFetchingNextPage,
    hasNextPage: hasNextPage ?? false,
    loadMoreTrigger,
  }
}
