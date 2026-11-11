import fs from "fs";
import { sessionService } from "./session.service";
import { memberService } from "./member.service";
import { aiService } from "./ai.service";
import { alertRepository } from "../repositories/alert.repository";
import { transcriptRepository } from "../repositories/transcript.repository";
import { emergencyRepository } from "../repositories/emergency.repository";
import { notificationRepository } from "../repositories/notification.repository";
import { DATA_DIR, RUNTIME_STATE_PATH, rulesConfig } from "../config";
import { MemberEntity } from "../models";
import { readSessionClock, updateSessionClock } from "./session-clock";

export interface SpeakingRequest {
  member_id: string;
  seat_id: string;
  name: string;
  requested_at: number;
}

export interface TelemetryState {
  sessionId: string;
  isActive: boolean;
  mode: "LIVE" | "DEMO";
  startTime: number;
  currentBill: string;
  activeSpeakerId: string;
  speakingStartTime: number;
  speakingDuration: number;
  memberSpeakingMs: Record<string, number>;
  speakingRequests: SpeakingRequest[];
  /** member_id of who had the floor before speaker interrupted — for auto-resume */
  previousSpeakerId: string;
  /** true = speaker mic is live, all member mics must be muted */
  speakerMicActive: boolean;
  emergencyActive: boolean;
  emergencySource?: string;
  audioNoiseDb: number;
  liveAudioLevel: number;
  forcedEvent?: string | null;
  isPaused: boolean;
  pausedElapsedSeconds: number;
  pauseTimestamp: number | null;
  lastRealAudioTime: number;
  seatMovementStates: Record<string, {
    seatId: string;
    occupied: boolean;
    status: string;
    movementStatus: string;
    x: number;
    y: number;
  }>;
  noiseEpisodeStage: 0 | 1 | 2;
}

export class TelemetryService {
  private state: TelemetryState;
  private activeWsClients: Set<any> = new Set();
  private tickerInterval: any = null;
  private triggeredSpeakerAlerts: Set<string> = new Set();
  private lastAlertTimestamps: Record<string, number> = {};
  private disciplinaryEventKeys = new Set<string>();

  constructor() {
    this.state = {
      sessionId: "PAR-2026-001",
      isActive: false,
      isPaused: false,
      pausedElapsedSeconds: 0,
      pauseTimestamp: null,
      lastRealAudioTime: 0,
      mode: "DEMO",
      startTime: Date.now(),
      currentBill: "Digital Education & AI Governance Bill 2026",
      // No member is speaking until the presiding officer explicitly grants
      // the floor. This prevents a fresh session from showing M001 as active.
      activeSpeakerId: "",
      speakingStartTime: Date.now(),
      speakingDuration: 0,
      memberSpeakingMs: {},
      emergencyActive: false,
      audioNoiseDb: 52.4,
      liveAudioLevel: 42,
      forcedEvent: null,
      seatMovementStates: {},
      speakingRequests: [],
      noiseEpisodeStage: 0,
      previousSpeakerId: "",
      speakerMicActive: false
    };

    for (let i = 1; i <= 12; i++) {
      const seatId = `S${String(i).padStart(2, "0")}`;
      const row = Math.floor((i - 1) / 4);
      const col = (i - 1) % 4;
      this.state.seatMovementStates[seatId] = {
        seatId,
        occupied: true,
        status: "Seated Correctly",
        movementStatus: "Normal",
        x: 18 + col * 22,
        y: 28 + row * 26
      };
    }

    // A backend restart (tsx watch on file save, deployment recycle, process
    // crash) used to wipe the live flag, making every dashboard instantly show
    // "SESSION CONCLUDED". Restore the persisted live session so an ongoing
    // sitting survives process restarts with its clock intact.
    try {
      if (fs.existsSync(RUNTIME_STATE_PATH)) {
        const persistedLive = JSON.parse(fs.readFileSync(RUNTIME_STATE_PATH, "utf-8"))?.liveState;
        if (persistedLive?.isActive === true) {
          this.state = {
            ...this.state,
            sessionId: persistedLive.sessionId || this.state.sessionId,
            isActive: true,
            isPaused: !!persistedLive.isPaused,
            startTime: persistedLive.startTime || Date.now(),
            pauseTimestamp: persistedLive.pauseTimestamp ?? null,
            pausedElapsedSeconds: persistedLive.pausedElapsedSeconds || 0,
            activeSpeakerId: persistedLive.activeSpeakerId || "",
            speakingStartTime: persistedLive.speakingStartTime || Date.now(),
            speakingDuration: 0,
            memberSpeakingMs: persistedLive.memberSpeakingMs || {},
            speakingRequests: persistedLive.speakingRequests || []
          };
        }
      }
    } catch (_) {}

    this.startTicker();
  }

