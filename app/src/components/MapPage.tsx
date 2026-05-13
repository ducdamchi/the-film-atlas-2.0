import { useEffect, useRef, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { Map, Popup, NavigationControl } from "react-map-gl/maplibre"

import "@maptiler/sdk/dist/maptiler-sdk.css"
import "react-range-slider-input/dist/style.css"

import { useAuth } from "../utils/authContext"
import { getCountryName } from "../utils/helperFunctions"
import { MAPTILER_API_KEY, MAPTILER_STYLE_URL } from "../utils/mapConstants"
import { useMapFilmData } from "../hooks/useMapFilmData"
import { useMapInteraction } from "../hooks/useMapInteraction"
import { useDiscoverFilms } from "../hooks/useDiscoverFilms"
import { useUserFilms } from "../hooks/useUserFilms"
import { useMapPanel } from "../hooks/useMapPanel"
import { COUNTRY_DEFAULTS, GLOBAL_DEFAULTS } from "@/data/countryDefaults"
import { Route, ALIAS_TO_MODE } from "@/routes/map"
import type { MapMode, MapModeAlias, FilterMode, DiscoverSort, UserSort, SortDir } from "@/routes/map"

import UserFilmGallery from "./films/UserFilmGallery"
import TmdbFilmGallery from "./films/TmdbFilmGallery"
import Toggle from "./ui-custom/Toggle"
import LoadingPage from "./layout/LoadingPage"
import MapCountriesLayer from "./map/MapCountriesLayer"
import DiscoverControls from "./map/DiscoverControls"
import MyFilmsControls from "./map/MyFilmsControls"

import { FaGripLines } from "react-icons/fa6"
import { GripVertical } from "lucide-react"

type MapFilmMode = Exclude<MapModeAlias, "discover">
type BrowseMode = "discover" | "my_films"

function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement("canvas")
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    )
  } catch {
    return false
  }
}

