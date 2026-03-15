import { useState, useEffect } from "react"
import { fetchListByParams } from "@/Utils/apiCalls"
import { getCountryName } from "@/Utils/helperFunctions"

export function useMapFilmData(authState) {
  const [mapFilmData, setMapFilmData] = useState([])
  const [filmsPerCountryData, setFilmsPerCountryData] = useState({})

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
    const data = {}
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
