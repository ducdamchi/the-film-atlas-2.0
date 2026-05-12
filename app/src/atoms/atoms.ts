import { atom } from "jotai"

/* Tracks if sidebar is being hovered on */
export const sidebarHoveredAtom = atom(false)

/* Tracks if sidebar is pinned open */
export const sidebarPinnedAtom = atom(false)

/* Tracks if a sidebar-anchored element (e.g. NavUser dropdown) is open */
export const sidebarAnchoredAtom = atom(false)
