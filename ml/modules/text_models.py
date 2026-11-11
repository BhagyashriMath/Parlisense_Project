"""Small, dependency-free text classifiers used by the live NLP adapters.

The model is a Multinomial Naive Bayes classifier. It is intentionally simple,
fast, inspectable, and suitable for the bundled development dataset. Production
use should retrain it with reviewed parliamentary transcripts.
"""

import json
import math
import os
import re
from collections import Counter, defaultdict
from typing import Dict, Iterable, List, Tuple


def tokenize(text: str) -> List[str]:
    return re.findall(r"[a-zA-Z']{2,}", (text or "").lower())


class MultinomialTextClassifier:
    def __init__(self, artifact_path: str = "ml/models/text_classifier.json"):
        self.artifact_path = artifact_path
        self.classes: List[str] = []
        self.vocabulary: List[str] = []
        self.class_documents: Dict[str, int] = {}
        self.class_tokens: Dict[str, int] = {}
        self.token_counts: Dict[str, Dict[str, int]] = {}
        self.status = "UNTRAINED"
        self.load()

    def load(self) -> bool:
        if not os.path.exists(self.artifact_path):
            return False
        try:
            with open(self.artifact_path, "r", encoding="utf-8") as handle:
                payload = json.load(handle)
            self.classes = payload["classes"]
            self.vocabulary = payload["vocabulary"]
            self.class_documents = payload["class_documents"]
            self.class_tokens = payload["class_tokens"]
            self.token_counts = payload["token_counts"]
            self.status = "TRAINED"
            return True
        except (OSError, KeyError, TypeError, json.JSONDecodeError):
            self.status = "MODEL_LOAD_ERROR"
            return False

    def train(self, rows: Iterable[Tuple[str, str]]) -> None:
        documents = list(rows)
        self.classes = sorted({label for _, label in documents})
        self.class_documents = Counter(label for _, label in documents)
        self.token_counts = {label: defaultdict(int) for label in self.classes}
        self.class_tokens = {label: 0 for label in self.classes}
        vocabulary = set()
        for text, label in documents:
            tokens = tokenize(text)
            vocabulary.update(tokens)
            counts = Counter(tokens)
            for token, count in counts.items():
                self.token_counts[label][token] += count
                self.class_tokens[label] += count
        self.vocabulary = sorted(vocabulary)
        self.status = "TRAINED"

    def save(self) -> None:
        os.makedirs(os.path.dirname(self.artifact_path) or ".", exist_ok=True)
        payload = {
            "model": "multinomial_naive_bayes",
            "classes": self.classes,
            "vocabulary": self.vocabulary,
            "class_documents": self.class_documents,
            "class_tokens": self.class_tokens,
            "token_counts": {label: dict(counts) for label, counts in self.token_counts.items()},
        }
        with open(self.artifact_path, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, indent=2, sort_keys=True)

    def predict_proba(self, text: str) -> Dict[str, float]:
        if self.status != "TRAINED" or not self.classes:
            return {}
        total_documents = sum(self.class_documents.values())
        vocabulary_size = max(1, len(self.vocabulary))
        scores: Dict[str, float] = {}
        for label in self.classes:
            log_probability = math.log((self.class_documents[label] + 1) / (total_documents + len(self.classes)))
            denominator = self.class_tokens[label] + vocabulary_size
            for token in tokenize(text):
                log_probability += math.log((self.token_counts[label].get(token, 0) + 1) / denominator)
            scores[label] = log_probability
        maximum = max(scores.values())
        normalizer = sum(math.exp(value - maximum) for value in scores.values())
        return {label: math.exp(value - maximum) / normalizer for label, value in scores.items()}

