/* Libraries */
import { useEffect, useState } from "react"
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

// Root console container
const consoleVariants = cva(
  "flex flex-col z-30 items-center justify-center gap-0",
  {
    variants: {
      variant: {
        card: "text-foreground",
        "landing-sm": "",
        "landing-lg": "",
      },
    },
    defaultVariants: { variant: "card" },
  },
)

// Flex row holding the three pill buttons
const rowVariants = cva("flex justify-center items-end w-full", {
  variants: {
    variant: {
      card: "gap-[2px]",
      "landing-sm": "gap-2.5",
      "landing-lg": "gap-[15px]",
    },
  },
  defaultVariants: { variant: "card" },
})

// Outer button/div wrapper — hover color + padding
const buttonWrapperVariants = cva(
  "transition-all duration-200 ease-out h-full flex items-center",
  {
    variants: {
      variant: {
        card: "p-0.5 ",
        "landing-sm": "",
        "landing-lg": "",
      },
    },
    defaultVariants: { variant: "card" },
  },
)

// The rounded pill container
const pillVariants = cva(
  "flex items-center gap-1 border rounded-full backdrop-blur-2xl",
  {
    variants: {
      state: {
        default: "border-current",
        watched: "bg-liked border-liked text-white",
        saved: "bg-saved border-saved text-white",
        rated: "bg-star/15 border-star",
      },
      size: {
        card: "h-8 w-8 justify-center",
        "card-wide": "h-8 px-2.5",
        "landing-sm": "h-10 px-2.5",
        "landing-lg": "h-12 py-2.5 px-[15px]",
      },
    },
    defaultVariants: { state: "default", size: "card" },
  },
)

// Icon font sizes — compound: variant × icon type
// Note: in card (icon-only) mode, save icons use the same size as like icons.
const iconVariants = cva("", {
  variants: {
    variant: { card: "", "landing-sm": "", "landing-lg": "" },
    type: { like: "", save: "", star: "" },
  },
  compoundVariants: [
    { variant: "card", type: "like", class: "text-[1.1rem]" },
    { variant: "landing-sm", type: "like", class: "text-[1.1rem]" },
    { variant: "landing-lg", type: "like", class: "text-[1.3rem]" },
    { variant: "card", type: "save", class: "text-[1.1rem]" },
    { variant: "landing-sm", type: "save", class: "text-[1.6rem]" },
    { variant: "landing-lg", type: "save", class: "text-[1.8rem]" },
    { variant: "card", type: "star", class: "text-[1.3rem]" },
    { variant: "landing-sm", type: "star", class: "text-[1.4rem]" },
    { variant: "landing-lg", type: "star", class: "text-[1.6rem]" },
  ],
  defaultVariants: { variant: "card", type: "like" },
})

// Label text next to icons — only rendered when variant !== "card"
const labelVariants = cva("", {
  variants: {
    variant: {
      card: "",
      "landing-sm": "text-[14px]",
      "landing-lg": "text-base",
    },
  },
  defaultVariants: { variant: "card" },
})

// ─── TripleStarRating ─────────────────────────────────────────────────────────

interface TripleStarRatingProps {
  officialRating: StarRating | null
  setRequestedRating: React.Dispatch<React.SetStateAction<StarRating | -1>>
  variant: ConsoleVariant
  className?: string
}

