"""
Member Scorecard & Analytical Metric Engine
Computes transparent, weighted performance and discipline scores for MPs based on AI outputs.
"""

from typing import Dict, Any, List

class MemberScoringEngine:
    def __init__(self, weights: Dict[str, float] = None):
        self.weights = weights or {
            "participation": 0.20,
            "agenda_relevance": 0.25,
            "speaking_discipline": 0.20,
            "seat_compliance": 0.15,
            "decorum_discipline": 0.20
        }

    def compute_scorecard(self, member_data: Dict[str, Any], session_history: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate individual member scorecard using weighted analytical metrics.
        """
        member_id = member_data.get("member_id", "M001")
        name = member_data.get("name", "Member")
        seat_id = member_data.get("seat_id", "S01")

        # Extract session metrics
        speaking_time_sec = session_history.get("speaking_time_seconds", 120)
        allocated_time_sec = member_data.get("allocated_time_seconds", 300)
        speaking_turns = session_history.get("speaking_turns", 1)
        avg_agenda_rel = session_history.get("avg_agenda_relevance", 88.0)
        time_violations = session_history.get("time_violations", 0)
        seat_violations = session_history.get("seat_violations", 0)
        offensive_count = session_history.get("offensive_count", 0)
        interruption_count = session_history.get("interruption_count", 0)
        presence_ratio = session_history.get("presence_ratio", 0.95)

        # 1. Participation Score (Floor time utilized productively + presence)
        utilization = min(1.0, speaking_time_sec / max(60, allocated_time_sec)) if speaking_turns > 0 else 0.5
        participation_score = round(min(100.0, (presence_ratio * 50.0) + (utilization * 50.0)), 1)

        # 2. Agenda Relevance Score
        agenda_score = round(min(100.0, max(10.0, avg_agenda_rel)), 1)

        # 3. Speaking Discipline (Adherence to time limits)
        time_penalty = time_violations * 15.0
        speaking_discipline = round(max(10.0, min(100.0, 100.0 - time_penalty)), 1)

        # 4. Seat Compliance (Staying in allocated seat, no well rush)
        seat_penalty = seat_violations * 20.0
        seat_compliance = round(max(10.0, min(100.0, 100.0 - seat_penalty)), 1)

        # 5. Decorum & Discipline (No offensive language, no unparliamentary interruptions)
        decorum_penalty = (offensive_count * 35.0) + (interruption_count * 8.0)
        decorum_score = round(max(10.0, min(100.0, 100.0 - decorum_penalty)), 1)

        # Weighted Overall Score
        overall = (
            (participation_score * self.weights["participation"]) +
            (agenda_score * self.weights["agenda_relevance"]) +
            (speaking_discipline * self.weights["speaking_discipline"]) +
            (seat_compliance * self.weights["seat_compliance"]) +
            (decorum_score * self.weights["decorum_discipline"])
        )
        overall_score = round(min(100.0, max(0.0, overall)), 1)

        # Performance Grade
        if overall_score >= 90:
            grade = "A+ (Exemplary Parliamentary Conduct)"
        elif overall_score >= 80:
            grade = "A (High Order & Constructive)"
        elif overall_score >= 70:
            grade = "B (Satisfactory Compliance)"
        elif overall_score >= 55:
            grade = "C (Needs Decorum Improvement)"
        else:
            grade = "D (Multiple Infractions Flagged)"

        return {
            "member_id": member_id,
            "name": name,
            "seat_id": seat_id,
            "overall_score": overall_score,
            "grade": grade,
            "categories": {
                "participation": participation_score,
                "agenda_relevance": agenda_score,
                "speaking_discipline": speaking_discipline,
                "seat_compliance": seat_compliance,
                "decorum_discipline": decorum_score
            },
            "statistics": {
                "speaking_time_seconds": speaking_time_sec,
                "allocated_time_seconds": allocated_time_sec,
                "speaking_turns": speaking_turns,
                "time_violations": time_violations,
                "seat_violations": seat_violations,
                "offensive_incidents": offensive_count,
                "interruptions": interruption_count
            },
            "disclaimer": "Analytical decision-support indicator. Not an official disciplinary ruling."
        }

if __name__ == "__main__":
    scorer = MemberScoringEngine()
    member = {"member_id": "M001", "name": "Dr. Rajeshwar Sharma", "seat_id": "S01", "allocated_time_seconds": 300}
    history = {"speaking_time_seconds": 240, "speaking_turns": 2, "avg_agenda_relevance": 92.0, "time_violations": 0, "seat_violations": 0, "offensive_count": 0, "interruption_count": 0, "presence_ratio": 0.98}
    print("Scorecard:", scorer.compute_scorecard(member, history))
