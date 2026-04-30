import { createFileRoute } from "@tanstack/react-router"
import { directorsQueryOptions } from "@/queries/directors.queries"
import Directors from "../components/Directors"
import LoadingPage from "../components/layout/LoadingPage"

export const Route = createFileRoute("/directors")({
  loader: ({ context: { queryClient, auth } }) => {
    if (!auth) return
    return queryClient.prefetchQuery(directorsQueryOptions)
  },
  pendingComponent: () => <LoadingPage variant="loading" />,
  component: Directors,
})
