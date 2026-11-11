import {
  MemberRegistrationInput,
  MemberConflictCheckResult,
  SuggestedIdentifiers,
  MemberUpdateValidationResult
} from "./registration.types";
import { Member } from "../../../shared/types";

export const PARLIAMENTARY_DEPARTMENTS = [
  "None / General Member",
  "Ministry of Education",
  "Ministry of Defence",
  "Ministry of Finance",
  "Ministry of Home Affairs",
  "Ministry of External Affairs",
  "Ministry of Health & Family Welfare",
  "Ministry of Railways",
  "Ministry of Electronics & Information Technology",
  "Ministry of Law & Justice",
  "Ministry of Parliamentary Affairs",
  "Ministry of Agriculture & Farmers Welfare",
  "Ministry of Commerce & Industry",
  "Ministry of Environment, Forest & Climate Change",
  "Ministry of Road Transport & Highways",
  "Ministry of Science & Technology",
  "Leader of the Opposition",
  "Speaker's Office"
] as const;

export function formatAllocatedTime(totalSeconds: number): string {
  const secs = Math.max(0, Number(totalSeconds) || 0);
  const mins = Math.floor(secs / 60);
  const remainderSecs = secs % 60;

  if (remainderSecs === 0) {
    return `${mins} min${mins === 1 ? "" : "s"}`;
  }

  if (mins === 0) {
    return `${remainderSecs} sec${remainderSecs === 1 ? "" : "s"}`;
  }

  const decimalMins = (secs / 60).toFixed(1).replace(/\.0$/, "");
  return `${mins} min${mins === 1 ? "" : "s"} ${remainderSecs} sec${remainderSecs === 1 ? "" : "s"} (${decimalMins} mins)`;
}

export function formatAllocatedTimeShort(totalSeconds: number): string {
  const secs = Math.max(0, Number(totalSeconds) || 0);
  const mins = Math.floor(secs / 60);
  const remainderSecs = secs % 60;

  if (remainderSecs === 0) {
    return `${mins}m`;
  }
  if (mins === 0) {
    return `${remainderSecs}s`;
  }
  return `${mins}m ${remainderSecs}s`;
}

export function getNextAvailableId(prefix: "SP" | "M", existingMembers: Member[]): string {
  const regex = new RegExp(`^${prefix}(\\d+)$`, "i");
  const usedNumbers = new Set<number>();

  for (const m of existingMembers) {
    const match = (m.member_id || "").trim().match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num)) {
        usedNumbers.add(num);
      }
    }
  }

  let next = 1;
  while (usedNumbers.has(next)) {
    next++;
  }

  return `${prefix}${String(next).padStart(3, "0")}`;
}

export function validateMemberConflict(
  input: MemberRegistrationInput,
  existingMembers: Member[]
): MemberConflictCheckResult {
  const normId = input.member_id.trim().toUpperCase();
  const normSeat = input.seat_id.trim().toUpperCase();
  const normMic = (input.mic_id || "").trim().toUpperCase();
  const normCam = (input.camera_id || "").trim().toUpperCase();
  const idLabel = input.role === "Speaker" ? "Speaker ID" : "Member ID";

  if (!input.name.trim()) {
    return { hasConflict: true, errorMessage: "Member Full Name is required." };
  }
  if (!normId) {
    return { hasConflict: true, errorMessage: `${idLabel} is required.` };
  }
  if (!normSeat) {
    return { hasConflict: true, errorMessage: "Seat ID is required." };
  }
  if (!input.password || !input.password.trim()) {
    return { hasConflict: true, errorMessage: "Password is required for user authentication." };
  }
  if (input.password.trim().length < 4) {
    return { hasConflict: true, errorMessage: "Password must be at least 4 characters long." };
  }

  const idConflict = existingMembers.some((m) => m.member_id.toUpperCase() === normId);
  if (idConflict) {
    return { hasConflict: true, errorMessage: `${idLabel} '${normId}' is already registered.` };
  }

  const seatConflict = existingMembers.some((m) => m.seat_id.toUpperCase() === normSeat);
  if (seatConflict) {
    return { hasConflict: true, errorMessage: `Seat '${normSeat}' is already assigned to another member.` };
  }

  if (normMic) {
    const micConflict = existingMembers.some((m) => (m.mic_id || "").toUpperCase() === normMic);
    if (micConflict) {
      return { hasConflict: true, errorMessage: `Microphone ID '${normMic}' is already assigned.` };
    }
  }

  if (normCam) {
    const camConflict = existingMembers.some((m) => (m.camera_id || "").toUpperCase() === normCam);
    if (camConflict) {
      return { hasConflict: true, errorMessage: `Camera ID '${normCam}' is already assigned.` };
    }
  }

  return { hasConflict: false, errorMessage: null };
}

