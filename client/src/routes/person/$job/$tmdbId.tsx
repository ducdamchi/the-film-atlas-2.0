import { createFileRoute } from "@tanstack/react-router"
import PersonLanding from "../../../components/PersonLanding"

export const Route = createFileRoute("/person/$job/$tmdbId")({
  component: PersonLanding,
})
