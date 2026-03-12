import { useRef, useState, useCallback, useEffect } from "react"
import { usePersistedState } from "./usePersistedState"

export function useMapInteraction(filmsPerCountryData) {
  const mapRef = useRef(null)
  const [firstSymbolId, setFirstSymbolId] = useState(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [popupInfo, setPopupInfo] = usePersistedState("map-popupInfo", null)

  const setFeatureStates = useCallback(() => {
    if (!mapRef.current) return
    const map = mapRef.current
    const countries = map.queryRenderedFeatures({ layers: ["countriesLayer"] })
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
    (event) => {
      if (event.sourceId === "countriesData" && event.isSourceLoaded) {
        setFeatureStates()
      }
    },
    [setFeatureStates],
  )

  const onMapLoad = useCallback(
    (event) => {
      mapRef.current = event.target
      const map = mapRef.current
      map.on("data", onData)
      if (mapRef.current.isSourceLoaded("countriesData")) {
        setFeatureStates()
      }
      const layers = map.getStyle().layers
      const firstSymbolLayerId = layers.find((layer) => layer.type === "symbol").id
      if (firstSymbolLayerId) {
        setFirstSymbolId(firstSymbolLayerId)
      }
      setIsMapLoaded(true)
    },
    [onData, setFeatureStates],
  )

  const onMapClick = useCallback((event) => {
    let clickedFeature, numWatchedFilms, countryName, customName, isoA2
    if (!mapRef.current) return
    const features = mapRef.current.queryRenderedFeatures(event.point, {
      layers: ["countriesLayer"],
    })
    if (features.length > 0) {
      clickedFeature = features[0]
      numWatchedFilms = clickedFeature.state?.num_watched_films
      customName = clickedFeature.state?.custom_name
      countryName = clickedFeature.properties?.name
      isoA2 =
        customName === "Palestine"
          ? "PS"
          : clickedFeature.properties?.iso_a2
    }
    setPopupInfo({
      longitude: event.lngLat.lng,
      latitude: event.lngLat.lat,
      num_watched_films: numWatchedFilms >= 1 ? numWatchedFilms : 0,
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
