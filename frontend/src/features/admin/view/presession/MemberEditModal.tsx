import React from 'react';
import { Member } from '../../../../shared/types';
import { Modal } from '../../../../components/common/Modal';
import { Button } from '../../../../components/common/Button';
import { Input } from '../../../../components/common/Input';
import { deriveHardwareIdsFromSeatId } from '../../../../features/registration/model/registration.model';

interface MemberEditModalProps {
  isOpen: boolean;
  member: Partial<Member> | null;
  members: Member[];
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  onChange: (member: Partial<Member>) => void;
}

export const MemberEditModal: React.FC<MemberEditModalProps> = ({
  isOpen,
  member,
  members,
  onClose,
  onSave,
  onChange
}) => {
  if (!member) return null;

  const isExisting = Boolean(
    member.member_id && members.some((m) => m.member_id === member.member_id)
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isExisting ? `Edit Member: ${member.name}` : "Register New Parliamentary Member"}
      subtitle="Hardware IDs (Mic & Camera) auto-derive strictly from Seat ID."
      maxWidth="md"
    >
      <form onSubmit={onSave} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Member ID"
            value={member.member_id || ""}
            onChange={(e) => onChange({ ...member, member_id: e.target.value })}
            placeholder="e.g. M001"
            required
            disabled={isExisting}
            helperText={isExisting ? "Member ID is the primary key and cannot be changed once assigned" : "e.g. M001"}
          />
          <Input
            label="Seat ID"
            value={member.seat_id || ""}
            onChange={(e) => {
              const newSeat = e.target.value.toUpperCase();
              const derived = deriveHardwareIdsFromSeatId(newSeat);
              onChange({
                ...member,
                seat_id: newSeat,
                mic_id: derived.micId,
                camera_id: derived.cameraId
              });
            }}
            placeholder="e.g. S001"
            helperText="Auto-updates Mic & Cam"
            required
          />
        </div>

        <Input
          label="Full Name"
          value={member.name || ""}
          onChange={(e) => onChange({ ...member, name: e.target.value })}
          placeholder="e.g. Dr. Rajeshwar Sharma"
          required
        />

        <div className="grid grid-cols-3 gap-2">
          <Input
            label="Party"
            value={member.party || ""}
            onChange={(e) => onChange({ ...member, party: e.target.value })}
            placeholder="e.g. Majority Alliance"
          />
          <Input
            label="Microphone ID"
            value={member.mic_id || ""}
            onChange={(e) => onChange({ ...member, mic_id: e.target.value.toUpperCase() })}
            placeholder="e.g. MIC001"
          />
          <Input
            label="Camera ID"
            value={member.camera_id || ""}
            onChange={(e) => onChange({ ...member, camera_id: e.target.value.toUpperCase() })}
            placeholder="e.g. CAM001"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Role / Designation"
            value={member.role || ""}
            onChange={(e) => onChange({ ...member, role: e.target.value })}
            placeholder="e.g. MP, Opposition Leader"
          />
          <Input
            label="Department / Ministry Portfolio"
            value={member.department || ""}
            onChange={(e) => onChange({ ...member, department: e.target.value })}
            placeholder="e.g. Ministry of Education"
          />
        </div>

        <Input
          label="Allocated Floor Time (Seconds)"
          type="number"
          value={member.allocated_time_seconds || 300}
          onChange={(e) => onChange({ ...member, allocated_time_seconds: Number(e.target.value) })}
          helperText="Standard 5 minutes = 300s"
        />

        <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm">
            Save Member
          </Button>
        </div>
      </form>
    </Modal>
  );
};
