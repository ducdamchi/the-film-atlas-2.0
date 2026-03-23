import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

import { getReleaseYear, extractBorderColor } from "@/utils/helperFunctions";
import { useMarquee } from "@/hooks/useMarquee";
import { useFilmCardFetch } from "@/hooks/useFilmCardFetch";

import InteractionConsole from "../film-interaction/InteractionConsole";
import CardHoverOverlay from "../film-interaction/CardHoverOverlay";
import FilmCardPoster from "./FilmCardPoster";
import { MdStars, MdPeople } from "react-icons/md";

import type { TMDBFilmSummary, TMDBFilm } from "@/types/tmdb";
import type { DiscoverPageState } from "@/types/map";

interface FilmTMDB_CardProps {
  filmObject: TMDBFilmSummary;
  /** Optional — only needed on pages that use pagination (MapPage). */
  setPage?: React.Dispatch<React.SetStateAction<DiscoverPageState>>;
}

export default function TmdbFilmCard({ filmObject, setPage }: FilmTMDB_CardProps) {
  const navigate = useNavigate();

  const {
    isLoading,
    setIsLoading,
    fetchError,
    movieDetails,
    directors,
    isPosterHovered,
    setIsPosterHovered,
    handleCardHoverEnter,
    handleCardHoverLeave,
  } = useFilmCardFetch(filmObject.id);

  const titleSpanRef = useMarquee(filmObject.title);

  const trailerKey =
    (movieDetails as TMDBFilm).videos?.results.find(
      (v) => v.site === "YouTube" && v.type === "Trailer",
    )?.key ?? null;

  // Mobile: dynamic border color from backdrop
  useEffect(() => {
    if (window.innerWidth >= 768) return;
    if (!filmObject.backdrop_path) return;

    const filmCard = document.getElementById(`film-card-${filmObject.id}`);
    extractBorderColor(filmObject.backdrop_path).then((color) => {
      if (color && filmCard) {
        filmCard.style.borderColor = color;
      }
    });
  }, []);

  return (
    <div
      id={`film-card-${filmObject.id}`}
      className="filmCard-width aspect-16/10 flex flex-col justify-center items-center gap-0 text-dark rounded-none pt-0 relative group hover:z-[200] transition-all duration-200 ease-out hover:scale-105 hover:drop-shadow-2xl border-1 md:border-0"
      onMouseEnter={handleCardHoverEnter}
      onMouseLeave={handleCardHoverLeave}
    >
      {/* Poster */}
      <FilmCardPoster
        backdropPath={filmObject.backdrop_path}
        filmId={filmObject.id}
        trailerKey={trailerKey}
        isPosterHovered={isPosterHovered}
        onPosterHoverEnter={() => setIsPosterHovered(true)}
        onPosterHoverLeave={() => setIsPosterHovered(false)}
        onNavigate={() => {
          navigate({ to: `/films/${filmObject.id}` });
          setPage?.((prevPage) => ({ ...prevPage, loadMore: false }));
        }}
      />

      {/* Slide-down overlay — desktop only, appears below the card on hover */}
      <CardHoverOverlay
        hoverId={null}
        filmObject={filmObject}
        directors={directors}
        movieDetails={movieDetails}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        fetchError={fetchError}
        showOverview={true}
        slideDown={true}
        setPage={setPage}
      />

      {/* Text below poster */}
      <div className="md:absolute md:bottom-0 md:left-0 md:z-0 md:p-3 md:bg-gradient-to-t md:from-black/80 md:to-transparent md:text-light w-full pt-1 pb-1 flex justify-between gap-2 p-2">
        {/* Left side - Title, year */}
        <div className="flex flex-row items-center gap-1 ml-1 min-w-0">
          <div className="overflow-hidden min-w-0 flex-1">
            <span
              ref={titleSpanRef as React.RefObject<HTMLSpanElement>}
              onClick={() => {
                navigate({ to: `/films/${filmObject.id}` });
                setPage?.((prevPage) => ({ ...prevPage, loadMore: false }));
              }}
              className="whitespace-nowrap inline-block font-bold uppercase transition-all duration-200 ease-out hover:text-hover-accent cursor-pointer"
              title={filmObject.title}
              style={{ paddingRight: "0.1rem" }}
            >
              {filmObject.title}
            </span>
          </div>
          {filmObject.release_date && (
            <span className="shrink-0 font-thin">
              {getReleaseYear(filmObject.release_date)}
            </span>
          )}
        </div>

        {/* Right side - TMDB rating and vote count */}
        <div className="flex items-center gap-2 md:gap-3 justify-center mr-1 shrink-0">
          <div className="flex items-center justify-center gap-1">
            <MdStars className="text-sm lg:text-xl 2xl:text-2xl" />
            <div className="">{Number(filmObject.vote_average).toFixed(1)}</div>
          </div>
          <div className="flex items-center justify-center gap-1">
            <MdPeople className="text-base lg:text-xl 2xl:text-3xl" />
            <div className="">{filmObject.vote_count}</div>
          </div>
        </div>
      </div>

      {/* Mobile <768px: overview + interaction console */}
      <div className="md:hidden mt-1 pb-4 w-full">
        <div className="p-0 pr-3 pl-3 mb-4 w-full text-[13px] italic line-clamp-2">
          {filmObject.overview}
        </div>
        <InteractionConsole
          tmdbId={filmObject.id}
          directors={directors}
          movieDetails={movieDetails}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          variant="card"
          showOverview={false}
        />
      </div>
    </div>
  );
}
