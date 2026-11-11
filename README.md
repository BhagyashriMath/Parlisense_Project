<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# AI-Based Parliament Session Monitoring System

Full-stack parliamentary decision-support prototype with separated React/Vite frontend, Express orchestration backend, and modular Python ML layer. It provides Admin, Speaker, and Member views, continuous telemetry, AI rule evaluation, camera/microphone browser capture, alerts, emergency workflow, Speaker-confirmed suspension, and scorecards.

## Project structure

- `frontend/` — React/Vite dashboards and browser capture
- `backend/` — Express REST/WebSocket server and SQLite persistence
- `ml/` — Python Whisper, YOLO/OpenCV, NLP, emotion, noise, disruption, rules, and scoring modules
- `data/` — session data, transcripts, runtime state, and SQLite database

View your app in AI Studio: https://ai.studio/apps/09a0570b-30ca-4290-acaa-aa4a19a52738

## Run locally

Prerequisite: Node.js 22.5+

### 1. Frontend Server (Vite)
Navigate to the `frontend/` directory and start the frontend:
```bash
cd frontend
npm run dev
```
The frontend starts on `http://localhost:5173`. Its Vite proxy forwards `/api` and `/ws` to `http://localhost:3000`.

### 2. Backend Server (Express & PostgreSQL/Neon)
In a separate terminal, navigate to the `backend/` directory and start the backend:
```bash
cd backend
npm run dev
```
The backend starts on `http://localhost:3000`. It connects to Neon PostgreSQL if `DATABASE_URL` is set, or automatically falls back to SQLite.

### 3. (Optional) Python ML Layer
```bash
cd ml
pip install -r requirements.txt
python app.py
```

Connected-device views:

- Admin: `/?role=admin`
- Speaker: `/?role=speaker`
- Members: `/?role=member&id=M001` through `/?role=member&id=M004`

The Admin readiness checklist requires four registered members with unique IDs, assigned seats, microphones, cameras, agenda, timings, and rules before session start.

## Runtime capabilities

- Native WebSocket telemetry: `/ws/session`
- SSE telemetry fallback: `/api/session/stream`
- Append-only audit API: `/api/session/audit`
- Persistent roster/configuration: `data/runtime-state.json`
- Browser microphone: Web Audio noise analyser and continuous Web Speech recognition where supported
- Browser camera: member self-camera frame capture and conservative movement detection
- Modular Python AI implementations in `ml/modules/` for Whisper, YOLO/OpenCV, emotion, noise, agenda, disruption, and scoring integration

Deterministic simulation controls are included for testing without hardware. Replace individual module adapters with production inference without changing the dashboard event contract.
