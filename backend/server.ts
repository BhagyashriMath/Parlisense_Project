import express, { Request, Response } from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import os from "os";

import { PORT, ROOT_DIR, ML_SERVICE_URL } from "./config";
import { runMigrations } from "./database/migrator";
import { memberRepository } from "./repositories/member.repository";
import { alertRepository } from "./repositories/alert.repository";
import { transcriptRepository } from "./repositories/transcript.repository";
import { apiRouter } from "./routes";
import { authenticate } from "./middleware/auth.middleware";
import { errorHandler } from "./middleware/error.middleware";
import { telemetryService } from "./services/telemetry.service";
import { db } from "./database/db";
import { authService } from "./services/auth.service";
import { VideoRoomService } from "./services/video-room.service";

process.on("unhandledRejection", (reason: any) => {
  console.warn("[SERVER] Handled unhandled rejection:", reason?.message || reason);
});
process.on("uncaughtException", (err: any) => {
  console.warn("[SERVER] Handled uncaught exception:", err?.message || err);
});

// 1. Express Application Setup
const app = express();

// CORS middleware allowing cross-origin requests from Vite dev server and deployed frontend
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint for Render and uptime monitoring
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "ParliSense Backend API",
    database: db.isPostgres ? "PostgreSQL / Neon" : "SQLite",
    timestamp: new Date().toISOString()
  });
});

// Global authentication parsing middleware (populates req.user if token/header present)
app.use(authenticate);

// Mount modular API routes under /api
app.use("/api", apiRouter);

// Production static file serving if dist exists, or fallback API message
const distPath = path.join(ROOT_DIR, "dist");
if (fs.existsSync(path.join(distPath, "index.html"))) {
  app.use(express.static(distPath));
  app.get("*", (req: Request, res: Response, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/ws")) return next();
    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  app.get("/", (req: Request, res: Response) => {
    res.status(200).json({
      service: "ParliSense Backend API Server",
      status: "online",
      api: "/api",
      health: "/health",
      frontend: "Hosted separately (e.g. Vercel or Vite dev server on port 5173)"
    });
  });
}

// Centralized error handler
app.use(errorHandler);

// Network Discovery Helper
function getLocalIP(): string {
  try {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === "IPv4" && !net.internal) {
          return net.address;
        }
      }
    }
  } catch (_) {}
  return "127.0.0.1";
}

