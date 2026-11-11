import React from 'react';
import { Button } from '../../../../components/common/Button';
import { Badge } from '../../../../components/common/Badge';
import { AlertTriangle, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';
import { SuspensionRecommendation } from '../../model/speaker.types';

interface SpeakerDecisionsProps {
  suspensionRecs: SuspensionRecommendation[];
  pendingEmergencyRequests: any[];
  onConfirmSuspension: (rec: SuspensionRecommendation) => void;
  onRejectSuspension: (alertId: string, memberName: string, memberId?: string) => void;
  onEmergencyDecision: (requestId: string, approved: boolean, memberName: string) => void;
}

export const SpeakerDecisions: React.FC<SpeakerDecisionsProps> = ({
  suspensionRecs,
  pendingEmergencyRequests,
  onConfirmSuspension,
  onRejectSuspension,
  onEmergencyDecision
}) => {
  const activeSuspension = suspensionRecs[0];

  return (
    <>
      {/* Rule 374 Suspension Recommendation — scoped inline to Decorum Interaction */}
      {activeSuspension && (
        <div className="bg-white rounded-xl border-2 border-rose-600/70 p-3 shadow-lg space-y-2.5 flex-shrink-0">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 text-rose-400 text-xs font-bold uppercase tracking-wider min-w-0">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 animate-pulse" />
              <span className="truncate">Rule 374 Suspension</span>
            </div>
            <Badge variant="danger" pulse className="text-[9px] flex-shrink-0">
              ACTION REQUIRED
            </Badge>
          </div>
          <p className="text-[10px] text-gray-500 leading-snug">
            Persistent level-3 decorum breach detected. Review within Decorum Interaction.
          </p>

          <div className="p-2.5 rounded-lg bg-red-50/40 border border-rose-800/50 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold text-red-800 truncate">{activeSuspension.member_name}</p>
              <p className="text-[11px] text-red-700/80 font-mono mt-0.5 truncate">
                Seat: {activeSuspension.seat_id} • ID: {activeSuspension.member_id}
              </p>
            </div>
            <Badge variant="danger" pulse className="flex-shrink-0 text-[10px]">
              3RD LEVEL INFRACTION
            </Badge>
          </div>

          <div className="p-2.5 rounded-lg bg-white border border-gray-200 space-y-1 text-xs text-gray-700">
            <p className="font-semibold text-gray-800 text-[11px]">Violation Details:</p>
            <p className="text-[11px] text-gray-700 leading-snug">
              {activeSuspension.title || "Persistent chamber disruption and disregard for the authority of the Chair."}
            </p>
            {activeSuspension.timestamp && (
              <p className="text-[10px] text-gray-400 font-mono mt-0.5">Timestamp: {activeSuspension.timestamp}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onRejectSuspension(activeSuspension.alert_id, activeSuspension.member_name, activeSuspension.member_id)}
              className="cursor-pointer text-xs"
            >
              Decline Suspension
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => onConfirmSuspension(activeSuspension)}
              icon={<ShieldAlert className="w-3.5 h-3.5" />}
              className="cursor-pointer text-xs font-bold"
            >
              Confirm & Enforce Rule 374
            </Button>
          </div>
        </div>
      )}

      {/* Emergency Exit Requests Banner (if any) */}
      {pendingEmergencyRequests.length > 0 && (
        <div className="bg-amber-50/30 border border-amber-600/50 rounded-xl p-3 shadow-md space-y-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-amber-700 text-xs font-bold uppercase tracking-wider min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="truncate">Pending Emergency Exit Requests ({pendingEmergencyRequests.length})</span>
            </div>
            <Badge variant="warning" pulse className="text-[9px] flex-shrink-0">ACTION REQUIRED</Badge>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {pendingEmergencyRequests.map((req: any) => {
              const reqId = req.id || req.request_id;
              const memberName = req.member_name || "Hon. Member";
              const seatId = req.seat_id || "Desk";
              const reasonText = req.reason || req.reason_type || req.notes || "Urgent departure requested";
              return (
                <div
                  key={reqId}
                  className="p-2.5 rounded-lg bg-white border border-gray-300/80 flex items-center justify-between gap-2.5 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900 flex items-center gap-1.5 truncate">
                      <span className="truncate">{memberName}</span>
                      <Badge variant="gold" className="font-mono text-[9px] flex-shrink-0">
                        {seatId}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                      <strong className="text-amber-700">Reason:</strong> {reasonText}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onEmergencyDecision(reqId, false, memberName)}
                      className="text-gray-500 hover:text-rose-400 cursor-pointer text-xs"
                    >
                      Deny
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onEmergencyDecision(reqId, true, memberName)}
                      icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      className="cursor-pointer text-xs"
                    >
                      Grant
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};
