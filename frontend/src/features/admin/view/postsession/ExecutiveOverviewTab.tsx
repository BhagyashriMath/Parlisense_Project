import React from 'react';
import { CompleteSessionSummary } from '../../../../shared/types';
import { StatWidget } from '../../../../components/common/StatWidget';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/common/Card';
import { Badge } from '../../../../components/common/Badge';
import { ShieldAlert, ShieldCheck, Users, Clock, MessageSquare, AlertCircle } from 'lucide-react';

interface ExecutiveOverviewTabProps {
  summary: CompleteSessionSummary;
}

export const ExecutiveOverviewTab: React.FC<ExecutiveOverviewTabProps> = ({ summary }) => {
  const { session_information, session_activity, violation_summary } = summary;

  return (
    <div className="space-y-4">
      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatWidget
          label="Total Floor Speeches"
          value={`${session_activity.total_speeches} Speeches`}
          subtext={`Across ${session_information.number_of_topics} legislative topics`}
          icon={<MessageSquare className="w-5 h-5" />}
          variant="gold"
        />

        <StatWidget
          label="Total Speaking Time"
          value={session_activity.total_speaking_time_formatted}
          subtext={`Avg: ${session_activity.average_speaking_time_formatted} / turn`}
          icon={<Clock className="w-5 h-5" />}
          variant="default"
        />

        <StatWidget
          label="Member Participation"
          value={`${session_activity.number_of_active_members} / ${session_activity.number_of_members_present}`}
          subtext="Active Floor Debaters"
          icon={<Users className="w-5 h-5" />}
          variant="success"
        />

        <StatWidget
          label="Decorum Infractions"
          value={`${violation_summary.total_violations} Flagged`}
          subtext={`${violation_summary.critical_violations} Critical • ${violation_summary.high_violations} High`}
          icon={<AlertCircle className="w-5 h-5" />}
          variant={violation_summary.total_violations > 0 ? "danger" : "default"}
        />
      </div>

      {/* Violation Category Breakdown */}
      <Card className="p-4 bg-white">
        <CardHeader className="p-0 pb-3">
          <CardTitle className="text-xs uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <span>Parliamentary Infraction & Rule Violations Breakdown</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {Object.entries(violation_summary.types_breakdown || {}).length === 0 ? (
            <div className="p-4 rounded-lg bg-emerald-50/20 border border-emerald-800/40 flex items-center gap-3 text-emerald-700">
              <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div>
                <div className="text-xs font-bold text-emerald-200">Exemplary Chamber Decorum Maintained</div>
                <div className="text-[11px] text-gray-500">No rule violations or decorum infractions were flagged during this parliamentary sitting.</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(violation_summary.types_breakdown).map(([category, count]) => (
                <div key={category} className="p-3 rounded-lg bg-white border border-gray-200">
                  <div className="text-[11px] text-gray-500 truncate">{category}</div>
                  <div className="text-lg font-bold font-mono text-gray-900 mt-1 flex items-baseline gap-1">
                    <span>{count}</span>
                    <span className="text-[10px] font-normal text-gray-400">incidents</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Metadata Grid */}
      <Card className="p-4 bg-white">
        <CardHeader className="p-0 pb-3">
          <CardTitle className="text-xs uppercase tracking-wider">
            Session Record & Chamber Metadata
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <div>
              <span className="text-[10px] text-gray-400 block">Session ID</span>
              <span className="font-mono font-bold text-amber-400">{session_information.session_id}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block">Date</span>
              <span className="text-gray-800 font-semibold">{session_information.date}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block">Start Time</span>
              <span className="text-gray-800">{session_information.start_time}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block">End Time</span>
              <span className="text-gray-800">{session_information.end_time}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block">Total Duration</span>
              <span className="text-gray-800 font-mono font-bold">{session_information.total_duration}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block">Session Type</span>
              <span className="text-gray-800 truncate">{session_information.session_type}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
