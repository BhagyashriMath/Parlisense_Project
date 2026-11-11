import React from 'react';
import { Member } from '../../../../shared/types';
import { Card } from '../../../../components/common/Card';
import { Badge } from '../../../../components/common/Badge';
import { Mic, Video, Armchair } from 'lucide-react';
import { deriveHardwareIdsFromSeatId } from '../../../../features/registration/model/registration.model';

interface SeatMicMatrixTabProps {
  members: Member[];
  onSeatChange: (memberId: string, seatId: string) => void;
  onMicChange: (memberId: string, micId: string) => void;
}

export const SeatMicMatrixTab: React.FC<SeatMicMatrixTabProps> = ({
  members,
  onSeatChange,
  onMicChange
}) => {
  return (
    <div className="space-y-4">
      <div className="border-b border-gray-200 pb-3">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <Mic className="w-4 h-4 text-amber-500" />
          <span>4. Chamber Seat & Hardware Association Matrix</span>
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Map physical chamber benches to digital microphone and camera channels. Editing a Seat ID automatically re-derives microphone and vision camera IDs.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
        {members.map((m) => {
          const derived = deriveHardwareIdsFromSeatId(m.seat_id);
          return (
            <Card
              key={m.member_id}
              className="p-3 bg-white flex flex-col justify-between border-gray-200 hover:border-gray-300 transition-all"
            >
              <div className="flex items-start justify-between gap-1 mb-2">
                <div>
                  <div className="text-xs font-bold text-gray-900 truncate">{m.name}</div>
                  <div className="text-[10px] text-gray-500 font-mono">
                    {m.member_id} • {m.party || "Ind."}
                  </div>
                </div>
                <Badge variant="gold" className="font-mono">
                  {m.seat_id}
                </Badge>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-200 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-gray-500 font-semibold flex items-center gap-1">
                    <Armchair className="w-3 h-3 text-emerald-400" /> Seat:
                  </span>
                  <input
                    type="text"
                    value={m.seat_id}
                    onChange={(e) => onSeatChange(m.member_id, e.target.value.toUpperCase())}
                    className="w-20 bg-white border border-gray-300 rounded px-1.5 py-0.5 text-center font-mono text-xs text-amber-700 font-bold focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-gray-500 font-semibold flex items-center gap-1">
                    <Mic className="w-3 h-3 text-blue-400" /> Mic ID:
                  </span>
                  <input
                    type="text"
                    value={m.mic_id || derived.micId}
                    onChange={(e) => onMicChange(m.member_id, e.target.value.toUpperCase())}
                    className="w-20 bg-white border border-gray-300 rounded px-1.5 py-0.5 text-center font-mono text-xs text-blue-700 font-bold focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-gray-500 font-semibold flex items-center gap-1">
                    <Video className="w-3 h-3 text-cyan-400" /> Cam ID:
                  </span>
                  <span className="w-20 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-center font-mono text-xs text-cyan-300 font-bold">
                    {m.camera_id || derived.cameraId}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
