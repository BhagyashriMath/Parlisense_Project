import { Request, Response } from "express";
import { telemetryService } from "../services/telemetry.service";
import { memberService } from "../services/member.service";
import { alertRepository } from "../repositories/alert.repository";
import { auditRepository } from "../repositories/audit.repository";
import { transcriptRepository } from "../repositories/transcript.repository";
import { aiService } from "../services/ai.service";

// Python ML service base URL (FastAPI on port 8000 by default)
const ML_BASE = process.env.ML_SERVICE_URL || "http://localhost:8000";

export class AiController {
  getStatus(req: Request, res: Response): void {
    res.json({
      status: "HEALTHY",
      active_models: 8,
      subsystems: {
        speech_recognition: "ACTIVE",
        nlp_agenda_analysis: "ACTIVE",
        emotion_detection: "ACTIVE",
        offensive_detection: "ACTIVE",
        computer_vision: "ACTIVE",
        noise_analysis: "ACTIVE",
        rule_engine: "ACTIVE",
        database_storage: "ACTIVE"
      }
    });
  }

  async simulateEvent(req: Request, res: Response): Promise<void> {
    const { event_type } = req.body;
    telemetryService.updateState({ forcedEvent: event_type || null });
    await auditRepository.log("SIMULATION_EVENT_TRIGGERED", { event_type });
    res.json({ status: "SIMULATION_TRIGGERED", event_type });
  }

  async processAudio(req: Request, res: Response): Promise<void> {
    const { db_level, decibel, transcript_snippet, member_id } = req.body;
    const level = typeof db_level === "number" ? db_level : decibel;
    if (typeof level === "number" && level > 0) {
      telemetryService.updateState({
        audioNoiseDb: level,
        liveAudioLevel: Math.round((level / 100) * 100),
        lastRealAudioTime: Date.now()
      });
    }
    let transcript;
    if (typeof transcript_snippet === "string" && transcript_snippet.trim().length >= 2) {
      const activeSpeakerId = telemetryService.getState().activeSpeakerId;
      const user = req.user;
      const isUserSpeaker = user?.role === "speaker";
      const targetMember = member_id ? await memberService.getById(member_id) : null;
      const isSpeakerMember =
        isUserSpeaker ||
        targetMember?.role?.toLowerCase().includes("speaker") ||
        targetMember?.role?.toLowerCase().includes("presiding") ||
        member_id?.startsWith("SP");

      let speakingMember: any = null;

      if (isSpeakerMember) {
        // Presiding Officer (Speaker) has inherent authority to address the House from the Dais at any time
        speakingMember = targetMember || (await memberService.getAll()).find(m => m.role?.toLowerCase().includes("speaker")) || {
          member_id: member_id || "SP001",
          seat_id: "CHAMBER-DAIS",
          name: user?.name || "Hon. Speaker",
          role: "Speaker"
        };
      } else {
        // Floor Member: resolve speaking member from member_id or activeSpeakerId
        const resolvedId = member_id || activeSpeakerId;
        speakingMember = resolvedId ? await memberService.getById(resolvedId) : null;
        if (!speakingMember) {
          speakingMember = memberService.getCachedAll()[0];
        }
      }

      if (speakingMember) {
        const speechAnalysis = await aiService.analyzeSpeechRelevanceAsync(
          transcript_snippet,
          telemetryService.getState().currentBill
        );
        const emotionAnalysis = aiService.analyzeEmotion(
          transcript_snippet,
          telemetryService.getState().audioNoiseDb
        );
        transcript = await transcriptRepository.save({
          id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          session_id: telemetryService.getState().sessionId,
          member_id: speakingMember.member_id,
          seat_id: speakingMember.seat_id,
          text: transcript_snippet.trim(),
          confidence: 0.95,
          emotion: emotionAnalysis.label,
          relevance: speechAnalysis.score
        });

        // Fire off-topic alert immediately if SBERT says so
        if (speechAnalysis.fireAlert && speechAnalysis.alertMessage) {
          const alertId = `ALT-TOP-SBERT-${Date.now()}`;
          const relPct = Math.round(speechAnalysis.score * 100);
          await alertRepository.save({
            alert_id: alertId,
            session_id: telemetryService.getState().sessionId,
            member_id: speakingMember.member_id,
            seat_id: speakingMember.seat_id,
            rule_id: "RULE_3_OFF_TOPIC",
            type: "OFF_TOPIC_SPEECH",
            severity: "MEDIUM",
            alert_level: 2,
            title: "Off-Topic Speech Detected (Semantic NLP)",
            description: `SBERT semantic similarity: ${relPct}%. Category: ${speechAnalysis.category}. Speech is not aligned with the current agenda.`,
            member_audio_message: speechAnalysis.alertMessage,
            suspension_recommended: false,
            source_module: "SBERT Semantic Agenda Classifier",
            status: "ACTIVE"
          });
        }

        telemetryService.broadcast();
      }
    }
    res.json({ status: "AUDIO_TELEMETRY_RECORDED", transcript });
  }

