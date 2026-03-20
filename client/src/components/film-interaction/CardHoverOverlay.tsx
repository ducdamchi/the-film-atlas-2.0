import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import InteractionConsole from "./InteractionConsole";
import type { TMDBFilmSummary, TMDBFilm, TMDBCrewMember } from "@/types/tmdb";
import type { UserFilm } from "@/types/film";
import type { DiscoverPageState } from "@/types/map";

function useOverlayVariant(): "overlay-sm" | "overlay-lg" {
  const [isLg, setIsLg] = useState(
    () => window.matchMedia("(min-width: 1024px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = (e: MediaQueryListEvent) => setIsLg(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isLg ? "overlay-lg" : "overlay-sm";
}

interface CardHoverOverlayProps {
  hoverId: number | null;
  /** Either a TMDB film summary (from the discover gallery) or a user's saved film */
  filmObject: TMDBFilmSummary | UserFilm;
  directors: TMDBCrewMember[];
  /** Full TMDB film detail — may be an empty object `{}` while loading */
  movieDetails: TMDBFilm | Record<string, never>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  showOverview: boolean;
  setPage?: React.Dispatch<React.SetStateAction<DiscoverPageState>>;
}

export default function CardHoverOverlay({
  hoverId,
  filmObject,
  directors,
  movieDetails,
  isLoading,
  setIsLoading,
  showOverview,
  setPage,
}: CardHoverOverlayProps) {
  const navigate = useNavigate();
  const isHovered = hoverId === filmObject.id;
  const details = movieDetails as TMDBFilm;
  const overlayVariant = useOverlayVariant();

  const handleNavigate = () => {
    navigate({ to: `/films/${filmObject.id}` });
    if (setPage) setPage((prevPage) => ({ ...prevPage, loadMore: false }));
  };

  return (
    <div
      className={`hidden md:flex absolute inset-0 items-center justify-center z-10 ${!isHovered ? "pointer-events-none" : ""}`}
    >
      {/* Black overlay in its own div so its opacity transition doesn't create a stacking context
          around the InteractionConsole — backdrop-filter on console buttons requires no
          opacity-animated ancestor to correctly blur through to the film poster. */}
      <div
        className={`absolute inset-0 bg-black/70 transition-opacity duration-200 ${isHovered ? "opacity-100" : "opacity-0"}`}
      />

      {isHovered && showOverview && (
        <div className="flex flex-col justify-end items-center pb-4 lg:pb-6 relative z-10">
          <div
            className="w-full text-light px-7 pb-5 lg:pb-6"
            onClick={handleNavigate}
          >
            <span className="text-sm lg:text-base italic font-light line-clamp-4">
              {details?.overview || (filmObject as TMDBFilmSummary).overview}
            </span>
          </div>
          <InteractionConsole
            tmdbId={hoverId}
            directors={directors}
            movieDetails={movieDetails}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            variant={overlayVariant}
            showOverview={false}
          />
        </div>
      )}

      {isHovered && !showOverview && (
        <div className="flex flex-col justify-center items-center h-full pb-4 lg:pb-6 relative z-10">
          <InteractionConsole
            tmdbId={hoverId}
            directors={directors}
            movieDetails={movieDetails}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            variant={overlayVariant}
            showOverview={false}
          />
          <div
            className="absolute w-full h-full z-0 bottom-0"
            onClick={handleNavigate}
          />
        </div>
      )}
    </div>
  );
}
