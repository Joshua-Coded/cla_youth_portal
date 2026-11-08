import { sql, transaction } from '@/lib/db';
import { denyUnlessAdmin, fail } from '@/lib/http';

// Merge a duplicate record (e.g. a misspelt name) into this one
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const into = Number((await params).id);
  const from = Number((await req.json().catch(() => ({}))).fromId);
  const found = await sql`SELECT id FROM members WHERE id IN (${into}, ${from})`;
  if (into === from || found.length !== 2) return fail('Choose two different members.');

  await transaction((q) => [
    q`INSERT INTO attendance (session_id, member_id, created_at)
      SELECT session_id, ${into}, created_at FROM attendance WHERE member_id = ${from}
      ON CONFLICT (session_id, member_id) DO NOTHING`,
    q`UPDATE members t SET phone = COALESCE(t.phone, s.phone), created_at = LEAST(t.created_at, s.created_at)
      FROM members s WHERE t.id = ${into} AND s.id = ${from}`,
    q`DELETE FROM members WHERE id = ${from}`,
  ]);
  return Response.json({ ok: true });
}
