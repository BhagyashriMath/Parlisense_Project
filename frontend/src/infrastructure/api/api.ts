import {
  SessionTelemetry,
  MemberScorecard,
  SessionReport,
  Member,
  SessionConfig,
  PreSessionCheckResult,
  CompleteSessionSummary,
  TimelineEvent,
  AgendaTopic,
  NationalDevelopmentSummary,
  EmergencyExitRequest
} from "../../shared/types";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

/**
 * Empty means same-origin, which keeps the single-service local/Render setup
 * working. Vercel can set these values to the deployed API and WebSocket URLs.
 */
export const API_BASE = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL || "");
const WS_BASE = trimTrailingSlash(import.meta.env.VITE_WS_URL || "");

function authHeaders(json = false): Record<string, string> {
  const token = typeof window !== "undefined" ? sessionStorage.getItem("parlisense_token") : null;
  // Also read the stored auth session so the backend's dev-header fallback works
  // when a JWT has not been issued (e.g. members who registered via the UI form).
  let roleHeader: Record<string, string> = {};
  try {
    const saved = typeof window !== "undefined"
      ? (sessionStorage.getItem("parlisense_auth_user") || localStorage.getItem("parlisense_auth_user"))
      : null;
    if (saved && !token) {
      const parsed = JSON.parse(saved) as { role?: string; memberId?: string };
      if (parsed.role) {
        roleHeader["x-session-role"] = parsed.role;
        if (parsed.memberId) roleHeader["x-member-id"] = parsed.memberId;
      }
    }
  } catch (_) {}
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...roleHeader
  };
}

function sessionWebSocketUrl(): string {
  if (WS_BASE) return `${WS_BASE}/ws/session`;
  if (API_BASE) {
    const apiUrl = new URL(API_BASE);
    apiUrl.protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
    apiUrl.pathname = `${apiUrl.pathname.replace(/\/$/, "")}/ws/session`;
    return apiUrl.toString();
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host || "localhost:3000"}/ws/session`;
}

export async function fetchCurrentSession(): Promise<SessionTelemetry> {
  const res = await fetch(`${API_BASE}/api/session/current`);
  if (!res.ok) throw new Error("Failed to fetch session telemetry");
  return res.json();
}

export async function fetchSessionConfig(): Promise<{ config: SessionConfig; readiness: PreSessionCheckResult }> {
  const res = await fetch(`${API_BASE}/api/session/config`);
  if (!res.ok) throw new Error("Failed to fetch session configuration");
  return res.json();
}

export async function updateSessionConfig(config: Partial<SessionConfig>): Promise<{ status: string; config: SessionConfig }> {
  const res = await fetch(`${API_BASE}/api/session/config`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(config)
  });
  if (!res.ok) throw new Error("Failed to update session configuration");
  return res.json();
}

export async function fetchMembers(): Promise<{ members: Member[] }> {
  const res = await fetch(`${API_BASE}/api/members`);
  if (!res.ok) throw new Error("Failed to fetch members");
  const data = await res.json();
  if (Array.isArray(data)) {
    return { members: data };
  }
  return { members: data.members || [], ...data };
}

export async function createMember(member: Partial<Member>): Promise<{ status: string; member: Member }> {
  const res = await fetch(`${API_BASE}/api/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(member)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || "Failed to create member");
  }
  const data = await res.json();
  const memberObj: Member = data.member || data;
  return { status: data.status || "MEMBER_CREATED", member: memberObj, ...data };
}

export async function updateMember(memberId: string, updates: Partial<Member>): Promise<{ status: string; member: Member }> {
  const res = await fetch(`${API_BASE}/api/members/${memberId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || "Failed to update member");
  }
  const data = await res.json();
  const memberObj: Member = data.member || data;
  return { status: data.status || "MEMBER_UPDATED", member: memberObj, ...data };
}

export async function deleteMember(memberId: string): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/api/members/${memberId}`, {
    method: "DELETE"
  });
  if (!res.ok) throw new Error("Failed to delete member");
  return res.json();
}

