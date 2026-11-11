import React from 'react';
import { Mic, MicOff, Flag, Volume2, ShieldAlert, FileText, Play, Pause, Calendar, User } from 'lucide-react';
import { SessionTelemetry } from '../../../../shared/types';

interface SpeakerHeaderBarProps {
  activeSpeaker: SessionTelemetry["active_speaker"] | undefined;
  speakingTime: number;
  timeRemaining: number;
  timePercent: number;
  isTimeOver: boolean;
  relevancePct: number;
  noiseLevel: number;
  totalViolations: number;
  sessionActive?: boolean;
  isPaused?: boolean;
  isEndingSession?: boolean;
  isStartingSession?: boolean;
  isMicActive?: boolean;
  onToggleMic?: () => void;
  onOpenReport?: () => void;
  onEndSession: () => void;
  onStartSession?: () => void;
  onTogglePause?: () => void;
  onOpenSchedule?: () => void;
}

export const SpeakerHeaderBar: React.FC<SpeakerHeaderBarProps> = ({
  activeSpeaker, speakingTime, timePercent, isTimeOver, relevancePct, noiseLevel,
  totalViolations, sessionActive = true, isPaused = false, isEndingSession = false,
  isStartingSession = false, isMicActive = false, onToggleMic,
  onOpenReport, onEndSession, onStartSession, onTogglePause, onOpenSchedule
}) => {
  const DIVIDER = { borderRight: "1px solid #e2e5eb" };

  return (
    <div className="flex-shrink-0 overflow-hidden flex flex-col md:flex-row rounded-2xl"
      style={{ background: "#ffffff", border: "1px solid #e2e5eb", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>

      {/* ── Identity ── */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0 md:min-w-[190px]"
        style={{ ...DIVIDER, background: "#f8f9fb" }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "#eef2ff", border: "1.5px solid #c7d2fe" }}>
          <User className="w-5 h-5" style={{ color: "#4f46e5" }} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#8a93a6" }}>
            Presiding Officer
          </p>
          <p className="text-sm font-bold" style={{ color: "#1a1f2e", fontFamily: "'Playfair Display', serif" }}>
            Hon. Speaker
          </p>
          {onToggleMic && (
            <button onClick={onToggleMic} id="speaker-dais-mic-btn"
              className="mt-1 px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
              style={isMicActive
                ? { background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626" }
                : { background: "#f0fdf4", border: "1px solid #6ee7b7", color: "#059669" }}>
              {isMicActive
                ? <><MicOff className="w-2.5 h-2.5" /><span>Mic LIVE</span></>
                : <><Mic className="w-2.5 h-2.5" /><span>Enable Mic</span></>}
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
        style={{ borderTop: "1px solid #e2e5eb" }}>

        {/* Floor Speaker */}
        <div className="px-3 py-2.5 flex flex-col justify-between" style={DIVIDER}>
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#bcc2ce" }}>Floor Speaker</span>
          <div className="flex items-center gap-1.5 mt-1 min-w-0">
            <span className="flex-shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-black font-mono flex items-center gap-0.5"
              style={{ background: "#f0fdf4", border: "1px solid #6ee7b7", color: "#059669" }}>
              <Mic className="w-2.5 h-2.5" />{activeSpeaker?.seat_id || "—"}
            </span>
            <span className="text-xs font-bold truncate" style={{ color: "#1a1f2e" }}>
              {activeSpeaker?.name || "No speaker"}
            </span>
          </div>
          <p className="text-[10px] truncate mt-0.5" style={{ color: "#bcc2ce" }}>{activeSpeaker?.party || "Awaiting"}</p>
        </div>

        {/* Floor Time */}
        <div className="px-3 py-2.5 flex flex-col justify-between" style={DIVIDER}>
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#bcc2ce" }}>Floor Time</span>
          <span className="text-base font-black font-mono mt-1"
            style={{ color: isTimeOver ? "#dc2626" : "#1a1f2e" }}>
            {Math.floor(speakingTime / 60)}:{String(speakingTime % 60).padStart(2, "0")}
          </span>
          <div className="w-full h-1.5 rounded-full mt-1 overflow-hidden" style={{ background: "#f1f3f6" }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, timePercent)}%`,
                background: isTimeOver ? "#dc2626" : timePercent > 80 ? "#d97706" : "#4f46e5"
              }} />
          </div>
        </div>

        {/* AI Relevance */}
        <div className="px-3 py-2.5 flex flex-col justify-between" style={DIVIDER}>
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#bcc2ce" }}>Relevance</span>
          <span className="text-base font-black font-mono mt-1"
            style={{ color: relevancePct >= 70 ? "#059669" : relevancePct >= 40 ? "#d97706" : "#dc2626" }}>
            {relevancePct}%
          </span>
          <p className="text-[10px] mt-0.5" style={{ color: "#bcc2ce" }}>Agenda alignment</p>
        </div>

        {/* Noise */}
        <div className="px-3 py-2.5 flex flex-col justify-between" style={DIVIDER}>
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#bcc2ce" }}>Noise</span>
          <div className="flex items-center gap-1.5 mt-1">
            <Volume2 className="w-4 h-4" style={{ color: noiseLevel > 78 ? "#dc2626" : "#0284c7" }} />
            <span className="text-base font-black font-mono" style={{ color: "#1a1f2e" }}>{noiseLevel} dB</span>
          </div>
          <p className="text-[10px] mt-0.5" style={{ color: "#bcc2ce" }}>
            {noiseLevel > 78 ? "⚠ Above threshold" : noiseLevel > 0 ? "Normal" : "Idle"}
          </p>
        </div>

        {/* Infractions + Actions */}
        <div className="px-3 py-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#bcc2ce" }}>Infractions</span>
            <div className="flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" style={{ color: totalViolations > 0 ? "#d97706" : "#bcc2ce" }} />
              <span className="text-sm font-black font-mono"
                style={{ color: totalViolations > 0 ? "#d97706" : "#bcc2ce" }}>{totalViolations}</span>
            </div>
          </div>

          {sessionActive ? (
            <div className="flex items-center gap-1.5">
              <button onClick={onTogglePause} id="speaker-pause-session-btn"
                className="flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
                style={isPaused
                  ? { background: "#f0fdf4", border: "1px solid #6ee7b7", color: "#059669" }
                  : { background: "#fffbeb", border: "1px solid #fcd34d", color: "#d97706" }}>
                {isPaused ? <><Play className="w-3 h-3 fill-current" /><span>Resume</span></>
                  : <><Pause className="w-3 h-3 fill-current" /><span>Pause</span></>}
              </button>
              <button onClick={onEndSession} id="speaker-end-session-btn"
                disabled={isEndingSession}
                className="flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 transition-all"
                style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626" }}>
                <Flag className="w-3 h-3" />
                <span>{isEndingSession ? "Ending…" : "End"}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              {onOpenReport && (
                <button onClick={onOpenReport}
                  className="flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  style={{ background: "#f8f9fb", border: "1px solid #e2e5eb", color: "#4b5468" }}>
                  <FileText className="w-3 h-3" /><span>Report</span>
                </button>
              )}
              <button onClick={onOpenSchedule}
                className="flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                style={{ background: "#eff6ff", border: "1px solid #93c5fd", color: "#2563eb" }}>
                <Calendar className="w-3 h-3" /><span>Schedule</span>
              </button>
              <button onClick={onStartSession} disabled={isStartingSession}
                className="flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 text-white"
                style={{ background: "#4f46e5" }}>
                <Play className="w-3 h-3 fill-current" />
                <span>{isStartingSession ? "Starting…" : "Start"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
