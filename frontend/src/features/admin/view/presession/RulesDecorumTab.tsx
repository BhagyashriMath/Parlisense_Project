import React from 'react';
import { SessionConfig } from '../../../../shared/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../../components/common/Card';
import { Badge } from '../../../../components/common/Badge';
import { Button } from '../../../../components/common/Button';
import { Sliders, Volume2, Activity, Mic, Eye, Shield, Zap } from 'lucide-react';

interface RulesDecorumTabProps {
  config: SessionConfig;
  activeRulePreset: "standard" | "strict" | "relaxed";
  onApplyPreset: (preset: "standard" | "strict" | "relaxed") => void;
  onChange: (config: SessionConfig) => void;
}

export const RulesDecorumTab: React.FC<RulesDecorumTabProps> = ({
  config,
  activeRulePreset,
  onApplyPreset,
  onChange
}) => {
  return (
    <div className="space-y-4 max-w-4xl">
      {/* Header & Presets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-500" />
            <span>6. Parliamentary Rule Engine & Decorum Enforcement</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure automated AI decorum thresholds, penalty mark weightings, and real-time vision/acoustic sensors.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 self-start sm:self-center">
          <span className="text-[10px] text-gray-500 font-semibold uppercase">Profile:</span>
          {[
            { id: "standard" as const, label: "Standard", desc: "Balanced Lok Sabha baseline" },
            { id: "strict" as const, label: "Strict", desc: "Low tolerance, strict decorum" },
            { id: "relaxed" as const, label: "Open Debate", desc: "High debate tolerance" }
          ].map((preset) => (
            <Button
              key={preset.id}
              type="button"
              variant={activeRulePreset === preset.id ? "gold" : "secondary"}
              size="sm"
              onClick={() => onApplyPreset(preset.id)}
              title={preset.desc}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* AI Sensor Thresholds & Engine Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-3 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-gray-700 uppercase flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              Noise Ceiling (dB)
            </label>
            <Badge variant="warning" className="font-mono">
              {config.rules.noise_threshold_db} dB
            </Badge>
          </div>
          <input
            type="range"
            min="60"
            max="95"
            value={config.rules.noise_threshold_db}
            onChange={(e) =>
              onChange({
                ...config,
                rules: { ...config.rules, noise_threshold_db: Number(e.target.value) }
              })
            }
            className="w-full accent-amber-500 cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-gray-400 font-mono">
            <span>60 dB (Quiet)</span>
            <span>95 dB (Shouting)</span>
          </div>
        </Card>

        <Card className="p-3 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-gray-700 uppercase flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              Agenda Relevance Min (%)
            </label>
            <Badge variant="success" className="font-mono">
              {config.rules.agenda_relevance_threshold}%
            </Badge>
          </div>
          <input
            type="range"
            min="30"
            max="80"
            value={config.rules.agenda_relevance_threshold}
            onChange={(e) =>
              onChange({
                ...config,
                rules: { ...config.rules, agenda_relevance_threshold: Number(e.target.value) }
              })
            }
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-gray-400 font-mono">
            <span>30% (Permissive)</span>
            <span>80% (Strict)</span>
          </div>
        </Card>

        <Card className="p-3 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-gray-700 uppercase flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-blue-400" />
              Cross-Talk Window
            </label>
            <Badge variant="info" className="font-mono">
              {config.rules.multiple_speaker_threshold_ms}ms
            </Badge>
          </div>
          <input
            type="range"
            min="200"
            max="1500"
            step="50"
            value={config.rules.multiple_speaker_threshold_ms}
            onChange={(e) =>
              onChange({
                ...config,
                rules: { ...config.rules, multiple_speaker_threshold_ms: Number(e.target.value) }
              })
            }
            className="w-full accent-blue-500 cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-gray-400 font-mono">
            <span>200ms (Instant)</span>
            <span>1500ms (Delayed)</span>
          </div>
        </Card>
      </div>

      {/* Subsystem Engines Toggles */}
      <Card className="p-4 bg-white space-y-3">
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
          Automated AI Detection Pipelines
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="p-3 rounded-lg bg-white border border-gray-200 flex items-center gap-2.5 cursor-pointer hover:border-gray-300 transition-colors">
            <input
              type="checkbox"
              checked={config.rules.seat_compliance_enabled}
              onChange={(e) =>
                onChange({
                  ...config,
                  rules: { ...config.rules, seat_compliance_enabled: e.target.checked }
                })
              }
              className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
            />
            <div>
              <div className="text-xs font-bold text-gray-800 flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>Vision Seat Tracking</span>
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                Tracks member presence in designated seat zone
              </div>
            </div>
          </label>

          <label className="p-3 rounded-lg bg-white border border-gray-200 flex items-center gap-2.5 cursor-pointer hover:border-gray-300 transition-colors">
            <input
              type="checkbox"
              checked={config.rules.offensive_language_detection}
              onChange={(e) =>
                onChange({
                  ...config,
                  rules: { ...config.rules, offensive_language_detection: e.target.checked }
                })
              }
              className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
            />
            <div>
              <div className="text-xs font-bold text-gray-800 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-rose-400" />
                <span>NLP Unparliamentary Filter</span>
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                Flag prohibited words & unparliamentary phrasing
              </div>
            </div>
          </label>

          <label className="p-3 rounded-lg bg-white border border-gray-200 flex items-center gap-2.5 cursor-pointer hover:border-gray-300 transition-colors">
            <input
              type="checkbox"
              checked={config.rules.movement_rules_enabled}
              onChange={(e) =>
                onChange({
                  ...config,
                  rules: { ...config.rules, movement_rules_enabled: e.target.checked }
                })
              }
              className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
            />
            <div>
              <div className="text-xs font-bold text-gray-800 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-sky-400" />
                <span>Well-Rush Detection</span>
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                Detects unauthorized motion into chamber well
              </div>
            </div>
          </label>
        </div>
      </Card>
    </div>
  );
};
