import { Request, Response } from "express";
import { sessionService } from "../services/session.service";
import { telemetryService } from "../services/telemetry.service";
import { memberService } from "../services/member.service";
import { scorecardRepository } from "../repositories/scorecard.repository";
import { auditRepository } from "../repositories/audit.repository";
import { alertRepository } from "../repositories/alert.repository";
import { notificationRepository } from "../repositories/notification.repository";
import { transcriptRepository } from "../repositories/transcript.repository";
import { aiService } from "../services/ai.service";

export class SessionController {
  async scheduleSession(req: Request, res: Response): Promise<void> {
    const { title, session_date, start_time, end_time, max_speaking_time_seconds, agenda, description, scheduled_by } = req.body;
    if (!title || !session_date || !start_time || !end_time) {
      res.status(400).json({ error: "title, session_date, start_time, and end_time are required." });
      return;
    }

    try {
      const result = await sessionService.scheduleSession({
        title,
        session_date,
        start_time,
        end_time,
        max_speaking_time_seconds: Number(max_speaking_time_seconds) || 300,
        agenda,
        description,
        scheduled_by: scheduled_by || "Hon. Speaker"
      });
      telemetryService.broadcast();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to schedule session" });
    }
  }

  async getNotifications(req: Request, res: Response): Promise<void> {
    const notifs = await notificationRepository.getAll(50);
    res.json({ notifications: notifs });
  }

  async getMemberNotifications(req: Request, res: Response): Promise<void> {
    const { memberId } = req.params;
    const notifs = await notificationRepository.findByMemberId(memberId, 50);
    res.json({ notifications: notifs });
  }

  async getConfig(req: Request, res: Response): Promise<void> {
    const config = sessionService.getConfig();
    const readiness = await sessionService.getReadiness();
    res.json({
      config,
      readiness
    });
  }

  updateConfig(req: Request, res: Response): void {
    const updated = sessionService.updateConfig(req.body);
    telemetryService.broadcast();
    res.json({ status: "CONFIG_SAVED", config: updated });
  }

  getTopics(req: Request, res: Response): void {
    res.json(sessionService.getTopics());
  }

  addTopic(req: Request, res: Response): void {
    const topic = sessionService.addTopic(req.body);
    res.status(201).json(topic);
  }

