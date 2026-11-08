import { sql } from '@/lib/db';
import { denyUnlessAdmin } from '@/lib/http';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const { id } = await params;
  return Response.json(
    await sql`SELECT s.id, s.date::text AS date, s.is_open, COUNT(a.id)::int AS attendance
              FROM sessions s LEFT JOIN attendance a ON a.session_id = s.id
              WHERE s.programme_id = ${id} GROUP BY s.id ORDER BY s.date DESC LIMIT 60`,
  );
}
