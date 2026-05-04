/* Libraries */
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/* Custom functions */
import {
  likeFilm,
  unlikeFilm,
  saveFilm,
  unsaveFilm,
  rateFilm,
} from "@/utils/apiCalls";
import {
  watchedFilmsQueryOptions,
  watchlistedFilmsQueryOptions,
} from "@/queries/collections.queries";
import { useAuth } from "@/utils/authContext";

import TripleStarRating from "./TripleStarRating";

/* Icons */
import { BiListPlus, BiListCheck, BiHeart, BiSolidHeart } from "react-icons/bi";

import type { TMDBFilm, TMDBCrewMember } from "@/types/tmdb";
import type {
  StarRating,
  FilmInteractionRequest,
  FilmRateRequest,
  DirectorRef,
  UserFilm,
} from "@/types/film";

/**
 * The variants that drive CSS custom property styling via .console-{variant}.
 * Adding the union here means passing an invalid string like "hover" is a compile error.
 */
type ConsoleVariant = "card" | "landing-sm" | "landing-lg";

export interface InteractionConsoleProps {
  tmdbId: number | string | null | undefined;
  directors: TMDBCrewMember[] | DirectorRef[];
  /** Full TMDB film detail, stored UserFilm, or empty object while loading */
  movieDetails: TMDBFilm | UserFilm | Record<string, never>;
  /**
   * @param {"card"|"landing-sm"|"landing-lg"} variant
   * Styling is driven by CSS custom properties set on .console-{variant} in styles.css
   */
  variant: ConsoleVariant;
  showOverview: boolean;
}

