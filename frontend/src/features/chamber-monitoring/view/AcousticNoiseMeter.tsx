import React from "react";
import { useParliament } from "../../../infrastructure/context/ParliamentContext";
import { Volume2, AlertOctagon, Activity } from "lucide-react";

interface AcousticNoiseMeterProps {
  className?: string;
}

export function AcousticNoiseMeter({ className = "" }: AcousticNoiseMeterProps = {}) {
  const { telemetry, isMicActive, liveMicDb } = useParliament();

  const isLiveActive = !!telemetry?.is_active && !telemetry?.is_paused;
  const hasActiveSpeaker = !!telemetry?.active_speaker && (telemetry.speaking_duration_seconds ?? 0) > 0;

  // When session is not live, or no one is speaking (and local mic is off), noise is 0.0 dB
  const noiseDb = !isLiveActive
    ? 0
    : isMicActive && liveMicDb !== undefined && liveMicDb !== null
    ? liveMicDb
    : hasActiveSpeaker
    ? (telemetry?.ai_output?.noise_level ?? 0)
    : 0;

  const category = noiseDb <= 0
    ? "SILENCE / IDLE"
    : noiseDb >= 80 
    ? "High Noise" 
    : noiseDb >= 68 
    ? "Elevated Chatter" 
    : (telemetry?.ai_output?.noise_category || "Normal Noise");

  const isHighNoise = noiseDb >= 80;
  const isModerate = noiseDb >= 68 && noiseDb < 80;

  // Compute percentage on 0 to 100 dB scale
  const percentage = noiseDb <= 0 ? 0 : Math.min(100, Math.max(5, ((noiseDb - 30) / 70) * 100));

  let barColor = "bg-gray-200";
  let textColor = "text-gray-400";
  let statusBadge = "bg-gray-100 text-gray-500 border-gray-300";

  if (noiseDb > 0) {
    if (isHighNoise) {
      barColor = "bg-rose-500";
      textColor = "text-rose-400";
      statusBadge = "bg-rose-500/20 text-red-700 border-rose-500/40 animate-pulse";
    } else if (isModerate) {
      barColor = "bg-amber-500";
      textColor = "text-amber-400";
      statusBadge = "bg-amber-500/15 text-amber-700 border-amber-500/30";
    } else {
      barColor = "bg-emerald-500";
      textColor = "text-emerald-400";
      statusBadge = "bg-emerald-500/10 text-emerald-700 border-emerald-500/30";
    }
  }

  // Simulated visual waveform bars
  const bars = [40, 65, 80, 50, 90, 75, 45, 60, 85, 70, 55, 95, 60, 48, 72, 88];

  return (
    <div id="acoustic-noise-meter" className={`bg-white rounded-xl border border-gray-200 p-2.5 shadow-sm flex flex-col justify-between ${className}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded bg-gray-100 text-amber-400 border border-gray-300">
            <Volume2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider leading-none">
              Acoustic Floor Decibels
            </h3>
            <p className="text-[9px] text-gray-400 leading-none mt-0.5">Chamber audio & decibel monitor</p>
          </div>
        </div>

      </div>

      {/* Main Decibel Display & Waveform */}
      <div className="flex items-center justify-between my-1">
        <div className="flex items-baseline gap-1.5">
          <span className={`text-xl font-black font-mono tracking-tight ${textColor}`}>
            {noiseDb.toFixed(1)}
          </span>
          <span className="text-xs font-bold text-gray-500">dB SPL</span>
          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ml-1 ${statusBadge}`}>
            {category.toUpperCase()}
          </span>
        </div>

        {/* Animated Waveform Bars */}
        <div className="flex items-end gap-0.5 h-6 px-1.5 bg-gray-50 rounded border border-gray-200/80">
          {bars.map((heightPercent, idx) => {
            const dynamicScale = noiseDb <= 0 ? 6 : Math.min(100, Math.max(15, (heightPercent * (noiseDb / 60))));
            return (
              <div
                key={idx}
                className={`w-1 rounded-t transition-all duration-300 ${barColor}`}
                style={{
                  height: `${dynamicScale}%`,
                  opacity: noiseDb <= 0 ? 0.25 : (0.6 + (idx % 3) * 0.15)
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Gradient Progress Meter */}
      <div>
        <div className="w-full bg-white h-1.5 rounded-full overflow-hidden border border-gray-200 relative">
          <div
            className={`h-full transition-all duration-300 ${barColor}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-gray-400 mt-0.5 font-mono">
          <span>40 dB (Quiet)</span>
          <span>60 dB (Normal)</span>
          <span className="text-rose-400 font-bold">82+ dB (High Noise)</span>
        </div>
      </div>
    </div>
  );
}
