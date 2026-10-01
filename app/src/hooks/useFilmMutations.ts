import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/utils/authContext"
import { likeFilmFn, unlikeFilmFn, rateFilmFn } from "@/server/watched"
import { saveFilmFn, unsaveFilmFn } from "@/server/watchlisted"
import {
  guestLikeFilm,
  guestUnlikeFilm,
  guestSaveFilm,
  guestUnsaveFilm,
  guestRateFilm,
} from "@/utils/guestStore"
import {
  getWatchedQueryOptions,
  getWatchlistedQueryOptions,
  getWatchedKey,
  getWatchlistedKey,
  getDirectorsKey,
} from "@/utils/queryCacheSync"
import type {
  UserFilm,
  DirectorRef,
  StarRating,
  FilmInteractionRequest,
  FilmRateRequest,
} from "@/types/film"

export class GuestLimitError extends Error {
  constructor() {
    super("GUEST_LIMIT")
    this.name = "GuestLimitError"
  }
}

export function isGuestLimitError(err: unknown): boolean {
  return err instanceof GuestLimitError ||
    (err instanceof Error && err.name === "GuestLimitError")
}

function buildServerReq(
  film: UserFilm,
  extras?: {
    stars?: StarRating
    genres?: { id: number; name: string }[] | null
  },
): FilmInteractionRequest {
  return {
    tmdbId: film.id,
    title: film.title,
    runtime: film.runtime,
    poster_path: film.poster_path,
    backdrop_path: film.backdrop_path,
    origin_country: film.origin_country,
    release_date: film.release_date,
    directors: film.directors,
    directorNamesForSorting: film.directorNamesForSorting,
    stars: extras?.stars ?? 0,
    genres: extras?.genres ?? null,
    overview: film.overview,
    original_title: film.original_title,
    spoken_languages: film.spoken_languages,
    imdb_id: film.imdb_id,
  }
}

