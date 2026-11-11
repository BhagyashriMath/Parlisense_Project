import { Router } from "express";
import { sessionController } from "../controllers/session.controller";
import { telemetryService } from "../services/telemetry.service";
import { requireRole } from "../middleware/auth.middleware";

export const sessionRouter = Router();

sessionRouter.get("/session/config", (req, res) => sessionController.getConfig(req, res));
sessionRouter.post("/session/config", requireRole("admin"), (req, res) => sessionController.updateConfig(req, res));
sessionRouter.get("/session/topics", (req, res) => sessionController.getTopics(req, res));
sessionRouter.post("/session/topics", requireRole("admin"), (req, res) => sessionController.addTopic(req, res));
sessionRouter.delete("/session/topics/:id", requireRole("admin"), (req, res) => sessionController.deleteTopic(req, res));

sessionRouter.get("/session/status", (req, res) => sessionController.getStatus(req, res));
sessionRouter.get("/session/current", (req, res, next) => sessionController.getCurrent(req, res).catch(next));
sessionRouter.get("/session/summary/live", (req, res, next) => sessionController.getSummaryLive(req, res).catch(next));
sessionRouter.get("/session/timeline", (req, res) => sessionController.getTimeline(req, res));
sessionRouter.get("/session/audit", (req, res) => sessionController.getAudit(req, res));

sessionRouter.post("/session/start", requireRole("speaker", "admin"), (req, res) => sessionController.startSession(req, res));
sessionRouter.post("/session/pause", requireRole("speaker", "admin"), (req, res) => sessionController.pauseSession(req, res));
sessionRouter.post("/session/resume", requireRole("speaker", "admin"), (req, res) => sessionController.resumeSession(req, res));
sessionRouter.post("/session/stop", requireRole("speaker", "admin"), (req, res) => sessionController.stopSession(req, res));
sessionRouter.post("/session/schedule", requireRole("speaker"), (req, res) => sessionController.scheduleSession(req, res));
sessionRouter.post("/session/mode", requireRole("speaker"), (req, res) => sessionController.setMode(req, res));
sessionRouter.post("/session/speaker", requireRole("speaker"), (req, res) => sessionController.setSpeaker(req, res));
sessionRouter.post("/session/bill", requireRole("speaker"), (req, res) => sessionController.setBill(req, res));

// Requests to speak — members raise their hand, the presiding officer grants
// the floor (grants reuse POST /session/speaker), declines, or releases it.
sessionRouter.get("/session/requests", (req, res) => sessionController.getRequests(req, res));
sessionRouter.post("/session/request", requireRole("member"), (req, res) => sessionController.raiseHand(req, res));
sessionRouter.delete("/session/request", requireRole("member"), (req, res) => sessionController.withdrawHand(req, res));
sessionRouter.post("/session/request/reject", requireRole("speaker"), (req, res) => sessionController.rejectRequest(req, res));
sessionRouter.post("/session/floor/release", requireRole("speaker"), (req, res) => sessionController.releaseFloor(req, res));

// Speaker mic priority control
sessionRouter.post("/session/speaker-mic/on",  requireRole("speaker", "admin"), (req, res) => sessionController.speakerMicOn(req, res));
sessionRouter.post("/session/speaker-mic/off", requireRole("speaker", "admin"), (req, res) => sessionController.speakerMicOff(req, res));

sessionRouter.get("/notifications", (req, res) => sessionController.getNotifications(req, res));
sessionRouter.get("/notifications/member/:memberId", (req, res) => sessionController.getMemberNotifications(req, res));

sessionRouter.get("/session/report", (req, res) => sessionController.getReport(req, res));
sessionRouter.get("/session/complete-summary", (req, res) => sessionController.getCompleteSummary(req, res));

sessionRouter.get("/analytics", (req, res) => sessionController.getAnalytics(req, res));
sessionRouter.get("/seats", (req, res) => sessionController.getSeats(req, res));

// SSE stream for legacy or alternative real-time clients
sessionRouter.get("/session/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let sending = false;
  const send = async () => {
    if (sending || res.destroyed || res.writableEnded) return;
    sending = true;
    try {
      const data = await telemetryService.generateCurrentTelemetry();
      if (!res.destroyed && !res.writableEnded) res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (_) {
    } finally {
      sending = false;
    }
  };

  send();
  const interval = setInterval(send, 1000);
  req.on("close", () => clearInterval(interval));
});
