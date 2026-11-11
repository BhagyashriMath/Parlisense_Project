import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useParliament } from "../../infrastructure/context/ParliamentContext";
import { MemberDashboard } from "../../features/member";
import { MainLayout } from "../../layouts/MainLayout";

export default function MemberByIdPage() {
  const { id } = useParams<{ id: string }>();
  const { currentTab, setCurrentTab, setSelectedMemberId, selectedMemberId } = useParliament();

  useEffect(() => {
    if (currentTab !== "member") {
      setCurrentTab("member");
    }
  }, [currentTab, setCurrentTab]);

  useEffect(() => {
    if (id && id !== selectedMemberId) {
      setSelectedMemberId(id);
    }
  }, [id, selectedMemberId, setSelectedMemberId]);

  return <MemberDashboard />;
}

MemberByIdPage.auth = true;
MemberByIdPage.layout = MainLayout;
