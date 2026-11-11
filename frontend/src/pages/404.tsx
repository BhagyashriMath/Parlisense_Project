import React from "react";
import { Link } from "react-router-dom";
import { EmptyLayout } from "../layouts/EmptyLayout";
import { AlertTriangle, Home, ArrowLeft } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen w-screen bg-white flex items-center justify-center p-4 text-gray-900 selection:bg-amber-500 selection:text-black">
      <div className="max-w-md w-full text-center space-y-5 bg-white border border-gray-200 p-8 rounded-2xl shadow-2xl backdrop-blur-md">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl mx-auto shadow-inner">
          🏛️
        </div>

        <div>
          <span className="text-[11px] font-black uppercase tracking-widest text-amber-400 bg-amber-50/60 px-2.5 py-1 rounded border border-amber-500/30 font-mono">
            404 • ORDER OF THE DAY NOT FOUND
          </span>
          <h1 className="text-3xl font-black text-white tracking-tight mt-3">
            Route Not Found
          </h1>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            The requested parliamentary chamber page does not exist or has been moved under House Rules.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/dashboard"
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-white font-bold text-xs border border-gray-300 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go to Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

NotFoundPage.auth = false;
NotFoundPage.layout = EmptyLayout;
