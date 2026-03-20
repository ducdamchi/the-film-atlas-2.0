import { useEffect, useState } from "react"
import {
  Map,
  Popup,
  NavigationControl,
} from "react-map-gl/maplibre"

import "@maptiler/sdk/dist/maptiler-sdk.css"
import "react-range-slider-input/dist/style.css"

import { useAuth } from "../utils/authContext"
import { getCountryName } from "../utils/helperFunctions"
import { MAPTILER_API_KEY, MAPTILER_STYLE_URL } from "../utils/mapConstants"
import useCommandKey from "../hooks/useCommandKey"
import { usePersistedState } from "../hooks/usePersistedState"
import { useMapFilmData } from "../hooks/useMapFilmData"
import { useMapInteraction } from "../hooks/useMapInteraction"
import { useDiscoverFilms } from "../hooks/useDiscoverFilms"
import { useUserFilms } from "../hooks/useUserFilms"
import { useBottomSheet } from "../hooks/useBottomSheet"

import NavBar from "./layout/navbar/NavBar"
import QuickSearchModal from "./layout/QuickSearchModal"
import UserFilmGallery from "./films/UserFilmGallery"
import TmdbFilmGallery from "./films/TmdbFilmGallery"
import Toggle from "./ui-controls/Toggle"
import LoadingPage from "./layout/LoadingPage"
import MapCountriesLayer from "./map/MapCountriesLayer"
import DiscoverControls from "./map/DiscoverControls"
import MyFilmsControls from "./map/MyFilmsControls"

import { FaGripLines } from "react-icons/fa"

/**
 * The full set of queryString values used by the map page.
 * "discover" — Discover mode (TMDB-sourced films)
 * The rest — user's film lists filtered by country
 */
type MapQueryString =
  | "discover"
  | "watched/by_country"
  | "watchlisted/by_country"
  | "watched/rated/by_country"

type MapFilmQueryString = Exclude<MapQueryString, "discover">

