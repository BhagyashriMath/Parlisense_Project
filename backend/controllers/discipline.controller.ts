import { Request, Response } from "express";
import { disciplineService } from "../services/discipline.service";
import { telemetryService } from "../services/telemetry.service";
import { suspensionRepository } from "../repositories/suspension.repository";

export class DisciplineController {
  async getRecommendations(req: Request, res: Response): Promise<void> {
    const recs = await disciplineService.getRecommendations();
    res.json(recs);
  }

  async getAllSuspensions(req: Request, res: Response): Promise<void> {
    try {
      const suspensions = await suspensionRepository.findAll();
      res.json(suspensions);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch suspensions" });
    }
  }

  async confirmSuspension(req: Request, res: Response): Promise<void> {
    const { member_id, alert_id, confirmed_by, reason } = req.body;
    if (!member_id) {
      res.status(400).json({ error: "member_id is required" });
      return;
    }

    try {
      const result = await disciplineService.confirmSuspension(member_id, alert_id, confirmed_by, reason);
      telemetryService.broadcast();
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to confirm suspension" });
    }
  }

  async rejectSuspension(req: Request, res: Response): Promise<void> {
    const { alertId } = req.params;
    const { dismissed_by, reason } = req.body;

    const result = await disciplineService.rejectSuspension(alertId, dismissed_by, reason);
    telemetryService.broadcast();
    res.json(result);
  }

  async checkSuspended(req: Request, res: Response): Promise<void> {
    const isSuspended = await disciplineService.isMemberSuspended(req.params.memberId);
    res.json({ member_id: req.params.memberId, suspended: isSuspended });
  }

  async revokeSuspension(req: Request, res: Response): Promise<void> {
    const { member_id, revoked_by, reason } = req.body;
    if (!member_id) {
      res.status(400).json({ error: "member_id is required" });
      return;
    }

    try {
      const result = await disciplineService.revokeSuspension(member_id, revoked_by, reason);
      telemetryService.broadcast();
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to revoke suspension" });
    }
  }
}

export const disciplineController = new DisciplineController();

