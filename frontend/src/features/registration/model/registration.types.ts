import { Member } from "../../../shared/types";

export interface MemberRegistrationInput {
  name: string;
  member_id: string;
  seat_id: string;
  mic_id?: string;
  camera_id?: string;
  constituency?: string;
  party?: string;
  role?: string;
  avatar?: string;
  allocated_time_seconds: number;
  contact_info?: string;
  password?: string;
  department?: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}

export interface MemberConflictCheckResult {
  hasConflict: boolean;
  errorMessage: string | null;
}

export interface SuggestedIdentifiers {
  suggestedMemberId: string;
  suggestedSeatId: string;
  suggestedMicId: string;
  suggestedCameraId: string;
}

export type RosterModalMode = "view" | "edit";

export interface MemberUpdateValidationResult {
  isValid: boolean;
  errorMessage: string | null;
}

export type MemberUpdateInput = Partial<Member>;
