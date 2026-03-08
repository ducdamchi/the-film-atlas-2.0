import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

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
  const [directors, setDirectors] = useState([]) //director

  /* Fetch TMDB details for a film when it's hovered on --- this is an exact duplicate of the hook below, but to handle laptop mode when user hovers over a film. might need better solution in future to avoid redundancy */
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
      className="filmCard-width aspect-16/10 flex flex-col justify-center items-center md:items-start gap-0 bg-gray-200 text-black relative">
      {/* Poster */}
      <div
        className="group/thumbnail overflow-hidden relative"
        onMouseEnter={() => {
          setHoverId(filmObject.id)
        }}
        onMouseLeave={() => {
          setHoverId(null)
        }}>
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
            setPage((prevPage) => ({ ...prevPage, loadMore: false }))
          }}
        />

        {/* Laptop Interaction Console */}
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
      </div>

      {/* Text below poster */}

      {/* FIRST LINE: TITLE, YEAR, RATING, VOTE COUNT */}
      <div className="md:absolute md:bottom-0 md:left-0 w-full p-2 pb-0 flex justify-between md:p-3 md:bg-gradient-to-t md:from-black/80 md:to-transparent md:text-stone-100 text-base lg:pb-4 lg:text-lg 2xl:text-xl 2xl:pb-5">
        {/* Left side - Title, year*/}
        <div className="border-amber-400 flex flex-row items-center justify-center gap-0 ml-1">
          {/* Film Title, Year, Rating, Vote Count*/}
          <div className="flex items-center justify-start">
            {/* < lg: show 17 chars */}
            <span
              onClick={() => {
                navigate(`/films/${filmObject.id}`)
                setPage((prevPage) => ({ ...prevPage, loadMore: false }))
              }}
              className="lg:hidden font-bold uppercase transition-all duration-200 ease-out hover:text-blue-400 cursor-pointer"
              title={filmObject.title}>
              {filmObject.title.slice(0, 17)}
            </span>
            {filmObject.title.length > 17 && (
              <span className="lg:hidden font-bold uppercase transition-all duration-200 ease-out hover:text-blue-400">
                ...
              </span>
            )}
            {/* >= lg: show 20 chars */}
            <span
              onClick={() => {
                navigate(`/films/${filmObject.id}`)
                setPage((prevPage) => ({ ...prevPage, loadMore: false }))
              }}
              className="hidden lg:inline font-bold uppercase transition-all duration-200 ease-out hover:text-blue-400 cursor-pointer"
              title={filmObject.title}>
              {filmObject.title.slice(0, 20)}
            </span>
            {filmObject.title.length > 20 && (
              <span className="hidden lg:inline font-bold uppercase transition-all duration-200 ease-out hover:text-blue-400">
                ...
              </span>
            )}
            {filmObject.release_date && (
              <span className="ml-1 font-thin">
                {`${getReleaseYear(filmObject.release_date)}`}
              </span>
            )}
          </div>
        </div>

        {/* Right side - TMDB rating and vote count */}
        <div className="flex items-center gap-2 md:gap-3 justify-center mr-1">
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
        <div className="p-0 pr-3 pl-3 mb-4 w-full text-[13px]">
          <span className="italic">{filmObject.overview?.slice(0, 52)}</span>
          {filmObject.overview?.length >= 53 && <span>{`...`}</span>}
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

// {
//   queryString && filmObject.directors && (
//     <span className="">
//       <span className="flex gap-1 uppercase text-xs italic font-semibold">
//         {/* <span>|</span> */}
//         {filmObject.directors.map((dir, key) => {
//           return (
//             <span key={key}>
//               <span>{`${dir.name}`}</span>
//               {/* Add a comma if it's not the last country on the list */}
//               {key !== filmObject.directors.length - 1 && (
//                 <span>,</span>
//               )}
//             </span>
//           )
//         })}
//       </span>
//     </span>
//   )
// }
