import { sql } from '@/lib/db';
import { ICONS } from '@/lib/config';
import { isColor } from '@/lib/clean';
import { denyUnlessAdmin, fail } from '@/lib/http';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const { id } = await params;
  const [p] = await sql`SELECT name, tagline, schedule, color, icon, is_active FROM programmes WHERE id = ${id}`;
  if (!p) return fail('Not found', 404);
  const next = { ...p, ...(await req.json().catch(() => ({}))) };
  const name = String(next.name ?? '').trim().slice(0, 60);
  if (!name) return fail('Give the programme a name.');
  if (!isColor(next.color)) return fail('Pick a colour.');
  if (!ICONS.includes(next.icon)) return fail('Pick an icon.');
  await sql`UPDATE programmes SET name = ${name}, tagline = ${next.tagline?.trim() || null},
            schedule = ${next.schedule?.trim() || null}, color = ${next.color}, icon = ${next.icon},
            is_active = ${Boolean(next.is_active)} WHERE id = ${id}`;
  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const { id } = await params;
  await sql`DELETE FROM programmes WHERE id = ${id}`;
  return Response.json({ ok: true });
}
