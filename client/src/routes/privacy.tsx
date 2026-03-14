import { createFileRoute } from "@tanstack/react-router"
// @ts-ignore - JS component
import Privacy from "../components/Privacy.jsx"

export const Route = createFileRoute("/privacy")({
  component: Privacy,
})
