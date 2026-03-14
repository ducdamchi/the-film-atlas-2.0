import { useState, useRef, useEffect } from "react"
import { usePersistedState } from "./usePersistedState"
import {
  queryTopRatedFilmByCountryTMDB,
  probeCountryDefaults,
} from "@/Utils/apiCalls"
import { shuffleArray } from "@/Utils/helperFunctions"
import type { TMDBFilmSummary } from "@/types/tmdb"
import type { DiscoverPageState } from "@/types/map"
import type { PopupInfo } from "@/types/map"

const RATING_STEPS = [0, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5] as const
const RANDOM_BATCH_SIZE = 3

interface UseDiscoverFilmsParams {
  isDiscoverMode: boolean
  popupInfo: PopupInfo | null
}

/**
 * The full return value of useDiscoverFilms.
 *
 * All range state is a [min, max] tuple matching `DiscoverFilmParams` in map.ts.
 * `discoverTotalResults` is null until the first successful probe/fetch so that
 * the adaptive rating logic can distinguish "not yet loaded" from "0 results".
 */
export interface UseDiscoverFilmsResult {
  suggestedFilmList: TMDBFilmSummary[]
  page: DiscoverPageState
  setPage: React.Dispatch<React.SetStateAction<DiscoverPageState>>
  discoverBy: string
  setDiscoverBy: React.Dispatch<React.SetStateAction<string>>
  ratingRange: [number, number]
  setRatingRange: React.Dispatch<React.SetStateAction<[number, number]>>
  tempRatingRange: [number, number]
  setTempRatingRange: React.Dispatch<React.SetStateAction<[number, number]>>
  voteCountRange: [number, number]
  setVoteCountRange: React.Dispatch<React.SetStateAction<[number, number]>>
  tempVoteCountRange: [number, number]
  setTempVoteCountRange: React.Dispatch<React.SetStateAction<[number, number]>>
  discoverTotalResults: number | null
  isLoading: boolean
  loadMoreTrigger: React.RefObject<HTMLDivElement | null>
}

/**
 * Manages paginated TMDB film discovery for the selected map country.
 *
 * All range state ([min, max] tuples) is typed as `[number, number]` rather
 * than `number[]` because the code always accesses index [1] for the filter
 * threshold — a plain `number[]` would allow empty arrays through without a
 * compile-time error, while the tuple ensures both elements always exist.
 *
 * `discoverTotalResults` is `number | null` (not `number`) because null is the
 * explicit sentinel meaning "probe hasn't run yet" — the adaptive adjustment
 * effect guards on this before running, preventing premature re-adjustments.
 */
