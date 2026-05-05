import { createFileRoute } from "@tanstack/react-router"
import {
  filmQueryOptions,
  omdbQueryOptions,
  wikidataQueryOptions,
  ytsQueryOptions,
  subtitlesQueryOptions,
} from "@/queries/film.queries"
import FilmLanding from "../../components/FilmLanding"
import LoadingPage from "../../components/layout/LoadingPage"
import type { TMDBFilm } from "@/types/tmdb"

export const Route = createFileRoute("/films/$tmdbId_")({
  loader: async ({ params: { tmdbId }, context: { queryClient } }) => {
    const film = (await queryClient.ensureQueryData(
      filmQueryOptions(tmdbId),
    )) as TMDBFilm
    if (film.imdb_id) {
      await Promise.all([
        queryClient.ensureQueryData(omdbQueryOptions(film.imdb_id)),
        queryClient.ensureQueryData(wikidataQueryOptions(film.imdb_id)),
      ])
      queryClient.prefetchQuery(ytsQueryOptions(film.imdb_id))
      queryClient.prefetchQuery(subtitlesQueryOptions(film.imdb_id))
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
