import React, { useEffect } from "react";
import { useParliament } from "../../infrastructure/context/ParliamentContext";
import { MemberDashboard } from "../../features/member";
import { MainLayout } from "../../layouts/MainLayout";

export default function MemberIndexPage() {
  const { currentTab, setCurrentTab } = useParliament();

  useEffect(() => {
    if (currentTab !== "member") {
      setCurrentTab("member");
    }
  }, [currentTab, setCurrentTab]);

  return <MemberDashboard />;
}

MemberIndexPage.auth = true;
MemberIndexPage.layout = MainLayout;
