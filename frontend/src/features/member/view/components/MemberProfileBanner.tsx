import React from 'react';
import { Member } from '../../../../shared/types';
import { Award, AlertTriangle, Mic } from 'lucide-react';

interface MemberProfileBannerProps {
  currentMember: Member;
  isSpeaking: boolean;
  remainingSeconds: number;
  timePercent: number;
  isWarningZone: boolean;
  isQuotaExhausted: boolean;
  myExitRequest: any;
  onOpenScorecard: (memberId: string) => void;
  onOpenEmergencyModal: () => void;
}

export const MemberProfileBanner: React.FC<MemberProfileBannerProps> = ({
  currentMember, isSpeaking, remainingSeconds, timePercent,
  isWarningZone, isQuotaExhausted, myExitRequest, onOpenScorecard, onOpenEmergencyModal
}) => {
  const timeColor = isQuotaExhausted ? "#dc2626" : isWarningZone ? "#d97706" : "#059669";
  const barColor  = isQuotaExhausted ? "#dc2626" : isWarningZone ? "#d97706" : "#4f46e5";

  return (
    <div className="flex-shrink-0 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-3.5"
      style={{ background: "#ffffff", border: "1px solid #e2e5eb", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>

      {/* Identity */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0"
          style={{ background: "#eef2ff", border: "1.5px solid #c7d2fe", color: "#4f46e5" }}>
          {currentMember.seat_id?.replace(/\D/g, "") || "?"}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-sm font-bold truncate" style={{ color: "#1a1f2e" }}>{currentMember.name}</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: "#eef2ff", border: "1px solid #c7d2fe", color: "#4f46e5" }}>
              {currentMember.seat_id}
            </span>
            {isSpeaking && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1"
                style={{ background: "#f0fdf4", border: "1px solid #6ee7b7", color: "#059669" }}>
                <Mic className="w-2.5 h-2.5" /> ON FLOOR
              </span>
            )}
          </div>
          <p className="text-xs mt-0.5 truncate" style={{ color: "#8a93a6" }}>
            {currentMember.role || "Member of Parliament"} · {currentMember.party || "NDF"}
            {currentMember.constituency ? ` · ${currentMember.constituency}` : ""}
          </p>
          <p className="flex md:hidden items-center gap-1 text-xs font-mono mt-0.5">
            <span style={{ color: "#bcc2ce" }}>Quota:</span>
            <span className="font-bold" style={{ color: timeColor }}>
              {Math.floor(remainingSeconds / 60)}m {remainingSeconds % 60}s
            </span>
          </p>
        </div>
      </div>

      {/* Desktop quota */}
      <div className="hidden md:flex items-center gap-3 rounded-xl px-3.5 py-2"
        style={{ background: "#f8f9fb", border: "1px solid #e2e5eb" }}>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#bcc2ce" }}>Remaining</p>
          <p className="text-sm font-black font-mono" style={{ color: timeColor }}>
            {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, "0")}
          </p>
        </div>
        <div className="w-20 h-2 rounded-full overflow-hidden" style={{ background: "#f1f3f6" }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, timePercent)}%`, background: barColor }} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap sm:flex-nowrap">
        <button onClick={() => onOpenScorecard(currentMember.member_id)}
          className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          style={{ background: "#eef2ff", border: "1px solid #c7d2fe", color: "#4f46e5" }}>
          <Award className="w-3.5 h-3.5" /><span>Scorecard</span>
        </button>
        <button onClick={onOpenEmergencyModal}
          disabled={myExitRequest?.status === "PENDING"}
          className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
          style={myExitRequest?.status === "APPROVED"
            ? { background: "#f0fdf4", border: "1px solid #6ee7b7", color: "#059669" }
            : { background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626" }}>
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>
            {myExitRequest?.status === "PENDING" ? "Exit Pending…"
              : myExitRequest?.status === "APPROVED" ? "Exit Approved ✓"
              : "Emergency Exit"}
          </span>
        </button>
      </div>
    </div>
  );
};
