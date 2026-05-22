import { createFileRoute } from "@tanstack/react-router"
import Contact from "../pages/contact/Contact"

export const Route = createFileRoute("/contact")({
  component: Contact,
})
