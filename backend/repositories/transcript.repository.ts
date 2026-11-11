import { db } from "../database/db";
import { TranscriptEntity } from "../models";

export class TranscriptRepository {
  private recentCache: TranscriptEntity[] = [];

  public getCachedRecent(limit = 10, sessionId?: string): TranscriptEntity[] {
    const transcripts = sessionId
      ? this.recentCache.filter((transcript) => transcript.session_id === sessionId)
      : this.recentCache;
    return transcripts.slice(-limit);
  }

  public async findAll(options: { sessionId?: string; memberId?: string; limit?: number } = {}): Promise<TranscriptEntity[]> {
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

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = options.limit || 50;

    const rows = await db.all<TranscriptEntity>(
      `SELECT * FROM transcripts ${whereClause} ORDER BY created_at ASC LIMIT ?`,
      [...params, limit]
    );
    return rows;
  }

  public async findRecent(limit = 10): Promise<TranscriptEntity[]> {
    const rows = await db.all<TranscriptEntity>(
      `SELECT * FROM transcripts ORDER BY created_at DESC LIMIT ?`,
      [limit]
    );
    const reversed = rows.reverse();
    this.recentCache = reversed;
    return reversed;
  }

  public async insert(t: TranscriptEntity): Promise<void> {
    const now = t.created_at || new Date().toISOString();
    await db.run(`
      INSERT INTO transcripts (
        id, session_id, member_id, seat_id, text, confidence, emotion, relevance, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET
        text = excluded.text,
        confidence = excluded.confidence,
        emotion = excluded.emotion,
        relevance = excluded.relevance
    `, [
      t.id, t.session_id, t.member_id, t.seat_id || null, t.text,
      t.confidence || 0.95, t.emotion || "Neutral", t.relevance || 0.9, now
    ]);

    this.recentCache.push({ ...t, created_at: now });
    if (this.recentCache.length > 50) this.recentCache.shift();
  }

  public async save(t: TranscriptEntity): Promise<TranscriptEntity> {
    await this.insert(t);
    return t;
  }
}

export const transcriptRepository = new TranscriptRepository();
