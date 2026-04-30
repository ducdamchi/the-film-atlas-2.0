import { createFileRoute } from "@tanstack/react-router"
import { watchedFilmsQueryOptions } from "@/queries/collections.queries"
import Films from "../components/Films"
import LoadingPage from "../components/layout/LoadingPage"

export const Route = createFileRoute("/films_")({
  loader: ({ context: { queryClient, auth } }) => {
    if (!auth) return
    return queryClient.prefetchQuery(watchedFilmsQueryOptions)
  },
  pendingComponent: () => <LoadingPage variant="loading" />,
  component: Films,
})
