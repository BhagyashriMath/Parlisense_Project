import { alertRepository } from "../repositories/alert.repository";
import { suspensionRepository } from "../repositories/suspension.repository";
import { memberRepository } from "../repositories/member.repository";
import { auditRepository } from "../repositories/audit.repository";
import { db } from "../database/db";
import { telemetryService } from "./telemetry.service";

export class DisciplineService {
  async getRecommendations(): Promise<any[]> {
    return alertRepository.getPendingRecommendations();
  }

  async confirmSuspension(memberId: string, alertId?: string, confirmedBy: string = "Hon. Speaker", reason?: string): Promise<any> {
    const member = (await memberRepository.findById(memberId)) ||
                   (await memberRepository.findBySeatId(memberId)) ||
                   memberRepository.getCachedMembers().find(m => m.member_id === memberId || m.seat_id === memberId);
    if (!member) {
      throw new Error("Member not found");
    }

    if (member.role?.toLowerCase().includes("speaker") || member.role?.toLowerCase().includes("presiding") || member.seat_id === "CHAMBER-DAIS" || member.seat_id === "SPEAKER") {
      throw new Error("The Presiding Officer / Speaker cannot be suspended under Rule 374.");
    }

    member.status = "SUSPENDED";
    member.violations_count = (member.violations_count || 0) + 1;
    await memberRepository.save(member);

    // If suspended member is currently on the floor, immediately revoke speaking privilege
    const telState = telemetryService.getState();
    if (telState.activeSpeakerId === member.member_id || telState.activeSpeakerId === member.seat_id) {
      telemetryService.updateState({ activeSpeakerId: "", speakingDuration: 0 });
    }

    const suspension = await suspensionRepository.create({
      session_id: telemetryService.getState().sessionId,
      member_id: memberId,
      reason: reason || "Repeated decorum violations / Rule 374 Disciplinary Suspension",
      duration_days: 1,
      status: "CONFIRMED",
      confirmed_by: confirmedBy
    });

    if (alertId) {
      await alertRepository.acknowledge(alertId);
    }

    await auditRepository.log("SUSPENSION_CONFIRMED", {
      member_id: memberId,
      member_name: member.name,
      confirmed_by: confirmedBy,
      suspension_id: suspension.id
    });

    return {
      status: "SUSPENDED",
      member_id: memberId,
      member_name: member.name,
      seat_id: member.seat_id,
      confirmed_by: confirmedBy,
      suspension_id: suspension.id
    };
  }

  async rejectSuspension(alertId: string, dismissedBy: string = "Hon. Speaker", reason?: string): Promise<any> {
    const alert = await alertRepository.findById(alertId);
    if (alert) {
      await alertRepository.acknowledge(alertId);
    }
    await auditRepository.log("SUSPENSION_REJECTED", { alert_id: alertId, dismissed_by: dismissedBy, reason });
    return { status: "REJECTED", alert_id: alertId };
  }

  async revokeSuspension(memberId: string, revokedBy: string = "Hon. Speaker", reason?: string): Promise<any> {
    const member = (await memberRepository.findById(memberId)) || memberRepository.getCachedMembers().find(m => m.member_id === memberId);
    if (member) {
      member.status = "ACTIVE";
      member.violations_count = 0;
      member.warnings_count = 0;
      await memberRepository.save(member);
    }

    // Mark confirmed suspensions for this member as REVOKED
    await db.run(
      `UPDATE suspensions SET status = 'REVOKED', decided_at = ?, confirmed_by = ? WHERE member_id = ? AND status = 'CONFIRMED'`,
      [new Date().toISOString(), revokedBy, memberId]
    );

    // Resolve any active suspension alerts for this member
    await db.run(
      `UPDATE alerts SET status = 'RESOLVED' WHERE member_id = ? AND (type LIKE '%SUSP%' OR rule_id = 'RULE_9_SUSPENSION_REVIEW')`,
      [memberId]
    );

    await auditRepository.log("SUSPENSION_REVOKED", {
      member_id: memberId,
      member_name: member?.name,
      revoked_by: revokedBy,
      reason: reason || "Speaker parliamentary pardon and floor reinstatement"
    });

    return {
      status: "ACTIVE",
      member_id: memberId,
      member_name: member?.name,
      suspended: false,
      message: `Suspension for ${member?.name || memberId} successfully revoked by ${revokedBy}`
    };
  }

  async isMemberSuspended(memberId: string): Promise<boolean> {
    const member = (await memberRepository.findById(memberId)) || memberRepository.getCachedMembers().find(m => m.member_id === memberId);
    if (!member || member.status !== "SUSPENDED") return false;
    return suspensionRepository.isSuspended(memberId);
  }
}

export const disciplineService = new DisciplineService();

