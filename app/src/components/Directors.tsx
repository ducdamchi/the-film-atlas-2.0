/* Libraries */
import { useEffect, useState } from "react"
import { useLocation } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"

/* Custom functions */
import { useAuth } from "../utils/authContext"
import { queryPersonFromTMDB } from "../utils/apiCalls"
import { usePersistedState } from "../hooks/usePersistedState"
import { directorsQueryOptions } from "@/queries/directors.queries"

/**
 * TMDB /search/person result shape — includes `known_for` which the
 * DirectorTMDB_Gallery renders. This field is absent from the shared
 * TMDBPerson type (which models the full detail endpoint) and from
 * TMDBSearchResult (which models /search/multi), so we define it locally here.
 */
interface DirectorSearchResult {
  id: number
  name: string
  profile_path: string | null
  known_for_department?: string
  known_for: Array<{
    title?: string
    name?: string
    original_title?: string
  }>
}

/* Components */
import SearchBar from "./search/SearchBar"
import TmdbDirectorGallery from "./directors/TmdbDirectorGallery"
import UserDirectorGallery from "./directors/UserDirectorGallery"
import Toggle from "./ui-custom/Toggle"

/* Icons */
import {
  FaSortNumericDown,
  FaSortNumericDownAlt,
  FaSortAlphaDown,
  FaSortAlphaDownAlt,
} from "react-icons/fa"

type DirectorSortBy = "name" | "score" | "highest_star"
type SortDirection = "asc" | "desc"

export default function Directors() {
  const [searchInput, setSearchInput] = useState<string>("")
  const [searchResult, setSearchResult] = useState<DirectorSearchResult[]>([])
  const [isSearching, setIsSearching] = useState<boolean>(false)
  const [sortBy, setSortBy] = usePersistedState<DirectorSortBy>(
    "directors-sortBy",
    "name",
  )
  const [sortDirection, setSortDirection] = usePersistedState<SortDirection>(
    "directors-sortDirection",
    "desc",
  )
  const { authState } = useAuth()
  const location = useLocation()

  const { data: directorData = [], isLoading } = useQuery({
    ...directorsQueryOptions,
    enabled: !!authState.status,
  })

  /* Query director from TMDB with Quick Search Modal's Search Input */
  useEffect(() => {
    try {
      if (location.state) {
        const { searchInputFromQuickSearch } =
          (location.state as { searchInputFromQuickSearch?: string }) || {}
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
          // queryPersonFromTMDB wraps /search/person results which include
          // `known_for`. The return type is TMDBPerson[] but the runtime data
          // carries the extra field — cast here so DirectorTMDB_Gallery renders it.
          const result = (await queryPersonFromTMDB(
            searchInput,
          )) as unknown as DirectorSearchResult[]
          const filtered_result = result.filter(
            (person) => person.known_for_department === "Directing",
          )
          setSearchResult(filtered_result)
        }
      } catch (err) {
        console.log("Error Querying Film: ", err)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchInput])

  return (
    <div className="font-primary min-h-screen inset-0 left-[3rem]">
      {/* Wrapper for entire page */}
      <div className="@container flex flex-col items-center">
        <div className="font-heading page-title">DIRECTORS</div>

        <SearchBar
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          placeholderString={`Search by director's name ...`}
        />

        {!isSearching && (
          <div className="yourListConsole">
            {/* <span className="page-subtitle mb-2 md:ml-12">Your Directors:</span> */}
            <Toggle<DirectorSortBy>
              label="Sort By"
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: "name", label: "Name" },
                { value: "score", label: "Score" },
                { value: "highest_star", label: "Stars" },
              ]}
            />
            {sortBy === "name" && (
              <Toggle<SortDirection>
                label="Sort Order"
                value={sortDirection}
                onChange={setSortDirection}
                options={[
                  {
                    value: "desc",
                    label: <FaSortAlphaDown className="text-xl w-[5rem]" />,
                  },
                  {
                    value: "asc",
                    label: <FaSortAlphaDownAlt className="text-xl w-[5rem]" />,
                  },
                ]}
              />
            )}
            {(sortBy === "score" || sortBy === "highest_star") && (
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
            )}
          </div>
        )}
        {/* If user logged in and is not searching, show them list of directors */}
        {!isSearching && !isLoading && authState.status && (
          <div className="mt-10">
            <UserDirectorGallery
              listOfDirectorObjects={directorData}
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

        {/* If user is searching, show list of search results */}
        {isSearching && (
          <div className="mt-10 md:mt-20 flex flex-col items-center w-full relative">
            <div className="page-subtitle flex items-center justify-center">
              Search Results:
            </div>
            <TmdbDirectorGallery listOfDirectorObjects={searchResult} />
          </div>
        )}
      </div>
    </div>
  )
}
