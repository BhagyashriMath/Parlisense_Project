import fs from "fs";
import { DATA_DIR, RUNTIME_STATE_PATH } from "../config";
import { sessionRepository } from "../repositories/session.repository";
import { scorecardRepository } from "../repositories/scorecard.repository";
import { memberRepository } from "../repositories/member.repository";
import { auditRepository } from "../repositories/audit.repository";
import { notificationRepository } from "../repositories/notification.repository";
import { alertRepository } from "../repositories/alert.repository";
import { db } from "../database/db";
import { SessionConfig, SessionTopic, SessionTimelineEvent } from "../models";

export class SessionService {
  private config: SessionConfig;
  private timeline: SessionTimelineEvent[] = [];

  
  constructor() {
    this.config = {
      session_id: "PAR-2026-001",
      session_date: new Date().toISOString().slice(0, 10),
      start_time: "10:00 AM",
      scheduled_end_time: "05:00 PM",
      session_type: "Regular Legislative Sitting",
      house_chamber: "Lok Sabha / Main Chamber",
      current_topic: "Digital Education & AI Governance Bill 2026",
      topics: [
        {
          topic_id: "TOPIC-01",
          title: "Digital Education Infrastructure & Rural Lab Allocation",
          description: "Discussion on clauses 1-14 regarding digital laboratories across 50,000 rural schools.",
          start_time: "10:00 AM",
          end_time: "11:30 AM",
          priority: "HIGH",
          speeches_count: 8,
          avg_relevance: 91.5,
          violations_count: 1
        },
        {
          topic_id: "TOPIC-02",
          title: "Data Sovereignty, Biometric Privacy & AI Ethics",
          description: "Clauses 15-28 regarding algorithmic auditing, biometric encryption, and data security.",
          start_time: "11:30 AM",
          end_time: "01:00 PM",
          priority: "HIGH",
          speeches_count: 6,
          avg_relevance: 89.2,
          violations_count: 2
        },
        {
          topic_id: "TOPIC-03",
          title: "Teacher Training Grants & EdTech Budget Appropriations",
          description: "Clauses 29-45 for statutory allocations to state pedagogical institutes.",
          start_time: "02:00 PM",
          end_time: "04:30 PM",
          priority: "MEDIUM",
          speeches_count: 4,
          avg_relevance: 86.0,
          violations_count: 0
        }
      ],
      timings: {
        session_start_time: "10:00 AM",
        session_end_time: "05:00 PM",
        max_speaking_time_seconds: 300,
        warning_time_seconds: 240,
        break_periods: "01:00 PM - 02:00 PM (Lunch Break)",
        total_expected_duration: "7 Hours"
      },
      rules: {
        max_speaking_time_seconds: 300,
        warning_time_seconds: 240,
        noise_threshold_db: 78,
        agenda_relevance_threshold: 45,
        multiple_speaker_threshold_ms: 500,
        seat_compliance_enabled: true,
        offensive_language_detection: true,
        movement_rules_enabled: true,
        rules_list: [
          { id: "RULE_1_SPEAKING_TIME", name: "Speaking Time Exceeded", description: "Enforces 5-minute floor cap with 4-minute warning.", severity: "LOW", penalty_points: 5, enabled: true },
          { id: "RULE_2_HIGH_NOISE", name: "Acoustic Decibel Threshold", description: "Triggers alert when ambient chamber noise exceeds configured threshold.", severity: "HIGH", penalty_points: 10, enabled: true },
          { id: "RULE_3_OFF_TOPIC", name: "Agenda Relevance Analysis", description: "NLP similarity comparison against active session topic.", severity: "MEDIUM", penalty_points: 8, enabled: true },
          { id: "RULE_4_HEATED_DEBATE", name: "Floor Agitation & Tone", description: "Linguistic and acoustic sentiment classification.", severity: "MEDIUM", penalty_points: 6, enabled: true },
          { id: "RULE_5_OFFENSIVE_LANGUAGE", name: "Unparliamentary Lexicon", description: "Automated flagging of banned unparliamentary terms.", severity: "CRITICAL", penalty_points: 15, enabled: true },
          { id: "RULE_6_MULTIPLE_SPEAKERS", name: "Simultaneous Floor Cross-Talk", description: "Detection of simultaneous microphone activity.", severity: "HIGH", penalty_points: 10, enabled: true },
          { id: "RULE_7_UNAUTHORIZED_MOVEMENT", name: "Seat Zone Compliance", description: "Computer vision detection of member displacement or well-rush.", severity: "HIGH", penalty_points: 12, enabled: true },
          { id: "RULE_8_EMERGENCY_BUTTON", name: "Presiding Emergency Protocol", description: "Manual physical console or UI emergency dispatch.", severity: "CRITICAL", penalty_points: 25, enabled: true }
        ]
      },
      status: "CONFIGURING",
      is_locked: false
    };

    this.timeline = [
      {
        id: "tl-01",
        timestamp: "10:00:00",
        time_formatted: "10:00:00 AM",
        title: "Session Formally Commenced",
        description: "Session called to order by Presiding Officer. All 8 AI decision subsystems verified operational.",
        type: "START"
      },
      {
        id: "tl-02",
        timestamp: "10:02:14",
        time_formatted: "10:02:14 AM",
        title: "Dr. Rajeshwar Sharma Recognized on Floor",
        description: "Minister of Education opened the debate on Topic 01.",
        type: "SPEECH",
        member_id: "M001"
      }
    ];

    try {
      if (fs.existsSync(RUNTIME_STATE_PATH)) {
        const persisted = JSON.parse(fs.readFileSync(RUNTIME_STATE_PATH, "utf-8"));
        if (persisted?.config) {
          this.config = {
            ...this.config,
            ...persisted.config,
            status: "CONFIGURING",
            is_locked: false
          };
        }
      }
    } catch (_) {}
  }

