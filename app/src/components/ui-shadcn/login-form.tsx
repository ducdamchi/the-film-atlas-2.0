import { cn } from "@/lib/utils"
import { Button } from "@/components/ui-shadcn/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui-shadcn/form"
import { FieldSeparator } from "@/components/ui-shadcn/field"
import { Input } from "@/components/ui-shadcn/input"
import { Link, useNavigate, useRouter } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { authClient } from "@/lib/authClient"
import { syncGuestDataIfPresent, clearGuestDataQuietly } from "@/utils/syncGuestData"

const loginSchema = z.object({
  login: z.string().min(1, "Email or username is required."),
  password: z.string().min(1, "Password is required."),
})

type LoginValues = z.infer<typeof loginSchema>

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const navigate = useNavigate()
  const router = useRouter()
  const queryClient = useQueryClient()

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { login: "", password: "" },
  })

  const loginMutation = useMutation({
    mutationFn: async (data: LoginValues) => {
      const isEmail = data.login.includes("@")
      const result = isEmail
        ? await authClient.signIn.email({
            email: data.login,
            password: data.password,
          })
        : await authClient.signIn.username({
            username: data.login,
            password: data.password,
          })
      if (result.error) throw new Error(result.error.message ?? "Login failed.")
      return result
    },
    onSuccess: async () => {
      const isFreshSignup = sessionStorage.getItem("film-atlas-fresh-signup")
      sessionStorage.removeItem("film-atlas-fresh-signup")

      if (isFreshSignup) {
        await syncGuestDataIfPresent(queryClient)
      } else {
        clearGuestDataQuietly(queryClient)
      }

      router.invalidate()
      navigate({ to: "/" })
    },
    onError: (err: Error) =>
      toast.error(err.message ?? "Login failed. Please try again."),
  })

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => loginMutation.mutate(data))}
        className={cn("flex flex-col gap-6", className)}
        {...props}>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Login to your account</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Use a username or email to log in to your account
          </p>
        </div>

        <FormField
          control={form.control}
          name="login"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username / Email</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="username or email"
                  className="bg-background"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center">
                <FormLabel>Password</FormLabel>
                <Link
                  to="/forgot-password"
                  className="ml-auto text-sm underline-offset-4 hover:underline">
                  Forgot your password?
                </Link>
              </div>
              <FormControl>
                <Input type="password" className="bg-background" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" variant="pink" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? "Logging in…" : "Login"}
        </Button>

        <FieldSeparator>Or continue with</FieldSeparator>

        <Button
          variant="dark"
          type="button"
          className="w-full"
          disabled={loginMutation.isPending}
          onClick={() =>
            authClient.signIn.social({
              provider: "google",
              callbackURL: window.location.origin,
            })
          }>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="h-4 w-4 mr-2">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Login with Google
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="underline underline-offset-4">
            Sign up
          </Link>
        </p>
      </form>
    </Form>
  )
}
