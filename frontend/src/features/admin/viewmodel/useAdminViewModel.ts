import { useState, useEffect, useRef } from "react";
import { useParliament } from "../../../infrastructure/context/ParliamentContext";
import type { AdminDashboardState } from "../model/admin.types";
import { createAdminPhases } from "../model/admin.model";

export function useAdminViewModel() {
  const {
    telemetry,
    members,
    refreshMembers,
    openReport,
    endSessionAndGenerateReport,
    toggleSession,
    navigateToRegister
  } = useParliament();

  const [adminState, setAdminState] = useState<AdminDashboardState>(() => {
    if (telemetry?.is_active) return "DURING_SESSION";
    return "BEFORE_SESSION";
  });
  const wasSessionActive = useRef(Boolean(telemetry?.is_active));

  useEffect(() => {
    const isActive = Boolean(telemetry?.is_active);
    if (isActive && adminState === "BEFORE_SESSION") {
      setAdminState("DURING_SESSION");
    } else if (wasSessionActive.current && !isActive && adminState === "DURING_SESSION") {
      setAdminState("AFTER_SESSION");
    }
    wasSessionActive.current = isActive;
  }, [telemetry?.is_active, adminState]);

  const handleSessionStarted = () => {
    toggleSession(true);
    setAdminState("DURING_SESSION");
  };

  const handleEndSession = async () => {
    await endSessionAndGenerateReport();
    setAdminState("AFTER_SESSION");
  };

  const handleStartNewConfig = () => {
    setAdminState("BEFORE_SESSION");
  };

  const phases = createAdminPhases(Boolean(telemetry?.is_active));

  return {
    telemetry,
    members,
    adminState,
    phases,
    refreshMembers,
    openReport,
    navigateToRegister,
    setAdminState,
    handleSessionStarted,
    handleEndSession,
    handleStartNewConfig
  };
}

export type AdminViewModel = ReturnType<typeof useAdminViewModel>;
