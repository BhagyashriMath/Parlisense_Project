import { db } from "../database/db";
import { MemberEntity } from "../models";

export interface MemberQueryOptions {
  search?: string;
  party?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export type MemberFilterOptions = MemberQueryOptions;

export class MemberRepository {
  private cache: MemberEntity[] = [];

  public getCachedMembers(): MemberEntity[] {
    return this.cache;
  }

  public getCachedMember(id: string): MemberEntity | undefined {
    return this.cache.find(m => m.member_id === id || m.name.toLowerCase() === id.toLowerCase());
  }

  public setCachedMembers(members: MemberEntity[]): void {
    this.cache = members;
  }

  public async findAll(options: MemberQueryOptions = {}): Promise<{ members: MemberEntity[]; total: number }> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (options.search) {
      conditions.push("(LOWER(name) LIKE ? OR LOWER(member_id) LIKE ? OR LOWER(seat_id) LIKE ? OR LOWER(constituency) LIKE ?)");
      const term = `%${options.search.toLowerCase()}%`;
      params.push(term, term, term, term);
    }
    if (options.party) {
      conditions.push("LOWER(party) = ?");
      params.push(options.party.toLowerCase());
    }
    if (options.role) {
      conditions.push("LOWER(role) = ?");
      params.push(options.role.toLowerCase());
    }
    if (options.status) {
      conditions.push("status = ?");
      params.push(options.status.toUpperCase());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countRow = await db.get<{ count: string | number }>(`SELECT COUNT(*) as count FROM members ${whereClause}`, params);
    const total = Number(countRow ? countRow.count : 0);

    let sql = `SELECT * FROM members ${whereClause} ORDER BY member_id ASC`;
    const queryParams = [...params];

    if (options.limit && options.limit > 0) {
      const page = options.page && options.page > 0 ? options.page : 1;
      const offset = (page - 1) * options.limit;
      sql += ` LIMIT ? OFFSET ?`;
      queryParams.push(options.limit, offset);
    }

    const rows = await db.all<any>(sql, queryParams);
    const members = rows.map(this.mapRowToEntity);

    if (Object.keys(options).length === 0) {
      this.cache = members;
    }

    return {
      members,
      total
    };
  }

  public async findAllMembers(options: MemberQueryOptions = {}): Promise<MemberEntity[]> {
    const res = await this.findAll(options);
    return res.members;
  }

  public async count(options: MemberQueryOptions = {}): Promise<number> {
    const res = await this.findAll(options);
    return res.total;
  }

  public async findById(memberId: string): Promise<MemberEntity | undefined> {
    const row = await db.get(`SELECT * FROM members WHERE member_id = ?`, [memberId]);
    return row ? this.mapRowToEntity(row) : undefined;
  }

  public async findBySeatId(seatId: string): Promise<MemberEntity | undefined> {
    const row = await db.get(`SELECT * FROM members WHERE seat_id = ?`, [seatId]);
    return row ? this.mapRowToEntity(row) : undefined;
  }

