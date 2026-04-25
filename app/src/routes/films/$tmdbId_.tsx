import { createFileRoute } from "@tanstack/react-router"
import FilmLanding from "../../components/FilmLanding"

export const Route = createFileRoute("/films/$tmdbId_")({
  component: FilmLanding,
})
