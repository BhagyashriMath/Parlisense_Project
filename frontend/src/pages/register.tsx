import React from "react";
import { RegisterPage as RegisterView } from "../features/registration";
import { MainLayout } from "../layouts/MainLayout";

export default function RegisterPage() {
  return <RegisterView />;
}

RegisterPage.auth = true;
RegisterPage.roles = ["admin"] as Array<"admin" | "speaker" | "member">;
RegisterPage.layout = MainLayout;
