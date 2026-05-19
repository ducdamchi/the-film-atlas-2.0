import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import {
  getReleaseYear,
  extractBorderColorFromElement,
} from "@/utils/helperFunctions"
import { useMarquee } from "@/hooks/useMarquee"
import { useFilmCardFetch } from "@/hooks/useFilmCardFetch"

import InteractionConsole from "../film-interaction/InteractionConsole"
import CardHoverOverlay from "../film-interaction/CardHoverOverlay"
import FilmCardPoster from "./FilmCardPoster"
import { MdStars, MdPeople } from "react-icons/md"

import type { TMDBFilmSummary, TMDBFilm } from "@/types/tmdb"
import type { DiscoverPageState } from "@/types/map"

interface FilmTMDB_CardProps {
  filmObject: TMDBFilmSummary
  imgRef: (node: HTMLImageElement | null) => void
  /** Optional — only needed on pages that use pagination (MapPage). */
  setPage?: React.Dispatch<React.SetStateAction<DiscoverPageState>>
}

export default function TmdbFilmCard({
  filmObject,
  imgRef,
  setPage,
}: FilmTMDB_CardProps) {
  const navigate = useNavigate()

  const {
    isLoading,
    fetchError,
    movieDetails,
    directors,
    handleCardHoverEnter,
    handleCardHoverLeave,
  } = useFilmCardFetch(filmObject.id)

  const [imageLoaded, setImageLoaded] = useState(false)

  const titleSpanRef = useMarquee(filmObject.title)

  const trailerKey =
    (movieDetails as TMDBFilm).videos?.results.find(
      (v) => v.site === "YouTube" && v.type === "Trailer",
    )?.key ?? null

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
      className={`filmCard-width md:aspect-16/10 flex flex-col justify-center items-center gap-0 text-background rounded-none pt-0 relative group/card hover:z-[200] transition-all duration-200 ease-out hover:scale-105 hover:drop-shadow-2xl border-1 md:border-0 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
      onMouseEnter={handleCardHoverEnter}
      onMouseLeave={handleCardHoverLeave}>
      <div className="relative w-full">
        {/* Poster */}
        <FilmCardPoster
          backdropPath={filmObject.backdrop_path}
          filmId={filmObject.id}
          trailerKey={trailerKey}
          onPosterHoverEnter={() => {}}
          onPosterHoverLeave={() => {}}
          onNavigate={() => {
            navigate({ to: `/films/${filmObject.id}` })
            setPage?.((prevPage) => ({ ...prevPage, loadMore: false }))
          }}
          imgRef={imgRef}
          onImageLoad={handleImageLoad}
        />

        {/* Text below poster */}
        <div className="absolute bottom-0 left-0 z-0 p-3 bg-gradient-to-t from-foreground/80 to-transparent text-light w-full flex justify-between gap-2 text-base">
          {/* Left side - Title, year */}
          <div className="flex flex-row items-center gap-1 ml-1 min-w-0">
            <div className="overflow-hidden min-w-0 flex-1">
              <span
                ref={titleSpanRef as React.RefObject<HTMLSpanElement>}
                onClick={() => {
                  navigate({ to: `/films/${filmObject.id}` })
                  setPage?.((prevPage) => ({ ...prevPage, loadMore: false }))
                }}
                className="whitespace-nowrap inline-block font-bold uppercase transition-all duration-200 ease-out hover:text-hover-accent cursor-pointer"
                title={filmObject.title}
                style={{ paddingRight: "0.1rem" }}>
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
          <div className="flex items-center gap-2 justify-center mr-1 shrink-0">
            <div className="flex items-center justify-center gap-1">
              <MdStars className="text-base" />
              <div className="">
                {Number(filmObject.vote_average).toFixed(1)}
              </div>
            </div>
            <div className="flex items-center justify-center gap-1">
              <MdPeople className="text-base" />
              <div className="">{filmObject.vote_count}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Slide-down overlay — desktop only, appears below the card on hover */}
      <CardHoverOverlay
        hoverId={null}
        filmObject={filmObject}
        directors={directors}
        movieDetails={movieDetails}
        isLoading={isLoading}
        fetchError={fetchError}
        showOverview={true}
        slideDown={true}
        setPage={setPage}
      />
    </div>
  )
}
