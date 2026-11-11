"""
Emotion Analysis Module for Parliamentary Session Monitoring
Analyzes acoustic tone and transcript text to estimate emotional state:
Calm, Neutral, Heated, Angry, Positive.
Note: Computational estimation for session decorum metrics, not psychological diagnosis.
"""

import re
from typing import Dict, Any

class EmotionAnalyzer:
    def __init__(self):
        self.status = "ACTIVE"
        # Emotional lexicons for parliamentary floor analysis
        self.heated_keywords = {
            "shame", "unacceptable", "outrageous", "disgrace", "lie", "liar", "fraud",
            "corrupt", "illegal", "betrayal", "how dare", "protest", "boycott", "shout",
            "nonsense", "rigged", "walkout", "conspiracy", "scandal"
        }
        self.angry_keywords = {
            "shut up", "get out", "liars", "destroy", "traitor", "thieves", "violence",
            "down with", "furious", "silence", "expel"
        }
        self.positive_keywords = {
            "appreciate", "welcome", "congratulate", "support", "commend", "bipartisan",
            "constructive", "landmark", "grateful", "honourable", "achievement", "progress"
        }
        self.calm_keywords = {
            "respectfully", "procedural", "table", "clause", "sub-section", "statistic",
            "amendment", "statutory", "noting", "referring", "objective", "deliberation"
        }

    def analyze(self, text: str, audio_db: float = 55.0, pitch_variance: float = 0.5) -> Dict[str, Any]:
        """
        Estimate emotional state based on linguistic keywords and acoustic energy.
        """
        text_lower = text.lower() if text else ""
        
        heated_hits = sum(1 for kw in self.heated_keywords if kw in text_lower)
        angry_hits = sum(1 for kw in self.angry_keywords if kw in text_lower)
        positive_hits = sum(1 for kw in self.positive_keywords if kw in text_lower)
        calm_hits = sum(1 for kw in self.calm_keywords if kw in text_lower)

        # Acoustic loudness modifier (e.g. > 75 dB increases agitation weight)
        acoustic_heat = max(0.0, (audio_db - 60.0) / 25.0)

        # Determine dominant classification
        if angry_hits >= 1 or (heated_hits >= 2 and audio_db > 78):
            label = "Angry"
            confidence = min(0.96, 0.70 + (angry_hits * 0.1) + (acoustic_heat * 0.15))
        elif heated_hits >= 1 or audio_db > 72:
            label = "Heated"
            confidence = min(0.92, 0.65 + (heated_hits * 0.1) + (acoustic_heat * 0.12))
        elif positive_hits >= 1 and audio_db <= 68:
            label = "Positive"
            confidence = min(0.90, 0.72 + (positive_hits * 0.08))
        elif calm_hits >= 1 and audio_db <= 62:
            label = "Calm"
            confidence = min(0.95, 0.75 + (calm_hits * 0.08))
        else:
            label = "Neutral"
            confidence = 0.85

        return {
            "emotion": label,
            "confidence": round(confidence, 2),
            "is_heated": label in ["Heated", "Angry"],
            "acoustic_intensity": round(audio_db, 1),
            "disclaimer": "AI estimation for decorum monitoring, not psychological diagnosis."
        }

if __name__ == "__main__":
    analyzer = EmotionAnalyzer()
    print("Normal:", analyzer.analyze("I respectfully refer to clause 3 of the education bill.", 52.0))
    print("Heated:", analyzer.analyze("This is outrageous and an unacceptable lie!", 82.0))
