import { sql, today } from '@/lib/db';
import { denyUnlessAdmin, fail } from '@/lib/http';
import { classProgramme } from '@/lib/classes';

/** Faith Forward's classes with today's roll status, plus who isn't in a class yet. */
export async function GET() {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const programme = await classProgramme();
  if (!programme) return fail('Faith Forward programme not found.', 404);
  const t = today();
  const [classes, unassigned, team, [day]] = await Promise.all([
    sql`SELECT c.id, c.name, c.room, c.facilitator_id, f.full_name AS facilitator, f.phone AS facilitator_phone,
               (SELECT COUNT(*)::int FROM class_members cm WHERE cm.class_id = c.id) AS roster,
               (SELECT COUNT(*)::int FROM attendance a JOIN class_members cm ON cm.member_id = a.member_id AND cm.class_id = c.id
                 JOIN sessions s ON s.id = a.session_id WHERE s.programme_id = c.programme_id AND s.date = ${t}) AS here_today,
               (SELECT r.taken_at FROM class_rolls r JOIN sessions s ON s.id = r.session_id
                 WHERE r.class_id = c.id AND s.date = ${t}) AS taken_at,
               (SELECT ROUND(100.0 * COUNT(a.id) / NULLIF(COUNT(*), 0))::int
                  FROM class_rolls r JOIN class_members cm ON cm.class_id = r.class_id
                  LEFT JOIN attendance a ON a.session_id = r.session_id AND a.member_id = cm.member_id
                 WHERE r.class_id = c.id) AS rate
        FROM classes c LEFT JOIN members f ON f.id = c.facilitator_id
        WHERE c.programme_id = ${programme.id} ORDER BY lower(c.name)`,
    sql`SELECT DISTINCT m.id, m.full_name FROM members m
        JOIN attendance a ON a.member_id = m.id JOIN sessions s ON s.id = a.session_id
        WHERE s.programme_id = ${programme.id} AND m.role = 'member'
          AND NOT EXISTS (SELECT 1 FROM class_members cm WHERE cm.member_id = m.id AND cm.programme_id = ${programme.id})
        ORDER BY m.full_name`,
    sql`SELECT id, full_name, role FROM members WHERE role <> 'member' ORDER BY lower(full_name)`,
    sql`SELECT id FROM sessions WHERE programme_id = ${programme.id} AND date = ${t}`,
  ]);
  return Response.json({
    today: t,
    sessionToday: Boolean(day),
    programme,
    classes,
    facilitatorCode: process.env.FACILITATOR_CODE ?? null,
    unassigned,
    team,
  });
}

export async function POST(req: Request) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const programme = await classProgramme();
  if (!programme) return fail('Faith Forward programme not found.', 404);
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? '').trim().slice(0, 60);
  if (!name) return fail('Give the room a name.');
  const [c] = await sql`
    INSERT INTO classes (programme_id, name, room, facilitator_id)
    VALUES (${programme.id}, ${name}, ${String(body.room ?? '').trim().slice(0, 60) || null},
            ${Number(body.facilitator_id) || null})
    RETURNING id`;
  return Response.json(c);
}
