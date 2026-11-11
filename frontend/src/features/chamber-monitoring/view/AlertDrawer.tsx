import React, { useState } from "react";
import { useParliament } from "../../../infrastructure/context/ParliamentContext";
import { Bell, CheckCircle2 } from "lucide-react";

export function AlertDrawer() {
  const { telemetry, acknowledgeAlert } = useParliament();
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");

  const alerts = telemetry?.recent_alerts || [];

  const filteredAlerts = alerts.filter((a) => {
    if (severityFilter === "ALL") return true;
    return a.severity === severityFilter;
  });

  return (
    <div id="ai-alerts-panel" className="bg-white rounded-lg border border-gray-200 p-2 shadow-sm flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded bg-gray-100 text-rose-400 border border-gray-300">
            <Bell className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider leading-none">
              AI Decision Alerts
            </h3>
            <p className="text-[9px] text-gray-400 leading-none mt-0.5">Automated Standing Order Breaches</p>
          </div>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-0.5 bg-white p-0.5 rounded border border-gray-200 text-[9px]">
          {["ALL", "CRITICAL", "HIGH", "MEDIUM"].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-1.5 py-0.2 rounded font-bold transition-colors ${
                severityFilter === sev
                  ? "bg-amber-600 text-white"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {sev === "ALL" ? "All" : sev.slice(0, 4)}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Stream */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1 text-xs">
        {filteredAlerts.length === 0 ? (
          <div className="text-gray-400 text-center py-4 flex flex-col items-center gap-1">
            <CheckCircle2 className="w-5 h-5 text-emerald-500/60" />
            <span className="text-[10px]">No active violations. Floor decorum intact.</span>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            let badgeBg = "bg-gray-100 text-gray-700 border-gray-300";
            let cardBorder = "border-gray-200";

            if (alert.severity === "CRITICAL") {
              badgeBg = "bg-red-500/20 text-red-300 border-red-500/40 animate-pulse";
              cardBorder = "border-red-600/80 bg-red-950/20";
            } else if (alert.severity === "HIGH") {
              badgeBg = "bg-orange-500/20 text-orange-300 border-orange-500/40";
              cardBorder = "border-orange-600/60 bg-orange-950/20";
            } else if (alert.severity === "MEDIUM") {
              badgeBg = "bg-amber-500/20 text-amber-700 border-amber-500/40";
              cardBorder = "border-amber-600/50 bg-amber-50/10";
            } else if (alert.severity === "LOW") {
              badgeBg = "bg-blue-500/20 text-blue-700 border-blue-500/40";
              cardBorder = "border-blue-700/40 bg-blue-50/10";
            }

            const isAcknowledged = alert.status === "ACKNOWLEDGED";

            return (
              <div
                key={alert.alert_id}
                className={`p-1.5 rounded border transition-all ${cardBorder} ${
                  isAcknowledged ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-1 mb-0.5">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className={`text-[8px] font-bold px-1 py-0.2 rounded border uppercase tracking-wider ${badgeBg}`}>
                      {alert.severity}
                    </span>
                    <span className="font-mono text-[9px] text-gray-500">{alert.timestamp}</span>
                    <span className="text-[9px] font-semibold text-gray-700">
                      {alert.seat_id} ({alert.member_name})
                    </span>
                  </div>

                  {!isAcknowledged && (
                    <button
                      onClick={() => acknowledgeAlert(alert.alert_id)}
                      className="text-[9px] px-1.5 py-0.2 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 font-semibold"
                    >
                      Ack
                    </button>
                  )}
                </div>

                <div className="font-bold text-gray-900 text-[11px] leading-tight mb-0.5">{alert.title}</div>
                <p className="text-gray-700 text-[10px] leading-snug">{alert.description}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
