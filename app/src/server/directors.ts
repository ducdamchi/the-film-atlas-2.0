// Server functions for /profile/me/directors — run on the TanStack Start app server.
// See watched.ts for architecture notes.
import { createServerFn } from "@tanstack/react-start"
import { apiHeaders } from "./utils"
import type { Director, DirectorStatus } from "@/types/film"

const API_URL = process.env.API_URL ?? "http://localhost:3002"

export const fetchDirectorsFn = createServerFn({ method: "GET" })
  .handler(async (): Promise<Director[]> => {
    const res = await fetch(`${API_URL}/profile/me/directors`, {
      headers: apiHeaders(),
    })
    if (!res.ok) throw new Error("Unauthorized")
    return res.json()
  })

export const checkDirectorStatusFn = createServerFn({ method: "GET" })
  .inputValidator((tmdbId: number | string) => tmdbId)
  .handler(async ({ data: tmdbId }): Promise<DirectorStatus> => {
    const res = await fetch(`${API_URL}/profile/me/directors/${tmdbId}`, {
      headers: apiHeaders(),
    })
    if (!res.ok) throw new Error("Unauthorized")
    return res.json()
  })
