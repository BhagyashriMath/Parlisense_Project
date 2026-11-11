import React from "react";
import { useParliament } from "../infrastructure/context/ParliamentContext";
import { MainLayout } from "../layouts/MainLayout";
import { Card } from "../components/common/Card";
import { Badge } from "../components/common/Badge";
import { Volume2, VolumeX, Camera, Mic, Radio, Sliders } from "lucide-react";

export default function SettingsPage() {
  const { isMuted, setIsMuted, isWebcamActive, setIsWebcamActive, isMicActive, setIsMicActive, switchMode, telemetry } = useParliament();
  const isDemo = telemetry?.mode === "DEMO";

  return (
    <div className="flex-1 p-4 overflow-y-auto space-y-4 max-w-4xl mx-auto w-full text-gray-900">
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-500/40 rounded-2xl p-5 shadow-xl">
        <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-50/60 px-2 py-0.5 rounded border border-amber-500/30 font-mono">
          SYSTEM PREFERENCES
        </span>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
          Chamber & Hardware Settings
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Configure local terminal audio feedback, camera streams, and telemetry source.
        </p>
      </div>

      <div className="space-y-3">
        <Card className="bg-white border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Chamber Acoustic Audio Chimes</h2>
              <p className="text-xs text-gray-500">Audible bell chimes for parliamentary warnings and gavel alerts</p>
            </div>
          </div>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isMuted ? "bg-gray-100 text-gray-500 hover:bg-gray-200" : "bg-amber-600 text-slate-950 hover:bg-amber-500"
            }`}
          >
            {isMuted ? "MUTED" : "ENABLED"}
          </button>
        </Card>

        <Card className="bg-white border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Telemetry Feed Source</h2>
              <p className="text-xs text-gray-500">Switch between simulation demo mode and real hardware input</p>
            </div>
          </div>
          <button
            onClick={() => switchMode(isDemo ? "LIVE" : "DEMO")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isDemo ? "bg-indigo-600 text-white hover:bg-indigo-500" : "bg-emerald-600 text-white hover:bg-emerald-500"
            }`}
          >
            {isDemo ? "DEMO SIMULATION" : "HARDWARE LIVE"}
          </button>
        </Card>
      </div>
    </div>
  );
}

SettingsPage.auth = true;
SettingsPage.layout = MainLayout;
