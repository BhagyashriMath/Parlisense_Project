import { db } from "../database/db";
import { memberRepository } from "./member.repository";
import { sessionRepository } from "./session.repository";

export class ScorecardRepository {
  public async saveScorecard(scorecard: any, sessionId: string): Promise<void> {
    const id = `SC-${sessionId}-${scorecard.member_id}`;
    const now = new Date().toISOString();
    await db.run(`
      INSERT INTO scorecards (id, session_id, member_id, score, payload, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET
        score = excluded.score,
        payload = excluded.payload
    `, [id, sessionId, scorecard.member_id, scorecard.overall_score || 90, JSON.stringify(scorecard), now]);
  }

  public async getScorecard(memberId: string, sessionId?: string, speakingTimeSeconds = 0): Promise<any | undefined> {
    const member = (await memberRepository.findById(memberId)) || memberRepository.getCachedMembers().find(m => m.member_id === memberId);
    if (this.isPresidingOfficer(member)) return undefined;

    const liveEventsRow = await db.get<{ count: string | number }>("SELECT COUNT(*) AS count FROM violations WHERE member_id = ?", [memberId]);
    const liveSpeechesRow = await db.get<{ count: string | number }>("SELECT COUNT(*) AS count FROM transcripts WHERE member_id = ?", [memberId]);
    const liveEvents = Number(liveEventsRow?.count || 0);
    const liveSpeeches = Number(liveSpeechesRow?.count || 0);

    if (liveEvents > 0 || liveSpeeches > 0) return this.getMemberScorecard(memberId, speakingTimeSeconds);
    const sql = sessionId
      ? `SELECT payload FROM scorecards WHERE member_id = ? AND session_id = ? ORDER BY created_at DESC LIMIT 1`
      : `SELECT payload FROM scorecards WHERE member_id = ? ORDER BY created_at DESC LIMIT 1`;
    const params = sessionId ? [memberId, sessionId] : [memberId];
    const row = await db.get<{ payload: string }>(sql, params);
    if (row) {
      const scorecard = JSON.parse(row.payload);
      const deductions = scorecard.negative_deductions;
      if (deductions && deductions.total_negative_deductions == null) {
        deductions.total_negative_deductions = deductions.total_penalties_deduction ?? 0;
      }
      return scorecard;
    }

    return this.getMemberScorecard(memberId, speakingTimeSeconds);
  }

  /** The presiding officer chairs the chamber and is never scored. */
  private isPresidingOfficer(member: any): boolean {
    const role = (member?.role || "").toLowerCase();
    const isSpeakerRole = role === "speaker" || role.includes("presiding") || role.includes("chair");
    const isSpeakerId = /^SP\d+$/i.test(member?.member_id || "");
    return isSpeakerRole || isSpeakerId;
  }