  getConfig(): SessionConfig {
    return this.config;
  }

  updateConfig(updates: Partial<SessionConfig>): SessionConfig {
    this.config = { ...this.config, ...updates };
    this.persistRuntime();
    return this.config;
  }

  getTopics(): SessionTopic[] {
    return this.config.topics;
  }

  addTopic(topic: Partial<SessionTopic>): SessionTopic {
    const newTopic: SessionTopic = {
      topic_id: `TOPIC-${String(this.config.topics.length + 1).padStart(2, "0")}`,
      title: topic.title || "Legislative Consideration",
      description: topic.description || "",
      start_time: topic.start_time || "10:00 AM",
      end_time: topic.end_time || "12:00 PM",
      priority: topic.priority || "MEDIUM",
      speeches_count: 0,
      avg_relevance: 90.0,
      violations_count: 0
    };
    this.config.topics.push(newTopic);
    this.persistRuntime();
    return newTopic;
  }

  deleteTopic(id: string): boolean {
    const prevLen = this.config.topics.length;
    this.config.topics = this.config.topics.filter(t => t.topic_id !== id);
    if (this.config.topics.length !== prevLen) {
      this.persistRuntime();
      return true;
    }
    return false;
  }

  getTimeline(): SessionTimelineEvent[] {
    return this.timeline;
  }

  addTimelineEvent(event: Omit<SessionTimelineEvent, "id" | "timestamp" | "time_formatted">): SessionTimelineEvent {
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString();
    const entry: SessionTimelineEvent = {
      id: `tl-${Date.now()}`,
      timestamp: now.toISOString(),
      time_formatted: timeFormatted,
      ...event
    };
    this.timeline.push(entry);
    return entry;
  }

  async getReadiness() {
    const members = memberRepository.getCachedMembers().length > 0 
      ? memberRepository.getCachedMembers() 
      : await memberRepository.findAllMembers();
    const checks = {
      members_configured: members.length >= 1,
      seats_assigned: members.length > 0 && members.every((m) => !!m.seat_id),
      mics_assigned: members.length > 0 && members.every((m) => !!m.mic_id),
      cameras_assigned: members.length > 0 && members.every((m) => !!m.camera_id),
      agenda_configured: !!this.config.current_topic && this.config.topics.length > 0,
      timing_configured: !!this.config.timings.session_start_time && !!this.config.timings.session_end_time,
      rules_verified: this.config.rules.rules_list.length > 0
    };
    const missing: string[] = [];
    if (!checks.members_configured) missing.push("At least one member must be registered");
    if (!checks.seats_assigned) missing.push("All members must have seats assigned");
    if (!checks.mics_assigned) missing.push("All members must have microphones assigned");
    if (!checks.cameras_assigned) missing.push("All members must have cameras assigned");
    if (!checks.agenda_configured) missing.push("Session topic and agenda must be configured");

    return {
      is_ready: missing.length === 0,
      readiness_score: Math.round(Object.values(checks).filter(Boolean).length / Object.keys(checks).length * 100),
      missing_requirements: missing,
      checks
    };
  }

