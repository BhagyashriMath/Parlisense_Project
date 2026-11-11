import { Request, Response } from "express";
import { memberService } from "../services/member.service";
import { telemetryService } from "../services/telemetry.service";

export class MemberController {
  async getAll(req: Request, res: Response): Promise<void> {
    const { search, party, role, status, page, limit } = req.query;
    const members = await memberService.getAll({
      search: search as string,
      party: party as string,
      role: role as string,
      status: status as string,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined
    });
    res.json({
      members,
      total_count: members.length,
      count: members.length
    });
  }

  async getById(req: Request, res: Response): Promise<void> {
    const member = await memberService.getById(req.params.id);
    if (!member) {
      res.status(404).json({ error: "Member not found" });
      return;
    }
    res.json({ member, ...member });
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const created = await memberService.create(req.body);
      telemetryService.broadcast();
      res.status(201).json({
        member: created,
        ...created
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to create member" });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const updated = await memberService.update(req.params.id, req.body);
      if (!updated) {
        res.status(404).json({ error: "Member not found" });
        return;
      }
      telemetryService.broadcast();
      res.json({
        member: updated,
        ...updated
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to update member" });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    const success = await memberService.delete(req.params.id);
    if (!success) {
      res.status(404).json({ error: "Member not found" });
      return;
    }
    telemetryService.broadcast();
    res.json({ status: "DELETED", id: req.params.id });
  }

  async assignSeat(req: Request, res: Response): Promise<void> {
    const { seat_id } = req.body;
    if (!seat_id) {
      res.status(400).json({ error: "seat_id is required" });
      return;
    }

    const result = await memberService.assignSeat(req.params.id, seat_id);
    if (!result) {
      res.status(404).json({ error: "Member not found" });
      return;
    }

    telemetryService.broadcast();
    res.json({
      status: "SEAT_ASSIGNED",
      member: result.member,
      mic_id: result.mic_id,
      camera_id: result.camera_id
    });
  }

  async assignMic(req: Request, res: Response): Promise<void> {
    const { mic_id } = req.body;
    if (!mic_id) {
      res.status(400).json({ error: "mic_id is required" });
      return;
    }

    const member = await memberService.assignMic(req.params.id, mic_id);
    if (!member) {
      res.status(404).json({ error: "Member not found" });
      return;
    }

    telemetryService.broadcast();
    res.json({ status: "MIC_ASSIGNED", member });
  }

  async getScorecard(req: Request, res: Response): Promise<void> {
    const speakingTimeSeconds = telemetryService.getMemberSpeakingSeconds()[req.params.id] || 0;
    const scorecard = await memberService.getScorecard(req.params.id, speakingTimeSeconds);
    if (!scorecard) {
      res.status(404).json({ error: "Scorecard not found for member" });
      return;
    }
    res.json(scorecard);
  }
}

export const memberController = new MemberController();
