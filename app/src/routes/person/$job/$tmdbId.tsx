import { createFileRoute } from "@tanstack/react-router"
import {
  personQueryOptions,
  directorStatusQueryOptions,
} from "@/queries/person.queries"
import PersonLanding from "../../../components/PersonLanding"
import LoadingPage from "../../../components/layout/LoadingPage"

export const Route = createFileRoute("/person/$job/$tmdbId")({
  loader: async ({ params: { tmdbId, job }, context: { queryClient, auth } }) => {
    await queryClient.ensureQueryData(personQueryOptions(tmdbId))
    if (auth && job === "director") {
      queryClient.prefetchQuery(directorStatusQueryOptions(tmdbId))
    }
  },
  pendingComponent: () => <LoadingPage variant="loading" />,
  component: PersonLanding,
})