export async function assignSeat(memberId: string, seatId: string): Promise<{ status: string; member: Member }> {
  const res = await fetch(`${API_BASE}/api/members/${memberId}/assign-seat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seat_id: seatId })
  });
  if (!res.ok) throw new Error("Failed to assign seat");
  return res.json();
}

export async function assignMic(memberId: string, micId: string): Promise<{ status: string; member: Member }> {
  const res = await fetch(`${API_BASE}/api/members/${memberId}/assign-mic`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mic_id: micId })
  });
  if (!res.ok) throw new Error("Failed to assign microphone");
  return res.json();
}

export async function addOrUpdateTopic(topic: AgendaTopic): Promise<{ status: string; topics: AgendaTopic[] }> {
  const res = await fetch(`${API_BASE}/api/session/topics`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(topic)
  });
  if (!res.ok) throw new Error("Failed to save topic");
  return res.json();
}

export async function deleteTopic(topicId: string): Promise<{ status: string; topics: AgendaTopic[] }> {
  const res = await fetch(`${API_BASE}/api/session/topics/${topicId}`, {
    method: "DELETE",
    headers: authHeaders(true)
  });
  if (!res.ok) throw new Error("Failed to delete topic");
  return res.json();
}

export async function fetchMemberScorecard(memberId: string): Promise<MemberScorecard> {
  const res = await fetch(`${API_BASE}/api/members/${memberId}/scorecard`);
  if (!res.ok) throw new Error("Failed to fetch scorecard");
  return res.json();
}

export function normalizeSessionReport(raw: any): SessionReport {
  if (!raw) {
    throw new Error("Empty session report received");
  }

  const sessId = raw.session_information?.session_id || raw.session_id || "Unavailable";
  const rawDate = raw.session_information?.date || raw.session_date || "Unavailable";
  const presiding = raw.session_information?.presiding_officer || raw.presiding_officer || "Unavailable";
  const bill = raw.session_information?.agenda_bill || raw.session_title || "Unavailable";

  const rawMembers = Array.isArray(raw.member_scorecards) ? raw.member_scorecards : [];
  const memberScorecards: MemberScorecard[] = rawMembers.map((m: any) => {
    // If categories is an array or missing, build the expected object
    let categoriesObj = {
      participation: 0,
      agenda_relevance: 0,
      speaking_discipline: 0,
      seat_compliance: 0,
      decorum_discipline: 0
    };

    if (m.categories && typeof m.categories === "object" && !Array.isArray(m.categories)) {
      categoriesObj = {
        participation: m.categories.participation ?? m.attendance_percentage ?? 0,
        agenda_relevance: m.categories.agenda_relevance ?? m.agenda_relevance ?? 0,
        speaking_discipline: m.categories.speaking_discipline ?? m.speaking_time_adherence ?? 0,
        seat_compliance: m.categories.seat_compliance ?? 0,
        decorum_discipline: m.categories.decorum_discipline ?? 0
      };
    } else {
      categoriesObj = {
        participation: m.attendance_percentage ?? 0,
        agenda_relevance: m.agenda_relevance ?? 0,
        speaking_discipline: m.speaking_time_adherence ?? 0,
        seat_compliance: 0,
        decorum_discipline: 0
      };
    }

    return {
      member_id: m.member_id || "M-UNKNOWN",
      name: m.name || "Honourable Member",
      seat_id: m.seat_id || "S001",
      mic_id: m.mic_id || `MIC-${m.seat_id || "S001"}`,
      role: m.role || "Member of Parliament",
      party: m.party || "—",
      overall_score: m.overall_score ?? 0,
      grade: m.grade || (() => {
        const score = m.overall_score ?? 0;
        return score >= 90 ? "A (High Constructive Record)" : score >= 60 ? "B (Satisfactory Floor Record)" : "C (Decorum Concerns)";
      })(),
      positive_marks: m.positive_marks || {
        agenda_relevance_points: 0,
        constructive_proposals_points: 0,
        foundational_discussion_points: 0,
        decorum_conduct_bonus: 0,
        total_positive_marks: 0
      },
      negative_deductions: m.negative_deductions || {
        speaking_time_overage_deduction: 0,
        off_topic_speech_deduction: 0,
        interruptions_cross_talk_deduction: 0,
        disruptive_movement_deduction: 0,
        offensive_language_deduction: 0,
        excessive_noise_deduction: 0,
        rule_violations_deduction: 0,
        // Frontend reads total_negative_deductions everywhere; the old
        // total_penalties_deduction key was silently ignored.
        total_negative_deductions: 0
      },
      member_summary: typeof m.member_summary === "string" ? {
        discussion_summary: m.member_summary,
        subject_notes_points: [],
        major_ideas_raised: [],
        policy_keywords: []
      } : (m.member_summary || {
        discussion_summary: "No member summary is available.",
        subject_notes_points: [],
        major_ideas_raised: [],
        policy_keywords: []
      }),
      categories: categoriesObj,
      statistics: m.statistics || {
        speaking_time_seconds: m.speaking_time_seconds ?? 0,
        allocated_time_seconds: m.allocated_time_seconds ?? 0,
        speaking_turns: m.speeches_count ?? 0,
        time_violations: m.warnings_count ?? 0,
        seat_violations: 0,
        offensive_incidents: 0,
        interruptions: 0
      }
    };
  });

  return {
    report_id: raw.report_id || `REP-PARL-${sessId}`,
    generated_at: raw.generated_at || raw.certified_at || new Date().toLocaleString(),
    session_information: {
      session_id: sessId,
      date: rawDate,
      start_time: raw.session_information?.start_time || "—",
      end_time: raw.session_information?.end_time || "—",
      duration: raw.session_information?.duration || "—",
      agenda_bill: bill,
      presiding_officer: presiding
    },
    session_statistics: {
      total_members_registered: raw.session_statistics?.total_members_registered ?? memberScorecards.length,
      total_members_present: raw.session_statistics?.total_members_present ?? memberScorecards.length,
      total_active_speakers: raw.session_statistics?.total_active_speakers ?? 0,
      total_speaking_time_minutes: raw.session_statistics?.total_speaking_time_minutes ?? 0,
      total_alerts_issued: raw.session_statistics?.total_alerts_issued ?? 0,
      critical_violations: raw.session_statistics?.critical_violations ?? 0,
      high_severity_alerts: raw.session_statistics?.high_severity_alerts ?? 0,
      off_topic_incidents: raw.session_statistics?.off_topic_incidents ?? 0,
      offensive_language_incidents: raw.session_statistics?.offensive_language_incidents ?? 0,
      unauthorized_movement_incidents: raw.session_statistics?.unauthorized_movement_incidents ?? 0,
      emergency_activations: raw.session_statistics?.emergency_activations ?? 0,
      average_ambient_noise_db: raw.session_statistics?.average_ambient_noise_db ?? null,
      peak_noise_recorded_db: raw.session_statistics?.peak_noise_recorded_db ?? null
    },
    ai_analytics_summary: {
      average_agenda_relevance_percentage: raw.ai_analytics_summary?.average_agenda_relevance_percentage ?? 0,
      emotion_distribution: raw.ai_analytics_summary?.emotion_distribution || {},
      decorum_compliance_index: raw.ai_analytics_summary?.decorum_compliance_index ?? raw.chamber_decorum_score ?? 0,
      chamber_order_rating: raw.ai_analytics_summary?.chamber_order_rating || "NO_DATA"
    },
    rule_violations_log: raw.rule_violations_log || [],
    member_scorecards: memberScorecards,
    disclaimer: raw.disclaimer || "This session report was automatically generated by the AI Parliamentary Decision-Support System for administrative record and analytical review."
  };
}

export async function fetchSessionReport(): Promise<SessionReport> {
  const res = await fetch(`${API_BASE}/api/session/report`);
  if (!res.ok) throw new Error(`Failed to fetch session report (${res.status})`);
  return normalizeSessionReport(await res.json());
}

export async function fetchCompleteSessionSummary(): Promise<CompleteSessionSummary> {
  const res = await fetch(`${API_BASE}/api/session/complete-summary`);
  if (!res.ok) throw new Error("Failed to fetch complete session summary");
  return res.json();
}

export async function fetchLiveSummary(): Promise<NationalDevelopmentSummary> {
  const res = await fetch(`${API_BASE}/api/session/summary/live`);
  if (!res.ok) throw new Error("Failed to fetch live session summary");
  return res.json();
}

export async function fetchTimeline(): Promise<{ timeline: TimelineEvent[] }> {
  const res = await fetch(`${API_BASE}/api/session/timeline`);
  if (!res.ok) throw new Error("Failed to fetch session timeline");
  return res.json();
}

export async function triggerEmergency(source: string = "Dashboard Trigger"): Promise<any> {
  const res = await fetch(`${API_BASE}/api/emergency`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source })
  });
  return res.json();
}

export async function requestEmergencyExit(memberId: string, reason: string): Promise<{ status: string; request: EmergencyExitRequest }> {
  const res = await fetch(`${API_BASE}/api/emergency/requests`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ member_id: memberId, reason })
  });
  if (!res.ok) throw new Error("Failed to request emergency exit");
  return res.json();
}

export async function decideEmergencyExit(requestId: string, approved: boolean, decidedBy = "Speaker"): Promise<any> {
  const status = approved ? "APPROVED" : "REJECTED";
  const res = await fetch(`${API_BASE}/api/emergency/requests/${requestId}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, approved, decided_by: decidedBy })
  });
  if (!res.ok) throw new Error("Failed to decide emergency exit request");
  return res.json();
}

