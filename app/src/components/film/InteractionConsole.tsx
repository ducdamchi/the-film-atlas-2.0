/* Libraries */
import { useEffect, useRef, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { cva } from "class-variance-authority"

/* Custom functions */
import { likeFilmFn, unlikeFilmFn, rateFilmFn } from "@/server/watched"
import { saveFilmFn, unsaveFilmFn } from "@/server/watchlisted"
import {
  watchedFilmsQueryOptions,
  watchlistedFilmsQueryOptions,
} from "@/queries/collections.queries"
import { directorsQueryOptions } from "@/queries/directors.queries"
import { useAuth } from "@/utils/authContext"
import { cn } from "@/lib/utils"

/* Icons */
import { BiListPlus, BiListCheck, BiHeart, BiSolidHeart } from "react-icons/bi"

import type { TMDBFilm, TMDBCrewMember } from "@/types/tmdb"
import type {
  StarRating,
  FilmInteractionRequest,
  FilmRateRequest,
  DirectorRef,
  UserFilm,
} from "@/types/film"

// ─── Variant system ───────────────────────────────────────────────────────────

type ConsoleVariant = "card" | "landing-sm" | "landing-lg"

export interface ConsoleConfig {
  /** CSS color value for text and inactive borders */
  text: string
  fontSize: string
  likeSize: string
  saveSize: string
  starSize: string
  gap: string
  buttonPadding: string
  paddingTB: string
  paddingLR: string
  buttonHeight: string
  /** Complete Tailwind hover:text-* class, e.g. "hover:text-hover-dark" */
  hoverTextClass: string
}

export const VARIANT_CONFIG: Record<ConsoleVariant, ConsoleConfig> = {
  card: {
    text: "var(--foreground)",
    fontSize: "13px",
    likeSize: "1.1rem",
    saveSize: "1.5rem",
    starSize: "1.3rem",
    gap: "2px",
    buttonPadding: "2px",
    paddingTB: "0",
    paddingLR: "10px",
    buttonHeight: "2rem",
    hoverTextClass: "hover:text-hover-dark",
  },
  "landing-sm": {
    text: "inherit",
    fontSize: "14px",
    likeSize: "1.1rem",
    saveSize: "1.6rem",
    starSize: "1.4rem",
    gap: "10px",
    buttonPadding: "0",
    paddingTB: "0",
    paddingLR: "10px",
    buttonHeight: "2.5rem",
    hoverTextClass: "hover:text-hover-light",
  },
  "landing-lg": {
    text: "inherit",
    fontSize: "16px",
    likeSize: "1.3rem",
    saveSize: "1.8rem",
    starSize: "1.6rem",
    gap: "15px",
    buttonPadding: "0",
    paddingTB: "10px",
    paddingLR: "15px",
    buttonHeight: "3rem",
    hoverTextClass: "hover:text-hover-light",
  },
}

const consoleVariants = cva(
  "flex flex-col z-30 items-center justify-center gap-0",
  {
    variants: {
      variant: {
        card: "",
        "landing-sm": "",
        "landing-lg": "",
      },
    },
  },
)

// ─── TripleStarRating (internal — not for direct use outside InteractionConsole) ─

interface TripleStarRatingProps {
  officialRating: StarRating | null
  setRequestedRating: React.Dispatch<React.SetStateAction<StarRating | -1>>
  showText: boolean
  config?: ConsoleConfig
  className?: string
}

export function TripleStarRating({
  officialRating,
  setRequestedRating,
  showText,
  config = VARIANT_CONFIG.card,
  className,
}: TripleStarRatingProps) {
  const [starHover, setStarHover] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  return (
    <div
      className={cn(
        "transition-all duration-200 ease-out h-full group flex items-center justify-center",
        config.hoverTextClass,
        className,
      )}
      style={{ padding: config.buttonPadding }}
      onMouseEnter={() => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
        setIsHovered(true)
      }}
      onMouseLeave={() => {
        hoverTimeoutRef.current = setTimeout(() => setIsHovered(false), 200)
      }}
    >
      <div
        className={`console-button justify-center group/rating ${(officialRating ?? 0) >= 1 ? "bg-star/15" : ""}`}
        style={{
          borderColor:
            (officialRating ?? 0) >= 1
              ? "oklch(65.6% 0.241 354.308)"
              : config.text,
          height: config.buttonHeight,
          padding: `${config.paddingTB} ${config.paddingLR}`,
        }}
      >
        <div
          className={cn(
            "flex items-center justify-center transition-all duration-200 ease-out",
            config.hoverTextClass,
          )}
          style={{ fontSize: config.starSize }}
        >
          <button
            onMouseEnter={() => setStarHover(1)}
            onMouseLeave={() => setStarHover(0)}
            onClick={() =>
              setRequestedRating(!showText && officialRating === 1 ? 0 : 1)
            }
          >
            {starHover >= 1 || (officialRating ?? 0) >= 1 ? (
              <span className="text-star">&#10048;</span>
            ) : (
              <span>&#10048;</span>
            )}
          </button>
          <button
            onMouseEnter={() => setStarHover(2)}
            onMouseLeave={() => setStarHover(0)}
            onClick={() =>
              setRequestedRating(!showText && officialRating === 2 ? 0 : 2)
            }
          >
            {starHover >= 2 || (officialRating ?? 0) >= 2 ? (
              <span className="text-star">&#10048;</span>
            ) : (
              <span>&#10048;</span>
            )}
          </button>
          <button
            onMouseEnter={() => setStarHover(3)}
            onMouseLeave={() => setStarHover(0)}
            onClick={() =>
              setRequestedRating(!showText && officialRating === 3 ? 0 : 3)
            }
          >
            {starHover === 3 || (officialRating ?? 0) >= 3 ? (
              <span className="text-star">&#10048;</span>
            ) : (
              <span>&#10048;</span>
            )}
          </button>
        </div>

        {isHovered && !showText && (officialRating ?? 0) >= 1 && (
          <div className="w-0 overflow-hidden flex transition-[width,opacity] duration-200 ease-out group-hover/rating:w-[0.75rem] flex items-center justify-center">
            <button
              onClick={() => setRequestedRating(0)}
              className="text-black hover:text-hover-dark transition-colors duration-200 flex items-center"
              style={{ fontSize: "0.5rem", lineHeight: 1 }}
            >
              ✕
            </button>
          </div>
        )}

        {showText && (
          <div className="h-full flex items-center justify-center">
            {officialRating !== 0 &&
              officialRating !== undefined &&
              officialRating !== null && (
                <button
                  onClick={() => setRequestedRating(0)}
                  className={cn(
                    "transition-all duration-200 ease-out text-star",
                    config.hoverTextClass,
                  )}
                  style={{ fontSize: config.fontSize }}
                >
                  Unrate
                </button>
              )}
            {(officialRating === 0 ||
              officialRating === undefined ||
              officialRating === null) && (
              <span
                className={cn(
                  "transition-all duration-200 ease-out",
                  config.hoverTextClass,
                )}
                style={{ color: config.text, fontSize: config.fontSize }}
              >
                Rate
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── InteractionConsole ───────────────────────────────────────────────────────

export interface InteractionConsoleProps {
  tmdbId: number | string | null | undefined
  directors: TMDBCrewMember[] | DirectorRef[]
  /** Full TMDB film detail, stored UserFilm, or empty object while loading */
  movieDetails: TMDBFilm | UserFilm | Record<string, never>
  /**
   * @param {"card"|"landing-sm"|"landing-lg"} variant
   * Controls sizing, spacing, and color tokens. All values are defined in
   * VARIANT_CONFIG inside this file — no global CSS custom properties.
   */
  variant: ConsoleVariant
  showOverview: boolean
  /** Merged onto the root wrapper div */
  className?: string
  /** Per-slot class overrides */
  classNames?: {
    root?: string
    buttonRow?: string
    watchlistButton?: string
    watchedButton?: string
    ratingButton?: string
  }
}

export default function InteractionConsole({
  tmdbId,
  directors,
  movieDetails,
  variant,
  showOverview,
  className,
  classNames,
}: InteractionConsoleProps) {
  const [requestedRating, setRequestedRating] = useState<StarRating | -1>(-1)

  const { authState } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const filmId = Number(tmdbId)
  const config = VARIANT_CONFIG[variant]

  /* Derive like/save/rating status from the shared cached lists */
  const { data: watchedList = [], isLoading: isWatchedLoading } = useQuery({
    ...watchedFilmsQueryOptions,
    enabled: !!authState.status && !!tmdbId,
  })
  const { data: watchlistedList = [], isLoading: isWatchlistedLoading } =
    useQuery({
      ...watchlistedFilmsQueryOptions,
      enabled: !!authState.status && !!tmdbId,
    })

  const isStatusLoading = isWatchedLoading || isWatchlistedLoading

  const watchedFilm = watchedList.find((f) => f.id === filmId)
  const isLiked = !!watchedFilm
  const isSaved = watchlistedList.some((f) => f.id === filmId)
  const officialRating = (watchedFilm?.stars ?? null) as StarRating | null

  /* Build the request body for API calls */
  function createReqBody(
    requestString: "like" | "save" | "rate",
  ): FilmInteractionRequest | FilmRateRequest {
    const directorsList: DirectorRef[] = directors.map((director) => ({
      tmdbId:
        "tmdbId" in director
          ? director.tmdbId
          : (director as TMDBCrewMember).id,
      name: director.name,
      profile_path: director.profile_path,
    }))
    const directorNamesForSorting = directors
      .map((director) => director.name)
      .join(", ")

    const details = movieDetails as TMDBFilm

    if (requestString === "like" || requestString === "save") {
      const req: FilmInteractionRequest = {
        tmdbId: details.id,
        title: details.title,
        runtime: details.runtime,
        poster_path: details.poster_path,
        backdrop_path: details.backdrop_path,
        origin_country: details.origin_country,
        release_date: details.release_date,
        directors: directorsList,
        directorNamesForSorting,
        genres: details.genres ?? null,
        overview: details.overview ?? null,
        original_title: details.original_title ?? null,
        spoken_languages: details.spoken_languages ?? null,
        imdb_id: details.imdb_id ?? null,
      }
      return req
    } else {
      const req: FilmRateRequest = {
        tmdbId: details.id,
        directors: directorsList,
        stars: requestedRating as StarRating,
      }
      return req
    }
  }

  function buildOptimisticFilm(stars: StarRating | 0): UserFilm {
    const details = movieDetails as TMDBFilm
    return {
      id: filmId,
      title: details.title,
      runtime: details.runtime,
      directors: directors.map((d) => ({
        tmdbId: "tmdbId" in d ? d.tmdbId : (d as TMDBCrewMember).id,
        name: d.name,
        profile_path: d.profile_path,
      })),
      directorNamesForSorting: directors.map((d) => d.name).join(", "),
      poster_path: details.poster_path,
      backdrop_path: details.backdrop_path,
      origin_country: details.origin_country,
      release_date: details.release_date,
      added_date: new Date().toISOString(),
      stars,
      overview: details.overview ?? null,
      original_title: details.original_title ?? null,
      spoken_languages: details.spoken_languages ?? null,
      imdb_id: details.imdb_id ?? null,
    }
  }

  /* Watch mutation — optimistic: adds/removes from the watched list cache */
  const watchMutation = useMutation({
    mutationFn: (shouldLike: boolean) => {
      if (shouldLike) {
        const req = createReqBody("like") as FilmInteractionRequest
        req.stars = requestedRating !== -1 ? (requestedRating as StarRating) : 0
        return likeFilmFn({ data: req })
      }
      return unlikeFilmFn({ data: (movieDetails as TMDBFilm).id })
    },
    onMutate: async (shouldLike) => {
      await queryClient.cancelQueries({
        queryKey: watchedFilmsQueryOptions.queryKey,
      })
      await queryClient.cancelQueries({
        queryKey: watchlistedFilmsQueryOptions.queryKey,
      })
      const previousWatched = queryClient.getQueryData<UserFilm[]>(
        watchedFilmsQueryOptions.queryKey,
      )
      const previousWatchlisted = queryClient.getQueryData<UserFilm[]>(
        watchlistedFilmsQueryOptions.queryKey,
      )

      if (shouldLike) {
        const stars =
          requestedRating !== -1 ? (requestedRating as StarRating) : 0
        queryClient.setQueryData<UserFilm[]>(
          watchedFilmsQueryOptions.queryKey,
          (old = []) =>
            old.some((f) => f.id === filmId)
              ? old
              : [buildOptimisticFilm(stars), ...old],
        )
        // Liking is mutually exclusive with saved
        queryClient.setQueryData<UserFilm[]>(
          watchlistedFilmsQueryOptions.queryKey,
          (old = []) => old.filter((f) => f.id !== filmId),
        )
      } else {
        queryClient.setQueryData<UserFilm[]>(
          watchedFilmsQueryOptions.queryKey,
          (old = []) => old.filter((f) => f.id !== filmId),
        )
      }

      return { previousWatched, previousWatchlisted }
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(
        watchedFilmsQueryOptions.queryKey,
        context?.previousWatched,
      )
      queryClient.setQueryData(
        watchlistedFilmsQueryOptions.queryKey,
        context?.previousWatchlisted,
      )
      toast.error("Failed to update watch status")
    },
    onSuccess: (_data, shouldLike) => {
      const title = (movieDetails as TMDBFilm).title
      toast.success(
        shouldLike
          ? `Added "${title}" to Watched`
          : `Removed "${title}" from Watched`,
      )
      setRequestedRating(-1)
      queryClient.invalidateQueries({
        queryKey: watchedFilmsQueryOptions.queryKey,
      })
      queryClient.invalidateQueries({
        queryKey: watchlistedFilmsQueryOptions.queryKey,
      })
      queryClient.invalidateQueries({
        queryKey: directorsQueryOptions.queryKey,
      })
    },
  })

  /* Watchlist mutation — optimistic, also clears liked state when saving */
  const watchlistMutation = useMutation({
    mutationFn: (shouldSave: boolean) =>
      shouldSave
        ? saveFilmFn({ data: createReqBody("save") as FilmInteractionRequest })
        : unsaveFilmFn({ data: (movieDetails as TMDBFilm).id }),
    onMutate: async (shouldSave) => {
      await queryClient.cancelQueries({
        queryKey: watchlistedFilmsQueryOptions.queryKey,
      })
      await queryClient.cancelQueries({
        queryKey: watchedFilmsQueryOptions.queryKey,
      })
      const previousWatchlisted = queryClient.getQueryData<UserFilm[]>(
        watchlistedFilmsQueryOptions.queryKey,
      )
      const previousWatched = queryClient.getQueryData<UserFilm[]>(
        watchedFilmsQueryOptions.queryKey,
      )

      if (shouldSave) {
        queryClient.setQueryData<UserFilm[]>(
          watchlistedFilmsQueryOptions.queryKey,
          (old = []) =>
            old.some((f) => f.id === filmId)
              ? old
              : [buildOptimisticFilm(0), ...old],
        )
        // Saving is mutually exclusive with liked
        queryClient.setQueryData<UserFilm[]>(
          watchedFilmsQueryOptions.queryKey,
          (old = []) => old.filter((f) => f.id !== filmId),
        )
      } else {
        queryClient.setQueryData<UserFilm[]>(
          watchlistedFilmsQueryOptions.queryKey,
          (old = []) => old.filter((f) => f.id !== filmId),
        )
      }

      return { previousWatchlisted, previousWatched }
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(
        watchlistedFilmsQueryOptions.queryKey,
        context?.previousWatchlisted,
      )
      queryClient.setQueryData(
        watchedFilmsQueryOptions.queryKey,
        context?.previousWatched,
      )
      toast.error("Failed to update watchlist")
    },
    onSuccess: (_data, shouldSave) => {
      const title = (movieDetails as TMDBFilm).title
      toast.success(
        shouldSave
          ? `Added "${title}" to Watchlist`
          : `Removed "${title}" from Watchlist`,
      )
      queryClient.invalidateQueries({
        queryKey: watchlistedFilmsQueryOptions.queryKey,
      })
      queryClient.invalidateQueries({
        queryKey: watchedFilmsQueryOptions.queryKey,
      })
    },
  })

  /* Rate mutation — optimistic: updates stars on the film in the watched list */
  const rateMutation = useMutation({
    mutationFn: (req: FilmRateRequest) => rateFilmFn({ data: req }),
    onMutate: async (req) => {
      await queryClient.cancelQueries({
        queryKey: watchedFilmsQueryOptions.queryKey,
      })
      const previousWatched = queryClient.getQueryData<UserFilm[]>(
        watchedFilmsQueryOptions.queryKey,
      )
      queryClient.setQueryData<UserFilm[]>(
        watchedFilmsQueryOptions.queryKey,
        (old = []) =>
          old.map((f) => (f.id === filmId ? { ...f, stars: req.stars } : f)),
      )
      return { previousWatched }
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(
        watchedFilmsQueryOptions.queryKey,
        context?.previousWatched,
      )
      toast.error("Failed to update rating")
    },
    onSuccess: (_data, req) => {
      const title = (movieDetails as TMDBFilm).title
      toast.success(
        req.stars === 0
          ? `Cleared rating for "${title}"`
          : `Set "${title}" rating to ${req.stars} stars`,
      )
      setRequestedRating(-1)
      queryClient.invalidateQueries({
        queryKey: watchedFilmsQueryOptions.queryKey,
      })
      queryClient.invalidateQueries({
        queryKey: directorsQueryOptions.queryKey,
      })
    },
  })

  /* Handlers */
  function handleLike() {
    if (!authState.status) {
      alert("Log in to interact with films!")
      return
    }
    watchMutation.mutate(!isLiked)
  }

  function handleSave() {
    if (!authState.status) {
      alert("Log in to interact with films!")
      return
    }
    watchlistMutation.mutate(!isSaved)
  }

  /* Rate trigger — fires when TripleStarRating changes requestedRating */
  useEffect(() => {
    if (requestedRating === -1 || requestedRating === officialRating) return
    if (!authState.status) {
      alert("Log in to interact with films!")
      return
    }

    if (!isLiked) {
      // Rating a film that isn't liked yet → like it with the rating
      watchMutation.mutate(true)
    } else {
      const req = createReqBody("rate") as FilmRateRequest
      req.stars = requestedRating as StarRating
      rateMutation.mutate(req)
    }
  }, [requestedRating])

  const details = movieDetails as TMDBFilm
  const showText = variant !== "card"

  return (
    <>
      {!isStatusLoading && (
        <div
          className={cn(consoleVariants({ variant }), classNames?.root, className)}
          style={{ color: config.text }}
        >
          {showOverview && (
            <div
              className="text-white w-[85%] pr-4 pl-4 pb-2 mb-5"
              onClick={() => {
                navigate({ to: `/films/${details.id}` })
              }}
            >
              <span className="text-[9.5px]/1">
                {details.overview?.slice(0, 180)}
              </span>
              {details.overview?.length >= 181 && <span>{`...`}</span>}
            </div>
          )}

          <div
            className={cn(
              "flex justify-center items-end w-full",
              classNames?.buttonRow,
            )}
            style={{ gap: config.gap, height: "auto" }}
          >
            {/* Watchlist button */}
            <button
              aria-label="Add to watchlist"
              title="Add to watchlist"
              className={cn(
                "transition-all duration-200 ease-out h-full flex items-center",
                config.hoverTextClass,
                classNames?.watchlistButton,
              )}
              style={{ padding: config.buttonPadding }}
              onClick={handleSave}
            >
              {isSaved ? (
                <div
                  className="console-button"
                  style={{
                    backgroundColor: "var(--color-saved)",
                    borderColor: "var(--color-saved)",
                    padding: showText
                      ? `${config.paddingTB} ${config.paddingLR}`
                      : undefined,
                    height: config.buttonHeight,
                    width: showText ? undefined : config.buttonHeight,
                    ...(showText ? {} : { aspectRatio: "1", justifyContent: "center", borderRadius: "9999px" }),
                  }}
                >
                  <BiListCheck
                    style={{
                      color: "white",
                      fontSize: showText ? config.saveSize : config.likeSize,
                    }}
                  />
                  {showText && (
                    <span style={{ color: "white", fontSize: config.fontSize }}>
                      Watchlist
                    </span>
                  )}
                </div>
              ) : (
                <div
                  className="console-button"
                  style={{
                    padding: showText
                      ? `${config.paddingTB} ${config.paddingLR}`
                      : undefined,
                    height: config.buttonHeight,
                    width: showText ? undefined : config.buttonHeight,
                    ...(showText ? {} : { aspectRatio: "1", justifyContent: "center", borderRadius: "9999px" }),
                  }}
                >
                  <BiListPlus
                    style={{
                      fontSize: showText ? config.saveSize : config.likeSize,
                    }}
                  />
                  {showText && (
                    <span style={{ fontSize: config.fontSize }}>Watchlist</span>
                  )}
                </div>
              )}
            </button>

            {/* Watched button */}
            <button
              aria-label="Add to watched"
              title="Add to watched"
              className={cn(
                "transition-all duration-200 ease-out h-full flex items-center",
                config.hoverTextClass,
                classNames?.watchedButton,
              )}
              style={{ padding: config.buttonPadding }}
              onClick={handleLike}
            >
              {isLiked ? (
                <div
                  className="console-button"
                  style={{
                    backgroundColor: "var(--color-liked)",
                    borderColor: "var(--color-liked)",
                    padding: showText
                      ? `${config.paddingTB} ${config.paddingLR}`
                      : undefined,
                    height: config.buttonHeight,
                    width: showText ? undefined : config.buttonHeight,
                    ...(showText ? {} : { aspectRatio: "1", justifyContent: "center", borderRadius: "9999px" }),
                  }}
                >
                  <BiSolidHeart
                    style={{ color: "white", fontSize: config.likeSize }}
                  />
                  {showText && (
                    <span style={{ color: "white", fontSize: config.fontSize }}>
                      Watched
                    </span>
                  )}
                </div>
              ) : (
                <div
                  className="console-button"
                  style={{
                    padding: showText
                      ? `${config.paddingTB} ${config.paddingLR}`
                      : undefined,
                    height: config.buttonHeight,
                    width: showText ? undefined : config.buttonHeight,
                    ...(showText ? {} : { aspectRatio: "1", justifyContent: "center", borderRadius: "9999px" }),
                  }}
                >
                  <BiHeart style={{ fontSize: config.likeSize }} />
                  {showText && (
                    <span style={{ fontSize: config.fontSize }}>Watched</span>
                  )}
                </div>
              )}
            </button>

            <TripleStarRating
              officialRating={officialRating}
              setRequestedRating={setRequestedRating}
              showText={showText}
              config={config}
              className={classNames?.ratingButton}
            />
          </div>
        </div>
      )}
    </>
  )
}
