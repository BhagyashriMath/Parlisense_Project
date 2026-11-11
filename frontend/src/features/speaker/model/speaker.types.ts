import type { Member, SessionTelemetry, CompleteSessionSummary } from "../../../shared/types";

export interface MemberDisciplineState {
  warnings: number;
  suspended: boolean;
}

export interface SpeakerNotification {
  id: string;
  type: "ALERT" | "EMERGENCY" | "WARNING_ISSUED" | "SUSPENDED";
  title: string;
  description: string;
  memberName?: string;
  seatId?: string;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  timestamp: number;
}

export interface SuspensionRecommendation {
  alert_id: string;
  member_id: string;
  member_name: string;
  seat_id: string;
  title: string;
  timestamp: string;
  evidence: Record<string, any>;
}

export type CameraViewMode = "FLOOR_SPEAKER" | "QUAD_MATRIX" | "PODIUM";
