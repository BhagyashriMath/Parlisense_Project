import { db } from "../database/db";

export interface NotificationRecord {
  id: string;
  session_id?: string;
  member_id: string; // memberId or 'ALL'
  type: string;
  alert_level?: number;
  title: string;
  description?: string;
  member_audio_message?: string;
  severity?: string;
  is_read?: number;
  created_at: string;
}

export class NotificationRepository {
  public async create(notif: Omit<NotificationRecord, "id" | "created_at">): Promise<NotificationRecord> {
    const records = await this.createMany([notif]);
    return records[0];
  }

  public async createMany(notifs: Array<Omit<NotificationRecord, "id" | "created_at">>): Promise<NotificationRecord[]> {
    if (notifs.length === 0) return [];
    const now = new Date().toISOString();
    const records: NotificationRecord[] = [];

    for (const notif of notifs) {
      const id = `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      await db.run(
        `
        INSERT INTO notifications (
          id, session_id, member_id, type, alert_level,
          title, description, member_audio_message, severity, is_read, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO NOTHING;
      `,
        [
          id,
          notif.session_id || null,
          notif.member_id || "ALL",
          notif.type || "ANNOUNCEMENT",
          notif.alert_level || 1,
          notif.title,
          notif.description || null,
          notif.member_audio_message || null,
          notif.severity || "LOW",
          0,
          now
        ]
      );
      records.push({
        id,
        session_id: notif.session_id,
        member_id: notif.member_id,
        type: notif.type,
        alert_level: notif.alert_level || 1,
        title: notif.title,
        description: notif.description,
        member_audio_message: notif.member_audio_message,
        severity: notif.severity || "LOW",
        is_read: 0,
        created_at: now
      });
    }

    return records;
  }

  public async findByMemberId(memberId: string, limit = 50): Promise<NotificationRecord[]> {
    return db.all<NotificationRecord>(
      `
      SELECT * FROM notifications 
      WHERE member_id = ? OR member_id = 'ALL'
      ORDER BY created_at DESC 
      LIMIT ?
    `,
      [memberId, limit]
    );
  }

  public async getAll(limit = 50): Promise<NotificationRecord[]> {
    return db.all<NotificationRecord>(
      `
      SELECT * FROM notifications 
      ORDER BY created_at DESC 
      LIMIT ?
    `,
      [limit]
    );
  }

  public async markAsRead(id: string): Promise<void> {
    await db.run(`UPDATE notifications SET is_read = 1 WHERE id = ?`, [id]);
  }
}

export const notificationRepository = new NotificationRepository();