export function deriveHardwareIdsFromSeatId(seatId: string): {
  micId: string;
  cameraId: string;
} {
  const digits = (seatId || "").trim().match(/(\d+)/g);
  const numStr = digits ? digits[digits.length - 1].padStart(3, "0") : "001";
  return {
    micId: `MIC${numStr}`,
    cameraId: `CAM${numStr}`
  };
}

export function generateNextMemberIdentifiers(
  existingMembers: Member[],
  role: "Speaker" | "Member" = "Member"
): SuggestedIdentifiers {
  const prefix = role === "Speaker" ? "SP" : "M";
  const suggestedMemberId = getNextAvailableId(prefix, existingMembers);

  // Find next available seat number
  const seatNumbers = new Set<number>();
  for (const m of existingMembers) {
    const match = (m.seat_id || "").trim().match(/^S(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num)) seatNumbers.add(num);
    }
  }
  let nextSeat = 1;
  while (seatNumbers.has(nextSeat)) nextSeat++;

  const suggestedSeatId = `S${String(nextSeat).padStart(3, "0")}`;
  const derived = deriveHardwareIdsFromSeatId(suggestedSeatId);

  return {
    suggestedMemberId,
    suggestedSeatId,
    suggestedMicId: derived.micId,
    suggestedCameraId: derived.cameraId
  };
}


export function validateMemberUpdate(
  memberId: string,
  updates: Partial<Member>,
  existingMembers: Member[]
): MemberUpdateValidationResult {
  const otherMembers = existingMembers.filter((m) => m.member_id.toUpperCase() !== memberId.toUpperCase());

  if (updates.name !== undefined && !updates.name.trim()) {
    return { isValid: false, errorMessage: "Full Name cannot be empty." };
  }

  if (updates.seat_id !== undefined) {
    const normSeat = updates.seat_id.trim().toUpperCase();
    if (!normSeat) {
      return { isValid: false, errorMessage: "Seat ID cannot be empty." };
    }
    const seatConflict = otherMembers.some((m) => m.seat_id.toUpperCase() === normSeat);
    if (seatConflict) {
      return { isValid: false, errorMessage: `Seat '${normSeat}' is already assigned to another member.` };
    }
  }

  if (updates.mic_id !== undefined && updates.mic_id.trim()) {
    const normMic = updates.mic_id.trim().toUpperCase();
    const micConflict = otherMembers.some((m) => (m.mic_id || "").toUpperCase() === normMic);
    if (micConflict) {
      return { isValid: false, errorMessage: `Microphone ID '${normMic}' is already assigned.` };
    }
  }

  if (updates.camera_id !== undefined && updates.camera_id.trim()) {
    const normCam = updates.camera_id.trim().toUpperCase();
    const camConflict = otherMembers.some((m) => (m.camera_id || "").toUpperCase() === normCam);
    if (camConflict) {
      return { isValid: false, errorMessage: `Camera ID '${normCam}' is already assigned.` };
    }
  }

  if (updates.allocated_time_seconds !== undefined && updates.allocated_time_seconds <= 0) {
    return { isValid: false, errorMessage: "Allocated floor time must be greater than 0 seconds." };
  }

  if (updates.password !== undefined && updates.password.trim().length > 0 && updates.password.trim().length < 4) {
    return { isValid: false, errorMessage: "Password must be at least 4 characters long." };
  }

  return { isValid: true, errorMessage: null };
}
