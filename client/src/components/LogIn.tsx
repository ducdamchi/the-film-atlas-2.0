import { Formik, Form, Field, ErrorMessage } from "formik";
import { useNavigate, Link } from "@tanstack/react-router";
import * as Yup from "yup";
import axios from "axios";

import NavBar from "./layout/navbar/NavBar";
import AuthBg from "./layout/AuthBg";
import QuickSearchModal from "./layout/QuickSearchModal";

import { useAuth } from "../utils/authContext";
import { decodeToken } from "../utils/decodeToken";
import useCommandKey from "../hooks/useCommandKey";

interface LoginValues {
  login: string;
  password: string;
}

interface LoginResponse {
  error?: string;
  token?: string;
  username?: string;
  id?: number;
}

export default function LogIn() {
  const navigate = useNavigate();
  const initialValues: LoginValues = {
    login: "",
    password: "",
  };
  const { setAuthState, searchModalOpen, setSearchModalOpen } = useAuth();

  function toggleSearchModal() {
    setSearchModalOpen((status) => !status);
  }
  useCommandKey(toggleSearchModal, "k");

  const onSubmit = (data: LoginValues) => {
    axios
      .post<LoginResponse>(`${import.meta.env.VITE_API_URL}/auth/login`, data)
      .then((response) => {
        if (response.data.error) {
          alert(response.data.error);
        } else {
          localStorage.setItem("accessToken", response.data.token!);
          const decoded = decodeToken(response.data.token!);
          if (decoded) {
            setAuthState(decoded);
          } else {
            setAuthState({
              username: response.data.username!,
              id: response.data.id!,
              status: true,
            });
          }
          navigate({ to: "/" });
        }
      });
  };

  const validationSchema = Yup.object({
    login: Yup.string().required("Email or username is required."),
    password: Yup.string().required("Password is required."),
  });

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
            enableReinitialize={true}
          >
            <Form className="auth-form">
              <Field
                className="auth-formField"
                id="login"
                name="login"
                placeholder="email or username"
              />
              <ErrorMessage
                name="login"
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

              {/* <CustomLink to="/register" highlight={false}>
                Register
                </CustomLink> */}
            </Form>
          </Formik>
          <div className="flex flex-col items-center justify-center mt-5">
            <Link to="/register" className="text-muted-light">
              Register an account
            </Link>
            <Link to="/forgot-password" className="text-muted-light">
              Forgot password?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
