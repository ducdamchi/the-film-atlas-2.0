/* Libraries */
import { useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "@tanstack/react-router"
import { useSuspenseQuery, useQuery } from "@tanstack/react-query"

/* Custom functions */
import { useAuth } from "../../utils/authContext"
import { useApp } from "../../utils/appContext"
import { getNiceMonthDateYear, getAge } from "../../utils/helperFunctions"
import { Cake, MapPinned, Skull } from "lucide-react"
import { GiGraveFlowers } from "react-icons/gi"
import {
  personQueryOptions,
  directorStatusQueryOptions,
} from "../../queries/person.queries"
import { computeDirectorScore } from "@/utils/directorScore"

/* Types */
import type { TMDBPerson, TMDBFilmSummary } from "@/types/tmdb"

/* Components */
import TmdbFilmGallery from "../../components/film/TmdbFilmGallery"

const BIO_WORD_LIMIT = 60

export default function PersonLanding({ job }: { job: "director" | "actor" }) {
  const imgBaseUrl = import.meta.env.VITE_TMDB_IMG_URL
  const { tmdbId } = useParams({ strict: false })

  const { authState } = useAuth()
  const { setSearchModalOpen } = useApp()

  useEffect(() => {
    setSearchModalOpen(false)
    window.scrollTo(0, 0)
  }, [tmdbId])

  const { data: personDetails } = useSuspenseQuery(personQueryOptions(tmdbId!))
  const person = personDetails as TMDBPerson

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

  const [bioExpanded, setBioExpanded] = useState(false)
  const [bioColMaxH, setBioColMaxH] = useState<number | undefined>()
  const bioColRef = useRef<HTMLDivElement>(null)

  function expandBio() {
    if (bioColRef.current) {
      setBioColMaxH(bioColRef.current.getBoundingClientRect().height)
    }
    setBioExpanded(true)
  }

  const profileSrc =
    person.profile_path !== null
      ? `${imgBaseUrl}${person.profile_path}`
      : `/picnotfound.jpg`

  return (
    <div className="@container font-primary">
      {/* ── Hero ── */}
      <div className="overflow-hidden relative min-h-screen">
        {/* Tiled portrait images: 1 on mobile, 2 on sm, 3 on xl */}
        <div className="absolute inset-0 flex grayscale">
          <img
            loading="lazy"
            className="w-full @3xl:w-[50%] @7xl:w-[33.3333%] h-full object-cover object-top brightness-80 shrink-0"
            src={profileSrc}
            alt=""
          />
          <img
            loading="lazy"
            className="hidden @3xl:block @7xl:w-[33.3333%] w-[50%] h-full object-cover object-top brightness-80 shrink-0"
            src={profileSrc}
            alt=""
          />
          <img
            loading="lazy"
            className="hidden @7xl:block w-[33.3333%] h-full object-cover object-top brightness-80 shrink-0"
            src={profileSrc}
            alt=""
          />
        </div>

        {/* Bottom gradient */}
        <div
          className="absolute bottom-0 left-0 w-full h-[45%] @7xl:h-[35%]"
          style={{ background: "linear-gradient(to top, black, transparent)" }}
        />

        {/* ── 3-column overlay ── */}
        <div className="absolute bottom-0 left-0 w-full z-30 grid grid-cols-1 @3xl:grid-cols-2 @5xl:grid-cols-3 px-4 pb-4 gap-4">
          {/* LEFT */}
          <div className="p-4 min-h-40 rounded flex flex-col justify-start gap-0 border-0">
            <section className="mb-4 flex flex-col gap-0.5">
              {/* Name */}
              {person.name && (
                <h1 className="uppercase landing-page-title font-heading text-background">
                  {person.name}
                </h1>
              )}
            </section>

            <section className="flex flex-col gap-0.5">
              {/* Born */}
              {person.birthday && (
                <div className="flex flex-wrap gap-x-2 text-sm font-extralight text-background">
                  <span className="inline-flex items-center gap-x-1">
                    <Cake size={16} className="shrink-0" />
                    <span>
                      {getNiceMonthDateYear(person.birthday)}
                      {!person.deathday && (
                        <span className="text-background/55">
                          {" "}
                          ({getAge(person.birthday, person.deathday)})
                        </span>
                      )}
                    </span>
                  </span>
                </div>
              )}

              {/* Died */}
              {person.deathday && (
                <div className="flex flex-wrap gap-x-2 text-sm font-extralight text-background">
                  <span className="inline-flex items-center gap-x-1">
                    <GiGraveFlowers size={16} className="shrink-0" />
                    <span>
                      {getNiceMonthDateYear(person.deathday)}
                      <span className="text-background/55">
                        {" "}
                        ({getAge(person.birthday, person.deathday)})
                      </span>
                    </span>
                  </span>
                </div>
              )}

              {/* Birthplace */}
              {person.place_of_birth && (
                <div className="flex flex-wrap gap-x-2 text-sm font-extralight text-background">
                  <span className="inline-flex items-center gap-x-1">
                    <MapPinned size={16} className="shrink-0" />
                    <span>{person.place_of_birth}</span>
                  </span>
                </div>
              )}
            </section>

            {/* Condensed stats pills — visible only when right col is hidden (< @7xl) */}
            {job === "director" && (
              <div className="@5xl:hidden flex flex-wrap gap-1 mt-5">
                <div className="border-1 border-background/40 text-background text-xs p-1.5 px-3 rounded-full backdrop-blur-2xl">
                  Watched: {numWatched}
                </div>
                <div className="border-1 border-background/40 text-background text-xs p-1.5 px-3 rounded-full backdrop-blur-2xl">
                  Starred: {numStarred}
                </div>
                <div className="border-1 border-background/40 text-background text-xs p-1.5 px-3 rounded-full backdrop-blur-2xl">
                  Avg. Stars: {avgRating}
                </div>
                <div className="border-1 border-background/40 text-background text-xs p-1.5 px-3 rounded-full backdrop-blur-2xl">
                  Score: {score.toFixed(2)}
                </div>
              </div>
            )}
          </div>

          {/* MID — md and up */}
          <div
            ref={bioColRef}
            className="hidden @3xl:flex flex-col justify-start gap-1 border-0 p-4 min-h-40 rounded"
            style={bioColMaxH ? { maxHeight: bioColMaxH } : undefined}>
            <span className="font-heading text-sm font-extrabold text-background uppercase">
              Biography
            </span>

            {person.biography &&
              (() => {
                const words = person.biography.split(" ")
                const isTruncated =
                  !bioExpanded && words.length > BIO_WORD_LIMIT
                return (
                  <div
                    className={
                      bioExpanded
                        ? "flex-1 min-h-0 overflow-y-auto pr-1"
                        : undefined
                    }>
                    <p className="text-sm text-background leading-snug font-extralight">
                      {isTruncated
                        ? words.slice(0, BIO_WORD_LIMIT).join(" ")
                        : person.biography}
                      {isTruncated && (
                        <>
                          {"… "}
                          <button
                            onClick={expandBio}
                            className="text-white/50 hover:text-white transition-colors cursor-pointer">
                            more
                          </button>
                        </>
                      )}
                    </p>
                  </div>
                )
              })()}
          </div>

          {/* RIGHT — xl and up */}
          <div className="hidden @5xl:flex flex-col justify-start gap-1 border-0 p-4 min-h-40  rounded">
            {job === "director" && (
              <>
                <span className="font-heading text-sm font-extrabold text-background uppercase">
                  Stats
                </span>
                <div className="grid grid-cols-4 gap-1.5 mt-1 min-w-[300px]">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-extrabold text-background/50 uppercase">
                      Watched
                    </span>
                    <span className="text-2xl font-heading font-extrabold text-background">
                      {numWatched}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-extrabold text-background/50 uppercase">
                      Starred
                    </span>
                    <span className="text-2xl font-heading font-extrabold text-background">
                      {numStarred}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-extrabold text-background/50 uppercase">
                      Avg. Stars
                    </span>
                    <span className="text-2xl font-heading font-extrabold text-background">
                      {avgRating}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-extrabold text-background/50 uppercase">
                      Score
                    </span>
                    <span className="text-2xl font-heading font-extrabold text-background">
                      {score.toFixed(2)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Below-fold ── */}
      <div className="flex flex-col items-start text-dark gap-2 relative bg-page landing-belowBackdropPadding pb-30 w-full">
        {/* Biography fallback — only at < md */}
        <div className="@3xl:hidden">
          {person.biography && (
            <div className="p-4 pt-2">
              <div className="landing-sectionTitle mb-1">Biography</div>
              <div className="landing-sectionContent">
                {(() => {
                  const words = person.biography.split(" ")
                  const isTruncated =
                    !bioExpanded && words.length > BIO_WORD_LIMIT
                  return (
                    <>
                      {isTruncated
                        ? words.slice(0, BIO_WORD_LIMIT).join(" ")
                        : person.biography}
                      {isTruncated && (
                        <>
                          {"… "}
                          <button
                            onClick={expandBio}
                            className="text-foreground/50 hover:text-foreground transition-colors cursor-pointer">
                            more
                          </button>
                        </>
                      )}
                      {bioExpanded && words.length > BIO_WORD_LIMIT && (
                        <>
                          {" "}
                          <button
                            onClick={() => setBioExpanded(false)}
                            className="text-foreground/50 hover:text-foreground transition-colors cursor-pointer">
                            less
                          </button>
                        </>
                      )}
                    </>
                  )
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Filmography */}
        <div className="@container w-full flex flex-col items-center justify-start">
          <div className="landing-sectionTitle self-start ml-4">
            filmography
          </div>
          <TmdbFilmGallery listOfFilmObjects={filmography} />
        </div>
      </div>
    </div>
  )
}
