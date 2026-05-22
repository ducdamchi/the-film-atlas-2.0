import { createFileRoute } from "@tanstack/react-router"
import Terms from "../pages/terms/Terms"

export const Route = createFileRoute("/terms")({
  component: Terms,
})
