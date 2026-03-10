import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useContext,
} from "react"
import {
  Map,
  Source,
  Layer,
  Popup,
  NavigationControl,
  ScaleControl,
  FullscreenControl,
} from "react-map-gl/maplibre"

import * as maptilersdk from "@maptiler/sdk"
import "@maptiler/sdk/dist/maptiler-sdk.css"
import "react-range-slider-input/dist/style.css"
import "../App.css"

import { AuthContext } from "../Utils/authContext"
import { getCountryName, shuffleArray } from "../Utils/helperFunctions"
import {
  fetchListByParams,
  queryTopRatedFilmByCountryTMDB,
  probeCountryDefaults,
} from "../Utils/apiCalls"
import useCommandKey from "../Hooks/useCommandKey"
import { usePersistedState } from "../Hooks/usePersistedState"

import NavBar from "./Shared/Navigation-Search/NavBar"
import QuickSearchModal from "./Shared/Navigation-Search/QuickSearchModal"
import FilmUser_Gallery from "./Shared/Films/FilmUser_Gallery"
import FilmTMDB_Gallery from "./Shared/Films/FilmTMDB_Gallery"
import Toggle_Two from "./Shared/Buttons/Toggle_Two"
import Toggle_Three from "./Shared/Buttons/Toggle_Three"
import Toggle_Four from "./Shared/Buttons/Toggle_Four"
import CustomSlider from "./Shared/Buttons/CustomSlider"
import LoadingPage from "./Shared/Navigation-Search/LoadingPage"

import {
  FaSortNumericDown,
  FaSortNumericDownAlt,
  FaGripLines,
} from "react-icons/fa"
import {
  MdKeyboardArrowDown,
  MdKeyboardArrowUp,
  MdDragHandle,
} from "react-icons/md"
import { RiArrowDownWideLine, RiArrowUpWideLine } from "react-icons/ri"

