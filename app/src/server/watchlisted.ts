// Server functions for /profile/me/watchlisted — run on the TanStack Start app server.
// See watched.ts for architecture notes.
import { createServerFn } from "@tanstack/react-start"
import { apiHeaders } from "./utils"
import type { UserFilm, FilmInteractionRequest } from "@/types/film"
import type { SaveStatusResponse } from "@/types/api"

const API_URL = process.env.API_URL ?? "http://localhost:3002"

export const fetchWatchlistedFn = createServerFn({ method: "GET" })
  .handler(async (): Promise<UserFilm[]> => {
    const res = await fetch(`${API_URL}/profile/me/watchlisted`, {
      headers: apiHeaders(),
    })
    if (!res.ok) throw new Error("Unauthorized")
    return res.json()
  })

export const checkSaveStatusFn = createServerFn({ method: "GET" })
  .inputValidator((tmdbId: number | string) => tmdbId)
  .handler(async ({ data: tmdbId }): Promise<SaveStatusResponse> => {
    const res = await fetch(`${API_URL}/profile/me/watchlisted/${tmdbId}`, {
      headers: apiHeaders(),
    })
    if (!res.ok) throw new Error("Unauthorized")
    return res.json()
  })

export const saveFilmFn = createServerFn({ method: "POST" })
  .inputValidator((req: FilmInteractionRequest) => req)
  .handler(async ({ data }): Promise<SaveStatusResponse> => {
    const res = await fetch(`${API_URL}/profile/me/watchlisted`, {
      method: "POST",
      headers: { ...apiHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error("Unauthorized")
    return res.json()
  })

export const unsaveFilmFn = createServerFn({ method: "POST" })
  .inputValidator((tmdbId: number | string) => tmdbId)
  .handler(async ({ data: tmdbId }): Promise<SaveStatusResponse> => {
    const res = await fetch(`${API_URL}/profile/me/watchlisted`, {
      method: "DELETE",
      headers: { ...apiHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ tmdbId }),
    })
    if (!res.ok) throw new Error("Unauthorized")
    return res.json()
  })