  deleteTopic(req: Request, res: Response): void {
    const deleted = sessionService.deleteTopic(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: "Topic not found" });
      return;
    }
    res.json({ status: "DELETED", id: req.params.id });
  }

  async getStatus(req: Request, res: Response): Promise<void> {
    const config = sessionService.getConfig();
    const state = telemetryService.getState();
    const activeMember = state.activeSpeakerId
      ? await memberService.getById(state.activeSpeakerId)
      : undefined;
    res.json({
      session_id: config.session_id,
      is_active: state.isActive,
      mode: state.mode,
      current_bill: config.current_topic,
      active_speaker: activeMember,
      emergency_active: state.emergencyActive,
      status: config.status,
      is_locked: config.is_locked
    });
  }

  async getCurrent(req: Request, res: Response): Promise<void> {
    res.json(await telemetryService.generateCurrentTelemetry());
  }

  async getSummaryLive(req: Request, res: Response): Promise<void> {
    const state   = telemetryService.getState();
    const config  = sessionService.getConfig();
    const membersById = new Map((await memberService.getAll()).map((m) => [m.member_id, m]));
    const transcripts = (await transcriptRepository.findAll({ sessionId: state.sessionId, limit: 100 }))
      .map((t) => ({
        ...t,
        speakerName: membersById.get(t.member_id)?.name || t.member_id,
        party:       membersById.get(t.member_id)?.party
      }));
    const summary = aiService.generateLiveSummary(
      state.currentBill,
      transcripts,
      config.topics
    );
    res.json(summary);
  }

  getTimeline(req: Request, res: Response): void {
    const timeline = sessionService.getTimeline();
    res.json({ timeline, total_events: timeline.length });
  }

  async getAudit(req: Request, res: Response): Promise<void> {
    const events = await auditRepository.getRecent(250);
    res.json({ events, total_events: events.length });
  }

  async startSession(req: Request, res: Response): Promise<void> {
    const result = await sessionService.startSession();
    telemetryService.clearSpeakingRequests();
    telemetryService.updateState({
      sessionId: result.session_id,
      isActive: true,
      isPaused: false,
      pausedElapsedSeconds: 0,
      pauseTimestamp: null,
      startTime: Date.now(),
      activeSpeakerId: "",
      speakingStartTime: Date.now(),
      speakingDuration: 0,
      forcedEvent: null,
      speakingRequests: []
    });
    telemetryService.broadcast();

    res.json(result);
  }

  async stopSession(req: Request, res: Response): Promise<void> {
    const result = await sessionService.stopSession(telemetryService.getMemberSpeakingSeconds());
    telemetryService.clearSpeakingRequests();
    telemetryService.updateState({
      isActive: false,
      isPaused: false,
      speakingRequests: []
    });
    telemetryService.broadcast();

    res.json(result);
  }

  async pauseSession(req: Request, res: Response): Promise<void> {
    const state = telemetryService.getState();
    if (!state.isActive) {
      res.status(409).json({ error: "Start a session before pausing it" });
      return;
    }
    if (state.isPaused) {
      res.status(409).json({ error: "Session is already paused" });
      return;
    }
    const result = await sessionService.pauseSession();
    telemetryService.updateState({
      isPaused: true
    });
    res.json(result);
  }

  async resumeSession(req: Request, res: Response): Promise<void> {
    const state = telemetryService.getState();
    if (!state.isActive) {
      await this.startSession(req, res);
      return;
    }
    if (!state.isPaused) {
      res.status(409).json({ error: "Session is already running" });
      return;
    }
    const result = await sessionService.resumeSession();
    telemetryService.updateState({
      isActive: true,
      isPaused: false
    });
    res.json(result);
  }

  setMode(req: Request, res: Response): void {
    const { mode } = req.body;
    if (mode === "LIVE" || mode === "DEMO") {
      telemetryService.updateState({ mode });
      res.json({ status: "MODE_UPDATED", mode });
      return;
    }
    res.status(400).json({ error: "Invalid mode. Use 'LIVE' or 'DEMO'." });
  }

  async raiseHand(req: Request, res: Response): Promise<void> {
    const memberId = req.user?.id;
    if (!memberId) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    const state = telemetryService.getState();
    if (!state.isActive || state.isPaused) {
      res.status(409).json({ error: "The House is not in session. Wait until proceedings are live to raise your hand." });
      return;
    }
    if (state.activeSpeakerId === memberId) {
      res.status(409).json({ error: "You already hold the floor." });
      return;
    }
    const member = await memberService.getById(memberId);
    if (!member) {
      res.status(404).json({ error: "Member not found" });
      return;
    }

    const request = telemetryService.raiseRequest(member);
    if (!request) {
      res.status(409).json({ error: "Hand already raised. Await the Speaker's recognition." });
      return;
    }
    telemetryService.updateState({ speakingRequests: telemetryService.getState().speakingRequests });
    sessionService.addTimelineEvent({
      title: `${member.name} Raised Hand to Speak`,
      description: `${member.name} (${member.seat_id}) seeks the floor and is awaiting recognition by the Chair.`,
      type: "SPEECH",
      member_id: member.member_id
    });
    res.status(201).json({ status: "HAND_RAISED", request });
  }

  async withdrawHand(req: Request, res: Response): Promise<void> {
    const memberId = req.user?.id;
    if (!memberId) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    const removed = telemetryService.withdrawRequest(memberId);
    telemetryService.updateState({ speakingRequests: telemetryService.getState().speakingRequests });
    res.json({ status: removed ? "HAND_WITHDRAWN" : "NO_PENDING_REQUEST" });
  }

  async rejectRequest(req: Request, res: Response): Promise<void> {
    const { member_id } = req.body;
    if (!member_id) {
      res.status(400).json({ error: "member_id is required" });
      return;
    }
    const removed = telemetryService.withdrawRequest(member_id);
    const member = await memberService.getById(member_id);
    if (member) {
      sessionService.addTimelineEvent({
        title: `Request Declined: ${member.name}`,
        description: `The Chair has declined the request of ${member.name} (${member.seat_id}) to take the floor.`,
        type: "SPEECH",
        member_id
      });
    }
    telemetryService.updateState({ speakingRequests: telemetryService.getState().speakingRequests });
    res.json({ status: removed ? "REQUEST_DECLINED" : "NO_PENDING_REQUEST" });
  }

  async releaseFloor(req: Request, res: Response): Promise<void> {
    telemetryService.updateState({ activeSpeakerId: "" });
    sessionService.addTimelineEvent({
      title: "Floor Released by Chair",
      description: "The presiding officer has released the floor. The chamber awaits the next speaker.",
      type: "SPEECH"
    });
    res.json({ status: "FLOOR_RELEASED" });
  }

  getRequests(req: Request, res: Response): void {
    res.json({ requests: telemetryService.getState().speakingRequests });
  }

  /** Speaker activates mic — saves previous floor member for auto-resume later */
  speakerMicOn(req: Request, res: Response): void {
    const state = telemetryService.getState();
    // Save who was speaking before speaker interrupted (for auto-resume)
    const previousSpeakerId = state.activeSpeakerId || state.previousSpeakerId || "";
    telemetryService.updateState({
      speakerMicActive: true,
      previousSpeakerId
    });
    sessionService.addTimelineEvent({
      title: "Speaker Activated Microphone",
      description: "Hon. Speaker has taken the floor. All member microphones are muted.",
      type: "SPEECH"
    });
    res.json({ status: "SPEAKER_MIC_ON", previous_speaker_id: previousSpeakerId });
  }

  /** Speaker deactivates mic — auto-restores previous member if still eligible */
  async speakerMicOff(req: Request, res: Response): Promise<void> {
    const state = telemetryService.getState();
    const previousId = state.previousSpeakerId;
    let restored = false;

    if (previousId) {
      const member = await memberService.getById(previousId);
      if (member && member.status !== "SUSPENDED" && member.status !== "ABSENT") {
        // Restore the previous member to the floor
        telemetryService.updateState({
          speakerMicActive: false,
          previousSpeakerId: "",
          activeSpeakerId: previousId,
          speakingStartTime: Date.now()
        });
        sessionService.addTimelineEvent({
          title: `${member.name} Resumed Floor`,
          description: `${member.name} (${member.seat_id}) resumed their speech after the Speaker's address.`,
          type: "SPEECH",
          member_id: previousId
        });
        restored = true;
        res.json({ status: "SPEAKER_MIC_OFF", restored: true, resumed_member: member });
        return;
      }
    }

    telemetryService.updateState({
      speakerMicActive: false,
      previousSpeakerId: ""
    });
    res.json({ status: "SPEAKER_MIC_OFF", restored: false });
  }

  async setSpeaker(req: Request, res: Response): Promise<void> {
    const { member_id } = req.body;
    if (!member_id) {
      res.status(400).json({ error: "member_id is required" });
      return;
    }

    const member = await memberService.getById(member_id);
    if (!member) {
      res.status(404).json({ error: "Member not found" });
      return;
    }

    // Recognizing a member also lowers their raised hand.
    telemetryService.withdrawRequest(member_id);
    telemetryService.updateState({
      activeSpeakerId: member_id,
      speakingRequests: telemetryService.getState().speakingRequests
    });

    sessionService.addTimelineEvent({
      title: `${member.name} Recognized on Floor`,
      description: `Floor yielded to ${member.name} (${member.seat_id}). Microphone enabled.`,
      type: "SPEECH",
      member_id
    });

    res.json({ status: "SPEAKER_UPDATED", active_speaker: member });
  }

  setBill(req: Request, res: Response): void {
    const { bill } = req.body;
    if (!bill) {
      res.status(400).json({ error: "bill title is required" });
      return;
    }

    sessionService.updateConfig({ current_topic: bill });
    telemetryService.updateState({ currentBill: bill });

    sessionService.addTimelineEvent({
      title: "Legislative Agenda Updated",
      description: `House consideration advanced to: ${bill}`,
      type: "TOPIC_CHANGE"
    });

    res.json({ status: "BILL_UPDATED", current_bill: bill });
  }

  async getReport(req: Request, res: Response): Promise<void> {
    const config = sessionService.getConfig();
    // Read-only snapshot — never persist a report while the session is running.
    const report = await scorecardRepository.generateSessionReport(
      config.session_id,
      config.current_topic,
      false,
      telemetryService.getMemberSpeakingSeconds()
    );
    res.json(report);
  }

  async getCompleteSummary(req: Request, res: Response): Promise<void> {
    const config = sessionService.getConfig();
    const report = await scorecardRepository.generateSessionReport(
      config.session_id,
      config.current_topic,
      false,
      telemetryService.getMemberSpeakingSeconds()
    );

    const members = await memberService.getAll();
    const memberSummaries = await Promise.all(members.map(async (m) => {
      const memberSpeakingMs = telemetryService.getMemberSpeakingSeconds()[m.member_id] || 0;
      const card = await memberService.getScorecard(m.member_id, memberSpeakingMs);
      const speakingTurns = Number(card?.statistics?.speaking_turns || 0);
      const speakingSeconds = memberSpeakingMs;
      const finalScore = typeof card?.overall_score === "number" ? card.overall_score : 0;
      const grade = card?.grade || (finalScore >= 80 ? "A (High Constructive Record)" : finalScore >= 60 ? "B (Satisfactory Floor Record)" : "C (Decorum Concerns)");

      const positiveMarks = card?.positive_marks || {
        agenda_relevance_points: 0,
        constructive_proposals_points: 0,
        foundational_discussion_points: 0,
        decorum_conduct_bonus: 0,
        total_positive_marks: 0
      };

      const negativeDeductions = card?.negative_deductions || {
        speaking_time_overage_deduction: 0,
        off_topic_speech_deduction: 0,
        interruptions_cross_talk_deduction: 0,
        disruptive_movement_deduction: 0,
        offensive_language_deduction: 0,
        excessive_noise_deduction: 0,
        rule_violations_deduction: 0,
        total_negative_deductions: 0
      };

      const memberSummary = card?.member_summary || {
        subject_title: config.current_topic || "Current parliamentary agenda",
        discussion_summary: speakingTurns > 0
          ?
          `Delivered ${speakingTurns} recorded floor intervention${speakingTurns === 1 ? "" : "s"} on ${config.current_topic || "the legislative agenda"}.`
          : "No floor speech was recorded for this member during the session.",
        subject_notes_points: [],
        major_ideas_raised: [],
        policy_keywords: []
      };

      return {
        member_id: m.member_id,
        name: m.name,
        seat_id: m.seat_id,
        mic_id: m.mic_id,
        role: m.role || "Member",
        party: m.party,
        presence: m.status === "ABSENT" || m.status === "INACTIVE" ? "Absent" : "Present",
        speaking_time_formatted: `${Math.floor(speakingSeconds / 60)}:${String(speakingSeconds % 60).padStart(2, "0")}`,
        speaking_time_seconds: speakingSeconds,
        speeches_count: speakingTurns,
        agenda_relevance_pct: Number(card?.agenda_relevance ?? card?.categories?.agenda_relevance ?? 0),
        violations_count: m.violations_count || 0,
        warnings_count: m.warnings_count || 0,
        seat_compliance_pct: Number(card?.categories?.seat_compliance ?? 0),
        behavior_emotion: grade.startsWith("A") ? "Constructive & Calm" : grade.startsWith("B") ? "Active Participant" : "Decorum Concerns",
        positive_marks: positiveMarks,
        negative_deductions: negativeDeductions,
        member_summary: memberSummary,
        speaking_score: Number(card?.categories?.speaking_discipline ?? 0),
        agenda_score: Number(card?.categories?.agenda_relevance ?? 0),
        discipline_score: Number(card?.categories?.decorum_discipline ?? 0),
        seat_score: Number(card?.categories?.seat_compliance ?? 0),
        violations_score: Math.max(0, 100 - (m.violations_count || 0) * 10),
        final_score: finalScore,
        grade: grade
      };
    }));

    const alertsRes = await alertRepository.findAll({ sessionId: config.session_id });
    const typesBreakdown: Record<string, number> = {};
    for (const alert of alertsRes.alerts) {
      const category = alert.title || alert.type || alert.rule_id || "Unclassified Rule Advisory";
      typesBreakdown[category] = (typesBreakdown[category] || 0) + 1;
    }
    if (Object.keys(typesBreakdown).length === 0) {
      typesBreakdown["Speaking Time Adherence"] = 0;
      typesBreakdown["Agenda Relevance & Decorum"] = 0;
      typesBreakdown["Acoustic Noise Control"] = 0;
      typesBreakdown["Chamber Movement Discipline"] = 0;
    }

    const statistics = report.session_statistics || {};
    const analytics = report.ai_analytics_summary || {};
    const totalSpeakingSeconds = memberSummaries.reduce((sum, m) => sum + m.speaking_time_seconds, 0);
    const totalSpeeches = memberSummaries.reduce((sum, m) => sum + m.speeches_count, 0);
    const criticalViolations = alertsRes.alerts.filter((a) => a.severity === "CRITICAL").length;
    const highSeverityAlerts = alertsRes.alerts.filter((a) => a.severity === "HIGH").length;
    const mediumViolations = alertsRes.alerts.filter((a) => a.severity === "MEDIUM").length;
    const lowViolations = alertsRes.alerts.filter((a) => a.severity === "LOW").length;

    const dynamicStatistics = {
      ...statistics,
      total_members_registered: members.length,
      total_members_present: memberSummaries.filter((m) => m.presence === "Present").length,
      total_active_speakers: memberSummaries.filter((m) => m.speeches_count > 0).length,
      total_speaking_time_minutes: Math.round(totalSpeakingSeconds / 60),
      total_alerts_issued: alertsRes.total,
      critical_violations: criticalViolations,
      high_severity_alerts: highSeverityAlerts,
      medium_violations: mediumViolations,
      low_violations: lowViolations,
      unauthorized_movement_incidents: alertsRes.alerts.filter((a) => a.rule_id === "RULE_7_UNAUTHORIZED_MOVEMENT").length
    };

    const scoredMembers = memberSummaries.filter((m) => m.agenda_relevance_pct > 0);
    const dynamicAnalytics = {
      ...analytics,
      average_agenda_relevance_percentage: scoredMembers.length
        ? Math.round(scoredMembers.reduce((sum, m) => sum + m.agenda_relevance_pct, 0) / scoredMembers.length * 10) / 10
        : 0,
      decorum_compliance_index: members.length
        ? Math.max(0, Math.min(100, Math.round((100 - (criticalViolations * 10 + highSeverityAlerts * 3 + mediumViolations) / members.length) * 10) / 10))
        : 0,
      chamber_order_rating: criticalViolations > 0
        ? "CRITICAL_ACTION_REQUIRED"
        : highSeverityAlerts > 0 || mediumViolations > 0
          ? "SATISFACTORY_WITH_ADVISORIES"
          : "ORDERLY"
    };
    const totalMin = Math.floor(totalSpeakingSeconds / 60);
    const totalSec = totalSpeakingSeconds % 60;
    const totalSpeakingFormatted = totalSpeakingSeconds > 0
      ? (totalMin > 0 ? `${totalMin}m ${totalSec > 0 ? totalSec + "s" : ""}`.trim() : `${totalSec}s`)
      : "0m";

    const avgSecTotal = Math.round(totalSpeakingSeconds / Math.max(1, totalSpeeches));
    const avgMin = Math.floor(avgSecTotal / 60);
    const avgSecRem = avgSecTotal % 60;
    const avgSpeakingFormatted = avgSecTotal > 0
      ? (avgMin > 0 ? `${avgMin}m ${avgSecRem > 0 ? avgSecRem + "s" : ""}`.trim() : `${avgSecTotal}s`)
      : "0s";

    res.json({
      session_information: {
        session_id: config.session_id,
        date: config.session_date,
        start_time: report.session_information?.start_time || config.start_time,
        end_time: report.session_information?.end_time || config.scheduled_end_time,
        total_duration: report.session_information?.duration || "Unavailable",
        session_type: config.session_type,
        house_chamber: config.house_chamber,
        number_of_members: members.length,
        number_of_topics: config.topics.length
      },
      session_activity: {
        total_speeches: totalSpeeches,
        total_speaking_time_formatted: totalSpeakingFormatted,
        total_speaking_time_seconds: totalSpeakingSeconds,
        average_speaking_time_formatted: avgSpeakingFormatted,
        number_of_active_members: dynamicStatistics.total_active_speakers,
        number_of_members_present: dynamicStatistics.total_members_present
      },
      report_id: report.report_id,
      session_statistics: dynamicStatistics,
      ai_analytics_summary: dynamicAnalytics,
      violation_summary: {
        total_violations: alertsRes.total,
        low_violations: lowViolations,
        medium_violations: mediumViolations,
        high_violations: highSeverityAlerts,
        critical_violations: criticalViolations,
        types_breakdown: typesBreakdown
      },
      topic_wise_summary: config.topics,
      member_wise_summary: memberSummaries,
      member_scorecards: report.member_scorecards || [],
      timeline: sessionService.getTimeline(),
      generated_at: report.generated_at || new Date().toISOString()
    });
  }

  async getAnalytics(req: Request, res: Response): Promise<void> {
    const state = telemetryService.getState();
    const [alertsRes, transcripts] = await Promise.all([
      alertRepository.findAll({ sessionId: state.sessionId }),
      transcriptRepository.findAll({ sessionId: state.sessionId, limit: 1000 })
    ]);
    const seats = Object.values(state.seatMovementStates);
    const speakingSeconds = Object.values(telemetryService.getMemberSpeakingSeconds());
    const relevanceValues = transcripts
      .map((transcript) => Number(transcript.relevance))
      .filter((relevance) => Number.isFinite(relevance));
    const activeSpeakers = speakingSeconds.filter((seconds) => seconds > 0);
    const decorumPenalty = alertsRes.alerts.reduce((penalty, alert) =>
      penalty + (alert.severity === "CRITICAL" ? 10 : alert.severity === "HIGH" ? 3 : alert.severity === "MEDIUM" ? 1 : 0), 0);
    res.json({
      chamber_occupancy: seats.length ? seats.filter((seat) => seat.occupied).length / seats.length : 0,
      decorum_compliance_rate: Math.max(0, (100 - decorumPenalty / Math.max(1, seats.length)) / 100),
      average_relevance_score: relevanceValues.length
        ? relevanceValues.reduce((sum, relevance) => sum + relevance, 0) / relevanceValues.length * 100
        : 0,
      total_violations_today: alertsRes.total,
      average_speech_duration_seconds: activeSpeakers.length
        ? Math.round(activeSpeakers.reduce((sum, seconds) => sum + seconds, 0) / activeSpeakers.length)
        : 0
    });
  }

  getSeats(req: Request, res: Response): void {
    const state = telemetryService.getState();
    res.json(state.seatMovementStates);
  }
}

export const sessionController = new SessionController();
