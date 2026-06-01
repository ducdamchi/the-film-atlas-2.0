import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import NavBar from "@/components/layout/navbar/NavBar"
import AuthBg from "@/components/layout/AuthBg"
import { authClient } from "@/lib/authClient"

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  component: ResetPassword,
})

function ResetPassword() {
  const { token } = Route.useSearch()
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }
    if (!token) {
      setError("Missing reset token. Please use the link from your email.")
      return
    }
    setLoading(true)
    try {
      const result = await authClient.resetPassword({ newPassword: password, token })
      if (result.error) {
        setError(result.error.message ?? "Error resetting password.")
        return
      }
      navigate({ to: "/login" })
    } catch {
      setError("Error resetting password.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="font-primary mt-10 flex flex-col items-center w-screen h-screen overflow-hidden min-h-screen">
      <AuthBg />
      <NavBar />
      <div className="mt-35 z-100 bg-background text-foreground border-atlas-blue border-5 w-auto min-w-[20rem] relative md:p-5 rounded-none">
        <div className="p-4 w-full">
          <form className="flex flex-col gap-3 w-full items-center text-[16px]" onSubmit={handleSubmit}>
            <input
              className="auth-formField"
              type="password"
              placeholder="new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            <input
              className="auth-formField"
              type="password"
              placeholder="confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            {error && <p className="text-error text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || !password || !confirm}
              className="w-[18rem] p-2 text-stone-900 font-light border-1 transition-all ease-out duration-300 rounded-none disabled:opacity-40">
              {loading ? "Saving..." : "set new password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
