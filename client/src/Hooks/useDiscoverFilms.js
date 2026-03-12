import { useState, useRef, useEffect } from "react"
import { usePersistedState } from "./usePersistedState"
import {
  queryTopRatedFilmByCountryTMDB,
  probeCountryDefaults,
} from "@/Utils/apiCalls"
import { shuffleArray } from "@/Utils/helperFunctions"

const RATING_STEPS = [0, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5]
const RANDOM_BATCH_SIZE = 3

export function useDiscoverFilms({ isDiscoverMode, popupInfo }) {
  const [suggestedFilmList, setSuggestedFilmList] = usePersistedState(
    "map-suggestedFilmList",
    [],
  )
  const [page, setPage] = usePersistedState("map-page", {
    numPages: 1,
    loadMore: false,
    hasMore: true,
  })
  const [discoverBy, setDiscoverBy] = usePersistedState(
    "map-discoverBy",
    "random",
  )
  const [ratingRange, setRatingRange] = usePersistedState(
    "map-ratingRange",
    [0, 7],
  )
  const [tempRatingRange, setTempRatingRange] = usePersistedState(
    "map-tempRating",
    [0, 7],
  )
  const [voteCountRange, setVoteCountRange] = usePersistedState(
    "map-voteCountRange",
    [0, 100],
  )
  const [tempVoteCountRange, setTempVoteCountRange] = usePersistedState(
    "map-tempVoteCount",
    [0, 100],
  )
  const [discoverTotalResults, setDiscoverTotalResults] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const loadMoreTrigger = useRef(null)
  const isPageRefresh = useRef(true)
  const calibratedCountryRef = useRef(null)
  const lastFetchParamsRef = useRef(null)
  const autoAdjustedRef = useRef(false)

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
            ratingRange.length == 2
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
                const totalPages = Math.ceil(discoverTotalResults / 20)
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
            ratingRange.length == 2
          ) {
            const isoA2 = popupInfo.iso_a2
            let effectiveRatingRange = ratingRange
            let effectiveVoteCountRange = voteCountRange

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
    let nextRating = null

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
