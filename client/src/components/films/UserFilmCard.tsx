import { useEffect, useRef, useState } from "react";
import { getColorSync } from "colorthief";
import { useNavigate } from "@tanstack/react-router";

import {
  getCountryName,
  getReleaseYear,
  getNameParts,
} from "@/utils/helperFunctions";
import { fetchFilmFromTMDB } from "@/utils/apiCalls";
import { useMarquee } from "@/hooks/useMarquee";

import InteractionConsole from "../film-interaction/InteractionConsole";
import PosterTrailerHover from "./PosterTrailerHover";

import type { UserFilm } from "@/types/film";
import type { TMDBFilm, TMDBCrewMember } from "@/types/tmdb";

interface FilmUser_CardProps {
  filmObject: UserFilm;
  queryString: string | null;
}

export default function UserFilmCard({
  filmObject,
  queryString,
}: FilmUser_CardProps) {
  const imgBaseUrl = "https://image.tmdb.org/t/p/original";
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [movieDetails, setMovieDetails] = useState<
    TMDBFilm | Record<string, never>
  >({});
  const [directors, setDirectors] = useState<TMDBCrewMember[]>([]);

  const hasFetchedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const titleSpanRef = useMarquee(filmObject.title);
  const countrySpanRef = useMarquee(filmObject.origin_country);

  const trailerKey =
    (movieDetails as TMDBFilm).videos?.results.find(
      (v) => v.site === "YouTube" && v.type === "Trailer",
    )?.key ?? null;

  // Desktop: fetch film data on first hover (150ms debounce)
  const handlePosterHoverEnter = () => {
    if (hasFetchedRef.current || window.innerWidth < 768) return;
    debounceRef.current = setTimeout(async () => {
      if (hasFetchedRef.current) return;
      hasFetchedRef.current = true;
      try {
        setIsLoading(true);
        const result = await fetchFilmFromTMDB(filmObject.id);
        const directorsList = result.credits.crew.filter(
          (crewMember) => crewMember.job === "Director",
        );
        setMovieDetails(result);
        setDirectors(directorsList);
      } catch (err) {
        console.error("Error loading film data: ", err);
      } finally {
        setIsLoading(false);
      }
    }, 150);
  };

  const handlePosterHoverLeave = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  };

  // Mobile: fetch on mount
  useEffect(() => {
    if (window.innerWidth >= 768) return;
    const fetchMobileData = async () => {
      try {
        setIsLoading(true);
        const result = await fetchFilmFromTMDB(filmObject.id);
        const directorsList = result.credits.crew.filter(
          (crewMember) => crewMember.job === "Director",
        );
        setMovieDetails(result);
        setDirectors(directorsList);
      } catch (err) {
        console.error("Error loading film data: ", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMobileData();
  }, []);

  // Mobile: dynamic background color from backdrop
  useEffect(() => {
    if (window.innerWidth >= 768) return;
    if (!filmObject.backdrop_path) return;

    const filmCard = document.getElementById(`film-card-${filmObject.id}`);
    const img = new Image();
    img.crossOrigin = "anonymous";

    const proxyUrl = `${import.meta.env.VITE_API_URL}/proxy/image?url=${encodeURIComponent(`https://image.tmdb.org/t/p/w500${filmObject.backdrop_path}`)}`;
    img.src = proxyUrl;

    img.onload = () => {
      try {
        const [r, g, b]: [number, number, number] = getColorSync(img).array();

        const lin = (c: number) => {
          const n = c / 255;
          return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
        };
        const rl = lin(r),
          gl = lin(g),
          bl = lin(b);
        const X = 0.4124 * rl + 0.3576 * gl + 0.1805 * bl;
        const Y = 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
        const Z = 0.0193 * rl + 0.1192 * gl + 0.9505 * bl;
        const lms_l = Math.cbrt(
          0.8189330101 * X + 0.3618667424 * Y - 0.1288597137 * Z,
        );
        const lms_m = Math.cbrt(
          -0.0329845436 * X + 0.9293118715 * Y + 0.0361456387 * Z,
        );
        const lms_s = Math.cbrt(
          0.0482003018 * X + 0.2643662691 * Y + 0.633851707 * Z,
        );
        const L =
          0.2104542553 * lms_l + 0.793617785 * lms_m - 0.0040720468 * lms_s;
        const a =
          1.9779984951 * lms_l - 2.428592205 * lms_m + 0.4505937099 * lms_s;
        const bLab =
          0.0259040371 * lms_l + 0.4072969751 * lms_m - 0.4332046721 * lms_s;
        const C = Math.sqrt(a * a + bLab * bLab);
        const H = Math.atan2(bLab, a) * (180 / Math.PI);

        const clampedL = Math.max(0.52, Math.min(0.68, L));
        const clampedC = Math.min(C, 0.14);

        if (filmCard) {
          filmCard.style.backgroundColor = `oklch(${clampedL} ${clampedC} ${H} / 0.55)`;
        }
      } catch (err) {
        console.log(err);
      }
    };
  }, []);

  return (
    <div
      id={`film-card-${filmObject.id}`}
      className="filmCard-width aspect-16/10 flex flex-col justify-center items-center gap-0 bg-control text-dark rounded-none pt-0 relative"
    >
      {/* Poster — desktop: trailer hover when available, else plain img */}
      <div
        className="overflow-hidden relative"
        onMouseEnter={handlePosterHoverEnter}
        onMouseLeave={handlePosterHoverLeave}
      >
        {trailerKey ? (
          <PosterTrailerHover
            backdropPath={filmObject.backdrop_path}
            trailerKey={trailerKey}
            onClick={() => navigate({ to: `/films/${filmObject.id}` })}
          />
        ) : (
          <img
            id={`thumbnail-${filmObject.id}`}
            className="filmCard-width aspect-16/10 object-cover transition-all duration-300 ease-out hover:scale-[1.03]"
            src={
              filmObject.backdrop_path !== null
                ? `${imgBaseUrl}${filmObject.backdrop_path}`
                : `backdropnotfound.jpg`
            }
            alt=""
            onClick={() => navigate({ to: `/films/${filmObject.id}` })}
          />
        )}
      </div>

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
        <div className="p-0 pr-3 pl-3 mb-4 w-full text-[13px] italic line-clamp-2">
          {(movieDetails as TMDBFilm).overview}
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
