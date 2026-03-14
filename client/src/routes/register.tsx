import { createFileRoute } from "@tanstack/react-router"
// @ts-ignore - JS component
import Register from "../components/Register.jsx"

export const Route = createFileRoute("/register")({
  component: Register,
})
