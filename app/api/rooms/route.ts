import { sql, today } from '@/lib/db';
import { denyUnlessFacilitator, fail } from '@/lib/http';
import { classProgramme } from '@/lib/classes';

/** The rooms a facilitator can pick from, with today's progress. */
export async function GET() {
  const denied = await denyUnlessFacilitator();
  if (denied) return denied;
  const programme = await classProgramme();
  if (!programme) return fail('Faith Forward programme not found.', 404);
  const t = today();
  const rooms = await sql`
    SELECT c.id, c.name, c.room, f.full_name AS facilitator,
           (SELECT COUNT(*)::int FROM class_members cm WHERE cm.class_id = c.id) AS roster,
           (SELECT COUNT(*)::int FROM attendance a JOIN class_members cm ON cm.member_id = a.member_id AND cm.class_id = c.id
             JOIN sessions s ON s.id = a.session_id WHERE s.programme_id = c.programme_id AND s.date = ${t}) AS here_today,
           (SELECT r.taken_at FROM class_rolls r JOIN sessions s ON s.id = r.session_id
             WHERE r.class_id = c.id AND s.date = ${t}) AS taken_at
    FROM classes c LEFT JOIN members f ON f.id = c.facilitator_id
    WHERE c.programme_id = ${programme.id} ORDER BY lower(c.name)`;
  return Response.json({ today: t, programme, rooms });
}
