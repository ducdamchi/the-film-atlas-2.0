import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"

/* Tracks if sidebar is being hovered on */
export const sidebarHoveredAtom = atom(false)

/* Tracks if sidebar is pinned open */
export const sidebarPinnedAtom = atom(false)

/* Tracks if a sidebar-anchored element (e.g. NavUser dropdown) is open */
export const sidebarAnchoredAtom = atom(false)

/* Persisted open/closed state for collapsible sidebar sections */
export const sidebarSectionsAtom = atomWithStorage<Record<string, boolean>>(
  "sidebar-sections",
  { collections: true, more: false },
)