async function startServer() {
  // Initialize Database Migrations & Preload Telemetry Cache
  try {
    await runMigrations();
    await memberRepository.findAll();
    await alertRepository.findAll({ limit: 50 });
    await transcriptRepository.findRecent(10);
    console.log("[DATABASE] Telemetry cache initialized successfully.");
  } catch (err) {
    console.error("[DATABASE] Error executing migrations:", err);
  }

  const httpServer = createServer(app);

  httpServer.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      console.error(`\n\x1b[31m[ERROR]\x1b[0m Port ${PORT} is already in use by another running process.`);
      console.error(`\x1b[33m[HINT]\x1b[0m To free the port on Windows PowerShell, run:`);
      console.error(`       Stop-Process -Name node -Force\n`);
      process.exit(1);
    } else {
      console.error("[SERVER] Unexpected server error:", err);
      process.exit(1);
    }
  });

  // Native WebSocket stream for real-time chamber dashboards
  try {
    const { WebSocketServer } = await import("ws");
    const wsServer = new WebSocketServer({ noServer: true });
    const videoServer = new WebSocketServer({ noServer: true, maxPayload: 65536 });
    const videoRoom = new VideoRoomService(() => telemetryService.getState());
    videoServer.on("connection", (ws: any) => {
      const timeout = setTimeout(() => ws.close(4001, "Authentication required"), 5000);
      ws.once("close", () => clearTimeout(timeout));
      ws.once("message", (raw: any) => {
        clearTimeout(timeout);
        try {
          const message = JSON.parse(raw.toString());
          const user = message.type === "join" && typeof message.token === "string"
            ? authService.verifyToken(message.token) : null;
          if (!user || !["member", "speaker"].includes(user.role)) {
            ws.close(4001, "Sign in to view chamber cameras");
            return;
          }
          videoRoom.join(ws, user.id, message.sessionId);
        } catch { ws.close(4001, "Invalid authentication"); }
      });
      ws.on("error", () => {});
    });
    const videoSweep = setInterval(() => {
      videoRoom.sweep();
      for (const ws of videoServer.clients) {
        if ((ws as any).awaitingPong) { ws.terminate(); continue; }
        (ws as any).awaitingPong = true;
        ws.ping();
      }
    }, 10000);
    videoSweep.unref();
    videoServer.on("connection", ws => ws.on("pong", () => { (ws as any).awaitingPong = false; }));
    httpServer.on("close", () => clearInterval(videoSweep));

    // ── Audio broadcast WebSocket (/ws/audio) ──────────────────────────
    // One sender (the active mic holder) streams raw audio chunks.
    // All other connected clients receive and play those chunks in real time.
    const audioClients = new Set<any>();
    const audioServer = new WebSocketServer({ noServer: true, maxPayload: 256 * 1024 });
    audioServer.on("connection", (ws: any) => {
      ws.isSender = false;
      audioClients.add(ws);
      ws.on("message", (chunk: Buffer) => {
        // First message is a JSON control frame: { type: "register", role: "sender"|"listener" }
        // Subsequent messages from sender are raw audio binary chunks
        if (!ws.registered) {
          try {
            const ctrl = JSON.parse(chunk.toString());
            ws.isSender = ctrl.role === "sender";
            ws.registered = true;
          } catch {
            ws.registered = true; // treat as listener
          }
          return;
        }
        // Broadcast audio chunk to all listeners
        if (ws.isSender) {
          for (const client of audioClients) {
            if (client !== ws && client.readyState === 1) {
              try { client.send(chunk); } catch (_) {}
            }
          }
        }
      });
      ws.on("close", () => audioClients.delete(ws));
      ws.on("error", () => audioClients.delete(ws));
    });

    wsServer.on("connection", (socket: any) => {
      telemetryService.registerWs(socket);
      socket.on("close", () => {
        telemetryService.unregisterWs(socket);
      });
      socket.on("error", (err: any) => {
        console.error("[WS] Client socket error:", err?.message);
        telemetryService.unregisterWs(socket);
      });
    });

    httpServer.on("upgrade", (request, socket, head) => {
      try {
        const url = new URL(request.url || "", `http://${request.headers.host || "localhost"}`);
        if (url.pathname === "/ws/audio") {
          audioServer.handleUpgrade(request, socket, head, ws => audioServer.emit("connection", ws));
        } else if (url.pathname === "/ws/video") {
          videoServer.handleUpgrade(request, socket, head, ws => videoServer.emit("connection", ws));
        } else if (url.pathname === "/ws/session") {
          wsServer.handleUpgrade(request, socket, head, (ws) => {
            wsServer.emit("connection", ws, request);
          });
        }
      } catch (_) {}
    });
  } catch (wsErr) {
    console.warn("[WS] Could not initialize WebSocketServer:", wsErr);
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    const localIP = getLocalIP();
    console.log(`\n  \x1b[32m\x1b[1mPARLISENSE BACKEND API\x1b[0m \x1b[32mready\x1b[0m`);
    console.log(`  \x1b[32m➜\x1b[0m  \x1b[1mAPI URL:\x1b[0m     \x1b[36mhttp://localhost:${PORT}/api\x1b[0m`);
    console.log(`  \x1b[32m➜\x1b[0m  \x1b[1mHealth:\x1b[0m      \x1b[36mhttp://localhost:${PORT}/health\x1b[0m`);
    console.log(`  \x1b[32m➜\x1b[0m  \x1b[1mWebSocket:\x1b[0m   \x1b[36mws://localhost:${PORT}/ws/session\x1b[0m`);
    console.log(`  \x1b[32m➜\x1b[0m  \x1b[1mML Service:\x1b[0m  \x1b[36m${ML_SERVICE_URL}\x1b[0m`);
    console.log(`  \x1b[32m➜\x1b[0m  \x1b[1mDatabase:\x1b[0m    \x1b[33m${db.isPostgres ? "PostgreSQL / Neon" : "SQLite fallback"}\x1b[0m`);
    console.log(`  \x1b[32m➜\x1b[0m  \x1b[1mNetwork:\x1b[0m     \x1b[36mhttp://${localIP}:${PORT}/\x1b[0m\n`);
  });
}

startServer();

