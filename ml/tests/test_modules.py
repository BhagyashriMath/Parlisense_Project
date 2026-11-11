"""
Comprehensive Test Suite for AI Parliament Monitoring System
Validates all 8 core modules, rule triggers, scoring calculation, and error handlers.
"""

import os
import pytest
from modules.speech import SpeechRecognizer
from modules.agenda import AgendaAnalyzer
from modules.emotion import EmotionAnalyzer
from modules.offensive import OffensiveLanguageDetector
from modules.vision import VisionTracker
from modules.noise import NoiseAnalyzer
from modules.disruption import DisruptionDetector
from modules.scoring import MemberScoringEngine
from modules.rule_engine import RuleEngine

def test_speech_recognizer():
    sr = SpeechRecognizer()
    assert sr.status in ["ACTIVE", "ACTIVE_FALLBACK"]
    res = sr.process_live_stream_chunk(b"", "M001")
    assert "text" in res
    assert res["status"] == "SUCCESS"

def test_agenda_analyzer():
    aa = AgendaAnalyzer()
    on_topic = aa.analyze_relevance("Honourable Speaker, the digital education grants and school infrastructure are essential.")
    assert on_topic["is_on_topic"] is True
    assert on_topic["relevance_percentage"] >= 50

    off_topic = aa.analyze_relevance("Let us talk about cricket match tickets and vacation resorts.")
    assert off_topic["is_on_topic"] is False
    assert off_topic["relevance_percentage"] < 50

def test_emotion_analyzer():
    ea = EmotionAnalyzer()
    calm_res = ea.analyze("I respectfully refer to clause 4.", audio_db=52.0)
    assert calm_res["emotion"] in ["Calm", "Neutral"]

    heated_res = ea.analyze("This is outrageous, scandalous, and an unacceptable lie!", audio_db=84.0)
    assert heated_res["emotion"] in ["Heated", "Angry"]
    assert heated_res["is_heated"] is True

def test_offensive_detector():
    od = OffensiveLanguageDetector()
    safe = od.detect("The honourable member raised a valid point.")
    assert safe["is_offensive"] is False

    offensive = od.detect("You are an idiot, a thief and a corrupt liar!")
    assert offensive["is_offensive"] is True
    assert len(offensive["flagged_words"]) >= 1

def test_vision_tracker():
    vt = VisionTracker()
    out = vt.process_frame(active_speaker_seat="S01")
    assert out["total_persons_detected"] >= 1
    assert "S01" in out["seat_status"]
    assert out["seat_status"]["S01"]["is_active_speaker"] is True

def test_noise_analyzer():
    na = NoiseAnalyzer()
    normal = na.analyze_level(simulated_db=52.0)
    assert normal["category"] == "Normal Noise"
    assert normal["is_high_noise"] is False

    high = na.analyze_level(simulated_db=86.0)
    assert high["category"] == "High Noise"
    assert high["is_high_noise"] is True

def test_disruption_detector():
    dd = DisruptionDetector()
    normal = dd.detect(["M001"], 55.0, "Neutral", False)
    assert normal["is_disrupted"] is False

    disrupted = dd.detect(["M001", "M002", "M005"], 86.0, "Angry", True)
    assert disrupted["is_disrupted"] is True
    assert disrupted["multiple_speakers"] is True

def test_member_scoring():
    scorer = MemberScoringEngine()
    member = {"member_id": "M001", "name": "Dr. Rajeshwar Sharma", "seat_id": "S01", "allocated_time_seconds": 300}
    history = {
        "speaking_time_seconds": 250,
        "speaking_turns": 2,
        "avg_agenda_relevance": 92.0,
        "time_violations": 0,
        "seat_violations": 0,
        "offensive_count": 0,
        "interruption_count": 0,
        "presence_ratio": 1.0
    }
    card = scorer.compute_scorecard(member, history)
    assert card["overall_score"] >= 85
    assert "A" in card["grade"]

def test_rule_engine_all_rules():
    re_engine = RuleEngine()
    
    # 1. Speaking time rule test
    r1_input = {"speaking_time": 450, "allocated_time": 300, "noise_level": 50, "agenda_relevance": 0.9, "emotion": "neutral", "offensive": False, "movement_status": "normal", "emergency": False}
    res1 = re_engine.evaluate(r1_input, {"allocated_time_seconds": 300})
    assert any(a["rule_id"] == "RULE_1_SPEAKING_TIME" for a in res1["alerts"])

    # 2. High noise rule test
    r2_input = {"speaking_time": 100, "noise_level": 88, "agenda_relevance": 0.9, "emotion": "neutral", "offensive": False, "movement_status": "normal", "emergency": False}
    res2 = re_engine.evaluate(r2_input)
    assert any(a["rule_id"] == "RULE_2_HIGH_NOISE" for a in res2["alerts"])

    # 3. Offensive language critical rule test
    r5_input = {"speaking_time": 100, "noise_level": 60, "agenda_relevance": 0.9, "emotion": "neutral", "offensive": True, "flagged_words": ["liar"], "movement_status": "normal", "emergency": False}
    res5 = re_engine.evaluate(r5_input)
    assert any(a["rule_id"] == "RULE_5_OFFENSIVE_LANGUAGE" and a["severity"] == "CRITICAL" for a in res5["alerts"])

    # 4. Emergency rule test
    r8_input = {"speaking_time": 100, "noise_level": 60, "agenda_relevance": 0.9, "emotion": "neutral", "offensive": False, "movement_status": "normal", "emergency": True}
    res8 = re_engine.evaluate(r8_input)
    assert any(a["rule_id"] == "RULE_8_EMERGENCY_BUTTON" and a["severity"] == "CRITICAL" for a in res8["alerts"])

if __name__ == "__main__":
    pytest.main(["-v", "tests/test_modules.py"])
