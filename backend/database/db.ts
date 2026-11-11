import fs from "fs";
import path from "path";
import { createRequire } from "module";
import pg from "pg";
import { DATABASE_URL, DB_PATH } from "../config";

const { Pool } = pg;

// Suppress Node.js experimental warning and pg SSL deprecation warning
const origEmitWarning = process.emitWarning;
process.emitWarning = function (...args: any[]) {
  if (typeof args[0] === "string" && (args[0].includes("SQLite") || args[0].includes("SECURITY WARNING") || args[0].includes("pg-connection-string"))) return;
  if (args[1] === "ExperimentalWarning") return;
  return (origEmitWarning as any).apply(process, args);
};

export class DatabaseService {
  private static instance: DatabaseService;
  public isPostgres: boolean = false;
  private pool?: pg.Pool;
  private sqliteDb?: any;

  private constructor() {
    if (DATABASE_URL && (DATABASE_URL.startsWith("postgres://") || DATABASE_URL.startsWith("postgresql://"))) {
      this.isPostgres = true;
      const isLocalhost = DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1");
      const requiresSsl = !isLocalhost && (DATABASE_URL.includes("neon.tech") || DATABASE_URL.includes("sslmode=require") || process.env.NODE_ENV === "production");

      this.pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: requiresSsl ? { rejectUnauthorized: false } : false,
        max: 10,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 30000,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
      });

      this.pool.on("error", (err) => {
        // Neon terminates idle clients periodically; pg-pool removes them automatically.
        // Ignore idle client termination so it does not bubble as an uncaught exception.
        if (err?.message?.includes("terminated") || err?.message?.includes("closed")) {
          return;
        }
        console.error("[DATABASE] Idle client notice:", err.message);
      });

      console.log("[DATABASE] Connected to PostgreSQL / Neon database.");
    } else {
      this.isPostgres = false;
      console.warn("[DATABASE] No DATABASE_URL provided. Falling back to local SQLite database.");
      console.warn("[DATABASE] To connect to Neon, set DATABASE_URL=postgresql://... in your .env file.");

      const nodeRequire = typeof require !== "undefined" ? require : createRequire(process.cwd());
      const { DatabaseSync } = nodeRequire("node:sqlite");
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
      this.sqliteDb = new DatabaseSync(DB_PATH);
      this.sqliteDb.exec("PRAGMA journal_mode = WAL;");
      this.sqliteDb.exec("PRAGMA foreign_keys = ON;");
    }
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private convertPlaceholders(sql: string): string {
    let index = 1;
    return sql.replace(/\?/g, () => `$${index++}`);
  }

  private isTransient(err: any): boolean {
    if (!err) return false;
    const msg = (err.message || "").toLowerCase();
    return (
      msg.includes("terminated") ||
      msg.includes("timeout") ||
      msg.includes("closed") ||
      msg.includes("econnreset") ||
      msg.includes("socket") ||
      err.code === "57P01" ||
      err.code === "ECONNRESET"
    );
  }

  public async run(sql: string, params: any[] = []): Promise<{ changes: number }> {
    if (this.isPostgres && this.pool) {
      const pgSql = this.convertPlaceholders(sql);
      try {
        const res = await this.pool.query(pgSql, params);
        return { changes: res.rowCount || 0 };
      } catch (err: any) {
        if (this.isTransient(err)) {
          await new Promise((r) => setTimeout(r, 600));
          const res = await this.pool.query(pgSql, params);
          return { changes: res.rowCount || 0 };
        }
        throw err;
      }
    } else {
      const res = this.sqliteDb.prepare(sql).run(...params);
      return { changes: res.changes || 0 };
    }
  }

  public async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (this.isPostgres && this.pool) {
      const pgSql = this.convertPlaceholders(sql);
      try {
        const res = await this.pool.query(pgSql, params);
        return res.rows as T[];
      } catch (err: any) {
        if (this.isTransient(err)) {
          await new Promise((r) => setTimeout(r, 600));
          const res = await this.pool.query(pgSql, params);
          return res.rows as T[];
        }
        throw err;
      }
    } else {
      return this.sqliteDb.prepare(sql).all(...params) as T[];
    }
  }

  public async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return this.all<T>(sql, params);
  }

  public async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    if (this.isPostgres && this.pool) {
      const pgSql = this.convertPlaceholders(sql);
      try {
        const res = await this.pool.query(pgSql, params);
        return (res.rows[0] as T) || undefined;
      } catch (err: any) {
        if (this.isTransient(err)) {
          await new Promise((r) => setTimeout(r, 600));
          const res = await this.pool.query(pgSql, params);
          return (res.rows[0] as T) || undefined;
        }
        throw err;
      }
    } else {
      return this.sqliteDb.prepare(sql).get(...params) as T | undefined;
    }
  }

  public async exec(sql: string): Promise<void> {
    if (this.isPostgres && this.pool) {
      try {
        await this.pool.query(sql);
      } catch (err: any) {
        if (this.isTransient(err)) {
          await new Promise((r) => setTimeout(r, 600));
          await this.pool.query(sql);
          return;
        }
        throw err;
      }
    } else {
      this.sqliteDb.exec(sql);
    }
  }
}

export const db = DatabaseService.getInstance();
