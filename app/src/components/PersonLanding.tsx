/* Libraries */
import { useEffect, useMemo } from "react"
import { useParams } from "@tanstack/react-router"
import { useSuspenseQuery, useQuery } from "@tanstack/react-query"

/* Custom functions */
import { useAuth } from "../utils/authContext"
import { useApp } from "../utils/appContext"
import { getNiceMonthDateYear, getAge } from "../utils/helperFunctions"
import {
  personQueryOptions,
  directorStatusQueryOptions,
} from "../queries/person.queries"
import { computeDirectorScore } from "@/utils/directorScore"
/* Types */
import type { TMDBPerson, TMDBFilmSummary } from "@/types/tmdb"

/* Components */
import TmdbFilmGallery from "./films/TmdbFilmGallery"

export default function PersonLanding() {
  const imgBaseUrl = import.meta.env.VITE_TMDB_IMG_URL
  const { job, tmdbId } = useParams({ strict: false })

  const { authState } = useAuth()
  const { setSearchModalOpen } = useApp()

  // Close search modal on mount/navigation
  useEffect(() => {
    setSearchModalOpen(false)
  }, [tmdbId])

  // Person data — loader pre-filled cache
  const { data: personDetails } = useSuspenseQuery(personQueryOptions(tmdbId!))
  const person = personDetails as TMDBPerson

  // Director interaction stats — auth and job-conditional
  const { data: directorStatus } = useQuery({
    ...directorStatusQueryOptions(tmdbId!),
    enabled: !!authState.status && job === "director",
  })
  const numWatched = directorStatus?.watched ?? 0
  const numStarred = directorStatus?.starred ?? 0
  const avgRating = directorStatus?.avg_rating ?? 0
  const score = directorStatus
    ? computeDirectorScore({
        num_watched_films: numWatched,
        num_starred_films: numStarred,
        num_stars_total: directorStatus.num_stars_total ?? 0,
      })
    : 0

  useEffect(() => {
    console.log(directorStatus)
  }, [directorStatus])

  // Filmography derivation — pure transform from person data, no async
  const filmography = useMemo<TMDBFilmSummary[]>(() => {
    let list: TMDBFilmSummary[] | undefined

    if (job === "director") {
      list = person.movie_credits?.crew?.filter(
        (film) =>
          (film as TMDBFilmSummary & { job?: string }).job === "Director",
      )
    } else if (job === "actor") {
      list = person.movie_credits?.cast
    }

    if (!list) return []

    let filtered = list.filter(
      (film) => !(film.backdrop_path === null || film.poster_path === null),
    )

    if (person.deathday) {
      const deathDate = new Date(person.deathday)
      filtered = filtered.filter((film) => {
        if (!film.release_date) return false
        return new Date(film.release_date) <= deathDate
      })
    }

    return filtered.sort((a, b) => {
      const dateA = parseInt((a.release_date ?? "").replace("-", ""))
      const dateB = parseInt((b.release_date ?? "").replace("-", ""))
      return dateB - dateA
    })
  }, [personDetails, job])

  return (
    <div className="font-primary">
      {/* Text over backdrop */}
      <div className="landing-main-img-container text-background">
        <div className="flex w-screen grayscale">
          <img
            loading="lazy"
            className="landing-main-img w-screen sm:w-[50%] xl:w-[33.3333%]"
            src={
              person.profile_path !== null
                ? `${imgBaseUrl}${person.profile_path}`
                : `/picnotfound.jpg`
            }
            alt=""
          />
          <img
            loading="lazy"
            className="hidden sm:block landing-main-img w-[50%] xl:w-[33.3333%]"
            src={
              person.profile_path !== null
                ? `${imgBaseUrl}${person.profile_path}`
                : `/picnotfound.jpg`
            }
            alt=""
          />
          <img
            loading="lazy"
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
                    {person.place_of_birth.length >= 40 && <span>...</span>}
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
          <div className="absolute bottom-0 w-full flex items-center justify-center gap-2 text-light text-[12px] mb-4 xl:text-[16px] xl:mb-6">
            <div className="border-1 p-2 rounded-full backdrop-blur-2xl">{`Watched: ${numWatched}`}</div>
            <div className="border-1 p-2 rounded-full backdrop-blur-2xl">{`Starred: ${numStarred}`}</div>
            <div className="border-1 p-2 rounded-full backdrop-blur-2xl">{`Avg. Stars: ${avgRating}`}</div>
            <div className="border-1 p-2 rounded-full backdrop-blur-2xl">{`Score: ${score.toFixed(2)}`}</div>
          </div>
        )}
      </div>

      {/* Text below backdrop */}
      <div className="flex text-dark bg-page landing-belowBackdropPadding">
        {person.biography && (
          <div className="flex flex-col items-start justify-start p-4 pt-2">
            <div className="landing-sectionTitle mb-1 ">Biography</div>
            <div className="landing-sectionContent">{`${person.biography}`}</div>
          </div>
        )}
      </div>

      {/* Filmography */}
      <div className="@container w-screen flex flex-col items-center justify-start bg-page">
        <div className="landing-sectionTitle self-start ml-4 md:ml-8 lg:ml-12 2xl:ml-20 pl-4">
          filmography
        </div>
        <TmdbFilmGallery listOfFilmObjects={filmography} />
      </div>
    </div>
  )
}
