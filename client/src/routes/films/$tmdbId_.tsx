import { createFileRoute } from "@tanstack/react-router"
// @ts-ignore - JS component
import FilmLanding from "../../components/FilmLanding.jsx"

export const Route = createFileRoute("/films/$tmdbId_")({
  component: FilmLanding,
})