export default function InteractionConsole({
  tmdbId,
  directors,
  movieDetails,
  variant,
  showOverview,
}: InteractionConsoleProps) {
  const [requestedRating, setRequestedRating] = useState<StarRating | -1>(-1);

  const { authState } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const filmId = Number(tmdbId);

  /* Derive like/save/rating status from the shared cached lists */
  const { data: watchedList = [], isLoading: isWatchedLoading } = useQuery({
    ...watchedFilmsQueryOptions,
    enabled: !!authState.status && !!tmdbId,
  });
  const { data: watchlistedList = [], isLoading: isWatchlistedLoading } = useQuery({
    ...watchlistedFilmsQueryOptions,
    enabled: !!authState.status && !!tmdbId,
  });

  const isStatusLoading = isWatchedLoading || isWatchlistedLoading;

  const watchedFilm = watchedList.find((f) => f.id === filmId);
  const isLiked = !!watchedFilm;
  const isSaved = watchlistedList.some((f) => f.id === filmId);
  const officialRating = (watchedFilm?.stars ?? null) as StarRating | null;

  /* Build the request body for API calls */
  function createReqBody(
    requestString: "like" | "save" | "rate",
  ): FilmInteractionRequest | FilmRateRequest {
    const directorsList: DirectorRef[] = directors.map((director) => ({
      tmdbId: "tmdbId" in director ? director.tmdbId : (director as TMDBCrewMember).id,
      name: director.name,
      profile_path: director.profile_path,
    }));
    const directorNamesForSorting = directors
      .map((director) => director.name)
      .join(", ");

    const details = movieDetails as TMDBFilm;

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
      };
      return req;
    } else {
      const req: FilmRateRequest = {
        tmdbId: details.id,
        directors: directorsList,
        stars: requestedRating as StarRating,
      };
      return req;
    }
  }

  function buildOptimisticFilm(stars: StarRating | 0): UserFilm {
    const details = movieDetails as TMDBFilm;
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
    };
  }

  /* Watch mutation — optimistic: adds/removes from the watched list cache */
  const watchMutation = useMutation({
    mutationFn: (shouldLike: boolean) => {
      if (shouldLike) {
        const req = createReqBody("like") as FilmInteractionRequest;
        req.stars =
          requestedRating !== -1 ? (requestedRating as StarRating) : 0;
        return likeFilm(req);
      }
      return unlikeFilm((movieDetails as TMDBFilm).id);
    },
    onMutate: async (shouldLike) => {
      await queryClient.cancelQueries({ queryKey: watchedFilmsQueryOptions.queryKey });
      await queryClient.cancelQueries({ queryKey: watchlistedFilmsQueryOptions.queryKey });
      const previousWatched = queryClient.getQueryData<UserFilm[]>(watchedFilmsQueryOptions.queryKey);
      const previousWatchlisted = queryClient.getQueryData<UserFilm[]>(watchlistedFilmsQueryOptions.queryKey);

      if (shouldLike) {
        const stars = requestedRating !== -1 ? (requestedRating as StarRating) : 0;
        queryClient.setQueryData<UserFilm[]>(watchedFilmsQueryOptions.queryKey, (old = []) =>
          old.some((f) => f.id === filmId) ? old : [buildOptimisticFilm(stars), ...old],
        );
        // Liking is mutually exclusive with saved
        queryClient.setQueryData<UserFilm[]>(watchlistedFilmsQueryOptions.queryKey, (old = []) =>
          old.filter((f) => f.id !== filmId),
        );
      } else {
        queryClient.setQueryData<UserFilm[]>(watchedFilmsQueryOptions.queryKey, (old = []) =>
          old.filter((f) => f.id !== filmId),
        );
      }

      return { previousWatched, previousWatchlisted };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(watchedFilmsQueryOptions.queryKey, context?.previousWatched);
      queryClient.setQueryData(watchlistedFilmsQueryOptions.queryKey, context?.previousWatchlisted);
      toast.error("Failed to update watch status");
    },
    onSuccess: () => {
      setRequestedRating(-1);
      queryClient.invalidateQueries({ queryKey: watchedFilmsQueryOptions.queryKey });
      queryClient.invalidateQueries({ queryKey: watchlistedFilmsQueryOptions.queryKey });
    },
  });

  /* Watchlist mutation — optimistic, also clears liked state when saving */
  const watchlistMutation = useMutation({
    mutationFn: (shouldSave: boolean) =>
      shouldSave
        ? saveFilm(createReqBody("save") as FilmInteractionRequest)
        : unsaveFilm((movieDetails as TMDBFilm).id),
    onMutate: async (shouldSave) => {
      await queryClient.cancelQueries({ queryKey: watchlistedFilmsQueryOptions.queryKey });
      await queryClient.cancelQueries({ queryKey: watchedFilmsQueryOptions.queryKey });
      const previousWatchlisted = queryClient.getQueryData<UserFilm[]>(watchlistedFilmsQueryOptions.queryKey);
      const previousWatched = queryClient.getQueryData<UserFilm[]>(watchedFilmsQueryOptions.queryKey);

      if (shouldSave) {
        queryClient.setQueryData<UserFilm[]>(watchlistedFilmsQueryOptions.queryKey, (old = []) =>
          old.some((f) => f.id === filmId) ? old : [buildOptimisticFilm(0), ...old],
        );
        // Saving is mutually exclusive with liked
        queryClient.setQueryData<UserFilm[]>(watchedFilmsQueryOptions.queryKey, (old = []) =>
          old.filter((f) => f.id !== filmId),
        );
      } else {
        queryClient.setQueryData<UserFilm[]>(watchlistedFilmsQueryOptions.queryKey, (old = []) =>
          old.filter((f) => f.id !== filmId),
        );
      }

      return { previousWatchlisted, previousWatched };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(watchlistedFilmsQueryOptions.queryKey, context?.previousWatchlisted);
      queryClient.setQueryData(watchedFilmsQueryOptions.queryKey, context?.previousWatched);
      toast.error("Failed to update watchlist");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: watchlistedFilmsQueryOptions.queryKey });
      queryClient.invalidateQueries({ queryKey: watchedFilmsQueryOptions.queryKey });
    },
  });

  /* Rate mutation — optimistic: updates stars on the film in the watched list */
  const rateMutation = useMutation({
    mutationFn: (req: FilmRateRequest) => rateFilm(req),
    onMutate: async (req) => {
      await queryClient.cancelQueries({ queryKey: watchedFilmsQueryOptions.queryKey });
      const previousWatched = queryClient.getQueryData<UserFilm[]>(watchedFilmsQueryOptions.queryKey);
      queryClient.setQueryData<UserFilm[]>(watchedFilmsQueryOptions.queryKey, (old = []) =>
        old.map((f) => (f.id === filmId ? { ...f, stars: req.stars } : f)),
      );
      return { previousWatched };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(watchedFilmsQueryOptions.queryKey, context?.previousWatched);
      toast.error("Failed to update rating");
    },
    onSuccess: () => {
      setRequestedRating(-1);
      queryClient.invalidateQueries({ queryKey: watchedFilmsQueryOptions.queryKey });
    },
  });

  /* Handlers */
  function handleLike() {
    if (!authState.status) {
      alert("Log in to interact with films!");
      return;
    }
    watchMutation.mutate(!isLiked);
  }

  function handleSave() {
    if (!authState.status) {
      alert("Log in to interact with films!");
      return;
    }
    watchlistMutation.mutate(!isSaved);
  }

  /* Rate trigger — fires when TripleStarRating changes requestedRating */
  useEffect(() => {
    if (requestedRating === -1 || requestedRating === officialRating) return;
    if (!authState.status) {
      alert("Log in to interact with films!");
      return;
    }

    if (!isLiked) {
      // Rating a film that isn't liked yet → like it with the rating
      watchMutation.mutate(true);
    } else {
      const req = createReqBody("rate") as FilmRateRequest;
      req.stars = requestedRating as StarRating;
      rateMutation.mutate(req);
    }
  }, [requestedRating]);

  const details = movieDetails as TMDBFilm;
  const showText = variant !== "card";

  return (
    <>
      {!isStatusLoading && (
        <div
          className={`console-${variant} flex flex-col z-30 items-center justify-center gap-0`}
          style={{ color: "var(--console-text)" }}
        >
          {showOverview && (
            <div
              className="text-white w-[85%] pr-4 pl-4 pb-2 mb-5"
              onClick={() => {
                navigate({ to: `/films/${details.id}` });
              }}
            >
              <span className="text-[9.5px]/1">
                {details.overview?.slice(0, 180)}
              </span>
              {details.overview?.length >= 181 && <span>{`...`}</span>}
            </div>
          )}

          <div
            className="flex justify-center items-end w-full"
            style={{
              gap: "var(--console-gap)",
              height: "var(--console-height)",
            }}
          >
            {/* Watchlist button */}
            <button
              aria-label="Add to watchlist"
              title="Add to watchlist"
              className="hover:text-[var(--console-hover-text)] transition-all duration-200 ease-out hover:bg-[var(--console-hover-bg)] h-full flex items-center"
              style={{ padding: "var(--console-button-padding)" }}
              onClick={handleSave}
            >
              {isSaved ? (
                <div
                  className={
                    showText
                      ? "console-button"
                      : "console-button aspect-square rounded-full justify-center"
                  }
                  style={{
                    backgroundColor: "var(--color-saved)",
                    borderColor: "var(--color-saved)",
                    padding: showText
                      ? "var(--console-padding-tb) var(--console-padding-lr)"
                      : undefined,
                    height: "var(--console-button-height)",
                    width: showText
                      ? undefined
                      : "var(--console-button-height)",
                  }}
                >
                  <BiListCheck
                    style={{
                      color: "white",
                      fontSize: showText
                        ? "var(--console-save-size)"
                        : "var(--console-like-size)",
                    }}
                  />
                  {showText && (
                    <span
                      style={{
                        color: "white",
                        fontSize: "var(--console-font-size)",
                      }}
                    >
                      Watchlist
                    </span>
                  )}
                </div>
              ) : (
                <div
                  className={
                    showText
                      ? "console-button"
                      : "console-button aspect-square rounded-full justify-center"
                  }
                  style={{
                    padding: showText
                      ? "var(--console-padding-tb) var(--console-padding-lr)"
                      : undefined,
                    height: "var(--console-button-height)",
                    width: showText
                      ? undefined
                      : "var(--console-button-height)",
                  }}
                >
                  <BiListPlus
                    style={{
                      fontSize: showText
                        ? "var(--console-save-size)"
                        : "var(--console-like-size)",
                    }}
                  />
                  {showText && (
                    <span style={{ fontSize: "var(--console-font-size)" }}>
                      Watchlist
                    </span>
                  )}
                </div>
              )}
            </button>

            {/* Watched button */}
            <button
              aria-label="Add to watched"
              title="Add to watched"
              className="hover:text-[var(--console-hover-text)] transition-all duration-200 ease-out hover:bg-[var(--console-hover-bg)] h-full flex items-center p-0"
              style={{ padding: "var(--console-button-padding)" }}
              onClick={handleLike}
            >
              {isLiked ? (
                <div
                  className={
                    showText
                      ? "console-button"
                      : "console-button aspect-square rounded-full justify-center"
                  }
                  style={{
                    backgroundColor: "var(--color-liked)",
                    borderColor: "var(--color-liked)",
                    padding: showText
                      ? "var(--console-padding-tb) var(--console-padding-lr)"
                      : undefined,
                    height: "var(--console-button-height)",
                    width: showText
                      ? undefined
                      : "var(--console-button-height)",
                  }}
                >
                  <BiSolidHeart
                    style={{
                      color: "white",
                      fontSize: "var(--console-like-size)",
                    }}
                  />
                  {showText && (
                    <span
                      style={{
                        color: "white",
                        fontSize: "var(--console-font-size)",
                      }}
                    >
                      Watched
                    </span>
                  )}
                </div>
              ) : (
                <div
                  className={
                    showText
                      ? "console-button"
                      : "console-button aspect-square rounded-full justify-center"
                  }
                  style={{
                    padding: showText
                      ? "var(--console-padding-tb) var(--console-padding-lr)"
                      : undefined,
                    height: "var(--console-button-height)",
                    width: showText
                      ? undefined
                      : "var(--console-button-height)",
                  }}
                >
                  <BiHeart style={{ fontSize: "var(--console-like-size)" }} />
                  {showText && (
                    <span style={{ fontSize: "var(--console-font-size)" }}>
                      Watched
                    </span>
                  )}
                </div>
              )}
            </button>

            <TripleStarRating
              officialRating={officialRating}
              setRequestedRating={setRequestedRating}
              showText={showText}
            />
          </div>
        </div>
      )}
    </>
  );
}
