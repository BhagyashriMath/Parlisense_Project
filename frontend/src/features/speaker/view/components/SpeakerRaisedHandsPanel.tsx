import React from 'react';
import { SpeakingRequest } from '../../../../shared/types';
import { Hand, Mic, X, LogOut } from 'lucide-react';

interface SpeakerRaisedHandsPanelProps {
  requests: SpeakingRequest[];
  activeSpeakerId: string | undefined;
  isSessionActive: boolean;
  onGrant: (memberId: string) => void;
  onReject: (memberId: string) => void;
  onReleaseFloor?: () => void;
}

export const SpeakerRaisedHandsPanel: React.FC<SpeakerRaisedHandsPanelProps> = ({
  requests, activeSpeakerId, isSessionActive, onGrant, onReject, onReleaseFloor
}) => {
  const wait = (ts: number) => {
    const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  return (
    <div className="flex-shrink-0 rounded-2xl overflow-hidden"
      style={{ background: "#ffffff", border: "1px solid #e2e5eb", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5"
        style={{ borderBottom: "1px solid #e2e5eb", background: "#f8f9fb" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "#eef2ff", border: "1px solid #c7d2fe" }}>
            <Hand className="w-3.5 h-3.5" style={{ color: "#4f46e5" }} />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#1a1f2e" }}>
            Requests to Speak
          </h3>
          {requests.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black"
              style={{ background: "#fffbeb", border: "1px solid #fcd34d", color: "#d97706" }}>
              {requests.length}
            </span>
          )}
        </div>
        {onReleaseFloor && activeSpeakerId && (
          <button onClick={onReleaseFloor}
            className="px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
            style={{ background: "#f8f9fb", border: "1px solid #e2e5eb", color: "#4b5468" }}>
            <LogOut className="w-3 h-3" /><span>Release Floor</span>
          </button>
        )}
      </div>

      {/* List */}
      <div className="space-y-1.5 p-2 max-h-44 overflow-y-auto">
        {requests.length === 0 ? (
          <div className="flex flex-col items-center py-5 gap-1.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "#f4f6f9", border: "1px solid #e2e5eb" }}>
              <Hand className="w-4 h-4" style={{ color: "#bcc2ce" }} />
            </div>
            <p className="text-xs text-center" style={{ color: "#bcc2ce" }}>
              {isSessionActive ? "No members seeking the floor" : "Session must be live"}
            </p>
          </div>
        ) : (
          requests.map((r) => (
            <div key={r.member_id}
              className="rounded-xl flex items-center justify-between gap-2 px-3 py-2"
              style={{ background: "#fefce8", border: "1px solid #fde68a" }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-black text-xs font-mono"
                  style={{ background: "#fef3c7", border: "1px solid #fcd34d", color: "#d97706" }}>
                  {r.seat_id?.replace(/\D/g, "") || "?"}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: "#1a1f2e" }}>{r.name}</p>
                  <p className="text-[10px] font-mono" style={{ color: "#8a93a6" }}>
                    {r.seat_id} · {wait(r.requested_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => onGrant(r.member_id)}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 cursor-pointer text-white"
                  style={{ background: "#4f46e5", boxShadow: "0 2px 8px rgba(79,70,229,0.30)" }}>
                  <Mic className="w-3 h-3" /><span>Grant</span>
                </button>
                <button onClick={() => onReject(r.member_id)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all"
                  style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626" }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