export default function MapPage() {
  /* Map const */
  const mapRef = useRef(null)
  const belowMapRef = useRef(null)
  const MAPTILER_API_KEY = "0bsarBRVUOINHDtiYsY0"
  const [firstSymbolId, setFirstSymbolId] = useState(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [popupInfo, setPopupInfo] = usePersistedState("map-popupInfo", null)
  const [filmsPerCountryData, setFilmsPerCountryData] = useState({})
  const [screenWidth, setScreenWidth] = useState(window.innerWidth)
  const [isXlBreakpoint, setIsXlBreakpoint] = useState(false) // true when window width is >= 80rem (1280px)

  /* API request const */
  const [mapFilmData, setMapFilmData] = useState([])
  const [userFilmList, setUserFilmList] = useState([])
  const [suggestedFilmList, setSuggestedFilmList] = usePersistedState(
    "map-suggestedFilmList",
    [],
  )
  const [isDiscoverMode, setIsDiscoverMode] = usePersistedState(
    "map-isDiscoverMode",
    false,
  )
  const [isLoading, setIsLoading] = useState(false)
  const [discoverTotalResults, setDiscoverTotalResults] = useState(null)

  /* Persistent states */
  const [sortBy, setSortBy] = usePersistedState("map-sortBy", "added_date")
  const [sortDirection, setSortDirection] = usePersistedState(
    "map-sortDirection",
    "desc",
  )
  const [queryString, setQueryString] = usePersistedState(
    "map-queryString",
    "discover",
  )
  const [numStars, setNumStars] = usePersistedState("map-numStars", 0)
  const [discoverBy, setDiscoverBy] = usePersistedState(
    "map-discoverBy",
    "random",
  )
  const [scrollPosition, setScrollPosition] = usePersistedState(
    "map-scrollPosition",
    0,
  )

  /* Slider - Rating const */
  const [ratingRange, setRatingRange] = usePersistedState(
    "map-ratingRange",
    [0, 7],
  )
  const [tempRatingRange, setTempRatingRange] = usePersistedState(
    "map-tempRating",
    [0, 7],
  )

  /* Slider - Vote Count const */
  const [voteCountRange, setVoteCountRange] = usePersistedState(
    "map-voteCountRange",
    [0, 100],
  )
  const [tempVoteCountRange, setTempVoteCountRange] = usePersistedState(
    "map-tempVoteCount",
    [0, 100],
  )

  /* Authentication */
  const { authState, searchModalOpen, setSearchModalOpen } =
    useContext(AuthContext)

  const loadMoreTrigger = useRef(null)
  // const [page, setPage] = usePersistedState("map-page", 1)
  const [page, setPage] = usePersistedState("map-page", {
    numPages: 1,
    loadMore: false,
    hasMore: true,
  })

  const [showBelowMapContent, setShowBelowMapContent] = usePersistedState(
    "map-showBelowMapContent",
    false,
  )

  // const [hasMore, setHasMore] = useState(true)
  const isPageRefresh = useRef(true)
  const calibratedCountryRef = useRef(null) // tracks which country was last probed
  const lastFetchParamsRef = useRef(null) // prevents duplicate fetches after calibration sets state
  const autoAdjustedRef = useRef(false) // ensures adaptive rating adjustment fires once per country
  const mapContainerRef = useRef(null) // used to read map height for drag snap positions
  const isDragEndRef = useRef(false) // suppresses snap animation when state is updated after a drag

  const RATING_STEPS = [0, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5]
  const RANDOM_BATCH_SIZE = 3 // pages fetched per load in random mode

  const setFeatureStates = useCallback(() => {
    if (!mapRef.current) return

    const map = mapRef.current
    const countries = map.queryRenderedFeatures({
      layers: ["countriesLayer"],
    })
    countries.forEach((country) => {
      if (
        country.properties.iso_a2 &&
        filmsPerCountryData[country.properties.iso_a2]
      ) {
        map.setFeatureState(
          {
            source: "countriesData",
            sourceLayer: "administrative",
            id: country.id,
          },
          {
            num_watched_films:
              filmsPerCountryData[country.properties.iso_a2].num_watched_films,
          },
        )

        // if (country.properties.iso_a2 === "")
      }
      //921 & 907: iso_i3 for West Bank and Gaza
      if (country.id === 921 || country.id === 907) {
        // console.log("Detected films from PS.")
        map.setFeatureState(
          {
            source: "countriesData",
            sourceLayer: "administrative",
            id: country.id,
          },
          {
            custom_name: "Palestine",
          },
        )
        if (filmsPerCountryData["PS"]) {
          // console.log("Detected films from PS.")
          map.setFeatureState(
            {
              source: "countriesData",
              sourceLayer: "administrative",
              id: country.id,
            },
            {
              custom_name: "Palestine",
              num_watched_films: filmsPerCountryData["PS"].num_watched_films,
            },
          )
        }
      }
    })
  }, [filmsPerCountryData])

  const onData = useCallback(
    (event) => {
      if (event.sourceId === "countriesData" && event.isSourceLoaded) {
        // console.log("statesData source loaded, setting feature states...")
        setFeatureStates()
      }
    },
    [setFeatureStates],
  )

  const onMapLoad = useCallback(
    (event) => {
      mapRef.current = event.target // Store the map instance in the ref
      const map = mapRef.current // use the ref to access the map

      map.on("data", onData)

      if (mapRef.current.isSourceLoaded("countriesData")) {
        setFeatureStates()
      }

      const layers = map.getStyle().layers
      const firstSymbolLayerId = layers.find(
        (layer) => layer.type === "symbol",
      ).id

      if (firstSymbolLayerId) {
        setFirstSymbolId(firstSymbolLayerId)
      }

      setIsMapLoaded(true)
    },
    [onData, setFeatureStates],
  )

  const onMapClick = useCallback((event) => {
    let clickedFeature
    let numWatchedFilms
    let countryName
    let customName
    let isoA2

    // console.log("clicked")
    // console.log("event: ", event)
    if (!mapRef.current) return

    const features = mapRef.current.queryRenderedFeatures(event.point, {
      layers: ["countriesLayer"],
    })

    // console.log(features)

    if (features.length > 0) {
      clickedFeature = features[0]
      numWatchedFilms = clickedFeature.state?.num_watched_films
      customName = clickedFeature.state?.custom_name
      countryName = clickedFeature.properties?.name
      if (customName === "Palestine") {
        isoA2 = "PS"
      } else {
        isoA2 = clickedFeature.properties?.iso_a2
      }
    }

    // console.log("PopupInfo being set")

    setPopupInfo({
      longitude: event.lngLat.lng,
      latitude: event.lngLat.lat,
      num_watched_films: numWatchedFilms >= 1 ? numWatchedFilms : 0,
      country_name: countryName,
      custom_name: customName,
      iso_a2: isoA2,
    })
  }, [])

  function toggleSearchModal() {
    setSearchModalOpen((status) => !status)
  }
  useCommandKey(toggleSearchModal, "k")

  /*******************************************************************/
  /* HOOKS TO HANDLE DISCOVER MODE & SCROLL RESTORATION */
  /* Set Scroll Position Hook */
  useEffect(() => {
    // console.log("Loading state: ", isLoading)
    if (!isLoading) {
      if (scrollPosition) {
        // use setTimeout as a temporary solution to make sure page content fully loads before scroll restoration starts. When watched/rated films become a lot, the 300ms second might not be enough and a new solution will be required.
        setTimeout(() => {
          window.scrollTo(0, parseInt(scrollPosition, 10))
        }, 300)
      } else {
        setTimeout(() => {
          window.scrollTo(0, 0)
        }, 0)
      }

      const handleScroll = () => {
        setScrollPosition(window.scrollY)
      }

      const scrollTimer = setTimeout(() => {
        window.addEventListener("scroll", handleScroll)
      }, 500)

      return () => {
        clearTimeout(scrollTimer)
        window.removeEventListener("scroll", handleScroll)
      }
    }
  }, [isLoading])

  /* Intersection Observer Hook */
  useEffect(() => {
    const observer = new IntersectionObserver((entries) =>
      entries.forEach(
        (entry) => {
          if (entry.isIntersecting) {
            if (!isLoading && suggestedFilmList.length > 0) {
              // console.log("Intersection Observer doing something: ", page)
              setPage((prevPage) => ({ ...prevPage, loadMore: true }))
            }
          } else {
            setPage((prevPage) => ({ ...prevPage, loadMore: false }))
          }
        },
        {
          threshold: 1,
        },
      ),
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

  /* Hook to switch on/off Discover Mode */
  useEffect(() => {
    if (queryString === "discover") {
      setIsDiscoverMode(true)
    } else {
      setIsDiscoverMode(false)
    }

    if (queryString !== "watched/rated/by_country") {
      setNumStars(null)
    }
  }, [queryString])

  /* Fetch New Page Hook */
  useEffect(() => {
    const fetchNewPage = async () => {
      /* This IF tells the hook to only fetch New Page when loadMore is set to true. setPage is controlled in three places: (1) the Fetch Initial Page hook, which always reinitializes page, (2) the Intersection Observer Hook, which sets loadMore to true if intersection happens, and false otherwise, and (3) the FilmTMDB_Card children component, which sets loadMore to false whenever a film is clicked on. */
      if (!isLoading && page.loadMore === true) {
        // console.log("Fetch New Page doing something: ", page)
        try {
          setIsLoading(true)
          if (
            popupInfo &&
            popupInfo.iso_a2 !== undefined &&
            ratingRange.length == 2
          ) {
            if (discoverBy === "random") {
              // Fetch the next batch of pages in parallel, then shuffle the combined results
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
                    ratingRange: ratingRange,
                    voteCountRange: voteCountRange,
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
                setSuggestedFilmList((prevResults) => [
                  ...prevResults,
                  ...filtered_results,
                ])
                const totalPages = Math.ceil(discoverTotalResults / 20)
                setPage((prevPage) => ({
                  ...prevPage,
                  numPages: prevPage.numPages + RANDOM_BATCH_SIZE,
                  hasMore: prevPage.numPages + RANDOM_BATCH_SIZE < totalPages,
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
                ratingRange: ratingRange,
                voteCountRange: voteCountRange,
              })

              const filtered_results = results.filter(
                (movie) =>
                  !(movie.backdrop_path === null || movie.poster_path === null),
              )

              if (filtered_results.length > 0) {
                setSuggestedFilmList((prevResults) => [
                  ...prevResults,
                  ...filtered_results,
                ])
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
            // If requested country is different from previously requested country
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

  /* Fetch Initial Page Hook for discover mode*/
  useEffect(() => {
    /* This IF detects a page refresh and skips a unnecessary rerender. Thus, the API call for suggetions only fire when user selects a new country or adjust any of the dependecies array below. */
    if (isPageRefresh.current) {
      // console.log("Page refreshed, skipping handle Discover: ", page)
      isPageRefresh.current = false
      return
    }

    if (isDiscoverMode) {
      // console.log("handle Discover hook doing something: ", page)
      const getSuggestions = async () => {
        try {
          setIsLoading(true)
          // setScrollPosition(0)
          if (
            popupInfo &&
            popupInfo.iso_a2 !== undefined &&
            ratingRange.length == 2
          ) {
            const isoA2 = popupInfo.iso_a2
            let effectiveRatingRange = ratingRange
            let effectiveVoteCountRange = voteCountRange

            // Probe TMDB for appropriate defaults when the country changes
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

            // Skip if this exact fetch already ran (e.g. re-render after calibration set state)
            const paramsKey = `${isoA2}-${discoverBy}-${effectiveRatingRange[1]}-${effectiveVoteCountRange[1]}`
            if (lastFetchParamsRef.current === paramsKey) return
            lastFetchParamsRef.current = paramsKey

            if (discoverBy === "random") {
              // Fetch first batch of pages in parallel, then shuffle the combined results
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
              //Reinitialize setPage, as this API request only gets called when user select a new country or adjust any of the dependecies array below
              setPage({ numPages: 1, loadMore: false, hasMore: true })
              // This is the standard query whenever any of the parameters change. Default page number is 1.
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

            // If requested country is different from previously requested country
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

  /* Adaptive rating adjustment — relaxes rating if too few results, tightens if too many */
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
      // Too few results: step rating down
      const idx = RATING_STEPS.findIndex((s) => s >= currentRating)
      const currentIdx = idx === -1 ? RATING_STEPS.length - 1 : idx
      const nextIdx = Math.max(currentIdx - 1, 0)
      if (RATING_STEPS[nextIdx] !== currentRating)
        nextRating = RATING_STEPS[nextIdx]
    } else if (discoverTotalResults > 200 && currentRating < 7.5) {
      // Too many results: step rating up
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
  /*******************************************************************/

  /* Dynamically obtain screen width of window */
  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth)
      // setScreenHeight(window.innerHeight)
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  /* Fetch User's film list (liked or watchlisted) from App's DB when page first loads */
  useEffect(() => {
    if (authState.status) {
      // console.log("Fetch Initial User Likes doing something")
      const fetchInitialLikeData = async () => {
        try {
          setIsLoading(true)
          const result = await fetchListByParams({
            queryString: "watched",
          })
          setMapFilmData(result)
        } catch (err) {
          console.log("Error Fetching User Like Data: ", err)
        } finally {
          setIsLoading(false)
        }
      }
      fetchInitialLikeData()
    } else {
      // alert("Log in to interact with map!")
    }
  }, [])

  /* Hook to extract data from App's DB to display on map */
  useEffect(() => {
    const data = {}
    mapFilmData.forEach((film) => {
      film.origin_country.forEach((country) => {
        // If country already added as key, increment film counter
        if (country in data) {
          // console.log("Country already added as key: ", country)
          data[country].num_watched_films++
          // If country shows up first time, set film counter = 0
        } else {
          data[country] = {
            name: getCountryName(country),
            num_watched_films: 1,
          }
        }
      })
    })
    setFilmsPerCountryData(data)
  }, [mapFilmData])

  /* Hook to handle querying & sorting User Watched Films */
  useEffect(() => {
    /* Check if selected region is valid */
    if (
      popupInfo &&
      popupInfo.iso_a2 !== null &&
      popupInfo.iso_a2 !== undefined
    ) {
      setShowBelowMapContent(true)
    } else {
      setShowBelowMapContent(false)
    }

    /* Process console selections */
    if (authState.status && !isDiscoverMode) {
      if (popupInfo && popupInfo.iso_a2 !== undefined) {
        const fetchFilmsByCountry = async () => {
          try {
            setIsLoading(true)
            const result = await fetchListByParams({
              queryString: queryString,
              countryCode: popupInfo.iso_a2,
              sortBy: sortBy,
              sortDirection: sortDirection,
              numStars: numStars,
            })
            setUserFilmList(result)
          } catch (err) {
            console.log("Error Fetching User Film List: ", err)
          } finally {
            setIsLoading(false)
          }
        }
        fetchFilmsByCountry()
      }
    }
  }, [popupInfo, sortBy, sortDirection, numStars, queryString])

  /* Clean up event listeners when map unmounts */
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.off("data", onData)
      }
    }
  }, [onData])

  /* Compute snap positions in pixels from the map container's actual rendered height */
  function getSnapPositions() {
    const mapHeight = mapContainerRef.current
      ? mapContainerRef.current.getBoundingClientRect().height
      : isXlBreakpoint
        ? 880
        : 640
    return {
      peek: -(mapHeight * 0.05), // 5% of map height visible at bottom
      expanded: -(mapHeight * 0.95), // covers 95% of the map
    }
  }

  /* Drag handler for the bottom sheet handle.
     Defines handleMove/handleUp inside the closure so the same references
     are used for both addEventListener and removeEventListener. */
  function onDragHandlePointerDown(e) {
    if (e.button !== 0) return
    const initialTopPx = parseFloat(belowMapRef.current.style.top) || 0
    const startY = e.clientY
    let isDragging = false

    function handleMove(e) {
      const delta = e.clientY - startY
      if (!isDragging) {
        if (Math.abs(delta) < 5) return // ignore tiny movements (clicks)
        isDragging = true
        belowMapRef.current.style.transition = "none"
      }
      const { peek, expanded } = getSnapPositions()
      const newTop = Math.min(peek, Math.max(expanded, initialTopPx + delta))
      belowMapRef.current.style.top = `${newTop}px`
    }

    function handleUp() {
      window.removeEventListener("pointermove", handleMove)
      window.removeEventListener("pointerup", handleUp)
      if (!isDragging) return
      belowMapRef.current.style.transition = "top 0.5s ease-in-out"
      const finalTop = parseFloat(belowMapRef.current.style.top) || 0
      const { peek, expanded } = getSnapPositions()
      const midpoint = (peek + expanded) / 2
      // sheet is "expanded" when top is closer to the expanded (more negative) snap point
      isDragEndRef.current = true
      setShowBelowMapContent(finalTop < midpoint)
    }

    window.addEventListener("pointermove", handleMove)
    window.addEventListener("pointerup", handleUp)
  }

  /* Hook to animate the sheet to its snap position.
     Skipped when the state change came from a drag release — the sheet already
     sits at the correct position and we don't want it snapping to an end. */
  useEffect(() => {
    if (isDragEndRef.current) {
      isDragEndRef.current = false
      return
    }
    if (!belowMapRef.current) return
    const { peek, expanded } = getSnapPositions()
    belowMapRef.current.style.transition = "top 0.5s ease-in-out"
    belowMapRef.current.style.top = `${showBelowMapContent ? expanded : peek}px`
  }, [showBelowMapContent, isXlBreakpoint])

  useEffect(() => {
    if (screenWidth >= 1280) {
      setIsXlBreakpoint(true)
    } else {
      setIsXlBreakpoint(false)
    }
  }, [screenWidth])

  return (
    <div className="font-primary flex flex-col justify-center w-[100vw] mt-[4.5rem] relative">
      {isLoading && <LoadingPage />}

      {/* Quick Search Modal */}
      {searchModalOpen && (
        <QuickSearchModal
          searchModalOpen={searchModalOpen}
          setSearchModalOpen={setSearchModalOpen}
        />
      )}
      <NavBar />

      {/* Entire map */}
      <div
        ref={mapContainerRef}
        className="w-screen h-[40rem] xl:h-[55rem] max-h-[90vh] relative border-[0.3rem] border-[#b8d5e5]">
        <Map
          className=""
          ref={mapRef}
          onLoad={onMapLoad}
          onClick={onMapClick}
          // onMouseEnter={onMapClick}
          mapboxAccessToken={MAPTILER_API_KEY}
          initialViewState={{ latitude: 25, longitude: 150, zoom: 1.2 }}
          mapStyle={
            "https://api.maptiler.com/maps/0199f849-b24f-7c0c-a482-2c1149331519/style.json?key=0bsarBRVUOINHDtiYsY0"
          }>
          {/* Map Controls */}
          <NavigationControl
            position="top-right"
            showCompass={false}
            showZoom={true}
            visualizePitch={true}
          />

          <Source
            id="countriesData"
            type="vector"
            url="https://api.maptiler.com/tiles/countries/tiles.json?key=0bsarBRVUOINHDtiYsY0">
            <Layer
              id="countriesLayer"
              source="countriesData"
              source-layer="administrative"
              type="fill"
              paint={{
                "fill-color": [
                  "case",
                  [
                    "!=",
                    ["to-number", ["feature-state", "num_watched_films"]],
                    0,
                  ],
                  [
                    "interpolate",
                    ["linear"],
                    ["feature-state", "num_watched_films"],
                    1,
                    "#faf1f3",
                    // "#fff1f2",
                    30,
                    "#e81445",
                    // "#4d0218",
                  ],
                  "rgba(126, 126, 126, 0)",
                ],
                "fill-opacity": 1,
                "fill-outline-color": "#d5e5b8",
              }}
              filter={["==", "level", 0]}
              beforeId={firstSymbolId}></Layer>
            <Layer
              id="countriesLayer"
              source="countriesData"
              source-layer="administrative"
              type="symbol"
              layout={{
                "text-field": [
                  "case",
                  ["!=", ["feature-state", "custom_name"], ""],
                  ["feature-state", "custom_name"], // Use custom name if available
                  ["get", "NAME"], // Fallback to original name
                ],
                "text-size": 12,
                "text-font": ["Open Sans Bold"],
                "text-allow-overlap": false,
                "text-optional": true,
              }}
              paint={{
                "text-color": "#000000",
                "text-halo-color": "#ffffff",
                "text-halo-width": 1,
              }}
              filter={["==", "level", 0]}
              beforeId={firstSymbolId}></Layer>
          </Source>

          {popupInfo && (
            <Popup
              longitude={popupInfo.longitude}
              latitude={popupInfo.latitude}
              anchor="bottom"
              closeOnClick={false}
              onClose={() => setPopupInfo(null)}>
              <div className="flex flex-col items-center justify-center hover:text-blue-600 cursor-pointer">
                {popupInfo.custom_name !== undefined && (
                  <span className="font-bold">{popupInfo.custom_name}</span>
                )}
                {popupInfo.custom_name === undefined && (
                  <span className="font-bold">{popupInfo.country_name}</span>
                )}

                <span>
                  <span className="font-bold">
                    {`${popupInfo.num_watched_films}`}&nbsp;
                  </span>
                  <span>{`watched films`}</span>
                </span>
              </div>
            </Popup>
          )}
        </Map>
      </div>

      {/* Entire page below map */}
      <div
        className="relative flex flex-col items-center w-full bg-white z-90 min-h-[40rem] xl:min-h-[55rem] rounded-t-4xl shadow-[25px_-8px_30px_rgba(0,0,0,0.15)] [clip-path:inset(-100%_-100%_0_-100%)]"
        ref={belowMapRef}>
        {/* Drag handle — drag freely to any height, or click arrow to snap between positions */}
        <div
          className="w-full flex flex-col items-center cursor-ns-resize touch-none select-none rounded-t-4xl hover:bg-gray-100 transition-colors ease-out duration-200 py-2 mb-2"
          onClick={() => setShowBelowMapContent((prev) => !prev)}
          onPointerDown={onDragHandlePointerDown}>
          <FaGripLines className="text-2xl text-gray-300" />
          {/* <button
            className="text-4xl flex items-center justify-center text-gray-300 w-full py-1"
            onClick={() => setShowBelowMapContent((prev) => !prev)}>
            {showBelowMapContent ? <RiArrowDownWideLine /> : <RiArrowUpWideLine />}
          </button> */}
        </div>
        {popupInfo &&
          popupInfo.iso_a2 !== null &&
          popupInfo.iso_a2 !== undefined && (
            <div className="page-title-map font-heading">{`${getCountryName(popupInfo.iso_a2)}`}</div>
          )}

        {(!popupInfo ||
          popupInfo.iso_a2 === null ||
          popupInfo.iso_a2 === undefined) && (
          <div className="flex flex-col items-center justify-center">
            <div className="page-title-map font-heading">select region</div>
            <div>(click on a valid region on map to start)</div>
          </div>
        )}

        <div className="flex flex-col items-center justify-center mt-5 w-[90%] min-w-[20rem] md:w-[35rem]">
          {/* Discover / My Films toggle */}
          <Toggle_Two
            label="Browse"
            state={isDiscoverMode ? "discover" : "my_films"}
            setState={(val) => {
              if (val === "discover") setQueryString("discover")
              else setQueryString("watched/by_country")
            }}
            stateDetails={{
              1: { value: "discover", label: "Discover" },
              2: { value: "my_films", label: "My Films" },
            }}
          />

          {/* Watched / Watchlist / Rated toggle */}
          {!isDiscoverMode && (
            <Toggle_Three
              label="Filter"
              state={queryString}
              setState={setQueryString}
              stateDetails={{
                1: { value: "watched/by_country", label: "Watched" },
                2: { value: "watchlisted/by_country", label: "Watchlist" },
                3: { value: "watched/rated/by_country", label: "Rated" },
              }}
            />
          )}

          {!isDiscoverMode && (
            <div className="flex flex-col items-center justify-center">
              <Toggle_Two
                label="Sort By"
                width={`20rem`}
                height={`2.5rem`}
                state={sortBy}
                setState={setSortBy}
                stateDetails={{
                  1: { value: "added_date", label: "Recently Added" },
                  2: { value: "released_date", label: "Released Year" },
                }}
              />
              <Toggle_Two
                label="Sort Order"
                width={`10rem`}
                height={`2.5rem`}
                state={sortDirection}
                setState={setSortDirection}
                stateDetails={{
                  1: {
                    value: "desc",
                    label: (
                      <FaSortNumericDownAlt className="text-xl mt-0 w-[5rem]" />
                    ),
                  },
                  2: {
                    value: "asc",
                    label: (
                      <FaSortNumericDown className="text-xl mt-0 w-[5rem]" />
                    ),
                  },
                }}
              />
            </div>
          )}
          {!isDiscoverMode && queryString === "watched/rated/by_country" && (
            <Toggle_Four
              label="Rating"
              width={`20rem`}
              height={`2.5rem`}
              state={numStars}
              setState={setNumStars}
              stateDetails={{
                1: {
                  value: 0,
                  label: <span className="">All</span>,
                },
                2: {
                  value: 3,
                  label: (
                    <span className="text-2xl text-pink-600">
                      &#10048;&#10048;&#10048;
                    </span>
                  ),
                },
                3: {
                  value: 2,
                  label: (
                    <span className="text-2xl text-pink-600">
                      &#10048;&#10048;
                    </span>
                  ),
                },
                4: {
                  value: 1,
                  label: (
                    <span className="text-2xl text-pink-600">&#10048;</span>
                  ),
                },
              }}
            />
          )}
          {isDiscoverMode && (
            <div className="flex flex-col items-center gap-0 mb-7">
              <Toggle_Three
                label="Sort By"
                width="20rem"
                height="2.5rem"
                state={discoverBy}
                setState={setDiscoverBy}
                stateDetails={{
                  //"random" is not a valid parameter for TMDB sortBy, so api would return default sortBy, which is popularity.desc
                  1: { value: "random", label: "Random" },
                  2: { value: "vote_average.desc", label: "Top Rated" },
                  3: { value: "vote_count.desc", label: "Most Voted" },
                }}
              />

              {/* Custom Slider */}
              <div className="toggleButton-whole">
                <div className="toggleButton-label">Filter</div>
                <div className="flex flex-col items-center justify-center gap-6 p-6 rounded-3xl bg-gray-200 filterButton-container">
                  <div className="w-full flex flex-col items-center justify-center gap-2 uppercase font-semibold text-gray-600">
                    <div className="">
                      Average Rating &#x2265; {`${tempRatingRange[1]}`}
                    </div>
                    <CustomSlider
                      width="15rem"
                      id="slider-simple"
                      min={0}
                      max={10}
                      step={0.1}
                      tempRange={tempRatingRange}
                      setTempRange={setTempRatingRange}
                      range={ratingRange}
                      setRange={setRatingRange}
                      thumbsDisabled={[true, false]}
                      rangeSlideDisabled={true}
                    />
                  </div>
                  <div className="w-full flex flex-col items-center justify-center gap-2 uppercase font-semibold text-gray-600">
                    <div className="">
                      Vote Count &#x2265; {`${tempVoteCountRange[1]}`}
                    </div>
                    <CustomSlider
                      width="15rem"
                      id="slider-simple"
                      min={0}
                      max={500}
                      step={20}
                      tempRange={tempVoteCountRange}
                      setTempRange={setTempVoteCountRange}
                      range={voteCountRange}
                      setRange={setVoteCountRange}
                      thumbsDisabled={[true, false]}
                      rangeSlideDisabled={true}
                    />
                  </div>
                </div>
              </div>
              {/* <div className="text-xs italic mt-5">
                Results are automatically displayed in descending order.
              </div> */}
            </div>
          )}
        </div>

        {authState.status && !isDiscoverMode && (
          <FilmUser_Gallery
            listOfFilmObjects={userFilmList}
            queryString={
              queryString === "watchlisted/by_country"
                ? "watchlisted"
                : queryString === "watched/rated/by_country"
                  ? "watched/rated"
                  : "watched"
            }
            sortDirection={sortDirection}
            sortBy={sortBy}
          />
        )}
        {!authState.status && !isDiscoverMode && (
          <div className="mt-10 mb-20 text-sm md:text-base">
            Log in and like a film to start!
          </div>
        )}
        {isDiscoverMode && suggestedFilmList && (
          <FilmTMDB_Gallery
            listOfFilmObjects={suggestedFilmList}
            setPage={setPage}
          />
        )}

        {isDiscoverMode && page.hasMore && (
          <div
            ref={loadMoreTrigger}
            className="w-full h-[10rem] flex items-center justify-center mb-0 mt-[10rem]"></div>
        )}

        {isDiscoverMode && !page.hasMore && (
          <div className="w-full flex items-center justify-center m-10 text-base text-black">
            You've reached the end!
          </div>
        )}
      </div>
    </div>
  )
}
