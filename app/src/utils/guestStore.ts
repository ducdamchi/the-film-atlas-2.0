import type { UserFilm, StarRating } from "@/types/film"

const WATCHED_KEY = "guest-watched"
const WATCHLISTED_KEY = "guest-watchlisted"
export const GUEST_FILM_LIMIT = 30

function read<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

function write<T>(key: string, value: T[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // localStorage may be unavailable (private browsing, quota exceeded)
  }
}

export function getGuestWatched(): UserFilm[] {
  return read<UserFilm>(WATCHED_KEY)
}

export function getGuestWatchlisted(): UserFilm[] {
  return read<UserFilm>(WATCHLISTED_KEY)
}

export function getGuestFilmCount(): number {
  return getGuestWatched().length + getGuestWatchlisted().length
}

export function isGuestLimitReached(): boolean {
  return getGuestFilmCount() >= GUEST_FILM_LIMIT
}

export function guestLikeFilm(
  film: UserFilm,
): { success: boolean; limitReached: boolean } {
  const watched = getGuestWatched()
  if (watched.some((f) => f.id === film.id)) {
    return { success: false, limitReached: false }
  }

  // Remove from watchlisted if present (watched overrides watchlisted)
  const watchlisted = getGuestWatchlisted().filter((f) => f.id !== film.id)
  const totalAfter = watched.length + 1 + watchlisted.length
  // Only count against the limit if the film wasn't already in watchlisted
  if (totalAfter > GUEST_FILM_LIMIT && watched.length + watchlisted.length + 1 > GUEST_FILM_LIMIT) {
    return { success: false, limitReached: true }
  }

  write(WATCHED_KEY, [film, ...watched])
  write(WATCHLISTED_KEY, watchlisted)
  return { success: true, limitReached: false }
}

export function guestUnlikeFilm(tmdbId: number): void {
  write(
    WATCHED_KEY,
    getGuestWatched().filter((f) => f.id !== tmdbId),
  )
}

export function guestSaveFilm(
  film: UserFilm,
): { success: boolean; limitReached: boolean } {
  const watchlisted = getGuestWatchlisted()
  if (watchlisted.some((f) => f.id === film.id)) {
    return { success: false, limitReached: false }
  }

  // Remove from watched if present (saved overrides watched)
  const watched = getGuestWatched().filter((f) => f.id !== film.id)
  const totalAfter = watched.length + watchlisted.length + 1
  if (totalAfter > GUEST_FILM_LIMIT && getGuestFilmCount() + 1 > GUEST_FILM_LIMIT) {
    return { success: false, limitReached: true }
  }

  write(WATCHLISTED_KEY, [film, ...watchlisted])
  write(WATCHED_KEY, watched)
  return { success: true, limitReached: false }
}

export function guestUnsaveFilm(tmdbId: number): void {
  write(
    WATCHLISTED_KEY,
    getGuestWatchlisted().filter((f) => f.id !== tmdbId),
  )
}

export function guestRateFilm(tmdbId: number, stars: StarRating): void {
  const watched = getGuestWatched()
  const idx = watched.findIndex((f) => f.id === tmdbId)
  if (idx === -1) return
  watched[idx] = { ...watched[idx], stars }
  write(WATCHED_KEY, watched)
}

export function getGuestData(): {
  watched: UserFilm[]
  watchlisted: UserFilm[]
} {
  return {
    watched: getGuestWatched(),
    watchlisted: getGuestWatchlisted(),
  }
}

export function clearGuestData(): void {
  try {
    window.localStorage.removeItem(WATCHED_KEY)
    window.localStorage.removeItem(WATCHLISTED_KEY)
  } catch {
    // noop
  }
}
