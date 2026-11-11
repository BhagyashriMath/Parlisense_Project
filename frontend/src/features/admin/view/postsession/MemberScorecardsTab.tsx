import React from 'react';
import { MemberSessionSummary } from '../../../../shared/types';
import { SearchBar } from '../../../../components/common/SearchBar';
import { Card } from '../../../../components/common/Card';
import { Badge } from '../../../../components/common/Badge';
import { Button } from '../../../../components/common/Button';
import { Award, BookOpen, Lightbulb, Users } from 'lucide-react';

interface MemberScorecardsTabProps {
  members: MemberSessionSummary[];
  filterText: string;
  onFilterChange: (text: string) => void;
  onOpenScorecard: (memberId: string) => void;
}

export const MemberScorecardsTab: React.FC<MemberScorecardsTabProps> = ({
  members,
  filterText,
  onFilterChange,
  onOpenScorecard
}) => {
  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-gray-200">
        <SearchBar
          value={filterText}
          onChange={onFilterChange}
          placeholder="Search by MP name, seat, ID, or keyword..."
          className="flex-1 max-w-md"
        />

        <div className="text-xs text-gray-500 flex items-center gap-2">
          <span className="font-bold text-gray-800">{members.length} Members Listed</span>
          <Badge variant="success">+ Positive Marks</Badge>
          <Badge variant="danger">- Deductions</Badge>
        </div>
      </div>

      {/* Grid of Modular Member Cards */}
      {members.length === 0 ? (
        <div className="p-8 text-center rounded-xl bg-white border border-gray-200 text-gray-500">
          <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-700">No Members Match the Current Filter</p>
          <p className="text-xs text-gray-400 mt-1">Try refining or clearing your search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {members.map((m) => {
          const pos = m.positive_marks || {
            agenda_relevance_points: 0,
            constructive_proposals_points: 0,
            foundational_discussion_points: 0,
            decorum_conduct_bonus: 0,
            total_positive_marks: 0
          };
          const neg = m.negative_deductions || {
            speaking_time_overage_deduction: 0,
            off_topic_speech_deduction: 0,
            interruptions_cross_talk_deduction: 0,
            disruptive_movement_deduction: 0,
            offensive_language_deduction: 0,
            excessive_noise_deduction: 0,
            high_noise_instigation_deduction: 0,
            total_negative_deductions: 0
          };
          const summary = m.member_summary || {
            discussion_summary: "No recorded speech data for this session.",
            subject_title: "No topic data recorded",
            subject_notes_points: [],
            major_ideas_raised: [],
            policy_keywords: []
          };

          return (
            <Card
              key={m.member_id}
              className="p-3.5 bg-white border-gray-200 hover:border-gray-300 transition-all flex flex-col justify-between gap-3 shadow-sm"
            >
              {/* Card Header: Seat, Name, Role, Score & Launcher */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 border border-amber-500/40 flex items-center justify-center text-white font-bold text-xs shadow-md">
                    {m.seat_id}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5 leading-tight">
                      <span>{m.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white text-amber-700 border border-gray-200">
                        {m.mic_id || `MIC-${m.seat_id}`}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                      {m.role || "Member of Parliament"} • {m.party || "NDF"} • Floor Time:{" "}
                      <strong className="text-gray-800">{m.speaking_time_formatted}</strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="text-right">
                    <div className="text-sm font-black font-mono text-amber-400 leading-none">
                      {m.final_score} <span className="text-[10px] text-gray-400 font-normal">/ 100</span>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-tight block mt-0.5">
                      {m.grade}
                    </span>
                  </div>

                  <Button
                    variant="gold"
                    size="sm"
                    onClick={() => onOpenScorecard(m.member_id)}
                    icon={<Award className="w-3.5 h-3.5" />}
                  >
                    Scorecard
                  </Button>
                </div>
              </div>

              {/* Side-by-Side: Positive Marks vs Deductions */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Positive Sub-Box */}
                <div className="p-2.5 rounded-lg bg-emerald-50/20 border border-emerald-800/40 flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-1 border-b border-emerald-900/40 mb-1">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                      + Positive Marks
                    </span>
                    <span className="font-mono text-[10px] font-bold text-emerald-400">
                      +{pos.total_positive_marks} pts
                    </span>
                  </div>
                  <div className="space-y-0.5 text-[10px] text-gray-700 font-mono">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Relevance:</span>
                      <span className="text-emerald-400 font-bold">+{pos.agenda_relevance_points}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Proposals:</span>
                      <span className="text-emerald-400 font-bold">+{pos.constructive_proposals_points}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Debate Quality:</span>
                      <span className="text-emerald-400 font-bold">+{pos.foundational_discussion_points}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Decorum Bonus:</span>
                      <span className="text-emerald-400 font-bold">+{pos.decorum_conduct_bonus}</span>
                    </div>
                  </div>
                </div>

                {/* Negative Sub-Box */}
                <div className="p-2.5 rounded-lg bg-red-50/20 border border-rose-800/40 flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-1 border-b border-rose-900/40 mb-1">
                    <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider">
                      - Deductions
                    </span>
                    <span className="font-mono text-[10px] font-bold text-rose-400">
                      {neg.total_negative_deductions === 0 ? "0 pts" : `-${neg.total_negative_deductions} pts`}
                    </span>
                  </div>
                  <div className="space-y-0.5 text-[10px] text-gray-700 font-mono">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Time Overage:</span>
                      <span className="text-rose-400 font-bold">
                        {neg.speaking_time_overage_deduction > 0 ? `-${neg.speaking_time_overage_deduction}` : "0"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Off-Topic:</span>
                      <span className="text-rose-400 font-bold">
                        {neg.off_topic_speech_deduction > 0 ? `-${neg.off_topic_speech_deduction}` : "0"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Cross-talk:</span>
                      <span className="text-rose-400 font-bold">
                        {neg.interruptions_cross_talk_deduction > 0 ? `-${neg.interruptions_cross_talk_deduction}` : "0"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Movement/Lang:</span>
                      <span className="text-rose-400 font-bold">
                        {(neg.disruptive_movement_deduction || 0) + (neg.offensive_language_deduction || 0) > 0
                          ? `-${(neg.disruptive_movement_deduction || 0) + (neg.offensive_language_deduction || 0)}`
                          : "0"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subject Notes */}
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200/90 space-y-1.5">
                <div className="flex items-center justify-between pb-1 border-b border-gray-200/70">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    Subject Notes & Discussion Points
                  </span>
                  {summary.subject_title && (
                    <Badge variant="gold">{summary.subject_title}</Badge>
                  )}
                </div>

                <div className="space-y-1.5 text-[11px] text-gray-800">
                  {(summary.subject_notes_points && summary.subject_notes_points.length > 0
                    ? summary.subject_notes_points
                    : summary.discussion_summary
                        .split(". ")
                        .filter((s) => s.trim().length > 0)
                        .map((s) => (s.endsWith(".") ? s : `${s}.`))
                  ).map((notePt, pIdx) => {
                    const colonIdx = notePt.indexOf(":");
                    const hasColon = colonIdx > 0 && colonIdx < 35;
                    return (
                      <div key={pIdx} className="flex items-start gap-1.5">
                        <span className="text-amber-400 font-bold flex-shrink-0 mt-0.5">•</span>
                        <p className="leading-snug">
                          {hasColon ? (
                            <>
                              <strong className="text-amber-800 font-semibold">
                                {notePt.substring(0, colonIdx)}:
                              </strong>
                              <span className="text-gray-700">{notePt.substring(colonIdx + 1)}</span>
                            </>
                          ) : (
                            <span className="text-gray-700">{notePt}</span>
                          )}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Specific Policy Proposals */}
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200/90 space-y-1.5">
                <div className="flex items-center justify-between pb-1 border-b border-gray-200/70">
                  <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5" />
                    Specific Policy Proposals & Interventions
                  </span>
                  <span className="text-[10px] font-mono text-gray-500">
                    {summary.major_ideas_raised.length} Points
                  </span>
                </div>
                <div className="space-y-1">
                  {summary.major_ideas_raised.map((idea, iIdx) => (
                    <div
                      key={iIdx}
                      className="p-2 rounded bg-white border border-gray-200/70 flex items-start gap-2 text-[11px] text-gray-800"
                    >
                      <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-700 font-mono font-bold text-[9px] flex items-center justify-center flex-shrink-0 mt-0.5 border border-sky-500/30">
                        {iIdx + 1}
                      </span>
                      <span className="leading-tight">{idea}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      )}
    </div>
  );
};
