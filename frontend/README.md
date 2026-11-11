# Frontend

React/Vite client for the Admin, Speaker, and Member dashboards.

- `src/pages/` — role-based dashboards
- `src/components/` — camera, transcript, alert, seat, and report UI
- `src/context/` — shared real-time session state
- `src/services/api.ts` — REST and WebSocket client

The frontend is served directly by the backend in development on **Port 3000** (`http://localhost:3000`).

### Running the Application

To start the full application (frontend + backend APIs + WebSockets):

```bash
# From the repository root (or inside the frontend directory):
npm run dev
```

Open: `http://localhost:3000`

- Admin Dashboard: `http://localhost:3000/?role=admin`
- Speaker Dashboard: `http://localhost:3000/?role=speaker`
- Member Dashboard: `http://localhost:3000/?role=member&id=M001`

> **Note on Standalone Vite (Port 5173):** If running Vite standalone via `npx vite`, it runs on `http://localhost:5173` and proxies `/api` and `/ws` requests to the backend running on `http://localhost:3000`.
