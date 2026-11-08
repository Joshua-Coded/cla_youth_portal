import { sql, today } from '@/lib/db';
import { fail } from '@/lib/http';
import { cleanName, cleanPhone } from '@/lib/clean';
import { findOrCreateMember } from '@/lib/members';
import { isRole, type Role } from '@/lib/config';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const fullName = cleanName(body.fullName);
  const phone = cleanPhone(body.phone);
  const role: Role = isRole(body.role) ? body.role : 'member';

  if (fullName.split(' ').length < 2) return fail('Please enter your first and last name.');
  if (phone === undefined) return fail('That phone number doesn’t look right.');

  const [programme] = await sql`SELECT id, name, is_active FROM programmes WHERE code = ${String(body.code ?? '')}`;
  if (!programme || !programme.is_active) return fail('Please choose a programme.', 404);

  // Today's session is created by the first check-in
  const [session] = await sql`
    INSERT INTO sessions (programme_id, date) VALUES (${programme.id}, ${today()})
    ON CONFLICT (programme_id, date) DO UPDATE SET programme_id = EXCLUDED.programme_id
    RETURNING id, is_open`;
  if (!session.is_open) return fail(`Check-in for ${programme.name} has closed for today.`, 403);

  const member = await findOrCreateMember(fullName, phone, role);
  const inserted = await sql`INSERT INTO attendance (session_id, member_id) VALUES (${session.id}, ${member.id})
                             ON CONFLICT (session_id, member_id) DO NOTHING RETURNING id`;
  const [{ visits }] = await sql`SELECT COUNT(*)::int AS visits FROM attendance WHERE member_id = ${member.id}`;

  return Response.json({
    ok: true,
    already: inserted.length === 0,
    name: member.full_name,
    programme: programme.name,
    role,
    visits,
  });
}
