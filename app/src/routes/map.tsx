import { createFileRoute } from "@tanstack/react-router"
import { Provider } from "jotai"
import Map from "../pages/map/Map"
import { mapStore } from "@/atoms/mapAtoms"

/** Short aliases used in the URL */
export type MapMode = "discover" | "watched" | "watchlisted" | "rated"
export type DiscoverFilterMode = "recommended" | "custom"
export type DiscoverSort = "random" | "vote_average.desc" | "vote_count.desc"
export type UserSort = "added_date" | "released_date"
export type UserSortDir = "asc" | "desc"

export interface MapSearch {
  country?: string
}

function MapProvider() {
  return (
    <Provider store={mapStore}>
      <Map />
    </Provider>
  )
}

export const Route = createFileRoute("/map")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): MapSearch => ({
    country: typeof search.country === "string" ? search.country : undefined,
  }),
  component: MapProvider,
})
