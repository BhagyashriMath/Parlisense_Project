"""Train the bundled development NLP models.

Run from the repository root:
    python3 ml/train.py

Replace ml/data/text_training.jsonl with reviewed labelled transcripts before
using this for a real chamber deployment.
"""

import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from modules.text_models import MultinomialTextClassifier


def load_rows(path):
    rows = []
    with open(path, "r", encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                rows.append(json.loads(line))
    return rows


def main():
    data_path = os.path.join(ROOT, "ml", "data", "text_training.jsonl")
    model_dir = os.path.join(ROOT, "ml", "models")
    rows = load_rows(data_path)
    for target, label_key in (("offensive", "offensive"), ("agenda", "agenda")):
        model = MultinomialTextClassifier(os.path.join(model_dir, f"{target}_model.json"))
        model.train((row["text"], row[label_key]) for row in rows)
        model.save()
        print(f"trained {target}: {len(rows)} examples, {len(model.vocabulary)} tokens")


if __name__ == "__main__":
    main()
