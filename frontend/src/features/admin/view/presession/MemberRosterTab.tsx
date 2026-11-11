import React from 'react';
import { Member } from '../../../../shared/types';
import { Table, Column } from '../../../../components/common/Table';
import { Badge } from '../../../../components/common/Badge';
import { Users, Edit2, Trash2 } from 'lucide-react';

interface MemberRosterTabProps {
  members: Member[];
  onAddMember: () => void;
  onEditMember: (member: Member) => void;
  onDeleteMember: (memberId: string) => void;
}

export const MemberRosterTab: React.FC<MemberRosterTabProps> = ({
  members,
  onAddMember,
  onEditMember,
  onDeleteMember
}) => {
  const columns: Column<Member>[] = [
    {
      key: "member_id",
      header: "ID",
      render: (m) => <span className="font-mono font-bold text-amber-400">{m.member_id}</span>,
      width: "80px"
    },
    {
      key: "name",
      header: "Name & Role",
      render: (m) => (
        <div>
          <div className="font-bold text-gray-900">{m.name}</div>
          <div className="text-[10px] text-gray-500">{m.role || "Member of Parliament"}</div>
        </div>
      )
    },
    {
      key: "seat_id",
      header: "Seat",
      render: (m) => <span className="font-mono font-bold text-emerald-400">{m.seat_id}</span>,
      width: "70px"
    },
    {
      key: "hardware",
      header: "Hardware Channels",
      render: (m) => (
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <span className="px-1.5 py-0.5 rounded bg-blue-50/60 text-blue-700 border border-blue-800/40">
            {m.mic_id || "MIC-01"}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/40">
            {m.camera_id || "CAM-01"}
          </span>
        </div>
      )
    },
    {
      key: "party",
      header: "Party / Portfolio",
      render: (m) => (
        <div>
          <div className="text-gray-800 font-medium">{m.party || "Independent"}</div>
          <div className="text-[10px] text-gray-500">{m.department || m.constituency}</div>
        </div>
      )
    },
    {
      key: "floor_time",
      header: "Floor Quota",
      render: (m) => (
        <span className="font-mono text-gray-700">
          {Math.floor(m.allocated_time_seconds / 60)}m {m.allocated_time_seconds % 60}s
        </span>
      ),
      width: "95px"
    },
    {
      key: "status",
      header: "Status",
      render: (m) => (
        <Badge variant={m.status === "INACTIVE" ? "neutral" : "success"}>
          {m.status || "ACTIVE"}
        </Badge>
      ),
      width: "85px"
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (m) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onEditMember(m)}
            className="p-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer"
            title="Edit Member"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={() => onDeleteMember(m.member_id)}
            className="p-1 rounded bg-gray-100 hover:bg-rose-900/50 text-rose-400 transition-colors cursor-pointer"
            title="Delete Member"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ),
      width: "80px"
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-500" />
            <span>3. Parliamentary Members Configuration & Roster</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Register participating Members of Parliament with their designated portfolios and allocated speaking time.
          </p>
        </div>
      </div>

      <Table
        data={members}
        columns={columns}
        keyExtractor={(m) => m.member_id}
        emptyMessage="No members currently configured in the parliamentary chamber."
      />
    </div>
  );
};
