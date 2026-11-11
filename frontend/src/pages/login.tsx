import React from "react";
import { LoginPage as LoginView } from "../features/login";
import { AuthLayout } from "../layouts/AuthLayout";

export default function LoginPage() {
  return <LoginView />;
}

LoginPage.auth = false;
LoginPage.layout = AuthLayout;
