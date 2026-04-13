import { useEffect, useRef, useState } from "react";
import { Map, Popup, NavigationControl } from "react-map-gl/maplibre";

import "@maptiler/sdk/dist/maptiler-sdk.css";
import "react-range-slider-input/dist/style.css";

import { useAuth } from "../utils/authContext";
import { getCountryName } from "../utils/helperFunctions";
import { MAPTILER_API_KEY, MAPTILER_STYLE_URL } from "../utils/mapConstants";
import { usePersistedState } from "../hooks/usePersistedState";
import { useMapFilmData } from "../hooks/useMapFilmData";
import { useMapInteraction } from "../hooks/useMapInteraction";
import { useDiscoverFilms } from "../hooks/useDiscoverFilms";
import { useUserFilms } from "../hooks/useUserFilms";
import { useMapPanel } from "../hooks/useMapPanel";

import UserFilmGallery from "./films/UserFilmGallery";
import TmdbFilmGallery from "./films/TmdbFilmGallery";
import Toggle from "./ui-controls/Toggle";
import LoadingPage from "./layout/LoadingPage";
import MapCountriesLayer from "./map/MapCountriesLayer";
import DiscoverControls from "./map/DiscoverControls";
import MyFilmsControls from "./map/MyFilmsControls";

import { FaGripLines } from "react-icons/fa6";
import { GripVertical } from "lucide-react";

/**
 * The full set of queryString values used by the map page.
 * "discover" — Discover mode (TMDB-sourced films)
 * The rest — user's film lists filtered by country
 */
type MapQueryString =
  | "discover"
  | "watched/by_country"
  | "watchlisted/by_country"
  | "watched/rated/by_country";

type MapFilmQueryString = Exclude<MapQueryString, "discover">;

type SortBy = "added_date" | "released_date";
type SortDirection = "asc" | "desc";

type BrowseMode = "discover" | "my_films";

function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

