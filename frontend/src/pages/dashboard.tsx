import React from "react";
import { useParliament } from "../infrastructure/context/ParliamentContext";
import { SpeakerDashboard } from "../features/speaker";
import { MemberDashboard } from "../features/member";
import { AdminDashboard } from "../features/admin";
import { MainLayout } from "../layouts/MainLayout";

export default function DashboardPage() {
  const { currentTab, currentUser } = useParliament();
  const activeRole = currentUser?.role || currentTab;

  return (
    <>
      {activeRole === "speaker" && <SpeakerDashboard />}
      {activeRole === "member" && <MemberDashboard />}
      {activeRole === "admin" && <AdminDashboard />}
    </>
  );
}

DashboardPage.auth = true;
DashboardPage.layout = MainLayout;
