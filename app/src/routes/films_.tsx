import { createFileRoute } from "@tanstack/react-router"
import Films from "../components/Films"

export const Route = createFileRoute("/films_")({
  component: Films,
})
