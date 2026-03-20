import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import axios from "axios"
import NavBar from "@/components/layout/navbar/NavBar"
import AuthBg from "@/components/layout/AuthBg"

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
      const { data } = await axios.post<{ message?: string; error?: string }>(
        "/auth/reset-password",
        { token, newPassword: password },
      )
      if (data.error) {
        setError(data.error)
        return
      }
      navigate({ to: "/login" })
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setError(msg ?? "Error resetting password.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="font-primary mt-10 auth-whole min-h-screen">
      <AuthBg />
      <NavBar />
      <div className="auth-formContainer">
        <div className="p-4 w-full">
          <form className="auth-form" onSubmit={handleSubmit}>
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
              className="auth-formSubmitButton disabled:opacity-40">
              {loading ? "Saving..." : "set new password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
