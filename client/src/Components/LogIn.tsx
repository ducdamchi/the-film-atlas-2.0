import { Formik, Form, Field, ErrorMessage } from "formik"
import { useNavigate } from "@tanstack/react-router"
import * as Yup from "yup"
import axios from "axios"

import NavBar from "./Shared/layout/NavBar"
import AuthBg from "./Shared/layout/AuthBg"
import QuickSearchModal from "./Shared/layout/QuickSearchModal"

import { useAuth } from "../Utils/authContext"
import useCommandKey from "../Hooks/useCommandKey"

interface LoginValues {
  username: string
  password: string
}

interface LoginResponse {
  error?: string
  token?: string
  username?: string
  id?: number
}

export default function LogIn() {
  const navigate = useNavigate()
  const initialValues: LoginValues = {
    username: "",
    password: "",
  }
  const { setAuthState, searchModalOpen, setSearchModalOpen } = useAuth()

  function toggleSearchModal() {
    setSearchModalOpen((status) => !status)
  }
  useCommandKey(toggleSearchModal, "k")

  const onSubmit = (data: LoginValues) => {
    axios
      .post<LoginResponse>(`${import.meta.env.VITE_API_URL}/auth/login`, data)
      .then((response) => {
        if (response.data.error) {
          alert(response.data.error)
        } else {
          localStorage.setItem("accessToken", response.data.token!)
          setAuthState({
            username: response.data.username!,
            id: response.data.id!,
            status: true,
          })
          navigate({ to: "/" })
        }
      })
  }

  const validationSchema = Yup.object({
    username: Yup.string().required("Username is required."),
    password: Yup.string().required("Password is required."),
  })

  return (
    <div className="font-primary auth-whole mt-10 min-h-screen">
      <AuthBg />

      {searchModalOpen && (
        <QuickSearchModal
          searchModalOpen={searchModalOpen}
          setSearchModalOpen={setSearchModalOpen}
        />
      )}

      <NavBar />
      <div className="auth-formContainer">
        <div className="p-4 w-full">
          <Formik
            initialValues={initialValues}
            onSubmit={onSubmit}
            validationSchema={validationSchema}
            enableReinitialize={true}>
            <Form className="auth-form">
              <Field
                className="auth-formField"
                id="username"
                name="username"
                placeholder="username"
              />
              <ErrorMessage
                name="username"
                component="error-div"
                className="auth-formErrorMessage"
              />

              <Field
                className="auth-formField"
                type="password"
                id="password"
                name="password"
                placeholder="password"
              />

              <ErrorMessage
                name="password"
                component="error-div"
                className="auth-formErrorMessage"
              />
              <button type="submit" className="auth-formSubmitButton">
                log in
              </button>
            </Form>
          </Formik>
        </div>
      </div>
    </div>
  )
}
