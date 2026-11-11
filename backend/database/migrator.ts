import { db } from "./db";
import fs from "fs";
import path from "path";
import { DATA_DIR } from "../config";

export async function runMigrations(): Promise<void> {
  const now = new Date().toISOString();

  // 1. Core Members Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      member_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      seat_id TEXT NOT NULL,
      camera_id TEXT NOT NULL,
      mic_id TEXT NOT NULL,
      allocated_time_seconds INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      constituency TEXT,
      party TEXT,
      role TEXT,
      department TEXT,
      contact_info TEXT,
      avatar TEXT,
      password TEXT,
      password_hash TEXT,
      historical_score REAL DEFAULT 90,
      warnings_count INTEGER DEFAULT 0,
      violations_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Safe column additions for existing tables
  const safeAddColumn = async (table: string, columnDef: string) => {
    try {
      if (db.isPostgres) {
        await db.exec(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${columnDef};`);
      } else {
        await db.exec(`ALTER TABLE ${table} ADD COLUMN ${columnDef};`);
      }
    } catch (_) {
      // Column already exists, safe to ignore
    }
  };

  await safeAddColumn("members", "department TEXT");
  await safeAddColumn("members", "password TEXT");
  await safeAddColumn("members", "password_hash TEXT");
  await safeAddColumn("members", "avatar TEXT");
  await safeAddColumn("members", "historical_score REAL DEFAULT 90");
  await safeAddColumn("members", "warnings_count INTEGER DEFAULT 0");
  await safeAddColumn("members", "violations_count INTEGER DEFAULT 0");

  // 2. Users / Admin Accounts
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      display_name TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Seed default admin account
  await db.run(
    `INSERT INTO users (id, username, password_hash, role, display_name, created_at)
     VALUES ('USR-ADM-001', 'admin', 'admin123', 'admin', 'Parliament Administrator', ?)
     ON CONFLICT (id) DO NOTHING;`,
    [now]
  );

  // 3. Sessions & Topics
  await db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      session_id TEXT PRIMARY KEY,
      title TEXT,
      agenda TEXT,
      session_date TEXT,
      status TEXT NOT NULL,
      start_time TEXT,
      scheduled_end_time TEXT,
      max_speaking_time_seconds INTEGER DEFAULT 300,
      scheduled_by TEXT,
      started_at TEXT,
      ended_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS topics (
      topic_id TEXT PRIMARY KEY,
      session_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      start_time TEXT,
      end_time TEXT,
      priority TEXT,
      speeches_count INTEGER DEFAULT 0,
      avg_relevance REAL DEFAULT 90.0,
      violations_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  await safeAddColumn("sessions", "start_time TEXT");
  await safeAddColumn("sessions", "scheduled_end_time TEXT");
  await safeAddColumn("sessions", "max_speaking_time_seconds INTEGER DEFAULT 300");
  await safeAddColumn("sessions", "scheduled_by TEXT");

  // 4. Hardware Devices & Physical Chamber Matrix
  await db.exec(`
    CREATE TABLE IF NOT EXISTS seats (
      seat_id TEXT PRIMARY KEY,
      zone TEXT,
      camera_id TEXT,
      status TEXT
    );
    CREATE TABLE IF NOT EXISTS cameras (
      camera_id TEXT PRIMARY KEY,
      seat_id TEXT,
      status TEXT
    );
    CREATE TABLE IF NOT EXISTS microphones (
      mic_id TEXT PRIMARY KEY,
      member_id TEXT,
      status TEXT
    );
  `);

  // 5. Speech Turns & STT Transcripts
  await db.exec(`
    CREATE TABLE IF NOT EXISTS speaking_records (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      member_id TEXT,
      started_at TEXT,
      ended_at TEXT,
      duration_seconds INTEGER DEFAULT 0,
      status TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transcripts (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      member_id TEXT,
      seat_id TEXT,
      text TEXT NOT NULL,
      confidence REAL,
      emotion TEXT,
      relevance REAL,
      created_at TEXT NOT NULL
    );
  `);

  // 6. Decorum Alerts, Violations, Suspensions, and Emergency Requests
  await db.exec(`
    CREATE TABLE IF NOT EXISTS alerts (
      alert_id TEXT PRIMARY KEY,
      session_id TEXT,
      member_id TEXT,
      rule_id TEXT,
      type TEXT,
      severity TEXT,
      title TEXT,
      description TEXT,
      source_module TEXT,
      status TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS violations (
      id TEXT PRIMARY KEY,
      alert_id TEXT,
      member_id TEXT,
      category TEXT,
      penalty_points INTEGER,
      confirmed INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS emergency_requests (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      member_id TEXT,
      reason TEXT,
      status TEXT,
      requested_at TEXT NOT NULL,
      decided_at TEXT,
      decided_by TEXT
    );

    CREATE TABLE IF NOT EXISTS suspensions (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      member_id TEXT,
      reason TEXT,
      duration_days INTEGER DEFAULT 1,
      status TEXT,
      requested_at TEXT NOT NULL,
      decided_at TEXT,
      decided_by TEXT,
      confirmed_by TEXT
    );
  `);

  await safeAddColumn("notifications", "description TEXT");
  await safeAddColumn("suspensions", "duration_days INTEGER DEFAULT 1");
  await safeAddColumn("suspensions", "confirmed_by TEXT");

  // 7. Scorecards, Official Reports, Audit Log, and Notifications
  await db.exec(`
    CREATE TABLE IF NOT EXISTS scorecards (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      member_id TEXT,
      score REAL,
      payload TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS session_reports (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      member_id TEXT,
      type TEXT,
      alert_level INTEGER,
      title TEXT,
      description TEXT,
      member_audio_message TEXT,
      severity TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  // 8. Performance Indexes
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_members_seat_id ON members(seat_id);
    CREATE INDEX IF NOT EXISTS idx_members_role ON members(role);
    CREATE INDEX IF NOT EXISTS idx_alerts_session_member ON alerts(session_id, member_id);
    CREATE INDEX IF NOT EXISTS idx_transcripts_session ON transcripts(session_id);
    CREATE INDEX IF NOT EXISTS idx_violations_member ON violations(member_id);
    CREATE INDEX IF NOT EXISTS idx_emergency_status ON emergency_requests(status);
    CREATE INDEX IF NOT EXISTS idx_notifications_member ON notifications(member_id);
  `);

  // 9. Seed Members from data/members.json if members table is empty
  try {
    const memberCount = await db.get<{ count: string | number }>("SELECT COUNT(*) as count FROM members;");
    const count = Number(memberCount?.count || 0);

    if (count === 0) {
      const membersJsonPath = path.join(DATA_DIR, "members.json");
      if (fs.existsSync(membersJsonPath)) {
        const raw = fs.readFileSync(membersJsonPath, "utf-8");
        const list = JSON.parse(raw);
        for (const m of list) {
          const seat = m.seat_id || "S01";
          const cam = `CAM-${seat}`;
          const mic = `MIC-${seat}`;
          await db.run(
            `INSERT INTO members (
              member_id, name, seat_id, camera_id, mic_id, allocated_time_seconds,
              status, constituency, party, role, department, avatar, historical_score,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (member_id) DO NOTHING;`,
            [
              m.member_id, m.name, seat, cam, mic, m.allocated_time_seconds || 300,
              m.constituency || "General", m.party || "Independent", m.role || "Member of Parliament",
              m.role || "Parliamentarian", m.avatar || "", m.historical_score || 90,
              now, now
            ]
          );

          await db.run(
            `INSERT INTO seats (seat_id, zone, camera_id, status) VALUES (?, 'Chamber', ?, 'ASSIGNED')
             ON CONFLICT (seat_id) DO NOTHING;`,
            [seat, cam]
          );
          await db.run(
            `INSERT INTO cameras (camera_id, seat_id, status) VALUES (?, ?, 'ASSIGNED')
             ON CONFLICT (camera_id) DO NOTHING;`,
            [cam, seat]
          );
          await db.run(
            `INSERT INTO microphones (mic_id, member_id, status) VALUES (?, ?, 'ASSIGNED')
             ON CONFLICT (mic_id) DO NOTHING;`,
            [mic, m.member_id]
          );
        }
        console.log(`[DATABASE] Seeded ${list.length} initial parliament members into database.`);
      }
    }
  } catch (seedErr) {
    console.warn("[DATABASE] Note on member seeding:", seedErr);
  }

  console.log(`[DATABASE] ${db.isPostgres ? "PostgreSQL / Neon" : "SQLite"} schema migrations executed successfully.`);
}

