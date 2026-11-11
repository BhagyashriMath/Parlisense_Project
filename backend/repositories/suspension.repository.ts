import { db } from "../database/db";
import { SuspensionEntity } from "../models";

export class SuspensionRepository {
  public async findAll(sessionId?: string): Promise<SuspensionEntity[]> {
    const sql = sessionId
      ? `SELECT * FROM suspensions WHERE session_id = ? ORDER BY requested_at DESC`
      : `SELECT * FROM suspensions ORDER BY requested_at DESC`;
    const params = sessionId ? [sessionId] : [];
    return db.all<SuspensionEntity>(sql, params);
  }

  public async findByMemberId(memberId: string): Promise<SuspensionEntity | undefined> {
    return db.get<SuspensionEntity>(
      `SELECT * FROM suspensions WHERE member_id = ? AND status = 'CONFIRMED' ORDER BY decided_at DESC LIMIT 1`,
      [memberId]
    );
  }

  public async isSuspended(memberId: string): Promise<boolean> {
    const s = await this.findByMemberId(memberId);
    return !!s;
  }

  public async create(data: { session_id?: string; member_id: string; reason: string; duration_days?: number; status?: "PENDING" | "CONFIRMED" | "REJECTED"; confirmed_by?: string }): Promise<SuspensionEntity> {
    const entity: SuspensionEntity = {
      id: `SUSP-${Date.now()}`,
      session_id: data.session_id || "PAR-2026-001",
      member_id: data.member_id,
      reason: data.reason,
      duration_days: data.duration_days || 1,
      status: data.status || "CONFIRMED",
      requested_at: new Date().toISOString(),
      decided_at: new Date().toISOString(),
      confirmed_by: data.confirmed_by || "Hon. Speaker"
    };
    await this.insert(entity);
    return entity;
  }

  public async insert(s: SuspensionEntity): Promise<void> {
    await db.run(`
      INSERT INTO suspensions (
        id, session_id, member_id, reason, duration_days, status, requested_at, decided_at, confirmed_by, decided_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET
        status = excluded.status,
        decided_at = excluded.decided_at,
        confirmed_by = excluded.confirmed_by,
        decided_by = excluded.decided_by
    `, [s.id, s.session_id, s.member_id, s.reason, s.duration_days || 1, s.status || "PENDING", s.requested_at, s.decided_at || null, s.confirmed_by || null, s.confirmed_by || null]);
  }

  public async decide(id: string, status: "CONFIRMED" | "REJECTED", decidedBy: string): Promise<boolean> {
    const now = new Date().toISOString();
    // Only a CONFIRMED suspension carries a "confirmed_by"; rejections record
    // the deciding officer in decided_by instead of miswriting confirmed_by.
    const confirmedBy = status === "CONFIRMED" ? decidedBy : null;
    const res = await db.run(`
      UPDATE suspensions SET status = ?, decided_at = ?, confirmed_by = ?, decided_by = ? WHERE id = ?
    `, [status, now, confirmedBy, decidedBy, id]);
    return res.changes > 0;
  }
}

export const suspensionRepository = new SuspensionRepository();

