import React from "react";
import { useParams, Link } from "react-router-dom";
import { useParliament } from "../../infrastructure/context/ParliamentContext";
import { MainLayout } from "../../layouts/MainLayout";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { ArrowLeft, Calendar, FileText, Award } from "lucide-react";

export default function ParliamentSittingByIdPage() {
  const { id } = useParams<{ id: string }>();
  const { telemetry, openReport } = useParliament();

  return (
    <div className="flex-1 p-4 overflow-y-auto space-y-4 max-w-5xl mx-auto w-full text-slate-100">
      <Link
        to="/parliament"
        className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-700 transition-colors font-semibold"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Chamber Overview</span>
      </Link>

      <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-500/40 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-50/60 px-2 py-0.5 rounded border border-amber-500/30 font-mono">
            SITTING DETAILS
          </span>
          <Badge variant="gold" className="font-mono text-xs">
            ID: {id}
          </Badge>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1.5">
          {telemetry?.current_bill || "Parliamentary Legislative Session"}
        </h1>
        <p className="text-xs text-slate-300 mt-1">
          Session ID: <strong className="font-mono text-amber-700">{id}</strong> • Mode:{" "}
          <strong className="text-emerald-400">{telemetry?.mode || "DEMO"}</strong> • Status:{" "}
          <strong className="text-amber-400">{telemetry?.is_active ? "LIVE" : "CONCLUDED"}</strong>
        </p>

        <div className="mt-4 flex gap-2">
          <button
            onClick={openReport}
            className="text-xs bg-amber-600 hover:bg-amber-500 text-slate-950 font-black px-4 py-2 rounded-lg shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Generate Official Chamber Report</span>
          </button>
        </div>
      </div>
    </div>
  );
}

ParliamentSittingByIdPage.auth = true;
ParliamentSittingByIdPage.layout = MainLayout;
