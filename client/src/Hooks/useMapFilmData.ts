import { useState, useEffect } from "react"
import { fetchListByParams } from "@/Utils/apiCalls"
import { getCountryName } from "@/Utils/helperFunctions"
import type { UserFilm } from "@/types/film"
import type { AuthState } from "@/types/auth"
import type { FilmsPerCountryData } from "@/types/map"

interface UseMapFilmDataResult {
  filmsPerCountryData: FilmsPerCountryData
}

/**
 * Fetches the user's full watched list on mount and aggregates the count of
 * watched films per country, used to colour the choropleth map layer.
 *
 * The intermediate accumulator type includes `name` (resolved via
 * `getCountryName`) in addition to `num_watched_films`.  `FilmsPerCountryData`
 * (from map.ts) only requires `num_watched_films`, so the accumulator is
 * declared with a wider local type and the state is typed as
 * `FilmsPerCountryData` — the extra `name` field is structurally compatible
 * (TypeScript uses structural typing, not nominal typing).
 */
export function useMapFilmData(authState: AuthState): UseMapFilmDataResult {
  const [mapFilmData, setMapFilmData] = useState<UserFilm[]>([])
  const [filmsPerCountryData, setFilmsPerCountryData] =
    useState<FilmsPerCountryData>({})

  useEffect(() => {
    if (!authState.status) return
    const fetchInitialLikeData = async () => {
      try {
        const result = await fetchListByParams({ queryString: "watched" })
        setMapFilmData(result)
      } catch (err) {
        console.log("Error Fetching User Like Data: ", err)
      }
    }
    fetchInitialLikeData()
  }, [])

  useEffect(() => {
    const data: Record<string, { name: string | undefined; num_watched_films: number }> = {}
    mapFilmData.forEach((film) => {
      film.origin_country.forEach((country) => {
        if (country in data) {
          data[country].num_watched_films++
        } else {
          data[country] = {
            name: getCountryName(country),
            num_watched_films: 1,
          }
        }
      })
    })
    setFilmsPerCountryData(data)
  }, [mapFilmData])

  return { filmsPerCountryData }
}
