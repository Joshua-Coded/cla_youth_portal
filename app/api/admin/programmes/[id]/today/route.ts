import { sql, today } from '@/lib/db';
import { denyUnlessAdmin } from '@/lib/http';

// Open or close today's check-in for a programme
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const { id } = await params;
  const { open } = await req.json().catch(() => ({}));
  await sql`INSERT INTO sessions (programme_id, date, is_open) VALUES (${id}, ${today()}, ${Boolean(open)})
            ON CONFLICT (programme_id, date) DO UPDATE SET is_open = EXCLUDED.is_open`;
  return Response.json({ ok: true });
}
