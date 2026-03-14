import { createFileRoute } from "@tanstack/react-router"
// @ts-ignore - JS component
import MapPage from "../components/MapPage.jsx"

export const Route = createFileRoute("/")({
  component: MapPage,
})
