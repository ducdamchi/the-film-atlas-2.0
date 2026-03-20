import { useEffect, useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import { getReleaseYear } from "@/utils/helperFunctions"
import { fetchFilmFromTMDB } from "@/utils/apiCalls"
import { useMarquee } from "@/hooks/useMarquee"

import InteractionConsole from "../film-interaction/InteractionConsole"
import CardHoverOverlay from "../film-interaction/CardHoverOverlay"
import { MdStars } from "react-icons/md"
import { MdPeople } from "react-icons/md"

import type { TMDBFilmSummary, TMDBFilm, TMDBCrewMember } from "@/types/tmdb"
import type { DiscoverPageState } from "@/types/map"

interface FilmTMDB_CardProps {
  filmObject: TMDBFilmSummary
  /** Optional — only needed on pages that use pagination (MapPage). */
  setPage?: React.Dispatch<React.SetStateAction<DiscoverPageState>>
}

export default function TmdbFilmCard({ filmObject, setPage }: FilmTMDB_CardProps) {
  const imgBaseUrl = "https://image.tmdb.org/t/p/original"
  const navigate = useNavigate()
  const [hoverId, setHoverId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [movieDetails, setMovieDetails] = useState<TMDBFilm | Record<string, never>>({})
  const [directors, setDirectors] = useState<TMDBCrewMember[]>([])

  const titleSpanRef = useMarquee(filmObject.title)

  /* Fetch TMDB details for each film card that shows up on screen */
  useEffect(() => {
    const fetchPageData = async () => {
      try {
        setIsLoading(true)
        const result = await fetchFilmFromTMDB(filmObject.id)
        const directorsList = result.credits.crew.filter(
          (crewMember) => crewMember.job === "Director",
        )
        setMovieDetails(result)
        setDirectors(directorsList)
      } catch (err) {
        console.error("Error loading film data: ", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPageData()
  }, [])

  return (
    <div
      id={`film-card-${filmObject.id}`}
      className="filmCard-width aspect-16/10 flex flex-col justify-center items-center md:items-start gap-0 bg-control text-dark relative"
      onMouseEnter={() => setHoverId(filmObject.id)}
      onMouseLeave={() => setHoverId(null)}>
      {/* Poster */}
      <div
        className="group/thumbnail overflow-hidden relative">
        <img
          id={`thumbnail-${filmObject.id}`}
          className="filmCard-width aspect-16/10 object-cover transition-all duration-300 ease-out group-hover/thumbnail:scale-[1.03]"
          src={
            filmObject.backdrop_path !== null
              ? `${imgBaseUrl}${filmObject.backdrop_path}`
              : `backdropnotfound.jpg`
          }
          alt=""
          onClick={() => {
            navigate({ to: `/films/${filmObject.id}` })
            setPage?.((prevPage) => ({ ...prevPage, loadMore: false }))
          }}
        />
      </div>

      {/* Card hover overlay - covers full card on hover (desktop only) */}
      <CardHoverOverlay
        hoverId={hoverId}
        filmObject={filmObject}
        directors={directors}
        movieDetails={movieDetails}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        showOverview={true}
        setPage={setPage}
      />

      {/* Text below poster */}

      {/* FIRST LINE: TITLE, YEAR, RATING, VOTE COUNT */}
      <div
        className={`md:absolute md:bottom-0 md:left-0 md:z-0 w-full p-2 pb-0 flex justify-between gap-2 md:p-3 md:bg-gradient-to-t md:from-black/80 md:to-transparent md:text-light text-base lg:pb-4 lg:text-lg 2xl:text-xl 2xl:pb-5 md:transition-opacity md:duration-200 ${hoverId ? "md:opacity-0 md:pointer-events-none" : ""}`}>
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

      {/* SECOND LINE: OVERVIEW, CONSOLE */}
      <div className="md:hidden mt-1 pb-4 w-full">
        {/* OVERVIEW */}
        <div className="p-0 pr-3 pl-3 mb-4 w-full text-[13px] italic line-clamp-2">
          {filmObject.overview}
        </div>

        {/* CONSOLE */}
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
  )
}
