import React from 'react';
import { SessionConfig } from '../../../../shared/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../../components/common/Card';
import { Input } from '../../../../components/common/Input';
import { Select } from '../../../../components/common/Select';
import { BookOpen } from 'lucide-react';

interface SessionDetailsTabProps {
  config: SessionConfig;
  onChange: (config: SessionConfig) => void;
}

export const SessionDetailsTab: React.FC<SessionDetailsTabProps> = ({ config, onChange }) => {
  return (
    <div className="space-y-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-500" />
            <span>1. General Parliamentary Session Details</span>
          </CardTitle>
          <CardDescription>
            Define session credentials, legislative chamber, and scheduled times before opening floor debate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              id="input-session-id"
              label="Session Identification ID"
              value={config.session_id}
              onChange={(e) => onChange({ ...config, session_id: e.target.value })}
              placeholder="e.g. PAR-2026-001"
              helperText="Unique legislative session identifier"
            />

            <Input
              id="input-session-date"
              label="Session Date"
              type="date"
              value={config.session_date}
              onChange={(e) => onChange({ ...config, session_date: e.target.value })}
            />

            <Input
              id="input-start-time"
              label="Scheduled Start Time"
              value={config.start_time}
              onChange={(e) => onChange({ ...config, start_time: e.target.value })}
              placeholder="10:00 AM"
            />

            <Input
              id="input-end-time"
              label="Scheduled End Time"
              value={config.scheduled_end_time}
              onChange={(e) => onChange({ ...config, scheduled_end_time: e.target.value })}
              placeholder="05:00 PM"
            />

            <Select
              id="select-session-type"
              label="Session Type"
              value={config.session_type}
              onChange={(e) => onChange({ ...config, session_type: e.target.value })}
            >
              <option value="Regular Legislative Sitting">Regular Legislative Sitting</option>
              <option value="Special Constitutional Session">Special Constitutional Session</option>
              <option value="Budget Consideration Sitting">Budget Consideration Sitting</option>
              <option value="Emergency Parliamentary Debate">Emergency Parliamentary Debate</option>
              <option value="Question Hour & Zero Hour">Question Hour & Zero Hour</option>
            </Select>

            <Select
              id="select-house-chamber"
              label="House / Chamber"
              value={config.house_chamber}
              onChange={(e) => onChange({ ...config, house_chamber: e.target.value })}
            >
              <option value="Lok Sabha / House of the People">Lok Sabha / House of the People</option>
              <option value="Rajya Sabha / Council of States">Rajya Sabha / Council of States</option>
              <option value="Central Hall Joint Session">Central Hall Joint Session</option>
              <option value="Committee Room 1 (Legislative)">Committee Room 1 (Legislative)</option>
            </Select>

            <div className="md:col-span-2">
              <Input
                id="input-current-topic"
                label="Primary Legislative Bill / Agenda Title"
                value={config.current_topic}
                onChange={(e) => onChange({ ...config, current_topic: e.target.value })}
                placeholder="e.g. Digital Education & AI Governance Bill 2026"
                helperText="Appears as current active agenda on all chamber screens"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
