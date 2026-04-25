import { createFileRoute } from "@tanstack/react-router"
import Collections from "../components/Collections"

export const Route = createFileRoute("/collections")({
  component: Collections,
})
