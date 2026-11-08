import { sql, transaction, today } from '@/lib/db';
import { denyUnlessFacilitator, fail } from '@/lib/http';
import { classProgramme, findClass, register } from '@/lib/classes';

type Ctx = { params: Promise<{ id: string }> };

/** A room's roll for today plus the last few weeks. */
export async function GET(_req: Request, { params }: Ctx) {
  const denied = await denyUnlessFacilitator();
  if (denied) return denied;
  const cls = await findClass(Number((await params).id));
  if (!cls) return fail('That room no longer exists.', 404);
  const [programme, reg] = await Promise.all([classProgramme(), register(cls, 6)]);
  const now = reg.sessions.find((s) => s.date === reg.today);
  return Response.json({
    class: { name: cls.name, room: cls.room, facilitator: cls.facilitator },
    programme,
    today: reg.today,
    takenAt: now?.taken_at ?? null,
    sessions: reg.sessions,
    roster: reg.roster.map(({ phone: _phone, ...m }) => ({ ...m, today: now ? m.marks[now.id] ?? null : null })),
  });
}

/** Save today's roll. People who scanned in themselves stay present. */
export async function POST(req: Request, { params }: Ctx) {
  const denied = await denyUnlessFacilitator();
  if (denied) return denied;
  const cls = await findClass(Number((await params).id));
  if (!cls) return fail('That room no longer exists.', 404);
  const body = await req.json().catch(() => ({}));
  const wanted = new Set<number>(Array.isArray(body.present) ? body.present.map(Number) : []);

  const roster = (await sql`SELECT member_id FROM class_members WHERE class_id = ${cls.id}`).map((r) => r.member_id as number);
  const present = roster.filter((id) => wanted.has(id));
  if (cls.facilitator_id) present.push(cls.facilitator_id);

  const [session] = await sql`
    INSERT INTO sessions (programme_id, date) VALUES (${cls.programme_id}, ${today()})
    ON CONFLICT (programme_id, date) DO UPDATE SET programme_id = EXCLUDED.programme_id
    RETURNING id`;

  await transaction((q) => [
    q`INSERT INTO attendance (session_id, member_id, method, class_id)
      SELECT ${session.id}, id, 'class', ${cls.id} FROM unnest(${present}::int[]) AS id
      ON CONFLICT (session_id, member_id) DO UPDATE SET class_id = EXCLUDED.class_id`,
    q`DELETE FROM attendance WHERE session_id = ${session.id} AND class_id = ${cls.id} AND method = 'class'
      AND NOT (member_id = ANY(${present}::int[]))`,
    q`INSERT INTO class_rolls (class_id, session_id) VALUES (${cls.id}, ${session.id})
      ON CONFLICT (class_id, session_id) DO UPDATE SET taken_at = now()`,
  ]);
  return Response.json({ ok: true, present: present.length });
}
