import { createFileRoute } from "@tanstack/react-router"
import {
  watchedFilmsQueryOptions,
  watchlistedFilmsQueryOptions,
} from "@/queries/collections.queries"
import Films from "../components/Films"
import LoadingPage from "../components/layout/LoadingPage"

export const Route = createFileRoute("/films_")({
  loader: ({ context: { queryClient, auth } }) => {
    if (!auth) return
    return Promise.all([
      queryClient.prefetchQuery(watchedFilmsQueryOptions),
      queryClient.prefetchQuery(watchlistedFilmsQueryOptions),
    ])
  },
  pendingComponent: () => <LoadingPage variant="loading" />,
  component: Films,
})
