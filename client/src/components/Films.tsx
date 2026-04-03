/* Libraries */
import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";

/* Custom functions */
import { useAuth } from "../utils/authContext";
import { queryFilmFromTMDB, fetchListByParams } from "../utils/apiCalls";
import { usePersistedState } from "../hooks/usePersistedState";

/* Types */
import type { TMDBFilmSummary } from "@/types/tmdb";
import type { UserFilm } from "@/types/film";

/* Components */
import SearchBar from "./layout/SearchBar";
import UserFilmGallery from "./films/UserFilmGallery";
import TmdbFilmGallery from "./films/TmdbFilmGallery";
import Toggle from "./ui-controls/Toggle";
import Footer from "./layout/Footer";

/* Icons */
import { FaSortNumericDown, FaSortNumericDownAlt } from "react-icons/fa";

type QueryString = "watched" | "watchlisted" | "watched/rated";
type SortBy = "added_date" | "released_date";
type SortDirection = "asc" | "desc";

export default function Films() {
  const [searchInput, setSearchInput] = usePersistedState<string>(
    "films-searchInput",
    "",
  );
  const [searchResult, setSearchResult] = useState<TMDBFilmSummary[]>([]);
  const [userFilmList, setUserFilmList] = useState<UserFilm[]>([]);
  const [isSearching, setIsSearching] = usePersistedState<boolean>(
    "films-isSearching",
    false,
  );
  const [sortBy, setSortBy] = usePersistedState<SortBy>(
    "films-sortBy",
    "added_date",
  );
  const [sortDirection, setSortDirection] = usePersistedState<SortDirection>(
    "films-sortDirection",
    "desc",
  );
  const [numStars, setNumStars] = usePersistedState<number>(
    "films-numStars",
    0,
  );
  const [queryString, setQueryString] = usePersistedState<QueryString>(
    "film-queryString",
    "watched",
  );
  const [scrollPosition, setScrollPosition] = usePersistedState<number>(
    "films-scrollPosition",
    0,
  );
  const { authState } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();

  /* Hook for scroll restoration */
  useEffect(() => {
    if (!isLoading) {
      if (scrollPosition) {
        setTimeout(() => {
          window.scrollTo(0, parseInt(String(scrollPosition), 10));
        }, 50);
      } else {
        setTimeout(() => {
          window.scrollTo(0, 0);
        }, 0);
      }

      const handleScroll = () => {
        setScrollPosition(window.scrollY);
      };

      const scrollTimer = setTimeout(() => {
        window.addEventListener("scroll", handleScroll);
      }, 500);

      return () => {
        clearTimeout(scrollTimer);
        window.removeEventListener("scroll", handleScroll);
      };
    }
  }, [isLoading]);

  /* Query films from TMDB when user navigates back from Quick Search Modal */
  useEffect(() => {
    try {
      if (location.state) {
        const { searchInputFromQuickSearch } =
          (location.state as { searchInputFromQuickSearch?: string }) || {};
        if (typeof searchInputFromQuickSearch === "string") {
          if (searchInputFromQuickSearch.trim().length > 0) {
            setSearchInput(searchInputFromQuickSearch);
          }
        }
      }
    } catch (err) {
      console.log(err);
    }
  }, [location.state]);

  /* Query films from TMDB with Search Bar — debounced 500ms */
  useEffect(() => {
    if (searchInput.trim().length === 0 || searchInput === null) {
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const original_results = await queryFilmFromTMDB(searchInput);
        const filtered_results = original_results.filter(
          (movie) =>
            !(movie.backdrop_path === null || movie.poster_path === null),
        );
        const sorted_filtered_results = filtered_results.sort(
          (a, b) => b.popularity - a.popularity,
        );
        setSearchResult(sorted_filtered_results);
      } catch (err) {
        console.log("Error Querying Film: ", err);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  /* Fetch User's film list (liked, watchlisted or starred) from App's DB */
  useEffect(() => {
    if (authState.status) {
      const fetchUserFilmList = async () => {
        try {
          setIsLoading(true);
          const results = await fetchListByParams({
            queryString: queryString,
            sortBy: sortBy,
            sortDirection: sortDirection,
            numStars: numStars,
          });
          setUserFilmList(results);
        } catch (err) {
          console.error("Error Fetching User Film List: ", err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchUserFilmList();
    }
  }, [sortBy, sortDirection, queryString, numStars, authState.status]);

  return (
    <div className="font-primary mt-20 min-h-screen">
      {/* Wrapper for entire page */}
      <div className="@container overflow-visible flex flex-col items-center">
        <div className="font-heading page-title">Films</div>

        <SearchBar
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          placeholderString={"Search by film's title ..."}
        />

        {!isSearching && (
          <div className="yourListConsole">
            <div className="page-subtitle mb-2 md:ml-12 ">Your Films:</div>

            <Toggle<QueryString>
              label="Filter"
              value={queryString}
              onChange={setQueryString}
              options={[
                { value: "watched", label: "Watched" },
                { value: "watchlisted", label: "Watchlist" },
                { value: "watched/rated", label: "Rated" },
              ]}
            />

            <Toggle<SortBy>
              label="Sort By"
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: "added_date", label: "Recently Added" },
                { value: "released_date", label: "Released Year" },
              ]}
            />

            <Toggle<SortDirection>
              label="Sort Order"
              value={sortDirection}
              onChange={setSortDirection}
              options={[
                {
                  value: "desc",
                  label: (
                    <FaSortNumericDownAlt className="text-xl mt-0 w-[5rem]" />
                  ),
                },
                {
                  value: "asc",
                  label: (
                    <FaSortNumericDown className="text-xl mt-0 w-[5rem]" />
                  ),
                },
              ]}
            />

            {queryString === "watched/rated" && (
              <Toggle<number>
                label="Rating"
                value={numStars}
                onChange={setNumStars}
                options={[
                  {
                    value: 0,
                    label: <span className="">All</span>,
                  },
                  {
                    value: 3,
                    label: (
                      <span className="text-2xl text-star">
                        &#10048;&#10048;&#10048;
                      </span>
                    ),
                  },
                  {
                    value: 2,
                    label: (
                      <span className="text-2xl text-star">
                        &#10048;&#10048;
                      </span>
                    ),
                  },
                  {
                    value: 1,
                    label: <span className="text-2xl text-star">&#10048;</span>,
                  },
                ]}
              />
            )}
          </div>
        )}

        <div className="flex flex-col items-center w-full">
          {/* If user logged in and is not searching, show them list of liked films */}
          {!isSearching && authState.status && (
            <UserFilmGallery
              listOfFilmObjects={userFilmList}
              queryString={queryString}
              sortDirection={sortDirection}
              sortBy={sortBy}
            />
          )}

          {/* If user not logged in and is not searching */}
          {!authState.status && !isSearching && (
            <div className="mt-10 mb-20 text-sm @3xl:text-base">
              Log in to interact with films!
            </div>
          )}

          {/* If user is searching, show list of search results */}
          {isSearching && (
            <div className="mt-10 @3xl:mt-20 flex flex-col items-center w-full relative">
              <div className="page-subtitle flex items-center justify-center">
                Search Results:
              </div>

              <TmdbFilmGallery listOfFilmObjects={searchResult} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
