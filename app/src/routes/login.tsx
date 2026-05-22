import { createFileRoute } from "@tanstack/react-router"
import LogIn from "../pages/login/LogIn"

export const Route = createFileRoute("/login")({
  component: LogIn,
})
