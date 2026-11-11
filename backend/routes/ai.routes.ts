import { Router } from "express";
import { aiController } from "../controllers/ai.controller";

export const aiRouter = Router();

aiRouter.get("/ai/status", (req, res) => aiController.getStatus(req, res));
aiRouter.post("/ai/simulate-event", (req, res) => aiController.simulateEvent(req, res));
aiRouter.post("/ai/process-audio", (req, res) => aiController.processAudio(req, res));
aiRouter.post("/ai/member-presence", (req, res) => aiController.memberPresence(req, res));
aiRouter.post("/ai/vision-frame", (req, res) => aiController.visionMovementFrame(req, res));

// Compatibility endpoints for rules status & execution
aiRouter.get("/rules/status", (req, res) => {
  res.json({ status: "ACTIVE", active_rules: 8, engine_version: "2.4.0" });
});
aiRouter.post("/rules/execute", (req, res) => {
  res.json({ status: "EXECUTED", timestamp: new Date().toISOString() });
});
