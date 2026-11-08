import { sql } from '@/lib/db';
import { denyUnlessFacilitator, fail } from '@/lib/http';
import { cleanName, cleanPhone, nameKey } from '@/lib/clean';
import { addToClass, findClass } from '@/lib/classes';
import { findOrCreateMember } from '@/lib/members';

type Ctx = { params: Promise<{ id: string }> };

/** Search everyone by name so the facilitator can add an existing person to the room. */
export async function GET(req: Request, { params }: Ctx) {
  const denied = await denyUnlessFacilitator();
  if (denied) return denied;
  const cls = await findClass(Number((await params).id));
  if (!cls) return fail('Not found', 404);
  const q = nameKey(new URL(req.url).searchParams.get('q') ?? '');
  if (q.length < 2) return Response.json([]);
  const rows = await sql`
    SELECT m.id, m.full_name, c.name AS class_name, (cm.class_id = ${cls.id}) AS here
    FROM members m
    LEFT JOIN class_members cm ON cm.member_id = m.id AND cm.programme_id = ${cls.programme_id}
    LEFT JOIN classes c ON c.id = cm.class_id
    WHERE m.name_key LIKE ${'%' + q + '%'}
    ORDER BY (m.name_key LIKE ${q + '%'}) DESC, m.full_name LIMIT 8`;
  return Response.json(rows);
}

/** Add someone to the room: an existing person by id, or a new name. */
export async function POST(req: Request, { params }: Ctx) {
  const denied = await denyUnlessFacilitator();
  if (denied) return denied;
  const cls = await findClass(Number((await params).id));
  if (!cls) return fail('Not found', 404);
  const body = await req.json().catch(() => ({}));
  let id = Number(body.memberId) || 0;
  if (!id) {
    const fullName = cleanName(body.fullName);
    const phone = cleanPhone(body.phone);
    if (fullName.split(' ').length < 2) return fail('Please enter their first and last name.');
    if (phone === undefined) return fail('That phone number doesn’t look right.');
    id = (await findOrCreateMember(fullName, phone)).id;
  }
  await addToClass(cls, [id]);
  return Response.json({ ok: true, id });
}

/** Take someone out of the room (their attendance history stays). */
export async function DELETE(req: Request, { params }: Ctx) {
  const denied = await denyUnlessFacilitator();
  if (denied) return denied;
  const id = Number(new URL(req.url).searchParams.get('member'));
  await sql`DELETE FROM class_members WHERE class_id = ${Number((await params).id)} AND member_id = ${id}`;
  return Response.json({ ok: true });
}
