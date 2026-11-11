import React from 'react';
import { useMemberViewModel } from '../viewmodel/useMemberViewModel';
import { MemberSessionEndedView } from './components/MemberSessionEndedView';
import { SuspensionFullscreenView } from './components/SuspensionFullscreenView';
import { EmergencyExitModal } from './components/EmergencyExitModal';
import { EmergencyExitApprovedModal } from './components/EmergencyExitApprovedModal';
import { MemberSelfCamera } from './MemberSelfCamera';
import { LiveTranscript } from '../../chamber-monitoring/view/LiveTranscript';
import { ShieldAlert, AlertTriangle, Mic, Hand, Clock, Activity, Armchair, ShieldCheck, Award } from 'lucide-react';

export function MemberDashboard() {
  const {
    telemetry, currentMember, scorecard, emergencyModalOpen, emergencyType,
    notifications, memberSuspended, sessionActive, isPaused, isSpeaking,
    myHandRaised, handleRaiseHand, handleWithdrawHand,
    seatInfo, isMoved, allocatedSeconds, usedSeconds, remainingSeconds,
    isQuotaExhausted, timePercent, isWarningZone, relevancePct,
    overallScore, pos, neg, myExitRequest, exitApprovedModalOpen,
    setExitApprovedModalOpen, setEmergencyModalOpen, setEmergencyType,
    handleEmergencySubmit, openScorecard, openReport, isDeskReviewMode,
    setIsDeskReviewMode, logout
  } = useMemberViewModel();

  if (memberSuspended) {
    return <SuspensionFullscreenView currentMember={currentMember} scorecard={scorecard} onLogout={logout} />;
  }

  if (!sessionActive && !isDeskReviewMode) {
    return (
      <MemberSessionEndedView
        currentMember={currentMember} scorecard={scorecard}
        sessionId={telemetry?.session_id} scheduledSession={telemetry?.scheduled_session}
        onOpenScorecard={openScorecard} onOpenReport={openReport}
        onInspectDesk={() => setIsDeskReviewMode(true)} onLogout={logout}
      />
    );
  }

  /* ── helpers ── */
  const timeColor  = isQuotaExhausted ? "#dc2626" : isWarningZone ? "#d97706" : "#059669";
  const barColor   = isQuotaExhausted ? "#dc2626" : isWarningZone ? "#d97706" : "#4f46e5";
  const relevColor = relevancePct >= 70 ? "#059669" : relevancePct >= 40 ? "#d97706" : "#dc2626";
  const seatColor  = isMoved ? "#dc2626" : "#059669";

  const pill = (text: string, bg: string, bdr: string, col: string) => (
    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: bg, border: `1px solid ${bdr}`, color: col }}>
      {text}
    </span>
  );

  return (
    <div
      id="member-dashboard-view"
      style={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "column", gap: 6, padding: "0 4px 2px" }}
    >

      {/* ── STATUS BANNERS (only show when relevant) ── */}
      {sessionActive && isPaused && (
        <div className="flex-shrink-0 bg-amber-50 border border-amber-300 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs font-bold text-amber-800">
          <span>⏸ SITTING PAUSED — timers suspended</span>
          <span className="px-2 py-0.5 rounded bg-amber-100 border border-amber-300 font-mono text-[10px]">PAUSED</span>
        </div>
      )}
      {sessionActive && myExitRequest?.status === "APPROVED" && (
        <div className="flex-shrink-0 bg-emerald-50 border-2 border-emerald-400 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs font-bold text-emerald-800 animate-pulse">
          <span>🚑 EMERGENCY EXIT APPROVED — Marshals dispatched</span>
          <button onClick={() => setExitApprovedModalOpen(true)}
            className="px-2.5 py-1 rounded bg-emerald-500 text-white text-[10px] font-bold cursor-pointer">
            CLEARED TO EXIT
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TOP BAR: Member identity + talking time + hand raise + emergency
          ══════════════════════════════════════════════════════ */}
      <div className="flex-shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm"
        style={{ display: "grid", gridTemplateColumns: "1fr auto auto", alignItems: "center", gap: 0 }}>

        {/* Identity */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-r border-gray-100">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0"
            style={{ background: "#eef2ff", border: "1.5px solid #c7d2fe", color: "#4f46e5" }}>
            {currentMember.seat_id?.replace(/\D/g, "") || "?"}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-gray-900 truncate">{currentMember.name}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: "#eef2ff", border: "1px solid #c7d2fe", color: "#4f46e5" }}>
                {currentMember.seat_id}
              </span>
              {isSpeaking && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1"
                  style={{ background: "#f0fdf4", border: "1px solid #6ee7b7", color: "#059669" }}>
                  <Mic className="w-2.5 h-2.5 animate-pulse" /> ON FLOOR
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-500 truncate mt-0.5">
              {currentMember.role || "Member of Parliament"} · {currentMember.party || "—"}
              {currentMember.constituency ? ` · ${currentMember.constituency}` : ""}
            </p>
          </div>
        </div>

        {/* Talking time */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-r border-gray-100">
          <Clock className="w-4 h-4 flex-shrink-0" style={{ color: timeColor }} />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#9ca3af" }}>
              Floor Time
            </p>
            <p className="text-lg font-black font-mono leading-none" style={{ color: timeColor }}>
              {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, "0")}
            </p>
            <div className="w-24 h-1.5 rounded-full mt-1 overflow-hidden" style={{ background: "#f1f3f6" }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, timePercent)}%`, background: barColor }} />
            </div>
          </div>
        </div>

        {/* Hand raise + Emergency */}
        <div className="flex items-center gap-2 px-4 py-2.5">
          {myHandRaised ? (
            <button onClick={handleWithdrawHand}
              className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              style={{ background: "#fffbeb", border: "1px solid #fcd34d", color: "#92400e" }}>
              <Hand className="w-3.5 h-3.5" /> Withdraw
            </button>
          ) : isSpeaking ? (
            <span className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
              style={{ background: "#f0fdf4", border: "1px solid #6ee7b7", color: "#059669" }}>
              <Mic className="w-3.5 h-3.5 animate-pulse" /> Speaking
            </span>
          ) : (
            <button onClick={handleRaiseHand} disabled={isPaused}
              className="px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50 text-white"
              style={{ background: "#4f46e5", boxShadow: "0 2px 8px rgba(79,70,229,0.30)" }}>
              <Hand className="w-3.5 h-3.5" />
              {isPaused ? "Paused" : "Raise Hand"}
            </button>
          )}
          <button
            onClick={() => myExitRequest?.status === "APPROVED" ? setExitApprovedModalOpen(true) : setEmergencyModalOpen(true)}
            disabled={myExitRequest?.status === "PENDING"}
            className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626" }}>
            ⚠ {myExitRequest?.status === "PENDING" ? "Pending…" : myExitRequest?.status === "APPROVED" ? "Approved ✓" : "Emergency"}
          </button>
          <button onClick={() => openScorecard(currentMember.member_id)}
            className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            style={{ background: "#eef2ff", border: "1px solid #c7d2fe", color: "#4f46e5" }}>
            <Award className="w-3.5 h-3.5" /> Scorecard
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          MAIN GRID: Camera | Stats+Transcript | Alerts+Score
          ══════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "250px 1fr 280px", gap: 8, overflow: "hidden" }}>

        {/* ── COL 1: Physical presence camera ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 0, overflow: "hidden" }}>
          <div style={{ flex: 1, minHeight: 0, borderRadius: 14, overflow: "hidden", border: "1px solid #e2e5eb" }}>
            <MemberSelfCamera
              memberId={currentMember.member_id}
              seatId={currentMember.seat_id}
              micId={currentMember.mic_id}
              memberName={currentMember.name}
            />
          </div>

          {/* Seat + Relevance status under camera */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-shrink-0 overflow-hidden">
            {/* Relevance */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" style={{ color: "#059669" }} />
                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">Relevance</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black font-mono" style={{ color: relevColor }}>{relevancePct}%</span>
                {pill(relevancePct >= 70 ? "OK" : "LOW", relevancePct >= 70 ? "#f0fdf4" : "#fef2f2", relevancePct >= 70 ? "#6ee7b7" : "#fca5a5", relevColor)}
              </div>
            </div>
            {/* Seat */}
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-1.5">
                <Armchair className="w-3.5 h-3.5" style={{ color: "#0284c7" }} />
                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">Seat</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" style={{ color: seatColor }} />
                {pill(isMoved ? "MOVED" : "OK", isMoved ? "#fef2f2" : "#f0fdf4", isMoved ? "#fca5a5" : "#6ee7b7", seatColor)}
              </div>
            </div>
          </div>
        </div>

        {/* ── COL 2: Live speech transcript ── */}
        <div style={{ minHeight: 0, overflow: "hidden", borderRadius: 14, border: "1px solid #e2e5eb" }}>
          <LiveTranscript textOnly={true} />
        </div>

        {/* ── COL 3: Alerts + Performance score ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 0, overflow: "hidden" }}>

          {/* Disciplinary alerts */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm"
            style={{ flex: "1 1 0", minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[11px] font-bold text-gray-800 uppercase tracking-wide">Conduct Alerts</span>
              </div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${notifications.length > 0 ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                {notifications.length} Active
              </span>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }} className="p-2 space-y-1.5">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-1.5 py-4">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <p className="text-[11px] text-gray-400 italic">Conduct compliant</p>
                </div>
              ) : notifications.map((n) => (
                <div key={n.id} className="p-2 rounded-lg bg-gray-50 border border-gray-200 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800 text-[11px] leading-snug">{n.title}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-snug line-clamp-2">{n.description || n.member_audio_message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance score card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-shrink-0 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-indigo-500" /> Score
              </span>
              <span className="text-xl font-black font-mono" style={{ color: overallScore >= 80 ? "#059669" : overallScore >= 60 ? "#d97706" : "#dc2626" }}>
                {overallScore}<span className="text-sm text-gray-400">/100</span>
              </span>
            </div>

            <div className="w-full h-2 rounded-full overflow-hidden mb-2" style={{ background: "#f1f3f6" }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${overallScore}%`, background: overallScore >= 80 ? "#059669" : overallScore >= 60 ? "#d97706" : "#dc2626" }} />
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-100">
                <p className="font-bold text-emerald-700 mb-1">+ Positive</p>
                <p className="text-gray-700">Relevance: {pos?.agenda_relevance_points ?? 0} pts</p>
                <p className="text-gray-700">Proposals: {pos?.constructive_proposals_points ?? 0} pts</p>
                <p className="text-gray-700">Decorum: {pos?.decorum_conduct_bonus ?? 0} pts</p>
              </div>
              <div className="bg-red-50 rounded-lg p-2 border border-red-100">
                <p className="font-bold text-red-700 mb-1">− Deductions</p>
                <p className="text-gray-700">Off-topic: {(neg as any)?.off_topic_speech_deduction ?? (neg as any)?.off_topic_digression_deduction ?? 0} pts</p>
                <p className="text-gray-700">Offensive: {(neg as any)?.offensive_language_deduction ?? 0} pts</p>
                <p className="text-gray-700">Movement: {(neg as any)?.disruptive_movement_deduction ?? 0} pts</p>
              </div>
            </div>
          </div>

          {/* Floor status */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-shrink-0 px-3 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isSpeaking ? "bg-emerald-400 animate-pulse" : myHandRaised ? "bg-amber-400 animate-pulse" : "bg-gray-300"}`} />
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">
                  {isSpeaking ? "You hold the floor"
                    : myHandRaised ? "Awaiting Chair recognition"
                    : telemetry?.active_speaker?.name ? `${telemetry.active_speaker.name} speaking`
                    : "Floor open"}
                </p>
                <p className="text-[10px] text-gray-400 truncate">
                  {isSpeaking ? "Mic live · timer running"
                    : myHandRaised ? "Withdraw to cancel request"
                    : "Raise hand to request the floor"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <EmergencyExitModal
        isOpen={emergencyModalOpen}
        onClose={() => setEmergencyModalOpen(false)}
        emergencyType={emergencyType}
        onEmergencyTypeChange={setEmergencyType}
        onSubmit={handleEmergencySubmit}
      />
      <EmergencyExitApprovedModal
        isOpen={exitApprovedModalOpen || (sessionActive && myExitRequest?.status === "APPROVED")}
        request={myExitRequest}
        currentMember={currentMember}
        onLogout={logout}
        countdownSeconds={5}
      />
    </div>
  );
}