export async function resetEmergency(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/emergency/reset`, {
    method: "POST"
  });
  return res.json();
}

export async function setActiveSpeaker(memberId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/session/speaker`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify({ member_id: memberId })
  });
  if (!res.ok) throw new Error("Failed to grant the floor");
  return res.json();
}

export async function speakerMicOn(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/session/speaker-mic/on`, {
    method: "POST",
    headers: authHeaders()
  });
  if (!res.ok) throw new Error("Failed to activate speaker mic");
  return res.json();
}

export async function speakerMicOff(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/session/speaker-mic/off`, {
    method: "POST",
    headers: authHeaders()
  });
  if (!res.ok) throw new Error("Failed to deactivate speaker mic");
  return res.json();
}

export async function raiseHand(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/session/request`, {
    method: "POST",
    headers: authHeaders()
  });
  if (!res.ok) throw new Error("Failed to raise hand");
  return res.json();
}

export async function withdrawHand(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/session/request`, {
    method: "DELETE",
    headers: authHeaders()
  });
  if (!res.ok) throw new Error("Failed to withdraw hand");
  return res.json();
}

export async function rejectFloorRequest(memberId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/session/request/reject`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify({ member_id: memberId })
  });
  if (!res.ok) throw new Error("Failed to decline request");
  return res.json();
}

export async function releaseFloor(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/session/floor/release`, {
    method: "POST",
    headers: authHeaders()
  });
  if (!res.ok) throw new Error("Failed to release the floor");
  return res.json();
}

