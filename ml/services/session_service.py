"""
Parliament Session Coordinator Service
Maintains state, session lifecycle, continuous monitoring, and telemetry aggregator.
"""

import os
import json
import time
import datetime
from typing import Dict, Any, List, Optional
from modules.speech import SpeechRecognizer
from modules.agenda import AgendaAnalyzer
from modules.emotion import EmotionAnalyzer
from modules.offensive import OffensiveLanguageDetector
from modules.vision import VisionTracker
from modules.noise import NoiseAnalyzer
from modules.disruption import DisruptionDetector
from modules.scoring import MemberScoringEngine
from modules.rule_engine import RuleEngine

class SessionService:
    def __init__(self):
        self.session_id = f"PARL-2026-{datetime.datetime.now().strftime('%m%d%H%M')}"
        self.is_active = True
        self.is_demo_mode = True
        self.start_time = datetime.datetime.now()
        self.end_time: Optional[datetime.datetime] = None
        self.current_bill = "Digital Education & AI Governance Bill 2026"
        
        # Load sample members
        self.members = self._load_members()
        self.active_speaker_id = "M001"
        self.speaking_start_time = time.time()
        self.total_speaking_time = 0
        
        # Historical session records per member
        self.member_history: Dict[str, Dict[str, Any]] = {
            m["member_id"]: {
                "speaking_time_seconds": 180,
                "speaking_turns": 1,
                "avg_agenda_relevance": 88.0,
                "time_violations": 0,
                "seat_violations": 0,
                "offensive_count": 0,
                "interruption_count": 0,
                "presence_ratio": 1.0
            } for m in self.members
        }

        # Initialize AI Modules
        self.speech_rec = SpeechRecognizer()
        self.agenda_analyzer = AgendaAnalyzer()
        self.emotion_analyzer = EmotionAnalyzer()
        self.offensive_detector = OffensiveLanguageDetector()
        self.vision_tracker = VisionTracker()
        self.noise_analyzer = NoiseAnalyzer()
        self.disruption_detector = DisruptionDetector()
        self.scoring_engine = MemberScoringEngine()
        self.rule_engine = RuleEngine()

        # Telemetry & alerts log
        self.recent_alerts: List[Dict[str, Any]] = []
        self.recent_transcripts: List[Dict[str, Any]] = [
            {"time": "10:00:15", "speaker_id": "CHAIR", "speaker_name": "Speaker Pro-Tem", "text": "House is called to order. Consideration of the Digital Education Bill begins."},
            {"time": "10:02:10", "speaker_id": "M001", "speaker_name": "Dr. Rajeshwar Sharma", "text": "Honourable Speaker, this bill establishes AI-assisted digital laboratories across 50,000 rural schools with dedicated budget support."},
            {"time": "10:05:40", "speaker_id": "M002", "speaker_name": "Smt. Priya Sundaram", "text": "We urge the government to guarantee that student data collected under this program will remain strictly sovereign and protected."}
        ]
        self.emergency_status = False

    def _load_members(self) -> List[Dict[str, Any]]:
        path = "data/members.json"
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"[SESSION] Could not read {path}: {e}")
        return [
            {"member_id": "M001", "name": "Dr. Rajeshwar Sharma", "seat_id": "S01", "allocated_time_seconds": 600, "role": "Minister"}
        ]

    def get_active_member(self) -> Dict[str, Any]:
        for m in self.members:
            if m["member_id"] == self.active_speaker_id:
                return m
        return self.members[0]

    def set_active_speaker(self, member_id: str):
        self.active_speaker_id = member_id
        self.speaking_start_time = time.time()

    def get_ai_status(self) -> Dict[str, str]:
        return {
            "speech_recognition": self.speech_rec.status,
            "nlp_agenda_analysis": self.agenda_analyzer.status,
            "emotion_detection": self.emotion_analyzer.status,
            "offensive_detection": self.offensive_detector.status,
            "computer_vision": self.vision_tracker.status,
            "noise_analysis": self.noise_analyzer.status,
            "rule_engine": self.rule_engine.status,
            "database_storage": "ACTIVE_SQLITE"
        }

    def trigger_emergency(self, source: str = "Console Button", member_id: Optional[str] = None) -> Dict[str, Any]:
        self.emergency_status = True
        active_m = self.get_active_member()
        alert = {
            "alert_id": f"ALT-EMG-{int(time.time()*1000)}",
            "timestamp": datetime.datetime.now().strftime("%H:%M:%S"),
            "rule_id": "RULE_8_EMERGENCY_BUTTON",
            "member_id": member_id or active_m["member_id"],
            "seat_id": active_m["seat_id"],
            "member_name": active_m["name"],
            "type": "EMERGENCY_ACTIVATED",
            "severity": "CRITICAL",
            "title": "EMERGENCY ACTIVATED IN CHAMBER",
            "description": f"Emergency trigger initiated by {source}. Automatic protocol active.",
            "source_module": "Emergency Console",
            "status": "ACTIVE"
        }
        self.recent_alerts.insert(0, alert)
        return alert

    def reset_emergency(self):
        self.emergency_status = False

    def generate_current_telemetry(self) -> Dict[str, Any]:
        """
        Execute one continuous monitoring cycle aggregating all AI models.
        """
        active_member = self.get_active_member()
        now_time = datetime.datetime.now().strftime("%H:%M:%S")
        speaking_duration = int(time.time() - self.speaking_start_time) + 65

        # 1. Vision Cycle
        vision_res = self.vision_tracker.process_frame(active_speaker_seat=active_member["seat_id"])
        
        # 2. Acoustics & Noise Cycle
        noise_res = self.noise_analyzer.analyze_level()

        # 3. Speech & NLP Cycle
        latest_text = self.recent_transcripts[-1]["text"] if self.recent_transcripts else "No active speech."
        agenda_res = self.agenda_analyzer.analyze_relevance(latest_text)
        emotion_res = self.emotion_analyzer.analyze(latest_text, audio_db=noise_res["noise_level_db"])
        offensive_res = self.offensive_detector.detect(latest_text)

        # 4. Multi-speaker Disruption Cycle
        active_speakers = [active_member["member_id"]]
        disruption_res = self.disruption_detector.detect(
            active_speakers=active_speakers,
            noise_db=noise_res["noise_level_db"],
            emotion_label=emotion_res["emotion"],
            has_unauthorized_movement=vision_res["has_movement_violation"]
        )

        # 5. Standardized AI Output Struct
        ai_output = {
            "timestamp": now_time,
            "session_id": self.session_id,
            "member_id": active_member["member_id"],
            "seat_id": active_member["seat_id"],
            "member_name": active_member["name"],
            "transcript": latest_text,
            "speaking_time": speaking_duration,
            "allocated_time": active_member.get("allocated_time_seconds", 300),
            "agenda_relevance": agenda_res["relevance_score"],
            "agenda_relevance_percentage": agenda_res["relevance_percentage"],
            "agenda_status": agenda_res["status"],
            "matched_agenda_keywords": agenda_res["matched_keywords"],
            "emotion": emotion_res["emotion"],
            "emotion_confidence": emotion_res["confidence"],
            "offensive": offensive_res["is_offensive"],
            "offensive_score": offensive_res["offensive_score"],
            "flagged_words": offensive_res["flagged_words"],
            "noise_level": noise_res["noise_level_db"],
            "noise_category": noise_res["category"],
            "multiple_speakers": disruption_res["multiple_speakers"],
            "disruption_level": disruption_res["disruption_level"],
            "seat_status": vision_res["seat_status"].get(active_member["seat_id"], {}).get("status", "Seated Correctly"),
            "movement_status": vision_res["seat_status"].get(active_member["seat_id"], {}).get("movement_status", "Normal"),
            "emergency": self.emergency_status
        }

        # 6. Rule Decision Engine Evaluation
        rule_eval = self.rule_engine.evaluate(ai_output, active_member)

        # Merge generated alerts into alert queue
        for new_alert in rule_eval["alerts"]:
            # Simple deduplication by rule_id within last 15s
            if not any(a["rule_id"] == new_alert["rule_id"] for a in self.recent_alerts[:3]):
                self.recent_alerts.insert(0, new_alert)

        # Trim alerts list to latest 50
        self.recent_alerts = self.recent_alerts[:50]

        session_elapsed_sec = int((datetime.datetime.now() - self.start_time).total_seconds())

        return {
            "session_id": self.session_id,
            "is_active": self.is_active,
            "mode": "DEMO" if self.is_demo_mode else "LIVE",
            "session_duration_seconds": session_elapsed_sec,
            "session_duration_formatted": str(datetime.timedelta(seconds=session_elapsed_sec)),
            "current_bill": self.current_bill,
            "active_speaker": active_member,
            "speaking_duration_seconds": speaking_duration,
            "ai_output": ai_output,
            "chamber_status": rule_eval["chamber_status"],
            "vision_telemetry": vision_res,
            "recent_alerts": self.recent_alerts,
            "recent_transcripts": self.recent_transcripts[-10:],
            "ai_modules_health": self.get_ai_status()
        }