  async memberPresence(req: Request, res: Response): Promise<void> {
    const { member_id, violation_type, seat_id, confidence } = req.body;
    const member = await memberService.getById(member_id);

    const resolvedSeatId = seat_id || member?.seat_id;

    if (violation_type === "NORMAL" || violation_type === "COMPLIANT") {
      if (resolvedSeatId) {
        telemetryService.updateSeatPresence(resolvedSeatId, true, "Normal");
      }
      res.json({ status: "PRESENCE_RESTORED", member_id, seat_id: resolvedSeatId });
      return;
    }

    const memberSeatNum = (member?.seat_id?.match(/\d+/) || [""])[0];
    const incomingSeatNum = (seat_id?.match(/\d+/) || [""])[0];
    const isSameSeat = !seat_id || !member?.seat_id || (memberSeatNum && incomingSeatNum && parseInt(memberSeatNum, 10) === parseInt(incomingSeatNum, 10)) || seat_id === member?.seat_id;

    const wrongSeat = Boolean(seat_id && !isSameSeat);
    if ((violation_type || wrongSeat) && member) {
      const effectiveViolation = violation_type === "MEMBER_ABSENT" ? "MEMBER_ABSENT" : (wrongSeat ? "WRONG_SEAT_OCCUPANCY" : violation_type);
      telemetryService.updateSeatPresence(
        resolvedSeatId || member.seat_id,
        effectiveViolation !== "MEMBER_ABSENT",
        effectiveViolation === "MEMBER_ABSENT" ? "Absent" : effectiveViolation === "WRONG_SEAT_OCCUPANCY" ? "Wrong Seat" : "Unauthorized Movement"
      );
      const sessionId = telemetryService.getState().sessionId;
      const { alerts } = await alertRepository.findAll({
        sessionId,
        memberId: member_id,
        status: "ACTIVE"
      });
      const movementAlertAlreadyActive = alerts.some((alert) => alert.rule_id === "RULE_7_UNAUTHORIZED_MOVEMENT");
      if (!movementAlertAlreadyActive) {
        const alertId = `ALT-PRES-${member_id}-${Date.now()}`;
        await alertRepository.save({
          alert_id: alertId,
          session_id: sessionId,
          member_id,
          seat_id: resolvedSeatId || member.seat_id,
          rule_id: "RULE_7_UNAUTHORIZED_MOVEMENT",
          type: effectiveViolation,
          severity: effectiveViolation === "MEMBER_ABSENT" || wrongSeat ? "HIGH" : "MEDIUM",
          alert_level: effectiveViolation === "MEMBER_ABSENT" || wrongSeat ? 3 : 2,
          title: effectiveViolation === "MEMBER_ABSENT"
            ? `Member Absent — No Face Visible — ${member.name}`
            : wrongSeat
              ? `Wrong Seat Occupancy — ${member.name}`
              : `Significant Movement Detected — ${member.name}`,
          description: wrongSeat
            ? `${member.name} was detected at ${seat_id}; assigned seat is ${member.seat_id}.`
            : effectiveViolation === "MEMBER_ABSENT"
              ? `Computer vision camera detected no face visible in assigned seat for ${member.name} (${resolvedSeatId || member.seat_id}). Member marked NOT SEATED.`
              : `Vision detected displacement for ${member.name} (Seat ${resolvedSeatId || member.seat_id}).`,
          member_audio_message: effectiveViolation === "MEMBER_ABSENT"
            ? "No face detected in camera. Please return to your seat and face the camera."
            : "Please remain in your assigned seat position.",
          suspension_recommended: false,
          source_module: "Member Presence Monitor",
          status: "ACTIVE"
        });
        if (effectiveViolation !== "MEMBER_ABSENT") {
          await alertRepository.insertViolation(alertId, member_id, "UNAUTHORIZED_MOVEMENT", 10);
          await memberService.update(member_id, {
            violations_count: (member.violations_count || 0) + 1
          });
        }
      }

      telemetryService.broadcast();
    }

    res.json({ status: "PRESENCE_RECORDED", member_id, violation_type, seat_id: resolvedSeatId });
  }

