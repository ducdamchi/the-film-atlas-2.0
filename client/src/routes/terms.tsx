import { createFileRoute } from "@tanstack/react-router"
import Terms from "../components/Terms"

export const Route = createFileRoute("/terms")({
  component: Terms,
})
