import { createFileRoute } from "@tanstack/react-router"
// @ts-ignore - JS component
import About from "../components/About.jsx"

export const Route = createFileRoute("/about")({
  component: About,
})
