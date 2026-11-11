"""
Multi-Speaker & Parliamentary Disruption Detection Module
Detects simultaneous speakers, microphone overlaps, interruptions, and commotion in the house.
"""

from typing import Dict, Any, List, Optional

class DisruptionDetector:
    def __init__(self):
        self.status = "ACTIVE"

    def detect(self,
               active_speakers: List[str],
               noise_db: float,
               emotion_label: str,
               has_unauthorized_movement: bool) -> Dict[str, Any]:
        """
        Evaluate multi-speaker state and chamber disruption likelihood.
        """
        num_speakers = len(active_speakers) if active_speakers else 1
        is_multiple_speakers = num_speakers > 1
        
        # Calculate composite disruption index (0.0 to 1.0)
        disruption_score = 0.0
        reasons = []

        if is_multiple_speakers:
            disruption_score += 0.40
            reasons.append(f"Multiple speakers active ({num_speakers} concurrent)")

        if noise_db > 80.0:
            disruption_score += 0.35
            reasons.append(f"Excessive ambient noise ({noise_db} dB)")

        if emotion_label in ["Heated", "Angry"]:
            disruption_score += 0.20
            reasons.append(f"Agitated emotional climate ({emotion_label})")

        if has_unauthorized_movement:
            disruption_score += 0.30
            reasons.append("Physical displacement from allocated seats detected")

        disruption_score = min(1.0, disruption_score)
        is_disrupted = disruption_score >= 0.50

        return {
            "is_disrupted": is_disrupted,
            "disruption_score": round(disruption_score, 2),
            "disruption_level": "Severe" if disruption_score > 0.7 else ("Moderate" if disruption_score > 0.4 else "Low"),
            "multiple_speakers": is_multiple_speakers,
            "active_speaker_count": num_speakers,
            "interruption_reasons": reasons,
            "status": "DISRUPTION_DETECTED" if is_disrupted else "ORDERLY"
        }

if __name__ == "__main__":
    dd = DisruptionDetector()
    print("Normal:", dd.detect(["M001"], 55.0, "Neutral", False))
    print("Disrupted:", dd.detect(["M001", "M002", "M006"], 84.0, "Angry", True))