export default function MapPage() {
  const { authState } = useAuth()
  const [webglSupported] = useState(() => checkWebGLSupport())

  /* URL search params — single source of truth for all filter/mode state */
  const {
    country,
    mode,
    filter: rawFilter,
    rating: rawRating,
    votes: rawVotes,
    dsort: rawDsort,
    sort: rawSort,
    dir: rawDir,
    stars: rawStars,
  } = Route.useSearch()
  const navigate = useNavigate({ from: "/map" })

  // Defaults applied at the call site — omitted URL params mean "use default"
  const filter: FilterMode = rawFilter ?? "recommended"
  const rating = rawRating ?? 0
  const votes = rawVotes ?? 0
  const dsort: DiscoverSort = rawDsort ?? "random"
  const sort: UserSort = rawSort ?? "added_date"
  const dir: SortDir = rawDir ?? "desc"
  const stars = rawStars ?? 0

  const isDiscoverMode = mode === "discover"
  // Full internal mode string for hooks/API (strips the URL alias)
  const internalMode: MapMode = ALIAS_TO_MODE[mode]

  // Ephemeral: remembers last my-films sub-mode so switching back to "My Films"
  // restores the previous filter (watched/watchlisted/rated) instead of defaulting.
  const [lastMyFilmsMode, setLastMyFilmsMode] = useState<MapFilmMode>("watched")

  /* URL setters — replace history entries so filter changes don't pollute back button */

  // Strips irrelevant params on mode transition
  const setMode = (val: MapModeAlias) => {
    if (val === "discover") {
      navigate({
        search: (prev) => ({
          country: prev.country,
          mode: "discover" as const,
          ...(prev.filter === "custom" && {
            filter: "custom" as const,
            rating: prev.rating,
            votes: prev.votes,
          }),
          ...(prev.dsort && { dsort: prev.dsort }),
        }),
        replace: true,
      })
    } else {
      navigate({
        search: (prev) => ({
          country: prev.country,
          mode: val,
          ...(prev.sort && { sort: prev.sort }),
          ...(prev.dir && { dir: prev.dir }),
          ...(val === "rated" && prev.stars && { stars: prev.stars }),
        }),
        replace: true,
      })
    }
  }

  // "random" is default — omit from URL
  const setDsort = (val: DiscoverSort) =>
    navigate({
      search: (prev) => ({ ...prev, dsort: val === "random" ? undefined : val }),
      replace: true,
    })

  const setFilter = (val: FilterMode) => {
    if (val === "custom") {
      // Seed custom sliders from the current recommended values
      const rec = COUNTRY_DEFAULTS[isoA2 ?? ""] ?? GLOBAL_DEFAULTS
      navigate({
        search: (prev) => ({
          ...prev,
          filter: "custom" as const,
          rating: rec.rating,
          votes: rec.voteCount,
        }),
        replace: true,
      })
    } else {
      // Strip rating/votes; omitting filter key defaults to "recommended"
      navigate({
        search: (prev) => {
          const { rating: _r, votes: _v, filter: _f, ...rest } = prev
          return rest
        },
        replace: true,
      })
    }
  }

  const setRating = (val: number) =>
    navigate({ search: (prev) => ({ ...prev, rating: val }), replace: true })
  const setVotes = (val: number) =>
    navigate({ search: (prev) => ({ ...prev, votes: val }), replace: true })

  // Temp (in-drag) state for sliders — committed to URL on drag end
  const [tempRatingRange, setTempRatingRange] = useState<[number, number]>([0, rating])
  const [tempVoteCountRange, setTempVoteCountRange] = useState<[number, number]>([0, votes])

  // Sync temp state when URL params change externally (e.g. back/forward nav)
  useEffect(() => setTempRatingRange([0, rating]), [rating])
  useEffect(() => setTempVoteCountRange([0, votes]), [votes])

  // "added_date" and "desc" are defaults — omit from URL
  const setSort = (val: UserSort) =>
    navigate({
      search: (prev) => ({ ...prev, sort: val === "added_date" ? undefined : val }),
      replace: true,
    })
  const setDir = (val: SortDir) =>
    navigate({
      search: (prev) => ({ ...prev, dir: val === "desc" ? undefined : val }),
      replace: true,
    })
  // 0 means "all" — omit from URL
  const setStars = (val: number) =>
    navigate({
      search: (prev) => ({ ...prev, stars: val > 0 ? val : undefined }),
      replace: true,
    })

  /* Track mode changes for lastMyFilmsMode and stale-stars cleanup (back/forward nav) */
  const prevModeRef = useRef(mode)
  useEffect(() => {
    const prev = prevModeRef.current
    prevModeRef.current = mode
    if (prev !== mode) {
      if (prev !== "discover") setLastMyFilmsMode(prev as MapFilmMode)
      if (mode !== "rated" && stars !== 0) {
        navigate({ search: (prev) => ({ ...prev, stars: undefined }), replace: true })
      }
    }
  }, [mode])

  /* Hooks */
  const { filmsPerCountryData } = useMapFilmData(authState)
  const { mapRef, firstSymbolId, popupInfo, setPopupInfo, onMapLoad, onMapClick } =
    useMapInteraction(filmsPerCountryData)
  const {
    panelRef,
    mapContainerRef,
    setShowPanel,
    onDragHandlePointerDown,
    handleDragAreaClick,
  } = useMapPanel()

  // isoA2 comes from a map click (popupInfo) or from the URL country param on
  // initial load / navigation. popupInfo takes precedence since it has coordinates.
  const isoA2 = popupInfo?.iso_a2 ?? country

  const { suggestedFilmList, isLoading: discoverLoading, hasNextPage, loadMoreTrigger } =
    useDiscoverFilms({ isDiscoverMode, isoA2, dsort, filter, rating, votes })

  const { userFilmList, isLoading: userFilmsLoading } = useUserFilms({
    authState,
    isDiscoverMode,
    isoA2,
    queryString: internalMode,
    sortBy: sort,
    sortDirection: dir,
    numStars: stars,
  })

  const innerScrollRef = useRef<HTMLDivElement | null>(null)
  const isLoading = discoverLoading || userFilmsLoading

  /* Sync country URL param when the user clicks a new country on the map */
  const popupSyncMountedRef = useRef(false)
  useEffect(() => {
    if (!popupSyncMountedRef.current) {
      popupSyncMountedRef.current = true
      return
    }
    navigate({
      search: (prev) => ({ ...prev, country: popupInfo?.iso_a2 }),
      replace: true,
    })
  }, [popupInfo?.iso_a2])

  /* Show/hide panel when isoA2 changes */
  const isMountedRef = useRef(false)
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true
      if (isoA2) setShowPanel(true)
      return
    }
    setShowPanel(!!isoA2)
  }, [isoA2])

  /* Scroll restoration — per-country, stored in sessionStorage */
  useEffect(() => {
    if (isLoading || !innerScrollRef.current) return
    const key = `map-panel-scroll:${isoA2 ?? "none"}`
    const saved = sessionStorage.getItem(key)
    if (saved) {
      const el = innerScrollRef.current
      setTimeout(() => { el.scrollTop = parseInt(saved, 10) }, 50)
    }
  }, [isLoading, isoA2])

  useEffect(() => {
    const el = innerScrollRef.current
    if (!el) return
    const key = `map-panel-scroll:${isoA2 ?? "none"}`
    const handleScroll = () => sessionStorage.setItem(key, String(el.scrollTop))
    el.addEventListener("scroll", handleScroll, { passive: true })
    return () => el.removeEventListener("scroll", handleScroll)
  }, [isoA2])

  // Derive the queryString for UserFilmGallery (strips /by_country suffix)
  const galleryQueryString =
    mode === "watchlisted" ? "watchlisted"
    : mode === "rated"     ? "watched/rated"
    : "watched"

  return (
    <div className="font-primary inset-0 overflow-hidden">
      {isLoading && <LoadingPage />}

      {/* Map — fills the full viewport */}
      <div ref={mapContainerRef} className="absolute inset-0">
        {webglSupported ? (
          <Map
            ref={mapRef as React.Ref<unknown> as React.RefObject<null>}
            onLoad={
              onMapLoad as unknown as (event: { target: unknown }) => void
            }
            onClick={onMapClick as unknown as (event: unknown) => void}
            mapboxAccessToken={MAPTILER_API_KEY}
            initialViewState={{ latitude: 25, longitude: 150, zoom: 1.2 }}
            mapStyle={MAPTILER_STYLE_URL}>
            <NavigationControl
              position="top-right"
              showCompass={false}
              showZoom={true}
              visualizePitch={true}
            />
            <MapCountriesLayer firstSymbolId={firstSymbolId ?? undefined} />
            {popupInfo && (
              <Popup
                longitude={popupInfo.longitude}
                latitude={popupInfo.latitude}
                anchor="bottom"
                closeOnClick={false}
                onClose={() => setPopupInfo(null)}>
                <div className="flex flex-col items-center justify-center hover:text-hover-link cursor-pointer">
                  {popupInfo.custom_name !== undefined && (
                    <span className="font-bold">{popupInfo.custom_name}</span>
                  )}
                  {popupInfo.custom_name === undefined && (
                    <span className="font-bold">
                      {popupInfo.country_name ?? "Invalid Region"}
                    </span>
                  )}
                  <span>
                    <span className="font-bold">
                      {`${popupInfo.num_watched_films}`}&nbsp;
                    </span>
                    <span>watched films</span>
                  </span>
                </div>
              </Popup>
            )}
          </Map>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-[#e8f1f7] px-6 text-center">
            <div className="text-4xl">🗺️</div>
            <p className="text-lg font-semibold text-[#2c4a5e]">
              Map unavailable — graphics acceleration is disabled
            </p>
            <p className="text-sm text-[#4a6a80] max-w-md">
              The interactive map requires WebGL, which needs hardware
              acceleration to be enabled in your browser.
            </p>
            <div className="text-sm text-[#4a6a80] max-w-md text-left bg-white/60 rounded-xl p-4 space-y-2">
              <p className="font-semibold text-[#2c4a5e]">How to enable it:</p>
              <p>
                <span className="font-medium">Chrome / Edge:</span> Settings →
                System → turn on{" "}
                <em>Use graphics acceleration when available</em>, then relaunch
                the browser.
              </p>
              <p>
                <span className="font-medium">Firefox:</span> Settings → General
                → Performance → check{" "}
                <em>Use hardware acceleration when available</em>, then
                relaunch.
              </p>
              <p>
                <span className="font-medium">Safari:</span> Develop menu →
                Experimental Features → ensure WebGL is enabled.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Panel — mobile: bottom sheet; desktop: left sidebar */}
      <div
        ref={panelRef}
        className={[
          "@container absolute z-50",
          "bottom-0 left-0 right-0",
          "md:top-0 md:relative md:h-screen",
        ].join(" ")}>
        {/* Inner scroll container */}
        <div
          ref={innerScrollRef}
          className={[
            "w-full h-full bg-background overflow-y-auto flex flex-col items-center",
            "shadow-[25px_-8px_30px_rgba(0,0,0,0.15)] [clip-path:inset(-100%_-100%_-20rem_-100%)]",
            "md:pt-10 md:min-h-screen md:shadow-[8px_0_30px_rgba(0,0,0,0.15)] md:[clip-path:none]",
          ].join(" ")}>
          {/* Mobile drag handle */}
          <div
            className="md:hidden sticky top-0 z-250 w-full flex flex-col items-center cursor-ns-resize touch-none select-none bg-background hover:bg-muted transition-colors ease-out duration-200 py-2 mb-2"
            onClick={handleDragAreaClick}
            onPointerDown={(e) => onDragHandlePointerDown(e.nativeEvent)}>
            <FaGripLines className="text-2xl text-muted" />
          </div>

          {isoA2 ? (
            <div className="page-title-map font-heading">
              {getCountryName(isoA2)}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center">
              <div className="page-title-map font-heading">
                select region on map
              </div>
            </div>
          )}

          <div className="flex flex-col items-center justify-center mt-5 w-[90%] min-w-[15rem] md:w-[90%]">
            {/* Discover / My Films toggle */}
            <Toggle<BrowseMode>
              label="Browse"
              value={isDiscoverMode ? "discover" : "my_films"}
              onChange={(val) => {
                if (val === "discover") setMode("discover")
                else setMode(lastMyFilmsMode)
              }}
              options={[
                { value: "discover", label: "Discover" },
                { value: "my_films", label: "My Films" },
              ]}
            />

            {isDiscoverMode ? (
              <DiscoverControls
                isoA2={isoA2}
                dsort={dsort}
                filter={filter}
                ratingRange={[0, rating]}
                setRatingRange={(val) => setRating(val[1])}
                tempRatingRange={tempRatingRange}
                setTempRatingRange={setTempRatingRange}
                voteCountRange={[0, votes]}
                setVoteCountRange={(val) => setVotes(val[1])}
                tempVoteCountRange={tempVoteCountRange}
                setTempVoteCountRange={setTempVoteCountRange}
                onDsortChange={setDsort}
                onFilterChange={setFilter}
              />
            ) : (
              <MyFilmsControls
                queryString={mode as MapFilmMode}
                setQueryString={setMode}
                sortBy={sort}
                setSortBy={setSort}
                sortDirection={dir}
                setSortDirection={setDir}
                numStars={stars}
                setNumStars={setStars}
              />
            )}
          </div>

          <div className="flex flex-col items-center w-full">
            {isDiscoverMode ? (
              suggestedFilmList.length > 0 ? (
                <>
                  <TmdbFilmGallery listOfFilmObjects={suggestedFilmList} />
                  {hasNextPage ? (
                    <div ref={loadMoreTrigger} className="w-full h-px mt-20" />
                  ) : (
                    <div className="w-full flex items-center justify-center m-10 text-base text-black">
                      You've reached the end!
                    </div>
                  )}
                </>
              ) : (
                !isLoading && (
                  <div className="mt-10 mb-20 text-sm md:text-base">
                    No films found.
                  </div>
                )
              )
            ) : authState.status ? (
              <UserFilmGallery
                listOfFilmObjects={userFilmList}
                queryString={galleryQueryString}
                sortDirection={dir}
                sortBy={sort}
              />
            ) : (
              <div className="mt-10 mb-20 text-sm md:text-base">
                Log in and like a film to start!
              </div>
            )}
          </div>
        </div>

        {/* Desktop handle button */}
        <button
          type="button"
          aria-label="Resize or toggle sidebar"
          className={[
            "hidden md:flex absolute -right-7 top-1/2 -translate-y-1/2",
            "z-10 w-7 h-14",
            "flex-col items-center justify-center gap-[3px]",
            "bg-background border border-border border-l-0",
            "rounded-r-lg",
            "inset-shadow-[2px_0px_5px_rgba(0,0,0,0.12)]",
            "cursor-ew-resize touch-none select-none",
            "transition-colors duration-150 ease-out",
            "hover:bg-accent",
            "active:bg-muted active:shadow-[1px_1px_4px_rgba(0,0,0,0.10)]",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dark",
          ].join(" ")}
          onClick={handleDragAreaClick}
          onPointerDown={(e) => onDragHandlePointerDown(e.nativeEvent)}>
          <GripVertical className="text-foreground" />
        </button>
      </div>
    </div>
  )
}
