import { createFileRoute } from "@tanstack/react-router"
import {
  filmQueryOptions,
  omdbQueryOptions,
  wikidataQueryOptions,
} from "@/queries/film.queries"
import {
  watchedFilmsQueryOptions,
  watchlistedFilmsQueryOptions,
} from "@/queries/collections.queries"
import FilmLanding from "../../pages/film-landing/FilmLanding"
import LoadingPage from "../../components/layout/LoadingPage"
import type { TMDBFilm } from "@/types/tmdb"

export const Route = createFileRoute("/films/$tmdbId_")({
  loader: async ({ params: { tmdbId }, context: { queryClient, auth } }) => {
    const film = (await queryClient.ensureQueryData(
      filmQueryOptions(tmdbId),
    )) as TMDBFilm
    if (film.imdb_id) {
      await Promise.all([
        queryClient.ensureQueryData(omdbQueryOptions(film.imdb_id)),
        queryClient.ensureQueryData(wikidataQueryOptions(film.imdb_id)),
      ])
    }
    if (auth) {
      await Promise.all([
        queryClient.ensureQueryData(watchedFilmsQueryOptions),
        queryClient.ensureQueryData(watchlistedFilmsQueryOptions),
      ])
    }
  },
  pendingComponent: () => <LoadingPage variant="loading" />,
  errorComponent: ({ error }) => (
    <div className="mt-20 p-8 text-dark">
      Error loading film: {(error as Error).message}
    </div>
  ),
  component: FilmLanding,
})
