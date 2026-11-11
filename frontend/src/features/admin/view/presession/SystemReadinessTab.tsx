import React from 'react';
import { PreSessionCheckResult } from '../../../../shared/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../../components/common/Card';
import { Button } from '../../../../components/common/Button';
import { Badge } from '../../../../components/common/Badge';
import { ShieldAlert, CheckCircle2, AlertTriangle, Play } from 'lucide-react';
import { calculateDiagnosticScore } from '../../model/admin.model';

interface SystemReadinessTabProps {
  readiness: PreSessionCheckResult | null;
  isSaving: boolean;
}

export const SystemReadinessTab: React.FC<SystemReadinessTabProps> = ({
  readiness,
  isSaving
}) => {
  const diagnosticScore = readiness ? calculateDiagnosticScore(readiness) : 0;

  return (
    <div className="space-y-4 max-w-3xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <span>7. System Readiness Verification</span>
              </CardTitle>
              <CardDescription>
                Ensure all members, seat mappings, agenda items, and AI pipeline sensors are verified before the Speaker calls the House to order.
              </CardDescription>
            </div>
            <Badge variant={diagnosticScore >= 80 ? "success" : "warning"} size="md" className="font-mono">
              Score: {diagnosticScore}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Checklist Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {readiness &&
              Object.entries(readiness.checks).map(([key, isOk]) => (
                <div
                  key={key}
                  className={`p-3 rounded-lg border flex items-center justify-between ${
                    isOk
                      ? "bg-emerald-50/20 border-emerald-800/40 text-emerald-200"
                      : "bg-red-50/20 border-rose-800/40 text-red-800"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isOk ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    )}
                    <span className="text-xs font-semibold capitalize">
                      {key.replace(/_/g, " ")}
                    </span>
                  </div>
                  <Badge variant={isOk ? "success" : "danger"} className="font-mono uppercase">
                    {isOk ? "READY" : "MISSING"}
                  </Badge>
                </div>
              ))}
          </div>

          {/* Missing Items Warning if Any */}
          {readiness && !readiness.is_ready && (
            <div className="p-3.5 rounded-lg bg-amber-50/30 border border-amber-800/50 text-amber-800 text-xs">
              <div className="font-bold flex items-center gap-1.5 mb-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Pre-Session Configuration Incomplete
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-700">
                {readiness.missing_items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Session Handover Notice to Speaker */}
          <div className="p-4 rounded-xl bg-white border border-gray-300/70 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl flex-shrink-0">
                🏛️
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <span>Pre-Session System Verified</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 border border-emerald-500/40 font-mono">
                    READY FOR SPEAKER
                  </span>
                </h3>
                <p className="text-xs text-gray-700 mt-0.5 max-w-lg">
                  All member seat assignments, microphones, and AI diagnostics have been verified. Under chamber rules, the <strong className="text-amber-400">Hon. Speaker</strong> has the sole presiding authority to call the House to order and start the live session.
                </p>
              </div>
            </div>

            <div className="px-3.5 py-2 rounded-lg bg-white border border-gray-200 text-right flex-shrink-0">
              <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500 block">Presiding Authority</span>
              <span className="text-xs font-bold text-amber-400">Hon. Speaker Console</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