export function useDiscoverFilms({
  isDiscoverMode,
  popupInfo,
}: UseDiscoverFilmsParams): UseDiscoverFilmsResult {
  const [suggestedFilmList, setSuggestedFilmList] = usePersistedState<
    TMDBFilmSummary[]
  >("map-suggestedFilmList", [])

  const [page, setPage] = usePersistedState<DiscoverPageState>("map-page", {
    numPages: 1,
    loadMore: false,
    hasMore: true,
  })

  const [discoverBy, setDiscoverBy] = usePersistedState<string>(
    "map-discoverBy",
    "random",
  )

  const [ratingRange, setRatingRange] = usePersistedState<[number, number]>(
    "map-ratingRange",
    [0, 7],
  )

  const [tempRatingRange, setTempRatingRange] = usePersistedState<
    [number, number]
  >("map-tempRating", [0, 7])

  const [voteCountRange, setVoteCountRange] = usePersistedState<
    [number, number]
  >("map-voteCountRange", [0, 100])

  const [tempVoteCountRange, setTempVoteCountRange] = usePersistedState<
    [number, number]
  >("map-tempVoteCount", [0, 100])

  const [discoverTotalResults, setDiscoverTotalResults] = useState<
    number | null
  >(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const loadMoreTrigger = useRef<HTMLDivElement | null>(null)
  const isPageRefresh = useRef<boolean>(true)
  const calibratedCountryRef = useRef<string | null>(null)
  const lastFetchParamsRef = useRef<string | null>(null)
  const autoAdjustedRef = useRef<boolean>(false)

  /* Intersection Observer */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!isLoading && suggestedFilmList.length > 0) {
              setPage((prevPage) => ({ ...prevPage, loadMore: true }))
            }
          } else {
            setPage((prevPage) => ({ ...prevPage, loadMore: false }))
          }
        }),
      { threshold: 1 },
    )
    if (loadMoreTrigger.current) {
      observer.observe(loadMoreTrigger.current)
    }
    return () => {
      if (loadMoreTrigger.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        observer.unobserve(loadMoreTrigger.current)
      }
      setPage((prevPage) => ({ ...prevPage, loadMore: false }))
    }
  }, [isLoading])

  /* Fetch New Page */
  useEffect(() => {
    const fetchNewPage = async () => {
      if (!isLoading && page.loadMore === true) {
        try {
          setIsLoading(true)
          if (
            popupInfo &&
            popupInfo.iso_a2 !== undefined &&
            ratingRange.length === 2
          ) {
            if (discoverBy === "random") {
              const pageNums = Array.from(
                { length: RANDOM_BATCH_SIZE },
                (_, i) => page.numPages + 1 + i,
              )
              const responses = await Promise.all(
                pageNums.map((p) =>
                  queryTopRatedFilmByCountryTMDB({
                    page: p,
                    countryCode: popupInfo.iso_a2,
                    sortBy: discoverBy,
                    ratingRange,
                    voteCountRange,
                  }),
                ),
              )
              const combined = responses.flatMap((r) => r.results)
              const filtered_results = combined.filter(
                (movie) =>
                  !(movie.backdrop_path === null || movie.poster_path === null),
              )
              if (filtered_results.length > 0) {
                shuffleArray(filtered_results)
                setSuggestedFilmList((prev) => [...prev, ...filtered_results])
                const totalPages = Math.ceil(
                  (discoverTotalResults ?? 0) / 20,
                )
                setPage((prevPage) => ({
                  ...prevPage,
                  numPages: prevPage.numPages + RANDOM_BATCH_SIZE,
                  hasMore:
                    prevPage.numPages + RANDOM_BATCH_SIZE < totalPages,
                }))
              } else {
                setPage((prevPage) => ({
                  ...prevPage,
                  loadMore: false,
                  hasMore: false,
                }))
                console.log("No more pages to load.")
              }
            } else {
              const { results } = await queryTopRatedFilmByCountryTMDB({
                page: page.numPages + 1,
                countryCode: popupInfo.iso_a2,
                sortBy: discoverBy,
                ratingRange,
                voteCountRange,
              })
              const filtered_results = results.filter(
                (movie) =>
                  !(movie.backdrop_path === null || movie.poster_path === null),
              )
              if (filtered_results.length > 0) {
                setSuggestedFilmList((prev) => [...prev, ...filtered_results])
                setPage((prevPage) => ({
                  ...prevPage,
                  numPages: prevPage.numPages + 1,
                }))
              } else {
                setPage((prevPage) => ({
                  ...prevPage,
                  loadMore: false,
                  hasMore: false,
                }))
                console.log("No more pages to load.")
              }
            }
          } else {
            setSuggestedFilmList([])
          }
        } catch (err) {
          console.log(err)
          throw err
        } finally {
          setIsLoading(false)
        }
      }
    }
    fetchNewPage()
  }, [page])

  /* Fetch Initial Page */
  useEffect(() => {
    if (isPageRefresh.current) {
      isPageRefresh.current = false
      return
    }
    if (isDiscoverMode) {
      const getSuggestions = async () => {
        try {
          setIsLoading(true)
          if (
            popupInfo &&
            popupInfo.iso_a2 !== undefined &&
            ratingRange.length === 2
          ) {
            const isoA2 = popupInfo.iso_a2
            let effectiveRatingRange: [number, number] = ratingRange
            let effectiveVoteCountRange: [number, number] = voteCountRange

            if (calibratedCountryRef.current !== isoA2) {
              autoAdjustedRef.current = false
              setDiscoverTotalResults(null)
              const defaults = await probeCountryDefaults(isoA2)
              effectiveRatingRange = [0, defaults.rating]
              effectiveVoteCountRange = [0, defaults.voteCount]
              calibratedCountryRef.current = isoA2
              setRatingRange(effectiveRatingRange)
              setVoteCountRange(effectiveVoteCountRange)
              setTempRatingRange(effectiveRatingRange)
              setTempVoteCountRange(effectiveVoteCountRange)
            }

            const paramsKey = `${isoA2}-${discoverBy}-${effectiveRatingRange[1]}-${effectiveVoteCountRange[1]}`
            if (lastFetchParamsRef.current === paramsKey) return
            lastFetchParamsRef.current = paramsKey

            if (discoverBy === "random") {
              const pageNums = Array.from(
                { length: RANDOM_BATCH_SIZE },
                (_, i) => i + 1,
              )
              const responses = await Promise.all(
                pageNums.map((p) =>
                  queryTopRatedFilmByCountryTMDB({
                    page: p,
                    countryCode: isoA2,
                    sortBy: discoverBy,
                    ratingRange: effectiveRatingRange,
                    voteCountRange: effectiveVoteCountRange,
                  }),
                ),
              )
              const { totalResults } = responses[0]
              const combined = responses.flatMap((r) => r.results)
              const filtered_results = combined.filter(
                (movie) =>
                  !(movie.backdrop_path === null || movie.poster_path === null),
              )
              shuffleArray(filtered_results)
              setSuggestedFilmList(filtered_results)
              setDiscoverTotalResults(totalResults)
              setPage({
                numPages: RANDOM_BATCH_SIZE,
                loadMore: false,
                hasMore: totalResults > RANDOM_BATCH_SIZE * 20,
              })
            } else {
              setPage({ numPages: 1, loadMore: false, hasMore: true })
              const { results, totalResults } =
                await queryTopRatedFilmByCountryTMDB({
                  page: 1,
                  countryCode: isoA2,
                  sortBy: discoverBy,
                  ratingRange: effectiveRatingRange,
                  voteCountRange: effectiveVoteCountRange,
                })
              const filtered_results = results.filter(
                (movie) =>
                  !(movie.backdrop_path === null || movie.poster_path === null),
              )
              setSuggestedFilmList(filtered_results)
              setDiscoverTotalResults(totalResults)
            }
          } else {
            setSuggestedFilmList([])
          }
        } catch (err) {
          console.log(err)
          throw err
        } finally {
          setIsLoading(false)
        }
      }
      getSuggestions()
    }
  }, [isDiscoverMode, popupInfo, discoverBy, ratingRange, voteCountRange])

  /* Adaptive rating adjustment */
  useEffect(() => {
    if (
      !isDiscoverMode ||
      autoAdjustedRef.current ||
      discoverTotalResults === null
    )
      return

    const currentRating = ratingRange[1]
    let nextRating: number | null = null

    if (discoverTotalResults < 20 && currentRating > 0) {
      const idx = RATING_STEPS.findIndex((s) => s >= currentRating)
      const currentIdx = idx === -1 ? RATING_STEPS.length - 1 : idx
      const nextIdx = Math.max(currentIdx - 1, 0)
      if (RATING_STEPS[nextIdx] !== currentRating)
        nextRating = RATING_STEPS[nextIdx]
    } else if (discoverTotalResults > 200 && currentRating < 7.5) {
      const idx = RATING_STEPS.findIndex((s) => s > currentRating)
      const nextIdx = idx === -1 ? RATING_STEPS.length - 1 : idx
      if (RATING_STEPS[nextIdx] !== currentRating)
        nextRating = RATING_STEPS[nextIdx]
    }

    if (nextRating !== null) {
      setRatingRange([0, nextRating])
      setTempRatingRange([0, nextRating])
    }

    autoAdjustedRef.current = true
  }, [discoverTotalResults, isDiscoverMode, ratingRange])

  return {
    suggestedFilmList,
    page,
    setPage,
    discoverBy,
    setDiscoverBy,
    ratingRange,
    setRatingRange,
    tempRatingRange,
    setTempRatingRange,
    voteCountRange,
    setVoteCountRange,
    tempVoteCountRange,
    setTempVoteCountRange,
    discoverTotalResults,
    isLoading,
    loadMoreTrigger,
  }
}
