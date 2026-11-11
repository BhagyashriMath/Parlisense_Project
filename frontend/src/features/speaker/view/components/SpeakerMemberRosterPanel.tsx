import React from 'react';
import { MemberSessionSummary } from '../../../../shared/types';
import { MemberDisciplineState } from '../../model/speaker.types';
import { SearchBar } from '../../../../components/common/SearchBar';
import { Button } from '../../../../components/common/Button';
import { Badge } from '../../../../components/common/Badge';
import { Award, PlusCircle, MinusCircle, Mic, RotateCcw, ShieldAlert, Ban, Crown } from 'lucide-react';

interface SpeakerMemberRosterPanelProps {
  members: MemberSessionSummary[];
  filterText: string;
  onFilterChange: (text: string) => void;
  activeSpeakerId: string | undefined;
  disciplineMap: Record<string, MemberDisciplineState>;
  onSwitchSpeaker: (memberId: string) => void;
  onOpenScorecard: (memberId: string) => void;
  onRevokeSuspension?: (memberId: string, memberName?: string) => void;
  onSuspendMember?: (memberId: string, memberName: string, seatId: string) => void;
  currentUserId?: string;
  currentUserName?: string;
  currentUserRole?: string;
}

export const SpeakerMemberRosterPanel: React.FC<SpeakerMemberRosterPanelProps> = ({
  members,
  filterText,
  onFilterChange,
  activeSpeakerId,
  disciplineMap,
  onSwitchSpeaker,
  onOpenScorecard,
  onRevokeSuspension,
  onSuspendMember,
  currentUserId,
  currentUserName,
  currentUserRole
}) => {
  const suspendedCount = members.filter((m) => {
    const discipline = disciplineMap[m.member_id] || { warnings: 0, suspended: false };
    return discipline.suspended || m.presence === "Suspended" || (m as any).status === "SUSPENDED";
  }).length;

  return (
    <div className="h-full flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header & Search */}
      <div className="p-2.5 border-b border-gray-200 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              Parliamentary Members Roster
            </h3>
            {suspendedCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-red-700 border border-rose-500/40 animate-pulse">
                {suspendedCount} Suspended
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono text-gray-500 font-semibold">
            {members.length} Members
          </span>
        </div>

        <SearchBar
          value={filterText}
          onChange={onFilterChange}
          placeholder="Filter by MP name or seat..."
        />
      </div>

      {/* Scrollable Members List */}
      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-800/60 p-1 pr-1.5">
        {members.map((m) => {
          const isActive = m.seat_id === activeSpeakerId;
          const discipline = disciplineMap[m.member_id] || { warnings: 0, suspended: false };
          const isMemberSuspended = discipline.suspended || m.presence === "Suspended" || (m as any).status === "SUSPENDED";
          const isChairperson =
            m.role?.toLowerCase().includes("speaker") ||
            m.role?.toLowerCase().includes("presiding") ||
            m.seat_id === "CHAMBER-DAIS" ||
            m.seat_id === "SPEAKER" ||
            (currentUserRole === "speaker" && (
              m.member_id === currentUserId ||
              (currentUserName && m.name.toLowerCase() === currentUserName.toLowerCase())
            ));

          return (
            <div
              key={m.member_id}
              className={`p-2.5 rounded-lg transition-all flex flex-col gap-1.5 ${
                isMemberSuspended
                  ? "bg-red-50/30 border border-rose-700/60 shadow-sm"
                  : isChairperson
                  ? "bg-amber-50/15 border border-amber-600/30"
                  : isActive
                  ? "bg-amber-50/20 border border-amber-500/40"
                  : "hover:bg-gray-100/40"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant={isMemberSuspended ? "danger" : isChairperson || isActive ? "gold" : "neutral"} className="font-mono flex-shrink-0">
                    {isChairperson ? "CHAIR" : m.seat_id}
                  </Badge>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-gray-800 truncate max-w-[130px] sm:max-w-[200px] lg:max-w-[130px] xl:max-w-none">
                        {m.name}
                      </span>
                      {isChairperson && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 border border-amber-500/40 font-mono uppercase tracking-wide flex items-center gap-1">
                          <Crown className="w-2.5 h-2.5 text-amber-400" />
                          <span>Presiding Officer</span>
                        </span>
                      )}
                      {isMemberSuspended && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/30 text-red-800 border border-rose-500/50 font-mono uppercase tracking-wide">
                          SUSPENDED
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono block truncate">
                      {isChairperson ? "Presiding Officer / Speaker" : `${m.party || "Ind."} • ${m.speaking_time_formatted}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {isChairperson ? (
                    <span className="text-[10px] text-amber-400/90 font-mono font-bold px-2 py-0.5 bg-amber-50/40 rounded border border-amber-500/30">
                      Speaker
                    </span>
                  ) : isMemberSuspended ? (
                    onRevokeSuspension && (
                      <button
                        onClick={() => onRevokeSuspension(m.member_id, m.name)}
                        className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm border border-emerald-400/50"
                        title="Cancel suspension and reinstate member to chamber floor"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>Cancel Suspension</span>
                      </button>
                    )
                  ) : (
                    <>
                      {!isActive && (
                        <button
                          onClick={() => onSwitchSpeaker(m.member_id)}
                          className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Recognize Speaker & Grant Floor"
                        >
                          <Mic className="w-2.5 h-2.5 text-amber-400" />
                          <span>Floor</span>
                        </button>
                      )}
                      {onSuspendMember && (
                        <button
                          onClick={() => onSuspendMember(m.member_id, m.name, m.seat_id)}
                          className="px-2 py-1 rounded bg-red-50/60 hover:bg-rose-900 text-red-700 hover:text-white border border-rose-800/70 text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Direct Speaker Disciplinary Suspension (Rule 374)"
                        >
                          <Ban className="w-2.5 h-2.5 text-rose-400" />
                          <span>Suspend</span>
                        </button>
                      )}
                    </>
                  )}
                  <button
                    onClick={() => onOpenScorecard(m.member_id)}
                    className="p-1 rounded bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 transition-colors cursor-pointer"
                    title="View Scorecard"
                  >
                    <Award className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Warnings and Score row */}
              <div className="flex items-center justify-between text-[10px] pt-1 border-t border-gray-200/40 font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400">Warnings:</span>
                  <span
                    className={`font-bold ${
                      discipline.warnings >= 3
                        ? "text-rose-400"
                        : discipline.warnings > 0
                        ? "text-amber-400"
                        : "text-gray-500"
                    }`}
                  >
                    {discipline.warnings} / 3
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">Score:</span>
                  <span className="font-bold text-amber-400">{m.final_score}</span>
                  <span className="text-gray-400 text-[9px]">({m.grade})</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
