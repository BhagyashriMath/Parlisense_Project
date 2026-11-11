import React, { useEffect } from "react";
import { useParliament } from "../infrastructure/context/ParliamentContext";
import { SpeakerDashboard } from "../features/speaker";
import { MainLayout } from "../layouts/MainLayout";

export default function SpeakerPage() {
  const { currentTab, setCurrentTab } = useParliament();

  useEffect(() => {
    if (currentTab !== "speaker") {
      setCurrentTab("speaker");
    }
  }, [currentTab, setCurrentTab]);

  return <SpeakerDashboard />;
}

SpeakerPage.auth = true;
SpeakerPage.layout = MainLayout;