type SortBy = "added_date" | "released_date"
type SortDirection = "asc" | "desc"

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
  const { authState, searchModalOpen, setSearchModalOpen } = useAuth()
  const [webglSupported] = useState(() => checkWebGLSupport())

  useCommandKey(() => setSearchModalOpen((s) => !s), "k")

  /* Browse mode state */
  const [queryString, setQueryString] = usePersistedState<MapQueryString>(
    "map-queryString",
    "discover",
  )
  const [lastMyFilmsQueryString, setLastMyFilmsQueryString] =
    usePersistedState<MapFilmQueryString>(
      "map-lastMyFilmsQueryString",
      "watched/by_country",
    )
  const isDiscoverMode = queryString === "discover"
  const [sortBy, setSortBy] = usePersistedState<SortBy>(
    "map-sortBy",
    "added_date",
  )
  const [sortDirection, setSortDirection] = usePersistedState<SortDirection>(
    "map-sortDirection",
    "desc",
  )
  const [numStars, setNumStars] = usePersistedState<number | null>(
    "map-numStars",
    0,
  )
  const [scrollPosition, setScrollPosition] = usePersistedState<number>(
    "map-scrollPosition",
    0,
  )

  /* Side-effects when queryString changes */
  useEffect(() => {
    if (queryString !== "watched/rated/by_country") setNumStars(null)
    if (queryString !== "discover") setLastMyFilmsQueryString(queryString)
  }, [queryString])

  /* Hooks */
  const { filmsPerCountryData } = useMapFilmData(authState)
  const {
    mapRef,
    firstSymbolId,
    popupInfo,
    setPopupInfo,
    onMapLoad,
    onMapClick,
  } = useMapInteraction(filmsPerCountryData)
  const {
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
    isLoading: discoverLoading,
    loadMoreTrigger,
  } = useDiscoverFilms({ isDiscoverMode, popupInfo })
  const { userFilmList, isLoading: userFilmsLoading } = useUserFilms({
    authState,
    isDiscoverMode,
    popupInfo,
    queryString,
    sortBy,
    sortDirection,
    numStars,
  })
  const {
    belowMapRef,
    mapContainerRef,
    setShowBelowMapContent,
    onDragHandlePointerDown,
    handleDragAreaClick,
  } = useBottomSheet()

  const isLoading = discoverLoading || userFilmsLoading

  /* Show/hide bottom sheet when a country is selected */
  useEffect(() => {
    if (popupInfo && popupInfo.iso_a2 != null) {
      setShowBelowMapContent(true)
    } else {
      setShowBelowMapContent(false)
    }
  }, [popupInfo])

  /* Scroll restoration */
  useEffect(() => {
    if (!isLoading) {
      if (scrollPosition) {
        setTimeout(() => {
          window.scrollTo(0, parseInt(String(scrollPosition), 10))
        }, 300)
      } else {
        setTimeout(() => window.scrollTo(0, 0), 0)
      }
      const handleScroll = () => setScrollPosition(window.scrollY)
      const scrollTimer = setTimeout(() => {
        window.addEventListener("scroll", handleScroll)
      }, 500)
      return () => {
        clearTimeout(scrollTimer)
        window.removeEventListener("scroll", handleScroll)
      }
    }
  }, [isLoading])

  /**
   * Derive the queryString to pass to FilmUser_Gallery.
   * The gallery accepts "watched", "watchlisted", or "watched/rated" without
   * the "/by_country" suffix.
   */
  const galleryQueryString =
    queryString === "watchlisted/by_country"
      ? "watchlisted"
      : queryString === "watched/rated/by_country"
        ? "watched/rated"
        : "watched"

  return (
    <div className="font-primary flex flex-col justify-center w-[100vw] mt-[4.5rem] relative">
      {isLoading && <LoadingPage />}

      {searchModalOpen && (
        <QuickSearchModal
          searchModalOpen={searchModalOpen}
          setSearchModalOpen={setSearchModalOpen}
        />
      )}
      <NavBar />

      {/* Map */}
      <div
        ref={mapContainerRef}
        className="w-screen h-[40rem] xl:h-[55rem] max-h-[90vh] relative border-[0.3rem] border-[#b8d5e5]">
        {webglSupported ? (
          <Map
            ref={mapRef as React.Ref<unknown> as React.RefObject<null>}
            onLoad={onMapLoad as unknown as (event: { target: unknown }) => void}
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
                    <span className="font-bold">{popupInfo.country_name}</span>
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
                <span className="font-medium">Firefox:</span> Settings →
                General → Performance → check{" "}
                <em>Use hardware acceleration when available</em>, then relaunch.
              </p>
              <p>
                <span className="font-medium">Safari:</span> Develop menu →
                Experimental Features → ensure WebGL is enabled.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Below map panel */}
      <div
        className="relative flex flex-col items-center w-full bg-elevated z-90 min-h-[40rem] xl:min-h-[55rem] rounded-t-4xl shadow-[25px_-8px_30px_rgba(0,0,0,0.15)] [clip-path:inset(-100%_-100%_0_-100%)]"
        ref={belowMapRef}>
        {/* Drag handle */}
        <div
          className="w-full flex flex-col items-center cursor-ns-resize touch-none select-none rounded-t-4xl hover:bg-control/70 transition-colors ease-out duration-200 py-2 mb-2"
          onClick={handleDragAreaClick}
          onPointerDown={(e) => onDragHandlePointerDown(e.nativeEvent)}>
          <FaGripLines className="text-2xl text-light/40" />
        </div>

        {popupInfo &&
          popupInfo.iso_a2 !== null &&
          popupInfo.iso_a2 !== undefined && (
            <div className="page-title-map font-heading">
              {getCountryName(popupInfo.iso_a2)}
            </div>
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
          <Toggle<BrowseMode>
            label="Browse"
            value={isDiscoverMode ? "discover" : "my_films"}
            onChange={(val) => {
              if (val === "discover") setQueryString("discover")
              else setQueryString(lastMyFilmsQueryString)
            }}
            options={[
              { value: "discover", label: "Discover" },
              { value: "my_films", label: "My Films" },
            ]}
          />

          {isDiscoverMode ? (
            <DiscoverControls
              discoverBy={discoverBy}
              setDiscoverBy={setDiscoverBy}
              ratingRange={ratingRange}
              setRatingRange={setRatingRange}
              tempRatingRange={tempRatingRange}
              setTempRatingRange={setTempRatingRange}
              voteCountRange={voteCountRange}
              setVoteCountRange={setVoteCountRange}
              tempVoteCountRange={tempVoteCountRange}
              setTempVoteCountRange={setTempVoteCountRange}
            />
          ) : (
            <MyFilmsControls
              queryString={queryString as MapFilmQueryString}
              setQueryString={setQueryString as React.Dispatch<React.SetStateAction<MapFilmQueryString>>}
              sortBy={sortBy}
              setSortBy={setSortBy}
              sortDirection={sortDirection}
              setSortDirection={setSortDirection}
              numStars={numStars}
              setNumStars={setNumStars}
            />
          )}
        </div>

        {/* Film galleries */}
        {authState.status && !isDiscoverMode && (
          <UserFilmGallery
            listOfFilmObjects={userFilmList}
            queryString={galleryQueryString}
            sortDirection={sortDirection}
            sortBy={sortBy}
          />
        )}
        {!authState.status && !isDiscoverMode && (
          <div className="mt-10 mb-20 text-sm md:text-base">
            Log in and like a film to start!
          </div>
        )}
        {/* Discover gallery — only rendered when there are results */}
        {isDiscoverMode && suggestedFilmList.length > 0 && (
          <TmdbFilmGallery
            listOfFilmObjects={suggestedFilmList}
            setPage={setPage}
          />
        )}

        {/* No results message — mutually exclusive with the gallery and end message */}
        {isDiscoverMode && !isLoading && suggestedFilmList.length === 0 && (
          <div className="mt-10 mb-20 text-sm md:text-base">No films found.</div>
        )}

        {/* Load-more sentinel — 1px tall; rootMargin in the observer pre-fires 400px early */}
        {isDiscoverMode && suggestedFilmList.length > 0 && page.hasMore && (
          <div ref={loadMoreTrigger} className="w-full h-px mt-20" />
        )}

        {/* End-of-results message — only shown when there were films to display */}
        {isDiscoverMode && suggestedFilmList.length > 0 && !page.hasMore && (
          <div className="w-full flex items-center justify-center m-10 text-base text-black">
            You've reached the end!
          </div>
        )}
      </div>
    </div>
  )
}
