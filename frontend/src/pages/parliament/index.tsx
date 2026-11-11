import React from "react";
import { useParliament } from "../../infrastructure/context/ParliamentContext";
import { CameraStreamView } from "../../features/chamber-monitoring/view/CameraStreamView";
import { LiveTranscript } from "../../features/chamber-monitoring/view/LiveTranscript";
import { AcousticNoiseMeter } from "../../features/chamber-monitoring/view/AcousticNoiseMeter";
import { LiveSessionSummary } from "../../features/chamber-monitoring/view/LiveSessionSummary";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { MainLayout } from "../../layouts/MainLayout";
import { Building2, Activity } from "lucide-react";

export default function ParliamentIndexPage() {
  const { telemetry } = useParliament();

  return (
    <div className="flex-1 p-4 overflow-y-auto space-y-4 max-w-7xl mx-auto w-full text-gray-900">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-500/40 rounded-2xl p-4 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl shadow-inner">
            🏛️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-50/60 px-2 py-0.5 rounded border border-amber-500/30 font-mono">
                CHAMBER FLOOR MONITOR
              </span>
              <Badge variant={telemetry?.is_active ? "success" : "warning"}>
                {telemetry?.is_active ? "SITTING LIVE" : "SITTING INACTIVE"}
              </Badge>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5">
              Parliament House • Main Chamber
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Current Bill: <strong className="text-amber-700">{telemetry?.current_bill || "General Legislative Debate"}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Monitoring Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <CameraStreamView />
          <LiveTranscript />
        </div>
        <div className="space-y-4">
          <AcousticNoiseMeter />
          <LiveSessionSummary />
        </div>
      </div>
    </div>
  );
}

ParliamentIndexPage.auth = true;
ParliamentIndexPage.layout = MainLayout;