  public async getMemberScorecard(memberId: string, speakingTimeSeconds = 0): Promise<any | null> {
    const member = (await memberRepository.findById(memberId)) || memberRepository.getCachedMembers().find(m => m.member_id === memberId);
    if (this.isPresidingOfficer(member)) return null;
    const speechCountRow = await db.get<{ count: string | number }>("SELECT COUNT(*) AS count FROM transcripts WHERE member_id = ?", [memberId]);
    const speechCount = Number(speechCountRow?.count || 0);
    const events = await db.all<{ category: string; penalty_points: number }>("SELECT category, penalty_points FROM violations WHERE member_id = ?", [memberId]);
    const relevanceRow = await db.get<{ avg: number }>("SELECT AVG(relevance) AS avg FROM transcripts WHERE member_id = ?", [memberId]);
    const warnings = events.filter((e) => Number(e.penalty_points) === 5).length;
    const violations = events.filter((e) => Number(e.penalty_points) >= 10).length;
    const agendaRelevance = Math.round(Number(relevanceRow?.avg || 0) * 100);
    const agendaPoints = Math.min(25, Math.round(agendaRelevance * 0.25));
    const constructivePoints = Math.min(20, speechCount * 4);
    const discussionPoints = Math.min(20, speechCount * 3);
    const decorumBonus = Math.max(0, 15 - events.length);
    const participationBase = Math.min(20, Math.max(10, speechCount * 5));
    const positive = Math.min(100, agendaPoints + constructivePoints + discussionPoints + decorumBonus + participationBase);
    const penalties = events.reduce((sum, e) => sum + (Number(e.penalty_points) || 0), 0);
    const deductionCategories: Record<string, string> = {
      SPEAKING_TIME: "speaking_time_overage_deduction",
      SPEAKING_TIME_WARNING: "speaking_time_overage_deduction",
      OFF_TOPIC_SPEECH: "off_topic_speech_deduction",
      INTERRUPTION: "interruptions_cross_talk_deduction",
      UNAUTHORIZED_MOVEMENT: "disruptive_movement_deduction",
      OFFENSIVE_LANGUAGE: "offensive_language_deduction",
      HIGH_NOISE: "excessive_noise_deduction",
      NOISE_WARNING: "excessive_noise_deduction"
    };
    const negativeDeductions: Record<string, number> = {
      speaking_time_overage_deduction: 0,
      off_topic_speech_deduction: 0,
      interruptions_cross_talk_deduction: 0,
      disruptive_movement_deduction: 0,
      offensive_language_deduction: 0,
      excessive_noise_deduction: 0,
      rule_violations_deduction: 0,
      total_negative_deductions: penalties
    };
    for (const event of events) {
      const key = deductionCategories[event.category] || "rule_violations_deduction";
      negativeDeductions[key] += Number(event.penalty_points) || 0;
    }
    const score = Math.max(0, Math.min(100, positive - penalties));
    const grade = score >= 80 ? "A (High Constructive Record)" : score >= 60 ? "B (Satisfactory Floor Record)" : "C (Decorum Concerns)";

    // Build member_summary from recent transcripts for this member
    const memberTranscripts = await db.all<{ text: string }>("SELECT text FROM transcripts WHERE member_id = ? ORDER BY created_at ASC", [memberId]);
    const speakingTurns = memberTranscripts.length;
    const discussionSummary = speakingTurns > 0
      ? `Delivered ${speakingTurns} floor intervention${speakingTurns === 1 ? "" : "s"}.`
      : "No floor speech was recorded for this member during the session.";
    // Extract major ideas from transcript texts
    const allText = memberTranscripts.map((t: { text: string }) => t.text).join(" ");
    const ideaSentences = allText
      .split(/(?<=[.!?])\s+/)
      .map((s: string) => s.trim())
      .filter((s: string) => /\b(propose|recommend|suggest|establish|create|introduce|implement)\b/i.test(s))
      .slice(0, 3);
    const policyWords: string[] = Array.from(
      new Set(
        allText.toLowerCase()
          .match(/\b(education|digital|infrastructure|governance|amendment|policy|reform|budget|broadband|curriculum)\b/g) || []
      )
    ).slice(0, 5);

    return {
      member_id: memberId,
      name: member?.name || "Honourable Member",
      seat_id: member?.seat_id || "S001",
      overall_score: score,
      score_points: { successful_speech_points: positive, warning_deductions: warnings * 5, violation_deductions: violations * 10, total: score },
      grade,
      attendance_percentage: member?.status === "ABSENT" || member?.status === "INACTIVE" ? 0 : 100,
      speaking_time_adherence: events.some((e) => e.category === "SPEAKING_TIME") ? 0 : 100,
      agenda_relevance: agendaRelevance,
      categories: {
        participation: Math.min(100, speechCount > 0 ? 100 : 0),
        agenda_relevance: agendaRelevance,
        speaking_discipline: events.some((e) => e.category === "SPEAKING_TIME") ? 0 : 100,
        seat_compliance: events.some((e) => e.category === "UNAUTHORIZED_MOVEMENT") ? 0 : 100,
        decorum_discipline: Math.max(0, 100 - penalties)
      },
      positive_marks: {
        agenda_relevance_points: agendaPoints,
        constructive_proposals_points: constructivePoints,
        foundational_discussion_points: discussionPoints,
        decorum_conduct_bonus: decorumBonus,
        total_positive_marks: positive
      },
      negative_deductions: negativeDeductions,
      member_summary: {
        discussion_summary: discussionSummary,
        subject_notes_points: ideaSentences,
        major_ideas_raised: ideaSentences,
        policy_keywords: policyWords
      },
      statistics: {
        speaking_time_seconds: Math.max(0, Math.round(speakingTimeSeconds)),
        allocated_time_seconds: member?.allocated_time_seconds || 300,
        speaking_turns: speechCount,
        time_violations: events.filter((e) => e.category === "SPEAKING_TIME").length,
        seat_violations: events.filter((e) => e.category === "UNAUTHORIZED_MOVEMENT").length,
        offensive_incidents: events.filter((e) => e.category === "OFFENSIVE_LANGUAGE").length,
        interruptions: events.filter((e) => e.category === "INTERRUPTION").length,
        warnings,
        violations
      }
    };
  }

