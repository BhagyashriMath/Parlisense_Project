"""
Offensive Language & Unparliamentary Vocabulary Detection Module
Detects unparliamentary, abusive, defamatory, or expungable terms in live transcripts.
"""

import re
import os
from typing import Dict, Any, List
from modules.text_models import MultinomialTextClassifier

class OffensiveLanguageDetector:
    def __init__(self):
        self.status = "ACTIVE"
        model_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models", "offensive_model.json")
        self.model = MultinomialTextClassifier(model_path)
        if self.model.status == "TRAINED":
            self.status = "ACTIVE_TRAINED"
        # Parliamentary expungable & derogatory lexicons
        self.unparliamentary_terms = {
            "idiot": "Derogatory Insult",
            "moron": "Derogatory Insult",
            "bastard": "Abusive Profanity",
            "corrupt criminal": "Unsubstantiated Criminal Allegation",
            "thief": "Defamatory Accusation",
            "scoundrel": "Unparliamentary Epithet",
            "liar": "Expungable Accusation",
            "shut up": "Aggressive Silencing",
            "dog": "Dehumanizing Slur",
            "clown": "Contempt of Member",
            "puppet": "Derogatory Imputation",
            "traitor": "Treasonous Allegation",
            "fool": "Derogatory Insult"
        }

    def detect(self, text: str) -> Dict[str, Any]:
        """
        Check text for unparliamentary and offensive phrases.
        """
        if not text:
            return {
                "is_offensive": False,
                "offensive_score": 0.0,
                "confidence": 0.0,
                "detected_category": "Safe",
                "flagged_words": []
            }

        text_lower = text.lower()
        flagged = []
        categories = set()

        for term, cat in self.unparliamentary_terms.items():
            pattern = r'\b' + re.escape(term) + r'\b'
            if re.search(pattern, text_lower):
                flagged.append(term)
                categories.add(cat)

        probabilities = self.model.predict_proba(text)
        ml_probability = probabilities.get("offensive", 0.0)
        is_offensive = len(flagged) > 0 or ml_probability >= 0.65
        score = min(1.0, len(flagged) * 0.45) if is_offensive else 0.02
        if not flagged and is_offensive:
            score = ml_probability
        confidence = 0.95 if is_offensive else 0.99

        return {
            "is_offensive": is_offensive,
            "offensive_score": round(score, 2),
            "confidence": round(max(confidence, ml_probability), 2),
            "model_probability": round(ml_probability, 3),
            "detected_category": ", ".join(categories) if categories else "Safe",
            "flagged_words": flagged,
            "status": "OFFENSIVE_DETECTED" if is_offensive else "CLEAN"
        }

if __name__ == "__main__":
    det = OffensiveLanguageDetector()
    print("Safe:", det.detect("Honourable Speaker, I commend the bill."))
    print("Offensive:", det.detect("You are a liar and a puppet!"))
