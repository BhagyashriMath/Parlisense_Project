import React, { useEffect, useState } from 'react';
import { Button } from '../../../../components/common/Button';
import { Badge } from '../../../../components/common/Badge';
import { CheckCircle2, LogOut, ShieldCheck } from 'lucide-react';
import { Member } from '../../../../shared/types';

interface EmergencyExitApprovedModalProps {
  isOpen: boolean;
  request: any;
  currentMember: Member;
  onLogout: () => void;
  countdownSeconds?: number;
}

export const EmergencyExitApprovedModal: React.FC<EmergencyExitApprovedModalProps> = ({
  isOpen,
  request,
  currentMember,
  onLogout,
  countdownSeconds = 6
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(countdownSeconds);

  useEffect(() => {
    if (!isOpen) {
      setSecondsRemaining(countdownSeconds);
      return;
    }

    setSecondsRemaining(countdownSeconds);
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, countdownSeconds, onLogout]);

  if (!isOpen) return null;

  const percentLeft = (secondsRemaining / countdownSeconds) * 100;

  return (
    <div
      id="emergency-exit-approved-popup"
      className="fixed inset-0 bg-gray-50 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
    >
      <div className="max-w-md w-full border-2 border-emerald-500 rounded-3xl bg-white p-6 sm:p-8 shadow-[0_0_60px_rgba(16,185,129,0.35)] text-center space-y-4">
        {/* Animated Clearance Icon */}
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto text-emerald-400 animate-bounce">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        {/* Header Text */}
        <div className="space-y-1">
          <Badge variant="success" pulse className="font-mono text-[10px] tracking-wider uppercase px-2.5 py-0.5">
            SPEAKER CLEARANCE GRANTED
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Emergency Exit Approved
          </h2>
          <p className="text-xs text-gray-500 leading-snug">
            Hon. Speaker has approved your emergency floor exit request.
          </p>
        </div>

        {/* Member & Clearance Details Box */}
        <div className="p-3.5 rounded-2xl bg-white border border-gray-200 text-left font-mono text-xs space-y-2">
          <div className="flex items-center justify-between border-b border-gray-200/80 pb-1.5">
            <span className="text-gray-400">Member:</span>
            <span className="font-bold text-gray-800 truncate max-w-[200px]">{currentMember.name}</span>
          </div>
          <div className="flex items-center justify-between border-b border-gray-200/80 pb-1.5">
            <span className="text-gray-400">Assigned Seat:</span>
            <span className="font-bold text-sky-400">{currentMember.seat_id}</span>
          </div>
          <div className="flex items-center justify-between border-b border-gray-200/80 pb-1.5">
            <span className="text-gray-400">Exit Reason:</span>
            <span className="font-bold text-amber-700 truncate max-w-[200px]">
              {request?.reason || "Medical Emergency at Desk"}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-gray-200/80 pb-1.5">
            <span className="text-gray-400">Approved By:</span>
            <span className="font-bold text-emerald-400">
              {request?.decided_by || "Hon. Speaker"}
            </span>
          </div>
          <div className="pt-1 flex items-start gap-1.5 text-[11px] text-emerald-700/90 font-sans leading-snug">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>Chamber marshals dispatched to assist. Your microphone is disconnected and session is concluding.</span>
          </div>
        </div>

        {/* Auto-Exit Progress Bar & Countdown */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-gray-500">
            <span>Auto-exiting chamber</span>
            <span className="text-emerald-400 text-sm font-black">{secondsRemaining}s</span>
          </div>
          <div className="w-full bg-white h-2 rounded-full overflow-hidden border border-gray-200">
            <div
              className="h-full bg-emerald-500 transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${percentLeft}%` }}
            />
          </div>
        </div>

        {/* Immediate Exit Action Button */}
        <div className="pt-2">
          <Button
            variant="primary"
            size="lg"
            onClick={onLogout}
            icon={<LogOut className="w-4 h-4 text-slate-950" />}
            className="w-full justify-center bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black cursor-pointer shadow-lg rounded-xl"
          >
            Exit Chamber Now
          </Button>
        </div>
      </div>
    </div>
  );
};
