import React from "react";
import { useAdminViewModel } from "../viewmodel/useAdminViewModel";
import { PreSessionConfig } from "./PreSessionConfig";
import { LiveSessionMonitor } from "./LiveSessionMonitor";
import { PostSessionSummary } from "./PostSessionSummary";
import { ChevronRight, ShieldCheck, UserPlus } from "lucide-react";

/**
 * AdminDashboard View (MVM Architecture)
 * Pure presentation component bound to `useAdminViewModel`.
 */
export function AdminDashboard() {
  const vm = useAdminViewModel();

  return (
    <div
      id="admin-dashboard-root"
      className="h-full flex-1 min-h-0 flex flex-col gap-1.5 overflow-hidden"
    >
      {/* Top 3-Phase State Controller Banner */}
      <div className="bg-white border border-gray-200 rounded-xl p-1.5 sm:p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          {vm.phases.map((phase, idx) => {
            const Icon = phase.icon;
            const isSelected = vm.adminState === phase.id;
            return (
              <React.Fragment key={phase.id}>
                <button
                  id={`admin-state-${phase.id.toLowerCase()}`}
                  onClick={() => vm.setAdminState(phase.id)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg flex items-center gap-2 text-left transition-all flex-shrink-0 cursor-pointer ${
                    isSelected
                      ? "bg-gray-100 border border-amber-500/60 shadow-md text-gray-900"
                      : "text-gray-500 hover:text-gray-800 hover:bg-gray-100/40 border border-transparent"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                      isSelected
                        ? "bg-amber-500 text-slate-950 shadow-sm"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {phase.number}
                  </div>

                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5 leading-tight whitespace-nowrap">
                      <span>{phase.title}</span>
                      {phase.badge && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                    </div>
                    <div className="text-[9px] text-gray-400 hidden xl:block leading-tight">
                      {phase.subtitle}
                    </div>
                  </div>
                </button>

                {idx < vm.phases.length - 1 && (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-700 hidden sm:block flex-shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Admin Controls & Status Indicator Pill */}
        <div className="flex items-center justify-between sm:justify-end gap-2 flex-shrink-0 pr-1">
          <button
            id="admin-enroll-member-btn"
            onClick={vm.navigateToRegister}
            className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center gap-1.5 transition-all active:scale-95 border border-emerald-400/40 cursor-pointer"
            title="Enroll a new Member of Parliament into chamber database"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Enroll Member</span>
          </button>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-gray-200 font-mono text-gray-700 hidden md:inline-flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-amber-400" />
            ADMIN ROLE AUTHORIZED
          </span>
        </div>
      </div>


      {/* Main Dynamic Phase Workspace */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {vm.adminState === "BEFORE_SESSION" && (
          <PreSessionConfig
            onSessionStarted={vm.handleSessionStarted}
            members={vm.members}
            onRefreshMembers={vm.refreshMembers}
          />
        )}

        {vm.adminState === "DURING_SESSION" && (
          <LiveSessionMonitor
            onEndSession={vm.handleEndSession}
            onOpenReport={vm.openReport}
          />
        )}

        {vm.adminState === "AFTER_SESSION" && (
          <PostSessionSummary onStartNewConfig={vm.handleStartNewConfig} />
        )}
      </div>
    </div>
  );
}
