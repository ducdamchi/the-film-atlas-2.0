/* Libraries */
import { useEffect, useState } from "react";
import { getColorSync } from "colorthief";
import { useParams, useNavigate } from "@tanstack/react-router";

/* Custom functions */
import {
  getCountryName,
  getReleaseYear,
  darkenColorToOklch,
} from "../utils/helperFunctions";
import {
  fetchFilmFromTMDB,
  fetchFilmFromYTS,
  fetchSubtitles,
  fetchFilmRatingsFromOMDB,
  fetchFilmAwardsFromWikidata,
} from "../utils/apiCalls";
import useCommandKey from "../hooks/useCommandKey";
import { useAuth } from "../utils/authContext";

/* Types */
import type { TMDBFilm, TMDBCrewMember } from "@/types/tmdb";
import type { OmdbResponse, WikidataAwardsResponse } from "@/types/api";

/* Components */
import NavBar from "./layout/navbar/NavBar";
import LoadingPage from "./layout/LoadingPage";
import QuickSearchModal from "./layout/QuickSearchModal";
import InteractionConsole from "./film-interaction/InteractionConsole";
import PersonList from "./films/PersonList";
import TrailerModal from "./films/TrailerModal";
import Torrents from "./films/Torrents";
import Subtitles from "./films/Subtitles";

import { IoMdCalendar, IoIosTimer } from "react-icons/io";
import { BiPlay } from "react-icons/bi";

/** A crew member with consolidated jobs list (built locally from credits.crew) */
interface CrewMemberWithJobs {
  id: number;
  name: string;
  profile_path: string | null;
  jobs: string[];
}

/** Shape returned by fetchFilmFromYTS for a single torrent */
interface YtsTorrent {
  url: string;
  type?: string;
  quality?: string;
  size?: string;
  peers?: number;
  seeds?: number;
  video_codec?: string;
}

/** Shape of a subtitle item from OpenSubtitles */
interface SubtitleItem {
  attributes: {
    files?: Array<{ file_id: string | number }>;
    release?: string;
    ai_translated?: boolean;
    machine_translated?: boolean;
    comments?: string;
    upload_date?: string;
    download_count?: number;
  };
}

type SecretPanel = "torrents" | "subtitles" | null;

