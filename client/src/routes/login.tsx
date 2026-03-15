import { createFileRoute } from "@tanstack/react-router"
import LogIn from "../components/LogIn"

export const Route = createFileRoute("/login")({
  component: LogIn,
})
