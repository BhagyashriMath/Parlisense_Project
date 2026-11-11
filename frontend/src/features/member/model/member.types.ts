import type { Member, MemberScorecard, SessionTelemetry } from "../../../shared/types";

export interface MemberNotification {
  id: string;
  alert_id?: string;
  alert_level?: 1 | 2 | 3;
  type: "ALERT" | "EMERGENCY" | "SUSPENSION_CONFIRMED" | "WARNING" | "UPCOMING_SESSION";
  title: string;
  description?: string;
  member_audio_message?: string;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  timestamp: number;
}

export interface MemberPresenceStatus {
  present: boolean;
  movement: "NONE" | "NORMAL" | "SIGNIFICANT";
  seatCompliant: boolean;
  confidence: number;
  lastViolation: string | null;
}

export type MemberCameraView = "SELF" | "FLOOR";
