import React, { useMemo } from "react";
import { BrowserRouter, useRoutes } from "react-router-dom";
import { ParliamentProvider } from "./infrastructure/context/ParliamentContext";
import { generateRoutes } from "./routes/generateRoutes";

function AppRoutes() {
  const routes = useMemo(() => generateRoutes(), []);
  return useRoutes(routes);
}

export default function App() {
  return (
    <BrowserRouter>
      <ParliamentProvider>
        <AppRoutes />
      </ParliamentProvider>
    </BrowserRouter>
  );
}

