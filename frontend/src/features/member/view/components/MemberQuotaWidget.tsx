import React from 'react';
import { Clock, Activity, Armchair, ShieldCheck } from 'lucide-react';

interface MemberQuotaWidgetProps {
  allocatedSeconds: number;
  usedSeconds: number;
  remainingSeconds: number;
  timePercent: number;
  isQuotaExhausted: boolean;
  isWarningZone: boolean;
  relevancePct: number;
  isMoved: boolean;
  seatInfo: any;
}

const CARD: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e2e5eb",
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  borderRadius: 16,
  padding: "14px 16px"
};

export const MemberQuotaWidget: React.FC<MemberQuotaWidgetProps> = ({
  allocatedSeconds, usedSeconds, remainingSeconds, timePercent,
  isQuotaExhausted, isWarningZone, relevancePct, isMoved, seatInfo
}) => {
  const timeColor = isQuotaExhausted ? "#dc2626" : isWarningZone ? "#d97706" : "#059669";
  const barColor  = isQuotaExhausted ? "#dc2626" : isWarningZone ? "#d97706" : "#4f46e5";
  const relevColor = relevancePct >= 70 ? "#059669" : relevancePct >= 40 ? "#d97706" : "#dc2626";
  const seatColor  = isMoved ? "#dc2626" : "#059669";

  const pill = (label: string, bg: string, border: string, color: string) => (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: bg, border: `1px solid ${border}`, color }}>{label}</span>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">

      {/* Floor Time */}
      <div style={CARD}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: "#eef2ff", border: "1px solid #c7d2fe" }}>
              <Clock className="w-3.5 h-3.5" style={{ color: "#4f46e5" }} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#8a93a6" }}>Floor Time</span>
          </div>
          {pill(
            isQuotaExhausted ? "EXHAUSTED" : isWarningZone ? "WARNING" : "ACTIVE",
            isQuotaExhausted ? "#fef2f2" : isWarningZone ? "#fffbeb" : "#f0fdf4",
            isQuotaExhausted ? "#fca5a5" : isWarningZone ? "#fcd34d" : "#6ee7b7",
            timeColor
          )}
        </div>
        <div className="text-2xl font-black font-mono mb-2" style={{ color: timeColor }}>
          {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, "0")}
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden mb-1.5" style={{ background: "#f1f3f6" }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, timePercent)}%`, background: barColor }} />
        </div>
        <div className="flex justify-between text-[10px] font-mono" style={{ color: "#bcc2ce" }}>
          <span>Used {Math.floor(usedSeconds / 60)}:{String(usedSeconds % 60).padStart(2, "0")}</span>
          <span>Alloc {Math.floor(allocatedSeconds / 60)}m</span>
        </div>
      </div>

      {/* Agenda Relevance */}
      <div style={CARD}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: "#f0fdf4", border: "1px solid #6ee7b7" }}>
              <Activity className="w-3.5 h-3.5" style={{ color: "#059669" }} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#8a93a6" }}>Relevance</span>
          </div>
          {pill(
            relevancePct >= 70 ? "OPTIMAL" : relevancePct >= 40 ? "MARGINAL" : "OFF-TOPIC",
            relevancePct >= 70 ? "#f0fdf4" : relevancePct >= 40 ? "#fffbeb" : "#fef2f2",
            relevancePct >= 70 ? "#6ee7b7" : relevancePct >= 40 ? "#fcd34d" : "#fca5a5",
            relevColor
          )}
        </div>
        <div className="text-2xl font-black font-mono mb-2" style={{ color: relevColor }}>{relevancePct}%</div>
        <p className="text-xs" style={{ color: "#8a93a6" }}>AI agenda alignment score</p>
      </div>

      {/* Seat Status */}
      <div style={CARD}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: "#f0f9ff", border: "1px solid #7dd3fc" }}>
              <Armchair className="w-3.5 h-3.5" style={{ color: "#0284c7" }} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#8a93a6" }}>Seat Status</span>
          </div>
          {pill(
            isMoved ? (seatInfo?.status === "Absent" ? "NOT SEATED" : "OUT OF SEAT") : "COMPLIANT",
            isMoved ? "#fef2f2" : "#f0fdf4",
            isMoved ? "#fca5a5" : "#6ee7b7",
            seatColor
          )}
        </div>
        <div className="flex items-center gap-2 text-2xl font-black font-mono mb-2" style={{ color: seatColor }}>
          <ShieldCheck className="w-6 h-6" />
          <span>{isMoved ? (seatInfo?.status === "Absent" ? "Not Seated" : "Moved") : "At Bench"}</span>
        </div>
        <p className="text-xs" style={{ color: "#8a93a6" }}>Physical bench compliance</p>
      </div>
    </div>
  );
};
