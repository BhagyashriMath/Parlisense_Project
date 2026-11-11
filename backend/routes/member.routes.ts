import { Router } from "express";
import { memberController } from "../controllers/member.controller";

export const memberRouter = Router();

memberRouter.get("/members", (req, res) => memberController.getAll(req, res));
memberRouter.post("/members", (req, res) => memberController.create(req, res));
memberRouter.get("/members/:id", (req, res) => memberController.getById(req, res));
memberRouter.put("/members/:id", (req, res) => memberController.update(req, res));
memberRouter.delete("/members/:id", (req, res) => memberController.delete(req, res));
memberRouter.post("/members/:id/assign-seat", (req, res) => memberController.assignSeat(req, res));
memberRouter.post("/members/:id/assign-mic", (req, res) => memberController.assignMic(req, res));
memberRouter.get("/members/:id/scorecard", (req, res) => memberController.getScorecard(req, res));
