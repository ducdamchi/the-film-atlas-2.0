import { queryOptions } from "@tanstack/react-query"
import { fetchDirectorsFn } from "@/server/directors"
import { getGuestWatched } from "@/utils/guestStore"
import type { Director } from "@/types/film"

export const directorsQueryOptions = queryOptions({
  queryKey: ["directors"],
  queryFn: () => fetchDirectorsFn(),
  staleTime: 1000 * 60,
})

export const guestDirectorsQueryOptions = queryOptions({
  queryKey: ["guest-directors"],
  queryFn: (): Director[] => {
    const watched = getGuestWatched()
    const map = new Map<
      number,
      { name: string; profile_path: string | null; films: number[]; stars: number[] }
    >()

    for (const film of watched) {
      for (const dir of film.directors) {
        let entry = map.get(dir.tmdbId)
        if (!entry) {
          entry = { name: dir.name, profile_path: dir.profile_path, films: [], stars: [] }
          map.set(dir.tmdbId, entry)
        }
        entry.films.push(film.id)
        entry.stars.push(film.stars ?? 0)
      }
    }

    return Array.from(map.entries()).map(([id, d]): Director => {
      const numWatched = d.films.length
      const starred = d.stars.filter((s) => s > 0)
      const numStarred = starred.length
      const numStarsTotal = starred.reduce((a, b) => a + b, 0)
      return {
        id,
        name: d.name,
        profile_path: d.profile_path,
        WatchedDirectors: {
          num_watched_films: numWatched,
          num_starred_films: numStarred,
          num_stars_total: numStarsTotal,
          avg_rating: numStarred === 0 ? 0 : numStarsTotal / numStarred,
          highest_star: starred.length > 0 ? Math.max(...starred) : 0,
        },
      }
    })
  },
  staleTime: Infinity,
})
