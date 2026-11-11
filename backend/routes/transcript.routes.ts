import { Router } from "express";
import { transcriptController } from "../controllers/transcript.controller";

export const transcriptRouter = Router();

transcriptRouter.get("/transcript", (req, res) => transcriptController.getTranscripts(req, res));
transcriptRouter.post("/transcript", (req, res) => transcriptController.addTranscript(req, res));