export default function MapPage() {
  const { authState } = useAuth();
  const [webglSupported] = useState(() => checkWebGLSupport());

  /* Browse mode state */
  const [queryString, setQueryString] = usePersistedState<MapQueryString>(
    "map-queryString",
    "discover",
  );
  const [lastMyFilmsQueryString, setLastMyFilmsQueryString] =
    usePersistedState<MapFilmQueryString>(
      "map-lastMyFilmsQueryString",
      "watched/by_country",
    );
  const isDiscoverMode = queryString === "discover";
  const [sortBy, setSortBy] = usePersistedState<SortBy>(
    "map-sortBy",
    "added_date",
  );
  const [sortDirection, setSortDirection] = usePersistedState<SortDirection>(
    "map-sortDirection",
    "desc",
  );
  const [numStars, setNumStars] = usePersistedState<number | null>(
    "map-numStars",
    0,
  );
  const [scrollPosition, setScrollPosition] = usePersistedState<number>(
    "map-scrollPosition",
    0,
  );

  /* Side-effects when queryString changes */
  useEffect(() => {
    if (queryString !== "watched/rated/by_country") setNumStars(null);
    if (queryString !== "discover") setLastMyFilmsQueryString(queryString);
  }, [queryString]);

  /* Hooks */
  const { filmsPerCountryData } = useMapFilmData(authState);
  const {
    mapRef,
    firstSymbolId,
    popupInfo,
    setPopupInfo,
    onMapLoad,
    onMapClick,
  } = useMapInteraction(filmsPerCountryData);
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
  } = useDiscoverFilms({ isDiscoverMode, popupInfo });
  const { userFilmList, isLoading: userFilmsLoading } = useUserFilms({
    authState,
    isDiscoverMode,
    popupInfo,
    queryString,
    sortBy,
    sortDirection,
    numStars,
  });
  const {
    panelRef,
    mapContainerRef,
    setShowPanel,
    onDragHandlePointerDown,
    handleDragAreaClick,
  } = useMapPanel();

  const innerScrollRef = useRef<HTMLDivElement | null>(null);

  const isLoading = discoverLoading || userFilmsLoading;

  /* Show/hide panel when a country is selected */
  const isMountedRef = useRef(false);
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    if (popupInfo && popupInfo.iso_a2 != null) {
      setShowPanel(true);
    } else {
      setShowPanel(false);
    }
  }, [popupInfo]);

  /* Scroll restoration — tracks scroll within the inner scroll container */
  useEffect(() => {
    if (!isLoading && innerScrollRef.current) {
      innerScrollRef.current.scrollTop = scrollPosition;
      const el = innerScrollRef.current;
      const handleScroll = () => setScrollPosition(el.scrollTop);
      const scrollTimer = setTimeout(
        () => el.addEventListener("scroll", handleScroll),
        500,
      );
      return () => {
        clearTimeout(scrollTimer);
        el.removeEventListener("scroll", handleScroll);
      };
    }
  }, [isLoading]);

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
        : "watched";

  return (
    <div className="font-primary fixed inset-0 overflow-hidden">
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
            mapStyle={MAPTILER_STYLE_URL}
          >
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
                onClose={() => setPopupInfo(null)}
              >
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
      {/* Outer wrapper: owns positioning + dimensions, overflow-visible so the handle button can protrude */}
      <div
        ref={panelRef}
        className={[
          "@container absolute z-50",
          // Mobile: slides up from viewport bottom
          "bottom-0 left-0 right-0",
          // Desktop: left sidebar below navbar
          "md:right-auto md:top-[4.5rem]",
        ].join(" ")}
      >
        {/* Inner scroll container: visual appearance + scrolling */}
        <div
          ref={innerScrollRef}
          className={[
            "w-full h-full",
            "bg-elevated overflow-y-auto flex flex-col items-center",
            // Mobile visual

            "shadow-[25px_-8px_30px_rgba(0,0,0,0.15)]",
            "[clip-path:inset(-100%_-100%_-20rem_-100%)]",
            // Desktop visual
            "md:pt-10",
            "md:shadow-[8px_0_30px_rgba(0,0,0,0.15)]",
            "md:[clip-path:none]",
          ].join(" ")}
        >
          {/* Mobile drag handle — sticky at top so it's always reachable while scrolling */}
          <div
            className="md:hidden sticky top-0 z-250 w-full flex flex-col items-center cursor-ns-resize touch-none select-none bg-elevated hover:bg-control transition-colors ease-out duration-200 py-2 mb-2"
            onClick={handleDragAreaClick}
            onPointerDown={(e) => onDragHandlePointerDown(e.nativeEvent)}
          >
            <FaGripLines className="text-2xl text-muted-dark" />
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
              <div className="page-title-map font-heading">
                select region on map
              </div>
              {/* <div>(click on a valid region on map to start)</div> */}
            </div>
          )}

          <div className="flex flex-col items-center justify-center mt-5 w-[90%] min-w-[15rem] md:w-[90%]">
            {/* Discover / My Films toggle */}
            <Toggle<BrowseMode>
              label="Browse"
              value={isDiscoverMode ? "discover" : "my_films"}
              onChange={(val) => {
                if (val === "discover") setQueryString("discover");
                else setQueryString(lastMyFilmsQueryString);
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
                setQueryString={
                  setQueryString as React.Dispatch<
                    React.SetStateAction<MapFilmQueryString>
                  >
                }
                sortBy={sortBy}
                setSortBy={setSortBy}
                sortDirection={sortDirection}
                setSortDirection={setSortDirection}
                numStars={numStars}
                setNumStars={setNumStars}
              />
            )}
          </div>

          <div className="flex flex-col items-center w-full">
            {/* Film gallery section — top-level split: Discover vs. My Films */}
            {isDiscoverMode ? (
              /* --- Discover mode --- */
              suggestedFilmList.length > 0 ? (
                <>
                  <TmdbFilmGallery
                    listOfFilmObjects={suggestedFilmList}
                    setPage={setPage}
                  />
                  {/* Pagination footer: sentinel triggers next page load, or show end message */}
                  {page.hasMore ? (
                    /* 1px sentinel; IntersectionObserver rootMargin pre-fires 400px early */
                    <div ref={loadMoreTrigger} className="w-full h-px mt-20" />
                  ) : (
                    <div className="w-full flex items-center justify-center m-10 text-base text-black">
                      You've reached the end!
                    </div>
                  )}
                </>
              ) : (
                /* No results — only shown after loading completes */
                !isLoading && (
                  <div className="mt-10 mb-20 text-sm md:text-base">
                    No films found.
                  </div>
                )
              )
            ) : /* --- My Films mode --- */
            authState.status ? (
              <UserFilmGallery
                listOfFilmObjects={userFilmList}
                queryString={galleryQueryString}
                sortDirection={sortDirection}
                sortBy={sortBy}
              />
            ) : (
              /* Unauthenticated prompt */
              <div className="mt-10 mb-20 text-sm md:text-base">
                Log in and like a film to start!
              </div>
            )}
          </div>
        </div>
        {/* end inner scroll container */}

        {/* Desktop handle button — protrudes to the right at the sidebar's vertical center */}
        <button
          type="button"
          aria-label="Resize or toggle sidebar"
          className={[
            "hidden md:flex absolute -right-7 top-1/2 -translate-y-1/2",
            "z-10 w-7 h-14",
            "flex-col items-center justify-center gap-[3px]",
            "bg-elevated border border-control border-l-0",
            "rounded-r-lg",
            "inset-shadow-[2px_0px_5px_rgba(0,0,0,0.12)]",
            "cursor-ew-resize touch-none select-none",
            "transition-colors duration-150 ease-out",
            "hover:bg-control",
            "active:bg-control active:shadow-[1px_1px_4px_rgba(0,0,0,0.10)]",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dark",
          ].join(" ")}
          onClick={handleDragAreaClick}
          onPointerDown={(e) => onDragHandlePointerDown(e.nativeEvent)}
        >
          <GripVertical className="text-muted-light" />
          {/* <FaGripLines className="text-[8px] text-muted-dark rotate-90" /> */}
          {/* <FaGripLines className="text-[8px] text-muted-dark rotate-90" /> */}
        </button>
      </div>
    </div>
  );
}
