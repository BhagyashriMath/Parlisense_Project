"""
Parliamentary Rule Decision Engine
Consumes standardized AI output JSON from vision, speech, NLP, acoustic, and sensor streams.
Applies configurable rules from rules/rules.json and generates prioritized alerts.
"""

import os
import json
import time
import datetime
from typing import Dict, Any, List, Optional

class RuleEngine:
    def __init__(self, rules_path: str = "ml/rules/rules.json"):
        self.rules_path = rules_path
        self.rules_config = self._load_rules()
        self.status = "ACTIVE"

    def _load_rules(self) -> Dict[str, Any]:
        if os.path.exists(self.rules_path):
            try:
                with open(self.rules_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"[RULE_ENGINE] Failed to read {self.rules_path}: {e}")
        return self._default_rules()

    def _default_rules(self) -> Dict[str, Any]:
        return {
            "thresholds": {
                "speaking_time_max_default_seconds": 300,
                "noise_high_db": 82,
                "agenda_similarity_min": 0.45,
                "emotion_heated_confidence_threshold": 0.70,
                "offensive_confidence_threshold": 0.60
            }
        }

    def evaluate(self, ai_output: Dict[str, Any], member_info: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Evaluate standardized AI telemetry and generate rule violations & alerts.
        """
        alerts = []
        violations = []
        timestamp = ai_output.get("timestamp") or datetime.datetime.now().strftime("%H:%M:%S")
        member_id = ai_output.get("member_id", "M001")
        seat_id = ai_output.get("seat_id", "S01")
        member_name = member_info.get("name", f"Member {member_id}") if member_info else f"Member {member_id}"

        thresholds = self.rules_config.get("thresholds", {})
        max_speaking_time = member_info.get("allocated_time_seconds", thresholds.get("speaking_time_max_default_seconds", 300)) if member_info else thresholds.get("speaking_time_max_default_seconds", 300)

        # RULE 8: EMERGENCY BUTTON (Highest Priority)
        if ai_output.get("emergency", False):
            alert = {
                "alert_id": f"ALT-EMG-{int(time.time()*1000)}",
                "timestamp": timestamp,
                "rule_id": "RULE_8_EMERGENCY_BUTTON",
                "member_id": member_id,
                "seat_id": seat_id,
                "member_name": member_name,
                "type": "EMERGENCY_ACTIVATED",
                "severity": "CRITICAL",
                "title": "CRITICAL EMERGENCY IN CHAMBER",
                "description": f"Emergency button triggered at Seat {seat_id} ({member_name}). Immediate attention required.",
                "source_module": "Emergency Sensor Console",
                "status": "ACTIVE"
            }
            alerts.append(alert)
            violations.append(alert)

        # RULE 5: OFFENSIVE LANGUAGE
        if ai_output.get("offensive", False):
            flagged = ai_output.get("flagged_words", [])
            words_str = f" ('{', '.join(flagged)}')" if flagged else ""
            alert = {
                "alert_id": f"ALT-OFF-{int(time.time()*1000)}",
                "timestamp": timestamp,
                "rule_id": "RULE_5_OFFENSIVE_LANGUAGE",
                "member_id": member_id,
                "seat_id": seat_id,
                "member_name": member_name,
                "type": "UNPARLIAMENTARY_LANGUAGE",
                "severity": "CRITICAL",
                "title": "Unparliamentary Language Detected",
                "description": f"Expungable or offensive phrase{words_str} detected during floor address.",
                "source_module": "NLP / Lexical Filter",
                "confidence": ai_output.get("offensive_score", 0.95),
                "status": "ACTIVE"
            }
            alerts.append(alert)
            violations.append(alert)

        # RULE 2: HIGH NOISE
        noise_level = ai_output.get("noise_level", 50.0)
        noise_thresh = thresholds.get("noise_high_db", 82)
        if noise_level >= noise_thresh:
            alert = {
                "alert_id": f"ALT-NSE-{int(time.time()*1000)}",
                "timestamp": timestamp,
                "rule_id": "RULE_2_HIGH_NOISE",
                "member_id": member_id,
                "seat_id": seat_id,
                "member_name": member_name,
                "type": "CHAMBER_HIGH_NOISE",
                "severity": "HIGH",
                "title": "High Noise Level in Chamber",
                "description": f"Chamber acoustics registered {noise_level} dB (Threshold: {noise_thresh} dB). Decorum advisory.",
                "source_module": "Acoustic Noise Sensor",
                "status": "ACTIVE"
            }
            alerts.append(alert)
            violations.append(alert)

        # RULE 6: MULTIPLE SPEAKERS / INTERRUPTION
        if ai_output.get("multiple_speakers", False):
            alert = {
                "alert_id": f"ALT-MUL-{int(time.time()*1000)}",
                "timestamp": timestamp,
                "rule_id": "RULE_6_MULTIPLE_SPEAKERS",
                "member_id": member_id,
                "seat_id": seat_id,
                "member_name": member_name,
                "type": "SIMULTANEOUS_SPEAKERS",
                "severity": "HIGH",
                "title": "Simultaneous Floor Interruptions",
                "description": "Multiple microphones and concurrent speakers active without Chair recognition.",
                "source_module": "Disruption & Multi-mic Analyzer",
                "status": "ACTIVE"
            }
            alerts.append(alert)
            violations.append(alert)

        # RULE 7: UNAUTHORIZED SEAT MOVEMENT / WELL RUSH
        movement_status = ai_output.get("movement_status", "normal").lower()
        if "moved" in movement_status or "displaced" in movement_status or "well rush" in movement_status:
            alert = {
                "alert_id": f"ALT-MOV-{int(time.time()*1000)}",
                "timestamp": timestamp,
                "rule_id": "RULE_7_UNAUTHORIZED_MOVEMENT",
                "member_id": member_id,
                "seat_id": seat_id,
                "member_name": member_name,
                "type": "UNAUTHORIZED_MOVEMENT",
                "severity": "MEDIUM",
                "title": "Unauthorized Seat Displacement / Well Rush",
                "description": f"Computer vision tracking identified member moving from Seat {seat_id} towards the well.",
                "source_module": "YOLO Computer Vision",
                "status": "ACTIVE"
            }
            alerts.append(alert)
            violations.append(alert)

        # RULE 3: OFF-TOPIC DISCUSSION
        agenda_relevance = ai_output.get("agenda_relevance", 0.85)
        agenda_min = thresholds.get("agenda_similarity_min", 0.45)
        if agenda_relevance < agenda_min and ai_output.get("speaking_time", 0) > 15:
            alert = {
                "alert_id": f"ALT-TOP-{int(time.time()*1000)}",
                "timestamp": timestamp,
                "rule_id": "RULE_3_OFF_TOPIC",
                "member_id": member_id,
                "seat_id": seat_id,
                "member_name": member_name,
                "type": "OFF_TOPIC_SPEECH",
                "severity": "MEDIUM",
                "title": "Speech Deviating from Active Agenda",
                "description": f"Current address has {round(agenda_relevance*100)}% relevance to the active Bill.",
                "source_module": "NLP Agenda Analyzer",
                "status": "ACTIVE"
            }
            alerts.append(alert)
            violations.append(alert)

        # RULE 4: HEATED DEBATE
        emotion = ai_output.get("emotion", "neutral").lower()
        if emotion in ["heated", "angry"]:
            alert = {
                "alert_id": f"ALT-EMT-{int(time.time()*1000)}",
                "timestamp": timestamp,
                "rule_id": "RULE_4_HEATED_DEBATE",
                "member_id": member_id,
                "seat_id": seat_id,
                "member_name": member_name,
                "type": "HEATED_DEBATE",
                "severity": "MEDIUM",
                "title": "Heated Debate Tone Detected",
                "description": f"Acoustic and NLP sentiment registered elevated emotional intensity ({emotion.title()}).",
                "source_module": "Emotion & Tone Classifier",
                "status": "ACTIVE"
            }
            alerts.append(alert)

        # RULE 1: SPEAKING TIME EXCEEDED
        speaking_time = ai_output.get("speaking_time", 0)
        if speaking_time > max_speaking_time:
            overage = speaking_time - max_speaking_time
            alert = {
                "alert_id": f"ALT-TIM-{int(time.time()*1000)}",
                "timestamp": timestamp,
                "rule_id": "RULE_1_SPEAKING_TIME",
                "member_id": member_id,
                "seat_id": seat_id,
                "member_name": member_name,
                "type": "SPEAKING_TIME_EXCEEDED",
                "severity": "LOW",
                "title": "Allocated Speaking Time Exceeded",
                "description": f"Member has exceeded limit by {overage} seconds (Allocated: {max_speaking_time}s).",
                "source_module": "Session Floor Timer",
                "status": "ACTIVE"
            }
            alerts.append(alert)
            violations.append(alert)

        # Overall Chamber Status
        if any(a["severity"] == "CRITICAL" for a in alerts):
            chamber_status = "CRITICAL_ACTION_REQUIRED"
        elif any(a["severity"] == "HIGH" for a in alerts):
            chamber_status = "DISRUPTIVE_ALERT"
        elif any(a["severity"] == "MEDIUM" for a in alerts):
            chamber_status = "DECORUM_ADVISORY"
        elif any(a["severity"] == "LOW" for a in alerts):
            chamber_status = "TIMER_ADVISORY"
        else:
            chamber_status = "NORMAL_ORDER"

        return {
            "timestamp": timestamp,
            "chamber_status": chamber_status,
            "has_violations": len(violations) > 0,
            "violations_count": len(violations),
            "alerts_count": len(alerts),
            "alerts": alerts,
            "violations": violations
        }

if __name__ == "__main__":
    engine = RuleEngine()
    test_input = {
        "timestamp": "10:30:00",
        "member_id": "M001",
        "seat_id": "S01",
        "speaking_time": 320,
        "agenda_relevance": 0.32,
        "emotion": "heated",
        "offensive": True,
        "flagged_words": ["liar"],
        "noise_level": 85.2,
        "multiple_speakers": True,
        "movement_status": "Well Rush",
        "emergency": False
    }
    eval_res = engine.evaluate(test_input)
    print(f"Generated {len(eval_res['alerts'])} alerts. Chamber Status: {eval_res['chamber_status']}")
