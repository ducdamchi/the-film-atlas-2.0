// Server functions for /profile/me/watched — run on the TanStack Start app server,
// never in the browser. Flow: Browser → app server (createServerFn) → Express API.
// The session cookie is forwarded via apiHeaders() so Express's AuthMiddleware can
// validate the request without any Express-side changes (fromNodeHeaders handles cookies).
import { createServerFn } from "@tanstack/react-start";
import { apiHeaders } from "./utils";
import type {
  UserFilm,
  FilmInteractionRequest,
  FilmRateRequest,
} from "@/types/film";
import type {
  LikeStatusResponse,
  LikeFilmResponse,
  RateFilmResponse,
} from "@/types/api";

// Still needs to be wrapped in createServerFn() to be protected from client
const API_URL = process.env.API_URL ?? "http://localhost:3002";

export const fetchWatchedFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<UserFilm[]> => {
    const res = await fetch(`${API_URL}/profile/me/watched`, {
      headers: apiHeaders(),
    });
    if (!res.ok) throw new Error("Unauthorized");
    return res.json();
  },
);

export const checkLikeStatusFn = createServerFn({ method: "GET" })
  .inputValidator((tmdbId: number | string) => tmdbId)
  .handler(async ({ data: tmdbId }): Promise<LikeStatusResponse> => {
    const res = await fetch(`${API_URL}/profile/me/watched/${tmdbId}`, {
      headers: apiHeaders(),
    });
    if (!res.ok) throw new Error("Unauthorized");
    return res.json();
  });

export const likeFilmFn = createServerFn({ method: "POST" })
  .inputValidator((req: FilmInteractionRequest) => req)
  .handler(async ({ data }): Promise<LikeFilmResponse> => {
    const res = await fetch(`${API_URL}/profile/me/watched`, {
      method: "POST",
      headers: { ...apiHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Unauthorized");
    return res.json();
  });

// DELETE uses method "POST" in createServerFn because TanStack Start server functions
// only support GET and POST as the RPC transport method. The actual HTTP DELETE is sent
// from the handler to Express.
export const unlikeFilmFn = createServerFn({ method: "POST" })
  .inputValidator((tmdbId: number | string) => tmdbId)
  .handler(async ({ data: tmdbId }): Promise<LikeStatusResponse> => {
    const res = await fetch(`${API_URL}/profile/me/watched`, {
      method: "DELETE",
      headers: { ...apiHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ tmdbId }),
    });
    if (!res.ok) throw new Error("Unauthorized");
    return res.json();
  });

export const rateFilmFn = createServerFn({ method: "POST" })
  .inputValidator((req: FilmRateRequest) => req)
  .handler(async ({ data }): Promise<RateFilmResponse> => {
    const res = await fetch(`${API_URL}/profile/me/watched`, {
      method: "PUT",
      headers: { ...apiHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Unauthorized");
    return res.json();
  });
