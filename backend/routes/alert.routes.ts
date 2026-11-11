import { Router } from "express";
import { alertController } from "../controllers/alert.controller";

export const alertRouter = Router();

alertRouter.get("/alerts", (req, res) => alertController.getAlerts(req, res));
alertRouter.post("/alerts/:id/acknowledge", (req, res) => alertController.acknowledgeAlert(req, res));
alertRouter.get("/violations", (req, res) => alertController.getViolations(req, res));
