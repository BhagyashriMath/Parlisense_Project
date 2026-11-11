import React, { useEffect } from "react";
import { useParliament } from "../infrastructure/context/ParliamentContext";
import { AdminDashboard } from "../features/admin";
import { MainLayout } from "../layouts/MainLayout";

export default function AdminPage() {
  const { currentTab, setCurrentTab } = useParliament();

  useEffect(() => {
    if (currentTab !== "admin") {
      setCurrentTab("admin");
    }
  }, [currentTab, setCurrentTab]);

  return <AdminDashboard />;
}

AdminPage.auth = true;
AdminPage.layout = MainLayout;
