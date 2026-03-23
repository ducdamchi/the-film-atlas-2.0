import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

import {
  getCountryName,
  getReleaseYear,
  getNameParts,
  extractBorderColor,
} from "@/utils/helperFunctions";
import { useMarquee } from "@/hooks/useMarquee";
import { useFilmCardFetch } from "@/hooks/useFilmCardFetch";

import InteractionConsole from "../film-interaction/InteractionConsole";
import CardHoverOverlay from "../film-interaction/CardHoverOverlay";
import FilmCardPoster from "./FilmCardPoster";
import SkeletonBlock from "@/components/ui/SkeletonBlock";

import type { UserFilm } from "@/types/film";
import type { TMDBFilm } from "@/types/tmdb";

const imgBaseUrl = "https://image.tmdb.org/t/p/original";

interface FilmUser_CardProps {
  filmObject: UserFilm;
  queryString: string | null;
}

export default function UserFilmCard({
  filmObject,
  queryString,
}: FilmUser_CardProps) {
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
  const countrySpanRef = useMarquee(filmObject.origin_country);

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
      {/* Poster — desktop: trailer hover when available, else plain img */}
      <FilmCardPoster
        backdropPath={filmObject.backdrop_path}
        filmId={filmObject.id}
        trailerKey={trailerKey}
        isPosterHovered={isPosterHovered}
        onPosterHoverEnter={() => setIsPosterHovered(true)}
        onPosterHoverLeave={() => setIsPosterHovered(false)}
        onNavigate={() => navigate({ to: `/films/${filmObject.id}` })}
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
      />

      <div className="bg-elevated w-full">
        {/* Text below poster */}
        <div className="md:absolute md:bottom-0 md:left-0 md:z-0 md:p-3 md:bg-gradient-to-t md:from-black/80 md:to-transparent md:text-light w-full pt-1 pb-1 flex justify-between gap-2 p-2">
          {/* Left side - Title, year, country */}
          <div className="flex flex-col items-start justify-center gap-0 ml-2 min-w-0 overflow-hidden">
            <div className="overflow-hidden w-full text-base">
              <span
                ref={titleSpanRef as React.RefObject<HTMLSpanElement>}
                onClick={() => navigate({ to: `/films/${filmObject.id}` })}
                className="whitespace-nowrap inline-block font-bold uppercase transition-all duration-200 ease-out hover:text-hover-accent cursor-pointer"
                title={filmObject.title}
                style={{ paddingRight: "1rem" }}
              >
                {filmObject.title}
              </span>
            </div>
            <div className="flex items-center uppercase text-[12px] font-light gap-1 w-full">
              {filmObject.release_date && (
                <span className="shrink-0">
                  {getReleaseYear(filmObject.release_date)}
                  {queryString && filmObject.origin_country && " |"}
                </span>
              )}
              {queryString && filmObject.origin_country && (
                <div className="overflow-hidden min-w-0 flex-1">
                  <span
                    ref={countrySpanRef as React.RefObject<HTMLSpanElement>}
                    className="whitespace-nowrap inline-block"
                    style={{ paddingRight: "1rem" }}
                  >
                    {filmObject.origin_country
                      .map((c) => getCountryName(c))
                      .join(", ")}
                  </span>
                </div>
              )}
            </div>
          </div>
          {/* Right side - director photos */}
          <div className="flex flex-col items-center justify-center gap-1 max-w-[22rem] mr-2 text-[12px] hover:text-hover-link transition-all duration-300 ease-out">
            {queryString && filmObject.directors && (
              <div className="flex items-start gap-1 justify-center">
                {filmObject.directors.map((dir, key) => {
                  return key < 2 ? (
                    <div
                      key={key}
                      className="flex flex-col items-center justify-center gap-1"
                      onClick={() =>
                        navigate({ to: `/person/director/${dir.tmdbId}` })
                      }
                    >
                      <div className="relative max-w-[8rem] h-[2.5rem] aspect-1/1 overflow-hidden rounded-full">
                        <img
                          className="object-cover grayscale transform -translate-y-1 hover:scale-[1.05]"
                          src={
                            dir.profile_path !== null
                              ? `${imgBaseUrl}${dir.profile_path}`
                              : "/picnotfound.jpg"
                          }
                        />
                      </div>
                      <div className="text-center cursor-pointer truncate max-w-[6rem]">
                        {`${getNameParts(dir.name)?.firstNameInitial}. ${getNameParts(dir.name)?.lastName}`}
                      </div>
                    </div>
                  ) : (
                    <span key={key} className="hidden"></span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Mobile <768px: overview + interaction console */}
        <div className="md:hidden mt-1 pb-4 w-full">
          <div className="p-0 pr-3 pl-3 mb-4 w-full text-[13px]">
            {isLoading ? (
              <div className="flex flex-col gap-1.5">
                <SkeletonBlock className="h-2.5 w-full" />
                <SkeletonBlock className="h-2.5 w-[85%]" />
                <SkeletonBlock className="h-2.5 w-[60%]" />
              </div>
            ) : fetchError ? (
              <span className="font-light text-muted">Details unavailable</span>
            ) : (
              <span className="italic line-clamp-2">
                {(movieDetails as TMDBFilm).overview}
              </span>
            )}
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
    </div>
  );
}
