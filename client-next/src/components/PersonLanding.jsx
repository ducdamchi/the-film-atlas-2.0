/* Libraries */
import React, { useEffect, useState, useContext } from "react"
import { useParams } from "@tanstack/react-router"

/* Custom functions */
import { AuthContext } from "../Utils/authContext"

import { getNiceMonthDateYear, getAge } from "../Utils/helperFunctions"
import { fetchPersonFromTMDB, checkDirectorStatus } from "../Utils/apiCalls"
import useCommandKey from "../Hooks/useCommandKey"
import { usePersistedState } from "../Hooks/usePersistedState"

/* Components */
import NavBar from "./Shared/Navigation-Search/NavBar"
import LoadingPage from "./Shared/Navigation-Search/LoadingPage"
import QuickSearchModal from "./Shared/Navigation-Search/QuickSearchModal"
import FilmTMDB_Gallery from "./Shared/Films/FilmTMDB_Gallery"

export default function PersonLanding() {
  const imgBaseUrl = "https://image.tmdb.org/t/p/original"
  const [isLoading, setIsLoading] = useState(false)
  const [personDetails, setPersonDetails] = useState({})
  const [filmography, setFilmography] = useState({})
  const { job, tmdbId } = useParams({ strict: false })
  const [scrollPosition, setScrollPosition] = usePersistedState(
    `${job}Landing-scrollPosition`,
    0,
  )
  const [numWatched, setNumWatched] = useState(0)
  const [numStarred, setNumStarred] = useState(0)
  const [highestStar, setHighestStar] = useState(0)
  const [score, setScore] = useState(0)
  const [avgRating, setAvgRating] = useState(0)

  const { authState, searchModalOpen, setSearchModalOpen } =
    useContext(AuthContext)

  function toggleSearchModal() {
    setSearchModalOpen((status) => !status)
  }
  useCommandKey(toggleSearchModal, "k")

  async function fetchPageData() {
    try {
      setSearchModalOpen(false)
      setIsLoading(true)
      const result = await fetchPersonFromTMDB(tmdbId)
      let filmography
      // Filter out films where the director's job is not 'director'

      // console.log("Films done:", result.movie_credits)

      if (job === "director") {
        filmography = result.movie_credits.crew.filter(
          (film) => film.job === "Director",
        )
      }

      if (job === "actor") {
        filmography = result.movie_credits.cast
      }

      // Filter out films without backdrop or poster path
      let filteredFilmography = filmography.filter(
        (film) => !(film.backdrop_path === null || film.poster_path === null),
      )

      // If director is deceased, filter out films released after their deathdate
      if (result.deathday !== null) {
        const deathDate = new Date(result.deathday)
        filteredFilmography = filteredFilmography.filter((film) => {
          if (!film.release_date) return false
          const filmDate = new Date(film.release_date)
          return filmDate <= deathDate
        })
      }

      // Sort by most recent release date -> least recent
      const sortedFilmography = filteredFilmography.sort((a, b) => {
        const dateA = parseInt(a.release_date?.replace("-", ""))
        const dateB = parseInt(b.release_date?.replace("-", ""))
        return dateB - dateA
      })

      setPersonDetails(result)
      setFilmography(sortedFilmography)
    } catch (err) {
      console.error("Error loading film data: ", err)
    } finally {
      setIsLoading(false)
    }
  }
  async function fetchUserInteraction() {
    try {
      setIsLoading(true)
      const result = await checkDirectorStatus(tmdbId)

      if (result.error) {
        console.error("Server: ", saveResult.error)
      } else {
        // console.log("Result:", result)
        setNumWatched(result.watched)
        setNumStarred(result.starred)
        setHighestStar(result.highest_star)
        setScore(result.score)
        setAvgRating(result.avg_rating)
      }
    } catch (err) {
      console.error("Error loading director data: ", err)
    } finally {
      setIsLoading(false)
    }
  }

  /* Hook for scroll restoration */
  useEffect(() => {
    // console.log("Loading state: ", isLoading)
    if (!isLoading) {
      if (scrollPosition) {
        // use setTimeout as a temporary solution to make sure page content fully loads before scroll restoration starts. When watched/rated films become a lot, the 300ms second might not be enough and a new solution will be required.
        setTimeout(() => {
          window.scrollTo(0, parseInt(scrollPosition, 10))
        }, 50)
      } else {
        setTimeout(() => {
          window.scrollTo(0, 0)
        }, 0)
      }

      const handleScroll = () => {
        setScrollPosition(window.scrollY)
      }

      const scrollTimer = setTimeout(() => {
        window.addEventListener("scroll", handleScroll)
      }, 500)

      return () => {
        clearTimeout(scrollTimer)
        window.removeEventListener("scroll", handleScroll)
      }
    }
  }, [isLoading])

  /* Fetch director's info for Landing Page, and fetch user interaction from app's DB if user is logged in. */
  useEffect(() => {
    if (tmdbId) {
      fetchPageData()
      if (authState.status && job === "director") {
        fetchUserInteraction()
      }
    }
    // setScrollPosition(0)
  }, [tmdbId])

  if (!personDetails) {
    return <div>{`Error loading ${job} landing page. Please try again.`}</div>
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
      <NavBar />

      {/* Text over backdrop */}
      <div className="landing-main-img-container">
        <div className="flex w-screen grayscale">
          <img
            className="landing-main-img w-screen sm:w-[50%] xl:w-[33.3333%]"
            src={
              personDetails.profile_path !== null
                ? `${imgBaseUrl}${personDetails.profile_path}`
                : `profilepicnotfound.jpg`
            }
            alt=""
          />
          <img
            className="hidden sm:block landing-main-img w-[50%] xl:w-[33.3333%]"
            src={
              personDetails.profile_path !== null
                ? `${imgBaseUrl}${personDetails.profile_path}`
                : `profilepicnotfound.jpg`
            }
            alt=""
          />
          <img
            className="hidden xl:block landing-main-img w-[33.3333%]"
            src={
              personDetails.profile_path !== null
                ? `${imgBaseUrl}${personDetails.profile_path}`
                : `profilepicnotfound.jpg`
            }
            alt=""
          />
        </div>

        <div
          className="landing-transparent-layer"
          style={{
            background: `linear-gradient(to bottom, rgb(0, 0,0), transparent)`,
          }}></div>
        <div className="">
          <div className="landing-img-text-container">
            {/* Title */}
            {personDetails.name && (
              <div className="landing-page-title font-heading">
                {personDetails.name}
              </div>
            )}

            <div className="flex flex-col justify-start items-start gap-2">
              {/* Birthday, deathday, age */}
              <div className="landing-img-text-belowTitle gap-0">
                {personDetails.birthday && (
                  <div className="">
                    <span>{`${getNiceMonthDateYear(personDetails.birthday)}`}</span>
                  </div>
                )}

                {personDetails.deathday && (
                  <div className="">
                    <span className="">&nbsp;-&nbsp;</span>
                    <span>{`${getNiceMonthDateYear(personDetails.deathday)}`}</span>
                  </div>
                )}

                <span>
                  &nbsp;
                  {`(${getAge(personDetails.birthday, personDetails.deathday)})`}
                </span>
              </div>

              {/* Birthplace*/}
              {personDetails.place_of_birth && (
                <div className="landing-img-text-right">
                  <span className="">Born in&nbsp;</span>

                  <span className="landing-img-text-right-content">
                    {`${personDetails.place_of_birth.slice(0, 40)}`}
                    {personDetails.place_of_birth.length >= 40 && (
                      <span>...</span>
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* {personDetails.known_for.map((filmObject, key) => (
              <span key={key}>
                <span className="">
                  {filmObject?.title ||
                    filmObject?.name ||
                    filmObject?.original_title}
                </span>
                {key !== directorObject.known_for.length - 1 && (
                  <span className="">,&nbsp;</span>
                )}
              </span>
            ))} */}
          </div>
        </div>
        <div
          className="landing-transparent-layer-bottom"
          style={{
            background: `linear-gradient(to top, rgb(0, 0,0), transparent)`,
          }}></div>
        {job === "director" && (
          <div className="absolute bottom-0 w-full flex items-center justify-center gap-2 text-stone-200 text-[12px] mb-4 xl:text-[16px] xl:mb-6">
            <div className="border-1 p-2 rounded-full backdrop-blur-2xl">{`Watched: ${numWatched}`}</div>
            <div className="border-1 p-2 rounded-full backdrop-blur-2xl">{`Starred: ${numStarred}`}</div>
            <div className="border-1 p-2 rounded-full backdrop-blur-2xl">{`Avg. Stars: ${avgRating}`}</div>
            <div className="border-1 p-2 rounded-full backdrop-blur-2xl">{`Score: ${score}`}</div>
          </div>
        )}
      </div>

      {/* Text below backdrop */}
      <div className="flex text-stone-900 bg-stone-100 landing-belowBackdropPadding">
        {personDetails.biography && (
          <div className="flex flex-col items-start justify-start p-4 pt-2">
            <div className="landing-sectionTitle mb-1 ">Biography</div>
            <div className="landing-sectionContent">{`${personDetails.biography}`}</div>
          </div>
        )}
      </div>

      {/* Directed Films */}
      <div className=" w-screen flex flex-col items-center justify-start bg-stone-100">
        <div className="landing-sectionTitle self-start ml-4 md:ml-8 lg:ml-12 2xl:ml-20 pl-4">
          filmography
        </div>
        <FilmTMDB_Gallery listOfFilmObjects={filmography} />
      </div>
    </div>
  )
}
