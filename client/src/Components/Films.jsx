/* Libraries */
import axios from "axios"
import React, { useEffect, useState, useContext, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"

/* Custom functions */
import { AuthContext } from "../Utils/authContext"
import { queryFilmFromTMDB, fetchListByParams } from "../Utils/apiCalls"
import useCommandKey from "../Hooks/useCommandKey"
import { usePersistedState } from "../Hooks/usePersistedState"

/* Components */
import NavBar from "./Shared/Navigation-Search/NavBar"
import SearchBar from "./Shared/Navigation-Search/SearchBar"
import FilmUser_Gallery from "./Shared/Films/FilmUser_Gallery"
import FilmTMDB_Gallery from "./Shared/Films/FilmTMDB_Gallery"
import QuickSearchModal from "./Shared/Navigation-Search/QuickSearchModal"
import Toggle_Four from "./Shared/Buttons/Toggle_Four"
import Toggle_Three from "./Shared/Buttons/Toggle_Three"
import Toggle_Two from "./Shared/Buttons/Toggle_Two"
import LoadingPage from "./Shared/Navigation-Search/LoadingPage"
import Footer from "./Shared/Navigation-Search/Footer"

/* Icons */
import { FaSortNumericDown, FaSortNumericDownAlt } from "react-icons/fa"

export default function Films() {
  const [searchInput, setSearchInput] = usePersistedState(
    "films-searchInput",
    "",
  )
  const [searchResult, setSearchResult] = useState([])
  const [userFilmList, setUserFilmList] = useState([])
  const [isSearching, setIsSearching] = usePersistedState(
    "films-isSearching",
    false,
  )
  const [sortBy, setSortBy] = usePersistedState("films-sortBy", "added_date")
  const [sortDirection, setSortDirection] = usePersistedState(
    "films-sortDirection",
    "desc",
  )
  const [numStars, setNumStars] = usePersistedState("films-numStars", 0)
  const [queryString, setQueryString] = usePersistedState(
    "film-queryString",
    "watched",
  )
  const [scrollPosition, setScrollPosition] = usePersistedState(
    "films-scrollPosition",
    0,
  )
  const { authState, searchModalOpen, setSearchModalOpen } =
    useContext(AuthContext)
  const [isLoading, setIsLoading] = useState(false)
  const location = useLocation()

  function toggleSearchModal() {
    setSearchModalOpen((status) => !status)
  }
  useCommandKey(toggleSearchModal, "k")

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

  /* Query films from TMDB when user clicks Enter while Quick Search Modal's Search Bar is focused. AKA do an exhaustive search instead of a quick search with limited results */
  useEffect(() => {
    try {
      if (location.state) {
        const { searchInputFromQuickSearch, returnToViewMode } =
          location.state || {}
        // Check if search input is not an empty string or null
        if (typeof searchInputFromQuickSearch === "string") {
          if (searchInputFromQuickSearch.trim().length > 0) {
            setSearchInput(searchInputFromQuickSearch)
          }
        }
      }
    } catch (err) {
      console.log(err)
    }
  }, [location.state])

  /* Query films from TMDB with Search Bar — debounced 500ms */
  useEffect(() => {
    if (searchInput.trim().length === 0 || searchInput === null) {
      setIsSearching(false)
      return
    }

    setIsSearching(true)

    const timer = setTimeout(async () => {
      try {
        const original_results = await queryFilmFromTMDB(searchInput)
        const filtered_results = original_results.filter(
          (movie) =>
            !(movie.backdrop_path === null || movie.poster_path === null),
        )
        const sorted_filtered_results = filtered_results.sort(
          (a, b) => b.popularity - a.popularity,
        )
        setSearchResult(sorted_filtered_results)
      } catch (err) {
        console.log("Error Querying Film: ", err)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchInput])

  /* Fetch User's film list (liked, watchlisted or starred) from App's DB */
  useEffect(() => {
    if (authState.status) {
      const fetchUserFilmList = async () => {
        try {
          setIsLoading(true)
          const results = await fetchListByParams({
            queryString: queryString,
            sortBy: sortBy,
            sortDirection: sortDirection,
            numStars: numStars,
          })
          setUserFilmList(results)
        } catch (err) {
          console.err("Error Fetching User Film List: ", err)
        } finally {
          setIsLoading(false)
        }
      }
      fetchUserFilmList()
    }
    // else {
    //   alert("Log in to interact with films!")
    // }
  }, [sortBy, sortDirection, queryString, numStars])

  return (
    <div className="font-primary mt-20 min-h-screen">
      {/* {isLoading && <LoadingPage />} */}
      {/* Quick Search Modal */}
      {searchModalOpen && (
        <QuickSearchModal
          searchModalOpen={searchModalOpen}
          setSearchModalOpen={setSearchModalOpen}
        />
      )}
      {/* Wrapper for entire page */}
      <div className="flex flex-col items-center">
        <NavBar />

        <div className="font-heading page-title">Films</div>

        <SearchBar
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          placeholderString={"Search by film's title ..."}
        />

        {!isSearching && (
          <div className="yourListConsole">
            <div className="page-subtitle mb-2 md:ml-12 ">Your Films:</div>

            <Toggle_Three
              label="Filter"
              width={`20rem`}
              height={`2.5rem`}
              state={queryString}
              setState={setQueryString}
              stateDetails={{
                1: { value: "watched", label: "Watched" },
                2: { value: "watchlisted", label: "Watchlist" },
                3: { value: "watched/rated", label: "Rated" },
              }}
            />

            <Toggle_Two
              label="Sort By"
              width={`20rem`}
              height={`2.5rem`}
              state={sortBy}
              setState={setSortBy}
              stateDetails={{
                1: { value: "added_date", label: "Recently Added" },
                2: { value: "released_date", label: "Released Year" },
              }}
            />

            <Toggle_Two
              label="Sort Order"
              width={`10rem`}
              height={`2.5rem`}
              state={sortDirection}
              setState={setSortDirection}
              stateDetails={{
                1: {
                  value: "desc",
                  label: (
                    <FaSortNumericDownAlt className="text-xl mt-0 w-[5rem]" />
                  ),
                },
                2: {
                  value: "asc",
                  label: (
                    <FaSortNumericDown className="text-xl mt-0 w-[5rem]" />
                  ),
                },
              }}
            />

            {queryString === "watched/rated" && (
              <Toggle_Four
                label="Rating"
                width={`20rem`}
                height={`2.5rem`}
                state={numStars}
                setState={setNumStars}
                stateDetails={{
                  1: {
                    value: 0,
                    label: <span className="">All</span>,
                  },
                  2: {
                    value: 3,
                    label: (
                      <span className="text-2xl text-pink-600">
                        &#10048;&#10048;&#10048;
                      </span>
                    ),
                  },
                  3: {
                    value: 2,
                    label: (
                      <span className="text-2xl text-pink-600">
                        &#10048;&#10048;
                      </span>
                    ),
                  },
                  4: {
                    value: 1,
                    label: (
                      <span className="text-2xl text-pink-600">&#10048;</span>
                    ),
                  },
                }}
              />
            )}
          </div>
        )}

        {/* If user logged in and is not searching, show them list of liked films */}
        {!isSearching && authState.status && (
          <div className="mt-0">
            <FilmUser_Gallery
              listOfFilmObjects={userFilmList}
              queryString={queryString}
              sortDirection={sortDirection}
              sortBy={sortBy}
            />
          </div>
        )}

        {/* If user logged in and is not searching, show them list of liked films */}
        {!authState.status && !isSearching && (
          <div className="mt-10 mb-20 text-sm md:text-base">
            Log in to interact with films!
          </div>
        )}

        {/* If user is searching (even when they're not logged in), show them list of search results */}
        {isSearching && (
          <div className="mt-10 md:mt-20 flex flex-col items-center border-red-500 w-full relative">
            <div className="page-subtitle flex items-center justify-center">
              Search Results:
            </div>

            <FilmTMDB_Gallery listOfFilmObjects={searchResult} />
          </div>
        )}
      </div>
    </div>
  )
}
