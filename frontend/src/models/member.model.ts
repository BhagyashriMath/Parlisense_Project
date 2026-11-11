export interface Member {
  member_id: string;
  name: string;
  seat_id: string;
  mic_id?: string;
  camera_id?: string;
  constituency?: string;
  party?: string;
  role?: string;
  avatar?: string;
  allocated_time_seconds: number;
  historical_score?: number;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  contact_info?: string;
}

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
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}

// -------------------------------------------------------------
// Pure Domain Helper Functions & Validation Logic
// -------------------------------------------------------------
export interface MemberConflictCheckResult {
  hasConflict: boolean;
  errorMessage: string | null;
}

export function validateMemberConflict(
  input: MemberRegistrationInput,
  existingMembers: Member[]
): MemberConflictCheckResult {
  const normId = input.member_id.trim().toUpperCase();
  const normSeat = input.seat_id.trim().toUpperCase();
  const normMic = (input.mic_id || "").trim().toUpperCase();
  const normCam = (input.camera_id || "").trim().toUpperCase();

  if (!input.name.trim()) {
    return { hasConflict: true, errorMessage: "Member Full Name is required." };
  }
  if (!normId) {
    return { hasConflict: true, errorMessage: "Member ID is required." };
  }
  if (!normSeat) {
    return { hasConflict: true, errorMessage: "Seat ID is required." };
  }

  const idConflict = existingMembers.some(m => m.member_id.toUpperCase() === normId);
  if (idConflict) {
    return { hasConflict: true, errorMessage: `Member ID '${normId}' is already registered.` };
  }

  const seatConflict = existingMembers.some(m => m.seat_id.toUpperCase() === normSeat);
  if (seatConflict) {
    return { hasConflict: true, errorMessage: `Seat '${normSeat}' is already assigned to another member.` };
  }

  if (normMic) {
    const micConflict = existingMembers.some(m => (m.mic_id || "").toUpperCase() === normMic);
    if (micConflict) {
      return { hasConflict: true, errorMessage: `Microphone ID '${normMic}' is already assigned.` };
    }
  }

  if (normCam) {
    const camConflict = existingMembers.some(m => (m.camera_id || "").toUpperCase() === normCam);
    if (camConflict) {
      return { hasConflict: true, errorMessage: `Camera ID '${normCam}' is already assigned.` };
    }
  }

  return { hasConflict: false, errorMessage: null };
}

export function generateNextMemberIdentifiers(existingMembers: Member[]) {
  const nextNum = existingMembers.length + 1;
  return {
    suggestedMemberId: `M${String(nextNum).padStart(3, "0")}`,
    suggestedSeatId: `S${String(nextNum).padStart(2, "0")}`,
    suggestedMicId: `MIC-${String(nextNum).padStart(2, "0")}`,
    suggestedCameraId: `CAM-${String(nextNum).padStart(2, "0")}`
  };
}
