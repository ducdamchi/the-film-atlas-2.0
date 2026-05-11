import { Formik, Form, Field, ErrorMessage } from "formik"
import { useNavigate, useRouter, Link } from "@tanstack/react-router"
import * as Yup from "yup"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"

import AuthBg from "./layout/AuthBg"
import { authClient } from "@/lib/authClient"
import { LoginForm } from "./ui-shadcn/login-form"

interface LoginValues {
  login: string
  password: string
}

export default function LogIn() {
  const navigate = useNavigate()
  const router = useRouter()
  const initialValues: LoginValues = {
    login: "",
    password: "",
  }

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
    onSuccess: () => {
      router.invalidate()
      navigate({ to: "/" })
    },
    onError: (err: Error) =>
      toast.error(err.message ?? "Login failed. Please try again."),
  })

  const onSubmit = (data: LoginValues) => {
    loginMutation.mutate(data)
  }

  const validationSchema = Yup.object({
    login: Yup.string().required("Email or username is required."),
    password: Yup.string().required("Password is required."),
  })

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden bg-muted lg:block overflow-hidden">
        <AuthBg></AuthBg>
        {/* <img
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
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
    // <div className="font-primary auth-whole mt-10 min-h-screen">
    //   <AuthBg />

    //   <div className="auth-formContainer">
    //     <div className="p-4 w-full">
    //       <Formik
    //         initialValues={initialValues}
    //         onSubmit={onSubmit}
    //         validationSchema={validationSchema}
    //         enableReinitialize={true}>
    //         <Form className="auth-form">
    //           <Field
    //             className="auth-formField"
    //             id="login"
    //             name="login"
    //             placeholder="Email or Username"
    //           />
    //           <ErrorMessage
    //             name="login"
    //             component="error-div"
    //             className="auth-formErrorMessage"
    //           />

    //           <Field
    //             className="auth-formField"
    //             type="password"
    //             id="password"
    //             name="password"
    //             placeholder="Password"
    //           />

    //           <ErrorMessage
    //             name="password"
    //             component="error-div"
    //             className="auth-formErrorMessage"
    //           />
    //           <button type="submit" className="auth-formSubmitButton">
    //             Log In
    //           </button>
    //         </Form>
    //       </Formik>
    //       <div className="flex flex-col items-center justify-center mt-5">
    //         <Link to="/register" className="text-muted">
    //           Register an Account
    //         </Link>
    //         <Link to="/forgot-password" className="text-muted">
    //           Forgot password?
    //         </Link>
    //       </div>
    //     </div>
    //   </div>
    // </div>
  )
}