  /**
   * POST /api/ai/vision-frame
   *
   * Relay a base64-encoded webcam frame to the Python ML movement tracker
   * and return YOLO tracking result to the frontend dashboard.
   *
   * On a boundary violation or missing-person event, also fires an alert
   * into the telemetry stream so the Speaker dashboard is notified.
   */
  async visionMovementFrame(req: Request, res: Response): Promise<void> {
    const {
      frame_b64,
      member_id = "M001",
      seat_id = "S01",
      boundary_x1 = 10,
      boundary_y1 = 5,
      boundary_x2 = 90,
      boundary_y2 = 95,
    } = req.body;

    // Forward to Python ML service
    let mlResult: any = null;
    try {
      const mlRes = await fetch(`${ML_BASE}/api/vision/movement-frame`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frame_b64: frame_b64 || null,
          member_id,
          seat_id,
          boundary_x1,
          boundary_y1,
          boundary_x2,
          boundary_y2,
        }),
        signal: AbortSignal.timeout(4000),
      });
      if (mlRes.ok) mlResult = await mlRes.json();
    } catch (err: any) {
      // ML service unreachable — assume person IS present so the UI never
      // falsely shows "NOT SEATED" just because Python isn't running.
      mlResult = {
        status: "ML_UNAVAILABLE",
        person_detected: true,
        track_id: 1,
        member_id,
        seat_id,
        position: { cx: 50, cy: 50, bbox: { x1: 32, y1: 10, x2: 68, y2: 90 } },
        confidence: 0,
        inside_boundary: true,
        boundary: { x1: boundary_x1, y1: boundary_y1, x2: boundary_x2, y2: boundary_y2 },
        alert_type: "NONE",
        alert_message: "",
        is_new_alert: false,
        timestamp_ms: Date.now(),
      };
    }

    // Fire telemetry alerts for boundary violations / missing person
    // is_new_alert=true means it is the FIRST frame of this violation event
    if (mlResult?.is_new_alert) {
      const alertType: string = mlResult.alert_type || "NONE";
      if (alertType === "BOUNDARY_VIOLATION" || alertType === "PERSON_MISSING") {
        try {
          const member = await memberService.getById(member_id).catch(() => null);
          const sessionId = telemetryService.getState().sessionId;

          // Check for a recently active movement alert to avoid duplicates
          const { alerts: existingAlerts } = await alertRepository.findAll({
            sessionId,
            memberId: member_id,
            status: "ACTIVE",
          });
          const recentMovement = existingAlerts.some(
            (a) => a.rule_id === "RULE_7_UNAUTHORIZED_MOVEMENT" &&
                   Date.now() - new Date(a.created_at || 0).getTime() < 45_000
          );

          if (!recentMovement) {
            const alertId = `ALT-MOV-${member_id}-${Date.now()}`;
            const isMissing = alertType === "PERSON_MISSING";

            await alertRepository.save({
              alert_id: alertId,
              session_id: sessionId,
              member_id,
              seat_id: seat_id || member?.seat_id || "S01",
              rule_id: "RULE_7_UNAUTHORIZED_MOVEMENT",
              type: isMissing ? "MEMBER_ABSENT" : "UNAUTHORIZED_MOVEMENT",
              severity: isMissing ? "HIGH" : "MEDIUM",
              alert_level: isMissing ? 3 : 2,
              title: isMissing
                ? `Member Not Visible — ${member?.name || member_id}`
                : `Boundary Violation — ${member?.name || member_id}`,
              description: isMissing
                ? `YOLO camera tracker: ${member?.name || member_id} is not visible in the camera frame.`
                : `YOLO camera tracker: ${member?.name || member_id} moved outside the designated boundary zone.`,
              member_audio_message: mlResult.alert_message || (
                isMissing
                  ? "You are not visible in the camera. Please return to your seat and face the camera."
                  : "You have moved outside your designated area. Please return immediately."
              ),
              suspension_recommended: false,
              source_module: "YOLO Physical Movement Tracker",
              status: "ACTIVE",
            });

            if (!isMissing && member) {
              await alertRepository.insertViolation(alertId, member_id, "UNAUTHORIZED_MOVEMENT", 10);
              await memberService.update(member_id, {
                violations_count: (member.violations_count || 0) + 1,
              });
            }

            // Update seat movement state in telemetry
            telemetryService.updateSeatPresence(
              seat_id,
              !isMissing,
              isMissing ? "Absent" : "Well Rush / Displaced"
            );
            telemetryService.broadcast();
          }
        } catch (alertErr: any) {
          console.warn("[AI] visionMovementFrame alert save error:", alertErr?.message);
        }
      } else if (mlResult?.person_detected && mlResult?.inside_boundary) {
        // Person returned to valid position — restore seat presence
        try {
          telemetryService.updateSeatPresence(seat_id, true, "Normal");
          telemetryService.broadcast();
        } catch (_) {}
      }
    }

    res.json(mlResult);
  }
}

export const aiController = new AiController();
