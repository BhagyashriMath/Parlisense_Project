import { db } from "../database/db";
import { SessionEntity, TopicEntity } from "../models";

export class SessionRepository {
  private cachedSession?: SessionEntity;
  private cachedTopics: TopicEntity[] = [];

  public getCachedSession(): SessionEntity | undefined {
    return this.cachedSession;
  }

  public getCachedTopics(): TopicEntity[] {
    return this.cachedTopics;
  }

  public async findById(sessionId: string): Promise<SessionEntity | undefined> {
    const row = await db.get(`SELECT * FROM sessions WHERE session_id = ?`, [sessionId]);
    if (row) {
      this.cachedSession = row as SessionEntity;
      return row as SessionEntity;
    }
    return undefined;
  }

  public async saveSession(session: Partial<SessionEntity>): Promise<SessionEntity> {
    const now = new Date().toISOString();
    const existing = session.session_id ? await this.findById(session.session_id) : undefined;

    const entity: SessionEntity = {
      session_id: session.session_id || `PAR-${new Date().getFullYear()}-001`,
      title: session.title ?? existing?.title ?? "Parliamentary Legislative Session",
      agenda: session.agenda ?? existing?.agenda ?? "Legislative Agenda",
      session_date: session.session_date ?? existing?.session_date ?? now.slice(0, 10),
      status: session.status || existing?.status || "CONFIGURING",
      start_time: session.start_time ?? existing?.start_time ?? "10:00 AM",
      scheduled_end_time: session.scheduled_end_time ?? existing?.scheduled_end_time ?? "05:00 PM",
      started_at: session.started_at ?? existing?.started_at,
      ended_at: session.ended_at ?? existing?.ended_at,
      created_at: existing?.created_at || now
    };

    await db.run(`
      INSERT INTO sessions (
        session_id, title, agenda, session_date, status, start_time,
        scheduled_end_time, started_at, ended_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (session_id) DO UPDATE SET
        title = excluded.title,
        agenda = excluded.agenda,
        session_date = excluded.session_date,
        status = excluded.status,
        start_time = excluded.start_time,
        scheduled_end_time = excluded.scheduled_end_time,
        started_at = excluded.started_at,
        ended_at = excluded.ended_at
    `, [
      entity.session_id, entity.title, entity.agenda, entity.session_date,
      entity.status, entity.start_time, entity.scheduled_end_time,
      entity.started_at || null, entity.ended_at || null, entity.created_at
    ]);

    this.cachedSession = entity;
    return entity;
  }

  public async save(session: Partial<SessionEntity>): Promise<SessionEntity> {
    return this.saveSession(session);
  }

  public async getTopics(sessionId?: string): Promise<TopicEntity[]> {
    const sql = sessionId
      ? `SELECT * FROM topics WHERE session_id = ? ORDER BY topic_id ASC`
      : `SELECT * FROM topics ORDER BY topic_id ASC`;
    const params = sessionId ? [sessionId] : [];
    const rows = await db.all<TopicEntity>(sql, params);
    this.cachedTopics = rows;
    return rows;
  }

  public async saveTopic(topic: Partial<TopicEntity>): Promise<TopicEntity> {
    const now = new Date().toISOString();
    const id = topic.topic_id || `TOPIC-${Date.now()}`;

    const entity: TopicEntity = {
      topic_id: id,
      session_id: topic.session_id || "PAR-2026-001",
      title: topic.title || "Agenda Topic",
      description: topic.description || "",
      start_time: topic.start_time || "10:00 AM",
      end_time: topic.end_time || "11:00 AM",
      priority: topic.priority || "NORMAL",
      speeches_count: Number(topic.speeches_count || 0),
      avg_relevance: Number(topic.avg_relevance || 90.0),
      violations_count: Number(topic.violations_count || 0),
      created_at: topic.created_at || now
    };

    await db.run(`
      INSERT INTO topics (
        topic_id, session_id, title, description, start_time, end_time,
        priority, speeches_count, avg_relevance, violations_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (topic_id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        start_time = excluded.start_time,
        end_time = excluded.end_time,
        priority = excluded.priority,
        speeches_count = excluded.speeches_count,
        avg_relevance = excluded.avg_relevance,
        violations_count = excluded.violations_count
    `, [
      entity.topic_id, entity.session_id, entity.title, entity.description,
      entity.start_time, entity.end_time, entity.priority, entity.speeches_count,
      entity.avg_relevance, entity.violations_count, entity.created_at
    ]);

    const idx = this.cachedTopics.findIndex((t) => t.topic_id === entity.topic_id);
    if (idx >= 0) this.cachedTopics[idx] = entity;
    else this.cachedTopics.push(entity);

    return entity;
  }

  public async deleteTopic(topicId: string): Promise<boolean> {
    const res = await db.run("DELETE FROM topics WHERE topic_id = ?", [topicId]);
    this.cachedTopics = this.cachedTopics.filter((t) => t.topic_id !== topicId);
    return res.changes > 0;
  }
}

export const sessionRepository = new SessionRepository();

