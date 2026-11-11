import React from "react";
import { Navigate } from "react-router-dom";
import { useParliament } from "../infrastructure/context/ParliamentContext";
import { EmptyLayout } from "../layouts/EmptyLayout";

export default function IndexPage() {
  const { currentUser } = useParliament();

  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
}

IndexPage.auth = false;
IndexPage.layout = EmptyLayout;
