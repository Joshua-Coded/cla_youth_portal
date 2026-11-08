import { sql } from '@/lib/db';
import { denyUnlessAdmin, fail } from '@/lib/http';
import { findClass, register } from '@/lib/classes';

type Ctx = { params: Promise<{ id: string }> };

/** The class register for the admin: roll against recent sessions. */
export async function GET(_req: Request, { params }: Ctx) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const cls = await findClass(Number((await params).id));
  if (!cls) return fail('Not found', 404);
  return Response.json({ class: cls, ...(await register(cls, 10)) });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const cls = await findClass(Number((await params).id));
  if (!cls) return fail('Not found', 404);
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? cls.name).trim().slice(0, 60);
  if (!name) return fail('Give the room a name.');
  const room = body.room !== undefined ? String(body.room).trim().slice(0, 60) || null : cls.room;
  const facilitator = body.facilitator_id !== undefined ? Number(body.facilitator_id) || null : cls.facilitator_id;
  await sql`UPDATE classes SET name = ${name}, room = ${room}, facilitator_id = ${facilitator} WHERE id = ${cls.id}`;
  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  await sql`DELETE FROM classes WHERE id = ${Number((await params).id)}`;
  return Response.json({ ok: true });
}
