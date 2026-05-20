import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import NavBar from "@/components/layout/navbar/NavBar"
import AuthBg from "@/components/layout/AuthBg"
import { authClient } from "@/lib/authClient"
import { LoginForm } from "#/components/ui-shadcn/login-form"
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
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authClient.forgetPassword({
        email,
        redirectTo: `${import.meta.env.VITE_APP_URL ?? ""}/reset-password`,
      })
    } catch {
      // Always show success message to prevent email enumeration
    } finally {
      setLoading(false)
      setSubmitted(true)
    }
  }

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
            THE FILM ATLAS
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-lg">
            {/* <LoginForm />
             */}
            <Card className="z-1 w-full border-none shadow-md sm:max-w-md">
              <CardHeader className="gap-6">
                {/* <Logo className='gap-3' /> */}

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

                <a
                  href="/login"
                  className="group mx-auto flex w-fit items-center gap-2">
                  <ChevronLeftIcon className="size-5 transition-transform duration-200 group-hover:-translate-x-0.5" />
                  <span>Back to login</span>
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

//  <div className="font-primary mt-10 auth-whole min-h-screen">
//       <NavBar />
//       <div className="auth-formContainer">
//         <div className="p-4 w-full">
//           {submitted ? (
//             <div className="auth-form text-muted text-sm text-center">
//               <p>If that email is registered, a reset link is on its way.</p>
//               <p className="mt-2 text-muted">
//                 Check your inbox and spam folder.
//               </p>
//             </div>
//           ) : (
//             <form className="auth-form" onSubmit={handleSubmit}>
//               <p className="text-muted text-base mb-2">
//                 Enter your email for a reset link
//               </p>
//               <input
//                 className="auth-formField"
//                 type="email"
//                 placeholder="email"
//                 value={email}
//                 onChange={(e) => setEmail(e.target.value)}
//                 required
//               />
//               <button
//                 type="submit"
//                 disabled={loading || !email}
//                 className="auth-formSubmitButton">
//                 {loading ? "Sending..." : "send reset link"}
//               </button>
//             </form>
//           )}
//         </div>
//       </div>
//     </div>