export default function FilmLanding() {
  const imgBaseUrl = "https://image.tmdb.org/t/p/original";
  const [isLoading, setIsLoading] = useState(false);
  const [movieDetails, setMovieDetails] = useState<
    TMDBFilm | Record<string, never>
  >({});
  const [directors, setDirectors] = useState<TMDBCrewMember[]>([]);
  const [crew, setCrew] = useState<CrewMemberWithJobs[]>([]);
  const [mainCast, setMainCast] = useState<TMDBCrewMember[]>([]);
  const [trailerLink, setTrailerLink] = useState<string | null>(null);
  const [backdropColor, setBackdropColor] = useState<[number, number, number]>([
    0, 0, 0,
  ]);
  const [openTrailer, setOpenTrailer] = useState(false);
  const [secretPanel, setSecretPanel] = useState<SecretPanel>(null);
  const [ytsTorrents, setYtsTorrents] = useState<YtsTorrent[]>([]);
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>([]);
  const [filmRatings, setFilmRatings] = useState<OmdbResponse | null>(null);
  const [filmAwards, setFilmAwards] = useState<WikidataAwardsResponse | null>(
    null,
  );

  const { searchModalOpen, setSearchModalOpen } = useAuth();
  const { tmdbId } = useParams({ strict: false });
  const navigate = useNavigate();

  function toggleSearchModal() {
    setSearchModalOpen((status) => !status);
  }
  useCommandKey(toggleSearchModal, "k");

  function toggleSecretPanel() {
    setSecretPanel((cur) => (cur ? null : "torrents"));
  }
  useCommandKey(toggleSecretPanel, "j");

  useEffect(() => {
    const timer = setTimeout(() => {
      window.scrollTo(0, 0);
    }, 0);
    return () => {
      clearTimeout(timer);
    };
  }, [isLoading]);

  /* Fetch film info for Landing Page */
  useEffect(() => {
    const fetchPageData = async () => {
      if (tmdbId) {
        try {
          setSearchModalOpen(false);
          setYtsTorrents([]);
          setSubtitles([]);
          setIsLoading(true);
          const result = await fetchFilmFromTMDB(tmdbId);
          setMovieDetails(result);
        } catch (err) {
          console.error("Error loading film data: ", err);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchPageData();
  }, [tmdbId]);

  useEffect(() => {
    const film = movieDetails as TMDBFilm;
    if (!film.credits) return;

    const directorsList = film.credits.crew.filter(
      (crewMember) => crewMember.job === "Director",
    );

    const rawCrew = film.credits.crew;
    const listOfUniqueCrewMembers: CrewMemberWithJobs[] = [];
    rawCrew.forEach((person) => {
      const crewMember = listOfUniqueCrewMembers.find(
        (member) => member.id === person.id,
      );
      if (crewMember !== undefined) {
        crewMember.jobs.push(person.job);
      } else {
        if (person.profile_path !== null) {
          listOfUniqueCrewMembers.push({
            id: person.id,
            name: person.name,
            profile_path: person.profile_path,
            jobs: [person.job],
          });
        }
      }
    });

    // Filter out cast who does not have profile pic, then take top 15
    const castListFiltered = film.credits.cast.filter(
      (cast) => cast.profile_path !== null,
    );
    const mainCastList = castListFiltered.slice(
      0,
      Math.min(15, castListFiltered.length),
    );

    // Filter for Trailer type videos, sort by newest first
    const trailerLinks = film.videos.results.filter((video) => {
      return video.type === "Trailer";
    });
    const sortedTrailerLinks = trailerLinks.sort((a, b) => {
      const dateA = new Date(a.published_at);
      const dateB = new Date(b.published_at);
      return dateB.getTime() - dateA.getTime();
    });

    console.log("sortedTrailerLinks:", sortedTrailerLinks);

    setDirectors(directorsList);
    setCrew(listOfUniqueCrewMembers);
    setMainCast(mainCastList);
    if (sortedTrailerLinks.length >= 1) {
      setTrailerLink(sortedTrailerLinks[0].key);
    } else {
      setTrailerLink(null);
    }

    /* Set overlay color based on backdrop dominant color */
    try {
      const backdrop = new Image();
      backdrop.crossOrigin = "anonymous";

      if (!film.backdrop_path) return;

      const proxyUrl = `${import.meta.env.VITE_API_URL}/proxy/image?url=${encodeURIComponent(`https://image.tmdb.org/t/p/w500${film.backdrop_path}`)}`;
      backdrop.src = proxyUrl;

      backdrop.onload = () => {
        const domColor = getColorSync(backdrop).array() as [
          number,
          number,
          number,
        ];
        setBackdropColor(darkenColorToOklch(domColor, 0.3));
      };
    } catch (err) {
      console.log(err);
    }
  }, [movieDetails]);

  useEffect(() => {
    const film = movieDetails as TMDBFilm;
    const fetchRatings = async () => {
      if (film.imdb_id) {
        try {
          const result = await fetchFilmRatingsFromOMDB(film.imdb_id);
          if (result.Response === "True") {
            setFilmRatings(result);
          }
        } catch (err) {
          console.error("Error loading ratings: ", err);
        }
      }
    };
    const fetchAwards = async () => {
      if (film.imdb_id) {
        try {
          const result = await fetchFilmAwardsFromWikidata(film.imdb_id);
          if (result.wins.length > 0 || result.nominations.length > 0) {
            setFilmAwards(result);
          }
        } catch (err) {
          console.error("Error loading awards: ", err);
        }
      }
    };
    fetchRatings();
    fetchAwards();
  }, [movieDetails]);

  useEffect(() => {
    const film = movieDetails as TMDBFilm;
    if (!secretPanel || !film.imdb_id) return;

    const fetchYTS = async () => {
      try {
        const result = await fetchFilmFromYTS(film.imdb_id!);
        setYtsTorrents(result.data.movie?.torrents ?? []);
      } catch (err) {
        console.error("Error loading YTS data:", err);
        setYtsTorrents([]);
      }
    };

    const fetchOpenSubtitles = async () => {
      try {
        const result = await fetchSubtitles(film.imdb_id!);
        setSubtitles(result.data);
      } catch (err) {
        console.error("Error loading subtitles:", err);
      }
    };

    const fetchPanelData = async () => {
      setIsLoading(true);
      await Promise.all([fetchYTS(), fetchOpenSubtitles()]);
      setIsLoading(false);
    };
    fetchPanelData();
  }, [secretPanel, movieDetails]);

  const film = movieDetails as TMDBFilm;

  if (!movieDetails) {
    return <div>Error loading film. Please try again.</div>;
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
        <div className="w-[100%] h-[90%] top-[5%] text-light">
          <NavBar />

          {/* Backdrop section */}
          <div className="landing-main-img-container">
            {/* Main backdrop */}
            <img
              className="landing-main-img w-screen"
              src={
                film.backdrop_path !== null
                  ? `${imgBaseUrl}${film.backdrop_path}`
                  : `posternotfound.png`
              }
              alt=""
            />

            {/* Transparent layer top */}
            <div
              className="landing-transparent-layer"
              style={{
                background: `linear-gradient(to bottom, rgb(${backdropColor[0]}, ${backdropColor[1]}, ${backdropColor[2]}), transparent)`,
              }}
            ></div>

            {/* All the text displayed over main backdrop */}
            <div className="">
              <div className="landing-img-text-container z-30">
                {/* Title */}
                {film.title && (
                  <div className="landing-page-title font-heading pb-2">
                    {film.title} &nbsp;
                  </div>
                )}

                <div className="flex-col justify-start items-start gap-2 hidden sm:flex">
                  {/* Release Date */}
                  <div className="landing-img-text-belowTitle gap-2">
                    {film.release_date && (
                      <div className="flex gap-1 items-center">
                        <IoMdCalendar />
                        <span className="">{`${getReleaseYear(film.release_date)}`}</span>
                      </div>
                    )}
                    {film.runtime && (
                      <div className="flex gap-1 items-center">
                        <IoIosTimer />
                        <span className="">{`${film.runtime} minutes`}</span>
                      </div>
                    )}
                  </div>

                  {/* Director name(s) */}
                  {directors.length > 0 && (
                    <div className="landing-img-text-right">
                      <span className="">Directed by:&nbsp;</span>
                      {directors.map((director, key) => {
                        return (
                          <span key={key}>
                            <span
                              className=" hover:text-hover-accent transition-all ease-out duration-200"
                              style={{ cursor: "pointer" }}
                              onClick={() => {
                                navigate({
                                  to: `/person/director/${director.id}`,
                                });
                              }}
                            >{`${director.name}`}</span>
                            {key !== directors.length - 1 && (
                              <span>,&nbsp;</span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Origin Country */}
                  {film.origin_country && film.origin_country.length > 0 && (
                    <div className="landing-img-text-right ">
                      <span className="">Origin:&nbsp;</span>

                      {film.origin_country.map((country, key) => {
                        return (
                          <span key={key} className="whitespace-nowrap">
                            <span className="landing-img-text-right-content">{`${getCountryName(country)}`}</span>
                            {key !== film.origin_country.length - 1 && (
                              <span className="inline-block">,&nbsp;</span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              {/* trailer play button */}
              {trailerLink !== null && (
                <div className="absolute w-full h-full border-0 top-0 left-0 flex items-center justify-center">
                  <button
                    onClick={() => {
                      console.log("openTrailer:", openTrailer);
                      setOpenTrailer(true);
                    }}
                    className="flex items-center z-40 rounded-full p-3 pt-2 pb-2 drop-shadow-lg bg-elevated text-[var(--backdropColor)] hover:text-light hover:bg-[var(--backdropColor)] transition-all duration-300 ease-out"
                    style={
                      {
                        "--backdropColor": `rgb(${backdropColor[0]}, ${backdropColor[1]}, ${backdropColor[2]})`,
                      } as React.CSSProperties
                    }
                  >
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
              }}
            ></div>

            {/* Interaction console */}
            <div className="xl:hidden absolute bottom-0 w-full flex items-center justify-center mb-4">
              <InteractionConsole
                tmdbId={tmdbId}
                directors={directors}
                movieDetails={movieDetails}
                setIsLoading={setIsLoading}
                variant="landing-sm"
                showOverview={false}
              />
            </div>
            <div className="hidden xl:block absolute bottom-0 w-full flex items-center justify-center mb-6">
              <InteractionConsole
                tmdbId={tmdbId}
                directors={directors}
                movieDetails={movieDetails}
                setIsLoading={setIsLoading}
                variant="landing-lg"
                showOverview={false}
              />
            </div>
          </div>

          {/* Section below main backdrop */}
          <div className="flex flex-col items-start text-dark gap-2 relative bg-page landing-belowBackdropPadding pb-30">
            <div className="flex flex-col">
              {/* Basic info -- sm breakpoint */}
              <div className="flex sm:hidden">
                <div className="p-4 pt-2">
                  <div className="landing-sectionTitle mb-1">Basic Info</div>
                  <div className="landing-sectionContent">
                    {/* Director name(s) */}
                    {directors.length > 0 && (
                      <div className="">
                        <span className="font-thin lowercase">
                          Directed by:&nbsp;
                        </span>
                        {directors.map((director, key) => {
                          return (
                            <span key={key}>
                              <span
                                className=" hover:text-hover-link transition-all ease-out duration-200"
                                style={{ cursor: "pointer" }}
                                onClick={() => {
                                  navigate({
                                    to: `/person/director/${director.id}`,
                                  });
                                }}
                              >{`${director.name}`}</span>
                              {key !== directors.length - 1 && (
                                <span>,&nbsp;</span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {/* Release Date */}
                    <div className="">
                      {film.release_date && (
                        <div className="flex gap-1 items-center">
                          <span className="font-thin lowercase">
                            Release year:
                          </span>
                          <span className="">{`${getReleaseYear(film.release_date)}`}</span>
                        </div>
                      )}
                      {film.runtime && (
                        <div className="flex gap-1 items-center">
                          <span className="font-thin lowercase">Runtime:</span>
                          <span className="">{`${film.runtime} minutes`}</span>
                        </div>
                      )}
                    </div>

                    {/* Origin Country */}
                    {film.origin_country && film.origin_country.length > 0 && (
                      <div className="">
                        <span className="font-thin lowercase">
                          Origin:&nbsp;
                        </span>

                        {film.origin_country.map((country, key) => {
                          return (
                            <span key={key} className="whitespace-nowrap">
                              <span className="landing-img-text-right-content">{`${getCountryName(country)}`}</span>
                              {key !== film.origin_country.length - 1 && (
                                <span className="inline-block">,&nbsp;</span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Overview section */}
              <div className="flex flex-col items-start justify-start ">
                {film.overview && (
                  <div className="p-4 pt-2">
                    <div className="landing-sectionTitle mb-1">overview</div>
                    <div className="landing-sectionContent">
                      {film.overview}
                    </div>
                  </div>
                )}
              </div>

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
                            <div className="flex flex-col items-start gap-0.5 border-1 p-3 rounded-sm bg-[var(--color-rating-imdb)]/85 border-[var(--color-rating-imdb)]">
                              <span className="flex justify-start items-center gap-2">
                                <span className="landing-ratingsTitle">
                                  IMDb
                                </span>
                                {filmRatings.imdbVotes &&
                                  filmRatings.imdbVotes !== "N/A" && (
                                    <span className="text-dark text-xs lg:text-sm font-thin">
                                      {filmRatings.imdbVotes} votes
                                    </span>
                                  )}
                              </span>
                              <div className="flex items-baseline gap-1">
                                <span className="text-sm lg:text-base">★</span>
                                <span className="text-dark font-semibold text-base lg:text-lg leading-none">
                                  {filmRatings.imdbRating}
                                </span>
                                <span className="text-dark text-xs lg:text-sm font-thin">
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
                              <span className="text-sm lg:text-base">🍅</span>
                              <span className="text-dark font-semibold text-base lg:text-lg  leading-none">
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
                            );
                            const color =
                              score >= 75
                                ? "bg-green-600"
                                : score >= 50
                                  ? "bg-yellow-500"
                                  : "bg-red-600";
                            return (
                              <div className="flex flex-col items-start gap-0.5 border-1 p-3 rounded-sm bg-[var(--color-rating-mc)]/85 border-[var(--color-rating-mc)]">
                                <span className="landing-ratingsTitle">
                                  Metacritic
                                </span>
                                <div className="flex items-center gap-2 mt-1">
                                  <span
                                    className={`${color} text-light font-bold text-sm lg:text-base px-2 py-0.5 rounded`}
                                  >
                                    {score}
                                  </span>
                                  <span className="text-dark text-xs lg:text-sm font-thin">
                                    /100
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                      </div>
                    )}

                    {/* Awards section */}
                    {filmAwards && (
                      <div className="text-dark border-1 p-5 py-4 rounded-sm w-fit bg-[var(--color-rating-awards)]/85 border-[var(--color-rating-awards)]">
                        {filmAwards.wins.length > 0 && (
                          <div className="mb-3">
                            <div className="text-base lg:text-lg  uppercase font-bold mb-1">
                              Won
                            </div>
                            <ul className="flex flex-col gap-1">
                              {filmAwards.wins.map((w, i) => (
                                <li
                                  key={i}
                                  className="flex items-baseline gap-1"
                                >
                                  <span className="text-dark text-sm lg:text-base">
                                    {w.award}
                                  </span>
                                  {w.year && (
                                    <span className="text-dark text-xs lg:text-sm font-thin">
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
                                  className="flex items-baseline gap-1"
                                >
                                  <span className="text-dark text-sm lg:text-base">
                                    {n.award}
                                  </span>
                                  {n.year && (
                                    <span className="text-dark text-xs lg:text-sm font-thin">
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

              {/* Secret panel — torrents & subtitles */}
              {secretPanel && (
                <>
                  <Torrents ytsTorrents={ytsTorrents} />
                  <Subtitles subtitles={subtitles} />
                </>
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
          {openTrailer && trailerLink && (
            <TrailerModal
              trailerLink={trailerLink}
              closeModal={() => {
                setOpenTrailer(false);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
