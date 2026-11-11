import React from 'react';
import { SessionConfig } from '../../../../shared/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../../components/common/Card';
import { Input } from '../../../../components/common/Input';
import { Clock } from 'lucide-react';

interface FloorTimingsTabProps {
  config: SessionConfig;
  onChange: (config: SessionConfig) => void;
}

export const FloorTimingsTab: React.FC<FloorTimingsTabProps> = ({ config, onChange }) => {
  return (
    <div className="space-y-4 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>5. Floor Timers, Warning Thresholds & Recesses</span>
          </CardTitle>
          <CardDescription>
            Set countdown speech limits, advisory chime windows, and scheduled recess periods.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Default Speaking Time Limit (Seconds)"
              type="number"
              value={config.timings.max_speaking_time_seconds}
              onChange={(e) =>
                onChange({
                  ...config,
                  timings: { ...config.timings, max_speaking_time_seconds: Number(e.target.value) }
                })
              }
              helperText="300 seconds = 5 minutes standard parliamentary speech"
            />

            <Input
              label="Warning Indicator Time (Seconds)"
              type="number"
              value={config.timings.warning_time_seconds}
              onChange={(e) =>
                onChange({
                  ...config,
                  timings: { ...config.timings, warning_time_seconds: Number(e.target.value) }
                })
              }
              helperText="240 seconds = 4 minutes (Amber advisory chime)"
            />

            <Input
              label="Scheduled Recess / Break Periods"
              type="text"
              value={config.timings.break_periods}
              onChange={(e) =>
                onChange({
                  ...config,
                  timings: { ...config.timings, break_periods: e.target.value }
                })
              }
              placeholder="01:00 PM - 02:00 PM (Lunch Recess)"
            />

            <Input
              label="Total Expected Session Duration"
              type="text"
              value={config.timings.total_expected_duration}
              onChange={(e) =>
                onChange({
                  ...config,
                  timings: { ...config.timings, total_expected_duration: e.target.value }
                })
              }
              placeholder="7 Hours"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
