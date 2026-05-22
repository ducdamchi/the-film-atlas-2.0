import { createFileRoute, redirect } from "@tanstack/react-router"
import { AccountSettings } from "#/pages/settings/Settings"

export const Route = createFileRoute("/settings")({
  beforeLoad: ({ context }) => {
    if (!context.auth) throw redirect({ to: "/login" })
  },
  component: AccountSettings,
})
