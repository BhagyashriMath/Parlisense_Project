# ML and AI

Modular Python inference layer for the parliamentary monitoring system.

- `modules/speech.py` — Whisper speech recognition adapter
- `modules/vision.py` — YOLO/OpenCV seat and movement adapter
- `modules/agenda.py` — agenda relevance analysis
- `modules/offensive.py` — prohibited-language analysis
- `modules/emotion.py` — emotion analysis
- `modules/noise.py` — acoustic analysis
- `modules/disruption.py` — multiple-speaker/disruption analysis
- `modules/rule_engine.py` — centralized Python rule engine
- `modules/scoring.py` — post-session scoring
- `services/` — Python session, alert, and report service adapters
- `rules/rules.json` — configurable rule thresholds

Model files should be placed in `ml/models/`. Python dependencies are listed in `ml/requirements.txt`.

Train the development text classifiers with:

```bash
python3 ml/train.py
```

This generates `ml/models/offensive_model.json` and `ml/models/agenda_model.json`.
Replace `ml/data/text_training.jsonl` with reviewed, labelled parliamentary
transcripts before production use. The Node and FastAPI services load these
artifacts automatically; camera and audio models still require labelled video
and audio data for supervised training.

For the camera model, place YOLO-labelled chamber images in
`ml/data/vision/images/{train,val}` and labels in
`ml/data/vision/labels/{train,val}`. Then run:

```bash
python3 ml/train_vision.py --epochs 50
```

The best weights are copied to `ml/models/yolo11n.pt` and are loaded by
`VisionTracker` automatically. Do not train on unreviewed or personally
identifiable footage without applying the required retention and access rules.

Run the ML service from the repository root with:

```bash
npm run dev:ml
```

It listens on port `8000` and exposes FastAPI documentation at `/docs`.
