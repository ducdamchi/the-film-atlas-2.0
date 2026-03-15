/* Libraries */
import React, { useEffect, useState, useContext, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"

/* Custom functions */
import { AuthContext } from "../Utils/authContext"
import {
  queryPersonFromTMDB,
  fetchDirectorListByParams,
} from "../Utils/apiCalls"
import useCommandKey from "../Hooks/useCommandKey"
import { usePersistedState } from "../Hooks/usePersistedState"

/* Components */
import NavBar from "./Shared/Navigation-Search/NavBar"
import SearchBar from "./Shared/Navigation-Search/SearchBar"
import DirectorTMDB_Gallery from "./Shared/Directors/DirectorTMDB_Gallery"
import DirectorUser_Gallery from "./Shared/Directors/DirectorUser_Gallery"
import QuickSearchModal from "./Shared/Navigation-Search/QuickSearchModal"
import Toggle_Three from "./Shared/Buttons/Toggle_Three"
import Toggle_Two from "./Shared/Buttons/Toggle_Two"

/* Icons */
import {
  FaSortNumericDown,
  FaSortNumericDownAlt,
  FaSortAlphaDown,
  FaSortAlphaDownAlt,
} from "react-icons/fa"

export default function Directors() {
  const [searchInput, setSearchInput] = usePersistedState(
    "directors-searchInput",
    ""
  )
  const [searchResult, setSearchResult] = useState([])
  const [userDirectorList, setUserDirectorList] = useState([])
  const [isSearching, setIsSearching] = usePersistedState(
    "directors-isSearching",
    false
  )
  const [isLoading, setIsLoading] = useState(false)
  const [numStars, setNumStars] = usePersistedState("directors-numStars", 0)
  const [sortBy, setSortBy] = usePersistedState("directors-sortBy", "name")
  const [sortDirection, setSortDirection] = usePersistedState(
    "directors-sortDirection",
    "desc"
  )
  const [scrollPosition, setScrollPosition] = usePersistedState(
    "directors-scrollPosition",
    0
  )
  const { authState, searchModalOpen, setSearchModalOpen } =
    useContext(AuthContext)
  const location = useLocation()
  const navigate = useNavigate()

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

  /* Query films from TMDB with Quick Search Modal's Search Input */
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

  /* Query director from TMDB with Search Bar */
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        if (searchInput.trim().length === 0 || searchInput === null) {
          setIsSearching(false)
        } else {
          setIsSearching(true)
          const result = await queryPersonFromTMDB(searchInput)
          const filtered_result = result.filter(
            (person) => person.known_for_department === "Directing"
          )
          setSearchResult(filtered_result)
        }
      } catch (err) {
        console.log("Error Querying Film: ", err)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchInput])

  /* Fetch User's Directors list (liked, watchlisted or starred) from App's DB */
  useEffect(() => {
    if (authState.status) {
      const fetchUserDirectorList = async () => {
        try {
          setIsLoading(true)
          const result = await fetchDirectorListByParams({
            sortBy: sortBy,
            sortDirection: sortDirection,
            numStars: numStars,
          })
          setUserDirectorList(result)
        } catch (err) {
          console.err("Error Fetching Directors List: ", err)
        } finally {
          setIsLoading(false)
        }
      }
      fetchUserDirectorList()
    }
    // else {
    //   alert("Log in to interact with directors!")
    // }
  }, [sortDirection, sortBy, numStars])

  return (
    <div className="font-primary mt-20 min-h-screen">
      {/* Quick Search Modal */}
      {searchModalOpen && (
        <QuickSearchModal
          searchModalOpen={searchModalOpen}
          setSearchModalOpen={setSearchModalOpen}
        />
      )}
      {/* Wrapper for entire page */}
      <div className=" flex flex-col items-center">
        <NavBar />

        <div className="font-heading page-title">DIRECTORS</div>

        <SearchBar
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          placeholderString={`Search by director's name ...`}
        />

        {!isSearching && (
          <div className="yourListConsole">
            <span className="page-subtitle mb-2 md:ml-12">Your Directors:</span>
            <Toggle_Three
              label="Sort By"
              width={`20rem`}
              height={`2.5rem`}
              state={sortBy}
              setState={setSortBy}
              stateDetails={{
                1: { value: "name", label: "Name" },
                2: { value: "score", label: "Score" },
                3: { value: "highest_star", label: "Stars" },
              }}
            />
            {sortBy === "name" && (
              <Toggle_Two
                label="Sort Order"
                width={`10rem`}
                height={`2.5rem`}
                state={sortDirection}
                setState={setSortDirection}
                stateDetails={{
                  1: {
                    value: "desc",
                    label: <FaSortAlphaDown className="text-xl w-[5rem]" />,
                  },
                  2: {
                    value: "asc",
                    label: <FaSortAlphaDownAlt className="text-xl w-[5rem]" />,
                  },
                }}
              />
            )}
            {(sortBy === "score" || sortBy === "highest_star") && (
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
            )}
          </div>
        )}
        {/* If user logged in and is not searching, show them list of liked films */}
        {!isSearching && !isLoading && authState.status && (
          <div className="mt-10">
            {/* <span>Your Films:</span> */}
            <DirectorUser_Gallery
              listOfDirectorObjects={userDirectorList}
              sortDirection={sortDirection}
              sortBy={sortBy}
            />
          </div>
        )}

        {!authState.status && !isSearching && (
          <div className="mt-10 mb-20 text-sm md:text-base">
            Log in to interact with directors!
          </div>
        )}

        {/* If user is searching (even when they're not logged in), show them list of search results */}
        {isSearching && (
          <div className="mt-10 md:mt-20 flex flex-col items-center border-red-500 w-full relative">
            <div className="page-subtitle flex items-center justify-center">
              Search Results:
            </div>
            <DirectorTMDB_Gallery listOfDirectorObjects={searchResult} />
          </div>
        )}
      </div>
    </div>
  )
}
