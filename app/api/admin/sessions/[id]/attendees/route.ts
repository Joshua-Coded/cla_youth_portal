import { sql } from '@/lib/db';
import { denyUnlessAdmin } from '@/lib/http';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const { id } = await params;
  return Response.json(
    await sql`SELECT m.id, m.full_name, m.phone, a.created_at FROM attendance a
              JOIN members m ON m.id = a.member_id WHERE a.session_id = ${id} ORDER BY a.id`,
  );
}
