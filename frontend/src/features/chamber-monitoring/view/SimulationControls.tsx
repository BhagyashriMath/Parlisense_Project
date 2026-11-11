import React from "react";
import { useParliament } from "../../../infrastructure/context/ParliamentContext";
import {
  Sparkles,
  Volume2,
  HelpCircle,
  Flame,
  ShieldX,
  Users,
  Footprints,
  ShieldAlert,
  RotateCcw
} from "lucide-react";

export function SimulationControls() {
  const { simulateEvent, triggerEmergency } = useParliament();

  const scenarios = [
    {
      id: "HIGH_NOISE",
      label: "R2: Noise >82dB",
      desc: "Simulates acoustic floor shouting (>82 dB)",
      icon: Volume2,
      color: "hover:bg-amber-600/20 hover:border-amber-500 text-amber-700"
    },
    {
      id: "OFF_TOPIC",
      label: "R3: Off-Topic",
      desc: "Simulates speech deviating from agenda (<45% relevance)",
      icon: HelpCircle,
      color: "hover:bg-yellow-600/20 hover:border-yellow-500 text-yellow-300"
    },
    {
      id: "HEATED",
      label: "R4: Heated Tone",
      desc: "Simulates elevated linguistic and acoustic emotional heat",
      icon: Flame,
      color: "hover:bg-orange-600/20 hover:border-orange-500 text-orange-300"
    },
    {
      id: "OFFENSIVE",
      label: "R5: Expungable",
      desc: "Simulates unparliamentary expungable remark",
      icon: ShieldX,
      color: "hover:bg-rose-600/20 hover:border-rose-500 text-red-700"
    },
    {
      id: "MULTIPLE_SPEAKERS",
      label: "R6: Overlapping",
      desc: "Simulates overlapping floor interruptions",
      icon: Users,
      color: "hover:bg-indigo-600/20 hover:border-indigo-500 text-indigo-700"
    },
    {
      id: "WELL_RUSH",
      label: "R7: Well Rush",
      desc: "Simulates YOLO tracking member rushing the well",
      icon: Footprints,
      color: "hover:bg-purple-600/20 hover:border-purple-500 text-purple-700"
    },
    {
      id: "UNAUTHORIZED_STANDING",
      label: "R8: Unauth Stand",
      desc: "Simulates member standing without Speaker floor permission",
      icon: ShieldAlert,
      color: "hover:bg-pink-600/20 hover:border-pink-500 text-pink-300"
    }
  ];

  return (
    <div id="ai-simulation-panel" className="bg-white rounded-lg border border-gray-200 px-2 py-1 shadow-sm flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider hidden sm:inline">
          Rule Testing Lab:
        </span>
      </div>

      <div className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar min-w-0">
        {scenarios.map((sc) => {
          const Icon = sc.icon;
          return (
            <button
              key={sc.id}
              onClick={() => simulateEvent(sc.id)}
              className={`px-1.5 py-0.5 rounded bg-gray-50 border border-gray-200 flex items-center gap-1 transition-all active:scale-95 text-[10px] font-semibold flex-shrink-0 ${sc.color}`}
              title={sc.desc}
            >
              <Icon className="w-3 h-3" />
              <span>{sc.label}</span>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => simulateEvent("NORMAL")}
        className="px-2 py-0.5 text-[10px] font-semibold rounded bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 flex items-center gap-1 flex-shrink-0"
        title="Reset telemetry to normal orderly debate"
      >
        <RotateCcw className="w-2.5 h-2.5 text-emerald-400" />
        <span>Reset</span>
      </button>
    </div>
  );
}
