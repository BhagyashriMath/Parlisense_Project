import { db } from "../database/db";
import { EmergencyRequestEntity } from "../models";

export class EmergencyRepository {
  public async findAll(sessionId?: string): Promise<EmergencyRequestEntity[]> {
    const sql = sessionId
      ? `SELECT er.*, COALESCE(m.name, 'Hon. Member') as member_name, COALESCE(m.seat_id, 'S001') as seat_id 
         FROM emergency_requests er 
         LEFT JOIN members m ON er.member_id = m.member_id 
         WHERE er.session_id = ? AND er.status != 'SUPERSEDED' AND er.status != 'EXPIRED'
         ORDER BY er.requested_at DESC`
      : `SELECT er.*, COALESCE(m.name, 'Hon. Member') as member_name, COALESCE(m.seat_id, 'S001') as seat_id 
         FROM emergency_requests er 
         LEFT JOIN members m ON er.member_id = m.member_id 
         WHERE er.status != 'SUPERSEDED' AND er.status != 'EXPIRED'
         ORDER BY er.requested_at DESC`;
    const params = sessionId ? [sessionId] : [];
    return db.all<EmergencyRequestEntity>(sql, params);
  }

  public async findById(id: string): Promise<EmergencyRequestEntity | undefined> {
    const sql = `SELECT er.*, COALESCE(m.name, 'Hon. Member') as member_name, COALESCE(m.seat_id, 'S001') as seat_id 
       FROM emergency_requests er 
       LEFT JOIN members m ON er.member_id = m.member_id 
       WHERE er.id = ?`;
    return db.get<EmergencyRequestEntity>(sql, [id]);
  }

  public async create(data: { session_id?: string; member_id: string; reason: string }): Promise<EmergencyRequestEntity> {
    const req: EmergencyRequestEntity = {
      id: `EMG-REQ-${Date.now()}`,
      session_id: data.session_id || "PAR-2026-001",
      member_id: data.member_id,
      reason: data.reason,
      status: "PENDING",
      requested_at: new Date().toISOString()
    };
    await this.insert(req);
    return req;
  }

  public async insert(req: EmergencyRequestEntity): Promise<void> {
    await db.run(`
      INSERT INTO emergency_requests (
        id, session_id, member_id, reason, status, requested_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET
        status = excluded.status,
        reason = excluded.reason
    `, [req.id, req.session_id, req.member_id, req.reason || "Medical Emergency at Desk", req.status || "PENDING", req.requested_at]);
  }

  public async decide(id: string, status: "APPROVED" | "DENIED" | "REJECTED", decidedBy: string): Promise<any> {
    const now = new Date().toISOString();
    const res = await db.run(`
      UPDATE emergency_requests SET status = ?, decided_at = ?, decided_by = ? WHERE id = ?
    `, [status, now, decidedBy, id]);
    if (res.changes > 0) {
      return { id, status, decided_at: now, decided_by: decidedBy };
    }
    return null;
  }
}

export const emergencyRepository = new EmergencyRepository();

