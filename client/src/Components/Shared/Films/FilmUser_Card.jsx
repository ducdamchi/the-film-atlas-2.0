import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"

import {
  getCountryName,
  getReleaseYear,
  getNameParts,
} from "../../../Utils/helperFunctions"
import { fetchFilmFromTMDB } from "../../../Utils/apiCalls"

import InteractionConsole from "../Buttons/InteractionConsole"
import LaptopInteractionConsole from "../Buttons/LaptopInteractionConsole"

export default function FilmUser_Card({ filmObject, queryString }) {
  const imgBaseUrl = "https://image.tmdb.org/t/p/original"
  const navigate = useNavigate()
  const [hoverId, setHoverId] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [movieDetails, setMovieDetails] = useState({})
  const [directors, setDirectors] = useState([])
  const titleSpanRef = useRef(null)
  const titleMarqueeRef = useRef(null)
  const countrySpanRef = useRef(null)
  const marqueeAnimationRef = useRef(null)

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
          { transform: "translateX(0)",              offset: 0              },
          { transform: "translateX(0)",              offset: pauseRatio     },
          { transform: `translateX(-${overflow}px)`, offset: 1 - pauseRatio },
          { transform: `translateX(-${overflow}px)`, offset: 1              },
        ],
        { duration: totalMs, delay: 1000, easing: "linear", direction: "alternate", iterations: Infinity },
      )
    } else {
      titleMarqueeRef.current?.cancel()
    }

    return () => titleMarqueeRef.current?.cancel()
  }, [filmObject.title])

  useEffect(() => {
    const el = countrySpanRef.current
    if (!el) return

    const overflow = el.scrollWidth - el.parentElement.clientWidth

    if (overflow > 0) {
      const PAUSE_MS = 2500
      const movementMs = (overflow / 40) * 1000
      const totalMs = PAUSE_MS + movementMs + PAUSE_MS
      const pauseRatio = PAUSE_MS / totalMs

      marqueeAnimationRef.current = el.animate(
        [
          { transform: "translateX(0)",              offset: 0              },
          { transform: "translateX(0)",              offset: pauseRatio     },
          { transform: `translateX(-${overflow}px)`, offset: 1 - pauseRatio },
          { transform: `translateX(-${overflow}px)`, offset: 1              },
        ],
        { duration: totalMs, delay: 1000, easing: "linear", direction: "alternate", iterations: Infinity },
      )
    } else {
      marqueeAnimationRef.current?.cancel()
    }

    return () => marqueeAnimationRef.current?.cancel()
  }, [filmObject.origin_country])

  useEffect(() => {
    const fetchPageData = async () => {
      if (hoverId) {
        try {
          setIsLoading(true)
          const result = await fetchFilmFromTMDB(hoverId)
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
    }
    fetchPageData()
  }, [hoverId])

  useEffect(() => {
    const filmCard = document.getElementById(`film-card-${filmObject.id}`)
    const img = new Image()
    img.crossOrigin = "anonymous"

    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(`https://image.tmdb.org/t/p/w500${filmObject.backdrop_path}`)}`
    img.src = proxyUrl

    img.onload = () => {
      const colorThief = new ColorThief()
      let domColor
      let brightness
      try {
        domColor = colorThief.getColor(img)
        /* Check brightness of dominant color to ensure readability
        Formula: https://www.nbdtech.com/Blog/archive/2008/04/27/Calculating-the-Perceived-Brightness-of-a-Color.aspx */
        brightness = Math.round(
          Math.sqrt(
            domColor[0] * domColor[0] * 0.241 +
              domColor[1] * domColor[1] * 0.691 +
              domColor[2] * domColor[2] * 0.068,
          ),
        )

        if (brightness > 194) {
          filmCard.style.backgroundColor = `rgba(${domColor[0]}, ${domColor[1]}, ${domColor[2]}, 0.4)`
        } else if (130 < brightness <= 194) {
          filmCard.style.backgroundColor = `rgba(${domColor[0] * 1.2}, ${domColor[1] * 1.2}, ${domColor[2] * 1.2}, 0.4)`
        } else {
          filmCard.style.backgroundColor = `rgba(${domColor[0] * 1.8}, ${domColor[1] * 1.8}, ${domColor[2] * 1.8}, 0.4)`
        }
      } catch (err) {
        console.log(err)
      }
    }
  }, [])

  return (
    <div
      id={`film-card-${filmObject.id}`}
      className="filmCard-width aspect-16/10 flex flex-col justify-center items-center gap-0 bg-gray-200 text-black rounded-none pt-0 relative"
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
            navigate(`/films/${filmObject.id}`)
          }}
        />
      </div>

      <LaptopInteractionConsole
        hoverId={hoverId}
        filmObject={filmObject}
        directors={directors}
        movieDetails={movieDetails}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        hasOverview={true}
      />

      {/* Text below poster */}
      <div
        className={`md:absolute md:bottom-0 md:left-0 md:z-0 md:p-3 md:bg-gradient-to-t md:from-black/80 md:to-transparent md:text-stone-100 w-full pt-1 pb-1 flex justify-between gap-2 p-2 md:transition-opacity md:duration-200 ${hoverId ? "md:opacity-0 md:pointer-events-none" : ""}`}>
        {/* Left side - Title, year, directors name*/}
        <div className="flex flex-col items-start justify-center gap-0 ml-2 min-w-0 overflow-hidden">
          {/* Film Title */}
          <div className="overflow-hidden w-full text-base">
            <span
              ref={titleSpanRef}
              onClick={() => navigate(`/films/${filmObject.id}`)}
              className="whitespace-nowrap inline-block font-bold uppercase transition-all duration-200 ease-out hover:text-blue-400 cursor-pointer"
              title={filmObject.title}
              style={{ paddingRight: "1rem" }}>
              {filmObject.title}
            </span>
          </div>
          {/* Release year & origin countries */}
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
                  ref={countrySpanRef}
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
        {/* Right side - director's photo*/}
        <div className="flex flex-col items-center justify-center gap-1 max-w-[22rem] mr-2 text-[12px] hover:text-blue-800 transition-all duration-300 ease-out">
          {queryString && filmObject.directors && (
            <div className="border-amber-400 flex items-start gap-1 justify-center">
              {filmObject.directors.map((dir, key) => {
                return key < 2 ? (
                  <div
                    key={key}
                    className="flex flex-col items-center justify-center gap-1 "
                    onClick={() => navigate(`/person/director/${dir.tmdbId}`)}>
                    <div className="relative max-w-[8rem] h-[2.5rem] aspect-1/1 overflow-hidden rounded-full ">
                      <img
                        className="object-cover grayscale transform -translate-y-1 hover:scale-[1.05] "
                        src={
                          dir.profile_path !== null
                            ? `${imgBaseUrl}${dir.profile_path}`
                            : "profilepicnotfound.jpg"
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

      {/* MOBILE <768px, interaction console at bottom */}
      <div
        className="md:hidden w-full pb-5 pt-3"
        id={`console-${filmObject.id}`}>
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
