import {
  watchedFilmsQueryOptions,
  watchlistedFilmsQueryOptions,
  guestWatchedQueryOptions,
  guestWatchlistedQueryOptions,
} from "@/queries/collections.queries"
import {
  directorsQueryOptions,
  guestDirectorsQueryOptions,
} from "@/queries/directors.queries"

export function getWatchedQueryOptions(isGuest: boolean) {
  return isGuest ? guestWatchedQueryOptions : watchedFilmsQueryOptions
}

export function getWatchlistedQueryOptions(isGuest: boolean) {
  return isGuest ? guestWatchlistedQueryOptions : watchlistedFilmsQueryOptions
}

export function getWatchedKey(isGuest: boolean) {
  return getWatchedQueryOptions(isGuest).queryKey
}

export function getWatchlistedKey(isGuest: boolean) {
  return getWatchlistedQueryOptions(isGuest).queryKey
}

export function getDirectorsKey(isGuest: boolean) {
  return isGuest
    ? guestDirectorsQueryOptions.queryKey
    : directorsQueryOptions.queryKey
}
