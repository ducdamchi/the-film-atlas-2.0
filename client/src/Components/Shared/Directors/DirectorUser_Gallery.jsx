import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import {
  RiCreativeCommonsZeroFill,
  RiCreativeCommonsZeroLine,
} from "react-icons/ri"

export default function DirectorUser_Gallery({
  listOfDirectorObjects,
  sortDirection,
  sortBy,
}) {
  const imgBaseUrl = "https://image.tmdb.org/t/p/original"
  const navigate = useNavigate()
  const [groupedDirectors, setGroupedDirectors] = useState([])
  const [hoverId, setHoverId] = useState(null)

  useEffect(() => {
    // console.log("beginning:", listOfDirectorObjects)
    /* User reduce() to group list of films by year */
    if (listOfDirectorObjects) {
      const directorGroups = listOfDirectorObjects.reduce(
        (groups, director) => {
          let targetKey //the key to be used for each Group Object
          let groupName //the name to be displayed for each Group Object in HTML

          switch (sortBy) {
            case "name":
              if (!director.name) {
                console.error("Director's Name not found.")
                return groups
              }
              targetKey = director.name.slice(0, 1)
              groupName = targetKey

              break
            case "score":
              if (!director.WatchedDirectors.score) {
                console.error("Director's Score not found.")
                return groups
              }
              //director.score is a float number (max 4 digits, max 2 decimal points) written as a string. First, split() the string, which will return two parts, the integer and the decimal points. Then, use the integer part as the targetKey
              const splits = director.WatchedDirectors.score.split(".")
              targetKey = splits[0]
              groupName = targetKey
              break
            case "highest_star":
              if (
                ![0, 1, 2, 3].includes(director.WatchedDirectors.highest_star)
              ) {
                console.error("Director's Highest Star not found.")
                return groups
              }
              targetKey = director.WatchedDirectors.highest_star
              if (targetKey === 3) {
                groupName = (
                  <div className=" text-3xl text-pink-600 flex flex-col items-center justify-center">
                    <div className="">&#10048;</div>
                    <div className="flex gap-2">
                      <div>&#10048;</div>
                      <div>&#10048;</div>
                    </div>
                  </div>
                )
              } else if (targetKey === 2) {
                groupName = (
                  <div className=" text-3xl text-pink-600">
                    &#10048;&#10048;
                  </div>
                )
              } else if (targetKey === 1) {
                groupName = (
                  <div className=" text-3xl text-pink-600">&#10048;</div>
                )
              } else if (targetKey === 0) {
                groupName = (
                  <div className=" text-3xl text-black">
                    {/* <RiCreativeCommonsZeroLine /> */}
                    &#10048;
                  </div>
                )
              }
              break
          }

          if (!groups[targetKey]) {
            groups[targetKey] = {
              directors: [],
              groupName: null,
            }
          }
          groups[targetKey].directors.push(director)
          groups[targetKey].groupName = groupName
          return groups
        },
        {},
      )
      // console.log("before sorting: ", directorGroups)

      /* Convert grouped list to array and sort based on sortDirection */
      let sortedDirectorGroups
      if (directorGroups) {
        sortedDirectorGroups = Object.entries(directorGroups).sort((a, b) => {
          const valueA = parseInt(a[0])
          const valueB = parseInt(b[0])
          return sortDirection === "desc" ? valueB - valueA : valueA - valueB
        })
      }
      // console.log("after sorting: ", sortedDirectorGroups)

      const finalArray = []
      for (const group of sortedDirectorGroups) {
        finalArray.push(group[1].groupName) // push GroupName, then push all the directors
        for (const director of group[1].directors) {
          finalArray.push(director)
        }
      }
      // console.log("final: ", finalArray)

      setGroupedDirectors(finalArray)
    }
  }, [listOfDirectorObjects, sortBy, sortDirection])

  /* Avg_rating: total stars / total films watched. max value = 3
  watchScore: use logarithm function that rewards a director when a user watches multiple films from them. max value = 1 (when user watches 10 or more films, watchScore = 1) 
  finalScore: max(avg_rating) = 3; max(watchScore) = 1; multiply avg_rating by 2 (max 6); multiply watchScore by 4 (max 4). This will achieve a score on a scale of 10, where avg_rating has 60% weight, and num_watched_films has 40% weight.*/

  return (
    <div>
      {listOfDirectorObjects.length === 0 && (
        <div className="mt-10 mb-20 text-sm md:text-base">
          No directors found.
        </div>
      )}

      {listOfDirectorObjects.length > 0 && groupedDirectors !== undefined && (
        <div className="border-0 grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-0 md:mt-5 mt-0 mb-20 border-0 gap-1">
          {groupedDirectors.map((groupObject, key) => {
            if (!groupObject.id) {
              return (
                <div
                  key={key}
                  className="font-bold text-[3rem] sm:text-[4rem] 2xl:text-[5rem] flex items-center justify-center pb-5 w-[5rem] h-[9rem] sm:w-[7rem] sm:h-[12.6rem] 2xl:w-[8rem] 2xl:h-[14.4rem] animate-[spin-y_10s_linear_infinite] [transform-style:preserve-3d] text-shadow-lg"
                  style={{ animationDelay: `${key * 0.23}s` }}>
                  {groupObject}
                </div>
              )
            } else {
              return (
                <div key={key} className="flex justify-center">
                  <div
                    className="flex flex-col gap-0 items-center justify-start  w-[5rem] h-[9rem] sm:w-[7rem] sm:h-[12.6rem] 2xl:w-[8rem] 2xl:h-[14.4rem] group/thumbnail overflow-hidden mb-1"
                    onClick={() => {
                      navigate(`/person/director/${groupObject.id}`)
                    }}>
                    <div
                      className="relative w-full aspect-4/6 overflow-hidden border-3 rounded-none flex justify-center items-center"
                      onMouseEnter={() => {
                        setHoverId(key)
                      }}
                      onMouseLeave={() => {
                        setHoverId(null)
                      }}>
                      <img
                        className="object-cover w-full h-full max-h-[7.5rem] sm:max-h-[10.5rem] 2xl:max-h-[12rem] transition-all duration-300 ease-out group-hover/thumbnail:scale-[1.03] grayscale transform  brightness-110"
                        src={
                          groupObject.profile_path !== null
                            ? `${imgBaseUrl}${groupObject.profile_path}`
                            : `/profilepicnotfound.jpg`
                        }
                      />
                      {hoverId === key && (
                        <div className="absolute w-full text-[12px] w-full h-full bg-black/60 text-white p-1 flex flex-col justify-center items-center md:gap-2">
                          <span>
                            {`Watched: ${groupObject.WatchedDirectors.num_watched_films}`}
                          </span>
                          <span>
                            {`Starred: ${groupObject.WatchedDirectors.num_starred_films}`}
                          </span>
                          <span>
                            {`Score: ${groupObject.WatchedDirectors.score}`}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-[12px] sm:text-sm italic text-center w-[5rem] pt-1 overflow-hidden line-clamp-2 break-words h-[2.5rem] sm:h-[3rem]">
                      {groupObject.name}
                    </div>
                  </div>
                </div>
              )
            }
          })}
        </div>
      )}
    </div>
  )
}
