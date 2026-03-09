import React, { useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { getReleaseYear } from "../../../Utils/helperFunctions"
import {
  queryFilmFromTMDB,
  queryPersonFromTMDB,
  queryMultiFromTMDB,
} from "../../../Utils/apiCalls"
import useClickOutside from "../../../Hooks/useClickOutside"

import {
  BiSearchAlt2,
  BiSolidRightArrowSquare,
} from "react-icons/bi"

const imgBaseUrl = "https://image.tmdb.org/t/p/original"

const SECTION_NAMES = ["Films", "Directors", "Actors"]

function rankSections(multiResults) {
  const scores = { Films: 0, Directors: 0, Actors: 0 }
  // Weight top results more heavily: 1st = 5pts, 2nd = 4pts, ... 5th+ = 1pt
  multiResults.slice(0, 5).forEach((item, i) => {
    const weight = Math.max(5 - i, 1)
    if (item.media_type === "movie") {
      scores.Films += weight
    } else if (item.media_type === "person") {
      if (item.known_for_department === "Directing") scores.Directors += weight
      else if (item.known_for_department === "Acting") scores.Actors += weight
    }
  })
  return [...SECTION_NAMES].sort((a, b) => scores[b] - scores[a])
}

function SearchResultItem({ to, imageSrc, label, sublabel, linkText }) {
  return (
    <Link
      className="search-result w-full h-[4rem] md:h-[5rem] flex justify-start items-center md:gap-1 gap-0 md:p-2 p-1 focus:bg-blue-600/80 hover:bg-stone-200/20 focus:outline-0 rounded-md"
      to={to}>
      <div className="group/thumbnail relative max-h-[5rem] max-w-[8rem] aspect-16/10 h-full">
        <img
          className="h-full w-auto object-cover transition-all duration-300 ease-out group-hover/thumbnail:scale-[1.03]"
          src={imageSrc}
          alt=""
        />
      </div>
      <div className="text-sm lg:text-base w-full p-3">
        <span className="font-bold uppercase">{label.slice(0, 20)}</span>
        {label.length >= 20 && (
          <span className="font-bold uppercase text-lg">...</span>
        )}
        {sublabel && (
          <>
            <br />
            <span>{sublabel}</span>
          </>
        )}
      </div>
      <div className="flex w-[3rem] md:w-[12rem] items-center justify-center gap-1">
        <span className="hidden md:block text-base">{linkText}</span>
        <BiSolidRightArrowSquare className="text-xl" />
      </div>
    </Link>
  )
}

function SearchSection({ title, results, maxItems, renderItem }) {
  return (
    <div className="mt-2">
      <div className="p-2 pb-1">{title}</div>
      {results.length === 0 ? (
        <div className="m-2 ml-4">No results found.</div>
      ) : (
        <div className="flex flex-col justify-center gap-0">
          {results.slice(0, maxItems).map((item, key) => renderItem(item, key))}
        </div>
      )}
    </div>
  )
}

export default function QuickSearchModal({
  searchModalOpen,
  setSearchModalOpen,
}) {
  const [searchInput, setSearchInput] = useState("")
  const [searchResult_Film, setSearchResult_Film] = useState([])
  const [searchResult_Director, setSearchResult_Director] = useState([])
  const [searchResult_Actor, setSearchResult_Actor] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [sectionOrder, setSectionOrder] = useState(["Films", "Directors", "Actors"])
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [displayedResults, setDisplayedResults] = useState([])

  const searchModalRef = useRef(null)
  const navigate = useNavigate()
  const resultsRef = useRef(null)

  const closeModal = () => setSearchModalOpen(false)
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
        if (focusedIndex === displayedResults.length - 1) {
          setFocusedIndex(-1)
        } else {
          setFocusedIndex((prev) => prev + 1)
        }
      } else if (event.key === "ArrowUp") {
        event.preventDefault()
        if (focusedIndex === -1) {
          setFocusedIndex(displayedResults.length - 1)
        } else {
          setFocusedIndex((prev) => prev - 1)
        }
      } else if (event.key === "Escape") {
        closeModal()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [displayedResults, focusedIndex])

  useEffect(() => {
    if (resultsRef.current) {
      setDisplayedResults(resultsRef.current.querySelectorAll(".search-result"))
    }
  }, [searchResult_Film])

  useEffect(() => {
    if (searchModalOpen && searchModalRef.current) {
      searchModalRef.current.focus()
    }
  }, [searchModalOpen])

  useEffect(() => {
    if (!searchModalOpen || searchInput.trim().length === 0 || searchInput === null) {
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    const timer = setTimeout(async () => {
      try {
        const [result_film, result_persons, result_multi] = await Promise.all([
          queryFilmFromTMDB(searchInput),
          queryPersonFromTMDB(searchInput),
          queryMultiFromTMDB(searchInput),
        ])
        setSearchResult_Film(result_film)
        setSearchResult_Director(
          result_persons.filter((p) => p.known_for_department === "Directing"),
        )
        setSearchResult_Actor(
          result_persons.filter((p) => p.known_for_department === "Acting"),
        )
        setSectionOrder(rankSections(result_multi))
      } catch (err) {
        console.log("Error Querying Film with Quick Search Modal: ", err)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchModalOpen, searchInput])

  return (
    <div className="font-primary fixed top-[20%] left-0 w-screen h-auto z-500 flex justify-center">
      <div
        className="relative w-[60%] h-auto min-w-[20rem] max-w-[32rem] bg-stone-900/80 text-stone-200 backdrop-blur-sm border-1 border-stone-500/80 rounded-md"
        ref={modalRef}>
        {/* Search bar */}
        <div className="relative flex justify-start h-auto border-stone-500/80">
          <div className="relative w-full min-w-[10rem] h-[2.5rem] md:h-[3rem] xl:h-[3.5rem] p-2 flex items-center gap-3">
            <BiSearchAlt2 className="border-white ml-1 text-lg md:text-xl" />
            <input
              ref={searchModalRef}
              className="h-[4rem] w-full border-white focus:outline-0 input:bg-none text-base lg:text-lg"
              type="text"
              name="search-bar"
              autoComplete="off"
              placeholder="Quick search for films or directors..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  navigate("/films", {
                    state: { searchInputFromQuickSearch: e.target.value },
                  })
                }
              }}
            />
            <button
              className="border-1 p-[3px] md:pb-1 md:pl-2 md:pr-2 rounded-md text-[12px] md:text-sm xl:text-base"
              onClick={closeModal}>
              esc
            </button>
          </div>
        </div>

        {/* Results */}
        {isSearching && (
          <div className="w-full text-white p-2 max-h-[60vh] overflow-y-auto" ref={resultsRef}>
            {sectionOrder.map((section) => {
              if (section === "Films") return (
                <SearchSection
                  key="Films"
                  title="Films"
                  results={searchResult_Film}
                  maxItems={5}
                  renderItem={(film, key) => (
                    <SearchResultItem
                      key={key}
                      to={`/films/${film.id}`}
                      imageSrc={film.backdrop_path ? `${imgBaseUrl}${film.backdrop_path}` : "backdropnotfound.jpg"}
                      label={film.title}
                      sublabel={film.release_date ? getReleaseYear(film.release_date) : null}
                      linkText="Go to Film"
                    />
                  )}
                />
              )
              if (section === "Directors") return (
                <SearchSection
                  key="Directors"
                  title="Directors"
                  results={searchResult_Director}
                  maxItems={3}
                  renderItem={(person, key) => (
                    <SearchResultItem
                      key={key}
                      to={`/person/director/${person.id}`}
                      imageSrc={person.profile_path ? `${imgBaseUrl}${person.profile_path}` : "profilepicnotfound.jpg"}
                      label={person.name}
                      sublabel={null}
                      linkText="Go to Director"
                    />
                  )}
                />
              )
              if (section === "Actors") return (
                <SearchSection
                  key="Actors"
                  title="Actors"
                  results={searchResult_Actor}
                  maxItems={3}
                  renderItem={(person, key) => (
                    <SearchResultItem
                      key={key}
                      to={`/person/actor/${person.id}`}
                      imageSrc={person.profile_path ? `${imgBaseUrl}${person.profile_path}` : "profilepicnotfound.jpg"}
                      label={person.name}
                      sublabel={null}
                      linkText="Go to Actor"
                    />
                  )}
                />
              )
              return null
            })}
          </div>
        )}
      </div>
    </div>
  )
}
