import React from 'react';
import { AgendaTopic } from '../../../../shared/types';
import { Card, CardTitle } from '../../../../components/common/Card';
import { Badge } from '../../../../components/common/Badge';
import { Clock, Calendar } from 'lucide-react';

export type AnalyzedAgendaTopic = AgendaTopic & {
  speeches_count?: number;
  avg_relevance?: number;
  violations_count?: number;
};

interface TopicAnalysisTabProps {
  topics?: (AnalyzedAgendaTopic | AgendaTopic)[];
}

export const TopicAnalysisTab: React.FC<TopicAnalysisTabProps> = ({ topics = [] }) => {
  if (!topics || topics.length === 0) {
    return (
      <div className="p-8 text-center rounded-xl bg-white border border-gray-200 text-gray-500">
        <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-gray-700">No Agenda Topics Configured</p>
        <p className="text-xs text-gray-400 mt-1">No legislative topics were recorded for this session.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {topics.map((t) => (
        <Card
          key={t.topic_id}
          className="p-4 bg-white border-gray-200 hover:border-gray-300 transition-all flex flex-col justify-between shadow-sm"
        >
          <div>
            <div className="flex items-center justify-between gap-1 mb-2">
              <Badge variant="gold" className="font-mono">
                {t.topic_id}
              </Badge>
              <span className="text-[11px] font-mono text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3 text-gray-400" />
                {t.start_time} - {t.end_time}
              </span>
            </div>

            <CardTitle className="text-xs font-bold leading-snug">
              {t.title}
            </CardTitle>
            <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">
              {t.description || "No specific sub-clauses provided."}
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-gray-200 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-1.5 rounded bg-white border border-gray-200/60">
              <span className="text-[10px] text-gray-400 block">Speeches</span>
              <span className="font-mono font-bold text-gray-800">{(t as AnalyzedAgendaTopic).speeches_count || 5}</span>
            </div>
            <div className="p-1.5 rounded bg-white border border-gray-200/60">
              <span className="text-[10px] text-gray-400 block">Avg Relevance</span>
              <span className="font-mono font-bold text-emerald-400">{(t as AnalyzedAgendaTopic).avg_relevance ?? 0}%</span>
            </div>
            <div className="p-1.5 rounded bg-white border border-gray-200/60">
              <span className="text-[10px] text-gray-400 block">Violations</span>
              <span className="font-mono font-bold text-rose-400">{(t as AnalyzedAgendaTopic).violations_count || 0}</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
