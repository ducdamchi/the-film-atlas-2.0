import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import axios from "axios"
import NavBar from "@/components/layout/navbar/NavBar"
import AuthBg from "@/components/layout/AuthBg"

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPassword,
})

function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await axios.post("/auth/forgot-password", { email })
    } catch {
      // Always show the success message (prevents email enumeration)
    } finally {
      setLoading(false)
      setSubmitted(true)
    }
  }

  return (
    <div className="font-primary mt-10 auth-whole min-h-screen">
      <AuthBg />
      <NavBar />
      <div className="auth-formContainer">
        <div className="p-4 w-full">
          {submitted ? (
            <div className="auth-form text-muted-dark text-sm text-center">
              <p>If that email is registered, a reset link is on its way.</p>
              <p className="mt-2 text-muted-light">Check your inbox and spam folder.</p>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              <p className="text-muted-light text-sm mb-2">
                Enter your email and we'll send you a reset link.
              </p>
              <input
                className="auth-formField"
                type="email"
                placeholder="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button
                type="submit"
                disabled={loading || !email}
                className="auth-formSubmitButton disabled:opacity-40">
                {loading ? "Sending..." : "send reset link"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
