import { useEffect, useState } from "react"
import {
  getReleaseYear,
  getNiceMonthYear,
} from "../../../Utils/helperFunctions"

import FilmUser_Card from "./FilmUser_Card"

/* @props:
- listOfFilmObjects: list of film objects to be displayed, already sorted. may need sorting again when using reduce() to group films by a certain category.
- queryString: "liked_films" or "watchlist". queryString to send to App's DB to retrieve a user's liked films or watchlist. Not used to query in this component, but if queryString !== null, it tells FilmGalleryDisplay that results are from the App's DB, not TMDB
- sortDirection: "asc" for ascending, "desc" for descending. used to sort array after using reduce() to group films by a certain category
- sortCategory: "recently_added" or "released_date", help listOfFilmObjects.reduce() to handle which keys to use for each group (e.g. "This month", "last month" for recently_added; "2025", "2020", ... for released_date */
export default function FilmUser_Gallery({
  listOfFilmObjects,
  queryString,
  sortDirection,
  sortBy,
}) {
  const [groupedFilms, setGroupedFilms] = useState([])

  useEffect(() => {
    // console.log(listOfFilmObjects)
    /* User reduce() to group list of films by year */
    if (listOfFilmObjects && !listOfFilmObjects.error) {
      const filmGroups = listOfFilmObjects.reduce((groups, film) => {
        let targetKey //the key to be used for each Group Object
        let groupName //the name to be displayed for each Group Object in HTML

        switch (queryString) {
          case "watched":
            switch (sortBy) {
              case "added_date":
                const timestamp = film.Likes?.createdAt
                if (!timestamp) {
                  // console.log("Watched: No timestamp")
                  return groups
                }
                targetKey = timestamp.slice(0, 7)
                groupName = getNiceMonthYear(targetKey)
                break
              case "released_date":
                targetKey = getReleaseYear(film.release_date)
                groupName = targetKey
                break
            }
            break
          case "watchlisted":
            switch (sortBy) {
              case "added_date":
                // console.log(film)
                const timestamp = film.Saves?.createdAt
                if (!timestamp) {
                  // console.log("Watchlisted: No timestamp")
                  return groups
                }
                targetKey = timestamp.slice(0, 7)
                groupName = getNiceMonthYear(targetKey)
                break
              case "released_date":
                targetKey = getReleaseYear(film.release_date)
                groupName = targetKey
                break
            }
            break
          case "watched/rated":
            switch (sortBy) {
              case "added_date":
                // console.log(film)
                const timestamp = film.Likes?.updatedAt
                if (!timestamp) {
                  // console.log("Starred: No timestamp")
                  return groups
                }
                targetKey = timestamp.slice(0, 7)
                groupName = getNiceMonthYear(targetKey)
                break
              case "released_date":
                targetKey = getReleaseYear(film.release_date)
                groupName = targetKey
                break
            }
            break
          default:
            console.log("No queryString found.")
            return groups
        }

        // const year = getReleaseYear(film.release_date)
        if (!groups[targetKey]) {
          groups[targetKey] = {}
          groups[targetKey].films = []
          groups[targetKey].groupName = ""
        }
        groups[targetKey].films.push(film)
        groups[targetKey].groupName = groupName
        return groups
      }, {})

      // console.log(grouped)

      /* Convert grouped list to array and sort based on sortDirection */
      let sortedFilmGroups
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
              return sortDirection === "desc" ? b - a : a - b
            })
            break
        }
      }

      setGroupedFilms(sortedFilmGroups)
    }
  }, [listOfFilmObjects, queryString, sortBy, sortDirection])

  return (
    <div>
      {(listOfFilmObjects.length === 0 || listOfFilmObjects.error) && (
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
                    <FilmUser_Card
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
