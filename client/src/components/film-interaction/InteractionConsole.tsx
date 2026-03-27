/* Libraries */
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

/* Custom functions */
import {
  checkLikeStatus,
  checkSaveStatus,
  likeFilm,
  unlikeFilm,
  saveFilm,
  unsaveFilm,
  rateFilm,
} from "@/utils/apiCalls";
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

/**
 * The five variants that drive CSS custom property styling via .console-{variant}.
 * Adding the union here means passing an invalid string like "hover" is a compile error.
 */
type ConsoleVariant =
  | "card"
  | "overlay-sm"
  | "overlay-lg"
  | "overlay-panel"
  | "overlay-panel-sm"
  | "landing-sm"
  | "landing-lg";

export interface InteractionConsoleProps {
  tmdbId: number | null | undefined;
  directors: TMDBCrewMember[];
  /** Full TMDB film detail — may be an empty object `{}` while loading */
  movieDetails: TMDBFilm | Record<string, never>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  /**
   * @param {"card"|"overlay-sm"|"overlay-lg"|"landing-sm"|"landing-lg"} variant
   * Styling is driven by CSS custom properties set on .console-{variant} in styles.css
   */
  variant: ConsoleVariant;
  showOverview: boolean;
}

export default function InteractionConsole({
  tmdbId,
  directors,
  movieDetails,
  setIsLoading,
  isLoading,
  variant,
  showOverview,
}: InteractionConsoleProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [officialRating, setOfficialRating] = useState<StarRating | null>(null); //0 for liked but unrated; 1, 2, 3 for corresponding stars; null when film unliked
  const [requestedRating, setRequestedRating] = useState<StarRating | -1>(-1); //-1 when neutral (no requests), 0 for unrated; 1, 2, 3 for stars.
  const [isStatusLoading, setIsStatusLoading] = useState(false);

  const { authState, loading } = useAuth();
  const navigate = useNavigate();

  /* Create the request body for API call to App's DB when user 'like' a film */
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

    // For type narrowing: movieDetails cast to TMDBFilm when used
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

  async function handleLike() {
    if (authState.status) {
      try {
        if (!isLiked) {
          const req = createReqBody("like") as FilmInteractionRequest;
          req.stars =
            requestedRating !== -1 ? (requestedRating as StarRating) : 0;
          const result = await likeFilm(req);
          if ("error" in result) {
            console.error("Server: ", result.error);
          } else {
            setIsLiked(result.liked);
            setOfficialRating(result.stars as StarRating);
            setRequestedRating(-1);
            setIsSaved(false);
          }
        } else {
          const details = movieDetails as TMDBFilm;
          const result = await unlikeFilm(details.id);
          if ("error" in result) {
            console.error("Server: ", result.error);
          } else {
            setIsLiked(result.liked);
            setOfficialRating(result.stars as StarRating | null);
          }
        }
      } catch (err) {
        alert("Error liking/unliking film, please try again.");
        console.error("Error in handleLike(): ", err);
      }
    } else {
      alert("Log in to interact with films!");
      return;
    }
  }

  async function handleSave() {
    if (authState.status) {
      try {
        if (!isSaved) {
          const req = createReqBody("save") as FilmInteractionRequest;
          const result = await saveFilm(req);
          if ("error" in result) {
            console.error("Server: ", result.error);
          } else {
            setIsSaved(result.saved);
            setIsLiked(false);
            setOfficialRating(null);
          }
        } else {
          const details = movieDetails as TMDBFilm;
          const result = await unsaveFilm(details.id);
          if ("error" in result) {
            console.log("Server: ", result.error);
          } else {
            setIsSaved(result.saved);
          }
        }
      } catch (err) {
        alert("Error saving/unsaving film, please try again.");
        console.error("Error in handleSave(): ", err);
      }
    } else {
      alert("Log in to interact with films!");
      return;
    }
  }

  async function handleRate() {
    if (authState.status) {
      try {
        if (requestedRating !== officialRating) {
          if (requestedRating >= 0 && requestedRating <= 3) {
            if (!isLiked) {
              const req = createReqBody("like") as FilmInteractionRequest;
              req.stars =
                requestedRating !== -1 ? (requestedRating as StarRating) : 0;
              const result = await likeFilm(req);
              if ("error" in result) {
                console.error("Server: ", result.error);
              } else {
                setIsLiked(result.liked);
                setOfficialRating(result.stars as StarRating);
                setRequestedRating(-1);
                setIsSaved(false);
              }
            } else {
              const req = createReqBody("rate") as FilmRateRequest;
              req.stars = requestedRating as StarRating;
              const result = await rateFilm(req);
              if ("error" in result) {
                console.error("Server: ", result.error);
              } else {
                setOfficialRating(result.stars as StarRating);
                setRequestedRating(-1);
              }
            }
          } else if (requestedRating == -1) {
            // neutral state, no action
          } else {
            console.error("Requested rating out of range.");
          }
        }
      } catch (err) {
        alert("Error rating/unrating film, please try again.");
        console.error("Error in handleRate(): ", err);
      } finally {
        setIsLoading(false);
      }
    } else {
      if (requestedRating !== -1 && requestedRating !== null) {
        alert("Log in to interact with films!");
        return;
      }
    }
  }

  useEffect(() => {
    handleRate();
  }, [requestedRating]);

  useEffect(() => {
    const fetchPageData = async () => {
      if (authState.status && tmdbId) {
        setIsStatusLoading(true);
        try {
          const likeResult = await checkLikeStatus(tmdbId);
          const saveResult = await checkSaveStatus(tmdbId);

          if ("error" in likeResult) {
            console.error("Server: ", likeResult.error);
          } else {
            setIsLiked(likeResult.liked);
            setOfficialRating(likeResult.stars as StarRating | null);
          }

          if ("error" in saveResult) {
            console.error("Server: ", saveResult.error);
          } else {
            setIsSaved(saveResult.saved);
          }
        } catch (err) {
          console.error("Error loading film data: ", err);
        } finally {
          setIsStatusLoading(false);
        }
      }
    };
    fetchPageData();
  }, [tmdbId]);

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
