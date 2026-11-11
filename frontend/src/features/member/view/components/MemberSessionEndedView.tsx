import React from "react";
import { Member, MemberScorecard } from "../../../../shared/types";
import { Badge } from "../../../../components/common/Badge";
import { Button } from "../../../../components/common/Button";
import { Card } from "../../../../components/common/Card";
import {
  Award,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Mic,
  ShieldCheck,
  Video,
  LogOut,
  LayoutDashboard,
  Sparkles,
  Calendar,
  Bell
} from "lucide-react";

interface MemberSessionEndedViewProps {
  currentMember: Member;
  scorecard: MemberScorecard | null;
  sessionId?: string;
  scheduledSession?: {
    session_id: string;
    title: string;
    session_date: string;
    start_time: string;
    end_time: string;
    max_speaking_time_seconds?: number;
    status: string;
    is_locked?: boolean;
    description?: string;
  };
  onOpenScorecard: (memberId: string) => void;
  onOpenReport: () => void;
  onInspectDesk: () => void;
  onLogout: () => void;
}

export const MemberSessionEndedView: React.FC<MemberSessionEndedViewProps> = ({
  currentMember,
  scorecard,
  sessionId = "PARL-2026-8002",
  scheduledSession,
  onOpenScorecard,
  onOpenReport,
  onInspectDesk,
  onLogout
}) => {
  const overallScore = scorecard?.overall_score ?? 92;
  const grade = scorecard?.grade ?? "A";
  const pos = scorecard?.positive_marks;
  const neg = scorecard?.negative_deductions;
  const stats = scorecard?.statistics;

  const totalViolations =
    (stats?.time_violations || 0) +
    (stats?.seat_violations || 0) +
    (stats?.interruptions || 0) +
    (stats?.offensive_incidents || 0);

  return (
    <div
      id="member-session-ended-view"
      className="h-full flex-1 min-h-0 flex flex-col p-4 overflow-y-auto max-w-5xl mx-auto w-full gap-4 text-gray-900"
    >
      {/* 1. Official Scheduled Banner or Adjournment Banner */}
      {scheduledSession && scheduledSession.status === "SCHEDULED" ? (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/40 rounded-2xl p-5 shadow-2xl relative overflow-hidden flex-shrink-0">
          <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none text-9xl">
            📅
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 border-2 border-amber-400/50 flex items-center justify-center text-2xl shadow-lg flex-shrink-0">
                <Calendar className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase bg-amber-50/80 px-2 py-0.5 rounded border border-amber-500/40 font-mono flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    UPCOMING SITTING SCHEDULED
                  </span>
                  <span className="text-xs text-gray-500 font-mono">ID: {scheduledSession.session_id}</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                  {scheduledSession.title}
                </h1>
                <p className="text-xs text-gray-700 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>📅 Sitting Date: <strong className="text-amber-700 font-bold">{scheduledSession.session_date}</strong></span>
                  <span>⏰ Scheduled Hours: <strong className="text-amber-700 font-bold">{scheduledSession.start_time} - {scheduledSession.end_time}</strong></span>
                  <span>🎙️ Floor Quota: <strong className="text-amber-700 font-bold">{Math.round((scheduledSession.max_speaking_time_seconds || 300) / 60)} min</strong></span>
                </p>
                <p className="text-[11px] text-gray-500 mt-1.5 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span>The Hon. Speaker has scheduled this sitting and dispatched chamber notices. Please be seated at your desk ({currentMember.seat_id}) prior to Call to Order.</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="gold"
                size="md"
                onClick={onInspectDesk}
                icon={<LayoutDashboard className="w-4 h-4" />}
                className="flex-1 sm:flex-none shadow-amber-900/30 cursor-pointer"
              >
                Inspect Chamber Desk
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => onOpenScorecard(currentMember.member_id)}
                icon={<Award className="w-4 h-4 text-amber-400" />}
                className="flex-1 sm:flex-none cursor-pointer"
              >
                My Scorecard
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-500/40 rounded-2xl p-5 shadow-xl relative overflow-hidden flex-shrink-0">
          <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none text-9xl">
            🏛️
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-800 border-2 border-amber-400/50 flex items-center justify-center text-2xl shadow-lg flex-shrink-0">
                🏛️
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase bg-amber-50/60 px-2 py-0.5 rounded border border-amber-500/30 font-mono">
                    OFFICIAL ADJOURNMENT
                  </span>
                  <span className="text-xs text-gray-500 font-mono">Session ID: {sessionId}</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                  Parliamentary Sitting Concluded
                </h1>
                <p className="text-xs text-gray-700 mt-0.5">
                  The Honourable Speaker has formally concluded the parliamentary sitting. All floor proceedings and microphones are adjourned.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="gold"
                size="md"
                onClick={() => onOpenScorecard(currentMember.member_id)}
                icon={<Award className="w-4 h-4" />}
                className="flex-1 sm:flex-none shadow-amber-900/30"
              >
                My Scorecard
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={onOpenReport}
                icon={<FileText className="w-4 h-4 text-amber-400" />}
                className="flex-1 sm:flex-none"
              >
                Chamber Report
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Member Performance & Final Standing Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-shrink-0">
        {/* Identity & Desk Credentials */}
        <Card className="bg-white border-gray-200 p-4 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
              Member Credentials
            </span>
            <h2 className="text-base font-black text-gray-900 mt-1">{currentMember.name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {currentMember.role || "Member of Parliament"} • {currentMember.party || "NDF"}
            </p>
            <p className="text-[11px] text-amber-400/90 mt-0.5">{currentMember.constituency}</p>
          </div>

          <div className="grid grid-cols-3 gap-1.5 mt-4 pt-3 border-t border-gray-200 text-center font-mono">
            <div className="bg-white p-1.5 rounded-lg border border-gray-200">
              <span className="text-[9px] text-gray-400 uppercase block">Seat ID</span>
              <span className="text-xs font-bold text-amber-400">{currentMember.seat_id}</span>
            </div>
            <div className="bg-white p-1.5 rounded-lg border border-gray-200">
              <span className="text-[9px] text-gray-400 uppercase block">Mic ID</span>
              <span className="text-xs font-bold text-emerald-400">
                {currentMember.mic_id || `MIC-${currentMember.seat_id}`}
              </span>
            </div>
            <div className="bg-white p-1.5 rounded-lg border border-gray-200">
              <span className="text-[9px] text-gray-400 uppercase block">Camera ID</span>
              <span className="text-xs font-bold text-blue-400">
                {currentMember.camera_id || `CAM-${currentMember.seat_id}`}
              </span>
            </div>
          </div>
        </Card>

        {/* Overall Scorecard & Grade */}
        <Card className="bg-white border-gray-200 p-4 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Decorum Scorecard
            </span>
            <Badge variant="gold" className="font-mono text-xs font-black px-2.5 py-0.5">
              Grade {grade}
            </Badge>
          </div>

          <div className="my-2 flex items-baseline gap-2">
            <span className="text-4xl font-black font-mono text-amber-400">{overallScore}</span>
            <span className="text-sm font-bold text-gray-400">/ 100 PTS</span>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-gray-200 text-xs">
            <div className="flex justify-between items-center text-emerald-400">
              <span className="flex items-center gap-1 text-[11px]">
                <CheckCircle2 className="w-3 h-3" /> Positive Marks
              </span>
              <span className="font-mono font-bold">
                +{pos?.total_positive_marks ??
                  (pos?.agenda_relevance_points || 20) +
                    (pos?.constructive_proposals_points || 30) +
                    (pos?.decorum_conduct_bonus || 25)}
              </span>
            </div>
            <div className="flex justify-between items-center text-rose-400">
              <span className="flex items-center gap-1 text-[11px]">
                <AlertTriangle className="w-3 h-3" /> Infraction Deductions
              </span>
              <span className="font-mono font-bold">
                -{neg?.total_negative_deductions ??
                  (neg?.speaking_time_overage_deduction || 0) +
                    (neg?.rule_violations_deduction || 0)}
              </span>
            </div>
          </div>
        </Card>

        {/* Floor Participation & Decorum Status */}
        <Card className="bg-white border-gray-200 p-4 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
              Floor Standing
            </span>
            <div className="flex items-center gap-2 mt-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-gray-900">
                  {totalViolations === 0 ? "Exemplary Standing" : `${totalViolations} Advisory Notice(s)`}
                </p>
                <p className="text-[11px] text-gray-500">Official House Record Certified</p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-200 space-y-1.5 text-xs">
            <div className="flex justify-between text-gray-700">
              <span className="text-gray-400">Speaking Time Used:</span>
              <span className="font-mono font-semibold">
                {Math.floor((stats?.speaking_time_seconds || 180) / 60)}m{" "}
                {(stats?.speaking_time_seconds || 180) % 60}s /{" "}
                {Math.floor((currentMember.allocated_time_seconds || 300) / 60)}m
              </span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span className="text-gray-400">Speaking Turns:</span>
              <span className="font-mono font-semibold">{stats?.speaking_turns || 1} Turn(s)</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span className="text-gray-400">Microphone Status:</span>
              <span className="text-rose-400 font-bold font-mono">ADJOURNED (Muted)</span>
            </div>
          </div>
        </Card>
      </div>

      {/* 3. AI Decorum Assessment Summary */}
      <Card className="bg-white border-gray-200 p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-amber-400">
          <Sparkles className="w-4 h-4" />
          <h3 className="text-xs font-bold uppercase tracking-wider">
            AI Automated Parliamentary Decorum Assessment
          </h3>
        </div>
        <p className="text-xs text-gray-700 leading-relaxed">
          {typeof scorecard?.member_summary === "string"
            ? (scorecard.member_summary as string)
            : scorecard?.member_summary?.discussion_summary ||
              "The member exhibited constructive engagement throughout the sitting, adhering to debate decorum rules with timely participation on the tabled legislation."}
        </p>
      </Card>

      {/* 4. Action Bar (Scorecard, House Report, Inspect Desk, Logout) */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onInspectDesk}
            icon={<LayoutDashboard className="w-3.5 h-3.5" />}
          >
            Review Desk Transcript & Analytics
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenScorecard(currentMember.member_id)}
            icon={<Award className="w-3.5 h-3.5 text-amber-400" />}
          >
            Full Scorecard
          </Button>
        </div>

        <Button
          variant="danger"
          size="sm"
          onClick={onLogout}
          icon={<LogOut className="w-3.5 h-3.5" />}
        >
          Exit Chamber Desk
        </Button>
      </div>
    </div>
  );
};
