import { createFileRoute } from "@tanstack/react-router"
import Privacy from "../pages/privacy/Privacy"

export const Route = createFileRoute("/privacy")({
  component: Privacy,
})
