import { useState, useEffect } from "react"
import { fetchListByParams } from "@/Utils/apiCalls"
import type { UserFilm } from "@/types/film"
import type { AuthState } from "@/types/auth"
import type { PopupInfo } from "@/types/map"

interface UseUserFilmsParams {
  authState: AuthState
  isDiscoverMode: boolean
  popupInfo: PopupInfo | null
  queryString: string
  sortBy: string | null
  sortDirection: string | null
  numStars: number | null
}

interface UseUserFilmsResult {
  userFilmList: UserFilm[]
  isLoading: boolean
}

/**
 * Fetches the logged-in user's film list for the currently selected country.
 *
 * `authState` is typed as `AuthState` (not just `{ status: boolean }`) so that
 * the compiler catches any future auth shape change at the call site rather
 * than silently passing an incompatible object.  This also documents clearly
 * that this hook is auth-aware and will no-op when the user is logged out.
 *
 * `popupInfo` is `PopupInfo | null` — the null case represents no country
 * selected yet.  The hook checks `popupInfo.iso_a2 !== undefined` before
 * making the API call; `iso_a2` can be undefined even when popupInfo is set
 * (user clicked ocean), so both guards are required.
 */
export function useUserFilms({
  authState,
  isDiscoverMode,
  popupInfo,
  queryString,
  sortBy,
  sortDirection,
  numStars,
}: UseUserFilmsParams): UseUserFilmsResult {
  const [userFilmList, setUserFilmList] = useState<UserFilm[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)

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
