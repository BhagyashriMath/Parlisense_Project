import { Router } from "express";
import { disciplineController } from "../controllers/discipline.controller";

export const disciplineRouter = Router();

disciplineRouter.get("/discipline/recommendations", (req, res) => disciplineController.getRecommendations(req, res));
disciplineRouter.post("/discipline/confirm-suspension", (req, res) => disciplineController.confirmSuspension(req, res));
disciplineRouter.post("/discipline/reject-suspension/:alertId", (req, res) => disciplineController.rejectSuspension(req, res));
disciplineRouter.post("/discipline/revoke-suspension", (req, res) => disciplineController.revokeSuspension(req, res));
disciplineRouter.get("/discipline/suspended/:memberId", (req, res) => disciplineController.checkSuspended(req, res));
disciplineRouter.get("/discipline/suspensions", (req, res) => disciplineController.getAllSuspensions(req, res));
