import { memberStats } from '@/lib/analytics';
import { sql, today, FOLLOW_UP_AFTER } from '@/lib/db';
import { cleanName, cleanPhone, nameKey } from '@/lib/clean';
import { isRole } from '@/lib/config';
import { denyUnlessAdmin, fail } from '@/lib/http';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const id = Number((await params).id);
  const threshold = Math.max(1, Number(new URL(req.url).searchParams.get('threshold')) || FOLLOW_UP_AFTER);
  const member = (await memberStats(threshold)).find((m) => m.id === id);
  if (!member) return fail('Not found', 404);
  // Every session of their programmes since they first came to each
  const history = await sql`
    WITH firsts AS (
      SELECT s.programme_id, MIN(s.date) AS first FROM attendance a JOIN sessions s ON s.id = a.session_id
      WHERE a.member_id = ${id} GROUP BY s.programme_id
    )
    SELECT s.id, s.date::text AS date, p.name AS programme, p.color, (a.id IS NOT NULL) AS attended
    FROM sessions s JOIN firsts f ON f.programme_id = s.programme_id AND s.date >= f.first
    JOIN programmes p ON p.id = s.programme_id
    LEFT JOIN attendance a ON a.session_id = s.id AND a.member_id = ${id}
    WHERE s.date <= ${today()}
    ORDER BY s.date DESC, s.id DESC LIMIT 48`;
  const rooms = await sql`SELECT c.id, c.name, f.full_name AS facilitator FROM class_members cm
                          JOIN classes c ON c.id = cm.class_id LEFT JOIN members f ON f.id = c.facilitator_id
                          WHERE cm.member_id = ${id}`;
  return Response.json({ member, history, rooms });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const { id } = await params;
  const [m] = await sql`SELECT * FROM members WHERE id = ${id}`;
  if (!m) return fail('Not found', 404);
  const body = await req.json().catch(() => ({}));
  const fullName = body.fullName !== undefined ? cleanName(body.fullName) : m.full_name;
  const phone = body.phone !== undefined ? cleanPhone(body.phone) : m.phone;
  const notes = body.notes !== undefined ? String(body.notes).slice(0, 2000) : m.notes;
  const role = body.role ?? m.role;
  if (!isRole(role)) return fail('Unknown role.');
  if (!fullName) return fail('Name is required.');
  if (phone === undefined) return fail('That phone number doesn’t look right.');
  await sql`UPDATE members SET full_name = ${fullName}, name_key = ${nameKey(fullName)},
            phone = ${phone}, notes = ${notes}, role = ${role} WHERE id = ${id}`;
  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const { id } = await params;
  await sql`DELETE FROM members WHERE id = ${id}`;
  return Response.json({ ok: true });
}
