import { useState } from "react"
import { Button } from "@/components/ui-shadcn/button"
import { Input } from "@/components/ui-shadcn/input"
import { Label } from "@/components/ui-shadcn/label"
import { authClient } from "@/lib/authClient"
import { CheckCircleIcon } from "lucide-react"

const ForgotPasswordForm = () => {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || loading) return
    setLoading(true)
    await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <CheckCircleIcon className="size-8 text-green-500" />
        <p className="text-sm text-muted-foreground">
          If that email is registered, a reset link is on its way. Check your
          inbox and spam folder.
        </p>
      </div>
    )
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <Label className="leading-5" htmlFor="userEmail">
          Email address*
        </Label>
        <Input
          type="email"
          id="userEmail"
          placeholder="Enter your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <Button
        variant="pink"
        className="w-full"
        type="submit"
        disabled={loading || !email}>
        {loading ? "Sending..." : "Send Reset Link"}
      </Button>
    </form>
  )
}

export default ForgotPasswordForm
