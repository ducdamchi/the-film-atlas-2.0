import React, { useEffect, useContext } from "react"
import {
  Map,
  Popup,
  NavigationControl,
} from "react-map-gl/maplibre"

import "@maptiler/sdk/dist/maptiler-sdk.css"
import "react-range-slider-input/dist/style.css"

import { AuthContext } from "../Utils/authContext"
import { getCountryName } from "../Utils/helperFunctions"
import { MAPTILER_API_KEY, MAPTILER_STYLE_URL } from "../Utils/mapConstants"
import useCommandKey from "../Hooks/useCommandKey"
import { usePersistedState } from "../Hooks/usePersistedState"
import { useMapFilmData } from "../Hooks/useMapFilmData"
import { useMapInteraction } from "../Hooks/useMapInteraction"
import { useDiscoverFilms } from "../Hooks/useDiscoverFilms"
import { useUserFilms } from "../Hooks/useUserFilms"
import { useBottomSheet } from "../Hooks/useBottomSheet"

import NavBar from "./Shared/Navigation-Search/NavBar"
import QuickSearchModal from "./Shared/Navigation-Search/QuickSearchModal"
import FilmUser_Gallery from "./Shared/Films/FilmUser_Gallery"
import FilmTMDB_Gallery from "./Shared/Films/FilmTMDB_Gallery"
import Toggle_Two from "./Shared/Buttons/Toggle_Two"
import LoadingPage from "./Shared/Navigation-Search/LoadingPage"
import MapCountriesLayer from "./Map/MapCountriesLayer"
import DiscoverControls from "./Map/DiscoverControls"
import MyFilmsControls from "./Map/MyFilmsControls"

import { FaGripLines } from "react-icons/fa"

export default function MapPage() {
  const { authState, searchModalOpen, setSearchModalOpen } =
    useContext(AuthContext)

  useCommandKey(() => setSearchModalOpen((s) => !s), "k")

  /* Browse mode state */
  const [queryString, setQueryString] = usePersistedState(
    "map-queryString",
    "discover",
  )
  const [isDiscoverMode, setIsDiscoverMode] = usePersistedState(
    "map-isDiscoverMode",
    false,
  )
  const [sortBy, setSortBy] = usePersistedState("map-sortBy", "added_date")
  const [sortDirection, setSortDirection] = usePersistedState(
    "map-sortDirection",
    "desc",
  )
  const [numStars, setNumStars] = usePersistedState("map-numStars", 0)
  const [scrollPosition, setScrollPosition] = usePersistedState(
    "map-scrollPosition",
    0,
  )

  /* Switch discover mode on/off based on queryString */
  useEffect(() => {
    setIsDiscoverMode(queryString === "discover")
    if (queryString !== "watched/rated/by_country") setNumStars(null)
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
          window.scrollTo(0, parseInt(scrollPosition, 10))
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
        <Map
          ref={mapRef}
          onLoad={onMapLoad}
          onClick={onMapClick}
          mapboxAccessToken={MAPTILER_API_KEY}
          initialViewState={{ latitude: 25, longitude: 150, zoom: 1.2 }}
          mapStyle={MAPTILER_STYLE_URL}>
          <NavigationControl
            position="top-right"
            showCompass={false}
            showZoom={true}
            visualizePitch={true}
          />
          <MapCountriesLayer firstSymbolId={firstSymbolId} />
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
                  <span>watched films</span>
                </span>
              </div>
            </Popup>
          )}
        </Map>
      </div>

      {/* Below map panel */}
      <div
        className="relative flex flex-col items-center w-full bg-white z-90 min-h-[40rem] xl:min-h-[55rem] rounded-t-4xl shadow-[25px_-8px_30px_rgba(0,0,0,0.15)] [clip-path:inset(-100%_-100%_0_-100%)]"
        ref={belowMapRef}>
        {/* Drag handle */}
        <div
          className="w-full flex flex-col items-center cursor-ns-resize touch-none select-none rounded-t-4xl hover:bg-gray-100 transition-colors ease-out duration-200 py-2 mb-2"
          onClick={handleDragAreaClick}
          onPointerDown={onDragHandlePointerDown}>
          <FaGripLines className="text-2xl text-gray-300" />
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
              queryString={queryString}
              setQueryString={setQueryString}
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
            className="w-full h-[10rem] flex items-center justify-center mb-0 mt-[10rem]"
          />
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