export function TripleStarRating({
  officialRating,
  setRequestedRating,
  variant,
  className,
}: TripleStarRatingProps) {
  const [starHover, setStarHover] = useState(0)

  const hasRating = (officialRating ?? 0) >= 1
  const showText = variant !== "card"

  return (
    <div
      className={cn(
        buttonWrapperVariants({ variant }),
        "justify-center group",
        className,
      )}>
      <div
        className={cn(
          pillVariants({
            state: hasRating ? "rated" : "default",
            size: variant === "card" ? "card-wide" : variant,
          }),
          "group/rating gap-0 hover:bg-star/10 hover:border-star transition-color ease-out duration-200",
        )}>
        {/* Left spacer — balances the × button gap so stars stay centered */}
        {/* {!showText && hasRating && <div className="w-0" />} */}

        {/* Star buttons */}
        <div
          className={cn(
            "flex items-center justify-center",
            iconVariants({ variant, type: "star" }),
          )}>
          {([1, 2, 3] as StarRating[]).map((n) => (
            <button
              key={n}
              onMouseEnter={() => setStarHover(n)}
              onMouseLeave={() => setStarHover(0)}
              onClick={() =>
                setRequestedRating(!showText && officialRating === n ? 0 : n)
              }>
              {starHover >= n || (officialRating ?? 0) >= n ? (
                <span className="text-star">&#10048;</span>
              ) : (
                <span>&#10048;</span>
              )}
            </button>
          ))}
        </div>

        {/* × clear button — card mode only, visible on hover when rated */}
        {!showText && hasRating && (
          <div className="w-0 pl-0 overflow-hidden flex transition-[width] duration-200 ease-out group-hover/rating:w-[0.75rem] group-hover/rating:pl-1 items-center justify-center">
            <button
              onClick={() => setRequestedRating(0)}
              className="text-black hover:text-hover-dark transition-colors duration-200 flex items-center text-[0.5rem] leading-none">
              ✕
            </button>
          </div>
        )}

        {/* Rate / Unrate text — landing modes only */}
        {showText && (
          <div className="h-full flex items-center justify-center ml-1.5">
            {hasRating ? (
              <button
                onClick={() => setRequestedRating(0)}
                className={cn(
                  "transition-all duration-200 ease-out text-star",
                  labelVariants({ variant }),
                )}>
                Unrate
              </button>
            ) : (
              <span
                className={cn(
                  "transition-all duration-200 ease-out",
                  labelVariants({ variant }),
                )}>
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
   * Controls sizing, spacing, and color tokens. All values are defined via
   * CVA variants inside this file — no global CSS custom properties.
   */
  variant: ConsoleVariant
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
  className,
  classNames,
}: InteractionConsoleProps) {
  const [requestedRating, setRequestedRating] = useState<StarRating | -1>(-1)

  const { authState } = useAuth()
  const queryClient = useQueryClient()

  const filmId = Number(tmdbId)
  const showText = variant !== "card"

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

const watchedFilm = watchedList.find((f) => f.id === filmId)
  const isLiked = !!watchedFilm
  const isSaved = watchlistedList.some((f) => f.id === filmId)
  const officialRating = (watchedFilm?.stars ?? null) as StarRating | null

  /**************** HELPER FUNCTIONS ****************/
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

  /**************** MUTATIONS (with optimistic updates) ****************/
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

  /**************** HANDLERS (for like, save, rate) ****************/
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
  // Handler for rating adjustment
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

  return (
    <>
      <div
          className={cn(
            consoleVariants({ variant }),
            classNames?.root,
            className,
          )}>
          <div className={cn(rowVariants({ variant }), classNames?.buttonRow)}>
            {/* Watchlist button */}
            <button
              aria-label="Add to watchlist"
              title="Add to watchlist"
              className={cn(
                buttonWrapperVariants({ variant }),
                classNames?.watchlistButton,
              )}
              onClick={handleSave}>
              <div
                className={cn(
                  pillVariants({
                    state: isSaved ? "saved" : "default",
                    size: variant,
                  }),
                  "hover:bg-saved/10 hover:text-saved transition-color ease-out duration-200",
                )}>
                {isSaved ? (
                  <BiListCheck
                    className={iconVariants({ variant, type: "save" })}
                  />
                ) : (
                  <BiListPlus
                    className={iconVariants({ variant, type: "save" })}
                  />
                )}
                {showText && (
                  <span className={labelVariants({ variant })}>Watchlist</span>
                )}
              </div>
            </button>

            {/* Watched button */}
            <button
              aria-label="Add to watched"
              title="Add to watched"
              className={cn(
                buttonWrapperVariants({ variant }),
                classNames?.watchedButton,
              )}
              onClick={handleLike}>
              <div
                className={cn(
                  pillVariants({
                    state: isLiked ? "watched" : "default",
                    size: variant,
                  }),
                  "hover:bg-liked/10 hover:text-liked  transition-color ease-out duration-200",
                )}>
                {isLiked ? (
                  <BiSolidHeart
                    className={iconVariants({ variant, type: "like" })}
                  />
                ) : (
                  <BiHeart
                    className={iconVariants({ variant, type: "like" })}
                  />
                )}
                {showText && (
                  <span className={labelVariants({ variant })}>Watched</span>
                )}
              </div>
            </button>

            <TripleStarRating
              officialRating={officialRating}
              setRequestedRating={setRequestedRating}
              variant={variant}
              className={classNames?.ratingButton}
            />
          </div>
        </div>
    </>
  )
}
