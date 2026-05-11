import { Formik, Form, Field, ErrorMessage } from "formik"
import { useNavigate } from "@tanstack/react-router"
import * as Yup from "yup"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import AuthBg from "./layout/AuthBg"
import { authClient } from "@/lib/authClient"
import { SignupForm } from "./ui-shadcn/signup-form"

interface RegisterValues {
  email: string
  username: string
  password: string
  confirmPassword: string
}

export default function Register() {
  const navigate = useNavigate()
  const initialValues: RegisterValues = {
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  }

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterValues) => {
      const result = await authClient.signUp.email({
        email: data.email,
        name: data.username,
        password: data.password,
        username: data.username,
      })
      if (result.error)
        throw new Error(result.error.message ?? "Registration failed.")
      return result
    },
    onSuccess: () => {
      navigate({ to: "/login" })
    },
    onError: (err: Error) =>
      toast.error(err.message ?? "Registration failed. Please try again."),
  })

  const onSubmit = (data: RegisterValues) => {
    registerMutation.mutate(data)
  }

  const validationSchema = Yup.object({
    email: Yup.string()
      .email("Invalid email address.")
      .required("Email is required."),
    username: Yup.string()
      .min(3, "Username must be at least 3 characters.")
      .max(30, "Username must be 30 characters or less.")
      .matches(/^[a-z0-9_]+$/i, "Letters, numbers, and underscores only.")
      .required("Username is required."),
    password: Yup.string()
      .min(8, "Password must be at least 8 characters.")
      .required("Password is required."),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref("password")], "Passwords must match.")
      .required("Confirm Password is required."),
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
            <SignupForm />
          </div>
        </div>
      </div>
    </div>
  )
}

// <div className="font-primary mt-10 auth-whole min-h-screen">
//     <AuthBg />

//     <div className="auth-formContainer">
//       <div className="p-4">
//         <Formik
//           initialValues={initialValues}
//           onSubmit={onSubmit}
//           validationSchema={validationSchema}
//           enableReinitialize={true}
//         >
//           <Form className="auth-form">
//             <Field
//               className="auth-formField"
//               type="email"
//               id="email"
//               name="email"
//               placeholder="Email"
//             />
//             <ErrorMessage
//               name="email"
//               component="error-div"
//               className="auth-formErrorMessage"
//             />

//             <Field
//               className="auth-formField"
//               id="username"
//               name="username"
//               placeholder="Username"
//             />
//             <ErrorMessage
//               name="username"
//               component="error-div"
//               className="auth-formErrorMessage"
//             />

//             <Field
//               className="auth-formField"
//               type="password"
//               id="password"
//               name="password"
//               placeholder="Password"
//             />

//             <ErrorMessage
//               name="password"
//               component="error-div"
//               className="auth-formErrorMessage"
//             />

//             <Field
//               className="auth-formField"
//               type="password"
//               id="confirmPassword"
//               name="confirmPassword"
//               placeholder="Confirm Password"
//             />

//             <ErrorMessage
//               name="confirmPassword"
//               component="error-div"
//               className="auth-formErrorMessage"
//             />
//             <button type="submit" className="auth-formSubmitButton">
//               Create New Account
//             </button>
//           </Form>
//         </Formik>
//       </div>
//     </div>
//   </div>
