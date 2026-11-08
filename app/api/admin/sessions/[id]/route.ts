import { sql } from '@/lib/db';
import { denyUnlessAdmin } from '@/lib/http';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const { id } = await params;
  await sql`DELETE FROM sessions WHERE id = ${id}`;
  return Response.json({ ok: true });
}
