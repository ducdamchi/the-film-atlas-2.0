/* Libraries */
import React, { useEffect, useState, useContext, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"

/* Custom functions */
import {
  getCountryName,
  getReleaseYear,
  darkenColorToOklch,
} from "../Utils/helperFunctions"
import {
  fetchFilmFromTMDB,
  fetchFilmFromYTS,
  fetchFilmRatingsFromOMDB,
  fetchFilmAwardsFromWikidata,
} from "../Utils/apiCalls"
import useCommandKey from "../Hooks/useCommandKey"
import { AuthContext } from "../Utils/authContext"

/* Components */
import NavBar from "./Shared/Navigation-Search/NavBar"
import LoadingPage from "./Shared/Navigation-Search/LoadingPage"
import QuickSearchModal from "./Shared/Navigation-Search/QuickSearchModal"
import InteractionConsole from "./Shared/Buttons/InteractionConsole"
import PersonList from "./Shared/LandingPage/PersonList"
import TrailerModal from "./Shared/LandingPage/TrailerModal"
import Torrents from "./Torrents"

import { IoMdCalendar, IoIosTimer } from "react-icons/io"
import { BiPlay } from "react-icons/bi"

export default function FilmLanding() {
  const imgBaseUrl = "https://image.tmdb.org/t/p/original"
  const [isLoading, setIsLoading] = useState(false)
  const [movieDetails, setMovieDetails] = useState({})
  const [directors, setDirectors] = useState([]) //director
  const [crew, setCrew] = useState([]) //director of photography
  const [mainCast, setMainCast] = useState([]) //top 5 cast
  const [trailerLink, setTrailerLink] = useState(null)
  const [backdropColor, setBackdropColor] = useState([0, 0, 0])
  const [openTrailer, setOpenTrailer] = useState(false)
  const [torrentVisible, setTorrentVisible] = useState(false)
  const [ytsTorrents, setYtsTorrents] = useState([])
  const [filmRatings, setFilmRatings] = useState(null)
  const [filmAwards, setFilmAwards] = useState(null)

  const { authState, searchModalOpen, setSearchModalOpen } =
    useContext(AuthContext)
  const { tmdbId } = useParams()
  const navigate = useNavigate()

  function toggleSearchModal() {
    setSearchModalOpen((status) => !status)
  }
  useCommandKey(toggleSearchModal, "k")

  function toggleTorrentView() {
    setTorrentVisible((status) => !status)
  }
  useCommandKey(toggleTorrentView, "j")

  useEffect(() => {
    const timer = setTimeout(() => {
      window.scrollTo(0, 0)
    }, 0)
    return () => {
      clearTimeout(timer)
    }
  }, [isLoading])

  /* Fetch film info for Landing Page */
  useEffect(() => {
    const fetchPageData = async () => {
      if (tmdbId) {
        try {
          setSearchModalOpen(false) // close search modal if it's somehow open
          setIsLoading(true)
          const result = await fetchFilmFromTMDB(tmdbId)
          setMovieDetails(result)
        } catch (err) {
          console.error("Error loading film data: ", err)
        } finally {
          setIsLoading(false)
        }
      }
    }
    fetchPageData()
  }, [tmdbId])

  useEffect(() => {
    if (movieDetails.credits) {
      const directorsList = movieDetails.credits.crew.filter(
        (crewMember) => crewMember.job === "Director",
      )

      const crew = movieDetails.credits.crew
      const listOfUniqueCrewMembers = []
      crew.forEach((person) => {
        const crewMember = listOfUniqueCrewMembers.find(
          (member) => member.id === person.id,
        )
        if (crewMember !== undefined) {
          crewMember.jobs.push(person.job)
        } else {
          if (person.profile_path !== null) {
            listOfUniqueCrewMembers.push({
              id: person.id,
              name: person.name,
              profile_path: person.profile_path,
              jobs: [person.job],
            })
          }
        }
      })

      // Filter out cast who does not have profile pic, then pic top 15
      const castListFiltered = movieDetails.credits.cast.filter(
        (cast) => cast.profile_path !== null,
      )
      const mainCastList = castListFiltered.slice(
        0,
        Math.min(15, castListFiltered.length),
      )
      // Filter for YouTube trailers only
      const trailerLinks = movieDetails.videos.results.filter((video) => {
        return (
          // (video.site === "YouTube" || video.site === "Vimeo") &&
          video.type === "Trailer"
        )
      })
      // Sort trailers by newest to oldest
      const sortedTrailerLinks = trailerLinks.sort((a, b) => {
        const dateA = new Date(a.published_at)
        const dateB = new Date(b.published_at)
        return dateB - dateA
      })

      setDirectors(directorsList)
      setCrew(listOfUniqueCrewMembers)
      setMainCast(mainCastList)
      if (sortedTrailerLinks.length >= 1) {
        setTrailerLink(sortedTrailerLinks[0].key) // pick newest trailer
      } else {
        setTrailerLink(null)
      }
    }

    /* Once movie detail loads, set the overlay color based on poster dominant color */
    try {
      const backdrop = new Image()
      backdrop.crossOrigin = "anonymous"

      if (!movieDetails.backdrop_path) return

      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(`https://image.tmdb.org/t/p/w500${movieDetails.backdrop_path}`)}`
      backdrop.src = proxyUrl

      backdrop.onload = () => {
        const colorThief = new ColorThief()
        const domColor = colorThief.getColor(backdrop)
        setBackdropColor(darkenColorToOklch(domColor, 0.3))
      }
    } catch (err) {
      console.log(err)
    }
  }, [movieDetails])

  useEffect(() => {
    const fetchRatings = async () => {
      if (movieDetails.imdb_id) {
        try {
          const result = await fetchFilmRatingsFromOMDB(movieDetails.imdb_id)
          if (result.Response === "True") {
            setFilmRatings(result)
          }
        } catch (err) {
          console.error("Error loading ratings: ", err)
        }
      }
    }
    const fetchAwards = async () => {
      if (movieDetails.imdb_id) {
        try {
          const result = await fetchFilmAwardsFromWikidata(movieDetails.imdb_id)
          if (result.wins.length > 0 || result.nominations.length > 0) {
            setFilmAwards(result)
          }
        } catch (err) {
          console.error("Error loading awards: ", err)
        }
      }
    }
    fetchRatings()
    fetchAwards()
  }, [movieDetails])

  useEffect(() => {
    // console.log("in uef hook")
    const fetchYtsData = async () => {
      if (torrentVisible && movieDetails.imdb_id) {
        try {
          setIsLoading(true)
          const result = await fetchFilmFromYTS(movieDetails.imdb_id)
          // console.log("YTS response:", result.data.movie.torrents)
          setYtsTorrents(result.data.movie.torrents)
        } catch (err) {
          console.error("Error loading YTS data: ", err)
        } finally {
          setIsLoading(false)
        }
      }
    }
    fetchYtsData()
  }, [torrentVisible, movieDetails])

  // useEffect(() => {
  //   console.log("Trailer Link:", trailerLink)
  // }, [trailerLink])

  if (!movieDetails) {
    return <div>Error loading film. Please try again.</div>
  }

  return (
    <div className="font-primary mt-[4.5rem]">
      {isLoading && <LoadingPage />}

      {/* Quick Search Modal */}
      {searchModalOpen && (
        <QuickSearchModal
          searchModalOpen={searchModalOpen}
          setSearchModalOpen={setSearchModalOpen}
        />
      )}

      {/* Landing Page content */}
      <div className="w-screen h-auto flex flex-col justify-center">
        <div className="border-red-500 w-[100%] h-[90%] top-[5%] text-stone-200">
          <NavBar />

          {/* Backdrop section */}
          <div className="landing-main-img-container">
            {/* Main backdrop */}
            <img
              className="landing-main-img w-screen"
              src={
                movieDetails.backdrop_path !== null
                  ? `${imgBaseUrl}${movieDetails.backdrop_path}`
                  : `posternotfound.png`
              }
              alt=""
            />

            {/* Transparent layer top */}
            <div
              className="landing-transparent-layer"
              style={{
                background: `linear-gradient(to bottom, rgb(${backdropColor[0]}, ${backdropColor[1]}, ${backdropColor[2]}), transparent)`,
              }}></div>

            {/* All the text displayed over main backdrop */}
            <div className="">
              <div className="landing-img-text-container z-30">
                {/* Title */}
                {movieDetails.title && (
                  <div className="landing-page-title font-heading pb-2">
                    {movieDetails.title} &nbsp;
                    {/* {movieDetails.release_date && (
                      <span className="inline-block sm:hidden">{`(${getReleaseYear(movieDetails.release_date)})`}</span>
                    )} */}
                  </div>
                )}

                <div className="flex-col justify-start items-start gap-2 hidden sm:flex">
                  {/* Release Date */}
                  <div className="landing-img-text-belowTitle gap-2">
                    {movieDetails.release_date && (
                      <div className="flex gap-1 items-center">
                        <IoMdCalendar />
                        <span className="">{`${getReleaseYear(movieDetails.release_date)}`}</span>
                      </div>
                    )}
                    {movieDetails.runtime && (
                      <div className="flex gap-1 items-center">
                        <IoIosTimer />
                        <span className="">{`${movieDetails.runtime} minutes`}</span>
                      </div>
                    )}
                  </div>

                  {/* Director name(s) */}
                  {directors.length > 0 && (
                    <div className="landing-img-text-right">
                      {/* <span className="font-black text-base">|&nbsp;</span> */}
                      <span className="">Directed by:&nbsp;</span>
                      {directors.map((director, key) => {
                        return (
                          <span key={key}>
                            <span
                              className=" hover:text-blue-400 transition-all ease-out duration-200"
                              style={{ cursor: "pointer" }}
                              onClick={() => {
                                navigate(`/person/director/${director.id}`)
                              }}>{`${director.name}`}</span>
                            {/* Add a comma if it's not the last country on the list */}
                            {key !== directors.length - 1 && (
                              <span>,&nbsp;</span>
                            )}
                          </span>
                        )
                      })}
                    </div>
                  )}

                  {/* Origin Country */}
                  {movieDetails.origin_country &&
                    movieDetails.origin_country.length > 0 && (
                      <div className="landing-img-text-right ">
                        <span className="">Origin:&nbsp;</span>

                        {movieDetails.origin_country.map((country, key) => {
                          return (
                            <span key={key} className="whitespace-nowrap">
                              <span className="landing-img-text-right-content">{`${getCountryName(country)}`}</span>
                              {/* Add a comma if it's not the last country on the list */}
                              {key !==
                                movieDetails.origin_country.length - 1 && (
                                <span className="inline-block">,&nbsp;</span>
                              )}
                            </span>
                          )
                        })}
                      </div>
                    )}
                </div>
              </div>
              {/* trailer play button */}
              {trailerLink !== null && (
                <div className="absolute w-full h-full border-0 border-red-500 top-0 left-0 flex items-center justify-center">
                  <button
                    onClick={() => {
                      setOpenTrailer(true)
                    }}
                    className="flex items-center z-40 rounded-full p-3 pt-2 pb-2 drop-shadow-lg bg-white text-[var(--backdropColor)] hover:text-white hover:bg-[var(--backdropColor)] transition-all duration-300 ease-out"
                    style={{
                      "--backdropColor": `rgb(${backdropColor[0]}, ${backdropColor[1]}, ${backdropColor[2]})`,
                    }}>
                    <BiPlay className="text-3xl" />
                    <span className="text-base">Trailer</span>
                  </button>
                </div>
              )}
            </div>

            {/* Transparent layer bottom */}
            <div
              className="landing-transparent-layer-bottom"
              style={{
                background: `linear-gradient(to top, rgb(${backdropColor[0]}, ${backdropColor[1]}, ${backdropColor[2]}), transparent)`,
              }}></div>

            {/* Interaction console */}
            <div className="xl:hidden absolute bottom-0 w-full flex items-center justify-center mb-4">
              <InteractionConsole
                tmdbId={tmdbId}
                directors={directors}
                movieDetails={movieDetails}
                setIsLoading={setIsLoading}
                css={{
                  textColor: "oklch(92.3% 0.003 48.717)",
                  hoverBg: "none",
                  hoverTextColor: "oklch(70.7% 0.165 254.624)",
                  fontSize: "14px",
                  likeSize: "1.1rem",
                  saveSize: "1.6rem",
                  starSize: "1.4rem",
                  flexGap: "10px",
                  likeColor: "white",
                  saveColor: "white",
                  likedBgColor: "oklch(44.4% 0.177 26.899)",
                  savedBgColor: "oklch(44.8% 0.119 151.328)",
                  buttonPadding: "0px",
                  paddingTopBottom: "0px",
                  paddingLeftRight: "10px",
                  buttonHeight: "2.5rem",
                }}
                showOverview={false}
              />
            </div>
            <div className="hidden xl:block absolute bottom-0 w-full flex items-center justify-center mb-6">
              <InteractionConsole
                tmdbId={tmdbId}
                directors={directors}
                movieDetails={movieDetails}
                setIsLoading={setIsLoading}
                css={{
                  textColor: "oklch(92.3% 0.003 48.717)",
                  hoverBg: "none",
                  hoverTextColor: "oklch(70.7% 0.165 254.624)",
                  fontSize: "16px",
                  likeSize: "1.3rem",
                  saveSize: "1.8rem",
                  starSize: "1.6rem",
                  flexGap: "15px",
                  likeColor: "white",
                  saveColor: "white",
                  likedBgColor: "oklch(44.4% 0.177 26.899)",
                  savedBgColor: "oklch(44.8% 0.119 151.328)",
                  buttonPadding: "0px",
                  paddingTopBottom: "10px",
                  paddingLeftRight: "15px",
                  buttonHeight: "3rem",
                }}
                showOverview={false}
              />
            </div>
          </div>

          {/* Section below main backdrop */}
          <div className="flex flex-col items-start text-stone-900 gap-2 relative bg-stone-100 landing-belowBackdropPadding pb-30">
            <div className="flex flex-col">
              {/* Basic info -- sm breakpoint */}
              <div className="flex sm:hidden">
                <div className="p-4 pt-2">
                  {/* <span className="font-bold uppercase">Overview:&nbsp;</span> */}
                  <div className="landing-sectionTitle mb-1">Basic Info</div>
                  <div className="landing-sectionContent">
                    {/* Director name(s) */}
                    {directors.length > 0 && (
                      <div className="">
                        {/* <span className="font-black text-base">|&nbsp;</span> */}
                        <span className="font-thin lowercase">
                          Directed by:&nbsp;
                        </span>
                        {directors.map((director, key) => {
                          return (
                            <span key={key}>
                              <span
                                className=" hover:text-blue-800 transition-all ease-out duration-200"
                                style={{ cursor: "pointer" }}
                                onClick={() => {
                                  navigate(`/person/director/${director.id}`)
                                }}>{`${director.name}`}</span>
                              {/* Add a comma if it's not the last country on the list */}
                              {key !== directors.length - 1 && (
                                <span>,&nbsp;</span>
                              )}
                            </span>
                          )
                        })}
                      </div>
                    )}
                    {/* Release Date */}
                    <div className="">
                      {movieDetails.release_date && (
                        <div className="flex gap-1 items-center">
                          <span className="font-thin lowercase">
                            Release year:
                          </span>
                          <span className="">{`${getReleaseYear(movieDetails.release_date)}`}</span>
                        </div>
                      )}
                      {movieDetails.runtime && (
                        <div className="flex gap-1 items-center">
                          <span className="font-thin lowercase">Runtime:</span>

                          <span className="">{`${movieDetails.runtime} minutes`}</span>
                        </div>
                      )}
                    </div>

                    {/* Origin Country */}
                    {movieDetails.origin_country &&
                      movieDetails.origin_country.length > 0 && (
                        <div className="">
                          <span className="font-thin lowercase">
                            Origin:&nbsp;
                          </span>

                          {movieDetails.origin_country.map((country, key) => {
                            return (
                              <span key={key} className="whitespace-nowrap">
                                <span className="landing-img-text-right-content">{`${getCountryName(country)}`}</span>
                                {/* Add a comma if it's not the last country on the list */}
                                {key !==
                                  movieDetails.origin_country.length - 1 && (
                                  <span className="inline-block">,&nbsp;</span>
                                )}
                              </span>
                            )
                          })}
                        </div>
                      )}
                  </div>
                </div>
              </div>

              {/* Overview section */}
              <div className="flex flex-col items-start justify-start ">
                {movieDetails.overview && (
                  <div className="p-4 pt-2">
                    {/* <span className="font-bold uppercase">Overview:&nbsp;</span> */}
                    <div className="landing-sectionTitle mb-1">overview</div>
                    <div className="landing-sectionContent">
                      {movieDetails.overview}
                    </div>
                  </div>
                )}
              </div>

              {/* Torrents will show here */}
              {torrentVisible && ytsTorrents && (
                <Torrents ytsTorrents={ytsTorrents} />
              )}

              {/* Ratings & Awards section */}
              {(filmRatings || filmAwards) && (
                <div className="p-4 pt-2">
                  <div className="landing-sectionTitle mb-2">
                    ratings & awards
                  </div>

                  <div className="flex flex-col justify-center items-start gap-2">
                    {/* Ratings section */}
                    {filmRatings && (
                      <div className="flex flex-wrap gap-2">
                        {filmRatings.imdbRating &&
                          filmRatings.imdbRating !== "N/A" && (
                            <div className="flex flex-col items-start gap-0.5 border-1 p-3 rounded-sm bg-[#f5c518]/85 border-[#f5c518]">
                              <span className="flex justify-start items-center gap-2">
                                <span className="landing-ratingsTitle">
                                  IMDb
                                </span>
                                {filmRatings.imdbVotes &&
                                  filmRatings.imdbVotes !== "N/A" && (
                                    <span className="text-stone-900 text-xs lg:text-sm font-thin">
                                      {filmRatings.imdbVotes} votes
                                    </span>
                                  )}
                              </span>
                              <div className="flex items-baseline gap-1">
                                <span className="text-sm lg:text-base">★</span>
                                <span className="text-stone-900 font-semibold text-base lg:text-lg leading-none">
                                  {filmRatings.imdbRating}
                                </span>
                                <span className="text-stone-900 text-xs lg:text-sm font-thin">
                                  /10
                                </span>
                              </div>
                            </div>
                          )}
                        {filmRatings.Ratings?.find(
                          (r) => r.Source === "Rotten Tomatoes",
                        ) && (
                          <div className="flex flex-col items-start gap-0.5 border-1 p-3 rounded-sm bg-[#fa320a]/85 border-[#fa320a]">
                            <span className="landing-ratingsTitle">
                              Rotten Tomatoes
                            </span>
                            <div className="flex items-baseline gap-1">
                              <span className="text-sm lg:text-base">🍅</span>
                              <span className="text-stone-900 font-semibold text-base lg:text-lg  leading-none">
                                {
                                  filmRatings.Ratings.find(
                                    (r) => r.Source === "Rotten Tomatoes",
                                  ).Value
                                }
                              </span>
                            </div>
                          </div>
                        )}
                        {filmRatings.Ratings?.find(
                          (r) => r.Source === "Metacritic",
                        ) &&
                          (() => {
                            const score = parseInt(
                              filmRatings.Ratings.find(
                                (r) => r.Source === "Metacritic",
                              ).Value,
                            )
                            const color =
                              score >= 75
                                ? "bg-green-600"
                                : score >= 50
                                  ? "bg-yellow-500"
                                  : "bg-red-600"
                            return (
                              <div className="flex flex-col items-start gap-0.5 border-1 p-3 rounded-sm bg-[#1a4575]/85 border-[#1a4575]">
                                <span className="landing-ratingsTitle">
                                  Metacritic
                                </span>
                                <div className="flex items-center gap-2 mt-1">
                                  <span
                                    className={`${color} text-white font-bold text-sm lg:text-base px-2 py-0.5 rounded`}>
                                    {score}
                                  </span>
                                  <span className="text-stone-900 text-xs lg:text-sm font-thin">
                                    /100
                                  </span>
                                </div>
                              </div>
                            )
                          })()}
                      </div>
                    )}

                    {/* Awards section */}
                    {filmAwards && (
                      <div className="text-stone-900 border-1 p-5 py-4 rounded-sm w-fit bg-lime-300 border-lime-300">
                        {/* <div className="landing-sectionTitle mb-2">awards</div> */}
                        {filmAwards.wins.length > 0 && (
                          <div className="mb-3">
                            <div className="text-base lg:text-lg  uppercase font-bold mb-1">
                              Won
                            </div>
                            <ul className="flex flex-col gap-1">
                              {filmAwards.wins.map((w, i) => (
                                <li
                                  key={i}
                                  className="flex items-baseline gap-1">
                                  {/* <span className="text-yellow-500 text-xs">
                                  ★
                                </span> */}
                                  <span className="text-stone-900 text-sm lg:text-base">
                                    {w.award}
                                  </span>
                                  {w.year && (
                                    <span className="text-stone-900 text-xs lg:text-sm font-thin">
                                      {w.year}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {filmAwards.nominations.length > 0 && (
                          <div>
                            <div className="text-base lg:text-lg  uppercase font-bold mb-1">
                              Nominated
                            </div>
                            <ul className="flex flex-col gap-1">
                              {filmAwards.nominations.map((n, i) => (
                                <li
                                  key={i}
                                  className="flex items-baseline gap-1">
                                  {/* <span className="text-stone-900 text-xs">
                                  ○
                                </span> */}
                                  <span className="text-stone-900 text-sm lg:text-base">
                                    {n.award}
                                  </span>
                                  {n.year && (
                                    <span className="text-stone-900 text-xs lg:text-sm font-thin">
                                      {n.year}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Cast and crew section */}
              <div className="flex flex-col items-start justify-start gap-2">
                {mainCast.length > 0 && (
                  <PersonList
                    title="main cast"
                    listOfPeople={mainCast}
                    type="cast"
                  />
                )}
                {crew.length > 0 && (
                  <PersonList
                    title="main crew"
                    listOfPeople={crew}
                    type="crew"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Trailer modal */}
          {openTrailer && (
            <TrailerModal
              trailerLink={trailerLink}
              closeModal={() => {
                setOpenTrailer(false)
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// {
//   trailerLink !== null && (
//     <div className="hidden md:block h-[15rem] aspect-16/9 border-0">
//       {/* <div className="landing-sectionTitle p-0 pb-2">
//                         trailer
//                       </div> */}
//       <iframe
//         className=""
//         width="100%"
//         height="100%"
//         src={`https://www.youtube.com/embed/${trailerLink}`}
//         title="YouTube video player"
//         allowFullScreen></iframe>
//     </div>
//   )
// }

// ;<div
//   className="absolute top-0 aspect-16/9 w-screen
//            h-screen border-2 border-blue-500 mb-10 bg-stone-100 z-50">
//   <iframe
//     className=""
//     width="100%"
//     height="100%"
//     src={`https://www.youtube.com/embed/${trailerLink}?autoplay=1&mute=1&playsinline=1`}
//     title="YouTube video player"
//     allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
//     allowFullScreen></iframe>
// </div>

{
  /* <div className="p-4 pt-1 md:flex md:w-full md:gap-5">
                  <div className="">
                    <img
                      ref={posterRef}
                      className="w-[12rem] md:w-[auto] md:h-[15rem] aspect-2/3 object-cover scale-[1] mb-5 border-0 rounded-none z-30 drop-shadow-sm"
                      src={
                        movieDetails.poster_path !== null
                          ? `${imgBaseUrl}${movieDetails.poster_path}`
                          : `posternotfound.png`
                      }
                      alt=""
                    />
                  </div>
                </div> */
}
