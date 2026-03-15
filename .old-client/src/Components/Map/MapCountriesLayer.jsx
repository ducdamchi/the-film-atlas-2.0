import { Source, Layer } from "react-map-gl/maplibre"
import { MAPTILER_COUNTRIES_TILES_URL } from "@/Utils/mapConstants"

export default function MapCountriesLayer({ firstSymbolId }) {
  return (
    <Source id="countriesData" type="vector" url={MAPTILER_COUNTRIES_TILES_URL}>
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
              30,
              "#e81445",
            ],
            "rgba(126, 126, 126, 0)",
          ],
          "fill-opacity": 1,
          "fill-outline-color": "#d5e5b8",
        }}
        filter={["==", "level", 0]}
        beforeId={firstSymbolId}
      />
      <Layer
        id="countriesLayer"
        source="countriesData"
        source-layer="administrative"
        type="symbol"
        layout={{
          "text-field": [
            "case",
            ["!=", ["feature-state", "custom_name"], ""],
            ["feature-state", "custom_name"],
            ["get", "NAME"],
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
        beforeId={firstSymbolId}
      />
    </Source>
  )
}
