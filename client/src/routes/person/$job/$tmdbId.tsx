import { createFileRoute } from "@tanstack/react-router"
// @ts-ignore - JS component
import PersonLanding from "../../../components/PersonLanding.jsx"

export const Route = createFileRoute("/person/$job/$tmdbId")({
  component: PersonLanding,
})
