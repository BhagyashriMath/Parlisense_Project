import { Request, Response } from "express";
import { db } from "../database/db";
import { emergencyRepository } from "../repositories/emergency.repository";
import { telemetryService } from "../services/telemetry.service";
import { memberService } from "../services/member.service";
import { auditRepository } from "../repositories/audit.repository";
import { alertRepository } from "../repositories/alert.repository";
import { notificationRepository } from "../repositories/notification.repository";

export class EmergencyController {
  async triggerEmergency(req: Request, res: Response): Promise<void> {
    const { source } = req.body;
    telemetryService.updateState({
      emergencyActive: true,
      emergencySource: source || "Manual Physical Button"
    });

    await auditRepository.log("EMERGENCY_TRIGGERED", { source: source || "Manual Physical Button" });
    res.json({ status: "EMERGENCY_ACTIVATED", emergency: true });
  }

  async resetEmergency(req: Request, res: Response): Promise<void> {
    telemetryService.updateState({
      emergencyActive: false,
      emergencySource: undefined
    });

    await auditRepository.log("EMERGENCY_RESET", { reset_by: "Speaker" });
    res.json({ status: "EMERGENCY_CLEARED", emergency: false });
  }

  async getRequests(req: Request, res: Response): Promise<void> {
    const sessionId = (req.query.session_id as string) || telemetryService.getState().sessionId;
    const requests = await emergencyRepository.findAll(sessionId);
    res.json({ requests, total_count: requests.length });
  }

  async createRequest(req: Request, res: Response): Promise<void> {
    const { member_id, reason } = req.body;
    if (!member_id || !reason) {
      res.status(400).json({ error: "member_id and reason are required" });
      return;
    }

    const member = await memberService.getById(member_id);
    if (!member) {
      res.status(404).json({ error: "Member not found" });
      return;
    }

    const currentSessionId = telemetryService.getState().sessionId || "PAR-2026-001";

    // 1. Mark any prior requests for this member in this session as SUPERSEDED so old approved/rejected requests don't cause false positive announcements
    try {
      await db.run(
        "UPDATE emergency_requests SET status = 'SUPERSEDED' WHERE member_id = ? AND session_id = ?;",
        [member_id, currentSessionId]
      );
      // 2. Resolve any existing active emergency alerts for this member
      await db.run(
        "UPDATE alerts SET status = 'RESOLVED' WHERE member_id = ? AND rule_id = 'RULE_8_EMERGENCY_BUTTON';",
        [member_id]
      );
    } catch (_) {}

    const created = await emergencyRepository.create({
      session_id: currentSessionId,
      member_id,
      reason
    });

    await auditRepository.log("EMERGENCY_EXIT_REQUESTED", { member_id, reason });
    telemetryService.broadcast();
    res.status(201).json(created);
  }

  async decideRequest(req: Request, res: Response): Promise<void> {
    let { status, approved, decided_by } = req.body;
    if (!status && typeof approved === "boolean") {
      status = approved ? "APPROVED" : "REJECTED";
    }
    if (status === "DENIED") {
      status = "REJECTED";
    }
    if (status !== "APPROVED" && status !== "REJECTED") {
      res.status(400).json({ error: "Status must be APPROVED or REJECTED" });
      return;
    }

    const request = await emergencyRepository.findById(req.params.id);
    if (!request) {
      res.status(404).json({ error: "Emergency request not found" });
      return;
    }

    const decided = await emergencyRepository.decide(req.params.id, status, decided_by || "Hon. Speaker");
    if (!decided) {
      res.status(404).json({ error: "Emergency request could not be updated" });
      return;
    }

    const isApproved = status === "APPROVED";
    const member = await memberService.getById(request.member_id);
    const memberName = member?.name || (request as any).member_name || "Hon. Member";
    const seatId = member?.seat_id || (request as any).seat_id || "S001";

    // 1. Audit log
    await auditRepository.log("EMERGENCY_EXIT_DECIDED", {
      request_id: req.params.id,
      member_id: request.member_id,
      status,
      decided_by: decided_by || "Hon. Speaker"
    });

    // 2. Deliver notification to the specific member
    await notificationRepository.create({
      session_id: request.session_id || telemetryService.getState().sessionId,
      member_id: request.member_id,
      type: isApproved ? "EMERGENCY_EXIT_APPROVED" : "EMERGENCY_EXIT_REJECTED",
      alert_level: isApproved ? 1 : 2,
      severity: isApproved ? "HIGH" : "MEDIUM",
      title: isApproved
        ? `🚑 Emergency Exit Approved by ${decided_by || "Hon. Speaker"}`
        : `⛔ Emergency Exit Declined by ${decided_by || "Hon. Speaker"}`,
      description: isApproved
        ? `Your emergency exit request (${request.reason}) was APPROVED by ${decided_by || "Hon. Speaker"}. Chamber marshals have been dispatched to assist you.`
        : `Your emergency exit request was declined by ${decided_by || "Hon. Speaker"}. Please remain in your designated seat.`,
      member_audio_message: isApproved
        ? "Your emergency exit request has been approved by the Honourable Speaker. Marshals are assisting you."
        : "Your emergency exit request was declined by the Honourable Speaker. Please remain in your seat."
    });

    // 3. Save alert in alertRepository so live telemetry broadcasts it to the Member Dashboard
    await alertRepository.save({
      alert_id: `ALT-EMG-${req.params.id}-${Date.now()}`,
      session_id: request.session_id || telemetryService.getState().sessionId,
      member_id: request.member_id,
      seat_id: seatId,
      rule_id: "RULE_8_EMERGENCY_BUTTON",
      type: isApproved ? "EMERGENCY_EXIT_APPROVED" : "EMERGENCY_EXIT_REJECTED",
      severity: isApproved ? "HIGH" : "MEDIUM",
      alert_level: isApproved ? 1 : 2,
      title: isApproved
        ? `🚑 Emergency Exit Approved — ${memberName}`
        : `⛔ Emergency Exit Declined — ${memberName}`,
      description: isApproved
        ? `The Hon. Speaker approved emergency exit request for ${memberName} (${seatId}). Marshals dispatched.`
        : `The Hon. Speaker declined emergency exit request for ${memberName} (${seatId}).`,
      member_audio_message: isApproved
        ? "Your emergency exit request has been approved by the Honourable Speaker. Marshals are assisting you."
        : "Your emergency exit request was declined by the Honourable Speaker. Please remain in your seat.",
      suspension_recommended: false,
      source_module: "Emergency Management",
      status: "ACTIVE"
    });

    // 4. If approved, release floor if this member holds the floor
    if (isApproved && telemetryService.getState().activeSpeakerId === request.member_id) {
      telemetryService.updateState({
        activeSpeakerId: "",
        speakingStartTime: Date.now(),
        speakingDuration: 0
      });
    }

    // 5. Update member presence to Absent in database
    if (isApproved) {
      try {
        await db.run("UPDATE members SET presence = 'Absent' WHERE member_id = ?;", [request.member_id]);
      } catch (_) {}
    }

    // 6. Broadcast live update to all connected WebSockets and SSE streams
    telemetryService.broadcast();
    res.json({ ...decided, member_id: request.member_id, status });
  }
}

export const emergencyController = new EmergencyController();

