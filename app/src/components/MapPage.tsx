import { useEffect, useRef, useState } from "react"
import { useAtom } from "jotai"
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
import { Route } from "@/routes/map"
import type { MapMode } from "@/routes/map"
import {
  map_modeAtom,
  map_discoverSortAtom,
  map_discoverFilterAtom,
  map_ratingAtom,
  map_votesAtom,
  map_userSortAtom,
  map_userSortDirAtom,
  map_starsAtom,
  map_userFilterAtom,
} from "@/atoms/mapAtoms"

import UserFilmGallery from "./films/UserFilmGallery"
import TmdbFilmGallery from "./films/TmdbFilmGallery"
import Toggle from "./ui-custom/Toggle"
import MapCountriesLayer from "./map/MapCountriesLayer"
import DiscoverControls from "./map/DiscoverControls"
import MyFilmsControls from "./map/MyFilmsControls"
import { MapUnavailable } from "./map/MapUnavailable"
import { FaGripLines } from "react-icons/fa6"
import { GripVertical } from "lucide-react"
import { checkWebGLSupport } from "../utils/helperFunctions"

type MapFilmMode = Exclude<MapMode, "discover">
type BrowseMode = "discover" | "my_films"

export default function MapPage() {
  const { authState } = useAuth()
  const [webGLSupported] = useState(() => checkWebGLSupport())

  const { country } = Route.useSearch()
  const navigate = useNavigate({ from: "/map" })

  const [mode, setMapMode] = useAtom(map_modeAtom)
  const [dsort] = useAtom(map_discoverSortAtom)
  const [filter] = useAtom(map_discoverFilterAtom)
  const [rating] = useAtom(map_ratingAtom)
  const [votes] = useAtom(map_votesAtom)
  const [sort] = useAtom(map_userSortAtom)
  const [dir] = useAtom(map_userSortDirAtom)
  const [stars] = useAtom(map_starsAtom)
  const [ufilter] = useAtom(map_userFilterAtom)

  const isDiscoverMode = mode === "discover"

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
    panelRef,
    mapContainerRef,
    setShowPanel,
    onDragHandlePointerDown,
    handleDragAreaClick,
  } = useMapPanel()

  // isoA2 comes from a map click (popupInfo) or from the URL country param on
  // initial load / navigation. popupInfo takes precedence since it has coordinates.
  const isoA2 = popupInfo?.iso_a2 ?? country

  const {
    suggestedFilmList,
    isLoading: discoverLoading,
    hasNextPage,
    loadMoreTrigger,
  } = useDiscoverFilms({ isDiscoverMode, isoA2, dsort, filter, rating, votes })

  const { userFilmList, isLoading: userFilmsLoading } = useUserFilms({
    authState,
    isDiscoverMode,
    isoA2,
    mode: mode as MapFilmMode,
    sortBy: sort,
    sortDirection: dir,
    numStars: stars,
  })

  const innerScrollRef = useRef<HTMLDivElement | null>(null)

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
    if (discoverLoading || userFilmsLoading || !innerScrollRef.current) return
    const key = `map-panel-scroll:${isoA2 ?? "none"}`
    const saved = sessionStorage.getItem(key)
    if (saved) {
      const el = innerScrollRef.current
      setTimeout(() => {
        el.scrollTop = parseInt(saved, 10)
      }, 50)
    }
  }, [discoverLoading, userFilmsLoading, isoA2])

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
    mode === "watchlisted"
      ? "watchlisted"
      : mode === "rated"
        ? "watched/rated"
        : "watched"

  return (
    <div className="font-primary inset-0 overflow-hidden">
      {/* Map — fills the full viewport */}
      <div ref={mapContainerRef} className="absolute inset-0">
        {webGLSupported ? (
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
              showCompass={true}
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
          <MapUnavailable />
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
                if (val === "discover") setMapMode("discover")
                else setMapMode(ufilter)
              }}
              options={[
                { value: "discover", label: "Discover" },
                { value: "my_films", label: "My Films" },
              ]}
            />

            {isDiscoverMode ? (
              <DiscoverControls isoA2={isoA2} />
            ) : (
              <MyFilmsControls />
            )}
          </div>

          <div className="flex flex-col items-center w-full">
            {isDiscoverMode ? (
              <>
                <TmdbFilmGallery
                  listOfFilmObjects={suggestedFilmList}
                />
                {!discoverLoading && suggestedFilmList.length > 0 && (
                  hasNextPage ? (
                    <div ref={loadMoreTrigger} className="w-full h-px mt-20" />
                  ) : (
                    <div className="w-full flex items-center justify-center m-10 text-base text-black">
                      You've reached the end!
                    </div>
                  )
                )}
              </>
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
            "bg-foreground",
            "inset-shadow-[2px_0px_5px_rgba(0,0,0,0.12)]",
            "cursor-ew-resize touch-none select-none",
            "transition-colors duration-150 ease-out",
          ].join(" ")}
          onClick={handleDragAreaClick}
          onPointerDown={(e) => onDragHandlePointerDown(e.nativeEvent)}>
          <GripVertical className="text-background hover:scale-110 transition-all duration-300 ease-out" />
        </button>
      </div>
    </div>
  )
}
