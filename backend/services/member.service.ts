import { memberRepository, MemberFilterOptions } from "../repositories/member.repository";
import { MemberEntity } from "../models";
import { scorecardRepository } from "../repositories/scorecard.repository";
import { auditRepository } from "../repositories/audit.repository";

export class MemberService {
  deriveDevicesFromSeat(seatId: string): { seat_id: string; mic_id: string; camera_id: string } {
    const trimmed = (seatId || "").trim();
    const digits = trimmed.match(/\d+/g);
    const numStr = digits ? digits[digits.length - 1].padStart(3, "0") : "001";
    return {
      seat_id: trimmed.startsWith("S") ? trimmed : `S${numStr}`,
      mic_id: `MIC${numStr}`,
      camera_id: `CAM${numStr}`
    };
  }

  async getAll(options?: MemberFilterOptions): Promise<MemberEntity[]> {
    return memberRepository.findAllMembers(options);
  }

  getCachedAll(): MemberEntity[] {
    return memberRepository.getCachedMembers();
  }

  getCachedMember(id: string): MemberEntity | undefined {
    return memberRepository.getCachedMember(id);
  }

  async getById(id: string): Promise<MemberEntity | null> {
    const member = await memberRepository.findById(id);
    return member || null;
  }

  async create(data: Partial<MemberEntity>): Promise<MemberEntity> {
    let memberId = data.member_id?.trim();
    const isSpeaker = data.role === "Speaker" || data.role?.toLowerCase() === "speaker";

    if (!memberId) {
      const prefix = isSpeaker ? "SP" : "M";
      const all = await memberRepository.findAllMembers();
      let maxNum = 0;
      for (const m of all) {
        const match = (m.member_id || "").match(new RegExp(`^${prefix}(\\d+)$`, "i"));
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      memberId = `${prefix}${String(maxNum + 1).padStart(3, "0")}`;
    }

    let seatId = data.seat_id || "";
    let micId = data.mic_id || "";
    let cameraId = data.camera_id || "";

    if (seatId) {
      const derived = this.deriveDevicesFromSeat(seatId);
      seatId = derived.seat_id;
      micId = derived.mic_id;
      cameraId = derived.camera_id;
    } else {
      const all = await memberRepository.findAllMembers();
      let maxSeatNum = 0;
      for (const m of all) {
        const match = (m.seat_id || "").match(/(\d+)/g);
        if (match) {
          const num = parseInt(match[match.length - 1], 10);
          if (num > maxSeatNum) maxSeatNum = num;
        }
      }
      const numStr = String(maxSeatNum + 1).padStart(3, "0");
      seatId = `S${numStr}`;
      micId = `MIC${numStr}`;
      cameraId = `CAM${numStr}`;
    }

    const member: MemberEntity = {
      member_id: memberId,
      name: data.name || (isSpeaker ? "Honourable Speaker" : "Honourable Member"),
      seat_id: seatId,
      camera_id: cameraId,
      mic_id: micId,
      allocated_time_seconds: data.allocated_time_seconds || 300,
      status: (data.status as any) || "ACTIVE",
      constituency: data.constituency || "General Constituency",
      party: data.party || (isSpeaker ? "Independent / Presiding" : "Independent"),
      role: data.role || (isSpeaker ? "Speaker" : "Member of Parliament"),
      department: data.department || (isSpeaker ? "Speaker's Office" : data.role?.startsWith("Minister") ? data.role : "None / General Member"),
      contact_info: data.contact_info || `parl.${memberId.toLowerCase()}@sansad.nic.in`,
      password: data.password || "password123",
      warnings_count: 0,
      violations_count: 0,
      avatar: data.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
    };

    await memberRepository.save(member);
    await auditRepository.log("MEMBER_CREATED", { member_id: member.member_id, name: member.name, role: member.role });
    return member;
  }

  async update(id: string, updates: Partial<MemberEntity>): Promise<MemberEntity | null> {
    const existing = await memberRepository.findById(id);
    if (!existing) return null;

    let seatId = updates.seat_id || existing.seat_id;
    let micId = updates.mic_id || existing.mic_id;
    let cameraId = updates.camera_id || existing.camera_id;

    if (updates.seat_id && updates.seat_id !== existing.seat_id) {
      const derived = this.deriveDevicesFromSeat(updates.seat_id);
      seatId = derived.seat_id;
      micId = derived.mic_id;
      cameraId = derived.camera_id;
    }

    const updated: MemberEntity = {
      ...existing,
      ...updates,
      seat_id: seatId,
      mic_id: micId,
      camera_id: cameraId,
      member_id: existing.member_id
    };

    await memberRepository.save(updated);
    await auditRepository.log("MEMBER_UPDATED", { member_id: id, updates });
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const success = await memberRepository.delete(id);
    if (success) {
      await auditRepository.log("MEMBER_DELETED", { member_id: id });
    }
    return success;
  }

  async assignSeat(id: string, seatId: string): Promise<{ member: MemberEntity; mic_id: string; camera_id: string } | null> {
    const member = await memberRepository.findById(id);
    if (!member) return null;

    const derived = this.deriveDevicesFromSeat(seatId);
    member.seat_id = derived.seat_id;
    member.mic_id = derived.mic_id;
    member.camera_id = derived.camera_id;

    await memberRepository.save(member);
    await auditRepository.log("SEAT_ASSIGNED", { member_id: id, seat_id: derived.seat_id, mic_id: derived.mic_id });
    return { member, mic_id: derived.mic_id, camera_id: derived.camera_id };
  }

  async assignMic(id: string, micId: string): Promise<MemberEntity | null> {
    const member = await memberRepository.findById(id);
    if (!member) return null;

    member.mic_id = micId;
    await memberRepository.save(member);
    await auditRepository.log("MIC_ASSIGNED", { member_id: id, micId });
    return member;
  }

  async getScorecard(id: string, speakingTimeSeconds = 0) {
    const member = await memberRepository.findById(id);
    if (!member) return null;
    return scorecardRepository.getScorecard(id, undefined, speakingTimeSeconds);
  }
}

export const memberService = new MemberService();
