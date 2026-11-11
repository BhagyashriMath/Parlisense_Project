import { db } from "../database/db";
import fs from "fs";
import { AUDIT_LOG_PATH } from "../config";

export class AuditRepository {
  public async insert(eventType: string, payload: any, sessionId?: string): Promise<void> {
    const id = `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    
    await db.run(`
      INSERT INTO audit_log (id, session_id, event_type, payload, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (id) DO NOTHING;
    `, [id, sessionId || null, eventType, JSON.stringify(payload), now]);

    // Append to session-audit.jsonl file
    try {
      fs.appendFileSync(AUDIT_LOG_PATH, JSON.stringify({
        id,
        type: eventType,
        timestamp: now,
        sessionId: sessionId || null,
        payload
      }) + "\n");
    } catch (_) {}
  }

  public async log(eventType: string, payload: any, sessionId?: string): Promise<void> {
    await this.insert(eventType, payload, sessionId);
  }

  public async findAll(options: { limit?: number; eventType?: string; sessionId?: string } = {}): Promise<any[]> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (options.sessionId) {
      conditions.push("session_id = ?");
      params.push(options.sessionId);
    }
    if (options.eventType) {
      conditions.push("event_type = ?");
      params.push(options.eventType);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = options.limit || 100;

    const rows = await db.all<{ id: string; session_id: string; event_type: string; payload: string; created_at: string }>(
      `SELECT * FROM audit_log ${whereClause} ORDER BY created_at DESC LIMIT ?`,
      [...params, limit]
    );

    return rows.map((r) => ({
      id: r.id,
      session_id: r.session_id,
      event_type: r.event_type,
      payload: JSON.parse(r.payload || "{}"),
      created_at: r.created_at
    }));
  }

  public async getRecent(limit = 250): Promise<any[]> {
    return this.findAll({ limit });
  }
}

export const auditRepository = new AuditRepository();