  /** Persist the live session so a process restart never silently ends it. */
  private persistLiveState() {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      let existing: any = {};
      try {
        existing = fs.existsSync(RUNTIME_STATE_PATH)
          ? JSON.parse(fs.readFileSync(RUNTIME_STATE_PATH, "utf-8")) : {};
      } catch (_) {}
      existing.liveState = {
        sessionId: this.state.sessionId,
        isActive: this.state.isActive,
        isPaused: this.state.isPaused,
        startTime: this.state.startTime,
        pauseTimestamp: this.state.pauseTimestamp,
        pausedElapsedSeconds: this.state.pausedElapsedSeconds,
        activeSpeakerId: this.state.activeSpeakerId,
        speakingStartTime: this.state.speakingStartTime,
        memberSpeakingMs: this.state.memberSpeakingMs,
        speakingRequests: this.state.speakingRequests
      };
      existing.saved_at = new Date().toISOString();
      fs.writeFileSync(RUNTIME_STATE_PATH, JSON.stringify(existing, null, 2));
    } catch (_) {}
  }

  getState(): TelemetryState {
    return this.state;
  }

  getMemberSpeakingSeconds(): Record<string, number> {
    return readSessionClock(this.state, Date.now()).memberSeconds;
  }

  /** Raise a request to speak / hand for the given member. */
  raiseRequest(member: MemberEntity): SpeakingRequest | null {
    if (this.state.speakingRequests.some((r) => r.member_id === member.member_id)) return null;
    const request: SpeakingRequest = {
      member_id: member.member_id,
      seat_id: member.seat_id,
      name: member.name,
      requested_at: Date.now()
    };
    this.state.speakingRequests = [...this.state.speakingRequests, request];
    return request;
  }

  /** Remove a pending request to speak for the given member (hand down). */
  withdrawRequest(memberId: string): boolean {
    const next = this.state.speakingRequests.filter((r) => r.member_id !== memberId);
    const removed = next.length !== this.state.speakingRequests.length;
    this.state.speakingRequests = next;
    return removed;
  }

  /** Floor the standing request queue (session start / end). */
  clearSpeakingRequests(): void {
    this.state.speakingRequests = [];
  }

  updateState(partial: Partial<TelemetryState>): TelemetryState {
    const now = Date.now();
    if (
      (partial.activeSpeakerId !== undefined && partial.activeSpeakerId !== this.state.activeSpeakerId) ||
      partial.startTime !== undefined ||
      (partial.isActive !== undefined && partial.isActive !== this.state.isActive)
    ) {
      this.triggeredSpeakerAlerts.clear();
    }
    this.state = updateSessionClock(this.state, partial, now);
    if (
      partial.isActive !== undefined ||
      partial.isPaused !== undefined ||
      partial.sessionId !== undefined ||
      partial.startTime !== undefined ||
      partial.activeSpeakerId !== undefined ||
      partial.speakingRequests !== undefined
    ) {
      this.persistLiveState();
    }
    this.broadcast();
    return this.state;
  }

  updateSeatPresence(seatId: string, occupied: boolean, movementStatus = "Normal") {
    if (!seatId) return;
    const num = (seatId.match(/\d+/) || [""])[0];
    const matchingKey = Object.keys(this.state.seatMovementStates).find(
      (k) => k === seatId || (num && (k.match(/\d+/) || [""])[0] === num)
    ) || seatId;

    const existing = this.state.seatMovementStates[matchingKey] || {
      seatId: matchingKey,
      occupied: true,
      status: "Seated Correctly",
      movementStatus: "Normal",
      x: 18,
      y: 28
    };

    const updated = {
      ...existing,
      seatId: matchingKey,
      occupied,
      movementStatus,
      status: occupied ? (movementStatus === "Normal" ? "Seated Correctly" : "Moved Away") : "Absent"
    };

    this.state.seatMovementStates = {
      ...this.state.seatMovementStates,
      [matchingKey]: updated,
      [seatId]: updated
    };
    this.broadcast();
  }

  async registerWs(socket: any) {
    this.activeWsClients.add(socket);
    if (socket.readyState === 1) {
      try {
        const data = await this.generateCurrentTelemetry();
        if (socket.readyState === 1) socket.send(JSON.stringify(data));
      } catch (_) {}
    }
  }

  unregisterWs(socket: any) {
    this.activeWsClients.delete(socket);
  }

  async broadcast() {
    try {
      const payload = JSON.stringify(await this.generateCurrentTelemetry());
      for (const socket of this.activeWsClients) {
        if (socket.readyState === 1) {
          try { socket.send(payload); } catch (_) {}
        }
      }
    } catch (_) {}
  }

  private getActiveMember(): MemberEntity {
    const members = memberService.getCachedAll();
    if (members.length === 0) {
      return {
        member_id: "M001",
        name: "Dr. Rajeshwar Sharma",
        seat_id: "S001",
        mic_id: "MIC001",
        camera_id: "CAM001",
        allocated_time_seconds: 300,
        status: "ACTIVE",
        role: "Minister of Education",
        party: "National Democratic Front",
        constituency: "Varanasi North",
        department: "Minister of Education"
      };
    }
    return members.find((m) => m.member_id === this.state.activeSpeakerId) || members[0];
  }

  private shouldThrottle(ruleId: string, minIntervalMs: number = 30000): boolean {
    const now = Date.now();
    const last = this.lastAlertTimestamps[ruleId] || 0;
    if (now - last < minIntervalMs) return true;
    this.lastAlertTimestamps[ruleId] = now;
    return false;
  }

  async generateCurrentTelemetry() {
    // Finish asynchronous reads before taking a single, consistent clock snapshot.
    const [emergencyRequests, notifications, recommendations] = await Promise.all([
      emergencyRepository.findAll(this.state.sessionId),
      notificationRepository.getAll(10),
      alertRepository.getPendingRecommendations()
    ]);
    const activeMember = this.getActiveMember();
    const hasActiveSpeaker = Boolean(this.state.activeSpeakerId);
    const now = Date.now();
    const nowStr = new Date().toLocaleTimeString();
    const isLiveActive = this.state.isActive && !this.state.isPaused;
    const clock = readSessionClock(this.state, now);
    const speakingTime = clock.speakingSeconds;
    this.state.speakingDuration = speakingTime;

    const hasRecentRealAudio = now - (this.state.lastRealAudioTime || 0) < 1500;
    if (!isLiveActive || !hasRecentRealAudio) {
      this.state.liveAudioLevel = 0;
      // In DEMO mode keep a simulated noise level so emotion/noise rules fire
      // properly even without a real microphone.  In LIVE mode with no recent
      // audio we zero out so stale dB values don't linger.
      if (this.state.mode === "DEMO") {
        this.state.audioNoiseDb = aiService.simulateNoise(this.state.forcedEvent, this.state.audioNoiseDb);
      } else {
        this.state.audioNoiseDb = 0;
      }
    }
    if (this.state.mode === "DEMO" && isLiveActive && !hasRecentRealAudio) {
      this.state.seatMovementStates = aiService.simulateSeats(this.state.forcedEvent, this.state.seatMovementStates);
    }

    const membersById = new Map(memberService.getCachedAll().map((member) => [member.member_id, member]));
    const recentTranscripts = transcriptRepository.getCachedRecent(8, this.state.sessionId).map((transcript) => {
      const member = membersById.get(transcript.member_id);
      return {
        ...transcript,
        speakerName: transcript.speakerName || member?.name || transcript.member_id,
        party: member?.party
      };
    });
    const latestTranscriptText = recentTranscripts.length > 0
      ? recentTranscripts[recentTranscripts.length - 1].text
      : "";

    const agendaRes = aiService.analyzeSpeechRelevance(latestTranscriptText, this.state.currentBill);
    const emotionRes = aiService.analyzeEmotion(latestTranscriptText, this.state.audioNoiseDb);
    const offensiveRes = aiService.analyzeOffensive(latestTranscriptText);
    const hasWellRush = Object.values(this.state.seatMovementStates).some((s) => s.movementStatus.includes("Well Rush"));
    const hasMovementViolation = Object.values(this.state.seatMovementStates).some((seat) =>
      seat.movementStatus !== "Normal" || !seat.occupied
    );
    const isMultipleSpeakers = this.state.forcedEvent === "MULTIPLE_SPEAKERS";

    const aiOutput = {
      timestamp: nowStr,
      session_id: this.state.sessionId,
      member_id: hasActiveSpeaker ? activeMember.member_id : "",
      seat_id: hasActiveSpeaker ? activeMember.seat_id : "",
      member_name: hasActiveSpeaker ? activeMember.name : "",
      transcript: latestTranscriptText,
      speaking_time: this.state.isActive && hasActiveSpeaker ? speakingTime : 0,
      allocated_time: hasActiveSpeaker ? (activeMember.allocated_time_seconds || 300) : 0,
      agenda_relevance: agendaRes.score,
      agenda_relevance_percentage: Math.round(agendaRes.score * 100),
      agenda_status: latestTranscriptText.trim()
        ? agendaRes.isOffTopic ? "Off Topic" : "On Topic"
        : "No Speech Detected",
      matched_agenda_keywords: agendaRes.matched,
      emotion: emotionRes.label,
      emotion_confidence: emotionRes.confidence,
      offensive: offensiveRes.isOffensive || this.state.forcedEvent === "OFFENSIVE",
      flagged_words: offensiveRes.flaggedWords,
      noise_level: this.state.audioNoiseDb,
      noise_category: this.state.audioNoiseDb > 82 ? "High Noise" : this.state.audioNoiseDb > 70 ? "Moderate Noise" : "Normal Noise",
      multiple_speakers: isMultipleSpeakers,
      disruption_level: hasMovementViolation || this.state.audioNoiseDb > 82 ? "Severe" : emotionRes.isHeated ? "Moderate" : "Low",
      seat_status: this.state.seatMovementStates[activeMember.seat_id]?.status || "Seated Correctly",
      movement_status: this.state.seatMovementStates[activeMember.seat_id]?.movementStatus || "Normal",
      emergency: this.state.emergencyActive
    };

    if (isLiveActive && this.state.activeSpeakerId) {
      this.evaluateRules(aiOutput, activeMember, clock.memberSeconds[activeMember.member_id] ?? speakingTime, nowStr, emotionRes, hasWellRush);
    }

    const alerts = alertRepository.getCachedAlerts();

    let chamberStatus = "NORMAL_ORDER";
    if (alerts.some((a) => a.severity === "CRITICAL" && a.status === "ACTIVE")) chamberStatus = "CRITICAL_ACTION_REQUIRED";
    else if (alerts.some((a) => a.severity === "HIGH" && a.status === "ACTIVE")) chamberStatus = "DISRUPTIVE_ALERT";
    else if (alerts.some((a) => a.severity === "MEDIUM" && a.status === "ACTIVE")) chamberStatus = "DECORUM_ADVISORY";
    else if (alerts.some((a) => a.severity === "LOW" && a.status === "ACTIVE")) chamberStatus = "TIMER_ADVISORY";

    const elapsedSec = clock.sessionSeconds;
    const hours = String(Math.floor(elapsedSec / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((elapsedSec % 3600) / 60)).padStart(2, "0");
    const seconds = String(elapsedSec % 60).padStart(2, "0");

    return {
      server_timestamp_ms: now,
      session_id: this.state.sessionId,
      is_active: this.state.isActive,
      is_paused: this.state.isPaused,
      session_status: this.state.isPaused ? "PAUSED" : this.state.isActive ? "LIVE" : "STOPPED",
      mode: this.state.mode,
      speaker_mic_active: this.state.speakerMicActive,
      previous_speaker_id: this.state.previousSpeakerId,
      session_duration_seconds: elapsedSec,
      session_duration_formatted: `${hours}:${minutes}:${seconds}`,
      current_bill: sessionService.getConfig().current_topic || this.state.currentBill,
      active_speaker: this.state.isActive && this.state.activeSpeakerId ? activeMember : undefined,
      emergency_requests: emergencyRequests,
      speaking_requests: this.state.speakingRequests,
      speaking_duration_seconds: this.state.isActive ? speakingTime : 0,
      member_speaking_seconds: clock.memberSeconds,
      ai_output: aiOutput,
      chamber_status: chamberStatus,
      scheduled_session: sessionService.getScheduledSession(),
      upcoming_notifications: notifications,
      vision_telemetry: {
        total_persons_detected: Object.values(this.state.seatMovementStates).filter((s) => s.occupied).length,
        total_seats_monitored: Object.keys(this.state.seatMovementStates).length,
        occupancy_rate: Object.keys(this.state.seatMovementStates).length
          ? Object.values(this.state.seatMovementStates).filter((s) => s.occupied).length / Object.keys(this.state.seatMovementStates).length
          : 0,
        seat_status: this.state.seatMovementStates,
        has_movement_violation: hasMovementViolation
      },
      recent_alerts: alerts,
      suspension_recommendations: recommendations,
      recent_transcripts: recentTranscripts,
      national_development_summary: aiService.generateLiveSummary(
        this.state.currentBill,
        recentTranscripts,
        sessionService.getConfig().topics
      ),
      ai_modules_health: {
        speech_recognition: "ACTIVE",
        nlp_agenda_analysis: "ACTIVE",
        emotion_detection: "ACTIVE",
        offensive_detection: "ACTIVE",
        computer_vision: "ACTIVE",
        noise_analysis: "ACTIVE",
        rule_engine: "ACTIVE",
        database_storage: "ACTIVE"
      }
    };
  }

  private evaluateRules(aiOutput: any, activeMember: MemberEntity, speakingTime: number, nowStr: string, emotionRes: any, hasWellRush: boolean) {
    const warningTime = (activeMember.allocated_time_seconds || 300) * 0.85;

    // An active emergency must not be re-broadcast every tick; only fire once
    // until it is acknowledged/reset.
    const emergencyAlreadyActive = alertRepository.getCachedAlerts().some(
      (a) => a.rule_id === "RULE_8_EMERGENCY_BUTTON" && a.status === "ACTIVE"
    );
    if (aiOutput.emergency && !emergencyAlreadyActive) {
      alertRepository.save({
        alert_id: `ALT-EMG-${Date.now()}`,
        session_id: this.state.sessionId,
        member_id: activeMember.member_id,
        seat_id: activeMember.seat_id,
        rule_id: "RULE_8_EMERGENCY_BUTTON",
        type: "EMERGENCY_ACTIVATED",
        severity: "CRITICAL",
        alert_level: 3,
        title: "CRITICAL EMERGENCY IN CHAMBER",
        description: `Emergency alert initiated by ${this.state.emergencySource || "Console Button"}. Immediate marshal intervention required.`,
        member_audio_message: "A chamber emergency has been declared. Please remain at your seat and follow marshal instructions.",
        suspension_recommended: false,
        source_module: "Emergency Console",
        status: "ACTIVE"
      });
    }

    if (aiOutput.offensive && (Boolean(aiOutput.transcript?.trim()) || this.state.forcedEvent === "OFFENSIVE") && !this.shouldThrottle("RULE_5_OFFENSIVE_LANGUAGE", 30000)) {
      const alertId = `ALT-OFF-${Date.now()}`;
      const wordList = aiOutput.flagged_words.length > 0 ? ` ('${aiOutput.flagged_words.join(", ")}')` : "";
      alertRepository.save({
        alert_id: alertId,
        session_id: this.state.sessionId,
        member_id: activeMember.member_id,
        seat_id: activeMember.seat_id,
        rule_id: "RULE_5_OFFENSIVE_LANGUAGE",
        type: "UNPARLIAMENTARY_LANGUAGE",
        severity: "CRITICAL",
        alert_level: 3,
        title: "Unparliamentary Language Detected",
        description: `Offensive or expungable remark${wordList} detected. Rule Engine recommends suspension review.`,
        member_audio_message: "You have used unparliamentary language. This has been recorded. Please maintain decorum.",
        suspension_recommended: true,
        source_module: "NLP Lexical Analyzer",
        status: "ACTIVE"
      });
      this.recordDisciplinaryEvent(activeMember, alertId, "OFFENSIVE_LANGUAGE", 10);
    }

    if (aiOutput.transcript?.trim() && aiOutput.agenda_relevance < (rulesConfig?.thresholds?.agenda_similarity_min || 0.38) && speakingTime > 30 && !this.shouldThrottle("RULE_3_OFF_TOPIC", 30000)) {
      const alertId = `ALT-TOP-${Date.now()}`;
      const relPct = Math.round(aiOutput.agenda_relevance * 100);
      alertRepository.save({
        alert_id: alertId,
        session_id: this.state.sessionId,
        member_id: activeMember.member_id,
        seat_id: activeMember.seat_id,
        rule_id: "RULE_3_OFF_TOPIC",
        type: "OFF_TOPIC_SPEECH",
        severity: "MEDIUM",
        alert_level: 2,
        title: "Speech Deviating from Active Agenda",
        description: `Current speech relevance is ${relPct}%, below the configured threshold. NLP classifier flagged this segment as off-topic.`,
        member_audio_message: `Your speech is ${relPct} percent relevant to the active agenda. Please return to the parliamentary agenda.`,
        suspension_recommended: false,
        source_module: "Trained Agenda Classifier",
        status: "ACTIVE"
      });
      this.recordDisciplinaryEvent(activeMember, alertId, "OFF_TOPIC_SPEECH", 10);
    }

    if (emotionRes.isHeated && aiOutput.transcript?.trim() && !this.shouldThrottle("RULE_4_HEATED_DEBATE", 30000)) {
      const alertId = `ALT-EMT-${Date.now()}`;
      alertRepository.save({
        alert_id: alertId,
        session_id: this.state.sessionId,
        member_id: activeMember.member_id,
        seat_id: activeMember.seat_id,
        rule_id: "RULE_4_HEATED_DEBATE",
        type: "HEATED_DEBATE",
        severity: "MEDIUM",
        alert_level: 2,
        title: "Heated Debate Tone Detected",
        description: `The speech and acoustic analysis detected an elevated ${emotionRes.label.toLowerCase()} tone.`,
        member_audio_message: "Please maintain parliamentary language and tone.",
        suspension_recommended: false,
        source_module: "Emotion Classifier",
        status: "ACTIVE"
      });
      this.recordDisciplinaryEvent(activeMember, alertId, "HEATED_DEBATE", 10);
    }

    const highNoise = aiOutput.noise_level >= (rulesConfig?.thresholds?.noise_high_db || 82);
    if (!highNoise) this.state.noiseEpisodeStage = 0;
    if (highNoise && this.state.noiseEpisodeStage === 0) {
      this.state.noiseEpisodeStage = 1;
      const alertId = `ALT-NSE-W-${Date.now()}`;
      alertRepository.save({
        alert_id: alertId,
        session_id: this.state.sessionId,
        member_id: activeMember.member_id,
        seat_id: activeMember.seat_id,
        rule_id: "RULE_2_HIGH_NOISE",
        type: "CHAMBER_HIGH_NOISE",
        severity: "LOW",
        alert_level: 1,
        title: "High Acoustic Noise — First Warning",
        description: `Chamber noise reached ${aiOutput.noise_level} dB. This is the first warning; please lower voices.`,
        member_audio_message: "The chamber noise level is too high. Please maintain decorum and lower your voice.",
        suspension_recommended: false,
        source_module: "Acoustic Sensor",
        status: "ACTIVE"
      });
      this.recordDisciplinaryEvent(activeMember, alertId, "NOISE_WARNING", 5);
    } else if (highNoise && this.state.noiseEpisodeStage === 1) {
      this.state.noiseEpisodeStage = 2;
      const alertId = `ALT-NSE-V-${Date.now()}`;
      alertRepository.save({
        alert_id: alertId,
        session_id: this.state.sessionId,
        member_id: activeMember.member_id,
        seat_id: activeMember.seat_id,
        rule_id: "RULE_2_HIGH_NOISE",
        type: "CHAMBER_HIGH_NOISE",
        severity: "HIGH",
        alert_level: 2,
        title: "High Acoustic Noise — Violation",
        description: `Chamber noise remained above ${rulesConfig?.thresholds?.noise_high_db || 82} dB after the warning.`,
        member_audio_message: "The chamber noise is still too high. This has been recorded as a violation.",
        suspension_recommended: false,
        source_module: "Acoustic Sensor",
        status: "ACTIVE"
      });
      this.recordDisciplinaryEvent(activeMember, alertId, "HIGH_NOISE", 10);
    }

    if (aiOutput.multiple_speakers && !this.shouldThrottle("RULE_6_MULTIPLE_SPEAKERS", 45000)) {
      const alertId = `ALT-MUL-${Date.now()}`;
      alertRepository.save({
        alert_id: alertId,
        session_id: this.state.sessionId,
        member_id: activeMember.member_id,
        seat_id: activeMember.seat_id,
        rule_id: "RULE_6_MULTIPLE_SPEAKERS",
        type: "SIMULTANEOUS_SPEAKERS",
        severity: "HIGH",
        alert_level: 2,
        title: "Simultaneous Floor Interruptions",
        description: "Multiple members speaking concurrently without Speaker recognition.",
        member_audio_message: "Only one member may speak at a time. Please wait for floor recognition.",
        suspension_recommended: false,
        source_module: "Disruption & Multi-Mic Analyzer",
        status: "ACTIVE"
      });
      this.recordDisciplinaryEvent(activeMember, alertId, "INTERRUPTION", 10);
    }

    if (hasWellRush && !this.shouldThrottle("RULE_7_UNAUTHORIZED_MOVEMENT", 45000)) {
      // Attribute the displacement to the ACTUAL seat caught by vision instead
      // of a hardcoded member/seat placeholder.
      const wellRushEntry = Object.entries(this.state.seatMovementStates).find(([, s]) => s.movementStatus.includes("Well Rush"));
      const movedSeatId = wellRushEntry?.[0] || activeMember.seat_id;
      const movedMember = memberService.getCachedAll().find((m) => m.seat_id === movedSeatId) || activeMember;
      const alertId = `ALT-MOV-${Date.now()}`;
      alertRepository.save({
        alert_id: alertId,
        session_id: this.state.sessionId,
        member_id: movedMember.member_id,
        seat_id: movedSeatId,
        rule_id: "RULE_7_UNAUTHORIZED_MOVEMENT",
        type: "UNAUTHORIZED_MOVEMENT",
        severity: "MEDIUM",
        alert_level: 2,
        title: "Unauthorized Displacement Detected",
        description: `Computer vision detected member leaving assigned seat zone (${movedSeatId}).`,
        member_audio_message: "Please return to your assigned seat immediately. Unauthorized movement has been recorded.",
        suspension_recommended: false,
        source_module: "YOLO Computer Vision",
        status: "ACTIVE"
      });
      this.recordDisciplinaryEvent(movedMember, alertId, "UNAUTHORIZED_MOVEMENT", 10);
    }

    const warnKey = `${activeMember.member_id}_TIME_WARNING`;
    if (
      !this.triggeredSpeakerAlerts.has(warnKey) &&
      speakingTime >= warningTime &&
      speakingTime < (activeMember.allocated_time_seconds || 300)
    ) {
      this.triggeredSpeakerAlerts.add(warnKey);
      const remaining = Math.max(0, (activeMember.allocated_time_seconds || 300) - speakingTime);
      const alertId = `ALT-TIM-W-${Date.now()}`;
      alertRepository.save({
        alert_id: alertId,
        session_id: this.state.sessionId,
        member_id: activeMember.member_id,
        seat_id: activeMember.seat_id,
        rule_id: "RULE_1_SPEAKING_TIME_WARNING",
        type: "SPEAKING_TIME_WARNING",
        severity: "LOW",
        alert_level: 1,
        title: "Speaking Time Approaching Limit",
        description: `${activeMember.name} has ${remaining}s remaining of allocated floor time.`,
        member_audio_message: `Your speaking time is almost over. You have approximately ${remaining} seconds remaining. Please begin to conclude your speech.`,
        suspension_recommended: false,
        source_module: "Floor Timer",
        status: "ACTIVE"
      });
      this.recordDisciplinaryEvent(activeMember, alertId, "SPEAKING_TIME_WARNING", 5);
    }

    const excKey = `${activeMember.member_id}_TIME_EXCEEDED`;
    if (
      !this.triggeredSpeakerAlerts.has(excKey) &&
      speakingTime > (activeMember.allocated_time_seconds || 300)
    ) {
      this.triggeredSpeakerAlerts.add(excKey);
      const alertId = `ALT-TIM-${Date.now()}`;
      const diff = speakingTime - (activeMember.allocated_time_seconds || 300);
      alertRepository.save({
        alert_id: alertId,
        session_id: this.state.sessionId,
        member_id: activeMember.member_id,
        seat_id: activeMember.seat_id,
        rule_id: "RULE_1_SPEAKING_TIME",
        type: "SPEAKING_TIME_EXCEEDED",
        severity: "MEDIUM",
        alert_level: 2,
        title: "Allocated Floor Time Exceeded",
        description: `Member has exceeded the allowed speaking limit by ${diff} seconds.`,
        member_audio_message: "Your allocated speaking time has been exceeded. Please conclude your speech now.",
        suspension_recommended: false,
        source_module: "Floor Timer",
        status: "ACTIVE"
      });
      this.recordDisciplinaryEvent(activeMember, alertId, "SPEAKING_TIME", 10);
    }
  }

  private recordDisciplinaryEvent(member: MemberEntity, alertId: string, category: string, penalty: number) {
    const bucket = Math.floor(Date.now() / 10000);
    const key = `${member.member_id}:${category}:${bucket}`;
    if (this.disciplinaryEventKeys.has(key)) return;
    this.disciplinaryEventKeys.add(key);
    alertRepository.insertViolation(alertId, member.member_id, category, penalty);
    const current = memberService.getCachedMember(member.member_id);
    if (!current) return;
    if (penalty === 5) current.warnings_count = (current.warnings_count || 0) + 1;
    else current.violations_count = (current.violations_count || 0) + 1;
    memberService.update(member.member_id, { warnings_count: current.warnings_count, violations_count: current.violations_count });
    if ((current.violations_count || 0) >= 3) {
      const existing = alertRepository.getCachedAlerts().some(a => a.member_id === current.member_id && a.rule_id === "RULE_9_SUSPENSION_REVIEW" && a.status === "ACTIVE");
      if (!existing) {
        alertRepository.save({
          alert_id: `ALT-SUS-${current.member_id}-${Date.now()}`,
          session_id: this.state.sessionId,
          member_id: current.member_id,
          seat_id: current.seat_id,
          rule_id: "RULE_9_SUSPENSION_REVIEW",
          type: "SUSPENSION_RECOMMENDED",
          severity: "CRITICAL",
          alert_level: 3,
          title: "Three Violations Reached — Suspension Review Required",
          description: `${current.name} has reached ${current.violations_count} violations. Speaker review is required to suspend the member.`,
          suspension_recommended: true,
          source_module: "Central Discipline Counter",
          status: "ACTIVE"
        });
      }
    }
  }

  private startTicker() {
    if (this.tickerInterval) clearInterval(this.tickerInterval);
    this.tickerInterval = setInterval(() => {
      if (this.activeWsClients.size > 0) {
        this.broadcast();
      }
    }, 1000);
  }
}

export const telemetryService = new TelemetryService();