  async startSession(): Promise<{ status: string; session_id: string; is_locked: boolean }> {
    if (!this.config.session_id || !["SCHEDULED", "LIVE", "PAUSED"].includes(this.config.status)) {
      this.config.session_id = `PAR-${new Date().getFullYear()}-${Date.now()}`;
    }
    if (!this.config.current_topic) {
      this.config.current_topic = "Digital Education & AI Governance Framework Bill 2026";
    }
    if (!this.config.session_date) {
      this.config.session_date = new Date().toISOString().slice(0, 10);
    }
    this.config.status = "LIVE";
    this.config.is_locked = true;
    this.persistRuntime();

    await sessionRepository.save({
      session_id: this.config.session_id,
      title: this.config.current_topic,
      agenda: this.config.current_topic,
      session_date: this.config.session_date,
      status: "LIVE",
      started_at: new Date().toISOString()
    });

    this.addTimelineEvent({
      title: "Session Live Execution Commenced",
      description: `Session ${this.config.session_id} called to order by Presiding Officer. Monitoring active.`,
      type: "START"
    });

    await auditRepository.log("SESSION_STARTED", { session_id: this.config.session_id });

    // Ensure all members start the new sitting active and without stale suspensions
    try {
      await db.run("UPDATE members SET status = 'ACTIVE' WHERE status = 'SUSPENDED';");
      await db.run("UPDATE suspensions SET status = 'EXPIRED' WHERE status = 'CONFIRMED';");
      // Start each sitting with a clean active-alert panel while retaining prior alerts for reports/audit history.
      await db.run("UPDATE alerts SET status = 'RESOLVED' WHERE status = 'ACTIVE';");
      // Expire any unhandled emergency requests from previous sessions
      await db.run("UPDATE emergency_requests SET status = 'EXPIRED' WHERE status = 'PENDING';");
      alertRepository.setCachedAlerts([]);
      memberRepository.getCachedMembers().forEach(m => {
        m.status = "ACTIVE";
        m.violations_count = 0;
        m.warnings_count = 0;
      });
    } catch (cleanErr) {
      console.warn("[SESSION] Note resetting members on session start:", cleanErr);
    }

    // Instantly notify all members
    try {
      const members = memberRepository.getCachedMembers().length > 0 
        ? memberRepository.getCachedMembers() 
        : await memberRepository.findAllMembers();
      if (members.length > 0) {
        const notifBatch = members.map((m) => ({
          session_id: this.config.session_id,
          member_id: m.member_id,
          type: "SESSION_STARTED",
          alert_level: 1,
          title: "🏛️ SITTING COMMENCED — HOUSE IN SESSION",
          description: `House called to order on "${this.config.current_topic}". Proceedings and AI monitoring are LIVE. Seat: ${m.seat_id}.`,
          member_audio_message: "The House has been called to order. Proceedings are now live.",
          severity: "LOW" as const
        }));
        await notificationRepository.createMany(notifBatch);
      }
    } catch (_) {}

    return { status: "SESSION_STARTED", session_id: this.config.session_id, is_locked: true };
  }

