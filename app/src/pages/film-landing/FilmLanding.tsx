/* Libraries */
import { useEffect, useMemo, useRef, useState } from "react"
import { useParams, useNavigate, ClientOnly } from "@tanstack/react-router"
import { useSuspenseQuery, useQuery } from "@tanstack/react-query"

/* Custom functions */
import { getCountryName, getReleaseYear } from "../../utils/helperFunctions"
import {
  filmQueryOptions,
  omdbQueryOptions,
  wikidataQueryOptions,
  ytsQueryOptions,
  subtitlesQueryOptions,
} from "../../queries/film.queries"
import useCommandKey from "../../hooks/useCommandKey"
import { useApp } from "../../utils/appContext"

/* Types */
import type { TMDBFilm, TMDBCrewMember, TMDBSpokenLanguage } from "@/types/tmdb"

/* Components */
import InteractionConsole from "../../components/film/InteractionConsole"
import PersonList from "./components/PersonList"
import TrailerModal from "./components/TrailerModal"
import Torrents from "./components/Torrents"
import Subtitles from "./components/Subtitles"

import { BiPlay } from "react-icons/bi"
import { Calendar, Clock10, Languages, MapPinned } from "lucide-react"

/** A crew member with consolidated jobs list (built locally from credits.crew) */
interface CrewMemberWithJobs {
  id: number
  name: string
  profile_path: string | null
  jobs: string[]
}

/** Shape returned by fetchFilmFromYTS for a single torrent */
interface YtsTorrent {
  url: string
  type?: string
  quality?: string
  size?: string
  peers?: number
  seeds?: number
  video_codec?: string
}

/** Shape of a subtitle item from OpenSubtitles */
interface SubtitleItem {
  attributes: {
    files?: Array<{ file_id: string | number }>
    release?: string
    ai_translated?: boolean
    machine_translated?: boolean
    comments?: string
    upload_date?: string
    download_count?: number
  }
}

// type SecretPanel = "torrents" | "subtitles" | null

const SYN_WORD_LIMIT = 80

