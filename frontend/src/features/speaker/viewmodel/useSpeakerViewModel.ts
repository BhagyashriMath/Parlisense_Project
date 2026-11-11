import React, { useState, useEffect, useRef } from "react";
import { useParliament } from "../../../infrastructure/context/ParliamentContext";
import {
  fetchCompleteSessionSummary,
  confirmSuspension,
  rejectSuspension,
  revokeSuspension,
  decideEmergencyExit,
  scheduleSession
} from "../../../infrastructure/api/api";
import type { CompleteSessionSummary } from "../../../shared/types";
import type {
  MemberDisciplineState,
  SpeakerNotification,
  SuspensionRecommendation,
  CameraViewMode
} from "../model/speaker.types";
import { calculateSpeakingProgress } from "../model/speaker.model";

export function useSpeakerViewModel() {
  const {
    telemetry,
    members,
    refreshMembers,
    switchSpeaker,
    rejectFloorRequest,
    releaseFloor,
    openScorecard,
    endSessionAndGenerateReport,
    isEndingSession,
    openReport,
    startSession: contextStartSession,
    toggleSession,
    currentUser
  } = useParliament();

  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [decidedEmergencyIds, setDecidedEmergencyIds] = useState<Set<string>>(new Set());

  const handleScheduleSession = async (data: {
    title: string;
    session_date: string;
    start_time: string;
    end_time: string;
    max_speaking_time_seconds: number;
    agenda?: string;
    description?: string;
  }) => {
    setIsScheduling(true);
    try {
      const res = await scheduleSession({
        ...data,
        scheduled_by: "Hon. Speaker"
      });
      pushNotif({
        type: "ALERT",
        title: "📅 SITTING SCHEDULED & NOTICES DISPATCHED",
        description: `Sitting on "${data.title}" scheduled for ${data.session_date} (${data.start_time} - ${data.end_time}). Notifications dispatched to all member terminals.`,
        severity: "LOW"
      });
      setIsScheduleModalOpen(false);
    } catch (err: any) {
      console.error("Failed to schedule session:", err);
      throw err;
    } finally {
      setIsScheduling(false);
    }
  };

  const startSession = async () => {
    setIsStartingSession(true);
    try {
      await contextStartSession();
      pushNotif({
        type: "ALERT",
        title: "🏛️ SITTING COMMENCED — HOUSE CALLED TO ORDER",
        description: "Hon. Speaker has called the House to order. Floor proceedings and AI decorum monitoring are now LIVE.",
        severity: "LOW"
      });
    } catch (err) {
      console.error("Failed to start session:", err);
    } finally {
      setIsStartingSession(false);
    }
  };

  const sessionActive = !!telemetry?.is_active;
  const isPaused = !!telemetry?.is_paused;

  const handleTogglePause = async () => {
    if (!sessionActive) return;
    try {
      await toggleSession(isPaused);
      pushNotif({
        type: "ALERT",
        title: isPaused ? "▶️ SITTING RESUMED" : "⏸️ SITTING PAUSED",
        description: isPaused
          ? "Hon. Speaker has resumed floor proceedings. AI decorum monitoring and floor timers are active."
          : "Hon. Speaker has temporarily paused floor proceedings. Monitoring and timers are suspended.",
        severity: "LOW"
      });
    } catch (err) {
      console.error("Failed to toggle pause:", err);
    }
  };

  // Discipline state per member
  const [disciplineMap, setDisciplineMap] = useState<Record<string, MemberDisciplineState>>({});

  // Synchronize disciplineMap with member statuses from database on load/refresh
  useEffect(() => {
    if (members && members.length > 0) {
      setDisciplineMap((prev) => {
        const next = { ...prev };
        members.forEach((m) => {
          if (m.status === "SUSPENDED") {
            next[m.member_id] = { warnings: 3, suspended: true };
          } else if (next[m.member_id]?.suspended && m.status === "ACTIVE") {
            next[m.member_id] = { warnings: 0, suspended: false };
          }
        });
        return next;
      });
    }
  }, [members]);

  // Level 3 Suspension recommendations awaiting Speaker review
  const [suspensionRecs, setSuspensionRecs] = useState<SuspensionRecommendation[]>([]);
  const seenSuspIds = useRef<Set<string>>(new Set());
  const rejectedMemberSuspensions = useRef<Set<string>>(new Set());

  // Camera view mode: Floor Camera | 4-Cam Chamber Matrix | Speaker Podium
  const [cameraMode, setCameraMode] = useState<CameraViewMode>("FLOOR_SPEAKER");

  // Notifications
  const [notifications, setNotifications] = useState<SpeakerNotification[]>([]);
  const seenIds = useRef<Set<string>>(new Set());

  const pushNotif = (n: Omit<SpeakerNotification, "id" | "timestamp">) => {
    const id = `${Date.now()}-${Math.random()}`;
    setNotifications((prev) => [{ ...n, id, timestamp: Date.now() }, ...prev].slice(0, 40));
  };

  const handleConfirmSuspension = async (rec: {
    alert_id: string;
    member_id: string;
    member_name: string;
    seat_id: string;
    title: string;
  }) => {
    try {
      await confirmSuspension(rec.member_id, "Hon. Speaker", rec.title);
      setDisciplineMap((prev) => ({
        ...prev,
        [rec.member_id]: { warnings: 3, suspended: true }
      }));
      setSuspensionRecs((prev) => prev.filter((r) => r.alert_id !== rec.alert_id));
      pushNotif({
        type: "SUSPENDED",
        title: `⛔ SUSPENSION CONFIRMED — ${rec.member_name}`,
        description: `Speaker confirmed suspension for Seat ${rec.seat_id} (${rec.member_name}) under Rule 374.`,
        memberName: rec.member_name,
        seatId: rec.seat_id,
        severity: "CRITICAL"
      });
    } catch (err) {
      console.error("Failed to confirm suspension:", err);
    }
  };

  const handleRejectSuspension = async (alertId: string, memberName: string, memberId?: string) => {
    try {
      if (alertId && !alertId.startsWith("pip-")) {
        await rejectSuspension(alertId).catch(() => {});
      }
      setSuspensionRecs((prev) => prev.filter((r) => r.alert_id !== alertId));
      if (memberId) {
        rejectedMemberSuspensions.current.add(memberId);
        seenSuspIds.current.add(`pip-${memberId}`);
        setDisciplineMap((prev) => ({
          ...prev,
          [memberId]: { warnings: 0, suspended: false }
        }));
      }
      pushNotif({
        type: "ALERT",
        title: `⚠️ SUSPENSION REJECTED — ${memberName}`,
        description: `Speaker declined suspension recommendation for ${memberName}. Warning remains logged.`,
        memberName,
        severity: "MEDIUM"
      });
    } catch (err) {
      console.error("Failed to reject suspension:", err);
    }
  };

  const handleRevokeSuspension = async (memberId: string, memberName?: string) => {
    try {
      await revokeSuspension(memberId, "Hon. Speaker", "Speaker parliamentary pardon / reinstatement");
      setDisciplineMap((prev) => ({
        ...prev,
        [memberId]: { warnings: 0, suspended: false }
      }));
      setSuspensionRecs((prev) => prev.filter((r) => r.member_id !== memberId));
      pushNotif({
        type: "ALERT",
        title: `✅ SUSPENSION REVOKED — ${memberName || memberId}`,
        description: `Hon. Speaker has revoked the suspension of ${memberName || memberId}. Member is reinstated to the chamber floor.`,
        memberName,
        severity: "LOW"
      });
      await refreshMembers();
    } catch (err) {
      console.error("Failed to revoke suspension:", err);
    }
  };

  const handleManualSuspend = async (memberId: string, memberName: string, seatId: string) => {
    const target = members.find((m) => m.member_id === memberId || m.seat_id === seatId);
    if (
      target?.role?.toLowerCase().includes("speaker") ||
      target?.role?.toLowerCase().includes("presiding") ||
      seatId === "CHAMBER-DAIS" ||
      seatId === "SPEAKER" ||
      (currentUser?.role === "speaker" && (
        memberId === currentUser.memberId ||
        (currentUser.memberName && memberName.toLowerCase() === currentUser.memberName.toLowerCase())
      ))
    ) {
      pushNotif({
        type: "ALERT",
        title: "⛔ SUSPENSION NOT PERMITTED",
        description: "The Presiding Officer / Hon. Speaker cannot suspend themselves under parliamentary rules.",
        memberName,
        seatId,
        severity: "HIGH"
      });
      return;
    }

    try {
      await confirmSuspension(memberId, "Hon. Speaker", "Direct Speaker Disciplinary Order under Rule 374");
      setDisciplineMap((prev) => ({
        ...prev,
        [memberId]: { warnings: 3, suspended: true }
      }));
      setSuspensionRecs((prev) => prev.filter((r) => r.member_id !== memberId));
      pushNotif({
        type: "SUSPENDED",
        title: `⛔ MEMBER SUSPENDED — ${memberName}`,
        description: `Speaker issued direct disciplinary suspension for Seat ${seatId} (${memberName}) under Rule 374.`,
        memberName,
        seatId,
        severity: "CRITICAL"
      });
      await refreshMembers();
    } catch (err: any) {
      console.error("Failed to manually suspend member:", err);
      pushNotif({
        type: "ALERT",
        title: "Failed to suspend member",
        description: err?.message || "Server error occurred",
        severity: "HIGH"
      });
    }
  };

  const handleEmergencyDecision = async (
    requestId: string,
    approved: boolean,
    memberName: string
  ) => {
    try {
      setDecidedEmergencyIds((prev) => new Set(prev).add(requestId));
      await decideEmergencyExit(requestId, approved, "Hon. Speaker");
      pushNotif({
        type: "ALERT",
        title: approved
          ? `🚑 EMERGENCY EXIT APPROVED — ${memberName}`
          : `⛔ EMERGENCY EXIT DECLINED — ${memberName}`,
        description: approved
          ? `Marshals dispatched to escort ${memberName} from the chamber.`
          : `Request declined. Member instructed to remain seated.`,
        memberName,
        severity: approved ? "HIGH" : "MEDIUM"
      });
    } catch (err) {
      console.error("Failed to decide emergency exit:", err);
    }
  };

  // Watch telemetry for new alerts
  useEffect(() => {
    if (!telemetry) return;
    if (telemetry.ai_output?.emergency) {
      const key = `emg-${telemetry.session_id}`;
      if (!seenIds.current.has(key)) {
        seenIds.current.add(key);
        pushNotif({
          type: "EMERGENCY",
          title: "🚨 CHAMBER EMERGENCY",
          description: "Emergency signal activated. Immediate action required.",
          memberName: telemetry.active_speaker?.name,
          seatId: telemetry.active_speaker?.seat_id,
          severity: "CRITICAL"
        });
      }
    }
    const liveAlerts = [
      ...(telemetry.recent_alerts || []),
      ...((telemetry.suspension_recommendations || []).map((a: any) => ({
        ...a,
        severity: "CRITICAL",
        suspension_recommended: true,
        description: a.evidence?.description || a.title
      })))
    ];
    liveAlerts.forEach((a: any) => {
      if (!seenIds.current.has(a.alert_id)) {
        seenIds.current.add(a.alert_id);

        if (a.suspension_recommended && !seenSuspIds.current.has(a.alert_id)) {
          seenSuspIds.current.add(a.alert_id);
          setSuspensionRecs((prev) => [
            ...prev,
            {
              alert_id: a.alert_id,
              member_id: a.member_id,
              member_name: a.member_name,
              seat_id: a.seat_id,
              title: a.title,
              timestamp: a.timestamp,
              evidence: a.suspension_evidence || {}
            }
          ]);
          pushNotif({
            type: "ALERT",
            title: `🔴 L3 REVIEW NEEDED — ${a.member_name}`,
            description: `${a.title}. Suspension recommended. See review panel.`,
            memberName: a.member_name,
            seatId: a.seat_id,
            severity: "CRITICAL"
          });
          return;
        }

        pushNotif({
          type: "ALERT",
          title: a.title,
          description: a.description,
          memberName: a.member_name,
          seatId: a.seat_id,
          severity: a.severity
        });

        const isNonDisciplinaryAlert =
          a.type?.includes("SPEAKING_TIME") ||
          a.rule_id?.includes("SPEAKING_TIME") ||
          a.title?.toLowerCase().includes("speaking time") ||
          a.type?.includes("MEMBER_ABSENT") ||
          a.type?.includes("SUSPENSION_CONFIRMED") ||
          a.type?.includes("EMERGENCY");

        if (
          sessionActive &&
          !isNonDisciplinaryAlert &&
          (a.severity === "HIGH" || a.severity === "CRITICAL") &&
          a.member_id &&
          !a.suspension_recommended &&
          !rejectedMemberSuspensions.current.has(a.member_id)
        ) {
          setDisciplineMap((prev) => {
            const cur = prev[a.member_id] || { warnings: 0, suspended: false };
            if (cur.suspended) return prev;
            const w = Math.min(cur.warnings + 1, 3);
            if (w >= 3 && !seenSuspIds.current.has(`pip-${a.member_id}`)) {
              seenSuspIds.current.add(`pip-${a.member_id}`);
              setSuspensionRecs((prevSusp) => [
                ...prevSusp,
                {
                  alert_id: `pip-${a.member_id}-${Date.now()}`,
                  member_id: a.member_id,
                  member_name: a.member_name,
                  seat_id: a.seat_id,
                  title: `3 warnings reached — Suspension Recommended`,
                  timestamp: new Date().toLocaleTimeString(),
                  evidence: { warnings: 3, last_violation: a.title }
                }
              ]);
              pushNotif({
                type: "ALERT",
                title: `🔴 L3 — ${a.member_name}: 3 Warnings Reached`,
                description: `Suspension recommended. Review panel has been updated for your decision.`,
                memberName: a.member_name,
                seatId: a.seat_id,
                severity: "CRITICAL"
              });
            }
            return { ...prev, [a.member_id]: { warnings: w, suspended: false } };
          });
        }
      }
    });
  }, [telemetry?.recent_alerts, telemetry?.ai_output?.emergency, sessionActive]);

  // Post-session data
  const [completeSummary, setCompleteSummary] = useState<CompleteSessionSummary | null>(null);
  const [memberFilter, setMemberFilter] = useState("");

  useEffect(() => {
    fetchCompleteSessionSummary().then(setCompleteSummary).catch(console.error);
  }, [telemetry?.is_active]);

  // Computed values for presentation
  const ai = telemetry?.ai_output;
  // Do not infer a speaker from the first roster member. The floor is empty
  // until the presiding officer explicitly assigns it.
  const activeSpeaker = telemetry?.active_speaker;
  const currentSpeakerId = activeSpeaker?.member_id;
  const speakingTime = sessionActive ? (telemetry?.speaking_duration_seconds || 0) : 0;
  const usedTime = telemetry?.member_speaking_seconds?.[currentSpeakerId || ""] ?? speakingTime;
  const allocatedTime = activeSpeaker?.allocated_time_seconds || 300;
  const { timeRemaining, timePercent, isTimeOver } = calculateSpeakingProgress(
    usedTime,
    allocatedTime
  );
  const relevancePct = ai?.agenda_relevance_percentage ?? 0;
  const currentSessionId = telemetry?.session_id;
  const pendingEmergencyRequests = (telemetry?.emergency_requests || []).filter(
    (r) =>
      r.status === "PENDING" &&
      (!currentSessionId || !r.session_id || r.session_id === currentSessionId) &&
      !decidedEmergencyIds.has(r.id || (r as any).request_id)
  );
  const speakingRequests = telemetry?.speaking_requests || [];
  const pendingRaisedHands = speakingRequests.filter((r) => r.member_id !== currentSpeakerId);

  const handleGrantFloor = async (memberId: string) => {
    await switchSpeaker(memberId);
    pushNotif({
      type: "ALERT",
      title: `🎤 FLOOR GRANTED — ${memberId}`,
      description: "The member's raised hand was recognized. Microphone and floor time are now live.",
      memberName: speakingRequests.find((r) => r.member_id === memberId)?.name,
      seatId: speakingRequests.find((r) => r.member_id === memberId)?.seat_id,
      severity: "LOW"
    });
  };

  const handleRejectFloor = async (memberId: string) => {
    const req = speakingRequests.find((r) => r.member_id === memberId);
    await rejectFloorRequest(memberId);
    pushNotif({
      type: "ALERT",
      title: `✋ REQUEST DECLINED — ${req?.name || memberId}`,
      description: "The raised hand was declined. The member remains seated.",
      memberName: req?.name,
      seatId: req?.seat_id,
      severity: "LOW"
    });
  };

  const handleReleaseFloor = async () => {
    await releaseFloor();
    pushNotif({
      type: "ALERT",
      title: "🗣️ FLOOR RELEASED",
      description: "The chair released the floor. The chamber awaits the next speaker.",
      severity: "LOW"
    });
  };

  return {
    telemetry,
    members,
    sessionActive,
    isPaused,
    handleTogglePause,
    disciplineMap,
    suspensionRecs,
    cameraMode,
    notifications,
    completeSummary,
    memberFilter,
    ai,
    activeSpeaker,
    speakingTime,
    allocatedTime,
    timeRemaining,
    timePercent,
    isTimeOver,
    relevancePct,
    pendingEmergencyRequests,
    speakingRequests,
    pendingRaisedHands,
    handleGrantFloor,
    handleRejectFloor,
    handleReleaseFloor,
    setCameraMode,
    setMemberFilter,
    handleConfirmSuspension,
    handleRejectSuspension,
    handleRevokeSuspension,
    handleManualSuspend,
    handleEmergencyDecision,
    switchSpeaker,
    openScorecard,
    isEndingSession,
    endSessionAndGenerateReport,
    isStartingSession,
    startSession,
    isScheduleModalOpen,
    setIsScheduleModalOpen,
    isScheduling,
    handleScheduleSession,
    openReport
  };
}

export type SpeakerViewModel = ReturnType<typeof useSpeakerViewModel>;
