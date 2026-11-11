import { Router } from "express";
import { emergencyController } from "../controllers/emergency.controller";

export const emergencyRouter = Router();

emergencyRouter.post("/emergency", (req, res) => emergencyController.triggerEmergency(req, res));
emergencyRouter.post("/emergency/reset", (req, res) => emergencyController.resetEmergency(req, res));
emergencyRouter.get("/emergency/requests", (req, res) => emergencyController.getRequests(req, res));
emergencyRouter.post("/emergency/requests", (req, res) => emergencyController.createRequest(req, res));
emergencyRouter.post("/emergency/requests/:id/decision", (req, res) => emergencyController.decideRequest(req, res));
