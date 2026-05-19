import { createFileRoute } from "@tanstack/react-router"
import MapPage from "../components/MapPage"

/** Short aliases used in the URL */
export type MapMode = "discover" | "watched" | "watchlisted" | "rated"
export type DiscoverFilterMode = "recommended" | "custom"
export type DiscoverSort = "random" | "vote_average.desc" | "vote_count.desc"
export type UserSort = "added_date" | "released_date"
export type UserSortDir = "asc" | "desc"

export interface MapSearch {
  /* Shared URL fields */
  country?: string
  mode: MapMode

  /* URL fields for Discover Mode */
  dsort?: DiscoverSort
  filter?: DiscoverFilterMode
  rating?: number
  votes?: number

  /* URL fields for User Mode */
  sort?: UserSort
  dir?: UserSortDir
  stars?: number
}

const MAP_MODE: readonly MapMode[] = [
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
    const mode: MapMode = MAP_MODE.includes(search.mode as MapMode)
      ? (search.mode as MapMode)
      : "discover"
    const isCustom = mode === "discover" && search.filter === "custom"
    return {
      /* Shared URL fields */
      country: typeof search.country === "string" ? search.country : undefined,
      mode,

      /* URL fields for Discover Mode */
      // Sort options for Discover mode. "Random" is the default — omit from URL
      dsort: NON_DEFAULT_DISCOVER_SORTS.includes(search.dsort as DiscoverSort)
        ? (search.dsort as DiscoverSort)
        : undefined,

      // Fields that only show when mode=='discover' && filter==='custom'
      filter: isCustom ? "custom" : undefined,
      rating:
        isCustom && typeof search.rating === "number"
          ? search.rating
          : undefined,
      votes:
        isCustom && typeof search.votes === "number" ? search.votes : undefined,

      /* URL fields for User Mode (watched, watchlisted, rated)*/
      sort: search.sort === "released_date" ? "released_date" : undefined,
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
