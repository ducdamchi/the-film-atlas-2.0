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
  likeStatusQueryOptions,
  saveStatusQueryOptions,
} from "@/queries/film.queries";
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
} from "@/types/film";
import type { LikeStatusResponse, SaveStatusResponse } from "@/types/api";

/**
 * The variants that drive CSS custom property styling via .console-{variant}.
 * Adding the union here means passing an invalid string like "hover" is a compile error.
 */
type ConsoleVariant = "card" | "landing-sm" | "landing-lg";

export interface InteractionConsoleProps {
  tmdbId: number | string | null | undefined;
  directors: TMDBCrewMember[];
  /** Full TMDB film detail — may be an empty object `{}` while loading */
  movieDetails: TMDBFilm | Record<string, never>;
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

  /* Status queries — enabled only when authenticated and tmdbId is known */
  const { data: likeStatus, isLoading: isStatusLoading } = useQuery({
    ...likeStatusQueryOptions(tmdbId ?? 0),
    enabled: !!authState.status && !!tmdbId,
  });
  const { data: saveStatus } = useQuery({
    ...saveStatusQueryOptions(tmdbId ?? 0),
    enabled: !!authState.status && !!tmdbId,
  });

  const isLiked = likeStatus?.liked ?? false;
  const isSaved = saveStatus?.saved ?? false;
  const officialRating = (likeStatus?.stars ?? null) as StarRating | null;

  /* Build the request body for API calls */
  function createReqBody(
    requestString: "like" | "save" | "rate",
  ): FilmInteractionRequest | FilmRateRequest {
    const directorsList: DirectorRef[] = directors.map((director) => ({
      tmdbId: director.id,
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

  /* Watch mutation — optimistic: flips liked state immediately, rolls back on error */
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
      await queryClient.cancelQueries({
        queryKey: likeStatusQueryOptions(tmdbId ?? 0).queryKey,
      });
      await queryClient.cancelQueries({
        queryKey: saveStatusQueryOptions(tmdbId ?? 0).queryKey,
      });
      const previousLike = queryClient.getQueryData(
        likeStatusQueryOptions(tmdbId ?? 0).queryKey,
      );
      const previousSave = queryClient.getQueryData(
        saveStatusQueryOptions(tmdbId ?? 0).queryKey,
      );
      queryClient.setQueryData(
        likeStatusQueryOptions(tmdbId ?? 0).queryKey,
        (old: LikeStatusResponse | undefined) => ({
          ...old,
          liked: shouldLike,
          stars: shouldLike
            ? requestedRating !== -1
              ? requestedRating
              : 0
            : null,
        }),
      );
      if (shouldLike) {
        // Liking is mutually exclusive with saved — optimistically clear saved
        queryClient.setQueryData(
          saveStatusQueryOptions(tmdbId ?? 0).queryKey,
          (old: SaveStatusResponse | undefined) => ({ ...old, saved: false }),
        );
      }
      return { previousLike, previousSave };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(
        likeStatusQueryOptions(tmdbId ?? 0).queryKey,
        context?.previousLike,
      );
      queryClient.setQueryData(
        saveStatusQueryOptions(tmdbId ?? 0).queryKey,
        context?.previousSave,
      );
      toast.error("Failed to update watch status");
    },
    onSuccess: () => {
      setRequestedRating(-1);
      queryClient.invalidateQueries({ queryKey: ["watched"] });
      queryClient.invalidateQueries({ queryKey: ["watched-list"] });
    },
  });

  /* Watchlist mutation — optimistic, also clears liked state when saving */
  const watchlistMutation = useMutation({
    mutationFn: (shouldSave: boolean) =>
      shouldSave
        ? saveFilm(createReqBody("save") as FilmInteractionRequest)
        : unsaveFilm((movieDetails as TMDBFilm).id),
    onMutate: async (shouldSave) => {
      await queryClient.cancelQueries({
        queryKey: saveStatusQueryOptions(tmdbId ?? 0).queryKey,
      });
      await queryClient.cancelQueries({
        queryKey: likeStatusQueryOptions(tmdbId ?? 0).queryKey,
      });
      const previousSave = queryClient.getQueryData(
        saveStatusQueryOptions(tmdbId ?? 0).queryKey,
      );
      const previousLike = queryClient.getQueryData(
        likeStatusQueryOptions(tmdbId ?? 0).queryKey,
      );
      queryClient.setQueryData(
        saveStatusQueryOptions(tmdbId ?? 0).queryKey,
        (old: SaveStatusResponse | undefined) => ({ ...old, saved: shouldSave }),
      );
      if (shouldSave) {
        // Saving is mutually exclusive with liked — optimistically clear liked
        queryClient.setQueryData(
          likeStatusQueryOptions(tmdbId ?? 0).queryKey,
          (old: LikeStatusResponse | undefined) => ({
            ...old,
            liked: false,
            stars: null,
          }),
        );
      }
      return { previousSave, previousLike };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(
        saveStatusQueryOptions(tmdbId ?? 0).queryKey,
        context?.previousSave,
      );
      queryClient.setQueryData(
        likeStatusQueryOptions(tmdbId ?? 0).queryKey,
        context?.previousLike,
      );
      toast.error("Failed to update watchlist");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlisted"] });
      queryClient.invalidateQueries({ queryKey: ["watchlisted-list"] });
    },
  });

  /* Rate mutation — no optimistic update needed; star UI gives immediate feedback */
  const rateMutation = useMutation({
    mutationFn: (req: FilmRateRequest) => rateFilm(req),
    onError: () => toast.error("Failed to update rating"),
    onSuccess: () => {
      setRequestedRating(-1);
      queryClient.invalidateQueries({
        queryKey: likeStatusQueryOptions(tmdbId ?? 0).queryKey,
      });
      queryClient.invalidateQueries({ queryKey: ["watched-list"] });
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
