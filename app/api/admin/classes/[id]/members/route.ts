import { sql } from '@/lib/db';
import { denyUnlessAdmin, fail } from '@/lib/http';
import { cleanName } from '@/lib/clean';
import { addToClass, findClass } from '@/lib/classes';
import { findOrCreateMember } from '@/lib/members';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Add people to the class roll: { memberIds: [...] } for people already on record,
 * and/or { names: "one name per line" } to load a class list (existing names are matched, new ones created).
 */
export async function POST(req: Request, { params }: Ctx) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const cls = await findClass(Number((await params).id));
  if (!cls) return fail('Not found', 404);
  const body = await req.json().catch(() => ({}));
  const ids: number[] = Array.isArray(body.memberIds) ? body.memberIds.map(Number).filter(Boolean) : [];

  const names = [...new Set(String(body.names ?? '').split(/\r?\n/).map(cleanName).filter(Boolean))].slice(0, 300);
  const skipped = names.filter((n) => n.split(' ').length < 2);
  for (const n of names) if (!skipped.includes(n)) ids.push((await findOrCreateMember(n, null)).id);

  await addToClass(cls, ids);
  return Response.json({ ok: true, added: ids.length, skipped });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const member = Number(new URL(req.url).searchParams.get('member'));
  await sql`DELETE FROM class_members WHERE class_id = ${Number((await params).id)} AND member_id = ${member}`;
  return Response.json({ ok: true });
}
