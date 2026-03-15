import { createFileRoute } from "@tanstack/react-router"
import Directors from "../components/Directors"

export const Route = createFileRoute("/directors")({
  component: Directors,
})
