import { createFileRoute, Link } from "@tanstack/react-router"
import AuthBg from "@/components/layout/AuthBg"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui-shadcn/card"
import ForgotPasswordForm from "#/components/ui-shadcn/forgot-password-form"
import { ChevronLeftIcon } from "lucide-react"

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPassword,
})

function ForgotPassword() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden bg-muted lg:block overflow-hidden">
        <AuthBg></AuthBg>
        {/* <img loading="lazy"
             src="/placeholder.svg"
             alt="Image"
             className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
           /> */}
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
          <div className="w-full max-w-lg">
            <Card className="z-1 w-full border-none shadow-md sm:max-w-md">
              <CardHeader className="gap-6">
                <div>
                  <CardTitle className="mb-1.5 text-2xl">
                    Forgot Password?
                  </CardTitle>
                  <CardDescription className="text-base">
                    Enter your email and we&apos;ll send you instructions to
                    reset your password
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* ForgotPassword Form */}
                <ForgotPasswordForm />

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
