import React, { useEffect, useRef } from 'react';
import { useSpeakerViewModel } from '../viewmodel/useSpeakerViewModel';
import { SpeakerDecisions } from './components/SpeakerDecisions';
import { SpeakerTranscriptFeed } from '../../chamber-monitoring/view/SpeakerTranscriptFeed';
import { MemberSelfCamera } from '../../member/view/MemberSelfCamera';
import { ScheduleSessionModal } from './components/ScheduleSessionModal';
import { useParliament } from '../../../infrastructure/context/ParliamentContext';
import { playChamberAlertChime, speakAlert } from '../../../shared/utils/chamberAudio';
import {
  Mic, MicOff, Volume2, ShieldAlert, ShieldCheck, Clock,
  Activity, Flag, Play, Pause, Calendar, FileText, User,
  AlertTriangle, CheckCircle2, XCircle, Award, Ban, RotateCcw, Hand
} from 'lucide-react';
import { MemberSessionSummary } from '../../../shared/types';

/* ── tiny colour helper ─────────────────────────────────── */
const C = {
  white:   "#ffffff",
  bg:      "#f1f4f8",
  card:    "#ffffff",
  border:  "#e2e5eb",
  ink:     "#111827",
  body:    "#374151",
  muted:   "#6b7280",
  faint:   "#9ca3af",
  accent:  "#4f46e5",
  green:   "#059669",
  amber:   "#d97706",
  red:     "#dc2626",
};

