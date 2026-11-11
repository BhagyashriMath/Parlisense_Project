import type { LucideIcon } from "lucide-react";
import type {
  SessionConfig,
  PreSessionCheckResult,
  Member,
  AgendaTopic,
  CompleteSessionSummary,
  MemberSessionSummary
} from "../../../shared/types";

export type AdminDashboardState = "BEFORE_SESSION" | "DURING_SESSION" | "AFTER_SESSION";

export interface AdminPhase {
  id: AdminDashboardState;
  number: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  badge?: string;
}

export type {
  SessionConfig,
  PreSessionCheckResult,
  Member,
  AgendaTopic,
  CompleteSessionSummary,
  MemberSessionSummary
};
