import { Request, Response } from "express";
import { alertRepository } from "../repositories/alert.repository";
import { telemetryService } from "../services/telemetry.service";

export class AlertController {
  async getAlerts(req: Request, res: Response): Promise<void> {
    const { status, severity, limit } = req.query;
    const result = await alertRepository.findAll({
      status: status as string,
      severity: severity as string,
      limit: limit ? Number(limit) : 50
    });
    res.json({ alerts: result.alerts, total_count: result.total });
  }

  async acknowledgeAlert(req: Request, res: Response): Promise<void> {
    const success = await alertRepository.acknowledge(req.params.id);
    if (!success) {
      res.status(404).json({ error: "Alert not found" });
      return;
    }
    telemetryService.broadcast();
    res.json({ status: "ACKNOWLEDGED", alert_id: req.params.id });
  }

  async getViolations(req: Request, res: Response): Promise<void> {
    const violations = await alertRepository.getViolations();
    res.json({ violations, total_count: violations.length });
  }
}

export const alertController = new AlertController();

