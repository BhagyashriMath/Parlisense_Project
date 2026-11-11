import React from "react";
import { useParliament } from "../../../infrastructure/context/ParliamentContext";
import { Users, Mic, AlertCircle } from "lucide-react";

export function SeatMap() {
  const { telemetry, members, switchSpeaker, openScorecard } = useParliament();
  const seatStatus = telemetry?.vision_telemetry?.seat_status || {};
  const activeSpeakerId = telemetry?.active_speaker?.member_id;

  // Split seats into Treasury (left) and Opposition (right)
  const treasuryMembers = members.filter((_, idx) => idx % 2 === 0);
  const oppositionMembers = members.filter((_, idx) => idx % 2 === 1);

  return (
    <div id="parliament-seat-map" className="bg-white rounded-lg border border-gray-200 p-2 shadow-sm flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded bg-gray-100 text-amber-400 border border-gray-300">
            <Users className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider leading-none">
              Chamber Seating Matrix
            </h3>
            <p className="text-[9px] text-gray-400 leading-none mt-0.5">Live seat status & floor assignment</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px]">
          <span className="flex items-center gap-1 text-gray-700">
            <span className="w-2 h-2 rounded-sm bg-emerald-500" /> Gov
          </span>
          <span className="flex items-center gap-1 text-gray-700">
            <span className="w-2 h-2 rounded-sm bg-indigo-500" /> Opp
          </span>
          <span className="flex items-center gap-1 text-gray-700">
            <span className="w-2 h-2 rounded-sm bg-rose-500" /> Alert
          </span>
        </div>
      </div>

      {/* Speaker Podium Header */}
      <div className="mb-1.5 flex flex-col items-center flex-shrink-0">
        <div className="px-3 py-0.5 rounded bg-amber-50/40 border border-amber-500/40 text-amber-700 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
          <span>🏛️ SPEAKER PRESIDING CHAIR</span>
        </div>
      </div>

      {/* Seating Benches Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-1.5 pr-0.5">
        {/* Treasury Bench */}
        <div className="bg-gray-50 p-1.5 rounded border border-gray-200/80 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-emerald-400">TREASURY (GOV)</span>
            <span className="text-[9px] text-gray-400 font-mono">{treasuryMembers.length} MPs</span>
          </div>

          <div className="space-y-1 overflow-y-auto flex-1 min-h-0 pr-0.5">
            {treasuryMembers.map((m) => {
              const info = seatStatus[m.seat_id];
              const isSpeaker = m.member_id === activeSpeakerId;
              const isDisplaced = info?.movementStatus?.includes("Well Rush") || info?.movementStatus?.includes("Moved");

              return (
                <div
                  key={m.member_id}
                  onClick={() => openScorecard(m.member_id)}
                  className={`p-1.5 rounded border text-left cursor-pointer transition-all flex items-center justify-between gap-1.5 ${
                    isDisplaced
                      ? "bg-red-50/40 border-rose-600/80 hover:bg-rose-900/50"
                      : isSpeaker
                      ? "bg-emerald-50/50 border-emerald-500 ring-1 ring-emerald-400"
                      : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="text-[9px] font-mono font-bold px-1 py-0.5 rounded bg-gray-100 text-gray-700 flex-shrink-0">
                      {m.seat_id}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-bold text-gray-900 truncate block">
                          {m.name}
                        </span>
                        {isSpeaker && (
                          <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-emerald-500 text-slate-950 flex items-center gap-0.5 flex-shrink-0 animate-pulse">
                            <Mic className="w-2 h-2" /> MIC
                          </span>
                        )}
                        {isDisplaced && (
                          <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-rose-500 text-white flex items-center gap-0.5 flex-shrink-0 animate-bounce">
                            <AlertCircle className="w-2 h-2" />
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-gray-500 truncate block">
                        {m.role || m.party}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      switchSpeaker(m.member_id);
                    }}
                    className="px-2 py-0.5 text-[9px] font-semibold rounded bg-gray-100 hover:bg-emerald-600 text-gray-700 hover:text-white transition-colors flex-shrink-0 whitespace-nowrap"
                    title="Give Floor Microphone"
                  >
                    Floor 🎤
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Opposition Bench */}
        <div className="bg-gray-50 p-1.5 rounded border border-gray-200/80 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-indigo-400">OPPOSITION</span>
            <span className="text-[9px] text-gray-400 font-mono">{oppositionMembers.length} MPs</span>
          </div>

          <div className="space-y-1 overflow-y-auto flex-1 min-h-0 pr-0.5">
            {oppositionMembers.map((m) => {
              const info = seatStatus[m.seat_id];
              const isSpeaker = m.member_id === activeSpeakerId;
              const isDisplaced = info?.movementStatus?.includes("Well Rush") || info?.movementStatus?.includes("Moved");

              return (
                <div
                  key={m.member_id}
                  onClick={() => openScorecard(m.member_id)}
                  className={`p-1.5 rounded border text-left cursor-pointer transition-all flex items-center justify-between gap-1.5 ${
                    isDisplaced
                      ? "bg-red-50/40 border-rose-600/80 hover:bg-rose-900/50"
                      : isSpeaker
                      ? "bg-indigo-50/50 border-indigo-500 ring-1 ring-indigo-400"
                      : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="text-[9px] font-mono font-bold px-1 py-0.5 rounded bg-gray-100 text-gray-700 flex-shrink-0">
                      {m.seat_id}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-bold text-gray-900 truncate block">
                          {m.name}
                        </span>
                        {isSpeaker && (
                          <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-indigo-500 text-white flex items-center gap-0.5 flex-shrink-0 animate-pulse">
                            <Mic className="w-2 h-2" /> MIC
                          </span>
                        )}
                        {isDisplaced && (
                          <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-rose-500 text-white flex items-center gap-0.5 flex-shrink-0 animate-bounce">
                            <AlertCircle className="w-2 h-2" />
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-gray-500 truncate block">
                        {m.role || m.party}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      switchSpeaker(m.member_id);
                    }}
                    className="px-2 py-0.5 text-[9px] font-semibold rounded bg-gray-100 hover:bg-indigo-600 text-gray-700 hover:text-white transition-colors flex-shrink-0 whitespace-nowrap"
                    title="Give Floor Microphone"
                  >
                    Floor 🎤
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