export async function fetchSpeakingRequests(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/session/requests`);
  if (!res.ok) throw new Error("Failed to fetch speaking requests");
  const data = await res.json();
  return data.requests || [];
}

export async function startSession(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/session/start`, { method: "POST", headers: authHeaders() });
  if (!res.ok) {
    throw new Error("Failed to start session");
  }
  return res.json();
}

export async function pauseSession(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/session/pause`, { method: "POST", headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to pause session");
  return res.json();
}

export async function resumeSession(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/session/resume`, { method: "POST", headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to resume session");
  return res.json();
}

export async function stopSession(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/session/stop`, { method: "POST", headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to stop session");
  return res.json();
}

export async function toggleSessionState(start: boolean): Promise<any> {
  const endpoint = start ? "/api/session/resume" : "/api/session/pause";
  const res = await fetch(`${API_BASE}${endpoint}`, { method: "POST" });
  return res.json();
}

export async function setSessionMode(mode: "LIVE" | "DEMO"): Promise<any> {
  const res = await fetch(`${API_BASE}/api/session/mode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode })
  });
  return res.json();
}

export async function acknowledgeAlert(alertId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/alerts/${alertId}/acknowledge`, {
    method: "POST"
  });
  return res.json();
}

export async function simulateAIEvent(eventType: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/ai/simulate-event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event_type: eventType })
  });
  return res.json();
}

export async function sendAudioTelemetry(decibel: number, transcriptSnippet?: string, memberId?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/ai/process-audio`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify({ db_level: decibel, transcript_snippet: transcriptSnippet, member_id: memberId })
  });
  if (!res.ok) throw new Error(`Audio telemetry failed (${res.status})`);
  return res.json();
}

