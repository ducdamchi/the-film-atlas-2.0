/* Libraries */
import { useEffect, useState } from "react"
import { useParams } from "@tanstack/react-router"

/* Custom functions */
import { useAuth } from "../Utils/authContext"
import { getNiceMonthDateYear, getAge } from "../Utils/helperFunctions"
import { fetchPersonFromTMDB, checkDirectorStatus } from "../Utils/apiCalls"
import useCommandKey from "../Hooks/useCommandKey"
import { usePersistedState } from "../Hooks/usePersistedState"

/* Types */
import type { TMDBPerson, TMDBFilmSummary } from "@/types/tmdb"

/* Components */
import NavBar from "./Shared/layout/NavBar"
import LoadingPage from "./Shared/layout/LoadingPage"
import QuickSearchModal from "./Shared/layout/QuickSearchModal"
import TmdbFilmGallery from "./Shared/Films/TmdbFilmGallery"

export default function PersonLanding() {
  const imgBaseUrl = "https://image.tmdb.org/t/p/original"
  const [isLoading, setIsLoading] = useState(false)
  const [personDetails, setPersonDetails] = useState<TMDBPerson | Record<string, never>>({})
  const [filmography, setFilmography] = useState<TMDBFilmSummary[]>([])
  const { job, tmdbId } = useParams({ strict: false })
  const [scrollPosition, setScrollPosition] = usePersistedState<number>(
    `${job}Landing-scrollPosition`,
    0,
  )
  const [numWatched, setNumWatched] = useState(0)
  const [numStarred, setNumStarred] = useState(0)
  const [highestStar, setHighestStar] = useState(0)
  const [score, setScore] = useState(0)
  const [avgRating, setAvgRating] = useState(0)

  const { authState, searchModalOpen, setSearchModalOpen } = useAuth()

  function toggleSearchModal() {
    setSearchModalOpen((status) => !status)
  }
  useCommandKey(toggleSearchModal, "k")

  async function fetchPageData() {
    try {
      setSearchModalOpen(false)
      setIsLoading(true)
      const result = await fetchPersonFromTMDB(tmdbId)
      let filmographyList: TMDBFilmSummary[] | undefined

      if (job === "director") {
        filmographyList = result.movie_credits.crew.filter(
          (film) => (film as TMDBFilmSummary & { job?: string }).job === "Director",
        )
      }

      if (job === "actor") {
        filmographyList = result.movie_credits.cast
      }

      if (!filmographyList) {
        setPersonDetails(result)
        setFilmography([])
        return
      }

      // Filter out films without backdrop or poster path
      let filteredFilmography = filmographyList.filter(
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
        const dateA = parseInt((a.release_date ?? "").replace("-", ""))
        const dateB = parseInt((b.release_date ?? "").replace("-", ""))
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
      setNumWatched(result.watched)
      setNumStarred(result.starred)
      setHighestStar(result.highest_star)
      setScore(result.score)
      setAvgRating(result.avg_rating ?? 0)
    } catch (err) {
      console.error("Error loading director data: ", err)
    } finally {
      setIsLoading(false)
    }
  }

  /* Hook for scroll restoration */
  useEffect(() => {
    if (!isLoading) {
      if (scrollPosition) {
        setTimeout(() => {
          window.scrollTo(0, parseInt(String(scrollPosition), 10))
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

  /* Fetch director's info for Landing Page */
  useEffect(() => {
    if (tmdbId) {
      fetchPageData()
      if (authState.status && job === "director") {
        fetchUserInteraction()
      }
    }
  }, [tmdbId])

  const person = personDetails as TMDBPerson

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
              person.profile_path !== null
                ? `${imgBaseUrl}${person.profile_path}`
                : `/picnotfound.jpg`
            }
            alt=""
          />
          <img
            className="hidden sm:block landing-main-img w-[50%] xl:w-[33.3333%]"
            src={
              person.profile_path !== null
                ? `${imgBaseUrl}${person.profile_path}`
                : `/picnotfound.jpg`
            }
            alt=""
          />
          <img
            className="hidden xl:block landing-main-img w-[33.3333%]"
            src={
              person.profile_path !== null
                ? `${imgBaseUrl}${person.profile_path}`
                : `/picnotfound.jpg`
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
            {person.name && (
              <div className="landing-page-title font-heading">
                {person.name}
              </div>
            )}

            <div className="flex flex-col justify-start items-start gap-2">
              {/* Birthday, deathday, age */}
              <div className="landing-img-text-belowTitle gap-0">
                {person.birthday && (
                  <div className="">
                    <span>{`${getNiceMonthDateYear(person.birthday)}`}</span>
                  </div>
                )}

                {person.deathday && (
                  <div className="">
                    <span className="">&nbsp;-&nbsp;</span>
                    <span>{`${getNiceMonthDateYear(person.deathday)}`}</span>
                  </div>
                )}

                <span>
                  &nbsp;
                  {`(${getAge(person.birthday, person.deathday)})`}
                </span>
              </div>

              {/* Birthplace */}
              {person.place_of_birth && (
                <div className="landing-img-text-right">
                  <span className="">Born in&nbsp;</span>

                  <span className="landing-img-text-right-content">
                    {`${person.place_of_birth.slice(0, 40)}`}
                    {person.place_of_birth.length >= 40 && (
                      <span>...</span>
                    )}
                  </span>
                </div>
              )}
            </div>
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
        {person.biography && (
          <div className="flex flex-col items-start justify-start p-4 pt-2">
            <div className="landing-sectionTitle mb-1 ">Biography</div>
            <div className="landing-sectionContent">{`${person.biography}`}</div>
          </div>
        )}
      </div>

      {/* Filmography */}
      <div className=" w-screen flex flex-col items-center justify-start bg-stone-100">
        <div className="landing-sectionTitle self-start ml-4 md:ml-8 lg:ml-12 2xl:ml-20 pl-4">
          filmography
        </div>
        <TmdbFilmGallery listOfFilmObjects={filmography} />
      </div>
    </div>
  )
}