export default function FilmLanding() {
  const imgBaseUrl = import.meta.env.VITE_TMDB_IMG_URL_FULL

  const [backdropColor, setBackdropColor] = useState<[number, number, number]>([
    0, 0, 0,
  ])

  const [openTrailer, setOpenTrailer] = useState(false)
  // const [secretPanel, setSecretPanel] = useState<SecretPanel>(null)
  const [synopsisExpanded, setSynopsisExpanded] = useState(false)
  const [awardsExpanded, setAwardsExpanded] = useState(false)
  const [synopsisColMaxH, setSynopsisColMaxH] = useState<number | undefined>()
  const [awardsColMaxH, setAwardsColMaxH] = useState<number | undefined>()
  const synopsisColRef = useRef<HTMLDivElement>(null)
  const awardsColRef = useRef<HTMLDivElement>(null)

  function expandSynopsis() {
    if (synopsisColRef.current) {
      setSynopsisColMaxH(synopsisColRef.current.getBoundingClientRect().height)
    }
    setSynopsisExpanded(true)
  }

  function expandAwards() {
    if (awardsColRef.current) {
      setAwardsColMaxH(awardsColRef.current.getBoundingClientRect().height)
    }
    setAwardsExpanded(true)
  }

  const { setSearchModalOpen } = useApp()
  const { tmdbId } = useParams({ strict: false })
  const navigate = useNavigate()

  // function toggleSecretPanel() {
  //   setSecretPanel((cur) => (cur ? null : "torrents"))
  // }
  // useCommandKey(toggleSecretPanel, "j")

  useEffect(() => {
    setSearchModalOpen(false)
    window.scrollTo(0, 0)
  }, [tmdbId])

  const { data: movieDetails } = useSuspenseQuery(filmQueryOptions(tmdbId!))
  const film = movieDetails as TMDBFilm
  const imdbId = film.imdb_id ?? ""

  const { data: filmRatingsRaw } = useQuery({
    ...omdbQueryOptions(imdbId),
    enabled: !!imdbId,
  })
  const filmRatings =
    filmRatingsRaw?.Response === "True" ? filmRatingsRaw : null

  const { data: filmAwardsRaw } = useQuery({
    ...wikidataQueryOptions(imdbId),
    enabled: !!imdbId,
  })
  const filmAwards =
    filmAwardsRaw &&
    (filmAwardsRaw.wins.length > 0 || filmAwardsRaw.nominations.length > 0)
      ? filmAwardsRaw
      : null

  // const { data: ytsRaw } = useQuery({
  //   ...ytsQueryOptions(imdbId),
  //   enabled: !!secretPanel && !!imdbId,
  // })
  // const ytsTorrents =
  //   (ytsRaw as { data?: { movie?: { torrents?: YtsTorrent[] } } } | undefined)
  //     ?.data?.movie?.torrents ?? []

  // const { data: subtitleRaw } = useQuery({
  //   ...subtitlesQueryOptions(imdbId),
  //   enabled: !!secretPanel && !!imdbId,
  // })
  // const subtitles =
  //   (subtitleRaw as { data?: SubtitleItem[] } | undefined)?.data ?? []

  const directors = useMemo(
    () => film.credits?.crew.filter((m) => m.job === "Director") ?? [],
    [film],
  )

  const crew = useMemo<CrewMemberWithJobs[]>(() => {
    if (!film.credits) return []
    const result: CrewMemberWithJobs[] = []
    for (const person of film.credits.crew) {
      const existing = result.find((m) => m.id === person.id)
      if (existing) {
        existing.jobs.push(person.job)
      } else if (person.profile_path !== null) {
        result.push({
          id: person.id,
          name: person.name,
          profile_path: person.profile_path,
          jobs: [person.job],
        })
      }
    }
    return result
  }, [film])

  const mainCast = useMemo(
    () =>
      film.credits?.cast.filter((c) => c.profile_path !== null).slice(0, 15) ??
      [],
    [film],
  )

  const trailerLink = useMemo(() => {
    const trailers =
      film.videos?.results.filter((v) => v.type === "Trailer") ?? []
    const sorted = [...trailers].sort(
      (a, b) =>
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
    )
    return sorted.length >= 1 ? sorted[0].key : null
  }, [film])

  return (
    <div className="@container font-primary">
      <div className="w-full h-auto flex flex-col justify-center">
        <div className="w-[100%] h-[90%] top-[5%] text-light">
          {/* ── Hero / backdrop ── */}
          {/* min-h ensures the poster never collapses below this height on narrow screens;
              the image is positioned absolutely so it fills the container and center-crops. */}
          <div className="landing-main-img-container min-h-[45rem] @4xl:min-h-[100vh]">
            {/* Backdrop image — fills container, center-crops horizontally on narrow screens */}
            <img
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover object-center brightness-80"
              src={
                film.backdrop_path !== null
                  ? `${imgBaseUrl}${film.backdrop_path}`
                  : `posternotfound.png`
              }
              alt=""
            />

            {/* Bottom gradient — covers the 3-column overlay so white text is always readable */}
            <div
              className="absolute bottom-0 left-0 w-full h-[45%] @7xl:h-[35%]"
              style={{
                background: "linear-gradient(to top, black, transparent)",
              }}
            />

            {/* Trailer play button — shifted up so it clears the column overlay */}
            {trailerLink !== null && (
              <div className="absolute w-full top-0 left-0 h-[55%] flex items-end justify-center pb-6">
                <button
                  onClick={() => setOpenTrailer(true)}
                  className="flex items-center z-40 rounded-full p-3 pt-2 pb-2 drop-shadow-lg bg-background text-foreground hover:text-background hover:bg-foreground transition-all duration-300 ease-out"
                  style={
                    {
                      "--backdropColor": `rgb(${backdropColor[0]}, ${backdropColor[1]}, ${backdropColor[2]})`,
                    } as React.CSSProperties
                  }>
                  <BiPlay className="text-3xl" />
                  <span className="text-base">Trailer</span>
                </button>
              </div>
            )}

            {/* ── 3-column overlay (Phase 1 skeleton) ── */}
            <div className="absolute bottom-0 left-0 w-full z-30 grid grid-cols-1 @3xl:grid-cols-2 @5xl:grid-cols-3 px-4 pb-4 gap-4">
              {/* LEFT — always visible */}
              <div className="p-4 min-h-40 rounded flex flex-col justify-start gap-0 border-0 border-red-400">
                <section className="mb-4 flex flex-col gap-0.5">
                  {/* Title */}
                  {film.title && (
                    <h1 className="uppercase landing-page-title-v2 font-heading text-background">
                      {film.title}
                    </h1>
                  )}

                  {/* Genres */}
                  {film.genres && film.genres.length > 0 && (
                    <p className="text-sm text-background/55 font-extralight">
                      {film.genres.map((g) => g.name).join(", ")}
                    </p>
                  )}
                </section>

                <section className="flex flex-col gap-0.5">
                  {/* Directed by */}
                  {directors.length > 0 && (
                    <div className="text-background text-sm">
                      <span className="font-extralight">Directed by </span>
                      {directors.map((director, key) => (
                        <span key={key}>
                          <span
                            className="hover:underline transition-all ease-out duration-200 cursor-pointer font-extrabold"
                            onClick={() =>
                              navigate({
                                to: `/director/${director.id}`,
                              })
                            }>
                            {director.name}
                          </span>
                          {key !== directors.length - 1 && <span>, </span>}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-x-2 text-base font-extralight text-background text-sm">
                    {/* <ClientOnly> */}
                    {film.origin_country && film.origin_country.length > 0 && (
                      <span className="inline-flex flex-wrap items-center gap-x-1">
                        <MapPinned size={16} className="shrink-0" />
                        <span className="flex flex-wrap">
                          {film.origin_country.map((c, i) => (
                            <span key={i} className="whitespace-nowrap">
                              {getCountryName(c)}
                              {i !== film.origin_country.length - 1 &&
                                ",\u00a0"}
                            </span>
                          ))}
                        </span>
                      </span>
                    )}
                    {/* </ClientOnly> */}
                    {film.spoken_languages &&
                      film.spoken_languages.length > 0 && (
                        <span className="inline-flex flex-wrap items-center gap-x-1">
                          <Languages size={16} className="shrink-0" />
                          {film.spoken_languages
                            .map((l: TMDBSpokenLanguage) => l.english_name)
                            .join(", ")}
                        </span>
                      )}
                  </div>

                  {/* Year · Runtime · Origin */}
                  <div className="flex flex-wrap gap-x-2 text-base font-extralight text-background text-sm">
                    {film.release_date && (
                      <span className="flex items-center gap-1">
                        <Calendar size={16} className="shrink-0" />
                        {getReleaseYear(film.release_date)}
                      </span>
                    )}
                    {film.runtime && (
                      <span className="flex items-center gap-1">
                        <Clock10 size={16} className="shrink-0" />
                        {film.runtime} min
                      </span>
                    )}
                  </div>
                </section>

                {/* Interaction console */}

                <div className="w-full flex items-start mt-4">
                  <InteractionConsole
                    tmdbId={tmdbId}
                    directors={directors}
                    movieDetails={movieDetails}
                    variant="card"
                    className="text-white border-white pt-2"
                  />
                </div>
              </div>

              {/* MID — md and up */}
              <div
                ref={synopsisColRef}
                className="hidden @3xl:flex flex-col justify-start gap-1 border-0 border-green-400 p-4 min-h-40 rounded"
                style={
                  synopsisColMaxH ? { maxHeight: synopsisColMaxH } : undefined
                }>
                <span className="font-heading text-sm font-extrabold text-background uppercase">
                  Synopsis
                </span>

                {film.overview &&
                  (() => {
                    const words = film.overview.split(" ")
                    const isTruncated =
                      !synopsisExpanded && words.length > SYN_WORD_LIMIT
                    return (
                      <div
                        className={
                          synopsisExpanded
                            ? "flex-1 min-h-0 overflow-y-auto pr-1"
                            : undefined
                        }>
                        <p className="text-sm text-background leading-snug font-extralight">
                          {isTruncated
                            ? words.slice(0, SYN_WORD_LIMIT).join(" ")
                            : film.overview}
                          {isTruncated && (
                            <>
                              {"… "}
                              <button
                                onClick={expandSynopsis}
                                className="text-white/50 hover:text-white transition-colors">
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
              <div
                ref={awardsColRef}
                className="hidden @5xl:flex flex-col justify-start gap-2 border-0 border-blue-400 p-4 min-h-40 rounded"
                style={
                  awardsColMaxH ? { maxHeight: awardsColMaxH } : undefined
                }>
                <span className="font-heading text-sm font-extrabold text-background uppercase">
                  Ratings &amp; Awards
                </span>

                {/* Rating chips */}
                {filmRatings?.Ratings && filmRatings.Ratings.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {filmRatings.Ratings.map((r) => {
                      const label =
                        r.Source === "Internet Movie Database"
                          ? "IMDb"
                          : r.Source === "Rotten Tomatoes"
                            ? "RT"
                            : r.Source === "Metacritic"
                              ? "MC"
                              : r.Source
                      const chipClass =
                        r.Source === "Internet Movie Database"
                          ? "bg-[var(--color-rating-imdb)]/20 border-[var(--color-rating-imdb)]/50"
                          : r.Source === "Rotten Tomatoes"
                            ? "bg-[var(--color-rating-rt)]/20 border-[var(--color-rating-rt)]/50"
                            : r.Source === "Metacritic"
                              ? "bg-[var(--color-rating-mc)]/20 border-[var(--color-rating-mc)]/50"
                              : "border-white/30"
                      return (
                        <span
                          key={r.Source}
                          className={`inline-flex items-center gap-1.5 text-sm px-2.5 py-0.5 rounded-full border text-background backdrop-blur-sm ${chipClass}`}>
                          <span className="font-bold">{label}</span>
                          <span className="font-extralight">{r.Value}</span>
                        </span>
                      )
                    })}
                  </div>
                )}

                {/* Awards list */}
                {filmAwards && (
                  <div
                    className={
                      awardsExpanded
                        ? "flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-2 mt-2"
                        : "flex flex-col gap-2 mt-2"
                    }>
                    {filmAwards.wins.length > 0 &&
                      (() => {
                        const LIMIT = 3
                        const isTruncated =
                          !awardsExpanded && filmAwards.wins.length > LIMIT
                        const shown = isTruncated
                          ? filmAwards.wins.slice(0, LIMIT)
                          : filmAwards.wins
                        return (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-extrabold text-background uppercase">
                              Won · {filmAwards.wins.length}
                            </span>
                            {shown.map((award, i) => (
                              <p
                                key={i}
                                className="text-xs text-background font-extralight leading-snug">
                                {award.award}
                                {award.year ? (
                                  <span className="text-background/50">
                                    {" "}
                                    {award.year}
                                  </span>
                                ) : null}
                              </p>
                            ))}
                            {isTruncated && (
                              <p className="text-xs text-background/50">
                                {"… "}
                                <button
                                  onClick={expandAwards}
                                  className="hover:text-white transition-colors">
                                  more
                                </button>
                              </p>
                            )}
                          </div>
                        )
                      })()}

                    {filmAwards.nominations.length > 0 &&
                      (() => {
                        const LIMIT = 2
                        const isTruncated =
                          !awardsExpanded &&
                          filmAwards.nominations.length > LIMIT
                        const shown = isTruncated
                          ? filmAwards.nominations.slice(0, LIMIT)
                          : filmAwards.nominations
                        return (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-extrabold text-background uppercase">
                              Nominated · {filmAwards.nominations.length}
                            </span>
                            {shown.map((award, i) => (
                              <p
                                key={i}
                                className="text-xs text-background font-extralight leading-snug">
                                {award.award}
                                {award.year ? (
                                  <span className="text-background/50">
                                    {" "}
                                    {award.year}
                                  </span>
                                ) : null}
                              </p>
                            ))}
                            {isTruncated && (
                              <p className="text-xs text-background/50">
                                {"… "}
                                <button
                                  onClick={expandAwards}
                                  className="hover:text-white transition-colors">
                                  more
                                </button>
                              </p>
                            )}
                          </div>
                        )
                      })()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Below-fold ── */}
          <div className="flex flex-col items-start  gap-2 relative bg-page landing-belowBackdropPadding pb-30 w-ful">
            <div className="flex flex-col w-full">
              {/* Synopsis — only shown here when MID overlay column is hidden (< md) */}
              <div className="@3xl:hidden">
                {film.overview && (
                  <div className="p-4 pt-2">
                    <div className="landing-sectionTitle mb-1">overview</div>
                    <div className="landing-sectionContent">
                      {(() => {
                        const words = film.overview.split(" ")
                        const isTruncated =
                          !synopsisExpanded && words.length > SYN_WORD_LIMIT
                        return (
                          <>
                            {isTruncated
                              ? words.slice(0, SYN_WORD_LIMIT).join(" ")
                              : film.overview}
                            {isTruncated && (
                              <>
                                {"… "}
                                <button
                                  onClick={expandSynopsis}
                                  className="text-foreground/50 hover:text-foreground transition-colors cursor-pointer">
                                  more
                                </button>
                              </>
                            )}
                            {synopsisExpanded &&
                              words.length > SYN_WORD_LIMIT && (
                                <>
                                  {" "}
                                  <button
                                    onClick={() => setSynopsisExpanded(false)}
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

              {/* Ratings & Awards — only shown here when RIGHT overlay column is hidden (< xl) */}
              {(filmRatings || filmAwards) && (
                <div className="@5xl:hidden p-4 pt-2">
                  <div className="landing-sectionTitle mb-2">
                    ratings &amp; awards
                  </div>

                  <div className="flex flex-col justify-center items-start gap-2">
                    {/* Ratings */}
                    {filmRatings && (
                      <div className="flex flex-wrap gap-2">
                        {filmRatings.imdbRating &&
                          filmRatings.imdbRating !== "N/A" && (
                            <div className="flex flex-col items-start gap-0.5 border-1 p-3 rounded-sm bg-[var(--color-rating-imdb)]/85 border-[var(--color-rating-imdb)]">
                              <span className="flex justify-start items-center gap-2">
                                <span className="landing-ratingsTitle">
                                  IMDb
                                </span>
                                {filmRatings.imdbVotes &&
                                  filmRatings.imdbVotes !== "N/A" && (
                                    <span className=" text-xs @5xl:text-sm font-thin">
                                      {filmRatings.imdbVotes} votes
                                    </span>
                                  )}
                              </span>
                              <div className="flex items-baseline gap-1">
                                <span className="text-sm @5xl:text-base">
                                  ★
                                </span>
                                <span className=" font-semibold text-base @5xl:text-lg leading-none">
                                  {filmRatings.imdbRating}
                                </span>
                                <span className=" text-xs @5xl:text-sm font-thin">
                                  /10
                                </span>
                              </div>
                            </div>
                          )}
                        {filmRatings.Ratings?.find(
                          (r) => r.Source === "Rotten Tomatoes",
                        ) && (
                          <div className="flex flex-col items-start gap-0.5 border-1 p-3 rounded-sm bg-[var(--color-rating-rt)]/85 border-[var(--color-rating-rt)]">
                            <span className="landing-ratingsTitle">
                              Rotten Tomatoes
                            </span>
                            <div className="flex items-baseline gap-1">
                              <span className="text-sm @5xl:text-base">🍅</span>
                              <span className=" font-semibold text-base @5xl:text-lg leading-none">
                                {
                                  filmRatings.Ratings!.find(
                                    (r) => r.Source === "Rotten Tomatoes",
                                  )!.Value
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
                              filmRatings.Ratings!.find(
                                (r) => r.Source === "Metacritic",
                              )!.Value,
                            )
                            const color =
                              score >= 75
                                ? "bg-green-600"
                                : score >= 50
                                  ? "bg-yellow-500"
                                  : "bg-red-600"
                            return (
                              <div className="flex flex-col items-start gap-0.5 border-1 p-3 rounded-sm bg-[var(--color-rating-mc)]/85 border-[var(--color-rating-mc)]">
                                <span className="landing-ratingsTitle">
                                  Metacritic
                                </span>
                                <div className="flex items-center gap-2 mt-1">
                                  <span
                                    className={`${color} text-light font-bold text-sm @5xl:text-base px-2 py-0.5 rounded`}>
                                    {score}
                                  </span>
                                  <span className=" text-xs @5xl:text-sm font-thin">
                                    /100
                                  </span>
                                </div>
                              </div>
                            )
                          })()}
                      </div>
                    )}

                    {/* Awards */}
                    {filmAwards &&
                      (() => {
                        const LIMIT = 3
                        const winsTruncated =
                          !awardsExpanded && filmAwards.wins.length > LIMIT
                        const nomsTruncated =
                          !awardsExpanded &&
                          filmAwards.nominations.length > LIMIT
                        const shownWins = winsTruncated
                          ? filmAwards.wins.slice(0, LIMIT)
                          : filmAwards.wins
                        const shownNoms = nomsTruncated
                          ? filmAwards.nominations.slice(0, LIMIT)
                          : filmAwards.nominations
                        const canCollapse =
                          awardsExpanded &&
                          (filmAwards.wins.length > LIMIT ||
                            filmAwards.nominations.length > LIMIT)
                        return (
                          <div className="border-1 p-5 py-4 rounded-sm w-fit bg-[var(--color-rating-awards)]/85 border-[var(--color-rating-awards)]">
                            {filmAwards.wins.length > 0 && (
                              <div className="mb-3">
                                <div className="text-base @5xl:text-lg uppercase font-bold mb-1">
                                  Won
                                </div>
                                <ul className="flex flex-col gap-1">
                                  {shownWins.map((w, i) => (
                                    <li
                                      key={i}
                                      className="flex items-baseline gap-1">
                                      <span className=" text-sm @5xl:text-base">
                                        {w.award}
                                      </span>
                                      {w.year && (
                                        <span className=" text-xs @5xl:text-sm font-thin">
                                          {w.year}
                                        </span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                                {winsTruncated && (
                                  <p className="font-thin hover:font-normal transition-all east-out duration-200 mt-1">
                                    {"… "}
                                    <button
                                      onClick={expandAwards}
                                      className="hover: transition-colors cursor-pointer">
                                      more
                                    </button>
                                  </p>
                                )}
                              </div>
                            )}
                            {filmAwards.nominations.length > 0 && (
                              <div>
                                <div className="text-base @5xl:text-lg uppercase font-bold mb-1">
                                  Nominated
                                </div>
                                <ul className="flex flex-col gap-1">
                                  {shownNoms.map((n, i) => (
                                    <li
                                      key={i}
                                      className="flex items-baseline gap-1">
                                      <span className=" text-sm @5xl:text-base">
                                        {n.award}
                                      </span>
                                      {n.year && (
                                        <span className=" text-xs @5xl:text-sm font-thin">
                                          {n.year}
                                        </span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                                {nomsTruncated && (
                                  <p className="font-thin hover:font-normal transition-all east-out duration-200 mt-1">
                                    {"… "}
                                    <button
                                      onClick={expandAwards}
                                      className="hover: transition-colors cursor-pointer">
                                      more
                                    </button>
                                  </p>
                                )}
                              </div>
                            )}
                            {canCollapse && (
                              <p className="font-thin hover:font-normal transition-all east-out duration-200 mt-1">
                                <button
                                  onClick={() => setAwardsExpanded(false)}
                                  className="hover: transition-colors cursor-pointer">
                                  less
                                </button>
                              </p>
                            )}
                          </div>
                        )
                      })()}
                  </div>
                </div>
              )}

              {/* {secretPanel && (
                <>
                  <Torrents ytsTorrents={ytsTorrents} />
                  <Subtitles subtitles={subtitles} />
                </>
              )} */}

              <div className="flex flex-col items-start justify-start gap-2 w-full">
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
          {openTrailer && trailerLink && (
            <TrailerModal
              trailerLink={trailerLink}
              closeModal={() => setOpenTrailer(false)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
