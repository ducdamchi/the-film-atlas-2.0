import { Formik, Form, Field, ErrorMessage } from "formik";
import { useNavigate, useRouter, Link } from "@tanstack/react-router";
import * as Yup from "yup";
import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import AuthBg from "./layout/AuthBg";

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
  const router = useRouter();
  const initialValues: LoginValues = {
    login: "",
    password: "",
  };

  const loginMutation = useMutation({
    mutationFn: (data: LoginValues) =>
      axios.post<LoginResponse>(
        `${import.meta.env.VITE_API_URL}/auth/login`,
        data,
      ),
    onSuccess: (response) => {
      if (response.data.error) {
        alert(response.data.error);
        return;
      }
      localStorage.setItem("accessToken", response.data.token!);
      router.invalidate();
      navigate({ to: "/" });
    },
    onError: () => toast.error("Login failed. Please try again."),
  });

  const onSubmit = (data: LoginValues) => {
    loginMutation.mutate(data);
  };

  const validationSchema = Yup.object({
    login: Yup.string().required("Email or username is required."),
    password: Yup.string().required("Password is required."),
  });

  return (
    <div className="font-primary auth-whole mt-10 min-h-screen">
      <AuthBg />

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
                placeholder="Email or Username"
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
                placeholder="Password"
              />

              <ErrorMessage
                name="password"
                component="error-div"
                className="auth-formErrorMessage"
              />
              <button type="submit" className="auth-formSubmitButton">
                Log In
              </button>

              {/* <CustomLink to="/register" highlight={false}>
                Register
                </CustomLink> */}
            </Form>
          </Formik>
          <div className="flex flex-col items-center justify-center mt-5">
            <Link to="/register" className="text-muted-light">
              Register an Account
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
