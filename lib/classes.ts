import { sql, today } from './db';
import { CLASS_PROGRAMME_CODE, type Role } from './config';

export type ClassRow = {
  id: number;
  programme_id: number;
  name: string;
  room: string | null;
  facilitator_id: number | null;
  facilitator: string | null;
  facilitator_phone: string | null;
};

export type Mark = 'self' | 'class';

export type RegisterRow = {
  id: number;
  full_name: string;
  role: Role;
  phone: string | null;
  /** session id → how they were marked present; missing = absent */
  marks: Record<number, Mark>;
  /** sessions before they joined don't count against them */
  since: string;
  missedInARow: number;
  present: number;
  expected: number;
};

export type RegisterSession = { id: number; date: string; taken_at: string | null };

export async function classProgramme() {
  const [p] = await sql`SELECT id, name, color, icon, code FROM programmes WHERE code = ${CLASS_PROGRAMME_CODE}`;
  return p as { id: number; name: string; color: string; icon: string; code: string } | undefined;
}

export async function findClass(id: number) {
  const [c] = await sql`
    SELECT c.id, c.programme_id, c.name, c.room, c.facilitator_id,
           f.full_name AS facilitator, f.phone AS facilitator_phone
    FROM classes c LEFT JOIN members f ON f.id = c.facilitator_id
    WHERE c.id = ${id}`;
  return c as ClassRow | undefined;
}

/**
 * The class register: everyone on the roll against the programme's recent sessions.
 * A session counts against someone once it's finished (a past day, or today after the roll is taken)
 * and only from when they joined the class or first came, whichever is earlier.
 */
export async function register(cls: ClassRow, limit = 8) {
  const t = today();
  const [roster, sessions] = (await Promise.all([
    sql`SELECT m.id, m.full_name, m.role, m.phone, cm.added_at::date::text AS added
        FROM class_members cm JOIN members m ON m.id = cm.member_id
        WHERE cm.class_id = ${cls.id} ORDER BY lower(m.full_name)`,
    sql`SELECT s.id, s.date::text AS date, r.taken_at
        FROM sessions s LEFT JOIN class_rolls r ON r.session_id = s.id AND r.class_id = ${cls.id}
        WHERE s.programme_id = ${cls.programme_id} AND s.date <= ${t}
        ORDER BY s.date DESC LIMIT ${limit}`,
  ])) as [(Omit<RegisterRow, 'marks' | 'since' | 'missedInARow' | 'present' | 'expected'> & { added: string })[], RegisterSession[]];
  sessions.reverse();

  const ids = roster.map((m) => m.id);
  const [marks, firsts] = (await Promise.all([
    sql`SELECT a.member_id, a.session_id, a.method FROM attendance a
        WHERE a.member_id = ANY(${ids}::int[]) AND a.session_id = ANY(${sessions.map((s) => s.id)}::int[])`,
    sql`SELECT a.member_id, MIN(s.date)::text AS first FROM attendance a JOIN sessions s ON s.id = a.session_id
        WHERE a.member_id = ANY(${ids}::int[]) AND s.programme_id = ${cls.programme_id} GROUP BY a.member_id`,
  ])) as [{ member_id: number; session_id: number; method: Mark }[], { member_id: number; first: string }[]];

  const firstBy = new Map(firsts.map((f) => [f.member_id, f.first]));
  const counts = (s: RegisterSession) => s.date < t || Boolean(s.taken_at);

  const rows: RegisterRow[] = roster.map(({ added, ...m }) => {
    const mine: Record<number, Mark> = {};
    for (const a of marks) if (a.member_id === m.id) mine[a.session_id] = a.method;
    const first = firstBy.get(m.id);
    const since = first && first < added ? first : added;
    const expected = sessions.filter((s) => s.date >= since && (mine[s.id] || counts(s)));
    let missedInARow = 0;
    for (let i = expected.length - 1; i >= 0 && !mine[expected[i].id]; i--) missedInARow++;
    return { ...m, marks: mine, since, missedInARow, present: expected.filter((s) => mine[s.id]).length, expected: expected.length };
  });

  return { today: t, sessions, roster: rows };
}

/** Put people on a class roll, moving them out of any other class in the same programme. */
export async function addToClass(cls: Pick<ClassRow, 'id' | 'programme_id'>, memberIds: number[]) {
  if (!memberIds.length) return;
  await sql`
    INSERT INTO class_members (class_id, member_id, programme_id)
    SELECT ${cls.id}, id, ${cls.programme_id} FROM members WHERE id = ANY(${memberIds}::int[])
    ON CONFLICT (programme_id, member_id) DO UPDATE SET class_id = EXCLUDED.class_id, added_at = now()`;
}
