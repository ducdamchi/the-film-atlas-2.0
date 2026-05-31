import { createFileRoute } from "@tanstack/react-router"
import { personQueryOptions } from "@/queries/person.queries"
import PersonLanding from "../../pages/person-landing/PersonLanding"
import LoadingPage from "../../components/layout/LoadingPage"

const ActorPage = () => <PersonLanding job="actor" />

export const Route = createFileRoute("/actor/$tmdbId")({
  loader: async ({ params: { tmdbId }, context: { queryClient } }) => {
    await queryClient.ensureQueryData(personQueryOptions(tmdbId))
  },
  pendingComponent: () => <LoadingPage variant="loading" />,
  component: ActorPage,
})
