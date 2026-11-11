export interface AlertItem {
  alert_id: string;
  timestamp: string;
  rule_id: string;
  member_id: string;
  seat_id: string;
  member_name: string;
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  description: string;
  source_module: string;
  confidence?: number;
  status: "ACTIVE" | "ACKNOWLEDGED";
}

export interface EmergencyExitRequest {
  id: string;
  member_id: string;
  member_name: string;
  seat_id: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requested_at: string;
  decided_at?: string;
  decided_by?: string;
}

// -------------------------------------------------------------
// Pure Domain Helper Functions
// -------------------------------------------------------------
export function isRule374Suspension(alert?: AlertItem | null): boolean {
  if (!alert) return false;
  return (
    alert.rule_id === "RULE_374" ||
    alert.rule_id === "RULE_374A" ||
    alert.type?.toLowerCase().includes("suspension") ||
    alert.severity === "CRITICAL"
  );
}

export function getAlertSeverityColor(severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"): {
  badge: string;
  border: string;
  bg: string;
} {
  switch (severity) {
    case "CRITICAL":
      return {
        badge: "bg-red-50 text-red-700 border-rose-500/50",
        border: "border-rose-500/50",
        bg: "bg-red-50/20"
      };
    case "HIGH":
      return {
        badge: "bg-orange-950 text-orange-300 border-orange-500/50",
        border: "border-orange-500/50",
        bg: "bg-orange-950/20"
      };
    case "MEDIUM":
      return {
        badge: "bg-amber-50 text-amber-700 border-amber-500/50",
        border: "border-amber-500/50",
        bg: "bg-amber-50/20"
      };
    case "LOW":
    default:
      return {
        badge: "bg-gray-100 text-gray-700 border-gray-300",
        border: "border-gray-200",
        bg: "bg-white"
      };
  }
}
