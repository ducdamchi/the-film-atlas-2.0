import { createFileRoute, useNavigate, Link } from "@tanstack/react-router"
import { useState } from "react"
import AuthBg from "@/components/layout/AuthBg"
import { authClient } from "@/lib/authClient"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui-shadcn/card"
import { Button } from "@/components/ui-shadcn/button"
import { Input } from "@/components/ui-shadcn/input"
import { Label } from "@/components/ui-shadcn/label"
import { CheckCircleIcon } from "lucide-react"

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  component: ResetPassword,
})

function ResetPassword() {
  const { token, error: searchError } = Route.useSearch()
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const invalidToken = !token || searchError === "INVALID_TOKEN"
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }
    setLoading(true)
    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      })
      if (result.error) {
        setError(result.error.message ?? "Error resetting password.")
        return
      }
      setSuccess(true)
    } catch {
      setError("Error resetting password.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden bg-muted lg:block overflow-hidden">
        <AuthBg />
      </div>
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a
            href="#"
            className="flex items-center gap-2 font-medium font-logo text-xl">
            <img src="/official-logo.png" alt="" className="size-16" />
            THE FILM ATLAS
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md">
            <Card className="z-1 w-full border-none shadow-md">
              {success ? (
                <>
                  <CardHeader className="gap-4 items-center text-center">
                    <CheckCircleIcon className="size-12 text-green-500 justify-self-center" />
                    <div>
                      <CardTitle className="mb-1.5 text-2xl">
                        Password reset
                      </CardTitle>
                      <CardDescription className="text-base">
                        Your password has been successfully updated.
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="pink"
                      className="w-full"
                      onClick={() => navigate({ to: "/login" })}>
                      Back to login
                    </Button>
                  </CardContent>
                </>
              ) : (
                <>
                  <CardHeader className="gap-6">
                    <div>
                      <CardTitle className="mb-1.5 text-2xl">
                        Set new password
                      </CardTitle>
                      <CardDescription className="text-base">
                        {invalidToken
                          ? "This reset link is invalid or has expired."
                          : "Enter your new password below"}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {invalidToken ? (
                      <div className="space-y-4">
                        <p className="text-sm text-destructive">
                          Please request a new password reset link.
                        </p>
                        <Button
                          variant="pink"
                          className="w-full"
                          onClick={() => navigate({ to: "/forgot-password" })}>
                          Request new link
                        </Button>
                        <p className="text-center text-sm text-muted-foreground">
                          <Link
                            to="/login"
                            className="underline underline-offset-4">
                            Back to login
                          </Link>
                        </p>
                      </div>
                    ) : (
                      <form className="space-y-4" onSubmit={handleSubmit}>
                        <div className="space-y-1">
                          <Label htmlFor="password">New password</Label>
                          <Input
                            type="password"
                            id="password"
                            placeholder="Enter new password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            minLength={8}
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="confirm">Confirm password</Label>
                          <Input
                            type="password"
                            id="confirm"
                            placeholder="Confirm new password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            required
                          />
                        </div>
                        {error && (
                          <p className="text-sm text-destructive">{error}</p>
                        )}
                        <Button
                          variant="pink"
                          className="w-full"
                          type="submit"
                          disabled={loading || !password || !confirm}>
                          {loading ? "Saving..." : "Set New Password"}
                        </Button>
                        <p className="text-center text-sm text-muted-foreground">
                          <Link
                            to="/login"
                            className="underline underline-offset-4">
                            Back to login
                          </Link>
                        </p>
                      </form>
                    )}
                  </CardContent>
                </>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
