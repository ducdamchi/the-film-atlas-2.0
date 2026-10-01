import { useQueryClient } from "@tanstack/react-query"
import { useFilmMutations, GuestLimitError, isGuestLimitError } from "@/hooks/useFilmMutations"
import {
  addFilmToCollectionFn,
  removeFilmFromCollectionFn,
} from "@/server/collections"
import {
  collectionsQueryOptions,
  collectionDetailQueryOptions,
} from "@/queries/collections.queries"
import { getWatchedKey, getWatchlistedKey } from "@/utils/queryCacheSync"
import type { CollectionData } from "@/hooks/useCollections"
import type { AppCollection } from "@/types/api"
import type { UserFilm, StarRating } from "@/types/film"

export { GuestLimitError, isGuestLimitError }

export function useCollectionMutations() {
  const { isGuest, likeFilm, unlikeFilm, saveFilm, unsaveFilm } =
    useFilmMutations()
  const queryClient = useQueryClient()

  async function addFilmToCollection(
    collection: CollectionData,
    film: UserFilm,
    extras?: {
      stars?: StarRating
      genres?: { id: number; name: string }[] | null
    },
  ): Promise<void> {
    // Pre-check: was this film in the counterpart list?
    // (likeFilm/saveFilm will remove it, so we must check before calling them)
    let wasInCounterpart = false
    let counterpartRuntime = 0
    let counterpartType: string | undefined

    if (
      !isGuest &&
      (collection.collectionType === "watched" ||
        collection.collectionType === "watchlist")
    ) {
      const counterpartKey =
        collection.collectionType === "watched"
          ? getWatchlistedKey(false)
          : getWatchedKey(false)
      const counterpartFilms =
        queryClient.getQueryData<UserFilm[]>(counterpartKey) ?? []
      const found = counterpartFilms.find((f) => f.id === film.id)
      if (found) {
        wasInCounterpart = true
        counterpartRuntime = found.runtime ?? 0
        counterpartType =
          collection.collectionType === "watched" ? "watchlist" : "watched"
      }
    }

    // Execute mutation
    if (collection.collectionType === "watched") {
      await likeFilm(film, extras)
    } else if (collection.collectionType === "watchlist") {
      await saveFilm(film, extras)
    } else {
      const req = {
        tmdbId: film.id,
        title: film.title,
        runtime: film.runtime,
        poster_path: film.poster_path,
        backdrop_path: film.backdrop_path,
        origin_country: film.origin_country,
        release_date: film.release_date,
        directors: film.directors,
        directorNamesForSorting: film.directorNamesForSorting,
        stars: extras?.stars ?? (0 as StarRating),
        genres: extras?.genres ?? null,
        overview: film.overview,
        original_title: film.original_title,
        spoken_languages: film.spoken_languages,
        imdb_id: film.imdb_id,
      }
      await addFilmToCollectionFn({
        data: { collectionId: collection.id, film: req },
      })
      queryClient.setQueryData<{
        collection: AppCollection
        films: UserFilm[]
      }>(collectionDetailQueryOptions(collection.id).queryKey, (old) =>
        old ? { ...old, films: [film, ...old.films] } : old,
      )
    }

    // Sync collection metadata (auth only)
    if (!isGuest) {
      queryClient.setQueryData<AppCollection[]>(
        collectionsQueryOptions.queryKey,
        (old = []) =>
          old.map((c) => {
            if (c.id === collection.id) {
              return {
                ...c,
                film_count: c.film_count + 1,
                total_runtime: c.total_runtime + (film.runtime ?? 0),
              }
            }
            if (wasInCounterpart && c.collection_type === counterpartType) {
              return {
                ...c,
                film_count: Math.max(0, c.film_count - 1),
                total_runtime: c.total_runtime - counterpartRuntime,
              }
            }
            return c
          }),
      )
    }
  }

  async function removeFilmFromCollection(
    collection: CollectionData,
    filmId: number,
  ): Promise<void> {
    let removedRuntime = 0

    if (collection.collectionType === "watched") {
      const key = getWatchedKey(isGuest)
      const films = queryClient.getQueryData<UserFilm[]>(key) ?? []
      removedRuntime = films.find((f) => f.id === filmId)?.runtime ?? 0
      await unlikeFilm(filmId)
    } else if (collection.collectionType === "watchlist") {
      const key = getWatchlistedKey(isGuest)
      const films = queryClient.getQueryData<UserFilm[]>(key) ?? []
      removedRuntime = films.find((f) => f.id === filmId)?.runtime ?? 0
      await unsaveFilm(filmId)
    } else {
      const cached = queryClient.getQueryData<{
        collection: AppCollection
        films: UserFilm[]
      }>(collectionDetailQueryOptions(collection.id).queryKey)
      removedRuntime =
        cached?.films.find((f) => f.id === filmId)?.runtime ?? 0
      await removeFilmFromCollectionFn({
        data: { collectionId: collection.id, filmId },
      })
      queryClient.setQueryData<{
        collection: AppCollection
        films: UserFilm[]
      }>(collectionDetailQueryOptions(collection.id).queryKey, (old) =>
        old
          ? { ...old, films: old.films.filter((f) => f.id !== filmId) }
          : old,
      )
    }

    // Sync collection metadata (auth only)
    if (!isGuest) {
      queryClient.setQueryData<AppCollection[]>(
        collectionsQueryOptions.queryKey,
        (old = []) =>
          old.map((c) =>
            c.id === collection.id
              ? {
                  ...c,
                  film_count: Math.max(0, c.film_count - 1),
                  total_runtime: c.total_runtime - removedRuntime,
                }
              : c,
          ),
      )
    }
  }

  return { isGuest, addFilmToCollection, removeFilmFromCollection }
}
