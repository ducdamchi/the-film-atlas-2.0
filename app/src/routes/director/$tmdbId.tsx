import { createFileRoute } from "@tanstack/react-router"
import {
  personQueryOptions,
  directorStatusQueryOptions,
} from "@/queries/person.queries"
import PersonLanding from "../../pages/person-landing/PersonLanding"
import LoadingPage from "../../components/layout/LoadingPage"

const DirectorPage = () => <PersonLanding job="director" />

export const Route = createFileRoute("/director/$tmdbId")({
  loader: async ({
    params: { tmdbId },
    context: { queryClient, auth },
  }) => {
    await queryClient.ensureQueryData(personQueryOptions(tmdbId))
    if (auth) {
      queryClient.prefetchQuery(directorStatusQueryOptions(tmdbId))
    }
  },
  pendingComponent: () => <LoadingPage variant="loading" />,
  component: DirectorPage,
})