  async scheduleSession(data: {
    title: string;
    agenda?: string;
    session_date: string;
    start_time: string;
    end_time: string;
    max_speaking_time_seconds?: number;
    description?: string;
    scheduled_by?: string;
  }): Promise<{
    status: string;
    session_id: string;
    scheduled_session: any;
    notifications_created: number;
  }> {
    const sessionId = `PAR-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    this.config.session_id = sessionId;
    this.config.current_topic = data.title;
    this.config.session_date = data.session_date;
    this.config.timings.session_start_time = data.start_time;
    this.config.timings.session_end_time = data.end_time;
    if (data.max_speaking_time_seconds) {
      this.config.timings.max_speaking_time_seconds = data.max_speaking_time_seconds;
      this.config.timings.warning_time_seconds = Math.round(data.max_speaking_time_seconds * 0.8);
    }
    this.config.status = "SCHEDULED";
    this.config.is_locked = false;
    this.persistRuntime();

    // Persist to database
    await sessionRepository.save({
      session_id: sessionId,
      title: data.title,
      agenda: data.agenda || data.description || data.title,
      session_date: data.session_date,
      start_time: data.start_time,
      scheduled_end_time: data.end_time,
      status: "SCHEDULED"
    });

    // Add timeline event
    this.addTimelineEvent({
      title: "Parliamentary Sitting Scheduled by Speaker",
      description: `Sitting scheduled for ${data.session_date} (${data.start_time} - ${data.end_time}) on "${data.title}" by ${data.scheduled_by || "Hon. Speaker"}.`,
      type: "SCHEDULED"
    });

    await auditRepository.log("SESSION_SCHEDULED", {
      session_id: sessionId,
      title: data.title,
      date: data.session_date,
      scheduled_by: data.scheduled_by || "Hon. Speaker"
    });

    // Create notifications for all members
    const members = memberRepository.getCachedMembers().length > 0
      ? memberRepository.getCachedMembers()
      : await memberRepository.findAllMembers();
    const notifTitle = `Upcoming Sitting: ${data.title}`;
    const notifDesc = `Hon. Speaker has scheduled a parliamentary session for ${data.session_date} from ${data.start_time} to ${data.end_time}. Please review the order of business.`;
    const audioMsg = `Notice to all Members: An upcoming parliamentary sitting on ${data.title} has been scheduled by the Honourable Speaker for ${data.session_date} at ${data.start_time}.`;

    // Prepare notifications in a single batch
    const notifBatch: any[] = [
      {
        session_id: sessionId,
        member_id: "ALL",
        type: "UPCOMING_SESSION",
        alert_level: 1,
        title: notifTitle,
        description: notifDesc,
        member_audio_message: audioMsg,
        severity: "LOW"
      }
    ];

    for (const m of members) {
      notifBatch.push({
        session_id: sessionId,
        member_id: m.member_id,
        type: "UPCOMING_SESSION",
        alert_level: 1,
        title: notifTitle,
        description: `Sitting on "${data.title}" scheduled for ${data.session_date} (${data.start_time} - ${data.end_time}). Designated Seat: ${m.seat_id}.`,
        member_audio_message: audioMsg,
        severity: "LOW"
      });
    }

    await notificationRepository.createMany(notifBatch);

    return {
      status: "SESSION_SCHEDULED",
      session_id: sessionId,
      scheduled_session: this.getScheduledSession(),
      notifications_created: notifBatch.length
    };
  }

  getScheduledSession() {
    return {
      session_id: this.config.session_id,
      title: this.config.current_topic,
      session_date: this.config.session_date,
      start_time: this.config.timings.session_start_time,
      end_time: this.config.timings.session_end_time,
      max_speaking_time_seconds: this.config.timings.max_speaking_time_seconds,
      status: this.config.status,
      is_locked: this.config.is_locked
    };
  }

  async pauseSession(): Promise<{ status: string; session_id: string }> {
    this.config.status = "PAUSED";
    this.persistRuntime();

    this.addTimelineEvent({
      title: "House Sitting Temporarily Paused",
      description: `Session ${this.config.session_id} paused by Presiding Officer. Monitoring paused.`,
      type: "ALERT"
    });

    await auditRepository.log("SESSION_PAUSED", { session_id: this.config.session_id });
    return { status: "SESSION_PAUSED", session_id: this.config.session_id };
  }

  async resumeSession(): Promise<{ status: string; session_id: string }> {
    this.config.status = "LIVE";
    this.persistRuntime();

    this.addTimelineEvent({
      title: "House Sitting Resumed",
      description: `Session ${this.config.session_id} resumed by Presiding Officer. Monitoring active.`,
      type: "START"
    });

    await auditRepository.log("SESSION_RESUMED", { session_id: this.config.session_id });
    return { status: "SESSION_RESUMED", session_id: this.config.session_id };
  }

  async stopSession(memberSpeakingSeconds: Record<string, number> = {}): Promise<{ status: string; session_id: string }> {
    this.config.status = "ENDED";
    this.config.is_locked = false;
    this.persistRuntime();

    await sessionRepository.save({
      session_id: this.config.session_id,
      title: this.config.current_topic,
      agenda: this.config.current_topic,
      session_date: this.config.session_date,
      status: "ENDED",
      ended_at: new Date().toISOString()
    });

    this.addTimelineEvent({
      title: "Session Formally Concluded",
      description: `Session ${this.config.session_id} adjourned by Speaker. Post-session scorecards and official summary generated.`,
      type: "END"
    });

    await auditRepository.log("SESSION_STOPPED", { session_id: this.config.session_id });

    try {
      await db.run("UPDATE emergency_requests SET status = 'EXPIRED' WHERE session_id = ? AND status = 'PENDING';", [this.config.session_id]);
    } catch (_) {}

    try {
      await scorecardRepository.generateSessionReport(
        this.config.session_id,
        this.config.current_topic,
        true,
        memberSpeakingSeconds
      );
    } catch (e) {
      console.error("[SESSION] Error generating report upon session stop:", e);
    }

    return { status: "SESSION_STOPPED", session_id: this.config.session_id };
  }

  private persistRuntime() {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(RUNTIME_STATE_PATH, JSON.stringify({
        members: memberRepository.getCachedMembers(),
        config: this.config,
        saved_at: new Date().toISOString()
      }, null, 2));
    } catch (e) {
      console.error("[SESSION] Could not persist runtime state:", e);
    }
  }
}

export const sessionService = new SessionService();
