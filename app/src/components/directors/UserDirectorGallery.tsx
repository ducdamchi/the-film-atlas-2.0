import { useEffect, useEffectEvent, useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import type { Director } from "@/types/film"
import { computeDirectorScore } from "@/utils/directorScore"

type SortBy = "name" | "score" | "highest_star"
type SortDirection = "asc" | "desc"

interface DirectorUser_GalleryProps {
  listOfDirectorObjects: Director[]
  sortDirection: SortDirection
  sortBy: SortBy
}

/**
 * A flattened array entry: either a group-name label (JSX element or string)
 * or a Director object. We use a discriminated shape to keep both.
 */
type FlatItem =
  | { kind: "label"; content: React.ReactNode }
  | { kind: "director"; director: Director }

export default function UserDirectorGallery({
  listOfDirectorObjects,
  sortDirection,
  sortBy,
}: DirectorUser_GalleryProps) {
  const imgBaseUrl = import.meta.env.VITE_TMDB_IMG_URL
  const navigate = useNavigate()
  const [groupedDirectors, setGroupedDirectors] = useState<FlatItem[]>([])
  const [hoverId, setHoverId] = useState<number | null>(null)

  useEffect(() => {
    if (listOfDirectorObjects) {
      interface DirectorGroup {
        directors: Director[]
        groupName: React.ReactNode
      }

      const directorGroups = listOfDirectorObjects.reduce<
        Record<string, DirectorGroup>
      >((groups, director) => {
        let targetKey: string
        let groupName: React.ReactNode

        switch (sortBy) {
          case "name":
            if (!director.name) {
              console.error("Director's Name not found.")
              return groups
            }
            targetKey = director.name.slice(0, 1)
            groupName = targetKey
            break
          case "score": {
            const score = computeDirectorScore(director.WatchedDirectors)
            const splits = score.toFixed(2).split(".")
            targetKey = splits[0]
            groupName = targetKey
            break
          }
          case "highest_star": {
            const hs = director.WatchedDirectors.highest_star
            if (![0, 1, 2, 3].includes(hs)) {
              console.error("Director's Highest Star not found.")
              return groups
            }
            targetKey = String(hs)
            if (hs === 3) {
              groupName = (
                <div className=" text-3xl text-star flex flex-col items-center justify-center">
                  <div className="">&#10048;</div>
                  <div className="flex gap-2">
                    <div>&#10048;</div>
                    <div>&#10048;</div>
                  </div>
                </div>
              )
            } else if (hs === 2) {
              groupName = (
                <div className=" text-3xl text-star">&#10048;&#10048;</div>
              )
            } else if (hs === 1) {
              groupName = <div className=" text-3xl text-star">&#10048;</div>
            } else {
              groupName = <div className=" text-3xl text-dark">&#10048;</div>
            }
            break
          }
          default:
            return groups
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
      }, {})

      /* Convert grouped list to array and sort based on sortDirection */
      let sortedDirectorGroups: [string, DirectorGroup][]
      if (directorGroups) {
        sortedDirectorGroups = Object.entries(directorGroups).sort((a, b) => {
          const valueA = parseInt(a[0])
          const valueB = parseInt(b[0])
          return sortDirection === "desc" ? valueB - valueA : valueA - valueB
        })
      } else {
        sortedDirectorGroups = []
      }

      const finalArray: FlatItem[] = []
      for (const group of sortedDirectorGroups) {
        finalArray.push({ kind: "label", content: group[1].groupName })
        for (const director of group[1].directors) {
          finalArray.push({ kind: "director", director })
        }
      }

      setGroupedDirectors(finalArray)
    }
  }, [listOfDirectorObjects, sortBy, sortDirection])

  return (
    <div>
      {listOfDirectorObjects.length === 0 && (
        <div className="mt-10 mb-20 text-sm md:text-base">
          No directors found.
        </div>
      )}

      {listOfDirectorObjects.length > 0 && groupedDirectors !== undefined && (
        <div className="border-0 grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-0 md:mt-5 mt-0 mb-20 border-0 gap-1">
          {groupedDirectors.map((item, key) => {
            if (item.kind === "label") {
              return (
                <div
                  key={key}
                  className="font-bold text-[3rem] sm:text-[4rem] 2xl:text-[5rem] flex items-center justify-center pb-5 w-[5rem] h-[9rem] sm:w-[7rem] sm:h-[12.6rem] 2xl:w-[8rem] 2xl:h-[14.4rem] animate-[spin-y_10s_linear_infinite] [transform-style:preserve-3d] text-shadow-lg"
                  style={{ animationDelay: `${key * 0.23}s` }}>
                  {item.content}
                </div>
              )
            } else {
              const groupObject = item.director
              return (
                <div key={key} className="flex justify-center">
                  <div
                    className="flex flex-col gap-0 items-center justify-start  w-[5rem] h-[9rem] sm:w-[7rem] sm:h-[12.6rem] 2xl:w-[8rem] 2xl:h-[14.4rem] group/thumbnail overflow-hidden mb-1"
                    onClick={() => {
                      navigate({ to: `/person/director/${groupObject.id}` })
                    }}>
                    <div
                      className="relative w-full aspect-4/6 overflow-hidden border-3 border-foreground rounded-none flex justify-center items-center"
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
                            : `/picnotfound.jpg`
                        }
                      />
                      {hoverId === key && (
                        <div className="absolute w-full text-[12px] w-full h-full bg-black/60 text-background p-1 flex flex-col justify-center items-center md:gap-2">
                          <span>
                            {`Watched: ${groupObject.WatchedDirectors.num_watched_films}`}
                          </span>
                          <span>
                            {`Starred: ${groupObject.WatchedDirectors.num_starred_films}`}
                          </span>
                          <span>
                            {`Score: ${computeDirectorScore(groupObject.WatchedDirectors).toFixed(2)}`}
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
