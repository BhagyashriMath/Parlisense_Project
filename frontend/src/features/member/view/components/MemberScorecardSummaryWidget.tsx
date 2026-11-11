import React from 'react';
import { Card } from '../../../../components/common/Card';
import { Badge } from '../../../../components/common/Badge';
import { Award, BookOpen, Lightbulb } from 'lucide-react';

interface MemberScorecardSummaryWidgetProps {
  overallScore: number;
  pos: any;
  neg: any;
  memSummary: any;
}

export const MemberScorecardSummaryWidget: React.FC<MemberScorecardSummaryWidgetProps> = ({
  overallScore,
  pos,
  neg,
  memSummary
}) => {
  return (
    <Card className="p-4 bg-white border-gray-200 flex flex-col">
      {/* Header — stays pinned */}
      <div className="flex items-center justify-between pb-2.5 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            Live Legislative Performance
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500">Live Score:</span>
          <Badge variant="gold" size="md" className="font-mono text-xs">
            {overallScore} / 100
          </Badge>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="mt-3 space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
        {/* Marks breakdown */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-lg bg-emerald-50/20 border border-emerald-800/40 space-y-1">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
              + Positive Marks
            </span>
            <div className="text-[10px] font-mono text-gray-700 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Relevance:</span>
                <span className="text-emerald-400 font-bold">
                  {Number(pos.agenda_relevance_points) > 0 ? `+${pos.agenda_relevance_points}` : "0"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Proposals:</span>
                <span className="text-emerald-400 font-bold">
                  {Number(pos.constructive_proposals_points) > 0 ? `+${pos.constructive_proposals_points}` : "0"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Decorum:</span>
                <span className="text-emerald-400 font-bold">
                  {Number(pos.decorum_conduct_bonus) > 0 ? `+${pos.decorum_conduct_bonus}` : "0"}
                </span>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-red-50/20 border border-rose-800/40 space-y-1">
            <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider block">
              - Deductions
            </span>
            <div className="text-[10px] font-mono text-gray-700 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Time Overage:</span>
                <span className="text-rose-400 font-bold">
                  {Number(neg.speaking_time_overage_deduction) > 0 ? `-${neg.speaking_time_overage_deduction}` : "0"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Off-Topic:</span>
                <span className="text-rose-400 font-bold">
                  {Number(neg.off_topic_speech_deduction) > 0 ? `-${neg.off_topic_speech_deduction}` : "0"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Cross-talk:</span>
                <span className="text-rose-400 font-bold">
                  {Number(neg.interruptions_cross_talk_deduction) > 0 ? `-${neg.interruptions_cross_talk_deduction}` : "0"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Discussion Points & Ideas */}
        {memSummary && (
          <div className="space-y-2 pt-1 border-t border-gray-200/80">
            <div className="p-2.5 rounded-lg bg-white border border-gray-200 text-xs space-y-1">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3 h-3 text-amber-400" /> Recorded Discussion Points
              </span>
              <p className="text-[11px] text-gray-700 leading-relaxed">
                {memSummary.discussion_summary || "Active participation recorded on national policy clauses."}
              </p>
            </div>

            {memSummary.major_ideas_raised && memSummary.major_ideas_raised.length > 0 && (
              <div className="p-2.5 rounded-lg bg-white border border-gray-200 text-xs space-y-1.5">
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Lightbulb className="w-3 h-3 text-sky-400" /> Policy Ideas Proposed
                </span>
                <div className="space-y-1">
                  {memSummary.major_ideas_raised.map((idea: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-1.5 text-[10px] text-gray-700">
                      <span className="w-3.5 h-3.5 rounded-full bg-sky-500/20 text-sky-700 font-mono text-[9px] flex items-center justify-center flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{idea}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
