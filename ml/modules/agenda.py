"""
NLP Agenda Analysis Module for Parliamentary Session Monitoring
Compares live speech transcript against the active agenda topic in data/agenda.txt.
Calculates semantic relevance score, topic keywords, and off-topic deviation.
"""

import os
import re
import math
from typing import Dict, Any, List, Set
from modules.text_models import MultinomialTextClassifier

class AgendaAnalyzer:
    def __init__(self, agenda_path: str = "data/agenda.txt"):
        self.agenda_path = agenda_path
        self.agenda_text = ""
        self.agenda_keywords: Set[str] = set()
        self.status = "ACTIVE"
        model_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models", "agenda_model.json")
        self.model = MultinomialTextClassifier(model_path)
        if self.model.status == "TRAINED":
            self.status = "ACTIVE_TRAINED"
        self.load_agenda()

    def load_agenda(self) -> str:
        """Load and index the active agenda document."""
        if os.path.exists(self.agenda_path):
            try:
                with open(self.agenda_path, "r", encoding="utf-8") as f:
                    self.agenda_text = f.read()
                    self._extract_agenda_keywords()
            except Exception as e:
                print(f"[AGENDA] Error reading {self.agenda_path}: {e}")
                self._set_default_agenda()
        else:
            self._set_default_agenda()
        return self.agenda_text

    def _set_default_agenda(self):
        self.agenda_text = "Digital Education and AI Governance Bill 2026: Infrastructure, STEM funding, rural connectivity, teacher training."
        self._extract_agenda_keywords()

    def _extract_agenda_keywords(self):
        stop_words = {
            "the", "is", "at", "which", "on", "and", "a", "an", "in", "to", "for", "of", "with",
            "as", "by", "that", "this", "it", "from", "be", "are", "or", "was", "will", "our", "all"
        }
        words = re.findall(r'\b[A-Za-z]{3,}\b', self.agenda_text.lower())
        self.agenda_keywords = {w for w in words if w not in stop_words}

    def analyze_relevance(self, transcript_text: str) -> Dict[str, Any]:
        """
        Compare live speech text against active agenda.
        Returns relevance percentage, status, and matched terms.
        """
        if not transcript_text or len(transcript_text.strip()) == 0:
            return {
                "relevance_score": 0.0,
                "relevance_percentage": 0,
                "status": "No Speech Detected",
                "is_on_topic": False,
                "matched_keywords": [],
                "off_topic_confidence": 1.0
            }

        transcript_lower = transcript_text.lower()
        speech_words = re.findall(r'\b[A-Za-z]{3,}\b', transcript_lower)
        speech_set = set(speech_words)

        matched = speech_set.intersection(self.agenda_keywords)
        
        # Jaccard + keyword frequency scoring
        if len(self.agenda_keywords) > 0:
            base_ratio = len(matched) / min(12, len(self.agenda_keywords))
        else:
            base_ratio = 0.5

        # Heuristic boost for primary agenda terminology
        primary_terms = ["education", "digital", "school", "schools", "teacher", "budget", "bill", "infrastructure", "stem", "connectivity", "grant"]
        primary_matches = sum(1 for term in primary_terms if term in transcript_lower)
        
        score = min(1.0, max(0.12, (base_ratio * 0.6) + (primary_matches * 0.15)))

        probabilities = self.model.predict_proba(transcript_text)
        if probabilities:
            score = round((score * 0.6) + (probabilities.get("on_topic", 0.0) * 0.4), 3)

        # Explicit off-topic diversion check (e.g. cricket, celebrity, personal unrelated attacks)
        off_topic_markers = ["cricket", "bollywood", "vacation", "movie", "resort", "personal property", "film festival"]
        if any(marker in transcript_lower for marker in off_topic_markers):
            score = max(0.15, score - 0.45)

        percentage = round(score * 100, 1)
        is_on_topic = score >= 0.50

        return {
            "relevance_score": round(score, 3),
            "relevance_percentage": percentage,
            "status": "On Topic" if is_on_topic else "Off Topic",
            "is_on_topic": is_on_topic,
            "matched_keywords": list(matched)[:6],
            "off_topic_confidence": round(1.0 - score, 2)
            ,"model_probability": round(probabilities.get("on_topic", 0.0), 3)
        }

if __name__ == "__main__":
    analyzer = AgendaAnalyzer()
    res1 = analyzer.analyze_relevance("Honourable Speaker, the digital classroom infrastructure budget must be increased for rural schools.")
    res2 = analyzer.analyze_relevance("I want to discuss yesterday's cricket match and cinema awards.")
    print("Test 1 (Relevant):", res1)
    print("Test 2 (Off-topic):", res2)
