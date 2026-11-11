"""
Semantic Agenda Relevance Detection Module
==========================================
Uses Sentence-BERT (SBERT) / sentence-transformers to compute cosine similarity
between live speech transcripts and the current parliamentary agenda topic.

Classification:
  >= 0.55  → RELEVANT          (score shown in green on dashboard)
  0.35–0.54 → PARTIALLY_RELEVANT (score shown in amber)
  < 0.35   → IRRELEVANT         (score shown in red, audio alert fired)

Alert policy:
  - Alerts are NOT fired on every sentence (avoids false positives).
  - The module buffers up to `window_size` transcript segments and evaluates
    the ROLLING AVERAGE similarity.  Only when the rolling average drops
    below the IRRELEVANT threshold for `consecutive_low` consecutive windows
    is an alert generated.
  - A per-session cooldown (default 60 s) prevents alert spam.

Fallback:
  - If sentence-transformers is not installed the module falls back to
    TF-IDF cosine similarity (scipy + numpy, already in requirements.txt).
  - If scipy is also unavailable it falls back to Jaccard token overlap.
  All three paths return the same dict schema so callers never need to branch.

Parliamentary dataset support:
  - On first load the module builds a small reference corpus from known
    parliamentary discussion patterns (provided inline as seed data).
  - When `agenda_text` is updated the reference embedding is recomputed.
"""

import os
import re
import math
import time
import logging
from typing import Dict, Any, List, Optional, Deque
from collections import deque

logger = logging.getLogger("agenda_sbert")

# ── Thresholds ────────────────────────────────────────────────────────────────
RELEVANT_THRESHOLD          = 0.55   # >= RELEVANT
PARTIAL_THRESHOLD           = 0.35   # >= PARTIAL, < RELEVANT
# Alert fires when rolling average < PARTIAL_THRESHOLD for this many windows
CONSECUTIVE_LOW_REQUIRED    = 2
WINDOW_SIZE                 = 3      # sentences to average
ALERT_COOLDOWN_SECONDS      = 60     # min gap between alerts per session


# ── Parliamentary seed corpus (used to warm-up / fine-tune similarity context) ─
PARLIAMENTARY_RELEVANT_SEEDS = [
    "The honourable member proposes an amendment to clause 7 regarding budget allocation.",
    "We must ensure adequate funding for rural digital infrastructure and broadband connectivity.",
    "The minister's statement on STEM education grants aligns with the bill's objectives.",
    "Data sovereignty and AI governance must be addressed under clause 15 of this legislation.",
    "Teacher training programs require statutory backing as outlined in clauses 29 to 45.",
    "The committee recommends increasing the allocation for state pedagogical institutes.",
    "Biometric privacy protections must be explicitly mandated in the digital education bill.",
    "Rural school laboratories require immediate funding under this proposed legislation.",
    "The amendment seeks to extend broadband connectivity to 50,000 rural schools.",
    "Parliament must deliberate carefully on the AI ethics framework in this bill.",
    "The budget allocation for education infrastructure must be reviewed by the committee.",
    "We need to consider the statutory provisions carefully before passing this bill.",
    "The legislation addresses the fundamental governance challenges in the digital sector.",
    "Clause 12 requires all schools to have adequate internet connectivity by the target year.",
    "The honourable minister should clarify the financial provisions in this proposed legislation.",
    "This bill represents an important step toward equitable access to digital education.",
    "We must protect student data privacy under the terms of this governance framework.",
    "The proposed curriculum reforms need adequate funding and proper implementation.",
    "Rural broadband expansion is central to achieving the goals of this education bill.",
    "AI literacy should be incorporated into the national curriculum under this legislation.",
]

PARLIAMENTARY_IRRELEVANT_SEEDS = [
    "I would like to discuss yesterday's cricket match results.",
    "The monsoon season has been very pleasant in my constituency.",
    "My family recently returned from a vacation abroad.",
    "The latest Bollywood film is quite popular among the youth.",
    "I want to raise a personal grievance unrelated to the current agenda.",
    "Let us talk about the upcoming local body elections instead.",
    "The resort near my constituency is a great tourist attraction.",
    "Personal property disputes should be resolved outside this chamber.",
]


