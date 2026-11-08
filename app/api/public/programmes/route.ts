import { sql, today } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = await sql`
    SELECT p.name, p.tagline, p.schedule, p.color, p.icon, p.code,
           COALESCE(s.is_open, true) AS is_open, COUNT(a.id)::int AS here_today
    FROM programmes p
    LEFT JOIN sessions s ON s.programme_id = p.id AND s.date = ${today()}
    LEFT JOIN attendance a ON a.session_id = s.id
    WHERE p.is_active
    GROUP BY p.id, s.is_open ORDER BY p.sort_order, p.id`;
  return Response.json({ today: today(), programmes: rows });
}
