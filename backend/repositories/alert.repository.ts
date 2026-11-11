import { db } from "../database/db";
import { AlertEntity } from "../models";

export interface AlertQueryOptions {
  sessionId?: string;
  memberId?: string;
  severity?: string;
  status?: string;
  limit?: number;
  page?: number;
}

export class AlertRepository {
  private cachedAlerts: AlertEntity[] = [];

  public getCachedAlerts(): AlertEntity[] {
    return this.cachedAlerts;
  }

  public setCachedAlerts(alerts: AlertEntity[]): void {
    this.cachedAlerts = alerts;
  }

  public async findAll(options: AlertQueryOptions = {}): Promise<{ alerts: AlertEntity[]; total: number }> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (options.sessionId) {
      conditions.push("session_id = ?");
      params.push(options.sessionId);
    }
    if (options.memberId) {
      conditions.push("member_id = ?");
      params.push(options.memberId);
    }
    if (options.severity) {
      conditions.push("severity = ?");
      params.push(options.severity.toUpperCase());
    }
    if (options.status) {
      conditions.push("status = ?");
      params.push(options.status.toUpperCase());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const countRow = await db.get<{ count: string | number }>(`SELECT COUNT(*) as count FROM alerts ${whereClause}`, params);
    const total = Number(countRow ? countRow.count : 0);

    let sql = `SELECT * FROM alerts ${whereClause} ORDER BY created_at DESC`;
    const queryParams = [...params];

    if (options.limit && options.limit > 0) {
      const page = options.page && options.page > 0 ? options.page : 1;
      const offset = (page - 1) * options.limit;
      sql += ` LIMIT ? OFFSET ?`;
      queryParams.push(options.limit, offset);
    }

    const rows = await db.all<AlertEntity>(sql, queryParams);
    if (!options.memberId && (!options.limit || options.limit >= 50)) {
      this.cachedAlerts = rows;
    }
    return { alerts: rows, total };
  }

  public async findAllAlerts(options: AlertQueryOptions = {}): Promise<AlertEntity[]> {
    const res = await this.findAll(options);
    return res.alerts;
  }

  public async findById(alertId: string): Promise<AlertEntity | undefined> {
    return db.get<AlertEntity>(`SELECT * FROM alerts WHERE alert_id = ?`, [alertId]);
  }

  public async getPendingRecommendations(): Promise<any[]> {
    const rows = await db.all<any>(`
      SELECT a.*, m.name as member_name, m.seat_id
      FROM alerts a
      LEFT JOIN members m ON a.member_id = m.member_id
      WHERE a.status = 'ACTIVE' AND a.rule_id = 'RULE_9_SUSPENSION_REVIEW'
        AND (SELECT COUNT(*) FROM violations v WHERE v.member_id = a.member_id AND v.penalty_points >= 10) >= 3
      ORDER BY a.created_at DESC
    `);
    return rows.map(r => ({
      alert_id: r.alert_id,
      member_id: r.member_id,
      member_name: r.member_name || r.member_id,
      seat_id: r.seat_id || "S001",
      title: r.title,
      timestamp: r.created_at || new Date().toLocaleTimeString(),
      evidence: { rule: r.rule_id, description: r.description },
      suspension_recommended: true
    }));
  }

  public async insert(a: AlertEntity): Promise<void> {
    const now = a.created_at || new Date().toISOString();
    await db.run(`
      INSERT INTO alerts (
        alert_id, session_id, member_id, rule_id, type, severity,
        title, description, source_module, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (alert_id) DO UPDATE SET
        status = excluded.status,
        severity = excluded.severity,
        title = excluded.title,
        description = excluded.description
    `, [
      a.alert_id, a.session_id, a.member_id, a.rule_id, a.type, a.severity,
      a.title, a.description, a.source_module, a.status || "ACTIVE", now
    ]);

    const existingIdx = this.cachedAlerts.findIndex(item => item.alert_id === a.alert_id);
    if (existingIdx >= 0) {
      this.cachedAlerts[existingIdx] = { ...a, created_at: now };
    } else {
      this.cachedAlerts.unshift({ ...a, created_at: now });
      if (this.cachedAlerts.length > 100) this.cachedAlerts.pop();
    }
  }

  public async save(a: AlertEntity): Promise<void> {
    await this.insert(a);
  }

  public async acknowledge(alertId: string): Promise<boolean> {
    const res = await db.run(`UPDATE alerts SET status = 'ACKNOWLEDGED' WHERE alert_id = ?`, [alertId]);
    const cached = this.cachedAlerts.find(a => a.alert_id === alertId);
    if (cached) cached.status = "ACKNOWLEDGED";
    return res.changes > 0;
  }

  public async insertViolation(alertId: string, memberId: string, category: string, penalty = 0): Promise<void> {
    const id = `VIO-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    await db.run(`
      INSERT INTO violations (
        id, alert_id, member_id, category, penalty_points, confirmed, created_at
      ) VALUES (?, ?, ?, ?, ?, 1, ?)
      ON CONFLICT (id) DO UPDATE SET
        penalty_points = excluded.penalty_points,
        confirmed = excluded.confirmed
    `, [id, alertId, memberId, category, penalty, now]);
  }

  public async getViolations(memberId?: string, limit = 50): Promise<any[]> {
    const sql = memberId
      ? `SELECT * FROM violations WHERE member_id = ? ORDER BY created_at DESC LIMIT ?`
      : `SELECT * FROM violations ORDER BY created_at DESC LIMIT ?`;
    const params = memberId ? [memberId, limit] : [limit];
    return db.all<any>(sql, params);
  }
}

export const alertRepository = new AlertRepository();