export function SpeakerDashboard() {
  const { liveMicDb, isMicActive, setIsMicActive, currentUser } = useParliament();

  const {
    telemetry, members, disciplineMap, suspensionRecs,
    notifications, completeSummary, memberFilter, ai,
    activeSpeaker, speakingTime, timePercent, isTimeOver,
    relevancePct, pendingEmergencyRequests, pendingRaisedHands,
    handleGrantFloor, handleRejectFloor, handleReleaseFloor,
    setMemberFilter, handleConfirmSuspension, handleRejectSuspension,
    handleRevokeSuspension, handleManualSuspend, handleEmergencyDecision,
    switchSpeaker, openScorecard, sessionActive, isPaused,
    handleTogglePause, isEndingSession, endSessionAndGenerateReport,
    isStartingSession, startSession, isScheduleModalOpen,
    setIsScheduleModalOpen, isScheduling, handleScheduleSession, openReport
  } = useSpeakerViewModel();

  const isLiveActive = sessionActive && !isPaused;

  /* ── suspension audio alert when member hits 3 violations ── */
  const alertedSuspensions = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!sessionActive) return;
    (telemetry?.recent_alerts || []).forEach((a: any) => {
      if (
        a.rule_id === "RULE_9_SUSPENSION_REVIEW" &&
        a.status === "ACTIVE" &&
        !alertedSuspensions.current.has(a.alert_id)
      ) {
        alertedSuspensions.current.add(a.alert_id);
        playChamberAlertChime("CRITICAL");
        speakAlert(
          `Attention. ${a.member_id} has reached three violations. The Honourable Speaker must review suspension.`,
          "RULE_9_SUSPENSION_REVIEW",
          true
        );
      }
    });
  }, [telemetry?.recent_alerts, sessionActive]);

  /* ── build member list ── */
  const memberSummaries: MemberSessionSummary[] =
    completeSummary?.member_wise_summary ||
    members.map((m) => {
      const d = disciplineMap[m.member_id] || { warnings: 0, suspended: false };
      const isSusp = d.suspended || m.status === "SUSPENDED";
      return {
        member_id: m.member_id, name: m.name, seat_id: m.seat_id,
        mic_id: m.mic_id || `MIC-${m.seat_id}`,
        role: m.role || "Member of Parliament", party: m.party || "—",
        status: isSusp ? "SUSPENDED" : (m.status || "ACTIVE"),
        presence: (isSusp ? "Suspended" : "Present") as any,
        speaking_time_formatted: "0m", speaking_time_seconds: 0, speeches_count: 0,
        agenda_relevance_pct: 0,
        violations_count: isSusp ? 3 : (m.violations_count || 0),
        warnings_count: d.warnings || (m.warnings_count || 0),
        seat_compliance_pct: 100,
        behavior_emotion: isSusp ? "Suspended" : "Active",
        positive_marks: { agenda_relevance_points: 0, constructive_proposals_points: 0, foundational_discussion_points: 0, decorum_conduct_bonus: 0, total_positive_marks: 0 },
        negative_deductions: { speaking_time_overage_deduction: 0, off_topic_speech_deduction: 0, interruptions_cross_talk_deduction: 0, disruptive_movement_deduction: 0, offensive_language_deduction: 0, excessive_noise_deduction: 0, rule_violations_deduction: isSusp ? 30 : 0, total_negative_deductions: isSusp ? 30 : 0 },
        member_summary: { discussion_summary: "", subject_notes_points: [], major_ideas_raised: [], policy_keywords: [] },
        speaking_score: 0, agenda_score: 0, discipline_score: isSusp ? 0 : 100,
        seat_score: 100, violations_score: isSusp ? 0 : 100,
        final_score: 0, grade: "—"
      };
    });

  const filteredMembers = memberSummaries.filter(m =>
    m.name.toLowerCase().includes(memberFilter.toLowerCase()) ||
    m.seat_id.toLowerCase().includes(memberFilter.toLowerCase())
  );

  const noiseDb = !isLiveActive ? 0
    : isMicActive && liveMicDb ? Math.round(liveMicDb)
    : typeof ai?.noise_level === "number" ? ai.noise_level : 0;

  const noiseColor = noiseDb >= 80 ? C.red : noiseDb >= 68 ? C.amber : noiseDb > 0 ? C.green : C.faint;
  const timeColor  = isTimeOver ? C.red : timePercent > 80 ? C.amber : C.ink;
  const relevColor = relevancePct >= 70 ? C.green : relevancePct >= 40 ? C.amber : C.red;

  const activeAlerts = (telemetry?.recent_alerts || []).filter((a: any) => a.status === "ACTIVE").length;

  return (
    <div style={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "column", gap: 8, padding: "0 6px 4px" }}>

      {/* ═══════════════════════════════════════════════════════
          TOP CONTROL BAR
          ═══════════════════════════════════════════════════════ */}
      <div className="flex-shrink-0 bg-white rounded-2xl border border-gray-200 shadow-sm"
        style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr 1fr 1fr auto", alignItems: "center", gap: 0 }}>

        {/* Presiding officer identity */}
        <div className="flex items-center gap-3 px-4 py-2.5"
          style={{ borderRight: `1px solid ${C.border}` }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "#eef2ff", border: "1.5px solid #c7d2fe" }}>
            <User className="w-5 h-5" style={{ color: C.accent }} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.muted }}>Speaker</p>
            <p className="text-sm font-bold leading-tight" style={{ color: C.ink }}>Hon. Speaker</p>
            <button onClick={() => setIsMicActive(!isMicActive)}
              className="mt-0.5 px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
              style={isMicActive
                ? { background: "#fef2f2", border: "1px solid #fca5a5", color: C.red }
                : { background: "#f0fdf4", border: "1px solid #6ee7b7", color: C.green }}>
              {isMicActive ? <><MicOff className="w-2.5 h-2.5" /> Mic LIVE</> : <><Mic className="w-2.5 h-2.5" /> Enable Mic</>}
            </button>
          </div>
        </div>

        {/* Who is speaking */}
        <div className="px-4 py-2.5" style={{ borderRight: `1px solid ${C.border}` }}>
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: C.faint }}>Floor Speaker</p>
          {activeSpeaker ? (
            <>
              <p className="text-sm font-bold truncate" style={{ color: C.ink }}>{activeSpeaker.name}</p>
              <p className="text-[10px] font-mono" style={{ color: C.muted }}>
                {activeSpeaker.seat_id} · {activeSpeaker.party || "—"}
              </p>
            </>
          ) : (
            <p className="text-sm font-semibold" style={{ color: C.faint }}>No speaker</p>
          )}
        </div>

        {/* Speaking time */}
        <div className="px-4 py-2.5" style={{ borderRight: `1px solid ${C.border}` }}>
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: C.faint }}>Floor Time</p>
          <p className="text-xl font-black font-mono" style={{ color: timeColor }}>
            {Math.floor(speakingTime / 60)}:{String(speakingTime % 60).padStart(2, "0")}
          </p>
          <div className="w-full h-1.5 rounded-full mt-1 overflow-hidden" style={{ background: "#f1f3f6" }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, timePercent)}%`, background: isTimeOver ? C.red : timePercent > 80 ? C.amber : C.accent }} />
          </div>
        </div>

        {/* Relevance */}
        <div className="px-4 py-2.5" style={{ borderRight: `1px solid ${C.border}` }}>
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: C.faint }}>Relevance</p>
          <p className="text-xl font-black font-mono" style={{ color: relevColor }}>{relevancePct}%</p>
          <p className="text-[10px]" style={{ color: C.faint }}>Agenda alignment</p>
        </div>

        {/* Noise */}
        <div className="px-4 py-2.5" style={{ borderRight: `1px solid ${C.border}` }}>
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: C.faint }}>Noise</p>
          <div className="flex items-center gap-1.5">
            <Volume2 className="w-4 h-4" style={{ color: noiseColor }} />
            <p className="text-xl font-black font-mono" style={{ color: C.ink }}>{noiseDb} dB</p>
          </div>
          <p className="text-[10px]" style={{ color: C.faint }}>{noiseDb >= 80 ? "⚠ High" : noiseDb > 0 ? "Normal" : "Idle"}</p>
        </div>

        {/* Session controls */}
        <div className="flex items-center gap-2 px-4 py-2.5">
          {sessionActive ? (
            <>
              <button onClick={handleTogglePause}
                className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                style={isPaused
                  ? { background: "#f0fdf4", border: "1px solid #6ee7b7", color: C.green }
                  : { background: "#fffbeb", border: "1px solid #fcd34d", color: C.amber }}>
                {isPaused ? <><Play className="w-3.5 h-3.5 fill-current" /> Resume</> : <><Pause className="w-3.5 h-3.5 fill-current" /> Pause</>}
              </button>
              <button onClick={endSessionAndGenerateReport} disabled={isEndingSession}
                className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: C.red }}>
                <Flag className="w-3.5 h-3.5" />
                {isEndingSession ? "Ending…" : "End"}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setIsScheduleModalOpen(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                style={{ background: "#eff6ff", border: "1px solid #93c5fd", color: "#2563eb" }}>
                <Calendar className="w-3.5 h-3.5" /> Schedule
              </button>
              <button onClick={openReport}
                className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                style={{ background: "#f8f9fb", border: `1px solid ${C.border}`, color: C.body }}>
                <FileText className="w-3.5 h-3.5" /> Report
              </button>
              <button onClick={startSession} disabled={isStartingSession}
                className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 text-white"
                style={{ background: C.accent, boxShadow: "0 2px 8px rgba(79,70,229,0.30)" }}>
                <Play className="w-3.5 h-3.5 fill-current" />
                {isStartingSession ? "Starting…" : "Start"}
              </button>
            </>
          )}
          <div className="flex items-center gap-1 ml-1">
            <span className="text-[10px] font-bold px-2 py-1 rounded-lg"
              style={activeAlerts > 0
                ? { background: "#fef2f2", border: "1px solid #fca5a5", color: C.red }
                : { background: "#f0fdf4", border: "1px solid #6ee7b7", color: C.green }}>
              <ShieldAlert className="w-3 h-3 inline mr-1" />{activeAlerts}
            </span>
          </div>
        </div>
      </div>

      {/* paused banner */}
      {sessionActive && isPaused && (
        <div className="flex-shrink-0 bg-amber-50 border border-amber-300 rounded-xl px-4 py-1.5 flex items-center justify-between text-xs font-bold text-amber-800">
          <span>⏸ SITTING PAUSED — floor timers suspended</span>
          <button onClick={handleTogglePause}
            className="px-3 py-1 rounded-lg bg-amber-500 text-white text-xs font-bold cursor-pointer">
            Resume
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          MAIN GRID: camera | transcript | alerts | hands+roster
          ═══════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "250px 1fr 240px 220px", gap: 8, overflow: "hidden" }}>

        {/* ── COL A: Speaker camera — same as member dashboard ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 0, overflow: "hidden" }}>

          {/* Speaker camera — same size/style as member dashboard: fills full column height */}
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden", borderRadius: 14, border: "1px solid #e2e5eb" }}>
            {currentUser?.memberId ? (
              <MemberSelfCamera
                memberId={currentUser.memberId}
                seatId={currentUser.seatId || "DAIS"}
                micId="MIC-DAIS"
                memberName={currentUser.memberName || "Hon. Speaker"}
              />
            ) : (
              <div style={{ height: "100%", background: "#f8f9fb", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#eef2ff", border: "1.5px solid #c7d2fe", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <User style={{ width: 24, height: 24, color: "#4f46e5" }} />
                </div>
                <p style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Speaker Camera</p>
                <button onClick={() => setIsMicActive(!isMicActive)}
                  style={{ padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", border: "1px solid #c7d2fe", background: "#eef2ff", color: "#4f46e5" }}>
                  {isMicActive ? "🎤 Mic Active" : "Enable Camera / Mic"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── COL B: Speech-to-text transcript — large, full height ── */}
        <div style={{ minHeight: 0, overflow: "hidden" }}>
          <SpeakerTranscriptFeed />
        </div>

        {/* ── COL C: Notifications/alerts ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 0, overflow: "hidden" }}>

          {/* Noise meter */}
          <div className="flex-shrink-0 bg-white rounded-2xl border border-gray-200 shadow-sm p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Volume2 className="w-4 h-4" style={{ color: noiseColor }} />
                <span className="text-[11px] font-bold text-gray-800 uppercase tracking-wide">Noise</span>
              </div>
              <span className="text-lg font-black font-mono" style={{ color: noiseColor }}>{noiseDb} dB</span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "#f1f3f6" }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.max(0, ((noiseDb - 30) / 70) * 100))}%`, background: noiseColor }} />
            </div>
            <div className="flex justify-between text-[9px] mt-1 font-mono" style={{ color: C.faint }}>
              <span>40 Quiet</span><span>60 Normal</span><span style={{ color: C.red }}>82+ High</span>
            </div>
          </div>

          {/* Decorum alerts */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm"
            style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 flex-shrink-0"
              style={{ background: "#f8f9fb" }}>
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">Notifications</span>
              </div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                notifications.length > 0
                  ? "bg-red-50 text-red-700 border-red-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}>{notifications.length}</span>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }} className="p-2 space-y-1.5">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 py-4">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  <p className="text-xs text-gray-400 italic">No active infractions</p>
                </div>
              ) : notifications.slice(0, 30).map((n: any) => (
                <div key={n.id}
                  className={`p-2.5 rounded-xl text-xs border ${
                    n.severity === "CRITICAL"
                      ? "bg-red-50 border-red-200"
                      : n.severity === "HIGH"
                      ? "bg-orange-50 border-orange-200"
                      : "bg-amber-50 border-amber-200"
                  }`}>
                  <div className="flex items-start justify-between gap-1 mb-0.5">
                    <p className="font-bold text-gray-800 text-[11px] leading-snug">{n.title}</p>
                    <span className={`text-[9px] font-black px-1 py-0.5 rounded flex-shrink-0 ${
                      n.severity === "CRITICAL" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    }`}>{n.severity}</span>
                  </div>
                  <p className="text-[10px] text-gray-600 leading-snug line-clamp-2">{n.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Emergency / suspension decisions */}
          <div style={{ flexShrink: 0 }}>
            <SpeakerDecisions
              suspensionRecs={suspensionRecs}
              pendingEmergencyRequests={pendingEmergencyRequests}
              onConfirmSuspension={handleConfirmSuspension}
              onRejectSuspension={handleRejectSuspension}
              onEmergencyDecision={handleEmergencyDecision}
            />
          </div>
        </div>

        {/* ── COL D: Suspended members → Speak requests → Emergency ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 0, overflow: "hidden" }}>

          {/* 1. SUSPENDED MEMBERS — larger box, fills available space */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
            style={{ flex: "1 1 0", minHeight: 0, display: "flex", flexDirection: "column" }}>
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 flex-shrink-0"
              style={{ background: "#fef2f2" }}>
              <div className="flex items-center gap-2">
                <Ban className="w-4 h-4 text-red-500" />
                <span className="text-xs font-bold text-red-700 uppercase tracking-wider">Suspended Members</span>
              </div>
              {filteredMembers.filter(m => disciplineMap[m.member_id]?.suspended || (m as any).status === "SUSPENDED").length > 0 && (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-red-100 border border-red-300 text-red-700">
                  {filteredMembers.filter(m => disciplineMap[m.member_id]?.suspended || (m as any).status === "SUSPENDED").length}
                </span>
              )}
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }} className="p-2 space-y-2">
              {filteredMembers.filter(m => disciplineMap[m.member_id]?.suspended || (m as any).status === "SUSPENDED").length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 py-4">
                  <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                  <p className="text-xs text-gray-400 italic">No suspended members</p>
                  <p className="text-[10px] text-gray-300 text-center">Members suspended under Rule 374 appear here</p>
                </div>
              ) : (
                filteredMembers
                  .filter(m => disciplineMap[m.member_id]?.suspended || (m as any).status === "SUSPENDED")
                  .map(m => (
                    <div key={m.member_id}
                      className="rounded-xl bg-red-50 border border-red-200 overflow-hidden">
                      {/* Member info row */}
                      <div className="flex items-center gap-2.5 px-3 py-2.5">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0"
                          style={{ background: "#fee2e2", border: "1.5px solid #fca5a5", color: "#dc2626" }}>
                          {m.seat_id?.replace(/\D/g, "") || "?"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-gray-900 truncate">{m.name}</p>
                          <p className="text-[10px] font-mono text-red-600">{m.seat_id} · {m.party || "—"}</p>
                          <p className="text-[10px] text-red-500 font-semibold mt-0.5">⚠ Rule 374 — Session Suspended</p>
                        </div>
                      </div>
                      {/* Revoke button */}
                      {handleRevokeSuspension && (
                        <div className="border-t border-red-100 px-3 py-2">
                          <button onClick={() => handleRevokeSuspension(m.member_id, m.name)}
                            className="w-full py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                            style={{ background: "#f0fdf4", border: "1px solid #6ee7b7", color: "#059669" }}>
                            <RotateCcw className="w-3.5 h-3.5" /> Revoke Suspension
                          </button>
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* 2. REQUESTS TO SPEAK (Grant/Reject) */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex-shrink-0">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100"
              style={{ background: "#f8f9fb" }}>
              <div className="flex items-center gap-2">
                <Hand className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Request to Speak</span>
              </div>
              {pendingRaisedHands.length > 0 && (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-300 text-amber-700 animate-pulse">
                  {pendingRaisedHands.length}
                </span>
              )}
            </div>
            <div style={{ maxHeight: 180, overflowY: "auto" }} className="p-2 space-y-1.5">
              {pendingRaisedHands.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-1.5 py-3">
                  <Hand className="w-5 h-5 text-gray-300" />
                  <p className="text-[11px] text-gray-400 italic">
                    {isLiveActive ? "No hands raised" : "Session must be live"}
                  </p>
                </div>
              ) : (
                pendingRaisedHands.map(r => {
                  const wait = (ts: number) => {
                    const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
                    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
                  };
                  return (
                    <div key={r.member_id}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-xl border"
                      style={{ background: "#fefce8", border: "1px solid #fde68a" }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-[11px] font-mono flex-shrink-0"
                          style={{ background: "#fef3c7", border: "1px solid #fcd34d", color: "#d97706" }}>
                          {r.seat_id?.replace(/\D/g, "") || "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">{r.name}</p>
                          <p className="text-[10px] font-mono text-gray-500">{r.seat_id} · {wait(r.requested_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => handleGrantFloor(r.member_id)}
                          className="px-2.5 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 cursor-pointer text-white"
                          style={{ background: "#4f46e5", boxShadow: "0 2px 8px rgba(79,70,229,0.25)" }}>
                          <Mic className="w-3 h-3" /> Grant
                        </button>
                        <button onClick={() => handleRejectFloor(r.member_id)}
                          className="w-7 h-7 rounded-xl flex items-center justify-center cursor-pointer"
                          style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626" }}>
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {/* Release floor button */}
            {activeSpeaker?.member_id && (
              <div className="px-2 pb-2 flex-shrink-0">
                <button onClick={handleReleaseFloor}
                  className="w-full py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  style={{ background: "#f8f9fb", border: "1px solid #e2e5eb", color: "#6b7280" }}>
                  <Flag className="w-3 h-3" /> Release Floor
                </button>
              </div>
            )}
          </div>

          {/* 3. EMERGENCY EXIT REQUESTS (Allow/Deny) */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
            style={{ flexShrink: 0 }}>
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100"
              style={{ background: "#fffbeb" }}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Emergency Exit</span>
              </div>
              {pendingEmergencyRequests.length > 0 && (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-700 animate-pulse">
                  {pendingEmergencyRequests.length}
                </span>
              )}
            </div>
            <div style={{ maxHeight: 180, overflowY: "auto" }} className="p-2 space-y-1.5">
              {pendingEmergencyRequests.length === 0 ? (
                <div className="flex flex-col items-center py-3 gap-1">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <p className="text-[11px] text-gray-400 italic">No pending requests</p>
                </div>
              ) : (
                pendingEmergencyRequests.map((req: any) => {
                  const reqId = req.id || req.request_id;
                  const memberName = req.member_name || "Hon. Member";
                  const seatId = req.seat_id || "—";
                  const reason = req.reason || req.reason_type || "Urgent departure";
                  return (
                    <div key={reqId}
                      className="p-2.5 rounded-xl border"
                      style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                      <div className="flex items-center gap-2 mb-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-[11px] flex-shrink-0"
                          style={{ background: "#fef3c7", border: "1px solid #fcd34d", color: "#d97706" }}>
                          {seatId?.replace(/\D/g, "") || "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">{memberName}</p>
                          <p className="text-[10px] text-gray-600 truncate">{reason}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => handleEmergencyDecision(reqId, true, memberName)}
                          className="flex-1 py-1.5 rounded-xl text-[11px] font-black flex items-center justify-center gap-1 cursor-pointer text-white"
                          style={{ background: "#059669", boxShadow: "0 2px 6px rgba(5,150,105,0.25)" }}>
                          <CheckCircle2 className="w-3 h-3" /> Allow
                        </button>
                        <button onClick={() => handleEmergencyDecision(reqId, false, memberName)}
                          className="flex-1 py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                          style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626" }}>
                          <XCircle className="w-3 h-3" /> Deny
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>

      <ScheduleSessionModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onSchedule={handleScheduleSession}
        currentTopic={telemetry?.current_bill || "Digital Education & AI Governance Bill 2026"}
        isScheduling={isScheduling}
      />
    </div>
  );
}
