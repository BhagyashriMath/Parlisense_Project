"""
Alert Service for Parliamentary Sessions
Handles alert broadcasting, prioritization, acknowledgment, and severity metrics.
"""

from typing import Dict, Any, List

class AlertService:
    def __init__(self):
        self.alerts_store: List[Dict[str, Any]] = []

    def add_alert(self, alert: Dict[str, Any]):
        self.alerts_store.insert(0, alert)
        if len(self.alerts_store) > 100:
            self.alerts_store = self.alerts_store[:100]

    def acknowledge_alert(self, alert_id: str) -> bool:
        for a in self.alerts_store:
            if a.get("alert_id") == alert_id:
                a["status"] = "ACKNOWLEDGED"
                return True
        return False

    def get_summary_stats(self) -> Dict[str, int]:
        counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "TOTAL": len(self.alerts_store)}
        for a in self.alerts_store:
            sev = a.get("severity", "LOW")
            if sev in counts:
                counts[sev] += 1
        return counts
