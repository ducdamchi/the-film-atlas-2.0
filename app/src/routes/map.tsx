import { createFileRoute } from "@tanstack/react-router"
import MapPage from "../components/MapPage"

/** Short aliases used in the URL */
export type MapModeAlias = "discover" | "watched" | "watchlisted" | "rated"

/** Full internal mode strings used by hooks and the API */
export type MapMode =
  | "discover"
  | "watched/by_country"
  | "watchlisted/by_country"
  | "watched/rated/by_country"

export type FilterMode = "recommended" | "custom"
export type DiscoverSort = "random" | "vote_average.desc" | "vote_count.desc"
export type UserSort = "added_date" | "released_date"
export type SortDir = "asc" | "desc"

export const ALIAS_TO_MODE: Record<MapModeAlias, MapMode> = {
  discover: "discover",
  watched: "watched/by_country",
  watchlisted: "watchlisted/by_country",
  rated: "watched/rated/by_country",
}

export interface MapSearch {
  country?: string
  mode: MapModeAlias
  /** Omitted when "recommended" (default) */
  filter: FilterMode
  /** Only present when filter=custom */
  rating?: number
  /** Only present when filter=custom */
  votes?: number
  /** Omitted when "random" (default) */
  dsort?: DiscoverSort
  /** Only present in my-films mode; omitted when "added_date" (default) */
  sort?: UserSort
  /** Only present in my-films mode; omitted when "desc" (default) */
  dir?: SortDir
  /** Only present when mode=rated and value > 0 */
  stars?: number
}

const MAP_MODE_ALIASES: readonly MapModeAlias[] = [
  "discover",
  "watched",
  "watchlisted",
  "rated",
]
const NON_DEFAULT_DISCOVER_SORTS: readonly DiscoverSort[] = [
  "vote_average.desc",
  "vote_count.desc",
]

export const Route = createFileRoute("/map")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): MapSearch => {
    const isCustom = search.filter === "custom"
    return {
      country: typeof search.country === "string" ? search.country : undefined,
      mode: MAP_MODE_ALIASES.includes(search.mode as MapModeAlias)
        ? (search.mode as MapModeAlias)
        : "discover",
      // "recommended" is the default — omit from URL
      filter: isCustom ? "custom" : "recommended",
      // Only meaningful (and present) when filter=custom
      rating:
        isCustom && typeof search.rating === "number"
          ? search.rating
          : undefined,
      votes:
        isCustom && typeof search.votes === "number" ? search.votes : undefined,
      // "random" is the default — omit from URL
      dsort: NON_DEFAULT_DISCOVER_SORTS.includes(search.dsort as DiscoverSort)
        ? (search.dsort as DiscoverSort)
        : undefined,
      // "added_date" is the default — omit from URL
      sort: search.sort === "released_date" ? "released_date" : undefined,
      // "desc" is the default — omit from URL
      dir: search.dir === "asc" ? "asc" : undefined,
      // 0 means "all" — omit from URL
      stars:
        typeof search.stars === "number" && search.stars > 0
          ? search.stars
          : undefined,
    }
  },
  component: MapPage,
})
