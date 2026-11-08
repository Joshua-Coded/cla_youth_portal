import QRCode from 'qrcode';
import { sql, today } from '@/lib/db';
import { COLORS, ICONS } from '@/lib/config';
import { isColor } from '@/lib/clean';
import { denyUnlessAdmin, fail, publicOrigin } from '@/lib/http';

export async function GET(req: Request) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const t = today();
  const rows = await sql`
    SELECT p.id, p.name, p.tagline, p.schedule, p.color, p.icon, p.code, p.is_active, p.sort_order,
           COUNT(DISTINCT s.id)::int AS sessions,
           COUNT(a.id)::int AS checkins,
           COUNT(DISTINCT a.member_id)::int AS people,
           COUNT(a.id) FILTER (WHERE s.date = ${t})::int AS here_today,
           BOOL_AND(s.is_open) FILTER (WHERE s.date = ${t}) AS today_open
    FROM programmes p
    LEFT JOIN sessions s ON s.programme_id = p.id
    LEFT JOIN attendance a ON a.session_id = s.id
    GROUP BY p.id ORDER BY p.sort_order, p.id`;
  const origin = publicOrigin(req);
  return Response.json({
    today: t,
    mainUrl: `${origin}/`,
    programmes: await Promise.all(
      rows.map(async (p) => {
        const url = `${origin}/c/${p.code}`;
        const qr = await QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' });
        return { ...p, today_open: p.today_open ?? true, url, qr };
      }),
    ),
  });
}

const slug = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

export async function POST(req: Request) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? '').trim().slice(0, 60);
  if (!name) return fail('Give the programme a name.');
  const color = isColor(body.color) ? body.color : COLORS[0];
  const icon = ICONS.includes(body.icon) ? body.icon : 'star';
  let code = slug(name) || 'programme';
  const [taken] = await sql`SELECT 1 FROM programmes WHERE code = ${code}`;
  if (taken) code = `${code}-${Math.random().toString(36).slice(2, 6)}`;
  const [p] = await sql`
    INSERT INTO programmes (name, tagline, schedule, color, icon, code, sort_order)
    VALUES (${name}, ${body.tagline?.trim() || null}, ${body.schedule?.trim() || null}, ${color}, ${icon}, ${code},
            (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM programmes))
    RETURNING id, code`;
  return Response.json(p);
}
