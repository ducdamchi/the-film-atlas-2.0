import { useEffect, useState } from "react"
import {
  getReleaseYear,
  getNiceMonthYear,
} from "../../../Utils/helperFunctions"

import UserFilmCard from "./UserFilmCard"
import type { UserFilm } from "@/types/film"

/** A group bucket produced by the reduce() grouping logic. */
interface FilmGroup {
  films: UserFilm[]
  groupName: string
}

/* @props:
- listOfFilmObjects: list of film objects to be displayed, already sorted. may need sorting again when using reduce() to group films by a certain category.
- queryString: "liked_films" or "watchlist". queryString to send to App's DB to retrieve a user's liked films or watchlist. Not used to query in this component, but if queryString !== null, it tells FilmGalleryDisplay that results are from the App's DB, not TMDB
- sortDirection: "asc" for ascending, "desc" for descending. used to sort array after using reduce() to group films by a certain category
- sortBy: "recently_added" or "released_date", help listOfFilmObjects.reduce() to handle which keys to use for each group (e.g. "This month", "last month" for recently_added; "2025", "2020", ... for released_date */

interface FilmUser_GalleryProps {
  listOfFilmObjects: UserFilm[]
  queryString: string
  sortDirection: "asc" | "desc"
  sortBy: "added_date" | "released_date"
}

export default function UserFilmGallery({
  listOfFilmObjects,
  queryString,
  sortDirection,
  sortBy,
}: FilmUser_GalleryProps) {
  // Grouped films stored as sorted [key, group] tuple pairs
  const [groupedFilms, setGroupedFilms] = useState<[string, FilmGroup][]>([])

  useEffect(() => {
    if (listOfFilmObjects && !("error" in listOfFilmObjects)) {
      const filmGroups = listOfFilmObjects.reduce<Record<string, FilmGroup>>((groups, film) => {
        let targetKey: string //the key to be used for each Group Object
        let groupName: string //the name to be displayed for each Group Object in HTML

        switch (queryString) {
          case "watched":
          case "watchlisted":
          case "watched/rated":
            switch (sortBy) {
              case "added_date": {
                const timestamp = film.added_date
                if (!timestamp) return groups
                targetKey = timestamp.slice(0, 7)
                groupName = getNiceMonthYear(targetKey)
                break
              }
              case "released_date":
                targetKey = String(getReleaseYear(film.release_date))
                groupName = targetKey
                break
              default:
                return groups
            }
            break
          default:
            console.log("No queryString found.")
            return groups
        }

        if (!groups[targetKey]) {
          groups[targetKey] = { films: [], groupName: "" }
        }
        groups[targetKey].films.push(film)
        groups[targetKey].groupName = groupName
        return groups
      }, {})

      /* Convert grouped list to array and sort based on sortDirection */
      let sortedFilmGroups: [string, FilmGroup][]
      if (filmGroups) {
        switch (sortBy) {
          case "added_date": //converts "yyyy-mm" string to numerical value (yyyymm, 202507, 202410, etc..) before sorting
            sortedFilmGroups = Object.entries(filmGroups).sort(([a], [b]) => {
              const dateA = parseInt(a.replace("-", ""))
              const dateB = parseInt(b.replace("-", ""))
              return sortDirection === "desc" ? dateB - dateA : dateA - dateB
            })
            break
          case "released_date": //only dealing with year here
            sortedFilmGroups = Object.entries(filmGroups).sort(([a], [b]) => {
              return sortDirection === "desc" ? Number(b) - Number(a) : Number(a) - Number(b)
            })
            break
          default:
            sortedFilmGroups = Object.entries(filmGroups)
        }
      } else {
        sortedFilmGroups = []
      }

      setGroupedFilms(sortedFilmGroups)
    }
  }, [listOfFilmObjects, queryString, sortBy, sortDirection])

  return (
    <div>
      {(listOfFilmObjects.length === 0 || "error" in listOfFilmObjects) && (
        <div className="mt-5 mb-20 text-sm md:text-base">No films found.</div>
      )}

      {listOfFilmObjects.length > 0 && groupedFilms !== undefined && (
        <div className="flex flex-col justify-center gap-10 mt-10 mb-20">
          {groupedFilms.map(([groupKey, groupObject]) => {
            return (
              <div key={`${groupKey}`} className="flex flex-col gap-2">
                <div className="page-subtitle ml-0">
                  {groupObject.groupName}
                </div>
                <div className="filmGallery-grid">
                  {groupObject.films.map((filmObject, filmKey) => (
                    /* Each film item */
                    <UserFilmCard
                      key={filmKey}
                      filmObject={filmObject}
                      queryString={queryString}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
