import React, { useContext } from "react"
import { Formik, Form, Field, ErrorMessage } from "formik"
import { useNavigate } from "react-router-dom"
import * as Yup from "yup"
import axios from "axios"

import NavBar from "./Shared/Navigation-Search/NavBar"
import AuthBg from "./Shared/Navigation-Search/AuthBg"
import QuickSearchModal from "./Shared/Navigation-Search/QuickSearchModal"

import { AuthContext } from "../Utils/authContext"
import useCommandKey from "../Hooks/useCommandKey"

export default function LogIn() {
  const navigate = useNavigate()
  const initialValues = {
    username: "",
    password: "",
  }
  const { setAuthState, searchModalOpen, setSearchModalOpen } =
    useContext(AuthContext)
  function toggleSearchModal() {
    setSearchModalOpen((status) => !status)
  }
  useCommandKey(toggleSearchModal, "k")

  const onSubmit = (data) => {
    // console.log(data)
    axios
      .post(`${import.meta.env.VITE_API_URL}/auth/login`, data)
      .then((response) => {
        if (response.data.error) {
          alert(response.data.error)
        } else {
          localStorage.setItem("accessToken", response.data.token)
          setAuthState({
            username: response.data.username,
            id: response.data.id,
            status: true,
          })
          navigate("/")
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