  public async saveReport(report: any, sessionId: string): Promise<void> {
    const id = report.report_id || `REP-PARL-${sessionId}`;
    const now = new Date().toISOString();
    await db.run(`
      INSERT INTO session_reports (id, session_id, payload, created_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET
        payload = excluded.payload
    `, [id, sessionId, JSON.stringify(report), now]);
  }

  public async saveSessionReport(report: any): Promise<void> {
    await this.saveReport(report, report.session_id || "PAR-2026-001");
  }

  public async getReport(sessionId?: string): Promise<any | undefined> {
    const sql = sessionId
      ? `SELECT payload FROM session_reports WHERE session_id = ? ORDER BY created_at DESC LIMIT 1`
      : `SELECT payload FROM session_reports ORDER BY created_at DESC LIMIT 1`;
    const params = sessionId ? [sessionId] : [];
    const row = await db.get<{ payload: string }>(sql, params);
    return row ? JSON.parse(row.payload) : undefined;
  }

  public async generateSessionReport(
    sessionId: string,
    topicTitle: string = "Digital Education & AI Governance Bill 2026",
    persist: boolean = true,
    memberSpeakingSeconds: Record<string, number> = {}
  ): Promise<any> {
    const { members } = await memberRepository.findAll();
    // The presiding officer chairs the chamber and is never scored.
    const scoredMembers = members.filter((m: any) => !this.isPresidingOfficer(m));
    const speaker = members.find((m: any) => this.isPresidingOfficer(m));
    const presidingOfficer = speaker?.name ? `Hon. Speaker ${speaker.name}` : "Hon. Speaker";
    const scorecards = (await Promise.all(scoredMembers.map(m =>
      this.getMemberScorecard(m.member_id, memberSpeakingSeconds[m.member_id] || 0)
    ))).filter((sc: any) => !!sc);
    const transcripts = await db.all<any>("SELECT * FROM transcripts WHERE session_id = ?", [sessionId]);
    const alerts = await db.all<any>("SELECT * FROM alerts WHERE session_id = ?", [sessionId]);
    const session = await sessionRepository.findById(sessionId);
    const startedAt = session?.started_at ? new Date(session.started_at) : undefined;
    const endedAt = session?.ended_at ? new Date(session.ended_at) : undefined;
    const sessionEnd = endedAt || new Date();
    const durationSeconds = startedAt
      ? Math.max(0, Math.floor((sessionEnd.getTime() - startedAt.getTime()) / 1000))
      : 0;
    const duration = `${String(Math.floor(durationSeconds / 3600)).padStart(2, "0")}:${String(Math.floor((durationSeconds % 3600) / 60)).padStart(2, "0")}:${String(durationSeconds % 60).padStart(2, "0")}`;
    const totalSpeakingSeconds = scorecards.reduce((sum: number, sc: any) => sum + Number(sc.statistics?.speaking_time_seconds || 0), 0);
    const activeSpeakers = new Set(transcripts.map((transcript: any) => transcript.member_id)).size;
    const agendaScores = transcripts.map((transcript: any) => Number(transcript.relevance)).filter((n: number) => Number.isFinite(n));
    const emotionDistribution = transcripts.reduce((dist: Record<string, number>, transcript: any) => {
      const emotion = transcript.emotion || "Neutral";
      dist[emotion] = (dist[emotion] || 0) + 1;
      return dist;
    }, {});

    const normalizedScorecards = scorecards.map(sc => ({
      ...sc,
      categories: sc.categories || {
        participation: sc.attendance_percentage || 0,
        agenda_relevance: sc.agenda_relevance || 0,
        speaking_discipline: sc.speaking_time_adherence || 0,
        seat_compliance: 0,
        decorum_discipline: 0
      }
    }));

    const report = {
      report_id: `REP-PARL-${sessionId}`,
      session_id: sessionId,
      session_title: topicTitle,
      generated_at: new Date().toISOString(),
      certified_at: new Date().toISOString(),
      presiding_officer: presidingOfficer,
      total_members_participating: scoredMembers.length,
      chamber_decorum_score: alerts.length
        ? Math.max(0, Math.round((1 - alerts.length / Math.max(1, scoredMembers.length * 5)) * 1000) / 10)
        : 100,
      total_speeches_delivered: transcripts.length,
      session_information: {
        session_id: sessionId,
        date: session?.session_date || "Unavailable",
        start_time: startedAt?.toLocaleTimeString() || "Unavailable",
        end_time: endedAt?.toLocaleTimeString() || (session?.status === "LIVE" ? "In progress" : "Unavailable"),
        duration,
        agenda_bill: topicTitle,
        presiding_officer: presidingOfficer
      },
      session_statistics: {
        total_members_registered: scoredMembers.length,
        total_members_present: scoredMembers.filter((member: any) => member.status !== "ABSENT" && member.status !== "INACTIVE").length,
        total_active_speakers: activeSpeakers,
        total_speaking_time_minutes: Math.round(totalSpeakingSeconds / 60),
        total_alerts_issued: alerts.length,
        critical_violations: alerts.filter((a: any) => a.severity === "CRITICAL").length,
        high_severity_alerts: alerts.filter((a: any) => a.severity === "HIGH").length,
        off_topic_incidents: alerts.filter((a: any) => a.rule_id === "RULE_3_OFF_TOPIC").length,
        offensive_language_incidents: alerts.filter((a: any) => a.rule_id === "RULE_5_OFFENSIVE_LANGUAGE").length,
        unauthorized_movement_incidents: alerts.filter((a: any) => a.rule_id === "RULE_7_UNAUTHORIZED_MOVEMENT").length,
        emergency_activations: alerts.filter((a: any) => a.rule_id === "RULE_8_EMERGENCY_BUTTON").length,
        average_ambient_noise_db: null,
        peak_noise_recorded_db: null
      },
      ai_analytics_summary: {
        average_agenda_relevance_percentage: agendaScores.length ? Math.round(agendaScores.reduce((a: number, b: number) => a + b, 0) / agendaScores.length * 10) / 10 : 0,
        emotion_distribution: emotionDistribution,
        decorum_compliance_index: alerts.length ? Math.max(0, Math.round((1 - alerts.length / Math.max(1, members.length * 5)) * 1000) / 10) : 100,
        chamber_order_rating: alerts.length ? "SATISFACTORY_WITH_ADVISORIES" : "ORDERLY"
      },
      rule_violations_log: alerts,
      member_scorecards: normalizedScorecards,
      key_resolutions: [],
      disclaimer: "This session report was automatically generated by the AI Parliamentary Decision-Support System."
    };

    // The report is only persisted when the session actually ends (persist=true).
    // Views (getReport / getCompleteSummary) generate a read-only snapshot so a
    // user simply watching the live dashboard never flushes a premature report.
    if (persist) {
      await this.saveReport(report, sessionId);
    }
    return report;
  }
}

export const scorecardRepository = new ScorecardRepository();
