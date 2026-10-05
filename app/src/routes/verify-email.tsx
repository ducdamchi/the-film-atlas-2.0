import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
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
import { Link } from "@tanstack/react-router"
import { MailIcon, CheckCircleIcon } from "lucide-react"

const verifyEmailSearchSchema = z.object({
  token: z.string().optional(),
  email: z.string().optional(),
})

export const Route = createFileRoute("/verify-email")({
  validateSearch: verifyEmailSearchSchema,
  component: VerifyEmail,
})

function VerifyEmail() {
  const { email } = Route.useSearch()
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  const handleResend = async () => {
    if (!email || resending) return
    setResending(true)
    await authClient.sendVerificationEmail({
      email,
      callbackURL: window.location.origin,
    })
    setResending(false)
    setResent(true)
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
              <CardHeader className="gap-4 items-center justify-center text-center">
                <MailIcon className="size-12 text-foreground justify-self-center" />
                <div>
                  <CardTitle className="mb-1.5 text-2xl">
                    Check your email
                  </CardTitle>
                  <CardDescription className="text-base">
                    We sent a verification link to{" "}
                    {email ? (
                      <span className="font-medium text-foreground">
                        {email}
                      </span>
                    ) : (
                      "your email address"
                    )}
                    . Click the link to verify your account.
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {email && (
                  <Button
                    variant="dark"
                    className="w-full"
                    disabled={resending || resent}
                    onClick={handleResend}>
                    {resent ? (
                      <span className="flex items-center gap-2">
                        <CheckCircleIcon className="size-4" />
                        Verification email resent
                      </span>
                    ) : resending ? (
                      "Sending..."
                    ) : (
                      "Resend verification email"
                    )}
                  </Button>
                )}

                <p className="text-center text-sm text-muted-foreground">
                  <Link to="/login" className="underline underline-offset-4">
                    Back to login
                  </Link>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