export function subscribeToSessionStream(onMessage: (data: SessionTelemetry) => void): () => void {
  let eventSource: EventSource | null = null;
  let socket: WebSocket | null = null;
  let isClosed = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let lastStreamMessageAt = 0;
  let lastServerTimestamp = 0;
  let pollController: AbortController | null = null;
  const deliver = (data: SessionTelemetry, fromStream = true) => {
    if (isClosed) return;
    if (data.server_timestamp_ms && data.server_timestamp_ms < lastServerTimestamp) return;
    lastServerTimestamp = data.server_timestamp_ms ?? lastServerTimestamp;
    if (fromStream) lastStreamMessageAt = Date.now();
    onMessage(data);
  };
  // Proxies can leave a WebSocket open without delivering frames. Keep every
  // console synchronized through HTTP until the stream starts delivering again.
  const pollIfStale = async () => {
    if (isClosed || pollController || Date.now() - lastStreamMessageAt < 2500) return;
    const controller = new AbortController();
    pollController = controller;
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`${API_BASE}/api/session/current`, { signal: controller.signal });
      if (response.ok) deliver(await response.json(), false);
    } catch { /* The next watchdog tick retries while the backend is unavailable. */ }
    finally { clearTimeout(timeout); pollController = null; }
  };
  const watchdog = setInterval(pollIfStale, 1000);

  const cleanup = () => {
    clearInterval(watchdog);
    pollController?.abort();
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      try { socket.close(); } catch (_) {}
      socket = null;
    }
    if (eventSource) {
      eventSource.onmessage = null;
      eventSource.onerror = null;
      try { eventSource.close(); } catch (_) {}
      eventSource = null;
    }
  };

  const startSSE = () => {
    if (isClosed || eventSource) return;
    try {
      eventSource = new EventSource(`${API_BASE}/api/session/stream`);
      eventSource.onmessage = (event) => {
        try { deliver(JSON.parse(event.data) as SessionTelemetry); } catch (_) {}
      };
      eventSource.onerror = () => {
        if (eventSource) {
          try { eventSource.close(); } catch (_) {}
          eventSource = null;
        }
        if (!isClosed && !reconnectTimer) {
          reconnectTimer = setTimeout(connectWs, 3000);
        }
      };
    } catch (_) {}
  };

  const connectWs = () => {
    if (isClosed) return;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    try {
      socket = new WebSocket(sessionWebSocketUrl());

      socket.onmessage = (event) => {
        try { deliver(JSON.parse(event.data) as SessionTelemetry); } catch (_) {}
      };

      socket.onerror = () => {
        try { socket?.close(); } catch (_) {}
      };

      socket.onclose = () => {
        socket = null;
        if (!isClosed) {
          startSSE();
        }
      };
    } catch (_) {
      startSSE();
    }
  };

  connectWs();
  void pollIfStale();

  return () => {
    isClosed = true;
    cleanup();
  };
}

export async function fetchSuspensionRecommendations(): Promise<{ recommendations: any[] }> {
  const res = await fetch(`${API_BASE}/api/discipline/recommendations`);
  if (!res.ok) throw new Error("Failed to fetch suspension recommendations");
  return res.json();
}

export async function confirmSuspension(memberId: string, confirmedBy: string, reason: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/discipline/confirm-suspension`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ member_id: memberId, confirmed_by: confirmedBy, reason })
  });
  if (!res.ok) throw new Error("Failed to confirm suspension");
  return res.json();
}

export async function rejectSuspension(alertId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/discipline/reject-suspension/${alertId}`, {
    method: "POST"
  });
  return res.json();
}

export async function revokeSuspension(memberId: string, revokedBy: string = "Hon. Speaker", reason?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/discipline/revoke-suspension`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ member_id: memberId, revoked_by: revokedBy, reason })
  });
  if (!res.ok) throw new Error("Failed to revoke suspension");
  return res.json();
}

export async function getMemberSuspensionStatus(memberId: string): Promise<{ suspended: boolean; record: any }> {
  const res = await fetch(`${API_BASE}/api/discipline/suspended/${memberId}`);
  if (!res.ok) throw new Error("Failed to fetch suspension status");
  return res.json();
}

export async function scheduleSession(data: {
  title: string;
  session_date: string;
  start_time: string;
  end_time: string;
  max_speaking_time_seconds?: number;
  agenda?: string;
  description?: string;
  scheduled_by?: string;
}): Promise<{ status: string; session_id: string; scheduled_session: any; notifications_created: number }> {
  const res = await fetch(`${API_BASE}/api/session/schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || "Failed to schedule session");
  }
  return res.json();
}

export async function fetchMemberNotifications(memberId: string): Promise<{ notifications: any[] }> {
  const res = await fetch(`${API_BASE}/api/notifications/member/${memberId}`);
  if (!res.ok) throw new Error("Failed to fetch notifications");
  return res.json();
}

export async function sendVisionFrame(payload: {
  frame_b64?: string;
  member_id: string;
  seat_id: string;
  boundary_x1?: number;
  boundary_y1?: number;
  boundary_x2?: number;
  boundary_y2?: number;
}): Promise<{
  status: string;
  person_detected: boolean;
  track_id: number;
  member_id: string;
  seat_id: string;
  position: { cx: number; cy: number; bbox: { x1: number; y1: number; x2: number; y2: number } } | null;
  confidence: number;
  inside_boundary: boolean;
  boundary: { x1: number; y1: number; x2: number; y2: number };
  alert_type: "NONE" | "BOUNDARY_VIOLATION" | "PERSON_MISSING" | "PERSON_STILL_MISSING";
  alert_message: string;
  is_new_alert: boolean;
  timestamp_ms: number;
}> {
  const res = await fetch(`${API_BASE}/api/ai/vision-frame`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Vision frame failed (${res.status})`);
  return res.json();
}