export function useFilmMutations() {
  const { authState } = useAuth()
  const queryClient = useQueryClient()
  const isGuest = !authState.status

  const watchedKey = getWatchedKey(isGuest)
  const watchlistedKey = getWatchlistedKey(isGuest)
  const directorsKey = getDirectorsKey(isGuest)

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: watchedKey })
    queryClient.invalidateQueries({ queryKey: watchlistedKey })
    queryClient.invalidateQueries({ queryKey: directorsKey })
  }

  async function likeFilm(
    film: UserFilm,
    extras?: {
      stars?: StarRating
      genres?: { id: number; name: string }[] | null
    },
  ): Promise<void> {
    if (isGuest) {
      const result = guestLikeFilm(film)
      if (result.limitReached) throw new GuestLimitError()
      invalidateAll()
      return
    }

    await queryClient.cancelQueries({ queryKey: watchedKey })
    await queryClient.cancelQueries({ queryKey: watchlistedKey })
    const prevWatched = queryClient.getQueryData<UserFilm[]>(watchedKey)
    const prevWatchlisted = queryClient.getQueryData<UserFilm[]>(watchlistedKey)

    queryClient.setQueryData<UserFilm[]>(watchedKey, (old = []) =>
      old.some((f) => f.id === film.id) ? old : [film, ...old],
    )
    queryClient.setQueryData<UserFilm[]>(watchlistedKey, (old = []) =>
      old.filter((f) => f.id !== film.id),
    )

    try {
      await likeFilmFn({ data: buildServerReq(film, extras) })
      invalidateAll()
    } catch (err) {
      queryClient.setQueryData(watchedKey, prevWatched)
      queryClient.setQueryData(watchlistedKey, prevWatchlisted)
      throw err
    }
  }

  async function unlikeFilm(filmId: number): Promise<void> {
    if (isGuest) {
      guestUnlikeFilm(filmId)
      invalidateAll()
      return
    }

    await queryClient.cancelQueries({ queryKey: watchedKey })
    const prevWatched = queryClient.getQueryData<UserFilm[]>(watchedKey)
    queryClient.setQueryData<UserFilm[]>(watchedKey, (old = []) =>
      old.filter((f) => f.id !== filmId),
    )

    try {
      await unlikeFilmFn({ data: filmId })
      queryClient.invalidateQueries({ queryKey: watchedKey })
      queryClient.invalidateQueries({ queryKey: directorsKey })
    } catch (err) {
      queryClient.setQueryData(watchedKey, prevWatched)
      throw err
    }
  }

  async function saveFilm(
    film: UserFilm,
    extras?: { genres?: { id: number; name: string }[] | null },
  ): Promise<void> {
    if (isGuest) {
      const result = guestSaveFilm(film)
      if (result.limitReached) throw new GuestLimitError()
      invalidateAll()
      return
    }

    await queryClient.cancelQueries({ queryKey: watchedKey })
    await queryClient.cancelQueries({ queryKey: watchlistedKey })
    const prevWatched = queryClient.getQueryData<UserFilm[]>(watchedKey)
    const prevWatchlisted =
      queryClient.getQueryData<UserFilm[]>(watchlistedKey)

    queryClient.setQueryData<UserFilm[]>(watchlistedKey, (old = []) =>
      old.some((f) => f.id === film.id) ? old : [film, ...old],
    )
    queryClient.setQueryData<UserFilm[]>(watchedKey, (old = []) =>
      old.filter((f) => f.id !== film.id),
    )

    try {
      await saveFilmFn({ data: buildServerReq(film, extras) })
      queryClient.invalidateQueries({ queryKey: watchedKey })
      queryClient.invalidateQueries({ queryKey: watchlistedKey })
    } catch (err) {
      queryClient.setQueryData(watchedKey, prevWatched)
      queryClient.setQueryData(watchlistedKey, prevWatchlisted)
      throw err
    }
  }

  async function unsaveFilm(filmId: number): Promise<void> {
    if (isGuest) {
      guestUnsaveFilm(filmId)
      invalidateAll()
      return
    }

    await queryClient.cancelQueries({ queryKey: watchlistedKey })
    const prevWatchlisted =
      queryClient.getQueryData<UserFilm[]>(watchlistedKey)
    queryClient.setQueryData<UserFilm[]>(watchlistedKey, (old = []) =>
      old.filter((f) => f.id !== filmId),
    )

    try {
      await unsaveFilmFn({ data: filmId })
      queryClient.invalidateQueries({ queryKey: watchlistedKey })
      queryClient.invalidateQueries({ queryKey: watchedKey })
    } catch (err) {
      queryClient.setQueryData(watchlistedKey, prevWatchlisted)
      throw err
    }
  }

  async function rateFilm(
    filmId: number,
    stars: StarRating,
    directors: DirectorRef[],
  ): Promise<void> {
    if (isGuest) {
      guestRateFilm(filmId, stars)
      invalidateAll()
      return
    }

    await queryClient.cancelQueries({ queryKey: watchedKey })
    const prevWatched = queryClient.getQueryData<UserFilm[]>(watchedKey)
    queryClient.setQueryData<UserFilm[]>(watchedKey, (old = []) =>
      old.map((f) => (f.id === filmId ? { ...f, stars } : f)),
    )

    const req: FilmRateRequest = { tmdbId: filmId, directors, stars }
    try {
      await rateFilmFn({ data: req })
      queryClient.invalidateQueries({ queryKey: watchedKey })
      queryClient.invalidateQueries({ queryKey: directorsKey })
    } catch (err) {
      queryClient.setQueryData(watchedKey, prevWatched)
      throw err
    }
  }

  return {
    isGuest,
    watchedQueryOptions: getWatchedQueryOptions(isGuest),
    watchlistedQueryOptions: getWatchlistedQueryOptions(isGuest),
    likeFilm,
    unlikeFilm,
    saveFilm,
    unsaveFilm,
    rateFilm,
  }
}
