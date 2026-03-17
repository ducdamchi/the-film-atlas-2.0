import { useRef, useState, useCallback, useEffect } from "react"
import { usePersistedState } from "./usePersistedState"
import type { Map as MapboxMap, MapDataEvent, GeoJSONFeature, MapMouseEvent } from "mapbox-gl"
import type { PopupInfo, FilmsPerCountryData } from "@/types/map"

/**
 * The complete return value of useMapInteraction.
 *
 * `mapRef` — attach to the react-map-gl <Map ref={mapRef}> prop.
 * `firstSymbolId` — the id of the first symbol layer, used to insert
 *   the countries layer beneath labels.
 * `isMapLoaded` — true after the 'load' event fires.
 * `popupInfo` / `setPopupInfo` — persisted click state; null means no country
 *   has been selected yet.
 * `onMapLoad` / `onMapClick` — pass to the react-map-gl <Map> event props.
 */
export interface MapInteractionState {
  mapRef: React.MutableRefObject<MapboxMap | null>
  firstSymbolId: string | null
  isMapLoaded: boolean
  popupInfo: PopupInfo | null
  setPopupInfo: React.Dispatch<React.SetStateAction<PopupInfo | null>>
  onMapLoad: (event: { target: MapboxMap }) => void
  onMapClick: (event: MapMouseEvent) => void
}

/**
 * Manages all Mapbox GL map interaction: loading, feature-state updates for
 * the choropleth layer, and click-to-select-country behavior.
 *
 * `mapRef` is typed as `MapboxMap | null` (the raw mapbox-gl `Map` class, not
 * the react-map-gl `MapRef` wrapper) because the hook registers native mapbox
 * event listeners via `map.on("data", ...)` and calls raw map methods
 * (`queryRenderedFeatures`, `setFeatureState`, `getStyle`).  The react-map-gl
 * `MapRef` wrapper intentionally blocks some mutating methods — using the raw
 * `Map` type here is the correct approach for imperative map manipulation.
 *
 * Feature `state` from `GeoJSONFeature` is typed as `Record<string, unknown>`
 * (FeatureState) by mapbox-gl.  We narrow to specific types at the point of
 * use: `typeof x === 'number'` before assigning to `numWatchedFilms`, and
 * `typeof x === 'string'` before assigning to `customName`.  Without narrowing,
 * assigning `unknown` directly to a typed variable would cause a compile error
 * that accurately reflects the runtime risk of unvalidated map state.
 *
 * `GeoJSONFeature.properties` is typed as `GeoJSON.Feature['properties']`
 * which is `Record<string, unknown> | null` at the interface level.  We use
 * optional chaining (`?.iso_a2`, `?.name`) for safety rather than asserting.
 */
export function useMapInteraction(
  filmsPerCountryData: FilmsPerCountryData,
): MapInteractionState {
  const mapRef = useRef<MapboxMap | null>(null)
  const [firstSymbolId, setFirstSymbolId] = useState<string | null>(null)
  const [isMapLoaded, setIsMapLoaded] = useState<boolean>(false)
  const [popupInfo, setPopupInfo] = usePersistedState<PopupInfo | null>(
    "map-popupInfo",
    null,
  )

  const setFeatureStates = useCallback(() => {
    if (!mapRef.current) return
    const map = mapRef.current
    // No-geometry overload: query all rendered features across the viewport.
    const countries: GeoJSONFeature[] = map.queryRenderedFeatures({
      layers: ["countriesLayer"],
    })
    countries.forEach((country) => {
      const isoA2 = country.properties?.["iso_a2"]
      // country.id can be undefined per GeoJSONFeature — guard required before
      // passing to setFeatureState whose FeatureSelector requires string | number.
      if (
        typeof isoA2 === "string" &&
        country.id !== undefined &&
        filmsPerCountryData[isoA2]
      ) {
        map.setFeatureState(
          {
            source: "countriesData",
            sourceLayer: "administrative",
            id: country.id,
          },
          {
            num_watched_films: filmsPerCountryData[isoA2].num_watched_films,
          },
        )
      }
      if (country.id === 921 || country.id === 907) {
        map.setFeatureState(
          {
            source: "countriesData",
            sourceLayer: "administrative",
            id: country.id,
          },
          { custom_name: "Palestine" },
        )
        if (filmsPerCountryData["PS"]) {
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
    (event: MapDataEvent) => {
      // MapDataEvent is MapStyleDataEvent | MapSourceDataEvent.
      // sourceId and isSourceLoaded only exist on MapSourceDataEvent.
      if ("sourceId" in event && event.sourceId === "countriesData" && event.isSourceLoaded) {
        setFeatureStates()
      }
    },
    [setFeatureStates],
  )

  const onMapLoad = useCallback(
    (event: { target: MapboxMap }) => {
      mapRef.current = event.target
      const map = mapRef.current
      map.on("data", onData)
      if (mapRef.current.isSourceLoaded("countriesData")) {
        setFeatureStates()
      }
      const layers = map.getStyle().layers
      const firstSymbolLayer = layers.find((layer) => layer.type === "symbol")
      if (firstSymbolLayer) {
        setFirstSymbolId(firstSymbolLayer.id)
      }
      setIsMapLoaded(true)
    },
    [onData, setFeatureStates],
  )

  const onMapClick = useCallback((event: MapMouseEvent) => {
    let numWatchedFilms: number = 0
    let countryName: string | undefined
    let customName: string | undefined
    let isoA2: string | undefined

    if (!mapRef.current) return
    const features = mapRef.current.queryRenderedFeatures(event.point, {
      layers: ["countriesLayer"],
    })
    if (features.length > 0) {
      const clickedFeature = features[0]
      const rawWatched = clickedFeature.state?.["num_watched_films"]
      const rawCustomName = clickedFeature.state?.["custom_name"]
      const rawCountryName = clickedFeature.properties?.["name"]
      const rawIsoA2 = clickedFeature.properties?.["iso_a2"]

      numWatchedFilms =
        typeof rawWatched === "number" && rawWatched >= 1 ? rawWatched : 0
      customName = typeof rawCustomName === "string" ? rawCustomName : undefined
      countryName = typeof rawCountryName === "string" ? rawCountryName : undefined
      isoA2 =
        customName === "Palestine"
          ? "PS"
          : typeof rawIsoA2 === "string"
            ? rawIsoA2
            : undefined
    }
    setPopupInfo({
      longitude: event.lngLat.lng,
      latitude: event.lngLat.lat,
      num_watched_films: numWatchedFilms,
      country_name: countryName,
      custom_name: customName,
      iso_a2: isoA2,
    })
  }, [])

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.off("data", onData)
      }
    }
  }, [onData])

  return {
    mapRef,
    firstSymbolId,
    isMapLoaded,
    popupInfo,
    setPopupInfo,
    onMapLoad,
    onMapClick,
  }
}
