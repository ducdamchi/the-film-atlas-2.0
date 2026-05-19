import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import {
  getCountryName,
  getReleaseYear,
  getNameParts,
  extractBorderColorFromElement,
} from "@/utils/helperFunctions"
import { useMarquee } from "@/hooks/useMarquee"

import InteractionConsole from "../film-interaction/InteractionConsole"
import CardHoverOverlay from "../film-interaction/CardHoverOverlay"
import FilmCardPoster from "./FilmCardPoster"

import type { UserFilm } from "@/types/film"

const imgBaseUrl = import.meta.env.VITE_TMDB_IMG_URL

interface FilmUser_CardProps {
  filmObject: UserFilm
  queryString: string | null
  imgRef?: (node: HTMLImageElement | null) => void
}

export default function UserFilmCard({
  filmObject,
  queryString,
  imgRef,
}: FilmUser_CardProps) {
  const navigate = useNavigate()

  const [imageLoaded, setImageLoaded] = useState(false)

  const titleSpanRef = useMarquee(filmObject.title)
  const countrySpanRef = useMarquee(filmObject.origin_country)

  // Mobile: dynamic border color from backdrop, runs when image finishes loading
  function handleImageLoad(el: HTMLImageElement) {
    setImageLoaded(true)
    if (window.innerWidth >= 768) return
    if (!filmObject.backdrop_path) return
    const filmCard = document.getElementById(`film-card-${filmObject.id}`)
    const color = extractBorderColorFromElement(el)
    if (color && filmCard) filmCard.style.borderColor = color
  }

  return (
    <div
      id={`film-card-${filmObject.id}`}
      className={`filmCard-width md:aspect-16/10 flex flex-col justify-center items-center gap-0 text-background rounded-none pt-0 relative group/card hover:z-[200] transition-all duration-200 ease-out hover:scale-105 hover:drop-shadow-[0_10px_15px_rgba(0,0,0,0.55)] border-1 md:border-0 ${imageLoaded ? "opacity-100" : "opacity-0"}`}>
      {/* Poster + title overlay — relative wrapper keeps bottom-0 anchored to poster */}
      <div className="relative w-full">
        <FilmCardPoster
          backdropPath={filmObject.backdrop_path}
          filmId={filmObject.id}
          trailerKey={null}
          onPosterHoverEnter={() => {}}
          onPosterHoverLeave={() => {}}
          onNavigate={() => navigate({ to: `/films/${filmObject.id}` })}
          imgRef={imgRef}
          onImageLoad={handleImageLoad}
        />
        {/* Title overlay — anchored to bottom of poster */}
        <div className="absolute bottom-0 left-0 z-0 p-3 bg-gradient-to-t from-foreground/80 to-transparent text-light w-full flex justify-between gap-2 text-[12px]">
          {/* Left side - Title, year, country */}
          <div className="flex flex-col items-start justify-center gap-0 ml-2 min-w-0 overflow-hidden">
            <div className="overflow-hidden w-full text-base">
              <span
                ref={titleSpanRef as React.RefObject<HTMLSpanElement>}
                onClick={() => navigate({ to: `/films/${filmObject.id}` })}
                className="whitespace-nowrap inline-block font-bold uppercase transition-all duration-200 ease-out hover:text-hover-accent cursor-pointer"
                title={filmObject.title}
                style={{ paddingRight: "1rem" }}>
                {filmObject.title}
              </span>
            </div>
            <div className="flex items-center uppercase font-light gap-1 w-full">
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
                    style={{ paddingRight: "1rem" }}>
                    {filmObject.origin_country
                      .map((c) => getCountryName(c))
                      .join(", ")}
                  </span>
                </div>
              )}
            </div>
          </div>
          {/* Right side - director photos */}
          <div className="flex flex-col items-center justify-center gap-1 max-w-[22rem] mr-2 hover:text-hover-link transition-all duration-300 ease-out">
            {queryString && filmObject.directors && (
              <div className="flex items-start gap-1 justify-center">
                {filmObject.directors.map((dir, key) => {
                  return key < 2 ? (
                    <div
                      key={key}
                      className="flex flex-col items-center justify-center gap-1"
                      onClick={() =>
                        navigate({ to: `/person/director/${dir.tmdbId}` })
                      }>
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
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slide-down overlay — mobile: always visible, desktop: appears below card on hover */}
      <CardHoverOverlay
        hoverId={null}
        filmObject={filmObject}
        directors={filmObject.directors}
        movieDetails={filmObject}
        isLoading={false}
        fetchError={false}
        showOverview={true}
        slideDown={true}
      />
    </div>
  )
}