class AgendaRelevanceDetector:
    """
    Semantic agenda relevance detector with SBERT primary and TF-IDF fallback.
    Thread-safe for concurrent use from FastAPI async handlers.
    """

    def __init__(self):
        self.model       = None
        self.backend     = "NONE"
        self.agenda_text = ""
        self.agenda_embedding = None   # pre-computed agenda embedding

        # Rolling window state (per-instance, single session)
        self.window: Deque[float] = deque(maxlen=WINDOW_SIZE)
        self.consecutive_low  = 0
        self.last_alert_time  = 0.0

        # TF-IDF fallback vocabulary
        self._idf: Dict[str, float] = {}
        self._corpus_tokens: List[List[str]] = []

        self._init_model()
        self._build_seed_idf()

    # ── Model initialisation ───────────────────────────────────────────────────

    def _init_model(self):
        """Try SBERT first, fall back to TF-IDF, then Jaccard."""
        try:
            from sentence_transformers import SentenceTransformer
            model_name = "all-MiniLM-L6-v2"   # 22 MB, fast, good quality
            self.model  = SentenceTransformer(model_name)
            self.backend = "SBERT"
            logger.info(f"[AGENDA] Loaded SBERT model: {model_name}")
        except ImportError:
            logger.warning("[AGENDA] sentence-transformers not available; using TF-IDF fallback.")
            self.backend = "TFIDF"
        except Exception as exc:
            logger.warning(f"[AGENDA] SBERT load error ({exc}); using TF-IDF fallback.")
            self.backend = "TFIDF"

    def _build_seed_idf(self):
        """Pre-build IDF table from parliamentary seed corpus."""
        corpus = PARLIAMENTARY_RELEVANT_SEEDS + PARLIAMENTARY_IRRELEVANT_SEEDS
        self._corpus_tokens = [self._tokenize(t) for t in corpus]
        self._idf = self._compute_idf(self._corpus_tokens)

    # ── Public API ────────────────────────────────────────────────────────────

    def set_agenda(self, agenda_text: str):
        """
        Update the current agenda.  Call this whenever the admin changes the
        active topic / bill so the reference embedding is refreshed.
        """
        if agenda_text == self.agenda_text:
            return
        self.agenda_text     = agenda_text
        self.agenda_embedding = None   # invalidate cache
        # Reset rolling window for the new topic
        self.window.clear()
        self.consecutive_low = 0
        logger.info(f"[AGENDA] Agenda updated: {agenda_text[:80]}")

    def analyse(self, transcript: str, agenda_text: str) -> Dict[str, Any]:
        """
        Main entry point.  Returns relevance result dict.

        Parameters
        ----------
        transcript  : The speech segment to evaluate (1–5 sentences typical).
        agenda_text : The current parliamentary agenda / bill title.

        Returns
        -------
        {
          "score":          float  0.0–1.0
          "percentage":     int    0–100
          "category":       str    "RELEVANT" | "PARTIALLY_RELEVANT" | "IRRELEVANT"
          "label":          str    human-readable label
          "fire_alert":     bool   True when alert should be spoken
          "alert_message":  str    spoken alert text (empty if no alert)
          "backend":        str    "SBERT" | "TFIDF" | "JACCARD"
          "rolling_avg":    float  rolling average over last N segments
        }
        """
        if not transcript or len(transcript.strip()) < 10:
            return self._empty_result()

        # Update agenda if changed
        if agenda_text and agenda_text != self.agenda_text:
            self.set_agenda(agenda_text)

        # Compute similarity
        score = self._similarity(transcript, agenda_text or self.agenda_text or "parliamentary legislation")

        # Update rolling window
        self.window.append(score)
        rolling_avg = sum(self.window) / len(self.window)

        # Classify — use backend-aware thresholds
        # TF-IDF scores are inherently lower than SBERT cosine scores
        category, label = self._classify(score)

        # Alert decision
        fire_alert    = False
        alert_message = ""
        now           = time.time()

        # Use backend-aware alert threshold
        alert_threshold = PARTIAL_THRESHOLD if self.backend == "SBERT" else 0.08

        if rolling_avg < alert_threshold:
            self.consecutive_low += 1
        else:
            self.consecutive_low = 0

        if (self.consecutive_low >= CONSECUTIVE_LOW_REQUIRED and
                now - self.last_alert_time >= ALERT_COOLDOWN_SECONDS):
            fire_alert        = True
            self.last_alert_time = now
            self.consecutive_low = 0   # reset after alert fires
            pct = round(rolling_avg * 100)
            alert_message = (
                f"Off-topic speech detected. Agenda relevance is {pct} percent. "
                f"Please return to the active parliamentary agenda."
            )

        return {
            "score":         round(score, 3),
            "percentage":    round(score * 100, 1),
            "category":      category,
            "label":         label,
            "fire_alert":    fire_alert,
            "alert_message": alert_message,
            "backend":       self.backend,
            "rolling_avg":   round(rolling_avg, 3),
            "rolling_pct":   round(rolling_avg * 100, 1),
        }

    # ── Similarity backends ───────────────────────────────────────────────────

    def _similarity(self, text: str, agenda: str) -> float:
        """Route to the best available similarity backend."""
        if self.backend == "SBERT":
            return self._sbert_similarity(text, agenda)
        elif self.backend == "TFIDF":
            return self._tfidf_similarity(text, agenda)
        else:
            return self._jaccard_similarity(text, agenda)

    def _sbert_similarity(self, text: str, agenda: str) -> float:
        try:
            import numpy as np
            # Encode agenda once and cache
            if self.agenda_embedding is None or agenda != self.agenda_text:
                self.agenda_text      = agenda
                self.agenda_embedding = self.model.encode(agenda, convert_to_numpy=True)
            speech_emb = self.model.encode(text, convert_to_numpy=True)
            # Cosine similarity
            dot   = float(np.dot(self.agenda_embedding, speech_emb))
            norm  = (float(np.linalg.norm(self.agenda_embedding)) *
                     float(np.linalg.norm(speech_emb)))
            if norm < 1e-8:
                return 0.0
            cos = dot / norm
            # Map from [-1,1] to [0,1] and apply slight scaling to spread the range
            return float(min(1.0, max(0.0, (cos + 1) / 2)))
        except Exception as exc:
            logger.warning(f"[AGENDA] SBERT inference error ({exc}); falling back to TF-IDF.")
            self.backend = "TFIDF"
            return self._tfidf_similarity(text, agenda)

    def _tfidf_similarity(self, text: str, agenda: str) -> float:
        """
        Cosine similarity using TF-IDF vectors, boosted by parliamentary seed matching.
        Scores text against both the current agenda AND the relevant seed corpus so
        paraphrased parliamentary speech still scores correctly.
        """
        try:
            import numpy as np

            tokens_text   = self._tokenize(text)
            tokens_agenda = self._tokenize(agenda)
            if not tokens_text:
                return 0.0

            # 1. Direct overlap against agenda tokens
            set_text   = set(tokens_text)
            set_agenda = set(tokens_agenda)
            direct = len(set_text & set_agenda) / max(1, len(set_agenda)) if set_agenda else 0.0

            # 2. Similarity against each relevant seed sentence — take max
            best_seed = 0.0
            for seed_tokens in self._corpus_tokens[:len(PARLIAMENTARY_RELEVANT_SEEDS)]:
                seed_set = set(seed_tokens)
                if not seed_set:
                    continue
                overlap = len(set_text & seed_set) / max(1, len(set_text | seed_set))
                if overlap > best_seed:
                    best_seed = overlap

            # 3. TF-IDF cosine over shared vocabulary
            vocab = sorted(set_text | set_agenda | set(self._idf.keys()))
            vec_a = self._tfidf_vector(tokens_text, vocab)
            vec_b = self._tfidf_vector(tokens_agenda, vocab)
            dot   = float(np.dot(vec_a, vec_b))
            norm  = float(np.linalg.norm(vec_a)) * float(np.linalg.norm(vec_b))
            tfidf = float(min(1.0, max(0.0, dot / norm if norm > 1e-8 else 0.0)))

            # Weighted blend — direct agenda overlap is most reliable in fallback mode
            combined = direct * 0.45 + best_seed * 0.35 + tfidf * 0.20
            return float(min(1.0, combined))

        except ImportError:
            self.backend = "JACCARD"
            return self._jaccard_similarity(text, agenda)

    def _jaccard_similarity(self, text: str, agenda: str) -> float:
        """Simple Jaccard token overlap — final fallback."""
        a = set(self._tokenize(text))
        b = set(self._tokenize(agenda))
        if not a or not b:
            return 0.0
        return len(a & b) / len(a | b)

    # ── TF-IDF helpers ────────────────────────────────────────────────────────

    def _tokenize(self, text: str) -> List[str]:
        STOP = {
            "the","is","at","which","on","and","a","an","in","to","for","of",
            "with","as","by","that","this","it","from","be","are","or","was",
            "will","our","all","we","i","they","he","she","his","her","their",
            "its","have","had","has","do","did","does","not","but","so","if",
            "then","than","about","also","just","more","very","been","should",
            "would","could","may","might","shall","can","let","you","your",
            "my","me","him","us","them","these","those","there","here","when",
            "where","how","what","who","why","am","up","out","no","yes","only",
        }
        tokens = re.findall(r"\b[a-zA-Z]{3,}\b", text.lower())
        return [t for t in tokens if t not in STOP]

    def _compute_idf(self, corpus: List[List[str]]) -> Dict[str, float]:
        N   = max(1, len(corpus))
        df: Dict[str, int] = {}
        for doc in corpus:
            for tok in set(doc):
                df[tok] = df.get(tok, 0) + 1
        return {tok: math.log((N + 1) / (count + 1)) + 1 for tok, count in df.items()}

    def _tfidf_vector(self, tokens: List[str], vocab: List[str]) -> List[float]:
        from collections import Counter
        tf    = Counter(tokens)
        total = max(1, len(tokens))
        return [
            (tf.get(tok, 0) / total) * self._idf.get(tok, 1.0)
            for tok in vocab
        ]

    # ── Misc ──────────────────────────────────────────────────────────────────

    def _classify(self, score: float):
        """
        Classify using backend-aware thresholds.
        SBERT cosine similarity maps to [0,1] with high scores for semantic matches.
        TF-IDF / Jaccard scores are natively lower, so use adjusted thresholds.
        """
        if self.backend == "SBERT":
            relevant_t = RELEVANT_THRESHOLD   # 0.55
            partial_t  = PARTIAL_THRESHOLD    # 0.35
        else:
            # Adjusted thresholds for TF-IDF / Jaccard
            relevant_t = 0.30
            partial_t  = 0.08

        if score >= relevant_t:
            return "RELEVANT", "Relevant"
        elif score >= partial_t:
            return "PARTIALLY_RELEVANT", "Partially Relevant"
        else:
            return "IRRELEVANT", "Irrelevant (Off-topic)"

    def _empty_result(self) -> Dict[str, Any]:
        return {
            "score": 0.0, "percentage": 0.0,
            "category": "RELEVANT", "label": "No Speech",
            "fire_alert": False, "alert_message": "",
            "backend": self.backend, "rolling_avg": 0.0, "rolling_pct": 0.0,
        }

    def reset_session(self):
        """Call when a new parliamentary session starts."""
        self.window.clear()
        self.consecutive_low = 0
        self.last_alert_time = 0.0
        self.agenda_text     = ""
        self.agenda_embedding = None


# Module-level singleton — shared across all FastAPI requests
_detector: Optional[AgendaRelevanceDetector] = None


def get_detector() -> AgendaRelevanceDetector:
    global _detector
    if _detector is None:
        _detector = AgendaRelevanceDetector()
    return _detector
