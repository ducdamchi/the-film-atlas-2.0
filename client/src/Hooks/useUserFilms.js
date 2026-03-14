import { useState, useEffect } from "react"
import { fetchListByParams } from "@/Utils/apiCalls"

export function useUserFilms({
  authState,
  isDiscoverMode,
  popupInfo,
  queryString,
  sortBy,
  sortDirection,
  numStars,
}) {
  const [userFilmList, setUserFilmList] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!authState.status || isDiscoverMode) return
    if (!popupInfo || popupInfo.iso_a2 === undefined) return
    const fetchFilmsByCountry = async () => {
      try {
        setIsLoading(true)
        const result = await fetchListByParams({
          queryString,
          countryCode: popupInfo.iso_a2,
          sortBy,
          sortDirection,
          numStars,
        })
        setUserFilmList(result)
      } catch (err) {
        console.log("Error Fetching User Film List: ", err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchFilmsByCountry()
  }, [popupInfo, sortBy, sortDirection, numStars, queryString, authState.status])

  return { userFilmList, isLoading }
}
