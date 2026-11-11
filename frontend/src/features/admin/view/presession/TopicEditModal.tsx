import React from 'react';
import { AgendaTopic } from '../../../../shared/types';
import { Modal } from '../../../../components/common/Modal';
import { Button } from '../../../../components/common/Button';
import { Input } from '../../../../components/common/Input';
import { Select } from '../../../../components/common/Select';

interface TopicEditModalProps {
  isOpen: boolean;
  topic: Partial<AgendaTopic> | null;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  onChange: (topic: Partial<AgendaTopic>) => void;
}

export const TopicEditModal: React.FC<TopicEditModalProps> = ({
  isOpen,
  topic,
  onClose,
  onSave,
  onChange
}) => {
  if (!topic) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={topic.topic_id ? `Agenda Item: ${topic.topic_id}` : "New Agenda Topic"}
      subtitle="Configure topic title, allocated timing window, and legislative priority."
      maxWidth="md"
    >
      <form onSubmit={onSave} className="space-y-3">
        <Input
          label="Topic Title"
          value={topic.title || ""}
          onChange={(e) => onChange({ ...topic, title: e.target.value })}
          placeholder="e.g. Digital Education Infrastructure Clause 1-14"
          required
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-700">Description / Clauses</label>
          <textarea
            value={topic.description || ""}
            onChange={(e) => onChange({ ...topic, description: e.target.value })}
            rows={3}
            placeholder="Details, bill references, or sub-topics..."
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Input
            label="Start Time"
            value={topic.start_time || ""}
            onChange={(e) => onChange({ ...topic, start_time: e.target.value })}
            placeholder="11:00 AM"
          />
          <Input
            label="End Time"
            value={topic.end_time || ""}
            onChange={(e) => onChange({ ...topic, end_time: e.target.value })}
            placeholder="12:00 PM"
          />
          <Select
            label="Priority"
            value={topic.priority || "HIGH"}
            onChange={(e) => onChange({ ...topic, priority: e.target.value as any })}
          >
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </Select>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm">
            Save Topic
          </Button>
        </div>
      </form>
    </Modal>
  );
};
