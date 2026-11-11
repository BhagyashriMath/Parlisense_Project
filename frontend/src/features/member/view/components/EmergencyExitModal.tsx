import React from 'react';
import { Modal } from '../../../../components/common/Modal';
import { Button } from '../../../../components/common/Button';
import { Select } from '../../../../components/common/Select';
import { AlertTriangle } from 'lucide-react';

interface EmergencyExitModalProps {
  isOpen: boolean;
  onClose: () => void;
  emergencyType: string;
  onEmergencyTypeChange: (type: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const EmergencyExitModal: React.FC<EmergencyExitModalProps> = ({
  isOpen,
  onClose,
  emergencyType,
  onEmergencyTypeChange,
  onSubmit
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title={
        <div className="flex items-center gap-2 text-amber-400">
          <AlertTriangle className="w-5 h-5" />
          <span>REQUEST EMERGENCY FLOOR EXIT</span>
        </div>
      }
      subtitle="Submits an immediate formal request to the Hon. Speaker for authorized leave."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Select
          label="Select Legitimate Cause / Emergency Category"
          value={emergencyType}
          onChange={(e) => onEmergencyTypeChange(e.target.value)}
        >
          <option value="Medical Emergency at Desk">Medical Emergency at Desk</option>
          <option value="Urgent Family Matter">Urgent Family Matter</option>
          <option value="Official Legislative Business">Official Legislative Business</option>
          <option value="Personal Physical Distress">Personal Physical Distress</option>
        </Select>

        <p className="text-[11px] text-gray-500 leading-relaxed">
          Your request will be prioritized on the Presiding Officer's console. If approved, you will be excused from chamber quorum counting for the duration.
        </p>

        <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="gold" size="sm">
            Transmit Request to Speaker
          </Button>
        </div>
      </form>
    </Modal>
  );
};
