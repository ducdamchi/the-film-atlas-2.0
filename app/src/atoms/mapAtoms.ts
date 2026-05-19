import { atom, createStore } from "jotai"
import type {
  MapMode,
  DiscoverFilterMode,
  DiscoverSort,
  UserSort,
  UserSortDir,
} from "@/routes/map"

// Isolated store — only MapPage and its children read/write these atoms.
// Keeps ephemeral map UI state out of the default global Jotai store.
export const mapStore = createStore()

export const map_modeAtom           = atom<MapMode>("discover")
export const map_discoverSortAtom   = atom<DiscoverSort>("random")
export const map_discoverFilterAtom = atom<DiscoverFilterMode>("recommended")
export const map_ratingAtom         = atom<number>(0)
export const map_votesAtom          = atom<number>(0)
export const map_userSortAtom       = atom<UserSort>("added_date")
export const map_userSortDirAtom    = atom<UserSortDir>("desc")
export const map_starsAtom          = atom<number>(0)
// Remembers last my-films sub-mode (watched/watchlisted/rated) so switching
// back to "My Films" restores the previous filter instead of defaulting.
export const map_userFilterAtom     = atom<Exclude<MapMode, "discover">>("watched")
