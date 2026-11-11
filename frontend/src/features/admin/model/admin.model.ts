import { Settings, Radio, Award } from "lucide-react";
import type { AdminPhase, PreSessionCheckResult } from "./admin.types";

export function createAdminPhases(isSessionActive: boolean): AdminPhase[] {
  return [
    {
      id: "BEFORE_SESSION",
      number: "1",
      title: "Pre-Session Configuration",
      subtitle: "Session setup, Member & Mic Matrix, Rules & Readiness",
      icon: Settings
    },
    {
      id: "DURING_SESSION",
      number: "2",
      title: "Live Monitoring",
      subtitle: "Real-time AI subsystems, Camera, Audio & Alerts",
      icon: Radio,
      badge: isSessionActive ? "LIVE" : undefined
    },
    {
      id: "AFTER_SESSION",
      number: "3",
      title: "Post-Session Summary",
      subtitle: "Timeline, Topic Analysis & Member Scorecards",
      icon: Award
    }
  ];
}

/**
 * Calculates pre-session diagnostic readiness percentage
 */
export function calculateDiagnosticScore(readiness: PreSessionCheckResult | null): number {
  if (!readiness || !readiness.checks) return 0;
  const checks = Object.values(readiness.checks);
  if (checks.length === 0) return 0;
  const passed = checks.filter(Boolean).length;
  return Math.round((passed / checks.length) * 100);
}

