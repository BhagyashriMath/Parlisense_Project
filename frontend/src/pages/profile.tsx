import React from "react";
import { useParliament } from "../infrastructure/context/ParliamentContext";
import { MainLayout } from "../layouts/MainLayout";
import { Card } from "../components/common/Card";
import { Badge } from "../components/common/Badge";
import { User, ShieldCheck, Mail, Award, MapPin } from "lucide-react";

export default function ProfilePage() {
  const { currentUser, members, selectedMemberId } = useParliament();
  const member = members.find((m) => m.member_id === (currentUser?.memberId || selectedMemberId)) || members[0];

  return (
    <div className="flex-1 p-4 overflow-y-auto space-y-4 max-w-4xl mx-auto w-full text-gray-900">
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-500/40 rounded-2xl p-5 shadow-xl flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-800 border-2 border-amber-400/50 flex items-center justify-center text-3xl shadow-lg">
          👤
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-50/60 px-2 py-0.5 rounded border border-amber-500/30 font-mono">
              PARLIAMENTARY CREDENTIALS
            </span>
            <Badge variant="gold">Role: {currentUser?.role?.toUpperCase() || "MEMBER"}</Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
            {currentUser?.memberName || member?.name || "Honourable Member"}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {member?.constituency ? `Constituency: ${member.constituency} • ` : ""}
            {member?.party || "National Democratic Front"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border-gray-200 p-4">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Assigned Seat</span>
          <span className="text-2xl font-black text-amber-400 font-mono mt-1 block">
            {currentUser?.seatId || member?.seat_id || "S001"}
          </span>
          <span className="text-xs text-gray-400 mt-1 block">Chamber Floor Location</span>
        </Card>

        <Card className="bg-white border-gray-200 p-4">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Decorum Score</span>
          <span className="text-2xl font-black text-emerald-400 font-mono mt-1 block">
            {member?.historical_score || 92} / 100
          </span>
          <span className="text-xs text-gray-400 mt-1 block">Grade A Decorum Standing</span>
        </Card>

        <Card className="bg-white border-gray-200 p-4">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Session Floor Time</span>
          <span className="text-2xl font-black text-blue-400 font-mono mt-1 block">
            {Math.round((member?.allocated_time_seconds || 300) / 60)} min
          </span>
          <span className="text-xs text-gray-400 mt-1 block">Allocated Quota Per Turn</span>
        </Card>
      </div>
    </div>
  );
}

ProfilePage.auth = true;
ProfilePage.layout = MainLayout;
