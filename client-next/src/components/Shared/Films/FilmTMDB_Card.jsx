import { useEffect, useRef, useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import { getReleaseYear } from "../../../Utils/helperFunctions"
import { fetchFilmFromTMDB } from "../../../Utils/apiCalls"

import InteractionConsole from "../Buttons/InteractionConsole"
import LaptopInteractionConsole from "../Buttons/LaptopInteractionConsole"
import { MdStars } from "react-icons/md"
import { MdPeople } from "react-icons/md"

export default function FilmTMDB_Card({ filmObject, setPage }) {
  const imgBaseUrl = "https://image.tmdb.org/t/p/original"
  const navigate = useNavigate()
  const [hoverId, setHoverId] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [movieDetails, setMovieDetails] = useState({})
  const [directors, setDirectors] = useState([])
  const titleSpanRef = useRef(null)
  const titleMarqueeRef = useRef(null)

  useEffect(() => {
    const el = titleSpanRef.current
    if (!el) return

    const overflow = el.scrollWidth - el.parentElement.clientWidth

    if (overflow > 0) {
      const PAUSE_MS = 2500
      const movementMs = (overflow / 40) * 1000
      const totalMs = PAUSE_MS + movementMs + PAUSE_MS
      const pauseRatio = PAUSE_MS / totalMs

      titleMarqueeRef.current = el.animate(
        [
          { transform: "translateX(0)", offset: 0 },
          { transform: "translateX(0)", offset: pauseRatio },
          { transform: `translateX(-${overflow}px)`, offset: 1 - pauseRatio },
          { transform: `translateX(-${overflow}px)`, offset: 1 },
        ],
        {
          duration: totalMs,
          delay: 1000,
          easing: "linear",
          direction: "alternate",
          iterations: Infinity,
        },
      )
    } else {
      titleMarqueeRef.current?.cancel()
    }

    return () => titleMarqueeRef.current?.cancel()
  }, [filmObject.title])

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
      className="filmCard-width aspect-16/10 flex flex-col justify-center items-center md:items-start gap-0 bg-gray-200 text-black relative"
      onMouseEnter={() => setHoverId(filmObject.id)}
      onMouseLeave={() => setHoverId(null)}>
      {/* Poster */}
      <div className="group/thumbnail overflow-hidden relative">
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
            setPage((prevPage) => ({ ...prevPage, loadMore: false }))
          }}
        />
      </div>

      {/* Laptop Interaction Console - covers full card on hover */}
      <LaptopInteractionConsole
        hoverId={hoverId}
        filmObject={filmObject}
        directors={directors}
        movieDetails={movieDetails}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        hasOverview={true}
        setPage={setPage}
      />

      {/* Text below poster */}

      {/* FIRST LINE: TITLE, YEAR, RATING, VOTE COUNT */}
      <div
        className={`md:absolute md:bottom-0 md:left-0 md:z-0 w-full p-2 pb-0 flex justify-between gap-2 md:p-3 md:bg-gradient-to-t md:from-black/80 md:to-transparent md:text-stone-100 text-base lg:pb-4 lg:text-lg 2xl:text-xl 2xl:pb-5 md:transition-opacity md:duration-200 ${hoverId ? "md:opacity-0 md:pointer-events-none" : ""}`}>
        {/* Left side - Title, year */}
        <div className="flex flex-row items-center gap-1 ml-1 min-w-0">
          <div className="overflow-hidden min-w-0 flex-1">
            <span
              ref={titleSpanRef}
              onClick={() => {
                navigate({ to: `/films/${filmObject.id}` })
                setPage((prevPage) => ({ ...prevPage, loadMore: false }))
              }}
              className="whitespace-nowrap inline-block font-bold uppercase transition-all duration-200 ease-out hover:text-blue-400 cursor-pointer"
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
        <div className="p-0 pr-3 pl-3 mb-4 w-full text-[13px] italic truncate">
          {filmObject.overview}
        </div>

        {/* CONSOLE */}
        <InteractionConsole
          tmdbId={filmObject.id}
          directors={directors}
          movieDetails={movieDetails}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          css={{
            height: "1.4rem",
            textColor: "black",
            hoverBg: "none",
            hoverTextColor: "none",
            fontSize: "13px",
            likeSize: "1.1rem",
            saveSize: "1.5rem",
            starSize: "1.3rem",
            flexGap: "2px",
            likeColor: "white",
            saveColor: "white",
            likedBgColor: "oklch(44.4% 0.177 26.899)",
            savedBgColor: "oklch(44.8% 0.119 151.328)",
            buttonPadding: "2px",
            paddingTopBottom: "0px",
            paddingLeftRight: "10px",
            buttonHeight: "2rem",
          }}
          showOverview={false}
        />
      </div>
    </div>
  )
}
