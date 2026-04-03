import { Formik, Form, Field, ErrorMessage } from "formik";
import { useNavigate } from "@tanstack/react-router";
import * as Yup from "yup";
import axios from "axios";
import AuthBg from "./layout/AuthBg";

interface RegisterValues {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

interface RegisterResponse {
  error?: string;
  message?: string;
}

export default function Register() {
  const navigate = useNavigate();
  const initialValues: RegisterValues = {
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  };

  const onSubmit = (data: RegisterValues) => {
    axios
      .post<RegisterResponse>(
        `${import.meta.env.VITE_API_URL}/auth/register`,
        data,
      )
      .then((response) => {
        if (response.data.error) {
          alert(response.data.error);
        } else {
          navigate({ to: "/login" });
        }
      });
  };

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
  });

  return (
    <div className="font-primary mt-10 auth-whole min-h-screen">
      <AuthBg />

      <div className="auth-formContainer">
        <div className="p-4">
          <Formik
            initialValues={initialValues}
            onSubmit={onSubmit}
            validationSchema={validationSchema}
            enableReinitialize={true}
          >
            <Form className="auth-form">
              <Field
                className="auth-formField"
                type="email"
                id="email"
                name="email"
                placeholder="email"
              />
              <ErrorMessage
                name="email"
                component="error-div"
                className="auth-formErrorMessage"
              />

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

              <Field
                className="auth-formField"
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                placeholder="confirm password"
              />

              <ErrorMessage
                name="confirmPassword"
                component="error-div"
                className="auth-formErrorMessage"
              />
              <button type="submit" className="auth-formSubmitButton">
                create new account
              </button>
            </Form>
          </Formik>
        </div>
      </div>
    </div>
  );
}
