import { Request, Response } from "express";
import { transcriptRepository } from "../repositories/transcript.repository";
import { memberService } from "../services/member.service";
import { telemetryService } from "../services/telemetry.service";
import { aiService } from "../services/ai.service";

export class TranscriptController {
  async getTranscripts(req: Request, res: Response): Promise<void> {
    const transcripts = await transcriptRepository.findAll();
    res.json({ transcripts, total_count: transcripts.length });
  }

  async addTranscript(req: Request, res: Response): Promise<void> {
    const { text, speaker_id, emotion } = req.body;
    if (!text) {
      res.status(400).json({ error: "Text is required" });
      return;
    }

    const member = (speaker_id ? await memberService.getById(speaker_id) : null) || memberService.getCachedAll()[0];
    if (!member) {
      res.status(409).json({ error: "No members configured yet. Register members before recording transcripts." });
      return;
    }
    const relevance = aiService.analyzeSpeechRelevance(text).score;

    const entry = await transcriptRepository.save({
      id: `tr-${Date.now()}`,
      session_id: telemetryService.getState().sessionId,
      member_id: member.member_id,
      seat_id: member.seat_id,
      text,
      confidence: 0.95,
      emotion: emotion || "Neutral",
      relevance
    });

    telemetryService.broadcast();
    res.status(201).json(entry);
  }
}

export const transcriptController = new TranscriptController();

