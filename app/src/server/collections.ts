// Server functions for /profile/me/collections — run on the TanStack Start app server.
// See watched.ts for architecture notes.
import { createServerFn } from "@tanstack/react-start"
import { apiHeaders } from "./utils"
import type { AppCollection } from "@/types/api"
import type { UserFilm, FilmInteractionRequest } from "@/types/film"

const API_URL = process.env.API_URL ?? "http://localhost:3002"

export const fetchUserCollectionsFn = createServerFn({ method: "GET" })
  .handler(async (): Promise<AppCollection[]> => {
    const res = await fetch(`${API_URL}/profile/me/collections`, {
      headers: apiHeaders(),
    })
    if (!res.ok) throw new Error("Unauthorized")
    return res.json()
  })

export const fetchCollectionByIdFn = createServerFn({ method: "GET" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }): Promise<{ collection: AppCollection; films: UserFilm[] }> => {
    const res = await fetch(`${API_URL}/profile/me/collections/${id}`, {
      headers: apiHeaders(),
    })
    if (!res.ok) throw new Error("Unauthorized")
    const raw = await res.json()
    const { films: rawFilms, ...collection } = raw
    const films: UserFilm[] = (rawFilms ?? []).map((f: Record<string, unknown>) => ({
      id: f.id,
      title: f.title,
      runtime: f.runtime,
      directors: f.directors,
      directorNamesForSorting: f.directorNamesForSorting,
      poster_path: f.poster_path,
      backdrop_path: f.backdrop_path,
      origin_country: f.origin_country,
      release_date: f.release_date,
      added_date: f.added_at as string,
      stars: (f.stars as number | null) ?? null,
      overview: (f.overview as string | null) ?? null,
      original_title: (f.original_title as string | null) ?? null,
      spoken_languages: (f.spoken_languages as UserFilm["spoken_languages"]) ?? null,
      imdb_id: (f.imdb_id as string | null) ?? null,
    }))
    return { collection: collection as AppCollection, films }
  })

export const deleteCollectionFn = createServerFn({ method: "POST" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }): Promise<void> => {
    const res = await fetch(`${API_URL}/profile/me/collections/${id}`, {
      method: "DELETE",
      headers: apiHeaders(),
    })
    if (!res.ok) throw new Error("Unauthorized")
  })

export const createCollectionFn = createServerFn({ method: "POST" })
  .inputValidator((params: { id: string; title: string; description: string }) => params)
  .handler(async ({ data }): Promise<AppCollection> => {
    const res = await fetch(`${API_URL}/profile/me/collections`, {
      method: "POST",
      headers: { ...apiHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error("Unauthorized")
    return res.json()
  })

export const addFilmToCollectionFn = createServerFn({ method: "POST" })
  .inputValidator((params: { collectionId: string; film: FilmInteractionRequest }) => params)
  .handler(async ({ data: { collectionId, film } }): Promise<{ collection_film_id: string; film_count: number }> => {
    const res = await fetch(`${API_URL}/profile/me/collections/${collectionId}/films`, {
      method: "POST",
      headers: { ...apiHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(film),
    })
    // Propagate conflict status so CollectionSearchModal can show the right toast.
    if (res.status === 409) throw new Error("CONFLICT")
    if (!res.ok) throw new Error("Unauthorized")
    return res.json()
  })

export const removeFilmFromCollectionFn = createServerFn({ method: "POST" })
  .inputValidator((params: { collectionId: string; filmId: number | string }) => params)
  .handler(async ({ data: { collectionId, filmId } }): Promise<{ deleted: boolean; film_count: number }> => {
    const res = await fetch(`${API_URL}/profile/me/collections/${collectionId}/films/${filmId}`, {
      method: "DELETE",
      headers: apiHeaders(),
    })
    if (!res.ok) throw new Error("Unauthorized")
    return res.json()
  })

export const patchCollectionPinFn = createServerFn({ method: "POST" })
  .inputValidator((params: { id: string; pinned: boolean }) => params)
  .handler(async ({ data: { id, pinned } }): Promise<{ is_pinned: boolean }> => {
    const res = await fetch(`${API_URL}/profile/me/collections/${id}/pin`, {
      method: "PATCH",
      headers: { ...apiHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ pinned }),
    })
    if (!res.ok) throw new Error("Unauthorized")
    return res.json()
  })

export const patchCollectionVisibilityFn = createServerFn({ method: "POST" })
  .inputValidator((params: { id: string; is_public: boolean }) => params)
  .handler(async ({ data: { id, is_public } }): Promise<{ is_public: boolean }> => {
    const res = await fetch(`${API_URL}/profile/me/collections/${id}/visibility`, {
      method: "PATCH",
      headers: { ...apiHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ is_public }),
    })
    if (!res.ok) throw new Error("Unauthorized")
    return res.json()
  })

export const putCollectionTitleFn = createServerFn({ method: "POST" })
  .inputValidator((params: { id: string; title: string }) => params)
  .handler(async ({ data: { id, title } }): Promise<AppCollection> => {
    const res = await fetch(`${API_URL}/profile/me/collections/${id}`, {
      method: "PUT",
      headers: { ...apiHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    })
    if (!res.ok) throw new Error("Unauthorized")
    return res.json()
  })

export const putCollectionDescriptionFn = createServerFn({ method: "POST" })
  .inputValidator((params: { id: string; description: string }) => params)
  .handler(async ({ data: { id, description } }): Promise<AppCollection> => {
    const res = await fetch(`${API_URL}/profile/me/collections/${id}`, {
      method: "PUT",
      headers: { ...apiHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    })
    if (!res.ok) throw new Error("Unauthorized")
    return res.json()
  })
