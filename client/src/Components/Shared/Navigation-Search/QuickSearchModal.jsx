import React, { useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { getReleaseYear } from "../../../Utils/helperFunctions"
import {
  queryFilmFromTMDB,
  queryDirectorFromTMDB,
} from "../../../Utils/apiCalls"
import useClickOutside from "../../../Hooks/useClickOutside"

import {
  BiSearchAlt2,
  BiSolidRightArrowSquare,
  BiSolidRightArrowAlt,
} from "react-icons/bi"

export default function QuickSearchModal({
  searchModalOpen,
  setSearchModalOpen,
}) {
  const imgBaseUrl = "https://image.tmdb.org/t/p/original"
  const [searchInput, setSearchInput] = useState("")
  const [searchResult_Film, setSearchResult_Film] = useState([])
  const [searchResult_Director, setSearchResult_Director] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1) // -1 = focused on search bar
  const [displayedResults, setDisplayedResults] = useState([]) //displayed search results (max 7)

  const searchModalRef = useRef(null)
  const navigate = useNavigate()
  const resultsRef = useRef(null)

  const closeModal = () => {
    setSearchModalOpen(false)
  }

  const modalRef = useClickOutside(closeModal)

  useEffect(() => {
    if (resultsRef.current && searchModalRef.current) {
      if (focusedIndex === -1) {
        searchModalRef.current.focus()
      } else {
        displayedResults[focusedIndex].focus()
      }
    }
  }, [focusedIndex, resultsRef, searchModalRef])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault()
        /* Edge case: Arrow down at end of displayed results */
        if (focusedIndex === displayedResults.length - 1) {
          setFocusedIndex(-1) //Back to search bar
        } else {
          setFocusedIndex((prevIndex) => {
            return prevIndex + 1
          })
        }
      } else if (event.key === "ArrowUp") {
        event.preventDefault()
        /* Edge case: Arrow up at search bar */
        if (focusedIndex === -1) {
          setFocusedIndex(displayedResults.length - 1) //Back to search
        } else {
          setFocusedIndex((prevIndex) => {
            return prevIndex - 1
          })
        }
      } else if (event.key === "Escape") {
        closeModal()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [displayedResults, focusedIndex])

  useEffect(() => {
    if (resultsRef.current) {
      setDisplayedResults(resultsRef.current.querySelectorAll(".search-result"))
    }
  }, [searchResult_Film])

  /* Hook to automatically focus on Search Modal as it appears */
  useEffect(() => {
    if (searchModalOpen && searchModalRef.current) {
      searchModalRef.current.focus()
    }
  }, [searchModalOpen])

  /* Hook to detect if Quick Search Bar is being used, and handle page logic according */
  useEffect(() => {
    // console.log("Search Input: ", searchInput)
    const queryQuickSearch = async () => {
      if (
        /* If search modal is open and is non-empty, user is searching */
        searchModalOpen &&
        !(searchInput.trim().length === 0 || searchInput === null)
      ) {
        try {
          setIsSearching(true)
          const result_film = await queryFilmFromTMDB(searchInput)
          const result_dir = await queryDirectorFromTMDB(searchInput)
          setSearchResult_Film(result_film)
          setSearchResult_Director(result_dir)
        } catch (err) {
          console.log("Error Querying Film with Quick Search Modal: ", err)
        }
      } else {
        setIsSearching(false)
      }
    }
    queryQuickSearch()
  }, [searchModalOpen, searchInput])

  useEffect(() => {
    console.log(searchResult_Director)
  }, [searchResult_Director])

  return (
    <div className="font-primary fixed top-[20%] left-0 border-green-700 w-screen h-auto z-500 flex justify-center">
      <div
        className="relative w-[60%] h-auto min-w-[20rem] max-w-[32rem] bg-stone-900/80 text-stone-200 backdrop-blur-sm border-1 border-stone-500/80 rounded-md"
        ref={modalRef}>
        {/* Search bar */}
        <div className="relative flex justify-start h-auto  border-stone-500/80">
          <div className="relative w-full min-w-[10rem] h-[2.5rem] md:h-[3rem] xl:h-[3.5rem] p-2 flex items-center gap-3 ">
            <BiSearchAlt2 className="border-white ml-1 text-lg md:text-xl" />
            <input
              ref={searchModalRef}
              className="h-[4rem] w-full border-white focus:outline-0 input:bg-none text-base lg:text-lg"
              type="text"
              name="search-bar"
              autoComplete="off"
              placeholder="Quick search for films or directors..."
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value)
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  const inputValue = event.target.value
                  navigate("/films", {
                    state: { searchInputFromQuickSearch: inputValue },
                  })
                }
              }}></input>
            <button
              className="border-1 p-[3px] md:pb-1 md:pl-2 md:pr-2 rounded-md text-[12px] md:text-sm xl:text-base"
              onClick={() => setSearchModalOpen(false)}>
              esc
            </button>
          </div>
        </div>

        {/* Results */}
        {isSearching && (
          <div className="w-full text-white p-2" ref={resultsRef}>
            <div>
              <div className="p-2 pb-1">Films</div>
              {searchResult_Film.length === 0 && (
                <div className="m-2 ml-4">No results found.</div>
              )}
              {searchResult_Film.length > 0 && (
                <div className="flex flex-col justify-center gap-0">
                  {searchResult_Film.slice(0, 5).map((filmObject, key) => (
                    /* Each film item */
                    <Link
                      key={key}
                      id={`result-${key}`}
                      className="search-result film-item w-full h-[4rem] md:h-[5rem] flex justify-start items-center md:gap-1 gap-0 md:p-2 p-1 focus:bg-blue-600/80 hover:bg-stone-200/20 focus:outline-0 rounded-md"
                      to={`/films/${filmObject.id}`}
                      // state={{ currentViewMode: queryString }}
                    >
                      {/* Backdrop */}
                      <div className="group/thumbnail relative max-h-[5rem] max-w-[8rem] aspect-16/10 h-full">
                        <img
                          className="h-full w-auto object-cover transition-all duration-300 ease-out group-hover/thumbnail:scale-[1.03]"
                          src={
                            filmObject.backdrop_path !== null
                              ? `${imgBaseUrl}${filmObject.backdrop_path}`
                              : `backdropnotfound.jpg`
                          }
                          alt=""
                        />
                      </div>

                      {/* Text next to backdrop */}
                      <div className="text-sm lg:text-base w-full p-3">
                        <span className="font-bold uppercase transition-all duration-200 ease-out peer-hover:text-blue-800">
                          {}
                          {`${filmObject.title.slice(0, 20)}`}
                        </span>
                        {filmObject.title.length >= 20 && (
                          <span className="font-bold uppercase transition-all duration-200 ease-out hover:text-blue-800 text-lg">
                            ...
                          </span>
                        )}
                        <br />
                        {filmObject.release_date && (
                          <span className="">
                            {`${getReleaseYear(filmObject.release_date)}`}
                          </span>
                        )}
                      </div>

                      <div className=" flex w-[3rem] md:w-[12rem] items-center justify-center gap-1">
                        <span className="hidden md:block text-base">
                          Go to Film
                        </span>
                        <BiSolidRightArrowSquare className="text-xl" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-2">
              <div className="p-2 pb-1">Directors</div>

              {searchResult_Director?.length === 0 && (
                <div className="m-2 ml-4">No results found.</div>
              )}
              {searchResult_Director?.length > 0 && (
                <div className="flex flex-col justify-center gap-0">
                  {searchResult_Director
                    ?.filter(
                      (filmObject) =>
                        filmObject.known_for_department === "Directing",
                    )
                    .slice(0, 3)
                    .map((filmObject, key) => (
                      /* Each film item */
                      <Link
                        key={key}
                        id={`result-${key}`}
                        className="search-result film-item w-full h-[4rem] md:h-[5rem] flex justify-start items-center md:gap-1 gap-0 md:p-2 p-1 focus:bg-blue-600/80 hover:bg-stone-200/20 focus:outline-0 rounded-md"
                        to={`/person/director/${filmObject.id}`}
                        // state={{ currentViewMode: queryString }}
                      >
                        {/* Backdrop */}
                        <div className="group/thumbnail relative max-h-[5rem] max-w-[8rem] aspect-16/10 h-full">
                          <img
                            className="h-full w-auto object-cover transition-all duration-300 ease-out group-hover/thumbnail:scale-[1.03]"
                            src={
                              filmObject?.profile_path !== null
                                ? `${imgBaseUrl}${filmObject.profile_path}`
                                : `profilepicnotfound.jpg`
                            }
                            alt=""
                          />
                        </div>

                        {/* Text next to backdrop */}
                        <div className="text-sm lg:text-base w-full p-3">
                          <span className="font-bold uppercase transition-all duration-200 ease-out peer-hover:text-blue-800">
                            {}
                            {`${filmObject?.name?.slice(0, 20)}`}
                          </span>
                          {filmObject?.name?.length >= 20 && (
                            <span className="font-bold uppercase transition-all duration-200 ease-out hover:text-blue-800 text-lg">
                              ...
                            </span>
                          )}
                          {/* <br />
                          {filmObject?.release_date && (
                            <span className="">
                              {`${getReleaseYear(filmObject?.release_date)}`}
                            </span>
                          )} */}
                        </div>

                        <div className=" flex w-[3rem] md:w-[12rem] items-center justify-center gap-1">
                          <span className="hidden md:block text-base">
                            Go to Director
                          </span>
                          <BiSolidRightArrowSquare className="text-xl" />
                        </div>
                      </Link>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