  public async upsert(m: Partial<MemberEntity>): Promise<MemberEntity> {
    const now = new Date().toISOString();
    const existing = m.member_id ? await this.findById(m.member_id) : undefined;

    const seatDigits = (m.seat_id || "").trim().match(/(\d+)/g);
    const numStr = seatDigits ? seatDigits[seatDigits.length - 1].padStart(3, "0") : "001";

    const member: MemberEntity = {
      member_id: m.member_id || `M${numStr}`,
      name: m.name || existing?.name || "Honourable Member",
      seat_id: m.seat_id || existing?.seat_id || `S${numStr}`,
      camera_id: m.camera_id || existing?.camera_id || `CAM${numStr}`,
      mic_id: m.mic_id || existing?.mic_id || `MIC${numStr}`,
      allocated_time_seconds: m.allocated_time_seconds ?? existing?.allocated_time_seconds ?? 300,
      status: (m.status as any) || existing?.status || "ACTIVE",
      constituency: m.constituency ?? existing?.constituency ?? "",
      party: m.party ?? existing?.party ?? "Independent",
      role: m.role ?? existing?.role ?? "Member of Parliament",
      department: m.department ?? existing?.department ?? "",
      contact_info: m.contact_info ?? existing?.contact_info ?? "",
      avatar: m.avatar ?? existing?.avatar ?? "",
      password: m.password ?? existing?.password ?? "password123",
      password_hash: m.password_hash ?? existing?.password_hash ?? "",
      historical_score: m.historical_score ?? existing?.historical_score ?? 90,
      warnings_count: m.warnings_count ?? existing?.warnings_count ?? 0,
      violations_count: m.violations_count ?? existing?.violations_count ?? 0,
      created_at: existing?.created_at || now,
      updated_at: now
    };

    await db.run(`
      INSERT INTO members (
        member_id, name, seat_id, camera_id, mic_id, allocated_time_seconds, status,
        constituency, party, role, department, contact_info, avatar, password, password_hash,
        historical_score, warnings_count, violations_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(member_id) DO UPDATE SET
        name = excluded.name,
        seat_id = excluded.seat_id,
        camera_id = excluded.camera_id,
        mic_id = excluded.mic_id,
        allocated_time_seconds = excluded.allocated_time_seconds,
        status = excluded.status,
        constituency = excluded.constituency,
        party = excluded.party,
        role = excluded.role,
        department = excluded.department,
        contact_info = excluded.contact_info,
        avatar = excluded.avatar,
        password = excluded.password,
        password_hash = excluded.password_hash,
        historical_score = excluded.historical_score,
        warnings_count = excluded.warnings_count,
        violations_count = excluded.violations_count,
        updated_at = excluded.updated_at
    `, [
      member.member_id, member.name, member.seat_id, member.camera_id, member.mic_id,
      member.allocated_time_seconds, member.status, member.constituency, member.party,
      member.role, member.department, member.contact_info, member.avatar, member.password, member.password_hash,
      member.historical_score, member.warnings_count, member.violations_count, member.created_at, member.updated_at
    ]);

    // Upsert devices
    await db.run(
      `INSERT INTO seats (seat_id, zone, camera_id, status) VALUES (?, 'Chamber', ?, 'ASSIGNED')
       ON CONFLICT (seat_id) DO UPDATE SET camera_id = excluded.camera_id, status = excluded.status;`,
      [member.seat_id, member.camera_id]
    );
    await db.run(
      `INSERT INTO cameras (camera_id, seat_id, status) VALUES (?, ?, 'ASSIGNED')
       ON CONFLICT (camera_id) DO UPDATE SET seat_id = excluded.seat_id, status = excluded.status;`,
      [member.camera_id, member.seat_id]
    );
    await db.run(
      `INSERT INTO microphones (mic_id, member_id, status) VALUES (?, ?, 'ASSIGNED')
       ON CONFLICT (mic_id) DO UPDATE SET member_id = excluded.member_id, status = excluded.status;`,
      [member.mic_id, member.member_id]
    );

    // Update in-memory cache
    const idx = this.cache.findIndex((c) => c.member_id === member.member_id);
    if (idx >= 0) this.cache[idx] = member;
    else this.cache.push(member);

    return member;
  }

  public async save(m: Partial<MemberEntity>): Promise<MemberEntity> {
    return this.upsert(m);
  }

  public async delete(memberId: string): Promise<boolean> {
    // Capture seat_id and mic_id BEFORE deleting — the seat/mic are keyed off
    // the member row, so the UPDATE subquery no longer matches after the DELETE.
    const member = this.cache.find((c) => c.member_id === memberId)
      || (await db.get<{ seat_id: string; mic_id: string }>(
          "SELECT seat_id, mic_id FROM members WHERE member_id = ?", [memberId]
        ));
    const res = await db.run("DELETE FROM members WHERE member_id = ?", [memberId]);
    if (member?.seat_id) {
      await db.run("UPDATE seats SET status = 'AVAILABLE' WHERE seat_id = ?", [member.seat_id]);
    }
    if (member?.mic_id) {
      await db.run("UPDATE microphones SET status = 'AVAILABLE' WHERE member_id = ?", [memberId]);
    }
    this.cache = this.cache.filter((c) => c.member_id !== memberId);
    return res.changes > 0;
  }

  private mapRowToEntity(row: any): MemberEntity {
    return {
      member_id: row.member_id,
      name: row.name,
      seat_id: row.seat_id,
      camera_id: row.camera_id,
      mic_id: row.mic_id,
      allocated_time_seconds: Number(row.allocated_time_seconds || 300),
      status: row.status,
      constituency: row.constituency,
      party: row.party,
      role: row.role,
      department: row.department,
      contact_info: row.contact_info,
      avatar: row.avatar,
      password: row.password,
      password_hash: row.password_hash,
      historical_score: Number(row.historical_score || 90),
      warnings_count: Number(row.warnings_count || 0),
      violations_count: Number(row.violations_count || 0),
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}

export const memberRepository = new MemberRepository();

