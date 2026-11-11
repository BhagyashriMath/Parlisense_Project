import { useState, useEffect, useRef } from "react";
import { useParliament } from "../../../infrastructure/context/ParliamentContext";
import { fetchMemberScorecard, requestEmergencyExit, fetchMemberNotifications, getMemberSuspensionStatus } from "../../../infrastructure/api/api";
import type { MemberScorecard, Member } from "../../../shared/types";
import type { MemberNotification, MemberCameraView } from "../model/member.types";
import { speakMessage, calculateMemberTimeMetrics } from "../model/member.model";

export { speakMessage };

export function useMemberViewModel() {
  const {
    telemetry,
    members,
    selectedMemberId,
    setSelectedMemberId,
    openScorecard,
    openReport,
    triggerEmergency,
    logout,
    isMicActive,
    setIsMicActive,
    raiseHand,
    withdrawHand
  } = useParliament();

  const [scorecard, setScorecard] = useState<MemberScorecard | null>(null);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [emergencyType, setEmergencyType] = useState("Medical Emergency at Desk");
  const [notifications, setNotifications] = useState<MemberNotification[]>([]);
  const [isSuspended, setIsSuspended] = useState(false);
  const [cameraView, setCameraView] = useState<MemberCameraView>("SELF");
  const [isDeskReviewMode, setIsDeskReviewMode] = useState(false);
  const seenAlertIds = useRef<Set<string>>(new Set());
  const prevSessionActive = useRef<boolean | undefined>(undefined);

  const currentMember: Member =
    members.find((m) => m.member_id === selectedMemberId) ||
    members[0] || {
      member_id: "M001",
      name: "Dr. Rajeshwar Sharma",
      seat_id: "S01",
      mic_id: "MIC-01",
      camera_id: "CAM-01",
      role: "Minister of Education",
      party: "National Democratic Front",
      constituency: "Varanasi North",
      allocated_time_seconds: 300
    };

  const pushNotif = (n: Omit<MemberNotification, "id" | "timestamp">) => {
    const id = `${Date.now()}-${Math.random()}`;
    setNotifications((prev) => [{ ...n, id, timestamp: Date.now() }, ...prev].slice(0, 30));
    if (n.member_audio_message) speakMessage(n.member_audio_message);
  };

  // URL ?id= check
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (id && members.find((m) => m.member_id === id)) setSelectedMemberId(id);
  }, [members, setSelectedMemberId]);

  // Reload scorecard on member change
  useEffect(() => {
    if (!selectedMemberId) return;
    let cancelled = false;
    seenAlertIds.current = new Set();
    setNotifications([]);
    setIsSuspended(false);
    // Guard against a slow response from a previously-selected member
    // overwriting the freshly selected member's scorecard.
    fetchMemberScorecard(selectedMemberId)
      .then((card) => { if (!cancelled) setScorecard(card); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selectedMemberId]);

  // Watch for upcoming scheduled sessions and broadcast notifications to member
  const seenScheduledSessionIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const sched = telemetry?.scheduled_session;
    if (sched && sched.status === "SCHEDULED") {
      const key = `sched-${sched.session_id}-${sched.session_date}-${sched.start_time}`;
      if (!seenScheduledSessionIds.current.has(key)) {
        seenScheduledSessionIds.current.add(key);
        pushNotif({
          type: "WARNING",
          title: `📅 Upcoming Sitting: ${sched.title}`,
          description: `Scheduled by the Hon. Speaker for ${sched.session_date} from ${sched.start_time} to ${sched.end_time}. Please review the order of business.`,
          member_audio_message: `Notice to all Members: An upcoming parliamentary sitting on ${sched.title} has been scheduled by the Honourable Speaker for ${sched.session_date} at ${sched.start_time}.`
        });
      }
    }
  }, [telemetry?.scheduled_session]);

  // Load member notifications on mount/member change
  useEffect(() => {
    if (!currentMember.member_id) return;
    fetchMemberNotifications(currentMember.member_id)
      .then((res) => {
        if (res.notifications && res.notifications.length > 0) {
          res.notifications.forEach((n: any) => {
            const key = `api-${n.id}`;
            if (!seenAlertIds.current.has(key)) {
              seenAlertIds.current.add(key);
              setNotifications((prev) => [
                {
                  id: n.id,
                  type: n.type === "UPCOMING_SESSION" ? "WARNING" : "ALERT",
                  title: n.title,
                  description: n.description || n.member_audio_message || "",
                  timestamp: new Date(n.created_at).getTime() || Date.now(),
                  member_audio_message: n.member_audio_message
                },
                ...prev
              ]);
            }
          });
        }
      })
      .catch(() => {});
  }, [currentMember.member_id]);

  // Speaker suspension must close this terminal without requiring a refresh.
  useEffect(() => {
    if (!currentMember.member_id) return;
    let cancelled = false;
    const check = () => {
      getMemberSuspensionStatus(currentMember.member_id)
        .then((result) => { if (!cancelled && result.suspended) setIsSuspended(true); })
        .catch(() => {});
    };
    check();
    const timer = window.setInterval(check, 2000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [currentMember.member_id]);

  // Reset suspension on new session commencement
  useEffect(() => {
    if (prevSessionActive.current === false && telemetry?.is_active === true) {
      setIsSuspended(false);
      seenAlertIds.current = new Set();
      setNotifications([]);
      if (currentMember.member_id) {
        fetchMemberScorecard(currentMember.member_id).then(setScorecard).catch(() => {});
      }
    }
  }, [telemetry?.is_active, currentMember.member_id]);

  // Announce session conclusion and reload final scorecard
  useEffect(() => {
    if (prevSessionActive.current === true && telemetry?.is_active === false) {
      speakMessage(
        "The parliamentary sitting has been adjourned by the Honourable Speaker. Please review your session scorecard.",
        "session_ended",
        15000
      );
      if (currentMember.member_id) {
        fetchMemberScorecard(currentMember.member_id).then(setScorecard).catch(() => {});
      }
    }
    if (telemetry?.is_active !== undefined) {
      prevSessionActive.current = telemetry.is_active;
    }
  }, [telemetry?.is_active, currentMember.member_id]);

  const memberSuspended = (isSuspended && telemetry?.is_active) || currentMember.status === "SUSPENDED";

  useEffect(() => {
    if (memberSuspended) {
      speakMessage(
        "You are suspended from the session. Please leave the chamber.",
        "suspension",
        20000
      );
    }
  }, [memberSuspended]);

  // Watch alerts routed to this member
  useEffect(() => {
    if (!telemetry || !currentMember.member_id) return;

    if (telemetry.ai_output?.emergency) {
      const key = `emg-${telemetry.session_id}`;
      if (!seenAlertIds.current.has(key)) {
        seenAlertIds.current.add(key);
        pushNotif({
          type: "EMERGENCY",
          alert_level: 3,
          title: "🚨 CHAMBER EMERGENCY",
          member_audio_message:
            "A chamber emergency has been declared. Please remain calm at your seat and follow marshal instructions.",
          severity: "CRITICAL"
        });
      }
    }

    (telemetry.recent_alerts || []).forEach((alert: any) => {
      const mine =
        alert.member_id === currentMember.member_id || alert.seat_id === currentMember.seat_id;
      if (!mine) return;
      if (seenAlertIds.current.has(alert.alert_id)) return;
      seenAlertIds.current.add(alert.alert_id);

      if (alert.type === "SUSPENSION_CONFIRMED") {
        if (alert.status === "ACTIVE" && (alert.session_id === telemetry.session_id || !alert.session_id) && telemetry.is_active) {
          setIsSuspended(true);
          pushNotif({
            type: "SUSPENSION_CONFIRMED",
            alert_id: alert.alert_id,
            alert_level: 3,
            title: "⛔ You Have Been Suspended",
            member_audio_message:
              "You have been suspended from the current session. Please exit the chamber.",
            severity: "CRITICAL"
          });
        }
        return;
      }

      pushNotif({
        type: "ALERT",
        alert_id: alert.alert_id,
        alert_level:
          (alert.alert_level as 1 | 2 | 3) ||
          (alert.severity === "CRITICAL" || alert.severity === "HIGH" ? 2 : 1),
        title: alert.title,
        description: alert.description,
        member_audio_message: alert.member_audio_message,
        severity: alert.severity
      });

      if (
        alert.severity === "HIGH" ||
        alert.severity === "CRITICAL" ||
        alert.severity === "MEDIUM"
      ) {
        setTimeout(() => {
          fetchMemberScorecard(currentMember.member_id).then(setScorecard).catch(() => {});
        }, 1500);
      }
    });
  }, [
    telemetry?.recent_alerts,
    telemetry?.ai_output?.emergency,
    currentMember.member_id,
    currentMember.seat_id
  ]);

  // Watch emergency requests for decisions from the Hon. Speaker
  const seenEmergencyDecisions = useRef<Set<string>>(new Set());
  const initialReqIdsRecorded = useRef(false);
  const [exitApprovedModalOpen, setExitApprovedModalOpen] = useState(false);

  useEffect(() => {
    if (!telemetry?.emergency_requests || !currentMember.member_id) return;
    const currentSessionId = telemetry?.session_id;
    const myReqs = telemetry.emergency_requests.filter(
      (r: any) =>
        (r.member_id === currentMember.member_id || r.seat_id === currentMember.seat_id) &&
        (!currentSessionId || !r.session_id || r.session_id === currentSessionId)
    );

    // On initial mount/load, record any already-decided requests so we never speak stale past announcements
    if (!initialReqIdsRecorded.current) {
      myReqs.forEach((r: any) => {
        if (r.status !== "PENDING") {
          seenEmergencyDecisions.current.add(`emg-decision-${r.id}-${r.status}`);
        }
      });
      initialReqIdsRecorded.current = true;
      return;
    }

    myReqs.forEach((req: any) => {
      if (req.status === "APPROVED" || req.status === "REJECTED" || req.status === "DENIED") {
        const key = `emg-decision-${req.id}-${req.status}`;
        if (!seenEmergencyDecisions.current.has(key)) {
          seenEmergencyDecisions.current.add(key);
          const isApproved = req.status === "APPROVED";

          if (isApproved) {
            setExitApprovedModalOpen(true);
          }

          pushNotif({
            type: isApproved ? "ALERT" : "WARNING",
            alert_id: key,
            alert_level: isApproved ? 1 : 2,
            title: isApproved
              ? `🚑 Emergency Exit Approved by ${req.decided_by || "Hon. Speaker"}`
              : `⛔ Emergency Exit Declined by ${req.decided_by || "Hon. Speaker"}`,
            description: isApproved
              ? `Your emergency exit request (${req.reason}) has been APPROVED. Marshals have been dispatched to assist you.`
              : `Your emergency exit request was declined. Please remain in your designated seat.`,
            member_audio_message: isApproved
              ? "Your emergency exit request has been approved by the Honourable Speaker. Marshals are assisting you."
              : "Your emergency exit request was declined by the Honourable Speaker. Please remain in your seat.",
            severity: isApproved ? "HIGH" : "MEDIUM"
          });
        }
      }
    });
  }, [telemetry?.emergency_requests, currentMember.member_id, currentMember.seat_id, telemetry?.session_id]);

// Derived metrics
  const sessionActive = !!telemetry?.is_active;
  const isPaused = !!telemetry?.is_paused;
  const isSpeaking = sessionActive && !isPaused && (telemetry?.active_speaker?.member_id === currentMember.member_id);
  const myHandRaised = (telemetry?.speaking_requests || []).some(
    (r) => r.member_id === currentMember.member_id
  );

  const handleRaiseHand = async () => {
    if (!sessionActive || isPaused || isSpeaking || myHandRaised) return;
    const ok = await raiseHand();
    if (ok) {
      pushNotif({
        type: "ALERT",
        alert_level: 1,
        title: "🙋 Hand Raised — Request to Speak",
        description: "The Hon. Speaker has been notified. Await recognition to take the floor.",
        severity: "LOW"
      });
    }
  };

  const handleWithdrawHand = async () => {
    await withdrawHand();
    pushNotif({
      type: "ALERT",
      alert_level: 1,
      title: "✋ Hand Lowered",
      description: "Your standing request to speak was withdrawn.",
      severity: "LOW"
    });
  };

  // Alert the member the moment the Chair recognizes them and grants the floor.
  const prevOnFloor = useRef(false);
  useEffect(() => {
    const onFloor = telemetry?.is_active === true && !telemetry?.is_paused &&
      telemetry?.active_speaker?.member_id === currentMember.member_id;
    if (onFloor && !prevOnFloor.current) {
      pushNotif({
        type: "ALERT",
        alert_level: 1,
        title: "🎤 THE CHAIR RECOGNIZED YOU — YOU HAVE THE FLOOR",
        description: "Your microphone is live. Address the House on the current order of business.",
        severity: "LOW"
      });
    }
    prevOnFloor.current = onFloor;
  }, [telemetry?.is_active, telemetry?.is_paused, telemetry?.active_speaker?.member_id, currentMember.member_id]);
  const seatStatusMap = telemetry?.vision_telemetry?.seat_status || {};
  const currentSeatNum = (currentMember.seat_id?.match(/\d+/) || [""])[0];
  const seatInfo = seatStatusMap[currentMember.seat_id] ||
    Object.entries(seatStatusMap).find(([k]) => currentSeatNum && (k.match(/\d+/) || [""])[0] === currentSeatNum)?.[1];
  const isMoved =
    seatInfo?.occupied === false ||
    seatInfo?.status === "Absent" ||
    seatInfo?.movementStatus?.includes("Well Rush") ||
    seatInfo?.movementStatus?.includes("Moved") ||
    seatInfo?.movementStatus?.includes("Absent") ||
    seatInfo?.status?.includes("Moved");

  // When recognized by the Speaker, automatically activate the microphone
  useEffect(() => {
    if (isSpeaking) {
      setIsMicActive(true);
    }
  }, [isSpeaking, setIsMicActive]);
  const allocatedSeconds = currentMember.allocated_time_seconds || 300;
  // Session totals include previous turns and remain visible while paused.
  const usedSeconds = telemetry?.member_speaking_seconds?.[currentMember.member_id] ??
    (telemetry?.active_speaker?.member_id === currentMember.member_id
      ? telemetry?.speaking_duration_seconds || 0 : 0);

  const { remainingSeconds, isQuotaExhausted, timePercent, isWarningZone } =
    calculateMemberTimeMetrics(usedSeconds, allocatedSeconds);

  const relevancePct =
    scorecard?.categories?.agenda_relevance ??
    telemetry?.ai_output?.agenda_relevance_percentage ??
    0;
  const overallScore = scorecard?.overall_score ?? 0;

  const pos = scorecard?.positive_marks || {
    agenda_relevance_points: 0,
    constructive_proposals_points: 0,
    foundational_discussion_points: 0,
    decorum_conduct_bonus: 0,
    total_positive_marks: 0
  };
  const neg = (scorecard?.negative_deductions as any) || {
    speaking_time_overage_deduction: 0,
    off_topic_digression_deduction: 0,
    interruptions_cross_talk_deduction: 0,
    disruptive_movement_deduction: 0,
    offensive_language_deduction: 0,
    total_negative_deductions: 0
  };
  const memSummary = scorecard?.member_summary || {
    discussion_summary: "No session-specific member summary is available.",
    subject_notes_points: [],
    major_ideas_raised: [],
    policy_keywords: []
  };

  const currentSessionId = telemetry?.session_id;
  const myExitRequest = (telemetry?.emergency_requests || [])
    .filter(
      (r) =>
        (r.member_id === currentMember.member_id || r.seat_id === currentMember.seat_id) &&
        (!currentSessionId || !r.session_id || r.session_id === currentSessionId) &&
        r.status !== "SUPERSEDED" &&
        r.status !== "EXPIRED"
    )
    .sort((a, b) => new Date(b.requested_at || 0).getTime() - new Date(a.requested_at || 0).getTime())[0];

  const violationCount =
    (scorecard?.statistics?.time_violations || 0) +
      (scorecard?.statistics?.seat_violations || 0) +
      (scorecard?.statistics?.interruptions || 0) +
      (scorecard?.statistics?.offensive_incidents || 0);

  const handleEmergencySubmit = async () => {
    try {
      await requestEmergencyExit(currentMember.member_id, emergencyType);
      setEmergencyModalOpen(false);
      pushNotif({
        type: "ALERT",
        alert_level: 2,
        title: `Exit Request Dispatched: ${emergencyType}`,
        member_audio_message:
          "Your emergency exit request has been transmitted to the Hon. Speaker. Please await approval.",
        severity: "HIGH"
      });
    } catch (e) {
      console.error(e);
    }
  };

  return {
    telemetry,
    members,
    currentMember,
    selectedMemberId,
    scorecard,
    emergencyModalOpen,
    emergencyType,
    exitApprovedModalOpen,
    notifications,
    isSuspended,
    memberSuspended,
    cameraView,
    sessionActive,
    isPaused,
    isSpeaking,
    myHandRaised,
    handleRaiseHand,
    handleWithdrawHand,
    seatInfo,
    isMoved,
    allocatedSeconds,
    usedSeconds,
    remainingSeconds,
    isQuotaExhausted,
    timePercent,
    isWarningZone,
    relevancePct,
    overallScore,
    pos,
    neg,
    memSummary,
    myExitRequest,
    violationCount,
    setSelectedMemberId,
    setEmergencyModalOpen,
    setEmergencyType,
    setExitApprovedModalOpen,
    setCameraView,
    handleEmergencySubmit,
    openScorecard,
    openReport,
    isDeskReviewMode,
    setIsDeskReviewMode,
    triggerEmergency,
    logout
  };
}

export type MemberViewModel = ReturnType<typeof useMemberViewModel>;
