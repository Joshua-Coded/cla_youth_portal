import { sql, today } from '@/lib/db';
import { fail } from '@/lib/http';

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [p] = await sql`
    SELECT p.name, p.tagline, p.schedule, p.color, p.icon, p.code, p.is_active,
           COALESCE(s.is_open, true) AS is_open, COUNT(a.id)::int AS here_today
    FROM programmes p
    LEFT JOIN sessions s ON s.programme_id = p.id AND s.date = ${today()}
    LEFT JOIN attendance a ON a.session_id = s.id
    WHERE p.code = ${code}
    GROUP BY p.id, s.is_open`;
  return p ? Response.json({ today: today(), programme: p }) : fail('This check-in link is not valid.', 404);
}
